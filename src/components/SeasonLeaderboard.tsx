import React from 'react'
import { useAccount, useBalance, useReadContract, useReadContracts } from 'wagmi'
import { formatEther } from 'viem'
import { Trophy } from 'lucide-react'
import { litVM } from '../wagmi'
import { seasonGameAddress, seasonGameAbi, isSeasonGameDeployed } from '../contracts/SeasonGame'
import { seasonRewardsAddress, seasonRewardsAbi, isSeasonRewardsDeployed } from '../contracts/SeasonRewards'

const ZERO = '0x0000000000000000000000000000000000000000'

function shortAddress(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

function rewardText(value: bigint) {
  if (value === 0n) return '—'
  return `${Number(formatEther(value)).toLocaleString(undefined, { maximumFractionDigits: 6 })} zkLTC`
}

export default function SeasonLeaderboard() {
  const { address } = useAccount()
  const [page, setPage] = React.useState(0)
  const [pageSize, setPageSize] = React.useState(10)

  const { data: seasonCount } = useReadContract({
    abi: seasonGameAbi,
    address: seasonGameAddress,
    functionName: 'getSeasonScoreCount',
    chainId: litVM.id,
    query: { enabled: isSeasonGameDeployed },
  })
  const { data: pageData } = useReadContract({
    abi: seasonGameAbi,
    address: seasonGameAddress,
    functionName: 'getSeasonScorePage',
    args: [BigInt(page * pageSize), BigInt(pageSize)],
    chainId: litVM.id,
    query: { enabled: isSeasonGameDeployed },
  })
  const { data: settled } = useReadContract({
    abi: seasonRewardsAbi,
    address: seasonRewardsAddress,
    functionName: 'settled',
    chainId: litVM.id,
    query: { enabled: isSeasonRewardsDeployed },
  })
  const { data: rewardEndRank } = useReadContract({
    abi: seasonRewardsAbi,
    address: seasonRewardsAddress,
    functionName: 'rewardEndRank',
    chainId: litVM.id,
    query: { enabled: isSeasonRewardsDeployed },
  })
  const { data: rewardsPool } = useReadContract({
    abi: seasonRewardsAbi,
    address: seasonRewardsAddress,
    functionName: 'pool',
    chainId: litVM.id,
    query: { enabled: isSeasonRewardsDeployed },
  })
  // The season treasury EOA is onchain state (SeasonGame.treasury); its balance
  // plus the SeasonRewards balance forms the live pool.
  const { data: seasonTreasury } = useReadContract({ abi: seasonGameAbi, address: seasonGameAddress, functionName: 'treasury', chainId: litVM.id, query: { enabled: isSeasonGameDeployed } })
  const { data: treasuryBalance } = useBalance({
    address: seasonTreasury,
    chainId: litVM.id,
    query: { enabled: !!seasonTreasury },
  })

  const players = pageData ? pageData[0] : []
  const points = pageData ? pageData[1] : []
  const count = seasonCount ? Number(seasonCount) : 0
  const totalPages = Math.max(1, Math.ceil(count / pageSize))

  const currentPool = (treasuryBalance?.value ?? 0n) + (rewardsPool ?? 0n)
  const rewardEnd = rewardEndRank ? Number(rewardEndRank) : 100

  const { data: pageDays } = useReadContracts({
    contracts: players.map(player => ({
      abi: seasonGameAbi,
      address: seasonGameAddress,
      functionName: 'daysPlayed',
      args: [player],
      chainId: litVM.id,
    })),
    query: { enabled: isSeasonGameDeployed && players.length > 0 },
  })
  const { data: pageRewards } = useReadContracts({
    contracts: players.map(player => ({
      abi: seasonRewardsAbi,
      address: seasonRewardsAddress,
      functionName: 'reward',
      args: [player],
      chainId: litVM.id,
    })),
    query: { enabled: isSeasonRewardsDeployed && players.length > 0 },
  })
  const { data: pageClaimed } = useReadContracts({
    contracts: players.map(player => ({
      abi: seasonRewardsAbi,
      address: seasonRewardsAddress,
      functionName: 'claimed',
      args: [player],
      chainId: litVM.id,
    })),
    query: { enabled: isSeasonRewardsDeployed && settled === true && players.length > 0 },
  })
  const { data: pageProjected } = useReadContracts({
    contracts: players.map((_, index) => ({
      abi: seasonRewardsAbi,
      address: seasonRewardsAddress,
      functionName: 'rewardForRank',
      args: [BigInt(page * pageSize + index + 1), currentPool],
      chainId: litVM.id,
    })),
    query: { enabled: isSeasonRewardsDeployed && settled !== true && players.length > 0 },
  })

  const rows = players
    .map((player, index) => ({
      rank: page * pageSize + index + 1,
      player,
      points: points[index] ?? 0n,
      days: pageDays?.[index]?.result ? Number(pageDays[index].result) : 0,
      reward: settled === true
        ? ((pageRewards?.[index]?.result as bigint | undefined) ?? 0n)
        : ((pageProjected?.[index]?.result as bigint | undefined) ?? 0n),
      claimed: pageClaimed?.[index]?.result === true,
      isCurrent: address ? player.toLowerCase() === address.toLowerCase() : false,
    }))
    .filter(row => row.player !== ZERO && row.points > 0n)

  return (
    <div className="leaderboard-card standalone season-leaderboard">
      <div className="leaderboard-header">
        <Trophy size={20} />
        <span>Season 0 Leaderboard</span>
      </div>

      <div className="season-pool-bar">
        <span>Live reward pool</span>
        <strong>{rewardText(currentPool)}</strong>
        <em>{settled === true ? 'Settled' : 'Pre-settle projection'}</em>
      </div>

      <div className="leaderboard-list">
        {rows.length ? rows.map(row => {
          const rankCapped = row.rank <= rewardEnd
          const rewardShown = settled === true ? row.reward : (rankCapped ? row.reward : 0n)

          return (
            <div className={`leaderboard-row season-row ${row.isCurrent ? 'current' : ''}`} key={row.player}>
              <span>#{row.rank}</span>
              <div className="season-row-player">
                <strong>{shortAddress(row.player)}</strong>
                <em className="season-row-meta">{row.points.toString()} pts · {row.days}d</em>
              </div>
              <div className="season-row-reward">
                {settled === true && row.isCurrent && row.reward > 0n ? (
                  <span className={`claim-pill ${row.claimed ? 'claimed' : ''}`}>{row.claimed ? 'Claimed' : 'Claim'}</span>
                ) : null}
                <strong>{settled === true ? rewardText(row.reward) : (rankCapped ? rewardText(rewardShown) : '—')}</strong>
              </div>
            </div>
          )
        }) : (
          <div className="leaderboard-empty">No Season 0 scores yet</div>
        )}
      </div>

      <div className="pagination">
        <button type="button" onClick={() => setPage(page - 1)} disabled={page === 0}>Prev</button>
        <span className="pagination-status">Page {page + 1} / {totalPages}</span>
        <button type="button" onClick={() => setPage(page + 1)} disabled={page + 1 >= totalPages}>Next</button>
        <label className="pagination-size">
          Show
          <select value={pageSize} onChange={e => { setPageSize(Number(e.target.value)); setPage(0) }}>
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </label>
        <span className="pagination-total">{count} players</span>
      </div>

      <p className="season-leaderboard-note">Rewards are paid to the top {rewardEnd} wallets. Before settle the value is a live projection; after settle it shows the fixed claim amount.</p>
    </div>
  )
}
