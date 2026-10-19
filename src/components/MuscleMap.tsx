import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { space } from '@/theme/tokens';

import { AppText } from './AppText';
import { BODY_MAP } from './bodyMapArt';

/** Highlight colours, shared with the muscle chips (tools/art/body_map.py paints the layers in them). */
export const MUSCLE_COLORS = { primary: '#F27B70', secondary: '#F4C04E' } as const;

type Side = keyof typeof BODY_MAP;
const SIDES: Side[] = ['front', 'back'];

/**
 * Which side of Blob shows each muscle. The painted areas are an orientation aid on a figure without
 * anatomy, not anatomy, and stay "review pending" with the rest of the exercise content.
 * Every muscle name used in data/exercises.json must appear here (unit-tested).
 */
export const MUSCLE_REGIONS: Record<string, Side[]> = {};
for (const side of SIDES) {
  for (const muscle of Object.keys(BODY_MAP[side].layers)) {
    (MUSCLE_REGIONS[muscle] ??= []).push(side);
  }
}

function Figure({ side, primary, secondary, height }: { side: Side; primary: string[]; secondary: string[]; height: number }) {
  const art = BODY_MAP[side];
  const layers = (muscles: string[], kind: 'primary' | 'secondary') =>
    muscles.flatMap((muscle) => {
      const layer = art.layers[muscle];
      return layer ? [{ key: `${kind}-${muscle}`, source: layer[kind] }] : [];
    });
  return (
    <View style={styles.figure}>
      <View style={{ width: (height * art.width) / art.height, height }}>
        <Image source={art.base} style={StyleSheet.absoluteFill} contentFit="contain" transition={0} />
        {/* Supporting first, so where areas overlap the main muscle stays on top. */}
        {[...layers(secondary, 'secondary'), ...layers(primary, 'primary')].map((layer) => (
          <Image key={layer.key} source={layer.source} style={StyleSheet.absoluteFill} contentFit="contain" transition={0} />
        ))}
      </View>
      <AppText variant="caption" tone="secondary">
        {side === 'front' ? 'Front' : 'Back'}
      </AppText>
    </View>
  );
}

/** Blob from the front and back, with the exercise's main (coral) and supporting (amber) muscles. */
export function MuscleMap({ primary, secondary, height = 170 }: { primary: string[]; secondary: string[]; height?: number }) {
  const label = `Muscle map. Main: ${primary.join(', ')}.${secondary.length > 0 ? ` Supporting: ${secondary.join(', ')}.` : ''}`;
  return (
    <View style={styles.map} accessible accessibilityRole="image" accessibilityLabel={label}>
      {SIDES.map((side) => (
        <Figure key={side} side={side} primary={primary} secondary={secondary} height={height} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  map: { flexDirection: 'row', justifyContent: 'center', gap: space.xl, paddingVertical: space.xs },
  figure: { alignItems: 'center', gap: space.xxs },
});
