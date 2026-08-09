# GM

GM is a daily onchain activity mechanic tied to the connected wallet.

Users can press GM once per day and build a streak over time. The frontend reads the current wallet state directly from the GM contract, including streak, total GM count, claimed-today status, and badge progress.

## Current Mechanics

- One GM per wallet per day.
- Current streak is stored onchain.
- Total GM count is stored onchain.
- Badge progress is based on streak milestones.
- GM requires a small zkLTC fee.

## Purpose

GM gives users a simple daily action and a lightweight identity signal inside the Vibeswap arcade.
