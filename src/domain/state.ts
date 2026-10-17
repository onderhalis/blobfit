import { startOfDay } from './dates';
import { normalizeTrainingDays } from './plan';
import {
  addSet,
  completeSession,
  pauseSession,
  removeSet,
  resumeSession,
  setSkipped,
  substituteExercise,
  updateSet,
} from './session';
import type { AppData, Preferences, ScheduleEntry, SetLog, Units, Weekday, WorkoutSession } from './types';

export const INITIAL_DATA: AppData = {
  preferences: null,
  sessions: [],
  settings: { units: 'kg' },
};

export type Action =
  | { type: 'hydrate'; data: AppData }
  | { type: 'savePreferences'; preferences: Preferences; now: string }
  | { type: 'startSession'; session: WorkoutSession }
  | { type: 'updateSet'; sessionId: string; exerciseIndex: number; setIndex: number; patch: Partial<SetLog> }
  | { type: 'addSet'; sessionId: string; exerciseIndex: number }
  | { type: 'removeSet'; sessionId: string; exerciseIndex: number }
  | { type: 'skipExercise'; sessionId: string; exerciseIndex: number; skipped: boolean }
  | { type: 'substituteExercise'; sessionId: string; exerciseIndex: number; exerciseId: string }
  | { type: 'pauseSession'; sessionId: string; now: string }
  | { type: 'resumeSession'; sessionId: string; now: string }
  | { type: 'completeSession'; sessionId: string; now: string }
  | { type: 'discardSession'; sessionId: string }
  | { type: 'deleteSession'; sessionId: string }
  | { type: 'setUnits'; units: Units }
  | { type: 'resetAll' };

function mapSession(
  data: AppData,
  sessionId: string,
  update: (session: WorkoutSession) => WorkoutSession,
): AppData {
  let changed = false;
  const sessions = data.sessions.map((session) => {
    if (session.id !== sessionId) {
      return session;
    }
    const next = update(session);
    changed = changed || next !== session;
    return next;
  });
  return changed ? { ...data, sessions } : data;
}

/**
 * A schedule change applies from the start of the day it is made; earlier weeks keep
 * the schedule they were planned with. Several edits on one day collapse into one entry.
 */
function nextScheduleHistory(previous: Preferences | null, trainingDays: Weekday[], now: string): ScheduleEntry[] {
  const from = startOfDay(new Date(now)).toISOString();
  if (!previous) {
    return [{ from, trainingDays }];
  }
  const history = previous.scheduleHistory?.length
    ? previous.scheduleHistory
    : [{ from: startOfDay(new Date(previous.planStartedAt)).toISOString(), trainingDays: previous.trainingDays }];
  const last = history[history.length - 1];
  if (last.trainingDays.join() === trainingDays.join()) {
    return history;
  }
  if (last.from === from) {
    return [...history.slice(0, -1), { from, trainingDays }];
  }
  return [...history, { from, trainingDays }];
}

function isOpen(session: WorkoutSession): boolean {
  return session.status === 'active' || session.status === 'paused';
}

export function reducer(data: AppData, action: Action): AppData {
  switch (action.type) {
    case 'hydrate':
      return action.data;
    case 'savePreferences': {
      const previous = data.preferences;
      const trainingDays = normalizeTrainingDays(action.preferences.trainingDays);
      return {
        ...data,
        preferences: {
          ...action.preferences,
          trainingDays,
          scheduleHistory: nextScheduleHistory(previous, trainingDays, action.now),
          // Editing preferences later must not reset when the plan started.
          planStartedAt: previous?.planStartedAt ?? action.preferences.planStartedAt,
        },
      };
    }
    case 'startSession':
      // Only one open session at a time.
      if (data.sessions.some(isOpen)) {
        return data;
      }
      return { ...data, sessions: [...data.sessions, action.session] };
    case 'updateSet':
      return mapSession(data, action.sessionId, (session) =>
        isOpen(session) ? updateSet(session, action.exerciseIndex, action.setIndex, action.patch) : session,
      );
    case 'addSet':
      return mapSession(data, action.sessionId, (session) =>
        isOpen(session) ? addSet(session, action.exerciseIndex) : session,
      );
    case 'removeSet':
      return mapSession(data, action.sessionId, (session) =>
        isOpen(session) ? removeSet(session, action.exerciseIndex) : session,
      );
    case 'skipExercise':
      return mapSession(data, action.sessionId, (session) =>
        isOpen(session) ? setSkipped(session, action.exerciseIndex, action.skipped) : session,
      );
    case 'substituteExercise':
      return mapSession(data, action.sessionId, (session) =>
        isOpen(session)
          ? substituteExercise(session, action.exerciseIndex, action.exerciseId, data.sessions)
          : session,
      );
    case 'pauseSession':
      return mapSession(data, action.sessionId, (session) => pauseSession(session, new Date(action.now)));
    case 'resumeSession':
      return mapSession(data, action.sessionId, (session) => resumeSession(session, new Date(action.now)));
    case 'completeSession':
      return mapSession(data, action.sessionId, (session) => completeSession(session, new Date(action.now)));
    case 'discardSession':
      if (!data.sessions.some((session) => session.id === action.sessionId && isOpen(session))) {
        return data;
      }
      return { ...data, sessions: data.sessions.filter((session) => session.id !== action.sessionId) };
    case 'deleteSession':
      if (!data.sessions.some((session) => session.id === action.sessionId)) {
        return data;
      }
      return { ...data, sessions: data.sessions.filter((session) => session.id !== action.sessionId) };
    case 'setUnits':
      return { ...data, settings: { ...data.settings, units: action.units } };
    case 'resetAll':
      return INITIAL_DATA;
    default:
      return data;
  }
}
