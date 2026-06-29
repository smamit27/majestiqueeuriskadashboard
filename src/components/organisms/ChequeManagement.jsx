import { useCallback, useEffect, useRef, useState } from 'react';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import * as XLSX from 'xlsx';
import { db, ensureFirebaseSession, isFirebaseConfigured } from '../../firebase.js';

const FINANCIAL_YEAR_MONTHS = Array.from({ length: 12 }, (_, i) => {
  const d = new Date(2026, 3 + i, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
});

const FLATS = {
  A: 87,
  B: 96,
  C: 48,
  Total: 231
};

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

export default function ChequeManagement({ isAdmin = false }) {
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth);
  const [subTab, setSubTab] = useState('buildingA'); // 'buildingA' or 'common'
  const [searchText, setSearchText] = useState('');
  
  const [chequesA, setChequesA] = useState([{ id: 1, srNo: 1, date: '', chequeNo: '', vendor: '', purpose: '', amount: '', whoPaid: 'A Building' }]);
  const [chequesCommon, setChequesCommon] = useState([{ id: 1, srNo: 1, date: '', chequeNo: '', vendor: '', purpose: '', amount: '', whoPaid: 'A Building' }]);
  
  const [isLoading, setIsLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState('idle');
  const [saveMsg, setSaveMsg] = useState('');

  const isLoadedRef = useRef(false);
  const autoSaveTimer = useRef(null);
  
  const recordId = `cheques_${selectedMonth}`;
  const commonRecordId = `cheques_common_${selectedMonth}`;

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
        
        // Load Building A Cheques
        const snapA = await getDoc(doc(db, 'chequesMonthly', recordId));
        // Load Common Cheques
        const snapCommon = await getDoc(doc(db, 'chequesMonthly', commonRecordId));

        if (!cancelled) {
          if (snapA.exists()) {
            setChequesA(snapA.data().cheques || []);
          } else {
            setChequesA([{ id: Date.now(), srNo: 1, date: '', chequeNo: '', vendor: '', purpose: '', amount: '', whoPaid: 'A Building' }]);
          }

          if (snapCommon.exists()) {
            let commonData = snapCommon.data().cheques || [];
            // Seed requested entries for June 2026 if not already present
            if (selectedMonth === '2026-06') {
              if (!commonData.some(c => c.vendor === 'MESDCL' && String(c.amount) === '57420')) {
                commonData.push({ id: Date.now() + 101, srNo: commonData.length + 1, date: '2026-06-15', chequeNo: '496', vendor: 'MESDCL', purpose: 'Electricity', amount: '57420', whoPaid: 'A Building' });
              }
              if (!commonData.some(c => c.vendor === 'Tanaji Hunde' && String(c.amount) === '11500')) {
                commonData.push({ id: Date.now() + 102, srNo: commonData.length + 1, date: '2026-06-12', chequeNo: '499', vendor: 'Tanaji Hunde', purpose: 'Gazibo - Received from B Building and C as well', amount: '11500', whoPaid: 'A Building' });
              }
            }
            setChequesCommon(commonData);
          } else {
            let initialCommon = [];
            if (selectedMonth === '2026-06') {
              initialCommon = [
                { id: Date.now() + 101, srNo: 1, date: '2026-06-15', chequeNo: '496', vendor: 'MESDCL', purpose: 'Electricity', amount: '57420', whoPaid: 'A Building' },
                { id: Date.now() + 102, srNo: 2, date: '2026-06-12', chequeNo: '499', vendor: 'Tanaji Hunde', purpose: 'Gazibo - Received from B Building and C as well', amount: '11500', whoPaid: 'A Building' }
              ];
            } else {
              initialCommon = [{ id: Date.now() + 100, srNo: 1, date: '', chequeNo: '', vendor: '', purpose: '', amount: '', whoPaid: 'A Building' }];
            }
            setChequesCommon(initialCommon);
          }
          
          setSaveMsg(`Synced — ${formatMonthLabel(selectedMonth)}`);
        }
      } catch (err) {
        console.error('Cheque load error:', err);
      } finally {
        if (!cancelled) {
          setIsLoading(false);
          isLoadedRef.current = true;
        }
      }
    }
    load();
    return () => { cancelled = true; };
  }, [recordId, commonRecordId, selectedMonth]);

  const saveToFirebase = useCallback(async (data, targetId, month) => {
    setSaveStatus('saving');
    if (!isFirebaseConfigured || !db) {
      setSaveStatus('saved');
      return;
    }
    try {
      await ensureFirebaseSession();
      await setDoc(doc(db, 'chequesMonthly', targetId), {
        month,
        cheques: data,
        updatedAt: serverTimestamp()
      }, { merge: true });
      setSaveStatus('saved');
      setSaveMsg('Saved ✓');
    } catch (err) {
      setSaveStatus('error');
      setSaveMsg('Failed');
    }
  }, []);

  const triggerAutoSave = (newData, isCommon = false) => {
    if (!isLoadedRef.current) return;
    clearTimeout(autoSaveTimer.current);
    setSaveStatus('pending');
    setSaveMsg('Unsaved changes...');
    autoSaveTimer.current = setTimeout(() => {
      saveToFirebase(newData, isCommon ? commonRecordId : recordId, selectedMonth);
    }, 1500);
  };

  const [formData, setFormData] = useState({
    date: '',
    chequeNo: '',
    vendor: '',
    purpose: '',
    amount: '',
    whoPaid: 'A Building'
  });

  const handleFormChange = (field, val) => {
    setFormData(prev => ({ ...prev, [field]: val }));
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    if (!isAdmin) {
      alert('You do not have permission to perform this action.');
      return;
    }
    if (!formData.vendor || !formData.amount || !formData.chequeNo) {
      alert('Please enter Cheque No, Vendor Name and Amount.');
      return;
    }

    const currentList = subTab === 'common' ? chequesCommon : chequesA;

    // Check uniqueness
    const isDuplicate = currentList.some(c => c.chequeNo === formData.chequeNo.trim());
    if (isDuplicate) {
      alert(`Cheque No "${formData.chequeNo}" already exists in this ledger.`);
      return;
    }

    const newCheque = {
      ...formData,
      srNo: currentList.length + 1,
      id: Date.now()
    };

    const next = [...currentList, newCheque];
    const final = next.filter(c => c.vendor || c.amount || c.chequeNo);
    const reindexed = final.map((c, i) => ({ ...c, srNo: i + 1 }));

    if (subTab === 'common') {
      setChequesCommon(reindexed);
      triggerAutoSave(reindexed, true);
    } else {
      setChequesA(reindexed);
      triggerAutoSave(reindexed, false);
    }
    
    // Reset form
    setFormData({
      date: '',
      chequeNo: '',
      vendor: '',
      purpose: '',
      amount: '',
      whoPaid: 'A Building'
    });
  };

  const updateRow = (idx, field, val) => {
    if (!isAdmin) return;
    const isCommon = subTab === 'common';
    const next = isCommon ? [...chequesCommon] : [...chequesA];
    next[idx] = { ...next[idx], [field]: val };
    
    if (isCommon) {
      setChequesCommon(next);
      triggerAutoSave(next, true);
    } else {
      setChequesA(next);
      triggerAutoSave(next, false);
    }
  };

  const removeRow = (idx) => {
    if (!isAdmin) return;
    const isCommon = subTab === 'common';
    const currentList = isCommon ? chequesCommon : chequesA;
    const next = currentList.filter((_, i) => i !== idx).map((c, i) => ({ ...c, srNo: i + 1 }));
    
    if (isCommon) {
      setChequesCommon(next);
      triggerAutoSave(next, true);
    } else {
      setChequesA(next);
      triggerAutoSave(next, false);
    }
  };

  const activeCheques = subTab === 'common' ? chequesCommon : chequesA;
  
  const filteredCheques = activeCheques
    .filter(c => {
      if (!searchText) return true;
      const s = searchText.toLowerCase();
      return (
        (c.chequeNo && String(c.chequeNo).toLowerCase().includes(s)) ||
        (c.date && String(c.date).toLowerCase().includes(s)) ||
        (c.vendor && String(c.vendor).toLowerCase().includes(s))
      );
    })
    .sort((a, b) => {
      // Primary sort: Cheque No ascending (lowest to highest)
      const numA = Number(String(a.chequeNo || '').replace(/\D/g, '')) || Infinity;
      const numB = Number(String(b.chequeNo || '').replace(/\D/g, '')) || Infinity;
      return numA - numB;
    });

  const totalAmount = filteredCheques.reduce((s, c) => s + n(c.amount), 0);

  // Missing Cheque Detection — only for Building A tab, June 2026 onwards
  const getMissingCheques = () => {
    if (subTab !== 'buildingA') return [];
    
    // Only check months from Jun 2026 onwards
    const [selYear, selMonthNum] = selectedMonth.split('-').map(Number);
    const cutoffYear = 2026, cutoffMonth = 6;
    if (selYear < cutoffYear || (selYear === cutoffYear && selMonthNum < cutoffMonth)) return [];

    // Get all numeric cheque numbers from A building cheques this month
    // Exclude cancelled cheques (amount = 0)
    const numbers = chequesA
      .filter(c => n(c.amount) !== 0) // Skip cancelled cheques
      .map(c => {
        const stripped = String(c.chequeNo || '').replace(/\D/g, '');
        return stripped ? Number(stripped) : null;
      })
      .filter(num => num !== null)
      .sort((a, b) => a - b);

    if (numbers.length <= 5) return []; // Only check if more than 5 active cheques

    // Find small gaps (1-3 missing) in the sequence
    const missing = [];
    for (let i = 0; i < numbers.length - 1; i++) {
      const diff = numbers[i + 1] - numbers[i];
      if (diff > 1 && diff <= 4) {
        for (let j = numbers[i] + 1; j < numbers[i + 1]; j++) {
          missing.push(j);
        }
      }
    }
    return missing;
  };

  const missingCheques = getMissingCheques();

  const badge = {
    idle: { color: '#6b7280', icon: '●' },
    pending: { color: '#f59e0b', icon: '⏳' },
    saving: { color: '#3b82f6', icon: '↑' },
    saved: { color: '#10b981', icon: '✓' },
    error: { color: '#ef4444', icon: '✗' },
  }[saveStatus];

  const handleDownloadExcel = () => {
    const rows = filteredCheques.map(c => {
      const base = {
        'Sr. No': c.srNo,
        'Month': formatLongMonth(selectedMonth),
        'Cheque Date': c.date,
        'Cheque No': c.chequeNo,
        'Vendor Name': c.vendor,
        'Remarks / Purpose': c.purpose,
        'Total (₹)': n(c.amount),
        'Who Paid': c.whoPaid
      };
      
      if (subTab === 'common') {
        const amt = n(c.amount);
        base['A Share (₹)'] = (amt * FLATS.A / FLATS.Total).toFixed(2);
        base['B Share (₹)'] = (amt * FLATS.B / FLATS.Total).toFixed(2);
        base['C Share (₹)'] = (amt * FLATS.C / FLATS.Total).toFixed(2);
      }
      return base;
    });
    
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, subTab === 'common' ? 'Common Work' : 'Building A');
    XLSX.writeFile(wb, `Cheques_${subTab}_${selectedMonth}.xlsx`);
  };

  return (
    <div className="cheque-management" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Tab Navigation */}
      <div className="table-card" style={{ padding: '8px', background: 'rgba(255,255,255,0.4)', backdropFilter: 'blur(10px)', border: '1px solid var(--line)', borderRadius: '16px' }}>
        <div style={{ display: 'flex', gap: '8px' }}>
           <button 
             onClick={() => setSubTab('buildingA')}
             className={`sub-tab-button ${subTab === 'buildingA' ? 'active' : ''}`}
             style={{
               flex: 1, padding: '12px', borderRadius: '10px', border: 'none', cursor: 'pointer',
               background: subTab === 'buildingA' ? '#1e3a8a' : 'transparent',
               color: subTab === 'buildingA' ? 'white' : 'var(--muted)',
               fontWeight: 600, transition: '0.2s'
             }}
           >
             🏢 A Building Related Work
           </button>
           <button 
             onClick={() => setSubTab('common')}
             className={`sub-tab-button ${subTab === 'common' ? 'active' : ''}`}
             style={{
               flex: 1, padding: '12px', borderRadius: '10px', border: 'none', cursor: 'pointer',
               background: subTab === 'common' ? '#1e3a8a' : 'transparent',
               color: subTab === 'common' ? 'white' : 'var(--muted)',
               fontWeight: 600, transition: '0.2s'
             }}
           >
             🤝 Cheque Issue for Common Work
           </button>
        </div>
      </div>

      {/* Month Tabs */}
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
            <p className="eyebrow">{subTab === 'common' ? 'Society Shared Expenses' : 'A Building Ledger'}</p>
            <h3>{subTab === 'common' ? 'Common Work Cheques' : 'Building A Cheques'} — {formatMonthLabel(selectedMonth)}</h3>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: badge.color, fontWeight: 500, fontSize: '0.9rem' }}>
             <span>{badge.icon}</span>
             <span>{isLoading ? 'Loading...' : saveMsg || 'Ready'}</span>
          </div>
        </div>
      </div>

      {/* Missing Cheque Alert Banner — Building A only, June 2026+ */}
      {missingCheques.length > 0 && (
        <div style={{ background: '#fef2f2', border: '1.5px solid #fca5a5', borderRadius: '12px', padding: '16px 20px', display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
          <span style={{ fontSize: '1.4rem', lineHeight: 1 }}>⚠️</span>
          <div>
            <p style={{ margin: '0 0 4px 0', fontWeight: 700, color: '#dc2626', fontSize: '0.95rem' }}>Missing Cheque Alert</p>
            <p style={{ margin: 0, color: '#991b1b', fontSize: '0.88rem' }}>
              In <strong>{formatLongMonth(selectedMonth)}</strong>, you missed to add cheque number(s): <strong>{missingCheques.join(', ')}</strong>. Please check.
            </p>
          </div>
        </div>
      )}

      {/* SEARCH ZONE */}
      <div className="section-card" style={{ padding: '16px 24px', background: '#f8fafc', border: '1px solid var(--line)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
          <div className="filter-field" style={{ flex: 1, minWidth: '280px', margin: 0 }}>
            <label className="eyebrow" style={{ display: 'block', marginBottom: '8px' }}>🔍 Search by Cheque Number or Date</label>
            <input 
              type="search" 
              placeholder="Search Cheque No, Date (YYYY-MM-DD), or Vendor..." 
              value={searchText} 
              onChange={e => setSearchText(e.target.value)}
              className="attendance-register-input"
              style={{ textAlign: 'left', height: '44px', fontSize: '1rem', background: 'white' }}
            />
          </div>
          <button className="button-secondary" onClick={handleDownloadExcel} style={{ padding: '10px 20px', height: '44px', marginTop: 'auto' }}>
            ⬇ Export to Excel
          </button>
        </div>
      </div>

      {/* ADD NEW CHEQUE FORM */}
      {isAdmin && (
      <div className="section-card" style={{ padding: '24px' }}>
        <h4 style={{ margin: '0 0 20px 0', color: 'var(--ink)' }}>
          ➕ Add {subTab === 'common' ? 'Common' : 'Building A'} Cheque Entry
        </h4>
        <form onSubmit={handleFormSubmit} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
          <div className="field-group">
            <label className="eyebrow" style={{ display: 'block', marginBottom: '8px' }}>Cheque Date <span style={{ color: '#ef4444' }}>*</span></label>
            <input className="attendance-register-input" style={{ textAlign: 'left' }} type="date" value={formData.date} onChange={e => handleFormChange('date', e.target.value)} required />
          </div>
          <div className="field-group">
            <label className="eyebrow" style={{ display: 'block', marginBottom: '8px' }}>Cheque No <span style={{ color: '#ef4444' }}>*</span></label>
            <input className="attendance-register-input" style={{ textAlign: 'left' }} placeholder="Cheque #" value={formData.chequeNo} onChange={e => handleFormChange('chequeNo', e.target.value)} required />
          </div>
          <div className="field-group">
            <label className="eyebrow" style={{ display: 'block', marginBottom: '8px' }}>Vendor Name <span style={{ color: '#ef4444' }}>*</span></label>
            <input className="attendance-register-input" style={{ textAlign: 'left' }} placeholder="Payee Name" value={formData.vendor} onChange={e => handleFormChange('vendor', e.target.value)} required />
          </div>
          <div className="field-group">
            <label className="eyebrow" style={{ display: 'block', marginBottom: '8px' }}>Total Amount (₹) <span style={{ color: '#ef4444' }}>*</span></label>
            <input className="attendance-register-input" style={{ textAlign: 'left' }} placeholder="0.00" value={formData.amount} onChange={e => handleFormChange('amount', e.target.value)} required />
          </div>
          <div className="field-group">
            <label className="eyebrow" style={{ display: 'block', marginBottom: '8px' }}>Who Paid <span style={{ color: '#ef4444' }}>*</span></label>
            <select className="attendance-register-input" style={{ textAlign: 'left' }} value={formData.whoPaid} onChange={e => handleFormChange('whoPaid', e.target.value)} required>
              <option value="">-- Select Payer --</option>
              <option>A Building</option>
              <option>B Building</option>
              <option>C Building</option>
              <option>Petty Cash</option>
            </select>
          </div>
          <div className="field-group" style={{ gridColumn: '1 / -1' }}>
            <label className="eyebrow" style={{ display: 'block', marginBottom: '8px' }}>Remarks / Purpose</label>
            <input className="attendance-register-input" style={{ textAlign: 'left' }} placeholder="Describe the payment purpose..." value={formData.purpose} onChange={e => handleFormChange('purpose', e.target.value)} />
          </div>
          <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
            <button type="submit" className="button-primary" style={{ padding: '8px 24px', width: 'auto' }}>Add to Ledger</button>
          </div>
        </form>
      </div>
      )}

      {/* Share Calculator (only for Common tab) */}
      {subTab === 'common' && totalAmount > 0 && (
        <div className="attendance-summary-grid" style={{ background: '#f0f9ff', padding: '20px', borderRadius: '16px', border: '1px solid #bae6fd' }}>
           <div style={{ gridColumn: '1 / -1', marginBottom: '10px' }}>
              <p className="eyebrow" style={{ color: '#0369a1' }}>Cost Sharing Calculation (Total {FLATS.Total} Flats)</p>
           </div>
           <div className="accounting-summary-card" style={{ background: 'white' }}>
              <p className="eyebrow">A Building Share (87)</p>
              <h3 style={{ color: '#0369a1' }}>₹{fmt(totalAmount * FLATS.A / FLATS.Total)}</h3>
           </div>
           <div className="accounting-summary-card" style={{ background: 'white' }}>
              <p className="eyebrow">B Building Share (96)</p>
              <h3 style={{ color: '#0369a1' }}>₹{fmt(totalAmount * FLATS.B / FLATS.Total)}</h3>
           </div>
           <div className="accounting-summary-card" style={{ background: 'white' }}>
              <p className="eyebrow">C Building Share (48)</p>
              <h3 style={{ color: '#0369a1' }}>₹{fmt(totalAmount * FLATS.C / FLATS.Total)}</h3>
           </div>
        </div>
      )}

      {/* Main Table */}
      <div className="table-card">
        <div className="attendance-table-scroll">
          <table className="attendance-table" style={{ minWidth: subTab === 'common' ? 1400 : 1100 }}>
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                <th style={{ width: 60 }}>Sr.</th>
                <th style={{ width: 140 }}>Cheque Date</th>
                <th style={{ width: 120 }}>Cheque No</th>
                <th style={{ width: 220 }}>Vendor Name</th>
                <th>Remarks / Purpose</th>
                <th style={{ width: 140, textAlign: 'right' }}>Total (₹)</th>
                {subTab === 'common' && (
                  <>
                    <th style={{ width: 130, textAlign: 'right', background: '#f0fdf4' }}>A Share (87)</th>
                    <th style={{ width: 130, textAlign: 'right', background: '#f0f9ff' }}>B Share (96)</th>
                    <th style={{ width: 130, textAlign: 'right', background: '#fff7ed' }}>C Share (48)</th>
                  </>
                )}
                <th style={{ width: 130 }}>Who Paid</th>
                <th style={{ width: 50 }}></th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={subTab === 'common' ? 12 : 9} style={{ textAlign: 'center', padding: 40, opacity: 0.5 }}>Loading records...</td></tr>
              ) : filteredCheques.length === 0 ? (
                <tr><td colSpan={subTab === 'common' ? 12 : 9} style={{ textAlign: 'center', padding: 40, opacity: 0.5 }}>
                  {searchText ? `No cheques found matching "${searchText}"` : 'No cheques recorded.'}
                </td></tr>
              ) : (
                filteredCheques.map((c, i) => {
                  const actualIdx = activeCheques.findIndex(orig => orig.id === c.id);
                  const isCancelled = n(c.amount) === 0;
                  return (
                    <tr key={c.id || i} style={isCancelled ? { background: '#f5f5f5', opacity: 0.65 } : {}}>
                      <td>{i + 1}</td>
                      <td><input className="attendance-register-input" type="date" value={c.date} onChange={e => updateRow(actualIdx, 'date', e.target.value)} readOnly={!isAdmin} style={isCancelled ? { textDecoration: 'line-through', color: '#9ca3af' } : {}} /></td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <input className="attendance-register-input" value={c.chequeNo} onChange={e => updateRow(actualIdx, 'chequeNo', e.target.value)} readOnly={!isAdmin} style={isCancelled ? { textDecoration: 'line-through', color: '#9ca3af' } : {}} />
                          {isCancelled && <span style={{ fontSize: '0.65rem', background: '#fee2e2', color: '#dc2626', fontWeight: 700, padding: '2px 5px', borderRadius: '4px', whiteSpace: 'nowrap' }}>CANCELLED</span>}
                        </div>
                      </td>
                      <td><input className="attendance-register-input" style={{ fontWeight: 600, ...(isCancelled ? { textDecoration: 'line-through', color: '#9ca3af' } : {}) }} value={c.vendor} onChange={e => updateRow(actualIdx, 'vendor', e.target.value)} readOnly={!isAdmin} /></td>
                      <td><input className="attendance-register-input" value={c.purpose} onChange={e => updateRow(actualIdx, 'purpose', e.target.value)} readOnly={!isAdmin} style={isCancelled ? { color: '#9ca3af' } : {}} /></td>
                      <td><input className="attendance-register-input" style={{ textAlign: 'right', fontWeight: 700, ...(isCancelled ? { textDecoration: 'line-through', color: '#dc2626' } : {}) }} value={c.amount} onChange={e => updateRow(actualIdx, 'amount', e.target.value)} readOnly={!isAdmin} /></td>
                      {subTab === 'common' && (
                        <>
                          <td style={{ textAlign: 'right', color: isCancelled ? '#9ca3af' : '#16a34a', fontWeight: 500 }}>{isCancelled ? '—' : `₹${fmt(n(c.amount) * FLATS.A / FLATS.Total)}`}</td>
                          <td style={{ textAlign: 'right', color: isCancelled ? '#9ca3af' : '#2563eb', fontWeight: 500 }}>{isCancelled ? '—' : `₹${fmt(n(c.amount) * FLATS.B / FLATS.Total)}`}</td>
                          <td style={{ textAlign: 'right', color: isCancelled ? '#9ca3af' : '#ea580c', fontWeight: 500 }}>{isCancelled ? '—' : `₹${fmt(n(c.amount) * FLATS.C / FLATS.Total)}`}</td>
                        </>
                      )}
                      <td>
                        <select className="attendance-register-input" value={c.whoPaid} onChange={e => updateRow(actualIdx, 'whoPaid', e.target.value)} disabled={!isAdmin}>
                          <option>A Building</option>
                          <option>B Building</option>
                          <option>C Building</option>
                          <option>Petty Cash</option>
                        </select>
                      </td>
                      <td>{isAdmin && <button className="button-icon" onClick={() => removeRow(actualIdx)} style={{ opacity: 0.3 }}>✕</button>}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
            <tfoot>
              <tr style={{ background: '#f8fafc', fontWeight: 700 }}>
                <td colSpan={5} style={{ textAlign: 'right' }}>GRAND TOTAL</td>
                <td style={{ textAlign: 'right', color: '#2563eb' }}>₹{fmt(totalAmount)}</td>
                {subTab === 'common' && (
                  <>
                    <td style={{ textAlign: 'right', color: '#16a34a' }}>₹{fmt(totalAmount * FLATS.A / FLATS.Total)}</td>
                    <td style={{ textAlign: 'right', color: '#2563eb' }}>₹{fmt(totalAmount * FLATS.B / FLATS.Total)}</td>
                    <td style={{ textAlign: 'right', color: '#ea580c' }}>₹{fmt(totalAmount * FLATS.C / FLATS.Total)}</td>
                  </>
                )}
                <td colSpan={2}></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
