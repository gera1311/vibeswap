# Vibeswap

Vibeswap is a LitVM LiteForge DeFi testnet app with token swaps, a paid faucet, daily GM streaks, and badge progress.

## Features

- Wallet connection through `wagmi` injected wallet connector.
- LitVM LiteForge network support, including add/switch network actions.
- Native `zkLTC` balance display.
- `vbUSDC` faucet:
  - `0.5 vbUSDC` per claim.
  - 24 hour cooldown per wallet.
  - Live `HH:MM:SS` cooldown timer.
  - `0.0002 zkLTC` faucet fee.
- Two-way fixed-rate swap:
  - `vbUSDC -> zkLTC`
  - `zkLTC -> vbUSDC`
  - rate: `1000 vbUSDC / 1 zkLTC`
  - `0.0002 zkLTC` swap fee
  - ERC20 `approve -> swap` flow for `vbUSDC -> zkLTC`
  - frontend checks for insufficient balance and pool liquidity before sending transactions
- GM tracker:
  - daily GM by connected wallet
  - streak, total GM, claimed-today state
  - badge progress at 3, 10, and 30 days
- Transaction states:
  - pending, confirming, success
  - readable error messages
  - explorer links for submitted transactions
- Reserve monitoring CLI for the swap pool.

## Network

The app targets LitVM LiteForge.

```text
Chain ID: 4441
Native token: zkLTC
RPC: https://liteforge.rpc.caldera.xyz/http
Explorer: https://liteforge.explorer.caldera.xyz
```

Current deployed contracts are defined in [src/contracts/deployments.ts](src/contracts/deployments.ts).

```text
GM:     0x2791bb410616779a2d50bf4a3223afea51c8a656
vbUSDC: 0x5a9b445e43559c75c7b22befc3d471cc177069cc
Swap:   0x96f48a300bb96f97f639cea3fe10f19ab34a6d7d
```

## Requirements

- Node.js 20+
- npm
- EVM wallet with LitVM LiteForge configured
- `zkLTC` for gas and app fees

## Install

```bash
npm install
```

## Run Locally

```bash
npm run dev
```

Then open the Vite local URL, usually:

```text
http://localhost:5173
```

If the port is busy, Vite will print the actual URL.

## Build

```bash
npm run build
```

Preview the production build:

```bash
npm run preview
```

## Environment

Copy the example env file:

```bash
cp .env.example .env
```

Fill values as needed:

```bash
PRIVATE_KEY=
LITVM_RPC_URL=https://liteforge.rpc.caldera.xyz/http
GM_TREASURY_ADDRESS=
GM_FEE_ZKLTC=0.0001
FEE_TREASURY_ADDRESS=
FAUCET_FEE_ZKLTC=0.0002
VBUSDC_CLAIM_AMOUNT=0.5
VBUSDC_MAX_SUPPLY=10000000
VBUSDC_INITIAL_OWNER_SUPPLY=1000000
SWAP_FEE_ZKLTC=0.0002
SWAP_RATE_VBUSDC_PER_ZKLTC=1000
SWAP_INITIAL_VBUSDC_LIQUIDITY=100
SWAP_INITIAL_ZKLTC_LIQUIDITY=0.1
EXISTING_VBUSDC_ADDRESS=
EXISTING_SWAP_ADDRESS=
```

Never commit `.env` or private keys.

## Contracts

Solidity contracts live in [contracts](contracts).

- [contracts/GM.sol](contracts/GM.sol)
- [contracts/vbUSDC.sol](contracts/vbUSDC.sol)
- [contracts/Swap.sol](contracts/Swap.sol)

Deploy scripts compile contracts with `solc` directly and use `viem` for deployment.

### Deploy GM

```bash
npm run deploy:gm
```

This deploys a new GM contract and updates `src/contracts/deployments.ts`.

### Deploy vbUSDC and Swap

```bash
npm run deploy:swap
```

This deploys a new `vbUSDC`, deploys a new `Swap`, adds initial liquidity, writes `deployments-swap.json`, and updates `src/contracts/deployments.ts`.

### Deploy Swap With Existing vbUSDC

```bash
npm run deploy:swap:reuse-token
```

This reuses the current `vbUSDC` from `deployments-swap.json`, deploys a new `Swap`, adds liquidity, and updates `src/contracts/deployments.ts`.

Use this when only the swap logic changes and the token/faucet contract should stay the same.

## Monitor Reserves

```bash
npm run monitor:reserves
```

Example output:

```text
Swap: 0x96f48a300bb96f97f639cea3fe10f19ab34a6d7d
Rate: 1000 vbUSDC / zkLTC
Swap fee: 0.0002 zkLTC
vbUSDC reserve: 90
zkLTC reserve: 0.11
```

## Production Checklist

- Confirm all addresses in `src/contracts/deployments.ts`.
- Confirm `npm run build` passes.
- Confirm `npm run monitor:reserves` returns expected reserves.
- Verify contract source code in the LitVM explorer if explorer verification is available.
- Keep enough `zkLTC` liquidity in the swap pool for expected swap volume.
- Keep treasury/deployer private keys outside git.

## Useful Explorer Links

- GM: https://liteforge.explorer.caldera.xyz/address/0x2791bb410616779a2d50bf4a3223afea51c8a656
- vbUSDC: https://liteforge.explorer.caldera.xyz/address/0x5a9b445e43559c75c7b22befc3d471cc177069cc
- Swap: https://liteforge.explorer.caldera.xyz/address/0x96f48a300bb96f97f639cea3fe10f19ab34a6d7d
