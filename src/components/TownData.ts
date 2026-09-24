/**
 * Shared helpers for the /areas/ pages and the Town* components (areas builder, 2026-09-24).
 *
 * Every local fact a town page prints comes from src/data/layers/*.json through rec(): only records whose
 * status is VERIFIED or EXTERNAL_SOURCE resolve; UNVERIFIED never renders. The parsers below only re-shape
 * what a record already says (its fact, its verbatim quote, its source label) into a strip, a card or a
 * chart; they never add a number the record does not carry, and a record they can't parse simply renders
 * as its plain fact sentence.
 */
import stateLaw from '../data/layers/state-law.json';
import cityCodes from '../data/layers/city-codes.json';
import water from '../data/layers/water-providers.json';
import rebates from '../data/layers/rebates.json';
import drought from '../data/layers/drought-2026.json';
import climate from '../data/layers/climate.json';
import soil from '../data/layers/soil.json';
import { PHOTOS, type Photo } from '../data/photos';

export type Tier = { label: string; price: number; up_to_gal: number | null };
export type LayerRecord = {
  id: string;
  layer: string;
  applies_to: string[];
  fact: string;
  quote?: string;
  source_url: string;
  source_label: string;
  effective?: string;
  checked: string;
  status: string;
  recheck?: string;
  numbers?: string[];
  provider?: string;
  rates?: { effective?: string; unit?: string; base_monthly: number | null; model?: string; tiers: Tier[] };
};

const ALL = [...stateLaw, ...cityCodes, ...water, ...rebates, ...drought, ...climate, ...soil] as unknown as LayerRecord[];
const BY_ID = new Map(ALL.map((r) => [r.id, r]));
const RENDERABLE = new Set(['VERIFIED', 'EXTERNAL_SOURCE']);

/** A layer record that may render, or null (missing or UNVERIFIED). */
export function rec(id: string): LayerRecord | null {
  const r = BY_ID.get(id);
  return r && RENDERABLE.has(r.status) ? r : null;
}
export const recs = (ids: string[] = []) => [...new Set(ids)].map(rec).filter((r): r is LayerRecord => r !== null);

/** Every renderable record that applies to a town (or to every town). */
export const recordsFor = (slug: string) =>
  ALL.filter((r) => RENDERABLE.has(r.status) && (r.applies_to.includes(slug) || r.applies_to.includes('*')));

/* ── The Colorado backyard-HOA rule: rendered once per page by TownStateRule, never hand-written into blocks
      (docs/CONTRACTS.md "Shared-claim components"). The five core records render on every town page, in the
      same words; the HB21-1229 history line only where a town record references it. */
export const HOA_CORE = ['co-hoa-backyard-detached', 'co-hoa-attached-rear-yard', 'co-hoa-front-yard-designs', 'co-special-district-backyard', 'co-hoa-remedy-notice'];
export const HOA_EXTRA = ['co-hb21-1229-origin'];
export const HOA_FAMILY = new Set([...HOA_CORE, ...HOA_EXTRA]);

/* ── Dates ── */
const D = (ymd: string) => new Date(`${ymd}T12:00:00Z`);
export const fmtDate = (ymd?: string | null) =>
  ymd ? D(ymd).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }) : '';
export const fmtMonth = (ymd?: string | null) =>
  ymd ? D(ymd).toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' }) : '';
/** Position of a date inside its calendar year, 0–1. */
export const yearFrac = (ymd: string) => {
  const d = D(ymd); const y = d.getUTCFullYear();
  const start = Date.UTC(y, 0, 1), end = Date.UTC(y + 1, 0, 1);
  return (d.getTime() - start) / (end - start);
};
export const yearOf = (ymd: string) => Number(ymd.slice(0, 4));

/* ── Citations ── */
const SECTION = '([0-9][0-9A-Za-z.\\-–]*(?:\\([0-9A-Za-z.]+\\))*)';
/** A short citation out of a record: "Sec. 15-3-20(b)(2)" → "§ 15-3-20(b)(2)", "C.R.S. 37-99-103(1)", "SB24-081". */
export function cite(r: Pick<LayerRecord, 'source_label' | 'quote'>): string | null {
  const label = r.source_label;
  const crs = label.match(/C\.R\.S\.\s+([\d.\-–]+(?:\([\w.]+\))*)/);
  if (crs) return `C.R.S. ${crs[1]}`;
  const sec = label.match(new RegExp(`\\bSecs?\\.\\s+${SECTION}`));
  if (sec) return `§ ${sec[1]}`;
  const code = label.match(new RegExp(`\\bCode\\s+${SECTION}`));
  if (code) return `§ ${code[1]}`;
  const ord = label.match(/\bOrdinance\s+(?:No\.\s+)?(\d{3,})/);
  if (ord) return `Ord. ${ord[1]}`;
  const init = label.match(/Initiatives?\s+\((\d+-\d{4})\)/);
  if (init) return `Initiative ${init[1]}`;
  const bill = label.match(/\b([HS]B\d{2}-\d{3,4})\b/);
  if (bill) return bill[1];
  const q = (r.quote ?? '').match(new RegExp(`\\b(?:Section|Sec\\.?)\\s+${SECTION}`));
  if (q) return `§ ${q[1]}`;
  return null;
}
/** The publisher part of a label, for a card that has no section number. */
export const labelHead = (label: string) => label.split(/\s+[—–]\s+|,\s+/)[0];
const MONTH_DATE = /\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{1,2},\s+\d{4}/g;
/** "(codified through Ord. No. 2026-1749, July 13, 2026)" → "July 13, 2026", else null. */
export function codifiedThrough(label: string): string | null {
  const m = label.match(/codified through ([^)]*)\)?/i);
  if (!m) return null;
  const d = m[1].match(MONTH_DATE);
  return d ? d[d.length - 1] : null;
}
const shortMonth = (s: string) => s.replace(/^(\w{3})\w*\.?/, '$1');

/** The status line on a code card. `asOf` is the page's checked date. */
export function codeStatus(r: LayerRecord, asOf: string): { text: string; tone: 'live' | 'pending' | 'future' | 'plain' } {
  if (/-pending$/.test(r.id)) return { text: `Drafted, not adopted · ${fmtDate(r.checked)}`, tone: 'pending' };
  if (r.effective) {
    return r.effective > asOf ? { text: `Takes effect ${fmtDate(r.effective)}`, tone: 'future' } : { text: `In force since ${fmtDate(r.effective)}`, tone: 'live' };
  }
  const c = codifiedThrough(r.source_label);
  if (c) return { text: `Codified through ${shortMonth(c)}`, tone: 'plain' };
  return { text: `Checked ${fmtDate(r.checked)}`, tone: 'plain' };
}

/* ── Watering status (drought layer) ── */
export function droughtPill(r: LayerRecord): { text: string; strong: boolean } {
  const f = r.fact;
  const lvl = f.match(/\b(Level|Stage) (\d)(?: \((\w+)\))?/);
  if (lvl) return { text: `${lvl[1]} ${lvl[2]}${lvl[3] ? ` · ${lvl[3]}` : ''}`, strong: true };
  if (/drought emergency/i.test(f)) return { text: 'Drought emergency', strong: true };
  if (/Water Shortage Watch|\bat Watch\b/.test(f)) return { text: 'Watch', strong: false };
  if (/adequate water year/i.test(f)) return { text: 'Adequate water year', strong: false };
  if (/no mandatory/i.test(f)) return { text: 'No mandatory limits', strong: false };
  if (/Mild Drought Response/i.test(f)) return { text: 'Mild drought response', strong: false };
  if (/standing mandatory|mandatory/i.test(f)) return { text: 'Mandatory', strong: true };
  if (/\bbars\b/i.test(f)) return { text: 'Standing rule', strong: true };
  if (/moved .* to drinking water/i.test(f)) return { text: 'Switched to drinking water', strong: true };
  if (/no 2026 drought stage/i.test(f)) return { text: 'No 2026 stage posted', strong: false };
  if (/quota/i.test(f)) return { text: 'C-BT quota set', strong: false };
  if (/voluntary|guidelines|asks|encourag/i.test(f)) return { text: 'Voluntary', strong: false };
  return { text: 'In effect', strong: false };
}

/* ── Rebates ── */
/** Stamps for a rebate record, each taken from its own fact sentence. */
export function rebateVerdicts(r: LayerRecord): string[] {
  const f = r.fact, out: string[] = [];
  if (/artificial turf is not eligible|excludes artificial turf|may not be used to replace lawn with artificial turf/i.test(f)) out.push('Turf not eligible');
  else if (/does not list artificial turf as eligible/i.test(f)) out.push('Turf not listed');
  else if (/no (?:lawn-replacement or )?turf rebate/i.test(f)) out.push('No turf rebate listed');
  if (/at least 50%|50% (?:plant|living|waterwise)/i.test(f) && !out.length) out.push('Half must be plants');
  if (/program is closed|is closed\b/i.test(f)) out.push('Closed for 2026');
  else if (/is full/i.test(f)) out.push('Full for 2026');
  else if (/stopped taking new 2026 applications/i.test(f)) out.push('Closed for 2026');
  return out;
}
export const programName = (r: LayerRecord) => r.source_label.replace(/\s+program page$/i, '').replace(/\s+page$/i, '');

/* ── Water rates ── */
const gal = (n: number) => n.toLocaleString('en-US');
export const money = (n: number) => {
  const decimals = (String(n).split('.')[1] ?? '').length;
  return `$${n.toFixed(Math.max(2, decimals))}`;
};
/** Rows for a rate ladder, labelled from the record's own thresholds and tier labels. */
export function rateRows(r: LayerRecord) {
  const tiers = r.rates?.tiers ?? [];
  const paren = (s: string) => s.match(/\(([^)]*)\)\s*$/)?.[1] ?? null;
  const shared = tiers.length > 1 && tiers.every((t) => paren(t.label) && paren(t.label) === paren(tiers[0].label)) ? paren(tiers[0].label) : null;
  let prev = 0;
  const rows = tiers.map((t, i) => {
    let label: string;
    if (r.rates?.model === 'water-budget') label = paren(t.label) ?? t.label;
    else if (t.up_to_gal != null) label = i === 0 ? `First ${gal(t.up_to_gal)} gal` : `${gal(prev)}–${gal(t.up_to_gal)} gal`;
    else if (tiers.length > 1 && prev) label = `Over ${gal(prev)} gal`;
    else label = r.rates?.model === 'flat' ? 'Every gallon' : t.label;
    if (t.up_to_gal != null) prev = t.up_to_gal;
    const included = t.price === 0 ? (paren(t.label) ?? 'in the base charge') : null;
    return { label, price: t.price, shown: included ?? money(t.price), included: !!included };
  });
  return { rows, subtitle: shared, base: r.rates?.base_monthly ?? null, model: r.rates?.model ?? '' };
}

/* ── Soil (NRCS SSURGO quote) ── */
export type SoilUnit = { name: string; share: number; lep: number | null; cls: 'high' | 'moderate' | 'low' | 'water' | 'unrated' };
/** Map units from an nrcs-soil-* quote: "Weld loam 46.5% (LEP 7.7, clay 41.5%) · Olney …". */
export function soilUnits(r: LayerRecord): SoilUnit[] {
  const body = (r.quote ?? '').split(/%\):\s+|\):\s+/).slice(1).join(' ') || '';
  return body.split(/\s+·\s+/).map((seg) => {
    const m = seg.trim().match(/^(.+?)\s+(\d+(?:\.\d+)?)%(?:\s+\(LEP\s+(\d+(?:\.\d+)?)(?:,[^)]*)?\))?$/);
    if (!m) return null;
    const lep = m[3] ? Number(m[3]) : null;
    const cls: SoilUnit['cls'] = /^Water$/i.test(m[1]) ? 'water' : lep == null ? 'unrated' : lep >= 6 ? 'high' : lep >= 3 ? 'moderate' : 'low';
    return { name: m[1], share: Number(m[2]), lep, cls };
  }).filter((u): u is SoilUnit => u !== null);
}
export const SOIL_CLASS: Record<SoilUnit['cls'], string> = {
  high: 'High shrink-swell', moderate: 'Moderate shrink-swell', low: 'Low shrink-swell', water: 'Open water', unrated: 'Not rated',
};

/* ── Weather (NOAA normals quote + hail facts) ── */
const NORMALS: Record<string, string> = {
  'ANN-TMAX-AVGNDS-GRTH090': 'days a year at or above 90°F',
  'ANN-TMAX-AVGNDS-GRTH100': 'days a year at or above 100°F',
  'ANN-TMIN-AVGNDS-LSTH032': 'nights a year at or below 32°F',
  'ANN-SNOW-NORMAL': 'inches of snow a year',
  'ANN-PRCP-NORMAL': 'inches of precipitation a year',
};
/** The station's annual normals — only the values the record's own fact sentence states. */
export function normals(r: LayerRecord) {
  const station = r.fact.match(/station(?: to [\w ]+?)?, ([^,]+),/)?.[1] ?? null;
  const metrics = [...(r.quote ?? '').matchAll(/([A-Z]{3}-[A-Z0-9-]+)\s+(\d+(?:\.\d+)?)/g)]
    .filter(([, code, v]) => NORMALS[code] && (r.fact.includes(v) || r.fact.includes(String(Number(v)))))
    .map(([, code, v]) => ({ code, value: r.fact.includes(v) ? v : String(Number(v)), label: NORMALS[code] }));
  const order = Object.keys(NORMALS);
  metrics.sort((a, b) => order.indexOf(a.code) - order.indexOf(b.code));
  return { station, metrics };
}
export const hailSize = (r: LayerRecord) => r.fact.match(/(\d+(?:\.\d+)?)[- ]inch/)?.[1] ?? null;

/* ── Sources as receipts ── */
const normUrl = (u: string) => u.replace(/&amp;/g, '&').replace(/\/$/, '');
/** Index of the "(" that opens the group a trailing ")" closes, or -1. */
function openerOfTrailing(s: string) {
  if (!s.endsWith(')')) return -1;
  let depth = 0;
  for (let i = s.length - 1; i >= 0; i--) {
    if (s[i] === ')') depth++;
    else if (s[i] === '(' && --depth === 0) return i;
  }
  return -1;
}
/** Split at a separator that sits outside every parenthesis. */
function splitTop(s: string, sep: string, once = false) {
  const out: string[] = [];
  let depth = 0, from = 0;
  for (let i = 0; i < s.length; i++) {
    if (s[i] === '(') depth++;
    else if (s[i] === ')') depth--;
    else if (depth === 0 && s.startsWith(sep, i)) {
      out.push(s.slice(from, i)); from = i + sep.length;
      if (once) break;
    }
  }
  out.push(s.slice(from));
  return out.map((x) => x.trim()).filter(Boolean);
}
/** Split a source label into its publisher and the items it vouches for ("X: a; b; c" or "X (a; b)"). */
export function receipt(label: string) {
  let pub = label, sub: string | null = null, rest = '';
  const byColon = splitTop(label, ': ', true);
  if (byColon.length > 1) { [pub, rest] = byColon; }
  else {
    const o = openerOfTrailing(label);
    if (o > 0) { pub = label.slice(0, o).trim(); rest = label.slice(o + 1, -1).trim(); }
  }
  if (rest) {
    const o = openerOfTrailing(rest);
    if (o > 0 && !splitTop(rest.slice(0, o), '; ').slice(1).length) { sub = rest.slice(0, o).trim(); rest = rest.slice(o + 1, -1).trim(); }
  }
  const items = rest ? splitTop(rest, '; ') : [];
  return { pub, sub, items };
}
export function matchSources(urls: string[], sources: { label: string; url: string; checked: string }[]) {
  return [...new Set(urls)].map((u) => {
    const s = sources.find((x) => normUrl(x.url) === normUrl(u));
    return s ?? { label: new URL(u).hostname.replace(/^www\./, ''), url: u, checked: '' };
  });
}

/* ── Geography (Census 2024 Gazetteer points in territory.mjs) ── */
export function miles(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 3958.8, rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad, dLng = (b.lng - a.lng) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
export function compass(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const rad = Math.PI / 180;
  const y = Math.sin((b.lng - a.lng) * rad) * Math.cos(b.lat * rad);
  const x = Math.cos(a.lat * rad) * Math.sin(b.lat * rad) - Math.sin(a.lat * rad) * Math.cos(b.lat * rad) * Math.cos((b.lng - a.lng) * rad);
  const deg = (Math.atan2(y, x) / rad + 360) % 360;
  return ['north', 'northeast', 'east', 'southeast', 'south', 'southwest', 'west', 'northwest'][Math.round(deg / 45) % 8];
}

/* ── Photos: only jobs whose camera original places them in or near the town ── */
const HERO_PHOTO: Record<string, string> = {
  'windsor-co': 'dusk', 'greeley-co': 'side-yard', 'berthoud-co': 'fire-pit', 'mead-co': 'crew', 'firestone-co': 'crew',
};
export function townPhotos(slug: string, name: string): { hero: Photo | null; more: Photo[] } {
  const near = PHOTOS.filter((p) => p.place.includes(name));
  const hero = near.find((p) => p.id === HERO_PHOTO[slug]) ?? null;
  return { hero, more: hero ? near.filter((p) => p.id !== hero.id) : [] };
}

/* ── Words ── */
const WORDS = ['Zero', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen', 'Twenty'];
export const numberWord = (n: number) => WORDS[n] ?? String(n);
export const countyLine = (county: string) => (county.includes('&') ? `${county} counties` : `${county} County`);

/** Block kinds as plan annotations (the TownSheet index and each block's evidence panel). */
export const KIND_LABEL: Record<string, string> = {
  ordinance: 'Town code', utility: 'Water', rebate: 'Rebate', drought: 'Watering', hoa: 'HOA', soil: 'Ground', climate: 'Weather',
  housing: 'Homes', landmark: 'Landmark', golf: 'Golf', job: 'Job', review: 'Review', photo: 'Photo', competitor: 'Market', access: 'Access',
};
export const PANEL_TITLE: Record<string, string> = {
  ordinance: 'The code, word for word', utility: 'Who bills the water', rebate: 'The programs', drought: 'Watering status, 2026',
  hoa: 'On the record', soil: 'Under the lawn', climate: 'The weather it takes', housing: 'From the public record', golf: 'From the public record',
  landmark: 'From the public record',
};
