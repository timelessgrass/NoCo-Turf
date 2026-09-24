/** Page-level JSON-LD nodes that reference the one #business entity. Never rating or review markup. */
import { SITE } from '../data/site';

export const BUSINESS_REF = { '@id': `${SITE}/#business` };

/** FAQPage mirroring the printed FAQ verbatim (answer text only). FAQ rich results ended 2026-05-07 —
 *  kept because answer engines read it, never sold as a SERP feature. */
export const faqGraph = (items: { q: string; a: string }[]) => items.length ? [{
  '@type': 'FAQPage',
  mainEntity: items.map((it) => ({ '@type': 'Question', name: it.q, acceptedAnswer: { '@type': 'Answer', text: it.a } })),
}] : [];

export const serviceGraph = (name: string, path: string, description: string, areas: string[]) => [{
  '@type': 'Service', '@id': `${SITE}${path}#service`, name, description, url: `${SITE}${path}`,
  provider: BUSINESS_REF,
  ...(areas.length ? { areaServed: areas.map((a) => ({ '@type': 'City', name: a })) } : {}),
}];
