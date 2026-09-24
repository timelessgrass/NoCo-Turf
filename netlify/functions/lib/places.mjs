/**
 * Where a ZIP or a town sits against NoCo Turf Co.'s territory. Data only; lead-routing.mjs decides.
 *
 * Town classes come from src/data/territory.mjs (the decided territory, 2026-09-24), so a town added
 * or moved there moves here too:
 *   served     — the 17 NOCO_TOWNS, plus the neighbourhoods folded into them (`sections`)
 *   timeless   — TIMELESS_TOWNS (Denver metro incl. Erie, Brighton, Thornton, Broomfield): the lead is
 *                forwarded to the Denver-metro sister brand, never booked for NoCo
 *   unassigned — EXCLUDED_TOWNS that Brian still has to assign (Fort Lupton, Niwot)
 *   outside    — Colorado places outside the 17 towns (incl. Estes Park, excluded on purpose)
 *
 * ZIP sources (checked 2026-09-24):
 *   - Census 2020 ZCTA-to-place relationship file,
 *     https://www2.census.gov/geo/docs/maps-data/data/rel2020/zcta520/tab20_zcta520_place20_natl.txt
 *     (every delivery ZIP below and the ZCTA_PLACES overlap table)
 *   - PO-box and unique ZIPs have no ZCTA. Their city comes from the zip-codes.com city/ZIP pages
 *     (https://www.zip-codes.com/city/co-fort-collins.asp, .../co-greeley.asp, .../co-longmont.asp,
 *     .../zip-code/80539/, .../80546/, .../80551/). USPS's own lookup refuses automated requests, so
 *     re-check these by hand at tools.usps.com before launch.
 *   - The Denver-metro ranges are TIMELESS's own router table (its netlify/functions/lib/lead-routing.mjs,
 *     ZIPS.CO.served, read 2026-09-24), minus 80544 (Niwot), which territory.mjs leaves unassigned.
 */
import { NOCO_TOWNS, TIMELESS_TOWNS, EXCLUDED_TOWNS } from '../../../src/data/territory.mjs';

/** ZIP → the NoCo town it belongs to (USPS city name, in territory.mjs spelling). */
export const SERVED_ZIPS = {
  '80501': 'Longmont',
  '80502': 'Longmont', // PO box
  '80503': 'Longmont', // also covers nearly all of Niwot (unassigned). See ZCTA_PLACES
  '80504': 'Longmont', // east Longmont, most of Firestone, and parts of Frederick and Mead
  '80513': 'Berthoud',
  '80514': 'Dacono',
  '80520': 'Firestone',
  '80521': 'Fort Collins',
  '80522': 'Fort Collins', // PO box
  '80523': 'Fort Collins', // unique: Colorado State University
  '80524': 'Fort Collins',
  '80525': 'Fort Collins',
  '80526': 'Fort Collins',
  '80527': 'Fort Collins', // PO box
  '80528': 'Fort Collins', // also south Timnath and west Windsor
  '80530': 'Frederick',
  '80534': 'Johnstown',
  '80535': 'Laporte',
  '80537': 'Loveland',
  '80538': 'Loveland',
  '80539': 'Loveland', // PO box
  '80542': 'Mead',
  '80543': 'Milliken',
  '80546': 'Severance', // PO box; Severance street addresses mostly use 80550
  '80547': 'Timnath',
  '80549': 'Wellington',
  '80550': 'Windsor', // also most of Severance
  '80551': 'Windsor', // unique
  '80553': 'Fort Collins', // unique
  '80615': 'Eaton',
  '80620': 'Evans',
  '80631': 'Greeley',
  '80632': 'Greeley', // PO box
  '80633': 'Greeley', // PO box
  '80634': 'Greeley',
  '80638': 'Greeley', // unique
  '80639': 'Greeley', // unique
  '80645': 'LaSalle',
  '80651': 'Platteville',
};

/** Denver-metro ZIPs: TIMELESS's served table (see header). [from, to] inclusive, or [one]. */
export const TIMELESS_ZIP_RANGES = [
  [80001, 80047], [80104], [80108, 80113], [80120, 80131], [80134], [80138], [80201, 80299], [80301, 80310],
  [80401, 80403], [80419], [80433], [80437], [80439], [80453, 80454], [80457], [80465], [80516], [80601, 80603], [80640],
];

/** ZIPs whose main town territory.mjs leaves for Brian to assign. */
export const UNASSIGNED_ZIPS = { '80544': 'Niwot', '80621': 'Fort Lupton' };

/**
 * Census 2020: every place whose land lies partly inside each northern-Colorado ZCTA, largest part
 * first. Used to see when what someone typed as their town is really inside their ZIP (a Frederick
 * house on 80516, a Dacono house on 80603), and to name the place behind an out-of-area ZIP.
 */
export const ZCTA_PLACES = {
  '80501': ['Longmont'],
  '80503': ['Longmont', 'Niwot', 'Gunbarrel', 'Boulder', 'Lyons'],
  '80504': ['Firestone', 'Longmont', 'Frederick', 'Mead', 'Erie', 'Platteville'],
  '80510': ['Allenspark'],
  '80512': ['Fort Collins', 'Laporte'],
  '80513': ['Berthoud', 'Mead', 'Johnstown'],
  '80514': ['Dacono', 'Frederick'],
  '80516': ['Erie', 'Frederick', 'Broomfield', 'Dacono', 'Northglenn'],
  '80517': ['Estes Park'],
  '80520': ['Firestone', 'Frederick'],
  '80521': ['Fort Collins'],
  '80524': ['Fort Collins', 'Laporte', 'Severance', 'Timnath'],
  '80525': ['Fort Collins', 'Timnath'],
  '80526': ['Fort Collins', 'Loveland'],
  '80528': ['Fort Collins', 'Windsor', 'Timnath', 'Loveland'],
  '80530': ['Frederick', 'Firestone'],
  '80534': ['Johnstown', 'Berthoud', 'Milliken', 'Mead', 'Loveland', 'Greeley'],
  '80535': ['Laporte'],
  '80537': ['Loveland', 'Johnstown', 'Berthoud'],
  '80538': ['Loveland', 'Johnstown'],
  '80540': ['Allenspark', 'Lyons'],
  '80542': ['Mead'],
  '80543': ['Milliken', 'Greeley', 'Evans', 'Johnstown'],
  '80544': ['Niwot'],
  '80545': ['Red Feather Lakes'],
  '80546': ['Severance'],
  '80547': ['Timnath', 'Fort Collins'],
  '80549': ['Wellington'],
  '80550': ['Windsor', 'Severance', 'Greeley', 'Loveland'],
  '80601': ['Brighton', 'Todd Creek', 'Commerce City', 'Lochbuie'],
  '80602': ['Thornton', 'Todd Creek', 'Brighton'],
  '80603': ['Lochbuie', 'Brighton', 'Dacono', 'Commerce City', 'Northglenn', 'Fort Lupton', 'Thornton'],
  '80610': ['Ault', 'Severance'],
  '80611': ['Briggsdale'],
  '80615': ['Eaton', 'Severance'],
  '80620': ['Evans', 'Greeley'],
  '80621': ['Fort Lupton', 'Aristocrat Ranchettes', 'Frederick', 'Firestone', 'Brighton', 'Dacono', 'Platteville', 'Hudson'],
  '80623': ['Gilcrest'],
  '80631': ['Greeley', 'Windsor', 'Kersey', 'Garden City', 'Evans'],
  '80634': ['Greeley', 'Evans', 'Milliken'],
  '80640': ['Commerce City', 'Brighton', 'Thornton', 'Derby'],
  '80642': ['Hudson', 'Keenesburg', 'Lochbuie'],
  '80643': ['Keenesburg', 'Hudson'],
  '80644': ['Kersey'],
  '80645': ['Evans', 'LaSalle'],
  '80648': ['Nunn'],
  '80649': ['Orchard'],
  '80650': ['Pierce'],
  '80651': ['Platteville', 'Milliken', 'Mead', 'Gilcrest', 'Evans'],
  '80653': ['Jackson Lake', 'Weldona'],
  '80654': ['Wiggins'],
};

/* ---- town names -------------------------------------------------------------------------------
   [name, class, strong]. "A / B" lists spellings people type. A weak name is a common subdivision
   or street word ("Mountain View", "Lakeside") that also names a Denver-metro place: it is only a
   hint, never enough on its own to forward a lead away from NoCo. */
const ALIASES = {
  'Fort Collins': 'Fort Collins / Ft Collins / FoCo',
  LaSalle: 'LaSalle / La Salle',
  Laporte: 'Laporte / La Porte',
};

/* Denver-metro places from TIMELESS's town list (its lib/places.mjs, CO rows), beyond TIMELESS_TOWNS. */
const TIMELESS_STRONG = [
  'Castle Pines', 'Castle Pines Village', 'Cherry Hills Village', 'Greenwood Village', 'Federal Heights', 'Lone Tree',
  'Ken Caryl', 'Todd Creek', 'Evergreen', 'Henderson', 'Gunbarrel', 'Morrison', 'Conifer', 'Columbine Valley',
  'Roxborough Park', 'Sterling Ranch',
];
const TIMELESS_WEAK = [
  'Mountain View', 'Twin Lakes', 'Lakeside', 'Meridian', 'Stonegate', 'Fairmount', 'Eastlake', 'Berkley', 'Inverness',
  'Holly Hills', 'Columbine', 'Applewood', 'Derby', 'Welby', 'Genesee', 'Foxfield', 'Dove Valley', 'Sierra Ridge',
  'Dakota Ridge', 'Indian Hills', 'Aspen Park', 'Four Square Mile', 'North Washington', 'East Pleasant View',
  'West Pleasant View', 'Grand View Estates', 'Cherry Creek', 'The Pinery', 'Kittredge', 'Idledale', 'Louviers',
  'Bow Mar', 'Shaw Heights', 'Sherrelwood', 'Edgewater', 'Glendale', 'Sheridan',
];
/* Colorado places near the territory but not in it (Census 2020 places in the ZCTAs above). */
const OUTSIDE = [
  'Allenspark', 'Ault', 'Briggsdale', 'Garden City', 'Gilcrest', 'Hudson', 'Jackson Lake', 'Keenesburg', 'Kersey',
  'Lochbuie', 'Lyons', 'Nunn', 'Orchard', 'Pierce', 'Red Feather Lakes', 'Weldona', 'Wiggins', 'Aristocrat Ranchettes',
];

const SERVED_NAMES = NOCO_TOWNS.flatMap((t) => [t.name, ...(t.sections ?? [])]);
const UNASSIGNED_NAMES = Object.keys(EXCLUDED_TOWNS).filter((n) => /unassigned/i.test(EXCLUDED_TOWNS[n]));
const EXCLUDED_OUTSIDE = Object.keys(EXCLUDED_TOWNS).filter((n) => !UNASSIGNED_NAMES.includes(n));

/** Every place the router recognises: [name, class, strong]. */
export const PLACES = [
  ...SERVED_NAMES.map((n) => [n, 'served', true]),
  ...TIMELESS_TOWNS.map((n) => [n, 'timeless', true]),
  ...TIMELESS_STRONG.filter((n) => !TIMELESS_TOWNS.includes(n)).map((n) => [n, 'timeless', true]),
  ...TIMELESS_WEAK.map((n) => [n, 'timeless', false]),
  ...UNASSIGNED_NAMES.map((n) => [n, 'unassigned', true]),
  ...EXCLUDED_OUTSIDE.map((n) => [n, 'outside', true]),
  ...OUTSIDE.map((n) => [n, 'outside', true]),
];

/** The class of a place name as spelled in PLACES / ZCTA_PLACES (null if unknown). */
export const classOfPlace = (name) => PLACES.find(([n]) => n === name)?.[1] ?? null;

/** The reason a place was left out of the territory (territory.mjs EXCLUDED_TOWNS), if any. */
export const excludedReason = (name) => EXCLUDED_TOWNS[name] ?? '';

export const spellings = (name) => (ALIASES[name] ?? name).split(' / ');
