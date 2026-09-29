#!/usr/bin/env node
/**
 * After `astro build`: a link written inside record text (a guide or service body, a town block) to a content page
 * that is not live in this build becomes plain text. At launch (2026-09-29) most guides, every town × service page
 * and every neighborhood are still earning their gates, and guides link to each other freely; each batch that ships
 * later would otherwise break the build on links to the ones still waiting.
 *
 * Only paths that belong to a content record on disk are unwrapped (/guides/{id}/, /guides/{topic}/,
 * /areas/{town}/, /areas/{town}/{service}/, /areas/{town}/{community}/, /services/{slug}/); any other internal link
 * that points nowhere is left alone, so scripts/check-links.py still fails a real typo. Hand-written links in
 * components are dropped at their source instead (src/lib/live.ts).
 *
 *   node scripts/unlink-unpublished.mjs dist
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.resolve(process.argv[2] ?? 'dist');
const content = path.join(REPO, 'src/content');
const list = (dir, ext) => (fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => f.endsWith(ext)).map((f) => f.slice(0, -ext.length)) : []);

/** Every page path a content record could have. */
const known = new Set();
for (const slug of list(path.join(content, 'towns'), '.json')) known.add(`/areas/${slug}/`);
for (const id of [...list(path.join(content, 'town-services'), '.json'), ...list(path.join(content, 'communities'), '.json')]) {
  const [town, seg] = id.split('--');
  if (town && seg) known.add(`/areas/${town}/${seg}/`);
}
for (const id of list(path.join(content, 'guides'), '.md')) known.add(`/guides/${id}/`);
for (const slug of list(path.join(content, 'services'), '.md')) known.add(`/services/${slug}/`);
const topics = fs.readFileSync(path.join(REPO, 'src/data/guide-topics.ts'), 'utf8');
for (const m of topics.matchAll(/^\s{4}slug: '([a-z0-9-]+)'/gm)) known.add(`/guides/${m[1]}/`);

const built = (p) => fs.existsSync(path.join(dist, p, 'index.html'));
const A = /<a\b[^>]*?\shref="(\/[^"#?]*)(?:[#?][^"]*)?"[^>]*>([\s\S]*?)<\/a>/g; // \s, so data-href and xlink:href never match

let links = 0;
const pages = new Set();
const targets = new Set();
const walk = (dir) => {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const f = path.join(dir, e.name);
    if (e.isDirectory()) walk(f);
    else if (e.name.endsWith('.html')) {
      const html = fs.readFileSync(f, 'utf8');
      const out = html.replace(A, (whole, href, inner) => {
        if (!known.has(href) || built(href)) return whole;
        links++; pages.add(f); targets.add(href);
        return inner;
      });
      if (out !== html) fs.writeFileSync(f, out);
    }
  }
};
if (!fs.existsSync(dist)) { console.error(`unlink-unpublished: no ${dist}`); process.exit(1); }
walk(dist);
console.log(`unlink-unpublished: ${links} link(s) on ${pages.size} page(s) to ${targets.size} page(s) not live yet, now plain text`);
