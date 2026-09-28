/**
 * Scene pictures for the jobs Brian has no photo of yet (pet turf, commercial and HOA turf). They show the kind
 * of yard, never a job: no caption, no place, no date. They never appear in the work galleries ("Recent work",
 * "Yards we've built"), and no gate counts them as a photo of a town, community or service. Each one steps aside
 * as soon as a camera original of that kind of job lands in photos.ts.
 */
import dogRunFence from '../assets/scenes/dog-run-cedar-fence.jpg';
import dogsPlaying from '../assets/scenes/dogs-playing-backyard.jpg';
import hoaCommon from '../assets/scenes/hoa-common-area-playground.jpg';
import parkField from '../assets/scenes/park-sports-field.jpg';
import dogPark from '../assets/scenes/community-dog-park.jpg';
import dogPatio from '../assets/scenes/backyard-dog-patio-dusk.jpg';

export interface Scene { id: string; src: ImageMetadata; alt: string; focus?: string }

export const SCENES: Scene[] = [
  { id: 'dog-run', src: dogRunFence, alt: 'A golden retriever resting on an artificial turf dog run beside a cedar fence, foothills in the distance', focus: '35% 60%' },
  { id: 'dogs-playing', src: dogsPlaying, alt: 'Two dogs playing on an artificial turf backyard beside a flagstone path', focus: '50% 55%' },
  { id: 'hoa-common', src: hoaCommon, alt: 'An HOA common area with artificial turf around a playground, benches and a walking path, mountains beyond', focus: '55% 60%' },
  { id: 'park-field', src: parkField, alt: 'A neighborhood sports field of artificial turf with soccer lines, bleachers and the Front Range behind', focus: '50% 60%' },
  { id: 'dog-park', src: dogPark, alt: 'Dogs playing in a community dog park surfaced with artificial turf, with a shaded pergola and water fountain', focus: '50% 60%' },
  { id: 'dog-patio', src: dogPatio, alt: 'A dog running across an artificial turf backyard lawn beside a covered patio at sunset', focus: '55% 60%' },
];

export const scene = (id: string): Scene => {
  const s = SCENES.find((x) => x.id === id);
  if (!s) throw new Error(`scenes.ts: no scene "${id}"`);
  return s;
};

/** The scene that stands in for a service with no job photo. */
export const SERVICE_SCENE: Record<string, string> = { 'pet-turf': 'dog-run', 'commercial-turf': 'hoa-common' };
