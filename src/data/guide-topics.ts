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
    lede: 'Smell, cleanup, digging and hot days: how to keep a dog yard clean and comfortable on turf.',
    faqH2: 'Questions about dogs on turf.',
    cta: { title: 'Planning a dog-friendly yard?', payoff: 'Let’s walk it together.' },
  },
  {
    slug: 'weather',
    name: 'Colorado weather: hail, snow, heat, sun, wind',
    label: 'Weather',
    title: 'Artificial Turf in Colorado Weather: Hail, Snow, Heat | NoCo Turf Co.',
    description: 'How artificial turf takes Northern Colorado weather: hail, snow and shoveling, summer surface heat, high-altitude sun, wind, and ground that freezes.',
    h1: 'Hail, snow, heat, sun and wind: turf under a Colorado sky',
    paint: 'a Colorado sky',
    lede: 'What hail, snow, summer heat and sun do to turf here, and how to plan for them.',
    faqH2: 'Questions about turf in Colorado weather.',
    cta: { title: 'Want turf that lasts here?', payoff: 'Let’s walk your yard.' },
  },
  {
    slug: 'installation',
    name: 'Installation, base and drainage',
    label: 'Installation',
    title: 'Artificial Turf Installation, Base and Drainage | NoCo Turf Co.',
    description: 'How artificial turf goes in over Northern Colorado clay: lawn removal, base depth and compaction, drainage, edging, seams and infill, step by step.',
    h1: 'Installation, base and drainage: the work under the turf',
    paint: 'the work under the turf',
    lede: 'How turf goes in, from taking out the lawn to the last pass of infill, and why the base under it matters most.',
    faqH2: 'Questions about the install.',
    cta: { title: 'Ready to see what your yard needs?', payoff: 'Book a yard walk.' },
  },
  {
    slug: 'products',
    name: 'Turf products and specs',
    label: 'Products',
    title: 'Artificial Turf Products and Spec Sheets, Explained | NoCo Turf Co.',
    description: 'How to read an artificial turf spec sheet: face weight, pile height, yarn, backing, infill and UV ratings, and which numbers change how a yard lasts.',
    h1: 'Turf products and specs: what each line of the sheet measures',
    paint: 'each line of the sheet',
    lede: 'What the numbers on a turf spec sheet mean, and which ones change how a yard looks, feels and wears.',
    faqH2: 'Questions about the spec sheet.',
    cta: { title: 'Not sure which turf fits?', payoff: 'We’ll help you choose.' },
  },
  {
    slug: 'care-and-repair',
    name: 'Care, cleaning and repair',
    label: 'Care and repair',
    title: 'Artificial Turf Care, Cleaning and Repair | NoCo Turf Co.',
    description: 'Keeping artificial turf clean and flat: brushing, rinsing, leaves, stains, weeds, matted spots, seams that lift, burns and patches, and when to repair.',
    h1: 'Care, cleaning and repair: keeping turf flat, clean and whole',
    paint: 'flat, clean and whole',
    lede: 'Turf is low-maintenance, not no-maintenance. Routine care, plus fixes for stains, weeds, matted spots and seams.',
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
    lede: 'Speed, break, cups, fringe and chipping: how to plan a backyard green you’ll actually use.',
    faqH2: 'Questions about putting greens.',
    cta: { title: 'Want a green in your backyard?', payoff: 'Let’s find the spot.' },
  },
  {
    slug: 'safety',
    name: 'Kids, health and safety',
    label: 'Safety',
    title: 'Artificial Turf Safety: Kids, Health and PFAS | NoCo Turf Co.',
    description: 'Artificial turf around kids and pets: allergies, bugs, fire and fire pits, PFAS and Colorado law, and crumb rubber infill, from the sources.',
    h1: 'Kids, health and safety: what the standards and the law say',
    paint: 'the standards and the law',
    lede: 'The questions parents ask: allergies, bugs, fire, and what’s in turf and its infill.',
    faqH2: 'Questions about kids, health and safety.',
    cta: { title: 'Kids or pets in the yard?', payoff: 'Let’s talk it through.' },
  },
  {
    slug: 'comparisons',
    name: 'Turf vs the alternatives',
    label: 'Comparisons',
    title: 'Artificial Turf vs Sod, Native Grass, Xeriscape, Rock | NoCo Turf Co.',
    description: 'Artificial turf beside the alternatives in Northern Colorado: bluegrass sod, buffalo grass and native lawns, xeriscape beds, rock and mulch.',
    h1: 'Turf versus the alternatives: sod, native grass, xeriscape and rock',
    paint: 'the alternatives',
    lede: 'Turf next to sod, low-water grass, planted beds and rock: water, upkeep, heat, feel and what each one suits.',
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
    cta: { title: 'Want a price for your yard?', payoff: 'Start with a yard walk.' },
  },
  {
    slug: 'rules-and-hoa',
    name: 'Rules, HOAs and permits',
    label: 'Rules and HOAs',
    title: 'Turf Rules, HOAs and Permits in Northern Colorado | NoCo Turf Co.',
    description: 'Where artificial turf is allowed in Northern Colorado: state law, each town’s code, HOA review and your rights, permits, and what is still changing.',
    h1: 'Rules, HOAs and permits: where turf is allowed, and who decides',
    paint: 'who decides',
    lede: 'Colorado law, town codes and HOA rules each have a say. What they allow, and who to ask about your address.',
    faqH2: 'Questions about the rules.',
    cta: { title: 'Ready to plan your yard?', payoff: 'Let’s walk it together.' },
  },
  {
    slug: 'water',
    name: 'Water, drought and rebates',
    label: 'Water and rebates',
    title: 'Artificial Turf, Water, Drought and Rebates | NoCo Turf Co.',
    description: 'Artificial turf and water in Northern Colorado: what a lawn uses, what that water costs at each provider, watering rules in drought, and rebates.',
    h1: 'Water, drought and rebates: what a lawn drinks, and what it costs',
    paint: 'what it costs',
    lede: 'How much water a lawn uses here, what it’s worth at your provider’s rates, the watering rules, and which rebates exist.',
    faqH2: 'Questions about water and rebates.',
    cta: { title: 'Ready to stop watering the lawn?', payoff: 'Let’s price your yard.' },
  },
  {
    slug: 'commercial',
    name: 'Sports fields, golf practice and dog facilities',
    label: 'Commercial',
    title: 'Commercial Turf: Fields, Golf Practice, Dog Daycares | NoCo Turf Co.',
    description: 'Artificial turf for sports fields, golf practice areas and dog daycares in Northern Colorado: how long a field lasts, yearly upkeep, and turf vs grass.',
    h1: 'Sports fields, golf practice areas and dog facilities',
    paint: 'dog facilities',
    lede: 'How long a field lasts, what it needs each year, practice turf for a golf club, and turf for a dog daycare.',
    faqH2: 'Questions about fields and facilities.',
    cta: { title: 'A field or a facility?', payoff: 'Let’s walk the site.' },
  },
  {
    slug: 'yard-design',
    name: 'Where turf goes: yards, slopes, shade and edges',
    label: 'Yard design',
    title: 'Where Turf Goes: Slopes, Shade, Side Yards, Edges | NoCo Turf Co.',
    description: 'Where artificial turf works in a yard and where it doesn’t: slopes, shade, side yards, tree roots, pools and patios, borders, and mixing with plants.',
    h1: 'Where turf goes: slopes, shade, side yards and the edges between',
    paint: 'the edges between',
    lede: 'Slopes, shade, side yards, trees, pools and borders: where turf works and how it meets the rest of the yard.',
    faqH2: 'Questions about where turf goes.',
    cta: { title: 'Planning the whole backyard?', payoff: 'Let’s walk it together.' },
  },
];

export const TOPIC_SLUGS = GUIDE_TOPICS.map((t) => t.slug) as [string, ...string[]];
export const topicBySlug: Record<string, GuideTopic> = Object.fromEntries(GUIDE_TOPICS.map((t) => [t.slug, t]));
