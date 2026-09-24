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
  why: string; // why this page exists — the demand or the differentiator, with a research pointer
  legacy: string[];
};

export const SERVICES: Service[] = [
  {
    slug: 'artificial-turf-installation',
    name: 'Artificial turf installation',
    formUse: 'Lawn replacement',
    confirmed: false,
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
    why: 'Dogs appear in 134 of 1,209 Front Range turf reviews; "mud" is the top before-state word — research/voc.md',
    legacy: ['/services/artificial-turf-installation/pet-safe-turf-installation/'],
  },
  {
    slug: 'putting-greens',
    name: 'Backyard putting greens',
    formUse: 'Putting green',
    confirmed: false,
    why: 'Brian: "We do putting greens like crazy" (2026-09-04, 00:42:47); golf-community density around Windsor — research/local.md',
    legacy: ['/services/specialty-turf-services/putting-green-installation/'],
  },
  {
    slug: 'playground-turf',
    name: 'Playground turf',
    formUse: 'Play area',
    confirmed: false,
    why: 'Functional artificial turf stays legal under HB25-1113; fall-height claims only with product data',
    legacy: ['/services/specialty-turf-services/playground-turf-installation/'],
  },
  {
    slug: 'commercial-turf',
    name: 'Commercial, HOA and sports turf',
    formUse: 'Commercial, HOA or sports',
    confirmed: false,
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
    why: 'Legacy /maintenance-services/ URL; turf cleaner queries rising in Colorado — research/seo.md. Only if Brian still offers it',
    legacy: ['/maintenance-services/'],
  },
];

/** Retail turf and supplies from the Windsor shop — a page only if the store still sells to the
 *  public (Appendix A, question 1). Target for the 20 legacy /product/* and 5 /product-category/* URLs;
 *  if it does not exist they 301 to /services/artificial-turf-installation/. */
export const TURF_SUPPLY = { slug: 'turf-supply', confirmed: false };

export const confirmedServices = SERVICES.filter((s) => s.confirmed);
