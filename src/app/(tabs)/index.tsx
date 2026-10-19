import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText, Eyebrow } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Card, Chevron } from '@/components/Card';
import { Hero } from '@/components/Hero';
import { Icon } from '@/components/Icon';
import { ExerciseArt } from '@/components/Illustration';
import { WeekDots } from '@/components/Progress';
import { Screen, TopBar } from '@/components/Screen';
import { WEEKDAY_LONG, formatDuration, formatShortDate, weekdayOf } from '@/domain/dates';
import { getExercise } from '@/domain/exercises';
import { WORKOUT_TEMPLATES, nextTrainingDay } from '@/domain/plan';
import { startingPoint, suggestTarget } from '@/domain/progression';
import { completedSessions, newBestsIn, todayStatus, weekStreak, weekSummary, type TodayStatus } from '@/domain/progress';
import { doneSets, sessionTotals } from '@/domain/session';
import { suggestionCopy } from '@/features/progressionCopy';
import { useStartWorkout } from '@/features/useWorkoutActions';
import { plural, prescription } from '@/lib/format';
import { useNow, useStore } from '@/state/AppStore';
import { colors, space } from '@/theme/tokens';

/** Plain status, no slogans: what today is and what happens next. */
function heroCopy(status: TodayStatus, now: Date): { headline: string; detail: string; cta: string } {
  const next = (date: Date) => WEEKDAY_LONG[weekdayOf(date)];
  switch (status.kind) {
    case 'in-progress': {
      const total = status.session.exercises.reduce((n, log) => n + (log.skipped ? 0 : log.sets.length), 0);
      return {
        headline: `${status.workout.name} in progress`,
        detail: `${doneSets(status.session)} of ${plural(total, 'set')} done.`,
        cta: 'Resume workout',
      };
    }
    case 'done': {
      const t = sessionTotals(status.session, now);
      return {
        headline: 'Done for today',
        detail: `${plural(t.sets, 'set')} in ${formatDuration(t.durationMs)}. Next: ${status.workout.name} on ${next(status.nextDay)}.`,
        cta: 'See summary',
      };
    }
    case 'rest':
      return {
        headline: 'Rest day',
        detail: `Next: ${status.workout.name} on ${next(status.nextDay)}.`,
        cta: 'See your plan',
      };
    case 'train':
      return {
        headline: `${status.workout.name} today`,
        detail: `${plural(status.workout.exercises.length, 'exercise')} · about ${status.workout.estimatedMinutes} min`,
        cta: 'Start workout',
      };
  }
}

export default function Home() {
  const { data } = useStore();
  const now = useNow(60_000);
  const startWorkout = useStartWorkout();
  const prefs = data.preferences;
  if (!prefs) {
    return null;
  }

  const units = data.settings.units;
  const status = todayStatus(prefs, data.sessions, now);
  const week = weekSummary(prefs, data.sessions, now);
  const streak = weekStreak(prefs, data.sessions, now);
  const copy = heroCopy(status, now);
  const history = completedSessions(data.sessions);
  const last = history[history.length - 1];
  // A plan started late in the week can have no planned sessions left this week.
  const firstDay = week.target === 0 ? nextTrainingDay(prefs, now) : null;

  const onHeroPress = () => {
    if (status.kind === 'in-progress') {
      router.push('/workout');
    } else if (status.kind === 'train') {
      startWorkout(status.workout.id);
    } else if (status.kind === 'done') {
      router.push({ pathname: '/session/[id]', params: { id: status.session.id } });
    } else {
      router.push('/plan');
    }
  };

  return (
    <Screen withTabBar testID="home">
      <TopBar showProfile />

      <Hero
        art="blob-idle-towel"
        artHeight={300}
        gap={space.sm}
        before={
          <Eyebrow>
            {WEEKDAY_LONG[weekdayOf(now)]} · {formatShortDate(now)}
          </Eyebrow>
        }
        headline={copy.headline}
        after={
          <AppText variant="lead" tone="secondary">
            {copy.detail}
          </AppText>
        }
        footer={
          <Button
            testID="home-cta"
            label={copy.cta}
            arrow
            onPress={onHeroPress}
            style={styles.cta}
            accessibilityHint={status.kind === 'train' ? `Starts ${status.workout.name}` : undefined}
          />
        }
      />

      <Card
        style={styles.section}
        onPress={() => router.push('/progress')}
        accessibilityLabel={
          firstDay
            ? `This week: your plan starts ${WEEKDAY_LONG[weekdayOf(firstDay)]}.`
            : `This week: ${week.done} of ${week.target} workouts done. ${plural(streak, 'week')} on target in a row.`
        }
        accessibilityHint="Opens your progress">
        <View style={styles.row}>
          <AppText variant="h3" style={styles.flex}>
            This week
          </AppText>
          <AppText variant="bodyStrong">{firstDay ? `Starts ${WEEKDAY_LONG[weekdayOf(firstDay)]}` : `${week.done} of ${week.target}`}</AppText>
        </View>
        <WeekDots days={week.days} />
        {firstDay ? (
          <AppText variant="caption" tone="secondary">
            Your first planned session is {WEEKDAY_LONG[weekdayOf(firstDay)]}.
            {week.done > 0 ? ` ${plural(week.done, 'extra session')} logged already.` : ' Training before then is optional.'}
          </AppText>
        ) : streak > 0 ? (
          <View style={styles.row}>
            <Icon name="flame" size={16} color={colors.accent} />
            <AppText variant="caption" tone="secondary">
              {plural(streak, 'week')} in a row on target
            </AppText>
          </View>
        ) : null}
      </Card>

      <Card style={styles.section} testID="home-up-next">
        <View style={styles.row}>
          <AppText variant="h3" style={styles.flex}>
            {status.kind === 'in-progress' ? 'In this workout' : status.kind === 'train' ? "Today's exercises" : 'Next workout'}
          </AppText>
          <AppText variant="caption" tone="secondary">
            {status.workout.name}
          </AppText>
        </View>
        {status.workout.exercises.map((item, index) => {
          const exercise = getExercise(item.exerciseId);
          const suggestion = suggestTarget(exercise, item.target, data.sessions, { units, equipment: prefs.equipment });
          const note = suggestionCopy(exercise.id, suggestion, units);
          return (
            <Pressable
              key={item.slot}
              style={({ pressed }) => [styles.exercise, index > 0 && styles.divider, pressed && styles.pressed]}
              onPress={() => router.push({ pathname: '/exercise/[id]', params: { id: exercise.id } })}
              accessibilityRole="button"
              accessibilityLabel={`${exercise.name}, ${prescription({ ...item, target: startingPoint(suggestion).value })}${note.tone === 'up' ? `, ${note.title}` : ''}`}>
              <ExerciseArt exercise={exercise} kind="thumb" size={48} />
              <View style={styles.flex}>
                <AppText variant="bodyStrong">{exercise.name}</AppText>
                <AppText variant="caption" tone="secondary">
                  {prescription({ ...item, target: startingPoint(suggestion).value })}
                </AppText>
                {note.tone === 'up' ? (
                  <AppText variant="caption" style={{ color: colors.successInk }}>
                    {note.title}
                  </AppText>
                ) : null}
              </View>
              <Icon name="chevron-forward" size={18} color={colors.inkSecondary} />
            </Pressable>
          );
        })}
      </Card>

      {last ? (
        <Card
          style={styles.lastCard}
          onPress={() => router.push({ pathname: '/session/[id]', params: { id: last.id } })}
          accessibilityLabel={`Last workout, ${WORKOUT_TEMPLATES[last.workoutId].name}, ${formatShortDate(new Date(last.endedAt as string))}`}>
          <View style={styles.flex}>
            <AppText variant="caption" tone="secondary">
              Last workout · {formatShortDate(new Date(last.endedAt as string))}
            </AppText>
            <AppText variant="bodyStrong">{WORKOUT_TEMPLATES[last.workoutId].name}</AppText>
            <AppText variant="caption" tone="secondary">
              {lastLine(last, data.sessions)}
            </AppText>
          </View>
          <Chevron />
        </Card>
      ) : null}
    </Screen>
  );
}

function lastLine(session: Parameters<typeof sessionTotals>[0], sessions: Parameters<typeof newBestsIn>[1]): string {
  const t = sessionTotals(session);
  const bests = newBestsIn(session, sessions).length;
  return [plural(t.sets, 'set'), formatDuration(t.durationMs), bests > 0 ? plural(bests, 'new best') : null]
    .filter(Boolean)
    .join(' · ');
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  cta: { paddingHorizontal: space.xxl },
  section: { gap: space.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  exercise: { flexDirection: 'row', alignItems: 'center', gap: space.sm, minHeight: 64, paddingVertical: space.xs },
  divider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  pressed: { opacity: 0.7 },
  lastCard: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
});
