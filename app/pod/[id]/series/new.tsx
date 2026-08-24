import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { SeriesForm, type SeriesFormValues } from '@/components/SeriesForm';
import { EmptyState, Loading } from '@/components/ui';
import { usePlayers } from '@/hooks/usePlayers';
import { usePod } from '@/hooks/usePods';
import { useCreateSeries } from '@/hooks/useSeries';
import { useAuth } from '@/providers/AuthProvider';
import { colors } from '@/theme';

export default function NewSeriesScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const podId = id!;
  const router = useRouter();
  const { session } = useAuth();

  const pod = usePod(podId);
  const players = usePlayers(podId);
  const createSeries = useCreateSeries(podId);

  const isOwner = pod.data?.owner_id === session?.user.id;

  const orderedPlayers = useMemo(
    () => [...(players.data ?? [])].sort((a, b) => a.name.localeCompare(b.name)),
    [players.data],
  );

  async function handleSubmit(values: SeriesFormValues) {
    const series = await createSeries.mutateAsync({
      name: values.name,
      playerIds: values.playerIds,
      targetGames: values.targetGames,
      set: values.set && {
        code: values.set.code,
        name: values.set.name,
        iconUri: values.set.iconUri,
      },
    });
    // Replace so Back returns to the series list, not this form.
    router.replace(`/pod/${podId}/series/${series.id}`);
  }

  if (pod.isLoading || players.isLoading) {
    return <View style={styles.flex}><Loading label="Loading…" /></View>;
  }

  if (pod.data && !isOwner) {
    return (
      <View style={styles.flex}>
        <Stack.Screen options={{ title: 'New Series' }} />
        <EmptyState title="View only" subtitle="Only the pod owner can start a series." />
      </View>
    );
  }

  if (orderedPlayers.length < 2) {
    return (
      <View style={styles.flex}>
        <Stack.Screen options={{ title: 'New Series' }} />
        <EmptyState
          title="Need two players"
          subtitle="Games in a series are 1 v 1. Add at least two players from the pod screen, then come back."
        />
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: 'New Series' }} />
      <SeriesForm
        players={orderedPlayers}
        submitLabel="Create series"
        submitting={createSeries.isPending}
        onSubmit={handleSubmit}
      />
    </>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
});
