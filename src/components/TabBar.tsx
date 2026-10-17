import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { Pressable, StyleSheet, View } from 'react-native';

import { colors, radius, space, TAB_BAR_HEIGHT } from '@/theme/tokens';

import { AppText } from './AppText';
import { Icon, type IconName } from './Icon';
import { MAX_WIDTH } from './Screen';

const ICONS: Record<string, { on: IconName; off: IconName; label: string }> = {
  index: { on: 'home', off: 'home-outline', label: 'Home' },
  plan: { on: 'calendar-clear', off: 'calendar-clear-outline', label: 'Plan' },
  progress: { on: 'stats-chart', off: 'stats-chart-outline', label: 'Progress' },
  more: { on: 'ellipsis-horizontal', off: 'ellipsis-horizontal', label: 'More' },
};

export function TabBar({ state, navigateToTab, insets }: BottomTabBarProps) {
  return (
    <View style={[styles.wrap, { paddingBottom: insets.bottom }]} accessibilityRole="tablist">
      <View style={styles.bar}>
        {state.routes.map((route, index) => {
          const meta = ICONS[route.name];
          if (!meta) {
            return null;
          }
          const focused = state.index === index;
          return (
            <Pressable
              key={route.key}
              testID={`tab-${meta.label.toLowerCase()}`}
              accessibilityRole="tab"
              aria-selected={focused}
              accessibilityLabel={meta.label}
              onPress={() => navigateToTab(route.key)}
              style={({ pressed }) => [styles.tab, pressed && styles.pressed]}>
              <Icon name={focused ? meta.on : meta.off} size={24} color={focused ? colors.ink : colors.inkSecondary} />
              <AppText
                variant="caption"
                maxFontSizeMultiplier={1.2}
                style={[styles.label, { color: focused ? colors.ink : colors.inkSecondary }, focused && styles.labelOn]}>
                {meta.label}
              </AppText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    boxShadow: '0px -6px 24px rgba(92, 70, 45, 0.08)',
  },
  bar: {
    height: TAB_BAR_HEIGHT,
    flexDirection: 'row',
    width: '100%',
    maxWidth: MAX_WIDTH,
    alignSelf: 'center',
    paddingHorizontal: space.xs,
  },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 2 },
  label: { fontSize: 12 },
  labelOn: { fontFamily: 'Inter_700Bold' },
  pressed: { opacity: 0.7 },
});
