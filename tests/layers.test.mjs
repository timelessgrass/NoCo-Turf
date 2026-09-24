/**
 * The shared data layer (src/data/layers/*.json) and its gate, scripts/check-layers.mjs.
 * Contract: docs/CONTRACTS.md ("Data layer"). Every fact a town page, guide or tool shows about law,
 * water, drought, climate or soil comes from these records, so one stale or unsourced record is a
 * false claim on many pages at once.
 *
 * Two kinds of test:
 *   1. the shipped records pass the gate — pinned to their check date, and again for real today via the
 *      CLI exactly as `prebuild` runs it. If only the second fails, a `recheck` date has passed or a
 *      `checked` date aged out: re-verify those records at the source, then move `checked`/`recheck` on.
 *   2. fixtures prove each rule fails (or warns) when it should.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { NOCO_TOWNS, TIMELESS_TOWNS } from '../src/data/territory.mjs';
import {
  checkLayers, numericTokens, normalizeNumber, daysBetween, LAYER_DIR, LAYER_FILES,
} from '../scripts/check-layers.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CHECKED_ON = '2026-09-24'; // the date the shipped records were verified

const shipped = () => {
  const out = [];
  for (const f of LAYER_FILES) for (const r of JSON.parse(fs.readFileSync(path.join(LAYER_DIR, f), 'utf8'))) out.push({ ...r, _file: f });
  return out;
};

// ───────────────────────────── the shipped layer ─────────────────────────────

test('the shipped layer passes the gate as of its check date', () => {
  const { errors, stats } = checkLayers({ today: CHECKED_ON });
  assert.deepEqual(errors, [], errors.join('\n'));
  assert.equal(stats.files, LAYER_FILES.length);
  assert.ok(stats.records > 100, `only ${stats.records} records`);
});

test('the shipped layer passes the gate today (the CLI, exactly as prebuild runs it)', () => {
  const r = spawnSync(process.execPath, [path.join(ROOT, 'scripts/check-layers.mjs'), '--quiet'], { encoding: 'utf8' });
  assert.equal(r.status, 0, `check-layers failed — re-verify the records below at their sources, then update checked/recheck:\n${r.stdout}${r.stderr}`);
});

test('every NoCo town has an ordinance record, and every town has local drought, utility, climate and soil records', () => {
  const recs = shipped();
  for (const t of NOCO_TOWNS) {
    for (const layer of ['ordinance', 'drought', 'utility', 'climate', 'soil']) {
      const mine = recs.filter((r) => r.layer === layer && r.applies_to.includes(t.slug));
      assert.ok(mine.length, `${t.slug} has no ${layer} record`);
    }
  }
});

test('the state layer applies to every town and every record carries a real, primary-looking source', () => {
  const recs = shipped();
  for (const r of recs.filter((x) => x._file === 'state-law.json')) {
    assert.deepEqual(r.applies_to, ['*'], `${r.id}: state law applies to every town`);
    assert.equal(r.layer, 'state', r.id);
  }
  for (const r of recs) {
    assert.match(r.source_url, /^https:\/\//, r.id);
    assert.doesNotMatch(r.source_url, /example\.(com|gov|org)/, `${r.id}: placeholder source`);
    assert.ok(r.quote.trim().length >= 20, `${r.id}: quote too thin to be the operative sentence`);
  }
});

test('the required state-law records are present (HOA backyard, attached-home rule, SB24-005 as narrowed, PFAS, grant bar)', () => {
  const ids = new Set(shipped().map((r) => r.id));
  for (const id of [
    'co-hoa-backyard-detached', 'co-hoa-front-yard-designs', 'co-hoa-remedy-notice', 'co-hoa-attached-rear-yard',
    'co-special-district-backyard', 'co-sb24-005-nonfunctional-ban', 'co-sb24-005-applicable-property',
    'co-hb25-1113-functional-turf', 'co-hb25-1113-multifamily-2028', 'co-sb24-081-pfas-turf',
    'co-turf-grant-no-artificial-turf', 'co-cwcb-turf-grant-closed',
  ]) assert.ok(ids.has(id), `missing ${id}`);
  const hoa = shipped().find((r) => r.id === 'co-hoa-remedy-notice');
  for (const n of ['45', '500']) assert.ok(hoa.numbers.includes(n), `remedy record must carry ${n}`);
});

test('no shipped record serves a TIMELESS town, names Denver, or carries a TIMELESS phone', () => {
  const timeless = new Set(TIMELESS_TOWNS.map((t) => `${t.toLowerCase().replace(/[^a-z]+/g, '-')}-co`));
  for (const r of shipped()) {
    for (const s of r.applies_to) assert.ok(!timeless.has(s), `${r.id} applies to ${s}`);
    const pub = [r.fact, r.quote, r.source_label, r.provider ?? ''].join(' ');
    assert.doesNotMatch(pub, /\bDenver\b|\bTimeless\b/i, r.id);
    assert.doesNotMatch(JSON.stringify(r), /303\D{0,3}349\D{0,3}2368|854\D{0,3}204\D{0,3}9227/, r.id);
    for (const name of TIMELESS_TOWNS) {
      assert.doesNotMatch(r.fact, new RegExp(`(?<![A-Za-z])${name}(?![A-Za-z])(?!\\s+County)`), `${r.id}: fact names ${name}`);
    }
  }
});

test('records that cannot render, or whose source blocks bots, say why in notes', () => {
  for (const r of shipped()) {
    if (r.status !== 'VERIFIED') assert.ok(r.notes && r.notes.length > 20, `${r.id} is ${r.status} with no note saying why`);
    if (r.reachable === false) assert.ok(r.notes && r.notes.length > 20, `${r.id} is unreachable with no note on how it was read`);
  }
});

test('volatile records (drought, pending ordinances) carry a recheck date within a quarter', () => {
  for (const r of shipped()) {
    if (r.layer !== 'drought' || r.status === 'UNVERIFIED') continue;
    assert.ok(r.recheck, `${r.id}: a drought record needs a recheck date`);
    assert.ok(daysBetween(r.checked, r.recheck) <= 210, `${r.id}: recheck ${r.recheck} is too far out for a drought stage`);
  }
  const greeley = shipped().find((r) => r.id === 'greeley-initiative-11-2023-pending');
  assert.ok(greeley && greeley.recheck && greeley.recheck <= '2026-10-31', 'Greeley\'s pending turf ordinance must be re-checked after the Oct 13, 2026 Planning Commission');
});

test('water-provider rate tiers are ordered and every rate record names its provider', () => {
  for (const r of shipped().filter((x) => x._file === 'water-providers.json')) {
    assert.ok(r.provider, r.id);
    if (!r.rates) continue;
    const caps = r.rates.tiers.map((t) => t.up_to_gal);
    caps.slice(0, -1).forEach((c, i) => { if (c !== null && caps[i + 1] !== null) assert.ok(caps[i + 1] > c, `${r.id}: tiers out of order`); });
    if (r.rates.model === 'tiered' && r.rates.tiers.length) assert.equal(caps.at(-1), null, `${r.id}: the top tier should be open-ended`);
  }
});

// ───────────────────────────── the rules, on fixtures ─────────────────────────────

const TODAY = '2026-09-24';
const base = (over = {}) => ({
  id: 'fixture-a', layer: 'ordinance', applies_to: ['windsor-co'],
  fact: 'Windsor requires at least 25% of each front yard to be landscaped.',
  quote: 'a minimum of twenty-five percent (25%) of all front yards shall be landscaped.',
  source_url: 'https://example.gov/windsor/15-3-10', source_label: 'Windsor Code 15-3-10',
  checked: TODAY, reachable: true, status: 'VERIFIED', numbers: ['25'], ...over,
});

function run(files, opts = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'layers-'));
  try {
    for (const [f, data] of Object.entries(files)) fs.writeFileSync(path.join(dir, f), typeof data === 'string' ? data : JSON.stringify(data));
    return checkLayers({ dir, today: TODAY, expectFiles: false, towns: [], ...opts });
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}
const failsWith = (res, re) => assert.ok(res.errors.some((e) => re.test(e)), `expected a FAIL matching ${re}, got:\n${res.errors.join('\n') || '(none)'}`);
const warnsWith = (res, re) => assert.ok(res.warnings.some((e) => re.test(e)), `expected a WARN matching ${re}, got:\n${res.warnings.join('\n') || '(none)'}`);

test('a valid record passes', () => {
  const res = run({ 'city-codes.json': [base()] });
  assert.deepEqual(res.errors, []);
});

test('a missing required field fails', () => {
  for (const k of ['id', 'layer', 'applies_to', 'fact', 'quote', 'source_url', 'source_label', 'checked', 'reachable', 'status', 'numbers']) {
    const rec = base(); delete rec[k];
    failsWith(run({ 'city-codes.json': [rec] }), new RegExp(`missing field "${k}"`));
  }
});

test('a file that is not a JSON array, or not JSON at all, fails', () => {
  failsWith(run({ 'soil.json': { id: 'x' } }), /must be a JSON array/);
  failsWith(run({ 'soil.json': '[{' }), /not valid JSON/);
});

test('a duplicate id fails, even across files', () => {
  failsWith(run({ 'city-codes.json': [base()], 'soil.json': [base({ layer: 'soil' })] }), /duplicate id/);
});

test('an applies_to slug outside territory.mjs fails (a TIMELESS town included), and "*" must stand alone', () => {
  failsWith(run({ 'city-codes.json': [base({ applies_to: ['erie-co'] })] }), /"erie-co" is not a NoCo town/);
  failsWith(run({ 'city-codes.json': [base({ applies_to: ['*', 'windsor-co'] })] }), /"\*" must stand alone/);
  failsWith(run({ 'city-codes.json': [base({ applies_to: [] })] }), /non-empty array/);
});

test('checked older than 365 days fails, older than 180 warns, in the future fails', () => {
  failsWith(run({ 'city-codes.json': [base({ checked: '2025-09-01' })] }), /days old \(> 365\)/);
  const mid = run({ 'city-codes.json': [base({ checked: '2026-02-01' })] });
  assert.deepEqual(mid.errors, []);
  warnsWith(mid, /days old \(> 180\)/);
  failsWith(run({ 'city-codes.json': [base({ checked: '2026-09-25' })] }), /in the future/);
  failsWith(run({ 'city-codes.json': [base({ checked: '2026-02-30' })] }), /real YYYY-MM-DD/);
});

test('a recheck date in the past fails; today or later passes', () => {
  failsWith(run({ 'city-codes.json': [base({ recheck: '2026-09-23' })] }), /recheck 2026-09-23 has passed/);
  assert.deepEqual(run({ 'city-codes.json': [base({ recheck: TODAY })] }).errors, []);
  assert.deepEqual(run({ 'city-codes.json': [base({ recheck: '2026-10-14' })] }).errors, []);
});

test('a source_url that is not https fails', () => {
  failsWith(run({ 'city-codes.json': [base({ source_url: 'http://example.gov/rule' })] }), /must be an https URL/);
  failsWith(run({ 'city-codes.json': [base({ source_url: 'not a url' })] }), /must be an https URL/);
});

test('bad enums fail: layer, status, reachable', () => {
  failsWith(run({ 'city-codes.json': [base({ layer: 'code' })] }), /layer "code"/);
  failsWith(run({ 'city-codes.json': [base({ status: 'INFERENCE' })] }), /status "INFERENCE"/);
  failsWith(run({ 'city-codes.json': [base({ reachable: 'yes' })] }), /reachable must be true or false/);
  failsWith(run({ 'city-codes.json': [base({ id: 'Bad_Id' })] }), /kebab-case/);
});

test('a number used in the fact or quote but missing from numbers fails; normalized forms count', () => {
  failsWith(run({ 'city-codes.json': [base({ numbers: [] })] }), /not listed in "numbers": 25/);
  const money = base({ fact: 'The rebate pays up to $2,000 per account.', quote: 'The maximum rebate amount is $2,000 per water account per year.', numbers: ['$2,000'] });
  assert.deepEqual(run({ 'rebates.json': [{ ...money, layer: 'rebate' }] }).errors, []);
  warnsWith(run({ 'city-codes.json': [base({ numbers: ['25', '99'] })] }), /appear nowhere in the record: 99/);
});

test('water-providers records need a provider and a well-formed rates block; rates live nowhere else', () => {
  const wp = (over) => base({ id: 'fixture-wp', layer: 'utility', ...over });
  failsWith(run({ 'water-providers.json': [wp()] }), /need "provider"/);
  const rates = { effective: '2026-01-01', unit: 'per 1,000 gal', base_monthly: 23.1, model: 'tiered', tiers: [{ label: 'Tier 1', price: 3.574, up_to_gal: 7000 }] };
  assert.deepEqual(run({ 'water-providers.json': [wp({ provider: 'Fort Collins Utilities', rates })] }).errors, []);
  failsWith(run({ 'water-providers.json': [wp({ provider: 'X', rates: { ...rates, model: 'budget' } })] }), /rates\.model/);
  failsWith(run({ 'water-providers.json': [wp({ provider: 'X', rates: { ...rates, tiers: [{ label: 'T1', price: '3.5' }] } })] }), /price must be a number/);
  failsWith(run({ 'water-providers.json': [wp({ provider: 'X', rates: { ...rates, effective: 'Jan 2026' } })] }), /rates\.effective/);
  failsWith(run({ 'city-codes.json': [base({ rates })] }), /rates belongs only in water-providers\.json/);
});

test('Denver, "Timeless" or a TIMELESS phone in a record fails; a TIMELESS town in a fact warns', () => {
  failsWith(run({ 'city-codes.json': [base({ fact: 'Denver bans turf in 25% of yards.' })] }), /"Denver" in public text/);
  failsWith(run({ 'city-codes.json': [base({ source_label: 'Timeless research note' })] }), /"Timeless" in public text/);
  failsWith(run({ 'city-codes.json': [base({ notes: 'call 303-349-2368' })] }), /TIMELESS phone/);
  warnsWith(run({ 'city-codes.json': [base({ fact: 'Unlike Erie, Windsor requires 25% of front yards landscaped.' })] }), /names Erie, a TIMELESS town/);
  const county = run({ 'city-codes.json': [base({ fact: 'Boulder County data show 25% of yards are landscaped.' })] });
  assert.ok(!county.warnings.some((w) => /Boulder/.test(w)), 'a county name is not a town');
});

test('a fact written as two sentences warns', () => {
  warnsWith(run({ 'city-codes.json': [base({ fact: 'Windsor requires 25% landscaping. That is the front yard.' })] }), /2 sentences/);
  const abbrev = run({ 'city-codes.json': [base({ fact: 'No watering from 10 a.m. to 6 p.m. under Sec. 13-151 in 25% of yards.', numbers: ['25', '10', '6'] })] });
  assert.ok(!abbrev.warnings.some((w) => /sentences/.test(w)), abbrev.warnings.join('\n'));
});

test('coverage: a NoCo town with no ordinance record fails; an all-UNVERIFIED town warns', () => {
  const towns = [{ slug: 'windsor-co', name: 'Windsor' }, { slug: 'mead-co', name: 'Mead' }];
  const res = run({ 'city-codes.json': [base(), base({ id: 'fixture-b', applies_to: ['mead-co'], status: 'UNVERIFIED' })] }, { towns });
  assert.deepEqual(res.errors, []);
  warnsWith(res, /every ordinance record for mead-co is UNVERIFIED/);
  const star = run({ 'state-law.json': [base({ layer: 'state', applies_to: ['*'] })] }, { towns });
  failsWith(star, /windsor-co has no ordinance record/);
  warnsWith(star, /windsor-co has no drought record/);
});

test('every one of the seven contract files must exist', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'layers-'));
  try {
    fs.writeFileSync(path.join(dir, 'city-codes.json'), JSON.stringify([base()]));
    const res = checkLayers({ dir, today: TODAY, towns: [] });
    for (const f of LAYER_FILES.filter((x) => x !== 'city-codes.json')) failsWith(res, new RegExp(`${f.replace('.', '\\.')}: missing`));
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('the CLI exits 1 on a failing fixture and 0 on a clean one', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'layers-cli-'));
  try {
    for (const f of LAYER_FILES) fs.writeFileSync(path.join(dir, f), '[]');
    const cli = (today) => spawnSync(process.execPath, [path.join(ROOT, 'scripts/check-layers.mjs'), '--dir', dir, '--today', today, '--quiet'], { encoding: 'utf8' });
    // empty files: every town lacks an ordinance record → FAIL
    assert.equal(cli(TODAY).status, 1);
    const all = NOCO_TOWNS.map((t, i) => base({ id: `fixture-${i}`, applies_to: [t.slug] }));
    fs.writeFileSync(path.join(dir, 'city-codes.json'), JSON.stringify(all));
    const ok = cli(TODAY);
    assert.equal(ok.status, 0, ok.stdout);
    assert.match(ok.stdout, /check-layers: 17 records in 7 files/);
    assert.equal(cli('2027-10-01').status, 1, 'a year later every record is stale');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

// ───────────────────────────── the number tokenizer ─────────────────────────────

test('numericTokens reads numbers a reader would, not citation digits', () => {
  const t = (s) => numericTokens(s).sort();
  assert.deepEqual(t('C.R.S. 38-33.3-106.5(1)(i.5) and 37-60-126(11)(a.5)'), []);
  assert.deepEqual(t('SB24-005 as amended by HB25-1113'), []);
  assert.deepEqual(t('Ord. No. 1396 and Sec. 13-151(c)(6) and GMC 24-802 and LUC 2.14.2.1.b'), []);
  assert.deepEqual(t('$0.75/sq ft up to 1,000 sq ft ($750)'), ['0.75', '1000', '750'].sort());
  assert.deepEqual(t('a 3/4-inch meter pays $28.33'), ['28.33', '3/4'].sort());
  assert.deepEqual(t('effective 2025-02-14'), ['2025-02-14']);
  assert.deepEqual(t('Tier 2 $4.109 for 7,001-13,000 gallons'), ['13000', '2', '4.109', '7001'].sort());
  assert.deepEqual(t('refrain from watering between 11:00 A.M. and 5:00 P.M.'), ['11', '5'].sort());
  assert.deepEqual(t('200–1,000 square feet'), ['1000', '200'].sort());
  assert.deepEqual(t('station USC00053553 and 4E'), []);
});

test('normalizeNumber strips currency, grouping and percent', () => {
  assert.equal(normalizeNumber('$2,000'), '2000');
  assert.equal(normalizeNumber('75%'), '75');
  assert.equal(normalizeNumber(' 1.75 '), '1.75');
});
