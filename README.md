# NoCo Turf Co. — nocoturf.com

Rebuild of nocoturf.com (artificial turf, Northern Colorado) by To The Max Media. Astro 7 static site on
Netlify; every page ships its content in the raw HTML so search engines and answer engines can read it.

## State: PRELAUNCH — foundation built, design pending

- `src/data/site.ts` has `PRELAUNCH = true`: every page is `noindex, nofollow`, robots.txt disallows all, the
  sitemap is empty. `netlify.toml` also sends `X-Robots-Tag: noindex, nofollow`, and the Netlify site has visitor
  access control on. At launch all three come off together (tests/prelaunch.test.mjs keeps the first two in step).
- The live nocoturf.com is still the old vendor site on BunnyCDN. **Do not attach nocoturf.com in Netlify until
  launch** — DNS moves then, together with the 301 map in `public/_redirects`.
- There is no design yet, on purpose: see `DESIGN-PENDING.md`. Creative direction waits for Brian's answer to
  "what do you physically touch first on a job?" and his own job photos.

## Run

```sh
npm ci
npm run dev -- --host 127.0.0.1
npm run build      # prebuild checks → astro build → dist checks
npm test           # astro check + node:test suites
```

Node 24 (matches netlify.toml).

## Where things live

| What | Where |
|---|---|
| The rules every part of the build agrees on | `docs/CONTRACTS.md` |
| Decisions and why (territory, phone, stack, URLs) | `.site/decisions/` |
| Business facts — the only source of anything the site says about NoCo | `.site/truth/brief.json` → `src/data/brief.ts` |
| Claims register (approved: false → cannot appear in copy) | `.site/truth/claims.json` |
| Photo/review proof inventory | `.site/truth/proof.json` |
| Where NoCo works, where TIMELESS works | `src/data/territory.mjs` |
| Services (each unconfirmed until Brian confirms) | `src/data/services.ts` |
| Shared facts by layer: state law, city codes, water providers, rebates, drought, climate, soil | `src/data/layers/*.json` |
| Town page drafts | `src/content/towns/*.json` |
| Guides (rules, rebates, HOA, water savings, cost) | `src/content/guides/*.md` |
| Case studies (from Brian's job ledger) | `src/content/work/*.json` |
| The town publication gate (3+ blocks, 2+ town-specific, a real photo) | `src/lib/town-gate.mjs` |
| Old URL → new URL map (current site, 2024 WordPress, GoDaddy builder) | `public/_redirects`, `docs/REDIRECTS.md` |
| Lead form endpoint → Make → Brian's inbox + TTM portal | `netlify/functions/lead.mjs` (env `NOCO_LEAD_WEBHOOK`) |
| Research and strategy (local only while the repo is public) | `.site/research/`, `.site/strategy/`, `archive/` |

## Pushing costs build minutes

Netlify builds on every push to `main`, on Brian's account. Commit locally; push only on Ty's explicit
"push" / "deploy" / "ship".

## Before launch (gates 10–12 — see the plan's Phase 6)

- TIMELESS Grand Strand moves off 720-630-0108 (its pages and its GBP); NoCo's GBP phone becomes 720-630-0108.
- GBP address model decided (storefront vs service-area); NAP byte-identical across GBP, site, JSON-LD, listings.
- A live test lead reaches Brian's inbox, the portal and the notification — confirmed by Brian.
- `PRELAUNCH = false` + delete the X-Robots-Tag line; Netlify access control scoped to non-production.
- DNS → Netlify; `curl -sIL https://nocoturf.com/` shows one hop to www; the redirect map is live.
