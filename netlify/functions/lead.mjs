/**
 * The estimate form's endpoint: POST /.netlify/functions/lead (Netlify's default function URL; no
 * config.path, and never /api/*, which fails preflight LEAD-1). No Netlify Forms, no GoHighLevel.
 *
 * Ported from TIMELESS Grass & Greens (netlify/functions/lead.mjs) for NoCo Turf Co. The form
 * (docs/CONTRACTS.md "Lead path") posts here directly. Each request becomes a routed lead
 * (lib/lead-routing.mjs) and goes to the Make webhook in NOCO_LEAD_WEBHOOK, and only there: never a
 * sister-brand webhook, and no default URL in code.
 *
 * A script-driven form asks for JSON (Accept: application/json) and gets { ok } back; when the hand-off
 * fails it keeps the visitor's answers on screen and offers the phone number. A browser without
 * JavaScript posts the plain form and is sent on to /thanks/ (303), or shown a short page with the
 * number to call (502). Nothing is stored here, so a lead the webhook does not take is never silently
 * dropped: the visitor is told to call. Failures are logged without the visitor's details.
 *
 * Bots: the off-screen `company` field (honeypot) and a form filled in under 2 s (`elapsed_ms`) are
 * answered exactly like a success and never forwarded, so a bot learns nothing.
 */
import { buildLead, screen } from './lib/lead-routing.mjs';
import { callUsPage } from './lib/fallback.mjs';

const MAX_BODY = 20_000; // bytes
const MAX_FIELD = 2_000; // characters per value
/* Single-value fields the form may send; everything else is ignored. `use` is multi-valued. */
const FIELDS = new Set([
  'town', 'zip', 'size', 'hoa', 'timeline', 'name', 'phone', 'email', 'contact_pref', 'heard', 'page', 'company',
  'elapsed_ms', 'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'gclid', 'fbclid',
]);
const MAX_USES = 8;

/* One try and two retries, each with its own timeout, all inside Netlify's 10 s synchronous limit. */
const ATTEMPT_TIMEOUT_MS = [3500, 2500, 2000];
const RETRY_DELAY_MS = [0, 250, 500];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** The form's fields as { field: string, use: string[] }, or throws if the body cannot be read. */
async function readSubmission(req, bytes) {
  const type = req.headers.get('content-type') ?? '';
  let entries;
  if (type.includes('application/json')) {
    const obj = JSON.parse(new TextDecoder().decode(bytes));
    if (!obj || typeof obj !== 'object' || Array.isArray(obj)) throw new Error('not an object');
    entries = Object.entries(obj).flatMap(([k, v]) => (Array.isArray(v) ? v.map((x) => [k, x]) : [[k, v]]));
  } else {
    entries = [...(await new Response(bytes, { headers: { 'content-type': type } }).formData()).entries()];
  }
  const data = { use: [] };
  for (const [k, v] of entries) {
    if (typeof v !== 'string' && typeof v !== 'number') continue; // files, objects: ignored
    const value = String(v).slice(0, MAX_FIELD);
    if (k === 'use') { if (data.use.length < MAX_USES) data.use.push(value); } else if (FIELDS.has(k)) data[k] = value;
  }
  return data;
}

async function forward(lead, webhook) {
  const body = JSON.stringify(lead);
  const tries = ATTEMPT_TIMEOUT_MS.length;
  for (let i = 0; i < tries; i++) {
    if (RETRY_DELAY_MS[i]) await sleep(RETRY_DELAY_MS[i]);
    try {
      const res = await fetch(webhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
        signal: AbortSignal.timeout(ATTEMPT_TIMEOUT_MS[i]),
      });
      if (res.ok) return true;
      console.error(`[lead] ${lead.leadId}: webhook answered ${res.status} (attempt ${i + 1} of ${tries})`);
    } catch (err) {
      /* The error name and code only: a message could carry the webhook URL. */
      const why = err?.name === 'TimeoutError' ? 'timed out' : `${err?.name ?? 'Error'}${err?.cause?.code ? ` ${err.cause.code}` : ''}`;
      console.error(`[lead] ${lead.leadId}: webhook ${why} (attempt ${i + 1} of ${tries})`);
    }
  }
  return false;
}

export default async (req) => {
  if (req.method !== 'POST') return new Response('POST only', { status: 405, headers: { Allow: 'POST' } });
  const wantsJson = (req.headers.get('accept') ?? '').includes('application/json');
  const reply = (status, json, text) => (wantsJson
    ? Response.json(json, { status })
    : new Response(text, { status, headers: { 'Content-Type': 'text/plain; charset=utf-8' } }));
  const accepted = () => (wantsJson
    ? Response.json({ ok: true })
    : new Response(null, { status: 303, headers: { Location: '/thanks/' } }));

  if (Number(req.headers.get('content-length') ?? 0) > MAX_BODY) return reply(413, { ok: false }, 'Too large');
  let data;
  try {
    const bytes = new Uint8Array(await req.arrayBuffer());
    if (bytes.byteLength > MAX_BODY) return reply(413, { ok: false }, 'Too large');
    data = await readSubmission(req, bytes);
  } catch {
    return reply(400, { ok: false }, 'The request could not be read.');
  }

  const id = crypto.randomUUID();
  const dropped = screen(data);
  if (dropped === 'honeypot' || dropped === 'too-fast') {
    console.warn(`[lead] ${id}: not forwarded (${dropped})`);
    return accepted(); // a bot learns nothing from the answer
  }
  if (dropped === 'no-contact') {
    console.warn(`[lead] ${id}: not forwarded (no phone or email)`);
    return reply(422, { ok: false, error: 'contact' }, 'Please go back and add a phone number so we can reach you.');
  }

  const lead = buildLead({ id, created_at: new Date().toISOString(), data });
  const webhook = (process.env.NOCO_LEAD_WEBHOOK ?? '').trim();
  let sent = false;
  if (!/^https:\/\//.test(webhook)) {
    console.error(`[lead] ${lead.leadId}: not sent: NOCO_LEAD_WEBHOOK is ${webhook ? 'not an https URL' : 'not set'} (${lead.lane}, ${lead.areaStatus})`);
  } else {
    sent = await forward(lead, webhook);
  }
  if (sent) {
    console.log(`[lead] ${lead.leadId} sent: ${lead.lane}, ${lead.areaStatus}${lead.isTest ? ', test' : ''}`);
    return accepted();
  }
  console.error(`[lead] ${lead.leadId}: visitor shown the call-us fallback (${lead.lane}, ${lead.areaStatus})`);
  return wantsJson
    ? Response.json({ ok: false }, { status: 502 })
    : callUsPage({ back: lead.landingPage === '/' ? '/contact/' : lead.landingPage });
};
