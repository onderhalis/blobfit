import exercises from '../../../data/exercises.json';
import { MUSCLE_REGIONS } from '../MuscleMap';

describe('muscle map', () => {
  it('has a region for every muscle named in the exercise library', () => {
    const named = new Set(exercises.flatMap((exercise) => [...exercise.primaryMuscles, ...exercise.secondaryMuscles]));
    const missing = [...named].filter((muscle) => !(muscle in MUSCLE_REGIONS));
    expect(named.size).toBeGreaterThan(10);
    expect(missing).toEqual([]);
  });
});
