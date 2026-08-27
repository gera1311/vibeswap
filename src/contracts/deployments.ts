import type { Address } from 'viem'

export const contractDeployments = {
  chainId: 4441,
  gm: '0x2791bb410616779a2d50bf4a3223afea51c8a656',
  vbUSDC: '0x5a9b445e43559c75c7b22befc3d471cc177069cc',
  swap: '0x96f48a300bb96f97f639cea3fe10f19ab34a6d7d',
  game: '0xbbfad21b55b624945d2b3a4e358d5c2e9962f725',
  nft: '0xc3e422a3922dab5f1192dc5471892812bb8a2da3',
  blockNft: '0x3c9127210f08599bbbdc20305c8cef6a227dddb7',
  seasonGame: '0x666a0c2772dac76bd5cdfef083a193b2b7288b5b',
  seasonRewards: '0x44bde186c63fc77e371c3e796ac1af4a38b83b5c',
  seasonNft: '0x93acd91e1a8c7f514eb00ce95fbb284c85f228b9',
} as const satisfies {
  chainId: number
  gm: Address
  vbUSDC: Address
  swap: Address
  game: Address
  nft: Address
  blockNft: Address
  seasonGame: Address
  seasonRewards: Address
  seasonNft: Address
}
