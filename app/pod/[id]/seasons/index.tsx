import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { Icon, Text, useTheme } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { PromptModal } from '@/components/PromptModal';
import { Card, EmptyState, ErrorState, Loading } from '@/components/ui';
import { useGames } from '@/hooks/useGames';
import { usePlayers } from '@/hooks/usePlayers';
import { usePod } from '@/hooks/usePods';
import { useCreateSeason, useSeasons } from '@/hooks/useSeasons';
import { formatDateHeading } from '@/lib/dates';
import { summarizeSeasons, type SeasonSummary } from '@/lib/seasons';
import { useAuth } from '@/providers/AuthProvider';
import { colors, fonts, spacing } from '@/theme';

export default function SeasonsListScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const podId = id!;
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { session } = useAuth();

  const pod = usePod(podId);
  const seasons = useSeasons(podId);
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

  async function handleCreate(name: string) {
    setCreateError(null);
    try {
      const season = await createSeason.mutateAsync(name);
      setCreating(false);
      router.push(`/pod/${podId}/seasons/${season.id}`);
    } catch (e) {
      setCreateError(e instanceof Error ? e.message : 'Could not create the season.');
    }
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

      <PromptModal
        visible={creating}
        title="New season"
        label="Season name"
        placeholder="e.g. Summer 2026"
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
  const { season, gameCount, lastPlayedAt, leader } = summary;

  return (
    <Card onPress={onPress} style={styles.row}>
      <Text variant="titleSmall" numberOfLines={1}>
        {season.name}
      </Text>
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
            <Icon source="crown" size={13} color={colors.winner} />
            <Text variant="labelMedium" style={styles.leader} numberOfLines={1}>
              {leader.name} ({leader.wins})
            </Text>
          </View>
        ) : null}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  list: { padding: spacing.lg, gap: spacing.md, flexGrow: 1 },
  row: { gap: spacing.xs },
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
