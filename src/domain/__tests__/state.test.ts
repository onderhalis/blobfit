import { buildWorkout } from '../plan';
import { adherence, totals, weekSummary } from '../progress';
import { createSession } from '../session';
import { INITIAL_DATA, reducer } from '../state';
import type { AppData } from '../types';
import { at, makePrefs } from './helpers';

function run(data: AppData, ...actions: Parameters<typeof reducer>[1][]): AppData {
  return actions.reduce(reducer, data);
}

describe('app reducer', () => {
  it('completes onboarding → workout → progress end to end', () => {
    const prefs = makePrefs({ equipment: [], experience: 'new' });
    let data = run(INITIAL_DATA, { type: 'savePreferences', preferences: prefs });
    expect(data.preferences?.trainingDays).toEqual([0, 2, 4]);

    const startAt = at(2026, 10, 5, 18);
    const session = createSession(buildWorkout('A', data.preferences!), { id: 's1', now: startAt, history: [] });
    data = run(
      data,
      { type: 'startSession', session },
      { type: 'updateSet', sessionId: 's1', exerciseIndex: 0, setIndex: 0, patch: { done: true, value: 10 } },
      { type: 'updateSet', sessionId: 's1', exerciseIndex: 0, setIndex: 1, patch: { done: true, value: 8 } },
      { type: 'substituteExercise', sessionId: 's1', exerciseIndex: 1, exerciseId: 'push-up' },
      { type: 'updateSet', sessionId: 's1', exerciseIndex: 1, setIndex: 0, patch: { done: true, value: 5 } },
      { type: 'skipExercise', sessionId: 's1', exerciseIndex: 2, skipped: true },
      { type: 'completeSession', sessionId: 's1', now: at(2026, 10, 5, 18, 22).toISOString() },
    );

    const saved = data.sessions[0];
    expect(saved.status).toBe('completed');
    expect(saved.exercises[1]).toMatchObject({ exerciseId: 'push-up', substitutedFrom: 'incline-push-up' });

    const t = totals(data.sessions);
    expect(t).toMatchObject({ sessions: 1, sets: 3, reps: 23, activeMinutes: 22 });
    const week = weekSummary(data.preferences!, data.sessions, at(2026, 10, 5, 20));
    expect(week.done).toBe(1);
    expect(week.days[0].status).toBe('done');
    expect(adherence(data.preferences!, data.sessions, at(2026, 10, 5, 20)).ratio).toBe(1);
  });

  it('allows only one open session', () => {
    const prefs = makePrefs();
    const a = createSession(buildWorkout('A', prefs), { id: 'a', now: at(2026, 10, 5), history: [] });
    const b = createSession(buildWorkout('B', prefs), { id: 'b', now: at(2026, 10, 5), history: [] });
    const data = run(INITIAL_DATA, { type: 'startSession', session: a }, { type: 'startSession', session: b });
    expect(data.sessions.map((session) => session.id)).toEqual(['a']);
  });

  it('keeps the original plan start when preferences are edited', () => {
    const first = makePrefs();
    const edited = makePrefs({ trainingDays: [4, 1], planStartedAt: at(2026, 11, 1).toISOString() });
    const data = run(
      INITIAL_DATA,
      { type: 'savePreferences', preferences: first },
      { type: 'savePreferences', preferences: edited },
    );
    expect(data.preferences?.planStartedAt).toBe(first.planStartedAt);
    expect(data.preferences?.trainingDays).toEqual([1, 4]);
  });

  it('does not edit completed sessions and discards only open ones', () => {
    const prefs = makePrefs();
    const session = createSession(buildWorkout('A', prefs), { id: 's', now: at(2026, 10, 5), history: [] });
    let data = run(
      INITIAL_DATA,
      { type: 'startSession', session },
      { type: 'updateSet', sessionId: 's', exerciseIndex: 0, setIndex: 0, patch: { done: true } },
      { type: 'completeSession', sessionId: 's', now: at(2026, 10, 5, 10).toISOString() },
    );
    const before = data;
    data = run(
      data,
      { type: 'updateSet', sessionId: 's', exerciseIndex: 0, setIndex: 0, patch: { value: 99 } },
      { type: 'discardSession', sessionId: 's' },
    );
    expect(data).toBe(before);
    data = run(data, { type: 'deleteSession', sessionId: 's' });
    expect(data.sessions).toEqual([]);
  });

  it('resets everything', () => {
    const data = run(INITIAL_DATA, { type: 'savePreferences', preferences: makePrefs() }, { type: 'setUnits', units: 'lb' });
    expect(data.settings.units).toBe('lb');
    expect(run(data, { type: 'resetAll' })).toEqual(INITIAL_DATA);
  });
});
