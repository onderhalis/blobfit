import { findExercise } from './exercises';
import { INITIAL_DATA } from './state';
import type { AppData } from './types';

/**
 * Versioned on-device document. Bump SCHEMA_VERSION and add a migration step
 * whenever the persisted shape changes; never edit an existing step.
 */
export const SCHEMA_VERSION = 1;
export const STORAGE_KEY = 'blobfit:data';

export interface PersistedDocument {
  version: number;
  data: AppData;
}

type Migration = (doc: PersistedDocument) => PersistedDocument;

/** MIGRATIONS[n] upgrades a version-n document to version n + 1. */
const MIGRATIONS: Record<number, Migration> = {};

export class StorageError extends Error {}

export function serialize(data: AppData): string {
  const doc: PersistedDocument = { version: SCHEMA_VERSION, data };
  return JSON.stringify(doc);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

const isString = (value: unknown): value is string => typeof value === 'string';
const isNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);
const isDate = (value: unknown): boolean => isString(value) && !Number.isNaN(Date.parse(value));
const isWeekdays = (value: unknown): boolean =>
  Array.isArray(value) && value.every((day) => Number.isInteger(day) && day >= 0 && day <= 6);
const oneOf = (value: unknown, options: readonly string[]): boolean => isString(value) && options.includes(value);

function isPreferences(value: unknown): boolean {
  return (
    isRecord(value) &&
    oneOf(value.goal, ['build-muscle', 'lose-fat', 'move-better', 'get-stronger']) &&
    oneOf(value.experience, ['new', 'returning', 'some']) &&
    isWeekdays(value.trainingDays) &&
    Array.isArray(value.equipment) &&
    value.equipment.every((item) => oneOf(item, ['dumbbells', 'band'])) &&
    isDate(value.disclaimerAcceptedAt) &&
    isDate(value.planStartedAt) &&
    (value.scheduleHistory === undefined ||
      (Array.isArray(value.scheduleHistory) &&
        value.scheduleHistory.length > 0 &&
        value.scheduleHistory.every((entry) => isRecord(entry) && isDate(entry.from) && isWeekdays(entry.trainingDays))))
  );
}

function isSet(value: unknown): boolean {
  return (
    isRecord(value) &&
    isNumber(value.value) &&
    (value.loadKg === null || isNumber(value.loadKg)) &&
    typeof value.done === 'boolean'
  );
}

function isExerciseLog(value: unknown): boolean {
  return (
    isRecord(value) &&
    isString(value.slot) &&
    isString(value.exerciseId) &&
    findExercise(value.exerciseId) !== undefined &&
    (value.substitutedFrom === undefined || (isString(value.substitutedFrom) && findExercise(value.substitutedFrom) !== undefined)) &&
    typeof value.skipped === 'boolean' &&
    isNumber(value.target) &&
    Array.isArray(value.sets) &&
    value.sets.every(isSet)
  );
}

function isSession(value: unknown): boolean {
  return (
    isRecord(value) &&
    isString(value.id) &&
    oneOf(value.workoutId, ['A', 'B']) &&
    isDate(value.startedAt) &&
    (value.endedAt === undefined || isDate(value.endedAt)) &&
    oneOf(value.status, ['active', 'paused', 'completed']) &&
    (value.pausedAt === undefined || isDate(value.pausedAt)) &&
    isNumber(value.pausedMs) &&
    Array.isArray(value.exercises) &&
    value.exercises.every(isExerciseLog)
  );
}

/**
 * Checks every nested record so that damaged data shows the recovery screen instead of
 * crashing a screen later. Exercise ids must still exist in the bundled catalog.
 */
function validate(data: unknown): AppData {
  if (!isRecord(data) || !Array.isArray(data.sessions) || !isRecord(data.settings)) {
    throw new StorageError('Saved data is not in the expected format.');
  }
  if (data.preferences !== null && !isPreferences(data.preferences)) {
    throw new StorageError('Saved preferences are not in the expected format.');
  }
  if (!data.sessions.every(isSession)) {
    throw new StorageError('A saved workout is not in the expected format.');
  }
  return {
    preferences: data.preferences as AppData['preferences'],
    sessions: data.sessions as AppData['sessions'],
    settings: { units: data.settings.units === 'lb' ? 'lb' : 'kg' },
  };
}

/** Parses stored text. `null` (nothing stored) yields fresh initial data. Throws StorageError when unreadable. */
export function deserialize(text: string | null): AppData {
  if (text === null) {
    return INITIAL_DATA;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new StorageError('Saved data could not be read.');
  }
  if (!isRecord(parsed) || typeof parsed.version !== 'number') {
    throw new StorageError('Saved data has no version.');
  }
  let doc = parsed as unknown as PersistedDocument;
  if (doc.version > SCHEMA_VERSION) {
    throw new StorageError('Saved data was created by a newer version of the app.');
  }
  while (doc.version < SCHEMA_VERSION) {
    const migrate = MIGRATIONS[doc.version];
    if (!migrate) {
      throw new StorageError(`No migration from data version ${doc.version}.`);
    }
    doc = migrate(doc);
  }
  return validate(doc.data);
}
