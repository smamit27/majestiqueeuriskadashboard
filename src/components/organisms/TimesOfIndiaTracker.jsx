import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { db, ensureFirebaseSession, isFirebaseConfigured } from '../../firebase.js';

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
// Jul 2025 – Sept 2026 : ₹3,000 / year  (15 months)
const BILLS_TEMPLATE = [
  { id: 1, year: 'FY 2021-22',       period: 'Oct 2021 – Mar 2022',  months: 6,  rate: 2200, amount: 13200 },
  { id: 2, year: 'FY 2022-23',       period: 'Apr 2022 – Mar 2023',  months: 12, rate: 2200, amount: 26400 },
  { id: 3, year: 'FY 2023-24',       period: 'Apr 2023 – Mar 2024',  months: 12, rate: 2200, amount: 26400 },
  { id: 4, year: 'FY 2024-25',       period: 'Apr 2024 – Mar 2025',  months: 12, rate: 2200, amount: 26400 },
  { id: 5, year: 'FY 2025-26 (I)',   period: 'Apr 2025 – Jun 2025',  months: 3,  rate: 2200, amount: 6600  },
  { id: 6, year: 'FY 2025-26 (II)',  period: 'Jul 2025 – Sept 2026', months: 15, rate: 3000, amount: 45000 },
];

const TOTAL_PER_FLAT = BILLS_TEMPLATE.reduce((s, b) => s + b.amount, 0); // ₹1,44,000
const TOTAL_MONTHS   = BILLS_TEMPLATE.reduce((s, b) => s + b.months, 0); // 60 months
const FLAT_IDS = ['A-302', 'A-904', 'A-1002'];

const makeDefaultFlats = () =>
  FLAT_IDS.map(id => ({
    id, flatNo: id,
    bills: BILLS_TEMPLATE.map(b => ({ ...b, status: 'Pending' })),
  }));

const normalizeFlats = (raw) => {
  if (!Array.isArray(raw) || raw.length === 0) {
    return makeDefaultFlats();
  }
  return FLAT_IDS.map(flatId => {
    const existing = raw.find(f => f.id === flatId || f.flatNo === flatId);
    const existingBills = existing?.bills || [];

    const updatedBills = BILLS_TEMPLATE.map(t => {
      let matched = existingBills.find(b => b.id === t.id);
      if (!matched && t.id === 6) {
        matched = existingBills.find(b => b.id === 6 || (b.period && b.period.includes('Jul 2025')));
      }
      return {
        ...t,
        status: matched ? matched.status : 'Pending'
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
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '4px 11px', borderRadius: 20, fontSize: '0.72rem', fontWeight: 700,
      background: ok ? 'rgba(209,250,229,0.7)' : 'rgba(253,224,71,0.28)',
      color: ok ? '#065f46' : '#92400e',
      border: `1px solid ${ok ? '#34d399' : '#fbbf24'}`,
      whiteSpace: 'nowrap',
    }}>
      {ok ? '✓ Paid' : '⏳ Pending'}
    </span>
  );
}

function StatChip({ label, value, bg, color }) {
  return (
    <div style={{ textAlign: 'center', background: bg, borderRadius: 10, padding: '8px 14px', minWidth: 56 }}>
      <div style={{ fontSize: '1.15rem', fontWeight: 800, color, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.55)', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 2 }}>{label}</div>
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
    totalDue: 432000,
    totalDuePeriod: 'Oct 2021 to Sept 2026',
    totalDueBreakdown: '60 Months × 3 Flats (₹1,44,000 per flat)',
    totalPaid: 425100,
    paidBreakdown: '(₹3,43,500 + ₹81,600)',
    netOutstanding: 6900,
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
    { period: 'Oct 2024 – Mar 2025 (Short Paid)', amount: 13200 }
  ],
  totalShortfall: 13200,
  extraPaidItems: [
    { period: 'Oct 2021 – Sept 2022 (Extra Paid)', amount: 2400 },
    { period: 'Apr 2023 – Mar 2024 (Extra Paid)', amount: 3000 },
    { period: 'Apr 2025 – Sept 2025 (Extra Paid)', amount: 900 }
  ],
  totalExtraPaid: 6300,
  netOutstanding: 6900,
  takeaways: [
    'No missing bill for Oct 2021 – Sept 2022. Extra paid by ₹2,400.',
    'All payments are mapped against corresponding periods.',
    'Only shortfall is for Oct 2024 – Mar 2025.',
    'Apr 2026 – Sept 2026: Payment received on 23-06-2026 in HDFC account (₹54,000).'
  ],
  notes: [
    '1. Maintenance includes 3 Flats: 302, 904, 1002 (₹1,44,000 per flat × 3 = ₹4,32,000)',
    '2. All amounts are in Indian Rupees (₹)',
    'Extra payments of ₹6,300 have been adjusted against the shortfall to arrive at the Net Outstanding Balance.'
  ]
};

function ToiReconciliationSection({ data, onPrint, onWhatsApp, onCopy, toast, onOpenInvoiceModal }) {
  const d = data;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      
      {/* Toast Notification */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 99999,
          background: '#065f46', color: '#fff', padding: '12px 20px', borderRadius: 10,
          boxShadow: '0 10px 25px rgba(0,0,0,0.2)', fontSize: '0.85rem', fontWeight: 700,
          display: 'flex', alignItems: 'center', gap: 8, animation: 'fadeIn 0.2s ease'
        }}>
          {toast}
        </div>
      )}

      {/* ── Main Reconciliation Header Card ── */}
      <div style={{
        background: 'linear-gradient(135deg, #0b2b26 0%, #164e63 100%)',
        borderRadius: 20, padding: '22px 26px', color: '#fff',
        boxShadow: '0 6px 28px rgba(11,43,38,0.22)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16
      }}>
        <div>
          <div style={{
            fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em',
            color: '#c49b4f', marginBottom: 4
          }}>
            Official Society Statement
          </div>
          <h2 style={{ margin: 0, fontSize: '1.38rem', fontWeight: 800, letterSpacing: '0.01em', color: '#fff' }}>
            {d.title}
          </h2>
          <p style={{ margin: '4px 0 0', fontSize: '0.82rem', color: 'rgba(255,255,255,0.7)', fontWeight: 500 }}>
            {d.subtitle}
          </p>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <button
            type="button"
            onClick={onPrint}
            style={{
              padding: '9px 16px', borderRadius: 999,
              background: 'linear-gradient(135deg, #c49b4f 0%, #b38634 100%)',
              color: '#0b2b26', border: 'none', fontWeight: 800, cursor: 'pointer',
              fontSize: '0.82rem', display: 'inline-flex', alignItems: 'center', gap: 6,
              boxShadow: '0 4px 14px rgba(196,155,79,0.35)', transition: 'all 0.18s'
            }}
          >
            🖨️ Print Statement / PDF
          </button>

          <button
            type="button"
            onClick={onWhatsApp}
            style={{
              padding: '9px 16px', borderRadius: 999,
              background: '#25D366', color: '#fff', border: 'none', fontWeight: 800,
              cursor: 'pointer', fontSize: '0.82rem', display: 'inline-flex', alignItems: 'center', gap: 6,
              boxShadow: '0 4px 14px rgba(37,211,102,0.35)', transition: 'all 0.18s'
            }}
          >
            📱 Share on WhatsApp
          </button>

          <button
            type="button"
            onClick={onCopy}
            style={{
              padding: '9px 15px', borderRadius: 999,
              background: 'rgba(255,255,255,0.12)', color: '#fff',
              border: '1px solid rgba(255,255,255,0.25)', fontWeight: 700,
              cursor: 'pointer', fontSize: '0.82rem', display: 'inline-flex', alignItems: 'center', gap: 6,
              backdropFilter: 'blur(8px)', transition: 'all 0.18s'
            }}
          >
            📋 Copy Summary
          </button>

          <button
            type="button"
            onClick={() => onOpenInvoiceModal && onOpenInvoiceModal()}
            style={{
              padding: '9px 15px', borderRadius: 999,
              background: 'rgba(255,255,255,0.12)', color: '#fff',
              border: '1px solid rgba(255,255,255,0.25)', fontWeight: 700,
              cursor: 'pointer', fontSize: '0.82rem', display: 'inline-flex', alignItems: 'center', gap: 6,
              backdropFilter: 'blur(8px)', transition: 'all 0.18s'
            }}
          >
            🧾 New Invoice
          </button>
        </div>
      </div>

      {/* ── Top 5 KPI Cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
        
        {/* Card 1: Rate till June 2025 */}
        <div style={{
          background: 'rgba(255,250,242,0.98)', border: '1px solid rgba(61,63,52,0.12)',
          borderRadius: 14, padding: '16px 18px', boxShadow: '0 2px 10px rgba(11,43,38,0.05)',
          display: 'flex', flexDirection: 'column', justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <span style={{ fontSize: '1.25rem' }}>📅</span>
            <span style={{ fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#5f665f' }}>
              Rate till June 2025
            </span>
          </div>
          <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0b2b26', lineHeight: 1.2 }}>
            ₹2,200 <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#5f665f' }}>/ mo / flat</span>
          </div>
          <div style={{ fontSize: '0.7rem', color: '#8a9080', marginTop: 4 }}>
            Period: Oct 2021 – Jun 2025 (45 mos)
          </div>
        </div>

        {/* Card 2: Rate from July 2025 */}
        <div style={{
          background: 'rgba(255,250,242,0.98)', border: '1px solid rgba(61,63,52,0.12)',
          borderRadius: 14, padding: '16px 18px', boxShadow: '0 2px 10px rgba(11,43,38,0.05)',
          display: 'flex', flexDirection: 'column', justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <span style={{ fontSize: '1.25rem' }}>📈</span>
            <span style={{ fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#5f665f' }}>
              Rate from July 2025
            </span>
          </div>
          <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#164e63', lineHeight: 1.2 }}>
            ₹3,000 <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#5f665f' }}>/ mo / flat</span>
          </div>
          <div style={{ fontSize: '0.7rem', color: '#8a9080', marginTop: 4 }}>
            Period: Jul 2025 – Sept 2026 (15 mos)
          </div>
        </div>

        {/* Card 3: Total Amount Due */}
        <div style={{
          background: 'rgba(255,250,242,0.98)', border: '1px solid rgba(61,63,52,0.12)',
          borderRadius: 14, padding: '16px 18px', boxShadow: '0 2px 10px rgba(11,43,38,0.05)',
          display: 'flex', flexDirection: 'column', justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <span style={{ fontSize: '1.25rem' }}>📑</span>
            <span style={{ fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#5f665f' }}>
              Total Amount Due (Oct 21–Sept 26)
            </span>
          </div>
          <div style={{ fontSize: '1.35rem', fontWeight: 900, color: '#0b2b26', lineHeight: 1.1 }}>
            ₹4,32,000
          </div>
          <div style={{ fontSize: '0.7rem', color: '#8a9080', marginTop: 4 }}>
            {d.kpi.totalDueBreakdown}
          </div>
        </div>

        {/* Card 4: Total Amount Paid */}
        <div style={{
          background: 'rgba(240,253,244,0.95)', border: '1px solid #86efac',
          borderRadius: 14, padding: '16px 18px', boxShadow: '0 2px 10px rgba(22,101,52,0.06)',
          display: 'flex', flexDirection: 'column', justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <span style={{ fontSize: '1.25rem' }}>💵</span>
            <span style={{ fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#166534' }}>
              Total Amount Paid (Till Date)
            </span>
          </div>
          <div style={{ fontSize: '1.35rem', fontWeight: 900, color: '#15803d', lineHeight: 1.1 }}>
            ₹4,25,100
          </div>
          <div style={{ fontSize: '0.72rem', color: '#166534', fontWeight: 600, marginTop: 4 }}>
            {d.kpi.paidBreakdown}
          </div>
        </div>

        {/* Card 5: Net Outstanding Balance */}
        <div style={{
          background: 'rgba(254,242,242,0.98)', border: '2px solid #f87171',
          borderRadius: 14, padding: '16px 18px', boxShadow: '0 4px 14px rgba(220,38,38,0.12)',
          display: 'flex', flexDirection: 'column', justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <span style={{ fontSize: '1.25rem' }}>⚠️</span>
            <span style={{ fontSize: '0.68rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#991b1b' }}>
              NET OUTSTANDING BALANCE
            </span>
          </div>
          <div style={{ fontSize: '1.45rem', fontWeight: 900, color: '#dc2626', lineHeight: 1.1 }}>
            ₹6,900
          </div>
          <div style={{ fontSize: '0.72rem', color: '#991b1b', fontWeight: 700, marginTop: 4 }}>
            Pending from TOI (Oct 24–Mar 25 net)
          </div>
        </div>

      </div>

      {/* ── SECTION A: Chronological Payment Timeline ── */}
      <div style={{
        background: 'rgba(255,250,242,0.98)', borderRadius: 18,
        border: '1px solid rgba(61,63,52,0.12)', boxShadow: '0 4px 20px rgba(11,43,38,0.06)',
        overflow: 'hidden'
      }}>
        <div style={{
          padding: '14px 20px', background: '#0b2b26', color: '#fff',
          fontSize: '0.82rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em',
          display: 'flex', alignItems: 'center', gap: 8
        }}>
          <span>A. CHRONOLOGICAL PAYMENT TIMELINE (All Payments Received)</span>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
            <thead>
              <tr style={{ background: '#f1f5f9', borderBottom: '2px solid #cbd5e1' }}>
                <th style={{ padding: '10px 12px', textAlign: 'center', width: 45, fontWeight: 800, color: '#334155' }}>Sr. No.</th>
                <th style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 800, color: '#334155', minWidth: 95 }}>Payment Date</th>
                <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 800, color: '#334155' }}>Payment Mode / Bank</th>
                <th style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 800, color: '#334155' }}>Amount Paid (₹)</th>
                <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 800, color: '#334155' }}>For Which Flats</th>
                <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 800, color: '#334155' }}>Maintenance Period Covered</th>
                <th style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 800, color: '#334155' }}>No. of Mos</th>
                <th style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 800, color: '#334155' }}>Rate / Flat</th>
                <th style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 800, color: '#334155' }}>Applicable (3 Flats)</th>
                <th style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 800, color: '#334155' }}>Diff (Paid - Exp)</th>
                <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 800, color: '#334155', minWidth: 240 }}>Remarks</th>
              </tr>
            </thead>
            <tbody>
              {d.chronologicalTimeline.map((item, idx) => (
                <React.Fragment key={item.srNo}>
                  <tr style={{
                    borderBottom: '1px solid #e2e8f0',
                    background: idx % 2 === 0 ? '#fff' : 'rgba(248,250,252,0.7)'
                  }}>
                    <td style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 700, color: '#64748b' }}>{item.srNo}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 700, color: '#b91c1c' }}>{item.paymentDate}</td>
                    <td style={{ padding: '10px 12px', fontWeight: 700, color: '#0f172a' }}>{item.paymentMode}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 800, color: '#0f172a' }}>{Number(item.amountPaid).toLocaleString('en-IN')}</td>
                    <td style={{ padding: '10px 12px', fontWeight: 700, color: '#b91c1c' }}>{item.forFlats}</td>
                    <td style={{ padding: '10px 12px', fontWeight: 700, color: '#b91c1c' }}>{item.periodCovered}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 700 }}>{item.months}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600 }}>{Number(item.ratePerFlat).toLocaleString('en-IN')}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 800, color: '#0b2b26' }}>{Number(item.amountFor3Flats).toLocaleString('en-IN')}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                      <span style={{
                        display: 'inline-block', padding: '3px 8px', borderRadius: 6, fontWeight: 800, fontSize: '0.74rem',
                        background: item.diff > 0 ? '#dcfce7' : '#f1f5f9',
                        color: item.diff > 0 ? '#15803d' : '#475569'
                      }}>
                        {item.diffLabel}
                      </span>
                    </td>
                    <td style={{ padding: '10px 12px', fontSize: '0.73rem', color: '#334155', lineHeight: 1.4, whiteSpace: 'pre-line' }}>
                      {item.remarks}
                    </td>
                  </tr>
                  {item.breakup && (
                    <tr style={{ background: '#fefce8', borderBottom: '1px solid #fef08a' }}>
                      <td colSpan={11} style={{ padding: '8px 14px', fontSize: '0.72rem', color: '#854d0e', fontWeight: 600 }}>
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
        <div style={{
          padding: '14px 20px', background: '#f8fafc', borderTop: '2px solid #e2e8f0',
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, alignItems: 'center'
        }}>
          <div>
            <div style={{ fontSize: '0.66rem', fontWeight: 800, textTransform: 'uppercase', color: '#15803d' }}>Summary Period</div>
            <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0f172a' }}>{d.sectionASummary.period}</div>
          </div>
          <div>
            <div style={{ fontSize: '0.66rem', fontWeight: 800, textTransform: 'uppercase', color: '#64748b' }}>Total Expected (3 Flats)</div>
            <div style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>₹{Number(d.sectionASummary.expectedFor3Flats).toLocaleString('en-IN')}</div>
          </div>
          <div>
            <div style={{ fontSize: '0.66rem', fontWeight: 800, textTransform: 'uppercase', color: '#166534' }}>Total Paid</div>
            <div style={{ fontSize: '1rem', fontWeight: 800, color: '#15803d' }}>₹{Number(d.sectionASummary.totalPaid).toLocaleString('en-IN')}</div>
          </div>
          <div>
            <div style={{ fontSize: '0.66rem', fontWeight: 800, textTransform: 'uppercase', color: '#15803d' }}>Difference (Paid - Exp)</div>
            <div style={{ fontSize: '1rem', fontWeight: 800, color: '#15803d' }}>{d.sectionASummary.diff}</div>
          </div>
          <div>
            <span style={{
              display: 'inline-block', padding: '5px 12px', borderRadius: 999,
              background: '#dcfce7', color: '#166534', fontWeight: 800, fontSize: '0.75rem'
            }}>
              ✓ {d.sectionASummary.status}
            </span>
          </div>
        </div>

        {/* Section A Conclusion Banner */}
        <div style={{
          padding: '10px 20px', background: '#f0fdf4', borderTop: '1px solid #bbf7d0',
          color: '#166534', fontSize: '0.78rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8
        }}>
          <span>✓</span>
          <span>{d.sectionASummary.conclusion}</span>
        </div>

      </div>

      {/* ── SECTION B: Period-Wise Reconciliation Statement ── */}
      <div style={{
        background: 'rgba(255,250,242,0.98)', borderRadius: 18,
        border: '1px solid rgba(61,63,52,0.12)', boxShadow: '0 4px 20px rgba(11,43,38,0.06)',
        overflow: 'hidden'
      }}>
        <div style={{
          padding: '14px 20px', background: '#0b2b26', color: '#fff',
          fontSize: '0.82rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em',
          display: 'flex', alignItems: 'center', gap: 8
        }}>
          <span>B. PERIOD-WISE RECONCILIATION STATEMENT</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 280px', gap: 0 }}>
          
          {/* Main Reconciliation Table */}
          <div style={{ overflowX: 'auto', borderRight: '1px solid #e2e8f0' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
              <thead>
                <tr style={{ background: '#f1f5f9', borderBottom: '2px solid #cbd5e1' }}>
                  <th style={{ padding: '9px 10px', textAlign: 'center', width: 40, fontWeight: 800, color: '#334155' }}>Sr. No.</th>
                  <th style={{ padding: '9px 10px', textAlign: 'left', fontWeight: 800, color: '#334155' }}>Period</th>
                  <th style={{ padding: '9px 10px', textAlign: 'center', width: 55, fontWeight: 800, color: '#334155' }}>Mos</th>
                  <th style={{ padding: '9px 10px', textAlign: 'center', fontWeight: 800, color: '#334155' }}>Rate / Flat</th>
                  <th style={{ padding: '9px 10px', textAlign: 'right', fontWeight: 800, color: '#334155' }}>Expected (3 Flats)</th>
                  <th style={{ padding: '9px 10px', textAlign: 'right', fontWeight: 800, color: '#334155' }}>Amount Paid (₹)</th>
                  <th style={{ padding: '9px 10px', textAlign: 'left', fontWeight: 800, color: '#334155' }}>Payment Date / Bank</th>
                  <th style={{ padding: '9px 10px', textAlign: 'center', fontWeight: 800, color: '#334155' }}>Difference</th>
                  <th style={{ padding: '9px 10px', textAlign: 'center', fontWeight: 800, color: '#334155' }}>Status / Remarks</th>
                </tr>
              </thead>
              <tbody>
                {d.periodWiseReconciliation.map((row, idx) => {
                  const isExtra = row.diff > 0;
                  const isShort = row.diff < 0;
                  return (
                    <tr key={row.srNo} style={{
                      borderBottom: '1px solid #e2e8f0',
                      background: isShort ? '#fef2f2' : (idx % 2 === 0 ? '#fff' : '#f8fafc')
                    }}>
                      <td style={{ padding: '9px 10px', textAlign: 'center', fontWeight: 700, color: '#64748b' }}>{row.srNo}</td>
                      <td style={{ padding: '9px 10px', fontWeight: 700, color: '#0f172a' }}>{row.period}</td>
                      <td style={{ padding: '9px 10px', textAlign: 'center', fontWeight: 700 }}>{row.months}</td>
                      <td style={{ padding: '9px 10px', textAlign: 'center', whiteSpace: 'pre-line', fontSize: '0.72rem', color: '#475569' }}>
                        {row.rate}
                      </td>
                      <td style={{ padding: '9px 10px', textAlign: 'right', fontWeight: 700, color: '#0f172a' }}>
                        ₹{Number(row.expected).toLocaleString('en-IN')}
                      </td>
                      <td style={{ padding: '9px 10px', textAlign: 'right', fontWeight: 800, color: isShort ? '#b91c1c' : '#15803d' }}>
                        ₹{Number(row.paid).toLocaleString('en-IN')}
                      </td>
                      <td style={{ padding: '9px 10px', fontSize: '0.72rem', color: '#475569', whiteSpace: 'pre-line' }}>
                        {row.paymentDetails}
                      </td>
                      <td style={{ padding: '9px 10px', textAlign: 'center' }}>
                        <span style={{
                          display: 'inline-block', padding: '2px 7px', borderRadius: 6,
                          fontWeight: 800, fontSize: '0.72rem',
                          background: isExtra ? '#dcfce7' : (isShort ? '#fee2e2' : '#f1f5f9'),
                          color: isExtra ? '#15803d' : (isShort ? '#b91c1c' : '#475569')
                        }}>
                          {row.diffLabel}
                        </span>
                      </td>
                      <td style={{ padding: '9px 10px', textAlign: 'center' }}>
                        <span style={{
                          display: 'inline-block', padding: '3px 8px', borderRadius: 999,
                          fontWeight: 800, fontSize: '0.68rem',
                          background: isShort ? '#fee2e2' : (isExtra ? '#dcfce7' : '#e0f2fe'),
                          color: isShort ? '#991b1b' : (isExtra ? '#166534' : '#0369a1')
                        }}>
                          {row.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr style={{ background: '#0b2b26', color: '#fff', fontWeight: 800 }}>
                  <td colSpan={2} style={{ padding: '12px 14px', textAlign: 'right', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    TOTAL
                  </td>
                  <td style={{ padding: '12px 10px', textAlign: 'center', color: '#c49b4f' }}>60</td>
                  <td style={{ padding: '12px 10px' }} />
                  <td style={{ padding: '12px 10px', textAlign: 'right', color: '#c49b4f' }}>
                    ₹4,32,000
                  </td>
                  <td style={{ padding: '12px 10px', textAlign: 'right', color: '#86efac' }}>
                    <div>₹4,25,100</div>
                    <div style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.7)', fontWeight: 500 }}>(3,43,500 + 81,600)</div>
                  </td>
                  <td style={{ padding: '12px 10px' }} />
                  <td style={{ padding: '12px 10px', textAlign: 'center', color: '#fca5a5' }}>
                    -6,900
                  </td>
                  <td style={{ padding: '12px 10px', textAlign: 'center', color: '#fca5a5', fontSize: '0.72rem' }}>
                    NET SHORTFALL
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Right Column: April-Sept 2025 Breakdown Card */}
          <div style={{
            padding: '16px', background: '#f8fafc', display: 'flex', flexDirection: 'column', gap: 12
          }}>
            <div style={{
              background: '#fff', border: '1px solid #cbd5e1', borderRadius: 12, padding: '14px',
              boxShadow: '0 2px 6px rgba(0,0,0,0.04)'
            }}>
              <div style={{
                fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em',
                color: '#0b2b26', marginBottom: 8, borderBottom: '1px solid #e2e8f0', paddingBottom: 4
              }}>
                {d.aprSep2025Details.title}
              </div>

              <div style={{ fontSize: '0.72rem', color: '#334155', display: 'flex', flexDirection: 'column', gap: 4 }}>
                <strong style={{ color: '#0f172a' }}>Expected Break-up for 3 Flats:</strong>
                {d.aprSep2025Details.breakup.map((bLine, i) => (
                  <div key={i} style={{ paddingLeft: 6, borderLeft: '2px solid #0b2b26', fontSize: '0.71rem' }}>
                    • {bLine}
                  </div>
                ))}
                <div style={{ marginTop: 4, fontWeight: 700, color: '#0b2b26' }}>
                  Total Expected = ₹{Number(d.aprSep2025Details.totalExpected).toLocaleString('en-IN')}
                </div>
              </div>

              <div style={{ marginTop: 10, paddingTop: 8, borderTop: '1px dashed #cbd5e1', fontSize: '0.72rem' }}>
                <div style={{ fontWeight: 700, color: '#15803d' }}>
                  {d.aprSep2025Details.paidText}
                </div>
                <div style={{ fontWeight: 800, color: '#166534', marginTop: 4 }}>
                  Difference: {d.aprSep2025Details.diffText}
                </div>
              </div>
            </div>

            {/* Quick Helper / Reminder */}
            <div style={{
              background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: 10,
              padding: '12px', fontSize: '0.72rem', color: '#065f46', lineHeight: 1.45
            }}>
              💡 <strong>Reconciliation Rule:</strong><br />
              All extra payments (+₹6,300) are mapped and adjusted against the pending amount of Flat 1002 (Oct 24–Mar 25: ₹13,200), resulting in exactly <strong>₹6,900 net pending</strong>.
            </div>
          </div>

        </div>
      </div>

      {/* ── BOTTOM 4 ANALYSIS CARDS (C, D, E, F) + KEY TAKEAWAYS ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 14 }}>
        
        {/* C. Where They Pay Short */}
        <div style={{
          background: 'rgba(255,250,242,0.98)', border: '1px solid #fecaca',
          borderRadius: 14, overflow: 'hidden', boxShadow: '0 2px 10px rgba(220,38,38,0.06)'
        }}>
          <div style={{ padding: '10px 14px', background: '#fee2e2', color: '#991b1b', fontWeight: 800, fontSize: '0.75rem', textTransform: 'uppercase' }}>
            C. WHERE THEY PAY SHORT
          </div>
          <div style={{ padding: '12px 14px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.74rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #e2e8f0', color: '#64748b' }}>
                  <th style={{ textAlign: 'left', paddingBottom: 6 }}>Particulars</th>
                  <th style={{ textAlign: 'right', paddingBottom: 6 }}>Amount (₹)</th>
                </tr>
              </thead>
              <tbody>
                {d.shortfallItems.map((item, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px dashed #f1f5f9' }}>
                    <td style={{ padding: '6px 0', color: '#334155' }}>{item.period}</td>
                    <td style={{ padding: '6px 0', textAlign: 'right', fontWeight: 700, color: '#dc2626' }}>
                      {Number(item.amount).toLocaleString('en-IN')}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ borderTop: '2px solid #f87171', fontWeight: 800 }}>
                  <td style={{ paddingTop: 8, color: '#991b1b', textTransform: 'uppercase' }}>TOTAL SHORTFALL</td>
                  <td style={{ paddingTop: 8, textAlign: 'right', color: '#dc2626', fontSize: '0.92rem' }}>
                    ₹{Number(d.totalShortfall).toLocaleString('en-IN')}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* D. Where They Pay Extra */}
        <div style={{
          background: 'rgba(255,250,242,0.98)', border: '1px solid #bbf7d0',
          borderRadius: 14, overflow: 'hidden', boxShadow: '0 2px 10px rgba(22,101,52,0.06)'
        }}>
          <div style={{ padding: '10px 14px', background: '#dcfce7', color: '#166534', fontWeight: 800, fontSize: '0.75rem', textTransform: 'uppercase' }}>
            D. WHERE THEY PAY EXTRA
          </div>
          <div style={{ padding: '12px 14px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.74rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #e2e8f0', color: '#64748b' }}>
                  <th style={{ textAlign: 'left', paddingBottom: 6 }}>Particulars</th>
                  <th style={{ textAlign: 'right', paddingBottom: 6 }}>Amount (₹)</th>
                </tr>
              </thead>
              <tbody>
                {d.extraPaidItems.map((item, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px dashed #f1f5f9' }}>
                    <td style={{ padding: '5px 0', color: '#334155' }}>{item.period}</td>
                    <td style={{ padding: '5px 0', textAlign: 'right', fontWeight: 700, color: '#15803d' }}>
                      {Number(item.amount).toLocaleString('en-IN')}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ borderTop: '2px solid #86efac', fontWeight: 800 }}>
                  <td style={{ paddingTop: 8, color: '#166534', textTransform: 'uppercase' }}>TOTAL EXTRA PAID</td>
                  <td style={{ paddingTop: 8, textAlign: 'right', color: '#15803d', fontSize: '0.92rem' }}>
                    ₹{Number(d.totalExtraPaid).toLocaleString('en-IN')}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* E. Net Outstanding Calculation */}
        <div style={{
          background: 'rgba(255,250,242,0.98)', border: '1px solid #cbd5e1',
          borderRadius: 14, overflow: 'hidden', boxShadow: '0 2px 10px rgba(15,23,42,0.06)'
        }}>
          <div style={{ padding: '10px 14px', background: '#f1f5f9', color: '#0f172a', fontWeight: 800, fontSize: '0.75rem', textTransform: 'uppercase' }}>
            E. NET OUTSTANDING CALCULATION
          </div>
          <div style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: 8, fontSize: '0.76rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569' }}>
              <span>Total Shortfall (C)</span>
              <strong style={{ color: '#dc2626' }}>₹{Number(d.totalShortfall).toLocaleString('en-IN')}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569' }}>
              <span>Less: Total Extra Paid (D)</span>
              <strong style={{ color: '#15803d' }}>- ₹{Number(d.totalExtraPaid).toLocaleString('en-IN')}</strong>
            </div>
            <div style={{
              marginTop: 6, paddingTop: 10, borderTop: '2px solid #cbd5e1',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center'
            }}>
              <span style={{ fontWeight: 800, color: '#0f172a', textTransform: 'uppercase' }}>NET OUTSTANDING BALANCE</span>
              <span style={{ fontSize: '1.2rem', fontWeight: 900, color: '#dc2626' }}>
                ₹{Number(d.netOutstanding).toLocaleString('en-IN')}
              </span>
            </div>
          </div>
        </div>

        {/* F. Overall Summary */}
        <div style={{
          background: 'rgba(255,250,242,0.98)', border: '1px solid #0b2b26',
          borderRadius: 14, overflow: 'hidden', boxShadow: '0 4px 14px rgba(11,43,38,0.1)'
        }}>
          <div style={{ padding: '10px 14px', background: '#0b2b26', color: '#c49b4f', fontWeight: 800, fontSize: '0.75rem', textTransform: 'uppercase' }}>
            F. OVERALL SUMMARY
          </div>
          <div style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: 6, fontSize: '0.76rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569' }}>
              <span>Total Amount Due (Oct 21–Sept 26)</span>
              <strong style={{ color: '#0f172a' }}>₹{Number(d.kpi.totalDue).toLocaleString('en-IN')}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569' }}>
              <span>Total Amount Paid (Till Date)</span>
              <strong style={{ color: '#15803d' }}>₹{Number(d.kpi.totalPaid).toLocaleString('en-IN')}</strong>
            </div>
            <div style={{
              marginTop: 8, padding: '10px 12px', background: '#0b2b26', borderRadius: 8,
              color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
            }}>
              <span style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                NET OUTSTANDING TO BE RECEIVED
              </span>
              <span style={{ fontSize: '1.15rem', fontWeight: 900, color: '#fde047' }}>
                ₹{Number(d.netOutstanding).toLocaleString('en-IN')}
              </span>
            </div>
          </div>
        </div>

      </div>

      {/* ── Key Takeaways & Footnotes ── */}
      <div style={{
        background: '#fff', borderRadius: 14, border: '1px solid #cbd5e1',
        padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 10
      }}>
        <div style={{ fontSize: '0.76rem', fontWeight: 800, textTransform: 'uppercase', color: '#0b2b26' }}>
          📌 KEY TAKEAWAYS
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: '0.76rem', color: '#334155' }}>
          {d.takeaways.map((takeaway, idx) => (
            <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
              <span style={{ color: '#15803d', fontWeight: 800 }}>✓</span>
              <span>{takeaway}</span>
            </div>
          ))}
        </div>
        
        <div style={{ borderTop: '1px dashed #cbd5e1', paddingTop: 10, fontSize: '0.72rem', color: '#64748b', display: 'flex', flexDirection: 'column', gap: 4 }}>
          {d.notes.map((note, idx) => (
            <div key={idx}>• {note}</div>
          ))}
          <div style={{ color: '#b45309', fontWeight: 700, marginTop: 2 }}>
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
  const recordId                    = 'toi_bills_v3';

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
          const fallbackSnap = await getDoc(doc(db, 'toiTracking', 'toi_bills_v2'));
          if (fallbackSnap.exists()) {
            snap = fallbackSnap;
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
📊 *RECONCILIATION SUMMARY (Oct 2021 to Sept 2026 - 60 Months):*
• *Rate till June 2025:* ₹2,200 per Month per Flat
• *Rate from July 2025:* ₹3,000 per Month per Flat
• *Total Amount Due:* ₹4,32,000 (60 Mos × 3 Flats)
• *Total Amount Paid:* ₹4,25,100 (₹3,43,500 + ₹81,600)
• 🚨 *NET OUTSTANDING BALANCE: ₹6,900*

🔻 *C. SHORTFALL (WHERE THEY PAY SHORT):*
• Oct 2024 – Mar 2025 (Short Paid): *₹13,200* (Paid ₹26,400 of ₹39,600 expected - Flat 1002 unpaid)

🔺 *D. EXTRA PAID (WHERE THEY PAY EXTRA):*
• Oct 2021 – Sept 2022 (Extra Paid): *+₹2,400*
• Apr 2023 – Mar 2024 (Extra Paid): *+₹3,000*
• Apr 2025 – Sept 2025 (Extra Paid): *+₹900*
↳ *Total Extra Paid:* *₹6,300*

⚖️ *E. NET OUTSTANDING CALCULATION:*
• Total Shortfall (C): ₹13,200
• Less: Total Extra Paid (D): (-) ₹6,300
↳ ⚠️ *NET OUTSTANDING TO BE RECEIVED: ₹6,900*

📌 *KEY TAKEAWAYS:*
✓ No missing bill for Oct 2021 – Sept 2022. Total extra paid by ₹2,400.
✓ All payments are mapped against corresponding periods.
✓ Apr 2026 – Sept 2026: ₹54,000 received on 23-06-2026 in HDFC account.
✓ Only pending shortfall is for Oct 2024 – Mar 2025 (₹13,200 - ₹6,300 = ₹6,900).

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
              <tr style="background: #0b2b26; color: #fff; font-weight: 800;">
                <td colspan="2" style="text-align: right;">TOTAL (60 Months)</td>
                <td style="text-align: center;">60</td>
                <td></td>
                <td style="text-align: right; color: #c49b4f;">₹4,32,000</td>
                <td style="text-align: right; color: #86efac;">₹4,25,100</td>
                <td></td>
                <td style="text-align: center; color: #fca5a5;">-6,900</td>
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18, fontFamily: 'Inter, system-ui, sans-serif' }}>

      {/* ── Dark Banner ── */}
      <div style={{
        background: 'linear-gradient(135deg, #0b2b26 0%, #196c6c 100%)',
        borderRadius: 20, padding: '20px 24px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        flexWrap: 'wrap', gap: 16,
        boxShadow: '0 6px 28px rgba(11,43,38,0.22)',
      }}>
        <div>
          <p style={{ margin: '0 0 2px', fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#C49B4F' }}>
            Corporate Member Flats (Times Horizon Private Limited)
          </p>
          <h2 style={{ margin: '0 0 2px', fontSize: '1.35rem', fontWeight: 800, color: '#fff' }}>
            📰 Times of India Tracker
          </h2>
          <p style={{ margin: 0, color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem' }}>
            Flats A-302 · A-904 · A-1002 &nbsp;|&nbsp; Majestique Euriska
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <StatChip label="Total"   value={totalBills}   bg="rgba(255,255,255,0.1)"  color="#fff"    />
          <StatChip label="Paid"    value={totalPaid}    bg="rgba(110,231,183,0.2)"  color="#6ee7b7" />
          <StatChip label="Pending" value={totalPending} bg="rgba(253,224,71,0.18)"  color="#fde047" />

          {/* Progress ring */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(255,255,255,0.08)', borderRadius: 12, padding: '8px 14px' }}>
            <div style={{ position: 'relative', width: 44, height: 44 }}>
              <svg width="44" height="44" viewBox="0 0 44 44">
                <circle cx="22" cy="22" r="18" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="5" />
                <circle cx="22" cy="22" r="18" fill="none" stroke="#6ee7b7" strokeWidth="5"
                  strokeDasharray={`${2 * Math.PI * 18}`}
                  strokeDashoffset={`${2 * Math.PI * 18 * (1 - donePercent / 100)}`}
                  strokeLinecap="round" transform="rotate(-90 22 22)"
                  style={{ transition: 'stroke-dashoffset 0.6s ease' }}
                />
              </svg>
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 800, color: '#6ee7b7' }}>
                {donePercent}%
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.6)', lineHeight: 1.2 }}>Completion</div>
              <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#fff' }}>{totalPaid}/{totalBills}</div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              setInvoiceScope('all_pending');
              setIsInvoiceModalOpen(true);
            }}
            style={{
              padding: '9px 16px',
              borderRadius: 999,
              background: 'linear-gradient(135deg, #c49b4f 0%, #b38634 100%)',
              color: '#0b2b26',
              border: 'none',
              fontWeight: 800,
              cursor: 'pointer',
              fontSize: '0.82rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              boxShadow: '0 4px 14px rgba(196,155,79,0.35)',
              transition: 'all 0.2s ease'
            }}
          >
            🧾 Generate TOI Invoices
          </button>

          <button
            type="button"
            onClick={() => {
              setInvoiceScope('all');
              handlePrintToiInvoices();
            }}
            style={{
              padding: '9px 16px',
              borderRadius: 999,
              background: 'rgba(255,255,255,0.14)',
              color: '#fff',
              border: '1px solid rgba(255,255,255,0.25)',
              fontWeight: 700,
              cursor: 'pointer',
              fontSize: '0.82rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              backdropFilter: 'blur(8px)',
              transition: 'all 0.2s ease'
            }}
          >
            🖨️ Print All 3 Flats
          </button>

          {saveStatus === 'saving' && <span style={{ fontSize: '0.75rem', color: '#fde047', fontWeight: 700 }}>Saving…</span>}
          {saveStatus === 'saved'  && <span style={{ fontSize: '0.75rem', color: '#6ee7b7', fontWeight: 700 }}>{saveMsg}</span>}
          {saveStatus === 'error'  && <span style={{ fontSize: '0.75rem', color: '#fca5a5', fontWeight: 700 }}>{saveMsg}</span>}
          {isLoading               && <span style={{ fontSize: '0.75rem', color: '#93c5fd', fontWeight: 700 }}>Loading…</span>}
        </div>
      </div>

      {/* ── Main Tab Switcher: Payment Reconciliation vs Flats Ledger ── */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {[
          { id: 'reconciliation', label: '📊 Payment Reconciliation (Paid vs Pending: ₹6,900)', emoji: '⚖️' },
          { id: null, label: '🏢 All Flats Ledger (A-302, A-904, A-1002)', emoji: '📑' },
          ...FLAT_IDS.map(id => ({ id, label: `Flat ${id}`, emoji: '🏠' }))
        ].map(tab => (
          <button
            key={String(tab.id)}
            onClick={() => setActiveFlat(tab.id)}
            style={{
              padding: '9px 18px',
              borderRadius: 12,
              border: '2px solid',
              borderColor: activeFlat === tab.id ? '#0b2b26' : 'rgba(61,63,52,0.15)',
              cursor: 'pointer',
              fontWeight: 700,
              fontSize: '0.88rem',
              fontFamily: 'inherit',
              background: activeFlat === tab.id ? '#0b2b26' : 'rgba(255,250,242,0.85)',
              color: activeFlat === tab.id ? '#C49B4F' : '#1d2a24',
              boxShadow: activeFlat === tab.id ? '0 4px 14px rgba(11,43,38,0.2)' : 'none',
              transition: 'all 0.18s',
              display: 'flex',
              alignItems: 'center',
              gap: 7,
            }}
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
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
            {[
              { label: 'Grand Total (3 Flats)', value: fmt(TOTAL_PER_FLAT * 3), sub: `${fmt(TOTAL_PER_FLAT)} per flat`, accent: '#0b2b26' },
              { label: 'Amount Pending',        value: fmt(amtPending),          sub: 'Across all 3 flats',             accent: '#991b1b' },
              { label: 'Amount Paid',           value: fmt(amtPaid),             sub: 'Across all 3 flats',             accent: '#065f46' },
              { label: 'Per Flat Total',        value: fmt(TOTAL_PER_FLAT),      sub: '45 mos + 12 mos',                accent: '#196c6c' },
            ].map(c => (
              <div key={c.label} style={{
                background: 'rgba(255,250,242,0.97)', border: '1px solid rgba(61,63,52,0.1)',
                borderRadius: 14, padding: '16px 18px',
                boxShadow: '0 2px 10px rgba(11,43,38,0.06)',
              }}>
                <div style={{ fontSize: '0.64rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#5f665f', marginBottom: 6 }}>{c.label}</div>
                <div style={{ fontSize: '1.3rem', fontWeight: 800, color: c.accent, lineHeight: 1 }}>{c.value}</div>
                <div style={{ fontSize: '0.7rem', color: '#8a9080', marginTop: 5 }}>{c.sub}</div>
              </div>
            ))}
          </div>

          {/* ── Rate Slab Banner ── */}
          <div style={{
            padding: '12px 18px', borderRadius: 12,
            background: 'rgba(196,155,79,0.07)', border: '1px solid rgba(196,155,79,0.2)',
            display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center',
          }}>
            <span style={{ fontSize: '0.76rem', fontWeight: 800, color: '#78400e' }}>📋 Rate Slabs:</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.76rem', color: '#5f665f' }}>
              <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 3, background: '#C49B4F' }} />
              <b>Oct 2021 – Jun 2025</b>: ₹2,200 / year (₹183.33/mo)
            </span>
            <span style={{ color: 'rgba(61,63,52,0.25)' }}>|</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.76rem', color: '#5f665f' }}>
              <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 3, background: '#93c5fd' }} />
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
          <div key={flat.id} style={{
            background: 'rgba(255,250,242,0.97)', borderRadius: 20,
            border: '1px solid rgba(61,63,52,0.1)',
            boxShadow: '0 4px 24px rgba(11,43,38,0.07)', overflow: 'hidden',
          }}>

            {/* Card Header */}
            <div style={{
              padding: '16px 22px',
              background: 'linear-gradient(135deg, rgba(244,239,231,0.98), rgba(255,250,242,0.9))',
              borderBottom: '1px solid rgba(61,63,52,0.08)',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{
                  width: 50, height: 50,
                  background: 'linear-gradient(135deg, #0b2b26, #196c6c)',
                  color: '#C49B4F', borderRadius: 13,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 800, fontSize: '1rem',
                  boxShadow: '0 4px 14px rgba(11,43,38,0.25)',
                }}>
                  {flat.flatNo.split('-')[1]}
                </div>
                <div>
                  <div style={{ fontSize: '0.63rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.09em', color: '#196c6c', marginBottom: 2 }}>Flat Member</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0b2b26' }}>{flat.flatNo}</div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                <div style={{ minWidth: 120 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.67rem', color: '#5f665f', marginBottom: 5 }}>
                    <span>{paidCount}/{flat.bills.length} paid</span>
                    <b style={{ color: pct > 0 ? '#065f46' : '#5f665f' }}>{pct}%</b>
                  </div>
                  <div style={{ height: 7, background: 'rgba(61,63,52,0.1)', borderRadius: 99 }}>
                    <div style={{
                      height: '100%', borderRadius: 99,
                      width: `${pct}%`, minWidth: pct > 0 ? 4 : 0,
                      background: 'linear-gradient(90deg, #196c6c, #34d399)',
                      transition: 'width 0.5s ease',
                    }} />
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.63rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#991b1b', marginBottom: 2 }}>Pending</div>
                  <div style={{ fontSize: '1.05rem', fontWeight: 800, color: pendAmt > 0 ? '#991b1b' : '#065f46' }}>{fmt(pendAmt)}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.63rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#065f46', marginBottom: 2 }}>Paid</div>
                  <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#065f46' }}>{fmt(paidAmt)}</div>
                </div>
                
                {/* Flat Action Buttons */}
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setInvoiceFlatId(flat.id);
                      setInvoiceScope('single');
                      setIsInvoiceModalOpen(true);
                    }}
                    style={{
                      padding: '6px 12px',
                      borderRadius: 8,
                      background: 'linear-gradient(135deg, #0b2b26 0%, #196c6c 100%)',
                      color: '#C49B4F',
                      border: '1px solid #C49B4F',
                      fontWeight: 700,
                      fontSize: '0.78rem',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4
                    }}
                  >
                    🧾 Invoice
                  </button>
                  <button
                    type="button"
                    onClick={() => handleShareToiWhatsApp(flat)}
                    style={{
                      padding: '6px 10px',
                      borderRadius: 8,
                      background: '#25D366',
                      color: '#fff',
                      border: 'none',
                      fontWeight: 700,
                      fontSize: '0.78rem',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4
                    }}
                    title="Share invoice summary on WhatsApp"
                  >
                    📱
                  </button>
                </div>
              </div>
            </div>

            {/* Table */}
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 560 }}>
                <thead>
                  <tr>
                    <th style={{ ...TH_BASE, textAlign: 'center', width: 40 }}>#</th>
                    <th style={{ ...TH_BASE, textAlign: 'left' }}>Financial Year</th>
                    <th style={{ ...TH_BASE, textAlign: 'left' }}>Period</th>
                    <th style={{ ...TH_BASE, textAlign: 'center' }}>Months</th>
                    <th style={{ ...TH_BASE, textAlign: 'center' }}>Rate / Year</th>
                    <th style={{ ...TH_BASE, textAlign: 'right' }}>Amount</th>
                    <th style={{ ...TH_BASE, textAlign: 'center' }}>Status</th>
                    {isAdmin && <th style={{ ...TH_BASE, textAlign: 'center' }}>Action</th>}
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
                        style={{
                          borderBottom: idx < flat.bills.length - 1 ? '1px solid rgba(61,63,52,0.055)' : 'none',
                          background: rowBg, transition: 'background 0.13s',
                        }}
                        onMouseEnter={e => { if (!isPaid) e.currentTarget.style.background = 'rgba(244,239,231,0.5)'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = rowBg; }}
                      >
                        <td style={{ ...TD_BASE, textAlign: 'center', color: '#c4b99a', fontSize: '0.72rem', fontWeight: 700 }}>{idx + 1}</td>
                        <td style={TD_BASE}>
                          <span style={{
                            display: 'inline-block', padding: '3px 10px', borderRadius: 8,
                            fontSize: '0.71rem', fontWeight: 700,
                            background: isNewRate ? 'rgba(147,197,253,0.22)' : 'rgba(196,155,79,0.13)',
                            color: isNewRate ? '#1e40af' : '#78400e',
                          }}>
                            {bill.year}
                          </span>
                        </td>
                        <td style={{ ...TD_BASE, fontWeight: 600, fontSize: '0.85rem', color: '#1d2a24' }}>{bill.period}</td>
                        <td style={{ ...TD_BASE, textAlign: 'center', fontWeight: 600, fontSize: '0.83rem', color: '#5f665f' }}>{bill.months}</td>
                        <td style={{ ...TD_BASE, textAlign: 'center', fontWeight: 700, fontSize: '0.83rem', color: isNewRate ? '#1e40af' : '#78400e' }}>
                          {fmt(bill.rate)}/yr
                        </td>
                        <td style={{ ...TD_BASE, textAlign: 'right', fontWeight: 800, fontSize: '0.92rem', color: '#0b2b26', fontVariantNumeric: 'tabular-nums' }}>
                          {fmt(bill.amount)}
                        </td>
                        <td style={{ ...TD_BASE, textAlign: 'center' }}>
                          <StatusBadge status={bill.status} />
                        </td>
                        {isAdmin && (
                          <td style={{ ...TD_BASE, textAlign: 'center' }}>
                            <button onClick={() => toggleBill(flat.id, bill.id)} style={{
                              padding: '5px 14px',
                              background: isPaid ? 'rgba(61,63,52,0.07)' : '#0b2b26',
                              color: isPaid ? '#5f665f' : '#C49B4F',
                              border: isPaid ? '1px solid rgba(61,63,52,0.15)' : 'none',
                              borderRadius: 10, cursor: 'pointer',
                              fontSize: '0.75rem', fontWeight: 700,
                              fontFamily: 'inherit', transition: 'all 0.15s', whiteSpace: 'nowrap',
                            }}>
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
                  <tr style={{ background: 'rgba(11,43,38,0.04)', borderTop: '2px solid rgba(61,63,52,0.13)' }}>
                    <td colSpan={3} style={{ ...TD_BASE, textAlign: 'right', fontWeight: 800, fontSize: '0.82rem', color: '#0b2b26', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Grand Total (${TOTAL_MONTHS} Months)
                    </td>
                    <td style={{ ...TD_BASE, textAlign: 'center', fontWeight: 800, fontSize: '0.92rem', color: '#196c6c' }}>
                      <span style={{ display: 'inline-block', padding: '3px 10px', borderRadius: 8, background: 'rgba(25,108,108,0.1)', color: '#196c6c', fontWeight: 800, fontSize: '0.82rem' }}>
                        {TOTAL_MONTHS} mos
                      </span>
                    </td>
                    <td style={{ ...TD_BASE, textAlign: 'center', fontWeight: 700, fontSize: '0.8rem', color: '#5f665f' }}>
                      45 × ₹2,200<br />15 × ₹3,000
                    </td>
                    <td style={{ ...TD_BASE, textAlign: 'right', fontWeight: 800, fontSize: '1rem', color: '#0b2b26', fontVariantNumeric: 'tabular-nums' }}>
                      {fmt(TOTAL_PER_FLAT)}
                    </td>
                    <td style={{ ...TD_BASE, textAlign: 'center' }}>
                      <span style={{
                        display: 'inline-block', padding: '4px 10px', borderRadius: 20,
                        fontSize: '0.72rem', fontWeight: 700,
                        background: pendAmt === 0 ? 'rgba(209,250,229,0.7)' : 'rgba(254,226,226,0.6)',
                        color: pendAmt === 0 ? '#065f46' : '#991b1b',
                        border: `1px solid ${pendAmt === 0 ? '#34d399' : '#fca5a5'}`,
                      }}>
                        {pendAmt === 0 ? '✓ Fully Paid' : `${fmt(pendAmt)} due`}
                      </span>
                    </td>
                    {isAdmin && <td />}
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        );
      })}
        </>
      )}

      {/* ── TOI INVOICE GENERATOR MODAL ── */}
      {isInvoiceModalOpen && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(4px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 980, maxHeight: '92vh', display: 'flex', flexDirection: 'column', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', overflow: 'hidden' }}>
            
            {/* Modal Header */}
            <div style={{ padding: '18px 24px', background: 'linear-gradient(135deg, #0b2b26 0%, #196c6c 100%)', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.15)' }}>
              <div>
                <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#c49b4f', fontWeight: 800 }}>Society Subscription Billing</span>
                <h3 style={{ margin: '4px 0 0', fontSize: '1.25rem', fontWeight: 800 }}>🧾 Times of India Subscription Invoice Generator</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsInvoiceModalOpen(false)}
                style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', width: 32, height: 32, borderRadius: '50%', cursor: 'pointer', fontSize: '1.1rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                ✕
              </button>
            </div>

            {/* Modal Body: Split view */}
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 380px) 1fr', overflow: 'hidden', flex: 1 }}>
              
              {/* Left Column: Form & Configuration */}
              <div style={{ padding: '20px', overflowY: 'auto', background: '#f8fafc', borderRight: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: 16 }}>
                
                {/* Target Scope Selection */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    1. Select Target Flat(s)
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 8 }}>
                    <button
                      type="button"
                      onClick={() => setInvoiceScope('single')}
                      style={{
                        padding: '8px 10px',
                        borderRadius: 8,
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        border: invoiceScope === 'single' ? '2px solid #0b2b26' : '1px solid #cbd5e1',
                        background: invoiceScope === 'single' ? '#0b2b26' : '#fff',
                        color: invoiceScope === 'single' ? '#C49B4F' : '#334155',
                        cursor: 'pointer'
                      }}
                    >
                      Single Flat
                    </button>
                    <button
                      type="button"
                      onClick={() => setInvoiceScope('all_pending')}
                      style={{
                        padding: '8px 10px',
                        borderRadius: 8,
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        border: invoiceScope === 'all_pending' ? '2px solid #0b2b26' : '1px solid #cbd5e1',
                        background: invoiceScope === 'all_pending' ? '#0b2b26' : '#fff',
                        color: invoiceScope === 'all_pending' ? '#C49B4F' : '#334155',
                        cursor: 'pointer'
                      }}
                    >
                      Pending Flats ({flats.filter(f => getFlatInvoiceData(f).pendingAmount > 0).length})
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => setInvoiceScope('all')}
                    style={{
                      width: '100%',
                      padding: '6px 10px',
                      borderRadius: 8,
                      fontSize: '0.78rem',
                      fontWeight: 600,
                      border: invoiceScope === 'all' ? '2px solid #0b2b26' : '1px solid #cbd5e1',
                      background: invoiceScope === 'all' ? '#0b2b26' : '#fff',
                      color: invoiceScope === 'all' ? '#C49B4F' : '#475569',
                      cursor: 'pointer'
                    }}
                  >
                    All 3 Flats (A-302, A-904, A-1002 Batch)
                  </button>
                </div>

                {/* Single Flat Selector Pills */}
                {invoiceScope === 'single' && (
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', marginBottom: 6 }}>
                      Choose Specific Flat:
                    </label>
                    <div style={{ display: 'flex', gap: 8 }}>
                      {flats.map(f => {
                        const sData = getFlatInvoiceData(f);
                        const isSelected = invoiceFlatId === f.id;
                        return (
                          <button
                            key={f.id}
                            type="button"
                            onClick={() => setInvoiceFlatId(f.id)}
                            style={{
                              flex: 1,
                              padding: '7px 10px',
                              borderRadius: 8,
                              fontSize: '0.82rem',
                              fontWeight: 700,
                              cursor: 'pointer',
                              border: isSelected ? '2px solid #0b2b26' : '1px solid #cbd5e1',
                              background: isSelected ? '#0b2b26' : '#fff',
                              color: isSelected ? '#C49B4F' : '#1e293b',
                              textAlign: 'center'
                            }}
                          >
                            <div>{f.flatNo}</div>
                            <div style={{ fontSize: '0.68rem', opacity: isSelected ? 0.9 : 0.65 }}>
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
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    2. Invoice Billing Structure
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 8 }}>
                    <button
                      type="button"
                      onClick={() => setModalMode('month_range')}
                      style={{
                        padding: '8px 10px',
                        borderRadius: 8,
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        border: modalMode === 'month_range' ? '2px solid #0b2b26' : '1px solid #cbd5e1',
                        background: modalMode === 'month_range' ? '#0b2b26' : '#fff',
                        color: modalMode === 'month_range' ? '#C49B4F' : '#334155',
                        cursor: 'pointer',
                        textAlign: 'center'
                      }}
                    >
                      📅 Month-Range Combined
                    </button>
                    <button
                      type="button"
                      onClick={() => setModalMode('historical')}
                      style={{
                        padding: '8px 10px',
                        borderRadius: 8,
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        border: modalMode === 'historical' ? '2px solid #0b2b26' : '1px solid #cbd5e1',
                        background: modalMode === 'historical' ? '#0b2b26' : '#fff',
                        color: modalMode === 'historical' ? '#C49B4F' : '#334155',
                        cursor: 'pointer',
                        textAlign: 'center'
                      }}
                    >
                      📑 60-Mo TOI Ledger
                    </button>
                  </div>
                </div>

                {/* If Month-Range Mode: Select start month, end month, sinking fund 150, maintenance 2850 */}
                {modalMode === 'month_range' && (
                  <div style={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: 10, padding: '14px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#0b2b26', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        📅 Billing Month Range
                      </span>
                      <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#16a34a', background: '#dcfce7', padding: '2px 8px', borderRadius: 999 }}>
                        {rangeMonthsCount} Months Counted
                      </span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: '#475569', marginBottom: 4 }}>
                          Start Month
                        </label>
                        <input
                          type="month"
                          value={rangeStartMonth}
                          onChange={(e) => setRangeStartMonth(e.target.value)}
                          style={{ width: '100%', padding: '7px 8px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: '0.82rem', fontWeight: 700 }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: '#475569', marginBottom: 4 }}>
                          End Month
                        </label>
                        <input
                          type="month"
                          value={rangeEndMonth}
                          onChange={(e) => setRangeEndMonth(e.target.value)}
                          style={{ width: '100%', padding: '7px 8px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: '0.82rem', fontWeight: 700 }}
                        />
                      </div>
                    </div>

                    {/* Presets */}
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      <button type="button" onClick={() => { setRangeStartMonth('2024-04'); setRangeEndMonth('2025-03'); }} style={{ padding: '3px 8px', borderRadius: 6, fontSize: '0.7rem', fontWeight: 600, background: '#f8fafc', border: '1px solid #cbd5e1', cursor: 'pointer' }}>
                        FY 24-25 (12m)
                      </button>
                      <button type="button" onClick={() => { setRangeStartMonth('2025-04'); setRangeEndMonth('2026-03'); }} style={{ padding: '3px 8px', borderRadius: 6, fontSize: '0.7rem', fontWeight: 600, background: '#f8fafc', border: '1px solid #cbd5e1', cursor: 'pointer' }}>
                        FY 25-26 (12m)
                      </button>
                      <button type="button" onClick={() => { setRangeStartMonth('2026-04'); setRangeEndMonth('2026-09'); }} style={{ padding: '3px 8px', borderRadius: 6, fontSize: '0.7rem', fontWeight: 600, background: '#f8fafc', border: '1px solid #cbd5e1', cursor: 'pointer' }}>
                        Last 6 Mos
                      </button>
                      <button type="button" onClick={() => { setRangeStartMonth('2021-10'); setRangeEndMonth('2026-09'); }} style={{ padding: '3px 8px', borderRadius: 6, fontSize: '0.7rem', fontWeight: 700, background: '#ecfdf5', color: '#065f46', border: '1px solid #a7f3d0', cursor: 'pointer' }}>
                        Full 60 Mos
                      </button>
                    </div>

                    {/* Rates & Calculations */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 4 }}>
                      <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 6, padding: '8px' }}>
                        <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: '#475569', marginBottom: 2 }}>
                          Maintenance (₹/mo)
                        </label>
                        <input
                          type="number"
                          value={maintenanceRate}
                          onChange={(e) => setMaintenanceRate(Number(e.target.value) || 0)}
                          style={{ width: '100%', padding: '4px 6px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: '0.85rem', fontWeight: 800, color: '#0b2b26' }}
                        />
                        <div style={{ fontSize: '0.66rem', color: '#64748b', marginTop: 3 }}>
                          {rangeMonthsCount} mos × ₹{formatValue(maintenanceRate)} = <strong>₹{formatValue(rangeMaintenanceTotal)}</strong>
                        </div>
                      </div>

                      <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 6, padding: '8px' }}>
                        <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: '#475569', marginBottom: 2 }}>
                          Sinking Fund (₹/mo)
                        </label>
                        <input
                          type="number"
                          value={sinkingFundRate}
                          onChange={(e) => setSinkingFundRate(Number(e.target.value) || 0)}
                          style={{ width: '100%', padding: '4px 6px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: '0.85rem', fontWeight: 800, color: '#0b2b26' }}
                        />
                        <div style={{ fontSize: '0.66rem', color: '#64748b', marginTop: 3 }}>
                          {rangeMonthsCount} mos × ₹{formatValue(sinkingFundRate)} = <strong>₹{formatValue(rangeSinkingFundTotal)}</strong>
                        </div>
                      </div>
                    </div>

                    {/* Grand Total Bar */}
                    <div style={{ background: 'linear-gradient(135deg, #0b2b26 0%, #196c6c 100%)', borderRadius: 8, padding: '10px 12px', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ fontSize: '0.7rem', color: '#C49B4F', fontWeight: 700, textTransform: 'uppercase' }}>
                        Payable ({rangeMonthsCount} Mos):
                      </div>
                      <div style={{ fontSize: '1.15rem', fontWeight: 900, color: '#4ade80', fontFamily: 'monospace' }}>
                        ₹{formatValue(rangeGrandTotal)}
                      </div>
                    </div>
                  </div>
                )}

                {/* Dates & Reference Configuration */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                      Invoice Date
                    </label>
                    <input
                      type="date"
                      value={invoiceDate}
                      onChange={(e) => setInvoiceDate(e.target.value)}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: '0.82rem' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#b45309', marginBottom: 4 }}>
                      Payment Due Date
                    </label>
                    <input
                      type="date"
                      value={invoiceDueDate}
                      onChange={(e) => setInvoiceDueDate(e.target.value)}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #fde68a', background: '#fffbeb', fontSize: '0.82rem', fontWeight: 700, color: '#92400e' }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                    Invoice Number Prefix
                  </label>
                  <input
                    type="text"
                    value={invoiceRefPrefix}
                    onChange={(e) => setInvoiceRefPrefix(e.target.value)}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: '0.82rem' }}
                  />
                </div>

                {/* Custom Resolution / Note */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                    Society Resolution &amp; Terms
                  </label>
                  <textarea
                    rows={3}
                    value={invoiceCustomNote}
                    onChange={(e) => setInvoiceCustomNote(e.target.value)}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: '0.76rem', lineHeight: 1.4, resize: 'vertical' }}
                  />
                </div>

                {/* Society Bank Details Quick Preview */}
                <div style={{ padding: '10px 12px', background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: 8, fontSize: '0.76rem', color: '#065f46' }}>
                  <div style={{ fontWeight: 800, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span>🏦 Society Bank Remittance Info</span>
                  </div>
                  <div><strong>Bank:</strong> HDFC Bank • CA-INSTITUTION</div>
                  <div><strong>A/C:</strong> 50200075533530</div>
                  <div><strong>IFSC:</strong> HDFC0002454 (Undri / NIBM Road)</div>
                </div>
              </div>

              {/* Right Column: Live Letterhead Preview */}
              <div style={{ padding: '24px', overflowY: 'auto', background: '#eaedf0', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                
                {/* Simulated Paper Document */}
                <div style={{
                  background: '#ffffff',
                  width: '100%',
                  maxWidth: 580,
                  borderRadius: 4,
                  padding: '24px 28px',
                  boxShadow: '0 10px 30px rgba(0,0,0,0.12)',
                  border: '1px solid #cbd5e1',
                  color: '#0f172a',
                  fontSize: '0.82rem',
                  lineHeight: 1.45,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10
                }}>
                  {/* Letterhead */}
                  <div style={{ textAlign: 'center', borderBottom: '2px solid #0b2b26', paddingBottom: 10 }}>
                    <div style={{ fontSize: '0.95rem', fontWeight: 900, color: '#0b2b26' }}>
                      MAJESTIQUE EURISKA 'A' BUILDING CO-OP HOUSING SOCIETY LTD.
                    </div>
                    <div style={{ fontSize: '0.68rem', color: '#475569', marginTop: 2 }}>
                      Reg. No: PNA/PNA (4)/HSG/(TC)/21207/2019-20 • Mohammed Wadi, Pune - 411060
                    </div>
                    <span style={{ display: 'inline-block', marginTop: 6, padding: '2px 8px', borderRadius: 999, background: '#0b2b26', color: '#fff', fontSize: '0.65rem', fontWeight: 800 }}>
                      {modalMode === 'month_range' ? 'MAINTENANCE, SINKING FUND & TOI • TAX INVOICE' : 'TIMES OF INDIA SUBSCRIPTION • TAX INVOICE'}
                    </span>
                  </div>

                  {/* Ref & Date */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.74rem', color: '#334155', borderBottom: '1px dashed #e2e8f0', paddingBottom: 6 }}>
                    <div><strong>Invoice No:</strong> {invoiceRefPrefix}{activeInvoiceFlat.flatNo.replace('-', '')}</div>
                    <div><strong>Invoice Date:</strong> {formatDisplayDate(invoiceDate)}</div>
                  </div>

                  {/* Recipient */}
                  <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 6, padding: '8px 12px', fontSize: '0.78rem' }}>
                    <div style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 700 }}>BILLED TO:</div>
                    <div style={{ fontWeight: 800, fontSize: '0.88rem' }}>Flat {activeInvoiceFlat.flatNo} Member / Resident</div>
                    <div style={{ color: '#0b2b26', fontWeight: 700 }}>
                      {modalMode === 'month_range'
                        ? `Billing Period: ${formatMonthYearLabel(rangeStartMonth)} to ${formatMonthYearLabel(rangeEndMonth)} (${rangeMonthsCount} Months)`
                        : 'Facility: Times of India Newspaper Subscription (60 Months)'}
                    </div>
                  </div>

                  {/* Dues Table: Month-Range mode vs Historical mode */}
                  {modalMode === 'month_range' ? (
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.74rem', margin: '4px 0' }}>
                      <thead>
                        <tr style={{ background: '#0b2b26', color: '#fff' }}>
                          <th style={{ padding: '4px 6px', textAlign: 'left' }}>#</th>
                          <th style={{ padding: '4px 6px', textAlign: 'left' }}>Particulars</th>
                          <th style={{ padding: '4px 6px', textAlign: 'center' }}>Months</th>
                          <th style={{ padding: '4px 6px', textAlign: 'center' }}>Rate / Mo</th>
                          <th style={{ padding: '4px 6px', textAlign: 'right' }}>Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                          <td style={{ padding: '4px 6px', textAlign: 'center' }}>1</td>
                          <td style={{ padding: '4px 6px', fontWeight: 700 }}>Maintenance Charges</td>
                          <td style={{ padding: '4px 6px', textAlign: 'center' }}>{rangeMonthsCount}m</td>
                          <td style={{ padding: '4px 6px', textAlign: 'center' }}>₹{formatValue(maintenanceRate)}</td>
                          <td style={{ padding: '4px 6px', textAlign: 'right', fontWeight: 700, fontFamily: 'monospace' }}>₹{formatValue(rangeMaintenanceTotal)}</td>
                        </tr>
                        <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                          <td style={{ padding: '4px 6px', textAlign: 'center' }}>2</td>
                          <td style={{ padding: '4px 6px', fontWeight: 700 }}>Sinking Fund</td>
                          <td style={{ padding: '4px 6px', textAlign: 'center' }}>{rangeMonthsCount}m</td>
                          <td style={{ padding: '4px 6px', textAlign: 'center' }}>₹{formatValue(sinkingFundRate)}</td>
                          <td style={{ padding: '4px 6px', textAlign: 'right', fontWeight: 700, fontFamily: 'monospace' }}>₹{formatValue(rangeSinkingFundTotal)}</td>
                        </tr>
                        <tr style={{ background: '#f8fafc', fontWeight: 700, borderBottom: '1px solid #e2e8f0' }}>
                          <td colSpan={2} style={{ padding: '4px 6px', textAlign: 'right', color: '#196c6c' }}>Base Society Subtotal:</td>
                          <td style={{ padding: '4px 6px', textAlign: 'center', color: '#196c6c' }}>{rangeMonthsCount}m</td>
                          <td style={{ padding: '4px 6px', textAlign: 'center', color: '#196c6c' }}>₹{formatValue(Number(maintenanceRate) + Number(sinkingFundRate))}</td>
                          <td style={{ padding: '4px 6px', textAlign: 'right', color: '#196c6c', fontFamily: 'monospace' }}>₹{formatValue(rangeBaseTotal)}</td>
                        </tr>
                        <tr style={{ background: '#0b2b26', color: '#fff', fontWeight: 800 }}>
                          <td colSpan={4} style={{ padding: '6px 8px', textAlign: 'right' }}>NET AMOUNT PAYABLE:</td>
                          <td style={{ padding: '6px 8px', textAlign: 'right', color: '#4ade80', fontSize: '0.92rem', fontFamily: 'monospace' }}>
                            ₹{formatValue(rangeGrandTotal)}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.74rem', margin: '4px 0' }}>
                      <thead>
                        <tr style={{ background: '#0b2b26', color: '#fff' }}>
                          <th style={{ padding: '4px 6px', textAlign: 'left' }}>Period / Financial Year</th>
                          <th style={{ padding: '4px 6px', textAlign: 'center' }}>Months</th>
                          <th style={{ padding: '4px 6px', textAlign: 'right' }}>Amount</th>
                          <th style={{ padding: '4px 6px', textAlign: 'center' }}>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {activeInvoiceFlat.bills.map((b) => (
                          <tr key={b.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                            <td style={{ padding: '4px 6px' }}>{b.year} ({b.period})</td>
                            <td style={{ padding: '4px 6px', textAlign: 'center' }}>{b.months}m</td>
                            <td style={{ padding: '4px 6px', textAlign: 'right', fontWeight: 600 }}>₹{formatValue(b.amount)}</td>
                            <td style={{ padding: '4px 6px', textAlign: 'center' }}>
                              <span style={{ fontSize: '0.68rem', fontWeight: 700, color: b.status === 'Paid' ? '#065f46' : '#92400e' }}>
                                {b.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                        <tr style={{ background: '#f8fafc', fontWeight: 700, borderTop: '1px solid #cbd5e1' }}>
                          <td colSpan={2} style={{ padding: '5px 6px' }}>Total 60-Month Subscription:</td>
                          <td style={{ padding: '5px 6px', textAlign: 'right' }}>₹{formatValue(activeInvoiceData.totalBilled)}</td>
                          <td></td>
                        </tr>
                        <tr style={{ background: '#f0fdf4', color: '#15803d', fontWeight: 700 }}>
                          <td colSpan={2} style={{ padding: '5px 6px' }}>Total Payments Received:</td>
                          <td style={{ padding: '5px 6px', textAlign: 'right' }}>(-) ₹{formatValue(activeInvoiceData.paidAmount)}</td>
                          <td></td>
                        </tr>
                        <tr style={{ background: '#0b2b26', color: '#fff', fontWeight: 800 }}>
                          <td colSpan={2} style={{ padding: '6px 8px' }}>NET AMOUNT PAYABLE:</td>
                          <td style={{ padding: '6px 8px', textAlign: 'right', color: '#4ade80', fontSize: '0.92rem' }}>
                            ₹{formatValue(activeInvoiceData.pendingAmount)}
                          </td>
                          <td></td>
                        </tr>
                      </tbody>
                    </table>
                  )}

                  {/* Due banner */}
                  <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 6, padding: '6px 10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.74rem' }}>
                    <div>
                      <span style={{ color: '#92400e', fontWeight: 700 }}>Payment Due Date: </span>
                      <strong style={{ color: '#78350f' }}>{formatDisplayDate(invoiceDueDate)}</strong>
                    </div>
                    <span style={{ color: '#92400e', fontWeight: 700 }}>HDFC A/C: 50200075533530</span>
                  </div>

                  {/* Signatures */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginTop: 10, paddingTop: 6, borderTop: '1px solid #e2e8f0', textAlign: 'center', fontSize: '0.68rem', color: '#64748b' }}>
                    <div><div style={{ borderTop: '1px solid #94a3b8', paddingTop: 2, fontWeight: 700, marginTop: 18 }}>Society Manager</div></div>
                    <div><div style={{ borderTop: '1px solid #94a3b8', paddingTop: 2, fontWeight: 700, marginTop: 18 }}>Hon. Secretary</div></div>
                    <div><div style={{ borderTop: '1px solid #94a3b8', paddingTop: 2, fontWeight: 700, marginTop: 18 }}>Hon. Treasurer</div></div>
                  </div>
                </div>

                {invoiceToast && (
                  <div style={{ marginTop: 12, padding: '8px 16px', borderRadius: 8, background: '#0b2b26', color: '#fff', fontSize: '0.8rem', fontWeight: 700, boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }}>
                    {invoiceToast}
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer Toolbar */}
            <div style={{ padding: '14px 24px', background: '#f8fafc', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
              <div style={{ fontSize: '0.82rem', color: '#475569' }}>
                Selected Flat(s): <strong>{invoiceScope === 'single' ? activeInvoiceFlat.flatNo : invoiceScope === 'all_pending' ? `Pending Flats (${flatsForInvoice.length})` : 'All 3 Flats'}</strong>
              </div>

              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                {invoiceScope === 'single' && (
                  <>
                    <button
                      type="button"
                      onClick={() => handleCopyFlatInvoiceText(activeInvoiceFlat)}
                      style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid #cbd5e1', background: '#fff', color: '#334155', fontWeight: 700, cursor: 'pointer', fontSize: '0.82rem', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                    >
                      📋 Copy Text
                    </button>
                    <button
                      type="button"
                      onClick={() => handleShareToiWhatsApp(activeInvoiceFlat)}
                      style={{ padding: '8px 14px', borderRadius: 8, border: 'none', background: '#25D366', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: '0.82rem', display: 'inline-flex', alignItems: 'center', gap: 6, boxShadow: '0 2px 8px rgba(37,211,102,0.3)' }}
                    >
                      📱 Send WhatsApp
                    </button>
                  </>
                )}

                <button
                  type="button"
                  onClick={handlePrintToiInvoices}
                  style={{
                    padding: '8px 18px',
                    borderRadius: 8,
                    border: 'none',
                    background: '#0b2b26',
                    color: '#C49B4F',
                    fontWeight: 800,
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                    boxShadow: '0 4px 14px rgba(11,43,38,0.25)'
                  }}
                >
                  🖨️ Print / Download PDF ({flatsForInvoice.length} Invoice{flatsForInvoice.length > 1 ? 's' : ''})
                </button>

                <button
                  type="button"
                  onClick={() => setIsInvoiceModalOpen(false)}
                  style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid #cbd5e1', background: '#fff', color: '#64748b', fontWeight: 600, cursor: 'pointer', fontSize: '0.82rem' }}
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
