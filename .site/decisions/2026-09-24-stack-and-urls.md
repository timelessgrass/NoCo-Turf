# Stack, hosting, lead path, URL scheme

- Astro 7 static on Netlify (Brian's account), repo timelessgrass/NoCo-Turf. Decided by Ty, 2026-09-24.
- Canonical host https://www.nocoturf.com with trailing slashes. Apex → www in one hop (netlify.toml).
- Town URLs stay /areas/{town}-co/ (existing ranking URLs). Because preflight.py only runs its town-tier checks
  under /locations/ or /service-areas/, run `check-uniqueness.py dist/areas` and `score.py audit dist/areas --no-log`
  as explicit extra gates.
- Lead path mirrors TIMELESS: native form → /.netlify/functions/lead (not /api/*, which fails preflight LEAD-1)
  → Make webhook (NOCO_LEAD_WEBHOOK env) → Brian's inbox + TTM portal. No GoHighLevel iframe, no chat widget.
- Analytics: Plausible (data-cta consumer). No call tracking.
- PRELAUNCH flag (src/data/site.ts) + X-Robots-Tag in netlify.toml; Netlify visitor access control is also on.
