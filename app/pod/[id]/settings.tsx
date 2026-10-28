import { useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Switch, Text, useTheme } from 'react-native-paper';

import { Card, ErrorState, Loading, SectionLabel } from '@/components/ui';
import { UserAvatar } from '@/components/UserAvatar';
import { usePlayers } from '@/hooks/usePlayers';
import {
  usePod,
  usePodMembers,
  useSetPodCommentsEnabled,
  useSetPodSeasonsEnabled,
} from '@/hooks/usePods';
import { useProfiles } from '@/hooks/useProfile';
import type { Player, PodMemberSummary } from '@/types/database';
import { useAuth } from '@/providers/AuthProvider';
import { colors, spacing } from '@/theme';

export default function PodSettingsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const podId = id!;
  const { session } = useAuth();
  const theme = useTheme();

  const pod = usePod(podId);
  const members = usePodMembers(podId);
  const players = usePlayers(podId);
  const setCommentsEnabled = useSetPodCommentsEnabled();
  const setSeasonsEnabled = useSetPodSeasonsEnabled();

  const isOwner = pod.data?.owner_id === session?.user.id;

  if (pod.isLoading) return <Loading label="Loading settings…" />;
  if (pod.isError) return <ErrorState message={(pod.error as Error)?.message} />;

  return (
    <View style={styles.flex}>
      <ScrollView contentContainerStyle={styles.list}>
        <SettingRow
          title="Match comments"
          description="Let pod members leave comments on logged games."
          value={pod.data?.comments_enabled ?? false}
          disabled={!isOwner || setCommentsEnabled.isPending}
          onValueChange={(enabled) => setCommentsEnabled.mutate({ podId, enabled })}
        />
        <SettingRow
          title="Seasons"
          description="File games into named seasons and score each one on its own. Turning this off hides seasons everywhere — games keep the season they were filed under and show as ordinary games until you turn it back on."
          value={pod.data?.seasons_enabled ?? false}
          disabled={!isOwner || setSeasonsEnabled.isPending}
          onValueChange={(enabled) => setSeasonsEnabled.mutate({ podId, enabled })}
        />
        {!isOwner ? (
          <Text
            variant="bodySmall"
            style={[styles.hint, { color: theme.colors.onSurfaceVariant }]}
          >
            Only the pod owner can change these settings.
          </Text>
        ) : null}

        <MembersSection members={members.data ?? []} players={players.data ?? []} />
      </ScrollView>
    </View>
  );
}

// Who has opened the pod, and which player (if any) each of them plays as.
// Links are changed from the Players screen; this is the at-a-glance view.
function MembersSection({
  members,
  players,
}: {
  members: PodMemberSummary[];
  players: Player[];
}) {
  const theme = useTheme();
  const profiles = useProfiles(members.map((m) => m.user_id));
  if (members.length === 0) return null;

  const playerByUser = new Map<string, Player>();
  for (const p of players) if (p.user_id) playerByUser.set(p.user_id, p);

  return (
    <View style={styles.members}>
      <SectionLabel>Members</SectionLabel>
      {members.map((m) => {
        const player = playerByUser.get(m.user_id);
        return (
          <Card key={m.user_id} style={styles.memberRow}>
            <UserAvatar profile={profiles.data?.get(m.user_id)} size={32} />
            <View style={styles.settingText}>
              <Text variant="titleSmall">{m.display_name}</Text>
              <Text
                variant="bodySmall"
                style={{ color: player ? colors.success : theme.colors.onSurfaceVariant }}
              >
                {player ? `Plays as ${player.name}` : 'Not linked to a player'}
              </Text>
            </View>
            <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
              {m.role === 'owner' ? 'Owner' : 'Member'}
            </Text>
          </Card>
        );
      })}
    </View>
  );
}

function SettingRow({
  title,
  description,
  value,
  disabled,
  onValueChange,
}: {
  title: string;
  description: string;
  value: boolean;
  disabled: boolean;
  onValueChange: (enabled: boolean) => void;
}) {
  const theme = useTheme();
  return (
    <Card style={styles.settingRow}>
      <View style={styles.settingText}>
        <Text variant="titleSmall">{title}</Text>
        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
          {description}
        </Text>
      </View>
      <Switch value={value} disabled={disabled} onValueChange={onValueChange} />
    </Card>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  list: { padding: spacing.lg, gap: spacing.md },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  settingText: { flex: 1, gap: 2 },
  hint: { textAlign: 'center' },
  members: { gap: spacing.md, marginTop: spacing.md },
  memberRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
});
