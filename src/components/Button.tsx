import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, radius, space, TOUCH } from '@/theme/tokens';

import { AppText } from './AppText';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: Variant;
  icon?: keyof typeof Ionicons.glyphMap;
  /** Trailing arrow, as in the concepts' primary CTAs. */
  arrow?: boolean;
  disabled?: boolean;
  loading?: boolean;
  size?: 'lg' | 'md';
  accessibilityHint?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

const BG: Record<Variant, string> = {
  primary: colors.ink,
  secondary: colors.surfaceMuted,
  ghost: 'transparent',
  danger: colors.surface,
};

const FG: Record<Variant, string> = {
  primary: colors.inkOnDark,
  secondary: colors.ink,
  ghost: colors.ink,
  danger: colors.dangerInk,
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  icon,
  arrow,
  disabled,
  loading,
  size = 'lg',
  accessibilityHint,
  style,
  testID,
}: ButtonProps) {
  const inactive = disabled || loading;
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      disabled={inactive}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: Boolean(inactive), busy: Boolean(loading) }}
      style={({ pressed }) => [
        styles.base,
        size === 'lg' ? styles.lg : styles.md,
        { backgroundColor: BG[variant] },
        variant === 'danger' && styles.dangerBorder,
        inactive && styles.disabled,
        pressed && !inactive && styles.pressed,
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={FG[variant]} />
      ) : (
        <View style={styles.row}>
          {icon ? <Ionicons name={icon} size={20} color={FG[variant]} /> : null}
          <AppText variant={size === 'lg' ? 'button' : 'bodyStrong'} style={{ color: FG[variant] }}>
            {label}
          </AppText>
          {arrow ? <Ionicons name="arrow-forward" size={22} color={FG[variant]} /> : null}
        </View>
      )}
    </Pressable>
  );
}

interface IconButtonProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  size?: number;
  tone?: 'muted' | 'surface' | 'dark';
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export function IconButton({ icon, label, onPress, size = TOUCH, tone = 'muted', disabled, style, testID }: IconButtonProps) {
  const bg = tone === 'dark' ? colors.ink : tone === 'surface' ? colors.surface : colors.surfaceMuted;
  const fg = tone === 'dark' ? colors.inkOnDark : colors.ink;
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: Boolean(disabled) }}
      hitSlop={Math.max(0, (TOUCH - size) / 2)}
      style={({ pressed }) => [
        styles.icon,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: bg },
        disabled && styles.disabled,
        pressed && styles.pressed,
        style,
      ]}>
      <Ionicons name={icon} size={size * 0.45} color={fg} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space.xl,
  },
  lg: { minHeight: 60 },
  md: { minHeight: TOUCH + 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  disabled: { opacity: 0.4 },
  pressed: { opacity: 0.82, transform: [{ scale: 0.99 }] },
  dangerBorder: { borderWidth: 1, borderColor: colors.border },
  icon: { alignItems: 'center', justifyContent: 'center' },
});
