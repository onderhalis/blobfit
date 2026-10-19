/**
 * Design tokens from docs/DESIGN_SYSTEM.md, tuned against the approved concepts.
 * Text colors are chosen to meet WCAG AA (4.5:1) on `bg` and `surface`; `accent`
 * is for fills, rings and icons only — use `accentInk` for orange text.
 */
export const colors = {
  bg: '#F8F5EF',
  bgDeep: '#F1EAE0',
  surface: '#FFFDFA',
  surfaceMuted: '#F2EDE6',
  ink: '#18191B',
  inkSecondary: '#6B6865',
  inkOnDark: '#FFFFFF',
  border: '#E9E4DE',
  accent: '#F58C62',
  accentSoft: '#FCE6DB',
  accentInk: '#A64B23',
  success: '#528C66',
  successSoft: '#E4F1E7',
  successInk: '#2F6B44',
  danger: '#D85550',
  dangerInk: '#A8322E',
  track: '#ECE6DE',
  tint: {
    peach: { bg: '#FBE7DC', fg: '#9C4A25' },
    blue: { bg: '#E6ECFB', fg: '#3D56A8' },
    lavender: { bg: '#EEE8FA', fg: '#5F4AA8' },
    mint: { bg: '#E3F1E5', fg: '#2F6B44' },
    butter: { bg: '#FFF3D3', fg: '#7A5A00' },
    pink: { bg: '#FBE3E3', fg: '#A23B3B' },
  },
} as const;

export type TintName = keyof typeof colors.tint;

export const space = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

export const radius = {
  sm: 12,
  md: 16,
  lg: 20,
  xl: 28,
  pill: 999,
} as const;

export const fonts = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
  extrabold: 'Inter_800ExtraBold',
  black: 'Inter_900Black',
  wordmark: 'ArchivoBlack_400Regular',
} as const;

export const type = {
  display: { fontFamily: fonts.extrabold, fontSize: 44, lineHeight: 46, letterSpacing: -1.6 },
  h1: { fontFamily: fonts.extrabold, fontSize: 34, lineHeight: 37, letterSpacing: -1.1 },
  h2: { fontFamily: fonts.extrabold, fontSize: 24, lineHeight: 28, letterSpacing: -0.6 },
  h3: { fontFamily: fonts.bold, fontSize: 18, lineHeight: 23, letterSpacing: -0.2 },
  body: { fontFamily: fonts.regular, fontSize: 16, lineHeight: 23 },
  bodyStrong: { fontFamily: fonts.semibold, fontSize: 16, lineHeight: 22 },
  lead: { fontFamily: fonts.regular, fontSize: 19, lineHeight: 26, letterSpacing: -0.2 },
  caption: { fontFamily: fonts.medium, fontSize: 13, lineHeight: 18 },
  eyebrow: { fontFamily: fonts.semibold, fontSize: 12, lineHeight: 16, letterSpacing: 2.4 },
  stat: { fontFamily: fonts.extrabold, fontSize: 30, lineHeight: 34, letterSpacing: -0.8 },
  button: { fontFamily: fonts.semibold, fontSize: 18, lineHeight: 22 },
} as const;

export type TypeVariant = keyof typeof type;

export const shadow = {
  card: { boxShadow: '0px 6px 18px rgba(92, 70, 45, 0.07)' },
  raised: { boxShadow: '0px 10px 28px rgba(60, 45, 30, 0.12)' },
} as const;

/** Minimum touch target (docs/DESIGN_SYSTEM.md). */
export const TOUCH = 44;

export const TAB_BAR_HEIGHT = 64;
