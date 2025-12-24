import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Pressable,
  TextInput,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { useSolana } from '../providers/SolanaProvider';

interface WalletSheetProps {
  visible: boolean;
  onClose: () => void;
}

export function WalletSheet({ visible, onClose }: WalletSheetProps) {
  const { wallet, disconnect, refreshBalance, sendSol } = useSolana();
  const [showSend, setShowSend] = useState(false);
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [sending, setSending] = useState(false);

  const handleCopyAddress = async () => {
    if (wallet.publicKey) {
      await Clipboard.setStringAsync(wallet.publicKey);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  const handleSend = async () => {
    if (!recipient || !amount) {
      Alert.alert('Error', 'Please enter recipient and amount');
      return;
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      Alert.alert('Error', 'Invalid amount');
      return;
    }

    if (amountNum > wallet.balance) {
      Alert.alert('Error', 'Insufficient balance');
      return;
    }

    setSending(true);
    try {
      const signature = await sendSol(recipient, amountNum);
      Alert.alert('Success', `Transaction sent!\n\nSignature: ${signature.slice(0, 20)}...`);
      setShowSend(false);
      setRecipient('');
      setAmount('');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to send transaction');
    } finally {
      setSending(false);
    }
  };

  const handleDisconnect = () => {
    Alert.alert(
      'Disconnect Wallet',
      'Are you sure you want to disconnect your wallet?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Disconnect',
          style: 'destructive',
          onPress: () => {
            disconnect();
            onClose();
          },
        },
      ]
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={styles.handle} />

          {showSend ? (
            // Send SOL Form
            <View>
              <Text style={styles.title}>Send SOL</Text>

              <Text style={styles.label}>Recipient Address</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter Solana address..."
                placeholderTextColor="#666"
                value={recipient}
                onChangeText={setRecipient}
                autoCapitalize="none"
                autoCorrect={false}
              />

              <Text style={styles.label}>Amount (SOL)</Text>
              <TextInput
                style={styles.input}
                placeholder="0.00"
                placeholderTextColor="#666"
                value={amount}
                onChangeText={setAmount}
                keyboardType="decimal-pad"
              />

              <Text style={styles.availableBalance}>
                Available: {wallet.balance.toFixed(4)} SOL
              </Text>

              <View style={styles.buttonRow}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => setShowSend(false)}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.sendButton, sending && styles.buttonDisabled]}
                  onPress={handleSend}
                  disabled={sending}
                >
                  {sending ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.sendButtonText}>Send</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            // Wallet Overview
            <ScrollView>
              <Text style={styles.title}>Wallet</Text>

              {/* Balance Card */}
              <View style={styles.balanceCard}>
                <Text style={styles.balanceLabel}>SOL Balance</Text>
                <Text style={styles.balanceValue}>{wallet.balance.toFixed(4)}</Text>
                <Text style={styles.balanceUsd}>
                  ≈ ${(wallet.balance * 180).toFixed(2)} USD
                </Text>
              </View>

              {/* Address */}
              <TouchableOpacity style={styles.addressCard} onPress={handleCopyAddress}>
                <Text style={styles.addressLabel}>Address</Text>
                <Text style={styles.addressValue}>
                  {wallet.publicKey?.slice(0, 20)}...{wallet.publicKey?.slice(-8)}
                </Text>
                <Text style={styles.copyHint}>Tap to copy</Text>
              </TouchableOpacity>

              {/* Token Balances */}
              {wallet.tokens.length > 0 && (
                <View style={styles.tokensSection}>
                  <Text style={styles.sectionTitle}>Tokens</Text>
                  {wallet.tokens.slice(0, 5).map((token, index) => (
                    <View key={index} style={styles.tokenRow}>
                      <Text style={styles.tokenSymbol}>{token.symbol}</Text>
                      <Text style={styles.tokenBalance}>{token.uiBalance}</Text>
                    </View>
                  ))}
                </View>
              )}

              {/* Actions */}
              <View style={styles.actions}>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => setShowSend(true)}
                >
                  <Text style={styles.actionButtonText}>Send SOL</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={refreshBalance}
                >
                  <Text style={styles.actionButtonText}>Refresh</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={styles.disconnectButton}
                onPress={handleDisconnect}
              >
                <Text style={styles.disconnectButtonText}>Disconnect Wallet</Text>
              </TouchableOpacity>
            </ScrollView>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#1a1a2e',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 40,
    maxHeight: '80%',
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: '#444',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 24,
  },
  balanceCard: {
    backgroundColor: 'linear-gradient(135deg, #9945FF 0%, #14F195 100%)',
    backgroundColor: '#2a2a4e',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#9945FF',
  },
  balanceLabel: {
    color: '#888',
    fontSize: 14,
    marginBottom: 8,
  },
  balanceValue: {
    color: '#fff',
    fontSize: 36,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  balanceUsd: {
    color: '#14F195',
    fontSize: 16,
  },
  addressCard: {
    backgroundColor: '#2a2a4e',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  addressLabel: {
    color: '#888',
    fontSize: 12,
    marginBottom: 4,
  },
  addressValue: {
    color: '#fff',
    fontSize: 14,
    fontFamily: 'monospace',
  },
  copyHint: {
    color: '#14F195',
    fontSize: 11,
    marginTop: 8,
  },
  tokensSection: {
    marginBottom: 16,
  },
  sectionTitle: {
    color: '#888',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  tokenRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#2a2a4e',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  tokenSymbol: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  tokenBalance: {
    color: '#888',
    fontSize: 14,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#9945FF',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  disconnectButton: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  disconnectButtonText: {
    color: '#ff6b6b',
    fontSize: 14,
    fontWeight: '500',
  },
  label: {
    color: '#888',
    fontSize: 14,
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#2a2a4e',
    borderRadius: 12,
    padding: 16,
    color: '#fff',
    fontSize: 16,
    marginBottom: 16,
  },
  availableBalance: {
    color: '#888',
    fontSize: 13,
    marginBottom: 24,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#2a2a4e',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  sendButton: {
    flex: 1,
    backgroundColor: '#14F195',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  sendButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
});
