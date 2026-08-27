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
  - full onchain best-score and total-score leaderboards with pagination and page-size selection.
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
- Vibe Blocks block achievements:
  - NFT for reaching the 512, 1024, 2048, and legendary 4096 tiles
  - `0.002 zkLTC` mint fee
  - minted automatically during an active ranked run when the tile is reached (once per tier)
  - onchain verification via `VibeGame.maxBlock` and `VibeGame.activeRun`
- Season 0 (seasonal Vibe Blocks competition):
  - seasonal ranked runs against `SeasonGame` (entry fee `0.0051 zkLTC`)
  - season points, `daysPlayed`, and current rank shown in the game
  - season leaderboard with rank / wallet / points / days / live reward per row
  - live reward pool = Season 0 treasury EOA balance + `SeasonRewards` balance
  - claim-based zkLTC rewards (settle -> claim -> sweep lifecycle)
  - reward formula as a single onchain function (`SeasonRewards.rewardForRank`) shared by the projection and payout
  - soulbound "Season 0 Participant" NFT (`VS0`), free mint for `>= 10` days played
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
Game:   0xbbfad21b55b624945d2b3a4e358d5c2e9962f725
NFT:    0xc3e422a3922dab5f1192dc5471892812bb8a2da3
BlockNFT: 0x3c9127210f08599bbbdc20305c8cef6a227dddb7
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
- [contracts/VibeBlockNFT.sol](contracts/VibeBlockNFT.sol)
- [contracts/SeasonGame.sol](contracts/SeasonGame.sol)
- [contracts/SeasonRewards.sol](contracts/SeasonRewards.sol)
- [contracts/SeasonNFT.sol](contracts/SeasonNFT.sol)
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

### Deploy VibeBlockNFT

```bash
npm run deploy:blocknft
```

This deploys the block achievement NFT contract (linked to the current `VibeGame` address), writes `deployments-block-nft.json`, and updates `src/contracts/deployments.ts`. The mint fee defaults to `0.002 zkLTC` (`BLOCK_NFT_MINT_FEE_ZKLTC`) and the treasury falls back to `BLOCK_NFT_TREASURY_ADDRESS`, then `FEE_TREASURY_ADDRESS`, then `GAME_TREASURY_ADDRESS`, then the deployer address.

### Deploy Season 0

Season 0 uses three contracts, deployed in order: `SeasonGame`, then `SeasonRewards`
(linked to the game), then `SeasonNFT` (linked to the game). Full rules, formula, prize
table, and timeline are documented in [docs/economics/season-0.md](docs/economics/season-0.md).

First generate a dedicated Season 0 treasury wallet (separate from the deployer):

```bash
node -e "import('viem/accounts').then(({generatePrivateKey, privateKeyToAccount}) => { const pk = generatePrivateKey(); console.log('SEASON0_TREASURY_ADDRESS=' + privateKeyToAccount(pk).address); console.log('SEASON0_TREASURY_PRIVATE_KEY=' + pk) })"
```

The **only** Season 0 value in `.env` is the private key; the address is derived from it by
the scripts, and the frontend reads it onchain from `SeasonGame.treasury()`:

```env
SEASON0_TREASURY_PRIVATE_KEY=...
```

Fund the derived treasury address with the zkLTC pool.

```bash
npm run deploy:season:game
npm run deploy:season:rewards
npm run deploy:season:nft
```

Each script compiles the contract with `solc`, deploys it with `viem`, writes
`deployments-season0-*.json`, and updates `src/contracts/deployments.ts`
(`seasonGame` / `seasonRewards` / `seasonNft`). `SeasonRewards` and `SeasonNFT` take the
game address from `deployments-season0-game.json` (override with `SEASON0_GAME_ADDRESS` if
needed), so no address variables are required in `.env`.

Season parameters (window, thresholds, fee) are fixed Season 0 defaults inside the deploy
scripts — see [docs/economics/season-0.md](docs/economics/season-0.md) — and can be
overridden via `SEASON0_SEASON_START`, `SEASON0_SEASON_END`, `SEASON0_MIN_DAYS_PLAYED`,
`SEASON0_SUBMIT_GRACE`, `SEASON0_MAX_RUNS_PER_DAY`, `SEASON0_MIN_RUN_INTERVAL`,
`SEASON0_TOP_TIER_END`, `SEASON0_TOP_TIER_SHARE_BPS`, `SEASON0_REWARD_END_RANK`,
`SEASON0_CLAIM_DEADLINE`, `SEASON0_MINT_DEADLINE` if a future season differs.

### Fund the Season 0 Pool

Transfer the pool from the Season 0 treasury EOA into `SeasonRewards` **before** settle.
`SEASON0_TREASURY_PRIVATE_KEY` must be set in `.env`:

```bash
npm run fund:season:rewards -- 10        # sends 10 zkLTC
node scripts/fund-season-rewards.js --all     # sends the treasury's full balance
node scripts/fund-season-rewards.js 10 --yes  # skip the interactive confirmation
```

The recipient comes from `deployments-season0-rewards.json` and the amount from the CLI
argument (or the full balance with `--all`). The pool is the actual `SeasonRewards` balance
at `settle()` time.

### Settle, Claim, Sweep

After the season ends (2026-09-30), the deployer/owner calls `SeasonRewards.settle()` once,
then winners call `claim()` until 2026-10-31. After the deadline, the owner sweeps
unclaimed funds to the next season treasury with `sweepUnclaimed(nextSeasonTreasury)`.

### Migrate Leaderboard

```bash
node scripts/migrate-game.js
```

Redeploying `VibeGame` creates an empty leaderboard. Run this script after a redeploy to copy the previous best-score and total-score results from the legacy contract into the new one (`LEGACY_GAME_ADDRESS` in `.env`, defaults to the previous deployment).

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
- For Season 0: fund `SeasonRewards` before `settle()`, publish the season rules before launch, and keep the Season 0 treasury EOA separate from the deployer.

## Useful Explorer Links

- GM: https://liteforge.explorer.caldera.xyz/address/0x2791bb410616779a2d50bf4a3223afea51c8a656
- GMBadgeNFT: https://liteforge.explorer.caldera.xyz/address/0xc3e422a3922dab5f1192dc5471892812bb8a2da3
- vbUSDC: https://liteforge.explorer.caldera.xyz/address/0x5a9b445e43559c75c7b22befc3d471cc177069cc
- Swap: https://liteforge.explorer.caldera.xyz/address/0x96f48a300bb96f97f639cea3fe10f19ab34a6d7d
- Game: https://liteforge.explorer.caldera.xyz/address/0xbbfad21b55b624945d2b3a4e358d5c2e9962f725
- VibeBlockNFT: https://liteforge.explorer.caldera.xyz/address/0x3c9127210f08599bbbdc20305c8cef6a227dddb7
