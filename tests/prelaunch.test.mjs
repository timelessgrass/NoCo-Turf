/**
 * PRELAUNCH has two switches that must move together (src/data/site.ts says so): the PRELAUNCH flag,
 * which puts noindex on every page and blanks robots.txt and the sitemap, and the X-Robots-Tag header
 * in netlify.toml's "/*" block. Launching one without the other either leaves the site invisible or
 * indexes a half-built site. This test fails the moment only one of them changes.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8');

export function prelaunchFlag(siteTs) {
  const m = siteTs.match(/export\s+const\s+PRELAUNCH\s*(?::\s*boolean\s*)?=\s*(true|false)/);
  if (!m) throw new Error('src/data/site.ts has no `export const PRELAUNCH = true|false`');
  return m[1] === 'true';
}

/** [[headers]] blocks of a netlify.toml: { for, values } with comments stripped. */
export function headerBlocks(toml) {
  const blocks = [];
  let cur = null;
  for (const raw of toml.split(/\r?\n/)) {
    const line = raw.replace(/(^|\s)#.*$/, '').trim();
    if (!line) continue;
    if (line === '[[headers]]') { cur = { for: null, values: {} }; blocks.push(cur); continue; }
    if (line === '[headers.values]') continue;
    if (/^\[/.test(line)) { cur = null; continue; } // any other table ends the block
    if (!cur) continue;
    const kv = line.match(/^("?)([^"=]+)\1\s*=\s*"([^"]*)"$/);
    if (!kv) continue;
    if (kv[2].trim() === 'for') cur.for = kv[3];
    else cur.values[kv[2].trim()] = kv[3];
  }
  return blocks;
}

export function siteWideNoindex(toml) {
  return headerBlocks(toml).some((b) => b.for === '/*' && /^\s*noindex,\s*nofollow\s*$/i.test(b.values['X-Robots-Tag'] ?? ''));
}

test('PRELAUNCH is true exactly when netlify.toml sends X-Robots-Tag: noindex, nofollow on /*', () => {
  const prelaunch = prelaunchFlag(read('src/data/site.ts'));
  const header = siteWideNoindex(read('netlify.toml'));
  assert.equal(header, prelaunch, prelaunch
    ? 'PRELAUNCH is true but netlify.toml has no X-Robots-Tag = "noindex, nofollow" in the "/*" [[headers]] block'
    : 'PRELAUNCH is false but netlify.toml still sends X-Robots-Tag = "noindex, nofollow" on "/*" — delete it in the launch commit');
});

test('the header parser reads only the "/*" block, and ignores comments', () => {
  const toml = read('netlify.toml');
  assert.equal(siteWideNoindex(toml.replace(/^\s*X-Robots-Tag = "noindex, nofollow"\s*$/m, '')), false, 'removing the line flips it');
  assert.equal(siteWideNoindex(toml.replace(/^(\s*)X-Robots-Tag = "noindex, nofollow"\s*$/m, '$1# X-Robots-Tag = "noindex, nofollow"')), false, 'commenting it out flips it');
  const mdOnly = '[[headers]]\n  for = "/*.md"\n  [headers.values]\n    X-Robots-Tag = "noindex, nofollow"\n';
  assert.equal(siteWideNoindex(mdOnly), false, 'a noindex on another path is not the site-wide switch');
  const other = '[[headers]]\n  for = "/*"\n  [headers.values]\n    X-Frame-Options = "SAMEORIGIN"\n[[redirects]]\n  from = "/a"\n  X-Robots-Tag = "noindex, nofollow"\n';
  assert.equal(siteWideNoindex(other), false, 'a key under another table does not count');
});

test('the Markdown mirrors stay noindex whatever PRELAUNCH says', () => {
  const md = headerBlocks(read('netlify.toml')).find((b) => b.for === '/*.md');
  if (!md) return; // no mirror header yet — nothing to hold
  assert.match(md.values['X-Robots-Tag'] ?? '', /noindex/);
});

test('a PRELAUNCH build ships noindex on every page, a blocking robots.txt and an empty sitemap', (t) => {
  const dist = path.join(root, 'dist');
  if (!fs.existsSync(path.join(dist, 'index.html'))) return t.skip('no dist/ — run astro build');
  const prelaunch = prelaunchFlag(read('src/data/site.ts'));
  if (!prelaunch) return t.skip('launched — tests/schema.test.mjs checks the launch rules');
  const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : e.name.endsWith('.html') ? [path.join(d, e.name)] : []));
  for (const f of walk(dist)) assert.match(fs.readFileSync(f, 'utf8'), /<meta name="robots" content="noindex, nofollow"/, path.relative(root, f));
  assert.match(fs.readFileSync(path.join(dist, 'robots.txt'), 'utf8'), /User-agent: \*\s*\nDisallow: \/\s*$/m);
  assert.doesNotMatch(fs.readFileSync(path.join(dist, 'sitemap.xml'), 'utf8'), /<loc>/);
});
