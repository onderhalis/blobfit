import exercises from '../../../data/exercises.json';
import { MUSCLE_REGIONS } from '../MuscleMap';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { MUSCLES } = require('../../../tools/content/exercise-rules.cjs') as { MUSCLES: string[] };

describe('muscle map', () => {
  it('has a region for every muscle name the content rules allow', () => {
    expect(MUSCLES.filter((muscle) => !(muscle in MUSCLE_REGIONS))).toEqual([]);
  });

  it('has a region for every muscle named in the exercise library', () => {
    const named = new Set(exercises.flatMap((exercise) => [...exercise.primaryMuscles, ...exercise.secondaryMuscles]));
    const missing = [...named].filter((muscle) => !(muscle in MUSCLE_REGIONS));
    expect(named.size).toBeGreaterThan(10);
    expect(missing).toEqual([]);
  });
});
