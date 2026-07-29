// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

interface IvbUSDC {
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

contract Swap {
    uint256 private constant VBUSDC_DECIMALS = 1e6;
    uint256 private constant ZKLTC_DECIMALS = 1e18;

    address public immutable owner;
    address public immutable treasury;
    IvbUSDC public immutable vbUSDC;
    uint256 public immutable rateVbUSDCPerZkLTC;
    uint256 public immutable swapFee;

    event LiquidityAdded(address indexed provider, uint256 vbUSDCAmount, uint256 zkLTCAmount);
    event LiquidityRemoved(address indexed owner, uint256 vbUSDCAmount, uint256 zkLTCAmount);
    event SwapExactInput(address indexed user, uint256 vbUSDCAmount, uint256 zkLTCOutput);
    event SwapExactZkLTCInput(address indexed user, uint256 zkLTCAmount, uint256 vbUSDCOutput);
    event SwapExactOutput(address indexed user, uint256 zkLTCOutput, uint256 vbUSDCAmount);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    constructor(address vbUSDC_, address treasury_, uint256 rateVbUSDCPerZkLTC_, uint256 swapFee_) {
        require(vbUSDC_ != address(0), "Token is zero");
        require(treasury_ != address(0), "Treasury is zero");
        require(rateVbUSDCPerZkLTC_ > 0, "Rate is zero");

        owner = msg.sender;
        treasury = treasury_;
        vbUSDC = IvbUSDC(vbUSDC_);
        rateVbUSDCPerZkLTC = rateVbUSDCPerZkLTC_;
        swapFee = swapFee_;
    }

    receive() external payable {}

    function swapExactInput(uint256 vbUSDCAmount, uint256 minZkLTC) external payable {
        require(msg.value == swapFee, "Invalid swap fee");
        require(vbUSDCAmount > 0, "Amount is zero");

        uint256 zkLTCOutput = _quoteZkLTC(vbUSDCAmount);
        require(zkLTCOutput >= minZkLTC, "Slippage");
        require(address(this).balance >= zkLTCOutput, "Insufficient zkLTC reserve");

        require(vbUSDC.transferFrom(msg.sender, address(this), vbUSDCAmount), "Transfer failed");
        _sendFee();

        (bool sent, ) = msg.sender.call{value: zkLTCOutput}("");
        require(sent, "zkLTC transfer failed");

        emit SwapExactInput(msg.sender, vbUSDCAmount, zkLTCOutput);
    }

    function swapExactZkLTCInput(uint256 minVbUSDC) external payable {
        require(msg.value > swapFee, "Amount is zero");

        uint256 zkLTCInput = msg.value - swapFee;
        uint256 vbUSDCOutput = _quoteVbUSDC(zkLTCInput);
        require(vbUSDCOutput >= minVbUSDC, "Slippage");
        require(vbUSDC.balanceOf(address(this)) >= vbUSDCOutput, "Insufficient vbUSDC reserve");

        _sendFee();
        require(vbUSDC.transfer(msg.sender, vbUSDCOutput), "Token transfer failed");

        emit SwapExactZkLTCInput(msg.sender, zkLTCInput, vbUSDCOutput);
    }

    function swapExactOutput(uint256 zkLTCOutput, uint256 maxVbUSDC) external payable {
        require(msg.value == swapFee, "Invalid swap fee");
        require(zkLTCOutput > 0, "Amount is zero");
        require(address(this).balance >= zkLTCOutput, "Insufficient zkLTC reserve");

        uint256 vbUSDCAmount = _quoteVbUSDC(zkLTCOutput);
        require(vbUSDCAmount <= maxVbUSDC, "Slippage");

        require(vbUSDC.transferFrom(msg.sender, address(this), vbUSDCAmount), "Transfer failed");
        _sendFee();

        (bool sent, ) = msg.sender.call{value: zkLTCOutput}("");
        require(sent, "zkLTC transfer failed");

        emit SwapExactOutput(msg.sender, zkLTCOutput, vbUSDCAmount);
    }

    function addLiquidity(uint256 vbUSDCAmount) external payable {
        require(vbUSDCAmount > 0 || msg.value > 0, "No liquidity");

        if (vbUSDCAmount > 0) {
            require(vbUSDC.transferFrom(msg.sender, address(this), vbUSDCAmount), "Transfer failed");
        }

        emit LiquidityAdded(msg.sender, vbUSDCAmount, msg.value);
    }

    function removeLiquidity(uint256 zkLTCAmount) external onlyOwner {
        require(address(this).balance >= zkLTCAmount, "Insufficient zkLTC reserve");

        uint256 vbUSDCAmount = _quoteVbUSDC(zkLTCAmount);
        uint256 tokenReserve = vbUSDC.balanceOf(address(this));
        if (vbUSDCAmount > tokenReserve) vbUSDCAmount = tokenReserve;

        if (vbUSDCAmount > 0) {
            require(vbUSDC.transfer(owner, vbUSDCAmount), "Token transfer failed");
        }

        if (zkLTCAmount > 0) {
            (bool sent, ) = owner.call{value: zkLTCAmount}("");
            require(sent, "zkLTC transfer failed");
        }

        emit LiquidityRemoved(owner, vbUSDCAmount, zkLTCAmount);
    }

    function getRate() external view returns (uint256) {
        return rateVbUSDCPerZkLTC;
    }

    function getVbUSDCReserve() external view returns (uint256) {
        return vbUSDC.balanceOf(address(this));
    }

    function getZkLTCReserve() external view returns (uint256) {
        return address(this).balance;
    }

    function getLiquidity() external view returns (uint256) {
        return address(this).balance;
    }

    function _quoteZkLTC(uint256 vbUSDCAmount) private view returns (uint256) {
        return (vbUSDCAmount * ZKLTC_DECIMALS) / (rateVbUSDCPerZkLTC * VBUSDC_DECIMALS);
    }

    function _quoteVbUSDC(uint256 zkLTCAmount) private view returns (uint256) {
        return (zkLTCAmount * rateVbUSDCPerZkLTC * VBUSDC_DECIMALS) / ZKLTC_DECIMALS;
    }

    function _sendFee() private {
        if (swapFee == 0) return;

        (bool sent, ) = treasury.call{value: swapFee}("");
        require(sent, "Fee transfer failed");
    }
}
