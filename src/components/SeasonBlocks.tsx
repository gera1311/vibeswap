import React from 'react'
import { useAccount, useBlock, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { formatEther } from 'viem'
import { CalendarDays, Gamepad2, Trophy, Wallet, Zap, Flame } from 'lucide-react'
import { litVM } from '../wagmi'
import { seasonGameAddress, seasonGameAbi, isSeasonGameDeployed } from '../contracts/SeasonGame'
import { emptyBoard, createBoard, moveBoard, hasMoves, tileClass, type Board, type Direction } from '../game/vibe-blocks-logic'

function shortAddress(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

function txErrorMessage(error?: (Error & { shortMessage?: string }) | null) {
  if (!error) return undefined

  const message = error.message.toLowerCase()

  if (message.includes('user rejected') || message.includes('user denied') || message.includes('rejected the request')) {
    return 'Transaction rejected in wallet.'
  }
  if (message.includes('season not started')) {
    return 'The season has not started yet.'
  }
  if (message.includes('season ended')) {
    return 'The season has ended.'
  }
  if (message.includes('daily run limit')) {
    return 'Daily run limit reached. Try again tomorrow.'
  }
  if (message.includes('run too soon')) {
    return 'Wait a minute between runs.'
  }
  if (message.includes('submission window closed')) {
    return 'The score submission window has closed.'
  }
  if (message.includes('no active run')) {
    return 'Start a run before submitting a score.'
  }
  if (message.includes('exceeds the balance') || message.includes('insufficient funds')) {
    return 'Insufficient zkLTC for the entry fee or gas.'
  }

  return error.shortMessage || error.message.split('\n')[0]
}

export default function SeasonBlocks() {
  const { address, isConnected, chainId } = useAccount()
  const onChain = isConnected && chainId === litVM.id
  const wrongNetwork = isConnected && chainId !== litVM.id

  const { data: block } = useBlock({ chainId: litVM.id, watch: true })
  const now = block?.timestamp ? Number(block.timestamp) : Math.floor(Date.now() / 1000)

  const { data: entryFee } = useReadContract({
    abi: seasonGameAbi,
    address: seasonGameAddress,
    functionName: 'entryFee',
    chainId: litVM.id,
    query: { enabled: isSeasonGameDeployed },
  })
  const { data: seasonStart } = useReadContract({
    abi: seasonGameAbi,
    address: seasonGameAddress,
    functionName: 'seasonStart',
    chainId: litVM.id,
    query: { enabled: isSeasonGameDeployed },
  })
  const { data: seasonEnd } = useReadContract({
    abi: seasonGameAbi,
    address: seasonGameAddress,
    functionName: 'seasonEnd',
    chainId: litVM.id,
    query: { enabled: isSeasonGameDeployed },
  })
  const { data: submitGrace } = useReadContract({
    abi: seasonGameAbi,
    address: seasonGameAddress,
    functionName: 'submitGrace',
    chainId: litVM.id,
    query: { enabled: isSeasonGameDeployed },
  })
  const { data: seasonPoints, refetch: refetchPoints } = useReadContract({
    abi: seasonGameAbi,
    address: seasonGameAddress,
    functionName: 'seasonPoints',
    args: [address!],
    chainId: litVM.id,
    query: { enabled: isSeasonGameDeployed && !!address },
  })
  const { data: seasonBest, refetch: refetchBest } = useReadContract({
    abi: seasonGameAbi,
    address: seasonGameAddress,
    functionName: 'bestScore',
    args: [address!],
    chainId: litVM.id,
    query: { enabled: isSeasonGameDeployed && !!address },
  })
  const { data: daysPlayed, refetch: refetchDays } = useReadContract({
    abi: seasonGameAbi,
    address: seasonGameAddress,
    functionName: 'daysPlayed',
    args: [address!],
    chainId: litVM.id,
    query: { enabled: isSeasonGameDeployed && !!address },
  })
  const { data: seasonRank, refetch: refetchRank } = useReadContract({
    abi: seasonGameAbi,
    address: seasonGameAddress,
    functionName: 'getRank',
    args: [address!],
    chainId: litVM.id,
    query: { enabled: isSeasonGameDeployed && !!address },
  })

  const { writeContract: writeStart, data: startHash, isPending: startPending, error: startError, reset: resetStart } = useWriteContract()
  const { writeContract: writeSubmit, data: submitHash, isPending: submitPending, error: submitError, reset: resetSubmit } = useWriteContract()
  const { isLoading: startConfirming, isSuccess: startSuccess } = useWaitForTransactionReceipt({ hash: startHash, chainId: litVM.id })
  const { isLoading: submitConfirming, isSuccess: submitSuccess } = useWaitForTransactionReceipt({ hash: submitHash, chainId: litVM.id })

  const [board, setBoard] = React.useState<Board>(() => emptyBoard())
  const [score, setScore] = React.useState(0)
  const [runStarted, setRunStarted] = React.useState(false)
  const [gameOver, setGameOver] = React.useState(false)
  const [scoreSubmitted, setScoreSubmitted] = React.useState(false)
  const [touchStart, setTouchStart] = React.useState<{ x: number; y: number } | null>(null)
  const previousStartSubmitted = React.useRef(false)

  const maxTile = Math.max(0, ...board.flat())
  const entryFeeValue = entryFee ?? 0n
  const start = seasonStart ? Number(seasonStart) : 0
  const end = seasonEnd ? Number(seasonEnd) : 0
  const grace = submitGrace ? Number(submitGrace) : 0
  const seasonActive = start > 0 && now >= start && now <= end
  const seasonNotStarted = start > 0 && now < start
  const seasonEnded = end > 0 && now > end + grace

  const resetGame = React.useCallback(() => {
    setBoard(createBoard())
    setScore(0)
    setRunStarted(true)
    setGameOver(false)
    setScoreSubmitted(false)
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
    if (!previousStartSubmitted.current && startSuccess) {
      resetGame()
    }
    previousStartSubmitted.current = startSuccess
  }, [resetGame, startSuccess])

  React.useEffect(() => {
    if (!gameOver || !runStarted || scoreSubmitted || submitPending || score <= 0) return

    setScoreSubmitted(true)
    writeSubmit({ abi: seasonGameAbi, address: seasonGameAddress, functionName: 'submitScore', args: [BigInt(score), BigInt(maxTile)] })
  }, [gameOver, maxTile, runStarted, score, scoreSubmitted, submitPending, writeSubmit])

  React.useEffect(() => {
    if (!submitSuccess) return
    setRunStarted(false)
  }, [submitSuccess])

  React.useEffect(() => {
    if (!startSuccess && !submitSuccess) return

    void Promise.all([refetchPoints(), refetchBest(), refetchDays(), refetchRank()])

    const timeout = window.setTimeout(() => {
      resetStart()
      resetSubmit()
    }, 2500)
    return () => window.clearTimeout(timeout)
  }, [startSuccess, submitSuccess, refetchBest, refetchDays, refetchPoints, refetchRank, resetStart, resetSubmit])

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
    if (!isSeasonGameDeployed || !onChain || !seasonActive) return
    writeStart({ abi: seasonGameAbi, address: seasonGameAddress, functionName: 'startRun', args: [], value: entryFeeValue })
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

  const error = txErrorMessage(startError || submitError)
  const statusLabel = seasonNotStarted
    ? 'Season not started yet'
    : seasonEnded
      ? 'Season ended'
      : now > end
        ? 'Season ended — grace period for score submissions'
        : 'Season active'

  return (
    <div className="game-layout">
      <div className="game-shell">
        <div className="game-topbar">
          <div>
            <div className="game-kicker">
              <Gamepad2 size={16} />
              Season 0 · Vibe Blocks
            </div>
            <h3 className="game-title">Merge the vibes. Climb the season.</h3>
          </div>
          <div className="game-score-grid">
            <div className="game-score-box">
              <span>Score</span>
              <strong>{score}</strong>
            </div>
            <div className="game-score-box">
              <span>Season Best</span>
              <strong>{seasonBest ? Number(seasonBest) : 0}</strong>
            </div>
            <div className="game-score-box">
              <span>Points</span>
              <strong>{seasonPoints ? Number(seasonPoints) : 0}</strong>
            </div>
          </div>
        </div>

        <div className="season-status-row">
          <div className={`season-status ${seasonNotStarted ? 'pending' : seasonActive ? 'active' : 'ended'}`}>
            <CalendarDays size={14} />
            <span>{statusLabel}</span>
          </div>
          <div className="season-stats-inline">
            <span className="season-stat-inline"><Flame size={13} /> {daysPlayed ? Number(daysPlayed) : 0} days</span>
            <span className="season-stat-inline"><Trophy size={13} /> Rank {seasonRank && Number(seasonRank) > 0 ? `#${Number(seasonRank)}` : '—'}</span>
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
            disabled={!isConnected || wrongNetwork || startPending || startConfirming || submitPending || submitConfirming || !isSeasonGameDeployed || !seasonActive || (runStarted && !gameOver)}
          >
            {startPending || startConfirming
              ? 'Starting...'
              : submitPending || submitConfirming
                ? 'Submitting...'
                : runStarted && !gameOver
                  ? 'Run active'
                  : `Start ${formatEther(entryFeeValue)} zkLTC`}
          </button>
        </div>

        {!isConnected && (
          <div className="game-notice">
            <Wallet size={16} />
            Connect wallet to enter Season 0 runs.
          </div>
        )}

        {wrongNetwork && (
          <div className="game-notice">
            <Zap size={16} />
            Switch to LitVM LiteForge.
          </div>
        )}

        {!isSeasonGameDeployed && (
          <div className="game-notice">
            <Zap size={16} />
            Season 0 contract is not deployed yet.
          </div>
        )}

        {startHash || submitHash ? (
          <a className="tx-link" href={`${litVM.blockExplorers?.default.url.replace(/\/$/, '')}/tx/${submitHash || startHash}`} target="_blank" rel="noreferrer">
            View transaction
          </a>
        ) : null}

        {error && <div className="swap-warning">{error}</div>}
      </div>

      <div className="leaderboard-card">
        <div className="leaderboard-header">
          <Trophy size={20} />
          <span>Your Season 0</span>
        </div>
        <div className="season-mystats">
          <div className="season-mystat"><span>Season Best</span><strong>{seasonBest ? Number(seasonBest) : 0}</strong></div>
          <div className="season-mystat"><span>Season Points</span><strong>{seasonPoints ? Number(seasonPoints) : 0}</strong></div>
          <div className="season-mystat"><span>Days Played</span><strong>{daysPlayed ? Number(daysPlayed) : 0}</strong></div>
          <div className="season-mystat"><span>Current Rank</span><strong>{seasonRank && Number(seasonRank) > 0 ? `#${Number(seasonRank)}` : '—'}</strong></div>
        </div>
        <div className="season-connected-note">
          {address ? `Playing as ${shortAddress(address)}` : 'Connect to see your season stats'}
        </div>
      </div>
    </div>
  )
}
