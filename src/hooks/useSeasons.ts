import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import * as seasonsApi from '@/api/seasons';
import { queryKeys } from './queryKeys';

/** The pod's seasons, newest first. Skipped while seasons are off. */
export function useSeasons(podId: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.seasons(podId),
    queryFn: () => seasonsApi.listSeasons(podId),
    enabled: !!podId && enabled,
  });
}

export function useSeason(seasonId: string) {
  return useQuery({
    queryKey: queryKeys.season(seasonId),
    queryFn: () => seasonsApi.getSeason(seasonId),
    enabled: !!seasonId,
  });
}

export function useCreateSeason(podId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => seasonsApi.createSeason(podId, name),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.seasons(podId) }),
  });
}

export function useRenameSeason(podId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ seasonId, name }: { seasonId: string; name: string }) =>
      seasonsApi.renameSeason(seasonId, name),
    onSuccess: (_data, { seasonId }) => {
      qc.invalidateQueries({ queryKey: queryKeys.seasons(podId) });
      qc.invalidateQueries({ queryKey: queryKeys.season(seasonId) });
    },
  });
}

export function useDeleteSeason(podId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (seasonId: string) => seasonsApi.deleteSeason(seasonId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.seasons(podId) });
      // Its games survive but come back unassigned, so the log is now stale.
      qc.invalidateQueries({ queryKey: queryKeys.games(podId) });
    },
  });
}
