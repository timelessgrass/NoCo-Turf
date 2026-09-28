/**
 * Community pages (/areas/{town}-co/{community}/): the registry (src/data/communities.mjs), the collection schema
 * (src/content.config.ts `communities`), the gate and the visibility rule (src/lib/community-gate.mjs), the path
 * collision guard shared with the town × service pages, the community-owned layer directory
 * (src/data/layers/communities/, scripts/check-layers.mjs OWNER_DIRS), what scripts/check-content.mjs holds a record
 * to — file name, reserved slugs, governing and golf, the demographics ban and the sales-word warning, the overlap
 * gates, the gate report and single-file mode — llms.txt nesting, and the guides' optional `photos` field.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import {
  COMMUNITY_KINDS, GOVERNING_TYPES, RESERVED_COMMUNITY_SLUGS, communitySlugProblem, communityId, parseCommunityId, communityPath,
} from '../src/data/communities.mjs';
import { TOWN_SERVICE_SLUGS, townServiceId } from '../src/data/town-services.mjs';
import { communityGate, communityVisibility, photoBelongs } from '../src/lib/community-gate.mjs';
import { assertAreaChildren } from '../src/lib/content-policy.mjs';
import { loadCollections } from '../scripts/check-content.mjs';
import { checkLayers } from '../scripts/check-layers.mjs';
import { buildLlms } from '../scripts/md-mirrors.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8');

/** Letter-only filler words (a digit would need a source), distinct for every k. */
const filler = (from, n) => Array.from({ length: n }, (_, i) => {
  const k = from + i;
  return `ter${String.fromCharCode(97 + (k % 26))}${String.fromCharCode(97 + (Math.floor(k / 26) % 26))}${String.fromCharCode(97 + (Math.floor(k / 676) % 26))}`;
}).join(' ');

const TOWN = { 'windsor-co': 'Windsor', 'timnath-co': 'Timnath', 'mead-co': 'Mead' };
const title = (s) => s.split('-').map((w) => w[0].toUpperCase() + w.slice(1)).join(' ');

/** A clean draft community record: three blocks of ≥30 words, two own, sourced, a photo taken in its town. */
function community(town, slug, over = {}, seed = 0) {
  const name = title(slug);
  const blk = (kind, own, from) => ({ kind, own, kicker: kind, h2: `A fixture heading ${filler(from, 2)}`, paras: [filler(from, 40)], layerRefs: [], sources: ['https://example.gov/one'] });
  return {
    status: 'draft', town, slug, name, kind: 'golf',
    title: `Artificial Turf in ${name}, ${TOWN[town]} | NoCo Turf Co.`,
    description: `What ${name} asks of a backyard.`,
    h1: `A fixture headline for ${name}`,
    lede: filler(seed + 10000, 12),
    answer: { question: `Fixture question ${filler(seed + 20000, 2)}?`, answer: filler(seed + 30000, 20) },
    blocks: [blk('hoa', true, seed + 40000), blk('golf', true, seed + 50000), blk('soil', false, seed + 60000)],
    faq: [],
    photo: 'dusk', // "Near Windsor"
    sources: [
      { label: 'Fixture source one', url: 'https://example.gov/one', checked: '2026-09-24' },
      { label: 'Fixture source two', url: 'https://example.gov/two', checked: '2026-09-24' },
    ],
    checked: '2026-09-24',
    needsFromBrian: ['A job inside this community'],
    ...over,
  };
}
/** The same record cut to one block of `text` — overlap fixtures, where the other blocks would dilute the pair. */
const only = (c, text) => ({ ...c, blocks: [{ ...c.blocks[0], paras: [text] }] });

// ───────────────────────────── the registry ─────────────────────────────

test('a community slug is kebab-case and never a town × service slug or a reserved word', () => {
  for (const s of TOWN_SERVICE_SLUGS) {
    assert.ok(RESERVED_COMMUNITY_SLUGS.includes(s), `${s} is reserved`);
    assert.match(communitySlugProblem(s), /is a town × service slug/);
  }
  for (const s of ['artificial-turf-installation', 'turf-repair', 'neighborhoods', 'index']) assert.match(communitySlugProblem(s), /is reserved/);
  assert.match(communitySlugProblem('Highland_Meadows'), /kebab-case/);
  assert.match(communitySlugProblem(''), /kebab-case/);
  assert.equal(communitySlugProblem('highland-meadows'), null);
  assert.deepEqual(COMMUNITY_KINDS, ['golf', 'custom-homes', 'lake', 'estate-lots', 'master-planned']);
  assert.deepEqual(GOVERNING_TYPES, ['hoa', 'metro-district', 'both', 'none-found']);
});

test('the id is {town}--{community}, two hyphens, and parses back; the path sits under the town', () => {
  assert.equal(communityId('windsor-co', 'highland-meadows'), 'windsor-co--highland-meadows');
  assert.deepEqual(parseCommunityId('fort-collins-co--harmony-club'), { town: 'fort-collins-co', slug: 'harmony-club' });
  assert.equal(parseCommunityId('windsor-co-highland-meadows'), null);
  assert.equal(communityPath('windsor-co', 'highland-meadows'), '/areas/windsor-co/highland-meadows/');
});

// ───────────────────────────── the schema ─────────────────────────────

test('the schema takes a clean record and holds town, slug, kind, governing, golf, title, blocks, faq, sources and dates', async () => {
  const { communities } = await loadCollections();
  const ok = community('windsor-co', 'highland-meadows', {
    display: { paint: 'fixture headline' },
    governing: { name: 'Fixture HOA', type: 'hoa', url: 'https://example.gov/one', layerRefs: ['x'] },
    golf: { name: 'Fixture Links', layerRef: 'y' },
  });
  const r = communities.safeParse(ok);
  assert.equal(r.success, true, JSON.stringify(r.error?.issues));
  const bad = (over, why) => assert.equal(communities.safeParse({ ...ok, ...over }).success, false, why);
  bad({ town: 'erie-co' }, 'a TIMELESS town');
  bad({ slug: 'putting-greens' }, 'a service slug');
  bad({ slug: 'pet-turf' }, 'a service slug');
  bad({ slug: 'neighborhoods' }, 'a reserved word');
  bad({ slug: 'Highland Meadows' }, 'not kebab-case');
  bad({ kind: 'resort' }, 'a kind outside the registry');
  bad({ governing: { name: 'Fixture HOA', type: 'club' } }, 'a governing type outside the registry');
  bad({ governing: { name: 'Fixture HOA', type: 'hoa', url: 'not a url' } }, 'a governing url that is not a URL');
  bad({ golf: { name: 'Fixture Links' } }, 'a course with no record behind it');
  bad({ title: `${'x'.repeat(60)} | NoCo Turf Co.` }, 'over 70 characters');
  bad({ title: 'Artificial Turf in Highland Meadows' }, 'no brand suffix');
  bad({ description: 'x'.repeat(161) }, 'over 160 characters');
  bad({ blocks: [] }, 'no blocks');
  bad({ blocks: Array(8).fill(ok.blocks[0]) }, 'more than seven blocks');
  bad({ faq: Array(7).fill({ q: 'Q?', a: 'A.' }) }, 'more than six FAQ items');
  bad({ sources: ok.sources.slice(0, 1) }, 'one source');
  bad({ checked: 'September 2026' }, 'checked is a date');
  const { photo, display, governing, golf, ...bare } = ok;
  assert.equal(communities.safeParse(bare).success, true, 'photo, display, governing and golf are optional in a draft');
  const reserved = communities.safeParse({ ...ok, slug: 'commercial-turf' });
  assert.ok(reserved.error.issues.some((i) => /is a town × service slug/.test(i.message)), 'the schema says why');
});

test('a guide takes up to three photos.ts ids as `photos`', async () => {
  const { guides } = await loadCollections();
  const g = {
    status: 'draft', topic: 'putting-greens', title: 'Putting green design | NoCo Turf Co.', description: 'd', h1: 'h',
    answer: { question: 'q?', answer: 'a' }, sources: [{ label: 'a', url: 'https://example.gov/a', checked: '2026-09-24' }, { label: 'b', url: 'https://example.gov/b', checked: '2026-09-24' }],
    published: '2026-09-24', updated: '2026-09-24',
  };
  assert.deepEqual(guides.parse(g).photos, [], 'defaults to none');
  assert.deepEqual(guides.parse({ ...g, photos: ['dusk', 'boulders'] }).photos, ['dusk', 'boulders']);
  assert.equal(guides.safeParse({ ...g, photos: ['dusk', 'boulders', 'fire-pit', 'street-view'] }).success, false, 'a strip, not a gallery');
});

// ───────────────────────────── the gate ─────────────────────────────

const PHOTOS = [
  { id: 'dusk', place: 'Near Windsor' },
  { id: 'fire-pit', place: 'Near Berthoud' },
  { id: 'hm-green', place: 'Highland Meadows, Windsor' },
  { id: 'tagged', place: 'north of town', community: 'timnath-co--harmony-club' },
];

test('three substantive blocks, two own, every block sourced, and a photo taken in the community pass', () => {
  assert.deepEqual(communityGate(community('windsor-co', 'highland-meadows', { photo: 'hm-green' }), PHOTOS), { pass: true, reasons: [] });
  assert.equal(communityGate(community('windsor-co', 'highland-meadows'), new Map([['dusk', { place: 'Highland Meadows, Windsor' }]])).pass, true, 'a Map of id → place works too');
  assert.equal(communityGate(community('windsor-co', 'highland-meadows'), PHOTOS).pass, false, 'a photo from elsewhere in the town is not proof of work in this neighborhood');
});

test('thin blocks, too few own blocks and an unsourced block fail; a job, photo or review block needs no source', () => {
  const thin = community('windsor-co', 'highland-meadows');
  thin.blocks[1] = { ...thin.blocks[1], paras: ['Too short to count.'] };
  const g = communityGate(thin, PHOTOS);
  assert.ok(g.reasons.some((r) => /2 substantive blocks — needs ≥3 \(a block counts from 30 words; block 2 \(golf\) has 4\)/.test(r)), g.reasons.join('; '));
  assert.ok(g.reasons.some((r) => /1 own blocks \(true of this community only\) — needs ≥2/.test(r)));
  const shared = community('windsor-co', 'highland-meadows');
  shared.blocks = shared.blocks.map((b) => ({ ...b, own: false }));
  assert.ok(communityGate(shared, PHOTOS).reasons.some((r) => /0 own blocks/.test(r)));
  const bare = community('windsor-co', 'highland-meadows');
  bare.blocks[0] = { ...bare.blocks[0], sources: [], layerRefs: [] };
  assert.ok(communityGate(bare, PHOTOS).reasons.some((r) => /block 1 \(hoa\) has no source and no layer reference/.test(r)));
  bare.blocks[0] = { ...bare.blocks[0], kind: 'job' };
  bare.photo = 'hm-green';
  assert.equal(communityGate(bare, PHOTOS).pass, true, 'a job block comes from Brian\'s ledger');
});

test('the photo must exist and belong here: its place names the community, or its community is this one — the town is not enough', () => {
  const none = communityGate(community('windsor-co', 'highland-meadows', { photo: undefined }), PHOTOS);
  assert.ok(none.reasons.some((r) => /no photograph — needs a real photo from src\/data\/photos\.ts whose place names Highland Meadows \(or whose community is windsor-co--highland-meadows\)/.test(r)), none.reasons.join('; '));
  const missing = communityGate(community('windsor-co', 'highland-meadows', { photo: 'stock-green' }), PHOTOS);
  assert.ok(missing.reasons.some((r) => /photo "stock-green" is not in src\/data\/photos\.ts/.test(r)));
  const elsewhere = communityGate(community('windsor-co', 'highland-meadows', { photo: 'fire-pit' }), PHOTOS);
  assert.ok(elsewhere.reasons.some((r) => /photo "fire-pit" was taken Near Berthoud — a Highland Meadows page needs a photo whose place names Highland Meadows, or tagged community windsor-co--highland-meadows/.test(r)), elsewhere.reasons.join('; '));
  assert.equal(photoBelongs(PHOTOS[3], { town: 'timnath-co', slug: 'harmony-club', name: 'Harmony Club' }), true, 'tagged by id');
  assert.equal(photoBelongs(PHOTOS[3], { town: 'windsor-co', slug: 'harmony-club', name: 'Harmony Club' }), false, 'the same slug in another town is another community');
});

test('an empty or missing record fails without throwing, and lists every missing piece', () => {
  for (const data of [undefined, null, {}, { blocks: [] }]) {
    const g = communityGate(data, PHOTOS);
    assert.equal(g.pass, false);
    assert.ok(g.reasons.length >= 3, g.reasons.join('; '));
  }
});

// ───────────────────────────── visibility ─────────────────────────────

const ctx = (over = {}) => ({ showDrafts: false, townVisible: true, townPublished: true, photos: PHOTOS, ...over });

test('PRELAUNCH preview: every record renders while its town page is visible, drafts with the ribbon', () => {
  const draft = community('windsor-co', 'highland-meadows', { photo: undefined }); // fails the gate
  const v = communityVisibility(draft, ctx({ showDrafts: true }));
  assert.deepEqual([v.render, v.draft, v.sitemap], [true, true, false]);
  assert.equal(communityVisibility(draft, ctx({ showDrafts: true, townVisible: false })).render, false, 'no town page, no community page');
});

test('launch: a published record that passes the gate, with its town page visible; the sitemap needs the town published', () => {
  const passing = community('windsor-co', 'highland-meadows', { status: 'published', photo: 'hm-green' });
  const v = communityVisibility(passing, ctx());
  assert.deepEqual([v.render, v.sitemap, v.draft], [true, true, false]);
  assert.equal(communityVisibility({ ...passing, status: 'review' }, ctx()).render, false, 'in review');
  assert.equal(communityVisibility({ ...passing, photo: undefined }, ctx()).render, false, 'published but failing the gate');
  assert.equal(communityVisibility({ ...passing, photo: undefined }, ctx()).sitemap, false);
  assert.equal(communityVisibility(passing, ctx({ townVisible: false, townPublished: false })).render, false, 'its town page is not visible');
  assert.equal(communityVisibility(passing, ctx({ showDrafts: true, townPublished: false })).sitemap, false, 'its town is not published');
});

// ───────────────────────────── the route and the links in ─────────────────────────────

test('two records claiming one /areas/{town}-co/{segment}/ path stop the build, naming both', () => {
  assert.doesNotThrow(() => assertAreaChildren([
    { path: '/areas/windsor-co/putting-greens/', what: 'town-services/windsor-co--putting-greens.json' },
    { path: '/areas/windsor-co/highland-meadows/', what: 'communities/windsor-co--highland-meadows.json' },
  ]));
  assert.throws(() => assertAreaChildren([
    { path: '/areas/windsor-co/putting-greens/', what: 'town-services/windsor-co--putting-greens.json' },
    { path: '/areas/windsor-co/putting-greens/', what: 'communities/windsor-co--putting-greens.json' },
  ]), /\/areas\/windsor-co\/putting-greens\/ is claimed twice: by town-services\/windsor-co--putting-greens\.json and by communities\/windsor-co--putting-greens\.json/);
});

test('one route renders both kinds and guards collisions; the town × service pages link no community CSS', () => {
  const route = read('src/pages/areas/[slug]/[service].astro');
  assert.match(route, /assertAreaChildren\(/);
  assert.match(route, /visibleCommunities\(\)/);
  assert.match(route, /visibleTownServices\(\)/);
  const imports = route.split('\n---\n')[0].split('\n').filter((l) => /^import /.test(l));
  assert.match(imports.at(-1), /community\.css\?url/, 'the ?url import comes last, so the service pages\' stylesheet order never moves');
  assert.match(route, /styles=\{\[communityCss\]\}/, 'community pages alone link it');
  for (const f of ['src/components/CommunityFacts.astro', 'src/components/CommunityReview.astro']) {
    assert.doesNotMatch(read(f), /^\s*<style[\s>]/m, `${f} renders inside the shared route: no scoped style`);
  }
  assert.ok(!fs.existsSync(path.join(root, 'src/pages/areas/[slug]/[community].astro')), 'one route file, not two');
});

test('the links in, the sitemap and the readers use the one visibility rule', () => {
  assert.match(read('src/lib/visible.ts'), /communityVisibility\(/);
  assert.match(read('src/lib/published-content.ts'), /communityVisibility\([\s\S]*?\.sitemap/);
  assert.match(read('src/pages/sitemap.xml.ts'), /publishedCommunities\(\)/);
  assert.match(read('src/pages/areas/[slug].astro'), /<TownCommunities /);
  assert.match(read('src/pages/areas/index.astro'), /<AreasCommunities /);
  assert.match(read('src/pages/areas/[slug]/[service].astro'), /golfHere/);
  assert.match(read('src/content.config.ts'), /generateId: \(\{ entry \}\) => entry\.replace/, 'the entry id is the file name, not the slug field');
});

// ───────────────────────────── the community-owned layer directory ─────────────────────────────

const LTODAY = '2026-09-24';
const rec = (over = {}) => ({
  id: 'windsor-co--highland-meadows.arc-turf', layer: 'housing', applies_to: ['windsor-co'],
  fact: 'The Highland Meadows committee reviews turf in back yards.', quote: 'Turf in back yards requires committee review.',
  source_url: 'https://example.gov/hm', source_label: 'Highland Meadows design guidelines', checked: LTODAY, reachable: true, status: 'VERIFIED', numbers: [], ...over,
});
function layers(files, opts = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'layers-cm-'));
  try {
    for (const [f, data] of Object.entries(files)) {
      fs.mkdirSync(path.dirname(path.join(dir, f)), { recursive: true });
      fs.writeFileSync(path.join(dir, f), JSON.stringify(data));
    }
    return checkLayers({ dir, today: LTODAY, expectFiles: false, towns: [], ...opts });
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}
const failsWith = (res, re) => assert.ok(res.errors.some((e) => re.test(e)), `expected a FAIL matching ${re}, got:\n${res.errors.join('\n') || '(none)'}`);
const warnsWith = (res, re) => assert.ok(res.warnings.some((e) => re.test(e)), `expected a WARN matching ${re}, got:\n${res.warnings.join('\n') || '(none)'}`);

test('community-owned files: read like any other layer file, one per community, under every rule', () => {
  const ok = layers({ 'communities/windsor-co--highland-meadows.json': [rec()] });
  assert.deepEqual(ok.errors, [], ok.errors.join('\n'));
  assert.equal(ok.stats.communityFiles, 1);
  assert.ok(ok.records.some((r) => r.id === 'windsor-co--highland-meadows.arc-turf' && r._file === 'communities/windsor-co--highland-meadows.json'));
  failsWith(layers({ 'communities/windsor-co--highland-meadows.json': [rec({ recheck: '2026-09-01' })] }), /recheck 2026-09-01 has passed/);
  failsWith(layers({ 'communities/windsor-co--highland-meadows.json': [rec({ source_url: 'http://example.gov/x' })] }), /must be an https URL/);
});

test('community-owned files: named for a community id with a NoCo town and an unreserved slug; ids carry the prefix; records apply to the town', () => {
  failsWith(layers({ 'communities/highland-meadows.json': [rec({ id: 'highland-meadows.x' })] }), /communities\/highland-meadows\.json: the file name must be a community id/);
  failsWith(layers({ 'communities/erie-co--vista.json': [rec({ id: 'erie-co--vista.x' })] }), /the file name must be a community id/);
  failsWith(layers({ 'communities/windsor-co--pet-turf.json': [rec({ id: 'windsor-co--pet-turf.x' })] }), /community slug "pet-turf" is a town × service slug/);
  failsWith(layers({ 'communities/windsor-co--highland-meadows.json': [rec({ id: 'arc-turf' })] }),
    /ids in a community's own file start with "windsor-co--highland-meadows\." \(e\.g\. "windsor-co--highland-meadows\.arc-turf"\)/);
  failsWith(layers({ 'communities/windsor-co--highland-meadows.json': [rec({ applies_to: ['mead-co'] })] }),
    /a record in windsor-co--highland-meadows's own file applies to windsor-co — its applies_to is \["mead-co"\]/);
  warnsWith(layers({ 'communities/windsor-co--highland-meadows.json': [rec({ applies_to: ['windsor-co', 'timnath-co'] })] }), /applies to other towns too/);
  warnsWith(layers({ 'communities/windsor-co--highland-meadows.json': [rec()] }, { communityIds: new Set(['windsor-co--pelican-lakes']) }),
    /no community src\/content\/communities\/windsor-co--highland-meadows\.json yet/);
  const dup = layers({ 'local/windsor-co.json': [rec({ id: 'windsor-co.x' })], 'communities/windsor-co--highland-meadows.json': [rec({ id: 'windsor-co.x' })] });
  failsWith(dup, /duplicate id/);
  // a record id takes "--" only after a community id's town
  failsWith(layers({ 'city-codes.json': [rec({ id: 'fixture--a--b' })] }), /id must be kebab-case/);
  failsWith(layers({ 'city-codes.json': [rec({ id: 'fixture.a--b' })] }), /id must be kebab-case/);
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
  const dir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'noco communities ')));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const write = (file, value) => {
    const dest = path.join(dir, file);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, typeof value === 'string' ? value : JSON.stringify(value, null, 1));
    return dest;
  };
  write('src/data/layers/fixtures.json', LAYERS);
  for (const d of ['towns', 'town-services', 'communities', 'guides', 'services', 'work']) fs.mkdirSync(path.join(dir, 'src/content', d), { recursive: true });
  const run = (...args) => {
    const r = spawnSync(process.execPath, [path.join(root, 'scripts/check-content.mjs'), '--root', dir, ...args], { encoding: 'utf8' });
    return { ...r, out: r.stdout + r.stderr };
  };
  const put = (c, name = communityId(c.town, c.slug)) => write(`src/content/communities/${name}.json`, c);
  return { dir, write, run, put };
}

/** A town record whose body is `paras` (for the parent-overlap check). */
const townRecord = (slug, paras) => ({
  status: 'draft', slug, name: TOWN[slug], region: 'windsor-johnstown',
  title: `Artificial Turf in ${TOWN[slug]}, CO | NoCo Turf Co.`, description: 'A fixture town.', h1: 'A fixture town', lede: 'Lede.',
  answer: { question: 'Can I?', answer: 'Usually.' },
  blocks: [0, 1, 2].map((i) => ({ kind: 'housing', own: true, kicker: 'k', h2: 'h', paras: i ? ['Short.'] : [paras], layerRefs: [], sources: ['https://example.gov/one'] })),
  nearby: ['timnath-co', 'severance-co'],
  sources: [{ label: 'One', url: 'https://example.gov/one', checked: '2026-09-24' }, { label: 'Two', url: 'https://example.gov/two', checked: '2026-09-24' }],
  checked: '2026-09-24',
});
/** A putting-green page for a town whose one block is `text` (for the putting-green overlap check). */
const greenPage = (town, text) => ({
  status: 'draft', town, service: 'putting-greens',
  title: `Backyard Putting Greens in ${TOWN[town]}, CO | NoCo Turf Co.`, description: 'd', h1: 'h', lede: filler(97000, 12),
  answer: { question: 'q?', answer: filler(98000, 20) },
  blocks: [{ kind: 'golf', own: true, kicker: 'k', h2: 'h', paras: [text], layerRefs: [], sources: ['https://example.gov/one'] }],
  faq: [], sources: [{ label: 'One', url: 'https://example.gov/one', checked: '2026-09-24' }, { label: 'Two', url: 'https://example.gov/two', checked: '2026-09-24' }],
  checked: '2026-09-24',
});

test('a clean draft passes; the gate report names the page and what Brian must send', (t) => {
  const { run, put } = fixture(t);
  put(community('windsor-co', 'highland-meadows', { photo: undefined }));
  const r = run();
  assert.equal(r.status, 0, r.out);
  assert.match(r.out, /windsor-co--highland-meadows \[community · draft\]/);
  assert.match(r.out, /community gate not met yet \(draft\): no photograph/);
  assert.match(r.out, /Community gate — src\/lib\/community-gate\.mjs/);
  assert.match(r.out, /windsor-co--highland-meadows\s+draft\s+3 blocks \(3 substantive\) · 2 own · no photo — gate not yet/);
  assert.match(r.out, /needs from Brian: A job inside this community/);
});

test('a published page that fails the gate fails the check, including one whose only photo is from elsewhere in its town', (t) => {
  const { run, put } = fixture(t);
  put(community('windsor-co', 'highland-meadows', { status: 'published', photo: 'fire-pit' }));
  const bad = run();
  assert.equal(bad.status, 1, bad.out);
  assert.match(bad.out, /published but fails the community gate: photo "fire-pit" was taken Near Berthoud/);
  assert.match(bad.out, /windsor-co--highland-meadows\s+published\s+.*— gate FAIL/);
  put(community('windsor-co', 'highland-meadows', { status: 'published' })); // 'dusk': Near Windsor, not Highland Meadows
  const town = run();
  assert.equal(town.status, 1, town.out);
  assert.match(town.out, /photo "dusk" was taken Near Windsor — a Highland Meadows page needs a photo whose place names Highland Meadows/);
});

test('the file name is {town}--{slug}.json and must match; a service slug or a reserved word fails', (t) => {
  const { dir, run, put } = fixture(t);
  put(community('windsor-co', 'highland-meadows'), 'windsor-co--pelican-lakes');
  const wrong = run();
  assert.equal(wrong.status, 1, wrong.out);
  assert.match(wrong.out, /file name should be windsor-co--highland-meadows\.json \(town "windsor-co", slug "highland-meadows"\)/);
  fs.rmSync(path.join(dir, 'src/content/communities/windsor-co--pelican-lakes.json'));

  put(community('windsor-co', 'highland-meadows'), 'highland-meadows');
  assert.match(run().out, /file name must be \{town-slug\}--\{community-slug\}\.json, two hyphens between/);
  fs.rmSync(path.join(dir, 'src/content/communities/highland-meadows.json'));

  put(community('windsor-co', 'putting-greens'));
  put(community('windsor-co', 'neighborhoods'));
  put(community('erie-co', 'vista'));
  const reserved = run();
  assert.equal(reserved.status, 1, reserved.out);
  assert.match(reserved.out, /community slug "putting-greens" is a town × service slug — .* the page would share \/areas\/windsor-co\/putting-greens\/ with it/);
  assert.match(reserved.out, /community slug "neighborhoods" is reserved under \/areas\/\{town\}-co\//);
  assert.match(reserved.out, /erie-co is not a NoCo town/);
});

test('the town rules hold, and the demographics ban; sales words warn', (t) => {
  const { run, put } = fixture(t);
  for (const [over, expect] of [
    [{ lede: 'Neighbors in Erie too.' }, /TIMELESS town "Erie"/],
    [{ lede: 'The best greens in town.' }, /unsourced business claim "best"/],
    [{ lede: 'About 12,500 gallons a year.' }, /numbers not found in any referenced layer record or source label: 12500/],
    [{ lede: 'See https://blog.example.com/hm for more.' }, /outside link not among this record's sources/],
    [{ lede: 'An affluent golf neighborhood.' }, /demographic or wealth language "affluent"/],
    [{ lede: 'Home values here run high.' }, /demographic or wealth language "Home values"/],
    [{ title: 'Artificial Turf in Highland Meadows, Windsor' }, /title must end with "\| NoCo Turf Co\."/],
    [{ display: { paint: 'not in the headline' } }, /display\.paint "not in the headline" is not in the h1/],
    [{ photo: 'stock-green' }, /photo id is not in src\/data\/photos\.ts: stock-green/],
  ]) {
    put(community('windsor-co', 'highland-meadows', over));
    const r = run();
    assert.equal(r.status, 1, `${JSON.stringify(over)}\n${r.out}`);
    assert.match(r.out, expect, JSON.stringify(over));
  }
  for (const word of ['luxury', 'exclusive', 'prestigious', 'high-end']) {
    put(community('windsor-co', 'highland-meadows', { lede: `A ${word} golf neighborhood.` }));
    const r = run();
    assert.equal(r.status, 0, `${word} warns, it does not fail\n${r.out}`);
    assert.match(r.out, new RegExp(`! "${word}" sells the neighborhood by its price`));
  }
});

test('governing: its url must be a source; golf: its name must be in its record; a golf community without one warns', (t) => {
  const { write, run, put } = fixture(t);
  const today = new Date().toISOString().slice(0, 10);
  write('src/data/layers/local/windsor-co.json', [{
    id: 'windsor-co.fixture-links', layer: 'place', applies_to: ['windsor-co'], fact: 'Fixture Links is a golf course in Windsor.', quote: 'Fixture Links welcomes public play.',
    source_url: 'https://example.gov/links', source_label: 'Fixture Links', checked: today, reachable: true, status: 'VERIFIED', numbers: [],
  }]);
  put(community('windsor-co', 'highland-meadows', { governing: { name: 'Fixture HOA', type: 'hoa', url: 'https://example.gov/hoa-guidelines' } }));
  const gov = run();
  assert.equal(gov.status, 1, gov.out);
  assert.match(gov.out, /governing\.url is not among this record's sources: https:\/\/example\.gov\/hoa-guidelines/);
  assert.match(gov.out, /governing\.layerRefs is empty/);
  assert.match(gov.out, /a golf community with no `golf`/);

  put(community('windsor-co', 'highland-meadows', { golf: { name: 'Other Course', layerRef: 'windsor-co.fixture-links' } }));
  assert.match(run().out, /golf\.name "Other Course" is not named by its record windsor-co\.fixture-links/);
  put(community('windsor-co', 'highland-meadows', { golf: { name: 'Fixture Links', layerRef: 'windsor-co.fixture-links' } }));
  const ok = run();
  assert.equal(ok.status, 0, ok.out);
  assert.doesNotMatch(ok.out, /golf\.name/);
});

test('overlap: two communities in one town fail above 25% and warn above 15%; in two towns, only above 25% fails', (t) => {
  const { run, put } = fixture(t);
  // one 100-word block plus the 32-word lede and answer; shared words s → shared runs: 60 → about 28%, 40 → about 16%
  const pair = (shared, town2) => {
    put(only(community('windsor-co', 'highland-meadows', {}, 0), `${filler(0, shared)} ${filler(70000, 100 - shared)}`));
    put(only(community(town2, 'pelican-lakes', {}, 3000), `${filler(0, shared)} ${filler(80000, 100 - shared)}`));
    return run();
  };
  const fail = pair(60, 'windsor-co');
  assert.equal(fail.status, 1, fail.out);
  assert.match(fail.out, /x FAIL community overlap windsor-co--highland-meadows ~ windsor-co--pelican-lakes: \d+\.\d% of five-word runs shared \(\d+ runs\) — limit 25%\. Shared runs include "…teraaa terbaa/);
  const warn = pair(40, 'windsor-co');
  assert.equal(warn.status, 0, warn.out);
  assert.match(warn.out, /! WARN community overlap windsor-co--highland-meadows ~ windsor-co--pelican-lakes: .* — warn above 15% \(same town\)/);
});

test('overlap: across towns, above 25% fails and 15–25% is not reported', (t) => {
  const { dir, run, put } = fixture(t);
  const pair = (shared) => {
    for (const f of fs.readdirSync(path.join(dir, 'src/content/communities'))) fs.rmSync(path.join(dir, 'src/content/communities', f));
    put(only(community('windsor-co', 'highland-meadows', {}, 0), `${filler(0, shared)} ${filler(70000, 100 - shared)}`));
    put(only(community('timnath-co', 'harmony-club', {}, 3000), `${filler(0, shared)} ${filler(80000, 100 - shared)}`));
    return run();
  };
  const fail = pair(60);
  assert.equal(fail.status, 1, fail.out);
  assert.match(fail.out, /x FAIL community overlap .*harmony-club.* limit 25%/);
  const quiet = pair(40);
  assert.equal(quiet.status, 0, quiet.out);
  assert.doesNotMatch(quiet.out, /community overlap/);
});

test('overlap: a community over 25% alike with its own town record, or its town\'s putting-green page, fails', (t) => {
  const { write, run, put } = fixture(t);
  put(only(community('windsor-co', 'highland-meadows'), `${filler(0, 70)} ${filler(90000, 30)}`));
  write('src/content/towns/windsor-co.json', townRecord('windsor-co', `${filler(0, 70)} ${filler(95000, 30)}`));
  const town = run();
  assert.equal(town.status, 1, town.out);
  assert.match(town.out, /x FAIL community overlap windsor-co--highland-meadows ~ its town record windsor-co: .* — limit 25%\. .*Say a town-wide fact once/);

  write('src/content/towns/windsor-co.json', townRecord('windsor-co', filler(99000, 60)));
  write(`src/content/town-services/${townServiceId('windsor-co', 'putting-greens')}.json`, greenPage('windsor-co', `${filler(0, 70)} ${filler(96000, 30)}`));
  const green = run();
  assert.equal(green.status, 1, green.out);
  assert.match(green.out, /x FAIL community overlap windsor-co--highland-meadows ~ its town's putting-green page windsor-co--putting-greens: .* — limit 25%/);
});

test('single-file mode: a named community is checked against every community, its town record and its putting-green page on disk', (t) => {
  const { dir, write, run, put } = fixture(t);
  const a = put(only(community('windsor-co', 'highland-meadows', {}, 0), `${filler(0, 80)} ${filler(70000, 20)}`));
  put(only(community('windsor-co', 'pelican-lakes', {}, 3000), `${filler(0, 80)} ${filler(80000, 20)}`));
  const c = put(community('mead-co', 'mead-lakes', { photo: undefined }, 6000));
  write('src/content/towns/windsor-co.json', townRecord('windsor-co', filler(99000, 60)));
  write(`src/content/town-services/${townServiceId('windsor-co', 'putting-greens')}.json`, greenPage('windsor-co', filler(99500, 60)));

  const named = run(a);
  assert.equal(named.status, 1, named.out);
  assert.match(named.out, /1 record\(s\)/, 'only the named file is checked record by record');
  assert.match(named.out, /Community overlap: windsor-co--highland-meadows against 4 other record\(s\) on disk/);
  assert.match(named.out, /x FAIL community overlap windsor-co--highland-meadows ~ windsor-co--pelican-lakes/);

  const clean = run(c);
  assert.equal(clean.status, 0, `mead-lakes is distinct; the windsor pair is not its to report\n${clean.out}`);
  assert.doesNotMatch(clean.out, /highland-meadows ~ windsor-co--pelican-lakes/);

  // naming the town record compares it with its communities
  const town = run(path.join(dir, 'src/content/towns/windsor-co.json'));
  assert.match(town.out, /Community overlap: windsor-co against 2 other record\(s\) on disk/);
});

test('single-file mode gates the community\'s own layer file, and its records resolve as layerRefs', (t) => {
  const { write, run, put } = fixture(t);
  const today = new Date().toISOString().slice(0, 10);
  const own = (over = {}) => ({
    id: 'windsor-co--highland-meadows.arc-turf', layer: 'housing', applies_to: ['windsor-co'],
    fact: 'The Highland Meadows committee reviews turf in back yards.', quote: 'Turf in back yards requires committee review.',
    source_url: 'https://example.gov/two', source_label: 'Highland Meadows design guidelines', checked: today, reachable: true, status: 'VERIFIED', numbers: [], ...over,
  });
  const c = community('windsor-co', 'highland-meadows', { governing: { name: 'Highland Meadows HOA', type: 'hoa', layerRefs: ['windsor-co--highland-meadows.arc-turf'] } });
  c.blocks[0] = { ...c.blocks[0], layerRefs: ['windsor-co--highland-meadows.arc-turf'] };
  const file = put(c);
  write('src/data/layers/communities/windsor-co--highland-meadows.json', [own()]);
  const ok = run(file);
  assert.equal(ok.status, 0, ok.out);
  assert.doesNotMatch(ok.out, /is not in src\/data\/layers/);

  write('src/data/layers/communities/windsor-co--highland-meadows.json', [own(), own({ id: 'fixture-no-prefix' }), own({ id: 'windsor-co--highland-meadows.elsewhere', applies_to: ['mead-co'] })]);
  const bad = run(file);
  assert.equal(bad.status, 1, bad.out);
  assert.match(bad.out, /layer file: communities\/windsor-co--highland-meadows\.json fixture-no-prefix: ids in a community's own file start with "windsor-co--highland-meadows\."/);
  assert.match(bad.out, /layer file: communities\/windsor-co--highland-meadows\.json windsor-co--highland-meadows\.elsewhere: a record in windsor-co--highland-meadows's own file applies to windsor-co/);
});

test('guides: a `photos` id that is not in photos.ts fails; a real one passes', (t) => {
  const { write, run } = fixture(t);
  const fm = {
    status: 'draft', topic: 'putting-greens', title: 'Putting green design ideas | NoCo Turf Co.', description: 'Shapes, fringe and cups.',
    h1: 'Putting green design ideas', answer: { question: 'What shape should a backyard green be?', answer: 'One that fits the yard.' },
    sources: [{ label: 'One', url: 'https://example.gov/one', checked: '2026-09-24' }, { label: 'Two', url: 'https://example.gov/two', checked: '2026-09-24' }],
    published: '2026-09-24', updated: '2026-09-24',
  };
  const guide = (over) => `---\n${Object.entries({ ...fm, ...over }).map(([k, v]) => `${k}: ${JSON.stringify(v)}`).join('\n')}\n---\n## What decides the shape?\n\nThe yard and the grade under it.\n`;
  write('src/content/guides/putting-green-design-ideas.md', guide({ photos: ['dusk', 'stock-green'] }));
  const bad = run();
  assert.equal(bad.status, 1, bad.out);
  assert.match(bad.out, /photos: "stock-green" is not in src\/data\/photos\.ts/);
  assert.doesNotMatch(bad.out, /photos: "dusk"/);
  write('src/content/guides/putting-green-design-ideas.md', guide({ photos: ['dusk', 'boulders'] }));
  const ok = run();
  assert.equal(ok.status, 0, ok.out);
});

// ───────────────────────────── llms.txt ─────────────────────────────

test('llms.txt lists a town\'s community pages under it, after its town × service pages', () => {
  const SITE = 'https://www.nocoturf.com';
  const p = (route, t) => ({ url: `${SITE}${route}`, md: `${SITE}${route}index.html.md`, title: t, description: `${t}.`, body: '', crumbs: [] });
  const out = buildLlms({ brief: {}, site: SITE, prelaunch: false, pages: [
    p('/areas/windsor-co/highland-meadows/', 'Highland Meadows'), p('/areas/windsor-co/', 'Windsor'),
    p('/areas/windsor-co/putting-greens/', 'Windsor greens'), p('/areas/timnath-co/', 'Timnath'),
  ] });
  assert.match(out, /- \[Windsor\][^\n]*\n  - \[Windsor greens\][^\n]*\n  - Neighborhoods:\n    - \[Highland Meadows\]\(https:\/\/www\.nocoturf\.com\/areas\/windsor-co\/highland-meadows\/index\.html\.md\)/);
  assert.doesNotMatch(out, /- \[Timnath\][^\n]*\n  - Neighborhoods/, 'no sub-list without a community');
});
