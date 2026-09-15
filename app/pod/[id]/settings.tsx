import { useLocalSearchParams } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { Switch, Text, useTheme } from 'react-native-paper';

import { Card, ErrorState, Loading } from '@/components/ui';
import {
  usePod,
  useSetPodCommentsEnabled,
  useSetPodSeasonsEnabled,
} from '@/hooks/usePods';
import { useAuth } from '@/providers/AuthProvider';
import { colors, spacing } from '@/theme';

export default function PodSettingsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const podId = id!;
  const { session } = useAuth();
  const theme = useTheme();

  const pod = usePod(podId);
  const setCommentsEnabled = useSetPodCommentsEnabled();
  const setSeasonsEnabled = useSetPodSeasonsEnabled();

  const isOwner = pod.data?.owner_id === session?.user.id;

  if (pod.isLoading) return <Loading label="Loading settings…" />;
  if (pod.isError) return <ErrorState message={(pod.error as Error)?.message} />;

  return (
    <View style={styles.flex}>
      <View style={styles.list}>
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
      </View>
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
});
