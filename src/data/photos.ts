/**
 * Photographs — camera originals from Brian's own jobs only (several phones: iPhone 16, 15 Pro Max, 13, 11 Pro Max —
 * never say "Brian's phone"). Nothing stock, nothing AI (all 53 images on the old
 * nocoturf.com were AI-generated and are banned — .site/truth/proof.json photo_banned).
 *
 * PREVIEW STATUS (2026-09-24): every file below is a real job of Brian's whose original EXIF places it in
 * NoCo territory (nearest town only; GPS was never copied — these are the EXIF-free cuts). They ALSO appear on
 * the sister brand's site today. Before launch Brian assigns each job to ONE brand (proof.json
 * photo_candidates) — a photo he gives to TIMELESS comes out of this file, and a job NoCo keeps comes off
 * TIMELESS. Captions name a material, a place or a step — never a quality. Alt text is written separately
 * and names the town.
 */
import firePit from '../assets/photos/putting-green-fire-pit-berthoud.jpg';
import dusk from '../assets/photos/putting-green-dusk-windsor.jpg';
import boulders from '../assets/photos/putting-green-boulders-windsor.jpg';
import streetView from '../assets/photos/putting-green-street-view-windsor.jpg';
import driveway from '../assets/photos/putting-green-driveway-view-windsor.jpg';
import fencedYard from '../assets/photos/lawn-fenced-yard-windsor.jpg';
import playset from '../assets/photos/lawn-playset-curb-windsor.jpg';
import sideYard from '../assets/photos/side-yard-concrete-edge-greeley.jpg';
import rockBorder from '../assets/photos/lawn-rock-border-berthoud.jpg';
import crew from '../assets/photos/crew-power-broom-mead.jpg';

export type Photo = {
  id: string;
  src: ImageMetadata;
  /** Record line: what, where, when — the benchmark's "photo with a record". */
  caption: string;
  place: string;
  /** YYYY-MM from the camera original; absent when the file carries no date (never guessed). */
  month?: string;
  alt: string;
  /** What the job is. A town × service page's photo must carry its service's use (src/lib/town-service-gate.mjs):
   *  putting-green, pet, play, commercial. No photo is `commercial` yet — it waits for Brian's own commercial job. */
  use: 'putting-green' | 'lawn' | 'pet' | 'play' | 'commercial' | 'detail' | 'crew';
  /** Optional: the community page this job belongs to, as its id "{town-slug}--{community-slug}"
   *  (src/content/communities/). Set only when Brian's ledger places the job inside that community; the community
   *  gate (src/lib/community-gate.mjs) also accepts a photo whose `place` names the community or its town. */
  community?: string;
  /** camera original in Brian's upload (provenance ledger) */
  original: string;
  /** focal point for object-position, e.g. '50% 60%' */
  focus?: string;
};

export const PHOTOS: Photo[] = [
  { id: 'fire-pit', src: firePit, caption: 'Putting green, stone fire pit and seat wall', place: 'west of Berthoud', month: '2024-04',
    alt: 'A backyard putting green with blue flags beside a stone fire pit and lit seat wall, the Front Range on the horizon, near Berthoud, Colorado',
    use: 'putting-green', original: 'IMG_7727.HEIC', focus: '50% 55%' },
  { id: 'dusk', src: dusk, caption: 'Putting green under landscape lights, flagstone above', place: 'west of Windsor', month: '2025-09',
    alt: 'A putting green at dusk with checkered flags, boulders lit by landscape lights and a flagstone patio, near Windsor, Colorado',
    use: 'putting-green', original: 'IMG_0934.heic', focus: '50% 45%' },
  { id: 'boulders', src: boulders, caption: 'Putting green set into boulders and planting beds', place: 'south of Windsor', month: '2025-08',
    alt: 'A backyard putting green ringed by boulders, evergreens and river rock, with flags in three cups, near Windsor, Colorado',
    use: 'putting-green', original: 'IMG_0834.HEIC', focus: '55% 60%' },
  { id: 'street-view', src: streetView, caption: 'The same green from the street', place: 'south of Windsor', month: '2025-08',
    alt: 'The putting green seen from the street, curving between the lawn, boulders and a concrete path, near Windsor, Colorado',
    use: 'putting-green', original: 'IMG_0835.HEIC', focus: '50% 70%' },
  { id: 'driveway', src: driveway, caption: 'Fringe meeting the concrete', place: 'south of Windsor', month: '2025-08',
    alt: 'The putting green from the driveway side, fringe turf meeting the concrete edge, near Windsor, Colorado',
    use: 'detail', original: 'IMG_0841.HEIC' },
  { id: 'fenced-yard', src: fencedYard, caption: 'Back lawn inside the fence, river-rock border', place: 'south of Windsor', month: '2025-08',
    alt: 'An artificial turf back lawn inside a black iron fence with a river-rock border, open space beyond, near Windsor, Colorado',
    use: 'lawn', original: 'IMG_3710.HEIC', focus: '50% 70%' },
  { id: 'playset', src: playset, caption: 'Play lawn behind a poured curb, playset on the rise', place: 'south of Windsor', month: '2025-08',
    alt: 'A curving artificial turf lawn edged by a concrete curb, with a wooden playset and river rock, near Windsor, Colorado',
    use: 'play', original: 'IMG_0794.HEIC', focus: '45% 65%' },
  { id: 'side-yard', src: sideYard, caption: 'Side-yard run against the walk', place: 'west Greeley', month: '2025-08',
    alt: 'A strip of artificial turf running down a side yard between a white gate and a concrete walk, in west Greeley, Colorado',
    use: 'lawn', original: 'IMG_0769.HEIC', focus: '45% 55%' },
  { id: 'rock-border', src: rockBorder, caption: 'Lawn edge against a river-rock bed', place: 'west of Berthoud', month: '2025-09',
    alt: 'A new artificial turf lawn edged with river rock below a two-story house and boulder wall, near Berthoud, Colorado',
    use: 'detail', original: 'IMG_4117.HEIC', focus: '50% 40%' },
  { id: 'crew', src: crew, caption: 'Power-brooming a newly laid lawn', place: 'Mead–Firestone area',
    alt: 'A crew member in a straw hat pushing a power broom across a newly installed artificial lawn, Mead–Firestone area, Colorado',
    use: 'crew', original: 'IMG_1882.MOV (frame at 6.2 s)', focus: '60% 40%' },
];

export const photo = (id: string): Photo => {
  const p = PHOTOS.find((x) => x.id === id);
  if (!p) throw new Error(`No photo "${id}" in src/data/photos.ts`);
  return p;
};

/** Human month from YYYY-MM. */
export const monthLabel = (m: string) =>
  new Date(`${m}-15T12:00:00Z`).toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });
