import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createPublicClient, createWalletClient, defineChain, http, parseAbi } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'

const litVM = defineChain({
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

const ZERO = '0x0000000000000000000000000000000000000000'

const legacyAbi = parseAbi([
  'function getTopScores() view returns (address[10], uint256[10])',
  'function getTopTotalScores() view returns (address[10], uint256[10])',
])

const seedAbi = parseAbi([
  'function seedLeaderboard(address[] bestPlayers, uint256[] bestScores, address[] totalPlayers, uint256[] totalScores)',
])

function loadEnv() {
  try {
    const env = readFileSync(resolve('.env'), 'utf8')
    for (const line of env.split('\n')) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const index = trimmed.indexOf('=')
      if (index === -1) continue
      const key = trimmed.slice(0, index).trim()
      const value = trimmed.slice(index + 1).trim()
      if (!process.env[key]) process.env[key] = value
    }
  } catch {
    // .env is optional
  }
}

function clean(players, scores) {
  const ps = []
  const sc = []
  players.forEach((player, i) => {
    if (player !== ZERO && scores[i] > 0n) {
      ps.push(player)
      sc.push(scores[i])
    }
  })
  return { players: ps, scores: sc }
}

loadEnv()

const privateKey = process.env.PRIVATE_KEY
const rpcUrl = process.env.LITVM_RPC_URL || 'https://liteforge.rpc.caldera.xyz/http'
const legacyAddress = process.env.LEGACY_GAME_ADDRESS || '0xf9d45161cf58b56ea14d65cb38b1a47056b3e766'

if (!privateKey) throw new Error('PRIVATE_KEY is required in .env')

const gameDeployment = JSON.parse(readFileSync(resolve('deployments-game.json'), 'utf8'))
const targetAddress = gameDeployment.address

const account = privateKeyToAccount(privateKey)
const publicClient = createPublicClient({ chain: litVM, transport: http(rpcUrl) })
const walletClient = createWalletClient({ account, chain: litVM, transport: http(rpcUrl) })

const best = await publicClient.readContract({ abi: legacyAbi, address: legacyAddress, functionName: 'getTopScores' })
const total = await publicClient.readContract({ abi: legacyAbi, address: legacyAddress, functionName: 'getTopTotalScores' })

const bestClean = clean(best[0], best[1])
const totalClean = clean(total[0], total[1])

console.log(`Migrating ${bestClean.players.length} best scores and ${totalClean.players.length} total scores`)
console.log(`From legacy: ${legacyAddress}`)
console.log(`To target: ${targetAddress}`)

const hash = await walletClient.writeContract({
  abi: seedAbi,
  address: targetAddress,
  functionName: 'seedLeaderboard',
  args: [bestClean.players, bestClean.scores, totalClean.players, totalClean.scores],
})

console.log(`Seed tx: ${hash}`)

const receipt = await publicClient.waitForTransactionReceipt({ hash })
console.log(`Seeded in block ${receipt.blockNumber.toString()}`)
