/**
 * The differentiation gate (src/lib/town-gate.mjs, from ~/.claude/skills/site/reference/programmatic.md):
 * a town page publishes only with ≥3 substantive blocks, ≥2 of them true only of that town, every block other than
 * a job, photo or review sourced, Brian's word that NoCo works the town, a real photo from the town and a job or
 * review from it printed on the page (src/lib/local-proof.mjs, the 2026-09-28 doorway review).
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { townGate } from '../src/lib/town-gate.mjs';
import { servedTowns, namesPlace, proofBlocks } from '../src/lib/local-proof.mjs';

const WORDS = 'Windsor Code 15-3-10 exempts detached houses and duplexes from the landscape article, except that the tree lawn rule stays and at least a quarter of each front yard must be landscaped with living plants.';
const block = (kind, own, extra = {}) => ({ kind, own, kicker: kind, h2: kind, paras: [WORDS], layerRefs: [], sources: ['https://example.gov/rule'], ...extra });
const PHOTOS = [
  { id: 'dusk', use: 'putting-green', place: 'Near Windsor' },
  { id: 'fire-pit', use: 'putting-green', place: 'Near Berthoud' },
  { id: 'gbp-green', use: 'putting-green', place: '' },
];
const SERVED = new Set(['windsor-co', 'berthoud-co']);
const CTX = { photos: PHOTOS, served: SERVED };
/** A job block from Brian's ledger: own, 30+ words, naming the town (the fixture text names Windsor). */
const JOB = block('job', true, { sources: [], h2: 'A Windsor backyard', paras: [`${WORDS} We built a lawn and a dog run behind a Windsor house in the spring.`] });
const good = (extra = []) => [block('ordinance', true), block('utility', true), block('drought', false), JOB, ...extra];
const town = (blocks, slug = 'windsor-co') => ({ slug, blocks });

test('three substantive blocks, two own, every block sourced, confirmed, a local photo and a job pass', () => {
  assert.deepEqual(townGate(town(good()), CTX), { pass: true, reasons: [] });
});

test('fewer than three substantive blocks fails, however strong they are; a one-liner is not a block', () => {
  const g = townGate(town([block('ordinance', true), block('job', true)]), CTX);
  assert.equal(g.pass, false);
  assert.ok(g.reasons.some((r) => /2 substantive blocks — needs ≥3/.test(r)), g.reasons.join('; '));
  const thin = townGate(town([block('ordinance', true), block('utility', true), block('job', true, { paras: ['A fact.'] })]), CTX);
  assert.ok(thin.reasons.some((r) => /block 3 \(job\) has 2/.test(r)), thin.reasons.join('; '));
});

test('only one town-specific block fails: shared layers alone make every page the same', () => {
  const g = townGate(town([block('ordinance', true), block('climate', false), block('soil', false), block('drought', false)]), CTX);
  assert.equal(g.pass, false);
  assert.ok(g.reasons.some((r) => /1 town-specific \(own\) blocks — needs ≥2/.test(r)));
});

test('a block with neither a source nor a layer reference fails, unless it is a job, photo or review', () => {
  const bare = { sources: [], layerRefs: [] };
  const g = townGate(town([block('ordinance', true, bare), ...good()]), CTX);
  assert.equal(g.pass, false);
  assert.ok(g.reasons.some((r) => /block 1 \(ordinance\) has no source and no layer reference/.test(r)));
  const layered = townGate(town([block('ordinance', true, { sources: [], layerRefs: ['fc-luc-5.10.1'] }), block('utility', true), block('drought', false), JOB]), CTX);
  assert.equal(layered.pass, true, layered.reasons.join('; '));
  for (const kind of ['job', 'photo', 'review']) {
    const own = townGate(town([block(kind, true, bare), ...good()]), CTX);
    assert.equal(own.pass, true, `${kind}: ${own.reasons.join('; ')}`);
  }
});

test('the town list is the agency\'s call until Brian confirms a town in his own words', () => {
  const g = townGate(town(good()), { photos: PHOTOS, served: new Set() });
  assert.equal(g.pass, false);
  assert.ok(g.reasons.some((r) => /Brian hasn't confirmed NoCo works Windsor/.test(r)), g.reasons.join('; '));
  const said = { source: 'client_text', source_detail: 'Brian, text to Ty, 2026-10-02: "yes, Berthoud"' };
  const brief = { service_areas: [
    { slug: 'windsor-co', name: { value: 'Windsor', status: 'INFERENCE', source: 'operator_decision' } },
    { slug: 'berthoud-co', name: { value: 'Berthoud', status: 'CLIENT_CONFIRMED', ...said } },
    { slug: 'mead-co', name: { value: 'Mead', status: 'CLIENT_CONFIRMED', source: null } },
    { slug: 'evans-co', name: { value: 'Evans', status: 'CLIENT_CONFIRMED', source: 'operator_decision', source_detail: 'status flipped by hand' } },
    { slug: 'eaton-co', name: { value: 'Eaton', status: 'CLIENT_CONFIRMED', source: 'client_text' } },
  ] };
  assert.deepEqual([...servedTowns(brief)], ['berthoud-co'], 'an INFERENCE, no source, the agency\'s own source, or no detail of where he said it: not Brian\'s word');
  assert.deepEqual([...servedTowns(undefined)], []);
});

test('a place is named whole: Highland Meadows is not Mead', () => {
  assert.equal(namesPlace({ place: 'Highland Meadows, Windsor' }, 'Mead'), false);
  assert.equal(namesPlace({ place: 'Highland Meadows, Windsor' }, 'Windsor'), true);
  assert.equal(namesPlace({ place: 'Near Mead and Firestone' }, 'Mead'), true);
  assert.equal(namesPlace({ place: 'Near Mead and Firestone' }, 'Firestone'), true);
  assert.equal(namesPlace({ place: '' }, 'Mead'), false);
  const g = townGate(town(good(), 'mead-co'), { photos: [{ id: 'hm', place: 'Highland Meadows, Windsor' }], served: new Set(['mead-co']) });
  assert.ok(g.reasons.some((r) => /no photograph from Mead/.test(r)), 'a Windsor neighborhood photo does not unlock Mead');
});

test('the photo must be from the town, the one the page shows: a Berthoud green is not proof of work in Windsor', () => {
  const none = townGate(town(good(), 'mead-co'), { photos: PHOTOS, served: new Set(['mead-co']) });
  assert.ok(none.reasons.some((r) => /no photograph from Mead/.test(r)), none.reasons.join('; '));
  const unnamed = townGate(town(good()), { photos: [PHOTOS[1], PHOTOS[2]], served: SERVED });
  assert.ok(unnamed.reasons.some((r) => /no photograph from Windsor/.test(r)), 'a photo with no place, or another town\'s, does not count');
  const map = townGate(town(good()), { photos: new Map([['dusk', { use: 'putting-green', place: 'Near Windsor' }]]), served: SERVED });
  assert.equal(map.pass, true, 'a Map of id → { place } works too (check-content reads photos.ts as text)');
});

test('a job or a review from the town is required, and it has to be real: own, substantive, naming the town', () => {
  const research = [block('ordinance', true), block('utility', true), block('drought', false)];
  const g = townGate(town(research), CTX);
  assert.ok(g.reasons.some((r) => /no job or review from Windsor/.test(r)), g.reasons.join('; '));
  assert.equal(townGate(town([...research, JOB]), CTX).pass, true);
  const stub = (over) => townGate(town([...research, { ...JOB, ...over }]), CTX).pass;
  assert.equal(stub({ paras: ['TBD.'] }), false, 'a placeholder job block');
  assert.equal(stub({ own: false }), false, 'a job block not marked own');
  assert.equal(stub({ h2: 'A backyard', paras: [WORDS.replace('Windsor', 'The')] }), false, 'a job block that never names the town');
  const review = { ...JOB, kind: 'review', h2: 'Kim R. in Windsor', paras: ['Brian and his crew showed up on time and the new lawn looks great, the whole street has asked.'] };
  assert.equal(stub(review), false, 'a review block with no link to where it was posted');
  assert.equal(stub({ ...review, sources: ['https://g.page/r/example'] }), true, 'a linked review from the town counts');
  assert.equal(proofBlocks([JOB, { ...JOB, use: 'pet' }], 'Windsor', 'pet').length, 1, 'proofBlocks filters by use when given');
});

test('every missing piece is listed, so the reasons are the research to-do list', () => {
  const g = townGate({ slug: 'mead-co', blocks: [block('climate', false, { sources: [], layerRefs: [] })] }, { photos: PHOTOS });
  assert.equal(g.pass, false);
  assert.equal(g.reasons.length, 6, g.reasons.join('; '));
});

test('an empty or missing record, or no evidence at all, fails without throwing', () => {
  for (const data of [undefined, null, {}, { blocks: [] }]) {
    const g = townGate(data);
    assert.equal(g.pass, false);
    assert.ok(g.reasons.length >= 3);
  }
  assert.equal(townGate(town(good())).pass, false, 'a caller that passes no evidence gets a closed gate');
});
