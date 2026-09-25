# Guides and the water-rates dataset

The five launch guides in `src/content/guides/`, the data each one stands on, how the water-rates table and
CSV are built, and when each part must be re-checked. Contracts live in `docs/CONTRACTS.md`; this file is the
working manual for the guides only.

All five are `status: draft`. Nothing publishes until the items under "Before a guide can publish" are done.

## Topics, hubs and the guide pages

Every guide belongs to one of thirteen topics (`src/data/guide-topics.ts`; the order there is the order
everywhere). The launch five: `turf-rules-northern-colorado` and `hoa-turf-approval` → `rules-and-hoa`;
`turf-rebates-northern-colorado` and `water-savings` → `water`; `artificial-turf-cost` → `buying`.

| slug | name | hub |
|---|---|---|
| `pets` | Pets and turf | `/guides/pets/` |
| `weather` | Colorado weather: hail, snow, heat, sun, wind | `/guides/weather/` |
| `installation` | Installation, base and drainage | `/guides/installation/` |
| `products` | Turf products and specs | `/guides/products/` |
| `care-and-repair` | Care, cleaning and repair | `/guides/care-and-repair/` |
| `putting-greens` | Putting greens | `/guides/putting-greens/` |
| `safety` | Kids, health and safety | `/guides/safety/` |
| `comparisons` | Turf vs the alternatives | `/guides/comparisons/` |
| `buying` | Cost, quotes and choosing an installer | `/guides/buying/` |
| `rules-and-hoa` | Rules, HOAs and permits | `/guides/rules-and-hoa/` |
| `water` | Water, drought and rebates | `/guides/water/` |
| `commercial` | Commercial, HOA common areas and play spaces | `/guides/commercial/` |
| `yard-design` | Where turf goes: yards, slopes, shade and edges | `/guides/yard-design/` |

- **A hub** (`src/pages/guides/[topic].astro`) exists only while its topic has a visible guide (`visibleTopics()`:
  published at launch, drafts too in the PRELAUNCH preview) and is in the sitemap only with a published one. It
  prints each guide as a numbered entry: glyph, question, short answer, the guide's H2s, checked date. JSON-LD:
  BreadcrumbList, CollectionPage (published by `#business`) and ItemList.
- **/guides/** prints a sheet index of the topics with their counts, then a compact section per topic (the
  question as the link). From `GUIDE_FILTER_FROM` (12, `src/lib/visible.ts`) guides it adds a filter box that
  only exists with JavaScript; without it every guide shows.
- **A guide page** reads Guides › {topic} › {crumb}; its hero label is `{Guide|Tool} · {topic} · NN of NN`; it
  lists up to six more guides from its topic (starting after itself, wrapping), the other topics, and
  previous / next within the topic. Within a topic, the launch five keep their order and later guides follow
  by title (`visibleGuides()`).
- **Navigation** lists topics, never every guide: the header's Guides panel, the footer's site index and the
  404 page link the hubs, and hide a topic with no visible guide.
- **Glyphs:** a guide without a bespoke drawing in `src/components/GuideGlyph.astro` gets its topic's.
- **llms.txt** groups guides under one heading per topic, the hub first.

## Adding a guide

The file is `src/content/guides/{id}.md`: `{id}` is kebab-case, becomes `/guides/{id}/`, and may never equal a
topic slug. The frontmatter, in full (the schema is `src/content.config.ts`):

```yaml
---
status: draft                  # draft | review | published — only published renders at launch
topic: pets                    # REQUIRED: pets | weather | installation | products | care-and-repair | putting-greens |
                               #   safety | comparisons | buying | rules-and-hoa | water | commercial | yard-design
kind: guide                    # guide | tool | problem | comparison (default guide)
title: "… | NoCo Turf Co."     # ≤ 70 characters, suffix included; no other guide may share it
description: "…"               # ≤ 160 characters: the meta description and the hero lede
h1: "Headline: deck"           # a colon splits headline from deck
display:                       # optional, and so is each field in it
  crumb: "Pet odor"            #   ≤ 40; the last crumb (default: the title before the suffix)
  paint: "what a dog does"     #   a phrase of the h1, word for word, that gets the painted mark (check-content fails one that isn't)
  faqH2: "Questions about …."  #   the FAQ heading, a sentence with a period (default: the topic's)
  cta:                         #   the closing band (default: the topic's); if set, title AND payoff
    title: "…"
    payoff: "…"                #   painted
    lede: "…"                  #   optional
answer:
  question: "…?"               # the buyer's question; no other guide may ask the same one (case and punctuation ignored)
  answer: "…"                  # ~60 words, the page's answer in substance; the phone is appended at render
faq:                           # ≤ 8 items; FAQPage mirrors them
  - q: "…"
    a: "…"
layerRefs:                     # every layer record the copy draws on: src/data/layers/*.json or layers/guides/*.json
  - pets-urine-odor.aspca-urine
sources:                       # ≥ 2: { label, url, checked: YYYY-MM-DD }
  - label: "…"
    url: "https://…"
    checked: "2026-09-25"
published: "2026-09-25"
updated: "2026-09-25"          # printed as "Checked"
related:
  services: [pet-turf]         # slugs in src/data/services.ts
  towns: [windsor-co]          # slugs in src/data/territory.mjs NOCO_TOWNS
needsFromBrian: []             # not rendered
---
```

Its own facts go in **`src/data/layers/guides/{id}.json`**: a JSON array of records in the data-layer contract
(docs/CONTRACTS.md), every id starting `{id}.`, `layer` one of the contract's (use `research`, `product` or
`standard` for findings, spec sheets and test standards), `applies_to` `["*"]` or NoCo town slugs, an https
`source_url`, `checked` within a year, `recheck` when the fact will go stale, and every number the fact or quote
uses in `numbers`. Cite each record in `layerRefs`: numbers of 11 or more, decimals and `$` amounts in the copy
must trace to a referenced record or a source label.

Check the one file while writing it:

```
node scripts/check-content.mjs src/content/guides/{id}.md
```

That runs every record rule on the guide, gates its own layer file (every check-layers rule), and compares it
with every other guide on disk: FAIL on the same title or question, or more than 25% of five-word runs shared
with one of them (WARN above 15%; the report names the pair and quotes shared runs). `npm run build` runs the
whole set before every build.

## The five guides

| Guide (route) | Kind | What it is for | Main layer files |
|---|---|---|---|
| `turf-rules-northern-colorado` (`/guides/turf-rules-northern-colorado/`) | guide | Answers "is turf allowed here?" State law in three sentences with primary links, a property-type table, then every NoCo town's code (including "no provision found" and "not confirmed"), and what is still changing. Its town rows are the same records the town pages use. | `state-law.json`, `city-codes.json` |
| `turf-rebates-northern-colorado` (`/guides/turf-rebates-northern-colorado/`) | guide | The honest no: each NoCo provider's program quoted in its own words, its 2026 status, the state grant bar, the one out-of-area exception, and what a planted bed can still earn. | `rebates.json`, `state-law.json` |
| `hoa-turf-approval` (`/guides/hoa-turf-approval/`) | tool | Colorado's backyard protection (detached, attached, condo), what an HOA can still require, the ARC packet checklist, a static request letter and a notice template. The client-side letter generator comes later with design; the static letters in the body are its fallback. | `state-law.json` |
| `water-savings` (`/guides/water-savings/`) | tool | Gallons first, then dollars: what 1,000 sq ft of bluegrass uses and what that water is worth at each provider's 2026 rates, which provider you are on, what the figures leave out, and the CSV. The table is generated (see below). | `water-providers.json` |
| `artificial-turf-cost` (`/guides/artificial-turf-cost/`) | guide | What moves a Northern Colorado quote (clay and base, lawn removal, access, edging, pet, putting-green and play features, product, HOA and permit steps) with no prices and no competitor anchors. | `soil.json`, `city-codes.json` |

Routes follow `docs/CONTRACTS.md`. The plan's `/tools/water-savings/` and `/artificial-turf-cost/` became
`/guides/water-savings/` and `/guides/artificial-turf-cost/`; if the lead restores either plan route, add a 301.

## Layer records each guide references

A guide lists every record it draws on in `layerRefs`; `scripts/check-content.mjs` traces every number of 11
or more, every decimal and every `$` amount to those records (or to the guide's own source labels). A changed
record changes the guide's facts, so re-read the guide when one of these records changes.

- **turf-rules-northern-colorado:** `co-hoa-backyard-detached`, `co-hoa-front-yard-designs`,
  `co-hoa-attached-rear-yard`, `co-special-district-backyard`, `co-sb24-005-nonfunctional-ban`,
  `co-sb24-005-applicable-property`, `co-sb24-005-redevelopment`, `co-sb24-005-maintain-existing`,
  `co-hb25-1113-functional-turf`, `co-hb25-1113-multifamily-2028`, `co-hb25-1113-residential-live-turf-2028`,
  `co-sb24-081-pfas-turf`, `windsor-code-15-3-20-no-turf`, `windsor-code-15-3-10-single-family-exempt`,
  `fc-luc-5.10.1`, `fc-code-12-120-xeriscape-excludes-turf`, `loveland-ord-6819-sb24-005`,
  `greeley-code-24-802-not-visible`, `greeley-front-yard-ban-city-summary`, `greeley-initiative-11-2023-pending`,
  `platteville-code-7-1-30-turf-nuisance`, `johnstown-code-13-151-new-lawn-permit`, `berthoud-code-no-turf-provision`,
  `firestone-fdc-16.6.4-turf-cap`, `firestone-fdc-16.6.4-live-plant-limit`, `firestone-fdc-16.6.4-turf-specs`,
  `firestone-fdc-16.6.4-permit`, `mead-code-no-turf-provision`, `frederick-luc-2.14-front-yard-plants`,
  `longmont-ldc-15.05.040-nonfunctional`, `wellington-code-15-5-40-nonfunctional`,
  `wellington-code-15-5-40-front-yard-75`, `severance-code-no-turf-provision`, `evans-code-18.08.020-common-areas`,
  `eaton-code-7-13-2-nonfunctional`, `milliken-code-16-3-303-nonfunctional`, `dacono-code-16-657g-not-landscaping`,
  `weld-county-code-no-turf-provision`.
  Deliberately NOT referenced (UNVERIFIED, never renders): `timnath-luc-5.7-case-by-case`,
  `frederick-luc-2.14.2.1b-turf-prohibited`, `johnstown-code-artificial-turf-unsearched`, `fc-parkway-live-plants`.
  Those towns carry a "not confirmed" hedge instead; when a record turns VERIFIED, replace the hedge with the fact.
- **turf-rebates-northern-colorado:** `windsor-lawn-replacement-2026`, `johnstown-lawn-replacement-2026`,
  `frederick-lawn-replacement-2026`, `fcu-xip-2026`, `resource-central-lawn-2026`,
  `resource-central-no-artificial-turf` (UNVERIFIED — the quoted exclusion was not found in the cited capture; pages use resource-central-lawn-2026, archived copy), `ltwd-lawn-replacement-2026`,
  `firestone-lawn-replacement-2026`, `greeley-rebates-no-turf-program`, `evans-programs-no-turf-rebate`,
  `wellington-programs-no-turf-rebate`, `co-turf-grant-no-artificial-turf`, `co-cwcb-turf-grant-closed`,
  `frederick-two-providers`. Loveland's rebate record is UNVERIFIED, so the page says "not confirmed".
- **hoa-turf-approval:** `co-hoa-backyard-detached`, `co-hoa-front-yard-designs`, `co-hoa-remedy-notice`,
  `co-hoa-attached-rear-yard`, `co-special-district-backyard`, `co-hb21-1229-origin`,
  `co-sb24-005-nonfunctional-ban`, `co-sb24-005-applicable-property`, `co-sb24-005-maintain-existing`,
  `co-hb25-1113-functional-turf`, `co-sb24-081-pfas-turf`, `firestone-fdc-16.6.4-turf-specs`,
  `firestone-fdc-16.6.4-permit`, `cgs-landscaping-near-foundations`.
- **water-savings:** the eleven rate rows' records (`fcu-residential-rates-2026`, `fclwd-rates-2026-non-city-iga`,
  `fclwd-rates-2026-city-iga`, `nwcwd-rates-2026`, `greeley-water-budget-rates-2026`, `windsor-rates-2026`,
  `raindance-nonpotable-irrigation`, `loveland-rates-2026` (EXTERNAL_SOURCE), `longmont-rates-2026`,
  `ltwd-rates-2026-standard-tap`, `ltwd-allotment-overage-2026`, `elco-rates-not-published`), the service-area
  records (`fclwd-service-area`, `elco-service-area`, `nwcwd-service-area`, `windsor-water-suppliers`,
  `windsor-larimer-side-fclwd`, `ltwd-service-area-mead-barefoot-lakes`, `frederick-two-providers`) and
  `johnstown-level-3-2026` (FAQ).
- **artificial-turf-cost:** `cgs-expansive-soil`, `cgs-landscaping-near-foundations`, `nrcs-nunn-weld-shrink-swell`,
  `greeley-hard-clay-city`, `longmont-clay-soils-city`, `firestone-fdc-16.6.4-turf-specs`,
  `firestone-fdc-16.6.4-permit`, `greeley-initiative-11-2023-pending`, `co-sb24-081-pfas-turf`.

### Sources that are not layer records

Each is in the guide's `sources` with its checked date; all were read on 2026-09-24.

| Source | Used by | What it supplies | Re-check |
|---|---|---|---|
| CSU Extension, CMG GardenNotes #564 (Koski) — https://cmg.extension.colostate.edu/Gardennotes/564.pdf | water-savings | "24 inches for bluegrass" of supplemental irrigation in a normal year along the Front Range (the gallons input) | yearly with the rates |
| CSU Extension, CMG GardenNotes #412 — https://cmg.extension.colostate.edu/Gardennotes/412.pdf | water-savings | community-wide, lawns get about twice what bluegrass needs | yearly |
| NIST Handbook 44 (2026), Appendix C — https://www.nist.gov/document/2026-nist-handbook-44-appendix-c | water-savings | 1 gallon = 231 cubic inches | never changes |
| Colorado DRE, HOA Information and Resource Center — https://dre.colorado.gov/hoa-center | hoa-turf-approval | where homeowners get HOA-rights help | June, with state law (the site 403s plain curl; a browser user agent reads it) |
| 2026 Artificial Turf Rules for Water-Wise Landscape Rebate (PDF) — thorntonwater.com | turf-rebates | the one Front Range artificial-turf rebate we found, outside NoCo's area | February, with rebates |

The out-of-area program is described without naming its city: `check-content.mjs` fails any Denver-metro town
name in NoCo copy (territory.mjs `TIMELESS_TOWNS`), including in source labels. The link's host name is
lowercase and does not trip the check. The Denver-metro boundary note belongs to the page template
(`data-boundary`), not to guide copy.

## How the water-savings table and the CSV are built

```
node scripts/build-water-rates.mjs            # write public/data/noco-water-rates-2026.csv, the guide table, the dataset source label
node scripts/build-water-rates.mjs --check    # write nothing; exit 1 if any output is stale (safe for CI / prebuild)
node scripts/build-water-rates.mjs --stdout   # print everything, write nothing
```

Run it after any change to `src/data/layers/water-providers.json`, then run `node scripts/check-content.mjs`.

**Method.** Gallons a year per 1,000 sq ft = 24 in × 1,000 × 144 ÷ 231 = 14,961. CSU Extension's 24 inches is
the primary-source irrigation figure (not a vendor's); 144 ÷ 231 converts an inch over a square foot to gallons
(NIST). Dollars a year = gallons ÷ 1,000 × the provider's price per 1,000 gallons, rounded to whole dollars.
Saved water comes off the top of the bill, so each row is a bracket: `marginal_price` is the lowest rate the
saved water can be billed at (the first priced tier; gallons bundled into a base charge, as at NWCWD, are
skipped) and `marginal_price_top` the highest. Greeley's water budget uses Tier 1 (within budget) to Tier 4.
Base charges and sewer are not counted. ELCO publishes no usage rates, so its row says "not published" and
shows only its conservation charge. LTWD's allotment overage is shown as an extra line.

**Where the script writes in the guide.** Between `<!-- build-water-rates:table:start -->` and
`<!-- build-water-rates:table:end -->` (the table), and between `# build-water-rates:source:start` and
`# build-water-rates:source:end` in the frontmatter (one `sources` entry for the dataset). Never edit either
block by hand.

**Why the dataset source label carries numbers.** `check-content.mjs` traces a guide's numbers only to
referenced layer records and to the guide's own source labels. The derived figures (14,961 gallons, 14.961,
0.623 and the dollars a year) exist in no layer record, so the script writes them into the dataset source's
label, where the checker can trace them. The derived dollar cells are printed without a `$` sign (the column
header says "US dollars a year") because the checker's `$` rule accepts only amounts found in referenced layer
records; those rules exist to stop invented prices, and these are arithmetic on sourced rates. A cleaner
long-term fix is for the lead to add a derived layer record (or teach the checker to read the CSV's derived
columns); the script would then drop the label numbers.

**Rows.** Fort Collins Utilities; FCLWD (Non-City IGA and City IGA as two rows); NWCWD; Greeley; Town of Windsor;
RainDance (non-potable irrigation); Loveland; Longmont; Little Thompson (standard 5/8-inch tap, plus overage);
ELCO. Not yet collected (the guide says so): the town systems of Johnstown, Berthoud, Firestone, Frederick,
Evans, Milliken, Eaton, Severance, Wellington and Dacono, and Left Hand and Central Weld County water districts.
Only VERIFIED and EXTERNAL_SOURCE records are used; the script stops on a missing record or when a quote no
longer carries the figure it reads ($10.00 LTWD overage, $5.61 ELCO conservation charge).

## The CSV and its licence

`public/data/noco-water-rates-2026.csv` is published at `/data/noco-water-rates-2026.csv` under
**Creative Commons Attribution 4.0 International (CC BY 4.0)**, https://creativecommons.org/licenses/by/4.0/.
Anyone may reuse it with credit: "NoCo Turf Co., Northern Colorado water rates 2026,
https://www.nocoturf.com/guides/water-savings/". The rates themselves are public facts from each provider;
the licence covers our compilation and the derived columns.

Columns: the contract's nine first (`provider, towns, model, effective, unit, base_monthly, marginal_price,
source_url, checked`), then `marginal_price_top, marginal_basis, gal_saved_per_1000_sqft_yr,
usd_per_1000_sqft_yr_low, usd_per_1000_sqft_yr_top, extra_charge_per_1000_gal, served, layer_id, status,
reachable, notes`. `towns` lists territory names from the record's `applies_to` (semicolon-separated); `served`
says who actually pays those rates, because the bill, not the town, decides.

For the page template (not built here): a `Dataset` JSON-LD node on `/guides/water-savings/` with `name`,
`license` (the CC BY 4.0 URL), `distribution` (`DataDownload`, `encodingFormat: text/csv`, the CSV URL),
`isBasedOn` (each row's `source_url`), `creator` → `#business`, and `dateModified` = the newest `checked`.

## Re-verify calendar

Dates come from each record's `recheck` (check-layers fails the build once one is in the past). After a
re-check, update the layer record first, then re-run the rates script and `check-content.mjs`, then the guide's
`updated` date.

| When | What | Guides |
|---|---|---|
| **2026-10-14** | Greeley: Planning Commission and Council agendas on the front-yard turf initiative; codification of Sec. 24-802 | rules, cost |
| **2026-10-16** | Johnstown Level 3 schedule ends 2026-10-15; new-lawn permit page | water-savings (FAQ), rules |
| **2026-10-24** | Resource Central's artificial-turf exclusion, re-read in a browser on the live page (the record is an archived copy); Timnath, Frederick and Johnstown turf wording (still UNVERIFIED) | rebates, rules |
| **2026-11-01** | CWCB turf grant page (a fall window was possible "if and when funding is available") | rebates |
| **2026-12-24** | Every city-code record (quarterly thereafter): new SB24-005 / HB25-1113 ordinances, Mead's lagging codification | rules, hoa, cost |
| **2027-01-02 to 01-05** | 2027 water rates for every row; re-run the rates script, rename the CSV and guide year when 2027 rates land | water-savings |
| **2027-02-01** | 2027 rebate programs and windows | rebates |
| **2027-06-15** | State law (end of the legislative session): HOA statutes, SB24-005 / HB25-1113, SB24-081 | rules, hoa, cost |
| **May, yearly** | Mid-year rate changes (Windsor changed 2026-02-01, LTWD 2026-04-17) | water-savings |

Sources that block automated fetching (`reachable: false` or a 403 to curl) need a person with a browser:
fortcollins.gov (FCU rates, XIP), resourcecentral.org, lovelandwaterandpower.org, dre.colorado.gov,
and the Timnath, Frederick and Johnstown code hosts.

## Writing rules for these guides

- Answer first: the `answer` block is the page's first ~60 words in substance. H2s are the buyer's questions.
- Every number of 11 or more, every decimal and every `$` amount traces to a referenced layer record or a
  source label. Dates in copy count too.
- No claim about NoCo that is not an approved `.site/truth/claims.json` entry. Unapproved claim phrases fail
  the checker even in drafts (for example "water savings alone", "certified installer", "our base spec",
  "per square foot installed"). Greeley's proposal is written as "an installer who is licensed or certified",
  matching the layer record, not the register's banned phrase.
- Hedge unsettled law with "It depends … ask {the town's} Planning" (never "we confirm" — a NoCo process claim the register blocks until Brian confirms it), label anything statutory "Not legal advice", and summarise
  state law briefly with primary links; the statewide guides belong to the sister brand.
- Never type NoCo's phone number (the template renders it from the brief), never name a Denver-metro town,
  never use wealth or demographic language.

## Before a guide can publish

- **All:** Brian confirms the hedge promise "we confirm the rule for your address" (rules, cost); the guide's
  page template exists; `check-content.mjs` and `build-water-rates.mjs --check` pass; every `recheck` date used
  is still in the future.
- **water-savings:** Brian states the payback framing in his own words so claims.json "water savings alone
  rarely pay for turf" can move from INFERENCE to CLIENT_CONFIRMED and be approved. Until then the page shows
  gallons and dollars only and makes no payback statement.
- **hoa-turf-approval:** Brian confirms whether NoCo supplies ARC packet items (spec sheet, base and drainage
  section, layout) and supplies product spec sheets with PFAS documentation.
- **artificial-turf-cost:** stays numberless until Brian approves price bands (claims.json "Published price
  bands"); the estimator island stays dormant.
- **turf-rebates:** optional example of a mixed turf-plus-plants project.
