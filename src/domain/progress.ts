import { addDays, dayKey, startOfDay, startOfWeek } from './dates';
import { getExercise } from './exercises';
import { buildWorkout, isTrainingDay, nextTrainingDay, nextWorkoutId } from './plan';
import { findOpenSession, sessionTotals } from './session';
import type { Measure, Preferences, WorkoutPlan, WorkoutSession } from './types';

/**
 * Every number here is derived from the user's own logged sessions and schedule.
 * Nothing is estimated, extrapolated or seeded.
 */

export function completedSessions(sessions: readonly WorkoutSession[]): WorkoutSession[] {
  return sessions
    .filter((session) => session.status === 'completed' && session.endedAt)
    .sort((a, b) => (a.endedAt as string).localeCompare(b.endedAt as string));
}

function sessionDate(session: WorkoutSession): Date {
  return new Date(session.endedAt ?? session.startedAt);
}

function planStart(prefs: Preferences): Date {
  return startOfDay(new Date(prefs.planStartedAt));
}

/** Training days in the week starting `weekStart` that fall on or after the plan start. */
export function weekTarget(prefs: Preferences, weekStart: Date): number {
  const start = planStart(prefs);
  let target = 0;
  for (let i = 0; i < 7; i += 1) {
    const day = addDays(weekStart, i);
    if (day >= start && isTrainingDay(prefs, day)) {
      target += 1;
    }
  }
  return target;
}

function sessionsInWeek(sessions: readonly WorkoutSession[], weekStart: Date): WorkoutSession[] {
  const end = addDays(weekStart, 7);
  return completedSessions(sessions).filter((session) => {
    const date = sessionDate(session);
    return date >= weekStart && date < end;
  });
}

export type DayStatus = 'done' | 'planned' | 'missed' | 'rest' | 'extra';

export interface WeekDay {
  date: Date;
  key: string;
  isToday: boolean;
  status: DayStatus;
}

export interface WeekSummary {
  weekStart: Date;
  /** 1-based week number since the plan started. */
  weekNumber: number;
  days: WeekDay[];
  done: number;
  target: number;
}

export function weekSummary(prefs: Preferences, sessions: readonly WorkoutSession[], now: Date): WeekSummary {
  const weekStart = startOfWeek(now);
  const inWeek = sessionsInWeek(sessions, weekStart);
  const doneKeys = new Set(inWeek.map((session) => dayKey(sessionDate(session))));
  const today = startOfDay(now);
  const start = planStart(prefs);
  const days: WeekDay[] = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(weekStart, i);
    const key = dayKey(date);
    const training = isTrainingDay(prefs, date) && date >= start;
    let status: DayStatus;
    if (doneKeys.has(key)) {
      status = training ? 'done' : 'extra';
    } else if (!training) {
      status = 'rest';
    } else {
      status = date < today ? 'missed' : 'planned';
    }
    return { date, key, isToday: key === dayKey(today), status };
  });
  const weekNumber = Math.floor((weekStart.getTime() - startOfWeek(start).getTime()) / (7 * 86_400_000) + 0.5) + 1;
  return {
    weekStart,
    weekNumber: Math.max(1, weekNumber),
    days,
    done: inWeek.length,
    target: weekTarget(prefs, weekStart),
  };
}

export interface WeekHistoryEntry {
  weekStart: Date;
  done: number;
  target: number;
}

/** Oldest → newest, never earlier than the plan's first week. */
export function weeklyHistory(
  prefs: Preferences,
  sessions: readonly WorkoutSession[],
  now: Date,
  count = 8,
): WeekHistoryEntry[] {
  const firstWeek = startOfWeek(planStart(prefs));
  const current = startOfWeek(now);
  const entries: WeekHistoryEntry[] = [];
  for (let i = count - 1; i >= 0; i -= 1) {
    const weekStart = addDays(current, -7 * i);
    if (weekStart < firstWeek) {
      continue;
    }
    entries.push({
      weekStart,
      done: sessionsInWeek(sessions, weekStart).length,
      target: weekTarget(prefs, weekStart),
    });
  }
  return entries;
}

/**
 * Consecutive weeks in which the weekly target was met. The current week only
 * adds to the streak once met; it never breaks it while still in progress.
 * Rest days cannot break a streak.
 */
export function weekStreak(prefs: Preferences, sessions: readonly WorkoutSession[], now: Date): number {
  const firstWeek = startOfWeek(planStart(prefs));
  let weekStart = startOfWeek(now);
  let streak = 0;
  let isCurrent = true;
  while (weekStart >= firstWeek) {
    const target = weekTarget(prefs, weekStart);
    const done = sessionsInWeek(sessions, weekStart).length;
    if (target > 0 && done >= target) {
      streak += 1;
    } else if (!isCurrent && target > 0) {
      break;
    }
    isCurrent = false;
    weekStart = addDays(weekStart, -7);
  }
  return streak;
}

export interface Adherence {
  credited: number;
  scheduled: number;
  /** null until at least one scheduled day has passed. */
  ratio: number | null;
}

/**
 * Completed sessions vs scheduled training days that have already arrived.
 * Today counts as scheduled only once it has been trained, so mornings are not penalised.
 * Extra sessions in a week cannot push that week above 100%.
 */
export function adherence(prefs: Preferences, sessions: readonly WorkoutSession[], now: Date): Adherence {
  const start = planStart(prefs);
  const today = startOfDay(now);
  const firstWeek = startOfWeek(start);
  let credited = 0;
  let scheduled = 0;
  for (let weekStart = startOfWeek(now); weekStart >= firstWeek; weekStart = addDays(weekStart, -7)) {
    const inWeek = sessionsInWeek(sessions, weekStart).filter((session) => sessionDate(session) < addDays(today, 1));
    const trainedToday = inWeek.some((session) => dayKey(sessionDate(session)) === dayKey(today));
    let weekScheduled = 0;
    for (let i = 0; i < 7; i += 1) {
      const day = addDays(weekStart, i);
      if (day < start || !isTrainingDay(prefs, day)) {
        continue;
      }
      if (day < today || (day.getTime() === today.getTime() && trainedToday)) {
        weekScheduled += 1;
      }
    }
    scheduled += weekScheduled;
    credited += Math.min(inWeek.length, weekScheduled);
  }
  return { credited, scheduled, ratio: scheduled === 0 ? null : credited / scheduled };
}

export interface Totals {
  sessions: number;
  sets: number;
  reps: number;
  seconds: number;
  volumeKg: number;
  activeMinutes: number;
}

export function totals(sessions: readonly WorkoutSession[]): Totals {
  return completedSessions(sessions).reduce<Totals>(
    (acc, session) => {
      const t = sessionTotals(session);
      return {
        sessions: acc.sessions + 1,
        sets: acc.sets + t.sets,
        reps: acc.reps + t.reps,
        seconds: acc.seconds + t.seconds,
        volumeKg: acc.volumeKg + t.volumeKg,
        activeMinutes: acc.activeMinutes + Math.round(t.durationMs / 60000),
      };
    },
    { sessions: 0, sets: 0, reps: 0, seconds: 0, volumeKg: 0, activeMinutes: 0 },
  );
}

export interface BestSet {
  value: number;
  loadKg: number | null;
  date: string;
}

export interface PersonalBest {
  exerciseId: string;
  measure: Measure;
  /** Most reps (or longest hold) in a single set. */
  bestValue: BestSet;
  /** Heaviest load lifted for at least one rep (loadable exercises only). */
  bestLoad: BestSet | null;
  sessions: number;
}

function bestSetOf(session: WorkoutSession, exerciseId: string): BestSet | null {
  let best: BestSet | null = null;
  for (const log of session.exercises) {
    if (log.exerciseId !== exerciseId || log.skipped) {
      continue;
    }
    for (const set of log.sets) {
      if (!set.done || set.value <= 0) {
        continue;
      }
      const load = set.loadKg ?? 0;
      const bestLoad = best?.loadKg ?? 0;
      if (!best || load > bestLoad || (load === bestLoad && set.value > best.value)) {
        best = { value: set.value, loadKg: set.loadKg, date: session.endedAt ?? session.startedAt };
      }
    }
  }
  return best;
}

export function personalBests(sessions: readonly WorkoutSession[]): PersonalBest[] {
  const map = new Map<string, PersonalBest>();
  for (const session of completedSessions(sessions)) {
    const date = session.endedAt as string;
    const seen = new Set<string>();
    for (const log of session.exercises) {
      if (log.skipped) {
        continue;
      }
      for (const set of log.sets) {
        if (!set.done || set.value <= 0) {
          continue;
        }
        const exercise = getExercise(log.exerciseId);
        const existing = map.get(exercise.id);
        const entry: PersonalBest = existing ?? {
          exerciseId: exercise.id,
          measure: exercise.measure,
          bestValue: { value: set.value, loadKg: set.loadKg, date },
          bestLoad: null,
          sessions: 0,
        };
        if (set.value > entry.bestValue.value) {
          entry.bestValue = { value: set.value, loadKg: set.loadKg, date };
        }
        if (exercise.loadable && set.loadKg !== null && set.loadKg > 0) {
          if (!entry.bestLoad || set.loadKg > (entry.bestLoad.loadKg ?? 0)) {
            entry.bestLoad = { value: set.value, loadKg: set.loadKg, date };
          }
        }
        if (!seen.has(exercise.id)) {
          seen.add(exercise.id);
          entry.sessions += 1;
        }
        map.set(exercise.id, entry);
      }
    }
  }
  return [...map.values()].sort((a, b) => b.sessions - a.sessions || a.exerciseId.localeCompare(b.exerciseId));
}

export interface NewBest {
  exerciseId: string;
  kind: 'value' | 'load';
  value: number;
  loadKg: number | null;
}

/** Bests set in `session` compared with all earlier completed sessions. First-ever logs do not count. */
export function newBestsIn(session: WorkoutSession, sessions: readonly WorkoutSession[]): NewBest[] {
  const earlier = completedSessions(sessions).filter(
    (other) => other.id !== session.id && (other.endedAt as string) < (session.endedAt ?? ''),
  );
  const before = new Map(personalBests(earlier).map((best) => [best.exerciseId, best]));
  const current = personalBests([session]);
  const result: NewBest[] = [];
  for (const best of current) {
    const previous = before.get(best.exerciseId);
    if (!previous) {
      continue;
    }
    if (best.bestValue.value > previous.bestValue.value) {
      result.push({ exerciseId: best.exerciseId, kind: 'value', value: best.bestValue.value, loadKg: null });
    }
    if (best.bestLoad && (best.bestLoad.loadKg ?? 0) > (previous.bestLoad?.loadKg ?? 0) && previous.bestLoad) {
      result.push({
        exerciseId: best.exerciseId,
        kind: 'load',
        value: best.bestLoad.value,
        loadKg: best.bestLoad.loadKg,
      });
    }
  }
  return result;
}

export interface ThenAndNow {
  exerciseId: string;
  first: BestSet;
  latest: BestSet;
  sessions: number;
}

/**
 * First logged best set vs most recent best set, for exercises logged in two or more sessions.
 * Only like-for-like sets are compared (docs/DECISIONS.md, CC-002): a loaded latest set is
 * compared with the first *loaded* set, a bodyweight latest set with the first bodyweight set.
 */
export function thenAndNow(sessions: readonly WorkoutSession[], limit = 3): ThenAndNow[] {
  const ordered = completedSessions(sessions);
  const byExercise = new Map<string, BestSet[]>();
  for (const session of ordered) {
    const ids = new Set(session.exercises.filter((log) => !log.skipped).map((log) => log.exerciseId));
    for (const id of ids) {
      const best = bestSetOf(session, id);
      if (best) {
        byExercise.set(id, [...(byExercise.get(id) ?? []), best]);
      }
    }
  }
  return [...byExercise.entries()]
    .map(([exerciseId, bests]) => {
      const latest = bests[bests.length - 1];
      const loaded = (latest.loadKg ?? 0) > 0;
      const comparable = bests.filter((best) => (best.loadKg ?? 0) > 0 === loaded);
      return { exerciseId, first: comparable[0], latest, sessions: comparable.length };
    })
    .filter((row) => row.sessions >= 2)
    .sort((a, b) => b.sessions - a.sessions || a.exerciseId.localeCompare(b.exerciseId))
    .slice(0, limit);
}

export type TodayStatus =
  | { kind: 'in-progress'; session: WorkoutSession; workout: WorkoutPlan }
  | { kind: 'done'; session: WorkoutSession; workout: WorkoutPlan; nextDay: Date }
  | { kind: 'train'; workout: WorkoutPlan }
  | { kind: 'rest'; workout: WorkoutPlan; nextDay: Date };

export function todayStatus(prefs: Preferences, sessions: readonly WorkoutSession[], now: Date): TodayStatus {
  const open = findOpenSession(sessions);
  if (open) {
    return { kind: 'in-progress', session: open, workout: buildWorkout(open.workoutId, prefs) };
  }
  const workout = buildWorkout(nextWorkoutId(sessions), prefs);
  const doneToday = completedSessions(sessions)
    .reverse()
    .find((session) => dayKey(sessionDate(session)) === dayKey(now));
  if (doneToday) {
    return { kind: 'done', session: doneToday, workout, nextDay: nextTrainingDay(prefs, now) };
  }
  if (isTrainingDay(prefs, now)) {
    return { kind: 'train', workout };
  }
  return { kind: 'rest', workout, nextDay: nextTrainingDay(prefs, now) };
}
