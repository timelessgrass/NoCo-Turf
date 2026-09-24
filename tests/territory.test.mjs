/**
 * The territory split with TIMELESS Grass & Greens (.site/decisions/2026-09-24-territory.md): NoCo is the
 * 17 towns in src/data/territory.mjs; Erie, Brighton, Thornton, Broomfield and the Denver metro are
 * TIMELESS's. A town on both lists is the multi-domain doorway pattern (site skill NEVER #11).
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { NOCO_TOWNS, TIMELESS_TOWNS, REGIONS, EXCLUDED_TOWNS, townBySlug, townEligibility } from '../src/data/territory.mjs';
import { timelessTownHits } from '../scripts/check-content.mjs';

const lower = (s) => s.toLowerCase();
const kebab = (s) => s.toLowerCase().replace(/[^a-z]+/g, '-').replace(/^-|-$/g, '');

test('NoCo is the 17 decided towns, each with a unique /^[a-z-]+-co$/ slug built from its name', () => {
  assert.equal(NOCO_TOWNS.length, 17, 'the territory decision lists 17 towns — change .site/decisions first');
  const slugs = NOCO_TOWNS.map((t) => t.slug);
  assert.equal(new Set(slugs).size, slugs.length, 'duplicate slug');
  for (const t of NOCO_TOWNS) {
    assert.match(t.slug, /^[a-z-]+-co$/, t.slug);
    assert.equal(t.slug, `${kebab(t.name)}-co`, `${t.name} → ${t.slug}`);
    assert.ok(REGIONS[t.region], `${t.slug}: unknown region ${t.region}`);
    assert.ok(['hub', 'full', 'lean'].includes(t.tier), `${t.slug}: tier ${t.tier}`);
    assert.equal(townBySlug[t.slug], t);
  }
  assert.equal(NOCO_TOWNS.filter((t) => t.tier === 'hub').length, 1, 'one hub town');
  for (const key of Object.keys(REGIONS)) assert.ok(NOCO_TOWNS.some((t) => t.region === key), `region ${key} has no town`);
});

test('no NoCo town (or folded-in section) is a TIMELESS town', () => {
  const timeless = new Set(TIMELESS_TOWNS.map(lower));
  for (const t of NOCO_TOWNS) {
    assert.ok(!timeless.has(lower(t.name)), `${t.name} is on both lists`);
    for (const s of t.sections ?? []) assert.ok(!timeless.has(lower(s)), `${t.slug} folds in ${s}, a TIMELESS town`);
  }
  assert.equal(new Set(TIMELESS_TOWNS.map(lower)).size, TIMELESS_TOWNS.length, 'duplicate TIMELESS town');
});

test('Erie, Brighton, Thornton and Broomfield belong to TIMELESS, not NoCo', () => {
  for (const name of ['Erie', 'Brighton', 'Thornton', 'Broomfield', 'Denver']) {
    assert.ok(TIMELESS_TOWNS.includes(name), `${name} should be in TIMELESS_TOWNS`);
    assert.ok(!NOCO_TOWNS.some((t) => lower(t.name) === lower(name)), `${name} must not be a NoCo town`);
    const slug = `${kebab(name)}-co`;
    assert.equal(townBySlug[slug], undefined, slug);
    assert.equal(townEligibility(slug).eligible, false, slug);
  }
  assert.equal(townEligibility('windsor-co').eligible, true);
  assert.match(townEligibility('erie-co').reason, /not a NoCo town/);
});

test('places left out on purpose stay out of both lists until someone decides', () => {
  for (const name of Object.keys(EXCLUDED_TOWNS)) {
    assert.ok(!NOCO_TOWNS.some((t) => lower(t.name) === lower(name)), `${name} is excluded but listed for NoCo`);
    assert.ok(!TIMELESS_TOWNS.some((t) => lower(t) === lower(name)), `${name} is excluded but listed for TIMELESS`);
  }
});

test('the copy checker catches every TIMELESS town and none of NoCo\'s', () => {
  for (const name of TIMELESS_TOWNS) {
    const hits = timelessTownHits(`We install turf in ${name}, Colorado.`);
    assert.ok(hits.some((h) => h.name === name), `${name} not detected`);
  }
  const noco = NOCO_TOWNS.flatMap((t) => [t.name, ...(t.sections ?? [])]).join(', ');
  assert.deepEqual(timelessTownHits(`We install turf in ${noco}.`), []);
  // a county, a state nickname and a museum are not places we claim to serve
  assert.deepEqual(timelessTownHits('Longmont sits in Boulder County; the Boulder & Weld line; the Centennial State; Centennial Village Museum; a Golden Retriever.'), []);
  // soft hyphens and zero-width characters do not hide a name
  const shy = String.fromCodePoint(0xad), zw = String.fromCodePoint(0x200b);
  assert.equal(timelessTownHits(`Den${shy}ver and Er${zw}ie`).length, 2);
  assert.equal(timelessTownHits('Den&shy;ver').length, 1);
});
