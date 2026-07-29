import { injected } from 'wagmi/connectors';
import { createConfig, http } from 'wagmi';import { QueryClient } from '@tanstack/react-query'
import { defineChain } from 'viem'

export const litVM = defineChain({
  id: 4441,
  name: 'LitVM LiteForge',
  nativeCurrency: { name: 'zkLTC', symbol: 'zkLTC', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://liteforge.rpc.caldera.xyz/http'] },
  },
  blockExplorers: {
    default: { name: 'LiteForge', url: 'https://liteforge.explorer.caldera.xyz/' },
  },
})

export const config = createConfig({
  chains: [litVM],
  connectors: [injected()],
  transports: {
    [litVM.id]: http(),
  },
})

export const queryClient = new QueryClient()
