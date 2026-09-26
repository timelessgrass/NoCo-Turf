#!/usr/bin/env node
/**
 * Checks town, guide, service and work records before they can ship — or be committed to a public repo.
 * Forked from TIMELESS Grass & Greens (scripts/check-local-content.mjs + check-articles.mjs) with the
 * bans inverted: here "Timeless", Denver-metro towns and TIMELESS phones are the leaks.
 *
 *   node scripts/check-content.mjs                    # every record, similarity, per-town and per-page gate reports
 *   node scripts/check-content.mjs <file>...          # just these files; a guide is also checked for overlap
 *                                                     # against every other guide on disk, and its own layer
 *                                                     # file (src/data/layers/guides/{id}.json) is gated; a
 *                                                     # town × service page against every page of its service
 *                                                     # and its town record on disk, with its town's own layer
 *                                                     # file (src/data/layers/local/{town}.json) gated; a
 *                                                     # community page against every community on disk, its town
 *                                                     # record and its town's putting-green page, with its own
 *                                                     # layer file (src/data/layers/communities/{id}.json) gated
 *   node scripts/check-content.mjs --root <dir>       # read content/layers/claims under <dir> (fixtures)
 *
 * Reads src/content/{towns/*.json, town-services/*.json, communities/*.json, guides/*.md, services/*.md, work/*.json},
 * src/data/layers/*.json, src/data/layers/{guides,local,communities}/*.json and .site/truth/claims.json. Code (the
 * collection schemas, territory, the gates, the guide topics, town-services.mjs, services.ts, photos.ts)
 * always comes from this repo, so a fixture root only needs the data it is testing.
 *
 * Town × service records (src/content/town-services/{town}--{service}.json) get every town rule — leaks,
 * claims, numbers, links, layerRefs — plus their own: the file name is exactly "{town}--{service}.json"; the
 * town is a NoCo town and the service one of the four in src/data/town-services.mjs (installation × town is
 * the town page; turf-repair has no pages); the title ends "| NoCo Turf Co."; display.paint is a phrase of the
 * H1; the photo is a photos.ts id (WARN when it was taken outside the town); more than 25% of five-word runs
 * shared with another page of the SAME service, or with its own town record, FAILS (WARN above 15%); a
 * PUBLISHED page that fails src/lib/town-service-gate.mjs FAILS (a WARN, with needsFromBrian, while it is a
 * draft); a published page whose town is not published or whose service is not confirmed WARNS (it won't
 * render until both are).
 *
 * Community records (src/content/communities/{town}--{community}.json) get every town rule — leaks, claims, numbers,
 * links, layerRefs, the demographics ban — plus their own: the file name is exactly "{town}--{slug}.json"; the town is
 * a NoCo town; the slug is not a town × service slug or a reserved word (src/data/communities.mjs — the page shares
 * /areas/{town}-co/{segment}/ with the service pages); the title ends "| NoCo Turf Co."; display.paint is a phrase of
 * the H1; governing.url is one of the record's sources; golf.name is named by its cited record; the photo is a
 * photos.ts id. Overlap in five-word runs FAILS above 25% with another community in the same town (WARN above 15%),
 * with any other community, with its own town record and with its town's putting-green page. A PUBLISHED page that
 * fails src/lib/community-gate.mjs FAILS (a WARN, with needsFromBrian, while it is a draft); a published page whose
 * town is not published WARNS. WARN: the sales words in COMMUNITY_PUFFERY (luxury, exclusive, prestigious,
 * high-end), a golf community with no `golf`, a governing body with nothing quoted, a title without the name.
 *
 * Guide records (src/content/guides/{id}.md) also FAIL on: a `photos` id that is not in src/data/photos.ts; a `topic` that is not in src/data/guide-topics.ts;
 * an id that equals a topic slug (the two share /guides/); a display.paint phrase that is not in the H1;
 * related services or towns that don't exist; the same title or the same answer.question (normalized) as
 * another guide; more than 25% of five-word runs shared with another guide (WARN above 15%), reported
 * with the pair and a few of the shared runs; and any check-layers rule broken in the guide's own layer file.
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
 *   - a layerRefs id missing from src/data/layers/*.json, guides/, local/ and communities/ (a WARN while all are empty)
 *   - the same layer id in two layer files (check-layers.mjs fails it too)
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
 *   - two town records, or two guide records, sharing more than 25% of their five-word runs (WARN above 15%)
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
import { townServiceGate, blockWords, SUBSTANTIVE_WORDS } from '../src/lib/town-service-gate.mjs';
import { TOWN_SERVICES, TOWN_SERVICE_SLUGS, townServiceBySlug, NOT_TOWN_SERVICES, townServiceId, parseTownServiceId } from '../src/data/town-services.mjs';
import { CONTENT_STATUSES, isPublished } from '../src/lib/content-policy.mjs';
import { GUIDE_TOPICS, topicBySlug } from '../src/data/guide-topics.ts';
import { communityGate } from '../src/lib/community-gate.mjs';
import { communityId, parseCommunityId, communitySlugProblem, COMMUNITY_PUFFERY } from '../src/data/communities.mjs';
import { checkRecord, checkOwnedFile, loadLayerFiles, todayISO, GUIDE_LAYER_DIR, LOCAL_LAYER_DIR, COMMUNITY_LAYER_DIR } from './check-layers.mjs';

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
  // relative imports become absolute URLs; an extensionless one ('./data/guide-topics') resolves the way Vite would
  const resolveRel = (rel) => {
    const abs = path.resolve(path.dirname(configPath), rel);
    return fs.existsSync(abs) ? abs : ['.ts', '.mts', '.mjs', '.js'].map((x) => abs + x).find((p) => fs.existsSync(p)) ?? abs;
  };
  src = src.replace(/(from\s*|import\s*\(?\s*)(['"])(\.{1,2}\/[^'"]+)\2/g, (_, pre, q, rel) => `${pre}${JSON.stringify(pathToFileURL(resolveRel(rel)).href)}`);
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

/** Every layer record by id: src/data/layers/*.json, then the owner-scoped src/data/layers/guides/*.json and
 *  src/data/layers/local/*.json (the same reader check-layers.mjs uses). A file that won't parse is
 *  check-layers' to fail; an id in two files fails here too, because a layerRefs lookup would silently pick
 *  one of them. */
function loadLayers(root) {
  const dir = path.join(root, 'src/data/layers');
  const byId = new Map();
  const problems = [];
  const dupes = [];
  const { files, errors } = fs.existsSync(dir) ? loadLayerFiles(dir) : { files: [], errors: [] };
  for (const e of errors) problems.push(`src/data/layers/${e} — scripts/check-layers.mjs owns this`);
  for (const { file, records } of files) {
    for (const rec of records) {
      if (!rec || typeof rec.id !== 'string') { problems.push(`src/data/layers/${file}: a record without an id`); continue; }
      if (byId.has(rec.id)) dupes.push(`duplicate layer id ${rec.id} (src/data/layers/${byId.get(rec.id)._file} and src/data/layers/${file}) — ids are unique across every layer file`);
      else byId.set(rec.id, { ...rec, _file: file });
    }
  }
  return { byId, files: files.map((f) => f.file), fileRecords: new Map(files.map((f) => [f.file, f.records])), empty: byId.size === 0, problems, dupes };
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
/** A town × service record: the same shape as a town, less folded-in sections and nearby. */
function townServiceCopy(d) {
  return [d.title, d.description, d.h1, d.lede, d.answer?.question, d.answer?.answer,
    ...(d.blocks ?? []).flatMap((b) => [b.kicker, b.h2, b.takeaway, ...(b.paras ?? [])]),
    ...(d.faq ?? []).flatMap((f) => [f?.q, f?.a])].filter((x) => typeof x === 'string').join('\n');
}
/** What a town × service page says, for the overlap checks (the same parts townBody reads). */
function townServiceBody(d) {
  return [d.lede, d.answer?.answer, ...(d.blocks ?? []).flatMap((b) => [b.takeaway, ...(b.paras ?? [])]),
    ...(d.faq ?? []).map((f) => f?.a)].filter((x) => typeof x === 'string').join('\n');
}
/** A community record's copy: the town × service parts plus the names it prints (the community, its reviewer, its course). */
function communityCopy(d) {
  return [townServiceCopy(d), d.name, d.governing?.name, d.golf?.name].filter((x) => typeof x === 'string').join('\n');
}
/**
 * Overlap between a community page and another page: another community (`sameTown` — FAIL above 25%, WARN above 15%;
 * any other town — FAIL above 25%), its own town record or its town's putting-green page (FAIL above 25%).
 */
function communityPair(a, b, { as = 'community', sameTown = false } = {}) {
  const sim = jaccard(a.sh, b.sh);
  const warnAt = as === 'community' && sameTown ? 0.15 : 0.25;
  if (sim <= warnAt) return [];
  const shared = [...a.sh].filter((x) => b.sh.has(x));
  const eg = shared.slice(0, 3).map((x) => `"…${x}…"`).join(', ');
  const other = as === 'town' ? `its town record ${b.id}` : as === 'service' ? `its town's putting-green page ${b.id}` : b.id;
  const pair = `${a.id} ~ ${other}: ${(sim * 100).toFixed(1)}% of five-word runs shared (${shared.length} runs)`;
  const fix = as === 'community'
    ? 'Rewrite the shared passages in this community\'s own facts — two neighborhoods\' pages must not read alike'
    : 'Say a town-wide fact once, on the town\'s own page, and write what is true of this community alone here';
  return sim > 0.25
    ? [['FAIL', `community overlap ${pair} — limit 25%. Shared runs include ${eg}. ${fix}`]]
    : [['WARN', `community overlap ${pair} — warn above 15% (same town). Shared runs include ${eg}`]];
}
/** Overlap between a town × service page and another page (same service) or its own town record. */
function townServicePair(a, b, { parent = false } = {}) {
  const sim = jaccard(a.sh, b.sh);
  if (sim <= 0.15) return [];
  const shared = [...a.sh].filter((x) => b.sh.has(x));
  const eg = shared.slice(0, 3).map((x) => `"…${x}…"`).join(', ');
  const pair = `${a.id} ~ ${parent ? `its town record ${b.id}` : b.id}: ${(sim * 100).toFixed(1)}% of five-word runs shared (${shared.length} runs)`;
  const fix = parent
    ? 'Say a town-wide fact once, on the town page, and write what is true of this town for this use here'
    : 'Rewrite the shared passages in this town\'s own facts — two towns\' pages for one service must not read alike';
  return sim > 0.25
    ? [['FAIL', `town-service overlap ${pair} — limit 25%. Shared runs include ${eg}. ${fix}`]]
    : [['WARN', `town-service overlap ${pair} — warn above 15%. Shared runs include ${eg}`]];
}
function guideCopy(fm, body) {
  const dsp = fm.display ?? {};
  return [fm.title, fm.description, fm.h1, dsp.crumb, dsp.faqH2, dsp.cta?.title, dsp.cta?.payoff, dsp.cta?.lede,
    fm.answer?.question, fm.answer?.answer, ...(fm.faq ?? []).flatMap((f) => [f?.q, f?.a]), body]
    .filter((x) => typeof x === 'string').join('\n');
}
/** What a guide says, for the overlap check: the answer, the FAQ answers and the body (not the headline). */
function guideBody(fm, body) {
  return [fm.answer?.answer, ...(fm.faq ?? []).map((f) => f?.a), body].filter((x) => typeof x === 'string').join('\n');
}
/** A title or question as the duplicate check compares it: lower case, punctuation and the brand suffix out. */
export const sameText = (s) => lowerWords(String(s ?? '').replace(/\s*\|\s*NoCo Turf Co\.?\s*$/, '')).replace(/[$%#.]/g, ' ').replace(/\s+/g, ' ').trim();
/** One guide file, parsed for the overlap and duplicate checks (null when it can't be read). */
function guideDoc(file, yaml) {
  const src = read(file);
  const fm = src.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!fm || !yaml) return null;
  let d;
  try { d = yaml.load(fm[1]) ?? {}; } catch { return null; }
  return docOf(path.basename(file, '.md'), d, src.slice(fm[0].length));
}
const docOf = (id, d, body) => ({ id, title: sameText(d.title), question: sameText(d.answer?.question), sh: shingles(guideBody(d, body)) });
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
    if (!rec) { out.push(['FAIL', `layerRefs id "${id}" is not in src/data/layers/*.json, src/data/layers/guides/*.json, src/data/layers/local/*.json or src/data/layers/communities/*.json`]); continue; }
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

/** "It's" and "It’s" read the same: the H1 is set with curly apostrophes, frontmatter is usually typed straight. */
const apos = (s) => normalise(s);
const KEBAB = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** The topic registry (src/data/guide-topics.ts) is copy too: its hub titles, descriptions, H1s and ledes ship. */
function checkTopics(out, claimsCtx) {
  const seen = new Set();
  for (const t of GUIDE_TOPICS) {
    const at = `topic ${t.slug}`;
    if (!KEBAB.test(t.slug)) out.push(['FAIL', `${at}: slug must be kebab-case`]);
    if (seen.has(t.slug)) out.push(['FAIL', `${at}: listed twice`]);
    seen.add(t.slug);
    for (const k of ['name', 'label', 'title', 'description', 'h1', 'lede', 'faqH2']) if (typeof t[k] !== 'string' || !t[k].trim()) out.push(['FAIL', `${at}: ${k} is empty`]);
    if (!t.cta?.title || !t.cta?.payoff) out.push(['FAIL', `${at}: cta needs a title and a payoff`]);
    if (t.description?.length > 160) out.push(['FAIL', `${at}: description is ${t.description.length} characters — 160 at most`]);
    if (t.title?.length > 70) out.push(['FAIL', `${at}: title is ${t.title.length} characters — 70 at most`]);
    if (t.title && !/\s\|\sNoCo Turf Co\.$/.test(t.title)) out.push(['FAIL', `${at}: title must end with "| NoCo Turf Co."`]);
    if (t.paint && !apos(t.h1).includes(apos(t.paint))) out.push(['FAIL', `${at}: paint "${t.paint}" is not in the h1`]);
  }
  const copy = GUIDE_TOPICS.flatMap((t) => [t.name, t.label, t.title, t.description, t.h1, t.lede, t.faqH2, t.cta?.title, t.cta?.payoff])
    .filter((x) => typeof x === 'string').join('\n');
  checkLeaks(copy, out);
  checkClaims(copy, out, { ...claimsCtx, layerWords: '', layerNumbers: new Set() });
  checkNumbers(copy, new Set(), out, false);
}

/** The town × service registry (src/data/town-services.mjs) ships words on every page of a service: its crumb,
 *  noun, hero ask, closing band and law line. The same copy rules, plus a photos.ts use and a guide topic that exist. */
function checkTownServiceRegistry(out, claimsCtx, photoUseSet) {
  for (const s of TOWN_SERVICES) {
    const at = `town service ${s.slug}`;
    for (const k of ['crumb', 'noun', 'ask']) if (typeof s[k] !== 'string' || !s[k].trim()) out.push(['FAIL', `${at}: ${k} is empty`]);
    if (!s.band?.title || !s.band?.payoff || !s.band?.lede?.includes('{town}')) out.push(['FAIL', `${at}: band needs a title, a payoff and a lede naming {town}`]);
    if (!topicBySlug[s.topic]) out.push(['FAIL', `${at}: topic "${s.topic}" is not in src/data/guide-topics.ts`]);
    if (!photoUseSet.has(s.photoUse)) out.push(['FAIL', `${at}: photo use "${s.photoUse}" is not a Photo use in src/data/photos.ts`]);
  }
  const copy = TOWN_SERVICES.flatMap((s) => [s.crumb, s.noun, s.ask, s.band?.title, s.band?.payoff, s.band?.lede, s.lawLine])
    .filter((x) => typeof x === 'string').join('\n');
  checkLeaks(copy, out);
  checkClaims(copy, out, { ...claimsCtx, layerWords: '', layerNumbers: new Set() });
  checkNumbers(copy, new Set(), out, false);
}

/** Five-word-run overlap and exact duplicates between two guides. Returns [level, message] or nothing. */
function guidePair(a, b) {
  const out = [];
  if (a.title && a.title === b.title) out.push(['FAIL', `guides ${a.id} and ${b.id} have the same title — each guide answers its own question`]);
  if (a.question && a.question === b.question) out.push(['FAIL', `guides ${a.id} and ${b.id} ask the same answer.question ("${a.question}") — merge them, or make each question its own`]);
  const sim = jaccard(a.sh, b.sh);
  if (sim > 0.15) {
    const shared = [...a.sh].filter((x) => b.sh.has(x));
    const eg = shared.slice(0, 3).map((x) => `"…${x}…"`).join(', ');
    const pair = `${a.id} ~ ${b.id}: ${(sim * 100).toFixed(1)}% of five-word runs shared (${shared.length} runs)`;
    if (sim > 0.25) out.push(['FAIL', `guide overlap ${pair} — limit 25%. Shared runs include ${eg}. Rewrite the shared passages in this guide's own words, or link to the other guide instead of repeating it`]);
    else out.push(['WARN', `guide overlap ${pair} — warn above 15%. Shared runs include ${eg}`]);
  }
  return out;
}

const LAYER_TODAY = process.env.LAYERS_TODAY || todayISO();

// ───────────────────────────── the run ─────────────────────────────

function listDir(dir, ext) {
  return fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => f.endsWith(ext) && !f.startsWith('_') && !f.startsWith('.')).sort().map((f) => path.join(dir, f)) : [];
}
function kindOf(file) {
  const parent = path.basename(path.dirname(file));
  if (parent === 'towns' && file.endsWith('.json')) return 'town';
  if (parent === 'town-services' && file.endsWith('.json')) return 'townService';
  if (parent === 'communities' && file.endsWith('.json')) return 'community';
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
  for (const d of layers.dupes) { log(`x FAIL ${d}`); fails++; }
  if (layers.empty) { log('! WARN src/data/layers/ has no records yet — layerRefs and number tracing are warnings until it does'); warns++; }

  const content = path.join(root, 'src/content');
  const named = files.length > 0;
  const list = named ? files.map((f) => path.resolve(f)) : [
    ...listDir(path.join(content, 'towns'), '.json'),
    ...listDir(path.join(content, 'town-services'), '.json'),
    ...listDir(path.join(content, 'communities'), '.json'),
    ...listDir(path.join(content, 'guides'), '.md'),
    ...listDir(path.join(content, 'services'), '.md'),
    ...listDir(path.join(content, 'work'), '.json'),
  ];
  const photosDir = path.join(root, 'src/assets/photos');
  const servicesSrc = read(path.join(REPO, 'src/data/services.ts'));
  const serviceSlugs = new Set([...servicesSrc.matchAll(/\bslug:\s*'([a-z0-9-]+)'/g)].map((m) => m[1]));
  const serviceConfirmed = new Map([...servicesSrc.matchAll(/\bslug:\s*'([a-z0-9-]+)'[\s\S]*?\bconfirmed:\s*(true|false)/g)].map((m) => [m[1], m[2] === 'true']));
  const photosSrc = read(path.join(REPO, 'src/data/photos.ts'));
  const photoIds = new Set([...photosSrc.matchAll(/\bid:\s*'([a-z0-9-]+)'/g)].map((m) => m[1]));
  /** photos.ts id → its `use`, `place` and optional `community`, read as text (photos.ts imports images, so Node
   *  can't load it): each PHOTOS entry runs from its "{ id: '…'" to the next one or the array's end. */
  const photoMeta = new Map([...photosSrc.matchAll(/\{\s*id:\s*'([a-z0-9-]+)'([\s\S]*?)(?=\{\s*id:\s*'|\];)/g)]
    .map((m) => [m[1], {
      use: m[2].match(/\buse:\s*'([a-z-]+)'/)?.[1],
      place: m[2].match(/\bplace:\s*'([^']*)'/)?.[1] ?? '',
      community: m[2].match(/\bcommunity:\s*'([^']*)'/)?.[1],
    }]));
  const photoUses = new Map([...photoMeta].map(([id, p]) => [id, p.use]));
  const guideIds = new Set(listDir(path.join(content, 'guides'), '.md').map((f) => path.basename(f, '.md')));

  // publication state of every town record on disk, for nearby links and town × service pages
  const townStatus = {};
  for (const f of listDir(path.join(content, 'towns'), '.json')) {
    try { townStatus[path.basename(f, '.json')] = JSON.parse(read(f))?.status ?? 'draft'; } catch { /* reported below */ }
  }

  const bodies = [];
  const guideDocs = [];
  const tsDocs = []; // town × service pages checked in this run: { id, town, service, sh }
  const gate = {}; // slug → { status, blocks, own, photo, pass, reasons, needs }
  const tsGate = {}; // town--service → { status, blocks, substantive, own, photo, pass, reasons, needs }
  const cmDocs = []; // community pages checked in this run: { id, town, sh }
  const cmGate = {}; // town--community → { status, town, name, blocks, substantive, own, photo, pass, reasons, needs }
  const gatedLocal = new Set(); // single-file mode: each town's (or community's) own layer file is gated once

  /** Single-file mode: every check-layers rule on a town's (or, with `dir`, a community's) own layer file, reported
   *  with the record. */
  const gateLocalFile = (town, out, dir = LOCAL_LAYER_DIR) => {
    const ownFile = `${dir}/${town}.json`;
    if (!named || gatedLocal.has(ownFile) || !layers.fileRecords.has(ownFile)) return;
    gatedLocal.add(ownFile);
    const errors = [], warnings = [];
    const recs = layers.fileRecords.get(ownFile);
    checkOwnedFile(ownFile, recs, { errors, warnings });
    for (const r of recs) checkRecord(r, ownFile, { today: LAYER_TODAY, errors, warnings });
    for (const e of errors) out.push(['FAIL', `layer file: ${e}`]);
    for (const w of warnings) out.push(['WARN', `layer file: ${w}`]);
  };

  if (!named) {
    const out = [];
    checkTopics(out, { approved, unapproved: claims.unapproved });
    const f = out.filter((o) => o[0] === 'FAIL').length;
    fails += f; warns += out.length - f;
    log(`${f ? 'x FAIL' : out.length ? '! WARN' : 'ok    '} guide-topics [registry] (${GUIDE_TOPICS.length} topics)`);
    for (const [lvl, msg] of out) log(`     ${lvl === 'FAIL' ? 'x' : '!'} ${msg}`);

    const ts = [];
    const useUnion = photosSrc.match(/\buse:\s*((?:'[a-z-]+'\s*\|?\s*)+);/)?.[1] ?? '';
    checkTownServiceRegistry(ts, { approved, unapproved: claims.unapproved }, new Set([...useUnion.matchAll(/'([a-z-]+)'/g)].map((m) => m[1])));
    const tf = ts.filter((o) => o[0] === 'FAIL').length;
    fails += tf; warns += ts.length - tf;
    log(`${tf ? 'x FAIL' : ts.length ? '! WARN' : 'ok    '} town-services [registry] (${TOWN_SERVICES.length} services)`);
    for (const [lvl, msg] of ts) log(`     ${lvl === 'FAIL' ? 'x' : '!'} ${msg}`);
  }

  for (const file of list) {
    const kind = kindOf(file);
    const id = path.basename(file).replace(/\.(json|md)$/, '');
    const out = [];
    if (!kind) { log(`x FAIL ${id}: not under src/content/{towns,town-services,communities,guides,services,work}/ with the right extension`); fails++; continue; }

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

    schemaIssues(schemas[{ town: 'towns', townService: 'townServices', community: 'communities', guide: 'guides', service: 'services', work: 'work' }[kind]], d, out);

    let copy = '', refs = [], sourceUrls = [], ownSourceText = '';
    // An FAQ answer may cite its own layer records (faq[].layerRefs): they count like any other reference.
    const faqRefs = (d.faq ?? []).flatMap((f) => (Array.isArray(f?.layerRefs) ? f.layerRefs : []));
    if (kind === 'town') {
      copy = townCopy(d);
      refs = [...(d.blocks ?? []).flatMap((b) => b.layerRefs ?? []), ...faqRefs];
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
      if (townBySlug[d.slug]) gateLocalFile(d.slug, out);
    } else if (kind === 'townService') {
      copy = townServiceCopy(d);
      refs = [...(d.blocks ?? []).flatMap((b) => b.layerRefs ?? []), ...faqRefs];
      sourceUrls = townSourceUrls(d);
      ownSourceText = (d.sources ?? []).map((s) => `${s?.label ?? ''} ${s?.checked ?? ''}`).join('\n');
      const town = townBySlug[d.town];
      const svc = townServiceBySlug[d.service];
      // the file name is the record's key: {town}--{service}.json
      const parsed = parseTownServiceId(id);
      if (!parsed) out.push(['FAIL', `file name must be {town-slug}--{service}.json, two hyphens between (e.g. windsor-co--putting-greens.json)${d.town && d.service ? ` — this record's is ${townServiceId(d.town, d.service)}.json` : ''}`]);
      else if (d.town && d.service && id !== townServiceId(d.town, d.service)) out.push(['FAIL', `file name should be ${townServiceId(d.town, d.service)}.json (town "${d.town}", service "${d.service}")`]);
      if (d.town !== undefined && !town) out.push(['FAIL', townEligibility(d.town).reason]);
      if (d.service !== undefined && !svc) {
        out.push(['FAIL', NOT_TOWN_SERVICES[d.service]
          ? `service "${d.service}" gets no town × service page: ${NOT_TOWN_SERVICES[d.service]}`
          : `service "${d.service}" has no town pages — use one of: ${TOWN_SERVICE_SLUGS.join(', ')}`]);
      }
      if (typeof d.title === 'string' && !/\s\|\sNoCo Turf Co\.$/.test(d.title)) out.push(['FAIL', `title must end with "| NoCo Turf Co.": ${d.title}`]);
      if (typeof d.display?.paint === 'string' && !apos(d.h1 ?? '').includes(apos(d.display.paint))) {
        out.push(['FAIL', `display.paint "${d.display.paint}" is not in the h1 — the painted mark goes on a phrase of the H1, word for word`]);
      }
      if (d.photo) {
        const p = photoMeta.get(d.photo);
        if (!photoIds.has(d.photo)) out.push(['FAIL', `photo id is not in src/data/photos.ts: ${d.photo}`]);
        else if (p && town && !p.place.includes(town.name)) out.push(['WARN', `photo "${d.photo}" was taken ${p.place}, not in ${town.name} — the caption says so; a photo from ${town.name} would be stronger`]);
      }
      checkSources(d.sources, out);
      const g = townServiceGate(d, photoUses);
      const blocks = d.blocks ?? [];
      const substantive = blocks.filter((b) => blockWords(b) >= SUBSTANTIVE_WORDS);
      tsGate[id] = {
        status, town: d.town, service: d.service, blocks: blocks.length, substantive: substantive.length, own: substantive.filter((b) => b.own).length,
        photo: d.photo ?? null, pass: g.pass, reasons: g.reasons, needs: d.needsFromBrian ?? [],
      };
      if (!g.pass) {
        if (published) out.push(['FAIL', `published but fails the town × service gate: ${g.reasons.join('; ')}`]);
        else out.push(['WARN', `town × service gate not met yet (${status}): ${g.reasons.join('; ')}${named && (d.needsFromBrian ?? []).length ? ` — needs from Brian: ${(d.needsFromBrian ?? []).join(' | ')}` : named ? '' : ' (needs from Brian: see the gate report)'}`]);
      }
      if (published && town && townStatus[d.town] !== 'published') out.push(['WARN', `its town page ${d.town} is not published — this page renders only once the town page does`]);
      if (published && svc && serviceConfirmed.get(d.service) !== true) out.push(['WARN', `service ${d.service} is not confirmed in src/data/services.ts — this page renders only once it is`]);
      if (town && svc) tsDocs.push({ id, town: d.town, service: d.service, sh: shingles(townServiceBody(d)) });
      if (town) gateLocalFile(d.town, out);
    } else if (kind === 'community') {
      copy = communityCopy(d);
      const golfRef = typeof d.golf?.layerRef === 'string' ? [d.golf.layerRef] : [];
      const govRefs = Array.isArray(d.governing?.layerRefs) ? d.governing.layerRefs : [];
      refs = [...(d.blocks ?? []).flatMap((b) => b.layerRefs ?? []), ...faqRefs, ...govRefs, ...golfRef];
      sourceUrls = townSourceUrls(d);
      ownSourceText = (d.sources ?? []).map((s) => `${s?.label ?? ''} ${s?.checked ?? ''}`).join('\n');
      const town = townBySlug[d.town];
      // the file name is the record's key: {town}--{slug}.json
      const parsed = parseCommunityId(id);
      if (!parsed) out.push(['FAIL', `file name must be {town-slug}--{community-slug}.json, two hyphens between (e.g. windsor-co--highland-meadows.json)${d.town && d.slug ? ` — this record's is ${communityId(d.town, d.slug)}.json` : ''}`]);
      else if (d.town && d.slug && id !== communityId(d.town, d.slug)) out.push(['FAIL', `file name should be ${communityId(d.town, d.slug)}.json (town "${d.town}", slug "${d.slug}")`]);
      if (d.town !== undefined && !town) out.push(['FAIL', townEligibility(d.town).reason]);
      const slugProblem = d.slug !== undefined ? communitySlugProblem(d.slug) : null;
      if (slugProblem) out.push(['FAIL', `${slugProblem} — the page would share /areas/${d.town ?? '{town}'}/${d.slug}/ with it`]);
      if (typeof d.title === 'string' && !/\s\|\sNoCo Turf Co\.$/.test(d.title)) out.push(['FAIL', `title must end with "| NoCo Turf Co.": ${d.title}`]);
      if (typeof d.title === 'string' && typeof d.name === 'string' && !apos(d.title).includes(apos(d.name))) out.push(['WARN', `the title doesn't name ${d.name} — the search that finds this page names the neighborhood`]);
      if (typeof d.display?.paint === 'string' && !apos(d.h1 ?? '').includes(apos(d.display.paint))) {
        out.push(['FAIL', `display.paint "${d.display.paint}" is not in the h1 — the painted mark goes on a phrase of the H1, word for word`]);
      }
      const gov = d.governing;
      if (gov?.url && !sourceUrls.map(normUrl).includes(normUrl(gov.url))) out.push(['FAIL', `governing.url is not among this record's sources: ${gov.url} — the facts strip links it, so it is a source like any other`]);
      if (gov?.type === 'none-found' && (gov.url || govRefs.length)) out.push(['WARN', 'governing.type is none-found but it names guidelines (url or layerRefs) — which is it?']);
      if (gov && gov.type !== 'none-found' && !govRefs.length) out.push(['WARN', `governing.layerRefs is empty — the design-review section can only name ${gov.name}; cite the records that quote its guidelines on turf`]);
      if (d.kind === 'golf' && !d.golf) out.push(['WARN', 'a golf community with no `golf` — name the course, citing the record that names it']);
      if (d.golf?.name && d.golf?.layerRef && !layers.empty) {
        const r = layers.byId.get(d.golf.layerRef);
        if (r && !lowerWords([r.fact, r.quote, r.source_label].join(' ')).includes(lowerWords(d.golf.name).trim())) {
          out.push(['FAIL', `golf.name "${d.golf.name}" is not named by its record ${d.golf.layerRef} — the facts strip prints only what the record says`]);
        }
      }
      if (d.photo && !photoIds.has(d.photo)) out.push(['FAIL', `photo id is not in src/data/photos.ts: ${d.photo}`]);
      checkSources(d.sources, out);
      const g = communityGate(d, photoMeta);
      const blocks = d.blocks ?? [];
      const substantive = blocks.filter((b) => blockWords(b) >= SUBSTANTIVE_WORDS);
      cmGate[id] = {
        status, town: d.town, name: d.name, blocks: blocks.length, substantive: substantive.length, own: substantive.filter((b) => b.own).length,
        photo: d.photo ?? null, pass: g.pass, reasons: g.reasons, needs: d.needsFromBrian ?? [],
      };
      if (!g.pass) {
        if (published) out.push(['FAIL', `published but fails the community gate: ${g.reasons.join('; ')}`]);
        else out.push(['WARN', `community gate not met yet (${status}): ${g.reasons.join('; ')}${named && (d.needsFromBrian ?? []).length ? ` — needs from Brian: ${(d.needsFromBrian ?? []).join(' | ')}` : named ? '' : ' (needs from Brian: see the gate report)'}`]);
      }
      if (published && town && townStatus[d.town] !== 'published') out.push(['WARN', `its town page ${d.town} is not published — this page renders only once the town page does`]);
      const plain = plainText(copy);
      for (const re of COMMUNITY_PUFFERY) { const m = plain.match(re); if (m) out.push(['WARN', `"${m[0]}" sells the neighborhood by its price — say what its rules, course or lots are instead: …${ctx(plain, m.index, m[0].length)}…`]); }
      if (town && !slugProblem) cmDocs.push({ id, town: d.town, sh: shingles(townServiceBody(d)) });
      if (parsed) gateLocalFile(id, out, COMMUNITY_LAYER_DIR);
    } else if (kind === 'guide') {
      copy = guideCopy(d, body);
      refs = [...(d.layerRefs ?? []), ...faqRefs];
      sourceUrls = (d.sources ?? []).map((s) => s?.url).filter(Boolean);
      ownSourceText = [(d.sources ?? []).map((s) => `${s?.label ?? ''} ${s?.checked ?? ''}`).join('\n'), d.published, d.updated].join('\n');
      if (!plainText(body).trim()) out.push(['FAIL', 'the guide has no body']);
      for (const s of d.related?.towns ?? []) if (!townBySlug[s]) out.push(['FAIL', `related town is not a NoCo town: ${s}`]);
      for (const s of d.related?.services ?? []) if (!serviceSlugs.has(s)) out.push(['FAIL', `related service is not in src/data/services.ts: ${s}`]);
      if (d.topic !== undefined && !topicBySlug[d.topic]) out.push(['FAIL', `topic "${d.topic}" has no entry in src/data/guide-topics.ts — use one of: ${GUIDE_TOPICS.map((t) => t.slug).join(', ')}`]);
      if (topicBySlug[id]) out.push(['FAIL', `the guide id "${id}" is a topic slug — /guides/${id}/ is that topic's hub; rename the file`]);
      for (const ph of d.photos ?? []) if (!photoIds.has(ph)) out.push(['FAIL', `photos: "${ph}" is not in src/data/photos.ts — a guide prints only Brian's own job photos, by id`]);
      if (typeof d.display?.paint === 'string' && !apos(d.h1 ?? '').includes(apos(d.display.paint))) {
        out.push(['FAIL', `display.paint "${d.display.paint}" is not in the h1 — the painted mark goes on a phrase of the H1, word for word`]);
      }
      // the guide's own layer file: every check-layers rule, reported with the guide
      const ownFile = `${GUIDE_LAYER_DIR}/${id}.json`;
      if (layers.fileRecords.has(ownFile)) {
        const errors = [], warnings = [];
        const recs = layers.fileRecords.get(ownFile);
        checkOwnedFile(ownFile, recs, { errors, warnings });
        for (const r of recs) checkRecord(r, ownFile, { today: LAYER_TODAY, errors, warnings });
        for (const e of errors) out.push(['FAIL', `layer file: ${e}`]);
        for (const w of warnings) out.push(['WARN', `layer file: ${w}`]);
      }
      checkSources(d.sources, out);
      if (!published && (d.needsFromBrian ?? []).length) out.push(['WARN', `needs from Brian: ${d.needsFromBrian.join(' | ')}`]);
      guideDocs.push(docOf(id, d, body));
    } else if (kind === 'service') {
      copy = serviceCopy(d, body);
      refs = [...(d.layerRefs ?? []), ...faqRefs];
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

    const recs = checkLayerRefs(refs, layers, out, { slug: kind === 'town' ? d.slug : kind === 'townService' || kind === 'community' ? d.town : null, sourceUrls: kind === 'work' ? null : sourceUrls, published });
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

  // guides: overlap and duplicates — every pair, or (naming files) each named guide against every other on disk
  const pairs = [];
  if (!named) {
    for (let i = 0; i < guideDocs.length; i++) for (let j = i + 1; j < guideDocs.length; j++) pairs.push([guideDocs[i], guideDocs[j]]);
  } else if (guideDocs.length) {
    const corpus = listDir(path.join(content, 'guides'), '.md').map((f) => guideDoc(f, yaml)).filter(Boolean);
    const done = new Set();
    for (const a of guideDocs) for (const b of corpus) {
      const key = [a.id, b.id].sort().join(' ~ ');
      if (a.id === b.id || done.has(key)) continue;
      done.add(key);
      pairs.push([a, b]);
    }
    log(`\nGuide overlap: ${guideDocs.map((g) => g.id).join(', ')} against ${corpus.filter((c) => !guideDocs.some((g) => g.id === c.id)).length} other guide(s) on disk`);
  }
  for (const [a, b] of pairs) {
    for (const [lvl, msg] of guidePair(a, b)) {
      if (lvl === 'FAIL') fails++; else warns++;
      log(`${lvl === 'FAIL' ? 'x FAIL' : '! WARN'} ${msg}`);
    }
  }

  // town × service pages: overlap with every page of the same service, and with the page's own town record —
  // every pair in a full run, or (naming files) each named page against everything on disk; a named town
  // record is compared with its own town × service pages
  const tsPairs = []; // [page, other, parent?]
  const tsDocFrom = (file) => {
    try {
      const d = JSON.parse(read(file));
      return townBySlug[d?.town] && townServiceBySlug[d?.service]
        ? { id: path.basename(file, '.json'), town: d.town, service: d.service, sh: shingles(townServiceBody(d)) } : null;
    } catch { return null; }
  };
  const townDocFrom = (slug) => {
    const f = path.join(content, 'towns', `${slug}.json`);
    try { return fs.existsSync(f) ? { id: slug, sh: shingles(townBody(JSON.parse(read(f)))) } : null; } catch { return null; }
  };
  if (!named) {
    for (let i = 0; i < tsDocs.length; i++) for (let j = i + 1; j < tsDocs.length; j++) {
      if (tsDocs[i].service === tsDocs[j].service) tsPairs.push([tsDocs[i], tsDocs[j], false]);
    }
    for (const a of tsDocs) { const t = bodies.find((b) => b.id === a.town); if (t) tsPairs.push([a, t, true]); }
  } else {
    const namedTowns = bodies.map((b) => b.id);
    if (tsDocs.length || namedTowns.length) {
      const corpus = listDir(path.join(content, 'town-services'), '.json').map(tsDocFrom).filter(Boolean);
      const done = new Set();
      const add = (a, b, parent) => {
        const key = `${[a.id, b.id].sort().join(' ~ ')}${parent ? ' (town)' : ''}`;
        if (a.id === b.id || done.has(key)) return;
        done.add(key);
        tsPairs.push([a, b, parent]);
      };
      for (const a of tsDocs) {
        for (const b of corpus) if (b.service === a.service) add(a, b, false);
        const t = bodies.find((x) => x.id === a.town) ?? townDocFrom(a.town);
        if (t) add(a, t, true);
      }
      for (const t of bodies) for (const c of corpus) if (c.town === t.id) add(c, t, true);
      const others = new Set(tsPairs.map(([, b, parent]) => (parent ? `town ${b.id}` : b.id)));
      if (tsDocs.length || tsPairs.length) log(`\nTown × service overlap: ${[...tsDocs.map((x) => x.id), ...namedTowns].join(', ')} against ${others.size} other record(s) on disk`);
    }
  }
  for (const [a, b, parent] of tsPairs) {
    for (const [lvl, msg] of townServicePair(a, b, { parent })) {
      if (lvl === 'FAIL') fails++; else warns++;
      log(`${lvl === 'FAIL' ? 'x FAIL' : '! WARN'} ${msg}`);
    }
  }

  // community pages: overlap with every other community (same town: FAIL above 25%, WARN above 15%; any other town:
  // FAIL above 25%), with the page's own town record and with its town's putting-green page (FAIL above 25%) — every
  // pair in a full run, or (naming files) each named page against everything on disk; a named town record or
  // putting-green page is compared with its town's communities
  const cmPairs = []; // [community, other, as]
  const cmDocFrom = (file) => {
    try {
      const d = JSON.parse(read(file));
      return townBySlug[d?.town] && !communitySlugProblem(d?.slug) ? { id: path.basename(file, '.json'), town: d.town, sh: shingles(townServiceBody(d)) } : null;
    } catch { return null; }
  };
  const greenDocFrom = (town) => {
    const f = path.join(content, 'town-services', `${townServiceId(town, 'putting-greens')}.json`);
    return fs.existsSync(f) ? tsDocFrom(f) : null;
  };
  {
    const done = new Set();
    const add = (a, b, as) => {
      const key = `${[a.id, b.id].sort().join(' ~ ')} (${as})`;
      if (a.id === b.id || done.has(key)) return;
      done.add(key);
      cmPairs.push([a, b, as]);
    };
    const townOf = (slug) => bodies.find((x) => x.id === slug) ?? (named ? townDocFrom(slug) : null);
    const greenOf = (slug) => tsDocs.find((x) => x.id === townServiceId(slug, 'putting-greens')) ?? (named ? greenDocFrom(slug) : null);
    const corpus = named ? listDir(path.join(content, 'communities'), '.json').map(cmDocFrom).filter(Boolean) : cmDocs;
    for (const a of cmDocs) {
      for (const b of corpus) add(a, b, 'community');
      const t = townOf(a.town);
      if (t) add(a, t, 'town');
      const g = greenOf(a.town);
      if (g) add(a, g, 'service');
    }
    if (named) {
      for (const t of bodies) for (const c of corpus) if (c.town === t.id) add(c, t, 'town');
      for (const g of tsDocs) if (g.service === 'putting-greens') for (const c of corpus) if (c.town === g.town) add(c, g, 'service');
      const mine = [...cmDocs.map((x) => x.id), ...bodies.map((b) => b.id), ...tsDocs.filter((x) => x.service === 'putting-greens').map((x) => x.id)];
      const others = new Set(cmPairs.flatMap(([a, b]) => [a.id, b.id]).filter((x) => !mine.includes(x)));
      if (cmDocs.length || cmPairs.length) log(`\nCommunity overlap: ${mine.join(', ')} against ${others.size} other record(s) on disk`);
    }
  }
  for (const [a, b, as] of cmPairs) {
    for (const [lvl, msg] of communityPair(a, b, { as, sameTown: as === 'community' && a.town === b.town })) {
      if (lvl === 'FAIL') fails++; else warns++;
      log(`${lvl === 'FAIL' ? 'x FAIL' : '! WARN'} ${msg}`);
    }
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

    log(`\nTown × service gate — src/lib/town-service-gate.mjs: ≥3 substantive blocks (${SUBSTANTIVE_WORDS}+ words), ≥2 own, every block sourced, a photo of this use`);
    const townRank = new Map(NOCO_TOWNS.map((t, i) => [t.slug, i]));
    for (const s of TOWN_SERVICES) {
      const recs = Object.entries(tsGate).filter(([, g]) => g.service === s.slug)
        .sort(([, a], [, b]) => (townRank.get(a.town) ?? 99) - (townRank.get(b.town) ?? 99));
      log(`  ${s.slug.padEnd(16)} ${recs.length} of ${NOCO_TOWNS.length} towns written · a photo with use "${s.photoUse}"`);
      for (const [rid, g] of recs) {
        const verdict = g.pass ? 'PASS' : g.status === 'published' ? 'FAIL' : 'not yet';
        log(`    ${rid.padEnd(36)} ${g.status.padEnd(10)} ${g.blocks} blocks (${g.substantive} substantive) · ${g.own} own · ${g.photo ? `photo ${g.photo}` : 'no photo'} — gate ${verdict}`);
        for (const r of g.reasons) log(`        - ${r}`);
        for (const n of g.needs) log(`        needs from Brian: ${n}`);
      }
    }
    for (const [rid, g] of Object.entries(tsGate)) if (!townServiceBySlug[g.service]) log(`    ${rid.padEnd(36)} ${g.status.padEnd(10)} NOT A TOWN × SERVICE PAGE`);

    log(`\nCommunity gate — src/lib/community-gate.mjs: ≥3 substantive blocks (${SUBSTANTIVE_WORDS}+ words), ≥2 own, every block sourced, a photo taken in the community or its town`);
    const cms = Object.entries(cmGate).sort(([a, ga], [b, gb]) => ((townRank.get(ga.town) ?? 99) - (townRank.get(gb.town) ?? 99)) || a.localeCompare(b));
    if (!cms.length) log('  no community records yet (src/content/communities/{town}--{community}.json)');
    for (const [rid, g] of cms) {
      const verdict = g.pass ? 'PASS' : g.status === 'published' ? 'FAIL' : 'not yet';
      log(`  ${rid.padEnd(40)} ${g.status.padEnd(10)} ${g.blocks} blocks (${g.substantive} substantive) · ${g.own} own · ${g.photo ? `photo ${g.photo}` : 'no photo'} — gate ${verdict}`);
      for (const r of g.reasons) log(`      - ${r}`);
      for (const n of g.needs) log(`      needs from Brian: ${n}`);
    }
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
