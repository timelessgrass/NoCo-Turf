#!/usr/bin/env node
/**
 * IndexNow: tell Bing, Yandex, Seznam and the other IndexNow engines which pages changed, so they recrawl now instead
 * of whenever they get to it (Google doesn't use IndexNow; it reads the sitemap). The key file is public/08e8354e3fbef3ff85ffec8310d9ac0b.txt.
 * Run after a deploy is live, with the pages that changed, or with no arguments for every URL in the live sitemap:
 *   node scripts/indexnow.mjs                      # the whole sitemap
 *   node scripts/indexnow.mjs /guides/x/ /areas/y/ # just these
 */
const HOST = 'www.nocoturf.com';
const KEY = '08e8354e3fbef3ff85ffec8310d9ac0b';
const args = process.argv.slice(2);
let urls = args.map((p) => new URL(p, `https://${HOST}`).href);
if (!urls.length) {
  const xml = await (await fetch(`https://${HOST}/sitemap.xml`)).text();
  urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
}
const res = await fetch('https://api.indexnow.org/indexnow', {
  method: 'POST', headers: { 'Content-Type': 'application/json; charset=utf-8' },
  body: JSON.stringify({ host: HOST, key: KEY, keyLocation: `https://${HOST}/${KEY}.txt`, urlList: urls }),
});
console.log(`indexnow: ${urls.length} URL(s) → ${res.status} ${res.statusText}`);
if (res.status >= 400) process.exit(1);
