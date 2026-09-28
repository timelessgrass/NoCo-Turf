/**
 * Proof from Google, in one place: the rating (text beside a live link, never markup, never a count) and short
 * verbatim quotes, each signed first name + last initial and linked to the listing. Approved by Ty on 2026-09-28
 * (.site/truth/claims.json). Quotes were read from the listing's Google reviews on 2026-09-28 (the full set is in the
 * gitignored archive/gbp-2026-09-28/reviews.json); trims are marked with an ellipsis. Re-read the rating before
 * launch and whenever it could have moved.
 */
import { socialProfiles } from './brief';

export const GOOGLE_URL = socialProfiles.find((p) => p.network === 'Google Business Profile')?.url ?? null;
export const GOOGLE_RATING = '4.7';
export const RATING_CHECKED = '2026-09-28';

export interface Quote { text: string; name: string; job: string }

export const QUOTES: Record<string, Quote> = {
  johnny: { text: 'I had three estimates and NoCo turf was a couple thousand dollars less than the other two! The yard came out looking beautiful!', name: 'Johnny G.', job: 'Backyard lawn' },
  mike: { text: 'Brian was personable and fairly priced… The NoCo team was thorough and completed our project in 1 day! (750sqft).', name: 'Mike T.', job: 'Backyard lawn' },
  sharon: { text: 'Our new and improved dog run is beyond what I had hoped for. So grateful for timely bid and quick completion.', name: 'Sharon Y.', job: 'Dog run' },
  marissa: { text: 'Brian and his crew at NoCo Turf showed up with smiles, worked their butt off, and made my dream backyard a reality!!', name: 'Marissa G.', job: 'Backyard' },
  tim: { text: 'Brian was super responsive and nice. He came over for an estimate the same day I reached out and had the turf installed a few days later.', name: 'Tim M.', job: 'Backyard lawn' },
  michele: { text: 'My backyard turf project from bid to completion was one week! Brian was responsive and thorough.', name: 'Michele M.', job: 'Backyard lawn' },
  lanelle: { text: 'They were meticulous in every aspect from cutting around flagstone, laying and securing the artificial turf! My backyard looks amazing!', name: 'Lanelle M.', job: 'Backyard lawn' },
  tamara: { text: 'NoCo Turf installed our putting green in our back yard. It was everything we wanted and more. We even had a friend who golfs all the time come over during the build to make suggestions and the team implemented them!', name: 'Tamara V.', job: 'Putting green' },
  corbin: { text: 'They were very fair on price and finished the job in one day. The golf green looks amazing…', name: 'Corbin C.', job: 'Putting green' },
  kevin: { text: 'They use premium products that feel and look real and hold up to 2 golden retrievers and our English bulldog. The putting green is challenging and perfect to practice in between tee times.', name: 'Kevin A.', job: 'Dog yard and putting green' },
  ally: { text: 'Brian gave us samples to look at and offered great recommendations based on our yard size and the fact that we have 2 Golden Retrievers.', name: 'Ally P.', job: 'Dog yard' },
  kirk: { text: 'Our yard was nothing but dust and mud… he came out to the house and came up with a plan and recommended a pet turf that could stand up to the dogs.', name: 'Kirk R.', job: 'Pet turf' },
  lane: { text: 'Brian is very helpful in developing an understanding of the product and process… we felt comfortable that we knew what we were getting.', name: 'Lane V.', job: 'Backyard' },
  melissa: { text: 'The crew was absolutely amazing, even when my curious kiddos were occasionally interrupting, the crew was kind and answered all thousand of their questions!', name: 'Melissa B.', job: 'Backyard' },
};

/** Which three quotes each page leads with. */
export const PICKS: Record<string, string[]> = {
  home: ['johnny', 'mike', 'marissa'],
  about: ['lane', 'tim', 'marissa'],
  'artificial-turf-installation': ['tim', 'lanelle', 'michele'],
  'pet-turf': ['sharon', 'kirk', 'ally'],
  'putting-greens': ['tamara', 'corbin', 'kevin'],
  'playground-turf': ['melissa', 'johnny', 'tim'],
  'commercial-turf': ['lane', 'michele', 'mike'],
};
