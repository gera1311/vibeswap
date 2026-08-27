import { parseAbi } from 'viem'
import type { Address } from 'viem'
import { contractDeployments } from './deployments'

const ZERO = '0x0000000000000000000000000000000000000000'

export const seasonNFTAddress: Address = contractDeployments.seasonNft
export const seasonNFTChainId = 4441
export const isSeasonNFTDeployed = seasonNFTAddress !== ZERO

export const seasonNFTAbi = parseAbi([
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function game() view returns (address)',
  'function seasonId() view returns (uint256)',
  'function minDaysPlayed() view returns (uint256)',
  'function mintDeadline() view returns (uint256)',
  'function totalSupply() view returns (uint256)',
  'function balanceOf(address owner) view returns (uint256)',
  'function ownerOf(uint256 tokenId) view returns (address)',
  'function hasMinted(address user) view returns (bool)',
  'function mint()',
])
