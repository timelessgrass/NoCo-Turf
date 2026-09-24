/**
 * Site-wide switches. Business facts do NOT live here — they come from .site/truth/brief.json
 * through src/data/brief.ts, so nothing renders that nobody said.
 */

export const SITE = 'https://www.nocoturf.com';

/**
 * PRELAUNCH = true puts `noindex, nofollow` on every page and a blanket Disallow in robots.txt.
 * netlify.toml also sends X-Robots-Tag on every path. At launch (Ty's explicit go, gate 12) flip
 * this to false AND delete the [[headers]] X-Robots-Tag block in netlify.toml, in the same commit;
 * tests/prelaunch.test.mjs fails if only one of the two changes.
 */
export const PRELAUNCH = true;

/**
 * PREVIEW: while PRELAUNCH is on, draft towns/guides and unconfirmed-but-previewable services render so Ty and
 * Brian can review the whole site on the (password-protected, noindex) Netlify preview. The sitemap still lists
 * only published records, and at launch (PRELAUNCH = false) drafts stop rendering entirely — only records that
 * pass their gates exist. Preview pages carry a visible "Draft" ribbon.
 */
export const SHOW_DRAFTS = PRELAUNCH;

/** The one easing curve and duration scale live in the design tokens once creative direction is
 *  approved (gate 5). Until then there is no design system — see DESIGN-PENDING.md. */
