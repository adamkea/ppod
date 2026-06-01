import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import * as api from '@/api/playerCommanders';
import { queryKeys } from './queryKeys';

export function usePlayerCommanders(playerId: string) {
  return useQuery({
    queryKey: queryKeys.playerCommanders(playerId),
    queryFn: () => api.listPlayerCommanders(playerId),
    enabled: !!playerId,
  });
}

export function useAddPlayerCommander(playerId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: { commander: string; partnerCommander?: string }) =>
      api.addPlayerCommander(playerId, args.commander, args.partnerCommander),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.playerCommanders(playerId) }),
  });
}

export function useDeletePlayerCommander(playerId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deletePlayerCommander(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.playerCommanders(playerId) }),
  });
}
