import { defineCollection } from 'astro:content';
import { z } from 'astro/zod';
import { glob } from 'astro/loaders';
import { NOCO_TOWNS, REGIONS } from './data/territory.mjs';

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
const qa = z.object({ q: z.string(), a: z.string() });

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

/** Resource guides: answer-first pages built on the shared data layer (src/data/layers/). */
const guides = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/guides' }),
  schema: z.object({
    status,
    title: z.string().max(70),
    description: z.string().max(160),
    h1: z.string(),
    answer: z.object({ question: z.string(), answer: z.string() }),
    faq: z.array(qa).max(8).default([]),
    layerRefs: z.array(z.string()).default([]),
    sources: z.array(source).min(2),
    published: z.string(),
    updated: z.string(),
    /** 'tool' guides carry an island (water savings, HOA letter) whose static fallback is in the body. */
    kind: z.enum(['guide', 'tool', 'problem', 'comparison']).default('guide'),
    related: z.object({ services: z.array(z.string()).default([]), towns: z.array(z.string()).default([]) }).default({ services: [], towns: [] }),
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

export const collections = { towns, guides, work };
