import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Svg, Path, Circle } from 'react-native-svg';
import { useSolana } from '../providers/SolanaProvider';
import { triggerHaptic, HapticStyle } from '../utils/haptics';

interface WalletButtonProps {
  onPress: () => void;
}

export function WalletButton({ onPress }: WalletButtonProps) {
  const { wallet, connecting, connect } = useSolana();

  const handlePress = () => {
    triggerHaptic(HapticStyle.Medium);
    if (!wallet.connected) {
      connect();
    } else {
      onPress();
    }
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  };

  return (
    <TouchableOpacity
      style={[styles.container, wallet.connected && styles.containerConnected]}
      onPress={handlePress}
      disabled={connecting}
    >
      {connecting ? (
        <ActivityIndicator size="small" color="#14F195" />
      ) : wallet.connected ? (
        <>
          <View style={styles.statusDot} />
          <Text style={styles.address}>{formatAddress(wallet.publicKey!)}</Text>
          <Text style={styles.balance}>{wallet.balance.toFixed(2)} SOL</Text>
        </>
      ) : (
        <>
          <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
            <Path
              d="M19 7H5C3.89543 7 3 7.89543 3 9V18C3 19.1046 3.89543 20 5 20H19C20.1046 20 21 19.1046 21 18V9C21 7.89543 20.1046 7 19 7Z"
              stroke="#14F195"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <Path
              d="M16 14C16.5523 14 17 13.5523 17 13C17 12.4477 16.5523 12 16 12C15.4477 12 15 12.4477 15 13C15 13.5523 15.4477 14 16 14Z"
              fill="#14F195"
            />
            <Path
              d="M7 7V5C7 3.89543 7.89543 3 9 3H15C16.1046 3 17 3.89543 17 5V7"
              stroke="#14F195"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
          <Text style={styles.connectText}>Connect</Text>
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a2e',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 8,
    borderWidth: 1,
    borderColor: '#2a2a4e',
  },
  containerConnected: {
    borderColor: '#14F195',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#14F195',
  },
  address: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '500',
  },
  balance: {
    color: '#14F195',
    fontSize: 13,
    fontWeight: '600',
  },
  connectText: {
    color: '#14F195',
    fontSize: 14,
    fontWeight: '600',
  },
});
