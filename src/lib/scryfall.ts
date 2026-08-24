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

// ---------------------------------------------------------------------------
// Sets
// ---------------------------------------------------------------------------

export interface ScryfallSet {
  /** Stable Scryfall set code, e.g. "fin". */
  code: string;
  name: string;
  /** SVG of the set symbol. */
  iconSvgUri: string | null;
  releasedAt: string | null; // YYYY-MM-DD
}

// A series is a draft of a normal set, so the picker offers the set types a pod
// actually drafts and hides the noise (tokens, promos, memorabilia, Alchemy…).
const DRAFTABLE_SET_TYPES = new Set([
  'core',
  'expansion',
  'draft_innovation',
  'masters',
  'funny', // Un-sets get drafted too
]);

/**
 * Every draftable paper set, newest first — one request that covers the whole
 * picker, so filtering as the user types stays local.
 */
export async function listSets(): Promise<ScryfallSet[]> {
  try {
    const res = await fetch(`${API}/sets`);
    if (!res.ok) return [];
    const json = await res.json();
    return (json.data as any[])
      .filter((s) => DRAFTABLE_SET_TYPES.has(s.set_type) && !s.digital)
      .map((s) => ({
        code: s.code as string,
        name: s.name as string,
        iconSvgUri: (s.icon_svg_uri as string) ?? null,
        releasedAt: (s.released_at as string) ?? null,
      }))
      .sort((a, b) => (b.releasedAt ?? '').localeCompare(a.releasedAt ?? ''));
  } catch {
    return [];
  }
}

/** The raw SVG markup of a set symbol, fetched from its `icon_svg_uri`. */
export async function fetchSetIcon(uri: string): Promise<string | null> {
  if (!uri) return null;
  try {
    const res = await fetch(uri);
    if (!res.ok) return null;
    const svg = await res.text();
    return svg.includes('<svg') ? svg : null;
  } catch {
    return null;
  }
}

/**
 * Scryfall's set symbols are solid black, which is invisible on this theme.
 * Drop the hard-coded fills and put one on the root `<svg>` — children inherit
 * it — so a symbol takes whatever colour it's rendered in. `fill="none"` is
 * left alone: it's what keeps the hollow parts of a two-tone symbol hollow.
 *
 * The result is deliberately a single line with no prolog: react-native-web's
 * <Image> reads svg data uris with /^(data:image\/svg\+xml;utf8,)(.*)/, and
 * `.` doesn't match a newline — a pretty-printed symbol would be truncated at
 * its first line break.
 */
export function tintSvg(svg: string, color: string): string {
  return svg
    .replace(/<\?xml[\s\S]*?\?>/g, '') // prolog — react-native-svg wants the <svg> alone
    .replace(/<!DOCTYPE[\s\S]*?>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '') // a stylesheet would out-rank our fill
    .replace(/\sfill="(?!none")[^"]*"/g, '')
    .replace(/<svg\b/, `<svg fill="${color}"`)
    .replace(/\s+/g, ' ') // whitespace runs are separators in svg; collapsing is safe
    .trim();
}
