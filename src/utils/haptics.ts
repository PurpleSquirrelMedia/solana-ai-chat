import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

export const triggerHaptic = (style: Haptics.ImpactFeedbackStyle = Haptics.ImpactFeedbackStyle.Light) => {
  if (Platform.OS !== 'web') {
    Haptics.impactAsync(style);
  }
};

export const triggerNotification = (type: Haptics.NotificationFeedbackType) => {
  if (Platform.OS !== 'web') {
    Haptics.notificationAsync(type);
  }
};

export const triggerSelection = () => {
  if (Platform.OS !== 'web') {
    Haptics.selectionAsync();
  }
};

export const HapticStyle = Haptics.ImpactFeedbackStyle;
export const NotificationType = Haptics.NotificationFeedbackType;
