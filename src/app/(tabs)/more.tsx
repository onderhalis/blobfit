import { router, type Href } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Card, Chevron } from '@/components/Card';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { Icon, type IconName } from '@/components/Icon';
import { Screen, TopBar } from '@/components/Screen';
import { Segmented } from '@/components/Segmented';
import type { Units } from '@/domain/types';
import { useStore } from '@/state/AppStore';
import { colors, space } from '@/theme/tokens';

function Row({
  icon,
  title,
  subtitle,
  href,
  testID,
}: {
  icon: IconName;
  title: string;
  subtitle: string;
  href: Href;
  testID?: string;
}) {
  return (
    <Card style={styles.row} onPress={() => router.push(href)} accessibilityLabel={`${title}. ${subtitle}`} testID={testID}>
      <View style={styles.icon}>
        <Icon name={icon} size={22} color={colors.ink} />
      </View>
      <View style={styles.flex}>
        <AppText variant="bodyStrong">{title}</AppText>
        <AppText variant="caption" tone="secondary">
          {subtitle}
        </AppText>
      </View>
      <Chevron />
    </Card>
  );
}

const UNIT_OPTIONS = [
  { value: 'kg', label: 'kg', accessibilityLabel: 'Kilograms' },
  { value: 'lb', label: 'lb', accessibilityLabel: 'Pounds' },
] as const;

export default function More() {
  const { data, dispatch, eraseAll } = useStore();
  const [confirm, setConfirm] = useState(false);
  const units = data.settings.units;

  return (
    <Screen withTabBar testID="more">
      <TopBar />
      <AppText variant="h1">More</AppText>

      <Row icon="person" title="Your plan settings" subtitle="Goal, experience, days and equipment" href="/preferences" testID="more-preferences" />
      <Row icon="book" title="Exercise library" subtitle="Technique, cues and variations" href="/library" testID="more-library" />
      <Row icon="shield-checkmark-outline" title="Safety & about" subtitle="Disclaimer, content review, privacy" href="/about" />

      <Card style={styles.units}>
        <View style={styles.flex}>
          <AppText variant="bodyStrong">Weight units</AppText>
          <AppText variant="caption" tone="secondary">
            Used when logging loads
          </AppText>
        </View>
        <Segmented<Units>
          options={UNIT_OPTIONS}
          value={units}
          onChange={(option) => dispatch({ type: 'setUnits', units: option })}
          accessibilityLabel="Weight units"
        />
      </Card>

      <Card style={styles.row} onPress={() => setConfirm(true)} accessibilityLabel="Erase all data on this device" testID="erase-all">
        <View style={styles.icon}>
          <Icon name="trash-outline" size={22} color={colors.dangerInk} />
        </View>
        <View style={styles.flex}>
          <AppText variant="bodyStrong" tone="danger">
            Erase all data
          </AppText>
          <AppText variant="caption" tone="secondary">
            Removes your plan and workout history from this device
          </AppText>
        </View>
      </Card>

      <AppText variant="caption" tone="secondary" center>
        BLOB FIT · MVP preview · Your data stays on this device.
      </AppText>

      <ConfirmDialog
        visible={confirm}
        title="Erase everything?"
        body="Your plan settings and every logged workout will be permanently deleted from this device. There is no cloud backup."
        confirmLabel="Erase all data"
        destructive
        onConfirm={() => {
          setConfirm(false);
          eraseAll().catch(() => undefined);
        }}
        onCancel={() => setConfirm(false)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, gap: 2 },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm, minHeight: 72 },
  icon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  units: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
});
