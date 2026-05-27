/**
 * Contract configuration for LitVM DEX
 */

export const CONTRACT_CONFIG = {
  // Contract deployment settings
  gasLimit: 5000000,
  gasPrice: '20000000000', // 20 Gwei
  
  // Network settings
  network: {
    name: 'LitVM',
    chainId: 175177, // LitVM chain ID
    rpcUrl: 'https://rpc.litvm.io',
    explorerUrl: 'https://explorer.litvm.io',
  },
  
  // Contract addresses (update after deployment)
  addresses: {
    dex: '', // Will be set after deployment
    tokens: {
      LIT: '0x0000000000000000000000000000000000000000',
      USDT: '0x0000000000000000000000000000000000000001',
      WETH: '0x0000000000000000000000000000000000000002',
      DAI: '0x0000000000000000000000000000000000000003',
    },
  },
  
  // DEX parameters
  parameters: {
    feeNumerator: 3,
    feeDenominator: 1000,
    minimumLiquidity: 1000,
  },
};

export default CONTRACT_CONFIG;
