import { addDays, startOfDay, weekdayOf } from './dates';
import { getExercise, isAvailable } from './exercises';
import type {
  EquipmentId,
  ExperienceLevel,
  PlannedExercise,
  Preferences,
  Weekday,
  WorkoutId,
  WorkoutPlan,
  WorkoutSession,
} from './types';

interface SlotTemplate {
  slot: string;
  /** Exercise ids in order of preference; the first one the user has equipment for is used. */
  options: string[];
  target: number;
}

interface WorkoutTemplate {
  id: WorkoutId;
  name: string;
  focus: string;
  slots: SlotTemplate[];
}

const PULL_OPTIONS = ['row', 'band-row', 'prone-y-raise'];

/**
 * Beginner full-body A/B rotation from docs/PRODUCT_REQUIREMENTS.md.
 * Prescriptions are illustrative starting points pending qualified review.
 */
export const WORKOUT_TEMPLATES: Record<WorkoutId, WorkoutTemplate> = {
  A: {
    id: 'A',
    name: 'Full Body A',
    focus: 'Squat, push and pull',
    slots: [
      { slot: 'squat', options: ['squat'], target: 10 },
      { slot: 'push', options: ['incline-push-up'], target: 8 },
      { slot: 'pull', options: PULL_OPTIONS, target: 10 },
    ],
  },
  B: {
    id: 'B',
    name: 'Full Body B',
    focus: 'Hinge, pull and core',
    slots: [
      { slot: 'hinge', options: ['hip-hinge'], target: 10 },
      { slot: 'pull', options: PULL_OPTIONS, target: 10 },
      { slot: 'core', options: ['plank'], target: 20 },
    ],
  },
};

/** The plan's base target for a slot (before any progression), or undefined for unknown slots. */
export function slotTarget(slot: string): number | undefined {
  for (const template of Object.values(WORKOUT_TEMPLATES)) {
    const match = template.slots.find((entry) => entry.slot === slot);
    if (match) {
      return match.target;
    }
  }
  return undefined;
}

export const WARM_UP = {
  minutes: 5,
  title: 'Warm-up',
  subtitle: 'Dynamic mobility',
  moves: [
    'March in place — 1 minute',
    'Arm circles — 30 seconds each direction',
    'Hip hinge drill — 10 slow reps',
    'Bodyweight squats to a comfortable depth — 10 reps',
    'Gentle torso turns — 30 seconds',
  ],
} as const;

export const MIN_TRAINING_DAYS = 2;
export const MAX_TRAINING_DAYS = 4;

export const DEFAULT_TRAINING_DAYS: Record<number, Weekday[]> = {
  2: [0, 3],
  3: [0, 2, 4],
  4: [0, 1, 3, 4],
};

export function setsForExperience(experience: ExperienceLevel): number {
  return experience === 'some' ? 3 : 2;
}

export function chooseExercise(options: readonly string[], equipment: readonly EquipmentId[]): string {
  const available = options.find((id) => isAvailable(getExercise(id), equipment));
  // The last option in every slot is bodyweight-only, so this fallback is defensive.
  return available ?? options[options.length - 1];
}

/** Rough duration: ~1.5 min per set (work + rest), per-side sets count twice, plus warm-up. */
export function estimateMinutes(exercises: readonly PlannedExercise[]): number {
  const setMinutes = exercises.reduce((total, item) => {
    const multiplier = getExercise(item.exerciseId).perSide ? 2 : 1;
    return total + item.sets * multiplier * 1.5;
  }, 0);
  return Math.max(10, Math.round((setMinutes + WARM_UP.minutes) / 5) * 5);
}

export function buildWorkout(
  id: WorkoutId,
  prefs: Pick<Preferences, 'equipment' | 'experience'>,
): WorkoutPlan {
  const template = WORKOUT_TEMPLATES[id];
  const sets = setsForExperience(prefs.experience);
  const exercises = template.slots.map((slot) => ({
    slot: slot.slot,
    exerciseId: chooseExercise(slot.options, prefs.equipment),
    sets,
    target: slot.target,
  }));
  return {
    id,
    name: template.name,
    focus: template.focus,
    warmUpMinutes: WARM_UP.minutes,
    exercises,
    estimatedMinutes: estimateMinutes(exercises),
  };
}

/** Alternate A/B based on the last completed session, so missed days never skip a workout. */
export function nextWorkoutId(sessions: readonly WorkoutSession[]): WorkoutId {
  const completed = sessions.filter((session) => session.status === 'completed');
  if (completed.length === 0) {
    return 'A';
  }
  const last = completed.reduce((latest, session) =>
    (session.endedAt ?? session.startedAt) > (latest.endedAt ?? latest.startedAt) ? session : latest,
  );
  return last.workoutId === 'A' ? 'B' : 'A';
}

export function normalizeTrainingDays(days: readonly Weekday[]): Weekday[] {
  return [...new Set(days)].sort((a, b) => a - b);
}

export function isValidTrainingDays(days: readonly Weekday[]): boolean {
  const unique = normalizeTrainingDays(days);
  return unique.length >= MIN_TRAINING_DAYS && unique.length <= MAX_TRAINING_DAYS;
}

/**
 * Weekly reminder slots for the training days, in the notification scheduler's numbering
 * (1 = Sunday … 7 = Saturday; ours is 0 = Monday … 6 = Sunday).
 */
export function reminderSlots(days: readonly Weekday[], hour: number): { weekday: number; hour: number; minute: number }[] {
  return normalizeTrainingDays(days).map((day) => ({ weekday: ((day + 1) % 7) + 1, hour, minute: 0 }));
}

/** True when the schedule has three or more training days in a row (wrapping Sunday → Monday). */
export function hasBackToBackRisk(days: readonly Weekday[]): boolean {
  const set = new Set(days);
  for (let start = 0; start < 7; start += 1) {
    if (set.has(start as Weekday) && set.has(((start + 1) % 7) as Weekday) && set.has(((start + 2) % 7) as Weekday)) {
      return true;
    }
  }
  return false;
}

export function isTrainingDay(prefs: Pick<Preferences, 'trainingDays'>, date: Date): boolean {
  return prefs.trainingDays.includes(weekdayOf(date));
}

/** The schedule that was in effect on `date` (falls back to the current one for older data). */
export function trainingDaysOn(prefs: Pick<Preferences, 'trainingDays' | 'scheduleHistory'>, date: Date): Weekday[] {
  const history = prefs.scheduleHistory;
  if (!history || history.length === 0) {
    return prefs.trainingDays;
  }
  let days = history[0].trainingDays;
  for (const entry of history) {
    if (new Date(entry.from) > date) {
      break;
    }
    days = entry.trainingDays;
  }
  return days;
}

/** Whether `date` was a planned training day under the schedule in effect at the time. */
export function wasScheduledOn(prefs: Pick<Preferences, 'trainingDays' | 'scheduleHistory'>, date: Date): boolean {
  return trainingDaysOn(prefs, date).includes(weekdayOf(date));
}

/** The next training day strictly after `date` (or `date` itself when `inclusive`). */
export function nextTrainingDay(
  prefs: Pick<Preferences, 'trainingDays'>,
  date: Date,
  inclusive = false,
): Date {
  for (let offset = inclusive ? 0 : 1; offset <= 7; offset += 1) {
    const candidate = addDays(startOfDay(date), offset);
    if (isTrainingDay(prefs, candidate)) {
      return candidate;
    }
  }
  return addDays(startOfDay(date), 1);
}
