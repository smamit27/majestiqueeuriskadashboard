/**
 * Official Managing Committee Work Distribution & Portfolio Allocation
 * Majestique Euriska 'A' Building Co-operative Housing Society Ltd.
 * Reg. No. PNA/PNA (4)/HSG/(TC)/21207/2019-20
 * 
 * Source: Official Society Managing Committee Portfolio Resolution & Work Distribution Roster
 */

export const MEMBER_FLAT_MAP = {
  "Sachin": "A-704",
  "Amit": "A-1007",
  "Prakash": "A-501",
  "Prashant": "A-505",
  "Himanshu": "A-602",
  "Himansu": "A-602",
  "Ahmed": "A-603",
  "Sandeep": "A-301",
  "Ashu": "A-607",
  "Afroza": "A-404",
  "Neha": "A-204"
};

export const OFFICIAL_WORK_DISTRIBUTION_IMAGE = {
  src: "/visuals/work_distribution_list.png",
  fallbackSrc: "/rules_notices/work_distribution_list.png",
  title: "Official Work Distribution List — Managing Committee Notice",
  fileName: "Majestique_Euriska_Work_Distribution_Notice.png"
};

export const REQUESTED_FLATS_OWNERS = [
  {
    flat: "A-204",
    floor: 2,
    ownerName: "Mr. Sandeep Harbanslal Goyal & Mrs. Neha Sandeep Goyal",
    occupantType: "Owner",
    parkingSlot: "OP-49",
    parkingType: "Open Parking",
    status: "Active",
    committeeMember: "Neha",
    role: "Committee Member",
    notes: "Portfolio: Housekeeping, Garden & Kids' Play Area, Vendor Coordination & Common Area Maintenance"
  },
  {
    flat: "A-301",
    floor: 3,
    ownerName: "Mr. Sandeep Kumar Mohanty",
    occupantType: "Owner",
    parkingSlot: "CP (Covered)",
    parkingType: "Covered Parking",
    status: "Active",
    committeeMember: "Sandeep",
    role: "Committee Member",
    notes: "Portfolio: Electricity, Lifts, Solar, Tech Maintenance & Vendor Coordination"
  },
  {
    flat: "A-403",
    floor: 4,
    ownerName: "Mr. Azim Haghighi & Mr. Mossaddegh Haghighi",
    occupantType: "Owner / Resident",
    parkingSlot: "OP-03",
    parkingType: "Open Parking",
    status: "Active",
    committeeMember: "Afroza",
    role: "Committee Member (Mrs. Afroza Parkar, A-404/A-403)",
    notes: "Portfolio: Housekeeping, Garden, Kids' Play Area, Electricity & Water"
  },
  {
    flat: "A-501",
    floor: 5,
    ownerName: "Mrs. Vidya Prakash Dhiwar & Mr. Prakash Sudhakar Dhiwar",
    occupantType: "Owner",
    parkingSlot: "OP-57",
    parkingType: "Open Parking",
    status: "Active",
    committeeMember: "Prakash",
    role: "Committee Member",
    notes: "Portfolio: Security & Fire Safety, Housekeeping & Garden"
  },
  {
    flat: "A-505",
    floor: 5,
    ownerName: "Mr. Prashant S. Mahindrakar",
    occupantType: "Owner",
    parkingSlot: "CP (Covered)",
    parkingType: "Covered Parking",
    status: "Active",
    committeeMember: "Prashant",
    role: "Committee Member (Appointed at AGM 2025)",
    notes: "Portfolio: Security, Electricity, Solar/CCTV & Vendor Coordination"
  },
  {
    flat: "A-602",
    floor: 6,
    ownerName: "Mr. Himansu Sekhar Behera",
    occupantType: "Owner",
    parkingSlot: "CP (Covered)",
    parkingType: "Covered Parking",
    status: "Active",
    committeeMember: "Himansu",
    role: "Committee Member",
    notes: "Flat A-602 • Portfolio: Swimming Pool, Accounts & Finance, Water Management, Tenant Management"
  },
  {
    flat: "A-603",
    floor: 6,
    ownerName: "Mr. Fakiruddin Alli Ahamed Khan",
    occupantType: "Owner",
    parkingSlot: "CP (Covered)",
    parkingType: "Covered Parking",
    status: "Active",
    committeeMember: "Ahmed",
    role: "Committee Member (Mr. Ahmed Shaikh)",
    notes: "Portfolio: Electricity, Lifts, Common Lighting, Water, Solar & CCTV"
  },
  {
    flat: "A-607",
    floor: 6,
    ownerName: "Mr. AshuKumar Harshwardhan",
    occupantType: "Owner",
    parkingSlot: "CP (Covered)",
    parkingType: "Covered Parking",
    status: "Active",
    committeeMember: "Ashu",
    role: "Committee Member",
    notes: "Portfolio: Housekeeping, Garden, Play Area & Swimming Pool"
  },
  {
    flat: "A-704",
    floor: 7,
    ownerName: "Mr. Sachin Nivrutti Savakhande",
    occupantType: "Owner",
    parkingSlot: "CP (Covered)",
    parkingType: "Covered Parking",
    status: "Active",
    committeeMember: "Sachin",
    role: "Society Chairperson",
    notes: "Portfolio: Security & Fire Safety, Park+ / Complaints & Tenant Management"
  },
  {
    flat: "A-1007",
    floor: 10,
    ownerName: "Mr. Amit Singh",
    occupantType: "Owner",
    parkingSlot: "OP-33",
    parkingType: "Open Parking",
    status: "Active",
    committeeMember: "Amit",
    role: "Society Secretary / Committee Member",
    notes: "Portfolio: Security & Fire Safety, Park+ / Complaints, Accounts & Finance"
  }
];

export const COMMITTEE_MEMBERS = [
  {
    name: "Sachin",
    fullName: "Mr. Sachin Nivrutti Savakhande",
    role: "Chairperson",
    flat: "A-704",
    phone: "+91 98XXX XXXXX",
    portfolios: [
      "Security & Fire Safety",
      "Park+ / MyGate & Resident Complaints",
      "Accounts & Finance",
      "Tenant Management"
    ],
    avatarColor: "#3b82f6"
  },
  {
    name: "Amit",
    fullName: "Mr. Amit Singh",
    role: "Secretary",
    flat: "A-1007",
    phone: "+91 98XXX XXXXX",
    portfolios: [
      "Security & Fire Safety",
      "Park+ / MyGate & Resident Complaints",
      "Accounts & Finance"
    ],
    avatarColor: "#8b5cf6"
  },
  {
    name: "Prakash",
    fullName: "Mr. Prakash Sudhakar Dhiwar",
    role: "Committee Member",
    flat: "A-501",
    phone: "+91 98XXX XXXXX",
    portfolios: [
      "Security & Fire Safety",
      "Housekeeping, Garden & Kids' Play Area",
      "Accounts & Finance"
    ],
    avatarColor: "#10b981"
  },
  {
    name: "Prashant",
    fullName: "Mr. Prashant S. Mahindrakar",
    role: "Committee Member (AGM 2025)",
    flat: "A-505",
    phone: "+91 98XXX XXXXX",
    portfolios: [
      "Security & Fire Safety",
      "Electricity, Lifts, Common Lighting & Water Management",
      "Solar / Network / CCTV & Technical Maintenance",
      "Vendor Coordination & Common Area Maintenance",
      "Accounts & Finance"
    ],
    avatarColor: "#f59e0b"
  },
  {
    name: "Himansu",
    displayName: "Himansu",
    fullName: "Mr. Himansu Sekhar Behera",
    role: "Committee Member",
    flat: "A-602",
    phone: "+91 98XXX XXXXX",
    portfolios: [
      "Swimming Pool Management",
      "Accounts & Finance",
      "Electricity, Lifts, Common Lighting & Water Management",
      "Tenant Management"
    ],
    avatarColor: "#06b6d4"
  },
  {
    name: "Ahmed",
    fullName: "Mr. Fakiruddin Alli Ahamed Khan (Ahmed Shaikh)",
    role: "Committee Member",
    flat: "A-603",
    phone: "+91 98XXX XXXXX",
    portfolios: [
      "Electricity, Lifts, Common Lighting & Water Management",
      "Solar / Network / CCTV & Technical Maintenance",
      "Accounts & Finance"
    ],
    avatarColor: "#6366f1"
  },
  {
    name: "Sandeep",
    fullName: "Mr. Sandeep Kumar Mohanty",
    role: "Committee Member",
    flat: "A-301",
    phone: "+91 98XXX XXXXX",
    portfolios: [
      "Electricity, Lifts, Common Lighting & Water Management",
      "Solar / Network / CCTV & Technical Maintenance",
      "Vendor Coordination & Common Area Maintenance",
      "Accounts & Finance"
    ],
    avatarColor: "#ec4899"
  },
  {
    name: "Ashu",
    fullName: "Mr. AshuKumar Harshwardhan",
    role: "Committee Member",
    flat: "A-607",
    phone: "+91 98XXX XXXXX",
    portfolios: [
      "Housekeeping, Garden & Kids' Play Area",
      "Swimming Pool Management",
      "Accounts & Finance"
    ],
    avatarColor: "#14b8a6"
  },
  {
    name: "Afroza",
    fullName: "Mrs. Afroza Galib Parkar",
    role: "Committee Member",
    flat: "A-404 / A-403",
    phone: "+91 98XXX XXXXX",
    portfolios: [
      "Housekeeping, Garden & Kids' Play Area",
      "Electricity, Lifts, Common Lighting & Water Management",
      "Accounts & Finance"
    ],
    avatarColor: "#84cc16"
  },
  {
    name: "Neha",
    fullName: "Mrs. Neha Sandeep Goyal",
    role: "Committee Member",
    flat: "A-204",
    phone: "+91 98XXX XXXXX",
    portfolios: [
      "Housekeeping, Garden & Kids' Play Area",
      "Vendor Coordination & Common Area Maintenance",
      "Accounts & Finance"
    ],
    avatarColor: "#f97316"
  }
];

export const WORK_DISTRIBUTION_PORTFOLIOS = [
  {
    no: 1,
    id: "security_fire_safety",
    responsibilityArea: "Security & Fire Safety",
    iconType: "shield",
    assignedMembers: ["Prakash", "Sachin", "Amit", "Prashant"],
    allMembersInvolved: false,
    keyResponsibilities: "Guard management, gate access, fire equipment & emergency response.",
    category: "Safety & Security",
    badgeColor: "#dc2626"
  },
  {
    no: 2,
    id: "housekeeping_garden_playarea",
    responsibilityArea: "Housekeeping, Garden & Kids' Play Area",
    iconType: "leaf",
    assignedMembers: ["Neha", "Afroza", "Ashu", "Prakash"],
    allMembersInvolved: false,
    keyResponsibilities: "Campus cleanliness, garbage collection, pest control, garden & play safety.",
    category: "Hygiene & Amenities",
    badgeColor: "#15803d"
  },
  {
    no: 3,
    id: "parkplus_mygate_complaints",
    responsibilityArea: "Park+ / MyGate & Resident Complaints",
    iconType: "parking",
    assignedMembers: ["Amit", "Sachin"],
    allMembersInvolved: false,
    keyResponsibilities: "RFID stickers, gate access, app issues, complaint tracking & escalation.",
    category: "Operations & Access",
    badgeColor: "#0284c7"
  },
  {
    no: 4,
    id: "swimming_pool",
    responsibilityArea: "Swimming Pool Management",
    iconType: "swimming",
    assignedMembers: ["Ashu", "Himansu"],
    allMembersInvolved: false,
    keyResponsibilities: "Water quality, filtration, pool hygiene, safety & vendor maintenance.",
    category: "Amenities & Recreation",
    badgeColor: "#0891b2"
  },
  {
    no: 5,
    id: "accounts_finance",
    responsibilityArea: "Accounts & Finance",
    iconType: "finance",
    assignedMembers: ["Himansu", "Amit"],
    allMembersInvolved: true,
    displayedAssigned: "Himansu / Amit / All Committee Members",
    keyResponsibilities: "Maintenance bills, collections, expenses, auditing & receipts.",
    category: "Finance & Treasury",
    badgeColor: "#d97706"
  },
  {
    no: 6,
    id: "electricity_lifts_water",
    responsibilityArea: "Electricity, Lifts, Lighting & Water Management",
    iconType: "electricity",
    assignedMembers: ["Ahmed", "Afroza", "Sandeep", "Himansu", "Prashant"],
    allMembersInvolved: false,
    keyResponsibilities: "Lift servicing, common lighting, water supply, pumps & tankers.",
    category: "Utilities & Infrastructure",
    badgeColor: "#7c3aed"
  },
  {
    no: 7,
    id: "solar_network_cctv",
    responsibilityArea: "Solar, Network, CCTV & Technical Maintenance",
    iconType: "cctv",
    assignedMembers: ["Prashant", "Ahmed", "Sandeep"],
    allMembersInvolved: false,
    keyResponsibilities: "CCTV coverage, intercom/network connectivity, solar project & technical repairs.",
    category: "Technology & Energy",
    badgeColor: "#ea580c"
  },
  {
    no: 8,
    id: "vendor_coordination_common_area",
    responsibilityArea: "Vendor Coordination & Common Area Maintenance",
    iconType: "vendor",
    assignedMembers: ["Prashant", "Sandeep", "Neha"],
    allMembersInvolved: true,
    displayedAssigned: "Prashant / Sandeep / Neha / All Committee Members",
    keyResponsibilities: "AMC contracts, quotations, civil works & common area inspections.",
    category: "Vendors & Maintenance",
    badgeColor: "#db2777"
  },
  {
    no: 9,
    id: "tenant_management",
    responsibilityArea: "Tenant Management",
    iconType: "tenant",
    assignedMembers: ["Himansu", "Sachin"],
    allMembersInvolved: false,
    keyResponsibilities: "Tenant registration, police verification, move-in/out NOC & bylaws compliance.",
    category: "Tenancy & Compliance",
    badgeColor: "#1e3a8a"
  }
];
