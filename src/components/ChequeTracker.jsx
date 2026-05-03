import { useCallback, useEffect, useRef, useState } from 'react';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import * as XLSX from 'xlsx';
import { db, ensureFirebaseSession, isFirebaseConfigured } from '../firebase.js';

const FLAT_COUNTS = { A: 87, B: 96, C: 48 };
const TOTAL_FLATS = FLAT_COUNTS.A + FLAT_COUNTS.B + FLAT_COUNTS.C;

const n = (v) => parseFloat(v) || 0;
const fmt = (v) => Number(v).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function ChequeTracker() {
  const [entries, setEntries] = useState([
    { id: 1, srNo: 1, month: 'Feb 2026', date: '17 Feb', chequeNo: '428', vendor: 'Mansi Electrical', purpose: 'Pump Repairing and Panel Contractor Replacement', totalAmount: '13050', whoPaid: 'A Building', aShare: '4914.94', bShare: '5423.38', bReceiveDate: '05.03.26', cShare: '2711.69', cReceiveDate: '19.02.26', remarks: '' },
    { id: 2, srNo: 2, month: 'Feb 2026', date: '25 Jan', chequeNo: '427', vendor: 'MSEDCL', purpose: 'Club House Electricity BIll', totalAmount: '1260', whoPaid: 'A Building', aShare: '474.55', bShare: '523.64', bReceiveDate: '16.02.26', cShare: '261.82', cReceiveDate: '19.02.26', remarks: '' },
    { id: 3, srNo: 3, month: 'Feb 2026', date: '3 Jan', chequeNo: '405', vendor: 'Tanaji Hande', purpose: 'Kids Play Area Lebor', totalAmount: '15000', whoPaid: 'A Building', aShare: '5649.35', bShare: '6233.77', bReceiveDate: '06.01.26', cShare: '3116.88', cReceiveDate: '09.01.26', remarks: '' },
    { id: 4, srNo: 4, month: 'Feb 2026', date: '15 Feb', chequeNo: '435', vendor: 'MSEDCL', purpose: 'Common Electricity Share', totalAmount: '60410', whoPaid: 'A Building', aShare: '22751.82', bShare: '25105.45', bReceiveDate: '16.02.26', cShare: '12552.73', cReceiveDate: '19.02.26', remarks: '' },
    { id: 5, srNo: 5, month: 'Feb 2026', date: '20 Jan', chequeNo: '423', vendor: 'Ghule Petrolium', purpose: 'DG Fuel', totalAmount: '18072', whoPaid: 'A Building', aShare: '6806.34', bShare: '7510.44', bReceiveDate: '31.01.26', cShare: '3755.22', cReceiveDate: '19.02.26', remarks: '' },
    { id: 6, srNo: 6, month: 'Feb 2026', date: '10 Feb', chequeNo: '434', vendor: 'Nagendra Kumar', purpose: 'Kids Play Area Painting', totalAmount: '16000', whoPaid: 'A Building', aShare: '6025.97', bShare: '6649.35', bReceiveDate: '16.02.26', cShare: '3324.68', cReceiveDate: '19.02.26', remarks: '' },
    { id: 7, srNo: 7, month: 'Mar 2026', date: '30 Mar', chequeNo: '452', vendor: 'Aditya Chaurasiya', purpose: 'Kids Play area Gate', totalAmount: '24260', whoPaid: 'A Building', aShare: '9136.88', bShare: '10082.08', bReceiveDate: '17.04.26', cShare: '5041.04', cReceiveDate: '10.04.26', remarks: '' },
    { id: 8, srNo: 8, month: 'Apr 26', date: '08 Apr', chequeNo: '462', vendor: 'Parviom Techno Pvt Ltd', purpose: 'Park Plus', totalAmount: '23231', whoPaid: 'A Building', aShare: '8749.34', bShare: '9654.44', bReceiveDate: '17.04.26', cShare: '4827.22', cReceiveDate: '10.04.26', remarks: '' },
    { id: 9, srNo: 9, month: 'Apr 26', date: '22 Apr', chequeNo: '', vendor: 'Shahabaz Fire', purpose: 'AMC cheque', totalAmount: '10006', whoPaid: 'A Building', aShare: '3768.49', bShare: '4158.34', bReceiveDate: '', cShare: '2079.17', cReceiveDate: '28.04.26', remarks: '' },
    { id: 10, srNo: 10, month: 'Apr 26', date: '22 Apr', chequeNo: '470', vendor: 'Krishna Gutte', purpose: 'Clubhouse bird net', totalAmount: '5000', whoPaid: 'A Building', aShare: '1883.12', bShare: '2077.92', bReceiveDate: '', cShare: '1038.96', cReceiveDate: '28.04.26', remarks: '' }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState('idle');
  const [saveMsg, setSaveMsg] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMonth, setFilterMonth] = useState('All');

  const isLoadedRef = useRef(false);
  const autoSaveTimer = useRef(null);
  const recordId = 'cheque_tracker_master';

  // Load from Firebase
  useEffect(() => {
    let cancelled = false;
    isLoadedRef.current = false;
    async function load() {
      setIsLoading(true);
      if (!isFirebaseConfigured || !db) { setIsLoading(false); isLoadedRef.current = true; return; }
      try {
        await ensureFirebaseSession();
        const snap = await getDoc(doc(db, 'accounting', recordId));
        if (!cancelled) {
          const data = snap.data();
          if (snap.exists() && data?.entries && data.entries.length > 0) {
            setEntries(data.entries);
            setSaveMsg('Data loaded from Firebase ✓');
          } else {
            // Seed the database if it's missing or empty
            console.log("Seeding database with initial cheque data...");
            await setDoc(doc(db, 'accounting', recordId), {
              entries: entries, // the 10 rows from initialState
              updatedAt: serverTimestamp()
            });
            setSaveMsg('Initial records seeded ✓');
          }
        }
      } catch (err) { console.error('Load/Seed error:', err); }
      finally { if (!cancelled) { setIsLoading(false); isLoadedRef.current = true; } }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  const saveToFirebase = useCallback(async (currEntries) => {
    setSaveStatus('saving');
    if (!isFirebaseConfigured || !db) { setSaveStatus('saved'); return; }
    try {
      await ensureFirebaseSession();
      await setDoc(doc(db, 'accounting', recordId), {
        entries: currEntries,
        updatedAt: serverTimestamp()
      }, { merge: true });
      setSaveStatus('saved');
      setSaveMsg('Saved ✓');
    } catch (err) { setSaveStatus('error'); setSaveMsg('Failed'); }
  }, []);

  const triggerAutoSave = (newEntries) => {
    if (!isLoadedRef.current) return;
    clearTimeout(autoSaveTimer.current);
    setSaveStatus('pending');
    autoSaveTimer.current = setTimeout(() => saveToFirebase(newEntries), 1500);
  };

  const addRow = () => {
    const next = [{
      id: Date.now(),
      srNo: entries.length + 1,
      month: '',
      date: '',
      chequeNo: '',
      vendor: '',
      purpose: '',
      totalAmount: '',
      whoPaid: 'A Building',
      aShare: '',
      bShare: '',
      bReceiveDate: '',
      cShare: '',
      cReceiveDate: '',
      remarks: ''
    }, ...entries];
    setEntries(next);
    triggerAutoSave(next);
  };

  const updateRow = (idx, field, val) => {
    const next = [...entries];
    next[idx] = { ...next[idx], [field]: val };
    
    // Auto-calc shares if total amount changes
    if (field === 'totalAmount' && val) {
      const amount = n(val);
      next[idx].aShare = (amount * (FLAT_COUNTS.A / TOTAL_FLATS)).toFixed(2);
      next[idx].bShare = (amount * (FLAT_COUNTS.B / TOTAL_FLATS)).toFixed(2);
      next[idx].cShare = (amount * (FLAT_COUNTS.C / TOTAL_FLATS)).toFixed(2);
    }
    
    setEntries(next);
    triggerAutoSave(next);
  };

  const removeRow = (idx) => {
    const next = entries.filter((_, i) => i !== idx);
    setEntries(next);
    triggerAutoSave(next);
  };

  const handleDownloadExcel = () => {
    const ws = XLSX.utils.json_to_sheet(entries.map(e => ({
      'Sr No': e.srNo,
      'Month': e.month,
      'Cheque Date': e.date,
      'Cheque No': e.chequeNo,
      'Vendor': e.vendor,
      'Purpose/Remarks': e.purpose,
      'Total Amount': n(e.totalAmount),
      'Who Paid': e.whoPaid,
      'A Share': n(e.aShare),
      'B Share': n(e.bShare),
      'B Receive Date': e.bReceiveDate,
      'C Share': n(e.cShare),
      'C Receive Date': e.cReceiveDate,
      'Final Remarks': e.remarks
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Cheques');
    XLSX.writeFile(wb, 'Cheque_Tracker.xlsx');
  };

  const handleManualSave = () => {
    clearTimeout(autoSaveTimer.current);
    saveToFirebase(entries);
  };

  const handleRestoreDefault = async () => {
    if (!window.confirm("Restore the 10 default cheque records? This will overwrite current entries.")) return;
    const defaults = [
      { id: 1, srNo: 1, month: 'Feb 2026', date: '17 Feb', chequeNo: '428', vendor: 'Mansi Electrical', purpose: 'Pump Repairing and Panel Contractor Replacement', totalAmount: '13050', whoPaid: 'A Building', aShare: '4914.94', bShare: '5423.38', bReceiveDate: '05.03.26', cShare: '2711.69', cReceiveDate: '19.02.26', remarks: '' },
      { id: 2, srNo: 2, month: 'Feb 2026', date: '25 Jan', chequeNo: '427', vendor: 'MSEDCL', purpose: 'Club House Electricity BIll', totalAmount: '1260', whoPaid: 'A Building', aShare: '474.55', bShare: '523.64', bReceiveDate: '16.02.26', cShare: '261.82', cReceiveDate: '19.02.26', remarks: '' },
      { id: 3, srNo: 3, month: 'Feb 2026', date: '3 Jan', chequeNo: '405', vendor: 'Tanaji Hande', purpose: 'Kids Play Area Lebor', totalAmount: '15000', whoPaid: 'A Building', aShare: '5649.35', bShare: '6233.77', bReceiveDate: '06.01.26', cShare: '3116.88', cReceiveDate: '09.01.26', remarks: '' },
      { id: 4, srNo: 4, month: 'Feb 2026', date: '15 Feb', chequeNo: '435', vendor: 'MSEDCL', purpose: 'Common Electricity Share', totalAmount: '60410', whoPaid: 'A Building', aShare: '22751.82', bShare: '25105.45', bReceiveDate: '16.02.26', cShare: '12552.73', cReceiveDate: '19.02.26', remarks: '' },
      { id: 5, srNo: 5, month: 'Feb 2026', date: '20 Jan', chequeNo: '423', vendor: 'Ghule Petrolium', purpose: 'DG Fuel', totalAmount: '18072', whoPaid: 'A Building', aShare: '6806.34', bShare: '7510.44', bReceiveDate: '31.01.26', cShare: '3755.22', cReceiveDate: '19.02.26', remarks: '' },
      { id: 6, srNo: 6, month: 'Feb 2026', date: '10 Feb', chequeNo: '434', vendor: 'Nagendra Kumar', purpose: 'Kids Play Area Painting', totalAmount: '16000', whoPaid: 'A Building', aShare: '6025.97', bShare: '6649.35', bReceiveDate: '16.02.26', cShare: '3324.68', cReceiveDate: '19.02.26', remarks: '' },
      { id: 7, srNo: 7, month: 'Mar 2026', date: '30 Mar', chequeNo: '452', vendor: 'Aditya Chaurasiya', purpose: 'Kids Play area Gate', totalAmount: '24260', whoPaid: 'A Building', aShare: '9136.88', bShare: '10082.08', bReceiveDate: '17.04.26', cShare: '5041.04', cReceiveDate: '10.04.26', remarks: '' },
      { id: 8, srNo: 8, month: 'Apr 26', date: '08 Apr', chequeNo: '462', vendor: 'Parviom Techno Pvt Ltd', purpose: 'Park Plus', totalAmount: '23231', whoPaid: 'A Building', aShare: '8749.34', bShare: '9654.44', bReceiveDate: '17.04.26', cShare: '4827.22', cReceiveDate: '10.04.26', remarks: '' },
      { id: 9, srNo: 9, month: 'Apr 26', date: '22 Apr', chequeNo: '', vendor: 'Shahabaz Fire', purpose: 'AMC cheque', totalAmount: '10006', whoPaid: 'A Building', aShare: '3768.49', bShare: '4158.34', bReceiveDate: '', cShare: '2079.17', cReceiveDate: '28.04.26', remarks: '' },
      { id: 10, srNo: 10, month: 'Apr 26', date: '22 Apr', chequeNo: '470', vendor: 'Krishna Gutte', purpose: 'Clubhouse bird net', totalAmount: '5000', whoPaid: 'A Building', aShare: '1883.12', bShare: '2077.92', bReceiveDate: '', cShare: '1038.96', cReceiveDate: '28.04.26', remarks: '' }
    ];
    setEntries(defaults);
    await saveToFirebase(defaults);
  };

  // Logic: Filter and Search
  const filteredEntries = entries.filter(e => {
    const matchesSearch = !searchTerm || 
      e.vendor.toLowerCase().includes(searchTerm.toLowerCase()) || 
      e.purpose.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesMonth = filterMonth === 'All' || e.month === filterMonth;
    return matchesSearch && matchesMonth;
  });

  const months = ['All', ...new Set(entries.map(e => e.month).filter(Boolean))];

  // Logic: Summary calculations
  const stats = entries.reduce((acc, e) => {
    const total = n(e.totalAmount);
    acc.totalPaidByA += total;
    acc.totalDueFromB += n(e.bShare);
    acc.totalDueFromC += n(e.cShare);
    if (e.bReceiveDate) acc.totalRecvFromB += n(e.bShare);
    if (e.cReceiveDate) acc.totalRecvFromC += n(e.cShare);
    return acc;
  }, { totalPaidByA: 0, totalDueFromB: 0, totalDueFromC: 0, totalRecvFromB: 0, totalRecvFromC: 0 });

  const pendingB = stats.totalDueFromB - stats.totalRecvFromB;
  const pendingC = stats.totalDueFromC - stats.totalRecvFromC;

  const badge = { idle: '#6b7280', pending: '#f59e0b', saving: '#3b82f6', saved: '#10b981', error: '#ef4444' }[saveStatus] || '#6b7280';

  return (
    <div className="accounting-shell">
      
      {/* Summary Cards */}
      <div className="attendance-summary-grid">
        <div className="accounting-summary-card" style={{ borderLeft: '4px solid #3b82f6' }}>
          <p className="eyebrow" style={{ color: '#3b82f6' }}>Total Outflow (Building A)</p>
          <h3 style={{ margin: '4px 0 0' }}>₹{fmt(stats.totalPaidByA)}</h3>
          <span style={{ fontSize: '0.75rem', opacity: 0.6 }}>Total payments made for common services</span>
        </div>
        <div className="accounting-summary-card" style={{ borderLeft: '4px solid #10b981' }}>
          <p className="eyebrow" style={{ color: '#10b981' }}>Recovery Status (B)</p>
          <h3 style={{ margin: '4px 0 0' }}>₹{fmt(stats.totalRecvFromB)} / ₹{fmt(stats.totalDueFromB)}</h3>
          <div style={{ marginTop: 8 }}>
            <span className="header-badge" style={{ padding: '2px 8px', fontSize: '0.7rem', background: pendingB > 0 ? '#fff7ed' : '#ecfdf5', color: pendingB > 0 ? '#c2410c' : '#047857' }}>
              {pendingB > 0 ? `₹${fmt(pendingB)} Pending` : 'Fully Recovered'}
            </span>
          </div>
        </div>
        <div className="accounting-summary-card" style={{ borderLeft: '4px solid #f59e0b' }}>
          <p className="eyebrow" style={{ color: '#f59e0b' }}>Recovery Status (C)</p>
          <h3 style={{ margin: '4px 0 0' }}>₹{fmt(stats.totalRecvFromC)} / ₹{fmt(stats.totalDueFromC)}</h3>
          <div style={{ marginTop: 8 }}>
            <span className="header-badge" style={{ padding: '2px 8px', fontSize: '0.7rem', background: pendingC > 0 ? '#fff7ed' : '#ecfdf5', color: pendingC > 0 ? '#c2410c' : '#047857' }}>
              {pendingC > 0 ? `₹${fmt(pendingC)} Pending` : 'Fully Recovered'}
            </span>
          </div>
        </div>
      </div>

      <div className="table-card" style={{ padding: 0 }}>
        <div className="attendance-table-card__header" style={{ flexWrap: 'wrap', gap: '20px' }}>
          <div style={{ minWidth: '200px' }}>
            <p className="eyebrow">Society Accounting</p>
            <h3>Cheque Tracking Ledger</h3>
          </div>
          <div className="attendance-table-card__actions" style={{ flexWrap: 'wrap', width: 'auto', flex: 1, justifyContent: 'flex-end' }}>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', width: '100%', justifyContent: 'flex-end' }}>
              <div className="accounting-search-container">
                <span style={{ display: 'flex', alignItems: 'center', opacity: 0.4 }}>🔍</span>
                <input 
                  className="attendance-register-input"
                  style={{ border: 'none', padding: '8px', outline: 'none', textAlign: 'left' }}
                  placeholder="Search Vendor or Purpose..." 
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
              </div>
              <select 
                className="attendance-register-input" 
                style={{ width: 'auto', minWidth: '120px', height: '38px' }}
                value={filterMonth}
                onChange={e => setFilterMonth(e.target.value)}
              >
                {months.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div className="accounting-action-row">
              <button className="button-secondary" onClick={handleRestoreDefault} style={{ fontSize: '0.8rem', padding: '8px 10px', whiteSpace: 'nowrap', flex: '0 0 auto' }}>🔄 Restore</button>
              <button className="button-primary" onClick={addRow} style={{ padding: '8px 10px', whiteSpace: 'nowrap', flex: '0 0 auto' }}>+ Add Row</button>
              <button className="button-secondary" onClick={handleDownloadExcel} style={{ padding: '8px 10px', whiteSpace: 'nowrap', flex: '0 0 auto' }}>⬇ Excel</button>
            </div>
          </div>
        </div>

        <div className="attendance-table-scroll">
          <table className="attendance-table" style={{ minWidth: 1650 }}>
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                <th style={{ width: 60 }}>Sr.</th>
                <th style={{ width: 120 }}>Month</th>
                <th style={{ width: 120 }}>Cheque Date</th>
                <th style={{ width: 100 }}>Cheque No</th>
                <th style={{ width: 220 }}>Vendor Name</th>
                <th style={{ width: 300 }}>Remarks / Purpose</th>
                <th style={{ width: 140, textAlign: 'right' }}>Total (₹)</th>
                <th style={{ width: 120 }}>Who Paid</th>
                <th style={{ width: 110, textAlign: 'right', background: '#f0fdf4', color: '#047857' }}>A Share</th>
                <th style={{ width: 110, textAlign: 'right', background: '#eff6ff', color: '#1d4ed8' }}>B Share</th>
                <th style={{ width: 140, background: '#eff6ff', color: '#1d4ed8' }}>Receive B</th>
                <th style={{ width: 110, textAlign: 'right', background: '#fff7ed', color: '#c2410c' }}>C Share</th>
                <th style={{ width: 140, background: '#fff7ed', color: '#c2410c' }}>Receive C</th>
                <th>Final Remarks</th>
                <th style={{ width: 50 }}></th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={15} style={{ textAlign: 'center', padding: 60 }}>
                  <div style={{ opacity: 0.5 }}>Loading Accounting Records...</div>
                </td></tr>
              ) : filteredEntries.map((e, i) => (
                <tr key={e.id} className={(!e.bReceiveDate || !e.cReceiveDate) ? 'row-pending' : ''}>
                  <td><input className="attendance-register-input" value={e.srNo} onChange={v => updateRow(i, 'srNo', v.target.value)} /></td>
                  <td><input className="attendance-register-input" value={e.month} onChange={v => updateRow(i, 'month', v.target.value)} /></td>
                  <td><input className="attendance-register-input" value={e.date} onChange={v => updateRow(i, 'date', v.target.value)} /></td>
                  <td><input className="attendance-register-input" value={e.chequeNo} onChange={v => updateRow(i, 'chequeNo', v.target.value)} /></td>
                  <td><input className="attendance-register-input" style={{ fontWeight: 600 }} value={e.vendor} onChange={v => updateRow(i, 'vendor', v.target.value)} /></td>
                  <td><input className="attendance-register-input" value={e.purpose} onChange={v => updateRow(i, 'purpose', v.target.value)} /></td>
                  <td><input className="attendance-register-input" style={{ textAlign: 'right', fontWeight: 800, color: 'var(--ink)' }} value={e.totalAmount} onChange={v => updateRow(i, 'totalAmount', v.target.value)} /></td>
                  <td>
                    <select className="attendance-register-input" value={e.whoPaid} onChange={v => updateRow(i, 'whoPaid', v.target.value)}>
                      <option>A Building</option>
                      <option>B Building</option>
                      <option>C Building</option>
                    </select>
                  </td>
                  <td style={{ background: '#f0fdf4' }}><input className="attendance-register-input" style={{ textAlign: 'right' }} value={e.aShare} onChange={v => updateRow(i, 'aShare', v.target.value)} /></td>
                  <td style={{ background: '#eff6ff' }}><input className="attendance-register-input" style={{ textAlign: 'right', fontWeight: e.bReceiveDate ? 400 : 700 }} value={e.bShare} onChange={v => updateRow(i, 'bShare', v.target.value)} /></td>
                  <td style={{ background: '#eff6ff' }}>
                    <input 
                      className={`attendance-register-input ${e.bReceiveDate ? 'input-status-received' : 'input-status-pending'}`}
                      value={e.bReceiveDate} 
                      onChange={v => updateRow(i, 'bReceiveDate', v.target.value)} 
                      placeholder="Pending" 
                    />
                  </td>
                  <td style={{ background: '#fff7ed' }}><input className="attendance-register-input" style={{ textAlign: 'right', fontWeight: e.cReceiveDate ? 400 : 700 }} value={e.cShare} onChange={v => updateRow(i, 'cShare', v.target.value)} /></td>
                  <td style={{ background: '#fff7ed' }}>
                    <input 
                      className={`attendance-register-input ${e.cReceiveDate ? 'input-status-received' : 'input-status-pending'}`}
                      value={e.cReceiveDate} 
                      onChange={v => updateRow(i, 'cReceiveDate', v.target.value)} 
                      placeholder="Pending" 
                    />
                  </td>
                  <td><input className="attendance-register-input" value={e.remarks} onChange={v => updateRow(i, 'remarks', v.target.value)} /></td>
                  <td><button className="button-icon" onClick={() => removeRow(i)} style={{ opacity: 0.3 }}>✕</button></td>
                </tr>
              ))}
            </tbody>
            <tfoot className="accounting-table-footer">
              <tr>
                <td colSpan={6} style={{ textAlign: 'right' }}>GRAND TOTALS:</td>
                <td style={{ textAlign: 'right' }}>₹{fmt(stats.totalPaidByA)}</td>
                <td></td>
                <td style={{ textAlign: 'right' }}>₹{fmt(stats.totalPaidByA * 0.3766)}</td>
                <td style={{ textAlign: 'right' }}>₹{fmt(stats.totalDueFromB)}</td>
                <td style={{ textAlign: 'center', color: pendingB > 0 ? '#dc2626' : '#166534' }}>{pendingB > 0 ? `₹${fmt(pendingB)} Bal` : 'Clear'}</td>
                <td style={{ textAlign: 'right' }}>₹{fmt(stats.totalDueFromC)}</td>
                <td style={{ textAlign: 'center', color: pendingC > 0 ? '#dc2626' : '#166534' }}>{pendingC > 0 ? `₹${fmt(pendingC)} Bal` : 'Clear'}</td>
                <td colSpan={2}></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#64748b', fontSize: '0.85rem', padding: '0 8px' }}>
         <div>Showing {filteredEntries.length} of {entries.length} records</div>
         <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><span style={{ width: '12px', height: '12px', background: '#fee2e2', borderRadius: '3px' }}></span> Pending Payment</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><span style={{ width: '12px', height: '12px', background: '#dcfce7', borderRadius: '3px' }}></span> Payment Received</span>
            <div style={{ color: badge, fontWeight: 700 }}>● {saveMsg || 'All changes saved'}</div>
         </div>
      </div>

    </div>
  );
}
