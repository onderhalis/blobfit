import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { DayToggle, OptionRow, SelectCard } from '@/components/Choice';
import { Illustration } from '@/components/Illustration';
import type { ArtName } from '@/components/art';
import { WEEKDAY_LONG, WEEKDAY_SHORT } from '@/domain/dates';
import { EQUIPMENT_OPTIONS, EXPERIENCE, GOALS } from '@/domain/goals';
import { MAX_TRAINING_DAYS, MIN_TRAINING_DAYS, hasBackToBackRisk } from '@/domain/plan';
import type { EquipmentId, ExperienceLevel, GoalId, Weekday } from '@/domain/types';
import { colors, radius, space, type TintName } from '@/theme/tokens';

const GOAL_STYLE: Record<GoalId, { tint: TintName; art: ArtName }> = {
  'build-muscle': { tint: 'mint', art: 'goal-build-muscle' },
  'lose-fat': { tint: 'pink', art: 'goal-lose-fat' },
  'move-better': { tint: 'lavender', art: 'goal-move-better' },
  'get-stronger': { tint: 'butter', art: 'goal-get-stronger' },
};

export function GoalPicker({ value, onChange }: { value: GoalId | null; onChange: (goal: GoalId) => void }) {
  return (
    <View style={styles.grid} accessibilityRole="radiogroup" accessibilityLabel="Choose your goal">
      {[0, 2].map((start) => (
        <View key={start} style={styles.gridRow}>
          {GOALS.slice(start, start + 2).map((goal) => (
            <SelectCard
              key={goal.id}
              testID={`goal-${goal.id}`}
              title={goal.title}
              subtitle={goal.subtitle}
              selected={value === goal.id}
              onPress={() => onChange(goal.id)}
              tint={GOAL_STYLE[goal.id].tint}
              art={<Illustration name={GOAL_STYLE[goal.id].art} height={96} />}
            />
          ))}
        </View>
      ))}
    </View>
  );
}

export function ExperiencePicker({
  value,
  onChange,
}: {
  value: ExperienceLevel | null;
  onChange: (level: ExperienceLevel) => void;
}) {
  return (
    <View style={styles.list} accessibilityRole="radiogroup" accessibilityLabel="Your training experience">
      {EXPERIENCE.map((option) => (
        <OptionRow
          key={option.id}
          testID={`experience-${option.id}`}
          title={option.title}
          subtitle={option.subtitle}
          selected={value === option.id}
          onPress={() => onChange(option.id)}
        />
      ))}
    </View>
  );
}

export function DayPicker({ value, onChange }: { value: Weekday[]; onChange: (days: Weekday[]) => void }) {
  const full = value.length >= MAX_TRAINING_DAYS;
  const toggle = (day: Weekday) => {
    if (value.includes(day)) {
      onChange(value.filter((d) => d !== day));
    } else if (!full) {
      onChange([...value, day].sort((a, b) => a - b));
    }
  };
  const tooFew = value.length < MIN_TRAINING_DAYS;
  return (
    <View style={styles.list}>
      <View style={styles.days} accessibilityLabel="Training days">
        {WEEKDAY_SHORT.map((label, i) => (
          <DayToggle
            key={label}
            label={label}
            longLabel={WEEKDAY_LONG[i]}
            selected={value.includes(i as Weekday)}
            disabled={full && !value.includes(i as Weekday)}
            onPress={() => toggle(i as Weekday)}
          />
        ))}
      </View>
      <View style={styles.note} accessibilityLiveRegion="polite">
        <AppText variant="caption" tone={tooFew ? 'danger' : 'secondary'}>
          {tooFew
            ? `Pick at least ${MIN_TRAINING_DAYS} days.`
            : `${value.length} training days, ${7 - value.length} rest days. Rest days are part of the plan.`}
        </AppText>
        {hasBackToBackRisk(value) ? (
          <AppText variant="caption" tone="accent">
            Three days in a row can be a lot when you are starting out. Consider leaving a rest day in between.
          </AppText>
        ) : null}
      </View>
    </View>
  );
}

export function EquipmentPicker({
  value,
  onChange,
}: {
  value: EquipmentId[];
  onChange: (equipment: EquipmentId[]) => void;
}) {
  return (
    <View style={styles.list}>
      <OptionRow
        title="Bodyweight"
        subtitle="Always included. Every workout works with no equipment."
        selected
        multi
        icon="body-outline"
        onPress={() => undefined}
      />
      {EQUIPMENT_OPTIONS.map((option) => {
        const selected = value.includes(option.id);
        return (
          <OptionRow
            key={option.id}
            testID={`equipment-${option.id}`}
            title={option.title}
            subtitle={option.subtitle}
            selected={selected}
            multi
            icon="barbell-outline"
            onPress={() => onChange(selected ? value.filter((id) => id !== option.id) : [...value, option.id])}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { gap: space.sm },
  gridRow: { flexDirection: 'row', gap: space.sm },
  list: { gap: space.sm },
  days: { flexDirection: 'row', gap: 6 },
  note: {
    gap: space.xxs,
    padding: space.sm,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
});
