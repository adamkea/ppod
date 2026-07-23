import { useRouter } from 'expo-router';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import { Icon, useTheme } from 'react-native-paper';

import { useCommanderArt } from '@/hooks/useCardArt';
import { useMyProfile } from '@/hooks/useProfile';
import { useAuth } from '@/providers/AuthProvider';
import type { UserProfile } from '@/types/database';

type AvatarProfile = Pick<
  UserProfile,
  'avatar_commander_name' | 'avatar_scryfall_id'
> | null;

// A circular avatar rendering the user's chosen commander artwork, with a
// generic account glyph until one is picked (or while the art loads).
export function UserAvatar({
  profile,
  size = 32,
}: {
  profile?: AvatarProfile;
  size?: number;
}) {
  const theme = useTheme();
  const art = useCommanderArt(profile?.avatar_commander_name, profile?.avatar_scryfall_id);

  return (
    <View
      style={[
        styles.circle,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: theme.colors.surfaceVariant,
        },
      ]}
    >
      {art.data ? (
        <Image source={{ uri: art.data }} style={styles.img} resizeMode="cover" />
      ) : (
        <Icon
          source="account-circle"
          size={size * 0.7}
          color={theme.colors.onSurfaceVariant}
        />
      )}
    </View>
  );
}

// The avatar in the app header's top-right corner; tapping it opens the
// profile settings screen.
export function ProfileHeaderButton() {
  const router = useRouter();
  const { session } = useAuth();
  const profile = useMyProfile();

  if (!session) return null;
  return (
    <Pressable
      onPress={() => router.push('/profile')}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel="Profile settings"
    >
      <UserAvatar profile={profile.data} size={32} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  circle: {
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  img: { width: '100%', height: '100%' },
});
