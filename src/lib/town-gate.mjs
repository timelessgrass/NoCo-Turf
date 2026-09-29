/**
 * The differentiation gate for town pages (~/.claude/skills/site/reference/programmatic.md).
 *
 * A town page may publish only if it carries:
 *   - at least three substantive blocks (a block counts from SUBSTANTIVE_WORDS words, the town × service rule),
 *     at least two of them true only of that town (own: true); a city name in a heading is not a block, and a
 *     swapped phone number is not a block
 *   - a source or a layer reference on every block other than a job, photo or review
 *   - Brian's own word that NoCo works the town (.site/truth/brief.json service_areas, src/lib/local-proof.mjs)
 *
 * Launch decision (Ty, 2026-09-29): a town page publishes on its own research and Brian's word. A photo from the
 * town and a job there are what the page should grow into, and check-content reports both as a to-do, but they
 * gate the town × service and community pages (the doorway risk), not the town page, which the 2026-09-28 review
 * rated borderline and which keeps the old site's ranking town URLs alive.
 *
 * Returns { pass, reasons[] } so the checker can print exactly what is missing — the reasons are
 * the research to-do list for that town, not a verdict on the town.
 *
 * ctx: { served } the set of confirmed town slugs (servedTowns(brief)); it defaults to none, so a caller that
 * passes no evidence gets a closed gate. { photos } is accepted for the report and ignored by the gate.
 */
import { townBySlug } from '../data/territory.mjs';
import { blockWords, SUBSTANTIVE_WORDS } from './local-proof.mjs';

/** @param {any} data @param {{ photos?: ReadonlyArray<any> | Map<string, any>, served?: Set<string> }} [ctx] @returns {{ pass: boolean, reasons: string[] }} */
export function townGate(data, { served = new Set() } = {}) {
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
  return { pass: reasons.length === 0, reasons };
}
