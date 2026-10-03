import { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import * as XLSX from 'xlsx';
import { db, ensureFirebaseSession, isFirebaseConfigured } from '../../firebase.js';
import { financeSeedData } from '../../data/financeSeedData.js';

const getMonthsForYear = (startYear) => {
  return Array.from({ length: 12 }, (_, i) => {
    const d = new Date(startYear, 3 + i, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
};

const LOCKED_MONTHS = ['2026-04', '2026-05'];

function getInitialYear() {
  const d = new Date();
  const year = d.getFullYear();
  const month = d.getMonth();
  if (year < 2026 || (year === 2026 && month < 3)) {
    return 2025;
  }
  return 2026;
}

function getCurrentMonth(year) {
  const d = new Date();
  const v = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  const months = getMonthsForYear(year);
  return months.includes(v) ? v : months[0];
}

function formatMonthLabel(mv) {
  const [y, m] = mv.split('-').map(Number);
  return new Intl.DateTimeFormat('en-IN', { month: 'short', year: '2-digit' }).format(new Date(y, m - 1, 1));
}

function formatLongMonth(mv) {
  const [y, m] = mv.split('-').map(Number);
  return new Intl.DateTimeFormat('en-IN', { month: 'long', year: 'numeric' }).format(new Date(y, m - 1, 1));
}

const n = (v) => parseFloat(v) || 0;
const fmt = (v) => Number(v).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const FLATS = {
  A: 87,
  B: 96,
  C: 48,
  Total: 231
};

export default function FinanceTracker({ isAdmin = false }) {
  const [selectedYear, setSelectedYear] = useState(getInitialYear);
  const months = useMemo(() => getMonthsForYear(selectedYear), [selectedYear]);
  const [selectedMonth, setSelectedMonth] = useState(() => getCurrentMonth(getInitialYear()));
  const isLocked = LOCKED_MONTHS.includes(selectedMonth);
  const [income, setIncome] = useState([{ source: '', amount: '', remark: '' }]);
  const [expenses, setExpenses] = useState([{ chequeNo: '', vendor: '', amount: '', purpose: '' }]);
  const [chequeExpenses, setChequeExpenses] = useState([]);
  const [commonCheques, setCommonCheques] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState('idle');
  const [saveMsg, setSaveMsg] = useState('');
  const isLoadedRef = useRef(false);
  const autoSaveTimer = useRef(null);
  const recordId = `finance_${selectedMonth}`;
  const [yearlyIncome, setYearlyIncome] = useState(0);
  const [yearlyExpense, setYearlyExpense] = useState(0);
  const [isYearlyLoading, setIsYearlyLoading] = useState(false);
  const [yearlyData, setYearlyData] = useState([]);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Load from Firebase
  useEffect(() => {
    let cancelled = false;
    isLoadedRef.current = false;
    setSaveStatus('idle');
    setSaveMsg('');

    async function load() {
      setIsLoading(true);
      if (!isFirebaseConfigured || !db) {
        if (selectedMonth === '2026-06') {
          setCommonCheques([
            { chequeNo: '496', date: '2026-06-15', vendor: 'MESDCL', purpose: 'Electricity', amount: '57420', whoPaid: 'A Building', isPaid: false },
            { chequeNo: '499', date: '2026-06-12', vendor: 'Tanaji Hunde', purpose: 'Gazibo - Received from B Building and C as well', amount: '11500', whoPaid: 'A Building', isPaid: false }
          ]);
        } else {
          setCommonCheques([]);
        }
        setIsLoading(false);
        isLoadedRef.current = true;
        return;
      }

      try {
        await ensureFirebaseSession();

        // Fetch main finance doc
        const snap = await getDoc(doc(db, 'financeMonthly', recordId));

        // Fetch cheques if selectedMonth is June 2026 or later
        let chequesList = [];
        let commonList = [];
        if (selectedMonth >= '2026-06') {
          try {
            const [snapA, snapCommon] = await Promise.all([
              getDoc(doc(db, 'chequesMonthly', `cheques_${selectedMonth}`)),
              getDoc(doc(db, 'chequesMonthly', `cheques_common_${selectedMonth}`))
            ]);

            const listA = snapA.exists() ? (snapA.data().cheques || []) : [];

            chequesList = listA
              .filter(c => c.vendor || c.amount || c.chequeNo)
              .map(c => ({
                chequeNo: c.chequeNo || '',
                date: c.date || '',
                deductedDate: c.deductedDate || '',
                vendor: c.vendor || '',
                purpose: c.purpose || '',
                amount: c.amount || '0',
                isLinked: true,
                sourceTab: 'A Building'
              }));

            const listCommon = snapCommon.exists() ? (snapCommon.data().cheques || []) : [];
            commonList = listCommon
              .filter(c => (c.vendor || c.amount || c.chequeNo) && c.chequeNo !== '493');
          } catch (err) {
            console.error('Error loading cheques for finance tracker:', err);
          }
        }

        if (chequesList.length === 0 && selectedMonth === '2026-09') {
          chequesList = [
            { chequeNo: '534', date: '2026-09-04', deductedDate: '2026-09-08', vendor: 'Sidharam Parmeshwar Lende', purpose: 'Housekeeping / Waterman Salary', amount: '12900', isLinked: true, sourceTab: 'A Building' },
            { chequeNo: '535', date: '2026-09-04', deductedDate: '2026-09-10', vendor: 'Shubham Enterprises', purpose: 'Maintenance & Repairs / Operations', amount: '36536', isLinked: true, sourceTab: 'A Building' },
            { chequeNo: '536', date: '2026-09-04', deductedDate: '2026-09-09', vendor: "Majestique Euriska 'B' Building Co-op Hsg Soc Ltd", purpose: 'Inter-Building Common Share Settlement / Transfer', amount: '8662', isLinked: true, sourceTab: 'A Building' },
            { chequeNo: '537', date: '2026-09-04', deductedDate: '2026-09-08', vendor: 'Sai Swimming Pool Maintenance Services', purpose: 'Swimming Pool Monthly AMC / Maintenance', amount: '4519', isLinked: true, sourceTab: 'A Building' },
            { chequeNo: '538', date: '2026-09-04', deductedDate: '2026-09-08', vendor: 'Sandip Raju Wavare', purpose: 'Housekeeping / Staff Deep Cleaning Services', amount: '50103', isLinked: true, sourceTab: 'A Building' },
            { chequeNo: '539', date: '2026-09-04', deductedDate: '2026-09-11', vendor: 'Rajib Madan Patra', purpose: 'Plumbing & Electrical Maintenance Repairs', amount: '2636', isLinked: true, sourceTab: 'A Building' },
            { chequeNo: '540', date: '2026-09-04', deductedDate: '2026-09-18', vendor: 'Shree Swami Samarth water suppliers', purpose: 'Water Tanker Supply Charges', amount: '3955', isLinked: true, sourceTab: 'A Building' },
            { chequeNo: '542', date: '2026-09-17', deductedDate: '2026-09-30', vendor: 'MSEDCL', purpose: 'Common Area Electricity Bill', amount: '44420', isLinked: true, sourceTab: 'A Building' }
          ];
        }

        if (commonList.length === 0 && selectedMonth === '2026-06') {
          commonList = [
            { chequeNo: '496', date: '2026-06-15', vendor: 'MESDCL', purpose: 'Electricity', amount: '57420', whoPaid: 'A Building', isPaid: false },
            { chequeNo: '499', date: '2026-06-12', vendor: 'Tanaji Hunde', purpose: 'Gazibo - Received from B Building and C as well', amount: '11500', whoPaid: 'A Building', isPaid: false }
          ];
        }

        if (selectedMonth === '2026-09') {
          // 537, 540, 542 belong to A Building only; remove from Common Work
          commonList = commonList.filter(c => !['537', '540', '542'].includes(String(c.chequeNo || '').trim()));
        }

        if (!cancelled) {
          setChequeExpenses(chequesList);
          setCommonCheques(commonList);

          if (snap.exists()) {
            const data = snap.data();
            const filteredIncome = (data.income || []).filter(item => !item.source?.toLowerCase().includes('shop'));
            setIncome(filteredIncome.length > 0 ? filteredIncome : [{ source: '', amount: '', remark: '' }]);

            const loadedExpenses = (data.expenses || []).map(e => ({
              chequeNo: e.chequeNo || '',
              vendor: e.vendor || '',
              amount: e.amount || '',
              purpose: e.purpose || ''
            })).filter(e => !e.vendor?.toLowerCase().includes('shop') && !e.purpose?.toLowerCase().includes('shop'));
            setExpenses(loadedExpenses.length > 0 ? loadedExpenses : [{ chequeNo: '', vendor: '', amount: '', purpose: '' }]);
            setSaveMsg(`${formatLongMonth(selectedMonth)}`);
          } else {
            const fallback = financeSeedData[recordId];
            if (fallback) {
              setIncome(fallback.income?.length > 0 ? fallback.income : [{ source: '', amount: '', remark: '' }]);
              setExpenses(fallback.expenses?.length > 0 ? fallback.expenses : [{ chequeNo: '', vendor: '', amount: '', purpose: '' }]);
            } else {
              setIncome([{ source: '', amount: '', remark: '' }]);
              setExpenses([{ chequeNo: '', vendor: '', amount: '', purpose: '' }]);
            }
            setSaveMsg(`${formatLongMonth(selectedMonth)}`);
          }
        }
      } catch (err) {
        console.error('Finance load error:', err);
      } finally {
        if (!cancelled) {
          setIsLoading(false);
          isLoadedRef.current = true;
        }
      }
    }
    load();
    return () => { cancelled = true; };
  }, [recordId, selectedMonth]);

  // Load Yearly Totals
  useEffect(() => {
    let cancelled = false;
    async function loadYearly() {
      setIsYearlyLoading(true);
      if (!isFirebaseConfigured || !db) {
        setIsYearlyLoading(false);
        return;
      }
      try {
        await ensureFirebaseSession();
        let totalInc = 0;
        let totalExp = 0;
        const allData = [];
        for (const m of months) {
          const [snap, chequeSnap] = await Promise.all([
             getDoc(doc(db, 'financeMonthly', `finance_${m}`)),
             getDoc(doc(db, 'chequesMonthly', `cheques_${m}`))
          ]);
          
          let data = { income: [], expenses: [] };
          let chequeData = { cheques: [] };
          
          if (snap.exists()) {
            data = snap.data();
            if (data.income) {
              data.income = data.income.filter(item => !item.source?.toLowerCase().includes('shop'));
            }
            if (data.expenses) {
              data.expenses = data.expenses.filter(e => !e.vendor?.toLowerCase().includes('shop') && !e.purpose?.toLowerCase().includes('shop'));
            }
          }
          if (chequeSnap.exists()) chequeData = chequeSnap.data();
          
          if (snap.exists() || chequeSnap.exists()) {
             allData.push({ month: m, ...data, chequeExpenses: chequeData.cheques || [] });
          }
          
          (data.income || []).forEach(i => totalInc += parseFloat(i.amount) || 0);
          (data.expenses || []).forEach(e => totalExp += parseFloat(e.amount) || 0);
          (chequeData.cheques || []).forEach(c => totalExp += parseFloat(c.amount) || 0);
        }
        if (!cancelled) {
          setYearlyIncome(totalInc);
          setYearlyExpense(totalExp);
          setYearlyData(allData);
        }
      } catch (err) {
        console.error('Error loading yearly totals:', err);
      } finally {
        if (!cancelled) {
          setIsYearlyLoading(false);
        }
      }
    }
    loadYearly();
    return () => { cancelled = true; };
  }, [months, saveStatus]);

  const saveToFirebase = useCallback(async (currIncome, currExpenses, currRecordId, month) => {
    if (LOCKED_MONTHS.includes(month)) {
      setSaveStatus('error');
      setSaveMsg('This month is locked.');
      return;
    }
    setSaveStatus('saving');
    if (!isFirebaseConfigured || !db) {
      setSaveStatus('saved');
      return;
    }
    try {
      await ensureFirebaseSession();
      await setDoc(doc(db, 'financeMonthly', currRecordId), {
        month,
        income: currIncome,
        expenses: currExpenses,
        updatedAt: serverTimestamp()
      }, { merge: true });
      setSaveStatus('saved');
      setSaveMsg('All changes saved ✓');
    } catch (err) {
      setSaveStatus('error');
      setSaveMsg('Save failed.');
    }
  }, []);

  const triggerAutoSave = (newIncome, newExpenses) => {
    if (!isLoadedRef.current || isLocked) return;
    clearTimeout(autoSaveTimer.current);
    setSaveStatus('pending');
    setSaveMsg('Unsaved changes…');
    autoSaveTimer.current = setTimeout(() => {
      saveToFirebase(newIncome, newExpenses, recordId, selectedMonth);
    }, 1500);
  };

  const addIncomeRow = () => {
    if (isLocked) return;
    const next = [...income, { source: '', amount: '', remark: '' }];
    setIncome(next);
    triggerAutoSave(next, expenses);
  };

  const addExpenseRow = () => {
    if (isLocked) return;
    const next = [...expenses, { chequeNo: '', vendor: '', amount: '', purpose: '' }];
    setExpenses(next);
    triggerAutoSave(income, next);
  };

  const updateIncome = (idx, field, val) => {
    if (isLocked) return;
    const next = [...income];
    next[idx] = { ...next[idx], [field]: val };
    setIncome(next);
    triggerAutoSave(next, expenses);
  };

  const updateExpense = (idx, field, val) => {
    if (isLocked) return;
    const next = [...expenses];
    next[idx] = { ...next[idx], [field]: val };
    setExpenses(next);
    triggerAutoSave(income, next);
  };

  const removeIncome = (idx) => {
    if (isLocked) return;
    const next = income.filter((_, i) => i !== idx);
    if (next.length === 0) next.push({ source: '', amount: '', remark: '' });
    setIncome(next);
    triggerAutoSave(next, expenses);
  };

  const removeExpense = (idx) => {
    if (isLocked) return;
    const next = expenses.filter((_, i) => i !== idx);
    if (next.length === 0) next.push({ chequeNo: '', vendor: '', amount: '', purpose: '' });
    setExpenses(next);
    triggerAutoSave(income, next);
  };

  const combinedExpenses = [
    ...chequeExpenses.map((c, i) => ({ ...c, id: `cheque-${i}`, isLinked: true })),
    ...expenses.map((e, i) => ({ ...e, id: `manual-${i}`, isLinked: false, originalIndex: i }))
  ];

  const totalIncome = income.reduce((s, r) => s + n(r.amount), 0);
  const totalExpense = combinedExpenses.reduce((s, r) => s + n(r.amount), 0);
  const balance = totalIncome - totalExpense;

  const badge = {
    idle: { color: '#6b7280', icon: '●' },
    pending: { color: '#f59e0b', icon: '⏳' },
    saving: { color: '#3b82f6', icon: '↑' },
    saved: { color: '#10b981', icon: '✓' },
    error: { color: '#ef4444', icon: '✗' },
  }[saveStatus];

  const handleDownloadExcel = () => {
    const incomeRows = income.map(r => ({
      Category: 'Income',
      'Cheque No': '',
      Detail: r.source,
      'Amount (₹)': n(r.amount),
      'Remark / Purpose': r.remark
    }));
    const expenseRows = combinedExpenses.map(r => ({
      Category: r.isLinked ? 'Expense (Linked)' : 'Expense (Manual)',
      'Cheque No': r.chequeNo || '',
      Detail: r.vendor,
      'Amount (₹)': n(r.amount),
      'Remark / Purpose': r.purpose
    }));

    const allRows = [
      ...incomeRows,
      { Category: 'TOTAL INCOME', 'Cheque No': '', Detail: '', 'Amount (₹)': totalIncome, 'Remark / Purpose': '' },
      ...expenseRows,
      { Category: 'TOTAL EXPENSES', 'Cheque No': '', Detail: '', 'Amount (₹)': totalExpense, 'Remark / Purpose': '' },
      { Category: 'CLOSING BALANCE', 'Cheque No': '', Detail: '', 'Amount (₹)': balance, 'Remark / Purpose': '' }
    ];

    const ws = XLSX.utils.json_to_sheet(allRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Finance Tracker');
    XLSX.writeFile(wb, `Finance_Tracker_${selectedMonth}.xlsx`);
  };

  const handlePrintPdf = () => {
    const validIncome = income.filter(r => (r.source && r.source.trim()) || n(r.amount) > 0);
    const validExpenses = combinedExpenses.filter(r => (r.vendor && r.vendor.trim()) || n(r.amount) > 0 || r.chequeNo);
    const validCommonCheques = commonCheques
      .filter(r => (r.vendor && r.vendor.trim()) || n(r.amount) > 0 || r.chequeNo)
      .sort((a, b) => {
        const numA = Number(String(a.chequeNo || '').replace(/\D/g, '')) || Infinity;
        const numB = Number(String(b.chequeNo || '').replace(/\D/g, '')) || Infinity;
        return numA - numB;
      });

    const totalCommonExpense = validCommonCheques.reduce((s, r) => s + n(r.amount), 0);
    const commonAShare = (totalCommonExpense * FLATS.A) / FLATS.Total;
    const commonBShare = (totalCommonExpense * FLATS.B) / FLATS.Total;
    const commonCShare = (totalCommonExpense * FLATS.C) / FLATS.Total;

    const isPaybackActive = selectedMonth >= '2026-08';
    let bReceivedAmount = 0;
    let bPendingAmount = 0;
    let cReceivedAmount = 0;
    let cPendingAmount = 0;

    validCommonCheques.forEach(c => {
      const amt = n(c.amount);
      if (amt === 0) return;
      const bShare = (amt * FLATS.B) / FLATS.Total;
      const cShare = (amt * FLATS.C) / FLATS.Total;
      if (c.bPaidDate || c.bReceiveDate) {
        bReceivedAmount += bShare;
      } else {
        bPendingAmount += bShare;
      }
      if (c.cPaidDate || c.cReceiveDate) {
        cReceivedAmount += cShare;
      } else {
        cPendingAmount += cShare;
      }
    });

    const totalRecoveryDue = commonBShare + commonCShare;
    const totalRecovered = bReceivedAmount + cReceivedAmount;
    const totalOutstanding = bPendingAmount + cPendingAmount;
    const showCommonSection = selectedMonth >= '2026-06' || validCommonCheques.length > 0;

    const printedDate = new Intl.DateTimeFormat('en-IN', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date());

    const printDoc = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Income &amp; Expenses — ${formatLongMonth(selectedMonth)}</title>
        <meta charset="utf-8" />
        <style>
          @page {
            size: A4 portrait;
            margin: 12mm 10mm 12mm 10mm;
          }
          * { box-sizing: border-box; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            color: #0f172a;
            margin: 0;
            padding: 12px;
            background: #ffffff;
            font-size: 11px;
            line-height: 1.4;
          }
          .society-header {
            text-align: center;
            border-bottom: 2px solid #1e3a8a;
            padding-bottom: 12px;
            margin-bottom: 14px;
          }
          .society-title {
            font-size: 17px;
            font-weight: 800;
            color: #1e3a8a;
            letter-spacing: 0.5px;
            margin: 0 0 4px 0;
            text-transform: uppercase;
          }
          .society-sub {
            font-size: 10px;
            color: #475569;
            margin: 0 0 3px 0;
          }
          .doc-badge {
            display: inline-block;
            background: #1e3a8a;
            color: #ffffff;
            padding: 4px 14px;
            border-radius: 4px;
            font-size: 11px;
            font-weight: 700;
            letter-spacing: 0.6px;
            margin-top: 6px;
            text-transform: uppercase;
          }
          .kpi-grid {
            display: flex;
            gap: 12px;
            margin-bottom: 14px;
          }
          .kpi-card {
            flex: 1;
            padding: 10px 14px;
            border-radius: 8px;
            border: 1px solid #cbd5e1;
            background: #f8fafc;
          }
          .kpi-card.income {
            border-left: 4px solid #10b981;
            background: #f0fdf4;
          }
          .kpi-card.expense {
            border-left: 4px solid #ef4444;
            background: #fef2f2;
          }
          .kpi-card.balance {
            border-left: 4px solid #2563eb;
            background: #eff6ff;
          }
          .kpi-label {
            font-size: 9px;
            font-weight: 700;
            text-transform: uppercase;
            color: #64748b;
            margin-bottom: 2px;
          }
          .kpi-val {
            font-size: 16px;
            font-weight: 800;
          }
          .section-title {
            font-size: 12px;
            font-weight: 700;
            padding: 6px 10px;
            margin: 12px 0 6px 0;
            border-radius: 4px;
            display: flex;
            justify-content: space-between;
          }
          .section-income {
            background: #ecfdf5;
            color: #065f46;
            border-left: 4px solid #10b981;
          }
          .section-expense {
            background: #fef2f2;
            color: #991b1b;
            border-left: 4px solid #ef4444;
          }
          .section-common {
            background: #eff6ff;
            color: #1e3a8a;
            border-left: 4px solid #3b82f6;
          }
          .cost-sharing-grid {
            display: flex;
            gap: 10px;
            margin-bottom: 10px;
          }
          .cost-card {
            flex: 1;
            padding: 8px 10px;
            border-radius: 6px;
            border: 1px solid #cbd5e1;
            background: #f8fafc;
          }
          .cost-card-title {
            font-size: 8.5px;
            font-weight: 700;
            text-transform: uppercase;
            color: #475569;
            margin-bottom: 2px;
          }
          .cost-card-val {
            font-size: 13px;
            font-weight: 800;
            color: #1e3a8a;
          }
          .cost-card-sub {
            font-size: 8px;
            color: #64748b;
            margin-top: 2px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 10px;
            font-size: 10px;
          }
          th {
            background: #f1f5f9;
            color: #334155;
            font-weight: 700;
            text-align: left;
            padding: 6px 8px;
            border: 1px solid #cbd5e1;
          }
          td {
            padding: 5px 8px;
            border: 1px solid #e2e8f0;
            vertical-align: middle;
          }
          tr:nth-child(even) td {
            background: #f8fafc;
          }
          .total-row td {
            font-weight: 800;
            background: #f1f5f9 !important;
            border-top: 2px solid #64748b;
          }
          .signatures {
            display: flex;
            justify-content: space-between;
            margin-top: 26px;
            page-break-inside: avoid;
          }
          .sig-box {
            text-align: center;
            width: 28%;
          }
          .sig-line {
            border-top: 1px solid #64748b;
            padding-top: 6px;
            font-size: 10px;
            font-weight: 700;
            color: #334155;
          }
          .print-footer {
            margin-top: 16px;
            padding-top: 8px;
            border-top: 1px dashed #cbd5e1;
            font-size: 9px;
            color: #94a3b8;
            display: flex;
            justify-content: space-between;
          }
          @media print {
            body { padding: 0; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="society-header">
          <div class="society-title">Majestique Euriska Co-operative Housing Society Ltd.</div>
          <div class="society-sub">Reg. No: PNA/PNA (4)/HSG/(TC)/21207/2019-20 Date 09/08/2019 • S. No. 2, Plot No C-1, Village Mohammed Wadi, Taluka Haveli, District Pune, Pune - 411060</div>
          <div class="doc-badge">Statement of Income &amp; Expenses — ${formatLongMonth(selectedMonth)}</div>
        </div>

        <div class="kpi-grid">
          <div class="kpi-card income">
            <div class="kpi-label">Total Monthly Income</div>
            <div class="kpi-val" style="color: #059669;">₹${fmt(totalIncome)}</div>
          </div>
          <div class="kpi-card expense">
            <div class="kpi-label">Total Monthly Expenses</div>
            <div class="kpi-val" style="color: #dc2626;">₹${fmt(totalExpense)}</div>
          </div>
          <div class="kpi-card balance">
            <div class="kpi-label">Net Balance / Surplus</div>
            <div class="kpi-val" style="color: ${balance >= 0 ? '#2563eb' : '#ea580c'};">₹${fmt(balance)}</div>
          </div>
        </div>

        <!-- Income Section -->
        <div class="section-title section-income">
          <span>📥 INCOME DETAILS</span>
          <span>Total: ₹${fmt(totalIncome)}</span>
        </div>
        <table>
          <thead>
            <tr>
              <th style="width: 35px; text-align: center;">#</th>
              <th>Source / Particulars</th>
              <th>Remark / Note</th>
              <th style="width: 120px; text-align: right;">Amount (₹)</th>
            </tr>
          </thead>
          <tbody>
            ${validIncome.length === 0 ? '<tr><td colspan="4" style="text-align:center; padding:10px; color:#94a3b8;">No income entries recorded for this month.</td></tr>' :
              validIncome.map((r, i) => `
                <tr>
                  <td style="text-align: center; color: #64748b;">${i + 1}</td>
                  <td style="font-weight: 600;">${r.source || '—'}</td>
                  <td style="color: #475569;">${r.remark || '—'}</td>
                  <td style="text-align: right; font-weight: 700; color: #059669;">₹${fmt(r.amount)}</td>
                </tr>
              `).join('')
            }
            <tr class="total-row">
              <td colspan="3" style="text-align: right;">TOTAL INCOME</td>
              <td style="text-align: right; color: #059669;">₹${fmt(totalIncome)}</td>
            </tr>
          </tbody>
        </table>

        <!-- Expenses Section -->
        <div class="section-title section-expense">
          <span>📤 EXPENDITURE DETAILS</span>
          <span>Total: ₹${fmt(totalExpense)}</span>
        </div>
        <table>
          <thead>
            <tr>
              <th style="width: 35px; text-align: center;">#</th>
              <th style="width: 70px; text-align: center;">Chq No</th>
              <th>Beneficiary / Vendor</th>
              <th>Purpose / Head of Expense</th>
              <th style="width: 75px; text-align: center;">Type</th>
              <th style="width: 120px; text-align: right;">Amount (₹)</th>
            </tr>
          </thead>
          <tbody>
            ${validExpenses.length === 0 ? '<tr><td colspan="6" style="text-align:center; padding:10px; color:#94a3b8;">No expense entries recorded for this month.</td></tr>' :
              validExpenses.map((r, i) => `
                <tr>
                  <td style="text-align: center; color: #64748b;">${i + 1}</td>
                  <td style="text-align: center; font-family: monospace; font-weight: 600;">${r.chequeNo ? '#' + r.chequeNo : '—'}</td>
                  <td style="font-weight: 600;">${r.vendor || '—'}</td>
                  <td style="color: #475569;">${r.purpose || '—'}</td>
                  <td style="text-align: center; font-size: 8.5px; color: ${r.isLinked ? '#0284c7' : '#64748b'};">${r.isLinked ? 'Linked Chq' : 'Manual'}</td>
                  <td style="text-align: right; font-weight: 700; color: #dc2626;">₹${fmt(r.amount)}</td>
                </tr>
              `).join('')
            }
            <tr class="total-row">
              <td colspan="5" style="text-align: right;">TOTAL EXPENDITURE</td>
              <td style="text-align: right; color: #dc2626;">₹${fmt(totalExpense)}</td>
            </tr>
          </tbody>
        </table>

        ${showCommonSection ? `
          <!-- Common Work Section -->
          <div class="section-title section-common" style="margin-top: 14px;">
            <span>🤝 CHEQUE ISSUE FOR COMMON WORK (SOCIETY SHARED EXPENSES)</span>
            <span>Total: ₹${fmt(totalCommonExpense)}</span>
          </div>

          <div class="cost-sharing-grid">
            <div class="cost-card" style="border-left: 3px solid #3b82f6;">
              <div class="cost-card-title">🏢 A Building (87 Flats / 37.66%)</div>
              <div class="cost-card-val">₹${fmt(commonAShare)}</div>
              <div class="cost-card-sub">Society Responsibility: ₹${fmt(commonAShare)}</div>
            </div>
            <div class="cost-card" style="border-left: 3px solid #10b981;">
              <div class="cost-card-title">🏢 B Building (96 Flats / 41.56%)</div>
              <div class="cost-card-val">₹${fmt(commonBShare)}</div>
              <div class="cost-card-sub">${isPaybackActive ? `Recd: ₹${fmt(bReceivedAmount)} | Due: ₹${fmt(bPendingAmount)}` : 'Apportioned Common Share'}</div>
            </div>
            <div class="cost-card" style="border-left: 3px solid #f59e0b;">
              <div class="cost-card-title">🏢 C Building (48 Flats / 20.78%)</div>
              <div class="cost-card-val">₹${fmt(commonCShare)}</div>
              <div class="cost-card-sub">${isPaybackActive ? `Recd: ₹${fmt(cReceivedAmount)} | Due: ₹${fmt(cPendingAmount)}` : 'Apportioned Common Share'}</div>
            </div>
            ${isPaybackActive ? `
            <div class="cost-card" style="border-left: 3px solid #8b5cf6; background: #faf5ff;">
              <div class="cost-card-title">🤝 Inter-Building Recovery (B &amp; C)</div>
              <div class="cost-card-val" style="color: #6d28d9;">₹${fmt(totalRecovered)} <span style="font-size: 10px; font-weight: normal; color: #64748b;">/ ₹${fmt(totalRecoveryDue)}</span></div>
              <div class="cost-card-sub" style="color: ${totalOutstanding > 0 ? '#b91c1c' : '#15803d'}; font-weight: 600;">
                ${totalOutstanding > 0 ? `Pending: ₹${fmt(totalOutstanding)}` : 'Fully Recovered ✓'}
              </div>
            </div>
            ` : ''}
          </div>

          <table>
            <thead>
              <tr>
                <th style="width: 25px; text-align: center;">#</th>
                <th style="width: 55px; text-align: center;">Chq No</th>
                <th style="width: 70px; text-align: center;">Date</th>
                <th>Payee / Vendor</th>
                <th>Purpose / Head of Expense</th>
                <th style="width: 85px;">Remark</th>
                <th style="width: 80px; text-align: right;">Total (₹)</th>
                <th style="width: 75px; text-align: right;">A Share (87)</th>
                <th style="width: 75px; text-align: right;">B Share (96)</th>
                ${isPaybackActive ? '<th style="width: 75px; text-align: center;">B Paid Date</th>' : ''}
                <th style="width: 75px; text-align: right;">C Share (48)</th>
                ${isPaybackActive ? '<th style="width: 75px; text-align: center;">C Paid Date</th>' : ''}
                <th style="width: 65px; text-align: center;">Who Paid</th>
              </tr>
            </thead>
            <tbody>
              ${validCommonCheques.length === 0 ? `<tr><td colspan="${isPaybackActive ? 13 : 11}" style="text-align:center; padding:10px; color:#94a3b8;">No common work cheques recorded for this month.</td></tr>` :
                validCommonCheques.map((r, i) => {
                  const amt = n(r.amount);
                  const aShare = (amt * FLATS.A) / FLATS.Total;
                  const bShare = (amt * FLATS.B) / FLATS.Total;
                  const cShare = (amt * FLATS.C) / FLATS.Total;
                  const bPaid = r.bPaidDate || r.bReceiveDate;
                  const cPaid = r.cPaidDate || r.cReceiveDate;
                  return `
                    <tr>
                      <td style="text-align: center; color: #64748b;">${i + 1}</td>
                      <td style="text-align: center; font-family: monospace; font-weight: 600;">${r.chequeNo ? '#' + r.chequeNo : '—'}</td>
                      <td style="text-align: center; color: #475569;">${r.date || '—'}</td>
                      <td style="font-weight: 600;">${r.vendor || '—'}</td>
                      <td style="color: #475569;">${r.purpose || '—'}</td>
                      <td style="color: #64748b; font-size: 8.5px;">${r.remark || '—'}</td>
                      <td style="text-align: right; font-weight: 700; color: #1e3a8a;">₹${fmt(amt)}</td>
                      <td style="text-align: right; font-weight: 600; color: #2563eb;">₹${fmt(aShare)}</td>
                      <td style="text-align: right; font-weight: 600; color: #059669;">₹${fmt(bShare)}</td>
                      ${isPaybackActive ? `
                        <td style="text-align: center; font-size: 8.5px;">
                          ${bPaid ? `<span style="color:#059669; font-weight:700;">✓ ${bPaid}</span>` : '<span style="color:#dc2626; font-weight:600;">Pending</span>'}
                        </td>
                      ` : ''}
                      <td style="text-align: right; font-weight: 600; color: #d97706;">₹${fmt(cShare)}</td>
                      ${isPaybackActive ? `
                        <td style="text-align: center; font-size: 8.5px;">
                          ${cPaid ? `<span style="color:#059669; font-weight:700;">✓ ${cPaid}</span>` : '<span style="color:#dc2626; font-weight:600;">Pending</span>'}
                        </td>
                      ` : ''}
                      <td style="text-align: center; font-size: 8.5px; color: #475569;">${r.whoPaid || 'A Building'}</td>
                    </tr>
                  `;
                }).join('')
              }
              <tr class="total-row">
                <td colspan="6" style="text-align: right;">TOTAL COMMON EXPENSES (231 FLATS)</td>
                <td style="text-align: right; color: #1e3a8a;">₹${fmt(totalCommonExpense)}</td>
                <td style="text-align: right; color: #2563eb;">₹${fmt(commonAShare)}</td>
                <td style="text-align: right; color: #059669;">₹${fmt(commonBShare)}</td>
                ${isPaybackActive ? `<td style="text-align: center; font-size: 8.5px; color: #059669; font-weight: 700;">₹${fmt(bReceivedAmount)}</td>` : ''}
                <td style="text-align: right; color: #d97706;">₹${fmt(commonCShare)}</td>
                ${isPaybackActive ? `<td style="text-align: center; font-size: 8.5px; color: #d97706; font-weight: 700;">₹${fmt(cReceivedAmount)}</td>` : ''}
                <td></td>
              </tr>
            </tbody>
          </table>
        ` : ''}

        <!-- Net Summary Box -->
        <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 6px; padding: 10px 14px; margin-top: 8px;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <div>
              <strong>Summary for ${formatLongMonth(selectedMonth)}:</strong>
              <span style="color: #64748b; margin-left: 8px;">Income (₹${fmt(totalIncome)}) − Expenses (₹${fmt(totalExpense)})</span>
            </div>
            <div style="font-size: 13px; font-weight: 800; color: ${balance >= 0 ? '#10b981' : '#ef4444'};">
              Closing Balance: ₹${fmt(balance)}
            </div>
          </div>
          ${showCommonSection ? `
            <div style="font-size: 9.5px; color: #475569; margin-top: 6px; border-top: 1px dashed #cbd5e1; padding-top: 6px; display: flex; justify-content: space-between; flex-wrap: wrap; gap: 4px;">
              <span><strong>Common Society Shared Work (231 Flats):</strong> Total: ₹${fmt(totalCommonExpense)} (A: ₹${fmt(commonAShare)} | B: ₹${fmt(commonBShare)} | C: ₹${fmt(commonCShare)})</span>
              ${isPaybackActive ? `<span><strong>B &amp; C Recovery:</strong> Recovered ₹${fmt(totalRecovered)} / Due ₹${fmt(totalRecoveryDue)} (${totalOutstanding > 0 ? `Pending: ₹${fmt(totalOutstanding)}` : 'Fully Settled'})</span>` : ''}
            </div>
          ` : ''}
        </div>

        <div class="signatures">
          <div class="sig-box">
            <div class="sig-line">Prepared By (Manager)</div>
          </div>
          <div class="sig-box">
            <div class="sig-line">Society Treasurer</div>
          </div>
          <div class="sig-box">
            <div class="sig-line">Society Secretary / Chairman</div>
          </div>
        </div>

        <div class="print-footer">
          <div>Majestique Euriska CHS Ltd. • Financial Management &amp; Accounts</div>
          <div>Printed on: ${printedDate} • Generated from Society Dashboard</div>
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

    const printWin = window.open('', '_blank');
    if (printWin) {
      printWin.document.write(printDoc);
      printWin.document.close();
    }
  };

  const handleManualSave = () => {
    clearTimeout(autoSaveTimer.current);
    saveToFirebase(income, expenses, recordId, selectedMonth);
  };

  const seedHistoricalData = async () => {
    setIsLoading(true);
    setSaveStatus('saving');
    setSaveMsg('Seeding historical data...');
    try {
      await ensureFirebaseSession();
      for (const [key, data] of Object.entries(HISTORICAL_DATA)) {
        await setDoc(doc(db, 'financeMonthly', key), data, { merge: true });
      }
      setSaveStatus('saved');
      setSaveMsg('Seeded FY 2025-26 data successfully!');

      if (HISTORICAL_DATA[recordId]) {
        setIncome(HISTORICAL_DATA[recordId].income);
        setExpenses(HISTORICAL_DATA[recordId].expenses);
      }
    } catch (err) {
      console.error('Error seeding data:', err);
      setSaveStatus('error');
      setSaveMsg('Seeding failed.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="finance-tracker" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

      {/* Header & Tabs */}
      <div className="table-card" style={{ padding: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--line)', paddingRight: '16px', flexWrap: 'wrap', gap: '12px' }}>
          <div className="attendance-month-tabs" role="tablist" style={{ borderBottom: 'none' }}>
            {months.map(mv => (
              <button
                key={mv}
                className={`attendance-month-tab ${selectedMonth === mv ? 'attendance-month-tab--active' : ''}`}
                onClick={() => setSelectedMonth(mv)}
              >
                {formatMonthLabel(mv)}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 0' }}>
            <span style={{ marginLeft: 20, fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-muted)' }}>Financial Year:</span>
            <select
              value={selectedYear}
              onChange={e => {
                const yr = Number(e.target.value);
                setSelectedYear(yr);
                setSelectedMonth(`${yr}-04`);
              }}
              style={{
                padding: '6px 12px',
                borderRadius: '8px',
                border: '1px solid var(--line)',
                background: '#fff',
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              <option value={2025}>FY 2025-26</option>
              <option value={2026}>FY 2026-27</option>
            </select>
          </div>
        </div>

      </div>

      <div style={{ margin: '8px 0 16px 0' }}>
        <h3 style={{ marginBottom: '12px', fontSize: '1.05rem', color: '#334155', fontWeight: 600 }}>Annual Financial Overview — FY {selectedYear}-{String(selectedYear+1).slice(-2)}</h3>
        <div className="attendance-summary-grid">
          <div className="summary-card" style={{ borderLeft: '4px solid #10b981', background: '#ecfdf5', boxShadow: 'none', border: '1px solid #d1fae5' }}>
            <span style={{ color: '#065f46', fontSize: '0.85rem' }}>Total Income</span>
            <strong style={{ color: '#059669', fontSize: '1.25rem' }}>{isYearlyLoading ? '...' : `₹${fmt(yearlyIncome)}`}</strong>
          </div>
          <div className="summary-card" style={{ borderLeft: '4px solid #ef4444', background: '#fef2f2', boxShadow: 'none', border: '1px solid #fee2e2' }}>
            <span style={{ color: '#991b1b', fontSize: '0.85rem' }}>Total Expenses</span>
            <strong style={{ color: '#dc2626', fontSize: '1.25rem' }}>{isYearlyLoading ? '...' : `₹${fmt(yearlyExpense)}`}</strong>
          </div>
          <div className="summary-card" style={{ borderLeft: `4px solid ${yearlyIncome - yearlyExpense >= 0 ? '#3b82f6' : '#f97316'}`, background: yearlyIncome - yearlyExpense < 0 ? '#fff7ed' : '#eff6ff', boxShadow: 'none', border: `1px solid ${yearlyIncome - yearlyExpense >= 0 ? '#dbeafe' : '#ffedd5'}` }}>
            <span style={{ color: yearlyIncome - yearlyExpense >= 0 ? '#1e40af' : '#c2410c', fontSize: '0.85rem' }}>Overall Balance</span>
            <strong style={{ color: yearlyIncome - yearlyExpense >= 0 ? '#2563eb' : '#ea580c', fontSize: '1.25rem' }}>{isYearlyLoading ? '...' : `₹${fmt(yearlyIncome - yearlyExpense)}`}</strong>
          </div>
        </div>
      </div>

      <div className="table-card" style={{ padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <p className="eyebrow" style={{ margin: 0, marginBottom: '4px' }}>Monthly Cashflow Tracker</p>
          <h3 style={{ margin: 0 }}>Income & Expenses — {formatLongMonth(selectedMonth)}</h3>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: badge.color, fontWeight: 500, fontSize: '0.9rem' }}>
            <span>{badge.icon}</span>
            <span>{isLoading ? 'Loading...' : saveMsg || 'Ready'}</span>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            {isAdmin && selectedYear === 2025 && (
              <button
                className="button-secondary"
                onClick={seedHistoricalData}
                disabled={isLoading}
                style={{ padding: '8px 16px', background: '#ecfdf5', color: '#065f46', borderColor: '#a7f3d0' }}
                title="Seed historical data for FY 2025-26 from screenshots"
              >
                🌱 Seed FY 25-26
              </button>
            )}
            {isAdmin && !isLocked && (
              <button className="button-secondary" onClick={handleManualSave} disabled={isLoading || saveStatus === 'saving'} style={{ padding: '8px 16px' }}>
                💾 Save
              </button>
            )}
            <button className="button-secondary" onClick={() => setIsSearchOpen(!isSearchOpen)} style={{ padding: '8px 16px', background: isSearchOpen ? '#f1f5f9' : 'inherit' }}>
              🔍 Search
            </button>
            <button className="button-secondary" onClick={handleDownloadExcel} style={{ padding: '8px 16px' }}>
              ⬇ Export Excel
            </button>
            <button
              className="button-primary"
              onClick={handlePrintPdf}
              style={{ padding: '8px 16px', background: '#0284c7', borderColor: '#0284c7', display: 'flex', alignItems: 'center', gap: '6px' }}
              title="Print or Save PDF Statement"
            >
              <span>🖨️</span> Export PDF
            </button>
          </div>
        </div>
      </div>

      {isSearchOpen && (
        <div className="table-card" style={{ padding: '24px', background: '#f8fafc', border: '1px solid #e2e8f0', marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h4 style={{ margin: 0, color: '#334155', fontSize: '1.1rem' }}>Search Transactions (FY {selectedYear}-{String(selectedYear+1).slice(-2)})</h4>
            <button onClick={() => setIsSearchOpen(false)} style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: '#94a3b8' }}>✕</button>
          </div>
          <input
            type="text"
            placeholder="Search by vendor, purpose, amount..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{ width: '100%', padding: '12px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', marginBottom: '16px', fontSize: '0.95rem' }}
            autoFocus
          />
          <div className="attendance-table-scroll" style={{ maxHeight: '400px', overflowY: 'auto', border: '1px solid var(--line)', borderRadius: '8px' }}>
            <table className="attendance-table" style={{ width: '100%', margin: 0 }}>
              <thead style={{ position: 'sticky', top: 0, background: '#f1f5f9', zIndex: 1 }}>
                <tr>
                  <th>Month</th>
                  <th>Type</th>
                  <th>Entity (Vendor / Source)</th>
                  <th>Details (Purpose / Remark)</th>
                  <th style={{ textAlign: 'right' }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {[...months].reverse().flatMap(m => {
                   const isCurrent = m === selectedMonth;
                   const monthObj = isCurrent ? { month: m, income, expenses, chequeExpenses } : (yearlyData.find(d => d.month === m) || { month: m, income: [], expenses: [], chequeExpenses: [] });
                   
                   const matchedIncome = (monthObj.income || []).filter(i => i.source || i.amount).map(i => ({ ...i, type: 'Income', month: formatLongMonth(m) }));
                   const matchedExpense = [...(monthObj.expenses || []), ...(monthObj.chequeExpenses || [])].filter(e => e.vendor || e.amount || e.chequeNo).map(e => ({ ...e, type: 'Expense', month: formatLongMonth(m) }));
                   return [...matchedIncome, ...matchedExpense];
                }).filter(item => {
                   if (!searchQuery) return true;
                   const queryWords = searchQuery.toLowerCase().trim().split(/\s+/);
                   const combinedText = `
                     ${item.source || ''} 
                     ${item.vendor || ''} 
                     ${item.remark || ''} 
                     ${item.purpose || ''} 
                     ${item.amount || ''}
                   `.toLowerCase();
                   return queryWords.every(word => combinedText.includes(word));
                }).map((item, idx) => (
                  <tr key={idx}>
                    <td>{item.month}</td>
                    <td>
                       <span style={{ padding: '4px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600, background: item.type === 'Income' ? '#dcfce7' : '#fee2e2', color: item.type === 'Income' ? '#166534' : '#991b1b' }}>
                         {item.type}
                       </span>
                    </td>
                    <td>{item.source || item.vendor || '-'}</td>
                    <td>{item.remark || item.purpose || '-'}</td>
                    <td style={{ textAlign: 'right', fontWeight: 600 }}>₹{fmt(item.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {isLocked && (
        <div style={{ background: '#fee2e2', color: '#991b1b', border: '1px solid #fecaca', padding: '16px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 500 }}>
          <span>🔒</span>
          <span>This month is locked. Expense and income details cannot be edited.</span>
        </div>
      )}

      {/* Summary Cards */}
      <div className="attendance-summary-grid">
        <div className="summary-card" style={{ borderLeft: '4px solid #10b981' }}>
          <span>Total Income</span>
          <strong style={{ color: '#059669' }}>₹{fmt(totalIncome)}</strong>
        </div>
        <div className="summary-card" style={{ borderLeft: '4px solid #ef4444' }}>
          <span>Total Expenses</span>
          <strong style={{ color: '#dc2626' }}>₹{fmt(totalExpense)}</strong>
        </div>
        <div className="summary-card" style={{ borderLeft: `4px solid ${balance >= 0 ? '#3b82f6' : '#f97316'}`, background: balance < 0 ? '#fff7ed' : 'inherit' }}>
          <span>Closing Balance</span>
          <strong style={{ color: balance >= 0 ? '#2563eb' : '#ea580c' }}>₹{fmt(balance)}</strong>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 500px), 1fr))', gap: '24px' }}>

        {/* Income Table */}
        <div className="table-card" style={{ height: 'fit-content' }}>
          <div className="attendance-table-card__header" style={{ padding: '16px 20px' }}>
            <h4 style={{ margin: 0, color: '#059669' }}>📥 Income Details (₹{fmt(totalIncome)})</h4>
            {isAdmin && !isLocked && <button className="button-secondary" onClick={addIncomeRow} style={{ padding: '4px 12px', fontSize: '0.85rem' }}>+ Add Row</button>}
          </div>
          <div className="attendance-table-scroll" style={{ padding: 0, maxHeight: '520px', overflowY: 'auto' }}>
            <table className="attendance-table attendance-table--bill" style={{ minWidth: '100%' }}>
              <thead>
                <tr style={{ background: '#ecfdf5' }}>
                  <th style={{ width: '40%', color: '#059669', background: '#ecfdf5' }}>Amount Received</th>
                  <th style={{ width: '25%', textAlign: 'right', color: '#059669', background: '#ecfdf5' }}>Amount (₹)</th>
                  <th style={{ width: '35%', color: '#059669', background: '#ecfdf5' }}>Remark</th>
                  <th style={{ width: '40px', background: '#ecfdf5' }}></th>
                </tr>
              </thead>
              <tbody>
                {income.map((row, i) => (
                  <tr key={i}>
                    <td>
                      <input
                        className="attendance-register-input"
                        value={row.source}
                        onChange={e => updateIncome(i, 'source', e.target.value)}
                        placeholder="e.g. Maintenance"
                        readOnly={!isAdmin || isLocked}
                      />
                    </td>
                    <td>
                      <input
                        className="attendance-register-input"
                        style={{ textAlign: 'right' }}
                        value={row.amount}
                        onChange={e => updateIncome(i, 'amount', e.target.value)}
                        placeholder="0.00"
                        readOnly={!isAdmin || isLocked}
                      />
                    </td>
                    <td>
                      <input
                        className="attendance-register-input"
                        value={row.remark}
                        onChange={e => updateIncome(i, 'remark', e.target.value)}
                        placeholder="Remark"
                        readOnly={!isAdmin || isLocked}
                      />
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      {isAdmin && !isLocked && <button onClick={() => removeIncome(i)} style={{ border: 'none', background: 'none', cursor: 'pointer', opacity: 0.4 }}>✕</button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Expenses Table */}
        <div className="table-card" style={{ height: 'fit-content' }}>
          <div className="attendance-table-card__header" style={{ padding: '16px 20px' }}>
            <h4 style={{ margin: 0, color: '#dc2626' }}>📤 Expense Details (₹{fmt(totalExpense)})</h4>
            {isAdmin && !isLocked && <button className="button-secondary" onClick={addExpenseRow} style={{ padding: '4px 12px', fontSize: '0.85rem' }}>+ Add Row</button>}
          </div>
          <div className="attendance-table-scroll" style={{ padding: 0, maxHeight: '520px', overflowY: 'auto' }}>
            <table className="attendance-table attendance-table--bill" style={{ minWidth: '100%' }}>
              <thead>
                <tr style={{ background: '#fff1f2' }}>
                  {selectedMonth >= '2026-06' && <th style={{ width: '15%', color: '#e11d48', background: '#fff1f2' }}>Cheque No</th>}
                  <th style={{ width: selectedMonth >= '2026-06' ? '30%' : '40%', color: '#e11d48', background: '#fff1f2' }}>Vendor Name</th>
                  <th style={{ width: '20%', textAlign: 'right', color: '#e11d48', background: '#fff1f2' }}>Amount (₹)</th>
                  <th style={{ width: selectedMonth >= '2026-06' ? '30%' : '35%', color: '#e11d48', background: '#fff1f2' }}>Purpose</th>
                  <th style={{ width: '40px', background: '#fff1f2' }}></th>
                </tr>
              </thead>
              <tbody>
                {combinedExpenses.map((row) => {
                  if (row.isLinked) {
                    return (
                      <tr key={row.id} style={{ background: '#fafaf9', opacity: 0.85 }}>
                        {selectedMonth >= '2026-06' && (
                          <td style={{ verticalAlign: 'middle', paddingLeft: '12px' }}>
                            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--muted)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                              🔗 {row.chequeNo}
                            </span>
                          </td>
                        )}
                        <td>
                          <input
                            className="attendance-register-input"
                            value={row.vendor}
                            readOnly
                            style={{ background: 'transparent', color: '#78716c', fontStyle: 'italic' }}
                          />
                        </td>
                        <td>
                          <input
                            className="attendance-register-input"
                            style={{ textAlign: 'right', background: 'transparent', color: '#78716c', fontStyle: 'italic' }}
                            value={row.amount}
                            readOnly
                          />
                        </td>
                        <td>
                          <input
                            className="attendance-register-input"
                            value={`${row.purpose} (${row.sourceTab})`}
                            readOnly
                            style={{ background: 'transparent', color: '#78716c', fontStyle: 'italic' }}
                          />
                        </td>
                        <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                          <span title="Linked to Cheque Tracker" style={{ cursor: 'default', fontSize: '0.85rem' }}>🔒</span>
                        </td>
                      </tr>
                    );
                  } else {
                    const i = row.originalIndex;
                    return (
                      <tr key={row.id}>
                        {selectedMonth >= '2026-06' && (
                          <td>
                            <input
                              className="attendance-register-input"
                              value={row.chequeNo}
                              onChange={e => updateExpense(i, 'chequeNo', e.target.value)}
                              placeholder="e.g. 123"
                              readOnly={!isAdmin || isLocked}
                            />
                          </td>
                        )}
                        <td>
                          <input
                            className="attendance-register-input"
                            value={row.vendor}
                            onChange={e => updateExpense(i, 'vendor', e.target.value)}
                            placeholder="e.g. MSEDCL"
                            readOnly={!isAdmin || isLocked}
                          />
                        </td>
                        <td>
                          <input
                            className="attendance-register-input"
                            style={{ textAlign: 'right' }}
                            value={row.amount}
                            onChange={e => updateExpense(i, 'amount', e.target.value)}
                            placeholder="0.00"
                            readOnly={!isAdmin || isLocked}
                          />
                        </td>
                        <td>
                          <input
                            className="attendance-register-input"
                            value={row.purpose}
                            onChange={e => updateExpense(i, 'purpose', e.target.value)}
                            placeholder="Purpose"
                            readOnly={!isAdmin || isLocked}
                          />
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          {isAdmin && !isLocked && <button onClick={() => removeExpense(i)} style={{ border: 'none', background: 'none', cursor: 'pointer', opacity: 0.4 }}>✕</button>}
                        </td>
                      </tr>
                    );
                  }
                })}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      <div style={{ background: '#f8fafc', padding: '24px', borderRadius: '16px', border: '1px solid var(--line)', display: 'flex', justifyContent: 'flex-end' }}>
        <div style={{ textAlign: 'right' }}>
          <p style={{ margin: 0, fontSize: '0.85rem', opacity: 0.6 }}>Final Balance for {formatMonthLabel(selectedMonth)}</p>
          <h2 style={{ margin: 0, color: balance >= 0 ? '#10b981' : '#ef4444' }}>₹{fmt(balance)}</h2>
        </div>
      </div>

    </div>
  );
}

const HISTORICAL_DATA = {
  'finance_2025-04': {
    month: '2025-04',
    income: [
      { source: 'Maintenance Collection', amount: '182854.00', remark: 'Flat Maintenance HDFC' },
      { source: 'Tata Play Broadband', amount: '3630.00', remark: 'Rent TATA Play' },
      { source: 'C building', amount: '5884.00', remark: 'VMS Share' },
      { source: 'B building', amount: '11769.00', remark: 'VMS Share' },
      { source: 'Transfer Charges', amount: '25000.00', remark: 'Flat No 606' },
      { source: 'Tata Play', amount: '27001.00', remark: 'Tata Play Electricity bill paid' },
      { source: 'B building', amount: '2942.00', remark: 'Clubhouse Electricity Share' }
    ],
    expenses: [
      { chequeNo: '', vendor: 'Marshal Force Security', amount: '42970.00', purpose: 'Security Charges' },
      { chequeNo: '', vendor: 'Shubham Enterprises', amount: '30983.00', purpose: 'House keeping Charges' },
      { chequeNo: '', vendor: 'Sai Swimming Pool', amount: '4519.00', purpose: 'Swimming Pool Maintenance Charges' },
      { chequeNo: '', vendor: 'Sidharam Lende', amount: '10000.00', purpose: 'Manager Salary' },
      { chequeNo: '', vendor: 'Petty Cash', amount: '10000.00', purpose: 'Common Expenses' },
      { chequeNo: '', vendor: 'Shree Swami samarth', amount: '6421.00', purpose: 'Water Tanker Charges' },
      { chequeNo: '', vendor: 'Naushad Ali', amount: '2697.00', purpose: 'Gardner Salary' },
      { chequeNo: '', vendor: 'C building', amount: '2504.00', purpose: 'Clubhouse CCTV share' },
      { chequeNo: '', vendor: 'C building', amount: '23339.00', purpose: 'Common Electricity Share' },
      { chequeNo: '', vendor: 'Vivish Technlogy', amount: '28320.00', purpose: 'VMS maygate Main Ghate app' },
      { chequeNo: '', vendor: 'Sai Swimming Pool', amount: '9980.00', purpose: 'Swining pool Motor purchase share' },
      { chequeNo: '', vendor: 'B building', amount: '1130.00', purpose: 'Gym AMC Share' },
      { chequeNo: '', vendor: 'B building', amount: '7766.00', purpose: 'Fire AMC Share' },
      { chequeNo: '', vendor: 'Ankush Fire Sefty', amount: '13600.00', purpose: 'Fire Extigusher Refiling' },
      { chequeNo: '', vendor: 'Shahebaj Safty Solution', amount: '7080.00', purpose: 'Fire Pump NRV Replacment' },
      { chequeNo: '', vendor: 'C building', amount: '1160.00', purpose: 'Clubhouse Electricity Share' }
    ]
  },
  'finance_2025-05': {
    month: '2025-05',
    income: [
      { source: 'Maintenance', amount: '174862.00', remark: '' },
      { source: 'Tata Play', amount: '3630.00', remark: '' },
      { source: 'B Building', amount: '10298.00', remark: '' },
      { source: 'C Building', amount: '5149.00', remark: '' },
      { source: 'B Building', amount: '9195.00', remark: '' },
      { source: 'C Building', amount: '4597.00', remark: 'Park Plus Share' },
      { source: 'B Building', amount: '23318.00', remark: 'Park Plus Share' },
      { source: 'C Building', amount: '11659.00', remark: 'Park Plus Share' },
      { source: 'B Building', amount: '2660.00', remark: 'Park Plus Share' },
      { source: 'C Building', amount: '1329.00', remark: 'Common Electricity share' },
      { source: 'B Building', amount: '0', remark: 'Common Electricity share' },
      { source: 'C Building', amount: '1471.00', remark: 'Clubhouse Electricity share' },
      { source: '', amount: '0', remark: 'Fire NRV charges share' }
    ],
    expenses: [
      { chequeNo: '', vendor: 'MSEDCL', amount: '37800.00', purpose: 'A Building Electricity' },
      { chequeNo: '', vendor: 'Self', amount: '10000.00', purpose: 'Petty Cash' },
      { chequeNo: '', vendor: 'Sidharam Lende', amount: '11700.00', purpose: 'Manager Salary' },
      { chequeNo: '', vendor: 'Shubham Enterprises', amount: '31424.00', purpose: 'Housekeeping Charges' },
      { chequeNo: '', vendor: 'Marshal Force Security', amount: '46167.00', purpose: 'Security Charges' },
      { chequeNo: '', vendor: 'Naushad Ali', amount: '2697.00', purpose: 'Gardener Salary' },
      { chequeNo: '', vendor: 'Sai Swimming Pool', amount: '4519.00', purpose: 'Pool Maintenance' },
      { chequeNo: '', vendor: 'MSEDCL', amount: '6400.00', purpose: 'Clubhouse Electricity bill' },
      { chequeNo: '', vendor: 'Shree Swami Samarth Water', amount: '7664.00', purpose: '' },
      { chequeNo: '', vendor: 'Schindler India Pvt. Ltd.', amount: '89680.00', purpose: 'Lift AMC Charges 6 months' },
      { chequeNo: '', vendor: 'B Building', amount: '12343.00', purpose: 'Property tax Share' },
      { chequeNo: '', vendor: 'Vivish Technologies', amount: '14160.00', purpose: 'Mygate ERP Charges 2 years' },
      { chequeNo: '', vendor: 'Parviom Technoloie', amount: '24780.00', purpose: 'Park Plus Insttalation Charges' },
      { chequeNo: '', vendor: 'Parviom Technoloie', amount: '22125.00', purpose: 'Park Plus Rent Charges' },
      { chequeNo: '', vendor: 'C Building', amount: '6257.00', purpose: 'DG Fuel Share' }
    ]
  },
  'finance_2025-06': {
    month: '2025-06',
    income: [
      { source: 'Maintenance', amount: '162243.00', remark: '' },
      { source: 'Tata Play', amount: '3630.00', remark: '' }
    ],
    expenses: [
      { chequeNo: '', vendor: 'MSEDCL', amount: '37110.00', purpose: 'A Building Electricity' },
      { chequeNo: '', vendor: 'Self', amount: '10000.00', purpose: 'Petty Cash' },
      { chequeNo: '', vendor: 'Sidharam Lende', amount: '11700.00', purpose: 'Manager Salary' },
      { chequeNo: '', vendor: 'Shubham Enterprises', amount: '25918.00', purpose: 'Housekeeping Charges' },
      { chequeNo: '', vendor: 'Marshal Force Security', amount: '36101.00', purpose: 'Security Charges' },
      { chequeNo: '', vendor: 'Naushad Ali', amount: '2697.00', purpose: 'Gardener Salary' },
      { chequeNo: '', vendor: 'Sai Swimming Pool', amount: '4519.00', purpose: 'Pool Maintenance' },
      { chequeNo: '', vendor: 'Aditya Kumar', amount: '7532.00', purpose: 'Balance Amount Paly Area' },
      { chequeNo: '', vendor: 'Shree Swami Samarth', amount: '7043.00', purpose: 'Water Tanker Charges' },
      { chequeNo: '', vendor: 'B Building', amount: '1537.00', purpose: 'Clubhouse Electricity Bill share' },
      { chequeNo: '', vendor: 'B Building', amount: '19607.00', purpose: 'Common Electricty Bill share' }
    ]
  },
  'finance_2025-07': {
    month: '2025-07',
    income: [
      { source: 'Maintenance', amount: '258393.00', remark: '' },
      { source: 'Tata Play', amount: '3630.00', remark: '' },
      { source: 'Shifting Charges', amount: '4000.00', remark: 'Flat No. 407' },
      { source: 'C Building', amount: '5195.00', remark: 'STP Fine' },
      { source: 'B Building', amount: '10390.00', remark: 'STP Fine' },
      { source: 'B Building', amount: '1488.00', remark: 'Clubhouse Share' }
    ],
    expenses: [
      { chequeNo: '', vendor: '3S Security Services', amount: '52351.00', purpose: 'Security Charges' },
      { chequeNo: '', vendor: 'MSEDCL', amount: '38310.00', purpose: 'A Building Electricity' },
      { chequeNo: '', vendor: 'Shubham Enterprises', amount: '37529.00', purpose: 'Housekeeping Charges' },
      { chequeNo: '', vendor: 'PMC', amount: '25000.00', purpose: 'STP Fine' },
      { chequeNo: '', vendor: 'Nandu Auti', amount: '21650.00', purpose: 'CCTV Hard disc and Installlation charges' },
      { chequeNo: '', vendor: 'C Building', amount: '21607.00', purpose: 'Common Electricty Bill share' },
      { chequeNo: '', vendor: 'Sidharam Lende', amount: '11700.00', purpose: 'Manager Salary' },
      { chequeNo: '', vendor: 'Self', amount: '10000.00', purpose: 'Petty Cash' },
      { chequeNo: '', vendor: 'Shree Swami Samarth', amount: '5386.00', purpose: 'Water Tanker Charges' },
      { chequeNo: '', vendor: 'Parivom Technology', amount: '5015.00', purpose: 'Car and Bike Sticker Purchase' },
      { chequeNo: '', vendor: 'Sai Swimming Pool', amount: '4519.00', purpose: 'Pool Maintenance' },
      { chequeNo: '', vendor: 'Nandu Auti', amount: '3164.00', purpose: 'Swimming Pool Camera Installation' },
      { chequeNo: '', vendor: 'Naushad Ali', amount: '2697.00', purpose: 'Gardener Salary' },
      { chequeNo: '', vendor: 'Shivshankar Chauhan', amount: '2134.00', purpose: 'Balance Amount Paly Area' },
      { chequeNo: '', vendor: 'C Building', amount: '1341.00', purpose: 'Clubhouse Electricty Bill share' }
    ]
  },
  'finance_2025-08': {
    month: '2025-08',
    income: [
      { source: 'Maintenance', amount: '293092.00', remark: '' },
      { source: 'Tata Play', amount: '3630.00', remark: '' },
      { source: 'Flat Transfer Fees', amount: '25000.00', remark: 'Flat No. 504' },
      { source: 'Flat Transfer Fees', amount: '25000.00', remark: 'Flat No. 1001' },
      { source: 'Clubhouse Booking', amount: '1000.00', remark: 'Flat No. 802' },
      { source: 'C Building', amount: '16438.00', remark: 'Common Electricity Share' },
      { source: 'C Building', amount: '744.00', remark: 'Clubhouse Electricity Share' },
      { source: 'B Building', amount: '24777.00', remark: 'Common Electricity Share' }
    ],
    expenses: [
      { chequeNo: '', vendor: 'MSEDCL', amount: '59620.00', purpose: 'Common Electricity Share' },
      { chequeNo: '', vendor: 'Shubham Enterprises', amount: '39694.00', purpose: 'Housekeeping Charges' },
      { chequeNo: '', vendor: 'MSEDCL', amount: '36890.00', purpose: 'A Building Electricity' },
      { chequeNo: '', vendor: '3S Security Services', amount: '35967.00', purpose: 'Security Charges' },
      { chequeNo: '', vendor: 'Shivshankar Chauhan', amount: '13766.00', purpose: 'Common Salary' },
      { chequeNo: '', vendor: 'Sidharam Lende', amount: '11700.00', purpose: 'Manager Salary' },
      { chequeNo: '', vendor: 'Self', amount: '10000.00', purpose: 'Petty Cash' },
      { chequeNo: '', vendor: 'C Building', amount: '6257.00', purpose: 'Diesel Share' },
      { chequeNo: '', vendor: 'Sai Swimming Pool', amount: '4519.00', purpose: 'Pool Maintenance' },
      { chequeNo: '', vendor: 'Om Fabrication', amount: '4500.00', purpose: 'Terrace Shed Fitting and Repairing' },
      { chequeNo: '', vendor: 'MSEDCL', amount: '3580.00', purpose: 'Clubhouse Electricity Share' },
      { chequeNo: '', vendor: 'Naushad Ali', amount: '3058.00', purpose: 'Gardener Salary' }
    ]
  },
  'finance_2025-09': {
    month: '2025-09',
    income: [
      { source: 'Maintenance', amount: '201024.00', remark: '' },
      { source: 'Tata Play', amount: '3630.00', remark: 'TATA Play' },
      { source: 'Flat Transfer Fees', amount: '25000.00', remark: 'Flat No 703' },
      { source: 'Flat Transfer Fees', amount: '25000.00', remark: 'Flat No 303' },
      { source: 'Clubhouse Booking', amount: '2000.00', remark: 'Activity' },
      { source: 'Clubhouse Booking', amount: '1000.00', remark: 'Flat No 702' },
      { source: 'Chair Rent', amount: '100.00', remark: 'Flat No 605' }
    ],
    expenses: [
      { chequeNo: '', vendor: '3S Security Services', amount: '52351.00', purpose: 'Security Charges' },
      { chequeNo: '', vendor: 'Shubham Enterprises', amount: '40826.00', purpose: 'Housekeeping Charges' },
      { chequeNo: '', vendor: 'MSEDCL', amount: '38770.00', purpose: 'A Building Electricity' },
      { chequeNo: '', vendor: 'B Building', amount: '22066.00', purpose: 'Common Electricity Bill share' },
      { chequeNo: '', vendor: 'Sidharam Lende', amount: '11700.00', purpose: 'Manager Salary' },
      { chequeNo: '', vendor: 'Self', amount: '10000.00', purpose: 'Petty Cash' },
      { chequeNo: '', vendor: 'Sai Swimming Pool', amount: '5460.00', purpose: 'Pool Maintenance' },
      { chequeNo: '', vendor: 'Shivshankar Chauhan', amount: '3766.00', purpose: 'Common Salary' },
      { chequeNo: '', vendor: 'IGS Solar', amount: '3050.00', purpose: 'Solar Tube Repairing' },
      { chequeNo: '', vendor: 'Naushad Ali', amount: '2697.00', purpose: 'Gardener Salary' },
      { chequeNo: '', vendor: 'B Building', amount: '960.00', purpose: 'Clubhouse Electricity Bill share' }
    ]
  },
  'finance_2025-10': {
    month: '2025-10',
    income: [
      { source: 'Maintenance', amount: '275923.00', remark: '' },
      { source: 'Tata Play', amount: '3630.00', remark: 'TATA Play' },
      { source: 'Flat Transfer Fees', amount: '25000.00', remark: 'Flat No 804' },
      { source: 'Tata Play', amount: '45435.00', remark: 'Electricity' },
      { source: 'Clubhouse Booking', amount: '1000.00', remark: '801' }
    ],
    expenses: [
      { chequeNo: '', vendor: '3S Security Services', amount: '48534.00', purpose: 'Security Charges' },
      { chequeNo: '', vendor: 'Shubham Enterprises', amount: '41145.00', purpose: 'Housekeeping Charges' },
      { chequeNo: '', vendor: 'MSEDCL', amount: '38480.00', purpose: 'A Building Electricity' },
      { chequeNo: '', vendor: 'C Building', amount: '18270.00', purpose: 'Common Electricity Bill share' },
      { chequeNo: '', vendor: 'Diwali Bonus', amount: '18250.00', purpose: 'Solar Tube Repairing' },
      { chequeNo: '', vendor: 'Sameer Electricals', amount: '11850.00', purpose: 'Basement Motor Repairing Common' },
      { chequeNo: '', vendor: 'Sidharam Lende', amount: '11700.00', purpose: 'Manager Salary' },
      { chequeNo: '', vendor: 'Self', amount: '7000.00', purpose: 'Petty Cash' },
      { chequeNo: '', vendor: 'Sai Swimming Pool', amount: '4519.00', purpose: 'Pool Maintenance' },
      { chequeNo: '', vendor: 'C Building', amount: '4156.00', purpose: 'Reimbursement Common Electricity Bill' },
      { chequeNo: '', vendor: 'Shivshankar Chauhan', amount: '3766.00', purpose: 'Common Salary' },
      { chequeNo: '', vendor: 'Naushad Ali', amount: '2697.00', purpose: 'Gardener Salary' }
    ]
  },
  'finance_2025-11': {
    month: '2025-11',
    income: [
      { source: 'Maintenance', amount: '274833.00', remark: '' },
      { source: 'Tata Play', amount: '3630.00', remark: 'TATA Play Rent' },
      { source: 'B Building', amount: '1534.00', remark: 'Clubhouse Bill Share' },
      { source: 'B Building', amount: '9164.00', remark: 'Pump Repairing Share' },
      { source: 'B Building', amount: '9242.00', remark: 'Park Plus Share' },
      { source: 'C Building', amount: '4582.00', remark: 'Pump Repairing Share' },
      { source: 'C Building', amount: '4621.00', remark: 'Park Plus Share' },
      { source: 'C Building', amount: '10701.00', remark: 'Common Light Bill Share' }
    ],
    expenses: [
      { chequeNo: '', vendor: 'Schindler India Pvt', amount: '89680.00', purpose: 'Lift AMC' },
      { chequeNo: '', vendor: 'MSEDCL', amount: '51500.00', purpose: 'Common Electricity Bill' },
      { chequeNo: '', vendor: 'Shubham Enterprises', amount: '41145.00', purpose: 'Housekeeping Charges' },
      { chequeNo: '', vendor: 'MSEDCL', amount: '39630.00', purpose: 'A Building Electricity' },
      { chequeNo: '', vendor: '3S Security Services', amount: '36447.00', purpose: 'Security Charges' },
      { chequeNo: '', vendor: 'Parviom Technologis', amount: '22238.00', purpose: 'Park Plus Rent' },
      { chequeNo: '', vendor: 'Manasi Elecricals', amount: '22050.00', purpose: 'Basement Pump Repairing Charges' },
      { chequeNo: '', vendor: 'Sanjay Gupta', amount: '16000.00', purpose: 'Realing Work Charges' },
      { chequeNo: '', vendor: 'Shivshankar Chauhan', amount: '13766.00', purpose: 'Common Salary' },
      { chequeNo: '', vendor: 'Sidharam Lende', amount: '11700.00', purpose: 'Manager Salary' },
      { chequeNo: '', vendor: 'C Building', amount: '9415.00', purpose: 'Common Electricty Bill share' },
      { chequeNo: '', vendor: 'Self', amount: '8000.00', purpose: 'Petty Cash' },
      { chequeNo: '', vendor: 'DP Waterproofing', amount: '7000.00', purpose: 'Common Bathroom Waterproofing work' },
      { chequeNo: '', vendor: 'Sai Swimming Pool', amount: '4519.00', purpose: 'Pool Maintenance' },
      { chequeNo: '', vendor: 'MSEDCL', amount: '3690.00', purpose: 'Clubhouse Electricity Bill' },
      { chequeNo: '', vendor: 'Naushad Ali', amount: '2697.00', purpose: 'Gardener Salary' },
      { chequeNo: '', vendor: 'C Building', amount: '1510.00', purpose: 'Clubhouse Electricity Bill Share' }
    ]
  },
  'finance_2025-12': {
    month: '2025-12',
    income: [
      { source: 'Maintenance', amount: '262256.00', remark: '' },
      { source: 'Tata Play', amount: '3630.00', remark: 'TATA Play Rent' },
      { source: 'B Building', amount: '21402.00', remark: 'Common Light Bill Share' },
      { source: 'Shifting Charges', amount: '4000.00', remark: 'Flat No 504' }
    ],
    expenses: [
      { chequeNo: '', vendor: '3S Security Services', amount: '48050.00', purpose: 'Security Charges' },
      { chequeNo: '', vendor: 'MSEDCL', amount: '39380.00', purpose: 'A Building Electricity' },
      { chequeNo: '', vendor: 'Shubham Enterprises', amount: '38998.00', purpose: 'Housekeeping Charges' },
      { chequeNo: '', vendor: 'Sanjay Gupta', amount: '33000.00', purpose: 'Tarrace Sheet Replacment' },
      { chequeNo: '', vendor: 'Balaji Chaudhary', amount: '30000.00', purpose: 'Accounting Charges 2023 to 2025' },
      { chequeNo: '', vendor: 'B Building', amount: '21607.00', purpose: 'Common Electricity Share' },
      { chequeNo: '', vendor: 'Bright IND PVT Ltd', amount: '17491.00', purpose: 'Bird Net charges' },
      { chequeNo: '', vendor: 'Sidharam Lende', amount: '11700.00', purpose: 'Manager Salary' },
      { chequeNo: '', vendor: 'Self', amount: '10000.00', purpose: 'Petty Cash' },
      { chequeNo: '', vendor: 'C Building', amount: '6257.00', purpose: 'DG Fuel Share' },
      { chequeNo: '', vendor: 'Sai Swimming Pool', amount: '4519.00', purpose: 'Pool Maintenance' },
      { chequeNo: '', vendor: 'Shivshankar Chauhan', amount: '3766.00', purpose: 'Common Salary' },
      { chequeNo: '', vendor: 'Naushad Ali', amount: '2832.00', purpose: 'Gardener Salary' },
      { chequeNo: '', vendor: 'Shahebaj Sefty Solution', amount: '1687.00', purpose: 'Fire Nosul Replacment' },
      { chequeNo: '', vendor: 'C Building', amount: '1453.00', purpose: 'DG Voltage Timer Replacment Share' },
      { chequeNo: '', vendor: 'B Building', amount: '1009.00', purpose: 'Clubhouse Electricity Share' }
    ]
  },
  'finance_2026-01': {
    month: '2026-01',
    income: [
      { source: 'Maintenance', amount: '267273.00', remark: '' },
      { source: 'Tata Play', amount: '3330.00', remark: 'TATA Play Rent' },
      { source: 'B Building', amount: '12327.00', remark: 'Boom Barrier Rent Share' },
      { source: 'B Building', amount: '6649.00', remark: 'Clubhouse Waterproofing Share' },
      { source: 'B Building', amount: '7510.00', remark: 'DG fuel Share' },
      { source: 'B Building', amount: '6234.00', remark: 'Kids Play Area Concrit slop work Share' },
      { source: 'C Building', amount: '3325.00', remark: 'Clubhouse Waterproofing Share' },
      { source: 'C Building', amount: '6164.00', remark: 'Boom Barrier Rent Share' },
      { source: 'C Building', amount: '3117.00', remark: 'Kids Play Area Concrit slop work Share' }
    ],
    expenses: [
      { chequeNo: '', vendor: 'S3 Sports Enterprises', amount: '91994.00', purpose: 'Kids Play Area EPDM Work share' },
      { chequeNo: '', vendor: 'Schindler India Pvt. Ltd.', amount: '89019.00', purpose: '6 months Lift AMC Charges' },
      { chequeNo: '', vendor: '3S Security Services', amount: '45505.00', purpose: 'Security Charges' },
      { chequeNo: '', vendor: 'Shubham Enterprises', amount: '41278.00', purpose: 'Housekeeping Charges' },
      { chequeNo: '', vendor: 'MSEDCL', amount: '39920.00', purpose: 'A Building Electricity' },
      { chequeNo: '', vendor: 'Parviom PVT Ltd.', amount: '29662.00', purpose: 'Boom Bairerar Rent' },
      { chequeNo: '', vendor: 'C Building', amount: '23893.00', purpose: 'Common Electricity Share' },
      { chequeNo: '', vendor: 'Balaji Chaudhary', amount: '20000.00', purpose: 'Pending Accounting Charges 2023 to 2025' },
      { chequeNo: '', vendor: 'Ghule Petrolium', amount: '18072.00', purpose: 'DG Fuel' },
      { chequeNo: '', vendor: 'C Building', amount: '16821.00', purpose: 'DG Servicing Share' },
      { chequeNo: '', vendor: 'DP Water Proofing', amount: '16000.00', purpose: 'Clubhouse Bathroom Waterproofing Charges' },
      { chequeNo: '', vendor: 'Tanaji Hande', amount: '15000.00', purpose: 'Kids Play Area Concrit slop work Charges' },
      { chequeNo: '', vendor: 'Sidharam Lende', amount: '11700.00', purpose: 'Manager Salary' },
      { chequeNo: '', vendor: 'Mehabub Shaikh', amount: '10500.00', purpose: 'Electricity Main Line Wire Repairing' },
      { chequeNo: '', vendor: 'Self', amount: '10000.00', purpose: 'Petty Cash' },
      { chequeNo: '', vendor: 'Real Aqua', amount: '5100.00', purpose: 'A Building Tank Cleaning Charges' },
      { chequeNo: '', vendor: 'Sai Swimming Pool', amount: '5007.00', purpose: 'Pool Maintenance' },
      { chequeNo: '', vendor: 'Shivshankar Chauhan', amount: '3766.00', purpose: 'Common Guard salary' },
      { chequeNo: '', vendor: 'Real Aqua', amount: '3289.00', purpose: 'Common Tank Cleaning Charges' },
      { chequeNo: '', vendor: 'Naushad Ali', amount: '2697.00', purpose: 'Gardener Salary' },
      { chequeNo: '', vendor: 'MSEDCL', amount: '1260.00', purpose: 'Clubhouse Electricity bill' },
      { chequeNo: '', vendor: 'C Building', amount: '444.00', purpose: 'Clubhouse Electricity Share' },
      { chequeNo: '', vendor: 'B building', amount: '5013.00', purpose: 'Kids Play Area PCC work Material Share' }
    ]
  },
  'finance_2026-02': {
    month: '2026-02',
    income: [
      { source: 'Maintenance', amount: '278996.00', remark: '' },
      { source: 'Tata Play', amount: '3630.00', remark: '' },
      { source: 'Transfer Fees', amount: '25000.00', remark: 'Shop No 07' }
    ],
    expenses: [
      { chequeNo: '', vendor: 'Rai Enterprises', amount: '47326.00', purpose: 'Security Charges' },
      { chequeNo: '', vendor: 'Shubham Enterprises', amount: '39860.00', purpose: 'Housekeeping Charges' },
      { chequeNo: '', vendor: 'Sidharam Lende', amount: '11700.00', purpose: 'Manager Salary' },
      { chequeNo: '', vendor: 'Self', amount: '10000.00', purpose: 'Petty Cash' },
      { chequeNo: '', vendor: 'Sai Swimming Pool', amount: '4519.00', purpose: 'Swimming Pool charges' },
      { chequeNo: '', vendor: 'Naushad Ali', amount: '2787.00', purpose: 'Gardener Salary' },
      { chequeNo: '', vendor: 'MSEDCL', amount: '39090.00', purpose: 'A Building Electricity Bill Feb 26' },
      { chequeNo: '', vendor: 'C Building', amount: '16214.00', purpose: 'Speed Breaker Insttalation Share' },
      { chequeNo: '', vendor: 'B Building', amount: '4934.00', purpose: 'Fire pump repairing and Panel conrtactor Charges' },
      { chequeNo: '', vendor: 'B Building', amount: '618.00', purpose: 'Clubhouse Electricity Bill Feb 26' },
      { chequeNo: '', vendor: 'B Building', amount: '21196.00', purpose: 'Common Electricity Bill' },
      { chequeNo: '', vendor: 'MSEDCL', amount: '35920.00', purpose: 'A Building Electricity Bill Mar 26' },
      { chequeNo: '', vendor: 'C Building', amount: '994.00', purpose: 'clubhouse Electricity Bill Mar 26' }
    ]
  },
  'finance_2026-03': {
    month: '2026-03',
    income: [
      { source: 'Maintenance', amount: '231611.00', remark: '' },
      { source: 'Tata Play', amount: '3630.00', remark: 'TATA Play Rent' },
      { source: 'B Building', amount: '25105.00', remark: 'Common Electricity Share' },
      { source: 'B Building', amount: '6649.00', remark: 'Kids play area painting share' },
      { source: 'B Building', amount: '524.00', remark: 'Clubhouse Electricity Share' },
      { source: 'C Building', amount: '2711.00', remark: 'Mansi Electrical share' },
      { source: 'C Building', amount: '262.00', remark: 'Clubhouse Electricity Share' },
      { source: 'C Building', amount: '3325.00', remark: 'Kids play area painting share' },
      { source: 'C Building', amount: '3755.00', remark: 'Ghule Petrolium share' },
      { source: 'C Building', amount: '12553.00', remark: 'Common Electricity Share' }
    ],
    expenses: [
      { chequeNo: '', vendor: 'Rai Enterprises', amount: '47326.00', purpose: 'Security Charges' },
      { chequeNo: '', vendor: 'Shubham Enterprises', amount: '40926.00', purpose: 'Housekeeping Charges' },
      { chequeNo: '', vendor: 'MSEDCL', amount: '60410.00', purpose: 'Common Electricity Bill' },
      { chequeNo: '', vendor: 'Sidharam Lende', amount: '11700.00', purpose: 'Manager Salary' },
      { chequeNo: '', vendor: 'Self', amount: '10000.00', purpose: 'Petty Cash' },
      { chequeNo: '', vendor: 'Sai Swimming Pool', amount: '4519.00', purpose: 'Swimming Pool charges' },
      { chequeNo: '', vendor: 'Naushad Ali', amount: '2697.00', purpose: 'Gardner Salary' },
      { chequeNo: '', vendor: 'Shree Swami Samarth', amount: '2486.00', purpose: 'Water Tanker Charges' },
      { chequeNo: '', vendor: 'Nagendra Kumar', amount: '16000.00', purpose: 'Kids Play Area Painting work' },
      { chequeNo: '', vendor: 'Hardik Mehta', amount: '18250.00', purpose: 'Builder Accounting and audit pending Payment' },
      { chequeNo: '', vendor: 'Mansi Electrical', amount: '13050.00', purpose: 'Fire pump repairing and Panel conrtactor Charges' },
      { chequeNo: '', vendor: 'Parmeshwar Pitale', amount: '3000.00', purpose: 'Plumbing Charges' }
    ]
  },
  'finance_2026-05': {
    month: '2026-05',
    income: [
      { source: 'Maintenance', amount: '242949.00', remark: '' },
      { source: 'Tata Play', amount: '5808.00', remark: 'Rent' },
      { source: 'Tata Play', amount: '116844.00', remark: 'Electricity Charges' },
      { source: 'Shifting', amount: '4000.00', remark: 'Flat No 105' },
      { source: 'B Building', amount: '4158.00', remark: 'Fire AMC Share' },
      { source: 'B Building', amount: '9558.00', remark: 'Clubhouse Penting Share' },
      { source: 'C building', amount: '6649.00', remark: 'Clubhouse Penting Share' },
      { source: 'B Building', amount: '2078.00', remark: 'Bird Net Share' }
    ],
    expenses: [
      { chequeNo: '', vendor: 'MSEDCL', amount: '40520.00', purpose: 'A Building Electricity Bill Mar 26' },
      { chequeNo: '', vendor: 'Shubham Enterprises', amount: '35866.00', purpose: 'Housekeeping Charges' },
      { chequeNo: '', vendor: 'B Building', amount: '23211.00', purpose: 'Common Electricity Bill' },
      { chequeNo: '', vendor: 'Sidhram Kegare', amount: '23000.00', purpose: 'Clubhouse Penting' },
      { chequeNo: '', vendor: 'NRG security', amount: '17604.00', purpose: 'Security Charges' },
      { chequeNo: '', vendor: 'Rai Enterprises', amount: '16690.00', purpose: 'Security Charges' },
      { chequeNo: '', vendor: 'Ankush fire Safety', amount: '13600.00', purpose: 'Fire Extinguisher Rifiling' },
      { chequeNo: '', vendor: 'Sidharam Lende', amount: '11700.00', purpose: 'Manager Salary' },
      { chequeNo: '', vendor: 'Self', amount: '10000.00', purpose: 'Petty Cash' },
      { chequeNo: '', vendor: 'C Building', amount: '6806.00', purpose: 'DG Diesel Share' },
      { chequeNo: '', vendor: 'MSEDCL', amount: '6080.00', purpose: 'Clubhouse Electricity bill' },
      { chequeNo: '', vendor: 'Shree Swami Samarth', amount: '6007.00', purpose: 'Water Tanker' },
      { chequeNo: '', vendor: 'Sai Swimming Pool', amount: '4519.00', purpose: 'Swimming Pool charges and Swimming Pool Greting' },
      { chequeNo: '', vendor: 'Sanjay Gupta', amount: '4000.00', purpose: 'Parking Sheet Insttalation' },
      { chequeNo: '', vendor: 'Naushad Ali', amount: '2787.00', purpose: 'Gardner Salary' },
      { chequeNo: '', vendor: 'B Building', amount: '1137.00', purpose: 'Clubhouse Electricity bill Share' }
    ]
  }
};
