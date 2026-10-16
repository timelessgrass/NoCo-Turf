#!/usr/bin/env node
/**
 * recheck-sources — re-verify layer records whose `recheck` date is near, the way docs/CONTRACTS.md asks
 * ("re-verify the record, then move the date"). For every record due by --by (default: 14 days out):
 *   - fetch its source_url (HTML → text; a PDF → pdftotext), once per URL
 *   - look for every segment of its verbatim `quote` (segments split on … or ...), comparing letters and digits only,
 *     so markup, bullets, curly quotes and line breaks in the source do not matter
 * and sort it into:
 *   FOUND     every segment is still on the source → with --apply: checked = today, recheck moves on by the
 *             record's own cadence (its old recheck − checked, kept between 30 and 120 days)
 *   DATED     found, but the fact names a date that has now passed → never moved automatically: the copy may need a
 *             tense change ("applications close" → "closed"), so a person rewrites it, then moves the date
 *   CHANGED   the source answered but a segment is gone → a person re-reads the source and rewrites or retires it
 *   NO_FETCH  the source did not answer (blocked, a JS-only page such as Municode, a timeout) → manual re-check
 * Usage:
 *   node scripts/recheck-sources.mjs                    # report what is due in the next 14 days
 *   node scripts/recheck-sources.mjs --by 2026-10-31    # report what is due by a date
 *   node scripts/recheck-sources.mjs --by 2026-10-31 --apply
 * Writes only the "checked" and "recheck" values of FOUND records, in place, leaving each file's formatting alone.
 */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFileSync } from 'node:child_process';
import { LAYER_DIR, todayISO, daysBetween } from './check-layers.mjs';

const args = process.argv.slice(2);
const flag = (name) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : undefined; };
const today = flag('--today') || todayISO();
const addDays = (iso, n) => new Date(Date.parse(`${iso}T12:00:00Z`) + n * 86400000).toISOString().slice(0, 10);
const by = flag('--by') || addDays(today, 14);
const apply = args.includes('--apply');

function layerFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    return e.isDirectory() ? layerFiles(p) : e.name.endsWith('.json') ? [p] : [];
  });
}

const due = [];
for (const file of layerFiles(LAYER_DIR)) {
  const records = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (!Array.isArray(records)) continue;
  for (const r of records) if (r.recheck && r.recheck <= by) due.push({ ...r, file });
}

const squash = (s) => s.normalize('NFKD').toLowerCase().replace(/[^a-z0-9]/g, '');
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15';

/** library.municode.com pages are JavaScript-only; the same text comes from Municode's public content API. */
let muniClients;
async function municodeText(url) {
  const u = new URL(url);
  const [, state, client, kind] = u.pathname.split('/');
  const nodeId = u.searchParams.get('nodeId');
  if (kind !== 'codes' || !nodeId) throw new Error('Municode ordinance-bank page (no API route here)');
  const get = async (p) => { const r = await fetch(`https://api.municode.com${p}`, { signal: AbortSignal.timeout(60000) }); if (!r.ok) throw new Error(`Municode API HTTP ${r.status}`); return r.json(); };
  muniClients ??= {};
  muniClients[state] ??= await get(`/Clients/stateAbbr?stateAbbr=${state}`);
  const c = muniClients[state].find((x) => x.ClientName.toLowerCase().replace(/[^a-z0-9]+/g, '_') === client.toLowerCase());
  if (!c) throw new Error(`Municode client ${client} not found`);
  const { codes = [] } = await get(`/ClientContent/${c.ClientID}`);
  const errors = [];
  for (const code of codes) {
    try {
      const d = await get(`/CodesContent?jobId=&nodeId=${encodeURIComponent(nodeId)}&productId=${code.productId}`);
      const text = (d.Docs || []).map((x) => x.Content || '').join(' ');
      if (text.length > 200) return decodeEntities(text.replace(/<[^>]+>/g, ' '));
    } catch (e) { errors.push(e.message); }
  }
  throw new Error(errors[0] || 'Municode node not found');
}

async function sourceText(url) {
  if (new URL(url).host === 'library.municode.com') return municodeText(url);
  const res = await fetch(url, { headers: { 'user-agent': UA, accept: '*/*' }, redirect: 'follow', signal: AbortSignal.timeout(30000) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const type = res.headers.get('content-type') || '';
  const body = Buffer.from(await res.arrayBuffer());
  if (type.includes('pdf') || body.subarray(0, 5).toString() === '%PDF-') {
    const tmp = path.join(os.tmpdir(), `recheck-${process.pid}-${Math.abs(hash(url))}.pdf`);
    fs.writeFileSync(tmp, body);
    try { return execFileSync('pdftotext', ['-q', tmp, '-'], { maxBuffer: 64 * 1024 * 1024 }).toString(); }
    finally { fs.rmSync(tmp, { force: true }); }
  }
  return decodeEntities(body.toString('utf8').replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ''));
}
/** Entities left as text would add letters ("apos", "rsquo") that squash() keeps, so a word-for-word quote reads as changed. */
const NAMED = { nbsp: ' ', amp: '&', quot: '"', apos: "'", lsquo: "'", rsquo: "'", ldquo: '"', rdquo: '"', ndash: '-', mdash: '-', hellip: '...', lt: '<', gt: '>', bull: ' ', middot: ' ', sect: ' ', deg: ' ' };
function decodeEntities(s) {
  for (let i = 0; i < 2; i++) { // twice, for double-encoded text such as &amp;apos;
    s = s.replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
      .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
      .replace(/&([a-z]+);/gi, (m, n) => NAMED[n.toLowerCase()] ?? ' ');
  }
  return s;
}
function hash(s) { let h = 0; for (const c of s) h = (h * 31 + c.charCodeAt(0)) | 0; return h; }

/** A month-and-day (or ISO) date in the fact that was still ahead when the record was checked and is behind us now:
 *  the copy was written about the future ("applications close October 12") and may now read in the wrong tense.
 *  A date already past at checking time (an effective date, a declaration) is left alone. */
const MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
function passedDateIn(text, checked) {
  const out = [];
  for (const m of text.matchAll(/\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2})(?:st|nd|rd|th)?,?\s*(20\d\d)?/g)) {
    const year = m[3] || today.slice(0, 4);
    const iso = `${year}-${String(MONTHS.indexOf(m[1].toLowerCase()) + 1).padStart(2, '0')}-${m[2].padStart(2, '0')}`;
    if (iso < today && iso > checked) out.push(m[0]);
  }
  for (const m of text.matchAll(/\b(20\d\d-\d\d-\d\d)\b/g)) if (m[1] < today && m[1] > checked) out.push(m[1]);
  return out;
}

const cache = new Map();
const results = [];
const urls = [...new Set(due.map((r) => r.source_url))];
let next = 0;
await Promise.all(Array.from({ length: 6 }, async () => {
  while (next < urls.length) {
    const url = urls[next++];
    try { cache.set(url, { text: squash(await sourceText(url)) }); } catch (e) { cache.set(url, { error: String(e.message || e) }); }
  }
}));

for (const r of due) {
  const src = cache.get(r.source_url);
  const segments = r.quote.split(/…|\.\.\./).map(squash).filter((s) => s.length >= 12);
  let verdict, detail = '';
  if (src.error || !src.text || src.text.length < 200) { verdict = 'NO_FETCH'; detail = src.error || 'no readable text'; }
  else {
    const missing = segments.filter((s) => !src.text.includes(s));
    if (missing.length) { verdict = 'CHANGED'; detail = `${missing.length}/${segments.length} quote segment(s) not on the source`; }
    else {
      const dates = passedDateIn(r.fact, r.checked);
      verdict = dates.length ? 'DATED' : 'FOUND';
      if (dates.length) detail = `fact names ${dates.join(', ')}`;
    }
  }
  results.push({ ...r, verdict, detail });
}

const order = ['CHANGED', 'DATED', 'NO_FETCH', 'FOUND'];
results.sort((a, b) => order.indexOf(a.verdict) - order.indexOf(b.verdict) || a.recheck.localeCompare(b.recheck));
for (const r of results) {
  if (r.verdict === 'FOUND' && !args.includes('--verbose')) continue;
  console.log(`${r.verdict.padEnd(8)} ${r.recheck} ${r.id}  ${r.detail}\n         ${path.relative(LAYER_DIR, r.file)} · ${r.source_url}`);
}

let written = 0;
if (apply) {
  const byFile = new Map();
  for (const r of results.filter((x) => x.verdict === 'FOUND')) (byFile.get(r.file) ?? byFile.set(r.file, []).get(r.file)).push(r);
  for (const [file, recs] of byFile) {
    let text = fs.readFileSync(file, 'utf8');
    for (const r of recs) {
      const start = text.indexOf(`"id": "${r.id}"`);
      if (start < 0) continue;
      const after = text.indexOf('"id": "', start + 7);
      const end = after < 0 ? text.length : after;
      const cadence = Math.min(120, Math.max(30, daysBetween(r.checked, r.recheck)));
      const span = text.slice(start, end)
        .replace(/("checked":\s*")\d{4}-\d\d-\d\d(")/, `$1${today}$2`)
        .replace(/("recheck":\s*")\d{4}-\d\d-\d\d(")/, `$1${addDays(today, cadence)}$2`);
      text = text.slice(0, start) + span + text.slice(end);
      written++;
    }
    fs.writeFileSync(file, text);
  }
}

const count = (v) => results.filter((r) => r.verdict === v).length;
console.log(`\nrecheck-sources: ${results.length} record(s) due by ${by} from ${urls.length} source(s) · today ${today} · ` +
  `FOUND ${count('FOUND')} · DATED ${count('DATED')} · CHANGED ${count('CHANGED')} · NO_FETCH ${count('NO_FETCH')}` +
  (apply ? ` · moved ${written}` : ' · report only (add --apply to move FOUND records)'));
