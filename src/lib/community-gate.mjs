/**
 * The differentiation gate for community pages (/areas/{town}-co/{community}/), the sibling of
 * src/lib/town-service-gate.mjs. A neighborhood page earns its URL only with substance that is true of that
 * neighborhood and no other: its own design guidelines, its course, its lots — not the town's water bill.
 *
 * A page passes when it has:
 *   - at least 3 substantive blocks: a block counts once its paragraphs (and takeaway) run to SUBSTANTIVE_WORDS
 *     words (the town × service rule, shared)
 *   - at least 2 of those `own`: true of THIS community only
 *   - a source or a layer reference on every block other than a job, photo or review (those come from Brian's
 *     own ledger, like on the town and town × service pages)
 *   - a real photograph from src/data/photos.ts that belongs here: its `community` is this community's id, or its
 *     `place` names this community or its town (the camera original puts it there; the caption says where)
 *
 * Returns { pass, reasons[] } like the other gates: the reasons are the research to-do list for that page.
 * `photos` is src/data/photos.ts PHOTOS, or any list of { id, place, community? }, or a Map id → { place, community? }.
 */
import { blockWords, SUBSTANTIVE_WORDS } from './town-service-gate.mjs';
import { isPublished } from './content-policy.mjs';
import { townBySlug } from '../data/territory.mjs';
import { communityId } from '../data/communities.mjs';

const NEEDS_NO_SOURCE = ['job', 'photo', 'review'];

/** @typedef {{ place?: string, community?: string }} PhotoPlace */
/** @typedef {ReadonlyArray<{ id: string } & PhotoPlace> | Map<string, PhotoPlace>} PhotoPlaces */

/** @param {PhotoPlaces | undefined} photos @param {string} id @returns {PhotoPlace | undefined} */
function photoOf(photos, id) {
  if (!photos) return undefined;
  if (photos instanceof Map) return photos.get(id);
  return photos.find((p) => p?.id === id);
}

/** Whether a photo belongs on this community's page: tagged with its id, or taken in it or in its town. */
export function photoBelongs(p, data) {
  if (!p) return false;
  const town = townBySlug[data?.town]?.name;
  const place = String(p.place ?? '');
  return (!!data?.town && !!data?.slug && p.community === communityId(data.town, data.slug))
    || (!!data?.name && place.includes(data.name))
    || (!!town && place.includes(town));
}

/** @param {any} data @param {PhotoPlaces} [photos] @returns {{ pass: boolean, reasons: string[] }} */
export function communityGate(data, photos = []) {
  const reasons = [];
  const blocks = data?.blocks ?? [];
  const counted = blocks.map((b, i) => ({ b, i, words: blockWords(b) }));
  const substantive = counted.filter((x) => x.words >= SUBSTANTIVE_WORDS);
  const own = substantive.filter((x) => x.b.own);
  if (substantive.length < 3) {
    const thin = counted.filter((x) => x.words < SUBSTANTIVE_WORDS).map((x) => `block ${x.i + 1} (${x.b.kind}) has ${x.words}`);
    reasons.push(`${substantive.length} substantive blocks — needs ≥3 (a block counts from ${SUBSTANTIVE_WORDS} words${thin.length ? `; ${thin.join(', ')}` : ''})`);
  }
  if (own.length < 2) reasons.push(`${own.length} own blocks (true of this community only) — needs ≥2`);
  for (const { b, i } of counted) {
    if (!b.sources?.length && !b.layerRefs?.length && !NEEDS_NO_SOURCE.includes(b.kind)) {
      reasons.push(`block ${i + 1} (${b.kind}) has no source and no layer reference`);
    }
  }

  const name = data?.name ?? 'this community';
  const town = townBySlug[data?.town]?.name ?? 'its town';
  if (!data?.photo) {
    reasons.push(`no photograph — needs a real photo from src/data/photos.ts whose place names ${name} or ${town} (or whose community is ${data?.town && data?.slug ? communityId(data.town, data.slug) : 'this community'})`);
  } else {
    const p = photoOf(photos, data.photo);
    if (!p) reasons.push(`photo "${data.photo}" is not in src/data/photos.ts`);
    else if (!photoBelongs(p, data)) reasons.push(`photo "${data.photo}" was taken ${p.place ?? 'somewhere unnamed'} — a ${name} page needs a photo whose place names ${name} or ${town}`);
  }
  return { pass: reasons.length === 0, reasons };
}

/**
 * Whether a community page exists in this build, and whether the sitemap may list it — one rule for the route, the
 * town page's neighborhoods list, /areas/, the putting-green page's golf line and the sitemap (src/lib/visible.ts,
 * published-content.ts):
 *   PRELAUNCH preview (showDrafts) — every record renders (drafts carry the Draft ribbon) while its town page is visible
 *   launch                         — only a published record that passes the gate, whose town page is visible
 *   sitemap                        — published, passes the gate, its town page published
 * `draft` is the ribbon: the record is not published.
 *
 * @param {any} data
 * @param {{ showDrafts: boolean, townVisible: boolean, townPublished: boolean, photos?: PhotoPlaces }} ctx
 */
export function communityVisibility(data, { showDrafts, townVisible, townPublished, photos = [] }) {
  const gate = communityGate(data, photos);
  const published = isPublished(data);
  return {
    render: showDrafts ? !!townVisible : published && gate.pass && !!townVisible,
    sitemap: published && gate.pass && !!townPublished,
    draft: !published,
    gate,
  };
}
