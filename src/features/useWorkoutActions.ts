import { router } from 'expo-router';
import { useCallback } from 'react';

import { buildWorkout } from '@/domain/plan';
import { createId, createSession, findOpenSession } from '@/domain/session';
import type { WorkoutId } from '@/domain/types';
import { useStore } from '@/state/AppStore';

/** Starts (or resumes) a workout and opens the logging screen. */
export function useStartWorkout() {
  const { data, dispatch } = useStore();
  return useCallback(
    (workoutId: WorkoutId) => {
      const prefs = data.preferences;
      if (!prefs) {
        return;
      }
      if (!findOpenSession(data.sessions)) {
        const now = new Date();
        const session = createSession(buildWorkout(workoutId, prefs), {
          id: createId(now),
          now,
          history: data.sessions,
          units: data.settings.units,
          equipment: prefs.equipment,
        });
        dispatch({ type: 'startSession', session });
      }
      router.push('/workout');
    },
    [data.preferences, data.sessions, data.settings.units, dispatch],
  );
}
