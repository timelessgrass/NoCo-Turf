/**
 * Publication policy (src/lib/content-policy.mjs) and the content checker (scripts/check-content.mjs).
 * The checker tests run the real script against a throwaway root (--root) holding only fixture
 * records, layers and a claims register; the schemas, territory and town gate come from this repo.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { CONTENT_STATUSES, isPublished, assertUniqueRoutes } from '../src/lib/content-policy.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8');

test('unreviewed content stays private by default', () => {
  for (const status of [undefined, null, 'draft', 'review', 'Published', 'PUBLISHED', 'invalid']) {
    assert.equal(isPublished({ status }), false, String(status));
  }
  assert.equal(isPublished(undefined), false);
  assert.equal(isPublished({ status: 'published' }), true);
  assert.equal(isPublished({ status: 'draft', data: { status: 'published' } }), false);
});

test('the policy statuses are exactly the schema statuses', () => {
  const m = read('src/content.config.ts').match(/const status = z\.enum\(\[([^\]]*)\]\)/);
  assert.ok(m, 'content.config.ts no longer defines `const status = z.enum([...])`');
  assert.deepEqual(m[1].split(',').map((s) => s.trim().replace(/^['"]|['"]$/g, '')), CONTENT_STATUSES);
});

test('conflicting routes stop generation', () => {
  assert.throws(() => assertUniqueRoutes(['/areas/windsor-co/', '/areas/windsor-co/']), /Duplicate content route/);
  assert.doesNotThrow(() => assertUniqueRoutes(['/areas/windsor-co/', '/areas/timnath-co/']));
});

// ───────────────────────────── scripts/check-content.mjs on fixtures ─────────────────────────────

const LAYERS = [
  {
    id: 'fixture-fc-luc', layer: 'ordinance', applies_to: ['fort-collins-co'],
    fact: 'Fort Collins bars artificial turf in new development plans; existing single-family lots are exempt.',
    quote: 'Artificial turf shall not be installed as part of a development plan.',
    source_url: 'https://example.gov/fort-collins/luc-5-10-1', source_label: 'Land Use Code 5.10.1 (Ord. 008, 2025)',
    checked: '2026-09-24', reachable: true, status: 'VERIFIED', numbers: ['2025', '008'],
  },
  {
    id: 'fixture-co-hoa', layer: 'state', applies_to: ['*'],
    fact: 'A Colorado HOA must preapprove at least 3 water-wise front-yard designs; the remedy is $500 or actual damages after 45 days to cure.',
    quote: 'follow best management practices for water use',
    source_url: 'https://example.gov/colorado/sb23-178', source_label: 'SB23-178',
    checked: '2026-09-24', reachable: true, status: 'VERIFIED', numbers: ['3', '500', '45'],
  },
];

/** A draft town record that passes every copy rule; the gate waits on Brian's photo. */
function town(slug, overrides = {}) {
  const name = { 'fort-collins-co': 'Fort Collins', 'loveland-co': 'Loveland', 'windsor-co': 'Windsor' }[slug];
  const region = { 'fort-collins-co': 'poudre', 'loveland-co': 'loveland-berthoud', 'windsor-co': 'windsor-johnstown' }[slug];
  return {
    status: 'draft', slug, name, region,
    title: `Artificial turf in ${name}, CO`, description: `What ${name} allows, and what an HOA may ask.`,
    h1: `Artificial turf in ${name}`, lede: `${name} has its own rules for turf.`,
    answer: { question: `Can I install turf in ${name}?`, answer: `On an existing single-family lot, usually yes.` },
    blocks: [
      { kind: 'ordinance', own: true, kicker: 'City code', h2: 'What the code says', paras: ['Ord. 008 of 2025 keeps turf out of new development plans, so follow best management practices.'], layerRefs: ['fixture-fc-luc', 'fixture-co-hoa'], sources: ['https://example.gov/fort-collins/luc-5-10-1'] },
      { kind: 'hoa', own: false, kicker: 'HOA', h2: 'What your HOA can ask', paras: ['State law gives a $500 remedy after 45 days.'], layerRefs: ['fixture-co-hoa'], sources: ['https://example.gov/colorado/sb23-178'] },
      { kind: 'soil', own: true, kicker: 'Soil', h2: 'Clay under the lawn', paras: [`Clay soils around ${name} drain slowly after a storm.`], sources: ['https://example.gov/soil'] },
    ],
    nearby: slug === 'loveland-co' ? ['fort-collins-co', 'berthoud-co'] : ['loveland-co', 'timnath-co'],
    sources: [
      { label: 'Land Use Code 5.10.1', url: 'https://example.gov/fort-collins/luc-5-10-1', checked: '2026-09-24' },
      { label: 'SB23-178', url: 'https://example.gov/colorado/sb23-178', checked: '2026-09-24' },
    ],
    checked: '2026-09-24',
    needsFromBrian: [`One ${name} job with before and after photos`],
    ...overrides,
  };
}

/** Distinct wording per town, so a pair of fixtures is not a similarity duplicate by accident. */
const UNIQUE = {
  'fort-collins-co': ['Poudre River corridors carry their own buffer rules near the water.', 'Older lots near the university often have mature trees shading the yard.'],
  'windsor-co': ['Golf community lots around the reservoir sit beside greens and fairways.', 'Metro districts maintain many of the streetscapes in newer neighborhoods.'],
};
function distinctTown(slug) {
  const t = town(slug);
  t.blocks[2].paras = UNIQUE[slug];
  t.blocks[0].paras = [`${UNIQUE[slug][0]} Ord. 008 of 2025 applies.`];
  t.blocks[1].paras = [`${UNIQUE[slug][1]} State law gives a $500 remedy after 45 days.`];
  return t;
}

function fixture(t) {
  const dir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'noco check-content ')));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const write = (file, value) => {
    const dest = path.join(dir, file);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, typeof value === 'string' ? value : JSON.stringify(value, null, 1));
    return dest;
  };
  write('src/data/layers/fixtures.json', LAYERS);
  for (const d of ['towns', 'guides', 'services', 'work']) fs.mkdirSync(path.join(dir, 'src/content', d), { recursive: true });
  const run = (...args) => {
    const r = spawnSync(process.execPath, [path.join(root, 'scripts/check-content.mjs'), '--root', dir, ...args], { encoding: 'utf8' });
    return { ...r, out: r.stdout + r.stderr };
  };
  return { dir, write, run };
}

test('a clean draft passes, and its unmet gate is a warning that prints what Brian must send', (t) => {
  const { write, run } = fixture(t);
  write('src/content/towns/fort-collins-co.json', town('fort-collins-co'));
  const r = run();
  assert.equal(r.status, 0, r.out);
  assert.match(r.out, /town gate not met yet \(draft\): .*Brian hasn't confirmed NoCo works Fort Collins/);
  assert.match(r.out, /no photo from Fort Collins yet/, 'a photo is a to-do, not the gate');
  assert.match(r.out, /no job or review from Fort Collins yet/, 'so is a job');
  assert.match(r.out, /needs from Brian: One Fort Collins job with before and after photos/);
  assert.match(r.out, /fort-collins-co\s+draft\s+3 blocks · 0 own · not confirmed · no local photo — gate not yet/, 'own counts substantive blocks only, as the gate does');
  assert.match(r.out, /windsor-co\s+—\s+no record yet/);
});

test('a town Brian has confirmed, with a photo from it and a job there, passes the gate end to end', (t) => {
  const { write, run } = fixture(t);
  const words = (from, n) => Array.from({ length: n }, (_, i) => `wor${String.fromCharCode(97 + ((from + i) % 26))}${String.fromCharCode(97 + (Math.floor((from + i) / 26) % 26))}`).join(' ');
  const w = town('windsor-co');
  w.blocks = w.blocks.map((b, i) => ({ ...b, paras: [`${b.paras[0]} ${words(i * 100, 30)}`] }));
  w.blocks.push({ kind: 'job', own: true, kicker: 'Job', h2: 'A Windsor backyard green', paras: [`We built a backyard green in Windsor in the spring. ${words(900, 30)}`], layerRefs: [], sources: [] });
  write('src/content/towns/windsor-co.json', w);
  const said = { source: 'client_text', source_detail: 'Brian, text to Ty: yes, Windsor', date: '2026-10-02' };
  write('.site/truth/brief.json', { service_areas: [{ slug: 'windsor-co', name: { value: 'Windsor', status: 'CLIENT_CONFIRMED', ...said } }] });
  const r = run();
  assert.equal(r.status, 0, r.out);
  assert.match(r.out, /windsor-co\s+draft\s+4 blocks · \d own · confirmed · \d+ local photos? — gate PASS/, r.out);

  write('.site/truth/brief.json', '{ not json');
  const bad = run();
  assert.equal(bad.status, 1, bad.out);
  assert.match(bad.out, /\.site\/truth\/brief\.json is not valid JSON/);
});

test('a published town that fails the gate fails the check', (t) => {
  const { write, run } = fixture(t);
  write('src/content/towns/fort-collins-co.json', town('fort-collins-co', { status: 'published' }));
  const r = run();
  assert.equal(r.status, 1, r.out);
  assert.match(r.out, /published but fails the town gate: .*Brian hasn't confirmed NoCo works Fort Collins/);
});

test('"Erie" fails — NoCo never names a TIMELESS town, even hidden behind a soft hyphen', (t) => {
  const { write, run } = fixture(t);
  const t1 = town('fort-collins-co');
  t1.blocks[2].paras.push('We also cover Erie.');
  write('src/content/towns/fort-collins-co.json', t1);
  const r = run();
  assert.equal(r.status, 1, r.out);
  assert.match(r.out, /TIMELESS town "Erie"/);

  const t2 = town('fort-collins-co');
  t2.lede = 'Closer to Den&shy;ver than you think.';
  write('src/content/towns/fort-collins-co.json', t2);
  const r2 = run();
  assert.equal(r2.status, 1, r2.out);
  assert.match(r2.out, /TIMELESS town "Denver"/);
});

test('a TIMELESS phone fails in any spelling', (t) => {
  const { write, run } = fixture(t);
  for (const phone of ['303-349-2368', '(303) 349-2368', '+1 303.349.2368', `303${String.fromCodePoint(0x2011)}349${String.fromCodePoint(0x2011)}2368`, '854-204-9227']) {
    const rec = town('fort-collins-co');
    rec.blocks[2].paras.push(`Call ${phone} today.`);
    write('src/content/towns/fort-collins-co.json', rec);
    const r = run();
    assert.equal(r.status, 1, `${phone}\n${r.out}`);
    assert.match(r.out, /TIMELESS phone/, phone);
  }
});

test('"Timeless" and NoCo\'s own typed phone fail', (t) => {
  const { write, run } = fixture(t);
  const rec = town('fort-collins-co');
  rec.lede = 'Ask our friends at TIMELESS, or call 720-630-0108.';
  write('src/content/towns/fort-collins-co.json', rec);
  const r = run();
  assert.equal(r.status, 1, r.out);
  assert.match(r.out, /"Timeless" — the sister brand/);
  assert.match(r.out, /NoCo's phone typed into copy/);
});

test('"licensed" fails unless an approved claims.json entry says exactly that', (t) => {
  const { write, run } = fixture(t);
  const rec = town('fort-collins-co');
  rec.blocks[2].paras.push('Our crews are licensed and insured in Colorado.');
  write('src/content/towns/fort-collins-co.json', rec);
  const r = run();
  assert.equal(r.status, 1, r.out);
  assert.match(r.out, /unsourced business claim "licensed"/);
  assert.match(r.out, /unsourced business claim "insured"/);

  const claim = { claim: 'licensed and insured in Colorado', status: 'CLIENT_CONFIRMED', source: 'document', approved: true, approved_by: 'Ty', aliases: [] };
  write('.site/truth/claims.json', { claims: [claim] });
  const ok = run();
  assert.equal(ok.status, 0, ok.out);

  write('.site/truth/claims.json', { claims: [{ ...claim, approved: false }] });
  const gated = run();
  assert.equal(gated.status, 1, gated.out);
  assert.match(gated.out, /claims register: "licensed and insured in colorado" belongs to an unapproved claim/);
});

test('other unsourced claims, prices and demographics fail; a phrase quoted from a layer does not', (t) => {
  const { write, run } = fixture(t);
  for (const [phrase, expect] of [
    ['The best installer in town.', /unsourced business claim "best"/],
    ['We have 13 years of experience.', /unsourced business claim "years of experience"/],
    ['Rated 5 stars by neighbours.', /unsourced business claim "5 stars"/],
    ['Installs starting at $8 per square foot.', /unsourced business claim "starting at"|a \$ price/],
    ['A family-owned crew.', /unsourced business claim "family-owned"/],
    ['Open 24/7.', /unsourced business claim "24\/7"/],
    ['An affluent neighborhood.', /demographic or wealth language "affluent"/],
    ['Median income here is high.', /demographic or wealth language "Median income"/],
    ['Lorem ipsum.', /placeholder or foreign token "lorem"/],
  ]) {
    const rec = town('fort-collins-co');
    rec.blocks[2].paras.push(phrase);
    write('src/content/towns/fort-collins-co.json', rec);
    const r = run();
    assert.equal(r.status, 1, `${phrase}\n${r.out}`);
    assert.match(r.out, expect, phrase);
  }
  // "best management practices" is in the referenced layer's quote; "$500" is in its numbers
  write('src/content/towns/fort-collins-co.json', town('fort-collins-co'));
  const clean = run();
  assert.equal(clean.status, 0, clean.out);
  assert.doesNotMatch(clean.out, /"best"|\$ price/);
});

test('numbers must trace to a referenced layer record, and outside links to the sources', (t) => {
  const { write, run } = fixture(t);
  const rec = town('fort-collins-co');
  rec.blocks[2].paras.push('About 12,500 gallons a year, see https://not-a-source.example.com/page.');
  write('src/content/towns/fort-collins-co.json', rec);
  const r = run();
  assert.equal(r.status, 1, r.out);
  assert.match(r.out, /numbers not found in any referenced layer record or source label: 12500/);
  assert.match(r.out, /outside link not among this record's sources: https:\/\/not-a-source\.example\.com\/page/);

  const refs = town('fort-collins-co');
  refs.blocks[0].layerRefs.push('no-such-layer');
  write('src/content/towns/fort-collins-co.json', refs);
  const missing = run();
  assert.equal(missing.status, 1, missing.out);
  assert.match(missing.out, /layerRefs id "no-such-layer" is not in src\/data\/layers/);
});

test('an empty layer directory turns tracing into warnings instead of failures', (t) => {
  const { dir, write, run } = fixture(t);
  fs.rmSync(path.join(dir, 'src/data/layers'), { recursive: true });
  const rec = town('fort-collins-co');
  rec.blocks[0].paras = ['Ord. 008 of 2025 keeps turf out of new development plans.']; // no layer to quote from
  rec.blocks[2].paras.push('About 12,500 gallons a year.');
  write('src/content/towns/fort-collins-co.json', rec);
  const r = run();
  assert.equal(r.status, 0, r.out);
  assert.match(r.out, /numbers not yet traceable \(src\/data\/layers\/ is empty\): 2025, 500, 45, 12500/);
  assert.match(r.out, /a \$ amount not yet traceable/);
  assert.match(r.out, /layerRefs not checked/);
});

test('two near-identical town records fail as a similarity pair; distinct ones pass', (t) => {
  const { write, run } = fixture(t);
  write('src/content/towns/fort-collins-co.json', distinctTown('fort-collins-co'));
  write('src/content/towns/windsor-co.json', distinctTown('windsor-co'));
  const ok = run();
  assert.equal(ok.status, 0, ok.out);
  assert.doesNotMatch(ok.out, /FAIL similarity/);

  write('src/content/towns/loveland-co.json', town('loveland-co'));
  write('src/content/towns/windsor-co.json', town('windsor-co'));
  const dup = run();
  assert.equal(dup.status, 1, dup.out);
  assert.match(dup.out, /FAIL similarity loveland-co ~ windsor-co: \d+\.\d% of five-word runs shared/);
});

test('territory and schema: a non-NoCo slug, a mismatched file name or region, an overlong title all fail', (t) => {
  const { dir, write, run } = fixture(t);
  write('src/content/towns/erie-co.json', { ...town('fort-collins-co'), slug: 'erie-co' });
  const erie = run();
  assert.equal(erie.status, 1, erie.out);
  assert.match(erie.out, /erie-co is not a NoCo town/);
  assert.match(erie.out, /schema: slug/);
  fs.rmSync(path.join(dir, 'src/content/towns/erie-co.json'));

  write('src/content/towns/timnath-co.json', town('fort-collins-co'));
  const named = run();
  assert.equal(named.status, 1, named.out);
  assert.match(named.out, /file name should be fort-collins-co\.json/);
  fs.rmSync(path.join(dir, 'src/content/towns/timnath-co.json'));

  write('src/content/towns/fort-collins-co.json', town('fort-collins-co', { region: 'greeley-east-weld', title: 'x'.repeat(71) }));
  const r = run();
  assert.equal(r.status, 1, r.out);
  assert.match(r.out, /region "greeley-east-weld" disagrees with territory\.mjs/);
  assert.match(r.out, /schema: title/);
});

const guide = (fm, body) => `---\n${Object.entries(fm).map(([k, v]) => `${k}: ${JSON.stringify(v)}`).join('\n')}\n---\n${body}\n`;
const GUIDE = {
  status: 'draft', topic: 'rules-and-hoa', title: 'Turf rules in Northern Colorado', description: 'Which towns allow turf where.', h1: 'Turf rules in Northern Colorado',
  answer: { question: 'Can I install turf?', answer: 'On most existing single-family lots, yes.' },
  layerRefs: ['fixture-fc-luc'],
  sources: [{ label: 'Land Use Code 5.10.1', url: 'https://example.gov/fort-collins/luc-5-10-1', checked: '2026-09-24' }, { label: 'SB23-178', url: 'https://example.gov/colorado/sb23-178', checked: '2026-09-24' }],
  published: '2026-09-24', updated: '2026-09-24', related: { services: ['pet-turf'], towns: ['fort-collins-co'] },
};

test('a published guide needs one of Brian\'s job photos and only confirmed related services; his open questions stay listed', (t) => {
  const { write, run } = fixture(t);
  const body = '## Does Fort Collins allow turf?\n\nOn existing lots, yes.';
  write('src/content/guides/turf-rules-northern-colorado.md', guide({ ...GUIDE, status: 'published', related: { services: ['turf-repair'], towns: ['fort-collins-co'] } }, body));
  const bare = run();
  assert.equal(bare.status, 1, bare.out);
  assert.match(bare.out, /published with no job photo of Brian's/);
  assert.match(bare.out, /its related service turf-repair is not confirmed in src\/data\/services\.ts/);

  write('src/content/guides/turf-rules-northern-colorado.md', guide({ ...GUIDE, status: 'published', photos: ['dusk'], related: { services: [], towns: ['fort-collins-co'] }, needsFromBrian: ['How deep he digs in clay'] }, body));
  const ok = run();
  assert.doesNotMatch(ok.out, /published with no job photo|is not confirmed in src\/data\/services/, ok.out);
  assert.match(ok.out, /published with open questions for Brian: How deep he digs in clay/);
});

test('guides: frontmatter is validated, links must be sources, related slugs must exist', (t) => {
  const { write, run } = fixture(t);
  write('src/content/guides/turf-rules-northern-colorado.md', guide(GUIDE, '## Does Fort Collins allow turf?\n\n[Ord. 008](https://example.gov/fort-collins/luc-5-10-1) of 2025 keeps it out of new plans. See [our areas](/areas/).'));
  const ok = run();
  assert.equal(ok.status, 0, ok.out);

  write('src/content/guides/turf-rules-northern-colorado.md', guide({ ...GUIDE, related: { services: ['sod'], towns: ['erie-co'] } },
    'See [a blog](https://blog.example.com/turf) and [our areas](/areas).'));
  const bad = run();
  assert.equal(bad.status, 1, bad.out);
  assert.match(bad.out, /outside link not among this record's sources: https:\/\/blog\.example\.com\/turf/);
  assert.match(bad.out, /internal link without its trailing slash: \/areas/);
  assert.match(bad.out, /related town is not a NoCo town: erie-co/);
  assert.match(bad.out, /related service is not in src\/data\/services\.ts: sod/);

  write('src/content/guides/turf-rules-northern-colorado.md', guide({ ...GUIDE, sources: GUIDE.sources.slice(0, 1) }, 'Body.'));
  const schema = run();
  assert.equal(schema.status, 1, schema.out);
  assert.match(schema.out, /schema: sources/);
});

const SERVICE = {
  status: 'draft', slug: 'pet-turf',
  title: 'Pet Turf and Dog Runs in Northern Colorado | NoCo Turf Co.',
  description: 'Dog runs and pet turf that drain instead of holding odor: what the backing, base and infill decide, and what an HOA can and cannot ask for out back.',
  h1: 'Dog runs smell when urine cannot drain. Build the drainage first.',
  lede: 'Dog runs and side yards for dogs.',
  answer: { question: 'Does pet turf smell?', answer: 'It can, when urine has nowhere to go. Backing and a base that drain keep it down.' },
  faq: [
    { q: 'Will it smell?', a: 'It can, if it does not drain.' },
    { q: 'Will it get hot?', a: 'In full sun, yes.' },
    { q: 'Can dogs dig it?', a: 'They can scratch at it.' },
    { q: 'Can my HOA stop it?', a: 'State law gives a $500 remedy after 45 days.' },
  ],
  layerRefs: ['fixture-fc-luc', 'fixture-co-hoa'],
  sources: GUIDE.sources,
  photos: ['dusk'],
  guides: ['turf-rules-northern-colorado'],
  needsFromBrian: ['Photos of two dog runs'],
};
const SERVICE_BODY = [
  '## Why does pet turf smell?', '', 'Urine that stays put breaks down where it sits.', '',
  '## What goes into a dog run?', '', 'A base that drains, then turf, then infill.', '',
  '## What can the town say?', '', '[Ord. 008](https://example.gov/fort-collins/luc-5-10-1) of 2025 keeps turf out of new plans. See [the rules](/guides/turf-rules-northern-colorado/).',
].join('\n');

test('services: a clean record passes; photo, guide, title, description, answer length and an H1 in the body fail', (t) => {
  const { dir, write, run } = fixture(t);
  write('src/content/guides/turf-rules-northern-colorado.md', guide(GUIDE, '## Does Fort Collins allow turf?\n\nOn existing lots, yes.'));
  write('src/content/services/pet-turf.md', guide(SERVICE, SERVICE_BODY));
  const ok = run();
  assert.equal(ok.status, 0, ok.out);
  assert.match(ok.out, /pet-turf \[service · draft\]/);
  assert.match(ok.out, /needs from Brian: Photos of two dog runs/);

  write('src/content/services/pet-turf.md', guide({
    ...SERVICE,
    title: 'Pet Turf and Dog Runs in Northern Colorado',
    description: 'Dog runs that drain.',
    photos: ['stock-dog'],
    guides: ['no-such-guide'],
    answer: { question: 'Does pet turf smell?', answer: Array.from({ length: 61 }, () => 'word').join(' ') },
  }, `# A second H1\n\n${SERVICE_BODY}`));
  const bad = run();
  assert.equal(bad.status, 1, bad.out);
  assert.match(bad.out, /title must end with "\| NoCo Turf Co\."/);
  assert.match(bad.out, /description is 20 characters — write 140–160/);
  assert.match(bad.out, /photo id is not in src\/data\/photos\.ts: stock-dog/);
  assert.match(bad.out, /guide is not a record in src\/content\/guides\/: no-such-guide/);
  assert.match(bad.out, /answer is 61 words — 60 at most/);
  assert.match(bad.out, /the body has an H1 \("A second H1"\)/);

  fs.rmSync(path.join(dir, 'src/content/services/pet-turf.md'));
  write('src/content/services/putting-greens.md', guide(SERVICE, SERVICE_BODY));
  const named = run();
  assert.equal(named.status, 1, named.out);
  assert.match(named.out, /file name should be pet-turf\.md/);
});

test('services: the claim, number and link rules apply; a statement H2 and a short FAQ only warn', (t) => {
  const { write, run } = fixture(t);
  write('src/content/guides/turf-rules-northern-colorado.md', guide(GUIDE, '## Does Fort Collins allow turf?\n\nOn existing lots, yes.'));
  for (const [extra, expect] of [
    ['The best dog runs in Windsor.', /unsourced business claim "best"/],
    ['A written warranty on every run.', /unsourced business claim "warranty"/],
    ['About 12,500 gallons a year.', /numbers not found in any referenced layer record or source label: 12500/],
    ['We also cover Erie.', /TIMELESS town "Erie"/],
    ['See [a blog](https://blog.example.com/dogs).', /outside link not among this record's sources: https:\/\/blog\.example\.com\/dogs/],
  ]) {
    write('src/content/services/pet-turf.md', guide(SERVICE, `${SERVICE_BODY}\n\n${extra}`));
    const r = run();
    assert.equal(r.status, 1, `${extra}\n${r.out}`);
    assert.match(r.out, expect, extra);
  }
  write('src/content/services/pet-turf.md', guide({ ...SERVICE, faq: SERVICE.faq.slice(0, 2) }, `${SERVICE_BODY}\n\n## A statement heading\n\nText.`));
  const warn = run();
  assert.equal(warn.status, 0, warn.out);
  assert.match(warn.out, /H2 is not shaped as a question: "A statement heading"/);
  assert.match(warn.out, /2 FAQ items — write 4 to 6/);
});

test('services: a referenced record whose fact holds unapproved claim wording fails (the rule sheet prints facts verbatim)', (t) => {
  const { write, run } = fixture(t);
  write('src/content/guides/turf-rules-northern-colorado.md', guide(GUIDE, '## Does Fort Collins allow turf?\n\nOn existing lots, yes.'));
  write('src/data/layers/extra.json', [{
    id: 'fixture-greeley-pending', layer: 'ordinance', applies_to: ['greeley-co'],
    fact: 'Greeley is drafting a change that would require a licensed or certified installer for front-yard turf.',
    quote: 'Licensed/certified installer required', source_url: 'https://example.gov/greeley/pending', source_label: 'Greeley packet',
    checked: '2026-09-24', reachable: true, status: 'VERIFIED', numbers: [],
  }]);
  write('.site/truth/claims.json', { claims: [{ claim: 'Certified installer', aliases: ['certified installer'], status: 'UNKNOWN', approved: false }] });
  write('src/content/services/pet-turf.md', guide({ ...SERVICE, layerRefs: [...SERVICE.layerRefs, 'fixture-greeley-pending'], sources: [...SERVICE.sources, { label: 'Greeley packet', url: 'https://example.gov/greeley/pending', checked: '2026-09-24' }] }, SERVICE_BODY));
  const r = run();
  assert.equal(r.status, 1, r.out);
  assert.match(r.out, /layer fixture-greeley-pending would print "certified installer" in the rule sheet/);
});

// ───────────────────────────── guides at scale: topics, duplicates, overlap, guide-owned layers ─────────────────────────────

/** Letter-only filler words (a digit would need a source), distinct for every i. */
const filler = (from, n) => Array.from({ length: n }, (_, i) => {
  const k = from + i;
  return `ter${String.fromCharCode(97 + (k % 26))}${String.fromCharCode(97 + (Math.floor(k / 26) % 26))}${String.fromCharCode(97 + (Math.floor(k / 676) % 26))}`;
}).join(' ');
/** A guide fixture with its own title, question and answer; `body` is the Markdown after the frontmatter. */
const own = (n, over = {}) => ({
  ...GUIDE, title: `Fixture guide ${filler(n * 7, 2)}`, h1: `Fixture guide ${filler(n * 7, 2)}`,
  answer: { question: `Question ${filler(n * 11, 3)}?`, answer: `Answer ${filler(n * 13, 3)}.` }, ...over,
});

test('guides: a topic outside the registry fails, a guide id that is a topic slug fails, display.paint must be in the h1', (t) => {
  const { dir, write, run } = fixture(t);
  write('src/content/guides/turf-rules-northern-colorado.md', guide({ ...GUIDE, topic: 'lawn' }, 'Body.'));
  const topic = run();
  assert.equal(topic.status, 1, topic.out);
  assert.match(topic.out, /topic "lawn" has no entry in src\/data\/guide-topics\.ts — use one of: pets, weather/);

  write('src/content/guides/turf-rules-northern-colorado.md', guide(GUIDE, 'Body.'));
  write('src/content/guides/water.md', guide(own(1, { topic: 'water' }), 'Other body.'));
  const clash = run();
  assert.equal(clash.status, 1, clash.out);
  assert.match(clash.out, /the guide id "water" is a topic slug — \/guides\/water\/ is that topic's hub/);
  fs.rmSync(path.join(dir, 'src/content/guides/water.md'));

  write('src/content/guides/turf-rules-northern-colorado.md', guide({ ...GUIDE, h1: "HOAs can't ban it", display: { paint: 'town by town' } }, 'Body.'));
  const paint = run();
  assert.equal(paint.status, 1, paint.out);
  assert.match(paint.out, /display\.paint "town by town" is not in the h1/);
  write('src/content/guides/turf-rules-northern-colorado.md', guide({ ...GUIDE, h1: 'HOAs can’t ban it', display: { paint: "can't ban it", crumb: 'Rules' } }, 'Body.'));
  const curly = run();
  assert.equal(curly.status, 0, `a straight apostrophe matches the curly one the H1 prints\n${curly.out}`);
});

test('guides: the same title, or the same answer.question once normalized, as another guide fails', (t) => {
  const { write, run } = fixture(t);
  write('src/content/guides/guide-a.md', guide(own(1), filler(1000, 60)));
  write('src/content/guides/guide-b.md', guide(own(2), filler(2000, 60)));
  const ok = run();
  assert.equal(ok.status, 0, ok.out);

  write('src/content/guides/guide-b.md', guide(own(2, { title: own(1).title }), filler(2000, 60)));
  const title = run();
  assert.equal(title.status, 1, title.out);
  assert.match(title.out, /guides guide-a and guide-b have the same title/);

  write('src/content/guides/guide-b.md', guide(own(2, { answer: { question: `  ${own(1).answer.question.toUpperCase().replace('?', ' ?')}`, answer: 'Its own answer.' } }), filler(2000, 60)));
  const question = run();
  assert.equal(question.status, 1, question.out);
  assert.match(question.out, /guides guide-a and guide-b ask the same answer\.question/);
});

test('guides: more than 25% of five-word runs shared fails with the pair and examples, over 15% warns, distinct guides pass', (t) => {
  const { write, run } = fixture(t);
  // 100 words each → 96 runs each. Shared words s: 60 → 56 runs shared (41%); 40 → 36 runs (23%); 0 → none.
  const pair = (shared) => {
    write('src/content/guides/guide-a.md', guide(own(1), `${filler(0, shared)} ${filler(3000, 100 - shared)}`));
    write('src/content/guides/guide-b.md', guide(own(2), `${filler(0, shared)} ${filler(5000, 100 - shared)}`));
    return run();
  };
  const fail = pair(60);
  assert.equal(fail.status, 1, fail.out);
  assert.match(fail.out, /x FAIL guide overlap guide-a ~ guide-b: \d+\.\d% of five-word runs shared \(\d+ runs\) — limit 25%\. Shared runs include "…teraaa terbaa/);
  const warn = pair(40);
  assert.equal(warn.status, 0, warn.out);
  assert.match(warn.out, /! WARN guide overlap guide-a ~ guide-b: \d+\.\d% of five-word runs shared \(\d+ runs\) — warn above 15%/);
  const clean = pair(0);
  assert.equal(clean.status, 0, clean.out);
  assert.doesNotMatch(clean.out, /guide overlap/);
});

test('guides: naming one file still checks its overlap against every other guide on disk', (t) => {
  const { dir, write, run } = fixture(t);
  write('src/content/guides/guide-a.md', guide(own(1), `${filler(0, 80)} ${filler(3000, 20)}`));
  write('src/content/guides/guide-b.md', guide(own(2), `${filler(0, 80)} ${filler(5000, 20)}`));
  write('src/content/guides/guide-c.md', guide(own(3), filler(7000, 100)));
  const r = run(path.join(dir, 'src/content/guides/guide-c.md'));
  assert.equal(r.status, 0, `guide-c is distinct; the a ~ b pair is not guide-c's to report\n${r.out}`);
  assert.match(r.out, /Guide overlap: guide-c against 2 other guide\(s\) on disk/);
  assert.doesNotMatch(r.out, /guide overlap guide-a ~ guide-b/);
  const a = run(path.join(dir, 'src/content/guides/guide-a.md'));
  assert.equal(a.status, 1, a.out);
  assert.match(a.out, /x FAIL guide overlap guide-a ~ guide-b/);
  assert.match(a.out, /1 record\(s\)/, 'only the named file is checked record by record');
});

test('guide-owned layer files: a record in src/data/layers/guides/ is found; its rules apply; an id in two files fails', (t) => {
  const { dir, write, run } = fixture(t);
  const today = new Date().toISOString().slice(0, 10);
  const rec = (over = {}) => ({
    id: 'turf-rules-northern-colorado.fixture-cure', layer: 'research', applies_to: ['*'],
    fact: 'A fixture fact that gives a homeowner 45 days to cure.', quote: 'The owner has 45 days to cure the violation.',
    source_url: 'https://example.gov/colorado/sb23-178', source_label: 'SB23-178', checked: today, reachable: true, status: 'VERIFIED', numbers: ['45'], ...over,
  });
  const body = '## Does Fort Collins allow turf?\n\nOn existing lots, yes, and an owner gets 45 days to cure.';
  write('src/content/guides/turf-rules-northern-colorado.md', guide({ ...GUIDE, layerRefs: ['turf-rules-northern-colorado.fixture-cure'] }, body));
  write('src/data/layers/guides/turf-rules-northern-colorado.json', [rec()]);
  const ok = run();
  assert.equal(ok.status, 0, ok.out);
  assert.doesNotMatch(ok.out, /is not in src\/data\/layers/);

  write('src/data/layers/guides/turf-rules-northern-colorado.json', [rec({ source_url: 'http://example.gov/colorado/sb23-178', recheck: '2020-01-01' }), rec({ id: 'fixture-cure' })]);
  const rules = run(path.join(dir, 'src/content/guides/turf-rules-northern-colorado.md'));
  assert.equal(rules.status, 1, rules.out);
  assert.match(rules.out, /layer file: guides\/turf-rules-northern-colorado\.json turf-rules-northern-colorado\.fixture-cure: source_url must be an https URL/);
  assert.match(rules.out, /layer file: .*recheck 2020-01-01 has passed/);
  assert.match(rules.out, /layer file: guides\/turf-rules-northern-colorado\.json fixture-cure: ids in a guide's own file start with "turf-rules-northern-colorado\."/);

  write('src/data/layers/guides/turf-rules-northern-colorado.json', [rec(), rec({ id: 'fixture-fc-luc' })]);
  const dup = run();
  assert.equal(dup.status, 1, dup.out);
  assert.match(dup.out, /x FAIL duplicate layer id fixture-fc-luc \(src\/data\/layers\/fixtures\.json and src\/data\/layers\/guides\/turf-rules-northern-colorado\.json\)/);
});

test('the real repo passes (towns, guides and work may not exist yet)', () => {
  const r = spawnSync(process.execPath, [path.join(root, 'scripts/check-content.mjs')], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /Town gate/);
});

test('Brian\'s no stands: no page promises that NoCo checks town or HOA rules (claims register, 2026-09-29)', () => {
  const no = JSON.parse(read('.site/truth/claims.json')).claims.find((c) => c.claim === 'We check your town and HOA rules before we quote');
  assert.ok(no, 'the protective claims entry is in .site/truth/claims.json');
  assert.equal(no.approved, false);
  const norm = (s) => ` ${s.toLowerCase().replace(/[’']/g, ' ').replace(/[^a-z0-9]+/g, ' ').trim()} `;
  const phrases = [no.claim, ...no.aliases].map(norm);
  // check-content holds records to the register; the templates, sales copy and registries are held here.
  const files = fs.readdirSync(path.join(root, 'src'), { recursive: true })
    .map((f) => path.join('src', String(f)))
    .filter((f) => /\.(astro|ts|mjs|md|json)$/.test(f) && !f.startsWith(path.join('src', 'data', 'layers')));
  assert.ok(files.length > 100, `scanned ${files.length} files`);
  for (const f of files) {
    const t = norm(read(f));
    for (const p of phrases) assert.ok(!t.includes(p), `${f} says "${p.trim()}"`);
  }
});
