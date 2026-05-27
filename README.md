# LitVM DEX - Decentralized Exchange

A production-ready Automated Market Maker (AMM) DEX built on LitVM blockchain with enterprise-grade security.

## 🚀 Features

- **AMM Swap**: Constant product formula (x * y = k) for efficient token swaps
- **Liquidity Pools**: Add/remove liquidity with LP token rewards
- **Multi-language**: English and Russian support
- **Security**: Reentrancy protection, slippage control, access control
- **Gas Optimized**: Custom errors, immutable variables, efficient storage

## 📋 Prerequisites

- Node.js 18+ and npm/yarn
- MetaMask or compatible Web3 wallet
- LitVM network configured in wallet

## 🛠️ Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

## 🔐 Smart Contract Security

### Implemented Security Measures

1. **Reentrancy Protection**: `nonReentrant` modifier on all external functions
2. **Safe Token Transfers**: 
   - `_safeTransferFrom()` with allowance and balance checks
   - `_safeTransfer()` with balance verification
3. **Slippage Protection**: `minLiquidity`, `minAmountA/B`, `minAmountOut` parameters
4. **Access Control**: `onlyOwner` modifier for admin functions
5. **Input Validation**: Custom errors for gas efficiency
6. **Division by Zero**: Comprehensive checks in all calculations
7. **Overflow Protection**: Solidity 0.8.20 built-in protection
8. **Event Logging**: Complete audit trail for all state changes

### Contract Functions

#### Core Functions
- `addLiquidity()` - Add liquidity to pools
- `removeLiquidity()` - Remove liquidity from pools
- `swap()` - Execute token swaps
- `getQuote()` - Get swap quotes
- `getReserves()` - View pool reserves
- `getLiquidityShare()` - View LP positions

#### Admin Functions
- `emergencyWithdraw()` - Owner-only emergency withdrawal

## 🚀 Deployment

### Step 1: Compile Contract

The contract is already compiled and ready for deployment. Key features:
- Solidity 0.8.20
- No external dependencies
- Gas-optimized with custom errors
- Production-ready security

### Step 2: Deploy to LitVM

```bash
# Set up environment variables
export PRIVATE_KEY="your_private_key"
export RPC_URL="https://rpc.litvm.io"

# Deploy contract (use your preferred deployment tool)
# Example with Hardhat:
npx hardhat run scripts/deploy.js --network litvm
```

### Step 3: Verify Contract

After deployment, verify the contract on LitVM Explorer:
```bash
npx hardhat verify --network litvm DEPLOYED_CONTRACT_ADDRESS
```

### Step 4: Update Frontend

Update `src/config/contract.ts` with deployed contract address:
```typescript
addresses: {
  dex: 'YOUR_DEPLOYED_CONTRACT_ADDRESS',
}
```

## 🧪 Testing

### Local Testing
```bash
npm run test
```

### Test Coverage
- Unit tests for all contract functions
- Integration tests for swap flows
- Security tests for reentrancy and access control
- Gas optimization tests

## 📊 Contract Architecture

```
LitVMDEX
├── State Variables
│   ├── pools (mapping)
│   ├── liquidityProviders (mapping)
│   └── constants (FEE, MINIMUM_LIQUIDITY)
├── Core Functions
│   ├── addLiquidity()
│   ├── removeLiquidity()
│   └── swap()
├── View Functions
│   ├── getQuote()
│   ├── getReserves()
│   └── getLiquidityShare()
└── Internal Functions
    ├── _safeTransferFrom()
    ├── _safeTransfer()
    ├── _calculateLiquidity()
    └── _calculateSwapOutput()
```

## 🔒 Security Audit Checklist

- [x] Reentrancy protection implemented
- [x] Safe token transfers with error handling
- [x] Slippage protection on all operations
- [x] Access control for admin functions
- [x] Input validation with custom errors
- [x] Division by zero protection
- [x] Overflow/underflow protection (Solidity 0.8+)
- [x] Event logging for transparency
- [x] Gas optimization with immutable variables
- [x] No external dependencies (flat contract)

## 📝 Contract Parameters

- **Swap Fee**: 0.3% (3/1000)
- **Minimum Liquidity**: 1000 tokens (locked permanently)
- **Slippage Tolerance**: User-configurable (default 0.5%)
- **Gas Limit**: 5,000,000 (recommended)

## 🌐 Network Configuration

### LitVM Mainnet
- Chain ID: 175177
- RPC URL: https://rpc.litvm.io
- Explorer: https://explorer.litvm.io
- Currency: LIT

### Add to MetaMask
```javascript
{
  chainId: '0x2AC69',
  chainName: 'LitVM',
  nativeCurrency: {
    name: 'LIT',
    symbol: 'LIT',
    decimals: 18
  },
  rpcUrls: ['https://rpc.litvm.io'],
  blockExplorerUrls: ['https://explorer.litvm.io']
}
```

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📄 License

MIT License - see LICENSE file for details

## 🆘 Support

- Documentation: [docs.litvmdex.io](https://docs.litvmdex.io)
- Discord: [discord.gg/litvmdex](https://discord.gg/litvmdex)
- Email: support@litvmdex.io

## ⚠️ Disclaimer

This software is provided "as is" without warranty. Use at your own risk. Always conduct thorough testing and security audits before deploying to mainnet.

---

Built with ❤️ for the LitVM ecosystem
