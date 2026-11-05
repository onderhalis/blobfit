import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Card, ReviewBadge } from '@/components/Card';
import { Illustration } from '@/components/Illustration';
import { Screen, TopBar } from '@/components/Screen';
import { formatShortDate } from '@/domain/dates';
import { DISCLAIMER } from '@/domain/goals';
import { useStore } from '@/state/AppStore';
import { space } from '@/theme/tokens';

const SAFETY = [
  'Warm up for about five minutes before your first set.',
  'Choose a range of motion and effort you can control. Leave a rep or two in reserve.',
  'Mild muscle soreness a day or two later is common. Sharp pain is a signal to stop.',
  'Rest days are part of training, not a break from it.',
];

export default function About() {
  const { data } = useStore();
  const accepted = data.preferences?.disclaimerAcceptedAt;
  return (
    <Screen testID="about">
      <TopBar back title="Safety & about" />
      <View style={styles.art}>
        <Illustration name="blob-warm-up" height={110} label="Blob stretching" />
      </View>

      <Card style={styles.section}>
        <AppText variant="h2">Train safely</AppText>
        {SAFETY.map((line) => (
          <AppText key={line}>• {line}</AppText>
        ))}
      </Card>

      <Card style={styles.section}>
        <AppText variant="h2">Disclaimer</AppText>
        <AppText tone="secondary">{DISCLAIMER}</AppText>
        {accepted ? (
          <AppText variant="caption" tone="secondary">
            You accepted this on {formatShortDate(new Date(accepted))}.
          </AppText>
        ) : null}
      </Card>

      <Card style={styles.section}>
        <AppText variant="h2">Content review</AppText>
        <ReviewBadge />
        <AppText tone="secondary">
          Exercise steps, muscle lists, sets, reps and illustrations are starting points written for beginners. They
          have not yet been reviewed by a qualified strength coach. Illustrations are concept art, not anatomical
          diagrams.
        </AppText>
      </Card>

      <Card style={styles.section}>
        <AppText variant="h2">Your data</AppText>
        <AppText tone="secondary">
          No account, no tracking, no cloud. Your plan and workout logs are stored only on this device, and every
          number in Progress comes from workouts you logged. Erasing app data or uninstalling removes them.
        </AppText>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  art: { alignItems: 'center' },
  section: { gap: space.xs },
});
