import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { triggerHaptic } from '../src/utils/haptics';
import {
  ChatMessage,
  ChatInput,
  ProviderSelector,
  WalletButton,
  WalletSheet,
  BuyCreditsSheet,
  BottomNav,
} from '../src/components';
import { useAI } from '../src/providers/AIProvider';
import { useSolana } from '../src/providers/SolanaProvider';
import { useCredits } from '../src/providers/CreditsProvider';
import { AI_PROVIDERS } from '../src/services/ai-providers';

export default function ChatScreen() {
  const router = useRouter();
  const flatListRef = useRef<FlatList>(null);

  const {
    currentProvider,
    currentModel,
    currentConversation,
    isLoading,
    sendMessage,
    createNewConversation,
    hasApiKey,
  } = useAI();
  const { wallet } = useSolana();
  const { balance: creditsBalance } = useCredits();

  const [showProviderSelector, setShowProviderSelector] = useState(false);
  const [showWalletSheet, setShowWalletSheet] = useState(false);
  const [showBuyCreditsSheet, setShowBuyCreditsSheet] = useState(false);

  const provider = AI_PROVIDERS[currentProvider];

  useEffect(() => {
    // Scroll to bottom when new messages arrive
    if (currentConversation?.messages.length) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [currentConversation?.messages.length]);

  const handleSend = async (content: string) => {
    try {
      await sendMessage(content);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to send message');
    }
  };

  const handleNewChat = () => {
    triggerHaptic();
    createNewConversation();
  };

  const hasKey = hasApiKey(currentProvider);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>🐿️ Solana AI</Text>
        </View>

        <View style={styles.headerRight}>
          <WalletButton onPress={() => setShowWalletSheet(true)} />
        </View>
      </View>

      {/* Chat Area */}
      {!currentConversation?.messages.length ? (
        // Empty State
        <View style={styles.emptyState}>
          <Text style={styles.welcomeText}>What can I help you with?</Text>

          {wallet.connected && (
            <View style={styles.walletBadge}>
              <View style={styles.walletDot} />
              <Text style={styles.walletText}>
                {wallet.balance.toFixed(2)} SOL connected
              </Text>
            </View>
          )}

          {creditsBalance.remaining > 0 && (
            <TouchableOpacity
              style={styles.creditsBadge}
              onPress={() => setShowBuyCreditsSheet(true)}
            >
              <Text style={styles.creditsIcon}>💎</Text>
              <Text style={styles.creditsText}>
                {creditsBalance.remaining.toLocaleString()} credits
              </Text>
            </TouchableOpacity>
          )}

          {!hasKey && (
            <View style={styles.accessCard}>
              <Text style={styles.accessTitle}>🔑 Get Started</Text>
              <Text style={styles.accessText}>
                Choose how you want to access {provider.name}:
              </Text>

              {/* Option 1: Bring Your Own Key */}
              <TouchableOpacity
                style={styles.accessOption}
                onPress={() => router.push('/settings')}
              >
                <Text style={styles.accessOptionIcon}>🔧</Text>
                <View style={styles.accessOptionContent}>
                  <Text style={styles.accessOptionTitle}>Bring Your Own Key</Text>
                  <Text style={styles.accessOptionDesc}>Free • Use your existing API key</Text>
                </View>
                <Text style={styles.accessOptionArrow}>→</Text>
              </TouchableOpacity>

              {/* Option 2: Buy Credits with SOL/PURP */}
              <TouchableOpacity
                style={[styles.accessOption, styles.accessOptionHighlight]}
                onPress={() => setShowBuyCreditsSheet(true)}
              >
                <Text style={styles.accessOptionIcon}>💎</Text>
                <View style={styles.accessOptionContent}>
                  <Text style={styles.accessOptionTitle}>Buy Credits</Text>
                  <Text style={styles.accessOptionDesc}>Pay with SOL or PURP tokens</Text>
                </View>
                <Text style={styles.accessOptionArrow}>→</Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.suggestions}>
            <Text style={styles.suggestionsTitle}>Try asking about:</Text>
            {[
              'What is Solana and how does it work?',
              'Explain SPL tokens and how to swap them',
              'Best DeFi strategies on Solana in 2025',
              'How to mint NFTs on Solana',
            ].map((suggestion, index) => (
              <TouchableOpacity
                key={index}
                style={styles.suggestionChip}
                onPress={() => hasKey && handleSend(suggestion)}
                disabled={!hasKey}
              >
                <Text style={styles.suggestionText}>{suggestion}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      ) : (
        // Chat Messages
        <FlatList
          ref={flatListRef}
          data={currentConversation.messages}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <ChatMessage message={item} />}
          contentContainerStyle={styles.messagesList}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <TouchableOpacity style={styles.newChatButton} onPress={handleNewChat}>
              <Text style={styles.newChatButtonText}>+ New Chat</Text>
            </TouchableOpacity>
          }
        />
      )}

      {/* Model Selector + Input */}
      <View style={styles.inputArea}>
        <TouchableOpacity
          style={[styles.modelSelector, { borderColor: provider.color }]}
          onPress={() => setShowProviderSelector(true)}
        >
          <Text style={styles.modelSelectorIcon}>{provider.icon}</Text>
          <Text style={styles.modelSelectorText}>
            {AI_PROVIDERS[currentProvider].models.find(m => m.id === currentModel)?.name}
          </Text>
          <Text style={styles.modelSelectorChevron}>▼</Text>
        </TouchableOpacity>
        <ChatInput onSend={handleSend} isLoading={isLoading} disabled={!hasKey} />
      </View>

      {/* Modals */}
      <ProviderSelector
        visible={showProviderSelector}
        onClose={() => setShowProviderSelector(false)}
      />
      <WalletSheet
        visible={showWalletSheet}
        onClose={() => setShowWalletSheet(false)}
      />
      <BuyCreditsSheet
        visible={showBuyCreditsSheet}
        onClose={() => setShowBuyCreditsSheet(false)}
      />

      <BottomNav />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a2e',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  inputArea: {
    borderTopWidth: 1,
    borderTopColor: '#1a1a2e',
  },
  modelSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: '#1a1a2e',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 12,
    marginBottom: 4,
    borderWidth: 1,
    gap: 6,
  },
  modelSelectorIcon: {
    fontSize: 14,
  },
  modelSelectorText: {
    color: '#aaa',
    fontSize: 13,
    fontWeight: '500',
  },
  modelSelectorChevron: {
    color: '#666',
    fontSize: 10,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: '600',
    color: '#888',
    marginBottom: 24,
    textAlign: 'center',
  },
  walletBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(20, 241, 149, 0.1)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 24,
  },
  walletDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#14F195',
    marginRight: 8,
  },
  walletText: {
    color: '#14F195',
    fontSize: 14,
    fontWeight: '500',
  },
  creditsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(153, 69, 255, 0.15)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(153, 69, 255, 0.3)',
  },
  creditsIcon: {
    fontSize: 14,
    marginRight: 8,
  },
  creditsText: {
    color: '#9945FF',
    fontSize: 14,
    fontWeight: '600',
  },
  accessCard: {
    backgroundColor: 'rgba(153, 69, 255, 0.1)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    width: '100%',
    borderWidth: 1,
    borderColor: 'rgba(153, 69, 255, 0.3)',
  },
  accessTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  accessText: {
    color: '#aaa',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 16,
  },
  accessOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a2e',
    padding: 16,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#2a2a4e',
  },
  accessOptionHighlight: {
    backgroundColor: 'rgba(20, 241, 149, 0.1)',
    borderColor: 'rgba(20, 241, 149, 0.3)',
  },
  accessOptionIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  accessOptionContent: {
    flex: 1,
  },
  accessOptionTitle: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  accessOptionDesc: {
    color: '#888',
    fontSize: 12,
  },
  accessOptionArrow: {
    color: '#9945FF',
    fontSize: 18,
    fontWeight: '600',
  },
  suggestions: {
    width: '100%',
  },
  suggestionsTitle: {
    color: '#888',
    fontSize: 14,
    marginBottom: 12,
    textAlign: 'center',
  },
  suggestionChip: {
    backgroundColor: '#1a1a2e',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#2a2a4e',
  },
  suggestionText: {
    color: '#fff',
    fontSize: 14,
  },
  messagesList: {
    paddingVertical: 16,
  },
  newChatButton: {
    alignSelf: 'center',
    backgroundColor: '#1a1a2e',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    marginBottom: 16,
  },
  newChatButtonText: {
    color: '#9945FF',
    fontSize: 13,
    fontWeight: '600',
  },
});
