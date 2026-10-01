/**
 * The lead router, pure: where a ZIP or town sits, which lane a request takes, and what Brian's email
 * says. Node built-ins only. Run: node --test tests/lead-routing.test.mjs
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  buildLead, screen, resolveArea, classifyZip, stateOf, zipOf, phoneParts,
  SERVICES, LANES, CAMPAIGN_NAME, LEAD_TYPE, MIN_ELAPSED_MS,
} from '../netlify/functions/lib/lead-routing.mjs';
import { SERVED_ZIPS, TIMELESS_ZIP_RANGES, UNASSIGNED_ZIPS, ZCTA_PLACES, PLACES } from '../netlify/functions/lib/places.mjs';
import { fallbackPhone, businessName, callUsPage } from '../netlify/functions/lib/fallback.mjs';
import { NOCO_TOWNS, TIMELESS_TOWNS, EXCLUDED_TOWNS } from '../src/data/territory.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const read = (p) => readFileSync(`${root}${p}`, 'utf8');

/* The sister brand's phones, read from docs/CONTRACTS.md so no test file has to type them. */
const BANNED_PHONES = [...read('docs/CONTRACTS.md').matchAll(/`(\d{3}-\d{3}-\d{4})`/g)]
  .map((m) => m[1]).filter((p) => !p.startsWith('720-630')).map((p) => p.replace(/\D/g, ''));
/* 3-3-4 digits with any separators ("303-349…", "(303) 349…", "+1303349…"). */
const phonePattern = (p) => new RegExp(`(?<!\\d)${p.slice(0, 3)}\\D{0,3}${p.slice(3, 6)}\\D{0,3}${p.slice(6)}(?!\\d)`);
const noBannedPhone = (html, label) => {
  for (const p of BANNED_PHONES) assert.doesNotMatch(html, phonePattern(p), `${label} carries a sister-brand phone`);
};
/* TIMELESS's email colours (its src/styles/tokens.css): the NoCo email must not wear them. */
const TIMELESS_COLOURS = ['#307408', '#8ACF35', '#48A008', '#80D028', '#16330C', '#DEBA1F'];

const submission = (data, extra = {}) => ({ id: 'lead_123', created_at: '2026-09-14T19:05:00.000Z', data: { ...data }, ...extra });
const BASE = {
  use: ['Putting green'], size: '300 to 800 sq ft', hoa: 'No', timeline: 'As soon as possible', town: 'Windsor', zip: '80550',
  name: 'Kim Test', phone: '(970) 555-0134', email: 'Kim@Example.com', contact_pref: 'Call', page: '/areas/windsor-co/',
  elapsed_ms: '48000',
};
const status = (town, zip = '') => resolveArea({ town, zip }).status;
const laneOf = (data) => buildLead(submission({ ...BASE, ...data })).lane;
const NOCO_NAMES = NOCO_TOWNS.flatMap((t) => [t.name, ...(t.sections ?? [])]);

test('BANNED_PHONES were read from CONTRACTS.md', () => {
  assert.equal(BANNED_PHONES.length, 2);
});

/* ---- ZIPs -------------------------------------------------------------------------------- */

test('the contested ZIPs land where the territory decision says', () => {
  const cases = [
    ['80516', 'timeless'], // Erie
    ['80525', 'served'], // Fort Collins
    ['80550', 'served'], // Windsor (and most of Severance)
    ['80503', 'served'], // Longmont (also Niwot: noted)
    ['80020', 'timeless'], // Broomfield
    ['80601', 'timeless'], // Brighton
    ['10001', 'out-of-state'],
  ];
  for (const [zip, want] of cases) assert.equal(status('', zip), want, zip);
  assert.equal(laneOf({ town: '', zip: '10001' }), 'check-area');
  assert.equal(laneOf({ town: '', zip: '80516' }), 'timeless');
  assert.equal(laneOf({ town: '', zip: '80020' }), 'timeless');
  assert.equal(laneOf({ town: '', zip: '80601' }), 'timeless');
  for (const zip of ['80525', '80550', '80503']) assert.equal(laneOf({ town: '', zip }), 'home', zip);
  assert.match(resolveArea({ zip: '80503' }).note, /Niwot/);
});

test('every ZIP of the towns is served (Census 2020 ZCTAs + USPS PO-box/unique ZIPs)', () => {
  const expected = {
    'Fort Collins': ['80521', '80522', '80523', '80524', '80525', '80526', '80527', '80528'],
    Windsor: ['80550', '80551'], Loveland: ['80537', '80538', '80539'],
    Greeley: ['80631', '80632', '80633', '80634', '80638', '80639'], Longmont: ['80501', '80502', '80503', '80504'],
    Johnstown: ['80534'], Berthoud: ['80513'], Timnath: ['80547'], Wellington: ['80549'], Severance: ['80550', '80546'],
    Mead: ['80542'], Firestone: ['80504', '80520'], Frederick: ['80530', '80504'], Dacono: ['80514'], Evans: ['80620'],
    Eaton: ['80615'], Milliken: ['80543'], 'Estes Park': ['80517', '80511'], LaSalle: ['80645'], Platteville: ['80651'], Laporte: ['80535'],
  };
  for (const [town, zips] of Object.entries(expected)) {
    for (const zip of zips) {
      assert.equal(classifyZip(zip).cls, 'served', `${town} ${zip}`);
      assert.equal(status(town, zip), 'served', `${town} + ${zip}`);
    }
  }
  assert.deepEqual(Object.keys(expected).filter((n) => !NOCO_NAMES.includes(n)), [], 'every town above is a territory.mjs town');
});

test('every NoCo town has a served ZIP, and every served ZIP belongs to a NoCo town', () => {
  for (const name of NOCO_NAMES) {
    const has = Object.keys(SERVED_ZIPS).some((z) => SERVED_ZIPS[z] === name || ZCTA_PLACES[z]?.includes(name));
    assert.ok(has, `${name} has no served ZIP`);
  }
  for (const [zip, name] of Object.entries(SERVED_ZIPS)) assert.ok(NOCO_NAMES.includes(name), `${zip} → ${name}`);
});

test('the served, Denver-metro and unassigned ZIP sets never overlap', () => {
  const inTimeless = (z) => TIMELESS_ZIP_RANGES.some(([a, b = a]) => Number(z) >= a && Number(z) <= b);
  for (const zip of Object.keys(SERVED_ZIPS)) assert.ok(!inTimeless(zip), `${zip} is both served and Denver metro`);
  for (const [zip, name] of Object.entries(UNASSIGNED_ZIPS)) {
    assert.ok(!SERVED_ZIPS[zip] && !inTimeless(zip), zip);
    assert.ok(name in EXCLUDED_TOWNS, `${name} is an EXCLUDED_TOWNS entry`);
  }
  assert.equal(classifyZip('80544').cls, 'unassigned', 'Niwot stays with Brian, not forwarded');
  assert.equal(classifyZip('80621').cls, 'unassigned', 'Fort Lupton stays with Brian');
});

test('a town the Census puts inside a shared ZIP wins; a town that contradicts the ZIP is checked', () => {
  const frederick = resolveArea({ town: 'Frederick', zip: '80516' });
  assert.equal(frederick.status, 'served', 'part of Frederick uses Erie’s 80516');
  assert.match(frederick.note, /Confirm the address/);
  assert.equal(status('Erie', '80516'), 'timeless');
  assert.equal(status('Dacono', '80603'), 'served');
  assert.equal(status('Firestone', '80621'), 'served');
  assert.equal(status('', '80621'), 'unassigned');
  assert.equal(status('Niwot', '80503'), 'unassigned');
  assert.equal(status('Severance', '80610'), 'served');
  assert.equal(status('Windsor', '80202'), 'mismatch');
  assert.equal(status('Denver', '80525'), 'mismatch');
  assert.equal(status('Fort Collins', '10001'), 'mismatch');
  assert.equal(laneOf({ town: 'Windsor', zip: '80202' }), 'check-area', 'a typo is never forwarded away');
  assert.match(resolveArea({ town: 'Windsor', zip: '80525' }).note, /They wrote Windsor; ZIP 80525 is Fort Collins/);
});

test('other Colorado ZIPs are checked, with the place named from the Census', () => {
  assert.equal(status('', '80610'), 'outside');
  assert.match(resolveArea({ zip: '80610' }).note, /Ault/);
  assert.equal(status('', '80517'), 'served', 'Estes Park joined 2026-09-30');
  assert.equal(status('', '80903'), 'outside');
  assert.equal(laneOf({ town: '', zip: '80903' }), 'check-area');
});

test('a ZIP comes from the zip field, or from the very end of the town field', () => {
  assert.equal(zipOf({ zip: '80525-1234' }), '80525');
  assert.equal(zipOf({ zip: ' 80525 ' }), '80525');
  assert.equal(zipOf({ town: 'Eaton CO 80615' }), '80615');
  assert.equal(zipOf({ town: '37661 Co Rd 39, Eaton' }), null, 'a rural house number is not a ZIP');
  assert.equal(status('37661 Co Rd 39, Eaton'), 'served');
  assert.equal(zipOf({ zip: '123456' }), null);
  assert.equal(zipOf({ zip: 'n/a', town: 'Greeley' }), null);
});

/* ---- towns -------------------------------------------------------------------------------- */

test('without a ZIP, the town decides: every NoCo town is served, every Denver-metro town forwarded', () => {
  for (const name of NOCO_NAMES) assert.equal(status(name), 'served', name);
  for (const name of TIMELESS_TOWNS) assert.equal(status(`${name}, CO`), 'timeless', name);
  assert.equal(status('Ft. Collins'), 'served');
  assert.equal(status('fort collins co'), 'served');
  assert.equal(status('La Salle'), 'served');
  assert.equal(status('La Porte'), 'served');
  assert.equal(status('Niwot'), 'unassigned');
  assert.equal(status('Fort Lupton'), 'unassigned');
  assert.equal(status('Estes Park'), 'served');
  assert.equal(status('Kersey'), 'outside');
  assert.equal(status('somewhere'), 'unknown');
  assert.equal(status(''), 'unknown');
});

test('a weak Denver-metro name never forwards a lead on its own; mixed names are asked about', () => {
  assert.equal(status('Mountain View'), 'unknown');
  assert.equal(status('Mountain View, Windsor'), 'served');
  assert.equal(status('Windsor Gardens, Denver'), 'unknown');
  assert.equal(laneOf({ town: 'Twin Lakes', zip: '' }), 'check-area');
  assert.ok(PLACES.some(([n, c, strong]) => n === 'Mountain View' && c === 'timeless' && !strong));
});

test('another state is outside, and state codes that are words need a comma', () => {
  assert.equal(status('Cheyenne, WY'), 'out-of-state');
  assert.equal(status('Cheyenne Wyoming'), 'out-of-state');
  assert.equal(status('Loveland, OH'), 'out-of-state');
  assert.equal(status('Scottsbluff NE 69361'), 'out-of-state');
  assert.equal(stateOf('Windsor, CO 80550'), 'CO');
  assert.equal(stateOf('Windsor co'), 'CO');
  assert.equal(stateOf('Austin TX'), 'TX');
  assert.equal(stateOf('Portland, ME'), 'ME');
  assert.equal(stateOf('near me'), null);
  assert.equal(stateOf('Pelican Ct'), null);
  assert.equal(stateOf('North Washington'), null, 'a Denver place, not Washington state');
  assert.equal(stateOf('Greeley'), null);
});

/* ---- services and lanes ----------------------------------------------------------------- */

test('the service keys are exactly services.ts formUse values, plus "Not sure"', () => {
  const formUse = [...read('src/data/services.ts').matchAll(/formUse:\s*'([^']+)'/g)].map((m) => m[1]);
  assert.ok(formUse.length >= 6, 'services.ts parsed');
  assert.deepEqual(Object.keys(SERVICES).sort(), [...formUse, 'Not sure'].sort());
  for (const s of Object.values(SERVICES)) {
    assert.ok(['home', 'bid'].includes(s.lane));
    assert.ok(s.prep.length >= 3);
  }
  assert.equal(SERVICES['Commercial, HOA or sports'].lane, 'bid');
});

test('every lane: home, bid, timeless, check-area', () => {
  const home = buildLead(submission({ ...BASE, use: ['Pet turf'], zip: '80525', town: 'Fort Collins' }));
  assert.equal(home.lane, 'home');
  assert.equal(home.market, 'northern-colorado');
  assert.match(home.subject, /^Ready now · New estimate: Pet turf in Fort Collins 80525 · Kim Test$/);

  const bid = buildLead(submission({ ...BASE, use: ['Commercial, HOA or sports'], timeline: 'In the next few months' }));
  assert.equal(bid.lane, 'bid');
  assert.equal(bid.highValue, true);
  assert.match(bid.subject, /^Bid request: Commercial, HOA or sports in Windsor 80550/);
  assert.match(bid.emailHtml, /Who approves the work/);

  const forward = buildLead(submission({ ...BASE, town: 'Broomfield', zip: '80020' }));
  assert.equal(forward.lane, 'timeless');
  assert.equal(forward.market, '');
  assert.match(forward.subject, /Forward \(Denver metro\)/);
  assert.match(forward.emailHtml, /Forward this one\./);
  assert.match(forward.emailHtml, /Forward it rather than booking it/);

  const check = buildLead(submission({ ...BASE, town: 'New York', zip: '10001' }));
  assert.equal(check.lane, 'check-area');
  assert.equal(check.areaStatus, 'out-of-state');
  assert.match(check.emailHtml, /Where is it\?/);
  assert.equal(Object.keys(LANES).sort().join(), 'bid,check-area,home,timeless');
});

test('several uses: a commercial pick makes it a bid, and the call-prep merges', () => {
  const lead = buildLead(submission({ ...BASE, use: ['Pet turf', 'Commercial, HOA or sports', 'Pet turf'] }));
  assert.equal(lead.lane, 'bid');
  assert.deepEqual(lead.uses, ['Pet turf', 'Commercial, HOA or sports']);
  assert.equal(lead.serviceLabel, 'Pet turf + Commercial, HOA or sports');
  assert.match(lead.emailHtml, /How many dogs/);
  assert.match(lead.emailHtml, /bid deadline/);
  const unsure = buildLead(submission({ ...BASE, use: 'Not sure' }));
  assert.equal(unsure.lane, 'home');
  assert.match(unsure.emailHtml, /What are they looking to build/);
  const none = buildLead(submission({ ...BASE, use: [] }));
  assert.equal(none.serviceLabel, 'Not given');
  assert.equal(none.lane, 'home');
  assert.equal(buildLead(submission({ ...BASE, size: 'Over 1,500 sq ft' })).highValue, true);
  assert.equal(buildLead(submission({ ...BASE, size: 'Under 300 sq ft' })).highValue, false);
});

/* ---- screening ---------------------------------------------------------------------------- */

test('the honeypot and a too-fast form are dropped; a no-JS form (no timing) is kept', () => {
  assert.equal(screen({ ...BASE, company: 'Acme Holdings' }), 'honeypot');
  assert.equal(buildLead(submission({ ...BASE, company: 'x' })), null);
  assert.equal(MIN_ELAPSED_MS, 2000);
  assert.equal(screen({ ...BASE, elapsed_ms: '1999' }), 'too-fast');
  assert.equal(screen({ ...BASE, elapsed_ms: '0' }), 'too-fast');
  assert.equal(buildLead(submission({ ...BASE, elapsed_ms: '800' })), null);
  assert.equal(screen({ ...BASE, elapsed_ms: '2000' }), null);
  assert.equal(screen({ ...BASE, elapsed_ms: '' }), null, 'no script ran: a person on a no-JS browser');
  assert.equal(screen({ ...BASE, elapsed_ms: undefined }), null);
});

test('a request with no phone and no email cannot be called back', () => {
  assert.equal(screen({ name: 'Kim', use: ['Pet turf'] }), 'no-contact');
  assert.equal(screen({ name: 'Kim', phone: 'call me' }), 'no-contact');
  assert.equal(screen({ name: 'Kim', email: 'kim@example.com' }), null);
  assert.equal(screen({ phone: '970 555 0134' }), null);
});

test('"[TEST]" in the name marks a test lead', () => {
  const lead = buildLead(submission({ ...BASE, name: '[TEST] Ty' }));
  assert.equal(lead.isTest, true);
  assert.match(lead.subject, /^\[TEST\] /);
  assert.equal(lead.firstName, 'Ty');
  assert.match(lead.emailHtml, /TEST LEAD/);
  assert.equal(buildLead(submission(BASE)).isTest, false);
  assert.equal(buildLead(submission(BASE), { test: true }).isTest, true);
});

/* ---- the lead and Brian's email --------------------------------------------------------- */

test('a home lead is classified, summarised and escaped', () => {
  const lead = buildLead(submission({ ...BASE, name: `Kim <b>"O'Neil"</b>`, hoa: 'Yes' }));
  assert.equal(lead.leadType, LEAD_TYPE);
  assert.equal(lead.campaignName, CAMPAIGN_NAME);
  assert.equal(lead.source, 'www.nocoturf.com');
  assert.equal(lead.priority, 'ready-now');
  assert.equal(lead.email, 'kim@example.com');
  assert.equal(lead.phoneE164, '+19705550134');
  assert.equal(lead.summary, 'Putting green · 300 to 800 sq ft · Ready now · Northern Colorado');
  assert.ok(!lead.emailHtml.includes('<b>"O'), 'what the visitor typed never becomes markup');
  assert.match(lead.emailHtml, /Kim &lt;b&gt;&quot;O&#39;Neil&quot;&lt;\/b&gt;/);
  assert.match(lead.emailHtml, /href="tel:\+19705550134"/);
  assert.match(lead.emailHtml, /How many cups/);
  assert.match(lead.emailHtml, /has to approve the plan first/, 'HOA = Yes adds the HOA question');
  assert.match(lead.submittedLocal, /MDT/, 'Northern Colorado time');
  assert.match(buildLead(submission(BASE, { created_at: '2026-12-01T19:05:00.000Z' })).submittedLocal, /MST/);
});

test('Brian’s email is NoCo’s: no sister-brand name, phone or colours, in any lane', () => {
  const towns = [['Windsor', '80550'], ['Erie', '80516'], ['Denver', '80202'], ['Estes Park', ''], ['Niwot', ''], ['', '10001'], ['Windsor', '80202']];
  for (const [town, zip] of towns) {
    for (const use of [['Pet turf'], ['Commercial, HOA or sports']]) {
      const lead = buildLead(submission({ ...BASE, town, zip, use }));
      const label = `${town} ${zip} ${use}`;
      assert.match(lead.emailHtml, /NoCo Turf Co\./, label);
      assert.doesNotMatch(lead.emailHtml, /timeless/i, label);
      assert.doesNotMatch(lead.subject, /timeless/i, label);
      assert.doesNotMatch(lead.emailHtml, /timelessgrass/i, label);
      for (const c of TIMELESS_COLOURS) assert.ok(!lead.emailHtml.toUpperCase().includes(c), `${label}: ${c}`);
      noBannedPhone(lead.emailHtml, label);
    }
  }
});

test('a text preference puts the Text button first', () => {
  const lead = buildLead(submission({ ...BASE, contact_pref: 'Text' }));
  assert.equal(lead.contactPref, 'Text');
  assert.ok(lead.emailHtml.indexOf('sms:+19705550134') < lead.emailHtml.indexOf('>Call<'));
  assert.match(lead.emailHtml, /Text back \(their preference\)/);
  assert.equal(buildLead(submission({ ...BASE, contact_pref: 'Carrier pigeon' })).contactPref, '');
});

test('attribution, "heard" and the page address travel with the lead', () => {
  const lead = buildLead(submission({
    ...BASE, utm_source: 'google', utm_medium: 'cpc', utm_campaign: 'turf', utm_term: 'turf windsor', utm_content: 'a',
    gclid: 'abc123', fbclid: 'fb456', heard: 'ChatGPT',
  }));
  for (const [k, v] of Object.entries({ utm_source: 'google', utm_medium: 'cpc', utm_campaign: 'turf', utm_term: 'turf windsor', utm_content: 'a', gclid: 'abc123', fbclid: 'fb456' })) {
    assert.equal(lead[k], v, k);
  }
  assert.equal(lead.heard, 'ChatGPT');
  assert.equal(lead.landingPage, '/areas/windsor-co/');
  assert.equal(lead.pageUrl, 'https://www.nocoturf.com/areas/windsor-co/');
  assert.match(lead.emailHtml, /gclid: abc123/);
  assert.match(lead.emailHtml, /fbclid: fb456/);
  assert.match(lead.emailHtml, /Heard about us/);
});

test('a page that is not a path on this site never becomes the email link', () => {
  for (const bad of ['@evil.example/x', '//evil.example/', 'https://evil.example/', '/ok path', `/${'a'.repeat(400)}`]) {
    assert.equal(buildLead(submission({ ...BASE, page: bad })).pageUrl, 'https://www.nocoturf.com/', bad);
  }
});

test('phone numbers become a readable number and a dialable link', () => {
  assert.deepEqual(phoneParts('+1 (970) 555-0134'), { display: '(970) 555-0134', e164: '+19705550134' });
  assert.deepEqual(phoneParts('970.555.0134'), { display: '(970) 555-0134', e164: '+19705550134' });
});

/* ---- the fallback page ------------------------------------------------------------------ */

const briefWith = (phone, name) => ({ identity: { display_name: name, locations: phone ? [{ phone }] : [] } });
const P = (status, source = 'operator_decision') => ({ value: '+1 970-528-1076', status, source });

test('the fallback number renders only with a renderable status and a source', () => {
  assert.deepEqual(fallbackPhone(briefWith(P('CLIENT_STATED'))), { display: '970-528-1076', href: 'tel:+19705281076' });
  for (const s of ['VERIFIED', 'CLIENT_CONFIRMED', 'EXTERNAL_SOURCE']) assert.ok(fallbackPhone(briefWith(P(s))), s);
  assert.equal(fallbackPhone(briefWith(P('INFERENCE'))), null);
  assert.equal(fallbackPhone(briefWith(P('UNKNOWN'))), null);
  assert.equal(fallbackPhone(briefWith(P('VERIFIED', null))), null, 'no source, no number');
  assert.equal(fallbackPhone(briefWith(null)), null);
  assert.equal(fallbackPhone({}), null);
  assert.equal(businessName(briefWith(null, { value: 'NoCo Turf Co.', status: 'UNKNOWN', source: null })), null);
});

test('the fallback page is a 502 that says "Please call us" when the brief has no number', async () => {
  const none = callUsPage({ brief: briefWith(null) });
  assert.equal(none.status, 502);
  const html = await none.text();
  assert.match(html, /Please call us\./);
  assert.doesNotMatch(html, /tel:/);
  assert.match(html, /noindex/);
  const withPhone = await callUsPage({ brief: briefWith(P('CLIENT_STATED')), back: '//evil.example/' }).text();
  assert.match(withPhone, /href="tel:\+19705281076"/);
  assert.match(withPhone, /href="\/contact\/"/, 'an off-site "back" link falls back to /contact/');
  noBannedPhone(withPhone, 'fallback page');
});
