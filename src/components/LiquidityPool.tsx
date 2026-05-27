import { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Minus, Info, Loader2, CheckCircle2 } from 'lucide-react';
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

const LiquidityPool = () => {
  const [mode, setMode] = useState<'add' | 'remove'>('add');
  const [tokenA, setTokenA] = useState<Token>(tokens[0]);
  const [tokenB, setTokenB] = useState<Token>(tokens[1]);
  const [amountA, setAmountA] = useState('');
  const [amountB, setAmountB] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [success, setSuccess] = useState(false);
  
  const { addLiquidity, removeLiquidity } = useContractStore();
  const { t } = useLanguageStore();

  const handleProcess = async () => {
    if (!amountA || !amountB || parseFloat(amountA) <= 0 || parseFloat(amountB) <= 0) return;
    
    setIsProcessing(true);
    
    // Simulate transaction
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const result = mode === 'add' 
      ? addLiquidity(tokenA.address, tokenB.address, amountA, amountB)
      : removeLiquidity(tokenA.address, tokenB.address, amountA);
    
    if (result) {
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        setAmountA('');
        setAmountB('');
      }, 3000);
    }
    
    setIsProcessing(false);
  };

  const shareOfPool = amountA && amountB ? '2.45' : '0.00';
  const lpTokens = amountA && amountB ? (parseFloat(amountA) * parseFloat(amountB) * 0.1).toFixed(4) : '0.00';

  return (
    <div className="max-w-xl mx-auto">
      <motion.div
        className="glass rounded-3xl p-6 glow"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
      >
        {/* Header with mode toggle */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold mb-4">{t.liquidity.title}</h2>
          <div className="flex space-x-2 p-1 bg-surface/50 rounded-xl">
            <button
              onClick={() => setMode('add')}
              className={`flex-1 py-3 rounded-lg font-semibold transition-all ${
                mode === 'add'
                  ? 'bg-gradient-to-r from-primary to-secondary text-white'
                  : 'text-textSecondary hover:text-white'
              }`}
            >
              <Plus className="w-5 h-5 inline mr-2" />
              {t.liquidity.add}
            </button>
            <button
              onClick={() => setMode('remove')}
              className={`flex-1 py-3 rounded-lg font-semibold transition-all ${
                mode === 'remove'
                  ? 'bg-gradient-to-r from-primary to-secondary text-white'
                  : 'text-textSecondary hover:text-white'
              }`}
            >
              <Minus className="w-5 h-5 inline mr-2" />
              {t.liquidity.remove}
            </button>
          </div>
        </div>

        {/* Token A input */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-textSecondary">{t.liquidity.tokenA}</span>
            <span className="text-sm text-textSecondary">
              {t.swap.balance}: {tokenA.balance} {tokenA.symbol}
            </span>
          </div>
          <div className="bg-surface/50 rounded-2xl p-4">
            <div className="flex items-center justify-between">
              <input
                type="text"
                value={amountA}
                onChange={(e) => setAmountA(e.target.value)}
                placeholder="0.0"
                className="bg-transparent text-3xl font-bold outline-none flex-1"
              />
              <button className="flex items-center space-x-2 px-4 py-2 bg-surface rounded-xl hover:bg-surface/80 transition-colors">
                <span className="text-2xl">{tokenA.icon}</span>
                <span className="font-semibold">{tokenA.symbol}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Plus icon */}
        <div className="flex justify-center my-4">
          <div className="p-2 bg-surface rounded-xl">
            <Plus className="w-5 h-5 text-textSecondary" />
          </div>
        </div>

        {/* Token B input */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-textSecondary">{t.liquidity.tokenB}</span>
            <span className="text-sm text-textSecondary">
              {t.swap.balance}: {tokenB.balance} {tokenB.symbol}
            </span>
          </div>
          <div className="bg-surface/50 rounded-2xl p-4">
            <div className="flex items-center justify-between">
              <input
                type="text"
                value={amountB}
                onChange={(e) => setAmountB(e.target.value)}
                placeholder="0.0"
                className="bg-transparent text-3xl font-bold outline-none flex-1"
              />
              <button className="flex items-center space-x-2 px-4 py-2 bg-surface rounded-xl hover:bg-surface/80 transition-colors">
                <span className="text-2xl">{tokenB.icon}</span>
                <span className="font-semibold">{tokenB.symbol}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Pool details */}
        {amountA && amountB && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mb-6 p-4 bg-surface/30 rounded-xl space-y-3"
          >
            <div className="flex items-center justify-between text-sm">
              <span className="text-textSecondary">{t.liquidity.rate}</span>
              <span className="font-semibold">
                1 {tokenA.symbol} = {(parseFloat(amountB) / parseFloat(amountA)).toFixed(4)} {tokenB.symbol}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-textSecondary">{t.liquidity.poolShare}</span>
              <span className="font-semibold text-primary">{shareOfPool}%</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-textSecondary">{t.liquidity.lpTokens}</span>
              <span className="font-semibold">{lpTokens}</span>
            </div>
          </motion.div>
        )}

        {/* Action button */}
        <button
          onClick={handleProcess}
          disabled={!amountA || !amountB || parseFloat(amountA) <= 0 || parseFloat(amountB) <= 0 || isProcessing}
          className={`w-full py-4 rounded-xl font-bold text-lg transition-all duration-300 ${
            !amountA || !amountB || parseFloat(amountA) <= 0 || parseFloat(amountB) <= 0 || isProcessing
              ? 'bg-surface text-textSecondary cursor-not-allowed'
              : success
              ? 'bg-success text-white'
              : 'bg-gradient-to-r from-primary to-secondary text-white hover:shadow-lg hover:scale-[1.02]'
          }`}
        >
          {isProcessing ? (
            <span className="flex items-center justify-center space-x-2">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>{t.liquidity.processing}</span>
            </span>
          ) : success ? (
            <span className="flex items-center justify-center space-x-2">
              <CheckCircle2 className="w-5 h-5" />
              <span>{t.liquidity.success}</span>
            </span>
          ) : mode === 'add' ? (
            t.liquidity.addButton
          ) : (
            t.liquidity.removeButton
          )}
        </button>

        {/* Info */}
        <div className="mt-4 flex items-start space-x-2 p-3 bg-primary/10 rounded-xl">
          <Info className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
          <p className="text-sm text-textSecondary">
            {mode === 'add' ? t.liquidity.addInfo : t.liquidity.removeInfo}
          </p>
        </div>
      </motion.div>

      {/* Your liquidity positions */}
      <motion.div
        className="glass rounded-3xl p-6 mt-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
      >
        <h3 className="text-xl font-bold mb-4">{t.liquidity.yourPositions}</h3>
        <div className="space-y-3">
          {[
            { pair: 'LIT/USDT', liquidity: '1,234.56', share: '2.45%', earned: '12.34' },
            { pair: 'WETH/DAI', liquidity: '5,678.90', share: '1.23%', earned: '45.67' },
          ].map((position, index) => (
            <div key={index} className="p-4 bg-surface/50 rounded-xl hover:bg-surface/70 transition-colors">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <div className="flex -space-x-2">
                    <div className="w-8 h-8 bg-gradient-to-r from-primary to-secondary rounded-full flex items-center justify-center text-sm">
                      ⚡
                    </div>
                    <div className="w-8 h-8 bg-gradient-to-r from-secondary to-accent rounded-full flex items-center justify-center text-sm">
                      💵
                    </div>
                  </div>
                  <span className="font-semibold">{position.pair}</span>
                </div>
                <span className="text-sm text-success">+{position.earned} USD</span>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-textSecondary mb-1">{t.stats.totalLiquidity}</p>
                  <p className="font-semibold">${position.liquidity}</p>
                </div>
                <div>
                  <p className="text-textSecondary mb-1">{t.liquidity.poolShare}</p>
                  <p className="font-semibold">{position.share}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
};

export default LiquidityPool;
