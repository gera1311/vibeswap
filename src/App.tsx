import { useState } from 'react';
import { motion } from 'framer-motion';
import { Wallet, TrendingUp, Droplets, BarChart3, Zap } from 'lucide-react';
import WalletConnect from './components/WalletConnect';
import SwapInterface from './components/SwapInterface';
import LiquidityPool from './components/LiquidityPool';
import PoolStats from './components/PoolStats';
import LanguageSwitcher from './components/LanguageSwitcher';
import { useWalletStore } from './store/walletStore';
import { useLanguageStore } from './store/languageStore';

function App() {
  const [activeTab, setActiveTab] = useState<'swap' | 'liquidity' | 'stats'>('swap');
  const { isConnected } = useWalletStore();
  const { t } = useLanguageStore();

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl animate-float"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-secondary/20 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }}></div>
        <div className="absolute top-1/2 left-1/2 w-96 h-96 bg-accent/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '4s' }}></div>
      </div>

      {/* Header */}
      <header className="relative z-50 border-b border-border/50 backdrop-blur-xl bg-surface/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            <motion.div
              className="flex items-center space-x-3"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-primary to-secondary rounded-xl blur-lg opacity-50"></div>
                <div className="relative bg-gradient-to-r from-primary to-secondary p-3 rounded-xl">
                  <Zap className="w-6 h-6 text-white" />
                </div>
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
                  {t.header.title}
                </h1>
                <p className="text-xs text-textSecondary">{t.header.subtitle}</p>
              </div>
            </motion.div>

            <div className="flex items-center space-x-4">
              <LanguageSwitcher />
              <WalletConnect />
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Stats cards */}
        <motion.div
          className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <div className="glass rounded-2xl p-6 glow-hover transition-all duration-300">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-primary/20 rounded-xl">
                <TrendingUp className="w-6 h-6 text-primary" />
              </div>
              <span className="text-success text-sm font-semibold">+12.5%</span>
            </div>
            <h3 className="text-textSecondary text-sm mb-1">{t.stats.totalVolume}</h3>
            <p className="text-2xl font-bold">$24.8M</p>
          </div>

          <div className="glass rounded-2xl p-6 glow-hover transition-all duration-300">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-secondary/20 rounded-xl">
                <Droplets className="w-6 h-6 text-secondary" />
              </div>
              <span className="text-success text-sm font-semibold">+8.3%</span>
            </div>
            <h3 className="text-textSecondary text-sm mb-1">{t.stats.totalLiquidity}</h3>
            <p className="text-2xl font-bold">$156.2M</p>
          </div>

          <div className="glass rounded-2xl p-6 glow-hover transition-all duration-300">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-accent/20 rounded-xl">
                <BarChart3 className="w-6 h-6 text-accent" />
              </div>
              <span className="text-success text-sm font-semibold">+15.7%</span>
            </div>
            <h3 className="text-textSecondary text-sm mb-1">{t.stats.activePools}</h3>
            <p className="text-2xl font-bold">42</p>
          </div>
        </motion.div>

        {/* Tab navigation */}
        <motion.div
          className="flex items-center justify-center mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <div className="glass rounded-2xl p-2 inline-flex space-x-2">
            <button
              onClick={() => setActiveTab('swap')}
              className={`px-6 py-3 rounded-xl font-semibold transition-all duration-300 ${
                activeTab === 'swap'
                  ? 'bg-gradient-to-r from-primary to-secondary text-white shadow-lg'
                  : 'text-textSecondary hover:text-white'
              }`}
            >
              {t.tabs.swap}
            </button>
            <button
              onClick={() => setActiveTab('liquidity')}
              className={`px-6 py-3 rounded-xl font-semibold transition-all duration-300 ${
                activeTab === 'liquidity'
                  ? 'bg-gradient-to-r from-primary to-secondary text-white shadow-lg'
                  : 'text-textSecondary hover:text-white'
              }`}
            >
              {t.tabs.liquidity}
            </button>
            <button
              onClick={() => setActiveTab('stats')}
              className={`px-6 py-3 rounded-xl font-semibold transition-all duration-300 ${
                activeTab === 'stats'
                  ? 'bg-gradient-to-r from-primary to-secondary text-white shadow-lg'
                  : 'text-textSecondary hover:text-white'
              }`}
            >
              {t.tabs.stats}
            </button>
          </div>
        </motion.div>

        {/* Content area */}
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
        >
          {!isConnected && activeTab !== 'stats' ? (
            <div className="glass rounded-3xl p-12 text-center max-w-2xl mx-auto">
              <div className="mb-6">
                <div className="inline-flex p-6 bg-primary/20 rounded-full mb-4">
                  <Wallet className="w-12 h-12 text-primary" />
                </div>
                <h2 className="text-3xl font-bold mb-3">{t.connectPrompt.title}</h2>
                <p className="text-textSecondary text-lg">
                  {t.connectPrompt.description}
                </p>
              </div>
            </div>
          ) : (
            <>
              {activeTab === 'swap' && <SwapInterface />}
              {activeTab === 'liquidity' && <LiquidityPool />}
              {activeTab === 'stats' && <PoolStats />}
            </>
          )}
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-border/50 backdrop-blur-xl bg-surface/30 mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between">
            <p className="text-textSecondary text-sm mb-4 md:mb-0">
              {t.footer.rights}
            </p>
            <div className="flex items-center space-x-6">
              <a href="#" className="text-textSecondary hover:text-primary transition-colors text-sm">
                {t.footer.docs}
              </a>
              <a href="#" className="text-textSecondary hover:text-primary transition-colors text-sm">
                {t.footer.github}
              </a>
              <a href="#" className="text-textSecondary hover:text-primary transition-colors text-sm">
                {t.footer.support}
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
