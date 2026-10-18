import { ArchivoBlack_400Regular } from '@expo-google-fonts/archivo-black';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_800ExtraBold,
  Inter_900Black,
} from '@expo-google-fonts/inter';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { Illustration } from '@/components/Illustration';
import { SaveErrorBanner } from '@/components/SaveErrorBanner';
import { LoadingView } from '@/components/Screen';
import { REMINDERS_SUPPORTED, syncReminders } from '@/features/reminders';
import { SYSTEM_CHROME } from '@/lib/platform';
import { AppStoreProvider, useStore } from '@/state/AppStore';
import type { Weekday } from '@/domain/types';
import { colors, fonts, space } from '@/theme/tokens';

SplashScreen.preventAutoHideAsync().catch(() => undefined);

/** iOS navigation bar for pushed screens: solid cream, ink tint, back chevron without a label. */
const IOS_HEADER = {
  headerStyle: { backgroundColor: colors.bg },
  headerShadowVisible: false,
  headerTintColor: colors.ink,
  headerBackButtonDisplayMode: 'minimal',
  headerTitleStyle: { fontFamily: fonts.semibold, fontSize: 17, color: colors.ink },
} as const;
/** Pushed screens get the native navigation bar (and swipe-back) on iOS; elsewhere they draw their own. */
const pushed = { headerShown: SYSTEM_CHROME };

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_800ExtraBold,
    Inter_900Black,
    ArchivoBlack_400Regular,
  });
  const ready = fontsLoaded || Boolean(fontError);

  useEffect(() => {
    if (ready) {
      SplashScreen.hideAsync().catch(() => undefined);
    }
  }, [ready]);

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <AppStoreProvider>{ready ? <Navigation /> : <View style={styles.blank} />}</AppStoreProvider>
    </SafeAreaProvider>
  );
}

/** Keeps the scheduled training-day reminders in line with the schedule and the chosen time. */
function useReminderSync(days: readonly Weekday[] | undefined, hour: number | null) {
  const key = days ? `${days.join(',')}@${hour}` : null;
  useEffect(() => {
    if (REMINDERS_SUPPORTED && key !== null && days) {
      syncReminders(days, hour).catch(() => undefined);
    }
    // The key captures days and hour; re-running on identical values would only reschedule the same reminders.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
}

function Navigation() {
  const { load, data } = useStore();
  useReminderSync(data.preferences?.trainingDays, data.settings.reminderHour);
  if (load.status === 'loading') {
    return <LoadingView />;
  }
  if (load.status === 'error') {
    return <LoadErrorView message={load.message} />;
  }
  const onboarded = data.preferences !== null;
  return (
    <>
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg }, ...(SYSTEM_CHROME ? IOS_HEADER : null) }}>
      <Stack.Protected guard={onboarded}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="exercise/[id]" options={pushed} />
        {/* iOS: a sheet; swiping it down minimises the workout, which stays saved. */}
        <Stack.Screen
          name="workout"
          options={SYSTEM_CHROME ? { presentation: 'modal', gestureEnabled: true } : { gestureEnabled: false }}
        />
        <Stack.Screen
          name="session/[id]"
          options={({ route }) => ({
            headerShown: SYSTEM_CHROME && (route.params as { fresh?: string } | undefined)?.fresh !== '1',
          })}
        />
        <Stack.Screen name="library" options={pushed} />
        <Stack.Screen name="preferences" options={pushed} />
        <Stack.Screen name="about" options={pushed} />
      </Stack.Protected>
      <Stack.Protected guard={!onboarded}>
        <Stack.Screen name="onboarding" />
      </Stack.Protected>
    </Stack>
    <SaveErrorBanner />
    </>
  );
}

function LoadErrorView({ message }: { message: string }) {
  const { retryLoad, eraseAll } = useStore();
  const [confirming, setConfirming] = useState(false);
  return (
    <View style={styles.error} accessibilityLiveRegion="assertive">
      <Illustration name="blob-peek" height={90} />
      <AppText variant="h2" center>
        We couldn&apos;t open your saved data
      </AppText>
      <AppText tone="secondary" center>
        {message} Nothing has been deleted. You can try again, or start fresh on this device.
      </AppText>
      <Button label="Try again" onPress={retryLoad} />
      <Button label="Start fresh" variant="danger" onPress={() => setConfirming(true)} />
      <ConfirmDialog
        visible={confirming}
        title="Start fresh?"
        body="This permanently deletes the workout history and settings stored on this device."
        confirmLabel="Delete and start fresh"
        destructive
        onConfirm={() => {
          setConfirming(false);
          eraseAll().catch(() => undefined);
        }}
        onCancel={() => setConfirming(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  blank: { flex: 1, backgroundColor: colors.bg },
  error: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: 'stretch',
    justifyContent: 'center',
    padding: space.xl,
    gap: space.md,
  },
});
