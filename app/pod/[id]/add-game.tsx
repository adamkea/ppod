import DateTimePicker, {
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
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
import { Card, EmptyState, Loading } from '@/components/ui';
import { useDeleteGame, useGame, useLogGame, useUpdateGame } from '@/hooks/useGames';
import { usePlayers } from '@/hooks/usePlayers';
import { usePod } from '@/hooks/usePods';
import { formatDateHeading, fromISODate, todayISO, toISODate } from '@/lib/dates';
import { useAuth } from '@/providers/AuthProvider';
import { colors, fontSize, radius, spacing } from '@/theme';
import type { ParticipantInput } from '@/types/database';

interface Entry {
  selected: boolean;
  commander: string;
  partner: string;
  showPartner: boolean;
  isWinner: boolean;
}

const emptyEntry: Entry = {
  selected: true,
  commander: '',
  partner: '',
  showPartner: false,
  isWinner: false,
};

export default function AddGameScreen() {
  const { id, gameId } = useLocalSearchParams<{ id: string; gameId?: string }>();
  const podId = id!;
  const isEditing = !!gameId;
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { session } = useAuth();

  const pod = usePod(podId);
  const players = usePlayers(podId);
  const existingGame = useGame(gameId ?? '');

  const logGame = useLogGame(podId);
  const updateGame = useUpdateGame(podId, gameId ?? '');
  const deleteGame = useDeleteGame(podId);

  const isOwner = pod.data?.owner_id === session?.user.id;

  const [playedAt, setPlayedAt] = useState(todayISO());
  const [gameType, setGameType] = useState('commander');
  const [entries, setEntries] = useState<Record<string, Entry>>({});
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Seed form state once the data it depends on has loaded.
  const initialized = useRef(false);
  useEffect(() => {
    if (initialized.current) return;
    if (!players.data) return;
    if (isEditing && !existingGame.data) return;

    const next: Record<string, Entry> = {};
    for (const player of players.data) {
      next[player.id] = { ...emptyEntry };
    }

    if (isEditing && existingGame.data) {
      setPlayedAt(existingGame.data.played_at);
      setGameType(existingGame.data.game_type);
      // Only the participants who were actually in the game start selected.
      for (const id of Object.keys(next)) next[id].selected = false;
      for (const gp of existingGame.data.game_players) {
        next[gp.player_id] = {
          selected: true,
          commander: gp.commander ?? '',
          partner: gp.partner_commander ?? '',
          showPartner: !!gp.partner_commander,
          isWinner: gp.is_winner,
        };
      }
    }

    setEntries(next);
    initialized.current = true;
  }, [players.data, existingGame.data, isEditing]);

  const orderedPlayers = useMemo(
    () => [...(players.data ?? [])].sort((a, b) => a.name.localeCompare(b.name)),
    [players.data],
  );

  const selectedCount = Object.values(entries).filter((e) => e.selected).length;

  function update(playerId: string, patch: Partial<Entry>) {
    setEntries((prev) => ({ ...prev, [playerId]: { ...prev[playerId], ...patch } }));
  }

  function onDateChange(event: DateTimePickerEvent, date?: Date) {
    if (Platform.OS === 'android') setShowDatePicker(false);
    if (event.type === 'set' && date) setPlayedAt(toISODate(date));
  }

  async function handleSave() {
    setError(null);
    const participants: ParticipantInput[] = orderedPlayers
      .filter((p) => entries[p.id]?.selected)
      .map((p) => {
        const e = entries[p.id];
        return {
          player_id: p.id,
          commander: e.commander.trim(),
          partner_commander: e.showPartner ? e.partner.trim() : '',
          is_winner: e.isWinner,
        };
      });

    if (participants.length === 0) {
      setError('Pick at least one player.');
      return;
    }

    try {
      if (isEditing) {
        await updateGame.mutateAsync({ playedAt, gameType, participants });
      } else {
        await logGame.mutateAsync({ playedAt, gameType, participants });
      }
      router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save game.');
    }
  }

  function confirmDelete() {
    if (!gameId) return;
    Alert.alert('Delete game', 'This permanently removes the game. Continue?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteGame.mutateAsync(gameId);
            router.back();
          } catch (e) {
            setError(e instanceof Error ? e.message : 'Could not delete game.');
          }
        },
      },
    ]);
  }

  const loading = players.isLoading || (isEditing && existingGame.isLoading);
  const saving = logGame.isPending || updateGame.isPending;

  if (loading) {
    return <View style={styles.flex}><Loading label="Loading…" /></View>;
  }

  if (orderedPlayers.length === 0) {
    return (
      <View style={styles.flex}>
        <Stack.Screen options={{ title: isEditing ? 'Edit Game' : 'Log Game' }} />
        <EmptyState
          title="Add players first"
          subtitle="A game needs participants. Add players from the pod screen, then come back."
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
      <Stack.Screen options={{ title: isEditing ? 'Edit Game' : 'Log Game' }} />
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {/* Date + game type */}
        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>Date</Text>
            <Pressable style={styles.dateButton} onPress={() => setShowDatePicker((v) => !v)}>
              <Text style={styles.dateText}>{formatDateHeading(playedAt)}</Text>
            </Pressable>
          </View>
          <View style={styles.metaItem}>
            <TextField
              label="Game type"
              value={gameType}
              onChangeText={setGameType}
              autoCapitalize="none"
              placeholder="commander"
            />
          </View>
        </View>

        {showDatePicker ? (
          <DateTimePicker
            value={fromISODate(playedAt)}
            mode="date"
            maximumDate={new Date()}
            display={Platform.OS === 'ios' ? 'inline' : 'default'}
            onChange={onDateChange}
            themeVariant="dark"
          />
        ) : null}

        <Text style={styles.sectionTitle}>
          Players · {selectedCount} playing
        </Text>

        <View style={styles.players}>
          {orderedPlayers.map((player) => {
            const entry = entries[player.id] ?? emptyEntry;
            return (
              <Card key={player.id} style={styles.playerCard}>
                <View style={styles.playerHead}>
                  <Pressable
                    style={styles.checkRow}
                    onPress={() =>
                      update(player.id, {
                        selected: !entry.selected,
                        // Dropping a player out also clears their winner flag.
                        isWinner: entry.selected ? false : entry.isWinner,
                      })
                    }
                    hitSlop={6}
                  >
                    <View style={[styles.checkbox, entry.selected && styles.checkboxOn]}>
                      {entry.selected ? <Text style={styles.checkMark}>✓</Text> : null}
                    </View>
                    <Text style={styles.playerName}>{player.name}</Text>
                  </Pressable>

                  {entry.selected ? (
                    <Pressable
                      onPress={() => update(player.id, { isWinner: !entry.isWinner })}
                      hitSlop={6}
                      style={[styles.winnerToggle, entry.isWinner && styles.winnerToggleOn]}
                    >
                      <Text
                        style={[styles.winnerText, entry.isWinner && styles.winnerTextOn]}
                      >
                        {entry.isWinner ? '👑 Winner' : 'Mark winner'}
                      </Text>
                    </Pressable>
                  ) : null}
                </View>

                {entry.selected ? (
                  <View style={styles.commanderArea}>
                    <TextField
                      value={entry.commander}
                      onChangeText={(t) => update(player.id, { commander: t })}
                      placeholder="Commander (optional)"
                      autoCapitalize="words"
                    />
                    {entry.showPartner ? (
                      <TextField
                        value={entry.partner}
                        onChangeText={(t) => update(player.id, { partner: t })}
                        placeholder="Partner commander"
                        autoCapitalize="words"
                      />
                    ) : (
                      <Pressable
                        onPress={() => update(player.id, { showPartner: true })}
                        hitSlop={6}
                      >
                        <Text style={styles.addPartner}>＋ Add partner</Text>
                      </Pressable>
                    )}
                  </View>
                ) : null}
              </Card>
            );
          })}
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        {isEditing && isOwner ? (
          <Button label="Delete game" variant="danger" onPress={confirmDelete} />
        ) : null}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}>
        <Button
          label={isEditing ? 'Save changes' : 'Save game'}
          onPress={handleSave}
          loading={saving}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxl },
  metaRow: { flexDirection: 'row', gap: spacing.md },
  metaItem: { flex: 1, gap: spacing.xs },
  metaLabel: { color: colors.textMuted, fontSize: fontSize.sm, fontWeight: '600' },
  dateButton: {
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    minHeight: 48,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  dateText: { color: colors.text, fontSize: fontSize.md },
  sectionTitle: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  players: { gap: spacing.md },
  playerCard: { gap: spacing.md },
  playerHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, flexShrink: 1 },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: radius.sm,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  checkMark: { color: colors.primaryText, fontWeight: '800', fontSize: 14 },
  playerName: { color: colors.text, fontSize: fontSize.md, fontWeight: '600', flexShrink: 1 },
  winnerToggle: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
  },
  winnerToggleOn: { backgroundColor: 'rgba(245,197,66,0.15)', borderColor: colors.winner },
  winnerText: { color: colors.textMuted, fontSize: fontSize.sm, fontWeight: '600' },
  winnerTextOn: { color: colors.winner },
  commanderArea: { gap: spacing.sm },
  addPartner: { color: colors.primary, fontSize: fontSize.sm, fontWeight: '600' },
  error: { color: colors.danger, fontSize: fontSize.sm },
  footer: {
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.bg,
  },
});
