#!/usr/bin/env node
/**
 * Checks the built site — what actually ships — after `astro build` and md-mirrors.
 *
 *   node scripts/check-dist.mjs [dist]
 *   node scripts/check-dist.mjs dist --prelaunch=false   # override src/data/site.ts (fixtures)
 *   node scripts/check-dist.mjs dist --brief=<brief.json> # override .site/truth/brief.json (fixtures)
 *
 * Scans dist/**\/*.html, dist/**\/*.md, robots.txt, sitemap.xml and llms*.txt. Every finding has a code:
 *
 *   BAN-1      FAIL  a docs/CONTRACTS.md banned token: a TIMELESS phone (any spelling, anywhere), "Timeless",
 *                    a TIMELESS town incl. "Denver", Acme, SOURCE TBD, cite index, (386), Florida, Panhandle,
 *                    lorem, pexels.com, unsplash.com, aggregateRating, ratingValue, reviewCount,
 *                    "@type":"Review", LandscapeService, 24/7. Denver-metro names are allowed only inside
 *                    an element carrying data-boundary (the one boundary note component).
 *   BAN-2      WARN  "Timeless" inside the data-boundary note — the contract excepts only "Denver" there;
 *                    the lead decides whether the note may name the sister brand
 *   H1-1       FAIL  not exactly one <h1>
 *   VIEWPORT-1 FAIL  no <meta name="viewport">
 *   CANON-1    FAIL  not exactly one canonical, or it is not https://www.nocoturf.com + this page's path
 *                    with its trailing slash
 *   ROBOTS-1   FAIL  robots meta says noindex when it shouldn't, or doesn't when it should: noindex iff
 *                    PRELAUNCH (src/data/site.ts) or the page is /thanks/, /review/ or the 404
 *   FORM-1     FAIL  more than one <form>;  FORM-2 FAIL a form posting to /api/* (preflight LEAD-1)
 *   TEL-1      FAIL  a tel: that is not +1 and ten digits;  TEL-2 FAIL NoCo's number dialled without the
 *                    brief behind it;  TEL-3 WARN another number
 *   SCHEMA-0   FAIL  JSON-LD that does not parse
 *   SCHEMA-1   FAIL  aggregateRating, ratingValue, reviewCount, review or a Review/AggregateRating node
 *   SCHEMA-2   FAIL  more than one #business node on a page
 *   SCHEMA-3   FAIL  the #business telephone digits differ from the brief's phone (or the brief has none)
 *   SCHEMA-4   FAIL  a #business @id on another host;  SCHEMA-5 FAIL its name differs from the brief
 *   ENTITY-1   FAIL  two pages describe #business differently
 *   IMG-1      FAIL  an <img> without width, height or alt
 *   TITLE-1    FAIL  no <title>;  TITLE-2 WARN over 70 characters;  DESC-1 WARN an indexable page with no
 *                    meta description;  BOUNDARY-2 WARN more than one data-boundary element on a page
 *   ROBOTSTXT-1 FAIL robots.txt missing, not blocking everything in PRELAUNCH, or blocking everything /
 *                    not naming the sitemap after launch
 *   SITEMAP-1..5 FAIL a sitemap URL off-host or without its slash, one with no built page, a noindex page
 *                    listed, anything listed during PRELAUNCH, an indexable page missing after launch
 *   LLMS-1     WARN  no llms.txt (run scripts/md-mirrors.mjs first);  LLMS-2 WARN a PRELAUNCH llms.txt that
 *                    does not say so
 *   LOOSE-1    WARN  an .html file that is not a directory index (verification files are skipped)
 *
 * Exit 1 on any FAIL. `checkDist()` is exported for tests/schema.test.mjs; `parseHtml()` and friends for
 * scripts/md-mirrors.mjs.
 */
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { REPO, normalise, timelessTownHits, phoneHits, TIMELESS_PHONES, NOCO_PHONE, PLACEHOLDERS } from './check-content.mjs';

// ───────────────────────────── a small HTML parser (Astro's output is well formed) ─────────────────────────────

const VOID = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr']);
const RAW = new Set(['script', 'style', 'textarea', 'title']);
const TAG = /<!--[\s\S]*?-->|<![^>]*>|<\/([a-zA-Z][\w:-]*)\s*>|<([a-zA-Z][\w:-]*)((?:\s+[^\s"'>/=]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s"'=<>`]+))?)*)\s*(\/?)>/g;

function parseAttrs(s) {
  const attrs = {};
  for (const m of String(s || '').matchAll(/([^\s"'>/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g)) {
    attrs[m[1].toLowerCase()] = m[2] ?? m[3] ?? m[4] ?? '';
  }
  return attrs;
}

/** Elements are { tag, attrs, children, start, end } (offsets into the source); text is { text }. */
export function parseHtml(html) {
  const root = { tag: '#root', attrs: {}, children: [], start: 0, end: html.length };
  const stack = [root];
  const top = () => stack[stack.length - 1];
  const re = new RegExp(TAG.source, 'g');
  let last = 0, m;
  while ((m = re.exec(html))) {
    if (m.index > last) top().children.push({ text: html.slice(last, m.index) });
    last = re.lastIndex;
    if (m[0].startsWith('<!--')) { top().children.push({ comment: m[0] }); continue; }
    if (m[0].startsWith('<!')) continue;
    if (m[1]) {
      const tag = m[1].toLowerCase();
      for (let i = stack.length - 1; i > 0; i--) {
        if (stack[i].tag !== tag) continue;
        for (let j = stack.length - 1; j > i; j--) stack[j].end = m.index; // implicitly closed
        stack[i].end = re.lastIndex;
        stack.length = i;
        break;
      }
      continue;
    }
    const tag = m[2].toLowerCase();
    const el = { tag, attrs: parseAttrs(m[3]), children: [], start: m.index, end: re.lastIndex };
    top().children.push(el);
    if (VOID.has(tag) || m[4] === '/') continue;
    if (RAW.has(tag)) {
      const close = new RegExp(`</${tag}\\s*>`, 'gi');
      close.lastIndex = re.lastIndex;
      const c = close.exec(html);
      el.children.push({ text: html.slice(re.lastIndex, c ? c.index : html.length) });
      el.end = c ? close.lastIndex : html.length;
      re.lastIndex = el.end;
      last = el.end;
      continue;
    }
    stack.push(el);
  }
  if (last < html.length) top().children.push({ text: html.slice(last) });
  for (let j = stack.length - 1; j > 0; j--) stack[j].end = html.length;
  return root;
}

/** Every element under `node` (depth first) for which pred(el, ancestors) is true. */
export function findAll(node, pred, ancestors = []) {
  const out = [];
  for (const c of node.children ?? []) {
    if (!c.tag) continue;
    if (pred(c, ancestors)) out.push(c);
    out.push(...findAll(c, pred, [...ancestors, c]));
  }
  return out;
}
export const byTag = (node, tag) => findAll(node, (el) => el.tag === tag);

export function decodeEntities(s) {
  return normalise(s);
}
/** The visible text of a node (scripts, styles and templates excluded). */
export function textOf(node) {
  if (node.text !== undefined) return decodeEntities(node.text);
  if (!node.tag || ['script', 'style', 'template', 'noscript'].includes(node.tag)) return '';
  return (node.children ?? []).map(textOf).join('');
}
/** The source with the given element ranges cut out, and the cut parts. */
export function cutRanges(src, els) {
  const ranges = els.map((e) => [e.start, e.end]).sort((a, b) => a[0] - b[0]);
  let outside = '', inside = '', pos = 0;
  for (const [s, e] of ranges) {
    if (s < pos) continue; // nested inside a range already cut
    outside += `${src.slice(pos, s)} `;
    inside += `${src.slice(s, e)} `;
    pos = e;
  }
  return { outside: outside + src.slice(pos), inside };
}

// ───────────────────────────── site facts the checks compare against ─────────────────────────────

const RENDERABLE = new Set(['VERIFIED', 'CLIENT_STATED', 'CLIENT_CONFIRMED', 'EXTERNAL_SOURCE']);
const factValue = (n) => (n && RENDERABLE.has(String(n.status)) && n.source && n.value !== null && n.value !== undefined && n.value !== '' ? n.value : null);
const digits10 = (s) => String(s ?? '').replace(/\D/g, '').slice(-10);

export function readSite(repo = REPO) {
  const src = fs.readFileSync(path.join(repo, 'src/data/site.ts'), 'utf8');
  const pre = src.match(/export\s+const\s+PRELAUNCH\s*(?::\s*boolean\s*)?=\s*(true|false)/);
  if (!pre) throw new Error('src/data/site.ts has no `export const PRELAUNCH = true|false`');
  const site = src.match(/export\s+const\s+SITE\s*=\s*['"]([^'"]+)['"]/);
  return { prelaunch: pre[1] === 'true', site: (site?.[1] ?? 'https://www.nocoturf.com').replace(/\/$/, '') };
}

export function readBrief(file = path.join(REPO, '.site/truth/brief.json')) {
  const b = JSON.parse(fs.readFileSync(file, 'utf8'));
  const loc = (b.identity?.locations ?? [])[0] ?? {};
  const phone = factValue(loc.phone);
  return { name: factValue(b.identity?.display_name), phoneDigits: phone ? digits10(phone) : null, raw: b };
}

// ───────────────────────────── the checks ─────────────────────────────

const NOINDEX_ROUTES = new Set(['/thanks/', '/review/', '/404/']);
const RATING_KEYS = new Set(['aggregateRating', 'ratingValue', 'reviewCount', 'review', 'reviews', 'ratingCount', 'bestRating']);
const RATING_TYPES = new Set(['Review', 'AggregateRating', 'Rating', 'EmployerAggregateRating']);

/** Tokens from the contract, beyond the TIMELESS phones, name and towns handled below. */
const CONTRACT_TOKENS = [
  ...PLACEHOLDERS.filter(([, label]) => label !== 'TODO/TBD'),
  [/aggregateRating/, 'aggregateRating'], [/ratingValue/, 'ratingValue'], [/reviewCount/, 'reviewCount'],
  [/"@type"\s*:\s*"Review"/, '"@type":"Review"'], [/(?<!\d)24\s*\/\s*7(?!\d)/, '24/7'],
];

/** Banned-token scan for one file. `boundaryText` is what sits inside data-boundary elements. */
export function scanBanned(text, { boundaryText = '', where = '' } = {}) {
  const issues = [];
  const t = normalise(text);
  const b = normalise(boundaryText);
  const all = `${t} ${b}`;
  const collapsed = all.replace(/(\d)[^\dA-Za-z<>]{1,3}(?=\d)/g, '$1');
  for (const d of TIMELESS_PHONES) {
    if (phoneHits(all).some((p) => p.digits === d) || collapsed.includes(d)) issues.push(['FAIL', 'BAN-1', `TIMELESS phone ${d} ${where}`]);
  }
  const tm = t.match(/timeless/i);
  if (tm) issues.push(['FAIL', 'BAN-1', `"${tm[0]}" outside the data-boundary note ${where}: …${t.slice(Math.max(0, tm.index - 40), tm.index + 50).replace(/\s+/g, ' ')}…`]);
  const bm = b.match(/timeless/i);
  if (bm) issues.push(['WARN', 'BAN-2', `"${bm[0]}" inside the data-boundary note ${where} — CONTRACTS.md excepts only "Denver" there`]);
  const seen = new Set();
  for (const h of timelessTownHits(t)) {
    if (seen.has(h.name)) continue;
    seen.add(h.name);
    issues.push(['FAIL', 'BAN-1', `TIMELESS town "${h.name}" outside the data-boundary note ${where}: …${t.slice(Math.max(0, h.index - 40), h.index + 50).replace(/\s+/g, ' ')}…`]);
  }
  for (const [re, label] of CONTRACT_TOKENS) {
    const m = t.match(re) || b.match(re);
    if (m) issues.push(['FAIL', 'BAN-1', `banned token "${label}" ${where}`]);
  }
  const todo = t.match(/\bTODO\b|\bFIXME\b|\bTBD\b/);
  if (todo) issues.push(['WARN', 'BAN-3', `"${todo[0]}" shipped ${where}`]);
  return issues;
}

function routeOf(rel) {
  if (rel === 'index.html') return '/';
  if (rel.endsWith('/index.html')) return `/${rel.slice(0, -'index.html'.length)}`;
  if (rel === '404.html') return '/404/';
  return null;
}
function walkFiles(dir, base = dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    return e.isDirectory() ? walkFiles(p, base) : [path.relative(base, p).split(path.sep).join('/')];
  });
}
function jsonNodes(value, visit, parentKey = null) {
  if (Array.isArray(value)) { for (const v of value) jsonNodes(v, visit, parentKey); return; }
  if (!value || typeof value !== 'object') return;
  visit(value, parentKey);
  for (const [k, v] of Object.entries(value)) jsonNodes(v, visit, k);
}
const typesOf = (node) => [].concat(node['@type'] ?? []).map(String);
const meta = (root, name) => findAll(root, (el) => el.tag === 'meta' && (el.attrs.name || '').toLowerCase() === name);

/** Checks one HTML page. Returns { issues, noindex, business[] }. */
export function checkPage(route, html, { prelaunch, site, brief }) {
  const issues = [];
  const add = (level, code, msg) => issues.push([level, code, `${route} ${msg}`]);
  const root = parseHtml(html);

  // banned tokens, with the boundary note cut out
  const boundaries = findAll(root, (el) => 'data-boundary' in el.attrs);
  if (boundaries.length > 1) add('WARN', 'BOUNDARY-2', `has ${boundaries.length} data-boundary elements — the contract names one boundary note component`);
  const { outside, inside } = cutRanges(html, boundaries);
  for (const [lvl, code, msg] of scanBanned(outside, { boundaryText: inside, where: `on ${route}` })) issues.push([lvl, code, msg]);

  // head
  const titles = byTag(root, 'title');
  const title = titles.length ? textOf(titles[0]).trim() : '';
  if (!title) add('FAIL', 'TITLE-1', 'has no <title>');
  else if (title.length > 70) add('WARN', 'TITLE-2', `title is ${title.length} characters: "${title}"`);
  const h1 = byTag(root, 'h1').length;
  if (h1 !== 1) add('FAIL', 'H1-1', `has ${h1} <h1> elements (exactly one)`);
  if (!meta(root, 'viewport').length) add('FAIL', 'VIEWPORT-1', 'has no <meta name="viewport">');

  const canon = findAll(root, (el) => el.tag === 'link' && (el.attrs.rel || '').toLowerCase().split(/\s+/).includes('canonical'));
  const expected = `${site}${route}`;
  if (canon.length !== 1) add('FAIL', 'CANON-1', `has ${canon.length} canonical links (exactly one)`);
  else if (canon[0].attrs.href !== expected) add('FAIL', 'CANON-1', `canonical is ${canon[0].attrs.href}, expected ${expected}`);

  const robots = meta(root, 'robots');
  const noindex = robots.some((el) => /noindex/i.test(el.attrs.content || ''));
  const mustNoindex = prelaunch || NOINDEX_ROUTES.has(route);
  if (robots.length > 1) add('FAIL', 'ROBOTS-1', `has ${robots.length} robots meta tags`);
  if (mustNoindex && !noindex) add('FAIL', 'ROBOTS-1', `must be noindex (${prelaunch ? 'PRELAUNCH is true' : 'utility page'}) but is not`);
  if (!mustNoindex && noindex) add('FAIL', 'ROBOTS-1', 'is noindex but is neither a utility page nor PRELAUNCH — a page that should not be indexed should not exist');
  if (!noindex && !meta(root, 'description').some((el) => (el.attrs.content || '').trim())) add('WARN', 'DESC-1', 'has no meta description');

  // one form, posting to the lead function
  const forms = byTag(root, 'form');
  if (forms.length > 1) add('FAIL', 'FORM-1', `has ${forms.length} <form> elements (at most one)`);
  for (const f of forms) if (/^\/api\//.test(f.attrs.action || '')) add('FAIL', 'FORM-2', `form posts to ${f.attrs.action} — use /.netlify/functions/lead (preflight LEAD-1)`);

  // tel: links
  for (const a of findAll(root, (el) => el.tag === 'a' && /^tel:/i.test(el.attrs.href || ''))) {
    const href = a.attrs.href.trim();
    if (!/^tel:\+1\d{10}$/.test(href)) { add('FAIL', 'TEL-1', `tel link "${href}" is not +1 and ten digits`); continue; }
    const d = href.slice(-10);
    if (d === NOCO_PHONE && brief.phoneDigits !== NOCO_PHONE) add('FAIL', 'TEL-2', `dials ${href} but the brief has no renderable phone with those digits — nothing renders that the brief doesn't hold`);
    else if (d !== brief.phoneDigits && !TIMELESS_PHONES.includes(d)) add('WARN', 'TEL-3', `dials ${href}, which is not the brief's number`);
  }

  // images
  for (const img of byTag(root, 'img')) {
    const missing = ['width', 'height', 'alt'].filter((k) => !(k in img.attrs));
    if (missing.length) add('FAIL', 'IMG-1', `<img src="${img.attrs.src || ''}"> has no ${missing.join(', ')}`);
  }

  // structured data
  const business = [];
  for (const s of findAll(root, (el) => el.tag === 'script' && (el.attrs.type || '').toLowerCase() === 'application/ld+json')) {
    let data;
    try { data = JSON.parse((s.children[0]?.text ?? '').trim()); }
    catch (e) { add('FAIL', 'SCHEMA-0', `JSON-LD does not parse: ${e.message}`); continue; }
    jsonNodes(data, (node) => {
      for (const k of Object.keys(node)) if (RATING_KEYS.has(k)) add('FAIL', 'SCHEMA-1', `JSON-LD carries "${k}" — no rating or review markup, ever`);
      for (const t of typesOf(node)) {
        if (RATING_TYPES.has(t)) add('FAIL', 'SCHEMA-1', `JSON-LD has a ${t} node`);
        if (t === 'LandscapeService') add('FAIL', 'BAN-1', 'JSON-LD @type LandscapeService is not a schema.org type');
      }
      const id = typeof node['@id'] === 'string' ? node['@id'] : '';
      if (/#business$/.test(id) && node['@type']) {
        if (id !== `${site}/#business`) add('FAIL', 'SCHEMA-4', `#business @id is ${id}, expected ${site}/#business`);
        business.push(node);
      }
    });
  }
  if (business.length > 1) add('FAIL', 'SCHEMA-2', `has ${business.length} #business nodes (at most one)`);
  for (const b of business) {
    if (!brief.phoneDigits) add('FAIL', 'SCHEMA-3', 'has a #business node but the brief has no renderable phone (Base.astro emits the node only with name AND phone)');
    else if (digits10(b.telephone) !== brief.phoneDigits) add('FAIL', 'SCHEMA-3', `#business telephone ${b.telephone ?? '(none)'} differs from the brief (${brief.phoneDigits})`);
    if (brief.name && b.name !== brief.name) add('FAIL', 'SCHEMA-5', `#business name "${b.name}" differs from the brief ("${brief.name}")`);
  }

  return { issues, noindex, business };
}

function robotsGroups(txt) {
  const groups = [];
  let cur = null, lastWasAgent = false;
  for (const raw of txt.split(/\r?\n/)) {
    const line = raw.replace(/#.*$/, '').trim();
    if (!line) continue;
    const [k, ...rest] = line.split(':');
    const key = k.trim().toLowerCase(), val = rest.join(':').trim();
    if (key === 'user-agent') {
      if (!lastWasAgent) { cur = { agents: [], rules: [] }; groups.push(cur); }
      cur.agents.push(val.toLowerCase());
      lastWasAgent = true;
    } else {
      lastWasAgent = false;
      if (cur && (key === 'allow' || key === 'disallow')) cur.rules.push([key, val]);
    }
  }
  return groups;
}

/** Runs every rule over a built site. Returns { fails: string[], warns: string[], pages }. */
export function checkDist(dir, opts = {}) {
  const { prelaunch, site } = { ...readSite(), ...opts };
  const brief = opts.brief ?? readBrief(opts.briefFile);
  const ctx = { prelaunch, site, brief };
  const fails = [], warns = [];
  const push = ([lvl, code, msg]) => (lvl === 'FAIL' ? fails : warns).push(`${code} ${msg}`);

  const files = walkFiles(dir);
  const pages = {};
  const businessSeen = [];
  for (const rel of files.filter((f) => f.endsWith('.html')).sort()) {
    const route = routeOf(rel);
    if (!route) {
      if (!/^google[0-9a-f]+\.html$/.test(path.basename(rel))) push(['WARN', 'LOOSE-1', `${rel} is an .html file outside the directory-index scheme`]);
      continue;
    }
    const html = fs.readFileSync(path.join(dir, rel), 'utf8');
    const r = checkPage(route, html, ctx);
    r.issues.forEach(push);
    pages[route] = { file: rel, noindex: r.noindex };
    for (const b of r.business) businessSeen.push([route, JSON.stringify({ name: b.name, telephone: b.telephone, url: b.url, address: b.address })]);
  }
  const variants = new Set(businessSeen.map(([, k]) => k));
  if (variants.size > 1) push(['FAIL', 'ENTITY-1', `#business differs between pages: ${[...variants].join(' vs ')}`]);

  for (const rel of files.filter((f) => f.endsWith('.md') || /^llms[^/]*\.txt$/.test(f))) {
    for (const issue of scanBanned(fs.readFileSync(path.join(dir, rel), 'utf8'), { where: `in ${rel}` })) push(issue);
  }

  // robots.txt
  const robotsPath = path.join(dir, 'robots.txt');
  if (!fs.existsSync(robotsPath)) push(['FAIL', 'ROBOTSTXT-1', 'dist/robots.txt is missing']);
  else {
    const txt = fs.readFileSync(robotsPath, 'utf8');
    scanBanned(txt, { where: 'in robots.txt' }).forEach(push);
    const star = robotsGroups(txt).filter((g) => g.agents.includes('*'));
    const blocksAll = star.some((g) => g.rules.some(([k, v]) => k === 'disallow' && v === '/'));
    if (prelaunch && !blocksAll) push(['FAIL', 'ROBOTSTXT-1', 'PRELAUNCH is true but robots.txt does not Disallow: / for User-agent: *']);
    if (!prelaunch && blocksAll) push(['FAIL', 'ROBOTSTXT-1', 'PRELAUNCH is false but robots.txt still blocks every crawler']);
    if (!prelaunch && !txt.includes(`Sitemap: ${site}/sitemap.xml`)) push(['FAIL', 'ROBOTSTXT-1', `robots.txt does not name Sitemap: ${site}/sitemap.xml`]);
  }

  // sitemap.xml
  const smPath = path.join(dir, 'sitemap.xml');
  if (!fs.existsSync(smPath)) push(['FAIL', 'SITEMAP-1', 'dist/sitemap.xml is missing']);
  else {
    const xml = fs.readFileSync(smPath, 'utf8');
    scanBanned(xml, { where: 'in sitemap.xml' }).forEach(push);
    const locs = [...xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)].map((m) => normalise(m[1]));
    if (prelaunch && locs.length) push(['FAIL', 'SITEMAP-4', `PRELAUNCH is true but sitemap.xml lists ${locs.length} URL(s) — nothing is meant to be indexed yet`]);
    const listed = new Set();
    for (const loc of locs) {
      if (listed.has(loc)) push(['FAIL', 'SITEMAP-1', `sitemap lists ${loc} twice`]);
      listed.add(loc);
      if (!loc.startsWith(`${site}/`) || !loc.endsWith('/')) { push(['FAIL', 'SITEMAP-1', `sitemap URL ${loc} is not ${site}/…/ with a trailing slash`]); continue; }
      const route = loc.slice(site.length);
      const page = pages[route];
      if (!page) push(['FAIL', 'SITEMAP-2', `sitemap lists ${loc}, which has no built page`]);
      else if (!prelaunch && page.noindex) push(['FAIL', 'SITEMAP-3', `sitemap lists ${loc}, which is noindex`]);
    }
    if (!prelaunch) {
      for (const [route, p] of Object.entries(pages)) if (!p.noindex && !listed.has(`${site}${route}`)) push(['FAIL', 'SITEMAP-5', `indexable page ${route} is not in sitemap.xml`]);
    }
  }

  // llms.txt
  const llms = path.join(dir, 'llms.txt');
  if (!fs.existsSync(llms)) push(['WARN', 'LLMS-1', 'dist/llms.txt is missing — run node scripts/md-mirrors.mjs dist before this check']);
  else if (prelaunch && !/prelaunch/i.test(fs.readFileSync(llms, 'utf8'))) push(['WARN', 'LLMS-2', 'PRELAUNCH is true but llms.txt does not say the site is in prelaunch']);

  return { fails, warns, pages, prelaunch };
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (isMain) {
  const args = process.argv.slice(2);
  const dir = path.resolve(args.find((a) => !a.startsWith('--')) ?? 'dist');
  const opts = {};
  for (const a of args) {
    if (a.startsWith('--prelaunch=')) opts.prelaunch = a.slice(12) === 'true';
    if (a.startsWith('--brief=')) opts.briefFile = path.resolve(a.slice(8));
  }
  if (!fs.existsSync(dir)) { console.error(`check-dist: ${dir} does not exist — run astro build first`); process.exit(2); }
  const { fails, warns, pages, prelaunch } = checkDist(dir, opts);
  console.log(`check-dist: ${Object.keys(pages).length} pages · PRELAUNCH ${prelaunch} · ${fails.length} fail(s) · ${warns.length} warning(s)`);
  for (const f of fails) console.log(`  x FAIL ${f}`);
  for (const w of warns) console.log(`  ! WARN ${w}`);
  process.exit(fails.length ? 1 : 0);
}
