// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

contract VibeGame {
    address public immutable treasury;
    uint256 public immutable entryFee;
    uint256 public constant SCORE_POLICY_VERSION = 1;
    uint256 public constant TOTAL_SCORE_MULTIPLIER = 1;

    mapping(address => bool) public activeRun;
    mapping(address => uint256) public bestScore;
    mapping(address => uint256) public totalScore;
    mapping(address => uint256) public totalRuns;

    address[10] private topBestPlayers;
    uint256[10] private topBestScores;
    address[10] private topTotalPlayers;
    uint256[10] private topTotalScores;

    event RunStarted(address indexed player, uint256 fee);
    event ScoreSubmitted(address indexed player, uint256 score, uint256 bestScore, uint256 totalScore, uint256 leaderboardPoints);
    event RunAbandoned(address indexed player);

    constructor(address treasury_, uint256 entryFee_) {
        require(treasury_ != address(0), "Treasury is zero");

        treasury = treasury_;
        entryFee = entryFee_;
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

    function submitScore(uint256 score) external {
        require(activeRun[msg.sender], "No active run");
        require(score > 0, "Score is zero");

        activeRun[msg.sender] = false;

        uint256 leaderboardPoints = scoreToLeaderboardPoints(score);
        totalScore[msg.sender] += leaderboardPoints;

        if (score > bestScore[msg.sender]) {
            bestScore[msg.sender] = score;
            _insertScore(topBestPlayers, topBestScores, msg.sender, score);
        }

        _insertScore(topTotalPlayers, topTotalScores, msg.sender, totalScore[msg.sender]);

        emit ScoreSubmitted(msg.sender, score, bestScore[msg.sender], totalScore[msg.sender], leaderboardPoints);
    }

    function abandonRun() external {
        require(activeRun[msg.sender], "No active run");

        activeRun[msg.sender] = false;

        emit RunAbandoned(msg.sender);
    }

    function getTopScores() external view returns (address[10] memory, uint256[10] memory) {
        return (topBestPlayers, topBestScores);
    }

    function getTopTotalScores() external view returns (address[10] memory, uint256[10] memory) {
        return (topTotalPlayers, topTotalScores);
    }

    function scoreToLeaderboardPoints(uint256 score) public pure returns (uint256) {
        return score * TOTAL_SCORE_MULTIPLIER;
    }

    function _insertScore(
        address[10] storage players,
        uint256[10] storage scores,
        address player,
        uint256 score
    ) private {
        for (uint256 i = 0; i < 10; i++) {
            if (players[i] == player) {
                scores[i] = score;
                _sortScores(players, scores);
                return;
            }
        }

        if (score <= scores[9]) return;

        players[9] = player;
        scores[9] = score;
        _sortScores(players, scores);
    }

    function _sortScores(address[10] storage players, uint256[10] storage scores) private {
        for (uint256 i = 0; i < 10; i++) {
            for (uint256 j = i + 1; j < 10; j++) {
                if (scores[j] > scores[i]) {
                    uint256 score = scores[i];
                    address player = players[i];

                    scores[i] = scores[j];
                    players[i] = players[j];
                    scores[j] = score;
                    players[j] = player;
                }
            }
        }
    }
}
