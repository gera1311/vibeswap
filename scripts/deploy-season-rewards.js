import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import solc from 'solc'
import { createPublicClient, createWalletClient, defineChain, http } from 'viem'
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

function compileSeasonRewards() {
  const source = readFileSync(resolve('contracts/SeasonRewards.sol'), 'utf8')
  const input = {
    language: 'Solidity',
    sources: {
      'SeasonRewards.sol': { content: source },
    },
    settings: {
      outputSelection: {
        '*': {
          '*': ['abi', 'evm.bytecode.object'],
        },
      },
    },
  }

  const output = JSON.parse(solc.compile(JSON.stringify(input)))
  const errors = output.errors?.filter((error) => error.severity === 'error')

  if (errors?.length) {
    throw new Error(errors.map((error) => error.formattedMessage).join('\n'))
  }

  const contract = output.contracts['SeasonRewards.sol'].SeasonRewards

  return {
    abi: contract.abi,
    bytecode: `0x${contract.evm.bytecode.object}`,
  }
}

function readGameAddress() {
  const override = process.env.SEASON0_GAME_ADDRESS
  if (override) return override

  try {
    const gameDeployment = JSON.parse(readFileSync(resolve('deployments-season0-game.json'), 'utf8'))
    if (gameDeployment.address) return gameDeployment.address
  } catch {
    // fall through
  }

  throw new Error('SeasonGame address not found (deploy the game first or set SEASON0_GAME_ADDRESS)')
}

function updateSeasonRewardsAddress(address) {
  const path = resolve('src/contracts/deployments.ts')
  const current = readFileSync(path, 'utf8')
  const next = current.replace(/(seasonRewards:\s*)'0x[a-fA-F0-9]{40}'/, `$1'${address}'`)

  if (next === current) throw new Error('Could not update seasonRewards in src/contracts/deployments.ts')

  writeFileSync(path, next)
}

loadEnv()

const privateKey = process.env.PRIVATE_KEY
const rpcUrl = process.env.LITVM_RPC_URL || 'https://liteforge.rpc.caldera.xyz/http'

if (!privateKey) throw new Error('PRIVATE_KEY is required in .env')
if (!privateKey.startsWith('0x')) throw new Error('PRIVATE_KEY must start with 0x')

const account = privateKeyToAccount(privateKey)
const gameAddress = readGameAddress()
const seasonId = process.env.SEASON0_SEASON_ID || '0'
const topTierEnd = process.env.SEASON0_TOP_TIER_END || '25'
const topTierShareBps = process.env.SEASON0_TOP_TIER_SHARE_BPS || '7000'
const rewardEndRank = process.env.SEASON0_REWARD_END_RANK || '100'
const claimDeadline = process.env.SEASON0_CLAIM_DEADLINE || '1793491199'

const { abi, bytecode } = compileSeasonRewards()

if (process.argv.includes('--check')) {
  console.log('SeasonRewards deployment check ok')
  console.log(`Deployer: ${account.address}`)
  console.log(`Game: ${gameAddress}`)
  console.log(`Season id: ${seasonId}`)
  console.log(`Top tier end: ${topTierEnd}`)
  console.log(`Top tier share bps: ${topTierShareBps}`)
  console.log(`Reward end rank: ${rewardEndRank}`)
  console.log(`Claim deadline: ${claimDeadline}`)
  process.exit(0)
}

const publicClient = createPublicClient({
  chain: litVM,
  transport: http(rpcUrl),
})

const walletClient = createWalletClient({
  account,
  chain: litVM,
  transport: http(rpcUrl),
})

console.log(`Deploying SeasonRewards from ${account.address}`)
console.log(`Game: ${gameAddress}`)

const hash = await walletClient.deployContract({
  abi,
  bytecode,
  args: [
    gameAddress,
    BigInt(seasonId),
    BigInt(topTierEnd),
    BigInt(topTierShareBps),
    BigInt(rewardEndRank),
    BigInt(claimDeadline),
  ],
})

console.log(`Deploy tx: ${hash}`)

const receipt = await publicClient.waitForTransactionReceipt({ hash })
const contractAddress = receipt.contractAddress

if (!contractAddress) throw new Error('Deployment receipt does not contain contractAddress')

writeFileSync(
  resolve('deployments-season0-rewards.json'),
  `${JSON.stringify({
    chainId: litVM.id,
    contract: 'SeasonRewards',
    address: contractAddress,
    game: gameAddress,
    seasonId,
    topTierEnd,
    topTierShareBps,
    rewardEndRank,
    claimDeadline,
    transactionHash: hash,
    blockNumber: receipt.blockNumber.toString(),
  }, null, 2)}\n`,
)

updateSeasonRewardsAddress(contractAddress)

console.log(`SeasonRewards deployed: ${contractAddress}`)
console.log('Deployment metadata written to deployments-season0-rewards.json')
console.log('src/contracts/deployments.ts updated')
