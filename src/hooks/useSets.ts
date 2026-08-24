import { useQuery } from '@tanstack/react-query';

import * as scryfall from '@/lib/scryfall';

// The whole draftable-set list, fetched once and filtered locally by the
// picker. Sets change only when a new one is released, so it stays fresh for
// the session.
export function useSets(enabled = true) {
  return useQuery({
    queryKey: ['sets'],
    queryFn: () => scryfall.listSets(),
    enabled,
    staleTime: 1000 * 60 * 60 * 24, // a day
    gcTime: 1000 * 60 * 60 * 24,
  });
}

// A set symbol's SVG markup. Cached forever — a given uri always returns the
// same artwork.
export function useSetIcon(uri: string | null | undefined) {
  return useQuery({
    queryKey: ['setIcon', uri ?? null],
    queryFn: () => scryfall.fetchSetIcon(uri ?? ''),
    enabled: !!uri,
    staleTime: Infinity,
    gcTime: Infinity,
  });
}
