import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createInterface } from 'node:readline'
import { createPublicClient, createWalletClient, defineChain, http, parseEther, formatEther } from 'viem'
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

function readRewardsAddress() {
  const override = process.env.SEASON0_REWARDS_ADDRESS
  if (override) return override

  try {
    const rewardsDeployment = JSON.parse(readFileSync(resolve('deployments-season0-rewards.json'), 'utf8'))
    if (rewardsDeployment.address) return rewardsDeployment.address
  } catch {
    // fall through
  }

  throw new Error('SeasonRewards address not found (provide deployments-season0-rewards.json or set SEASON0_REWARDS_ADDRESS)')
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

loadEnv()

const privateKey = process.env.SEASON0_TREASURY_PRIVATE_KEY
const rpcUrl = process.env.LITVM_RPC_URL || 'https://liteforge.rpc.caldera.xyz/http'
const rewardsAddress = readRewardsAddress()

if (!privateKey) throw new Error('SEASON0_TREASURY_PRIVATE_KEY is required in .env')
if (!privateKey.startsWith('0x')) throw new Error('SEASON0_TREASURY_PRIVATE_KEY must start with 0x')

const account = privateKeyToAccount(privateKey)

const publicClient = createPublicClient({
  chain: litVM,
  transport: http(rpcUrl),
})

const walletClient = createWalletClient({
  account,
  chain: litVM,
  transport: http(rpcUrl),
})

const args = process.argv.slice(2)
const sendAll = args.includes('--all')
const amountArg = args.find((arg) => !arg.startsWith('--'))

let amount

if (sendAll) {
  amount = await publicClient.getBalance({ address: account.address })
} else {
  if (!amountArg) throw new Error('Provide a zkLTC amount argument (e.g. node scripts/fund-season-rewards.js 10) or --all')
  amount = parseEther(amountArg)
}

if (amount === 0n) throw new Error('Pool amount is zero')

console.log(`Season 0 reward pool funding`)
console.log(`Treasury (sender): ${account.address}`)
console.log(`Rewards (recipient): ${rewardsAddress}`)
console.log(`Amount: ${formatEther(amount)} zkLTC`)

if (args.includes('--yes')) {
  console.log('Confirmed via --yes')
} else {
  const answer = await ask('Send this pool to SeasonRewards before settle? Type "yes" to confirm: ')
  if (answer !== 'yes') {
    console.log('Aborted.')
    process.exit(0)
  }
}

const hash = await walletClient.sendTransaction({
  to: rewardsAddress,
  value: amount,
})

console.log(`Fund tx: ${hash}`)

const receipt = await publicClient.waitForTransactionReceipt({ hash })
console.log(`Funded in block ${receipt.blockNumber.toString()}`)
