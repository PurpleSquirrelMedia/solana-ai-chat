// AI Provider Types
export type AIProvider = 'claude' | 'openai' | 'gemini' | 'doubao';

export interface AIProviderConfig {
  id: AIProvider;
  name: string;
  description: string;
  icon: string;
  models: AIModel[];
  color: string;
}

export interface AIModel {
  id: string;
  name: string;
  contextWindow: number;
  pricing?: {
    input: number;
    output: number;
  };
}

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  provider?: AIProvider;
  model?: string;
  timestamp: number;
  tokens?: {
    input: number;
    output: number;
  };
}

export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  provider: AIProvider;
  model: string;
  createdAt: number;
  updatedAt: number;
}

// Solana Types
export interface WalletState {
  connected: boolean;
  publicKey: string | null;
  balance: number;
  tokens: TokenBalance[];
}

export interface TokenBalance {
  mint: string;
  symbol: string;
  name: string;
  balance: number;
  decimals: number;
  uiBalance: string;
  logoUri?: string;
}

export interface Transaction {
  signature: string;
  type: 'send' | 'receive' | 'swap' | 'other';
  amount: number;
  token?: string;
  timestamp: number;
  status: 'confirmed' | 'pending' | 'failed';
}

// Settings
export interface AppSettings {
  apiKeys: {
    claude?: string;
    openai?: string;
    gemini?: string;
    doubao?: string;
  };
  defaultProvider: AIProvider;
  theme: 'dark' | 'light' | 'system';
  hapticFeedback: boolean;
  streamResponses: boolean;
  useTools: boolean; // Enable Solana blockchain tools (MCP)
}

// Chat Context for AI
export interface ChatContext {
  walletConnected: boolean;
  walletAddress?: string;
  solBalance?: number;
  includeWalletContext: boolean;
}

// Credits System
export type PaymentToken = 'SOL' | 'PURP';

export interface CreditPackage {
  id: string;
  name: string;
  credits: number;
  price: number;
  token: PaymentToken;
  popular?: boolean;
  savings?: string;
}

export interface CreditBalance {
  total: number;
  used: number;
  remaining: number;
  lastPurchase?: number;
}

export interface CreditTransaction {
  id: string;
  type: 'purchase' | 'usage';
  amount: number;
  credits: number;
  token?: PaymentToken;
  signature?: string;
  timestamp: number;
  provider?: AIProvider;
  model?: string;
}
