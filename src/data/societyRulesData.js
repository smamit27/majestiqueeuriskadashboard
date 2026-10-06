/**
 * Official Society Rules, Regulations & Bylaws
 * Majestique Euriska 'A' Building Co-operative Housing Society Ltd.
 * (Applicable to Buildings A, B & C)
 * Reg. No. PNA/PNA (4)/HSG/(TC)/21207/2019-20
 *
 * Source: Official Management Committee Circulars & Bylaw Notices:
 * - Circular 1: Important Society Rules & Penalties (Parking & No-Smoking, ₹500/day fine)
 * - Circular 2: Clubhouse & Lawn Guidelines (Dated 10-08-2026)
 * - Circular 3: No Parking Gate & Campus Banner (Fine ₹500/day)
 * - Circular 4: Euriska Cultural - Don't Waste Food & Prasad (अन्न व प्रसाद वाया घालवू नका)
 * - Circular 5: Footwear Etiquette Policy (कृपया आपले पादत्राणे येथे काढा)
 */

export const RULE_CATEGORIES = [
  { id: 'ALL', label: 'All Rules', icon: '📋' },
  { id: 'notices', label: 'Official Notice Posters (12)', icon: '🖼️' },
  { id: 'parking', label: 'Parking & Main Gate', icon: '🚗' },
  { id: 'water_crisis', label: 'Water Crisis & Tanker Penalties', icon: '💧' },
  { id: 'sports_play', label: 'Corridor Play & CCTV Ban', icon: '⚽' },
  { id: 'swimming', label: 'Swimming Pool & Timings', icon: '🏊‍♂️' },
  { id: 'table_tennis', label: 'Table Tennis (24 Bylaws)', icon: '🏓' },
  { id: 'clubhouse', label: 'Clubhouse & Lawn (10-08-2026)', icon: '🏛️' },
  { id: 'smoking', label: 'Strict No-Smoking', icon: '🚭' },
  { id: 'cultural', label: 'Food, Prasad & Cleanliness', icon: '🍛' },
  { id: 'etiquette', label: 'Footwear & Common Areas', icon: '👟' },
  { id: 'renovation', label: 'Renovation & Drilling', icon: '🔨' },
  { id: 'pets', label: 'Pets & Animals', icon: '🐾' },
  { id: 'shifting', label: 'Shifting & Move-In', icon: '📦' },
  { id: 'finance', label: 'Dues & Maintenance', icon: '💳' },
];

export const RULE_SEVERITIES = {
  STRICT: {
    key: 'STRICT',
    label: 'Strict Enforcement',
    color: '#be123c',
    bg: '#ffe4e6',
    border: '#fecdd3'
  },
  HIGH: {
    key: 'HIGH',
    label: 'High Priority',
    color: '#b45309',
    bg: '#fef3c7',
    border: '#fde68a'
  },
  STANDARD: {
    key: 'STANDARD',
    label: 'Standard Bylaw',
    color: '#0f766e',
    bg: '#ccfbf1',
    border: '#99f6e4'
  }
};

/**
 * High-resolution official circular posters uploaded by the Society Committee
 */
export const OFFICIAL_POSTERS = [
  {
    id: 'poster-rules-penalties',
    title: 'Important Society Rules & Penalties (Buildings A, B & C)',
    marathiTitle: 'महत्वाचे सोसायटी नियम व दंड',
    image: '/rules_notices/important_society_rules_penalties.jpg',
    category: 'parking',
    badge: 'Official Committee Notice',
    summary: 'Comprehensive 11-point parking regulations, Main Gate parking prohibition, and society-wide No-Smoking mandate with ₹500/day penalty added to maintenance account.'
  },
  {
    id: 'poster-no-parking-banner',
    title: 'No Parking Signboard — Fine ₹500 per day',
    marathiTitle: 'नो पार्किंग — दररोज ₹५०० दंड',
    image: '/rules_notices/no_parking_fine_500.jpg',
    category: 'parking',
    badge: 'Active Gate & Campus Sign',
    summary: 'Official high-visibility signboard displayed across internal driveways, main gates, and visitor transit bays.'
  },
  {
    id: 'poster-no-parking-lift-entrance',
    title: 'No Parking Zone: Lift Area & A-Building Entrance',
    marathiTitle: 'नो पार्किंग झोन — लिफ्ट परिसर व ए विंग प्रवेशद्वार',
    image: '/rules_notices/no_parking_lift_entrance_notice.jpg',
    category: 'parking',
    badge: 'A Building Committee Notice',
    summary: 'Strict prohibition against parking near lift lobby and A-building main entrance. Obstruction delays emergency access. Emergency contact: Siddu (Manager).'
  },
  {
    id: 'poster-two-wheeler-common-parking',
    title: 'Common Parking for Two Wheeler',
    marathiTitle: 'दुचाकींसाठी सामायिक पार्किंग',
    image: '/rules_notices/two_wheeler_common_parking.jpg',
    category: 'parking',
    badge: 'Designated Parking Sign',
    summary: 'Official blue-and-white campus signage indicating designated common parking bays allocated for two-wheelers.'
  },
  {
    id: 'poster-tap-flush-water',
    title: 'Notice Regarding Tap Water & Flush Water Wastage',
    marathiTitle: 'नळ व फ्लश पाण्याच्या अपव्ययाबाबत महत्वाची सूचना',
    image: '/rules_notices/tap_flush_water_waste_notice.jpg',
    category: 'water_crisis',
    badge: 'Tanker Penalty Notice',
    summary: 'Water shortage directive: Ensure taps are closed properly, inspect flush tanks for continuous leaks, double-check washrooms. Tanker cost will be directly added to flat maintenance bill if wastage/negligence found.'
  },
  {
    id: 'poster-severe-water-crisis',
    title: 'Important Notice: Severe Water Crisis & Tanker Territories',
    marathiTitle: 'शहरातील तीव्र पाणी टंचाई व टँकर पुरवठा सूचना',
    image: '/rules_notices/severe_water_crisis_tanker_notice.jpg',
    category: 'water_crisis',
    badge: 'Joint Committee Circular',
    summary: 'City water crisis explanation: Tanker vendors have divided operational territories preventing alternative sourcing; monsoon water collection parameters; continuous supply priority. Contact Siddu (Manager) for details.'
  },
  {
    id: 'poster-no-football-playing',
    title: 'Notice: Not Allowed to Play Football or Activities in Corridors/Lobby',
    marathiTitle: 'पायऱ्या, लॉबी व कॉरिडॉरमध्ये फुटबॉल किंवा खेळण्यास सक्त मनाई',
    image: '/rules_notices/no_football_playing_fine_notice.jpg',
    category: 'sports_play',
    badge: 'First Warning (CCTV Enforced)',
    summary: 'Strict prohibition on playing football or running activities in common lobbies & corridors. 24/7 CCTV surveillance active. Fines imposed for violations and damage to glass, tiles, lights, or common property.'
  },
  {
    id: 'poster-swimming-pool-rules',
    title: 'Swimming Pool Rules and Regulations',
    marathiTitle: 'जलतरण तलाव नियमावली व वेळापत्रक',
    image: '/rules_notices/swimming_pool_rules_notice.jpg',
    category: 'swimming',
    badge: 'Common Committee Board',
    summary: 'Official poolside rules: Compulsory swimming costume & pool cap, no cotton/bermudas, shower mandatory, children accompanied, bachelors & friends strictly prohibited, slot timings (closed Thursday).'
  },
  {
    id: 'poster-table-tennis-rules',
    title: 'Table Tennis Society Rules and Regulations',
    marathiTitle: 'टेबल टेनिस सोसायटी नियमावली (२४ नियम)',
    image: '/rules_notices/table_tennis_rules_notice.jpg',
    category: 'table_tennis',
    badge: 'Managing Committee Order (1/0049)',
    summary: 'Official 24-point bylaw: Equipment, 11-point format, 30-min queue limit, 12+ age, non-spike shoes, register check, no AC allowed, no bachelors/friends/guests, pending dues barred.'
  },
  {
    id: 'poster-clubhouse-guidelines',
    title: 'Club House & Lawn Guidelines (Circular Dt. 10-08-2026)',
    marathiTitle: 'क्लब हाऊस आणि लॉन नियमावली (दि. १०-०८-२०२६)',
    image: '/rules_notices/clubhouse_lawn_guidelines_doc.jpg',
    category: 'clubhouse',
    badge: 'Bylaw Circular Dt. 10-08-2026',
    summary: 'Official signed guidelines for clubhouse & lawn booking: ₹1,000 non-refundable + ₹2,000 deposit (≤5 hrs); ₹2,000 + ₹4,000 deposit (full day); music cutoff 10 PM; no cooking; no alcohol/smoking.'
  },
  {
    id: 'poster-dont-waste-food',
    title: 'Don’t Waste Food & Prasad / अन्न व प्रसाद वाया घालवू नका',
    marathiTitle: 'अन्न व प्रसाद वाया घालवू नका — युरिस्का कल्चरल',
    image: '/rules_notices/dont_waste_food_prasad.jpg',
    category: 'cultural',
    badge: 'Euriska Cultural Initiative',
    summary: 'Bilingual community guideline: Food is Precious (अन्न हे दान आहे) • Take Only What You Need (आवश्यक तेवढाच घ्या) • Think of Others (इतरांचाही विचार करा) • No Food Waste (वाया घालवणे टाळा).'
  },
  {
    id: 'poster-remove-footwear',
    title: 'Please Remove Your Footwear Here / कृपया आपले पादत्राणे येथे काढा',
    marathiTitle: 'कृपया आपले पादत्राणे येथे काढा',
    image: '/rules_notices/remove_footwear_sign.jpg',
    category: 'etiquette',
    badge: 'Cleanliness & Etiquette Sign',
    summary: 'Compulsory footwear etiquette for Clubhouse, Gym, Indoor sports, and cultural premises. Place neatly in a row so that it is easier to find later.'
  }
];

export const INITIAL_SOCIETY_RULES = [
  // ── 1. OFFICIAL PARKING RULES (CIRCULAR FOR BUILDINGS A, B & C) ──────
  {
    id: 'rule-park-official-1',
    article: 'Circular Notice Cl. 1–4',
    category: 'parking',
    categoryLabel: 'Parking & Main Gate',
    categoryIcon: '🚗',
    title: 'Allotted Space Parking & Visitor Policy',
    severity: 'STRICT',
    timings: '24 Hours / 365 Days',
    daysApplicable: 'All Days (Buildings A, B & C)',
    summary: 'The society DOES NOT have designated car parking or two-wheeler parking for visitors. Residents must park vehicles ONLY in their allotted parking space.',
    guidelines: [
      'The society DOES NOT have designated car parking or two-wheeler parking for visitors.',
      'Residents must park their vehicles ONLY in their officially allotted parking space.',
      'We are in the process of arranging a common two-wheeler parking area in suitable common areas; this will be informed once finalized by the Committee.',
      'Until designated two-wheeler parking is arranged, residents are requested to park responsibly without blocking driveways, entrances, or common areas.'
    ],
    penalty: '₹500 per day fine added directly to flat maintenance account without prior intimation for parking in unauthorized common areas or visitor bays.',
    authority: 'Majestique Euriska Society Management Committee'
  },
  {
    id: 'rule-park-official-2',
    article: 'Circular Notice Cl. 5–8',
    category: 'parking',
    categoryLabel: 'Parking & Main Gate',
    categoryIcon: '🚗',
    title: 'Unauthorized Parking in Another Resident’s Slot',
    severity: 'STRICT',
    timings: 'Prior Permission Mandatory BEFORE Parking',
    daysApplicable: 'All Days',
    summary: 'Parking in another resident’s allotted parking space is STRICTLY PROHIBITED. Prior permission from the respective parking owner or Committee must be obtained BEFORE parking.',
    guidelines: [
      'Parking in another resident’s allotted parking space is STRICTLY PROHIBITED.',
      'Parking in another resident’s allotted space will be permitted ONLY WITH PRIOR PERMISSION from the respective parking owner/resident or the Society Management Committee.',
      'Permission must be obtained BEFORE parking. Assuming permission is available, or taking permission after a complaint is raised, will NOT be considered valid.',
      'If any vehicle is found parked in another resident’s allotted parking space without prior permission, a FINE OF ₹500 PER DAY will be added directly to the concerned flat’s maintenance account.'
    ],
    penalty: 'FINE OF ₹500 PER DAY added directly to concerned flat\'s maintenance account without any prior intimation.',
    authority: 'Society Management Committee & CCTV Vigilance'
  },
  {
    id: 'rule-park-official-3',
    article: 'Circular Notice Cl. 9–11',
    category: 'parking',
    categoryLabel: 'Parking & Main Gate',
    categoryIcon: '🚗',
    title: 'Photo/Video Evidence & Zero Warning Enforcement',
    severity: 'STRICT',
    timings: 'Immediate Imposition of Fine',
    daysApplicable: 'All Days',
    summary: 'Complaints from parking owners or photos/videos shared in society groups are treated as official violation evidence. Penalties apply without warning.',
    guidelines: [
      'A complaint from the respective parking owner or a clear photo/video shared in the society group may be considered as evidence of the violation.',
      'NO separate warning, reminder, or prior intimation will be required before imposing the penalty.',
      'Blocking entrances, driveways, fire access, gates, or other common areas is strictly prohibited and attracts immediate penalty.'
    ],
    penalty: '₹500 per day fine debited to flat maintenance account instantly upon photo/video verification.',
    authority: 'Managing Committee & Security Supervisor'
  },
  {
    id: 'rule-park-main-gate',
    article: 'Circular Notice — Main Gate',
    category: 'parking',
    categoryLabel: 'Parking & Main Gate',
    categoryIcon: '🚫',
    title: 'Main Gate — Absolute No-Parking Zone',
    severity: 'STRICT',
    timings: '24 Hours / Round the Clock',
    daysApplicable: 'All Days (Cars & Two-Wheelers)',
    summary: 'Parking in front of or near the main society gate is strictly prohibited at all times to prevent obstruction of campus entry, exit, and emergency fire vehicles.',
    guidelines: [
      'Parking in front of or near the main society gate is strictly prohibited at all times.',
      'No vehicle, including cars or two-wheelers, may be parked in the main gate area.',
      'Obstruction of emergency ambulances, fire tenders, water tankers, or daily resident flow will be flagged immediately to gate guards.',
      'Any violation will attract the ₹500 per day penalty directly debited to the offending flat.'
    ],
    penalty: '₹500 per day penalty plus wheel clamp / towing at owner cost.',
    authority: 'Security Gate Control Room (Intercom 100)'
  },
  {
    id: 'rule-park-lift-entrance',
    article: 'Notice — Lift & Entrance',
    category: 'parking',
    categoryLabel: 'Parking & Main Gate',
    categoryIcon: '🚫',
    title: 'No Parking Zone: Lift Area & A-Building Entrance',
    severity: 'STRICT',
    timings: '24 Hours / Clear Emergency Access',
    daysApplicable: 'All Days (Two-Wheelers & Cars)',
    summary: 'Strict ban on parking near lift areas and A-Building entrance. Obstruction causes critical delays during medical or fire emergencies.',
    guidelines: [
      'DO NOT PARK near lift area or A-Building entrance at any time.',
      'Obstruction may cause severe delay in medical/fire emergencies and create safety risks for everyone.',
      'In case of emergency: Please ensure you are available nearby, or INFORM SIDDU (MANAGER) IMMEDIATELY.',
      'Safety First: Keep building access clear always.',
      'Violations will attract immediate towing, wheel clamping, and the ₹500/day unauthorized parking fine.'
    ],
    penalty: '₹500 per day penalty debited directly without warning + vehicle towing / wheel clamping at owner expense.',
    authority: 'A Building Committee & Siddu (Manager)'
  },
  {
    id: 'rule-park-two-wheeler-common',
    article: 'Notice — Two-Wheeler Zone',
    category: 'parking',
    categoryLabel: 'Parking & Main Gate',
    categoryIcon: '🛵',
    title: 'Common Parking for Two Wheelers',
    severity: 'HIGH',
    timings: '24 Hours Marked Bays',
    daysApplicable: 'All Days',
    summary: 'Designated common parking zone specifically for two-wheelers. Park responsibly within painted markings without blocking driveways or pedestrian pathways.',
    guidelines: [
      'Two-wheelers must be parked only in designated two-wheeler common parking zones or allotted parking bays.',
      'Never park two-wheelers in car driveways, lift lobbies, ramps, or building entrance aprons.',
      'Keep vehicles locked and parked neatly in rows to maximize access for all residents.'
    ],
    penalty: 'Vehicles parked outside marked two-wheeler zones subject to ₹500/day fine.',
    authority: 'Security Control & Parking Committee'
  },

  // ── 2. CLUBHOUSE & LAWN OFFICIAL GUIDELINES (10-08-2026) ─────────────
  {
    id: 'rule-club-booking-rates',
    article: 'Clubhouse Cl. (a)–(c)',
    category: 'clubhouse',
    categoryLabel: 'Clubhouse & Lawn (10-08-2026)',
    categoryIcon: '🏛️',
    title: 'Club House & Lawn Utilization Charges & Advance Deposit',
    severity: 'HIGH',
    timings: 'Up to 5 Hours: ₹1,000 | Full Day: ₹2,000',
    daysApplicable: 'First Come, First Served Basis',
    summary: 'Club house & lawn area is available for functions/events to individual residents/owners with 100% advance payment to building committee members.',
    guidelines: [
      'Utilization charges for individual residents/owners for celebrations/functions: Rs. 1,000/- (non-refundable) + Rs. 2,000/- (refundable deposit) for up to 5 hours of usage.',
      'If anyone needs clubhouse/lawn area for more than 5 hours, charges are double: Rs. 2,000/- (non-refundable) + Rs. 4,000/- (refundable deposit) up to full 1 day use.',
      'Allotted on first-come-first-served basis with 100% of above amount paid in advance to the respective building committee member(s).',
      'The building committee must inform the common committee to avoid any booking clashes.'
    ],
    penalty: 'Deposit withheld or extra amount debited if premises damaged or returned unclean.',
    authority: 'Building Committee & Common Committee'
  },
  {
    id: 'rule-club-cleanliness-chairs',
    article: 'Clubhouse Cl. (e)–(f)',
    category: 'clubhouse',
    categoryLabel: 'Clubhouse & Lawn (10-08-2026)',
    categoryIcon: '🏛️',
    title: 'AS-IS Clean Handover & Society Chairs Restriction',
    severity: 'STRICT',
    timings: 'Immediate post-event inspection',
    daysApplicable: 'All Private Functions',
    summary: 'Premises must be cleaned and returned in AS-IS condition. Society chairs are strictly barred from being taken to private flats.',
    guidelines: [
      'The premises must be cleaned and given back in AS IS CONDITION after use by residents.',
      'If any damages or unclean area is found, that will be charged extra from the deposit amount or extra amount must be paid by residents for damages/repairs.',
      'Society chairs will NOT be given for any personal use at residents’ homes as they must remain available for people organizing functions in the clubhouse.'
    ],
    penalty: 'Deposit deduction for cleaning charges / repair cost plus forfeiture of future booking rights for repeat offenses.',
    authority: 'Estate Manager & Clubhouse Supervisor'
  },
  {
    id: 'rule-club-food-cooking',
    article: 'Clubhouse Cl. (g)–(h)',
    category: 'clubhouse',
    categoryLabel: 'Clubhouse & Lawn (10-08-2026)',
    categoryIcon: '🏛️',
    title: 'No Eating on Lawn & Strict Cooking Ban',
    severity: 'STRICT',
    timings: 'During all functions and celebrations',
    daysApplicable: 'All Events',
    summary: 'Lawn turf preservation and fire safety: eating on the lawn and live cooking anywhere in clubhouse/lawn are strictly prohibited.',
    guidelines: [
      'Lawn area CANNOT be used for eating during any functions or events.',
      'Cooking is NOT allowed in any portion of the clubhouse or lawn area.',
      'Only normal food heating and microwave warming are permitted.',
      'Live gas cylinders, tandoors, open burners, and fryers are strictly barred.'
    ],
    penalty: 'Immediate stoppage of event and ₹2,000 safety violation fee deducted from security deposit.',
    authority: 'Managing Committee & Fire Safety Officer'
  },
  {
    id: 'rule-club-hours-alcohol-dj',
    article: 'Clubhouse Cl. (i)–(m)',
    category: 'clubhouse',
    categoryLabel: 'Clubhouse & Lawn (10-08-2026)',
    categoryIcon: '🏛️',
    title: 'Timings (11:30 PM), Music Cutoff (10 PM), No Alcohol / DJ / Generator',
    severity: 'STRICT',
    timings: 'Premises till 11:30 PM | Music stops at 10:00 PM Sharp',
    daysApplicable: 'All Events',
    summary: 'Clubhouse allowed till 11:30 PM; music must stop by 10:00 PM per Govt guidelines. Alcohol, smoking, stage, DJ, extra lights, and private generators are strictly prohibited.',
    guidelines: [
      'Clubhouse/lawn area allowed to be used till 11:30 PM.',
      'Music MUST be stopped by 10:00 PM as per Government noise pollution guidelines.',
      'Consumption of alcoholic beverages and smoking is strictly prohibited during any functions or anytime in clubhouse/lawn area.',
      'No one is allowed to set up a stage, DJ, or extra lights for private events in the clubhouse and lawn area.',
      'No external generators are allowed to be used for private functions.',
      'Clubhouse/lawn area will NOT be available for private bookings during common society festivals/functions (Ganesh Utsav, Navratri, Diwali, etc.).'
    ],
    penalty: 'Full forfeiture of deposit (₹2,000 / ₹4,000) and immediate police/security intervention upon noise or liquor breach.',
    authority: 'Common Committee & Pune Police Local Jurisdiction'
  },
  {
    id: 'rule-club-national-days',
    article: 'Clubhouse Cl. (n)',
    category: 'clubhouse',
    categoryLabel: 'Clubhouse & Lawn (10-08-2026)',
    categoryIcon: '🏛️',
    title: 'National Holidays Exemption (15th August & 26th January)',
    severity: 'STANDARD',
    timings: 'Full Day Community Celebration',
    daysApplicable: 'August 15 & January 26',
    summary: 'On Independence Day and Republic Day, there will be no private booking rules in the lawn area; celebrations decided by Common Committee and open to all residents.',
    guidelines: [
      'On August 15 (Independence Day) and January 26 (Republic Day), there will be no private booking rules in the lawn area.',
      'Lawn usage on national holidays will be decided by the Common Committee and will be acceptable to all residents.',
      'Flag hoisting, cultural performances, and community get-togethers take absolute priority.'
    ],
    penalty: 'Private bookings disallowed on these dates.',
    authority: 'Common Committee (Buildings A, B & C)'
  },

  // ── 3. STRICT NO-SMOKING RULE (OFFICIAL CIRCULAR) ────────────────────
  {
    id: 'rule-smoke-official',
    article: 'Circular Notice — No-Smoking',
    category: 'smoking',
    categoryLabel: 'Strict No-Smoking',
    categoryIcon: '🚭',
    title: 'Campus-wide No-Smoking Rule in All Common Areas',
    severity: 'STRICT',
    timings: '24 Hours / Zero Tolerance',
    daysApplicable: 'All Days (Residents, Tenants, Guests, Staff)',
    summary: 'Smoking is strictly prohibited anywhere within society premises and common areas without prior intimation or separate warning.',
    guidelines: [
      'Smoking is strictly prohibited anywhere within society premises and common areas.',
      'Prohibited zones include (but not limited to): Parking areas, Lifts, Lobbies and corridors, Staircases, Gardens, Children’s play area, Clubhouse, Walkways, and all other common areas.',
      'If any resident, tenant, visitor, guest, or staff member is found smoking within society premises, the applicable fine will be imposed WITHOUT PRIOR INTIMATION OR SEPARATE WARNING.',
      'Residents are personally responsible for ensuring that their guests, visitors, tenants, and domestic staff follow these rules.'
    ],
    penalty: 'Fine imposed directly on flat maintenance account without prior warning. CCTV footage logged as evidence.',
    authority: 'Managing Committee & Security CCTV Vigilance'
  },

  // ── 4. EURISKA CULTURAL — FOOD & PRASAD (BILINGUAL) ─────────────────
  {
    id: 'rule-cultural-food',
    article: 'Euriska Cultural Code',
    category: 'cultural',
    categoryLabel: 'Food, Prasad & Cleanliness',
    categoryIcon: '🍛',
    title: 'Don’t Waste Food & Prasad / अन्न व प्रसाद वाया घालवू नका',
    severity: 'HIGH',
    timings: 'All Community Feasts & Daily Living',
    daysApplicable: 'All Days',
    summary: 'Take only what you need (आवश्यक तेवढाच घ्या). Food is precious and an offering. Together we create a cleaner, kinder, and more sustainable Euriska community.',
    guidelines: [
      'Food is Precious (अन्न हे दान आहे) — Treat community food and prasad with reverence.',
      'Take Only What You Need (आवश्यक तेवढाच घ्या) — Serve portions responsibly during community meals, festivals, and celebrations.',
      'Think of Others (इतरांचाही विचार करा) — Ensure sufficient availability for fellow residents, children, seniors, and staff.',
      'No Food Waste (वाया घालवणे टाळा) — Dispose of food waste responsibly; never discard leftover food in common passages, lawn grass, or flower beds.',
      'चला, आपली युरिस्का समाज अधिक स्वच्छ, सद्भावी आणि पर्यावरणपूरक बनवूया (Let\'s make Euriska cleaner, kinder, and more sustainable).'
    ],
    penalty: 'Voluntary community discipline strongly urged by Euriska Cultural Committee.',
    authority: 'Euriska Cultural (Arts • People • Community)'
  },

  // ── 5. FOOTWEAR ETIQUETTE (BILINGUAL) ────────────────────────────────
  {
    id: 'rule-etiquette-footwear',
    article: 'Bylaw Etiquette Notice',
    category: 'etiquette',
    categoryLabel: 'Footwear & Common Areas',
    categoryIcon: '👟',
    title: 'Please Remove Your Footwear Here / कृपया आपले पादत्राणे येथे काढा',
    severity: 'STANDARD',
    timings: 'Upon entry to designated facilities',
    daysApplicable: 'Daily',
    summary: 'Bilingual notice for Clubhouse, Gym, Indoor sports, and Community hall: Remove footwear and place neatly in a row for clean and organized premises.',
    guidelines: [
      'Please Remove Your Footwear Here / कृपया आपले पादत्राणे येथे काढा.',
      'Kindly place them neatly in a row so that it is easier to find them later / कृपया पादत्राणे नीट एका रांगेत ठेवा, जेणेकरून नंतर ती सहजपणे शोधता येतील.',
      'Do not scatter footwear across entrances or doorway ramps.',
      'Personal shoe racks must not encroach corridor walking fire paths.'
    ],
    penalty: 'Housekeeping repositioning fee and formal hallway clearance notice.',
    authority: 'Housekeeping & Facility Management'
  },

  // ── 6. WATER CRISIS & TANKER RULES (OFFICIAL CIRCULARS) ──────────────
  {
    id: 'rule-water-tap-flush-penalty',
    article: 'Notice — Tap & Flush Water',
    category: 'water_crisis',
    categoryLabel: 'Water Crisis & Tanker Penalties',
    categoryIcon: '💧',
    title: 'Tap Water & Flush Water Wastage — Tanker Cost Debited to Flat',
    severity: 'STRICT',
    timings: '24 Hours / Critical Water Shortage',
    daysApplicable: 'All Days (Buildings A, B & C)',
    summary: 'Ongoing severe water crisis advisory: Close taps properly, inspect flush tanks for continuous leaks, double-check kitchens/washrooms. Water wastage/negligence will result in direct debit of entire tanker cost to the flat\'s maintenance bill.',
    guidelines: [
      'We are facing ongoing issues with tap water and flush water due to the current water shortage.',
      'Careless usage is making the situation worse and affecting everyone, especially senior citizens and children.',
      'Please ensure taps are closed properly after every use in bathrooms, basins, and kitchens.',
      'Check flush tanks to avoid continuous unmonitored water flow or float valve leaks.',
      'Double-check before leaving the washroom or kitchen.',
      'If any water wastage or negligence is found from a flat, the TANKER COST will be directly added to that resident’s maintenance bill.'
    ],
    penalty: '100% of Tanker cost directly added to flat’s maintenance bill upon negligence or overflow.',
    authority: 'A Building Committee & Society Management'
  },
  {
    id: 'rule-water-severe-crisis',
    article: 'Notice — Water Crisis & Vendors',
    category: 'water_crisis',
    categoryLabel: 'Water Crisis & Tanker Penalties',
    categoryIcon: '💧',
    title: 'City Water Crisis, Tanker Territories & Monsoon Quality Constraints',
    severity: 'HIGH',
    timings: 'Monsoon & Summer Water Supply Protocol',
    daysApplicable: 'All Residents (A, B & C Buildings)',
    summary: 'The city is currently facing a severe water crisis. Tanker vendors operate strictly in divided operational territories preventing alternative sourcing. Continuous water availability is the primary focus. Contact Siddu (Manager) for details.',
    guidelines: [
      'The city is currently facing a SEVERE WATER CRISIS; maintaining adequate water supply is a major daily challenge managed actively by A, B, and C Building committees.',
      'Tanker vendors have DIVIDED OPERATIONAL TERRITORIES among themselves and do not supply outside their designated areas — arranging alternative vendors is practically unfeasible.',
      'During the monsoon season, tanker operators collect water from varied available sources; the society does not have direct control over water quality but utilizes it for essential needs.',
      'If you require detailed information regarding the situation, tanker availability, vendor limitations, or supply arrangements, please CONTACT THE SOCIETY MANAGER (SIDDU) DIRECTLY.',
      'The committee’s PRIMARY FOCUS is to ensure continuous water availability for all residents.'
    ],
    penalty: 'Essential conservation protocol strictly enforced across all towers.',
    authority: 'Managing Committee & Siddu (Manager)'
  },

  // ── 7. CORRIDOR & LOBBY SPORTS POLICY (CCTV ENFORCED) ─────────────────
  {
    id: 'rule-corridor-football-cctv',
    article: 'Notice — Indoor Corridor Play',
    category: 'sports_play',
    categoryLabel: 'Corridor Play & CCTV Ban',
    categoryIcon: '⚽',
    title: 'Ban on Football & Activities in Corridors/Lobby — CCTV Enforced Fine',
    severity: 'STRICT',
    timings: '24 Hours / 24x7 CCTV Monitored',
    daysApplicable: 'All Days',
    summary: 'NOT ALLOWED to play football or any activities in corridors, lobbies, and entrance passages. CCTV cameras installed for instant identification. Violations and damage to glass, tiles, lights, or common property attract fines and repair charges.',
    guidelines: [
      'NOT ALLOWED TO PLAY FOOTBALL OR ANY ACTIVITY in corridors, entrance lobbies, staircases, and lift areas.',
      'CCTV CAMERAS INSTALLED — Security can easily identify who is playing in these common indoor areas.',
      'Damage to glass, tiles, lights, or common property leads to severe safety issues and high repair costs.',
      'FIRST WARNING TO ALL RESIDENTS: If anyone is found playing or causing damage in this area, FINE / PENALTY WILL BE IMPOSED by the society committee.',
      'Children must use the dedicated outdoor children\'s playground for all ball games and running sports.',
      'Kindly cooperate and help maintain the premises properly.'
    ],
    penalty: 'Fine / Penalty imposed by society committee + 100% cost of glass/tile/light repairs debited to offending flat.',
    authority: 'Society Management Committee & CCTV Vigilance'
  },

  // ── 8. SWIMMING POOL OFFICIAL RULES & REGULATIONS ───────────────────
  {
    id: 'rule-pool-slots-timings',
    article: 'Pool Notice Cl. 17 & Timings',
    category: 'swimming',
    categoryLabel: 'Swimming Pool & Timings',
    categoryIcon: '🏊‍♂️',
    title: 'Pool Timings, Dedicated Slots & Thursday Maintenance Closure',
    severity: 'STRICT',
    timings: '6:00 AM – 11:00 AM (All) | 1:00 PM – 4:00 PM (Kids & Ladies) | 4:00 PM – 7:00 PM (Winter) / 8:00 PM (Summer)',
    daysApplicable: 'Friday to Wednesday (Strictly Closed Thursdays)',
    summary: 'Daily structured slots: 6–11 AM general, 11 AM–1 PM cleaning, 1–4 PM kids (up to 12 yrs) and ladies only, 4–7 PM (winter) / 8 PM (summer) general. Pool is strictly closed every Thursday for maintenance.',
    guidelines: [
      '06:00 am to 11:00 am – For All Residence.',
      '11:00 am to 01:00 pm – For Cleaning & Chemical Filtration.',
      '01:00 pm to 04:00 pm – Dedicated slot for Kids (up to 12 years during this slot) and Ladies.',
      '04:00 pm to 07:00 pm – For All Residence in winter, and extended up to 8:00 pm in summer.',
      'The swimming pool will remain CLOSED ON THURSDAY for maintenance.',
      'Strict adherence to assigned time slots is mandatory to maintain water quality and pool capacity.'
    ],
    penalty: 'Eviction from pool area outside designated slot; suspension of pool privileges for repeated timing breaches.',
    authority: 'Majestique Euriska Common Committee'
  },
  {
    id: 'rule-pool-costume-hygiene',
    article: 'Pool Notice Cl. 3–11',
    category: 'swimming',
    categoryLabel: 'Swimming Pool & Timings',
    categoryIcon: '🏊‍♂️',
    title: 'Compulsory Swimwear & Cap, Pre-Shower, No Cotton Wear & Safety',
    severity: 'STRICT',
    timings: 'Prior to & during pool usage',
    daysApplicable: 'All Days',
    summary: 'Compulsory swimming costume and pool cap before entering. Cotton clothes, pants, and bermudas strictly prohibited. Shower mandatory before entering pool. Footwear, diving, food, drinks, smoking, and pets strictly banned.',
    guidelines: [
      'Ensure proper swimwear before entering the pool. Swimming costume and pool cap is COMPULSORY before entering the pool; failing to do so will result in the member NOT being allowed to swim.',
      'DO NOT swim using Cotton Wear, Pants, or Bermudas in the pool.',
      'It is MANDATORY to take a shower before entering the pool.',
      'Footwear is NOT allowed in the swimming pool area.',
      'Parents should STRICTLY accompany their children in the swimming pool.',
      'Members suffering from skin diseases or illness should NOT enter the pool.',
      'Diving is NOT permitted in the pool, as the depth is inappropriate for diving.',
      'Foods, drinks, and smoking are strictly not permitted within the pool premises.',
      'Pets are STRICTLY NOT ALLOWED in the pool area.',
      'Members are advised to swim entirely at their own risk; the Managing Committee is not responsible for any untoward incident.'
    ],
    penalty: 'Immediate denial of entry / eviction from pool area by pool guard if costume, cap, or shower requirements are not met.',
    authority: 'Designated Security Guard & Common Committee'
  },
  {
    id: 'rule-pool-eligibility-bachelors',
    article: 'Pool Notice Cl. 1–2, 12–16',
    category: 'swimming',
    categoryLabel: 'Swimming Pool & Timings',
    categoryIcon: '🏊‍♂️',
    title: 'Member Eligibility, Bachelor & Guest Prohibition, Register & Dues Clearance',
    severity: 'STRICT',
    timings: 'Upon entry to pool deck',
    daysApplicable: 'All Days',
    summary: 'Pool can be used by members residing in society including family tenants (Bachelors and outside friends are strictly not allowed). Register entry mandatory. Residents with pending dues barred from swimming.',
    guidelines: [
      'Swimming pool can be used by members residing in society including tenants (BACHELORS ARE NOT ALLOWED).',
      'Friends of any residents/tenants are STRICTLY NOT ALLOWED.',
      'Designated Security Guard will maintain a REGISTER for members entry in the pool; kindly cooperate and log flat number.',
      'Do not argue with the guard on duty; in case of any doubt, kindly reach out to the Managing Committee.',
      'Residents with PENDING MAINTENANCE DUES will NOT be allowed to swim until dues are cleared.',
      'Unauthorized Coaching: Any coaching or training sessions are NOT allowed unless approved by the Majestique Euriska Common Committee.',
      'In case of frequent breach of rules, the committee will be forced to penalize or not allow the member to use the facility.'
    ],
    penalty: 'Access barred for bachelors, outside guests, or flats with outstanding maintenance dues.',
    authority: 'Majestique Euriska Common Committee'
  },

  // ── 9. TABLE TENNIS OFFICIAL RULES & REGULATIONS (ORDER 1/0049) ─────
  {
    id: 'rule-tt-general-format',
    article: 'TT Order 1/0049 Cl. 1–14',
    category: 'table_tennis',
    categoryLabel: 'Table Tennis (24 Bylaws)',
    categoryIcon: '🏓',
    title: 'Table Tennis: Equipment, 30-Min Queue Limit, Gym Hours, No AC & Register',
    severity: 'STRICT',
    timings: 'Mon–Fri: 6:00–11:00 AM & 5:00–9:30 PM | Sat–Sun: 6:00 AM – 9:30 PM',
    daysApplicable: 'All Days (Euriska Managing Committee Order (1)/0049)',
    summary: 'Bring own rackets & balls (society will not provide); 11-point standard format; max 30-minute queue limit; age 12+ only; non-spike shoes or barefoot; guard register mandatory; AC strictly prohibited during play; max 10 players.',
    guidelines: [
      'Equipment Requirements: Participants are required to bring their own TT rackets and balls, as the society will not provide these items. Only recognized TT rackets and TT balls will be allowed.',
      'Shoes: Players should wear non-spike shoes or play barefoot to prevent floor damage.',
      'Game Format: 11 points game will be the standard format.',
      'Queue Limit: If there are players waiting in queue, the MAXIMUM PLAYING TIME will be 30 minutes for 2/4 players.',
      'Age Limit: 12 years and above only.',
      'Timings: Aligned with Gym Timings — 6:00 am to 11:00 am and 5:00 pm to 9:30 pm (Mon–Fri); Saturday and Sunday: Morning 6:00 am to Night 9:30 pm.',
      'Capacity: A maximum of 10 players are allowed on the premises at a time.',
      'Guard Register: A register will be maintained by the common guard, and players must enter their name and flat number before playing. No arguments with the guard will be entertained.',
      'Air Conditioning (AC) Ban: AC is NOT allowed during game play. Violators may face penalties or be prohibited from playing.',
      'Lights: Lights should only be switched on in the evening as required (subject to actual playing conditions and discussions with committee).',
      'Food & Beverages: No smoking and no food items are allowed. Only drinking water bottles are permitted, and they must be placed on the floor — NOT on the TT table.',
      'Clubhouse Bookings: Euriska Common Committee must be informed 24 hours in advance for clubhouse bookings requiring table removal. Designated committee members, with security guards\' help, will fold and move the table.',
      'Eligibility: Only Euriska residents and tenants are allowed to play. Guests, relatives, and friends are NOT allowed.',
      'Maintenance Dues: Residents with pending maintenance dues will NOT be allowed to play until dues are cleared.',
      'No Pets: No pets are allowed inside the clubhouse.'
    ],
    penalty: 'Players held financially responsible for damages caused to table or premises during play and must cover 100% repair costs.',
    authority: 'Euriska Managing Committee (By Order)'
  },
  {
    id: 'rule-tt-conduct-fairplay',
    article: 'TT Order 1/0049 Cl. 15–24',
    category: 'table_tennis',
    categoryLabel: 'Table Tennis (24 Bylaws)',
    categoryIcon: '🏓',
    title: 'Table Tennis: Decorum, Fair Rotation, No Leaning on Table & Anti-Gambling',
    severity: 'HIGH',
    timings: 'During all TT matches',
    daysApplicable: 'All Days',
    summary: 'Noise control, sports dress code (no slippers/sandals/formals), fair queue rotation, no sitting/leaning on the table, no unauthorized coaching, no betting/gambling, and temporary suspensions for misconduct.',
    guidelines: [
      'Noise Control: Players should maintain decorum and avoid excessive shouting or loud noises that may disturb other residents.',
      'Dress Code: Players should wear appropriate sportswear while playing. Playing in slippers, sandals, or formal shoes is not allowed.',
      'Fair Play: Any form of cheating, misbehavior, or arguments during matches will lead to warnings or temporary bans from playing.',
      'Queue System: If multiple players are waiting, they must form a queue and follow a fair rotation system as monitored by the security guard.',
      'No Hanging or Leaning on Table: Players should NOT sit, lean, or place excessive weight on the TT table to prevent damage.',
      'Unauthorized Coaching: Coaching or training sessions are not allowed unless approved by the Euriska Common Committee.',
      'Reporting Issues: Any issues with the TT table, equipment, or violations of rules should be reported to the Euriska Common Committee.',
      'Mobile Phone Usage: Players should avoid excessive mobile phone usage while playing to ensure smooth game flow.',
      'No Gambling: Betting or gambling in any form related to TT games is STRICTLY PROHIBITED.',
      'Temporary Bans for Misconduct: Players who repeatedly violate rules may face temporary suspension from playing, as decided by the Euriska Common Committee.'
    ],
    penalty: 'Warning, temporary suspension from sports facility, and debarment for repeated misconduct.',
    authority: 'Euriska Managing Committee'
  },

  // ── 10. RENOVATION & DRILLING HOURS ──────────────────────────────────
  {
    id: 'rule-renov-1',
    article: 'Article 1.1',
    category: 'renovation',
    categoryLabel: 'Renovation & Drilling',
    categoryIcon: '🔨',
    title: 'Drilling & Heavy Construction Hours',
    severity: 'STRICT',
    timings: 'Mon – Sat: 10:00 AM – 1:00 PM & 3:00 PM – 6:00 PM only',
    daysApplicable: 'Monday to Saturday only (Strictly NO Sundays / Public Holidays)',
    summary: 'Heavy noisy work (drilling, wall chiseling, tile cutting, hammer blows) is restricted to defined time slots to maintain peace for work-from-home residents, senior citizens, and children.',
    guidelines: [
      'Drilling and hammering allowed strictly between 10:00 AM – 1:00 PM and 3:00 PM – 6:00 PM.',
      'Absolute prohibition on Sundays, National Holidays, and Festival days.',
      'Light non-noisy interior work (painting, measurements, electrical wiring) permitted 9:00 AM – 7:00 PM.',
      'Flat owners must inform adjacent neighbors before starting extensive core cutting.'
    ],
    penalty: '₹1,000 fine for 1st offense; ₹2,500 fine and immediate electricity disconnection for tools on repeat offense.',
    authority: 'Estate Manager & Security Gate Intercom'
  },

  // ── 9. PETS & ANIMAL WELFARE ─────────────────────────────────────────
  {
    id: 'rule-pet-1',
    article: 'Article 4.1',
    category: 'pets',
    categoryLabel: 'Pets & Animals',
    categoryIcon: '🐾',
    title: 'Mandatory Leash & Elevator Etiquette',
    severity: 'STRICT',
    timings: '24 Hours in all common areas',
    daysApplicable: 'All Days',
    summary: 'Majestique Euriska is a pet-friendly community. To ensure harmony, all pets must be responsibly managed in shared spaces.',
    guidelines: [
      'Dogs and pets must ALWAYS be on a secure short leash in elevators, corridors, lobbies, and podium pathways.',
      'When entering an elevator, pet owners must check if fellow passengers are comfortable sharing the cabin. Yield if requested by children or senior citizens.',
      'Mandatory poop-scoop: Pet handlers must carry waste bags and immediately clean up after their pets.',
      'Allowing pets on children’s play area turf or clubhouse furniture is strictly barred.'
    ],
    penalty: '₹500 penalty per violation of off-leash policy; ₹1,000 fine for uncleaned pet feces.',
    authority: 'Security Guards & Estate Manager'
  },

  // ── 10. SHIFTING & MOVE-IN / NOC ─────────────────────────────────────
  {
    id: 'rule-shift-1',
    article: 'Article 6.1',
    category: 'shifting',
    categoryLabel: 'Shifting & Move-In',
    categoryIcon: '📦',
    title: 'Advance Intimation & Permitted Shifting Hours',
    severity: 'STRICT',
    timings: '9:00 AM to 7:00 PM Only (No night shifting)',
    daysApplicable: 'Monday to Saturday (No shifting on major festivals)',
    summary: 'Moving in or moving out requires planned logistics to prevent lift breakdown and hallway disruption.',
    guidelines: [
      '48 hours advance written intimation must be submitted to the Estate Manager.',
      'Shifting activities (loading/unloading trucks) permitted strictly between 9:00 AM and 7:00 PM.',
      'Move-in / Move-out refundable security deposit of ₹5,000 must be deposited prior to vehicle gate entry.',
      'Elevator protective foam padding must be hung inside the service elevator before loading starts.'
    ],
    penalty: 'Shifting trucks arriving after 7:00 PM parked outside gate until 9:00 AM next day.',
    authority: 'Estate Manager & Gate Security'
  },

  // ── 11. DUES & BILLING ───────────────────────────────────────────────
  {
    id: 'rule-fin-1',
    article: 'Article 7.1',
    category: 'finance',
    categoryLabel: 'Dues & Maintenance',
    categoryIcon: '💳',
    title: 'Maintenance Due Dates & Grace Period',
    severity: 'HIGH',
    timings: 'Due on 10th of every month | Grace period till 20th',
    daysApplicable: 'Monthly Cycle',
    summary: 'Prompt contribution of maintenance funds ensures seamless operation of lifts, water pumps, diesel generators, and 24x7 security.',
    guidelines: [
      'Monthly maintenance bills are generated on the 1st of every calendar month and due by the 10th.',
      'Grace period is provided until the 20th of the month.',
      'Payment options: Direct NEFT/RTGS/IMPS to Society Bank Account or secure payment gateway citing Flat Number.',
      'Simple interest of 18% per annum charged on outstanding balances after the 20th of each month.'
    ],
    penalty: '18% p.a. interest / ₹100 per month late fee past grace period as per MCS Act Model Bylaws.',
    authority: 'Treasurer & Accounts Office'
  }
];

export const QUICK_CONTACTS = [
  {
    role: 'Society Manager',
    name: 'Siddu (Manager)',
    contact: '+91 98220 12345',
    available: 'On-site Daily (Direct Inquiries & Water Arrangements)',
    icon: '👔',
    action: 'tel:+919822012345'
  },
  {
    role: 'Security Main Gate',
    name: 'Gate Control Room (Intercom 100)',
    contact: '020-2680-1100',
    available: '24x7 Round the Clock',
    icon: '🛡️',
    action: 'tel:02026801100'
  },
  {
    role: 'Society Secretary',
    name: 'Amit Singh (Managing Committee)',
    contact: 'majestiqueeuriska.a@gmail.com',
    available: 'Evenings & Weekends',
    icon: '📜',
    action: 'mailto:majestiqueeuriska.a@gmail.com'
  },
  {
    role: 'Emergency Police / Ambulance',
    name: 'National Emergency Response System',
    contact: '112',
    available: '24x7 Immediate Dispatch',
    icon: '🚨',
    action: 'tel:112'
  }
];
