import React from 'react'
import { Gamepad2, Trophy, Wallet, Zap, Gift } from 'lucide-react'
import { emptyBoard, createBoard, moveBoard, hasMoves, tileClass, type Board, type Direction } from '../game/vibe-blocks-logic'

interface LeaderboardEntry {
  player: string
  score: number
}

interface VibeBlocksProps {
  isConnected: boolean
  wrongNetwork: boolean
  onChain: boolean
  rankedEnabled: boolean
  entryFee: string
  bestScore: number
  totalScore: number
  bestLeaderboard: LeaderboardEntry[]
  totalLeaderboard: LeaderboardEntry[]
  onStartRanked: () => void
  onSubmitScore: (score: number, maxBlock: number) => void
  activeRunOnChain?: boolean
  startPending: boolean
  startSubmitted: boolean
  submitPending: boolean
  submitSuccess: boolean
  txUrl?: string
  txError?: string
  blockNftDeployed: boolean
  mintedByTier: boolean[]
  mintFee: string
  onMint: (tier: number, maxTile: number) => void
  mintPending: boolean
  nftReady: boolean
  connectedAddress?: string
  blockNftTxUrl?: string
  blockNftTxError?: string
}

const BLOCK_TIERS = [
  { tier: 1, block: 512, label: '512', legendary: false },
  { tier: 2, block: 1024, label: '1024', legendary: false },
  { tier: 3, block: 2048, label: '2048', legendary: false },
  { tier: 4, block: 4096, label: '4096', legendary: true },
]

function shortAddress(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

export default function VibeBlocks({
  isConnected,
  wrongNetwork,
  onChain,
  rankedEnabled,
  entryFee,
  bestScore,
  totalScore,
  bestLeaderboard,
  totalLeaderboard,
  onStartRanked,
  onSubmitScore,
  activeRunOnChain,
  startPending,
  startSubmitted,
  submitPending,
  submitSuccess,
  txUrl,
  txError,
  blockNftDeployed,
  mintedByTier,
  mintFee,
  onMint,
  mintPending,
  nftReady,
  connectedAddress,
  blockNftTxUrl,
  blockNftTxError,
}: VibeBlocksProps) {
  const [board, setBoard] = React.useState<Board>(() => emptyBoard())
  const [score, setScore] = React.useState(0)
  const [runStarted, setRunStarted] = React.useState(false)
  const [gameOver, setGameOver] = React.useState(false)
  const [scoreSubmitted, setScoreSubmitted] = React.useState(false)
  const [touchStart, setTouchStart] = React.useState<{ x: number; y: number } | null>(null)
  const previousStartSubmitted = React.useRef(false)
  const autoMintedRef = React.useRef<Set<number>>(new Set())

  const maxTile = Math.max(0, ...board.flat())
  const activeRun = runStarted && !gameOver

  const resetGame = React.useCallback(() => {
    setBoard(createBoard())
    setScore(0)
    setRunStarted(true)
    setGameOver(false)
    setScoreSubmitted(false)
    autoMintedRef.current = new Set()
  }, [])

  const performMove = React.useCallback((direction: Direction) => {
    if (!runStarted || gameOver) return

    setBoard(current => {
      const moved = moveBoard(current, direction)
      if (!moved.changed) return current

      setScore(value => value + moved.score)
      if (!hasMoves(moved.board)) setGameOver(true)

      return moved.board
    })
  }, [gameOver, runStarted])

  React.useEffect(() => {
    if (!previousStartSubmitted.current && startSubmitted) {
      resetGame()
    }

    previousStartSubmitted.current = startSubmitted
  }, [resetGame, startSubmitted])

  // Self-heal: if the onchain run is active but the UI lost it (mobile reload /
  // remount between signing and confirmation), unlock the board from onchain
  // state instead of showing the Start button again. Guarded against the post-
  // submit window where `activeRunOnChain` is still stale-true.
  React.useEffect(() => {
    if (activeRunOnChain === true && !runStarted && !startPending && !submitPending && !submitSuccess) {
      resetGame()
    }
  }, [activeRunOnChain, runStarted, startPending, submitPending, submitSuccess, resetGame])

  React.useEffect(() => {
    if (!gameOver || !runStarted || scoreSubmitted || submitPending || score <= 0) return

    setScoreSubmitted(true)
    onSubmitScore(score, maxTile)
  }, [gameOver, maxTile, onSubmitScore, runStarted, score, scoreSubmitted, submitPending])

  React.useEffect(() => {
    if (!submitSuccess) return
    setRunStarted(false)
  }, [submitSuccess])

  React.useEffect(() => {
    if (!blockNftDeployed || !nftReady || !activeRun || !onChain || mintPending) return

    const tier = BLOCK_TIERS.find(t => maxTile >= t.block && !mintedByTier[t.tier] && !autoMintedRef.current.has(t.tier))
    if (!tier) return

    autoMintedRef.current.add(tier.tier)
    onMint(tier.tier, maxTile)
  }, [blockNftDeployed, nftReady, activeRun, onChain, mintPending, maxTile, mintedByTier, onMint])

  React.useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const directionByKey = {
        ArrowUp: 'up',
        ArrowDown: 'down',
        ArrowLeft: 'left',
        ArrowRight: 'right',
      } as const
      const direction = directionByKey[event.key as keyof typeof directionByKey]

      if (!direction) return

      event.preventDefault()
      performMove(direction)
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [performMove])

  const startRanked = () => {
    if (!rankedEnabled || !onChain) return
    onStartRanked()
  }

  const handleTouchEnd = (event: React.TouchEvent) => {
    if (!touchStart) return

    const touch = event.changedTouches[0]
    const dx = touch.clientX - touchStart.x
    const dy = touch.clientY - touchStart.y

    setTouchStart(null)

    if (Math.max(Math.abs(dx), Math.abs(dy)) < 30) return

    if (Math.abs(dx) > Math.abs(dy)) {
      performMove(dx > 0 ? 'right' : 'left')
    } else {
      performMove(dy > 0 ? 'down' : 'up')
    }
  }

  return (
    <div className="game-layout">
      <div className="game-shell">
        <div className="game-topbar">
          <div>
            <div className="game-kicker">
              <Gamepad2 size={16} />
              Vibe Blocks
            </div>
            <h3 className="game-title">Merge the vibes. Climb the chain.</h3>
          </div>
          <div className="game-score-grid">
            <div className="game-score-box">
              <span>Score</span>
              <strong>{score}</strong>
            </div>
            <div className="game-score-box">
              <span>Best</span>
              <strong>{bestScore}</strong>
            </div>
            <div className="game-score-box">
              <span>Total</span>
              <strong>{totalScore}</strong>
            </div>
          </div>
        </div>

        <div
          className="vibe-board"
          onTouchStart={event => setTouchStart({ x: event.touches[0].clientX, y: event.touches[0].clientY })}
          onTouchEnd={handleTouchEnd}
        >
          {board.flatMap((row, rowIndex) => row.map((value, colIndex) => (
            <div className={`vibe-tile ${tileClass(value)}`} key={`${rowIndex}-${colIndex}`}>
              {value || ''}
            </div>
          )))}
        </div>

        {!runStarted && (
          <div className="game-locked-panel">
            <Wallet size={18} />
            <span>Start a ranked run to unlock the board.</span>
          </div>
        )}

        {gameOver && (
          <div className="game-over-panel">
            <Trophy size={18} />
            <span>{scoreSubmitted ? `Submitting score: ${score}` : `Run complete: ${score}`}</span>
          </div>
        )}

        <div className="game-actions">
          <button
            className="game-action"
            onClick={startRanked}
            disabled={!isConnected || wrongNetwork || startPending || submitPending || !rankedEnabled || (runStarted && !gameOver)}
          >
            {startPending
              ? 'Starting...'
              : submitPending
                ? 'Submitting...'
                : runStarted && !gameOver
                  ? 'Run active'
                  : `Start ${entryFee} zkLTC`}
          </button>
        </div>

        {blockNftDeployed && (
          <div className="block-achievements">
            <div className="block-achievements-title">
              <Gift size={16} />
              <span>Block Achievements · {mintFee} zkLTC</span>
            </div>
            <div className="block-achievement-grid">
              {BLOCK_TIERS.map(t => {
                const reached = maxTile >= t.block
                const minted = mintedByTier[t.tier] === true

                return (
                  <div
                    key={t.tier}
                    className={`block-achievement ${minted ? 'minted' : reached ? 'reached' : 'locked'} ${t.legendary ? 'legendary' : ''}`}
                  >
                    <span className="block-achievement-block">{t.label}</span>
                    {minted ? (
                      <span className="block-achievement-minted">Minted</span>
                    ) : reached ? (
                      <span className="block-achievement-minting">{mintPending ? 'Minting...' : 'Unlocked'}</span>
                    ) : (
                      <span className="block-achievement-locked">Reach {t.block}</span>
                    )}
                  </div>
                )
              })}
            </div>

            {blockNftTxUrl && (
              <a className="tx-link" href={blockNftTxUrl} target="_blank" rel="noreferrer">
                View mint transaction
              </a>
            )}

            {blockNftTxError && (
              <div className="swap-warning">{blockNftTxError}</div>
            )}
          </div>
        )}

        {!isConnected && (
          <div className="game-notice">
            <Wallet size={16} />
            Connect wallet to enter ranked runs.
          </div>
        )}

        {!rankedEnabled && (
          <div className="game-notice">
            <Zap size={16} />
            Ranked contract is not deployed yet.
          </div>
        )}

        {txUrl && (
          <a className="tx-link" href={txUrl} target="_blank" rel="noreferrer">
            View transaction
          </a>
        )}

        {txError && (
          <div className="swap-warning">{txError}</div>
        )}
      </div>

      <div className="leaderboard-card">
        <div className="leaderboard-header">
          <Trophy size={20} />
          <span>Best Score</span>
        </div>
        <div className="leaderboard-list">
          {bestLeaderboard.length ? bestLeaderboard.map((entry, index) => {
            const isCurrent = connectedAddress && entry.player.toLowerCase() === connectedAddress.toLowerCase()
            return (
              <div className={`leaderboard-row ${isCurrent ? 'current' : ''}`} key={entry.player}>
                <span>#{index + 1}</span>
                <strong>{shortAddress(entry.player)}</strong>
                <em>{entry.score}</em>
              </div>
            )
          }) : (
            <div className="leaderboard-empty">No ranked scores yet</div>
          )}
        </div>

        <div className="leaderboard-header secondary">
          <Trophy size={20} />
          <span>Total Score</span>
        </div>
        <div className="leaderboard-list">
          {totalLeaderboard.length ? totalLeaderboard.map((entry, index) => {
            const isCurrent = connectedAddress && entry.player.toLowerCase() === connectedAddress.toLowerCase()
            return (
              <div className={`leaderboard-row ${isCurrent ? 'current' : ''}`} key={entry.player}>
                <span>#{index + 1}</span>
                <strong>{shortAddress(entry.player)}</strong>
                <em>{entry.score}</em>
              </div>
            )
          }) : (
            <div className="leaderboard-empty">No total scores yet</div>
          )}
        </div>
      </div>
    </div>
  )
}
