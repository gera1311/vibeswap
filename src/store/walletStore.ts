import { create } from 'zustand';

interface WalletState {
  isConnected: boolean;
  address: string;
  balance: string;
  connect: () => void;
  disconnect: () => void;
}

export const useWalletStore = create<WalletState>((set) => ({
  isConnected: false,
  address: '',
  balance: '0.00',
  connect: () => {
    // Simulate wallet connection
    const mockAddress = '0x' + Math.random().toString(16).substring(2, 42);
    const mockBalance = (Math.random() * 1000).toFixed(2);
    
    set({
      isConnected: true,
      address: mockAddress,
      balance: mockBalance,
    });
  },
  disconnect: () => {
    set({
      isConnected: false,
      address: '',
      balance: '0.00',
    });
  },
}));
