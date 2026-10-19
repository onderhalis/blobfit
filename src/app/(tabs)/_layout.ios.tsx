import { NativeTabs } from 'expo-router/native-tabs';

import { colors, fonts } from '@/theme/tokens';

/** iOS: the system tab bar (Liquid Glass on iOS 26) with SF Symbols. Other platforms: _layout.tsx. */
export default function TabsLayout() {
  return (
    <NativeTabs
      tintColor={colors.ink}
      iconColor={{ default: colors.inkSecondary, selected: colors.ink }}
      labelStyle={{
        default: { fontFamily: fonts.medium, fontSize: 10, color: colors.inkSecondary },
        selected: { fontFamily: fonts.semibold, fontSize: 10, color: colors.ink },
      }}
      backgroundColor={colors.surface}
      minimizeBehavior="never">
      <NativeTabs.Trigger name="index" testID="tab-home">
        <NativeTabs.Trigger.Icon sf={{ default: 'house', selected: 'house.fill' }} />
        <NativeTabs.Trigger.Label>Home</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="plan" testID="tab-plan">
        <NativeTabs.Trigger.Icon sf={{ default: 'calendar', selected: 'calendar' }} />
        <NativeTabs.Trigger.Label>Plan</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="progress" testID="tab-progress">
        <NativeTabs.Trigger.Icon sf={{ default: 'chart.bar', selected: 'chart.bar.fill' }} />
        <NativeTabs.Trigger.Label>Progress</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="more" testID="tab-more">
        <NativeTabs.Trigger.Icon sf={{ default: 'ellipsis.circle', selected: 'ellipsis.circle.fill' }} />
        <NativeTabs.Trigger.Label>More</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
