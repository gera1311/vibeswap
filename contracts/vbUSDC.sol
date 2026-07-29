// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

contract vbUSDC {
    string public constant name = "Vibe USDC";
    string public constant symbol = "vbUSDC";
    uint8 public constant decimals = 6;

    address public immutable treasury;
    uint256 public immutable faucetFee;
    uint256 public immutable claimAmount;
    uint256 public immutable maxSupply;

    uint256 public totalSupply;

    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;
    mapping(address => uint256) public lastClaim;

    event Approval(address indexed owner, address indexed spender, uint256 value);
    event Transfer(address indexed from, address indexed to, uint256 value);

    constructor(address treasury_, uint256 faucetFee_, uint256 claimAmount_, uint256 maxSupply_, uint256 initialOwnerSupply_) {
        require(treasury_ != address(0), "Treasury is zero");
        require(claimAmount_ > 0, "Claim is zero");
        require(maxSupply_ >= initialOwnerSupply_, "Initial supply too high");

        treasury = treasury_;
        faucetFee = faucetFee_;
        claimAmount = claimAmount_;
        maxSupply = maxSupply_;

        if (initialOwnerSupply_ > 0) {
            _mint(msg.sender, initialOwnerSupply_);
        }
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        _transfer(msg.sender, to, amount);
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        uint256 currentAllowance = allowance[from][msg.sender];
        require(currentAllowance >= amount, "Insufficient allowance");

        if (currentAllowance != type(uint256).max) {
            allowance[from][msg.sender] = currentAllowance - amount;
            emit Approval(from, msg.sender, allowance[from][msg.sender]);
        }

        _transfer(from, to, amount);
        return true;
    }

    function faucet() external payable {
        require(msg.value == faucetFee, "Invalid faucet fee");
        require(block.timestamp - lastClaim[msg.sender] >= 1 days, "Already claimed today");
        require(totalSupply + claimAmount <= maxSupply, "Max supply reached");

        lastClaim[msg.sender] = block.timestamp;
        _mint(msg.sender, claimAmount);

        (bool sent, ) = treasury.call{value: msg.value}("");
        require(sent, "Fee transfer failed");
    }

    function _transfer(address from, address to, uint256 amount) private {
        require(to != address(0), "Transfer to zero");
        require(balanceOf[from] >= amount, "Insufficient balance");

        balanceOf[from] -= amount;
        balanceOf[to] += amount;

        emit Transfer(from, to, amount);
    }

    function _mint(address to, uint256 amount) private {
        require(to != address(0), "Mint to zero");

        totalSupply += amount;
        balanceOf[to] += amount;

        emit Transfer(address(0), to, amount);
    }
}
