/**
 * One sitemap.xml listing exactly the indexable routes — built from the same data the pages are,
 * so a published record cannot ship absent from it and a draft cannot leak into it.
 * During PRELAUNCH it is empty: nothing is meant to be indexed yet.
 */
import type { APIRoute } from 'astro';
import { SITE, PRELAUNCH } from '../data/site';
import { getPublishedCollection } from '../lib/published-content';
import { confirmedServices } from '../data/services';
import { assertUniqueRoutes } from '../lib/content-policy.mjs';

export async function routes(): Promise<string[]> {
  const towns = await getPublishedCollection('towns');
  const guides = await getPublishedCollection('guides');
  const work = await getPublishedCollection('work');
  const all = [
    '/',
    ...(confirmedServices.length ? ['/services/', ...confirmedServices.map((s) => `/services/${s.slug}/`)] : []),
    '/about/', '/contact/', '/privacy/', '/terms/',
    ...(towns.length ? ['/areas/'] : []),
    ...towns.map((t) => `/areas/${(t.data as any).slug}/`),
    ...(guides.length ? ['/guides/'] : []),
    ...guides.map((g) => `/guides/${g.id}/`),
    ...(work.length ? ['/work/'] : []),
    ...work.map((w) => `/work/${w.id}/`),
  ];
  assertUniqueRoutes(all);
  return all;
}

export const GET: APIRoute = async () => {
  const list = PRELAUNCH ? [] : await routes();
  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${list.map((r) => `  <url><loc>${SITE}${r}</loc></url>`).join('\n')}
</urlset>
`;
  return new Response(body, { headers: { 'Content-Type': 'application/xml' } });
};
