#!/usr/bin/env node
/**
 * Is a weekly post due this week? Prints `due=true|false` and `paths=` (the
 * live URL paths) in GitHub Actions output format.
 *
 * Used by .github/workflows/weekly-publish.yml so the site is rebuilt only in
 * a week with something to publish: the Netlify team pays per build.
 * "Due" means status: published and a `published` date in the last 7 days,
 * today included, Northern Colorado time. The job runs weekly, so each post triggers
 * exactly one build. Reads frontmatter as text: no build, no dependencies.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const today = process.argv[2] || new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Denver', year: 'numeric', month: '2-digit', day: '2-digit',
}).format(new Date());
const start = new Date(`${today}T12:00:00Z`);
start.setUTCDate(start.getUTCDate() - 6);
const from = start.toISOString().slice(0, 10);

const dir = 'src/content/guides';
const due = [];
for (const file of readdirSync(dir).filter((f) => f.endsWith('.md'))) {
  const head = (readFileSync(join(dir, file), 'utf-8').match(/^---\n([\s\S]*?)\n---/) || [])[1] || '';
  const status = (head.match(/^status:\s*['"]?([a-z]+)/m) || [])[1];
  const date = (head.match(/^published:\s*['"]?(\d{4}-\d{2}-\d{2})/m) || [])[1];
  if (status === 'published' && date && date >= from && date <= today) due.push({ date, id: file.replace(/\.md$/, '') });
}
console.log(due.length ? `Due ${from}..${today}:\n  ${due.map((d) => `${d.date} ${d.id}`).join('\n  ')}` : `Nothing due ${from}..${today}.`);
console.log(`due=${due.length > 0}`);
console.log(`slugs=${due.map((d) => d.id).join(' ')}`);
