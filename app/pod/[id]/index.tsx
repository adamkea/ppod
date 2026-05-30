import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, SectionList, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { Card, EmptyState, ErrorState, Loading } from '@/components/ui';
import { useGames } from '@/hooks/useGames';
import { usePod } from '@/hooks/usePods';
import { formatDateHeading } from '@/lib/dates';
import { commanderLabel, groupGamesByDate } from '@/lib/stats';
import { useAuth } from '@/providers/AuthProvider';
import { colors, fontSize, spacing } from '@/theme';
import type { GameWithPlayers } from '@/types/database';

export default function PodDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const podId = id!;
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { session } = useAuth();

  const pod = usePod(podId);
  const games = useGames(podId);

  const isOwner = pod.data?.owner_id === session?.user.id;

  const sections = useMemo(
    () =>
      groupGamesByDate(games.data ?? []).map((s) => ({
        title: formatDateHeading(s.date),
        data: s.games,
      })),
    [games.data],
  );

  return (
    <View style={styles.flex}>
      <Stack.Screen
        options={{
          title: pod.data?.name ?? 'Pod',
          headerRight: () => (
            <Pressable onPress={() => router.push(`/pod/${podId}/stats`)} hitSlop={8}>
              <Text style={styles.headerLink}>Stats</Text>
            </Pressable>
          ),
        }}
      />

      {games.isLoading ? (
        <Loading label="Loading games…" />
      ) : games.isError ? (
        <ErrorState message={(games.error as Error)?.message} />
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          stickySectionHeadersEnabled={false}
          refreshing={games.isRefetching}
          onRefresh={() => games.refetch()}
          ListHeaderComponent={
            <PodHeader
              inviteCode={pod.data?.invite_code}
              onPlayers={() => router.push(`/pod/${podId}/players`)}
            />
          }
          ListEmptyComponent={
            <EmptyState
              title="No games logged yet"
              subtitle="Tap “Log game” to record your first one."
            />
          }
          renderSectionHeader={({ section }) => (
            <Text style={styles.sectionHeader}>{section.title}</Text>
          )}
          renderItem={({ item }) => (
            <GameCard
              game={item}
              canEdit
              onPress={() =>
                router.push({
                  pathname: `/pod/${podId}/add-game`,
                  params: { gameId: item.id },
                })
              }
            />
          )}
        />
      )}

      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}>
        <Button
          label="＋ Log game"
          onPress={() => router.push(`/pod/${podId}/add-game`)}
        />
        {isOwner ? (
          <Text style={styles.ownerHint}>
            You own this pod · share code {pod.data?.invite_code}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

function PodHeader({
  inviteCode,
  onPlayers,
}: {
  inviteCode?: string;
  onPlayers: () => void;
}) {
  return (
    <View style={styles.podHeader}>
      <View style={styles.inviteRow}>
        <View>
          <Text style={styles.inviteLabel}>Invite code</Text>
          <Text style={styles.inviteCode}>{inviteCode ?? '—'}</Text>
        </View>
        <Button label="Players" variant="secondary" onPress={onPlayers} />
      </View>
    </View>
  );
}

function GameCard({
  game,
  onPress,
}: {
  game: GameWithPlayers;
  canEdit: boolean;
  onPress: () => void;
}) {
  const participants = [...game.game_players].sort((a, b) => {
    if (a.is_winner !== b.is_winner) return a.is_winner ? -1 : 1;
    return (a.players?.name ?? '').localeCompare(b.players?.name ?? '');
  });

  return (
    <Pressable onPress={onPress}>
      {({ pressed }) => (
        <Card style={[styles.gameCard, pressed && styles.pressed]}>
          <Text style={styles.gameType}>{game.game_type}</Text>
          <View style={styles.participants}>
            {participants.map((gp) => {
              const cmd = commanderLabel(gp.commander, gp.partner_commander);
              return (
                <View key={gp.id} style={styles.participantRow}>
                  <Text
                    style={[styles.participantName, gp.is_winner && styles.winnerName]}
                    numberOfLines={1}
                  >
                    {gp.is_winner ? '👑 ' : ''}
                    {gp.players?.name ?? 'Unknown'}
                  </Text>
                  {cmd ? (
                    <Text style={styles.commander} numberOfLines={1}>
                      {cmd}
                    </Text>
                  ) : null}
                </View>
              );
            })}
          </View>
        </Card>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  list: { padding: spacing.lg, gap: spacing.md, flexGrow: 1 },
  headerLink: { color: colors.primary, fontSize: fontSize.md, fontWeight: '600' },
  podHeader: { marginBottom: spacing.sm },
  inviteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  inviteLabel: { color: colors.textMuted, fontSize: fontSize.sm },
  inviteCode: {
    color: colors.text,
    fontSize: fontSize.xl,
    fontWeight: '800',
    letterSpacing: 2,
  },
  sectionHeader: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: spacing.sm,
  },
  gameCard: { gap: spacing.sm },
  pressed: { opacity: 0.7 },
  gameType: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    textTransform: 'capitalize',
  },
  participants: { gap: spacing.xs },
  participantRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.md,
  },
  participantName: { color: colors.text, fontSize: fontSize.md, flexShrink: 1 },
  winnerName: { color: colors.winner, fontWeight: '700' },
  commander: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    flexShrink: 1,
    textAlign: 'right',
  },
  footer: {
    padding: spacing.lg,
    paddingBottom: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: spacing.sm,
  },
  ownerHint: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    textAlign: 'center',
  },
});
