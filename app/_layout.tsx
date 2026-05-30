import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { Loading } from '@/components/ui';
import { useAuth } from '@/providers/AuthProvider';
import { Providers } from '@/providers/Providers';
import { colors } from '@/theme';

export const unstable_settings = {
  initialRouteName: 'index',
};

function RootNavigator() {
  const { session, initializing } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (initializing) return;
    const inAuthGroup = segments[0] === 'sign-in';

    if (!session && !inAuthGroup) {
      router.replace('/sign-in');
    } else if (session && inAuthGroup) {
      router.replace('/');
    }
  }, [session, initializing, segments, router]);

  if (initializing) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <Loading label="Loading…" />
      </View>
    );
  }

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.bg },
        headerTintColor: colors.text,
        headerTitleStyle: { color: colors.text },
        contentStyle: { backgroundColor: colors.bg },
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Your Pods' }} />
      <Stack.Screen name="sign-in" options={{ headerShown: false }} />
      <Stack.Screen name="pod/[id]/index" options={{ title: 'Pod' }} />
      <Stack.Screen
        name="pod/[id]/add-game"
        options={{ title: 'Log Game', presentation: 'modal' }}
      />
      <Stack.Screen name="pod/[id]/players" options={{ title: 'Players' }} />
      <Stack.Screen name="pod/[id]/stats" options={{ title: 'Stats' }} />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <Providers>
        <StatusBar style="light" />
        <RootNavigator />
      </Providers>
    </SafeAreaProvider>
  );
}
