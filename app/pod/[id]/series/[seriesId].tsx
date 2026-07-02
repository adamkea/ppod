import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { Chip, Divider, Text, useTheme } from 'react-native-paper';
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
  useSeriesPlayers,
} from '@/hooks/useSeries';
import { confirmAsync } from '@/lib/confirm';
import { formatDateHeading, todayISO } from '@/lib/dates';
import { computeStandings } from '@/lib/series';
import { useAuth } from '@/providers/AuthProvider';
import { colors, spacing } from '@/theme';
import type { SeriesGame } from '@/types/database';

export default function SeriesDetailScreen() {
  const { id, seriesId } = useLocalSearchParams<{ id: string; seriesId: string }>();
  const podId = id!;
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { session } = useAuth();
  const theme = useTheme();

  const pod = usePod(podId);
  const players = usePlayers(podId);
  const series = useSeries(seriesId!);
  const roster = useSeriesPlayers(seriesId!);
  const games = useSeriesGames(seriesId!);

  const logGame = useLogSeriesGame(podId, seriesId!);
  const deleteGame = useDeleteSeriesGame(podId, seriesId!);
  const deleteSeries = useDeleteSeries(podId);

  const isOwner = pod.data?.owner_id === session?.user.id;

  const [oneId, setOneId] = useState<string | null>(null);
  const [twoId, setTwoId] = useState<string | null>(null);

  const nameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of players.data ?? []) map.set(p.id, p.name);
    return map;
  }, [players.data]);

  const nameOf = (pid: string | null) =>
    pid ? nameById.get(pid) ?? 'Unknown' : '';

  const rosterIds = useMemo(
    () =>
      [...(roster.data ?? [])]
        .map((r) => r.player_id)
        .sort((a, b) => nameOf(a).localeCompare(nameOf(b))),
    [roster.data, nameById],
  );

  const loading =
    pod.isLoading || players.isLoading || series.isLoading || roster.isLoading;

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
  const allGames = games.data ?? [];
  const standings = computeStandings(rosterIds, allGames);

  function selectOne(pid: string) {
    setOneId((cur) => (cur === pid ? null : pid));
    setTwoId((cur) => (cur === pid ? null : cur));
  }
  function selectTwo(pid: string) {
    setTwoId((cur) => (cur === pid ? null : pid));
    setOneId((cur) => (cur === pid ? null : cur));
  }

  function log(winnerPlayerId: string | null) {
    if (!oneId || !twoId) return;
    logGame.mutate(
      { playerOneId: oneId, playerTwoId: twoId, winnerPlayerId, playedAt: todayISO(), note: '' },
      {
        onSuccess: () => {
          setOneId(null);
          setTwoId(null);
        },
      },
    );
  }

  async function confirmDeleteGame(game: SeriesGame) {
    const ok = await confirmAsync({
      title: 'Remove game',
      message: 'Remove this game from the series?',
      confirmLabel: 'Remove',
      destructive: true,
    });
    if (ok) deleteGame.mutate(game.id);
  }

  async function confirmDeleteSeries() {
    const ok = await confirmAsync({
      title: 'Delete series',
      message: 'This permanently removes the series and all its games. Continue?',
      confirmLabel: 'Delete',
      destructive: true,
    });
    if (!ok) return;
    try {
      await deleteSeries.mutateAsync(s.id);
      router.back();
    } catch {
      // Owner-only at RLS; failures are rare — leave the user on-screen.
    }
  }

  const bothPicked = !!oneId && !!twoId;
  const mutedColor = { color: theme.colors.onSurfaceVariant };

  return (
    <View style={styles.flex}>
      <Stack.Screen options={{ title: s.name || 'Series' }} />

      <FlatList
        data={allGames}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshing={games.isRefetching}
        onRefresh={() => games.refetch()}
        ListHeaderComponent={
          <View style={styles.headerArea}>
            {/* Standings */}
            <Card style={styles.card}>
              <Text variant="labelLarge" style={[styles.cardTitle, mutedColor]}>
                Standings
              </Text>
              <View style={styles.standingsHead}>
                <Text variant="labelMedium" style={[styles.colName, mutedColor]}>
                  Player
                </Text>
                <Text variant="labelMedium" style={[styles.colNum, mutedColor]}>W</Text>
                <Text variant="labelMedium" style={[styles.colNum, mutedColor]}>L</Text>
                <Text variant="labelMedium" style={[styles.colNum, mutedColor]}>D</Text>
                <Text variant="labelMedium" style={[styles.colNum, mutedColor]}>GP</Text>
              </View>
              <Divider />
              {standings.map((st, i) => (
                <View key={st.playerId} style={styles.standingsRow}>
                  <Text variant="bodyMedium" style={styles.colName} numberOfLines={1}>
                    {i === 0 && st.wins > 0 ? '👑 ' : ''}
                    {nameOf(st.playerId)}
                  </Text>
                  <Text variant="bodyMedium" style={[styles.colNum, styles.winNum]}>
                    {st.wins}
                  </Text>
                  <Text variant="bodyMedium" style={[styles.colNum, mutedColor]}>
                    {st.losses}
                  </Text>
                  <Text variant="bodyMedium" style={[styles.colNum, mutedColor]}>
                    {st.draws}
                  </Text>
                  <Text variant="bodyMedium" style={[styles.colNum, mutedColor]}>
                    {st.played}
                  </Text>
                </View>
              ))}
              <Text variant="bodySmall" style={[styles.meta, mutedColor]}>
                {allGames.length} game{allGames.length === 1 ? '' : 's'} played
                {s.target_games ? ` of ${s.target_games}` : ''}
              </Text>
            </Card>

            {/* Log a game */}
            {isOwner ? (
              <Card style={styles.card}>
                <Text variant="labelLarge" style={[styles.cardTitle, mutedColor]}>
                  Log a game
                </Text>
                <PickerRow
                  label="Player one"
                  rosterIds={rosterIds}
                  nameOf={nameOf}
                  selectedId={oneId}
                  disabledId={twoId}
                  onSelect={selectOne}
                />
                <PickerRow
                  label="Player two"
                  rosterIds={rosterIds}
                  nameOf={nameOf}
                  selectedId={twoId}
                  disabledId={oneId}
                  onSelect={selectTwo}
                />
                {bothPicked ? (
                  <View style={styles.winnerArea}>
                    <Text variant="labelLarge" style={mutedColor}>
                      Who won?
                    </Text>
                    <View style={styles.winnerButtons}>
                      <Button
                        label={`${nameOf(oneId)} won`}
                        onPress={() => log(oneId)}
                        style={styles.winnerButton}
                      />
                      <Button
                        label={`${nameOf(twoId)} won`}
                        onPress={() => log(twoId)}
                        style={styles.winnerButton}
                      />
                    </View>
                    <Button label="Draw" variant="secondary" onPress={() => log(null)} />
                  </View>
                ) : (
                  <Text variant="bodySmall" style={mutedColor}>
                    Pick the two players in this 1 v 1 game.
                  </Text>
                )}
              </Card>
            ) : null}

            {allGames.length > 0 ? (
              <Text variant="labelLarge" style={[styles.sectionTitle, mutedColor]}>
                Games
              </Text>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          <EmptyState
            title="No games yet"
            subtitle={
              isOwner
                ? 'Pick two players above and tap who won to log the first game.'
                : 'No games have been logged in this series yet.'
            }
          />
        }
        renderItem={({ item, index }) => {
          const total = allGames.length;
          const gameNumber = total - index; // newest first; #1 = earliest
          const isDraw = item.winner_player_id === null;
          const oneWon = item.winner_player_id === item.player_one_id;
          const twoWon = item.winner_player_id === item.player_two_id;
          return (
            <Card
              onPress={isOwner ? () => confirmDeleteGame(item) : undefined}
              style={styles.gameRow}
            >
              <Text variant="labelMedium" style={[styles.gameNumber, mutedColor]}>
                #{gameNumber}
              </Text>
              <View style={styles.gameMain}>
                <Text variant="bodyMedium" style={mutedColor} numberOfLines={1}>
                  <Text variant="bodyMedium" style={oneWon ? styles.winnerText : mutedColor}>
                    {oneWon ? '👑 ' : ''}{nameOf(item.player_one_id)}
                  </Text>
                  <Text variant="bodySmall" style={mutedColor}>  vs  </Text>
                  <Text variant="bodyMedium" style={twoWon ? styles.winnerText : mutedColor}>
                    {twoWon ? '👑 ' : ''}{nameOf(item.player_two_id)}
                  </Text>
                </Text>
                {isDraw ? (
                  <Text variant="bodySmall" style={mutedColor}>
                    🤝 Draw
                  </Text>
                ) : null}
                {item.note ? (
                  <Text variant="bodySmall" style={[styles.gameNote, mutedColor]} numberOfLines={2}>
                    {item.note}
                  </Text>
                ) : null}
              </View>
              <Text variant="bodySmall" style={mutedColor}>
                {formatDateHeading(item.played_at)}
              </Text>
            </Card>
          );
        }}
        ListFooterComponent={
          isOwner ? (
            <View style={styles.footerArea}>
              <Button label="Delete series" variant="danger" onPress={confirmDeleteSeries} />
            </View>
          ) : null
        }
      />

      <View style={{ paddingBottom: insets.bottom }} />
    </View>
  );
}

function PickerRow({
  label,
  rosterIds,
  nameOf,
  selectedId,
  disabledId,
  onSelect,
}: {
  label: string;
  rosterIds: string[];
  nameOf: (pid: string) => string;
  selectedId: string | null;
  disabledId: string | null;
  onSelect: (pid: string) => void;
}) {
  const theme = useTheme();
  return (
    <View style={styles.pickerRow}>
      <Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant }}>
        {label}
      </Text>
      <View style={styles.chipRow}>
        {rosterIds.map((pid) => {
          const active = pid === selectedId;
          const disabled = pid === disabledId;
          return (
            <Chip
              key={pid}
              mode={active ? 'flat' : 'outlined'}
              selected={active}
              showSelectedCheck
              disabled={disabled}
              onPress={() => onSelect(pid)}
              style={styles.chip}
            >
              {nameOf(pid)}
            </Chip>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  list: { padding: spacing.lg, gap: spacing.md, flexGrow: 1 },
  headerArea: { gap: spacing.lg, marginBottom: spacing.xs },
  card: { gap: spacing.sm },
  cardTitle: {
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  // Standings table
  standingsHead: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: spacing.xs,
  },
  standingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  colName: { flex: 1 },
  colNum: {
    width: 34,
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
  winNum: { fontWeight: '700' },
  meta: { marginTop: spacing.xs },
  // Log a game
  pickerRow: { gap: spacing.xs },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: { maxWidth: 200 },
  winnerArea: { gap: spacing.sm, marginTop: spacing.xs },
  winnerButtons: { flexDirection: 'row', gap: spacing.md },
  winnerButton: { flex: 1 },
  sectionTitle: {
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  // Game history
  gameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  gameNumber: { width: 32 },
  gameMain: { flex: 1, gap: 2 },
  winnerText: { color: colors.winner, fontWeight: '700' },
  gameNote: { fontStyle: 'italic' },
  footerArea: { marginTop: spacing.lg },
});
