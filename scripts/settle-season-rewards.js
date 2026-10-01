import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createInterface } from 'node:readline'
import { createPublicClient, createWalletClient, defineChain, http, parseAbi, formatEther } from 'viem'
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
    // .env is optional so CI can pass variables directly.
  }
}

function readAddress(envKey, deploymentFile) {
  const override = process.env[envKey]
  if (override) return override

  try {
    const deployment = JSON.parse(readFileSync(resolve(deploymentFile), 'utf8'))
    if (deployment.address) return deployment.address
  } catch {
    // fall through
  }

  throw new Error(`${envKey} is required (or provide ${deploymentFile})`)
}

function ask(question) {
  const rl = createInterface({ input: process.stdin, output: process.stdout })

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close()
      resolve(answer.trim().toLowerCase())
    })
  })
}

const fmt = (ts) => new Date(Number(ts) * 1000).toISOString().replace('T', ' ').slice(0, 19) + ' UTC'

loadEnv()

const privateKey = process.env.PRIVATE_KEY
const rpcUrl = process.env.LITVM_RPC_URL || 'https://liteforge.rpc.caldera.xyz/http'

if (!privateKey) throw new Error('PRIVATE_KEY is required in .env')
if (!privateKey.startsWith('0x')) throw new Error('PRIVATE_KEY must start with 0x')

const account = privateKeyToAccount(privateKey)
const rewardsAddress = readAddress('SEASON0_REWARDS_ADDRESS', 'deployments-season0-rewards.json')
const gameAddress = readAddress('SEASON0_GAME_ADDRESS', 'deployments-season0-game.json')

const rewardsAbi = parseAbi([
  'function owner() view returns (address)',
  'function settled() view returns (bool)',
  'function pool() view returns (uint256)',
  'function settle()',
])
const gameAbi = parseAbi([
  'function seasonEnd() view returns (uint256)',
  'function submitGrace() view returns (uint256)',
])

const publicClient = createPublicClient({ chain: litVM, transport: http(rpcUrl) })

const [owner, settled, pool, seasonEnd, grace] = await Promise.all([
  publicClient.readContract({ abi: rewardsAbi, address: rewardsAddress, functionName: 'owner' }),
  publicClient.readContract({ abi: rewardsAbi, address: rewardsAddress, functionName: 'settled' }),
  publicClient.readContract({ abi: rewardsAbi, address: rewardsAddress, functionName: 'pool' }),
  publicClient.readContract({ abi: gameAbi, address: gameAddress, functionName: 'seasonEnd' }),
  publicClient.readContract({ abi: gameAbi, address: gameAddress, functionName: 'submitGrace' }),
])

if (owner.toLowerCase() !== account.address.toLowerCase()) {
  throw new Error(`Only the owner (${owner}) can settle. Your wallet is ${account.address}.`)
}

if (settled) {
  console.log('SeasonRewards is already settled.')
  process.exit(0)
}

const graceEnd = seasonEnd + grace
const block = await publicClient.getBlock({ blockTag: 'latest' })
const now = block.timestamp

console.log('Season 0 settle check')
console.log(`SeasonRewards: ${rewardsAddress}`)
console.log(`Pool: ${formatEther(pool)} zkLTC`)
console.log(`Grace ends: ${fmt(graceEnd)}`)
console.log(`Now: ${fmt(now)}`)

if (now <= graceEnd && !process.argv.includes('--force')) {
  console.log('\n⚠️ Grace period is still open — in-flight runs can still submit scores.')
  console.log(`Re-run with --force to settle now, or wait until ${fmt(graceEnd)}.`)
  process.exit(1)
}

if (process.argv.includes('--force')) {
  console.log('\n--force passed: settling before the grace period ends.')
}

if (process.argv.includes('--yes')) {
  console.log('Confirmed via --yes')
} else {
  const answer = await ask('Settle now and distribute the pool to the top-100? This is irreversible. Type "yes" to confirm: ')
  if (answer !== 'yes') {
    console.log('Aborted.')
    process.exit(0)
  }
}

const walletClient = createWalletClient({ account, chain: litVM, transport: http(rpcUrl) })

const hash = await walletClient.writeContract({
  abi: rewardsAbi,
  address: rewardsAddress,
  functionName: 'settle',
  args: [],
})

console.log(`Settle tx: ${hash}`)

const receipt = await publicClient.waitForTransactionReceipt({ hash })
console.log(`Settled in block ${receipt.blockNumber.toString()} (status: ${receipt.status})`)
