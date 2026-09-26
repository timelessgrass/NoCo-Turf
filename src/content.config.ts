import { defineCollection } from 'astro:content';
import { z } from 'astro/zod';
import { glob } from 'astro/loaders';
import { NOCO_TOWNS, REGIONS } from './data/territory.mjs';
import { TOPIC_SLUGS } from './data/guide-topics';
import { TOWN_SERVICE_SLUGS } from './data/town-services.mjs';
import { COMMUNITY_KINDS, GOVERNING_TYPES, communitySlugProblem } from './data/communities.mjs';

/**
 * Content collections. Records carry `status`: draft | review | published (missing = draft).
 * Only `published` records generate routes, hub links, sitemap entries and Markdown mirrors
 * (src/lib/content-policy.mjs). A record may be written long before it can publish: town pages
 * wait for Brian's own jobs and photos, guides wait for their data layer to verify.
 *
 * Copy rules the checkers enforce (scripts/check-content.mjs):
 *   - every number of 11+ or with a decimal must appear in the record's own sources/layer facts
 *   - no TIMELESS phone, no "Timeless", no Denver-metro town as a place we serve
 *   - no claim about the business that is not an approved entry in .site/truth/claims.json
 */

const status = z.enum(['draft', 'review', 'published']).default('draft');
const source = z.object({ label: z.string(), url: z.string().url(), checked: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) });
/** An FAQ item. `layerRefs` (optional) names the layer records its answer draws on, when no block cites them. */
const qa = z.object({ q: z.string(), a: z.string(), layerRefs: z.array(z.string()).optional() });

/**
 * A town page's substance, one block per fact that makes the page legal.
 *   own: true  — true only of this town (its ordinance, its subdivisions, its job, its photo)
 *   own: false — inherited from a shared layer (state law, a water provider serving several towns)
 * The differentiation gate (reference/programmatic.md): ≥3 substantive blocks, ≥2 of them own.
 * `layerRefs` point at record ids in src/data/layers/*.json so a changed rule updates every page.
 * Block ORDER is the page's section order: lead with the strongest fact for this town.
 */
const block = z.object({
  kind: z.enum(['ordinance', 'utility', 'rebate', 'drought', 'hoa', 'soil', 'climate', 'housing', 'landmark', 'golf', 'job', 'review', 'photo', 'competitor', 'access']),
  own: z.boolean(),
  kicker: z.string(),
  h2: z.string(),
  takeaway: z.string().optional(),
  paras: z.array(z.string()).min(1),
  layerRefs: z.array(z.string()).default([]),
  sources: z.array(z.string().url()).default([]),
});

const TOWN_SLUGS = NOCO_TOWNS.map((t) => t.slug) as [string, ...string[]];
const REGION_KEYS = Object.keys(REGIONS) as [string, ...string[]];

const towns = defineCollection({
  loader: glob({ pattern: '**/*.json', base: './src/content/towns' }),
  schema: z.object({
    status,
    slug: z.enum(TOWN_SLUGS),
    name: z.string(),
    region: z.enum(REGION_KEYS),
    title: z.string().max(70),
    description: z.string().max(160),
    h1: z.string(),
    lede: z.string(),
    /** ~60 words naming the business, the service, the town and state. The phone is appended at
     *  render time from the brief, never typed here. */
    answer: z.object({ question: z.string(), answer: z.string() }),
    blocks: z.array(block).min(3).max(7),
    /** Folded-in neighbours (e.g. LaSalle and Platteville on Greeley), each with its own facts. */
    sections: z.array(z.object({ name: z.string(), paras: z.array(z.string()).min(1), sources: z.array(z.string().url()).min(1) })).default([]),
    faq: z.array(qa).max(6).default([]),
    nearby: z.array(z.enum(TOWN_SLUGS)).min(2).max(6),
    photo: z.string().optional(), // a path under src/assets/photos/ — required to publish (≥1 image per leaf)
    sources: z.array(source).min(2),
    checked: z.string(),
    /** Not rendered: what Brian still has to supply before this page can publish. */
    needsFromBrian: z.array(z.string()).default([]),
  }),
});

/**
 * Town × service pages: /areas/{town}-co/{service}/ for putting-greens, pet-turf, playground-turf and
 * commercial-turf (src/data/town-services.mjs; installation × town IS the town page, turf-repair has none).
 * File: src/content/town-services/{town}--{service}.json — check-content fails any other name.
 * Same block shape as a town, but `own` means true of THIS town for THIS use. The town's own facts for these
 * pages go in src/data/layers/local/{town}.json (ids "{town}.…"). Gate: src/lib/town-service-gate.mjs
 * (≥3 substantive blocks, ≥2 own, every block sourced, a photos.ts photo whose `use` matches the service).
 * `display.paint` is a phrase of the H1, word for word, that gets the painted layout mark.
 */
const townServices = defineCollection({
  loader: glob({ pattern: '**/*.json', base: './src/content/town-services' }),
  schema: z.object({
    status,
    town: z.enum(TOWN_SLUGS),
    service: z.enum(TOWN_SERVICE_SLUGS as [string, ...string[]]),
    title: z.string().max(70).regex(/\s\|\sNoCo Turf Co\.$/, 'the title ends with "| NoCo Turf Co."'),
    description: z.string().max(160),
    h1: z.string(),
    display: z.object({ paint: z.string().optional() }).optional(),
    lede: z.string(),
    /** ~60 words naming the business, the service, the town and state. The phone is appended at render. */
    answer: z.object({ question: z.string(), answer: z.string() }),
    blocks: z.array(block).min(1).max(7),
    faq: z.array(qa).max(6).default([]),
    /** A src/data/photos.ts id — required to publish, and its `use` must match the service (the gate). */
    photo: z.string().optional(),
    sources: z.array(source).min(2),
    checked: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    /** Not rendered: what Brian still has to supply before this page can publish. */
    needsFromBrian: z.array(z.string()).default([]),
  }),
});

/**
 * Community pages: /areas/{town}-co/{community}/ for golf-course, custom-home, lake, estate-lot and master-planned
 * neighborhoods (src/data/communities.mjs). File: src/content/communities/{town}--{community}.json — the file name is
 * the record's key and check-content fails any other. `slug` is the community's own URL segment; it may never be a
 * town × service slug or a reserved word (the route shares /areas/{town}-co/{segment}/ with those pages).
 * Same block shape as a town, but `own` means true of THIS community only. The community's own facts go in
 * src/data/layers/communities/{town}--{community}.json (ids "{town}--{community}.…"); its blocks may also cite
 * shared records and the town's local/ records. Gate: src/lib/community-gate.mjs (≥3 substantive blocks, ≥2 own,
 * every block sourced, a photos.ts photo taken in this community or its town).
 *   governing — the body that reviews a yard there; `url` its guidelines (one of the record's sources) and
 *               `layerRefs` the records that quote them on turf, putting greens and backyard landscaping (the
 *               page's design-review section prints them). `none-found`: searched, nothing posted — said as such.
 *   golf      — the course the community is built around, named as the cited record names it (`layerRef`).
 */
const communities = defineCollection({
  /* The entry id is the file name, "{town}--{community}". (Left to itself, the glob loader would take the id from
     the record's own `slug` field — the community's segment alone, which two towns could share.) */
  loader: glob({ pattern: '**/*.json', base: './src/content/communities', generateId: ({ entry }) => entry.replace(/\.json$/, '') }),
  schema: z.object({
    status,
    town: z.enum(TOWN_SLUGS),
    slug: z.string().superRefine((s, ctx) => {
      const problem = communitySlugProblem(s);
      if (problem) ctx.addIssue({ code: 'custom', message: problem });
    }),
    name: z.string().min(1),
    kind: z.enum(COMMUNITY_KINDS as [string, ...string[]]),
    governing: z.object({
      name: z.string().min(1),
      type: z.enum(GOVERNING_TYPES as [string, ...string[]]),
      url: z.string().url().optional(),
      layerRefs: z.array(z.string()).default([]),
    }).optional(),
    golf: z.object({ name: z.string().min(1), layerRef: z.string() }).optional(),
    title: z.string().max(70).regex(/\s\|\sNoCo Turf Co\.$/, 'the title ends with "| NoCo Turf Co."'),
    description: z.string().max(160),
    h1: z.string(),
    display: z.object({ paint: z.string().optional() }).optional(),
    lede: z.string(),
    /** ~60 words naming the business, the community, the town and state. The phone is appended at render. */
    answer: z.object({ question: z.string(), answer: z.string() }),
    blocks: z.array(block).min(1).max(7),
    faq: z.array(qa).max(6).default([]),
    /** A src/data/photos.ts id — required to publish: taken in this community or its town (the gate). */
    photo: z.string().optional(),
    sources: z.array(source).min(2),
    checked: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    /** Not rendered: what Brian still has to supply before this page can publish. */
    needsFromBrian: z.array(z.string()).default([]),
  }),
});

/**
 * A guide's page furniture, all optional: `crumb` (the last breadcrumb; default the title before the brand
 * suffix), `paint` (a phrase of the H1 that gets the painted layout mark; check-content fails one that isn't
 * in the H1), `faqH2` and the closing band's `cta` (defaults: the topic's own, src/data/guide-topics.ts).
 * Same copy rules as the body: H2s are sentences with a period, and nothing here claims anything about NoCo.
 */
const guideDisplay = z.object({
  crumb: z.string().max(40).optional(),
  paint: z.string().optional(),
  faqH2: z.string().optional(),
  cta: z.object({ title: z.string(), payoff: z.string(), lede: z.string().optional() }).optional(),
});

/** Resource guides: answer-first pages built on the shared data layer (src/data/layers/, plus the guide's own
 *  src/data/layers/guides/{id}.json). Each belongs to one topic, whose hub lists it at /guides/{topic}/. */
const guides = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/guides' }),
  schema: z.object({
    status,
    topic: z.enum(TOPIC_SLUGS),
    title: z.string().max(70),
    description: z.string().max(160),
    h1: z.string(),
    display: guideDisplay.optional(),
    answer: z.object({ question: z.string(), answer: z.string() }),
    faq: z.array(qa).max(8).default([]),
    layerRefs: z.array(z.string()).default([]),
    sources: z.array(source).min(2),
    published: z.string(),
    updated: z.string(),
    /** 'tool' guides carry an island (water savings, HOA letter) whose static fallback is in the body. */
    kind: z.enum(['guide', 'tool', 'problem', 'comparison']).default('guide'),
    related: z.object({ services: z.array(z.string()).default([]), towns: z.array(z.string()).default([]) }).default({ services: [], towns: [] }),
    /** Up to three src/data/photos.ts ids, printed as a figure strip with their real caption, place and month
     *  (check-content fails an id that isn't there). For guides a photo honestly illustrates — a putting-green
     *  design guide with Brian's own greens; never a stand-in. */
    photos: z.array(z.string()).max(3).default([]),
    needsFromBrian: z.array(z.string()).default([]),
  }),
});

/** Service pages: long-form body in Markdown, the buyer-facing structure in frontmatter. One per slug in
 *  src/data/services.ts. Same claim rules as towns/guides: trade truth and layer facts, never NoCo claims
 *  the register hasn't cleared. `photos` are ids from src/data/photos.ts that honestly show this kind of job. */
const services = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/services' }),
  schema: z.object({
    status,
    slug: z.enum(['artificial-turf-installation', 'pet-turf', 'putting-greens', 'playground-turf', 'commercial-turf', 'turf-repair']),
    title: z.string().max(70),
    description: z.string().max(160),
    h1: z.string(),
    lede: z.string(),
    answer: z.object({ question: z.string(), answer: z.string() }),
    faq: z.array(qa).max(8).default([]),
    layerRefs: z.array(z.string()).default([]),
    sources: z.array(source).default([]),
    photos: z.array(z.string()).default([]),
    guides: z.array(z.string()).default([]),
    needsFromBrian: z.array(z.string()).default([]),
  }),
});

/** Case studies — the core proof unit. Every field traces to Brian's job ledger and photo originals. */
const work = defineCollection({
  loader: glob({ pattern: '**/*.json', base: './src/content/work' }),
  schema: z.object({
    status,
    title: z.string().max(70),
    description: z.string().max(160),
    town: z.enum(TOWN_SLUGS),
    use: z.enum(['lawn', 'pet', 'putting-green', 'playground', 'commercial', 'repair']),
    month: z.string().regex(/^\d{4}-\d{2}$/),
    problem: z.string(), // in the homeowner's words, with their consent
    job: z.object({
      sqft: z.number().optional(),
      product: z.string().optional(),
      baseDepthIn: z.number().optional(),
      days: z.number().optional(),
      crewLead: z.string().optional(),
      priceBand: z.string().optional(), // only if Brian approves publishing it
    }),
    phases: z.array(z.object({ phase: z.enum(['before', 'base', 'seams', 'infill', 'after']), photo: z.string(), caption: z.string(), alt: z.string() })).min(2),
    review: z.object({ text: z.string(), name: z.string(), url: z.string().url() }).optional(),
    provenance: z.string(), // camera original filename(s) in Brian's upload — never a download
  }),
});

export const collections = { towns, townServices, communities, guides, work, services };
