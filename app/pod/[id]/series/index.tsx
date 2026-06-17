import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { Card, EmptyState, ErrorState, Loading } from '@/components/ui';
import { usePlayers } from '@/hooks/usePlayers';
import { usePod } from '@/hooks/usePods';
import { useSeriesGames, useSeriesList } from '@/hooks/useSeries';
import { computeSeriesRecord } from '@/lib/series';
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
                  ? 'Start a series to track a head-to-head run of standard games.'
                  : 'The pod owner hasn’t started any series yet.'
              }
            />
          }
          renderItem={({ item }) => (
            <SeriesRow
              series={item}
              nameById={nameById}
              onPress={() =>
                router.push(`/pod/${podId}/series/${item.id}`)
              }
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
  const games = useSeriesGames(series.id);
  const record = computeSeriesRecord(series, games.data ?? []);

  const oneName = nameById.get(series.player_one_id) ?? 'Unknown';
  const twoName = nameById.get(series.player_two_id) ?? 'Unknown';

  const oneLeads = record.oneWins > record.twoWins;
  const twoLeads = record.twoWins > record.oneWins;

  return (
    <Pressable onPress={onPress}>
      {({ pressed }) => (
        <Card style={[styles.row, pressed && styles.pressed]}>
          {series.name ? <Text style={styles.seriesName}>{series.name}</Text> : null}
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
            {record.played} {record.played === 1 ? 'game' : 'games'}
            {series.target_games ? ` of ${series.target_games}` : ''}
            {record.draws ? ` · ${record.draws} draw${record.draws === 1 ? '' : 's'}` : ''}
          </Text>
        </Card>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  list: { padding: spacing.lg, gap: spacing.md, flexGrow: 1 },
  row: { gap: spacing.sm },
  pressed: { opacity: 0.7 },
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
    fontSize: fontSize.lg,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  meta: { color: colors.textMuted, fontSize: fontSize.sm },
  footer: {
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.bg,
  },
});
