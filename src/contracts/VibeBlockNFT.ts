import { parseAbi } from 'viem'
import type { Address } from 'viem'
import { contractDeployments } from './deployments'

export const vibeBlockNFTAddress: Address = contractDeployments.blockNft
export const vibeBlockNFTChainId = 4441
export const isVibeBlockNFTDeployed = vibeBlockNFTAddress !== '0x0000000000000000000000000000000000000000'

export const vibeBlockNFTAbi = parseAbi([
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function mintFee() view returns (uint256)',
  'function treasury() view returns (address)',
  'function game() view returns (address)',
  'function totalSupply() view returns (uint256)',
  'function balanceOf(address owner) view returns (uint256)',
  'function ownerOf(uint256 tokenId) view returns (address)',
  'function hasMinted(address user, uint256 tier) view returns (bool)',
  'function holdersCount(uint256 tier) view returns (uint256)',
  'function mint(uint256 tier) payable',
])
