/** One publication policy shared by Astro routes, the sitemap and the prebuild checks. */
export const CONTENT_STATUSES = ['draft', 'review', 'published'];

/**
 * Today in Northern Colorado time, YYYY-MM-DD. The weekly blog (care plan) merges posts
 * ahead with a future `published` date; they exist on the site only from the
 * first build on or after that date. Netlify builds in UTC, so the date is
 * read in the business's own time zone. BLOG_TODAY overrides it for a preview
 * build (BLOG_TODAY=2027-01-31 shows the whole queue). Never set it on Netlify.
 */
export function todayHere(now = new Date()) {
  const override = globalThis.process?.env?.BLOG_TODAY;
  if (override) return override;
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Denver', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}

/** Published, and its date has arrived. Every route, the sitemap and the prebuild checks read this. */
export function isPublished(data) {
  if (data?.status !== 'published') return false;
  const date = typeof data?.published === 'string' ? data.published.slice(0, 10) : '';
  return !date || date <= todayHere();
}

export function assertUniqueRoutes(paths) {
  const seen = new Set();
  for (const path of paths) {
    if (seen.has(path)) throw new Error(`Duplicate content route: ${path}`);
    seen.add(path);
  }
}

/**
 * Town × service pages and community pages share /areas/{town}-co/{segment}/ — one route file,
 * src/pages/areas/[slug]/[service].astro. Two records that would claim one path stop the build, naming both, rather
 * than one page silently replacing the other. `children` is [{ path, what }], `what` naming the record file.
 */
export function assertAreaChildren(children) {
  const seen = new Map();
  for (const c of children) {
    if (seen.has(c.path)) {
      throw new Error(`${c.path} is claimed twice: by ${seen.get(c.path)} and by ${c.what}. /areas/{town}-co/{segment}/ holds one page — a community slug may never be a service slug or a reserved word (src/data/communities.mjs); rename the community.`);
    }
    seen.set(c.path, c.what);
  }
}

/**
 * Topic hubs (/guides/{topic}/) and guides (/guides/{id}/) share one namespace. A guide id that equals a
 * topic slug would make two pages claim one URL, so both routes call this and the build stops.
 */
export function assertGuideNamespace(guideIds, topicSlugs) {
  const topics = new Set(topicSlugs);
  const clash = [...guideIds].filter((id) => topics.has(id));
  if (clash.length) {
    throw new Error(`Guide id${clash.length > 1 ? 's' : ''} ${clash.map((c) => `"${c}"`).join(', ')} equal${clash.length > 1 ? '' : 's'} a topic slug (src/data/guide-topics.ts) — /guides/${clash[0]}/ cannot be both a guide and a topic hub. Rename the guide file.`);
  }
}
