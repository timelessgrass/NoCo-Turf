/**
 * Proof from Google, in one place: the rating (text beside a live link, never markup, never a count) and a few
 * short verbatim quotes, each signed first name + last initial and linked to the listing. Approved by Ty on
 * 2026-09-28 (.site/truth/claims.json). Quotes were read from the Google-source reviews Birdeye mirrors; trims are
 * marked with an ellipsis. Re-read the rating before launch and whenever it could have moved.
 */
import { socialProfiles } from './brief';

export const GOOGLE_URL = socialProfiles.find((p) => p.network === 'Google Business Profile')?.url ?? null;
export const GOOGLE_RATING = '4.7';
export const RATING_CHECKED = '2026-09-28';

export interface Quote { text: string; name: string; job: string }

export const QUOTES: Quote[] = [
  { text: 'I had three estimates and NoCo turf was a couple thousand dollars less than the other two! The yard came out looking beautiful!', name: 'Johnny G.', job: 'Backyard lawn' },
  { text: 'Brian was personable and fairly priced… The NoCo team was thorough and completed our project in 1 day! (750sqft).', name: 'Mike T.', job: 'Backyard lawn' },
  { text: 'Our new and improved dog run is beyond what I had hoped for. So grateful for timely bid and quick completion.', name: 'Sharon Y.', job: 'Dog run' },
  { text: 'Brian and his crew at NoCo Turf showed up with smiles, worked their butt off, and made my dream backyard a reality!!', name: 'Marissa G.', job: 'Backyard' },
];
