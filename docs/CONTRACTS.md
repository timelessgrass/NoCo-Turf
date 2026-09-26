# Build contracts

The shapes every part of the build agrees on. Change a contract here first, then the code.

## Planned routes (the information architecture)

Only `published` records and `confirmed` services generate routes. Everything below is the *plan*;
the 301 map targets these, and `tests/redirects.test.mjs` checks each target exists in `dist/` at launch.

| Route | Source | Notes |
|---|---|---|
| `/` | `src/pages/index.astro` | holding page until gate 6 |
| `/services/` + `/services/{slug}/` | `src/data/services.ts` | slugs: `artificial-turf-installation`, `pet-turf`, `putting-greens`, `playground-turf`, `commercial-turf`, `turf-repair` |
| `/turf-supply/` | `TURF_SUPPLY` in services.ts | only if the Windsor store still sells retail |
| `/areas/` + `/areas/{slug}/` | `src/content/towns/*.json`, slugs in `src/data/territory.mjs` | existing live URLs keep their slugs |
| `/areas/{slug}/{service}/` | `src/content/town-services/{town}--{service}.json`, services in `src/data/town-services.mjs` | town × service pages, 17 towns × 4 services: `putting-greens`, `pet-turf`, `playground-turf`, `commercial-turf`. Installation × town IS the town page; turf-repair has none. Exists at launch only when published, passing its gate, its town page visible and its service confirmed (below) |
| `/work/` + `/work/{id}/` | `src/content/work/*.json` | case studies from Brian's job ledger |
| `/guides/` + `/guides/{id}/` | `src/content/guides/*.md` | launch set: `turf-rules-northern-colorado`, `turf-rebates-northern-colorado`, `hoa-turf-approval`, `water-savings`, `artificial-turf-cost`; about 105 more to come, each in one topic |
| `/guides/{topic}/` | `src/data/guide-topics.ts` | a hub per topic that has ≥1 visible guide (sitemap: ≥1 published guide). Topic slugs and guide ids share `/guides/`: a guide id never equals a topic slug (check-content fails the record, both routes throw, `prerenderConflictBehavior: 'error'`) |
| `/about/`, `/contact/` | pages | `/contact/` carries the one estimate form + NAP |
| `/thanks/` | page | noindex |
| `/privacy/`, `/terms/` | pages | Colorado law; Plausible + SMS disclosures |
| `/review/` | page | noindex; ONE ungated link to Google's write-review URL, offered to everyone |
| `/sitemap.xml`, `/robots.txt`, `/llms.txt` | endpoints | PRELAUNCH-aware |

## Data layer — `src/data/layers/*.json`, `layers/guides/{guide-id}.json`, `layers/local/{town-slug}.json`

One file per layer: `state-law.json`, `city-codes.json`, `water-providers.json`, `rebates.json`,
`drought-2026.json`, `climate.json`, `soil.json`, `standards.json` — plus two owner-scoped directories, one file per owner, so
parallel writers never edit the same file: `src/data/layers/guides/{guide-id}.json` (the facts only that guide
uses) and `src/data/layers/local/{town-slug}.json` (a town's own facts for its town × service pages).
Each file is a JSON array of records:

```json
{
  "id": "fc-luc-5.10.1",                     // unique across ALL layer files, kebab-case
  "layer": "ordinance",                       // state | county | utility | rebate | ordinance | drought | climate | soil | housing | place | research | product | standard
  "applies_to": ["fort-collins-co"],          // town slugs from territory.mjs, or ["*"] for every NoCo town
  "fact": "Plain-English statement, one sentence, exactly as a page may say it.",
  "quote": "The operative sentence from the source, verbatim.",
  "source_url": "https://…",
  "source_label": "Fort Collins Land Use Code 5.10.1 (Ord. 008, 2025)",
  "effective": "2025-02-14",                  // optional
  "checked": "2026-09-24",                    // YYYY-MM-DD
  "reachable": true,                          // false = the source blocks automated fetch → manual re-check
  "status": "VERIFIED",                       // VERIFIED | EXTERNAL_SOURCE | UNVERIFIED — UNVERIFIED never renders
  "recheck": "2026-10-14",                    // optional: when this goes stale (drought stages, pending ordinances)
  "numbers": ["75", "70", "3"],               // every number the fact/quote uses, so copy checks can trace them
  "notes": "optional, internal"
}
```

`water-providers.json` records add `"provider": "Fort Collins Utilities"` and optional `"rates"`:
`{ "effective": "2026-01-01", "unit": "per 1,000 gal", "base_monthly": 23.10, "tiers": [{ "label": "Tier 1", "price": 3.574, "up_to_gal": 7000 }], "model": "tiered | flat | water-budget | allotment" }`.

`research` (an agency or university finding), `product` (a manufacturer's published spec) and `standard`
(ASTM, CPSC and the like) carry the guides' non-legal facts. `place` is a named local place from a public record
(a golf course, a park with a playground, a dog park, a school field), mostly in `local/` files.
A `standard` (or `research`, `product`) record that holds for every town and more than one page — the CPSC
playground-surfacing handbook, say — goes in the shared `standards.json`, not in a guide's or a town's own file.
Its records resolve by id wherever a page cites them (`src/lib/layers.ts`, `TownData.ts`) and are never swept
onto a town page: they say nothing local.

`scripts/check-layers.mjs` fails the build on: a missing field, a duplicate id (across every file, `guides/` and
`local/` included), an `applies_to` slug not in territory.mjs, `checked` older than 365 days (warns > 180), a
`recheck` date in the past, or a `source_url` that is not https.

**Guide-owned files — `src/data/layers/guides/{guide-id}.json`.** Same record contract, same gate, one file per
guide, named for the guide's file (`src/content/guides/{guide-id}.md`). Every id in it starts with
`{guide-id}.` (for `pet-turf-odor.json`: `"pet-turf-odor.aspca-urine"`), which makes a clash between two writers
impossible; check-layers fails any other id, and warns when no guide of that id exists yet. `rates` stays in
water-providers.json. The guide cites its records in `layerRefs` like any other; another guide may cite them
too. Every reader includes the subdirectory: check-layers.mjs, check-content.mjs (its single-file mode gates the
guide's own file), and `src/lib/layers.ts` (the one `import.meta.glob` the pages use). Town pages read their
named layer files only (`src/components/TownData.ts`), so a guide's record never lands on a town page.

**Town-owned files — `src/data/layers/local/{town-slug}.json`.** Same record contract, same gate, one file per
NoCo town, written by that town's writer and covering all four town × service pages (putting greens, pet turf,
playground turf, commercial turf). The file name is a `territory.mjs` town slug; every id starts with
`{town-slug}.` (`"windsor-co.pelican-lakes-golf"`); every record's `applies_to` names that town (check-layers
fails one that doesn't, and warns when it names other towns too — a fact two towns share belongs in a shared
file). The pages cite local records by id in `layerRefs`: `src/lib/layers.ts` and `TownData.ts` resolve them, and
a block that cites one shows it in its evidence panel. They never reach a page any other way: `recordsFor()`
(the town page's sweep of shared records) leaves them out, and the town × service page's code section takes only
the town's `ordinance` records. check-content's single-file mode gates the town's local file with the town's
record or any of its town × service records.

## Town records — `src/content/towns/{slug}.json`

Schema: `src/content.config.ts` (`towns`). Gate: `src/lib/town-gate.mjs` (≥3 blocks, ≥2 `own`, a photo).
Rules for writers:
- Blocks are in the order the page shows them — lead with this town's strongest fact.
- A layer fact used in a block is referenced by id in `layerRefs`; its source URL also goes in `sources`. A fact
  only an FAQ answer uses goes in that item's optional `layerRefs` (check-content traces it like a block's).
- Every number ≥ 11 or with a decimal must appear in a referenced layer record's `numbers`, or in the
  record's `sources` material. No census/wealth language in copy ("median income", "affluent").
- No claim about NoCo that is not an approved `.site/truth/claims.json` entry: no years, warranty,
  licensed/insured, "best", prices, review counts. Brian's own jobs and photos go in `job`/`photo`
  blocks only when his ledger supplies them; until then list what is needed in `needsFromBrian`.
- Never name a TIMELESS town (territory.mjs `TIMELESS_TOWNS`) as a place NoCo serves.
- `status` stays `draft` until Brian's material lands and the gate passes.

## Town × service records — `src/content/town-services/{town}--{service}.json`

One page per town and service at `/areas/{town}-co/{service}/`, for `putting-greens`, `pet-turf`,
`playground-turf` and `commercial-turf` (`src/data/town-services.mjs`) — 68 possible. Installation × town is the
town page (`/areas/{town}-co/`, "Artificial Turf in {Town}, CO"; "backyard turf in {town}" is the same search), so
it gets no record; `turf-repair` has none because its service page isn't built. Schema: `src/content.config.ts`
(`townServices`). The file name is the record's key — `{town-slug}--{service}` with two hyphens — and must match
its own `town` and `service` (check-content fails it; the routes throw).

```jsonc
{
  "status": "draft",                        // draft | review | published — only published renders at launch
  "town": "windsor-co",                     // a NOCO_TOWNS slug (territory.mjs)
  "service": "putting-greens",              // putting-greens | pet-turf | playground-turf | commercial-turf
  "title": "Backyard Putting Greens in Windsor, CO | NoCo Turf Co.",  // ≤ 70, ends "| NoCo Turf Co."
  "description": "…",                       // ≤ 160: the meta description
  "h1": "…",                                // the page's claim for this town and this job
  "display": { "paint": "…" },              // optional: a phrase of the h1, word for word, painted
  "lede": "…",
  "answer": { "question": "…?", "answer": "…" },  // ~60 words naming NoCo, the service, the town; phone appended at render
  "blocks": [                               // 1–7, in page order, strongest first; the town block shape
    {
      "kind": "ordinance",                  // ordinance | utility | rebate | drought | hoa | soil | climate | housing | landmark | golf | job | review | photo | competitor | access
      "own": true,                          // true of THIS town for THIS use (Windsor's golf lots on a putting-green page)
      "kicker": "The town code",
      "h2": "…",
      "takeaway": "…",                      // optional lead sentence
      "paras": ["…"],
      "layerRefs": ["windsor-code-15-3-10-single-family-exempt", "windsor-co.…"],  // shared, guides/ or local/ record ids
      "sources": ["https://…"]              // every source URL the block draws on
    }
  ],
  "faq": [{ "q": "…", "a": "…", "layerRefs": ["…"] }],  // ≤ 6; mirrored verbatim into FAQPage; layerRefs optional
  "photo": "dusk",                          // optional until publish: a src/data/photos.ts id whose `use` fits the service
  "sources": [{ "label": "…", "url": "https://…", "checked": "2026-09-24" }],  // ≥ 2
  "checked": "2026-09-24",
  "needsFromBrian": ["…"]                   // not rendered
}
```

**Gate — `src/lib/town-service-gate.mjs` (`townServiceGate`).** A page passes with ≥3 substantive blocks (a block
counts from 30 words of paragraphs and takeaway), ≥2 of those `own`, a source or layer reference on every block
that is not a job, photo or review, and a real photo whose photos.ts `use` matches the service: putting-greens →
`putting-green`, pet-turf → `pet`, playground-turf → `play`, commercial-turf → `commercial` (no photo carries that
use yet; it arrives with Brian's own commercial photos). It returns `{ pass, reasons }` like the town gate.

**Visibility (`townServiceVisibility`, one rule for the route, the links and the sitemap).** PRELAUNCH preview:
every record renders, drafts with the ribbon, while its town page and service are visible. Launch: only a
published record that passes the gate, whose town page is visible and whose service is confirmed. The sitemap
lists published records that pass the gate, with a published town and a confirmed service.

**Rules for writers.** Every town rule applies (numbers traced to referenced layer records or source labels,
links among the sources, no unapproved NoCo claim, no TIMELESS town, no demographics). The town's own facts for
these pages go in its `local/{town}.json` layer file. The Colorado backyard-HOA rule is never paraphrased in a
block: the page renders it once (`TownStateRule`) after the first block that cites an HOA record. The page adds
the town's code for this use from the layer records (the ordinance records and the state rule no block has
shown), so a block need not quote them again. check-content FAILS a page sharing more than 25% of its five-word
runs with another page of the same service or with its own town record (WARN above 15%).

## Guide records — `src/content/guides/{id}.md`

Schema: `src/content.config.ts` (`guides`). Every guide names one `topic` from `src/data/guide-topics.ts`
(pets | weather | installation | products | care-and-repair | putting-greens | safety | comparisons | buying |
rules-and-hoa | water | commercial | yard-design); its hub, crumbs (Guides › {topic} › {crumb}), "More in"
list and previous / next follow from it. An optional `display` object carries the page furniture: `crumb`,
`paint` (a phrase of the H1, word for word), `faqH2` and `cta` {title, payoff, lede?}; without it the crumb is
the title and the rest are the topic's defaults. The full field list is in docs/GUIDES.md ("Adding a guide").
check-content also fails a guide that shares its title or its normalized `answer.question` with another, or
more than 25% of its five-word runs (WARN above 15%). Answer first (the `answer` block is the page's first 60 words
in substance). Question-shaped H2s. Tables with real, dated numbers from layer records. Where law or a city
rule is unsettled, hedge with "it depends … ask {the town's} Planning" — NOT "we confirm": that is a NoCo process
claim and stays out of copy until Brian confirms NoCo checks each address (claims register). Titles carry the
"| NoCo Turf Co." suffix in the field itself (≤70 chars); routes print them as-is.
Final routes: `/guides/water-savings/` and `/guides/artificial-turf-cost/` (the plan's `/tools/…` and
`/artificial-turf-cost/` were superseded 2026-09-24 — one scheme, under /guides/). Labelled not legal advice where
it touches statute. Summarise Colorado state law in 2–3 sentences with primary links; NoCo owns the
Northern Colorado layer and does not duplicate TIMELESS's statewide guides.

## Lead path

`POST /.netlify/functions/lead` (Netlify's default function URL — not `/api/*`, which fails preflight LEAD-1).
Form fields (names are the contract — RED under aftercare):
`use` (checkbox, multi: values = services.ts `formUse`, plus `Not sure`), `town`, `zip`, `size`
(`Under 300 sq ft` | `300 to 800 sq ft` | `800 to 1,500 sq ft` | `Over 1,500 sq ft` | `Not sure — measure at the visit`),
`hoa` (`Yes` | `No` | `Not sure`), `timeline` (`As soon as possible` | `In the next few months` | `Just pricing it out`),
`name`, `phone` (required), `email` (optional), `contact_pref` (`Call` | `Text`), `heard` (optional),
`page` (hidden, the path it was sent from), `company` (honeypot, off-screen), `elapsed_ms` (hidden).
Webhook: env `NOCO_LEAD_WEBHOOK` (never TIMELESS's). One try + 2 retries (3.5 / 2.5 / 2.0 s, inside Netlify's 10 s).
Unset or failing → the visitor sees the phone number (502 page / `{ ok:false }`), the function logs without PII,
and nothing is silently dropped. No phone and no email → 422 (`{ ok:false, error:'contact' }`) so the visitor can fix it.
Accepts urlencoded, multipart and JSON bodies (`use` may be an array in JSON).
Lanes: `home`, `bid` (commercial/HOA/sports), `timeless` (Denver-metro ZIP → forward note), `check-area`.
ZIP rules live in `netlify/functions/lib/places.mjs`: 80544 (Niwot) and 80621 (Fort Lupton) are UNASSIGNED → check-area;
a shared ZIP (80516, 80603, 80621) plus a typed NoCo town the Census places partly inside it → served, with a note to
confirm the address. The form must send `Accept: application/json` from script, set `elapsed_ms` by script (empty
without JS = a person), and show the phone on 502 / ask for a phone on 422.

## Checks (wired into npm scripts once present)

- `prebuild`: `node scripts/check-layers.mjs && node scripts/check-content.mjs && node scripts/build-water-rates.mjs --check`
- one guide, while writing it: `node scripts/check-content.mjs src/content/guides/{id}.md` — every record rule,
  the guide's own layer file, and overlap / duplicate checks against every other guide on disk
- one town × service page, while writing it: `node scripts/check-content.mjs src/content/town-services/{town}--{service}.json`
  — every record rule, the gate (WARN while a draft), the town's own layer file (`local/{town}.json`), and the
  overlap checks against every page of the same service and the town record on disk. Several files at once work
  too (a writer checks all four of a town's pages and its town record in one run)
- `build`: `astro build && node scripts/md-mirrors.mjs dist && node scripts/check-dist.mjs dist && python3 scripts/check-links.py dist`
- `test:unit`: `node --test "tests/*.test.mjs"` (a bare directory argument fails on Node 24)
- `test:launch`: `LAUNCH_CHECK=1 node --test tests/redirects.test.mjs` — every 301 target must exist in `dist/`
- layer records carry `recheck` dates; `check-layers.mjs` FAILS the build once one passes (Greeley 2026-10-14, Johnstown
  and Evans after 2026-10-15, more by 2026-10-24). That is intended: re-verify the record, then move the date.
- studio gates (manual, before gates 8/12): `python3 ~/.claude/site-tools/preflight.py .`,
  `check-uniqueness.py dist/areas`, `score.py audit dist/areas --no-log`, `check-sameness.py`

## The boundary note (Denver-metro visitors)

One component, marked `data-boundary`, is the only place a Denver-metro town may be named. Until Brian confirms
that the NoCo ↔ TIMELESS relationship may be public (Appendix A), it says only that NoCo works north of the Denver
metro — no TIMELESS name, no link. Once confirmed, it may name "TIMELESS Grass & Greens" and link timelessgrass.com
inside that element (check-dist warns there; it fails anywhere else). Avoid "Denver Basin", "Denver International
Airport", "Superior" at a sentence start and "Parker" as a surname anywhere else — the town matcher is literal.

## Shared-claim components (render once, identical everywhere)

The Colorado backyard-HOA rule (`co-hoa-backyard-detached`) is NOT hand-written into town blocks. The town template
renders it once per page from the layer record, linked to `/guides/hoa-turf-approval/`. Identical text everywhere is
claim-set consistency; paraphrases per town are duplication. Same for soil/climate numbers: a compact data strip
from the layer records, with prose only for a consequence true of that town. A town × service page renders the HOA
rule the same way (only when a block cites an HOA record), and its "What goes into {a putting green}" strip prints
services.ts `short` and `underneath` word for word on every town's page for that service.

## Banned in shipped HTML (`scripts/check-dist.mjs`)

TIMELESS phones `303-349-2368`, `854-204-9227` (and digit forms) · `Timeless` · `Acme` · `SOURCE TBD` · `cite index` ·
`(386)` · `Florida` · `Panhandle` · `lorem` · `pexels.com` · `unsplash.com` · `aggregateRating` · `ratingValue` ·
`reviewCount` · `"@type":"Review"` · `LandscapeService` · `24/7` · `Denver` (except inside the one boundary note
component, marked `data-boundary`).
