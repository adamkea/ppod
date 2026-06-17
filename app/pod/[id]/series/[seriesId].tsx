import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { Card, EmptyState, ErrorState, Loading } from '@/components/ui';
import { usePlayers } from '@/hooks/usePlayers';
import { usePod } from '@/hooks/usePods';
import {
  useDeleteSeries,
  useDeleteSeriesGame,
  useLogSeriesGame,
  useSeries,
  useSeriesGames,
} from '@/hooks/useSeries';
import { formatDateHeading, todayISO } from '@/lib/dates';
import { computeSeriesRecord } from '@/lib/series';
import { useAuth } from '@/providers/AuthProvider';
import { colors, fontSize, radius, spacing } from '@/theme';
import type { SeriesGame } from '@/types/database';

export default function SeriesDetailScreen() {
  const { id, seriesId } = useLocalSearchParams<{ id: string; seriesId: string }>();
  const podId = id!;
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { session } = useAuth();

  const pod = usePod(podId);
  const players = usePlayers(podId);
  const series = useSeries(seriesId!);
  const games = useSeriesGames(seriesId!);

  const logGame = useLogSeriesGame(podId, seriesId!);
  const deleteGame = useDeleteSeriesGame(podId, seriesId!);
  const deleteSeries = useDeleteSeries(podId);

  const isOwner = pod.data?.owner_id === session?.user.id;

  const nameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of players.data ?? []) map.set(p.id, p.name);
    return map;
  }, [players.data]);

  const loading = pod.isLoading || players.isLoading || series.isLoading;

  if (loading) {
    return <View style={styles.flex}><Loading label="Loading series…" /></View>;
  }

  if (series.isError || !series.data) {
    return (
      <View style={styles.flex}>
        <Stack.Screen options={{ title: 'Series' }} />
        <ErrorState message={(series.error as Error)?.message ?? 'Series not found.'} />
      </View>
    );
  }

  const s = series.data;
  const oneName = nameById.get(s.player_one_id) ?? 'Player one';
  const twoName = nameById.get(s.player_two_id) ?? 'Player two';
  const record = computeSeriesRecord(s, games.data ?? []);

  const oneLeads = record.oneWins > record.twoWins;
  const twoLeads = record.twoWins > record.oneWins;

  function logWinner(winnerPlayerId: string | null) {
    logGame.mutate({ winnerPlayerId, playedAt: todayISO(), note: '' });
  }

  function confirmDeleteGame(game: SeriesGame) {
    Alert.alert('Remove game', 'Remove this game from the series?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => deleteGame.mutate(game.id),
      },
    ]);
  }

  function confirmDeleteSeries() {
    Alert.alert(
      'Delete series',
      'This permanently removes the series and all its games. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteSeries.mutateAsync(s.id);
              router.back();
            } catch {
              // Errors here are rare (owner-only at RLS); leave the user on-screen.
            }
          },
        },
      ],
    );
  }

  return (
    <View style={styles.flex}>
      <Stack.Screen options={{ title: s.name || 'Series' }} />

      <FlatList
        data={games.data ?? []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshing={games.isRefetching}
        onRefresh={() => games.refetch()}
        ListHeaderComponent={
          <View style={styles.headerArea}>
            <Card style={styles.scoreCard}>
              {s.name ? <Text style={styles.seriesName}>{s.name}</Text> : null}
              <View style={styles.scoreRow}>
                <Text style={[styles.side, oneLeads && styles.sideLead]} numberOfLines={1}>
                  {oneName}
                </Text>
                <Text style={styles.score}>
                  {record.oneWins} – {record.twoWins}
                </Text>
                <Text
                  style={[styles.side, styles.sideRight, twoLeads && styles.sideLead]}
                  numberOfLines={1}
                >
                  {twoName}
                </Text>
              </View>
              <Text style={styles.meta}>
                {record.played} {record.played === 1 ? 'game' : 'games'} played
                {s.target_games ? ` of ${s.target_games}` : ''}
                {record.draws
                  ? ` · ${record.draws} draw${record.draws === 1 ? '' : 's'}`
                  : ''}
              </Text>
            </Card>

            {isOwner ? (
              <View style={styles.logArea}>
                <Text style={styles.logLabel}>Log a game</Text>
                <View style={styles.logButtons}>
                  <Button
                    label={`${oneName} won`}
                    onPress={() => logWinner(s.player_one_id)}
                    style={styles.logButton}
                  />
                  <Button
                    label={`${twoName} won`}
                    onPress={() => logWinner(s.player_two_id)}
                    style={styles.logButton}
                  />
                </View>
                <Button label="Draw" variant="secondary" onPress={() => logWinner(null)} />
              </View>
            ) : null}

            <Text style={styles.sectionTitle}>
              {record.played > 0 ? 'Games' : ''}
            </Text>
          </View>
        }
        ListEmptyComponent={
          <EmptyState
            title="No games yet"
            subtitle={
              isOwner
                ? 'Tap who won above to log the first game.'
                : 'No games have been logged in this series yet.'
            }
          />
        }
        renderItem={({ item, index }) => {
          const total = games.data?.length ?? 0;
          // Newest first; number them so #1 is the earliest game.
          const gameNumber = total - index;
          const winnerName =
            item.winner_player_id === null
              ? 'Draw'
              : nameById.get(item.winner_player_id) ?? 'Unknown';
          const isDraw = item.winner_player_id === null;
          return (
            <Pressable
              onPress={isOwner ? () => confirmDeleteGame(item) : undefined}
              disabled={!isOwner}
            >
              {({ pressed }) => (
                <Card style={[styles.gameRow, pressed && isOwner && styles.pressed]}>
                  <Text style={styles.gameNumber}>#{gameNumber}</Text>
                  <View style={styles.gameMain}>
                    <Text
                      style={[styles.winnerName, isDraw && styles.drawName]}
                      numberOfLines={1}
                    >
                      {isDraw ? '🤝 Draw' : `👑 ${winnerName}`}
                    </Text>
                    {item.note ? (
                      <Text style={styles.gameNote} numberOfLines={2}>
                        {item.note}
                      </Text>
                    ) : null}
                  </View>
                  <Text style={styles.gameDate}>{formatDateHeading(item.played_at)}</Text>
                </Card>
              )}
            </Pressable>
          );
        }}
        ListFooterComponent={
          isOwner ? (
            <View style={styles.footerArea}>
              <Button
                label="Delete series"
                variant="danger"
                onPress={confirmDeleteSeries}
              />
            </View>
          ) : null
        }
      />

      <View style={{ paddingBottom: insets.bottom }} />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  list: { padding: spacing.lg, gap: spacing.md, flexGrow: 1 },
  headerArea: { gap: spacing.lg, marginBottom: spacing.xs },
  scoreCard: { gap: spacing.sm, alignItems: 'stretch' },
  seriesName: { color: colors.text, fontSize: fontSize.md, fontWeight: '700' },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  side: { flex: 1, color: colors.textMuted, fontSize: fontSize.md, fontWeight: '600' },
  sideRight: { textAlign: 'right' },
  sideLead: { color: colors.text },
  score: {
    color: colors.text,
    fontSize: fontSize.xxl,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  meta: { color: colors.textMuted, fontSize: fontSize.sm },
  logArea: { gap: spacing.sm },
  logLabel: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  logButtons: { flexDirection: 'row', gap: spacing.md },
  logButton: { flex: 1 },
  sectionTitle: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  gameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  pressed: { opacity: 0.7 },
  gameNumber: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    fontWeight: '700',
    width: 32,
  },
  gameMain: { flex: 1, gap: 2 },
  winnerName: { color: colors.winner, fontSize: fontSize.md, fontWeight: '700' },
  drawName: { color: colors.textMuted },
  gameNote: { color: colors.textMuted, fontSize: fontSize.sm, fontStyle: 'italic' },
  gameDate: { color: colors.textMuted, fontSize: fontSize.sm },
  footerArea: { marginTop: spacing.lg },
});
