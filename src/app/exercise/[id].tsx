import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { AppText, Eyebrow } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Card, Chevron, ReviewBadge } from '@/components/Card';
import { ExerciseArt } from '@/components/Illustration';
import { EmptyState, Screen, TopBar } from '@/components/Screen';
import { EQUIPMENT_LABEL, findExercise } from '@/domain/exercises';
import { findOpenSession } from '@/domain/session';
import type { Exercise } from '@/domain/types';
import { useStore } from '@/state/AppStore';
import { colors, radius, space } from '@/theme/tokens';

const PATTERN_LABEL: Record<Exercise['pattern'], string> = {
  squat: 'Squat pattern',
  push: 'Push pattern',
  pull: 'Pull pattern',
  hinge: 'Hinge pattern',
  core: 'Core control',
};

function MetaItem({ icon, value, label }: { icon: keyof typeof Ionicons.glyphMap; value: string; label: string }) {
  return (
    <View style={styles.meta} accessible accessibilityLabel={`${label}: ${value}`}>
      <View style={styles.metaIcon}>
        <Ionicons name={icon} size={22} color={colors.ink} />
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
      <View style={[styles.chipDot, { backgroundColor: kind === 'primary' ? '#F27B70' : '#F4C04E' }]} />
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
      <View style={styles.art}>
        <ExerciseArt exercise={exercise} kind="hero" size={260} />
      </View>

      <View style={styles.metaRow}>
        <MetaItem icon="stats-chart" value="Beginner" label="Level" />
        <MetaItem icon="barbell-outline" value={equipment} label="Equipment" />
        <MetaItem
          icon={exercise.measure === 'seconds' ? 'timer-outline' : 'repeat'}
          value={exercise.measure === 'seconds' ? 'Timed hold' : exercise.perSide ? 'Reps each side' : 'Reps'}
          label="Measure"
        />
      </View>

      <ReviewBadge />

      <Card style={styles.section}>
        <AppText variant="h2">Muscles worked</AppText>
        <AppText tone="secondary">
          Mainly {exercise.primaryMuscles.join(' and ')}
          {exercise.secondaryMuscles.length > 0 ? `, with help from ${exercise.secondaryMuscles.join(', ')}` : ''}.
        </AppText>
        <View style={styles.chips}>
          {exercise.primaryMuscles.map((muscle) => (
            <MuscleChip key={muscle} name={muscle} kind="primary" />
          ))}
          {exercise.secondaryMuscles.map((muscle) => (
            <MuscleChip key={muscle} name={muscle} kind="secondary" />
          ))}
        </View>
        <AppText variant="caption" tone="secondary">
          Red: main muscles · Yellow: supporting muscles
        </AppText>
      </Card>

      <Card style={styles.section}>
        <AppText variant="h2">Starting position</AppText>
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
        <AppText variant="h2">Each rep</AppText>
        {exercise.phases.map((phase) => (
          <View key={phase.label} style={styles.phase}>
            <AppText variant="bodyStrong">{phase.label}</AppText>
            <AppText tone="secondary">{phase.text}</AppText>
          </View>
        ))}
      </Card>

      <Card style={styles.section}>
        <AppText variant="h2">Form cues</AppText>
        {exercise.cues.map((cue) => (
          <View key={cue} style={styles.listRow}>
            <Ionicons name="checkmark-circle" size={22} color={colors.success} />
            <AppText style={styles.flex}>{cue}</AppText>
          </View>
        ))}
      </Card>

      <Card style={styles.section}>
        <AppText variant="h2">Common mistakes</AppText>
        {exercise.mistakes.map((mistake) => (
          <View key={mistake} style={styles.listRow}>
            <Ionicons name="close-circle" size={22} color={colors.danger} />
            <AppText style={styles.flex}>{mistake.charAt(0).toUpperCase() + mistake.slice(1)}</AppText>
          </View>
        ))}
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
