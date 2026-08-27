import { parseAbi } from 'viem'
import type { Address } from 'viem'
import { contractDeployments } from './deployments'

const ZERO = '0x0000000000000000000000000000000000000000'

export const seasonGameAddress: Address = contractDeployments.seasonGame
export const seasonGameChainId = 4441
export const isSeasonGameDeployed = seasonGameAddress !== ZERO

export const seasonGameAbi = parseAbi([
  'function treasury() view returns (address)',
  'function owner() view returns (address)',
  'function entryFee() view returns (uint256)',
  'function seasonId() view returns (uint256)',
  'function seasonStart() view returns (uint256)',
  'function seasonEnd() view returns (uint256)',
  'function minDaysPlayed() view returns (uint256)',
  'function submitGrace() view returns (uint256)',
  'function maxRunsPerDay() view returns (uint256)',
  'function minRunInterval() view returns (uint256)',
  'function SCORE_POLICY_VERSION() view returns (uint256)',
  'function TOTAL_SCORE_MULTIPLIER() view returns (uint256)',
  'function activeRun(address player) view returns (bool)',
  'function seasonPoints(address player) view returns (uint256)',
  'function bestScore(address player) view returns (uint256)',
  'function totalRuns(address player) view returns (uint256)',
  'function maxBlock(address player) view returns (uint256)',
  'function daysPlayed(address player) view returns (uint256)',
  'function lastPlayedDay(address player) view returns (uint256)',
  'function scoreToLeaderboardPoints(uint256 score) pure returns (uint256)',
  'function startRun() payable',
  'function submitScore(uint256 score, uint256 maxBlock)',
  'function abandonRun()',
  'function getSeasonScoreCount() view returns (uint256)',
  'function getSeasonScorePage(uint256 offset, uint256 limit) view returns (address[], uint256[])',
  'function getRank(address user) view returns (uint256)',
])
