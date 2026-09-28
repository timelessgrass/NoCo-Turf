/**
 * The differentiation gate for town pages (~/.claude/skills/site/reference/programmatic.md).
 *
 * A town page may publish only if it carries:
 *   - at least three substantive blocks (a block counts from SUBSTANTIVE_WORDS words, the town × service rule),
 *     at least two of them true only of that town (own: true); a city name in a heading is not a block, and a
 *     swapped phone number is not a block
 *   - a source or a layer reference on every block other than a job, photo or review
 *   - Brian's own word that NoCo works the town (.site/truth/brief.json service_areas, src/lib/local-proof.mjs)
 *   - a real photograph from the town: a src/data/photos.ts entry whose place names it, which is also what the
 *     page shows (TownData.ts townPhotos)
 *   - a job or a review from the town, printed on the page: a job or review block that is own, runs to its word
 *     floor and names the town (src/lib/local-proof.mjs proofBlocks)
 *
 * Returns { pass, reasons[] } so the checker can print exactly what is missing — the reasons are
 * the research to-do list for that town, not a verdict on the town.
 *
 * ctx: { photos } src/data/photos.ts PHOTOS (or a Map, see local-proof.mjs photoList); { served } the set of
 * confirmed town slugs (servedTowns(brief)). Each defaults to nothing, so a caller that passes no evidence gets a
 * closed gate.
 */
import { townBySlug } from '../data/territory.mjs';
import { blockWords, SUBSTANTIVE_WORDS, namesPlace, photoList, proofBlocks } from './local-proof.mjs';

/** @param {any} data @param {{ photos?: ReadonlyArray<any> | Map<string, any>, served?: Set<string> }} [ctx] @returns {{ pass: boolean, reasons: string[] }} */
export function townGate(data, { photos = [], served = new Set() } = {}) {
  const reasons = [];
  const blocks = data?.blocks ?? [];
  const name = townBySlug[data?.slug]?.name ?? data?.name ?? 'this town';
  const counted = blocks.map((b, i) => ({ b, i, words: blockWords(b) }));
  const substantive = counted.filter((x) => x.words >= SUBSTANTIVE_WORDS);
  const own = substantive.filter((x) => x.b.own);
  if (substantive.length < 3) {
    const thin = counted.filter((x) => x.words < SUBSTANTIVE_WORDS).map((x) => `block ${x.i + 1} (${x.b.kind}) has ${x.words}`);
    reasons.push(`${substantive.length} substantive blocks — needs ≥3 (a block counts from ${SUBSTANTIVE_WORDS} words${thin.length ? `; ${thin.join(', ')}` : ''})`);
  }
  if (own.length < 2) reasons.push(`${own.length} town-specific (own) blocks — needs ≥2`);
  for (const { b, i } of counted) {
    if (!b.sources?.length && !b.layerRefs?.length && !['job', 'photo', 'review'].includes(b.kind)) {
      reasons.push(`block ${i + 1} (${b.kind}) has no source and no layer reference`);
    }
  }
  if (!served.has(data?.slug)) reasons.push(`Brian hasn't confirmed NoCo works ${name} — his words go in .site/truth/brief.json service_areas (status CLIENT_CONFIRMED, source and source_detail naming where he said it)`);
  if (!photoList(photos).some((p) => namesPlace(p, name))) reasons.push(`no photograph from ${name} — needs a real photo in src/data/photos.ts whose place names ${name}`);
  if (!proofBlocks(blocks, name).length) reasons.push(`no job or review from ${name} — needs a job block from Brian's ledger (own, ${SUBSTANTIVE_WORDS}+ words, naming ${name}; season and size in words, or cite the record that holds the numbers) or a review block that names ${name} and links to it`);
  return { pass: reasons.length === 0, reasons };
}
