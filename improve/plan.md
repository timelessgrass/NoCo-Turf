# NoCo Turf: improve plan, 2026-09-28

**Level 2, medium changes: "Same layout, clearly better."** It applies to every page (254). Branch `improve/2026-09-28`.

## Keep exactly
- Brian's logo and the green (#47960D, text green #2a6e0a).
- His real job photos (the 10 camera originals).
- The pop-up estimate wizard: its steps, field names and the lead endpoint.
- Every URL, every H1's meaning, the page structure and section order, the JSON-LD, and the NAP.

## Goals (Ty)
- Look more premium.
- More quote requests.
- One-tap calling.
- Stronger SEO and AEO.
- Main pain: "too AI". The copy talks in the third person, and some sections don't make sense.

## Audit baseline (local production build)
- Lighthouse, phone: performance 90, accessibility 96, best practices 100.
- SEO 69, but that is only the prelaunch `noindex`, which is deliberate until launch.
- Home LCP 3.4 s.
- Tap targets under 44 px, the plan's own floor:
  - header call icon: 36 px wide
  - FAQ "read more" links: 19 px tall
  - footer links: 36 px tall
  - corridor-map town names on a phone: about 9 px
- Template tells: 13 uppercase eyebrow labels on the home page. The "radial glow" the audit flagged is really dotted textures, so it's a false positive.
- Grey placeholder tiles stand in for pet turf and commercial turf, which have no job photo.

## Changes

### 1. Voice: first person, plain, human (every template and data file)
Change the copy from "NoCo Turf Co. does X / Brian has…" to "we", and on the owner sections Brian's own "I".
- Cut the AI patterns:
  - the "X, not Y" construction
  - slogan payoffs ("built right.", "that stay put.")
  - label-then-heading on every section
  - colon-stacked headings
  - em dashes in new copy
- Facts stay exactly as they are. Only the phrasing changes.

| Where | Before | After |
|---|---|---|
| Home H1 | Turf and putting greens, built right. | Artificial turf and putting greens for Northern Colorado. |
| Home lede | Custom lawns, backyard putting greens and dog-friendly yards … designed around your yard, your HOA's rules and the clay underneath. | We build turf lawns, backyard putting greens and dog runs from Wellington to Longmont. No more mowing, watering or mud. |
| Home owner section | Owner-led, start to finish. Brian Richmond has been installing … He started … | You'll work with me. "I'm Brian. I've been installing artificial turf for 13 years, and I started NoCo Turf Co. in Windsor in 2024 …" |
| Short answers (115 pages) | "…NoCo Turf Co. installs artificial turf in Windsor, Colorado." | "At NoCo Turf Co., we install artificial turf in Windsor." (It still names the business, for AEO.) |
| Trust strip | Local / Rules first / Built underneath / In writing | 4.7 on Google (67 reviews, linked) / Based in Windsor / We check your town and HOA rules / Your plan and price in writing |
| Service decide | Is it right for you? Who … suits, and when to think twice. / Living with it / What moves the price. | Is turf right for your yard? / What life with turf is like / What affects the price |
| Town pages | Good to know: Turf in Windsor: what you need to know first. | Before you start in Windsor |

- **Files:** src/pages/index.astro, about.astro, work.astro, contact.astro, thanks.astro, services/*, areas/*, guides/* (chrome only); src/components/Sell*.astro, CtaBand, BuildSection, AnswerBox, SiteFooter, TownJobs, TownNearby, TownCommunities, ServiceByTown, EstimateForm (visible text only); src/data/town-sell.ts, service-sell.ts, community-sell.ts, services.ts.

### 2. Proof (true and linked)
- **Google rating:** "4.7 on Google · 67 reviews" goes in the trust strip, linked to the listing.
  - The source is Birdeye's Google tab on 2026-09-28: 60 five-star, 1 four, 1 three, 2 two and 3 one-star, which works out to 4.7.
  - No star or aggregateRating markup (Google doesn't show self-serving review stars, and the plan bans them).
- **Review quotes:** 3 or 4 short verbatim quotes from Google, each signed first name plus last initial and linked. They go on the home work section, the service pages and the About page.
  - Johnny G.: "I had three estimates and NoCo turf was a couple thousand dollars less than the other two! The yard came out looking beautiful!"
  - Mike T.: "Brian was personable and fairly priced… The NoCo team was thorough and completed our project in 1 day! (750sqft)."
  - Sharon Y.: "Our new and improved dog run is beyond what I had hoped for. So grateful for timely bid and quick completion."
  - Marissa G.: "Brian and his crew at NoCo Turf showed up with smiles, worked their butt off, and made my dream backyard a reality!!"
- **13 years installing:** Brian stated it himself; it stays.
- **New file:** src/data/reviews.ts, one source for the rating, the date and the quotes.

### 3. One-tap calling
- **Phone header:** the 36 px icon becomes a 44 px "Call" pill (icon plus the word).
- **Hero call buttons:** full width on phones.
- **Bottom bar:** the Call button gets bigger.
- **Short-answer boxes:** the phone number becomes a call button.

### 4. Tap targets (WCAG 2.5.8 and the plan's 44 px floor)
- FAQ links and footer links get a 44 px minimum.
- The corridor map's town names stop being links on phones, because the grouped list underneath already links every town.

### 5. Premium finish (same structure)
- **Fewer eyebrow labels:** the home page goes from 13 to about 4. A label stays only where it adds meaning.
- **Section rhythm:**
  - alternate the ground, the ground-2 tint and the dark slab
  - more space between sections
  - larger photos in the services list and the work reel
- **Type:** a tighter H2 scale with more contrast between headings and body, and body line length capped around 60 characters.
- **Buttons:** one primary style (the green) and one secondary (the outline), applied the same way everywhere.
- **Town-page hero captions:** hidden when the photo wasn't taken in that town. No more "Near Berthoud" on the Greeley page.

### 6. Pictures where Brian has no job photo (Higgsfield, gpt_image_2_5)
- **About 6 images, about 1.5 credits in total** (0.25 each; the balance is 1,099):
  - a pet-turf dog run (2)
  - an HOA common area with a play area (1)
  - a park or small sports field (1)
  - a dog park or daycare yard (1)
  - one spare
- **Where they go:**
  - the pet-turf and commercial service tiles and heroes
  - the commercial town-service heroes, replacing the putting-green photo those pages use now
- **Rules:**
  - no caption, no town and no date
  - never in "Recent work", "Yards we've built" or the job galleries
  - never counted by the town, community or service photo gates
  - they live in src/data/scenes.ts, separate from photos.ts
  - no AI label

### 7. Speed
- Home LCP target ≤ 2.5 s:
  - a mobile-sized hero source
  - preload of the hero image
  - check that fonts don't block the first paint
- Keep performance at 90 or better.

### 8. SEO / AEO
- Titles and H1s keep their keywords. The H1 above adds "Northern Colorado", which is the main local term.
- Short answers keep naming the business.
- The FAQ schema keeps matching the visible FAQ.
- No review markup.

## Won't change
- The wizard's fields, the endpoint or the lead function.
- URLs, JSON-LD, the section order and the page structure.
- Brian's logo, the green, and his real photos.
- Any fact, number or rule on the town and guide pages. Guide article bodies are out of scope, apart from the short answers.

## Risks
- **The content checker:** it bans "best", "second to none" and some superlatives. Review quotes get trimmed with an ellipsis, and the meaning stays intact.
- **Brian's sign-off:** the review quotes and "plan and price in writing" still need it (Ty approved the quotes).
- **Generated pictures:** they're only used where a buyer won't read them as proof of a specific job.
- **Checks:** every change runs through `npm run build`, 227 unit tests, the phone-width check at 375 px, and compare.mjs against improve/audit.
