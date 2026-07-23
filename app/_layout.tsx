import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { View } from 'react-native';
import { PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { Loading } from '@/components/ui';
import { ProfileHeaderButton } from '@/components/UserAvatar';
import { useAuth } from '@/providers/AuthProvider';
import { Providers } from '@/providers/Providers';
import { colors, paperTheme } from '@/theme';

export const unstable_settings = {
  initialRouteName: 'index',
};

function RootNavigator() {
  const { session, initializing, isRecovery } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (initializing) return;
    const inAuthGroup = segments[0] === 'sign-in';
    const inResetScreen = segments[0] === 'reset-password';

    if (isRecovery && !inResetScreen) {
      router.replace('/reset-password');
    } else if (!session && !inAuthGroup) {
      router.replace('/sign-in');
    } else if (session && !isRecovery && inAuthGroup) {
      router.replace('/');
    }
  }, [session, initializing, isRecovery, segments, router]);

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
        // Every screen gets the avatar in the top-right corner; tapping it
        // opens profile settings.
        headerRight: () => <ProfileHeaderButton />,
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Your Pods' }} />
      <Stack.Screen name="sign-in" options={{ headerShown: false }} />
      <Stack.Screen name="reset-password" options={{ headerShown: false }} />
      <Stack.Screen
        name="profile"
        options={{ title: 'Profile', headerRight: () => null }}
      />
      <Stack.Screen name="pod/[id]/index" options={{ title: 'Pod' }} />
      <Stack.Screen
        name="pod/[id]/add-game"
        options={{ title: 'Log Game', presentation: 'modal' }}
      />
      <Stack.Screen name="pod/[id]/players" options={{ title: 'Players' }} />
      <Stack.Screen name="pod/[id]/settings" options={{ title: 'Pod Settings' }} />
      <Stack.Screen name="pod/[id]/comments" options={{ title: 'Comments' }} />
      <Stack.Screen name="pod/[id]/stats" options={{ title: 'Stats' }} />
      <Stack.Screen name="pod/[id]/series/index" options={{ title: 'Series' }} />
      <Stack.Screen
        name="pod/[id]/series/new"
        options={{ title: 'New Series', presentation: 'modal' }}
      />
      <Stack.Screen name="pod/[id]/series/[seriesId]" options={{ title: 'Series' }} />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <PaperProvider theme={paperTheme}>
        <Providers>
          <StatusBar style="light" />
          <RootNavigator />
        </Providers>
      </PaperProvider>
    </SafeAreaProvider>
  );
}
