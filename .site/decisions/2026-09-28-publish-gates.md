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
