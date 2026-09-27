# Creative direction — PROVISIONAL

- Decided by: Ty, 2026-09-24 ("start with basically just rebuilding his old site … make the animations, the UX, and
  the UI really sick"). The studio sequence normally waits for strategy sign-off (gate 2) and Brian's own answer to
  "what do you physically touch first?" (gate 5). Ty chose to build first; this record is what re-opens if Brian's
  answer points elsewhere.
- Object: THE LAYOUT LINE — the outline marked on the old lawn, then cut, then set against concrete, rock or steel.
  Confirm with Brian that he (or his crew) paints layouts (Appendix A #13).
- Accent: marking-paint orange #FF5A1F (one accent). Ground: crusher fines #EFEBE2 / #E6E0D4. Slab: wet base #13120F.
  Green comes only from photographs.
- Type: Archivo (variable width + weight) for display and plan annotations; Public Sans for reading.
  Neither is used by any other studio site (TIMELESS Newsreader/Instrument Sans, Restoration Poppins, KCS Barlow/Plex,
  AZ Inter Tight/Inter, Murphy Montserrat/Open Sans).
- Motion: one curve cubic-bezier(0.32, 0.72, 0, 1); CSS scroll-driven, static by default; signature moments: painted
  underline (spray sweep), The Build cross-section (pinned, layers laid by scroll), The Route (map routes on hover),
  contact-sheet reel + view-transition lightbox, crew clip (plays only on screen), hero settle + scroll sink.
- Photos: Brian's own camera originals in NoCo territory (src/data/photos.ts) — pending brand assignment before launch.
- Re-open trigger: Brian names a different object, or the portfolio sameness check flags convergence.

## Amendment — 2026-09-27 (Ty): Brian's logo and its green

- The site uses Brian's own logo (nocoturf.com `/images/logo.png`): black diamond line work, gold "NoCo TURF CO."
  lettering, a green grass tuft. Trimmed and resized into `src/assets/brand/logo.png` (line work in ink, for light
  ground) and `logo-light.png` (line work in bone, for the slab and over the home photo). At header size the
  lettering is unreadable, so the header sets the name in type beside the badge.
- The accent changes from marking-paint orange to the logo's grass green, `#47960D` (the mean of the grass pixels).
  Ink on it is 5.0:1; as a mark on the light ground it is 3.1:1. Same rule as before: never small text on the light
  ground. The logo's gold stays in the logo.
- Favicon and touch icons: the grass tuft inside the logo's diamond, on the slab (`public/favicon-32.png`,
  `apple-touch-icon.png`, `icon-512.png`).
