import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, radius, shadow, space, type TintName } from '@/theme/tokens';

import { AppText } from './AppText';
import { Icon, type IconName } from './Icon';

interface CardProps {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  tone?: 'surface' | 'deep' | TintName;
  onPress?: () => void;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  testID?: string;
}

function background(tone: CardProps['tone']): string {
  if (!tone || tone === 'surface') {
    return colors.surface;
  }
  if (tone === 'deep') {
    return colors.bgDeep;
  }
  return colors.tint[tone].bg;
}

export function Card({ children, style, tone, onPress, accessibilityLabel, accessibilityHint, testID }: CardProps) {
  const base = [styles.card, { backgroundColor: background(tone) }, tone === 'surface' || !tone ? shadow.card : null];
  if (!onPress) {
    return (
      <View style={[base, style]} testID={testID}>
        {children}
      </View>
    );
  }
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      style={({ pressed }) => [base, pressed && styles.pressed, style]}>
      {children}
    </Pressable>
  );
}

export function Chevron({ tone = 'muted' }: { tone?: 'muted' | 'surface' }) {
  return (
    <View style={[styles.chevron, { backgroundColor: tone === 'surface' ? colors.surface : colors.surfaceMuted }]}>
      <Icon name="chevron-forward" size={18} color={colors.ink} />
    </View>
  );
}

export function Tag({
  label,
  tint = 'peach',
  icon,
}: {
  label: string;
  tint?: TintName;
  icon?: IconName;
}) {
  const { bg, fg } = colors.tint[tint];
  return (
    <View style={[styles.tag, { backgroundColor: bg }]}>
      {icon ? <Icon name={icon} size={14} color={fg} /> : null}
      <AppText variant="caption" numberOfLines={1} style={{ color: fg }}>
        {label}
      </AppText>
    </View>
  );
}

/** Shown wherever exercise technique, prescriptions or muscle claims appear (CLAUDE.md). */
export function ReviewBadge({ compact }: { compact?: boolean }) {
  return (
    <View
      style={styles.review}
      accessible
      accessibilityLabel="Content review pending. This exercise guidance has not yet been reviewed by a qualified coach.">
      <Icon name="information-circle-outline" size={16} color={colors.tint.butter.fg} />
      <AppText variant="caption" style={{ color: colors.tint.butter.fg }}>
        {compact ? 'Review pending' : 'Content review pending'}
      </AppText>
    </View>
  );
}

export function SectionHeader({
  title,
  action,
  onAction,
  style,
}: {
  title: string;
  action?: string;
  onAction?: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.sectionHeader, style]}>
      <AppText variant="h2" style={styles.flex}>
        {title}
      </AppText>
      {action && onAction ? (
        <Pressable
          onPress={onAction}
          accessibilityRole="button"
          accessibilityLabel={action}
          hitSlop={8}
          style={styles.sectionAction}>
          <AppText variant="caption" tone="secondary">
            {action}
          </AppText>
          <Chevron />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    padding: space.md,
  },
  pressed: { opacity: 0.88 },
  chevron: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: space.xxs,
    paddingHorizontal: space.sm,
    paddingVertical: 6,
    borderRadius: radius.pill,
  },
  review: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: space.xxs,
    paddingHorizontal: space.sm,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.tint.butter.bg,
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  sectionAction: { flexDirection: 'row', alignItems: 'center', gap: space.xs, minHeight: 44 },
  flex: { flex: 1 },
});
