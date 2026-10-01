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

const args = process.argv.slice(2)
const nextSeasonTreasury = process.env.SEASON1_TREASURY_ADDRESS || args.find((arg) => !arg.startsWith('--'))

if (!nextSeasonTreasury) throw new Error('Provide the next-season treasury address as an argument (or SEASON1_TREASURY_ADDRESS in .env)')

const rewardsAbi = parseAbi([
  'function owner() view returns (address)',
  'function settled() view returns (bool)',
  'function claimDeadline() view returns (uint256)',
  'function sweepUnclaimed(address nextSeasonTreasury)',
])

const publicClient = createPublicClient({ chain: litVM, transport: http(rpcUrl) })

const [owner, settled, claimDeadline, balance] = await Promise.all([
  publicClient.readContract({ abi: rewardsAbi, address: rewardsAddress, functionName: 'owner' }),
  publicClient.readContract({ abi: rewardsAbi, address: rewardsAddress, functionName: 'settled' }),
  publicClient.readContract({ abi: rewardsAbi, address: rewardsAddress, functionName: 'claimDeadline' }),
  publicClient.getBalance({ address: rewardsAddress }),
])

if (owner.toLowerCase() !== account.address.toLowerCase()) {
  throw new Error(`Only the owner (${owner}) can sweep. Your wallet is ${account.address}.`)
}

if (!settled) throw new Error('Not settled yet — sweep requires settle() first.')

const block = await publicClient.getBlock({ blockTag: 'latest' })
const now = block.timestamp

console.log('Season 0 sweep check')
console.log(`SeasonRewards: ${rewardsAddress}`)
console.log(`Unclaimed balance: ${formatEther(balance)} zkLTC`)
console.log(`Claim deadline: ${fmt(claimDeadline)}`)
console.log(`Now: ${fmt(now)}`)
console.log(`Next-season treasury: ${nextSeasonTreasury}`)

if (now <= claimDeadline) {
  console.log('\n⚠️ The claim window is still open — wait until it closes before sweeping.')
  process.exit(1)
}

if (process.argv.includes('--yes')) {
  console.log('Confirmed via --yes')
} else {
  const answer = await ask('Sweep unclaimed funds to the next-season treasury? Type "yes" to confirm: ')
  if (answer !== 'yes') {
    console.log('Aborted.')
    process.exit(0)
  }
}

const walletClient = createWalletClient({ account, chain: litVM, transport: http(rpcUrl) })

const hash = await walletClient.writeContract({
  abi: rewardsAbi,
  address: rewardsAddress,
  functionName: 'sweepUnclaimed',
  args: [nextSeasonTreasury],
})

console.log(`Sweep tx: ${hash}`)

const receipt = await publicClient.waitForTransactionReceipt({ hash })
console.log(`Swept in block ${receipt.blockNumber.toString()} (status: ${receipt.status})`)
