import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { triggerHaptic } from '../utils/haptics';

interface NavItem {
  name: string;
  path: string;
  icon: string;
  iconActive: string;
}

const NAV_ITEMS: NavItem[] = [
  { name: 'Chat', path: '/', icon: '💬', iconActive: '💬' },
  { name: 'History', path: '/history', icon: '📋', iconActive: '📋' },
  { name: 'Settings', path: '/settings', icon: '⚙️', iconActive: '⚙️' },
];

export function BottomNav() {
  const router = useRouter();
  const pathname = usePathname();

  const handlePress = (path: string) => {
    triggerHaptic();
    if (path === '/') {
      router.replace('/');
    } else {
      router.push(path as any);
    }
  };

  return (
    <View style={styles.container}>
      {NAV_ITEMS.map((item) => {
        const isActive = pathname === item.path ||
          (item.path === '/' && pathname === '/index');

        return (
          <TouchableOpacity
            key={item.path}
            style={styles.navItem}
            onPress={() => handlePress(item.path)}
          >
            <Text style={[styles.icon, isActive && styles.iconActive]}>
              {isActive ? item.iconActive : item.icon}
            </Text>
            <Text style={[styles.label, isActive && styles.labelActive]}>
              {item.name}
            </Text>
            {isActive && <View style={styles.activeIndicator} />}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#0a0a0a',
    borderTopWidth: 1,
    borderTopColor: '#1a1a2e',
    paddingBottom: 20,
    paddingTop: 8,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    position: 'relative',
  },
  icon: {
    fontSize: 24,
    marginBottom: 4,
    opacity: 0.5,
  },
  iconActive: {
    opacity: 1,
  },
  label: {
    fontSize: 11,
    color: '#666',
    fontWeight: '500',
  },
  labelActive: {
    color: '#9945FF',
    fontWeight: '600',
  },
  activeIndicator: {
    position: 'absolute',
    top: 0,
    width: 24,
    height: 3,
    backgroundColor: '#9945FF',
    borderRadius: 2,
  },
});
