import { Image, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import {
  ActivityIndicator,
  Icon,
  IconButton,
  Surface,
  Text,
  TouchableRipple,
  useTheme,
} from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useArtworks, useCommanderArt } from '@/hooks/useCardArt';
import type { ScryfallArt } from '@/lib/scryfall';
import { radius, spacing } from '@/theme';

interface Props {
  /** The commander name to list artworks for; null keeps the picker closed. */
  commanderName: string | null;
  /** Currently pinned print id, to mark the active artwork. */
  selectedId?: string | null;
  onSelect: (art: ScryfallArt) => void;
  onClose: () => void;
}

// A gallery of every distinct artwork for a commander. Tapping one pins it.
export function CommanderArtPicker({ commanderName, selectedId, onSelect, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const visible = !!commanderName;
  const arts = useArtworks(commanderName ?? '', visible);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={[styles.backdrop, { backgroundColor: theme.colors.backdrop }]}>
        <Surface
          mode="flat"
          elevation={3}
          style={[styles.sheet, { paddingBottom: insets.bottom + spacing.lg }]}
        >
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text variant="titleLarge">Choose art</Text>
              <Text
                variant="bodySmall"
                style={{ color: theme.colors.onSurfaceVariant }}
                numberOfLines={1}
              >
                {commanderName}
              </Text>
            </View>
            <IconButton icon="close" onPress={onClose} />
          </View>

          {arts.isLoading ? (
            <ActivityIndicator style={{ marginVertical: spacing.xl }} />
          ) : !arts.data || arts.data.length === 0 ? (
            <Text variant="bodyMedium" style={[styles.empty, { color: theme.colors.onSurfaceVariant }]}>
              No artwork found for this commander.
            </Text>
          ) : (
            <ScrollView contentContainerStyle={styles.grid} keyboardShouldPersistTaps="handled">
              {arts.data.map((art) => {
                const active = art.id === selectedId;
                return (
                  <Pressable
                    key={art.id}
                    style={[
                      styles.item,
                      { borderColor: active ? theme.colors.primary : theme.colors.outlineVariant },
                      { backgroundColor: theme.colors.surfaceVariant },
                    ]}
                    onPress={() => onSelect(art)}
                  >
                    {art.artCrop ? (
                      <Image source={{ uri: art.artCrop }} style={styles.art} resizeMode="cover" />
                    ) : (
                      <View style={[styles.art, styles.placeholder]}>
                        <Icon source="cards-outline" size={28} />
                      </View>
                    )}
                    <Text variant="labelMedium" style={styles.set} numberOfLines={1}>
                      {art.setName}
                    </Text>
                    <Text
                      variant="bodySmall"
                      style={[styles.artist, { color: theme.colors.onSurfaceVariant }]}
                      numberOfLines={1}
                    >
                      {art.artist}
                    </Text>
                    {active && (
                      <View style={styles.check}>
                        <Icon source="check-circle" size={22} color={theme.colors.primary} />
                      </View>
                    )}
                  </Pressable>
                );
              })}
            </ScrollView>
          )}
        </Surface>
      </View>
    </Modal>
  );
}

// A compact "Choose art" affordance: a thumbnail preview of the currently
// pinned art (by id, falling back to the name's default) plus a tap target that
// opens the picker. Hidden until a commander name exists.
export function ArtChooserRow({
  name,
  scryfallId,
  onPress,
}: {
  name: string;
  scryfallId: string | null;
  onPress: () => void;
}) {
  const theme = useTheme();
  const art = useCommanderArt(name, scryfallId);
  if (!name.trim()) return null;
  return (
    <TouchableRipple onPress={onPress} style={chooserStyles.row}>
      <View style={chooserStyles.rowInner}>
        {art.data ? (
          <Image source={{ uri: art.data }} style={chooserStyles.thumb} resizeMode="cover" />
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
          {scryfallId ? 'Custom art ✓' : 'Choose art (optional)'}
        </Text>
        <Icon source="chevron-right" size={20} color={theme.colors.onSurfaceVariant} />
      </View>
    </TouchableRipple>
  );
}

const chooserStyles = StyleSheet.create({
  row: {
    borderRadius: radius.sm,
  },
  rowInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  thumb: { width: 40, height: 30, borderRadius: radius.sm },
  thumbPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  label: { flex: 1 },
});

const ITEM_WIDTH = 150;

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    maxHeight: '85%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  empty: { marginVertical: spacing.xl },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    justifyContent: 'space-between',
    paddingBottom: spacing.lg,
  },
  item: {
    width: ITEM_WIDTH,
    borderRadius: radius.md,
    borderWidth: 2,
    overflow: 'hidden',
    padding: spacing.xs,
  },
  art: {
    width: '100%',
    height: 100,
    borderRadius: radius.sm,
  },
  placeholder: { alignItems: 'center', justifyContent: 'center' },
  set: {
    marginTop: spacing.xs,
    paddingHorizontal: spacing.xs,
  },
  artist: {
    paddingHorizontal: spacing.xs,
    paddingBottom: spacing.xs,
  },
  check: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
  },
});
