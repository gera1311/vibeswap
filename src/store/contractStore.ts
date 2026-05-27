import { create } from 'zustand';

interface ContractState {
  getQuote: (tokenIn: string, tokenOut: string, amountIn: string) => string;
  swap: (tokenIn: string, tokenOut: string, amountIn: string, minAmountOut: string) => boolean;
  addLiquidity: (tokenA: string, tokenB: string, amountA: string, amountB: string) => boolean;
  removeLiquidity: (tokenA: string, tokenB: string, liquidity: string) => boolean;
}

export const useContractStore = create<ContractState>(() => ({
  getQuote: (tokenIn: string, tokenOut: string, amountIn: string) => {
    // Simulate AMM quote calculation
    const amount = parseFloat(amountIn);
    if (isNaN(amount) || amount <= 0) return '0';
    
    // Mock exchange rate with some randomness
    const rate = 0.95 + Math.random() * 0.1;
    const output = (amount * rate).toFixed(6);
    
    return output;
  },
  
  swap: (tokenIn: string, tokenOut: string, amountIn: string, minAmountOut: string) => {
    // Simulate swap transaction
    console.log('Swap:', { tokenIn, tokenOut, amountIn, minAmountOut });
    return true;
  },
  
  addLiquidity: (tokenA: string, tokenB: string, amountA: string, amountB: string) => {
    // Simulate add liquidity transaction
    console.log('Add Liquidity:', { tokenA, tokenB, amountA, amountB });
    return true;
  },
  
  removeLiquidity: (tokenA: string, tokenB: string, liquidity: string) => {
    // Simulate remove liquidity transaction
    console.log('Remove Liquidity:', { tokenA, tokenB, liquidity });
    return true;
  },
}));
