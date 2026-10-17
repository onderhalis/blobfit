import { getExercise } from './exercises';
import type { ExerciseLog, SetLog, WorkoutPlan, WorkoutSession } from './types';

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

export function createSession(
  plan: WorkoutPlan,
  options: { id: string; now: Date; history: readonly WorkoutSession[] },
): WorkoutSession {
  return {
    id: options.id,
    workoutId: plan.id,
    startedAt: options.now.toISOString(),
    status: 'active',
    pausedMs: 0,
    exercises: plan.exercises.map((planned) => {
      const exercise = getExercise(planned.exerciseId);
      const load = exercise.loadable ? lastLoadFor(exercise.id, options.history) : null;
      return {
        slot: planned.slot,
        exerciseId: planned.exerciseId,
        skipped: false,
        target: planned.target,
        sets: freshSets(planned.sets, planned.target, load),
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
): WorkoutSession {
  const next = getExercise(exerciseId);
  return mapExercise(session, exerciseIndex, (log) => {
    const original = log.substitutedFrom ?? log.exerciseId;
    const load = next.loadable ? lastLoadFor(next.id, history) : null;
    return {
      ...log,
      exerciseId: next.id,
      substitutedFrom: original === next.id ? undefined : original,
      skipped: false,
      sets: freshSets(log.sets.length, log.target, load),
    };
  });
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
    const measure = getExercise(log.exerciseId).measure;
    for (const set of done) {
      sets += 1;
      if (measure === 'seconds') {
        seconds += set.value;
      } else {
        reps += set.value;
        volumeKg += set.value * (set.loadKg ?? 0);
      }
    }
  }
  return { durationMs: elapsedMs(session, now), sets, reps, seconds, volumeKg, exercises };
}

export function findOpenSession(sessions: readonly WorkoutSession[]): WorkoutSession | undefined {
  return sessions.find((session) => session.status === 'active' || session.status === 'paused');
}
