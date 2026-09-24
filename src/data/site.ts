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

/** The one easing curve and duration scale live in the design tokens once creative direction is
 *  approved (gate 5). Until then there is no design system — see DESIGN-PENDING.md. */
