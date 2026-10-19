import { useEffect, useEffectEvent } from 'react';
import { Alert, Modal, Platform, Pressable, StyleSheet, View } from 'react-native';

import { colors, radius, space } from '@/theme/tokens';

import { AppText } from './AppText';
import { Button } from './Button';

/**
 * Confirmation dialog. iOS and Android show the system alert (destructive actions get the
 * platform's destructive style); web, where React Native's Alert is a no-op, gets a modal sheet.
 */
export function ConfirmDialog({
  visible,
  title,
  body,
  confirmLabel,
  cancelLabel = 'Cancel',
  destructive,
  onConfirm,
  onCancel,
}: {
  visible: boolean;
  title: string;
  body: string;
  confirmLabel: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const showSystemAlert = useEffectEvent(() =>
    Alert.alert(
      title,
      body,
      [
        { text: cancelLabel, style: 'cancel', onPress: onCancel },
        { text: confirmLabel, style: destructive ? 'destructive' : 'default', onPress: onConfirm },
      ],
      { cancelable: true, onDismiss: onCancel },
    ),
  );
  useEffect(() => {
    if (visible && Platform.OS !== 'web') {
      showSystemAlert();
    }
  }, [visible]);

  if (Platform.OS !== 'web') {
    return null;
  }
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable style={styles.backdrop} onPress={onCancel} accessibilityLabel="Close dialog" accessibilityRole="button">
        <Pressable style={styles.sheet} onPress={() => undefined} accessibilityViewIsModal accessibilityRole="alert">
          <AppText variant="h2">{title}</AppText>
          <AppText tone="secondary">{body}</AppText>
          <View style={styles.actions}>
            <Button
              label={confirmLabel}
              onPress={onConfirm}
              variant={destructive ? 'danger' : 'primary'}
              size="md"
              testID="confirm-dialog-confirm"
            />
            <Button label={cancelLabel} onPress={onCancel} variant="secondary" size="md" testID="confirm-dialog-cancel" />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(24, 25, 27, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: space.lg,
  },
  sheet: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: space.xl,
    gap: space.sm,
  },
  actions: { gap: space.xs, marginTop: space.sm },
});
