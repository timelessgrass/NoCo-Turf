/**
 * tests/redirects.test.mjs: the 301/410 map (public/_redirects) against the URL inventory and the plan.
 *
 *   node --test tests/redirects.test.mjs                  map, inventory, planned routes (no build needed)
 *   LAUNCH_CHECK=1 node --test tests/redirects.test.mjs   also: every 301 target is built in dist/
 *
 * What it proves:
 *   1. Every old URL we know of (the 45 sitemap URLs of the current site, the 6 ghost pages, the 2024–26
 *      apex URLs from the Wayback/Yoast inventory, the services.ts `legacy` arrays), with and without its
 *      trailing slash, reaches a 301 or a 410, and every URL that keeps its path is never redirected.
 *   2. One hop: no 301 target is itself the source of another rule, and no rule loops.
 *   3. No rule sends a visitor to a sister-brand (TIMELESS) town or off www.nocoturf.com.
 *   4. Every 301 target is a planned route (docs/CONTRACTS.md + src/data/services.ts + territory.mjs), and
 *      nothing is mass-redirected to the homepage.
 *
 * The matcher below copies Netlify's documented behaviour (docs.netlify.com/manage/routing/redirects/
 * redirect-options/, checked 2026-09-24): top-to-bottom, first match wins; a path matches with or without
 * its trailing slash; a splat `/x/*` matches /x and everything below it; query strings are ignored.
 *
 * The inventory is written out here (not read from archive/) because archive/ is gitignored and absent in
 * CI. When the archive IS present locally, a cross-check test proves this inventory still equals it.
 * No dependencies: node:test and node:assert only.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { NOCO_TOWNS, TIMELESS_TOWNS } from '../src/data/territory.mjs';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const read = (rel) => readFileSync(path.join(ROOT, rel), 'utf8');

const ORIGIN = 'https://www.nocoturf.com';
const GONE_BODY = '/404.html'; // a 410 line serves this file's body with status 410
const FORCE_ALLOWED = new Set(['/index.html']); // exists as a file, so only a forced rule can move it

// ─── Inventory ───────────────────────────────────────────────────────────────────────────────────────

/** The current site's sitemap-0.xml, 45 URLs (crawl of 2026-09-24; its canonicals were the no-slash form). */
const CURRENT_SITEMAP = [
  '/', '/about/',
  '/areas/berthoud-co/', '/areas/brighton-co/', '/areas/broomfield-co/', '/areas/dacono-co/', '/areas/erie-co/',
  '/areas/firestone-co/', '/areas/fort-collins-co/', '/areas/frederick-co/', '/areas/greeley-co/',
  '/areas/johnstown-co/', '/areas/loveland-co/', '/areas/mead-co/', '/areas/thornton-co/', '/areas/timnath-co/',
  '/areas/wellington-co/', '/areas/windsor-co/',
  '/blog/', '/contact/', '/discount/', '/marketing-form/', '/privacy/', '/projects/', '/review/',
  '/services/artificial-turf-installation/',
  '/services/artificial-turf-installation/commercial-artificial-turf-installation/',
  '/services/artificial-turf-installation/pet-safe-turf-installation/',
  '/services/artificial-turf-installation/residential-artificial-turf-installation/',
  '/services/artificial-turf-installation/site-preparation-for-turf/',
  '/services/artificial-turf-installation/sports-turf-installation/',
  '/services/landscape-design-installation/',
  '/services/landscape-design-installation/commercial-landscape-installation/',
  '/services/landscape-design-installation/landscape-consultation/',
  '/services/landscape-design-installation/landscape-turf-installation/',
  '/services/landscape-design-installation/outdoor-space-planning/',
  '/services/landscape-design-installation/residential-landscape-design/',
  '/services/specialty-turf-services/',
  '/services/specialty-turf-services/custom-turf-design/',
  '/services/specialty-turf-services/indoor-turf-installation/',
  '/services/specialty-turf-services/playground-turf-installation/',
  '/services/specialty-turf-services/putting-green-installation/',
  '/services/specialty-turf-services/specialty-turf-consultation/',
  '/terms/', '/thank-you/',
];

/** Live on the current site but not in its sitemap: stale pages from a 2026-06 deploy (decision: 410). */
const GHOSTS = ['denver', 'aurora', 'arvada', 'englewood', 'lakewood', 'westminster'].map((t) => `/areas/${t}-co/`);

/** Other files the current site serves. */
const CURRENT_FILES = ['/index.html', '/sitemap-index.xml', '/sitemap-0.xml', '/robots.txt', '/llms.txt'];

/** 2024–26 apex URLs (WordPress/WooCommerce, then GoDaddy builder), from proof__legacy_urls.csv
 *  (Wayback CDX + archived Yoast sitemaps), content and utility rows; plus /m/bookings, /f.atom and
 *  /f.rss from the same audit's housekeeping list. Query strings dropped (rules ignore them). */
const LEGACY_APEX = [
  // WooCommerce products and categories
  ...['bayhill-blend', 'bethpage-blend', 'broadmoor', 'cypress', 'lakota', 'pebble-forest-2', 'pebble-olive',
    'pebble-spring-2', 'pinehurst-forest', 'pinehurst-olive', 'sawgrass', 'scottsdale', 'spyglass', 't-cool',
    'torrey', 'troon', 'turnberry', 'westmoor', 'wonderfill', 'zeodorizer'].map((p) => `/product/${p}/`),
  ...['commercial', 'infills', 'landscape', 'pet-friendly', 'putting-green'].map((c) => `/product-category/${c}/`),
  '/shop/', '/new-shop/', '/cart/', '/checkout/', '/my-account/',
  // blog posts
  '/can-you-lay-synthetic-grass-on-concrete/', '/get-the-best-artificial-grass-in-colorado/',
  '/how-long-does-synthetic-grass-last-a-guide/', '/how-to-clean-synthetic-grass-noco-turf-co-dives-in-deep/',
  '/is-artificial-grass-safe-for-cats-what-pet-owners-should-know/', '/is-synthetic-grass-hot-in-the-sun-colorado-is-hot/',
  '/noco-turf-co-breaks-down-residential-synthetic-grass-cost/',
  '/paw-perfect-artificial-grass-the-eco-friendly-lawn-for-pet-lovers/', '/synthetic-grass-safe-for-dogs/',
  '/what-is-synthetic-grass-made-of/', '/what-is-synthetic-grass/', '/where-can-i-buy-synthetic-grass/',
  '/where-to-buy-synthetic-grass-the-noco-turf-co-storefront/',
  '/category/artificial-grass/', '/category/synthetic-grass/', '/tag/artificial-grass/', '/tag/synthetic-grass/',
  // core pages
  '/', '/about/', '/contact/', '/services/', '/financing-options', '/installation-services/',
  '/maintenance-services/', '/why-noco-turf-co',
  // WordPress town pages
  ...['berthoud', 'erie', 'evans', 'fort-collins', 'johnstown', 'windsor'].flatMap((t) => [
    `/artificial-grass-installation-${t}-co/`, `/commercial-artificial-turf-${t}-co/`,
  ]),
  // legal
  '/privacy-policy', '/privacy-policy-2/', '/terms-and-conditions/',
  // platform machinery
  '/author-sitemap.xml', '/author/admin/', '/category-sitemap.xml', '/comments/feed/',
  '/elementskit_template-sitemap.xml', '/feed/', '/m/create-account', '/m/login', '/m/bookings',
  '/page-sitemap.xml', '/post-sitemap.xml', '/post_tag-sitemap.xml', '/product-sitemap.xml',
  '/product_cat-sitemap.xml', '/robots.txt', '/sample-page/', '/sitemap.xml', '/sitemap_index.xml',
  '/thank-you/', '/wp-admin/', '/wp-json/', '/wp-json/oembed/1.0/embed', '/wp-json/wp/v2/pages/151',
  '/wp-json/wp/v2/pages/163', '/wp-json/wp/v2/pages/2030', '/wp-json/wp/v2/pages/2038', '/wp-json/wp/v2/pages/80',
  '/wp-json/wp/v2/posts/2233', '/wp-login.php', '/f.atom', '/f.rss',
];

/** Old URLs whose path lives on in the new build: never redirected (Pretty URLs adds the slash). */
const KEEP = new Set([
  '/', '/about/', '/contact/', '/privacy/', '/terms/', '/review/', '/services/',
  '/services/artificial-turf-installation/', '/robots.txt', '/sitemap.xml', '/llms.txt',
  ...NOCO_TOWNS.filter((t) => t.live).map((t) => `/areas/${t.slug}/`),
]);

/** Crawler probes that were already 404 on the old apex: left alone, never redirected. */
const PROBES = ['/.well-known/security.txt', '/.well-known/assetlinks.json', '/ads.txt', '/app-ads.txt', '/favicon.ico'];

const INVENTORY = [...new Set([...CURRENT_SITEMAP, ...GHOSTS, ...CURRENT_FILES, ...LEGACY_APEX])];

// ─── Parsing ─────────────────────────────────────────────────────────────────────────────────────────

/** Netlify's view of a path for matching: no query/hash, no trailing slash (except the root). */
function norm(p) {
  let n = p.split(/[?#]/)[0];
  if (n.length > 1 && n.endsWith('/')) n = n.slice(0, -1);
  return n;
}
const withSlash = (p) => (p.endsWith('/') ? p : `${p}/`);
/** Both forms of a path: as listed, and with the trailing slash toggled. */
const variants = (p) => (p === '/' ? ['/'] : [p, p.endsWith('/') ? p.slice(0, -1) : `${p}/`]);
const toPath = (to) => (to.startsWith(ORIGIN) ? to.slice(ORIGIN.length) || '/' : to);

function parseRedirects(text) {
  const rules = [];
  const errors = [];
  text.split('\n').forEach((raw, i) => {
    const line = raw.trim();
    if (!line || line.startsWith('#')) return;
    const f = line.split(/\s+/);
    if (f.length !== 3) return errors.push(`line ${i + 1}: expected "from to status", got ${f.length} fields: ${line}`);
    const [from, to, st] = f;
    const m = /^(301|410)(!?)$/.exec(st);
    if (!m) return errors.push(`line ${i + 1}: status must be 301 or 410 (optionally with !): ${line}`);
    if (!from.startsWith('/')) errors.push(`line ${i + 1}: source must be a path (no host-scoped rules): ${from}`);
    if (from.includes('*') && !from.endsWith('/*')) errors.push(`line ${i + 1}: a splat must end the path: ${from}`);
    if (from.includes('?') || from.includes(':')) errors.push(`line ${i + 1}: no query or placeholder matching: ${from}`);
    rules.push({
      line: i + 1, from, to, status: Number(m[1]), force: m[2] === '!',
      splat: from.endsWith('/*'), base: norm(from.endsWith('/*') ? from.slice(0, -2) || '/' : from),
    });
  });
  return { rules, errors };
}

function matches(rule, p) {
  const n = norm(p);
  if (rule.splat) return n === rule.base || n.startsWith(rule.base === '/' ? '/' : `${rule.base}/`);
  return n === rule.base;
}

/** services.ts is TypeScript: read it as text rather than importing it. */
function parseServices(src) {
  const block = src.slice(src.indexOf('export const SERVICES'), src.indexOf('export const TURF_SUPPLY'));
  const services = [];
  for (const m of block.matchAll(/slug:\s*'([^']+)'[\s\S]*?legacy:\s*\[([\s\S]*?)\]/g)) {
    services.push({ slug: m[1], legacy: [...m[2].matchAll(/'([^']+)'/g)].map((x) => x[1]) });
  }
  const turf = /TURF_SUPPLY\s*=\s*\{\s*slug:\s*'([^']+)'/.exec(src);
  return { services, turfSupply: turf ? turf[1] : null };
}

/** Planned routes: the table under "## Planned routes" in docs/CONTRACTS.md, with {slug}/{id} expanded
 *  from services.ts (services), territory.mjs (areas) or the backticked ids in the row's Notes cell. */
function plannedRoutes(contracts, services, turfSupply) {
  const section = contracts.split(/^## /m).find((s) => s.startsWith('Planned routes'));
  assert.ok(section, 'docs/CONTRACTS.md has no "## Planned routes" section');
  const routes = new Set();
  for (const row of section.split('\n').filter((l) => l.startsWith('| `'))) {
    const cells = row.split('|').map((c) => c.trim());
    const tokens = (cell) => [...(cell ?? '').matchAll(/`([^`]+)`/g)].map((m) => m[1]);
    const noteIds = tokens(cells[3]).filter((t) => /^[a-z0-9-]+$/.test(t));
    for (const r of tokens(cells[1]).filter((t) => t.startsWith('/'))) {
      const ph = r.indexOf('{');
      if (ph === -1) { routes.add(r); continue; }
      const base = r.slice(0, ph);
      const ids = base === '/services/' ? services.map((s) => s.slug)
        : base === '/areas/' ? NOCO_TOWNS.map((t) => t.slug)
        : noteIds;
      for (const id of ids) routes.add(`${base}${id}/`);
    }
  }
  if (turfSupply) routes.add(`/${turfSupply}/`);
  return routes;
}

const slugOf = (name) => `${name.toLowerCase().replace(/[^a-z]+/g, '-')}-co`;
const TIMELESS_SLUGS = TIMELESS_TOWNS.map(slugOf);
const NOCO_SLUGS = new Set(NOCO_TOWNS.map((t) => t.slug));

const REDIRECTS_TEXT = read('public/_redirects');
const { rules: RULES, errors: SYNTAX_ERRORS } = parseRedirects(REDIRECTS_TEXT);
const resolve = (p) => RULES.find((r) => matches(r, p)) ?? null;
const { services: SERVICES, turfSupply: TURF_SUPPLY } = parseServices(read('src/data/services.ts'));
const PLANNED = plannedRoutes(read('docs/CONTRACTS.md'), SERVICES, TURF_SUPPLY);
const MOVED = RULES.filter((r) => r.status === 301);

// ─── The map itself ──────────────────────────────────────────────────────────────────────────────────

describe('public/_redirects syntax', () => {
  test('every rule is "from to status" with a 301 or 410 status', () => {
    assert.deepEqual(SYNTAX_ERRORS, []);
    assert.ok(RULES.length > 50, `only ${RULES.length} rules parsed`);
  });

  test('every 301 goes to an absolute https://www.nocoturf.com/ URL (one hop from the apex)', () => {
    const bad = MOVED.filter((r) => !r.to.startsWith(`${ORIGIN}/`)).map((r) => `line ${r.line}: ${r.to}`);
    assert.deepEqual(bad, []);
  });

  test(`every 410 serves ${GONE_BODY}`, () => {
    const bad = RULES.filter((r) => r.status === 410 && r.to !== GONE_BODY).map((r) => `line ${r.line}: ${r.to}`);
    assert.deepEqual(bad, []);
  });

  test('only /index.html is forced (a built page must win over any other old rule)', () => {
    const bad = RULES.filter((r) => r.force && !FORCE_ALLOWED.has(r.from)).map((r) => `line ${r.line}: ${r.from}`);
    assert.deepEqual(bad, []);
  });

  test('no dead lines: each rule is the first match for its own source', () => {
    const dead = RULES.filter((r) => resolve(r.splat ? `${r.base}/__probe__/` : r.from) !== r)
      .map((r) => `line ${r.line}: ${r.from} is already matched by line ${resolve(r.splat ? `${r.base}/__probe__/` : r.from).line}`);
    assert.deepEqual(dead, []);
  });

  test('no line only adds or removes a trailing slash (Netlify: that loops)', () => {
    const bad = MOVED.filter((r) => norm(toPath(r.to)) === r.base).map((r) => `line ${r.line}: ${r.from}`);
    assert.deepEqual(bad, []);
  });

  test('the shipped file names no sister-brand phone, no sister-brand name and no out-of-territory city', () => {
    // The file is copied to dist/ — keep it clear of the tokens scripts/check-dist.mjs bans.
    for (const re of [/303\D?349\D?2368/, /854\D?204\D?9227/, /timeless/i, /Denver/]) {
      assert.doesNotMatch(REDIRECTS_TEXT, re);
    }
  });
});

describe('coverage', () => {
  test('every inventory URL reaches a 301 or 410, with and without its trailing slash', () => {
    const missing = [];
    for (const src of INVENTORY.filter((p) => !KEEP.has(p))) {
      for (const v of variants(src)) if (!resolve(v)) missing.push(v);
    }
    assert.deepEqual(missing, [], 'old URLs with no rule (they would 404)');
  });

  test('URLs that keep their path are never redirected, and each is a planned route', () => {
    const redirected = [];
    for (const p of KEEP) for (const v of variants(p)) if (resolve(v)) redirected.push(`${v} (line ${resolve(v).line})`);
    assert.deepEqual(redirected, []);
    assert.deepEqual([...KEEP].filter((p) => !PLANNED.has(p)), [], 'kept URLs that are not planned routes');
  });

  test('every current sitemap URL either keeps its path or has a rule', () => {
    const orphan = CURRENT_SITEMAP.filter((p) => !KEEP.has(p) && !resolve(p));
    assert.deepEqual(orphan, []);
  });

  test('crawler probes and /.well-known/ are left alone', () => {
    assert.deepEqual(PROBES.filter((p) => resolve(p)), []);
  });

  test('no rule intercepts a planned route', () => {
    const hit = [...PLANNED].filter((p) => resolve(p)).map((p) => `${p} (line ${resolve(p).line})`);
    assert.deepEqual(hit, []);
  });
});

describe('one hop', () => {
  test('no 301 target is the source of another rule (no chains, no loops)', () => {
    const chains = MOVED.filter((r) => resolve(toPath(r.to)))
      .map((r) => `line ${r.line}: ${r.from} → ${toPath(r.to)} → line ${resolve(toPath(r.to)).line}`);
    assert.deepEqual(chains, []);
  });

  test('every 301 target is a planned route', () => {
    const unplanned = MOVED.filter((r) => !PLANNED.has(toPath(r.to))).map((r) => `line ${r.line}: ${toPath(r.to)}`);
    assert.deepEqual(unplanned, [], `planned routes: ${[...PLANNED].sort().join(' ')}`);
  });

  test('nothing is mass-redirected to the homepage (only /index.html goes to /)', () => {
    const home = MOVED.filter((r) => toPath(r.to) === '/').map((r) => r.from);
    assert.deepEqual(home, ['/index.html']);
  });
});

describe('territory', () => {
  test('no rule targets a sister-brand town page or leaves www.nocoturf.com', () => {
    const bad = RULES.filter((r) => {
      const to = toPath(r.to);
      return /^https?:/.test(to) || TIMELESS_SLUGS.some((s) => to.includes(`/${s}/`) || to.endsWith(`/${s}`));
    }).map((r) => `line ${r.line}: ${r.to}`);
    assert.deepEqual(bad, []);
  });

  test('every /areas/ target is the hub or a NoCo town', () => {
    const bad = MOVED.map((r) => toPath(r.to)).filter((to) => to.startsWith('/areas/') && to !== '/areas/')
      .filter((to) => !NOCO_SLUGS.has(to.split('/')[2]));
    assert.deepEqual(bad, []);
  });

  test('old sister-brand town URLs (Erie, Brighton, Thornton, Broomfield) 301 to /areas/', () => {
    const own = INVENTORY.filter((p) => ['erie-co', 'brighton-co', 'thornton-co', 'broomfield-co']
      .some((s) => p.includes(s)));
    assert.ok(own.length >= 6);
    for (const p of own) for (const v of variants(p)) {
      const r = resolve(v);
      assert.ok(r && r.status === 301 && toPath(r.to) === '/areas/', `${v} → ${r ? `${r.status} ${r.to}` : 'no rule'}`);
    }
  });

  test('the six ghost pages are 410', () => {
    for (const p of GHOSTS) for (const v of variants(p)) assert.equal(resolve(v)?.status, 410, v);
  });

  test('old NoCo town pages 301 to the same town', () => {
    for (const p of INVENTORY) {
      const m = /^\/artificial-grass-installation-([a-z-]+-co)\/$/.exec(p);
      if (!m || !NOCO_SLUGS.has(m[1])) continue;
      assert.equal(toPath(resolve(p)?.to ?? ''), `/areas/${m[1]}/`, p);
    }
  });
});

describe('decisions', () => {
  test('services.ts legacy URLs 301 straight to their service page', () => {
    assert.ok(SERVICES.length >= 1, 'no services parsed from src/data/services.ts');
    for (const { slug, legacy } of SERVICES) {
      for (const old of legacy.filter((l) => norm(l) !== `/services/${slug}`)) {
        for (const v of variants(old)) {
          const r = resolve(v);
          assert.ok(r && r.status === 301, `${v} has no 301`);
          assert.equal(toPath(r.to), `/services/${slug}/`, `${v} (line ${r.line})`);
        }
      }
    }
  });

  const decided = {
    '/blog/': '/guides/',
    '/projects/': '/work/',
    '/discount/': '/contact/',
    '/thank-you/': '/thanks/',
    '/index.html': '/',
    '/artificial-grass-installation-evans-co/': '/areas/evans-co/',
    '/noco-turf-co-breaks-down-residential-synthetic-grass-cost/': '/guides/artificial-turf-cost/',
    '/installation-services/': '/services/artificial-turf-installation/',
    '/maintenance-services/': '/services/turf-repair/',
    '/why-noco-turf-co': '/about/',
    '/privacy-policy-2/': '/privacy/',
    '/terms-and-conditions/': '/terms/',
  };
  for (const [from, to] of Object.entries(decided)) {
    test(`${from} → ${to}`, () => {
      const r = resolve(from);
      assert.ok(r && r.status === 301, `${from} has no 301`);
      assert.equal(toPath(r.to), to);
    });
  }

  test('/marketing-form/ is 410 and /review/ has no rule', () => {
    assert.equal(resolve('/marketing-form/')?.status, 410);
    assert.equal(resolve('/review/'), null);
    assert.equal(resolve('/review'), null);
  });

  test(`store URLs go to /${TURF_SUPPLY}/ (services.ts TURF_SUPPLY)`, () => {
    for (const p of INVENTORY.filter((x) => /^\/(product|product-category|shop|new-shop)\//.test(x))) {
      assert.equal(toPath(resolve(p)?.to ?? ''), `/${TURF_SUPPLY}/`, p);
    }
  });
});

// ─── Local only: the inventory above still equals the research archive (gitignored) ───────────────────

const ARCHIVE = path.join(ROOT, 'archive/research-2026-09-24/data');
describe('inventory matches the research archive', { skip: !existsSync(ARCHIVE) && 'archive/ not present (CI)' }, () => {
  test('crawl table: 45 sitemap URLs + 6 ghosts', () => {
    const rows = read('archive/research-2026-09-24/data/crawl__table.md').split('\n')
      .filter((l) => /^\| \d+ \|/.test(l)).map((l) => l.split('|').map((c) => c.trim()));
    assert.deepEqual(rows.filter((c) => c[3] === 'Y').map((c) => c[2]).sort(), [...CURRENT_SITEMAP].sort());
    assert.deepEqual(rows.filter((c) => c[3].startsWith('N')).map((c) => c[2]).sort(), [...GHOSTS].sort());
  });

  test('legacy CSV: every apex content/utility URL is in the inventory; probes are left alone', () => {
    const lines = read('archive/research-2026-09-24/data/proof__legacy_urls.csv').trim().split('\n');
    const split = (line) => { // minimal CSV: quoted fields may hold commas
      const out = []; let cur = ''; let q = false;
      for (const ch of line) {
        if (ch === '"') q = !q; else if (ch === ',' && !q) { out.push(cur); cur = ''; } else cur += ch;
      }
      out.push(cur); return out;
    };
    const head = split(lines[0]);
    const col = (row, name) => row[head.indexOf(name)];
    const missing = [];
    for (const row of lines.slice(1).map(split)) {
      const host = col(row, 'host');
      const p = col(row, 'path');
      if (host === 'www.nocoturf.com') { if (!KEEP.has(p)) missing.push(`www ${p}`); continue; }
      if (host !== 'nocoturf.com') continue; // subdomains: off-domain list in docs/REDIRECTS.md
      if (col(row, 'class') === 'junk') {
        assert.equal(resolve(p), null, `probe ${p} should not be redirected`);
      } else if (!INVENTORY.includes(p)) missing.push(p);
    }
    assert.deepEqual(missing, []);
  });
});

// ─── Launch: every target exists in the build (run after `npm run build`) ────────────────────────────

const DIST = path.join(ROOT, 'dist');
const isFile = (p) => existsSync(p) && statSync(p).isFile();
/** The file Netlify serves for a route: dist/<path>index.html for a directory route, else dist/<path>. */
const builtFile = (route) => path.join(DIST, route.endsWith('/') ? `${route}index.html` : route);

describe('launch check', { skip: process.env.LAUNCH_CHECK !== '1' && 'set LAUNCH_CHECK=1 after `npm run build`' }, () => {
  test('dist/ exists and carries this _redirects file unchanged', () => {
    assert.ok(existsSync(DIST), 'run `npm run build` first');
    assert.equal(readFileSync(path.join(DIST, '_redirects'), 'utf8'), REDIRECTS_TEXT);
  });

  test('every 301 target is built', () => {
    const missing = [...new Set(MOVED.map((r) => toPath(r.to)))].filter((to) => !isFile(builtFile(to)));
    assert.deepEqual(missing, [], 'unbuilt targets: repoint these lines to the fallback in docs/REDIRECTS.md');
  });

  test(`the 410 body ${GONE_BODY} is built`, () => {
    assert.ok(isFile(path.join(DIST, GONE_BODY)));
  });

  test('every URL that keeps its path is built (otherwise it needs a 301)', () => {
    const missing = [...KEEP].filter((p) => !isFile(builtFile(p)));
    assert.deepEqual(missing, []);
  });

  test('no unforced rule is shadowed by a built page (it would never fire)', () => {
    const shadowed = RULES.filter((r) => !r.force && !r.splat).filter((r) => {
      const n = r.base;
      return isFile(path.join(DIST, n, 'index.html')) || isFile(path.join(DIST, `${n}.html`)) || isFile(path.join(DIST, n));
    }).map((r) => `line ${r.line}: ${r.from}`);
    assert.deepEqual(shadowed, []);
  });
});
