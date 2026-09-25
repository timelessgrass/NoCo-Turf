/**
 * The differentiation gate for town × service pages (/areas/{town}-co/{service}/), the sibling of
 * src/lib/town-gate.mjs (~/.claude/skills/site/reference/programmatic.md: a {service} × {city} leaf needs
 * substance that exists on no other page, or it is a doorway).
 *
 * A page passes when it has:
 *   - at least 3 substantive blocks: a block counts once its paragraphs (and takeaway) run to
 *     SUBSTANTIVE_WORDS words — a one-line block is a heading, not substance
 *   - at least 2 of those `own`: true of THIS town for THIS use (Windsor's golf-course lots on a putting-green
 *     page, not Windsor's water bill, which is true of every use)
 *   - a source or a layer reference on every block other than a job, photo or review
 *   - a real photograph from src/data/photos.ts whose `use` matches the service: putting-greens →
 *     putting-green, pet-turf → pet, playground-turf → play, commercial-turf → commercial (no photo carries
 *     that use yet: it arrives with Brian's own commercial photos)
 *
 * Returns { pass, reasons[] } like townGate: the reasons are the research to-do list for that page.
 * `photos` is src/data/photos.ts PHOTOS (or any list of { id, use }, or a Map id → use).
 */
import { townServiceBySlug, TOWN_SERVICE_SLUGS } from '../data/town-services.mjs';
import { isPublished } from './content-policy.mjs';

export const SUBSTANTIVE_WORDS = 30;
const NEEDS_NO_SOURCE = ['job', 'photo', 'review'];

/** Words a block says: its takeaway and its paragraphs. */
export function blockWords(b) {
  return [b?.takeaway, ...(b?.paras ?? [])].filter((s) => typeof s === 'string').join(' ').split(/\s+/).filter(Boolean).length;
}

/** @typedef {ReadonlyArray<{ id: string, use: string }> | Map<string, string>} PhotoUses */

/** @param {PhotoUses | undefined} photos @param {string} id @returns {string | undefined} */
function useOf(photos, id) {
  if (!photos) return undefined;
  if (photos instanceof Map) return photos.get(id);
  return photos.find((p) => p?.id === id)?.use;
}

/** @param {any} data @param {PhotoUses} [photos] @returns {{ pass: boolean, reasons: string[] }} */
export function townServiceGate(data, photos = []) {
  const reasons = [];
  const blocks = data?.blocks ?? [];
  const counted = blocks.map((b, i) => ({ b, i, words: blockWords(b) }));
  const substantive = counted.filter((x) => x.words >= SUBSTANTIVE_WORDS);
  const own = substantive.filter((x) => x.b.own);
  if (substantive.length < 3) {
    const thin = counted.filter((x) => x.words < SUBSTANTIVE_WORDS).map((x) => `block ${x.i + 1} (${x.b.kind}) has ${x.words}`);
    reasons.push(`${substantive.length} substantive blocks — needs ≥3 (a block counts from ${SUBSTANTIVE_WORDS} words${thin.length ? `; ${thin.join(', ')}` : ''})`);
  }
  if (own.length < 2) reasons.push(`${own.length} own blocks (true of this town for this use) — needs ≥2`);
  for (const { b, i } of counted) {
    if (!b.sources?.length && !b.layerRefs?.length && !NEEDS_NO_SOURCE.includes(b.kind)) {
      reasons.push(`block ${i + 1} (${b.kind}) has no source and no layer reference`);
    }
  }

  const svc = townServiceBySlug[data?.service];
  if (!svc) reasons.push(`service "${data?.service}" has no town pages — one of ${TOWN_SERVICE_SLUGS.join(', ')}`);
  if (!data?.photo) {
    reasons.push(svc?.photoUse === 'commercial'
      ? 'no photograph — needs a photo of Brian\'s own commercial, HOA or sports job, added to src/data/photos.ts with use "commercial" (none carries it yet)'
      : `no photograph — needs a real photo of this use (src/data/photos.ts use "${svc?.photoUse ?? '?'}")`);
  } else {
    const use = useOf(photos, data.photo);
    if (use === undefined) reasons.push(`photo "${data.photo}" is not in src/data/photos.ts`);
    else if (svc && use !== svc.photoUse) reasons.push(`photo "${data.photo}" shows use "${use}" — a ${data.service} page needs a photo with use "${svc.photoUse}"`);
  }
  return { pass: reasons.length === 0, reasons };
}

/**
 * Whether a town × service page exists in this build, and whether the sitemap may list it. One rule for
 * the route, the town and service pages' links and the sitemap (src/lib/visible.ts, published-content.ts):
 *   PRELAUNCH preview (showDrafts) — every record renders (drafts carry the Draft ribbon) while its town page
 *                                    and its service are visible
 *   launch                         — only a published record that passes the gate, whose town page is
 *                                    visible and whose service is visible (confirmed)
 *   sitemap                        — published, passes the gate, town page published, service confirmed
 * `draft` is the ribbon: the record is not published, or its service is not confirmed yet.
 *
 * @param {any} data
 * @param {{ showDrafts: boolean, townVisible: boolean, serviceVisible: boolean, townPublished: boolean, serviceConfirmed: boolean, photos?: PhotoUses }} ctx
 */
export function townServiceVisibility(data, { showDrafts, townVisible, serviceVisible, townPublished, serviceConfirmed, photos = [] }) {
  const gate = townServiceGate(data, photos);
  const published = isPublished(data);
  const launchable = published && gate.pass && !!townVisible && !!serviceVisible;
  return {
    render: showDrafts ? !!townVisible && !!serviceVisible : launchable,
    sitemap: published && gate.pass && !!townPublished && !!serviceConfirmed,
    draft: !published || !serviceConfirmed,
    gate,
  };
}
