import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Button, IconButton } from '@/components/Button';
import { OptionRow } from '@/components/Choice';
import { Illustration, MotionMarks } from '@/components/Illustration';
import { Screen, Wordmark } from '@/components/Screen';
import { DISCLAIMER } from '@/domain/goals';
import { DEFAULT_TRAINING_DAYS, isValidTrainingDays } from '@/domain/plan';
import type { EquipmentId, ExperienceLevel, GoalId, Weekday } from '@/domain/types';
import { DayPicker, EquipmentPicker, ExperiencePicker, GoalPicker } from '@/features/PreferenceEditors';
import { useStore } from '@/state/AppStore';
import { colors, radius, space } from '@/theme/tokens';

const STEPS = [
  { title: 'Choose your goal', lead: "We'll start you on a beginner plan that fits it." },
  { title: 'Where are you starting?', lead: 'There is no wrong answer. This sets how many sets you begin with.' },
  { title: 'Pick your training days', lead: 'Two to four days a week. Rest days are built in.' },
  { title: 'What do you have?', lead: 'Workouts adapt to your equipment.' },
] as const;

export default function Onboarding() {
  const { dispatch } = useStore();
  const [step, setStep] = useState(0);
  const [goal, setGoal] = useState<GoalId | null>(null);
  const [experience, setExperience] = useState<ExperienceLevel | null>(null);
  const [days, setDays] = useState<Weekday[]>(DEFAULT_TRAINING_DAYS[3]);
  const [equipment, setEquipment] = useState<EquipmentId[]>([]);
  const [accepted, setAccepted] = useState(false);

  const canContinue = [goal !== null, experience !== null, isValidTrainingDays(days), accepted][step];
  const last = step === STEPS.length - 1;

  const finish = () => {
    if (!goal || !experience) {
      return;
    }
    const now = new Date().toISOString();
    dispatch({
      type: 'savePreferences',
      preferences: {
        goal,
        experience,
        trainingDays: days,
        equipment,
        disclaimerAcceptedAt: now,
        planStartedAt: now,
      },
    });
  };

  return (
    <Screen
      testID="onboarding"
      footer={
        <Button
          testID="onboarding-continue"
          label={last ? 'Build my plan' : 'Continue'}
          arrow
          disabled={!canContinue}
          onPress={last ? finish : () => setStep(step + 1)}
          style={styles.flex}
        />
      }>
      <View style={styles.top}>
        {step > 0 ? (
          <IconButton icon="chevron-back" label="Previous step" onPress={() => setStep(step - 1)} />
        ) : null}
        <Wordmark />
      </View>

      <View style={styles.dots} accessible accessibilityLabel={`Step ${step + 1} of ${STEPS.length}`}>
        {STEPS.map((_, i) => (
          <View key={i} style={[styles.dot, i === step && styles.dotActive, i < step && styles.dotDone]} />
        ))}
      </View>

      <View style={styles.hero}>
        <View style={styles.heroText}>
          <AppText variant="h1">{STEPS[step].title}</AppText>
          <AppText variant="lead" tone="secondary">
            {STEPS[step].lead}
          </AppText>
        </View>
        {step === 0 ? (
          <View style={styles.heroArt}>
            <Illustration name="blob-thumbs-up" height={240} label="Blob giving a thumbs up" />
            <View style={styles.marks}>
              <MotionMarks size={34} />
            </View>
          </View>
        ) : null}
      </View>

      {step === 0 ? <GoalPicker value={goal} onChange={setGoal} /> : null}
      {step === 1 ? <ExperiencePicker value={experience} onChange={setExperience} /> : null}
      {step === 2 ? <DayPicker value={days} onChange={setDays} /> : null}
      {step === 1 || step === 2 ? (
        <View style={styles.stepArt}>
          <Illustration name={step === 1 ? 'blob-flex-small' : 'blob-warm-up'} height={step === 1 ? 170 : 130} />
        </View>
      ) : null}
      {step === 3 ? (
        <View style={styles.stack}>
          <EquipmentPicker value={equipment} onChange={setEquipment} />
          <View style={styles.disclaimer}>
            <AppText variant="h3">Before you start</AppText>
            <AppText variant="caption" tone="secondary">
              {DISCLAIMER}
            </AppText>
            <OptionRow
              testID="accept-disclaimer"
              title="I understand"
              subtitle="This is general fitness guidance, not medical advice."
              selected={accepted}
              multi
              onPress={() => setAccepted(!accepted)}
            />
          </View>
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  top: { flexDirection: 'row', alignItems: 'center', gap: space.sm, minHeight: 56 },
  dots: { flexDirection: 'row', gap: space.xs, marginTop: -space.xs },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.track },
  dotActive: { width: 28, backgroundColor: colors.ink },
  dotDone: { backgroundColor: colors.inkSecondary },
  hero: { flexDirection: 'row', alignItems: 'center', minHeight: 120 },
  heroText: { flex: 1, gap: space.xs, paddingRight: space.xs },
  heroArt: { marginRight: -space.lg, marginLeft: -space.xl },
  marks: { position: 'absolute', right: 6, top: -6 },
  stack: { gap: space.lg },
  stepArt: { alignItems: 'center', marginTop: space.md },
  disclaimer: {
    gap: space.sm,
    padding: space.md,
    borderRadius: radius.lg,
    backgroundColor: colors.bgDeep,
  },
});
