import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';
import { AIProvider as AIProviderType, Message, Conversation, AppSettings, ChatContext } from '../types';
import { getAIService, AI_PROVIDERS, SOLANA_SYSTEM_PROMPT } from '../services/ai-providers';
import { chatWithTools } from '../services/ai-with-tools';
import { useSolana } from './SolanaProvider';
import { storage } from '../utils/storage';

interface AIContextType {
  // State
  currentProvider: AIProviderType;
  currentModel: string;
  conversations: Conversation[];
  currentConversation: Conversation | null;
  isLoading: boolean;
  settings: AppSettings;

  // Actions
  setProvider: (provider: AIProviderType) => void;
  setModel: (model: string) => void;
  sendMessage: (content: string) => Promise<void>;
  createNewConversation: () => void;
  selectConversation: (id: string) => void;
  deleteConversation: (id: string) => void;
  updateApiKey: (provider: AIProviderType, key: string) => Promise<void>;
  updateSettings: (settings: Partial<AppSettings>) => Promise<void>;
  hasApiKey: (provider: AIProviderType) => boolean;
}

const AIContext = createContext<AIContextType | null>(null);

const DEFAULT_SETTINGS: AppSettings = {
  apiKeys: {},
  defaultProvider: 'claude',
  theme: 'dark',
  hapticFeedback: true,
  streamResponses: true,
  useTools: true, // Enable Solana blockchain tools
};

export function AIProvider({ children }: { children: ReactNode }) {
  const { wallet } = useSolana();

  const [currentProvider, setCurrentProvider] = useState<AIProviderType>('claude');
  const [currentModel, setCurrentModel] = useState('claude-sonnet-4-20250514');
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);

  // Load settings on mount
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const savedSettings = await storage.getItem('appSettings');
      if (savedSettings) {
        const parsed = JSON.parse(savedSettings);
        setSettings(parsed);
        if (parsed.defaultProvider) {
          setCurrentProvider(parsed.defaultProvider);
          const providerConfig = AI_PROVIDERS[parsed.defaultProvider];
          if (providerConfig.models.length > 0) {
            setCurrentModel(providerConfig.models[0].id);
          }
        }
      }

      // Load conversations
      const savedConvos = await storage.getItem('conversations');
      if (savedConvos) {
        setConversations(JSON.parse(savedConvos));
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const saveSettings = async (newSettings: AppSettings) => {
    try {
      await storage.setItem('appSettings', JSON.stringify(newSettings));
    } catch (error) {
      console.error('Error saving settings:', error);
    }
  };

  const saveConversations = async (convos: Conversation[]) => {
    try {
      await storage.setItem('conversations', JSON.stringify(convos));
    } catch (error) {
      console.error('Error saving conversations:', error);
    }
  };

  const setProvider = useCallback((provider: AIProviderType) => {
    setCurrentProvider(provider);
    const providerConfig = AI_PROVIDERS[provider];
    if (providerConfig.models.length > 0) {
      setCurrentModel(providerConfig.models[0].id);
    }
  }, []);

  const setModel = useCallback((model: string) => {
    setCurrentModel(model);
  }, []);

  const hasApiKey = useCallback((provider: AIProviderType): boolean => {
    return !!settings.apiKeys[provider];
  }, [settings.apiKeys]);

  const createNewConversation = useCallback(() => {
    const newConvo: Conversation = {
      id: Date.now().toString(),
      title: 'New Chat',
      messages: [],
      provider: currentProvider,
      model: currentModel,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    setCurrentConversation(newConvo);
  }, [currentProvider, currentModel]);

  const selectConversation = useCallback((id: string) => {
    const convo = conversations.find(c => c.id === id);
    if (convo) {
      setCurrentConversation(convo);
      setCurrentProvider(convo.provider);
      setCurrentModel(convo.model);
    }
  }, [conversations]);

  const deleteConversation = useCallback((id: string) => {
    const updated = conversations.filter(c => c.id !== id);
    setConversations(updated);
    saveConversations(updated);

    if (currentConversation?.id === id) {
      setCurrentConversation(null);
    }
  }, [conversations, currentConversation]);

  const buildWalletContext = (): string => {
    if (!wallet.connected || !wallet.publicKey) {
      return '';
    }

    return `\n\n[Wallet Context]
- Address: ${wallet.publicKey.slice(0, 8)}...${wallet.publicKey.slice(-8)}
- SOL Balance: ${wallet.balance.toFixed(4)} SOL
- Tokens: ${wallet.tokens.length} SPL tokens`;
  };

  const sendMessage = useCallback(async (content: string) => {
    const apiKey = settings.apiKeys[currentProvider];
    if (!apiKey) {
      throw new Error(`Please add your ${AI_PROVIDERS[currentProvider].name} API key in settings`);
    }

    setIsLoading(true);

    try {
      // Create or update conversation
      let convo = currentConversation;
      if (!convo) {
        convo = {
          id: Date.now().toString(),
          title: content.slice(0, 50) + (content.length > 50 ? '...' : ''),
          messages: [],
          provider: currentProvider,
          model: currentModel,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
      }

      // Add user message
      const userMessage: Message = {
        id: Date.now().toString(),
        role: 'user',
        content,
        timestamp: Date.now(),
      };

      // Build system message with wallet context
      const systemContent = SOLANA_SYSTEM_PROMPT + buildWalletContext();
      const systemMessage: Message = {
        id: 'system',
        role: 'system',
        content: systemContent,
        timestamp: 0,
      };

      const messagesForAPI = [
        systemMessage,
        ...convo.messages,
        userMessage,
      ];

      // Get AI response - use tools for blockchain queries
      let response: string;
      if (settings.useTools !== false) {
        // Use tool-enabled chat for Solana blockchain operations
        response = await chatWithTools(
          currentProvider,
          messagesForAPI,
          currentModel,
          apiKey,
          wallet.publicKey || undefined
        );
      } else {
        // Fallback to basic chat
        const service = getAIService(currentProvider);
        response = await service.chat(messagesForAPI, currentModel, apiKey);
      }

      // Add assistant message
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response,
        provider: currentProvider,
        model: currentModel,
        timestamp: Date.now(),
      };

      // Update conversation
      const updatedConvo: Conversation = {
        ...convo,
        messages: [...convo.messages, userMessage, assistantMessage],
        updatedAt: Date.now(),
      };

      setCurrentConversation(updatedConvo);

      // Update conversations list
      const existingIndex = conversations.findIndex(c => c.id === updatedConvo.id);
      let updatedConvos: Conversation[];

      if (existingIndex >= 0) {
        updatedConvos = [...conversations];
        updatedConvos[existingIndex] = updatedConvo;
      } else {
        updatedConvos = [updatedConvo, ...conversations];
      }

      setConversations(updatedConvos);
      await saveConversations(updatedConvos);

    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [currentProvider, currentModel, currentConversation, conversations, settings.apiKeys, wallet]);

  const updateApiKey = useCallback(async (provider: AIProviderType, key: string) => {
    const newSettings = {
      ...settings,
      apiKeys: {
        ...settings.apiKeys,
        [provider]: key,
      },
    };
    setSettings(newSettings);
    await saveSettings(newSettings);
  }, [settings]);

  const updateSettings = useCallback(async (newSettings: Partial<AppSettings>) => {
    const updated = { ...settings, ...newSettings };
    setSettings(updated);
    await saveSettings(updated);
  }, [settings]);

  return (
    <AIContext.Provider
      value={{
        currentProvider,
        currentModel,
        conversations,
        currentConversation,
        isLoading,
        settings,
        setProvider,
        setModel,
        sendMessage,
        createNewConversation,
        selectConversation,
        deleteConversation,
        updateApiKey,
        updateSettings,
        hasApiKey,
      }}
    >
      {children}
    </AIContext.Provider>
  );
}

export function useAI() {
  const context = useContext(AIContext);
  if (!context) {
    throw new Error('useAI must be used within an AIProvider');
  }
  return context;
}
