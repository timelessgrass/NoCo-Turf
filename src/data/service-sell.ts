/**
 * The decision layer of each service page: plain help for a homeowner deciding whether this is right for their
 * yard. Who it suits, when to think twice, what living with it is like (each point linking the guide that
 * covers it with sources), and what moves the price. General turf facts only, each one covered by a guide or a
 * layer record. No prices, warranty terms, timelines or years until Brian supplies them.
 */
export interface ServiceSell {
  h1: string;
  paint: string;
  lede: string;
  good: string[];
  think: string[];
  expect: { h: string; p: string; href: string }[];
  price: string[];
}

export const SERVICE_SELL: Record<string, ServiceSell> = {
  'artificial-turf-installation': {
    h1: 'Artificial turf lawns, built for Northern Colorado.',
    paint: 'built for Northern Colorado.',
    lede: 'Replace a thirsty, patchy lawn with turf that stays green all year. No mowing, no watering, no mud, on a base built for the clay under your yard.',
    good: [
      'Your lawn struggles with shade, dogs, heavy use or watering limits.',
      'You’re done mowing, watering, fertilizing and reseeding.',
      'You want the yard to look good all year, drought restrictions included.',
      'A spot gets so much traffic from kids or pets that it turns to mud.',
    ],
    think: [
      'The area bakes in afternoon sun and you walk it barefoot in July. Turf runs hotter than grass, so plan shade, a cooler infill or a mix with plants.',
      'You want turf in the front yard in a town that limits it, like Greeley or Wellington. Check your town page first.',
      'You’re counting on a water rebate. No Northern Colorado provider we checked pays for artificial turf.',
    ],
    expect: [
      { h: 'Upkeep', p: 'Rinse it, blow off leaves, and brush it now and then so the blades stand up. Top up infill where it wears.', href: '/guides/does-artificial-turf-need-maintenance/' },
      { h: 'Summer heat', p: 'In full sun, turf gets hotter than grass. Shade, a lighter infill or a quick rinse helps on the hottest days.', href: '/guides/how-hot-does-artificial-turf-get/' },
      { h: 'Winter', p: 'Snow can melt off on its own or be cleared with care.', href: '/guides/artificial-turf-snow-removal/' },
      { h: 'How long it lasts', p: 'That depends on the product, the sun, pets and traffic. Get any warranty in writing before you sign.', href: '/guides/how-long-does-artificial-turf-last/' },
    ],
    price: ['The size of the area and how easy it is to reach', 'Taking out the old lawn and grading', 'Base depth and drainage for your soil', 'Edging where turf meets rock, beds and concrete', 'The turf and infill you choose', 'Extras like a putting green, dog area or play area'],
  },
  'pet-turf': {
    h1: 'Pet turf and dog runs that drain fast and stay clean.',
    paint: 'drain fast and stay clean.',
    lede: 'A yard your dogs can run on every day without mud, dead spots or dirt tracked inside. Built to drain fast and rinse clean, so it doesn’t hold smell.',
    good: [
      'Your dogs have worn the lawn down to dirt paths and mud.',
      'You’re tired of muddy paws and yellow spots.',
      'You want a dog run you can rinse clean in minutes.',
      'You have a narrow side yard or run where grass never fills in.',
    ],
    think: [
      'You have a serious digger. Turf holds up, but the edges may need wire or a border underneath.',
      'The run sits in full sun. Turf gets hot, so plan shade or a cooler infill for summer afternoons.',
      'You don’t plan to rinse it. Urine needs flushing now and then, especially in dry spells.',
    ],
    expect: [
      { h: 'Smell', p: 'Odor comes from urine that doesn’t drain away. A fast-draining base, the right infill and a regular rinse keep it fresh.', href: '/guides/dog-urine-smell-artificial-turf/' },
      { h: 'Cleanup', p: 'Pick up after the dogs as usual, then hose the spot. An enzyme cleaner handles anything stubborn.', href: '/guides/dog-poop-on-artificial-turf/' },
      { h: 'Paws and heat', p: 'In full sun, turf gets hotter than grass. Shade and a rinse help on the hottest days.', href: '/guides/is-artificial-turf-safe-for-pets/' },
      { h: 'Infill', p: 'Some infills are made to help with odor. Which one fits depends on the dogs and the yard.', href: '/guides/dog-turf-infill/' },
    ],
    price: ['The size of the run or yard', 'Drainage work under the turf', 'Pet turf and infill', 'Fence lines, gates and edging', 'Dig barriers where they’re needed'],
  },
  'putting-greens': {
    h1: 'Backyard putting greens that roll true.',
    paint: 'roll true.',
    lede: 'Practice every day, a few steps from the back door. Cups, fringe and break where you want them, on a base that holds its shape through winter.',
    good: [
      'You golf and want to practice putting and short chips at home.',
      'You want a backyard you’ll actually use in the evenings.',
      'You live on or near a course and want the yard to match.',
      'There’s a corner of the yard that never did well as grass.',
    ],
    think: [
      'You want to hit full wedge shots onto it. Chipping works best with the right surface and fringe, so say so up front.',
      'Your only spot is steep. Some slope adds break; too much needs grading or a wall.',
      'You’re in an HOA or metro district. It may want to review the plan first, so leave time for that.',
    ],
    expect: [
      { h: 'Speed', p: 'Green speed comes from the surface and the sand in it. Decide how fast you want it before you pick the turf.', href: '/guides/putting-green-stimp-speed/' },
      { h: 'Design', p: 'Size, cup placement, fringe and break decide how the green plays. Plan them around how you practice.', href: '/guides/putting-green-design-ideas/' },
      { h: 'Upkeep', p: 'Brush it, keep it clear of debris, and top up sand where it thins. Sand-filled greens need a little more.', href: '/guides/artificial-putting-green-maintenance/' },
      { h: 'Night putting', p: 'Low, shielded lights let you putt after work. Your town and HOA may have lighting rules.', href: '/guides/putting-green-lighting/' },
    ],
    price: ['The size and shape of the green', 'How many cups', 'Break and contour built into the base', 'Fringe, collar and edging stone', 'A sand-filled or non-infilled surface', 'Lighting, a chipping area and other extras'],
  },
  'playground-turf': {
    h1: 'Playground turf that’s soft, clean and padded for falls.',
    paint: 'padded for falls.',
    lede: 'A play area that stays green and mud-free, with padding under the turf matched to the height of the swing set or play structure.',
    good: [
      'The grass under the swings is worn down to dirt or mud.',
      'You want something cleaner than wood chips or rubber mulch.',
      'Kids play there every day and you want it usable right after rain.',
      'You want the play area to match the rest of the yard.',
    ],
    think: [
      'The set is tall. The pad under the turf has to be rated for the fall height, so measure the highest platform.',
      'It sits in full afternoon sun. Turf gets hot, so plan some shade.',
      'It’s for a daycare or school. Licensing rules cover the surfacing, so plan around them from the start.',
    ],
    expect: [
      { h: 'Fall safety', p: 'The shock pad under the turf does the cushioning, and it has to match the height of the equipment.', href: '/guides/playground-turf-vs-mulch/' },
      { h: 'Anchoring', p: 'Swing sets and play structures can be anchored through turf the right way.', href: '/guides/swing-set-on-artificial-turf/' },
      { h: 'Materials', p: 'Colorado bans intentionally added PFAS in turf installed from 2026. Ask for the product documents.', href: '/guides/is-artificial-turf-toxic/' },
      { h: 'Upkeep', p: 'Rinse it, brush it and keep the fall zones level. No more raking chips back into place.', href: '/guides/does-artificial-turf-need-maintenance/' },
    ],
    price: ['The size of the play area', 'The fall height of the equipment, which sets the pad thickness', 'Removing old mulch, chips or grass', 'Edging and borders', 'Drainage under the area'],
  },
  'commercial-turf': {
    h1: 'Commercial and HOA turf that fits Colorado’s rules.',
    paint: 'fits Colorado’s rules.',
    lede: 'We build turf for HOA common areas, parks, schools, dog areas and sports fields.',
    good: [
      'Your board wants play areas, dog parks or fields that stay usable all year.',
      'Watering common-area grass is eating the budget.',
      'A field or play area needs a surface that stands up to heavy use.',
    ],
    think: [
      'The area is purely decorative. Since 2026, Colorado bars nonfunctional turf in new commercial and common-area landscaping; functional uses and existing turf are treated differently.',
      'Your town has its own turf ordinance. Read it before the board votes.',
      'It’s a full sports field. That’s a specialized build with its own testing.',
    ],
    expect: [
      { h: 'The rules', p: 'Functional turf, like play areas, fields and dog areas, is still allowed. Decorative turf in new development is not.', href: '/guides/turf-rules-northern-colorado/' },
      { h: 'Dog areas', p: 'Dog parks and daycares need drainage and a cleaning routine built in from day one.', href: '/guides/dog-daycare-artificial-turf/' },
      { h: 'Fields', p: 'Synthetic fields need grooming, infill top-ups and regular testing.', href: '/guides/synthetic-turf-field-maintenance/' },
      { h: 'Water', p: 'What a lawn’s water is worth depends on your provider’s rates.', href: '/guides/water-savings/' },
    ],
    price: ['The area and its use: play, dogs, sports or common ground', 'Base, drainage and any shock pad', 'Access, staging and working around residents', 'Permits and town requirements', 'Product and infill specs'],
  },
};
