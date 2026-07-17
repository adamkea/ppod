import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { Button as PaperButton, Checkbox, Chip, Text, useTheme } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { CommanderSearch } from '@/components/CommanderSearch';
import { DateField } from '@/components/DateField';
import { TextField } from '@/components/TextField';
import { Card, EmptyState, Loading } from '@/components/ui';
import { useDeleteGame, useGame, useLogGame, useUpdateGame } from '@/hooks/useGames';
import { usePlayers } from '@/hooks/usePlayers';
import { usePlayerCommanders } from '@/hooks/usePlayerCommanders';
import { usePod } from '@/hooks/usePods';
import { confirmAsync } from '@/lib/confirm';
import { todayISO } from '@/lib/dates';
import { useAuth } from '@/providers/AuthProvider';
import { commanderLabel } from '@/lib/stats';
import { colors, spacing } from '@/theme';
import type { ParticipantInput, PlayerCommander } from '@/types/database';

interface Entry {
  selected: boolean;
  commander: string;
  partner: string;
  showPartner: boolean;
  isWinner: boolean;
  // Pinned Scryfall print ids for chosen alternate art; null = default printing.
  commanderArtId: string | null;
  partnerArtId: string | null;
}

const emptyEntry: Entry = {
  selected: true,
  commander: '',
  partner: '',
  showPartner: false,
  isWinner: false,
  commanderArtId: null,
  partnerArtId: null,
};

export default function AddGameScreen() {
  const { id, gameId } = useLocalSearchParams<{ id: string; gameId?: string }>();
  const podId = id!;
  const isEditing = !!gameId;
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { session } = useAuth();
  const theme = useTheme();

  const pod = usePod(podId);
  const players = usePlayers(podId);
  const existingGame = useGame(gameId ?? '');

  const logGame = useLogGame(podId);
  const updateGame = useUpdateGame(podId, gameId ?? '');
  const deleteGame = useDeleteGame(podId);

  const isOwner = pod.data?.owner_id === session?.user.id;

  const [playedAt, setPlayedAt] = useState(todayISO());
  const [gameType, setGameType] = useState('commander');
  const [note, setNote] = useState('');
  const [entries, setEntries] = useState<Record<string, Entry>>({});
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
      setNote(existingGame.data.note ?? '');
      // Only the participants who were actually in the game start selected.
      for (const id of Object.keys(next)) next[id].selected = false;
      for (const gp of existingGame.data.game_players) {
        next[gp.player_id] = {
          selected: true,
          commander: gp.commander ?? '',
          partner: gp.partner_commander ?? '',
          showPartner: !!gp.partner_commander,
          isWinner: gp.is_winner,
          commanderArtId: gp.commander_scryfall_id,
          partnerArtId: gp.partner_scryfall_id,
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

  async function handleSave() {
    setError(null);
    const participants: ParticipantInput[] = orderedPlayers
      .filter((p) => entries[p.id]?.selected)
      .map((p) => {
        const e = entries[p.id];
        const hasPartner = e.showPartner && !!e.partner.trim();
        return {
          player_id: p.id,
          commander: e.commander.trim(),
          partner_commander: hasPartner ? e.partner.trim() : '',
          // Only keep pinned art when the matching name is present.
          commander_scryfall_id: e.commander.trim() ? e.commanderArtId : null,
          partner_scryfall_id: hasPartner ? e.partnerArtId : null,
          is_winner: e.isWinner,
        };
      });

    if (participants.length === 0) {
      setError('Pick at least one player.');
      return;
    }

    try {
      const noteText = note.trim();
      if (isEditing) {
        await updateGame.mutateAsync({ playedAt, gameType, note: noteText, participants });
      } else {
        await logGame.mutateAsync({ playedAt, gameType, note: noteText, participants });
      }
      router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save game.');
    }
  }

  async function confirmDelete() {
    if (!gameId) return;
    const ok = await confirmAsync({
      title: 'Delete game',
      message: 'This permanently removes the game. Continue?',
      confirmLabel: 'Delete',
      destructive: true,
    });
    if (!ok) return;
    try {
      await deleteGame.mutateAsync(gameId);
      router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not delete game.');
    }
  }

  const loading = pod.isLoading || players.isLoading || (isEditing && existingGame.isLoading);
  const saving = logGame.isPending || updateGame.isPending;

  if (loading) {
    return <View style={styles.flex}><Loading label="Loading…" /></View>;
  }

  // The database rejects writes from non-owners; this just keeps them from
  // landing on a form they can't submit (e.g. via a stale link).
  if (pod.data && !isOwner) {
    return (
      <View style={styles.flex}>
        <Stack.Screen options={{ title: isEditing ? 'Edit Game' : 'Log Game' }} />
        <EmptyState
          title="View only"
          subtitle="Only the pod owner can log or edit games."
        />
      </View>
    );
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
            <DateField value={playedAt} onChange={setPlayedAt} maximumDate={new Date()} />
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

        <Text
          variant="labelLarge"
          style={[styles.sectionTitle, { color: theme.colors.onSurfaceVariant }]}
        >
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
                    <View pointerEvents="none">
                      <Checkbox.Android status={entry.selected ? 'checked' : 'unchecked'} />
                    </View>
                    <Text variant="titleSmall" style={styles.playerName}>
                      {player.name}
                    </Text>
                  </Pressable>

                  {entry.selected ? (
                    <Chip
                      mode={entry.isWinner ? 'flat' : 'outlined'}
                      icon="crown"
                      selected={entry.isWinner}
                      onPress={() => update(player.id, { isWinner: !entry.isWinner })}
                      selectedColor={entry.isWinner ? colors.winner : undefined}
                      style={entry.isWinner ? styles.winnerChipOn : undefined}
                    >
                      {entry.isWinner ? 'Winner' : 'Mark winner'}
                    </Chip>
                  ) : null}
                </View>

                {entry.selected ? (
                  <View style={styles.commanderArea}>
                    <PlayerCommanderField
                      playerId={player.id}
                      value={entry.commander}
                      // Editing the name invalidates any art pinned to the old name.
                      onChange={(t) => update(player.id, { commander: t, commanderArtId: null })}
                      onSelectSaved={(c) =>
                        update(player.id, {
                          commander: c.commander,
                          partner: c.partner_commander ?? '',
                          showPartner: !!c.partner_commander,
                          // Carry the saved commander's chosen art over too.
                          commanderArtId: c.commander_scryfall_id,
                          partnerArtId: c.partner_scryfall_id,
                        })
                      }
                    />
                    {entry.showPartner ? (
                      <CommanderSearch
                        value={entry.partner}
                        onChange={(t) => update(player.id, { partner: t, partnerArtId: null })}
                        placeholder="Partner commander"
                      />
                    ) : (
                      <PaperButton
                        mode="text"
                        compact
                        icon="plus"
                        onPress={() => update(player.id, { showPartner: true })}
                        style={styles.addPartner}
                      >
                        Add partner
                      </PaperButton>
                    )}
                  </View>
                ) : null}
              </Card>
            );
          })}
        </View>

        <TextField
          label="Note (optional)"
          value={note}
          onChangeText={setNote}
          placeholder="Anything memorable about this game?"
          multiline
          numberOfLines={3}
          style={styles.noteInput}
        />

        {error ? (
          <Text variant="bodySmall" style={{ color: theme.colors.error }}>
            {error}
          </Text>
        ) : null}

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

// Commander input backed by the player's saved decks: they show up in the
// field's dropdown before the user types, and typing searches Scryfall.
function PlayerCommanderField({
  playerId,
  value,
  onChange,
  onSelectSaved,
}: {
  playerId: string;
  value: string;
  onChange: (text: string) => void;
  onSelectSaved: (c: PlayerCommander) => void;
}) {
  const { data } = usePlayerCommanders(playerId);
  const saved = data ?? [];

  return (
    <CommanderSearch
      value={value}
      onChange={onChange}
      placeholder="Commander (optional)"
      savedOptions={saved.map((c) => ({
        id: c.id,
        label: commanderLabel(c.commander, c.partner_commander),
      }))}
      onSelectSaved={(id) => {
        const c = saved.find((s) => s.id === id);
        if (c) onSelectSaved(c);
      }}
    />
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxl },
  metaRow: { flexDirection: 'row', gap: spacing.md },
  metaItem: { flex: 1, gap: spacing.xs },
  sectionTitle: {
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
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexShrink: 1 },
  playerName: { flexShrink: 1 },
  winnerChipOn: { backgroundColor: 'rgba(245,197,66,0.15)' },
  commanderArea: { gap: spacing.sm },
  addPartner: { alignSelf: 'flex-start' },
  noteInput: {
    minHeight: 80,
  },
  footer: {
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.bg,
  },
});
