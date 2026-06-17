import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { Card, EmptyState, ErrorState, Loading } from '@/components/ui';
import { usePlayers } from '@/hooks/usePlayers';
import { usePod } from '@/hooks/usePods';
import { useSeriesGames, useSeriesList, useSeriesPlayers } from '@/hooks/useSeries';
import { computeStandings } from '@/lib/series';
import { useAuth } from '@/providers/AuthProvider';
import { colors, fontSize, radius, spacing } from '@/theme';
import type { Series } from '@/types/database';

export default function SeriesListScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const podId = id!;
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { session } = useAuth();

  const pod = usePod(podId);
  const players = usePlayers(podId);
  const seriesList = useSeriesList(podId);

  const isOwner = pod.data?.owner_id === session?.user.id;

  const nameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of players.data ?? []) map.set(p.id, p.name);
    return map;
  }, [players.data]);

  return (
    <View style={styles.flex}>
      <Stack.Screen options={{ title: 'Series' }} />

      {seriesList.isLoading ? (
        <Loading label="Loading series…" />
      ) : seriesList.isError ? (
        <ErrorState message={(seriesList.error as Error)?.message} />
      ) : (
        <FlatList
          data={seriesList.data ?? []}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshing={seriesList.isRefetching}
          onRefresh={() => seriesList.refetch()}
          ListEmptyComponent={
            <EmptyState
              title="No series yet"
              subtitle={
                isOwner
                  ? 'Start a series to track standard games among a group of players.'
                  : 'The pod owner hasn’t started any series yet.'
              }
            />
          }
          renderItem={({ item }) => (
            <SeriesRow
              series={item}
              nameById={nameById}
              onPress={() => router.push(`/pod/${podId}/series/${item.id}`)}
            />
          )}
        />
      )}

      {isOwner ? (
        <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}>
          <Button
            label="＋ New series"
            onPress={() => router.push(`/pod/${podId}/series/new`)}
          />
        </View>
      ) : null}
    </View>
  );
}

function SeriesRow({
  series,
  nameById,
  onPress,
}: {
  series: Series;
  nameById: Map<string, string>;
  onPress: () => void;
}) {
  const roster = useSeriesPlayers(series.id);
  const games = useSeriesGames(series.id);

  const rosterIds = (roster.data ?? []).map((r) => r.player_id);
  const standings = computeStandings(rosterIds, games.data ?? []);
  const played = games.data?.length ?? 0;
  const leader = standings[0];
  const leaderHasWins = leader && leader.wins > 0;

  const rosterNames = rosterIds
    .map((pid) => nameById.get(pid) ?? 'Unknown')
    .sort((a, b) => a.localeCompare(b))
    .join(', ');

  return (
    <Pressable onPress={onPress}>
      {({ pressed }) => (
        <Card style={[styles.row, pressed && styles.pressed]}>
          <Text style={styles.seriesName} numberOfLines={1}>
            {series.name || rosterNames || 'Series'}
          </Text>
          {series.name && rosterNames ? (
            <Text style={styles.roster} numberOfLines={1}>
              {rosterNames}
            </Text>
          ) : null}
          <View style={styles.metaRow}>
            <Text style={styles.meta}>
              {rosterIds.length} player{rosterIds.length === 1 ? '' : 's'} ·{' '}
              {played} game{played === 1 ? '' : 's'}
              {series.target_games ? ` of ${series.target_games}` : ''}
            </Text>
            {leaderHasWins ? (
              <Text style={styles.leader} numberOfLines={1}>
                👑 {nameById.get(leader.playerId) ?? 'Unknown'} ({leader.wins})
              </Text>
            ) : null}
          </View>
        </Card>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  list: { padding: spacing.lg, gap: spacing.md, flexGrow: 1 },
  row: { gap: spacing.xs },
  pressed: { opacity: 0.7 },
  seriesName: { color: colors.text, fontSize: fontSize.md, fontWeight: '700' },
  roster: { color: colors.textMuted, fontSize: fontSize.sm },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  meta: { color: colors.textMuted, fontSize: fontSize.sm, flexShrink: 1 },
  leader: { color: colors.winner, fontSize: fontSize.sm, fontWeight: '700' },
  footer: {
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.bg,
  },
});
