import React, { useState, useRef, Suspense } from 'react'
import { useAccount, useConnect, useDisconnect, useSwitchChain, useBalance, useBlockNumber, useBlock, useReadContract, useReadContracts, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { useQueryClient } from '@tanstack/react-query'
import { formatEther, formatUnits, parseEther, parseUnits } from 'viem'
import { Sun, ArrowRightLeft, Sparkles, Gift, Flame, Wallet, LogOut, Menu, X, Droplets, ExternalLink, Gamepad2, Trophy, CalendarDays } from 'lucide-react'
import { litVM } from './wagmi'
import { vbUSDCAddress, vbUSDCApi } from './contracts/vbUSDC'
import { gmAddress, gmAbi } from './contracts/GM'
import { gmBadgeNFTAddress, gmBadgeNFTAbi, isGMBadgeNFTDeployed } from './contracts/GMBadgeNFT'
import { swapAddress, swapAbi } from './contracts/Swap'
import { vibeGameAddress, vibeGameAbi, isVibeGameDeployed } from './contracts/VibeGame'
import { seasonGameAddress, seasonGameAbi, isSeasonGameDeployed } from './contracts/SeasonGame'
import { vibeBlockNFTAddress, vibeBlockNFTAbi, isVibeBlockNFTDeployed } from './contracts/VibeBlockNFT'
import SunSphere from './components/SunSphere'
import VibeBlocks from './components/VibeBlocks'
import SwapPanel, { type SwapDirection } from './components/SwapPanel'
import GMTracker from './components/GMTracker'
import NFTGallery from './components/NFTGallery'
import FaucetPanel from './components/FaucetPanel'
import NetworkInfo from './components/NetworkInfo'
import SeasonPanel from './components/SeasonPanel'
import SeasonBlocks from './components/SeasonBlocks'
import SeasonLeaderboard from './components/SeasonLeaderboard'
import SeasonCountdown from './components/SeasonCountdown'
import { SEASON0_START, SEASON0_END } from './season0Constants'

type Page = 'game' | 'swap' | 'gm' | 'nft' | 'faucet' | 'leaderboard' | 'network' | 'season'
type NavGroup = 'gm' | 'vibe' | 'swap' | 'season'

const explorerBaseUrl = litVM.blockExplorers?.default.url.replace(/\/$/, '')
const docsUrl = 'https://docs.vibeswap.net'
const xUrl = 'https://x.com/Vibeswapnet'

function txUrl(hash?: `0x${string}`) {
  return hash ? `${explorerBaseUrl}/tx/${hash}` : undefined
}

function txErrorMessage(error?: (Error & { shortMessage?: string }) | null) {
  if (!error) return undefined

  const message = error.message.toLowerCase()

  if (message.includes('user rejected') || message.includes('user denied') || message.includes('rejected the request')) {
    return 'Transaction rejected in wallet.'
  }

  if (message.includes('exceeds the balance') || message.includes('insufficient funds')) {
    return 'Insufficient zkLTC for fee, value, or gas.'
  }

  if (message.includes('already claimed')) {
    return 'Cooldown is active. Try again when the timer ends.'
  }

  if (message.includes('already minted')) {
    return 'You already minted this badge.'
  }

  if (message.includes('streak not reached')) {
    return 'Reach the required streak before minting this badge.'
  }

  if (message.includes('invalid mint fee')) {
    return 'Invalid mint fee.'
  }

  if (message.includes('no active run')) {
    return 'Start an active ranked run to mint block achievements.'
  }

  if (message.includes('block not reached')) {
    return 'Reach the required block before minting this achievement.'
  }

  if (message.includes('insufficient vbusdc reserve') || message.includes('insufficient zkltc reserve')) {
    return 'Insufficient pool liquidity for this swap.'
  }

  if (message.includes('insufficient balance')) {
    return 'Insufficient wallet balance.'
  }

  if (message.includes('insufficient allowance')) {
    return 'Approve vbUSDC before swapping.'
  }

  return error.shortMessage || error.message.split('\n')[0]
}

interface LeaderboardCardProps {
  title: string
  entries: Array<{ player: string; score: number }>
  totalCount: number
  page: number
  pageSize: number
  connectedAddress?: string
  onPageChange: (page: number) => void
  onPageSizeChange: (size: number) => void
}

function LeaderboardCard({ title, entries, totalCount, page, pageSize, connectedAddress, onPageChange, onPageSizeChange }: LeaderboardCardProps) {
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))

  return (
    <div className="leaderboard-card standalone">
      <div className="leaderboard-header">
        <Trophy size={20} />
        <span>{title}</span>
      </div>
      <div className="leaderboard-list">
        {entries.length ? entries.map((entry, index) => {
          const isCurrent = connectedAddress && entry.player.toLowerCase() === connectedAddress.toLowerCase()
          return (
            <div className={`leaderboard-row ${isCurrent ? 'current' : ''}`} key={entry.player}>
              <span>#{page * pageSize + index + 1}</span>
              <strong>{entry.player.slice(0, 6)}...{entry.player.slice(-4)}</strong>
              <em>{entry.score}</em>
            </div>
          )
        }) : (
          <div className="leaderboard-empty">No ranked scores yet</div>
        )}
      </div>
      <div className="pagination">
        <button type="button" onClick={() => onPageChange(page - 1)} disabled={page === 0}>Prev</button>
        <span className="pagination-status">Page {page + 1} / {totalPages}</span>
        <button type="button" onClick={() => onPageChange(page + 1)} disabled={page + 1 >= totalPages}>Next</button>
        <label className="pagination-size">
          Show
          <select value={pageSize} onChange={e => onPageSizeChange(Number(e.target.value))}>
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </label>
        <span className="pagination-total">{totalCount} players</span>
      </div>
    </div>
  )
}

export default function App() {
  const { address, isConnected, chainId } = useAccount()
  const { connect, connectors, isPending: connecting, error: connectError } = useConnect()
  const { disconnect } = useDisconnect()
  const { switchChain } = useSwitchChain()
  const queryClient = useQueryClient()
  const onChain = isConnected && chainId === litVM.id
  const [lbPageSize, setLbPageSize] = useState(10)
  const [bestPage, setBestPage] = useState(0)
  const [totalPage, setTotalPage] = useState(0)
  const [pendingMintTier, setPendingMintTier] = useState<number | null>(null)
  const [blockMintBusy, setBlockMintBusy] = useState(false)
  const { data: blockNumber } = useBlockNumber({
    chainId: litVM.id,
    watch: true,
    query: { enabled: onChain },
  })
  const { data: balance, refetch: refetchNativeBalance } = useBalance({
    address,
    chainId: litVM.id,
    query: { enabled: !!address },
  })
  const { data: vbUSDCBalance, refetch: refetchVbUSDC } = useReadContract({
    abi: vbUSDCApi,
    address: vbUSDCAddress,
    functionName: 'balanceOf',
    args: [address!],
    chainId: litVM.id,
    query: { enabled: !!address },
  })
  const { data: vbUSDCAllowance, refetch: refetchVbUSDCAllowance } = useReadContract({
    abi: vbUSDCApi,
    address: vbUSDCAddress,
    functionName: 'allowance',
    args: [address!, swapAddress],
    chainId: litVM.id,
    query: { enabled: !!address },
  })
  const { data: gmStreak, refetch: refetchStreak } = useReadContract({
    abi: gmAbi,
    address: gmAddress,
    functionName: 'getStreak',
    args: [address!],
    chainId: litVM.id,
    query: { enabled: !!address },
  })
  const { data: gmTotal, refetch: refetchTotal } = useReadContract({
    abi: gmAbi,
    address: gmAddress,
    functionName: 'getTotalGm',
    args: [address!],
    chainId: litVM.id,
    query: { enabled: !!address },
  })
  const { data: hasClaimedToday, refetch: refetchClaimed } = useReadContract({
    abi: gmAbi,
    address: gmAddress,
    functionName: 'hasClaimedToday',
    args: [address!],
    chainId: litVM.id,
    query: { enabled: !!address },
  })
  const { data: gmBadges, refetch: refetchBadges } = useReadContract({
    abi: gmAbi,
    address: gmAddress,
    functionName: 'getBadges',
    args: [address!],
    chainId: litVM.id,
    query: { enabled: !!address },
  })
  const { data: gmFee } = useReadContract({
    abi: gmAbi,
    address: gmAddress,
    functionName: 'gmFee',
    chainId: litVM.id,
    query: { enabled: true },
  })
  const { data: faucetLastClaim, refetch: refetchFaucet } = useReadContract({
    abi: vbUSDCApi,
    address: vbUSDCAddress,
    functionName: 'lastClaim',
    args: [address!],
    chainId: litVM.id,
    query: { enabled: !!address },
  })
  const { data: claimAmount } = useReadContract({
    abi: vbUSDCApi,
    address: vbUSDCAddress,
    functionName: 'claimAmount',
    chainId: litVM.id,
    query: { enabled: true },
  })
  const { data: faucetFee } = useReadContract({
    abi: vbUSDCApi,
    address: vbUSDCAddress,
    functionName: 'faucetFee',
    chainId: litVM.id,
    query: { enabled: true },
  })
  const { data: swapRate, refetch: refetchRate } = useReadContract({
    abi: swapAbi,
    address: swapAddress,
    functionName: 'getRate',
    chainId: litVM.id,
    query: { enabled: true },
  })
  const { data: vbUSDCReserve, refetch: refetchVbUSDCReserve } = useReadContract({
    abi: swapAbi,
    address: swapAddress,
    functionName: 'getVbUSDCReserve',
    chainId: litVM.id,
    query: { enabled: true },
  })
  const { data: zkLTCReserve, refetch: refetchZkLTCReserve } = useReadContract({
    abi: swapAbi,
    address: swapAddress,
    functionName: 'getZkLTCReserve',
    chainId: litVM.id,
    query: { enabled: true },
  })
  const { data: swapFee } = useReadContract({
    abi: swapAbi,
    address: swapAddress,
    functionName: 'swapFee',
    chainId: litVM.id,
    query: { enabled: true },
  })
  const { data: gameEntryFee } = useReadContract({
    abi: vibeGameAbi,
    address: vibeGameAddress,
    functionName: 'entryFee',
    chainId: litVM.id,
    query: { enabled: isVibeGameDeployed },
  })
  const { data: seasonStartTsData } = useReadContract({
    abi: seasonGameAbi,
    address: seasonGameAddress,
    functionName: 'seasonStart',
    chainId: litVM.id,
    query: { enabled: isSeasonGameDeployed },
  })
  const { data: seasonEndTsData } = useReadContract({
    abi: seasonGameAbi,
    address: seasonGameAddress,
    functionName: 'seasonEnd',
    chainId: litVM.id,
    query: { enabled: isSeasonGameDeployed },
  })
  const { data: seasonNowBlock } = useBlock({ chainId: litVM.id, watch: true })
  const seasonStartTs = seasonStartTsData ? Number(seasonStartTsData) : SEASON0_START
  const seasonEndTs = seasonEndTsData ? Number(seasonEndTsData) : SEASON0_END
  const seasonNow = seasonNowBlock?.timestamp ? Number(seasonNowBlock.timestamp) : Math.floor(Date.now() / 1000)
  const seasonNotStarted = seasonStartTs > seasonNow
  const seasonActive = seasonStartTs <= seasonNow && seasonNow <= seasonEndTs
  const { refetch: refetchGameActiveRun } = useReadContract({
    abi: vibeGameAbi,
    address: vibeGameAddress,
    functionName: 'activeRun',
    args: [address!],
    chainId: litVM.id,
    query: { enabled: isVibeGameDeployed && !!address },
  })
  const { data: gameBestScore, refetch: refetchGameBestScore } = useReadContract({
    abi: vibeGameAbi,
    address: vibeGameAddress,
    functionName: 'bestScore',
    args: [address!],
    chainId: litVM.id,
    query: { enabled: isVibeGameDeployed && !!address },
  })
  const { data: gameTotalScore, refetch: refetchGameTotalScore } = useReadContract({
    abi: vibeGameAbi,
    address: vibeGameAddress,
    functionName: 'totalScore',
    args: [address!],
    chainId: litVM.id,
    query: { enabled: isVibeGameDeployed && !!address },
  })
  const { data: gameMaxBlock, refetch: refetchGameMaxBlock } = useReadContract({
    abi: vibeGameAbi,
    address: vibeGameAddress,
    functionName: 'maxBlock',
    args: [address!],
    chainId: litVM.id,
    query: { enabled: isVibeGameDeployed && !!address },
  })
  const { data: bestCount } = useReadContract({
    abi: vibeGameAbi,
    address: vibeGameAddress,
    functionName: 'getBestScoreCount',
    chainId: litVM.id,
    query: { enabled: isVibeGameDeployed },
  })
  const { data: totalCount } = useReadContract({
    abi: vibeGameAbi,
    address: vibeGameAddress,
    functionName: 'getTotalScoreCount',
    chainId: litVM.id,
    query: { enabled: isVibeGameDeployed },
  })
  const { data: bestTopData, refetch: refetchBestTop } = useReadContract({
    abi: vibeGameAbi,
    address: vibeGameAddress,
    functionName: 'getBestScorePage',
    args: [0n, 10n],
    chainId: litVM.id,
    query: { enabled: isVibeGameDeployed },
  })
  const { data: totalTopData, refetch: refetchTotalTop } = useReadContract({
    abi: vibeGameAbi,
    address: vibeGameAddress,
    functionName: 'getTotalScorePage',
    args: [0n, 10n],
    chainId: litVM.id,
    query: { enabled: isVibeGameDeployed },
  })
  const { data: bestPageData, refetch: refetchBestPage } = useReadContract({
    abi: vibeGameAbi,
    address: vibeGameAddress,
    functionName: 'getBestScorePage',
    args: [BigInt(bestPage * lbPageSize), BigInt(lbPageSize)],
    chainId: litVM.id,
    query: { enabled: isVibeGameDeployed },
  })
  const { data: totalPageData, refetch: refetchTotalPage } = useReadContract({
    abi: vibeGameAbi,
    address: vibeGameAddress,
    functionName: 'getTotalScorePage',
    args: [BigInt(totalPage * lbPageSize), BigInt(lbPageSize)],
    chainId: litVM.id,
    query: { enabled: isVibeGameDeployed },
  })
  const { data: nftMintFee } = useReadContract({
    abi: gmBadgeNFTAbi,
    address: gmBadgeNFTAddress,
    functionName: 'mintFee',
    chainId: litVM.id,
    query: { enabled: isGMBadgeNFTDeployed },
  })
  const { data: nftHolderCounts, refetch: refetchNFTHolders } = useReadContracts({
    contracts: [
      { abi: gmBadgeNFTAbi, address: gmBadgeNFTAddress, functionName: 'holdersCount', args: [1n], chainId: litVM.id },
      { abi: gmBadgeNFTAbi, address: gmBadgeNFTAddress, functionName: 'holdersCount', args: [2n], chainId: litVM.id },
      { abi: gmBadgeNFTAbi, address: gmBadgeNFTAddress, functionName: 'holdersCount', args: [3n], chainId: litVM.id },
    ],
    query: { enabled: isGMBadgeNFTDeployed },
  })
  const { data: nftMinted, refetch: refetchNFTMinted } = useReadContracts({
    contracts: [
      { abi: gmBadgeNFTAbi, address: gmBadgeNFTAddress, functionName: 'hasMinted', args: [address!, 1n], chainId: litVM.id },
      { abi: gmBadgeNFTAbi, address: gmBadgeNFTAddress, functionName: 'hasMinted', args: [address!, 2n], chainId: litVM.id },
      { abi: gmBadgeNFTAbi, address: gmBadgeNFTAddress, functionName: 'hasMinted', args: [address!, 3n], chainId: litVM.id },
    ],
    query: { enabled: isGMBadgeNFTDeployed && !!address },
  })
  const { data: blockNftMintFee } = useReadContract({
    abi: vibeBlockNFTAbi,
    address: vibeBlockNFTAddress,
    functionName: 'mintFee',
    chainId: litVM.id,
    query: { enabled: isVibeBlockNFTDeployed },
  })
  const { data: blockNftMinted, refetch: refetchBlockNftMinted } = useReadContracts({
    contracts: [
      { abi: vibeBlockNFTAbi, address: vibeBlockNFTAddress, functionName: 'hasMinted', args: [address!, 1n], chainId: litVM.id },
      { abi: vibeBlockNFTAbi, address: vibeBlockNFTAddress, functionName: 'hasMinted', args: [address!, 2n], chainId: litVM.id },
      { abi: vibeBlockNFTAbi, address: vibeBlockNFTAddress, functionName: 'hasMinted', args: [address!, 3n], chainId: litVM.id },
      { abi: vibeBlockNFTAbi, address: vibeBlockNFTAddress, functionName: 'hasMinted', args: [address!, 4n], chainId: litVM.id },
    ],
    query: { enabled: isVibeBlockNFTDeployed && !!address },
  })
  const { data: blockNftHolders, refetch: refetchBlockNftHolders } = useReadContracts({
    contracts: [
      { abi: vibeBlockNFTAbi, address: vibeBlockNFTAddress, functionName: 'holdersCount', args: [1n], chainId: litVM.id },
      { abi: vibeBlockNFTAbi, address: vibeBlockNFTAddress, functionName: 'holdersCount', args: [2n], chainId: litVM.id },
      { abi: vibeBlockNFTAbi, address: vibeBlockNFTAddress, functionName: 'holdersCount', args: [3n], chainId: litVM.id },
      { abi: vibeBlockNFTAbi, address: vibeBlockNFTAddress, functionName: 'holdersCount', args: [4n], chainId: litVM.id },
    ],
    query: { enabled: isVibeBlockNFTDeployed },
  })
  const { writeContract: writeFaucet, data: faucetHash, isPending: faucetPending, error: faucetWriteError, reset: resetFaucet } = useWriteContract()
  const { writeContract: writeGM, data: gmHash, isPending: gmPending, error: gmWriteError, reset: resetGM } = useWriteContract()
  const { writeContract: writeApprove, data: approveHash, isPending: approvePending, error: approveWriteError, reset: resetApprove } = useWriteContract()
  const { writeContract: writeSwap, data: swapHash, isPending: swapPending, error: swapWriteError, reset: resetSwap } = useWriteContract()
  const { writeContract: writeGameStart, data: gameStartHash, isPending: gameStartPending, error: gameStartWriteError, reset: resetGameStart } = useWriteContract()
  const { writeContract: writeGameSubmit, data: gameSubmitHash, isPending: gameSubmitPending, error: gameSubmitWriteError, reset: resetGameSubmit } = useWriteContract()
  const { writeContract: writeMint, data: mintHash, isPending: mintPending, error: mintWriteError, reset: resetMint } = useWriteContract()
  const { writeContract: writeReportMaxBlock, data: reportHash, isPending: reportPending, error: reportWriteError, reset: resetReport } = useWriteContract()
  const { writeContract: writeMintBlock, data: mintBlockHash, isPending: mintBlockPending, error: mintBlockWriteError, reset: resetMintBlock } = useWriteContract()
  const { isLoading: faucetConfirming, isSuccess: faucetSuccess, error: faucetReceiptError } = useWaitForTransactionReceipt({ hash: faucetHash, chainId: litVM.id })
  const { isLoading: gmConfirming, isSuccess: gmSuccess, error: gmReceiptError } = useWaitForTransactionReceipt({ hash: gmHash, chainId: litVM.id })
  const { isLoading: approveConfirming, isSuccess: approveSuccess, error: approveReceiptError } = useWaitForTransactionReceipt({ hash: approveHash, chainId: litVM.id })
  const { isLoading: swapConfirming, isSuccess: swapSuccess, error: swapReceiptError } = useWaitForTransactionReceipt({ hash: swapHash, chainId: litVM.id })
  const { isLoading: gameStartConfirming, isSuccess: gameStartSuccess, error: gameStartReceiptError } = useWaitForTransactionReceipt({ hash: gameStartHash, chainId: litVM.id })
  const { isLoading: gameSubmitConfirming, isSuccess: gameSubmitSuccess, error: gameSubmitReceiptError } = useWaitForTransactionReceipt({ hash: gameSubmitHash, chainId: litVM.id })
  const { isLoading: mintConfirming, isSuccess: mintSuccess, error: mintReceiptError } = useWaitForTransactionReceipt({ hash: mintHash, chainId: litVM.id })
  const { isLoading: reportConfirming, isSuccess: reportSuccess, error: reportReceiptError } = useWaitForTransactionReceipt({ hash: reportHash, chainId: litVM.id })
  const { isLoading: mintBlockConfirming, isSuccess: mintBlockSuccess, error: mintBlockReceiptError } = useWaitForTransactionReceipt({ hash: mintBlockHash, chainId: litVM.id })
  const [menuOpen, setMenuOpen] = useState(false)
  const [gmPulsing, setGmPulsing] = useState(false)
  const [pendingSwapAmount, setPendingSwapAmount] = useState<bigint | null>(null)
  const [currentPage, setCurrentPage] = useState<Page>('game')
  const [seasonTab, setSeasonTab] = useState<'overview' | 'play'>('overview')
  const [boardTab, setBoardTab] = useState<'alltime' | 'season'>('alltime')
  const heroRef = useRef<HTMLDivElement>(null)

  const gmStreakNum = gmStreak ? Number(gmStreak) : 0
  const gmTotalNum = gmTotal ? Number(gmTotal) : 0
  const gmClaimed = hasClaimedToday === true
  const gmBadgesNum = gmBadges ? Number(gmBadges) : 0
  const gmFeeValue = gmFee ?? 0n
  const faucetFeeValue = faucetFee ?? 0n
  const swapFeeValue = swapFee ?? 0n
  const gameEntryFeeValue = gameEntryFee ?? 0n
  const gmFeeFormatted = formatEther(gmFeeValue)
  const faucetFeeFormatted = formatEther(faucetFeeValue)
  const swapFeeFormatted = formatEther(swapFeeValue)
  const gameEntryFeeFormatted = formatEther(gameEntryFeeValue)
  const nftMintFeeValue = nftMintFee ?? 0n
  const nftMintFeeFormatted = formatEther(nftMintFeeValue)
  const nftMintedByTier = [false, nftMinted?.[0]?.result === true, nftMinted?.[1]?.result === true, nftMinted?.[2]?.result === true]
  const nftHoldersByTier = [0, nftHolderCounts?.[0]?.result ? Number(nftHolderCounts[0].result) : 0, nftHolderCounts?.[1]?.result ? Number(nftHolderCounts[1].result) : 0, nftHolderCounts?.[2]?.result ? Number(nftHolderCounts[2].result) : 0]
  const vbUSDCFormatted = vbUSDCBalance ? formatUnits(vbUSDCBalance, 6) : '0'
  const zkLTCFormatted = balance ? Number(formatUnits(balance.value, balance.decimals)).toLocaleString(undefined, { maximumFractionDigits: 6 }) : '0'
  const claimAmt = claimAmount ? formatUnits(claimAmount, 6) : '0.5'
  const swapRateNum = swapRate ? Number(swapRate) : 0
  const vbUSDCReserveFormatted = vbUSDCReserve ? formatUnits(vbUSDCReserve, 6) : '0'
  const zkLTCReserveFormatted = zkLTCReserve ? formatUnits(zkLTCReserve, 18) : '0'
  const faucetError = txErrorMessage(faucetWriteError || faucetReceiptError)
  const gmError = txErrorMessage(gmWriteError || gmReceiptError)
  const swapError = txErrorMessage(swapWriteError || swapReceiptError || approveWriteError || approveReceiptError)
  const gameError = txErrorMessage(gameStartWriteError || gameStartReceiptError || gameSubmitWriteError || gameSubmitReceiptError)
  const mintError = txErrorMessage(mintWriteError || mintReceiptError)
  const gameLeaderboard = bestTopData
    ? bestTopData[0]
      .map((player, index) => ({ player, score: Number(bestTopData[1][index]) }))
      .filter(entry => entry.score > 0 && entry.player !== '0x0000000000000000000000000000000000000000')
    : []
  const gameTotalLeaderboard = totalTopData
    ? totalTopData[0]
      .map((player, index) => ({ player, score: Number(totalTopData[1][index]) }))
      .filter(entry => entry.score > 0 && entry.player !== '0x0000000000000000000000000000000000000000')
    : []
  const bestPageEntries = bestPageData
    ? bestPageData[0]
      .map((player, index) => ({ player, score: Number(bestPageData[1][index]) }))
      .filter(entry => entry.score > 0 && entry.player !== '0x0000000000000000000000000000000000000000')
    : []
  const totalPageEntries = totalPageData
    ? totalPageData[0]
      .map((player, index) => ({ player, score: Number(totalPageData[1][index]) }))
      .filter(entry => entry.score > 0 && entry.player !== '0x0000000000000000000000000000000000000000')
    : []
  const bestCountNum = bestCount ? Number(bestCount) : 0
  const totalCountNum = totalCount ? Number(totalCount) : 0
  const gameMaxBlockNum = gameMaxBlock ? Number(gameMaxBlock) : 0
  const blockNftMintFeeValue = blockNftMintFee ?? 0n
  const blockNftMintFeeFormatted = formatEther(blockNftMintFeeValue)
  const blockNftMintedByTier = [false, blockNftMinted?.[0]?.result === true, blockNftMinted?.[1]?.result === true, blockNftMinted?.[2]?.result === true, blockNftMinted?.[3]?.result === true]
  const blockNftMintReady = blockNftMinted !== undefined
  const blockNftHoldersByTier = [0, blockNftHolders?.[0]?.result ? Number(blockNftHolders[0].result) : 0, blockNftHolders?.[1]?.result ? Number(blockNftHolders[1].result) : 0, blockNftHolders?.[2]?.result ? Number(blockNftHolders[2].result) : 0, blockNftHolders?.[3]?.result ? Number(blockNftHolders[3].result) : 0]
  const blockNftError = txErrorMessage(mintBlockWriteError || mintBlockReceiptError || reportWriteError || reportReceiptError)

  const handleGM = () => {
    if (gmClaimed || !onChain || gmPending || gmConfirming) return
    setGmPulsing(true)
    writeGM({ abi: gmAbi, address: gmAddress, functionName: 'gm', args: [], value: gmFeeValue })
    setTimeout(() => setGmPulsing(false), 600)
  }

  const handleMintNFT = (tier: number) => {
    if (!isGMBadgeNFTDeployed || !onChain || mintPending || mintConfirming) return
    writeMint({ abi: gmBadgeNFTAbi, address: gmBadgeNFTAddress, functionName: 'mint', args: [BigInt(tier)], value: nftMintFeeValue })
  }

  const handleFaucet = () => {
    if (!onChain || faucetPending || faucetConfirming) return
    writeFaucet({ abi: vbUSDCApi, address: vbUSDCAddress, functionName: 'faucet', args: [], value: faucetFeeValue })
  }

  const handleSwap = (amountInput: string, direction: SwapDirection) => {
    if (!onChain || approvePending || approveConfirming || swapPending || swapConfirming || !amountInput) return

    if (direction === 'ZKLTC_TO_VBUSDC') {
      const amount = parseEther(amountInput)
      writeSwap({ abi: swapAbi, address: swapAddress, functionName: 'swapExactZkLTCInput', args: [0n], value: amount + swapFeeValue })
      return
    }

    const amount = parseUnits(amountInput, 6)

    if ((vbUSDCAllowance ?? 0n) < amount) {
      setPendingSwapAmount(amount)
      writeApprove({ abi: vbUSDCApi, address: vbUSDCAddress, functionName: 'approve', args: [swapAddress, amount] })
      return
    }

    writeSwap({ abi: swapAbi, address: swapAddress, functionName: 'swapExactInput', args: [amount, 0n], value: swapFeeValue })
  }

  const handleStartRankedRun = () => {
    if (!isVibeGameDeployed || !onChain || gameStartPending || gameStartConfirming) return
    writeGameStart({ abi: vibeGameAbi, address: vibeGameAddress, functionName: 'startRun', args: [], value: gameEntryFeeValue })
  }

  const handleSubmitGameScore = (score: number, maxBlock: number) => {
    if (!isVibeGameDeployed || !onChain || gameSubmitPending || gameSubmitConfirming) return
    writeGameSubmit({ abi: vibeGameAbi, address: vibeGameAddress, functionName: 'submitScore', args: [BigInt(score), BigInt(maxBlock)] })
  }

  const handleMintBlock = (tier: number, maxTile: number) => {
    if (!isVibeBlockNFTDeployed || !onChain || blockMintBusy) return

    if (gameMaxBlockNum < maxTile) {
      setPendingMintTier(tier)
      setBlockMintBusy(true)
      writeReportMaxBlock({ abi: vibeGameAbi, address: vibeGameAddress, functionName: 'reportMaxBlock', args: [BigInt(maxTile)] })
      return
    }

    setBlockMintBusy(true)
    writeMintBlock({ abi: vibeBlockNFTAbi, address: vibeBlockNFTAddress, functionName: 'mint', args: [BigInt(tier)], value: blockNftMintFeeValue })
  }

  const handlePageSizeChange = (size: number) => {
    setLbPageSize(size)
    setBestPage(0)
    setTotalPage(0)
  }

  const refreshContractReads = React.useCallback(async () => {
    await queryClient.invalidateQueries()
  }, [queryClient])

  const refetchGMState = React.useCallback(async () => {
    await Promise.all([
      refetchStreak(),
      refetchTotal(),
      refetchClaimed(),
      refetchBadges(),
    ])
  }, [refetchBadges, refetchClaimed, refetchStreak, refetchTotal])

  React.useEffect(() => {
    if (!onChain || !address) return
    void refetchGMState()
  }, [address, onChain, refetchGMState])

  React.useEffect(() => {
    if (!blockNumber || !onChain || !address) return

    if (gmPending || gmConfirming || gmSuccess) {
      void refetchGMState()
    }
  }, [address, blockNumber, gmConfirming, gmPending, gmSuccess, onChain, refetchGMState])

  // Refetch after tx confirms
  React.useEffect(() => {
    if (!faucetSuccess) return

    void Promise.all([
      refetchVbUSDC(),
      refetchVbUSDCAllowance(),
      refetchFaucet(),
      refetchNativeBalance(),
      refreshContractReads(),
    ])

    const timeout = window.setTimeout(() => resetFaucet(), 2500)
    return () => window.clearTimeout(timeout)
  }, [faucetSuccess, refetchFaucet, refetchNativeBalance, refetchVbUSDC, refetchVbUSDCAllowance, refreshContractReads, resetFaucet])

  React.useEffect(() => {
    if (!gmSuccess) return

    void Promise.all([
      refetchGMState(),
      refetchNativeBalance(),
      refreshContractReads(),
    ])

    const timeout = window.setTimeout(() => resetGM(), 2500)
    return () => window.clearTimeout(timeout)
  }, [gmSuccess, refetchGMState, refetchNativeBalance, refreshContractReads, resetGM])

  React.useEffect(() => {
    if (!approveSuccess || !pendingSwapAmount) return

    void Promise.all([
      refetchVbUSDCAllowance(),
      refreshContractReads(),
    ])

    writeSwap({ abi: swapAbi, address: swapAddress, functionName: 'swapExactInput', args: [pendingSwapAmount, 0n], value: swapFeeValue })
    setPendingSwapAmount(null)

    const timeout = window.setTimeout(() => resetApprove(), 2500)
    return () => window.clearTimeout(timeout)
  }, [approveSuccess, pendingSwapAmount, refetchVbUSDCAllowance, refreshContractReads, resetApprove, swapFeeValue, writeSwap])

  React.useEffect(() => {
    if (!swapSuccess) return

    void Promise.all([
      refetchVbUSDC(),
      refetchVbUSDCAllowance(),
      refetchNativeBalance(),
      refetchRate(),
      refetchVbUSDCReserve(),
      refetchZkLTCReserve(),
      refreshContractReads(),
    ])

    const timeout = window.setTimeout(() => resetSwap(), 2500)
    return () => window.clearTimeout(timeout)
  }, [refetchNativeBalance, refetchRate, refetchVbUSDC, refetchVbUSDCAllowance, refetchVbUSDCReserve, refetchZkLTCReserve, refreshContractReads, resetSwap, swapSuccess])

  React.useEffect(() => {
    if (!gameStartSuccess) return

    void Promise.all([
      refetchGameActiveRun(),
      refetchNativeBalance(),
      refreshContractReads(),
    ])

    const timeout = window.setTimeout(() => resetGameStart(), 2500)
    return () => window.clearTimeout(timeout)
  }, [gameStartSuccess, refetchGameActiveRun, refetchNativeBalance, refreshContractReads, resetGameStart])

  React.useEffect(() => {
    if (!gameSubmitSuccess) return

    void Promise.all([
      refetchGameActiveRun(),
      refetchGameBestScore(),
      refetchGameTotalScore(),
      refetchGameMaxBlock(),
      refetchBestTop(),
      refetchTotalTop(),
      refetchBestPage(),
      refetchTotalPage(),
      refreshContractReads(),
    ])

    const timeout = window.setTimeout(() => resetGameSubmit(), 2500)
    return () => window.clearTimeout(timeout)
  }, [gameSubmitSuccess, refetchGameActiveRun, refetchGameBestScore, refetchGameTotalScore, refetchGameMaxBlock, refetchBestTop, refetchTotalTop, refetchBestPage, refetchTotalPage, refreshContractReads, resetGameSubmit])

  React.useEffect(() => {
    if (!mintSuccess) return

    void Promise.all([
      refetchNFTMinted(),
      refetchNFTHolders(),
      refreshContractReads(),
    ])

    const timeout = window.setTimeout(() => resetMint(), 2500)
    return () => window.clearTimeout(timeout)
  }, [mintSuccess, refetchNFTMinted, refetchNFTHolders, refreshContractReads, resetMint])

  React.useEffect(() => {
    if (!reportSuccess) return

    if (pendingMintTier !== null) {
      const tier = pendingMintTier
      setPendingMintTier(null)
      writeMintBlock({ abi: vibeBlockNFTAbi, address: vibeBlockNFTAddress, functionName: 'mint', args: [BigInt(tier)], value: blockNftMintFeeValue })
    } else {
      setBlockMintBusy(false)
    }

    void refetchGameMaxBlock()

    const timeout = window.setTimeout(() => resetReport(), 2500)
    return () => window.clearTimeout(timeout)
  }, [reportSuccess, pendingMintTier, blockNftMintFeeValue, refetchGameMaxBlock, resetReport, writeMintBlock])

  React.useEffect(() => {
    if (!mintBlockSuccess) return

    setBlockMintBusy(false)

    void Promise.all([
      refetchBlockNftMinted(),
      refetchBlockNftHolders(),
      refreshContractReads(),
    ])

    const timeout = window.setTimeout(() => resetMintBlock(), 2500)
    return () => window.clearTimeout(timeout)
  }, [mintBlockSuccess, refetchBlockNftMinted, refetchBlockNftHolders, refreshContractReads, resetMintBlock])

  React.useEffect(() => {
    if (reportWriteError || reportReceiptError) {
      setBlockMintBusy(false)
      setPendingMintTier(null)
    }
  }, [reportWriteError, reportReceiptError])

  React.useEffect(() => {
    if (mintBlockWriteError || mintBlockReceiptError) {
      setBlockMintBusy(false)
    }
  }, [mintBlockWriteError, mintBlockReceiptError])

  const wrongNetwork = isConnected && chainId !== litVM.id

  const addLitVMToWallet = async () => {
    if (!window.ethereum) return
    try {
      await window.ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [{
          chainId: '0x1159',
          chainName: 'LitVM LiteForge',
          nativeCurrency: { name: 'zkLTC', symbol: 'zkLTC', decimals: 18 },
          rpcUrls: ['https://liteforge.rpc.caldera.xyz/http'],
          blockExplorerUrls: ['https://liteforge.explorer.caldera.xyz/'],
        }],
      })
    } catch (e) {
      console.error(e)
    }
  }

  const navigateTo = (page: Page) => {
    setCurrentPage(page)
    setMenuOpen(false)
  }

  const currentGroup: NavGroup =
    currentPage === 'gm' || currentPage === 'nft'
      ? 'gm'
      : currentPage === 'season'
        ? 'season'
        : currentPage === 'swap' || currentPage === 'faucet'
          ? 'swap'
          : 'vibe'

  const renderSectionTabs = (items: Array<{ page: Page; label: string }>) => (
    <div className="section-tabs" aria-label="Section navigation">
      {items.map(item => (
        <button
          className={`section-tab ${currentPage === item.page ? 'active' : ''}`}
          key={item.page}
          onClick={() => navigateTo(item.page)}
          type="button"
        >
          {item.label}
        </button>
      ))}
    </div>
  )

  const claimedBadges: string[] = []
  if (gmBadgesNum >= 1) claimedBadges.push('3day')
  if (gmBadgesNum >= 2) claimedBadges.push('10day')
  if (gmBadgesNum >= 3) claimedBadges.push('30day')

  const renderPage = () => {
    switch (currentPage) {
      case 'game':
        if (seasonActive) {
          return (
            <section className="section" id="game">
              {renderSectionTabs([
                { page: 'game', label: 'Game' },
                { page: 'leaderboard', label: 'Leaderboard' },
              ])}
              <div className="section-header">
                <h2 className="section-title">
                  <Gamepad2 size={24} />
                  Vibe Blocks
                </h2>
                <p className="section-subtitle">Season 0 is live</p>
              </div>
              <div className="season-game-redirect">
                <p className="season-game-redirect-text">The regular ranked mode is paused during Season 0, so every entry fee goes to the season reward pool.</p>
                <button className="game-action" onClick={() => { setSeasonTab('play'); navigateTo('season') }} type="button">
                  Play Season 0 →
                </button>
              </div>
            </section>
          )
        }
        return (
          <section className="section" id="game">
            {renderSectionTabs([
              { page: 'game', label: 'Game' },
              { page: 'leaderboard', label: 'Leaderboard' },
            ])}
            <div className="section-header">
              <h2 className="section-title">
                <Gamepad2 size={24} />
                Vibe Blocks
              </h2>
              <p className="section-subtitle">Enter ranked onchain runs and climb two leaderboards on LitVM</p>
            </div>
            <VibeBlocks
              isConnected={isConnected}
              wrongNetwork={wrongNetwork}
              onChain={onChain}
              rankedEnabled={isVibeGameDeployed}
              entryFee={gameEntryFeeFormatted}
              bestScore={gameBestScore ? Number(gameBestScore) : 0}
              totalScore={gameTotalScore ? Number(gameTotalScore) : 0}
              bestLeaderboard={gameLeaderboard}
              totalLeaderboard={gameTotalLeaderboard}
              onStartRanked={handleStartRankedRun}
              onSubmitScore={handleSubmitGameScore}
              startPending={gameStartPending || gameStartConfirming}
              startSubmitted={!!gameStartHash}
              submitPending={gameSubmitPending || gameSubmitConfirming}
              submitSuccess={gameSubmitSuccess}
              txUrl={txUrl(gameSubmitHash || gameStartHash)}
              txError={gameError}
              blockNftDeployed={isVibeBlockNFTDeployed}
              mintedByTier={blockNftMintedByTier}
              mintFee={blockNftMintFeeFormatted}
              onMint={handleMintBlock}
              mintPending={blockMintBusy || mintBlockPending || mintBlockConfirming || reportPending || reportConfirming}
              nftReady={blockNftMintReady}
              connectedAddress={address}
              blockNftTxUrl={txUrl(mintBlockHash || reportHash)}
              blockNftTxError={blockNftError}
            />
          </section>
        )
      case 'leaderboard':
        return (
          <section className="section" id="leaderboard">
            {renderSectionTabs([
              { page: 'game', label: 'Game' },
              { page: 'leaderboard', label: 'Leaderboard' },
            ])}
            <div className="section-header">
              <h2 className="section-title">
                <Trophy size={24} />
                Leaderboard
              </h2>
              <p className="section-subtitle">All-time runs and the Season 0 reward leaderboard</p>
            </div>
            <div className="section-tabs board-tabs" aria-label="Leaderboard view">
              <button className={`section-tab ${boardTab === 'alltime' ? 'active' : ''}`} onClick={() => setBoardTab('alltime')} type="button">All-time</button>
              <button className={`section-tab ${boardTab === 'season' ? 'active' : ''}`} onClick={() => setBoardTab('season')} type="button">Season 0</button>
            </div>
            {boardTab === 'alltime' ? (
              <div className="leaderboard-page-grid">
                <LeaderboardCard
                  title="Best Score"
                  entries={bestPageEntries}
                  totalCount={bestCountNum}
                  page={bestPage}
                  pageSize={lbPageSize}
                  connectedAddress={address}
                  onPageChange={setBestPage}
                  onPageSizeChange={handlePageSizeChange}
                />
                <LeaderboardCard
                  title="Total Score"
                  entries={totalPageEntries}
                  totalCount={totalCountNum}
                  page={totalPage}
                  pageSize={lbPageSize}
                  connectedAddress={address}
                  onPageChange={setTotalPage}
                  onPageSizeChange={handlePageSizeChange}
                />
              </div>
            ) : (
              <SeasonLeaderboard />
            )}
          </section>
        )
      case 'season':
        if (seasonNotStarted) {
          return (
            <section className="section season-landing" id="season">
              <SeasonCountdown target={seasonStartTs} />
            </section>
          )
        }
        return (
          <section className="section" id="season">
            <div className="section-tabs" aria-label="Season navigation">
              <button className={`section-tab ${seasonTab === 'overview' ? 'active' : ''}`} onClick={() => setSeasonTab('overview')} type="button">Overview</button>
              <button className={`section-tab ${seasonTab === 'play' ? 'active' : ''}`} onClick={() => setSeasonTab('play')} type="button">Play</button>
              <button className="section-tab" onClick={() => navigateTo('leaderboard')} type="button">Leaderboard →</button>
            </div>
            <div className="section-header">
              <h2 className="section-title">
                <CalendarDays size={24} />
                Season 0
              </h2>
              <p className="section-subtitle">Compete on the seasonal leaderboard for zkLTC rewards</p>
            </div>
            {seasonTab === 'overview' ? <SeasonPanel /> : <SeasonBlocks />}
          </section>
        )
      case 'swap':
        return (
          <section className="section" id="swap">
            {renderSectionTabs([
              { page: 'swap', label: 'Swap' },
              { page: 'faucet', label: 'Faucet' },
            ])}
            <div className="section-header">
              <h2 className="section-title">
                <ArrowRightLeft size={24} />
                Swap Tokens
              </h2>
              <p className="section-subtitle">Swap zkLTC ↔ vbUSDC on LitVM LiteForge</p>
            </div>
            <SwapPanel
              isConnected={isConnected}
              wrongNetwork={wrongNetwork}
              onChain={onChain}
              vbUSDCBalance={vbUSDCFormatted}
              swapRate={swapRateNum}
              onSwap={handleSwap}
              swapPending={approvePending || approveConfirming || swapPending || swapConfirming}
              swapSuccess={swapSuccess}
              vbUSDCReserve={vbUSDCReserveFormatted}
              zkLTCReserve={zkLTCReserveFormatted}
              zkLTCBalance={zkLTCFormatted}
              swapFee={swapFeeFormatted}
              txUrl={txUrl(swapHash || approveHash)}
              txError={swapError}
            />
          </section>
        )
      case 'faucet':
        return (
          <section className="section" id="faucet">
            {renderSectionTabs([
              { page: 'swap', label: 'Swap' },
              { page: 'faucet', label: 'Faucet' },
            ])}
            <div className="section-header">
              <h2 className="section-title">
                <Droplets size={24} />
                Faucet
              </h2>
              <p className="section-subtitle">Get test vbUSDC tokens for swapping</p>
            </div>
            <FaucetPanel
              isConnected={isConnected}
              address={address}
              onChain={onChain}
              onFaucet={handleFaucet}
              faucetPending={faucetPending || faucetConfirming}
              faucetSuccess={faucetSuccess}
              claimAmount={claimAmt}
              faucetFee={faucetFeeFormatted}
              zkLTCBalance={zkLTCFormatted}
              txUrl={txUrl(faucetHash)}
              txError={faucetError}
              lastClaim={faucetLastClaim ? Number(faucetLastClaim) * 1000 : 0}
            />
          </section>
        )
      case 'gm':
        return (
          <section className="section" id="gm">
            {renderSectionTabs([
              { page: 'gm', label: 'GM' },
              { page: 'nft', label: 'Badges' },
            ])}
            <div className="section-header">
              <h2 className="section-title">
                <Flame size={24} />
                GM Activity
              </h2>
              <p className="section-subtitle">Your daily streak and NFT milestones</p>
            </div>
            <GMTracker
              streak={gmStreakNum}
              totalGm={gmTotalNum}
              gmClaimed={gmClaimed}
              onGM={handleGM}
              gmPulsing={gmPulsing}
              onChain={onChain}
              gmPending={gmPending || gmConfirming}
              gmFee={gmFeeFormatted}
              txUrl={txUrl(gmHash)}
              txError={gmError}
              mintedByTier={nftMintedByTier}
              mintFee={nftMintFeeFormatted}
              onMint={handleMintNFT}
              mintPending={mintPending || mintConfirming}
              nftDeployed={isGMBadgeNFTDeployed}
              mintTxUrl={txUrl(mintHash)}
              mintTxError={mintError}
            />
          </section>
        )
      case 'nft':
        return (
          <section className="section" id="nft">
            {renderSectionTabs([
              { page: 'gm', label: 'GM' },
              { page: 'nft', label: 'Badges' },
            ])}
            <div className="section-header">
              <h2 className="section-title">
                <Gift size={24} />
                NFT Badges
              </h2>
              <p className="section-subtitle">Earn illustrated badges by staying active</p>
            </div>
            <NFTGallery
              claimedBadges={claimedBadges}
              mintedByTier={nftMintedByTier}
              holdersByTier={nftHoldersByTier}
              mintFee={nftMintFeeFormatted}
              onMint={handleMintNFT}
              mintPending={mintPending || mintConfirming}
              nftDeployed={isGMBadgeNFTDeployed}
              onChain={onChain}
              txUrl={txUrl(mintHash)}
              txError={mintError}
            />
          </section>
        )
      case 'network':
        return (
          <section className="section" id="network">
            <div className="section-header">
              <h2 className="section-title">
                <ExternalLink size={24} />
                Network Info
              </h2>
              <p className="section-subtitle">LitVM LiteForge connection details and status</p>
            </div>
            <NetworkInfo
              isConnected={isConnected}
              address={address}
              chainId={chainId}
              balance={balance}
              wrongNetwork={wrongNetwork}
              onSwitchNetwork={() => switchChain({ chainId: litVM.id })}
              onAddNetwork={addLitVMToWallet}
            />
          </section>
        )
    }
  }

  return (
    <div className="app">
      <nav className="nav">
        <div className="nav-inner">
          <div className="nav-left">
            <div className="logo" onClick={() => navigateTo('game')} style={{ cursor: 'pointer' }}>
              <Sun size={28} className="logo-icon" />
              <span className="logo-text">Vibeswap</span>
            </div>
          </div>
          <div className="nav-center desktop-only">
            <a href="#season" className={`nav-link season-nav-link ${currentGroup === 'season' ? 'active' : ''}`} onClick={() => navigateTo('season')}>☀️ SEASON</a>
            <a href="#gm" className={`nav-link ${currentGroup === 'gm' ? 'active' : ''}`} onClick={() => navigateTo('gm')}>GM</a>
            <a href="#game" className={`nav-link ${currentGroup === 'vibe' ? 'active' : ''}`} onClick={() => navigateTo('game')}>Vibe</a>
            <a href="#swap" className={`nav-link ${currentGroup === 'swap' ? 'active' : ''}`} onClick={() => navigateTo('swap')}>Swap</a>
          </div>
          <div className="nav-right">
            <button className="add-network-btn" onClick={addLitVMToWallet} title="Add LitVM LiteForge to wallet">
              <ExternalLink size={14} />
              <span>Add to wallet</span>
            </button>
            <button
              className={`gm-button ${gmPulsing ? 'pulsing' : ''} ${gmClaimed ? 'claimed' : ''}`}
              onClick={handleGM}
              disabled={gmClaimed || !onChain}
            >
              <Sparkles size={16} />
              <span>{gmClaimed ? 'GM Done!' : 'Say GM'}</span>
            </button>
            {!isConnected ? (
              <button
                className="connect-btn"
                onClick={() => connect({ connector: connectors[0] })}
                disabled={connecting}
              >
                <Wallet size={16} />
                <span>{connecting ? 'Connecting…' : 'Connect'}</span>
              </button>
            ) : (
              <div className="wallet-info">
                <span className="address">{address?.slice(0, 6)}...{address?.slice(-4)}</span>
                <button className="disconnect-btn" onClick={() => disconnect()}>
                  <LogOut size={14} />
                </button>
              </div>
            )}
            {connectError && (
              <span className="connect-error-tip" title="No wallet detected">⚠️</span>
            )}
            <button className="mobile-menu-btn" onClick={() => setMenuOpen(!menuOpen)}>
              {menuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
        {menuOpen && (
          <div className="mobile-menu">
            <a href="#season" className="season-nav-link" onClick={() => navigateTo('season')}>☀️ SEASON</a>
            <a href="#gm" onClick={() => navigateTo('gm')}>GM</a>
            <a href="#game" onClick={() => navigateTo('game')}>Vibe</a>
            <a href="#swap" onClick={() => navigateTo('swap')}>Swap</a>
          </div>
        )}
      </nav>

      {wrongNetwork && (
        <div className="network-banner">
          <span>Wrong network — switch to LitVM LiteForge</span>
          <button onClick={() => switchChain({ chainId: litVM.id })}>Switch</button>
        </div>
      )}

      <section className="hero" ref={heroRef} id="hero">
        <div className="hero-bg" />
        <div className="hero-content">
          <div className="hero-3d">
            <Suspense fallback={<div className="sun-placeholder"><Sun size={64} /></div>}>
              <SunSphere />
            </Suspense>
          </div>
          <div className="hero-text">
            <h1 className="hero-title">
              Play & <span className="gradient-text">GM</span>
            </h1>
            <p className="hero-subtitle">Onchain arcade, ranked runs, swaps, faucet claims and daily streaks on LitVM</p>
            <div className="hero-stats">
              <div className="stat">
                <span className="stat-value">{gmTotalNum}</span>
                <span className="stat-label">GM Count</span>
              </div>
              <div className="stat-divider" />
              <div className="stat">
                <span className="stat-value">{gmStreakNum}</span>
                <span className="stat-label">Day Streak</span>
              </div>
              <div className="stat-divider" />
              <div className="stat">
                <span className="stat-value">{claimedBadges.length}</span>
                <span className="stat-label">Badges</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {renderPage()}

      <footer className="footer">
        <div className="footer-inner">
          <div className="footer-logo">
            <Sun size={18} />
            <span>Vibeswap</span>
          </div>
          <div className="footer-links">
            <a href={docsUrl} target="_blank" rel="noreferrer">Docs</a>
            <a href={xUrl} target="_blank" rel="noreferrer">X</a>
          </div>
          <p className="footer-credit">Made by <a href="https://dappit.io" target="_blank" rel="noreferrer">dappit.io</a></p>
        </div>
      </footer>
    </div>
  )
}
