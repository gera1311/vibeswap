import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import solc from 'solc'
import { createPublicClient, createWalletClient, defineChain, http, parseEther } from 'viem'
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

function compileSeasonGame() {
  const source = readFileSync(resolve('contracts/SeasonGame.sol'), 'utf8')
  const input = {
    language: 'Solidity',
    sources: {
      'SeasonGame.sol': { content: source },
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

  const contract = output.contracts['SeasonGame.sol'].SeasonGame

  return {
    abi: contract.abi,
    bytecode: `0x${contract.evm.bytecode.object}`,
  }
}

function updateSeasonGameAddress(address) {
  const path = resolve('src/contracts/deployments.ts')
  const current = readFileSync(path, 'utf8')
  const next = current.replace(/(seasonGame:\s*)'0x[a-fA-F0-9]{40}'/, `$1'${address}'`)

  if (next === current) throw new Error('Could not update seasonGame in src/contracts/deployments.ts')

  writeFileSync(path, next)
}

loadEnv()

const privateKey = process.env.PRIVATE_KEY
const rpcUrl = process.env.LITVM_RPC_URL || 'https://liteforge.rpc.caldera.xyz/http'

if (!privateKey) throw new Error('PRIVATE_KEY is required in .env')
if (!privateKey.startsWith('0x')) throw new Error('PRIVATE_KEY must start with 0x')

const account = privateKeyToAccount(privateKey)
const treasury =
  process.env.SEASON0_TREASURY_ADDRESS ||
  (process.env.SEASON0_TREASURY_PRIVATE_KEY?.startsWith('0x')
    ? privateKeyToAccount(process.env.SEASON0_TREASURY_PRIVATE_KEY).address
    : undefined) ||
  process.env.FEE_TREASURY_ADDRESS ||
  account.address
const entryFee = process.env.SEASON0_ENTRY_FEE_ZKLTC || '0.0051'
const seasonId = process.env.SEASON0_SEASON_ID || '0'
const seasonStart = process.env.SEASON0_SEASON_START || '1788220800'
const seasonEnd = process.env.SEASON0_SEASON_END || '1790812799'
const minDaysPlayed = process.env.SEASON0_MIN_DAYS_PLAYED || '10'
const submitGrace = process.env.SEASON0_SUBMIT_GRACE || '86400'
const maxRunsPerDay = process.env.SEASON0_MAX_RUNS_PER_DAY || '10'
const minRunInterval = process.env.SEASON0_MIN_RUN_INTERVAL || '60'

const { abi, bytecode } = compileSeasonGame()

if (process.argv.includes('--check')) {
  console.log('SeasonGame deployment check ok')
  console.log(`Deployer: ${account.address}`)
  console.log(`Treasury: ${treasury}`)
  console.log(`Entry fee: ${entryFee} zkLTC`)
  console.log(`Season id: ${seasonId}`)
  console.log(`Season window: ${seasonStart} - ${seasonEnd}`)
  console.log(`Min days played: ${minDaysPlayed}`)
  console.log(`Submit grace: ${submitGrace} sec`)
  console.log(`Max runs/day: ${maxRunsPerDay}`)
  console.log(`Min run interval: ${minRunInterval} sec`)
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

console.log(`Deploying SeasonGame from ${account.address}`)
console.log(`Treasury: ${treasury}`)
console.log(`Entry fee: ${entryFee} zkLTC`)
console.log(`Season window: ${seasonStart} - ${seasonEnd}`)

const hash = await walletClient.deployContract({
  abi,
  bytecode,
  args: [
    treasury,
    parseEther(entryFee),
    BigInt(seasonId),
    BigInt(seasonStart),
    BigInt(seasonEnd),
    BigInt(minDaysPlayed),
    BigInt(submitGrace),
    BigInt(maxRunsPerDay),
    BigInt(minRunInterval),
  ],
})

console.log(`Deploy tx: ${hash}`)

const receipt = await publicClient.waitForTransactionReceipt({ hash })
const contractAddress = receipt.contractAddress

if (!contractAddress) throw new Error('Deployment receipt does not contain contractAddress')

writeFileSync(
  resolve('deployments-season0-game.json'),
  `${JSON.stringify({
    chainId: litVM.id,
    contract: 'SeasonGame',
    address: contractAddress,
    treasury,
    entryFeeZkLTC: entryFee,
    seasonId,
    seasonStart,
    seasonEnd,
    minDaysPlayed,
    submitGrace,
    maxRunsPerDay,
    minRunInterval,
    transactionHash: hash,
    blockNumber: receipt.blockNumber.toString(),
  }, null, 2)}\n`,
)

updateSeasonGameAddress(contractAddress)

console.log(`SeasonGame deployed: ${contractAddress}`)
console.log('Deployment metadata written to deployments-season0-game.json')
console.log('src/contracts/deployments.ts updated')
