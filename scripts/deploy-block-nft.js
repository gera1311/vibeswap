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

function compileBlockNFT() {
  const source = readFileSync(resolve('contracts/VibeBlockNFT.sol'), 'utf8')
  const input = {
    language: 'Solidity',
    sources: {
      'VibeBlockNFT.sol': { content: source },
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

  const contract = output.contracts['VibeBlockNFT.sol'].VibeBlockNFT

  return {
    abi: contract.abi,
    bytecode: `0x${contract.evm.bytecode.object}`,
  }
}

function readGameAddress() {
  const override = process.env.GAME_ADDRESS
  if (override) return override

  try {
    const gameDeployment = JSON.parse(readFileSync(resolve('deployments-game.json'), 'utf8'))
    if (gameDeployment.address) return gameDeployment.address
  } catch {
    // fall through
  }

  throw new Error('GAME_ADDRESS is required (set it in .env or provide deployments-game.json)')
}

function updateBlockNFTAddress(address) {
  const path = resolve('src/contracts/deployments.ts')
  const current = readFileSync(path, 'utf8')
  const next = current.replace(/(blockNft:\s*)'0x[a-fA-F0-9]{40}'/, `$1'${address}'`)

  if (next === current) throw new Error('Could not update blockNft in src/contracts/deployments.ts')

  writeFileSync(path, next)
}

loadEnv()

const privateKey = process.env.PRIVATE_KEY
const rpcUrl = process.env.LITVM_RPC_URL || 'https://liteforge.rpc.caldera.xyz/http'
const mintFee = process.env.BLOCK_NFT_MINT_FEE_ZKLTC || '0.002'

if (!privateKey) throw new Error('PRIVATE_KEY is required in .env')
if (!privateKey.startsWith('0x')) throw new Error('PRIVATE_KEY must start with 0x')

const account = privateKeyToAccount(privateKey)
const treasury = process.env.BLOCK_NFT_TREASURY_ADDRESS || process.env.FEE_TREASURY_ADDRESS || process.env.GAME_TREASURY_ADDRESS || account.address
const gameAddress = readGameAddress()
const { abi, bytecode } = compileBlockNFT()

if (process.argv.includes('--check')) {
  console.log('VibeBlockNFT deployment check ok')
  console.log(`Deployer: ${account.address}`)
  console.log(`Game: ${gameAddress}`)
  console.log(`Treasury: ${treasury}`)
  console.log(`Mint fee: ${mintFee} zkLTC`)
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

console.log(`Deploying VibeBlockNFT from ${account.address}`)
console.log(`Game: ${gameAddress}`)
console.log(`Treasury: ${treasury}`)
console.log(`Mint fee: ${mintFee} zkLTC`)

const hash = await walletClient.deployContract({
  abi,
  bytecode,
  args: [gameAddress, treasury, parseEther(mintFee)],
})

console.log(`Deploy tx: ${hash}`)

const receipt = await publicClient.waitForTransactionReceipt({ hash })
const contractAddress = receipt.contractAddress

if (!contractAddress) throw new Error('Deployment receipt does not contain contractAddress')

writeFileSync(
  resolve('deployments-block-nft.json'),
  `${JSON.stringify({
    chainId: litVM.id,
    contract: 'VibeBlockNFT',
    address: contractAddress,
    game: gameAddress,
    treasury,
    mintFeeZkLTC: mintFee,
    transactionHash: hash,
    blockNumber: receipt.blockNumber.toString(),
  }, null, 2)}\n`,
)

updateBlockNFTAddress(contractAddress)

console.log(`VibeBlockNFT deployed: ${contractAddress}`)
console.log('Deployment metadata written to deployments-block-nft.json')
console.log('src/contracts/deployments.ts updated')
