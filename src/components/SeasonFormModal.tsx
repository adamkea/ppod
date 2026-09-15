import { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { Chip, HelperText, Surface, Text, useTheme } from 'react-native-paper';

import { Button } from './Button';
import { TextField } from './TextField';
import { SectionLabel } from './ui';
import type { SeasonInput } from '@/api/seasons';
import { colors, radius, spacing } from '@/theme';
import type { SeasonFormat } from '@/types/database';

interface Props {
  visible: boolean;
  title: string;
  initial?: Partial<SeasonInput>;
  submitLabel?: string;
  submitting?: boolean;
  /** Rejections from the server, shown under the form. */
  error?: string | null;
  onSubmit: (input: SeasonInput) => void;
  onClose: () => void;
}

const formats: { value: SeasonFormat; label: string }[] = [
  { value: 'open', label: 'Open-ended' },
  { value: 'first_to', label: 'First to X wins' },
  { value: 'best_of', label: 'Best of X games' },
];

// What each format promises, in the pod's words. The sudden-death line matters
// most: a pod picking "best of" needs to know a level table doesn't end it.
const blurbs: Record<SeasonFormat, string> = {
  open: 'Log as many games as you like. The season runs until you stop it.',
  first_to:
    'The first player to reach that many wins takes the season, and it closes to new games.',
  best_of:
    'The season runs that many games and the most wins takes it — early, if nobody can catch the leader. Level at the finish and it goes to sudden death: keep playing until someone leads outright.',
};

const targetLabels: Record<SeasonFormat, string> = {
  open: '',
  first_to: 'Wins to take the season',
  best_of: 'Games in the season',
};

/**
 * The new/edit season sheet: name, how the season ends, and the finish line.
 * Both screens use it — the difference is only what it's seeded with.
 */
export function SeasonFormModal({
  visible,
  title,
  initial,
  submitLabel = 'Save',
  submitting = false,
  error,
  onSubmit,
  onClose,
}: Props) {
  const theme = useTheme();
  const [name, setName] = useState('');
  const [format, setFormat] = useState<SeasonFormat>('open');
  const [target, setTarget] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  // Reseed each time the sheet opens, so a cancelled edit leaves nothing behind.
  useEffect(() => {
    if (!visible) return;
    setName(initial?.name ?? '');
    setFormat(initial?.format ?? 'open');
    setTarget(initial?.target ? String(initial.target) : '');
    setLocalError(null);
  }, [visible, initial?.name, initial?.format, initial?.target]);

  function handleSubmit() {
    setLocalError(null);
    const trimmed = name.trim();
    if (!trimmed) {
      setLocalError('Give the season a name.');
      return;
    }

    if (format === 'open') {
      onSubmit({ name: trimmed, format, target: null });
      return;
    }

    const n = Number.parseInt(target.trim(), 10);
    if (!Number.isFinite(n) || n < 1 || n > 999) {
      setLocalError(
        format === 'first_to'
          ? 'How many wins takes the season? Enter a number from 1 to 999.'
          : 'How many games does the season run? Enter a number from 1 to 999.',
      );
      return;
    }

    onSubmit({ name: trimmed, format, target: n });
  }

  const message = localError ?? error ?? null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable
        style={[styles.backdrop, { backgroundColor: theme.colors.backdrop }]}
        onPress={onClose}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboardArea}
        >
          <Pressable onPress={(e) => e.stopPropagation()} style={styles.sheetWrap}>
            <Surface mode="flat" elevation={3} style={styles.sheet}>
              <ScrollView
                style={styles.scroll}
                contentContainerStyle={styles.body}
                keyboardShouldPersistTaps="handled"
              >
                <Text variant="titleLarge">{title}</Text>

                <TextField
                  label="Season name"
                  value={name}
                  onChangeText={setName}
                  placeholder="e.g. Summer 2026"
                  autoFocus
                  returnKeyType="next"
                />

                <View style={styles.formatArea}>
                  <SectionLabel>How it ends</SectionLabel>
                  <View style={styles.formatChips}>
                    {formats.map((f) => (
                      <Chip
                        key={f.value}
                        mode={format === f.value ? 'flat' : 'outlined'}
                        selected={format === f.value}
                        showSelectedCheck={false}
                        onPress={() => setFormat(f.value)}
                      >
                        {f.label}
                      </Chip>
                    ))}
                  </View>
                  <Text
                    variant="bodySmall"
                    style={{ color: theme.colors.onSurfaceVariant }}
                  >
                    {blurbs[format]}
                  </Text>
                </View>

                {format !== 'open' ? (
                  <TextField
                    label={targetLabels[format]}
                    value={target}
                    onChangeText={(text) => setTarget(text.replace(/[^0-9]/g, ''))}
                    keyboardType="number-pad"
                    placeholder={format === 'first_to' ? '10' : '7'}
                    returnKeyType="done"
                    onSubmitEditing={handleSubmit}
                  />
                ) : null}

                {message ? (
                  <HelperText type="error" visible style={styles.error}>
                    {message}
                  </HelperText>
                ) : null}

                <View style={styles.actions}>
                  <Button
                    label="Cancel"
                    variant="secondary"
                    onPress={onClose}
                    style={styles.action}
                  />
                  <Button
                    label={submitLabel}
                    onPress={handleSubmit}
                    disabled={!name.trim()}
                    loading={submitting}
                    style={styles.action}
                  />
                </View>
              </ScrollView>
            </Surface>
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, padding: spacing.lg },
  // The keyboard area owns the full height left by the backdrop's padding, so
  // the cap below is a share of the screen rather than of the sheet's own
  // content — a percentage measured against an auto-height parent clamps the
  // sheet to a fraction of itself and makes even a short form scroll.
  keyboardArea: { flex: 1, justifyContent: 'center' },
  sheetWrap: { maxHeight: '100%' },
  sheet: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    // Sized by its content, shrinking only when the form genuinely outgrows
    // the screen — with the keyboard up on a small phone, say.
    flexShrink: 1,
    overflow: 'hidden',
  },
  scroll: { flexGrow: 0, flexShrink: 1 },
  body: { padding: spacing.lg, gap: spacing.md },
  formatArea: { gap: spacing.sm },
  formatChips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  error: { paddingHorizontal: 0 },
  actions: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.xs },
  action: { flex: 1 },
});
