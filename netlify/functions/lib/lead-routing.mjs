/**
 * A website estimate request, turned into what Brian needs to call it back.
 *
 * Ported from TIMELESS Grass & Greens (netlify/functions/lib/lead-routing.mjs) for one market,
 * Northern Colorado. netlify/functions/lead.mjs hands every request from the estimate form to
 * screen() and buildLead(); the lead goes to Make (env NOCO_LEAD_WEBHOOK), which routes it by
 * `lane`: every real lead to the TTM portal, and an email to Brian from the route for that lane.
 * Pure: no network, and no clock beyond the submission's own timestamp.
 * tests/lead-routing.test.mjs covers every branch.
 *
 * Lanes:
 *   home        a home project in NoCo’s towns (src/data/territory.mjs NOCO_TOWNS)
 *   bid         commercial, HOA or sports turf in NoCo’s towns
 *   timeless    a Denver-metro ZIP or town (Erie, Brighton, Thornton, Broomfield and south): a note
 *               to forward the lead to the sister brand. NoCo never books these.
 *   check-area  anywhere else: other Colorado, out of state, unassigned (Fort Lupton, Niwot), a ZIP
 *               and town that disagree, or no location at all. Brian decides.
 *
 * Nothing here is shown to the visitor. The email is Brian's working copy, so it can say what the
 * site never does: a lane, a priority, and where a ZIP sits against the territory.
 *
 * Form fields (docs/CONTRACTS.md "Lead path" — the names are the contract):
 *   use (multi) · town · zip · size · hoa · timeline · name · phone · email · contact_pref · heard ·
 *   page · company (honeypot) · elapsed_ms · utm_source/medium/campaign/term/content · gclid · fbclid
 */
import { SERVED_ZIPS, TIMELESS_ZIP_RANGES, UNASSIGNED_ZIPS, ZCTA_PLACES, PLACES, classOfPlace, excludedReason, spellings, TOWN_COUNT } from './places.mjs';
import { renderEmail } from './lead-email.mjs';

export const SITE = 'www.nocoturf.com';
export const LEAD_TYPE = 'Website turf installation lead';
export const CAMPAIGN_NAME = 'NoCo Turf · Website Estimate Lead';
export const MARKET = { key: 'northern-colorado', label: 'Northern Colorado', tz: 'America/Denver' };

/** A form filled in faster than this (ms, measured by the page) is a bot. */
export const MIN_ELAPSED_MS = 2000;

/* The form's first question, keyed by the exact value it posts: src/data/services.ts `formUse`, plus
   "Not sure" (tests/lead-routing.test.mjs checks the keys against services.ts). `lane` decides the
   Make route; `prep` is what to ask on the callback. The question lists are TIMELESS's, adapted. */
export const SERVICES = {
  'Lawn replacement': { label: 'Lawn replacement', lane: 'home', prep: [
    'What is there now: grass, dirt, rock or old turf?',
    'Who uses the yard: kids, dogs, entertaining?',
    'Sprinklers to cap or reroute, and any slope or drainage trouble?',
  ] },
  'Pet turf': { label: 'Pet turf', lane: 'home', prep: [
    'How many dogs, and how big?',
    'Where do they go now, and is there a hose nearby for rinsing?',
    'Any odor, mud or drainage problem they want solved?',
  ] },
  'Putting green': { label: 'Putting green', lane: 'home', prep: [
    'How many cups, and do they want a fringe or a chipping area?',
    'Rough size, and where in the yard: sun, slope, trees?',
    'Anything to plan around it: lighting, a patio, a fire pit?',
  ] },
  'Play area': { label: 'Play area', lane: 'home', prep: [
    'What goes over it: a play set, swings, or open play?',
    'If there is equipment, how high is the tallest platform?',
    'How much shade, and how old are the kids?',
  ] },
  'Commercial, HOA or sports': { label: 'Commercial, HOA or sports', lane: 'bid', prep: [
    'What kind of site: HOA common area, metro district, daycare, sports field or business?',
    'Who approves the work, and is there a bid deadline or budget cycle?',
    'Is there a site plan, drawings or measurements they can send?',
  ] },
  'Repair or replace old turf': { label: 'Repair or replace old turf', lane: 'home', prep: [
    'How old is the turf, and what is failing: flat, torn, smelly, draining badly?',
    'Do they want it repaired, cleaned and re-infilled, or replaced?',
    'Pets on it? And who installed it? The base may need rebuilding.',
  ] },
  'Not sure': { label: 'Not sure yet', lane: 'home', prep: [
    'What are they looking to build?',
    'Roughly how big is the area?',
    'When would they like it done?',
  ] },
};
const NOT_SURE = 'Not sure';

export const TIMELINES = {
  'As soon as possible': { key: 'ready-now', label: 'Ready now', line: 'They want it done as soon as possible. Get back to them first.' },
  'In the next few months': { key: 'planning', label: 'Next few months', line: 'Planning for the next few months. Book the visit while it is fresh.' },
  'Just pricing it out': { key: 'pricing', label: 'Pricing it out', line: 'Pricing it out. A clear written price is what they are after.' },
};
const LARGE_SIZES = new Set(['Over 1,500 sq ft']);

export const LANES = {
  home: { label: 'Home project', kicker: 'Website estimate request', subject: 'New estimate' },
  bid: { label: 'Commercial or HOA bid', kicker: 'Commercial, HOA or sports bid', subject: 'Bid request' },
  // Brian's email never names the sister brand (the brief for this port): "the Denver-metro brand".
  timeless: { label: 'Forward: Denver metro', kicker: 'Denver-metro project: forward it', subject: 'Forward (Denver metro)' },
  'check-area': { label: 'Check the area', kicker: 'Check the service area first', subject: 'Check the area' },
};

export const AREA_LABELS = {
  served: MARKET.label,
  timeless: 'Denver metro (forward)',
  unassigned: 'Not assigned yet',
  outside: `Outside the ${TOWN_COUNT} towns`,
  'out-of-state': 'Outside Colorado',
  mismatch: 'ZIP and town disagree',
  unknown: 'Not clear yet',
};

/* ---- where the project is -------------------------------------------------------------------
   The ZIP decides when there is one, with the town as a cross-check: a town the Census puts partly
   inside that ZIP (a Frederick house on Erie's 80516) wins, and a town that contradicts the ZIP goes
   to check-area rather than being forwarded or booked on a typo. Without a ZIP, the town, then the
   state. */
const inRanges = (n, ranges) => ranges.some(([a, b = a]) => n >= a && n <= b);
const isColorado = (n) => n >= 80000 && n <= 81699;
const OTHER_BRAND = 'the Denver-metro brand';

export function classifyZip(zip) {
  const n = Number(zip);
  if (SERVED_ZIPS[zip]) return { cls: 'served', place: SERVED_ZIPS[zip] };
  if (UNASSIGNED_ZIPS[zip]) return { cls: 'unassigned', place: UNASSIGNED_ZIPS[zip] };
  if (inRanges(n, TIMELESS_ZIP_RANGES)) return { cls: 'timeless', place: ZCTA_PLACES[zip]?.[0] ?? '' };
  if (isColorado(n)) return { cls: 'outside', place: ZCTA_PLACES[zip]?.[0] ?? '' };
  return { cls: 'out-of-state', place: '' };
}

const norm = (s) => ` ${String(s).toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
  .replace(/['’.]/g, '').replace(/\bsaint\b/g, 'st').replace(/[^a-z0-9]+/g, ' ').trim()} `;
const INDEX = PLACES
  .flatMap(([name, cls, strong]) => spellings(name).map((s) => ({ key: norm(s), name, cls, strong })))
  .sort((a, b) => b.key.length - a.key.length);

/** The places named in free text: { cls, name, names, strong } | { cls: 'mixed', names } | null. */
export function matchTown(text) {
  let hay = norm(text);
  if (!hay.trim()) return null;
  const hits = [];
  for (const p of INDEX) {
    if (hay.includes(p.key)) { hits.push(p); hay = hay.replace(p.key, ' '); }
  }
  if (!hits.length) return null;
  const strong = hits.filter((h) => h.strong);
  const pool = strong.length ? strong : hits;
  const names = [...new Set(pool.map((h) => h.name))];
  if (new Set(pool.map((h) => h.cls)).size > 1) return { cls: 'mixed', names, strong: true };
  return { cls: pool[0].cls, name: pool[0].name, names, strong: pool[0].strong };
}

const STATE_NAMES = {
  alabama: 'AL', alaska: 'AK', arizona: 'AZ', arkansas: 'AR', california: 'CA', colorado: 'CO', connecticut: 'CT',
  delaware: 'DE', florida: 'FL', georgia: 'GA', hawaii: 'HI', idaho: 'ID', illinois: 'IL', indiana: 'IN', iowa: 'IA',
  kansas: 'KS', kentucky: 'KY', louisiana: 'LA', maine: 'ME', maryland: 'MD', massachusetts: 'MA', michigan: 'MI',
  minnesota: 'MN', mississippi: 'MS', missouri: 'MO', montana: 'MT', nebraska: 'NE', nevada: 'NV', 'new hampshire': 'NH',
  'new jersey': 'NJ', 'new mexico': 'NM', 'new york': 'NY', 'north carolina': 'NC', 'north dakota': 'ND', ohio: 'OH',
  oklahoma: 'OK', oregon: 'OR', pennsylvania: 'PA', 'rhode island': 'RI', 'south carolina': 'SC', 'south dakota': 'SD',
  tennessee: 'TN', texas: 'TX', utah: 'UT', vermont: 'VT', 'west virginia': 'WV', wisconsin: 'WI', wyoming: 'WY',
  // "washington" and "virginia" are left out: North Washington and Virginia Village are Denver places.
};
const US_STATES = new Set('AL AK AZ AR CA CO CT DE DC FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY'.split(' '));
/* Codes that are also everyday words or street endings ("Pelican Ct", "near me", "Castle Rock in")
   count only after a comma ("Portland, ME"). */
const WORDLIKE_STATES = new Set('AL CT DE HI ID IN LA MA ME MO NE OH OK OR PA WY'.split(' '));

/** The state named at the end of what they typed ("Loveland, OH", "Cheyenne Wyoming 82001"). */
export function stateOf(text) {
  const t = String(text ?? '').trim().replace(/[\s,.]*\d{5}(?:-\d{4})?[\s,.]*$/, '');
  const full = t.toLowerCase().match(new RegExp(`(?:^|[\\s,])(${Object.keys(STATE_NAMES).join('|')})\\.?$`))?.[1];
  if (full) return STATE_NAMES[full];
  const end = t.match(/(,\s*|^|\s)(colo|[a-z]\.?[a-z])\.?$/i);
  if (!end) return null;
  const abbr = end[2].replace('.', '').toUpperCase();
  const code = abbr === 'COLO' ? 'CO' : abbr;
  if (!US_STATES.has(code)) return null;
  if (code === 'CO') return 'CO';
  return end[1].startsWith(',') || !WORDLIKE_STATES.has(code) ? code : null;
}

/** The ZIP: from the zip field, else a ZIP at the very end of the town field ("Eaton CO 80615").
 *  A five-digit number earlier in the town field is a rural house number, not a ZIP. */
export function zipOf({ zip = '', town = '' } = {}) {
  return String(zip).match(/(?:^|\D)(\d{5})(?:-?\d{4})?(?:\D|$)/)?.[1]
    ?? String(town).match(/(?:^|\D)(\d{5})(?:-\d{4})?\s*$/)?.[1]
    ?? null;
}

const quote = (s) => `“${s}”`;

function zipNote(zip, z) {
  switch (z.cls) {
    case 'timeless': return `ZIP ${zip}${z.place ? ` (${z.place})` : ''} is in the Denver metro: ${OTHER_BRAND}’s area. Forward this lead there; don’t book it for NoCo.`;
    case 'unassigned': return `ZIP ${zip} is ${z.place}, which isn’t assigned to NoCo or ${OTHER_BRAND} yet. You decide.`;
    case 'outside': {
      const why = safeReason(z.place);
      return z.place
        ? `ZIP ${zip} is ${z.place}, outside the ${TOWN_COUNT} towns.${why ? ` Left out on purpose: ${why}.` : ''} Confirm it’s a trip you make.`
        : `ZIP ${zip} is in Colorado, outside the ${TOWN_COUNT} towns. Confirm where it is and whether it’s a trip you make.`;
    }
    case 'out-of-state': return `ZIP ${zip} is outside Colorado.`;
    default: return '';
  }
}
/** A ZIP class in a few words, for a note that sets it against what they typed. */
function describeZip(z) {
  switch (z.cls) {
    case 'served': return `${z.place}, in NoCo’s ${TOWN_COUNT} towns`;
    case 'timeless': return z.place ? `${z.place}, in the Denver metro` : 'in the Denver metro';
    case 'unassigned': return `${z.place}, which isn’t assigned yet`;
    case 'outside': return z.place ? `${z.place}, outside the ${TOWN_COUNT} towns` : `in Colorado, outside the ${TOWN_COUNT} towns`;
    default: return 'outside Colorado';
  }
}

/* territory.mjs reasons are internal notes; never let one carry the sister brand's name into the email. */
const safeReason = (place) => { const r = excludedReason(place); return /timeless/i.test(r) ? '' : r; };

function townNote(t) {
  switch (t.cls) {
    case 'timeless': return `${t.name} is in the Denver metro: ${OTHER_BRAND}’s area. Forward this lead there; don’t book it for NoCo.`;
    case 'unassigned': return `${t.name} isn’t assigned to NoCo or ${OTHER_BRAND} yet. You decide.`;
    case 'outside': {
      const why = safeReason(t.name);
      return `${t.name} is outside the ${TOWN_COUNT} towns.${why ? ` Left out on purpose: ${why}.` : ''} Confirm it’s a trip you make.`;
    }
    default: return '';
  }
}

/**
 * @param town what they typed as the town (may carry a ZIP, "Fort Collins 80525")
 * @param zip the zip field
 * @returns { status, place, via, zip, note }. status: served | timeless | unassigned | outside |
 *          out-of-state | mismatch | unknown
 */
export function resolveArea({ town = '', zip = '' } = {}) {
  const z5 = zipOf({ zip, town });
  const t = matchTown(town);
  const firm = t && t.cls !== 'mixed' && t.strong ? t : null;

  if (z5) {
    const z = classifyZip(z5);
    const sharers = ZCTA_PLACES[z5] ?? [];
    if (firm && firm.cls !== z.cls) {
      if (sharers.includes(firm.name)) {
        const base = { status: firm.cls, place: firm.name, via: 'zip+town', zip: z5 };
        const lead = `ZIP ${z5} is shared${z.place ? ` (mostly ${z.place})` : ''}, and they wrote ${firm.name}.`;
        return firm.cls === 'served'
          ? { ...base, note: `${lead} Part of ${firm.name} uses this ZIP. Confirm the address.` }
          : { ...base, note: `${lead} ${townNote(firm)}` };
      }
      return {
        status: 'mismatch', place: firm.name, via: 'zip+town', zip: z5,
        note: `They wrote ${firm.name}, but ZIP ${z5} is ${describeZip(z)}. Check which is right before booking or forwarding it.`,
      };
    }
    if (z.cls === 'served') {
      let note = '';
      if (firm && firm.name !== z.place && !sharers.includes(firm.name)) note = `They wrote ${firm.name}; ZIP ${z5} is ${z.place}.`;
      if (!firm) {
        const unsettled = sharers.filter((p) => ['unassigned', 'timeless'].includes(classOfPlace(p)));
        if (unsettled.length) note = `ZIP ${z5} also reaches into ${unsettled.join(', ')}. Confirm the address is in ${z.place}.`;
      }
      return { status: 'served', place: firm?.cls === 'served' ? firm.name : z.place, via: 'zip', zip: z5, note };
    }
    return { status: z.cls, place: z.place, via: 'zip', zip: z5, note: zipNote(z5, z) };
  }

  const state = stateOf(town);
  if (state && state !== 'CO') return { status: 'out-of-state', place: '', via: 'state', zip: '', note: `They wrote a place in ${state}, outside Colorado.` };
  if (t?.cls === 'mixed') {
    return { status: 'unknown', place: '', via: 'town', zip: '', note: `${t.names.map(quote).join(' and ')} point to different areas. Ask where the project is.` };
  }
  if (t && !t.strong) {
    return { status: 'unknown', place: '', via: 'town', zip: '', note: `${quote(t.name)} is also a Denver-metro place name. Ask which town it’s in.` };
  }
  if (t) return { status: t.cls, place: t.name, via: 'town', zip: '', note: townNote(t) };
  return { status: 'unknown', place: '', via: 'none', zip: '', note: 'No ZIP, and no town we recognise. Ask where the project is.' };
}

/* ---- the lead ----------------------------------------------------------------------------- */
export function phoneParts(raw) {
  const digits = String(raw ?? '').replace(/\D/g, '');
  const ten = digits.length === 11 && digits[0] === '1' ? digits.slice(1) : digits;
  if (ten.length === 10) return { display: `(${ten.slice(0, 3)}) ${ten.slice(3, 6)}-${ten.slice(6)}`, e164: `+1${ten}` };
  return { display: String(raw ?? '').trim(), e164: digits ? `+${digits}` : '' };
}

export const ATTRIBUTION = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'gclid', 'fbclid'];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const field = (data) => (k) => String(data?.[k] ?? '').trim();
const usesOf = (data) => [...new Set([].concat(data?.use ?? []).map((u) => String(u).trim()).filter(Boolean))].slice(0, 8);

/**
 * Should this submission be dropped before it becomes a lead?
 * @returns null (keep it) | 'honeypot' | 'too-fast' | 'no-contact'
 */
export function screen(data) {
  const f = field(data);
  if (f('company')) return 'honeypot'; // a person never sees that field
  const ms = f('elapsed_ms');
  /* Empty means the page's script never ran (a no-JS visitor): that is a person, not a bot. */
  if (ms !== '' && Number.isFinite(Number(ms)) && Number(ms) < MIN_ELAPSED_MS) return 'too-fast';
  const phoneDigits = f('phone').replace(/\D/g, '');
  if (phoneDigits.length < 7 && !EMAIL_RE.test(f('email'))) return 'no-contact';
  return null;
}

/**
 * @param payload { id, created_at, data: { field: value, use: string | string[] } }
 * @param opts.test a test run: Make sends it to the agency inbox only, never to Brian or the portal.
 *        A name containing "[TEST]" sets it too.
 * @returns the lead for Make, or null when screen() says drop it
 */
export function buildLead(payload, { test = false } = {}) {
  const data = payload?.data ?? {};
  if (screen(data)) return null;
  const f = field(data);
  const name = f('name').replace(/\s+/g, ' ');
  const isTest = Boolean(test) || /\[test\]/i.test(name);
  const phone = f('phone');
  const emailRaw = f('email');
  const email = EMAIL_RE.test(emailRaw) ? emailRaw.toLowerCase() : '';

  const uses = usesOf(data);
  const known = uses.map((u) => SERVICES[u]).filter(Boolean);
  const serviceLabel = uses.length ? uses.map((u) => SERVICES[u]?.label ?? u).join(' + ') : 'Not given';
  const serviceLane = known.some((s) => s.lane === 'bid') ? 'bid' : 'home';
  const specific = known.filter((s) => s !== SERVICES[NOT_SURE]);
  const prep = [...new Set((specific.length ? specific : [SERVICES[NOT_SURE]]).flatMap((s) => s.prep))].slice(0, 6);

  const timeline = TIMELINES[f('timeline')] ?? { key: 'unknown', label: f('timeline') || 'Not given', line: '' };
  const size = f('size') || 'Not given';
  const hoa = f('hoa');
  const contactPref = ['Call', 'Text'].includes(f('contact_pref')) ? f('contact_pref') : '';
  const town = f('town').replace(/\s+/g, ' ');
  const area = resolveArea({ town, zip: f('zip') });
  const lane = area.status === 'served' ? serviceLane : area.status === 'timeless' ? 'timeless' : 'check-area';
  const highValue = serviceLane === 'bid' || LARGE_SIZES.has(size);
  const marketLabel = AREA_LABELS[area.status];

  /* A same-site path only: a hand-made POST could otherwise point the email's page link off-site. */
  const pageRaw = f('page');
  const landingPage = pageRaw.length <= 300 && /^\/(?!\/)[^\s@\\]*$/.test(pageRaw) ? pageRaw : '/';

  const submitted = new Date(payload?.created_at ?? Date.now());
  const submittedLocal = new Intl.DateTimeFormat('en-US', {
    timeZone: MARKET.tz, weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'short',
  }).format(submitted);

  const { display: phoneDisplay, e164: phoneE164 } = phoneParts(phone);
  const firstName = name.replace(/\[test\]/ig, '').trim().split(' ')[0] || '';
  const where = [town, area.zip && !town.includes(area.zip) ? area.zip : ''].filter(Boolean).join(' ') || area.place || marketLabel;
  const who = name || phoneDisplay || email;
  const subject = `${isTest ? '[TEST] ' : ''}${timeline.key === 'ready-now' ? 'Ready now · ' : ''}${LANES[lane].subject}: ${serviceLabel} in ${where} · ${who}`;
  const attribution = Object.fromEntries(ATTRIBUTION.map((k) => [k, f(k)]));

  const hoaLine = hoa === 'Yes' ? 'They are in an HOA: ask whether it has to approve the plan first, and who submits it.'
    : hoa === 'Not sure' ? 'Not sure about an HOA: ask them to check before the visit.' : '';

  const lead = {
    source: SITE,
    leadType: LEAD_TYPE,
    campaignName: CAMPAIGN_NAME,
    isTest,
    leadId: String(payload?.id ?? ''),
    submittedAt: submitted.toISOString(),
    submittedLocal,
    name, firstName, phone, phoneDisplay, phoneE164, email, contactPref,
    town, zip: area.zip,
    uses, service: uses.join(', '), serviceLabel,
    size, highValue, hoa,
    timeline: f('timeline'), timelineLabel: timeline.label, priority: timeline.key,
    lane, laneLabel: LANES[lane].label,
    market: area.status === 'served' ? MARKET.key : '', marketLabel,
    areaStatus: area.status, areaNote: area.note, place: area.place ?? '',
    landingPage, pageUrl: `https://${SITE}${landingPage}`,
    heard: f('heard'),
    ...attribution,
    summary: [serviceLabel, size, timeline.label, marketLabel].join(' · '),
    subject,
  };
  lead.emailHtml = renderEmail(lead, { kicker: LANES[lane].kicker, prep, timelineLine: timeline.line, hoaLine, attribution: ATTRIBUTION });
  return lead;
}
