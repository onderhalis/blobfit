import { useEffect, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, View } from 'react-native';

import type { Exercise } from '@/domain/types';
import { useReducedMotion } from '@/lib/motion';
import { colors, radius, space } from '@/theme/tokens';

import { AppText } from './AppText';
import { EXERCISE_FRAMES } from './exerciseFrames';
import { Icon } from './Icon';
import { ExerciseArt, FittedArt } from './Illustration';

/** How long each key position is held, and the cross-fade between them. */
const HOLD_MS = 900;
const FADE_MS = 700;

/**
 * Shows the movement instead of describing it: the two key positions (assets/exercises) loop
 * start → end → start. Tap to pause. With Reduce Motion on, both positions sit side by side.
 * Until an exercise has its frames, the interim art or an icon stands in.
 */
export function MovementPlayer({ exercise, size }: { exercise: Exercise; size: number }) {
  const frames = EXERCISE_FRAMES[exercise.id];
  const reduced = useReducedMotion();
  const [playing, setPlaying] = useState(true);
  const [showingEnd, setShowingEnd] = useState(false);
  // Created once; state rather than a ref so render may read it.
  const [fade] = useState(() => new Animated.Value(0));
  const hasFrames = Boolean(frames?.start && frames.end);

  useEffect(() => {
    if (!hasFrames || reduced || !playing) {
      return undefined;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(HOLD_MS),
        Animated.timing(fade, { toValue: 1, duration: FADE_MS, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.delay(HOLD_MS),
        Animated.timing(fade, { toValue: 0, duration: FADE_MS, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ]),
    );
    const id = fade.addListener(({ value }) => setShowingEnd(value > 0.5));
    loop.start();
    return () => {
      loop.stop();
      fade.removeListener(id);
    };
  }, [fade, hasFrames, reduced, playing]);

  if (!frames?.start || !frames.end) {
    return (
      <View style={[styles.stage, { minHeight: size * 0.7 }]} testID="movement-player">
        <ExerciseArt exercise={exercise} kind="hero" size={size * 0.8} />
      </View>
    );
  }

  const [startLabel, endLabel] = exercise.artBrief.frames.map((frame) => frame.label);
  if (reduced) {
    const half = (size - space.sm) / 2;
    return (
      <View style={styles.pair} testID="movement-player">
        {[
          { asset: frames.start, label: startLabel },
          { asset: frames.end, label: endLabel },
        ].map((frame, i) => (
          <View key={frame.label} style={styles.still}>
            <FittedArt asset={frame.asset} size={half} label={`${exercise.name}, ${frame.label}`} />
            <AppText variant="caption" tone="secondary">
              {i + 1}. {frame.label}
            </AppText>
          </View>
        ))}
      </View>
    );
  }

  return (
    <Pressable
      testID="movement-player"
      onPress={() => setPlaying(!playing)}
      accessibilityRole="button"
      accessibilityLabel={`${exercise.name}, moving between ${startLabel} and ${endLabel}`}
      accessibilityHint={playing ? 'Pauses the movement' : 'Plays the movement'}
      style={[styles.stage, { height: size }]}>
      <Animated.View style={[StyleSheet.absoluteFill, styles.center, { opacity: fade.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }) }]}>
        <FittedArt asset={frames.start} size={size * 0.92} />
      </Animated.View>
      <Animated.View style={[StyleSheet.absoluteFill, styles.center, { opacity: fade }]}>
        <FittedArt asset={frames.end} size={size * 0.92} />
      </Animated.View>
      <View style={styles.badge}>
        <Icon name={playing ? 'pause' : 'play'} size={12} color={colors.ink} />
        <AppText variant="caption">{showingEnd ? endLabel : startLabel}</AppText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  stage: { alignItems: 'center', justifyContent: 'center', borderRadius: radius.xl },
  center: { alignItems: 'center', justifyContent: 'center' },
  pair: { flexDirection: 'row', gap: space.sm },
  still: { flex: 1, alignItems: 'center', gap: space.xxs },
  badge: {
    position: 'absolute',
    bottom: space.xs,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xxs,
    paddingHorizontal: space.sm,
    paddingVertical: space.xxs,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
  },
});
