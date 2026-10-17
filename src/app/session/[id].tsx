import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText, Eyebrow } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Card, Tag } from '@/components/Card';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { Illustration } from '@/components/Illustration';
import { EmptyState, Screen, TopBar } from '@/components/Screen';
import { formatDuration, formatShortDate, WEEKDAY_LONG, weekdayOf } from '@/domain/dates';
import { getExercise } from '@/domain/exercises';
import { WORKOUT_TEMPLATES } from '@/domain/plan';
import { completedSessions, newBestsIn } from '@/domain/progress';
import { sessionTotals } from '@/domain/session';
import { formatLoad, formatVolume, plural, setValueLabel } from '@/lib/format';
import { goToTab } from '@/features/navigation';
import { useStore } from '@/state/AppStore';
import { colors, space } from '@/theme/tokens';

export default function SessionSummary() {
  const { id, fresh } = useLocalSearchParams<{ id: string; fresh?: string }>();
  const { data, dispatch } = useStore();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const session = data.sessions.find((item) => item.id === id && item.status === 'completed');

  if (!session) {
    return (
      <Screen>
        <TopBar back title="Workout" />
        <EmptyState
          title="Workout not found"
          body="This session may have been deleted."
          action="Back to progress"
          onAction={() => goToTab('/progress')}
        />
      </Screen>
    );
  }

  const ordered = completedSessions(data.sessions);
  const number = ordered.findIndex((item) => item.id === session.id) + 1;
  const totals = sessionTotals(session);
  const bests = newBestsIn(session, data.sessions);
  const units = data.settings.units;
  const ended = new Date(session.endedAt ?? session.startedAt);
  const isFresh = fresh === '1';

  const stats = [
    { label: 'Time', value: formatDuration(totals.durationMs) },
    { label: 'Sets', value: String(totals.sets) },
    totals.reps > 0 ? { label: 'Reps', value: String(totals.reps) } : null,
    totals.seconds > 0 ? { label: 'Hold time', value: `${totals.seconds}s` } : null,
    totals.volumeKg > 0 ? { label: 'Volume', value: formatVolume(totals.volumeKg, units) } : null,
  ].filter((item): item is { label: string; value: string } => item !== null);

  return (
    <Screen
      testID="session-summary"
      footer={
        isFresh ? (
          <Button testID="summary-done" label="Done" arrow onPress={() => goToTab('/progress')} style={styles.flex} />
        ) : undefined
      }>
      {isFresh ? <View style={styles.spacerTop} /> : <TopBar back title={`Session ${number}`} />}

      <View style={styles.hero}>
        <View style={styles.heroText}>
          <Eyebrow>
            {WEEKDAY_LONG[weekdayOf(ended)]} · {formatShortDate(ended)}
          </Eyebrow>
          <AppText variant="h1">{isFresh ? 'Workout saved.' : WORKOUT_TEMPLATES[session.workoutId].name}</AppText>
          <AppText variant="lead" tone="secondary">
            {isFresh
              ? `Session ${number} is in your log. You showed up — that counts.`
              : `Session ${number} · ${WORKOUT_TEMPLATES[session.workoutId].focus}`}
          </AppText>
        </View>
        <View style={styles.heroArt} pointerEvents="none">
          <Illustration name="blob-flex-small" height={180} />
        </View>
      </View>

      <View style={styles.stats}>
        {stats.map((stat) => (
          <Card key={stat.label} style={styles.stat} accessibilityLabel={`${stat.label}: ${stat.value}`}>
            <AppText variant="h2">{stat.value}</AppText>
            <AppText variant="caption" tone="secondary">
              {stat.label}
            </AppText>
          </Card>
        ))}
      </View>

      {bests.length > 0 ? (
        <Card tone="butter" style={styles.section}>
          <View style={styles.row}>
            <Ionicons name="trophy-outline" size={22} color={colors.tint.butter.fg} />
            <AppText variant="h3">New personal bests</AppText>
          </View>
          {bests.map((best) => {
            const exercise = getExercise(best.exerciseId);
            return (
              <AppText key={`${best.exerciseId}-${best.kind}`}>
                {exercise.name}:{' '}
                {best.kind === 'load'
                  ? `${formatLoad(best.loadKg, units)} × ${best.value}`
                  : exercise.measure === 'seconds'
                    ? `${best.value}s hold`
                    : `${best.value} reps in a set`}
              </AppText>
            );
          })}
          <AppText variant="caption" tone="secondary">
            Compared with your own earlier sessions.
          </AppText>
        </Card>
      ) : null}

      {session.exercises.map((log) => {
        const exercise = getExercise(log.exerciseId);
        return (
          <Card key={log.slot} style={styles.section}>
            <View style={styles.row}>
              <AppText variant="h3" style={styles.flex}>
                {exercise.name}
              </AppText>
              {log.skipped || log.sets.length === 0 ? <Tag label="Skipped" tint="butter" /> : null}
            </View>
            {log.substitutedFrom ? (
              <AppText variant="caption" tone="secondary">
                Swapped from {getExercise(log.substitutedFrom).name}
              </AppText>
            ) : null}
            {log.sets.length > 0 ? (
              <AppText tone="secondary">
                {plural(log.sets.length, 'set')}:{' '}
                {log.sets
                  .map((set) =>
                    set.loadKg ? `${setValueLabel(exercise.id, set.value)} × ${formatLoad(set.loadKg, units)}` : setValueLabel(exercise.id, set.value),
                  )
                  .join(' · ')}
              </AppText>
            ) : null}
          </Card>
        );
      })}

      {!isFresh ? (
        <Button label="Delete this session" variant="danger" size="md" onPress={() => setConfirmDelete(true)} />
      ) : null}

      <ConfirmDialog
        visible={confirmDelete}
        title="Delete this session?"
        body="It will be removed from your progress. This cannot be undone."
        confirmLabel="Delete session"
        destructive
        onConfirm={() => {
          setConfirmDelete(false);
          dispatch({ type: 'deleteSession', sessionId: session.id });
          goToTab('/progress');
        }}
        onCancel={() => setConfirmDelete(false)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  spacerTop: { height: space.md },
  hero: { flexDirection: 'row', alignItems: 'center' },
  heroText: { flex: 1, gap: space.xs },
  heroArt: { marginRight: -space.xs },
  stats: { flexDirection: 'row', flexWrap: 'wrap', gap: space.xs },
  stat: { flexGrow: 1, flexBasis: '30%', alignItems: 'center', gap: 2 },
  section: { gap: space.xs },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
});
