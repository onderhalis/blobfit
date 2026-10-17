import { buildWorkout } from '../plan';
import {
  MAX_SETS,
  addSet,
  canComplete,
  completeSession,
  createSession,
  elapsedMs,
  lastLoadFor,
  pauseSession,
  removeSet,
  resumeSession,
  sessionTotals,
  setSkipped,
  substituteExercise,
  updateSet,
} from '../session';
import { at, completedSession, makePrefs } from './helpers';

const plan = buildWorkout('A', makePrefs());
const start = at(2026, 10, 12, 18);

function fresh() {
  return createSession(plan, { id: 'x', now: start, history: [] });
}

describe('createSession', () => {
  it('pre-fills every set with the target and no load for a first session', () => {
    const session = fresh();
    expect(session.status).toBe('active');
    expect(session.exercises).toHaveLength(3);
    for (const log of session.exercises) {
      expect(log.sets).toHaveLength(3);
      expect(log.sets.every((set) => set.value === log.target && !set.done && set.loadKg === null)).toBe(true);
    }
  });

  it('carries the last used load forward for loadable exercises', () => {
    const previous = completedSession(at(2026, 10, 9), { loadKg: 8 });
    expect(lastLoadFor('row', [previous])).toBe(8);
    const session = createSession(plan, { id: 'y', now: start, history: [previous] });
    const row = session.exercises.find((log) => log.exerciseId === 'row');
    expect(row?.sets.every((set) => set.loadKg === 8)).toBe(true);
    const squat = session.exercises.find((log) => log.exerciseId === 'squat');
    expect(squat?.sets.every((set) => set.loadKg === null)).toBe(true);
  });
});

describe('editing sets', () => {
  it('clamps negative values and rounds reps', () => {
    let session = updateSet(fresh(), 0, 0, { value: -3 });
    expect(session.exercises[0].sets[0].value).toBe(0);
    session = updateSet(session, 0, 0, { value: 7.6, loadKg: 4.256 });
    expect(session.exercises[0].sets[0].value).toBe(8);
    expect(session.exercises[0].sets[0].loadKg).toBe(4.26);
  });

  it('adds and removes sets within bounds', () => {
    let session = fresh();
    session = addSet(session, 0);
    expect(session.exercises[0].sets).toHaveLength(4);
    for (let i = 0; i < 10; i += 1) {
      session = addSet(session, 0);
    }
    expect(session.exercises[0].sets).toHaveLength(MAX_SETS);
    for (let i = 0; i < 10; i += 1) {
      session = removeSet(session, 0);
    }
    expect(session.exercises[0].sets).toHaveLength(1);
  });

  it('skipping clears done flags', () => {
    let session = updateSet(fresh(), 1, 0, { done: true });
    session = setSkipped(session, 1, true);
    expect(session.exercises[1].skipped).toBe(true);
    expect(session.exercises[1].sets.some((set) => set.done)).toBe(false);
  });

  it('records substitutions and clears them when switching back', () => {
    let session = substituteExercise(fresh(), 2, 'prone-y-raise', []);
    expect(session.exercises[2].exerciseId).toBe('prone-y-raise');
    expect(session.exercises[2].substitutedFrom).toBe('row');
    session = substituteExercise(session, 2, 'band-row', []);
    expect(session.exercises[2].substitutedFrom).toBe('row');
    session = substituteExercise(session, 2, 'row', []);
    expect(session.exercises[2].substitutedFrom).toBeUndefined();
  });
});

describe('timer', () => {
  it('excludes paused time', () => {
    let session = fresh();
    session = pauseSession(session, new Date(start.getTime() + 10 * 60_000));
    expect(elapsedMs(session, new Date(start.getTime() + 30 * 60_000))).toBe(10 * 60_000);
    session = resumeSession(session, new Date(start.getTime() + 15 * 60_000));
    expect(session.pausedMs).toBe(5 * 60_000);
    expect(elapsedMs(session, new Date(start.getTime() + 25 * 60_000))).toBe(20 * 60_000);
  });

  it('ignores pause/resume in the wrong state', () => {
    const session = fresh();
    expect(resumeSession(session, start)).toBe(session);
    const paused = pauseSession(session, start);
    expect(pauseSession(paused, start)).toBe(paused);
  });
});

describe('completing', () => {
  it('cannot complete without at least one finished set', () => {
    const session = fresh();
    expect(canComplete(session)).toBe(false);
    expect(completeSession(session, start)).toBe(session);
  });

  it('keeps only finished sets and drops skipped exercises', () => {
    let session = fresh();
    session = updateSet(session, 0, 0, { done: true, value: 9 });
    session = updateSet(session, 0, 1, { done: true });
    session = setSkipped(session, 1, true);
    session = updateSet(session, 2, 0, { done: true, loadKg: 6 });
    const done = completeSession(session, new Date(start.getTime() + 18 * 60_000));
    expect(done.status).toBe('completed');
    expect(done.exercises[0].sets).toEqual([
      { value: 9, loadKg: null, done: true },
      { value: 10, loadKg: null, done: true },
    ]);
    expect(done.exercises[1].sets).toEqual([]);
    expect(done.exercises[2].sets).toHaveLength(1);
    const t = sessionTotals(done);
    expect(t).toMatchObject({ sets: 3, reps: 29, volumeKg: 60, exercises: 2 });
    expect(t.durationMs).toBe(18 * 60_000);
  });

  it('closes an open pause when completing while paused', () => {
    let session = updateSet(fresh(), 0, 0, { done: true });
    session = pauseSession(session, new Date(start.getTime() + 5 * 60_000));
    const done = completeSession(session, new Date(start.getTime() + 9 * 60_000));
    expect(done.pausedMs).toBe(4 * 60_000);
    expect(elapsedMs(done, new Date(start.getTime() + 99 * 60_000))).toBe(5 * 60_000);
  });

  it('counts timed holds as seconds, not reps', () => {
    const b = completedSession(at(2026, 10, 14), { workoutId: 'B', prefs: makePrefs({ experience: 'new' }) });
    const t = sessionTotals(b);
    expect(t.seconds).toBe(40);
    expect(t.reps).toBe(2 * 10 + 2 * 10);
  });
});
