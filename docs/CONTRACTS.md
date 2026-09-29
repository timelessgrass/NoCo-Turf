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
| `/areas/{slug}/{community}/` | `src/content/communities/{town}--{community}.json`, registry `src/data/communities.mjs` | community pages: golf-course, custom-home, lake, estate-lot and master-planned neighborhoods with their own HOA or metro-district design rules. Same dynamic segment as the town × service pages and the same route file (`src/pages/areas/[slug]/[service].astro`); a community slug is never a service slug or a reserved word, and the route throws on any path two records share. Exists at launch only when published, passing its gate and its town page visible (below) |
| `/work/` + `/work/{id}/` | `src/content/work/*.json` | case studies from Brian's job ledger |
| `/guides/` + `/guides/{id}/` | `src/content/guides/*.md` | launch set: `turf-rules-northern-colorado`, `turf-rebates-northern-colorado`, `hoa-turf-approval`, `water-savings`, `artificial-turf-cost`; about 105 more to come, each in one topic |
| `/guides/{topic}/` | `src/data/guide-topics.ts` | a hub per topic that has ≥1 visible guide (sitemap: ≥1 published guide). Topic slugs and guide ids share `/guides/`: a guide id never equals a topic slug (check-content fails the record, both routes throw, `prerenderConflictBehavior: 'error'`) |
| `/about/`, `/contact/` | pages | `/contact/` carries the one estimate form + NAP |
| `/thanks/` | page | noindex |
| `/privacy/`, `/terms/` | pages | Colorado law; Plausible + SMS disclosures |
| `/review/` | page | noindex; ONE ungated link to Google's write-review URL, offered to everyone |
| `/sitemap.xml`, `/robots.txt`, `/llms.txt` | endpoints | PRELAUNCH-aware |

## Data layer — `src/data/layers/*.json`, `layers/guides/{guide-id}.json`, `layers/local/{town-slug}.json`, `layers/communities/{town}--{community}.json`

One file per layer: `state-law.json`, `city-codes.json`, `water-providers.json`, `rebates.json`,
`drought-2026.json`, `climate.json`, `soil.json`, `standards.json` — plus three owner-scoped directories, one file per owner, so
parallel writers never edit the same file: `src/data/layers/guides/{guide-id}.json` (the facts only that guide
uses), `src/data/layers/local/{town-slug}.json` (a town's own facts for its town × service pages) and
`src/data/layers/communities/{town}--{community}.json` (a community page's own facts). The owner rules live in one
table, `OWNER_DIRS` in `scripts/check-layers.mjs` — what a valid owner is, and which town its records must apply to;
a new kind of owner is one entry there.
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

**Community-owned files — `src/data/layers/communities/{town-slug}--{community-slug}.json`.** Same record contract,
same gate, one file per community page, written by that page's writer: its HOA or metro district's guidelines, its
course, its lots. The file name is the community's id (a NoCo town slug, two hyphens, a community slug that is not
reserved — `src/data/communities.mjs`); every id starts with `{town-slug}--{community-slug}.`
(`"windsor-co--highland-meadows.arc-turf"`); every record's `applies_to` names the town (check-layers fails one that
doesn't, warns when it names other towns too, and warns while no `src/content/communities/{id}.json` exists). A
community page may also cite shared records and its town's `local/` records by id — a district whose guidelines a
town × service page already quotes (Ptarmigan West on Windsor's putting-green page) stays in `local/`. Resolved by id
only (`layers.ts`, `TownData.ts`), never swept onto a town page. check-content's single-file mode gates the file with
the community's record.

## Town records — `src/content/towns/{slug}.json`

Schema: `src/content.config.ts` (`towns`). Gate: `src/lib/town-gate.mjs`: ≥3 substantive blocks (30+ words), ≥2 `own`,
every research block sourced, Brian's word that NoCo works the town (`.site/truth/brief.json` `service_areas`: status
CLIENT_CONFIRMED with a client `source` and `source_detail`; the agency's `operator_decision` never counts). Since
launch (2026-09-29) a `src/data/photos.ts` photo whose `place` names the town (whole name: Highland Meadows is not
Mead) and a job or review block from the town are to-dos check-content lists, not the town gate; they still gate the
town × service and community pages. Shared rules: `src/lib/local-proof.mjs`; why:
`.site/decisions/2026-09-28-publish-gates.md`.
- A proof block (`kind` `job` or `review`) is `own`, names the place in its heading or text, runs to 30 words (a review
  to 12) and, for a review, links to where it was posted in `sources`. Put a job's season and size in words, or cite the
  layer record that holds the numbers: the numbers rule still applies. `use` names what was built.
- `own` means true of this page alone. check-content flags an own research block whose town-scoped layer records and
  links are all cited by another town's page, or that cites only statewide records, and FAILS a published record left
  with fewer than 2 own blocks.
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
that is not a job, photo or review, a real photo whose photos.ts `use` matches the service: putting-greens →
`putting-green`, pet-turf → `pet`, playground-turf → `play`, commercial-turf → `commercial` (no photo carries that
use yet; it arrives with Brian's own commercial photos) and whose `place` names the town, and a job or review block
from the town whose `use` is the service's (`putting-green`, `pet`, `playground`, `commercial`). The own rule compares
it with the other pages of its town. It returns `{ pass, reasons }` like the town gate.

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

## Community records — `src/content/communities/{town}--{community}.json`

One page per neighborhood at `/areas/{town}-co/{community}/`: golf-course, custom-home, lake, estate-lot and
master-planned communities, where a yard answers to its own HOA or metro district's design rules — the high-end jobs.
Schema: `src/content.config.ts` (`communities`); registry (kinds, governing types, reserved slugs, the guides a page
recommends): `src/data/communities.mjs`. The file name is the record's key — `{town-slug}--{slug}` with two hyphens —
and must match its own `town` and `slug` (check-content fails it; the collection readers throw; the loader's entry id
is the file name, never the `slug` field alone).

```jsonc
{
  "status": "draft",                        // draft | review | published — only published renders at launch
  "town": "windsor-co",                     // a NOCO_TOWNS slug (territory.mjs)
  "slug": "highland-meadows",               // the URL segment, kebab-case; never putting-greens | pet-turf |
                                            //   playground-turf | commercial-turf | artificial-turf-installation |
                                            //   turf-repair | services | communities | neighborhoods | guides | areas |
                                            //   work | about | contact | index (RESERVED_COMMUNITY_SLUGS — FAIL)
  "name": "Highland Meadows",               // as the community names itself; the hero, crumbs, strip and links print it
  "kind": "golf",                           // golf | custom-homes | lake | estate-lots | master-planned
  "governing": {                            // optional: who reviews a yard there
    "name": "Highland Meadows HOA",         //   as its own documents name it
    "type": "hoa",                          //   hoa | metro-district | both | none-found (searched, nothing posted —
                                            //   the page says so, dated; never a guess)
    "url": "https://…/design-guidelines.pdf",  // optional: its guidelines; must be one of `sources` (FAIL otherwise)
    "layerRefs": ["windsor-co--highland-meadows.arc-turf"]  // the records quoting its guidelines on turf, putting
                                            //   greens and backyard landscaping: the design-review section prints them
  },
  "golf": {                                 // optional: the course the community is built around
    "name": "Highland Meadows Golf Course", //   word for word as the cited record names it (FAIL otherwise)
    "layerRef": "windsor-co.highland-meadows-practice"  // a place record (the town's local/ file or the community's own)
  },
  "title": "Artificial Turf in Highland Meadows, Windsor, CO | NoCo Turf Co.",  // ≤ 70, ends "| NoCo Turf Co."; names the community (WARN)
  "description": "…",                       // ≤ 160
  "h1": "…",                                // the page's claim for this neighborhood
  "display": { "paint": "…" },              // optional: a phrase of the h1, word for word, painted
  "lede": "…",
  "answer": { "question": "…?", "answer": "…" },  // ~60 words naming NoCo, the community, the town and state; phone appended at render
  "blocks": [ /* 1–7, the town × service block shape; own: true = true of THIS community only */ ],
  "faq": [{ "q": "…", "a": "…", "layerRefs": ["…"] }],  // ≤ 6; mirrored verbatim into FAQPage
  "photo": "boulders",                      // optional until publish: a photos.ts id taken in this community or its town
  "sources": [{ "label": "…", "url": "https://…", "checked": "2026-09-24" }],  // ≥ 2
  "checked": "2026-09-24",
  "needsFromBrian": ["…"]                   // not rendered
}
```

**Gate — `src/lib/community-gate.mjs` (`communityGate`).** A page passes with ≥3 substantive blocks (30 words of
paragraphs and takeaway, the town × service rule), ≥2 of those `own`, a source or layer reference on every block
that is not a job, photo or review, a real photo from `src/data/photos.ts` that belongs here (its optional
`community` is this community's id, or its `place` names the community; a photo from elsewhere in the town does not),
and a job or review block that names the community. The own rule compares it with the other pages of its town.
Returns `{ pass, reasons }`.

**Visibility (`communityVisibility`, one rule for the route, the links in and the sitemap).** PRELAUNCH preview: every
record renders, drafts with the ribbon, while its town page is visible. Launch: a published record that passes the
gate, its town page visible. The sitemap lists published records that pass the gate with a published town.

**The route.** `src/pages/areas/[slug]/[service].astro` renders both kinds from one `getStaticPaths` and throws on a
path claimed twice (`assertAreaChildren`, `src/lib/content-policy.mjs`). The file keeps its name: Astro derives a
page's scoped-style hash and its stylesheet's name from the route file's name, so a rename would change every
town × service page. For the same reason the community page's own CSS (facts strip, design-review path) lives in
`src/styles/community.css`, imported with `?url` last among the route's imports and linked by community pages alone
(`Base` `styles`); `CommunityFacts` and `CommunityReview` carry no `<style>`. Proof: rebuild before and after a change
to this route and `cmp` every `dist/areas/*/{putting-greens,pet-turf,playground-turf,commercial-turf}/index.html`.

**The page.** Hero ("{Community} · {Town}", the H1 with its paint, the lede, the asks, the job sheet with the
community as its first coordinate), the short answer, the facts strip (kind; the governing body linked to its
guidelines; the course while its record renders; the town), the numbered blocks with evidence ("Only in
{Community}"), the Colorado backyard-HOA rule once (after the first block that leans on it, else after the design
review when a body reviews yards there), the design-review path (each `governing.layerRefs` record's fact and
verbatim quote — or, when a block's evidence already quotes it, a link up to that block — linked to
`/guides/hoa-turf-approval/`), the photo, "Around {Community}" (the town page, the town's putting-green and pet-turf
pages, the other communities in the town — visible only), the guides (`putting-green-design-ideas`,
`outdoor-living-with-artificial-turf`, then the putting-greens hub — visible only), FAQ, sources, the closing band with
the one form, the town preselected. JSON-LD: WebPage `about` → a Place (the community, `containedInPlace` its City);
a Service with that Place as `areaServed`, provided by #business; BreadcrumbList Areas › {Town} › {Community}; FAQPage.

**Links in.** The town page's "{Town} neighborhoods" (`TownCommunities`, after "by service"); one line under the short
answer on the town's putting-green page naming its golf communities; `/areas/` "Golf and custom-home communities",
grouped by town (`AreasCommunities`); llms.txt lists them under their town, after its town × service pages. Each draws
only visible pages and nothing when there are none.

**Rules for writers.** Every town rule applies (numbers traced, links among the sources, no unapproved NoCo claim, no
TIMELESS town). The DEMOGRAPHICS ban holds with extra force here: never wealth, income or home-value language about a
neighborhood — say what its rules, its course or its lots are. "luxury", "exclusive", "prestigious" and "high-end"
WARN. The community's own facts go in `src/data/layers/communities/{id}.json`. The Colorado backyard-HOA rule is
never paraphrased in a block. check-content FAILS a page sharing more than 25% of its five-word runs with another
community (WARN above 15% in the same town), with its own town record or with its town's putting-green page.

## Guide records — `src/content/guides/{id}.md`

Schema: `src/content.config.ts` (`guides`). Every guide names one `topic` from `src/data/guide-topics.ts`
(pets | weather | installation | products | care-and-repair | putting-greens | safety | comparisons | buying |
rules-and-hoa | water | commercial | yard-design); its hub, crumbs (Guides › {topic} › {crumb}), "More in"
list and previous / next follow from it. An optional `display` object carries the page furniture: `crumb`,
`paint` (a phrase of the H1, word for word), `faqH2` and `cta` {title, payoff, lede?}; without it the crumb is
the title and the rest are the topic's defaults. An optional `photos` (up to three `src/data/photos.ts` ids) prints
as a restrained figure strip after the body (`GuidePhotos`), each with its own caption, place and month — Brian's
putting greens on a putting-green design guide, say; check-content fails an id that isn't in photos.ts. The full field list is in docs/GUIDES.md ("Adding a guide").
check-content also fails a guide that shares its title or its normalized `answer.question` with another, or
more than 25% of its five-word runs (WARN above 15%). A guide goes live only with one of Brian's job photos in
`photos` and only about confirmed services (`related.services`, `src/data/services.ts`); its `needsFromBrian` list keeps
printing after it ships (`.site/decisions/2026-09-28-publish-gates.md`). Release guides in batches as he answers them. Answer first (the `answer` block is the page's first 60 words
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
`name`, `phone` (required), `email` (required on the form since 2026-09-28, Ty), `contact_pref` (`Call` | `Text`), `heard` (optional),
`page` (hidden, the path it was sent from), `company` (honeypot, off-screen), `elapsed_ms` (hidden).
Webhook: env `NOCO_LEAD_WEBHOOK` (never TIMELESS's). One try + 2 retries (3.5 / 2.5 / 2.0 s, inside Netlify's 10 s).
Unset or failing → the visitor sees the phone number (502 page / `{ ok:false }`), the function logs without PII,
and nothing is silently dropped. No phone and no email → 422 (`{ ok:false, error:'contact' }`) so the visitor can fix it. The function
still accepts a lead with a phone and no email (a no-JS post skips the form's check), so a reachable lead is never dropped.
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
- one community page, while writing it: `node scripts/check-content.mjs src/content/communities/{town}--{community}.json`
  — every record rule, the gate (WARN while a draft), the community's own layer file
  (`communities/{town}--{community}.json`), and the overlap checks against every community on disk, its town record and
  its town's putting-green page
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
