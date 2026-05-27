import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Activity, DollarSign } from 'lucide-react';
import { useLanguageStore } from '../store/languageStore';

interface PoolData {
  pair: string;
  tvl: string;
  volume24h: string;
  volume7d: string;
  fees24h: string;
  apr: string;
  change24h: number;
}

const poolsData: PoolData[] = [
  { pair: 'LIT/USDT', tvl: '45.2M', volume24h: '12.3M', volume7d: '89.4M', fees24h: '36.9K', apr: '24.5', change24h: 12.5 },
  { pair: 'WETH/DAI', tvl: '38.7M', volume24h: '8.9M', volume7d: '67.2M', fees24h: '26.7K', apr: '18.3', change24h: 8.3 },
  { pair: 'LIT/WETH', tvl: '32.1M', volume24h: '6.5M', volume7d: '45.8M', fees24h: '19.5K', apr: '21.7', change24h: -3.2 },
  { pair: 'USDT/DAI', tvl: '28.4M', volume24h: '15.2M', volume7d: '102.6M', fees24h: '45.6K', apr: '32.1', change24h: 15.8 },
  { pair: 'LIT/DAI', tvl: '11.8M', volume24h: '2.1M', volume7d: '14.7M', fees24h: '6.3K', apr: '12.4', change24h: -1.5 },
];

const PoolStats = () => {
  const { t } = useLanguageStore();

  return (
    <div className="max-w-7xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <h2 className="text-3xl font-bold mb-8">{t.poolStats.title}</h2>

        {/* Overview cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="glass rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-primary/20 rounded-xl">
                <DollarSign className="w-6 h-6 text-primary" />
              </div>
            </div>
            <h3 className="text-textSecondary text-sm mb-1">{t.stats.totalTVL}</h3>
            <p className="text-3xl font-bold">$156.2M</p>
            <p className="text-success text-sm mt-2">+8.3% 24h</p>
          </div>

          <div className="glass rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-secondary/20 rounded-xl">
                <Activity className="w-6 h-6 text-secondary" />
              </div>
            </div>
            <h3 className="text-textSecondary text-sm mb-1">{t.stats.volume24h}</h3>
            <p className="text-3xl font-bold">$45.0M</p>
            <p className="text-success text-sm mt-2">+12.5% 24h</p>
          </div>

          <div className="glass rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-accent/20 rounded-xl">
                <TrendingUp className="w-6 h-6 text-accent" />
              </div>
            </div>
            <h3 className="text-textSecondary text-sm mb-1">{t.stats.fees24h}</h3>
            <p className="text-3xl font-bold">$135.0K</p>
            <p className="text-success text-sm mt-2">+10.2% 24h</p>
          </div>

          <div className="glass rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-success/20 rounded-xl">
                <Activity className="w-6 h-6 text-success" />
              </div>
            </div>
            <h3 className="text-textSecondary text-sm mb-1">{t.stats.avgAPR}</h3>
            <p className="text-3xl font-bold">21.8%</p>
            <p className="text-success text-sm mt-2">+2.1% 7d</p>
          </div>
        </div>

        {/* Pools table */}
        <div className="glass rounded-3xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border/50">
                  <th className="text-left p-6 text-textSecondary font-semibold">{t.poolStats.pair}</th>
                  <th className="text-right p-6 text-textSecondary font-semibold">{t.poolStats.tvl}</th>
                  <th className="text-right p-6 text-textSecondary font-semibold">{t.poolStats.volume24h}</th>
                  <th className="text-right p-6 text-textSecondary font-semibold">{t.poolStats.volume7d}</th>
                  <th className="text-right p-6 text-textSecondary font-semibold">{t.poolStats.fees24h}</th>
                  <th className="text-right p-6 text-textSecondary font-semibold">{t.poolStats.apr}</th>
                  <th className="text-right p-6 text-textSecondary font-semibold">{t.poolStats.change24h}</th>
                </tr>
              </thead>
              <tbody>
                {poolsData.map((pool, index) => (
                  <motion.tr
                    key={pool.pair}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                    className="border-b border-border/30 hover:bg-surface/30 transition-colors"
                  >
                    <td className="p-6">
                      <div className="flex items-center space-x-3">
                        <div className="flex -space-x-2">
                          <div className="w-8 h-8 bg-gradient-to-r from-primary to-secondary rounded-full flex items-center justify-center text-sm">
                            ⚡
                          </div>
                          <div className="w-8 h-8 bg-gradient-to-r from-secondary to-accent rounded-full flex items-center justify-center text-sm">
                            💵
                          </div>
                        </div>
                        <span className="font-semibold">{pool.pair}</span>
                      </div>
                    </td>
                    <td className="p-6 text-right font-semibold">${pool.tvl}</td>
                    <td className="p-6 text-right">${pool.volume24h}</td>
                    <td className="p-6 text-right text-textSecondary">${pool.volume7d}</td>
                    <td className="p-6 text-right text-success">${pool.fees24h}</td>
                    <td className="p-6 text-right">
                      <span className="px-3 py-1 bg-primary/20 text-primary rounded-lg font-semibold">
                        {pool.apr}%
                      </span>
                    </td>
                    <td className="p-6 text-right">
                      <div className={`flex items-center justify-end space-x-1 ${pool.change24h >= 0 ? 'text-success' : 'text-error'}`}>
                        {pool.change24h >= 0 ? (
                          <TrendingUp className="w-4 h-4" />
                        ) : (
                          <TrendingDown className="w-4 h-4" />
                        )}
                        <span className="font-semibold">{Math.abs(pool.change24h)}%</span>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default PoolStats;
