/**
 * The differentiation gate (src/lib/town-gate.mjs, from ~/.claude/skills/site/reference/programmatic.md):
 * a town page publishes only with ≥3 substantive blocks, ≥2 of them true only of that town, and a real
 * photo; every block other than a job, photo or review needs a source or a layer reference.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { townGate } from '../src/lib/town-gate.mjs';

const block = (kind, own, extra = {}) => ({ kind, own, kicker: kind, h2: kind, paras: ['A fact.'], layerRefs: [], sources: ['https://example.gov/rule'], ...extra });
const town = (blocks, photo = 'windsor/putting-green.jpg') => ({ slug: 'windsor-co', blocks, photo });

test('three blocks, two of them own, and a photo pass', () => {
  const g = townGate(town([block('ordinance', true), block('utility', true), block('drought', false)]));
  assert.deepEqual(g, { pass: true, reasons: [] });
});

test('fewer than three blocks fails, however strong they are', () => {
  const g = townGate(town([block('ordinance', true), block('job', true)]));
  assert.equal(g.pass, false);
  assert.ok(g.reasons.some((r) => /2 blocks — needs ≥3/.test(r)), g.reasons.join('; '));
});

test('only one town-specific block fails: shared layers alone make every page the same', () => {
  const g = townGate(town([block('ordinance', true), block('climate', false), block('soil', false), block('drought', false)]));
  assert.equal(g.pass, false);
  assert.ok(g.reasons.some((r) => /1 town-specific \(own\) blocks — needs ≥2/.test(r)));
});

test('no photograph fails', () => {
  const g = townGate({ slug: 'windsor-co', blocks: [block('ordinance', true), block('utility', true), block('drought', false)] });
  assert.equal(g.pass, false);
  assert.ok(g.reasons.some((r) => /no photograph/.test(r)));
});

test('a block with neither a source nor a layer reference fails, unless it is a job, photo or review', () => {
  const bare = { sources: [], layerRefs: [] };
  const g = townGate(town([block('ordinance', true, bare), block('utility', true), block('drought', false)]));
  assert.equal(g.pass, false);
  assert.ok(g.reasons.some((r) => /block 1 \(ordinance\) has no source and no layer reference/.test(r)));
  const layered = townGate(town([block('ordinance', true, { sources: [], layerRefs: ['fc-luc-5.10.1'] }), block('utility', true), block('drought', false)]));
  assert.equal(layered.pass, true, layered.reasons.join('; '));
  for (const kind of ['job', 'photo', 'review']) {
    const own = townGate(town([block(kind, true, bare), block('utility', true), block('drought', false)]));
    assert.equal(own.pass, true, `${kind}: ${own.reasons.join('; ')}`);
  }
});

test('every missing piece is listed, so the reasons are the research to-do list', () => {
  const g = townGate({ slug: 'mead-co', blocks: [block('climate', false, { sources: [], layerRefs: [] })] });
  assert.equal(g.pass, false);
  assert.equal(g.reasons.length, 4, g.reasons.join('; '));
});

test('an empty or missing record fails without throwing', () => {
  for (const data of [undefined, null, {}, { blocks: [] }]) {
    const g = townGate(data);
    assert.equal(g.pass, false);
    assert.ok(g.reasons.length >= 3);
  }
});
