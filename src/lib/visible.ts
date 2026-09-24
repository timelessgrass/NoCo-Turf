/**
 * What exists on the site right now. At launch: only published records (and they must pass their gates —
 * published-content.ts). During PRELAUNCH preview (SHOW_DRAFTS): drafts render too, flagged, so the whole
 * site can be reviewed. The sitemap never reads this — it reads published-content.ts directly.
 */
import { getCollection } from 'astro:content';
import { SHOW_DRAFTS } from '../data/site';
import { getPublishedCollection } from './published-content';
import { NOCO_TOWNS, REGIONS } from '../data/territory.mjs';

export async function visibleTowns() {
  const entries = SHOW_DRAFTS ? await getCollection('towns') : await getPublishedCollection('towns');
  const bySlug = new Map(entries.map((e) => [(e.data as any).slug as string, e]));
  return NOCO_TOWNS.filter((t) => bySlug.has(t.slug)).map((t) => ({ ...t, entry: bySlug.get(t.slug)!, draft: (bySlug.get(t.slug)!.data as any).status !== 'published' }));
}

export async function visibleGuides() {
  const entries = SHOW_DRAFTS ? await getCollection('guides') : await getPublishedCollection('guides');
  const order = ['turf-rules-northern-colorado', 'hoa-turf-approval', 'turf-rebates-northern-colorado', 'water-savings', 'artificial-turf-cost'];
  return entries.sort((a, b) => (order.indexOf(a.id) + 99) % 99 - (order.indexOf(b.id) + 99) % 99)
    .map((e) => ({ id: e.id, entry: e, draft: (e.data as any).status !== 'published' }));
}

export function townsByRegion<T extends { region: string }>(towns: T[]) {
  return Object.entries(REGIONS).map(([key, label]) => ({ key, label, towns: towns.filter((t) => t.region === key) }))
    .filter((r) => r.towns.length);
}

/** Short menu label for a guide, from its title before the brand suffix. */
export const guideLabel = (title: string) => title.replace(/\s*\|\s*NoCo Turf Co\.?\s*$/, '');
