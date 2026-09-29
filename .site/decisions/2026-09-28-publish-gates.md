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
  holds (cost guide, turf repair, the store and 6 old blog posts → the nearest live service page).

