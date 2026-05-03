import { useCallback, useEffect, useRef, useState } from 'react';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import * as XLSX from 'xlsx';
import { db, ensureFirebaseSession, isFirebaseConfigured } from '../firebase.js';

const FINANCIAL_YEAR_MONTHS = Array.from({ length: 12 }, (_, i) => {
  const d = new Date(2026, 3 + i, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
});

function getCurrentMonth() {
  const d = new Date();
  const v = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  return FINANCIAL_YEAR_MONTHS.includes(v) ? v : FINANCIAL_YEAR_MONTHS[0];
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

export default function FinanceTracker() {
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth);
  const [income, setIncome] = useState([{ source: '', amount: '', remark: '' }]);
  const [expenses, setExpenses] = useState([{ vendor: '', amount: '', purpose: '' }]);
  const [isLoading, setIsLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState('idle');
  const [saveMsg, setSaveMsg] = useState('');

  const isLoadedRef = useRef(false);
  const autoSaveTimer = useRef(null);
  const recordId = `finance_${selectedMonth}`;

  // Load from Firebase
  useEffect(() => {
    let cancelled = false;
    isLoadedRef.current = false;
    setSaveStatus('idle');
    setSaveMsg('');

    async function load() {
      setIsLoading(true);
      if (!isFirebaseConfigured || !db) {
        setIsLoading(false);
        isLoadedRef.current = true;
        return;
      }

      try {
        await ensureFirebaseSession();
        const snap = await getDoc(doc(db, 'financeMonthly', recordId));
        if (!cancelled) {
          if (snap.exists()) {
            const data = snap.data();
            setIncome(data.income || [{ source: '', amount: '', remark: '' }]);
            setExpenses(data.expenses || [{ vendor: '', amount: '', purpose: '' }]);
            setSaveMsg(`Loaded from Firebase — ${formatLongMonth(selectedMonth)}`);
          } else {
            setIncome([{ source: '', amount: '', remark: '' }]);
            setExpenses([{ vendor: '', amount: '', purpose: '' }]);
            setSaveMsg(`New tracker — ${formatLongMonth(selectedMonth)}`);
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

  const saveToFirebase = useCallback(async (currIncome, currExpenses, currRecordId, month) => {
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
    if (!isLoadedRef.current) return;
    clearTimeout(autoSaveTimer.current);
    setSaveStatus('pending');
    setSaveMsg('Unsaved changes…');
    autoSaveTimer.current = setTimeout(() => {
      saveToFirebase(newIncome, newExpenses, recordId, selectedMonth);
    }, 1500);
  };

  const addIncomeRow = () => {
    const next = [...income, { source: '', amount: '', remark: '' }];
    setIncome(next);
    triggerAutoSave(next, expenses);
  };

  const addExpenseRow = () => {
    const next = [...expenses, { vendor: '', amount: '', purpose: '' }];
    setExpenses(next);
    triggerAutoSave(income, next);
  };

  const updateIncome = (idx, field, val) => {
    const next = [...income];
    next[idx] = { ...next[idx], [field]: val };
    setIncome(next);
    triggerAutoSave(next, expenses);
  };

  const updateExpense = (idx, field, val) => {
    const next = [...expenses];
    next[idx] = { ...next[idx], [field]: val };
    setExpenses(next);
    triggerAutoSave(income, next);
  };

  const removeIncome = (idx) => {
    const next = income.filter((_, i) => i !== idx);
    if (next.length === 0) next.push({ source: '', amount: '', remark: '' });
    setIncome(next);
    triggerAutoSave(next, expenses);
  };

  const removeExpense = (idx) => {
    const next = expenses.filter((_, i) => i !== idx);
    if (next.length === 0) next.push({ vendor: '', amount: '', purpose: '' });
    setExpenses(next);
    triggerAutoSave(income, next);
  };

  const totalIncome = income.reduce((s, r) => s + n(r.amount), 0);
  const totalExpense = expenses.reduce((s, r) => s + n(r.amount), 0);
  const balance = totalIncome - totalExpense;

  const badge = {
    idle: { color: '#6b7280', icon: '●' },
    pending: { color: '#f59e0b', icon: '⏳' },
    saving: { color: '#3b82f6', icon: '↑' },
    saved: { color: '#10b981', icon: '✓' },
    error: { color: '#ef4444', icon: '✗' },
  }[saveStatus];

  const handleDownloadExcel = () => {
    const incomeRows = income.map(r => ({ Category: 'Income', Detail: r.source, Amount: n(r.amount), Remark: r.remark }));
    const expenseRows = expenses.map(r => ({ Category: 'Expense', Detail: r.vendor, Amount: n(r.amount), Remark: r.purpose }));
    
    const allRows = [
      ...incomeRows,
      { Category: 'TOTAL INCOME', Detail: '', Amount: totalIncome, Remark: '' },
      ...expenseRows,
      { Category: 'TOTAL EXPENSES', Detail: '', Amount: totalExpense, Remark: '' },
      { Category: 'CLOSING BALANCE', Detail: '', Amount: balance, Remark: '' }
    ];

    const ws = XLSX.utils.json_to_sheet(allRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Finance Tracker');
    XLSX.writeFile(wb, `Finance_Tracker_${selectedMonth}.xlsx`);
  };

  const handleManualSave = () => {
    clearTimeout(autoSaveTimer.current);
    saveToFirebase(income, expenses, recordId, selectedMonth);
  };

  return (
    <div className="finance-tracker" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Header & Tabs */}
      <div className="table-card" style={{ padding: 0 }}>
        <div className="attendance-month-tabs" role="tablist">
          {FINANCIAL_YEAR_MONTHS.map(mv => (
            <button
              key={mv}
              className={`attendance-month-tab ${selectedMonth === mv ? 'attendance-month-tab--active' : ''}`}
              onClick={() => setSelectedMonth(mv)}
            >
              {formatMonthLabel(mv)}
            </button>
          ))}
        </div>
        
        <div className="attendance-table-card__header">
          <div>
            <p className="eyebrow">Monthly Cashflow Tracker</p>
            <h3>Income & Expenses — {formatLongMonth(selectedMonth)}</h3>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: badge.color, fontWeight: 500, fontSize: '0.9rem' }}>
               <span>{badge.icon}</span>
               <span>{isLoading ? 'Loading...' : saveMsg || 'Ready'}</span>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button className="button-primary" onClick={handleManualSave} disabled={isLoading || saveStatus === 'saving'} style={{ padding: '8px 16px' }}>
                💾 Save Tracker
              </button>
              <button className="button-secondary" onClick={handleDownloadExcel} style={{ padding: '8px 16px' }}>
                ⬇ Export Excel
              </button>
            </div>
          </div>
        </div>
      </div>

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
            <h4 style={{ margin: 0, color: '#059669' }}>📥 Income Details</h4>
            <button className="button-secondary" onClick={addIncomeRow} style={{ padding: '4px 12px', fontSize: '0.85rem' }}>+ Add Row</button>
          </div>
          <div className="attendance-table-scroll" style={{ padding: 0 }}>
            <table className="attendance-table attendance-table--bill" style={{ minWidth: '100%' }}>
              <thead>
                <tr style={{ background: '#ecfdf5' }}>
                  <th style={{ width: '40%', color: '#059669' }}>Amount Received</th>
                  <th style={{ width: '25%', textAlign: 'right', color: '#059669' }}>Amount (₹)</th>
                  <th style={{ width: '35%', color: '#059669' }}>Remark</th>
                  <th style={{ width: '40px' }}></th>
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
                      />
                    </td>
                    <td>
                      <input 
                        className="attendance-register-input" 
                        style={{ textAlign: 'right' }}
                        value={row.amount} 
                        onChange={e => updateIncome(i, 'amount', e.target.value)}
                        placeholder="0.00"
                      />
                    </td>
                    <td>
                      <input 
                        className="attendance-register-input" 
                        value={row.remark} 
                        onChange={e => updateIncome(i, 'remark', e.target.value)}
                        placeholder="Remark"
                      />
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <button onClick={() => removeIncome(i)} style={{ border: 'none', background: 'none', cursor: 'pointer', opacity: 0.4 }}>✕</button>
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
            <h4 style={{ margin: 0, color: '#dc2626' }}>📤 Expense Details</h4>
            <button className="button-secondary" onClick={addExpenseRow} style={{ padding: '4px 12px', fontSize: '0.85rem' }}>+ Add Row</button>
          </div>
          <div className="attendance-table-scroll" style={{ padding: 0 }}>
            <table className="attendance-table attendance-table--bill" style={{ minWidth: '100%' }}>
              <thead>
                <tr style={{ background: '#fff1f2' }}>
                  <th style={{ width: '40%', color: '#e11d48' }}>Vendor Name</th>
                  <th style={{ width: '25%', textAlign: 'right', color: '#e11d48' }}>Amount (₹)</th>
                  <th style={{ width: '35%', color: '#e11d48' }}>Purpose</th>
                  <th style={{ width: '40px' }}></th>
                </tr>
              </thead>
              <tbody>
                {expenses.map((row, i) => (
                  <tr key={i}>
                    <td>
                      <input 
                        className="attendance-register-input" 
                        value={row.vendor} 
                        onChange={e => updateExpense(i, 'vendor', e.target.value)}
                        placeholder="e.g. MSEDCL"
                      />
                    </td>
                    <td>
                      <input 
                        className="attendance-register-input" 
                        style={{ textAlign: 'right' }}
                        value={row.amount} 
                        onChange={e => updateExpense(i, 'amount', e.target.value)}
                        placeholder="0.00"
                      />
                    </td>
                    <td>
                      <input 
                        className="attendance-register-input" 
                        value={row.purpose} 
                        onChange={e => updateExpense(i, 'purpose', e.target.value)}
                        placeholder="Purpose"
                      />
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <button onClick={() => removeExpense(i)} style={{ border: 'none', background: 'none', cursor: 'pointer', opacity: 0.4 }}>✕</button>
                    </td>
                  </tr>
                ))}
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
