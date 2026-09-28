/**
 * Town × service pages (/areas/{town}-co/{service}/): the registry (src/data/town-services.mjs), the collection
 * schema (src/content.config.ts `townServices`), the gate and the visibility rule (src/lib/town-service-gate.mjs),
 * and what scripts/check-content.mjs holds them to — the file-name rule, the town rules, the overlap gate against
 * the same service and the town record, the gate report and the single-file mode. The town-owned layer
 * directory (src/data/layers/local/) is covered in tests/layers.test.mjs; llms.txt nesting at the end here.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { TOWN_SERVICES, TOWN_SERVICE_SLUGS, townServiceBySlug, NOT_TOWN_SERVICES, parseTownServiceId, townServiceId, townServicePath } from '../src/data/town-services.mjs';
import { townServiceGate, townServiceVisibility, blockWords, SUBSTANTIVE_WORDS } from '../src/lib/town-service-gate.mjs';
import { TOPIC_SLUGS } from '../src/data/guide-topics.ts';
import { loadCollections } from '../scripts/check-content.mjs';
import { buildLlms } from '../scripts/md-mirrors.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8');

/** Letter-only filler words (a digit would need a source), distinct for every k. */
const filler = (from, n) => Array.from({ length: n }, (_, i) => {
  const k = from + i;
  return `ter${String.fromCharCode(97 + (k % 26))}${String.fromCharCode(97 + (Math.floor(k / 26) % 26))}${String.fromCharCode(97 + (Math.floor(k / 676) % 26))}`;
}).join(' ');

const NAMES = { 'windsor-co': 'Windsor', 'timnath-co': 'Timnath', 'mead-co': 'Mead', 'berthoud-co': 'Berthoud' };
const PHOTO_FOR = { 'putting-greens': 'dusk', 'pet-turf': undefined, 'playground-turf': 'playset', 'commercial-turf': undefined };

/** A clean draft town × service record: three blocks of ≥30 words, two own, sourced, and a photo of this use. */
function page(town, service, over = {}) {
  const seed = Object.keys(NAMES).indexOf(town) * 1000 + TOWN_SERVICE_SLUGS.indexOf(service) * 200;
  const blk = (kind, own, from) => ({ kind, own, kicker: kind, h2: `A fixture heading ${filler(from, 2)}`, paras: [filler(from, 40)], layerRefs: [], sources: ['https://example.gov/one'] });
  return {
    status: 'draft', town, service,
    title: `Fixture ${service} page in ${NAMES[town]} | NoCo Turf Co.`,
    description: `What ${NAMES[town]} means for this job.`,
    h1: `A fixture headline for ${NAMES[town]} and this job`,
    lede: filler(seed + 10000, 12),
    answer: { question: `Fixture question ${filler(seed + 20000, 2)}?`, answer: filler(seed + 30000, 20) },
    blocks: [blk('ordinance', true, seed + 40000), blk('golf', true, seed + 50000), blk('soil', false, seed + 60000)],
    faq: [],
    ...(PHOTO_FOR[service] ? { photo: PHOTO_FOR[service] } : {}),
    sources: [
      { label: 'Fixture source one', url: 'https://example.gov/one', checked: '2026-09-24' },
      { label: 'Fixture source two', url: 'https://example.gov/two', checked: '2026-09-24' },
    ],
    checked: '2026-09-24',
    needsFromBrian: ['A named job in this town'],
    ...over,
  };
}

/** The same record cut to one block of `text` — overlap fixtures, where the other blocks would dilute the pair. */
const only = (p, text) => ({ ...p, blocks: [{ ...p.blocks[0], paras: [text] }] });

// ───────────────────────────── the registry ─────────────────────────────

test('four services get town pages; installation (the town page) and turf-repair never do', () => {
  assert.deepEqual(TOWN_SERVICE_SLUGS, ['putting-greens', 'pet-turf', 'playground-turf', 'commercial-turf']);
  assert.ok(NOT_TOWN_SERVICES['artificial-turf-installation'] && NOT_TOWN_SERVICES['turf-repair']);
  const services = read('src/data/services.ts');
  for (const s of TOWN_SERVICES) {
    assert.match(services, new RegExp(`slug: '${s.slug}'[\\s\\S]*?preview: true`), `${s.slug} is a previewable service in services.ts`);
    assert.ok(TOPIC_SLUGS.includes(s.topic), `${s.slug}: topic ${s.topic} is a guide topic`);
    for (const k of ['crumb', 'noun', 'ask']) assert.ok(s[k]?.trim(), `${s.slug}: ${k}`);
    assert.ok(s.band.title && s.band.payoff && s.band.lede.includes('{town}'), `${s.slug}: band`);
  }
});

test('each service\'s photo use is a photos.ts use, and its state records exist and render', () => {
  const union = read('src/data/photos.ts').match(/use:\s*((?:'[a-z-]+'\s*\|?\s*)+);/)[1];
  const uses = [...union.matchAll(/'([a-z-]+)'/g)].map((m) => m[1]);
  const state = JSON.parse(read('src/data/layers/state-law.json'));
  for (const s of TOWN_SERVICES) {
    assert.ok(uses.includes(s.photoUse), `${s.slug}: photo use "${s.photoUse}" is not in the Photo type`);
    for (const id of s.stateRefs) {
      const r = state.find((x) => x.id === id);
      assert.ok(r && r.status === 'VERIFIED', `${s.slug}: state record ${id}`);
    }
  }
});

test('the id is {town}--{service}, two hyphens, and parses back', () => {
  assert.equal(townServiceId('windsor-co', 'putting-greens'), 'windsor-co--putting-greens');
  assert.deepEqual(parseTownServiceId('fort-collins-co--pet-turf'), { town: 'fort-collins-co', service: 'pet-turf' });
  assert.equal(parseTownServiceId('windsor-co-putting-greens'), null);
  assert.equal(parseTownServiceId('windsor-co---putting-greens'), null);
  assert.equal(townServicePath('windsor-co', 'putting-greens'), '/areas/windsor-co/putting-greens/');
});

// ───────────────────────────── the schema ─────────────────────────────

test('the schema takes a clean record and holds town, service, title, description, blocks, faq, sources and dates', async () => {
  const { townServices } = await loadCollections();
  const ok = page('windsor-co', 'putting-greens', { display: { paint: 'fixture headline' } });
  assert.equal(townServices.safeParse(ok).success, true, JSON.stringify(townServices.safeParse(ok).error?.issues));
  const bad = (over, why) => assert.equal(townServices.safeParse({ ...ok, ...over }).success, false, why);
  bad({ town: 'erie-co' }, 'a TIMELESS town');
  bad({ service: 'artificial-turf-installation' }, 'installation × town is the town page');
  bad({ service: 'turf-repair' }, 'turf-repair has no town pages');
  bad({ title: `${'x'.repeat(60)} | NoCo Turf Co.` }, 'over 70 characters');
  bad({ title: 'Backyard Putting Greens in Windsor, CO' }, 'no brand suffix');
  bad({ description: 'x'.repeat(161) }, 'over 160 characters');
  bad({ blocks: [] }, 'no blocks');
  bad({ blocks: Array(8).fill(ok.blocks[0]) }, 'more than seven blocks');
  bad({ faq: Array(7).fill({ q: 'Q?', a: 'A.' }) }, 'more than six FAQ items');
  bad({ sources: ok.sources.slice(0, 1) }, 'one source');
  bad({ checked: 'September 2026' }, 'checked is a date');
  bad({ answer: { question: 'Only a question?' } }, 'the answer needs its answer');
  bad({ blocks: [{ ...ok.blocks[0], kind: 'lawn' }] }, 'a block kind outside the town set');
  const { photo, display, ...bare } = ok;
  assert.equal(townServices.safeParse(bare).success, true, 'photo and display are optional in a draft');
});

// ───────────────────────────── the gate ─────────────────────────────

const PHOTOS = [{ id: 'dusk', use: 'putting-green' }, { id: 'playset', use: 'play' }, { id: 'fenced-yard', use: 'lawn' }];

test('three substantive blocks, two own, every block sourced, and a photo of this use pass', () => {
  assert.deepEqual(townServiceGate(page('windsor-co', 'putting-greens'), PHOTOS), { pass: true, reasons: [] });
  assert.equal(townServiceGate(page('windsor-co', 'playground-turf'), PHOTOS).pass, true);
  assert.equal(townServiceGate(page('windsor-co', 'putting-greens'), new Map([['dusk', 'putting-green']])).pass, true, 'a Map of id → use works too');
});

test('a block counts as substantive only from SUBSTANTIVE_WORDS words; own blocks must be substantive too', () => {
  const p = page('windsor-co', 'putting-greens');
  assert.equal(blockWords({ takeaway: 'one two', paras: ['three four five'] }), 5);
  p.blocks[1] = { ...p.blocks[1], paras: ['Too short to count.'] };
  const g = townServiceGate(p, PHOTOS);
  assert.equal(g.pass, false);
  assert.ok(g.reasons.some((r) => new RegExp(`2 substantive blocks — needs ≥3 \\(a block counts from ${SUBSTANTIVE_WORDS} words; block 2 \\(golf\\) has 4\\)`).test(r)), g.reasons.join('; '));
  assert.ok(g.reasons.some((r) => /1 own blocks \(true of this town for this use\) — needs ≥2/.test(r)), 'the thin own block does not count as own');
});

test('fewer than two own blocks fails: a page built from shared layers reads like its neighbour', () => {
  const p = page('windsor-co', 'putting-greens');
  p.blocks = p.blocks.map((b) => ({ ...b, own: false }));
  const g = townServiceGate(p, PHOTOS);
  assert.equal(g.pass, false);
  assert.ok(g.reasons.some((r) => /0 own blocks/.test(r)));
});

test('a block with no source and no layer reference fails, unless it is a job, photo or review', () => {
  const p = page('windsor-co', 'putting-greens');
  p.blocks[0] = { ...p.blocks[0], sources: [], layerRefs: [] };
  assert.ok(townServiceGate(p, PHOTOS).reasons.some((r) => /block 1 \(ordinance\) has no source and no layer reference/.test(r)));
  p.blocks[0] = { ...p.blocks[0], layerRefs: ['windsor-code-15-3-10-single-family-exempt'] };
  assert.equal(townServiceGate(p, PHOTOS).pass, true, 'a layer reference is enough');
  for (const kind of ['job', 'photo', 'review']) {
    const q = page('windsor-co', 'putting-greens');
    q.blocks[0] = { ...q.blocks[0], kind, sources: [], layerRefs: [] };
    assert.equal(townServiceGate(q, PHOTOS).pass, true, kind);
  }
});

test('the photo must exist and show this use; commercial-turf waits for a commercial photo', () => {
  const none = townServiceGate(page('windsor-co', 'pet-turf'), PHOTOS);
  assert.ok(none.reasons.some((r) => /no photograph — needs a real photo of this use \(src\/data\/photos\.ts use "pet"\)/.test(r)), none.reasons.join('; '));
  const wrong = townServiceGate(page('windsor-co', 'putting-greens', { photo: 'playset' }), PHOTOS);
  assert.ok(wrong.reasons.some((r) => /photo "playset" shows use "play" — a putting-greens page needs a photo with use "putting-green"/.test(r)), wrong.reasons.join('; '));
  const lawn = townServiceGate(page('windsor-co', 'pet-turf', { photo: 'fenced-yard' }), PHOTOS);
  assert.ok(lawn.reasons.some((r) => /use "lawn"/.test(r)), 'a lawn photo is not a dog run');
  const missing = townServiceGate(page('windsor-co', 'putting-greens', { photo: 'stock-green' }), PHOTOS);
  assert.ok(missing.reasons.some((r) => /photo "stock-green" is not in src\/data\/photos\.ts/.test(r)));
  const commercial = townServiceGate(page('windsor-co', 'commercial-turf'), PHOTOS);
  assert.ok(commercial.reasons.some((r) => /commercial, HOA or sports job, added to src\/data\/photos\.ts with use "commercial"/.test(r)), commercial.reasons.join('; '));
  // the real photos.ts: no photo carries the commercial use yet
  assert.doesNotMatch(read('src/data/photos.ts'), /use: 'commercial'/);
});

test('an empty or missing record fails without throwing, and lists every missing piece', () => {
  for (const data of [undefined, null, {}, { blocks: [] }]) {
    const g = townServiceGate(data, PHOTOS);
    assert.equal(g.pass, false);
    assert.ok(g.reasons.length >= 3, g.reasons.join('; '));
  }
});

// ───────────────────────────── visibility ─────────────────────────────

const ctx = (over = {}) => ({ showDrafts: false, townVisible: true, serviceVisible: true, townPublished: true, serviceConfirmed: true, photos: PHOTOS, ...over });

test('PRELAUNCH preview: every record renders while its town page and service are visible, drafts with the ribbon', () => {
  const draft = page('windsor-co', 'pet-turf'); // fails the gate: no photo
  const v = townServiceVisibility(draft, ctx({ showDrafts: true, serviceConfirmed: false }));
  assert.equal(v.render, true);
  assert.equal(v.draft, true);
  assert.equal(v.sitemap, false);
  assert.equal(townServiceVisibility(draft, ctx({ showDrafts: true, townVisible: false })).render, false, 'no town page, no child page');
  assert.equal(townServiceVisibility(draft, ctx({ showDrafts: true, serviceVisible: false })).render, false, 'no service, no page');
});

test('launch: only a published record that passes the gate, with its town page and its service visible', () => {
  const passing = page('windsor-co', 'putting-greens', { status: 'published' });
  assert.deepEqual(
    (({ render, sitemap, draft }) => ({ render, sitemap, draft }))(townServiceVisibility(passing, ctx())),
    { render: true, sitemap: true, draft: false });
  assert.equal(townServiceVisibility({ ...passing, status: 'draft' }, ctx()).render, false, 'a draft');
  assert.equal(townServiceVisibility({ ...passing, status: 'review' }, ctx()).render, false, 'in review');
  const failing = page('windsor-co', 'pet-turf', { status: 'published' });
  assert.equal(townServiceVisibility(failing, ctx()).render, false, 'published but failing the gate');
  assert.equal(townServiceVisibility(passing, ctx({ townVisible: false, townPublished: false })).render, false, 'its town page is not visible');
  assert.equal(townServiceVisibility(passing, ctx({ serviceVisible: false, serviceConfirmed: false })).render, false, 'its service is not confirmed');
});

test('the sitemap lists only published records that pass the gate, with a published town and a confirmed service', () => {
  const passing = page('windsor-co', 'putting-greens', { status: 'published' });
  assert.equal(townServiceVisibility(passing, ctx({ showDrafts: true })).sitemap, true);
  assert.equal(townServiceVisibility({ ...passing, status: 'draft' }, ctx({ showDrafts: true })).sitemap, false);
  assert.equal(townServiceVisibility({ ...passing, photo: undefined }, ctx()).sitemap, false, 'fails the gate');
  assert.equal(townServiceVisibility(passing, ctx({ townPublished: false })).sitemap, false);
  assert.equal(townServiceVisibility(passing, ctx({ serviceConfirmed: false })).sitemap, false);
  assert.equal(townServiceVisibility(passing, ctx({ serviceConfirmed: false, showDrafts: true })).draft, true, 'published, but the service is unconfirmed: still the ribbon');
});

test('the routes, links and sitemap all read the one visibility rule', () => {
  const visible = read('src/lib/visible.ts');
  const published = read('src/lib/published-content.ts');
  assert.match(visible, /townServiceVisibility\(/);
  assert.match(published, /townServiceVisibility\([\s\S]*?\.sitemap/);
  assert.match(read('src/pages/sitemap.xml.ts'), /publishedTownServices\(\)/);
  assert.match(read('src/pages/areas/[slug]/[service].astro'), /visibleTownServices\(\)/);
  assert.match(read('src/pages/areas/[slug].astro'), /<SellServices [^>]*townPages=\{byService\}/);
  assert.match(read('src/pages/services/[slug].astro'), /<ServiceByTown /);
});

// ───────────────────────────── scripts/check-content.mjs on fixtures ─────────────────────────────

const LAYERS = [{
  id: 'fixture-windsor-code', layer: 'ordinance', applies_to: ['windsor-co'],
  fact: 'Windsor exempts detached houses from its landscape article, except that at least 25% of each front yard must be landscaped.',
  quote: 'a minimum of twenty-five percent (25%) of all front yards shall be landscaped.',
  source_url: 'https://example.gov/one', source_label: 'Windsor Code 15-3-10',
  checked: '2026-09-24', reachable: true, status: 'VERIFIED', numbers: ['25'],
}];

function fixture(t) {
  const dir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'noco town-services ')));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const write = (file, value) => {
    const dest = path.join(dir, file);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, typeof value === 'string' ? value : JSON.stringify(value, null, 1));
    return dest;
  };
  write('src/data/layers/fixtures.json', LAYERS);
  for (const d of ['towns', 'town-services', 'guides', 'services', 'work']) fs.mkdirSync(path.join(dir, 'src/content', d), { recursive: true });
  const run = (...args) => {
    const r = spawnSync(process.execPath, [path.join(root, 'scripts/check-content.mjs'), '--root', dir, ...args], { encoding: 'utf8' });
    return { ...r, out: r.stdout + r.stderr };
  };
  const put = (rec, name = townServiceId(rec.town, rec.service)) => write(`src/content/town-services/${name}.json`, rec);
  return { dir, write, run, put };
}

/** A town record whose body is `paras` (for the parent-overlap check). */
const townRecord = (slug, paras) => ({
  status: 'draft', slug, name: NAMES[slug], region: 'windsor-johnstown',
  title: `Artificial Turf in ${NAMES[slug]}, CO | NoCo Turf Co.`, description: 'A fixture town.', h1: 'A fixture town', lede: 'Lede.',
  answer: { question: 'Can I?', answer: 'Usually.' },
  blocks: [0, 1, 2].map((i) => ({ kind: 'housing', own: true, kicker: 'k', h2: 'h', paras: i ? ['Short.'] : [paras], layerRefs: [], sources: ['https://example.gov/one'] })),
  nearby: ['timnath-co', 'severance-co'],
  sources: [{ label: 'One', url: 'https://example.gov/one', checked: '2026-09-24' }, { label: 'Two', url: 'https://example.gov/two', checked: '2026-09-24' }],
  checked: '2026-09-24',
});

test('a clean draft passes; its gate report names the page and what Brian must send', (t) => {
  const { run, put } = fixture(t);
  put(page('windsor-co', 'pet-turf'));
  const r = run();
  assert.equal(r.status, 0, r.out);
  assert.match(r.out, /windsor-co--pet-turf \[townService · draft\]/);
  assert.match(r.out, /town × service gate not met yet \(draft\): no photograph/);
  assert.match(r.out, /Town × service gate — src\/lib\/town-service-gate\.mjs/);
  assert.match(r.out, /pet-turf\s+1 of 17 towns written · a photo with use "pet"/);
  assert.match(r.out, /windsor-co--pet-turf\s+draft\s+3 blocks \(3 substantive\) · 2 own · no photo — gate not yet/);
  assert.match(r.out, /needs from Brian: A named job in this town/);
  assert.match(r.out, /putting-greens\s+0 of 17 towns written/);
});

test('a published page that fails the gate fails the check; a passing one warns while its town or service can\'t render', (t) => {
  const { run, put } = fixture(t);
  put(page('windsor-co', 'pet-turf', { status: 'published' }));
  const r = run();
  assert.equal(r.status, 1, r.out);
  assert.match(r.out, /published but fails the town × service gate: no photograph/);
  assert.match(r.out, /windsor-co--pet-turf\s+published\s+.*— gate FAIL/);

  put(page('windsor-co', 'putting-greens', { status: 'published' }));
  const ok = run();
  assert.match(ok.out, /windsor-co--putting-greens\s+published\s+.*— gate PASS/);
  assert.match(ok.out, /its town page windsor-co is not published — this page renders only once the town page does/);
  assert.match(ok.out, /service putting-greens is not confirmed in src\/data\/services\.ts/);
});

test('the file name is {town}--{service}.json and must match the record; installation and turf-repair get no page', (t) => {
  const { dir, run, put } = fixture(t);
  put(page('windsor-co', 'putting-greens'), 'windsor-co-putting-greens');
  const single = run();
  assert.equal(single.status, 1, single.out);
  assert.match(single.out, /file name must be \{town-slug\}--\{service\}\.json, two hyphens between \(e\.g\. windsor-co--putting-greens\.json\) — this record's is windsor-co--putting-greens\.json/);
  fs.rmSync(path.join(dir, 'src/content/town-services/windsor-co-putting-greens.json'));

  put(page('windsor-co', 'putting-greens'), 'timnath-co--putting-greens');
  const wrong = run();
  assert.equal(wrong.status, 1, wrong.out);
  assert.match(wrong.out, /file name should be windsor-co--putting-greens\.json \(town "windsor-co", service "putting-greens"\)/);
  fs.rmSync(path.join(dir, 'src/content/town-services/timnath-co--putting-greens.json'));

  put(page('windsor-co', 'artificial-turf-installation'));
  put(page('windsor-co', 'turf-repair'));
  put(page('erie-co', 'putting-greens'));
  const svc = run();
  assert.equal(svc.status, 1, svc.out);
  assert.match(svc.out, /service "artificial-turf-installation" gets no town × service page: the town page \/areas\/\{town\}-co\/ is the installation page/);
  assert.match(svc.out, /service "turf-repair" gets no town × service page: the turf-repair service page is not built/);
  assert.match(svc.out, /erie-co is not a NoCo town/);
  assert.match(svc.out, /schema: service/);
});

test('the town rules hold: leaks, claims, numbers, links, layerRefs, title suffix and the painted phrase', (t) => {
  const { run, put } = fixture(t);
  for (const [over, expect] of [
    [{ lede: 'We also cover Erie.' }, /TIMELESS town "Erie"/],
    [{ lede: 'The best greens in town.' }, /unsourced business claim "best"/],
    [{ lede: 'About 12,500 gallons a year.' }, /numbers not found in any referenced layer record or source label: 12500/],
    [{ lede: 'See https://blog.example.com/greens for more.' }, /outside link not among this record's sources: https:\/\/blog\.example\.com\/greens/],
    [{ lede: 'See [the town](/areas/windsor-co) first.' }, /internal link without its trailing slash: \/areas\/windsor-co/],
    [{ lede: 'An affluent neighborhood.' }, /demographic or wealth language "affluent"/],
    [{ title: 'Backyard Putting Greens in Windsor, CO' }, /title must end with "\| NoCo Turf Co\."/],
    [{ display: { paint: 'not in the headline' } }, /display\.paint "not in the headline" is not in the h1/],
    [{ photo: 'stock-green' }, /photo id is not in src\/data\/photos\.ts: stock-green/],
  ]) {
    put(page('windsor-co', 'putting-greens', over));
    const r = run();
    assert.equal(r.status, 1, `${JSON.stringify(over)}\n${r.out}`);
    assert.match(r.out, expect, JSON.stringify(over));
  }
  const refs = page('windsor-co', 'putting-greens');
  refs.blocks[0] = { ...refs.blocks[0], layerRefs: ['no-such-layer'] };
  put(refs);
  assert.match(run().out, /layerRefs id "no-such-layer" is not in src\/data\/layers\/\*\.json, src\/data\/layers\/guides\/\*\.json, src\/data\/layers\/local\/\*\.json or src\/data\/layers\/communities\/\*\.json/);

  // a number traced to a referenced layer record passes; a photo from another town only warns
  const traced = page('windsor-co', 'putting-greens', { photo: 'fire-pit', lede: 'At least 25% of each front yard stays landscaped.' });
  traced.blocks[0] = { ...traced.blocks[0], layerRefs: ['fixture-windsor-code'] };
  put(traced);
  const ok = run();
  assert.equal(ok.status, 0, ok.out);
  assert.match(ok.out, /photo "fire-pit" was taken Near Berthoud, not in Windsor — the caption says so/);
});

test('overlap: pages of the same service over 25% of five-word runs fail, over 15% warn; different services are not compared', (t) => {
  const { run, put } = fixture(t);
  // one 100-word block plus the 32-word lede and answer; shared words s → shared runs: 60 → about 28%, 40 → about 16%
  const pair = (shared, service2 = 'putting-greens') => {
    const a = only(page('windsor-co', 'putting-greens'), `${filler(0, shared)} ${filler(70000, 100 - shared)}`);
    const b = only(page('timnath-co', service2), `${filler(0, shared)} ${filler(80000, 100 - shared)}`);
    put(a); put(b);
    return run();
  };
  const fail = pair(60);
  assert.equal(fail.status, 1, fail.out);
  assert.match(fail.out, /x FAIL town-service overlap timnath-co--putting-greens ~ windsor-co--putting-greens: \d+\.\d% of five-word runs shared \(\d+ runs\) — limit 25%\. Shared runs include "…teraaa terbaa/);
  const warn = pair(40);
  assert.equal(warn.status, 0, warn.out);
  assert.match(warn.out, /! WARN town-service overlap timnath-co--putting-greens ~ windsor-co--putting-greens: .* — warn above 15%/);
});

test('overlap: a different service in another town is not a pair, however alike', (t) => {
  const { run, put } = fixture(t);
  const a = page('windsor-co', 'putting-greens');
  const b = page('timnath-co', 'pet-turf');
  a.blocks[0] = { ...a.blocks[0], paras: [filler(0, 100)] };
  b.blocks[0] = { ...b.blocks[0], paras: [filler(0, 100)] };
  put(a); put(b);
  const r = run();
  assert.equal(r.status, 0, r.out);
  assert.doesNotMatch(r.out, /town-service overlap/);
});

test('overlap: a page over 25% alike with its own town record fails; another town\'s record is not its parent', (t) => {
  const { write, run, put } = fixture(t);
  const a = page('windsor-co', 'putting-greens');
  a.blocks[0] = { ...a.blocks[0], paras: [`${filler(0, 70)} ${filler(90000, 30)}`] };
  put(a);
  write('src/content/towns/windsor-co.json', townRecord('windsor-co', `${filler(0, 70)} ${filler(95000, 30)}`));
  const r = run();
  assert.equal(r.status, 1, r.out);
  assert.match(r.out, /x FAIL town-service overlap windsor-co--putting-greens ~ its town record windsor-co: .* — limit 25%\. .*Say a town-wide fact once, on the town page/);

  const b = page('timnath-co', 'putting-greens');
  put(b);
  const other = run();
  assert.doesNotMatch(other.out, /timnath-co--putting-greens ~ its town record windsor-co/);
});

test('single-file mode: a named page is checked against every page of its service and its town record on disk', (t) => {
  const { dir, write, run, put } = fixture(t);
  const a = only(page('windsor-co', 'putting-greens'), `${filler(0, 80)} ${filler(70000, 20)}`);
  const b = only(page('timnath-co', 'putting-greens'), `${filler(0, 80)} ${filler(80000, 20)}`);
  const c = page('mead-co', 'putting-greens');
  const d = only(page('timnath-co', 'pet-turf'), `${filler(0, 80)} ${filler(85000, 20)}`);
  const fa = put(a); put(b); const fc = put(c); const fd = put(d);
  write('src/content/towns/windsor-co.json', townRecord('windsor-co', filler(99000, 60)));

  const named = run(fa);
  assert.equal(named.status, 1, named.out);
  assert.match(named.out, /1 record\(s\)/, 'only the named file is checked record by record');
  assert.match(named.out, /Town × service overlap: windsor-co--putting-greens against 3 other record\(s\) on disk/);
  assert.match(named.out, /x FAIL town-service overlap windsor-co--putting-greens ~ timnath-co--putting-greens/);
  assert.doesNotMatch(named.out, /pet-turf/, 'another service is never a pair');

  const clean = run(fc);
  assert.equal(clean.status, 0, `mead-co is distinct; the windsor ~ timnath pair is not its to report\n${clean.out}`);
  assert.doesNotMatch(clean.out, /windsor-co--putting-greens ~ timnath-co--putting-greens/);

  const pet = run(fd);
  assert.equal(pet.status, 0, pet.out);

  // naming the town record compares it with its own town × service pages
  const town = run(path.join(dir, 'src/content/towns/windsor-co.json'));
  assert.match(town.out, /Town × service overlap: windsor-co against 1 other record\(s\) on disk/);
});

test('single-file mode gates the town\'s own layer file, and a local record resolves as a layerRef', (t) => {
  const { write, run, put } = fixture(t);
  const today = new Date().toISOString().slice(0, 10);
  const local = (over = {}) => ({
    id: 'windsor-co.fixture-golf', layer: 'place', applies_to: ['windsor-co'],
    fact: 'Windsor holds a fixture golf course with 27 holes.', quote: 'The course has 27 holes.',
    source_url: 'https://example.gov/two', source_label: 'Fixture golf course', checked: today, reachable: true, status: 'VERIFIED', numbers: ['27'], ...over,
  });
  const p = page('windsor-co', 'putting-greens', { lede: 'A fixture course with 27 holes.' });
  p.blocks[1] = { ...p.blocks[1], layerRefs: ['windsor-co.fixture-golf'] };
  const file = put(p);
  write('src/data/layers/local/windsor-co.json', [local()]);
  const ok = run(file);
  assert.equal(ok.status, 0, ok.out);
  assert.doesNotMatch(ok.out, /is not in src\/data\/layers/);

  write('src/data/layers/local/windsor-co.json', [local(), local({ id: 'fixture-no-prefix', recheck: '2020-01-01' }), local({ id: 'windsor-co.elsewhere', applies_to: ['mead-co'] })]);
  const bad = run(file);
  assert.equal(bad.status, 1, bad.out);
  assert.match(bad.out, /layer file: local\/windsor-co\.json fixture-no-prefix: ids in a town's own file start with "windsor-co\."/);
  assert.match(bad.out, /layer file: .*recheck 2020-01-01 has passed/);
  assert.match(bad.out, /layer file: local\/windsor-co\.json windsor-co\.elsewhere: a record in windsor-co's own file applies to windsor-co/);
});

// ───────────────────────────── llms.txt ─────────────────────────────

test('llms.txt lists each town × service page under its town page', () => {
  const SITE = 'https://www.nocoturf.com';
  const p = (route, title) => ({ url: `${SITE}${route}`, md: `${SITE}${route}index.html.md`, title, description: `${title}.`, body: '', crumbs: [] });
  const out = buildLlms({ brief: {}, site: SITE, prelaunch: false, pages: [
    p('/areas/timnath-co/', 'Timnath'), p('/areas/windsor-co/putting-greens/', 'Windsor greens'), p('/areas/', 'Areas'),
    p('/areas/windsor-co/', 'Windsor'), p('/areas/windsor-co/pet-turf/', 'Windsor dog runs'),
  ] });
  assert.match(out, /## Towns we serve\n\n- \[Areas\][^\n]*\n- \[Timnath\][^\n]*\n- \[Windsor\][^\n]*\n  - \[Windsor dog runs\][^\n]*\n  - \[Windsor greens\]/);
});
