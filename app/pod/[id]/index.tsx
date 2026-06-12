import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Image, Pressable, SectionList, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { PromptModal } from '@/components/PromptModal';
import { Card, EmptyState, ErrorState, Loading } from '@/components/ui';
import { useGames } from '@/hooks/useGames';
import { usePod, useRenamePod } from '@/hooks/usePods';
import { useCommanderArt } from '@/hooks/useCardArt';
import { formatDateHeading } from '@/lib/dates';
import { commanderLabel, groupGamesByDate } from '@/lib/stats';
import { useAuth } from '@/providers/AuthProvider';
import { colors, fontSize, radius, spacing } from '@/theme';
import type { GameWithPlayers } from '@/types/database';

export default function PodDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const podId = id!;
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { session } = useAuth();

  const pod = usePod(podId);
  const games = useGames(podId);
  const renamePod = useRenamePod();

  const isOwner = pod.data?.owner_id === session?.user.id;

  const [renaming, setRenaming] = useState(false);
  const [renameError, setRenameError] = useState<string | null>(null);

  async function handleRename(name: string) {
    setRenameError(null);
    try {
      await renamePod.mutateAsync({ podId, name });
      setRenaming(false);
    } catch (e) {
      setRenameError(e instanceof Error ? e.message : 'Could not rename pod.');
    }
  }

  const sections = useMemo(
    () =>
      groupGamesByDate(games.data ?? []).map((s) => ({
        title: formatDateHeading(s.date),
        data: s.games,
      })),
    [games.data],
  );

  return (
    <View style={styles.flex}>
      <Stack.Screen
        options={{
          title: pod.data?.name ?? 'Pod',
          headerRight: () => (
            <View style={styles.headerButtons}>
              {isOwner && (
                <Pressable onPress={() => setRenaming(true)} hitSlop={8}>
                  <Text style={styles.headerLink}>Edit</Text>
                </Pressable>
              )}
              <Pressable onPress={() => router.push(`/pod/${podId}/stats`)} hitSlop={8}>
                <Text style={styles.headerLink}>Stats</Text>
              </Pressable>
            </View>
          ),
        }}
      />

      {games.isLoading ? (
        <Loading label="Loading games…" />
      ) : games.isError ? (
        <ErrorState message={(games.error as Error)?.message} />
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          stickySectionHeadersEnabled={false}
          refreshing={games.isRefetching}
          onRefresh={() => games.refetch()}
          ListHeaderComponent={
            <PodHeader
              inviteCode={pod.data?.invite_code}
              onPlayers={() => router.push(`/pod/${podId}/players`)}
            />
          }
          ListEmptyComponent={
            <EmptyState
              title="No games logged yet"
              subtitle="Tap “Log game” to record your first one."
            />
          }
          renderSectionHeader={({ section }) => (
            <Text style={styles.sectionHeader}>{section.title}</Text>
          )}
          renderItem={({ item }) => (
            <GameCard
              game={item}
              canEdit={isOwner}
              onPress={() =>
                router.push({
                  pathname: `/pod/${podId}/add-game`,
                  params: { gameId: item.id },
                })
              }
            />
          )}
        />
      )}

      <PromptModal
        visible={renaming}
        title="Rename pod"
        placeholder="Pod name"
        initialValue={pod.data?.name ?? ''}
        submitLabel="Save"
        submitting={renamePod.isPending}
        error={renameError}
        onSubmit={handleRename}
        onClose={() => { setRenaming(false); setRenameError(null); }}
      />

      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}>
        {isOwner ? (
          <>
            <Button
              label="＋ Log game"
              onPress={() => router.push(`/pod/${podId}/add-game`)}
            />
            <Text style={styles.ownerHint}>
              You own this pod · share code {pod.data?.invite_code}
            </Text>
          </>
        ) : pod.data ? (
          <Text style={styles.ownerHint}>
            View only · only the pod owner can log or edit games
          </Text>
        ) : null}
      </View>
    </View>
  );
}

function PodHeader({
  inviteCode,
  onPlayers,
}: {
  inviteCode?: string;
  onPlayers: () => void;
}) {
  return (
    <View style={styles.podHeader}>
      <View style={styles.inviteRow}>
        <View>
          <Text style={styles.inviteLabel}>Invite code</Text>
          <Text style={styles.inviteCode}>{inviteCode ?? '—'}</Text>
        </View>
        <Button label="Players" variant="secondary" onPress={onPlayers} />
      </View>
    </View>
  );
}

function CommanderCell({
  name,
  commander,
  scryfallId,
  isWinner,
}: {
  name: string;
  commander: string | null;
  scryfallId: string | null;
  isWinner: boolean;
}) {
  // Pinned art by print id when chosen, else the name's default printing.
  const artUri = useCommanderArt(commander, scryfallId).data ?? null;

  const borderColor = isWinner ? colors.success : colors.danger;

  return (
    <View style={[gridStyles.cell, { borderColor }]}>
      {artUri ? (
        <Image source={{ uri: artUri }} style={gridStyles.art} resizeMode="cover" />
      ) : (
        <View style={gridStyles.artPlaceholder}>
          <Text style={gridStyles.placeholderIcon}>🃏</Text>
        </View>
      )}
      <View style={[gridStyles.nameBar, { backgroundColor: isWinner ? colors.success + '33' : colors.danger + '33' }]}>
        {isWinner && <Text style={gridStyles.crownIcon}>👑</Text>}
        <Text style={[gridStyles.playerName, { color: isWinner ? colors.success : colors.danger }]} numberOfLines={1}>
          {name}
        </Text>
      </View>
      {commander ? (
        <Text style={gridStyles.commanderText} numberOfLines={1}>
          {commander}
        </Text>
      ) : null}
    </View>
  );
}

function GameCard({
  game,
  canEdit,
  onPress,
}: {
  game: GameWithPlayers;
  canEdit: boolean;
  onPress: () => void;
}) {
  const participants = [...game.game_players].sort((a, b) => {
    if (a.is_winner !== b.is_winner) return a.is_winner ? -1 : 1;
    return (a.players?.name ?? '').localeCompare(b.players?.name ?? '');
  });

  const useGrid = participants.length >= 2 && participants.length <= 4;

  return (
    <Pressable onPress={onPress} disabled={!canEdit}>
      {({ pressed }) => (
        <Card style={[styles.gameCard, pressed && canEdit && styles.pressed]}>
          <Text style={styles.gameType}>{game.game_type}</Text>
          {useGrid ? (
            <View style={gridStyles.grid}>
              {participants.map((gp) => (
                <CommanderCell
                  key={gp.id}
                  name={gp.players?.name ?? 'Unknown'}
                  commander={gp.commander}
                  scryfallId={gp.commander_scryfall_id}
                  isWinner={gp.is_winner}
                />
              ))}
            </View>
          ) : (
            <View style={styles.participants}>
              {participants.map((gp) => {
                const cmd = commanderLabel(gp.commander, gp.partner_commander);
                return (
                  <View key={gp.id} style={styles.participantRow}>
                    <Text
                      style={[styles.participantName, gp.is_winner && styles.winnerName]}
                      numberOfLines={1}
                    >
                      {gp.is_winner ? '👑 ' : ''}
                      {gp.players?.name ?? 'Unknown'}
                    </Text>
                    {cmd ? (
                      <Text style={styles.commander} numberOfLines={1}>
                        {cmd}
                      </Text>
                    ) : null}
                  </View>
                );
              })}
            </View>
          )}
          {game.note ? (
            <Text style={styles.note} numberOfLines={3}>
              {game.note}
            </Text>
          ) : null}
        </Card>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  list: { padding: spacing.lg, gap: spacing.md, flexGrow: 1 },
  headerButtons: { flexDirection: 'row', gap: spacing.md },
  headerLink: { color: colors.primary, fontSize: fontSize.md, fontWeight: '600' },
  podHeader: { marginBottom: spacing.sm },
  inviteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  inviteLabel: { color: colors.textMuted, fontSize: fontSize.sm },
  inviteCode: {
    color: colors.text,
    fontSize: fontSize.xl,
    fontWeight: '800',
    letterSpacing: 2,
  },
  sectionHeader: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: spacing.sm,
  },
  gameCard: { gap: spacing.sm },
  pressed: { opacity: 0.7 },
  gameType: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    textTransform: 'capitalize',
  },
  note: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    fontStyle: 'italic',
    marginTop: spacing.xs,
  },
  participants: { gap: spacing.xs },
  participantRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.md,
  },
  participantName: { color: colors.text, fontSize: fontSize.md, flexShrink: 1 },
  winnerName: { color: colors.winner, fontWeight: '700' },
  commander: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    flexShrink: 1,
    textAlign: 'right',
  },
  footer: {
    padding: spacing.lg,
    paddingBottom: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: spacing.sm,
  },
  ownerHint: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    textAlign: 'center',
  },
});

const gridStyles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  cell: {
    width: '48.5%',
    borderRadius: radius.sm,
    borderWidth: 2,
    overflow: 'hidden',
    backgroundColor: colors.surfaceAlt,
  },
  art: {
    width: '100%',
    height: 110,
  },
  artPlaceholder: {
    width: '100%',
    height: 110,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceAlt,
  },
  placeholderIcon: { fontSize: 28 },
  nameBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xs,
    paddingTop: spacing.xs,
    gap: 3,
  },
  crownIcon: { fontSize: 11 },
  playerName: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    flexShrink: 1,
  },
  commanderText: {
    color: colors.textMuted,
    fontSize: 11,
    paddingHorizontal: spacing.xs,
    paddingBottom: spacing.xs,
  },
});
