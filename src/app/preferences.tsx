import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Screen, TopBar } from '@/components/Screen';
import { isValidTrainingDays } from '@/domain/plan';
import type { Preferences } from '@/domain/types';
import { DayPicker, EquipmentPicker, ExperiencePicker, GoalPicker } from '@/features/PreferenceEditors';
import { useStore } from '@/state/AppStore';
import { space } from '@/theme/tokens';

export default function PreferencesScreen() {
  const { data, dispatch } = useStore();
  const [draft, setDraft] = useState<Preferences | null>(data.preferences);
  if (!draft) {
    return null;
  }
  const valid = isValidTrainingDays(draft.trainingDays);
  const update = (patch: Partial<Preferences>) => setDraft({ ...draft, ...patch });

  return (
    <Screen
      testID="preferences"
      footer={
        <Button
          testID="save-preferences"
          label="Save changes"
          disabled={!valid}
          onPress={() => {
            dispatch({ type: 'savePreferences', preferences: draft, now: new Date().toISOString() });
            router.back();
          }}
          style={styles.flex}
        />
      }>
      <TopBar back title="Your plan settings" />
      <AppText tone="secondary">
        Changes apply from today. Past weeks keep the schedule they were planned with, so your logged history and
        streak stay exactly as they are.
      </AppText>

      <View style={styles.section}>
        <AppText variant="h2">Goal</AppText>
        <GoalPicker value={draft.goal} onChange={(goal) => update({ goal })} />
      </View>
      <View style={styles.section}>
        <AppText variant="h2">Experience</AppText>
        <ExperiencePicker value={draft.experience} onChange={(experience) => update({ experience })} />
      </View>
      <View style={styles.section}>
        <AppText variant="h2">Training days</AppText>
        <DayPicker value={draft.trainingDays} onChange={(trainingDays) => update({ trainingDays })} />
      </View>
      <View style={styles.section}>
        <AppText variant="h2">Equipment</AppText>
        <EquipmentPicker value={draft.equipment} onChange={(equipment) => update({ equipment })} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  section: { gap: space.sm, marginTop: space.xs },
});
