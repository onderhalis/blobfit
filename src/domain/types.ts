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

export type MovementPattern = 'squat' | 'push' | 'pull' | 'hinge' | 'core';
export type BodyArea = 'Lower Body' | 'Upper Body' | 'Core';
export type Measure = 'reps' | 'seconds';

export interface ExercisePhase {
  label: string;
  text: string;
}

export interface Exercise {
  id: string;
  name: string;
  primaryMuscles: string[];
  secondaryMuscles: string[];
  /** Human-readable equipment label. */
  equipment: string;
  steps: string[];
  mistakes: string[];
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
}

export interface AppData {
  preferences: Preferences | null;
  sessions: WorkoutSession[];
  settings: Settings;
}
