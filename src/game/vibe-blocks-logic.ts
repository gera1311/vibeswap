export type Board = number[][]

export type Direction = 'up' | 'down' | 'left' | 'right'

export const BOARD_SIZE = 4
export const START_TILE = 2

export function emptyBoard(): Board {
  return Array.from({ length: BOARD_SIZE }, () => Array.from({ length: BOARD_SIZE }, () => 0))
}

export function cloneBoard(board: Board): Board {
  return board.map(row => [...row])
}

export function addRandomTile(board: Board): Board {
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

export function createBoard(): Board {
  return addRandomTile(addRandomTile(emptyBoard()))
}

export function mergeLine(line: number[]) {
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

export function transpose(board: Board): Board {
  return board[0].map((_, colIndex) => board.map(row => row[colIndex]))
}

export function boardsEqual(a: Board, b: Board) {
  return JSON.stringify(a) === JSON.stringify(b)
}

export function moveBoard(board: Board, direction: Direction) {
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

export function hasMoves(board: Board) {
  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      if (board[row][col] === 0) return true
      if (board[row][col] === board[row][col + 1]) return true
      if (board[row + 1]?.[col] === board[row][col]) return true
    }
  }

  return false
}

export function tileClass(value: number) {
  if (!value) return 'tile-empty'
  if (value >= 4096) return 'tile-4096'
  if (value >= 2048) return 'tile-2048'
  return `tile-${value}`
}
