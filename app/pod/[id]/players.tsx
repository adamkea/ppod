import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { IconButton, Text, useTheme } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { LinkAccountModal } from '@/components/PlayerLinkModals';
import { PlayerProfileModal } from '@/components/PlayerProfileModal';
import { PromptModal } from '@/components/PromptModal';
import { Card, EmptyState, ErrorState, Loading } from '@/components/ui';
import { UserAvatar } from '@/components/UserAvatar';
import {
  useAddPlayer,
  useClaimPlayer,
  useDeletePlayer,
  usePlayers,
  useRenamePlayer,
  useUnlinkPlayer,
} from '@/hooks/usePlayers';
import { usePod, usePodMembers } from '@/hooks/usePods';
import { useProfiles } from '@/hooks/useProfile';
import { confirmAsync } from '@/lib/confirm';
import { useAuth } from '@/providers/AuthProvider';
import { colors, spacing } from '@/theme';
import type { Player } from '@/types/database';

export default function PlayersScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const podId = id!;
  const insets = useSafeAreaInsets();
  const { session } = useAuth();
  const theme = useTheme();

  const pod = usePod(podId);
  const players = usePlayers(podId);
  const addPlayer = useAddPlayer(podId);
  const renamePlayer = useRenamePlayer(podId);
  const deletePlayer = useDeletePlayer(podId);
  const claimPlayer = useClaimPlayer(podId);
  const unlinkPlayer = useUnlinkPlayer(podId);
  const members = usePodMembers(podId);

  const userId = session?.user.id;
  const isOwner = pod.data?.owner_id === userId;
  const myPlayer = players.data?.find((p) => p.user_id === userId) ?? null;

  // Linked rows show the account behind them: its avatar and display name.
  const memberName = new Map(
    (members.data ?? []).map((m) => [m.user_id, m.display_name] as const),
  );
  const linkedUserIds = (players.data ?? []).flatMap((p) => (p.user_id ? [p.user_id] : []));
  const profiles = useProfiles(linkedUserIds);

  const [adding, setAdding] = useState(false);
  const [renaming, setRenaming] = useState<Player | null>(null);
  const [profilePlayer, setProfilePlayer] = useState<Player | null>(null);
  const [linking, setLinking] = useState<Player | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [linkError, setLinkError] = useState<string | null>(null);

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

  async function confirmDelete(player: Player) {
    const ok = await confirmAsync({
      title: 'Remove player',
      message: `Remove "${player.name}"? Their past game entries will be removed too.`,
      confirmLabel: 'Remove',
      destructive: true,
    });
    if (ok) deletePlayer.mutate(player.id);
  }

  async function confirmClaim(player: Player) {
    const ok = await confirmAsync({
      title: 'This is me',
      message: `Link your account to "${player.name}"? Their games and stats become yours.`,
      confirmLabel: 'Link',
    });
    if (!ok) return;
    setLinkError(null);
    try {
      await claimPlayer.mutateAsync(player.id);
    } catch (e) {
      setLinkError(e instanceof Error ? e.message : 'Could not link you to that player.');
    }
  }

  async function confirmUnlinkSelf(player: Player) {
    const ok = await confirmAsync({
      title: 'Unlink yourself',
      message: `Stop playing as "${player.name}"? Their games stay as they are.`,
      confirmLabel: 'Unlink',
      destructive: true,
    });
    if (!ok) return;
    setLinkError(null);
    try {
      await unlinkPlayer.mutateAsync(player.id);
    } catch (e) {
      setLinkError(e instanceof Error ? e.message : 'Could not unlink you.');
    }
  }

  function linkedLabel(player: Player): string | null {
    if (!player.user_id) return null;
    if (player.user_id === userId) return 'You';
    return memberName.get(player.user_id) ?? 'Linked account';
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
          ListHeaderComponent={
            linkError ? (
              <Text variant="bodySmall" style={{ color: colors.danger }}>
                {linkError}
              </Text>
            ) : null
          }
          ListEmptyComponent={
            <EmptyState
              title="No players yet"
              subtitle="Add the people in your playgroup. They don't need accounts, a name is enough."
            />
          }
          renderItem={({ item }) => {
            const linked = linkedLabel(item);
            const isMine = !!userId && item.user_id === userId;
            return (
              <Card style={styles.row}>
                <Pressable style={styles.rowMain} onPress={() => setProfilePlayer(item)}>
                  {item.user_id ? (
                    <UserAvatar profile={profiles.data?.get(item.user_id)} size={32} />
                  ) : null}
                  <View style={styles.rowText}>
                    <Text variant="titleSmall">{item.name}</Text>
                    {linked ? (
                      <Text variant="bodySmall" style={{ color: colors.success }}>
                        {linked}
                      </Text>
                    ) : null}
                  </View>
                </Pressable>
                <View style={styles.rowActions}>
                  {/* A member who isn't anyone yet can claim any free name. */}
                  {!isOwner && !myPlayer && !item.user_id ? (
                    <Button
                      label="This is me"
                      variant="secondary"
                      loading={claimPlayer.isPending && claimPlayer.variables === item.id}
                      disabled={claimPlayer.isPending}
                      onPress={() => confirmClaim(item)}
                      style={styles.claimButton}
                    />
                  ) : null}
                  {!isOwner && isMine ? (
                    <IconButton
                      icon="link-off"
                      size={20}
                      onPress={() => confirmUnlinkSelf(item)}
                      accessibilityLabel={`Unlink yourself from ${item.name}`}
                    />
                  ) : null}
                  {isOwner ? (
                    <>
                      <IconButton
                        icon={item.user_id ? 'link-variant' : 'link-variant-plus'}
                        size={20}
                        onPress={() => setLinking(item)}
                        accessibilityLabel={`Link an account to ${item.name}`}
                      />
                      <IconButton
                        icon="pencil-outline"
                        size={20}
                        onPress={() => setRenaming(item)}
                        accessibilityLabel={`Rename ${item.name}`}
                      />
                      <IconButton
                        icon="delete-outline"
                        size={20}
                        iconColor={theme.colors.error}
                        onPress={() => confirmDelete(item)}
                        accessibilityLabel={`Remove ${item.name}`}
                      />
                    </>
                  ) : null}
                </View>
              </Card>
            );
          }}
        />
      )}

      {isOwner ? (
        <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}>
          <Button label="Add player" onPress={() => setAdding(true)} />
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

      <LinkAccountModal
        podId={podId}
        player={linking}
        players={players.data ?? []}
        members={members.data ?? []}
        onClose={() => setLinking(null)}
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
    paddingVertical: spacing.sm,
  },
  rowMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  rowText: { flex: 1, gap: 2 },
  rowActions: { flexDirection: 'row', alignItems: 'center' },
  claimButton: { minHeight: 36, paddingHorizontal: spacing.md },
  footer: {
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
});
