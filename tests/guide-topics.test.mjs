/**
 * The guide topics (src/data/guide-topics.ts): the registry every guide's `topic` must name, the hubs at
 * /guides/{topic}/, and the one namespace topic slugs share with guide ids. check-content.mjs holds the
 * copy rules on the registry; this file holds its shape, the schema's enum and the namespace guard.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import yaml from 'js-yaml';
import { GUIDE_TOPICS, TOPIC_SLUGS, topicBySlug } from '../src/data/guide-topics.ts';
import { assertGuideNamespace } from '../src/lib/content-policy.mjs';
import { loadCollections } from '../scripts/check-content.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const GUIDES = path.join(ROOT, 'src/content/guides');
const frontmatter = (id) => yaml.load(fs.readFileSync(path.join(GUIDES, `${id}.md`), 'utf8').match(/^---\n([\s\S]*?)\n---/)[1]);

test('thirteen topics, in the agreed order, each with every field the hubs and guide pages print', () => {
  assert.deepEqual(TOPIC_SLUGS, ['pets', 'weather', 'installation', 'products', 'care-and-repair', 'putting-greens', 'safety',
    'comparisons', 'buying', 'rules-and-hoa', 'water', 'commercial', 'yard-design']);
  assert.equal(new Set(TOPIC_SLUGS).size, TOPIC_SLUGS.length);
  for (const t of GUIDE_TOPICS) {
    assert.match(t.slug, /^[a-z0-9]+(?:-[a-z0-9]+)*$/, t.slug);
    for (const k of ['name', 'label', 'title', 'description', 'h1', 'lede', 'faqH2']) assert.ok(t[k]?.trim(), `${t.slug}: ${k}`);
    assert.ok(t.description.length <= 160, `${t.slug}: description is ${t.description.length} characters`);
    assert.ok(t.title.length <= 70, `${t.slug}: title is ${t.title.length} characters`);
    assert.match(t.title, / \| NoCo Turf Co\.$/, t.slug);
    assert.match(t.faqH2, /\.$/, `${t.slug}: section H2s are sentences with a period`);
    assert.ok(t.cta.title && t.cta.payoff, `${t.slug}: cta`);
    if (t.paint) assert.ok(t.h1.includes(t.paint), `${t.slug}: paint "${t.paint}" is not in the h1`);
    assert.equal(topicBySlug[t.slug], t);
  }
});

test('the guide schema takes exactly the registry slugs as `topic`, and requires one', async () => {
  const { guides } = await loadCollections();
  const base = frontmatter('water-savings');
  for (const slug of TOPIC_SLUGS) assert.equal(guides.safeParse({ ...base, topic: slug }).success, true, slug);
  assert.equal(guides.safeParse({ ...base, topic: 'lawn' }).success, false);
  const { topic, ...none } = base;
  assert.equal(guides.safeParse(none).success, false, 'topic is required');
  assert.equal(guides.safeParse({ ...base, display: undefined }).success, true, 'display is optional');
  assert.equal(guides.safeParse({ ...base, display: { cta: { title: 'Only a title' } } }).success, false, 'a cta needs its payoff');
});

test('the five launch guides sit in their assigned topics and carry their page furniture as `display`', () => {
  const want = {
    'turf-rules-northern-colorado': 'rules-and-hoa', 'hoa-turf-approval': 'rules-and-hoa',
    'turf-rebates-northern-colorado': 'water', 'water-savings': 'water', 'artificial-turf-cost': 'buying',
  };
  for (const [id, topic] of Object.entries(want)) {
    const d = frontmatter(id);
    assert.equal(d.topic, topic, id);
    assert.ok(d.display?.crumb && d.display?.faqH2 && d.display?.cta?.title && d.display?.cta?.payoff, `${id}: display`);
    assert.ok(d.h1.includes(d.display.paint), `${id}: paint "${d.display.paint}" is not in the h1`);
  }
});

test('a guide id may never equal a topic slug: the routes throw, and no guide on disk does', () => {
  assert.throws(() => assertGuideNamespace(['water-savings', 'pets'], TOPIC_SLUGS), /Guide id "pets" equals a topic slug/);
  assert.throws(() => assertGuideNamespace(['water', 'safety'], TOPIC_SLUGS), /Guide ids "water", "safety" equal a topic slug/);
  assert.doesNotThrow(() => assertGuideNamespace(['water-savings', 'pet-turf-odor'], TOPIC_SLUGS));
  const ids = fs.readdirSync(GUIDES).filter((f) => f.endsWith('.md')).map((f) => f.slice(0, -3));
  assert.doesNotThrow(() => assertGuideNamespace(ids, TOPIC_SLUGS));
});

test('astro.config.mjs makes a route conflict a build error, not a dropped page', () => {
  assert.match(fs.readFileSync(path.join(ROOT, 'astro.config.mjs'), 'utf8'), /prerenderConflictBehavior:\s*'error'/);
});
