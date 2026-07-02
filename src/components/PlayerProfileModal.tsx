import { useState } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import {
  ActivityIndicator,
  Appbar,
  Divider,
  HelperText,
  Icon,
  IconButton,
  Surface,
  Text,
  useTheme,
} from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from './Button';
import { CommanderSearch } from './CommanderSearch';
import { CommanderArtPicker } from './CommanderArtPicker';
import { radius, spacing } from '@/theme';
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
  readOnly?: boolean;
  onClose: () => void;
}

export function PlayerProfileModal({ player, readOnly = false, onClose }: Props) {
  const visible = player !== null;
  const playerId = player?.id ?? '';
  const insets = useSafeAreaInsets();
  const theme = useTheme();

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
        style={[styles.screen, { backgroundColor: theme.colors.background }]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Appbar.Header
          statusBarHeight={insets.top}
          mode="small"
          style={{ backgroundColor: theme.colors.background }}
        >
          <Appbar.Content title={player?.name ?? ''} />
          <Appbar.Action icon="check" onPress={handleClose} accessibilityLabel="Done" />
        </Appbar.Header>

        {/* Scrollable body */}
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: insets.bottom + spacing.xl },
          ]}
          keyboardShouldPersistTaps="handled"
        >
          <SectionLabel>Commanders</SectionLabel>

          {commanders.isLoading ? (
            <ActivityIndicator style={{ marginVertical: spacing.md }} />
          ) : commanders.data?.length === 0 ? (
            <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
              No commanders saved yet.
            </Text>
          ) : (
            <View style={styles.commanderList}>
              {commanders.data?.map((c) => (
                <CommanderRow
                  key={c.id}
                  item={c}
                  readOnly={readOnly}
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

          {readOnly ? null : (
            <>
              <Divider />

              <View style={styles.addSection}>
                <SectionLabel>Add commander</SectionLabel>
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
                  <Button
                    label="Add partner"
                    variant="ghost"
                    onPress={() => setShowPartner(true)}
                    style={styles.addPartner}
                  />
                )}
                {addError ? (
                  <HelperText type="error" visible style={styles.error}>
                    {addError}
                  </HelperText>
                ) : null}
                <Button
                  label="Save commander"
                  onPress={handleAdd}
                  disabled={!newCommander.trim()}
                  loading={addCommander.isPending}
                />
              </View>
            </>
          )}
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

function SectionLabel({ children }: { children: React.ReactNode }) {
  const theme = useTheme();
  return (
    <Text
      variant="labelLarge"
      style={[styles.sectionLabel, { color: theme.colors.onSurfaceVariant }]}
    >
      {children}
    </Text>
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
  const theme = useTheme();
  if (!name.trim()) return null;
  return (
    <Pressable style={chooserStyles.row} onPress={onPress} hitSlop={6}>
      {art?.artCrop ? (
        <Image source={{ uri: art.artCrop }} style={chooserStyles.thumb} resizeMode="cover" />
      ) : (
        <View
          style={[
            chooserStyles.thumb,
            chooserStyles.thumbPlaceholder,
            { backgroundColor: theme.colors.surfaceVariant },
          ]}
        >
          <Icon source="cards-outline" size={16} />
        </View>
      )}
      <Text variant="labelLarge" style={[chooserStyles.label, { color: theme.colors.primary }]}>
        {art ? `Art: ${art.setName}` : 'Choose art (optional)'}
      </Text>
      <Icon source="chevron-right" size={20} color={theme.colors.onSurfaceVariant} />
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
  thumb: { width: 40, height: 30, borderRadius: radius.sm },
  thumbPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  label: { flex: 1 },
});

function CommanderRow({
  item,
  readOnly,
  onDelete,
  deleting,
  onEditArt,
}: {
  item: PlayerCommander;
  readOnly: boolean;
  onDelete: () => void;
  deleting: boolean;
  onEditArt: (side: 'main' | 'partner') => void;
}) {
  const theme = useTheme();
  const mainArt = useCommanderArt(item.commander, item.commander_scryfall_id);
  const partnerArt = useCommanderArt(item.partner_commander, item.partner_scryfall_id);

  const hasPartner = !!item.partner_commander;

  return (
    <Surface mode="flat" elevation={2} style={rowStyles.card}>
      {/* Art thumbnail(s) — tap to choose alternate art */}
      <View style={rowStyles.artWrap}>
        <ArtThumbnail
          uri={mainArt.data ?? null}
          size={hasPartner ? 'small' : 'large'}
          onPress={readOnly ? undefined : () => onEditArt('main')}
        />
        {hasPartner && (
          <ArtThumbnail
            uri={partnerArt.data ?? null}
            size="small"
            onPress={readOnly ? undefined : () => onEditArt('partner')}
          />
        )}
      </View>

      {/* Name(s) */}
      <View style={rowStyles.nameWrap}>
        <Text variant="titleSmall" numberOfLines={2}>
          {item.commander}
        </Text>
        {hasPartner && (
          <Text
            variant="bodySmall"
            style={{ color: theme.colors.onSurfaceVariant }}
            numberOfLines={2}
          >
            + {item.partner_commander}
          </Text>
        )}
      </View>

      {/* Remove */}
      {readOnly ? null : (
        <IconButton
          icon="delete-outline"
          iconColor={theme.colors.error}
          size={20}
          disabled={deleting}
          onPress={onDelete}
          accessibilityLabel="Remove commander"
        />
      )}
    </Surface>
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
  const theme = useTheme();
  const w = size === 'large' ? 120 : 85;
  const h = size === 'large' ? 88 : 62;

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={[
        thumbStyles.frame,
        { width: w, height: h, backgroundColor: theme.colors.surfaceVariant },
      ]}
    >
      {uri ? (
        <Image source={{ uri }} style={thumbStyles.img} resizeMode="cover" />
      ) : (
        <View style={thumbStyles.placeholder}>
          <Icon source="cards-outline" size={20} />
        </View>
      )}
      {onPress ? (
        <View style={thumbStyles.editBadge}>
          <Icon source="pencil" size={11} color="#ffffff" />
        </View>
      ) : null}
    </Pressable>
  );
}

const thumbStyles = StyleSheet.create({
  frame: {
    borderRadius: radius.sm,
    overflow: 'hidden',
  },
  img: { width: '100%', height: '100%' },
  placeholder: { flex: 1, alignItems: 'center', justifyContent: 'center' },
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
});

const rowStyles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.md,
    padding: spacing.sm,
    gap: spacing.md,
  },
  artWrap: {
    flexDirection: 'column',
    gap: 3,
  },
  nameWrap: { flex: 1, gap: 2 },
});

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    gap: spacing.lg,
  },
  sectionLabel: {
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  commanderList: { gap: spacing.sm },
  addSection: { gap: spacing.sm },
  searchRow: { zIndex: 10 },
  addPartner: { alignSelf: 'flex-start' },
  error: { paddingHorizontal: 0 },
});
