import { useQuery } from '@tanstack/react-query';

import * as scryfall from '@/lib/scryfall';

// Resolve a commander's art: prefer a pinned print id, fall back to the name's
// default printing. Cached forever — a given id/name always maps to the same art.
export function useCommanderArt(name: string | null | undefined, scryfallId?: string | null) {
  return useQuery({
    queryKey: ['cardArt', scryfallId ?? null, name ?? null],
    queryFn: () =>
      scryfallId ? scryfall.fetchArtById(scryfallId) : scryfall.fetchArtByName(name ?? ''),
    enabled: !!(scryfallId || name),
    staleTime: Infinity,
    gcTime: Infinity,
  });
}

// All distinct artworks for a commander name, for the alternate-art picker.
export function useArtworks(name: string, enabled: boolean) {
  return useQuery({
    queryKey: ['artworks', name],
    queryFn: () => scryfall.listArtworks(name),
    enabled: enabled && name.trim().length > 0,
    staleTime: 1000 * 60 * 60, // an hour — printings rarely change
  });
}
