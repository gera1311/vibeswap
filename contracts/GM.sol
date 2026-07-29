// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

contract GM {
    struct UserState {
        uint256 streak;
        uint256 totalGm;
        uint256 lastGmDay;
        uint256 badges;
    }

    address public immutable treasury;
    uint256 public immutable gmFee;

    mapping(address => UserState) private users;

    event Gm(address indexed user, uint256 streak, uint256 totalGm, uint256 badges, uint256 day);

    constructor(address treasury_, uint256 gmFee_) {
        require(treasury_ != address(0), "Treasury is zero");

        treasury = treasury_;
        gmFee = gmFee_;
    }

    function gm() external payable {
        require(msg.value == gmFee, "Invalid GM fee");

        uint256 today = block.timestamp / 1 days;
        UserState storage user = users[msg.sender];

        require(user.lastGmDay != today, "Already GM today");

        if (user.lastGmDay + 1 == today) {
            user.streak += 1;
        } else {
            user.streak = 1;
        }

        user.totalGm += 1;
        user.lastGmDay = today;
        user.badges = _badgesForStreak(user.streak);

        (bool sent, ) = treasury.call{value: msg.value}("");
        require(sent, "Fee transfer failed");

        emit Gm(msg.sender, user.streak, user.totalGm, user.badges, today);
    }

    function getStreak(address user) external view returns (uint256) {
        return users[user].streak;
    }

    function getTotalGm(address user) external view returns (uint256) {
        return users[user].totalGm;
    }

    function getLastGmTime(address user) external view returns (uint256) {
        return users[user].lastGmDay * 1 days;
    }

    function hasClaimedToday(address user) public view returns (bool) {
        return users[user].lastGmDay == block.timestamp / 1 days;
    }

    function getBadges(address user) external view returns (uint256) {
        return users[user].badges;
    }

    function _badgesForStreak(uint256 streak) private pure returns (uint256) {
        if (streak >= 30) return 3;
        if (streak >= 10) return 2;
        if (streak >= 3) return 1;
        return 0;
    }
}
