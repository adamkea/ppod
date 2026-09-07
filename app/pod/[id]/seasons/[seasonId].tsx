import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { Icon, Text, useTheme } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { PromptModal } from '@/components/PromptModal';
import { StatRow } from '@/components/StatRow';
import { Card, EmptyState, ErrorState, Loading, SectionLabel } from '@/components/ui';
import { useGames } from '@/hooks/useGames';
import { usePod } from '@/hooks/usePods';
import { useDeleteSeason, useRenameSeason, useSeason } from '@/hooks/useSeasons';
import { usePlayerStats } from '@/hooks/useStats';
import { confirmAsync } from '@/lib/confirm';
import { formatDateHeading } from '@/lib/dates';
import { gamesInSeason } from '@/lib/seasons';
import { commanderLabel } from '@/lib/stats';
import { useAuth } from '@/providers/AuthProvider';
import { colors, fonts, spacing } from '@/theme';
import type { GameWithPlayers } from '@/types/database';

export default function SeasonDetailScreen() {
  const { id, seasonId } = useLocalSearchParams<{ id: string; seasonId: string }>();
  const podId = id!;
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { session } = useAuth();
  const theme = useTheme();

  const pod = usePod(podId);
  const season = useSeason(seasonId!);
  const games = useGames(podId);
  const { stats } = usePlayerStats(podId, seasonId);

  const renameSeason = useRenameSeason(podId);
  const deleteSeason = useDeleteSeason(podId);

  const isOwner = pod.data?.owner_id === session?.user.id;

  const [renaming, setRenaming] = useState(false);
  const [renameError, setRenameError] = useState<string | null>(null);

  const seasonGames = useMemo(
    () => gamesInSeason(games.data ?? [], seasonId!),
    [games.data, seasonId],
  );

  const totalWins = stats.reduce((sum, s) => sum + s.wins, 0);

  async function handleRename(name: string) {
    setRenameError(null);
    try {
      await renameSeason.mutateAsync({ seasonId: seasonId!, name });
      setRenaming(false);
    } catch (e) {
      setRenameError(e instanceof Error ? e.message : 'Could not rename the season.');
    }
  }

  async function confirmDelete() {
    const ok = await confirmAsync({
      title: 'Delete season',
      message:
        'This removes the season. Its games stay in the pod’s log but stop counting towards a season.',
      confirmLabel: 'Delete',
      destructive: true,
    });
    if (!ok) return;
    try {
      await deleteSeason.mutateAsync(seasonId!);
      router.back();
    } catch {
      // Owner-only at RLS; failures are rare — leave the user on-screen.
    }
  }

  if (pod.isLoading || season.isLoading || games.isLoading) {
    return <View style={styles.flex}><Loading label="Loading season…" /></View>;
  }

  if (season.isError || !season.data) {
    return (
      <View style={styles.flex}>
        <Stack.Screen options={{ title: 'Season' }} />
        <ErrorState message={(season.error as Error)?.message ?? 'Season not found.'} />
      </View>
    );
  }

  const mutedColor = { color: theme.colors.onSurfaceVariant };

  return (
    <View style={styles.flex}>
      <Stack.Screen options={{ title: season.data.name }} />

      <FlatList
        data={seasonGames}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshing={games.isRefetching}
        onRefresh={() => games.refetch()}
        ListHeaderComponent={
          <View style={styles.headerArea}>
            <Card style={styles.card}>
              <SectionLabel>Standings</SectionLabel>
              <Text variant="bodySmall" style={mutedColor}>
                {seasonGames.length} game{seasonGames.length === 1 ? '' : 's'} in this
                season{totalWins > 0 ? `, ${totalWins} win${totalWins === 1 ? '' : 's'} recorded` : ''}
              </Text>
            </Card>

            {stats.length > 0 ? (
              <View style={styles.standings}>
                {stats.map((stat, i) => (
                  <StatRow key={stat.player_id} stat={stat} rank={i + 1} />
                ))}
              </View>
            ) : null}

            {seasonGames.length > 0 ? <SectionLabel>Games</SectionLabel> : null}
          </View>
        }
        ListEmptyComponent={
          <EmptyState
            title="No games in this season"
            subtitle={
              isOwner
                ? 'Pick this season while logging a game — or open an older game and assign it — and its wins land here.'
                : 'No games have been filed under this season yet.'
            }
          />
        }
        renderItem={({ item }) => (
          <SeasonGameRow
            game={item}
            onPress={
              isOwner
                ? () =>
                    router.push({
                      pathname: '/pod/[id]/add-game',
                      params: { id: podId, gameId: item.id },
                    })
                : undefined
            }
          />
        )}
        ListFooterComponent={
          isOwner ? (
            <View style={styles.footerArea}>
              <Button
                label="Rename season"
                variant="secondary"
                onPress={() => setRenaming(true)}
              />
              <Button label="Delete season" variant="danger" onPress={confirmDelete} />
            </View>
          ) : null
        }
      />

      <PromptModal
        visible={renaming}
        title="Rename season"
        label="Season name"
        placeholder="Season name"
        initialValue={season.data.name}
        submitLabel="Save"
        submitting={renameSeason.isPending}
        error={renameError}
        onSubmit={handleRename}
        onClose={() => {
          setRenaming(false);
          setRenameError(null);
        }}
      />

      <View style={{ paddingBottom: insets.bottom }} />
    </View>
  );
}

// One game in the season: the date, then its players with the winners in gold.
function SeasonGameRow({
  game,
  onPress,
}: {
  game: GameWithPlayers;
  onPress?: () => void;
}) {
  const theme = useTheme();
  const participants = [...game.game_players].sort((a, b) => {
    if (a.is_winner !== b.is_winner) return a.is_winner ? -1 : 1;
    return (a.players?.name ?? '').localeCompare(b.players?.name ?? '');
  });

  return (
    <Card onPress={onPress} style={styles.gameRow}>
      <Text style={styles.gameDate}>{formatDateHeading(game.played_at)}</Text>
      <View style={styles.participants}>
        {participants.map((gp) => {
          const cmd = commanderLabel(gp.commander, gp.partner_commander);
          return (
            <View key={gp.id} style={styles.participantRow}>
              <View style={styles.participantNameRow}>
                {gp.is_winner && <Icon source="crown" size={14} color={colors.winner} />}
                <Text
                  variant="bodyMedium"
                  style={[styles.participantName, gp.is_winner && styles.winnerName]}
                  numberOfLines={1}
                >
                  {gp.players?.name ?? 'Unknown'}
                </Text>
              </View>
              {cmd ? (
                <Text
                  variant="bodySmall"
                  style={[styles.commander, { color: theme.colors.onSurfaceVariant }]}
                  numberOfLines={1}
                >
                  {cmd}
                </Text>
              ) : null}
            </View>
          );
        })}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  list: { padding: spacing.lg, gap: spacing.md, flexGrow: 1 },
  headerArea: { gap: spacing.md },
  card: { gap: spacing.xs },
  standings: { gap: spacing.md },
  gameRow: { gap: spacing.sm },
  gameDate: {
    fontFamily: fonts.mono,
    fontSize: 11,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    color: colors.textMuted,
  },
  participants: { gap: spacing.xs },
  participantRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.md,
  },
  participantNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flexShrink: 1,
  },
  participantName: { flexShrink: 1 },
  winnerName: { color: colors.winner, fontFamily: fonts.semibold },
  commander: { flexShrink: 1, textAlign: 'right' },
  footerArea: { marginTop: spacing.lg, gap: spacing.md },
});
