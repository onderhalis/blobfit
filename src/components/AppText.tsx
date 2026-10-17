import { Text, type TextProps } from 'react-native';

import { colors, type TypeVariant, type } from '@/theme/tokens';

type Tone = 'ink' | 'secondary' | 'accent' | 'success' | 'danger' | 'onDark';

const TONE: Record<Tone, string> = {
  ink: colors.ink,
  secondary: colors.inkSecondary,
  accent: colors.accentInk,
  success: colors.successInk,
  danger: colors.dangerInk,
  onDark: colors.inkOnDark,
};

export interface AppTextProps extends TextProps {
  variant?: TypeVariant;
  tone?: Tone;
  center?: boolean;
}

/** Large display sizes are capped so Dynamic Type cannot break the layout; body text scales freely. */
const MAX_SCALE: Partial<Record<TypeVariant, number>> = {
  display: 1.2,
  h1: 1.25,
  stat: 1.3,
  eyebrow: 1.4,
};

export function AppText({ variant = 'body', tone = 'ink', center, style, ...rest }: AppTextProps) {
  const isHeading = variant === 'display' || variant === 'h1' || variant === 'h2' || variant === 'h3';
  return (
    <Text
      accessibilityRole={isHeading ? 'header' : undefined}
      maxFontSizeMultiplier={MAX_SCALE[variant] ?? 1.6}
      style={[type[variant], { color: TONE[tone] }, center && { textAlign: 'center' }, style]}
      {...rest}
    />
  );
}

export function Eyebrow({ children, tone = 'secondary', ...rest }: AppTextProps) {
  const parts = Array.isArray(children) ? children : [children];
  const plain = parts.every((part) => typeof part === 'string' || typeof part === 'number');
  return (
    <AppText variant="eyebrow" tone={tone} {...rest}>
      {plain ? parts.join('').toUpperCase() : children}
    </AppText>
  );
}
