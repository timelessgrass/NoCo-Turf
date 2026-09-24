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
    short: 'Replace the lawn — front, back or side yard.',
    underneath: 'Clay soils shrink and swell; what sits under the turf decides whether it stays flat.',
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
    short: 'Dog runs and yards that drain.',
    underneath: 'Urine has to pass through the backing and the base — drainage and infill decide the smell.',
    photo: null, // no photo yet that is known to be a dog run — ask Brian (never imply it)
    why: 'Dogs appear in 134 of 1,209 Front Range turf reviews; "mud" is the top before-state word — research/voc.md',
    legacy: ['/services/artificial-turf-installation/pet-safe-turf-installation/'],
  },
  {
    slug: 'putting-greens',
    name: 'Backyard putting greens',
    formUse: 'Putting green',
    confirmed: false,
    preview: true,
    short: 'Backyard greens, fringe and cups.',
    underneath: 'Roll and speed come from the grade underneath, the surface and the sand in it.',
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
    short: 'Play yards under swings and sets.',
    underneath: 'Fall zones under equipment need padding matched to the platform height.',
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
    underneath: 'Colorado still allows functional turf — play areas, sports fields, putting greens — in new development.',
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
    underneath: 'Worn infill and a failing base are usually the cause, not the turf itself.',
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
