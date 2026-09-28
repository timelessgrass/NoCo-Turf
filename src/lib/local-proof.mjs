/**
 * Local proof, shared by the three location gates (town-gate.mjs, town-service-gate.mjs, community-gate.mjs).
 *
 * The 2026-09-28 doorway review (audit/location-pages-2026-09-28) found the gates trusted what a record says about
 * itself: any photo path passed the town gate, a town × service photo could come from another town, and nothing
 * asked whether NoCo actually works the place or has done a job there. Google's test for a place page is whether
 * it carries something no other page has and the owner would miss it. For a turf installer that is:
 *   - Brian has said, in his own words, that NoCo works the town: its entry in .site/truth/brief.json
 *     `service_areas` has a confirmed status and a client source with its detail (the list was the agency's call,
 *     2026-09-24, so an operator or derived source never counts)
 *   - a real photo from the place: a src/data/photos.ts entry whose `place` names it (what the page itself shows)
 *   - a job or a review from the place, printed on the page: a `job` or `review` block that is own, runs to its
 *     word floor, names the place, and (for a review) links to where it was posted. A town × service page needs
 *     one whose `use` is that service's.
 */

/** A block's words: its takeaway and its paragraphs. */
export function blockWords(b) {
  return [b?.takeaway, ...(b?.paras ?? [])].filter((s) => typeof s === 'string').join(' ').split(/\s+/).filter(Boolean).length;
}
/** A block counts as substance from this many words; a one-line block is a heading, not substance. */
export const SUBSTANTIVE_WORDS = 30;

/** brief.json statuses that count as Brian's confirmation. INFERENCE (the agency's list) never does. */
export const CONFIRMED_STATUSES = new Set(['VERIFIED', 'CLIENT_STATED', 'CLIENT_CONFIRMED']);
/** Sources that are the agency's own, not Brian's word. */
const AGENCY_SOURCES = new Set(['operator_decision', 'derived']);

/** Town slugs Brian has confirmed NoCo works, from brief.json `service_areas`: a confirmed status, a client source
 *  and the detail of where he said it. */
export function servedTowns(brief) {
  return new Set((brief?.service_areas ?? [])
    .filter((a) => CONFIRMED_STATUSES.has(String(a?.name?.status)) && !!a?.name?.source
      && !AGENCY_SOURCES.has(String(a.name.source)) && !!String(a.name.source_detail ?? '').trim())
    .map((a) => a.slug));
}

/** Whether a place string names a place, as a whole name: "Highland Meadows, Windsor" names Windsor, not Mead. */
export function namesPlace(p, name) {
  if (!name) return false;
  const esc = String(name).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(^|[^A-Za-z])${esc}([^A-Za-z]|$)`).test(String(p?.place ?? ''));
}

/** Block kinds that are first-hand proof: they come from Brian's own ledger or a customer, never from research. */
export const PROOF_KINDS = ['job', 'review'];
/** A review is often short; a job needs the substance of any other block. */
const PROOF_WORDS = { job: SUBSTANTIVE_WORDS, review: 12 };
const blockText = (b) => [b?.h2, b?.takeaway, ...(b?.paras ?? [])].filter((s) => typeof s === 'string').join(' ');

/**
 * The job and review blocks that prove work in a place: own, at their word floor, naming the place, a review linked
 * to where it was posted, and (when `use` is given) about that use. `use` is a src/content/work use.
 */
export function proofBlocks(blocks, placeName, use) {
  return (blocks ?? []).filter((b) => PROOF_KINDS.includes(b?.kind) && b.own === true
    && blockWords(b) >= PROOF_WORDS[b.kind]
    && namesPlace({ place: blockText(b) }, placeName)
    && (b.kind !== 'review' || (b.sources ?? []).length > 0)
    && (!use || b.use === use));
}

/** src/data/photos.ts use → the block and work-record use (the two lists name the play use differently). */
const WORK_USE = { play: 'playground' };
export const workUseOf = (photoUse) => WORK_USE[photoUse] ?? photoUse;

/**
 * Photos as a list of { id, use?, place?, community? }. Accepts src/data/photos.ts PHOTOS, any such list, or a
 * Map id → use (a string) or id → { use, place, community } (scripts/check-content.mjs reads photos.ts as text).
 */
export function photoList(photos) {
  if (!photos) return [];
  if (photos instanceof Map) return [...photos].map(([id, p]) => ({ id, ...(typeof p === 'string' ? { use: p } : p) }));
  return [...photos];
}
