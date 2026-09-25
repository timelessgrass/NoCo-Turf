/**
 * Town × service pages: /areas/{town}-co/{service}/, one record each in src/content/town-services/
 * ({town-slug}--{service-slug}.json, schema `townServices` in src/content.config.ts, gate
 * src/lib/town-service-gate.mjs, contract docs/CONTRACTS.md).
 *
 * Four services get a page per town, so 17 towns × 4 = 68 possible pages. Two services deliberately don't:
 *   artificial-turf-installation — the town page itself (/areas/{town}-co/, "Artificial Turf in {Town}, CO")
 *                                  is that page, and "backyard turf in {town}" is the same search
 *   turf-repair                  — its service page isn't built (services.ts preview: false)
 *
 * Per service, the words a page needs that are not the record's own: the crumb, the noun the template uses
 * ("What goes into a dog run"), the hero button, the closing band, the photos.ts `use` a page's photo must
 * carry to pass the gate, the guide topic whose hub the page points to, and the Colorado layer records that
 * decide this use in new development (printed under the town's own code). None of these is a claim about
 * NoCo; the band and button words follow the service pages' voice (src/pages/services/[slug].astro).
 *
 * Plain JS on purpose: the content checker, the gate and the tests import it under Node.
 */
export const TOWN_SERVICES = [
  {
    slug: 'putting-greens',
    crumb: 'Putting greens',
    noun: 'a backyard putting green',
    ask: 'Ask about a green',
    band: { title: 'Pick the spot', payoff: 'for the green.', lede: 'Tell us about the yard in {town} and who’ll be putting on it. Three short parts, no account, no upload.' },
    photoUse: 'putting-green',
    topic: 'putting-greens',
    stateRefs: ['co-hb25-1113-functional-turf'],
    lawLine: 'Colorado counts golf playing areas, putting greens included, as functional turf.',
  },
  {
    slug: 'pet-turf',
    crumb: 'Pet turf',
    noun: 'a dog run',
    ask: 'Ask about a dog run',
    band: { title: 'Tell us about the dogs', payoff: 'and the yard.', lede: 'How many, how big, and where they run now in {town}. Three short parts, no account, no upload.' },
    photoUse: 'pet',
    topic: 'pets',
    stateRefs: [],
    lawLine: '',
  },
  {
    slug: 'playground-turf',
    crumb: 'Playground turf',
    noun: 'a play area',
    ask: 'Ask about a play area',
    band: { title: 'Show us the playset', payoff: 'and what’s under it.', lede: 'Tell us how tall the set is and where it sits in the {town} yard. Three short parts, no account, no upload.' },
    photoUse: 'play',
    topic: 'safety',
    stateRefs: ['co-hb25-1113-functional-turf'],
    lawLine: 'Colorado counts playgrounds as functional turf.',
  },
  {
    slug: 'commercial-turf',
    crumb: 'Commercial turf',
    noun: 'a common area',
    ask: 'Ask about a bid',
    band: { title: 'Tell us the site', payoff: 'and what it’s for.', lede: 'The property in {town} and what the turf is for. Three short parts, no account, no upload.' },
    /* No photo in src/data/photos.ts carries this use yet: a commercial-turf page cannot pass the gate until
       Brian supplies a photo of his own commercial, HOA or sports job and it is added with use: 'commercial'. */
    photoUse: 'commercial',
    topic: 'commercial',
    stateRefs: ['co-sb24-005-nonfunctional-ban', 'co-sb24-005-applicable-property', 'co-hb25-1113-functional-turf'],
    lawLine: 'Colorado’s ban on nonfunctional turf in new development reaches HOA common property and commercial sites; functional turf stays allowed.',
  },
];

export const TOWN_SERVICE_SLUGS = TOWN_SERVICES.map((s) => s.slug);
export const townServiceBySlug = Object.fromEntries(TOWN_SERVICES.map((s) => [s.slug, s]));

/** Services that never get a town × service page, and why (the checker prints the reason). */
export const NOT_TOWN_SERVICES = {
  'artificial-turf-installation': 'the town page /areas/{town}-co/ is the installation page for that town — write it there',
  'turf-repair': 'the turf-repair service page is not built, so it has no town pages',
};

/** The record id and file name: "{town-slug}--{service-slug}" (two hyphens; town slugs carry one). */
export const townServiceId = (town, service) => `${town}--${service}`;
export function parseTownServiceId(id) {
  const m = String(id ?? '').match(/^([a-z0-9]+(?:-[a-z0-9]+)*)--([a-z0-9]+(?:-[a-z0-9]+)*)$/);
  return m ? { town: m[1], service: m[2] } : null;
}
export const townServicePath = (town, service) => `/areas/${town}/${service}/`;
