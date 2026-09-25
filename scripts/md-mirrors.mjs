#!/usr/bin/env node
/**
 * Markdown mirrors, llms.txt and llms-full.txt, written into dist/ after `astro build`.
 * Forked from TIMELESS Grass & Greens (scripts/md-mirrors.mjs); turndown is replaced by the small
 * parser in scripts/check-dist.mjs, so this adds no dependency.
 *
 *   node scripts/md-mirrors.mjs [dist]
 *
 * Every indexable page gets a clean Markdown copy at its own address + "index.html.md" (the llms.txt
 * convention for URLs that end in a slash), converted from the built <main> so it cannot drift from the
 * page. Pages marked noindex get no mirror. The data-boundary note (which routes Denver-metro visitors
 * elsewhere) is navigation, not content, and is left out.
 *
 * llms.txt is written ONLY from renderable facts in .site/truth/brief.json (the same gate as
 * src/data/brief.ts: status VERIFIED | CLIENT_STATED | CLIENT_CONFIRMED | EXTERNAL_SOURCE, a value and a
 * source) plus the published routes — so it cannot say anything the pages don't. While PRELAUNCH is true
 * (src/data/site.ts) it is a minimal file saying the site is in prelaunch, and no mirrors are written.
 * seo.md: it costs ten minutes and may become load-bearing; never spend a second hour on it.
 *
 * Guides are grouped by topic (src/data/guide-topics.ts order): each topic's hub first, then its guides,
 * so a hundred guides read as a dozen short lists. A page's topic is read from its own BreadcrumbList
 * (Home › Guides › {topic hub} › …), the same trail the page prints.
 */
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { parseHtml, findAll, textOf, readSite } from './check-dist.mjs';
import { REPO, normalise } from './check-content.mjs';
import { GUIDE_TOPICS } from '../src/data/guide-topics.ts';

const RENDERABLE = new Set(['VERIFIED', 'CLIENT_STATED', 'CLIENT_CONFIRMED', 'EXTERNAL_SOURCE']);
/** The value if it may render, else null — mirrors fact() in src/data/brief.ts. */
export function fact(node) {
  if (!node || typeof node !== 'object' || !('value' in node)) return null;
  if (!RENDERABLE.has(String(node.status))) return null;
  if (node.value === null || node.value === undefined || node.value === '') return null;
  if (!node.source) return null;
  return node.value;
}
/** A list entry is either a fact node or an object whose `field` is one. */
const factOf = (entry, field) => (entry && 'value' in entry ? fact(entry) : fact(entry?.[field]));

// ───────────────────────────── HTML → Markdown ─────────────────────────────

const DROP = new Set(['script', 'style', 'svg', 'dialog', 'form', 'button', 'iframe', 'noscript', 'picture', 'img', 'template',
  'nav', 'select', 'textarea', 'input', 'canvas', 'video', 'audio', 'object', 'map']);
const BLOCK = new Set(['div', 'section', 'article', 'header', 'footer', 'aside', 'figure', 'main', 'details', 'address', 'hgroup', 'fieldset']);

function dropped(el) {
  if (DROP.has(el.tag)) return true;
  const a = el.attrs;
  if (a['aria-hidden'] === 'true' || 'hidden' in a || 'data-boundary' in a || a['data-md'] === 'skip') return true;
  return /\b(crumbs|breadcrumbs?|skip)\b/.test(a.class || '');
}

function inline(s) {
  return s.replace(/\s*\n\s*/g, ' ').replace(/\s{2,}/g, ' ').trim();
}

export function toMarkdown(node, base) {
  const kids = () => (node.children ?? []).map((c) => toMarkdown(c, base)).join('');
  if (node.text !== undefined) return normalise(node.text).replace(/\s+/g, ' ');
  if (!node.tag) return '';
  if (node.tag !== '#root' && dropped(node)) return '';
  const h = node.tag.match(/^h([1-6])$/);
  if (h) { const t = inline(kids()); return t ? `\n\n${'#'.repeat(Number(h[1]))} ${t}\n\n` : ''; }
  switch (node.tag) {
    case 'p': { const t = kids().trim(); return t ? `\n\n${t}\n\n` : ''; }
    case 'br': return '\n';
    case 'hr': return '\n\n---\n\n';
    case 'strong': case 'b': { const t = inline(kids()); return t ? `**${t}**` : ''; }
    case 'em': case 'i': { const t = inline(kids()); return t ? `*${t}*` : ''; }
    case 'code': { const t = inline(kids()); return t ? `\`${t}\`` : ''; }
    case 'a': {
      const t = inline(kids());
      const href = node.attrs.href;
      if (!t) return '';
      if (!href || href.startsWith('#')) return t;
      let url = href;
      if (!/^(tel|mailto|sms):/i.test(href)) { try { url = new URL(href, base).href; } catch { return t; } }
      return `[${t}](${url})`;
    }
    case 'ul': case 'ol': {
      const items = node.children.filter((c) => c.tag === 'li' && !dropped(c));
      const lines = items.map((li, i) => {
        const body = toMarkdown({ ...li, tag: 'span' }, base).replace(/\n{2,}/g, '\n').trim();
        const marker = node.tag === 'ol' ? `${i + 1}.` : '-';
        return body.split('\n').map((l, j) => (j ? `${' '.repeat(marker.length + 1)}${l}` : `${marker} ${l}`)).join('\n');
      });
      return lines.length ? `\n\n${lines.join('\n')}\n\n` : '';
    }
    case 'blockquote': {
      const t = kids().replace(/\n{3,}/g, '\n\n').trim();
      return t ? `\n\n${t.split('\n').map((l) => `> ${l}`.trimEnd()).join('\n')}\n\n` : '';
    }
    case 'figcaption': { const t = inline(kids()); return t ? `\n\nPhoto: ${t}\n\n` : ''; }
    case 'dl': {
      const out = [];
      for (const c of node.children) {
        if (c.tag === 'dt') out.push(`**${inline(toMarkdown({ ...c, tag: 'span' }, base))}**`);
        if (c.tag === 'dd') out.push(`: ${inline(toMarkdown({ ...c, tag: 'span' }, base))}`);
        if (c.tag === 'div') for (const d of c.children) {
          if (d.tag === 'dt') out.push(`**${inline(toMarkdown({ ...d, tag: 'span' }, base))}**`);
          if (d.tag === 'dd') out.push(`: ${inline(toMarkdown({ ...d, tag: 'span' }, base))}`);
        }
      }
      return out.length ? `\n\n${out.join('\n')}\n\n` : '';
    }
    case 'table': {
      const rows = findAll(node, (el) => el.tag === 'tr').map((tr) =>
        tr.children.filter((c) => c.tag === 'th' || c.tag === 'td').map((c) => inline(toMarkdown({ ...c, tag: 'span' }, base)).replace(/\|/g, '\\|')));
      if (!rows.length) return '';
      const width = Math.max(...rows.map((r) => r.length));
      const pad = (r) => [...r, ...Array(width - r.length).fill('')];
      const caption = findAll(node, (el) => el.tag === 'caption')[0];
      const head = caption ? `**${inline(textOf(caption))}**\n\n` : '';
      return `\n\n${head}| ${pad(rows[0]).join(' | ')} |\n|${' --- |'.repeat(width)}\n${rows.slice(1).map((r) => `| ${pad(r).join(' | ')} |`).join('\n')}\n\n`;
    }
    case 'caption': return '';
    case 'summary': { const t = inline(kids()); return t ? `\n\n**${t}**\n\n` : ''; }
    default:
      return BLOCK.has(node.tag) ? `\n\n${kids()}\n\n` : kids();
  }
}

function tidy(md) {
  return md.split('\n').map((l) => l.replace(/[ \t]+$/, '')).join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

// ───────────────────────────── the run ─────────────────────────────

const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
  const p = path.join(dir, e.name);
  return e.isDirectory() ? walk(p) : e.name === 'index.html' ? [p] : [];
});
const meta = (root, name) => findAll(root, (el) => el.tag === 'meta' && (el.attrs.name || '').toLowerCase() === name)[0]?.attrs.content ?? '';
/** The page's BreadcrumbList as absolute URLs in order (Base.astro emits it from the printed crumbs). */
function breadcrumbs(root) {
  for (const s of findAll(root, (el) => el.tag === 'script' && (el.attrs.type || '').toLowerCase() === 'application/ld+json')) {
    try {
      const data = JSON.parse((s.children[0]?.text ?? '').trim());
      const bc = [].concat(data['@graph'] ?? data).find((n) => n?.['@type'] === 'BreadcrumbList');
      if (bc) return [...bc.itemListElement].sort((a, b) => a.position - b.position).map((i) => i.item);
    } catch { /* check-dist reports JSON-LD that does not parse */ }
  }
  return [];
}

export function buildLlms({ brief, site, prelaunch, pages }) {
  const host = new URL(site).host;
  const name = fact(brief.identity?.display_name);
  if (prelaunch) {
    return `# ${name ?? host}\n\n> ${host} is in prelaunch: the new site is being built, and nothing here is meant to be indexed or cited yet.\n`;
  }
  const loc = (brief.identity?.locations ?? [])[0] ?? {};
  const L = [`# ${name ?? host}`, ''];
  const diff = fact(brief.positioning?.differentiator_verbatim);
  if (typeof diff === 'string') L.push(`> ${diff}`, '');
  const areas = (brief.service_areas ?? []).map((a) => factOf(a, 'name')).filter((v) => typeof v === 'string');
  if (areas.length) L.push(`Service area: ${areas.join(', ')}`);
  const phone = fact(loc.phone);
  if (typeof phone === 'string') L.push(`Phone: ${phone}`);
  const hours = fact(loc.hours);
  if (typeof hours === 'string') L.push(`Hours: ${hours}`);
  if (L[L.length - 1] !== '') L.push('');

  const services = (brief.services ?? []).map((s) => ({ name: factOf(s, 'name'), pricing: fact(s?.pricing_model), what: fact(s?.client_description) }))
    .filter((s) => typeof s.name === 'string');
  if (services.length) {
    L.push('## Services', '');
    for (const s of services) L.push(`- **${s.name}**${typeof s.pricing === 'string' ? ` (${s.pricing})` : ''}${typeof s.what === 'string' ? `: ${s.what}` : ''}`);
    L.push('');
  }
  const nots = (brief.do_not_offer ?? []).map((n) => factOf(n, 'name')).filter((v) => typeof v === 'string');
  if (nots.length) L.push('## Not offered', '', ...nots.map((n) => `- ${n}`), '');

  if (pages.length) {
    L.push('Every page below has a Markdown copy at its own address with `index.html.md` appended; the links point to those copies.', '');
    const rel = (u) => u.slice(site.length);
    const home = pages.find((p) => rel(p.url) === '/');
    if (home) L.push(`- [Home](${home.md})${home.description ? `: ${home.description}` : ''}`, '');
    const SECTIONS = [
      ['Services', (r) => r.startsWith('/services/') || r === '/turf-supply/'],
      ['Towns we serve', (r) => r.startsWith('/areas/')],
      ['Work', (r) => r.startsWith('/work/')],
      ['Guides and tools', (r) => r.startsWith('/guides/') || r.startsWith('/tools/')],
      ['About', (r) => ['/about/', '/contact/', '/privacy/', '/terms/'].includes(r)],
    ];
    const used = new Set(home ? [home.url] : []);
    const line = (p) => `- [${p.title}](${p.md})${p.description ? `: ${p.description}` : ''}`;
    for (const [label, test] of SECTIONS) {
      const list = pages.filter((p) => !used.has(p.url) && test(rel(p.url))).sort((a, b) => a.url.localeCompare(b.url));
      list.forEach((p) => used.add(p.url));
      if (!list.length) continue;
      if (label !== 'Guides and tools') { L.push(`## ${label}`, '', ...list.map(line), ''); continue; }
      // guides: the pages outside any topic, then one sub-list per topic — its hub first, then its guides
      const topicOf = (p) => (p.crumbs?.[2] ?? '').slice(site.length).match(/^\/guides\/([a-z0-9-]+)\/$/)?.[1] ?? null;
      const known = GUIDE_TOPICS.map((t) => t.slug);
      const found = [...new Set(list.map(topicOf).filter(Boolean))];
      const order = [...known.filter((s) => found.includes(s)), ...found.filter((s) => !known.includes(s))];
      L.push(`## ${label}`, '', ...list.filter((p) => !topicOf(p)).map(line), '');
      for (const slug of order) {
        const hub = `${site}/guides/${slug}/`;
        const group = list.filter((p) => topicOf(p) === slug).sort((a, b) => (a.url === hub ? -1 : b.url === hub ? 1 : a.url.localeCompare(b.url)));
        L.push(`### ${GUIDE_TOPICS.find((t) => t.slug === slug)?.name ?? group[0].title}`, '', ...group.map(line), '');
      }
    }
    const rest = pages.filter((p) => !used.has(p.url)).sort((a, b) => a.url.localeCompare(b.url));
    if (rest.length) L.push('## Other pages', '', ...rest.map(line), '');
  }

  const faqs = (brief.faq_harvest ?? []).map((f) => ({ q: fact(f?.question), a: fact(f?.client_answer) }))
    .filter((f) => typeof f.q === 'string' && typeof f.a === 'string');
  if (faqs.length) {
    L.push('## Questions', '');
    for (const f of faqs) L.push(`### ${f.q}`, '', f.a, '');
  }
  if (pages.length) L.push('## Optional', '', `- [Full text of every page](${site}/llms-full.txt): all of the Markdown copies in one file`, '');
  return `${L.join('\n').replace(/\n{3,}/g, '\n\n').trim()}\n`;
}

export function run(distArg = 'dist', { prelaunch: forcePrelaunch, briefFile, log = console.log } = {}) {
  const DIST = path.resolve(distArg);
  const { prelaunch: sitePrelaunch, site } = readSite(REPO);
  const prelaunch = forcePrelaunch ?? sitePrelaunch;
  const brief = JSON.parse(fs.readFileSync(briefFile ?? path.join(REPO, '.site/truth/brief.json'), 'utf8'));
  const name = fact(brief.identity?.display_name);

  const pages = [];
  for (const file of walk(DIST)) {
    const html = fs.readFileSync(file, 'utf8');
    const root = parseHtml(html);
    const mirror = file.replace(/index\.html$/, 'index.html.md');
    const noindex = /noindex/i.test(meta(root, 'robots'));
    if (noindex || prelaunch) { if (fs.existsSync(mirror)) fs.rmSync(mirror); continue; }
    const main = findAll(root, (el) => el.tag === 'main')[0];
    const canon = findAll(root, (el) => el.tag === 'link' && /\bcanonical\b/i.test(el.attrs.rel || ''))[0]?.attrs.href;
    if (!main || !canon) { log(`md-mirrors: skipped ${path.relative(DIST, file)} (no <main> or no canonical)`); continue; }
    const titleEl = findAll(root, (el) => el.tag === 'title')[0];
    let title = titleEl ? textOf(titleEl).trim() : '';
    title = name ? title.replace(new RegExp(`\\s*[|\\u2014\\u2013-]\\s*${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`), '') : title.replace(/\s+\|\s+[^|]+$/, '');
    const description = normalise(meta(root, 'description'));
    const crumbs = breadcrumbs(root);
    const body = tidy(toMarkdown(main, canon));
    const stated = (textOf(main).match(/(?:Updated|Last checked|Checked|Verified)\s+(\d{4}-\d{2}-\d{2})/) || [])[1];
    const front = `---\ntitle: ${JSON.stringify(title)}\ndescription: ${JSON.stringify(description)}\nurl: ${canon}\n${stated ? `updated: ${stated}\n` : ''}---\n\n`;
    fs.writeFileSync(mirror, `${front}${body}\n`);
    pages.push({ url: canon, md: `${canon}index.html.md`, title, description, body, crumbs });
  }

  fs.writeFileSync(path.join(DIST, 'llms.txt'), buildLlms({ brief, site, prelaunch, pages }));
  const fullPath = path.join(DIST, 'llms-full.txt');
  if (prelaunch || !pages.length) {
    if (fs.existsSync(fullPath)) fs.rmSync(fullPath);
  } else {
    const full = pages.slice().sort((a, b) => a.url.localeCompare(b.url)).map((p) => `# ${p.title}\n\nSource: ${p.url}\n\n${p.body}`).join('\n\n---\n\n');
    fs.writeFileSync(fullPath, `# ${name ?? new URL(site).host} — full text\n\n${pages.length} pages.\n\n---\n\n${full}\n`);
  }

  if (prelaunch) { log('md-mirrors: PRELAUNCH — no mirrors; wrote a minimal llms.txt'); return { pages, ok: true }; }
  if (!pages.length) { log('md-mirrors: no indexable pages mirrored — has <main> changed, or is every page noindex?'); return { pages, ok: false }; }
  log(`md-mirrors: ${pages.length} Markdown copies, llms.txt, llms-full.txt`);
  return { pages, ok: true };
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (isMain) {
  const args = process.argv.slice(2);
  const opts = {};
  for (const a of args) {
    if (a.startsWith('--prelaunch=')) opts.prelaunch = a.slice(12) === 'true';
    if (a.startsWith('--brief=')) opts.briefFile = path.resolve(a.slice(8));
  }
  const dist = args.find((a) => !a.startsWith('--')) ?? 'dist';
  if (!fs.existsSync(dist)) { console.error(`md-mirrors: ${dist} does not exist — run astro build first`); process.exit(2); }
  process.exit(run(dist, opts).ok ? 0 : 1);
}
