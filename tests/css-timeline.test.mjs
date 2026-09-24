/**
 * Guard: scroll-driven animations must survive minification.
 *
 * Vite 8's default CSS minifier (lightningcss) folds animation-timeline into the animation shorthand
 * ("animation: linear both rise view()"). Chromium rejects that form, drops the whole declaration, and every
 * scroll-driven animation silently dies in production while working in dev. astro.config.mjs switches the
 * minifier to esbuild; this test fails the suite if a shorthand ever carries a timeline again.
 * Skips when there is no dist/ (run after `npm run build`).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ASTRO = path.join(ROOT, 'dist', '_astro');

test('no animation shorthand carries a scroll/view timeline in built CSS', { skip: !fs.existsSync(ASTRO) && 'no dist/ — run npm run build first' }, () => {
  const css = fs.readdirSync(ASTRO).filter((f) => f.endsWith('.css')).map((f) => fs.readFileSync(path.join(ASTRO, f), 'utf8')).join('\n');
  const folded = [...css.matchAll(/animation\s*:\s*([^;}]*)/g)]
    .map((m) => m[1])
    .filter((v) => /\b(view|scroll)\(|(^|\s)--[\w-]+(\s|$)/.test(v));
  assert.deepEqual(folded, [], `timeline folded into the animation shorthand (Chromium drops it): ${folded.slice(0, 3).join(' | ')}`);
});

test('the scroll-driven classes keep a separate animation-timeline', { skip: !fs.existsSync(ASTRO) && 'no dist/' }, () => {
  const css = fs.readdirSync(ASTRO).filter((f) => f.endsWith('.css')).map((f) => fs.readFileSync(path.join(ASTRO, f), 'utf8')).join('\n');
  assert.match(css, /\.rise\{[^}]*animation-timeline:view\(\)/, '.rise lost its view() timeline');
});
