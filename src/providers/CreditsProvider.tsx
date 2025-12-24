import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { Platform } from 'react-native';
import { PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL, Connection } from '@solana/web3.js';
import { CreditBalance, CreditPackage, CreditTransaction, PaymentToken } from '../types';
import { useSolana } from './SolanaProvider';
import { storage } from '../utils/storage';

// PURP Token mint address (placeholder - replace with actual PURP token mint)
const PURP_MINT = 'PURPvHhLS5YJxAVDc9P5rFMVWZPQa8q9P3qVY8qJZJJ';

// Treasury wallet to receive payments
const TREASURY_WALLET = '9WzDXwBbmPdCBoccYHjkKxPFPdwJBKZQTm8D9P3CZqJV';

// Credit packages available for purchase
export const CREDIT_PACKAGES: CreditPackage[] = [
  {
    id: 'starter-sol',
    name: 'Starter',
    credits: 100,
    price: 0.01,
    token: 'SOL',
  },
  {
    id: 'basic-sol',
    name: 'Basic',
    credits: 500,
    price: 0.04,
    token: 'SOL',
    savings: '20% off',
  },
  {
    id: 'pro-sol',
    name: 'Pro',
    credits: 1500,
    price: 0.10,
    token: 'SOL',
    popular: true,
    savings: '33% off',
  },
  {
    id: 'unlimited-sol',
    name: 'Unlimited',
    credits: 5000,
    price: 0.25,
    token: 'SOL',
    savings: '50% off',
  },
  // PURP packages (same credits, different pricing)
  {
    id: 'starter-purp',
    name: 'Starter',
    credits: 100,
    price: 100,
    token: 'PURP',
  },
  {
    id: 'basic-purp',
    name: 'Basic',
    credits: 500,
    price: 400,
    token: 'PURP',
    savings: '20% off',
  },
  {
    id: 'pro-purp',
    name: 'Pro',
    credits: 1500,
    price: 1000,
    token: 'PURP',
    popular: true,
    savings: '33% off',
  },
  {
    id: 'unlimited-purp',
    name: 'Unlimited',
    credits: 5000,
    price: 2500,
    token: 'PURP',
    savings: '50% off',
  },
];

// Cost per AI request in credits
export const CREDIT_COSTS = {
  claude: { 'claude-sonnet-4-20250514': 2, 'claude-3-5-haiku-20241022': 1 },
  openai: { 'gpt-4o': 3, 'gpt-4o-mini': 1 },
  gemini: { 'gemini-1.5-pro': 2, 'gemini-1.5-flash': 1 },
  doubao: { 'doubao-1.5-pro': 2, 'doubao-1.5-lite': 1 },
};

interface CreditsContextType {
  balance: CreditBalance;
  transactions: CreditTransaction[];
  isLoading: boolean;
  purchaseCredits: (packageId: string) => Promise<string>;
  useCredits: (provider: string, model: string) => Promise<boolean>;
  hasEnoughCredits: (provider: string, model: string) => boolean;
  getPackagesByToken: (token: PaymentToken) => CreditPackage[];
}

const CreditsContext = createContext<CreditsContextType | null>(null);

const DEFAULT_BALANCE: CreditBalance = {
  total: 0,
  used: 0,
  remaining: 0,
};

export function CreditsProvider({ children }: { children: ReactNode }) {
  const { wallet, sendSol } = useSolana();
  const [balance, setBalance] = useState<CreditBalance>(DEFAULT_BALANCE);
  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Load saved credits on mount
  useEffect(() => {
    loadCredits();
  }, []);

  const loadCredits = async () => {
    try {
      const savedBalance = await storage.getItem('creditBalance');
      const savedTransactions = await storage.getItem('creditTransactions');

      if (savedBalance) {
        setBalance(JSON.parse(savedBalance));
      }
      if (savedTransactions) {
        setTransactions(JSON.parse(savedTransactions));
      }
    } catch (error) {
      console.error('Error loading credits:', error);
    }
  };

  const saveCredits = async (newBalance: CreditBalance, newTransactions: CreditTransaction[]) => {
    try {
      await storage.setItem('creditBalance', JSON.stringify(newBalance));
      await storage.setItem('creditTransactions', JSON.stringify(newTransactions));
    } catch (error) {
      console.error('Error saving credits:', error);
    }
  };

  const getPackagesByToken = useCallback((token: PaymentToken): CreditPackage[] => {
    return CREDIT_PACKAGES.filter(pkg => pkg.token === token);
  }, []);

  const purchaseCredits = useCallback(async (packageId: string): Promise<string> => {
    const pkg = CREDIT_PACKAGES.find(p => p.id === packageId);
    if (!pkg) {
      throw new Error('Invalid package');
    }

    if (!wallet.connected || !wallet.publicKey) {
      throw new Error('Please connect your wallet first');
    }

    setIsLoading(true);

    try {
      let signature: string;

      if (pkg.token === 'SOL') {
        // Send SOL to treasury
        signature = await sendSol(TREASURY_WALLET, pkg.price);
      } else {
        // For PURP tokens, we'd need to implement SPL token transfer
        // For now, simulate the transaction
        signature = `purp_${Date.now()}_${Math.random().toString(36).slice(2)}`;
        console.log('PURP payment simulated - implement SPL token transfer for production');
      }

      // Record the transaction
      const transaction: CreditTransaction = {
        id: Date.now().toString(),
        type: 'purchase',
        amount: pkg.price,
        credits: pkg.credits,
        token: pkg.token,
        signature,
        timestamp: Date.now(),
      };

      // Update balance
      const newBalance: CreditBalance = {
        total: balance.total + pkg.credits,
        used: balance.used,
        remaining: balance.remaining + pkg.credits,
        lastPurchase: Date.now(),
      };

      const newTransactions = [transaction, ...transactions];

      setBalance(newBalance);
      setTransactions(newTransactions);
      await saveCredits(newBalance, newTransactions);

      return signature;
    } catch (error) {
      console.error('Error purchasing credits:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [wallet, balance, transactions, sendSol]);

  const getCreditCost = (provider: string, model: string): number => {
    const providerCosts = CREDIT_COSTS[provider as keyof typeof CREDIT_COSTS];
    if (!providerCosts) return 1;
    return providerCosts[model as keyof typeof providerCosts] || 1;
  };

  const hasEnoughCredits = useCallback((provider: string, model: string): boolean => {
    const cost = getCreditCost(provider, model);
    return balance.remaining >= cost;
  }, [balance.remaining]);

  const useCredits = useCallback(async (provider: string, model: string): Promise<boolean> => {
    const cost = getCreditCost(provider, model);

    if (balance.remaining < cost) {
      return false;
    }

    // Deduct credits
    const newBalance: CreditBalance = {
      ...balance,
      used: balance.used + cost,
      remaining: balance.remaining - cost,
    };

    // Record usage transaction
    const transaction: CreditTransaction = {
      id: Date.now().toString(),
      type: 'usage',
      amount: 0,
      credits: -cost,
      timestamp: Date.now(),
      provider: provider as any,
      model,
    };

    const newTransactions = [transaction, ...transactions];

    setBalance(newBalance);
    setTransactions(newTransactions);
    await saveCredits(newBalance, newTransactions);

    return true;
  }, [balance, transactions]);

  return (
    <CreditsContext.Provider
      value={{
        balance,
        transactions,
        isLoading,
        purchaseCredits,
        useCredits,
        hasEnoughCredits,
        getPackagesByToken,
      }}
    >
      {children}
    </CreditsContext.Provider>
  );
}

export function useCredits() {
  const context = useContext(CreditsContext);
  if (!context) {
    throw new Error('useCredits must be used within a CreditsProvider');
  }
  return context;
}
