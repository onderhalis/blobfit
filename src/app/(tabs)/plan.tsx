import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText, Eyebrow } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Card, Chevron, ReviewBadge, Tag } from '@/components/Card';
import { Icon, type IconName } from '@/components/Icon';
import { Hero } from '@/components/Hero';
import { suggestTarget } from '@/domain/progression';
import { suggestionCopy } from '@/features/progressionCopy';
import { ExerciseArt, Illustration, MotionMarks } from '@/components/Illustration';
import { WeekDots } from '@/components/Progress';
import { Screen, TopBar, useLayout } from '@/components/Screen';
import { WEEKDAY_LONG, weekdayOf } from '@/domain/dates';
import { getExercise } from '@/domain/exercises';
import { goalById } from '@/domain/goals';
import { WARM_UP, buildWorkout, nextTrainingDay } from '@/domain/plan';
import { completedSessions, todayStatus, weekStreak, weekSummary } from '@/domain/progress';
import type { BodyArea, WorkoutId } from '@/domain/types';
import { useStartWorkout } from '@/features/useWorkoutActions';
import { pad2, plural, prescription } from '@/lib/format';
import { useNow, useStore } from '@/state/AppStore';
import { colors, radius, space, type TintName } from '@/theme/tokens';

const AREA_TAG: Record<BodyArea, { tint: TintName; icon: IconName }> = {
  'Lower Body': { tint: 'peach', icon: 'body-outline' },
  'Upper Body': { tint: 'blue', icon: 'barbell-outline' },
  Core: { tint: 'mint', icon: 'timer-outline' },
};

export default function Plan() {
  // 320pt phones: rows drop the chevron and shrink the art so exercise names never break mid-word.
  const { narrow } = useLayout();
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
        : `${plural(workout.exercises.length, 'exercise')} · about ${workout.estimatedMinutes} min`;

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

      <Hero
        art="blob-lunge"
        artHeight={240}
        artOverlay={
          <View style={styles.marks}>
            <MotionMarks size={36} />
          </View>
        }
        before={<Eyebrow>{eyebrow}</Eyebrow>}
        headline={status.kind === 'done' ? `Day ${pad2(sessionNumber)} ✓` : `Day ${pad2(sessionNumber)}`}
        headlineVariant="display"
        headlineLabel={`Session ${sessionNumber}`}
        after={
          <AppText variant="lead" tone="secondary">
            {lead}
          </AppText>
        }
      />

      <Card style={styles.weekCard}>
        <View style={styles.weekHead}>
          <Icon name="flame" size={28} color={colors.accent} />
          <Eyebrow tone="ink">
            {streak > 0
              ? `${plural(streak, 'week')} on target`
              : week.target === 0
                ? `Your plan starts ${WEEKDAY_LONG[weekdayOf(nextTrainingDay(prefs, now))]}`
                : `This week · ${week.done}/${week.target}`}
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
              aria-selected={selected}
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
          <Icon name="time-outline" size={28} color={colors.accentInk} />
        </View>
        <View style={styles.flex}>
          <Eyebrow>Total workout</Eyebrow>
          <AppText variant="stat">~{workout.estimatedMinutes} min</AppText>
          {narrow ? (
            <AppText variant="caption" tone="secondary">
              {plural(workout.exercises.length, 'exercise')} + warm-up
            </AppText>
          ) : null}
        </View>
        {narrow ? null : (
          <AppText variant="caption" tone="secondary" style={styles.totalNote}>
            {plural(workout.exercises.length, 'exercise')}
            {'\n'}+ warm-up
          </AppText>
        )}
      </Card>

      <Card style={styles.row} onPress={() => setWarmUpOpen(!warmUpOpen)} accessibilityLabel={`Warm-up, ${WARM_UP.minutes} minutes, ${WARM_UP.subtitle}`} accessibilityHint={warmUpOpen ? 'Hides the moves' : 'Shows the moves'}>
        <View style={styles.rowMain}>
          <View style={[styles.badge, { backgroundColor: colors.tint.mint.bg }]}>
            <Icon name="walk" size={24} color={colors.tint.mint.fg} />
          </View>
          <View style={[styles.flex, styles.rowText]}>
            <AppText variant="h3">Warm-up</AppText>
            <AppText tone="secondary">
              {WARM_UP.minutes} min · {WARM_UP.subtitle}
            </AppText>
          </View>
          {narrow ? null : <Illustration name="blob-warm-up" height={70} />}
          <Icon name={warmUpOpen ? 'chevron-up' : 'chevron-down'} size={20} color={colors.ink} />
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
        const suggestion = suggestTarget(exercise, item.target, data.sessions, {
          units: data.settings.units,
          equipment: prefs.equipment,
        });
        const note = suggestionCopy(exercise.id, suggestion, data.settings.units);
        const planned = { ...item, target: suggestion.value };
        return (
          <Card
            key={item.slot}
            testID={`plan-exercise-${exercise.id}`}
            style={styles.row}
            onPress={() => router.push({ pathname: '/exercise/[id]', params: { id: exercise.id } })}
            accessibilityLabel={`${index + 1}. ${exercise.name}, ${prescription(planned)}${note.tone === 'up' ? `, ${note.title}` : ''}`}
            accessibilityHint="Opens technique and tips">
            <View style={styles.rowMain}>
              <View style={styles.number}>
                <AppText variant="bodyStrong">{pad2(index + 1)}</AppText>
              </View>
              <View style={[styles.flex, styles.rowText]}>
                <AppText variant="h3">{exercise.name}</AppText>
                <AppText variant="caption" tone="secondary">
                  {prescription(planned)}
                </AppText>
                {note.tone === 'up' ? (
                  <AppText variant="caption" style={{ color: colors.successInk }}>
                    {note.title}
                  </AppText>
                ) : null}
                <Tag label={exercise.bodyArea} tint={tag.tint} icon={tag.icon} />
              </View>
              <ExerciseArt exercise={exercise} kind="thumb" size={narrow ? 60 : 76} />
              {narrow ? null : <Chevron />}
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
  marks: { position: 'absolute', top: 6, left: 10 },
  weekCard: { gap: space.sm },
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
  rowMain: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  rowText: { gap: space.xxs },
  number: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  moves: { gap: space.xxs, paddingTop: space.sm, paddingLeft: 64 },
  goal: { gap: space.xs },
});
