/**
 * The sales layer of each community page, in plain words: one line for the neighborhood lists (the areas page,
 * the town page) and three "good to know" lines for the page itself. Every line restates what the community's
 * record already says (its answer or block headings); the sourced detail stays in the record and renders in the
 * page's "rules and sources" drawer. No numbers or claims the record doesn't carry.
 */
export interface CommunitySell { line: string; good: [string, string, string] }

export const COMMUNITY_SELL: Record<string, CommunitySell> = {
  'berthoud-co--harvest': {
    line: 'The covenants don’t mention turf, but any landscaping change needs the committee’s written approval.',
    good: ['The covenants don’t mention artificial turf, but the Architectural Review Committee must approve any landscaping in writing.', 'Front yards must stay at least 30% lawn, and turf can’t go in the curbside strip.', 'If the committee doesn’t answer within 30 days, the plan counts as denied, so follow up.'],
  },
  'berthoud-co--heron-lakes': {
    line: 'Artificial turf is allowed by name, with committee approval and planting beds around it.',
    good: ['Artificial turf is allowed by name, with the committee’s written approval.', 'Planting beds have to cover at least 25% of the lot outside the house and driveway.', 'Replacing an existing lawn with turf is its own application, with its own fee.'],
  },
  'eaton-co--governors-ranch': {
    line: 'The covenants don’t mention turf, so a lawn or green goes to the committee like any landscaping.',
    good: ['The covenants don’t mention turf, so the Architectural Control Committee reviews it as landscaping.', 'Adding turf or a green to a finished yard is its own submittal, with a fee.', 'The base has to keep the lot draining the way it was originally graded.'],
  },
  'eaton-co--hawkstone': {
    line: 'Hawkstone’s rules aren’t posted online, so get the current documents before you plan.',
    good: ['Hawkstone’s covenants aren’t posted publicly. Ask OneWay Community Management for the current documents.', 'The application wants drawings, product sheets and samples, and no work starts before a written yes.', 'Building on a vacant lot? The Town’s landscape plan rules apply too.'],
  },
  'evans-co--lake-arrowhead': {
    line: 'The covenants review buildings, not lawns, and city landscape codes don’t reach these yards.',
    good: ['The committee reviews homes, barns and other structures. A lawn isn’t on its list.', 'A pergola or shed beside a green may still need review, so ask the committee.', 'These lots are in unincorporated Weld County, so neither Evans’ nor Greeley’s landscape code applies.'],
  },
  'firestone-co--barefoot-lakes': {
    line: 'Turf is allowed in fenced side and rear yards, on up to half of those yards.',
    good: ['Turf is allowed in fenced side and rear yards with the committee’s approval.', 'The newest guidelines cap turf at 50% of those yards. Older documents say more, so confirm with the committee.', 'Firestone’s own turf permit and product rules apply too.'],
  },
  'firestone-co--falcon-point': {
    line: 'Turf is fine in the yard with committee approval. It’s only barred from porches, patios and balconies.',
    good: ['The HOA only bars turf from porches, patios and balconies.', 'Every landscaping change, a green included, goes to the Design Review Committee with a drawing to scale.', 'Firestone’s own turf permit and product rules apply too.'],
  },
  'firestone-co--owl-lake-estates': {
    line: 'The covenants don’t mention turf. Talk to the committee chair first, then get Firestone’s permit.',
    good: ['The covenants require ground cover and don’t mention turf, so start with the committee chair.', 'Firestone’s turf permit and product rules apply on every lot.', 'Irrigation here runs on ditch water that isn’t guaranteed. Turf stays green without it.'],
  },
  'fort-collins-co--oakridge-village': {
    line: 'Backyard turf is allowed with written approval, on up to half the area and 2 feet off property lines.',
    good: ['Turf is allowed with written approval from the Architectural Control Committee.', 'It stays out of front yards, covers no more than half the area and sits 2 feet in from property lines.', 'Send a material sample and a drainage plan with the request.'],
  },
  'fort-collins-co--waters-edge': {
    line: 'Turf is allowed in back yards with approval, at 60 ounces or heavier and 2 feet off lot lines.',
    good: ['Turf is allowed in back yards after Design Review Committee approval, not in front yards.', 'It must weigh at least 60 ounces, with a 2-foot rock or planted buffer at lot lines.', 'Send a drainage plan and a sample with the request.'],
  },
  'frederick-co--rinn-valley-ranch': {
    line: 'The guidelines don’t mention turf, but the committee approves any backyard plan before work starts.',
    good: ['The guidelines don’t mention turf, but the Design Review Committee must approve a landscaping plan first.', 'Out front, 70% of the yard must be living plants.', 'Frederick’s own approvals and permits may apply too, so wait for both.'],
  },
  'greeley-co--ashton-estates': {
    line: 'The covenants don’t mention turf, but any landscaping needs the committee’s written approval.',
    good: ['The covenants don’t mention turf, but the committee must approve a landscaping plan, grading included.', 'Greeley keeps turf out of house front yards, so a green goes out back.', 'The committee promises a written answer within 14 working days.'],
  },
  'johnstown-co--bella-ridge': {
    line: 'No neighborhood design rules yet, so Johnstown’s town code sets what a yard can have.',
    good: ['The metro district hasn’t adopted design rules yet, so Johnstown’s code applies.', 'Design review may be added later, so check before you build.', 'Yards near the Hillsborough ditch need the ditch company’s sign-off.'],
  },
  'johnstown-co--thompson-crossing': {
    line: 'The design guides still list turf as never permitted, but Colorado law lets you put it in a back yard.',
    good: ['Both design guides list synthetic turf as never permitted, but state law makes that unenforceable in a detached home’s back yard.', 'Putting greens aren’t mentioned, so a green goes to the committee.', 'Front and side yards are up to the Design Review Committee.'],
  },
  'longmont-co--fox-hill': {
    line: 'Nothing in the posted covenants rules out turf, and the rules differ between the two filings.',
    good: ['Nothing in Fox Hill’s posted covenants rules out turf.', 'In Filing I, the HOA board approves street-visible landscaping and every fence first.', 'A new declaration put to Filing I owners in September 2026 would send all landscaping to a committee.'],
  },
  'longmont-co--monte-cielo': {
    line: 'Turf goes on a professionally prepared landscape plan the committee approves before work starts.',
    good: ['The guidelines don’t mention turf, but a professionally prepared landscape plan needs approval first.', 'Converting a finished yard goes to Special Review, where neighbors can weigh in.', 'Everything has to fit inside your lot’s county-approved building envelope.'],
  },
  'longmont-co--spring-valley-ute-creek': {
    line: 'Turf is allowed in rear yards only, professionally installed, with the committee’s written approval.',
    good: ['Turf is allowed in rear yards with the committee’s written approval.', 'It has to be professionally installed and UV-protected, and front yards stay at least 30% vegetation.', 'If the committee says nothing in 30 days, the answer is no, so follow up.'],
  },
  'loveland-co--boyd-lake-shores': {
    line: 'No landscaping changes without a written plan the committee approves. Turf isn’t mentioned, so describe it plainly.',
    good: ['Any lawn or landscaping change needs a written plan approved by the Architectural Control Committee.', 'The covenants don’t mention turf, so describe it plainly on the plan.', 'The committee has 30 days once the file is complete.'],
  },
  'loveland-co--lakes-at-centerra': {
    line: 'Turf is allowed case by case, on up to 45% of a lot’s landscaped area.',
    good: ['Artificial turf is allowed case by case with Design Review Committee approval.', 'It can cover up to 45% of the lot’s landscaped area.', 'The committee meets every two weeks, and 45 days without an answer counts as a no.'],
  },
  'loveland-co--mariana-butte': {
    line: 'Both of Mariana Butte’s rulebooks allow turf, each with its own approval process.',
    good: ['In The Masters, turf is allowed with the committee’s approval.', 'In The Reserve, turf goes in back yards only, after review.', 'Neither names putting greens, so a green is reviewed as turf.'],
  },
  'mead-co--grand-view-estates': {
    line: 'The covenants don’t mention turf or greens. The committee approves structures, so ask what counts.',
    good: ['The 2000 covenants don’t mention turf or putting greens.', 'The Architectural Control Committee approves structures first, so ask whether your project counts.', 'Restated covenants were posted in 2025, so ask which version applies.'],
  },
  'mead-co--range-view-estates': {
    line: 'Nothing bans turf here. It goes on a professionally drawn plan the district approves first.',
    good: ['Nothing bans turf or greens, but the district must approve a professionally drawn landscape plan first.', 'The committee has 45 days, and a request not approved by then is denied.', 'Irrigation water has run short here. Turf stays green without it.'],
  },
  'milliken-co--colony-pointe': {
    line: 'Turf and greens need the committee’s written approval, especially if the grading changes.',
    good: ['Backyard turf, a green or a new fence all need the committee’s written approval first.', 'A contoured green can’t change the lot’s grading or drainage without approval.', 'The committee has 30 days to answer a complete plan.'],
  },
  'milliken-co--mad-russian': {
    line: 'No active HOA reviews yards here, but Milliken’s zoning and any recorded covenants still apply.',
    good: ['Neither Mad Russian association is in good standing, so there’s no HOA review.', 'Covenants recorded with the plat may still apply, so check your title.', 'On estate lots, Milliken puts courts and similar structures behind the house.'],
  },
  'severance-co--golden-eagle-acres': {
    line: 'Nothing bans turf here. Send a landscape plan and the review fee to the committee first.',
    good: ['Nothing the district posts bans or even names artificial turf.', 'A professionally prepared landscape plan and a $50 review fee go to the committee before digging.', 'Homes are on septic, so the tank and drain field get marked before a green goes in.'],
  },
  'timnath-co--harmony-club': {
    line: 'The Harmony Development Team reviews every yard plan, under a design guide that isn’t posted.',
    good: ['For a detached home, turf is most likely allowed, after the Harmony Development Team’s review.', 'The design guide isn’t posted, so ask the team for it before you plan.', 'On Tall Grass Court, lawn can cover no more than a quarter of each lot.'],
  },
  'timnath-co--serratoga-falls': {
    line: 'Turf is allowed with approval, but it can’t replace the required front-yard sod.',
    good: ['Turf is allowed with the Architectural Control Committee’s approval.', 'It can’t replace the required front-yard sod.', 'Front and back yards are held to 40% non-living materials unless the committee and the Town approve more.'],
  },
  'windsor-co--highland-meadows': {
    line: 'Turf needs the committee’s approval, and the product itself is part of the review.',
    good: ['New turf styles need the Architectural Control Committee’s approval.', 'Front yards need 40% turf, and the rules don’t say whether synthetic counts, so ask first.', 'On lots backing to the course, the district fence stays closed, so materials come in through your lot.'],
  },
  'windsor-co--raindance': {
    line: 'Backyard turf is allowed on up to 30% of the rear yard, screened from the street.',
    good: ['Turf goes behind the house, on no more than 30% of the rear yard, screened from the street.', 'Putting greens go in the back yard, 6 feet from property lines.', 'Get the Architectural Review Committee’s written approval first.'],
  },
  'windsor-co--water-valley': {
    line: 'The guidelines don’t mention turf, but every landscaping change goes to the committee.',
    good: ['Water Valley’s guidelines don’t mention turf, but every landscaping change goes to the Design Review Committee.', 'In Ravina, turf is barred from front yards.', 'Lots on the water or open space have to keep neighbors’ views open.'],
  },
};
