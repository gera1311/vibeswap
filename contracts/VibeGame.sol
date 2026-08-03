// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

contract VibeGame {
    address public immutable treasury;
    uint256 public immutable entryFee;

    mapping(address => bool) public activeRun;
    mapping(address => uint256) public bestScore;
    mapping(address => uint256) public totalRuns;

    address[10] private topPlayers;
    uint256[10] private topScores;

    event RunStarted(address indexed player, uint256 fee);
    event ScoreSubmitted(address indexed player, uint256 score, uint256 bestScore);
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

        if (score > bestScore[msg.sender]) {
            bestScore[msg.sender] = score;
            _insertTopScore(msg.sender, score);
        }

        emit ScoreSubmitted(msg.sender, score, bestScore[msg.sender]);
    }

    function abandonRun() external {
        require(activeRun[msg.sender], "No active run");

        activeRun[msg.sender] = false;

        emit RunAbandoned(msg.sender);
    }

    function getTopScores() external view returns (address[10] memory, uint256[10] memory) {
        return (topPlayers, topScores);
    }

    function _insertTopScore(address player, uint256 score) private {
        for (uint256 i = 0; i < 10; i++) {
            if (topPlayers[i] == player) {
                topScores[i] = score;
                _sortTopScores();
                return;
            }
        }

        if (score <= topScores[9]) return;

        topPlayers[9] = player;
        topScores[9] = score;
        _sortTopScores();
    }

    function _sortTopScores() private {
        for (uint256 i = 0; i < 10; i++) {
            for (uint256 j = i + 1; j < 10; j++) {
                if (topScores[j] > topScores[i]) {
                    uint256 score = topScores[i];
                    address player = topPlayers[i];

                    topScores[i] = topScores[j];
                    topPlayers[i] = topPlayers[j];
                    topScores[j] = score;
                    topPlayers[j] = player;
                }
            }
        }
    }
}
