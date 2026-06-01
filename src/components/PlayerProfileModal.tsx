import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Button } from './Button';
import { CommanderSearch } from './CommanderSearch';
import { colors, fontSize, radius, spacing } from '@/theme';
import {
  useAddPlayerCommander,
  useDeletePlayerCommander,
  usePlayerCommanders,
} from '@/hooks/usePlayerCommanders';
import type { Player, PlayerCommander } from '@/types/database';
import { commanderLabel } from '@/lib/stats';

interface Props {
  player: Player | null;
  onClose: () => void;
}

export function PlayerProfileModal({ player, onClose }: Props) {
  const visible = player !== null;
  const playerId = player?.id ?? '';

  const commanders = usePlayerCommanders(playerId);
  const addCommander = useAddPlayerCommander(playerId);
  const deleteCommander = useDeletePlayerCommander(playerId);

  const [newCommander, setNewCommander] = useState('');
  const [newPartner, setNewPartner] = useState('');
  const [showPartner, setShowPartner] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  function resetAddForm() {
    setNewCommander('');
    setNewPartner('');
    setShowPartner(false);
    setAddError(null);
  }

  async function handleAdd() {
    if (!newCommander.trim()) return;
    setAddError(null);
    try {
      await addCommander.mutateAsync({
        commander: newCommander.trim(),
        partnerCommander: showPartner ? newPartner.trim() : undefined,
      });
      resetAddForm();
    } catch (e) {
      setAddError(e instanceof Error ? e.message : 'Could not save commander.');
    }
  }

  function handleClose() {
    resetAddForm();
    onClose();
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <Pressable style={styles.backdrop} onPress={handleClose}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.sheetWrapper}
        >
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.handle} />
            <Text style={styles.title}>{player?.name}</Text>
            <Text style={styles.sectionLabel}>Commanders</Text>

            <ScrollView
              style={styles.list}
              contentContainerStyle={styles.listContent}
              keyboardShouldPersistTaps="handled"
            >
              {commanders.isLoading ? (
                <ActivityIndicator color={colors.primary} />
              ) : commanders.data?.length === 0 ? (
                <Text style={styles.empty}>No commanders saved yet.</Text>
              ) : (
                commanders.data?.map((c) => (
                  <CommanderRow
                    key={c.id}
                    item={c}
                    onDelete={() => deleteCommander.mutate(c.id)}
                    deleting={deleteCommander.isPending}
                  />
                ))
              )}
            </ScrollView>

            <View style={styles.addSection}>
              <Text style={styles.sectionLabel}>Add commander</Text>
              <View style={styles.searchRow}>
                <CommanderSearch
                  value={newCommander}
                  onChange={setNewCommander}
                  placeholder="Commander name"
                />
              </View>
              {showPartner ? (
                <View style={styles.searchRow}>
                  <CommanderSearch
                    value={newPartner}
                    onChange={setNewPartner}
                    placeholder="Partner commander"
                  />
                </View>
              ) : (
                <Pressable onPress={() => setShowPartner(true)} hitSlop={6}>
                  <Text style={styles.addPartner}>＋ Add partner</Text>
                </Pressable>
              )}
              {addError ? <Text style={styles.error}>{addError}</Text> : null}
              <Button
                label="Save commander"
                onPress={handleAdd}
                disabled={!newCommander.trim()}
                loading={addCommander.isPending}
              />
            </View>

            <Button label="Done" variant="secondary" onPress={handleClose} />
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
}

function CommanderRow({
  item,
  onDelete,
  deleting,
}: {
  item: PlayerCommander;
  onDelete: () => void;
  deleting: boolean;
}) {
  return (
    <View style={styles.commanderRow}>
      <Text style={styles.commanderName} numberOfLines={1}>
        {commanderLabel(item.commander, item.partner_commander)}
      </Text>
      <Pressable onPress={onDelete} disabled={deleting} hitSlop={8}>
        <Text style={styles.removeText}>Remove</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  sheetWrapper: { justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.md,
    maxHeight: '85%',
  },
  handle: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.border,
    marginBottom: spacing.xs,
  },
  title: {
    color: colors.text,
    fontSize: fontSize.xl,
    fontWeight: '700',
  },
  sectionLabel: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  list: { maxHeight: 160 },
  listContent: { gap: spacing.sm },
  empty: { color: colors.textMuted, fontSize: fontSize.sm },
  commanderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  commanderName: { color: colors.text, fontSize: fontSize.md, flex: 1, marginRight: spacing.md },
  removeText: { color: colors.danger, fontSize: fontSize.sm, fontWeight: '600' },
  addSection: { gap: spacing.sm },
  searchRow: { zIndex: 10 },
  addPartner: { color: colors.primary, fontSize: fontSize.sm, fontWeight: '600' },
  error: { color: colors.danger, fontSize: fontSize.sm },
});
