import React, { useState, useEffect } from 'react'
import { Gift, Lock, Sparkles, Check, Users } from 'lucide-react'

const BADGE_DATA = [
  {
    id: '3day',
    tier: 1,
    name: '3-Day Sun',
    description: 'First light — 3 daily GMs',
    icon: '🌤️',
    color: '#fbbf24',
    gradient: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
    days: 3,
  },
  {
    id: '10day',
    tier: 2,
    name: '10-Day Radiance',
    description: 'Radiant energy — 10 daily GMs',
    icon: '☀️',
    color: '#f59e0b',
    gradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
    days: 10,
  },
  {
    id: '30day',
    tier: 3,
    name: '30-Day Orbiter',
    description: 'Solar mastery — 30 daily GMs',
    icon: '🌞',
    color: '#d97706',
    gradient: 'linear-gradient(135deg, #d97706 0%, #b45309 100%)',
    days: 30,
  },
]

interface NFTGalleryProps {
  claimedBadges: string[]
  mintedByTier: boolean[]
  holdersByTier: number[]
  mintFee: string
  onMint: (tier: number) => void
  mintPending: boolean
  nftDeployed: boolean
  onChain: boolean
  txUrl?: string
  txError?: string
}

export default function NFTGallery({ claimedBadges, mintedByTier, holdersByTier, mintFee, onMint, mintPending, nftDeployed, onChain, txUrl, txError }: NFTGalleryProps) {
  const [unlocking, setUnlocking] = useState<string | null>(null)

  useEffect(() => {
    const lastClaimed = claimedBadges[claimedBadges.length - 1]
    if (lastClaimed) {
      setUnlocking(lastClaimed)
      const timer = setTimeout(() => setUnlocking(null), 2000)
      return () => clearTimeout(timer)
    }
  }, [claimedBadges])

  return (
    <div className="nft-gallery">
      <div className="badge-grid">
        {BADGE_DATA.map(badge => {
          const earned = claimedBadges.includes(badge.id)
          const minted = mintedByTier[badge.tier] === true
          const isUnlocking = unlocking === badge.id
          const holders = holdersByTier[badge.tier] ?? 0

          return (
            <div
              key={badge.id}
              className={`badge-card ${earned ? 'earned' : 'locked'} ${isUnlocking ? 'unlocking' : ''}`}
            >
              <div className="badge-foil" style={{ background: badge.gradient }} />
              <div className="badge-inner">
                <div className="badge-icon-wrapper">
                  <span className="badge-icon">{badge.icon}</span>
                  {!earned && <Lock size={24} className="lock-icon" />}
                </div>
                <h3 className="badge-name">{badge.name}</h3>
                <p className="badge-desc">{badge.description}</p>

                {minted ? (
                  <div className="badge-earned-badge badge-minted">
                    <Check size={14} />
                    <span>Minted</span>
                  </div>
                ) : earned && nftDeployed ? (
                  <button
                    className="badge-mint-btn"
                    onClick={() => onMint(badge.tier)}
                    disabled={!onChain || mintPending}
                  >
                    <Sparkles size={14} />
                    <span>{mintPending ? 'Minting...' : `Mint · ${mintFee} zkLTC`}</span>
                  </button>
                ) : earned ? (
                  <div className="badge-earned-badge">
                    <Sparkles size={14} />
                    <span>Earned</span>
                  </div>
                ) : (
                  <div className="badge-requirement">
                    <span>{badge.days} day streak</span>
                  </div>
                )}

                {nftDeployed && (
                  <div className="badge-holders">
                    <Users size={14} />
                    <span>{holders} holder{holders === 1 ? '' : 's'}</span>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

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
  )
}
