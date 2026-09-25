#!/usr/bin/env node
/**
 * check-layers — the gate on the shared data layer (src/data/layers/*.json) and the owner-scoped layer
 * files, one per owner so parallel writers never share a file:
 *   src/data/layers/guides/{guide-id}.json — the facts only that guide uses
 *   src/data/layers/local/{town-slug}.json — a town's own facts for its town × service pages, written by that
 *                                            town's writer and covering all four services
 *
 * The contract lives in docs/CONTRACTS.md ("Data layer"). Every file is a JSON array of records;
 * every record says one thing a page may say, with the verbatim source sentence, a https source,
 * the date it was checked and every number it uses. This script FAILS the build on:
 *   - a file that is not a JSON array, or a record missing a required field / with a wrong type
 *   - a duplicate id (ids are unique across ALL layer files, guides/ included) or an id that is not kebab-case
 *   - in guides/{guide-id}.json: a file name that is not a kebab-case guide id, or a record id that does not
 *     start with "{guide-id}." (the prefix makes a clash between two writers impossible)
 *   - in local/{town-slug}.json: a file name that is not a NoCo town slug, a record id that does not start
 *     with "{town-slug}.", or a record whose applies_to does not name that town
 *   - an applies_to slug that is not a NoCo town in src/data/territory.mjs ("*" = every NoCo town)
 *   - checked older than 365 days (WARN over 180), or a checked date in the future
 *   - a recheck date in the past (the fact has gone stale: re-verify it, then move recheck on)
 *   - a source_url that is not https
 *   - a number used in the fact or quote that is not listed in `numbers`
 *   - a water-providers record without a provider, or a malformed rates block
 *   - "Denver", "Timeless" or a TIMELESS phone number anywhere in a record's public text
 *   - a NoCo town with no ordinance record at all (an honest NOT FOUND record counts)
 * and WARNS on: a town whose ordinance records are all UNVERIFIED, a town with no renderable drought,
 * utility, climate or soil record of its own, a TIMELESS town named in a fact, a `numbers` entry that
 * appears nowhere in the record, a fact longer than one plain sentence, a guides/ file with no guide record
 * of that id yet, a local/ record that also applies to other towns (a shared fact belongs in a shared file),
 * and any other subdirectory (it is not read).
 *
 * Usage:
 *   node scripts/check-layers.mjs                     # checks src/data/layers against today
 *   node scripts/check-layers.mjs --today 2026-09-24  # pin "today" (tests, reproducible CI)
 *   node scripts/check-layers.mjs --dir path/to/layers --quiet
 * Exit code 1 when anything FAILS. Node ESM, no dependencies.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { NOCO_TOWNS, TIMELESS_TOWNS } from '../src/data/territory.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(HERE, '..');
export const LAYER_DIR = path.join(ROOT, 'src/data/layers');

export const LAYER_FILES = ['state-law.json', 'city-codes.json', 'water-providers.json', 'rebates.json', 'drought-2026.json', 'climate.json', 'soil.json'];
/** research / product / standard carry the guides' non-legal facts: an agency or university finding, a
 *  manufacturer's published spec, a test standard (ASTM, CPSC). place is a named local place from a public
 *  record (a golf course, a park with a playground, a dog park, a school field) — mostly in local/ files. */
export const LAYERS = ['state', 'county', 'utility', 'rebate', 'ordinance', 'drought', 'climate', 'soil', 'housing', 'place', 'research', 'product', 'standard'];
/** The subdirectories that are read, each one file per owner under the same record contract and gate:
 *  guides/{guide-id}.json (a guide's own facts) and local/{town-slug}.json (a town's own facts for its
 *  town × service pages). The file name is the owner; every id in it starts "{owner}.". */
export const GUIDE_LAYER_DIR = 'guides';
export const LOCAL_LAYER_DIR = 'local';
export const OWNED_LAYER_DIRS = [GUIDE_LAYER_DIR, LOCAL_LAYER_DIR];
export const STATUSES = ['VERIFIED', 'EXTERNAL_SOURCE', 'UNVERIFIED'];
export const RATE_MODELS = ['tiered', 'flat', 'water-budget', 'allotment'];
export const REQUIRED = ['id', 'layer', 'applies_to', 'fact', 'quote', 'source_url', 'source_label', 'checked', 'reachable', 'status', 'numbers'];
const OPTIONAL = ['effective', 'recheck', 'notes', 'provider', 'rates'];

/** Layers every town should have at least one renderable, town-specific record in (WARN only). */
export const COVERAGE_WARN_LAYERS = ['drought', 'utility', 'climate', 'soil'];

export const WARN_AFTER_DAYS = 180;
export const FAIL_AFTER_DAYS = 365;

const TIMELESS_PHONES = [/303\D{0,3}349\D{0,3}2368/, /854\D{0,3}204\D{0,3}9227/];
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const KEBAB = /^[a-z0-9]+(?:[.-][a-z0-9]+)*$/;
const TOWN_SLUGS = new Set(NOCO_TOWNS.map((t) => t.slug));

/** Days from a to b (YYYY-MM-DD strings), UTC so no DST drift. */
export function daysBetween(a, b) {
  return Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86400000);
}
export function isValidDate(s) {
  if (typeof s !== 'string' || !ISO_DATE.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}
export function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

/**
 * The numbers a sentence USES, as a reader would read them — not the digits inside a legal citation.
 * Kept out: bill ids (SB24-005), section chains (38-33.3-106.5, 16.6.4.F.2, 24-802(b)), prefixed
 * identifiers (Ord. No. 1396, Sec. 13-151, Resolution 26-34, #1257825), codes glued to letters
 * (USC00053005, 4E), and one-character list markers ((1), (a), (IV)). ISO dates stay whole; a/b
 * fractions stay whole ("3/4"); "1,500" reads as 1500; a clock time reads as its hour ("11:00" → 11).
 * Ranges should use an en dash (200–1,000): an ASCII hyphen between plain digits reads as a
 * citation, unless a side carries a thousands separator ("7,001-13,000" → 7001, 13000).
 */
export function numericTokens(text) {
  if (text === undefined || text === null) return [];
  let t = ` ${String(text)} `;
  const out = [];
  t = t.replace(/\b\d{4}-\d{2}-\d{2}\b/g, (m) => { out.push(m); return ' '; });
  t = t.replace(/https?:\/\/\S+/g, ' ');
  // "7,001-13,000" is a range, not a citation: citations never carry thousands separators.
  t = t.replace(/(\d{1,3}(?:,\d{3})+|\d+)\s?-\s?(\d{1,3}(?:,\d{3})+)(?![\d,])/g, (m, a, b) => { out.push(a.replace(/,/g, ''), b.replace(/,/g, '')); return ' '; });
  // clock times read as the hour ("11:00 a.m." uses 11)
  t = t.replace(/\b(\d{1,2}):\d{2}\b/g, (m, h) => { out.push(h); return ' '; });
  t = t.replace(/\b(?:SB|HB|SJR|HJR|SCR|HCR)\s?\d{2}-\d{3,4}\b/gi, ' ');
  t = t.replace(/(?:\b(?:Ord(?:inance)?s?|Res(?:olution)?|Sec(?:tion)?s?|Supp|Initiative|Chapter|Article|Title|Exhibit|Appendix|Schedule)\.?\s*(?:No\.?\s*)?|\bNo\.\s*|§+\s*|#)\d[\w.()\-]*/gi, ' ');
  t = t.replace(/[A-Za-z0-9]*\d[A-Za-z0-9]*(?:[.-][A-Za-z0-9]+)+(?:\([A-Za-z0-9.]+\))*/g, (m) => {
    const hyphenChain = /\d[A-Za-z0-9]*-[A-Za-z0-9]*\d/.test(m);
    const dots = (m.match(/\./g) || []).length;
    return hyphenChain || dots >= 2 ? ' ' : m;
  });
  t = t.replace(/\((?:\d|[a-z]{1,4}|[ivxlcIVXLC]{1,5}|[A-Z])(?:\.\d+)?\)/g, ' ');
  t = t.replace(/\b[A-Za-z]+\d[A-Za-z0-9]*\b/g, ' ');
  t = t.replace(/\b\d+(?:st|nd|rd|th|[A-Z])\b/g, ' ');
  t = t.replace(/\b\d+\/\d+\b/g, (m) => { out.push(m); return ' '; });
  for (const m of t.matchAll(/\d{1,3}(?:,\d{3})+(?:\.\d+)?|\d+(?:\.\d+)?/g)) out.push(m[0].replace(/,/g, ''));
  return [...new Set(out)];
}
/** A numbers entry as the checker compares it: "$1,000" → "1000", "75%" → "75". */
export function normalizeNumber(n) {
  return String(n).trim().replace(/^[$~≈]/, '').replace(/[,%]/g, '').replace(/\s+/g, '');
}
function sameNumber(a, b) {
  if (a === b) return true;
  const na = Number(a), nb = Number(b);
  return Number.isFinite(na) && Number.isFinite(nb) && na === nb && !a.includes('/') && !b.includes('/');
}

function checkRates(rates, where, fail) {
  if (rates === undefined) return;
  if (!rates || typeof rates !== 'object' || Array.isArray(rates)) { fail(`${where}: rates must be an object`); return; }
  if (!isValidDate(rates.effective)) fail(`${where}: rates.effective must be YYYY-MM-DD`);
  if (typeof rates.unit !== 'string' || !rates.unit) fail(`${where}: rates.unit is required (e.g. "per 1,000 gal")`);
  if (!RATE_MODELS.includes(rates.model)) fail(`${where}: rates.model must be one of ${RATE_MODELS.join(' | ')}`);
  if (rates.base_monthly !== null && rates.base_monthly !== undefined && typeof rates.base_monthly !== 'number') fail(`${where}: rates.base_monthly must be a number or null`);
  if (!Array.isArray(rates.tiers)) { fail(`${where}: rates.tiers must be an array (empty when the provider publishes none)`); return; }
  rates.tiers.forEach((tier, i) => {
    if (!tier || typeof tier.label !== 'string' || !tier.label) fail(`${where}: rates.tiers[${i}].label is required`);
    if (typeof tier?.price !== 'number') fail(`${where}: rates.tiers[${i}].price must be a number`);
    if (tier && tier.up_to_gal !== null && tier.up_to_gal !== undefined && typeof tier.up_to_gal !== 'number') fail(`${where}: rates.tiers[${i}].up_to_gal must be a number or null`);
  });
}

/** Validate one record. Pushes into the shared errors/warnings arrays. */
export function checkRecord(rec, file, { today, errors, warnings }) {
  const where = `${file} ${rec && typeof rec.id === 'string' ? rec.id : '(no id)'}`;
  const fail = (m) => errors.push(m);
  const warn = (m) => warnings.push(m);
  if (!rec || typeof rec !== 'object' || Array.isArray(rec)) { fail(`${file}: a record that is not an object`); return; }

  for (const k of REQUIRED) if (!(k in rec) || rec[k] === null || rec[k] === '') fail(`${where}: missing field "${k}"`);
  for (const k of Object.keys(rec)) if (!REQUIRED.includes(k) && !OPTIONAL.includes(k)) warn(`${where}: unknown field "${k}" (not in docs/CONTRACTS.md)`);

  if (typeof rec.id === 'string' && !KEBAB.test(rec.id)) fail(`${where}: id must be kebab-case (a–z, 0–9, "-" and ".")`);
  if ('layer' in rec && !LAYERS.includes(rec.layer)) fail(`${where}: layer "${rec.layer}" is not one of ${LAYERS.join(' | ')}`);
  if ('status' in rec && !STATUSES.includes(rec.status)) fail(`${where}: status "${rec.status}" is not one of ${STATUSES.join(' | ')}`);
  if ('reachable' in rec && typeof rec.reachable !== 'boolean') fail(`${where}: reachable must be true or false`);
  for (const k of ['fact', 'quote', 'source_label']) if (k in rec && typeof rec[k] !== 'string') fail(`${where}: ${k} must be a string`);

  // applies_to
  if ('applies_to' in rec) {
    if (!Array.isArray(rec.applies_to) || rec.applies_to.length === 0) fail(`${where}: applies_to must be a non-empty array of town slugs or ["*"]`);
    else {
      if (rec.applies_to.includes('*') && rec.applies_to.length > 1) fail(`${where}: applies_to "*" must stand alone`);
      for (const s of rec.applies_to) if (s !== '*' && !TOWN_SLUGS.has(s)) fail(`${where}: applies_to "${s}" is not a NoCo town in src/data/territory.mjs`);
      if (new Set(rec.applies_to).size !== rec.applies_to.length) warn(`${where}: applies_to lists a town twice`);
    }
  }

  // source
  if (typeof rec.source_url === 'string') {
    let u = null;
    try { u = new URL(rec.source_url); } catch { /* handled below */ }
    if (!u || u.protocol !== 'https:') fail(`${where}: source_url must be an https URL (${rec.source_url})`);
  }

  // dates
  if ('checked' in rec) {
    if (!isValidDate(rec.checked)) fail(`${where}: checked must be a real YYYY-MM-DD date`);
    else {
      const age = daysBetween(rec.checked, today);
      if (age < 0) fail(`${where}: checked ${rec.checked} is in the future (today ${today})`);
      else if (age > FAIL_AFTER_DAYS) fail(`${where}: checked ${rec.checked} is ${age} days old (> ${FAIL_AFTER_DAYS}) — re-verify at the source`);
      else if (age > WARN_AFTER_DAYS) warn(`${where}: checked ${rec.checked} is ${age} days old (> ${WARN_AFTER_DAYS}) — schedule a re-check`);
    }
  }
  if (rec.recheck !== undefined) {
    if (!isValidDate(rec.recheck)) fail(`${where}: recheck must be a real YYYY-MM-DD date`);
    else if (daysBetween(today, rec.recheck) < 0) fail(`${where}: recheck ${rec.recheck} has passed (today ${today}) — re-verify, then update checked and recheck`);
  }
  if (rec.effective !== undefined && !isValidDate(rec.effective)) fail(`${where}: effective must be a real YYYY-MM-DD date`);

  // numbers
  if ('numbers' in rec) {
    if (!Array.isArray(rec.numbers) || rec.numbers.some((n) => typeof n !== 'string')) fail(`${where}: numbers must be an array of strings`);
    else {
      const listed = rec.numbers.map(normalizeNumber);
      const used = [...numericTokens(rec.fact), ...numericTokens(rec.quote)];
      const missing = [...new Set(used)].filter((n) => !listed.some((l) => sameNumber(l, n)));
      if (missing.length) fail(`${where}: numbers used in fact/quote but not listed in "numbers": ${missing.join(', ')}`);
      const everywhere = [rec.fact, rec.quote, rec.source_label, rec.notes, rec.effective, rec.rates ? JSON.stringify(rec.rates) : '']
        .filter(Boolean).join(' ');
      const present = new Set([...numericTokens(everywhere), ...[...everywhere.matchAll(/\d+(?:\.\d+)?/g)].map((m) => m[0])]);
      const orphans = listed.filter((l) => ![...present].some((p) => sameNumber(normalizeNumber(p), l)));
      if (orphans.length) warn(`${where}: numbers entries that appear nowhere in the record: ${orphans.join(', ')}`);
    }
  }

  // public text hygiene (facts and quotes can render)
  const publicText = [rec.fact, rec.quote, rec.source_label, rec.provider].filter((s) => typeof s === 'string').join(' \n ');
  if (/\bDenver\b/i.test(publicText)) fail(`${where}: "Denver" in public text — NoCo copy never names it outside the boundary note`);
  if (/\bTimeless\b/i.test(publicText)) fail(`${where}: "Timeless" in public text`);
  for (const re of TIMELESS_PHONES) if (re.test(JSON.stringify(rec))) fail(`${where}: a TIMELESS phone number`);
  if (typeof rec.fact === 'string') {
    for (const name of TIMELESS_TOWNS) {
      const re = new RegExp(`(?<![A-Za-z])${name.replace(/ /g, '\\s+')}(?![A-Za-z])(?!\\s+County)`);
      if (re.test(rec.fact)) warn(`${where}: fact names ${name}, a TIMELESS town — never present it as a place NoCo serves`);
    }
    const sentences = rec.fact.replace(/\b(?:[A-Z]\.){1,3}|\b(?:No|Sec|Ord|St|Dr|Co|Inc|Jan|Feb|Mar|Apr|Aug|Sept|Sep|Oct|Nov|Dec|approx|vs|ft|sq|gal|in|a\.m|p\.m)\./g, '').split(/[.!?](?:\s+|$)(?=[A-Z0-9"“(]|$)/).filter((s) => s.trim());
    if (sentences.length > 1) warn(`${where}: fact reads as ${sentences.length} sentences — the contract asks for one`);
  }

  // water-providers extras
  if (file === 'water-providers.json') {
    if (typeof rec.provider !== 'string' || !rec.provider.trim()) fail(`${where}: water-providers records need "provider"`);
    checkRates(rec.rates, where, fail);
  } else if (rec.rates !== undefined) {
    fail(`${where}: rates belongs only in water-providers.json`);
  }
}

/**
 * Read every *.json in dir, then every *.json in each owner subdirectory (guides/, then local/), named
 * "{subdir}/{file}". Returns { files: [{file, records}], errors, warnings }.
 */
export function loadLayerFiles(dir = LAYER_DIR) {
  const errors = [];
  const warnings = [];
  const files = [];
  if (!fs.existsSync(dir)) { errors.push(`${dir} does not exist`); return { files, errors, warnings }; }
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const names = [
    ...entries.filter((e) => e.isFile() && e.name.endsWith('.json')).map((e) => e.name).sort(),
    ...OWNED_LAYER_DIRS.flatMap((sub) => {
      const d = path.join(dir, sub);
      return fs.existsSync(d) ? fs.readdirSync(d).filter((f) => f.endsWith('.json')).sort().map((f) => `${sub}/${f}`) : [];
    }),
  ];
  for (const e of entries) {
    if (e.isDirectory() && !OWNED_LAYER_DIRS.includes(e.name)) warnings.push(`${e.name}/: a subdirectory that is not read — only ${OWNED_LAYER_DIRS.map((d) => `${d}/`).join(' and ')} hold layer files`);
  }
  for (const f of names) {
    let data;
    try { data = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')); } catch (e) { errors.push(`${f}: not valid JSON (${e.message})`); continue; }
    if (!Array.isArray(data)) { errors.push(`${f}: must be a JSON array of records`); continue; }
    files.push({ file: f, records: data });
  }
  return { files, errors, warnings };
}

/** The owner of an owner-scoped file: "guides/pet-turf-odor.json" → { dir: 'guides', owner: 'pet-turf-odor' },
 *  "local/windsor-co.json" → { dir: 'local', owner: 'windsor-co' }; a shared file → null. */
export function ownerOfFile(file) {
  const m = String(file).match(/^([^/]+)\/([^/]+)\.json$/);
  return m && OWNED_LAYER_DIRS.includes(m[1]) ? { dir: m[1], owner: m[2] } : null;
}
/** The guide id a guides/ file belongs to ("guides/pet-turf-odor.json" → "pet-turf-odor"), else null. */
export const guideOfFile = (file) => { const o = ownerOfFile(file); return o?.dir === GUIDE_LAYER_DIR ? o.owner : null; };
/** The town slug a local/ file belongs to ("local/windsor-co.json" → "windsor-co"), else null. */
export const townOfFile = (file) => { const o = ownerOfFile(file); return o?.dir === LOCAL_LAYER_DIR ? o.owner : null; };

/**
 * The rules only an owner-scoped file has, on top of every record rule:
 *   guides/{guide-id}.json — the name is a kebab-case guide id (WARN when no guide of that id exists yet)
 *   local/{town-slug}.json — the name is a NoCo town slug; every record applies to that town (WARN when it
 *                            applies to other towns too: a fact shared between towns belongs in a shared file)
 *   both                   — every record id starts "{owner}.", so two writers can never pick the same id
 */
export function checkOwnedFile(file, records, { guideIds = null, errors, warnings }) {
  const o = ownerOfFile(file);
  if (!o) return;
  const { dir, owner } = o;
  if (dir === GUIDE_LAYER_DIR) {
    if (!KEBAB.test(owner) || owner.includes('.')) { errors.push(`${file}: the file name must be the guide's id (kebab-case, as in src/content/guides/{id}.md)`); return; }
    if (guideIds && !guideIds.has(owner)) warnings.push(`${file}: no guide src/content/guides/${owner}.md yet — its records are checked, but nothing cites them`);
  } else if (!TOWN_SLUGS.has(owner)) {
    errors.push(`${file}: the file name must be a NoCo town slug from src/data/territory.mjs (e.g. local/windsor-co.json)`);
    return;
  }
  const whose = dir === GUIDE_LAYER_DIR ? 'a guide' : 'a town';
  for (const rec of records) {
    if (!rec || typeof rec.id !== 'string') continue;
    if (!rec.id.startsWith(`${owner}.`)) {
      errors.push(`${file} ${rec.id}: ids in ${whose}'s own file start with "${owner}." (e.g. "${owner}.${rec.id}") so two writers can never pick the same id`);
    }
    if (dir === LOCAL_LAYER_DIR && Array.isArray(rec.applies_to) && rec.applies_to.length) {
      if (!rec.applies_to.includes(owner)) errors.push(`${file} ${rec.id}: a record in ${owner}'s own file applies to ${owner} — its applies_to is ${JSON.stringify(rec.applies_to)}`);
      else if (rec.applies_to.length > 1) warnings.push(`${file} ${rec.id}: applies to other towns too — a fact shared between towns belongs in a shared layer file`);
    }
  }
}
/** The name check-content.mjs and earlier callers use; it runs every owner rule, guides/ and local/. */
export const checkGuideFile = checkOwnedFile;

/** Guide ids on disk beside a layer directory (src/data/layers → src/content/guides), or null if there are none to compare. */
function guideIdsNear(dir) {
  const g = path.resolve(dir, '../../content/guides');
  return fs.existsSync(g) ? new Set(fs.readdirSync(g).filter((f) => f.endsWith('.md')).map((f) => f.slice(0, -3))) : null;
}

/**
 * Run every rule. `expectFiles` (default true) fails when one of the seven contract files is missing.
 * Returns { errors, warnings, stats, records } and never exits — the CLI below decides the exit code.
 */
export function checkLayers({ dir = LAYER_DIR, today = todayISO(), expectFiles = true, towns = NOCO_TOWNS, guideIds = guideIdsNear(dir) } = {}) {
  const errors = [];
  const warnings = [];
  if (!isValidDate(today)) throw new Error(`today must be YYYY-MM-DD, got ${today}`);
  const { files, errors: loadErrors, warnings: loadWarnings } = loadLayerFiles(dir);
  errors.push(...loadErrors);
  warnings.push(...loadWarnings);
  if (expectFiles) {
    const present = new Set(fs.existsSync(dir) ? fs.readdirSync(dir) : []);
    for (const f of LAYER_FILES) if (!present.has(f)) errors.push(`${f}: missing (docs/CONTRACTS.md lists seven layer files)`);
    for (const f of present) if (f.endsWith('.json') && !LAYER_FILES.includes(f)) warnings.push(`${f}: not one of the contract's layer files`);
  }

  const seen = new Map();
  const records = [];
  for (const { file, records: recs } of files) {
    checkOwnedFile(file, recs, { guideIds, errors, warnings });
    for (const rec of recs) {
      checkRecord(rec, file, { today, errors, warnings });
      if (rec && typeof rec.id === 'string') {
        if (seen.has(rec.id)) errors.push(`${file} ${rec.id}: duplicate id (also in ${seen.get(rec.id)})`);
        else seen.set(rec.id, file);
      }
      records.push({ ...rec, _file: file });
    }
  }

  // coverage: every NoCo town has at least one ordinance record ("*" does not count — it is not a town code)
  const ordinance = records.filter((r) => r.layer === 'ordinance' && Array.isArray(r.applies_to));
  for (const t of towns) {
    const mine = ordinance.filter((r) => r.applies_to.includes(t.slug));
    if (!mine.length) errors.push(`coverage: ${t.slug} has no ordinance record — add the provision, or a VERIFIED "No artificial-turf provision found in the ${t.name} municipal code (searched YYYY-MM-DD)" record`);
    else if (!mine.some((r) => r.status !== 'UNVERIFIED')) warnings.push(`coverage: every ordinance record for ${t.slug} is UNVERIFIED — its page has no code block until one verifies`);
  }
  // softer coverage: the town-specific layers every page draws on ("*" records do not count — they say nothing local)
  for (const layer of COVERAGE_WARN_LAYERS) {
    const recs = records.filter((r) => r.layer === layer && Array.isArray(r.applies_to));
    for (const t of towns) {
      const mine = recs.filter((r) => r.applies_to.includes(t.slug));
      if (!mine.length) warnings.push(`coverage: ${t.slug} has no ${layer} record`);
      else if (!mine.some((r) => r.status !== 'UNVERIFIED')) warnings.push(`coverage: every ${layer} record for ${t.slug} is UNVERIFIED`);
    }
  }

  const byStatus = Object.fromEntries(STATUSES.map((s) => [s, records.filter((r) => r.status === s).length]));
  const upcoming = records.filter((r) => isValidDate(r.recheck) && daysBetween(today, r.recheck) <= 30)
    .map((r) => `${r.recheck} ${r.id}`).sort();
  const guideFiles = files.filter((f) => guideOfFile(f.file)).length;
  const localFiles = files.filter((f) => townOfFile(f.file)).length;
  return { errors, warnings, records, stats: { files: files.length, guideFiles, localFiles, records: records.length, byStatus, upcoming } };
}

function parseArgs(argv) {
  const o = { dir: LAYER_DIR, today: process.env.LAYERS_TODAY || todayISO(), quiet: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--dir') o.dir = path.resolve(argv[++i]);
    else if (a.startsWith('--dir=')) o.dir = path.resolve(a.slice(6));
    else if (a === '--today') o.today = argv[++i];
    else if (a.startsWith('--today=')) o.today = a.slice(8);
    else if (a === '--quiet') o.quiet = true;
  }
  return o;
}

function main() {
  const opts = parseArgs(process.argv.slice(2));
  const { errors, warnings, stats } = checkLayers({ dir: opts.dir, today: opts.today });
  const log = (s) => process.stdout.write(`${s}\n`);
  if (!opts.quiet) for (const w of warnings) log(`! WARN ${w}`);
  for (const e of errors) log(`✗ FAIL ${e}`);
  const s = stats.byStatus;
  const owned = [stats.guideFiles && `${stats.guideFiles} guide-owned`, stats.localFiles && `${stats.localFiles} town-owned`].filter(Boolean);
  log(`check-layers: ${stats.records} records in ${stats.files} files${owned.length ? ` (${owned.join(', ')})` : ''} (VERIFIED ${s.VERIFIED}, EXTERNAL_SOURCE ${s.EXTERNAL_SOURCE}, UNVERIFIED ${s.UNVERIFIED}) · today ${opts.today} · ${errors.length} fail, ${warnings.length} warn`);
  if (stats.upcoming.length && !opts.quiet) log(`re-check within 30 days:\n  ${stats.upcoming.join('\n  ')}`);
  process.exit(errors.length ? 1 : 0);
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) main();
