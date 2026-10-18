import { getExercise } from '../exercises';
import { buildWorkout } from '../plan';
import { lastPerformance, loadStepKg, suggestTarget } from '../progression';
import { completeSession, createSession, setEffort, substituteExercise, updateSet } from '../session';
import type { Effort, EquipmentId, WorkoutSession } from '../types';
import { at, makePrefs } from './helpers';

const DUMBBELLS: EquipmentId[] = ['dumbbells'];
const opts = { units: 'kg' as const, equipment: DUMBBELLS };

/** One completed Full Body A where every set of `exerciseId` logged `values` (and `loadKg`). */
function logged(
  date: Date,
  exerciseId: string,
  values: number[],
  options: { loadKg?: number; effort?: Effort; history?: WorkoutSession[] } = {},
): WorkoutSession {
  const workoutId = ['plank', 'hip-hinge', 'dumbbell-rdl'].includes(exerciseId) ? 'B' : 'A';
  const plan = buildWorkout(workoutId, makePrefs({ equipment: DUMBBELLS }));
  let session = createSession(plan, { id: `p${date.getTime()}`, now: date, history: options.history ?? [], ...opts });
  const index = session.exercises.findIndex((log) => log.exerciseId === exerciseId);
  values.forEach((value, setIndex) => {
    session = updateSet(session, index, setIndex, {
      value,
      done: true,
      ...(options.loadKg !== undefined ? { loadKg: options.loadKg } : {}),
    });
  });
  if (options.effort) {
    session = setEffort(session, index, options.effort);
  }
  return completeSession(session, new Date(date.getTime() + 20 * 60_000));
}

describe('lastPerformance', () => {
  it('returns the latest completed sets for the exercise, with effort', () => {
    const older = logged(at(2026, 10, 5, 18), 'squat', [10, 10, 10]);
    const newer = logged(at(2026, 10, 7, 18), 'squat', [11, 11, 10], { effort: 'right' });
    const last = lastPerformance('squat', [newer, older]);
    expect(last?.sets.map((set) => set.value)).toEqual([11, 11, 10]);
    expect(last?.effort).toBe('right');
    expect(lastPerformance('plank', [older])).toBeNull();
  });
});

describe('suggestTarget', () => {
  const squat = getExercise('squat');
  const row = getExercise('row');
  const plank = getExercise('plank');

  it('starts from the plan the first time', () => {
    expect(suggestTarget(squat, 10, [], opts)).toMatchObject({ value: 10, loadKg: null, reason: 'first' });
  });

  it('adds a rep when every set hit the target, two when it felt easy', () => {
    expect(suggestTarget(squat, 10, [logged(at(2026, 10, 5), 'squat', [10, 10, 10])], opts)).toMatchObject({
      value: 11,
      reason: 'more-reps',
    });
    expect(
      suggestTarget(squat, 10, [logged(at(2026, 10, 5), 'squat', [10, 10, 10], { effort: 'easy' })], opts),
    ).toMatchObject({ value: 12, reason: 'more-reps' });
  });

  it('repeats the target when a set fell short or it felt hard', () => {
    expect(suggestTarget(squat, 10, [logged(at(2026, 10, 5), 'squat', [10, 9, 8])], opts)).toMatchObject({
      value: 10,
      reason: 'repeat',
    });
    expect(
      suggestTarget(squat, 10, [logged(at(2026, 10, 5), 'squat', [12, 12, 12], { effort: 'hard' })], opts),
    ).toMatchObject({ reason: 'repeat' });
  });

  it('suggests the harder variation at the top of the range when the equipment allows', () => {
    const top = logged(at(2026, 10, 5), 'squat', [14, 14, 14]);
    expect(suggestTarget(squat, 10, [top], opts)).toMatchObject({ reason: 'ready-for-harder', harderId: 'goblet-squat' });
    expect(suggestTarget(squat, 10, [top], { units: 'kg', equipment: [] })).toMatchObject({
      reason: 'hold-at-top',
      value: 14,
    });
  });

  it('adds load at the top of a loaded rep range and resets reps', () => {
    const climbing = logged(at(2026, 10, 5), 'row', [10, 10, 10], { loadKg: 8 });
    expect(suggestTarget(row, 10, [climbing], opts)).toMatchObject({ value: 11, loadKg: 8, reason: 'more-reps' });
    const atTop = logged(at(2026, 10, 7), 'row', [12, 12, 12], { loadKg: 8 });
    expect(suggestTarget(row, 10, [atTop, climbing], opts)).toMatchObject({ value: 10, loadKg: 10, reason: 'more-load' });
    expect(suggestTarget(row, 10, [atTop], { units: 'lb', equipment: DUMBBELLS }).loadKg).toBeCloseTo(8 + loadStepKg('lb'));
  });

  it('adds time to holds', () => {
    expect(suggestTarget(plank, 20, [logged(at(2026, 10, 6), 'plank', [20, 20])], opts)).toMatchObject({
      value: 25,
      reason: 'more-time',
    });
  });

  it('never suggests less than the plan', () => {
    const tiny = logged(at(2026, 10, 5), 'squat', [3, 3, 3]);
    expect(suggestTarget(squat, 10, [tiny], opts).value).toBe(10);
  });
});

describe('sessions use the suggestion', () => {
  it('pre-fills the next session with the progressed target and last load', () => {
    const first = logged(at(2026, 10, 5, 18), 'row', [10, 10, 10], { loadKg: 8 });
    const plan = buildWorkout('A', makePrefs({ equipment: DUMBBELLS }));
    const next = createSession(plan, { id: 'n', now: at(2026, 10, 7, 18), history: [first], ...opts });
    const row = next.exercises.find((log) => log.exerciseId === 'row');
    expect(row?.target).toBe(11);
    expect(row?.sets.every((set) => set.value === 11 && set.loadKg === 8)).toBe(true);
  });

  it('re-targets a swapped exercise from its own history', () => {
    const plan = buildWorkout('A', makePrefs({ equipment: DUMBBELLS }));
    const session = createSession(plan, { id: 'x', now: at(2026, 10, 7, 18), history: [], ...opts });
    const index = session.exercises.findIndex((log) => log.exerciseId === 'squat');
    const goblet = logged(at(2026, 10, 5), 'squat', [10, 10, 10]);
    const swapped = substituteExercise(session, index, 'goblet-squat', [goblet], opts);
    expect(swapped.exercises[index]).toMatchObject({ exerciseId: 'goblet-squat', target: 10, substitutedFrom: 'squat' });
  });
});
