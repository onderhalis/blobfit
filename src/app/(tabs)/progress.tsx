import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { AppText, Eyebrow } from '@/components/AppText';
import { Card, Chevron } from '@/components/Card';
import { Icon } from '@/components/Icon';
import { Hero } from '@/components/Hero';
import { MotionMarks } from '@/components/Illustration';
import { ProgressRing } from '@/components/Progress';
import { EmptyState, Screen, TopBar, useLayout } from '@/components/Screen';
import { WEEKDAY_LONG, WEEKDAY_SHORT, addDays, formatShortDate, startOfDay, weekdayOf } from '@/domain/dates';
import { getExercise } from '@/domain/exercises';
import { WORKOUT_TEMPLATES, nextTrainingDay } from '@/domain/plan';
import {
  adherence,
  completedSessions,
  personalBests,
  thenAndNow,
  totals,
  weekStreak,
  trainingCalendar,
  weekSummary,
  type BestSet,
  type DayStatus,
} from '@/domain/progress';
import type { Units } from '@/domain/types';
import { formatLoad, formatVolume, percent, plural } from '@/lib/format';
import { useNow, useStore } from '@/state/AppStore';
import { colors, space } from '@/theme/tokens';

const CALENDAR_LABEL: Record<DayStatus, string> = {
  done: 'Trained',
  extra: 'Trained (extra day)',
  missed: 'Planned, not logged',
  planned: 'Planned',
  rest: 'Rest',
};

const CELL_STYLE: Record<DayStatus, object> = {
  done: { backgroundColor: colors.accent },
  extra: { backgroundColor: colors.accentSoft, borderWidth: 2, borderColor: colors.accent },
  missed: { backgroundColor: colors.track },
  planned: { borderWidth: 2, borderColor: colors.accent, backgroundColor: colors.surface },
  rest: { backgroundColor: colors.bg },
};

function describeSet(exerciseId: string, set: BestSet, units: Units): string {
  const exercise = getExercise(exerciseId);
  if (exercise.measure === 'seconds') {
    return `${set.value}s`;
  }
  return set.loadKg ? `${formatLoad(set.loadKg, units)} × ${set.value}` : `${set.value} reps`;
}

export default function Progress() {
  const { data } = useStore();
  const { compact, narrow, content } = useLayout();
  // Two tiles per row on small phones and large text; the third spans the row.
  const tileWidth = compact ? { flexBasis: (content - space.xs) / 2 - 1, flexGrow: 1 } : null;
  const now = useNow(60_000);
  const prefs = data.preferences;
  if (!prefs) {
    return null;
  }

  const units = data.settings.units;
  const sessions = completedSessions(data.sessions);
  const t = totals(data.sessions);
  const week = weekSummary(prefs, data.sessions, now);
  const streak = weekStreak(prefs, data.sessions, now);
  const adh = adherence(prefs, data.sessions, now);
  const comparisons = thenAndNow(data.sessions);
  const bests = personalBests(data.sessions).slice(0, 5);
  const monthStart = startOfDay(addDays(now, -29));
  const last30 = sessions.filter((session) => new Date(session.endedAt as string) >= monthStart).length;
  const calendar = trainingCalendar(prefs, data.sessions, now);
  const firstDate = sessions.length > 0 ? new Date(sessions[0].endedAt as string) : null;
  const headline = sessions.length === 0 ? 'No workouts yet' : `${plural(sessions.length, 'workout')} logged`;
  const detail = firstDate
    ? `Since ${formatShortDate(firstDate)} · ${plural(t.activeMinutes, 'minute')} of training`
    : 'Log your first workout and it will show up here.';

  return (
    <Screen withTabBar testID="progress">
      <TopBar showProfile />

      <Hero
        art="blob-flex-towel"
        artHeight={230}
        artOverlay={
          <View style={styles.marks}>
            <MotionMarks size={32} />
          </View>
        }
        before={<Eyebrow>Progress</Eyebrow>}
        headline={headline}
        after={
          <AppText variant="lead" tone="secondary">
            {detail}
          </AppText>
        }
      />

      <View style={[styles.pair, narrow && styles.stack]}>
        <Card style={[styles.ringCard]} onPress={() => router.push('/plan')}>
          <ProgressRing
            value={week.target === 0 ? 0 : week.done / week.target}
            size={132}
            stroke={13}
            label={
              week.target === 0
                ? `Week ${week.weekNumber}: no sessions planned yet, your plan starts ${WEEKDAY_LONG[weekdayOf(nextTrainingDay(prefs, now))]}`
                : `Week ${week.weekNumber}: ${week.done} of ${week.target} workouts this week`
            }>
            <AppText variant="eyebrow" tone="secondary" style={styles.ringEyebrow}>
              WEEK {week.weekNumber}
            </AppText>
            {week.target === 0 ? (
              <>
                <AppText variant="caption" tone="secondary">
                  Starts
                </AppText>
                <AppText variant="h2">{WEEKDAY_SHORT[weekdayOf(nextTrainingDay(prefs, now))]}</AppText>
              </>
            ) : (
              <>
                <AppText variant="stat">
                  {week.done}/{week.target}
                </AppText>
                <AppText variant="caption" tone="secondary">
                  Workouts
                </AppText>
              </>
            )}
          </ProgressRing>
        </Card>
        <Card style={styles.streakCard} accessibilityLabel={`${plural(streak, 'week')} in a row on target`}>
          <View style={styles.row}>
            <Icon name="flame" size={34} color={colors.accent} />
            <AppText variant="stat">{streak}</AppText>
          </View>
          <AppText variant="bodyStrong">{streak === 1 ? 'Week on target' : 'Weeks on target'}</AppText>
          <AppText variant="caption" tone="secondary">
            Weeks in a row you hit your planned sessions. Rest days never break it.
          </AppText>
        </Card>
      </View>

      {sessions.length > 0 ? (
        <View style={[styles.tiles, compact && styles.wrap]}>
          <Card style={[styles.tile, tileWidth]} accessibilityLabel={`${t.sessions} workouts in total, ${last30} in the last 30 days`}>
            <Icon name="barbell" size={26} color={colors.ink} />
            <AppText variant="h2">{t.sessions}</AppText>
            <AppText variant="caption" tone="secondary">
              Workouts
            </AppText>
            <AppText variant="caption" tone={last30 > 0 ? 'success' : 'secondary'}>
              {last30} in last 30 days
            </AppText>
          </Card>
          <Card
            style={[styles.tile, tileWidth]}
            accessibilityLabel={adh.ratio === null ? 'Consistency: not enough data yet' : `Consistency ${percent(adh.ratio)}`}>
            <Icon name="heart" size={26} color={colors.tint.pink.fg} />
            <AppText variant="h2">{adh.ratio === null ? '—' : percent(adh.ratio)}</AppText>
            <AppText variant="caption" tone="secondary">
              Consistency
            </AppText>
            <AppText variant="caption" tone="secondary">
              {adh.ratio === null ? 'After your first planned day' : `${adh.credited} of ${adh.scheduled} planned`}
            </AppText>
          </Card>
          <Card style={[styles.tile, tileWidth]} accessibilityLabel={`${t.reps} total reps`}>
            <Icon name="repeat" size={26} color={colors.tint.lavender.fg} />
            <AppText variant="h2">{t.reps}</AppText>
            <AppText variant="caption" tone="secondary">
              Total reps
            </AppText>
            <AppText variant="caption" tone="secondary">
              {t.volumeKg > 0 ? formatVolume(t.volumeKg, units) : `${t.seconds}s held`}
            </AppText>
          </Card>
        </View>
      ) : null}

      {sessions.length === 0 ? (
        <Card>
          <EmptyState
            title="No workouts logged yet"
            body="Finish your first session and your real numbers will appear here. Nothing is estimated."
            action="Go to today's plan"
            onAction={() => router.push('/plan')}
          />
        </Card>
      ) : (
        <>
          <Card style={styles.section}>
            <View style={styles.row}>
              <Eyebrow>First</Eyebrow>
              <Icon name="arrow-forward" size={14} color={colors.inkSecondary} />
              <Eyebrow>Latest</Eyebrow>
            </View>
            {comparisons.length === 0 ? (
              <AppText tone="secondary">Log the same exercise in two sessions to compare your first and latest sets.</AppText>
            ) : (
              comparisons.map((row) => (
                <View
                  key={row.exerciseId}
                  style={styles.compare}
                  accessible
                  accessibilityLabel={`${getExercise(row.exerciseId).name}: first ${describeSet(row.exerciseId, row.first, units)}, latest ${describeSet(row.exerciseId, row.latest, units)}`}>
                  <AppText variant="bodyStrong" style={styles.flex}>
                    {getExercise(row.exerciseId).name}
                  </AppText>
                  <View style={styles.compareValues}>
                    <AppText tone="secondary">{describeSet(row.exerciseId, row.first, units)}</AppText>
                    <Icon name="arrow-forward" size={16} color={colors.inkSecondary} />
                    <AppText variant="bodyStrong">{describeSet(row.exerciseId, row.latest, units)}</AppText>
                  </View>
                </View>
              ))
            )}
            <AppText variant="caption" tone="secondary">
              Best set in your first logged session vs your most recent one.
            </AppText>
          </Card>

          <Card style={styles.section} testID="progress-calendar">
            <View style={styles.row}>
              <AppText variant="h3" style={styles.flex}>
                Training calendar
              </AppText>
              <AppText variant="caption" tone="secondary">
                Last {plural(calendar.length, 'week')}
              </AppText>
            </View>
            <View style={styles.calendarRow}>
              <View style={styles.calendarLabel} />
              {WEEKDAY_SHORT.map((day) => (
                <AppText key={day} variant="caption" tone="secondary" center style={styles.calendarCell}>
                  {day.charAt(0)}
                </AppText>
              ))}
            </View>
            {calendar.map((week) => (
              <View key={week.weekStart.toISOString()} style={styles.calendarRow}>
                <AppText variant="caption" tone="secondary" style={styles.calendarLabel}>
                  {formatShortDate(week.weekStart)}
                </AppText>
                {week.days.map((day) => (
                  <View key={day.key} style={styles.calendarCell} accessible accessibilityLabel={`${formatShortDate(day.date)}: ${CALENDAR_LABEL[day.status]}`}>
                    <View style={[styles.cell, CELL_STYLE[day.status], day.isToday && styles.cellToday]} />
                  </View>
                ))}
              </View>
            ))}
            <View style={styles.legend}>
              {(['done', 'missed', 'planned', 'rest'] as const).map((status) => (
                <View key={status} style={styles.row}>
                  <View style={[styles.legendCell, CELL_STYLE[status]]} />
                  <AppText variant="caption" tone="secondary">
                    {CALENDAR_LABEL[status]}
                  </AppText>
                </View>
              ))}
            </View>
          </Card>

          {bests.length > 0 ? (
            <Card style={styles.section}>
              <View style={styles.row}>
                <Icon name="trophy-outline" size={20} color={colors.ink} />
                <AppText variant="h3">Personal bests</AppText>
              </View>
              {bests.map((best) => (
                <View key={best.exerciseId} style={styles.compare}>
                  <AppText style={styles.flex}>{getExercise(best.exerciseId).name}</AppText>
                  <AppText variant="bodyStrong">
                    {best.bestLoad
                      ? `${formatLoad(best.bestLoad.loadKg, units)} × ${best.bestLoad.value}`
                      : best.measure === 'seconds'
                        ? `${best.bestValue.value}s`
                        : `${best.bestValue.value} reps`}
                  </AppText>
                </View>
              ))}
            </Card>
          ) : null}

          <AppText variant="h2">Recent workouts</AppText>
          {[...sessions]
            .reverse()
            .slice(0, 6)
            .map((session) => {
              const index = sessions.indexOf(session) + 1;
              const date = new Date(session.endedAt as string);
              return (
                <Card
                  key={session.id}
                  style={styles.recent}
                  onPress={() => router.push({ pathname: '/session/[id]', params: { id: session.id } })}
                  accessibilityLabel={`Session ${index}, ${WORKOUT_TEMPLATES[session.workoutId].name}, ${formatShortDate(date)}`}>
                  <View style={styles.flex}>
                    <AppText variant="bodyStrong">
                      Session {index} · {WORKOUT_TEMPLATES[session.workoutId].name}
                    </AppText>
                    <AppText variant="caption" tone="secondary">
                      {formatShortDate(date)}
                    </AppText>
                  </View>
                  <Chevron />
                </Card>
              );
            })}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  marks: { position: 'absolute', top: 4, left: 0 },
  pair: { flexDirection: 'row', gap: space.sm },
  stack: { flexDirection: 'column' },
  wrap: { flexWrap: 'wrap' },
  ringCard: { alignItems: 'center', justifyContent: 'center', paddingVertical: space.md },
  ringEyebrow: { fontSize: 10, letterSpacing: 1.6 },
  streakCard: { flex: 1, gap: space.xxs, justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  tiles: { flexDirection: 'row', gap: space.xs },
  tile: { flex: 1, gap: 2, paddingHorizontal: space.sm },
  section: { gap: space.sm },
  compare: { flexDirection: 'row', alignItems: 'center', gap: space.sm, minHeight: 32 },
  compareValues: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  calendarRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  calendarLabel: { width: 48 },
  calendarCell: { flex: 1, alignItems: 'center' },
  cell: { width: '100%', maxWidth: 34, aspectRatio: 1, borderRadius: 8 },
  cellToday: { borderWidth: 2, borderColor: colors.ink },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginTop: space.xxs },
  legendCell: { width: 12, height: 12, borderRadius: 3 },
  recent: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
});
