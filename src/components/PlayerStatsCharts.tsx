import { StyleSheet, Text, View } from 'react-native';

import { colors, fontSize, radius, spacing } from '@/theme';
import type { PlayerProfileStats } from '@/lib/stats';

interface Props {
  stats: PlayerProfileStats;
}

/**
 * Lightweight, dependency-free charts for a single player's record: three
 * summary tiles, a win/loss split bar, and a horizontal bar chart of games
 * (with wins highlighted) per commander.
 */
export function PlayerStatsCharts({ stats }: Props) {
  if (stats.gamesPlayed === 0) {
    return (
      <Text style={styles.empty}>
        No games logged yet. Stats appear once this player has played a game.
      </Text>
    );
  }

  const winPct = Math.round(stats.winRate * 100);
  const maxGames = stats.byCommander.reduce((m, c) => Math.max(m, c.games), 0);

  return (
    <View style={styles.container}>
      {/* Summary tiles */}
      <View style={styles.tiles}>
        <StatTile value={String(stats.gamesPlayed)} label="Games" />
        <StatTile value={String(stats.wins)} label="Wins" highlight />
        <StatTile value={`${winPct}%`} label="Win rate" />
      </View>

      {/* Win / loss split */}
      <View style={styles.block}>
        <View style={styles.blockHeader}>
          <Text style={styles.blockTitle}>Win / loss</Text>
          <Text style={styles.blockMeta}>
            {stats.wins}W · {stats.losses}L
          </Text>
        </View>
        <View style={styles.splitTrack}>
          {stats.wins > 0 && (
            <View
              style={[
                styles.splitWins,
                { flex: stats.wins },
                stats.losses === 0 && styles.splitFullRight,
              ]}
            />
          )}
          {stats.losses > 0 && (
            <View
              style={[
                styles.splitLosses,
                { flex: stats.losses },
                stats.wins === 0 && styles.splitFullLeft,
              ]}
            />
          )}
        </View>
      </View>

      {/* Wins per commander */}
      <View style={styles.block}>
        <Text style={styles.blockTitle}>Wins per commander</Text>
        <View style={styles.commanderList}>
          {stats.byCommander.map((c) => {
            const trackPct = maxGames > 0 ? (c.games / maxGames) * 100 : 0;
            const winsPct = c.games > 0 ? (c.wins / c.games) * 100 : 0;
            return (
              <View key={c.label} style={styles.commanderRow}>
                <View style={styles.commanderHeader}>
                  <Text style={styles.commanderName} numberOfLines={1}>
                    {c.label}
                  </Text>
                  <Text style={styles.commanderMeta}>
                    {c.wins}/{c.games}
                  </Text>
                </View>
                {/* Outer width encodes games played (vs the most-played
                    commander); the gold fill encodes the share that were wins. */}
                <View style={styles.barTrack}>
                  <View style={[styles.barGames, { width: `${trackPct}%` }]}>
                    <View style={[styles.barWins, { width: `${winsPct}%` }]} />
                  </View>
                </View>
              </View>
            );
          })}
        </View>
      </View>
    </View>
  );
}

function StatTile({
  value,
  label,
  highlight,
}: {
  value: string;
  label: string;
  highlight?: boolean;
}) {
  return (
    <View style={styles.tile}>
      <Text style={[styles.tileValue, highlight && styles.tileValueHighlight]}>
        {value}
      </Text>
      <Text style={styles.tileLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.lg },
  empty: { color: colors.textMuted, fontSize: fontSize.sm },

  tiles: { flexDirection: 'row', gap: spacing.sm },
  tile: {
    flex: 1,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.md,
    alignItems: 'center',
    gap: 2,
  },
  tileValue: { color: colors.text, fontSize: fontSize.xl, fontWeight: '800' },
  tileValueHighlight: { color: colors.winner },
  tileLabel: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  block: { gap: spacing.sm },
  blockHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  blockTitle: { color: colors.text, fontSize: fontSize.md, fontWeight: '700' },
  blockMeta: { color: colors.textMuted, fontSize: fontSize.sm },

  splitTrack: {
    flexDirection: 'row',
    height: 14,
    borderRadius: radius.pill,
    overflow: 'hidden',
    backgroundColor: colors.surfaceAlt,
  },
  splitWins: { backgroundColor: colors.winner },
  splitLosses: { backgroundColor: colors.border },
  splitFullLeft: { borderTopLeftRadius: radius.pill, borderBottomLeftRadius: radius.pill },
  splitFullRight: { borderTopRightRadius: radius.pill, borderBottomRightRadius: radius.pill },

  commanderList: { gap: spacing.md },
  commanderRow: { gap: spacing.xs },
  commanderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  commanderName: { color: colors.text, fontSize: fontSize.sm, fontWeight: '600', flex: 1 },
  commanderMeta: { color: colors.textMuted, fontSize: fontSize.sm, fontWeight: '600' },
  barTrack: {
    height: 10,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceAlt,
    overflow: 'hidden',
  },
  barGames: {
    height: '100%',
    borderRadius: radius.pill,
    backgroundColor: colors.border,
    minWidth: 10,
  },
  barWins: {
    height: '100%',
    borderRadius: radius.pill,
    backgroundColor: colors.winner,
  },
});
