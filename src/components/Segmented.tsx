import { Pressable, StyleSheet, View } from 'react-native';

import { colors, radius } from '@/theme/tokens';

import { AppText } from './AppText';

export interface SegmentedProps<T extends string> {
  options: readonly { value: T; label: string; accessibilityLabel: string }[];
  value: T;
  onChange: (value: T) => void;
  accessibilityLabel: string;
}

/** Pill segmented control. iOS uses the system UISegmentedControl instead (Segmented.ios.tsx). */
export function Segmented<T extends string>({ options, value, onChange, accessibilityLabel }: SegmentedProps<T>) {
  return (
    <View style={styles.segment} accessibilityRole="radiogroup" accessibilityLabel={accessibilityLabel}>
      {options.map((option) => (
        <Pressable
          key={option.value}
          accessibilityRole="radio"
          aria-checked={value === option.value}
          accessibilityLabel={option.accessibilityLabel}
          onPress={() => onChange(option.value)}
          style={[styles.item, value === option.value && styles.on]}>
          <AppText variant="bodyStrong" style={{ color: value === option.value ? colors.inkOnDark : colors.ink }}>
            {option.label}
          </AppText>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  segment: { flexDirection: 'row', backgroundColor: colors.surfaceMuted, borderRadius: radius.pill, padding: 4 },
  item: { minWidth: 56, minHeight: 40, alignItems: 'center', justifyContent: 'center', borderRadius: radius.pill },
  on: { backgroundColor: colors.ink },
});
