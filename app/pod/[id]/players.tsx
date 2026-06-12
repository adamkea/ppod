import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { PlayerProfileModal } from '@/components/PlayerProfileModal';
import { PromptModal } from '@/components/PromptModal';
import { Card, EmptyState, ErrorState, Loading } from '@/components/ui';
import {
  useAddPlayer,
  useDeletePlayer,
  usePlayers,
  useRenamePlayer,
} from '@/hooks/usePlayers';
import { usePod } from '@/hooks/usePods';
import { useAuth } from '@/providers/AuthProvider';
import { colors, fontSize, spacing } from '@/theme';
import type { Player } from '@/types/database';

export default function PlayersScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const podId = id!;
  const insets = useSafeAreaInsets();
  const { session } = useAuth();

  const pod = usePod(podId);
  const players = usePlayers(podId);
  const addPlayer = useAddPlayer(podId);
  const renamePlayer = useRenamePlayer(podId);
  const deletePlayer = useDeletePlayer(podId);

  const isOwner = pod.data?.owner_id === session?.user.id;

  const [adding, setAdding] = useState(false);
  const [renaming, setRenaming] = useState<Player | null>(null);
  const [profilePlayer, setProfilePlayer] = useState<Player | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleAdd(name: string) {
    setError(null);
    try {
      await addPlayer.mutateAsync(name);
      setAdding(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not add player.');
    }
  }

  async function handleRename(name: string) {
    if (!renaming) return;
    setError(null);
    try {
      await renamePlayer.mutateAsync({ playerId: renaming.id, name });
      setRenaming(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not rename player.');
    }
  }

  function confirmDelete(player: Player) {
    Alert.alert(
      'Remove player',
      `Remove "${player.name}"? Their past game entries will be removed too.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => deletePlayer.mutate(player.id),
        },
      ],
    );
  }

  return (
    <View style={styles.flex}>
      {players.isLoading ? (
        <Loading label="Loading players…" />
      ) : players.isError ? (
        <ErrorState message={(players.error as Error)?.message} />
      ) : (
        <FlatList
          data={players.data}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <EmptyState
              title="No players yet"
              subtitle="Add the people in your playgroup. They don't need accounts — a name is enough."
            />
          }
          renderItem={({ item }) => (
            <Card style={styles.row}>
              <Pressable style={styles.rowMain} onPress={() => setProfilePlayer(item)}>
                <Text style={styles.name}>{item.name}</Text>
                {item.user_id ? <Text style={styles.linked}>linked account</Text> : null}
              </Pressable>
              {isOwner ? (
                <View style={styles.rowActions}>
                  <Pressable onPress={() => setRenaming(item)} hitSlop={8}>
                    <Text style={styles.renameText}>Rename</Text>
                  </Pressable>
                  <Pressable onPress={() => confirmDelete(item)} hitSlop={8}>
                    <Text style={styles.remove}>Remove</Text>
                  </Pressable>
                </View>
              ) : null}
            </Card>
          )}
        />
      )}

      {isOwner ? (
        <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}>
          <Button label="＋ Add player" onPress={() => setAdding(true)} />
        </View>
      ) : null}

      <PromptModal
        visible={adding}
        title="Add player"
        label="Name"
        placeholder="Player name"
        submitLabel="Add"
        autoCapitalize="words"
        submitting={addPlayer.isPending}
        error={error}
        onSubmit={handleAdd}
        onClose={() => {
          setAdding(false);
          setError(null);
        }}
      />
      <PromptModal
        visible={renaming !== null}
        title="Rename player"
        label="Name"
        initialValue={renaming?.name ?? ''}
        submitLabel="Save"
        autoCapitalize="words"
        submitting={renamePlayer.isPending}
        error={error}
        onSubmit={handleRename}
        onClose={() => {
          setRenaming(null);
          setError(null);
        }}
      />

      <PlayerProfileModal
        player={profilePlayer}
        readOnly={!isOwner}
        onClose={() => setProfilePlayer(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  list: { padding: spacing.lg, gap: spacing.md, flexGrow: 1 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
  },
  rowMain: { flex: 1, gap: 2 },
  rowActions: { flexDirection: 'row', gap: spacing.md, alignItems: 'center' },
  name: { color: colors.text, fontSize: fontSize.md, fontWeight: '600' },
  linked: { color: colors.success, fontSize: fontSize.sm },
  renameText: { color: colors.primary, fontSize: fontSize.sm, fontWeight: '600' },
  remove: { color: colors.danger, fontSize: fontSize.sm, fontWeight: '600' },
  footer: {
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
});
