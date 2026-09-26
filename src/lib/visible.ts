/**
 * What exists on the site right now. At launch: only published records (and they must pass their gates —
 * published-content.ts). During PRELAUNCH preview (SHOW_DRAFTS): drafts render too, flagged, so the whole
 * site can be reviewed. The sitemap never reads this — it reads published-content.ts directly.
 */
import { getCollection } from 'astro:content';
import { SHOW_DRAFTS } from '../data/site';
import { getPublishedCollection, publishedTownServices, assertTownServiceId, publishedCommunities, assertCommunityId, HAS_COMMUNITIES } from './published-content';
import { communityVisibility } from './community-gate.mjs';
import { communityPath } from '../data/communities.mjs';
import { NOCO_TOWNS, REGIONS } from '../data/territory.mjs';
import { GUIDE_TOPICS, topicBySlug } from '../data/guide-topics';
import { SERVICES, visibleServices } from '../data/services';
import { TOWN_SERVICES, townServiceBySlug, townServicePath } from '../data/town-services.mjs';
import { townServiceVisibility } from './town-service-gate.mjs';
import { PHOTOS } from '../data/photos';

export async function visibleTowns() {
  const entries = SHOW_DRAFTS ? await getCollection('towns') : await getPublishedCollection('towns');
  const bySlug = new Map(entries.map((e) => [(e.data as any).slug as string, e]));
  return NOCO_TOWNS.filter((t) => bySlug.has(t.slug)).map((t) => ({ ...t, entry: bySlug.get(t.slug)!, draft: (bySlug.get(t.slug)!.data as any).status !== 'published' }));
}

/**
 * Town × service pages (/areas/{town}-co/{service}/) that exist in this build, in corridor order (the town's
 * order in territory.mjs), then the order of src/data/town-services.mjs. PRELAUNCH preview: every record whose
 * town page and service are visible, drafts flagged. Launch: published, passing the town × service gate, with
 * a visible town page and a confirmed service (publishedTownServices). One rule for the route, the town
 * page's "by service" list, the service page's "by town" list and the sitemap: townServiceVisibility.
 */
export async function visibleTownServices() {
  const towns = await visibleTowns();
  const townBy = new Map(towns.map((t) => [t.slug, t]));
  const shown = new Set(visibleServices.map((s) => s.slug));
  const entries = SHOW_DRAFTS ? await getCollection('townServices') : await publishedTownServices();
  const TOWN_RANK = new Map(NOCO_TOWNS.map((t, i) => [t.slug, i]));
  const SERVICE_RANK = new Map(TOWN_SERVICES.map((s, i) => [s.slug, i]));
  return entries.map((entry) => {
    const d = entry.data as any;
    assertTownServiceId(entry.id, d);
    const town = townBy.get(d.town);
    const service = SERVICES.find((s) => s.slug === d.service)!;
    const v = townServiceVisibility(d, {
      showDrafts: SHOW_DRAFTS, townVisible: !!town, serviceVisible: shown.has(d.service),
      townPublished: !!town && !town.draft, serviceConfirmed: service.confirmed, photos: PHOTOS,
    });
    return { id: entry.id, entry, town: town!, service, meta: townServiceBySlug[d.service], path: townServicePath(d.town, d.service), draft: v.draft, render: v.render };
  }).filter((p) => p.render)
    .sort((a, b) => (TOWN_RANK.get(a.town.slug)! - TOWN_RANK.get(b.town.slug)!) || (SERVICE_RANK.get(a.service.slug)! - SERVICE_RANK.get(b.service.slug)!));
}

/**
 * Community pages (/areas/{town}-co/{community}/) that exist in this build, in corridor order (the town's order in
 * territory.mjs), then by name. PRELAUNCH preview: every record whose town page is visible, drafts flagged. Launch:
 * published, passing the community gate, with a visible town page (publishedCommunities). One rule for the route,
 * the town page's neighborhoods list, /areas/, the putting-green page's golf line and the sitemap:
 * communityVisibility.
 */
export async function visibleCommunities() {
  if (!HAS_COMMUNITIES) return [];
  const towns = await visibleTowns();
  const townBy = new Map(towns.map((t) => [t.slug, t]));
  const entries = SHOW_DRAFTS ? await getCollection('communities') : await publishedCommunities();
  const TOWN_RANK = new Map(NOCO_TOWNS.map((t, i) => [t.slug, i]));
  return entries.map((entry) => {
    const d = entry.data as any;
    assertCommunityId(entry.id, d);
    const town = townBy.get(d.town);
    const v = communityVisibility(d, { showDrafts: SHOW_DRAFTS, townVisible: !!town, townPublished: !!town && !town.draft, photos: PHOTOS });
    return { id: entry.id, entry, slug: d.slug as string, name: d.name as string, kind: d.kind as string, town: town!, path: communityPath(d.town, d.slug), draft: v.draft, render: v.render };
  }).filter((c) => c.render)
    .sort((a, b) => (TOWN_RANK.get(a.town.slug)! - TOWN_RANK.get(b.town.slug)!) || a.name.localeCompare(b.name));
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
