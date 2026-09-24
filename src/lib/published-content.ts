import { getCollection, type CollectionKey } from 'astro:content';
import { isPublished } from './content-policy.mjs';
import { townEligibility } from '../data/territory.mjs';
import { townGate } from './town-gate.mjs';

/** Routes, hubs, related links and the sitemap all consume the same eligible records.
 *  A published town that fails territory or the differentiation gate stops the build — it does
 *  not quietly ship thin. */
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
  return entries;
}
