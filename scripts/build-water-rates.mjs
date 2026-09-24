#!/usr/bin/env node
/**
 * Builds the NoCo water-rates dataset and the water-savings guide's static table from the rate
 * records in src/data/layers/water-providers.json. Node ESM, no dependencies.
 *
 *   node scripts/build-water-rates.mjs           # write the CSV, the guide table and the dataset source label
 *   node scripts/build-water-rates.mjs --check   # write nothing; exit 1 if any output is stale
 *   node scripts/build-water-rates.mjs --stdout  # print the CSV and the table, write nothing
 *
 * Outputs
 *   public/data/noco-water-rates-2026.csv  — CC BY 4.0. The first nine columns are the contract
 *     (provider, towns, model, effective, unit, base_monthly, marginal_price, source_url, checked);
 *     the rest carry the top tier, the derived gallons and dollars, the layer id and notes.
 *   src/content/guides/water-savings.md    — the table between
 *     <!-- build-water-rates:table:start --> and <!-- build-water-rates:table:end -->, and the dataset
 *     source entry between "# build-water-rates:source:start" and "# build-water-rates:source:end" in
 *     the frontmatter. scripts/check-content.mjs traces every number in a guide to a referenced layer
 *     record or to the guide's own source labels; the derived figures (gallons, dollars a year) exist
 *     in no layer record, so this script writes them into the dataset source's label. Change the
 *     method here, never by hand in the guide.
 *
 * Method (docs/GUIDES.md)
 *   gallons a year per 1,000 sq ft = IRRIGATION_IN × 1,000 × 144 ÷ 231
 *     IRRIGATION_IN = 24: CSU Extension, CMG GardenNotes #564 (Koski) — Kentucky bluegrass needs "24
 *     inches" of supplemental irrigation in a normal precipitation year along the Front Range.
 *     144 ÷ 231: one inch of water on a square foot is 144 cubic inches; a US gallon is 231 cubic inches
 *     (NIST Handbook 44, Appendix C).
 *   dollars a year = gallons ÷ 1,000 × the provider's price per 1,000 gallons, rounded to whole dollars.
 *   The saved water comes off the top of a bill, so its value depends on the tier a home's summer bills
 *   reach. Each row brackets it: marginal_price is the LOWEST rate the saved water can be billed at (the
 *   first priced tier; gallons bundled into a base charge are skipped) and marginal_price_top the HIGHEST.
 *   Water-budget rates (Greeley) use Tier 1 (within budget) and the top tier. No sewer, no base charge.
 *
 * Only VERIFIED and EXTERNAL_SOURCE records are used (UNVERIFIED never renders). A missing record, a
 * missing rates object or a quote that no longer carries the figure this script relies on stops the run.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { NOCO_TOWNS } from '../src/data/territory.mjs';

export const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const LAYER_FILE = path.join(REPO, 'src/data/layers/water-providers.json');
const CSV_FILE = path.join(REPO, 'public/data/noco-water-rates-2026.csv');
const GUIDE_FILE = path.join(REPO, 'src/content/guides/water-savings.md');
const DATASET_URL = 'https://www.nocoturf.com/data/noco-water-rates-2026.csv';

// ───────────────────────────── the method ─────────────────────────────

/** CSU Extension, CMG GardenNotes #564 Fine Fescues for Lawns (Tony Koski), checked 2026-09-24:
 *  "Fine fescue will require 18-20 inches of supplemental irrigation (compared to 24 inches for bluegrass)
 *  in a normal precipitation year (10-11 inches, April to October) along the Front Range". */
export const IRRIGATION_IN = 24;
export const IRRIGATION_SOURCE = 'https://cmg.extension.colostate.edu/Gardennotes/564.pdf';
/** NIST Handbook 44 (2026), Appendix C: "1 gallon (gal) = 231 cubic inches". */
export const CUBIC_INCHES_PER_GALLON = 231;
const CUBIC_INCHES_PER_SQFT_INCH = 144;
/** Gallons in one inch of water over one square foot (0.6234). */
export const GAL_PER_SQFT_INCH = CUBIC_INCHES_PER_SQFT_INCH / CUBIC_INCHES_PER_GALLON;
/** Gallons a year per square foot of bluegrass (14.961). */
export const GAL_PER_SQFT_YEAR = IRRIGATION_IN * GAL_PER_SQFT_INCH;
/** Gallons a year per 1,000 sq ft of bluegrass (14,961). */
export const GAL_PER_1000_SQFT = Math.round(GAL_PER_SQFT_YEAR * 1000);

const RENDERABLE = new Set(['VERIFIED', 'EXTERNAL_SOURCE']);

/**
 * Table rows, in order. `label` is what a reader sees on the bill; `set` names a rate set when one
 * provider publishes two; `served` says who pays these rates (the bill decides, not the town);
 * `billing` describes the structure. `requireInQuote` guards the figures this script reads from a quote.
 */
const ROWS = [
  { id: 'fcu-residential-rates-2026', label: 'Fort Collins Utilities', short: 'Fort Collins Utilities',
    served: 'Fort Collins (city utility customers)', billing: 'Base charge plus 3 tiers' },
  { id: 'fclwd-rates-2026-non-city-iga', label: 'Fort Collins-Loveland Water District', short: 'FCLWD', set: 'most homes (Non-City IGA)',
    served: 'Parts of Fort Collins, Loveland, Timnath and Windsor', billing: 'Base charge plus 4 tiers' },
  { id: 'fclwd-rates-2026-city-iga', label: 'Fort Collins-Loveland Water District', short: 'FCLWD City IGA', set: 'City IGA taps',
    served: 'FCLWD taps under the City of Fort Collins IGA', billing: 'Base charge plus 4 tiers' },
  { id: 'nwcwd-rates-2026', label: 'North Weld County Water District', short: 'NWCWD',
    served: 'Homes NWCWD bills directly, including north Windsor, north Greeley and some of eastern Fort Collins', billing: 'First 6,000 gal in the monthly charge, then one rate',
    lowSkipsBundled: true },
  { id: 'greeley-water-budget-rates-2026', label: 'Greeley Water & Sewer', short: 'Greeley',
    served: 'Greeley, single-family inside city limits', billing: 'Water budget, 4 tiers' },
  { id: 'windsor-rates-2026', label: 'Town of Windsor', short: 'Windsor',
    served: 'Windsor (Town water customers)', billing: 'Base charge plus 3 tiers' },
  { id: 'raindance-nonpotable-irrigation', label: 'RainDance Metropolitan District', short: 'RainDance',
    served: 'RainDance in Windsor (non-potable irrigation water)', billing: 'One rate plus an annual capital fee' },
  { id: 'loveland-rates-2026', label: 'City of Loveland Utilities', short: 'Loveland',
    served: 'Loveland, single-family inside city', billing: 'One rate, no tiers' },
  { id: 'longmont-rates-2026', label: 'City of Longmont', short: 'Longmont',
    served: 'Longmont, inside city limits', billing: 'Base charge plus 4 blocks' },
  { id: 'ltwd-rates-2026-standard-tap', label: 'Little Thompson Water District', short: 'Little Thompson', set: 'standard 5/8-inch tap',
    served: 'Mead, Barefoot Lakes in Firestone, some Berthoud-area addresses', billing: 'Base charge plus 5 tiers and an annual allotment',
    overage: { id: 'ltwd-allotment-overage-2026', price: 10, requireInQuote: '$10.00' } },
  { id: 'elco-rates-not-published', label: 'East Larimer County Water District (ELCO)', short: 'ELCO',
    served: 'North and east of Fort Collins', billing: 'Annual allotment by lot size; usage rates not published',
    conservation: { price: 5.61, requireInQuote: '$5.61' } },
];

// ───────────────────────────── helpers ─────────────────────────────

const townName = Object.fromEntries(NOCO_TOWNS.map((t) => [t.slug, t.name]));
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** A price as the source prints it: at least two decimals, never trailing noise (11.5 → "11.50", 3.574 → "3.574"). */
export function fmtPrice(n) {
  const s = String(n);
  const dec = s.includes('.') ? s.split('.')[1].length : 0;
  return n.toFixed(Math.max(2, dec));
}
const fmtInt = (n) => Math.round(n).toLocaleString('en-US');
export const dollarsPerYear = (price) => Math.round((price * GAL_PER_1000_SQFT) / 1000);
function fmtDate(ymd) {
  const [y, m, d] = ymd.split('-').map(Number);
  return `${MONTHS[m - 1]} ${d}, ${y}`;
}
function csvCell(v) {
  if (v === null || v === undefined) return '';
  const s = String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
const range = (a, b, fmt = (x) => x) => (a === b ? fmt(a) : `${fmt(a)} to ${fmt(b)}`);

// ───────────────────────────── build ─────────────────────────────

export function loadRecords(file = LAYER_FILE) {
  const recs = JSON.parse(fs.readFileSync(file, 'utf8'));
  return new Map(recs.map((r) => [r.id, r]));
}

export function buildRows(byId) {
  const problems = [];
  const rows = [];
  for (const cfg of ROWS) {
    const rec = byId.get(cfg.id);
    if (!rec) { problems.push(`${cfg.id}: not in water-providers.json`); continue; }
    if (!RENDERABLE.has(rec.status)) { problems.push(`${cfg.id}: status ${rec.status} never renders`); continue; }
    const rates = rec.rates;
    if (!rates) { problems.push(`${cfg.id}: no rates object`); continue; }
    const priced = (rates.tiers ?? []).filter((t) => typeof t.price === 'number' && (!cfg.lowSkipsBundled || t.price > 0));
    const low = priced.length ? priced[0].price : null;
    const top = priced.length ? priced[priced.length - 1].price : null;
    const row = {
      id: cfg.id, cfg, rec,
      provider: cfg.set ? `${cfg.label}, ${cfg.set}` : cfg.label,
      towns: rec.applies_to.map((s) => townName[s] ?? s),
      model: rates.model,
      effective: rates.effective,
      unit: rates.unit,
      base: rates.base_monthly,
      low, top,
      lowTier: priced[0]?.label ?? null,
      topTier: priced[priced.length - 1]?.label ?? null,
      usdLow: low === null ? null : dollarsPerYear(low),
      usdTop: top === null ? null : dollarsPerYear(top),
      extras: [],
      layerIds: [cfg.id],
    };
    if (cfg.overage) {
      const o = byId.get(cfg.overage.id);
      if (!o || !RENDERABLE.has(o.status)) problems.push(`${cfg.overage.id}: missing or not renderable`);
      else if (!String(o.quote).includes(cfg.overage.requireInQuote)) problems.push(`${cfg.overage.id}: quote no longer carries ${cfg.overage.requireInQuote}`);
      else { row.overage = cfg.overage.price; row.usdOverage = dollarsPerYear(cfg.overage.price); row.layerIds.push(o.id); }
    }
    if (cfg.conservation) {
      if (!String(rec.quote).includes(cfg.conservation.requireInQuote)) problems.push(`${cfg.id}: quote no longer carries ${cfg.conservation.requireInQuote}`);
      else row.conservation = cfg.conservation.price;
    }
    rows.push(row);
  }
  return { rows, problems };
}

export function toCsv(rows) {
  const head = ['provider', 'towns', 'model', 'effective', 'unit', 'base_monthly', 'marginal_price', 'source_url', 'checked',
    'marginal_price_top', 'marginal_basis', 'gal_saved_per_1000_sqft_yr', 'usd_per_1000_sqft_yr_low', 'usd_per_1000_sqft_yr_top',
    'extra_charge_per_1000_gal', 'served', 'layer_id', 'status', 'reachable', 'notes'];
  const lines = [head.join(',')];
  for (const r of rows) {
    const notes = [];
    if (r.overage) notes.push(`Above the annual allotment a standard 5/8-inch tap pays ${fmtPrice(r.overage)} more per 1,000 gal (${r.usdOverage} a year more per 1,000 sq ft); other residential taps pay 20.00 more.`);
    if (r.conservation) notes.push(`Usage rates are not published online; above the annual allotment a conservation charge adds ${fmtPrice(r.conservation)} per 1,000 gal.`);
    if (r.model === 'water-budget') notes.push('Tiers are shares of a household water budget (Tier 1 = within budget); the budget formula is not published in the rate manual.');
    if (r.id === 'nwcwd-rates-2026') notes.push('The first 6,000 gal a month are inside the monthly charge; town-billed customers (Eaton, Severance systems) pay their town\'s rates.');
    if (r.id === 'raindance-nonpotable-irrigation') notes.push('Non-potable irrigation water; the annual capital fee (277.68 per unit) is billed once a season and does not change with use.');
    if (r.id === 'nwcwd-rates-2026') notes.push('Effective date is the newsletter month; the newsletter says the rates are currently in effect.');
    lines.push([
      r.provider, r.towns.join('; '), r.model, r.effective, r.unit, r.base ?? '', r.low ?? '', r.rec.source_url, r.rec.checked,
      r.top ?? '', r.low === null ? 'usage rates not published' : r.lowTier === r.topTier ? `one priced rate: ${r.lowTier}` : `lowest priced tier: ${r.lowTier}; top tier: ${r.topTier}`,
      r.low === null ? '' : GAL_PER_1000_SQFT, r.usdLow ?? '', r.usdTop ?? '',
      r.overage ?? r.conservation ?? '', r.cfg.served, r.layerIds.join(' '), r.rec.status, r.rec.reachable, notes.join(' '),
    ].map(csvCell).join(','));
  }
  return `${lines.join('\n')}\n`;
}

/** The Markdown table the guide shows to readers without JavaScript and to answer engines. */
export function toTable(rows) {
  const out = [
    '| Provider (the name on your bill) | Who pays these rates | How it bills | Effective | Rate on the water you stop using, per 1,000 gal | 1,000 sq ft of bluegrass, US dollars a year |',
    '|---|---|---|---|---|---|',
  ];
  for (const r of rows) {
    let rate, value;
    if (r.low === null) {
      rate = `Not published online${r.conservation ? `; +$${fmtPrice(r.conservation)} above your allotment` : ''}`;
      value = 'Use the rate on your bill × 14.961';
    } else {
      rate = range(r.low, r.top, (x) => `$${fmtPrice(x)}`);
      value = range(r.usdLow, r.usdTop);
      if (r.overage) { rate += `; +$${fmtPrice(r.overage)} above your annual allotment`; value += `; ${r.usdOverage} more above the allotment`; }
    }
    const eff = r.id === 'nwcwd-rates-2026' ? 'In effect May 2026' : fmtDate(r.effective);
    out.push(`| ${r.provider} | ${r.cfg.served} | ${r.cfg.billing} | ${eff} | ${rate} | ${value} |`);
  }
  return out.join('\n');
}

/** The dataset source label: the derived numbers the guide prints, so check-content can trace them. */
export function toSourceLabel(rows) {
  const parts = rows.filter((r) => r.low !== null).map((r) => {
    let s = `${r.cfg.short} ${range(r.usdLow, r.usdTop, (x) => String(x)).replace(' to ', '–')}`;
    if (r.overage) s += ` (+${r.usdOverage} above the allotment)`;
    return s;
  });
  const all = rows.filter((r) => r.low !== null).flatMap((r) => [r.usdLow, r.usdTop]);
  return `NoCo Turf Co. water-rates dataset 2026 (CSV, CC BY 4.0), derived by scripts/build-water-rates.mjs: ${IRRIGATION_IN} in × ${CUBIC_INCHES_PER_SQFT_INCH} cu in ÷ ${CUBIC_INCHES_PER_GALLON} = ${GAL_PER_SQFT_YEAR.toFixed(3)} gal per sq ft (${GAL_PER_SQFT_INCH.toFixed(3)} gal per inch), ${fmtInt(GAL_PER_1000_SQFT)} gal a year per 1,000 sq ft; US dollars a year per 1,000 sq ft, ${Math.min(...all)} to ${Math.max(...all)}: ${parts.join('; ')}`;
}

function replaceBetween(text, start, end, body, file) {
  const i = text.indexOf(start);
  const j = text.indexOf(end);
  if (i < 0 || j < 0 || j < i) throw new Error(`${path.relative(REPO, file)}: markers "${start}" … "${end}" not found`);
  return text.slice(0, i + start.length) + body + text.slice(j);
}

export function renderGuide(guideText, rows, checked) {
  let t = replaceBetween(guideText, '<!-- build-water-rates:table:start -->', '<!-- build-water-rates:table:end -->', `\n\n${toTable(rows)}\n\n`, GUIDE_FILE);
  const label = toSourceLabel(rows).replace(/"/g, '\\"');
  const entry = `\n  - label: "${label}"\n    url: "${DATASET_URL}"\n    checked: "${checked}"\n  `;
  t = replaceBetween(t, '# build-water-rates:source:start', '# build-water-rates:source:end', entry, GUIDE_FILE);
  return t;
}

// ───────────────────────────── the run ─────────────────────────────

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const args = new Set(process.argv.slice(2));
  const byId = loadRecords();
  const { rows, problems } = buildRows(byId);
  if (problems.length) {
    for (const p of problems) console.error(`x ${p}`);
    process.exit(1);
  }
  const checked = rows.map((r) => r.rec.checked).sort().at(-1);
  const csv = toCsv(rows);
  const guideBefore = fs.existsSync(GUIDE_FILE) ? fs.readFileSync(GUIDE_FILE, 'utf8') : null;
  const guideAfter = guideBefore === null ? null : renderGuide(guideBefore, rows, checked);

  // The guide must reference every layer record the table uses, so check-content traces its numbers.
  if (guideAfter) {
    const refs = new Set([...guideAfter.matchAll(/^\s*-\s*["']?([a-z0-9.-]+)["']?\s*$/gm)].map((m) => m[1]));
    const missing = rows.flatMap((r) => r.layerIds).filter((id) => !refs.has(id));
    if (missing.length) console.warn(`! water-savings.md layerRefs is missing: ${[...new Set(missing)].join(', ')}`);
  }

  if (args.has('--stdout')) {
    process.stdout.write(csv);
    console.log(`\n${toTable(rows)}\n\n${toSourceLabel(rows)}`);
    process.exit(0);
  }
  const csvBefore = fs.existsSync(CSV_FILE) ? fs.readFileSync(CSV_FILE, 'utf8') : null;
  if (args.has('--check')) {
    const stale = [];
    if (csvBefore !== csv) stale.push(path.relative(REPO, CSV_FILE));
    if (guideBefore === null) stale.push(`${path.relative(REPO, GUIDE_FILE)} (missing)`);
    else if (guideAfter !== guideBefore) stale.push(path.relative(REPO, GUIDE_FILE));
    if (stale.length) { console.error(`x stale — run node scripts/build-water-rates.mjs: ${stale.join(', ')}`); process.exit(1); }
    console.log(`ok water-rates outputs are current (${rows.length} rows)`);
    process.exit(0);
  }
  fs.mkdirSync(path.dirname(CSV_FILE), { recursive: true });
  fs.writeFileSync(CSV_FILE, csv);
  console.log(`wrote ${path.relative(REPO, CSV_FILE)} (${rows.length} rows)`);
  if (guideAfter === null) console.warn(`! ${path.relative(REPO, GUIDE_FILE)} does not exist — table and source label not written`);
  else if (guideAfter !== guideBefore) { fs.writeFileSync(GUIDE_FILE, guideAfter); console.log(`updated ${path.relative(REPO, GUIDE_FILE)} (table + dataset source label)`); }
  else console.log(`${path.relative(REPO, GUIDE_FILE)} already current`);
  console.log(`method: ${IRRIGATION_IN} in × 144 ÷ 231 = ${GAL_PER_SQFT_YEAR.toFixed(3)} gal/sq ft/yr → ${fmtInt(GAL_PER_1000_SQFT)} gal per 1,000 sq ft`);
}
