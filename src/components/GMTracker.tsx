import React from 'react'
import { Sparkles, Flame, Gift } from 'lucide-react'

const MILESTONES = [
  { days: 3, label: '3-Day Sun', icon: '🌤️', color: '#fbbf24' },
  { days: 10, label: '10-Day Radiance', icon: '☀️', color: '#f59e0b' },
  { days: 30, label: '30-Day Orbiter', icon: '🌞', color: '#d97706' },
]

interface GMTrackerProps {
  streak: number
  totalGm: number
  gmClaimed: boolean
  onGM: () => void
  gmPulsing: boolean
  onChain: boolean
  gmPending: boolean
  gmFee: string
  txUrl?: string
  txError?: string
  mintedByTier: boolean[]
  mintFee: string
  onMint: (tier: number) => void
  mintPending: boolean
  nftDeployed: boolean
  mintTxUrl?: string
  mintTxError?: string
}

export default function GMTracker({ streak, totalGm, gmClaimed, onGM, gmPulsing, onChain, gmPending, gmFee, txUrl, txError, mintedByTier, mintFee, onMint, mintPending, nftDeployed, mintTxUrl, mintTxError }: GMTrackerProps) {
  const nextMilestone = MILESTONES.find(m => streak < m.days)
  const progress = nextMilestone ? (streak / nextMilestone.days) * 100 : 100
  const allComplete = streak >= 30

  const reachedTier = streak >= 30 ? 3 : streak >= 10 ? 2 : streak >= 3 ? 1 : 0
  let mintableTier = 0
  for (let t = reachedTier; t >= 1; t--) {
    if (!mintedByTier[t]) {
      mintableTier = t
      break
    }
  }
  const allMinted = reachedTier > 0 && mintableTier === 0

  return (
    <div className="gm-tracker">
      <div className="gm-tracker-card">
        <div className="gm-streak-display">
          <div className="streak-ring">
            <Flame size={32} className="streak-icon" />
            <span className="streak-number">{streak}</span>
            <span className="streak-label">day streak</span>
          </div>
        </div>

        <div className="gm-streak-display" style={{ marginTop: -16 }}>
          <span style={{ fontSize: 14, color: 'var(--text-secondary)' }}>Total GM: {totalGm}</span>
        </div>
        <div className="gm-streak-display" style={{ marginTop: -10 }}>
          <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>GM fee: {gmFee} zkLTC</span>
        </div>

        <div className="gm-progress-section">
          <div className="progress-header">
            <span className="progress-title">
              {allComplete ? 'All badges earned!' : `Next badge: ${nextMilestone?.label}`}
            </span>
            <span className="progress-count">{streak}/{nextMilestone?.days || 30}</span>
          </div>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${progress}%` }} />
          </div>
          <div className="milestone-dots">
            {MILESTONES.map((m, i) => (
              <div
                key={m.days}
                className={`milestone-dot ${streak >= m.days ? 'earned' : ''} ${nextMilestone?.days === m.days ? 'current' : ''}`}
                style={{ '--dot-color': m.color } as React.CSSProperties}
              >
                <span className="milestone-icon">{m.icon}</span>
                <span className="milestone-label">{m.days}d</span>
              </div>
            ))}
          </div>
        </div>

        <button
          className={`gm-action-btn ${gmPulsing ? 'pulsing' : ''} ${gmClaimed ? 'claimed' : ''}`}
          onClick={onGM}
          disabled={gmClaimed || !onChain || gmPending}
        >
          <Sparkles size={20} />
          <span>{gmClaimed ? "Today's GM claimed!" : gmPending ? 'Confirming...' : 'Say GM Today'}</span>
        </button>

        {nftDeployed && mintableTier > 0 && (
          <button
            className="gm-mint-btn"
            onClick={() => onMint(mintableTier)}
            disabled={!onChain || mintPending}
          >
            <Gift size={18} />
            <span>{mintPending ? 'Minting...' : `Mint ${MILESTONES[mintableTier - 1].label} NFT · ${mintFee} zkLTC`}</span>
          </button>
        )}

        {nftDeployed && allMinted && (
          <div className="gm-minted-note">
            <Gift size={16} />
            <span>Badges minted</span>
          </div>
        )}

        {mintTxUrl && (
          <a className="tx-link" href={mintTxUrl} target="_blank" rel="noreferrer">
            View mint transaction
          </a>
        )}

        {mintTxError && (
          <div className="faucet-warning">
            <span>{mintTxError}</span>
          </div>
        )}

        {txUrl && (
          <a className="tx-link" href={txUrl} target="_blank" rel="noreferrer">
            View transaction
          </a>
        )}

        {txError && (
          <div className="faucet-warning">
            <span>{txError}</span>
          </div>
        )}
      </div>
    </div>
  )
}
