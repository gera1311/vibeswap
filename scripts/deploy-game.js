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

function compileGame() {
  const source = readFileSync(resolve('contracts/VibeGame.sol'), 'utf8')
  const input = {
    language: 'Solidity',
    sources: {
      'VibeGame.sol': { content: source },
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

  const contract = output.contracts['VibeGame.sol'].VibeGame

  return {
    abi: contract.abi,
    bytecode: `0x${contract.evm.bytecode.object}`,
  }
}

function updateGameAddress(address) {
  const path = resolve('src/contracts/deployments.ts')
  const current = readFileSync(path, 'utf8')
  const next = current.replace(/(game:\s*)'0x[a-fA-F0-9]{40}'/, `$1'${address}'`)

  if (next === current) throw new Error('Could not update game in src/contracts/deployments.ts')

  writeFileSync(path, next)
}

loadEnv()

const privateKey = process.env.PRIVATE_KEY
const rpcUrl = process.env.LITVM_RPC_URL || 'https://liteforge.rpc.caldera.xyz/http'
const entryFee = process.env.GAME_ENTRY_FEE_ZKLTC || '0.0051'

if (!privateKey) throw new Error('PRIVATE_KEY is required in .env')
if (!privateKey.startsWith('0x')) throw new Error('PRIVATE_KEY must start with 0x')

const account = privateKeyToAccount(privateKey)
const treasury = process.env.GAME_TREASURY_ADDRESS || process.env.FEE_TREASURY_ADDRESS || account.address
const { abi, bytecode } = compileGame()

if (process.argv.includes('--check')) {
  console.log('VibeGame deployment check ok')
  console.log(`Deployer: ${account.address}`)
  console.log(`Treasury: ${treasury}`)
  console.log(`Entry fee: ${entryFee} zkLTC`)
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

console.log(`Deploying VibeGame from ${account.address}`)
console.log(`Treasury: ${treasury}`)
console.log(`Entry fee: ${entryFee} zkLTC`)

const hash = await walletClient.deployContract({
  abi,
  bytecode,
  args: [treasury, parseEther(entryFee)],
})

console.log(`Deploy tx: ${hash}`)

const receipt = await publicClient.waitForTransactionReceipt({ hash })
const contractAddress = receipt.contractAddress

if (!contractAddress) throw new Error('Deployment receipt does not contain contractAddress')

writeFileSync(
  resolve('deployments-game.json'),
  `${JSON.stringify({
    chainId: litVM.id,
    contract: 'VibeGame',
    address: contractAddress,
    treasury,
    entryFeeZkLTC: entryFee,
    transactionHash: hash,
    blockNumber: receipt.blockNumber.toString(),
  }, null, 2)}\n`,
)

updateGameAddress(contractAddress)

console.log(`VibeGame deployed: ${contractAddress}`)
console.log('Deployment metadata written to deployments-game.json')
console.log('src/contracts/deployments.ts updated')
