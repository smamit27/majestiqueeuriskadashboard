/**
 * AGM & Society General Body Meeting Records
 * Majestique Euriska 'A' Building Co-operative Housing Society Ltd.
 */

export const INITIAL_AGM_MEETINGS = [
  {
    id: 'agm-2026',
    year: '2026',
    meetingType: 'Annual General Body Meeting (AGM)',
    title: 'AGM 2026 — Annual General Meeting Minutes',
    date: '2026-09-06',
    displayDate: 'Sunday, 6th September 2026',
    venue: 'Society Clubhouse',
    societyDetails: {
      name: "Majestique Euriska 'A' Building Co-operative Housing Society Ltd.",
      marathiName: "मॅजेस्टिक युरिस्का 'ए' बिल्डिंग सहकारी गृहरचना संस्था मर्यादित",
      regNo: 'PNA/PNA (4)/HSG/(TC)/21207/2019-20 Date 09/08/2019',
      address: 'S. No. 2, Plot No C-1, Village Mohammed Wadi, Taluka Haveli, District Pune, Pune 411060',
      email: 'majestiqueeuriska.a@gmail.com',
      noticeRef: 'As per prior notice convened as per applicable MCS Act guidelines'
    },
    attendance: {
      totalMembersPresent: 20,
      quorumStatus: 'Quorum Achieved (20 Members)',
      notes: 'The Chairman welcomed all members present and introduced the Committee Members in attendance. He also outlined the proceedings and agenda of the meeting.'
    },
    signatories: [
      { role: 'Chairman', status: 'Signed & Sealed' },
      { role: 'Secretary', name: 'A Singh', status: 'Signed & Sealed' },
      { role: 'Treasurer', status: 'Signed & Sealed' }
    ],
    officialSeal: "MAJESTIQUE EURISKA 'A' BUILDING SAHAKARI GRUHRACHANA SANSTHA MARYADIT (Reg. No. PNA/PNA/(4)/HSG/(TC)/21207 2019-20 Dt. 9/8/19)",
    documentFile: {
      fileName: 'AGM_2026_Minutes_Majestique_Euriska_A_Building.pdf',
      downloadUrl: '/downloads/AGM_2026_Minutes_Majestique_Euriska_A_Building.pdf',
      fileSize: '2.25 MB',
      pageCount: 3,
      verifiedSigned: true
    },
    resolutions: [
      {
        id: 'res-1.0',
        itemNo: '1.0',
        title: 'Annual Audit Report',
        category: 'Audit & Accounts',
        summary: 'The Annual Audit Report was presented, deliberated, and formally adopted by the General Body.',
        assignee: 'Managing Committee',
        status: 'PASSED',
        implementation: 'Statutory audit adoption has been completed in accordance with MCS Act standards.',
        badgeColor: '#10b981',
        tag: 'Passed & Implemented'
      },
      {
        id: 'res-2.0',
        itemNo: '2.0',
        title: 'Fixed Deposit Mandate',
        category: 'Treasury & Investments',
        summary: 'Approved continuing authorization to retain a ₹3,00,000 operational floor balance and deploy surplus funds into Fixed Deposits without recurring AGM sanctions.',
        assignee: 'Managing Committee',
        status: 'PASSED',
        implementation: 'Managing Committee/Treasury is authorized to execute auto-sweep/term deposits for operational balances above ₹3,00,000.',
        badgeColor: '#10b981',
        tag: 'Passed & Implemented'
      },
      {
        id: 'res-3.0',
        itemNo: '3.0',
        title: 'Solar Power Project',
        category: 'Infrastructure & Capex',
        summary: 'In-principle approval was granted for the building solar power project. The Committee was directed to invite commercial tenders and initiate required statutory compliance and procedural formalities.',
        assignee: 'Managing Committee',
        status: 'ACTION REQUIRED',
        implementation: 'Invite vendor quotations/commercial tenders for solar power installation and formulate vendor evaluation matrix.',
        badgeColor: '#f59e0b',
        tag: 'Action Required'
      },
      {
        id: 'res-4.0',
        itemNo: '4.0',
        title: 'Appointment of Auditor',
        category: 'Statutory Compliance',
        summary: 'The proposal to appoint a new statutory auditor was approved, subject to finalization of engagement terms and completion of the required statutory procedures and filings.',
        assignee: 'Managing Committee',
        status: 'FOLLOW-UP REQUIRED',
        implementation: 'Finalize engagement terms and statutory formalities with the newly appointed auditor.',
        badgeColor: '#8b5cf6',
        tag: 'Follow-Up Required'
      },
      {
        id: 'res-5.0',
        itemNo: '5.0',
        title: 'Maintenance & Sinking Fund',
        category: 'Finance & Reserves',
        summary: 'Regular monthly maintenance charges will remain unchanged. The Committee was instructed to prepare a financial projection model to strengthen and build the long-term sinking fund.',
        assignee: 'Managing Committee',
        status: 'ACTION REQUIRED',
        implementation: 'Formulate a dedicated long-term financial projection for strengthening the sinking fund.',
        badgeColor: '#f59e0b',
        tag: 'Action Required'
      },
      {
        id: 'res-6.0',
        itemNo: '6.0',
        title: 'Shop Dues Recovery',
        category: 'Legal & Recovery',
        summary: 'Formal recovery proceedings were prioritized to collect accumulated arrears exceeding ₹3,00,000 from commercial shop occupants.',
        assignee: 'Managing Committee',
        status: 'FOLLOW-UP REQUIRED',
        implementation: 'Issue formal collection demands and proceed with appropriate recovery action for outstanding shop maintenance dues exceeding ₹3,00,000.',
        badgeColor: '#8b5cf6',
        tag: 'Follow-Up Required'
      },
      {
        id: 'res-7.0',
        itemNo: '7.0',
        title: 'Covered Parking — Sumit',
        category: 'Parking & Allotment',
        summary: 'The concerned flat owner was directed to produce the original builder/society parking allotment letter to reconcile the parking allocation with the building parking registry records.',
        assignee: 'Managing Committee',
        status: 'PENDING',
        implementation: "Awaiting submission of original parking allocation documentation from the concerned flat owner for verification of covered parking slot against the Society's records.",
        badgeColor: '#ef4444',
        tag: 'Pending'
      }
    ],
    executiveSummary: {
      passed: [
        { item: '1.0 Annual Audit Report', desc: 'Statutory audit adoption completed.' },
        { item: '2.0 Fixed Deposit Mandate', desc: 'Operational floor ₹3L; surplus into Fixed Deposits without recurring sanctions.' }
      ],
      actionRequired: [
        { item: '3.0 Solar Power Project', desc: 'Invite vendor quotations/commercial tenders & statutory compliance.' },
        { item: '5.0 Maintenance & Sinking Fund', desc: 'Prepare long-term financial projection for sinking fund (maintenance charges unchanged).' }
      ],
      pending: [
        { item: '7.0 Covered Parking — Sumit', desc: 'Awaiting original builder/society parking allocation letter for verification.' }
      ],
      followUpRequired: [
        { item: '4.0 Appointment of Auditor', desc: 'Finalize engagement terms & statutory formalities with newly appointed auditor.' },
        { item: '6.0 Shop Dues Recovery', desc: 'Issue formal collection demands and proceed with recovery for arrears exceeding ₹3,00,000.' }
      ]
    },
    reviewMandate: 'All pending, action-required, and follow-up items will be formally reviewed in the upcoming Managing Committee Meeting. The Managing Committee will take necessary steps to ensure timely implementation of the decisions and resolutions approved during the Annual General Meeting.',
    meetingClosing: 'There being no further business to discuss, the Chairman thanked all the members for their valuable participation, suggestions, and cooperation. The meeting was thereafter concluded with a vote of thanks to the Chair.'
  },
  {
    id: 'agm-2025',
    year: '2025',
    meetingType: 'Annual General Body Meeting (AGM)',
    title: 'AGM 2025 — Annual General Meeting Minutes',
    date: '2025-11-02',
    displayDate: 'Sunday, 2nd November 2025',
    venue: 'Society Clubhouse',
    societyDetails: {
      name: "Majestique Euriska 'A' Building Co-operative Housing Society Ltd.",
      marathiName: "मॅजेस्टिक युरिस्का 'ए' बिल्डिंग सहकारी गृहरचना संस्था मर्यादित",
      regNo: 'PNA/PNA (4)/HSG/(TC)/21207/2019-20 Date 09/08/2019',
      address: 'S. No. 2, Plot No C-1, Village Mohammed Wadi, Taluka Haveli, District Pune, Pune 411060',
      email: 'majestiqueeuriska.a@gmail.com',
      noticeRef: 'As per prior notice convened on 2nd November 2025 as per applicable MCS Act guidelines'
    },
    attendance: {
      totalMembersPresent: 21,
      quorumStatus: 'Quorum Achieved (21 Members Met)',
      chairperson: 'Mr. Sachin Savakhande',
      notes: 'After the required quorum of 21 members was met, the Chairman welcomed all members present and introduced the Committee Members in attendance. He also outlined the proceedings of the meeting.'
    },
    signatories: [
      { role: 'Chairman', status: 'Signed & Sealed' },
      { role: 'Secretary', name: 'A Singh', status: 'Signed & Sealed' },
      { role: 'Treasurer', status: 'Signed & Sealed' }
    ],
    officialSeal: "MAJESTIQUE EURISKA 'A' BUILDING SAHAKARI GRUHRACHANA SANSTHA MARYADIT (Reg. No. PNA/PNA/(4)/HSG/(TC)/21207 2019-20 Dt. 9/8/19)",
    documentFile: {
      fileName: 'AGM_2025_Minutes_Majestique_Euriska_A_Building.pdf',
      downloadUrl: '/downloads/AGM_2025_Minutes_Majestique_Euriska_A_Building.pdf',
      fileSize: '1.55 MB',
      pageCount: 3,
      verifiedSigned: true
    },
    resolutions: [
      {
        id: 'res-2025-1',
        itemNo: '1',
        title: 'Welcome Address and Opening Remarks',
        category: 'Governance & Proceedings',
        summary: 'The Chairperson Mr. Sachin Savakhande welcomed all members and called the meeting to order. He thanked the members for their participation and highlighted the importance of the agenda points.',
        assignee: 'Chairperson / Managing Committee',
        status: 'PASSED',
        implementation: 'Meeting officially called to order and agenda presented to the general body.',
        badgeColor: '#10b981',
        tag: 'Passed & Implemented'
      },
      {
        id: 'res-2025-2',
        itemNo: '2',
        title: 'Confirmation & Approval of Previous SGM Minutes',
        category: 'Governance & Compliance',
        summary: 'The Chairperson invited comments or corrections. As there were none, the minutes of the previous SGM were unanimously approved and adopted.',
        assignee: 'General Body / Secretary',
        status: 'PASSED',
        implementation: 'Previous Special General Body Meeting minutes formally adopted without objections.',
        badgeColor: '#10b981',
        tag: 'Passed & Implemented'
      },
      {
        id: 'res-2025-3',
        itemNo: '3',
        title: 'Approval of Revised Financial Report 2024–2025',
        category: 'Finance & Accounts',
        summary: 'The Treasurer presented the revised financial report and addressed member questions. The revised financial report for FY 2024–2025 was unanimously approved.',
        assignee: 'Treasurer / Managing Committee',
        status: 'PASSED',
        implementation: 'Revised financial report for FY 2024–2025 formally audited, approved and closed.',
        badgeColor: '#10b981',
        tag: 'Passed & Implemented'
      },
      {
        id: 'res-2025-4',
        itemNo: '4',
        title: 'Roadside Trash & Common Area Cleanliness',
        category: 'Cleanliness & Hygiene',
        summary: 'Strict action will be taken against residents violating cleanliness rules. A fine of ₹300 will be imposed for any violation.',
        assignee: 'Managing Committee / Estate Staff',
        status: 'ACTION REQUIRED',
        implementation: 'Enforce strict cleanliness rules and impose ₹300 penalty for roadside trash and common area littering.',
        badgeColor: '#f59e0b',
        tag: 'Action Required'
      },
      {
        id: 'res-2025-5',
        itemNo: '5',
        title: 'Parking on Driveway',
        category: 'Parking & Traffic',
        summary: 'Proper parking slot markings will be enforced. Misuse of the driveway or incorrect parking will attract a ₹300 fine per month.',
        assignee: 'Managing Committee / Security',
        status: 'ACTION REQUIRED',
        implementation: 'Enforce proper slot markings and levy ₹300/month fine for driveway obstruction or unauthorized parking.',
        badgeColor: '#f59e0b',
        tag: 'Action Required'
      },
      {
        id: 'res-2025-6',
        itemNo: '6',
        title: 'Common Bird Net',
        category: 'Common Area Maintenance',
        summary: 'Proposal for installing common bird nets in designated areas was discussed and approved by residents.',
        assignee: 'Managing Committee',
        status: 'ACTION REQUIRED',
        implementation: 'Invite vendor quotations and install bird protection nets across common duct areas.',
        badgeColor: '#f59e0b',
        tag: 'Action Required'
      },
      {
        id: 'res-2025-7',
        itemNo: '7',
        title: 'Pesticide Control',
        category: 'Hygiene & Health',
        summary: 'Regular pest control services will be scheduled to maintain hygiene. Approved by residents.',
        assignee: 'Managing Committee',
        status: 'PASSED',
        implementation: 'Regular pest control services scheduled for society common shafts, ducts and grounds.',
        badgeColor: '#10b981',
        tag: 'Passed & Implemented'
      },
      {
        id: 'res-2025-8',
        itemNo: '8',
        title: 'Maintenance Dues & Defaulters',
        category: 'Billing & Recovery',
        summary: 'Maintenance charges must be paid by the 10th of every month. A two-month default will trigger a notice. Continued default will result in suspension of trash collection and display of names on the notice board.',
        assignee: 'Treasurer / Managing Committee',
        status: 'FOLLOW-UP REQUIRED',
        implementation: 'Enforce 10th monthly cutoff; issue 2-month default notice; suspend trash service and display names on notice board for continued default.',
        badgeColor: '#8b5cf6',
        tag: 'Follow-Up Required'
      },
      {
        id: 'res-2025-9',
        itemNo: '9',
        title: 'Fixed Deposit (FD) Policy',
        category: 'Treasury & Investments',
        summary: 'Policy of "One Society – One Building – One FD Account" approved by residents.',
        assignee: 'Managing Committee / Treasury',
        status: 'PASSED',
        implementation: 'Consolidate society fixed deposits under "One Society – One Building – One FD Account" guideline.',
        badgeColor: '#10b981',
        tag: 'Passed & Implemented'
      },
      {
        id: 'res-2025-10',
        itemNo: '10',
        title: 'Auditor Appointment, Accounting & Audit Charges',
        category: 'Statutory & Audit',
        summary: 'Residents approved accounting and audit charges. A new auditor will be appointed for FY 2025–2026.',
        assignee: 'Managing Committee',
        status: 'FOLLOW-UP REQUIRED',
        implementation: 'Finalize appointment of new statutory auditor for FY 2025–2026 with approved fees.',
        badgeColor: '#8b5cf6',
        tag: 'Follow-Up Required'
      },
      {
        id: 'res-2025-11',
        itemNo: '11',
        title: 'Recovery from Builder',
        category: 'Legal & Builder Escalations',
        summary: 'The auditor will prepare a detailed report on pending recoveries from the builder. Approved by residents.',
        assignee: 'Auditor / Managing Committee',
        status: 'FOLLOW-UP REQUIRED',
        implementation: 'Prepare comprehensive forensic report on all pending recoveries and dues receivable from the builder.',
        badgeColor: '#8b5cf6',
        tag: 'Follow-Up Required'
      },
      {
        id: 'res-2025-12',
        itemNo: '12',
        title: 'Tenant Shifting Charges & Verification',
        category: 'Tenant Rules & Security',
        summary: 'Tenants staying for over one month without the owner must pay shifting charges and complete mandatory police verification. Approved by residents.',
        assignee: 'Society Office / Security',
        status: 'PASSED',
        implementation: 'Enforce mandatory move-in shifting charges and verified police clearance for tenant tenancies over 1 month.',
        badgeColor: '#10b981',
        tag: 'Passed & Implemented'
      },
      {
        id: 'res-2025-13',
        itemNo: '13',
        title: 'Parking Policy & Slot Marking',
        category: 'Parking & Allotment',
        summary: 'Common area markings will be completed. Unallocated spaces cannot be claimed or occupied. Residents must submit parking details within one month.',
        assignee: 'Managing Committee / Parking Team',
        status: 'ACTION REQUIRED',
        implementation: 'Complete physical common area slot markings; 1-month resident submission mandate for parking details.',
        badgeColor: '#f59e0b',
        tag: 'Action Required'
      },
      {
        id: 'res-2025-14',
        itemNo: '14',
        title: 'Solar Power Project',
        category: 'Energy & Capex',
        summary: 'Quotations will be invited for a solar project to reduce common electricity expenses. Approved by residents.',
        assignee: 'Managing Committee',
        status: 'ACTION REQUIRED',
        implementation: 'Invite competitive vendor quotations for solar project to lower common utility electricity expenses.',
        badgeColor: '#f59e0b',
        tag: 'Action Required'
      },
      {
        id: 'res-2025-15',
        itemNo: '15',
        title: 'Committee Member Change',
        category: 'Managing Committee Governance',
        summary: 'Resignation of Mr. Mandar (A-906) was accepted. Mr. Prashant (A-505) was appointed as the new committee member. Approved by AGM attendees.',
        assignee: 'Managing Committee',
        status: 'PASSED',
        implementation: 'Formalize committee reconstitution: accepted resignation of Mr. Mandar (A-906) and appointment of Mr. Prashant (A-505).',
        badgeColor: '#10b981',
        tag: 'Passed & Implemented'
      },
      {
        id: 'res-2025-16',
        itemNo: '16',
        title: 'Painting & Cleanliness – Society Outside Walls',
        category: 'Building Preservation & By-laws',
        summary: 'Painting or altering the societies outside walls is strictly prohibited. If any resident has already painted or changed external wall, they must restore it to original colour and finish at their own cost. If society undertakes restoration, complete cost recovered from resident. Any alteration, drilling or damage caused will be fully borne by that resident.',
        assignee: 'Managing Committee / Estate Supervisor',
        status: 'PASSED',
        implementation: 'Strict prohibition on external wall alteration; resident self-restoration mandate; full cost recovery for structural/common wall damage.',
        badgeColor: '#10b981',
        tag: 'Passed & Implemented'
      }
    ],
    executiveSummary: {
      passed: [
        { item: '1. Welcome Address & Opening Remarks', desc: 'Called to order by Chairperson Mr. Sachin Savakhande.' },
        { item: '2. Confirmation of Previous SGM Minutes', desc: 'Unanimously approved and formally adopted.' },
        { item: '3. Revised Financial Report 2024–2025', desc: 'Presented by Treasurer and unanimously approved.' },
        { item: '7. Pesticide Control', desc: 'Scheduled recurring pest control services.' },
        { item: '9. Fixed Deposit (FD) Policy', desc: 'Adopted "One Society – One Building – One FD Account" rule.' },
        { item: '12. Tenant Shifting & Police Verification', desc: 'Mandatory shifting charges & police verification for >1 month stays.' },
        { item: '15. Committee Member Change', desc: 'Accepted resignation of Mandar (A-906); appointed Prashant (A-505).' },
        { item: '16. External Wall Painting Prohibition', desc: 'Strict ban on painting/altering outside walls; mandatory resident restoration.' }
      ],
      actionRequired: [
        { item: '4. Cleanliness Violation Fine', desc: 'Impose ₹300 fine for roadside trash & common area littering.' },
        { item: '5. Driveway Parking Slot Fine', desc: 'Enforce slot markings; ₹300/month fine for driveway parking.' },
        { item: '6. Common Bird Net', desc: 'Procure quotations and install common bird nets in designated areas.' },
        { item: '13. Parking Policy & Slot Marking', desc: 'Complete common markings; 1-month deadline for residents to submit parking proof.' },
        { item: '14. Solar Power Project', desc: 'Invite vendor quotations for solar project to reduce common power costs.' }
      ],
      pending: [],
      followUpRequired: [
        { item: '8. Maintenance Dues & Defaulters', desc: '10th cutoff date; 2-month default notice; trash suspension & display names on board.' },
        { item: '10. Auditor Appointment (FY 2025–2026)', desc: 'Approve audit charges and appoint new auditor.' },
        { item: '11. Recovery from Builder', desc: 'Auditor to prepare detailed forensic report on pending recoveries from builder.' }
      ]
    },
    reviewMandate: 'All resolutions passed during the Annual General Body Meeting held on 02/11/2025 are binding on all members. The Managing Committee is mandated to implement policies and enforce penalties as approved by the General Body.',
    meetingClosing: 'The meeting concluded with a vote of thanks to Chairperson Mr. Sachin Savakhande and the Managing Committee by all attendees.'
  },
  {
    id: 'sgm-2025',
    year: '2025 (Jun)',
    meetingType: 'Special General Meeting (SGM)',
    title: 'SGM 2025 — Special General Meeting Minutes',
    date: '2025-06-15',
    displayDate: 'Sunday, 15th June 2025 (Minutes Dated: 18/06/2025)',
    venue: 'Society Clubhouse',
    societyDetails: {
      name: "Majestique Euriska 'A' Building Co-operative Housing Society Ltd.",
      marathiName: "मॅजेस्टिक युरिस्का 'ए' बिल्डिंग सहकारी गृहरचना संस्था मर्यादित",
      regNo: 'PNA/PNA (4)/HSG/(TC)/21207/2019-20 Date 09/08/2019',
      address: 'S. No. 2, Plot No C-1, Village Mohammed Wadi, Taluka Haveli, District Pune, Pune 411060',
      email: 'majestiqueeuriska.a@gmail.com',
      noticeRef: 'As per prior notice, convened on 15th June 2025 as per applicable MCS Act guidelines'
    },
    attendance: {
      totalMembersPresent: 22,
      quorumStatus: 'Quorum Achieved (22 Members Met)',
      notes: 'After the required quorum (22 members) was met, the Chairman welcomed all the members present and introduced the Committee Members who were in attendance at the Clubhouse. He also outlined the proceedings of the meeting.'
    },
    signatories: [
      { role: 'Chairman', status: 'Signed & Sealed' },
      { role: 'Secretary', name: 'A Singh', status: 'Signed & Sealed' },
      { role: 'Treasurer', status: 'Signed & Sealed' }
    ],
    officialSeal: "MAJESTIQUE EURISKA 'A' BUILDING SAHAKARI GRUHRACHANA SANSTHA MARYADIT (Reg. No. PNA/PNA/(4)/HSG/(TC)/21207 2019-20 Dt. 9/8/19)",
    documentFile: {
      fileName: 'SGM_2025_Minutes_Majestique_Euriska_A_Building.pdf',
      downloadUrl: '/downloads/SGM_2025_Minutes_Majestique_Euriska_A_Building.pdf',
      imageUrl: '/visuals/SGM_June_2025_Minutes_Majestique_Euriska_A_Building.jpg',
      fileSize: '113 KB',
      pageCount: 1,
      verifiedSigned: true
    },
    resolutions: [
      {
        id: 'res-sgm-1',
        itemNo: '1',
        title: 'Revision of Monthly Maintenance Charges',
        category: 'Maintenance & Sinking Fund',
        summary: 'To address rising maintenance and operational costs, the following revised charges were proposed effective 1st July 2025: Maintenance Charges: ₹2,850 per flat, Sinking Fund Contribution: ₹150 per flat (Total Monthly Charges: ₹3,000 per flat). Tenants Flat will be 10% Extra on Maintenance Charges (Rs. 285). Unanimously approved by all present members.',
        assignee: 'Managing Committee / Treasury',
        status: 'PASSED',
        implementation: 'Effective 1st July 2025: Total monthly maintenance fixed at ₹3,000 (₹2,850 maintenance + ₹150 sinking fund) with +10% (₹285) tenant surcharge.',
        badgeColor: '#10b981',
        tag: 'Passed & Implemented'
      },
      {
        id: 'res-sgm-2',
        itemNo: '2',
        title: 'Approval for EPDM Safety Flooring',
        category: 'Children Play Area / Infrastructure',
        summary: 'A detailed presentation on vendor options, pricing, and benefits of EPDM safety flooring for the children’s play area was given. The proposal to proceed with the finalized vendor was accepted. The work is scheduled to begin post-monsoon, contingent on a minimum of seven consecutive dry days. Approved unanimously.',
        assignee: 'Managing Committee',
        status: 'PASSED',
        implementation: 'Finalized vendor accepted for EPDM rubber safety flooring in children play area; scheduled execution post-monsoon with 7 consecutive dry days window.',
        badgeColor: '#10b981',
        tag: 'Passed & Implemented'
      },
      {
        id: 'res-sgm-3',
        itemNo: '3',
        title: 'Appointment of Auditor for FY 2023–24 and 2024 - 2025',
        category: 'Statutory Audit & Accounts',
        summary: 'The committee proposed appointing a registered and compliant auditor for financial year 2023-2024 and 2024–25. Authority was given to the Managing Committee to finalize the appointment based on cost and statutory requirements. Approved unanimously: Mr. Balaji Chaudhari.',
        assignee: 'Managing Committee / Auditor',
        status: 'PASSED',
        implementation: 'Appointed Mr. Balaji Chaudhari as official statutory auditor for society accounts of FY 2023-24 and FY 2024-25.',
        badgeColor: '#10b981',
        tag: 'Passed & Implemented'
      }
    ],
    executiveSummary: {
      passed: [
        { item: '1. Maintenance Charges Revision (Effective 01-Jul-2025)', desc: '₹2,850 maintenance + ₹150 sinking = ₹3,000/flat. Tenants flat +10% extra (₹285).' },
        { item: '2. EPDM Safety Flooring (Children Play Area)', desc: 'Finalized vendor approved; post-monsoon execution with 7 consecutive dry days.' },
        { item: '3. Auditor Appointment (FY 2023-24 & FY 2024-25)', desc: 'Mr. Balaji Chaudhari appointed as registered statutory auditor.' }
      ],
      actionRequired: [],
      pending: [],
      followUpRequired: []
    },
    reviewMandate: 'As per the given agenda, all the points were thoroughly discussed and finally approved by all the members attending. The Managing Committee was empowered to execute revised billing from 1st July 2025, supervise EPDM play area flooring, and formalize statutory audit filings.',
    meetingClosing: 'The meeting was adjourned after all agenda points were discussed with unanimous agreement.'
  }
];
