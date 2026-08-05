import { useLocalSearchParams } from 'expo-router';
import { FlatList, StyleSheet, View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';

import { Card, EmptyState, ErrorState, Loading, SectionLabel } from '@/components/ui';
import { usePlayerStats } from '@/hooks/useStats';
import { colors, fonts, spacing } from '@/theme';
import type { PlayerStat } from '@/types/database';

export default function StatsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const podId = id!;
  const { stats, isLoading, isError } = usePlayerStats(podId);

  if (isLoading) return <View style={styles.flex}><Loading label="Crunching stats…" /></View>;
  if (isError) return <View style={styles.flex}><ErrorState /></View>;

  const hasGames = stats.some((s) => s.games_played > 0);

  return (
    <View style={styles.flex}>
      <FlatList
        data={stats}
        keyExtractor={(item) => item.player_id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          hasGames ? <SectionLabel>Wins per player</SectionLabel> : null
        }
        ListEmptyComponent={
          <EmptyState
            title="No stats yet"
            subtitle="Log a few games and the leaderboard will fill in."
          />
        }
        renderItem={({ item, index }) => <StatRow stat={item} rank={index + 1} />}
      />
    </View>
  );
}

function StatRow({ stat, rank }: { stat: PlayerStat; rank: number }) {
  const theme = useTheme();
  const winRate =
    stat.games_played > 0
      ? Math.round((stat.wins / stat.games_played) * 100)
      : 0;

  return (
    <Card style={styles.row}>
      <Text style={styles.rank}>{rank}</Text>
      <View style={styles.rowMain}>
        <Text variant="titleMedium">{stat.name}</Text>
        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
          {stat.games_played} {stat.games_played === 1 ? 'game' : 'games'}
          {stat.games_played > 0 ? `, ${winRate}% win rate` : ''}
        </Text>
      </View>
      <View style={styles.winsBox}>
        <Text style={styles.wins}>{stat.wins}</Text>
        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
          {stat.wins === 1 ? 'win' : 'wins'}
        </Text>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  list: { padding: spacing.lg, gap: spacing.md, flexGrow: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  rank: {
    fontFamily: fonts.mono,
    fontSize: 14,
    color: colors.textMuted,
    width: 26,
    textAlign: 'center',
  },
  rowMain: { flex: 1, gap: 2 },
  winsBox: { alignItems: 'center', minWidth: 48 },
  wins: {
    fontFamily: fonts.monoBold,
    fontSize: 24,
    lineHeight: 30,
    color: colors.winner,
  },
});
