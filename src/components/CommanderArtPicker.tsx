import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useArtworks } from '@/hooks/useCardArt';
import type { ScryfallArt } from '@/lib/scryfall';
import { colors, fontSize, radius, spacing } from '@/theme';

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
  const visible = !!commanderName;
  const arts = useArtworks(commanderName ?? '', visible);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={[styles.sheet, { paddingBottom: insets.bottom + spacing.lg }]}>
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>Choose art</Text>
              <Text style={styles.subtitle} numberOfLines={1}>
                {commanderName}
              </Text>
            </View>
            <Pressable onPress={onClose} hitSlop={8} style={styles.doneBtn}>
              <Text style={styles.doneBtnText}>Done</Text>
            </Pressable>
          </View>

          {arts.isLoading ? (
            <ActivityIndicator color={colors.primary} style={{ marginVertical: spacing.xl }} />
          ) : !arts.data || arts.data.length === 0 ? (
            <Text style={styles.empty}>No artwork found for this commander.</Text>
          ) : (
            <ScrollView contentContainerStyle={styles.grid} keyboardShouldPersistTaps="handled">
              {arts.data.map((art) => {
                const active = art.id === selectedId;
                return (
                  <Pressable
                    key={art.id}
                    style={[styles.item, active && styles.itemActive]}
                    onPress={() => onSelect(art)}
                  >
                    {art.artCrop ? (
                      <Image source={{ uri: art.artCrop }} style={styles.art} resizeMode="cover" />
                    ) : (
                      <View style={[styles.art, styles.placeholder]}>
                        <Text style={styles.placeholderIcon}>🃏</Text>
                      </View>
                    )}
                    <Text style={styles.set} numberOfLines={1}>
                      {art.setName}
                    </Text>
                    <Text style={styles.artist} numberOfLines={1}>
                      {art.artist}
                    </Text>
                    {active && <Text style={styles.check}>✓</Text>}
                  </Pressable>
                );
              })}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

const ITEM_WIDTH = 150;

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.bg,
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
  title: { color: colors.text, fontSize: fontSize.lg, fontWeight: '700' },
  subtitle: { color: colors.textMuted, fontSize: fontSize.sm },
  doneBtn: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  doneBtnText: { color: colors.primary, fontSize: fontSize.md, fontWeight: '700' },
  empty: { color: colors.textMuted, fontSize: fontSize.sm, marginVertical: spacing.xl },
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
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
    overflow: 'hidden',
    padding: spacing.xs,
  },
  itemActive: { borderColor: colors.primary },
  art: {
    width: '100%',
    height: 100,
    borderRadius: radius.sm,
  },
  placeholder: { alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface },
  placeholderIcon: { fontSize: 28 },
  set: {
    color: colors.text,
    fontSize: fontSize.sm,
    fontWeight: '600',
    marginTop: spacing.xs,
    paddingHorizontal: spacing.xs,
  },
  artist: {
    color: colors.textMuted,
    fontSize: 12,
    paddingHorizontal: spacing.xs,
    paddingBottom: spacing.xs,
  },
  check: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    color: colors.primary,
    fontSize: fontSize.lg,
    fontWeight: '900',
    textShadowColor: '#000',
    textShadowRadius: 4,
  },
});
