import { useState } from 'react';
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
import { CommanderArtPicker } from './CommanderArtPicker';
import { colors, fontSize, radius, spacing } from '@/theme';
import { useCommanderArt } from '@/hooks/useCardArt';
import {
  useAddPlayerCommander,
  useDeletePlayerCommander,
  useUpdatePlayerCommander,
  usePlayerCommanders,
} from '@/hooks/usePlayerCommanders';
import type { ScryfallArt } from '@/lib/scryfall';
import type { Player, PlayerCommander } from '@/types/database';

// Which art the picker is currently editing: a side of the add-form, or a side
// of an already-saved commander row.
type ArtTarget =
  | { mode: 'add'; side: 'main' | 'partner'; name: string; currentId: string | null }
  | {
      mode: 'edit';
      commanderId: string;
      side: 'main' | 'partner';
      name: string;
      currentId: string | null;
    };

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
  const updateCommander = useUpdatePlayerCommander(playerId);
  const deleteCommander = useDeletePlayerCommander(playerId);

  const [newCommander, setNewCommander] = useState('');
  const [newPartner, setNewPartner] = useState('');
  const [showPartner, setShowPartner] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  // Chosen alternate art for the add-form (cleared when its name changes).
  const [mainArt, setMainArt] = useState<ScryfallArt | null>(null);
  const [partnerArt, setPartnerArt] = useState<ScryfallArt | null>(null);
  const [artTarget, setArtTarget] = useState<ArtTarget | null>(null);

  function resetAddForm() {
    setNewCommander('');
    setNewPartner('');
    setShowPartner(false);
    setAddError(null);
    setMainArt(null);
    setPartnerArt(null);
  }

  // Editing the name invalidates any art picked for it.
  function handleMainNameChange(text: string) {
    setNewCommander(text);
    setMainArt(null);
  }
  function handlePartnerNameChange(text: string) {
    setNewPartner(text);
    setPartnerArt(null);
  }

  async function handleAdd() {
    if (!newCommander.trim()) return;
    setAddError(null);
    try {
      await addCommander.mutateAsync({
        commander: newCommander.trim(),
        partnerCommander: showPartner ? newPartner.trim() : undefined,
        commanderScryfallId: mainArt?.id ?? null,
        partnerScryfallId: showPartner ? partnerArt?.id ?? null : null,
      });
      resetAddForm();
    } catch (e) {
      setAddError(e instanceof Error ? e.message : 'Could not save commander.');
    }
  }

  function handleArtSelected(art: ScryfallArt) {
    if (!artTarget) return;
    if (artTarget.mode === 'add') {
      if (artTarget.side === 'main') setMainArt(art);
      else setPartnerArt(art);
    } else {
      updateCommander.mutate({
        id: artTarget.commanderId,
        patch:
          artTarget.side === 'main'
            ? { commander_scryfall_id: art.id }
            : { partner_scryfall_id: art.id },
      });
    }
    setArtTarget(null);
  }

  function handleClose() {
    resetAddForm();
    setArtTarget(null);
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
                  onEditArt={(side) =>
                    setArtTarget({
                      mode: 'edit',
                      commanderId: c.id,
                      side,
                      name: side === 'main' ? c.commander : c.partner_commander ?? '',
                      currentId:
                        side === 'main' ? c.commander_scryfall_id : c.partner_scryfall_id,
                    })
                  }
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
                onChange={handleMainNameChange}
                placeholder="Commander name"
              />
            </View>
            <ArtChooser
              name={newCommander}
              art={mainArt}
              onPress={() =>
                setArtTarget({
                  mode: 'add',
                  side: 'main',
                  name: newCommander.trim(),
                  currentId: mainArt?.id ?? null,
                })
              }
            />
            {showPartner ? (
              <>
                <View style={styles.searchRow}>
                  <CommanderSearch
                    value={newPartner}
                    onChange={handlePartnerNameChange}
                    placeholder="Partner commander"
                  />
                </View>
                <ArtChooser
                  name={newPartner}
                  art={partnerArt}
                  onPress={() =>
                    setArtTarget({
                      mode: 'add',
                      side: 'partner',
                      name: newPartner.trim(),
                      currentId: partnerArt?.id ?? null,
                    })
                  }
                />
              </>
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

      <CommanderArtPicker
        commanderName={artTarget?.name ?? null}
        selectedId={artTarget?.currentId}
        onSelect={handleArtSelected}
        onClose={() => setArtTarget(null)}
      />
    </Modal>
  );
}

// A compact "Choose art" affordance shown under a commander name in the add
// form, previewing the picked artwork once chosen.
function ArtChooser({
  name,
  art,
  onPress,
}: {
  name: string;
  art: ScryfallArt | null;
  onPress: () => void;
}) {
  if (!name.trim()) return null;
  return (
    <Pressable style={chooserStyles.row} onPress={onPress} hitSlop={6}>
      {art?.artCrop ? (
        <Image source={{ uri: art.artCrop }} style={chooserStyles.thumb} resizeMode="cover" />
      ) : (
        <View style={[chooserStyles.thumb, chooserStyles.thumbPlaceholder]}>
          <Text style={chooserStyles.thumbIcon}>🃏</Text>
        </View>
      )}
      <Text style={chooserStyles.label}>
        {art ? `Art: ${art.setName}` : 'Choose art (optional)'}
      </Text>
      <Text style={chooserStyles.chevron}>›</Text>
    </Pressable>
  );
}

const chooserStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  thumb: { width: 40, height: 30, borderRadius: radius.sm, backgroundColor: colors.surfaceAlt },
  thumbPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  thumbIcon: { fontSize: 16 },
  label: { flex: 1, color: colors.primary, fontSize: fontSize.sm, fontWeight: '600' },
  chevron: { color: colors.textMuted, fontSize: fontSize.lg },
});

function CommanderRow({
  item,
  onDelete,
  deleting,
  onEditArt,
}: {
  item: PlayerCommander;
  onDelete: () => void;
  deleting: boolean;
  onEditArt: (side: 'main' | 'partner') => void;
}) {
  const mainArt = useCommanderArt(item.commander, item.commander_scryfall_id);
  const partnerArt = useCommanderArt(item.partner_commander, item.partner_scryfall_id);

  const hasPartner = !!item.partner_commander;

  return (
    <View style={rowStyles.card}>
      {/* Art thumbnail(s) — tap to choose alternate art */}
      <View style={rowStyles.artWrap}>
        <ArtThumbnail
          uri={mainArt.data ?? null}
          size={hasPartner ? 'small' : 'large'}
          onPress={() => onEditArt('main')}
        />
        {hasPartner && (
          <ArtThumbnail uri={partnerArt.data ?? null} size="small" onPress={() => onEditArt('partner')} />
        )}
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

function ArtThumbnail({
  uri,
  size,
  onPress,
}: {
  uri: string | null;
  size: 'small' | 'large';
  onPress?: () => void;
}) {
  const w = size === 'large' ? 120 : 85;
  const h = size === 'large' ? 88 : 62;

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={[thumbStyles.frame, { width: w, height: h }]}
    >
      {uri ? (
        <Image source={{ uri }} style={thumbStyles.img} resizeMode="cover" />
      ) : (
        <View style={thumbStyles.placeholder}>
          <Text style={thumbStyles.placeholderText}>🃏</Text>
        </View>
      )}
      {onPress ? (
        <View style={thumbStyles.editBadge}>
          <Text style={thumbStyles.editIcon}>✎</Text>
        </View>
      ) : null}
    </Pressable>
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
  editBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  editIcon: { color: '#fff', fontSize: 11 },
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
