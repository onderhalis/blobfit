import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { AppText, Eyebrow } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Card, Chevron } from '@/components/Card';
import { Illustration } from '@/components/Illustration';
import { ProgressBar } from '@/components/Progress';
import { Screen, TopBar } from '@/components/Screen';
import { WEEKDAY_LONG, weekdayOf } from '@/domain/dates';
import { completedSessions, todayStatus, weekSummary, type TodayStatus } from '@/domain/progress';
import { useStartWorkout } from '@/features/useWorkoutActions';
import { greeting, plural } from '@/lib/format';
import { useNow, useStore } from '@/state/AppStore';
import { colors, radius, space } from '@/theme/tokens';

function heroCopy(status: TodayStatus, sessionsDone: number): { headline: string; cta: string } {
  switch (status.kind) {
    case 'in-progress':
      return { headline: 'Your workout is waiting for you.', cta: 'Resume workout' };
    case 'done':
      return { headline: 'Done for today. Nice work.', cta: 'See your plan' };
    case 'rest':
      return { headline: 'Rest is part of the plan.', cta: 'See your plan' };
    case 'train':
      return sessionsDone === 0
        ? { headline: 'A stronger, happier you starts today.', cta: 'Start today' }
        : { headline: `Session ${sessionsDone + 1} is ready.`, cta: 'Start workout' };
  }
}

const QUICK_LINKS = [
  { icon: 'barbell', title: 'Workouts', sub: "Today's session", href: '/plan', tint: colors.ink },
  { icon: 'book', title: 'Exercises', sub: 'Learn the moves', href: '/library', tint: colors.tint.blue.fg },
  { icon: 'leaf', title: 'Safety', sub: 'Rest & form', href: '/about', tint: colors.tint.lavender.fg },
  { icon: 'stats-chart', title: 'Progress', sub: 'Your real logs', href: '/progress', tint: colors.ink },
] as const;

export default function Home() {
  const { data } = useStore();
  const now = useNow(60_000);
  const startWorkout = useStartWorkout();
  const prefs = data.preferences;
  if (!prefs) {
    return null;
  }

  const status = todayStatus(prefs, data.sessions, now);
  const done = completedSessions(data.sessions).length;
  const week = weekSummary(prefs, data.sessions, now);
  const copy = heroCopy(status, done);

  const onHeroPress = () => {
    if (status.kind === 'in-progress') {
      router.push('/workout');
    } else if (status.kind === 'train') {
      startWorkout(status.workout.id);
    } else {
      router.push('/plan');
    }
  };

  const focus =
    status.kind === 'rest' || status.kind === 'done'
      ? {
          eyebrow: "Today's focus",
          title: 'Rest counts, too.',
          body: `A gentle walk is plenty. Next session: ${WEEKDAY_LONG[weekdayOf(status.nextDay)]}.`,
        }
      : {
          eyebrow: "Today's focus",
          title: 'Warm up first.',
          body: '5 minutes of easy movement before your first set.',
        };

  return (
    <Screen withTabBar testID="home">
      <TopBar showProfile />

      <View style={styles.hero}>
        <View style={styles.heroText}>
          <AppText variant="lead" tone="secondary">
            {greeting(now)}
            {'\n'}You&apos;ve got this.
          </AppText>
          <AppText variant="h1" style={styles.headline}>
            {copy.headline}
          </AppText>
          <AppText variant="lead" tone="secondary">
            Small steps.{'\n'}Real progress.{'\n'}Same you.
          </AppText>
        </View>
        <View style={styles.heroArt} pointerEvents="none">
          <Illustration name="blob-idle-towel" height={340} />
        </View>
      </View>
      <Button
        testID="home-cta"
        label={copy.cta}
        arrow
        onPress={onHeroPress}
        style={styles.cta}
        accessibilityHint={status.kind === 'train' ? `Starts ${status.workout.name}` : undefined}
      />

      <Card
        onPress={() => router.push('/progress')}
        accessibilityLabel={`Your journey: week ${week.weekNumber}. ${week.done} of ${week.target} workouts done this week.`}
        accessibilityHint="Opens your progress">
        <View style={styles.journeyTop}>
          <View style={styles.flame}>
            <Ionicons name="flame" size={26} color={colors.accent} />
          </View>
          <View style={styles.flex}>
            <Eyebrow>Your journey</Eyebrow>
            <AppText variant="h2">Week {week.weekNumber}</AppText>
          </View>
          <View style={styles.journeyCount}>
            <AppText variant="h3">
              {week.done}/{week.target}
            </AppText>
            <AppText variant="caption" tone="secondary">
              Workouts
            </AppText>
          </View>
          <Chevron />
        </View>
        <ProgressBar
          value={week.target === 0 ? 0 : week.done / week.target}
          label={`${plural(week.done, 'workout')} of ${week.target} this week`}
        />
      </Card>

      <View style={styles.links}>
        {QUICK_LINKS.map((link) => (
          <Card
            key={link.title}
            style={styles.link}
            onPress={() => router.push(link.href)}
            accessibilityLabel={`${link.title}. ${link.sub}`}>
            <Ionicons name={link.icon} size={28} color={link.tint} />
            <AppText variant="bodyStrong" center style={styles.linkTitle}>
              {link.title}
            </AppText>
            <AppText variant="caption" tone="secondary" center>
              {link.sub}
            </AppText>
          </Card>
        ))}
      </View>

      <Card tone="deep" style={styles.focus} onPress={() => router.push('/plan')} accessibilityLabel={`${focus.title} ${focus.body}`}>
        <View style={styles.focusText}>
          <Eyebrow>{focus.eyebrow}</Eyebrow>
          <AppText variant="h2">{focus.title}</AppText>
          <AppText variant="caption" tone="secondary">
            {focus.body}
          </AppText>
        </View>
        <View style={styles.focusArt}>
          <Illustration name="blob-stretch-peek" height={96} />
        </View>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  hero: { flexDirection: 'row', minHeight: 300 },
  heroText: { flex: 1.15, gap: space.md, paddingTop: space.md, zIndex: 1 },
  headline: { marginTop: space.xxs },
  heroArt: { flex: 1, alignItems: 'center', marginRight: -space.xl, marginLeft: -space.xxl },
  cta: { alignSelf: 'flex-start', marginTop: -space.xl, paddingHorizontal: space.xxl },
  journeyTop: { flexDirection: 'row', alignItems: 'center', gap: space.sm, marginBottom: space.md },
  flame: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  journeyCount: { alignItems: 'center' },
  links: { flexDirection: 'row', gap: space.xs },
  link: { flex: 1, alignItems: 'center', paddingHorizontal: space.xxs, paddingVertical: space.md, gap: 2 },
  linkTitle: { marginTop: space.xs, fontSize: 14 },
  focus: { flexDirection: 'row', alignItems: 'flex-end', overflow: 'hidden', paddingBottom: 0, borderRadius: radius.lg },
  focusText: { flex: 1, gap: space.xxs, paddingBottom: space.md },
  focusArt: { marginRight: -space.xs },
});
