import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { Icon, Text, useTheme } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { SeasonInput } from '@/api/seasons';
import { Button } from '@/components/Button';
import { SeasonFormModal } from '@/components/SeasonFormModal';
import { Card, EmptyState, ErrorState, Loading } from '@/components/ui';
import { useGames } from '@/hooks/useGames';
import { usePlayers } from '@/hooks/usePlayers';
import { usePod } from '@/hooks/usePods';
import { useCreateSeason, useSeasons } from '@/hooks/useSeasons';
import { formatDateHeading } from '@/lib/dates';
import {
  seasonFormatBadge,
  seasonProgressLabel,
  summarizeSeasons,
  type SeasonSummary,
} from '@/lib/seasons';
import { useAuth } from '@/providers/AuthProvider';
import { colors, fonts, radius, spacing } from '@/theme';

export default function SeasonsListScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const podId = id!;
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { session } = useAuth();

  const pod = usePod(podId);
  const seasonsEnabled = pod.data?.seasons_enabled ?? false;
  const seasons = useSeasons(podId, seasonsEnabled);
  const games = useGames(podId);
  const players = usePlayers(podId);
  const createSeason = useCreateSeason(podId);

  const isOwner = pod.data?.owner_id === session?.user.id;

  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const summaries = useMemo(
    () => summarizeSeasons(seasons.data ?? [], games.data ?? [], players.data ?? []),
    [seasons.data, games.data, players.data],
  );

  async function handleCreate(input: SeasonInput) {
    setCreateError(null);
    try {
      const season = await createSeason.mutateAsync(input);
      setCreating(false);
      router.push(`/pod/${podId}/seasons/${season.id}`);
    } catch (e) {
      setCreateError(e instanceof Error ? e.message : 'Could not create the season.');
    }
  }

  // Reachable by a stale link after the owner turns seasons off.
  if (pod.data && !seasonsEnabled) {
    return (
      <View style={styles.flex}>
        <Stack.Screen options={{ title: 'Seasons' }} />
        <EmptyState
          title="Seasons are off"
          subtitle={
            isOwner
              ? 'Turn seasons on in pod settings to file games into them.'
              : 'The pod owner has seasons turned off.'
          }
        />
      </View>
    );
  }

  return (
    <View style={styles.flex}>
      <Stack.Screen options={{ title: 'Seasons' }} />

      {seasons.isLoading ? (
        <Loading label="Loading seasons…" />
      ) : seasons.isError ? (
        <ErrorState message={(seasons.error as Error)?.message} />
      ) : (
        <FlatList
          data={summaries}
          keyExtractor={(item) => item.season.id}
          contentContainerStyle={styles.list}
          refreshing={seasons.isRefetching || games.isRefetching}
          onRefresh={() => {
            seasons.refetch();
            games.refetch();
          }}
          ListEmptyComponent={
            <EmptyState
              title="No seasons yet"
              subtitle={
                isOwner
                  ? 'Start a season, then file games into it as you log them to get a leaderboard for that run alone.'
                  : 'The pod owner hasn’t started a season yet.'
              }
            />
          }
          renderItem={({ item }) => (
            <SeasonRow
              summary={item}
              onPress={() => router.push(`/pod/${podId}/seasons/${item.season.id}`)}
            />
          )}
        />
      )}

      <SeasonFormModal
        visible={creating}
        title="New season"
        submitLabel="Create"
        submitting={createSeason.isPending}
        error={createError}
        onSubmit={handleCreate}
        onClose={() => {
          setCreating(false);
          setCreateError(null);
        }}
      />

      {isOwner ? (
        <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}>
          <Button label="New season" onPress={() => setCreating(true)} />
        </View>
      ) : null}
    </View>
  );
}

function SeasonRow({
  summary,
  onPress,
}: {
  summary: SeasonSummary;
  onPress: () => void;
}) {
  const theme = useTheme();
  const { season, gameCount, lastPlayedAt, leader, progress } = summary;
  const decided = progress.status === 'decided';

  return (
    <Card onPress={onPress} style={styles.row}>
      <View style={styles.titleRow}>
        <Text variant="titleSmall" style={styles.name} numberOfLines={1}>
          {season.name}
        </Text>
        {season.format !== 'open' ? (
          <Text style={[styles.badge, decided && styles.badgeDecided]}>
            {seasonFormatBadge(season)}
          </Text>
        ) : null}
      </View>

      <View style={styles.metaRow}>
        <Text
          variant="bodySmall"
          style={[styles.meta, { color: theme.colors.onSurfaceVariant }]}
          numberOfLines={1}
        >
          {gameCount} game{gameCount === 1 ? '' : 's'}
          {lastPlayedAt ? ` · last played ${formatDateHeading(lastPlayedAt)}` : ''}
        </Text>
        {leader ? (
          <View style={styles.leaderRow}>
            <Icon source={decided ? 'trophy' : 'crown'} size={13} color={colors.winner} />
            <Text variant="labelMedium" style={styles.leader} numberOfLines={1}>
              {leader.name} ({leader.wins})
            </Text>
          </View>
        ) : null}
      </View>

      {/* An open-ended season has no finish line to report progress against. */}
      {season.format !== 'open' ? (
        <Text
          variant="bodySmall"
          style={[
            styles.progress,
            decided
              ? styles.progressDecided
              : progress.status === 'tiebreaker'
                ? styles.progressTiebreaker
                : { color: theme.colors.onSurfaceVariant },
          ]}
          numberOfLines={1}
        >
          {decided && progress.champion
            ? `Won by ${progress.champion.name}`
            : seasonProgressLabel(season, progress)}
        </Text>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  list: { padding: spacing.lg, gap: spacing.md, flexGrow: 1 },
  row: { gap: spacing.xs },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  name: { flexShrink: 1 },
  badge: {
    fontFamily: fonts.mono,
    fontSize: 10,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: colors.textMuted,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    overflow: 'hidden',
  },
  badgeDecided: { color: colors.winner, borderColor: colors.winner },
  progress: { fontFamily: fonts.regular },
  progressDecided: { color: colors.winner },
  progressTiebreaker: { color: colors.success },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  meta: { flexShrink: 1, fontFamily: fonts.regular },
  leaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flexShrink: 1,
  },
  leader: { color: colors.winner, flexShrink: 1 },
  footer: {
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.bg,
  },
});
