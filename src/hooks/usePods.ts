import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import * as podsApi from '@/api/pods';
import { useAuth } from '@/providers/AuthProvider';
import { queryKeys } from './queryKeys';

export function usePods() {
  const { session } = useAuth();
  return useQuery({
    queryKey: queryKeys.pods,
    queryFn: podsApi.listMyPods,
    // Don't fetch until authenticated — an unauthenticated query returns an
    // empty list (RLS) with no error, which would otherwise be cached and
    // shown as "no pods" until a manual refresh.
    enabled: !!session,
  });
}

export function usePod(podId: string) {
  return useQuery({
    queryKey: queryKeys.pod(podId),
    queryFn: () => podsApi.getPod(podId),
    enabled: !!podId,
  });
}

export function usePodMembers(podId: string) {
  return useQuery({
    queryKey: queryKeys.members(podId),
    queryFn: () => podsApi.listMembers(podId),
    enabled: !!podId,
  });
}

export function useCreatePod() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => podsApi.createPod(name),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.pods }),
  });
}

export function useJoinPod() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (code: string) => podsApi.joinPod(code),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.pods }),
  });
}

export function useRenamePod() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ podId, name }: { podId: string; name: string }) =>
      podsApi.renamePod(podId, name),
    onSuccess: (_data, { podId }) => {
      qc.invalidateQueries({ queryKey: queryKeys.pod(podId) });
      qc.invalidateQueries({ queryKey: queryKeys.pods });
    },
  });
}

export function useSetPodCommentsEnabled() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ podId, enabled }: { podId: string; enabled: boolean }) =>
      podsApi.setPodCommentsEnabled(podId, enabled),
    onSuccess: (_data, { podId }) => {
      qc.invalidateQueries({ queryKey: queryKeys.pod(podId) });
      qc.invalidateQueries({ queryKey: queryKeys.pods });
    },
  });
}

export function useDeletePod() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (podId: string) => podsApi.deletePod(podId),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.pods }),
  });
}
