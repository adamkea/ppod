import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from './Button';
import { CommanderSearch } from './CommanderSearch';
import { colors, fontSize, radius, spacing } from '@/theme';
import {
  useAddPlayerCommander,
  useDeletePlayerCommander,
  usePlayerCommanders,
} from '@/hooks/usePlayerCommanders';
import type { Player, PlayerCommander } from '@/types/database';

// Fetch the art_crop image URI for a single card name from Scryfall.
async function fetchCardArt(name: string): Promise<string | null> {
  try {
    const res = await fetch(
      `https://api.scryfall.com/cards/named?fuzzy=${encodeURIComponent(name)}`,
    );
    if (!res.ok) return null;
    const json = await res.json();
    return (json.image_uris?.art_crop as string) ?? null;
  } catch {
    return null;
  }
}

function useCardArt(name: string) {
  const [uri, setUri] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    fetchCardArt(name).then((url) => {
      if (!cancelled) setUri(url);
    });
    return () => { cancelled = true; };
  }, [name]);
  return uri;
}

interface Props {
  player: Player | null;
  onClose: () => void;
}

export function PlayerProfileModal({ player, onClose }: Props) {
  const visible = player !== null;
  const playerId = player?.id ?? '';
  const insets = useSafeAreaInsets();

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
    <Modal visible={visible} animationType="slide" onRequestClose={handleClose}>
      <KeyboardAvoidingView
        style={[styles.screen, { paddingTop: insets.top }]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title} numberOfLines={1}>{player?.name}</Text>
          <Pressable onPress={handleClose} hitSlop={8} style={styles.doneBtn}>
            <Text style={styles.doneBtnText}>Done</Text>
          </Pressable>
        </View>

        {/* Scrollable body */}
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: insets.bottom + spacing.xl },
          ]}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.sectionLabel}>Commanders</Text>

          {commanders.isLoading ? (
            <ActivityIndicator color={colors.primary} style={{ marginVertical: spacing.md }} />
          ) : commanders.data?.length === 0 ? (
            <Text style={styles.empty}>No commanders saved yet.</Text>
          ) : (
            <View style={styles.commanderList}>
              {commanders.data?.map((c) => (
                <CommanderRow
                  key={c.id}
                  item={c}
                  onDelete={() => deleteCommander.mutate(c.id)}
                  deleting={deleteCommander.isPending}
                />
              ))}
            </View>
          )}

          <View style={styles.divider} />

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
        </ScrollView>
      </KeyboardAvoidingView>
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
  const mainArt = useCardArt(item.commander);
  const partnerArt = useCardArt(item.partner_commander ?? '');

  const hasPartner = !!item.partner_commander;

  return (
    <View style={rowStyles.card}>
      {/* Art thumbnail(s) */}
      <View style={rowStyles.artWrap}>
        <ArtThumbnail uri={mainArt} size={hasPartner ? 'small' : 'large'} />
        {hasPartner && <ArtThumbnail uri={partnerArt} size="small" />}
      </View>

      {/* Name(s) */}
      <View style={rowStyles.nameWrap}>
        <Text style={rowStyles.commanderName} numberOfLines={2}>
          {item.commander}
        </Text>
        {hasPartner && (
          <Text style={rowStyles.partnerName} numberOfLines={2}>
            + {item.partner_commander}
          </Text>
        )}
      </View>

      {/* Remove */}
      <Pressable onPress={onDelete} disabled={deleting} hitSlop={8} style={rowStyles.removeBtn}>
        <Text style={rowStyles.removeText}>✕</Text>
      </Pressable>
    </View>
  );
}

function ArtThumbnail({ uri, size }: { uri: string | null; size: 'small' | 'large' }) {
  const w = size === 'large' ? 120 : 85;
  const h = size === 'large' ? 88 : 62;

  return (
    <View style={[thumbStyles.frame, { width: w, height: h }]}>
      {uri ? (
        <Image source={{ uri }} style={thumbStyles.img} resizeMode="cover" />
      ) : (
        <View style={thumbStyles.placeholder}>
          <Text style={thumbStyles.placeholderText}>🃏</Text>
        </View>
      )}
    </View>
  );
}

const thumbStyles = StyleSheet.create({
  frame: {
    borderRadius: radius.sm,
    overflow: 'hidden',
    backgroundColor: colors.surfaceAlt,
  },
  img: { width: '100%', height: '100%' },
  placeholder: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  placeholderText: { fontSize: 20 },
});

const rowStyles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm,
    gap: spacing.md,
  },
  artWrap: {
    flexDirection: 'column',
    gap: 3,
  },
  nameWrap: { flex: 1, gap: 2 },
  commanderName: {
    color: colors.text,
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  partnerName: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
  },
  removeBtn: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  removeText: {
    color: colors.danger,
    fontSize: fontSize.md,
    fontWeight: '700',
  },
});

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.bg,
  },
  title: {
    color: colors.text,
    fontSize: fontSize.xl,
    fontWeight: '700',
    flex: 1,
    marginRight: spacing.md,
  },
  doneBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  doneBtnText: {
    color: colors.primary,
    fontSize: fontSize.md,
    fontWeight: '700',
  },
  scrollContent: {
    padding: spacing.lg,
    gap: spacing.lg,
  },
  sectionLabel: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  commanderList: { gap: spacing.sm },
  empty: { color: colors.textMuted, fontSize: fontSize.sm },
  divider: {
    height: 1,
    backgroundColor: colors.border,
  },
  addSection: { gap: spacing.sm },
  searchRow: { zIndex: 10 },
  addPartner: { color: colors.primary, fontSize: fontSize.sm, fontWeight: '600' },
  error: { color: colors.danger, fontSize: fontSize.sm },
});
