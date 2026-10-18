import type { Weekday } from '@/domain/types';

/**
 * Training-day reminders are local notifications on iOS and Android (reminders.native.ts).
 * The web build has none, so the setting is hidden there and these are no-ops.
 */
export const REMINDERS_SUPPORTED = false;

export async function enableReminders(): Promise<boolean> {
  return false;
}

export async function syncReminders(_days: readonly Weekday[], _hour: number | null): Promise<void> {}
