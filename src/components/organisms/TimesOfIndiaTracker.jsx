import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { db, ensureFirebaseSession, isFirebaseConfigured } from '../../firebase.js';
import './TimesOfIndiaTracker.css';


const fmt = (v) => Number(v).toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });
const formatValue = (v) => Number(v || 0).toLocaleString('en-IN');

function formatDisplayDate(isoDate) {
  if (!isoDate) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) {
    const [y, m, d] = isoDate.split('-').map(Number);
    return new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(y, m - 1, d));
  }
  return isoDate;
}

// ─── TOI Bill Template ────────────────────────────────────────────────────────
// Oct 2021 – Jun 2025 : ₹2,200 / year  (45 months)
// Jul 2025 – Mar 2027 : ₹3,000 / year  (21 months)
export const BILLS_TEMPLATE = [
  { id: 1, year: 'FY 2021-22',       period: 'Oct 2021 – Mar 2022', months: 6,  rate: 2200, amount: 13200 },
  { id: 2, year: 'FY 2022-23',       period: 'Apr 2022 – Mar 2023', months: 12, rate: 2200, amount: 26400 },
  { id: 3, year: 'FY 2023-24',       period: 'Apr 2023 – Mar 2024', months: 12, rate: 2200, amount: 26400 },
  { id: 4, year: 'FY 2024-25',       period: 'Apr 2024 – Mar 2025', months: 12, rate: 2200, amount: 26400 },
  { id: 5, year: 'FY 2025-26 (I)',   period: 'Apr 2025 – Jun 2025', months: 3,  rate: 2200, amount: 6600  },
  { id: 6, year: 'FY 2025-26 (II)',  period: 'Jul 2025 – Mar 2026', months: 9,  rate: 3000, amount: 27000 },
  { id: 7, year: 'FY 2026-27 (I)',   period: 'Apr 2026 – Sep 2026', months: 6,  rate: 3000, amount: 18000 },
  { id: 8, year: 'FY 2026-27 (II)',  period: 'Oct 2026 – Mar 2027', months: 6,  rate: 3000, amount: 18000 },
];

// ─── Divided Bill Template specifically for Flat A-1002 ─────────────────────────
// FY 2024-25 is split into:
// Part (I)  : Apr 2024 – Sept 2024 (6 months @ ₹2,200 = ₹13,200)
// Part (II) : Oct 2024 – Mar 2025  (6 months @ ₹2,200 = ₹13,200)
export const BILLS_TEMPLATE_1002 = [
  { id: 1,    year: 'FY 2021-22',       period: 'Oct 2021 – Mar 2022', months: 6,  rate: 2200, amount: 13200 },
  { id: 2,    year: 'FY 2022-23',       period: 'Apr 2022 – Mar 2023', months: 12, rate: 2200, amount: 26400 },
  { id: 3,    year: 'FY 2023-24',       period: 'Apr 2023 – Mar 2024', months: 12, rate: 2200, amount: 26400 },
  { id: '4a', year: 'FY 2024-25 (I)',   period: 'Apr 2024 – Sept 2024', months: 6, rate: 2200, amount: 13200 },
  { id: '4b', year: 'FY 2024-25 (II)',  period: 'Oct 2024 – Mar 2025', months: 6,  rate: 2200, amount: 13200 },
  { id: 5,    year: 'FY 2025-26 (I)',   period: 'Apr 2025 – Jun 2025', months: 3,  rate: 2200, amount: 6600  },
  { id: 6,    year: 'FY 2025-26 (II)',  period: 'Jul 2025 – Mar 2026', months: 9,  rate: 3000, amount: 27000 },
  { id: 7,    year: 'FY 2026-27 (I)',   period: 'Apr 2026 – Sep 2026', months: 6,  rate: 3000, amount: 18000 },
  { id: 8,    year: 'FY 2026-27 (II)',  period: 'Oct 2026 – Mar 2027', months: 6,  rate: 3000, amount: 18000 },
];

export const getBillsTemplate = (flatId) => {
  if (flatId === 'A-1002' || flatId === '1002') {
    return BILLS_TEMPLATE_1002;
  }
  return BILLS_TEMPLATE;
};

const TOTAL_PER_FLAT = BILLS_TEMPLATE.reduce((s, b) => s + b.amount, 0); // ₹1,62,000
const TOTAL_MONTHS   = BILLS_TEMPLATE.reduce((s, b) => s + b.months, 0); // 66 months
const FLAT_IDS = ['A-302', 'A-904', 'A-1002'];

export const makeDefaultFlats = () =>
  FLAT_IDS.map(id => {
    const template = getBillsTemplate(id);
    return {
      id, flatNo: id,
      bills: template.map(b => {
        let status = 'Paid';
        if (id === 'A-1002') {
          // Flat A-1002 has shortfall in Oct 2024 – Mar 2025 and Oct 2026 – Mar 2027 pending
          if (b.id === '4b' || b.id === 8 ||
              (b.period && (b.period.includes('Oct 2024 – Mar 2025') || b.period.includes('Oct 2026 – Mar 2027')))) {
            status = 'Pending';
          }
        }
        return {
          ...b,
          status,
        };
      }),
    };
  });

export const normalizeFlats = (raw) => {
  if (!Array.isArray(raw) || raw.length === 0) {
    return makeDefaultFlats();
  }
  return FLAT_IDS.map(flatId => {
    const existing = raw.find(f => f.id === flatId || f.flatNo === flatId);
    const existingBills = existing?.bills || [];
    const template = getBillsTemplate(flatId);

    const updatedBills = template.map(t => {
      let matched = existingBills.find(b => b.id === t.id);

      // Handle migration of legacy split / merged bills:
      if (t.id === 6) {
        // Jul 2025 – Mar 2026 (was part of 15-mo bill)
        matched = existingBills.find(b => b.id === 6 && (b.months === 9 || b.period?.includes('Mar 2026')));
        if (!matched) {
          const old15 = existingBills.find(b => b.id === 6 || b.period?.includes('Jul 2025'));
          if (old15) {
            return { ...t, status: old15.status };
          }
          return { ...t, status: 'Paid' };
        }
      }

      if (t.id === 7) {
        // Apr 2026 – Sep 2026 (was part of 15-mo bill, paid on 23-06-2026)
        matched = existingBills.find(b => b.id === 7 || (b.period && b.period.includes('Apr 2026 – Sep 2026')));
        if (!matched) {
          const old15 = existingBills.find(b => b.id === 6 || b.period?.includes('Jul 2025'));
          if (old15) {
            return { ...t, status: old15.status };
          }
          return { ...t, status: 'Paid' };
        }
      }

      if (t.id === 8) {
        // Oct 2026 – Mar 2027
        matched = existingBills.find(b => b.id === 8 || (b.period && b.period.includes('Oct 2026 – Mar 2027')));
        if (!matched) {
          // For 302 and 904, payment received on 23-10-2026 -> Paid. For 1002 -> Pending.
          const defaultStatus = (flatId === 'A-302' || flatId === 'A-904') ? 'Paid' : 'Pending';
          return { ...t, status: defaultStatus };
        }
      }

      // Flat A-1002: Resolve split bills for FY 2024-25
      if (flatId === 'A-1002' || flatId === '1002') {
        if (!matched && (t.id === '4a' || (t.period && t.period.includes('Apr 2024 – Sept 2024')))) {
          matched = existingBills.find(b =>
            b.id === '4a' || b.id === '4-1' || b.id === '4_1' || b.id === 41 ||
            (b.period && b.period.includes('Apr 2024 – Sept 2024')) ||
            (b.year && (b.year.includes('2024-25(I)') || b.year.includes('2024-25 (I)')))
          );
          if (!matched) {
            return { ...t, status: 'Paid' };
          }
        }

        if (!matched && (t.id === '4b' || (t.period && t.period.includes('Oct 2024 – Mar 2025')))) {
          matched = existingBills.find(b =>
            b.id === '4b' || b.id === '4-2' || b.id === '4_2' || b.id === 42 ||
            (b.period && b.period.includes('Oct 2024 – Mar 2025')) ||
            (b.year && (b.year.includes('2024-25(II)') || b.year.includes('2024-25 (II)') || b.year.includes('2024-25(||)')))
          );
          if (!matched) {
            return { ...t, status: 'Pending' };
          }
        }
      }

      return {
        ...t,
        status: matched ? matched.status : (flatId === 'A-1002' ? 'Pending' : 'Paid')
      };
    });

    return {
      id: flatId,
      flatNo: flatId,
      bills: updatedBills
    };
  });
};

function calculateMonthsBetween(startMonthStr, endMonthStr) {
  if (!startMonthStr || !endMonthStr) return 0;
  const [y1, m1] = startMonthStr.split('-').map(Number);
  const [y2, m2] = endMonthStr.split('-').map(Number);
  if (isNaN(y1) || isNaN(m1) || isNaN(y2) || isNaN(m2)) return 0;
  const count = (y2 - y1) * 12 + (m2 - m1) + 1;
  return count > 0 ? count : 0;
}

function formatMonthYearLabel(monthStr) {
  if (!monthStr) return '';
  const [y, m] = monthStr.split('-').map(Number);
  if (isNaN(y) || isNaN(m)) return monthStr;
  const date = new Date(y, m - 1, 1);
  return date.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
}

function calculateToiForRange(startMonthStr, endMonthStr) {
  if (!startMonthStr || !endMonthStr) return { total: 0, phase1Months: 0, phase2Months: 0, totalMonths: 0 };
  const [y1, m1] = startMonthStr.split('-').map(Number);
  const [y2, m2] = endMonthStr.split('-').map(Number);
  if (isNaN(y1) || isNaN(m1) || isNaN(y2) || isNaN(m2)) return { total: 0, phase1Months: 0, phase2Months: 0, totalMonths: 0 };
  
  let phase1Months = 0;
  let phase2Months = 0;
  
  let curY = y1, curM = m1;
  while (curY < y2 || (curY === y2 && curM <= m2)) {
    if (curY > 2025 || (curY === 2025 && curM >= 7)) {
      phase2Months++;
    } else {
      phase1Months++;
    }
    curM++;
    if (curM > 12) {
      curM = 1;
      curY++;
    }
  }
  
  const phase1Amt = Math.round(phase1Months * (2200 / 12));
  const phase2Amt = Math.round(phase2Months * (3000 / 12));
  return {
    total: phase1Amt + phase2Amt,
    phase1Months,
    phase2Months,
    phase1Amt,
    phase2Amt,
    totalMonths: phase1Months + phase2Months
  };
}

// ─── Style tokens ─────────────────────────────────────────────────────────────
const TH_BASE = {
  padding: '11px 16px',
  borderBottom: '2px solid rgba(61,63,52,0.1)',
  color: '#5f665f', fontWeight: 700,
  fontSize: '0.66rem', textTransform: 'uppercase',
  letterSpacing: '0.07em', whiteSpace: 'nowrap',
  background: 'rgba(244,239,231,0.7)',
};
const TD_BASE = { padding: '13px 16px', verticalAlign: 'middle' };

// ─── Sub-components ───────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const ok = status === 'Paid';
  return (
    <span className={`times-of-india-tracker-s1 ${(ok ? 'times-of-india-tracker-cond-1-true' : 'times-of-india-tracker-cond-2-false')}`} style={{ border: `1px solid ${ok ? '#34d399' : '#fbbf24'}` }}>
      {ok ? '✓ Paid' : '⏳ Pending'}
    </span>
  );
}

function StatChip({ label, value, bg, color }) {
  return (
    <div className="times-of-india-tracker-s2" style={{ background: bg }}>
      <div className="times-of-india-tracker-s3" style={{ color }}>{value}</div>
      <div className="times-of-india-tracker-s4">{label}</div>
    </div>
  );
}

// ─── TOI Payment Reconciliation Data (Matching Society Document) ───────────────
export const TOI_RECONCILIATION_DATA = {
  title: 'SOCIETY MAINTENANCE PAYMENT RECONCILIATION – TIME OF INDIA',
  subtitle: 'Flats: 302, 904, 1002 (3 Flats) | Maintenance Start Date: October 2021',
  rates: {
    phase1: '₹2,200 per Month per Flat',
    phase2: '₹3,000 per Month per Flat',
  },
  kpi: {
    rateTillJune2025: '₹2,200 per Month per Flat',
    rateFromJuly2025: '₹3,000 per Month per Flat',
    totalDue: 486000,
    totalDuePeriod: 'Oct 2021 to Mar 2027',
    totalDueBreakdown: '66 Months × 3 Flats (₹1,62,000 per flat)',
    totalPaid: 461100,
    paidBreakdown: '(₹3,43,500 + ₹81,600 + ₹36,000)',
    netOutstanding: 24900,
    historical60Due: 432000,
    historical60Paid: 425100,
    historical60Shortfall: 6900,
  },
  chronologicalTimeline: [
    {
      srNo: 1,
      paymentDate: '18-02-2022',
      paymentMode: 'Red Motive',
      amountPaid: 55200,
      forFlats: '302, 904, 1002, 902 (4 Flats)',
      periodCovered: 'Oct 2021 – Mar 2022 (6 Months)',
      months: 6,
      ratePerFlat: 2200,
      amountFor3Flats: 39600,
      diff: 2400,
      diffLabel: '+2,400',
      remarks: 'Paid for 4 Flats (₹55,200) | Less: Flat 902 share (2,200 × 6) = -₹13,200 | Applicable for 3 Flats = ₹42,000 | Expected for 3 Flats: 2,200 × 3 × 6 = ₹39,600 | Extra Paid = ₹2,400',
      breakup: 'Break-up: 2,200 × 4 Flats × 6 Months = ₹55,200 | Less: Flat 902 share (2,200 × 6) = -₹13,200 | Applicable for 3 Flats = ₹42,000 | Expected for 3 Flats: 2,200 × 3 × 6 = ₹39,600 | Extra Paid = ₹2,400'
    },
    {
      srNo: 2,
      paymentDate: '15-07-2022',
      paymentMode: 'Red Motive',
      amountPaid: 39600,
      forFlats: '302, 904, 1002 (3 Flats)',
      periodCovered: 'Apr 2022 – Sept 2022 (6 Months)',
      months: 6,
      ratePerFlat: 2200,
      amountFor3Flats: 39600,
      diff: 0,
      diffLabel: '0',
      remarks: 'Fully Paid',
      breakup: null
    }
  ],
  sectionASummary: {
    period: 'OCT 2021 – SEPT 2022 (12 MONTHS)',
    expectedFor3Flats: 79200,
    totalPaid: 81600,
    diff: '+ ₹2,400',
    status: 'EXTRA PAID',
    conclusion: 'Conclusion: No missing bill for Oct 2021 – Sept 2022. Total Extra Paid: ₹2,400'
  },
  periodWiseReconciliation: [
    {
      srNo: 1,
      period: 'Oct 2021 – Sept 2022 (12 Months)',
      months: 12,
      rate: '2,200',
      expected: 79200,
      paid: 81600,
      paymentDetails: '18-02-2022 (RM) - 42,000\n15-07-2022 (RM) - 39,600',
      diff: 2400,
      diffLabel: '+2,400',
      status: 'EXTRA PAID'
    },
    {
      srNo: 2,
      period: 'Oct 2022 – Mar 2023 (6 Months)',
      months: 6,
      rate: '2,200',
      expected: 39600,
      paid: 39600,
      paymentDetails: '31-03-2023 (ICICI)',
      diff: 0,
      diffLabel: '0',
      status: 'PAID'
    },
    {
      srNo: 3,
      period: 'Apr 2023 – Mar 2024 (12 Months)',
      months: 12,
      rate: '2,200',
      expected: 79200,
      paid: 82200,
      paymentDetails: '12-04-2023, 18-10-2023, 16-05-2024 (ICICI)',
      diff: 3000,
      diffLabel: '+3,000',
      status: 'EXTRA PAID'
    },
    {
      srNo: 4,
      period: 'Apr 2024 – Sept 2024 (6 Months)',
      months: 6,
      rate: '2,200',
      expected: 39600,
      paid: 39600,
      paymentDetails: '30-08-2024 (ICICI)',
      diff: 0,
      diffLabel: '0',
      status: 'PAID'
    },
    {
      srNo: 5,
      period: 'Oct 2024 – Mar 2025 (6 Months)',
      months: 6,
      rate: '2,200',
      expected: 39600,
      paid: 26400,
      paymentDetails: '28-03-2025 (ICICI)',
      diff: -13200,
      diffLabel: '-13,200',
      status: 'SHORT PAID'
    },
    {
      srNo: 6,
      period: 'Apr 2025 – Sept 2025 (6 Months)',
      months: 6,
      rate: 'Apr–Jun: 2,200\nJul–Sept: 3,000',
      expected: 46800,
      paid: 47700,
      paymentDetails: '08-08-2025 (ICICI)',
      diff: 900,
      diffLabel: '+900',
      status: 'EXTRA PAID'
    },
    {
      srNo: 7,
      period: 'Oct 2025 – Mar 2026 (6 Months)',
      months: 6,
      rate: '3,000',
      expected: 54000,
      paid: 54000,
      paymentDetails: '21-11-2025 & 25-11-2025 (ICICI)',
      diff: 0,
      diffLabel: '0',
      status: 'PAID'
    },
    {
      srNo: 8,
      period: 'Apr 2026 – Sept 2026 (6 Months)',
      months: 6,
      rate: '3,000',
      expected: 54000,
      paid: 54000,
      paymentDetails: '23-06-2026 (HDFC)',
      diff: 0,
      diffLabel: '0',
      status: 'PAID'
    },
    {
      srNo: 9,
      period: 'Oct 2026 – Mar 2027 (6 Months)',
      months: 6,
      rate: '3,000',
      expected: 54000,
      paid: 36000,
      paymentDetails: '23-10-2026 (Flats 302 & 904 paid ₹18,000 each = ₹36,000; Flat 1002 pending)',
      diff: -18000,
      diffLabel: '-18,000',
      status: 'PARTIALLY PAID'
    }
  ],
  aprSep2025Details: {
    title: 'DETAILS: APR 2025 – SEPT 2025 PAYMENT',
    breakup: [
      'Apr – Jun 2025 (3m): 2,200 × 3 × 3 = ₹19,800',
      'Jul – Sept 2025 (3m): 3,000 × 3 × 3 = ₹27,000'
    ],
    totalExpected: 46800,
    paidText: 'Paid on 08-08-2025 (ICICI) = ₹47,700',
    diffText: '₹47,700 - ₹46,800 = ₹900 (Extra Paid)'
  },
  shortfallItems: [
    { period: 'Oct 2024 – Mar 2025 (Short Paid - Flat 1002)', amount: 13200 },
    { period: 'Oct 2026 – Mar 2027 (Pending - Flat 1002)', amount: 18000 }
  ],
  totalShortfall: 31200,
  extraPaidItems: [
    { period: 'Oct 2021 – Sept 2022 (Extra Paid)', amount: 2400 },
    { period: 'Apr 2023 – Mar 2024 (Extra Paid)', amount: 3000 },
    { period: 'Apr 2025 – Sept 2025 (Extra Paid)', amount: 900 }
  ],
  totalExtraPaid: 6300,
  netOutstanding: 24900,
  takeaways: [
    'No missing bill for Oct 2021 – Sept 2022. Extra paid by ₹2,400.',
    'All payments are mapped against corresponding periods.',
    'Apr 2026 – Sept 2026: Payment received on 23-06-2026 in HDFC account (₹54,000).',
    'Oct 2026 – Mar 2027: Payment received on 23-10-2026 for Flat 302 & Flat 904 (₹18,000 each = ₹36,000).',
    'Flat 1002 pending: Oct 2024 – Mar 2025 (₹13,200) + Oct 2026 – Mar 2027 (₹18,000) = ₹31,200 total shortfall. After adjusting ₹6,300 extra payments, Net Outstanding is ₹24,900.'
  ],
  notes: [
    '1. Maintenance includes 3 Flats: 302, 904, 1002 (₹1,62,000 per flat × 3 = ₹4,86,000 for 66 Months)',
    '2. Historical 60 Months (Oct 21 – Sept 26): Due ₹4,32,000 | Paid ₹4,25,100 | Shortfall ₹6,900',
    '3. Current Cycle (Oct 26 – Mar 27): Due ₹54,000 | Paid ₹36,000 | Flat 1002 Pending ₹18,000',
    '4. All amounts are in Indian Rupees (₹)',
    'Extra payments of ₹6,300 have been adjusted against the shortfall of ₹31,200 to arrive at the Net Outstanding Balance of ₹24,900.'
  ]
};

function ToiReconciliationSection({ data, onPrint, onWhatsApp, onCopy, toast, onOpenInvoiceModal }) {
  const d = data;

  const recon60Totals = useMemo(() => {
    const list = (d.periodWiseReconciliation || []).slice(0, 8);
    const months = list.reduce((s, r) => s + (Number(r.months) || 0), 0);
    const expected = list.reduce((s, r) => s + (Number(r.expected) || 0), 0);
    const paid = list.reduce((s, r) => s + (Number(r.paid) || 0), 0);
    const diff = paid - expected;
    return { months, expected, paid, diff };
  }, [d.periodWiseReconciliation]);

  const reconGrandTotals = useMemo(() => {
    const list = d.periodWiseReconciliation || [];
    const months = list.reduce((s, r) => s + (Number(r.months) || 0), 0);
    const expected = list.reduce((s, r) => s + (Number(r.expected) || 0), 0);
    const paid = list.reduce((s, r) => s + (Number(r.paid) || 0), 0);
    const diff = paid - expected;
    return { months, expected, paid, diff };
  }, [d.periodWiseReconciliation]);

  return (
    <div className="times-of-india-tracker-s5">
      
      {/* Toast Notification */}
      {toast && (
        <div className="times-of-india-tracker-s6">
          {toast}
        </div>
      )}

      {/* ── Main Reconciliation Header Card ── */}
      <div className="times-of-india-tracker-s7">
        <div>
          <div className="times-of-india-tracker-s8">
            Official Society Statement
          </div>
          <h2 className="times-of-india-tracker-s9">
            {d.title}
          </h2>
          <p className="times-of-india-tracker-s10">
            {d.subtitle}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="times-of-india-tracker-s11">
          <button
            type="button"
            onClick={onPrint}
            className="times-of-india-tracker-s12"
          >
            🖨️ Print Statement / PDF
          </button>

          <button
            type="button"
            onClick={onWhatsApp}
            className="times-of-india-tracker-s13"
          >
            📱 Share on WhatsApp
          </button>

          <button
            type="button"
            onClick={onCopy}
            className="times-of-india-tracker-s14"
          >
            📋 Copy Summary
          </button>

          <button
            type="button"
            onClick={() => onOpenInvoiceModal && onOpenInvoiceModal()}
            className="times-of-india-tracker-s14"
          >
            🧾 New Invoice
          </button>
        </div>
      </div>

      {/* ── Top 5 KPI Cards ── */}
      <div className="times-of-india-tracker-s15">
        
        {/* Card 1: Rate till June 2025 */}
        <div className="times-of-india-tracker-s16">
          <div className="times-of-india-tracker-s17">
            <span className="times-of-india-tracker-s18">📅</span>
            <span className="times-of-india-tracker-s19">
              Rate till June 2025
            </span>
          </div>
          <div className="times-of-india-tracker-s20">
            ₹2,200 <span className="times-of-india-tracker-s21">/ mo / flat</span>
          </div>
          <div className="times-of-india-tracker-s22">
            Period: Oct 2021 – Jun 2025 (45 mos)
          </div>
        </div>

        {/* Card 2: Rate from July 2025 */}
        <div className="times-of-india-tracker-s16">
          <div className="times-of-india-tracker-s17">
            <span className="times-of-india-tracker-s18">📈</span>
            <span className="times-of-india-tracker-s19">
              Rate from July 2025
            </span>
          </div>
          <div className="times-of-india-tracker-s23">
            ₹3,000 <span className="times-of-india-tracker-s21">/ mo / flat</span>
          </div>
          <div className="times-of-india-tracker-s22">
            Period: Jul 2025 – Mar 2027 (21 mos)
          </div>
        </div>

        {/* Card 3: Total Amount Due */}
        <div className="times-of-india-tracker-s16">
          <div className="times-of-india-tracker-s17">
            <span className="times-of-india-tracker-s18">📑</span>
            <span className="times-of-india-tracker-s19">
              Total Amount Due ({reconGrandTotals.months} Mos)
            </span>
          </div>
          <div className="times-of-india-tracker-s24">
            ₹{reconGrandTotals.expected.toLocaleString('en-IN')}
          </div>
          <div className="times-of-india-tracker-s22">
            {reconGrandTotals.months} Mos × 3 Flats • 60-Mo: ₹4,32,000
          </div>
        </div>

        {/* Card 4: Total Amount Paid */}
        <div className="times-of-india-tracker-s25">
          <div className="times-of-india-tracker-s17">
            <span className="times-of-india-tracker-s18">💵</span>
            <span className="times-of-india-tracker-s26">
              Total Amount Paid (Till Date)
            </span>
          </div>
          <div className="times-of-india-tracker-s27">
            ₹{reconGrandTotals.paid.toLocaleString('en-IN')}
          </div>
          <div className="times-of-india-tracker-s28">
            (₹3,43,500 + ₹81,600 + ₹36,000) • 60-Mo: ₹4,25,100
          </div>
        </div>

        {/* Card 5: Net Outstanding Balance */}
        <div className="times-of-india-tracker-s29">
          <div className="times-of-india-tracker-s17">
            <span className="times-of-india-tracker-s18">⚠️</span>
            <span className="times-of-india-tracker-s30">
              NET OUTSTANDING BALANCE
            </span>
          </div>
          <div className="times-of-india-tracker-s31">
            ₹{Math.abs(reconGrandTotals.diff).toLocaleString('en-IN')}
          </div>
          <div className="times-of-india-tracker-s32">
            Flat 1002 Arrears: ₹31,200 − ₹6,300 extra • 60-Mo: ₹6,900
          </div>
        </div>

      </div>

      {/* ── SECTION A: Chronological Payment Timeline ── */}
      <div className="times-of-india-tracker-s33">
        <div className="times-of-india-tracker-s34">
          <span>A. CHRONOLOGICAL PAYMENT TIMELINE (All Payments Received)</span>
        </div>

        <div className="times-of-india-tracker-s35">
          <table className="times-of-india-tracker-s36">
            <thead>
              <tr className="times-of-india-tracker-s37">
                <th className="times-of-india-tracker-s38">Sr. No.</th>
                <th className="times-of-india-tracker-s39">Payment Date</th>
                <th className="times-of-india-tracker-s40">Payment Mode / Bank</th>
                <th className="times-of-india-tracker-s41">Amount Paid (₹)</th>
                <th className="times-of-india-tracker-s40">For Which Flats</th>
                <th className="times-of-india-tracker-s40">Maintenance Period Covered</th>
                <th className="times-of-india-tracker-s42">No. of Mos</th>
                <th className="times-of-india-tracker-s41">Rate / Flat</th>
                <th className="times-of-india-tracker-s41">Applicable (3 Flats)</th>
                <th className="times-of-india-tracker-s42">Diff (Paid - Exp)</th>
                <th className="times-of-india-tracker-s43">Remarks</th>
              </tr>
            </thead>
            <tbody>
              {d.chronologicalTimeline.map((item, idx) => (
                <React.Fragment key={item.srNo}>
                  <tr className={`times-of-india-tracker-s44 ${(idx % 2 === 0 ? 'times-of-india-tracker-cond-3-true' : 'times-of-india-tracker-cond-4-false')}`}>
                    <td className="times-of-india-tracker-s45">{item.srNo}</td>
                    <td className="times-of-india-tracker-s46">{item.paymentDate}</td>
                    <td className="times-of-india-tracker-s47">{item.paymentMode}</td>
                    <td className="times-of-india-tracker-s48">{Number(item.amountPaid).toLocaleString('en-IN')}</td>
                    <td className="times-of-india-tracker-s49">{item.forFlats}</td>
                    <td className="times-of-india-tracker-s49">{item.periodCovered}</td>
                    <td className="times-of-india-tracker-s50">{item.months}</td>
                    <td className="times-of-india-tracker-s51">{Number(item.ratePerFlat).toLocaleString('en-IN')}</td>
                    <td className="times-of-india-tracker-s52">{Number(item.amountFor3Flats).toLocaleString('en-IN')}</td>
                    <td className="times-of-india-tracker-s53">
                      <span className={`times-of-india-tracker-s54 ${(item.diff > 0 ? 'times-of-india-tracker-cond-5-true' : 'times-of-india-tracker-cond-6-false')}`}>
                        {item.diffLabel}
                      </span>
                    </td>
                    <td className="times-of-india-tracker-s55">
                      {item.remarks}
                    </td>
                  </tr>
                  {item.breakup && (
                    <tr className="times-of-india-tracker-s56">
                      <td colSpan={11} className="times-of-india-tracker-s57">
                        📌 <strong>Detail:</strong> {item.breakup}
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>

        {/* Section A Summary Box */}
        <div className="times-of-india-tracker-s58">
          <div>
            <div className="times-of-india-tracker-s59">Summary Period</div>
            <div className="times-of-india-tracker-s60">{d.sectionASummary.period}</div>
          </div>
          <div>
            <div className="times-of-india-tracker-s61">Total Expected (3 Flats)</div>
            <div className="times-of-india-tracker-s62">₹{Number(d.sectionASummary.expectedFor3Flats).toLocaleString('en-IN')}</div>
          </div>
          <div>
            <div className="times-of-india-tracker-s63">Total Paid</div>
            <div className="times-of-india-tracker-s64">₹{Number(d.sectionASummary.totalPaid).toLocaleString('en-IN')}</div>
          </div>
          <div>
            <div className="times-of-india-tracker-s59">Difference (Paid - Exp)</div>
            <div className="times-of-india-tracker-s64">{d.sectionASummary.diff}</div>
          </div>
          <div>
            <span className="times-of-india-tracker-s65">
              ✓ {d.sectionASummary.status}
            </span>
          </div>
        </div>

        {/* Section A Conclusion Banner */}
        <div className="times-of-india-tracker-s66">
          <span>✓</span>
          <span>{d.sectionASummary.conclusion}</span>
        </div>

      </div>

      {/* ── SECTION B: Period-Wise Reconciliation Statement ── */}
      <div className="times-of-india-tracker-s33">
        <div className="times-of-india-tracker-s34">
          <span>B. PERIOD-WISE RECONCILIATION STATEMENT</span>
        </div>

        <div className="times-of-india-tracker-s67">
          
          {/* Main Reconciliation Table */}
          <div className="times-of-india-tracker-s68">
            <table className="times-of-india-tracker-s36">
              <thead>
                <tr className="times-of-india-tracker-s37">
                  <th className="times-of-india-tracker-s69">Sr. No.</th>
                  <th className="times-of-india-tracker-s70">Period</th>
                  <th className="times-of-india-tracker-s71">Mos</th>
                  <th className="times-of-india-tracker-s72">Rate / Flat</th>
                  <th className="times-of-india-tracker-s73">Expected (3 Flats)</th>
                  <th className="times-of-india-tracker-s73">Amount Paid (₹)</th>
                  <th className="times-of-india-tracker-s70">Payment Date / Bank</th>
                  <th className="times-of-india-tracker-s72">Difference</th>
                  <th className="times-of-india-tracker-s72">Status / Remarks</th>
                </tr>
              </thead>
              <tbody>
                {d.periodWiseReconciliation.map((row, idx) => {
                  const isExtra = row.diff > 0;
                  const isShort = row.diff < 0;
                  return (
                    <tr key={row.srNo} className="times-of-india-tracker-s44" style={{ background: isShort ? '#fef2f2' : (idx % 2 === 0 ? '#fff' : '#f8fafc') }}>
                      <td className="times-of-india-tracker-s74">{row.srNo}</td>
                      <td className="times-of-india-tracker-s75">{row.period}</td>
                      <td className="times-of-india-tracker-s76">{row.months}</td>
                      <td className="times-of-india-tracker-s77">
                        {row.rate}
                      </td>
                      <td className="times-of-india-tracker-s78">
                        ₹{Number(row.expected).toLocaleString('en-IN')}
                      </td>
                      <td className={`times-of-india-tracker-s79 ${(isShort ? 'times-of-india-tracker-cond-7-true' : 'times-of-india-tracker-cond-8-false')}`}>
                        ₹{Number(row.paid).toLocaleString('en-IN')}
                      </td>
                      <td className="times-of-india-tracker-s80">
                        {row.paymentDetails}
                      </td>
                      <td className="times-of-india-tracker-s81">
                        <span className="times-of-india-tracker-s82" style={{ background: isExtra ? '#dcfce7' : (isShort ? '#fee2e2' : '#f1f5f9'), color: isExtra ? '#15803d' : (isShort ? '#b91c1c' : '#475569') }}>
                          {row.diffLabel}
                        </span>
                      </td>
                      <td className="times-of-india-tracker-s81">
                        <span className="times-of-india-tracker-s83" style={{ background: isShort ? '#fee2e2' : (isExtra ? '#dcfce7' : '#e0f2fe'), color: isShort ? '#991b1b' : (isExtra ? '#166534' : '#0369a1') }}>
                          {row.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                {/* Subtotal for Phase 1 & 2 (Oct 2021 – Sept 2026, 60 Months) */}
                <tr className="times-of-india-tracker-s84">
                  <td colSpan={2} className="times-of-india-tracker-s85">
                    Subtotal (Oct 2021 – Sept 2026)
                  </td>
                  <td className="times-of-india-tracker-s86">
                    {recon60Totals.months}
                  </td>
                  <td className="times-of-india-tracker-s87" />
                  <td className="times-of-india-tracker-s88">
                    ₹{recon60Totals.expected.toLocaleString('en-IN')}
                  </td>
                  <td className="times-of-india-tracker-s89">
                    <div>₹{recon60Totals.paid.toLocaleString('en-IN')}</div>
                    <div className="times-of-india-tracker-s90">(3,43,500 + 81,600)</div>
                  </td>
                  <td className="times-of-india-tracker-s91">60 Mos Phase</td>
                  <td className="times-of-india-tracker-s92">
                    -6,900
                  </td>
                  <td className="times-of-india-tracker-s93">
                    60-MO SHORTFALL
                  </td>
                </tr>

                {/* Grand Total (Oct 2021 – Mar 2027, 66 Months) */}
                <tr className="times-of-india-tracker-s94">
                  <td colSpan={2} className="times-of-india-tracker-s95">
                    TOTAL ({reconGrandTotals.months} MONTHS)
                  </td>
                  <td className="times-of-india-tracker-s96">
                    {reconGrandTotals.months}
                  </td>
                  <td className="times-of-india-tracker-s97" />
                  <td className="times-of-india-tracker-s98">
                    ₹{reconGrandTotals.expected.toLocaleString('en-IN')}
                  </td>
                  <td className="times-of-india-tracker-s99">
                    <div>₹{reconGrandTotals.paid.toLocaleString('en-IN')}</div>
                    <div className="times-of-india-tracker-s90">
                      (3,43,500 + 81,600 + 36,000)
                    </div>
                  </td>
                  <td className="times-of-india-tracker-s100">
                    Flats 302 & 904 paid till Mar 2027
                  </td>
                  <td className={`times-of-india-tracker-s101 ${(reconGrandTotals.diff < 0 ? 'times-of-india-tracker-cond-9-true' : 'times-of-india-tracker-cond-10-false')}`}>
                    {reconGrandTotals.diff < 0 ? `-${Math.abs(reconGrandTotals.diff).toLocaleString('en-IN')}` : `+${reconGrandTotals.diff.toLocaleString('en-IN')}`}
                  </td>
                  <td className={`times-of-india-tracker-s102 ${(reconGrandTotals.diff < 0 ? 'times-of-india-tracker-cond-11-true' : 'times-of-india-tracker-cond-12-false')}`}>
                    {reconGrandTotals.diff < 0 ? 'NET SHORTFALL' : 'FULLY SETTLED'}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Right Column: April-Sept 2025 Breakdown Card */}
          <div className="times-of-india-tracker-s103">
            <div className="times-of-india-tracker-s104">
              <div className="times-of-india-tracker-s105">
                {d.aprSep2025Details.title}
              </div>

              <div className="times-of-india-tracker-s106">
                <strong className="times-of-india-tracker-s107">Expected Break-up for 3 Flats:</strong>
                {d.aprSep2025Details.breakup.map((bLine, i) => (
                  <div key={i} className="times-of-india-tracker-s108">
                    • {bLine}
                  </div>
                ))}
                <div className="times-of-india-tracker-s109">
                  Total Expected = ₹{Number(d.aprSep2025Details.totalExpected).toLocaleString('en-IN')}
                </div>
              </div>

              <div className="times-of-india-tracker-s110">
                <div className="times-of-india-tracker-s111">
                  {d.aprSep2025Details.paidText}
                </div>
                <div className="times-of-india-tracker-s112">
                  Difference: {d.aprSep2025Details.diffText}
                </div>
              </div>
            </div>

            {/* Quick Helper / Reminder */}
            <div className="times-of-india-tracker-s113">
              💡 <strong>Reconciliation Rule:</strong><br />
              All extra payments (+₹6,300) are mapped and adjusted against the pending amount of Flat 1002 (Oct 24–Mar 25: ₹13,200), resulting in exactly <strong>₹6,900 net pending</strong>.
            </div>
          </div>

        </div>
      </div>

      {/* ── BOTTOM 4 ANALYSIS CARDS (C, D, E, F) + KEY TAKEAWAYS ── */}
      <div className="times-of-india-tracker-s114">
        
        {/* C. Where They Pay Short */}
        <div className="times-of-india-tracker-s115">
          <div className="times-of-india-tracker-s116">
            C. WHERE THEY PAY SHORT
          </div>
          <div className="times-of-india-tracker-s117">
            <table className="times-of-india-tracker-s118">
              <thead>
                <tr className="times-of-india-tracker-s119">
                  <th className="times-of-india-tracker-s120">Particulars</th>
                  <th className="times-of-india-tracker-s121">Amount (₹)</th>
                </tr>
              </thead>
              <tbody>
                {d.shortfallItems.map((item, idx) => (
                  <tr key={idx} className="times-of-india-tracker-s122">
                    <td className="times-of-india-tracker-s123">{item.period}</td>
                    <td className="times-of-india-tracker-s124">
                      {Number(item.amount).toLocaleString('en-IN')}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="times-of-india-tracker-s125">
                  <td className="times-of-india-tracker-s126">TOTAL SHORTFALL</td>
                  <td className="times-of-india-tracker-s127">
                    ₹{Number(d.totalShortfall).toLocaleString('en-IN')}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* D. Where They Pay Extra */}
        <div className="times-of-india-tracker-s128">
          <div className="times-of-india-tracker-s129">
            D. WHERE THEY PAY EXTRA
          </div>
          <div className="times-of-india-tracker-s117">
            <table className="times-of-india-tracker-s118">
              <thead>
                <tr className="times-of-india-tracker-s119">
                  <th className="times-of-india-tracker-s120">Particulars</th>
                  <th className="times-of-india-tracker-s121">Amount (₹)</th>
                </tr>
              </thead>
              <tbody>
                {d.extraPaidItems.map((item, idx) => (
                  <tr key={idx} className="times-of-india-tracker-s122">
                    <td className="times-of-india-tracker-s130">{item.period}</td>
                    <td className="times-of-india-tracker-s131">
                      {Number(item.amount).toLocaleString('en-IN')}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="times-of-india-tracker-s132">
                  <td className="times-of-india-tracker-s133">TOTAL EXTRA PAID</td>
                  <td className="times-of-india-tracker-s134">
                    ₹{Number(d.totalExtraPaid).toLocaleString('en-IN')}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* E. Net Outstanding Calculation */}
        <div className="times-of-india-tracker-s135">
          <div className="times-of-india-tracker-s136">
            E. NET OUTSTANDING CALCULATION
          </div>
          <div className="times-of-india-tracker-s137">
            <div className="times-of-india-tracker-s138">
              <span>Total Shortfall (C)</span>
              <strong className="times-of-india-tracker-s139">₹{Number(d.totalShortfall).toLocaleString('en-IN')}</strong>
            </div>
            <div className="times-of-india-tracker-s138">
              <span>Less: Total Extra Paid (D)</span>
              <strong className="times-of-india-tracker-s140">- ₹{Number(d.totalExtraPaid).toLocaleString('en-IN')}</strong>
            </div>
            <div className="times-of-india-tracker-s141">
              <span className="times-of-india-tracker-s142">NET OUTSTANDING BALANCE</span>
              <span className="times-of-india-tracker-s143">
                ₹{Number(d.netOutstanding).toLocaleString('en-IN')}
              </span>
            </div>
          </div>
        </div>

        {/* F. Overall Summary */}
        <div className="times-of-india-tracker-s144">
          <div className="times-of-india-tracker-s145">
            F. OVERALL SUMMARY
          </div>
          <div className="times-of-india-tracker-s146">
            <div className="times-of-india-tracker-s138">
              <span>Total Amount Due ({d.kpi.totalDuePeriod})</span>
              <strong className="times-of-india-tracker-s107">₹{Number(d.kpi.totalDue).toLocaleString('en-IN')}</strong>
            </div>
            <div className="times-of-india-tracker-s138">
              <span>Total Amount Paid (Till Date)</span>
              <strong className="times-of-india-tracker-s140">₹{Number(d.kpi.totalPaid).toLocaleString('en-IN')}</strong>
            </div>
            <div className="times-of-india-tracker-s147">
              <span className="times-of-india-tracker-s148">
                NET OUTSTANDING TO BE RECEIVED
              </span>
              <span className="times-of-india-tracker-s149">
                ₹{Number(d.netOutstanding).toLocaleString('en-IN')}
              </span>
            </div>
          </div>
        </div>

      </div>

      {/* ── Key Takeaways & Footnotes ── */}
      <div className="times-of-india-tracker-s150">
        <div className="times-of-india-tracker-s151">
          📌 KEY TAKEAWAYS
        </div>
        <div className="times-of-india-tracker-s152">
          {d.takeaways.map((takeaway, idx) => (
            <div key={idx} className="times-of-india-tracker-s153">
              <span className="times-of-india-tracker-s154">✓</span>
              <span>{takeaway}</span>
            </div>
          ))}
        </div>
        
        <div className="times-of-india-tracker-s155">
          {d.notes.map((note, idx) => (
            <div key={idx}>• {note}</div>
          ))}
          <div className="times-of-india-tracker-s156">
            ⭐ Extra payments of ₹6,300 have been adjusted against the shortfall to arrive at the Net Outstanding Balance of ₹6,900.
          </div>
        </div>
      </div>

    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function TimesOfIndiaTracker({ isAdmin = false }) {
  const [flats, setFlats]           = useState(makeDefaultFlats);
  const [isLoading, setIsLoading]   = useState(false);
  const [saveStatus, setSaveStatus] = useState('idle');
  const [saveMsg, setSaveMsg]       = useState('');
  const [activeFlat, setActiveFlat] = useState('reconciliation');
  const isLoadedRef                 = useRef(false);
  const recordId                    = 'toi_bills_v4';

  // Reconciliation Toast State
  const [reconciliationToast, setReconciliationToast] = useState('');

  // Invoice Generator State
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('month_range'); // 'month_range' | 'historical'
  const [rangeStartMonth, setRangeStartMonth] = useState('2024-04');
  const [rangeEndMonth, setRangeEndMonth] = useState('2025-03');
  const [maintenanceRate, setMaintenanceRate] = useState(2850);
  const [sinkingFundRate, setSinkingFundRate] = useState(150);
  const [invoiceFlatId, setInvoiceFlatId] = useState('A-302');
  const [invoiceScope, setInvoiceScope] = useState('single'); // 'single' | 'all_pending' | 'all'
  const [invoiceDate, setInvoiceDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });
  const [invoiceDueDate, setInvoiceDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });
  const [invoiceRefPrefix, setInvoiceRefPrefix] = useState('INV-ME/TOI/2026-27/');
  const [invoiceCustomNote, setInvoiceCustomNote] = useState(
    'Society Maintenance and Sinking Fund charges for flats A-302, A-904, and A-1002 (Times Horizon Private Limited) as per society resolution.'
  );
  const [invoiceToast, setInvoiceToast] = useState('');

  useEffect(() => {
    let cancelled = false;
    isLoadedRef.current = false;
    setSaveStatus('idle'); setSaveMsg('');
    setIsLoading(true);
    async function load() {
      if (!isFirebaseConfigured || !db) {
        setFlats(normalizeFlats(makeDefaultFlats())); setIsLoading(false); isLoadedRef.current = true; return;
      }
      try {
        await ensureFirebaseSession();
        let snap = await getDoc(doc(db, 'toiTracking', recordId));
        if (!snap.exists()) {
          const fallbackV3 = await getDoc(doc(db, 'toiTracking', 'toi_bills_v3'));
          if (fallbackV3.exists()) {
            snap = fallbackV3;
          } else {
            const fallbackV2 = await getDoc(doc(db, 'toiTracking', 'toi_bills_v2'));
            if (fallbackV2.exists()) {
              snap = fallbackV2;
            }
          }
        }
        if (!cancelled) {
          const raw = snap.exists() && snap.data().flats ? snap.data().flats : makeDefaultFlats();
          const normalized = normalizeFlats(raw);
          setFlats(normalized);
          const isDifferent = JSON.stringify(raw) !== JSON.stringify(normalized);
          if (isDifferent) {
            save(normalized);
          }
        }
      } catch { setFlats(normalizeFlats(makeDefaultFlats())); }
      finally { if (!cancelled) { setIsLoading(false); isLoadedRef.current = true; } }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  const save = async (data) => {
    setSaveStatus('saving');
    if (!isFirebaseConfigured || !db) { setSaveStatus('saved'); setSaveMsg('Local'); return; }
    try {
      await ensureFirebaseSession();
      await setDoc(doc(db, 'toiTracking', recordId), { flats: data, updatedAt: serverTimestamp() }, { merge: true });
      setSaveStatus('saved'); setSaveMsg('✓ Saved');
    } catch { setSaveStatus('error'); setSaveMsg('Save failed'); }
  };

  const toggleBill = (flatId, billId) => {
    if (!isAdmin) return;
    const next = flats.map(f =>
      f.id !== flatId ? f : {
        ...f, bills: f.bills.map(b =>
          b.id !== billId ? b : { ...b, status: b.status === 'Pending' ? 'Paid' : 'Pending' }
        ),
      }
    );
    setFlats(next);
    if (isLoadedRef.current) save(next);
  };

  const totalBills   = flats.reduce((s, f) => s + f.bills.length, 0);
  const totalPaid    = flats.reduce((s, f) => s + f.bills.filter(b => b.status === 'Paid').length, 0);
  const totalPending = flats.reduce((s, f) => s + f.bills.filter(b => b.status === 'Pending').length, 0);
  const amtPaid      = flats.reduce((s, f) => s + f.bills.filter(b => b.status === 'Paid').reduce((a, b) => a + b.amount, 0), 0);
  const amtPending   = flats.reduce((s, f) => s + f.bills.filter(b => b.status === 'Pending').reduce((a, b) => a + b.amount, 0), 0);
  const donePercent  = totalBills > 0 ? Math.round((totalPaid / totalBills) * 100) : 0;

  const visibleFlats = activeFlat ? flats.filter(f => f.id === activeFlat) : flats;

  const getFlatInvoiceData = useCallback((flat) => {
    const paidAmt = flat.bills.filter(b => b.status === 'Paid').reduce((s, b) => s + b.amount, 0);
    const pendAmt = flat.bills.filter(b => b.status === 'Pending').reduce((s, b) => s + b.amount, 0);
    const paidCount = flat.bills.filter(b => b.status === 'Paid').length;
    return {
      id: flat.id,
      flatNo: flat.flatNo,
      bills: flat.bills,
      totalBilled: TOTAL_PER_FLAT,
      paidAmount: paidAmt,
      pendingAmount: pendAmt,
      paidCount,
      isFullyPaid: pendAmt === 0
    };
  }, []);

  const activeInvoiceFlat = useMemo(() => {
    return flats.find(f => f.id === invoiceFlatId) || flats[0] || makeDefaultFlats()[0];
  }, [flats, invoiceFlatId]);

  const activeInvoiceData = useMemo(() => {
    return getFlatInvoiceData(activeInvoiceFlat);
  }, [getFlatInvoiceData, activeInvoiceFlat]);

  const flatsForInvoice = useMemo(() => {
    if (invoiceScope === 'single') {
      return [activeInvoiceFlat];
    }
    if (invoiceScope === 'all_pending') {
      return flats.filter(f => getFlatInvoiceData(f).pendingAmount > 0);
    }
    return flats;
  }, [invoiceScope, activeInvoiceFlat, flats, getFlatInvoiceData]);

  const rangeMonthsCount = useMemo(() => calculateMonthsBetween(rangeStartMonth, rangeEndMonth), [rangeStartMonth, rangeEndMonth]);
  const rangeMaintenanceTotal = useMemo(() => rangeMonthsCount * Number(maintenanceRate || 0), [rangeMonthsCount, maintenanceRate]);
  const rangeSinkingFundTotal = useMemo(() => rangeMonthsCount * Number(sinkingFundRate || 0), [rangeMonthsCount, sinkingFundRate]);
  const rangeBaseTotal = useMemo(() => rangeMaintenanceTotal + rangeSinkingFundTotal, [rangeMaintenanceTotal, rangeSinkingFundTotal]);
  const rangeGrandTotal = rangeBaseTotal;

  const generateToiWhatsAppMessage = useCallback((flat) => {
    const formattedInvDate = formatDisplayDate(invoiceDate);
    const formattedDueDate = formatDisplayDate(invoiceDueDate);
    const invNo = `${invoiceRefPrefix}${flat.flatNo.replace('-', '')}`;

    if (modalMode === 'month_range') {
      const startLbl = formatMonthYearLabel(rangeStartMonth);
      const endLbl = formatMonthYearLabel(rangeEndMonth);

      const lines = [
        `🏛️ *MAJESTIQUE EURISKA 'A' BLDG CO-OP HSG SOC LTD*`,
        `📄 *MAINTENANCE, SINKING FUND & TOI TAX INVOICE*`,
        `───────────────────────────`,
        `📌 *Ref No:* ${invNo}`,
        `📅 *Date:* ${formattedInvDate}`,
        `⏰ *Due Date:* ${formattedDueDate}`,
        `👤 *Billed To:* Flat ${flat.flatNo}`,
        `📋 *Billing Period:* ${startLbl} to ${endLbl} (*${rangeMonthsCount} Months*)`,
        ``,
        `*BILL BREAKDOWN:*`,
        `1. Flat Maintenance (${rangeMonthsCount} mos @ ₹${formatValue(maintenanceRate)}/mo): *₹${formatValue(rangeMaintenanceTotal)}*`,
        `2. Sinking Fund (${rangeMonthsCount} mos @ ₹${formatValue(sinkingFundRate)}/mo): *₹${formatValue(rangeSinkingFundTotal)}*`,
        `   ↳ *Total Net Payable:* *₹${formatValue(rangeBaseTotal)}* (₹${formatValue(Number(maintenanceRate) + Number(sinkingFundRate))}/mo)`,
        ``,
        `💰 *GRAND TOTAL PAYABLE:* *₹${formatValue(rangeGrandTotal)}*`,
        `───────────────────────────`,
        `🏦 *SOCIETY BANK REMITTANCE INFO:*`,
        `• *Bank:* HDFC Bank`,
        `• *Account Name:* MAJESTIQUE EURISKA A BLDG SA GRU SAN MAR`,
        `• *A/C No:* 50200075533530`,
        `• *IFSC Code:* HDFC0002454`,
        `• *Account Type:* CA-INSTITUTION`,
        `• *Branch:* Budhrani Boulevard, Undri NIBM Rd, Pune - 411060`,
        ``,
        `💬 *Note:* Kindly process on or before *${formattedDueDate}* and share UTR reference for receipt credit.`
      ];
      return lines.join('\n');
    }

    const data = getFlatInvoiceData(flat);
    return `*MAJESTIQUE EURISKA 'A' BLDG CO-OP HSG SOC LTD*
*TIMES OF INDIA NEWSPAPER SUBSCRIPTION TAX INVOICE*
━━━━━━━━━━━━━━━━━━━━━━
Invoice No: ${invNo}
Invoice Date: ${formattedInvDate}
Payment Due Date: ${formattedDueDate}

Billed To Member: *Flat ${flat.flatNo}*
Facility: Times of India Newspaper Subscription (Oct 2021 to Sept 2026 - 60 Months)

*Subscription Slabs & Dues:*
• Total Subscription Billed: ₹${formatValue(data.totalBilled)} (60 Mos)
• Total Amount Paid: ₹${formatValue(data.paidAmount)}
• *NET OUTSTANDING DUE: ₹${formatValue(data.pendingAmount)}*

*Society Remittance Bank Account:*
• Bank: HDFC Bank
• A/C Name: MAJESTIQUE EURISKA A BLDG SA GRU SAN MAR
• A/C No: 50200075533530
• IFSC: HDFC0002454
• Branch: Budhrani Boulevard, Undri NIBM Rd, Pune - 411060

Kindly process the pending amount on or before *${formattedDueDate}* and share the UTR reference for receipt credit.

Thank you!
*Managing Committee*
Majestique Euriska 'A' Building CHS Ltd.`;
  }, [modalMode, rangeStartMonth, rangeEndMonth, rangeMonthsCount, maintenanceRate, rangeMaintenanceTotal, sinkingFundRate, rangeSinkingFundTotal, rangeBaseTotal, rangeGrandTotal, getFlatInvoiceData, invoiceDate, invoiceDueDate, invoiceRefPrefix]);

  const handleShareToiWhatsApp = useCallback((flat) => {
    const msg = generateToiWhatsAppMessage(flat);
    const url = `https://wa.me/?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  }, [generateToiWhatsAppMessage]);

  const handleCopyFlatInvoiceText = useCallback((flat) => {
    const msg = generateToiWhatsAppMessage(flat);
    if (navigator.clipboard) {
      navigator.clipboard.writeText(msg).then(() => {
        setInvoiceToast(`✓ Invoice text copied for Flat ${flat.flatNo}!`);
        setTimeout(() => setInvoiceToast(''), 3000);
      }).catch(() => {
        setInvoiceToast('Failed to copy');
        setTimeout(() => setInvoiceToast(''), 3000);
      });
    }
  }, [generateToiWhatsAppMessage]);

  const handlePrintToiInvoices = useCallback(() => {
    const targetFlats = flatsForInvoice;
    if (targetFlats.length === 0) {
      window.alert('No flats selected for invoice generation.');
      return;
    }

    const formattedInvDate = formatDisplayDate(invoiceDate);
    const formattedDueDate = formatDisplayDate(invoiceDueDate);

    const pagesHtml = targetFlats.map((f, idx) => {
      const invNo = `${invoiceRefPrefix}${f.flatNo.replace('-', '')}`;

      if (modalMode === 'month_range') {
        const startLbl = formatMonthYearLabel(rangeStartMonth);
        const endLbl = formatMonthYearLabel(rangeEndMonth);

        return `
          <div class="invoice-page">
            <div class="header">
              <div class="society-title">MAJESTIQUE EURISKA 'A' BUILDING CO-OP HOUSING SOCIETY LTD.</div>
              <div class="society-reg">Reg. No: PNA/PNA (4)/HSG/(TC)/21207/2019-20 • S. No. 2, Plot No C-1, Village Mohammed Wadi, Taluka Haveli, Pune - 411060</div>
              <div class="doc-badge">MAINTENANCE, SINKING FUND &amp; TOI • TAX INVOICE</div>
            </div>

            <div class="ref-row">
              <div><strong>Invoice No:</strong> ${invNo}</div>
              <div><strong>Invoice Date:</strong> ${formattedInvDate}</div>
            </div>

            <div class="recipient-box">
              <div style="font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: 700; margin-bottom: 2px;">Billed To (Flat Member / Occupant):</div>
              <div style="font-size: 15px; font-weight: 800; color: #0b2b26;">Flat ${f.flatNo}</div>
              <div style="font-size: 12px; color: #475569;">Majestique Euriska 'A' Building, Mohammed Wadi, Pune - 411060</div>
              <div style="font-size: 11.5px; color: #196c6c; font-weight: 600; margin-top: 2px;">Billing Period: ${startLbl} to ${endLbl} (${rangeMonthsCount} Months)</div>
            </div>

            <div class="subject-line">
              <strong>SUBJECT:</strong> TAX INVOICE FOR FLAT MAINTENANCE, SINKING FUND &amp; TOI CHARGES
            </div>

            <table class="dues-table">
              <thead>
                <tr>
                  <th style="width: 35px; text-align: center;">#</th>
                  <th>Particulars / Dues Description</th>
                  <th style="text-align: center; width: 140px;">Billing Period</th>
                  <th style="text-align: center; width: 70px;">Duration</th>
                  <th style="text-align: center; width: 100px;">Rate / Month</th>
                  <th style="text-align: right; width: 110px;">Amount (₹)</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style="text-align: center; color: #64748b;">1</td>
                  <td style="font-weight: 700; color: #0f172a;">Flat Maintenance Charges</td>
                  <td style="text-align: center; color: #475569;">${startLbl} – ${endLbl}</td>
                  <td style="text-align: center; font-weight: 700;">${rangeMonthsCount} mos</td>
                  <td style="text-align: center; font-weight: 600;">₹${formatValue(maintenanceRate)}</td>
                  <td style="text-align: right; font-weight: 700; font-family: monospace;">₹${formatValue(rangeMaintenanceTotal)}</td>
                </tr>
                <tr>
                  <td style="text-align: center; color: #64748b;">2</td>
                  <td style="font-weight: 700; color: #0f172a;">Sinking Fund Contribution</td>
                  <td style="text-align: center; color: #475569;">${startLbl} – ${endLbl}</td>
                  <td style="text-align: center; font-weight: 700;">${rangeMonthsCount} mos</td>
                  <td style="text-align: center; font-weight: 600;">₹${formatValue(sinkingFundRate)}</td>
                  <td style="text-align: right; font-weight: 700; font-family: monospace;">₹${formatValue(rangeSinkingFundTotal)}</td>
                </tr>
                <tr style="background: #f8fafc; font-weight: 700;">
                  <td colspan="3" style="text-align: right; color: #196c6c;">Base Society Maintenance Subtotal:</td>
                  <td style="text-align: center; color: #196c6c;">${rangeMonthsCount} mos</td>
                  <td style="text-align: center; color: #196c6c;">₹${formatValue(Number(maintenanceRate) + Number(sinkingFundRate))}</td>
                  <td style="text-align: right; font-family: monospace; color: #196c6c;">₹${formatValue(rangeBaseTotal)}</td>
                </tr>
                <tr class="highlight-row">
                  <td colspan="5" style="text-align: right; font-size: 13px; color: #0b2b26;">TOTAL NET INVOICE AMOUNT PAYABLE:</td>
                  <td style="text-align: right; font-size: 14px; font-weight: 900; color: #0b2b26; font-family: monospace;">
                    ₹${formatValue(rangeGrandTotal)}
                  </td>
                </tr>
              </tbody>
            </table>

            <div class="due-banner">
              <div>
                <span style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 700; color: #92400e;">Payment Due Date:</span>
                <div style="font-size: 14px; font-weight: 800; color: #78350f;">Please clear on or before: ${formattedDueDate}</div>
              </div>
              <div style="text-align: right; font-size: 12px; font-weight: 700; color: #92400e;">
                Payable: ₹${formatValue(rangeGrandTotal)}
              </div>
            </div>

            <div class="bank-box">
              <div style="font-weight: 700; color: #0b2b26; margin-bottom: 6px; font-size: 12px;">🏦 SOCIETY BANK ACCOUNT DETAILS FOR REMITTANCE:</div>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px; font-size: 11.5px;">
                <div><strong>Account Name:</strong> MAJESTIQUE EURISKA A BLDG SA GRU SAN MAR</div>
                <div><strong>Bank Name:</strong> HDFC Bank</div>
                <div><strong>Account Number:</strong> 50200075533530</div>
                <div><strong>Account Type:</strong> CA-INSTITUTION (Current Account)</div>
                <div><strong>IFSC Code:</strong> HDFC0002454</div>
                <div><strong>Branch:</strong> Budhrani Boulevard, Undri NIBM Rd, Pune - 411060</div>
              </div>
              <div style="margin-top: 6px; font-size: 10.5px; color: #64748b;">* Note: Kindly mention <strong>Flat ${f.flatNo}</strong> in the transfer narration and share the UTR reference for prompt receipt credit.</div>
            </div>

            <div class="legal-note">
              <strong>Important Society Terms:</strong><br/>
              ${invoiceCustomNote}
            </div>

            <div class="signatures">
              <div class="sig-col"><div class="sig-line">Society Manager</div></div>
              <div class="sig-col"><div class="sig-line">Hon. Secretary</div></div>
              <div class="sig-col"><div class="sig-line">Hon. Treasurer / Chairman</div></div>
            </div>

            <div class="footer">
              <div>Majestique Euriska 'A' Building Co-Operative Housing Society Ltd. • Official Document</div>
              <div>Page ${idx + 1} of ${targetFlats.length}</div>
            </div>
          </div>
        `;
      }

      const data = getFlatInvoiceData(f);
      return `
        <div class="invoice-page">
          <div class="header">
            <div class="society-title">MAJESTIQUE EURISKA 'A' BUILDING CO-OP HOUSING SOCIETY LTD.</div>
            <div class="society-reg">Reg. No: PNA/PNA (4)/HSG/(TC)/21207/2019-20 • S. No. 2, Plot No C-1, Village Mohammed Wadi, Taluka Haveli, Pune - 411060</div>
            <div class="doc-badge">TIMES OF INDIA SUBSCRIPTION • TAX INVOICE / BILL</div>
          </div>

          <div class="ref-row">
            <div><strong>Invoice No:</strong> ${invNo}</div>
            <div><strong>Invoice Date:</strong> ${formattedInvDate}</div>
          </div>

          <div class="recipient-box">
            <div style="font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: 700; margin-bottom: 2px;">Billed To (Flat Member / Occupant):</div>
            <div style="font-size: 15px; font-weight: 800; color: #0b2b26;">Flat ${f.flatNo}</div>
            <div style="font-size: 12px; color: #475569;">Majestique Euriska 'A' Building, Mohammed Wadi, Pune - 411060</div>
            <div style="font-size: 11.5px; color: #196c6c; font-weight: 600; margin-top: 2px;">Service: Times of India Newspaper Subscription (${TOTAL_MONTHS} Months)</div>
          </div>

          <div class="subject-line">
            <strong>SUBJECT:</strong> TAX INVOICE &amp; STATEMENT FOR TIMES OF INDIA NEWSPAPER SUBSCRIPTION DUES
          </div>

          <table class="dues-table">
            <thead>
              <tr>
                <th style="width: 35px; text-align: center;">#</th>
                <th>Financial Year</th>
                <th>Period</th>
                <th style="text-align: center; width: 70px;">Months</th>
                <th style="text-align: center; width: 100px;">Rate / Month</th>
                <th style="text-align: right; width: 110px;">Amount (₹)</th>
                <th style="text-align: center; width: 90px;">Status</th>
              </tr>
            </thead>
            <tbody>
              ${f.bills.map((b, i) => `
                <tr>
                  <td style="text-align: center; color: #64748b;">${i + 1}</td>
                  <td style="font-weight: 700; color: #0f172a;">${b.year}</td>
                  <td>${b.period}</td>
                  <td style="text-align: center; font-weight: 600;">${b.months}</td>
                  <td style="text-align: center; font-weight: 600;">₹${formatValue(b.rate)}</td>
                  <td style="text-align: right; font-weight: 700; font-family: monospace;">₹${formatValue(b.amount)}</td>
                  <td style="text-align: center;">
                    <span style="display: inline-block; padding: 2px 7px; border-radius: 999px; font-size: 9px; font-weight: 700; background: ${b.status === 'Paid' ? '#d1fae5' : '#fef3c7'}; color: ${b.status === 'Paid' ? '#065f46' : '#92400e'};">
                      ${b.status === 'Paid' ? '✓ Paid' : '⏳ Pending'}
                    </span>
                  </td>
                </tr>
              `).join('')}
              <tr style="background: #f8fafc; font-weight: 700;">
                <td colspan="3" style="text-align: right;">Total Demand Billed (${TOTAL_MONTHS} Months):</td>
                <td style="text-align: center; color: #196c6c;">${TOTAL_MONTHS} mos</td>
                <td></td>
                <td style="text-align: right; font-family: monospace;">₹${formatValue(data.totalBilled)}</td>
                <td></td>
              </tr>
              <tr style="background: #f0fdf4; color: #15803d; font-weight: 700;">
                <td colspan="5" style="text-align: right;">Total Payments Credited:</td>
                <td style="text-align: right; font-family: monospace;">(-) ₹${formatValue(data.paidAmount)}</td>
                <td></td>
              </tr>
              <tr class="highlight-row">
                <td colspan="5" style="text-align: right; font-size: 13px; color: #0b2b26;">TOTAL NET INVOICE AMOUNT PAYABLE:</td>
                <td style="text-align: right; font-size: 14px; font-weight: 900; color: ${data.pendingAmount > 0 ? '#991b1b' : '#15803d'}; font-family: monospace;">
                  ₹${formatValue(data.pendingAmount)}
                </td>
                <td></td>
              </tr>
            </tbody>
          </table>

          <div class="due-banner">
            <div>
              <span style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 700; color: #92400e;">Payment Due Date:</span>
              <div style="font-size: 14px; font-weight: 800; color: #78350f;">Please clear on or before: ${formattedDueDate}</div>
            </div>
            <div style="text-align: right; font-size: 12px; font-weight: 700; color: #92400e;">
              ${data.pendingAmount > 0 ? `⚠️ Outstanding: ₹${formatValue(data.pendingAmount)}` : '✓ All Cleared / Paid'}
            </div>
          </div>

          <div class="bank-box">
            <div style="font-weight: 700; color: #0b2b26; margin-bottom: 6px; font-size: 12px;">🏦 SOCIETY BANK ACCOUNT DETAILS FOR REMITTANCE:</div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px; font-size: 11.5px;">
              <div><strong>Account Name:</strong> MAJESTIQUE EURISKA A BLDG SA GRU SAN MAR</div>
              <div><strong>Bank Name:</strong> HDFC Bank</div>
              <div><strong>Account Number:</strong> 50200075533530</div>
              <div><strong>Account Type:</strong> CA-INSTITUTION (Current Account)</div>
              <div><strong>IFSC Code:</strong> HDFC0002454</div>
              <div><strong>Branch:</strong> Budhrani Boulevard, Undri NIBM Rd, Pune - 411060</div>
            </div>
            <div style="margin-top: 6px; font-size: 10.5px; color: #64748b;">* Note: Kindly mention <strong>TOI Flat ${f.flatNo}</strong> in the transfer narration and share the UTR reference for prompt receipt credit.</div>
          </div>

          <div class="legal-note">
            <strong>Important Society Terms:</strong><br/>
            ${invoiceCustomNote}
          </div>

          <div class="signatures">
            <div class="sig-col">
              <div class="sig-line">Society Manager</div>
            </div>
            <div class="sig-col">
              <div class="sig-line">Hon. Secretary</div>
            </div>
            <div class="sig-col">
              <div class="sig-line">Hon. Treasurer / Chairman</div>
            </div>
          </div>

          <div class="footer">
            <div>Majestique Euriska 'A' Building Co-Operative Housing Society Ltd. • Official Document</div>
            <div>Page ${idx + 1} of ${targetFlats.length}</div>
          </div>
        </div>
      `;
    }).join('');

    const printDoc = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="utf-8">
        <title>Times of India Invoice - Flats 302, 904, 1002 - Majestique Euriska</title>
        <style>
          * { box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
          body { margin: 0; padding: 0; color: #0f172a; background: #fff; font-size: 11px; }
          
          .invoice-page {
            padding: 28px 32px;
            max-width: 820px;
            margin: 0 auto;
            background: #fff;
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
          }

          .header {
            text-align: center;
            border-bottom: 2px solid #0b2b26;
            padding-bottom: 12px;
            margin-bottom: 14px;
          }
          .society-title { font-size: 17px; font-weight: 900; color: #0b2b26; letter-spacing: 0.02em; }
          .society-reg { font-size: 10.5px; color: #475569; margin-top: 3px; line-height: 1.4; }
          .doc-badge {
            display: inline-block;
            margin-top: 6px;
            padding: 3px 12px;
            border-radius: 999px;
            background: #0b2b26;
            color: #C49B4F;
            border: 1px solid #C49B4F;
            font-size: 9.5px;
            font-weight: 800;
            letter-spacing: 0.08em;
          }

          .ref-row {
            display: flex;
            justify-content: space-between;
            font-size: 11.5px;
            color: #334155;
            margin-bottom: 12px;
            padding-bottom: 6px;
            border-bottom: 1px dashed #cbd5e1;
          }

          .recipient-box {
            background: #f8fafc;
            border: 1px solid #cbd5e1;
            border-radius: 8px;
            padding: 10px 14px;
            margin-bottom: 12px;
          }

          .subject-line {
            font-size: 12px;
            color: #0f172a;
            padding: 7px 12px;
            background: #f1f5f9;
            border-left: 4px solid #0b2b26;
            margin-bottom: 12px;
          }

          .dues-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 11px;
            margin-bottom: 14px;
          }
          .dues-table th {
            background: #0b2b26;
            color: #fff;
            padding: 7px 10px;
            text-align: left;
            font-size: 10.5px;
            text-transform: uppercase;
            letter-spacing: 0.05em;
          }
          .dues-table td {
            padding: 7px 10px;
            border: 1px solid #cbd5e1;
          }
          .highlight-row {
            background: #fefce8;
            font-weight: 800;
            border-top: 2px solid #ca8a04;
          }

          .due-banner {
            background: #fffbeb;
            border: 1.5px solid #fde68a;
            border-radius: 8px;
            padding: 9px 12px;
            margin-bottom: 14px;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }

          .bank-box {
            background: #f0fdf4;
            border: 1px solid #bbf7d0;
            border-radius: 8px;
            padding: 10px 14px;
            margin-bottom: 14px;
          }

          .legal-note {
            background: #f8fafc;
            border-left: 3px solid #64748b;
            padding: 8px 12px;
            font-size: 10.5px;
            color: #475569;
            line-height: 1.45;
            margin-bottom: 16px;
          }

          .signatures {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 20px;
            margin-top: 16px;
            padding-top: 8px;
            text-align: center;
          }
          .sig-col { padding: 0 10px; }
          .sig-line {
            border-top: 1px solid #0b2b26;
            padding-top: 6px;
            font-size: 10.5px;
            font-weight: 700;
            color: #0b2b26;
            margin-top: 36px;
          }

          .footer {
            margin-top: 16px;
            padding-top: 8px;
            border-top: 1px dashed #cbd5e1;
            font-size: 9.5px;
            color: #94a3b8;
            display: flex;
            justify-content: space-between;
          }

          @media print {
            body { background: #fff; }
            .invoice-page {
              padding: 20px 24px;
              page-break-after: always;
              min-height: 98vh;
            }
            .invoice-page:last-child {
              page-break-after: auto;
            }
          }
        </style>
      </head>
      <body>
        ${pagesHtml}
        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 250);
          };
        </script>
      </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printDoc);
      printWindow.document.close();
    }
  }, [flatsForInvoice, invoiceDate, invoiceDueDate, invoiceRefPrefix, invoiceCustomNote, getFlatInvoiceData]);

  const generateReconciliationWhatsAppMessage = useCallback(() => {
    return `🏛️ *MAJESTIQUE EURISKA 'A' BLDG CO-OP HSG SOC LTD*
📰 *SOCIETY MAINTENANCE PAYMENT RECONCILIATION – TIME OF INDIA*
🏢 *Flats:* 302, 904, 1002 (3 Flats) | *Start Date:* October 2021
───────────────────────────
📊 *RECONCILIATION SUMMARY (Oct 2021 to Mar 2027 - 66 Months):*
• *Rate till June 2025:* ₹2,200 per Month per Flat
• *Rate from July 2025:* ₹3,000 per Month per Flat
• *Total Amount Due:* ₹4,86,000 (66 Mos × 3 Flats = ₹1,62,000 per flat)
• *Total Amount Paid:* ₹4,61,100 (₹3,43,500 + ₹81,600 + ₹36,000)
• 🚨 *NET OUTSTANDING BALANCE: ₹24,900*

📌 *PHASE-WISE BREAKUP:*
1. *Oct 2021 – Sept 2026 (60 Mos):* Due ₹4,32,000 | Paid ₹4,25,100 | Net Shortfall: ₹6,900
2. *Oct 2026 – Mar 2027 (6 Mos):* Due ₹54,000 | Paid ₹36,000 (Flats 302 & 904 paid, Flat 1002 pending ₹18,000)

🔻 *C. SHORTFALL (WHERE THEY PAY SHORT):*
• Oct 2024 – Mar 2025 (Short Paid): *₹13,200* (Flat 1002 unpaid)
• Oct 2026 – Mar 2027 (Pending): *₹18,000* (Flat 1002 unpaid)
↳ *Total Shortfall:* *₹31,200*

🔺 *D. EXTRA PAID (WHERE THEY PAY EXTRA):*
• Oct 2021 – Sept 2022 (Extra Paid): *+₹2,400*
• Apr 2023 – Mar 2024 (Extra Paid): *+₹3,000*
• Apr 2025 – Sept 2025 (Extra Paid): *+₹900*
↳ *Total Extra Paid:* *₹6,300*

⚖️ *E. NET OUTSTANDING CALCULATION:*
• Total Shortfall (C): ₹31,200
• Less: Total Extra Paid (D): (-) ₹6,300
↳ ⚠️ *NET OUTSTANDING TO BE RECEIVED: ₹24,900* (Flat 1002 pending)

📌 *KEY TAKEAWAYS:*
✓ No missing bill for Oct 2021 – Sept 2022. Total extra paid by ₹2,400.
✓ All payments are mapped against corresponding periods.
✓ Apr 2026 – Sept 2026: ₹54,000 received on 23-06-2026 in HDFC account.
✓ Oct 2026 – Mar 2027: ₹36,000 received on 23-10-2026 for Flat 302 & Flat 904.
✓ Flat 1002 has total net outstanding of ₹24,900 (₹31,200 shortfall − ₹6,300 extra adjusted).

🏦 *SOCIETY BANK REMITTANCE INFO:*
• Bank: HDFC Bank
• A/C Name: MAJESTIQUE EURISKA A BLDG SA GRU SAN MAR
• A/C No: 50200075533530
• IFSC Code: HDFC0002454
• Branch: Budhrani Boulevard, Undri NIBM Rd, Pune - 411060`;
  }, []);

  const handleShareReconciliationWhatsApp = useCallback(() => {
    const text = generateReconciliationWhatsAppMessage();
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  }, [generateReconciliationWhatsAppMessage]);

  const handleCopyReconciliationText = useCallback(() => {
    const text = generateReconciliationWhatsAppMessage();
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(() => {
        setReconciliationToast('✓ Reconciliation summary copied to clipboard!');
        setTimeout(() => setReconciliationToast(''), 3000);
      }).catch(() => {
        setReconciliationToast('Failed to copy');
        setTimeout(() => setReconciliationToast(''), 3000);
      });
    }
  }, [generateReconciliationWhatsAppMessage]);

  const handlePrintReconciliation = useCallback(() => {
    const d = TOI_RECONCILIATION_DATA;
    const printDoc = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="utf-8">
        <title>TOI Payment Reconciliation - Flats 302, 904, 1002 - Majestique Euriska</title>
        <style>
          * { box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
          body { margin: 0; padding: 20px; color: #0f172a; background: #fff; font-size: 10px; }
          .recon-page { max-width: 1060px; margin: 0 auto; }
          .header-banner {
            background: #0b2b26; color: #fff; text-align: center; padding: 14px 20px; border-radius: 8px; margin-bottom: 12px;
          }
          .header-title { font-size: 16px; font-weight: 900; letter-spacing: 0.04em; color: #fff; margin-bottom: 4px; }
          .header-sub { font-size: 11px; color: #cbd5e1; }
          
          .kpi-row {
            display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px; margin-bottom: 14px;
          }
          .kpi-card {
            border: 1px solid #cbd5e1; border-radius: 8px; padding: 10px; background: #f8fafc; text-align: center;
          }
          .kpi-card.alert {
            background: #fef2f2; border: 2px solid #ef4444;
          }
          .kpi-lbl { font-size: 8.5px; font-weight: 800; color: #64748b; text-transform: uppercase; margin-bottom: 4px; }
          .kpi-val { font-size: 13.5px; font-weight: 900; color: #0b2b26; }
          .kpi-card.alert .kpi-val { color: #dc2626; font-size: 15px; }
          .kpi-sub { font-size: 8px; color: #94a3b8; margin-top: 2px; }

          .section-title {
            background: #0b2b26; color: #fff; padding: 6px 10px; font-weight: 800; font-size: 10px;
            letter-spacing: 0.05em; border-radius: 4px; margin-bottom: 6px;
          }
          table { width: 100%; border-collapse: collapse; margin-bottom: 12px; font-size: 9.5px; }
          th { background: #f1f5f9; border: 1px solid #cbd5e1; padding: 6px 8px; text-align: left; font-weight: 800; }
          td { border: 1px solid #cbd5e1; padding: 6px 8px; vertical-align: middle; }
          
          .grid-bottom {
            display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 12px;
          }
          .bottom-card {
            border: 1px solid #cbd5e1; border-radius: 8px; overflow: hidden;
          }
          .bottom-card-header {
            padding: 6px 10px; font-weight: 800; font-size: 9px; text-transform: uppercase;
          }
          .bottom-card-body { padding: 10px; font-size: 9px; }

          .takeaways {
            border: 1px solid #cbd5e1; border-radius: 8px; padding: 10px; margin-bottom: 12px; background: #f8fafc; font-size: 9.5px;
          }

          @media print {
            body { padding: 8px; }
            @page { size: landscape; margin: 6mm; }
          }
        </style>
      </head>
      <body>
        <div class="recon-page">
          <div class="header-banner">
            <div class="header-title">${d.title}</div>
            <div class="header-sub">${d.subtitle}</div>
          </div>

          <div class="kpi-row">
            <div class="kpi-card">
              <div class="kpi-lbl">Rate till June 2025</div>
              <div class="kpi-val">${d.kpi.rateTillJune2025}</div>
            </div>
            <div class="kpi-card">
              <div class="kpi-lbl">Rate from July 2025</div>
              <div class="kpi-val">${d.kpi.rateFromJuly2025}</div>
            </div>
            <div class="kpi-card">
              <div class="kpi-lbl">Total Due (${d.kpi.totalDuePeriod})</div>
              <div class="kpi-val">₹${Number(d.kpi.totalDue).toLocaleString('en-IN')}</div>
              <div class="kpi-sub">${d.kpi.totalDueBreakdown}</div>
            </div>
            <div class="kpi-card">
              <div class="kpi-lbl">Total Amount Paid (Till Date)</div>
              <div class="kpi-val" style="color: #15803d;">₹${Number(d.kpi.totalPaid).toLocaleString('en-IN')}</div>
              <div class="kpi-sub">${d.kpi.paidBreakdown}</div>
            </div>
            <div class="kpi-card alert">
              <div class="kpi-lbl" style="color: #991b1b;">Net Outstanding Balance</div>
              <div class="kpi-val">₹${Number(d.kpi.netOutstanding).toLocaleString('en-IN')}</div>
              <div class="kpi-sub" style="color: #991b1b; font-weight: 700;">Net Pending from TOI</div>
            </div>
          </div>

          <!-- Section A -->
          <div class="section-title">A. CHRONOLOGICAL PAYMENT TIMELINE (All Payments Received)</div>
          <table>
            <thead>
              <tr>
                <th style="width: 30px; text-align: center;">Sr.</th>
                <th>Payment Date</th>
                <th>Bank / Mode</th>
                <th style="text-align: right;">Amount Paid (₹)</th>
                <th>For Which Flats</th>
                <th>Period Covered</th>
                <th style="text-align: center;">Mos</th>
                <th style="text-align: right;">Rate / Flat</th>
                <th style="text-align: right;">App. 3 Flats</th>
                <th style="text-align: center;">Diff</th>
                <th>Remarks</th>
              </tr>
            </thead>
            <tbody>
              ${d.chronologicalTimeline.map(r => `
                <tr>
                  <td style="text-align: center;">${r.srNo}</td>
                  <td style="color: #b91c1c; font-weight: 700;">${r.paymentDate}</td>
                  <td>${r.paymentMode}</td>
                  <td style="text-align: right; font-weight: 700;">₹${Number(r.amountPaid).toLocaleString('en-IN')}</td>
                  <td style="color: #b91c1c; font-weight: 700;">${r.forFlats}</td>
                  <td style="color: #b91c1c; font-weight: 700;">${r.periodCovered}</td>
                  <td style="text-align: center;">${r.months}</td>
                  <td style="text-align: right;">₹${Number(r.ratePerFlat).toLocaleString('en-IN')}</td>
                  <td style="text-align: right; font-weight: 700;">₹${Number(r.amountFor3Flats).toLocaleString('en-IN')}</td>
                  <td style="text-align: center; font-weight: 700; color: ${r.diff > 0 ? '#15803d' : '#475569'};">${r.diffLabel}</td>
                  <td style="font-size: 9px;">${r.remarks.replace(/\n/g, '<br/>')}</td>
                </tr>
                ${r.breakup ? `
                  <tr style="background: #fefce8; font-size: 8.5px; color: #854d0e;">
                    <td colspan="11"><strong>Detail:</strong> ${r.breakup}</td>
                  </tr>
                ` : ''}
              `).join('')}
              <tr style="background: #f0fdf4; font-weight: 800;">
                <td colspan="3">SUMMARY: ${d.sectionASummary.period}</td>
                <td style="text-align: right;">₹${Number(d.sectionASummary.totalPaid).toLocaleString('en-IN')}</td>
                <td colspan="4" style="text-align: right;">Expected: ₹${Number(d.sectionASummary.expectedFor3Flats).toLocaleString('en-IN')}</td>
                <td></td>
                <td style="text-align: center; color: #15803d;">${d.sectionASummary.diff}</td>
                <td style="color: #15803d;">✓ ${d.sectionASummary.conclusion}</td>
              </tr>
            </tbody>
          </table>

          <!-- Section B -->
          <div class="section-title">B. PERIOD-WISE RECONCILIATION STATEMENT</div>
          <table>
            <thead>
              <tr>
                <th style="width: 30px; text-align: center;">Sr.</th>
                <th>Period</th>
                <th style="text-align: center;">Mos</th>
                <th style="text-align: center;">Rate / Flat / Mo</th>
                <th style="text-align: right;">Expected (3 Flats)</th>
                <th style="text-align: right;">Amount Paid (₹)</th>
                <th>Payment Date / Bank</th>
                <th style="text-align: center;">Diff</th>
                <th style="text-align: center;">Status</th>
              </tr>
            </thead>
            <tbody>
              ${d.periodWiseReconciliation.map(r => `
                <tr style="${r.diff < 0 ? 'background: #fef2f2;' : ''}">
                  <td style="text-align: center;">${r.srNo}</td>
                  <td style="font-weight: 700;">${r.period}</td>
                  <td style="text-align: center;">${r.months}</td>
                  <td style="text-align: center;">${r.rate.replace(/\n/g, ' / ')}</td>
                  <td style="text-align: right;">₹${Number(r.expected).toLocaleString('en-IN')}</td>
                  <td style="text-align: right; font-weight: 700; color: ${r.diff < 0 ? '#b91c1c' : '#15803d'};">
                    ₹${Number(r.paid).toLocaleString('en-IN')}
                  </td>
                  <td style="font-size: 8.5px;">${r.paymentDetails.replace(/\n/g, ' ')}</td>
                  <td style="text-align: center; font-weight: 700; color: ${r.diff < 0 ? '#b91c1c' : (r.diff > 0 ? '#15803d' : '#475569')};">
                    ${r.diffLabel}
                  </td>
                  <td style="text-align: center; font-weight: 700; font-size: 8.5px;">
                    ${r.status}
                  </td>
                </tr>
              `).join('')}
              <!-- Subtotal (Oct 2021 – Sept 2026, 60 Months) -->
              <tr style="background: #1e3a34; color: #fff; font-weight: 700;">
                <td colspan="2" style="text-align: right;">Subtotal (Oct 2021 – Sept 2026)</td>
                <td style="text-align: center;">60</td>
                <td></td>
                <td style="text-align: right; color: #c49b4f;">₹4,32,000</td>
                <td style="text-align: right; color: #86efac;">₹4,25,100</td>
                <td style="font-size: 8px;">(3,43,500 + 81,600)</td>
                <td style="text-align: center; color: #fca5a5;">-6,900</td>
                <td style="text-align: center; color: #fca5a5; font-size: 8px;">60-MO SHORTFALL</td>
              </tr>
              <!-- Grand Total (Oct 2021 – Mar 2027, 66 Months) -->
              <tr style="background: #0b2b26; color: #fff; font-weight: 800;">
                <td colspan="2" style="text-align: right;">TOTAL (66 Months)</td>
                <td style="text-align: center;">66</td>
                <td></td>
                <td style="text-align: right; color: #facc15;">₹4,86,000</td>
                <td style="text-align: right; color: #4ade80;">₹4,61,100</td>
                <td style="font-size: 8px;">(3,43,500 + 81,600 + 36,000)</td>
                <td style="text-align: center; color: #fca5a5;">-24,900</td>
                <td style="text-align: center; color: #fca5a5;">NET SHORTFALL</td>
              </tr>
            </tbody>
          </table>

          <!-- Bottom Cards -->
          <div class="grid-bottom">
            <div class="bottom-card">
              <div class="bottom-card-header" style="background: #fee2e2; color: #991b1b;">
                C. Where They Pay Short
              </div>
              <div class="bottom-card-body">
                ${d.shortfallItems.map(s => `<div>${s.period}: <strong>₹${Number(s.amount).toLocaleString('en-IN')}</strong></div>`).join('')}
                <div style="margin-top: 6px; padding-top: 4px; border-top: 1px solid #cbd5e1; color: #dc2626; font-weight: 800;">
                  Total Shortfall: ₹${Number(d.totalShortfall).toLocaleString('en-IN')}
                </div>
              </div>
            </div>

            <div class="bottom-card">
              <div class="bottom-card-header" style="background: #dcfce7; color: #166534;">
                D. Where They Pay Extra
              </div>
              <div class="bottom-card-body">
                ${d.extraPaidItems.map(e => `<div>${e.period}: <strong>₹${Number(e.amount).toLocaleString('en-IN')}</strong></div>`).join('')}
                <div style="margin-top: 6px; padding-top: 4px; border-top: 1px solid #cbd5e1; color: #166534; font-weight: 800;">
                  Total Extra Paid: ₹${Number(d.totalExtraPaid).toLocaleString('en-IN')}
                </div>
              </div>
            </div>

            <div class="bottom-card">
              <div class="bottom-card-header" style="background: #f1f5f9; color: #0f172a;">
                E. Net Calculation
              </div>
              <div class="bottom-card-body">
                <div>Total Shortfall (C): ₹${Number(d.totalShortfall).toLocaleString('en-IN')}</div>
                <div>Less Extra Paid (D): -₹${Number(d.totalExtraPaid).toLocaleString('en-IN')}</div>
                <div style="margin-top: 6px; padding-top: 4px; border-top: 1px solid #cbd5e1; color: #dc2626; font-weight: 900; font-size: 11px;">
                  Net Due: ₹${Number(d.netOutstanding).toLocaleString('en-IN')}
                </div>
              </div>
            </div>

            <div class="bottom-card">
              <div class="bottom-card-header" style="background: #0b2b26; color: #c49b4f;">
                F. Overall Summary
              </div>
              <div class="bottom-card-body">
                <div>Total Due: ₹${Number(d.kpi.totalDue).toLocaleString('en-IN')}</div>
                <div>Total Paid: ₹${Number(d.kpi.totalPaid).toLocaleString('en-IN')}</div>
                <div style="margin-top: 6px; padding: 4px 6px; background: #0b2b26; color: #fde047; font-weight: 900; text-align: center; border-radius: 4px;">
                  Net Pending: ₹${Number(d.netOutstanding).toLocaleString('en-IN')}
                </div>
              </div>
            </div>
          </div>

          <div class="takeaways">
            <strong>Key Takeaways:</strong>
            ${d.takeaways.map(t => `<div>✓ ${t}</div>`).join('')}
            <div style="margin-top: 4px; color: #b45309; font-weight: 700;">
              ⭐ Extra payments of ₹6,300 have been adjusted against the shortfall to arrive at the Net Outstanding Balance of ₹6,900.
            </div>
          </div>

        </div>
        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 250);
          };
        </script>
      </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printDoc);
      printWindow.document.close();
    }
  }, []);

  return (
    <div className="times-of-india-tracker-s157">

      {/* ── Dark Banner ── */}
      <div className="times-of-india-tracker-s158">
        <div>
          <p className="times-of-india-tracker-s159">
            Corporate Member Flats (Times Horizon Private Limited)
          </p>
          <h2 className="times-of-india-tracker-s160">
            📰 Times of India Tracker
          </h2>
          <p className="times-of-india-tracker-s161">
            Flats A-302 · A-904 · A-1002 &nbsp;|&nbsp; Majestique Euriska
          </p>
        </div>

        <div className="times-of-india-tracker-s11">
          <StatChip label="Total"   value={totalBills}   bg="rgba(255,255,255,0.1)"  color="#fff"    />
          <StatChip label="Paid"    value={totalPaid}    bg="rgba(110,231,183,0.2)"  color="#6ee7b7" />
          <StatChip label="Pending" value={totalPending} bg="rgba(253,224,71,0.18)"  color="#fde047" />

          {/* Progress ring */}
          <div className="times-of-india-tracker-s162">
            <div className="times-of-india-tracker-s163">
              <svg width="44" height="44" viewBox="0 0 44 44">
                <circle cx="22" cy="22" r="18" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="5" />
                <circle cx="22" cy="22" r="18" fill="none" stroke="#6ee7b7" strokeWidth="5"
                  strokeDasharray={`${2 * Math.PI * 18}`}
                  strokeDashoffset={`${2 * Math.PI * 18 * (1 - donePercent / 100)}`}
                  strokeLinecap="round" transform="rotate(-90 22 22)"
                  className="times-of-india-tracker-s164"
                />
              </svg>
              <div className="times-of-india-tracker-s165">
                {donePercent}%
              </div>
            </div>
            <div>
              <div className="times-of-india-tracker-s166">Completion</div>
              <div className="times-of-india-tracker-s167">{totalPaid}/{totalBills}</div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              setInvoiceScope('all_pending');
              setIsInvoiceModalOpen(true);
            }}
            className="times-of-india-tracker-s168"
          >
            🧾 Generate TOI Invoices
          </button>

          <button
            type="button"
            onClick={() => {
              setInvoiceScope('all');
              handlePrintToiInvoices();
            }}
            className="times-of-india-tracker-s169"
          >
            🖨️ Print All 3 Flats
          </button>

          {saveStatus === 'saving' && <span className="times-of-india-tracker-s170">Saving…</span>}
          {saveStatus === 'saved'  && <span className="times-of-india-tracker-s171">{saveMsg}</span>}
          {saveStatus === 'error'  && <span className="times-of-india-tracker-s172">{saveMsg}</span>}
          {isLoading               && <span className="times-of-india-tracker-s173">Loading…</span>}
        </div>
      </div>

      {/* ── Prominent Banner: Payment Received Today (23-Oct-2026) ── */}
      <div className="times-of-india-tracker-s174">
        <div>
          <div className="times-of-india-tracker-s175">
            <span className="times-of-india-tracker-s176">
              ✓ PAYMENT RECEIVED TODAY (23-OCT-2026)
            </span>
            <span className="times-of-india-tracker-s177">
              Period: Oct 2026 – Mar 2027 (6 Months @ ₹3,000/mo)
            </span>
          </div>
          <div className="times-of-india-tracker-s178">
            Flats A-302 &amp; A-904 Cleared: ₹18,000 each (Total ₹36,000 Received)
          </div>
          <div className="times-of-india-tracker-s179">
            <span>• <strong>Flat A-302:</strong> ₹18,000 <span className="times-of-india-tracker-s180">(PAID IN FULL - Bal: ₹0)</span></span>
            <span>• <strong>Flat A-904:</strong> ₹18,000 <span className="times-of-india-tracker-s180">(PAID IN FULL - Bal: ₹0)</span></span>
            <span>• <strong>Flat A-1002:</strong> <span className="times-of-india-tracker-s181">₹31,200 PENDING</span> (Arrears ₹13,200 + Current ₹18,000)</span>
          </div>
        </div>
        <div className="times-of-india-tracker-s182">
          <div className="times-of-india-tracker-s183">
            <div className="times-of-india-tracker-s184">Received Today</div>
            <div className="times-of-india-tracker-s185">₹36,000</div>
          </div>
          <div className="times-of-india-tracker-s183">
            <div className="times-of-india-tracker-s186">A-1002 Balance</div>
            <div className="times-of-india-tracker-s187">₹31,200</div>
          </div>
        </div>
      </div>

      {/* ── Main Tab Switcher: Payment Reconciliation vs Flats Ledger ── */}
      <div className="times-of-india-tracker-s188">
        {[
          { id: 'reconciliation', label: '📊 Payment Reconciliation (Paid vs Pending: ₹6,900)', emoji: '⚖️' },
          { id: null, label: '🏢 All Flats Ledger (A-302, A-904, A-1002)', emoji: '📑' },
          ...FLAT_IDS.map(id => ({ id, label: `Flat ${id}`, emoji: '🏠' }))
        ].map(tab => (
          <button
            key={String(tab.id)}
            onClick={() => setActiveFlat(tab.id)}
            className={`times-of-india-tracker-s189 ${(activeFlat === tab.id ? 'times-of-india-tracker-cond-13-true' : 'times-of-india-tracker-cond-14-false')}`}
          >
            <span>{tab.emoji}</span> <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* ── Content View: Reconciliation View OR Flats Ledger ── */}
      {activeFlat === 'reconciliation' ? (
        <ToiReconciliationSection
          data={TOI_RECONCILIATION_DATA}
          onPrint={handlePrintReconciliation}
          onWhatsApp={handleShareReconciliationWhatsApp}
          onCopy={handleCopyReconciliationText}
          toast={reconciliationToast}
          onOpenInvoiceModal={(flatId) => {
            setInvoiceFlatId(flatId || 'A-302');
            setInvoiceScope(flatId ? 'single' : 'all');
            setIsInvoiceModalOpen(true);
          }}
        />
      ) : (
        <>
          {/* ── Summary Cards ── */}
          <div className="times-of-india-tracker-s190">
            {[
              { label: 'Grand Total (3 Flats)', value: fmt(TOTAL_PER_FLAT * 3), sub: `${fmt(TOTAL_PER_FLAT)} per flat`, accent: '#0b2b26' },
              { label: 'Amount Pending',        value: fmt(amtPending),          sub: 'Across all 3 flats',             accent: '#991b1b' },
              { label: 'Amount Paid',           value: fmt(amtPaid),             sub: 'Across all 3 flats',             accent: '#065f46' },
              { label: 'Per Flat Total',        value: fmt(TOTAL_PER_FLAT),      sub: '45 mos + 12 mos',                accent: '#196c6c' },
            ].map(c => (
              <div key={c.label} className="times-of-india-tracker-s191">
                <div className="times-of-india-tracker-s192">{c.label}</div>
                <div className="times-of-india-tracker-s193" style={{ color: c.accent }}>{c.value}</div>
                <div className="times-of-india-tracker-s194">{c.sub}</div>
              </div>
            ))}
          </div>

          {/* ── Rate Slab Banner ── */}
          <div className="times-of-india-tracker-s195">
            <span className="times-of-india-tracker-s196">📋 Rate Slabs:</span>
            <span className="times-of-india-tracker-s197">
              <span className="times-of-india-tracker-s198" />
              <b>Oct 2021 – Jun 2025</b>: ₹2,200 / year (₹183.33/mo)
            </span>
            <span className="times-of-india-tracker-s199">|</span>
            <span className="times-of-india-tracker-s197">
              <span className="times-of-india-tracker-s200" />
              <b>Jul 2025 – Sept 2026</b>: ₹3,000 / year (₹250.00/mo)
            </span>
          </div>

      {/* ── Flat Tables ── */}
      {visibleFlats.map(flat => {
        const paidAmt   = flat.bills.filter(b => b.status === 'Paid').reduce((s, b) => s + b.amount, 0);
        const pendAmt   = flat.bills.filter(b => b.status === 'Pending').reduce((s, b) => s + b.amount, 0);
        const paidCount = flat.bills.filter(b => b.status === 'Paid').length;
        const pct       = Math.round((paidAmt / TOTAL_PER_FLAT) * 100);

        return (
          <div key={flat.id} className="times-of-india-tracker-s201">

            {/* Card Header */}
            <div className="times-of-india-tracker-s202">
              <div className="times-of-india-tracker-s203">
                <div className="times-of-india-tracker-s204">
                  {flat.flatNo.split('-')[1]}
                </div>
                <div>
                  <div className="times-of-india-tracker-s205">Flat Member</div>
                  <div className="times-of-india-tracker-s206">{flat.flatNo}</div>
                </div>
              </div>

              <div className="times-of-india-tracker-s207">
                <div className="times-of-india-tracker-s208">
                  <div className="times-of-india-tracker-s209">
                    <span>{paidCount}/{flat.bills.length} paid</span>
                    <b className={`${(pct > 0 ? 'times-of-india-tracker-cond-15-true' : 'times-of-india-tracker-cond-16-false')}`}>{pct}%</b>
                  </div>
                  <div className="times-of-india-tracker-s210">
                    <div className={`times-of-india-tracker-s211 ${(pct > 0 ? 'times-of-india-tracker-cond-17-true' : 'times-of-india-tracker-cond-18-false')}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
                <div className="times-of-india-tracker-s212">
                  <div className="times-of-india-tracker-s213">Pending</div>
                  <div className={`times-of-india-tracker-s214 ${(pendAmt > 0 ? 'times-of-india-tracker-cond-19-true' : 'times-of-india-tracker-cond-20-false')}`}>{fmt(pendAmt)}</div>
                </div>
                <div className="times-of-india-tracker-s212">
                  <div className="times-of-india-tracker-s215">Paid</div>
                  <div className="times-of-india-tracker-s216">{fmt(paidAmt)}</div>
                </div>
                
                {/* Flat Action Buttons */}
                <div className="times-of-india-tracker-s217">
                  <button
                    type="button"
                    onClick={() => {
                      setInvoiceFlatId(flat.id);
                      setInvoiceScope('single');
                      setIsInvoiceModalOpen(true);
                    }}
                    className="times-of-india-tracker-s218"
                  >
                    🧾 Invoice
                  </button>
                  <button
                    type="button"
                    onClick={() => handleShareToiWhatsApp(flat)}
                    className="times-of-india-tracker-s219"
                    title="Share invoice summary on WhatsApp"
                  >
                    📱
                  </button>
                </div>
              </div>
            </div>

            {/* Table */}
            <div className="times-of-india-tracker-s35">
              <table className="times-of-india-tracker-s220">
                <thead>
                  <tr>
                    <th className="times-of-india-tracker-s221" style={{ ...TH_BASE }}>#</th>
                    <th className="times-of-india-tracker-s222" style={{ ...TH_BASE }}>Financial Year</th>
                    <th className="times-of-india-tracker-s222" style={{ ...TH_BASE }}>Period</th>
                    <th className="times-of-india-tracker-s223" style={{ ...TH_BASE }}>Months</th>
                    <th className="times-of-india-tracker-s223" style={{ ...TH_BASE }}>Rate / Year</th>
                    <th className="times-of-india-tracker-s212" style={{ ...TH_BASE }}>Amount</th>
                    <th className="times-of-india-tracker-s223" style={{ ...TH_BASE }}>Status</th>
                    {isAdmin && <th className="times-of-india-tracker-s223" style={{ ...TH_BASE }}>Action</th>}
                  </tr>
                </thead>
                <tbody>
                  {flat.bills.map((bill, idx) => {
                    const isPaid    = bill.status === 'Paid';
                    const isNewRate = bill.rate === 3000;
                    const rowBg     = isPaid ? 'rgba(209,250,229,0.1)' : 'transparent';
                    return (
                      <tr
                        key={bill.id}
                        className={`times-of-india-tracker-s224 ${(idx < flat.bills.length - 1 ? 'times-of-india-tracker-cond-21-true' : 'times-of-india-tracker-cond-22-false')}`} style={{ background: rowBg }}
                        onMouseEnter={e => { if (!isPaid) e.currentTarget.style.background = 'rgba(244,239,231,0.5)'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = rowBg; }}
                      >
                        <td className="times-of-india-tracker-s225" style={{ ...TD_BASE }}>{idx + 1}</td>
                        <td style={TD_BASE}>
                          <span className={`times-of-india-tracker-s226 ${(isNewRate ? 'times-of-india-tracker-cond-23-true' : 'times-of-india-tracker-cond-24-false')}`}>
                            {bill.year}
                          </span>
                        </td>
                        <td className="times-of-india-tracker-s227" style={{ ...TD_BASE }}>{bill.period}</td>
                        <td className="times-of-india-tracker-s228" style={{ ...TD_BASE }}>{bill.months}</td>
                        <td className={`times-of-india-tracker-s229 ${(isNewRate ? 'times-of-india-tracker-cond-25-true' : 'times-of-india-tracker-cond-26-false')}`} style={{ ...TD_BASE }}>
                          {fmt(bill.rate)}/yr
                        </td>
                        <td className="times-of-india-tracker-s230" style={{ ...TD_BASE }}>
                          {fmt(bill.amount)}
                        </td>
                        <td className="times-of-india-tracker-s223" style={{ ...TD_BASE }}>
                          <StatusBadge status={bill.status} />
                        </td>
                        {isAdmin && (
                          <td className="times-of-india-tracker-s223" style={{ ...TD_BASE }}>
                            <button onClick={() => toggleBill(flat.id, bill.id)} className={`times-of-india-tracker-s231 ${(isPaid ? 'times-of-india-tracker-cond-27-true' : 'times-of-india-tracker-cond-28-false')}`}>
                              {isPaid ? 'Unmark' : '✓ Mark Paid'}
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>

                {/* Grand Total Footer */}
                <tfoot>
                  <tr className="times-of-india-tracker-s232">
                    <td colSpan={3} className="times-of-india-tracker-s233" style={{ ...TD_BASE }}>
                      Grand Total ({TOTAL_MONTHS} Months)
                    </td>
                    <td className="times-of-india-tracker-s234" style={{ ...TD_BASE }}>
                      <span className="times-of-india-tracker-s235">
                        {TOTAL_MONTHS} mos
                      </span>
                    </td>
                    <td className="times-of-india-tracker-s236" style={{ ...TD_BASE }}>
                      45 × ₹2,200<br />21 × ₹3,000
                    </td>
                    <td className="times-of-india-tracker-s237" style={{ ...TD_BASE }}>
                      {fmt(TOTAL_PER_FLAT)}
                    </td>
                    <td className="times-of-india-tracker-s223" style={{ ...TD_BASE }}>
                      <span className={`times-of-india-tracker-s238 ${(pendAmt === 0 ? 'times-of-india-tracker-cond-29-true' : 'times-of-india-tracker-cond-30-false')}`} style={{ border: `1px solid ${pendAmt === 0 ? '#34d399' : '#fca5a5'}` }}>
                        {pendAmt === 0 ? '✓ Fully Paid' : `${fmt(pendAmt)} due`}
                      </span>
                    </td>
                    {isAdmin && <td />}
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Current Cycle (Oct 2026 – Mar 2027) Settlement Snapshot */}
            <div className={`times-of-india-tracker-s239 ${(flat.id === 'A-302' || flat.id === 'A-904' ? 'times-of-india-tracker-cond-31-true' : 'times-of-india-tracker-cond-32-false')}`}>
              <div>
                <div className="times-of-india-tracker-s240">
                  <span className={`times-of-india-tracker-s241 ${(flat.id === 'A-302' || flat.id === 'A-904' ? 'times-of-india-tracker-cond-33-true' : 'times-of-india-tracker-cond-34-false')}`}>
                    {(flat.id === 'A-302' || flat.id === 'A-904') ? '✓ Current Cycle: PAID' : '⏳ Current Cycle: PENDING'}
                  </span>
                  <span className={`times-of-india-tracker-s242 ${(flat.id === 'A-302' || flat.id === 'A-904' ? 'times-of-india-tracker-cond-35-true' : 'times-of-india-tracker-cond-36-false')}`}>
                    Oct 2026 – Mar 2027 (6 Mos @ ₹3,000/mo = ₹18,000)
                  </span>
                </div>
                <div className="times-of-india-tracker-s243">
                  {(flat.id === 'A-302' || flat.id === 'A-904')
                    ? `Payment Received Today (23-10-2026): ₹18,000 • Net Balance Due: ₹0 (Paid in Full)`
                    : `Flat A-1002 Balance Due: ₹31,200 (Arrears Oct 24–Mar 25: ₹13,200 + Current Oct 26–Mar 27: ₹18,000)`}
                </div>
                <div className="times-of-india-tracker-s244">
                  Maint: ₹2,850 × 6 = ₹17,100 | Sinking: ₹150 × 6 = ₹900 | Ref: {flat.id === 'A-302' ? 'ME/A/18/Oct26' : (flat.id === 'A-904' ? 'ME/A/16/Oct-26' : 'ME/A/17/Oct-26')}
                </div>
              </div>
              <div className="times-of-india-tracker-s212">
                <div className={`times-of-india-tracker-s245 ${(flat.id === 'A-302' || flat.id === 'A-904' ? 'times-of-india-tracker-cond-37-true' : 'times-of-india-tracker-cond-38-false')}`}>
                  {(flat.id === 'A-302' || flat.id === 'A-904') ? 'Paid Today' : 'Total Pending'}
                </div>
                <div className={`times-of-india-tracker-s246 ${(flat.id === 'A-302' || flat.id === 'A-904' ? 'times-of-india-tracker-cond-39-true' : 'times-of-india-tracker-cond-40-false')}`}>
                  {(flat.id === 'A-302' || flat.id === 'A-904') ? '₹18,000' : '₹31,200'}
                </div>
              </div>
            </div>
          </div>
        );
      })}
        </>
      )}

      {/* ── TOI INVOICE GENERATOR MODAL ── */}
      {isInvoiceModalOpen && (
        <div className="times-of-india-tracker-s247">
          <div className="times-of-india-tracker-s248">
            
            {/* Modal Header */}
            <div className="times-of-india-tracker-s249">
              <div>
                <span className="times-of-india-tracker-s250">Society Subscription Billing</span>
                <h3 className="times-of-india-tracker-s251">🧾 Times of India Subscription Invoice Generator</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsInvoiceModalOpen(false)}
                className="times-of-india-tracker-s252"
              >
                ✕
              </button>
            </div>

            {/* Modal Body: Split view */}
            <div className="times-of-india-tracker-s253">
              
              {/* Left Column: Form & Configuration */}
              <div className="times-of-india-tracker-s254">
                
                {/* Target Scope Selection */}
                <div>
                  <label className="times-of-india-tracker-s255">
                    1. Select Target Flat(s)
                  </label>
                  <div className="times-of-india-tracker-s256">
                    <button
                      type="button"
                      onClick={() => setInvoiceScope('single')}
                      className={`times-of-india-tracker-s257 ${(invoiceScope === 'single' ? 'times-of-india-tracker-cond-41-true' : 'times-of-india-tracker-cond-42-false')}`}
                    >
                      Single Flat
                    </button>
                    <button
                      type="button"
                      onClick={() => setInvoiceScope('all_pending')}
                      className={`times-of-india-tracker-s257 ${(invoiceScope === 'all_pending' ? 'times-of-india-tracker-cond-43-true' : 'times-of-india-tracker-cond-44-false')}`}
                    >
                      Pending Flats ({flats.filter(f => getFlatInvoiceData(f).pendingAmount > 0).length})
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => setInvoiceScope('all')}
                    className={`times-of-india-tracker-s258 ${(invoiceScope === 'all' ? 'times-of-india-tracker-cond-45-true' : 'times-of-india-tracker-cond-46-false')}`}
                  >
                    All 3 Flats (A-302, A-904, A-1002 Batch)
                  </button>
                </div>

                {/* Single Flat Selector Pills */}
                {invoiceScope === 'single' && (
                  <div>
                    <label className="times-of-india-tracker-s259">
                      Choose Specific Flat:
                    </label>
                    <div className="times-of-india-tracker-s260">
                      {flats.map(f => {
                        const sData = getFlatInvoiceData(f);
                        const isSelected = invoiceFlatId === f.id;
                        return (
                          <button
                            key={f.id}
                            type="button"
                            onClick={() => setInvoiceFlatId(f.id)}
                            className={`times-of-india-tracker-s261 ${(isSelected ? 'times-of-india-tracker-cond-47-true' : 'times-of-india-tracker-cond-48-false')}`}
                          >
                            <div>{f.flatNo}</div>
                            <div className={`times-of-india-tracker-s262 ${(isSelected ? 'times-of-india-tracker-cond-49-true' : 'times-of-india-tracker-cond-50-false')}`}>
                              ₹{formatValue(sData.pendingAmount)} due
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 2. Choose Invoice Mode */}
                <div>
                  <label className="times-of-india-tracker-s263">
                    2. Invoice Billing Structure
                  </label>
                  <div className="times-of-india-tracker-s256">
                    <button
                      type="button"
                      onClick={() => setModalMode('month_range')}
                      className={`times-of-india-tracker-s264 ${(modalMode === 'month_range' ? 'times-of-india-tracker-cond-51-true' : 'times-of-india-tracker-cond-52-false')}`}
                    >
                      📅 Month-Range Combined
                    </button>
                    <button
                      type="button"
                      onClick={() => setModalMode('historical')}
                      className={`times-of-india-tracker-s264 ${(modalMode === 'historical' ? 'times-of-india-tracker-cond-53-true' : 'times-of-india-tracker-cond-54-false')}`}
                    >
                      📑 60-Mo TOI Ledger
                    </button>
                  </div>
                </div>

                {/* If Month-Range Mode: Select start month, end month, sinking fund 150, maintenance 2850 */}
                {modalMode === 'month_range' && (
                  <div className="times-of-india-tracker-s265">
                    <div className="times-of-india-tracker-s266">
                      <span className="times-of-india-tracker-s267">
                        📅 Billing Month Range
                      </span>
                      <span className="times-of-india-tracker-s268">
                        {rangeMonthsCount} Months Counted
                      </span>
                    </div>

                    <div className="times-of-india-tracker-s269">
                      <div>
                        <label className="times-of-india-tracker-s270">
                          Start Month
                        </label>
                        <input
                          type="month"
                          value={rangeStartMonth}
                          onChange={(e) => setRangeStartMonth(e.target.value)}
                          className="times-of-india-tracker-s271"
                        />
                      </div>
                      <div>
                        <label className="times-of-india-tracker-s270">
                          End Month
                        </label>
                        <input
                          type="month"
                          value={rangeEndMonth}
                          onChange={(e) => setRangeEndMonth(e.target.value)}
                          className="times-of-india-tracker-s271"
                        />
                      </div>
                    </div>

                    {/* Presets */}
                    <div className="times-of-india-tracker-s272">
                      <button type="button" onClick={() => { setRangeStartMonth('2024-04'); setRangeEndMonth('2025-03'); }} className="times-of-india-tracker-s273">
                        FY 24-25 (12m)
                      </button>
                      <button type="button" onClick={() => { setRangeStartMonth('2025-04'); setRangeEndMonth('2026-03'); }} className="times-of-india-tracker-s273">
                        FY 25-26 (12m)
                      </button>
                      <button type="button" onClick={() => { setRangeStartMonth('2026-04'); setRangeEndMonth('2026-09'); }} className="times-of-india-tracker-s273">
                        Last 6 Mos
                      </button>
                      <button type="button" onClick={() => { setRangeStartMonth('2021-10'); setRangeEndMonth('2026-09'); }} className="times-of-india-tracker-s274">
                        Full 60 Mos
                      </button>
                    </div>

                    {/* Rates & Calculations */}
                    <div className="times-of-india-tracker-s275">
                      <div className="times-of-india-tracker-s276">
                        <label className="times-of-india-tracker-s277">
                          Maintenance (₹/mo)
                        </label>
                        <input
                          type="number"
                          value={maintenanceRate}
                          onChange={(e) => setMaintenanceRate(Number(e.target.value) || 0)}
                          className="times-of-india-tracker-s278"
                        />
                        <div className="times-of-india-tracker-s279">
                          {rangeMonthsCount} mos × ₹{formatValue(maintenanceRate)} = <strong>₹{formatValue(rangeMaintenanceTotal)}</strong>
                        </div>
                      </div>

                      <div className="times-of-india-tracker-s276">
                        <label className="times-of-india-tracker-s277">
                          Sinking Fund (₹/mo)
                        </label>
                        <input
                          type="number"
                          value={sinkingFundRate}
                          onChange={(e) => setSinkingFundRate(Number(e.target.value) || 0)}
                          className="times-of-india-tracker-s278"
                        />
                        <div className="times-of-india-tracker-s279">
                          {rangeMonthsCount} mos × ₹{formatValue(sinkingFundRate)} = <strong>₹{formatValue(rangeSinkingFundTotal)}</strong>
                        </div>
                      </div>
                    </div>

                    {/* Grand Total Bar */}
                    <div className="times-of-india-tracker-s280">
                      <div className="times-of-india-tracker-s281">
                        Payable ({rangeMonthsCount} Mos):
                      </div>
                      <div className="times-of-india-tracker-s282">
                        ₹{formatValue(rangeGrandTotal)}
                      </div>
                    </div>
                  </div>
                )}

                {/* Dates & Reference Configuration */}
                <div className="times-of-india-tracker-s269">
                  <div>
                    <label className="times-of-india-tracker-s283">
                      Invoice Date
                    </label>
                    <input
                      type="date"
                      value={invoiceDate}
                      onChange={(e) => setInvoiceDate(e.target.value)}
                      className="times-of-india-tracker-s284"
                    />
                  </div>
                  <div>
                    <label className="times-of-india-tracker-s285">
                      Payment Due Date
                    </label>
                    <input
                      type="date"
                      value={invoiceDueDate}
                      onChange={(e) => setInvoiceDueDate(e.target.value)}
                      className="times-of-india-tracker-s286"
                    />
                  </div>
                </div>

                <div>
                  <label className="times-of-india-tracker-s283">
                    Invoice Number Prefix
                  </label>
                  <input
                    type="text"
                    value={invoiceRefPrefix}
                    onChange={(e) => setInvoiceRefPrefix(e.target.value)}
                    className="times-of-india-tracker-s284"
                  />
                </div>

                {/* Custom Resolution / Note */}
                <div>
                  <label className="times-of-india-tracker-s283">
                    Society Resolution &amp; Terms
                  </label>
                  <textarea
                    rows={3}
                    value={invoiceCustomNote}
                    onChange={(e) => setInvoiceCustomNote(e.target.value)}
                    className="times-of-india-tracker-s287"
                  />
                </div>

                {/* Society Bank Details Quick Preview */}
                <div className="times-of-india-tracker-s288">
                  <div className="times-of-india-tracker-s289">
                    <span>🏦 Society Bank Remittance Info</span>
                  </div>
                  <div><strong>Bank:</strong> HDFC Bank • CA-INSTITUTION</div>
                  <div><strong>A/C:</strong> 50200075533530</div>
                  <div><strong>IFSC:</strong> HDFC0002454 (Undri / NIBM Road)</div>
                </div>
              </div>

              {/* Right Column: Live Letterhead Preview */}
              <div className="times-of-india-tracker-s290">
                
                {/* Simulated Paper Document */}
                <div className="times-of-india-tracker-s291">
                  {/* Letterhead */}
                  <div className="times-of-india-tracker-s292">
                    <div className="times-of-india-tracker-s293">
                      MAJESTIQUE EURISKA 'A' BUILDING CO-OP HOUSING SOCIETY LTD.
                    </div>
                    <div className="times-of-india-tracker-s294">
                      Reg. No: PNA/PNA (4)/HSG/(TC)/21207/2019-20 • Mohammed Wadi, Pune - 411060
                    </div>
                    <span className="times-of-india-tracker-s295">
                      {modalMode === 'month_range' ? 'MAINTENANCE, SINKING FUND & TOI • TAX INVOICE' : 'TIMES OF INDIA SUBSCRIPTION • TAX INVOICE'}
                    </span>
                  </div>

                  {/* Ref & Date */}
                  <div className="times-of-india-tracker-s296">
                    <div><strong>Invoice No:</strong> {invoiceRefPrefix}{activeInvoiceFlat.flatNo.replace('-', '')}</div>
                    <div><strong>Invoice Date:</strong> {formatDisplayDate(invoiceDate)}</div>
                  </div>

                  {/* Recipient */}
                  <div className="times-of-india-tracker-s297">
                    <div className="times-of-india-tracker-s298">BILLED TO:</div>
                    <div className="times-of-india-tracker-s299">Flat {activeInvoiceFlat.flatNo} Member / Resident</div>
                    <div className="times-of-india-tracker-s300">
                      {modalMode === 'month_range'
                        ? `Billing Period: ${formatMonthYearLabel(rangeStartMonth)} to ${formatMonthYearLabel(rangeEndMonth)} (${rangeMonthsCount} Months)`
                        : 'Facility: Times of India Newspaper Subscription (60 Months)'}
                    </div>
                  </div>

                  {/* Dues Table: Month-Range mode vs Historical mode */}
                  {modalMode === 'month_range' ? (
                    <table className="times-of-india-tracker-s301">
                      <thead>
                        <tr className="times-of-india-tracker-s302">
                          <th className="times-of-india-tracker-s303">#</th>
                          <th className="times-of-india-tracker-s303">Particulars</th>
                          <th className="times-of-india-tracker-s304">Months</th>
                          <th className="times-of-india-tracker-s304">Rate / Mo</th>
                          <th className="times-of-india-tracker-s305">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="times-of-india-tracker-s44">
                          <td className="times-of-india-tracker-s304">1</td>
                          <td className="times-of-india-tracker-s306">Maintenance Charges</td>
                          <td className="times-of-india-tracker-s304">{rangeMonthsCount}m</td>
                          <td className="times-of-india-tracker-s304">₹{formatValue(maintenanceRate)}</td>
                          <td className="times-of-india-tracker-s307">₹{formatValue(rangeMaintenanceTotal)}</td>
                        </tr>
                        <tr className="times-of-india-tracker-s44">
                          <td className="times-of-india-tracker-s304">2</td>
                          <td className="times-of-india-tracker-s306">Sinking Fund</td>
                          <td className="times-of-india-tracker-s304">{rangeMonthsCount}m</td>
                          <td className="times-of-india-tracker-s304">₹{formatValue(sinkingFundRate)}</td>
                          <td className="times-of-india-tracker-s307">₹{formatValue(rangeSinkingFundTotal)}</td>
                        </tr>
                        <tr className="times-of-india-tracker-s308">
                          <td colSpan={2} className="times-of-india-tracker-s309">Base Society Subtotal:</td>
                          <td className="times-of-india-tracker-s310">{rangeMonthsCount}m</td>
                          <td className="times-of-india-tracker-s310">₹{formatValue(Number(maintenanceRate) + Number(sinkingFundRate))}</td>
                          <td className="times-of-india-tracker-s311">₹{formatValue(rangeBaseTotal)}</td>
                        </tr>
                        <tr className="times-of-india-tracker-s94">
                          <td colSpan={4} className="times-of-india-tracker-s312">NET AMOUNT PAYABLE:</td>
                          <td className="times-of-india-tracker-s313">
                            ₹{formatValue(rangeGrandTotal)}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  ) : (
                    <table className="times-of-india-tracker-s301">
                      <thead>
                        <tr className="times-of-india-tracker-s302">
                          <th className="times-of-india-tracker-s303">Period / Financial Year</th>
                          <th className="times-of-india-tracker-s304">Months</th>
                          <th className="times-of-india-tracker-s305">Amount</th>
                          <th className="times-of-india-tracker-s304">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {activeInvoiceFlat.bills.map((b) => (
                          <tr key={b.id} className="times-of-india-tracker-s44">
                            <td className="times-of-india-tracker-s314">{b.year} ({b.period})</td>
                            <td className="times-of-india-tracker-s304">{b.months}m</td>
                            <td className="times-of-india-tracker-s315">₹{formatValue(b.amount)}</td>
                            <td className="times-of-india-tracker-s304">
                              <span className={`times-of-india-tracker-s316 ${(b.status === 'Paid' ? 'times-of-india-tracker-cond-55-true' : 'times-of-india-tracker-cond-56-false')}`}>
                                {b.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                        <tr className="times-of-india-tracker-s317">
                          <td colSpan={2} className="times-of-india-tracker-s318">Total 60-Month Subscription:</td>
                          <td className="times-of-india-tracker-s319">₹{formatValue(activeInvoiceData.totalBilled)}</td>
                          <td></td>
                        </tr>
                        <tr className="times-of-india-tracker-s320">
                          <td colSpan={2} className="times-of-india-tracker-s318">Total Payments Received:</td>
                          <td className="times-of-india-tracker-s319">(-) ₹{formatValue(activeInvoiceData.paidAmount)}</td>
                          <td></td>
                        </tr>
                        <tr className="times-of-india-tracker-s94">
                          <td colSpan={2} className="times-of-india-tracker-s321">NET AMOUNT PAYABLE:</td>
                          <td className="times-of-india-tracker-s322">
                            ₹{formatValue(activeInvoiceData.pendingAmount)}
                          </td>
                          <td></td>
                        </tr>
                      </tbody>
                    </table>
                  )}

                  {/* Due banner */}
                  <div className="times-of-india-tracker-s323">
                    <div>
                      <span className="times-of-india-tracker-s324">Payment Due Date: </span>
                      <strong className="times-of-india-tracker-s325">{formatDisplayDate(invoiceDueDate)}</strong>
                    </div>
                    <span className="times-of-india-tracker-s324">HDFC A/C: 50200075533530</span>
                  </div>

                  {/* Signatures */}
                  <div className="times-of-india-tracker-s326">
                    <div><div className="times-of-india-tracker-s327">Society Manager</div></div>
                    <div><div className="times-of-india-tracker-s327">Hon. Secretary</div></div>
                    <div><div className="times-of-india-tracker-s327">Hon. Treasurer</div></div>
                  </div>
                </div>

                {invoiceToast && (
                  <div className="times-of-india-tracker-s328">
                    {invoiceToast}
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer Toolbar */}
            <div className="times-of-india-tracker-s329">
              <div className="times-of-india-tracker-s330">
                Selected Flat(s): <strong>{invoiceScope === 'single' ? activeInvoiceFlat.flatNo : invoiceScope === 'all_pending' ? `Pending Flats (${flatsForInvoice.length})` : 'All 3 Flats'}</strong>
              </div>

              <div className="times-of-india-tracker-s11">
                {invoiceScope === 'single' && (
                  <>
                    <button
                      type="button"
                      onClick={() => handleCopyFlatInvoiceText(activeInvoiceFlat)}
                      className="times-of-india-tracker-s331"
                    >
                      📋 Copy Text
                    </button>
                    <button
                      type="button"
                      onClick={() => handleShareToiWhatsApp(activeInvoiceFlat)}
                      className="times-of-india-tracker-s332"
                    >
                      📱 Send WhatsApp
                    </button>
                  </>
                )}

                <button
                  type="button"
                  onClick={handlePrintToiInvoices}
                  className="times-of-india-tracker-s333"
                >
                  🖨️ Print / Download PDF ({flatsForInvoice.length} Invoice{flatsForInvoice.length > 1 ? 's' : ''})
                </button>

                <button
                  type="button"
                  onClick={() => setIsInvoiceModalOpen(false)}
                  className="times-of-india-tracker-s334"
                >
                  Close
                </button>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
