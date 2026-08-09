# Roadmap

This roadmap covers the next six months of Vibeswap development. The plan keeps swaps, faucet, and GM as utility modules while making competitive games and seasonal leaderboards the main product.

## Month 1: Ranked Arcade Foundation

- Stabilize Vibe Blocks as the first ranked game.
- Improve leaderboard UX for best score and total score.
- Prepare season rules for monthly competitions.
- Document game entry fee, scoring logic, and reward pool flow.
- Add public docs and social links to the app footer.

## Month 2: Reward Pool Mechanics

- Add a dedicated reward pool model for zkLTC prizes.
- Define how the pool is funded before each season.
- Route a share of game fees toward future rewards.
- Add frontend visibility for current season status, reward pool size, and season dates.
- Prepare payout rules for the top 50 wallets.

## Month 3: Season 1

- Launch the first monthly competitive season.
- Run a top-50 leaderboard campaign.
- Track best score and total score leaderboards separately.
- Publish season rules before launch.
- Publish final winners and distribute zkLTC rewards after the season ends.

## Month 4: New Game Mode

- Add a second ranked game.
- Prioritize a Minesweeper-style game with zkLTC rewards for successful runs.
- Reuse the season and leaderboard infrastructure where possible.
- Add game-specific scoring rules while keeping reward accounting consistent.

## Month 5: Multi-Game Seasons

- Expand seasons to support multiple games.
- Add per-game leaderboards and combined seasonal standings.
- Improve anti-cheat assumptions and score validation.
- Add clearer player stats across games.
- Refine prize distribution based on Season 1 data.

## Month 6: Ecosystem Growth

- Launch another monthly season with improved reward mechanics.
- Add new LitVM ecosystem tokens or partner mechanics where relevant.
- Explore sponsored reward pools and community tournaments.
- Improve docs for builders, players, and ecosystem partners.
- Prepare the next six-month roadmap based on player data and ecosystem feedback.

## Reward Pool Direction

The reward pool should be funded before a season starts, then gradually supported by game fees during the season. This keeps rewards predictable for players while allowing game activity to help sustain future prize pools.

Initial direction:

- One season lasts one calendar month.
- Rewards are distributed to the top 50 wallets.
- The reward pool is denominated in zkLTC.
- Game entry fees are not paid out instantly to winners.
- A portion of fees can be allocated to future season rewards, liquidity, operations, or treasury.

## Scoring Direction

Vibe Blocks currently supports:

- Best Score leaderboard: highest single run.
- Total Score leaderboard: accumulated score across all ranked runs.

Future seasons can adjust point logic through the game contract scoring policy before a new season deployment. This keeps scoring flexible without changing the entire app flow.
