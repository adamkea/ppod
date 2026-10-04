import { Image, StyleSheet, View } from 'react-native';
import { Icon, useTheme } from 'react-native-paper';

import { useCommanderArt } from '@/hooks/useCardArt';
import { radius } from '@/theme';

/**
 * Commander art for a leaderboard row: one crop, or the two partners split
 * side by side in the same frame so every row lines up.
 */
export function CommanderStatArt({
  commander,
  partner,
  commanderScryfallId,
  partnerScryfallId,
}: {
  commander: string | null;
  partner: string | null;
  commanderScryfallId: string | null;
  partnerScryfallId: string | null;
}) {
  const theme = useTheme();
  const main = useCommanderArt(commander, commanderScryfallId);
  const second = useCommanderArt(partner, partnerScryfallId);
  const uris = (partner ? [main.data, second.data] : [main.data]).map((u) => u ?? null);

  return (
    <View style={[styles.frame, { backgroundColor: theme.colors.surfaceVariant }]}>
      {uris.map((uri, i) =>
        uri ? (
          <Image key={i} source={{ uri }} style={styles.img} resizeMode="cover" />
        ) : (
          <View key={i} style={styles.placeholder}>
            <Icon source="cards-outline" size={18} />
          </View>
        ),
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    width: 64,
    height: 48,
    borderRadius: radius.sm,
    overflow: 'hidden',
    flexDirection: 'row',
  },
  img: { flex: 1, height: '100%' },
  placeholder: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
