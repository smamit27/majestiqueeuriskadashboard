// ─── CA Hardik S. Mehta — Building A Recoverable from Builder Audit Report ─────
// Final Report Dtd. 22 February 2026
// Independent Report on the manner of utilization of funds and balance amount receivable from Builder

export const CA_HARDIK_MEHTA_REPORT = {
  meta: {
    reportTitle: "REPORT ON THE AMOUNT RECOVERABLE BY MAJESTIQUE EURISKA BUILDING A FROM THE BUILDER",
    reportDate: "22 February 2026",
    status: "FINAL REPORT",
    period: "Oct'2019 to Sep'2021",
    addressee: "The Members of Majestique Euriska – Building A, Pune",
    opinion: "Based on our examination as above, and the information and explanations given to us, in our opinion, the tentative amount receivable by Building A from the Builder amounts to Rs. 12,07,058 which is subject to the assumptions mentioned and pending clarification of points covered under Annexure II.",
    auditor: {
      name: "CA Hardik S. Mehta",
      designation: "Chartered Accountant",
      membershipNo: "162502",
      udin: "26162502TFCJWK8860",
      officeAddress: "203, Amanora Victory Towers, Hadapsar, Pune – 411036",
      email: "hsmehta90@gmail.com",
      mobile: "+91 777 699 6092",
      place: "Pune"
    },
    keyFigures: {
      totalMaintenance: 6350867,
      residentialMaintenance: 6068280,
      commercialMaintenance: 282587,
      invoicedExpenses: 2640866,
      estimatedMissingExpenses: 409211,
      totalExpensesByBuilder: 3050077,
      amountAlreadyReceived: 2400000,
      netPrincipal: 900790,
      interestRate: "8%",
      interestPeriod: "Oct 2021 to Dec 2025 (51 Months)",
      interestAmount: 306268,
      amountReceivable: 1207058,
      tentativeTextNote: 1199518
    }
  },

  // 1. Key Dates (Annexure 1 - Section 1)
  keyDates: [
    {
      id: 'kd-1',
      event: "Allocation of common expenses to Building B",
      fromDate: "01-Oct-19",
      description: "Inception date for sharing common society expenses between Building A and Building B."
    },
    {
      id: 'kd-2',
      event: "Self expenses managed by committee of Building A",
      fromDate: "01-Oct-21",
      description: "Managing committee of Building A took direct operational control over its own expenses."
    },
    {
      id: 'kd-3',
      event: "Allocation of common expenses to Building C",
      fromDate: "01-Oct-21",
      description: "Building C integrated into common expense pool allocation ratio."
    }
  ],

  // 2. Allocation Ratios for Common Expenses (Annexure 1 - Section 2)
  allocationRatios: [
    {
      id: 'ratio-ab',
      name: "Building A and B",
      ratio: "87 : 96",
      shareA: "47.54%",
      shareB: "52.46%",
      period: "01-Oct-2019 onwards",
      description: "Common expenses allocated between Building A (87 flats) and Building B (96 flats)."
    },
    {
      id: 'ratio-abc',
      name: "Building A, B and C",
      ratio: "87 : 96 : 43.5",
      shareA: "38.41%",
      shareB: "42.38%",
      shareC: "19.21%",
      period: "01-Oct-2021 onwards",
      description: "Common expenses allocated between Building A (87), Building B (96) and Building C (43.5 factor)."
    },
    {
      id: 'ratio-builder',
      name: "Building A/B and Builder",
      ratio: "70 : 30",
      shareA: "Society: 70%",
      shareB: "Builder: 30%",
      period: "Oct'19 - Dec'20",
      description: "Shared infrastructure and diesel expenditures split 70% to society and 30% to developer."
    }
  ],

  // 3. Statement of Amount Receivable from Builder (Annexure 1 - Section 3)
  statementOfDues: [
    {
      id: 's-1a',
      particulars: "a. Maintenance (excluding GST) on residential flats (Refer note a)",
      amount: 6068280,
      type: 'credit',
      category: 'Maintenance Collection',
      notes: "Gross maintenance billed for 87 residential flats (excluding GST)"
    },
    {
      id: 's-1b',
      particulars: "b. Maintenance on Commercial shops (including or excluding GST ?)",
      amount: 282587,
      type: 'credit',
      category: 'Maintenance Collection',
      notes: "Maintenance collected for commercial units; subject to clarification whether ₹43,106 GST was included"
    },
    {
      id: 's-total-maint',
      particulars: "I) Total Maintenance amount",
      amount: 6350867,
      type: 'subtotal-credit',
      category: 'Maintenance Collection',
      notes: "Sum of residential (₹60.68L) and commercial (₹2.83L) maintenance"
    },
    {
      id: 's-2a',
      particulars: "a. Expenses incurred from Oct 2019 to Sep 2021 for which Invoices were available",
      amount: -2640866,
      type: 'debit',
      category: 'Builder Expenditure',
      notes: "176 vouched invoice items verified across 20 vendor categories (Annexure 3)"
    },
    {
      id: 's-2b',
      particulars: "b. Expenses considered on estimated basis due to missing invoices",
      amount: -409211,
      type: 'debit',
      category: 'Builder Expenditure',
      notes: "23 unvouched items factored in working (₹1.73L from Bldg B records + ₹2.36L recurring estimates, Annexure 4)"
    },
    {
      id: 's-total-exp',
      particulars: "II) Total Expenses incurred by Builder",
      amount: -3050077,
      type: 'subtotal-debit',
      category: 'Builder Expenditure',
      notes: "Combined expenses claimed by builder (Invoiced + Estimated Missing)"
    },
    {
      id: 's-3',
      particulars: "III) Amount already received from Builder",
      amount: -2400000,
      type: 'deduction',
      category: 'Transfers Received',
      notes: "Advance funds remitted by builder to society bank account"
    },
    {
      id: 's-net',
      particulars: "Net amount ( I - II - III )",
      amount: 900790,
      type: 'net-principal',
      category: 'Principal Balance',
      notes: "Net principal receivable balance as of 30-Sep-2021"
    },
    {
      id: 's-interest',
      particulars: "Add : Interest @ 8% for period from Oct 2021 to Dec 2025",
      amount: 306268,
      type: 'interest',
      category: 'Statutory Interest',
      notes: "Simple interest @ 8% p.a. for 51 months delay in settlement"
    },
    {
      id: 's-final',
      particulars: "Total Amount receivable from Builder",
      amount: 1207058,
      type: 'final-total',
      category: 'Recoverable Claim',
      notes: "Final recoverable claim payable by developer to Majestique Euriska Building A"
    }
  ],

  // 4. Summary of Year-Wise Expenses (Annexure 1 - Section 4)
  yearWiseExpenses: [
    {
      id: 'ywe-1',
      category: "Security",
      oct19Dec19: 114000,
      jan20Dec20: 455683,
      jan21Sep21: 342000,
      jan22Jun22: 0,
      total: 911683,
      percentage: "34.52%",
      isMajor: true,
      vendors: "Marshal Force Security Services, Surya Security Services"
    },
    {
      id: 'ywe-2',
      category: "Electricity",
      oct19Dec19: 89750,
      jan20Dec20: 379483,
      jan21Sep21: 211851,
      jan22Jun22: 0,
      total: 681084,
      percentage: "25.79%",
      isMajor: true,
      vendors: "MSEDCL"
    },
    {
      id: 'ywe-3',
      category: "Housekeeping",
      oct19Dec19: 54668,
      jan20Dec20: 223943,
      jan21Sep21: 167455,
      jan22Jun22: 0,
      total: 446066,
      percentage: "16.89%",
      isMajor: true,
      vendors: "Vandana Enterprises"
    },
    {
      id: 'ywe-4',
      category: "Plumbing maintenace",
      oct19Dec19: 12000,
      jan20Dec20: 68000,
      jan21Sep21: 47000,
      jan22Jun22: 0,
      total: 127000,
      percentage: "4.81%",
      isMajor: true,
      vendors: "Sunil Kamble"
    },
    {
      id: 'ywe-5',
      category: "Lift",
      oct19Dec19: 0,
      jan20Dec20: 115640,
      jan21Sep21: 0,
      jan22Jun22: 0,
      total: 115640,
      percentage: "4.38%",
      isMajor: true,
      vendors: "Schindler"
    },
    {
      id: 'ywe-6',
      category: "Garbage cleaning",
      oct19Dec19: 4796,
      jan20Dec20: 41478,
      jan21Sep21: 52321,
      jan22Jun22: 0,
      total: 98595,
      percentage: "3.73%",
      isMajor: true,
      vendors: "Swach Plus Sahakari Sanstha Maryadit"
    },
    {
      id: 'ywe-7',
      category: "Electricity bill - STP and Fire Pump",
      oct19Dec19: 0,
      jan20Dec20: 0,
      jan21Sep21: 48088,
      jan22Jun22: 0,
      total: 48088,
      percentage: "1.82%",
      isMajor: false,
      vendors: "MSEDCL"
    },
    {
      id: 'ywe-8',
      category: "Garden maintenace",
      oct19Dec19: 8557,
      jan20Dec20: 32328,
      jan21Sep21: 9508,
      jan22Jun22: 0,
      total: 50393,
      percentage: "1.91%",
      isMajor: false,
      vendors: "Jahir Vali Mohammad, Naushad Ali"
    },
    {
      id: 'ywe-9',
      category: "Swimming Pool maintenance",
      oct19Dec19: 7168,
      jan20Dec20: 9180,
      jan21Sep21: 13074,
      jan22Jun22: 0,
      total: 29422,
      percentage: "1.11%",
      isMajor: false,
      vendors: "Gurukrupa Pools & Maintenance Services"
    },
    {
      id: 'ywe-10',
      category: "Water supply",
      oct19Dec19: 0,
      jan20Dec20: 8639,
      jan21Sep21: 18013,
      jan22Jun22: 0,
      total: 26652,
      percentage: "1.01%",
      isMajor: false,
      vendors: "Shri Swami Samarth Water Suppliers"
    },
    {
      id: 'ywe-11',
      category: "Diesel exp",
      oct19Dec19: 3883,
      jan20Dec20: 15530,
      jan21Sep21: 0,
      jan22Jun22: 0,
      total: 19413,
      percentage: "0.74%",
      isMajor: false,
      vendors: "BPCL E CMS"
    },
    {
      id: 'ywe-12',
      category: "Audit",
      oct19Dec19: 0,
      jan20Dec20: 19200,
      jan21Sep21: 0,
      jan22Jun22: 0,
      total: 19200,
      percentage: "0.73%",
      isMajor: false,
      vendors: "Rohit Dhage & Associates"
    },
    {
      id: 'ywe-13',
      category: "Electricity - Club House",
      oct19Dec19: 0,
      jan20Dec20: 10191,
      jan21Sep21: 2558,
      jan22Jun22: 0,
      total: 12748,
      percentage: "0.48%",
      isMajor: false,
      vendors: "MSEDCL"
    },
    {
      id: 'ywe-14',
      category: "Swimming Pool - Repair",
      oct19Dec19: 0,
      jan20Dec20: 2852,
      jan21Sep21: 9746,
      jan22Jun22: 0,
      total: 12598,
      percentage: "0.48%",
      isMajor: false,
      vendors: "Gurukrupa Pools & Maintenance Services"
    },
    {
      id: 'ywe-15',
      category: "Property tax",
      oct19Dec19: 0,
      jan20Dec20: 0,
      jan21Sep21: 6902,
      jan22Jun22: 3451,
      total: 10353,
      percentage: "0.39%",
      isMajor: false,
      vendors: "PMC"
    },
    {
      id: 'ywe-16',
      category: "Electric work",
      oct19Dec19: 1902,
      jan20Dec20: 7369,
      jan21Sep21: 0,
      jan22Jun22: 0,
      total: 9270,
      percentage: "0.35%",
      isMajor: false,
      vendors: "N.A.Sharma, Sadguru Krupa Electricals"
    },
    {
      id: 'ywe-17',
      category: "Drainage and other cleaning",
      oct19Dec19: 0,
      jan20Dec20: 3474,
      jan21Sep21: 4352,
      jan22Jun22: 0,
      total: 7826,
      percentage: "0.30%",
      isMajor: false,
      vendors: "Clean Up Services"
    },
    {
      id: 'ywe-18',
      category: "Gym maintenance",
      oct19Dec19: 0,
      jan20Dec20: 3310,
      jan21Sep21: 2861,
      jan22Jun22: 0,
      total: 6171,
      percentage: "0.23%",
      isMajor: false,
      vendors: "The Fitness Shop LLP"
    },
    {
      id: 'ywe-19',
      category: "Water tank cleaning",
      oct19Dec19: 0,
      jan20Dec20: 0,
      jan21Sep21: 5074,
      jan22Jun22: 0,
      total: 5074,
      percentage: "0.19%",
      isMajor: false,
      vendors: "Tank Clean"
    },
    {
      id: 'ywe-20',
      category: "Motor repair",
      oct19Dec19: 0,
      jan20Dec20: 2187,
      jan21Sep21: 0,
      jan22Jun22: 0,
      total: 2187,
      percentage: "0.08%",
      isMajor: false,
      vendors: "Sadguru Krupa Electricals"
    },
    {
      id: 'ywe-21',
      category: "My Gate",
      oct19Dec19: 0,
      jan20Dec20: 1402,
      jan21Sep21: 0,
      jan22Jun22: 0,
      total: 1402,
      percentage: "0.05%",
      isMajor: false,
      vendors: "My Gate"
    }
  ],
  yearWiseGrandTotal: {
    oct19Dec19: 296724,
    jan20Dec20: 1399889,
    jan21Sep21: 940803,
    jan22Jun22: 3451,
    total: 2640867
  },

  // 5. Common Expenses Breakdown (Annexure 1 - Section 6)
  commonExpenses: {
    total: 215425,
    description: "Of the total common expenses amounting to Rs. 215,425/-, below is the year-wise list of expenses attributable to Building A derived based on applying the allocation ratios.",
    allocations: [
      {
        pool: "Allocation between Building A and B (Ratio 87 : 96)",
        oct19Dec19: 17627,
        jan20Dec20: 75732,
        jan21Sep21: 92300,
        jan22Jun22: 0,
        total: 185659,
        items: [
          { name: "Garden maintenace", oct19Dec19: 8557, jan20Dec20: 32328, jan21Sep21: 9508, jan22Jun22: 0, total: 50393 },
          { name: "Electricity bill - STP and Fire Pump", oct19Dec19: 0, jan20Dec20: 0, jan21Sep21: 48088, jan22Jun22: 0, total: 48088 },
          { name: "Swimming Pool maintenance", oct19Dec19: 7168, jan20Dec20: 9180, jan21Sep21: 13074, jan22Jun22: 0, total: 29422 },
          { name: "Electricity - Club House", oct19Dec19: 0, jan20Dec20: 10191, jan21Sep21: 2558, jan22Jun22: 0, total: 12748 },
          { name: "Swimming Pool - Repair", oct19Dec19: 0, jan20Dec20: 2852, jan21Sep21: 9746, jan22Jun22: 0, total: 12598 },
          { name: "Electric work", oct19Dec19: 1902, jan20Dec20: 7369, jan21Sep21: 0, jan22Jun22: 0, total: 9270 },
          { name: "Water supply", oct19Dec19: 0, jan20Dec20: 5439, jan21Sep21: 3613, jan22Jun22: 0, total: 9052 },
          { name: "Gym maintenance", oct19Dec19: 0, jan20Dec20: 3310, jan21Sep21: 2861, jan22Jun22: 0, total: 6171 },
          { name: "Drainage and other cleaning", oct19Dec19: 0, jan20Dec20: 1474, jan21Sep21: 2852, jan22Jun22: 0, total: 4326 },
          { name: "Motor repair", oct19Dec19: 0, jan20Dec20: 2187, jan21Sep21: 0, jan22Jun22: 0, total: 2187 },
          { name: "My Gate", oct19Dec19: 0, jan20Dec20: 1402, jan21Sep21: 0, jan22Jun22: 0, total: 1402 }
        ]
      },
      {
        pool: "Allocation between Building A, B and C (Ratio 87 : 96 : 43.5)",
        oct19Dec19: 0,
        jan20Dec20: 0,
        jan21Sep21: 6902,
        jan22Jun22: 3451,
        total: 10353,
        items: [
          { name: "Property tax", oct19Dec19: 0, jan20Dec20: 0, jan21Sep21: 6902, jan22Jun22: 3451, total: 10353 }
        ]
      },
      {
        pool: "Allocation between A, B and Builder (Ratio 70 : 30)",
        oct19Dec19: 3883,
        jan20Dec20: 15530,
        jan21Sep21: 0,
        jan22Jun22: 0,
        total: 19413,
        items: [
          { name: "Diesel exp", oct19Dec19: 3883, jan20Dec20: 15530, jan21Sep21: 0, jan22Jun22: 0, total: 19413 }
        ]
      }
    ]
  },

  // 6. Vendors Summary (Annexure 1 - Section 7)
  vendors: [
    { name: "Marshal Force Security Services", nature: "Security", oct19Dec19: 0, jan20Dec20: 417683, jan21Sep21: 342000, jan22Jun22: 0, total: 759683 },
    { name: "MSEDCL", nature: "Electricity", oct19Dec19: 89750, jan20Dec20: 389674, jan21Sep21: 262496, jan22Jun22: 0, total: 741920 },
    { name: "Vandana Enterprises", nature: "Housekeeping", oct19Dec19: 54668, jan20Dec20: 223943, jan21Sep21: 167455, jan22Jun22: 0, total: 446066 },
    { name: "Surya Security Services", nature: "Security", oct19Dec19: 114000, jan20Dec20: 38000, jan21Sep21: 0, jan22Jun22: 0, total: 152000 },
    { name: "Sunil Kamble", nature: "Plumbing maintenace", oct19Dec19: 12000, jan20Dec20: 68000, jan21Sep21: 47000, jan22Jun22: 0, total: 127000 },
    { name: "Schindler", nature: "Lift", oct19Dec19: 0, jan20Dec20: 115640, jan21Sep21: 0, jan22Jun22: 0, total: 115640 },
    { name: "Swach Plus Sahakari Sanstha Maryadit", nature: "Garbage cleaning", oct19Dec19: 4796, jan20Dec20: 41478, jan21Sep21: 52321, jan22Jun22: 0, total: 98595 },
    { name: "Gurukrupa Pools & Maintenance Services", nature: "Swimming Pool maintenance", oct19Dec19: 7168, jan20Dec20: 12033, jan21Sep21: 22820, jan22Jun22: 0, total: 42021 },
    { name: "Jahir Vali Mohammad", nature: "Garden maintenace", oct19Dec19: 8557, jan20Dec20: 19967, jan21Sep21: 0, jan22Jun22: 0, total: 28525 },
    { name: "Shri Swami Samarth Water Suppliers", nature: "Water supply", oct19Dec19: 0, jan20Dec20: 8639, jan21Sep21: 18013, jan22Jun22: 0, total: 26652 },
    { name: "Naushad Ali", nature: "Garden maintenace", oct19Dec19: 0, jan20Dec20: 12361, jan21Sep21: 9508, jan22Jun22: 0, total: 21869 },
    { name: "BPCL E CMS", nature: "Diesel exp", oct19Dec19: 3883, jan20Dec20: 15530, jan21Sep21: 0, jan22Jun22: 0, total: 19413 },
    { name: "Rohit Dhage & Associates", nature: "Audit", oct19Dec19: 0, jan20Dec20: 19200, jan21Sep21: 0, jan22Jun22: 0, total: 19200 },
    { name: "PMC", nature: "Property tax", oct19Dec19: 0, jan20Dec20: 0, jan21Sep21: 6902, jan22Jun22: 3451, total: 10353 },
    { name: "Clean Up Services", nature: "Drainage and other cleaning", oct19Dec19: 0, jan20Dec20: 3474, jan21Sep21: 4352, jan22Jun22: 0, total: 7826 },
    { name: "N.A.Sharma", nature: "Electric work", oct19Dec19: 1902, jan20Dec20: 5705, jan21Sep21: 0, jan22Jun22: 0, total: 7607 },
    { name: "The Fitness Shop LLP", nature: "Gym maintenance", oct19Dec19: 0, jan20Dec20: 3310, jan21Sep21: 2861, jan22Jun22: 0, total: 6171 },
    { name: "Tank Clean", nature: "Water tank cleaning", oct19Dec19: 0, jan20Dec20: 0, jan21Sep21: 5074, jan22Jun22: 0, total: 5074 },
    { name: "Sadguru Krupa Electricals", nature: "Motor repair", oct19Dec19: 0, jan20Dec20: 3851, jan21Sep21: 0, jan22Jun22: 0, total: 3851 },
    { name: "My Gate", nature: "My Gate", oct19Dec19: 0, jan20Dec20: 1402, jan21Sep21: 0, jan22Jun22: 0, total: 1402 }
  ],

  // 7. Annexure 2: Areas Requiring Further Clarity and / or Discussions (Financial Impact Analysis)
  discussionsAndClarity: [
    {
      itemNo: 1,
      topic: "Invoices missing list (Annexure 4)",
      impact: 409211,
      impactType: 'positive', // increases recovery if excluded
      impactFormatted: "+₹4,09,211",
      description: "The missing list of invoices totals ₹4,09,211 (₹1,73,458 found during Bldg B assignment but missing in Bldg A records + ₹2,35,753 assumed recurring services missing invoices). Note that this amount has already been factored in the working as builder expense. If decided to exclude these amounts due to invoices being unproven/missing, the recoverable amount increases by ₹4,09,211.",
      actionPlan: "Demand proof of payment and authentic invoice copies from builder. Refuse expense deduction without valid voucher documentation."
    },
    {
      itemNo: 2,
      topic: "Balance maintenance receivable on residential flats",
      impact: -219628,
      impactType: 'negative',
      impactFormatted: "-₹2,19,628",
      description: "The ₹60.68 lacs maintenance on residential flats is considered in full. Of this, ₹2.19 lacs was showing as receivable balance as per Excel records received. Any objection by builder to crediting uncollected maintenance would negatively impact the recoverable amount.",
      actionPlan: "Obtain flat-wise defaulter ledger from developer to substantiate recovery responsibility."
    },
    {
      itemNo: 3,
      topic: "Refund of maintenance due to late possession",
      impact: null,
      impactType: 'unquantified',
      impactFormatted: "Unquantified",
      description: "As discussed in the 04th Jan 2026 meeting, any amount of refund provided by builder due to late possession of flats will negatively impact recovery. This refund has not been quantified yet.",
      actionPlan: "Require builder to produce written flat-buyer possession indemnity records before allowing any offset."
    },
    {
      itemNo: 4,
      topic: "GST credit on expenses used for output GST on maintenance collected by Builder",
      impact: 139070,
      impactType: 'positive',
      impactFormatted: "+₹1,39,070",
      description: "Since builder collected GST on maintenance, the input tax credit (ITC) availed by builder to offset against GST liability should be given back as credit to society. In other words, credit availed on expenses should have been excluded from the total expenditure incurred by builder for maintaining the society. If agreed, this positively increases recoverable amount.",
      actionPlan: "Strong negotiating point: Builder cannot double-dip by charging full GST expense to society while pocketing ITC credit on government returns."
    },
    {
      itemNo: 5,
      topic: "GST on maintenance received towards commercial shops",
      impact: -43106,
      impactType: 'negative',
      impactFormatted: "-₹43,106",
      description: "Maintenance on commercial shops has been considered in full at ₹2.82 lacs. Builder may raise objection stating that the said maintenance included GST @ 18% which is a statutory due to the Government.",
      actionPlan: "Verify original commercial shop maintenance agreements and tax invoices issued to shop owners."
    },
    {
      itemNo: 6,
      topic: "Developer supervision charges",
      impact: -270000,
      impactType: 'negative',
      impactFormatted: "-₹2,70,000",
      description: "Basis meeting dtd. 04 Jan 2026, supervision charges of ₹2.70 lacs levied by builder have been excluded from working. Any objection from builder would negatively impact recoverable amount.",
      actionPlan: "Maintain strong committee consensus: builder supervision charges are non-contractual and were rejected in provisional committee meetings."
    },
    {
      itemNo: 7,
      topic: "Interest on the amount of recovery",
      impact: -306268,
      impactType: 'negative',
      impactFormatted: "-₹3,06,268",
      description: "Recoverable amount includes interest charged @ 8% for period Oct 2021 to Dec 2025 (₹3,06,268). Any objection either on liability to pay interest or rate used may negatively impact recoverable amount.",
      actionPlan: "Defend statutory RERA / MOFA provisions regarding commercial interest on withheld society maintenance funds."
    },
    {
      itemNo: 8,
      topic: "Inappropriate invoicing or duplicate invoicing",
      impact: null,
      impactType: 'qualitative',
      impactFormatted: "Audit Observation",
      description: "Certain invoices of Plumbing and Garden maintenance were found to be inappropriate in the sense that duplicate invoices were raised for the same period, or didn't look appropriately raised even if for different periods.",
      actionPlan: "Highlight questionable invoices during audit negotiation meeting to counter builder claims."
    },
    {
      itemNo: 9,
      topic: "Basis of preparation - Invoices and not bank statements",
      impact: null,
      impactType: 'qualitative',
      impactFormatted: "Audit Limitation",
      description: "Report is prepared purely on basis of physical invoices and not on basis of bank statements or cash book. Any available invoice not paid or any unvouched bank payment would alter results.",
      actionPlan: "Cross-examine against BOM Passbook Ledger (A/c 60305942224) to ensure no ghost entries."
    }
  ],

  // 8. Line by Line Items of All Expenses Spent for Building A (Annexure 3) - 176 items totaling ₹26,40,866
  lineByLineExpenses: [
    // Page 9 (Items 1 - 36)
    { id: 1, basis: "Self", vendor: "Rohit Dhage & Associates", nature: "Audit", invoiceNo: "-", invoiceDate: "-", pmtVoucherDate: "20/09/2021", docAmt: 19200, relevantAmt: 19200, year: 2020, month: "NA" },
    { id: 2, basis: "Allocation AB Builder", vendor: "BPCL E CMS", nature: "Diesel exp", invoiceNo: "-", invoiceDate: "NA", pmtVoucherDate: "23/11/2021", docAmt: 34943, relevantAmt: 3883, year: 2019, month: "NA" },
    { id: 3, basis: "Allocation AB Builder", vendor: "BPCL E CMS", nature: "Diesel exp", invoiceNo: "-", invoiceDate: "NA", pmtVoucherDate: "23/11/2021", docAmt: null, relevantAmt: 15530, year: 2020, month: "NA" },
    { id: 4, basis: "Self", vendor: "Clean Up Services", nature: "Drainage and other cleaning", invoiceNo: "2611", invoiceDate: "20/03/2020", pmtVoucherDate: "29/05/2020", docAmt: 2000, relevantAmt: 2000, year: 2020, month: "NA" },
    { id: 5, basis: "Allocation AB", vendor: "Clean Up Services", nature: "Drainage and other cleaning", invoiceNo: "2875", invoiceDate: "09/09/2020", pmtVoucherDate: "08/10/2020", docAmt: 800, relevantAmt: 380, year: 2020, month: "Sep" },
    { id: 6, basis: "Allocation AB", vendor: "Clean Up Services", nature: "Drainage and other cleaning", invoiceNo: "2924", invoiceDate: "01/10/2020", pmtVoucherDate: "27/10/2020", docAmt: 800, relevantAmt: 380, year: 2020, month: "Sep" },
    { id: 7, basis: "Allocation AB", vendor: "Clean Up Services", nature: "Drainage and other cleaning", invoiceNo: "3035", invoiceDate: "01/12/2020", pmtVoucherDate: "15/12/2020", docAmt: 1500, relevantAmt: 713, year: 2020, month: "Nov" },
    { id: 8, basis: "Allocation AB", vendor: "Clean Up Services", nature: "Drainage and other cleaning", invoiceNo: "3276", invoiceDate: "01/04/2021", pmtVoucherDate: "28/04/2021", docAmt: 3000, relevantAmt: 1426, year: 2021, month: "Mar" },
    { id: 9, basis: "Self", vendor: "Clean Up Services", nature: "Drainage and other cleaning", invoiceNo: "3694", invoiceDate: "28/08/2021", pmtVoucherDate: "14/10/2021", docAmt: 1500, relevantAmt: 1500, year: 2021, month: "Sep" },
    { id: 10, basis: "Allocation AB", vendor: "Clean Up Services", nature: "Drainage and other cleaning", invoiceNo: "-", invoiceDate: "-", pmtVoucherDate: "14/10/2021", docAmt: 3000, relevantAmt: 1426, year: 2021, month: "NA" },
    { id: 11, basis: "Allocation AB", vendor: "N.A.Sharma", nature: "Electric work", invoiceNo: "20", invoiceDate: "05/11/2019", pmtVoucherDate: "19/11/2019", docAmt: 4000, relevantAmt: 1902, year: 2019, month: "Oct" },
    { id: 12, basis: "Allocation AB", vendor: "Sadguru Krupa Electricals", nature: "Electric work", invoiceNo: "446", invoiceDate: "13/05/2020", pmtVoucherDate: "29/05/2020", docAmt: 3500, relevantAmt: 1664, year: 2020, month: "NA" },
    { id: 13, basis: "Allocation AB", vendor: "N.A.Sharma", nature: "Electric work", invoiceNo: "3", invoiceDate: "05/09/2020", pmtVoucherDate: "09/11/2020", docAmt: 12000, relevantAmt: 5705, year: 2020, month: "Jun, Jul, Aug" },
    { id: 14, basis: "Self", vendor: "MSEDCL", nature: "Electricity", invoiceNo: "-", invoiceDate: "22/10/2019", pmtVoucherDate: "05/11/2019", docAmt: 31460, relevantAmt: 31460, year: 2019, month: "Oct" },
    { id: 15, basis: "Self", vendor: "MSEDCL", nature: "Electricity", invoiceNo: "77990", invoiceDate: "21/11/2019", pmtVoucherDate: "04/12/2019", docAmt: 25620, relevantAmt: 25620, year: 2019, month: "Nov" },
    { id: 16, basis: "Self", vendor: "MSEDCL", nature: "Electricity", invoiceNo: "-", invoiceDate: "21/12/2019", pmtVoucherDate: "26/12/2019", docAmt: 32670, relevantAmt: 32670, year: 2019, month: "Dec" },
    { id: 17, basis: "Self", vendor: "MSEDCL", nature: "Electricity", invoiceNo: "35467", invoiceDate: "21/01/2020", pmtVoucherDate: "29/01/2020", docAmt: 32600, relevantAmt: 32600, year: 2020, month: "Jan" },
    { id: 18, basis: "Self", vendor: "MSEDCL", nature: "Electricity", invoiceNo: "3085", invoiceDate: "21/02/2020", pmtVoucherDate: "11/03/2020", docAmt: 29540, relevantAmt: 29540, year: 2020, month: "Feb" },
    { id: 19, basis: "Self", vendor: "MSEDCL", nature: "Electricity", invoiceNo: "28728", invoiceDate: "21/05/2020", pmtVoucherDate: "NA", docAmt: 90430, relevantAmt: 90430, year: 2020, month: "Mar, Apr, May" },
    { id: 20, basis: "Self", vendor: "MSEDCL", nature: "Electricity", invoiceNo: "86858", invoiceDate: "22/06/2020", pmtVoucherDate: "26/06/2020", docAmt: 86040, relevantAmt: 86040, year: 2020, month: "Jun" },
    { id: 21, basis: "Self", vendor: "MSEDCL", nature: "Electricity", invoiceNo: "70231", invoiceDate: "21/08/2020", pmtVoucherDate: "-", docAmt: 40250, relevantAmt: 40250, year: 2020, month: "Jul, Aug" },
    { id: 22, basis: "Self", vendor: "MSEDCL", nature: "Electricity", invoiceNo: "64802", invoiceDate: "21/09/2020", pmtVoucherDate: "08/10/2020", docAmt: 64630, relevantAmt: 24123, year: 2020, month: "Sep" },
    { id: 23, basis: "Self", vendor: "MSEDCL", nature: "Electricity", invoiceNo: "-", invoiceDate: "21/10/2020", pmtVoucherDate: "09/11/2020", docAmt: 23700, relevantAmt: 23700, year: 2020, month: "Oct" },
    { id: 24, basis: "Self", vendor: "MSEDCL", nature: "Electricity", invoiceNo: "16658", invoiceDate: "22/02/2021", pmtVoucherDate: "22/02/2021", docAmt: 49025, relevantAmt: 52800, year: 2020, month: "Nov, Dec" },
    { id: 25, basis: "Self", vendor: "MSEDCL", nature: "Electricity", invoiceNo: "16658", invoiceDate: "22/02/2021", pmtVoucherDate: "22/02/2021", docAmt: 49025, relevantAmt: 45251, year: 2021, month: "Jan, Feb" },
    { id: 26, basis: "Self", vendor: "MSEDCL", nature: "Electricity", invoiceNo: "-", invoiceDate: "-", pmtVoucherDate: "18/06/2021", docAmt: 74390, relevantAmt: 74390, year: 2021, month: "Mar, Apr, May" },
    { id: 27, basis: "Self", vendor: "MSEDCL", nature: "Electricity", invoiceNo: "96828", invoiceDate: "21/09/2021", pmtVoucherDate: "20/10/2021", docAmt: 41290, relevantAmt: 41290, year: 2021, month: "Aug, Sep" },
    { id: 28, basis: "Self", vendor: "MSEDCL", nature: "Electricity", invoiceNo: "19627", invoiceDate: "21/08/2021", pmtVoucherDate: "23/09/2021", docAmt: 21032, relevantAmt: 0, year: 2021, month: "Aug" },
    { id: 29, basis: "Self", vendor: "MSEDCL", nature: "Electricity", invoiceNo: "-", invoiceDate: "-", pmtVoucherDate: "-", docAmt: 50920, relevantAmt: 50920, year: 2021, month: "Jun, Jul" },
    { id: 30, basis: "Allocation AB", vendor: "MSEDCL", nature: "Electricity - Club House", invoiceNo: "-", invoiceDate: "21/01/2020", pmtVoucherDate: "22/01/2020", docAmt: null, relevantAmt: 1471, year: 2020, month: "Jan" },
    { id: 31, basis: "Allocation AB", vendor: "MSEDCL", nature: "Electricity - Club House", invoiceNo: "-", invoiceDate: "21/01/2020", pmtVoucherDate: "22/01/2020", docAmt: null, relevantAmt: 490, year: 2020, month: "Jan" },
    { id: 32, basis: "Allocation AB", vendor: "MSEDCL", nature: "Electricity - Club House", invoiceNo: "2818", invoiceDate: "21/02/2020", pmtVoucherDate: "11/03/2020", docAmt: 4660, relevantAmt: 2215, year: 2020, month: "Feb" },
    { id: 33, basis: "Allocation AB", vendor: "MSEDCL", nature: "Electricity - Club House", invoiceNo: "28457", invoiceDate: "21/05/2020", pmtVoucherDate: "NA", docAmt: 7730, relevantAmt: 3675, year: 2020, month: "May" },
    { id: 34, basis: "Allocation AB", vendor: "MSEDCL", nature: "Electricity - Club House", invoiceNo: "61120", invoiceDate: "22/06/2020", pmtVoucherDate: "26/06/2020", docAmt: 2060, relevantAmt: 979, year: 2020, month: "Jun" },
    { id: 35, basis: "Allocation AB", vendor: "MSEDCL", nature: "Electricity - Club House", invoiceNo: "69937", invoiceDate: "21/08/2020", pmtVoucherDate: "-", docAmt: 1070, relevantAmt: 509, year: 2020, month: "Aug" },
    { id: 36, basis: "Allocation AB", vendor: "MSEDCL", nature: "Electricity - Club House", invoiceNo: "64506", invoiceDate: "21/09/2020", pmtVoucherDate: "08/10/2020", docAmt: 1430, relevantAmt: 680, year: 2020, month: "Sep" },

    // Page 10 (Items 37 - 72)
    { id: 37, basis: "Allocation AB", vendor: "MSEDCL", nature: "Electricity - Club House", invoiceNo: "-", invoiceDate: "-", pmtVoucherDate: "09/11/2020", docAmt: 360, relevantAmt: 171, year: 2020, month: "NA" },
    { id: 38, basis: "Allocation AB", vendor: "MSEDCL", nature: "Electricity - Club House", invoiceNo: "-", invoiceDate: "21/09/2021", pmtVoucherDate: "20/10/2021", docAmt: 5380, relevantAmt: 2558, year: 2021, month: "Sep" },
    { id: 39, basis: "Allocation AB", vendor: "MSEDCL", nature: "Electricity bill - STP and Fire Pump", invoiceNo: "-", invoiceDate: "12/10/2021", pmtVoucherDate: "20/10/2021", docAmt: 101150, relevantAmt: 48088, year: 2021, month: "May to Sep" },
    { id: 40, basis: "Self", vendor: "Swach Plus Sahakari Sanstha Maryadit", nature: "Garbage cleaning", invoiceNo: "298", invoiceDate: "01/12/2019", pmtVoucherDate: "18/12/2019", docAmt: 2398, relevantAmt: 2398, year: 2019, month: "Nov" },
    { id: 41, basis: "Self", vendor: "Swach Plus Sahakari Sanstha Maryadit", nature: "Garbage cleaning", invoiceNo: "341", invoiceDate: "01/01/2020", pmtVoucherDate: "10/01/2020", docAmt: 2398, relevantAmt: 2398, year: 2019, month: "Dec" },
    { id: 42, basis: "Self", vendor: "Swach Plus Sahakari Sanstha Maryadit", nature: "Garbage cleaning", invoiceNo: "382", invoiceDate: "01/02/2020", pmtVoucherDate: "27/02/2020", docAmt: 3600, relevantAmt: 3600, year: 2020, month: "Jan" },
    { id: 43, basis: "Self", vendor: "Swach Plus Sahakari Sanstha Maryadit", nature: "Garbage cleaning", invoiceNo: "65", invoiceDate: "01/05/2020", pmtVoucherDate: "29/05/2020", docAmt: 3600, relevantAmt: 3600, year: 2020, month: "Apr" },
    { id: 44, basis: "Self", vendor: "Swach Plus Sahakari Sanstha Maryadit", nature: "Garbage cleaning", invoiceNo: "27", invoiceDate: "01/04/2020", pmtVoucherDate: "29/05/2020", docAmt: 3600, relevantAmt: 3600, year: 2020, month: "Mar" },
    { id: 45, basis: "Self", vendor: "Swach Plus Sahakari Sanstha Maryadit", nature: "Garbage cleaning", invoiceNo: "416", invoiceDate: "01/03/2020", pmtVoucherDate: "29/05/2020", docAmt: 3600, relevantAmt: 3600, year: 2020, month: "Feb" },
    { id: 46, basis: "Self", vendor: "Swach Plus Sahakari Sanstha Maryadit", nature: "Garbage cleaning", invoiceNo: "138", invoiceDate: "01/07/2020", pmtVoucherDate: "04/08/2020", docAmt: 3600, relevantAmt: 3600, year: 2020, month: "Jun" },
    { id: 47, basis: "Self", vendor: "Swach Plus Sahakari Sanstha Maryadit", nature: "Garbage cleaning", invoiceNo: "104", invoiceDate: "01/06/2020", pmtVoucherDate: "04/08/2020", docAmt: 3600, relevantAmt: 3600, year: 2020, month: "May" },
    { id: 48, basis: "Self", vendor: "Swach Plus Sahakari Sanstha Maryadit", nature: "Garbage cleaning", invoiceNo: "208", invoiceDate: "01/09/2020", pmtVoucherDate: "17/09/2020", docAmt: 3600, relevantAmt: 3600, year: 2020, month: "Aug" },
    { id: 49, basis: "Self", vendor: "Swach Plus Sahakari Sanstha Maryadit", nature: "Garbage cleaning", invoiceNo: "173", invoiceDate: "01/08/2020", pmtVoucherDate: "17/09/2020", docAmt: 3600, relevantAmt: 3600, year: 2020, month: "Jul" },
    { id: 50, basis: "Self", vendor: "Swach Plus Sahakari Sanstha Maryadit", nature: "Garbage cleaning", invoiceNo: "281", invoiceDate: "01/11/2020", pmtVoucherDate: "15/12/2020", docAmt: 3600, relevantAmt: 3600, year: 2020, month: "Oct" },
    { id: 51, basis: "Self", vendor: "Swach Plus Sahakari Sanstha Maryadit", nature: "Garbage cleaning", invoiceNo: "324", invoiceDate: "01/12/2020", pmtVoucherDate: "15/12/2020", docAmt: 3600, relevantAmt: 3600, year: 2020, month: "Nov" },
    { id: 52, basis: "Self", vendor: "Swach Plus Sahakari Sanstha Maryadit", nature: "Garbage cleaning", invoiceNo: "360", invoiceDate: "01/01/2021", pmtVoucherDate: "15/01/2021", docAmt: 5478, relevantAmt: 5478, year: 2020, month: "Dec" },
    { id: 53, basis: "Self", vendor: "Swach Plus Sahakari Sanstha Maryadit", nature: "Garbage cleaning", invoiceNo: "395", invoiceDate: "01/02/2021", pmtVoucherDate: "18/02/2021", docAmt: 5478, relevantAmt: 5478, year: 2021, month: "Jan" },
    { id: 54, basis: "Self", vendor: "Swach Plus Sahakari Sanstha Maryadit", nature: "Garbage cleaning", invoiceNo: "431", invoiceDate: "01/03/2021", pmtVoucherDate: "19/03/2021", docAmt: 5478, relevantAmt: 5478, year: 2021, month: "Feb" },
    { id: 55, basis: "Self", vendor: "Swach Plus Sahakari Sanstha Maryadit", nature: "Garbage cleaning", invoiceNo: "27", invoiceDate: "01/04/2021", pmtVoucherDate: "14/04/2021", docAmt: 5478, relevantAmt: 5478, year: 2021, month: "Mar" },
    { id: 56, basis: "Self", vendor: "Swach Plus Sahakari Sanstha Maryadit", nature: "Garbage cleaning", invoiceNo: "62", invoiceDate: "-", pmtVoucherDate: "25/05/2021", docAmt: 5478, relevantAmt: 5478, year: 2021, month: "Apr" },
    { id: 57, basis: "Self", vendor: "Swach Plus Sahakari Sanstha Maryadit", nature: "Garbage cleaning", invoiceNo: "249", invoiceDate: "01/10/2021", pmtVoucherDate: "14/10/2021", docAmt: 6081, relevantAmt: 6081, year: 2021, month: "Sep" },
    { id: 58, basis: "Self", vendor: "Swach Plus Sahakari Sanstha Maryadit", nature: "Garbage cleaning", invoiceNo: "100", invoiceDate: "01/06/2021", pmtVoucherDate: "28/06/2021", docAmt: 6082, relevantAmt: 6082, year: 2021, month: "May" },
    { id: 59, basis: "Self", vendor: "Swach Plus Sahakari Sanstha Maryadit", nature: "Garbage cleaning", invoiceNo: "176", invoiceDate: "02/08/2021", pmtVoucherDate: "NA", docAmt: 6082, relevantAmt: 6082, year: 2021, month: "Jul" },
    { id: 60, basis: "Self", vendor: "Swach Plus Sahakari Sanstha Maryadit", nature: "Garbage cleaning", invoiceNo: "138", invoiceDate: "01/07/2021", pmtVoucherDate: "NA", docAmt: 6082, relevantAmt: 6082, year: 2021, month: "Jun" },
    { id: 61, basis: "Self", vendor: "Swach Plus Sahakari Sanstha Maryadit", nature: "Garbage cleaning", invoiceNo: "212", invoiceDate: "01/09/2021", pmtVoucherDate: "NA", docAmt: 6082, relevantAmt: 6082, year: 2021, month: "Aug" },
    { id: 62, basis: "Allocation AB", vendor: "Jahir Vali Mohammad", nature: "Garden maintenace", invoiceNo: "11", invoiceDate: "01/11/2019", pmtVoucherDate: "18/12/2019", docAmt: 6000, relevantAmt: 2852, year: 2019, month: "Oct" },
    { id: 63, basis: "Allocation AB", vendor: "Jahir Vali Mohammad", nature: "Garden maintenace", invoiceNo: "12", invoiceDate: "01/12/2019", pmtVoucherDate: "18/12/2019", docAmt: 6000, relevantAmt: 2852, year: 2019, month: "Nov" },
    { id: 64, basis: "Allocation AB", vendor: "Jahir Vali Mohammad", nature: "Garden maintenace", invoiceNo: "1", invoiceDate: "25/01/2020", pmtVoucherDate: "27/01/2020", docAmt: 6000, relevantAmt: 2852, year: 2019, month: "Dec" },
    { id: 65, basis: "Allocation AB", vendor: "Jahir Vali Mohammad", nature: "Garden maintenace", invoiceNo: "2", invoiceDate: "01/02/2020", pmtVoucherDate: "27/02/2020", docAmt: 6000, relevantAmt: 2852, year: 2020, month: "Jan" },
    { id: 66, basis: "Allocation AB", vendor: "Jahir Vali Mohammad", nature: "Garden maintenace", invoiceNo: "4", invoiceDate: "01/06/2020", pmtVoucherDate: "06/06/2020", docAmt: 12000, relevantAmt: 5705, year: 2020, month: "Apr - May" },
    { id: 67, basis: "Allocation AB", vendor: "Jahir Vali Mohammad", nature: "Garden maintenace", invoiceNo: "3", invoiceDate: "31/03/2020", pmtVoucherDate: "06/06/2020", docAmt: 12000, relevantAmt: 5705, year: 2020, month: "Feb - Mar" },
    { id: 68, basis: "Allocation AB", vendor: "Jahir Vali Mohammad", nature: "Garden maintenace", invoiceNo: "6", invoiceDate: "01/08/2020", pmtVoucherDate: "17/09/2020", docAmt: 6000, relevantAmt: 2852, year: 2020, month: "Jul" },
    { id: 69, basis: "Allocation AB", vendor: "Jahir Vali Mohammad", nature: "Garden maintenace", invoiceNo: "5", invoiceDate: "01/07/2020", pmtVoucherDate: "17/09/2020", docAmt: 6000, relevantAmt: 2852, year: 2020, month: "Jun" },
    { id: 70, basis: "Allocation AB", vendor: "Naushad Ali", nature: "Garden maintenace", invoiceNo: "7", invoiceDate: "01/10/2020", pmtVoucherDate: "27/10/2020", docAmt: 8000, relevantAmt: 3803, year: 2020, month: "Sep" },
    { id: 71, basis: "Allocation AB", vendor: "Naushad Ali", nature: "Garden maintenace", invoiceNo: "8", invoiceDate: "01/11/2020", pmtVoucherDate: "09/11/2020", docAmt: 6000, relevantAmt: 2852, year: 2020, month: "Oct" },
    { id: 72, basis: "Allocation AB", vendor: "Naushad Ali", nature: "Garden maintenace", invoiceNo: "9", invoiceDate: "01/12/2020", pmtVoucherDate: "15/01/2021", docAmt: 6000, relevantAmt: 2852, year: 2020, month: "Nov" },

    // Page 11 (Items 73 - 108)
    { id: 73, basis: "Allocation AB", vendor: "Naushad Ali", nature: "Garden maintenace", invoiceNo: "10", invoiceDate: "01/01/2021", pmtVoucherDate: "15/01/2021", docAmt: 6000, relevantAmt: 2852, year: 2020, month: "Dec" },
    { id: 74, basis: "Allocation AB", vendor: "Naushad Ali", nature: "Garden maintenace", invoiceNo: "11", invoiceDate: "01/02/2021", pmtVoucherDate: "01/03/2021", docAmt: 6000, relevantAmt: 2852, year: 2021, month: "Jan" },
    { id: 75, basis: "Allocation AB", vendor: "Naushad Ali", nature: "Garden maintenace", invoiceNo: "13", invoiceDate: "01/04/2021", pmtVoucherDate: "28/04/2021", docAmt: 7000, relevantAmt: 3328, year: 2021, month: "Mar" },
    { id: 76, basis: "Allocation AB", vendor: "Naushad Ali", nature: "Garden maintenace", invoiceNo: "12", invoiceDate: "01/03/2021", pmtVoucherDate: "28/04/2021", docAmt: 7000, relevantAmt: 3328, year: 2021, month: "Feb" },
    { id: 77, basis: "Allocation AB", vendor: "The Fitness Shop LLP", nature: "Gym maintenance", invoiceNo: "-", invoiceDate: "23/02/2020", pmtVoucherDate: "20/05/2020", docAmt: 6962, relevantAmt: 3310, year: 2020, month: "NA" },
    { id: 78, basis: "Allocation AB", vendor: "The Fitness Shop LLP", nature: "Gym maintenance", invoiceNo: "-", invoiceDate: "03/01/2021", pmtVoucherDate: "01/03/2021", docAmt: 6018, relevantAmt: 2861, year: 2021, month: "NA" },
    { id: 79, basis: "Self", vendor: "Vandana Enterprises", nature: "Housekeeping", invoiceNo: "486", invoiceDate: "09/11/2019", pmtVoucherDate: "18/12/2019", docAmt: 13737, relevantAmt: 13737, year: 2019, month: "Oct" },
    { id: 80, basis: "Self", vendor: "Vandana Enterprises", nature: "Housekeeping", invoiceNo: "227", invoiceDate: "20/12/2019", pmtVoucherDate: "26/12/2019", docAmt: 19000, relevantAmt: 19000, year: 2019, month: "Nov" },
    { id: 81, basis: "Self", vendor: "Vandana Enterprises", nature: "Housekeeping", invoiceNo: "235", invoiceDate: "03/01/2020", pmtVoucherDate: "15/01/2020", docAmt: 21931, relevantAmt: 21931, year: 2019, month: "Dec" },
    { id: 82, basis: "Self", vendor: "Vandana Enterprises", nature: "Housekeeping", invoiceNo: "246", invoiceDate: "03/02/2020", pmtVoucherDate: "27/02/2020", docAmt: 21449, relevantAmt: 21449, year: 2020, month: "Jan" },
    { id: 83, basis: "Self", vendor: "Vandana Enterprises", nature: "Housekeeping", invoiceNo: "257", invoiceDate: "03/03/2020", pmtVoucherDate: "04/05/2020", docAmt: 20640, relevantAmt: 20640, year: 2020, month: "Feb" },
    { id: 84, basis: "Self", vendor: "Vandana Enterprises", nature: "Housekeeping", invoiceNo: "299", invoiceDate: "07/07/2020", pmtVoucherDate: "04/08/2020", docAmt: 22500, relevantAmt: 22500, year: 2020, month: "Jun" },
    { id: 85, basis: "Self", vendor: "Vandana Enterprises", nature: "Housekeeping", invoiceNo: "286", invoiceDate: "01/06/2020", pmtVoucherDate: "04/08/2020", docAmt: 16629, relevantAmt: 16629, year: 2020, month: "May" },
    { id: 86, basis: "Self", vendor: "Vandana Enterprises", nature: "Housekeeping", invoiceNo: "284", invoiceDate: "01/05/2020", pmtVoucherDate: "04/08/2020", docAmt: 9450, relevantAmt: 9450, year: 2020, month: "Apr" },
    { id: 87, basis: "Self", vendor: "Vandana Enterprises", nature: "Housekeeping", invoiceNo: "282", invoiceDate: "01/04/2020", pmtVoucherDate: "04/08/2020", docAmt: 13255, relevantAmt: 13255, year: 2020, month: "Mar" },
    { id: 88, basis: "Self", vendor: "Vandana Enterprises", nature: "Housekeeping", invoiceNo: "317", invoiceDate: "01/08/2020", pmtVoucherDate: "17/09/2020", docAmt: 21538, relevantAmt: 21538, year: 2020, month: "Jul" },
    { id: 89, basis: "Self", vendor: "Vandana Enterprises", nature: "Housekeeping", invoiceNo: "324", invoiceDate: "03/09/2020", pmtVoucherDate: "08/10/2020", docAmt: 19280, relevantAmt: 19280, year: 2020, month: "Aug" },
    { id: 90, basis: "Self", vendor: "Vandana Enterprises", nature: "Housekeeping", invoiceNo: "340", invoiceDate: "01/10/2020", pmtVoucherDate: "17/10/2020", docAmt: 18750, relevantAmt: 18750, year: 2020, month: "Sep" },
    { id: 91, basis: "Self", vendor: "Vandana Enterprises", nature: "Housekeeping", invoiceNo: "309", invoiceDate: "04/11/2020", pmtVoucherDate: "11/11/2020", docAmt: 20244, relevantAmt: 20244, year: 2020, month: "Oct" },
    { id: 92, basis: "Self", vendor: "Vandana Enterprises", nature: "Housekeeping", invoiceNo: "321", invoiceDate: "03/12/2020", pmtVoucherDate: "01/03/2021", docAmt: 19000, relevantAmt: 19000, year: 2020, month: "Nov" },
    { id: 93, basis: "Self", vendor: "Vandana Enterprises", nature: "Housekeeping", invoiceNo: "347", invoiceDate: "03/02/2021", pmtVoucherDate: "01/03/2021", docAmt: 21054, relevantAmt: 21054, year: 2021, month: "Jan" },
    { id: 94, basis: "Self", vendor: "Vandana Enterprises", nature: "Housekeeping", invoiceNo: "363", invoiceDate: "02/03/2021", pmtVoucherDate: "19/03/2021", docAmt: 21360, relevantAmt: 21360, year: 2021, month: "Feb" },
    { id: 95, basis: "Self", vendor: "Vandana Enterprises", nature: "Housekeeping", invoiceNo: "362", invoiceDate: "05/01/2021", pmtVoucherDate: "19/03/2021", docAmt: 21208, relevantAmt: 21208, year: 2020, month: "Dec" },
    { id: 96, basis: "Self", vendor: "Vandana Enterprises", nature: "Housekeeping", invoiceNo: "383", invoiceDate: "12/04/2021", pmtVoucherDate: "28/04/2021", docAmt: 19521, relevantAmt: 19521, year: 2021, month: "Mar" },
    { id: 97, basis: "Self", vendor: "Vandana Enterprises", nature: "Housekeeping", invoiceNo: "393", invoiceDate: "05/05/2021", pmtVoucherDate: "25/05/2021", docAmt: 20250, relevantAmt: 20250, year: 2021, month: "Apr" },
    { id: 98, basis: "Self", vendor: "Vandana Enterprises", nature: "Housekeeping", invoiceNo: "408", invoiceDate: "02/06/2021", pmtVoucherDate: "10/06/2021", docAmt: 21202, relevantAmt: 21202, year: 2021, month: "May" },
    { id: 99, basis: "Self", vendor: "Vandana Enterprises", nature: "Housekeeping", invoiceNo: "416", invoiceDate: "02/07/2021", pmtVoucherDate: "NA", docAmt: 20750, relevantAmt: 20750, year: 2021, month: "Jun" },
    { id: 100, basis: "Self", vendor: "Vandana Enterprises", nature: "Housekeeping", invoiceNo: "433", invoiceDate: "03/08/2021", pmtVoucherDate: "12/08/2021", docAmt: 22264, relevantAmt: 22264, year: 2021, month: "Jul" },
    { id: 101, basis: "Self", vendor: "Vandana Enterprises", nature: "Housekeeping", invoiceNo: "438", invoiceDate: "02/09/2021", pmtVoucherDate: "16/09/2021", docAmt: 21054, relevantAmt: 21054, year: 2021, month: "Aug" },
    { id: 102, basis: "Self", vendor: "Schindler", nature: "Lift", invoiceNo: "-", invoiceDate: "-", pmtVoucherDate: "24/12/2019", docAmt: 115640, relevantAmt: 115640, year: 2020, month: "Dec'19 - Dec'20" },
    { id: 103, basis: "Allocation AB", vendor: "Sadguru Krupa Electricals", nature: "Motor repair", invoiceNo: "441", invoiceDate: "24/01/2020", pmtVoucherDate: "27/01/2020", docAmt: 4600, relevantAmt: 2187, year: 2020, month: "NA" },
    { id: 104, basis: "Allocation AB", vendor: "My Gate", nature: "My Gate", invoiceNo: "3474", invoiceDate: "09/11/2019", pmtVoucherDate: "27/02/2020", docAmt: 2950, relevantAmt: 1402, year: 2020, month: "NA" },
    { id: 105, basis: "Self", vendor: "Sunil Kamble", nature: "Plumbing maintenace", invoiceNo: "17", invoiceDate: "17/11/2019", pmtVoucherDate: "18/12/2019", docAmt: 6000, relevantAmt: 6000, year: 2019, month: "Oct" },
    { id: 106, basis: "Self", vendor: "Sunil Kamble", nature: "Plumbing maintenace", invoiceNo: "1", invoiceDate: "16/01/2020", pmtVoucherDate: "27/01/2020", docAmt: 6000, relevantAmt: 6000, year: 2019, month: "Dec" },
    { id: 107, basis: "Self", vendor: "Sunil Kamble", nature: "Plumbing maintenace", invoiceNo: "2", invoiceDate: "16/02/2020", pmtVoucherDate: "27/02/2020", docAmt: 6000, relevantAmt: 6000, year: 2020, month: "Jan" },
    { id: 108, basis: "Self", vendor: "Sunil Kamble", nature: "Plumbing maintenace", invoiceNo: "3", invoiceDate: "16/03/2020", pmtVoucherDate: "31/03/2020", docAmt: 6000, relevantAmt: 6000, year: 2020, month: "Feb" },

    // Page 12 (Items 109 - 144)
    { id: 109, basis: "Self", vendor: "Sunil Kamble", nature: "Plumbing maintenace", invoiceNo: "4", invoiceDate: "16/03/2020", pmtVoucherDate: "31/03/2020", docAmt: 6000, relevantAmt: 6000, year: 2020, month: "Feb" },
    { id: 110, basis: "Self", vendor: "Sunil Kamble", nature: "Plumbing maintenace", invoiceNo: "3", invoiceDate: "16/07/2020", pmtVoucherDate: "17/08/2020", docAmt: 6000, relevantAmt: 6000, year: 2020, month: "Jun" },
    { id: 111, basis: "Self", vendor: "Sunil Kamble", nature: "Plumbing maintenace", invoiceNo: "1", invoiceDate: "16/06/2020", pmtVoucherDate: "17/08/2020", docAmt: 6000, relevantAmt: 6000, year: 2020, month: "May" },
    { id: 112, basis: "Self", vendor: "Sunil Kamble", nature: "Plumbing maintenace", invoiceNo: "6", invoiceDate: "16/08/2020", pmtVoucherDate: "17/09/2020", docAmt: 6000, relevantAmt: 6000, year: 2020, month: "Jul" },
    { id: 113, basis: "Self", vendor: "Sunil Kamble", nature: "Plumbing maintenace", invoiceNo: "7", invoiceDate: "16/09/2020", pmtVoucherDate: "27/10/2020", docAmt: 6000, relevantAmt: 6000, year: 2020, month: "Aug" },
    { id: 114, basis: "Self", vendor: "Sunil Kamble", nature: "Plumbing maintenace", invoiceNo: "9", invoiceDate: "16/10/2020", pmtVoucherDate: "09/11/2020", docAmt: 6000, relevantAmt: 6000, year: 2020, month: "Sep" },
    { id: 115, basis: "Self", vendor: "Sunil Kamble", nature: "Plumbing maintenace", invoiceNo: "11", invoiceDate: "16/11/2020", pmtVoucherDate: "08/01/2021", docAmt: 6000, relevantAmt: 6000, year: 2020, month: "Oct" },
    { id: 116, basis: "Self", vendor: "Sunil Kamble", nature: "Plumbing maintenace", invoiceNo: "13", invoiceDate: "16/12/2020", pmtVoucherDate: "08/01/2021", docAmt: 8000, relevantAmt: 8000, year: 2020, month: "Nov" },
    { id: 117, basis: "Self", vendor: "Sunil Kamble", nature: "Plumbing maintenace", invoiceNo: "17", invoiceDate: "16/02/2021", pmtVoucherDate: "01/03/2021", docAmt: 6000, relevantAmt: 6000, year: 2021, month: "Jan" },
    { id: 118, basis: "Self", vendor: "Sunil Kamble", nature: "Plumbing maintenace", invoiceNo: "15", invoiceDate: "16/01/2021", pmtVoucherDate: "01/03/2021", docAmt: 6000, relevantAmt: 6000, year: 2020, month: "Dec" },
    { id: 119, basis: "Self", vendor: "Sunil Kamble", nature: "Plumbing maintenace", invoiceNo: "17", invoiceDate: "16/03/2021", pmtVoucherDate: "25/05/2021", docAmt: 6000, relevantAmt: 6000, year: 2021, month: "Feb" },
    { id: 120, basis: "Self", vendor: "Sunil Kamble", nature: "Plumbing maintenace", invoiceNo: "19", invoiceDate: "16/04/2021", pmtVoucherDate: "25/05/2021", docAmt: 5000, relevantAmt: 5000, year: 2021, month: "Mar" },
    { id: 121, basis: "Self", vendor: "Sunil Kamble", nature: "Plumbing maintenace", invoiceNo: "22", invoiceDate: "28/06/2021", pmtVoucherDate: "28/06/2021", docAmt: 12000, relevantAmt: 12000, year: 2021, month: "Apr and May" },
    { id: 122, basis: "Self", vendor: "Sunil Kamble", nature: "Plumbing maintenace", invoiceNo: "23", invoiceDate: "16/09/2021", pmtVoucherDate: "NA", docAmt: 18000, relevantAmt: 18000, year: 2021, month: "Jun - Aug" },
    { id: 123, basis: "Allocation ABC", vendor: "PMC", nature: "Property tax", invoiceNo: "-", invoiceDate: "07/09/2021", pmtVoucherDate: "20/10/2021", docAmt: 26953, relevantAmt: 6902, year: 2021, month: "NA" },
    { id: 124, basis: "Allocation ABC", vendor: "PMC", nature: "Property tax", invoiceNo: "-", invoiceDate: "07/09/2021", pmtVoucherDate: "20/10/2021", docAmt: null, relevantAmt: 3451, year: 2022, month: "NA" },
    { id: 125, basis: "Self", vendor: "Surya Security Services", nature: "Security", invoiceNo: "502", invoiceDate: "31/10/2019", pmtVoucherDate: "02/12/2019", docAmt: 38000, relevantAmt: 38000, year: 2019, month: "Oct" },
    { id: 126, basis: "Self", vendor: "Surya Security Services", nature: "Security", invoiceNo: "512", invoiceDate: "30/11/2019", pmtVoucherDate: "02/12/2019", docAmt: 38000, relevantAmt: 38000, year: 2019, month: "Nov" },
    { id: 127, basis: "Self", vendor: "Surya Security Services", nature: "Security", invoiceNo: "523", invoiceDate: "31/12/2019", pmtVoucherDate: "10/01/2020", docAmt: 38000, relevantAmt: 38000, year: 2019, month: "Dec" },
    { id: 128, basis: "Self", vendor: "Surya Security Services", nature: "Security", invoiceNo: "531", invoiceDate: "31/01/2020", pmtVoucherDate: "27/02/2020", docAmt: 38000, relevantAmt: 38000, year: 2020, month: "Jan" },
    { id: 129, basis: "Self", vendor: "Marshal Force Security Services", nature: "Security", invoiceNo: "541", invoiceDate: "29/02/2020", pmtVoucherDate: "NA", docAmt: 38000, relevantAmt: 38000, year: 2020, month: "Feb" },
    { id: 130, basis: "Self", vendor: "Marshal Force Security Services", nature: "Security", invoiceNo: "662", invoiceDate: "31/03/2020", pmtVoucherDate: "NA", docAmt: 38000, relevantAmt: 38000, year: 2020, month: "Mar" },
    { id: 131, basis: "Self", vendor: "Marshal Force Security Services", nature: "Security", invoiceNo: "680", invoiceDate: "01/05/2020", pmtVoucherDate: "29/05/2020", docAmt: 38000, relevantAmt: 38000, year: 2020, month: "Apr" },
    { id: 132, basis: "Self", vendor: "Marshal Force Security Services", nature: "Security", invoiceNo: "699", invoiceDate: "01/06/2020", pmtVoucherDate: "26/06/2020", docAmt: 38000, relevantAmt: 38000, year: 2020, month: "May" },
    { id: 133, basis: "Self", vendor: "Marshal Force Security Services", nature: "Security", invoiceNo: "715", invoiceDate: "01/07/2020", pmtVoucherDate: "04/08/2020", docAmt: 38000, relevantAmt: 38000, year: 2020, month: "Jun" },
    { id: 134, basis: "Self", vendor: "Marshal Force Security Services", nature: "Security", invoiceNo: "105", invoiceDate: "01/08/2020", pmtVoucherDate: "17/09/2020", docAmt: 38000, relevantAmt: 38000, year: 2020, month: "Jul" },
    { id: 135, basis: "Self", vendor: "Marshal Force Security Services", nature: "Security", invoiceNo: "118", invoiceDate: "01/09/2020", pmtVoucherDate: "17/09/2020", docAmt: 38000, relevantAmt: 38000, year: 2020, month: "Aug" },
    { id: 136, basis: "Self", vendor: "Marshal Force Security Services", nature: "Security", invoiceNo: "148", invoiceDate: "01/11/2020", pmtVoucherDate: "09/11/2020", docAmt: 38000, relevantAmt: 38000, year: 2020, month: "Oct" },
    { id: 137, basis: "Self", vendor: "Marshal Force Security Services", nature: "Security", invoiceNo: "133", invoiceDate: "01/10/2020", pmtVoucherDate: "09/11/2020", docAmt: 38000, relevantAmt: 38000, year: 2020, month: "Sep" },
    { id: 138, basis: "Self", vendor: "Marshal Force Security Services", nature: "Security", invoiceNo: "163", invoiceDate: "01/12/2020", pmtVoucherDate: "15/12/2020", docAmt: 37683, relevantAmt: 37683, year: 2020, month: "Nov" },
    { id: 139, basis: "Self", vendor: "Marshal Force Security Services", nature: "Security", invoiceNo: "180", invoiceDate: "01/01/2021", pmtVoucherDate: "15/01/2021", docAmt: 38000, relevantAmt: 38000, year: 2020, month: "Dec" },
    { id: 140, basis: "Self", vendor: "Marshal Force Security Services", nature: "Security", invoiceNo: "196", invoiceDate: "01/02/2021", pmtVoucherDate: "18/02/2021", docAmt: 38000, relevantAmt: 38000, year: 2021, month: "Jan" },
    { id: 141, basis: "Self", vendor: "Marshal Force Security Services", nature: "Security", invoiceNo: "215", invoiceDate: "01/03/2021", pmtVoucherDate: "19/03/2021", docAmt: 38000, relevantAmt: 38000, year: 2021, month: "Feb" },
    { id: 142, basis: "Self", vendor: "Marshal Force Security Services", nature: "Security", invoiceNo: "234", invoiceDate: "01/04/2021", pmtVoucherDate: "28/04/2021", docAmt: 38000, relevantAmt: 38000, year: 2021, month: "Mar" },
    { id: 143, basis: "Self", vendor: "Marshal Force Security Services", nature: "Security", invoiceNo: "253", invoiceDate: "01/05/2021", pmtVoucherDate: "03/06/2021", docAmt: 38000, relevantAmt: 38000, year: 2021, month: "Apr" },
    { id: 144, basis: "Self", vendor: "Marshal Force Security Services", nature: "Security", invoiceNo: "268", invoiceDate: "-", pmtVoucherDate: "10/06/2021", docAmt: 38000, relevantAmt: 38000, year: 2021, month: "May" },

    // Page 13 (Items 145 - 176)
    { id: 145, basis: "Self", vendor: "Marshal Force Security Services", nature: "Security", invoiceNo: "285", invoiceDate: "01/07/2021", pmtVoucherDate: "NA", docAmt: 38000, relevantAmt: 38000, year: 2021, month: "Jun" },
    { id: 146, basis: "Self", vendor: "Marshal Force Security Services", nature: "Security", invoiceNo: "301", invoiceDate: "01/08/2021", pmtVoucherDate: "NA", docAmt: 38000, relevantAmt: 38000, year: 2021, month: "Jul" },
    { id: 147, basis: "Self", vendor: "Marshal Force Security Services", nature: "Security", invoiceNo: "332", invoiceDate: "01/10/2021", pmtVoucherDate: "14/10/2021", docAmt: 38000, relevantAmt: 38000, year: 2021, month: "Sep" },
    { id: 148, basis: "Self", vendor: "Marshal Force Security Services", nature: "Security", invoiceNo: "316", invoiceDate: "01/09/2021", pmtVoucherDate: "NA", docAmt: 38000, relevantAmt: 38000, year: 2021, month: "Aug" },
    { id: 149, basis: "Allocation AB", vendor: "Gurukrupa Pools & Maintenance Services", nature: "Swimming Pool - Repair", invoiceNo: "39", invoiceDate: "25/02/2020", pmtVoucherDate: "07/03/2020", docAmt: 6000, relevantAmt: 2852, year: 2020, month: "NA" },
    { id: 150, basis: "Allocation AB", vendor: "Gurukrupa Pools & Maintenance Services", nature: "Swimming Pool - Repair", invoiceNo: "215", invoiceDate: "11/02/2021", pmtVoucherDate: "01/03/2021", docAmt: 18000, relevantAmt: 8557, year: 2021, month: "NA" },
    { id: 151, basis: "Allocation AB", vendor: "Gurukrupa Pools & Maintenance Services", nature: "Swimming Pool - Repair", invoiceNo: "218", invoiceDate: "17/02/2021", pmtVoucherDate: "28/04/2021", docAmt: 2500, relevantAmt: 1189, year: 2021, month: "NA" },
    { id: 152, basis: "Allocation AB", vendor: "Gurukrupa Pools & Maintenance Services", nature: "Swimming Pool maintenance", invoiceNo: "82", invoiceDate: "31/10/2019", pmtVoucherDate: "19/11/2019", docAmt: 3500, relevantAmt: 1664, year: 2019, month: "Oct" },
    { id: 153, basis: "Allocation AB", vendor: "Gurukrupa Pools & Maintenance Services", nature: "Swimming Pool maintenance", invoiceNo: "21", invoiceDate: "01/12/2019", pmtVoucherDate: "02/12/2019", docAmt: 4578, relevantAmt: 2176, year: 2019, month: "Nov" },
    { id: 154, basis: "Allocation AB", vendor: "Gurukrupa Pools & Maintenance Services", nature: "Swimming Pool maintenance", invoiceNo: "95", invoiceDate: "01/01/2020", pmtVoucherDate: "10/01/2020", docAmt: 7000, relevantAmt: 3328, year: 2019, month: "Dec" },
    { id: 155, basis: "Allocation AB", vendor: "Gurukrupa Pools & Maintenance Services", nature: "Swimming Pool maintenance", invoiceNo: "102", invoiceDate: "01/02/2020", pmtVoucherDate: "27/02/2020", docAmt: 7000, relevantAmt: 3328, year: 2020, month: "Jan" },
    { id: 156, basis: "Allocation AB", vendor: "Gurukrupa Pools & Maintenance Services", nature: "Swimming Pool maintenance", invoiceNo: "112", invoiceDate: "01/03/2020", pmtVoucherDate: "19/05/2020", docAmt: 5310, relevantAmt: 2524, year: 2020, month: "Feb" },
    { id: 157, basis: "Allocation AB", vendor: "Gurukrupa Pools & Maintenance Services", nature: "Swimming Pool maintenance", invoiceNo: "122", invoiceDate: "01/04/2020", pmtVoucherDate: "29/05/2020", docAmt: 7000, relevantAmt: 3328, year: 2020, month: "Mar" },
    { id: 158, basis: "Allocation AB", vendor: "Gurukrupa Pools & Maintenance Services", nature: "Swimming Pool maintenance", invoiceNo: "222", invoiceDate: "01/03/2021", pmtVoucherDate: "19/03/2021", docAmt: 3500, relevantAmt: 1664, year: 2021, month: "Feb" },
    { id: 159, basis: "Allocation AB", vendor: "Gurukrupa Pools & Maintenance Services", nature: "Swimming Pool maintenance", invoiceNo: "257", invoiceDate: "01/04/2021", pmtVoucherDate: "28/04/2021", docAmt: 8000, relevantAmt: 3803, year: 2021, month: "Mar" },
    { id: 160, basis: "Allocation AB", vendor: "Gurukrupa Pools & Maintenance Services", nature: "Swimming Pool maintenance", invoiceNo: "272", invoiceDate: "02/05/2021", pmtVoucherDate: "25/05/2021", docAmt: 8000, relevantAmt: 3803, year: 2021, month: "Apr" },
    { id: 161, basis: "Allocation AB", vendor: "Gurukrupa Pools & Maintenance Services", nature: "Swimming Pool maintenance", invoiceNo: "275", invoiceDate: "31/05/2021", pmtVoucherDate: "10/06/2021", docAmt: 8000, relevantAmt: 3803, year: 2021, month: "May" },
    { id: 162, basis: "Self", vendor: "Shri Swami Samarth Water Suppliers", nature: "Water supply", invoiceNo: "396", invoiceDate: "19/09/2020", pmtVoucherDate: "27/10/2020", docAmt: 400, relevantAmt: 400, year: 2020, month: "Jun" },
    { id: 163, basis: "Self", vendor: "Shri Swami Samarth Water Suppliers", nature: "Water supply", invoiceNo: "389", invoiceDate: "17/09/2020", pmtVoucherDate: "27/10/2020", docAmt: 800, relevantAmt: 800, year: 2020, month: "May" },
    { id: 164, basis: "Self", vendor: "Shri Swami Samarth Water Suppliers", nature: "Water supply", invoiceNo: "336", invoiceDate: "11/02/2020", pmtVoucherDate: "27/10/2020", docAmt: 400, relevantAmt: 400, year: 2020, month: "Jan" },
    { id: 165, basis: "Allocation AB", vendor: "Shri Swami Samarth Water Suppliers", nature: "Water supply", invoiceNo: "390", invoiceDate: "17/09/2020", pmtVoucherDate: "27/10/2020", docAmt: 800, relevantAmt: 380, year: 2020, month: "Jun" },
    { id: 166, basis: "Allocation AB", vendor: "Shri Swami Samarth Water Suppliers", nature: "Water supply", invoiceNo: "388", invoiceDate: "17/09/2020", pmtVoucherDate: "27/10/2020", docAmt: 6000, relevantAmt: 2852, year: 2020, month: "May" },
    { id: 167, basis: "Allocation AB", vendor: "Shri Swami Samarth Water Suppliers", nature: "Water supply", invoiceNo: "277", invoiceDate: "07/08/2020", pmtVoucherDate: "27/10/2020", docAmt: 11600, relevantAmt: 2206, year: 2020, month: "Jul" },
    { id: 168, basis: "Self", vendor: "Shri Swami Samarth Water Suppliers", nature: "Water supply", invoiceNo: "425", invoiceDate: "01/02/2021", pmtVoucherDate: "19/03/2021", docAmt: 1200, relevantAmt: 1200, year: 2020, month: "Dec" },
    { id: 169, basis: "Self", vendor: "Shri Swami Samarth Water Suppliers", nature: "Water supply", invoiceNo: "424", invoiceDate: "01/02/2021", pmtVoucherDate: "19/03/2021", docAmt: 400, relevantAmt: 400, year: 2020, month: "Sep" },
    { id: 170, basis: "Self", vendor: "Shri Swami Samarth Water Suppliers", nature: "Water supply", invoiceNo: "426", invoiceDate: "01/02/2021", pmtVoucherDate: "19/03/2021", docAmt: 6000, relevantAmt: 6000, year: 2021, month: "Jan" },
    { id: 171, basis: "Self", vendor: "Shri Swami Samarth Water Suppliers", nature: "Water supply", invoiceNo: "477", invoiceDate: "04/07/2021", pmtVoucherDate: "NA", docAmt: 3600, relevantAmt: 3600, year: 2021, month: "Feb" },
    { id: 172, basis: "Self", vendor: "Shri Swami Samarth Water Suppliers", nature: "Water supply", invoiceNo: "481", invoiceDate: "05/07/2021", pmtVoucherDate: "NA", docAmt: 2400, relevantAmt: 2400, year: 2021, month: "Mar" },
    { id: 173, basis: "Self", vendor: "Shri Swami Samarth Water Suppliers", nature: "Water supply", invoiceNo: "489", invoiceDate: "05/07/2021", pmtVoucherDate: "NA", docAmt: 800, relevantAmt: 800, year: 2021, month: "May" },
    { id: 174, basis: "Self", vendor: "Shri Swami Samarth Water Suppliers", nature: "Water supply", invoiceNo: "485", invoiceDate: "05/07/2021", pmtVoucherDate: "12/08/2021", docAmt: 1600, relevantAmt: 1600, year: 2021, month: "Apr" },
    { id: 175, basis: "Allocation AB", vendor: "Shri Swami Samarth Water Suppliers", nature: "Water supply", invoiceNo: "477, 481, 489, 490", invoiceDate: "-", pmtVoucherDate: "12/08/2021", docAmt: null, relevantAmt: 3613, year: 2021, month: "NA" },
    { id: 176, basis: "Self", vendor: "Tank Clean", nature: "Water tank cleaning", invoiceNo: "397", invoiceDate: "11/08/2021", pmtVoucherDate: "18/09/2021", docAmt: 5074, relevantAmt: 5074, year: 2021, month: "NA" }
  ],

  // 9. Annexure 4: List of Missing Invoices (23 items, totaling ₹4,09,211)
  missingInvoices: {
    total: 409211,
    subtotalBldgBFound: 173458,
    subtotalRecurringEstimated: 235753,

    // I) Invoices not found while vouching Building A records but were found during vouching of Building B records
    bldgBFound: [
      { id: 'm-1', vendor: "BPCL E CMS", nature: "Diesel exp", invoiceDate: "-", pmtVoucherDate: "05/10/2021", docAmt: 40000, allocatedAmt: 15364, estimatedAmt: null, year: 2021, month: "-" },
      { id: 'm-2', vendor: "Swach Plus Sahakari Sanstha Maryadit", nature: "Garbage cleaning", invoiceDate: "-", pmtVoucherDate: "17/09/2021", docAmt: 3600, allocatedAmt: 3600, estimatedAmt: null, year: 2020, month: "Sep" },
      { id: 'm-3', vendor: "Naushad Ali", nature: "Garden maintenance", invoiceDate: "-", pmtVoucherDate: "Various", docAmt: 43500, allocatedAmt: 16709, estimatedAmt: null, year: 2021, month: "Apr to Sep" },
      { id: 'm-4', vendor: "Schindler India Pvt. Ltd.", nature: "Lift", invoiceDate: "08/01/2021", pmtVoucherDate: "03/06/2021", docAmt: 123736, allocatedAmt: 123736, estimatedAmt: null, year: 2021, month: "Jan to Dec" },
      { id: 'm-5', vendor: "Gurukrupa Pools Maintenance & Services", nature: "Swimming Pool - Repair", invoiceDate: "19/10/2021", pmtVoucherDate: "30/10/2021", docAmt: 7910, allocatedAmt: 3038, estimatedAmt: null, year: 2021, month: "-" },
      { id: 'm-6', vendor: "Gurukrupa Pools Maintenance & Services", nature: "Swimming Pool maintenance", invoiceDate: "Various", pmtVoucherDate: "Various", docAmt: 28667, allocatedAmt: 11011, estimatedAmt: null, year: 2021, month: "Jun to Dec" }
    ],

    // II) Items for which invoices were not found assuming to be missing by exercising rationale that periodic services are recurring in nature
    recurringEstimated: [
      { id: 'm-7', vendor: "MSEDCL", nature: "Electricity - Club House", estimatedAmt: 5000, year: 2020, month: "Mar, Apr, Jul, Oct, Nov, Dec" },
      { id: 'm-8', vendor: "MSEDCL", nature: "Electricity - Club House", estimatedAmt: 5000, year: 2021, month: "Jan to Aug" },
      { id: 'm-9', vendor: "Naushad Ali", nature: "Garden maintenance", estimatedAmt: 2852, year: 2020, month: "Aug" },
      { id: 'm-10', vendor: "Vandana Enterprise", nature: "Housekeeping", estimatedAmt: 19000, year: 2021, month: "Sep" },
      { id: 'm-11', vendor: "Sunil Kamble", nature: "Plumbing maintenace", estimatedAmt: 6000, year: 2019, month: "Nov" },
      { id: 'm-12', vendor: "Sunil Kamble", nature: "Plumbing maintenace", estimatedAmt: 12000, year: 2020, month: "Mar, Apr" },
      { id: 'm-13', vendor: "Sunil Kamble", nature: "Plumbing maintenace", estimatedAmt: 6000, year: 2021, month: "Sep" },
      { id: 'm-14', vendor: "Gurukrupa Pools Maintenance & Services", nature: "Swimming Pool maintenance", estimatedAmt: 3803, year: 2021, month: "Jan" },
      { id: 'm-15', vendor: "Rohit Dhage & Associates", nature: "Audit", estimatedAmt: 19200, year: 2019, month: "FY 19-20" },
      { id: 'm-16', vendor: "MSEDCL", nature: "Electricity bill - STP and Fire Pump", estimatedAmt: 15000, year: 2019, month: "Oct to Dec" },
      { id: 'm-17', vendor: "MSEDCL", nature: "Electricity bill - STP and Fire Pump", estimatedAmt: 60000, year: 2020, month: "Jan to Dec" },
      { id: 'm-18', vendor: "MSEDCL", nature: "Electricity bill - STP and Fire Pump", estimatedAmt: 20000, year: 2021, month: "Jan to Apr" },
      { id: 'm-19', vendor: "Swach Plus Sahakari Sanstha Maryadit", nature: "Garbage cleaning", estimatedAmt: 2398, year: 2019, month: "Oct" },
      { id: 'm-20', vendor: "Gurukrupa Pools & Maintenance Services", nature: "Swimming Pool maintenance", estimatedAmt: 27000, year: 2020, month: "Apr to Dec" },
      { id: 'm-21', vendor: "Shri Swami Samarth Water Suppliers", nature: "Water supply", estimatedAmt: 7500, year: 2019, month: "Oct to Dec" },
      { id: 'm-22', vendor: "Shri Swami Samarth Water Suppliers", nature: "Water supply", estimatedAmt: 15000, year: 2020, month: "Feb, Mar, Apr, Aug, Oct, Nov" },
      { id: 'm-23', vendor: "Shri Swami Samarth Water Suppliers", nature: "Water supply", estimatedAmt: 10000, year: 2021, month: "Jun to Sep" }
    ]
  }
};
