import React, { useState } from 'react'
import { Plus, Trash2, Check, X, Edit3, Coins } from 'lucide-react'

interface Token {
  symbol: string
  name: string
  icon: string
  address: string
  decimals: number
  enabled: boolean
}

const DEFAULT_TOKENS: Token[] = [
  { symbol: 'LIT', name: 'LitVM', icon: '⚡', address: '0x0000000000000000000000000000000000000000', decimals: 18, enabled: true },
  { symbol: 'vbUSDC', name: 'Test USDC', icon: '💵', address: '0x1234567890123456789012345678901234567890', decimals: 6, enabled: true },
  { symbol: 'vbETH', name: 'Test ETH', icon: '⟠', address: '0x2345678901234567890123456789012345678901', decimals: 18, enabled: true },
]

export default function TokenConfig() {
  const [tokens, setTokens] = useState<Token[]>(DEFAULT_TOKENS)
  const [editing, setEditing] = useState<string | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [newToken, setNewToken] = useState({ symbol: '', name: '', icon: '🪙', address: '', decimals: 18 })

  const toggleToken = (symbol: string) => {
    setTokens(prev => prev.map(t => t.symbol === symbol ? { ...t, enabled: !t.enabled } : t))
  }

  const removeToken = (symbol: string) => {
    setTokens(prev => prev.filter(t => t.symbol !== symbol))
  }

  const addToken = () => {
    if (!newToken.symbol || !newToken.name || !newToken.address) return
    setTokens(prev => [...prev, { ...newToken, enabled: true }])
    setNewToken({ symbol: '', name: '', icon: '🪙', address: '', decimals: 18 })
    setShowAdd(false)
  }

  return (
    <div className="token-config">
      <div className="token-config-card">
        <div className="token-config-header">
          <h3>Available Tokens</h3>
          <button className="add-token-btn" onClick={() => setShowAdd(!showAdd)}>
            <Plus size={16} />
            Add Token
          </button>
        </div>

        {showAdd && (
          <div className="add-token-form">
            <div className="add-token-grid">
              <input
                placeholder="Symbol (e.g. USDT)"
                value={newToken.symbol}
                onChange={e => setNewToken(prev => ({ ...prev, symbol: e.target.value }))}
                className="token-input"
              />
              <input
                placeholder="Name (e.g. Tether)"
                value={newToken.name}
                onChange={e => setNewToken(prev => ({ ...prev, name: e.target.value }))}
                className="token-input"
              />
              <input
                placeholder="Contract address"
                value={newToken.address}
                onChange={e => setNewToken(prev => ({ ...prev, address: e.target.value }))}
                className="token-input full-width"
              />
              <div className="token-input-row">
                <input
                  placeholder="Icon emoji"
                  value={newToken.icon}
                  onChange={e => setNewToken(prev => ({ ...prev, icon: e.target.value }))}
                  className="token-input icon-input"
                />
                <input
                  type="number"
                  placeholder="Decimals"
                  value={newToken.decimals}
                  onChange={e => setNewToken(prev => ({ ...prev, decimals: parseInt(e.target.value) || 18 }))}
                  className="token-input decimals-input"
                />
              </div>
            </div>
            <div className="add-token-actions">
              <button className="cancel-btn" onClick={() => setShowAdd(false)}>
                <X size={14} /> Cancel
              </button>
              <button className="confirm-btn" onClick={addToken}>
                <Check size={14} /> Add
              </button>
            </div>
          </div>
        )}

        <div className="token-list">
          {tokens.map(token => (
            <div key={token.symbol} className={`token-item ${token.enabled ? 'enabled' : 'disabled'}`}>
              <div className="token-item-left">
                <span className="token-item-icon">{token.icon}</span>
                <div className="token-item-info">
                  <span className="token-item-symbol">{token.symbol}</span>
                  <span className="token-item-name">{token.name}</span>
                </div>
              </div>
              <div className="token-item-details">
                <span className="token-item-address">{token.address.slice(0, 10)}...{token.address.slice(-6)}</span>
                <span className="token-item-decimals">{token.decimals} decimals</span>
              </div>
              <div className="token-item-actions">
                <button
                  className={`toggle-btn ${token.enabled ? 'on' : 'off'}`}
                  onClick={() => toggleToken(token.symbol)}
                >
                  {token.enabled ? 'Enabled' : 'Disabled'}
                </button>
                <button className="remove-btn" onClick={() => removeToken(token.symbol)}>
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>

        {tokens.length === 0 && (
          <div className="token-empty">
            <Coins size={32} />
            <p>No tokens configured. Add a token to get started.</p>
          </div>
        )}
      </div>
    </div>
  )
}
