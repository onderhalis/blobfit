import { getExercise } from '@/domain/exercises';
import type { PlannedExercise, Units } from '@/domain/types';

const LB_PER_KG = 2.20462;

export function plural(count: number, one: string, many = `${one}s`): string {
  return `${count} ${count === 1 ? one : many}`;
}

export function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

/** Convert a stored kg value for display in the user's units, rounded to 0.5. */
export function toDisplayLoad(kg: number, units: Units): number {
  const value = units === 'kg' ? kg : kg * LB_PER_KG;
  return Math.round(value * 2) / 2;
}

/** Convert a displayed value back to kg for storage. */
export function fromDisplayLoad(value: number, units: Units): number {
  return units === 'kg' ? value : Math.round((value / LB_PER_KG) * 100) / 100;
}

export function formatLoad(kg: number | null, units: Units): string {
  if (kg === null || kg <= 0) {
    return 'Bodyweight';
  }
  const value = toDisplayLoad(kg, units);
  return `${Number.isInteger(value) ? value : value.toFixed(1)} ${units}`;
}

export function formatVolume(kg: number, units: Units): string {
  const value = Math.round(units === 'kg' ? kg : kg * LB_PER_KG);
  return `${value.toLocaleString('en-US')} ${units}`;
}

/** "3 sets × 10 reps", "2 sets × 20 sec", "3 sets × 10 reps each side". */
export function prescription(item: Pick<PlannedExercise, 'exerciseId' | 'sets' | 'target'>): string {
  const exercise = getExercise(item.exerciseId);
  const unit = exercise.measure === 'seconds' ? 'sec' : 'reps';
  return `${plural(item.sets, 'set')} × ${item.target} ${unit}${exercise.perSide ? ' each side' : ''}`;
}

export function setValueLabel(exerciseId: string, value: number): string {
  return getExercise(exerciseId).measure === 'seconds' ? `${value}s` : `${value}`;
}

export function greeting(now: Date): string {
  const hour = now.getHours();
  if (hour < 5) {
    return 'Good evening,';
  }
  if (hour < 12) {
    return 'Good morning,';
  }
  if (hour < 18) {
    return 'Good afternoon,';
  }
  return 'Good evening,';
}

export function percent(ratio: number): string {
  return `${Math.round(ratio * 100)}%`;
}

/** "a", "a and b", "a, b and c". */
export function listJoin(items: readonly string[]): string {
  if (items.length <= 1) {
    return items.join('');
  }
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}
