/**
 * Community pages: /areas/{town}-co/{community}/ — the golf-course, custom-home, lake, estate-lot and
 * master-planned neighborhoods where a yard answers to its own HOA or metro district's design rules. One record
 * each in src/content/communities/{town-slug}--{community-slug}.json (schema `communities` in
 * src/content.config.ts), the community's own facts in src/data/layers/communities/{town-slug}--{community-slug}.json
 * (ids "{town-slug}--{community-slug}.…"), gate src/lib/community-gate.mjs, contract docs/CONTRACTS.md.
 *
 * A community page shares its URL segment with the town × service pages (/areas/{town}-co/{service}/, one route
 * file: src/pages/areas/[slug]/[service].astro). So a community slug may never be a service slug or another
 * reserved word: the schema, check-content and the route all refuse one, and the route throws on any path two
 * records would share.
 *
 * Nothing here is a claim about NoCo or about who lives in a community: the labels name the kind of place and the
 * kind of body that reviews a yard, never its price or its people (check-content bans wealth language outright
 * and warns on the sales words in COMMUNITY_PUFFERY).
 *
 * Plain JS on purpose: the content checker, the gate, check-layers and the tests import it under Node.
 */
import { TOWN_SERVICE_SLUGS, NOT_TOWN_SERVICES } from './town-services.mjs';

/** What kind of place it is. The page prints KIND_NAMES in its facts strip. */
export const COMMUNITY_KINDS = ['golf', 'custom-homes', 'lake', 'estate-lots', 'master-planned'];
export const KIND_NAMES = {
  golf: 'Golf-course community',
  'custom-homes': 'Custom-home community',
  lake: 'Lake community',
  'estate-lots': 'Estate lots',
  'master-planned': 'Master-planned community',
};

/** Who reviews a yard there. `none-found`: the writer searched the public record and found no HOA or district
 *  guidelines — the page says exactly that, dated, and never guesses one. */
export const GOVERNING_TYPES = ['hoa', 'metro-district', 'both', 'none-found'];
export const GOVERNING_NAMES = {
  hoa: 'Homeowners association',
  'metro-district': 'Metropolitan district',
  both: 'HOA and metropolitan district',
  'none-found': 'No HOA or district guidelines found',
};

/**
 * Segments a community may never take under /areas/{town}-co/: the four town × service slugs (those pages), the two
 * services that have no town pages yet (installation, turf-repair — they may later), and words kept for pages this
 * namespace may need (an index of a town's neighborhoods, say).
 */
export const RESERVED_COMMUNITY_SLUGS = [
  ...TOWN_SERVICE_SLUGS, ...Object.keys(NOT_TOWN_SERVICES),
  'services', 'communities', 'neighborhoods', 'guides', 'areas', 'work', 'about', 'contact', 'index',
];

const KEBAB = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Why a community slug can't be used, or null. One message for the schema, check-content and the route. */
export function communitySlugProblem(slug) {
  if (typeof slug !== 'string' || !KEBAB.test(slug)) return `community slug "${slug}" must be kebab-case (a–z, 0–9 and single hyphens)`;
  if (TOWN_SERVICE_SLUGS.includes(slug)) return `community slug "${slug}" is a town × service slug — /areas/{town}-co/${slug}/ is that service's page; use the community's own name`;
  if (RESERVED_COMMUNITY_SLUGS.includes(slug)) return `community slug "${slug}" is reserved under /areas/{town}-co/ — use the community's own name`;
  return null;
}

/** The record id and file name: "{town-slug}--{community-slug}" (two hyphens; town slugs carry one). */
export const communityId = (town, slug) => `${town}--${slug}`;
export function parseCommunityId(id) {
  const m = String(id ?? '').match(/^([a-z0-9]+(?:-[a-z0-9]+)*)--([a-z0-9]+(?:-[a-z0-9]+)*)$/);
  return m ? { town: m[1], slug: m[2] } : null;
}
export const communityPath = (town, slug) => `/areas/${town}/${slug}/`;

/** The guides a community page recommends, each only while visible, then the topic hub (src/data/guide-topics.ts). */
export const COMMUNITY_GUIDES = ['putting-green-design-ideas', 'backyard-putting-green-size'];
export const COMMUNITY_TOPIC = 'putting-greens';
/** The town × service pages a community page links under "Around", each only while visible. */
export const COMMUNITY_SERVICES = ['putting-greens', 'pet-turf'];

/** Words that sell a neighborhood by its price rather than its rules. A community record that uses one WARNS
 *  (check-content); the DEMOGRAPHICS list there (affluent, wealthy, upscale, home values …) FAILS it. */
export const COMMUNITY_PUFFERY = [/\bluxury\b/i, /\bexclusive\b/i, /\bprestigious\b/i, /\bhigh[- ]end\b/i];
