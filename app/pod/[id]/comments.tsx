import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  View,
} from 'react-native';
import { IconButton, Text, useTheme } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TextField } from '@/components/TextField';
import { Card, EmptyState, ErrorState, Loading } from '@/components/ui';
import { useAddComment, useDeleteComment, useGameComments } from '@/hooks/useComments';
import { usePod } from '@/hooks/usePods';
import { confirmAsync } from '@/lib/confirm';
import { formatTimestamp } from '@/lib/dates';
import { useAuth } from '@/providers/AuthProvider';
import { colors, spacing } from '@/theme';
import type { GameComment } from '@/types/database';

export default function GameCommentsScreen() {
  const { id, gameId } = useLocalSearchParams<{ id: string; gameId: string }>();
  const podId = id!;
  const insets = useSafeAreaInsets();
  const { session } = useAuth();
  const theme = useTheme();

  const pod = usePod(podId);
  const comments = useGameComments(gameId!);
  const addComment = useAddComment(podId, gameId!);
  const deleteComment = useDeleteComment(podId, gameId!);

  const isOwner = pod.data?.owner_id === session?.user.id;
  const commentsEnabled = pod.data?.comments_enabled ?? false;

  const [body, setBody] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function handleSend() {
    const trimmed = body.trim();
    if (!trimmed) return;
    setError(null);
    try {
      await addComment.mutateAsync(trimmed);
      setBody('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not post comment.');
    }
  }

  async function confirmDelete(comment: GameComment) {
    const ok = await confirmAsync({
      title: 'Delete comment',
      message: 'Delete this comment? This cannot be undone.',
      confirmLabel: 'Delete',
      destructive: true,
    });
    if (ok) deleteComment.mutate(comment.id);
  }

  if (pod.data && !commentsEnabled) {
    return (
      <View style={styles.flex}>
        <EmptyState
          title="Comments are off"
          subtitle="The pod owner hasn't enabled match comments for this pod."
        />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {comments.isLoading ? (
        <Loading label="Loading comments…" />
      ) : comments.isError ? (
        <ErrorState message={(comments.error as Error)?.message} />
      ) : (
        <FlatList
          data={comments.data}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <EmptyState
              title="No comments yet"
              subtitle="Be the first to say something about this game."
            />
          }
          renderItem={({ item }) => {
            const canDelete = isOwner || item.user_id === session?.user.id;
            return (
              <Card style={styles.commentCard}>
                <View style={styles.commentBody}>
                  <View style={styles.commentMeta}>
                    <Text variant="labelLarge" style={styles.author} numberOfLines={1}>
                      {item.author_name}
                    </Text>
                    <Text
                      variant="labelSmall"
                      style={{ color: theme.colors.onSurfaceVariant }}
                    >
                      {formatTimestamp(item.created_at)}
                    </Text>
                  </View>
                  <Text variant="bodyMedium">{item.body}</Text>
                </View>
                {canDelete ? (
                  <IconButton
                    icon="delete-outline"
                    size={18}
                    iconColor={theme.colors.error}
                    onPress={() => confirmDelete(item)}
                    accessibilityLabel="Delete comment"
                  />
                ) : null}
              </Card>
            );
          }}
        />
      )}

      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}>
        {error ? (
          <Text variant="bodySmall" style={{ color: theme.colors.error }}>
            {error}
          </Text>
        ) : null}
        <View style={styles.inputRow}>
          <TextField
            style={styles.input}
            placeholder="Add a comment…"
            value={body}
            onChangeText={setBody}
            multiline
            maxLength={1000}
            dense
          />
          <IconButton
            icon="send"
            mode="contained"
            size={22}
            disabled={!body.trim() || addComment.isPending}
            onPress={handleSend}
            accessibilityLabel="Post comment"
          />
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  list: { padding: spacing.lg, gap: spacing.md, flexGrow: 1 },
  commentCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    paddingVertical: spacing.md,
  },
  commentBody: { flex: 1, gap: spacing.xs },
  commentMeta: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  author: { flexShrink: 1 },
  footer: {
    padding: spacing.lg,
    paddingBottom: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: spacing.xs,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
  },
  input: { flex: 1, maxHeight: 120 },
});
