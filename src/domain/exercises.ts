import raw from '../../data/exercises.json';

import type { EquipmentId, Exercise, ExerciseLevel, MovementPattern } from './types';

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
 * pattern and measure (a timed hold never replaces a rep exercise), equipment available,
 * excluding the exercise itself.
 */
export function substitutesFor(exerciseId: string, equipment: readonly EquipmentId[]): Exercise[] {
  const current = getExercise(exerciseId);
  return EXERCISES.filter(
    (candidate) =>
      candidate.id !== current.id &&
      candidate.pattern === current.pattern &&
      candidate.measure === current.measure &&
      isAvailable(candidate, equipment),
  );
}

/** Library sections, in the order a full-body session is usually built. */
export const PATTERN_GROUPS: { pattern: MovementPattern; title: string; label: string }[] = [
  { pattern: 'squat', title: 'Squat', label: 'Squat pattern' },
  { pattern: 'lunge', title: 'Single leg', label: 'Single-leg pattern' },
  { pattern: 'hinge', title: 'Hinge', label: 'Hinge pattern' },
  { pattern: 'push', title: 'Push', label: 'Push pattern' },
  { pattern: 'pull', title: 'Pull', label: 'Pull pattern' },
  { pattern: 'core', title: 'Core', label: 'Core control' },
  { pattern: 'arms', title: 'Arms and shoulders', label: 'Arms and shoulders' },
];

export const PATTERN_LABEL = Object.fromEntries(PATTERN_GROUPS.map((group) => [group.pattern, group.label])) as Record<
  MovementPattern,
  string
>;

export const LEVEL_LABEL: Record<ExerciseLevel, string> = { 1: 'Starter', 2: 'Beginner', 3: 'Next step' };

/** Case- and accent-insensitive search over name, summary, movement family, muscles and equipment. */
export function searchExercises(exercises: readonly Exercise[], query: string): Exercise[] {
  const words = normalize(query).split(' ').filter(Boolean);
  if (words.length === 0) {
    return [...exercises];
  }
  return exercises.filter((exercise) => {
    const haystack = normalize(
      [exercise.name, exercise.summary, exercise.equipment, exercise.pattern, PATTERN_LABEL[exercise.pattern], ...exercise.primaryMuscles, ...exercise.secondaryMuscles].join(' '),
    );
    return words.every((word) => haystack.includes(word));
  });
}

function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export const EQUIPMENT_LABEL: Record<EquipmentId, string> = {
  dumbbells: 'Dumbbells',
  band: 'Resistance band',
};
