/** One publication policy shared by Astro routes, the sitemap and the prebuild checks. */
export const CONTENT_STATUSES = ['draft', 'review', 'published'];

export function isPublished(data) {
  return data?.status === 'published';
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
