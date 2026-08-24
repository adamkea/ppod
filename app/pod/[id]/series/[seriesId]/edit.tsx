import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { SeriesForm, type SeriesFormValues } from '@/components/SeriesForm';
import { EmptyState, ErrorState, Loading } from '@/components/ui';
import { usePlayers } from '@/hooks/usePlayers';
import { usePod } from '@/hooks/usePods';
import {
  useSeries,
  useSeriesGames,
  useSeriesPlayers,
  useUpdateSeries,
} from '@/hooks/useSeries';
import { useAuth } from '@/providers/AuthProvider';
import { colors } from '@/theme';

export default function EditSeriesScreen() {
  const { id, seriesId } = useLocalSearchParams<{ id: string; seriesId: string }>();
  const podId = id!;
  const router = useRouter();
  const { session } = useAuth();

  const pod = usePod(podId);
  const players = usePlayers(podId);
  const series = useSeries(seriesId!);
  const roster = useSeriesPlayers(seriesId!);
  const games = useSeriesGames(seriesId!);
  const updateSeries = useUpdateSeries(podId, seriesId!);

  const isOwner = pod.data?.owner_id === session?.user.id;

  const orderedPlayers = useMemo(
    () => [...(players.data ?? [])].sort((a, b) => a.name.localeCompare(b.name)),
    [players.data],
  );

  // Anyone who has already played a game in the series stays on the roster:
  // dropping them would leave their results pointing at a non-member.
  const lockedPlayerIds = useMemo(() => {
    const played = new Set<string>();
    for (const g of games.data ?? []) {
      played.add(g.player_one_id);
      played.add(g.player_two_id);
    }
    return [...played];
  }, [games.data]);

  async function handleSubmit(values: SeriesFormValues) {
    await updateSeries.mutateAsync({
      name: values.name,
      playerIds: values.playerIds,
      targetGames: values.targetGames,
      set: values.set && {
        code: values.set.code,
        name: values.set.name,
        iconUri: values.set.iconUri,
      },
    });
    router.back();
  }

  const loading =
    pod.isLoading ||
    players.isLoading ||
    series.isLoading ||
    roster.isLoading ||
    games.isLoading;

  if (loading) {
    return <View style={styles.flex}><Loading label="Loading series…" /></View>;
  }

  if (series.isError || !series.data) {
    return (
      <View style={styles.flex}>
        <Stack.Screen options={{ title: 'Edit Series' }} />
        <ErrorState message={(series.error as Error)?.message ?? 'Series not found.'} />
      </View>
    );
  }

  if (!isOwner) {
    return (
      <View style={styles.flex}>
        <Stack.Screen options={{ title: 'Edit Series' }} />
        <EmptyState title="View only" subtitle="Only the pod owner can edit a series." />
      </View>
    );
  }

  const s = series.data;

  return (
    <>
      <Stack.Screen options={{ title: 'Edit Series' }} />
      <SeriesForm
        players={orderedPlayers}
        initial={{
          name: s.name ?? '',
          set: s.set_code
            ? { code: s.set_code, name: s.set_name ?? s.set_code, iconUri: s.set_icon_uri }
            : null,
          playerIds: (roster.data ?? []).map((r) => r.player_id),
          targetGames: s.target_games,
        }}
        lockedPlayerIds={lockedPlayerIds}
        submitLabel="Save changes"
        submitting={updateSeries.isPending}
        onSubmit={handleSubmit}
      />
    </>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
});
