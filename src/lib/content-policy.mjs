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
