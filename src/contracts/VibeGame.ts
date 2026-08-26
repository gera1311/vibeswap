import { parseAbi } from 'viem'
import type { Address } from 'viem'
import { contractDeployments } from './deployments'

export const vibeGameAddress: Address = contractDeployments.game
export const vibeGameChainId = 4441
export const isVibeGameDeployed = vibeGameAddress !== '0x0000000000000000000000000000000000000000'

export const vibeGameAbi = parseAbi([
  'function entryFee() view returns (uint256)',
  'function treasury() view returns (address)',
  'function activeRun(address player) view returns (bool)',
  'function bestScore(address player) view returns (uint256)',
  'function totalScore(address player) view returns (uint256)',
  'function totalRuns(address player) view returns (uint256)',
  'function maxBlock(address player) view returns (uint256)',
  'function SCORE_POLICY_VERSION() view returns (uint256)',
  'function TOTAL_SCORE_MULTIPLIER() view returns (uint256)',
  'function scoreToLeaderboardPoints(uint256 score) pure returns (uint256)',
  'function startRun() payable',
  'function reportMaxBlock(uint256 block_)',
  'function submitScore(uint256 score, uint256 maxBlock)',
  'function abandonRun()',
  'function getBestScoreCount() view returns (uint256)',
  'function getTotalScoreCount() view returns (uint256)',
  'function getBestScorePage(uint256 offset, uint256 limit) view returns (address[], uint256[])',
  'function getTotalScorePage(uint256 offset, uint256 limit) view returns (address[], uint256[])',
])
