# LitVM DEX Deployment Guide

## 🎯 Pre-Deployment Checklist

### 1. Contract Verification
- [x] All security vulnerabilities fixed
- [x] Safe token transfers implemented
- [x] Reentrancy protection enabled
- [x] Slippage protection added
- [x] Access control implemented
- [x] Gas optimization complete
- [x] Custom errors for efficiency
- [x] No external dependencies

### 2. Environment Setup
```bash
# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Configure environment variables
# Edit .env with your settings
```

### 3. Wallet Preparation
- Ensure deployer wallet has sufficient LIT tokens for gas
- Recommended: 1-2 LIT for deployment
- Add LitVM network to MetaMask

## 🚀 Deployment Steps

### Option 1: Manual Deployment (Recommended)

#### Step 1: Compile Contract
```bash
# The contract is already optimized and ready
# Located at: contracts/LitVMDEX.sol
```

#### Step 2: Deploy Using Remix IDE

1. Open [Remix IDE](https://remix.ethereum.org)
2. Create new file: `LitVMDEX.sol`
3. Copy contract code from `contracts/LitVMDEX.sol`
4. Compile with:
   - Compiler: 0.8.20
   - Optimization: Enabled (200 runs)
   - EVM Version: Paris

5. Deploy:
   - Environment: Injected Provider (MetaMask)
   - Network: LitVM (Chain ID: 175177)
   - Gas Limit: 5,000,000
   - Click "Deploy"

6. Save contract address

#### Step 3: Verify Contract

1. Go to [LitVM Explorer](https://explorer.litvm.io)
2. Navigate to your contract address
3. Click "Verify & Publish"
4. Enter:
   - Compiler: 0.8.20
   - Optimization: Yes (200 runs)
   - License: MIT
   - Contract code
5. Submit verification

### Option 2: Hardhat Deployment

#### Step 1: Install Hardhat
```bash
npm install --save-dev hardhat @nomicfoundation/hardhat-toolbox
```

#### Step 2: Create Hardhat Config
```javascript
// hardhat.config.js
require("@nomicfoundation/hardhat-toolbox");

module.exports = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  networks: {
    litvm: {
      url: process.env.RPC_URL || "https://rpc.litvm.io",
      accounts: [process.env.PRIVATE_KEY],
      chainId: 175177,
      gasPrice: 20000000000 // 20 Gwei
    }
  },
  etherscan: {
    apiKey: {
      litvm: "your-api-key" // If LitVM supports API verification
    }
  }
};
```

#### Step 3: Create Deployment Script
```javascript
// scripts/deploy.js
async function main() {
  console.log("Deploying LitVMDEX...");
  
  const LitVMDEX = await ethers.getContractFactory("LitVMDEX");
  const dex = await LitVMDEX.deploy();
  
  await dex.deployed();
  
  console.log("LitVMDEX deployed to:", dex.address);
  console.log("Owner:", await dex.owner());
  
  // Save deployment info
  const fs = require('fs');
  const deploymentInfo = {
    address: dex.address,
    owner: await dex.owner(),
    network: 'LitVM',
    chainId: 175177,
    timestamp: new Date().toISOString()
  };
  
  fs.writeFileSync(
    'deployment.json',
    JSON.stringify(deploymentInfo, null, 2)
  );
  
  console.log("Deployment info saved to deployment.json");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
```

#### Step 4: Deploy
```bash
npx hardhat run scripts/deploy.js --network litvm
```

#### Step 5: Verify
```bash
npx hardhat verify --network litvm DEPLOYED_CONTRACT_ADDRESS
```

## 🔧 Post-Deployment Configuration

### 1. Update Frontend Configuration

Edit `src/config/contract.ts`:
```typescript
addresses: {
  dex: 'YOUR_DEPLOYED_CONTRACT_ADDRESS',
}
```

### 2. Update Environment Variables

Edit `.env`:
```bash
VITE_DEX_CONTRACT_ADDRESS=YOUR_DEPLOYED_CONTRACT_ADDRESS
```

### 3. Test Deployment

```bash
# Start development server
npm run dev

# Test in browser:
# 1. Connect wallet
# 2. Try swap quote
# 3. Add liquidity (small amount)
# 4. Execute swap
# 5. Remove liquidity
```

## 🧪 Deployment Testing

### Test Checklist
- [ ] Contract deployed successfully
- [ ] Owner address correct
- [ ] Can get quotes
- [ ] Can add liquidity
- [ ] Can remove liquidity
- [ ] Can execute swaps
- [ ] Events emitted correctly
- [ ] Gas costs reasonable
- [ ] Frontend connects properly

### Test Script
```javascript
// test/deployment.test.js
const { expect } = require("chai");

describe("LitVMDEX Deployment", function () {
  let dex, owner;
  
  beforeEach(async function () {
    [owner] = await ethers.getSigners();
    const LitVMDEX = await ethers.getContractFactory("LitVMDEX");
    dex = await LitVMDEX.deploy();
    await dex.deployed();
  });
  
  it("Should set the right owner", async function () {
    expect(await dex.owner()).to.equal(owner.address);
  });
  
  it("Should have correct constants", async function () {
    expect(await dex.FEE_DENOMINATOR()).to.equal(1000);
    expect(await dex.SWAP_FEE()).to.equal(3);
    expect(await dex.MINIMUM_LIQUIDITY()).to.equal(1000);
  });
});
```

## 📊 Gas Estimates

| Function | Estimated Gas | Cost (20 Gwei) |
|----------|---------------|-----------------|
| Deploy | ~3,500,000 | ~0.07 LIT |
| Add Liquidity (First) | ~250,000 | ~0.005 LIT |
| Add Liquidity | ~150,000 | ~0.003 LIT |
| Remove Liquidity | ~120,000 | ~0.0024 LIT |
| Swap | ~100,000 | ~0.002 LIT |

## 🔒 Security Recommendations

### Before Mainnet Deployment

1. **Audit**: Get professional security audit
2. **Testnet**: Deploy and test on testnet first
3. **Bug Bounty**: Consider bug bounty program
4. **Insurance**: Look into DeFi insurance options
5. **Monitoring**: Set up contract monitoring
6. **Multisig**: Use multisig for owner functions

### After Deployment

1. **Monitor**: Watch for unusual activity
2. **Backup**: Keep deployment keys secure
3. **Documentation**: Maintain updated docs
4. **Communication**: Have incident response plan
5. **Updates**: Plan for potential upgrades

## 🆘 Troubleshooting

### Common Issues

#### Deployment Fails
- Check gas limit (increase to 5,000,000)
- Verify wallet has sufficient LIT
- Ensure correct network selected
- Check RPC endpoint is responsive

#### Verification Fails
- Ensure exact compiler version (0.8.20)
- Check optimization settings (200 runs)
- Verify contract code matches exactly
- Try manual verification if automatic fails

#### Frontend Connection Issues
- Verify contract address in config
- Check network ID matches (175177)
- Ensure ABI is up to date
- Clear browser cache

## 📞 Support

If you encounter issues:
1. Check this guide thoroughly
2. Review contract code comments
3. Test on testnet first
4. Contact support: support@litvmdex.io

## ✅ Deployment Complete!

Once deployed and verified:
1. ✅ Contract is live on LitVM
2. ✅ Frontend is configured
3. ✅ Testing is complete
4. ✅ Documentation is updated
5. ✅ Ready for users!

---

**Remember**: Always test thoroughly before mainnet deployment!
