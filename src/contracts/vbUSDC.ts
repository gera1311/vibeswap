import { parseAbi } from 'viem'
import type { Address } from 'viem'
import { contractDeployments } from './deployments'

export const vbUSDCAddress: Address = contractDeployments.vbUSDC
export const vbUSDCChainId = 4441

export const vbUSDCApi = parseAbi([
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
  'function totalSupply() view returns (uint256)',
  'function balanceOf(address account) view returns (uint256)',
  'function transfer(address to, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function transferFrom(address from, address to, uint256 amount) returns (bool)',
  'function faucet() payable',
  'function faucetFee() view returns (uint256)',
  'function treasury() view returns (address)',
  'function lastClaim(address account) view returns (uint256)',
  'function claimAmount() view returns (uint256)',
  'function maxSupply() view returns (uint256)',
])
