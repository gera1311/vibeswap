// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

interface ISeasonGame {
    function seasonEnd() external view returns (uint256);
    function getSeasonScorePage(uint256 offset, uint256 limit) external view returns (address[] memory, uint256[] memory);
}

// SeasonRewards distributes a zkLTC pool to the top `rewardEndRank` wallets of
// a SeasonGame leaderboard, claim-based (no push distribution).
//
// Reward curve (P = pool in wei):
//   * ranks 1..topTierEnd: linear 5.2% -> 0.4%, i.e. P * (54 - 2*i) / 1000 for
//     the default topTierEnd = 25 (rank 1 = 52/1000, rank 25 = 4/1000). The
//     general coefficient is 2*(topTierEnd + 2) - 2*rank.
//   * ranks topTierEnd+1..rewardEndRank: P / 250 (0.4% each).
//
// The integer-division remainder (dust from flooring every rank) is added to
// rank 1. Ranks without a participant are simply not paid; that share stays in
// this contract and is swept later via sweepUnclaimed().
//
// Lifecycle: fund this contract -> owner calls settle() after the season ends
// -> winners call claim() -> after claimDeadline the owner sweeps whatever is
// left to the next season treasury.
contract SeasonRewards {
    ISeasonGame public immutable game;
    address public immutable owner;
    uint256 public immutable seasonId;
    uint256 public immutable topTierEnd;
    uint256 public immutable topTierShareBps;
    uint256 public immutable rewardEndRank;
    uint256 public immutable claimDeadline;

    bool public settled;
    uint256 public poolValue;

    mapping(address => uint256) public reward;
    mapping(address => bool) public claimed;

    event Settled(uint256 seasonId, uint256 pool, address topRank, uint256 rank1Amount);
    event Claimed(address indexed user, uint256 seasonId, uint256 amount);
    event Swept(uint256 seasonId, address indexed to, uint256 amount);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    constructor(
        address game_,
        uint256 seasonId_,
        uint256 topTierEnd_,
        uint256 topTierShareBps_,
        uint256 rewardEndRank_,
        uint256 claimDeadline_
    ) {
        require(game_ != address(0), "Game is zero");
        require(topTierEnd_ > 0 && topTierEnd_ < rewardEndRank_, "Invalid tiers");
        require(rewardEndRank_ > 0, "Invalid reward rank");

        game = ISeasonGame(game_);
        seasonId = seasonId_;
        topTierEnd = topTierEnd_;
        topTierShareBps = topTierShareBps_;
        rewardEndRank = rewardEndRank_;
        claimDeadline = claimDeadline_;
        owner = msg.sender;
    }

    // Single source of truth for the reward formula. The frontend calls this
    // before settle to project rewards, and settle() calls it to assign them,
    // so the projection and the payout always agree. `view` (not `pure`)
    // because it reads the immutable tier configuration.
    function rewardForRank(uint256 rank, uint256 poolAmount) public view returns (uint256) {
        if (rank == 0 || rank > rewardEndRank) return 0;

        if (rank <= topTierEnd) {
            uint256 coefficient = 2 * (topTierEnd + 2) - 2 * rank;
            return (poolAmount * coefficient) / 1000;
        }

        return poolAmount / 250;
    }

    function settle() external onlyOwner {
        require(!settled, "Already settled");
        require(block.timestamp > game.seasonEnd(), "Season not over");

        settled = true;

        (address[] memory players, uint256[] memory points) = game.getSeasonScorePage(0, rewardEndRank);

        uint256 poolAmount = address(this).balance;
        poolValue = poolAmount;

        // Integer-division dust across all rewardEndRank nominal shares.
        uint256 totalNominal = 0;
        for (uint256 rank = 1; rank <= rewardEndRank; rank++) {
            totalNominal += rewardForRank(rank, poolAmount);
        }
        uint256 remainder = poolAmount - totalNominal;

        address topRank = address(0);
        uint256 rank1Amount = 0;

        for (uint256 i = 0; i < players.length; i++) {
            uint256 rank = i + 1;
            address player = players[i];

            if (player == address(0) || points[i] == 0) continue;

            uint256 amount = rewardForRank(rank, poolAmount);
            if (rank == 1) {
                amount += remainder;
                topRank = player;
                rank1Amount = amount;
            }

            reward[player] = amount;
        }

        emit Settled(seasonId, poolAmount, topRank, rank1Amount);
    }

    function claim() external {
        require(settled, "Not settled");
        require(reward[msg.sender] > 0, "No reward");
        require(!claimed[msg.sender], "Already claimed");
        require(block.timestamp <= claimDeadline, "Claim deadline passed");

        uint256 amount = reward[msg.sender];
        claimed[msg.sender] = true;

        (bool sent, ) = msg.sender.call{value: amount}("");
        require(sent, "Claim transfer failed");

        emit Claimed(msg.sender, seasonId, amount);
    }

    function sweepUnclaimed(address nextSeasonTreasury) external onlyOwner {
        require(settled, "Not settled");
        require(block.timestamp > claimDeadline, "Claim window open");
        require(nextSeasonTreasury != address(0), "Zero treasury");

        uint256 amount = address(this).balance;
        require(amount > 0, "Nothing to sweep");

        (bool sent, ) = nextSeasonTreasury.call{value: amount}("");
        require(sent, "Sweep transfer failed");

        emit Swept(seasonId, nextSeasonTreasury, amount);
    }

    function pool() external view returns (uint256) {
        return address(this).balance;
    }

    receive() external payable {}
}
