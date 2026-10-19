import { router } from 'expo-router';
import { useState } from 'react';
import { ActionSheetIOS, Platform, Pressable, StyleSheet, View } from 'react-native';

import { AppText, Eyebrow } from '@/components/AppText';
import { Button, IconButton } from '@/components/Button';
import { Card, Tag } from '@/components/Card';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { Icon, type IconName } from '@/components/Icon';
import { ExerciseArt } from '@/components/Illustration';
import { EmptyState, Screen } from '@/components/Screen';
import { Stepper } from '@/components/Stepper';
import { formatDuration } from '@/domain/dates';
import { getExercise, substitutesFor } from '@/domain/exercises';
import { WARM_UP, buildWorkout, slotTarget } from '@/domain/plan';
import { suggestTarget } from '@/domain/progression';
import { canComplete, doneSets, elapsedMs, findOpenSession, MAX_SETS } from '@/domain/session';
import type { ExerciseLog, Units, WorkoutSession } from '@/domain/types';
import { goToTab } from '@/features/navigation';
import { EFFORT_LABEL, lastTimeLine, suggestionCopy } from '@/features/progressionCopy';
import { formatLoad, fromDisplayLoad, plural, toDisplayLoad } from '@/lib/format';
import { haptics } from '@/lib/haptics';
import { useNow, useStore } from '@/state/AppStore';
import { colors, radius, space, TOUCH } from '@/theme/tokens';

const REST_SECONDS = 60;

export default function Workout() {
  const { data, dispatch } = useStore();
  const session = findOpenSession(data.sessions);
  const now = useNow(1000, Boolean(session));
  const [restUntil, setRestUntil] = useState<number | null>(null);
  const [confirm, setConfirm] = useState<'finish' | 'discard' | null>(null);
  const [warmUpDone, setWarmUpDone] = useState<string[]>([]);
  const [warmUpOpen, setWarmUpOpen] = useState(false);

  if (!session || !data.preferences) {
    return (
      <Screen>
        <View style={styles.header}>
          <IconButton icon="chevron-down" label="Close" onPress={() => router.back()} />
        </View>
        <EmptyState
          title="No workout in progress"
          body="Start today's session from your plan and your sets will appear here."
          action="Go to your plan"
          onAction={() => goToTab('/plan')}
        />
      </Screen>
    );
  }

  const plan = buildWorkout(session.workoutId, data.preferences);
  const paused = session.status === 'paused';
  const setsDone = doneSets(session);
  const unfinished = session.exercises
    .filter((log) => !log.skipped)
    .reduce((n, log) => n + log.sets.filter((set) => !set.done).length, 0);
  const restLeft = restUntil ? Math.ceil((restUntil - now.getTime()) / 1000) : 0;

  const finish = () => {
    const id = session.id;
    dispatch({ type: 'completeSession', sessionId: id, now: new Date().toISOString() });
    haptics.success();
    setConfirm(null);
    router.replace({ pathname: '/session/[id]', params: { id, fresh: '1' } });
  };

  return (
    <Screen
      testID="workout"
      footer={
        <Button
          testID="finish-workout"
          label="Finish workout"
          arrow
          disabled={!canComplete(session)}
          onPress={() => (unfinished > 0 ? setConfirm('finish') : finish())}
          accessibilityHint={setsDone === 0 ? 'Mark at least one set as done first' : undefined}
          style={styles.flex}
        />
      }>
      <View style={styles.header}>
        <IconButton icon="chevron-down" label="Minimise workout" onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} />
        <View style={styles.flex}>
          <AppText variant="h3" center>
            {plan.name}
          </AppText>
        </View>
        <IconButton icon="trash-outline" label="Discard workout" onPress={() => setConfirm('discard')} testID="discard-workout" />
      </View>

      <Card style={styles.timerCard}>
        <View style={styles.flex}>
          <Eyebrow>{paused ? 'Paused' : 'Workout time'}</Eyebrow>
          <AppText
            variant="display"
            accessibilityRole="timer"
            accessibilityLabel={`Workout time ${formatDuration(elapsedMs(session, now))}`}>
            {formatDuration(elapsedMs(session, now))}
          </AppText>
          <AppText variant="caption" tone="secondary">
            {plural(setsDone, 'set')} done
          </AppText>
        </View>
        <IconButton
          testID="pause-workout"
          icon={paused ? 'play' : 'pause'}
          label={paused ? 'Resume workout' : 'Pause workout'}
          tone="dark"
          size={60}
          onPress={() =>
            dispatch({
              type: paused ? 'resumeSession' : 'pauseSession',
              sessionId: session.id,
              now: new Date().toISOString(),
            })
          }
        />
      </Card>

      {restLeft > 0 ? (
        <View style={styles.rest} accessibilityLiveRegion="polite">
          <Icon name="hourglass-outline" size={20} color={colors.tint.blue.fg} />
          <AppText variant="bodyStrong" style={[styles.flex, { color: colors.tint.blue.fg }]}>
            Rest · {formatDuration(restLeft * 1000)}
          </AppText>
          <Pressable onPress={() => setRestUntil(null)} accessibilityRole="button" hitSlop={10} style={styles.skipRest}>
            <AppText variant="caption" style={{ color: colors.tint.blue.fg }}>
              Skip rest
            </AppText>
          </Pressable>
        </View>
      ) : null}

      <Card tone="mint" style={styles.section}>
        <Pressable
          onPress={() => setWarmUpOpen(!warmUpOpen)}
          accessibilityRole="button"
          aria-expanded={warmUpOpen}
          accessibilityLabel={`Warm-up, ${WARM_UP.minutes} minutes, ${warmUpDone.length} of ${WARM_UP.moves.length} moves done`}
          style={styles.warmHead}>
          <Icon name="walk" size={22} color={colors.tint.mint.fg} />
          <AppText variant="h3" style={styles.flex}>
            Warm-up · {WARM_UP.minutes} min
          </AppText>
          <AppText variant="caption" style={{ color: colors.tint.mint.fg }}>
            {warmUpDone.length}/{WARM_UP.moves.length}
          </AppText>
          <Icon name={warmUpOpen ? 'chevron-up' : 'chevron-down'} size={20} color={colors.ink} />
        </Pressable>
        {warmUpOpen ? WARM_UP.moves.map((move) => {
          const done = warmUpDone.includes(move);
          return (
            <Pressable
              key={move}
              accessibilityRole="checkbox"
              aria-checked={done}
              accessibilityLabel={move}
              onPress={() => setWarmUpDone(done ? warmUpDone.filter((m) => m !== move) : [...warmUpDone, move])}
              style={styles.warmRow}>
              <Icon name={done ? 'checkmark-circle' : 'ellipse-outline'} size={24} color={colors.tint.mint.fg} />
              <AppText variant="caption" style={styles.flex}>
                {move}
              </AppText>
            </Pressable>
          );
        }) : null}
      </Card>

      {session.exercises.map((log, index) => (
        <ExerciseCard
          key={log.slot}
          session={session}
          log={log}
          index={index}
          units={data.settings.units}
          equipment={data.preferences?.equipment ?? []}
          onSetDone={() => setRestUntil(Date.now() + REST_SECONDS * 1000)}
        />
      ))}

      <ConfirmDialog
        visible={confirm === 'finish'}
        title="Finish workout?"
        body={`${plural(unfinished, 'set')} not marked done will not be saved. Only sets you ticked count toward your progress.`}
        confirmLabel="Finish and save"
        onConfirm={finish}
        onCancel={() => setConfirm(null)}
      />
      <ConfirmDialog
        visible={confirm === 'discard'}
        title="Discard this workout?"
        body="Nothing from this session will be saved."
        confirmLabel="Discard workout"
        destructive
        onConfirm={() => {
          dispatch({ type: 'discardSession', sessionId: session.id });
          setConfirm(null);
          goToTab('/');
        }}
        onCancel={() => setConfirm(null)}
      />
    </Screen>
  );
}

function ExerciseCard({
  session,
  log,
  index,
  units,
  equipment,
  onSetDone,
}: {
  session: WorkoutSession;
  log: ExerciseLog;
  index: number;
  units: Units;
  equipment: Parameters<typeof substitutesFor>[1];
  onSetDone: () => void;
}) {
  const { data, dispatch } = useStore();
  const [swapOpen, setSwapOpen] = useState(false);
  const exercise = getExercise(log.exerciseId);
  // Same inputs the session used to set today's target, so the note explains the numbers shown.
  const suggestion = suggestTarget(exercise, slotTarget(log.slot) ?? log.target, data.sessions, { units, equipment });
  const note = suggestionCopy(exercise.id, suggestion, units);
  const timed = exercise.measure === 'seconds';
  const options = substitutesFor(log.exerciseId, equipment);
  const harder = suggestion.harderId ? options.find((option) => option.id === suggestion.harderId) : undefined;
  // A heavier load is only offered: the sets keep last time's load until the user taps to accept.
  const offered = suggestion.reason === 'more-load' && suggestion.loadKg !== null;
  const heavier =
    offered && log.sets.some((set) => !set.done && set.loadKg !== suggestion.loadKg) ? suggestion.loadKg : null;
  const detail =
    offered && heavier === null
      ? `Heavier load set: ${suggestion.value} reps at ${formatLoad(suggestion.loadKg, units)}.`
      : note.detail;
  const base = { sessionId: session.id, exerciseIndex: index } as const;
  const done = log.sets.filter((set) => set.done).length;
  const swapTo = (exerciseId: string) => dispatch({ type: 'substituteExercise', ...base, exerciseId });
  // iOS gets the system action sheet; elsewhere the options open inline under the card.
  const openSwap = () => {
    if (Platform.OS !== 'ios') {
      setSwapOpen(!swapOpen);
      return;
    }
    ActionSheetIOS.showActionSheetWithOptions(
      {
        title: `Swap ${exercise.name}`,
        message: 'Same movement, fits your equipment',
        options: [...options.map((option) => option.name), 'Cancel'],
        cancelButtonIndex: options.length,
      },
      (choice) => {
        if (choice < options.length) {
          swapTo(options[choice].id);
        }
      },
    );
  };

  return (
    <Card style={[styles.section, log.skipped && styles.skipped]} testID={`log-${exercise.id}`}>
      <View style={styles.exHead}>
        <ExerciseArt exercise={exercise} kind="thumb" size={64} />
        <View style={styles.flex}>
          <Pressable
            onPress={() => router.push({ pathname: '/exercise/[id]', params: { id: exercise.id } })}
            accessibilityRole="link"
            accessibilityHint="Opens technique and tips"
            hitSlop={{ top: 10, bottom: 10 }}>
            <AppText variant="h3">{exercise.name}</AppText>
          </Pressable>
          <AppText variant="caption" tone="secondary">
            Target {log.sets.length} × {log.target}
            {timed ? ' sec' : ' reps'}
            {exercise.perSide ? ' each side' : ''} · {done}/{log.sets.length} done
          </AppText>
          {log.substitutedFrom ? <Tag label={`Swapped from ${getExercise(log.substitutedFrom).name}`} tint="lavender" /> : null}
        </View>
      </View>

      {!log.skipped ? (
        <View style={[styles.note, note.tone === 'up' && styles.noteUp]} testID={`note-${exercise.id}`}>
          <Icon
            name={note.tone === 'up' ? 'trending-up' : note.tone === 'same' ? 'repeat' : 'sparkles'}
            size={18}
            color={note.tone === 'up' ? colors.successInk : colors.inkSecondary}
          />
          <View style={styles.flex}>
            <AppText variant="bodyStrong" style={note.tone === 'up' ? { color: colors.successInk } : undefined}>
              {note.title}
            </AppText>
            {detail ? (
              <AppText variant="caption" tone="secondary">
                {detail}
              </AppText>
            ) : null}
            {suggestion.last ? (
              <AppText variant="caption" tone="secondary">
                {lastTimeLine(exercise.id, suggestion.last, units)}
              </AppText>
            ) : null}
          </View>
        </View>
      ) : null}
      {harder && !log.skipped ? (
        <Button label={`Try ${harder.name}`} variant="secondary" size="md" icon="swap-horizontal" onPress={() => swapTo(harder.id)} />
      ) : null}
      {heavier !== null && !log.skipped ? (
        <Button
          testID={`apply-load-${exercise.id}`}
          label={`Use ${formatLoad(heavier, units)}`}
          variant="secondary"
          size="md"
          icon="trending-up"
          onPress={() => dispatch({ type: 'applyLoad', ...base, loadKg: heavier, value: suggestion.value })}
          accessibilityHint={`Sets not done yet switch to ${formatLoad(heavier, units)} for ${suggestion.value} reps`}
        />
      ) : null}

      {log.skipped ? (
        <AppText tone="secondary">Skipped today. It stays out of your totals.</AppText>
      ) : (
        log.sets.map((set, setIndex) => (
          <View key={setIndex} style={[styles.setRow, set.done && styles.setDone]}>
            <AppText variant="bodyStrong" style={styles.setLabel}>
              Set {setIndex + 1}
            </AppText>
            <View style={styles.setControls}>
              <Stepper
                testID={`set-${exercise.id}-${setIndex}-value`}
                label={`Set ${setIndex + 1} ${timed ? 'seconds' : 'reps'}`}
                value={set.value}
                step={timed ? 5 : 1}
                max={timed ? 600 : 100}
                unit={timed ? 'sec' : 'reps'}
                onChange={(value) => dispatch({ type: 'updateSet', ...base, setIndex, patch: { value } })}
              />
              {exercise.loadable ? (
                <Stepper
                  testID={`set-${exercise.id}-${setIndex}-load`}
                  label={`Set ${setIndex + 1} load`}
                  value={toDisplayLoad(set.loadKg ?? 0, units)}
                  step={units === 'kg' ? 1 : 2.5}
                  max={units === 'kg' ? 200 : 440}
                  unit={units}
                  format={(v) => (Number.isInteger(v) ? String(v) : v.toFixed(1))}
                  onChange={(value) =>
                    dispatch({
                      type: 'updateSet',
                      ...base,
                      setIndex,
                      patch: { loadKg: value === 0 ? null : fromDisplayLoad(value, units) },
                    })
                  }
                />
              ) : null}
            </View>
            <Pressable
              testID={`set-${exercise.id}-${setIndex}-done`}
              accessibilityRole="checkbox"
              aria-checked={set.done}
              accessibilityLabel={`Mark set ${setIndex + 1} done`}
              onPress={() => {
                dispatch({ type: 'updateSet', ...base, setIndex, patch: { done: !set.done } });
                if (!set.done) {
                  haptics.tap();
                  onSetDone();
                }
              }}
              style={[styles.doneButton, set.done && styles.doneButtonOn]}>
              <Icon name="checkmark" size={24} color={set.done ? colors.inkOnDark : colors.inkSecondary} />
            </Pressable>
          </View>
        ))
      )}

      {!log.skipped && log.sets.length > 0 && done === log.sets.length ? (
        <View style={styles.effort}>
          <AppText variant="caption" tone="secondary">
            How did that feel? It sets next time&apos;s target.
          </AppText>
          <View style={styles.effortRow} accessibilityRole="radiogroup" accessibilityLabel={`How did ${exercise.name} feel?`}>
            {(['easy', 'right', 'hard'] as const).map((effort) => {
              const selected = log.effort === effort;
              return (
                <Pressable
                  key={effort}
                  testID={`effort-${exercise.id}-${effort}`}
                  accessibilityRole="radio"
                  aria-checked={selected}
                  accessibilityLabel={EFFORT_LABEL[effort]}
                  onPress={() => dispatch({ type: 'setEffort', ...base, effort: selected ? undefined : effort })}
                  style={[styles.effortChip, selected && styles.effortChipOn]}>
                  <AppText variant="bodyStrong" style={{ color: selected ? colors.inkOnDark : colors.ink }}>
                    {EFFORT_LABEL[effort]}
                  </AppText>
                </Pressable>
              );
            })}
          </View>
        </View>
      ) : null}

      <View style={styles.actions}>
        {!log.skipped ? (
          <>
            <SmallAction
              icon="add"
              label="Set"
              a11y="Add a set"
              disabled={log.sets.length >= MAX_SETS}
              onPress={() => dispatch({ type: 'addSet', ...base })}
            />
            <SmallAction
              icon="remove"
              label="Set"
              a11y="Remove last set"
              disabled={log.sets.length <= 1}
              onPress={() => dispatch({ type: 'removeSet', ...base })}
            />
            <SmallAction
              icon="swap-horizontal"
              label="Swap"
              a11y="Swap for another exercise"
              disabled={options.length === 0}
              onPress={openSwap}
            />
          </>
        ) : null}
        <SmallAction
          icon={log.skipped ? 'arrow-undo' : 'play-skip-forward'}
          label={log.skipped ? 'Undo skip' : 'Skip'}
          a11y={log.skipped ? 'Undo skip' : 'Skip this exercise'}
          onPress={() => dispatch({ type: 'skipExercise', ...base, skipped: !log.skipped })}
        />
      </View>

      {swapOpen && !log.skipped ? (
        <View style={styles.swapList}>
          <AppText variant="caption" tone="secondary">
            Swap for (same movement, fits your equipment):
          </AppText>
          {options.map((option) => (
            <Pressable
              key={option.id}
              accessibilityRole="button"
              accessibilityLabel={`Swap to ${option.name}`}
              onPress={() => {
                swapTo(option.id);
                setSwapOpen(false);
              }}
              style={styles.swapOption}>
              <AppText variant="bodyStrong" style={styles.flex}>
                {option.name}
              </AppText>
              <Icon name="swap-horizontal" size={18} color={colors.ink} />
            </Pressable>
          ))}
        </View>
      ) : null}
    </Card>
  );
}

function SmallAction({
  icon,
  label,
  a11y,
  onPress,
  disabled,
}: {
  icon: IconName;
  label: string;
  a11y: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={a11y}
      aria-disabled={Boolean(disabled)}
      style={({ pressed }) => [styles.small, disabled && styles.smallDisabled, pressed && styles.pressed]}>
      <Icon name={icon} size={16} color={colors.ink} />
      <AppText variant="caption">{label}</AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: space.sm, minHeight: 56 },
  timerCard: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  rest: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    paddingHorizontal: space.md,
    minHeight: 52,
    borderRadius: radius.md,
    backgroundColor: colors.tint.blue.bg,
  },
  skipRest: { minHeight: TOUCH, justifyContent: 'center' },
  section: { gap: space.sm },
  skipped: { opacity: 0.7 },
  warmHead: { flexDirection: 'row', alignItems: 'center', gap: space.xs, minHeight: TOUCH },
  warmRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm, minHeight: TOUCH },
  exHead: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    padding: space.xs,
    borderRadius: radius.md,
    backgroundColor: colors.bg,
  },
  setDone: { backgroundColor: colors.successSoft },
  setLabel: { width: 50 },
  setControls: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: space.xs },
  doneButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneButtonOn: { backgroundColor: colors.success, borderColor: colors.success },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: space.xs },
  note: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space.xs,
    padding: space.sm,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceMuted,
  },
  noteUp: { backgroundColor: colors.successSoft },
  effort: { gap: space.xs },
  effortRow: { flexDirection: 'row', gap: space.xs },
  effortChip: {
    flex: 1,
    minHeight: TOUCH,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceMuted,
  },
  effortChipOn: { backgroundColor: colors.ink },
  small: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xxs,
    minHeight: TOUCH,
    paddingHorizontal: space.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceMuted,
  },
  smallDisabled: { opacity: 0.4 },
  pressed: { opacity: 0.75 },
  swapList: { gap: space.xs },
  swapOption: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: TOUCH + 4,
    paddingHorizontal: space.md,
    borderRadius: radius.md,
    backgroundColor: colors.tint.lavender.bg,
  },
});
