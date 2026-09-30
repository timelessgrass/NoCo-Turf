# Territory: north/south split with TIMELESS Grass & Greens

- Decided by: Ty, 2026-09-24 (session with Claude; plan at ~/.claude/plans/https-www-nocoturf-com-i-want-to-bubbly-cherny.md)
- NoCo Turf Co.: Larimer + Weld + Longmont, Mead, Firestone, Frederick, Dacono. Town list: src/data/territory.mjs.
- TIMELESS (timelessgrass.com): Denver metro incl. Erie, Brighton, Thornton, Broomfield.
- Erie was first given to NoCo, then reversed the same day on evidence: Brian named Erie and Brighton as TIMELESS's
  northern edge on the 2026-09-04 call (00:31:12–00:31:23); TIMELESS has a live self-canonical /denver-metro/erie-co/;
  its lead router (netlify/functions/lib/lead-routing.mjs in the TIMELESS repo) sends ZIP 80516 to TIMELESS and
  Longmont/Dacono/Firestone/Frederick/Mead and north to NoCo.
- Unassigned, Brian decides: Fort Lupton, Niwot.
- Consequence: NoCo's /areas/{erie,brighton,thornton,broomfield}-co/ 301 → /areas/ (boundary note routes Denver-metro
  visitors to TIMELESS); 6 ghost Denver-metro pages → 410; NoCo copy never names a TIMELESS town as served.
- Why: same-owner, two-domain coverage of the same towns is the multi-domain doorway pattern (site skill NEVER #11).

## Amendment, 2026-09-30: Estes Park added

Ty, relaying Brian: "He wants to do Estes Park." Estes Park moves from EXCLUDED_TOWNS to NOCO_TOWNS (region
loveland-berthoud, now labelled "Loveland, Berthoud & Estes Park"; tier lean). Its ZIPs 80517 and 80511 route to NoCo.
The page publishes on its own research (both Town codes silent on turf, the Water Division's mapped edge and
household-use wells, NOAA Estes Park 3 SSE normals, NRCS soils over shallow bedrock, the 2020 vacancy count) and
Brian's word; a job and a photo there are still to-dos. The corridor map marks it on the western edge at its true
latitude rather than widening the map.
