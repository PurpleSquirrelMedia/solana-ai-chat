import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useCredits, CREDIT_PACKAGES } from '../providers/CreditsProvider';
import { triggerHaptic, triggerNotification, triggerSelection, HapticStyle, NotificationType } from '../utils/haptics';
import { useSolana } from '../providers/SolanaProvider';
import { PaymentToken, CreditPackage } from '../types';

interface BuyCreditsSheetProps {
  visible: boolean;
  onClose: () => void;
}

export function BuyCreditsSheet({ visible, onClose }: BuyCreditsSheetProps) {
  const { wallet, connect, connecting } = useSolana();
  const { balance, purchaseCredits, isLoading, getPackagesByToken } = useCredits();
  const [selectedToken, setSelectedToken] = useState<PaymentToken>('SOL');
  const [selectedPackage, setSelectedPackage] = useState<string | null>(null);

  const packages = getPackagesByToken(selectedToken);

  const handlePurchase = async () => {
    if (!selectedPackage) {
      Alert.alert('Select a package', 'Please select a credit package to purchase');
      return;
    }

    if (!wallet.connected) {
      Alert.alert('Connect Wallet', 'Please connect your wallet to purchase credits');
      return;
    }

    try {
      triggerHaptic(HapticStyle.Medium);
      const signature = await purchaseCredits(selectedPackage);

      triggerNotification(NotificationType.Success);
      Alert.alert(
        'Purchase Successful!',
        `Your credits have been added to your account.\n\nTransaction: ${signature.slice(0, 8)}...`,
        [{ text: 'Done', onPress: onClose }]
      );
    } catch (error: any) {
      triggerNotification(NotificationType.Error);
      Alert.alert('Purchase Failed', error.message || 'Something went wrong');
    }
  };

  const renderPackage = (pkg: CreditPackage) => {
    const isSelected = selectedPackage === pkg.id;

    return (
      <TouchableOpacity
        key={pkg.id}
        style={[
          styles.packageCard,
          isSelected && styles.packageCardSelected,
          pkg.popular && styles.packageCardPopular,
        ]}
        onPress={() => {
          triggerSelection();
          setSelectedPackage(pkg.id);
        }}
      >
        {pkg.popular && (
          <View style={styles.popularBadge}>
            <Text style={styles.popularBadgeText}>MOST POPULAR</Text>
          </View>
        )}

        <View style={styles.packageHeader}>
          <Text style={styles.packageName}>{pkg.name}</Text>
          {pkg.savings && (
            <View style={styles.savingsBadge}>
              <Text style={styles.savingsBadgeText}>{pkg.savings}</Text>
            </View>
          )}
        </View>

        <Text style={styles.packageCredits}>{pkg.credits.toLocaleString()} credits</Text>

        <View style={styles.packagePrice}>
          <Text style={styles.priceValue}>
            {pkg.token === 'SOL' ? `${pkg.price} SOL` : `${pkg.price.toLocaleString()} PURP`}
          </Text>
          <Text style={styles.pricePerCredit}>
            {((pkg.price / pkg.credits) * 1000).toFixed(3)} per 1K
          </Text>
        </View>

        {isSelected && (
          <View style={styles.selectedIndicator}>
            <Text style={styles.selectedIndicatorText}>✓</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Buy Credits</Text>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>×</Text>
          </TouchableOpacity>
        </View>

        {/* Balance Display */}
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Your Balance</Text>
          <Text style={styles.balanceValue}>{balance.remaining.toLocaleString()} credits</Text>
          {balance.total > 0 && (
            <Text style={styles.balanceUsed}>
              {balance.used.toLocaleString()} used of {balance.total.toLocaleString()}
            </Text>
          )}
        </View>

        {/* Token Selector */}
        <View style={styles.tokenSelector}>
          <TouchableOpacity
            style={[styles.tokenButton, selectedToken === 'SOL' && styles.tokenButtonActive]}
            onPress={() => {
              triggerSelection();
              setSelectedToken('SOL');
              setSelectedPackage(null);
            }}
          >
            <Text style={styles.tokenIcon}>◎</Text>
            <Text style={[styles.tokenText, selectedToken === 'SOL' && styles.tokenTextActive]}>
              SOL
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tokenButton, selectedToken === 'PURP' && styles.tokenButtonActive]}
            onPress={() => {
              triggerSelection();
              setSelectedToken('PURP');
              setSelectedPackage(null);
            }}
          >
            <Text style={styles.tokenIcon}>💜</Text>
            <Text style={[styles.tokenText, selectedToken === 'PURP' && styles.tokenTextActive]}>
              PURP
            </Text>
          </TouchableOpacity>
        </View>

        {/* Packages */}
        <ScrollView style={styles.packagesContainer} showsVerticalScrollIndicator={false}>
          <View style={styles.packagesGrid}>
            {packages.map(renderPackage)}
          </View>

          {/* Info */}
          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>How credits work</Text>
            <Text style={styles.infoText}>
              • 1-3 credits per AI message (varies by model){'\n'}
              • Credits never expire{'\n'}
              • Works across all AI providers{'\n'}
              • Cheaper than paying per API call
            </Text>
          </View>
        </ScrollView>

        {/* Purchase Button */}
        <View style={styles.footer}>
          {!wallet.connected ? (
            <TouchableOpacity
              style={styles.connectButton}
              onPress={connect}
              disabled={connecting}
            >
              {connecting ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.connectButtonText}>Connect Wallet to Purchase</Text>
              )}
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.purchaseButton, !selectedPackage && styles.purchaseButtonDisabled]}
              onPress={handlePurchase}
              disabled={!selectedPackage || isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.purchaseButtonText}>
                  {selectedPackage
                    ? `Purchase ${packages.find(p => p.id === selectedPackage)?.credits.toLocaleString()} Credits`
                    : 'Select a Package'}
                </Text>
              )}
            </TouchableOpacity>
          )}

          {wallet.connected && (
            <Text style={styles.walletInfo}>
              Connected: {wallet.publicKey?.slice(0, 6)}...{wallet.publicKey?.slice(-4)} • {wallet.balance.toFixed(4)} SOL
            </Text>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a2e',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  closeButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1a2e',
    borderRadius: 20,
  },
  closeButtonText: {
    fontSize: 24,
    color: '#888',
  },
  balanceCard: {
    backgroundColor: 'rgba(153, 69, 255, 0.1)',
    margin: 20,
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(153, 69, 255, 0.3)',
  },
  balanceLabel: {
    color: '#888',
    fontSize: 14,
    marginBottom: 4,
  },
  balanceValue: {
    color: '#fff',
    fontSize: 32,
    fontWeight: 'bold',
  },
  balanceUsed: {
    color: '#666',
    fontSize: 12,
    marginTop: 4,
  },
  tokenSelector: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginBottom: 16,
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    padding: 4,
  },
  tokenButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    gap: 8,
  },
  tokenButtonActive: {
    backgroundColor: '#9945FF',
  },
  tokenIcon: {
    fontSize: 18,
  },
  tokenText: {
    color: '#888',
    fontSize: 16,
    fontWeight: '600',
  },
  tokenTextActive: {
    color: '#fff',
  },
  packagesContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  packagesGrid: {
    gap: 12,
  },
  packageCard: {
    backgroundColor: '#1a1a2e',
    borderRadius: 16,
    padding: 16,
    borderWidth: 2,
    borderColor: 'transparent',
    position: 'relative',
  },
  packageCardSelected: {
    borderColor: '#9945FF',
    backgroundColor: 'rgba(153, 69, 255, 0.1)',
  },
  packageCardPopular: {
    borderColor: '#14F195',
  },
  popularBadge: {
    position: 'absolute',
    top: -10,
    right: 16,
    backgroundColor: '#14F195',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  popularBadgeText: {
    color: '#000',
    fontSize: 10,
    fontWeight: 'bold',
  },
  packageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  packageName: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  savingsBadge: {
    backgroundColor: 'rgba(20, 241, 149, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  savingsBadgeText: {
    color: '#14F195',
    fontSize: 12,
    fontWeight: '600',
  },
  packageCredits: {
    color: '#9945FF',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  packagePrice: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priceValue: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  pricePerCredit: {
    color: '#666',
    fontSize: 12,
  },
  selectedIndicator: {
    position: 'absolute',
    top: 16,
    left: 16,
    width: 24,
    height: 24,
    backgroundColor: '#9945FF',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedIndicatorText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  infoCard: {
    backgroundColor: '#1a1a2e',
    borderRadius: 16,
    padding: 16,
    marginTop: 20,
    marginBottom: 100,
  },
  infoTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  infoText: {
    color: '#888',
    fontSize: 14,
    lineHeight: 22,
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#1a1a2e',
  },
  connectButton: {
    backgroundColor: '#14F195',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  connectButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '600',
  },
  purchaseButton: {
    backgroundColor: '#9945FF',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  purchaseButtonDisabled: {
    backgroundColor: '#333',
  },
  purchaseButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  walletInfo: {
    color: '#666',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 12,
  },
});
