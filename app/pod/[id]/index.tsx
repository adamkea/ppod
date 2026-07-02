import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Image, SectionList, StyleSheet, View } from 'react-native';
import { Chip, Icon, IconButton, Text, useTheme } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { PromptModal } from '@/components/PromptModal';
import { Card, EmptyState, ErrorState, Loading } from '@/components/ui';
import { useGames } from '@/hooks/useGames';
import { usePlayers } from '@/hooks/usePlayers';
import { usePod, useRenamePod } from '@/hooks/usePods';
import { usePodSeriesGames, useSeriesList } from '@/hooks/useSeries';
import { useCommanderArt } from '@/hooks/useCardArt';
import { formatDateHeading } from '@/lib/dates';
import { summarizeSeriesForFeed, type SeriesFeedSummary } from '@/lib/series';
import { commanderLabel, groupFeedByDate } from '@/lib/stats';
import { useAuth } from '@/providers/AuthProvider';
import { colors, radius, spacing } from '@/theme';
import type { GameWithPlayers } from '@/types/database';

export default function PodDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const podId = id!;
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { session } = useAuth();
  const theme = useTheme();

  const pod = usePod(podId);
  const games = useGames(podId);
  const players = usePlayers(podId);
  const seriesList = useSeriesList(podId);
  const seriesGames = usePodSeriesGames(podId);
  const renamePod = useRenamePod();

  const isOwner = pod.data?.owner_id === session?.user.id;

  const nameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of players.data ?? []) map.set(p.id, p.name);
    return map;
  }, [players.data]);

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

  const seriesSummaries = useMemo(
    () => summarizeSeriesForFeed(seriesList.data ?? [], seriesGames.data ?? []),
    [seriesList.data, seriesGames.data],
  );

  const sections = useMemo(
    () =>
      groupFeedByDate(games.data ?? [], seriesSummaries).map((s) => ({
        title: formatDateHeading(s.date),
        data: s.items,
      })),
    [games.data, seriesSummaries],
  );

  return (
    <View style={styles.flex}>
      <Stack.Screen
        options={{
          title: pod.data?.name ?? 'Pod',
          headerRight: () => (
            <View style={styles.headerButtons}>
              {isOwner && (
                <IconButton
                  icon="pencil-outline"
                  size={22}
                  onPress={() => setRenaming(true)}
                  accessibilityLabel="Rename pod"
                />
              )}
              <IconButton
                icon="trophy-outline"
                size={22}
                onPress={() => router.push(`/pod/${podId}/series`)}
                accessibilityLabel="Series"
              />
              <IconButton
                icon="chart-bar"
                size={22}
                onPress={() => router.push(`/pod/${podId}/stats`)}
                accessibilityLabel="Stats"
              />
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
          keyExtractor={(item) => item.key}
          contentContainerStyle={styles.list}
          stickySectionHeadersEnabled={false}
          refreshing={games.isRefetching || seriesGames.isRefetching || seriesList.isRefetching}
          onRefresh={() => {
            games.refetch();
            seriesList.refetch();
            seriesGames.refetch();
          }}
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
            <Text
              variant="labelLarge"
              style={[styles.sectionHeader, { color: theme.colors.onSurfaceVariant }]}
            >
              {section.title}
            </Text>
          )}
          renderItem={({ item }) =>
            item.kind === 'series' ? (
              <SeriesFeedCard
                series={item.series}
                nameById={nameById}
                onPress={() => router.push(`/pod/${podId}/series/${item.series.id}`)}
              />
            ) : (
              <GameCard
                game={item.game}
                canEdit={isOwner}
                onPress={() =>
                  router.push({
                    pathname: `/pod/${podId}/add-game`,
                    params: { gameId: item.game.id },
                  })
                }
              />
            )
          }
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
              label="Log game"
              onPress={() => router.push(`/pod/${podId}/add-game`)}
            />
            <Text variant="bodySmall" style={[styles.ownerHint, { color: theme.colors.onSurfaceVariant }]}>
              You own this pod · share code {pod.data?.invite_code}
            </Text>
          </>
        ) : pod.data ? (
          <Text variant="bodySmall" style={[styles.ownerHint, { color: theme.colors.onSurfaceVariant }]}>
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
  const theme = useTheme();
  return (
    <View style={styles.podHeader}>
      <View style={styles.inviteRow}>
        <View>
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
            Invite code
          </Text>
          <Text variant="headlineSmall" style={styles.inviteCode}>
            {inviteCode ?? '—'}
          </Text>
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
  const theme = useTheme();
  // Pinned art by print id when chosen, else the name's default printing.
  const artUri = useCommanderArt(commander, scryfallId).data ?? null;

  const accent = isWinner ? colors.success : colors.danger;

  return (
    <View style={[gridStyles.cell, { borderColor: accent, backgroundColor: theme.colors.surfaceVariant }]}>
      {artUri ? (
        <Image source={{ uri: artUri }} style={gridStyles.art} resizeMode="cover" />
      ) : (
        <View style={gridStyles.artPlaceholder}>
          <Icon source="cards-outline" size={28} />
        </View>
      )}
      <View style={[gridStyles.nameBar, { backgroundColor: accent + '33' }]}>
        {isWinner && <Icon source="crown" size={12} color={colors.winner} />}
        <Text
          variant="labelMedium"
          style={[gridStyles.playerName, { color: accent }]}
          numberOfLines={1}
        >
          {name}
        </Text>
      </View>
      {commander ? (
        <Text
          variant="bodySmall"
          style={[gridStyles.commanderText, { color: theme.colors.onSurfaceVariant }]}
          numberOfLines={1}
        >
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
  const theme = useTheme();
  const participants = [...game.game_players].sort((a, b) => {
    if (a.is_winner !== b.is_winner) return a.is_winner ? -1 : 1;
    return (a.players?.name ?? '').localeCompare(b.players?.name ?? '');
  });

  const useGrid = participants.length >= 2 && participants.length <= 4;

  return (
    <Card onPress={canEdit ? onPress : undefined} style={styles.gameCard}>
      <Text
        variant="labelMedium"
        style={[styles.gameType, { color: theme.colors.onSurfaceVariant }]}
      >
        {game.game_type}
      </Text>
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
                  variant="bodyMedium"
                  style={[styles.participantName, gp.is_winner && styles.winnerName]}
                  numberOfLines={1}
                >
                  {gp.is_winner ? '👑 ' : ''}
                  {gp.players?.name ?? 'Unknown'}
                </Text>
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
      )}
      {game.note ? (
        <Text
          variant="bodySmall"
          style={[styles.note, { color: theme.colors.onSurfaceVariant }]}
          numberOfLines={3}
        >
          {game.note}
        </Text>
      ) : null}
    </Card>
  );
}

function SeriesFeedCard({
  series,
  nameById,
  onPress,
}: {
  series: SeriesFeedSummary;
  nameById: Map<string, string>;
  onPress: () => void;
}) {
  const theme = useTheme();
  const hasGames = series.gameCount > 0;
  const leaderName = series.leaderPlayerId
    ? nameById.get(series.leaderPlayerId) ?? 'Unknown'
    : null;

  return (
    <Card onPress={onPress} style={styles.gameCard}>
      <View style={styles.seriesBadgeRow}>
        <Chip compact mode="outlined" textStyle={styles.seriesBadgeText} style={styles.seriesBadge}>
          SERIES
        </Chip>
        <Text variant="titleSmall" style={styles.seriesTitle} numberOfLines={1}>
          {series.name || 'Series'}
        </Text>
      </View>
      <View style={styles.seriesMatchup}>
        <Text
          variant="bodySmall"
          style={[styles.seriesMeta, { color: theme.colors.onSurfaceVariant }]}
        >
          {hasGames
            ? `${series.gameCount} game${series.gameCount === 1 ? '' : 's'}`
            : 'No games yet'}
        </Text>
        {leaderName ? (
          <Text variant="labelMedium" style={styles.seriesLeader} numberOfLines={1}>
            👑 {leaderName} ({series.leaderWins})
          </Text>
        ) : null}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  list: { padding: spacing.lg, gap: spacing.md, flexGrow: 1 },
  headerButtons: { flexDirection: 'row' },
  podHeader: { marginBottom: spacing.sm },
  inviteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  inviteCode: {
    fontWeight: '800',
    letterSpacing: 2,
  },
  sectionHeader: {
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: spacing.sm,
  },
  gameCard: { gap: spacing.sm },
  gameType: {
    textTransform: 'capitalize',
  },
  note: {
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
  participantName: { flexShrink: 1 },
  winnerName: { color: colors.winner, fontWeight: '700' },
  seriesBadgeRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  seriesBadge: { backgroundColor: 'transparent' },
  seriesBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginVertical: 2,
  },
  seriesTitle: { flexShrink: 1 },
  seriesMatchup: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  seriesMeta: { flexShrink: 1 },
  seriesLeader: { color: colors.winner },
  commander: {
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
  },
  nameBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xs,
    paddingTop: spacing.xs,
    gap: 3,
  },
  playerName: {
    fontWeight: '700',
    flexShrink: 1,
  },
  commanderText: {
    fontSize: 11,
    paddingHorizontal: spacing.xs,
    paddingBottom: spacing.xs,
  },
});
