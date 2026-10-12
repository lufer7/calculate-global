/**
 * Online display names are GENERATED, never typed by players:
 * no user-generated text => nothing to moderate, nothing offensive to be liable for.
 * Word lists are original and hand-curated so no combination is insulting.
 */
const ADJECTIVES = [
  'Paslı', 'Tozlu', 'Sessiz', 'Kızıl', 'Demir', 'Çevik', 'Yorgun', 'Gölgeli',
  'Bakır', 'Kül', 'Sabırlı', 'Kurnaz', 'Ağır', 'Uykusuz', 'Tuzlu', 'Yaralı',
] as const;
const NOUNS = [
  'Çakal', 'Kartal', 'Boğa', 'Tilki', 'Yengeç', 'Baykuş', 'Akrep', 'Kurt',
  'Atmaca', 'Porsuk', 'Kirpi', 'Keçi', 'Yaban', 'Kertenkele', 'Turna', 'Ayı',
] as const;

/** Deterministic from the anonymous ladder id (hex). */
export function displayNameFromId(id: string): string {
  const n = (i: number) => parseInt(id.slice(i, i + 4), 16) || 0;
  return `${ADJECTIVES[n(0) % ADJECTIVES.length]} ${NOUNS[n(4) % NOUNS.length]} #${(n(8) % 9000) + 1000}`;
}
