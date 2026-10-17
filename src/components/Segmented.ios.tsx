import SegmentedControl, { type SegmentedControlProps } from '@react-native-segmented-control/segmented-control';
import type { ComponentType } from 'react';
import { StyleSheet } from 'react-native';

import { colors, fonts } from '@/theme/tokens';

import type { SegmentedProps } from './Segmented';

// The package's class typings predate React 19's JSX types; the component itself is fine.
const SystemSegmentedControl = SegmentedControl as unknown as ComponentType<SegmentedControlProps>;

/** iOS: the system segmented control (VoiceOver and Dynamic Type come with it). */
export function Segmented<T extends string>({ options, value, onChange, accessibilityLabel }: SegmentedProps<T>) {
  return (
    <SystemSegmentedControl
      values={options.map((option) => option.label)}
      selectedIndex={Math.max(0, options.findIndex((option) => option.value === value))}
      onChange={(event) => onChange(options[event.nativeEvent.selectedSegmentIndex].value)}
      accessibilityLabel={accessibilityLabel}
      appearance="light"
      backgroundColor={colors.surfaceMuted}
      tintColor={colors.ink}
      fontStyle={{ fontFamily: fonts.semibold, color: colors.ink, fontSize: 15 }}
      activeFontStyle={{ fontFamily: fonts.semibold, color: colors.inkOnDark, fontSize: 15 }}
      style={styles.control}
    />
  );
}

const styles = StyleSheet.create({
  control: { width: 120, height: 36 },
});
