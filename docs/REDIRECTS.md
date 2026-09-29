# Redirects: every old URL and where it goes

`public/_redirects` is the map. This page gives the reason for every line, the targets that depend on an
answer from Brian, and the work outside this repo (other domains, DNS, Search Console).
`tests/redirects.test.mjs` checks the map. Change the map, this table and (for service URLs) the `legacy` arrays in
`src/data/services.ts` together, in one commit.

```sh
node --test tests/redirects.test.mjs                                   # any time; no build needed
npm run build && LAUNCH_CHECK=1 node --test tests/redirects.test.mjs   # before cutover: every target is built
```

Inventory and facts checked 2026-09-24.

## What the map covers

| Source set | Count | Where it came from |
|---|---|---|
| The current site's sitemap (www, trailing slash; its canonicals were the no-slash form) | 45 | crawl of `sitemap-0.xml`, 2026-09-24 |
| Stale "ghost" pages still live on the current site (not in its sitemap) | 6 | same crawl |
| Other files on the current site (`/index.html`, `/sitemap-index.xml`, `/sitemap-0.xml`) | 3 | same crawl |
| 2024–26 URLs on the apex `nocoturf.com` (WordPress/WooCommerce, then the GoDaddy builder) | 101 paths | Wayback CDX plus the archived Yoast sitemaps (content and utility rows); `/m/bookings`, `/f.atom` and `/f.rss` from the same audit |
| Service URLs in `src/data/services.ts` `legacy` | 20 | parsed by the test; one of them is the installation page itself, which keeps its URL |

`public/_redirects` has 123 rules: 99 × 301 (one of them forced) and 24 × 410. Thirteen are splats (`/x/*`) that catch any page under an old section. Every old path, with and without its
trailing slash, ends in exactly one of three outcomes:

- **Same path.** No line, because the new build has the page: `/`, `/about/`, `/contact/`, `/privacy/`, `/terms/`,
  `/review/`, `/services/`, `/services/artificial-turf-installation/`, `/robots.txt`, `/sitemap.xml`, `/llms.txt`, and
  the 12 NoCo town pages already live under `/areas/{town}-co/` (the towns with `live: true` in `src/data/territory.mjs`).
  Netlify's Pretty URLs sends the old no-slash form (`/about`) to the slash form in one hop.
- **301, in one hop**, to the nearest real equivalent on www.
- **410** where nothing on the new site answers the same need.

Old URLs that are deliberately left alone:
- Crawler probes that already returned 404 on the old site (`/.well-known/*`, `/ads.txt`, `/app-ads.txt`,
  `/favicon.ico`, feed-name guesses). The test makes sure no rule catches `/.well-known/`.
- WordPress template URLs that are the homepage plus a query string (`/?elementskit_template=header`). They serve
  the new homepage, whose canonical is `/`. A query rule on `/` could take the homepage down, so there is none.

## How Netlify reads the file

Checked 2026-09-24 against [Redirect options](https://docs.netlify.com/manage/routing/redirects/redirect-options/) and
[Redirects overview](https://docs.netlify.com/manage/routing/redirects/overview/):

- `_redirects` is read before the `netlify.toml` rules, top to bottom, and the **first match wins**.
- A rule **matches with or without the trailing slash** ("Netlify will match paths to rules regardless of whether
  or not they contain a trailing slash"). One line therefore covers both the old slash URL and the old no-slash
  canonical. A rule that only adds or removes a slash loops, and the docs say so. **Pretty URLs** (on by default)
  handles `/about` → `/about/`. At cutover, confirm it is on under Project configuration › Developer settings › Post processing.
- **Shadowing:** a rule without `!` does not fire when a file exists at its path. So if a page is ever built at an old
  source path, the page wins and the old line becomes a no-op. `LAUNCH_CHECK=1` flags any line that is shadowed.
  The one forced line is `/index.html  /  301!`: that file always exists.
- Paths are **case-sensitive**. A splat (`/wp-json/*`) must end the path. A query string passes through to a 301 target.
- **410:** the docs say "You can specify the HTTP status code for any redirect rule", but they only give examples
  for 200/301/302/404. A line `/old  /410.html  410` serves the body of that file with status 410 and keeps the URL. A
  Netlify forum user reported this on 2026-07-24 ([answers.netlify.com/t/165490](https://answers.netlify.com/t/165490)).
  This map uses `/404.html` (from `src/pages/404.astro`) as the body. **Verify on the first deploy preview** that a
  ghost URL returns `410`, not `404` or `200`.
- Google treats 404 and 410 the same: "All 4xx errors, except 429, are treated the same" ([Google Search Central,
  HTTP status codes](https://developers.google.com/search/docs/crawling-indexing/http-network-errors), checked 2026-09-24).
  The 410 is the more honest statement; it is not a ranking lever.

**Why the 301 targets are absolute (`https://www.nocoturf.com/…`).** The WordPress-era URLs lived on the apex. Because
`_redirects` runs before the `netlify.toml` apex→www rules, a relative target would send
`https://nocoturf.com/old` to `https://nocoturf.com/new` and then to www: two hops. An absolute target makes it one.
The cost: on a deploy preview, a legacy URL jumps to the production host. That host is still the old site until DNS moves.
Check redirects on previews with `curl -sI` and read the `location` header; don't click through.

Open question to settle at cutover: Netlify also redirects the apex to www **automatically** when www is the primary
domain ([Manage multiple domains](https://docs.netlify.com/manage/domains/manage-domains/manage-multiple-domains/)).
The docs do not say whether that runs before or after `_redirects`. If `curl -sI https://nocoturf.com/artificial-grass-installation-windsor-co/`
returns `location: https://www.nocoturf.com/artificial-grass-installation-windsor-co/`, the automatic redirect ran first.
Apex legacy URLs then take two hops. Google follows up to 10 ("By default, Google's crawlers follow up to 10 redirect
hops", same Google page), so nothing is lost, but the studio's one-hop rule is not met. Ask Netlify support whether the
apex can be served as a plain domain alias so this file handles it.

## The map

Status `301!` means forced. A 410 line serves the body of `/404.html`. HOLD marks a target that depends on
something unconfirmed; see the next section.

**The homepage duplicate**

| Source | Target | Status | Why |
|---|---|---|---|
| `/index.html` | `/` | 301! | The old site served the homepage twice. Forced (`!`) because the file exists |

**Current site (sitemap, 2026-07 deploy): 18 service URLs → the flat /services/{slug}/ set**

| Source | Target | Status | Why |
|---|---|---|---|
| `/services/artificial-turf-installation/residential-artificial-turf-installation/` | `/services/artificial-turf-installation/` | 301 | Residential installation is what the installation page covers (services.ts) |
| `/services/artificial-turf-installation/site-preparation-for-turf/` | `/services/artificial-turf-installation/` | 301 | Site prep becomes the base section of the installation page (services.ts) |
| `/services/landscape-design-installation/` | `/services/artificial-turf-installation/` | 301 | Landscape design is not a confirmed NoCo service; turf installation is the nearest real one (services.ts) |
| `/services/landscape-design-installation/landscape-turf-installation/` | `/services/artificial-turf-installation/` | 301 | Landscape design is not a confirmed NoCo service; turf installation is the nearest real one (services.ts) |
| `/services/landscape-design-installation/residential-landscape-design/` | `/services/artificial-turf-installation/` | 301 | Landscape design is not a confirmed NoCo service; turf installation is the nearest real one (services.ts) |
| `/services/landscape-design-installation/outdoor-space-planning/` | `/services/artificial-turf-installation/` | 301 | Landscape design is not a confirmed NoCo service; turf installation is the nearest real one (services.ts) |
| `/services/landscape-design-installation/landscape-consultation/` | `/services/artificial-turf-installation/` | 301 | Landscape design is not a confirmed NoCo service; turf installation is the nearest real one (services.ts) |
| `/services/specialty-turf-services/` | `/services/artificial-turf-installation/` | 301 | Template hub; its turf leaves get their own pages; the hub goes to installation (services.ts) |
| `/services/specialty-turf-services/custom-turf-design/` | `/services/artificial-turf-installation/` | 301 | Custom layout is part of every installation (services.ts) |
| `/services/specialty-turf-services/specialty-turf-consultation/` | `/services/artificial-turf-installation/` | 301 | A consultation is the estimate visit on the installation page (services.ts) |
| `/services/artificial-turf-installation/pet-safe-turf-installation/` | `/services/pet-turf/` | 301 | Same service, flat URL (services.ts) |
| `/services/specialty-turf-services/putting-green-installation/` | `/services/putting-greens/` | 301 | Same service, flat URL (services.ts) |
| `/services/specialty-turf-services/playground-turf-installation/` | `/services/playground-turf/` | 301 | Same service, flat URL (services.ts) |
| `/services/artificial-turf-installation/commercial-artificial-turf-installation/` | `/services/commercial-turf/` | 301 | Commercial, HOA, sports and indoor turf share one page (services.ts) |
| `/services/artificial-turf-installation/sports-turf-installation/` | `/services/commercial-turf/` | 301 | Commercial, HOA, sports and indoor turf share one page (services.ts) |
| `/services/landscape-design-installation/commercial-landscape-installation/` | `/services/commercial-turf/` | 301 | Commercial work goes to the commercial/HOA/sports page (services.ts) |
| `/services/specialty-turf-services/indoor-turf-installation/` | `/services/commercial-turf/` | 301 | Commercial, HOA, sports and indoor turf share one page (services.ts) |

**Current site: towns that belong to the sister brand → the /areas/ hub (it carries the boundary note)**

| Source | Target | Status | Why |
|---|---|---|---|
| `/areas/erie-co/` | `/areas/` | 301 | Sister-brand territory (decision 2026-09-24). /areas/ carries the boundary note |
| `/areas/brighton-co/` | `/areas/` | 301 | Sister-brand territory (decision 2026-09-24). /areas/ carries the boundary note |
| `/areas/thornton-co/` | `/areas/` | 301 | Sister-brand territory (decision 2026-09-24). /areas/ carries the boundary note |
| `/areas/broomfield-co/` | `/areas/` | 301 | Sister-brand territory (decision 2026-09-24). /areas/ carries the boundary note |

**Current site: six stale south-metro "ghost" pages (never in the sitemap) → gone**

| Source | Target | Status | Why |
|---|---|---|---|
| `/areas/denver-co/` | (gone; body of `/404.html`) | 410 | Stale south-metro page from a June 2026 deploy, never in the sitemap, outside NoCo territory. Decision: 410 |
| `/areas/aurora-co/` | (gone; body of `/404.html`) | 410 | Stale south-metro page from a June 2026 deploy, never in the sitemap, outside NoCo territory. Decision: 410 |
| `/areas/arvada-co/` | (gone; body of `/404.html`) | 410 | Stale south-metro page from a June 2026 deploy, never in the sitemap, outside NoCo territory. Decision: 410 |
| `/areas/englewood-co/` | (gone; body of `/404.html`) | 410 | Stale south-metro page from a June 2026 deploy, never in the sitemap, outside NoCo territory. Decision: 410 |
| `/areas/lakewood-co/` | (gone; body of `/404.html`) | 410 | Stale south-metro page from a June 2026 deploy, never in the sitemap, outside NoCo territory. Decision: 410 |
| `/areas/westminster-co/` | (gone; body of `/404.html`) | 410 | Stale south-metro page from a June 2026 deploy, never in the sitemap, outside NoCo territory. Decision: 410 |

**Current site: utility pages**

| Source | Target | Status | Why |
|---|---|---|---|
| `/blog/` | `/guides/` | 301 | It was a 2-second meta-refresh stub; the guides hub replaces the blog |
| `/projects/` | `/work/` | 301 | An empty "0+ projects" page; /work/ holds the real case studies |
| `/discount/` | `/contact/` | 301 | An ad landing form; the one estimate form lives on /contact/ |
| `/thank-you/` | `/thanks/` | 301 | Renamed. /thanks/ is noindex |
| `/marketing-form/` | (gone; body of `/404.html`) | 410 | CRM capture form that is being retired (plan, Phase 0.1). Nothing replaces it |
| `/sitemap-index.xml` | `/sitemap.xml` | 301 | An old sitemap file; the site has one sitemap now |
| `/sitemap-0.xml` | `/sitemap.xml` | 301 | An old sitemap file; the site has one sitemap now |

**2024–25 WordPress town pages (apex)**

| Source | Target | Status | Why |
|---|---|---|---|
| `/artificial-grass-installation-berthoud-co/` | `/areas/berthoud-co/` | 301 | Same town, new URL |
| `/artificial-grass-installation-fort-collins-co/` | `/areas/fort-collins-co/` | 301 | Same town, new URL |
| `/artificial-grass-installation-johnstown-co/` | `/areas/johnstown-co/` | 301 | Same town, new URL |
| `/artificial-grass-installation-windsor-co/` | `/areas/windsor-co/` | 301 | Same town, new URL. Was indexed #2 for "artificial turf installation Windsor CO" on 2026-09-24 (WebSearch) |
| `/artificial-grass-installation-evans-co/` | `/areas/evans-co/` | 301 | Same town, new URL. HOLD: Evans is a new lean page (territory.mjs `live: false`) |
| `/artificial-grass-installation-erie-co/` | `/areas/` | 301 | Sister-brand territory. Was indexed #3 for its Erie query on 2026-09-24 (WebSearch) |
| `/commercial-artificial-turf-berthoud-co/` | `/services/commercial-turf/` | 301 | The query is commercial turf, so it goes to the commercial/HOA/sports page. Fallback: the town page |
| `/commercial-artificial-turf-fort-collins-co/` | `/services/commercial-turf/` | 301 | The query is commercial turf, so it goes to the commercial/HOA/sports page. Fallback: the town page |
| `/commercial-artificial-turf-johnstown-co/` | `/services/commercial-turf/` | 301 | The query is commercial turf, so it goes to the commercial/HOA/sports page. Fallback: the town page |
| `/commercial-artificial-turf-windsor-co/` | `/services/commercial-turf/` | 301 | The query is commercial turf, so it goes to the commercial/HOA/sports page. Fallback: the town page |
| `/commercial-artificial-turf-evans-co/` | `/services/commercial-turf/` | 301 | The query is commercial turf, so it goes to the commercial/HOA/sports page. Fallback: the town page |
| `/commercial-artificial-turf-erie-co/` | `/areas/` | 301 | Sister-brand territory |

**Later: the commercial town lines move to their town × service pages.** The five NoCo
`/commercial-artificial-turf-{town}-co/` lines (Berthoud, Fort Collins, Johnstown, Windsor, Evans) stay on
`/services/commercial-turf/` for now. Each should move to `/areas/{town}-co/commercial-turf/` in the commit that
publishes that page (src/content/town-services/{town}-co--commercial-turf.json, gate passing, town page published,
commercial-turf confirmed) — not before: `LAUNCH_CHECK=1` fails a 301 whose target isn't built, and a
town × service page exists at launch only when all four hold (docs/CONTRACTS.md). The route is already planned
(`tests/redirects.test.mjs` expands `/areas/{slug}/{service}/`), so the move is one line in `public/_redirects` and
one row here. A commercial-turf page can't pass its gate until Brian supplies a photo of his own commercial job
(photos.ts `use: 'commercial'`), so expect these to move last. The Erie line stays on `/areas/`.

**2024–26 WordPress and GoDaddy-builder core pages (apex)**

| Source | Target | Status | Why |
|---|---|---|---|
| `/installation-services/` | `/services/artificial-turf-installation/` | 301 | Same service (services.ts) |
| `/maintenance-services/` | `/services/turf-repair/` | 301 | Indexed on 2026-09-24. Cleaning and repair page (services.ts). HOLD: only if Brian still offers it |
| `/why-noco-turf-co` | `/about/` | 301 | Company story page (GoDaddy era) |
| `/financing-options` | `/contact/` | 301 | No financing page is planned. HOLD: Brian confirms whether financing is offered |
| `/privacy-policy` | `/privacy/` | 301 | Same document, new URL |
| `/privacy-policy-2/` | `/privacy/` | 301 | Same document, new URL |
| `/terms-and-conditions/` | `/terms/` | 301 | Same document, new URL |

**2024 WordPress blog posts (apex) → the planned guide or service that answers the same question**

| Source | Target | Status | Why |
|---|---|---|---|
| `/noco-turf-co-breaks-down-residential-synthetic-grass-cost/` | `/guides/artificial-turf-cost/` | 301 | Same question; the cost guide is in the launch set |
| `/is-artificial-grass-safe-for-cats-what-pet-owners-should-know/` | `/services/pet-turf/` | 301 | Pet question; the pet turf page answers it |
| `/paw-perfect-artificial-grass-the-eco-friendly-lawn-for-pet-lovers/` | `/services/pet-turf/` | 301 | Pet question; the pet turf page answers it |
| `/synthetic-grass-safe-for-dogs/` | `/services/pet-turf/` | 301 | Pet question; the pet turf page answers it |
| `/how-to-clean-synthetic-grass-noco-turf-co-dives-in-deep/` | `/services/turf-repair/` | 301 | Cleaning question; the cleaning and repair page answers it |
| `/can-you-lay-synthetic-grass-on-concrete/` | `/services/artificial-turf-installation/` | 301 | Installation question (what turf can go over) |
| `/get-the-best-artificial-grass-in-colorado/` | `/services/artificial-turf-installation/` | 301 | General "artificial grass in Colorado" post |
| `/how-long-does-synthetic-grass-last-a-guide/` | `/services/artificial-turf-installation/` | 301 | Lifespan question; the installation page covers product life |
| `/is-synthetic-grass-hot-in-the-sun-colorado-is-hot/` | `/services/artificial-turf-installation/` | 301 | Heat question; the installation page covers product choice |
| `/what-is-synthetic-grass/` | `/services/artificial-turf-installation/` | 301 | Basics post; the installation page explains the product |
| `/what-is-synthetic-grass-made-of/` | `/services/artificial-turf-installation/` | 301 | Basics post; the installation page explains the product |
| `/where-can-i-buy-synthetic-grass/` | `/turf-supply/` | 301 | Buying turf retail. HOLD: TURF_SUPPLY |
| `/where-to-buy-synthetic-grass-the-noco-turf-co-storefront/` | `/turf-supply/` | 301 | Buying turf retail. HOLD: TURF_SUPPLY |
| `/category/*` | `/guides/` | 301 | Blog category archives (/category/artificial-grass/, /category/synthetic-grass/) go to the guides hub |

**2024–25 WooCommerce store (apex) → /turf-supply/**

| Source | Target | Status | Why |
|---|---|---|---|
| `/shop/` | `/turf-supply/` | 301 | The store. HOLD: TURF_SUPPLY |
| `/new-shop/` | `/turf-supply/` | 301 | The store. HOLD: TURF_SUPPLY |
| `/product/bayhill-blend/` | `/turf-supply/` | 301 | Retail product page. HOLD: TURF_SUPPLY |
| `/product/bethpage-blend/` | `/turf-supply/` | 301 | Retail product page. HOLD: TURF_SUPPLY |
| `/product/broadmoor/` | `/turf-supply/` | 301 | Retail product page. HOLD: TURF_SUPPLY |
| `/product/cypress/` | `/turf-supply/` | 301 | Retail product page. HOLD: TURF_SUPPLY |
| `/product/lakota/` | `/turf-supply/` | 301 | Retail product page. HOLD: TURF_SUPPLY |
| `/product/pebble-forest-2/` | `/turf-supply/` | 301 | Retail product page. HOLD: TURF_SUPPLY |
| `/product/pebble-olive/` | `/turf-supply/` | 301 | Retail product page. HOLD: TURF_SUPPLY |
| `/product/pebble-spring-2/` | `/turf-supply/` | 301 | Retail product page. HOLD: TURF_SUPPLY |
| `/product/pinehurst-forest/` | `/turf-supply/` | 301 | Retail product page. HOLD: TURF_SUPPLY |
| `/product/pinehurst-olive/` | `/turf-supply/` | 301 | Retail product page. HOLD: TURF_SUPPLY |
| `/product/sawgrass/` | `/turf-supply/` | 301 | Retail product page. HOLD: TURF_SUPPLY |
| `/product/scottsdale/` | `/turf-supply/` | 301 | Retail product page. HOLD: TURF_SUPPLY |
| `/product/spyglass/` | `/turf-supply/` | 301 | Retail product page. HOLD: TURF_SUPPLY |
| `/product/t-cool/` | `/turf-supply/` | 301 | Retail product page. HOLD: TURF_SUPPLY |
| `/product/torrey/` | `/turf-supply/` | 301 | Retail product page. HOLD: TURF_SUPPLY |
| `/product/troon/` | `/turf-supply/` | 301 | Retail product page. HOLD: TURF_SUPPLY |
| `/product/turnberry/` | `/turf-supply/` | 301 | Retail product page. HOLD: TURF_SUPPLY |
| `/product/westmoor/` | `/turf-supply/` | 301 | Retail product page. HOLD: TURF_SUPPLY |
| `/product/wonderfill/` | `/turf-supply/` | 301 | Retail product page. HOLD: TURF_SUPPLY |
| `/product/zeodorizer/` | `/turf-supply/` | 301 | Retail product page. HOLD: TURF_SUPPLY |
| `/product/*` | `/turf-supply/` | 301 | Any product URL the archive missed |
| `/product-category/commercial/` | `/turf-supply/` | 301 | Retail category page. HOLD: TURF_SUPPLY |
| `/product-category/infills/` | `/turf-supply/` | 301 | Retail category page. HOLD: TURF_SUPPLY |
| `/product-category/landscape/` | `/turf-supply/` | 301 | Retail category page. HOLD: TURF_SUPPLY |
| `/product-category/pet-friendly/` | `/turf-supply/` | 301 | Retail category page. HOLD: TURF_SUPPLY |
| `/product-category/putting-green/` | `/turf-supply/` | 301 | Retail category page. HOLD: TURF_SUPPLY |
| `/product-category/*` | `/turf-supply/` | 301 | Any category URL the archive missed |

**Old platform sitemaps (apex) → the one sitemap**

| Source | Target | Status | Why |
|---|---|---|---|
| `/sitemap_index.xml` | `/sitemap.xml` | 301 | An old sitemap file; the site has one sitemap now |
| `/page-sitemap.xml` | `/sitemap.xml` | 301 | An old sitemap file; the site has one sitemap now |
| `/post-sitemap.xml` | `/sitemap.xml` | 301 | An old sitemap file; the site has one sitemap now |
| `/product-sitemap.xml` | `/sitemap.xml` | 301 | An old sitemap file; the site has one sitemap now |
| `/product_cat-sitemap.xml` | `/sitemap.xml` | 301 | An old sitemap file; the site has one sitemap now |
| `/category-sitemap.xml` | `/sitemap.xml` | 301 | An old sitemap file; the site has one sitemap now |
| `/post_tag-sitemap.xml` | `/sitemap.xml` | 301 | An old sitemap file; the site has one sitemap now |
| `/author-sitemap.xml` | `/sitemap.xml` | 301 | An old sitemap file; the site has one sitemap now |
| `/elementskit_template-sitemap.xml` | `/sitemap.xml` | 301 | An old sitemap file; the site has one sitemap now |

**Old platform machinery with no equivalent (apex) → gone**

| Source | Target | Status | Why |
|---|---|---|---|
| `/cart/` | (gone; body of `/404.html`) | 410 | Store checkout. Nothing replaces it |
| `/checkout/` | (gone; body of `/404.html`) | 410 | Store checkout. Nothing replaces it |
| `/my-account/*` | (gone; body of `/404.html`) | 410 | Store accounts. Nothing replaces them |
| `/sample-page/` | (gone; body of `/404.html`) | 410 | WordPress default page |
| `/tag/*` | (gone; body of `/404.html`) | 410 | Blog tag archives. Nothing replaces them |
| `/author/*` | (gone; body of `/404.html`) | 410 | Blog author archive |
| `/feed/*` | (gone; body of `/404.html`) | 410 | Blog feeds |
| `/comments/feed/*` | (gone; body of `/404.html`) | 410 | Blog feeds |
| `/wp-admin/*` | (gone; body of `/404.html`) | 410 | WordPress machinery |
| `/wp-content/*` | (gone; body of `/404.html`) | 410 | WordPress machinery |
| `/wp-includes/*` | (gone; body of `/404.html`) | 410 | WordPress machinery |
| `/wp-json/*` | (gone; body of `/404.html`) | 410 | WordPress machinery |
| `/wp-login.php` | (gone; body of `/404.html`) | 410 | WordPress machinery |
| `/xmlrpc.php` | (gone; body of `/404.html`) | 410 | WordPress machinery |
| `/m/*` | (gone; body of `/404.html`) | 410 | GoDaddy-builder member pages (/m/login, /m/create-account, /m/bookings) |
| `/f.atom` | (gone; body of `/404.html`) | 410 | GoDaddy-builder feed |
| `/f.rss` | (gone; body of `/404.html`) | 410 | GoDaddy-builder feed |

## Holds: targets that may not exist at launch

`LAUNCH_CHECK=1` fails while any 301 target is missing from `dist/`. For each target that does not ship, repoint its lines
as below (still one hop), update this table, and run the test.

**Applied at launch, 2026-09-29:** `/turf-supply/` (every store line → installation; the putting-green, pet-friendly and
commercial categories → their service), `/services/turf-repair/` (`/maintenance-services/` → installation, moved into
installation's `legacy`), and the old blog posts whose guides aren't live (cleaning, concrete, materials → installation). Point each back when
its page ships. The cost, pet-safety, lifespan and heat posts went back to their guides the same day, once those
guides were live.

| Target | Ships when | If it doesn't ship, repoint to |
|---|---|---|
| `/turf-supply/` | Brian confirms the Windsor store still sells to the public (`TURF_SUPPLY.confirmed` in services.ts; Appendix A question 1) | `/services/artificial-turf-installation/` for every `/turf-supply/` line: 2 store pages, 20 products, 5 categories, 2 splats and the 2 "where to buy" posts. services.ts already names this fallback. Optional, finer: `/product-category/putting-green/` → `/services/putting-greens/`, `/product-category/pet-friendly/` → `/services/pet-turf/`, `/product-category/commercial/` → `/services/commercial-turf/` |
| `/services/pet-turf/`, `/services/putting-greens/`, `/services/playground-turf/`, `/services/commercial-turf/`, `/services/turf-repair/` | Brian confirms the service and supplies photos (`confirmed` in services.ts; Appendix A question 4) | Move that service's `legacy` URLs into `artificial-turf-installation`'s array in services.ts, then point those lines, the blog posts that target it and `/maintenance-services/` at `/services/artificial-turf-installation/`. For `commercial-turf`, the `/commercial-artificial-turf-{town}-co/` lines go to `/areas/{town}-co/` instead |
| `/services/artificial-turf-installation/` | Installation is confirmed | Nothing launches without it. It is the core service |
| `/guides/artificial-turf-cost/` | The cost guide publishes | `/services/artificial-turf-installation/` |
| `/guides/` | At least one guide publishes | `/blog/` and `/category/*` → 410 (the old blog was an empty stub) |
| `/work/` | At least one case study publishes | `/projects/` → 410 (the old page listed no projects) |
| `/areas/evans-co/` | The Evans record passes the town gate (a new lean page) | `/areas/` |
| `/areas/{berthoud,fort-collins,johnstown,windsor}-co/` and every kept `/areas/{town}-co/` | The town record passes the gate (`src/lib/town-gate.mjs`) | `/areas/`. For a kept URL, add a line `/areas/{town}-co/  https://www.nocoturf.com/areas/  301` and drop the town from the test's `KEEP`. Once the page publishes, the built file shadows that line, so delete it then |
| `/areas/` | Any town publishes | Nothing launches without it |

## Better targets for wave 2

Each old blog post goes to the closest page in the launch set. When a wave-2 page from the plan ships, repoint the line
in the same commit that publishes the page. Add the new id to the `/guides/` row of `docs/CONTRACTS.md` first, or the
test's planned-route check fails.

| Old post | Launch target | Better wave-2 target (plan: "Wave 2, problem pages") |
|---|---|---|
| `/how-long-does-synthetic-grass-last-a-guide/` | installation service | How long turf lasts in Colorado (UV, hail, snow) |
| `/is-synthetic-grass-hot-in-the-sun-colorado-is-hot/` | installation service | Paw heat and low-E window melt |
| `/what-is-synthetic-grass-made-of/` | installation service | PFAS-free turf (SB24-081, with supplier documents) |
| `/what-is-synthetic-grass/`, `/get-the-best-artificial-grass-in-colorado/` | installation service | Turf vs sod vs xeriscape |
| `/how-to-clean-synthetic-grass-noco-turf-co-dives-in-deep/` | turf repair service | Dog smell and infill |
| `/synthetic-grass-safe-for-dogs/` | pet turf service | Dog smell and infill, only if that page covers safety; otherwise keep pet turf |
| `/can-you-lay-synthetic-grass-on-concrete/` | installation service | Not in the wave-2 list. Write a turf-over-concrete guide only if the question graph shows demand |
| `/where-can-i-buy-synthetic-grass/`, `/where-to-buy-synthetic-grass-the-noco-turf-co-storefront/` | `/turf-supply/` | Final if the store is confirmed |
| `/financing-options` | `/contact/` | A financing section on `/contact/`, if Brian confirms financing is offered |

## Outside this repo: domains, DNS, Search Console

None of this can be done in `_redirects`. It needs Brian (ownership and logins) or Ty (with access).

| Property | State on 2026-09-24 | Action | Who |
|---|---|---|---|
| `nocoturf.com` (apex) | GoDaddy domain forwarding sends `https://nocoturf.com/` back to itself, so it loops. Every apex path returns 404 | At cutover, point the apex at Netlify (Netlify's [external DNS instructions](https://docs.netlify.com/manage/domains/configure-domains/configure-external-dns/)) and turn the GoDaddy forward **off**. The apex→www rules in `netlify.toml` and this map then apply | Ty, with Brian's GoDaddy access |
| DNS records beside the website | Mail is Microsoft 365 (MX). There are SPF TXT records and GoHighLevel CNAMEs (`links.nocoturf.com`, `email.mail.nocoturf.com`) | If the nameservers stay at GoDaddy, change only the apex and `www` records. If DNS moves to Netlify DNS, recreate **every** record first (MX, SPF/TXT, autodiscover, GHL CNAMEs), or mail and forms break | Ty |
| `www.nocoturf.com` → BunnyCDN pull zone `aiva-site-noco-turf-co-s6h537-bii23qse.b-cdn.net` | The pull-zone hostname serves a full 200 mirror of the old site with no noindex | After the `www` CNAME points at Netlify and has propagated, have the vendor (Stone Systems/AIVA, via Brian) delete the pull zone or 301 it to `https://www.nocoturf.com/`. The old HTML was cached for 30 days, so expect a lag | Brian → vendor |
| `nocoturfquote.com` | Registered 2025-08-18. Now a GoDaddy parked `/lander`. Still indexed under an old "Save 10%" title with old contact details | Brian confirms he owns it. Then set a permanent (301, not masked) registrar forward to `https://www.nocoturf.com/contact/`: it was a quote landing page, and `/contact/` holds the estimate form. If he doesn't own it, it can't be fixed. Note it and move on | Brian |
| `nocoturfpros.com` | A GoHighLevel landing page created 2026-06-22. It shows a phone number and an experience claim that are not in the fact base | Brian says who built it (the ads vendor?) and whether it can go. If so, 301 it to `https://www.nocoturf.com/contact/` or take it down. Until then it must at least stop showing the other number | Brian |
| `nocoturf.fordemowebsite.com`, `nocoturf.brayvsites.com` | Old demo/staging copies. DNS doesn't resolve, but they are still in search results | Nothing to redirect. They drop out of the index on their own. If either comes back online, it must 410 or 301 to www | — |
| `links.nocoturf.com`, `email.mail.nocoturf.com` | GoHighLevel form host and email-tracking host | Not website pages. Keep their DNS while GoHighLevel is in use. No redirects | Ty |
| The Netlify site's own `*.netlify.app` host | — | At cutover, check with `curl -sI` that the production `netlify.app` hostname sends visitors to www and does not serve a second indexable copy | Ty |

**When Search Console and Ahrefs are connected** (after the domain change):
1. In Search Console, verify a **Domain property** (DNS TXT at the registrar), so apex and www report together.
2. Pull *Pages › Not found (404)* and *Links › Top linked pages* for the domain, and from Ahrefs *Site Explorer ›
   Best by links* and *Broken backlinks* for `nocoturf.com`. Ahrefs returned "insufficient plan" for backlinks during
   research, so **no legacy URL here is confirmed to have backlinks yet**.
3. Any old URL with impressions or links that is missing from the table: add a line to `_redirects`, add its path to
   the inventory in `tests/redirects.test.mjs`, and add a row here.
4. Submit `/sitemap.xml` plus a temporary legacy-URL sitemap (the old URLs, so Google recrawls them and sees the
   301s), as the plan's cutover step says. Do the same in Bing Webmaster Tools.

## Launch verification

```sh
npm run build && LAUNCH_CHECK=1 node --test tests/redirects.test.mjs

# First deploy preview (before DNS). Replace PREVIEW with the preview host.
curl -sI https://PREVIEW/ | head -1                                              # 200: the forced /index.html line must not loop
curl -sI https://PREVIEW/index.html | grep -iE '^(HTTP|location)'               # 301 → https://www.nocoturf.com/
curl -sI https://PREVIEW/areas/denver-co/ | head -1                              # 410
curl -sI https://PREVIEW/areas/erie-co | grep -iE '^(HTTP|location)'            # 301 → https://www.nocoturf.com/areas/
curl -sI https://PREVIEW/product/torrey/ | grep -iE '^(HTTP|location)'          # 301 → https://www.nocoturf.com/turf-supply/
curl -sI https://PREVIEW/review/ | head -1                                        # 200: no redirect

# After cutover: one hop from the apex and from www
curl -sIL https://nocoturf.com/artificial-grass-installation-windsor-co/ | grep -iE '^(HTTP|location)'
curl -sIL https://www.nocoturf.com/services/specialty-turf-services/putting-green-installation | grep -iE '^(HTTP|location)'
curl -sIL https://nocoturf.com/ | grep -iE '^(HTTP|location)'
```

Each should show one `301` and then `200` (or a single `410`). The plan's aftercare watches 404s from legacy URLs weekly
for eight weeks. Every new one gets a line here.
