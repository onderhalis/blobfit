import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

const NATIVE = Platform.OS === 'ios' || Platform.OS === 'android';

/** Light, purposeful feedback on native only. Failures are ignored: haptics are never essential. */
export const haptics = {
  /** A set ticked off. */
  tap() {
    if (NATIVE) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
    }
  },
  /** A workout finished. */
  success() {
    if (NATIVE) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
    }
  },
};
