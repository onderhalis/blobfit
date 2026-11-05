import {
  DEFAULT_TRAINING_DAYS,
  buildWorkout,
  hasBackToBackRisk,
  isTrainingDay,
  isValidTrainingDays,
  nextTrainingDay,
  nextWorkoutId,
  reminderSlots,
} from '../plan';
import { createSession } from '../session';
import { at, completedSession, makePrefs } from './helpers';

describe('buildWorkout', () => {
  it('builds workout A as squat, incline push-up and a pull', () => {
    const plan = buildWorkout('A', makePrefs());
    expect(plan.exercises.map((item) => item.exerciseId)).toEqual(['squat', 'incline-push-up', 'row']);
    expect(plan.warmUpMinutes).toBe(5);
  });

  it('builds workout B as hinge, pull and plank', () => {
    const plan = buildWorkout('B', makePrefs());
    expect(plan.exercises.map((item) => item.exerciseId)).toEqual(['hip-hinge', 'row', 'plank']);
    expect(plan.exercises[2].target).toBe(20);
  });

  it('adapts the pull to available equipment', () => {
    const pull = (equipment: ('dumbbells' | 'band')[]) =>
      buildWorkout('A', makePrefs({ equipment })).exercises.find((item) => item.slot === 'pull')?.exerciseId;
    expect(pull(['dumbbells'])).toBe('row');
    expect(pull(['band'])).toBe('band-row');
    expect(pull([])).toBe('prone-y-raise');
  });

  it('starts brand-new and returning users on fewer sets', () => {
    expect(buildWorkout('A', makePrefs({ experience: 'new' })).exercises.every((item) => item.sets === 2)).toBe(true);
    expect(buildWorkout('A', makePrefs({ experience: 'returning' })).exercises.every((item) => item.sets === 2)).toBe(
      true,
    );
    expect(buildWorkout('A', makePrefs({ experience: 'some' })).exercises.every((item) => item.sets === 3)).toBe(true);
  });

  it('estimates duration in 5-minute steps including warm-up', () => {
    expect(buildWorkout('A', makePrefs({ equipment: [] })).estimatedMinutes).toBe(20);
    // Per-side rows take twice as long.
    expect(buildWorkout('A', makePrefs({ equipment: ['dumbbells'] })).estimatedMinutes).toBe(25);
    expect(buildWorkout('A', makePrefs({ experience: 'new', equipment: [] })).estimatedMinutes).toBe(15);
  });
});

describe('nextWorkoutId', () => {
  it('starts with A and alternates on completed sessions only', () => {
    expect(nextWorkoutId([])).toBe('A');
    const a = completedSession(at(2026, 10, 5), { workoutId: 'A' });
    expect(nextWorkoutId([a])).toBe('B');
    const b = completedSession(at(2026, 10, 7), { workoutId: 'B' });
    expect(nextWorkoutId([a, b])).toBe('A');
    const open = createSession(buildWorkout('A', makePrefs()), { id: 'open', now: at(2026, 10, 9), history: [] });
    expect(nextWorkoutId([a, b, open])).toBe('A');
  });

  it('does not skip a workout when days are missed', () => {
    const a = completedSession(at(2026, 10, 5), { workoutId: 'A' });
    // Two weeks later the user is still due workout B.
    expect(nextWorkoutId([a])).toBe('B');
  });
});

describe('schedule', () => {
  it('accepts 2–4 training days', () => {
    expect(isValidTrainingDays([0])).toBe(false);
    expect(isValidTrainingDays([0, 3])).toBe(true);
    expect(isValidTrainingDays([0, 1, 3, 4])).toBe(true);
    expect(isValidTrainingDays([0, 1, 2, 3, 4])).toBe(false);
    expect(isValidTrainingDays([0, 0, 3])).toBe(true);
  });

  it('default schedules always include rest days between blocks', () => {
    for (const days of Object.values(DEFAULT_TRAINING_DAYS)) {
      expect(hasBackToBackRisk(days)).toBe(false);
      expect(7 - days.length).toBeGreaterThanOrEqual(3);
    }
  });

  it('flags three training days in a row, including across the weekend', () => {
    expect(hasBackToBackRisk([0, 1, 2])).toBe(true);
    expect(hasBackToBackRisk([5, 6, 0])).toBe(true);
    expect(hasBackToBackRisk([0, 2, 4])).toBe(false);
  });

  it('finds training days and the next one', () => {
    const prefs = makePrefs({ trainingDays: [0, 2, 4] });
    expect(isTrainingDay(prefs, at(2026, 10, 12))).toBe(true); // Monday
    expect(isTrainingDay(prefs, at(2026, 10, 13))).toBe(false); // Tuesday
    expect(nextTrainingDay(prefs, at(2026, 10, 12)).getDate()).toBe(14);
    expect(nextTrainingDay(prefs, at(2026, 10, 12), true).getDate()).toBe(12);
    // Saturday → Monday.
    expect(nextTrainingDay(prefs, at(2026, 10, 17)).getDate()).toBe(19);
  });
});

describe('reminderSlots', () => {
  it('maps Monday-first training days to the scheduler weekday numbering (1 = Sunday)', () => {
    expect(reminderSlots([0, 2, 6], 18)).toEqual([
      { weekday: 2, hour: 18, minute: 0 },
      { weekday: 4, hour: 18, minute: 0 },
      { weekday: 1, hour: 18, minute: 0 },
    ]);
  });
});
