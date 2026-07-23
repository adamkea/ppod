import { useEffect, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { HelperText, Text, useTheme } from 'react-native-paper';

import { Button } from '@/components/Button';
import { CommanderArtPicker, ArtChooserRow } from '@/components/CommanderArtPicker';
import { CommanderSearch } from '@/components/CommanderSearch';
import { TextField } from '@/components/TextField';
import { Loading } from '@/components/ui';
import { UserAvatar } from '@/components/UserAvatar';
import { useMyProfile, useUpdateMyProfile } from '@/hooks/useProfile';
import type { ScryfallArt } from '@/lib/scryfall';
import { useAuth } from '@/providers/AuthProvider';
import { colors, spacing } from '@/theme';

export default function ProfileScreen() {
  const theme = useTheme();
  const { session, signOut } = useAuth();
  const profile = useMyProfile();
  const update = useUpdateMyProfile();

  const [nickname, setNickname] = useState('');
  const [avatarSearch, setAvatarSearch] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Seed the form from the saved profile once — not on every refetch, which
  // would clobber in-progress edits.
  const seeded = useRef(false);
  useEffect(() => {
    if (seeded.current || !profile.isSuccess) return;
    seeded.current = true;
    setNickname(profile.data?.nickname ?? '');
    setAvatarSearch(profile.data?.avatar_commander_name ?? '');
  }, [profile.isSuccess, profile.data]);

  const savedNickname = profile.data?.nickname ?? '';
  const nicknameDirty = nickname.trim() !== savedNickname;

  async function handleSaveNickname() {
    setError(null);
    try {
      await update.mutateAsync({ nickname: nickname.trim() || null });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save nickname.');
    }
  }

  // Picking an artwork saves the avatar right away.
  async function handleArtSelected(art: ScryfallArt) {
    setPickerOpen(false);
    setError(null);
    try {
      await update.mutateAsync({
        avatar_commander_name: avatarSearch.trim(),
        avatar_scryfall_id: art.id,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save avatar.');
    }
  }

  // The stored print id only applies while the search still names the same card.
  const searchMatchesSaved =
    avatarSearch.trim() === (profile.data?.avatar_commander_name ?? '');
  const selectedArtId = searchMatchesSaved
    ? profile.data?.avatar_scryfall_id ?? null
    : null;

  if (profile.isLoading) {
    return (
      <View style={styles.flex}>
        <Loading label="Loading profile…" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.avatarWrap}>
          <UserAvatar profile={profile.data} size={96} />
          <Text variant="titleMedium">
            {savedNickname || session?.user.email || ''}
          </Text>
        </View>

        <View style={styles.section}>
          <SectionLabel>Nickname</SectionLabel>
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
            Shown with your comments instead of your email. Change it any time.
          </Text>
          <TextField
            placeholder="e.g. Storm Crow"
            value={nickname}
            onChangeText={setNickname}
            maxLength={40}
            autoCapitalize="words"
            dense
          />
          <Button
            label="Save nickname"
            onPress={handleSaveNickname}
            disabled={!nicknameDirty}
            loading={update.isPending}
          />
        </View>

        <View style={styles.section}>
          <SectionLabel>Avatar</SectionLabel>
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
            Pick any commander artwork as your avatar.
          </Text>
          <View style={styles.searchRow}>
            <CommanderSearch
              value={avatarSearch}
              onChange={setAvatarSearch}
              placeholder="Search for a card…"
            />
          </View>
          <ArtChooserRow
            name={avatarSearch}
            scryfallId={selectedArtId}
            onPress={() => setPickerOpen(true)}
          />
        </View>

        {error ? (
          <HelperText type="error" visible style={styles.error}>
            {error}
          </HelperText>
        ) : null}

        <View style={styles.signOut}>
          <Button label="Sign out" variant="danger" onPress={() => signOut()} />
        </View>
      </ScrollView>

      <CommanderArtPicker
        commanderName={pickerOpen && avatarSearch.trim() ? avatarSearch.trim() : null}
        selectedId={selectedArtId}
        onSelect={handleArtSelected}
        onClose={() => setPickerOpen(false)}
      />
    </KeyboardAvoidingView>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  const theme = useTheme();
  return (
    <Text
      variant="labelLarge"
      style={[styles.sectionLabel, { color: theme.colors.onSurfaceVariant }]}
    >
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, gap: spacing.xl },
  avatarWrap: { alignItems: 'center', gap: spacing.sm },
  section: { gap: spacing.sm },
  sectionLabel: {
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  searchRow: { zIndex: 10 },
  error: { paddingHorizontal: 0 },
  signOut: { marginTop: spacing.lg },
});
