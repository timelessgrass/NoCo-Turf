/**
 * Which content pages exist in this build, for the links a component writes by hand: an FAQ's "Read more", the
 * "What it's like to live with" links, the HOA-approval button. At launch most guides, the town × service pages and
 * the neighborhoods are still earning their gates, so a hand-written link to one is dropped here, at its source.
 * Links written inside record text (Markdown bodies) are unwrapped after the build by
 * scripts/unlink-unpublished.mjs. Anything else that points nowhere still fails check-links.
 */
import { visibleGuides, visibleTopics, visibleTowns, visibleTownServices, visibleCommunities } from './visible';

let cache: Promise<Set<string>> | undefined;

/** Every /guides/… and /areas/… page path that renders in this build. */
export function livePaths(): Promise<Set<string>> {
  return (cache ??= (async () => {
    const paths = new Set<string>();
    for (const g of await visibleGuides()) paths.add(`/guides/${g.id}/`);
    for (const t of await visibleTopics()) paths.add(`/guides/${t.slug}/`);
    for (const t of await visibleTowns()) paths.add(`/areas/${t.slug}/`);
    for (const p of await visibleTownServices()) paths.add(p.path);
    for (const c of await visibleCommunities()) paths.add(c.path);
    return paths;
  })());
}

/** The href when its page renders, or when it is not a guide or area page at all; undefined when it points at a
 *  page that is not live yet. */
export async function liveHref(href?: string): Promise<string | undefined> {
  if (!href) return undefined;
  const path = href.split(/[#?]/)[0];
  if (!/^\/(guides|areas)\/[^/]+\//.test(path)) return href;
  return (await livePaths()).has(path) ? href : undefined;
}
