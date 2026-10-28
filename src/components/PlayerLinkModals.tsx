import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { HelperText, Surface, Text, useTheme } from 'react-native-paper';

import { Button } from './Button';
import { useClaimPlayer } from '@/hooks/usePlayers';
import { colors, radius, spacing } from '@/theme';
import type { Player } from '@/types/database';

// A centered sheet holding a tappable list, matching PromptModal's look.
function ListSheet({
  visible,
  title,
  subtitle,
  error,
  onClose,
  children,
}: {
  visible: boolean;
  title: string;
  subtitle?: string;
  error?: string | null;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const theme = useTheme();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable
        style={[styles.backdrop, { backgroundColor: theme.colors.backdrop }]}
        onPress={onClose}
      >
        <Pressable onPress={(e) => e.stopPropagation()}>
          <Surface mode="flat" elevation={3} style={styles.sheet}>
            <Text variant="titleLarge">{title}</Text>
            {subtitle ? (
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                {subtitle}
              </Text>
            ) : null}
            <ScrollView style={styles.scroll} contentContainerStyle={styles.options}>
              {children}
            </ScrollView>
            {error ? (
              <HelperText type="error" visible style={styles.error}>
                {error}
              </HelperText>
            ) : null}
            <View style={styles.actions}>
              <Button label="Close" variant="secondary" onPress={onClose} style={styles.action} />
            </View>
          </Surface>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function Option({
  label,
  disabled,
  onPress,
}: {
  label: string;
  disabled?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.option,
        pressed && styles.optionPressed,
        disabled && styles.optionDisabled,
      ]}
    >
      <Text variant="titleSmall">{label}</Text>
    </Pressable>
  );
}

/**
 * "Which player are you?" — the signed-in member picks one of the pod's
 * unlinked players and is linked to it straight away.
 */
export function ClaimPlayerModal({
  visible,
  podId,
  players,
  onClose,
}: {
  visible: boolean;
  podId: string;
  players: Player[];
  onClose: () => void;
}) {
  const claim = useClaimPlayer(podId);
  const [error, setError] = useState<string | null>(null);
  const unlinked = players.filter((p) => !p.user_id);

  async function handleClaim(player: Player) {
    setError(null);
    try {
      await claim.mutateAsync(player.id);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not link you to that player.');
    }
  }

  function close() {
    setError(null);
    onClose();
  }

  return (
    <ListSheet
      visible={visible}
      title="Which player are you?"
      subtitle="Link your account to your name in this pod so your games and stats are yours."
      error={error}
      onClose={close}
    >
      {unlinked.length === 0 ? (
        <Text variant="bodyMedium" style={styles.empty}>
          Every player is already linked. Ask the pod owner to add you as a player.
        </Text>
      ) : (
        unlinked.map((p) => (
          <Option
            key={p.id}
            label={p.name}
            disabled={claim.isPending}
            onPress={() => handleClaim(p)}
          />
        ))
      )}
    </ListSheet>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'center',
    padding: spacing.lg,
  },
  sheet: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.md,
    maxHeight: '100%',
  },
  scroll: { flexGrow: 0, maxHeight: 360 },
  options: { gap: spacing.sm },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: 48,
  },
  optionPressed: { backgroundColor: colors.surfaceAlt, borderColor: colors.borderStrong },
  optionDisabled: { opacity: 0.6 },
  empty: { color: colors.textMuted },
  error: { paddingHorizontal: 0 },
  actions: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.xs },
  action: { flex: 1 },
});
