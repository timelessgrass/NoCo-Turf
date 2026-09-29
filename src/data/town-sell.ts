/**
 * The sales layer of each town page: one hook line under the H1 and three "good to know" lines a buyer
 * cares about. Every line restates a fact the town record already carries (its block headings, answer or
 * the state HOA rule) in plain words; the sourced detail stays in the record and renders in the page's
 * "rules and sources" drawer. No numbers or claims here that the record doesn't carry.
 */
const HOA = 'On a detached home, your HOA can review backyard turf but can’t ban it.';

/** good[0] is always the town's own turf rule: town × service pages lead with it. */
export interface TownSell { hook: string; good: [string, string, string] }
export { HOA as HOA_LINE };

export const TOWN_SELL: Record<string, TownSell> = {
  'berthoud-co': {
    hook: 'We build turf and putting greens all over Berthoud, from Heron Lakes at TPC Colorado to the acreage west of town, on a base made to stay flat on its clay.',
    good: ['Berthoud’s town code has no turf rule for houses, so your HOA’s design rules are the ones to check.', HOA, 'Berthoud’s clay swells when it’s wet, so the base under the turf is what keeps it flat.'],
  },
  'dacono-co': {
    hook: 'We build turf lawns, dog runs and putting greens in Dacono, on a base made for ground that shrinks and swells.',
    good: ['Dacono’s landscape rules don’t cover existing houses, so turf in your yard is up to you and your HOA.', 'Turf doesn’t count toward the landscaping Dacono requires on new development.', 'Much of Dacono sits on clay that shrinks and swells, so base prep matters most.'],
  },
  'eaton-co': {
    hook: 'We build turf lawns and putting greens on Eaton’s bigger lots, from Governor’s Ranch to Hawkstone by the Eaton Country Club.',
    good: ['Eaton’s 2026 turf rule is aimed at commercial and common land, not your house.', HOA, 'Eaton lots run big, and turf takes the mowing and watering off your list.'],
  },
  'evans-co': {
    hook: 'We build turf lawns, dog runs and play areas for Evans homes, from Ashcroft Heights to Lake Arrowhead.',
    good: ['Evans keeps turf out of public and common areas, not your own yard.', 'Evans declared a drought emergency in April 2026. Turf stays green without the sprinklers.', 'Evans’ water programs cover plants and sprinkler checks, not turf.'],
  },
  'firestone-co': {
    hook: 'We build turf lawns, dog runs and putting greens in Firestone, a town with its own turf rules and permit.',
    good: ['Every Firestone turf job needs a Town permit, free for houses.', 'Turf can cover up to 75% of a back or side yard, but half of those yards must stay live plants, so plan on about half.', 'Firestone sets minimums for the turf, base and infill. Ask any installer to show their spec meets them.'],
  },
  'fort-collins-co': {
    hook: 'We build turf lawns, dog runs and putting greens across Fort Collins, made for its clay and Front Range snow.',
    good: ['Fort Collins’ turf ban covers new development. Existing house lots are exempt.', HOA, 'The city’s Xeriscape rebate pays for plants, not turf.'],
  },
  'frederick-co': {
    hook: 'We build turf, dog runs and putting greens in Frederick, where 2026 rules limit where turf can go.',
    good: ['Since June 1, 2026, Frederick allows turf only where it’s functional. How that applies to a backyard isn’t settled, so ask Frederick Planning.', 'Frederick’s lawn rebate pays for plants, never for turf.', HOA],
  },
  'greeley-co': {
    hook: 'We build backyard turf, dog runs and putting greens in Greeley, where front yards have their own rules.',
    good: ['Greeley keeps turf out of house front yards, so the backyard is where it goes.', 'A front-yard permit option has been drafted but not adopted yet.', 'Greeley’s water rates climb once you pass your budget. A turf lawn doesn’t need the sprinklers.'],
  },
  'johnstown-co': {
    hook: 'We build turf, putting greens and dog runs in Johnstown’s newer neighborhoods, ready for two-day watering and big hail.',
    good: ['Johnstown allows two watering days a week, and none after October 15. Turf doesn’t need them.', 'Johnstown’s lawn-replacement rebate doesn’t cover turf.', 'Most big Johnstown neighborhoods have their own design guide. Check yours before you plan.'],
  },
  'longmont-co': {
    hook: 'We build turf lawns and putting greens in Longmont, from Fox Hill to Spring Valley at Ute Creek.',
    good: ['Longmont’s 2026 turf rules cover multifamily, commercial and common land, not your house lot.', HOA, 'Longmont’s clay drains slowly, so drainage under the turf matters.'],
  },
  'loveland-co': {
    hook: 'We build turf lawns and putting greens in Loveland, from Mariana Butte to the Lakes at Centerra.',
    good: ['Loveland adopted the state turf law and left house lots out.', HOA, 'Clay and long, freezing winters are hard on a base, so it has to be built for them.'],
  },
  'mead-co': {
    hook: 'We build turf and putting greens in Mead’s newer neighborhoods and acreage, including Grand View and Range View Estates.',
    good: ['Most Mead neighborhoods have a metro district, and each can set its own design rules.', HOA, 'Mead’s soil moves as it wets and dries, so the base matters.'],
  },
  'milliken-co': {
    hook: 'We build turf lawns, dog runs and putting greens in Milliken, from Settlers Village to the Mad Russian golf neighborhoods.',
    good: ['Existing Milliken houses are exempt from the town’s landscape standards.', 'Town water can’t run sprinklers from 9 a.m. to 7 p.m. Turf doesn’t need them.', HOA],
  },
  'severance-co': {
    hook: 'We build turf and putting greens for Severance’s newer homes, from Golden Eagle Acres to Hunters Crossing.',
    good: ['Most Severance homes are detached, where Colorado law protects backyard turf from HOA bans.', 'Severance’s watering schedule applies every year, not just in drought.', 'Severance gets big hail, so turf and base choices should plan for it.'],
  },
  'timnath-co': {
    hook: 'We build turf and putting greens in Timnath, from Harmony Club to Serratoga Falls.',
    good: ['Timnath’s turf limits apply to landscape plans, which existing houses don’t need. Ask Timnath Planning about yours.', 'Most Timnath neighborhoods have a metro district with its own board and design rules.', HOA],
  },
  'wellington-co': {
    hook: 'We build backyard turf, dog runs and putting greens in Wellington, where new front yards stay mostly green.',
    good: ['New Wellington lots keep 75% live plants between the house and the curb, so turf goes out back.', 'Wellington asks for two-day lawn watering. Turf doesn’t need it.', 'Much of Wellington sits on clay, so base prep matters.'],
  },
  'windsor-co': {
    hook: 'Windsor is home. We build turf and putting greens in Highland Meadows, RainDance, Water Valley and every street in between.',
    good: ['Windsor’s no-turf rule is for new development, not existing homes.', 'Highland Meadows, RainDance and Water Valley each have their own design rules.', 'Windsor’s lawn rebate pays for plants, not turf.'],
  },
};
