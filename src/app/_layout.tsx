import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, Text, View, useColorScheme } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { Colors, Spacing } from '@/constants/theme';
import { NeighborhoodProvider, useNeighborhood } from '@/providers/neighborhood';
import { SessionProvider, useSession } from '@/providers/session';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const c = isDark ? Colors.dark : Colors.light;

  const navTheme = {
    ...(isDark ? DarkTheme : DefaultTheme),
    colors: {
      ...(isDark ? DarkTheme.colors : DefaultTheme.colors),
      primary: c.accent,
      background: c.background,
      card: c.surface,
      text: c.text,
      border: c.border,
    },
  };

  return (
    <GestureHandlerRootView style={styles.root}>
      <ThemeProvider value={navTheme}>
        <SessionProvider>
          <NeighborhoodProvider>
            <StatusBar style={isDark ? 'light' : 'dark'} />
            <Gate />
          </NeighborhoodProvider>
        </SessionProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}

/** Decides between onboarding and the app based on auth + location state. */
function Gate() {
  const { loading, error, profile } = useSession();
  const { status } = useNeighborhood();
  const scheme = useColorScheme();
  const c = scheme === 'dark' ? Colors.dark : Colors.light;

  useEffect(() => {
    if (!loading) SplashScreen.hideAsync();
  }, [loading]);

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: c.background }]}>
        <ActivityIndicator color={c.accent} />
      </View>
    );
  }

  if (error && !profile) {
    return (
      <View style={[styles.center, { backgroundColor: c.background }]}>
        <Text style={[styles.errorTitle, { color: c.text }]}>Bağlanamadık</Text>
        <Text style={[styles.errorBody, { color: c.textSecondary }]}>{error}</Text>
      </View>
    );
  }

  const ready = Boolean(profile) && status === 'ready';

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={ready}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="thread/[id]" options={{ headerShown: true, title: '' }} />
        <Stack.Screen name="thread/new" options={{ presentation: 'modal' }} />
        <Stack.Screen name="dm/[id]" options={{ headerShown: true, title: '' }} />
        <Stack.Screen name="contacts" options={{ headerShown: true, title: '' }} />
      </Stack.Protected>
      <Stack.Protected guard={!ready}>
        <Stack.Screen name="onboarding" />
      </Stack.Protected>
    </Stack>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl, gap: Spacing.sm },
  errorTitle: { fontSize: 20, fontWeight: '700' },
  errorBody: { fontSize: 14, textAlign: 'center' },
});
