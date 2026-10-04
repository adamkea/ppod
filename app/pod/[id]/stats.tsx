import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { FlatList, ScrollView, StyleSheet, View } from 'react-native';
import { Chip, SegmentedButtons } from 'react-native-paper';

import { CommanderStatArt } from '@/components/CommanderStatArt';
import { StatRow } from '@/components/StatRow';
import { EmptyState, ErrorState, Loading, SectionLabel } from '@/components/ui';
import { usePod } from '@/hooks/usePods';
import { useSeasons } from '@/hooks/useSeasons';
import { usePlayerStats } from '@/hooks/useStats';
import { colors, spacing } from '@/theme';
import type { PlayerStat } from '@/types/database';

interface Row {
  key: string;
  stat: Pick<PlayerStat, 'name' | 'games_played' | 'wins'>;
  detail?: string;
  art?: React.ReactNode;
}

export default function StatsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const podId = id!;

  // null = all time; otherwise wins are counted over that season's games only.
  const [seasonId, setSeasonId] = useState<string | null>(null);
  const [view, setView] = useState<'players' | 'commanders'>('players');

  const pod = usePod(podId);
  const seasonsEnabled = pod.data?.seasons_enabled ?? false;
  const seasons = useSeasons(podId, seasonsEnabled);
  // A pod that turns seasons off falls back to the all-time table.
  const activeSeasonId = seasonsEnabled ? seasonId : null;
  const { stats, commanderStats, isLoading, isError } = usePlayerStats(podId, activeSeasonId);

  if (isLoading) return <View style={styles.flex}><Loading label="Crunching stats…" /></View>;
  if (isError) return <View style={styles.flex}><ErrorState /></View>;

  const seasonList = seasonsEnabled ? seasons.data ?? [] : [];
  const activeSeason = seasonList.find((s) => s.id === activeSeasonId) ?? null;
  const hasGames = stats.some((s) => s.games_played > 0);
  const byCommander = view === 'commanders';

  // Commander rows are titled by the commander, with the pilot underneath.
  const rows: Row[] = byCommander
    ? commanderStats.map((c) => ({
        key: c.key,
        stat: { name: c.commander, games_played: c.games_played, wins: c.wins },
        detail: c.player_name,
        art: (
          <CommanderStatArt
            commander={c.commander_name}
            partner={c.partner_name}
            commanderScryfallId={c.commander_scryfall_id}
            partnerScryfallId={c.partner_scryfall_id}
          />
        ),
      }))
    : stats.map((s) => ({ key: s.player_id, stat: s }));

  const label = byCommander
    ? activeSeason
      ? `Commander wins in ${activeSeason.name}`
      : 'Wins per commander'
    : activeSeason
      ? `Wins in ${activeSeason.name}`
      : 'Wins per player';

  return (
    <View style={styles.flex}>
      <FlatList
        data={rows}
        keyExtractor={(item) => item.key}
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
              <SegmentedButtons
                value={view}
                onValueChange={(v) => setView(v as 'players' | 'commanders')}
                buttons={[
                  { value: 'players', label: 'Players', icon: 'account' },
                  { value: 'commanders', label: 'Commanders', icon: 'cards' },
                ]}
              />
            ) : null}
            {rows.length > 0 ? <SectionLabel>{label}</SectionLabel> : null}
          </View>
        }
        ListEmptyComponent={
          byCommander && hasGames ? (
            <EmptyState
              title="No commander wins yet"
              subtitle="Commanders show up here once they've won a game. Pick a commander for each player when you log games."
            />
          ) : (
            <EmptyState
              title={activeSeason ? 'No games in this season' : 'No stats yet'}
              subtitle={
                activeSeason
                  ? 'Assign games to this season when you log them and the standings will fill in.'
                  : 'Log a few games and the leaderboard will fill in.'
              }
            />
          )
        }
        renderItem={({ item, index }) => (
          <StatRow stat={item.stat} rank={index + 1} detail={item.detail} art={item.art} />
        )}
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
