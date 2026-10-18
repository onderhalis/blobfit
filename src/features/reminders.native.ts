import * as Notifications from 'expo-notifications';

import { reminderSlots } from '@/domain/plan';
import type { Weekday } from '@/domain/types';

export const REMINDERS_SUPPORTED = true;

/** Asks for notification permission if needed. Resolves false when the user has declined. */
export async function enableReminders(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) {
    return true;
  }
  if (!current.canAskAgain) {
    return false;
  }
  const asked = await Notifications.requestPermissionsAsync();
  return asked.granted;
}

/**
 * Replaces Blob Fit's scheduled reminders with one weekly reminder per training day at `hour`
 * (or none when `hour` is null). Local only: nothing leaves the device.
 */
export async function syncReminders(days: readonly Weekday[], hour: number | null): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
  if (hour === null) {
    return;
  }
  for (const slot of reminderSlots(days, hour)) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Training day',
        body: 'Your next workout is ready. About 15–25 minutes, warm-up included.',
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.WEEKLY, ...slot },
    });
  }
}
