import type { Address } from 'viem'

export const contractDeployments = {
  chainId: 4441,
  gm: '0x2791bb410616779a2d50bf4a3223afea51c8a656',
  vbUSDC: '0x5a9b445e43559c75c7b22befc3d471cc177069cc',
  swap: '0x96f48a300bb96f97f639cea3fe10f19ab34a6d7d',
  game: '0xf9d45161cf58b56ea14d65cb38b1a47056b3e766',
  nft: '0xc3e422a3922dab5f1192dc5471892812bb8a2da3',
} as const satisfies {
  chainId: number
  gm: Address
  vbUSDC: Address
  swap: Address
  game: Address
  nft: Address
}
