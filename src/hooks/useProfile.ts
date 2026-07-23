import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';

import * as profileApi from '@/api/profile';
import { useAuth } from '@/providers/AuthProvider';
import { queryKeys } from './queryKeys';

/** The signed-in user's own profile; null until they save one. */
export function useMyProfile() {
  const { session } = useAuth();
  const userId = session?.user.id;
  return useQuery({
    queryKey: queryKeys.profile(userId ?? ''),
    queryFn: () => profileApi.getProfile(userId!),
    enabled: !!userId,
  });
}

/** Profiles for a set of users (e.g. comment authors), as a user_id → profile map. */
export function useProfiles(userIds: string[]) {
  // Sorted for a stable query key regardless of comment order.
  const sorted = useMemo(() => [...userIds].sort(), [userIds]);
  return useQuery({
    queryKey: queryKeys.profiles(sorted),
    queryFn: async () => {
      const rows = await profileApi.listProfiles(sorted);
      return new Map(rows.map((p) => [p.user_id, p]));
    },
    enabled: sorted.length > 0,
  });
}

export function useUpdateMyProfile() {
  const { session } = useAuth();
  const userId = session?.user.id;
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (patch: profileApi.ProfilePatch) => {
      if (!userId) throw new Error('Not signed in');
      return profileApi.upsertProfile(userId, patch);
    },
    onSuccess: (profile) => {
      qc.setQueryData(queryKeys.profile(profile.user_id), profile);
      // Any cached author-profile maps (comments) may include this user.
      qc.invalidateQueries({ queryKey: ['profiles'] });
    },
  });
}
