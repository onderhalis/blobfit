import raw from '../../data/exercises.json';

import type { EquipmentId, Exercise } from './types';

export const EXERCISES: readonly Exercise[] = raw as Exercise[];

const BY_ID = new Map(EXERCISES.map((exercise) => [exercise.id, exercise]));

export function findExercise(id: string): Exercise | undefined {
  return BY_ID.get(id);
}

export function getExercise(id: string): Exercise {
  const exercise = BY_ID.get(id);
  if (!exercise) {
    throw new Error(`Unknown exercise: ${id}`);
  }
  return exercise;
}

export function isAvailable(exercise: Exercise, equipment: readonly EquipmentId[]): boolean {
  return exercise.requires.every((item) => equipment.includes(item));
}

/**
 * Exercises the user can swap in for `exerciseId` during a workout: same movement
 * pattern, equipment available, excluding the exercise itself.
 */
export function substitutesFor(exerciseId: string, equipment: readonly EquipmentId[]): Exercise[] {
  const current = getExercise(exerciseId);
  return EXERCISES.filter(
    (candidate) =>
      candidate.id !== current.id &&
      candidate.pattern === current.pattern &&
      isAvailable(candidate, equipment),
  );
}

export const EQUIPMENT_LABEL: Record<EquipmentId, string> = {
  dumbbells: 'Dumbbells',
  band: 'Resistance band',
};
