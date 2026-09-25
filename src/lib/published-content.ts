import { getCollection, type CollectionKey } from 'astro:content';
import { isPublished } from './content-policy.mjs';
import { townEligibility } from '../data/territory.mjs';
import { townGate } from './town-gate.mjs';
import { townServiceVisibility } from './town-service-gate.mjs';
import { townServiceId } from '../data/town-services.mjs';
import { confirmedServices } from '../data/services';
import { PHOTOS } from '../data/photos';

/** Routes, hubs, related links and the sitemap all consume the same eligible records.
 *  A published town that fails territory or the differentiation gate stops the build — it does
 *  not quietly ship thin. A town × service record whose file name disagrees with its town and service
 *  stops it too (the name is the record's key). */
export async function getPublishedCollection<C extends CollectionKey>(collection: C) {
  const entries = await getCollection(collection, (entry) => isPublished(entry.data));
  if (collection === 'towns') {
    for (const entry of entries) {
      const data = entry.data as any;
      const t = townEligibility(data.slug);
      if (!t.eligible) throw new Error(`${entry.id}: ${t.reason}`);
      const g = townGate(data);
      if (!g.pass) throw new Error(`${entry.id} is published but fails the town gate: ${g.reasons.join('; ')}`);
    }
  }
  if (collection === 'townServices') for (const entry of entries) assertTownServiceId(entry.id, entry.data as any);
  return entries;
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
