/**
 * Water Tank Management Data Specifications
 * Majestique Euriska Co-Op Housing Society
 *
 * Source: Official Architectural Layout & Invoices
 * Total Storage Capacity: 539,400 Litres
 */

export const SOCIETY_WATER_SUMMARY = {
  totalCapacityLitres: 539400,
  domesticUndergroundLitres: 225000,
  fireFightingReserveLitres: 100000,
  undergroundTotalLitres: 325000,
  aBuildingOverheadLitres: 75800,
  bBuildingOverheadLitres: 88600,
  cBuildingOverheadLitres: 50000, // Invoice capacity: 50,000 L (50,600 L terrace label)
  overheadTotalLitres: 214400,
  averageDailyConsumptionLitres: 82000,
  flatsCount: 231,
  buildingFlats: {
    a: 87,
    b: 96,
    c: 48,
    total: 231
  },
  wings: ['Wing A (87 Flats)', 'Wing B (96 Flats)', 'Wing C (48 Flats)']
};

export const WATER_TANKS_DATA = {
  common_underground: {
    id: 'common_underground',
    name: 'Common Water Tank (Underground Sump)',
    shortName: 'Common Underground Sump',
    building: 'Central Sub-surface',
    location: 'Between A & B Building, adjacent to Kids Play Area & MP Theater',
    capacity: 325000,
    currentLevelPct: 84,
    currentLitres: 273000,
    tankType: 'RCC Reinforced Underground Sump (4 Compartments)',
    tanksCount: 4,
    color: '#0284c7',
    gradient: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
    icon: '💧',
    chambers: [
      { name: 'Domestic Sump Compartment 1', capacity: 112500, currentPct: 85, purpose: 'Treated Potable / Municipal & Tanker Water' },
      { name: 'Domestic Sump Compartment 2', capacity: 112500, currentPct: 83, purpose: 'Treated Potable / Municipal & Tanker Water' },
      { name: 'Dedicated Fire Fighting Reserve', capacity: 100000, currentPct: 100, purpose: 'Mandatory Fire Safety Hydrant & Sprinkler System (Locked)' },
      { name: 'Decanting & Grit Settling Chamber', capacity: 20000, currentPct: 65, purpose: 'Initial Tanker Inflow Sediment Settling & Screening' }
    ],
    pumps: [
      { id: 'PUMP-01', name: 'Booster Pump 1 (CRI 10 HP Multi-Stage)', status: 'Running', flowRateM3Hr: 24, lastService: '2026-08-15', currentAmps: 14.2 },
      { id: 'PUMP-02', name: 'Booster Pump 2 (CRI 10 HP Multi-Stage)', status: 'Standby', flowRateM3Hr: 24, lastService: '2026-08-15', currentAmps: 0 },
      { id: 'PUMP-FIRE', name: 'Jockey & Diesel Fire Hydrant Pump', status: 'Ready / Armed', flowRateM3Hr: 45, lastService: '2026-07-20', currentAmps: 0 }
    ],
    inflowSources: ['Municipal Pipeline (PCMC/Grampanchayat)', 'Water Tankers (Decanting Station)'],
    outflowTo: ['A Building Overhead Tank', 'B Building Overhead Tank', 'C Building Overhead Tank', 'Fire Ring Main'],
    sensorTelemetry: {
      depthMeters: 4.8,
      currentDepthMeters: 4.03,
      sensorType: 'Hydrostatic Pressure Transducer + Ultrasonic Backup',
      batteryHealth: '100% (AC Powered)',
      lastSync: 'Live (Updated 2m ago)'
    },
    cleaningInfo: {
      lastCleaned: '2026-04-12',
      nextDue: '2026-10-12',
      vendor: 'AquaPure Systems & Sanitization Ltd.',
      supervisor: 'Suresh Patil (Site Engg.)',
      status: 'Clean & Certified',
      tdsPpm: 142,
      phValue: 7.3
    }
  },

  a_building: {
    id: 'a_building',
    name: 'A Building Overhead Tank',
    shortName: 'A Building OHT',
    building: 'A Building',
    location: 'Terrace Roof Top (11th Floor)',
    capacity: 75800,
    currentLevelPct: 82,
    currentLitres: 62156,
    tankType: 'Multi-layer Heavy Duty Overhead Water Tanks',
    tanksCount: 6,
    color: '#2563eb',
    gradient: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
    icon: '🏢',
    chambers: [
      { name: 'Unit 1 (30,700 L - 2 in 1)', capacity: 30700, currentPct: 84, purpose: 'Domestic Main Storage (2 in 1 Combined)', cleaningCost: 1400, effectiveRatePer1kL: 45.60 },
      { name: 'Unit 2 (23,400 L)', capacity: 23400, currentPct: 82, purpose: 'Domestic Secondary Reservoir', cleaningCost: 1000, effectiveRatePer1kL: 42.74 },
      { name: 'Unit 3 (8,500 L)', capacity: 8500, currentPct: 80, purpose: 'Domestic Top-up Battery', cleaningCost: 700, effectiveRatePer1kL: 82.35 },
      { name: 'Unit 4 (7,000 L)', capacity: 7000, currentPct: 79, purpose: 'Flushing Dual Plumbing Unit', cleaningCost: 700, effectiveRatePer1kL: 100.00 },
      { name: 'Unit 5 (3,900 L)', capacity: 3900, currentPct: 85, purpose: 'Flushing Aux Storage', cleaningCost: 700, effectiveRatePer1kL: 179.49 },
      { name: 'Unit 6 (2,300 L)', capacity: 2300, currentPct: 78, purpose: 'Refuge & Fire Gravity Header', cleaningCost: 600, effectiveRatePer1kL: 260.87 }
    ],
    pumps: [
      { id: 'A-PUMP-IN', name: 'Riser Inlet Solenoid Valve', status: 'Open', autoControlled: true }
    ],
    inflowSources: ['Underground Common Sump (via 75mm Riser Pipe)'],
    flatsCount: 87,
    outflowTo: ['Wing A Flats (87 Flats, 11 Floors: A-101 to A-1108) via Dual Downcomers'],
    sensorTelemetry: {
      depthMeters: 2.4,
      currentDepthMeters: 1.97,
      sensorType: 'Multi-point Magnetic Float Level Switches',
      batteryHealth: '98%',
      lastSync: 'Live (Updated 4m ago)'
    },
    cleaningInfo: {
      lastCleaned: '2026-05-18',
      nextDue: '2026-11-18',
      vendor: 'AquaPure Systems & Sanitization Ltd.',
      supervisor: 'Mahesh Jadhav',
      status: 'Clean & Certified',
      tdsPpm: 138,
      phValue: 7.2,
      cleaningBill: 5100,
      billPer1kL: 67.28
    }
  },

  b_building: {
    id: 'b_building',
    name: 'B Building Overhead Tank',
    shortName: 'B Building OHT',
    building: 'B Building',
    location: 'Terrace Roof Top (11th Floor)',
    capacity: 88600,
    currentLevelPct: 78,
    currentLitres: 69108,
    tankType: 'Multi-layer Heavy Duty Overhead Water Tanks (6 Units)',
    tanksCount: 6,
    color: '#0284c7',
    gradient: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)',
    icon: '🏢',
    chambers: [
      { name: 'Unit 1 (30,700 L - 2 in 1)', capacity: 30700, currentPct: 80, purpose: 'Domestic Main Storage (2 in 1 Combined)', cleaningCost: 1500, effectiveRatePer1kL: 48.86 },
      { name: 'Unit 2 (28,200 L)', capacity: 28200, currentPct: 78, purpose: 'Domestic Secondary Reservoir', cleaningCost: 900, effectiveRatePer1kL: 31.91 },
      { name: 'Unit 3 (11,800 L)', capacity: 11800, currentPct: 76, purpose: 'Domestic Booster Battery', cleaningCost: 700, effectiveRatePer1kL: 59.32 },
      { name: 'Unit 4 (7,900 L)', capacity: 7900, currentPct: 75, purpose: 'Flushing Dual Plumbing Battery', cleaningCost: 700, effectiveRatePer1kL: 88.61 },
      { name: 'Unit 5 (5,000 L)', capacity: 5000, currentPct: 77, purpose: 'Flushing Unit A', cleaningCost: 700, effectiveRatePer1kL: 140.00 },
      { name: 'Unit 6 (5,000 L)', capacity: 5000, currentPct: 75, purpose: 'Flushing Unit B', cleaningCost: 700, effectiveRatePer1kL: 140.00 }
    ],
    pumps: [
      { id: 'B-PUMP-IN', name: 'Riser Inlet Solenoid Valve', status: 'Standby', autoControlled: true }
    ],
    inflowSources: ['Underground Common Sump (via 75mm Riser Pipe)'],
    flatsCount: 96,
    outflowTo: ['Wing B Flats (96 Flats, 11 Floors) via Dual Downcomers'],
    sensorTelemetry: {
      depthMeters: 2.5,
      currentDepthMeters: 1.95,
      sensorType: 'Multi-point Magnetic Float Level Switches',
      batteryHealth: '96%',
      lastSync: 'Live (Updated 3m ago)'
    },
    cleaningInfo: {
      lastCleaned: '2026-05-19',
      nextDue: '2026-11-19',
      vendor: 'AquaPure Systems & Sanitization Ltd.',
      supervisor: 'Mahesh Jadhav',
      status: 'Clean & Certified',
      tdsPpm: 140,
      phValue: 7.3,
      cleaningBill: 5200,
      billPer1kL: 58.69
    }
  },

  c_building: {
    id: 'c_building',
    name: 'C Building Overhead Tank',
    shortName: 'C Building OHT',
    building: 'C Building',
    location: 'Terrace Roof Top (11th Floor)',
    capacity: 50000,
    labelCapacity: '50,000 Litres (Invoice: 50,000 L / 50,600 L Label)',
    currentLevelPct: 75,
    currentLitres: 37500,
    tankType: 'Multi-layer Heavy Duty Overhead Water Tanks (4 Units)',
    tanksCount: 4,
    color: '#059669',
    gradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    icon: '🏢',
    chambers: [
      { name: 'Unit 1 (22,000 L)', capacity: 22000, currentPct: 76, purpose: 'Domestic Main Storage', cleaningCost: 900, effectiveRatePer1kL: 40.91 },
      { name: 'Unit 2 (14,000 L)', capacity: 14000, currentPct: 74, purpose: 'Domestic Secondary Battery', cleaningCost: 900, effectiveRatePer1kL: 64.29 },
      { name: 'Unit 3 (9,000 L)', capacity: 9000, currentPct: 75, purpose: 'Flushing Primary Unit', cleaningCost: 700, effectiveRatePer1kL: 77.78 },
      { name: 'Unit 4 (5,000 L)', capacity: 5000, currentPct: 73, purpose: 'Flushing Secondary Unit', cleaningCost: 700, effectiveRatePer1kL: 140.00 }
    ],
    pumps: [
      { id: 'C-PUMP-IN', name: 'Riser Inlet Solenoid Valve', status: 'Standby', autoControlled: true }
    ],
    inflowSources: ['Underground Common Sump (via 65mm Riser Pipe)'],
    flatsCount: 48,
    outflowTo: ['Wing C Flats (48 Flats, 11 Floors) via Dual Downcomers'],
    sensorTelemetry: {
      depthMeters: 2.2,
      currentDepthMeters: 1.65,
      sensorType: 'Multi-point Magnetic Float Level Switches',
      batteryHealth: '94%',
      lastSync: 'Live (Updated 5m ago)'
    },
    cleaningInfo: {
      lastCleaned: '2026-05-20',
      nextDue: '2026-11-20',
      vendor: 'AquaPure Systems & Sanitization Ltd.',
      supervisor: 'Mahesh Jadhav',
      status: 'Clean & Certified',
      tdsPpm: 139,
      phValue: 7.2,
      cleaningBill: 3200,
      billPer1kL: 64.00
    }
  }
};

export const ANCILLARY_WATER_INFRASTRUCTURE = [
  {
    id: 'stp',
    name: 'Sewage Treatment Plant (STP)',
    code: 'STP-75KLD',
    type: 'Eco-Fluidized Bed Bio-Reactor (FAB)',
    capacity: '75,000 Litres/Day (75 KLD)',
    status: 'Operational (Aeration Active)',
    treatedWaterOutput: 'Flushing Line & Landscape Drip Irrigation',
    location: 'Ground level, West Boundary driveway near OWC',
    color: '#16a34a',
    metrics: { bodOutput: '< 10 mg/L', codOutput: '< 50 mg/L', turbidity: '< 2 NTU' }
  },
  {
    id: 'owc',
    name: 'Organic Waste Composting (OWC)',
    code: 'OWC-200KG',
    type: 'Aerobic Solid Waste Composter',
    capacity: '200 Kg / Day Compost Generation',
    status: 'Active',
    location: 'Adjacent to STP along the west driveway',
    color: '#65a30d',
    metrics: { dailyProcessing: '185 Kg', cycleTime: '14 Days' }
  },
  {
    id: 'clubhouse_pool',
    name: 'Club House Swimming Pool & Filtration',
    code: 'POOL-RES',
    type: 'Infinity Edge Leisure Pool & Sand Filtration Plant',
    capacity: '85,000 Litres',
    status: 'Filtered & Chlorinated (0.8 ppm)',
    location: 'Central Amenity Block opposite B & C Buildings',
    color: '#06b6d4',
    metrics: { ph: 7.4, chlorine: '0.8 ppm', temp: '27°C' }
  },
  {
    id: 'tanker_inlet',
    name: 'Main Tanker Decanting Bay',
    code: 'INLET-BAY',
    type: 'Dual 4-inch Camlock Couplers with Sand Trap Filter',
    capacity: 'Up to 2 Tankers Simultaneously (15,000 L / 20 mins)',
    status: 'Ready for Decanting',
    location: 'Main Gate inner driveway (North entrance)',
    color: '#f59e0b',
    metrics: { deliveryTimeAvg: '22 mins', strainerMesh: '60 Mesh Stainless' }
  },
  {
    id: 'dg_backup',
    name: '125 KVA DG Generator Backup',
    code: 'DG-PUMP-AUTO',
    type: 'Auto Mains Failure (AMF) Diesel Generator',
    capacity: '125 KVA (Dedicated pump & lift power)',
    status: 'Auto-Standby (Diesel Tank 88% Full)',
    location: 'South-East Corner near C Building',
    color: '#d97706',
    metrics: { startDelay: '8 secs', dieselReserve: '320 Litres' }
  }
];

export const WATER_SUPPLY_SCHEDULES = [
  {
    wing: 'All Wings (A, B, C)',
    session: 'Morning Supply',
    time: '06:00 AM – 09:30 AM',
    duration: '3h 30m',
    target: 'Full Kitchen, Bath & Domestic Lines',
    boosterPumpSchedule: '05:30 AM – 07:00 AM (Top up to 95%)'
  },
  {
    wing: 'All Wings (A, B, C)',
    session: 'Afternoon Flow (Continuous Gravity)',
    time: '01:00 PM – 02:30 PM',
    duration: '1h 30m',
    target: 'Domestic Kitchen & General Washing',
    boosterPumpSchedule: 'Auto Float Triggered if OHT < 60%'
  },
  {
    wing: 'All Wings (A, B, C)',
    session: 'Evening Supply',
    time: '06:00 PM – 09:30 PM',
    duration: '3h 30m',
    target: 'Full Society Domestic Flow',
    boosterPumpSchedule: '05:00 PM – 06:30 PM (Evening Top-up)'
  },
  {
    wing: 'Flushing (Dual Line)',
    session: '24/7 Continuous (STP Recycled + Raw)',
    time: '24 Hours Constant Head',
    duration: '24h',
    target: 'All Flat Toilets (Restricted Overhead Battery)',
    boosterPumpSchedule: 'Automatic Solenoid Level Maintenance'
  }
];

export const WATER_QUALITY_TEST_RESULTS = [
  { parameter: 'Total Dissolved Solids (TDS)', value: '142 ppm', acceptableLimit: '< 300 ppm (Excellent)', status: 'Pass', safe: true },
  { parameter: 'pH Level', value: '7.3', acceptableLimit: '6.5 – 8.5', status: 'Pass', safe: true },
  { parameter: 'Turbidity', value: '0.8 NTU', acceptableLimit: '< 5.0 NTU', status: 'Pass', safe: true },
  { parameter: 'Residual Chlorine', value: '0.2 mg/L', acceptableLimit: '0.2 – 0.5 mg/L', status: 'Pass', safe: true },
  { parameter: 'Total Hardness (as CaCO3)', value: '120 mg/L', acceptableLimit: '< 200 mg/L (Soft-Moderate)', status: 'Pass', safe: true },
  { parameter: 'E. Coli / Coliform Bacteria', value: 'Absent / 100ml', acceptableLimit: 'Zero Tolerated (0 CFU)', status: 'Certified Safe', safe: true },
  { parameter: 'Chlorides (Cl)', value: '45 mg/L', acceptableLimit: '< 250 mg/L', status: 'Pass', safe: true }
];

export const TANK_CLEANING_HISTORY = [
  {
    id: 'CLEAN-2026-MAY',
    tanks: 'A, B & C Building Overhead Tanks',
    date: '18 May – 20 May 2026',
    vendor: 'AquaPure Systems & Sanitization Ltd.',
    method: 'High Pressure Rotary Jet + Sludge Vacuum + UV & Anti-bacterial Spray',
    certificateNo: 'AP-EURISKA-2026-05',
    invoiceAmount: 24500,
    status: 'Verified & Approved',
    nextDue: 'November 2026'
  },
  {
    id: 'CLEAN-2026-APR',
    tanks: 'Common Underground Sump (All 4 Chambers)',
    date: '12 April 2026',
    vendor: 'AquaPure Systems & Sanitization Ltd.',
    method: 'Dewatering + Deep Silt Removal + Food-Grade Potassium Permanganate Wash',
    certificateNo: 'AP-EURISKA-2026-04-UG',
    invoiceAmount: 38000,
    status: 'Verified & Approved',
    nextDue: 'October 2026'
  }
];

export const WATER_TANK_CLEANING_BILLS = {
  society: 'Majestique Euriska (Uriska)',
  title: 'Detailed Water Tank Capacity & Cleaning Bill Analysis',
  subtitle: 'A, B and C Buildings | Detailed invoice-wise comparison and rate analysis',
  summary: [
    { building: 'A Building', capacityL: 75800, cleaningBill: 5100, tanksCount: 6, billPer1kL: 67.28, flats: 87, costPerFlat: 58.62, litresPerFlat: 871, color: '#2563eb' },
    { building: 'B Building', capacityL: 88600, cleaningBill: 5200, tanksCount: 6, billPer1kL: 58.69, flats: 96, costPerFlat: 54.17, litresPerFlat: 923, color: '#0284c7' },
    { building: 'C Building', capacityL: 50000, cleaningBill: 3200, tanksCount: 4, billPer1kL: 64.00, flats: 48, costPerFlat: 66.67, litresPerFlat: 1042, color: '#059669' }
  ],
  totals: {
    totalCapacityL: 214400,
    totalCleaningBill: 13500,
    totalTanks: 16,
    overallBillPer1kL: 62.97,
    totalFlats: 231,
    costPerFlat: 58.44,
    litresPerFlat: 928
  },
  details: {
    a_building: {
      building: 'A Building',
      capacityL: 75800,
      totalBill: 5100,
      billPer1kL: 67.28,
      items: [
        { id: 1, capacityL: 30700, qty: 2, note: '2 in 1', quotedCleaning: 1400, effectivePer1kL: 45.60, lineTotal: 1400 },
        { id: 2, capacityL: 23400, qty: 1, note: '—', quotedCleaning: 1000, effectivePer1kL: 42.74, lineTotal: 1000 },
        { id: 3, capacityL: 8500, qty: 1, note: '—', quotedCleaning: 700, effectivePer1kL: 82.35, lineTotal: 700 },
        { id: 4, capacityL: 7000, qty: 1, note: '—', quotedCleaning: 700, effectivePer1kL: 100.00, lineTotal: 700 },
        { id: 5, capacityL: 3900, qty: 1, note: '—', quotedCleaning: 700, effectivePer1kL: 179.49, lineTotal: 700 },
        { id: 6, capacityL: 2300, qty: 1, note: '—', quotedCleaning: 600, effectivePer1kL: 260.87, lineTotal: 600 }
      ],
      calculationFormula: '₹1,400 + ₹1,000 + ₹700 + ₹700 + ₹700 + ₹600 = ₹5,100. Capacity total = 75,800 L.'
    },
    b_building: {
      building: 'B Building',
      capacityL: 88600,
      totalBill: 5200,
      billPer1kL: 58.69,
      items: [
        { id: 1, capacityL: 30700, qty: 2, note: '2 in 1', quotedCleaning: 1500, effectivePer1kL: 48.86, lineTotal: 1500 },
        { id: 2, capacityL: 28200, qty: 1, note: '—', quotedCleaning: 900, effectivePer1kL: 31.91, lineTotal: 900 },
        { id: 3, capacityL: 11800, qty: 1, note: '—', quotedCleaning: 700, effectivePer1kL: 59.32, lineTotal: 700 },
        { id: 4, capacityL: 7900, qty: 1, note: '—', quotedCleaning: 700, effectivePer1kL: 88.61, lineTotal: 700 },
        { id: 5, capacityL: 5000, qty: 1, note: '—', quotedCleaning: 700, effectivePer1kL: 140.00, lineTotal: 700 },
        { id: 6, capacityL: 5000, qty: 1, note: '—', quotedCleaning: 700, effectivePer1kL: 140.00, lineTotal: 700 }
      ],
      calculationFormula: '₹1,500 + ₹900 + ₹700 + ₹700 + ₹700 + ₹700 = ₹5,200. Capacity total = 88,600 L.'
    },
    c_building: {
      building: 'C Building',
      capacityL: 50000,
      totalBill: 3200,
      billPer1kL: 64.00,
      items: [
        { id: 1, capacityL: 22000, qty: 1, note: '—', quotedCleaning: 900, effectivePer1kL: 40.91, lineTotal: 900 },
        { id: 2, capacityL: 14000, qty: 1, note: '—', quotedCleaning: 900, effectivePer1kL: 64.29, lineTotal: 900 },
        { id: 3, capacityL: 9000, qty: 1, note: '—', quotedCleaning: 700, effectivePer1kL: 77.78, lineTotal: 700 },
        { id: 4, capacityL: 5000, qty: 1, note: '—', quotedCleaning: 700, effectivePer1kL: 140.00, lineTotal: 700 }
      ],
      calculationFormula: '₹900 + ₹900 + ₹700 + ₹700 = ₹3,200. Capacity total = 50,000 L.'
    }
  },
  rateDisparityAudit: {
    title: 'Where the Cleaning Charge Is Higher or Lower',
    identicalComparisons: [
      {
        capacityL: 5000,
        aCharge: '—',
        bCharge: 700,
        cCharge: 700,
        lowestSeen: 700,
        differenceVsLowest: '₹0 (Uniform quoted charge of ₹700 across B and C)',
        status: 'Uniform'
      },
      {
        capacityL: 30700,
        aCharge: 1400,
        bCharge: 1500,
        cCharge: '—',
        lowestSeen: 1400,
        differenceVsLowest: '+₹100 (B is ₹100 higher than A for 30,700 L)',
        status: 'Discrepancy'
      }
    ],
    directObservations: [
      {
        point: 'A vs B for 30,700 L',
        observation: 'A is quoted at ₹1,400 and B at ₹1,500. Difference = ₹100 higher in B for this identical listed capacity (both are "2 in 1" tanks).'
      },
      {
        point: '14,000 L vs 23,400 / 28,200 L',
        observation: "C's 14,000 L tank is ₹900. The invoices do not provide a same-capacity A/B line, so a direct 'extra' charge cannot be established."
      },
      {
        point: '9,000 L in C',
        observation: 'Quoted at ₹700. Again, there is no exact 9,000 L line in A or B for 1-to-1 comparison.'
      },
      {
        point: '5,000 L in C vs B',
        observation: '5,000 L in C is ₹700. B has two 5,000 L lines, also ₹700 each — exact same quoted charge across wings.'
      },
      {
        point: '7,000 / 8,500 / 3,900 / 2,300 L in A',
        observation: 'These specific capacities have no exact matching lines in B or C, so the invoices alone do not prove an excess charge.'
      },
      {
        point: 'Overall Effective Rate by Wing',
        observation: 'A = ₹67.28 / 1,000 L; B = ₹58.69 / 1,000 L; C = ₹64.00 / 1,000 L. B has the lowest overall bill per 1,000 L despite having the largest building capacity.'
      }
    ],
    conclusion: "Based strictly on the supplied invoices, the clearest directly comparable difference is the 30,700 L line: B is ₹100 higher than A. For the other capacities, the invoice data does not establish an unambiguous 'extra amount' unless the society has a standard rate card or agreed rate by capacity. If a contractual rate card is established, the exact excess amount for every tank can be computed."
  }
};

