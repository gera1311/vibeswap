// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

/**
 * @title IERC20
 * @notice Minimal ERC20 interface for token transfers.
 * @dev Some tokens (e.g. USDT) do not return a boolean. The contract uses
 *      low-level calls to safely handle all ERC20 implementations.
 */
interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
    function approve(address spender, uint256 amount) external returns (bool);
    function allowance(address owner, address spender) external view returns (uint256);
}

/**
 * @title LitVMDEX
 * @notice Automated Market Maker (AMM) DEX contract for token swaps on LitVM
 * @dev Implements constant product formula (x * y = k) for liquidity pools
 * @dev Production-ready with comprehensive security measures
 * @dev SECURITY: Follows Checks-Effects-Interactions (CEI) pattern to prevent reentrancy
 * @deprecated Use VIBESWAP.sol instead - this contract is maintained for backward compatibility only
 */
contract LitVMDEX {
    // State variables
    struct Pool {
        uint256 reserve0;
        uint256 reserve1;
        uint256 totalLiquidity;
        uint256 lastUpdate;
    }

    mapping(bytes32 => Pool) public pools;
    mapping(bytes32 => mapping(address => uint256)) public liquidityProviders;

    uint256 public constant FEE_DENOMINATOR = 1000;
    uint256 public constant SWAP_FEE = 3; // 0.3% fee
    uint256 public constant MINIMUM_LIQUIDITY = 1000;

    address public immutable owner;
    bool private locked;

    // Events
    event LiquidityAdded(
        address indexed provider,
        address indexed tokenA,
        address indexed tokenB,
        uint256 amountA,
        uint256 amountB,
        uint256 liquidity
    );

    event LiquidityRemoved(
        address indexed provider,
        address indexed tokenA,
        address indexed tokenB,
        uint256 amountA,
        uint256 amountB,
        uint256 liquidity
    );

    event Swap(
        address indexed user,
        address indexed tokenIn,
        address indexed tokenOut,
        uint256 amountIn,
        uint256 amountOut,
        uint256 fee
    );

    event PoolCreated(
        address indexed tokenA,
        address indexed tokenB,
        uint256 initialReserveA,
        uint256 initialReserveB
    );

    event ReservesUpdated(
        address indexed tokenA,
        address indexed tokenB,
        uint256 reserve0,
        uint256 reserve1
    );

    // Custom errors (gas efficient)
    error Unauthorized();
    error ReentrancyDetected();
    error InvalidAddress();
    error InvalidAmount();
    error IdenticalTokens();
    error InsufficientLiquidity();
    error SlippageExceeded();
    error TransferFailed();
    error InsufficientBalance();
    error DivisionByZero();

    // Modifiers
    modifier onlyOwner() {
        if (msg.sender != owner) revert Unauthorized();
        _;
    }

    modifier nonReentrant() {
        if (locked) revert ReentrancyDetected();
        locked = true;
        _;
        locked = false;
    }

    modifier validAddress(address _address) {
        if (_address == address(0)) revert InvalidAddress();
        _;
    }

    modifier validAmount(uint256 _amount) {
        if (_amount == 0) revert InvalidAmount();
        _;
    }

    constructor() {
        owner = msg.sender;
        locked = false;
    }

    /**
     * @notice Get pool ID for token pair
     */
    function _getPoolId(address tokenA, address tokenB) private pure returns (bytes32) {
        (address token0, address token1) = tokenA < tokenB ? (tokenA, tokenB) : (tokenB, tokenA);
        return keccak256(abi.encodePacked(token0, token1));
    }

    /**
     * @notice Sort tokens to maintain consistent ordering
     */
    function _sortTokens(address tokenA, address tokenB) private pure returns (address token0, address token1) {
        if (tokenA == tokenB) revert IdenticalTokens();
        (token0, token1) = tokenA < tokenB ? (tokenA, tokenB) : (tokenB, tokenA);
    }

    /**
     * @notice Safe ERC20 transferFrom supporting non-standard tokens.
     * @dev Uses low-level call to handle tokens that do not return a boolean (SWC-104 fix).
     */
    function _safeTransferFrom(
        address token,
        address from,
        address to,
        uint256 amount
    ) private {
        uint256 allowance = IERC20(token).allowance(from, address(this));
        if (allowance < amount) revert InsufficientBalance();

        (bool success, bytes memory data) = token.call(
            abi.encodeWithSelector(IERC20.transferFrom.selector, from, to, amount)
        );

        if (!success) revert TransferFailed();

        // If return data present, ensure it decodes to true
        if (data.length > 0 && !abi.decode(data, (bool))) revert TransferFailed();
    }

    /**
     * @notice Safe ERC20 transfer supporting non-standard tokens.
     * @dev Uses low-level call to handle tokens that do not return a boolean (SWC-104 fix).
     */
    function _safeTransfer(
        address token,
        address to,
        uint256 amount
    ) private {
        uint256 balance = IERC20(token).balanceOf(address(this));
        if (balance < amount) revert InsufficientBalance();

        (bool success, bytes memory data) = token.call(
            abi.encodeWithSelector(IERC20.transfer.selector, to, amount)
        );

        if (!success) revert TransferFailed();

        // If return data present, ensure it decodes to true
        if (data.length > 0 && !abi.decode(data, (bool))) revert TransferFailed();
    }

    /**
     * @notice Add liquidity to a token pair pool
     * @dev SECURITY: Follows CEI pattern - all state updates occur BEFORE external calls
     */
    function addLiquidity(
        address tokenA,
        address tokenB,
        uint256 amountA,
        uint256 amountB,
        uint256 minLiquidity
    )
        external
        nonReentrant
        validAddress(tokenA)
        validAddress(tokenB)
        validAmount(amountA)
        validAmount(amountB)
        returns (uint256 liquidity)
    {
        (address token0, address token1) = _sortTokens(tokenA, tokenB);
        (uint256 amount0, uint256 amount1) = tokenA == token0 ? (amountA, amountB) : (amountB, amountA);

        bytes32 poolId = _getPoolId(token0, token1);
        Pool storage pool = pools[poolId];

        // CHECKS: Validate inputs
        if (pool.reserve0 == 0 && pool.reserve1 == 0) {
            // First liquidity provision
            uint256 tempLiquidity = sqrt(amount0 * amount1);
            if (tempLiquidity <= MINIMUM_LIQUIDITY) revert InsufficientLiquidity();
        } else {
            // Subsequent liquidity provision
            if (pool.totalLiquidity == 0) revert DivisionByZero();
        }

        // Calculate liquidity
        liquidity = _calculateLiquidity(poolId, amount0, amount1);
        if (liquidity < minLiquidity) revert SlippageExceeded();

        // EFFECTS: Update state variables BEFORE external calls (CEI pattern)
        pool.reserve0 += amount0;
        pool.reserve1 += amount1;
        pool.totalLiquidity += liquidity;
        pool.lastUpdate = block.timestamp;
        liquidityProviders[poolId][msg.sender] += liquidity;

        // Emit events BEFORE external calls
        emit ReservesUpdated(token0, token1, pool.reserve0, pool.reserve1);
        emit LiquidityAdded(msg.sender, tokenA, tokenB, amountA, amountB, liquidity);

        // INTERACTIONS: External calls occur LAST (after all state updates)
        _safeTransferFrom(token0, msg.sender, address(this), amount0);
        _safeTransferFrom(token1, msg.sender, address(this), amount1);

        return liquidity;
    }

    /**
     * @notice Internal function to calculate liquidity
     */
    function _calculateLiquidity(
        bytes32 poolId,
        uint256 amount0,
        uint256 amount1
    ) private returns (uint256) {
        Pool storage pool = pools[poolId];

        if (pool.reserve0 == 0 && pool.reserve1 == 0) {
            // First liquidity provision
            uint256 liquidity = sqrt(amount0 * amount1);
            if (liquidity <= MINIMUM_LIQUIDITY) revert InsufficientLiquidity();

            // Lock minimum liquidity
            pool.totalLiquidity = MINIMUM_LIQUIDITY;
            liquidityProviders[poolId][address(0)] = MINIMUM_LIQUIDITY;

            emit PoolCreated(address(0), address(0), amount0, amount1);
            return liquidity - MINIMUM_LIQUIDITY;
        } else {
            // Subsequent liquidity provision
            if (pool.totalLiquidity == 0) revert DivisionByZero();

            uint256 liquidity0 = (amount0 * pool.totalLiquidity) / pool.reserve0;
            uint256 liquidity1 = (amount1 * pool.totalLiquidity) / pool.reserve1;

            uint256 liquidity = liquidity0 < liquidity1 ? liquidity0 : liquidity1;
            if (liquidity == 0) revert InsufficientLiquidity();

            return liquidity;
        }
    }

    /**
     * @notice Remove liquidity from a token pair pool
     * @dev SECURITY: Follows CEI pattern - all state updates occur BEFORE external calls
     */
    function removeLiquidity(
        address tokenA,
        address tokenB,
        uint256 liquidity,
        uint256 minAmountA,
        uint256 minAmountB
    )
        external
        nonReentrant
        validAddress(tokenA)
        validAddress(tokenB)
        validAmount(liquidity)
        returns (uint256 amountA, uint256 amountB)
    {
        (address token0, address token1) = _sortTokens(tokenA, tokenB);
        bytes32 poolId = _getPoolId(token0, token1);

        // CHECKS: Validate user has sufficient liquidity
        if (liquidityProviders[poolId][msg.sender] < liquidity) revert InsufficientBalance();

        // Calculate amounts
        (uint256 amount0, uint256 amount1) = _calculateRemoveAmounts(poolId, liquidity);

        // Return in original order
        (amountA, amountB) = tokenA == token0 ? (amount0, amount1) : (amount1, amount0);

        // Check slippage
        if (amountA < minAmountA || amountB < minAmountB) revert SlippageExceeded();

        // EFFECTS: Update state variables BEFORE external calls (CEI pattern)
        Pool storage pool = pools[poolId];
        pool.reserve0 -= amount0;
        pool.reserve1 -= amount1;
        pool.totalLiquidity -= liquidity;
        pool.lastUpdate = block.timestamp;
        liquidityProviders[poolId][msg.sender] -= liquidity;

        // Emit events BEFORE external calls
        emit ReservesUpdated(token0, token1, pool.reserve0, pool.reserve1);
        emit LiquidityRemoved(msg.sender, tokenA, tokenB, amountA, amountB, liquidity);

        // INTERACTIONS: External calls occur LAST (after all state updates)
        _safeTransfer(token0, msg.sender, amount0);
        _safeTransfer(token1, msg.sender, amount1);

        return (amountA, amountB);
    }

    /**
     * @notice Internal function to calculate remove amounts
     */
    function _calculateRemoveAmounts(
        bytes32 poolId,
        uint256 liquidity
    ) private view returns (uint256 amount0, uint256 amount1) {
        Pool storage pool = pools[poolId];
        if (pool.totalLiquidity == 0) revert InsufficientLiquidity();

        amount0 = (liquidity * pool.reserve0) / pool.totalLiquidity;
        amount1 = (liquidity * pool.reserve1) / pool.totalLiquidity;

        if (amount0 == 0 || amount1 == 0) revert InsufficientLiquidity();

        return (amount0, amount1);
    }

    /**
     * @notice Swap tokens using the AMM
     * @dev SECURITY: Follows CEI pattern - all state updates occur BEFORE external calls
     */
    function swap(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 minAmountOut
    )
        external
        nonReentrant
        validAddress(tokenIn)
        validAddress(tokenOut)
        validAmount(amountIn)
        returns (uint256 amountOut)
    {
        (address token0, address token1) = _sortTokens(tokenIn, tokenOut);
        bytes32 poolId = _getPoolId(token0, token1);
        Pool storage pool = pools[poolId];

        // CHECKS: Validate pool has liquidity
        if (pool.reserve0 == 0 || pool.reserve1 == 0) revert InsufficientLiquidity();

        // Get reserves in correct order
        (uint256 reserveIn, uint256 reserveOut) = tokenIn == token0
            ? (pool.reserve0, pool.reserve1)
            : (pool.reserve1, pool.reserve0);

        // Calculate output amount
        amountOut = _calculateSwapOutput(amountIn, reserveIn, reserveOut);

        // CHECKS: Validate output amount
        if (amountOut < minAmountOut) revert SlippageExceeded();
        if (amountOut >= reserveOut) revert InsufficientLiquidity();

        // EFFECTS: Update reserves BEFORE external calls (CEI pattern)
        if (tokenIn == token0) {
            pool.reserve0 += amountIn;
            pool.reserve1 -= amountOut;
        } else {
            pool.reserve1 += amountIn;
            pool.reserve0 -= amountOut;
        }
        pool.lastUpdate = block.timestamp;

        // Calculate fee
        uint256 fee = (amountIn * SWAP_FEE) / FEE_DENOMINATOR;

        // Emit events BEFORE external calls
        emit ReservesUpdated(token0, token1, pool.reserve0, pool.reserve1);
        emit Swap(msg.sender, tokenIn, tokenOut, amountIn, amountOut, fee);

        // INTERACTIONS: External calls occur LAST (after all state updates)
        _safeTransferFrom(tokenIn, msg.sender, address(this), amountIn);
        _safeTransfer(tokenOut, msg.sender, amountOut);

        return amountOut;
    }

    /**
     * @notice Internal function to calculate swap output
     */
    function _calculateSwapOutput(
        uint256 amountIn,
        uint256 reserveIn,
        uint256 reserveOut
    ) private pure returns (uint256) {
        if (reserveIn == 0 || reserveOut == 0) revert InsufficientLiquidity();

        uint256 amountInWithFee = amountIn * (FEE_DENOMINATOR - SWAP_FEE);
        uint256 numerator = amountInWithFee * reserveOut;
        uint256 denominator = (reserveIn * FEE_DENOMINATOR) + amountInWithFee;

        if (denominator == 0) revert DivisionByZero();

        return numerator / denominator;
    }

    /**
     * @notice Get quote for swap amount
     */
    function getQuote(
        address tokenIn,
        address tokenOut,
        uint256 amountIn
    )
        external
        view
        validAddress(tokenIn)
        validAddress(tokenOut)
        validAmount(amountIn)
        returns (uint256 amountOut)
    {
        (address token0, address token1) = _sortTokens(tokenIn, tokenOut);
        bytes32 poolId = _getPoolId(token0, token1);
        Pool storage pool = pools[poolId];

        (uint256 reserveIn, uint256 reserveOut) = tokenIn == token0
            ? (pool.reserve0, pool.reserve1)
            : (pool.reserve1, pool.reserve0);

        if (reserveIn == 0 || reserveOut == 0) revert InsufficientLiquidity();

        amountOut = _calculateSwapOutput(amountIn, reserveIn, reserveOut);

        return amountOut;
    }

    /**
     * @notice Get pool reserves for a token pair
     */
    function getReserves(address tokenA, address tokenB)
        external
        view
        validAddress(tokenA)
        validAddress(tokenB)
        returns (uint256 reserveA, uint256 reserveB, uint256 lastUpdate)
    {
        (address token0, address token1) = _sortTokens(tokenA, tokenB);
        bytes32 poolId = _getPoolId(token0, token1);
        Pool storage pool = pools[poolId];

        (reserveA, reserveB) = tokenA == token0
            ? (pool.reserve0, pool.reserve1)
            : (pool.reserve1, pool.reserve0);

        return (reserveA, reserveB, pool.lastUpdate);
    }

    /**
     * @notice Get liquidity provider's share
     */
    function getLiquidityShare(
        address tokenA,
        address tokenB,
        address provider
    )
        external
        view
        validAddress(tokenA)
        validAddress(tokenB)
        validAddress(provider)
        returns (uint256 liquidity)
    {
        (address token0, address token1) = _sortTokens(tokenA, tokenB);
        bytes32 poolId = _getPoolId(token0, token1);

        return liquidityProviders[poolId][provider];
    }

    /**
     * @notice Get pool information
     */
    function getPoolInfo(address tokenA, address tokenB)
        external
        view
        validAddress(tokenA)
        validAddress(tokenB)
        returns (
            uint256 reserve0,
            uint256 reserve1,
            uint256 totalLiquidity,
            uint256 lastUpdate
        )
    {
        (address token0, address token1) = _sortTokens(tokenA, tokenB);
        bytes32 poolId = _getPoolId(token0, token1);
        Pool storage pool = pools[poolId];

        return (pool.reserve0, pool.reserve1, pool.totalLiquidity, pool.lastUpdate);
    }

    /**
     * @notice Emergency withdraw function (owner only)
     * @dev SECURITY: Follows CEI pattern - state update before external call
     */
    function emergencyWithdraw(address token, uint256 amount)
        external
        onlyOwner
        nonReentrant
        validAddress(token)
        validAmount(amount)
    {
        _safeTransfer(token, owner, amount);
    }

    /**
     * @notice Calculate square root (Babylonian method)
     */
    function sqrt(uint256 x) internal pure returns (uint256 y) {
        if (x == 0) return 0;
        uint256 z = (x + 1) / 2;
        y = x;
        while (z < y) {
            y = z;
            z = (x / z + z) / 2;
        }
        return y;
    }
}
