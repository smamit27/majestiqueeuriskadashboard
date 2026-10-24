/**
 * Official Minutes of Meeting (MOM) Templates for Majestique Euriska
 * Contains pre-configured statutory and operational templates for:
 * 1. Building 'A' Monthly Managing Committee
 * 2. Joint Common Infrastructure & AMC Review (STP, DG, Security)
 * 3. Special General Body Meeting (SGM) / Major CAPEX
 * 4. Emergency Breakdown & Essential Services Meeting
 */

export const OFFICIAL_MOM_TEMPLATES = [
  {
    id: 'tmpl-wing-a-monthly',
    isOfficialTemplate: true,
    title: "Wing 'A' Monthly Managing Committee Template",
    scope: 'A_BUILDING',
    category: 'Monthly Statutory',
    badgeText: "WING 'A' STANDARD",
    description: "Standard template for Wing 'A' elevator maintenance, terrace waterproofing, housekeeping, and wing dues recovery.",
    headerInfo: {
      societyName: "Majestique Euriska Co-operative Housing Society Ltd. — 'A' Building Committee",
      scopeBadge: "WING 'A' GOVERNING COMMITTEE",
      meetingType: "Managing Committee Meeting",
      meetingDate: new Date().toISOString().split('T')[0],
      meetingTime: "10:30 AM",
      venue: "Wing 'A' Ground Floor Lobby / Society Office",
      chairperson: "",
      attendees: [
        "Society Chairman",
        "A-101 (Amit)",
        "A-204 (Neha)",
        "A-301 (Sandeep)",
        "A-404 (Afroza)",
        "Estate Manager"
      ]
    },
    rawNotes: `1. Wing 'A' Elevator AMC: Reviewed Otis monthly servicing report. Sensor calibration on Lift 1 completed. Lift 2 door sensor replacement approved (₹4,200).
2. Terrace Waterproofing: Pre-monsoon inspection conducted. Minor cracks identified near parapet wall. Quotation from Apex Waterproofing for ₹38,000 reviewed.
3. Housekeeping & Hygiene: Wing 'A' staircase deep-cleaning schedule updated to twice a week. Waste segregation compliance at 92%.
4. Dues Collection: 3 flats have maintenance arrears exceeding 90 days. Formal statutory demand notices under Byelaw 68 approved.`,
    sampleMOM: {
      title: "Minutes of Wing 'A' Managing Committee Meeting",
      scope: 'A_BUILDING',
      executiveSummary: "The Wing 'A' Committee convened to evaluate vertical transportation safety, terrace waterproofing readiness ahead of monsoon season, staircase cleanliness standards, and pending wing-specific maintenance receivables.",
      agendaItems: [
        {
          itemNo: "1",
          title: "Otis Elevator Maintenance & Sensor Replacement",
          category: "Vertical Transport",
          discussion: "The Committee examined Otis service logs for both passenger elevators in Wing 'A'. Lift 1 operates with zero faults. Lift 2 door sensor requires preventative replacement.",
          decision: "Approved Otis quotation of ₹4,200 for immediate door sensor replacement under vendor supervision."
        },
        {
          itemNo: "2",
          title: "Pre-Monsoon Terrace Waterproofing Works",
          category: "Civil Maintenance",
          discussion: "Inspected terrace surface and rain-water drainage outlets. Parapet wall joint treatment needed to avert seepage into top-floor flats.",
          decision: "Awarded contract to Apex Waterproofing at ₹38,000 with a 3-year warranty against leakage."
        },
        {
          itemNo: "3",
          title: "Housekeeping Schedule & Waste Segregation",
          category: "Hygiene & Operations",
          discussion: "Corridor and staircase sanitation evaluated. Increased frequency of deep scrubbing to bi-weekly recommended.",
          decision: "Estate Manager directed to enforce strict wet/dry segregation and mandate daily supervisor sign-offs."
        },
        {
          itemNo: "4",
          title: "Recovery of Outstanding Maintenance Dues",
          category: "Finance & Governance",
          discussion: "Reviewed defaulters list for Wing 'A'. Three units have overdue contributions beyond 90 days.",
          decision: "Instructed Secretary to issue formal 15-day recovery notices under Maharashtra Co-operative Societies Byelaws."
        }
      ],
      resolutions: [
        {
          resNo: "RES-A/2026/01",
          subject: "Approval of Lift 2 Sensor Replacement Expenditure",
          proposer: "Society Chairman",
          seconder: "A-204 (Neha)",
          verdict: "Passed Unanimously",
          text: "RESOLVED THAT the expenditure of ₹4,200 towards Otis Elevator Door Sensor replacement for Wing 'A' Lift 2 is hereby sanctioned from the Wing Maintenance Fund."
        },
        {
          resNo: "RES-A/2026/02",
          subject: "Sanction of Terrace Waterproofing Contract",
          proposer: "A-301 (Sandeep)",
          seconder: "A-101 (Amit)",
          verdict: "Passed Unanimously",
          text: "RESOLVED THAT the quotation of M/s Apex Waterproofing for ₹38,000 for parapet and terrace joint sealing be approved subject to a 3-year written performance guarantee."
        }
      ],
      actionItems: [
        {
          id: "ACT-A-01",
          task: "Supervise Otis technician during Lift 2 door sensor replacement and collect job sheet",
          assignedTo: "Estate Manager",
          dueDate: new Date(Date.now() + 5 * 86400000).toISOString().split('T')[0],
          priority: "HIGH",
          category: "Operations",
          status: "OPEN"
        },
        {
          id: "ACT-A-02",
          task: "Issue work order and advance check to Apex Waterproofing for terrace sealing",
          assignedTo: "Society Treasurer",
          dueDate: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
          priority: "HIGH",
          category: "Finance",
          status: "OPEN"
        },
        {
          id: "ACT-A-03",
          task: "Dispatch statutory Byelaw 68 demand notices to flats with arrears > 90 days",
          assignedTo: "Society Secretary",
          dueDate: new Date(Date.now() + 10 * 86400000).toISOString().split('T')[0],
          priority: "MEDIUM",
          category: "Governance",
          status: "OPEN"
        }
      ],
      financialNotes: "All approved works pertain strictly to Wing 'A' and shall be debited to the Wing 'A' Operational Account.",
      nextMeeting: "Fourth Saturday of next calendar month at 10:30 AM."
    }
  },
  {
    id: 'tmpl-common-infra-monthly',
    isOfficialTemplate: true,
    title: "Joint Common Infrastructure & AMC Review Template",
    scope: 'COMMON',
    category: 'Campus Infrastructure',
    badgeText: "COMMON CAMPUS STANDARD",
    description: "Standard template for shared campus amenities: Sewage Treatment Plant (STP), Diesel Generator (DG), Security, and Firefighting.",
    headerInfo: {
      societyName: "Majestique Euriska Co-operative Housing Society Ltd. — Joint Apex Committee",
      scopeBadge: "COMMON INFRASTRUCTURE & APEX COUNCIL",
      meetingType: "Joint Apex Committee Meeting (Wings A, B, C)",
      meetingDate: new Date().toISOString().split('T')[0],
      meetingTime: "11:30 AM",
      venue: "Society Clubhouse Conference Hall",
      chairperson: "",
      attendees: [
        "Society Chairman",
        "Society Secretary",
        "Society Treasurer",
        "Estate Manager",
        "A-101 (Amit)",
        "A-204 (Neha)",
        "A-301 (Sandeep)",
        "B-102 (Pooja)",
        "B-201 (Vikram)",
        "B-304 (Rajesh)",
        "C-104 (Rahul)",
        "C-202 (Sunita)",
        "C-306 (Committee Member)"
      ]
    },
    rawNotes: `1. STP Plant Operations: Daily treated water output at 45 KLD. Sludge removal tanker required this week. Bio-culture dosing frequency maintained.
2. DG Set Backup & Fuel: Kirloskar DG battery replacement due. Tested backup under full campus load for 30 minutes. Diesel reserve verified at 380 Litres (safety threshold: 250L).
3. Campus Security & Boom Barrier: Park+ RFID boom barrier sensor realignment completed at Main Gate. Night patrol guard shift increased by 1 guard.
4. Fire Safety Systems: Quarterly pressure test on wet riser pumps completed. Jockey pump functioning normally at 7 bar pressure.
5. Common Cost Share: Shared expenses allocated per statutory ratio (Wing A: 37.66%, Wing B: 41.56%, Wing C: 20.78%).`,
    sampleMOM: {
      title: "Minutes of Joint Common Infrastructure Meeting",
      scope: 'COMMON',
      executiveSummary: "Joint Council reviewed central utilities including Sewage Treatment Plant (STP) parameters, Kirloskar DG machine preventative maintenance, main gate boom barrier automation, and firefighting pump pressure tests across the entire campus.",
      agendaItems: [
        {
          itemNo: "1",
          title: "STP Plant Performance & Sludge Clearance",
          category: "Environmental & Sanitation",
          discussion: "STP output quality tested within MPCB permissible limits. Sludge accumulation reached evacuation mark.",
          decision: "Commissioned municipal authorized suction tanker at ₹8,500 for total sludge clearance."
        },
        {
          itemNo: "2",
          title: "Diesel Generator (DG) Battery Replacement & Diesel Audit",
          category: "Power & Backup",
          discussion: "Kirloskar Care inspection confirmed DG starter battery requires replacement ahead of summer peak.",
          decision: "Approved Exide 180Ah DG starter battery purchase via Kirloskar Care authorized distributor (₹14,500)."
        },
        {
          itemNo: "3",
          title: "Park+ RFID Boom Barrier & Campus Security Roster",
          category: "Security & Access",
          discussion: "RFID reader sensor alignment tested at entry/exit gates. Night patrolling roster strengthened.",
          decision: "Estate Manager to ensure 100% vehicle RFID tagging and zero unauthorized visitor entry."
        },
        {
          itemNo: "4",
          title: "Firefighting Wet Riser Pressure Certification",
          category: "Safety Compliance",
          discussion: "Reviewed quarterly hydrant and sprinkler pressure readings. Jockey pump holds 7 bar pressure steadily.",
          decision: "Instructed fire safety agency to issue Form-B certificate under Maharashtra Fire Prevention Act."
        }
      ],
      resolutions: [
        {
          resNo: "RES-COM/2026/01",
          subject: "Procurement of Kirloskar DG Starter Battery",
          proposer: "Society Chairman",
          seconder: "B-201 (Vikram)",
          verdict: "Passed Unanimously",
          text: "RESOLVED THAT purchase of 1 No. Exide heavy-duty DG starter battery at ₹14,500 inclusive of GST and buyback be sanctioned from the Common Infrastructure Maintenance Account."
        },
        {
          resNo: "RES-COM/2026/02",
          subject: "Quarterly Common Cost Allocation Ratio Adoption",
          proposer: "Society Treasurer",
          seconder: "C-104 (Rahul)",
          verdict: "Passed Unanimously",
          text: "RESOLVED THAT joint campus infrastructure expenses be distributed among wings strictly per carpet area ratios: Wing A: 37.66%, Wing B: 41.56%, Wing C: 20.78%."
        }
      ],
      actionItems: [
        {
          id: "ACT-COM-01",
          task: "Coordinate STP suction tanker arrival and verify sludge clearance logbook entry",
          assignedTo: "Estate Manager",
          dueDate: new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0],
          priority: "HIGH",
          category: "Sanitation",
          status: "OPEN"
        },
        {
          id: "ACT-COM-02",
          task: "Procure and install Kirloskar DG starter battery and test auto-start mechanism",
          assignedTo: "Estate Manager",
          dueDate: new Date(Date.now() + 4 * 86400000).toISOString().split('T')[0],
          priority: "HIGH",
          category: "Electrical",
          status: "OPEN"
        },
        {
          id: "ACT-COM-03",
          task: "Obtain Form-B Fire Compliance Certificate from licensed agency",
          assignedTo: "Society Secretary",
          dueDate: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
          priority: "MEDIUM",
          category: "Compliance",
          status: "OPEN"
        }
      ],
      financialNotes: "Common costs shared strictly as: Wing A (37.66%), Wing B (41.56%), Wing C (20.78%).",
      nextMeeting: "Second Sunday of next month at 11:30 AM."
    }
  },
  {
    id: 'tmpl-wing-a-sgm',
    isOfficialTemplate: true,
    title: "Special General Body Meeting (SGM) Template",
    scope: 'A_BUILDING',
    category: 'General Body',
    badgeText: "STATUTORY SGM",
    description: "Statutory template for major capital expenditures (CAPEX), structural audits, and byelaw amendments.",
    headerInfo: {
      societyName: "Majestique Euriska Co-operative Housing Society Ltd. — 'A' Building Committee",
      scopeBadge: "SPECIAL GENERAL BODY (SGM)",
      meetingType: "Special General Body Meeting (SGM)",
      meetingDate: new Date().toISOString().split('T')[0],
      meetingTime: "06:00 PM",
      venue: "Society Central Amphitheatre / Clubhouse",
      chairperson: "",
      attendees: [
        "Society Chairman",
        "Society Secretary",
        "A-101 (Amit)",
        "A-204 (Neha)",
        "A-301 (Sandeep)",
        "A-404 (Afroza)",
        "Wing Committee Members"
      ]
    },
    rawNotes: `1. Quorum verification: Recorded attendance of members to fulfill statutory SGM quorum under Section 75 of MCS Act.
2. Structural Audit: Proposal to appoint PMC / structural consultant for 5-year structural audit and health assessment.
3. CCTV System Expansion: Discussion on adding 8 high-definition IP cameras in Wing 'A' basement parking and elevator lobbies.
4. Sinking Fund Utilization: Deliberation on drawing funds for major preventative painting and waterproofing works.`,
    sampleMOM: {
      title: "Minutes of Special General Body Meeting (SGM) - Wing 'A'",
      scope: 'A_BUILDING',
      executiveSummary: "The Special General Body of Wing 'A' convened after due statutory notice to resolve upon major capital maintenance works, CCTV surveillance enhancement, and appointment of certified structural auditors.",
      agendaItems: [
        {
          itemNo: "1",
          title: "Appointment of PMC / Certified Structural Auditor",
          category: "Statutory Compliance",
          discussion: "Examined three competitive quotations from BMC/PMC empaneled structural auditors. Scope covers ultrasonic pulse velocity tests, core tests, and dampness mapping.",
          decision: "General body approved M/s Technocivil Consultants at an agreed fee of ₹65,000."
        },
        {
          itemNo: "2",
          title: "CCTV Surveillance Expansion in Basements & Lobbies",
          category: "Security Infrastructure",
          discussion: "Reviewed security blind spots in basement 1 & 2 and service corridors.",
          decision: "Sanctioned addition of 8 CP-Plus 5MP IP cameras with 30-day NVR storage."
        }
      ],
      resolutions: [
        {
          resNo: "RES-SGM/2026/01",
          subject: "Appointment of Structural Auditor for Wing 'A'",
          proposer: "Society Chairman",
          seconder: "A-101 (Amit)",
          verdict: "Passed with 2/3rd Majority",
          text: "RESOLVED THAT the appointment of M/s Technocivil Consultants for comprehensive structural auditing of Wing 'A' at ₹65,000 plus taxes is hereby ratified."
        }
      ],
      actionItems: [
        {
          id: "ACT-SGM-01",
          task: "Issue appointment letter and execute non-disclosure agreement with Technocivil Consultants",
          assignedTo: "Society Secretary",
          dueDate: new Date(Date.now() + 10 * 86400000).toISOString().split('T')[0],
          priority: "HIGH",
          category: "Governance",
          status: "OPEN"
        }
      ],
      financialNotes: "Expenditure to be funded from the designated Major Repair / Sinking Fund Reserve.",
      nextMeeting: "Annual General Body Meeting (AGM) as scheduled."
    }
  }
];
