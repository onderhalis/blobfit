import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Line } from 'react-native-svg';

import type { Exercise } from '@/domain/types';
import { colors, radius } from '@/theme/tokens';

import { ART, type ArtName } from './art';

interface IllustrationProps {
  name: ArtName;
  /** Rendered height; width follows the artwork's aspect ratio unless `width` is given. */
  height: number;
  width?: number;
  /** Omit for decorative art (hidden from screen readers). */
  label?: string;
  style?: StyleProp<ViewStyle>;
}

export function Illustration({ name, height, width, label, style }: IllustrationProps) {
  const art = ART[name];
  const w = width ?? (height * art.width) / art.height;
  return (
    <View
      style={[{ width: w, height }, style]}
      accessible={Boolean(label)}
      accessibilityRole={label ? 'image' : undefined}
      accessibilityLabel={label}
      importantForAccessibility={label ? 'yes' : 'no-hide-descendants'}
      accessibilityElementsHidden={!label}>
      <Image source={art.source} style={StyleSheet.absoluteFill} contentFit="contain" transition={0} />
    </View>
  );
}

const EXERCISE_THUMB: Record<string, ArtName> = {
  squat: 'blob-squat',
  'push-up': 'blob-push-up-small',
  'incline-push-up': 'blob-incline-push-up',
  row: 'blob-row',
};

const EXERCISE_HERO: Record<string, ArtName> = {
  squat: 'blob-squat',
  'push-up': 'blob-push-up',
  'incline-push-up': 'blob-incline-push-up',
  row: 'blob-row',
};

const PATTERN_ICON: Record<Exercise['pattern'], keyof typeof Ionicons.glyphMap> = {
  squat: 'body-outline',
  push: 'barbell-outline',
  pull: 'barbell-outline',
  hinge: 'body-outline',
  core: 'timer-outline',
};

export function exerciseArt(exercise: Exercise, kind: 'thumb' | 'hero'): ArtName | null {
  if (!exercise.illustration) {
    return null;
  }
  return (kind === 'thumb' ? EXERCISE_THUMB : EXERCISE_HERO)[exercise.illustration] ?? null;
}

/** Exercise artwork, or a neutral icon tile when no approved Blob pose exists yet. */
export function ExerciseArt({
  exercise,
  kind,
  size,
}: {
  exercise: Exercise;
  kind: 'thumb' | 'hero';
  size: number;
}) {
  const art = exerciseArt(exercise, kind);
  if (art) {
    const asset = ART[art];
    const fitsWide = asset.width / asset.height > 1.2;
    return fitsWide ? (
      <Illustration name={art} height={(size * asset.height) / asset.width} width={size} />
    ) : (
      <Illustration name={art} height={size} />
    );
  }
  return (
    <View
      style={[styles.placeholder, { width: size * 0.62, height: size * 0.62, borderRadius: size * 0.31 }]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants">
      <Ionicons name={PATTERN_ICON[exercise.pattern]} size={size * 0.3} color={colors.inkSecondary} />
    </View>
  );
}

/** The mascot's two-stroke "energy" marks. */
export function MotionMarks({ size = 28, color = colors.ink }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 28 28" accessibilityElementsHidden importantForAccessibility="no">
      <Line x1="9" y1="13" x2="13" y2="3" stroke={color} strokeWidth="3" strokeLinecap="round" />
      <Line x1="14" y1="21" x2="25" y2="14" stroke={color} strokeWidth="3" strokeLinecap="round" />
    </Svg>
  );
}

const styles = StyleSheet.create({
  placeholder: {
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
  },
});
