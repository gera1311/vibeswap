import { parseAbi } from 'viem'
import type { Address } from 'viem'
import { contractDeployments } from './deployments'

export const swapAddress: Address = contractDeployments.swap
export const swapChainId = 4441

export const swapAbi = parseAbi([
  'function swapExactInput(uint256 vbUSDCAmount, uint256 minZkLTC) payable',
  'function swapExactZkLTCInput(uint256 minVbUSDC) payable',
  'function swapExactOutput(uint256 zkLTCOutput, uint256 maxVbUSDC) payable',
  'function swapFee() view returns (uint256)',
  'function treasury() view returns (address)',
  'function getRate() view returns (uint256)',
  'function getVbUSDCReserve() view returns (uint256)',
  'function getZkLTCReserve() view returns (uint256)',
  'function getLiquidity() view returns (uint256)',
  'function addLiquidity(uint256 vbUSDCAmount) payable',
  'function removeLiquidity(uint256 lpTokens)',
])
