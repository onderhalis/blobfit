import { INITIAL_DATA } from '../state';
import { SCHEMA_VERSION, StorageError, deserialize, serialize } from '../storage';
import { at, completedSession, makePrefs } from './helpers';

describe('storage', () => {
  it('starts fresh when nothing is stored', () => {
    expect(deserialize(null)).toEqual(INITIAL_DATA);
  });

  it('round-trips preferences, sessions and settings', () => {
    const data = {
      preferences: makePrefs(),
      sessions: [completedSession(at(2026, 10, 5, 18))],
      settings: { units: 'lb' as const },
    };
    const text = serialize(data);
    expect(JSON.parse(text).version).toBe(SCHEMA_VERSION);
    expect(deserialize(text)).toEqual(data);
  });

  it('rejects unreadable or unexpected data instead of silently wiping it', () => {
    expect(() => deserialize('{nope')).toThrow(StorageError);
    expect(() => deserialize('{"data":{}}')).toThrow(StorageError);
    expect(() => deserialize(JSON.stringify({ version: 1, data: { sessions: 'x', settings: {} } }))).toThrow(
      StorageError,
    );
  });

  it('rejects incomplete nested records instead of crashing later', () => {
    const good = { preferences: makePrefs(), sessions: [completedSession(at(2026, 10, 5, 18))], settings: { units: 'kg' } };
    const doc = (data: unknown) => JSON.stringify({ version: 1, data });
    expect(() => deserialize(doc(good))).not.toThrow();

    const { exercises: _dropped, ...sessionWithoutExercises } = good.sessions[0];
    expect(() => deserialize(doc({ ...good, sessions: [sessionWithoutExercises] }))).toThrow('saved workout');
    expect(() => deserialize(doc({ ...good, preferences: { trainingDays: [0, 2] } }))).toThrow('preferences');

    const unknownExercise = structuredClone(good.sessions[0]);
    unknownExercise.exercises[0].exerciseId = 'removed-exercise';
    expect(() => deserialize(doc({ ...good, sessions: [unknownExercise] }))).toThrow(StorageError);

    const badSet = structuredClone(good.sessions[0]);
    (badSet.exercises[0].sets[0] as unknown as Record<string, unknown>).value = 'ten';
    expect(() => deserialize(doc({ ...good, sessions: [badSet] }))).toThrow(StorageError);

    const badDays = { ...good.preferences, trainingDays: [0, 9] };
    expect(() => deserialize(doc({ ...good, preferences: badDays }))).toThrow(StorageError);
  });

  it('refuses data from a newer app version', () => {
    expect(() => deserialize(JSON.stringify({ version: SCHEMA_VERSION + 1, data: INITIAL_DATA }))).toThrow(
      'newer version',
    );
  });

  it('fills in settings added later', () => {
    const text = JSON.stringify({ version: 1, data: { preferences: null, sessions: [], settings: {} } });
    expect(deserialize(text).settings.units).toBe('kg');
  });
});
