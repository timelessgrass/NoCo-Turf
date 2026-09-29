# Publish gates: a location page needs local proof, a guide needs a first-hand element

- Decided by: Ty, 2026-09-28, after a doorway and scaled-content review of all 115 location pages and 109 guides.
  Verdicts: towns borderline, town x service pages a doorway risk as a set, communities borderline, guides
  borderline as scaled content. Nothing was exposed (PRELAUNCH, all drafts); the risk was the gates, which trusted
  what a record says about itself.
- Town page (src/lib/town-gate.mjs), on top of ≥3 substantive blocks, ≥2 own, all sourced:
  - Brian's own word that NoCo works the town. Every town in .site/truth/brief.json `service_areas` is INFERENCE
    (the list was Ty's call, 2026-09-24). To unlock a town, set its `name.status` to CLIENT_CONFIRMED with
    `source` and `source_detail` naming where Brian said it (text, call, date).
  - A src/data/photos.ts photo whose `place` names the town (what the page shows).
  - A job or a review from the town: a published src/content/work record, or a `job` or `review` block.
- Town x service page (src/lib/town-service-gate.mjs): its photo must also be from the town, and it needs a job or
  review of that use there. Community page (src/lib/community-gate.mjs): a job or review block from it.
  Shared rules: src/lib/local-proof.mjs.
- Guide: published only with one of Brian's job photos (`photos`) and only about confirmed services; its
  needsFromBrian list keeps printing after it ships (scripts/check-content.mjs).
- `own`: a block marked own that cites only records another page also cites (another town; another page of the
  same town) is flagged, and fails a published record left with fewer than 2 own blocks.
- Templates: a sentence identical on every location page stays generic; the town name stays in the H1, labels,
  crumbs and next to real local facts.
- Consequence: today no town, town x service, community page or guide can publish. Each unlocks with Brian's
  confirmation, a photo and a job; guides go live in batches as he answers their needsFromBrian lists.

## Amended at launch, 2026-09-29 (Ty)

- Brian confirmed all 17 towns and the 5 services (installation, pet, putting greens, playground, commercial) to Ty;
  brief.json `service_areas` and `services`, and `confirmed` in src/data/services.ts, record it. Turf repair and turf
  supply stay unconfirmed.
- Town pages publish on their research and Brian's word: a local photo and a job are to-dos (check-content lists
  them), not the town gate. The review rated town pages borderline, not doorway, and they keep the old site's
  ranking town URLs. Town × service and community pages keep the photo and job rules.
- Launch set: home, the 5 services, about, contact, work, privacy, terms, /areas/ and the 17 towns, and the 3 guides
  that carry Brian's photos with their topic hubs. Everything else waits for its gate.
- Links to pages that are not live: components drop them (src/lib/live.ts); links inside record text become plain
  text after the build (scripts/unlink-unpublished.mjs). Old URLs whose target isn't live follow docs/REDIRECTS.md
  holds (cost guide, turf repair, the store and 7 old blog posts → the nearest live service page).

## Unblocked with what we have, 2026-09-29 (Ty: "Figure out a way to unblock what blocks them with what you have")

- Guides: a published guide's first-hand part may be one of Brian's job photos or up to two approved Google review
  quotes (`reviews`, src/data/reviews.ts, printed by GuideReviews) that speak to its subject. A 12-agent pass matched
  the 25 photos and 14 quotes to all 106 held guides, and a skeptic per topic removed every weak match; 53 publish.
- Guides the doorway review rated clear on original research (the rules survey, HOA packet, rebates, water data and
  8 local-research guides) publish without either: RESEARCH_CLEARED in scripts/check-content.mjs, a named list.
  Still held: 41 guides with nothing first-hand that honestly fits, the do-people-regret tally (not re-counted), two
  Firestone greens readings (Planning to confirm), and work NoCo hasn't confirmed (rooftops, indoor, used turf).
- Town × service: Windsor putting greens, Berthoud putting greens and Windsor playground turf publish with a job block
  written only from what Brian's own photo from that town shows (no dates or numbers invented).
- Neighborhood pages stay held: no photo is placed inside a neighborhood (GPS was never kept).

## Maximum safe set, 2026-09-29 (Ty: "make as many pages as possible without violating Google's policies")

- Neighborhood pages publish on their own rules research, like town pages; a photo and a job there are to-dos
  (src/lib/community-gate.mjs). 26 of 30 publish. Held: Bella Ridge (no home lots yet), Hawkstone, Harmony Club and
  Mad Russian (no posted rules to quote: a page for a place name with nothing to say is the doorway pattern).
- Guides: first-hand material is a to-do (check-content WARN), not a block; every guide is still sourced and only
  about confirmed services. 102 of 109 publish. Held: rooftops, garage/basement and indoor greens, used turf (work NoCo
  doesn't confirm), the do-people-regret tally (not re-counted), and two Firestone greens readings (Planning to confirm).
- Town × service pages stay held but for the 3 with local jobs: as a 17 × 4 set they are the pattern Google's doorway
  policy names, and their local rules already live on the town pages. Each unlocks with a real job there.

