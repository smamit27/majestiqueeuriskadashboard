// ─── Eisha Asset Developers Phase II Maintenance Reconciliation Data ──────────
// Extracted directly from Developer Audit Sheet (01.07.2021 till 31.03.2023 & movements till 31.03.2026)

export const BUILDER_RECO_DATA = {
  meta: {
    title: "Eisha Asset Developers Phase II Maintenance Reco A & B Bldg",
    subTitle: "Handover Maintenance Audit & Bank Balance Reconciliation",
    period: "01.07.2021 till 31.03.2023",
    subsequentPeriod: "After 31.03.2023 till 31.03.2026",
    developer: "Eisha Asset Developers",
    wings: {
      A: { name: "A Wing", handoverDate: "Sep 2019", flats: 87 },
      B: { name: "B Wing", handoverDate: "Jan 2019", flats: 96 }
    },
    documentUrl: "/visuals/builder_reco_doc.jpeg",
    documentTitle: "Signed Phase II Audit & Ledger Sheet"
  },

  // 1. Expenses Breakdown (Till 26.11.2021)
  expenses: [
    {
      id: 'audit-pre-july21',
      label: 'Start to 30.06.2021 (As per Audit)',
      wingA: 2219896,
      wingB: 4755593,
      total: 6975489,
      notes: 'Initial audited phase expenses up to 30 June 2021 (Wing A itemized by Rohit Dhage & Associates)'
    },
    {
      id: 'working-jul-nov21',
      label: 'From 01.07.21 to 26.11.2021 (as working)',
      wingA: 3370579,
      wingB: 1530985.50,
      total: 4901564.50,
      notes: 'Operational maintenance working period from July to Nov 2021'
    },
    {
      id: 'acct-opening-refund',
      label: 'Refund to EADP II Account opening Amount',
      wingA: 50000,
      wingB: 50000,
      total: 100000,
      notes: 'Seed refund to developer Phase II operational account'
    }
  ],

  // I. Total Expenses till 23.11.2021
  totalExpensesI: {
    label: "I. Total Expenses till 23.11.2021",
    wingA: 5640475,
    wingB: 6336578.50,
    total: 11977053.50
  },

  // 2. Cost Shift (Shifted from B to A)
  costShifts: [
    {
      id: 'cs-elec',
      category: 'Electricity',
      label: 'Cost Shift B to A — Electricity',
      wingA: 384545,
      wingB: -384545,
      net: 0,
      notes: 'Reallocation of shared electrical feeder and common meter power charges'
    },
    {
      id: 'cs-garden',
      category: 'Gardening',
      label: 'Cost Shift B to A — Gardening',
      wingA: 74344,
      wingB: -74344,
      net: 0,
      notes: 'Reallocation of common central lawn, trees and landscape upkeep'
    },
    {
      id: 'cs-pool',
      category: 'Swimming pool',
      label: 'Cost Shift B to A — Swimming pool',
      wingA: 9756,
      wingB: -9756,
      net: 0,
      notes: 'Reallocation of clubhouse swimming pool filtration & chemical supplies'
    }
  ],

  // II. Total Cost Shift
  totalCostShiftII: {
    label: "II. Total Cost Shift",
    wingA: 468645,
    wingB: -468645,
    net: 0
  },

  // Total Expenses (I + II)
  totalExpensesNet: {
    label: "Total Expenses (I + II)",
    formula: "I. Expenses till 23.11.2021 + II. Cost Shifts",
    wingA: 6109120, // 5640475 + 468645
    wingB: 5867933.50, // 6336578.50 - 468645
    total: 11977053.50
  },

  // 3. Receipts (Income Collections)
  receipts: [
    {
      id: 'rcpt-opening',
      label: 'Maintenance Account Opening A & B',
      wingA: 50000,
      wingB: 50000,
      total: 100000,
      notes: 'Initial account opening credits for Wings A & B'
    },
    {
      id: 'rcpt-collections',
      label: 'Receipt (Member Collections)',
      wingA: 6173015,
      wingB: 6315054,
      total: 12488069,
      notes: 'Resident and builder maintenance collections credited (Wing A audited ₹61,73,015)'
    },
    {
      id: 'rcpt-bb',
      label: 'Big Basket',
      wingA: 750,
      wingB: 750,
      total: 1500,
      notes: 'Smart locker / kiosk facility charge receipts'
    }
  ],

  // Total Receipt
  totalReceipts: {
    label: "Total Receipt",
    wingA: 6223765,
    wingB: 6365804,
    total: 12589569
  },

  // 4. Net Balance as per Working
  netBalanceWorking: {
    label: "Net Balance as per Working",
    formula: "Total Receipt − Total Expenses (I + II)",
    wingA: 114645, // 6223765 - 6109120
    wingB: 497870.50, // 6365804 - 5867933.50
    total: 612515.50 // 114645 + 497870.50
  },

  // 5. Closing & Tally Books Reconciliation (31-03-2023)
  auditReconciliation: {
    asOf: "31-03-2023",
    bookBalance: 612515.50,
    tallyBooks: 619470.40,
    difference: 6954.90, // Tally - Working Book Balance
    notes: "Tally books show ₹6,954.90 higher surplus than manual working sheet. Pending reconciliation with developer audit vouchers."
  },

  // 6. Movements After 31.03.2023 to 31.03.2026
  postPeriodLedger: {
    openingBalance: 619470.40,
    openingDate: "31.03.2023",
    transactions: [
      {
        id: 'tx-yadavilli',
        date: "22.07.2023",
        particulars: "STVAT-A-805-Prasad Yadavilli",
        amount: -9270.00,
        type: "debit",
        remarks: "Paid towards 3 month maintenance refund"
      },
      {
        id: 'tx-ff-trf',
        date: "15.12.2023",
        particulars: "B Bldg F & F Maintenance Trf",
        amount: -500000.00,
        type: "debit",
        remarks: "B Bldg F & F Maintenance transfer to society account"
      },
      {
        id: 'tx-bank-charges',
        date: "31.03.2026",
        particulars: "Bank Charges",
        amount: -1.17,
        type: "debit",
        remarks: "Bank debit towards account maintenance & ledger charges"
      }
    ],
    closingBalance: 110199.23, // 619470.40 - 9270 - 500000 - 1.17
    closingDate: "31.03.2026",
    summaryNotes: "Net residual surplus of ₹1,10,199.23 currently due from Eisha Asset Developers in Tally books."
  }
};

// ─── Wing A Certified Audited Statement (09/08/2019 to 30/06/2021) ───────────
// Certified by Rohit Dhage & Associates, Chartered Accountants (FRN: 144303W)
export const WING_A_AUDITED_STATEMENT = {
  meta: {
    societyName: "Majestique Eureska A Building Co-Op. Housing Society Ltd.",
    title: "Income & Expenditure Statement",
    period: "09/08/2019 to 30/06/2021",
    auditor: {
      firm: "Rohit Dhage & Associates",
      designation: "Chartered Accountants",
      frn: "144303W",
      proprietor: "CA Rohit Dhage",
      membershipNo: "176512",
      coopDeptEmpanelmentNo: "1013829"
    },
    signatories: ["Rohit Dhage & Associates (Chartered Accountants)", "Promoter Builder"],
    documentUrl: "/visuals/wing_a_audit_statement.jpg"
  },
  income: {
    items: [
      { id: 'inc-maint', particular: 'Maintenance Charges Received', amount: 6173015, notes: 'Direct maintenance contributions from members' },
      { id: 'inc-interest', particular: 'Interest on Savings Account', amount: 3516, notes: 'Bank savings interest credited' }
    ],
    totalIncome: 6176531
  },
  expenditure: {
    items: [
      { id: 'exp-audit', particular: 'Audit Fees', amount: 19000, category: 'Professional & Legal', notes: 'Auditor statutory audit charges' },
      { id: 'exp-bank', particular: 'Bank Charges', amount: 434, category: 'Administrative', notes: 'Bank account maintenance & folio charges' },
      { id: 'exp-cleaning', particular: 'Cleaning Exp', amount: 45458, category: 'Housekeeping', notes: 'Common area sanitization & cleaning supplies' },
      { id: 'exp-elec-exp', particular: 'Electrical Expenses', amount: 5955, category: 'Repairs & Maintenance', notes: 'Electrical replacement components & wiring' },
      { id: 'exp-elec-chg', particular: 'Electricity Charges', amount: 504525, category: 'Utilities', notes: 'MSEDCL common meter electricity bills' },
      { id: 'exp-garden', particular: 'Gardening Expenses', amount: 6000, category: 'Landscape', notes: 'Lawn trimming, fertilizer and plant maintenance' },
      { id: 'exp-hk', particular: 'House Keeping', amount: 406266, category: 'Housekeeping', notes: 'Housekeeping personnel deployment & daily services' },
      { id: 'exp-tds-int', particular: 'Int. on Tds', amount: 39, category: 'Administrative', notes: 'Statutory interest on TDS remittance' },
      { id: 'exp-lift', particular: 'Lift Maintainance', amount: 239374, category: 'AMC & Equipment', notes: 'Elevator Annual Maintenance Contract & servicing' },
      { id: 'exp-gym', particular: 'Maint. Gym Equipment', amount: 6490, category: 'Repairs & Maintenance', notes: 'Gym machine servicing & safety lubrication' },
      { id: 'exp-plumbing', particular: 'Maint. Plumbing / Sanitary', amount: 105023, category: 'Repairs & Maintenance', notes: 'Pipeline leak repairs, valves, and sanitary lines' },
      { id: 'exp-mygate', particular: 'My Gate System', amount: 1475, category: 'Security & Software', notes: 'Gate management visitor software subscription' },
      { id: 'exp-pool', particular: 'Pool Maint. Charges', amount: 56585, category: 'Amenities', notes: 'Swimming pool chlorine, chemical treatments & filtration' },
      { id: 'exp-security', particular: 'Security Charges', amount: 753615, category: 'Security & Software', notes: '24x7 security guards deployment & gate monitoring' },
      { id: 'exp-water', particular: 'Water Exp', amount: 69658, category: 'Utilities', notes: 'Drinking water tankers & auxiliary supply' }
    ],
    totalExpenditure: 2219896
  },
  surplus: 3956635 // 6176531 - 2219896
};

// Formatter helpers
export function fmtINR(val, includeSign = false) {
  if (val === null || val === undefined || isNaN(val)) return '—';
  const num = Number(val);
  const isNeg = num < 0;
  const abs = Math.abs(num);
  const formatted = abs.toLocaleString('en-IN', {
    maximumFractionDigits: 2,
    minimumFractionDigits: Number.isInteger(abs) ? 0 : 2
  });
  if (isNeg) return `-₹${formatted}`;
  if (includeSign && num > 0) return `+₹${formatted}`;
  return `₹${formatted}`;
}


// ─── BOM Maintenance A/c No. 60305942224 Ledger Book Data ─────────────────────
// Extracted from 4-page Bank of Maharashtra Passbook Ledger (1-Jul-2021 to 23-Nov-2021 & till 31-03-2023)

export const BOM_PASSBOOK_LEDGER = {
  meta: {
    title: "EISHA ASSET DEVELOPERS PHASE-II — BOM Maintenance A/c No. 60305942224 Book",
    accountNo: "60305942224",
    bank: "Bank of Maharashtra (BOM)",
    period: "01-Jul-2021 to 23-Nov-2021 (Extended till 07-Jan-2023)",
    handwrittenSummary: "Exp Till - 31/03/2023",
    totals: {
      totalDebit: 5624072.90,
      totalCredit: 5004602.50,
      closingBalance: 619470.40,
      openingBalance: 5622572.90,
      bigBasketReceipts: 1500.00
    },
    wingBreakdown: {
      A: { debits: 714.00, credits: 3370514.00, count: 48, label: "Wing A" },
      B: { debits: 786.00, credits: 1531050.50, count: 77, label: "Wing B" },
      C: { debits: 0.00, credits: 3038.00, count: 3, label: "Common (Wing C)" },
      Refund: { debits: 0.00, credits: 100000.00, count: 1, label: "EADP Refund" },
      Opening: { debits: 5622572.90, credits: 0.00, count: 1, label: "Opening Balance" }
    },
    keyFindings: [
      {
        title: "₹24,00,000 Transferred to Wing A Society",
        description: "On 26-11-2021 (Vch #512), ₹24,00,000 was transferred from BOM Maintenance A/c to Majestique Euriska A Building Sahakari Gruhrachna Sanstha."
      },
      {
        title: "₹6,20,000 Developer Supervision Charges Debited",
        description: "On 23-11-2021, the builder charged ₹2,70,000 to Wing A (Vch #498) and ₹3,50,000 to Wing B (Vch #499) for supervision charges."
      },
      {
        title: "₹1,00,000 EADP Account Opening Refund",
        description: "On 23-11-2021 (Vch #43), ₹1,00,000 was refunded to BOM C/A No. 60186732081 as seed account opening amount."
      },
      {
        title: "Reconciliation Match with Developer Reco",
        description: "Directly provides line-item evidence for Row 2 'From 01.07.21 to 26.11.2021 (as working)' (₹49,01,564.50) and Row 3 'Refund to EADP II Account opening Amount' (₹1,00,000.00)."
      }
    ],
    documents: [
      { page: 1, url: "/visuals/ledger_page_1.jpg", title: "Page 1: 01-Jul-2021 to 20-Oct-2021 (Opening Balance & BPCL)" },
      { page: 2, url: "/visuals/ledger_page_2.jpg", title: "Page 2: 06-Jul-2021 to 16-Sep-2021 (Security, TDS, Water & Audit)" },
      { page: 3, url: "/visuals/ledger_page_3.jpg", title: "Page 3: 14-Oct-2021 to 03-Dec-2021 (Supervision & ₹24L Transfer)" },
      { page: 4, url: "/visuals/ledger_page_4.jpg", title: "Page 4: 06-Dec-2021 to 07-Jan-2023 (Closing Balance ₹6,19,470.40)" }
    ]
  },
  transactions: [
  {
    "id": 1,
    "date": "01-07-2021",
    "crdr": "Cr",
    "particulars": "Opening Balance",
    "vchType": "",
    "vchNo": "",
    "remark": "Opening Balance",
    "wing": "Opening",
    "debit": 5622572.9,
    "credit": 0.0,
    "page": 1
  },
  {
    "id": 2,
    "date": "03-07-2021",
    "crdr": "Dr",
    "particulars": "Bank Charges",
    "vchType": "Payment",
    "vchNo": "235",
    "remark": "Bank Charges",
    "wing": "A",
    "debit": 0.0,
    "credit": 29.5,
    "page": 1
  },
  {
    "id": 3,
    "date": "02-10-2021",
    "crdr": "Dr",
    "particulars": "Bank Charges",
    "vchType": "Payment",
    "vchNo": "418",
    "remark": "Bank Charges",
    "wing": "B",
    "debit": 0.0,
    "credit": 29.5,
    "page": 1
  },
  {
    "id": 4,
    "date": "21-09-2021",
    "crdr": "CR",
    "particulars": "Big Basket",
    "vchType": "Receipt",
    "vchNo": "348",
    "remark": "87 Flats",
    "wing": "A",
    "debit": 714.0,
    "credit": 0.0,
    "page": 1
  },
  {
    "id": 5,
    "date": "21-09-2021",
    "crdr": "CR",
    "particulars": "Big Basket",
    "vchType": "Receipt",
    "vchNo": "348",
    "remark": "96 Flats",
    "wing": "B",
    "debit": 786.0,
    "credit": 0.0,
    "page": 1
  },
  {
    "id": 6,
    "date": "05-10-2021",
    "crdr": "Dr",
    "particulars": "BPCL-E CMS (Fleet Business)",
    "vchType": "Payment",
    "vchNo": "426",
    "remark": "BPCL",
    "wing": "A",
    "debit": 0.0,
    "credit": 19016.0,
    "page": 1
  },
  {
    "id": 7,
    "date": "05-10-2021",
    "crdr": "Dr",
    "particulars": "BPCL-E CMS (Fleet Business)",
    "vchType": "Payment",
    "vchNo": "426",
    "remark": "BPCL",
    "wing": "B",
    "debit": 0.0,
    "credit": 20984.0,
    "page": 1
  },
  {
    "id": 8,
    "date": "01-11-2021",
    "crdr": "Dr",
    "particulars": "BPCL-E CMS (Fleet Business)",
    "vchType": "Payment",
    "vchNo": "479",
    "remark": "BPCL",
    "wing": "A",
    "debit": 0.0,
    "credit": 9508.0,
    "page": 1
  },
  {
    "id": 9,
    "date": "01-11-2021",
    "crdr": "Dr",
    "particulars": "BPCL-E CMS (Fleet Business)",
    "vchType": "Payment",
    "vchNo": "479",
    "remark": "BPCL",
    "wing": "B",
    "debit": 0.0,
    "credit": 10492.0,
    "page": 1
  },
  {
    "id": 10,
    "date": "23-11-2021",
    "crdr": "Dr",
    "particulars": "BPCL-E CMS (Fleet Business)",
    "vchType": "Payment",
    "vchNo": "497",
    "remark": "Refund to EADP II 70 % of total",
    "wing": "A",
    "debit": 0.0,
    "credit": 34943.0,
    "page": 1
  },
  {
    "id": 11,
    "date": "23-11-2021",
    "crdr": "Dr",
    "particulars": "BPCL-E CMS (Fleet Business)",
    "vchType": "Payment",
    "vchNo": "497",
    "remark": "Refund to EADP II 70 % of total",
    "wing": "B",
    "debit": 0.0,
    "credit": 38557.0,
    "page": 1
  },
  {
    "id": 12,
    "date": "23-09-2021",
    "crdr": "Dr",
    "particulars": "Cash",
    "vchType": "Contra",
    "vchNo": "39",
    "remark": "ELECTRICTY",
    "wing": "A",
    "debit": 0.0,
    "credit": 21032.0,
    "page": 1
  },
  {
    "id": 13,
    "date": "23-09-2021",
    "crdr": "Dr",
    "particulars": "Cash",
    "vchType": "Contra",
    "vchNo": "39",
    "remark": "ELECTRICTY",
    "wing": "B",
    "debit": 0.0,
    "credit": 32632.0,
    "page": 1
  },
  {
    "id": 14,
    "date": "01-11-2021",
    "crdr": "Dr",
    "particulars": "Cash",
    "vchType": "Contra",
    "vchNo": "42",
    "remark": "WATERMAN",
    "wing": "A",
    "debit": 0.0,
    "credit": 4974.0,
    "page": 1
  },
  {
    "id": 15,
    "date": "01-11-2021",
    "crdr": "Dr",
    "particulars": "Cash",
    "vchType": "Contra",
    "vchNo": "42",
    "remark": "WATERMAN",
    "wing": "B",
    "debit": 0.0,
    "credit": 5026.0,
    "page": 1
  },
  {
    "id": 16,
    "date": "29-11-2021",
    "crdr": "Dr",
    "particulars": "Cash",
    "vchType": "Contra",
    "vchNo": "45",
    "remark": "WATERMAN",
    "wing": "A",
    "debit": 0.0,
    "credit": 21139.0,
    "page": 1
  },
  {
    "id": 17,
    "date": "29-11-2021",
    "crdr": "Dr",
    "particulars": "Cash",
    "vchType": "Contra",
    "vchNo": "45",
    "remark": "WATERMAN",
    "wing": "B",
    "debit": 0.0,
    "credit": 21361.0,
    "page": 1
  },
  {
    "id": 18,
    "date": "14-10-2021",
    "crdr": "Dr",
    "particulars": "Clean Up Services",
    "vchType": "Payment",
    "vchNo": "440",
    "remark": "Houskeeping",
    "wing": "B",
    "debit": 0.0,
    "credit": 2970.0,
    "page": 1
  },
  {
    "id": 19,
    "date": "14-10-2021",
    "crdr": "Dr",
    "particulars": "Clean Up Services",
    "vchType": "Payment",
    "vchNo": "440",
    "remark": "Houskeeping",
    "wing": "A",
    "debit": 0.0,
    "credit": 1485.0,
    "page": 1
  },
  {
    "id": 20,
    "date": "03-08-2021",
    "crdr": "Dr",
    "particulars": "GURUKRUPA POOLS MAINTANACES & SERVICES",
    "vchType": "Payment",
    "vchNo": "312",
    "remark": "Swimming pool",
    "wing": "B",
    "debit": 0.0,
    "credit": 5940.0,
    "page": 1
  },
  {
    "id": 21,
    "date": "12-08-2021",
    "crdr": "Dr",
    "particulars": "GURUKRUPA POOLS MAINTANACES & SERVICES",
    "vchType": "Payment",
    "vchNo": "334",
    "remark": "Swimming pool",
    "wing": "B",
    "debit": 0.0,
    "credit": 7920.0,
    "page": 1
  },
  {
    "id": 22,
    "date": "14-10-2021",
    "crdr": "Dr",
    "particulars": "GURUKRUPA POOLS MAINTANACES & SERVICES",
    "vchType": "Payment",
    "vchNo": "441",
    "remark": "Swimming pool",
    "wing": "B",
    "debit": 0.0,
    "credit": 14520.0,
    "page": 1
  },
  {
    "id": 23,
    "date": "30-10-2021",
    "crdr": "Dr",
    "particulars": "GURUKRUPA POOLS MAINTANACES & SERVICES",
    "vchType": "Payment",
    "vchNo": "470",
    "remark": "Swimming pool",
    "wing": "B",
    "debit": 0.0,
    "credit": 7831.0,
    "page": 1
  },
  {
    "id": 24,
    "date": "16-11-2021",
    "crdr": "Dr",
    "particulars": "GURUKRUPA POOLS MAINTANACES & SERVICES",
    "vchType": "Payment",
    "vchNo": "489",
    "remark": "Swimming pool",
    "wing": "B",
    "debit": 0.0,
    "credit": 7920.0,
    "page": 1
  },
  {
    "id": 25,
    "date": "20-10-2021",
    "crdr": "Dr",
    "particulars": "Main.Electricity Expenses-Club House",
    "vchType": "Payment",
    "vchNo": "446",
    "remark": "Electricity",
    "wing": "A",
    "debit": 0.0,
    "credit": 2558.0,
    "page": 1
  },
  {
    "id": 26,
    "date": "20-10-2021",
    "crdr": "Dr",
    "particulars": "Main.Electricity Expenses-Club House",
    "vchType": "Payment",
    "vchNo": "446",
    "remark": "Electricity",
    "wing": "B",
    "debit": 0.0,
    "credit": 2822.0,
    "page": 1
  },
  {
    "id": 27,
    "date": "20-10-2021",
    "crdr": "Dr",
    "particulars": "Main.Electricity Expenses-STP & FIRE Pump",
    "vchType": "Payment",
    "vchNo": "445",
    "remark": "Electricity",
    "wing": "A",
    "debit": 0.0,
    "credit": 48088.0,
    "page": 1
  },
  {
    "id": 28,
    "date": "20-10-2021",
    "crdr": "Dr",
    "particulars": "Main.Electricity Expenses-STP & FIRE Pump",
    "vchType": "Payment",
    "vchNo": "445",
    "remark": "Electricity",
    "wing": "B",
    "debit": 0.0,
    "credit": 53062.0,
    "page": 1
  },
  {
    "id": 29,
    "date": "20-10-2021",
    "crdr": "Dr",
    "particulars": "Main.Electricity Expenses-A-Bldg",
    "vchType": "Payment",
    "vchNo": "445",
    "remark": "Electricity",
    "wing": "A",
    "debit": 0.0,
    "credit": 41290.0,
    "page": 1
  },
  {
    "id": 30,
    "date": "20-10-2021",
    "crdr": "Dr",
    "particulars": "Main.Electricity Expenses-B-Bldg",
    "vchType": "Payment",
    "vchNo": "445",
    "remark": "Electricity",
    "wing": "B",
    "debit": 0.0,
    "credit": 69210.0,
    "page": 1
  },
  {
    "id": 31,
    "date": "06-07-2021",
    "crdr": "Dr",
    "particulars": "Majestique Consultancy Services GST AND TDS AC",
    "vchType": "Payment",
    "vchNo": "246",
    "remark": "TDS",
    "wing": "A",
    "debit": 0.0,
    "credit": 2337.0,
    "page": 1
  },
  {
    "id": 32,
    "date": "06-07-2021",
    "crdr": "Dr",
    "particulars": "Majestique Consultancy Services GST AND TDS AC",
    "vchType": "Payment",
    "vchNo": "246",
    "remark": "TDS",
    "wing": "B",
    "debit": 0.0,
    "credit": 2579.0,
    "page": 2
  },
  {
    "id": 33,
    "date": "31-07-2021",
    "crdr": "Dr",
    "particulars": "Majestique Consultancy Services GST AND TDS AC",
    "vchType": "Payment",
    "vchNo": "289",
    "remark": "TDS",
    "wing": "A",
    "debit": 0.0,
    "credit": 1073.0,
    "page": 2
  },
  {
    "id": 34,
    "date": "31-07-2021",
    "crdr": "Dr",
    "particulars": "Majestique Consultancy Services GST AND TDS AC",
    "vchType": "Payment",
    "vchNo": "289",
    "remark": "TDS",
    "wing": "B",
    "debit": 0.0,
    "credit": 1183.0,
    "page": 2
  },
  {
    "id": 35,
    "date": "03-08-2021",
    "crdr": "Dr",
    "particulars": "ELE Majestique Consultancy Services GST AND TDS AC",
    "vchType": "Payment",
    "vchNo": "300",
    "remark": "Electricty",
    "wing": "A",
    "debit": 0.0,
    "credit": 50920.0,
    "page": 2
  },
  {
    "id": 36,
    "date": "03-08-2021",
    "crdr": "Dr",
    "particulars": "ELE Majestique Consultancy Services GST AND TDS AC",
    "vchType": "Payment",
    "vchNo": "300",
    "remark": "Electricty",
    "wing": "B",
    "debit": 0.0,
    "credit": 113610.0,
    "page": 2
  },
  {
    "id": 37,
    "date": "06-09-2021",
    "crdr": "Dr",
    "particulars": "Majestique Consultancy Services GST AND TDS AC",
    "vchType": "Payment",
    "vchNo": "369",
    "remark": "TDS",
    "wing": "A",
    "debit": 0.0,
    "credit": 1576.0,
    "page": 2
  },
  {
    "id": 38,
    "date": "06-09-2021",
    "crdr": "Dr",
    "particulars": "Majestique Consultancy Services GST AND TDS AC",
    "vchType": "Payment",
    "vchNo": "369",
    "remark": "TDS",
    "wing": "B",
    "debit": 0.0,
    "credit": 1740.0,
    "page": 2
  },
  {
    "id": 39,
    "date": "06-10-2021",
    "crdr": "Dr",
    "particulars": "Majestique Consultancy Services GST AND TDS AC",
    "vchType": "Payment",
    "vchNo": "430",
    "remark": "TDS",
    "wing": "A",
    "debit": 0.0,
    "credit": 2758.0,
    "page": 2
  },
  {
    "id": 40,
    "date": "06-10-2021",
    "crdr": "Dr",
    "particulars": "Majestique Consultancy Services GST AND TDS AC",
    "vchType": "Payment",
    "vchNo": "430",
    "remark": "TDS",
    "wing": "B",
    "debit": 0.0,
    "credit": 3044.0,
    "page": 2
  },
  {
    "id": 41,
    "date": "30-10-2021",
    "crdr": "Dr",
    "particulars": "Majestique Consultancy Services GST AND TDS AC",
    "vchType": "Payment",
    "vchNo": "476",
    "remark": "TDS",
    "wing": "A",
    "debit": 0.0,
    "credit": 797.0,
    "page": 2
  },
  {
    "id": 42,
    "date": "30-10-2021",
    "crdr": "Dr",
    "particulars": "Majestique Consultancy Services GST AND TDS AC",
    "vchType": "Payment",
    "vchNo": "476",
    "remark": "TDS",
    "wing": "B",
    "debit": 0.0,
    "credit": 879.0,
    "page": 2
  },
  {
    "id": 43,
    "date": "03-08-2021",
    "crdr": "Dr",
    "particulars": "Marshal Force Security Services",
    "vchType": "Payment",
    "vchNo": "315",
    "remark": "Security",
    "wing": "A",
    "debit": 0.0,
    "credit": 37620.0,
    "page": 2
  },
  {
    "id": 44,
    "date": "03-08-2021",
    "crdr": "Dr",
    "particulars": "Marshal Force Security Services",
    "vchType": "Payment",
    "vchNo": "315",
    "remark": "Security",
    "wing": "B",
    "debit": 0.0,
    "credit": 37620.0,
    "page": 2
  },
  {
    "id": 45,
    "date": "12-08-2021",
    "crdr": "Dr",
    "particulars": "Marshal Force Security Services",
    "vchType": "Payment",
    "vchNo": "336",
    "remark": "Security",
    "wing": "A",
    "debit": 0.0,
    "credit": 37620.0,
    "page": 2
  },
  {
    "id": 46,
    "date": "12-08-2021",
    "crdr": "Dr",
    "particulars": "Marshal Force Security Services",
    "vchType": "Payment",
    "vchNo": "336",
    "remark": "Security",
    "wing": "B",
    "debit": 0.0,
    "credit": 37620.0,
    "page": 2
  },
  {
    "id": 47,
    "date": "16-09-2021",
    "crdr": "Dr",
    "particulars": "Marshal Force Security Services",
    "vchType": "Payment",
    "vchNo": "380",
    "remark": "Security",
    "wing": "A",
    "debit": 0.0,
    "credit": 37620.0,
    "page": 2
  },
  {
    "id": 48,
    "date": "16-09-2021",
    "crdr": "Dr",
    "particulars": "Marshal Force Security Services",
    "vchType": "Payment",
    "vchNo": "380",
    "remark": "Security",
    "wing": "B",
    "debit": 0.0,
    "credit": 37620.0,
    "page": 2
  },
  {
    "id": 49,
    "date": "14-10-2021",
    "crdr": "Dr",
    "particulars": "Marshal Force Security Services",
    "vchType": "Payment",
    "vchNo": "442",
    "remark": "Security",
    "wing": "A",
    "debit": 0.0,
    "credit": 37620.0,
    "page": 2
  },
  {
    "id": 50,
    "date": "14-10-2021",
    "crdr": "Dr",
    "particulars": "Marshal Force Security Services",
    "vchType": "Payment",
    "vchNo": "442",
    "remark": "Security",
    "wing": "B",
    "debit": 0.0,
    "credit": 37620.0,
    "page": 2
  },
  {
    "id": 51,
    "date": "16-11-2021",
    "crdr": "Dr",
    "particulars": "Marshal Force Security Services",
    "vchType": "Payment",
    "vchNo": "490",
    "remark": "Security",
    "wing": "A",
    "debit": 0.0,
    "credit": 37620.0,
    "page": 2
  },
  {
    "id": 52,
    "date": "16-11-2021",
    "crdr": "Dr",
    "particulars": "Marshal Force Security Services",
    "vchType": "Payment",
    "vchNo": "490",
    "remark": "Security",
    "wing": "B",
    "debit": 0.0,
    "credit": 37620.0,
    "page": 2
  },
  {
    "id": 53,
    "date": "23-09-2021",
    "crdr": "Dr",
    "particulars": "Nausad Ali",
    "vchType": "Payment",
    "vchNo": "399",
    "remark": "Gardening",
    "wing": "B",
    "debit": 0.0,
    "credit": 14850.0,
    "page": 2
  },
  {
    "id": 54,
    "date": "16-11-2021",
    "crdr": "Dr",
    "particulars": "Nausad Ali",
    "vchType": "Payment",
    "vchNo": "488",
    "remark": "Gardening",
    "wing": "B",
    "debit": 0.0,
    "credit": 14850.0,
    "page": 2
  },
  {
    "id": 55,
    "date": "20-10-2021",
    "crdr": "Dr",
    "particulars": "Property Tax_Club House",
    "vchType": "Payment",
    "vchNo": "444",
    "remark": "Property Tax_Club House",
    "wing": "A",
    "debit": 0.0,
    "credit": 12814.0,
    "page": 2
  },
  {
    "id": 56,
    "date": "20-10-2021",
    "crdr": "Dr",
    "particulars": "Property Tax_Club House",
    "vchType": "Payment",
    "vchNo": "444",
    "remark": "Property Tax_Club House",
    "wing": "B",
    "debit": 0.0,
    "credit": 14139.0,
    "page": 2
  },
  {
    "id": 57,
    "date": "20-09-2021",
    "crdr": "Dr",
    "particulars": "Rohit Dhage & Associates",
    "vchType": "Payment",
    "vchNo": "391",
    "remark": "Audit Fees",
    "wing": "A",
    "debit": 0.0,
    "credit": 17100.0,
    "page": 2
  },
  {
    "id": 58,
    "date": "20-09-2021",
    "crdr": "Dr",
    "particulars": "Rohit Dhage & Associates",
    "vchType": "Payment",
    "vchNo": "391",
    "remark": "Audit Fees",
    "wing": "B",
    "debit": 0.0,
    "credit": 17280.0,
    "page": 2
  },
  {
    "id": 59,
    "date": "12-08-2021",
    "crdr": "Dr",
    "particulars": "Shri Swami Samarth Water Suppliers",
    "vchType": "Payment",
    "vchNo": "332",
    "remark": "Water Tanker",
    "wing": "B",
    "debit": 0.0,
    "credit": 22176.0,
    "page": 2
  },
  {
    "id": 60,
    "date": "12-08-2021",
    "crdr": "Dr",
    "particulars": "Shri Swami Samarth Water Suppliers",
    "vchType": "Payment",
    "vchNo": "333",
    "remark": "Water Tanker",
    "wing": "A",
    "debit": 0.0,
    "credit": 9108.0,
    "page": 2
  },
  {
    "id": 61,
    "date": "23-09-2021",
    "crdr": "Dr",
    "particulars": "Sunil Kamble",
    "vchType": "Payment",
    "vchNo": "398",
    "remark": "plumbing",
    "wing": "A",
    "debit": 0.0,
    "credit": 17820.0,
    "page": 2
  },
  {
    "id": 62,
    "date": "23-09-2021",
    "crdr": "Dr",
    "particulars": "Sunil Kamble",
    "vchType": "Payment",
    "vchNo": "398",
    "remark": "plumbing",
    "wing": "B",
    "debit": 0.0,
    "credit": 17820.0,
    "page": 2
  },
  {
    "id": 63,
    "date": "03-08-2021",
    "crdr": "Dr",
    "particulars": "Swach Plus Seva Sahakari Sanstha Maryadit",
    "vchType": "Payment",
    "vchNo": "314",
    "remark": "Houskeeping",
    "wing": "B",
    "debit": 0.0,
    "credit": 5831.0,
    "page": 2
  },
  {
    "id": 64,
    "date": "03-08-2021",
    "crdr": "Dr",
    "particulars": "Swach Plus Seva Sahakari Sanstha Maryadit",
    "vchType": "Payment",
    "vchNo": "314",
    "remark": "Houskeeping",
    "wing": "A",
    "debit": 0.0,
    "credit": 5962.0,
    "page": 2
  },
  {
    "id": 65,
    "date": "12-08-2021",
    "crdr": "Dr",
    "particulars": "Swach Plus Seva Sahakari Sanstha Maryadit",
    "vchType": "Payment",
    "vchNo": "335",
    "remark": "Houskeeping",
    "wing": "B",
    "debit": 0.0,
    "credit": 5831.0,
    "page": 2
  },
  {
    "id": 66,
    "date": "12-08-2021",
    "crdr": "Dr",
    "particulars": "Swach Plus Seva Sahakari Sanstha Maryadit",
    "vchType": "Payment",
    "vchNo": "335",
    "remark": "Houskeeping",
    "wing": "A",
    "debit": 0.0,
    "credit": 5962.0,
    "page": 2
  },
  {
    "id": 67,
    "date": "16-09-2021",
    "crdr": "Dr",
    "particulars": "Swach Plus Seva Sahakari Sanstha Maryadit",
    "vchType": "Payment",
    "vchNo": "382",
    "remark": "Houskeeping",
    "wing": "B",
    "debit": 0.0,
    "credit": 5831.0,
    "page": 2
  },
  {
    "id": 68,
    "date": "16-09-2021",
    "crdr": "Dr",
    "particulars": "Swach Plus Seva Sahakari Sanstha Maryadit",
    "vchType": "Payment",
    "vchNo": "382",
    "remark": "Houskeeping",
    "wing": "A",
    "debit": 0.0,
    "credit": 5962.0,
    "page": 2
  },
  {
    "id": 69,
    "date": "14-10-2021",
    "crdr": "Dr",
    "particulars": "Swach Plus Seva Sahakari Sanstha Maryadit",
    "vchType": "Payment",
    "vchNo": "443",
    "remark": "Houskeeping",
    "wing": "B",
    "debit": 0.0,
    "credit": 5831.0,
    "page": 3
  },
  {
    "id": 70,
    "date": "14-10-2021",
    "crdr": "Dr",
    "particulars": "Swach Plus Seva Sahakari Sanstha Maryadit",
    "vchType": "Payment",
    "vchNo": "443",
    "remark": "Houskeeping",
    "wing": "A",
    "debit": 0.0,
    "credit": 5962.0,
    "page": 3
  },
  {
    "id": 71,
    "date": "16-11-2021",
    "crdr": "Dr",
    "particulars": "Swach Plus Seva Sahakari Sanstha Maryadit",
    "vchType": "Payment",
    "vchNo": "492",
    "remark": "Houskeeping",
    "wing": "B",
    "debit": 0.0,
    "credit": 5831.0,
    "page": 3
  },
  {
    "id": 72,
    "date": "16-11-2021",
    "crdr": "Dr",
    "particulars": "Swach Plus Seva Sahakari Sanstha Maryadit",
    "vchType": "Payment",
    "vchNo": "492",
    "remark": "Houskeeping",
    "wing": "A",
    "debit": 0.0,
    "credit": 5962.0,
    "page": 3
  },
  {
    "id": 73,
    "date": "16-09-2021",
    "crdr": "Dr",
    "particulars": "Tank Clean Pune",
    "vchType": "Payment",
    "vchNo": "379",
    "remark": "OHWT Cleaning",
    "wing": "A",
    "debit": 0.0,
    "credit": 5031.0,
    "page": 3
  },
  {
    "id": 74,
    "date": "16-09-2021",
    "crdr": "Dr",
    "particulars": "Tank Clean Pune",
    "vchType": "Payment",
    "vchNo": "379",
    "remark": "OHWT Cleaning",
    "wing": "B",
    "debit": 0.0,
    "credit": 5440.0,
    "page": 3
  },
  {
    "id": 75,
    "date": "24-09-2021",
    "crdr": "Dr",
    "particulars": "TDS on Cash Withdrawn-194N",
    "vchType": "Payment",
    "vchNo": "407",
    "remark": "194N",
    "wing": "A",
    "debit": 0.0,
    "credit": 511.0,
    "page": 3
  },
  {
    "id": 76,
    "date": "24-09-2021",
    "crdr": "Dr",
    "particulars": "TDS on Cash Withdrawn-194N",
    "vchType": "Payment",
    "vchNo": "407",
    "remark": "194N",
    "wing": "B",
    "debit": 0.0,
    "credit": 563.0,
    "page": 3
  },
  {
    "id": 77,
    "date": "08-11-2021",
    "crdr": "Dr",
    "particulars": "TDS on Cash Withdrawn-194N",
    "vchType": "Payment",
    "vchNo": "481",
    "remark": "194N",
    "wing": "A",
    "debit": 0.0,
    "credit": 95.0,
    "page": 3
  },
  {
    "id": 78,
    "date": "08-11-2021",
    "crdr": "Dr",
    "particulars": "TDS on Cash Withdrawn-194N",
    "vchType": "Payment",
    "vchNo": "481",
    "remark": "194N",
    "wing": "B",
    "debit": 0.0,
    "credit": 105.0,
    "page": 3
  },
  {
    "id": 79,
    "date": "03-08-2021",
    "crdr": "Dr",
    "particulars": "Vandana Enterprises",
    "vchType": "Payment",
    "vchNo": "313",
    "remark": "Houskeeping",
    "wing": "A",
    "debit": 0.0,
    "credit": 20542.0,
    "page": 3
  },
  {
    "id": 80,
    "date": "03-08-2021",
    "crdr": "Dr",
    "particulars": "Vandana Enterprises",
    "vchType": "Payment",
    "vchNo": "313",
    "remark": "Houskeeping",
    "wing": "B",
    "debit": 0.0,
    "credit": 20790.0,
    "page": 3
  },
  {
    "id": 81,
    "date": "12-08-2021",
    "crdr": "Dr",
    "particulars": "Vandana Enterprises",
    "vchType": "Payment",
    "vchNo": "337",
    "remark": "Houskeeping",
    "wing": "A",
    "debit": 0.0,
    "credit": 22041.0,
    "page": 3
  },
  {
    "id": 82,
    "date": "12-08-2021",
    "crdr": "Dr",
    "particulars": "Vandana Enterprises",
    "vchType": "Payment",
    "vchNo": "337",
    "remark": "Houskeeping",
    "wing": "B",
    "debit": 0.0,
    "credit": 22281.0,
    "page": 3
  },
  {
    "id": 83,
    "date": "16-09-2021",
    "crdr": "Dr",
    "particulars": "Vandana Enterprises",
    "vchType": "Payment",
    "vchNo": "381",
    "remark": "Houskeeping",
    "wing": "A",
    "debit": 0.0,
    "credit": 20843.0,
    "page": 3
  },
  {
    "id": 84,
    "date": "16-09-2021",
    "crdr": "Dr",
    "particulars": "Vandana Enterprises",
    "vchType": "Payment",
    "vchNo": "381",
    "remark": "Houskeeping",
    "wing": "B",
    "debit": 0.0,
    "credit": 17250.0,
    "page": 3
  },
  {
    "id": 85,
    "date": "30-10-2021",
    "crdr": "Dr",
    "particulars": "Vandana Enterprises",
    "vchType": "Payment",
    "vchNo": "471",
    "remark": "Houskeeping",
    "wing": "A",
    "debit": 0.0,
    "credit": 19800.0,
    "page": 3
  },
  {
    "id": 86,
    "date": "30-10-2021",
    "crdr": "Dr",
    "particulars": "Vandana Enterprises",
    "vchType": "Payment",
    "vchNo": "471",
    "remark": "Houskeeping",
    "wing": "B",
    "debit": 0.0,
    "credit": 20542.0,
    "page": 3
  },
  {
    "id": 87,
    "date": "16-11-2021",
    "crdr": "Dr",
    "particulars": "Vandana Enterprises",
    "vchType": "Payment",
    "vchNo": "491",
    "remark": "Houskeeping",
    "wing": "A",
    "debit": 0.0,
    "credit": 22281.0,
    "page": 3
  },
  {
    "id": 88,
    "date": "16-11-2021",
    "crdr": "Dr",
    "particulars": "Vandana Enterprises",
    "vchType": "Payment",
    "vchNo": "491",
    "remark": "Houskeeping",
    "wing": "B",
    "debit": 0.0,
    "credit": 21802.0,
    "page": 3
  },
  {
    "id": 89,
    "date": "23-11-2021",
    "crdr": "Dr",
    "particulars": "BOM C/A No.60186732081 (30%)",
    "vchType": "Contra",
    "vchNo": "43",
    "remark": "Refund to EADP -2081",
    "wing": "Refund",
    "debit": 0.0,
    "credit": 100000.0,
    "page": 3
  },
  {
    "id": 90,
    "date": "23-11-2021",
    "crdr": "Dr",
    "particulars": "Main.Supervision Charges-A-Bldg",
    "vchType": "Payment",
    "vchNo": "498",
    "remark": "Supervision Charges",
    "wing": "A",
    "debit": 0.0,
    "credit": 270000.0,
    "page": 3
  },
  {
    "id": 91,
    "date": "23-11-2021",
    "crdr": "Dr",
    "particulars": "Main.Supervision Charges-B-Bldg",
    "vchType": "Payment",
    "vchNo": "499",
    "remark": "Supervision Charges",
    "wing": "B",
    "debit": 0.0,
    "credit": 350000.0,
    "page": 3
  },
  {
    "id": 92,
    "date": "24.11.2021",
    "crdr": "Dr",
    "particulars": "Main.Electricity Expenses-A-Bldg",
    "vchType": "Payment",
    "vchNo": "500",
    "remark": "ELECTRICTY",
    "wing": "A",
    "debit": 0.0,
    "credit": 22500.0,
    "page": 3
  },
  {
    "id": 93,
    "date": "24.11.2021",
    "crdr": "Dr",
    "particulars": "Main.Electricity Expenses-B-Bldg",
    "vchType": "Payment",
    "vchNo": "500",
    "remark": "ELECTRICTY",
    "wing": "B",
    "debit": 0.0,
    "credit": 49170.0,
    "page": 3
  },
  {
    "id": 94,
    "date": "24.11.2021",
    "crdr": "Dr",
    "particulars": "Main.Electricity Expenses-STP & FIRE Pump",
    "vchType": "Payment",
    "vchNo": "500",
    "remark": "ELECTRICTY",
    "wing": "A",
    "debit": 0.0,
    "credit": 16861.0,
    "page": 3
  },
  {
    "id": 95,
    "date": "24.11.2021",
    "crdr": "Dr",
    "particulars": "Main.Electricity Expenses-STP & FIRE Pump",
    "vchType": "Payment",
    "vchNo": "500",
    "remark": "ELECTRICTY",
    "wing": "B",
    "debit": 0.0,
    "credit": 18606.0,
    "page": 3
  },
  {
    "id": 96,
    "date": "24.11.2021",
    "crdr": "Cr",
    "particulars": "Main.Electricity Expenses-STP & FIRE Pump",
    "vchType": "Receipt",
    "vchNo": "357",
    "remark": "ELECTRICTY",
    "wing": "C",
    "debit": 0.0,
    "credit": 9303.0,
    "page": 3
  },
  {
    "id": 97,
    "date": "24.11.2021",
    "crdr": "Dr",
    "particulars": "Onkar Diesel Works (India) Private Limited",
    "vchType": "Payment",
    "vchNo": "503",
    "remark": "DG repairing",
    "wing": "C",
    "debit": 0.0,
    "credit": -9303.0,
    "page": 3
  },
  {
    "id": 98,
    "date": "24.11.2021",
    "crdr": "Dr",
    "particulars": "Onkar Diesel Works (India) Private Limited",
    "vchType": "Payment",
    "vchNo": "503",
    "remark": "DG repairing",
    "wing": "A",
    "debit": 0.0,
    "credit": 5507.0,
    "page": 3
  },
  {
    "id": 99,
    "date": "24.11.2021",
    "crdr": "Dr",
    "particulars": "Onkar Diesel Works (India) Private Limited",
    "vchType": "Payment",
    "vchNo": "503",
    "remark": "DG repairing",
    "wing": "B",
    "debit": 0.0,
    "credit": 6076.0,
    "page": 3
  },
  {
    "id": 100,
    "date": "24.11.2021",
    "crdr": "Dr",
    "particulars": "Onkar Diesel Works (India) Private Limited",
    "vchType": "Payment",
    "vchNo": "503",
    "remark": "DG repairing",
    "wing": "C",
    "debit": 0.0,
    "credit": 3038.0,
    "page": 3
  },
  {
    "id": 101,
    "date": "26.11.2021",
    "crdr": "Dr",
    "particulars": "Majestique Euriska A Building Sahakari Gruhrachna San",
    "vchType": "Payment",
    "vchNo": "512",
    "remark": "A Bldg Society",
    "wing": "A",
    "debit": 0.0,
    "credit": 2400000.0,
    "page": 3
  },
  {
    "id": 102,
    "date": "30-11-2021",
    "crdr": "Dr",
    "particulars": "TDS on Cash Withdrawn-194N",
    "vchType": "Payment",
    "vchNo": "532",
    "remark": "194N",
    "wing": "A",
    "debit": 0.0,
    "credit": 404.0,
    "page": 3
  },
  {
    "id": 103,
    "date": "30-11-2021",
    "crdr": "Dr",
    "particulars": "TDS on Cash Withdrawn-194N",
    "vchType": "Payment",
    "vchNo": "532",
    "remark": "194N",
    "wing": "B",
    "debit": 0.0,
    "credit": 446.0,
    "page": 3
  },
  {
    "id": 104,
    "date": "03-12-2021",
    "crdr": "Dr",
    "particulars": "Main.Electricity Expenses-Club House",
    "vchType": "Payment",
    "vchNo": "534",
    "remark": "ELECTRICTY",
    "wing": "B",
    "debit": 0.0,
    "credit": 4386.0,
    "page": 3
  },
  {
    "id": 105,
    "date": "03-12-2021",
    "crdr": "Dr",
    "particulars": "Main.Electricity Expenses-Club House",
    "vchType": "Payment",
    "vchNo": "534",
    "remark": "ELECTRICTY",
    "wing": "A",
    "debit": 0.0,
    "credit": 3974.0,
    "page": 3
  },
  {
    "id": 106,
    "date": "06-12-2021",
    "crdr": "Dr",
    "particulars": "Majestique Consultancy Services GST And TDS AC",
    "vchType": "Payment",
    "vchNo": "540",
    "remark": "TDS",
    "wing": "B",
    "debit": 0.0,
    "credit": 877.0,
    "page": 4
  },
  {
    "id": 107,
    "date": "06-12-2021",
    "crdr": "Dr",
    "particulars": "Majestique Consultancy Services GST And TDS AC",
    "vchType": "Payment",
    "vchNo": "540",
    "remark": "TDS",
    "wing": "A",
    "debit": 0.0,
    "credit": 795.0,
    "page": 4
  },
  {
    "id": 108,
    "date": "10-12-2021",
    "crdr": "Dr",
    "particulars": "Sunil Kamble",
    "vchType": "Payment",
    "vchNo": "543",
    "remark": "plumbing",
    "wing": "B",
    "debit": 0.0,
    "credit": 11880.0,
    "page": 4
  },
  {
    "id": 109,
    "date": "10-12-2021",
    "crdr": "Dr",
    "particulars": "Marshal Force Security Services",
    "vchType": "Payment",
    "vchNo": "544",
    "remark": "Security",
    "wing": "B",
    "debit": 0.0,
    "credit": 37620.0,
    "page": 4
  },
  {
    "id": 110,
    "date": "10-12-2021",
    "crdr": "Dr",
    "particulars": "Vandana Enterprises",
    "vchType": "Payment",
    "vchNo": "545",
    "remark": "Houskeeping",
    "wing": "B",
    "debit": 0.0,
    "credit": 21285.0,
    "page": 4
  },
  {
    "id": 111,
    "date": "10-12-2021",
    "crdr": "Dr",
    "particulars": "SWACH Plus Seva Sahakari Sanstha Maryadit",
    "vchType": "Payment",
    "vchNo": "548",
    "remark": "Houskeeping",
    "wing": "B",
    "debit": 0.0,
    "credit": 5831.0,
    "page": 4
  },
  {
    "id": 112,
    "date": "24-12-2021",
    "crdr": "Dr",
    "particulars": "Clean Up Services",
    "vchType": "Payment",
    "vchNo": "567",
    "remark": "Houskeeping",
    "wing": "B",
    "debit": 0.0,
    "credit": 2475.0,
    "page": 4
  },
  {
    "id": 113,
    "date": "06-01-2022",
    "crdr": "Dr",
    "particulars": "Majestique Consultancy Services GST And TDS AC",
    "vchType": "Payment",
    "vchNo": "573",
    "remark": "TDS",
    "wing": "A",
    "debit": 0.0,
    "credit": 407.0,
    "page": 4
  },
  {
    "id": 114,
    "date": "06-01-2022",
    "crdr": "Dr",
    "particulars": "Majestique Consultancy Services GST And TDS AC",
    "vchType": "Payment",
    "vchNo": "573",
    "remark": "TDS",
    "wing": "B",
    "debit": 0.0,
    "credit": 450.0,
    "page": 4
  },
  {
    "id": 115,
    "date": "08-01-2022",
    "crdr": "Dr",
    "particulars": "Main.Electricity Expenses-B-Bldg",
    "vchType": "Payment",
    "vchNo": "574",
    "remark": "ELECTRICTY",
    "wing": "B",
    "debit": 0.0,
    "credit": 38830.0,
    "page": 4
  },
  {
    "id": 116,
    "date": "08-01-2022",
    "crdr": "Dr",
    "particulars": "Majestique Euriska A Building Sahakari Gruhrachna San",
    "vchType": "Payment",
    "vchNo": "575",
    "remark": "ELECTRICTY",
    "wing": "B",
    "debit": 0.0,
    "credit": 17895.0,
    "page": 4
  },
  {
    "id": 117,
    "date": "08-01-2022",
    "crdr": "Dr",
    "particulars": "Majestique Euriska A Building Sahakari Gruhrachna San",
    "vchType": "Payment",
    "vchNo": "577",
    "remark": "ELECTRICTY",
    "wing": "B",
    "debit": 0.0,
    "credit": 1700.0,
    "page": 4
  },
  {
    "id": 118,
    "date": "08-01-2022",
    "crdr": "Dr",
    "particulars": "Bank Charges",
    "vchType": "Payment",
    "vchNo": "582",
    "remark": "Bank Charges",
    "wing": "A",
    "debit": 0.0,
    "credit": 29.5,
    "page": 4
  },
  {
    "id": 119,
    "date": "12-01-2022",
    "crdr": "Dr",
    "particulars": "Shree Engineering",
    "vchType": "Payment",
    "vchNo": "591",
    "remark": "Repairs & Maintenance",
    "wing": "B",
    "debit": 0.0,
    "credit": 5571.0,
    "page": 4
  },
  {
    "id": 120,
    "date": "26-02-2022",
    "crdr": "Dr",
    "particulars": "Cash",
    "vchType": "Contra",
    "vchNo": "54",
    "remark": "ELECTRICTY",
    "wing": "B",
    "debit": 0.0,
    "credit": 17500.0,
    "page": 4
  },
  {
    "id": 121,
    "date": "01-03-2022",
    "crdr": "Dr",
    "particulars": "GURUKRUPA POOLS MAINTANACES & SERVICES",
    "vchType": "Payment",
    "vchNo": "635",
    "remark": "Swimming pool",
    "wing": "B",
    "debit": 0.0,
    "credit": 6584.0,
    "page": 4
  },
  {
    "id": 122,
    "date": "01-03-2022",
    "crdr": "Dr",
    "particulars": "Clean Up Services",
    "vchType": "Payment",
    "vchNo": "636",
    "remark": "Houskeeping",
    "wing": "B",
    "debit": 0.0,
    "credit": 720.0,
    "page": 4
  },
  {
    "id": 123,
    "date": "01-03-2022",
    "crdr": "Dr",
    "particulars": "Marshal Force Security Services",
    "vchType": "Payment",
    "vchNo": "637",
    "remark": "Security",
    "wing": "B",
    "debit": 0.0,
    "credit": 32766.0,
    "page": 4
  },
  {
    "id": 124,
    "date": "01-03-2022",
    "crdr": "Dr",
    "particulars": "Vandana Enterprises",
    "vchType": "Payment",
    "vchNo": "638",
    "remark": "Houskeeping",
    "wing": "B",
    "debit": 0.0,
    "credit": 21473.0,
    "page": 4
  },
  {
    "id": 125,
    "date": "01-03-2022",
    "crdr": "Dr",
    "particulars": "Nausad Ali",
    "vchType": "Payment",
    "vchNo": "639",
    "remark": "Gardening",
    "wing": "B",
    "debit": 0.0,
    "credit": 6172.0,
    "page": 4
  },
  {
    "id": 126,
    "date": "01-03-2022",
    "crdr": "Dr",
    "particulars": "SWACH Plus Seva Sahakari Sanstha Maryadit",
    "vchType": "Payment",
    "vchNo": "642",
    "remark": "Houskeeping",
    "wing": "B",
    "debit": 0.0,
    "credit": 5831.0,
    "page": 4
  },
  {
    "id": 127,
    "date": "04-03-2022",
    "crdr": "Dr",
    "particulars": "TDS on Cash Withdrawn-194N",
    "vchType": "Payment",
    "vchNo": "648",
    "remark": "194N",
    "wing": "B",
    "debit": 0.0,
    "credit": 184.0,
    "page": 4
  },
  {
    "id": 128,
    "date": "04-03-2022",
    "crdr": "Dr",
    "particulars": "TDS on Cash Withdrawn-194N",
    "vchType": "Payment",
    "vchNo": "648",
    "remark": "194N",
    "wing": "A",
    "debit": 0.0,
    "credit": 166.0,
    "page": 4
  },
  {
    "id": 129,
    "date": "31-03-2022",
    "crdr": "Dr",
    "particulars": "Shri Swami Samarth Water Suppliers",
    "vchType": "Payment",
    "vchNo": "667",
    "remark": "Water Tanker",
    "wing": "B",
    "debit": 0.0,
    "credit": 14652.0,
    "page": 4
  },
  {
    "id": 130,
    "date": "09-04-2022",
    "crdr": "Dr",
    "particulars": "Bank Charges",
    "vchType": "Payment",
    "vchNo": "5",
    "remark": "Bank Charges",
    "wing": "B",
    "debit": 0.0,
    "credit": 29.5,
    "page": 4
  },
  {
    "id": 131,
    "date": "28-04-2022",
    "crdr": "Dr",
    "particulars": "Majestique Consultancy Services GST And TDS AC",
    "vchType": "Payment",
    "vchNo": "12",
    "remark": "TDS",
    "wing": "B",
    "debit": 0.0,
    "credit": 498.0,
    "page": 4
  },
  {
    "id": 132,
    "date": "28-04-2022",
    "crdr": "Dr",
    "particulars": "Majestique Consultancy Services GST And TDS AC",
    "vchType": "Payment",
    "vchNo": "12",
    "remark": "TDS",
    "wing": "A",
    "debit": 0.0,
    "credit": 451.0,
    "page": 4
  },
  {
    "id": 133,
    "date": "16-07-2022",
    "crdr": "Dr",
    "particulars": "Bank Charges",
    "vchType": "Payment",
    "vchNo": "60",
    "remark": "Bank Charges",
    "wing": "B",
    "debit": 0.0,
    "credit": 29.5,
    "page": 4
  },
  {
    "id": 134,
    "date": "16-10-2022",
    "crdr": "Dr",
    "particulars": "Bank Charges",
    "vchType": "Payment",
    "vchNo": "88",
    "remark": "Bank Charges",
    "wing": "B",
    "debit": 0.0,
    "credit": 29.5,
    "page": 4
  },
  {
    "id": 135,
    "date": "07-01-2023",
    "crdr": "Dr",
    "particulars": "Bank Charges",
    "vchType": "Payment",
    "vchNo": "112",
    "remark": "Bank Charges",
    "wing": "B",
    "debit": 0.0,
    "credit": 29.5,
    "page": 4
  }
]
};

// ─── CA Hardik S. Mehta — Building A Recoverable from Builder Audit Report ─────
export { CA_HARDIK_MEHTA_REPORT } from './caHardikMehtaReport.js';

// ─── Forensic Cross-Audit: BOM Passbook Ledger vs CA Hardik Mehta Missing Bills ─
export {
  BOM_FORENSIC_SUMMARY,
  VENDOR_FORENSIC_MATRIX,
  MISSING_BILLS_RECONCILIATION_LIST,
  ENRICHED_BOM_TRANSACTIONS,
  BOM_MONTHLY_DRAIN_TIMELINE
} from './bomMissingBillsAnalyticsData.js';
