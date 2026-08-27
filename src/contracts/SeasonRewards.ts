import { parseAbi } from 'viem'
import type { Address } from 'viem'
import { contractDeployments } from './deployments'

const ZERO = '0x0000000000000000000000000000000000000000'

export const seasonRewardsAddress: Address = contractDeployments.seasonRewards
export const seasonRewardsChainId = 4441
export const isSeasonRewardsDeployed = seasonRewardsAddress !== ZERO

export const seasonRewardsAbi = parseAbi([
  'function game() view returns (address)',
  'function owner() view returns (address)',
  'function seasonId() view returns (uint256)',
  'function topTierEnd() view returns (uint256)',
  'function topTierShareBps() view returns (uint256)',
  'function rewardEndRank() view returns (uint256)',
  'function claimDeadline() view returns (uint256)',
  'function settled() view returns (bool)',
  'function poolValue() view returns (uint256)',
  'function pool() view returns (uint256)',
  'function reward(address user) view returns (uint256)',
  'function claimed(address user) view returns (bool)',
  'function rewardForRank(uint256 rank, uint256 poolAmount) view returns (uint256)',
  'function settle()',
  'function claim()',
  'function sweepUnclaimed(address nextSeasonTreasury)',
])
