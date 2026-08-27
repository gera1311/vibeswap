# Season 0 — Vibe Blocks

Season 0 is the first monthly Vibe Blocks competition with a zkLTC reward pool. It is
implemented by three contracts: `SeasonGame` (seasonal ranked runs), `SeasonRewards`
(claim-based payout), and `SeasonNFT` (soulbound "Season 0 Participant" badge).

## Timeline

| Phase | Window |
| --- | --- |
| Season | 2026-09-01 00:00 UTC — 2026-09-30 23:59 UTC |
| Submit grace | +1 day after season end (in-flight runs can finish) |
| Settle | after 2026-09-30 (owner calls `SeasonRewards.settle()`) |
| Claim | until 2026-10-31 23:59 UTC |
| Sweep | after 2026-10-31 (owner sweeps unclaimed to the next season treasury) |

All timestamps are on-chain Unix seconds:

```text
seasonStart    = 1788220800  (2026-09-01 00:00 UTC)
seasonEnd      = 1790812799  (2026-09-30 23:59 UTC)
claimDeadline  = 1793491199  (2026-10-31 23:59 UTC)
mintDeadline   = 1793491199  (2026-10-31 23:59 UTC)
submitGrace    = 86400       (1 day)
```

## Rules

- Entry fee: `0.0051 zkLTC` per ranked run, sent to the Season 0 treasury.
- Each run starts onchain (`startRun`) and the browser score is submitted onchain when the
  run ends (`submitScore`). Season points equal the raw score (`multiplier = 1`).
- Leaderboard ranks by season points (desc). Ties are broken by higher `bestScore`, then
  earlier `firstReachTimestamp`, then lower address.
- `daysPlayed` counts distinct UTC days a wallet submitted at least one score. The
  participant NFT requires `>= 10` days.
- Anti-bot rate limits: max `10` runs per UTC day and a `60` second pause between runs.

## Score Trust Model

Scores are computed in the browser and recorded onchain — this MVP trusts the client for
the score value. For future seasons, add commit/reveal or server-side validation before
large public reward campaigns. The point conversion is isolated in
`SeasonGame.scoreToLeaderboardPoints()` so future scoring rules can change in one place.

## Reward Pool

The pool is the actual balance of the `SeasonRewards` contract at `settle()` time, funded
from the dedicated Season 0 treasury EOA *before* settle. Any announced pool size is
informational only; the onchain balance is authoritative.

The live pool shown on the frontend is `Season0 treasury EOA balance + SeasonRewards.balance`.

## Reward Formula

`P` is the pool in wei. `SeasonRewards.rewardForRank(rank, pool)` is the single source of
truth for both the settle payout and the frontend projection.

- Ranks `1..25`: `amount(i) = P * (54 - 2*i) / 1000`
- Ranks `26..100`: `amount = P / 250` (`0.4%` each)
- Ranks `> 100`: `0`
- Integer-division remainder is added to rank 1.
- Ranks without a participant are not paid; their share stays in the contract and is swept
  later.

### Prize Table (top 25)

| Rank | Share | Rank | Share | Rank | Share |
| --- | --- | --- | --- | --- | --- |
| 1 | 5.2% | 10 | 3.4% | 19 | 1.6% |
| 2 | 5.0% | 11 | 3.2% | 20 | 1.4% |
| 3 | 4.8% | 12 | 3.0% | 21 | 1.2% |
| 4 | 4.6% | 13 | 2.8% | 22 | 1.0% |
| 5 | 4.4% | 14 | 2.6% | 23 | 0.8% |
| 6 | 4.2% | 15 | 2.4% | 24 | 0.6% |
| 7 | 4.0% | 16 | 2.2% | 25 | 0.4% |
| 8 | 3.8% | 17 | 2.0% | | |
| 9 | 3.6% | 18 | 1.8% | | |

Ranks `26..100` each receive `0.4%`.

## Treasury

Season 0 uses a dedicated EOA treasury that is generated separately from the deployer
(`PRIVATE_KEY`). Its private key is the only Season 0 value stored in `.env`
(`SEASON0_TREASURY_PRIVATE_KEY`); the address is derived from it by the scripts and is
exposed onchain via `SeasonGame.treasury()`. It receives entry fees and is the source of
the reward pool. The deployer and the season treasury are different wallets.

## Onchain Transparency

The following are immutable onchain constructor constants (published before the season
starts):

```text
entryFee        = 0.0051 zkLTC
minDaysPlayed   = 10
topTierEnd      = 25
topTierShareBps = 7000  (top 25 = 70%)
rewardEndRank   = 100
maxRunsPerDay   = 10
minRunInterval  = 60 sec
```

## Lifecycle (operator steps)

1. Generate a fresh treasury wallet (see the README).
2. Deploy `SeasonGame` -> `SeasonRewards` -> `SeasonNFT` (in that order).
3. Fund the `SeasonRewards` contract from the treasury EOA before settle.
4. After 2026-09-30, call `SeasonRewards.settle()`.
5. Winners call `claim()` until 2026-10-31.
6. After 2026-10-31, call `SeasonRewards.sweepUnclaimed(nextSeasonTreasury)`.
