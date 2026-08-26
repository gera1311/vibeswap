# Vibeswap

Vibeswap is a LitVM LiteForge onchain arcade with ranked games, token swaps, a paid faucet, daily GM streaks, and badge progress.

## Features

- Wallet connection through `wagmi` injected wallet connector.
- LitVM LiteForge network support, including add/switch network actions.
- Native `zkLTC` balance display.
- Vibe Blocks game:
  - 2048-style casual puzzle game.
  - ranked mode with `0.0051 zkLTC` entry fee.
  - game starts as soon as the start transaction is submitted.
  - score is submitted automatically when the run ends.
  - onchain score submission.
  - top-10 best-score and total-score onchain leaderboards.
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
- GM badge NFTs:
  - mint an NFT badge for each reached streak milestone (3, 10, and 30 days)
  - `0.005 zkLTC` mint fee
  - onchain streak verification (the NFT contract reads `GM.getStreak`)
  - one mint per tier per wallet, soulbound (non-transferable)
  - displays minted status and holder count per badge
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
Game:   0xf9d45161cf58b56ea14d65cb38b1a47056b3e766
NFT:    0xc3e422a3922dab5f1192dc5471892812bb8a2da3
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

Never commit `.env` or private keys.

## Contracts

Solidity contracts live in [contracts](contracts).

- [contracts/GM.sol](contracts/GM.sol)
- [contracts/GMBadgeNFT.sol](contracts/GMBadgeNFT.sol)
- [contracts/VibeGame.sol](contracts/VibeGame.sol)
- [contracts/vbUSDC.sol](contracts/vbUSDC.sol)
- [contracts/Swap.sol](contracts/Swap.sol)

Deploy scripts compile contracts with `solc` directly and use `viem` for deployment.

### Deploy GM

```bash
npm run deploy:gm
```

This deploys a new GM contract and updates `src/contracts/deployments.ts`.

### Deploy VibeGame

```bash
npm run deploy:game
```

This deploys the ranked game contract and updates `src/contracts/deployments.ts`.

### Deploy GMBadgeNFT

```bash
npm run deploy:nft
```

This deploys the GM badge NFT contract (linked to the current `GM` address), writes `deployments-nft.json`, and updates `src/contracts/deployments.ts`. The mint fee defaults to `0.005 zkLTC` (`NFT_MINT_FEE_ZKLTC`) and the treasury falls back to `NFT_TREASURY_ADDRESS`, then `FEE_TREASURY_ADDRESS`, then `GM_TREASURY_ADDRESS`, then the deployer address.

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
- Keep game score verification in mind before larger public reward campaigns. The MVP records scores onchain after a browser run; future anti-cheat can add commit/reveal or server-side validation.
- Game leaderboard points are isolated in `scoreToLeaderboardPoints()` inside `VibeGame`, so future seasonal scoring rules can be adjusted in one place before a new season deployment.

## Useful Explorer Links

- GM: https://liteforge.explorer.caldera.xyz/address/0x2791bb410616779a2d50bf4a3223afea51c8a656
- GMBadgeNFT: https://liteforge.explorer.caldera.xyz/address/0xc3e422a3922dab5f1192dc5471892812bb8a2da3
- vbUSDC: https://liteforge.explorer.caldera.xyz/address/0x5a9b445e43559c75c7b22befc3d471cc177069cc
- Swap: https://liteforge.explorer.caldera.xyz/address/0x96f48a300bb96f97f639cea3fe10f19ab34a6d7d
- Game: https://liteforge.explorer.caldera.xyz/address/0xf9d45161cf58b56ea14d65cb38b1a47056b3e766
