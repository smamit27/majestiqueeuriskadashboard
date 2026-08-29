import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import * as XLSX from 'xlsx';
import { db, ensureFirebaseSession, isFirebaseConfigured } from '../../firebase.js';

const PETTY_CASH_DOC_IDS = {
  buildingA: 'buildingA',
  common: 'common'
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
    payment: '2246',
    remarks: '12184 / 13162'
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

function SummaryCard({ label, value, accent, caption }) {
  return (
    <div
      className="accounting-summary-card"
      style={{
        padding: '22px',
        borderRadius: '20px',
        background: '#fff',
        border: '1px solid rgba(61, 63, 52, 0.08)'
      }}
    >
      <div
        style={{
          width: '48px',
          height: '48px',
          borderRadius: '14px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: accent.soft,
          color: accent.solid,
          fontWeight: 800,
          fontSize: '0.88rem',
          marginBottom: '14px'
        }}
      >
        {label.slice(0, 2).toUpperCase()}
      </div>
      <p className="eyebrow" style={{ margin: '0 0 6px 0' }}>
        {label}
      </p>
      <p style={{ margin: 0, fontSize: '1.8rem', fontWeight: 800, color: '#101828' }}>{value}</p>
      <p style={{ margin: '10px 0 0 0', fontSize: '0.9rem', color: '#667085' }}>{caption}</p>
    </div>
  );
}

export default function PettyCashTracker({ isAdmin = false }) {
  const [subTab, setSubTab] = useState('buildingA');
  const [entriesByTab, setEntriesByTab] = useState({
    buildingA: DEFAULT_BUILDING_A_ENTRIES,
    common: DEFAULT_COMMON_ENTRIES
  });
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
    setFormData(createEmptyForm(activeMonthByTab[subTab]));
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
        const [buildingASnapshot, commonSnapshot] = await Promise.all([
          getDoc(doc(db, 'pettyCash', PETTY_CASH_DOC_IDS.buildingA)),
          getDoc(doc(db, 'pettyCash', PETTY_CASH_DOC_IDS.common))
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

  const activeMonthId = activeMonthByTab[subTab];
  const activeMonthSummary =
    monthSummariesByTab[subTab].find((month) => month.id === activeMonthId) || monthSummariesByTab[subTab][0];
  const fiscalTotals = useMemo(() => {
    const entries = entriesByTab[subTab];
    const monthSummaries = monthSummariesByTab[subTab];
    const totalReceipts = entries.reduce((sum, entry) => sum + toNumber(entry.receipt), 0);
    const totalPayments = entries.reduce((sum, entry) => sum + toNumber(entry.payment), 0);

    return {
      totalReceipts,
      totalPayments,
      closingBalance: monthSummaries[monthSummaries.length - 1]?.closingBalance || 0,
      totalTransactions: entries.length
    };
  }, [entriesByTab, monthSummariesByTab, subTab]);

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
    const workbook = XLSX.utils.book_new();
    const monthRows = monthSummariesByTab[subTab].map((month) => ({
      Month: month.label,
      'Opening Balance': month.openingBalance,
      'Receipts': month.receipts,
      'Payments': month.payments,
      'Closing Balance': month.closingBalance
    }));
    const entryRows = withRunningBalance(entriesByTab[subTab]).map((entry) => ({
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
    XLSX.writeFile(workbook, `Petty_Cash_${subTab}_FY2026_27.xlsx`);
  };

  const handleExportPDF = () => {
    const generatedDate = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    const listToPrint = activeMonthSummary.entries;
    const tabName = subTab === 'common' ? 'Common Expenses Ledger' : 'A Building Operating Ledger';

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
            <h1 class="title">🏢 Majestique Euriska Co-Op Housing Society</h1>
            <div class="subtitle">${tabName} • FY 2026–27 (${activeMonthSummary.label})</div>
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
        className="dashboard-hero-card"
        style={{
          alignItems: 'flex-start',
          background: 'linear-gradient(135deg, rgb(11, 43, 38) 0%, rgb(25, 108, 108) 100%)'
        }}
      >
        <div style={{ flex: '1 1 480px' }}>
          <p className="eyebrow" style={{ color: 'rgba(255,255,255,0.76)', marginBottom: '8px' }}>
            Petty Cash Workspace
          </p>
          <h2 style={{ margin: 0, color: '#fff', fontSize: '1.9rem', lineHeight: 1.1 }}>
            A Building and Common Expense Ledger
          </h2>
          <p style={{ margin: '14px 0 0 0', color: 'rgba(255,255,255,0.82)', maxWidth: '760px', lineHeight: 1.6 }}>
            Fresh month-based petty cash structure for FY 2026-27. Use the A Building Expenses and
            Common Expenses tabs below, then switch across April 2026 through March 2027.
          </p>
        </div>

        <div
          style={{
            display: 'flex',
            gap: '12px',
            alignItems: 'center',
            flexWrap: 'wrap',
            justifyContent: 'flex-end'
          }}
        >
          <div
            style={{
              padding: '10px 14px',
              borderRadius: '999px',
              background: 'rgba(255,255,255,0.14)',
              color: '#fff',
              fontWeight: 700
            }}
          >
            FY 2026-27
          </div>
          <div
            style={{
              padding: '10px 14px',
              borderRadius: '999px',
              background: 'rgba(255,255,255,0.14)',
              color: '#fff',
              fontWeight: 700
            }}
          >
            {activeMonthSummary.label}
          </div>
          <button
            type="button"
            onClick={handleExport}
            style={{
              border: 'none',
              background: '#fff',
              color: '#0B2B26',
              padding: '12px 18px',
              borderRadius: '14px',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            📥 Export Excel
          </button>
          <button
            type="button"
            onClick={handleExportPDF}
            style={{
              border: '1px solid rgba(255,255,255,0.3)',
              background: 'rgba(255,255,255,0.16)',
              color: '#fff',
              padding: '12px 18px',
              borderRadius: '14px',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            📄 Print PDF
          </button>
        </div>
      </div>



      {(() => {
        const {
          pendingCumulativeCommonShare,
          monthlySettled,
          monthlyPending
        } = commonSettlementSummary;

        return (
          <div
            style={{
              marginTop: '18px',
              padding: '20px',
              borderRadius: '20px',
              background: '#FFF4F4',
              border: '1px solid rgba(180, 35, 24, 0.15)'
            }}
          >
            <p className="eyebrow" style={{ margin: 0, color: '#B42318', marginBottom: '12px' }}>Monthly Ledger Breakdown</p>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px' }}>
              
              <div style={{ background: '#fff', padding: '16px', borderRadius: '14px', border: '1px solid rgba(180, 35, 24, 0.2)' }}>
                <div style={{ fontSize: '0.85rem', color: '#B42318', fontWeight: 600, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
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
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                          <span style={{ color: '#667085', fontSize: '0.92rem' }}>Net for {m.label}:</span>
                          <strong style={{ color: '#101828', fontSize: '0.92rem' }}>{formatSignedCurrency(-mShare)}</strong>
                        </div>
                      )}
                      {mSettled > 0 && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                          <span style={{ color: '#667085', fontSize: '0.92rem' }}>Settle for {m.label}:</span>
                          <strong style={{ color: '#0B6E4F', fontSize: '0.92rem' }}>+{formatCurrency(mSettled)}</strong>
                        </div>
                      )}
                    </div>
                  );
                })}
                
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '8px', marginTop: '4px', borderTop: '1px dashed #e4e7ec' }}>
                  <span style={{ color: '#101828', fontSize: '0.95rem', fontWeight: 600 }}>Remaining Pending:</span>
                  <strong style={{ color: '#B42318', fontSize: '0.95rem' }}>{formatSignedCurrency(-pendingCumulativeCommonShare)}</strong>
                </div>
              </div>

              <div style={{ background: '#fff', padding: '16px', borderRadius: '14px', border: '1px solid rgba(180, 35, 24, 0.2)' }}>
                <div style={{ fontSize: '0.85rem', color: '#B42318', fontWeight: 600, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  A Building Balance
                </div>
                
                {monthSummariesByTab.buildingA
                  .filter(m => m.id <= activeMonthId)
                  .map((m, idx) => {
                    const net = m.receipts - m.payments;
                    return (
                      <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span style={{ color: '#667085', fontSize: '0.92rem' }}>Net for {m.label}:</span>
                        <strong style={{ color: net > 0 ? '#0B6E4F' : (net < 0 ? '#B42318' : '#101828'), fontSize: '0.92rem' }}>
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
          style={{
            marginTop: '18px',
            padding: '20px',
            borderRadius: '20px',
            background: '#F8FAFC',
            border: '1px solid rgba(61, 63, 52, 0.08)'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <p className="eyebrow" style={{ margin: 0, color: '#475467' }}>Building Split (Total Flats: 231)</p>
              <h3 style={{ margin: '6px 0 0 0', fontSize: '1.2rem', color: '#101828' }}>Shareable Common Expense Balance</h3>
              <p style={{ margin: '4px 0 0 0', color: '#667085', fontSize: '0.95rem' }}>
                Net Balance (Payments - Receipts): <strong>{formatCurrency(activeMonthSummary.payments - activeMonthSummary.receipts)}</strong>
              </p>
            </div>
            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
              <div style={{ background: '#fff', padding: '12px 18px', borderRadius: '14px', border: '1px solid rgba(61, 63, 52, 0.06)' }}>
                <div style={{ fontSize: '0.85rem', color: '#667085', fontWeight: 600, marginBottom: '4px' }}>A Building (87)</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#101828' }}>
                  {formatCurrency(commonSettlementSummary.pendingCumulativeCommonShare)}
                </div>
              </div>
              <div style={{ background: '#fff', padding: '12px 18px', borderRadius: '14px', border: '1px solid rgba(61, 63, 52, 0.06)' }}>
                <div style={{ fontSize: '0.85rem', color: '#667085', fontWeight: 600, marginBottom: '4px' }}>B Building (96)</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#101828' }}>
                  {formatCurrency((activeMonthSummary.payments - activeMonthSummary.receipts) * (96 / 231))}
                </div>
              </div>
              <div style={{ background: '#fff', padding: '12px 18px', borderRadius: '14px', border: '1px solid rgba(61, 63, 52, 0.06)' }}>
                <div style={{ fontSize: '0.85rem', color: '#667085', fontWeight: 600, marginBottom: '4px' }}>C Building (48)</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#101828' }}>
                  {formatCurrency((activeMonthSummary.payments - activeMonthSummary.receipts) * (48 / 231))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div
        className="table-card"
        style={{
          background: '#fff',
          borderRadius: '22px',
          border: '1px solid rgba(61, 63, 52, 0.08)',
          boxShadow: '0 12px 28px rgba(16, 24, 40, 0.06)',
          overflow: 'hidden'
        }}
      >
        <div style={{ padding: '24px 24px 18px', borderBottom: '1px solid rgba(61, 63, 52, 0.08)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
            <div>
              <p className="eyebrow" style={{ margin: 0 }}>
                {activeSubTabMeta.eyebrow}
              </p>
              <h3 style={{ margin: '6px 0 0 0', fontSize: '1.35rem', color: '#101828' }}>
                {activeSubTabMeta.label}
              </h3>
              <p style={{ margin: '10px 0 0 0', color: '#667085', maxWidth: '680px' }}>
                {activeSubTabMeta.description}
              </p>
            </div>
            <div style={{ textAlign: 'right', minWidth: '220px' }}>
              <p className="eyebrow" style={{ margin: 0 }}>
                Save Status
              </p>
              <p style={{ margin: '6px 0 0 0', fontWeight: 800, color: activeSaveTone }}>
                {saveStatus === 'idle' ? 'Ready' : saveMessage}
              </p>
              <p style={{ margin: '10px 0 0 0', color: '#667085', fontSize: '0.9rem' }}>
                {isAdmin ? 'Admin editing enabled' : 'Read only mode'}
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px', marginTop: '20px', flexWrap: 'wrap' }}>
            {SUB_TABS.map((tab) => {
              const isActive = tab.id === subTab;

              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => handleSelectSubTab(tab.id)}
                  style={{
                    border: 'none',
                    borderRadius: '999px',
                    padding: '12px 18px',
                    background: isActive ? '#0B2B26' : '#F3F4F6',
                    color: isActive ? '#fff' : '#344054',
                    fontWeight: 800,
                    cursor: 'pointer'
                  }}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          <div
            style={{
              display: 'flex',
              gap: '10px',
              overflowX: 'auto',
              paddingTop: '18px',
              marginTop: '18px',
              borderTop: '1px solid rgba(61, 63, 52, 0.08)'
            }}
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
                  style={{
                    flex: '0 0 auto',
                    border: 'none',
                    borderRadius: '999px',
                    padding: '10px 16px',
                    background: isActive ? '#C49B4F' : '#F8FAFC',
                    color: isActive ? '#0B2B26' : '#475467',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  {month.label}
                </button>
              );
            })}
          </div>
        </div>

        <div
          style={{
            padding: '24px'
          }}
        >
          <div style={{ minWidth: 0 }}>
            {/* Month Balance KPI Summary Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', marginBottom: '22px' }}>
              <div style={{ background: '#F8FAFC', padding: '16px 20px', borderRadius: '16px', border: '1px solid rgba(61, 63, 52, 0.08)' }}>
                <div style={{ fontSize: '0.78rem', color: '#667085', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Opening Balance</div>
                <div style={{ fontSize: '1.35rem', fontWeight: 800, color: activeMonthSummary.openingBalance >= 0 ? '#101828' : '#B42318', marginTop: '6px' }}>
                  {formatCurrency(activeMonthSummary.openingBalance)}
                </div>
              </div>
              <div style={{ background: '#F0FDF4', padding: '16px 20px', borderRadius: '16px', border: '1px solid rgba(11, 110, 79, 0.18)' }}>
                <div style={{ fontSize: '0.78rem', color: '#0B6E4F', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Month Receipts (Inflow)</div>
                <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0B6E4F', marginTop: '6px' }}>
                  +{formatCurrency(activeMonthSummary.receipts)}
                </div>
              </div>
              <div style={{ background: '#FEF3F2', padding: '16px 20px', borderRadius: '16px', border: '1px solid rgba(180, 35, 24, 0.18)' }}>
                <div style={{ fontSize: '0.78rem', color: '#B42318', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Month Payments (Expenses)</div>
                <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#B42318', marginTop: '6px' }}>
                  -{formatCurrency(activeMonthSummary.payments)}
                </div>
              </div>
              <div style={{ background: activeMonthSummary.closingBalance >= 0 ? '#F0FDF4' : '#FFF4F4', padding: '16px 20px', borderRadius: '16px', border: `1px solid ${activeMonthSummary.closingBalance >= 0 ? 'rgba(11, 110, 79, 0.25)' : 'rgba(180, 35, 24, 0.25)'}` }}>
                <div style={{ fontSize: '0.78rem', color: activeMonthSummary.closingBalance >= 0 ? '#0B6E4F' : '#B42318', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Closing Balance ({activeMonthSummary.label})</div>
                <div style={{ fontSize: '1.35rem', fontWeight: 800, color: activeMonthSummary.closingBalance >= 0 ? '#0B6E4F' : '#B42318', marginTop: '6px' }}>
                  {formatCurrency(activeMonthSummary.closingBalance)}
                </div>
              </div>
            </div>

            {isAdmin && (
              <div
                style={{
                  background: '#F8FAFC',
                  border: '1px solid rgba(61, 63, 52, 0.08)',
                  borderRadius: '18px',
                  padding: '18px',
                  marginBottom: '18px'
                }}
              >
                <h4 style={{ margin: 0, color: '#101828', fontSize: '1rem', marginBottom: '14px' }}>
                  Add Entry to {activeMonthSummary.label}
                </h4>
                <form onSubmit={handleAddEntry} style={{ marginTop: '14px', display: 'grid', gap: '12px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1.4fr 1.8fr', gap: '12px' }}>
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
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr auto', gap: '12px' }}>
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
                      <div style={{ ...fieldStyle, background: '#f8fafc', color: '#94a3b8', display: 'flex', alignItems: 'center' }}>
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
                      style={{
                        border: 'none',
                        borderRadius: '12px',
                        padding: '0 18px',
                        background: '#0B6E4F',
                        color: '#fff',
                        fontWeight: 800,
                        cursor: 'pointer'
                      }}
                    >
                      Add
                    </button>
                  </div>
                </form>
              </div>
            )}

            <div style={{ overflowX: 'auto', border: '1px solid rgba(61, 63, 52, 0.08)', borderRadius: '18px', background: '#fff', boxShadow: '0 4px 16px rgba(16, 24, 40, 0.03)' }}>
              <table style={{ width: '100%', minWidth: '1020px', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr>
                    <th style={{ ...headerCellStyle, width: '125px', whiteSpace: 'nowrap' }}>Date</th>
                    <th style={{ ...headerCellStyle, width: '200px' }}>Particulars</th>
                    <th style={{ ...headerCellStyle, minWidth: '220px' }}>Description</th>
                    <th style={{ ...headerCellStyle, width: '135px', textAlign: 'right', whiteSpace: 'nowrap' }}>Receipt (₹)</th>
                    <th style={{ ...headerCellStyle, width: '135px', textAlign: 'right', whiteSpace: 'nowrap' }}>Payment (₹)</th>
                    <th style={{ ...headerCellStyle, width: '145px', textAlign: 'right', whiteSpace: 'nowrap' }}>Balance (₹)</th>
                    <th style={{ ...headerCellStyle, width: '190px' }}>Remarks</th>
                    {isAdmin && <th style={{ ...headerCellStyle, width: '90px', textAlign: 'center', whiteSpace: 'nowrap' }}>Action</th>}
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr>
                      <td colSpan={isAdmin ? 8 : 7} style={emptyCellStyle}>
                        Loading petty cash data...
                      </td>
                    </tr>
                  ) : activeMonthSummary.entries.length === 0 ? (
                    <tr>
                      <td colSpan={isAdmin ? 8 : 7} style={emptyCellStyle}>
                        No entries in {activeMonthSummary.label}. July 2026 is ready to start for A Building.
                      </td>
                    </tr>
                  ) : (
                    activeMonthSummary.entries.map((entry, idx) => (
                      <tr
                        key={entry.id}
                        style={{
                          background: idx % 2 === 0 ? '#ffffff' : '#fcfdfd',
                          transition: 'background 0.15s ease'
                        }}
                      >
                        <td style={{ ...bodyCellStyle, whiteSpace: 'nowrap', fontWeight: 600, color: '#475467' }}>
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
                        <td style={{ ...bodyCellStyle, fontWeight: 700, color: '#101828' }}>
                          {isAdmin && editingEntryId === entry.id ? (
                            <select
                              style={inlineInputStyle}
                              value={entry.vendor || ''}
                              onChange={(event) => {
                                const val = event.target.value;
                                updateEntry(entry.id, 'vendor', val);
                                if (val === 'Expenses' || val === 'Common Settlement') updateEntry(entry.id, 'receipt', '');
                                if (val === 'Petty cash' || val === 'Event') updateEntry(entry.id, 'payment', '');
                              }}
                            >
                              <option value="" disabled>Select Category</option>
                              <option value="Petty cash">Petty cash</option>
                              <option value="Event">Event</option>
                              <option value="Expenses">Expenses</option>
                              <option value="Common Settlement">Common Settlement</option>
                            </select>
                          ) : (
                            entry.vendor || '--'
                          )}
                        </td>
                        <td style={{ ...bodyCellStyle, color: '#344054' }}>
                          {isAdmin && editingEntryId === entry.id ? (
                            <input
                              value={entry.purpose || ''}
                              onChange={(event) => updateEntry(entry.id, 'purpose', event.target.value)}
                              style={inlineInputStyle}
                            />
                          ) : (
                            entry.purpose || '--'
                          )}
                        </td>
                        <td style={{ ...bodyCellStyle, textAlign: 'right', color: '#0B6E4F', fontWeight: 700, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
                          {isAdmin && editingEntryId === entry.id && (entry.vendor === 'Petty cash' || entry.vendor === 'Event') ? (
                            <input
                              type="number"
                              value={entry.receipt || ''}
                              onChange={(event) => updateEntry(entry.id, 'receipt', event.target.value)}
                              style={{ ...inlineInputStyle, textAlign: 'right', color: '#0B6E4F', fontWeight: 700 }}
                            />
                          ) : toNumber(entry.receipt) > 0 ? (
                            formatCurrency(toNumber(entry.receipt))
                          ) : (
                            <span style={{ color: '#98a2b3' }}>—</span>
                          )}
                        </td>
                        <td style={{ ...bodyCellStyle, textAlign: 'right', color: '#B42318', fontWeight: 700, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
                          {isAdmin && editingEntryId === entry.id && (entry.vendor === 'Expenses' || entry.vendor === 'Common Settlement') ? (
                            <input
                              type="number"
                              value={entry.payment || ''}
                              onChange={(event) => updateEntry(entry.id, 'payment', event.target.value)}
                              style={{ ...inlineInputStyle, textAlign: 'right', color: '#B42318', fontWeight: 700 }}
                            />
                          ) : toNumber(entry.payment) > 0 ? (
                            formatCurrency(toNumber(entry.payment))
                          ) : (
                            <span style={{ color: '#98a2b3' }}>—</span>
                          )}
                        </td>
                        <td style={{ ...bodyCellStyle, textAlign: 'right', fontWeight: 800, color: entry.balance >= 0 ? '#0B6E4F' : '#B42318', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
                          {formatCurrency(entry.balance)}
                        </td>
                        <td style={{ ...bodyCellStyle, color: '#667085', fontSize: '0.88rem' }}>
                          {isAdmin && editingEntryId === entry.id ? (
                            <input
                              value={entry.remarks || ''}
                              onChange={(event) => updateEntry(entry.id, 'remarks', event.target.value)}
                              style={inlineInputStyle}
                            />
                          ) : (
                            entry.remarks || <span style={{ color: '#cbd5e1' }}>—</span>
                          )}
                        </td>
                        {isAdmin && (
                          <td style={{ ...bodyCellStyle, textAlign: 'center' }}>
                            <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                              {editingEntryId === entry.id ? (
                                <button
                                  type="button"
                                  onClick={() => setEditingEntryId(null)}
                                  style={{ border: 'none', background: 'transparent', color: '#0B6E4F', cursor: 'pointer', padding: '4px' }}
                                  title="Done Editing"
                                >
                                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => setEditingEntryId(entry.id)}
                                  style={{ border: 'none', background: 'transparent', color: '#667085', cursor: 'pointer', padding: '4px' }}
                                  title="Edit Entry"
                                >
                                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => removeEntry(entry.id)}
                                style={{ border: 'none', background: 'transparent', color: '#B42318', cursor: 'pointer', padding: '4px' }}
                                title="Delete Entry"
                              >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
                <tfoot>
                  <tr style={{ background: '#F8FAFC', borderTop: '2px solid rgba(61, 63, 52, 0.12)' }}>
                    <td colSpan={3} style={{ ...bodyCellStyle, fontWeight: 800, color: '#101828', textAlign: 'right', fontSize: '0.92rem' }}>
                      {activeMonthSummary.label} Total:
                    </td>
                    <td style={{ ...bodyCellStyle, textAlign: 'right', fontWeight: 800, color: '#0B6E4F', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
                      {formatCurrency(activeMonthSummary.receipts)}
                    </td>
                    <td style={{ ...bodyCellStyle, textAlign: 'right', fontWeight: 800, color: '#B42318', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
                      {formatCurrency(activeMonthSummary.payments)}
                    </td>
                    <td style={{ ...bodyCellStyle, textAlign: 'right', fontWeight: 800, color: activeMonthSummary.closingBalance >= 0 ? '#0B6E4F' : '#B42318', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
                      {formatCurrency(activeMonthSummary.closingBalance)}
                    </td>
                    <td colSpan={isAdmin ? 2 : 1} style={bodyCellStyle} />
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
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
