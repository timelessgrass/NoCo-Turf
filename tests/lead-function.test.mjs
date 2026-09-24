/**
 * The lead endpoint (netlify/functions/lead.mjs) end to end, with fetch stubbed: what the visitor gets
 * back, what reaches the webhook, and that a failure never looks like a success. Node built-ins only.
 * Run: node --test tests/lead-function.test.mjs
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import handler from '../netlify/functions/lead.mjs';
import { fallbackPhone } from '../netlify/functions/lib/fallback.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const ENV = 'NOCO_LEAD_WEBHOOK';
const HOOK = 'https://hooks.example.test/noco-lead';
const URL_ = 'https://www.nocoturf.com/.netlify/functions/lead';

const BANNED_PHONES = [...readFileSync(`${root}docs/CONTRACTS.md`, 'utf8').matchAll(/`(\d{3}-\d{3}-\d{4})`/g)]
  .map((m) => m[1]).filter((p) => !p.startsWith('720-630')).map((p) => p.replace(/\D/g, ''));
/* 3-3-4 digits with any separators ("303-349…", "(303) 349…", "+1303349…"). */
const phonePattern = (p) => new RegExp(`(?<!\\d)${p.slice(0, 3)}\\D{0,3}${p.slice(3, 6)}\\D{0,3}${p.slice(6)}(?!\\d)`);

const BASE = [
  ['use', 'Pet turf'], ['use', 'Putting green'], ['town', 'Fort Collins'], ['zip', '80525'], ['size', '300 to 800 sq ft'],
  ['hoa', 'No'], ['timeline', 'As soon as possible'], ['name', 'Kim Walker'], ['phone', '(970) 555-0134'],
  ['email', 'kim.walker@example.com'], ['contact_pref', 'Call'], ['page', '/areas/fort-collins-co/'], ['company', ''],
  ['elapsed_ms', '41000'], ['utm_source', 'google'], ['gclid', 'abc123'],
];
const PII = ['Kim Walker', 'Walker', '555-0134', '5550134', 'kim.walker@example.com', 'Fort Collins'];

const withField = (fields, key, value) => [...fields.filter(([k]) => k !== key), [key, value]];
const post = (fields, accept = 'application/json', init = {}) => new Request(URL_, {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: accept },
  body: new URLSearchParams(fields).toString(),
  ...init,
});

/** Set (or clear) the webhook for one test, and put it back afterwards. */
function webhook(t, value) {
  const before = process.env[ENV];
  if (value === undefined) delete process.env[ENV]; else process.env[ENV] = value;
  t.after(() => { if (before === undefined) delete process.env[ENV]; else process.env[ENV] = before; });
}
/** Stub fetch: `answer(attempt)` returns a Response or throws. Records every call. */
function stubFetch(t, answer = () => new Response('Accepted')) {
  const calls = [];
  t.mock.method(globalThis, 'fetch', async (url, init) => {
    calls.push({ url: String(url), body: JSON.parse(init.body) });
    return answer(calls.length);
  });
  return calls;
}
/** Capture every console line (and keep the test output quiet). */
function logs(t) {
  const lines = [];
  for (const m of ['log', 'warn', 'error', 'info']) t.mock.method(console, m, (...a) => { lines.push(a.map(String).join(' ')); });
  return lines;
}

test('a lead goes to NOCO_LEAD_WEBHOOK, and the form is told it worked', async (t) => {
  webhook(t, HOOK);
  logs(t);
  const calls = stubFetch(t);
  const res = await handler(post(BASE));
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { ok: true });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, HOOK, 'only the NoCo webhook');
  const lead = calls[0].body;
  assert.equal(lead.lane, 'home');
  assert.equal(lead.areaStatus, 'served');
  assert.deepEqual(lead.uses, ['Pet turf', 'Putting green']);
  assert.equal(lead.utm_source, 'google');
  assert.equal(lead.gclid, 'abc123');
  assert.equal(lead.isTest, false);
  assert.match(lead.leadId, /^[0-9a-f-]{36}$/);
  assert.match(lead.emailHtml, /NoCo Turf Co\./);
});

test('without JavaScript the form goes on to /thanks/ (303)', async (t) => {
  webhook(t, HOOK);
  logs(t);
  stubFetch(t);
  const res = await handler(post(BASE, 'text/html'));
  assert.equal(res.status, 303);
  assert.equal(res.headers.get('location'), '/thanks/');
});

test('no webhook set: 502 with the phone fallback (HTML) or { ok:false } (JSON), never a 200', async (t) => {
  webhook(t, undefined);
  const lines = logs(t);
  const calls = stubFetch(t);

  const page = await handler(post(BASE, 'text/html'));
  assert.equal(page.status, 502);
  const html = await page.text();
  const phone = fallbackPhone(); // whatever the fact base allows today
  if (phone) {
    assert.ok(html.includes(phone.display), 'the brief’s number is shown');
    assert.ok(html.includes(`href="${phone.href}"`));
  } else {
    assert.match(html, /Please call us\./);
    assert.doesNotMatch(html, /tel:/);
  }
  for (const p of BANNED_PHONES) assert.doesNotMatch(html, phonePattern(p), 'never a sister-brand number');
  assert.match(html, /href="\/areas\/fort-collins-co\/"/, 'back to the page they came from');

  const json = await handler(post(BASE));
  assert.equal(json.status, 502);
  assert.deepEqual(await json.json(), { ok: false });

  assert.equal(calls.length, 0, 'nothing is sent anywhere without the NoCo webhook');
  assert.ok(lines.some((l) => /NOCO_LEAD_WEBHOOK is not set/.test(l)));
});

test('a webhook that is not https is treated as unset', async (t) => {
  webhook(t, 'http://hooks.example.test/x');
  logs(t);
  const calls = stubFetch(t);
  const res = await handler(post(BASE));
  assert.equal(res.status, 502);
  assert.equal(calls.length, 0);
});

test('a refused hand-off is tried once and retried twice, then the visitor is told to call', async (t) => {
  webhook(t, HOOK);
  logs(t);
  const calls = stubFetch(t, () => new Response('nope', { status: 500 }));
  const res = await handler(post(BASE));
  assert.equal(res.status, 502);
  assert.deepEqual(await res.json(), { ok: false });
  assert.equal(calls.length, 3);
  const page = await handler(post(BASE, 'text/html'));
  assert.equal(page.status, 502);
  assert.match(page.headers.get('content-type'), /text\/html/);
});

test('a network error is retried the same way', async (t) => {
  webhook(t, HOOK);
  logs(t);
  const calls = stubFetch(t, () => { throw new TypeError('fetch failed', { cause: { code: 'ECONNRESET' } }); });
  const res = await handler(post(BASE));
  assert.equal(res.status, 502);
  assert.equal(calls.length, 3);
});

test('a hand-off that succeeds on a retry is a success', async (t) => {
  webhook(t, HOOK);
  logs(t);
  const calls = stubFetch(t, (n) => new Response(n === 1 ? 'busy' : 'Accepted', { status: n === 1 ? 503 : 200 }));
  const res = await handler(post(BASE));
  assert.equal(res.status, 200);
  assert.equal(calls.length, 2);
});

test('failures are logged without the visitor’s details or the webhook URL', async (t) => {
  webhook(t, HOOK);
  const lines = logs(t);
  stubFetch(t, () => { throw new Error(`boom ${HOOK}`); });
  await handler(post(BASE));
  assert.ok(lines.length > 0);
  const all = lines.join('\n');
  for (const s of PII) assert.ok(!all.includes(s), `log carries "${s}"`);
  assert.ok(!all.includes(HOOK), 'log carries the webhook URL');
});

test('the honeypot is answered as accepted but never forwarded', async (t) => {
  webhook(t, HOOK);
  logs(t);
  const calls = stubFetch(t);
  const bot = await handler(post(withField(BASE, 'company', 'Acme Holdings')));
  assert.equal(bot.status, 200);
  assert.deepEqual(await bot.json(), { ok: true });
  const botHtml = await handler(post(withField(BASE, 'company', 'Acme Holdings'), 'text/html'));
  assert.equal(botHtml.status, 303);
  assert.equal(calls.length, 0);
});

test('a form filled in under 2 seconds is a bot; no timing at all (no JavaScript) is a person', async (t) => {
  webhook(t, HOOK);
  logs(t);
  const calls = stubFetch(t);
  assert.equal((await handler(post(withField(BASE, 'elapsed_ms', '1200')))).status, 200);
  assert.equal(calls.length, 0, 'too fast: not forwarded');
  assert.equal((await handler(post(withField(BASE, 'elapsed_ms', '2400')))).status, 200);
  assert.equal(calls.length, 1);
  assert.equal((await handler(post(BASE.filter(([k]) => k !== 'elapsed_ms'), 'text/html'))).status, 303);
  assert.equal(calls.length, 2);
});

test('no phone and no email: 422, so the visitor can fix it', async (t) => {
  webhook(t, HOOK);
  logs(t);
  const calls = stubFetch(t);
  const fields = BASE.filter(([k]) => !['phone', 'email'].includes(k));
  const res = await handler(post(fields));
  assert.equal(res.status, 422);
  assert.equal((await res.json()).ok, false);
  const page = await handler(post(fields, 'text/html'));
  assert.equal(page.status, 422);
  assert.match(await page.text(), /phone number/);
  assert.equal(calls.length, 0);
});

test('"[TEST]" in the name travels as a test lead', async (t) => {
  webhook(t, HOOK);
  logs(t);
  const calls = stubFetch(t);
  await handler(post(withField(BASE, 'name', '[TEST] Ty')));
  assert.equal(calls[0].body.isTest, true);
  assert.match(calls[0].body.subject, /^\[TEST\] /);
});

test('a Denver-metro ZIP is forwarded as the timeless lane; a commercial pick as a bid', async (t) => {
  webhook(t, HOOK);
  logs(t);
  const calls = stubFetch(t);
  await handler(post(withField(withField(BASE, 'zip', '80516'), 'town', '')));
  assert.equal(calls[0].body.lane, 'timeless');
  await handler(post([...withField(BASE, 'zip', '10001'), ['town', 'New York']]));
  assert.equal(calls[1].body.lane, 'check-area');
  await handler(post([...BASE, ['use', 'Commercial, HOA or sports']]));
  assert.equal(calls[2].body.lane, 'bid');
});

test('JSON and multipart bodies are read the same as a plain form post', async (t) => {
  webhook(t, HOOK);
  logs(t);
  const calls = stubFetch(t);
  const obj = { use: ['Play area', 'Pet turf'], zip: '80550', name: 'Kim', phone: '9705550134', elapsed_ms: 9000 };
  const json = await handler(new Request(URL_, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(obj),
  }));
  assert.equal(json.status, 200);
  assert.deepEqual(calls[0].body.uses, ['Play area', 'Pet turf']);
  const fd = new FormData();
  for (const [k, v] of BASE) fd.append(k, v);
  const multi = await handler(new Request(URL_, { method: 'POST', headers: { Accept: 'application/json' }, body: fd }));
  assert.equal(multi.status, 200);
  assert.deepEqual(calls[1].body.uses, ['Pet turf', 'Putting green']);
});

test('only POST is served; oversized and unreadable bodies are refused', async (t) => {
  webhook(t, HOOK);
  logs(t);
  const calls = stubFetch(t);
  const get = await handler(new Request(URL_));
  assert.equal(get.status, 405);
  assert.equal(get.headers.get('allow'), 'POST');
  const big = await handler(post([...BASE, ['heard', 'x'.repeat(1900)], ['utm_term', 'y'.repeat(19_000)]]));
  assert.equal(big.status, 413);
  const declared = await handler(post(BASE, 'application/json', { headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': '999999', Accept: 'application/json' } }));
  assert.equal(declared.status, 413);
  const junk = await handler(new Request(URL_, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: '{not json' }));
  assert.equal(junk.status, 400);
  const untyped = await handler(new Request(URL_, { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: 'name=Kim' }));
  assert.equal(untyped.status, 400);
  assert.equal(calls.length, 0);
});

test('long values are cut, unknown fields are dropped, and a hostile page path is ignored', async (t) => {
  webhook(t, HOOK);
  logs(t);
  const calls = stubFetch(t);
  await handler(post([...withField(BASE, 'heard', 'z'.repeat(5000)), ['__proto__', 'x'], ['isTest', 'true'], ['page', 'https://evil.example/']]));
  const lead = calls[0].body;
  assert.equal(lead.heard.length, 2000);
  assert.equal(lead.isTest, false, 'a posted isTest field cannot mark a lead');
  assert.equal(lead.pageUrl, 'https://www.nocoturf.com/');
});

test('the function has no config.path and no hard-coded webhook, phone or sister-brand env', () => {
  const dir = `${root}netlify/functions`;
  const files = [`${dir}/lead.mjs`, ...readdirSync(`${dir}/lib`).map((f) => `${dir}/lib/${f}`)];
  for (const f of files) {
    const src = readFileSync(f, 'utf8');
    assert.doesNotMatch(src, /export const config/, `${f}: default URL /.netlify/functions/lead`);
    assert.doesNotMatch(src, /make\.com/i, `${f}: the webhook comes from NOCO_LEAD_WEBHOOK only`);
    assert.doesNotMatch(src, /TIMELESS_LEAD_WEBHOOK/, f);
    for (const p of BANNED_PHONES) assert.doesNotMatch(src, phonePattern(p), `${f} carries a sister-brand phone`);
  }
  assert.match(readFileSync(`${dir}/lead.mjs`, 'utf8'), /process\.env\.NOCO_LEAD_WEBHOOK/);
});
