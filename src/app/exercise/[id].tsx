import { router, useLocalSearchParams } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { AppText, Eyebrow } from '@/components/AppText';
import { Button } from '@/components/Button';
import type { ArtAsset } from '@/components/art';
import { Card, Chevron, ReviewBadge, Tag } from '@/components/Card';
import { EXERCISE_FRAMES } from '@/components/exerciseFrames';
import { Icon, type IconName } from '@/components/Icon';
import { ExerciseArt, FittedArt } from '@/components/Illustration';
import { MUSCLE_COLORS, MuscleMap } from '@/components/MuscleMap';
import { EmptyState, Screen, TopBar, useLayout } from '@/components/Screen';
import { formatShortDate } from '@/domain/dates';
import { EQUIPMENT_LABEL, LEVEL_LABEL, PATTERN_LABEL, findExercise } from '@/domain/exercises';
import { slotTarget } from '@/domain/plan';
import { performances, suggestTarget } from '@/domain/progression';
import { findOpenSession } from '@/domain/session';
import type { CameraView, Exercise, ExerciseMistake } from '@/domain/types';
import { lastTimeSummary, nextTimeLine } from '@/features/progressionCopy';
import { listJoin } from '@/lib/format';
import { useStore } from '@/state/AppStore';
import { colors, radius, space } from '@/theme/tokens';

const VIEW_LABEL: Record<CameraView, string> = {
  side: 'From the side',
  front: 'From the front',
  back: 'From behind',
  above: 'From above',
};

const VIEW_ORDER: CameraView[] = ['side', 'front', 'back', 'above'];

function MetaItem({ icon, value, label }: { icon: IconName; value: string; label: string }) {
  return (
    <View style={styles.meta} accessible accessibilityLabel={`${label}: ${value}`}>
      <View style={styles.metaIcon}>
        <Icon name={icon} size={22} color={colors.ink} />
      </View>
      <AppText variant="caption" center>
        {value}
      </AppText>
      <AppText variant="caption" tone="secondary" center>
        {label}
      </AppText>
    </View>
  );
}

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
      {target ? <ExerciseArt exercise={target} kind="thumb" size={64} /> : null}
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

/** The two key positions, when exercise art exists (assets/exercises via npm run art:sync). */
function KeyFrames({ exercise }: { exercise: Exercise }) {
  const { content } = useLayout();
  const frames = EXERCISE_FRAMES[exercise.id];
  if (!frames?.start || !frames.end) {
    return (
      <View style={styles.art}>
        <ExerciseArt exercise={exercise} kind="hero" size={260} />
      </View>
    );
  }
  const size = (content - space.sm) / 2;
  return (
    <View style={styles.frames}>
      {[frames.start, frames.end].map((asset, i) => {
        const frame = exercise.artBrief.frames[i];
        return (
          <View key={frame.label} style={[styles.frame, { width: size }]}>
            <FittedArt asset={asset} size={size - space.sm} label={`${frame.label}: ${frame.pose}`} />
            <AppText variant="caption" tone="secondary" center>
              {i + 1}. {frame.label}
            </AppText>
          </View>
        );
      })}
    </View>
  );
}

function Mistake({ mistake, art, index }: { mistake: ExerciseMistake; art: ArtAsset | null; index: number }) {
  return (
    <View style={[styles.mistake, index > 0 && styles.divider]} testID={`mistake-${index}`}>
      <View style={styles.mistakeHead}>
        <Icon name="close-circle" size={22} color={colors.danger} />
        <AppText variant="h3" style={styles.flex}>
          {mistake.title}
        </AppText>
      </View>
      <Tag label={VIEW_LABEL[mistake.view]} tint="blue" icon="videocam-outline" />
      {art ? (
        <View style={styles.mistakeArt}>
          <FittedArt asset={art} size={160} label={`Shown wrong on purpose: ${mistake.looksLike}`} />
        </View>
      ) : null}
      <View style={styles.mistakeRow}>
        <AppText variant="caption" tone="secondary" style={styles.mistakeLabel}>
          LOOKS LIKE
        </AppText>
        <AppText>{mistake.looksLike}</AppText>
      </View>
      <View style={styles.mistakeRow}>
        <AppText variant="caption" tone="secondary" style={styles.mistakeLabel}>
          WHY IT MATTERS
        </AppText>
        <AppText tone="secondary">{mistake.why}</AppText>
      </View>
      <View style={[styles.mistakeRow, styles.fix]}>
        <View style={styles.mistakeHead}>
          <Icon name="checkmark-circle" size={18} color={colors.success} />
          <AppText variant="caption" style={[styles.mistakeLabel, { color: colors.successInk }]}>
            FIX
          </AppText>
        </View>
        <AppText>{mistake.fix}</AppText>
      </View>
    </View>
  );
}

export default function ExerciseDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data } = useStore();
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
    exercise.requires.length === 0 ? 'No equipment' : exercise.requires.map((item) => EQUIPMENT_LABEL[item]).join(', ');

  return (
    <Screen
      testID="exercise-detail"
      footer={
        inOpenSession ? (
          <Button label="Log your sets" arrow onPress={() => router.push('/workout')} style={styles.flex} />
        ) : undefined
      }>
      <TopBar back />

      <View style={styles.hero}>
        <View style={styles.heroText}>
          <Eyebrow>
            {exercise.bodyArea} · {PATTERN_LABEL[exercise.pattern]}
          </Eyebrow>
          <AppText variant="display" style={styles.name}>
            {exercise.name}
          </AppText>
          <AppText variant="lead" tone="secondary">
            {exercise.summary}
          </AppText>
        </View>
      </View>
      <KeyFrames exercise={exercise} />

      <View style={styles.metaRow}>
        <MetaItem icon="stats-chart" value={LEVEL_LABEL[exercise.level]} label="Level" />
        <MetaItem icon="barbell-outline" value={equipment} label="Equipment" />
        <MetaItem
          icon={exercise.measure === 'seconds' ? 'timer-outline' : 'repeat'}
          value={exercise.measure === 'seconds' ? 'Timed hold' : exercise.perSide ? 'Reps each side' : 'Reps'}
          label="Measure"
        />
      </View>

      <ReviewBadge />

      {history.length > 0 ? (
        <Card style={styles.section} testID="exercise-history">
          <AppText variant="h2">Your history</AppText>
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

      <Card style={styles.section}>
        <AppText variant="h2">Setup</AppText>
        <AppText>{exercise.startingPosition}</AppText>
      </Card>

      <Card style={styles.section}>
        <View style={styles.sectionHead}>
          <AppText variant="h2" style={styles.flex}>
            How to do it
          </AppText>
          <AppText variant="caption" tone="secondary">
            {exercise.steps.length} steps
          </AppText>
        </View>
        {exercise.steps.map((step, i) => (
          <View key={step} style={styles.step}>
            <View style={styles.stepNumber}>
              <AppText variant="bodyStrong">{i + 1}</AppText>
            </View>
            <AppText style={styles.flex}>{step}</AppText>
          </View>
        ))}
      </Card>

      <Card style={styles.section}>
        <AppText variant="h2">{exercise.measure === 'seconds' ? 'The hold' : 'Each rep'}</AppText>
        {exercise.phases.map((phase) => (
          <View key={phase.label} style={styles.phase}>
            <AppText variant="bodyStrong">{phase.label}</AppText>
            <AppText tone="secondary">{phase.text}</AppText>
          </View>
        ))}
        <View style={[styles.phase, styles.breathing]}>
          <AppText variant="bodyStrong">Breathing</AppText>
          <AppText tone="secondary">{exercise.breathing}</AppText>
        </View>
      </Card>

      <Card style={styles.section}>
        <AppText variant="h2">Coach cues</AppText>
        {exercise.cues.map((cue) => (
          <View key={cue} style={styles.listRow}>
            <Icon name="checkmark-circle" size={22} color={colors.success} />
            <AppText style={styles.flex}>{cue}</AppText>
          </View>
        ))}
      </Card>

      <Card style={styles.section} testID="form-checks">
        <AppText variant="h2">Check your form</AppText>
        <AppText tone="secondary">Film one set with your phone from these angles, then compare.</AppText>
        {VIEW_ORDER.filter((view) => exercise.formChecks.some((check) => check.view === view)).map((view) => (
          <View key={view} style={styles.viewGroup}>
            <Tag label={VIEW_LABEL[view]} tint="blue" icon="videocam-outline" />
            {exercise.formChecks
              .filter((check) => check.view === view)
              .map((check) => (
                <View key={check.check} style={styles.listRow}>
                  <View style={styles.bullet} />
                  <AppText style={styles.flex}>{check.check}</AppText>
                </View>
              ))}
          </View>
        ))}
      </Card>

      <Card style={styles.section} testID="mistakes">
        <AppText variant="h2">Common mistakes</AppText>
        {exercise.mistakes.map((mistake, i) => (
          <Mistake key={mistake.title} mistake={mistake} index={i} art={EXERCISE_FRAMES[exercise.id]?.mistakes[i] ?? null} />
        ))}
      </Card>

      <Card style={styles.section}>
        <AppText variant="h2">Stop, swap or go easier</AppText>
        {exercise.safety.map((note) => (
          <View key={note} style={styles.listRow}>
            <Icon name="warning-outline" size={20} color={colors.tint.butter.fg} />
            <AppText style={styles.flex}>{note}</AppText>
          </View>
        ))}
      </Card>

      <Card style={styles.section}>
        <AppText variant="h2">Muscles worked</AppText>
        <AppText tone="secondary">
          Mainly {listJoin(exercise.primaryMuscles)}
          {exercise.secondaryMuscles.length > 0 ? `, with help from ${listJoin(exercise.secondaryMuscles)}` : ''}.
        </AppText>
        <MuscleMap primary={exercise.primaryMuscles} secondary={exercise.secondaryMuscles} />
        <View style={styles.chips}>
          {exercise.primaryMuscles.map((muscle) => (
            <MuscleChip key={muscle} name={muscle} kind="primary" />
          ))}
          {exercise.secondaryMuscles.map((muscle) => (
            <MuscleChip key={muscle} name={muscle} kind="secondary" />
          ))}
        </View>
        <AppText variant="caption" tone="secondary">
          Red: main muscles · Yellow: supporting muscles. Simplified diagram, pending coach review.
        </AppText>
      </Card>

      <AppText variant="h2">Variations</AppText>
      <View style={styles.variations}>
        <Variation kind="Easier" name={exercise.easier} id={exercise.easierId} />
        <Variation kind="Harder" name={exercise.harder} id={exercise.harderId} />
      </View>

      <AppText variant="caption" tone="secondary">
        Stop if you feel pain, dizziness or unusual discomfort. This guidance has not yet been reviewed by a qualified
        coach and is not medical advice.
      </AppText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  hero: { gap: space.xs },
  heroText: { gap: space.xs },
  name: { marginTop: space.xxs },
  art: { alignItems: 'center', justifyContent: 'center', minHeight: 170 },
  frames: { flexDirection: 'row', gap: space.sm },
  frame: { alignItems: 'center', gap: space.xxs },
  breathing: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border, paddingTop: space.sm },
  viewGroup: { gap: space.xs, alignItems: 'flex-start' },
  bullet: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.ink, marginTop: 9, marginHorizontal: 8 },
  mistake: { gap: space.xs, alignItems: 'stretch', paddingTop: space.xs },
  divider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border, paddingTop: space.sm },
  mistakeHead: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  mistakeArt: { alignItems: 'center' },
  mistakeRow: { gap: 2 },
  mistakeLabel: { letterSpacing: 1.2, fontSize: 11 },
  fix: { backgroundColor: colors.successSoft, borderRadius: radius.md, padding: space.sm },
  metaRow: { flexDirection: 'row', gap: space.xs },
  meta: { flex: 1, alignItems: 'center', gap: 2 },
  metaIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: space.xxs,
  },
  section: { gap: space.sm },
  historyRow: { flexDirection: 'row', alignItems: 'baseline', gap: space.sm },
  historyDate: { width: 52 },
  sectionHead: { flexDirection: 'row', alignItems: 'center' },
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
  step: { flexDirection: 'row', gap: space.sm, alignItems: 'flex-start' },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  phase: { gap: 2 },
  listRow: { flexDirection: 'row', gap: space.sm, alignItems: 'flex-start' },
  variations: { gap: space.sm },
  variation: { flexDirection: 'row', alignItems: 'center', gap: space.sm, minHeight: 84 },
});
