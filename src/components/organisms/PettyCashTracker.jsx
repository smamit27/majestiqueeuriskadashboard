import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import * as XLSX from 'xlsx';
import { db, ensureFirebaseSession, isFirebaseConfigured } from '../../firebase.js';
import ALL_PETTY_CASH_HISTORY from '../../data/pettyCashAllHistory.json';
import './PettyCashTracker.css';


const PETTY_CASH_DOC_IDS = {
  buildingA: 'buildingA',
  common: 'common',
  history: 'history'
};

const SUB_TABS = [
  {
    id: 'buildingA',
    label: 'A Building Expenses',
    eyebrow: 'A Building',
    description: 'Month-wise expense ledger for the A Building petty cash workspace.'
  },
  {
    id: 'common',
    label: 'Common Expenses',
    eyebrow: 'Common Ledger',
    description: 'Shared petty cash workspace for common expenses across the society.'
  },
  {
    id: 'vendorAnalytics',
    label: '🔍 Vendor & Payee Analytics',
    eyebrow: 'Spending Audit',
    description: 'Search any vendor or contractor to track how much society has spent on them across all years.'
  }
];

const FISCAL_MONTHS_A_BUILDING = Array.from({ length: 12 }, (_, index) => {
  const date = new Date(Date.UTC(2026, 3 + index, 1));
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const monthIdStr = `${year}-${month}`;

  return {
    id: monthIdStr,
    matchMonths: [monthIdStr],
    label: new Intl.DateTimeFormat('en-IN', {
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC'
    }).format(date)
  };
});

const FISCAL_MONTHS_COMMON = [
  { id: '2026-04-05', matchMonths: ['2026-04', '2026-05'], label: 'April & May 2026' },
  ...FISCAL_MONTHS_A_BUILDING.slice(2)
];

const getFiscalMonths = (tab) => tab === 'common' ? FISCAL_MONTHS_COMMON : FISCAL_MONTHS_A_BUILDING;

export function getCurrentFiscalMonthId(tab = 'buildingA') {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const currentMonthId = `${year}-${month}`;

  const fiscalMonths = getFiscalMonths(tab);
  const matched = fiscalMonths.find(m => m.id === currentMonthId || m.matchMonths?.includes(currentMonthId));
  if (matched) {
    return matched.id;
  }

  if (currentMonthId < fiscalMonths[0].id) {
    return fiscalMonths[0].id;
  }
  return fiscalMonths[fiscalMonths.length - 1].id;
}

export function numberToWordsINR(amount) {
  const num = Math.round(Math.abs(Number(amount) || 0));
  if (num === 0) return 'Zero Rupees Only';

  const units = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  const convertTwoDigits = (n) => {
    if (n === 0) return '';
    if (n < 20) return units[n];
    const t = Math.floor(n / 10);
    const u = n % 10;
    return tens[t] + (u ? ' ' + units[u] : '');
  };

  const convertThreeDigits = (n) => {
    const h = Math.floor(n / 100);
    const r = n % 100;
    let str = '';
    if (h) str += units[h] + ' Hundred';
    if (r) str += (str ? ' ' : '') + convertTwoDigits(r);
    return str;
  };

  const crore = Math.floor(num / 10000000);
  const lakh = Math.floor((num % 10000000) / 100000);
  const thousand = Math.floor((num % 100000) / 1000);
  const hundred = num % 1000;

  const parts = [];
  if (crore) parts.push(convertThreeDigits(crore) + ' Crore');
  if (lakh) parts.push(convertTwoDigits(lakh) + ' Lakh');
  if (thousand) parts.push(convertTwoDigits(thousand) + ' Thousand');
  if (hundred) parts.push(convertThreeDigits(hundred));

  return parts.filter(Boolean).join(' ') + ' Rupees Only';
}

const DEFAULT_BUILDING_A_ENTRIES = [
  {
    id: 1782921846533,
    date: '2026-04-01',
    vendor: 'System',
    purpose: 'Opening Balance Adjustment for FY 26-27',
    receipt: '0',
    payment: '973',
    remarks: 'Auto-adjusted to match ledger balances'
  },
  {
    id: 1782921846534,
    date: '2026-04-02',
    vendor: 'Fund Received',
    purpose: '',
    receipt: '10000',
    payment: '',
    remarks: ''
  },
  {
    id: 1782921846535,
    date: '2026-04-04',
    vendor: 'Uttareswar',
    purpose: 'Waterman salary',
    receipt: '',
    payment: '5650',
    remarks: ''
  },
  {
    id: 1782921846536,
    date: '2026-04-05',
    vendor: 'Siddu lende',
    purpose: 'Common Expenses month of Mar 26',
    receipt: '',
    payment: '2131',
    remarks: ''
  },
  {
    id: 1782921846537,
    date: '2026-04-29',
    vendor: 'Parmeshwar Pitale',
    purpose: 'Bathroom out side Plumbing Work',
    receipt: '',
    payment: '430',
    remarks: ''
  },
  {
    id: 1782921846538,
    date: '2026-04-29',
    vendor: 'Shree krushna H/W',
    purpose: '10w LED purchase',
    receipt: '',
    payment: '1200',
    remarks: ''
  },
  {
    id: 1782921846539,
    date: '2026-05-02',
    vendor: 'Fund Received',
    purpose: '',
    receipt: '10000',
    payment: '',
    remarks: ''
  },
  {
    id: 1782921846540,
    date: '2026-05-05',
    vendor: 'Uttareswar',
    purpose: 'Waterman salary',
    receipt: '',
    payment: '5650',
    remarks: ''
  },
  {
    id: 1782921846541,
    date: '2026-05-05',
    vendor: 'IGS Enterprises',
    purpose: 'Solar Pipe Insstalation',
    receipt: '',
    payment: '800',
    remarks: ''
  },
  {
    id: 1782921846542,
    date: '2026-05-30',
    vendor: 'Siddu lende',
    purpose: 'Common Expenses',
    receipt: '',
    payment: '4370',
    remarks: ''
  },
  {
    id: 1782921846543,
    date: '2026-06-02',
    vendor: 'Fund Received',
    purpose: '',
    receipt: '10000',
    payment: '',
    remarks: ''
  },
  {
    id: 1782921846544,
    date: '2026-06-03',
    vendor: 'Uttareswar',
    purpose: 'Waterman salary',
    receipt: '',
    payment: '5650',
    remarks: ''
  },
  {
    id: 1782921846545,
    date: '2026-06-03',
    vendor: 'IGS Enterprises',
    purpose: 'Solar Lekage work',
    receipt: '',
    payment: '600',
    remarks: ''
  },
  {
    id: 1782921846546,
    date: '2026-07-02',
    vendor: 'Fund Received',
    purpose: '',
    receipt: '15000',
    payment: '',
    remarks: ''
  },
  {
    id: 1782921846547,
    date: '2026-07-02',
    vendor: 'Uttareswar',
    purpose: 'Waterman salary',
    receipt: '',
    payment: '5650',
    remarks: ''
  },
  {
    id: 1782921846548,
    date: '2026-07-02',
    vendor: 'Siddu lende',
    purpose: 'Common Expenses',
    receipt: '',
    payment: '4963',
    remarks: ''
  },
  {
    id: 1782921846549,
    date: '2026-07-05',
    vendor: 'Goving Bansode',
    purpose: 'Printer Repairing',
    receipt: '',
    payment: '700',
    remarks: ''
  },
  {
    id: 1782921846550,
    date: '2026-08-02',
    vendor: 'Fund Received',
    purpose: '',
    receipt: '10000',
    payment: '',
    remarks: ''
  },
  {
    id: 1782921846551,
    date: '2026-08-03',
    vendor: 'Uttareswar',
    purpose: 'Waterman salary',
    receipt: '',
    payment: '5650',
    remarks: ''
  },
  {
    id: 1782921846552,
    date: '2026-08-03',
    vendor: 'Siddu lende',
    purpose: 'Coomon Expenses Jul 26',
    receipt: '',
    payment: '2825',
    remarks: ''
  },
  {
    id: 1782921846553,
    date: '2026-08-08',
    vendor: 'H M Carpet',
    purpose: 'Carpet',
    receipt: '',
    payment: '2800',
    remarks: ''
  },
  {
    id: 1782921846554,
    date: '2026-08-12',
    vendor: 'Parmeshwar Pitale',
    purpose: 'Flat No. 408 Outside Lekage work',
    receipt: '',
    payment: '3000',
    remarks: ''
  },
  {
    id: 1782921846555,
    date: '2026-08-16',
    vendor: 'Siddu lende',
    purpose: 'Common Expenses Independence Day 15 Aug',
    receipt: '',
    payment: '4696',
    remarks: ''
  },
  {
    id: 1782921846556,
    date: '2026-08-18',
    vendor: 'Sukanya Electricals',
    purpose: 'Street Light Purchase 01 Nos',
    receipt: '',
    payment: '550',
    remarks: ''
  },
  {
    id: 1782921846557,
    date: '2026-08-24',
    vendor: 'Rushi Dhide',
    purpose: 'Drainage Cleaning',
    receipt: '',
    payment: '1000',
    remarks: 'A Wing / B Wing'
  },
  {
    id: 1782921846558,
    date: '2026-08-30',
    vendor: 'Siddu lende',
    purpose: 'Common Expenses Month of Aug 26',
    receipt: '',
    payment: '1923',
    remarks: '12184 / 13162'
  },
  {
    id: 1782921846559,
    date: '2026-09-01',
    vendor: 'Fund Received',
    purpose: 'Petty Cash Top-up',
    receipt: '15000',
    payment: '',
    remarks: 'Society Refill'
  },
  {
    id: 1782921846560,
    date: '2026-09-02',
    vendor: 'Uttareswar',
    purpose: 'Waterman salary',
    receipt: '',
    payment: '5650',
    remarks: ''
  },
  {
    id: 1782921846561,
    date: '2026-09-03',
    vendor: 'Parmeshwar Pitale',
    purpose: 'Flat No 303, 403 and Drainage Chocup Clean near 1003 parking',
    receipt: '',
    payment: '2000',
    remarks: 'Plumbing & Drainage'
  },
  {
    id: 1782921846562,
    date: '2026-09-03',
    vendor: 'IGS Enterprises',
    purpose: 'Solar Tube Replacement',
    receipt: '',
    payment: '1700',
    remarks: 'Solar water system'
  },
  {
    id: 1782921846563,
    date: '2026-09-04',
    vendor: 'JCCollection',
    purpose: 'Printout for Audit Report anAGM documents',
    receipt: '',
    payment: '122',
    remarks: 'AGM 2026 printing'
  },
  {
    id: 1782921846564,
    date: '2026-09-06',
    vendor: 'Aggarwals',
    purpose: 'Samosa purchse for AGM',
    receipt: '',
    payment: '1500',
    remarks: 'AGM 2026 refreshment'
  },
  {
    id: 1782921846565,
    date: '2026-09-06',
    vendor: 'Jaslok Sweets',
    purpose: 'Tea and Water Bottle for AGM',
    receipt: '',
    payment: '520',
    remarks: 'AGM 2026 refreshment'
  },
  {
    id: 1782921846566,
    date: '2026-09-24',
    vendor: 'Ramdev Hardware',
    purpose: 'Plumbing Material for near 106 parking Lekage work',
    receipt: '',
    payment: '445',
    remarks: '106 parking leakage'
  },
  {
    id: 1782921846567,
    date: '2026-09-24',
    vendor: 'Parmeshwar Pitale',
    purpose: 'Plumbing charges for near 106 parking Lekage work',
    receipt: '',
    payment: '500',
    remarks: '106 parking leakage labor'
  },
  {
    id: 1782921846568,
    date: '2026-09-29',
    vendor: 'Shree krushna H/W',
    purpose: 'Tube Lights Purchase',
    receipt: '',
    payment: '1200',
    remarks: 'Society lights'
  },
  {
    id: 1782921846569,
    date: '2026-09-30',
    vendor: 'Siddu lende',
    purpose: 'Common expenses',
    receipt: '',
    payment: '2081',
    remarks: 'Month of Sep 26'
  }
];

const DEFAULT_COMMON_ENTRIES = [];

const currencyFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});

function toNumber(value) {
  return Number.parseFloat(value) || 0;
}

function formatCurrency(value) {
  return currencyFormatter.format(value || 0);
}

function formatSignedCurrency(value) {
  if (value === null || value === undefined) {
    return '--';
  }

  return `${value >= 0 ? '+' : '-'}${formatCurrency(Math.abs(value))}`;
}

function formatShortDate(dateString) {
  if (!dateString) {
    return '--';
  }

  const [year, month, day] = dateString.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  const monthLabel = new Intl.DateTimeFormat('en-IN', {
    month: 'short',
    timeZone: 'UTC'
  }).format(date);

  return `${String(day).padStart(2, '0')} ${monthLabel} ${year}`;
}

function createEmptyForm(monthId) {
  return {
    date: `${monthId}-01`,
    vendor: '',
    purpose: '',
    receipt: '',
    payment: '',
    remarks: ''
  };
}

function sortEntries(entries) {
  return [...entries].sort((left, right) => {
    if (left.date === right.date) {
      return String(left.id).localeCompare(String(right.id));
    }

    return new Date(left.date) - new Date(right.date);
  });
}

function withRunningBalance(entries) {
  let balance = 0;

  return sortEntries(entries).map((entry) => {
    balance += toNumber(entry.receipt) - toNumber(entry.payment);

    return {
      ...entry,
      balance
    };
  });
}

function buildMonthSummaries(entries, fiscalMonths) {
  const processed = withRunningBalance(entries);
  const byMonth = new Map();

  fiscalMonths.forEach((month) => {
    byMonth.set(month.id, {
      ...month,
      entries: [],
      receipts: 0,
      payments: 0,
      openingBalance: 0,
      closingBalance: 0
    });
  });

  processed.forEach((entry) => {
    const monthIdStr = entry.date.slice(0, 7);
    const monthDef = fiscalMonths.find(m => m.matchMonths.includes(monthIdStr));
    if (!monthDef) return;

    const month = byMonth.get(monthDef.id);
    if (!month) return;

    month.entries.push(entry);
    month.receipts += toNumber(entry.receipt);
    month.payments += toNumber(entry.payment);

    const isFundAddition = entry.vendor?.toLowerCase().includes('fund received') || entry.vendor?.toLowerCase().includes('system');
    if (!isFundAddition) {
      month.expenses = (month.expenses || 0) + toNumber(entry.payment) - toNumber(entry.receipt);
    }
  });

  let carryForward = 0;

  return fiscalMonths.map((monthDef) => {
    const month = byMonth.get(monthDef.id);

    if (month.entries.length > 0) {
      const firstEntry = month.entries[0];
      month.openingBalance =
        firstEntry.balance - toNumber(firstEntry.receipt) + toNumber(firstEntry.payment);
      month.closingBalance = month.entries[month.entries.length - 1].balance;
    } else {
      month.openingBalance = carryForward;
      month.closingBalance = carryForward;
    }

    carryForward = month.closingBalance;
    return month;
  });
}

export function calculateCommonSettlementBalance({ activeMonthId, monthSummariesByTab }) {
  const activeCommonMonthSummary = monthSummariesByTab.common.find((month) => month.id === activeMonthId) || monthSummariesByTab.common[0];
  const activeABuildingMonthSummary = monthSummariesByTab.buildingA.find((month) => month.id === activeMonthId) || monthSummariesByTab.buildingA[0];
  const monthlyCommonExpenses = activeCommonMonthSummary ? (activeCommonMonthSummary.expenses || 0) : 0;
  const monthlyCommonShare = monthlyCommonExpenses * (87 / 231);

  const cumulativeCommonExpenses = monthSummariesByTab.common
    .filter((month) => month.id <= activeMonthId)
    .reduce((sum, month) => sum + (month.expenses || 0), 0);
  const cumulativeCommonShare = cumulativeCommonExpenses * (87 / 231);

  const cumulativeSettled = monthSummariesByTab.buildingA
    .filter((month) => month.id <= activeMonthId)
    .reduce((sum, month) => sum + month.entries.filter((entry) => entry.vendor === 'Common Settlement').reduce((entrySum, entry) => entrySum + toNumber(entry.payment), 0), 0);

  return {
    monthlyCommonExpenses,
    monthlyCommonShare,
    cumulativeCommonExpenses,
    cumulativeCommonShare,
    cumulativeSettled,
    pendingCumulativeCommonShare: cumulativeCommonShare - cumulativeSettled,
    monthlySettled: activeABuildingMonthSummary ? activeABuildingMonthSummary.entries
      .filter((entry) => entry.vendor === 'Common Settlement')
      .reduce((sum, entry) => sum + toNumber(entry.payment), 0) : 0,
    monthlyPending: monthlyCommonShare - (activeABuildingMonthSummary ? activeABuildingMonthSummary.entries
      .filter((entry) => entry.vendor === 'Common Settlement')
      .reduce((sum, entry) => sum + toNumber(entry.payment), 0) : 0)
  };
}

function getFYFromDate(dateStr) {
  if (!dateStr) return 'FY 2026-27';
  const parts = dateStr.split('-');
  const y = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  if (isNaN(y) || isNaN(m)) return 'FY 2026-27';
  const fyStart = m >= 4 ? y : y - 1;
  return `FY ${fyStart}-${String(fyStart + 1).slice(2)}`;
}

function VendorAnalyticsView({ allHistory = [], currentEntries = [] }) {
  const [searchQuery, setSearchFilter] = useState('Rushi Dhide');
  const [scope, setScope] = useState('all');

  const dataset = useMemo(() => {
    const raw = scope === 'all' ? allHistory : currentEntries;
    return (raw || []).filter((e) => toNumber(e.payment) > 0);
  }, [scope, allHistory, currentEntries]);

  const normalizeVendorKey = (v = '') => {
    const s = v.toLowerCase().trim();
    if (s.includes('rushi') || s.includes('rshikesh') || s.includes('rushikesh') || s.includes('rishi') || s.includes('rudhi') || s.includes('dhide') || s.includes('dede')) {
      return 'Rushi Dhide / Dede';
    }
    if (s.includes('uttareshwar') || s.includes('uttareswar')) {
      return 'Uttareswar (Waterman)';
    }
    if (s.includes('siddu')) {
      return 'Siddu Lende (Common Expenses)';
    }
    if (s.includes('rana')) {
      return 'Rana Biswas (Plumbing)';
    }
    if (s.includes('parmeshwar') || s.includes('pitale')) {
      return 'Parmeshwar Pitale (Plumbing)';
    }
    if (s.includes('igs') || s.includes('solar')) {
      return 'IGS Enterprises (Solar)';
    }
    if (s.includes('mamata') || s.includes('stationery')) {
      return 'Mamata Stationery';
    }
    if (s.includes('suryavanshi')) {
      return 'Swapnil Suryavanshi (Plumbing)';
    }
    if (s.includes('mmr')) {
      return 'MMR Technologies';
    }
    return v.trim() || 'Other';
  };

  const leaderboard = useMemo(() => {
    const map = new Map();
    dataset.forEach((e) => {
      const key = normalizeVendorKey(e.vendor);
      if (!map.has(key)) {
        map.set(key, { vendor: key, count: 0, totalAmount: 0, entries: [] });
      }
      const item = map.get(key);
      item.count += 1;
      item.totalAmount += toNumber(e.payment);
      item.entries.push(e);
    });
    return Array.from(map.values()).sort((a, b) => b.totalAmount - a.totalAmount);
  }, [dataset]);

  const totalExpenseAcrossAll = useMemo(() => {
    return dataset.reduce((sum, e) => sum + toNumber(e.payment), 0);
  }, [dataset]);

  const filteredEntries = useMemo(() => {
    if (!searchQuery.trim()) return dataset;
    const q = searchQuery.toLowerCase().trim();

    return dataset.filter((e) => {
      const v = (e.vendor || '').toLowerCase();
      const p = (e.purpose || '').toLowerCase();
      const r = (e.remarks || '').toLowerCase();

      if (q.includes('rushi') || q.includes('dede') || q.includes('dhide')) {
        return (
          v.includes('rushi') ||
          v.includes('rshikesh') ||
          v.includes('rushikesh') ||
          v.includes('rishi') ||
          v.includes('rudhi') ||
          v.includes('dede') ||
          v.includes('dhide') ||
          p.includes('dhide') ||
          p.includes('rushi')
        );
      }
      return v.includes(q) || p.includes(q) || r.includes(q);
    });
  }, [dataset, searchQuery]);

  const filteredTotal = useMemo(() => {
    return filteredEntries.reduce((sum, e) => sum + toNumber(e.payment), 0);
  }, [filteredEntries]);

  const averagePerJob = useMemo(() => {
    return filteredEntries.length > 0 ? filteredTotal / filteredEntries.length : 0;
  }, [filteredTotal, filteredEntries]);

  const fyBreakdown = useMemo(() => {
    const map = {};
    filteredEntries.forEach((e) => {
      const fy = getFYFromDate(e.date);
      if (!map[fy]) map[fy] = { count: 0, amount: 0 };
      map[fy].count += 1;
      map[fy].amount += toNumber(e.payment);
    });
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b));
  }, [filteredEntries]);

  const handleExportVendorExcel = () => {
    const workbook = XLSX.utils.book_new();
    const rows = filteredEntries.map((e, idx) => ({
      '#': idx + 1,
      Date: formatShortDate(e.date),
      'Vendor / Payee': e.vendor,
      'Purpose / Description': e.purpose,
      'Amount Paid (INR)': toNumber(e.payment),
      'Financial Year': getFYFromDate(e.date),
      Remarks: e.remarks || ''
    }));
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rows), 'Vendor Report');
    XLSX.writeFile(workbook, `Vendor_Report_${(searchQuery || 'All').replace(/[^a-zA-Z0-9]/g, '_')}.xlsx`);
  };

  const handlePrintVendorPDF = () => {
    const generatedDate = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    const title = searchQuery ? `Vendor Audit: ${searchQuery}` : 'Complete Vendor Expenditure Report';

    const printDoc = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="utf-8">
        <title>Majestique Euriska - ${title}</title>
        <style>
          * { box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
          body { margin: 0; padding: 24px; color: #0f172a; background: #ffffff; }
          .header { border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: flex-end; }
          .title { font-size: 20px; font-weight: 800; color: #0f172a; margin: 0; }
          .subtitle { font-size: 13px; color: #475569; margin-top: 4px; }
          .meta { font-size: 11px; color: #475569; text-align: right; }
          
          .summary-bar {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 12px;
            margin-bottom: 16px;
          }
          .summary-card {
            padding: 10px 14px;
            background: #f8fafc;
            border: 1px solid #cbd5e1;
            border-radius: 8px;
          }
          .summary-title { font-size: 10px; font-weight: 700; text-transform: uppercase; color: #64748b; margin-bottom: 2px; }
          .summary-value { font-size: 15px; font-weight: 800; color: #0f172a; }
          
          table { width: 100%; border-collapse: collapse; font-size: 11px; }
          th { background: #f1f5f9; color: #1e293b; font-weight: 700; text-align: left; padding: 8px 10px; border: 1px solid #94a3b8; text-transform: uppercase; font-size: 10px; letter-spacing: 0.05em; }
          td { padding: 7px 10px; border: 1px solid #cbd5e1; color: #0f172a; }
          tr:nth-child(even) { background: #f8fafc; }
          
          .amount-outflow { color: #dc2626; font-weight: 700; text-align: right; }
          tfoot tr { background: #e2e8f0; font-weight: 800; }
          tfoot td { border: 1px solid #94a3b8; padding: 8px 10px; }
          
          .footer {
            margin-top: 24px;
            border-top: 1px solid #cbd5e1;
            padding-top: 10px;
            font-size: 10px;
            color: #64748b;
            display: flex;
            justify-content: space-between;
          }
          
          @media print {
            body { padding: 0; }
            @page { margin: 1cm; size: A4 portrait; }
            thead { display: table-header-group; }
            tfoot { display: table-footer-group; }
            tr { page-break-inside: avoid; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <h1 class="title">🏢 MAJESTIQUE EURISKA 'A' BUILDING CO-OP HOUSING SOCIETY LTD.</h1>
            <div class="subtitle">Reg. No: PNA/PNA (4)/HSG/(TC)/21207/2019-20 • S. No. 2, Plot No C-1, Village Mohammed Wadi, Taluka Haveli, Pune - 411060</div>
            <div style="font-size: 11px; color: #64748b; margin-top: 2px;">Expenditure Audit Statement • ${title}</div>
          </div>
          <div class="meta">
            <div><strong>Report Date:</strong> ${generatedDate}</div>
            <div><strong>Total Jobs:</strong> ${filteredEntries.length} Transactions</div>
          </div>
        </div>

        <div class="summary-bar">
          <div class="summary-card">
            <div class="summary-title">Total Amount Paid</div>
            <div class="summary-value" style="color: #dc2626;">${formatCurrency(filteredTotal)}</div>
          </div>
          <div class="summary-card">
            <div class="summary-title">Transactions Recorded</div>
            <div class="summary-value">${filteredEntries.length} Entries</div>
          </div>
          <div class="summary-card">
            <div class="summary-title">Average Paid per Job</div>
            <div class="summary-value">${formatCurrency(averagePerJob)}</div>
          </div>
          <div class="summary-card">
            <div class="summary-title">Date Range</div>
            <div class="summary-value" style="font-size: 11px; margin-top: 3px;">
              ${filteredEntries.length ? `${formatShortDate(filteredEntries[0].date)} → ${formatShortDate(filteredEntries[filteredEntries.length - 1].date)}` : 'N/A'}
            </div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th style="width: 30px; text-align: center;">#</th>
              <th style="width: 85px;">Date</th>
              <th style="width: 140px;">Payee / Vendor</th>
              <th>Purpose / Job Details</th>
              <th style="width: 85px;">FY</th>
              <th style="width: 100px; text-align: right;">Amount (₹)</th>
              <th style="width: 130px;">Remarks</th>
            </tr>
          </thead>
          <tbody>
            ${filteredEntries.map((e, idx) => `
              <tr>
                <td style="text-align: center; color: #64748b;">${idx + 1}</td>
                <td>${formatShortDate(e.date)}</td>
                <td style="font-weight: 700;">${e.vendor || '—'}</td>
                <td>${e.purpose || '—'}</td>
                <td>${getFYFromDate(e.date)}</td>
                <td class="amount-outflow">${formatCurrency(toNumber(e.payment))}</td>
                <td style="color: #64748b; font-style: italic;">${e.remarks || ''}</td>
              </tr>
            `).join('')}
          </tbody>
          <tfoot>
            <tr>
              <td colspan="5" style="text-align: right;">Total Paid:</td>
              <td class="amount-outflow">${formatCurrency(filteredTotal)}</td>
              <td></td>
            </tr>
          </tfoot>
        </table>

        <div class="footer">
          <div>Majestique Euriska Co-Op Housing Society • Vendor Audit Report</div>
          <div>Confidential Accounting Record</div>
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
      printWindow.document.open();
      printWindow.document.write(printDoc);
      printWindow.document.close();
    } else {
      window.print();
    }
  };

  const quickVendors = [
    { label: 'All Payees', query: '' },
    { label: 'Rushi Dhide / Dede (Drainage)', query: 'Rushi Dhide' },
    { label: 'Uttareswar (Waterman)', query: 'Uttareswar' },
    { label: 'Siddu Lende (Common)', query: 'Siddu' },
    { label: 'Rana Biswas (Plumbing)', query: 'Rana Biswas' },
    { label: 'Parmeshwar Pitale (Plumbing)', query: 'Parmeshwar Pitale' },
    { label: 'Swapnil Suryavanshi (Plumbing)', query: 'Swapnil Suryavanshi' },
    { label: 'IGS Enterprises (Solar)', query: 'Solar' },
    { label: 'Mamata Stationery', query: 'Mamata Stationery' }
  ];

  return (
    <div className="petty-cash-tracker-s1">
      {/* Top Search & Filter Bar */}
      <div
        className="petty-cash-tracker-s2"
      >
        <div className="petty-cash-tracker-s3">
          <div className="petty-cash-tracker-s4">
            <input
              type="text"
              placeholder="🔍 Search vendor, contractor, or expense type (e.g. Rushi Dhide, Waterman, Drainage)..."
              value={searchQuery}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="petty-cash-tracker-s5"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchFilter('')}
                className="petty-cash-tracker-s6"
              >
                ✕
              </button>
            )}
          </div>

          <div className="petty-cash-tracker-s7">
            <button
              type="button"
              onClick={() => setScope('all')}
              className={`petty-cash-tracker-s8 ${(scope === 'all' ? 'petty-cash-tracker-cond-1-true' : 'petty-cash-tracker-cond-2-false')}`}
            >
              🌟 All History (2023–2026)
            </button>
            <button
              type="button"
              onClick={() => setScope('fy2627')}
              className={`petty-cash-tracker-s8 ${(scope === 'fy2627' ? 'petty-cash-tracker-cond-3-true' : 'petty-cash-tracker-cond-4-false')}`}
            >
              📅 FY 2026–27 Only
            </button>
            <button
              type="button"
              onClick={handleExportVendorExcel}
              className="petty-cash-tracker-s9"
            >
              📥 Excel
            </button>
            <button
              type="button"
              onClick={handlePrintVendorPDF}
              className="petty-cash-tracker-s9"
            >
              📄 Print PDF
            </button>
          </div>
        </div>

        {/* Quick Vendor Chips */}
        <div className="petty-cash-tracker-s10">
          <span className="petty-cash-tracker-s11">
            Popular Payees:
          </span>
          {quickVendors.map((qv) => {
            const isSelected = searchQuery.toLowerCase() === qv.query.toLowerCase();
            return (
              <button
                key={qv.label}
                type="button"
                onClick={() => setSearchFilter(qv.query)}
                className={`petty-cash-tracker-s12 ${(isSelected ? 'petty-cash-tracker-cond-5-true' : 'petty-cash-tracker-cond-6-false')}`}
              >
                {qv.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* KPI Metrics Cards */}
      <div className="petty-cash-tracker-s13">
        <div className="petty-cash-tracker-s14">
          <div className="petty-cash-tracker-s15">
            Total Spent {searchQuery ? `on "${searchQuery}"` : ''}
          </div>
          <div className="petty-cash-tracker-s16">
            {formatCurrency(filteredTotal)}
          </div>
          <div className="petty-cash-tracker-s17">
            {totalExpenseAcrossAll > 0 ? `${((filteredTotal / totalExpenseAcrossAll) * 100).toFixed(1)}% of total cash outflow` : ''}
          </div>
        </div>

        <div className="petty-cash-tracker-s18">
          <div className="petty-cash-tracker-s19">
            Total Transactions / Jobs
          </div>
          <div className="petty-cash-tracker-s20">
            {filteredEntries.length} <span className="petty-cash-tracker-s21">Entries</span>
          </div>
          <div className="petty-cash-tracker-s17">
            Across {fyBreakdown.length} Financial Years
          </div>
        </div>

        <div className="petty-cash-tracker-s18">
          <div className="petty-cash-tracker-s19">
            Average Spent per Job
          </div>
          <div className="petty-cash-tracker-s22">
            {formatCurrency(averagePerJob)}
          </div>
          <div className="petty-cash-tracker-s17">
            Mean transaction value
          </div>
        </div>

        <div className="petty-cash-tracker-s18">
          <div className="petty-cash-tracker-s19">
            Active Timeline
          </div>
          <div className="petty-cash-tracker-s23">
            {filteredEntries.length > 0
              ? `${formatShortDate(filteredEntries[0].date)} → ${formatShortDate(filteredEntries[filteredEntries.length - 1].date)}`
              : 'No Records'}
          </div>
          <div className="petty-cash-tracker-s17">
            Earliest to latest recorded payment
          </div>
        </div>
      </div>

      {/* Financial Year Breakdown Chips */}
      {fyBreakdown.length > 0 && (
        <div className="petty-cash-tracker-s24">
          <div className="petty-cash-tracker-s25">
            📅 Year-by-Year Spending Breakdown:
          </div>
          <div className="petty-cash-tracker-s26">
            {fyBreakdown.map(([fy, data]) => (
              <div
                key={fy}
                className="petty-cash-tracker-s27"
              >
                <div>
                  <div className="petty-cash-tracker-s28">{fy}</div>
                  <div className="petty-cash-tracker-s29">{data.count} Payments</div>
                </div>
                <div className="petty-cash-tracker-s30">
                  {formatCurrency(data.amount)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Transaction Table */}
      <div className="petty-cash-tracker-s31">
        <table className="petty-cash-tracker-s32">
          <thead>
            <tr>
              <th className="petty-cash-tracker-s33" style={{ ...headerCellStyle }}>#</th>
              <th className="petty-cash-tracker-s34" style={{ ...headerCellStyle }}>Date</th>
              <th className="petty-cash-tracker-s35" style={{ ...headerCellStyle }}>Payee / Vendor</th>
              <th className="petty-cash-tracker-s36" style={{ ...headerCellStyle }}>Purpose / Job Details</th>
              <th className="petty-cash-tracker-s34" style={{ ...headerCellStyle }}>FY</th>
              <th className="petty-cash-tracker-s37" style={{ ...headerCellStyle }}>Amount Paid (₹)</th>
              <th className="petty-cash-tracker-s35" style={{ ...headerCellStyle }}>Remarks</th>
            </tr>
          </thead>
          <tbody>
            {filteredEntries.length === 0 ? (
              <tr>
                <td colSpan={7} style={emptyCellStyle}>
                  No payment records found matching "{searchQuery}".
                </td>
              </tr>
            ) : (
              filteredEntries.map((entry, idx) => (
                <tr key={entry.id || idx} className={`${(idx % 2 === 1 ? 'petty-cash-tracker-cond-7-true' : 'petty-cash-tracker-cond-8-false')}`}>
                  <td className="petty-cash-tracker-s38" style={{ ...bodyCellStyle }}>{idx + 1}</td>
                  <td className="petty-cash-tracker-s39" style={{ ...bodyCellStyle }}>{formatShortDate(entry.date)}</td>
                  <td className="petty-cash-tracker-s40" style={{ ...bodyCellStyle }}>{entry.vendor || '—'}</td>
                  <td className="petty-cash-tracker-s41" style={{ ...bodyCellStyle }}>{entry.purpose || '—'}</td>
                  <td className="petty-cash-tracker-s42" style={{ ...bodyCellStyle }}>{getFYFromDate(entry.date)}</td>
                  <td className="petty-cash-tracker-s43" style={{ ...bodyCellStyle }}>
                    {formatCurrency(toNumber(entry.payment))}
                  </td>
                  <td className="petty-cash-tracker-s44" style={{ ...bodyCellStyle }}>{entry.remarks || <span className="petty-cash-tracker-s45">—</span>}</td>
                </tr>
              ))
            )}
          </tbody>
          <tfoot>
            <tr className="petty-cash-tracker-s46">
              <td colSpan={5} className="petty-cash-tracker-s47" style={{ ...bodyCellStyle }}>
                Total Paid ({filteredEntries.length} Transactions):
              </td>
              <td className="petty-cash-tracker-s43" style={{ ...bodyCellStyle }}>
                {formatCurrency(filteredTotal)}
              </td>
              <td style={bodyCellStyle} />
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Top 15 Payees Leaderboard */}
      <div className="petty-cash-tracker-s48">
        <h4 className="petty-cash-tracker-s49">
          🏆 Society Top Payees & Contractors Leaderboard
        </h4>
        <div className="petty-cash-tracker-s50">
          <table className="petty-cash-tracker-s51">
            <thead>
              <tr>
                <th className="petty-cash-tracker-s52" style={{ ...headerCellStyle }}>Rank</th>
                <th className="petty-cash-tracker-s53" style={{ ...headerCellStyle }}>Vendor / Payee Name</th>
                <th className="petty-cash-tracker-s54" style={{ ...headerCellStyle }}>Jobs Count</th>
                <th className="petty-cash-tracker-s55" style={{ ...headerCellStyle }}>Total Paid (₹)</th>
                <th className="petty-cash-tracker-s56" style={{ ...headerCellStyle }}>% of Total Outflow</th>
                <th className="petty-cash-tracker-s57" style={{ ...headerCellStyle }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {leaderboard.slice(0, 15).map((item, index) => (
                <tr key={item.vendor} className={`${(index % 2 === 1 ? 'petty-cash-tracker-cond-9-true' : 'petty-cash-tracker-cond-10-false')}`}>
                  <td className={`petty-cash-tracker-s58 ${(index < 3 ? 'petty-cash-tracker-cond-11-true' : 'petty-cash-tracker-cond-12-false')}`} style={{ ...bodyCellStyle }}>
                    #{index + 1}
                  </td>
                  <td className="petty-cash-tracker-s59" style={{ ...bodyCellStyle }}>{item.vendor}</td>
                  <td className="petty-cash-tracker-s60" style={{ ...bodyCellStyle }}>{item.count} Jobs</td>
                  <td className="petty-cash-tracker-s61" style={{ ...bodyCellStyle }}>
                    {formatCurrency(item.totalAmount)}
                  </td>
                  <td className="petty-cash-tracker-s62" style={{ ...bodyCellStyle }}>
                    {totalExpenseAcrossAll > 0 ? `${((item.totalAmount / totalExpenseAcrossAll) * 100).toFixed(1)}%` : '0%'}
                  </td>
                  <td className="petty-cash-tracker-s63" style={{ ...bodyCellStyle }}>
                    <button
                      type="button"
                      onClick={() => setSearchFilter(item.vendor)}
                      className="petty-cash-tracker-s64"
                    >
                      Audit ↗
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function SummaryCard({ label, value, accent, caption }) {
  return (
    <div
      className="accounting-summary-card petty-cash-tracker-s65"
    >
      <div
        className="petty-cash-tracker-s66" style={{ background: accent.soft, color: accent.solid }}
      >
        {label.slice(0, 2).toUpperCase()}
      </div>
      <p className="eyebrow petty-cash-tracker-s67">
        {label}
      </p>
      <p className="petty-cash-tracker-s68">{value}</p>
      <p className="petty-cash-tracker-s69">{caption}</p>
    </div>
  );
}

export default function PettyCashTracker({ isAdmin = false }) {
  const [subTab, setSubTab] = useState('buildingA');
  const [entriesByTab, setEntriesByTab] = useState({
    buildingA: DEFAULT_BUILDING_A_ENTRIES,
    common: DEFAULT_COMMON_ENTRIES
  });
  const [historyEntries, setHistoryEntries] = useState(() => ALL_PETTY_CASH_HISTORY);
  const [tableSearch, setTableSearch] = useState('');
  const [activeMonthByTab, setActiveMonthByTab] = useState(() => ({
    buildingA: getCurrentFiscalMonthId('buildingA'),
    common: getCurrentFiscalMonthId('common')
  }));
  const [formData, setFormData] = useState(() => createEmptyForm(getCurrentFiscalMonthId('buildingA')));
  const [isLoading, setIsLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState('idle');
  const [saveMessage, setSaveMessage] = useState('');
  const [editingEntryId, setEditingEntryId] = useState(null);

  const autoSaveTimer = useRef(null);
  const loadedRef = useRef(false);

  useEffect(() => {
    if (subTab !== 'vendorAnalytics') {
      setFormData(createEmptyForm(activeMonthByTab[subTab]));
    }
  }, [activeMonthByTab, subTab]);

  useEffect(() => {
    let cancelled = false;

    async function loadRemote() {
      setIsLoading(true);
      loadedRef.current = false;

      if (!isFirebaseConfigured || !db) {
        setIsLoading(false);
        loadedRef.current = true;
        return;
      }

      try {
        await ensureFirebaseSession();
        const [buildingASnapshot, commonSnapshot, historySnapshot] = await Promise.all([
          getDoc(doc(db, 'pettyCash', PETTY_CASH_DOC_IDS.buildingA)),
          getDoc(doc(db, 'pettyCash', PETTY_CASH_DOC_IDS.common)),
          getDoc(doc(db, 'pettyCash', PETTY_CASH_DOC_IDS.history))
        ]);

        if (cancelled) {
          return;
        }

        setEntriesByTab({
          buildingA: buildingASnapshot.exists()
            ? buildingASnapshot.data().entries || DEFAULT_BUILDING_A_ENTRIES
            : DEFAULT_BUILDING_A_ENTRIES,
          common: commonSnapshot.exists()
            ? commonSnapshot.data().entries || DEFAULT_COMMON_ENTRIES
            : DEFAULT_COMMON_ENTRIES
        });

        if (historySnapshot.exists()) {
          const hData = historySnapshot.data();
          if (Array.isArray(hData.entries) && hData.entries.length > 0) {
            setHistoryEntries(hData.entries);
          }
        }
        setSaveStatus('saved');
        setSaveMessage('Synced');
      } catch (error) {
        console.error('Petty Cash load error:', error);
      } finally {
        if (!cancelled) {
          setIsLoading(false);
          loadedRef.current = true;
        }
      }
    }

    loadRemote();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => () => window.clearTimeout(autoSaveTimer.current), []);

  const saveEntries = useCallback(async (tabId, entries) => {
    setSaveStatus('saving');
    setSaveMessage('Saving...');

    if (!isFirebaseConfigured || !db) {
      setSaveStatus('saved');
      setSaveMessage('Saved locally');
      return;
    }

    try {
      await ensureFirebaseSession();
      await setDoc(
        doc(db, 'pettyCash', PETTY_CASH_DOC_IDS[tabId]),
        {
          entries,
          updatedAt: serverTimestamp()
        },
        { merge: true }
      );
      setSaveStatus('saved');
      setSaveMessage('Saved');
    } catch (error) {
      console.error('Petty Cash save error:', error);
      setSaveStatus('error');
      setSaveMessage('Save failed');
    }
  }, []);

  const queueSave = useCallback(
    (tabId, entries) => {
      if (!loadedRef.current) {
        return;
      }

      window.clearTimeout(autoSaveTimer.current);
      setSaveStatus('pending');
      setSaveMessage('Unsaved changes...');
      autoSaveTimer.current = window.setTimeout(() => {
        saveEntries(tabId, entries);
      }, 1200);
    },
    [saveEntries]
  );

  const monthSummariesByTab = useMemo(
    () => ({
      buildingA: buildMonthSummaries(entriesByTab.buildingA, getFiscalMonths('buildingA')),
      common: buildMonthSummaries(entriesByTab.common, getFiscalMonths('common'))
    }),
    [entriesByTab]
  );

  const effectiveTab = subTab === 'vendorAnalytics' ? 'buildingA' : subTab;
  const activeMonthId = activeMonthByTab[effectiveTab] || getCurrentFiscalMonthId(effectiveTab);
  const activeMonthSummary =
    monthSummariesByTab[effectiveTab]?.find((month) => month.id === activeMonthId) ||
    monthSummariesByTab[effectiveTab]?.[0] || {
      id: '2026-08',
      label: 'August 2026',
      entries: [],
      receipts: 0,
      payments: 0,
      openingBalance: 0,
      closingBalance: 0
    };

  const fiscalTotals = useMemo(() => {
    const entries = entriesByTab[effectiveTab] || [];
    const monthSummaries = monthSummariesByTab[effectiveTab] || [];
    const totalReceipts = entries.reduce((sum, entry) => sum + toNumber(entry.receipt), 0);
    const totalPayments = entries.reduce((sum, entry) => sum + toNumber(entry.payment), 0);

    return {
      totalReceipts,
      totalPayments,
      closingBalance: monthSummaries[monthSummaries.length - 1]?.closingBalance || 0,
      totalTransactions: entries.length
    };
  }, [entriesByTab, monthSummariesByTab, effectiveTab]);

  const activeSubTabMeta = SUB_TABS.find((tab) => tab.id === subTab);

  const updateCurrentTabEntries = useCallback(
    (updater) => {
      setEntriesByTab((current) => {
        const nextEntries = typeof updater === 'function' ? updater(current[subTab]) : updater;
        const next = {
          ...current,
          [subTab]: nextEntries
        };

        queueSave(subTab, nextEntries);
        return next;
      });
    },
    [queueSave, subTab]
  );

  const handleAddEntry = (event) => {
    event.preventDefault();

    if (!isAdmin) {
      return;
    }

    if (!formData.date.startsWith(activeMonthId)) {
      window.alert(`Please use a date inside ${activeMonthSummary.label}.`);
      return;
    }

    if (!formData.date || (!formData.receipt && !formData.payment)) {
      window.alert('Date and either receipt or payment amount is required.');
      return;
    }

    const newEntry = {
      id: Date.now(),
      date: formData.date,
      vendor: formData.vendor,
      purpose: formData.purpose,
      receipt: formData.receipt,
      payment: formData.payment,
      remarks: formData.remarks
    };

    updateCurrentTabEntries((currentEntries) => sortEntries([...currentEntries, newEntry]));
    setFormData(createEmptyForm(activeMonthId));
  };

  const handleFieldChange = (field, value) => {
    setFormData((current) => ({
      ...current,
      [field]: value
    }));
  };

  const updateEntry = (entryId, field, value) => {
    if (!isAdmin) {
      return;
    }

    updateCurrentTabEntries((currentEntries) =>
      sortEntries(
        currentEntries.map((entry) =>
          entry.id === entryId
            ? {
                ...entry,
                [field]: value
              }
            : entry
        )
      )
    );
  };

  const removeEntry = (entryId) => {
    if (!isAdmin) {
      return;
    }

    if (!window.confirm('Delete this entry?')) {
      return;
    }

    updateCurrentTabEntries((currentEntries) =>
      currentEntries.filter((entry) => entry.id !== entryId)
    );
  };

  const handleExport = () => {
    const targetTab = subTab === 'vendorAnalytics' ? 'buildingA' : subTab;
    const workbook = XLSX.utils.book_new();
    const monthRows = (monthSummariesByTab[targetTab] || []).map((month) => ({
      Month: month.label,
      'Opening Balance': month.openingBalance,
      'Receipts': month.receipts,
      'Payments': month.payments,
      'Closing Balance': month.closingBalance
    }));
    const entryRows = withRunningBalance(entriesByTab[targetTab] || []).map((entry) => ({
      Date: formatShortDate(entry.date),
      Particulars: entry.vendor,
      Description: entry.purpose,
      'Receipt (INR)': toNumber(entry.receipt),
      'Payment (INR)': toNumber(entry.payment),
      'Running Balance (INR)': entry.balance,
      Remarks: entry.remarks || ''
    }));

    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(monthRows), 'Monthly Summary');
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(entryRows), 'Entries');
    XLSX.writeFile(workbook, `Petty_Cash_${targetTab}_FY2026_27.xlsx`);
  };

  const handleExportPDF = () => {
    const generatedDate = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    const targetTab = subTab === 'vendorAnalytics' ? 'buildingA' : subTab;
    const listToPrint = activeMonthSummary.entries;
    const tabName = targetTab === 'common' ? 'Common Expenses Ledger' : 'A Building Operating Ledger';

    const printDoc = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="utf-8">
        <title>Majestique Euriska - ${tabName} (${activeMonthSummary.label})</title>
        <style>
          * { box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
          body { margin: 0; padding: 24px; color: #0f172a; background: #ffffff; }
          .header { border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: flex-end; }
          .title { font-size: 18px; font-weight: 800; color: #0f172a; margin: 0; text-transform: uppercase; }
          .subtitle { font-size: 11px; color: #475569; margin-top: 3px; }
          .meta { font-size: 11px; color: #475569; text-align: right; }
          
          .summary-bar {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 12px;
            margin-bottom: 16px;
          }
          .summary-card {
            padding: 10px 14px;
            background: #f8fafc;
            border: 1px solid #cbd5e1;
            border-radius: 8px;
          }
          .summary-card.inflow { background: #f0fdf4; border-color: #bbf7d0; }
          .summary-card.outflow { background: #fef2f2; border-color: #fecaca; }
          .summary-card.closing { background: ${activeMonthSummary.closingBalance >= 0 ? '#f0fdf4' : '#fff1f2'}; border-color: ${activeMonthSummary.closingBalance >= 0 ? '#bbf7d0' : '#fecdd3'}; }
          .summary-title { font-size: 10px; font-weight: 700; text-transform: uppercase; color: #64748b; margin-bottom: 2px; }
          .summary-value { font-size: 15px; font-weight: 800; color: #0f172a; }
          
          table { width: 100%; border-collapse: collapse; font-size: 11px; }
          th { background: #f1f5f9; color: #1e293b; font-weight: 700; text-align: left; padding: 8px 10px; border: 1px solid #94a3b8; text-transform: uppercase; font-size: 10px; letter-spacing: 0.05em; }
          td { padding: 7px 10px; border: 1px solid #cbd5e1; color: #0f172a; }
          tr:nth-child(even) { background: #f8fafc; }
          
          .amount-inflow { color: #059669; font-weight: 700; text-align: right; }
          .amount-outflow { color: #dc2626; font-weight: 700; text-align: right; }
          .amount-balance { font-weight: 800; text-align: right; }
          
          tfoot tr { background: #e2e8f0; font-weight: 800; }
          tfoot td { border: 1px solid #94a3b8; padding: 8px 10px; }
          
          .signatures {
            margin-top: 32px;
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 24px;
            page-break-inside: avoid;
          }
          .sig-box {
            border-top: 1px solid #0f172a;
            padding-top: 8px;
            text-align: center;
          }
          .sig-title { font-weight: 700; font-size: 11px; color: #0f172a; }
          .sig-sub { font-size: 9px; color: #64748b; margin-top: 2px; }

          .footer {
            margin-top: 24px;
            border-top: 1px solid #cbd5e1;
            padding-top: 10px;
            font-size: 10px;
            color: #64748b;
            display: flex;
            justify-content: space-between;
          }
          
          @media print {
            body { padding: 0; }
            @page { margin: 1cm; size: A4 landscape; }
            thead { display: table-header-group; }
            tfoot { display: table-footer-group; }
            tr { page-break-inside: avoid; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <h1 class="title">🏢 MAJESTIQUE EURISKA 'A' BUILDING CO-OP HOUSING SOCIETY LTD.</h1>
            <div class="subtitle">Reg. No: PNA/PNA (4)/HSG/(TC)/21207/2019-20 Date 09/08/2019 • S. No. 2, Plot No C-1, Village Mohammed Wadi, Taluka Haveli, District Pune, Pune - 411060</div>
            <div style="font-size: 11px; color: #64748b; margin-top: 2px;">${tabName} • Monthly Petty Cash Ledger (${activeMonthSummary.label}, FY 2026–27)</div>
          </div>
          <div class="meta">
            <div><strong>Report Date:</strong> ${generatedDate}</div>
            <div><strong>Month:</strong> ${activeMonthSummary.label} (${listToPrint.length} Entries)</div>
          </div>
        </div>

        <div class="summary-bar">
          <div class="summary-card">
            <div class="summary-title">Opening Balance</div>
            <div class="summary-value">${formatCurrency(activeMonthSummary.openingBalance)}</div>
          </div>
          <div class="summary-card inflow">
            <div class="summary-title" style="color: #059669;">Total Receipts (Inflow)</div>
            <div class="summary-value" style="color: #059669;">+${formatCurrency(activeMonthSummary.receipts)}</div>
          </div>
          <div class="summary-card outflow">
            <div class="summary-title" style="color: #dc2626;">Total Payments (Expenses)</div>
            <div class="summary-value" style="color: #dc2626;">-${formatCurrency(activeMonthSummary.payments)}</div>
          </div>
          <div class="summary-card closing">
            <div class="summary-title" style="color: ${activeMonthSummary.closingBalance >= 0 ? '#059669' : '#dc2626'};">Closing Balance (${activeMonthSummary.label})</div>
            <div class="summary-value" style="color: ${activeMonthSummary.closingBalance >= 0 ? '#059669' : '#dc2626'};">${formatCurrency(activeMonthSummary.closingBalance)}</div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th style="width: 32px; text-align: center;">#</th>
              <th style="width: 85px;">Date</th>
              <th style="width: 160px;">Particulars</th>
              <th>Description</th>
              <th style="width: 100px; text-align: right;">Receipt (₹)</th>
              <th style="width: 100px; text-align: right;">Payment (₹)</th>
              <th style="width: 110px; text-align: right;">Balance (₹)</th>
              <th style="width: 160px;">Remarks</th>
            </tr>
          </thead>
          <tbody>
            ${listToPrint.length === 0 ? `
              <tr>
                <td colspan="8" style="text-align: center; padding: 24px; color: #64748b;">No transactions recorded for ${activeMonthSummary.label}.</td>
              </tr>
            ` : listToPrint.map((entry, index) => `
              <tr>
                <td style="text-align: center; color: #64748b; font-weight: 600;">${index + 1}</td>
                <td style="white-space: nowrap;">${formatShortDate(entry.date)}</td>
                <td style="font-weight: 700;">${entry.vendor || '—'}</td>
                <td>${entry.purpose || '—'}</td>
                <td class="amount-inflow">${toNumber(entry.receipt) > 0 ? formatCurrency(toNumber(entry.receipt)) : '—'}</td>
                <td class="amount-outflow">${toNumber(entry.payment) > 0 ? formatCurrency(toNumber(entry.payment)) : '—'}</td>
                <td class="amount-balance" style="color: ${entry.balance >= 0 ? '#059669' : '#dc2626'};">${formatCurrency(entry.balance)}</td>
                <td style="color: #64748b; font-style: italic;">${entry.remarks || ''}</td>
              </tr>
            `).join('')}
          </tbody>
          <tfoot>
            <tr>
              <td colspan="4" style="text-align: right;">${activeMonthSummary.label} Total:</td>
              <td class="amount-inflow">${formatCurrency(activeMonthSummary.receipts)}</td>
              <td class="amount-outflow">${formatCurrency(activeMonthSummary.payments)}</td>
              <td class="amount-balance" style="color: ${activeMonthSummary.closingBalance >= 0 ? '#059669' : '#dc2626'};">${formatCurrency(activeMonthSummary.closingBalance)}</td>
              <td></td>
            </tr>
          </tfoot>
        </table>

        <div class="signatures">
          <div class="sig-box">
            <div class="sig-title">Prepared By (Society Manager)</div>
            <div class="sig-sub">Cash Custodian / Entry Operator</div>
          </div>
          <div class="sig-box">
            <div class="sig-title">Society Treasurer</div>
            <div class="sig-sub">Verified with Physical Cash &amp; Vouchers</div>
          </div>
          <div class="sig-box">
            <div class="sig-title">Secretary / Chairman</div>
            <div class="sig-sub">Approved for Society Accounts</div>
          </div>
        </div>

        <div class="footer">
          <div>Majestique Euriska Co-Op Housing Society • Petty Cash Accounting Statement</div>
          <div>Page 1 • Official Financial Record</div>
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
      printWindow.document.open();
      printWindow.document.write(printDoc);
      printWindow.document.close();
    } else {
      window.print();
    }
  };

  const handlePrintAnnualPDF = () => {
    const generatedDate = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    const targetTab = subTab === 'vendorAnalytics' ? 'buildingA' : subTab;
    const tabName = targetTab === 'common' ? 'Common Expenses Ledger' : 'A Building Operating Ledger';
    const monthsData = monthSummariesByTab[targetTab] || [];

    const totalReceiptsFY = monthsData.reduce((sum, m) => sum + (m.receipts || 0), 0);
    const totalPaymentsFY = monthsData.reduce((sum, m) => sum + (m.payments || 0), 0);
    const firstMonthOpening = monthsData.length > 0 ? (monthsData[0].openingBalance || 0) : 0;
    const latestClosing = monthsData.length > 0 ? monthsData[monthsData.length - 1].closingBalance : 0;

    const printDoc = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="utf-8">
        <title>Majestique Euriska - Full FY 2026-27 Statement (${tabName})</title>
        <style>
          * { box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
          body { margin: 0; padding: 24px; color: #0f172a; background: #ffffff; }
          .header { border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: flex-end; }
          .title { font-size: 18px; font-weight: 800; color: #0f172a; margin: 0; text-transform: uppercase; }
          .subtitle { font-size: 11px; color: #475569; margin-top: 3px; }
          .meta { font-size: 11px; color: #475569; text-align: right; }
          
          .summary-bar {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 12px;
            margin-bottom: 18px;
          }
          .summary-card {
            padding: 10px 14px;
            background: #f8fafc;
            border: 1px solid #cbd5e1;
            border-radius: 8px;
          }
          .summary-card.inflow { background: #f0fdf4; border-color: #bbf7d0; }
          .summary-card.outflow { background: #fef2f2; border-color: #fecaca; }
          .summary-card.closing { background: ${latestClosing >= 0 ? '#f0fdf4' : '#fff1f2'}; border-color: ${latestClosing >= 0 ? '#bbf7d0' : '#fecdd3'}; }
          .summary-title { font-size: 10px; font-weight: 700; text-transform: uppercase; color: #64748b; margin-bottom: 2px; }
          .summary-value { font-size: 15px; font-weight: 800; color: #0f172a; }
          
          table { width: 100%; border-collapse: collapse; font-size: 11px; margin-bottom: 18px; }
          th { background: #f1f5f9; color: #1e293b; font-weight: 700; text-align: left; padding: 7px 10px; border: 1px solid #94a3b8; text-transform: uppercase; font-size: 10px; letter-spacing: 0.05em; }
          td { padding: 6px 10px; border: 1px solid #cbd5e1; color: #0f172a; }
          tr:nth-child(even) { background: #f8fafc; }
          
          .amount-inflow { color: #059669; font-weight: 700; text-align: right; }
          .amount-outflow { color: #dc2626; font-weight: 700; text-align: right; }
          .amount-balance { font-weight: 800; text-align: right; }
          
          tfoot tr { background: #e2e8f0; font-weight: 800; }
          tfoot td { border: 1px solid #94a3b8; padding: 8px 10px; }

          .section-heading {
            font-size: 12px;
            font-weight: 800;
            text-transform: uppercase;
            color: #0f172a;
            margin: 16px 0 8px 0;
            padding-bottom: 4px;
            border-bottom: 1px solid #cbd5e1;
          }
          
          .signatures {
            margin-top: 32px;
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 24px;
            page-break-inside: avoid;
          }
          .sig-box {
            border-top: 1px solid #0f172a;
            padding-top: 8px;
            text-align: center;
          }
          .sig-title { font-weight: 700; font-size: 11px; color: #0f172a; }
          .sig-sub { font-size: 9px; color: #64748b; margin-top: 2px; }
          
          .footer {
            margin-top: 24px;
            border-top: 1px solid #cbd5e1;
            padding-top: 10px;
            font-size: 10px;
            color: #64748b;
            display: flex;
            justify-content: space-between;
          }
          
          @media print {
            body { padding: 0; }
            @page { margin: 1cm; size: A4 landscape; }
            thead { display: table-header-group; }
            tfoot { display: table-footer-group; }
            tr { page-break-inside: avoid; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <h1 class="title">🏢 MAJESTIQUE EURISKA 'A' BUILDING CO-OP HOUSING SOCIETY LTD.</h1>
            <div class="subtitle">Reg. No: PNA/PNA (4)/HSG/(TC)/21207/2019-20 Date 09/08/2019 • S. No. 2, Plot No C-1, Village Mohammed Wadi, Taluka Haveli, District Pune, Pune - 411060</div>
            <div style="font-size: 11px; color: #64748b; margin-top: 2px;">${tabName} • Financial Year 2026–27 Master Ledger</div>
          </div>
          <div class="meta">
            <div><strong>Report Date:</strong> ${generatedDate}</div>
            <div><strong>Fiscal Year:</strong> 2026–2027 (12 Months)</div>
          </div>
        </div>

        <div class="summary-bar">
          <div class="summary-card">
            <div class="summary-title">FY Opening Balance</div>
            <div class="summary-value">${formatCurrency(firstMonthOpening)}</div>
          </div>
          <div class="summary-card inflow">
            <div class="summary-title" style="color: #059669;">Total FY Receipts</div>
            <div class="summary-value" style="color: #059669;">+${formatCurrency(totalReceiptsFY)}</div>
          </div>
          <div class="summary-card outflow">
            <div class="summary-title" style="color: #dc2626;">Total FY Payments</div>
            <div class="summary-value" style="color: #dc2626;">-${formatCurrency(totalPaymentsFY)}</div>
          </div>
          <div class="summary-card closing">
            <div class="summary-title" style="color: ${latestClosing >= 0 ? '#059669' : '#dc2626'};">Latest Closing Balance</div>
            <div class="summary-value" style="color: ${latestClosing >= 0 ? '#059669' : '#dc2626'};">${formatCurrency(latestClosing)}</div>
          </div>
        </div>

        <div class="section-heading">1. Monthly Consolidated Summary (FY 2026–27)</div>
        <table>
          <thead>
            <tr>
              <th style="width: 35px; text-align: center;">#</th>
              <th>Month</th>
              <th style="text-align: right; width: 140px;">Opening (₹)</th>
              <th style="text-align: right; width: 140px;">Receipts (₹)</th>
              <th style="text-align: right; width: 140px;">Payments (₹)</th>
              <th style="text-align: right; width: 140px;">Closing (₹)</th>
              <th style="text-align: center; width: 100px;">Entries</th>
            </tr>
          </thead>
          <tbody>
            ${monthsData.map((m, idx) => `
              <tr>
                <td style="text-align: center; color: #64748b;">${idx + 1}</td>
                <td style="font-weight: 700;">${m.label}</td>
                <td style="text-align: right;">${formatCurrency(m.openingBalance)}</td>
                <td class="amount-inflow">${m.receipts > 0 ? formatCurrency(m.receipts) : '—'}</td>
                <td class="amount-outflow">${m.payments > 0 ? formatCurrency(m.payments) : '—'}</td>
                <td class="amount-balance" style="color: ${m.closingBalance >= 0 ? '#059669' : '#dc2626'};">${formatCurrency(m.closingBalance)}</td>
                <td style="text-align: center;">${(m.entries || []).length}</td>
              </tr>
            `).join('')}
          </tbody>
          <tfoot>
            <tr>
              <td colspan="2" style="text-align: right;">FY 2026-27 TOTAL:</td>
              <td style="text-align: right;">${formatCurrency(firstMonthOpening)}</td>
              <td class="amount-inflow">${formatCurrency(totalReceiptsFY)}</td>
              <td class="amount-outflow">${formatCurrency(totalPaymentsFY)}</td>
              <td class="amount-balance" style="color: ${latestClosing >= 0 ? '#059669' : '#dc2626'};">${formatCurrency(latestClosing)}</td>
              <td style="text-align: center;">${monthsData.reduce((s, m) => s + (m.entries || []).length, 0)}</td>
            </tr>
          </tfoot>
        </table>

        <div class="signatures">
          <div class="sig-box">
            <div class="sig-title">Prepared By (Society Manager)</div>
            <div class="sig-sub">Cash Custodian / Entry Operator</div>
          </div>
          <div class="sig-box">
            <div class="sig-title">Society Treasurer</div>
            <div class="sig-sub">Verified with Cash In Hand &amp; Vouchers</div>
          </div>
          <div class="sig-box">
            <div class="sig-title">Secretary / Chairman</div>
            <div class="sig-sub">Approved by Managing Committee</div>
          </div>
        </div>

        <div class="footer">
          <div>Majestique Euriska Co-Op Housing Society • Annual Petty Cash Ledger</div>
          <div>Official Financial Record • FY 2026-27</div>
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
      printWindow.document.open();
      printWindow.document.write(printDoc);
      printWindow.document.close();
    } else {
      window.print();
    }
  };

  const handlePrintVoucher = (entry) => {
    const isPayment = toNumber(entry.payment) > 0;
    const amountVal = isPayment ? toNumber(entry.payment) : toNumber(entry.receipt);
    const voucherType = isPayment ? 'PAYMENT VOUCHER' : 'RECEIPT VOUCHER';
    const voucherColor = isPayment ? '#dc2626' : '#059669';
    const targetTab = subTab === 'vendorAnalytics' ? 'buildingA' : subTab;
    const ledgerTitle = targetTab === 'common' ? 'Common Expenses Ledger' : 'A Building Operating Ledger';
    const voucherNo = `ME/PCV/2026-27/${(entry.date || '').replace(/-/g, '')}-${String(entry.id || '101').replace(/\\D/g, '').slice(-3) || '001'}`;

    const voucherDoc = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="utf-8">
        <title>Petty Cash Voucher - ${voucherNo}</title>
        <style>
          * { box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
          body { margin: 0; padding: 24px; color: #0f172a; background: #ffffff; }
          .voucher-frame {
            border: 2px solid #0f172a;
            border-radius: 12px;
            padding: 24px;
            max-width: 820px;
            margin: 0 auto;
            position: relative;
          }
          .society-title { font-size: 16px; font-weight: 800; text-align: center; color: #0f172a; text-transform: uppercase; letter-spacing: 0.04em; }
          .society-sub { font-size: 10px; text-align: center; color: #475569; margin-top: 3px; }
          
          .voucher-badge {
            margin: 14px auto 16px auto;
            text-align: center;
          }
          .badge-pill {
            display: inline-block;
            padding: 6px 20px;
            border-radius: 6px;
            background: #0f172a;
            color: #ffffff;
            font-size: 12px;
            font-weight: 800;
            letter-spacing: 0.08em;
            text-transform: uppercase;
          }
          
          .meta-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            border-top: 1px solid #cbd5e1;
            border-bottom: 1px solid #cbd5e1;
            padding: 10px 0;
            margin-bottom: 18px;
            font-size: 12px;
            gap: 8px;
          }
          .meta-item { display: flex; justify-content: space-between; padding: 2px 8px; }
          .meta-item strong { color: #334155; }
          
          .detail-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 18px;
            font-size: 12px;
          }
          .detail-table th {
            background: #f1f5f9;
            padding: 8px 10px;
            border: 1px solid #94a3b8;
            text-align: left;
            font-weight: 700;
            font-size: 11px;
            text-transform: uppercase;
          }
          .detail-table td {
            padding: 12px 10px;
            border: 1px solid #cbd5e1;
            vertical-align: top;
          }
          
          .amount-box {
            display: flex;
            align-items: center;
            justify-content: space-between;
            background: #f8fafc;
            border: 2px solid #0f172a;
            border-radius: 8px;
            padding: 12px 16px;
            margin-bottom: 22px;
          }
          .amount-words {
            font-size: 12px;
            font-style: italic;
            color: #334155;
            max-width: 65%;
          }
          .amount-figure {
            font-size: 20px;
            font-weight: 900;
            color: ${voucherColor};
          }
          
          .sig-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 20px;
            margin-top: 36px;
            padding-top: 10px;
          }
          .sig-box {
            text-align: center;
            border-top: 1px solid #0f172a;
            padding-top: 8px;
          }
          .sig-title { font-size: 11px; font-weight: 700; color: #0f172a; }
          .sig-sub { font-size: 9px; color: #64748b; margin-top: 2px; }
          
          @media print {
            body { padding: 0; }
            @page { margin: 1cm; size: A5 landscape; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="voucher-frame">
          <div class="society-title">MAJESTIQUE EURISKA 'A' BUILDING CO-OP HOUSING SOCIETY LTD.</div>
          <div class="society-sub">Reg. No: PNA/PNA (4)/HSG/(TC)/21207/2019-20 Date 09/08/2019 • S. No. 2, Plot No C-1, Village Mohammed Wadi, Taluka Haveli, District Pune, Pune - 411060</div>
          
          <div class="voucher-badge">
            <span class="badge-pill">PETTY CASH ${voucherType}</span>
          </div>

          <div class="meta-grid">
            <div class="meta-item">
              <span><strong>Voucher No:</strong> ${voucherNo}</span>
            </div>
            <div class="meta-item" style="justify-content: flex-end;">
              <span><strong>Date:</strong> ${formatShortDate(entry.date)}</span>
            </div>
            <div class="meta-item">
              <span><strong>Ledger Account:</strong> ${ledgerTitle}</span>
            </div>
            <div class="meta-item" style="justify-content: flex-end;">
              <span><strong>Mode:</strong> Cash in Hand</span>
            </div>
          </div>

          <table class="detail-table">
            <thead>
              <tr>
                <th style="width: 35%;">Particulars / Head of Account</th>
                <th>Description / Purpose</th>
                <th style="width: 25%; text-align: right;">Amount (₹)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <div style="font-weight: 800; font-size: 13px; color: #0f172a;">${entry.vendor || 'Expenses'}</div>
                  <div style="font-size: 10px; color: #64748b; margin-top: 4px;">Paid ${isPayment ? 'To' : 'By'}: ${entry.vendor || 'Payee'}</div>
                </td>
                <td>
                  <div style="font-size: 12px; color: #1e293b;">${entry.purpose || 'Society Maintenance & Operational Expense'}</div>
                  ${entry.remarks ? `<div style="font-size: 10px; color: #64748b; margin-top: 6px; font-style: italic;"><strong>Remarks:</strong> ${entry.remarks}</div>` : ''}
                </td>
                <td style="text-align: right; font-weight: 800; font-size: 14px; color: ${voucherColor};">
                  ${formatCurrency(amountVal)}
                </td>
              </tr>
            </tbody>
          </table>

          <div class="amount-box">
            <div class="amount-words">
              <strong>Amount in Words:</strong><br />
              ${numberToWordsINR(amountVal)}
            </div>
            <div class="amount-figure">
              ₹${formatCurrency(amountVal)}
            </div>
          </div>

          <div class="sig-grid">
            <div class="sig-box">
              <div class="sig-title">Receiver's Signature</div>
              <div class="sig-sub">Sign / Thumb &amp; Date</div>
            </div>
            <div class="sig-box">
              <div class="sig-title">Prepared By (Manager)</div>
              <div class="sig-sub">Cash Custodian</div>
            </div>
            <div class="sig-box">
              <div class="sig-title">Treasurer / Secretary</div>
              <div class="sig-sub">Verified &amp; Passed</div>
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
      printWindow.document.open();
      printWindow.document.write(voucherDoc);
      printWindow.document.close();
    } else {
      window.print();
    }
  };

  const handleSelectSubTab = (nextTab) => {
    setSubTab(nextTab);
  };

  const activeSaveTone =
    saveStatus === 'error'
      ? '#B42318'
      : saveStatus === 'saved'
        ? '#0B6E4F'
        : '#667085';

  const commonSettlementSummary = calculateCommonSettlementBalance({
    activeMonthId,
    monthSummariesByTab
  });

  return (
    <div className="accounting-shell">
      <div
        className="dashboard-hero-card petty-cash-tracker-s70"
      >
        <div className="petty-cash-tracker-s71">
          <p className="eyebrow petty-cash-tracker-s72">
            Petty Cash Workspace
          </p>
          <h2 className="petty-cash-tracker-s73">
            A Building and Common Expense Ledger
          </h2>
          <p className="petty-cash-tracker-s74">
            Fresh month-based petty cash structure for FY 2026-27. Use the A Building Expenses and
            Common Expenses tabs below, then switch across April 2026 through March 2027.
          </p>
        </div>

        <div
          className="petty-cash-tracker-s75"
        >
          <div
            className="petty-cash-tracker-s76"
          >
            {subTab === 'vendorAnalytics' ? '🔍 Spending Audit' : 'FY 2026-27'}
          </div>
          <div
            className="petty-cash-tracker-s76"
          >
            {subTab === 'vendorAnalytics' ? 'Multi-Year History' : activeMonthSummary.label}
          </div>
          {subTab !== 'vendorAnalytics' && (
            <>
              <button
                type="button"
                onClick={handleExport}
                className="petty-cash-tracker-s77"
              >
                📥 Export Excel
              </button>
              <button
                type="button"
                onClick={handleExportPDF}
                className="petty-cash-tracker-s78"
                title="Print or export current month petty cash statement as PDF"
              >
                📄 Print PDF
              </button>
              <button
                type="button"
                onClick={handlePrintAnnualPDF}
                className="petty-cash-tracker-s78"
                title="Print or export full FY 2026-27 annual statement as PDF"
              >
                📑 Full Year PDF
              </button>
            </>
          )}
        </div>
      </div>



      {subTab !== 'vendorAnalytics' && (() => {
        const {
          pendingCumulativeCommonShare,
          monthlySettled,
          monthlyPending
        } = commonSettlementSummary;

        return (
          <div
            className="petty-cash-tracker-s79"
          >
            <p className="eyebrow petty-cash-tracker-s80">Monthly Ledger Breakdown</p>
            
            <div className="petty-cash-tracker-s81">
              
              <div className="petty-cash-tracker-s82">
                <div className="petty-cash-tracker-s83">
                  Common Expenses Settlement
                </div>
                {monthSummariesByTab.common.map((m, idx) => {
                  const mExpenses = m.expenses || 0;
                  const mShare = mExpenses * (87 / 231);
                  const aBldgMonth = monthSummariesByTab.buildingA.find(am => am.label === m.label);
                  const mSettled = aBldgMonth ? aBldgMonth.entries.filter(e => e.vendor === 'Common Settlement').reduce((s, e) => s + toNumber(e.payment), 0) : 0;
                  
                  if (mShare === 0 && mSettled === 0) return null;
                  
                  return (
                    <div key={idx}>
                      {mShare > 0 && (
                        <div className="petty-cash-tracker-s84">
                          <span className="petty-cash-tracker-s85">Net for {m.label}:</span>
                          <strong className="petty-cash-tracker-s86">{formatSignedCurrency(-mShare)}</strong>
                        </div>
                      )}
                      {mSettled > 0 && (
                        <div className="petty-cash-tracker-s84">
                          <span className="petty-cash-tracker-s85">Settle for {m.label}:</span>
                          <strong className="petty-cash-tracker-s87">+{formatCurrency(mSettled)}</strong>
                        </div>
                      )}
                    </div>
                  );
                })}
                
                <div className="petty-cash-tracker-s88">
                  <span className="petty-cash-tracker-s89">Remaining Pending:</span>
                  <strong className="petty-cash-tracker-s90">{formatSignedCurrency(-pendingCumulativeCommonShare)}</strong>
                </div>
              </div>

              <div className="petty-cash-tracker-s82">
                <div className="petty-cash-tracker-s83">
                  A Building Balance
                </div>
                
                {monthSummariesByTab.buildingA
                  .filter(m => m.id <= activeMonthId)
                  .map((m, idx) => {
                    const net = m.receipts - m.payments;
                    return (
                      <div key={idx} className="petty-cash-tracker-s84">
                        <span className="petty-cash-tracker-s85">Net for {m.label}:</span>
                        <strong className="petty-cash-tracker-s91" style={{ color: net > 0 ? '#0B6E4F' : (net < 0 ? '#B42318' : '#101828') }}>
                          {formatSignedCurrency(net)}
                        </strong>
                      </div>
                    );
                  })
                }

              </div>

            </div>
          </div>
        );
      })()}

      {subTab === 'common' && (
        <div
          className="petty-cash-tracker-s92"
        >
          <div className="petty-cash-tracker-s93">
            <div>
              <p className="eyebrow petty-cash-tracker-s94">Building Split (Total Flats: 231)</p>
              <h3 className="petty-cash-tracker-s95">Shareable Common Expense Balance</h3>
              <p className="petty-cash-tracker-s96">
                Net Balance (Payments - Receipts): <strong>{formatCurrency(activeMonthSummary.payments - activeMonthSummary.receipts)}</strong>
              </p>
            </div>
            <div className="petty-cash-tracker-s97">
              <div className="petty-cash-tracker-s98">
                <div className="petty-cash-tracker-s99">A Building (87)</div>
                <div className="petty-cash-tracker-s100">
                  {formatCurrency(commonSettlementSummary.pendingCumulativeCommonShare)}
                </div>
              </div>
              <div className="petty-cash-tracker-s98">
                <div className="petty-cash-tracker-s99">B Building (96)</div>
                <div className="petty-cash-tracker-s100">
                  {formatCurrency((activeMonthSummary.payments - activeMonthSummary.receipts) * (96 / 231))}
                </div>
              </div>
              <div className="petty-cash-tracker-s98">
                <div className="petty-cash-tracker-s99">C Building (48)</div>
                <div className="petty-cash-tracker-s100">
                  {formatCurrency((activeMonthSummary.payments - activeMonthSummary.receipts) * (48 / 231))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div
        className="table-card petty-cash-tracker-s101"
      >
        <div className="petty-cash-tracker-s102">
          <div className="petty-cash-tracker-s103">
            <div>
              <p className="eyebrow petty-cash-tracker-s104">
                {activeSubTabMeta.eyebrow}
              </p>
              <h3 className="petty-cash-tracker-s105">
                {activeSubTabMeta.label}
              </h3>
              <p className="petty-cash-tracker-s106">
                {activeSubTabMeta.description}
              </p>
            </div>
            <div className="petty-cash-tracker-s107">
              <p className="eyebrow petty-cash-tracker-s104">
                Save Status
              </p>
              <p className="petty-cash-tracker-s108" style={{ color: activeSaveTone }}>
                {saveStatus === 'idle' ? 'Ready' : saveMessage}
              </p>
              <p className="petty-cash-tracker-s109">
                {isAdmin ? 'Admin editing enabled' : 'Read only mode'}
              </p>
            </div>
          </div>

          <div className="petty-cash-tracker-s110">
            {SUB_TABS.map((tab) => {
              const isActive = tab.id === subTab;

              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => handleSelectSubTab(tab.id)}
                  className={`petty-cash-tracker-s111 ${(isActive ? 'petty-cash-tracker-cond-13-true' : 'petty-cash-tracker-cond-14-false')}`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {subTab !== 'vendorAnalytics' && (
            <div
              className="petty-cash-tracker-s112"
            >
              {getFiscalMonths(subTab).map((month) => {
                const isActive = month.id === activeMonthId;

                return (
                  <button
                    key={month.id}
                    type="button"
                    onClick={() =>
                      setActiveMonthByTab((current) => ({
                        ...current,
                        [subTab]: month.id
                      }))
                    }
                    className={`petty-cash-tracker-s113 ${(isActive ? 'petty-cash-tracker-cond-15-true' : 'petty-cash-tracker-cond-16-false')}`}
                  >
                    {month.label}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {subTab === 'vendorAnalytics' ? (
          <VendorAnalyticsView
            allHistory={historyEntries}
            currentEntries={entriesByTab.buildingA}
          />
        ) : (
          <div
            className="petty-cash-tracker-s1"
          >
            <div className="petty-cash-tracker-s114">
              {/* Month Balance KPI Summary Cards */}
              <div className="petty-cash-tracker-s13">
                <div className="petty-cash-tracker-s115">
                  <div className="petty-cash-tracker-s19">Opening Balance</div>
                  <div className={`petty-cash-tracker-s116 ${(activeMonthSummary.openingBalance >= 0 ? 'petty-cash-tracker-cond-17-true' : 'petty-cash-tracker-cond-18-false')}`}>
                    {formatCurrency(activeMonthSummary.openingBalance)}
                  </div>
                </div>
                <div className="petty-cash-tracker-s117">
                  <div className="petty-cash-tracker-s118">Month Receipts (Inflow)</div>
                  <div className="petty-cash-tracker-s119">
                    +{formatCurrency(activeMonthSummary.receipts)}
                  </div>
                </div>
                <div className="petty-cash-tracker-s120">
                  <div className="petty-cash-tracker-s15">Month Payments (Expenses)</div>
                  <div className="petty-cash-tracker-s121">
                    -{formatCurrency(activeMonthSummary.payments)}
                  </div>
                </div>
                <div className={`petty-cash-tracker-s122 ${(activeMonthSummary.closingBalance >= 0 ? 'petty-cash-tracker-cond-19-true' : 'petty-cash-tracker-cond-20-false')}`} style={{ border: `1px solid ${activeMonthSummary.closingBalance >= 0 ? 'rgba(11, 110, 79, 0.25)' : 'rgba(180, 35, 24, 0.25)'}` }}>
                  <div className={`petty-cash-tracker-s123 ${(activeMonthSummary.closingBalance >= 0 ? 'petty-cash-tracker-cond-21-true' : 'petty-cash-tracker-cond-22-false')}`}>Closing Balance ({activeMonthSummary.label})</div>
                  <div className={`petty-cash-tracker-s116 ${(activeMonthSummary.closingBalance >= 0 ? 'petty-cash-tracker-cond-23-true' : 'petty-cash-tracker-cond-24-false')}`}>
                    {formatCurrency(activeMonthSummary.closingBalance)}
                  </div>
                </div>
              </div>

              {/* In-table Search Bar & Export Action Toolbar */}
              <div className="petty-cash-tracker-s124">
                <div className="petty-cash-tracker-s125">
                  <input
                    type="text"
                    placeholder={`🔍 Search in ${activeMonthSummary.label} (e.g. Rushi, Waterman, Stationery, Cable)...`}
                    value={tableSearch}
                    onChange={(e) => setTableSearch(e.target.value)}
                    className="petty-cash-tracker-s126"
                  />
                  {tableSearch && (
                    <button
                      type="button"
                      onClick={() => setTableSearch('')}
                      className="petty-cash-tracker-s127"
                    >
                      ✕
                    </button>
                  )}
                </div>

                <div className="petty-cash-tracker-s7">
                  <button
                    type="button"
                    onClick={handleExportPDF}
                    className="petty-cash-tracker-s128"
                    title={`Print or Save PDF Statement for ${activeMonthSummary.label}`}
                  >
                    <span>🖨️</span> Export {activeMonthSummary.label} PDF
                  </button>
                  <button
                    type="button"
                    onClick={handlePrintAnnualPDF}
                    className="petty-cash-tracker-s129"
                    title="Print or Save Complete FY 2026-27 Master Statement as PDF"
                  >
                    <span>📑</span> Annual FY PDF
                  </button>
                  <button
                    type="button"
                    onClick={handleExport}
                    className="petty-cash-tracker-s130"
                    title="Export to Excel"
                  >
                    <span>⬇</span> Excel
                  </button>
                </div>
              </div>

              {isAdmin && (
                <div
                  className="petty-cash-tracker-s131"
                >
                  <h4 className="petty-cash-tracker-s132">
                    Add Entry to {activeMonthSummary.label}
                  </h4>
                  <form onSubmit={handleAddEntry} className="petty-cash-tracker-s133">
                    <div className="petty-cash-tracker-s134">
                      <input
                        style={fieldStyle}
                        type="date"
                        value={formData.date}
                        onChange={(event) => handleFieldChange('date', event.target.value)}
                      />
                      <select
                        style={fieldStyle}
                        value={formData.vendor}
                        onChange={(event) => {
                          const val = event.target.value;
                          setFormData((prev) => ({
                            ...prev,
                            vendor: val,
                            receipt: val === 'Expenses' || val === 'Common Settlement' ? '' : prev.receipt,
                            payment: val === 'Petty cash' || val === 'Event' ? '' : prev.payment
                          }));
                        }}
                      >
                        <option value="" disabled>Select Category</option>
                        <option value="Petty cash">Petty cash</option>
                        <option value="Event">Event</option>
                        <option value="Expenses">Expenses</option>
                        <option value="Common Settlement">Common Settlement</option>
                      </select>
                      <input
                        style={fieldStyle}
                        placeholder="Description / Vendor"
                        value={formData.purpose}
                        onChange={(event) => handleFieldChange('purpose', event.target.value)}
                      />
                    </div>
                    <div className="petty-cash-tracker-s135">
                      {(formData.vendor === 'Petty cash' || formData.vendor === 'Event') && (
                        <input
                          style={fieldStyle}
                          type="number"
                          placeholder="Receipt Amount"
                          value={formData.receipt}
                          onChange={(event) => handleFieldChange('receipt', event.target.value)}
                        />
                      )}
                      {(formData.vendor === 'Expenses' || formData.vendor === 'Common Settlement') && (
                        <input
                          style={fieldStyle}
                          type="number"
                          placeholder="Payment Amount"
                          value={formData.payment}
                          onChange={(event) => handleFieldChange('payment', event.target.value)}
                        />
                      )}
                      {!formData.vendor && (
                        <div className="petty-cash-tracker-s136" style={{ ...fieldStyle }}>
                          Select category
                        </div>
                      )}
                      <input
                        style={fieldStyle}
                        placeholder="Remarks"
                        value={formData.remarks}
                        onChange={(event) => handleFieldChange('remarks', event.target.value)}
                      />
                      <button
                        type="submit"
                        className="petty-cash-tracker-s137"
                      >
                        Add
                      </button>
                    </div>
                  </form>
                </div>
              )}

              <div className="petty-cash-tracker-s138">
                <table className="petty-cash-tracker-s139">
                  <thead>
                    <tr>
                      <th className="petty-cash-tracker-s140" style={{ ...headerCellStyle }}>Date</th>
                      <th className="petty-cash-tracker-s141" style={{ ...headerCellStyle }}>Particulars</th>
                      <th className="petty-cash-tracker-s36" style={{ ...headerCellStyle }}>Description</th>
                      <th className="petty-cash-tracker-s142" style={{ ...headerCellStyle }}>Receipt (₹)</th>
                      <th className="petty-cash-tracker-s142" style={{ ...headerCellStyle }}>Payment (₹)</th>
                      <th className="petty-cash-tracker-s143" style={{ ...headerCellStyle }}>Balance (₹)</th>
                      <th className="petty-cash-tracker-s144" style={{ ...headerCellStyle }}>Remarks</th>
                      <th className="petty-cash-tracker-s145" style={{ ...headerCellStyle }}>Voucher / Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {isLoading ? (
                      <tr>
                        <td colSpan={8} style={emptyCellStyle}>
                          Loading petty cash data...
                        </td>
                      </tr>
                    ) : activeMonthSummary.entries.length === 0 ? (
                      <tr>
                        <td colSpan={8} style={emptyCellStyle}>
                          No entries in {activeMonthSummary.label}. July 2026 is ready to start for A Building.
                        </td>
                      </tr>
                    ) : (
                      activeMonthSummary.entries
                        .filter((entry) => {
                          if (!tableSearch.trim()) return true;
                          const q = tableSearch.toLowerCase().trim();
                          return (
                            (entry.vendor || '').toLowerCase().includes(q) ||
                            (entry.purpose || '').toLowerCase().includes(q) ||
                            (entry.remarks || '').toLowerCase().includes(q) ||
                            (entry.payment || '').toString().includes(q) ||
                            (entry.receipt || '').toString().includes(q)
                          );
                        })
                        .map((entry, index) => (
                        <tr
                          key={entry.id || `${activeMonthSummary.id}-${index}`}
                          className={`petty-cash-tracker-s146 ${(index % 2 === 1 ? 'petty-cash-tracker-cond-25-true' : 'petty-cash-tracker-cond-26-false')}`}
                        >
                          <td className="petty-cash-tracker-s39" style={{ ...bodyCellStyle }}>
                            {isAdmin && editingEntryId === entry.id ? (
                              <input
                                type="date"
                                value={entry.date}
                                onChange={(event) => updateEntry(entry.id, 'date', event.target.value)}
                                style={inlineInputStyle}
                              />
                            ) : (
                              formatShortDate(entry.date)
                            )}
                          </td>
                          <td className="petty-cash-tracker-s59" style={{ ...bodyCellStyle }}>
                            {isAdmin && editingEntryId === entry.id ? (
                              <input
                                value={entry.vendor}
                                onChange={(event) => updateEntry(entry.id, 'vendor', event.target.value)}
                                style={inlineInputStyle}
                              />
                            ) : (
                              entry.vendor
                            )}
                          </td>
                          <td className="petty-cash-tracker-s41" style={{ ...bodyCellStyle }}>
                            {isAdmin && editingEntryId === entry.id ? (
                              <input
                                value={entry.purpose}
                                onChange={(event) => updateEntry(entry.id, 'purpose', event.target.value)}
                                style={inlineInputStyle}
                              />
                            ) : (
                              entry.purpose
                            )}
                          </td>
                          <td className="petty-cash-tracker-s147" style={{ ...bodyCellStyle }}>
                            {isAdmin && editingEntryId === entry.id ? (
                              <input
                                type="number"
                                value={entry.receipt || ''}
                                onChange={(event) => updateEntry(entry.id, 'receipt', event.target.value)}
                                className="petty-cash-tracker-s148" style={{ ...inlineInputStyle }}
                              />
                            ) : toNumber(entry.receipt) > 0 ? (
                              formatCurrency(toNumber(entry.receipt))
                            ) : (
                              <span className="petty-cash-tracker-s149">—</span>
                            )}
                          </td>
                          <td className="petty-cash-tracker-s150" style={{ ...bodyCellStyle }}>
                            {isAdmin && editingEntryId === entry.id ? (
                              <input
                                type="number"
                                value={entry.payment || ''}
                                onChange={(event) => updateEntry(entry.id, 'payment', event.target.value)}
                                className="petty-cash-tracker-s148" style={{ ...inlineInputStyle }}
                              />
                            ) : toNumber(entry.payment) > 0 ? (
                              formatCurrency(toNumber(entry.payment))
                            ) : (
                              <span className="petty-cash-tracker-s149">—</span>
                            )}
                          </td>
                          <td className={`petty-cash-tracker-s151 ${(entry.balance >= 0 ? 'petty-cash-tracker-cond-27-true' : 'petty-cash-tracker-cond-28-false')}`} style={{ ...bodyCellStyle }}>
                            {formatCurrency(entry.balance)}
                          </td>
                          <td className="petty-cash-tracker-s44" style={{ ...bodyCellStyle }}>
                            {isAdmin && editingEntryId === entry.id ? (
                              <input
                                value={entry.remarks || ''}
                                onChange={(event) => updateEntry(entry.id, 'remarks', event.target.value)}
                                style={inlineInputStyle}
                              />
                            ) : (
                              entry.remarks || <span className="petty-cash-tracker-s45">—</span>
                            )}
                          </td>
                          <td className="petty-cash-tracker-s63" style={{ ...bodyCellStyle }}>
                            <div className="petty-cash-tracker-s152">
                              <button
                                type="button"
                                onClick={() => handlePrintVoucher(entry)}
                                className="petty-cash-tracker-s153"
                                title="Print Cash Voucher (PDF)"
                              >
                                📄 Voucher
                              </button>
                              {isAdmin && (
                                <>
                                  {editingEntryId === entry.id ? (
                                    <button
                                      type="button"
                                      onClick={() => setEditingEntryId(null)}
                                      className="petty-cash-tracker-s154"
                                      title="Done Editing"
                                    >
                                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                                    </button>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => setEditingEntryId(entry.id)}
                                      className="petty-cash-tracker-s155"
                                      title="Edit Entry"
                                    >
                                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => removeEntry(entry.id)}
                                    className="petty-cash-tracker-s156"
                                    title="Delete Entry"
                                  >
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  <tfoot>
                    <tr className="petty-cash-tracker-s46">
                      <td colSpan={3} className="petty-cash-tracker-s47" style={{ ...bodyCellStyle }}>
                        {activeMonthSummary.label} Total:
                      </td>
                      <td className="petty-cash-tracker-s157" style={{ ...bodyCellStyle }}>
                        {formatCurrency(activeMonthSummary.receipts)}
                      </td>
                      <td className="petty-cash-tracker-s43" style={{ ...bodyCellStyle }}>
                        {formatCurrency(activeMonthSummary.payments)}
                      </td>
                      <td className={`petty-cash-tracker-s151 ${(activeMonthSummary.closingBalance >= 0 ? 'petty-cash-tracker-cond-29-true' : 'petty-cash-tracker-cond-30-false')}`} style={{ ...bodyCellStyle }}>
                        {formatCurrency(activeMonthSummary.closingBalance)}
                      </td>
                      <td style={bodyCellStyle} />
                      <td style={bodyCellStyle} />
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const fieldStyle = {
  width: '100%',
  padding: '10px 12px',
  borderRadius: '12px',
  border: '1px solid rgba(61, 63, 52, 0.14)',
  fontSize: '0.92rem',
  outline: 'none',
  boxSizing: 'border-box',
  background: '#fff'
};

const headerCellStyle = {
  padding: '14px 16px',
  textAlign: 'left',
  fontSize: '0.8rem',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  color: '#475467',
  background: '#F8FAFC',
  borderBottom: '1px solid rgba(61, 63, 52, 0.1)',
  fontWeight: 700
};

const bodyCellStyle = {
  padding: '14px 16px',
  borderBottom: '1px solid rgba(61, 63, 52, 0.06)',
  verticalAlign: 'middle',
  fontSize: '0.92rem'
};

const emptyCellStyle = {
  padding: '36px 16px',
  textAlign: 'center',
  color: '#667085',
  fontSize: '0.95rem'
};

const inlineInputStyle = {
  border: 'none',
  background: 'transparent',
  width: '100%',
  fontSize: 'inherit',
  fontFamily: 'inherit',
  outline: 'none',
  color: 'inherit',
  padding: 0
};

const sideStatStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  gap: '16px',
  color: '#475467'
};

const noteCardStyle = {
  display: 'grid',
  gap: '6px',
  padding: '14px 16px',
  borderRadius: '16px',
  background: '#F8FAFC'
};
