export const members = [
  {
    id: 'MEM-101',
    name: 'Anika Sharma',
    flat: 'A-101',
    phone: '+91 98765 10234',
    ownership: 'Owner',
    householdSize: 4,
    status: 'Active',
    duesStatus: 'Paid'
  },
  {
    id: 'MEM-204',
    name: 'Rohan Nair',
    flat: 'A-204',
    phone: '+91 98220 44561',
    ownership: 'Tenant',
    householdSize: 2,
    status: 'Active',
    duesStatus: 'Pending'
  },
  {
    id: 'MEM-307',
    name: 'Meera Iyer',
    flat: 'B-307',
    phone: '+91 99871 22770',
    ownership: 'Owner',
    householdSize: 3,
    status: 'Active',
    duesStatus: 'Paid'
  },
  {
    id: 'MEM-412',
    name: 'Karan Sethi',
    flat: 'B-412',
    phone: '+91 98989 11092',
    ownership: 'Owner',
    householdSize: 1,
    status: 'Traveling',
    duesStatus: 'Overdue'
  },
  {
    id: 'MEM-518',
    name: 'Sonal Deshmukh',
    flat: 'C-518',
    phone: '+91 97654 88212',
    ownership: 'Tenant',
    householdSize: 5,
    status: 'Active',
    duesStatus: 'Paid'
  },
  {
    id: 'MEM-623',
    name: 'Vikram Joshi',
    flat: 'C-623',
    phone: '+91 98112 55480',
    ownership: 'Owner',
    householdSize: 3,
    status: 'Onboarding',
    duesStatus: 'Pending'
  }
];

export const dues = [
  {
    id: 'DUE-APR-101',
    resident: 'Anika Sharma',
    flat: 'A-101',
    amount: 4200,
    outstanding: 0,
    dueDate: '2026-04-08',
    status: 'Paid'
  },
  {
    id: 'DUE-APR-204',
    resident: 'Rohan Nair',
    flat: 'A-204',
    amount: 4200,
    outstanding: 4200,
    dueDate: '2026-04-08',
    status: 'Pending'
  },
  {
    id: 'DUE-APR-307',
    resident: 'Meera Iyer',
    flat: 'B-307',
    amount: 4500,
    outstanding: 0,
    dueDate: '2026-04-08',
    status: 'Paid'
  },
  {
    id: 'DUE-APR-412',
    resident: 'Karan Sethi',
    flat: 'B-412',
    amount: 4500,
    outstanding: 4500,
    dueDate: '2026-04-08',
    status: 'Overdue'
  },
  {
    id: 'DUE-APR-518',
    resident: 'Sonal Deshmukh',
    flat: 'C-518',
    amount: 4800,
    outstanding: 0,
    dueDate: '2026-04-08',
    status: 'Paid'
  },
  {
    id: 'DUE-APR-623',
    resident: 'Vikram Joshi',
    flat: 'C-623',
    amount: 4600,
    outstanding: 4600,
    dueDate: '2026-04-15',
    status: 'Pending'
  }
];

export const announcements = [
  {
    id: 'ANN-001',
    title: 'Water tank cleaning on Saturday',
    audience: 'All Towers',
    priority: 'Medium',
    postedOn: '2026-04-24',
    summary: 'Water supply will pause between 10:00 AM and 1:00 PM during the scheduled tank cleaning.'
  },
  {
    id: 'ANN-002',
    title: 'Clubhouse booking window updated',
    audience: 'Residents',
    priority: 'Low',
    postedOn: '2026-04-22',
    summary: 'Bookings now close 24 hours before each event slot to help staff planning.'
  },
  {
    id: 'ANN-003',
    title: 'Lift inspection completed',
    audience: 'Tower B',
    priority: 'High',
    postedOn: '2026-04-21',
    summary: 'Tower B lift is back in service after the quarterly safety inspection.'
  }
];

export const events = [
  {
    id: 'EVT-001',
    title: 'Monthly managing committee meet',
    date: '2026-04-27',
    venue: 'Society Office',
    attendees: 11,
    category: 'Governance'
  },
  {
    id: 'EVT-002',
    title: 'Children’s summer workshop',
    date: '2026-05-02',
    venue: 'Clubhouse',
    attendees: 28,
    category: 'Community'
  },
  {
    id: 'EVT-003',
    title: 'Fire drill and evacuation briefing',
    date: '2026-05-05',
    venue: 'Podium Level',
    attendees: 64,
    category: 'Safety'
  }
];

export const complaints = [
  {
    id: 'CMP-090',
    resident: 'Rohan Nair',
    flat: 'A-204',
    category: 'Plumbing',
    priority: 'High',
    status: 'Open',
    raisedOn: '2026-04-24',
    note: 'Kitchen sink leak reported.'
  },
  {
    id: 'CMP-091',
    resident: 'Anika Sharma',
    flat: 'A-101',
    category: 'Security',
    priority: 'Medium',
    status: 'In Progress',
    raisedOn: '2026-04-23',
    note: 'Visitor intercom delay during late evening.'
  },
  {
    id: 'CMP-092',
    resident: 'Karan Sethi',
    flat: 'B-412',
    category: 'Electrical',
    priority: 'High',
    status: 'Escalated',
    raisedOn: '2026-04-22',
    note: 'Common corridor lights flickering outside the unit.'
  },
  {
    id: 'CMP-093',
    resident: 'Sonal Deshmukh',
    flat: 'C-518',
    category: 'Housekeeping',
    priority: 'Low',
    status: 'Resolved',
    raisedOn: '2026-04-21',
    note: 'Garbage room cleaning follow-up completed.'
  }
];

export const finance = [
  {
    id: 'FIN-APR',
    month: 'April 2026',
    collections: 286000,
    expenses: 198500,
    reserveContribution: 32500,
    outstanding: 13300,
    utilities: 88400
  },
  {
    id: 'FIN-MAR',
    month: 'March 2026',
    collections: 279400,
    expenses: 205100,
    reserveContribution: 30000,
    outstanding: 18900,
    utilities: 90200
  },
  {
    id: 'FIN-FEB',
    month: 'February 2026',
    collections: 272800,
    expenses: 194600,
    reserveContribution: 28750,
    outstanding: 21400,
    utilities: 87300
  }
];

export const visitors = [
  {
    id: 'VIS-401',
    visitorName: 'Amit Kulkarni',
    hostFlat: 'A-101',
    purpose: 'Family visit',
    timeIn: '09:10',
    status: 'Checked In'
  },
  {
    id: 'VIS-402',
    visitorName: 'Urban Basket',
    hostFlat: 'C-518',
    purpose: 'Grocery delivery',
    timeIn: '10:25',
    status: 'Delivered'
  },
  {
    id: 'VIS-403',
    visitorName: 'BlueDart Courier',
    hostFlat: 'B-307',
    purpose: 'Courier',
    timeIn: '11:45',
    status: 'At Gate'
  },
  {
    id: 'VIS-404',
    visitorName: 'AquaPure Service',
    hostFlat: 'B-412',
    purpose: 'RO maintenance',
    timeIn: '13:05',
    status: 'Checked In'
  },
  {
    id: 'VIS-405',
    visitorName: 'Cab Pickup',
    hostFlat: 'A-204',
    purpose: 'Pickup',
    timeIn: '17:15',
    status: 'Exited'
  }
];

export const staff = [
  {
    id: 'STF-01',
    name: 'Savita More',
    role: 'Housekeeping',
    shift: '6:00 AM - 2:00 PM',
    zone: 'Tower A',
    attendance: 'Present'
  },
  {
    id: 'STF-02',
    name: 'Rakesh Patil',
    role: 'Housekeeping',
    shift: '7:00 AM - 3:00 PM',
    zone: 'Tower B',
    attendance: 'Present'
  },
  {
    id: 'STF-03',
    name: 'Nazia Shaikh',
    role: 'Supervisor',
    shift: '9:00 AM - 5:00 PM',
    zone: 'Common Areas',
    attendance: 'Field Check'
  },
  {
    id: 'STF-04',
    name: 'Pawan Tiwari',
    role: 'Waste Collection',
    shift: '6:30 AM - 1:30 PM',
    zone: 'Basement and Podium',
    attendance: 'On Leave'
  }
];
