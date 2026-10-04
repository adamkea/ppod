import { StyleSheet, View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';

import { Card } from '@/components/ui';
import { colors, fonts, spacing } from '@/theme';

// The fields a leaderboard line needs — a PlayerStat fits as-is.
interface StatRowStat {
  name: string;
  games_played: number;
  wins: number;
}

/**
 * One line of a wins leaderboard: rank, name, games and win rate, and the win
 * count in the gold scorekeeping numeral. Shared so a season's standings read
 * exactly like the pod's all-time table. `detail` is an optional line under
 * the name — the pilot, on the per-commander table — and `art` an optional
 * picture between the rank and the name.
 */
export function StatRow({
  stat,
  rank,
  detail,
  art,
}: {
  stat: StatRowStat;
  rank: number;
  detail?: string;
  art?: React.ReactNode;
}) {
  const theme = useTheme();
  const winRate =
    stat.games_played > 0 ? Math.round((stat.wins / stat.games_played) * 100) : 0;

  return (
    <Card style={styles.row}>
      <Text style={styles.rank}>{rank}</Text>
      {art}
      <View style={styles.rowMain}>
        <Text variant="titleMedium">{stat.name}</Text>
        {detail ? (
          <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
            {detail}
          </Text>
        ) : null}
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
