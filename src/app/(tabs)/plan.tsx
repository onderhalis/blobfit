import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText, Eyebrow } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Card, Chevron, ReviewBadge, Tag } from '@/components/Card';
import { ExerciseArt, Illustration, MotionMarks } from '@/components/Illustration';
import { WeekDots } from '@/components/Progress';
import { Screen, TopBar } from '@/components/Screen';
import { WEEKDAY_LONG, weekdayOf } from '@/domain/dates';
import { getExercise } from '@/domain/exercises';
import { goalById } from '@/domain/goals';
import { WARM_UP, buildWorkout } from '@/domain/plan';
import { completedSessions, todayStatus, weekStreak, weekSummary } from '@/domain/progress';
import type { BodyArea, WorkoutId } from '@/domain/types';
import { useStartWorkout } from '@/features/useWorkoutActions';
import { pad2, plural, prescription } from '@/lib/format';
import { useNow, useStore } from '@/state/AppStore';
import { colors, radius, space, type TintName } from '@/theme/tokens';

const AREA_TAG: Record<BodyArea, { tint: TintName; icon: keyof typeof Ionicons.glyphMap }> = {
  'Lower Body': { tint: 'peach', icon: 'body-outline' },
  'Upper Body': { tint: 'blue', icon: 'barbell-outline' },
  Core: { tint: 'mint', icon: 'timer-outline' },
};

export default function Plan() {
  const { data } = useStore();
  const now = useNow(60_000);
  const startWorkout = useStartWorkout();
  const [preview, setPreview] = useState<WorkoutId | null>(null);
  const [warmUpOpen, setWarmUpOpen] = useState(false);
  const prefs = data.preferences;
  if (!prefs) {
    return null;
  }

  const status = todayStatus(prefs, data.sessions, now);
  const nextId = status.workout.id;
  const shownId = preview ?? nextId;
  const workout = buildWorkout(shownId, prefs);
  const sessionNumber = completedSessions(data.sessions).length + (status.kind === 'done' ? 0 : 1);
  const week = weekSummary(prefs, data.sessions, now);
  const streak = weekStreak(prefs, data.sessions, now);
  const goal = goalById(prefs.goal);

  const eyebrow =
    status.kind === 'rest' ? 'Rest day · next session' : status.kind === 'done' ? 'Done today' : "Today's plan";
  const lead =
    status.kind === 'rest'
      ? `Recover today. Next up on ${WEEKDAY_LONG[weekdayOf(status.nextDay)]}.`
      : status.kind === 'done'
        ? `Next up: ${status.workout.name} on ${WEEKDAY_LONG[weekdayOf(status.nextDay)]}.`
        : 'Keep going.\nA stronger, happier you is in progress.';

  const footer =
    status.kind === 'in-progress' ? (
      <Button testID="plan-start" label="Resume workout" arrow onPress={() => router.push('/workout')} style={styles.flex} />
    ) : (
      <Button
        testID="plan-start"
        label={status.kind === 'train' && shownId === nextId ? 'Start workout' : `Start ${workout.name}`}
        variant={status.kind === 'train' ? 'primary' : 'secondary'}
        arrow
        onPress={() => startWorkout(shownId)}
        style={styles.flex}
        accessibilityHint={status.kind === 'rest' ? 'Today is a rest day; you can still train if you feel ready.' : undefined}
      />
    );

  return (
    <Screen withTabBar footer={footer} testID="plan">
      <TopBar showProfile />

      <View style={styles.hero}>
        <View style={styles.heroText}>
          <Eyebrow>{eyebrow}</Eyebrow>
          <AppText variant="display" accessibilityLabel={`Session ${sessionNumber}`}>
            {status.kind === 'done' ? `Day ${pad2(sessionNumber)} ✓` : `Day ${pad2(sessionNumber)}`}
          </AppText>
          <AppText variant="lead" tone="secondary">
            {lead}
          </AppText>
        </View>
        <View style={styles.heroArt} pointerEvents="none">
          <Illustration name="blob-lunge" height={240} />
          <View style={styles.marks}>
            <MotionMarks size={36} />
          </View>
        </View>
      </View>

      <Card style={styles.weekCard}>
        <View style={styles.weekHead}>
          <Ionicons name="flame" size={28} color={colors.accent} />
          <Eyebrow tone="ink">
            {streak > 0 ? `${plural(streak, 'week')} on target` : `This week · ${week.done}/${week.target}`}
          </Eyebrow>
        </View>
        <WeekDots days={week.days} />
      </Card>

      <View style={styles.switcher} accessibilityRole="tablist">
        {(['A', 'B'] as const).map((id) => {
          const selected = shownId === id;
          return (
            <Pressable
              key={id}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              accessibilityLabel={`Full Body ${id}${id === nextId ? ', next up' : ''}`}
              onPress={() => setPreview(id)}
              style={[styles.switch, selected && styles.switchOn]}>
              <AppText variant="bodyStrong" style={{ color: selected ? colors.inkOnDark : colors.ink }}>
                Full Body {id}
              </AppText>
              {id === nextId ? (
                <AppText variant="caption" style={{ color: selected ? colors.inkOnDark : colors.inkSecondary }}>
                  Next up
                </AppText>
              ) : null}
            </Pressable>
          );
        })}
      </View>

      <Card style={styles.total} accessibilityLabel={`Total workout about ${workout.estimatedMinutes} minutes`}>
        <View style={styles.clock}>
          <Ionicons name="time-outline" size={28} color={colors.accentInk} />
        </View>
        <View style={styles.flex}>
          <Eyebrow>Total workout</Eyebrow>
          <AppText variant="stat">~{workout.estimatedMinutes} min</AppText>
        </View>
        <AppText variant="caption" tone="secondary" style={styles.totalNote}>
          {plural(workout.exercises.length, 'exercise')}
          {'\n'}+ warm-up
        </AppText>
      </Card>

      <Card style={styles.row} onPress={() => setWarmUpOpen(!warmUpOpen)} accessibilityLabel={`Warm-up, ${WARM_UP.minutes} minutes, ${WARM_UP.subtitle}`} accessibilityHint={warmUpOpen ? 'Hides the moves' : 'Shows the moves'}>
        <View style={styles.rowMain}>
          <View style={[styles.badge, { backgroundColor: colors.tint.mint.bg }]}>
            <Ionicons name="walk" size={24} color={colors.tint.mint.fg} />
          </View>
          <View style={[styles.flex, styles.rowText]}>
            <AppText variant="h3">WARM-UP</AppText>
            <AppText tone="secondary">
              {WARM_UP.minutes} min · {WARM_UP.subtitle}
            </AppText>
          </View>
          <Illustration name="blob-warm-up" height={70} />
          <Ionicons name={warmUpOpen ? 'chevron-up' : 'chevron-down'} size={20} color={colors.ink} />
        </View>
        {warmUpOpen ? (
          <View style={styles.moves}>
            {WARM_UP.moves.map((move) => (
              <AppText key={move} variant="caption" tone="secondary">
                • {move}
              </AppText>
            ))}
          </View>
        ) : null}
      </Card>

      {workout.exercises.map((item, index) => {
        const exercise = getExercise(item.exerciseId);
        const tag = AREA_TAG[exercise.bodyArea];
        return (
          <Card
            key={item.slot}
            testID={`plan-exercise-${exercise.id}`}
            style={styles.row}
            onPress={() => router.push({ pathname: '/exercise/[id]', params: { id: exercise.id } })}
            accessibilityLabel={`${index + 1}. ${exercise.name}, ${prescription(item)}`}
            accessibilityHint="Opens technique and tips">
            <View style={styles.rowMain}>
              <View style={styles.number}>
                <AppText variant="bodyStrong">{pad2(index + 1)}</AppText>
              </View>
              <View style={[styles.flex, styles.rowText]}>
                <AppText variant="h3">{exercise.name.toUpperCase()}</AppText>
                <AppText tone="secondary">{prescription(item)}</AppText>
                <Tag label={exercise.bodyArea} tint={tag.tint} icon={tag.icon} />
              </View>
              <ExerciseArt exercise={exercise} kind="thumb" size={96} />
              <Chevron />
            </View>
          </Card>
        );
      })}

      <Card tone="deep" style={styles.goal}>
        <Eyebrow>Your goal · {goal.title}</Eyebrow>
        <AppText>{goal.focusNote}</AppText>
        <AppText variant="caption" tone="secondary">
          Every goal starts from the same beginner foundation. Sets, reps and timings are starting points; adjust them
          to what you can control.
        </AppText>
        <ReviewBadge />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  hero: { flexDirection: 'row', minHeight: 220 },
  heroText: { flex: 1.2, gap: space.xs, justifyContent: 'center', zIndex: 1 },
  heroArt: { flex: 1, alignItems: 'center', marginRight: -space.xl, marginLeft: -space.xxl },
  marks: { position: 'absolute', top: 6, left: 10 },
  weekCard: { gap: space.sm, marginTop: -space.md },
  weekHead: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  switcher: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.pill,
    padding: space.xxs,
    gap: space.xxs,
  },
  switch: {
    flex: 1,
    minHeight: 48,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: space.xxs,
  },
  switchOn: { backgroundColor: colors.ink },
  total: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  clock: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  totalNote: { textAlign: 'right' },
  row: { paddingVertical: space.sm },
  rowMain: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  rowText: { gap: space.xxs },
  number: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  moves: { gap: space.xxs, paddingTop: space.sm, paddingLeft: 64 },
  goal: { gap: space.xs },
});
