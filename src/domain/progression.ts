import { getExercise, isAvailable } from './exercises';
import type { Effort, EquipmentId, Exercise, Units, WorkoutSession } from './types';

export interface LastPerformance {
  /** When that session ended. */
  date: string;
  /** The value aimed for (reps or seconds per set). */
  target: number;
  /** Completed sets, in order. */
  sets: { value: number; loadKg: number | null }[];
  effort?: Effort;
}

/** Completed logs of this exercise, newest first (at most `limit`). */
export function performances(
  exerciseId: string,
  sessions: readonly WorkoutSession[],
  limit = Number.POSITIVE_INFINITY,
): LastPerformance[] {
  const completed = sessions
    .filter((session) => session.status === 'completed' && session.endedAt)
    .sort((a, b) => (b.endedAt as string).localeCompare(a.endedAt as string));
  const result: LastPerformance[] = [];
  for (const session of completed) {
    if (result.length >= limit) {
      break;
    }
    const log = session.exercises.find(
      (entry) => entry.exerciseId === exerciseId && !entry.skipped && entry.sets.some((set) => set.done),
    );
    if (log) {
      result.push({
        date: session.endedAt as string,
        target: log.target,
        sets: log.sets.filter((set) => set.done).map((set) => ({ value: set.value, loadKg: set.loadKg })),
        effort: log.effort,
      });
    }
  }
  return result;
}

/** The most recent completed session in which this exercise had at least one completed set. */
export function lastPerformance(exerciseId: string, sessions: readonly WorkoutSession[]): LastPerformance | null {
  return performances(exerciseId, sessions, 1)[0] ?? null;
}

export type SuggestionReason =
  | 'first'
  | 'repeat'
  | 'more-reps'
  | 'more-time'
  | 'more-load'
  | 'ready-for-harder'
  | 'hold-at-top';

export interface Suggestion {
  /** Reps or seconds for every set. */
  value: number;
  /** Load in kg, or null for bodyweight / not yet chosen. */
  loadKg: number | null;
  reason: SuggestionReason;
  last: LastPerformance | null;
  /** The harder variation to try, when `reason` is 'ready-for-harder'. */
  harderId?: string;
  /**
   * For 'more-load': what the session starts with until the user accepts the heavier load
   * (last time's load, reps at the top of the range). The increase is never applied for them.
   */
  hold?: { value: number; loadKg: number };
}

/** Reps/seconds and load a new session starts with: the suggestion, except an offered load increase. */
export function startingPoint(suggestion: Suggestion): { value: number; loadKg: number | null } {
  return suggestion.hold ?? { value: suggestion.value, loadKg: suggestion.loadKg };
}

/** Bodyweight reps climb this far above the plan's target before progressing the movement. */
export const REP_RANGE_BODYWEIGHT = 4;
/** Loaded reps climb this far above the plan's target before adding load. */
export const REP_RANGE_LOADED = 2;
/** Timed holds grow this many seconds above the plan's target. */
export const TIME_RANGE_SECONDS = 20;

/** Smallest sensible dumbbell step in each unit system, in kg (2 kg, or 5 lb). */
export function loadStepKg(units: Units): number {
  return units === 'lb' ? 2.268 : 2;
}

/**
 * Beginner progression from the last time this exercise was logged ("double progression"):
 * - missed the target, or it felt hard: repeat the same target;
 * - reps: add 1 rep (2 if it felt easy) up to the top of the rep range;
 * - loaded and at the top of the range: offer one load step with the plan's reps (the user taps
 *   to accept; until then the session keeps last time's load at the top of the range);
 * - bodyweight and at the top of the range: try the harder variation if the user has the
 *   equipment, otherwise hold the reps and slow the lowering;
 * - timed holds: add 5 s (10 s if easy) up to the top of the range.
 * Prescriptions are starting points pending qualified review (CLAUDE.md).
 */
export function suggestTarget(
  exercise: Exercise,
  plannedTarget: number,
  sessions: readonly WorkoutSession[],
  options: { units: Units; equipment: readonly EquipmentId[] },
): Suggestion {
  const last = lastPerformance(exercise.id, sessions);
  if (!last) {
    return { value: plannedTarget, loadKg: null, reason: 'first', last: null };
  }
  const achieved = Math.min(...last.sets.map((set) => set.value));
  const loads = last.sets.map((set) => set.loadKg ?? 0);
  const lastLoad = Math.max(...loads) > 0 ? Math.max(...loads) : null;
  const aimed = Math.max(plannedTarget, last.target);
  const loaded = exercise.loadable && lastLoad !== null;

  if (achieved < last.target || last.effort === 'hard') {
    return { value: Math.max(plannedTarget, last.target), loadKg: lastLoad, reason: 'repeat', last };
  }
  const step = last.effort === 'easy' ? 2 : 1;

  if (exercise.measure === 'seconds') {
    const top = plannedTarget + TIME_RANGE_SECONDS;
    if (achieved >= top) {
      return progressMovement(exercise, top, lastLoad, last, options.equipment);
    }
    return { value: Math.min(top, Math.max(aimed, achieved) + 5 * step), loadKg: null, reason: 'more-time', last };
  }

  if (loaded) {
    const top = plannedTarget + REP_RANGE_LOADED;
    if (achieved >= top) {
      const next = Math.round((lastLoad + loadStepKg(options.units)) * 100) / 100;
      return { value: plannedTarget, loadKg: next, reason: 'more-load', last, hold: { value: top, loadKg: lastLoad } };
    }
    return { value: Math.min(top, Math.max(aimed, achieved) + step), loadKg: lastLoad, reason: 'more-reps', last };
  }

  const top = plannedTarget + REP_RANGE_BODYWEIGHT;
  if (achieved >= top) {
    return progressMovement(exercise, top, lastLoad, last, options.equipment);
  }
  return { value: Math.min(top, Math.max(aimed, achieved) + step), loadKg: lastLoad, reason: 'more-reps', last };
}

function progressMovement(
  exercise: Exercise,
  top: number,
  loadKg: number | null,
  last: LastPerformance,
  equipment: readonly EquipmentId[],
): Suggestion {
  const harder = exercise.harderId ? getExercise(exercise.harderId) : null;
  if (harder && isAvailable(harder, equipment)) {
    return { value: top, loadKg, reason: 'ready-for-harder', last, harderId: harder.id };
  }
  return { value: top, loadKg, reason: 'hold-at-top', last };
}
