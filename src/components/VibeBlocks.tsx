import React from 'react'
import { Gamepad2, Trophy, Wallet, Zap } from 'lucide-react'

type Board = number[][]

interface LeaderboardEntry {
  player: string
  score: number
}

interface VibeBlocksProps {
  isConnected: boolean
  wrongNetwork: boolean
  onChain: boolean
  rankedEnabled: boolean
  rankedActive: boolean
  entryFee: string
  bestScore: number
  leaderboard: LeaderboardEntry[]
  onStartRanked: () => void
  onSubmitScore: (score: number) => void
  startPending: boolean
  startSuccess: boolean
  submitPending: boolean
  txUrl?: string
  txError?: string
}

const BOARD_SIZE = 4
const START_TILE = 2

function emptyBoard(): Board {
  return Array.from({ length: BOARD_SIZE }, () => Array.from({ length: BOARD_SIZE }, () => 0))
}

function cloneBoard(board: Board): Board {
  return board.map(row => [...row])
}

function addRandomTile(board: Board): Board {
  const cells: Array<[number, number]> = []

  board.forEach((row, rowIndex) => {
    row.forEach((cell, colIndex) => {
      if (cell === 0) cells.push([rowIndex, colIndex])
    })
  })

  if (!cells.length) return board

  const next = cloneBoard(board)
  const [row, col] = cells[Math.floor(Math.random() * cells.length)]
  next[row][col] = Math.random() < 0.9 ? START_TILE : START_TILE * 2
  return next
}

function createBoard(): Board {
  return addRandomTile(addRandomTile(emptyBoard()))
}

function mergeLine(line: number[]) {
  const compact = line.filter(Boolean)
  const result: number[] = []
  let score = 0

  for (let i = 0; i < compact.length; i++) {
    if (compact[i] === compact[i + 1]) {
      const merged = compact[i] * 2
      result.push(merged)
      score += merged
      i += 1
    } else {
      result.push(compact[i])
    }
  }

  while (result.length < BOARD_SIZE) result.push(0)

  return { line: result, score }
}

function transpose(board: Board): Board {
  return board[0].map((_, colIndex) => board.map(row => row[colIndex]))
}

function boardsEqual(a: Board, b: Board) {
  return JSON.stringify(a) === JSON.stringify(b)
}

function moveBoard(board: Board, direction: 'up' | 'down' | 'left' | 'right') {
  let working = cloneBoard(board)
  let score = 0

  if (direction === 'up' || direction === 'down') working = transpose(working)

  const moved = working.map(row => {
    const input = direction === 'right' || direction === 'down' ? [...row].reverse() : row
    const merged = mergeLine(input)
    score += merged.score
    return direction === 'right' || direction === 'down' ? merged.line.reverse() : merged.line
  })

  const next = direction === 'up' || direction === 'down' ? transpose(moved) : moved
  const changed = !boardsEqual(board, next)

  return {
    board: changed ? addRandomTile(next) : board,
    score,
    changed,
  }
}

function hasMoves(board: Board) {
  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      if (board[row][col] === 0) return true
      if (board[row][col] === board[row][col + 1]) return true
      if (board[row + 1]?.[col] === board[row][col]) return true
    }
  }

  return false
}

function tileClass(value: number) {
  if (!value) return 'tile-empty'
  if (value >= 2048) return 'tile-2048'
  return `tile-${value}`
}

function shortAddress(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

export default function VibeBlocks({
  isConnected,
  wrongNetwork,
  onChain,
  rankedEnabled,
  rankedActive,
  entryFee,
  bestScore,
  leaderboard,
  onStartRanked,
  onSubmitScore,
  startPending,
  startSuccess,
  submitPending,
  txUrl,
  txError,
}: VibeBlocksProps) {
  const [board, setBoard] = React.useState<Board>(() => createBoard())
  const [score, setScore] = React.useState(0)
  const [mode, setMode] = React.useState<'free' | 'ranked'>('free')
  const [gameOver, setGameOver] = React.useState(false)
  const [rankedSubmitted, setRankedSubmitted] = React.useState(false)
  const [touchStart, setTouchStart] = React.useState<{ x: number; y: number } | null>(null)
  const previousStartSuccess = React.useRef(false)

  const resetGame = React.useCallback((nextMode: 'free' | 'ranked') => {
    setBoard(createBoard())
    setScore(0)
    setMode(nextMode)
    setGameOver(false)
    setRankedSubmitted(false)
  }, [])

  const performMove = React.useCallback((direction: 'up' | 'down' | 'left' | 'right') => {
    if (gameOver) return

    setBoard(current => {
      const moved = moveBoard(current, direction)
      if (!moved.changed) return current

      setScore(value => value + moved.score)
      if (!hasMoves(moved.board)) setGameOver(true)

      return moved.board
    })
  }, [gameOver])

  React.useEffect(() => {
    if (!previousStartSuccess.current && startSuccess && rankedActive) {
      resetGame('ranked')
    }

    previousStartSuccess.current = startSuccess
  }, [rankedActive, resetGame, startSuccess])

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
    if (rankedActive) {
      resetGame('ranked')
      return
    }
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

        {gameOver && (
          <div className="game-over-panel">
            <Trophy size={18} />
            <span>Run complete: {score}</span>
          </div>
        )}

        <div className="game-actions">
          <button className="game-action secondary" onClick={() => resetGame('free')}>
            Free Run
          </button>
          <button
            className="game-action"
            onClick={startRanked}
            disabled={!isConnected || wrongNetwork || startPending || !rankedEnabled}
          >
            {startPending ? 'Starting...' : rankedActive ? 'Play Ranked' : `Ranked ${entryFee} zkLTC`}
          </button>
          {mode === 'ranked' && gameOver && !rankedSubmitted && (
            <button
              className="game-action"
              onClick={() => {
                setRankedSubmitted(true)
                onSubmitScore(score)
              }}
              disabled={!rankedActive || submitPending || score <= 0}
            >
              {submitPending ? 'Submitting...' : 'Submit Score'}
            </button>
          )}
        </div>

        {!isConnected && (
          <div className="game-notice">
            <Wallet size={16} />
            Connect wallet to enter ranked runs.
          </div>
        )}

        {!rankedEnabled && (
          <div className="game-notice">
            <Zap size={16} />
            Ranked contract is not deployed yet. Free mode is available.
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
          <span>Onchain Leaderboard</span>
        </div>
        <div className="leaderboard-list">
          {leaderboard.length ? leaderboard.map((entry, index) => (
            <div className="leaderboard-row" key={entry.player}>
              <span>#{index + 1}</span>
              <strong>{shortAddress(entry.player)}</strong>
              <em>{entry.score}</em>
            </div>
          )) : (
            <div className="leaderboard-empty">No ranked scores yet</div>
          )}
        </div>
      </div>
    </div>
  )
}
