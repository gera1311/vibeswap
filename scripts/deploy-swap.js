import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import solc from 'solc'
import { createPublicClient, createWalletClient, defineChain, http, parseEther, parseUnits } from 'viem'
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

function compileContracts() {
  const sources = {
    'vbUSDC.sol': { content: readFileSync(resolve('contracts/vbUSDC.sol'), 'utf8') },
    'Swap.sol': { content: readFileSync(resolve('contracts/Swap.sol'), 'utf8') },
  }
  const input = {
    language: 'Solidity',
    sources,
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

  return {
    vbUSDC: output.contracts['vbUSDC.sol'].vbUSDC,
    Swap: output.contracts['Swap.sol'].Swap,
  }
}

function bytecode(contract) {
  return `0x${contract.evm.bytecode.object}`
}

function updateDeploymentAddress(key, address) {
  const path = resolve('src/contracts/deployments.ts')
  const current = readFileSync(path, 'utf8')
  const pattern = new RegExp(`(${key}:\\s*)'0x[a-fA-F0-9]{40}'`)

  if (!pattern.test(current)) {
    throw new Error(`Could not find deployment key ${key}`)
  }

  const next = current.replace(pattern, `$1'${address}'`)

  if (next === current) {
    console.log(`${key} already points to ${address}`)
    return
  }

  writeFileSync(path, next)
}

loadEnv()

function readPreviousDeployment() {
  try {
    return JSON.parse(readFileSync(resolve('deployments-swap.json'), 'utf8'))
  } catch {
    return null
  }
}

const privateKey = process.env.PRIVATE_KEY
const rpcUrl = process.env.LITVM_RPC_URL || 'https://liteforge.rpc.caldera.xyz/http'
const treasury = process.env.FEE_TREASURY_ADDRESS || process.env.GM_TREASURY_ADDRESS
const claimAmount = process.env.VBUSDC_CLAIM_AMOUNT || '0.5'
const faucetFee = process.env.FAUCET_FEE_ZKLTC || '0.0002'
const maxSupply = process.env.VBUSDC_MAX_SUPPLY || '10000000'
const initialOwnerSupply = process.env.VBUSDC_INITIAL_OWNER_SUPPLY || '1000000'
const rate = BigInt(process.env.SWAP_RATE_VBUSDC_PER_ZKLTC || '1000')
const swapFee = process.env.SWAP_FEE_ZKLTC || '0.0002'
const initialTokenLiquidity = process.env.SWAP_INITIAL_VBUSDC_LIQUIDITY || '100'
const initialNativeLiquidity = process.env.SWAP_INITIAL_ZKLTC_LIQUIDITY || '0.1'
const previousDeployment = readPreviousDeployment()
const reuseToken = process.argv.includes('--reuse-token')
const existingVbUSDCAddress = reuseToken
  ? process.env.EXISTING_VBUSDC_ADDRESS || previousDeployment?.vbUSDC?.address
  : undefined
const existingSwapAddress = process.argv.includes('--reuse-swap')
  ? process.env.EXISTING_SWAP_ADDRESS
  : undefined

if (!privateKey) throw new Error('PRIVATE_KEY is required in .env')
if (!privateKey.startsWith('0x')) throw new Error('PRIVATE_KEY must start with 0x')

const account = privateKeyToAccount(privateKey)
const feeTreasury = treasury || account.address
const { vbUSDC, Swap } = compileContracts()

if (process.argv.includes('--check')) {
  console.log('Swap deployment check ok')
  console.log(`Deployer: ${account.address}`)
  console.log(`Fee treasury: ${feeTreasury}`)
  console.log(`vbUSDC max supply: ${maxSupply}`)
  console.log(`Daily claim amount: ${claimAmount}`)
  console.log(`Faucet fee: ${faucetFee} zkLTC`)
  console.log(`Swap rate: ${rate.toString()} vbUSDC per zkLTC`)
  console.log(`Swap fee: ${swapFee} zkLTC`)
  console.log(`Initial liquidity: ${initialTokenLiquidity} vbUSDC / ${initialNativeLiquidity} zkLTC`)
  process.exit(0)
}

const publicClient = createPublicClient({ chain: litVM, transport: http(rpcUrl) })
const walletClient = createWalletClient({ account, chain: litVM, transport: http(rpcUrl) })

let vbUSDCHash = null
let vbUSDCReceipt = null
let vbUSDCAddress = existingVbUSDCAddress

if (!vbUSDCAddress) {
  console.log(`Deploying vbUSDC from ${account.address}`)

  vbUSDCHash = await walletClient.deployContract({
    abi: vbUSDC.abi,
    bytecode: bytecode(vbUSDC),
    args: [feeTreasury, parseEther(faucetFee), parseUnits(claimAmount, 6), parseUnits(maxSupply, 6), parseUnits(initialOwnerSupply, 6)],
  })
  vbUSDCReceipt = await publicClient.waitForTransactionReceipt({ hash: vbUSDCHash })
  vbUSDCAddress = vbUSDCReceipt.contractAddress

  if (!vbUSDCAddress) throw new Error('vbUSDC deployment receipt does not contain contractAddress')

  console.log(`vbUSDC deployed: ${vbUSDCAddress}`)
} else {
  console.log(`Using existing vbUSDC: ${vbUSDCAddress}`)
}

let swapHash = null
let swapReceipt = null
let swapAddress = existingSwapAddress

if (!swapAddress) {
  console.log(`Deploying Swap at ${rate.toString()} vbUSDC per zkLTC`)

  swapHash = await walletClient.deployContract({
    abi: Swap.abi,
    bytecode: bytecode(Swap),
    args: [vbUSDCAddress, feeTreasury, rate, parseEther(swapFee)],
  })
  swapReceipt = await publicClient.waitForTransactionReceipt({ hash: swapHash })
  swapAddress = swapReceipt.contractAddress

  if (!swapAddress) throw new Error('Swap deployment receipt does not contain contractAddress')

  console.log(`Swap deployed: ${swapAddress}`)
} else {
  console.log(`Using existing Swap: ${swapAddress}`)
}

console.log(`Approving ${initialTokenLiquidity} vbUSDC for initial liquidity`)

const approveHash = await walletClient.writeContract({
  address: vbUSDCAddress,
  abi: vbUSDC.abi,
  functionName: 'approve',
  args: [swapAddress, parseUnits(initialTokenLiquidity, 6)],
})
await publicClient.waitForTransactionReceipt({ hash: approveHash })

console.log(`Adding liquidity: ${initialTokenLiquidity} vbUSDC / ${initialNativeLiquidity} zkLTC`)

const liquidityHash = await walletClient.writeContract({
  address: swapAddress,
  abi: Swap.abi,
  functionName: 'addLiquidity',
  args: [parseUnits(initialTokenLiquidity, 6)],
  value: parseEther(initialNativeLiquidity),
})
const liquidityReceipt = await publicClient.waitForTransactionReceipt({ hash: liquidityHash })

writeFileSync(
  resolve('deployments-swap.json'),
  `${JSON.stringify({
    chainId: litVM.id,
    vbUSDC: {
      address: vbUSDCAddress,
      treasury: feeTreasury,
      faucetFeeZkLTC: faucetFee,
      claimAmount,
      maxSupply,
      initialOwnerSupply,
      transactionHash: vbUSDCHash,
      blockNumber: vbUSDCReceipt?.blockNumber.toString(),
    },
    swap: {
      address: swapAddress,
      treasury: feeTreasury,
      swapFeeZkLTC: swapFee,
      rateVbUSDCPerZkLTC: rate.toString(),
      initialTokenLiquidity,
      initialNativeLiquidity,
      transactionHash: swapHash,
      blockNumber: swapReceipt?.blockNumber.toString(),
      liquidityTransactionHash: liquidityHash,
      liquidityBlockNumber: liquidityReceipt.blockNumber.toString(),
    },
  }, null, 2)}\n`,
)

updateDeploymentAddress('vbUSDC', vbUSDCAddress)
updateDeploymentAddress('swap', swapAddress)

console.log('Deployment metadata written to deployments-swap.json')
console.log('src/contracts/deployments.ts updated')
