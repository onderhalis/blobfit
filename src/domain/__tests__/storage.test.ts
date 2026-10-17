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
