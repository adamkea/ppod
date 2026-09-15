import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { FlatList, ScrollView, StyleSheet, View } from 'react-native';
import { Chip } from 'react-native-paper';

import { StatRow } from '@/components/StatRow';
import { EmptyState, ErrorState, Loading, SectionLabel } from '@/components/ui';
import { usePod } from '@/hooks/usePods';
import { useSeasons } from '@/hooks/useSeasons';
import { usePlayerStats } from '@/hooks/useStats';
import { colors, spacing } from '@/theme';

export default function StatsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const podId = id!;

  // null = all time; otherwise wins are counted over that season's games only.
  const [seasonId, setSeasonId] = useState<string | null>(null);

  const pod = usePod(podId);
  const seasonsEnabled = pod.data?.seasons_enabled ?? false;
  const seasons = useSeasons(podId, seasonsEnabled);
  // A pod that turns seasons off falls back to the all-time table.
  const activeSeasonId = seasonsEnabled ? seasonId : null;
  const { stats, isLoading, isError } = usePlayerStats(podId, activeSeasonId);

  if (isLoading) return <View style={styles.flex}><Loading label="Crunching stats…" /></View>;
  if (isError) return <View style={styles.flex}><ErrorState /></View>;

  const seasonList = seasonsEnabled ? seasons.data ?? [] : [];
  const activeSeason = seasonList.find((s) => s.id === activeSeasonId) ?? null;
  const hasGames = stats.some((s) => s.games_played > 0);

  return (
    <View style={styles.flex}>
      <FlatList
        data={stats}
        keyExtractor={(item) => item.player_id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={styles.header}>
            {/* Only pods that run seasons get the filter. */}
            {seasonList.length > 0 ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.filterRow}
              >
                <Chip
                  mode={seasonId === null ? 'flat' : 'outlined'}
                  selected={seasonId === null}
                  showSelectedCheck={false}
                  onPress={() => setSeasonId(null)}
                >
                  All time
                </Chip>
                {seasonList.map((season) => (
                  <Chip
                    key={season.id}
                    mode={seasonId === season.id ? 'flat' : 'outlined'}
                    selected={seasonId === season.id}
                    showSelectedCheck={false}
                    onPress={() => setSeasonId(season.id)}
                    style={styles.chip}
                  >
                    {season.name}
                  </Chip>
                ))}
              </ScrollView>
            ) : null}
            {hasGames ? (
              <SectionLabel>
                {activeSeason ? `Wins in ${activeSeason.name}` : 'Wins per player'}
              </SectionLabel>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          <EmptyState
            title={activeSeason ? 'No games in this season' : 'No stats yet'}
            subtitle={
              activeSeason
                ? 'Assign games to this season when you log them and the standings will fill in.'
                : 'Log a few games and the leaderboard will fill in.'
            }
          />
        }
        renderItem={({ item, index }) => <StatRow stat={item} rank={index + 1} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  list: { padding: spacing.lg, gap: spacing.md, flexGrow: 1 },
  header: { gap: spacing.md },
  filterRow: { gap: spacing.sm, paddingRight: spacing.lg },
  chip: { maxWidth: 220 },
});
