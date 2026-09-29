/** Page-level JSON-LD nodes that reference the one #business entity. Never rating or review markup. */
import { SITE } from '../data/site';
import { plainText } from './inline-links';

export const BUSINESS_REF = { '@id': `${SITE}/#business` };

/** FAQPage mirroring the printed FAQ verbatim (answer text only). FAQ rich results ended 2026-05-07 —
 *  kept because answer engines read it, never sold as a SERP feature. */
export const faqGraph = (items: { q: string; a: string }[]) => items.length ? [{
  '@type': 'FAQPage',
  mainEntity: items.map((it) => ({ '@type': 'Question', name: plainText(it.q), acceptedAnswer: { '@type': 'Answer', text: plainText(it.a) } })),
}] : [];

/** A town × service page's Service node: one service in one town, served by the one #business. */
export const townServiceGraph = (name: string, serviceType: string, path: string, description: string, town: string) => [{
  '@type': 'Service', '@id': `${SITE}${path}#service`, name, serviceType, description, url: `${SITE}${path}`,
  provider: BUSINESS_REF,
  areaServed: { '@type': 'City', name: town, containedInPlace: { '@type': 'State', name: 'Colorado' } },
}];

/**
 * A community page's nodes: the Place it is about (the neighborhood, inside its City, inside Colorado) and one Service
 * served there by the one #business. The page's WebPage points `about` at placeRef (Base's `about` prop); the
 * BreadcrumbList (Areas › Town › Community) comes from the printed crumbs, the FAQPage from faqGraph.
 */
export const communityGraph = (o: { name: string; town: string; path: string; serviceName: string; description: string }) => {
  const place = { '@id': `${SITE}${o.path}#place` };
  return {
    placeRef: place,
    nodes: [
      {
        '@type': 'Place', ...place, name: o.name, url: `${SITE}${o.path}`,
        containedInPlace: { '@type': 'City', name: o.town, containedInPlace: { '@type': 'State', name: 'Colorado' } },
      },
      {
        '@type': 'Service', '@id': `${SITE}${o.path}#service`, name: o.serviceName, serviceType: 'Artificial turf installation',
        description: o.description, url: `${SITE}${o.path}`, provider: BUSINESS_REF, areaServed: place,
      },
    ],
  };
};

export const serviceGraph =(name: string, path: string, description: string, areas: string[]) => [{
  '@type': 'Service', '@id': `${SITE}${path}#service`, name, description, url: `${SITE}${path}`,
  provider: BUSINESS_REF,
  ...(areas.length ? { areaServed: areas.map((a) => ({ '@type': 'City', name: a })) } : {}),
}];
