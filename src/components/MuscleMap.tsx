import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Ellipse, G, Rect } from 'react-native-svg';

import { colors, space } from '@/theme/tokens';

import { AppText } from './AppText';

/** Highlight colours, shared with the muscle chips. */
export const MUSCLE_COLORS = { primary: '#F27B70', secondary: '#F4C04E' } as const;

type Side = 'front' | 'back';
type Shape =
  | { kind: 'rect'; x: number; y: number; w: number; h: number; r: number }
  | { kind: 'ellipse'; cx: number; cy: number; rx: number; ry: number };

const rect = (x: number, y: number, w: number, h: number, r = Math.min(w, h) / 2): Shape => ({ kind: 'rect', x, y, w, h, r });
const ellipse = (cx: number, cy: number, rx: number, ry: number): Shape => ({ kind: 'ellipse', cx, cy, rx, ry });
const mirror = (shape: Shape): Shape =>
  shape.kind === 'rect' ? { ...shape, x: 100 - shape.x - shape.w } : { ...shape, cx: 100 - shape.cx };
const pair = (shape: Shape) => [shape, mirror(shape)];

/**
 * Simplified regions on a neutral figure (viewBox 100 × 190 per side). Deliberately coarse: this is
 * an orientation aid, not anatomy, and stays "review pending" with the rest of the exercise content.
 * Every muscle name used in data/exercises.json must appear here (unit-tested).
 */
export const MUSCLE_REGIONS: Record<string, { side: Side; shapes: Shape[] }[]> = {
  chest: [{ side: 'front', shapes: pair(rect(30, 42, 19, 15, 6)) }],
  'front shoulders': [{ side: 'front', shapes: pair(ellipse(24, 43, 7, 7)) }],
  'rear shoulders': [{ side: 'back', shapes: pair(ellipse(24, 43, 7, 7)) }],
  shoulders: [
    { side: 'front', shapes: pair(ellipse(24, 43, 7, 7)) },
    { side: 'back', shapes: pair(ellipse(24, 43, 7, 7)) },
  ],
  biceps: [{ side: 'front', shapes: pair(rect(11, 50, 12, 17)) }],
  triceps: [{ side: 'back', shapes: pair(rect(11, 50, 12, 17)) }],
  grip: [
    { side: 'front', shapes: pair(rect(11, 70, 12, 22)) },
    { side: 'back', shapes: pair(rect(11, 70, 12, 22)) },
  ],
  core: [{ side: 'front', shapes: [rect(36, 60, 28, 32, 9)] }],
  quadriceps: [{ side: 'front', shapes: pair(rect(31, 104, 13, 38)) }],
  adductors: [{ side: 'front', shapes: pair(rect(44.5, 104, 4, 26, 2)) }],
  'upper back': [{ side: 'back', shapes: [rect(32, 38, 36, 15, 7)] }],
  back: [{ side: 'back', shapes: [rect(30, 55, 40, 22, 10)] }],
  'lower back': [{ side: 'back', shapes: [rect(38, 79, 24, 13, 6)] }],
  glutes: [{ side: 'back', shapes: pair(rect(31, 94, 18, 18, 9)) }],
  hamstrings: [{ side: 'back', shapes: pair(rect(31, 116, 15, 32)) }],
};

function ShapeView({ shape, fill }: { shape: Shape; fill: string }) {
  return shape.kind === 'rect' ? (
    <Rect x={shape.x} y={shape.y} width={shape.w} height={shape.h} rx={shape.r} fill={fill} />
  ) : (
    <Ellipse cx={shape.cx} cy={shape.cy} rx={shape.rx} ry={shape.ry} fill={fill} />
  );
}

function Figure({ side, primary, secondary, height }: { side: Side; primary: string[]; secondary: string[]; height: number }) {
  const shapes = (muscles: string[]) =>
    muscles.flatMap((muscle) => (MUSCLE_REGIONS[muscle] ?? []).filter((region) => region.side === side).flatMap((region) => region.shapes));
  return (
    <View style={styles.figure}>
      <Svg width={(height * 100) / 190} height={height} viewBox="0 0 100 190">
        <G fill={colors.surfaceMuted} stroke={colors.border} strokeWidth={1.5}>
          <Circle cx={50} cy={18} r={14} />
          <Rect x={8} y={38} width={16} height={58} rx={8} />
          <Rect x={76} y={38} width={16} height={58} rx={8} />
          <Rect x={29} y={98} width={20} height={86} rx={10} />
          <Rect x={51} y={98} width={20} height={86} rx={10} />
          <Rect x={24} y={33} width={52} height={78} rx={20} />
        </G>
        {/* Supporting first, so a main muscle drawn in both lists stays red on top. */}
        {shapes(secondary).map((shape, i) => (
          <ShapeView key={`s${i}`} shape={shape} fill={MUSCLE_COLORS.secondary} />
        ))}
        {shapes(primary).map((shape, i) => (
          <ShapeView key={`p${i}`} shape={shape} fill={MUSCLE_COLORS.primary} />
        ))}
      </Svg>
      <AppText variant="caption" tone="secondary">
        {side === 'front' ? 'Front' : 'Back'}
      </AppText>
    </View>
  );
}

/** Front and back figures with the exercise's main (red) and supporting (yellow) muscles. */
export function MuscleMap({ primary, secondary, height = 170 }: { primary: string[]; secondary: string[]; height?: number }) {
  const label = `Muscle map. Main: ${primary.join(', ')}.${secondary.length > 0 ? ` Supporting: ${secondary.join(', ')}.` : ''}`;
  return (
    <View style={styles.map} accessible accessibilityRole="image" accessibilityLabel={label}>
      <Figure side="front" primary={primary} secondary={secondary} height={height} />
      <Figure side="back" primary={primary} secondary={secondary} height={height} />
    </View>
  );
}

const styles = StyleSheet.create({
  map: { flexDirection: 'row', justifyContent: 'center', gap: space.xxl, paddingVertical: space.xs },
  figure: { alignItems: 'center', gap: space.xxs },
});
