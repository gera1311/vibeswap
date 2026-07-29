import { parseAbi } from 'viem'
import type { Address } from 'viem'
import { contractDeployments } from './deployments'

export const gmAddress: Address = contractDeployments.gm
export const gmChainId = 4441

export const gmAbi = parseAbi([
  'function gm() payable',
  'function gmFee() view returns (uint256)',
  'function treasury() view returns (address)',
  'function getStreak(address user) view returns (uint256)',
  'function getTotalGm(address user) view returns (uint256)',
  'function getLastGmTime(address user) view returns (uint256)',
  'function hasClaimedToday(address user) view returns (bool)',
  'function getBadges(address user) view returns (uint256)',
])
