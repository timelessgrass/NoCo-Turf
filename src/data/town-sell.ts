/**
 * The sales layer of each town page: one hook line under the H1 and three "good to know" lines a buyer
 * cares about. Every line restates a fact the town record already carries (its block headings, answer or
 * the state HOA rule) in plain words; the sourced detail stays in the record and renders in the page's
 * "rules and sources" drawer. No numbers or claims here that the record doesn't carry.
 */
const HOA = 'On a detached home, your HOA can review backyard turf but can’t ban it.';

export interface TownSell { hook: string; good: [string, string, string] }

export const TOWN_SELL: Record<string, TownSell> = {
  'berthoud-co': {
    hook: 'From Heron Lakes at TPC Colorado to acreage west of town, turf and putting greens built to stay flat on Berthoud’s clay.',
    good: [HOA, 'Berthoud’s town code has no artificial-turf rule for houses, so your HOA’s design rules are the ones that count.', 'About a third of central Berthoud is clay loam that swells when it’s wet, so what goes under the turf matters.'],
  },
  'dacono-co': {
    hook: 'Turf lawns, dog runs and putting greens for Dacono yards, built on a base made for its high shrink-swell ground.',
    good: ['Dacono’s landscape rules skip the detached house, so turf in your yard is between you and your HOA.', 'Dacono won’t count synthetic turf toward the landscaping it requires on new development.', 'Nearly half of central Dacono is Weld loam, a high shrink-swell soil. Base prep is the whole job.'],
  },
  'eaton-co': {
    hook: 'Turf lawns and putting greens for Eaton’s bigger lots, from Governor’s Ranch to Hawkstone by the Eaton Country Club.',
    good: ['Eaton’s 2026 turf ordinance is aimed at commercial and common land, not single-family homes.', 'Eaton lots run large: the median house lot is about 8,553 square feet.', HOA],
  },
  'evans-co': {
    hook: 'Turf lawns, dog runs and play yards for Evans homes, from Ashcroft Heights to Lake Arrowhead.',
    good: ['Evans declared a drought emergency in April 2026. Turf stays green without the sprinklers.', 'Evans code keeps turf out of public and common areas. Your own yard is a different question.', 'Evans offers garden kits and sprinkler checks, not a turf rebate.'],
  },
  'firestone-co': {
    hook: 'Firestone writes its own turf spec and requires a permit. Turf, dog runs and putting greens built to meet it.',
    good: ['Every Firestone turf install starts with a Town permit, free for houses.', 'Turf can cover up to 75% of a back or side yard, and in practice less.', 'Firestone sets the pile, the weight, the base and the infill. Ask any installer to show their spec meets it.'],
  },
  'fort-collins-co': {
    hook: 'Turf lawns, dog runs and putting greens for Fort Collins yards, built for clay loam and Front Range snow.',
    good: ['Fort Collins’ turf ban covers landscape plans for new development. Existing house lots are exempt.', HOA, 'The city’s Xeriscape Incentive Program pays for plants, so turf alone is unlikely to qualify.'],
  },
  'frederick-co': {
    hook: 'Turf, dog runs and putting greens for Frederick yards, planned around the town’s 2026 rules.',
    good: ['Since June 1, 2026, Frederick allows artificial turf only where it’s functional. How that reads for a backyard is unsettled, so ask Frederick Planning.', 'Frederick’s lawn rebate pays $2 a square foot, but never for turf.', 'Which side of I-25 you live on decides who supplies your water.'],
  },
  'greeley-co': {
    hook: 'Backyard turf, dog runs and putting greens for Greeley, where the rules for front yards are different.',
    good: ['Greeley keeps artificial turf out of house front yards. The backyard is where it goes.', 'A front-yard permit path has been drafted but not adopted.', 'Greeley bills water by a budget, and the price climbs once you pass it.'],
  },
  'johnstown-co': {
    hook: 'Turf, putting greens and dog runs for Johnstown’s newer neighborhoods, built for two-day watering and big hail.',
    good: ['Johnstown allows two watering days a week, and none after October 15.', 'Johnstown’s lawn-replacement rebate excludes turf.', 'Most big Johnstown subdivisions publish their own design guide. Check yours before you plan.'],
  },
  'longmont-co': {
    hook: 'Turf lawns and putting greens for Longmont homes, from Fox Hill to Spring Valley at Ute Creek.',
    good: ['Longmont’s 2026 turf rules target multifamily, commercial and common land, not your house lot.', 'Longmont’s clay soils absorb water slowly, so drainage under the turf is the job.', 'Longmont’s top water tier runs $13.08 per 1,000 gallons.'],
  },
  'loveland-co': {
    hook: 'Turf lawns and putting greens for Loveland, from Mariana Butte to the Lakes at Centerra.',
    good: ['Loveland wrote the state turf law into its code and left house lots out.', HOA, 'Clay loam and long freezing winters work on a Loveland base, so it has to be built for them.'],
  },
  'mead-co': {
    hook: 'Turf and putting greens for Mead’s newer neighborhoods and acreage, including Grand View and Range View Estates.',
    good: ['Most of Mead’s 57 metro districts were formed in 2018 or later, and each can set its own design rules.', HOA, 'Central Mead sits on Wiley-Colby silt loam, a moderate shrink-swell soil.'],
  },
  'milliken-co': {
    hook: 'Turf lawns, dog runs and putting greens for Milliken, from Settlers Village to the Mad Russian golf neighborhoods.',
    good: ['Existing Milliken houses are exempt from the town’s landscape standards.', 'Town water can’t run a sprinkler from 9 a.m. to 7 p.m. Turf never needs one.', HOA],
  },
  'severance-co': {
    hook: 'Turf and putting greens for Severance’s newer homes, from Golden Eagle Acres to Hunters Crossing.',
    good: ['Severance’s watering schedule is mandatory every year, not just in drought.', '97.4% of Severance homes are single-family detached, where Colorado law protects backyard turf from HOA bans.', 'Severance has taken 2.75-inch hail. Turf and base choices should plan for it.'],
  },
  'timnath-co': {
    hook: 'Turf and putting greens for Timnath, from Harmony Club to Serratoga Falls.',
    good: ['Timnath’s code keeps artificial turf out of landscape plans, which detached house lots don’t need. Ask Timnath Planning about yours.', 'Seven metro-district families run Timnath’s neighborhoods, each with its own board and rules.', HOA],
  },
  'wellington-co': {
    hook: 'Backyard turf, dog runs and putting greens for Wellington, where new front yards stay mostly green.',
    good: ['New Wellington lots keep 75% live plants between the house and the curb, so turf goes out back.', 'Wellington runs its own water plant and asks for two-day lawn watering.', 'About a third of central Wellington is Nunn clay loam, so base prep matters.'],
  },
  'windsor-co': {
    hook: 'Windsor is home base. Turf and putting greens for Highland Meadows, RainDance, Water Valley and every street in between.',
    good: ['Windsor’s no-turf rule is written for new development, not your house.', 'Three golf communities, each with its own design rules, put backyard greens next to real ones.', 'Windsor’s lawn-replacement rebate pays for plants, never for turf.'],
  },
};
