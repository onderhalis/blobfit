import { Image } from 'expo-image';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Line } from 'react-native-svg';

import type { Exercise } from '@/domain/types';
import { colors, radius } from '@/theme/tokens';

import { ART, type ArtAsset, type ArtName } from './art';
import { EXERCISE_FRAMES } from './exerciseFrames';
import { Icon, type IconName } from './Icon';

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
  'knee-push-up': 'blob-knee-push-up',
  lunge: 'blob-lunge',
  row: 'blob-row',
};

const EXERCISE_HERO: Record<string, ArtName> = {
  squat: 'blob-squat',
  'push-up': 'blob-push-up',
  'incline-push-up': 'blob-incline-push-up',
  'knee-push-up': 'blob-knee-push-up',
  lunge: 'blob-lunge',
  row: 'blob-row',
};

const PATTERN_ICON: Record<Exercise['pattern'], IconName> = {
  squat: 'body-outline',
  lunge: 'walk',
  hinge: 'body-outline',
  push: 'barbell-outline',
  pull: 'barbell-outline',
  core: 'timer-outline',
  arms: 'barbell-outline',
};

export function exerciseArt(exercise: Exercise, kind: 'thumb' | 'hero'): ArtAsset | null {
  // Exercise-specific frames (assets/exercises) win over the interim concept crops.
  const frames = EXERCISE_FRAMES[exercise.id];
  const frame = frames?.end ?? frames?.start;
  if (frame) {
    return frame;
  }
  const name = exercise.illustration ? (kind === 'thumb' ? EXERCISE_THUMB : EXERCISE_HERO)[exercise.illustration] : undefined;
  return name ? ART[name] : null;
}

/** An art asset fitted inside a `size` box: wide art fits the width, tall art the height. */
export function FittedArt({ asset, size, label }: { asset: ArtAsset; size: number; label?: string }) {
  const wide = asset.width / asset.height > 1.2;
  const height = wide ? (size * asset.height) / asset.width : size;
  const width = (height * asset.width) / asset.height;
  return (
    <View
      style={{ width, height }}
      accessible={Boolean(label)}
      accessibilityRole={label ? 'image' : undefined}
      accessibilityLabel={label}
      importantForAccessibility={label ? 'yes' : 'no-hide-descendants'}
      accessibilityElementsHidden={!label}>
      <Image source={asset.source} style={StyleSheet.absoluteFill} contentFit="contain" transition={0} />
    </View>
  );
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
    return <FittedArt asset={art} size={size} />;
  }
  return (
    <View
      style={[styles.placeholder, { width: size * 0.62, height: size * 0.62, borderRadius: size * 0.31 }]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants">
      <Icon name={PATTERN_ICON[exercise.pattern]} size={size * 0.3} color={colors.inkSecondary} />
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
