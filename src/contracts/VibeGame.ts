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
  'function totalRuns(address player) view returns (uint256)',
  'function startRun() payable',
  'function submitScore(uint256 score)',
  'function abandonRun()',
  'function getTopScores() view returns (address[10], uint256[10])',
])
