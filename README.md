# NoCo Turf Co — nocoturf.com

Rebuild of nocoturf.com (artificial turf, Northern Colorado) by To The Max Media.
Astro static build on Netlify; content ships in the raw HTML.

## State: PRELAUNCH

The repo currently deploys a `noindex` holding page from `public/` with no build
step. `netlify.toml` sends `X-Robots-Tag: noindex` on every path and
`public/robots.txt` disallows everything. Both come off at launch.

The live nocoturf.com is still the old site on BunnyCDN. **Do not attach the
nocoturf.com domain in Netlify until launch** — DNS moves then, with the 301 map.

## Connect Netlify

1. Netlify → Add new site → Import an existing project → GitHub →
   `timelessgrass/NoCo-Turf`.
2. Branch to deploy: `main`. Build settings come from `netlify.toml` — leave the
   UI fields empty.
3. Deploy. The result is a `*.netlify.app` URL showing the holding page.
4. Leave the custom domain unset.

## Pushing costs build minutes

Once Netlify is connected, every push to `main` triggers a build on Brian's
account. Commit locally; push only on an explicit "push" / "deploy" / "ship".
