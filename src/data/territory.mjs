/**
 * Where NoCo Turf Co. works — and where it does not.
 *
 * Decided by Ty on 2026-09-24 (.site/decisions/2026-09-24-territory.md): a clean north/south split
 * with the sister brand TIMELESS Grass & Greens (timelessgrass.com, Denver metro). Erie stays with
 * TIMELESS — Brian named Erie and Brighton as TIMELESS's northern edge on the 2026-09-04 call
 * (00:31:12), and TIMELESS's lead router already sends ZIP 80516 there.
 *
 * Every town page, lead route, checker and test reads this file. A town not in NOCO_TOWNS cannot get
 * a page; a town in TIMELESS_TOWNS makes the build fail if its name appears in NoCo copy as a place
 * we serve.
 *
 * tier (plan, pending the 3-block gate — a record publishes only when src/lib/town-gate.mjs passes):
 *   hub   — the storefront town; region pages link through it
 *   full  — 3+ town-specific blocks found in research
 *   lean  — exactly enough town-specific material; shorter page
 * region groups the /areas/ list and the corridor map; it is how buyers describe where they live.
 * lat/lng: Census 2024 Gazetteer internal points (www2.census.gov …/2024_gaz_place_08.txt), checked 2026-09-24.
 */

export const REGIONS = {
  'poudre': 'Fort Collins & the Poudre',
  'windsor-johnstown': 'Windsor, Timnath & Johnstown',
  'loveland-berthoud': 'Loveland & Berthoud',
  'greeley-east-weld': 'Greeley & East Weld',
  'carbon-valley-longmont': 'Longmont & Carbon Valley',
};

/** slug is the URL segment under /areas/ (existing live URLs keep their slugs). */
export const NOCO_TOWNS = [
  { slug: 'windsor-co', name: 'Windsor', county: 'Weld & Larimer', region: 'windsor-johnstown', tier: 'hub', live: true, lat: 40.4783, lng: -104.9151 },
  { slug: 'fort-collins-co', name: 'Fort Collins', county: 'Larimer', region: 'poudre', tier: 'full', live: true, lat: 40.5482, lng: -105.0648, sections: ['Laporte'] },
  { slug: 'loveland-co', name: 'Loveland', county: 'Larimer', region: 'loveland-berthoud', tier: 'full', live: true, lat: 40.4169, lng: -105.0631 },
  { slug: 'greeley-co', name: 'Greeley', county: 'Weld', region: 'greeley-east-weld', tier: 'full', live: true, lat: 40.4166, lng: -104.7733, sections: ['LaSalle', 'Platteville'] },
  { slug: 'timnath-co', name: 'Timnath', county: 'Larimer', region: 'windsor-johnstown', tier: 'full', live: true, lat: 40.5332, lng: -104.9645 },
  { slug: 'johnstown-co', name: 'Johnstown', county: 'Weld & Larimer', region: 'windsor-johnstown', tier: 'full', live: true, lat: 40.3072, lng: -104.9112 },
  { slug: 'berthoud-co', name: 'Berthoud', county: 'Larimer & Weld', region: 'loveland-berthoud', tier: 'full', live: true, lat: 40.2847, lng: -104.9655 },
  { slug: 'firestone-co', name: 'Firestone', county: 'Weld', region: 'carbon-valley-longmont', tier: 'full', live: true, lat: 40.1557, lng: -104.9486 },
  { slug: 'mead-co', name: 'Mead', county: 'Weld', region: 'carbon-valley-longmont', tier: 'full', live: true, lat: 40.227, lng: -104.9883 },
  { slug: 'frederick-co', name: 'Frederick', county: 'Weld', region: 'carbon-valley-longmont', tier: 'full', live: true, lat: 40.1059, lng: -104.9745 },
  { slug: 'longmont-co', name: 'Longmont', county: 'Boulder & Weld', region: 'carbon-valley-longmont', tier: 'full', live: false, lat: 40.1682, lng: -105.1005 },
  { slug: 'wellington-co', name: 'Wellington', county: 'Larimer', region: 'poudre', tier: 'lean', live: true, lat: 40.7007, lng: -105.0057 },
  { slug: 'severance-co', name: 'Severance', county: 'Weld', region: 'windsor-johnstown', tier: 'lean', live: false, lat: 40.5059, lng: -104.8635 },
  { slug: 'evans-co', name: 'Evans', county: 'Weld', region: 'greeley-east-weld', tier: 'lean', live: false, lat: 40.3502, lng: -104.7484 },
  { slug: 'eaton-co', name: 'Eaton', county: 'Weld', region: 'greeley-east-weld', tier: 'lean', live: false, lat: 40.5257, lng: -104.713 },
  { slug: 'milliken-co', name: 'Milliken', county: 'Weld', region: 'greeley-east-weld', tier: 'lean', live: false, lat: 40.3105, lng: -104.8584 },
  { slug: 'dacono-co', name: 'Dacono', county: 'Weld', region: 'carbon-valley-longmont', tier: 'lean', live: true, lat: 40.0635, lng: -104.9468 },
];

/** TIMELESS Grass & Greens territory. NoCo never builds a page for these, and the lead router sends
 *  their ZIPs to TIMELESS. Old NoCo URLs for the first four 301 to /areas/ (public/_redirects). */
export const TIMELESS_TOWNS = [
  'Erie', 'Brighton', 'Thornton', 'Broomfield',
  'Denver', 'Aurora', 'Arvada', 'Englewood', 'Lakewood', 'Westminster', 'Commerce City', 'Northglenn',
  'Lafayette', 'Louisville', 'Superior', 'Boulder', 'Castle Rock', 'Parker', 'Littleton', 'Centennial',
  'Highlands Ranch', 'Golden', 'Wheat Ridge',
];

/** Places we researched and deliberately left out, with the reason — so nobody "adds" them later
 *  without new material. */
export const EXCLUDED_TOWNS = {
  'Estes Park': '43.5 mi of mountain road, 36% seasonal housing, no NoCo jobs on record — needs Brian to name jobs first',
  'Fort Lupton': 'unassigned between NoCo and TIMELESS — Brian decides (Appendix A)',
  'Niwot': 'unassigned between NoCo and TIMELESS — Brian decides (Appendix A)',
};

export const townBySlug = Object.fromEntries(NOCO_TOWNS.map((t) => [t.slug, t]));

/** Eligibility for a town record, shared by the content checker and the Astro routes. */
export function townEligibility(slug) {
  if (!townBySlug[slug]) return { eligible: false, reason: `${slug} is not a NoCo town (src/data/territory.mjs)` };
  return { eligible: true, reason: '' };
}
