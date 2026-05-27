import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowDownUp, Settings, Info, Loader2, CheckCircle2 } from 'lucide-react';
import { useContractStore } from '../store/contractStore';
import { useLanguageStore } from '../store/languageStore';

interface Token {
  symbol: string;
  name: string;
  address: string;
  balance: string;
  icon: string;
}

const tokens: Token[] = [
  { symbol: 'LIT', name: 'LitVM Token', address: '0x0000...0000', balance: '1000.00', icon: '⚡' },
  { symbol: 'USDT', name: 'Tether USD', address: '0x1111...1111', balance: '5000.00', icon: '💵' },
  { symbol: 'WETH', name: 'Wrapped Ether', address: '0x2222...2222', balance: '2.5', icon: '💎' },
  { symbol: 'DAI', name: 'Dai Stablecoin', address: '0x3333...3333', balance: '3000.00', icon: '🪙' },
];

const SwapInterface = () => {
  const [fromToken, setFromToken] = useState<Token>(tokens[0]);
  const [toToken, setToToken] = useState<Token>(tokens[1]);
  const [fromAmount, setFromAmount] = useState('');
  const [toAmount, setToAmount] = useState('');
  const [slippage, setSlippage] = useState('0.5');
  const [showSettings, setShowSettings] = useState(false);
  const [isSwapping, setIsSwapping] = useState(false);
  const [swapSuccess, setSwapSuccess] = useState(false);
  
  const { getQuote, swap } = useContractStore();
  const { t } = useLanguageStore();

  useEffect(() => {
    if (fromAmount && parseFloat(fromAmount) > 0) {
      const quote = getQuote(fromToken.address, toToken.address, fromAmount);
      setToAmount(quote);
    } else {
      setToAmount('');
    }
  }, [fromAmount, fromToken, toToken]);

  const handleSwapTokens = () => {
    const temp = fromToken;
    setFromToken(toToken);
    setToToken(temp);
    setFromAmount(toAmount);
  };

  const handleSwap = async () => {
    if (!fromAmount || parseFloat(fromAmount) <= 0) return;
    
    setIsSwapping(true);
    
    // Simulate swap transaction
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const success = swap(fromToken.address, toToken.address, fromAmount, toAmount);
    
    if (success) {
      setSwapSuccess(true);
      setTimeout(() => {
        setSwapSuccess(false);
        setFromAmount('');
        setToAmount('');
      }, 3000);
    }
    
    setIsSwapping(false);
  };

  const priceImpact = fromAmount && toAmount ? '0.12' : '0.00';
  const fee = fromAmount ? (parseFloat(fromAmount) * 0.003).toFixed(4) : '0.00';

  return (
    <div className="max-w-xl mx-auto">
      <motion.div
        className="glass rounded-3xl p-6 glow"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">{t.swap.title}</h2>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-2 hover:bg-surface rounded-xl transition-colors"
          >
            <Settings className="w-5 h-5 text-textSecondary" />
          </button>
        </div>

        {/* Settings panel */}
        {showSettings && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-6 p-4 bg-surface/50 rounded-xl"
          >
            <label className="block text-sm text-textSecondary mb-2">
              {t.swap.slippage}
            </label>
            <div className="flex space-x-2">
              {['0.1', '0.5', '1.0'].map((value) => (
                <button
                  key={value}
                  onClick={() => setSlippage(value)}
                  className={`flex-1 py-2 rounded-lg font-semibold transition-all ${
                    slippage === value
                      ? 'bg-primary text-white'
                      : 'bg-surface text-textSecondary hover:bg-surface/80'
                  }`}
                >
                  {value}%
                </button>
              ))}
              <input
                type="text"
                value={slippage}
                onChange={(e) => setSlippage(e.target.value)}
                className="w-20 px-3 py-2 bg-surface rounded-lg text-center focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Custom"
              />
            </div>
          </motion.div>
        )}

        {/* From token */}
        <div className="mb-2">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-textSecondary">{t.swap.from}</span>
            <span className="text-sm text-textSecondary">
              {t.swap.balance}: {fromToken.balance} {fromToken.symbol}
            </span>
          </div>
          <div className="bg-surface/50 rounded-2xl p-4">
            <div className="flex items-center justify-between">
              <input
                type="text"
                value={fromAmount}
                onChange={(e) => setFromAmount(e.target.value)}
                placeholder="0.0"
                className="bg-transparent text-3xl font-bold outline-none flex-1"
              />
              <button className="flex items-center space-x-2 px-4 py-2 bg-surface rounded-xl hover:bg-surface/80 transition-colors">
                <span className="text-2xl">{fromToken.icon}</span>
                <span className="font-semibold">{fromToken.symbol}</span>
              </button>
            </div>
            <div className="mt-2 text-sm text-textSecondary">
              ≈ ${fromAmount ? (parseFloat(fromAmount) * 1.5).toFixed(2) : '0.00'}
            </div>
          </div>
        </div>

        {/* Swap button */}
        <div className="flex justify-center -my-2 relative z-10">
          <button
            onClick={handleSwapTokens}
            className="p-3 bg-surface rounded-xl hover:bg-primary hover:rotate-180 transition-all duration-300 border-4 border-background"
          >
            <ArrowDownUp className="w-5 h-5" />
          </button>
        </div>

        {/* To token */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-textSecondary">{t.swap.to}</span>
            <span className="text-sm text-textSecondary">
              {t.swap.balance}: {toToken.balance} {toToken.symbol}
            </span>
          </div>
          <div className="bg-surface/50 rounded-2xl p-4">
            <div className="flex items-center justify-between">
              <input
                type="text"
                value={toAmount}
                readOnly
                placeholder="0.0"
                className="bg-transparent text-3xl font-bold outline-none flex-1"
              />
              <button className="flex items-center space-x-2 px-4 py-2 bg-surface rounded-xl hover:bg-surface/80 transition-colors">
                <span className="text-2xl">{toToken.icon}</span>
                <span className="font-semibold">{toToken.symbol}</span>
              </button>
            </div>
            <div className="mt-2 text-sm text-textSecondary">
              ≈ ${toAmount ? (parseFloat(toAmount) * 1.0).toFixed(2) : '0.00'}
            </div>
          </div>
        </div>

        {/* Swap details */}
        {fromAmount && toAmount && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mb-6 p-4 bg-surface/30 rounded-xl space-y-3"
          >
            <div className="flex items-center justify-between text-sm">
              <span className="text-textSecondary">{t.swap.rate}</span>
              <span className="font-semibold">
                1 {fromToken.symbol} = {(parseFloat(toAmount) / parseFloat(fromAmount)).toFixed(4)} {toToken.symbol}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-textSecondary">{t.swap.slippage}</span>
              <span className="font-semibold">{slippage}%</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-textSecondary">{t.swap.priceImpact}</span>
              <span className={`font-semibold ${parseFloat(priceImpact) > 1 ? 'text-warning' : 'text-success'}`}>
                {priceImpact}%
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-textSecondary">{t.swap.fee}</span>
              <span className="font-semibold">{fee} {fromToken.symbol}</span>
            </div>
          </motion.div>
        )}

        {/* Swap button */}
        <button
          onClick={handleSwap}
          disabled={!fromAmount || parseFloat(fromAmount) <= 0 || isSwapping}
          className={`w-full py-4 rounded-xl font-bold text-lg transition-all duration-300 ${
            !fromAmount || parseFloat(fromAmount) <= 0 || isSwapping
              ? 'bg-surface text-textSecondary cursor-not-allowed'
              : swapSuccess
              ? 'bg-success text-white'
              : 'bg-gradient-to-r from-primary to-secondary text-white hover:shadow-lg hover:scale-[1.02]'
          }`}
        >
          {isSwapping ? (
            <span className="flex items-center justify-center space-x-2">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>{t.swap.swapping}</span>
            </span>
          ) : swapSuccess ? (
            <span className="flex items-center justify-center space-x-2">
              <CheckCircle2 className="w-5 h-5" />
              <span>{t.swap.swapSuccess}</span>
            </span>
          ) : (
            t.swap.swapButton
          )}
        </button>

        {/* Info */}
        <div className="mt-4 flex items-start space-x-2 p-3 bg-primary/10 rounded-xl">
          <Info className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
          <p className="text-sm text-textSecondary">
            {t.swap.info}
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default SwapInterface;
