import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { Platform } from 'react-native';
import { Connection, PublicKey, LAMPORTS_PER_SOL, Transaction, SystemProgram } from '@solana/web3.js';
import { WalletState, TokenBalance } from '../types';
import { storage } from '../utils/storage';

// Conditionally import mobile wallet adapter (not available on web)
let transact: any = null;
let Web3MobileWallet: any = null;

if (Platform.OS !== 'web') {
  const mwa = require('@solana-mobile/mobile-wallet-adapter-protocol-web3js');
  transact = mwa.transact;
  Web3MobileWallet = mwa.Web3MobileWallet;
}

const RPC_ENDPOINT = 'https://api.mainnet-beta.solana.com';
const APP_IDENTITY = {
  name: 'Solana AI Chat',
  uri: 'https://solana-ai-chat.app',
  icon: 'favicon.ico',
};

interface SolanaContextType {
  wallet: WalletState;
  connecting: boolean;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  refreshBalance: () => Promise<void>;
  sendSol: (recipient: string, amount: number) => Promise<string>;
  signMessage: (message: string) => Promise<string>;
}

const SolanaContext = createContext<SolanaContextType | null>(null);

export function SolanaProvider({ children }: { children: ReactNode }) {
  const [wallet, setWallet] = useState<WalletState>({
    connected: false,
    publicKey: null,
    balance: 0,
    tokens: [],
  });
  const [connecting, setConnecting] = useState(false);
  const [authToken, setAuthToken] = useState<string | null>(null);

  const connection = new Connection(RPC_ENDPOINT, 'confirmed');

  // Load saved wallet state
  useEffect(() => {
    loadSavedWallet();
  }, []);

  const loadSavedWallet = async () => {
    try {
      const savedPubkey = await storage.getItem('walletPubkey');
      const savedToken = await storage.getItem('authToken');

      if (savedPubkey && savedToken) {
        setAuthToken(savedToken);
        setWallet(prev => ({
          ...prev,
          connected: true,
          publicKey: savedPubkey,
        }));
        // Refresh balance in background
        fetchBalance(savedPubkey);
      }
    } catch (error) {
      console.error('Error loading saved wallet:', error);
    }
  };

  const fetchBalance = async (pubkeyStr: string) => {
    try {
      const pubkey = new PublicKey(pubkeyStr);
      const balance = await connection.getBalance(pubkey);
      const solBalance = balance / LAMPORTS_PER_SOL;

      setWallet(prev => ({
        ...prev,
        balance: solBalance,
      }));

      // Fetch token balances
      const tokenAccounts = await connection.getParsedTokenAccountsByOwner(pubkey, {
        programId: new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'),
      });

      const tokens: TokenBalance[] = tokenAccounts.value.map(account => {
        const info = account.account.data.parsed.info;
        return {
          mint: info.mint,
          symbol: 'SPL', // Would need metadata lookup for actual symbol
          name: 'SPL Token',
          balance: info.tokenAmount.amount,
          decimals: info.tokenAmount.decimals,
          uiBalance: info.tokenAmount.uiAmountString,
        };
      });

      setWallet(prev => ({
        ...prev,
        tokens,
      }));
    } catch (error) {
      console.error('Error fetching balance:', error);
    }
  };

  const connect = useCallback(async () => {
    if (connecting) return;
    setConnecting(true);

    try {
      // On web, show a message that wallet connect requires mobile
      if (Platform.OS === 'web') {
        // For demo purposes on web, we can simulate a connection with a test wallet
        const demoWallet = 'DemoWa11etAddressForWebTesting111111111111';
        await storage.setItem('walletPubkey', demoWallet);
        await storage.setItem('authToken', 'demo-token');

        setAuthToken('demo-token');
        setWallet({
          connected: true,
          publicKey: demoWallet,
          balance: 0,
          tokens: [],
        });

        console.log('Web demo mode: Use on Solana Seeker for real wallet connection');
        return;
      }

      const result = await transact(async (mobileWallet: any) => {
        // Authorize the app
        const authResult = await mobileWallet.authorize({
          cluster: 'mainnet-beta',
          identity: APP_IDENTITY,
        });

        return {
          publicKey: authResult.accounts[0].address,
          authToken: authResult.auth_token,
        };
      });

      // Save to storage
      await storage.setItem('walletPubkey', result.publicKey);
      await storage.setItem('authToken', result.authToken);

      setAuthToken(result.authToken);
      setWallet({
        connected: true,
        publicKey: result.publicKey,
        balance: 0,
        tokens: [],
      });

      // Fetch balance
      await fetchBalance(result.publicKey);
    } catch (error) {
      console.error('Error connecting wallet:', error);
      throw error;
    } finally {
      setConnecting(false);
    }
  }, [connecting]);

  const disconnect = useCallback(async () => {
    try {
      if (authToken && Platform.OS !== 'web' && transact) {
        await transact(async (mobileWallet: any) => {
          await mobileWallet.deauthorize({ auth_token: authToken });
        });
      }
    } catch (error) {
      console.error('Error deauthorizing:', error);
    }

    // Clear stored data
    await storage.deleteItem('walletPubkey');
    await storage.deleteItem('authToken');

    setAuthToken(null);
    setWallet({
      connected: false,
      publicKey: null,
      balance: 0,
      tokens: [],
    });
  }, [authToken]);

  const refreshBalance = useCallback(async () => {
    if (wallet.publicKey) {
      await fetchBalance(wallet.publicKey);
    }
  }, [wallet.publicKey]);

  const sendSol = useCallback(async (recipient: string, amount: number): Promise<string> => {
    if (!wallet.publicKey || !authToken) {
      throw new Error('Wallet not connected');
    }

    const signature = await transact(async (mobileWallet: Web3MobileWallet) => {
      // Reauthorize if needed
      await mobileWallet.authorize({
        cluster: 'mainnet-beta',
        identity: APP_IDENTITY,
        auth_token: authToken,
      });

      const senderPubkey = new PublicKey(wallet.publicKey!);
      const recipientPubkey = new PublicKey(recipient);

      // Create transaction
      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: senderPubkey,
          toPubkey: recipientPubkey,
          lamports: amount * LAMPORTS_PER_SOL,
        })
      );

      // Get latest blockhash
      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = senderPubkey;

      // Sign and send
      const signedTxs = await mobileWallet.signAndSendTransactions({
        transactions: [transaction],
      });

      return signedTxs[0];
    });

    // Refresh balance after transaction
    setTimeout(() => refreshBalance(), 2000);

    return signature;
  }, [wallet.publicKey, authToken, connection, refreshBalance]);

  const signMessage = useCallback(async (message: string): Promise<string> => {
    if (!wallet.publicKey || !authToken) {
      throw new Error('Wallet not connected');
    }

    const signature = await transact(async (mobileWallet: Web3MobileWallet) => {
      await mobileWallet.authorize({
        cluster: 'mainnet-beta',
        identity: APP_IDENTITY,
        auth_token: authToken,
      });

      const encodedMessage = new TextEncoder().encode(message);
      const signedMessages = await mobileWallet.signMessages({
        addresses: [wallet.publicKey!],
        payloads: [encodedMessage],
      });

      return Buffer.from(signedMessages[0]).toString('base64');
    });

    return signature;
  }, [wallet.publicKey, authToken]);

  return (
    <SolanaContext.Provider
      value={{
        wallet,
        connecting,
        connect,
        disconnect,
        refreshBalance,
        sendSol,
        signMessage,
      }}
    >
      {children}
    </SolanaContext.Provider>
  );
}

export function useSolana() {
  const context = useContext(SolanaContext);
  if (!context) {
    throw new Error('useSolana must be used within a SolanaProvider');
  }
  return context;
}
