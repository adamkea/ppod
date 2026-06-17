import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import * as seriesApi from '@/api/series';
import { queryKeys } from './queryKeys';

export function useSeriesList(podId: string) {
  return useQuery({
    queryKey: queryKeys.seriesList(podId),
    queryFn: () => seriesApi.listSeries(podId),
    enabled: !!podId,
  });
}

export function useSeries(seriesId: string) {
  return useQuery({
    queryKey: queryKeys.series(seriesId),
    queryFn: () => seriesApi.getSeries(seriesId),
    enabled: !!seriesId,
  });
}

export function useSeriesGames(seriesId: string) {
  return useQuery({
    queryKey: queryKeys.seriesGames(seriesId),
    queryFn: () => seriesApi.listSeriesGames(seriesId),
    enabled: !!seriesId,
  });
}

interface CreateArgs {
  name: string;
  playerOneId: string;
  playerTwoId: string;
  targetGames: number | null;
}

export function useCreateSeries(podId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: CreateArgs) => seriesApi.createSeries({ podId, ...args }),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.seriesList(podId) }),
  });
}

export function useDeleteSeries(podId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (seriesId: string) => seriesApi.deleteSeries(seriesId),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.seriesList(podId) }),
  });
}

interface LogArgs {
  winnerPlayerId: string | null;
  playedAt: string;
  note: string;
}

export function useLogSeriesGame(podId: string, seriesId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: LogArgs) => seriesApi.logSeriesGame({ seriesId, ...args }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.seriesGames(seriesId) });
      // The pod's series list shows each series' running record.
      qc.invalidateQueries({ queryKey: queryKeys.seriesList(podId) });
    },
  });
}

export function useDeleteSeriesGame(podId: string, seriesId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (seriesGameId: string) => seriesApi.deleteSeriesGame(seriesGameId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.seriesGames(seriesId) });
      qc.invalidateQueries({ queryKey: queryKeys.seriesList(podId) });
    },
  });
}
