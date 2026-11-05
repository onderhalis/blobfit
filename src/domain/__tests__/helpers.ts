import { buildWorkout } from '../plan';
import { completeSession, createSession, updateSet } from '../session';
import type { Preferences, WorkoutId, WorkoutSession } from '../types';

/** Local-time date helper: month is 1-based for readability. */
export function at(year: number, month: number, day: number, hour = 9, minute = 0): Date {
  return new Date(year, month - 1, day, hour, minute);
}

export function makePrefs(overrides: Partial<Preferences> = {}): Preferences {
  return {
    goal: 'get-stronger',
    experience: 'some',
    trainingDays: [0, 2, 4],
    equipment: ['dumbbells'],
    disclaimerAcceptedAt: at(2026, 10, 5).toISOString(),
    // Monday 5 Oct 2026.
    planStartedAt: at(2026, 10, 5, 8).toISOString(),
    ...overrides,
  };
}

let counter = 0;

/**
 * A completed session on `date`. `values` sets every set's reps/seconds; `loadKg` applies to
 * loadable exercises.
 */
export function completedSession(
  date: Date,
  options: { workoutId?: WorkoutId; prefs?: Preferences; values?: number; loadKg?: number; durationMin?: number } = {},
): WorkoutSession {
  const prefs = options.prefs ?? makePrefs();
  const plan = buildWorkout(options.workoutId ?? 'A', prefs);
  counter += 1;
  let session = createSession(plan, { id: `s${counter}`, now: date, history: [] });
  session.exercises.forEach((log, exerciseIndex) => {
    log.sets.forEach((_, setIndex) => {
      session = updateSet(session, exerciseIndex, setIndex, {
        done: true,
        ...(options.values !== undefined ? { value: options.values } : {}),
        ...(options.loadKg !== undefined && log.exerciseId === 'row' ? { loadKg: options.loadKg } : {}),
      });
    });
  });
  const end = new Date(date.getTime() + (options.durationMin ?? 20) * 60_000);
  return completeSession(session, end);
}
