import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { TextField } from '@/components/TextField';
import { EmptyState, Loading } from '@/components/ui';
import { usePlayers } from '@/hooks/usePlayers';
import { usePod } from '@/hooks/usePods';
import { useCreateSeries } from '@/hooks/useSeries';
import { useAuth } from '@/providers/AuthProvider';
import { colors, fontSize, radius, spacing } from '@/theme';
import type { Player } from '@/types/database';

export default function NewSeriesScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const podId = id!;
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { session } = useAuth();

  const pod = usePod(podId);
  const players = usePlayers(podId);
  const createSeries = useCreateSeries(podId);

  const isOwner = pod.data?.owner_id === session?.user.id;

  const [name, setName] = useState('');
  const [playerOneId, setPlayerOneId] = useState<string | null>(null);
  const [playerTwoId, setPlayerTwoId] = useState<string | null>(null);
  const [target, setTarget] = useState('');
  const [error, setError] = useState<string | null>(null);

  const orderedPlayers = useMemo(
    () => [...(players.data ?? [])].sort((a, b) => a.name.localeCompare(b.name)),
    [players.data],
  );

  async function handleCreate() {
    setError(null);
    if (!playerOneId || !playerTwoId) {
      setError('Pick both players.');
      return;
    }
    if (playerOneId === playerTwoId) {
      setError('Pick two different players.');
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
        playerOneId,
        playerTwoId,
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
          subtitle="A series is 1 v 1. Add at least two players from the pod screen, then come back."
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

        <PlayerPicker
          label="Player one"
          players={orderedPlayers}
          selectedId={playerOneId}
          disabledId={playerTwoId}
          onSelect={setPlayerOneId}
        />
        <PlayerPicker
          label="Player two"
          players={orderedPlayers}
          selectedId={playerTwoId}
          disabledId={playerOneId}
          onSelect={setPlayerTwoId}
        />

        <TextField
          label="Target games (optional)"
          value={target}
          onChangeText={setTarget}
          placeholder="e.g. 10"
          keyboardType="number-pad"
        />
        <Text style={styles.hint}>
          A soft goal for tracking progress — the series stays open either way.
        </Text>

        {error ? <Text style={styles.error}>{error}</Text> : null}
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

function PlayerPicker({
  label,
  players,
  selectedId,
  disabledId,
  onSelect,
}: {
  label: string;
  players: Player[];
  selectedId: string | null;
  disabledId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <View style={styles.pickerWrap}>
      <Text style={styles.pickerLabel}>{label}</Text>
      <View style={styles.chipRow}>
        {players.map((p) => {
          const active = p.id === selectedId;
          const disabled = p.id === disabledId;
          return (
            <Pressable
              key={p.id}
              disabled={disabled}
              onPress={() => onSelect(p.id)}
              style={[
                styles.chip,
                active && styles.chipActive,
                disabled && styles.chipDisabled,
              ]}
              hitSlop={4}
            >
              <Text
                style={[styles.chipText, active && styles.chipTextActive]}
                numberOfLines={1}
              >
                {p.name}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxl },
  pickerWrap: { gap: spacing.sm },
  pickerLabel: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
    maxWidth: 220,
  },
  chipActive: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(124,92,255,0.15)',
  },
  chipDisabled: { opacity: 0.35 },
  chipText: { color: colors.textMuted, fontSize: fontSize.sm, fontWeight: '600' },
  chipTextActive: { color: colors.primary },
  hint: { color: colors.textMuted, fontSize: fontSize.sm, marginTop: -spacing.sm },
  error: { color: colors.danger, fontSize: fontSize.sm },
  footer: {
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.bg,
  },
});
