import { useState } from 'react';
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
import { SetSearch, type SelectedSet } from '@/components/SetSearch';
import { TextField } from '@/components/TextField';
import { SectionLabel } from '@/components/ui';
import { colors, fonts, spacing } from '@/theme';
import type { Player } from '@/types/database';

export interface SeriesFormValues {
  name: string;
  set: SelectedSet | null;
  playerIds: string[];
  targetGames: number | null;
}

interface Props {
  /** The pod's players, in the order the roster chips should appear. */
  players: Player[];
  initial?: Partial<SeriesFormValues>;
  /**
   * Roster players that can't be dropped because they already have games in
   * the series — removing them would orphan those results.
   */
  lockedPlayerIds?: string[];
  submitLabel: string;
  submitting?: boolean;
  /** Rejections surface as the form's error message. */
  onSubmit: (values: SeriesFormValues) => Promise<unknown>;
}

/**
 * The shared new/edit series form: set, name, roster, target games. Both
 * screens are otherwise identical, so the difference between them is only
 * what they seed it with and what they do on submit.
 */
export function SeriesForm({
  players,
  initial,
  lockedPlayerIds = [],
  submitLabel,
  submitting = false,
  onSubmit,
}: Props) {
  const insets = useSafeAreaInsets();
  const theme = useTheme();

  const [name, setName] = useState(initial?.name ?? '');
  const [set, setSet] = useState<SelectedSet | null>(initial?.set ?? null);
  // The name we last filled in from a set, so picking a different set can
  // replace it while a name the user typed themselves is left alone.
  const [autoName, setAutoName] = useState('');
  const [selected, setSelected] = useState<Record<string, boolean>>(() =>
    Object.fromEntries((initial?.playerIds ?? []).map((id) => [id, true])),
  );
  const [target, setTarget] = useState(
    initial?.targetGames ? String(initial.targetGames) : '',
  );
  const [error, setError] = useState<string | null>(null);

  const locked = new Set(lockedPlayerIds);
  const selectedIds = players.filter((p) => selected[p.id]).map((p) => p.id);

  function toggle(playerId: string) {
    if (locked.has(playerId)) return;
    setSelected((prev) => ({ ...prev, [playerId]: !prev[playerId] }));
  }

  function handleSetChange(next: SelectedSet | null) {
    setSet(next);
    // A series is usually just "the set we're playing", so seed the name from
    // it — unless the name already says something the user chose.
    if (!name.trim() || name === autoName) {
      setName(next?.name ?? '');
      setAutoName(next?.name ?? '');
    }
  }

  async function handleSubmit() {
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
      await onSubmit({ name, set, playerIds: selectedIds, targetGames });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save the series.');
    }
  }

  const mutedColor = { color: theme.colors.onSurfaceVariant };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.setWrap}>
          <SetSearch value={set} onChange={handleSetChange} />
          <Text variant="bodySmall" style={mutedColor}>
            The set you’re playing. Its symbol shows beside the series everywhere
            it’s listed.
          </Text>
        </View>

        <TextField
          label="Name (optional)"
          value={name}
          onChangeText={setName}
          placeholder="e.g. Bloomburrow draft"
        />

        <View style={styles.pickerWrap}>
          <View style={styles.sectionRow}>
            <SectionLabel>Players</SectionLabel>
            <Text style={styles.sectionCount}>{selectedIds.length} in series</Text>
          </View>
          <Text variant="bodySmall" style={mutedColor}>
            Everyone in the draft. Each game is 1 v 1 between two of them.
          </Text>
          <View style={styles.chipRow}>
            {players.map((p) => {
              const active = !!selected[p.id];
              return (
                <Chip
                  key={p.id}
                  mode={active ? 'flat' : 'outlined'}
                  selected={active}
                  showSelectedCheck
                  disabled={locked.has(p.id)}
                  onPress={() => toggle(p.id)}
                  style={styles.chip}
                >
                  {p.name}
                </Chip>
              );
            })}
          </View>
          {lockedPlayerIds.length > 0 ? (
            <Text variant="bodySmall" style={mutedColor}>
              Players with games already logged can’t be removed — delete their
              games first.
            </Text>
          ) : null}
        </View>

        <TextField
          label="Target games (optional)"
          value={target}
          onChangeText={setTarget}
          placeholder="e.g. 10"
          keyboardType="number-pad"
        />
        <Text variant="bodySmall" style={mutedColor}>
          A soft goal for tracking progress. The series stays open either way.
        </Text>

        {error ? (
          <Text variant="bodySmall" style={{ color: theme.colors.error }}>
            {error}
          </Text>
        ) : null}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}>
        <Button label={submitLabel} onPress={handleSubmit} loading={submitting} />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxl },
  setWrap: { gap: spacing.xs },
  pickerWrap: { gap: spacing.sm },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  sectionCount: {
    fontFamily: fonts.mono,
    fontSize: 12,
    color: colors.textMuted,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: { maxWidth: 220 },
  footer: {
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.bg,
  },
});
