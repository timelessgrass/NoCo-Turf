/**
 * Brian's email for one lead: the working copy he calls back from. Make sends it as the body.
 *
 * Table layout with inline styles, because that is what Gmail, Outlook and Apple Mail all keep.
 * NoCo Turf Co. has no design system yet (DESIGN-PENDING.md), so this is a plain, neutral palette,
 * restyle it once the tokens land. It carries no sister-brand name, colour or domain: a Denver-metro
 * lead is described as "the Denver-metro brand's area". Every visitor-typed value passes through esc().
 */
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

const C = {
  page: '#ECEBE7', card: '#FFFFFF', panel: '#F4F3EF', header: '#1F2622', ink: '#1B1C1A', dim: '#5E605B',
  rule: '#DDDCD6', onDark: '#F3F2EE', button: '#1F2622', check: '#FFF5D6', checkRule: '#B8870F', fwd: '#E7EDF5',
  fwdRule: '#3B5F8A', test: '#FCE4E1', testRule: '#B3261E',
};
const KICKER = { home: '#CFE2D2', bid: '#F0C766', timeless: '#AFC5E4', 'check-area': '#F0C766' };
const SERIF = "Georgia,'Times New Roman',serif";
const SANS = "-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif";

const micro = (text, color = C.dim) => `<p style="margin:0 0 6px;font-family:${SANS};font-size:11px;line-height:14px;font-weight:600;letter-spacing:1.8px;text-transform:uppercase;color:${color};">${text}</p>`;
const chip = (text, strong) => `<span style="display:inline-block;margin:0 6px 6px 0;padding:6px 12px;border-radius:999px;font-family:${SANS};font-size:12px;line-height:14px;font-weight:600;${strong
  ? `background:${C.onDark};color:${C.header};` : `border:1px solid rgba(243,242,238,.38);color:${C.onDark};`}">${text}</span>`;
const button = (href, text, primary) => `<a href="${href}" style="display:inline-block;margin:0 8px 10px 0;padding:13px 22px;border-radius:999px;font-family:${SANS};font-size:15px;line-height:18px;font-weight:600;text-decoration:none;${primary
  ? `background:${C.button};color:#FFFFFF;border:1px solid ${C.button};` : `background:transparent;color:${C.ink};border:1px solid #B9B8B0;`}">${text}</a>`;
const row = (label, value) => `<tr>
  <td valign="top" style="padding:11px 12px 11px 0;border-bottom:1px solid ${C.rule};width:34%;font-family:${SANS};font-size:13px;line-height:18px;color:${C.dim};">${label}</td>
  <td valign="top" style="padding:11px 0;border-bottom:1px solid ${C.rule};font-family:${SANS};font-size:15px;line-height:21px;color:${C.ink};word-break:break-word;">${value}</td>
</tr>`;
const callout = (bg, rule, html) => `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${bg};border-left:3px solid ${rule};border-radius:6px;"><tr><td style="padding:14px 16px;font-family:${SANS};font-size:14px;line-height:21px;color:${C.ink};">${html}</td></tr></table>`;

/**
 * @param lead the object buildLead() assembles (lead-routing.mjs)
 * @param opts.kicker the lane's header line (LANES[lane].kicker) · opts.prep call-prep questions ·
 *        opts.timelineLine · opts.hoaLine · opts.attribution the attribution keys to list
 */
export function renderEmail(lead, { kicker = '', prep = [], timelineLine = '', hoaLine = '', attribution = [] } = {}) {
  const first = esc(lead.firstName || 'them');
  const tel = lead.phoneE164 ? `tel:${lead.phoneE164}` : '';
  const sms = lead.phoneE164 ? `sms:${lead.phoneE164}` : '';
  const mail = lead.email ? `mailto:${encodeURIComponent(lead.email)}?subject=${encodeURIComponent('Your turf estimate request')}` : '';
  const where = lead.town || lead.place || lead.marketLabel;
  const preheader = esc(`${lead.name || 'Someone'} wants ${String(lead.serviceLabel).toLowerCase()} in ${where}. ${lead.timelineLabel}. ${lead.phoneDisplay}`);
  const trackLines = attribution.filter((k) => lead[k]).map((k) => `${k}: ${esc(lead[k])}`);
  const textFirst = lead.contactPref === 'Text';
  const buttons = textFirst
    ? `${sms ? button(sms, `Text ${first}`, true) : ''}${tel ? button(tel, 'Call') : ''}`
    : `${tel ? button(tel, `Call ${first}`, true) : ''}${sms ? button(sms, 'Text') : ''}`;
  const areaBox = !lead.areaNote ? ''
    : lead.lane === 'timeless' ? callout(C.fwd, C.fwdRule, `<strong>Forward this one.</strong> ${esc(lead.areaNote)}`)
      : callout(C.check, C.checkRule, `<strong>Where is it?</strong> ${esc(lead.areaNote)}`);

  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light only"><meta name="supported-color-schemes" content="light only"><title>${esc(lead.subject)}</title></head>
<body style="margin:0;padding:0;background:${C.page};-webkit-text-size-adjust:100%;">
<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${preheader}&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${C.page};">
<tr><td align="center" style="padding:24px 12px 32px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;background:${C.card};border-radius:14px;overflow:hidden;">
  ${lead.isTest ? `<tr><td style="padding:12px 28px;background:${C.test};border-bottom:2px solid ${C.testRule};font-family:${SANS};font-size:13px;line-height:18px;font-weight:600;color:${C.testRule};">TEST LEAD: not a real customer. Make should send this to the agency inbox only.</td></tr>` : ''}
  <tr><td style="background:${C.header};padding:24px 28px 20px;">
    <p style="margin:0 0 18px;font-family:${SANS};font-size:11px;line-height:14px;font-weight:600;letter-spacing:2.4px;text-transform:uppercase;color:rgba(243,242,238,.66);">NoCo Turf Co.</p>
    ${micro(esc(kicker), KICKER[lead.lane] ?? C.onDark)}
    <h1 style="margin:0 0 16px;font-family:${SERIF};font-size:30px;line-height:36px;font-weight:normal;color:${C.onDark};">${esc(lead.serviceLabel)}<br><span style="color:rgba(243,242,238,.7);">in ${esc(where)}</span></h1>
    <div>${chip(esc(lead.timelineLabel), lead.priority === 'ready-now')}${chip(esc(lead.size))}${lead.hoa === 'Yes' ? chip('HOA') : ''}${chip(esc(lead.marketLabel))}${lead.highValue ? chip('High-value job') : ''}</div>
  </td></tr>
  <tr><td style="padding:26px 28px 8px;">
    ${micro(textFirst ? 'Text back (their preference)' : 'Call back')}
    <p style="margin:0 0 4px;font-family:${SERIF};font-size:26px;line-height:32px;color:${C.ink};word-break:break-word;">${esc(lead.name || 'No name given')}</p>
    ${lead.phoneDisplay ? `<p style="margin:0 0 2px;font-family:${SANS};font-size:21px;line-height:28px;font-weight:600;"><a href="${tel}" style="color:${C.ink};text-decoration:none;">${esc(lead.phoneDisplay)}</a></p>` : ''}
    ${lead.email ? `<p style="margin:0;font-family:${SANS};font-size:15px;line-height:22px;word-break:break-all;"><a href="${mail}" style="color:${C.ink};text-decoration:underline;">${esc(lead.email)}</a></p>` : ''}
  </td></tr>
  <tr><td style="padding:14px 28px 6px;">
    ${buttons}${mail ? button(mail, 'Email') : ''}
  </td></tr>
  ${areaBox ? `<tr><td style="padding:8px 28px 4px;">${areaBox}</td></tr>` : ''}
  <tr><td style="padding:14px 28px 4px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      ${row('Project', esc(lead.serviceLabel))}
      ${row('Size', esc(lead.size))}
      ${row('HOA', esc(lead.hoa || 'Not given'))}
      ${row('Timing', esc(lead.timeline || lead.timelineLabel))}
      ${row('Town', esc(lead.town || 'Not given'))}
      ${row('ZIP', esc(lead.zip || 'Not given'))}
      ${row('Service area', esc(lead.marketLabel))}
      ${row('Route', esc(lead.laneLabel))}
      ${row('Contact by', esc(lead.contactPref || 'Not given'))}
      ${lead.heard ? row('Heard about us', esc(lead.heard)) : ''}
    </table>
  </td></tr>
  <tr><td style="padding:20px 28px 8px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${C.panel};border-left:3px solid ${C.header};border-radius:6px;"><tr><td style="padding:18px 20px 12px;">
      ${micro('Before you call', C.header)}
      ${timelineLine ? `<p style="margin:0 0 10px;font-family:${SANS};font-size:14px;line-height:21px;color:${C.ink};">${esc(timelineLine)}</p>` : ''}
      ${hoaLine ? `<p style="margin:0 0 10px;font-family:${SANS};font-size:14px;line-height:21px;color:${C.ink};">${esc(hoaLine)}</p>` : ''}
      ${prep.map((q) => `<p style="margin:0 0 8px;padding-left:16px;text-indent:-16px;font-family:${SANS};font-size:14px;line-height:21px;color:${C.ink};">&bull;&nbsp;&nbsp;${esc(q)}</p>`).join('')}
    </td></tr></table>
  </td></tr>
  <tr><td style="padding:14px 28px 24px;">
    <p style="margin:0;font-family:${SANS};font-size:13px;line-height:20px;color:${C.dim};">${lead.lane === 'timeless'
      ? 'This project is outside NoCo’s area. Forward it rather than booking it.'
      : `This lead is also in your TTM portal under My Leads, as a ${esc(lead.campaignName)}. Mark it won or lost there once it’s decided.`}</p>
  </td></tr>
  <tr><td style="background:${C.panel};border-top:1px solid ${C.rule};padding:18px 28px 22px;">
    ${micro('Lead record')}
    <p style="margin:0;font-family:${SANS};font-size:12px;line-height:19px;color:${C.dim};word-break:break-all;">
      Submitted ${esc(lead.submittedLocal)}<br>
      From the estimate form on <a href="${esc(lead.pageUrl)}" style="color:${C.dim};">${esc(String(lead.pageUrl).replace(/^https?:\/\//, ''))}</a><br>
      ${lead.leadId ? `Lead ID ${esc(lead.leadId)}<br>` : ''}
      ${trackLines.join('<br>')}
    </p>
  </td></tr>
</table>
<p style="margin:16px 0 0;font-family:${SANS};font-size:12px;line-height:18px;color:${C.dim};">Sent automatically when someone asks for an estimate on nocoturf.com.${lead.email ? ` Reply to write back to ${first}.` : ''}</p>
</td></tr>
</table>
</body></html>`;
}
