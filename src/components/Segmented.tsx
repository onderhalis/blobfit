import { Pressable, StyleSheet, View } from 'react-native';

import { colors, radius } from '@/theme/tokens';

import { AppText } from './AppText';

export interface SegmentedProps<T extends string> {
  options: readonly { value: T; label: string; accessibilityLabel: string }[];
  value: T;
  onChange: (value: T) => void;
  accessibilityLabel: string;
  /** Fill the available width (for more than two options). */
  wide?: boolean;
}

/** Pill segmented control. iOS uses the system UISegmentedControl instead (Segmented.ios.tsx). */
export function Segmented<T extends string>({ options, value, onChange, accessibilityLabel, wide }: SegmentedProps<T>) {
  return (
    <View style={[styles.segment, wide && styles.wide]} accessibilityRole="radiogroup" accessibilityLabel={accessibilityLabel}>
      {options.map((option) => (
        <Pressable
          key={option.value}
          accessibilityRole="radio"
          aria-checked={value === option.value}
          accessibilityLabel={option.accessibilityLabel}
          onPress={() => onChange(option.value)}
          testID={`segment-${option.value}`}
          style={[styles.item, wide && styles.itemWide, value === option.value && styles.on]}>
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
  wide: { alignSelf: 'stretch' },
  itemWide: { flex: 1 },
});
