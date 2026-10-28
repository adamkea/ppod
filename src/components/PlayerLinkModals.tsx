import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { HelperText, Icon, Surface, Text, useTheme } from 'react-native-paper';

import { Button } from './Button';
import { UserAvatar } from './UserAvatar';
import { useClaimPlayer, useLinkPlayer, useUnlinkPlayer } from '@/hooks/usePlayers';
import { useProfiles } from '@/hooks/useProfile';
import { colors, radius, spacing } from '@/theme';
import type { Player, PodMemberSummary } from '@/types/database';

// A centered sheet holding a tappable list — the shell both pickers share,
// matching PromptModal's look.
function ListSheet({
  visible,
  title,
  subtitle,
  error,
  footer,
  onClose,
  children,
}: {
  visible: boolean;
  title: string;
  subtitle?: string;
  error?: string | null;
  footer?: React.ReactNode;
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
              {footer}
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
  detail,
  leading,
  selected,
  disabled,
  onPress,
}: {
  label: string;
  detail?: string;
  leading?: React.ReactNode;
  selected?: boolean;
  disabled?: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.option,
        selected && styles.optionSelected,
        pressed && styles.optionPressed,
        disabled && !selected && styles.optionDisabled,
      ]}
    >
      {leading}
      <View style={styles.optionText}>
        <Text variant="titleSmall">{label}</Text>
        {detail ? (
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
            {detail}
          </Text>
        ) : null}
      </View>
      {selected ? <Icon source="check" size={18} color={colors.primary} /> : null}
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

/**
 * Owner only: choose which member account a player belongs to, or unlink it.
 * Picking a member already linked elsewhere moves them to this player.
 */
export function LinkAccountModal({
  podId,
  player,
  players,
  members,
  onClose,
}: {
  podId: string;
  // The player being linked; null hides the modal.
  player: Player | null;
  players: Player[];
  members: PodMemberSummary[];
  onClose: () => void;
}) {
  const link = useLinkPlayer(podId);
  const unlink = useUnlinkPlayer(podId);
  const profiles = useProfiles(members.map((m) => m.user_id));
  const [error, setError] = useState<string | null>(null);
  const busy = link.isPending || unlink.isPending;

  const playerByUser = new Map<string, Player>();
  for (const p of players) if (p.user_id) playerByUser.set(p.user_id, p);

  function close() {
    setError(null);
    onClose();
  }

  async function run(action: () => Promise<unknown>) {
    setError(null);
    try {
      await action();
      close();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not update the link.');
    }
  }

  return (
    <ListSheet
      visible={player !== null}
      title={player ? `Link ${player.name}` : ''}
      subtitle="Choose the member account that plays as this player."
      error={error}
      onClose={close}
      footer={
        player?.user_id ? (
          <Button
            label="Unlink"
            variant="danger"
            loading={unlink.isPending}
            disabled={busy}
            onPress={() => run(() => unlink.mutateAsync(player.id))}
            style={styles.action}
          />
        ) : null
      }
    >
      {members.map((m) => {
        const linkedTo = playerByUser.get(m.user_id);
        const isCurrent = !!player && linkedTo?.id === player.id;
        const role = m.role === 'owner' ? 'Owner' : 'Member';
        return (
          <Option
            key={m.user_id}
            label={m.display_name}
            detail={
              linkedTo && !isCurrent ? `${role} · currently ${linkedTo.name}` : role
            }
            leading={<UserAvatar profile={profiles.data?.get(m.user_id)} size={28} />}
            selected={isCurrent}
            disabled={busy || isCurrent}
            onPress={() =>
              player && run(() => link.mutateAsync({ playerId: player.id, userId: m.user_id }))
            }
          />
        );
      })}
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
  optionSelected: { borderColor: colors.primary },
  optionPressed: { backgroundColor: colors.surfaceAlt, borderColor: colors.borderStrong },
  optionDisabled: { opacity: 0.6 },
  optionText: { flex: 1, gap: 2 },
  empty: { color: colors.textMuted },
  error: { paddingHorizontal: 0 },
  actions: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.xs },
  action: { flex: 1 },
});
