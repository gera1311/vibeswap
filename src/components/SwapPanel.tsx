import React, { useState } from 'react'
import { ArrowRightLeft, Wallet } from 'lucide-react'

export type SwapDirection = 'vbUSDC_TO_ZKLTC' | 'ZKLTC_TO_VBUSDC'

interface SwapPanelProps {
  isConnected: boolean
  wrongNetwork: boolean
  onChain: boolean
  vbUSDCBalance: string
  swapRate: number
  onSwap: (amount: string, direction: SwapDirection) => void
  swapPending: boolean
  swapSuccess: boolean
  vbUSDCReserve: string
  zkLTCReserve: string
  zkLTCBalance: string
  swapFee: string
  txUrl?: string
  txError?: string
}

export default function SwapPanel({
  isConnected,
  wrongNetwork,
  onChain,
  vbUSDCBalance,
  swapRate,
  onSwap,
  swapPending,
  swapSuccess,
  vbUSDCReserve,
  zkLTCReserve,
  zkLTCBalance,
  swapFee,
  txUrl,
  txError,
}: SwapPanelProps) {
  const [fromAmount, setFromAmount] = useState('')
  const [direction, setDirection] = useState<SwapDirection>('vbUSDC_TO_ZKLTC')

  const isVbUSDCInput = direction === 'vbUSDC_TO_ZKLTC'
  const fromToken = isVbUSDCInput
    ? { icon: '💵', symbol: 'vbUSDC', balance: vbUSDCBalance }
    : { icon: '⚡', symbol: 'zkLTC', balance: zkLTCBalance }
  const toToken = isVbUSDCInput
    ? { icon: '⚡', symbol: 'zkLTC', balance: zkLTCBalance }
    : { icon: '💵', symbol: 'vbUSDC', balance: vbUSDCBalance }
  const parsedFromAmount = parseFloat(fromAmount)
  const vbUSDCBalanceNum = parseFloat(vbUSDCBalance || '0')
  const zkLTCBalanceNum = parseFloat(zkLTCBalance.replace(/,/g, '') || '0')
  const vbUSDCReserveNum = parseFloat(vbUSDCReserve || '0')
  const zkLTCReserveNum = parseFloat(zkLTCReserve || '0')
  const swapFeeNum = parseFloat(swapFee || '0')
  const toAmount = fromAmount && swapRate > 0
    ? (isVbUSDCInput ? parsedFromAmount / swapRate : parsedFromAmount * swapRate).toFixed(6)
    : '0.00'
  const toAmountNum = parseFloat(toAmount)
  const hasAmount = Number.isFinite(parsedFromAmount) && parsedFromAmount > 0
  const hasInsufficientInputBalance = hasAmount && (
    isVbUSDCInput
      ? parsedFromAmount > vbUSDCBalanceNum
      : parsedFromAmount + swapFeeNum > zkLTCBalanceNum
  )
  const hasInsufficientFeeBalance = hasAmount && isVbUSDCInput && swapFeeNum > zkLTCBalanceNum
  const hasInsufficientLiquidity = hasAmount && (
    isVbUSDCInput
      ? toAmountNum > zkLTCReserveNum
      : toAmountNum > vbUSDCReserveNum
  )
  const poolIsLow = vbUSDCReserveNum < 10 || zkLTCReserveNum < 0.01
  const validationError = hasInsufficientInputBalance
    ? `Insufficient ${fromToken.symbol} balance`
    : hasInsufficientFeeBalance
      ? 'Insufficient zkLTC for swap fee'
      : hasInsufficientLiquidity
        ? `Insufficient ${toToken.symbol} liquidity`
        : ''

  const handleSwap = () => {
    if (!fromAmount || parseFloat(fromAmount) <= 0 || !onChain || validationError) return
    onSwap(fromAmount, direction)
  }

  const switchDirection = () => {
    setFromAmount('')
    setDirection(current => current === 'vbUSDC_TO_ZKLTC' ? 'ZKLTC_TO_VBUSDC' : 'vbUSDC_TO_ZKLTC')
  }

  return (
    <div className="swap-panel">
      <div className="swap-card">
        <div className="swap-row">
          <label className="swap-label">You pay</label>
          <div className="swap-balance">Balance: {fromToken.balance}</div>
        </div>
        <div className="swap-input-row">
          <input
            type="number"
            className="swap-input"
            placeholder="0.00"
            value={fromAmount}
            onChange={e => setFromAmount(e.target.value)}
            disabled={swapPending}
          />
          <div className="token-selector">
            <span className="token-icon">{fromToken.icon}</span>
            <span className="token-symbol">{fromToken.symbol}</span>
          </div>
        </div>

        <button className="switch-btn" onClick={switchDirection} disabled={swapPending} title="Switch tokens">
          <ArrowRightLeft size={20} />
        </button>

        <div className="swap-row">
          <label className="swap-label">You receive</label>
          <div className="swap-balance">Balance: {toToken.balance}</div>
        </div>
        <div className="swap-input-row">
          <input
            type="text"
            className="swap-input"
            placeholder="0.00"
            value={toAmount}
            readOnly
          />
          <div className="token-selector">
            <span className="token-icon">{toToken.icon}</span>
            <span className="token-symbol">{toToken.symbol}</span>
          </div>
        </div>

        <div className="rate-info">
          <span>Rate</span>
          <span>{swapRate > 0 ? `1 zkLTC ≈ ${swapRate.toLocaleString()} vbUSDC` : 'Loading...'}</span>
        </div>

        <div className="rate-info">
          <span>Swap Fee</span>
          <span>{swapFee} zkLTC</span>
        </div>

        <div className="rate-info">
          <span>Pool Liquidity</span>
          <span>{vbUSDCReserve} vbUSDC / {zkLTCReserve} zkLTC</span>
        </div>

        {poolIsLow && (
          <div className="swap-warning">Pool reserves are low</div>
        )}

        {validationError && (
          <div className="swap-warning">{validationError}</div>
        )}

        {txError && (
          <div className="swap-warning">{txError}</div>
        )}

        {txUrl && (
          <a className="tx-link" href={txUrl} target="_blank" rel="noreferrer">
            View transaction
          </a>
        )}

        {!isConnected ? (
          <button className="swap-action-btn connect-prompt">
            <Wallet size={18} />
            Connect Wallet to Swap
          </button>
        ) : wrongNetwork ? (
          <button className="swap-action-btn disabled">Switch to LitVM</button>
        ) : (
          <button
            className={`swap-action-btn ${swapPending ? 'swapping' : ''} ${swapSuccess ? 'swapped' : ''}`}
            onClick={handleSwap}
            disabled={swapPending || swapSuccess || !fromAmount || !!validationError}
          >
            {swapPending ? 'Swapping...' : swapSuccess ? 'Swapped! ✨' : `Swap ${fromToken.symbol} for ${toToken.symbol}`}
          </button>
        )}
      </div>
    </div>
  )
}
