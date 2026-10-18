import { formatShortDate } from '@/domain/dates';
import { getExercise } from '@/domain/exercises';
import type { LastPerformance, Suggestion } from '@/domain/progression';
import type { Effort, Units } from '@/domain/types';
import { formatLoad, plural, toDisplayLoad } from '@/lib/format';

export const EFFORT_LABEL: Record<Effort, string> = { easy: 'Easy', right: 'Just right', hard: 'Hard' };

function unitWord(exerciseId: string, n: number): string {
  return getExercise(exerciseId).measure === 'seconds' ? 's' : n === 1 ? ' rep' : ' reps';
}

/** "10, 10, 9 reps · 8 kg · felt easy" */
export function lastTimeSummary(exerciseId: string, last: LastPerformance, units: Units): string {
  const exercise = getExercise(exerciseId);
  const values =
    exercise.measure === 'seconds'
      ? last.sets.map((set) => `${set.value}s`).join(', ')
      : `${last.sets.map((set) => set.value).join(', ')} reps${exercise.perSide ? ' each side' : ''}`;
  const load = Math.max(...last.sets.map((set) => set.loadKg ?? 0));
  const parts = [values];
  if (exercise.loadable && load > 0) {
    parts.push(formatLoad(load, units));
  }
  if (last.effort) {
    parts.push(`felt ${EFFORT_LABEL[last.effort].toLowerCase()}`);
  }
  return parts.join(' · ');
}

export function lastTimeLine(exerciseId: string, last: LastPerformance, units: Units): string {
  return `Last time (${formatShortDate(new Date(last.date))}): ${lastTimeSummary(exerciseId, last, units)}`;
}

/** One short line explaining today's target, plus an optional second line. */
export function suggestionCopy(
  exerciseId: string,
  suggestion: Suggestion,
  units: Units,
): { title: string; detail?: string; tone: 'up' | 'same' | 'new' } {
  const exercise = getExercise(exerciseId);
  const { last } = suggestion;
  switch (suggestion.reason) {
    case 'first':
      return {
        title: 'First time logging this',
        detail: exercise.loadable
          ? 'Pick a load you can control for every set. Next time builds on it.'
          : 'Log what you actually do. Next time builds on it.',
        tone: 'new',
      };
    case 'repeat':
      return {
        title: 'Same target as last time',
        detail:
          last?.effort === 'hard'
            ? 'It felt hard last time. Repeat it before adding more.'
            : `Get every set to ${suggestion.value}${unitWord(exerciseId, suggestion.value)} before adding more.`,
        tone: 'same',
      };
    case 'more-reps':
    case 'more-time': {
      // Relative to what was actually done (the weakest set), not what was aimed for.
      const achieved = last ? Math.min(...last.sets.map((set) => set.value)) : suggestion.value;
      const diff = suggestion.value - achieved;
      const step = Math.max(1, diff);
      return {
        title:
          suggestion.reason === 'more-time'
            ? `+${step}s from last time`
            : `+${plural(step, 'rep')} from last time`,
        tone: 'up',
      };
    }
    case 'more-load': {
      const before = Math.max(...(last?.sets.map((set) => set.loadKg ?? 0) ?? [0]));
      const added = toDisplayLoad(suggestion.loadKg ?? 0, units) - toDisplayLoad(before, units);
      return {
        title: `+${Number.isInteger(added) ? added : added.toFixed(1)} ${units} from last time`,
        detail: `Back to ${suggestion.value} reps with the heavier load.`,
        tone: 'up',
      };
    }
    case 'ready-for-harder':
      return {
        title: `You reached ${suggestion.value}${unitWord(exerciseId, suggestion.value)} on every set`,
        detail: `Ready for ${getExercise(suggestion.harderId as string).name}? Swap it in, or keep this one today.`,
        tone: 'up',
      };
    case 'hold-at-top':
      return {
        title: `You reached ${suggestion.value}${unitWord(exerciseId, suggestion.value)} on every set`,
        detail:
          exercise.measure === 'seconds'
            ? 'Keep this hold and focus on steady breathing.'
            : 'Keep the reps and slow the lowering to about 3 seconds.',
        tone: 'up',
      };
  }
}

/** "Next time: 11 reps per set (+1)", "Next time: 10 reps at 10 kg", "Next time: try Goblet Squat". */
export function nextTimeLine(exerciseId: string, suggestion: Suggestion, units: Units): string {
  const exercise = getExercise(exerciseId);
  if (suggestion.reason === 'ready-for-harder' && suggestion.harderId) {
    return `Next time: try ${getExercise(suggestion.harderId).name}, or stay at ${suggestion.value} reps`;
  }
  const amount =
    exercise.measure === 'seconds'
      ? `${suggestion.value}s holds`
      : `${suggestion.value} reps per set${exercise.perSide ? ' each side' : ''}`;
  const load = exercise.loadable && suggestion.loadKg ? ` at ${formatLoad(suggestion.loadKg, units)}` : '';
  const change =
    suggestion.reason === 'repeat' || suggestion.reason === 'hold-at-top'
      ? ' (same as today)'
      : suggestion.reason === 'more-load'
        ? ' (heavier)'
        : '';
  return `Next time: ${amount}${load}${change}`;
}
