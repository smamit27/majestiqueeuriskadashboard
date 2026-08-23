/**
 * Emergency Data Configuration for Majestique Euriska Society
 * All contact information and locations are configurable and support admin updates.
 */

export const emergencyServices = [
  {
    id: 'police',
    name: 'Police',
    icon: '👮‍♂️',
    primaryNumber: '112',
    secondaryNumber: '100',
    description: 'National Emergency / Police Control Room',
    badge: '24x7 Available'
  },
  {
    id: 'ambulance',
    name: 'Ambulance',
    icon: '🚑',
    primaryNumber: '112',
    secondaryNumber: '108',
    description: 'Emergency Medical Service & Ambulance',
    badge: 'Medical Emergency'
  },
  {
    id: 'fire',
    name: 'Fire Brigade',
    icon: '🚒',
    primaryNumber: '112',
    secondaryNumber: '101',
    description: 'Fire & Rescue Emergency Response',
    badge: 'Fire Safety'
  },
  {
    id: 'women_helpline',
    name: 'Women Helpline',
    icon: '👩',
    primaryNumber: '181',
    secondaryNumber: '1091',
    description: 'National Women Safety & Support Helpline',
    badge: 'Women Safety'
  },
  {
    id: 'child_helpline',
    name: 'Child Helpline',
    icon: '🧒',
    primaryNumber: '1098',
    secondaryNumber: '',
    description: 'National Emergency Helpline for Children in Distress',
    badge: 'Child Care'
  }
];

export const defaultSocietyContacts = [
  {
    id: 'sec_gate',
    category: 'Security Gate (Main)',
    person: 'Main Security Cabin',
    phone: '+91 98230 11223',
    icon: '🛡️',
    type: 'society',
    available: '24x7 (Intercom & Mobile)'
  },
  {
    id: 'soc_manager',
    category: 'Society Manager',
    person: 'Society Estate Manager',
    phone: '+91 98220 33445',
    icon: '👔',
    type: 'society',
    available: '9:00 AM - 6:00 PM'
  },
  {
    id: 'comm_member',
    category: 'Committee Member',
    person: 'Wing Representative / Secretary',
    phone: '+91 98900 55667',
    icon: '🤝',
    type: 'society',
    available: 'Emergency & Society Matters'
  },
  {
    id: 'maint_emerg',
    category: 'Maintenance Emergency',
    person: 'Facility Management Desk',
    phone: '+91 97654 12345',
    icon: '🔧',
    type: 'society',
    available: '24x7 Escalations'
  },
  {
    id: 'electrician',
    category: 'Electrician',
    person: 'Society On-Call Electrician',
    phone: '+91 98500 77889',
    icon: '⚡',
    type: 'society',
    available: 'Power Outages & Faults'
  },
  {
    id: 'plumber',
    category: 'Plumber',
    person: 'Society On-Call Plumber',
    phone: '+91 98600 99001',
    icon: '🚰',
    type: 'society',
    available: 'Leakages & Pipeline Line'
  }
];

export const defaultNearbyLocations = [
  {
    id: 'hospital',
    name: 'Noble Hospital / Sahyadri Speciality',
    type: 'Nearest Multi-Speciality Hospital',
    distance: '~3.2 km',
    icon: '🏥',
    phone: '+91 20 6628 5000',
    address: 'Hadapsar / Magarpatta Road, Pune',
    query: 'Noble Hospital Hadapsar Pune'
  },
  {
    id: 'police_station',
    name: 'Hadapsar Police Station',
    type: 'Jurisdictional Police Station',
    distance: '~2.8 km',
    icon: '🚔',
    phone: '+91 20 2687 0033',
    address: 'Pune - Solapur Rd, Gadital, Hadapsar, Pune',
    query: 'Hadapsar Police Station Pune'
  },
  {
    id: 'fire_station',
    name: 'Hadapsar Fire Station',
    type: 'City Fire & Rescue Station',
    distance: '~3.5 km',
    icon: '🚒',
    phone: '+91 20 2687 1101',
    address: 'Near Gadital, Hadapsar, Pune',
    query: 'Hadapsar Fire Station Pune'
  },
  {
    id: 'pharmacy',
    name: 'Apollo Pharmacy 24x7 / Wellness Forever',
    type: '24×7 Chemist & Medical Store',
    distance: '~800 m',
    icon: '💊',
    phone: '+91 20 2682 4455',
    address: 'Handewadi Road / Sasane Nagar, Pune',
    query: 'Apollo Pharmacy 24 hours Hadapsar Pune'
  }
];

export const safetyTips = [
  {
    id: 'stay_calm',
    title: 'Stay Calm',
    icon: '🧘‍♂️',
    description: 'In any emergency, remain calm, take a deep breath, and assess the immediate situation safely.'
  },
  {
    id: 'call_immediately',
    title: 'Call Immediately',
    icon: '📞',
    description: 'Dial 112 or the designated society helpline without delay. Every second counts.'
  },
  {
    id: 'share_location',
    title: 'Share Location',
    icon: '📍',
    description: 'Clearly inform responders: Majestique Euriska, Handewadi Road, along with your Wing & Flat Number.'
  },
  {
    id: 'be_prepared',
    title: 'Be Prepared',
    icon: '🛡️',
    description: 'Keep this emergency directory bookmarked on your phone and know the nearest building exits & refuge areas.'
  }
];
