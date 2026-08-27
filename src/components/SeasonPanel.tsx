import React from 'react'
import { useAccount, useBalance, useBlock, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { formatEther } from 'viem'
import { CalendarDays, ExternalLink, Gift, Sparkles, Trophy, Wallet, Check, Lock } from 'lucide-react'
import { litVM } from '../wagmi'
import { seasonGameAddress, seasonGameAbi, isSeasonGameDeployed } from '../contracts/SeasonGame'
import { seasonRewardsAddress, seasonRewardsAbi, isSeasonRewardsDeployed } from '../contracts/SeasonRewards'
import { seasonNFTAddress, seasonNFTAbi, isSeasonNFTDeployed } from '../contracts/SeasonNFT'

const explorerBase = litVM.blockExplorers?.default.url.replace(/\/$/, '')

function formatDate(ts: number) {
  return new Date(ts * 1000).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

function rewardText(value: bigint) {
  if (value === 0n) return '0 zkLTC'
  return `${Number(formatEther(value)).toLocaleString(undefined, { maximumFractionDigits: 6 })} zkLTC`
}

function txErrorMessage(error?: (Error & { shortMessage?: string }) | null) {
  if (!error) return undefined

  const message = error.message.toLowerCase()

  if (message.includes('user rejected') || message.includes('user denied') || message.includes('rejected the request')) {
    return 'Transaction rejected in wallet.'
  }
  if (message.includes('not settled')) {
    return 'Rewards are not settled yet.'
  }
  if (message.includes('no reward')) {
    return 'No reward for this wallet.'
  }
  if (message.includes('already claimed')) {
    return 'You already claimed your reward.'
  }
  if (message.includes('claim deadline passed')) {
    return 'The claim deadline has passed.'
  }
  if (message.includes('not enough days')) {
    return 'Play more days to unlock this badge.'
  }
  if (message.includes('mint deadline passed')) {
    return 'The mint deadline has passed.'
  }
  if (message.includes('already minted')) {
    return 'You already minted this badge.'
  }
  if (message.includes('exceeds the balance') || message.includes('insufficient funds')) {
    return 'Insufficient zkLTC for gas.'
  }

  return error.shortMessage || error.message.split('\n')[0]
}

export default function SeasonPanel() {
  const { address, isConnected, chainId } = useAccount()
  const onChain = isConnected && chainId === litVM.id

  const { data: block } = useBlock({ chainId: litVM.id, watch: true })
  const now = block?.timestamp ? Number(block.timestamp) : Math.floor(Date.now() / 1000)

  const { data: seasonStart } = useReadContract({ abi: seasonGameAbi, address: seasonGameAddress, functionName: 'seasonStart', chainId: litVM.id, query: { enabled: isSeasonGameDeployed } })
  const { data: seasonEnd } = useReadContract({ abi: seasonGameAbi, address: seasonGameAddress, functionName: 'seasonEnd', chainId: litVM.id, query: { enabled: isSeasonGameDeployed } })
  const { data: seasonMinDays } = useReadContract({ abi: seasonGameAbi, address: seasonGameAddress, functionName: 'minDaysPlayed', chainId: litVM.id, query: { enabled: isSeasonGameDeployed } })
  const { data: entryFee } = useReadContract({ abi: seasonGameAbi, address: seasonGameAddress, functionName: 'entryFee', chainId: litVM.id, query: { enabled: isSeasonGameDeployed } })

  const { data: claimDeadline } = useReadContract({ abi: seasonRewardsAbi, address: seasonRewardsAddress, functionName: 'claimDeadline', chainId: litVM.id, query: { enabled: isSeasonRewardsDeployed } })
  const { data: settled } = useReadContract({ abi: seasonRewardsAbi, address: seasonRewardsAddress, functionName: 'settled', chainId: litVM.id, query: { enabled: isSeasonRewardsDeployed } })
  const { data: rewardEndRank } = useReadContract({ abi: seasonRewardsAbi, address: seasonRewardsAddress, functionName: 'rewardEndRank', chainId: litVM.id, query: { enabled: isSeasonRewardsDeployed } })
  const { data: rewardsPool } = useReadContract({ abi: seasonRewardsAbi, address: seasonRewardsAddress, functionName: 'pool', chainId: litVM.id, query: { enabled: isSeasonRewardsDeployed } })
  const { data: myReward, refetch: refetchReward } = useReadContract({ abi: seasonRewardsAbi, address: seasonRewardsAddress, functionName: 'reward', args: [address!], chainId: litVM.id, query: { enabled: isSeasonRewardsDeployed && !!address } })
  const { data: myClaimed, refetch: refetchClaimed } = useReadContract({ abi: seasonRewardsAbi, address: seasonRewardsAddress, functionName: 'claimed', args: [address!], chainId: litVM.id, query: { enabled: isSeasonRewardsDeployed && !!address } })

  const { data: myRank, refetch: refetchRank } = useReadContract({ abi: seasonGameAbi, address: seasonGameAddress, functionName: 'getRank', args: [address!], chainId: litVM.id, query: { enabled: isSeasonGameDeployed && !!address } })
  const { data: myDays, refetch: refetchDays } = useReadContract({ abi: seasonGameAbi, address: seasonGameAddress, functionName: 'daysPlayed', args: [address!], chainId: litVM.id, query: { enabled: isSeasonGameDeployed && !!address } })

  const { data: nftMinted, refetch: refetchNftMinted } = useReadContract({ abi: seasonNFTAbi, address: seasonNFTAddress, functionName: 'hasMinted', args: [address!], chainId: litVM.id, query: { enabled: isSeasonNFTDeployed && !!address } })
  const { data: nftMintDeadline } = useReadContract({ abi: seasonNFTAbi, address: seasonNFTAddress, functionName: 'mintDeadline', chainId: litVM.id, query: { enabled: isSeasonNFTDeployed } })
  const { data: nftTotalSupply } = useReadContract({ abi: seasonNFTAbi, address: seasonNFTAddress, functionName: 'totalSupply', chainId: litVM.id, query: { enabled: isSeasonNFTDeployed } })

  // The season treasury EOA is onchain state (SeasonGame.treasury), so no env
  // address is needed — its balance is part of the live reward pool.
  const { data: seasonTreasury } = useReadContract({ abi: seasonGameAbi, address: seasonGameAddress, functionName: 'treasury', chainId: litVM.id, query: { enabled: isSeasonGameDeployed } })
  const { data: treasuryBalance, refetch: refetchTreasury } = useBalance({
    address: seasonTreasury,
    chainId: litVM.id,
    query: { enabled: !!seasonTreasury },
  })

  const { writeContract: writeClaim, data: claimHash, isPending: claimPending, error: claimError, reset: resetClaim } = useWriteContract()
  const { writeContract: writeMint, data: mintHash, isPending: mintPending, error: mintError, reset: resetMint } = useWriteContract()
  const { isLoading: claimConfirming, isSuccess: claimSuccess } = useWaitForTransactionReceipt({ hash: claimHash, chainId: litVM.id })
  const { isLoading: mintConfirming, isSuccess: mintSuccess } = useWaitForTransactionReceipt({ hash: mintHash, chainId: litVM.id })

  React.useEffect(() => {
    if (!claimSuccess && !mintSuccess) return

    void Promise.all([refetchReward(), refetchClaimed(), refetchRank(), refetchDays(), refetchNftMinted(), refetchTreasury()])

    const timeout = window.setTimeout(() => {
      resetClaim()
      resetMint()
    }, 2500)
    return () => window.clearTimeout(timeout)
  }, [claimSuccess, mintSuccess, refetchClaimed, refetchDays, refetchNftMinted, refetchRank, refetchReward, refetchTreasury, resetClaim, resetMint])

  const pool = (treasuryBalance?.value ?? 0n) + (rewardsPool ?? 0n)
  const minDays = seasonMinDays ? Number(seasonMinDays) : 10
  const rewardEnd = rewardEndRank ? Number(rewardEndRank) : 100
  const deadline = claimDeadline ? Number(claimDeadline) : 0
  const nftDeadline = nftMintDeadline ? Number(nftMintDeadline) : 0
  const days = myDays ? Number(myDays) : 0
  const rank = myRank ? Number(myRank) : 0
  const rewardValue = myReward ?? 0n
  const claimed = myClaimed === true
  const minted = nftMinted === true

  const claimState: 'awaiting' | 'claimable' | 'claimed' | 'none' | 'deadline' = !settled
    ? 'awaiting'
    : claimed
      ? 'claimed'
      : rewardValue === 0n
        ? 'none'
        : deadline > 0 && now > deadline
          ? 'deadline'
          : 'claimable'

  const nftEligible = days >= minDays
  const nftState: 'minted' | 'notEnough' | 'deadline' | 'eligible' = minted
    ? 'minted'
    : !nftEligible
      ? 'notEnough'
      : nftDeadline > 0 && now > nftDeadline
        ? 'deadline'
        : 'eligible'

  const handleClaim = () => {
    if (!isSeasonRewardsDeployed || !onChain || claimState !== 'claimable' || claimPending || claimConfirming) return
    writeClaim({ abi: seasonRewardsAbi, address: seasonRewardsAddress, functionName: 'claim', args: [] })
  }

  const handleMint = () => {
    if (!isSeasonNFTDeployed || !onChain || nftState !== 'eligible' || mintPending || mintConfirming) return
    writeMint({ abi: seasonNFTAbi, address: seasonNFTAddress, functionName: 'mint', args: [] })
  }

  const error = txErrorMessage(claimError || mintError)

  const topTiers = Array.from({ length: 25 }, (_, i) => ({ rank: i + 1, percent: (54 - 2 * (i + 1)) / 10 }))

  return (
    <div className="season-page">
      <div className="season-overview-grid">
        <div className="season-card season-pool-card">
          <div className="season-card-title">
            <Wallet size={18} />
            <span>Season 0 Reward Pool</span>
          </div>
          <div className="season-pool-value">{rewardText(pool)}</div>
          <p className="season-card-sub">Treasury EOA + SeasonRewards balance. Final pool is locked at settle.</p>
          {seasonTreasury && (
            <a className="tx-link" href={`${explorerBase}/address/${seasonTreasury}`} target="_blank" rel="noreferrer">
              <ExternalLink size={13} />
              <span>View season treasury</span>
            </a>
          )}
        </div>

        <div className="season-card">
          <div className="season-card-title">
            <CalendarDays size={18} />
            <span>Schedule</span>
          </div>
          <ul className="season-schedule">
            <li><span>Season</span><strong>{seasonStart ? formatDate(Number(seasonStart)) : '—'} – {seasonEnd ? formatDate(Number(seasonEnd)) : '—'}</strong></li>
            <li><span>Entry fee</span><strong>{entryFee ? formatEther(entryFee) : '—'} zkLTC</strong></li>
            <li><span>Days threshold</span><strong>{minDays}+ days</strong></li>
            <li><span>Rewards</span><strong>Top {rewardEnd}</strong></li>
            <li><span>Settle</span><strong>after season end</strong></li>
            <li><span>Claim until</span><strong>{deadline ? formatDate(deadline) : '—'}</strong></li>
          </ul>
        </div>

        <div className="season-card">
          <div className="season-card-title">
            <Trophy size={18} />
            <span>Prize Table</span>
          </div>
          <div className="season-prize-grid">
            {topTiers.map(tier => (
              <div className="season-prize" key={tier.rank}>
                <span>#{tier.rank}</span>
                <strong>{tier.percent.toFixed(1)}%</strong>
              </div>
            ))}
          </div>
          <p className="season-card-sub">Ranks 26–{rewardEnd}: 0.4% each. Remainder from integer division goes to rank 1.</p>
        </div>
      </div>

      <div className="season-claim-grid">
        <div className="season-card season-claim-card">
          <div className="season-card-title">
            <Trophy size={18} />
            <span>Your Reward</span>
          </div>
          <div className="season-mystats">
            <div className="season-mystat"><span>Rank</span><strong>{rank > 0 ? `#${rank}` : '—'}</strong></div>
            <div className="season-mystat"><span>Reward</span><strong>{rewardText(rewardValue)}</strong></div>
            <div className="season-mystat"><span>Days</span><strong>{days}</strong></div>
          </div>

          {!isConnected ? (
            <button className="game-action" disabled>Connect wallet to claim</button>
          ) : claimState === 'awaiting' ? (
            <button className="game-action" disabled>Awaiting settle</button>
          ) : claimState === 'claimed' ? (
            <div className="season-claimed-badge"><Check size={16} /><span>Claimed</span></div>
          ) : claimState === 'none' ? (
            <button className="game-action" disabled>No reward</button>
          ) : claimState === 'deadline' ? (
            <button className="game-action" disabled>Claim deadline passed</button>
          ) : (
            <button className="game-action" onClick={handleClaim} disabled={!onChain || claimPending || claimConfirming}>
              {claimPending || claimConfirming ? 'Claiming...' : `Claim ${rewardText(rewardValue)}`}
            </button>
          )}

          {claimHash && (
            <a className="tx-link" href={`${explorerBase}/tx/${claimHash}`} target="_blank" rel="noreferrer">View claim transaction</a>
          )}
        </div>

        <div className="season-card season-nft-card">
          <div className="season-card-title">
            <Gift size={18} />
            <span>Season 0 Participant NFT</span>
          </div>
          <div className="season-nft-visual">
            <div className="season-nft-badge"><Sparkles size={28} /></div>
            <div>
              <h4>VS0 · Soulbound</h4>
              <p>Free mint for wallets that played {minDays}+ days in Season 0.</p>
            </div>
          </div>

          {minted ? (
            <div className="season-claimed-badge"><Check size={16} /><span>Minted</span></div>
          ) : nftState === 'notEnough' ? (
            <button className="game-action" disabled>Play more days ({days}/{minDays})</button>
          ) : nftState === 'deadline' ? (
            <button className="game-action" disabled>Mint deadline passed</button>
          ) : (
            <button className="game-action" onClick={handleMint} disabled={!onChain || mintPending || mintConfirming || !isSeasonNFTDeployed}>
              {mintPending || mintConfirming ? 'Minting...' : 'Mint Participant NFT'}
            </button>
          )}

          {isSeasonNFTDeployed && (
            <p className="season-card-sub">{nftTotalSupply ? Number(nftTotalSupply) : 0} minted</p>
          )}

          {mintHash && (
            <a className="tx-link" href={`${explorerBase}/tx/${mintHash}`} target="_blank" rel="noreferrer">View mint transaction</a>
          )}
        </div>
      </div>

      {error && <div className="swap-warning">{error}</div>}

      {!isSeasonGameDeployed && (
        <div className="game-notice">
          <Lock size={16} />
          Season 0 contracts are not deployed yet.
        </div>
      )}
    </div>
  )
}
