import { Stack, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { PromptModal } from '@/components/PromptModal';
import { Card, EmptyState, ErrorState, Loading } from '@/components/ui';
import { useCreatePod, useJoinPod, usePods } from '@/hooks/usePods';
import { useAuth } from '@/providers/AuthProvider';
import { colors, fontSize, spacing } from '@/theme';
import type { Pod } from '@/types/database';

type Dialog = 'none' | 'create' | 'join';

export default function PodsScreen() {
  const router = useRouter();
  const { signOut } = useAuth();
  const pods = usePods();
  const createPod = useCreatePod();
  const joinPod = useJoinPod();

  const [dialog, setDialog] = useState<Dialog>('none');
  const [error, setError] = useState<string | null>(null);

  // If the user belongs to exactly one pod, jump straight into it on load.
  // Guarded so it only fires once — pushing (not replacing) keeps this list in
  // the back stack so the pod's back button returns here to create/join more.
  const didAutoNavigate = useRef(false);
  useEffect(() => {
    if (didAutoNavigate.current) return;
    if (pods.isSuccess && pods.data.length === 1) {
      didAutoNavigate.current = true;
      router.push(`/pod/${pods.data[0].id}`);
    }
  }, [pods.isSuccess, pods.data, router]);

  function closeDialog() {
    setDialog('none');
    setError(null);
  }

  async function handleCreate(name: string) {
    setError(null);
    try {
      const pod = await createPod.mutateAsync(name);
      closeDialog();
      router.push(`/pod/${pod.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not create pod.');
    }
  }

  async function handleJoin(code: string) {
    setError(null);
    try {
      const pod = await joinPod.mutateAsync(code);
      closeDialog();
      router.push(`/pod/${pod.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not join pod.');
    }
  }

  return (
    <View style={styles.flex}>
      <Stack.Screen
        options={{
          headerRight: () => (
            <Pressable onPress={() => signOut()} hitSlop={8}>
              <Text style={styles.signOut}>Sign out</Text>
            </Pressable>
          ),
        }}
      />

      {pods.isLoading ? (
        <Loading label="Loading your pods…" />
      ) : pods.isError ? (
        <ErrorState message={(pods.error as Error)?.message} />
      ) : (
        <FlatList
          data={pods.data}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshing={pods.isRefetching}
          onRefresh={() => pods.refetch()}
          ListEmptyComponent={
            <EmptyState
              title="No pods yet"
              subtitle="Create a pod for your playgroup, or join one with an invite code."
            />
          }
          renderItem={({ item }) => (
            <PodRow pod={item} onPress={() => router.push(`/pod/${item.id}`)} />
          )}
        />
      )}

      <View style={styles.footer}>
        <Button
          label="Join pod"
          variant="secondary"
          onPress={() => setDialog('join')}
          style={styles.footerBtn}
        />
        <Button
          label="New pod"
          onPress={() => setDialog('create')}
          style={styles.footerBtn}
        />
      </View>

      <PromptModal
        visible={dialog === 'create'}
        title="New pod"
        label="Pod name"
        placeholder="e.g. Tuesday Night Magic"
        submitLabel="Create"
        submitting={createPod.isPending}
        error={error}
        onSubmit={handleCreate}
        onClose={closeDialog}
      />
      <PromptModal
        visible={dialog === 'join'}
        title="Join a pod"
        label="Invite code"
        placeholder="6-character code"
        submitLabel="Join"
        autoCapitalize="characters"
        submitting={joinPod.isPending}
        error={error}
        onSubmit={handleJoin}
        onClose={closeDialog}
      />
    </View>
  );
}

function PodRow({ pod, onPress }: { pod: Pod; onPress: () => void }) {
  return (
    <Pressable onPress={onPress}>
      {({ pressed }) => (
        <Card style={[styles.podCard, pressed && styles.pressed]}>
          <Text style={styles.podName}>{pod.name}</Text>
          <Text style={styles.podCode}>Invite code · {pod.invite_code}</Text>
        </Card>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  list: { padding: spacing.lg, gap: spacing.md, flexGrow: 1 },
  podCard: { gap: spacing.xs },
  pressed: { opacity: 0.7 },
  podName: { color: colors.text, fontSize: fontSize.lg, fontWeight: '700' },
  podCode: { color: colors.textMuted, fontSize: fontSize.sm },
  footer: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.bg,
  },
  footerBtn: { flex: 1 },
  signOut: { color: colors.primary, fontSize: fontSize.md, fontWeight: '600' },
});
