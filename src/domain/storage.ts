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

function validate(data: unknown): AppData {
  if (!isRecord(data) || !Array.isArray(data.sessions) || !isRecord(data.settings)) {
    throw new StorageError('Saved data is not in the expected format.');
  }
  const preferences = data.preferences;
  if (preferences !== null && (!isRecord(preferences) || !Array.isArray(preferences.trainingDays))) {
    throw new StorageError('Saved preferences are not in the expected format.');
  }
  return {
    preferences: (preferences ?? null) as AppData['preferences'],
    sessions: data.sessions as AppData['sessions'],
    settings: { ...INITIAL_DATA.settings, ...(data.settings as Partial<AppData['settings']>) },
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
