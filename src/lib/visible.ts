/**
 * What exists on the site right now. At launch: only published records (and they must pass their gates —
 * published-content.ts). During PRELAUNCH preview (SHOW_DRAFTS): drafts render too, flagged, so the whole
 * site can be reviewed. The sitemap never reads this — it reads published-content.ts directly.
 */
import { getCollection } from 'astro:content';
import { SHOW_DRAFTS } from '../data/site';
import { getPublishedCollection } from './published-content';
import { NOCO_TOWNS, REGIONS } from '../data/territory.mjs';
import { GUIDE_TOPICS, topicBySlug } from '../data/guide-topics';

export async function visibleTowns() {
  const entries = SHOW_DRAFTS ? await getCollection('towns') : await getPublishedCollection('towns');
  const bySlug = new Map(entries.map((e) => [(e.data as any).slug as string, e]));
  return NOCO_TOWNS.filter((t) => bySlug.has(t.slug)).map((t) => ({ ...t, entry: bySlug.get(t.slug)!, draft: (bySlug.get(t.slug)!.data as any).status !== 'published' }));
}

/**
 * Guides in reading order: by topic (the order of src/data/guide-topics.ts), then the five launch guides in
 * their own order, then every later guide by its title. Numbering, previous/next and the hubs follow it.
 */
const LAUNCH_ORDER = ['turf-rules-northern-colorado', 'hoa-turf-approval', 'turf-rebates-northern-colorado', 'water-savings', 'artificial-turf-cost'];
const TOPIC_RANK = new Map(GUIDE_TOPICS.map((t, i) => [t.slug, i]));
const launchRank = (id: string) => { const i = LAUNCH_ORDER.indexOf(id); return i < 0 ? LAUNCH_ORDER.length : i; };

export async function visibleGuides() {
  const entries = SHOW_DRAFTS ? await getCollection('guides') : await getPublishedCollection('guides');
  return entries
    .map((e) => ({ id: e.id, entry: e, topic: topicBySlug[e.data.topic], draft: e.data.status !== 'published' }))
    .sort((a, b) => (TOPIC_RANK.get(a.topic.slug)! - TOPIC_RANK.get(b.topic.slug)!) || (launchRank(a.id) - launchRank(b.id))
      || guideLabel(a.entry.data.title).localeCompare(guideLabel(b.entry.data.title)));
}

/** From this many visible guides, /guides/ adds its filter box; below it the topic index alone does the job. */
export const GUIDE_FILTER_FROM = 12;

/** Topics that have at least one visible guide, in registry order, each with its guides and its number
 *  among them. A topic with none gets no hub, no nav entry and no mention — never an empty page. */
export async function visibleTopics() {
  const guides = await visibleGuides();
  return GUIDE_TOPICS.map((t) => ({ ...t, guides: guides.filter((g) => g.topic.slug === t.slug) }))
    .filter((t) => t.guides.length > 0)
    .map((t, i) => ({ ...t, no: i + 1 }));
}

export function townsByRegion<T extends { region: string }>(towns: T[]) {
  return Object.entries(REGIONS).map(([key, label]) => ({ key, label, towns: towns.filter((t) => t.region === key) }))
    .filter((r) => r.towns.length);
}

/** Short menu label for a guide, from its title before the brand suffix. */
export const guideLabel = (title: string) => title.replace(/\s*\|\s*NoCo Turf Co\.?\s*$/, '');
