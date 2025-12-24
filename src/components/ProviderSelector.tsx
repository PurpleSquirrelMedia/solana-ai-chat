import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
  Pressable,
} from 'react-native';
import { AIProvider } from '../types';
import { AI_PROVIDERS } from '../services/ai-providers';
import { useAI } from '../providers/AIProvider';
import { triggerHaptic } from '../utils/haptics';

interface ProviderSelectorProps {
  visible: boolean;
  onClose: () => void;
}

export function ProviderSelector({ visible, onClose }: ProviderSelectorProps) {
  const { currentProvider, currentModel, setProvider, setModel, hasApiKey } = useAI();

  const handleProviderSelect = (provider: AIProvider) => {
    triggerHaptic();
    setProvider(provider);
  };

  const handleModelSelect = (model: string) => {
    triggerHaptic();
    setModel(model);
    onClose();
  };

  const providers = Object.values(AI_PROVIDERS);

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
          <Text style={styles.title}>Select AI Provider</Text>

          {/* Provider Pills */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.providersScroll}
            contentContainerStyle={styles.providersContent}
          >
            {providers.map((provider) => {
              const isSelected = provider.id === currentProvider;
              const hasKey = hasApiKey(provider.id);

              return (
                <TouchableOpacity
                  key={provider.id}
                  style={[
                    styles.providerPill,
                    isSelected && { backgroundColor: provider.color },
                    !hasKey && styles.providerPillDisabled,
                  ]}
                  onPress={() => handleProviderSelect(provider.id)}
                >
                  <Text style={styles.providerIcon}>{provider.icon}</Text>
                  <Text
                    style={[
                      styles.providerName,
                      isSelected && styles.providerNameSelected,
                    ]}
                  >
                    {provider.name}
                  </Text>
                  {!hasKey && <Text style={styles.noKeyBadge}>No Key</Text>}
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Model Selection */}
          <Text style={styles.sectionTitle}>Model</Text>
          <View style={styles.modelsContainer}>
            {AI_PROVIDERS[currentProvider].models.map((model) => {
              const isSelected = model.id === currentModel;

              return (
                <TouchableOpacity
                  key={model.id}
                  style={[styles.modelCard, isSelected && styles.modelCardSelected]}
                  onPress={() => handleModelSelect(model.id)}
                >
                  <Text style={[styles.modelName, isSelected && styles.modelNameSelected]}>
                    {model.name}
                  </Text>
                  <Text style={styles.modelContext}>
                    {(model.contextWindow / 1000).toFixed(0)}K context
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <TouchableOpacity style={styles.doneButton} onPress={onClose}>
            <Text style={styles.doneButtonText}>Done</Text>
          </TouchableOpacity>
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
    maxHeight: '70%',
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
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 20,
  },
  providersScroll: {
    marginBottom: 24,
  },
  providersContent: {
    paddingHorizontal: 4,
    gap: 12,
  },
  providerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2a2a4e',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 24,
    marginRight: 12,
  },
  providerPillDisabled: {
    opacity: 0.5,
  },
  providerIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  providerName: {
    color: '#aaa',
    fontSize: 14,
    fontWeight: '600',
  },
  providerNameSelected: {
    color: '#fff',
  },
  noKeyBadge: {
    fontSize: 10,
    color: '#ff6b6b',
    marginLeft: 8,
    backgroundColor: 'rgba(255, 107, 107, 0.2)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#888',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  modelsContainer: {
    gap: 12,
    marginBottom: 24,
  },
  modelCard: {
    backgroundColor: '#2a2a4e',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  modelCardSelected: {
    borderColor: '#9945FF',
    backgroundColor: 'rgba(153, 69, 255, 0.1)',
  },
  modelName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  modelNameSelected: {
    color: '#9945FF',
  },
  modelContext: {
    color: '#888',
    fontSize: 13,
  },
  doneButton: {
    backgroundColor: '#9945FF',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  doneButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
