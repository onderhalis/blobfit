import { Ionicons } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { WEEKDAY_LONG, WEEKDAY_SHORT } from '@/domain/dates';
import type { WeekDay } from '@/domain/progress';
import { colors, space } from '@/theme/tokens';

import { AppText } from './AppText';

export function ProgressRing({
  value,
  size = 150,
  stroke = 14,
  label,
  children,
}: {
  /** 0..1 */
  value: number;
  size?: number;
  stroke?: number;
  /** Spoken description, e.g. "3 of 5 workouts this week". */
  label: string;
  children?: ReactNode;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(1, value));
  return (
    <View
      style={{ width: size, height: size }}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(clamped * 100) }}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={colors.track} strokeWidth={stroke} fill="none" />
        {clamped > 0 ? (
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            stroke={colors.accent}
            strokeWidth={stroke}
            strokeLinecap="round"
            fill="none"
            strokeDasharray={`${c} ${c}`}
            strokeDashoffset={c * (1 - clamped)}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        ) : null}
      </Svg>
      <View style={[StyleSheet.absoluteFill, styles.center]}>{children}</View>
    </View>
  );
}

export function ProgressBar({ value, label }: { value: number; label: string }) {
  const clamped = Math.max(0, Math.min(1, value));
  return (
    <View
      style={styles.track}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(clamped * 100) }}>
      <View style={[styles.fill, { width: `${clamped * 100}%` }]} />
    </View>
  );
}

const DOT = 28;

function dayDescription(day: WeekDay): string {
  const name = WEEKDAY_LONG[(day.date.getDay() + 6) % 7];
  const status = {
    done: 'workout done',
    extra: 'extra workout done',
    planned: 'workout planned',
    missed: 'planned workout not logged',
    rest: 'rest day',
  }[day.status];
  return `${name}${day.isToday ? ', today' : ''}: ${status}`;
}

export function WeekDots({ days }: { days: WeekDay[] }) {
  return (
    <View style={styles.week} accessibilityRole="list">
      {days.map((day, i) => {
        const done = day.status === 'done' || day.status === 'extra';
        return (
          <View key={day.key} style={styles.day} accessible accessibilityLabel={dayDescription(day)}>
            <View
              style={[
                styles.dot,
                done && styles.dotDone,
                day.status === 'planned' && styles.dotPlanned,
                day.status === 'missed' && styles.dotMissed,
                day.status === 'rest' && styles.dotRest,
                day.isToday && !done && styles.dotToday,
              ]}>
              {done ? <Ionicons name="checkmark" size={16} color={colors.inkOnDark} /> : null}
            </View>
            <AppText
              variant="caption"
              tone={day.isToday ? 'ink' : 'secondary'}
              style={day.isToday ? styles.today : undefined}>
              {WEEKDAY_SHORT[i]}
            </AppText>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
  track: { height: 12, borderRadius: 6, backgroundColor: colors.track, overflow: 'hidden' },
  fill: { height: 12, borderRadius: 6, backgroundColor: colors.accent },
  week: { flexDirection: 'row', justifyContent: 'space-between' },
  day: { alignItems: 'center', gap: space.xxs, minWidth: 36 },
  dot: {
    width: DOT,
    height: DOT,
    borderRadius: DOT / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotDone: { backgroundColor: colors.accent },
  dotPlanned: { borderWidth: 2, borderColor: colors.accent, backgroundColor: colors.surface },
  dotMissed: { borderWidth: 2, borderColor: colors.track, backgroundColor: colors.surface },
  dotRest: { width: 12, height: 12, marginVertical: (DOT - 12) / 2, backgroundColor: colors.track },
  dotToday: { borderWidth: 3 },
  today: { fontFamily: 'Inter_700Bold' },
});
