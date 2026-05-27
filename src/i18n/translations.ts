export const translations = {
  en: {
    // Header
    header: {
      title: 'VIBESWAP',
      subtitle: 'Decentralized Exchange',
    },
    
    // Wallet
    wallet: {
      connect: 'Connect Wallet',
      disconnect: 'Disconnect',
      address: 'Wallet Address',
      balance: 'Balance',
      network: 'Network',
      viewExplorer: 'View in Explorer',
    },
    
    // Stats
    stats: {
      totalVolume: 'Total Volume',
      totalLiquidity: 'Total Liquidity',
      activePools: 'Active Pools',
      totalTVL: 'Total TVL',
      volume24h: 'Volume 24h',
      fees24h: 'Fees 24h',
      avgAPR: 'Average APR',
    },
    
    // Tabs
    tabs: {
      swap: 'Swap',
      liquidity: 'Liquidity',
      stats: 'Statistics',
    },
    
    // Swap
    swap: {
      title: 'Swap Tokens',
      from: 'From',
      to: 'To',
      balance: 'Balance',
      slippage: 'Slippage Tolerance (%)',
      rate: 'Rate',
      priceImpact: 'Price Impact',
      fee: 'Fee (0.3%)',
      swapButton: 'Swap',
      swapping: 'Swapping...',
      swapSuccess: 'Swap Successful!',
      info: 'Swaps are executed through an automated market maker (AMM) with a 0.3% fee distributed to liquidity providers.',
    },
    
    // Liquidity
    liquidity: {
      title: 'Manage Liquidity',
      add: 'Add',
      remove: 'Remove',
      tokenA: 'Token A',
      tokenB: 'Token B',
      rate: 'Rate',
      poolShare: 'Pool Share',
      lpTokens: 'LP Tokens',
      addButton: 'Add Liquidity',
      removeButton: 'Remove Liquidity',
      processing: 'Processing...',
      success: 'Success!',
      yourPositions: 'Your Positions',
      earned: 'Earned',
      addInfo: 'By adding liquidity, you receive LP tokens and earn 0.3% fees from all swaps in this pool.',
      removeInfo: 'When removing liquidity, you burn LP tokens and receive your share of tokens from the pool.',
    },
    
    // Pool Stats
    poolStats: {
      title: 'Liquidity Pool Statistics',
      pair: 'Pair',
      tvl: 'TVL',
      volume24h: 'Volume 24h',
      volume7d: 'Volume 7d',
      fees24h: 'Fees 24h',
      apr: 'APR',
      change24h: 'Change 24h',
    },
    
    // Footer
    footer: {
      rights: '© 2025 VIBESWAP. All rights reserved.',
      docs: 'Documentation',
      github: 'GitHub',
      support: 'Support',
    },
    
    // Connect Prompt
    connectPrompt: {
      title: 'Connect Wallet',
      description: 'Connect your wallet to use VIBESWAP',
    },
  },
  
  ru: {
    // Header
    header: {
      title: 'VIBESWAP',
      subtitle: 'Децентрализованная биржа',
    },
    
    // Wallet
    wallet: {
      connect: 'Подключить кошелек',
      disconnect: 'Отключить',
      address: 'Адрес кошелька',
      balance: 'Баланс',
      network: 'Сеть',
      viewExplorer: 'Посмотреть в Explorer',
    },
    
    // Stats
    stats: {
      totalVolume: 'Общий объем',
      totalLiquidity: 'Общая ликвидность',
      activePools: 'Активные пулы',
      totalTVL: 'Общий TVL',
      volume24h: 'Объем 24ч',
      fees24h: 'Комиссии 24ч',
      avgAPR: 'Средний APR',
    },
    
    // Tabs
    tabs: {
      swap: 'Обмен',
      liquidity: 'Ликвидность',
      stats: 'Статистика',
    },
    
    // Swap
    swap: {
      title: 'Обмен токенов',
      from: 'Отдаете',
      to: 'Получаете',
      balance: 'Баланс',
      slippage: 'Допустимое проскальзывание (%)',
      rate: 'Курс',
      priceImpact: 'Влияние на цену',
      fee: 'Комиссия (0.3%)',
      swapButton: 'Обменять',
      swapping: 'Обмен...',
      swapSuccess: 'Обмен выполнен!',
      info: 'Обмен происходит через автоматизированный маркет-мейкер (AMM) с комиссией 0.3%, которая распределяется между поставщиками ликвидности.',
    },
    
    // Liquidity
    liquidity: {
      title: 'Управление ликвидностью',
      add: 'Добавить',
      remove: 'Вывести',
      tokenA: 'Токен A',
      tokenB: 'Токен B',
      rate: 'Курс',
      poolShare: 'Доля в пуле',
      lpTokens: 'LP токены',
      addButton: 'Добавить ликвидность',
      removeButton: 'Вывести ликвидность',
      processing: 'Обработка...',
      success: 'Успешно!',
      yourPositions: 'Ваши позиции',
      earned: 'Заработано',
      addInfo: 'Добавляя ликвидность, вы получаете LP токены и зарабатываете 0.3% комиссии со всех обменов в этом пуле.',
      removeInfo: 'При выводе ликвидности вы сжигаете LP токены и получаете обратно свою долю токенов из пула.',
    },
    
    // Pool Stats
    poolStats: {
      title: 'Статистика пулов ликвидности',
      pair: 'Пара',
      tvl: 'TVL',
      volume24h: 'Объем 24ч',
      volume7d: 'Объем 7д',
      fees24h: 'Комиссии 24ч',
      apr: 'APR',
      change24h: 'Изменение 24ч',
    },
    
    // Footer
    footer: {
      rights: '© 2025 VIBESWAP. Все права защищены.',
      docs: 'Документация',
      github: 'GitHub',
      support: 'Поддержка',
    },
    
    // Connect Prompt
    connectPrompt: {
      title: 'Подключите кошелек',
      description: 'Для использования VIBESWAP необходимо подключить кошелек',
    },
  },
};

export type Language = keyof typeof translations;
export type TranslationKey = typeof translations.en;
