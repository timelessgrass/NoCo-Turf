/**
 * What ships: the check-dist rules (scripts/check-dist.mjs) on the real build when there is one, the
 * same rules proven on fixture pages, plus scripts/check-links.py and scripts/md-mirrors.mjs.
 * The rule that matters most: no aggregateRating, ratingValue, reviewCount or Review — ever — and one
 * #business whose phone is the brief's.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { checkDist, checkPage, parseHtml, findAll } from '../scripts/check-dist.mjs';
import { run as mirrors, buildLlms } from '../scripts/md-mirrors.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const dist = path.join(root, 'dist');
const SITE = 'https://www.nocoturf.com';
const BRIEF = { name: 'NoCo Turf Co.', phoneDigits: '7206300108' };
const LAUNCHED = { prelaunch: false, site: SITE, brief: BRIEF };

test('the built site passes every check-dist rule', (t) => {
  if (!fs.existsSync(path.join(dist, 'index.html'))) return t.skip('no dist/ — run astro build');
  const { fails, pages } = checkDist(dist);
  assert.ok(Object.keys(pages).length >= 1);
  assert.deepEqual(fails, [], fails.join('\n'));
});

test('no rating or review markup anywhere in the build', (t) => {
  if (!fs.existsSync(path.join(dist, 'index.html'))) return t.skip('no dist/ — run astro build');
  const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : e.name.endsWith('.html') ? [path.join(d, e.name)] : []));
  for (const f of walk(dist)) {
    const html = fs.readFileSync(f, 'utf8');
    assert.doesNotMatch(html, /aggregateRating|ratingValue|reviewCount|"@type"\s*:\s*"Review"/, path.relative(root, f));
  }
});

// ───────────────────────────── the rules on fixture pages ─────────────────────────────

const business = (extra = {}) => ({ '@type': 'HomeAndConstructionBusiness', '@id': `${SITE}/#business`, name: 'NoCo Turf Co.', telephone: '+1 720-630-0108', ...extra });
function page({ route = '/services/pet-turf/', robots = 'index, follow', graph = [business()], body = '<h1>Pet turf</h1><p>Drains fast.</p>', head = '' } = {}) {
  const ld = JSON.stringify({ '@context': 'https://schema.org', '@graph': graph });
  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Pet turf | NoCo Turf Co.</title><meta name="description" content="Pet turf that drains."><link rel="canonical" href="${SITE}${route}">
<meta name="robots" content="${robots}">${head}<script type="application/ld+json">${ld}</script></head>
<body><main id="main">${body}</main><footer><a href="tel:+17206300108" data-cta="footer-call">720-630-0108</a></footer></body></html>`;
}
const codes = (html, ctx = LAUNCHED, route = '/services/pet-turf/') => checkPage(route, html, ctx).issues.map(([lvl, code]) => `${lvl} ${code}`);
const fails = (html, ctx, route) => codes(html, ctx, route).filter((c) => c.startsWith('FAIL'));

test('a well-formed page passes', () => {
  assert.deepEqual(fails(page()), []);
});

test('rating and review markup fails (SCHEMA-1)', () => {
  assert.ok(fails(page({ graph: [business({ aggregateRating: { '@type': 'AggregateRating', ratingValue: '5', reviewCount: '12' } })] })).includes('FAIL SCHEMA-1'));
  assert.ok(fails(page({ graph: [business(), { '@type': 'Review', reviewBody: 'Great' }] })).includes('FAIL SCHEMA-1'));
});

test('one #business, with the brief\'s phone and name (SCHEMA-2/3/5)', () => {
  assert.ok(fails(page({ graph: [business(), business()] })).includes('FAIL SCHEMA-2'));
  assert.ok(fails(page({ graph: [business({ telephone: '+1 303-349-2368' })] })).includes('FAIL SCHEMA-3'));
  assert.ok(fails(page({ graph: [business({ name: 'NoCo Turf' })] })).includes('FAIL SCHEMA-5'));
  assert.ok(fails(page(), { ...LAUNCHED, brief: { name: null, phoneDigits: null } }).includes('FAIL SCHEMA-3'), 'no phone in the brief → no #business node');
  assert.deepEqual(fails(page({ graph: [{ '@type': 'WebPage', about: { '@id': `${SITE}/#business` } }, business()] })), [], 'an @id reference is not a second node');
  assert.ok(fails(page({ graph: [business({ '@id': 'https://nocoturf.com/#business' })] })).includes('FAIL SCHEMA-4'));
});

test('Denver is allowed only inside the data-boundary note; TIMELESS phones nowhere (BAN-1)', () => {
  const outside = page({ body: '<h1>Areas</h1><p>We do not serve Denver.</p>' });
  assert.ok(fails(outside).includes('FAIL BAN-1'));
  const inside = page({ body: '<h1>Areas</h1><aside data-boundary><p>Denver metro? Our sister company covers <strong>Erie</strong>.</p></aside>' });
  assert.deepEqual(fails(inside), []);
  const phoneInside = page({ body: '<h1>Areas</h1><aside data-boundary><p>Denver metro: 303-349-2368.</p></aside>' });
  assert.ok(fails(phoneInside).includes('FAIL BAN-1'));
  const brandInside = page({ body: '<h1>Areas</h1><aside data-boundary><p>Denver metro: TIMELESS Grass &amp; Greens.</p></aside>' });
  assert.deepEqual(fails(brandInside), []);
  assert.ok(codes(brandInside).includes('WARN BAN-2'));
  for (const token of ['Timeless', 'Acme', 'SOURCE TBD', 'Florida', 'lorem ipsum', 'https://images.pexels.com/x.jpg', '24/7', 'Den&shy;ver']) {
    assert.ok(fails(page({ body: `<h1>Pet turf</h1><p>${token}</p>` })).includes('FAIL BAN-1'), token);
  }
});

test('head rules: one h1, a viewport, a self-canonical with its slash (H1-1, VIEWPORT-1, CANON-1)', () => {
  assert.ok(fails(page({ body: '<h1>One</h1><h1>Two</h1>' })).includes('FAIL H1-1'));
  assert.ok(fails(page({ body: '<p>No heading</p>' })).includes('FAIL H1-1'));
  assert.ok(fails(page().replace(/<meta name="viewport"[^>]*>/, '')).includes('FAIL VIEWPORT-1'));
  assert.ok(fails(page().replace(`${SITE}/services/pet-turf/`, `${SITE}/services/pet-turf`)).includes('FAIL CANON-1'));
  assert.ok(fails(page().replace(SITE, 'https://nocoturf.com')).includes('FAIL CANON-1'));
});

test('robots meta: noindex iff PRELAUNCH or a utility page (ROBOTS-1)', () => {
  assert.ok(fails(page({ robots: 'noindex, nofollow' })).includes('FAIL ROBOTS-1'), 'launched content page must index');
  assert.ok(fails(page(), { ...LAUNCHED, prelaunch: true }).includes('FAIL ROBOTS-1'), 'prelaunch page must be noindex');
  assert.deepEqual(fails(page({ robots: 'noindex, nofollow' }), { ...LAUNCHED, prelaunch: true }), []);
  for (const route of ['/thanks/', '/review/', '/404/']) {
    const html = page({ route, robots: 'noindex, nofollow' });
    assert.deepEqual(fails(html, LAUNCHED, route), [], route);
    assert.ok(fails(page({ route }), LAUNCHED, route).includes('FAIL ROBOTS-1'), `${route} must be noindex`);
  }
});

test('forms, tel links and images (FORM-1, TEL-1, IMG-1)', () => {
  assert.ok(fails(page({ body: '<h1>x</h1><form action="/.netlify/functions/lead"></form><form></form>' })).includes('FAIL FORM-1'));
  assert.ok(fails(page({ body: '<h1>x</h1><form action="/api/lead"></form>' })).includes('FAIL FORM-2'));
  assert.ok(fails(page({ body: '<h1>x</h1><a href="tel:720-630-0108">call</a>' })).includes('FAIL TEL-1'));
  assert.ok(fails(page({ body: '<h1>x</h1><a href="tel:+1720630010">call</a>' })).includes('FAIL TEL-1'));
  assert.ok(fails(page(), { ...LAUNCHED, brief: { name: null, phoneDigits: null }, }).includes('FAIL TEL-2'), 'a tel: the brief does not hold');
  assert.ok(fails(page({ body: '<h1>x</h1><img src="/a.webp" width="800" height="600">' })).includes('FAIL IMG-1'));
  assert.deepEqual(fails(page({ body: '<h1>x</h1><img src="/a.webp" width="800" height="600" alt="">' })), []);
});

test('the parser keeps offsets, raw text and nesting straight', () => {
  const html = '<main><div data-boundary><p>a<div>b</div></p></div><script>if (a < b) {}</script><p>c</p></main>';
  const root = parseHtml(html);
  const [b] = findAll(root, (el) => 'data-boundary' in el.attrs);
  assert.equal(html.slice(b.start, b.end), '<div data-boundary><p>a<div>b</div></p></div>');
  assert.equal(findAll(root, (el) => el.tag === 'p').length, 2);
});

function site(t, files) {
  const dir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'noco dist ')));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  for (const [f, body] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(dir, f)), { recursive: true });
    fs.writeFileSync(path.join(dir, f), body);
  }
  return dir;
}

test('robots.txt and sitemap.xml agree with PRELAUNCH and with the pages (ROBOTSTXT-1, SITEMAP-*)', (t) => {
  const launchRobots = `User-agent: *\nAllow: /\n\nSitemap: ${SITE}/sitemap.xml\n`;
  const sm = (...routes) => `<?xml version="1.0"?><urlset>${routes.map((r) => `<url><loc>${SITE}${r}</loc></url>`).join('')}</urlset>`;
  const good = site(t, {
    'index.html': page({ route: '/', body: '<h1>Home</h1><a href="/services/pet-turf/">Pet turf</a>' }),
    'services/pet-turf/index.html': page(),
    'thanks/index.html': page({ route: '/thanks/', robots: 'noindex, nofollow' }),
    'robots.txt': launchRobots, 'sitemap.xml': sm('/', '/services/pet-turf/'), 'llms.txt': '# NoCo Turf Co.\n',
  });
  assert.deepEqual(checkDist(good, LAUNCHED).fails, []);

  const bad = site(t, {
    'index.html': page({ route: '/', body: '<h1>Home</h1>' }),
    'services/pet-turf/index.html': page(),
    'thanks/index.html': page({ route: '/thanks/', robots: 'noindex, nofollow' }),
    'robots.txt': 'User-agent: *\nDisallow: /\n', 'sitemap.xml': sm('/', '/thanks/', '/missing/'),
  });
  const f = checkDist(bad, LAUNCHED).fails.join('\n');
  assert.match(f, /ROBOTSTXT-1 PRELAUNCH is false but robots.txt still blocks every crawler/);
  assert.match(f, /SITEMAP-3 .*\/thanks\/, which is noindex/);
  assert.match(f, /SITEMAP-2 .*\/missing\/, which has no built page/);
  assert.match(f, /SITEMAP-5 indexable page \/services\/pet-turf\/ is not in sitemap\.xml/);

  const pre = checkDist(bad, { ...LAUNCHED, prelaunch: true }).fails.join('\n');
  assert.match(pre, /SITEMAP-4 PRELAUNCH is true but sitemap\.xml lists 3 URL/);
});

// ───────────────────────────── scripts/check-links.py ─────────────────────────────

const links = (dir, ...args) => {
  const r = spawnSync('python3', [path.join(root, 'scripts/check-links.py'), dir, ...args], { encoding: 'utf8' });
  return { ...r, out: r.stdout + r.stderr };
};

test('check-links: the current build passes', (t) => {
  if (!fs.existsSync(path.join(dist, 'index.html'))) return t.skip('no dist/ — run astro build');
  const r = links(dist);
  assert.equal(r.status, 0, r.out);
});

test('check-links: broken links fail; orphans and buried pages fail after launch and warn before it', (t) => {
  const plain = (title, body, robots = 'index, follow') => `<!doctype html><html><head><title>${title}</title><link rel="canonical" href="${SITE}/"><meta name="robots" content="${robots}"></head><body><main id="main"><h1>${title}</h1>${body}</main><footer><a href="/orphan/">footer only</a></footer></body></html>`;
  const dir = site(t, {
    'index.html': plain('Home', '<a href="/a/">A</a>'),
    'a/index.html': plain('A', '<a href="/b">B without slash</a>'),
    'b/index.html': plain('B', '<a href="/c/">C</a>'),
    'c/index.html': plain('C', '<a href="/d/">D</a>'),
    'd/index.html': plain('D', '<a href="/favicon.svg">icon</a>'),
    'orphan/index.html': plain('Orphan', '<p>Only the footer links here.</p>'),
    'thanks/index.html': plain('Thanks', '<p>Sent.</p>', 'noindex'),
    'favicon.svg': '<svg/>',
  });
  const after = links(dir, '--prelaunch', 'no', '--min-words', '0');
  assert.equal(after.status, 1, after.out);
  assert.match(after.out, /FAIL ORPHAN-1 \/orphan\//);
  assert.match(after.out, /FAIL DEPTH-1 \/d\/ — 4 clicks from \//);
  assert.match(after.out, /WARN SLASH-1 \/a\/ → \/b/);
  assert.doesNotMatch(after.out, /thanks/);
  assert.doesNotMatch(after.out, /BROKEN-1/);

  const before = links(dir, '--prelaunch', 'yes', '--min-words', '0');
  assert.equal(before.status, 0, before.out);
  assert.match(before.out, /WARN ORPHAN-1 \/orphan\//);

  fs.writeFileSync(path.join(dir, 'c/index.html'), plain('C', '<a href="/d/">D</a><a href="/gone/">Gone</a>'));
  for (const mode of ['yes', 'no']) {
    const broken = links(dir, '--prelaunch', mode, '--min-words', '0');
    assert.equal(broken.status, 1, broken.out);
    assert.match(broken.out, /FAIL BROKEN-1 \/c\/ → \/gone\//);
  }
});

// ───────────────────────────── scripts/md-mirrors.mjs ─────────────────────────────

const renderable = (value) => ({ value, status: 'VERIFIED', source: 'test', date: '2026-09-24' });
const unknown = (value) => ({ value, status: 'UNKNOWN', source: null });

test('llms.txt says only what the brief can render', () => {
  const brief = {
    identity: { display_name: renderable('NoCo Turf Co.'), locations: [{ phone: renderable('+1 720-630-0108'), hours: unknown('Mon-Fri') }] },
    service_areas: [{ slug: 'windsor-co', name: renderable('Windsor') }, { slug: 'erie-co', name: { value: 'Erie', status: 'INFERENCE', source: 'x' } }],
    services: [{ name: renderable('Pet turf'), client_description: unknown('Guaranteed forever') }],
    faq_harvest: [{ question: renderable('Does it drain?'), client_answer: unknown('Yes') }],
  };
  const pre = buildLlms({ brief, site: SITE, prelaunch: true, pages: [] });
  assert.match(pre, /prelaunch/);
  assert.doesNotMatch(pre, /720/);
  const live = buildLlms({ brief, site: SITE, prelaunch: false, pages: [] });
  assert.match(live, /^# NoCo Turf Co\./);
  assert.match(live, /Service area: Windsor$/m);
  assert.match(live, /Phone: \+1 720-630-0108/);
  assert.match(live, /- \*\*Pet turf\*\*$/m);
  for (const hidden of ['Erie', 'Mon-Fri', 'Guaranteed', 'Does it drain']) assert.doesNotMatch(live, new RegExp(hidden));
  const anon = buildLlms({ brief: {}, site: SITE, prelaunch: false, pages: [] });
  assert.match(anon, /^# www\.nocoturf\.com/);
});

test('mirrors: indexable pages only, from <main>, without the boundary note; PRELAUNCH writes none', (t) => {
  const dir = site(t, {
    'index.html': page({ route: '/', body: '<h1>Home</h1><p>Turf for <a href="/services/pet-turf/">dogs</a>.</p><aside data-boundary><p>Denver metro? Not us.</p></aside><table><tr><th>Town</th><th>Rule</th></tr><tr><td>Windsor</td><td>Backyards allowed</td></tr></table><ul><li>One</li><li>Two</li></ul>' }),
    'services/pet-turf/index.html': page(),
    'thanks/index.html': page({ route: '/thanks/', robots: 'noindex, nofollow' }),
  });
  const briefFile = path.join(dir, 'brief.json');
  fs.writeFileSync(briefFile, JSON.stringify({ identity: { display_name: renderable('NoCo Turf Co.') } }));
  const log = () => {};
  const r = mirrors(dir, { prelaunch: false, briefFile, log });
  assert.equal(r.ok, true);
  assert.equal(r.pages.length, 2);
  const home = fs.readFileSync(path.join(dir, 'index.html.md'), 'utf8');
  assert.match(home, /^---\ntitle: "Pet turf"/);
  assert.match(home, /# Home/);
  assert.match(home, /Turf for \[dogs\]\(https:\/\/www\.nocoturf\.com\/services\/pet-turf\/\)\./);
  assert.match(home, /\| Town \| Rule \|\n\| --- \| --- \|\n\| Windsor \| Backyards allowed \|/);
  assert.match(home, /- One\n- Two/);
  assert.doesNotMatch(home, /Denver/);
  assert.equal(fs.existsSync(path.join(dir, 'thanks/index.html.md')), false);
  const llms = fs.readFileSync(path.join(dir, 'llms.txt'), 'utf8');
  assert.match(llms, /## Services\n\n- \[Pet turf\]\(https:\/\/www\.nocoturf\.com\/services\/pet-turf\/index\.html\.md\)/);
  assert.ok(fs.existsSync(path.join(dir, 'llms-full.txt')));

  const p = mirrors(dir, { prelaunch: true, briefFile, log });
  assert.equal(p.ok, true);
  assert.equal(fs.existsSync(path.join(dir, 'index.html.md')), false, 'stale mirrors are removed in PRELAUNCH');
  assert.equal(fs.existsSync(path.join(dir, 'llms-full.txt')), false);
  assert.match(fs.readFileSync(path.join(dir, 'llms.txt'), 'utf8'), /prelaunch/);
});
