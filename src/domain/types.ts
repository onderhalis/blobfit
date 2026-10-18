export type GoalId = 'build-muscle' | 'lose-fat' | 'move-better' | 'get-stronger';

export type ExperienceLevel = 'new' | 'returning' | 'some';

/** Optional equipment. Bodyweight is always available and is never listed. */
export type EquipmentId = 'dumbbells' | 'band';

/** 0 = Monday … 6 = Sunday. */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export type Units = 'kg' | 'lb';

export interface ScheduleEntry {
  /** ISO timestamp of the local start of the day this schedule applies from. */
  from: string;
  trainingDays: Weekday[];
}

export interface Preferences {
  goal: GoalId;
  experience: ExperienceLevel;
  /** The current schedule. */
  trainingDays: Weekday[];
  /**
   * Every schedule the user has had, oldest first, so past weeks keep the targets
   * they were planned with. Missing in data saved before this field existed.
   */
  scheduleHistory?: ScheduleEntry[];
  equipment: EquipmentId[];
  /** ISO timestamp the general fitness disclaimer was accepted. */
  disclaimerAcceptedAt: string;
  /** ISO timestamp the plan started (first onboarding). */
  planStartedAt: string;
}

/** Movement families. Swaps during a workout stay within one family (and one measure). */
export type MovementPattern = 'squat' | 'lunge' | 'hinge' | 'push' | 'pull' | 'core' | 'arms';
export type BodyArea = 'Lower Body' | 'Upper Body' | 'Core';
export type Measure = 'reps' | 'seconds';

/** 1 = starter, 2 = beginner, 3 = next step. */
export type ExerciseLevel = 1 | 2 | 3;

/** The camera position a coach would watch from (or film from) to judge the position. */
export type CameraView = 'side' | 'front' | 'back' | 'above';

export interface ExercisePhase {
  label: string;
  text: string;
}

/** A common fault, taught the way a coach would: what it looks like, why it matters, the fix. */
export interface ExerciseMistake {
  title: string;
  /** Where to look from to spot it. */
  view: CameraView;
  /** What it looks like, including the angle or position that makes it wrong. */
  looksLike: string;
  why: string;
  fix: string;
}

/** Something to check from one camera view, e.g. by filming one set. */
export interface FormCheck {
  view: CameraView;
  check: string;
}

/** Brief for the two key frames of the exercise illustration (see docs/EXERCISE_ART_BRIEF.md). */
export interface ArtBrief {
  view: CameraView;
  frames: { label: string; pose: string }[];
}

export interface Exercise {
  id: string;
  name: string;
  primaryMuscles: string[];
  secondaryMuscles: string[];
  /** Human-readable equipment label. */
  equipment: string;
  steps: string[];
  mistakes: ExerciseMistake[];
  easier: string;
  harder: string;
  reviewStatus: 'needs-qualified-review' | 'reviewed';
  pattern: MovementPattern;
  bodyArea: BodyArea;
  requires: EquipmentId[];
  measure: Measure;
  loadable: boolean;
  perSide: boolean;
  summary: string;
  startingPosition: string;
  phases: ExercisePhase[];
  cues: string[];
  breathing: string;
  formChecks: FormCheck[];
  /** When to stop, swap or shorten the range. Practical guidance, not medical advice. */
  safety: string[];
  level: ExerciseLevel;
  artBrief: ArtBrief;
  easierId?: string;
  harderId?: string;
  illustration?: string;
}

export type WorkoutId = 'A' | 'B';

export interface PlannedExercise {
  /** Slot within the workout, stable across substitutions. */
  slot: string;
  exerciseId: string;
  sets: number;
  /** Target reps (measure = reps) or seconds (measure = seconds). */
  target: number;
}

export interface WorkoutPlan {
  id: WorkoutId;
  name: string;
  focus: string;
  warmUpMinutes: number;
  exercises: PlannedExercise[];
  estimatedMinutes: number;
}

export interface SetLog {
  /** Reps for rep-based exercises, seconds for timed holds. */
  value: number;
  /** Load in kilograms; null when bodyweight / not applicable. */
  loadKg: number | null;
  done: boolean;
}

/** How an exercise felt, logged after its last set. Optional; it steers the next target. */
export type Effort = 'easy' | 'right' | 'hard';

export interface ExerciseLog {
  slot: string;
  exerciseId: string;
  /** Exercise originally planned for this slot when substituted. */
  substitutedFrom?: string;
  skipped: boolean;
  target: number;
  sets: SetLog[];
  effort?: Effort;
}

export type SessionStatus = 'active' | 'paused' | 'completed';

export interface WorkoutSession {
  id: string;
  workoutId: WorkoutId;
  startedAt: string;
  endedAt?: string;
  status: SessionStatus;
  /** When paused, the ISO timestamp the pause began. */
  pausedAt?: string;
  /** Total milliseconds spent paused (excluding a pause still in progress). */
  pausedMs: number;
  exercises: ExerciseLog[];
}

export interface Settings {
  units: Units;
  /** Local hour (0–23) for a training-day reminder, or null when reminders are off. */
  reminderHour: number | null;
}

export interface AppData {
  preferences: Preferences | null;
  sessions: WorkoutSession[];
  settings: Settings;
}
