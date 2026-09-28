import { getCollection, type CollectionKey } from 'astro:content';
import { isPublished } from './content-policy.mjs';
import { townEligibility } from '../data/territory.mjs';
import { townGate } from './town-gate.mjs';
import { townServiceVisibility } from './town-service-gate.mjs';
import { townServiceId } from '../data/town-services.mjs';
import { communityVisibility } from './community-gate.mjs';
import { communityId, communitySlugProblem } from '../data/communities.mjs';
import { confirmedServices } from '../data/services';
import { PHOTOS } from '../data/photos';
import brief from '../data/brief';
import { servedTowns } from './local-proof.mjs';

/** Routes, hubs, related links and the sitemap all consume the same eligible records.
 *  A published town that fails territory or the differentiation gate stops the build — it does
 *  not quietly ship thin. A town × service record whose file name disagrees with its town and service
 *  stops it too (the name is the record's key), and so does a community record whose file name disagrees with its
 *  town and slug, or whose slug is a service's or a reserved word. */
export async function getPublishedCollection<C extends CollectionKey>(collection: C) {
  const entries = await getCollection(collection, (entry) => isPublished(entry.data));
  if (collection === 'towns') {
    for (const entry of entries) {
      const data = entry.data as any;
      const t = townEligibility(data.slug);
      if (!t.eligible) throw new Error(`${entry.id}: ${t.reason}`);
      const g = townGate(data, { photos: PHOTOS, served: SERVED_TOWNS });
      if (!g.pass) throw new Error(`${entry.id} is published but fails the town gate: ${g.reasons.join('; ')}`);
    }
  }
  if (collection === 'townServices') for (const entry of entries) assertTownServiceId(entry.id, entry.data as any);
  if (collection === 'communities') for (const entry of entries) assertCommunityId(entry.id, entry.data as any);
  return entries;
}

/** The towns Brian has confirmed NoCo works, in his words (.site/truth/brief.json service_areas). */
export const SERVED_TOWNS = servedTowns(brief);

/** Whether any community record is on disk. Until the first one lands, the readers skip the collection rather than
 *  have Astro warn that it is empty once per page built. */
export const HAS_COMMUNITIES = Object.keys(import.meta.glob('../content/communities/*.json')).length > 0;

/** src/content/communities/{town}--{community}.json: the file name must be the record's own town and slug, and the
 *  slug may never take a service's or a reserved segment under /areas/{town}-co/ (src/data/communities.mjs). */
export function assertCommunityId(id: string, data: { town: string; slug: string }) {
  const want = communityId(data.town, data.slug);
  if (id !== want) throw new Error(`src/content/communities/${id}.json holds town "${data.town}" and slug "${data.slug}" — name it ${want}.json`);
  const problem = communitySlugProblem(data.slug);
  if (problem) throw new Error(`src/content/communities/${id}.json: ${problem}`);
}

/**
 * Community pages that exist at launch and go in the sitemap: published, passing the community gate
 * (src/lib/community-gate.mjs), their town page published. check-content fails a published record that fails the
 * gate before the build starts; this leaves it out regardless.
 */
export async function publishedCommunities() {
  if (!HAS_COMMUNITIES) return [];
  const towns = new Set((await getPublishedCollection('towns')).map((t) => (t.data as any).slug as string));
  const entries = await getPublishedCollection('communities');
  return entries.filter((e) => {
    const d = e.data as any;
    return communityVisibility(d, { showDrafts: false, townVisible: towns.has(d.town), townPublished: towns.has(d.town), photos: PHOTOS }).sitemap;
  });
}

/** src/content/town-services/{town}--{service}.json: the file name must be the record's own town and service. */
export function assertTownServiceId(id: string, data: { town: string; service: string }) {
  const want = townServiceId(data.town, data.service);
  if (id !== want) throw new Error(`src/content/town-services/${id}.json holds town "${data.town}" and service "${data.service}" — name it ${want}.json`);
}

/**
 * Town × service pages that exist at launch and go in the sitemap: published, passing the town × service
 * gate (src/lib/town-service-gate.mjs), their town page published and their service confirmed. check-content
 * fails a published record that fails the gate before the build starts; this leaves it out regardless.
 */
export async function publishedTownServices() {
  const towns = new Set((await getPublishedCollection('towns')).map((t) => (t.data as any).slug as string));
  const confirmed = new Set(confirmedServices.map((s) => s.slug));
  const entries = await getPublishedCollection('townServices');
  return entries.filter((e) => {
    const d = e.data as any;
    return townServiceVisibility(d, {
      showDrafts: false, townVisible: towns.has(d.town), serviceVisible: confirmed.has(d.service),
      townPublished: towns.has(d.town), serviceConfirmed: confirmed.has(d.service), photos: PHOTOS,
    }).sitemap;
  });
}
