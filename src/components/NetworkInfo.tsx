import React from 'react'
import { ExternalLink, CheckCircle, XCircle, RefreshCw, Globe, Wallet, Coins } from 'lucide-react'
import { formatEther } from 'viem'

interface NetworkInfoProps {
  isConnected: boolean
  address?: string
  chainId?: number
  balance?: {
    value: bigint
    symbol: string
  }
  wrongNetwork: boolean
  onSwitchNetwork: () => void
  onAddNetwork: () => void
}

export default function NetworkInfo({
  isConnected,
  address,
  chainId,
  balance,
  wrongNetwork,
  onSwitchNetwork,
  onAddNetwork,
}: NetworkInfoProps) {
  return (
    <div className="network-info">
      <div className="network-card">
        <div className="network-header">
          <Globe size={28} className="network-header-icon" />
          <h3>LitVM LiteForge</h3>
        </div>

        <div className="network-details">
          <div className="network-detail-row">
            <span className="detail-label">Network Name</span>
            <span className="detail-value">LitVM LiteForge</span>
          </div>
          <div className="network-detail-row">
            <span className="detail-label">Chain ID</span>
            <span className="detail-value chain-id">4441</span>
          </div>
          <div className="network-detail-row">
            <span className="detail-label">RPC URL</span>
            <span className="detail-value rpc-url">https://liteforge.rpc.caldera.xyz/http</span>
          </div>
          <div className="network-detail-row">
            <span className="detail-label">WebSocket</span>
            <span className="detail-value rpc-url">wss://liteforge.rpc.caldera.xyz/ws</span>
          </div>
          <div className="network-detail-row">
            <span className="detail-label">Currency</span>
            <span className="detail-value">zkLTC</span>
          </div>
          <div className="network-detail-row">
            <span className="detail-label">Explorer</span>
            <span className="detail-value">
              <a href="https://liteforge.explorer.caldera.xyz/" target="_blank" rel="noreferrer">
                liteforge.explorer.caldera.xyz
              </a>
            </span>
          </div>
        </div>

        <div className="network-actions">
          <button className="network-action-btn" onClick={onAddNetwork}>
            <ExternalLink size={16} />
            Add to Wallet
          </button>
        </div>
      </div>

      <div className="network-card">
        <div className="network-header">
          <Wallet size={28} className="network-header-icon" />
          <h3>Connection Status</h3>
        </div>

        <div className="connection-status">
          <div className="status-row">
            <span className="status-label">Wallet Connected</span>
            <span className={`status-badge ${isConnected ? 'connected' : 'disconnected'}`}>
              {isConnected ? <CheckCircle size={14} /> : <XCircle size={14} />}
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>

          {isConnected && (
            <>
              <div className="status-row">
                <span className="status-label">Address</span>
                <span className="status-value address-value">{address}</span>
              </div>
              <div className="status-row">
                <span className="status-label">Network Match</span>
                <span className={`status-badge ${!wrongNetwork ? 'connected' : 'disconnected'}`}>
                  {!wrongNetwork ? <CheckCircle size={14} /> : <XCircle size={14} />}
                  {!wrongNetwork ? 'Correct' : 'Wrong Network'}
                </span>
              </div>
              {wrongNetwork && (
                <button className="network-action-btn switch-btn" onClick={onSwitchNetwork}>
                  <RefreshCw size={16} />
                  Switch to LitVM LiteForge
                </button>
              )}
              <div className="status-row">
                <span className="status-label">Balance</span>
                <span className="status-value balance-value">
                  <Coins size={14} />
                  {balance ? `${parseFloat(formatEther(balance.value)).toFixed(4)} ${balance.symbol}` : '—'}
                </span>
              </div>
            </>
          )}

          {!isConnected && (
            <p className="connect-hint">Connect your wallet to see network details</p>
          )}
        </div>
      </div>
    </div>
  )
}
