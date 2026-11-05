import { EXERCISES, PATTERN_GROUPS, findExercise, getExercise, isAvailable, searchExercises, substitutesFor } from '../exercises';
import { WORKOUT_TEMPLATES } from '../plan';

// Same rules as `node tools/content/validate-exercises.mjs` (plain CommonJS so Jest and Node share them).
// eslint-disable-next-line @typescript-eslint/no-require-imports
const rules = require('../../../tools/content/exercise-rules.cjs') as {
  validateExercises: (exercises: unknown[]) => string[];
  PATTERNS: string[];
};

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

  it('has at least 40 exercises, every one passing the coach-content rules', () => {
    // Setup, steps, phases, breathing, cues, form checks by camera view, 3–4 mistakes with
    // looks-like / why / fix, safety notes, art brief, valid links and muscle names, review pending.
    expect(rules.validateExercises([...EXERCISES])).toEqual([]);
    expect(EXERCISES.length).toBeGreaterThanOrEqual(40);
  });

  it('shows every movement pattern in the library, in order', () => {
    expect(PATTERN_GROUPS.map((group) => group.pattern)).toEqual(rules.PATTERNS);
    for (const group of PATTERN_GROUPS) {
      expect(EXERCISES.filter((exercise) => exercise.pattern === group.pattern).length).toBeGreaterThanOrEqual(4);
    }
  });

  it('teaches each mistake with the view it is visible from and a fix', () => {
    for (const exercise of EXERCISES) {
      for (const mistake of exercise.mistakes) {
        expect(['side', 'front', 'back', 'above']).toContain(mistake.view);
        expect(mistake.fix).not.toBe(mistake.looksLike);
      }
    }
  });

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

  it('never swaps a rep exercise for a timed hold', () => {
    for (const exercise of EXERCISES) {
      for (const swap of substitutesFor(exercise.id, ['dumbbells', 'band'])) {
        expect(swap.measure).toBe(exercise.measure);
        expect(swap.pattern).toBe(exercise.pattern);
      }
    }
  });

  it('searches names, muscles and equipment, ignoring case and punctuation', () => {
    expect(searchExercises(EXERCISES, 'PUSH UP').map((exercise) => exercise.id)).toEqual(
      expect.arrayContaining(['push-up', 'incline-push-up']),
    );
    expect(searchExercises(EXERCISES, 'glutes').length).toBeGreaterThan(3);
    expect(searchExercises(EXERCISES, 'band row').map((exercise) => exercise.id)).toContain('band-row');
    expect(searchExercises(EXERCISES, 'lunge').map((exercise) => exercise.id)).toEqual(
      expect.arrayContaining(['reverse-lunge', 'split-squat', 'bulgarian-split-squat']),
    );
    expect(searchExercises(EXERCISES, 'zzz')).toEqual([]);
    expect(searchExercises(EXERCISES, '  ')).toHaveLength(EXERCISES.length);
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
