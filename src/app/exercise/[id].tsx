import { router, useLocalSearchParams } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { AppText, Eyebrow } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Card, Chevron, ReviewBadge, Tag } from '@/components/Card';
import { EXERCISE_FRAMES } from '@/components/exerciseFrames';
import { Icon } from '@/components/Icon';
import { ExerciseArt, FittedArt } from '@/components/Illustration';
import { MovementPlayer } from '@/components/MovementPlayer';
import { MUSCLE_COLORS, MuscleMap } from '@/components/MuscleMap';
import { EmptyState, Screen, TopBar, useLayout } from '@/components/Screen';
import { formatShortDate } from '@/domain/dates';
import { EQUIPMENT_LABEL, LEVEL_LABEL, PATTERN_LABEL, findExercise } from '@/domain/exercises';
import { slotTarget } from '@/domain/plan';
import { performances, suggestTarget } from '@/domain/progression';
import { findOpenSession } from '@/domain/session';
import type { Exercise } from '@/domain/types';
import { lastTimeSummary, nextTimeLine } from '@/features/progressionCopy';
import { useStore } from '@/state/AppStore';
import { colors, radius, space } from '@/theme/tokens';

/** Key points shown under the movement; the rest of the coaching lives in the pictures. */
const KEY_POINTS = 3;

function MuscleChip({ name, kind }: { name: string; kind: 'primary' | 'secondary' }) {
  return (
    <View style={styles.chip}>
      <View style={[styles.chipDot, { backgroundColor: MUSCLE_COLORS[kind] }]} />
      <AppText variant="caption">{name.charAt(0).toUpperCase() + name.slice(1)}</AppText>
    </View>
  );
}

function Variation({ kind, name, id }: { kind: 'Easier' | 'Harder'; name: string; id?: string }) {
  const target = id ? findExercise(id) : undefined;
  const tint = kind === 'Easier' ? colors.tint.mint : colors.tint.pink;
  const content = (
    <>
      <View style={styles.flex}>
        <Eyebrow style={{ color: tint.fg }}>{kind}</Eyebrow>
        <AppText variant="bodyStrong">{target?.name ?? name}</AppText>
      </View>
      {target ? <ExerciseArt exercise={target} kind="thumb" size={56} /> : null}
      {target ? <Chevron tone="surface" /> : null}
    </>
  );
  return target ? (
    <Card
      tone={kind === 'Easier' ? 'mint' : 'pink'}
      style={styles.variation}
      onPress={() => router.push({ pathname: '/exercise/[id]', params: { id: target.id } })}
      accessibilityLabel={`${kind} variation: ${target.name}`}>
      {content}
    </Card>
  ) : (
    <Card tone={kind === 'Easier' ? 'mint' : 'pink'} style={styles.variation}>
      {content}
    </Card>
  );
}

/** Each mistake as a picture of the fault (once drawn), its name and the one-line fix. */
function Mistakes({ exercise }: { exercise: Exercise }) {
  const { content } = useLayout();
  const art = EXERCISE_FRAMES[exercise.id]?.mistakes ?? [];
  const width = (content - space.lg * 2 - space.sm) / 2;
  return (
    <Card style={styles.section} testID="mistakes">
      <AppText variant="h2">Common mistakes</AppText>
      <View style={styles.mistakes}>
        {exercise.mistakes.map((mistake, i) => (
          <View
            key={mistake.title}
            testID={`mistake-${i}`}
            style={[styles.mistake, art[i] ? { width } : styles.mistakeRow]}
            accessible
            accessibilityLabel={`Mistake: ${mistake.title}. Fix: ${mistake.cue}`}>
            {art[i] ? (
              <View style={styles.mistakeArt}>
                <FittedArt asset={art[i]} size={width - space.sm} />
              </View>
            ) : null}
            <View style={styles.line}>
              <Icon name="close-circle" size={18} color={colors.danger} />
              <AppText variant="bodyStrong" style={styles.flex}>
                {mistake.title}
              </AppText>
            </View>
            <View style={styles.line}>
              <Icon name="checkmark-circle" size={18} color={colors.success} />
              <AppText tone="secondary" style={styles.flex}>
                {mistake.cue}
              </AppText>
            </View>
          </View>
        ))}
      </View>
    </Card>
  );
}

export default function ExerciseDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data } = useStore();
  const { content } = useLayout();
  const exercise = id ? findExercise(id) : undefined;

  if (!exercise) {
    return (
      <Screen>
        <TopBar back title="Exercise" />
        <EmptyState
          title="Exercise not found"
          body="This exercise isn't in the library. It may have been renamed."
          action="Open the library"
          onAction={() => router.replace('/library')}
        />
      </Screen>
    );
  }

  const units = data.settings.units;
  const history = performances(exercise.id, data.sessions, 4);
  const next =
    history.length > 0
      ? suggestTarget(exercise, slotTarget(exercise.pattern) ?? history[0].target, data.sessions, {
          units,
          equipment: data.preferences?.equipment ?? [],
        })
      : null;
  const open = findOpenSession(data.sessions);
  const inOpenSession = open?.exercises.some((log) => log.exerciseId === exercise.id);
  const equipment =
    exercise.requires.length === 0 ? 'No equipment' : exercise.requires.map((item) => EQUIPMENT_LABEL[item]).join(' + ');
  const measure = exercise.measure === 'seconds' ? (exercise.perSide ? 'Hold, each side' : 'Hold') : exercise.perSide ? 'Reps, each side' : 'Reps';

  return (
    <Screen
      testID="exercise-detail"
      footer={
        inOpenSession ? (
          <Button label="Log your sets" arrow onPress={() => router.push('/workout')} style={styles.flex} />
        ) : undefined
      }>
      <TopBar back />

      <View style={styles.head}>
        <Eyebrow>{PATTERN_LABEL[exercise.pattern]}</Eyebrow>
        <AppText variant="display">{exercise.name}</AppText>
        <View style={styles.tags}>
          <Tag label={LEVEL_LABEL[exercise.level]} tint={exercise.level === 1 ? 'mint' : exercise.level === 2 ? 'blue' : 'lavender'} />
          <Tag label={equipment} tint="peach" icon="barbell-outline" />
          <Tag label={measure} tint="butter" icon={exercise.measure === 'seconds' ? 'timer-outline' : 'repeat'} />
        </View>
      </View>

      <MovementPlayer exercise={exercise} size={Math.min(content, 360)} />

      {history.length > 0 ? (
        <Card style={styles.section} testID="exercise-history">
          <AppText variant="h3">Your history</AppText>
          {history.map((entry) => (
            <View key={entry.date} style={styles.historyRow}>
              <AppText variant="caption" tone="secondary" style={styles.historyDate}>
                {formatShortDate(new Date(entry.date))}
              </AppText>
              <AppText style={styles.flex}>{lastTimeSummary(exercise.id, entry, units)}</AppText>
            </View>
          ))}
          {next ? (
            <AppText variant="bodyStrong" style={{ color: colors.successInk }}>
              {nextTimeLine(exercise.id, next, units)}
            </AppText>
          ) : null}
        </Card>
      ) : null}

      <Card style={styles.section} testID="key-points">
        {exercise.cues.slice(0, KEY_POINTS).map((cue, i) => (
          <View key={cue} style={styles.line} testID={`key-point-${i}`}>
            <Icon name="checkmark-circle" size={22} color={colors.success} />
            <AppText variant="bodyStrong" style={styles.flex}>
              {cue}
            </AppText>
          </View>
        ))}
      </Card>

      <Mistakes exercise={exercise} />

      <Card style={styles.section}>
        <AppText variant="h3">Muscles</AppText>
        <MuscleMap primary={exercise.primaryMuscles} secondary={exercise.secondaryMuscles} height={130} />
        <View style={styles.chips}>
          {exercise.primaryMuscles.map((muscle) => (
            <MuscleChip key={muscle} name={muscle} kind="primary" />
          ))}
          {exercise.secondaryMuscles.map((muscle) => (
            <MuscleChip key={muscle} name={muscle} kind="secondary" />
          ))}
        </View>
      </Card>

      <View style={styles.variations}>
        <Variation kind="Easier" name={exercise.easier} id={exercise.easierId} />
        <Variation kind="Harder" name={exercise.harder} id={exercise.harderId} />
      </View>

      <ReviewBadge />
      <AppText variant="caption" tone="secondary">
        Stop if it hurts. Not yet reviewed by a qualified coach; not medical advice.
      </AppText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  head: { gap: space.xs },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: space.xxs },
  section: { gap: space.sm },
  historyRow: { flexDirection: 'row', alignItems: 'baseline', gap: space.sm },
  historyDate: { width: 52 },
  line: { flexDirection: 'row', gap: space.xs, alignItems: 'flex-start' },
  mistakes: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  mistake: { gap: space.xxs },
  mistakeRow: { width: '100%' },
  mistakeArt: { alignItems: 'center', backgroundColor: colors.surfaceMuted, borderRadius: radius.md, paddingVertical: space.xs },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.xs },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    paddingHorizontal: space.sm,
    paddingVertical: space.xs,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceMuted,
  },
  chipDot: { width: 12, height: 12, borderRadius: 6 },
  variations: { gap: space.sm },
  variation: { flexDirection: 'row', alignItems: 'center', gap: space.sm, minHeight: 76 },
});
