/**
 * Record text (FAQ answers, town and neighborhood paragraphs) is plain text that may carry Markdown-style links:
 * "see [how hot artificial turf gets](/guides/how-hot-does-artificial-turf-get/)". Printed as-is they show brackets,
 * so these helpers turn them into real links on the page and into plain words in JSON-LD. A link to a guide or area
 * page that is not live in this build keeps only its words (src/lib/live.ts). Straight quotes become curly ones.
 */
import { liveHref } from './live';

const LINK = /\[([^\]]+)\]\(([^)\s]+)\)/g;
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Curly quotes and apostrophes: don't → don’t, neighbors' → neighbors’, "Limited Warranty" → “Limited Warranty”. */
export const smartQuotes = (s: string) => s
  .replace(/(^|[\s(\[—–-])"/g, '$1“').replace(/"/g, '”')
  .replace(/(^|[\s(\[“])'(?=\w)/g, '$1‘').replace(/'/g, '’');

/** The words only, for JSON-LD and anywhere a link can't go. */
export const plainText = (s: string) => smartQuotes(s.replace(LINK, '$1'));

/** HTML for set:html: escaped text, curly quotes, and a real <a> for each live link. */
export async function inlineHtml(s: string): Promise<string> {
  let out = '';
  let last = 0;
  for (const m of s.matchAll(LINK)) {
    out += esc(smartQuotes(s.slice(last, m.index)));
    const [, words, href] = m;
    const live = /^https?:\/\//.test(href) ? href : await liveHref(href);
    const text = esc(smartQuotes(words));
    out += live ? `<a href="${esc(live)}"${/^https?:/.test(live) ? ' rel="noopener"' : ''}>${text}</a>` : text;
    last = m.index! + m[0].length;
  }
  return out + esc(smartQuotes(s.slice(last)));
}

/** Fort Collins’s → Fort Collins’: the possessive for a place name, matching the body copy. */
export const poss = (name: string) => `${name}’${/s$/.test(name) ? '' : 's'}`;
