import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createPublicClient, formatEther, formatUnits, http, parseAbi } from 'viem'

function loadDeploymentAddress(key) {
  const deployments = readFileSync(resolve('src/contracts/deployments.ts'), 'utf8')
  const match = deployments.match(new RegExp(`${key}:\\s*'(0x[a-fA-F0-9]{40})'`))

  if (!match) throw new Error(`Could not find ${key} in src/contracts/deployments.ts`)

  return match[1]
}

const rpcUrl = process.env.LITVM_RPC_URL || 'https://liteforge.rpc.caldera.xyz/http'
const swapAddress = loadDeploymentAddress('swap')
const client = createPublicClient({ transport: http(rpcUrl) })
const abi = parseAbi([
  'function getRate() view returns (uint256)',
  'function getVbUSDCReserve() view returns (uint256)',
  'function getZkLTCReserve() view returns (uint256)',
  'function swapFee() view returns (uint256)',
])

const [rate, vbUSDCReserve, zkLTCReserve, swapFee] = await Promise.all([
  client.readContract({ address: swapAddress, abi, functionName: 'getRate' }),
  client.readContract({ address: swapAddress, abi, functionName: 'getVbUSDCReserve' }),
  client.readContract({ address: swapAddress, abi, functionName: 'getZkLTCReserve' }),
  client.readContract({ address: swapAddress, abi, functionName: 'swapFee' }),
])

console.log(`Swap: ${swapAddress}`)
console.log(`Rate: ${rate.toString()} vbUSDC / zkLTC`)
console.log(`Swap fee: ${formatEther(swapFee)} zkLTC`)
console.log(`vbUSDC reserve: ${formatUnits(vbUSDCReserve, 6)}`)
console.log(`zkLTC reserve: ${formatEther(zkLTCReserve)}`)
