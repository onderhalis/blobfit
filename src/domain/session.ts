import { getExercise } from './exercises';
import { slotTarget } from './plan';
import { startingPoint, suggestTarget } from './progression';
import type { Effort, EquipmentId, ExerciseLog, SetLog, Units, WorkoutPlan, WorkoutSession } from './types';

/** What progression needs to know about the user. Defaults keep older callers working. */
export interface ProgressionContext {
  units?: Units;
  equipment?: readonly EquipmentId[];
}

function context(options: ProgressionContext) {
  return { units: options.units ?? 'kg', equipment: options.equipment ?? [] };
}

export function createId(now: Date, random: () => number = Math.random): string {
  return `${now.getTime().toString(36)}-${Math.floor(random() * 1e9).toString(36)}`;
}

function byNewest(a: WorkoutSession, b: WorkoutSession): number {
  return (b.endedAt ?? b.startedAt).localeCompare(a.endedAt ?? a.startedAt);
}

/** The heaviest load used in the most recent completed session that included the exercise. */
export function lastLoadFor(exerciseId: string, sessions: readonly WorkoutSession[]): number | null {
  const completed = sessions.filter((session) => session.status === 'completed').sort(byNewest);
  for (const session of completed) {
    const loads = session.exercises
      .filter((log) => log.exerciseId === exerciseId && !log.skipped)
      .flatMap((log) => log.sets)
      .filter((set) => set.done && set.loadKg !== null)
      .map((set) => set.loadKg as number);
    if (loads.length > 0) {
      return Math.max(...loads);
    }
  }
  return null;
}

function freshSets(count: number, target: number, loadKg: number | null): SetLog[] {
  return Array.from({ length: count }, () => ({ value: target, loadKg, done: false }));
}

/**
 * A new session for `plan`. Each exercise starts from its suggested target (progression from the
 * last time it was logged) and the last load used.
 */
export function createSession(
  plan: WorkoutPlan,
  options: { id: string; now: Date; history: readonly WorkoutSession[] } & ProgressionContext,
): WorkoutSession {
  return {
    id: options.id,
    workoutId: plan.id,
    startedAt: options.now.toISOString(),
    status: 'active',
    pausedMs: 0,
    exercises: plan.exercises.map((planned) => {
      const exercise = getExercise(planned.exerciseId);
      const start = startingPoint(suggestTarget(exercise, planned.target, options.history, context(options)));
      const load = exercise.loadable ? (start.loadKg ?? lastLoadFor(exercise.id, options.history)) : null;
      return {
        slot: planned.slot,
        exerciseId: planned.exerciseId,
        skipped: false,
        target: start.value,
        sets: freshSets(planned.sets, start.value, load),
      };
    }),
  };
}

function mapExercise(
  session: WorkoutSession,
  index: number,
  update: (log: ExerciseLog) => ExerciseLog,
): WorkoutSession {
  return {
    ...session,
    exercises: session.exercises.map((log, i) => (i === index ? update(log) : log)),
  };
}

export function updateSet(
  session: WorkoutSession,
  exerciseIndex: number,
  setIndex: number,
  patch: Partial<SetLog>,
): WorkoutSession {
  return mapExercise(session, exerciseIndex, (log) => ({
    ...log,
    sets: log.sets.map((set, i) => {
      if (i !== setIndex) {
        return set;
      }
      const next = { ...set, ...patch };
      return {
        ...next,
        value: Math.max(0, Math.round(next.value)),
        loadKg: next.loadKg === null ? null : Math.max(0, Math.round(next.loadKg * 100) / 100),
      };
    }),
  }));
}

export const MAX_SETS = 8;

export function addSet(session: WorkoutSession, exerciseIndex: number): WorkoutSession {
  return mapExercise(session, exerciseIndex, (log) => {
    if (log.sets.length >= MAX_SETS) {
      return log;
    }
    const last = log.sets[log.sets.length - 1];
    return {
      ...log,
      sets: [...log.sets, { value: last?.value ?? log.target, loadKg: last?.loadKg ?? null, done: false }],
    };
  });
}

export function removeSet(session: WorkoutSession, exerciseIndex: number): WorkoutSession {
  return mapExercise(session, exerciseIndex, (log) =>
    log.sets.length <= 1 ? log : { ...log, sets: log.sets.slice(0, -1) },
  );
}

export function setSkipped(session: WorkoutSession, exerciseIndex: number, skipped: boolean): WorkoutSession {
  return mapExercise(session, exerciseIndex, (log) => ({
    ...log,
    skipped,
    sets: skipped ? log.sets.map((set) => ({ ...set, done: false })) : log.sets,
  }));
}

export function substituteExercise(
  session: WorkoutSession,
  exerciseIndex: number,
  exerciseId: string,
  history: readonly WorkoutSession[],
  options: ProgressionContext = {},
): WorkoutSession {
  const next = getExercise(exerciseId);
  return mapExercise(session, exerciseIndex, (log) => {
    const original = log.substitutedFrom ?? log.exerciseId;
    const start = startingPoint(suggestTarget(next, slotTarget(log.slot) ?? log.target, history, context(options)));
    const load = next.loadable ? (start.loadKg ?? lastLoadFor(next.id, history)) : null;
    return {
      ...log,
      exerciseId: next.id,
      substitutedFrom: original === next.id ? undefined : original,
      skipped: false,
      target: start.value,
      effort: undefined,
      sets: freshSets(log.sets.length, start.value, load),
    };
  });
}

/** The user accepted a heavier load: sets not yet done switch to it, with the new rep target. */
export function applyLoad(session: WorkoutSession, exerciseIndex: number, loadKg: number, value: number): WorkoutSession {
  return mapExercise(session, exerciseIndex, (log) => ({
    ...log,
    target: value,
    sets: log.sets.map((set) => (set.done ? set : { ...set, loadKg, value })),
  }));
}

export function setEffort(session: WorkoutSession, exerciseIndex: number, effort: Effort | undefined): WorkoutSession {
  return mapExercise(session, exerciseIndex, (log) => ({ ...log, effort }));
}

export function pauseSession(session: WorkoutSession, now: Date): WorkoutSession {
  if (session.status !== 'active') {
    return session;
  }
  return { ...session, status: 'paused', pausedAt: now.toISOString() };
}

export function resumeSession(session: WorkoutSession, now: Date): WorkoutSession {
  if (session.status !== 'paused' || !session.pausedAt) {
    return session;
  }
  const pausedFor = Math.max(0, now.getTime() - new Date(session.pausedAt).getTime());
  return { ...session, status: 'active', pausedAt: undefined, pausedMs: session.pausedMs + pausedFor };
}

/** Active training time, excluding pauses. */
export function elapsedMs(session: WorkoutSession, now: Date): number {
  const end =
    session.status === 'completed' && session.endedAt
      ? new Date(session.endedAt)
      : session.status === 'paused' && session.pausedAt
        ? new Date(session.pausedAt)
        : now;
  return Math.max(0, end.getTime() - new Date(session.startedAt).getTime() - session.pausedMs);
}

export function doneSets(session: WorkoutSession): number {
  return session.exercises
    .filter((log) => !log.skipped)
    .reduce((total, log) => total + log.sets.filter((set) => set.done).length, 0);
}

export function canComplete(session: WorkoutSession): boolean {
  return session.status !== 'completed' && doneSets(session) > 0;
}

export function completeSession(session: WorkoutSession, now: Date): WorkoutSession {
  if (!canComplete(session)) {
    return session;
  }
  const resumed = session.status === 'paused' ? resumeSession(session, now) : session;
  return {
    ...resumed,
    status: 'completed',
    endedAt: now.toISOString(),
    // Unfinished sets are not part of the record.
    exercises: resumed.exercises.map((log) => ({
      ...log,
      sets: log.skipped ? [] : log.sets.filter((set) => set.done),
    })),
  };
}

export interface SessionTotals {
  durationMs: number;
  sets: number;
  reps: number;
  seconds: number;
  volumeKg: number;
  exercises: number;
}

export function sessionTotals(session: WorkoutSession, now: Date = new Date()): SessionTotals {
  let sets = 0;
  let reps = 0;
  let seconds = 0;
  let volumeKg = 0;
  let exercises = 0;
  for (const log of session.exercises) {
    if (log.skipped) {
      continue;
    }
    const done = log.sets.filter((set) => set.done);
    if (done.length > 0) {
      exercises += 1;
    }
    const exercise = getExercise(log.exerciseId);
    // Per-side exercises log reps for one side; both sides were trained.
    const sides = exercise.perSide ? 2 : 1;
    for (const set of done) {
      sets += 1;
      if (exercise.measure === 'seconds') {
        seconds += set.value * sides;
      } else {
        reps += set.value * sides;
        volumeKg += set.value * (set.loadKg ?? 0) * sides;
      }
    }
  }
  return { durationMs: elapsedMs(session, now), sets, reps, seconds, volumeKg, exercises };
}

export function findOpenSession(sessions: readonly WorkoutSession[]): WorkoutSession | undefined {
  return sessions.find((session) => session.status === 'active' || session.status === 'paused');
}
