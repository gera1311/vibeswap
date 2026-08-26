// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

contract VibeGame {
    address public immutable treasury;
    address public immutable owner;
    uint256 public immutable entryFee;
    uint256 public constant SCORE_POLICY_VERSION = 1;
    uint256 public constant TOTAL_SCORE_MULTIPLIER = 1;

    mapping(address => bool) public activeRun;
    mapping(address => uint256) public bestScore;
    mapping(address => uint256) public totalScore;
    mapping(address => uint256) public totalRuns;
    mapping(address => uint256) public maxBlock;

    address[] private _bestPlayers;
    uint256[] private _bestScores;
    address[] private _totalPlayers;
    uint256[] private _totalScores;

    event RunStarted(address indexed player, uint256 fee);
    event ScoreSubmitted(address indexed player, uint256 score, uint256 bestScore, uint256 totalScore, uint256 maxBlock, uint256 leaderboardPoints);
    event RunAbandoned(address indexed player);
    event MaxBlockReported(address indexed player, uint256 maxBlock);

    constructor(address treasury_, uint256 entryFee_) {
        require(treasury_ != address(0), "Treasury is zero");

        treasury = treasury_;
        entryFee = entryFee_;
        owner = msg.sender;
    }

    function seedLeaderboard(
        address[] calldata bestPlayers,
        uint256[] calldata bestScores_,
        address[] calldata totalPlayers,
        uint256[] calldata totalScores_
    ) external {
        require(msg.sender == owner, "Not owner");
        require(bestPlayers.length == bestScores_.length, "Best length mismatch");
        require(totalPlayers.length == totalScores_.length, "Total length mismatch");

        for (uint256 i = 0; i < bestPlayers.length; i++) {
            if (bestPlayers[i] == address(0) || bestScores_[i] == 0) continue;
            bestScore[bestPlayers[i]] = bestScores_[i];
            _bestPlayers.push(bestPlayers[i]);
            _bestScores.push(bestScores_[i]);
        }

        for (uint256 i = 0; i < totalPlayers.length; i++) {
            if (totalPlayers[i] == address(0) || totalScores_[i] == 0) continue;
            totalScore[totalPlayers[i]] = totalScores_[i];
            _totalPlayers.push(totalPlayers[i]);
            _totalScores.push(totalScores_[i]);
        }

        _sortDesc(_bestPlayers, _bestScores);
        _sortDesc(_totalPlayers, _totalScores);
    }

    function startRun() external payable {
        require(!activeRun[msg.sender], "Run already active");
        require(msg.value == entryFee, "Invalid entry fee");

        activeRun[msg.sender] = true;
        totalRuns[msg.sender] += 1;

        (bool sent, ) = treasury.call{value: msg.value}("");
        require(sent, "Fee transfer failed");

        emit RunStarted(msg.sender, msg.value);
    }

    function reportMaxBlock(uint256 block_) external {
        require(activeRun[msg.sender], "No active run");
        require(block_ > 0, "Block is zero");

        if (block_ > maxBlock[msg.sender]) {
            maxBlock[msg.sender] = block_;
            emit MaxBlockReported(msg.sender, block_);
        }
    }

    function submitScore(uint256 score, uint256 maxBlock_) external {
        require(activeRun[msg.sender], "No active run");
        require(score > 0, "Score is zero");

        activeRun[msg.sender] = false;

        if (maxBlock_ > maxBlock[msg.sender]) {
            maxBlock[msg.sender] = maxBlock_;
        }

        uint256 leaderboardPoints = scoreToLeaderboardPoints(score);
        totalScore[msg.sender] += leaderboardPoints;

        if (score > bestScore[msg.sender]) {
            bestScore[msg.sender] = score;
            _upsert(_bestPlayers, _bestScores, msg.sender, score);
        }

        _upsert(_totalPlayers, _totalScores, msg.sender, totalScore[msg.sender]);

        emit ScoreSubmitted(msg.sender, score, bestScore[msg.sender], totalScore[msg.sender], maxBlock[msg.sender], leaderboardPoints);
    }

    function abandonRun() external {
        require(activeRun[msg.sender], "No active run");

        activeRun[msg.sender] = false;

        emit RunAbandoned(msg.sender);
    }

    function getBestScoreCount() external view returns (uint256) {
        return _bestPlayers.length;
    }

    function getTotalScoreCount() external view returns (uint256) {
        return _totalPlayers.length;
    }

    function getBestScorePage(uint256 offset, uint256 limit) external view returns (address[] memory, uint256[] memory) {
        return _slice(_bestPlayers, _bestScores, offset, limit);
    }

    function getTotalScorePage(uint256 offset, uint256 limit) external view returns (address[] memory, uint256[] memory) {
        return _slice(_totalPlayers, _totalScores, offset, limit);
    }

    function scoreToLeaderboardPoints(uint256 score) public pure returns (uint256) {
        return score * TOTAL_SCORE_MULTIPLIER;
    }

    function _upsert(address[] storage players, uint256[] storage scores, address player, uint256 score) private {
        for (uint256 i = 0; i < players.length; i++) {
            if (players[i] == player) {
                scores[i] = score;
                _sortDesc(players, scores);
                return;
            }
        }

        players.push(player);
        scores.push(score);
        _sortDesc(players, scores);
    }

    function _sortDesc(address[] storage players, uint256[] storage scores) private {
        uint256 n = players.length;

        for (uint256 i = 0; i < n; i++) {
            for (uint256 j = i + 1; j < n; j++) {
                if (scores[j] > scores[i]) {
                    address tmpPlayer = players[i];
                    uint256 tmpScore = scores[i];

                    players[i] = players[j];
                    scores[i] = scores[j];
                    players[j] = tmpPlayer;
                    scores[j] = tmpScore;
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
