/**
 * Photographs — Brian's own jobs only: camera originals (several phones: iPhone 16, 15 Pro Max, 13, 11 Pro Max —
 * never say "Brian's phone"), plus the photos he uploaded himself to the NoCo Turf Co. Google listing (the gbp-* ids;
 * no place on those, so they never represent a town). Nothing stock, nothing AI (all 53 images on the old
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
import gbpGreenFlag from '../assets/photos/gbp-putting-green-flag-fringe.jpg';
import gbpGreenBunker from '../assets/photos/gbp-putting-green-sand-bunker.jpg';
import gbpGreenLake from '../assets/photos/gbp-putting-green-lakeside.jpg';
import gbpChippingPath from '../assets/photos/gbp-chipping-green-flagstone-path.jpg';
import gbpGreenContours from '../assets/photos/gbp-putting-green-contours.jpg';
import gbpLawnGreen from '../assets/photos/gbp-lawn-built-in-putting-green.jpg';
import gbpHotTub from '../assets/photos/gbp-lawn-hot-tub-shade-tree.jpg';
import gbpNewPatio from '../assets/photos/gbp-lawn-new-patio.jpg';
import gbpSideWalk from '../assets/photos/gbp-side-lawn-patio-walk.jpg';
import gbpCurvedBorder from '../assets/photos/gbp-lawn-curved-concrete-border.jpg';
import gbpSidePatio from '../assets/photos/gbp-side-yard-lawn-patio.jpg';
import gbpCurvedCurb from '../assets/photos/gbp-lawn-curved-curb.jpg';
import gbpWinding from '../assets/photos/gbp-lawn-winding-install.jpg';
import gbpBackyard from '../assets/photos/gbp-backyard-lawn-house.jpg';
import gbpDogYard from '../assets/photos/gbp-dog-yard-two-dogs.jpg';

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
  { id: 'fire-pit', src: firePit, caption: 'Putting green with a stone fire pit and seat wall', place: 'Near Berthoud', month: '2024-04',
    alt: 'A backyard putting green with blue flags beside a stone fire pit and lit seat wall, the Front Range on the horizon, near Berthoud, Colorado',
    use: 'putting-green', original: 'IMG_7727.HEIC', focus: '50% 55%' },
  { id: 'dusk', src: dusk, caption: 'Putting green with landscape lighting', place: 'Near Windsor', month: '2025-09',
    alt: 'A putting green at dusk with checkered flags, boulders lit by landscape lights and a flagstone patio, near Windsor, Colorado',
    use: 'putting-green', original: 'IMG_0934.heic', focus: '50% 45%' },
  { id: 'boulders', src: boulders, caption: 'Putting green set among boulders and plantings', place: 'Near Windsor', month: '2025-08',
    alt: 'A backyard putting green ringed by boulders, evergreens and river rock, with flags in three cups, near Windsor, Colorado',
    use: 'putting-green', original: 'IMG_0834.HEIC', focus: '55% 60%' },
  { id: 'street-view', src: streetView, caption: 'The same putting green from the street', place: 'Near Windsor', month: '2025-08',
    alt: 'The putting green seen from the street, curving between the lawn, boulders and a concrete path, near Windsor, Colorado',
    use: 'putting-green', original: 'IMG_0835.HEIC', focus: '50% 70%' },
  { id: 'driveway', src: driveway, caption: 'Putting green edge along the driveway', place: 'Near Windsor', month: '2025-08',
    alt: 'The putting green from the driveway side, fringe turf meeting the concrete edge, near Windsor, Colorado',
    use: 'detail', original: 'IMG_0841.HEIC' },
  { id: 'fenced-yard', src: fencedYard, caption: 'Backyard lawn with a river-rock border', place: 'Near Windsor', month: '2025-08',
    alt: 'An artificial turf back lawn inside a black iron fence with a river-rock border, open space beyond, near Windsor, Colorado',
    use: 'lawn', original: 'IMG_3710.HEIC', focus: '50% 70%' },
  { id: 'playset', src: playset, caption: 'Turf lawn with a play set', place: 'Near Windsor', month: '2025-08',
    alt: 'A curving artificial turf lawn edged by a concrete curb, with a wooden playset and river rock, near Windsor, Colorado',
    use: 'play', original: 'IMG_0794.HEIC', focus: '45% 65%' },
  { id: 'side-yard', src: sideYard, caption: 'Side-yard turf along the walkway', place: 'Near Greeley', month: '2025-08',
    alt: 'A strip of artificial turf running down a side yard between a white gate and a concrete walk, in west Greeley, Colorado',
    use: 'lawn', original: 'IMG_0769.HEIC', focus: '45% 55%' },
  { id: 'rock-border', src: rockBorder, caption: 'Turf lawn edged with river rock', place: 'Near Berthoud', month: '2025-09',
    alt: 'A new artificial turf lawn edged with river rock below a two-story house and boulder wall, near Berthoud, Colorado',
    use: 'detail', original: 'IMG_4117.HEIC', focus: '50% 40%' },
  { id: 'crew', src: crew, caption: 'Brushing in a new lawn', place: 'Near Mead and Firestone',
    alt: 'A crew member in a straw hat pushing a power broom across a newly installed artificial lawn, Mead–Firestone area, Colorado',
    use: 'crew', original: 'IMG_1882.MOV (frame at 6.2 s)', focus: '60% 40%' },
  /* Brian's own uploads to the NoCo Turf Co. Google Business Profile (By owner), downloaded 2026-09-28 at full size,
     rotated and stripped of all metadata. Google keeps no location on them, so `place` is empty: they never stand in
     for a town, and captions show no place. Brand assignment (NoCo vs TIMELESS) is pending with the rest. */
  { id: 'gbp-green-flag', src: gbpGreenFlag, caption: 'Putting green with fringe and a flagged cup', place: '', month: '2026-06',
    alt: 'A backyard putting green with a checkered flag, a fringe collar and planting beds around it',
    use: 'putting-green', original: 'GBP owner upload (archive/gbp-2026-09-28/owner-photos/owner-03.jpg)', focus: '45% 55%' },
  { id: 'gbp-green-bunker', src: gbpGreenBunker, caption: 'Putting green with a sand bunker and river rock', place: '', month: '2025-04',
    alt: 'A backyard putting green with a sand bunker, river rock beds and a flagstone path, open plains beyond',
    use: 'putting-green', original: 'GBP owner upload (owner-06.jpg)' },
  { id: 'gbp-green-lake', src: gbpGreenLake, caption: 'Lakeside putting green', place: '', month: '2026-05',
    alt: 'A putting green on a lakeside lot behind a timber fence, with a pine tree and the water beyond',
    use: 'putting-green', original: 'GBP owner upload (owner-12.jpg)', focus: '50% 60%' },
  { id: 'gbp-chipping-path', src: gbpChippingPath, caption: 'Chipping green beside a flagstone path', place: '', month: '2025-04',
    alt: 'A small chipping green beside a flagstone path and a stone bench, with a larger green behind',
    use: 'putting-green', original: 'GBP owner upload (owner-13.jpg)' },
  { id: 'gbp-green-contours', src: gbpGreenContours, caption: 'Putting green with built-in contours', place: '',
    alt: 'A backyard putting green shaped with a raised contour and three flags, a split-rail fence and plains beyond',
    use: 'putting-green', original: 'GBP owner upload (owner-21.jpg; no date on the file)' },
  { id: 'gbp-lawn-green', src: gbpLawnGreen, caption: 'Lawn with a built-in putting green', place: '', month: '2026-06',
    alt: 'An artificial turf lawn with a putting green set into one side, edged by a concrete curb and flagstone',
    use: 'putting-green', original: 'GBP owner upload (owner-29.jpg)' },
  { id: 'gbp-hot-tub', src: gbpHotTub, caption: 'Backyard lawn around a hot tub and shade tree', place: '', month: '2025-10',
    alt: 'An artificial turf lawn around a hot tub and a large shade tree, with a vinyl fence behind',
    use: 'lawn', original: 'GBP owner upload (owner-22.jpg)' },
  { id: 'gbp-new-patio', src: gbpNewPatio, caption: 'Back lawn beside a new concrete patio', place: '', month: '2025-02',
    alt: 'A back lawn of artificial turf beside a new concrete patio and a gravel border, fenced yard',
    use: 'lawn', original: 'GBP owner upload (owner-23.jpg)' },
  { id: 'gbp-side-walk', src: gbpSideWalk, caption: 'Side lawn along the patio walk', place: '', month: '2026-02',
    alt: 'A long side lawn of artificial turf along a concrete walk and cedar fence',
    use: 'lawn', original: 'GBP owner upload (owner-37.jpg)' },
  { id: 'gbp-curved-border', src: gbpCurvedBorder, caption: 'Curved lawn with a concrete border', place: '', month: '2026-02',
    alt: 'A curved artificial turf lawn inside a concrete border, gravel beds and a wood fence around it',
    use: 'lawn', original: 'GBP owner upload (owner-40.jpg)' },
  { id: 'gbp-side-patio', src: gbpSidePatio, caption: 'Narrow side-yard lawn beside the patio', place: '', month: '2025-12',
    alt: 'A narrow side-yard lawn of artificial turf between a house and a planting bed, leading to a patio',
    use: 'lawn', original: 'GBP owner upload (owner-41.jpg)' },
  { id: 'gbp-curved-curb', src: gbpCurvedCurb, caption: 'Lawn with a curved concrete curb', place: '', month: '2026-06',
    alt: 'An artificial turf lawn with a curved concrete curb and river rock, a black metal fence behind',
    use: 'lawn', original: 'GBP owner upload (owner-42.jpg)' },
  { id: 'gbp-winding', src: gbpWinding, caption: 'A winding lawn near the end of the install', place: '', month: '2026-02',
    alt: 'A winding artificial turf lawn with a concrete edge, flagstone set aside and the last of the materials nearby',
    use: 'lawn', original: 'GBP owner upload (owner-45.jpg)' },
  { id: 'gbp-backyard', src: gbpBackyard, caption: 'Backyard lawn behind the house', place: '', month: '2025-03',
    alt: 'A fenced backyard lawn of artificial turf behind a brick house, with patio furniture',
    use: 'lawn', original: 'GBP owner upload (owner-46.jpg)' },
  { id: 'gbp-dog-yard', src: gbpDogYard, caption: 'Dog yard with two dogs', place: '',
    alt: 'Two dogs on an artificial turf yard under shade trees, with a wood fence and gravel border',
    use: 'pet', original: 'GBP owner upload (owner-05.jpg; no date on the file)', focus: '50% 60%' },
];

export const photo = (id: string): Photo => {
  const p = PHOTOS.find((x) => x.id === id);
  if (!p) throw new Error(`No photo "${id}" in src/data/photos.ts`);
  return p;
};

/** Human month from YYYY-MM. */
export const monthLabel = (m: string) =>
  new Date(`${m}-15T12:00:00Z`).toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });
