import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Card, Chevron, ReviewBadge, Tag } from '@/components/Card';
import { ExerciseArt } from '@/components/Illustration';
import { Screen, TopBar } from '@/components/Screen';
import { EXERCISES, isAvailable } from '@/domain/exercises';
import type { MovementPattern } from '@/domain/types';
import { useStore } from '@/state/AppStore';
import { space } from '@/theme/tokens';

const GROUPS: { pattern: MovementPattern; title: string }[] = [
  { pattern: 'squat', title: 'Squat' },
  { pattern: 'hinge', title: 'Hinge' },
  { pattern: 'push', title: 'Push' },
  { pattern: 'pull', title: 'Pull' },
  { pattern: 'core', title: 'Core' },
];

export default function Library() {
  const { data } = useStore();
  const equipment = data.preferences?.equipment ?? [];
  return (
    <Screen testID="library">
      <TopBar back title="Exercise library" />
      <AppText tone="secondary">
        {EXERCISES.length} beginner-friendly movements. Each one lists the setup, steps, form cues, common mistakes and
        easier or harder options.
      </AppText>
      <ReviewBadge />
      {GROUPS.map((group) => (
        <View key={group.pattern} style={styles.group}>
          <AppText variant="h2">{group.title}</AppText>
          {EXERCISES.filter((exercise) => exercise.pattern === group.pattern).map((exercise) => {
            const available = isAvailable(exercise, equipment);
            return (
              <Card
                key={exercise.id}
                style={styles.row}
                onPress={() => router.push({ pathname: '/exercise/[id]', params: { id: exercise.id } })}
                accessibilityLabel={`${exercise.name}. ${exercise.summary}${available ? '' : ' Needs equipment you have not selected.'}`}>
                <View style={styles.art}>
                  <ExerciseArt exercise={exercise} kind="thumb" size={72} />
                </View>
                <View style={styles.text}>
                  <AppText variant="bodyStrong">{exercise.name}</AppText>
                  <AppText variant="caption" tone="secondary" numberOfLines={2}>
                    {exercise.summary}
                  </AppText>
                  {!available ? <Tag label={`Needs ${exercise.equipment}`} tint="butter" /> : null}
                </View>
                <Chevron />
              </Card>
            );
          })}
        </View>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  group: { gap: space.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  art: { width: 76, alignItems: 'center' },
  text: { flex: 1, gap: 2 },
});
