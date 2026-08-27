// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

// SeasonGame is a reusable seasonal 2048 ranked-run contract. It mirrors the
// mechanics of VibeGame.sol but scopes every score to a single season:
//
//   * startRun() is gated to [seasonStart, seasonEnd] and charges entryFee
//     (sent straight to the season treasury, exactly like VibeGame).
//   * submitScore() accumulates seasonPoints and is allowed up to
//     seasonEnd + submitGrace to give in-flight runs a short window to finish.
//   * daysPlayed tracks distinct UTC days a wallet submitted a score.
//   * The season leaderboard is sorted by seasonPoints (desc), then bestScore
//     (desc), then the timestamp the wallet first reached its current points
//     (asc), then address (asc) as a fully deterministic final tie-break.
//
// Anti-bot rate limits are constructor parameters: maxRunsPerDay caps the
// number of runs a wallet can start per UTC day and minRunInterval enforces a
// minimum pause between runs.
contract SeasonGame {
    address public immutable treasury;
    address public immutable owner;
    uint256 public immutable entryFee;
    uint256 public immutable seasonId;
    uint256 public immutable seasonStart;
    uint256 public immutable seasonEnd;
    uint256 public immutable minDaysPlayed;
    uint256 public immutable submitGrace;
    uint256 public immutable maxRunsPerDay;
    uint256 public immutable minRunInterval;

    uint256 public constant SCORE_POLICY_VERSION = 1;
    uint256 public constant TOTAL_SCORE_MULTIPLIER = 1;
    uint256 private constant DAY = 1 days;

    mapping(address => bool) public activeRun;
    mapping(address => uint256) public seasonPoints;
    mapping(address => uint256) public bestScore;
    mapping(address => uint256) public totalRuns;
    mapping(address => uint256) public maxBlock;
    mapping(address => uint256) public daysPlayed;
    mapping(address => uint256) public lastPlayedDay;

    // Timestamp the wallet first reached its current seasonPoints. Points only
    // ever increase, so this is the timestamp of the score that brought the
    // wallet to its current total. Used as the second-level tie-break.
    mapping(address => uint256) public firstReachTimestamp;

    // Rate-limit bookkeeping.
    mapping(address => uint256) public lastRunDay;
    mapping(address => uint256) public runsOnDay;
    mapping(address => uint256) public lastRunTimestamp;

    address[] private _seasonPlayers;
    uint256[] private _seasonPoints;

    event RunStarted(address indexed player, uint256 fee, uint256 seasonId);
    event ScoreSubmitted(address indexed player, uint256 seasonId, uint256 score, uint256 bestScore, uint256 seasonPoints, uint256 maxBlock, uint256 leaderboardPoints);
    event RunAbandoned(address indexed player);

    constructor(
        address treasury_,
        uint256 entryFee_,
        uint256 seasonId_,
        uint256 seasonStart_,
        uint256 seasonEnd_,
        uint256 minDaysPlayed_,
        uint256 submitGrace_,
        uint256 maxRunsPerDay_,
        uint256 minRunInterval_
    ) {
        require(treasury_ != address(0), "Treasury is zero");
        require(seasonEnd_ > seasonStart_, "Invalid season window");
        require(entryFee_ > 0, "Entry fee is zero");

        treasury = treasury_;
        entryFee = entryFee_;
        seasonId = seasonId_;
        seasonStart = seasonStart_;
        seasonEnd = seasonEnd_;
        minDaysPlayed = minDaysPlayed_;
        submitGrace = submitGrace_;
        maxRunsPerDay = maxRunsPerDay_;
        minRunInterval = minRunInterval_;
        owner = msg.sender;
    }

    function startRun() external payable {
        require(!activeRun[msg.sender], "Run already active");
        require(block.timestamp >= seasonStart, "Season not started");
        require(block.timestamp <= seasonEnd, "Season ended");
        require(msg.value == entryFee, "Invalid entry fee");

        uint256 day = block.timestamp / DAY;
        if (lastRunDay[msg.sender] != day) {
            lastRunDay[msg.sender] = day;
            runsOnDay[msg.sender] = 0;
        }
        require(runsOnDay[msg.sender] < maxRunsPerDay, "Daily run limit reached");
        require(block.timestamp >= lastRunTimestamp[msg.sender] + minRunInterval, "Run too soon");

        activeRun[msg.sender] = true;
        totalRuns[msg.sender] += 1;
        runsOnDay[msg.sender] += 1;
        lastRunTimestamp[msg.sender] = block.timestamp;

        (bool sent, ) = treasury.call{value: msg.value}("");
        require(sent, "Fee transfer failed");

        emit RunStarted(msg.sender, msg.value, seasonId);
    }

    function submitScore(uint256 score, uint256 maxBlock_) external {
        require(activeRun[msg.sender], "No active run");
        require(block.timestamp <= seasonEnd + submitGrace, "Submission window closed");
        require(score > 0, "Score is zero");

        activeRun[msg.sender] = false;

        if (maxBlock_ > maxBlock[msg.sender]) {
            maxBlock[msg.sender] = maxBlock_;
        }

        uint256 leaderboardPoints = scoreToLeaderboardPoints(score);
        seasonPoints[msg.sender] += leaderboardPoints;
        firstReachTimestamp[msg.sender] = block.timestamp;

        if (score > bestScore[msg.sender]) {
            bestScore[msg.sender] = score;
        }

        _upsert(_seasonPlayers, _seasonPoints, msg.sender, seasonPoints[msg.sender]);

        uint256 day = block.timestamp / DAY;
        if (lastPlayedDay[msg.sender] != day) {
            daysPlayed[msg.sender] += 1;
            lastPlayedDay[msg.sender] = day;
        }

        emit ScoreSubmitted(
            msg.sender,
            seasonId,
            score,
            bestScore[msg.sender],
            seasonPoints[msg.sender],
            maxBlock[msg.sender],
            leaderboardPoints
        );
    }

    function abandonRun() external {
        require(activeRun[msg.sender], "No active run");

        activeRun[msg.sender] = false;

        emit RunAbandoned(msg.sender);
    }

    function getSeasonScoreCount() external view returns (uint256) {
        return _seasonPlayers.length;
    }

    function getSeasonScorePage(uint256 offset, uint256 limit) external view returns (address[] memory, uint256[] memory) {
        return _slice(_seasonPlayers, _seasonPoints, offset, limit);
    }

    function getRank(address user) external view returns (uint256) {
        for (uint256 i = 0; i < _seasonPlayers.length; i++) {
            if (_seasonPlayers[i] == user) return i + 1;
        }

        return 0;
    }

    function scoreToLeaderboardPoints(uint256 score) public pure returns (uint256) {
        return score * TOTAL_SCORE_MULTIPLIER;
    }

    function _upsert(address[] storage players, uint256[] storage scores, address player, uint256 score) private {
        for (uint256 i = 0; i < players.length; i++) {
            if (players[i] == player) {
                scores[i] = score;
                _sortDesc();
                return;
            }
        }

        players.push(player);
        scores.push(score);
        _sortDesc();
    }

    // Returns true when `a` outranks `b`: more points, else higher bestScore,
    // else earlier firstReachTimestamp, else lower address.
    function _rankHigher(address a, address b, uint256 pointsA, uint256 pointsB) private view returns (bool) {
        if (pointsA != pointsB) return pointsA > pointsB;

        uint256 bestA = bestScore[a];
        uint256 bestB = bestScore[b];
        if (bestA != bestB) return bestA > bestB;

        uint256 reachA = firstReachTimestamp[a];
        uint256 reachB = firstReachTimestamp[b];
        if (reachA != reachB) return reachA < reachB;

        return uint160(a) < uint160(b);
    }

    function _sortDesc() private {
        uint256 n = _seasonPlayers.length;

        for (uint256 i = 0; i < n; i++) {
            for (uint256 j = i + 1; j < n; j++) {
                if (_rankHigher(_seasonPlayers[j], _seasonPlayers[i], _seasonPoints[j], _seasonPoints[i])) {
                    address tmpPlayer = _seasonPlayers[i];
                    uint256 tmpScore = _seasonPoints[i];

                    _seasonPlayers[i] = _seasonPlayers[j];
                    _seasonPoints[i] = _seasonPoints[j];
                    _seasonPlayers[j] = tmpPlayer;
                    _seasonPoints[j] = tmpScore;
                }
            }
        }
    }

    function _slice(address[] storage players, uint256[] storage scores, uint256 offset, uint256 limit) private view returns (address[] memory, uint256[] memory) {
        uint256 total = players.length;
        uint256 end = offset + limit;
        if (end > total) end = total;

        uint256 count = offset >= total ? 0 : end - offset;

        address[] memory ps = new address[](count);
        uint256[] memory sc = new uint256[](count);

        for (uint256 i = 0; i < count; i++) {
            ps[i] = players[offset + i];
            sc[i] = scores[offset + i];
        }

        return (ps, sc);
    }
}
