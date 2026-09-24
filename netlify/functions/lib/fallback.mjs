/**
 * What a visitor sees when their request could not be handed on: a short page (502) that tells them
 * to call. Never a 200. A lead the webhook did not take is only saved if the visitor picks up the phone,
 * so this page is the last line of the lead path.
 *
 * The number comes from the fact base (.site/truth/brief.json → identity.locations[0].phone) under the
 * same gate as src/data/brief.ts: it renders only with a renderable status AND a source. Until Brian's
 * number is in the brief that way, the page says "Please call us" with no number. It never falls back
 * to a number typed here, and never to a sister-brand number.
 */
import brief from '../../../.site/truth/brief.json' with { type: 'json' };

const RENDERABLE = new Set(['VERIFIED', 'CLIENT_STATED', 'CLIENT_CONFIRMED', 'EXTERNAL_SOURCE']);

/** A brief fact's value if it may render, else null (mirrors src/data/brief.ts fact()). */
export function fact(node) {
  if (!node || typeof node !== 'object') return null;
  if (!RENDERABLE.has(String(node.status))) return null;
  if (node.value === null || node.value === undefined || node.value === '') return null;
  if (!node.source) return null;
  return node.value;
}

/** { display: '720-630-0108', href: 'tel:+17206300108' } from the brief, or null. */
export function fallbackPhone(b = brief) {
  const identity = b?.identity ?? {};
  const location = (identity.locations ?? b?.locations ?? [])[0] ?? {};
  const value = fact(location.phone);
  if (typeof value !== 'string') return null;
  const ten = value.replace(/\D/g, '').replace(/^1(?=\d{10}$)/, '');
  if (ten.length !== 10) return null;
  return { display: value.trim().replace(/^\+1[\s-]?/, ''), href: `tel:+1${ten}` };
}

/** The trading name from the brief, or null (the page then names no business). */
export function businessName(b = brief) {
  const v = fact(b?.identity?.display_name);
  return typeof v === 'string' ? v : null;
}

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

/**
 * @param opts.back a same-site path to send them back to (validated by the caller), default /contact/
 * @param opts.brief the fact base (tests pass a fixture)
 */
export function callUsPage({ back = '/contact/', brief: b = brief } = {}) {
  const phone = fallbackPhone(b);
  const name = businessName(b);
  const safeBack = /^\/(?!\/)[^\s@\\]*$/.test(back) ? back : '/contact/';
  const call = phone
    ? `<p>Please call <a href="${phone.href}" data-cta="lead-fallback-call" style="color:#1F2622;font-weight:600">${esc(phone.display)}</a> and we’ll take it from there.</p>`
    : '<p>Please call us.</p><!-- no number rendered: identity.locations[0].phone in .site/truth/brief.json is not renderable with a source yet -->';
  const body = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex"><title>We couldn’t send your request${name ? ` | ${esc(name)}` : ''}</title></head>
<body style="margin:0;background:#F4F3EF;color:#1B1C1A;font-family:-apple-system,'Segoe UI',Helvetica,Arial,sans-serif;line-height:1.55">
<main style="max-width:34rem;margin:0 auto;padding:3rem 1rem">
<h1 style="font-family:Georgia,serif;font-weight:normal;font-size:2rem;line-height:1.2">We couldn’t send your request.</h1>
${call}
<p>Or wait a minute and try again: <a href="${esc(safeBack)}" style="color:#1F2622">back to the form</a>.</p>
</main></body></html>`;
  return new Response(body, { status: 502, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' } });
}
