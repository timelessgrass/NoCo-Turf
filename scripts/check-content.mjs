#!/usr/bin/env node
/**
 * Checks town, guide, service and work records before they can ship — or be committed to a public repo.
 * Forked from TIMELESS Grass & Greens (scripts/check-local-content.mjs + check-articles.mjs) with the
 * bans inverted: here "Timeless", Denver-metro towns and TIMELESS phones are the leaks.
 *
 *   node scripts/check-content.mjs                    # every record, similarity, per-town gate report
 *   node scripts/check-content.mjs <file>...          # just these files (no similarity check)
 *   node scripts/check-content.mjs --root <dir>       # read content/layers/claims under <dir> (fixtures)
 *
 * Reads src/content/{towns/*.json, guides/*.md, services/*.md, work/*.json}, src/data/layers/*.json and
 * .site/truth/claims.json. Code (the collection schemas, territory, the town gate, services.ts, photos.ts)
 * always comes from this repo, so a fixture root only needs the data it is testing.
 *
 * Service records (src/content/services/{slug}.md) get the guide rules plus their own: the file is named
 * for a services.ts slug; photos are photos.ts ids; guides are guide records that exist; the title ends
 * "| NoCo Turf Co."; the description is 140–160 characters; the answer is at most 60 words; the body has
 * no H1 (the page prints the one H1). WARN: an H2 that is not a question, fewer than 3 or more than 5 H2s,
 * fewer than 4 or more than 6 FAQ items.
 *
 * FAIL (exit 1) — for every status, because drafts are committed to a public repo and are the pages
 * that will publish:
 *   - anything src/content.config.ts would reject (the real schemas are loaded, not a hand copy)
 *   - a town slug outside src/data/territory.mjs NOCO_TOWNS, a region that disagrees with it, a file
 *     name that is not {slug}.json, a town listed as its own neighbour
 *   - a layerRefs id missing from src/data/layers/*.json (a WARN while that directory is empty)
 *   - a number of 11+ or with a decimal that is not in a referenced layer record (numbers, fact, quote,
 *     source label, dates) or the record's own source labels (a WARN while the layers are empty)
 *   - an outside link in the copy that is not among the record's sources; an internal link without
 *     its trailing slash
 *   - "Timeless", a TIMELESS town (territory.mjs TIMELESS_TOWNS), a TIMELESS phone, NoCo's own phone
 *     typed into copy (it renders from the brief), a placeholder token (Acme, SOURCE TBD, lorem, …)
 *   - an unsourced business claim — licensed, insured, bonded, certified, warranty, guarantee, best,
 *     #1, top-rated, cheapest, affordable, years of experience, family-owned, 24/7, "we've installed",
 *     star or review counts, "starting at", a $ price — unless an approved .site/truth/claims.json
 *     entry covers the exact wording, or the phrase is quoted from a referenced layer record
 *   - demographic or wealth language (median income, affluent, wealthy, upscale, home values, …),
 *     profanity
 *   - two town records sharing more than 25% of their five-word runs (WARN above 15%)
 *   - a PUBLISHED town that fails src/lib/town-gate.mjs (≥3 blocks, ≥2 own, a photo); for a draft or
 *     review record the same result is a WARN, printed with its needsFromBrian list
 * WARN: street-address-shaped text, other phone numbers, stale source dates, a layer applied to a
 *   town it does not list, a referenced layer whose source URL is not among the record's sources.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { NOCO_TOWNS, TIMELESS_TOWNS, townBySlug, townEligibility } from '../src/data/territory.mjs';
import { townGate } from '../src/lib/town-gate.mjs';
import { CONTENT_STATUSES, isPublished } from '../src/lib/content-policy.mjs';

export const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'); // the repo path has spaces

// ───────────────────────────── shared text rules (check-dist.mjs imports these) ─────────────────────────────

/** TIMELESS Grass & Greens numbers: never on a NoCo page, in any spelling. */
export const TIMELESS_PHONES = ['3033492368', '8542049227'];
/** NoCo's one public number (.site/decisions/2026-09-24-phone.md). It renders from the brief, never typed. */
export const NOCO_PHONE = '7206300108';

/** Characters by code point, so no invisible character ever sits in this source file. */
const cp = (...codes) => codes.map((c) => String.fromCodePoint(c)).join('');
const INVISIBLE = new RegExp(`[${cp(0xad, 0x200b, 0x200c, 0x200d, 0x2060, 0xfeff, 0x180e)}]`, 'g'); // soft hyphen, zero-widths, word joiner, BOM
const ODD_SPACES = new RegExp(`[${cp(0xa0, 0x2007, 0x2009, 0x200a, 0x202f, 0x3000)}]`, 'g'); // no-break and thin spaces
const ODD_HYPHENS = new RegExp(`[${cp(0x2010, 0x2011, 0x2012, 0x2212, 0xfe63, 0xff0d)}]`, 'g'); // non-breaking hyphen, minus, …
const ODD_QUOTES = new RegExp(`[${cp(0x2018, 0x2019, 0x2bc)}]`, 'g');
const ENTITIES = { shy: cp(0xad), nbsp: ' ', amp: '&', quot: '"', apos: "'", lt: '<', gt: '>', rsquo: "'", lsquo: "'", ldquo: '"', rdquo: '"', ndash: '-', mdash: '-', zwj: '', zwnj: '', hellip: '...' };
/** Decode entities, then remove what hides a word from a regex: soft hyphens, zero-width characters,
 *  word joiners and BOMs; non-breaking spaces become spaces and odd hyphens become "-". */
export function normalise(s) {
  return String(s ?? '')
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&([a-z]+);/gi, (m, n) => (n.toLowerCase() in ENTITIES ? ENTITIES[n.toLowerCase()] : m))
    .replace(INVISIBLE, '')
    .replace(ODD_SPACES, ' ')
    .replace(ODD_HYPHENS, '-')
    .replace(ODD_QUOTES, "'");
}

/** A TIMELESS town name that is not a place we'd claim: a county, a state nickname, a museum, a dog. */
const TOWN_EXCEPTIONS = {
  Boulder: /^Boulder(?:\s+Count(?:y|ies)|\s+(?:and|&)\s+Weld)/,
  Centennial: /^Centennial\s+(?:State|Village)/,
  Golden: /^Golden\s+Retrievers?/i,
};
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const TOWN_RES = TIMELESS_TOWNS.map((name) => [name, new RegExp(`(?<![A-Za-z])${esc(name).replace(/ /g, '\\s+')}(?![A-Za-z])`, 'g')]);

/** Every TIMELESS town named in `text` (case-sensitive, whole word, minus the exceptions above). */
export function timelessTownHits(text) {
  const t = normalise(text);
  const hits = [];
  for (const [name, re] of TOWN_RES) {
    for (const m of t.matchAll(re)) {
      if (TOWN_EXCEPTIONS[name]?.test(t.slice(m.index, m.index + 40))) continue;
      hits.push({ name, index: m.index, match: m[0] });
    }
  }
  return hits;
}

/** Phone-shaped numbers (10 digits, optional +1, any separators), with their bare digits. */
export function phoneHits(text) {
  const t = normalise(text);
  const re = /(?<![\d$.,])(?:\+?1[\s.\-]?)?\(?(\d{3})\)?[\s.\-]?(\d{3})[\s.\-]?(\d{4})(?![\d])/g;
  return [...t.matchAll(re)].map((m) => ({ digits: m[1] + m[2] + m[3], match: m[0].trim(), index: m.index }));
}

/** "Timeless" in any case — the sister brand is never named in NoCo copy (boundary note excepted, in HTML). */
export const TIMELESS_NAME = /timeless/i;

/** Tokens that mean a template, a placeholder or another client's site leaked in (docs/CONTRACTS.md). */
export const PLACEHOLDERS = [
  [/\bAcme\b/, 'Acme'], [/SOURCE TBD/i, 'SOURCE TBD'], [/cite index/i, 'cite index'], [/\(386\)/, '(386)'],
  [/\bFlorida\b/, 'Florida'], [/\bPanhandle\b/, 'Panhandle'], [/\blorem\b/i, 'lorem'], [/pexels\.com/i, 'pexels.com'],
  [/unsplash\.com/i, 'unsplash.com'], [/LandscapeService/, 'LandscapeService'], [/\bTODO\b|\bTBD\b|\bFIXME\b|\bXXX\b/, 'TODO/TBD'],
];

/** Claims about the business. Each renders only with an approved claims.json entry behind it. */
export const CLAIMS = [
  /\blicen[sc]ed\b/i, /\binsured\b/i, /\bbonded\b/i, /\bcertified\b/i, /\bwarrant(?:y|ies|eed)\b/i, /\bguarantee[ds]?\b/i,
  /\bbest\b/i, /#\s?1\b/, /\bnumber one\b/i, /\bno\.\s?1\b/i, /\btop[- ]rated\b/i, /\bcheapest\b/i, /\baffordable\b/i, /\blowest price/i,
  /\byears? of experience\b/i, /\bdecades? of experience\b/i, /\byears in business\b/i, /\bfounded in\b/i, /\bin business since\b/i, /\bserving [\w ,&]{0,40} since (?:19|20)\d{2}\b/i,
  /\bfamily[- ]owned\b/i, /\blocally[- ]owned\b/i, /\bowned and operated\b/i, /\bowner[- ]operated\b/i,
  /\b24\s*\/\s*7\b/, /\b24 hours a day\b/i, /\baround the clock\b/i,
  /\bwe(?:'ve| have) (?:installed|done|built|completed|laid)\b/i, /\b(?:hundreds|thousands) of (?:yards|lawns|installs|installations|projects|customers|clients|homeowners)\b/i,
  /\b\d(?:\.\d)?[- ]?stars?\b/i, /\bfive[- ]star\b/i, /\bstar rating\b/i, /★/, /\b\d[\d,]*\+? (?:\w+ )?reviews\b/i,
  /\b(?:google|yelp|customer|client|verified|glowing) reviews?\b/i,
  /\bstarting at\b/i, /\bprices? start/i, /\bwe charge\b/i, /\bour prices?\b/i,
];
const PRICE = /\$\s?(\d{1,3}(?:,\d{3})+(?:\.\d+)?|\d+(?:\.\d+)?)/g;
const NEGATABLE = /^(?:guarantee|warrant|certified|licen|insured|bonded)/i;

/** Demographic and wealth targeting: never in public copy or a public repo. */
export const DEMOGRAPHICS = [
  /\b(?:household|median|average|per capita) income\b/i, /\bmedian household\b/i, /\bhome values?\b/i, /\bhome prices?\b/i,
  /\baffluent\b/i, /\bwealth(?:y|ier|iest)?\b/i, /\bupscale\b/i, /\bhigh[- ]income\b/i, /\bretirees?\b/i, /\bdemographics?\b/i,
  /\bwho lives\b/i, /\bnet worth\b/i,
];
/** Profanity, stored ROT13 so this public repo carries none of it. Matches word stems (…ing, …s). */
const rot13 = (w) => w.replace(/[a-z]/g, (c) => String.fromCharCode(((c.charCodeAt(0) - 97 + 13) % 26) + 97));
export const PROFANITY = new RegExp(`\\b(?:${['shpx', 'fuvg', 'ovgpu', 'nffubyr', 'qnza', 'phag', 'ohyyfuvg'].map(rot13).join('|')})\\w*\\b`, 'i');
const ADDRESS = /\b\d{2,6}\s+(?:[NSEW]\.?\s+)?(?:[A-Z][a-z]+\s+){1,3}(?:St|Street|Ave|Avenue|Rd|Road|Dr|Drive|Ct|Court|Ln|Lane|Way|Blvd|Boulevard|Cir|Circle|Pl|Place|Trl|Trail|Pkwy|Parkway)\b\.?/;

// ───────────────────────────── helpers ─────────────────────────────

const read = (p) => fs.readFileSync(p, 'utf8');
const ctx = (s, i, len) => s.slice(Math.max(0, i - 50), i + len + 50).replace(/\s+/g, ' ').trim();
const normUrl = (u) => String(u).replace(/&amp;/g, '&').replace(/[.,;:]+$/, '').replace(/\/$/, '');
/** Lower-case words for phrase matching: punctuation out, but a decimal point, $, % and # stay. */
const lowerWords = (s) => normalise(s).toLowerCase().replace(/(?<!\d)\.|\.(?!\d)/g, ' ').replace(/[^a-z0-9$%#.\s]/g, ' ').replace(/\s+/g, ' ');

/** Outside URLs in copy: <a href>, Markdown links and bare URLs. A ")" the URL didn't open is prose. */
function outsideUrls(s) {
  const out = new Set();
  for (const m of String(s).matchAll(/href\s*=\s*["'](https?:\/\/[^"']+)["']|\]\((https?:\/\/(?:[^()\s]|\([^()\s]*\))+)\)|(https?:\/\/[^\s"'<>\\\]]+)/g)) {
    let u = m[1] || m[2] || m[3];
    while (u.endsWith(')') && u.split(')').length > u.split('(').length) u = u.slice(0, -1);
    out.add(normUrl(u));
  }
  return [...out];
}
function internalLinks(s) {
  return [...String(s).matchAll(/href\s*=\s*["'](\/[^"'#?]*)|\]\((\/[^)\s#?]*)/g)].map((m) => m[1] || m[2]).filter((h) => !h.startsWith('//'));
}
/** Copy with links, tags and URLs removed — what a reader sees. */
function plainText(s) {
  return normalise(String(s))
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/<[^>]+>/g, ' ')
    .replace(/https?:\/\/[^\s)"'<>]+/g, ' ');
}
/** Numbers as a reader sees them: "1,500" → 1500; "5.10.1" → 5.10 and 1; "+79%" → 79. */
function numbersIn(s) {
  return [...plainText(s).matchAll(/\d{1,3}(?:,\d{3})+(?:\.\d+)?|\d+(?:\.\d+)?/g)].map((m) => m[0].replace(/,/g, ''));
}
const needsTracing = (n) => n.includes('.') || Number(n) >= 11;
function numberSet(text) {
  const set = new Set();
  for (const n of numbersIn(text)) { set.add(n); set.add(String(Number(n))); }
  return set;
}
function shingles(s) {
  const w = plainText(s).toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean);
  const set = new Set();
  for (let i = 0; i + 5 <= w.length; i++) set.add(w.slice(i, i + 5).join(' '));
  return set;
}
export function jaccard(a, b) {
  let n = 0;
  for (const x of a) if (b.has(x)) n++;
  return n / (a.size + b.size - n || 1);
}
const daysAgo = (ymd) => (Date.now() - Date.parse(`${ymd}T00:00:00Z`)) / 86400000;

// ───────────────────────────── the real collection schemas ─────────────────────────────

/**
 * Loads src/content.config.ts as Node sees it: astro:content and astro/loaders become shims, astro/zod
 * and relative imports become absolute URLs, and Node strips the TypeScript. The schemas are the ones
 * the build uses, so this checker and `astro build` cannot disagree about shape.
 */
export async function loadCollections() {
  const configPath = path.join(REPO, 'src/content.config.ts');
  const zodUrl = import.meta.resolve('astro/zod');
  let src = read(configPath);
  src = src.replace(/import\s*\{([^}]*)\}\s*from\s*['"]astro:content['"];?/, (_, names) => {
    const lines = [];
    for (const raw of names.split(',').map((s) => s.trim()).filter(Boolean)) {
      const [name, alias = name] = raw.split(/\s+as\s+/).map((s) => s.trim());
      if (name === 'defineCollection') lines.push(`const ${alias} = (c) => c;`);
      else if (name === 'z') lines.push(`const ${alias} = __z;`);
      else if (name === 'reference') lines.push(`const ${alias} = () => __z.string();`);
      else lines.push(`const ${alias} = undefined;`);
    }
    return lines.join('\n');
  });
  src = src.replace(/import\s*\{([^}]*)\}\s*from\s*['"]astro\/loaders['"];?/, (_, names) =>
    names.split(',').map((s) => s.trim()).filter(Boolean).map((raw) => `const ${raw.split(/\s+as\s+/).pop().trim()} = (o) => ({ loaderOptions: o });`).join('\n'));
  src = src.replace(/(from\s*|import\s*)(['"])astro\/zod\2/g, `$1${JSON.stringify(zodUrl)}`);
  src = src.replace(/(from\s*|import\s*\(?\s*)(['"])(\.{1,2}\/[^'"]+)\2/g, (_, pre, q, rel) => `${pre}${JSON.stringify(pathToFileURL(path.resolve(path.dirname(configPath), rel)).href)}`);
  src = `import { z as __z } from ${JSON.stringify(zodUrl)};\n${src}`;
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'noco-content-config-'));
  const file = path.join(dir, 'content.config.mts');
  fs.writeFileSync(file, src);
  try {
    let mod;
    try {
      mod = await import(pathToFileURL(file).href); // Node >= 22.18 strips the types itself
    } catch (e) {
      if (e?.code !== 'ERR_UNKNOWN_FILE_EXTENSION') throw e;
      const { stripTypeScriptTypes } = await import('node:module'); // Node 22.13-22.17
      if (typeof stripTypeScriptTypes !== 'function') throw new Error('this Node cannot read TypeScript — use Node 22.18+ (netlify.toml pins 24)');
      const js = path.join(dir, 'content.config.mjs');
      fs.writeFileSync(js, stripTypeScriptTypes(src));
      mod = await import(pathToFileURL(js).href);
    }
    const { z } = await import(zodUrl);
    const out = {};
    for (const [name, c] of Object.entries(mod.collections ?? {})) {
      out[name] = typeof c.schema === 'function' ? c.schema({ image: () => z.string() }) : c.schema;
    }
    return out;
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

// ───────────────────────────── data the records draw on ─────────────────────────────

function loadLayers(root) {
  const dir = path.join(root, 'src/data/layers');
  const files = fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => f.endsWith('.json')).sort() : [];
  const byId = new Map();
  const problems = [];
  for (const f of files) {
    let arr;
    try { arr = JSON.parse(read(path.join(dir, f))); } catch (e) { problems.push(`src/data/layers/${f} is not valid JSON (${e.message}) — scripts/check-layers.mjs owns this`); continue; }
    if (!Array.isArray(arr)) { problems.push(`src/data/layers/${f} is not a JSON array`); continue; }
    for (const rec of arr) {
      if (!rec || typeof rec.id !== 'string') { problems.push(`src/data/layers/${f}: a record without an id`); continue; }
      if (byId.has(rec.id)) problems.push(`duplicate layer id ${rec.id} (${byId.get(rec.id)._file} and ${f})`);
      byId.set(rec.id, { ...rec, _file: f });
    }
  }
  return { byId, files, empty: byId.size === 0, problems };
}

/**
 * The claims register, read the way ~/.claude/site-tools/check-claims.py reads it: an entry is approved
 * only with approved: true, an approved_by and a renderable status. Approved texts (claim + aliases)
 * cover a banned-word hit; the texts of every other entry are themselves banned from copy.
 */
function loadClaims(root) {
  const p = path.join(root, '.site/truth/claims.json');
  const empty = { approved: [], unapproved: [], problem: null };
  if (!fs.existsSync(p)) return empty;
  let raw;
  try { raw = JSON.parse(read(p)); } catch (e) { return { ...empty, problem: `.site/truth/claims.json is not valid JSON (${e.message}) — no claim is approved until it parses` }; }
  const RENDERABLE = new Set(['VERIFIED', 'CLIENT_STATED', 'CLIENT_CONFIRMED', 'EXTERNAL_SOURCE']);
  const approved = [], unapproved = [];
  for (const c of raw.claims ?? []) {
    if (!c) continue;
    const texts = [c.claim, ...(c.aliases ?? [])].filter((t) => typeof t === 'string' && t.trim().length >= 8).map((t) => lowerWords(t).trim());
    if (c.approved === true && c.approved_by && RENDERABLE.has(String(c.status))) approved.push(...texts);
    else if (texts.length) unapproved.push({ claim: c.claim, texts: [...new Set(texts)] });
  }
  return { approved, unapproved, problem: null };
}

/** Everything a referenced layer record says, as text numbers and quoted phrases can be traced to. */
function layerText(rec) {
  return [rec.fact, rec.quote, (rec.numbers ?? []).join(' '), rec.source_label, rec.effective, rec.checked, rec.recheck,
    rec.provider, rec.rates ? JSON.stringify(rec.rates) : ''].filter(Boolean).join('\n');
}

// ───────────────────────────── the copy of each record type ─────────────────────────────

function townCopy(d) {
  return [d.title, d.description, d.h1, d.lede, d.answer?.question, d.answer?.answer,
    ...(d.blocks ?? []).flatMap((b) => [b.kicker, b.h2, b.takeaway, ...(b.paras ?? [])]),
    ...(d.sections ?? []).flatMap((s) => [s.name, ...(s.paras ?? [])]),
    ...(d.faq ?? []).flatMap((f) => [f?.q, f?.a])].filter((x) => typeof x === 'string').join('\n');
}
function townBody(d) {
  return [d.lede, d.answer?.answer, ...(d.blocks ?? []).flatMap((b) => [b.takeaway, ...(b.paras ?? [])]),
    ...(d.sections ?? []).flatMap((s) => s.paras ?? []), ...(d.faq ?? []).map((f) => f?.a)].filter((x) => typeof x === 'string').join('\n');
}
function townSourceUrls(d) {
  return [...(d.sources ?? []).map((s) => s?.url), ...(d.blocks ?? []).flatMap((b) => b.sources ?? []), ...(d.sections ?? []).flatMap((s) => s.sources ?? [])]
    .filter((u) => typeof u === 'string');
}
function guideCopy(fm, body) {
  return [fm.title, fm.description, fm.h1, fm.answer?.question, fm.answer?.answer, ...(fm.faq ?? []).flatMap((f) => [f?.q, f?.a]), body]
    .filter((x) => typeof x === 'string').join('\n');
}
function serviceCopy(fm, body) {
  return [fm.title, fm.description, fm.h1, fm.lede, fm.answer?.question, fm.answer?.answer, ...(fm.faq ?? []).flatMap((f) => [f?.q, f?.a]), body]
    .filter((x) => typeof x === 'string').join('\n');
}
/** Markdown headings of a level, outside fenced code. */
function mdHeadings(body, level) {
  const re = new RegExp(`^#{${level}}\\s+(.+?)\\s*#*\\s*$`);
  return String(body).replace(/```[\s\S]*?```/g, '').split(/\r?\n/).map((l) => l.match(re)?.[1]).filter(Boolean);
}
function workCopy(d) {
  return [d.title, d.description, d.problem, ...(d.phases ?? []).flatMap((p) => [p?.caption, p?.alt])].filter((x) => typeof x === 'string').join('\n');
}

// ───────────────────────────── the rules ─────────────────────────────

/**
 * Bans that hold for every record: territory, phones, the sister brand, placeholders, demographics,
 * profanity, addresses. `out` receives [level, message].
 */
function checkLeaks(text, out, { where = '' } = {}) {
  const t = normalise(text);
  const at = where ? ` (${where})` : '';
  const tm = t.match(TIMELESS_NAME);
  if (tm) out.push(['FAIL', `"Timeless" — the sister brand is never named in NoCo copy${at}: …${ctx(t, tm.index, tm[0].length)}…`]);
  for (const h of timelessTownHits(t)) out.push(['FAIL', `TIMELESS town "${h.name}" — NoCo never names a Denver-metro town (territory.mjs TIMELESS_TOWNS)${at}: …${ctx(t, h.index, h.match.length)}…`]);
  for (const p of phoneHits(t)) {
    if (TIMELESS_PHONES.includes(p.digits)) out.push(['FAIL', `TIMELESS phone ${p.match}${at}`]);
    else if (p.digits === NOCO_PHONE) out.push(['FAIL', `NoCo's phone typed into copy (${p.match}) — it renders from the brief, never typed${at}`]);
    else out.push(['WARN', `a phone number in copy (${p.match}) — make sure it is a sourced public number, not a person's${at}`]);
  }
  // spellings the phone pattern misses ("303 . 349 . 2368", "3-0-3…"): collapse short separators and look again
  const collapsed = t.replace(/(\d)[^\dA-Za-z]{1,3}(?=\d)/g, '$1');
  for (const d of TIMELESS_PHONES) if (collapsed.includes(d) && !phoneHits(t).some((p) => p.digits === d)) out.push(['FAIL', `TIMELESS phone digits ${d}${at}`]);
  for (const [re, label] of PLACEHOLDERS) { const m = t.match(re); if (m) out.push(['FAIL', `placeholder or foreign token "${label}"${at}: …${ctx(t, m.index, m[0].length)}…`]); }
  for (const re of DEMOGRAPHICS) { const m = t.match(re); if (m) out.push(['FAIL', `demographic or wealth language "${m[0]}"${at}: …${ctx(t, m.index, m[0].length)}…`]); }
  const pm = t.match(PROFANITY);
  if (pm) out.push(['FAIL', `profanity "${pm[0]}"${at}`]);
  const am = t.match(ADDRESS);
  if (am) out.push(['WARN', `looks like a street address "${am[0]}" — no residential addresses in a public repo${at}`]);
}

/** Business claims and prices: allowed only when claims.json approves the wording, or the phrase is
 *  quoted from a referenced layer record (an ordinance's "licensed contractor", a rule's "fade warranty"). */
function checkClaims(text, out, { approved, unapproved = [], layerWords, layerNumbers, layersEmpty = false }) {
  const t = plainText(text).replace(/[ \t]+/g, ' ');
  const tl = lowerWords(t);
  for (const u of unapproved) {
    const hit = u.texts.find((x) => ` ${tl} `.includes(` ${x} `));
    if (hit) out.push(['FAIL', `claims register: "${hit}" belongs to an unapproved claim ("${u.claim}") — it ships only after approval (truth.py claims --approve)`]);
  }
  const covered = (hit) => {
    const h = lowerWords(hit).trim();
    return approved.some((c) => c.includes(h) && tl.includes(c));
  };
  const quoted = (idx, hit) => {
    if (!layerWords) return false;
    const before = lowerWords(t.slice(Math.max(0, idx - 60), idx)).trim().split(' ').filter(Boolean).slice(-2).join(' ');
    const after = lowerWords(t.slice(idx + hit.length, idx + hit.length + 60)).trim().split(' ').filter(Boolean).slice(0, 2).join(' ');
    const h = lowerWords(hit).trim();
    return (before && layerWords.includes(`${before} ${h}`)) || (after && layerWords.includes(`${h} ${after}`));
  };
  // "HOA approval isn't guaranteed" is a hedge, not a promise
  const negated = (idx, hit) => NEGATABLE.test(hit) && /\b(?:not|no|never|cannot|can't|won't|doesn't|don't|isn't|aren't|without)\b(?:\s+\S+){0,2}\s*$/i.test(t.slice(Math.max(0, idx - 40), idx));
  for (const re of CLAIMS) {
    const g = new RegExp(re.source, re.flags.includes('g') ? re.flags : `${re.flags}g`);
    for (const m of t.matchAll(g)) {
      if (covered(m[0]) || quoted(m.index, m[0]) || negated(m.index, m[0])) continue;
      out.push(['FAIL', `unsourced business claim "${m[0]}" — needs an approved .site/truth/claims.json entry: …${ctx(t, m.index, m[0].length)}…`]);
      break;
    }
  }
  for (const m of t.matchAll(PRICE)) {
    const n = m[1].replace(/,/g, '');
    if (layerNumbers.has(n) || layerNumbers.has(String(Number(n))) || covered(m[0])) continue;
    if (layersEmpty) out.push(['WARN', `a $ amount not yet traceable (src/data/layers/ is empty): "${m[0]}"`]);
    else out.push(['FAIL', `a $ price that no referenced layer record or approved claim supplies: "${m[0]}" …${ctx(t, m.index, m[0].length)}…`]);
  }
}

function checkNumbers(copy, traced, out, layersEmpty) {
  let text = normalise(copy);
  for (const p of phoneHits(text)) text = text.replace(p.match, ' '); // phones are judged by checkLeaks
  const missing = [...new Set(numbersIn(text).filter(needsTracing))].filter((n) => !traced.has(n) && !traced.has(String(Number(n))));
  if (!missing.length) return;
  if (layersEmpty) out.push(['WARN', `numbers not yet traceable (src/data/layers/ is empty): ${missing.join(', ')}`]);
  else out.push(['FAIL', `numbers not found in any referenced layer record or source label: ${missing.join(', ')}`]);
}

function checkLinks(copy, allowedUrls, out) {
  const allowed = new Set(allowedUrls.map(normUrl));
  for (const u of outsideUrls(copy)) if (!allowed.has(u)) out.push(['FAIL', `outside link not among this record's sources: ${u}`]);
  for (const h of new Set(internalLinks(copy))) {
    if (h === '/' || h.endsWith('/') || /\.[a-z0-9]{2,5}$/i.test(h)) continue;
    out.push(['FAIL', `internal link without its trailing slash: ${h}`]);
  }
}

function checkLayerRefs(refs, layers, out, { slug, sourceUrls, published }) {
  const recs = [];
  for (const id of new Set(refs)) {
    if (layers.empty) continue;
    const rec = layers.byId.get(id);
    if (!rec) { out.push(['FAIL', `layerRefs id "${id}" is not in src/data/layers/*.json`]); continue; }
    recs.push(rec);
    if (rec.status === 'UNVERIFIED') out.push([published ? 'FAIL' : 'WARN', `layer ${id} is UNVERIFIED — it never renders`]);
    if (slug && Array.isArray(rec.applies_to) && !rec.applies_to.includes('*') && !rec.applies_to.includes(slug)) {
      out.push(['WARN', `layer ${id} applies_to ${JSON.stringify(rec.applies_to)}, not ${slug}`]);
    }
    if (sourceUrls && rec.source_url && !sourceUrls.map(normUrl).includes(normUrl(rec.source_url))) {
      out.push(['WARN', `layer ${id}'s source_url is not among this record's sources: ${rec.source_url}`]);
    }
  }
  if (refs.length && layers.empty) out.push(['WARN', `layerRefs not checked — src/data/layers/ is empty (${[...new Set(refs)].join(', ')})`]);
  return recs;
}

function checkSources(sources, out) {
  for (const s of sources ?? []) {
    if (!s?.checked || !/^\d{4}-\d{2}-\d{2}$/.test(s.checked)) continue;
    const age = daysAgo(s.checked);
    if (age > 365) out.push(['WARN', `source checked ${s.checked} (over a year ago): ${s.url}`]);
    if (age < -1) out.push(['FAIL', `source checked date is in the future: ${s.checked} (${s.url})`]);
  }
}

function schemaIssues(schema, data, out) {
  if (!schema) return;
  const r = schema.safeParse(data);
  if (r.success) return;
  for (const i of r.error.issues.slice(0, 12)) out.push(['FAIL', `schema: ${i.path.join('.') || '(root)'} — ${i.message}`]);
  if (r.error.issues.length > 12) out.push(['FAIL', `schema: …and ${r.error.issues.length - 12} more`]);
}

// ───────────────────────────── the run ─────────────────────────────

function listDir(dir, ext) {
  return fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => f.endsWith(ext) && !f.startsWith('_') && !f.startsWith('.')).sort().map((f) => path.join(dir, f)) : [];
}
function kindOf(file) {
  const parent = path.basename(path.dirname(file));
  if (parent === 'towns' && file.endsWith('.json')) return 'town';
  if (parent === 'guides' && file.endsWith('.md')) return 'guide';
  if (parent === 'services' && file.endsWith('.md')) return 'service';
  if (parent === 'work' && file.endsWith('.json')) return 'work';
  return null;
}

export async function run({ root = REPO, files = [], log = console.log } = {}) {
  let fails = 0, warns = 0;
  let schemas = {};
  try {
    schemas = await loadCollections();
  } catch (e) {
    log(`x FAIL could not load the schemas in src/content.config.ts: ${e.message}`);
    fails++;
  }
  let yaml = null;
  try { yaml = (await import('js-yaml')).default; } catch { /* reported per guide below */ }

  const layers = loadLayers(root);
  const claims = loadClaims(root);
  const approved = claims.approved;
  if (claims.problem) { log(`! WARN ${claims.problem}`); warns++; }
  for (const p of layers.problems) { log(`! WARN ${p}`); warns++; }
  if (layers.empty) { log('! WARN src/data/layers/ has no records yet — layerRefs and number tracing are warnings until it does'); warns++; }

  const content = path.join(root, 'src/content');
  const named = files.length > 0;
  const list = named ? files.map((f) => path.resolve(f)) : [
    ...listDir(path.join(content, 'towns'), '.json'),
    ...listDir(path.join(content, 'guides'), '.md'),
    ...listDir(path.join(content, 'services'), '.md'),
    ...listDir(path.join(content, 'work'), '.json'),
  ];
  const photosDir = path.join(root, 'src/assets/photos');
  const serviceSlugs = new Set([...read(path.join(REPO, 'src/data/services.ts')).matchAll(/\bslug:\s*'([a-z0-9-]+)'/g)].map((m) => m[1]));
  const photoIds = new Set([...read(path.join(REPO, 'src/data/photos.ts')).matchAll(/\bid:\s*'([a-z0-9-]+)'/g)].map((m) => m[1]));
  const guideIds = new Set(listDir(path.join(content, 'guides'), '.md').map((f) => path.basename(f, '.md')));

  // publication state of every town record on disk, for nearby links
  const townStatus = {};
  for (const f of listDir(path.join(content, 'towns'), '.json')) {
    try { townStatus[path.basename(f, '.json')] = JSON.parse(read(f))?.status ?? 'draft'; } catch { /* reported below */ }
  }

  const bodies = [];
  const gate = {}; // slug → { status, blocks, own, photo, pass, reasons, needs }

  for (const file of list) {
    const kind = kindOf(file);
    const id = path.basename(file).replace(/\.(json|md)$/, '');
    const out = [];
    if (!kind) { log(`x FAIL ${id}: not under src/content/{towns,guides,services,work}/ with the right extension`); fails++; continue; }

    let d, body = '';
    if (kind === 'guide' || kind === 'service') {
      const src = read(file);
      const fm = src.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
      if (!fm) { log(`x FAIL ${id} [${kind}]: no frontmatter`); fails++; continue; }
      if (!yaml) { log(`x FAIL ${id} [${kind}]: js-yaml is not installed, so the frontmatter cannot be read`); fails++; continue; }
      try { d = yaml.load(fm[1]) ?? {}; } catch (e) { log(`x FAIL ${id} [${kind}]: frontmatter is not valid YAML (${e.message.split('\n')[0]})`); fails++; continue; }
      body = src.slice(fm[0].length);
    } else {
      try { d = JSON.parse(read(file)); } catch (e) { log(`x FAIL ${id} [${kind}]: not valid JSON (${e.message})`); fails++; continue; }
    }
    if (!d || typeof d !== 'object') { log(`x FAIL ${id} [${kind}]: empty record`); fails++; continue; }
    const status = d.status ?? 'draft';
    const published = isPublished(d);
    if (!CONTENT_STATUSES.includes(status)) out.push(['FAIL', `invalid status "${status}" — draft | review | published`]);

    schemaIssues(schemas[{ town: 'towns', guide: 'guides', service: 'services', work: 'work' }[kind]], d, out);

    let copy = '', refs = [], sourceUrls = [], ownSourceText = '';
    if (kind === 'town') {
      copy = townCopy(d);
      refs = (d.blocks ?? []).flatMap((b) => b.layerRefs ?? []);
      sourceUrls = townSourceUrls(d);
      ownSourceText = (d.sources ?? []).map((s) => `${s?.label ?? ''} ${s?.checked ?? ''}`).join('\n');
      const t = townEligibility(d.slug);
      if (!t.eligible) out.push(['FAIL', t.reason]);
      if (d.slug && id !== d.slug) out.push(['FAIL', `file name should be ${d.slug}.json`]);
      const town = townBySlug[d.slug];
      if (town) {
        if (d.region && d.region !== town.region) out.push(['FAIL', `region "${d.region}" disagrees with territory.mjs ("${town.region}")`]);
        if (d.name && d.name !== town.name) out.push(['WARN', `name "${d.name}" differs from territory.mjs ("${town.name}")`]);
        for (const s of d.sections ?? []) if (s?.name && !(town.sections ?? []).includes(s.name)) out.push(['WARN', `section "${s.name}" is not a folded-in place for ${d.slug} in territory.mjs`]);
      }
      if ((d.nearby ?? []).includes(d.slug)) out.push(['FAIL', 'a town cannot be its own neighbour']);
      if (published) for (const n of d.nearby ?? []) if (townStatus[n] !== 'published') out.push(['WARN', `nearby ${n} has no published page yet`]);
      if (d.photo && !fs.existsSync(path.join(photosDir, d.photo.replace(/^.*src\/assets\/photos\//, '')))) {
        out.push([published ? 'FAIL' : 'WARN', `photo not found under src/assets/photos/: ${d.photo}`]);
      }
      checkSources(d.sources, out);
      const g = townGate(d);
      gate[d.slug ?? id] = { status, blocks: (d.blocks ?? []).length, own: (d.blocks ?? []).filter((b) => b.own).length, photo: !!d.photo, pass: g.pass, reasons: g.reasons, needs: d.needsFromBrian ?? [], file: id };
      if (!g.pass) {
        if (published) out.push(['FAIL', `published but fails the town gate: ${g.reasons.join('; ')}`]);
        else out.push(['WARN', `town gate not met yet (${status}): ${g.reasons.join('; ')}${named && (d.needsFromBrian ?? []).length ? ` — needs from Brian: ${(d.needsFromBrian ?? []).join(' | ')}` : named ? '' : ' (needs from Brian: see the gate report)'}`]);
      }
      bodies.push({ id: d.slug ?? id, status, sh: shingles(townBody(d)) });
    } else if (kind === 'guide') {
      copy = guideCopy(d, body);
      refs = d.layerRefs ?? [];
      sourceUrls = (d.sources ?? []).map((s) => s?.url).filter(Boolean);
      ownSourceText = [(d.sources ?? []).map((s) => `${s?.label ?? ''} ${s?.checked ?? ''}`).join('\n'), d.published, d.updated].join('\n');
      if (!plainText(body).trim()) out.push(['FAIL', 'the guide has no body']);
      for (const s of d.related?.towns ?? []) if (!townBySlug[s]) out.push(['FAIL', `related town is not a NoCo town: ${s}`]);
      for (const s of d.related?.services ?? []) if (!serviceSlugs.has(s)) out.push(['FAIL', `related service is not in src/data/services.ts: ${s}`]);
      checkSources(d.sources, out);
      if (!published && (d.needsFromBrian ?? []).length) out.push(['WARN', `needs from Brian: ${d.needsFromBrian.join(' | ')}`]);
    } else if (kind === 'service') {
      copy = serviceCopy(d, body);
      refs = d.layerRefs ?? [];
      sourceUrls = (d.sources ?? []).map((s) => s?.url).filter(Boolean);
      ownSourceText = (d.sources ?? []).map((s) => `${s?.label ?? ''} ${s?.checked ?? ''}`).join('\n');
      if (d.slug && id !== d.slug) out.push(['FAIL', `file name should be ${d.slug}.md`]);
      if (d.slug && !serviceSlugs.has(d.slug)) out.push(['FAIL', `slug is not in src/data/services.ts: ${d.slug}`]);
      if (!plainText(body).trim()) out.push(['FAIL', 'the service page has no body']);
      for (const p of d.photos ?? []) if (!photoIds.has(p)) out.push(['FAIL', `photo id is not in src/data/photos.ts: ${p}`]);
      for (const g of d.guides ?? []) if (!guideIds.has(g)) out.push(['FAIL', `guide is not a record in src/content/guides/: ${g}`]);
      if (typeof d.title === 'string' && !/\s\|\sNoCo Turf Co\.$/.test(d.title)) out.push(['FAIL', `title must end with "| NoCo Turf Co.": ${d.title}`]);
      if (typeof d.description === 'string' && d.description.length < 140) out.push(['FAIL', `description is ${d.description.length} characters — write 140–160`]);
      const answerWords = plainText(d.answer?.answer ?? '').split(/\s+/).filter(Boolean).length;
      if (answerWords > 60) out.push(['FAIL', `answer is ${answerWords} words — 60 at most (the phone is appended at render time)`]);
      const h1s = mdHeadings(body, 1);
      if (h1s.length) out.push(['FAIL', `the body has an H1 ("${h1s[0]}") — the page prints the one H1 from frontmatter; use ## for sections`]);
      const h2s = mdHeadings(body, 2);
      if (h2s.length < 3 || h2s.length > 5) out.push(['WARN', `${h2s.length} H2 sections — write 3 to 5`]);
      for (const h of h2s) if (!/\?$/.test(h.trim())) out.push(['WARN', `H2 is not shaped as a question: "${h}"`]);
      const nFaq = (d.faq ?? []).length;
      if (nFaq < 4 || nFaq > 6) out.push(['WARN', `${nFaq} FAQ items — write 4 to 6`]);
      checkSources(d.sources, out);
      if (!published && (d.needsFromBrian ?? []).length) out.push(['WARN', `needs from Brian: ${d.needsFromBrian.join(' | ')}`]);
    } else {
      copy = workCopy(d);
      ownSourceText = [JSON.stringify(d.job ?? {}), d.month].join('\n');
      if (d.town && !townBySlug[d.town]) out.push(['FAIL', `town is not a NoCo town: ${d.town}`]);
      for (const p of d.phases ?? []) if (p?.photo && !fs.existsSync(path.join(photosDir, p.photo.replace(/^.*src\/assets\/photos\//, '')))) {
        out.push([published ? 'FAIL' : 'WARN', `phase photo not found under src/assets/photos/: ${p.photo}`]);
      }
      if (published && d.job?.priceBand && !approved.some((c) => c.includes(lowerWords(d.job.priceBand).trim()))) {
        out.push(['FAIL', `job.priceBand "${d.job.priceBand}" publishes only with an approved claims.json entry`]);
      }
      if (d.review) checkLeaks(d.review.text ?? '', out, { where: 'review' });
    }

    const recs = checkLayerRefs(refs, layers, out, { slug: kind === 'town' ? d.slug : null, sourceUrls: kind === 'work' ? null : sourceUrls, published });
    // A service page prints every referenced record's `fact` verbatim (ServiceRules), so a record whose wording
    // holds an unapproved claims-register phrase would ship that phrase: drop the reference instead.
    if (kind === 'service') {
      for (const r of recs) {
        const ft = ` ${lowerWords(r.fact ?? '')} `;
        for (const u of claims.unapproved) {
          const hit = u.texts.find((x) => ft.includes(` ${x} `));
          if (hit) out.push(['FAIL', `layer ${r.id} would print "${hit}" in the rule sheet, which belongs to an unapproved claim ("${u.claim}") — drop the reference or reword the record`]);
        }
      }
    }
    const traceText = [...recs.map(layerText), ownSourceText].join('\n');
    const traced = numberSet(traceText);
    const layerWords = recs.length ? lowerWords(recs.map(layerText).join('\n')) : '';

    checkLeaks(copy, out);
    checkLeaks((d.sources ?? []).map((s) => s?.label ?? '').join('\n'), out, { where: 'source label' });
    checkClaims(copy, out, { approved, unapproved: claims.unapproved, layerWords, layerNumbers: numberSet(recs.map(layerText).join('\n')), layersEmpty: layers.empty && kind !== 'work' });
    checkNumbers(copy, traced, out, layers.empty && kind !== 'work');
    checkLinks(copy, sourceUrls, out);
    for (const note of d.needsFromBrian ?? []) {
      for (const re of DEMOGRAPHICS) { const m = String(note).match(re); if (m) out.push(['FAIL', `demographic or wealth language in needsFromBrian: "${m[0]}"`]); }
      if (PROFANITY.test(String(note))) out.push(['FAIL', 'profanity in needsFromBrian']);
    }

    const f = out.filter((o) => o[0] === 'FAIL').length, w = out.length - f;
    fails += f; warns += w;
    const words = plainText(copy).split(/\s+/).filter(Boolean).length;
    log(`${f ? 'x FAIL' : w ? '! WARN' : 'ok    '} ${id} [${kind} · ${status}] (${words} words)`);
    for (const [lvl, msg] of out) log(`     ${lvl === 'FAIL' ? 'x' : '!'} ${msg}`);
  }

  if (!named) {
    for (let i = 0; i < bodies.length; i++) for (let j = i + 1; j < bodies.length; j++) {
      const s = jaccard(bodies[i].sh, bodies[j].sh);
      const pair = `${bodies[i].id} ~ ${bodies[j].id}: ${(s * 100).toFixed(1)}% of five-word runs shared`;
      if (s > 0.25) { log(`x FAIL similarity ${pair} (limit 25%)`); fails++; }
      else if (s > 0.15) { log(`! WARN similarity ${pair} (warn above 15%)`); warns++; }
    }

    log('\nTown gate — src/lib/town-gate.mjs: ≥3 blocks, ≥2 own, a photo');
    for (const t of NOCO_TOWNS) {
      const g = gate[t.slug];
      if (!g) { log(`  ${t.slug.padEnd(16)} —          no record yet (${t.tier})`); continue; }
      const verdict = g.pass ? 'PASS' : g.status === 'published' ? 'FAIL' : 'not yet';
      log(`  ${t.slug.padEnd(16)} ${g.status.padEnd(10)} ${g.blocks} blocks · ${g.own} own · ${g.photo ? 'photo' : 'no photo'} — gate ${verdict}`);
      for (const r of g.reasons) log(`      - ${r}`);
      for (const n of g.needs) log(`      needs from Brian: ${n}`);
    }
    for (const slug of Object.keys(gate)) if (!townBySlug[slug]) log(`  ${slug.padEnd(16)} ${gate[slug].status.padEnd(10)} NOT A NOCO TOWN`);
  }

  log(`\n${list.length} record(s) · ${fails} fail(s) · ${warns} warning(s)`);
  return { fails, warns };
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (isMain) {
  const args = process.argv.slice(2);
  let root = REPO;
  const files = [];
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--root') root = path.resolve(args[++i]);
    else if (args[i].startsWith('--root=')) root = path.resolve(args[i].slice(7));
    else files.push(args[i]);
  }
  const { fails } = await run({ root, files });
  process.exit(fails ? 1 : 0);
}
