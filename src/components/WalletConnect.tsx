import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Wallet, ChevronDown, Copy, ExternalLink, LogOut, Check } from 'lucide-react';
import { useWalletStore } from '../store/walletStore';
import { useLanguageStore } from '../store/languageStore';

const WalletConnect: React.FC = () => {
  const { isConnected, address, balance, connect, disconnect } = useWalletStore();
  const { t } = useLanguageStore();
  const [showDropdown, setShowDropdown] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleConnect = () => {
    connect();
  };

  const handleCopy = () => {
    if (address) {
      navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  if (!isConnected) {
    return (
      <motion.button
        onClick={handleConnect}
        className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-primary to-secondary rounded-xl font-semibold text-white hover:shadow-lg hover:scale-105 transition-all duration-300"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <Wallet className="w-5 h-5" />
        <span>{t.wallet.connect}</span>
      </motion.button>
    );
  }

  return (
    <div className="relative">
      <motion.button
        onClick={() => setShowDropdown(!showDropdown)}
        className="flex items-center space-x-3 px-4 py-3 glass rounded-xl hover:bg-surface/80 transition-all duration-300"
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-gradient-to-r from-primary to-secondary rounded-full flex items-center justify-center">
            <Wallet className="w-4 h-4 text-white" />
          </div>
          <div className="text-left">
            <p className="text-sm font-semibold">{formatAddress(address)}</p>
            <p className="text-xs text-textSecondary">{balance} LIT</p>
          </div>
        </div>
        <ChevronDown className={`w-4 h-4 text-textSecondary transition-transform duration-300 ${showDropdown ? 'rotate-180' : ''}`} />
      </motion.button>

      <AnimatePresence>
        {showDropdown && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="absolute right-0 mt-2 w-64 glass rounded-xl overflow-hidden shadow-xl z-50"
          >
            <div className="p-4 border-b border-border/50">
              <p className="text-xs text-textSecondary mb-2">{t.wallet.address}</p>
              <div className="flex items-center justify-between">
                <p className="text-sm font-mono">{formatAddress(address)}</p>
                <button
                  onClick={handleCopy}
                  className="p-2 hover:bg-surface rounded-lg transition-colors"
                >
                  {copied ? (
                    <Check className="w-4 h-4 text-success" />
                  ) : (
                    <Copy className="w-4 h-4 text-textSecondary" />
                  )}
                </button>
              </div>
            </div>

            <div className="p-4 border-b border-border/50">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-textSecondary">{t.wallet.balance}</span>
                <span className="text-sm font-semibold">{balance} LIT</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-textSecondary">{t.wallet.network}</span>
                <span className="text-sm font-semibold text-success">LitVM</span>
              </div>
            </div>

            <div className="p-2">
              <button
                onClick={() => window.open(`https://explorer.litvm.io/address/${address}`, '_blank')}
                className="w-full flex items-center justify-between px-3 py-2 hover:bg-surface rounded-lg transition-colors text-sm"
              >
                <span>{t.wallet.viewExplorer}</span>
                <ExternalLink className="w-4 h-4 text-textSecondary" />
              </button>
              <button
                onClick={() => {
                  disconnect();
                  setShowDropdown(false);
                }}
                className="w-full flex items-center justify-between px-3 py-2 hover:bg-error/20 rounded-lg transition-colors text-sm text-error"
              >
                <span>{t.wallet.disconnect}</span>
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default WalletConnect;
