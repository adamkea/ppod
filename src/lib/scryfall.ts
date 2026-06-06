// Thin wrappers around the Scryfall card API.
//
// The app shows commander art in two ways:
//   - by *name* (the card's default printing) — the historical behavior, and the
//     fallback when no specific art has been chosen.
//   - by *print id* — a specific artwork the player picked from the alternates.
//
// `listArtworks` powers the alternate-art picker: `unique=art` returns one entry
// per distinct illustration, collapsing reprints that share the same art.

const API = 'https://api.scryfall.com';

export interface ScryfallArt {
  /** Scryfall print id — stored to pin this exact artwork. */
  id: string;
  illustrationId: string | null;
  /** Cropped artwork (good for thumbnails). */
  artCrop: string | null;
  /** Full card image. */
  normal: string | null;
  setName: string;
  artist: string;
}

// Image uris live on the card, or on the first face for double-faced cards.
function imageUris(card: any): Record<string, string> | undefined {
  return card?.image_uris ?? card?.card_faces?.[0]?.image_uris;
}

function toArt(card: any): ScryfallArt {
  const uris = imageUris(card);
  return {
    id: card.id,
    illustrationId: card.illustration_id ?? null,
    artCrop: uris?.art_crop ?? null,
    normal: uris?.normal ?? null,
    setName: card.set_name ?? '',
    artist: card.artist ?? '',
  };
}

/** Default-printing art_crop for a card name (fuzzy match). */
export async function fetchArtByName(name: string): Promise<string | null> {
  if (!name) return null;
  try {
    const res = await fetch(`${API}/cards/named?fuzzy=${encodeURIComponent(name)}`);
    if (!res.ok) return null;
    return imageUris(await res.json())?.art_crop ?? null;
  } catch {
    return null;
  }
}

/** art_crop for a specific Scryfall print id. */
export async function fetchArtById(id: string): Promise<string | null> {
  if (!id) return null;
  try {
    const res = await fetch(`${API}/cards/${encodeURIComponent(id)}`);
    if (!res.ok) return null;
    return imageUris(await res.json())?.art_crop ?? null;
  } catch {
    return null;
  }
}

/** Every distinct artwork for an exact card name, newest printing first. */
export async function listArtworks(name: string): Promise<ScryfallArt[]> {
  if (!name) return [];
  try {
    // JSON.stringify gives a quoted, escaped string; `!"Name"` is an exact match.
    const q = `!${JSON.stringify(name)}`;
    const url = `${API}/cards/search?q=${encodeURIComponent(q)}&unique=art&order=released&dir=desc`;
    const res = await fetch(url);
    if (!res.ok) return []; // 404 when a name has no matches
    const json = await res.json();
    return (json.data as any[]).map(toArt);
  } catch {
    return [];
  }
}
