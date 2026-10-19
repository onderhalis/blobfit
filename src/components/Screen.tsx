import { router, Stack } from 'expo-router';
import type { ReactNode } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, useWindowDimensions, View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SYSTEM_CHROME } from '@/lib/platform';
import { colors, space, TAB_BAR_HEIGHT, type } from '@/theme/tokens';

import { AppText } from './AppText';
import { Button, IconButton } from './Button';
import { Illustration } from './Illustration';

export const MAX_WIDTH = 520;

/**
 * Width available to a Screen column, plus breakpoints for small phones and large Dynamic Type.
 * `compact` covers 375pt phones (iPhone SE / mini) and up-scaled text; `narrow` covers 320pt.
 */
export function useLayout() {
  const { width, fontScale } = useWindowDimensions();
  const content = Math.min(width, MAX_WIDTH) - space.lg * 2;
  return { content, fontScale, compact: content < 340 || fontScale > 1.15, narrow: content < 300 };
}

interface ScreenProps {
  children: ReactNode;
  /** Leaves room for the floating tab bar. */
  withTabBar?: boolean;
  /** Content pinned to the bottom (e.g. a primary CTA). */
  footer?: ReactNode;
  scroll?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
  testID?: string;
}

export function Screen({ children, withTabBar, footer, scroll = true, contentStyle, testID }: ScreenProps) {
  const insets = useSafeAreaInsets();
  // iOS: UIKit insets the scroll view for the status bar, navigation bar, system tab bar and home
  // indicator ('automatic'), and a footer on a tab screen sits at the end of the content, above
  // the system tab bar. Elsewhere the insets and the floating tab bar are applied by hand.
  const systemInsets = SYSTEM_CHROME && scroll;
  const inlineFooter = SYSTEM_CHROME && withTabBar && footer;
  const pinnedFooter = footer && !inlineFooter;
  const bottomPad = systemInsets
    ? (pinnedFooter ? 96 : 0) + space.xl
    : (withTabBar ? TAB_BAR_HEIGHT + space.md : 0) + (pinnedFooter ? 96 : 0) + insets.bottom + space.xl;
  const content = (
    <View
      style={[
        styles.column,
        { paddingTop: (systemInsets ? 0 : insets.top) + space.xs, paddingBottom: bottomPad },
        contentStyle,
      ]}>
      {children}
      {inlineFooter ? <View style={styles.inlineFooter}>{footer}</View> : null}
    </View>
  );
  return (
    <View style={styles.root} testID={testID}>
      {scroll ? (
        <ScrollView
          contentContainerStyle={styles.scroll}
          contentInsetAdjustmentBehavior={systemInsets ? 'automatic' : 'never'}
          showsVerticalScrollIndicator={false}>
          {content}
        </ScrollView>
      ) : (
        content
      )}
      {pinnedFooter ? (
        <View
          style={[
            styles.footer,
            { paddingBottom: insets.bottom + space.md + (withTabBar ? TAB_BAR_HEIGHT : 0) },
          ]}>
          <View style={styles.footerInner}>{footer}</View>
        </View>
      ) : null}
    </View>
  );
}

export function Wordmark() {
  return (
    <AppText
      accessibilityRole="header"
      accessibilityLabel="Blob Fit"
      style={styles.wordmark}
      maxFontSizeMultiplier={1.2}>
      BLOB FIT
    </AppText>
  );
}

/** Top bar: back button or wordmark, plus optional trailing actions. */
export function TopBar({
  back,
  title,
  trailing,
  showProfile,
}: {
  back?: boolean;
  title?: string;
  trailing?: ReactNode;
  showProfile?: boolean;
}) {
  if (back && SYSTEM_CHROME) {
    // iOS: the system navigation bar (back button, swipe-back, title) replaces the custom bar.
    return <Stack.Screen options={{ headerShown: true, title: title ?? '', headerRight: trailing ? () => trailing : undefined }} />;
  }
  return (
    <View style={styles.topBar}>
      {back ? (
        <IconButton
          icon="chevron-back"
          label="Go back"
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
        />
      ) : null}
      <View style={[styles.topTitle, back && styles.topTitleCentered]}>
        {title ? (
          <AppText variant="h3" center={back} numberOfLines={1}>
            {title}
          </AppText>
        ) : (
          <Wordmark />
        )}
      </View>
      {trailing}
      {showProfile ? (
        <IconButton icon="person" label="Your plan settings" onPress={() => router.push('/preferences')} />
      ) : null}
      {back && !trailing && !showProfile ? <View style={styles.spacer} /> : null}
    </View>
  );
}

export function LoadingView({ label = 'Loading your plan…' }: { label?: string }) {
  return (
    <View style={[styles.root, styles.centered]} accessibilityLiveRegion="polite">
      <ActivityIndicator color={colors.ink} />
      <AppText tone="secondary" style={{ marginTop: space.sm }}>
        {label}
      </AppText>
    </View>
  );
}

export function EmptyState({
  title,
  body,
  action,
  onAction,
}: {
  title: string;
  body: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <View style={styles.empty}>
      <Illustration name="blob-peek" height={86} />
      <AppText variant="h3" center>
        {title}
      </AppText>
      <AppText tone="secondary" center>
        {body}
      </AppText>
      {action && onAction ? <Button label={action} onPress={onAction} size="md" variant="secondary" /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  scroll: { flexGrow: 1 },
  column: {
    width: '100%',
    maxWidth: MAX_WIDTH,
    alignSelf: 'center',
    paddingHorizontal: space.lg,
    gap: space.md,
  },
  inlineFooter: { flexDirection: 'row', gap: space.sm, marginTop: space.xs },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingTop: space.md,
    paddingHorizontal: space.lg,
    backgroundColor: colors.bg,
  },
  footerInner: { width: '100%', maxWidth: MAX_WIDTH - space.lg * 2, alignSelf: 'center', flexDirection: 'row', gap: space.sm },
  wordmark: {
    fontFamily: 'ArchivoBlack_400Regular',
    fontSize: 24,
    lineHeight: 30,
    letterSpacing: 3.5,
    color: colors.ink,
  },
  topBar: { flexDirection: 'row', alignItems: 'center', gap: space.sm, minHeight: 56 },
  topTitle: { flex: 1 },
  topTitleCentered: { alignItems: 'center' },
  spacer: { width: 44 },
  centered: { alignItems: 'center', justifyContent: 'center', padding: space.xl },
  empty: {
    alignItems: 'center',
    gap: space.sm,
    paddingVertical: space.xl,
    paddingHorizontal: space.md,
  },
  body: type.body,
});
