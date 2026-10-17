import type { EquipmentId, ExperienceLevel, GoalId } from './types';

export interface GoalOption {
  id: GoalId;
  title: string;
  subtitle: string;
  /** Shown on the Plan screen. Must not promise outcomes (docs/CONTENT_AND_SAFETY.md). */
  focusNote: string;
}

export const GOALS: readonly GoalOption[] = [
  {
    id: 'build-muscle',
    title: 'Build Muscle',
    subtitle: 'Train steadily and build strength over time.',
    focusNote:
      'Muscle is built over months of consistent training. Log every set so you can add a rep or a little load when it feels controlled.',
  },
  {
    id: 'lose-fat',
    title: 'Lose Fat',
    subtitle: 'Build an active routine you can keep.',
    focusNote:
      'Strength training is one part of an active routine. Body changes depend on much more than workouts and differ from person to person, so focus on showing up.',
  },
  {
    id: 'move-better',
    title: 'Move Better',
    subtitle: 'Practice control and comfortable range.',
    focusNote: 'Take your time with the warm-up and work in the range you can control. Quality before quantity.',
  },
  {
    id: 'get-stronger',
    title: 'Get Stronger',
    subtitle: 'Be more capable in everyday life.',
    focusNote: 'When every set feels controlled, add one rep next time. Small steps add up.',
  },
];

export interface ExperienceOption {
  id: ExperienceLevel;
  title: string;
  subtitle: string;
}

export const EXPERIENCE: readonly ExperienceOption[] = [
  { id: 'new', title: 'Brand new', subtitle: "I haven't trained regularly before." },
  { id: 'returning', title: 'Coming back', subtitle: "I've trained before and I'm returning after a break." },
  { id: 'some', title: 'Training a little', subtitle: 'I already do some workouts most weeks.' },
];

export interface EquipmentOption {
  id: EquipmentId;
  title: string;
  subtitle: string;
}

export const EQUIPMENT_OPTIONS: readonly EquipmentOption[] = [
  { id: 'dumbbells', title: 'Dumbbells', subtitle: 'Unlocks dumbbell rows and loaded options.' },
  { id: 'band', title: 'Resistance band', subtitle: 'Unlocks band rows when you have no dumbbells.' },
];

export function goalById(id: GoalId): GoalOption {
  return GOALS.find((goal) => goal.id === id) ?? GOALS[0];
}

export const DISCLAIMER =
  'BLOB FIT offers general fitness guidance, not medical advice. Exercise content is awaiting review by a qualified coach. Check with a health professional before starting if you have an injury, a medical condition, are pregnant, or are unsure whether exercise is right for you. Stop if you feel pain, dizziness or unusual discomfort.';
