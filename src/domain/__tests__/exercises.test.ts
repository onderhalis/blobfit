import { EXERCISES, findExercise, getExercise, isAvailable, substitutesFor } from '../exercises';
import { WORKOUT_TEMPLATES } from '../plan';

describe('exercise catalog', () => {
  it('has unique ids', () => {
    const ids = EXERCISES.map((exercise) => exercise.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('keeps the three original handoff exercises', () => {
    expect(findExercise('squat')?.name).toBe('Bodyweight Squat');
    expect(findExercise('push-up')?.name).toBe('Push-Up');
    expect(findExercise('row')?.name).toBe('Supported Dumbbell Row');
  });

  it.each(EXERCISES.map((exercise) => [exercise.id, exercise] as const))(
    '%s has complete technique content and is marked for review',
    (_, exercise) => {
      expect(exercise.primaryMuscles.length).toBeGreaterThan(0);
      expect(exercise.steps.length).toBeGreaterThanOrEqual(3);
      expect(exercise.mistakes.length).toBeGreaterThanOrEqual(2);
      expect(exercise.phases.length).toBeGreaterThanOrEqual(1);
      expect(exercise.cues.length).toBeGreaterThanOrEqual(1);
      expect(exercise.startingPosition.length).toBeGreaterThan(0);
      expect(exercise.easier.length).toBeGreaterThan(0);
      expect(exercise.harder.length).toBeGreaterThan(0);
      expect(exercise.reviewStatus).toBe('needs-qualified-review');
    },
  );

  it('only links easier/harder variations that exist', () => {
    for (const exercise of EXERCISES) {
      for (const id of [exercise.easierId, exercise.harderId]) {
        if (id) {
          expect(findExercise(id)).toBeDefined();
        }
      }
    }
  });

  it('labels the incline push-up as easier than the push-up, never harder', () => {
    expect(getExercise('push-up').easierId).toBe('incline-push-up');
    expect(getExercise('incline-push-up').harderId).toBe('push-up');
    expect(getExercise('push-up').harderId).not.toBe('incline-push-up');
  });

  it('gives every plan slot a bodyweight fallback', () => {
    for (const template of Object.values(WORKOUT_TEMPLATES)) {
      for (const slot of template.slots) {
        const last = getExercise(slot.options[slot.options.length - 1]);
        expect(isAvailable(last, [])).toBe(true);
      }
    }
  });

  it('offers same-pattern substitutes the user has equipment for', () => {
    const noEquipment = substitutesFor('row', []).map((exercise) => exercise.id);
    expect(noEquipment).toEqual(['prone-y-raise']);
    const withBand = substitutesFor('row', ['band']).map((exercise) => exercise.id);
    expect(withBand).toEqual(expect.arrayContaining(['band-row', 'prone-y-raise']));
    expect(withBand).not.toContain('row');
  });

  it('throws on unknown exercise ids', () => {
    expect(() => getExercise('nope')).toThrow('Unknown exercise');
  });
});
