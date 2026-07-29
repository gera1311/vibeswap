import React from 'react'
import { Droplets, CheckCircle, Loader, AlertCircle } from 'lucide-react'

interface FaucetPanelProps {
  isConnected: boolean
  address?: string
  onChain: boolean
  onFaucet: () => void
  faucetPending: boolean
  faucetSuccess: boolean
  claimAmount: string
  faucetFee: string
  zkLTCBalance: string
  txUrl?: string
  txError?: string
  lastClaim: number
}

export default function FaucetPanel({ isConnected, onChain, onFaucet, faucetPending, faucetSuccess, claimAmount, faucetFee, zkLTCBalance, txUrl, txError, lastClaim }: FaucetPanelProps) {
  const [now, setNow] = React.useState(Date.now())
  const cooldownMs = 86400000
  const nextClaimAt = lastClaim ? lastClaim + cooldownMs : 0
  const remainingMs = Math.max(0, nextClaimAt - now)
  const canClaim = !lastClaim || remainingMs === 0
  const remainingSeconds = Math.ceil(remainingMs / 1000)
  const hours = Math.floor(remainingSeconds / 3600)
  const minutes = Math.floor((remainingSeconds % 3600) / 60)
  const seconds = remainingSeconds % 60
  const cooldownLabel = [hours, minutes, seconds]
    .map(value => value.toString().padStart(2, '0'))
    .join(':')
  const hasInsufficientFeeBalance = parseFloat(zkLTCBalance.replace(/,/g, '') || '0') < parseFloat(faucetFee || '0')

  React.useEffect(() => {
    if (!lastClaim || canClaim) return

    const interval = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(interval)
  }, [canClaim, lastClaim])

  return (
    <div className="faucet-panel">
      <div className="faucet-card">
        <div className="faucet-icon-wrapper">
          <Droplets size={48} className="faucet-icon" />
        </div>

        <h3 className="faucet-title">vbUSDC Faucet</h3>
        <p className="faucet-desc">Request test vbUSDC tokens to use on LitVM testnet for swaps</p>

        <div className="faucet-input-group">
          <label className="faucet-label">Claim Amount</label>
          <div className="faucet-input-row">
            <input
              type="text"
              className="faucet-input"
              value={`${claimAmount} vbUSDC`}
              readOnly
            />
          </div>
          <div className="faucet-presets">
            <span style={{ fontSize: 12, color: 'var(--text-secondary)', padding: '6px 0' }}>
              {canClaim ? 'Available to claim now' : `Next claim in ${cooldownLabel}`}
            </span>
          </div>
        </div>

        <div className="rate-info">
          <span>Fee</span>
          <span>{faucetFee} zkLTC</span>
        </div>

        {!isConnected ? (
          <div className="faucet-warning">
            <AlertCircle size={16} />
            <span>Connect your wallet to request tokens</span>
          </div>
        ) : !canClaim ? (
          <div className="faucet-warning">
            <AlertCircle size={16} />
            <span>Claim cooldown: {cooldownLabel}</span>
          </div>
        ) : hasInsufficientFeeBalance ? (
          <div className="faucet-warning">
            <AlertCircle size={16} />
            <span>Insufficient zkLTC for faucet fee</span>
          </div>
        ) : (
          <button
            className={`faucet-action-btn ${faucetPending ? 'requesting' : ''} ${faucetSuccess ? 'success' : ''}`}
            onClick={onFaucet}
            disabled={faucetPending || faucetSuccess || !onChain || hasInsufficientFeeBalance}
          >
            {faucetPending ? (
              <><Loader size={18} className="spinner" /> Confirming...</>
            ) : faucetSuccess ? (
              <><CheckCircle size={18} /> Tokens Sent!</>
            ) : (
              <><Droplets size={18} /> Request {claimAmount} vbUSDC</>
            )}
          </button>
        )}

        {faucetSuccess && (
          <div className="faucet-success-msg">
            <CheckCircle size={16} />
            <span>{claimAmount} vbUSDC has been sent to your wallet</span>
          </div>
        )}

        {txUrl && (
          <a className="tx-link" href={txUrl} target="_blank" rel="noreferrer">
            View transaction
          </a>
        )}

        {txError && (
          <div className="faucet-warning">
            <AlertCircle size={16} />
            <span>{txError}</span>
          </div>
        )}

        <div className="faucet-info">
          <p>Tokens are for testnet use only. You can request once every 24 hours.</p>
        </div>
      </div>
    </div>
  )
}
