import { Ionicons } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, radius, space, TOUCH, type TintName } from '@/theme/tokens';

import { AppText } from './AppText';

function Check({ selected, multi }: { selected: boolean; multi?: boolean }) {
  return (
    <View style={[styles.check, multi && styles.checkSquare, selected && styles.checkOn]}>
      {selected ? <Ionicons name="checkmark" size={16} color={colors.inkOnDark} /> : null}
    </View>
  );
}

/** Large tinted goal card (concept 02). */
export function SelectCard({
  title,
  subtitle,
  selected,
  onPress,
  tint,
  art,
  style,
  testID,
}: {
  title: string;
  subtitle: string;
  selected: boolean;
  onPress: () => void;
  tint: TintName;
  art?: ReactNode;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}) {
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      accessibilityRole="radio"
      aria-checked={selected}
      accessibilityLabel={`${title}. ${subtitle}`}
      style={({ pressed }) => [
        styles.selectCard,
        { backgroundColor: colors.tint[tint].bg },
        selected && styles.selected,
        pressed && styles.pressed,
        style,
      ]}>
      <View style={styles.selectTop}>
        <View style={styles.selectArt}>{art}</View>
        <Check selected={selected} />
      </View>
      <AppText variant="h3" style={styles.selectTitle}>
        {title}
      </AppText>
      <AppText variant="caption" tone="secondary">
        {subtitle}
      </AppText>
    </Pressable>
  );
}

/** Full-width option row for single or multiple choice. */
export function OptionRow({
  title,
  subtitle,
  selected,
  onPress,
  multi,
  icon,
  testID,
}: {
  title: string;
  subtitle?: string;
  selected: boolean;
  onPress: () => void;
  multi?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  testID?: string;
}) {
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      accessibilityRole={multi ? 'checkbox' : 'radio'}
      aria-checked={selected}
      accessibilityLabel={subtitle ? `${title}. ${subtitle}` : title}
      style={({ pressed }) => [styles.row, selected && styles.selected, pressed && styles.pressed]}>
      {icon ? (
        <View style={styles.rowIcon}>
          <Ionicons name={icon} size={22} color={colors.ink} />
        </View>
      ) : null}
      <View style={styles.flex}>
        <AppText variant="bodyStrong">{title}</AppText>
        {subtitle ? (
          <AppText variant="caption" tone="secondary">
            {subtitle}
          </AppText>
        ) : null}
      </View>
      <Check selected={selected} multi={multi} />
    </Pressable>
  );
}

export function DayToggle({
  label,
  longLabel,
  selected,
  onPress,
  disabled,
}: {
  label: string;
  longLabel: string;
  selected: boolean;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="checkbox"
      accessibilityLabel={longLabel}
      aria-checked={selected}
      aria-disabled={Boolean(disabled)}
      style={({ pressed }) => [
        styles.day,
        selected && styles.dayOn,
        disabled && !selected && styles.dayDisabled,
        pressed && styles.pressed,
      ]}>
      <AppText variant="caption" style={{ color: selected ? colors.inkOnDark : colors.ink }}>
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.85 },
  selected: { borderColor: colors.success, borderWidth: 2.5 },
  check: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: colors.inkSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  checkSquare: { borderRadius: 8 },
  checkOn: { backgroundColor: colors.success, borderColor: colors.success },
  selectCard: {
    flex: 1,
    minHeight: 200,
    borderRadius: radius.lg,
    padding: space.md,
    borderWidth: 2.5,
    borderColor: 'transparent',
  },
  selectTop: { flexDirection: 'row', alignItems: 'flex-start', minHeight: 104 },
  selectArt: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  selectTitle: { marginTop: space.xs },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    minHeight: 64,
    padding: space.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 2.5,
    borderColor: 'transparent',
  },
  rowIcon: {
    width: TOUCH,
    height: TOUCH,
    borderRadius: TOUCH / 2,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flex: { flex: 1, gap: 2 },
  day: {
    flex: 1,
    minWidth: 40,
    height: 48,
    borderRadius: TOUCH / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dayOn: { backgroundColor: colors.ink, borderColor: colors.ink },
  dayDisabled: { opacity: 0.45 },
});
