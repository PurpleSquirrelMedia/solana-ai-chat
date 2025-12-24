import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Switch,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAI } from '../src/providers/AIProvider';
import { useCredits } from '../src/providers/CreditsProvider';
import { useSolana } from '../src/providers/SolanaProvider';
import { AI_PROVIDERS } from '../src/services/ai-providers';
import { AIProvider } from '../src/types';
import { BuyCreditsSheet, BottomNav } from '../src/components';
import { triggerHaptic } from '../src/utils/haptics';

export default function SettingsScreen() {
  const router = useRouter();
  const { settings, updateApiKey, updateSettings } = useAI();
  const { balance: creditsBalance, transactions } = useCredits();
  const { wallet } = useSolana();

  const [showBuyCreditsSheet, setShowBuyCreditsSheet] = useState(false);

  const [apiKeys, setApiKeys] = useState({
    claude: settings.apiKeys.claude || '',
    openai: settings.apiKeys.openai || '',
    gemini: settings.apiKeys.gemini || '',
    doubao: settings.apiKeys.doubao || '',
  });

  const [showKey, setShowKey] = useState<Record<string, boolean>>({});

  const handleSaveKey = async (provider: AIProvider) => {
    triggerHaptic();
    await updateApiKey(provider, apiKeys[provider]);
    Alert.alert('Saved', `${AI_PROVIDERS[provider].name} API key saved securely`);
  };

  const toggleShowKey = (provider: string) => {
    setShowKey(prev => ({ ...prev, [provider]: !prev[provider] }));
  };

  const providers = Object.values(AI_PROVIDERS);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Settings</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Credits Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Credits</Text>
          <Text style={styles.sectionDescription}>
            Purchase credits to use AI without API keys
          </Text>

          <View style={styles.creditsCard}>
            <View style={styles.creditsHeader}>
              <Text style={styles.creditsIcon}>💎</Text>
              <View style={styles.creditsInfo}>
                <Text style={styles.creditsLabel}>Available Credits</Text>
                <Text style={styles.creditsValue}>
                  {creditsBalance.remaining.toLocaleString()}
                </Text>
              </View>
            </View>

            {creditsBalance.total > 0 && (
              <View style={styles.creditsStats}>
                <View style={styles.creditsStat}>
                  <Text style={styles.creditsStatLabel}>Total Purchased</Text>
                  <Text style={styles.creditsStatValue}>
                    {creditsBalance.total.toLocaleString()}
                  </Text>
                </View>
                <View style={styles.creditsStat}>
                  <Text style={styles.creditsStatLabel}>Used</Text>
                  <Text style={styles.creditsStatValue}>
                    {creditsBalance.used.toLocaleString()}
                  </Text>
                </View>
              </View>
            )}

            <TouchableOpacity
              style={styles.buyCreditsButton}
              onPress={() => {
                triggerHaptic();
                setShowBuyCreditsSheet(true);
              }}
            >
              <Text style={styles.buyCreditsButtonText}>
                {creditsBalance.remaining > 0 ? 'Buy More Credits' : 'Buy Credits'}
              </Text>
            </TouchableOpacity>

            {wallet.connected && (
              <Text style={styles.walletConnected}>
                Wallet: {wallet.publicKey?.slice(0, 6)}...{wallet.publicKey?.slice(-4)} • {wallet.balance.toFixed(4)} SOL
              </Text>
            )}
          </View>

          {transactions.length > 0 && (
            <View style={styles.recentTransactions}>
              <Text style={styles.recentTitle}>Recent Activity</Text>
              {transactions.slice(0, 3).map((tx) => (
                <View key={tx.id} style={styles.transactionRow}>
                  <Text style={styles.transactionType}>
                    {tx.type === 'purchase' ? '➕' : '➖'}{' '}
                    {tx.type === 'purchase' ? 'Purchased' : 'Used'}
                  </Text>
                  <Text style={styles.transactionCredits}>
                    {tx.type === 'purchase' ? '+' : ''}{tx.credits} credits
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* API Keys Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>API Keys</Text>
          <Text style={styles.sectionDescription}>
            Enter your API keys for each provider. Keys are stored securely on your device.
          </Text>

          {providers.map((provider) => (
            <View key={provider.id} style={styles.apiKeyCard}>
              <View style={styles.apiKeyHeader}>
                <Text style={styles.providerIcon}>{provider.icon}</Text>
                <View>
                  <Text style={styles.providerName}>{provider.name}</Text>
                  <Text style={styles.providerDescription}>{provider.description}</Text>
                </View>
              </View>

              <View style={styles.inputRow}>
                <TextInput
                  style={styles.input}
                  placeholder={`Enter ${provider.name} API key...`}
                  placeholderTextColor="#666"
                  value={apiKeys[provider.id]}
                  onChangeText={(text) =>
                    setApiKeys((prev) => ({ ...prev, [provider.id]: text }))
                  }
                  secureTextEntry={!showKey[provider.id]}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <TouchableOpacity
                  style={styles.showButton}
                  onPress={() => toggleShowKey(provider.id)}
                >
                  <Text style={styles.showButtonText}>
                    {showKey[provider.id] ? '🙈' : '👁'}
                  </Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={[
                  styles.saveButton,
                  { backgroundColor: provider.color },
                ]}
                onPress={() => handleSaveKey(provider.id)}
              >
                <Text style={styles.saveButtonText}>Save Key</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>

        {/* Preferences Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Preferences</Text>

          <View style={styles.preferenceRow}>
            <View>
              <Text style={styles.preferenceName}>Haptic Feedback</Text>
              <Text style={styles.preferenceDescription}>
                Vibration on button presses
              </Text>
            </View>
            <Switch
              value={settings.hapticFeedback}
              onValueChange={(value) => updateSettings({ hapticFeedback: value })}
              trackColor={{ false: '#2a2a4e', true: '#9945FF' }}
              thumbColor="#fff"
            />
          </View>

          <View style={styles.preferenceRow}>
            <View>
              <Text style={styles.preferenceName}>Stream Responses</Text>
              <Text style={styles.preferenceDescription}>
                Show AI responses as they're generated
              </Text>
            </View>
            <Switch
              value={settings.streamResponses}
              onValueChange={(value) => updateSettings({ streamResponses: value })}
              trackColor={{ false: '#2a2a4e', true: '#9945FF' }}
              thumbColor="#fff"
            />
          </View>

          <View style={styles.preferenceRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.preferenceName}>Solana Tools (MCP)</Text>
              <Text style={styles.preferenceDescription}>
                AI can query blockchain: balances, transactions, NFTs, prices
              </Text>
            </View>
            <Switch
              value={settings.useTools !== false}
              onValueChange={(value) => updateSettings({ useTools: value })}
              trackColor={{ false: '#2a2a4e', true: '#14F195' }}
              thumbColor="#fff"
            />
          </View>
        </View>

        {/* About Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>

          <View style={styles.aboutCard}>
            <Text style={styles.aboutTitle}>Solana AI Chat</Text>
            <Text style={styles.aboutVersion}>Version 1.0.0</Text>
            <Text style={styles.aboutDescription}>
              A multi-AI chat app built for Solana Seeker, featuring Claude, OpenAI,
              Gemini, and Doubao with native wallet integration.
            </Text>

            <View style={styles.aboutLinks}>
              <Text style={styles.aboutLink}>Built for Solana Mobile</Text>
              <Text style={styles.aboutLink}>•</Text>
              <Text style={styles.aboutLink}>dApp Store Ready</Text>
            </View>
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

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
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a2e',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  section: {
    marginTop: 24,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
  },
  sectionDescription: {
    color: '#888',
    fontSize: 14,
    marginBottom: 16,
  },
  creditsCard: {
    backgroundColor: 'rgba(153, 69, 255, 0.1)',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(153, 69, 255, 0.3)',
    marginBottom: 12,
  },
  creditsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  creditsIcon: {
    fontSize: 40,
    marginRight: 16,
  },
  creditsInfo: {
    flex: 1,
  },
  creditsLabel: {
    color: '#888',
    fontSize: 14,
    marginBottom: 4,
  },
  creditsValue: {
    color: '#fff',
    fontSize: 32,
    fontWeight: 'bold',
  },
  creditsStats: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 24,
  },
  creditsStat: {
    flex: 1,
  },
  creditsStatLabel: {
    color: '#666',
    fontSize: 12,
    marginBottom: 2,
  },
  creditsStatValue: {
    color: '#aaa',
    fontSize: 16,
    fontWeight: '600',
  },
  buyCreditsButton: {
    backgroundColor: '#9945FF',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  buyCreditsButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  walletConnected: {
    color: '#666',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 12,
  },
  recentTransactions: {
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    padding: 16,
  },
  recentTitle: {
    color: '#888',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  transactionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a4e',
  },
  transactionType: {
    color: '#aaa',
    fontSize: 14,
  },
  transactionCredits: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  apiKeyCard: {
    backgroundColor: '#1a1a2e',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  apiKeyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  providerIcon: {
    fontSize: 28,
    marginRight: 12,
  },
  providerName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  providerDescription: {
    color: '#888',
    fontSize: 12,
    marginTop: 2,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  input: {
    flex: 1,
    backgroundColor: '#0a0a0a',
    borderRadius: 12,
    padding: 14,
    color: '#fff',
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#2a2a4e',
  },
  showButton: {
    padding: 12,
    marginLeft: 8,
  },
  showButtonText: {
    fontSize: 20,
  },
  saveButton: {
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  preferenceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1a1a2e',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  preferenceName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  preferenceDescription: {
    color: '#888',
    fontSize: 12,
    marginTop: 2,
  },
  aboutCard: {
    backgroundColor: '#1a1a2e',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
  },
  aboutTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  aboutVersion: {
    color: '#888',
    fontSize: 14,
    marginBottom: 16,
  },
  aboutDescription: {
    color: '#aaa',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
  },
  aboutLinks: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  aboutLink: {
    color: '#9945FF',
    fontSize: 12,
    fontWeight: '500',
  },
});
