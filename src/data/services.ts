/**
 * The services NoCo sells — one dedicated page each (Whitespark local-organic factor #1).
 *
 * `confirmed` is false until Brian confirms in writing that the service is real today and supplies
 * photos of it (Appendix A, question 4). An unconfirmed service gets no page, no nav entry and no
 * form option. `legacy` lists the old URLs that 301 into this page (public/_redirects), so the
 * 18 template service URLs from the vendor site and the 2024 WordPress URLs land somewhere real.
 *
 * `formUse` is the exact value the estimate form posts for this service (lead routing keys on it).
 */
export type Service = {
  slug: string;
  name: string;
  formUse: string;
  confirmed: boolean;
  /** Rendered during PRELAUNCH preview for review, even while unconfirmed (never at launch unless confirmed). */
  preview: boolean;
  /** One line for menus and the service sheet: what the job is for, in the buyer's words. */
  short: string;
  /** What decides whether it lasts — general trade/regulatory truth, never a claim about NoCo. */
  underneath: string;
  /** Photo id (src/data/photos.ts) that shows this kind of job, or null. */
  photo: string | null;
  why: string; // why this page exists — the demand or the differentiator, with a research pointer
  legacy: string[];
};

export const SERVICES: Service[] = [
  {
    slug: 'artificial-turf-installation',
    name: 'Artificial turf installation',
    formUse: 'Lawn replacement',
    confirmed: false,
    preview: true,
    short: 'Front, back and side-yard lawns.',
    underneath: 'Green all year with no mowing or watering, on a base built to stay flat on our clay.',
    photo: 'fenced-yard',
    why: 'Head term in Colorado ("artificial turf" Trends avg 24 vs "fake grass" 3) — research/seo.md; carries The Build base cross-section',
    legacy: [
      // '/services/artificial-turf-installation/' itself keeps its URL — never list a page as its own legacy path.
      '/services/artificial-turf-installation/residential-artificial-turf-installation/',
      '/services/artificial-turf-installation/site-preparation-for-turf/',
      '/services/landscape-design-installation/',
      '/services/landscape-design-installation/landscape-turf-installation/',
      '/services/landscape-design-installation/residential-landscape-design/',
      '/services/landscape-design-installation/outdoor-space-planning/',
      '/services/landscape-design-installation/landscape-consultation/',
      '/services/specialty-turf-services/',
      '/services/specialty-turf-services/custom-turf-design/',
      '/services/specialty-turf-services/specialty-turf-consultation/',
      '/installation-services/',
    ],
  },
  {
    slug: 'pet-turf',
    name: 'Pet turf and dog runs',
    formUse: 'Pet turf',
    confirmed: false,
    preview: true,
    short: 'Dog yards and runs that drain.',
    underneath: 'Drains fast and rinses clean, so there’s no mud, no yellow spots and no lingering smell.',
    photo: 'gbp-dog-yard', // Brian's own upload to the NoCo listing: two dogs on a finished turf yard
    why: 'Dogs appear in 134 of 1,209 Front Range turf reviews; "mud" is the top before-state word — research/voc.md',
    legacy: ['/services/artificial-turf-installation/pet-safe-turf-installation/'],
  },
  {
    slug: 'putting-greens',
    name: 'Backyard putting greens',
    formUse: 'Putting green',
    confirmed: false,
    preview: true,
    short: 'Backyard greens with cups and fringe.',
    underneath: 'A smooth, true roll, with the break and cups set where you want them.',
    photo: 'dusk',
    why: 'Brian: "We do putting greens like crazy" (2026-09-04, 00:42:47); golf-community density around Windsor — research/local.md',
    legacy: ['/services/specialty-turf-services/putting-green-installation/'],
  },
  {
    slug: 'playground-turf',
    name: 'Playground turf',
    formUse: 'Play area',
    confirmed: false,
    preview: true,
    short: 'Play areas under swings and play sets.',
    underneath: 'Soft, clean and mud-free, with padding underneath matched to the height of the set.',
    photo: 'playset',
    why: 'Functional artificial turf stays legal under HB25-1113; fall-height claims only with product data',
    legacy: ['/services/specialty-turf-services/playground-turf-installation/'],
  },
  {
    slug: 'commercial-turf',
    name: 'Commercial, HOA and sports turf',
    formUse: 'Commercial, HOA or sports',
    confirmed: false,
    preview: true,
    short: 'HOA, park, school and sports turf.',
    underneath: 'Play areas, dog parks and fields that stay usable all year and stand up to heavy use.',
    photo: null,
    why: 'Built on HB25-1113 functional-turf definition; metro-district density in Windsor, Timnath, Mead, Frederick — research/local.md',
    legacy: [
      '/services/artificial-turf-installation/commercial-artificial-turf-installation/',
      '/services/artificial-turf-installation/sports-turf-installation/',
      '/services/landscape-design-installation/commercial-landscape-installation/',
      '/services/specialty-turf-services/indoor-turf-installation/',
    ],
  },
  {
    slug: 'turf-repair',
    name: 'Turf repair, cleaning and infill',
    formUse: 'Repair or replace old turf',
    confirmed: false,
    preview: false,
    short: 'Old turf that\'s flat, torn or smells.',
    underneath: 'Flat, matted or smelly turf can often be brought back without replacing it.',
    photo: null,
    why: 'Legacy /maintenance-services/ URL; turf cleaner queries rising in Colorado — research/seo.md. Only if Brian still offers it',
    legacy: ['/maintenance-services/'],
  },
];

/** Retail turf and supplies from the Windsor shop — a page only if the store still sells to the
 *  public (Appendix A, question 1). Target for the 20 legacy /product/* and 5 /product-category/* URLs;
 *  if it does not exist they 301 to /services/artificial-turf-installation/. */
export const TURF_SUPPLY = { slug: 'turf-supply', confirmed: false };

export const confirmedServices = SERVICES.filter((s) => s.confirmed);

import { SHOW_DRAFTS } from './site';
/** What the nav, sheet and routes show: confirmed services — plus previewable ones during PRELAUNCH. */
export const visibleServices = SERVICES.filter((s) => s.confirmed || (SHOW_DRAFTS && s.preview));
