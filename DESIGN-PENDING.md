# Design is pending — on purpose

There is no design system yet. The studio sequence is: strategy approved (gate 2) → creative direction
approved (gates 3–5) → design system + homepage approved (gate 6) → then every other page.

Creative direction needs two things only Brian can give:
1. His answer to "When you walk up to a new job, what's the first thing you physically touch or do?" —
   the physical object every colour, type and motion decision descends from.
2. His own job photographs (camera originals) — the proof inventory: 5 finished · 3 same-angle before/after
   sets · 2 crew at work · 2 detail · 2 context. All 53 images on the old site are AI-generated.

Until then `src/layouts/Base.astro` carries structural styles only. The plan (~/.claude/plans/…bubbly-cherny.md,
Phase 3–4) holds the direction candidates, the avoid-list (TIMELESS, Restoration, Murphy's, AZ, KCS), the motion
system (one curve: cubic-bezier(0.32, 0.72, 0, 1)) and the budgets (LCP ≤ 2.0 s, INP ≤ 200 ms, CLS ≤ 0.05).
