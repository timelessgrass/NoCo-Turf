/**
 * The guide topics: every guide record carries exactly one (`topic` in src/content.config.ts, an enum of
 * these slugs), and each topic with at least one visible guide gets a hub at /guides/{slug}/.
 *
 * Topic slugs and guide ids share the /guides/ namespace. A guide id may never equal a topic slug:
 * scripts/check-content.mjs fails the record, the two /guides/ routes throw (assertGuideNamespace in
 * src/lib/content-policy.mjs), and astro.config.mjs turns any route conflict into a build error.
 *
 * Order here is the order everywhere: the /guides/ index, the header panel, the footer, llms.txt, and
 * the numbering of guides within a topic (src/lib/visible.ts).
 *
 * Copy rules are the guides' rules (docs/GUIDES.md): plain and specific, no claim about NoCo, no number
 * that needs a source, no Denver-metro town. `description` ≤ 160 characters, `title` ≤ 70 and ending
 * "| NoCo Turf Co.", `paint` (optional) a phrase of the H1 that gets the painted layout mark. `faqH2` and
 * `cta` are the defaults a guide in this topic uses when its frontmatter `display` doesn't set its own;
 * the hub's closing band uses `cta` too. check-content.mjs and tests/guide-topics.test.mjs hold all of it.
 */
export type GuideTopic = {
  slug: string;
  /** The topic's full name: the hub's section heads and the header panel. */
  name: string;
  /** A short label: crumbs, the guide hero label, footer and chips. */
  label: string;
  title: string;
  description: string;
  h1: string;
  paint?: string;
  lede: string;
  faqH2: string;
  cta: { title: string; payoff: string };
};

export const GUIDE_TOPICS: GuideTopic[] = [
  {
    slug: 'pets',
    name: 'Pets and turf',
    label: 'Pets',
    title: 'Pets and Artificial Turf: Dog Runs and Pet Yards | NoCo Turf Co.',
    description: 'Dog runs and pet yards on artificial turf: drainage, odor, infill, paws on hot days, digging and cleanup. Each answer lists its sources, dated.',
    h1: 'Pets and turf: what drains, what smells, and what a dog does to it',
    paint: 'what a dog does to it',
    lede: 'Urine, odor, infill, digging and hot surfaces: how turf behaves under a dog, and what decides whether a pet area stays clean.',
    faqH2: 'Questions about dogs on turf.',
    cta: { title: 'The dog knows the yard.', payoff: 'Show us where it runs.' },
  },
  {
    slug: 'weather',
    name: 'Colorado weather: hail, snow, heat, sun, wind',
    label: 'Weather',
    title: 'Artificial Turf in Colorado Weather: Hail, Snow, Heat | NoCo Turf Co.',
    description: 'How artificial turf takes Northern Colorado weather: hail, snow and shoveling, summer surface heat, high-altitude sun, wind, and ground that freezes.',
    h1: 'Hail, snow, heat, sun and wind: turf under a Colorado sky',
    paint: 'a Colorado sky',
    lede: 'Front Range weather is hard on anything left outside. These take it one part at a time: what hail and snow do to turf, how hot the surface gets, and what sun and wind wear down.',
    faqH2: 'Questions about turf in Colorado weather.',
    cta: { title: 'The weather is the same next door.', payoff: 'The ground under it isn’t.' },
  },
  {
    slug: 'installation',
    name: 'Installation, base and drainage',
    label: 'Installation',
    title: 'Artificial Turf Installation, Base and Drainage | NoCo Turf Co.',
    description: 'How artificial turf goes in over Northern Colorado clay: lawn removal, base depth and compaction, drainage, edging, seams and infill, step by step.',
    h1: 'Installation, base and drainage: the work under the turf',
    paint: 'the work under the turf',
    lede: 'What sits under the turf decides whether it stays flat and drains. The steps of an install, from taking out the lawn to the last pass of infill, and what each one is for.',
    faqH2: 'Questions about the install.',
    cta: { title: 'The base decides it.', payoff: 'Let’s look at your ground.' },
  },
  {
    slug: 'products',
    name: 'Turf products and specs',
    label: 'Products',
    title: 'Artificial Turf Products and Spec Sheets, Explained | NoCo Turf Co.',
    description: 'How to read an artificial turf spec sheet: face weight, pile height, yarn, backing, infill and UV ratings, and which numbers change how a yard lasts.',
    h1: 'Turf products and specs: what each line of the sheet measures',
    paint: 'each line of the sheet',
    lede: 'Face weight, pile height, yarn, backing, infill: what each line of a spec sheet measures, and which of them change how a yard looks, feels and wears.',
    faqH2: 'Questions about the spec sheet.',
    cta: { title: 'The sheet is one part.', payoff: 'The yard decides the rest.' },
  },
  {
    slug: 'care-and-repair',
    name: 'Care, cleaning and repair',
    label: 'Care and repair',
    title: 'Artificial Turf Care, Cleaning and Repair | NoCo Turf Co.',
    description: 'Keeping artificial turf clean and flat: brushing, rinsing, leaves, stains, weeds, matted spots, seams that lift, burns and patches, and when to repair.',
    h1: 'Care, cleaning and repair: keeping turf flat, clean and whole',
    paint: 'flat, clean and whole',
    lede: 'Turf is low-maintenance, not no-maintenance. The routine care, the fixes for stains, weeds and matted spots, and what a lifted seam or a burn needs.',
    faqH2: 'Questions about care and repair.',
    cta: { title: 'Planning turf you can live with?', payoff: 'Start with a yard walk.' },
  },
  {
    slug: 'putting-greens',
    name: 'Putting greens',
    label: 'Putting greens',
    title: 'Backyard Putting Greens: Speed, Grade and Upkeep | NoCo Turf Co.',
    description: 'Backyard putting greens in Northern Colorado: surface and speed, contours and grade, cups and fringe, chipping, how big to build one, and upkeep.',
    h1: 'Backyard putting greens: speed, roll and the grade under them',
    paint: 'the grade under them',
    lede: 'A green rolls the way its base was shaped. Surface, speed, contours, cups, fringe and chipping, and how much room a green needs.',
    faqH2: 'Questions about putting greens.',
    cta: { title: 'A green starts with the grade.', payoff: 'Walk the yard with us.' },
  },
  {
    slug: 'safety',
    name: 'Kids, health and safety',
    label: 'Safety',
    title: 'Artificial Turf Safety: Kids, Health and PFAS | NoCo Turf Co.',
    description: 'Artificial turf around kids: PFAS and Colorado law, infill, fall height under play equipment, surface heat, allergies and cleaning, from the sources.',
    h1: 'Kids, health and safety: what the standards and the law say',
    paint: 'the standards and the law',
    lede: 'The questions parents ask about turf, answered from standards, public agencies and Colorado law: what it is made of, what goes under a swing set, and how hot it gets.',
    faqH2: 'Questions about kids, health and safety.',
    cta: { title: 'Kids in the yard?', payoff: 'Ask it all at the yard walk.' },
  },
  {
    slug: 'comparisons',
    name: 'Turf vs the alternatives',
    label: 'Comparisons',
    title: 'Artificial Turf vs Sod, Native Grass, Xeriscape, Rock | NoCo Turf Co.',
    description: 'Artificial turf beside the alternatives in Northern Colorado: bluegrass sod, buffalo grass and native lawns, xeriscape beds, rock and mulch.',
    h1: 'Turf versus the alternatives: sod, native grass, xeriscape and rock',
    paint: 'the alternatives',
    lede: 'Turf is one way to replace a thirsty lawn, not the only one. Side by side with sod, low-water grasses, planted beds and rock: water, upkeep, heat, feel and what each one suits.',
    faqH2: 'Questions about the alternatives.',
    cta: { title: 'Still weighing it up?', payoff: 'Walk the yard with us first.' },
  },
  {
    slug: 'buying',
    name: 'Cost, quotes and choosing an installer',
    label: 'Cost and quotes',
    title: 'Artificial Turf Cost, Quotes and Installers | NoCo Turf Co.',
    description: 'What moves an artificial turf quote in Northern Colorado, how to compare two quotes line by line, and what to ask any installer before you sign.',
    h1: 'Cost, quotes and choosing an installer: what a price is made of',
    paint: 'what a price is made of',
    lede: 'Two quotes for the same yard can differ for good reasons. What goes into a price, how to compare quotes line by line, and the questions to ask before you sign.',
    faqH2: 'Questions about cost and quotes.',
    cta: { title: 'Compare quotes on the same yard.', payoff: 'Start with a yard walk.' },
  },
  {
    slug: 'rules-and-hoa',
    name: 'Rules, HOAs and permits',
    label: 'Rules and HOAs',
    title: 'Turf Rules, HOAs and Permits in Northern Colorado | NoCo Turf Co.',
    description: 'Where artificial turf is allowed in Northern Colorado: state law, each town’s code, HOA review and your rights, permits, and what is still changing.',
    h1: 'Rules, HOAs and permits: where turf is allowed, and who decides',
    paint: 'who decides',
    lede: 'Colorado law, town codes and HOA covenants each have a say. What they settle, what they leave open, and which office to ask about your own address.',
    faqH2: 'Questions about the rules.',
    cta: { title: 'The rules are one part.', payoff: 'The yard is the other.' },
  },
  {
    slug: 'water',
    name: 'Water, drought and rebates',
    label: 'Water and rebates',
    title: 'Artificial Turf, Water, Drought and Rebates | NoCo Turf Co.',
    description: 'Artificial turf and water in Northern Colorado: what a lawn uses, what that water costs at each provider, watering rules in drought, and rebates.',
    h1: 'Water, drought and rebates: what a lawn drinks, and what it costs',
    paint: 'what it costs',
    lede: 'Gallons first, then dollars: how much a bluegrass lawn drinks on the Front Range, what that water is worth at your provider’s rates, the watering rules, and which rebates exist.',
    faqH2: 'Questions about water and rebates.',
    cta: { title: 'Know what your lawn drinks?', payoff: 'Now price the yard.' },
  },
  {
    slug: 'commercial',
    name: 'Commercial, HOA common areas and play spaces',
    label: 'Commercial',
    title: 'Commercial, HOA Common Area and Play Space Turf | NoCo Turf Co.',
    description: 'Artificial turf for HOA common areas, commercial sites and play spaces in Northern Colorado: the state rules for new landscapes, bids and upkeep.',
    h1: 'Commercial sites, HOA common areas and play spaces',
    paint: 'play spaces',
    lede: 'Common areas, storefronts, parks and playgrounds carry rules a backyard doesn’t: the state limits on new landscapes, the surface under play equipment, and what a bid should cover.',
    faqH2: 'Questions about common areas and play spaces.',
    cta: { title: 'A common area or a play space?', payoff: 'Let’s walk the site.' },
  },
  {
    slug: 'yard-design',
    name: 'Where turf goes: yards, slopes, shade and edges',
    label: 'Yard design',
    title: 'Where Turf Goes: Slopes, Shade, Side Yards, Edges | NoCo Turf Co.',
    description: 'Where artificial turf works in a yard and where it doesn’t: slopes, shade, side yards, tree roots, pools and patios, borders, and mixing with plants.',
    h1: 'Where turf goes: slopes, shade, side yards and the edges between',
    paint: 'the edges between',
    lede: 'Some parts of a yard suit turf and some don’t. Slopes, shade, narrow side yards, tree roots, pool decks and borders, and how turf meets plants, rock and concrete.',
    faqH2: 'Questions about where turf goes.',
    cta: { title: 'Every yard has an awkward corner.', payoff: 'Show us yours.' },
  },
];

export const TOPIC_SLUGS = GUIDE_TOPICS.map((t) => t.slug) as [string, ...string[]];
export const topicBySlug: Record<string, GuideTopic> = Object.fromEntries(GUIDE_TOPICS.map((t) => [t.slug, t]));
