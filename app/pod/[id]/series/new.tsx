import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { Chip, Text, useTheme } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { TextField } from '@/components/TextField';
import { EmptyState, Loading } from '@/components/ui';
import { usePlayers } from '@/hooks/usePlayers';
import { usePod } from '@/hooks/usePods';
import { useCreateSeries } from '@/hooks/useSeries';
import { useAuth } from '@/providers/AuthProvider';
import { colors, spacing } from '@/theme';

export default function NewSeriesScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const podId = id!;
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { session } = useAuth();
  const theme = useTheme();

  const pod = usePod(podId);
  const players = usePlayers(podId);
  const createSeries = useCreateSeries(podId);

  const isOwner = pod.data?.owner_id === session?.user.id;

  const [name, setName] = useState('');
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [target, setTarget] = useState('');
  const [error, setError] = useState<string | null>(null);

  const orderedPlayers = useMemo(
    () => [...(players.data ?? [])].sort((a, b) => a.name.localeCompare(b.name)),
    [players.data],
  );

  const selectedIds = orderedPlayers.filter((p) => selected[p.id]).map((p) => p.id);

  function toggle(playerId: string) {
    setSelected((prev) => ({ ...prev, [playerId]: !prev[playerId] }));
  }

  async function handleCreate() {
    setError(null);
    if (selectedIds.length < 2) {
      setError('Pick at least two players for the series.');
      return;
    }
    let targetGames: number | null = null;
    if (target.trim()) {
      const n = Number.parseInt(target.trim(), 10);
      if (!Number.isFinite(n) || n < 1) {
        setError('Target games must be a positive number.');
        return;
      }
      targetGames = n;
    }

    try {
      const series = await createSeries.mutateAsync({
        name,
        playerIds: selectedIds,
        targetGames,
      });
      // Replace so Back returns to the series list, not this form.
      router.replace(`/pod/${podId}/series/${series.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not create series.');
    }
  }

  const loading = pod.isLoading || players.isLoading;

  if (loading) {
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
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <Stack.Screen options={{ title: 'New Series' }} />
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <TextField
          label="Name (optional)"
          value={name}
          onChangeText={setName}
          placeholder="e.g. Bloomburrow draft"
        />

        <View style={styles.pickerWrap}>
          <Text variant="labelLarge" style={{ color: theme.colors.onSurfaceVariant }}>
            Players · {selectedIds.length} in series
          </Text>
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
            Everyone in the draft. Each game is 1 v 1 between two of them.
          </Text>
          <View style={styles.chipRow}>
            {orderedPlayers.map((p) => {
              const active = !!selected[p.id];
              return (
                <Chip
                  key={p.id}
                  mode={active ? 'flat' : 'outlined'}
                  selected={active}
                  showSelectedCheck
                  onPress={() => toggle(p.id)}
                  style={styles.chip}
                >
                  {p.name}
                </Chip>
              );
            })}
          </View>
        </View>

        <TextField
          label="Target games (optional)"
          value={target}
          onChangeText={setTarget}
          placeholder="e.g. 10"
          keyboardType="number-pad"
        />
        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
          A soft goal for tracking progress — the series stays open either way.
        </Text>

        {error ? (
          <Text variant="bodySmall" style={{ color: theme.colors.error }}>
            {error}
          </Text>
        ) : null}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}>
        <Button
          label="Create series"
          onPress={handleCreate}
          loading={createSeries.isPending}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxl },
  pickerWrap: { gap: spacing.sm },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: { maxWidth: 220 },
  footer: {
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.bg,
  },
});
