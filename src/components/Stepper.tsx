import { StyleSheet, View } from 'react-native';

import { colors, radius, space } from '@/theme/tokens';

import { AppText } from './AppText';
import { IconButton } from './Button';

/** − value + control with 44pt targets; announces as an adjustable value. */
export function Stepper({
  value,
  onChange,
  step = 1,
  min = 0,
  max = 999,
  unit,
  label,
  disabled,
  format = (v) => String(v),
  testID,
}: {
  value: number;
  onChange: (next: number) => void;
  step?: number;
  min?: number;
  max?: number;
  unit?: string;
  label: string;
  disabled?: boolean;
  format?: (value: number) => string;
  testID?: string;
}) {
  const set = (next: number) => onChange(Math.max(min, Math.min(max, Math.round(next * 100) / 100)));
  return (
    <View
      style={[styles.root, disabled && styles.disabled]}
      testID={testID}
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={label}
      accessibilityValue={{ text: `${format(value)}${unit ? ` ${unit}` : ''}` }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(event) => {
        if (disabled) {
          return;
        }
        if (event.nativeEvent.actionName === 'increment') {
          set(value + step);
        } else if (event.nativeEvent.actionName === 'decrement') {
          set(value - step);
        }
      }}>
      <IconButton
        icon="remove"
        label={`Decrease ${label}`}
        onPress={() => set(value - step)}
        disabled={disabled || value <= min}
        size={36}
        tone="surface"
        testID={testID ? `${testID}-minus` : undefined}
      />
      <View style={styles.value}>
        <AppText variant="h3" center maxFontSizeMultiplier={1.3}>
          {format(value)}
        </AppText>
        {unit ? (
          <AppText variant="caption" tone="secondary" center maxFontSizeMultiplier={1.3}>
            {unit}
          </AppText>
        ) : null}
      </View>
      <IconButton
        icon="add"
        label={`Increase ${label}`}
        onPress={() => set(value + step)}
        disabled={disabled || value >= max}
        size={36}
        tone="surface"
        testID={testID ? `${testID}-plus` : undefined}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.pill,
    padding: space.xxs,
    gap: space.xxs,
  },
  value: { minWidth: 48, alignItems: 'center' },
  disabled: { opacity: 0.5 },
});
