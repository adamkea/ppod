import { useLocalSearchParams } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { Switch, Text, useTheme } from 'react-native-paper';

import { Card, ErrorState, Loading } from '@/components/ui';
import { usePod, useSetPodCommentsEnabled } from '@/hooks/usePods';
import { useAuth } from '@/providers/AuthProvider';
import { colors, spacing } from '@/theme';

export default function PodSettingsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const podId = id!;
  const { session } = useAuth();
  const theme = useTheme();

  const pod = usePod(podId);
  const setCommentsEnabled = useSetPodCommentsEnabled();

  const isOwner = pod.data?.owner_id === session?.user.id;

  if (pod.isLoading) return <Loading label="Loading settings…" />;
  if (pod.isError) return <ErrorState message={(pod.error as Error)?.message} />;

  return (
    <View style={styles.flex}>
      <View style={styles.list}>
        <Card style={styles.settingRow}>
          <View style={styles.settingText}>
            <Text variant="titleSmall">Match comments</Text>
            <Text
              variant="bodySmall"
              style={{ color: theme.colors.onSurfaceVariant }}
            >
              Let pod members leave comments on logged games.
            </Text>
          </View>
          <Switch
            value={pod.data?.comments_enabled ?? false}
            disabled={!isOwner || setCommentsEnabled.isPending}
            onValueChange={(enabled) =>
              setCommentsEnabled.mutate({ podId, enabled })
            }
          />
        </Card>
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
