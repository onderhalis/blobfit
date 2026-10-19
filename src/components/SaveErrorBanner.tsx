import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useStore } from '@/state/AppStore';
import { colors, radius, space, TOUCH } from '@/theme/tokens';

import { AppText } from './AppText';
import { Icon } from './Icon';

/** Shown over every screen while the latest change could not be written to the device. */
export function SaveErrorBanner() {
  const { saveFailed, retrySave } = useStore();
  const insets = useSafeAreaInsets();
  if (!saveFailed) {
    return null;
  }
  return (
    <View
      testID="save-error"
      style={[styles.wrap, { top: insets.top + space.xs }]}
      accessibilityRole="alert"
      accessibilityLiveRegion="assertive">
      <Icon name="warning-outline" size={22} color={colors.dangerInk} />
      <View style={styles.text}>
        <AppText variant="bodyStrong" tone="danger">
          Not saved on this device
        </AppText>
        <AppText variant="caption" tone="secondary">
          Your latest changes may be lost if you close the app. Free up storage, then try again.
        </AppText>
      </View>
      <Pressable onPress={retrySave} accessibilityRole="button" accessibilityLabel="Try saving again" style={styles.retry}>
        <AppText variant="bodyStrong">Try again</AppText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: space.md,
    right: space.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    padding: space.sm,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.danger,
    boxShadow: '0px 10px 28px rgba(60, 45, 30, 0.12)',
  },
  text: { flex: 1, gap: 2 },
  retry: {
    minHeight: TOUCH,
    paddingHorizontal: space.sm,
    justifyContent: 'center',
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceMuted,
  },
});
