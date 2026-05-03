import { useCallback, useEffect, useRef, useState } from 'react';
import { doc, getDoc, serverTimestamp, setDoc, deleteDoc } from 'firebase/firestore';
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

function n(v) { return parseFloat(v) || 0; }
function fmt(v) { return Number(v).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

/** Read monthly attendance totals per building column */
function sumAttendanceCol(entries, colKey) {
  return Object.values(entries || {}).reduce((s, row) => s + (parseFloat(row?.[colKey]) || 0), 0);
}

/** Detect which building had the most Chauhanji presence from attendance */
function detectChauhanFromAttendance(entries) {
  // Chauhanji column in attendance indicates which building
  const cols = { 'A Building': 'aBuilding', 'B Building': 'bBuilding', 'C Building': 'cBuilding' };
  // We check the Chauhanji column — the building that matches his presence
  // Attendance stores guard counts per building; we check which building has days logged
  // when Chauhanji column is also filled
  let best = null;
  let bestDays = 0;
  Object.entries(entries || {}).forEach(([, row]) => {
    if (n(row?.chauhanji) > 0) {
      // Find which building also has a guard that day (vendor buildings)
      // The building without vendor is Chauhan’s
    }
  });
  return best; // null = fall back to auto-rotation
}

const DEFAULT_FORM = {
  chauhanSalary: '20000',
  vendorGuardSalary: '24000',
  mainGateGuardSalary: '15000',
  mainGateMorning: '2',
  mainGateEvening: '2',
  chauhanLocation: 'auto',
  flatsA: '87',
  flatsB: '96',
  flatsC: '48',
  chauhanDays: '',  // actual days Chauhan worked this month
};

function getChauhanDefaultLocation(mv) {
  const [y, m] = mv.split('-').map(Number);
  const monthOffset = (y - 2026) * 12 + (m - 4);
  const rotation = ['B Building', 'C Building', 'A Building'];
  return rotation[((monthOffset % 3) + 3) % 3];
}

/**
 * attData: { aGuardDays, bGuardDays, cGuardDays, commonDays } | null
 * When present, actual guard-days from the attendance register drive the cost.
 * Falls back to full-month salary when absent.
 */
function calcBill(form, mv, attData = null) {
  const actualChauhanLoc = form.chauhanLocation === 'auto' ? getChauhanDefaultLocation(mv) : form.chauhanLocation;

  const flats = {
    'A Building': n(form.flatsA),
    'B Building': n(form.flatsB),
    'C Building': n(form.flatsC),
  };
  const totalFlats = flats['A Building'] + flats['B Building'] + flats['C Building'] || 1;

  const [y, m] = mv.split('-').map(Number);
  const daysInMonth = new Date(y, m, 0).getDate();

  // Chauhan cost — prorated by days entered or full month
  const chauhanDaysWorked = n(form.chauhanDays) > 0 ? n(form.chauhanDays) : daysInMonth;
  const chauhanActualCost = (n(form.chauhanSalary) / daysInMonth) * chauhanDaysWorked;

  // Main gate — split by flat ratio. Prorated by commonArea guard-days if available.
  const mainGateMonthlyPerGuard = n(form.mainGateGuardSalary);
  const mainGateTotal = attData 
    ? (mainGateMonthlyPerGuard / daysInMonth) * attData.commonDays 
    : (n(form.mainGateMorning) + n(form.mainGateEvening)) * mainGateMonthlyPerGuard;

  // Vendor daily rate for proration
  const vendorMonthly = n(form.vendorGuardSalary);
  const vendorDailyRate = vendorMonthly / daysInMonth;

  // Attendance guard-days per building column
  const attCols = {
    'A Building': attData ? attData.aGuardDays : daysInMonth,
    'B Building': attData ? attData.bGuardDays : daysInMonth,
    'C Building': attData ? attData.cGuardDays : daysInMonth,
  };

  const buildings = ['A Building', 'B Building', 'C Building'];
  const res = {};
  let grandTotal = 0;

  buildings.forEach(b => {
    const ratio = flats[b] / totalFlats;
    const mainGateShare = mainGateTotal * ratio;

    let chauhanCost = 0;
    let vendorCost = 0;
    if (b === actualChauhanLoc) {
      chauhanCost = chauhanActualCost;
    } else {
      // Prorate by actual guard-days if attendance available
      vendorCost = attData ? vendorDailyRate * attCols[b] : vendorMonthly;
    }

    const total = mainGateShare + chauhanCost + vendorCost;
    grandTotal += total;

    res[b] = {
      flats: flats[b],
      flatRatioPct: (ratio * 100).toFixed(1),
      mainGate: mainGateShare,
      chauhan: chauhanCost,
      vendor: vendorCost,
      guardDays: attCols[b],
      total,
    };
  });

  return { buildings, details: res, grandTotal, actualChauhanLoc, mainGateTotal, totalFlats, daysInMonth, chauhanDaysWorked, usedAttendance: !!attData };
}

export default function SecurityBillCalculator() {
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth);
  const [form, setForm] = useState(DEFAULT_FORM);
  const [isLoading, setIsLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState('idle');
  const [saveMsg, setSaveMsg] = useState('');
  const [attendance, setAttendance] = useState(null); // loaded from securityAttendanceRegisters

  const isLoadedRef = useRef(false);
  const autoSaveTimer = useRef(null);
  const recordId = `security_bill_${selectedMonth}`;
  const attendanceRecordId = `security_register_${selectedMonth}`;

  // Load from Firebase
  useEffect(() => {
    let cancelled = false;
    isLoadedRef.current = false;
    setSaveStatus('idle');
    setSaveMsg('');

    async function load() {
      setIsLoading(true);
      if (!isFirebaseConfigured || !db) {
        if (!cancelled) {
          setForm(DEFAULT_FORM);
          setSaveMsg('Local mode — Firebase not connected.');
          setIsLoading(false);
          isLoadedRef.current = true;
        }
        return;
      }

      try {
        await ensureFirebaseSession();
        const snap = await getDoc(doc(db, 'securityBills', recordId));
        if (!cancelled) {
          if (snap.exists()) {
            setForm({ ...DEFAULT_FORM, ...snap.data().form });
            setSaveMsg(`Loaded from Firebase — ${formatLongMonth(selectedMonth)}`);
          } else {
            setForm(DEFAULT_FORM);
            setSaveMsg(`New bill — ${formatLongMonth(selectedMonth)}`);
          }
        }
      } catch (err) {
        console.error('Bill load error:', err);
        if (!cancelled) {
          setForm(DEFAULT_FORM);
          setSaveMsg('Firebase unavailable — using defaults.');
        }
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

  // Load attendance data for the selected month
  useEffect(() => {
    let cancelled = false;
    async function loadAttendance() {
      if (!isFirebaseConfigured || !db) return;
      try {
        await ensureFirebaseSession();
        const snap = await getDoc(doc(db, 'securityAttendanceRegisters', attendanceRecordId));
        if (!cancelled && snap.exists()) {
          setAttendance(snap.data().entries || {});
        } else if (!cancelled) {
          setAttendance(null);
        }
      } catch {
        if (!cancelled) setAttendance(null);
      }
    }
    loadAttendance();
    return () => { cancelled = true; };
  }, [attendanceRecordId]);

  // Auto-save
  const saveToFirebase = useCallback(async (currentForm, currentRecordId, month) => {
    setSaveStatus('saving');
    if (!isFirebaseConfigured || !db) {
      setSaveStatus('saved');
      setSaveMsg('Saved locally (Firebase not connected).');
      return;
    }
    try {
      await ensureFirebaseSession();
      await setDoc(
        doc(db, 'securityBills', currentRecordId),
        { month, form: currentForm, updatedAt: serverTimestamp() },
        { merge: true }
      );
      setSaveStatus('saved');
      setSaveMsg('All changes saved to Firebase ✓');
    } catch (err) {
      console.error('Bill save error:', err);
      setSaveStatus('error');
      setSaveMsg('Firebase save failed.');
    }
  }, []);

  const handleDeleteBill = async (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    // Clear any pending auto-saves
    clearTimeout(autoSaveTimer.current);

    if (!window.confirm(`Are you sure you want to PERMANENTLY delete ALL security data (attendance AND billing) for ${formatLongMonth(selectedMonth)}?`)) return;
    
    setSaveStatus('saving');
    setSaveMsg('Deleting data...');
    
    try {
      await ensureFirebaseSession();
      // Delete billing config
      await deleteDoc(doc(db, 'securityBills', recordId));
      // Delete attendance register as well to be clean
      await deleteDoc(doc(db, 'securityAttendanceRegisters', attendanceRecordId));
      
      setSaveStatus('saved');
      setSaveMsg(`Deleted data for ${formatLongMonth(selectedMonth)}.`);
      window.location.reload(); 
    } catch (err) {
      console.error('Delete error:', err);
      setSaveStatus('error');
      setSaveMsg('Failed to delete data.');
    }
  };

  function handleFieldChange(field, value) {
    if (!isLoadedRef.current) return;
    setForm(prev => {
      const next = { ...prev, [field]: value };
      clearTimeout(autoSaveTimer.current);
      setSaveStatus('pending');
      setSaveMsg('Unsaved changes…');
      autoSaveTimer.current = setTimeout(() => saveToFirebase(next, recordId, selectedMonth), 1500);
      return next;
    });
  }

  useEffect(() => () => clearTimeout(autoSaveTimer.current), []);

  function handleDownloadExcel() {
    const bill = calcBill(form, selectedMonth);
    const rows = [
      ['Majestique Euriska - Security Bill'],
      ['Month', formatLongMonth(selectedMonth)],
      [],
      ['Cost Parameters'],
      ['Main Gate Guards (Morning)', form.mainGateMorning],
      ['Main Gate Guards (Evening)', form.mainGateEvening],
      ['Main Gate Guard Salary', form.mainGateGuardSalary],
      ['Chauhan Salary (Internal)', form.chauhanSalary],
      ['Vendor Guard Salary (24h)', form.vendorGuardSalary],
      ['Chauhan Placed At', bill.actualChauhanLoc],
      [],
      ['Building Breakdown', 'Main Gate Share', 'Chauhan Cost', 'Vendor Guard Cost', 'Total Due'],
      ...bill.buildings.map(b => [
        b,
        bill.details[b].mainGate,
        bill.details[b].chauhan,
        bill.details[b].vendor,
        bill.details[b].total
      ]),
      ['Grand Total', bill.mainGateTotal, n(form.chauhanSalary), 2 * n(form.vendorGuardSalary), bill.grandTotal]
    ];

    const ws = XLSX.utils.aoa_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Security Bill');
    XLSX.writeFile(wb, `Security_Bill_${selectedMonth}.xlsx`);
  }

  const badge = {
    idle: { color: '#6b7280', icon: '●' },
    pending: { color: '#f59e0b', icon: '⏳' },
    saving: { color: '#3b82f6', icon: '↑' },
    saved: { color: '#10b981', icon: '✓' },
    error: { color: '#ef4444', icon: '✗' },
  }[saveStatus];

  // Compute attendance summary for display
  const rawSummary = attendance ? {
    aGuardDays: sumAttendanceCol(attendance, 'aBuilding'),
    bGuardDays: sumAttendanceCol(attendance, 'bBuilding'),
    cGuardDays: sumAttendanceCol(attendance, 'cBuilding'),
    commonDays: sumAttendanceCol(attendance, 'commonArea'),
  } : null;

  // Only consider it "linked" if there is at least some data entered
  const isLinked = rawSummary && (
    rawSummary.aGuardDays > 0 ||
    rawSummary.bGuardDays > 0 ||
    rawSummary.cGuardDays > 0 ||
    rawSummary.commonDays > 0
  );

  const attSummary = isLinked ? rawSummary : null;

  // Bill uses actual attendance guard-days when available
  const bill = calcBill(form, selectedMonth, attSummary);

  return (
    <div className="attendance-manager attendance-manager--register">
      {/* Settings & Summary Panel */}
      <div className="attendance-manager__controls stack-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
          <div>
            <p className="eyebrow">Monthly Security Billing</p>
            <h3>Security Cost Distribution</h3>
            <p style={{ margin: 0 }}>Configure guard counts and salaries. Chauhan shifts building each month.</p>
          </div>
          <button 
            className="button-secondary" 
            type="button" 
            onClick={(e) => handleDeleteBill(e)}
            style={{ color: '#dc2626', borderColor: 'rgba(220, 38, 38, 0.2)', padding: '6px 12px' }}
          >
            🗑️ Delete Month Data
          </button>
        </div>

        <div className="attendance-control-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))' }}>
          <div className="summary-card summary-card--inline">
            <span>Main Gate Salary</span>
            <input
              type="text" inputMode="numeric" className="attendance-register-input" style={{ width: '100px', padding: '4px 8px', margin: 0, height: 'auto', minHeight: 0 }}
              value={form.mainGateGuardSalary} onChange={e => handleFieldChange('mainGateGuardSalary', e.target.value)}
            />
          </div>
          <div className="summary-card summary-card--inline">
            <span>Morning Guards</span>
            <input
              type="text" inputMode="numeric" className="attendance-register-input" style={{ width: '60px', padding: '4px 8px', margin: 0, height: 'auto', minHeight: 0 }}
              value={form.mainGateMorning} onChange={e => handleFieldChange('mainGateMorning', e.target.value)}
            />
          </div>
          <div className="summary-card summary-card--inline">
            <span>Evening Guards</span>
            <input
              type="text" inputMode="numeric" className="attendance-register-input" style={{ width: '60px', padding: '4px 8px', margin: 0, height: 'auto', minHeight: 0 }}
              value={form.mainGateEvening} onChange={e => handleFieldChange('mainGateEvening', e.target.value)}
            />
          </div>
        </div>
        {/* Row 2: Flat counts */}
        <div className="attendance-control-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))' }}>
          <div className="summary-card summary-card--inline">
            <span>A Building Flats</span>
            <input
              type="text" inputMode="numeric" className="attendance-register-input" style={{ width: '60px', padding: '4px 8px', margin: 0, height: 'auto', minHeight: 0 }}
              value={form.flatsA} onChange={e => handleFieldChange('flatsA', e.target.value)}
            />
          </div>
          <div className="summary-card summary-card--inline">
            <span>B Building Flats</span>
            <input
              type="text" inputMode="numeric" className="attendance-register-input" style={{ width: '60px', padding: '4px 8px', margin: 0, height: 'auto', minHeight: 0 }}
              value={form.flatsB} onChange={e => handleFieldChange('flatsB', e.target.value)}
            />
          </div>
          <div className="summary-card summary-card--inline">
            <span>C Building Flats</span>
            <input
              type="text" inputMode="numeric" className="attendance-register-input" style={{ width: '60px', padding: '4px 8px', margin: 0, height: 'auto', minHeight: 0 }}
              value={form.flatsC} onChange={e => handleFieldChange('flatsC', e.target.value)}
            />
          </div>
          <div className="summary-card summary-card--inline" style={{ background: '#f0fdf4', borderColor: '#86efac' }}>
            <span>Total Flats</span>
            <strong>{n(form.flatsA) + n(form.flatsB) + n(form.flatsC)}</strong>
          </div>
        </div>

        <div className="attendance-control-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))' }}>
          <div className="summary-card summary-card--inline" style={{ borderColor: '#C49B4F' }}>
            <span>Chauhan (Internal) Salary</span>
            <input
              type="text" inputMode="numeric" className="attendance-register-input" style={{ width: '100px', padding: '4px 8px', margin: 0, height: 'auto', minHeight: 0 }}
              value={form.chauhanSalary} onChange={e => handleFieldChange('chauhanSalary', e.target.value)}
            />
          </div>
          <div className="summary-card summary-card--inline" style={{ borderColor: '#C49B4F' }}>
            <span>Chauhanji Days Worked</span>
            <input
              type="text" inputMode="numeric" className="attendance-register-input"
              style={{ width: '60px', padding: '4px 8px', margin: 0, height: 'auto', minHeight: 0 }}
              placeholder={`/${bill.daysInMonth}`}
              value={form.chauhanDays} onChange={e => handleFieldChange('chauhanDays', e.target.value)}
            />
          </div>
          <div className="summary-card summary-card--inline" style={{ borderColor: '#C49B4F' }}>
            <span>Vendor Guard Salary (24h)</span>
            <input
              type="text" inputMode="numeric" className="attendance-register-input" style={{ width: '100px', padding: '4px 8px', margin: 0, height: 'auto', minHeight: 0 }}
              value={form.vendorGuardSalary} onChange={e => handleFieldChange('vendorGuardSalary', e.target.value)}
            />
          </div>
          <div className="summary-card summary-card--inline" style={{ borderColor: '#C49B4F' }}>
            <span>Chauhan Placement</span>
            <select
              className="attendance-register-input" style={{ width: '120px', padding: '4px 8px', margin: 0, height: 'auto', minHeight: 0 }}
              value={form.chauhanLocation} onChange={e => handleFieldChange('chauhanLocation', e.target.value)}
            >
              <option value="auto">Auto-Rotate ({getChauhanDefaultLocation(selectedMonth)})</option>
              <option value="A Building">A Building</option>
              <option value="B Building">B Building</option>
              <option value="C Building">C Building</option>
            </select>
          </div>
        </div>

        <div className="attendance-summary-grid">
          <div className="summary-card" style={{ background: '#0F3D35', color: 'white', borderColor: '#0F3D35' }}>
            <span style={{ color: 'rgba(255,255,255,0.8)' }}>Grand Total Bill</span>
            <strong>₹{fmt(bill.grandTotal)}</strong>
          </div>
        </div>

        <div className="attendance-note" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 500, color: badge.color }}>
          <span>{badge.icon}</span>
          <span>{isLoading ? 'Loading…' : saveMsg || 'Ready'}</span>
        </div>
      </div>

        {/* Attendance Link Summary */}
        {attSummary ? (
          <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 10, padding: '16px 20px' }}>
            <p className="eyebrow" style={{ marginBottom: 8, color: '#0F3D35' }}>Linked from Attendance Register ✓</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 12 }}>
              {[
                { label: 'A Bldg Guard-Days', val: attSummary.aGuardDays },
                { label: 'B Bldg Guard-Days', val: attSummary.bGuardDays },
                { label: 'C Bldg Guard-Days', val: attSummary.cGuardDays },
                { label: 'Common Area Days', val: attSummary.commonDays },
              ].map(({ label, val }) => (
                <div key={label} className="summary-card summary-card--inline" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 2 }}>
                  <span style={{ fontSize: '0.78rem', color: '#6b7280' }}>{label}</span>
                  <strong style={{ fontSize: '1.1rem', color: '#0F3D35' }}>{val}</strong>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div style={{ background: '#fefce8', border: '1px solid #fde047', borderRadius: 10, padding: '12px 16px', fontSize: '0.9rem', color: '#713f12' }}>
            ⚠️ No saved attendance data for {formatLongMonth(selectedMonth)}. Go to <strong>Security Tracking</strong>, fill in the register and save it first.
          </div>
        )}
      <div className="table-card attendance-table-card attendance-table-card--register" style={{ padding: 0 }}>
        <div className="attendance-month-tabs" role="tablist">
          {FINANCIAL_YEAR_MONTHS.map((mv) => (
            <button
              key={mv} type="button" role="tab" aria-selected={selectedMonth === mv}
              className={`attendance-month-tab ${selectedMonth === mv ? 'attendance-month-tab--active' : ''}`}
              onClick={() => setSelectedMonth(mv)}
            >
              {formatMonthLabel(mv)}
            </button>
          ))}
        </div>

        {bill.usedAttendance ? (
          <>
            <div className="attendance-table-card__header">
              <div>
                <p className="eyebrow">Building Breakdown</p>
                <h3>Final Security Bill — {formatLongMonth(selectedMonth)}</h3>
              </div>
              <div className="attendance-table-card__actions">
                <button className="button-secondary" type="button" onClick={handleDownloadExcel}>
                  ⬇ Download Excel
                </button>
              </div>
            </div>

            <div className="attendance-table-scroll">
              <table className="attendance-table attendance-table--register attendance-table--bill">
                <thead>
                  <tr style={{ background: '#f8fafc' }}>
                    <th style={{ width: '18%' }}>Building</th>
                    <th style={{ textAlign: 'right' }}>Flats (Share %)</th>
                    {bill.usedAttendance && <th style={{ textAlign: 'right', color: '#0F3D35' }}>Guard Days</th>}
                    <th style={{ textAlign: 'right' }}>Main Gate Share (₹)</th>
                    <th style={{ textAlign: 'right' }}>Chauhan Cost (₹)</th>
                    <th style={{ textAlign: 'right' }}>Vendor Guard Cost (₹)</th>
                    <th style={{ textAlign: 'right', fontSize: '1.05rem' }}>Total Due (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr>
                      <td colSpan={bill.usedAttendance ? 7 : 6} style={{ textAlign: 'center', padding: '40px', opacity: 0.5 }}>Loading billing data...</td>
                    </tr>
                  ) : (
                    bill.buildings.map((b) => {
                      const data = bill.details[b];
                      return (
                        <tr key={b}>
                          <td><strong>{b}</strong> {b === bill.actualChauhanLoc && <span style={{fontSize: '0.8rem', marginLeft: 8, color: '#0F3D35', background: '#dcfce7', padding: '2px 6px', borderRadius: 12}}>Chauhan Shift</span>}</td>
                          <td style={{ textAlign: 'right', color: '#6b7280' }}>{data.flats} flats <span style={{ fontSize: '0.78rem' }}>({data.flatRatioPct}%)</span></td>
                          {bill.usedAttendance && (
                            <td style={{ textAlign: 'right', fontWeight: 600, color: '#0F3D35' }}>
                              {b === bill.actualChauhanLoc ? <em style={{ color: '#b45309', fontStyle: 'normal' }}>Chauhan</em> : `${data.guardDays} days`}
                            </td>
                          )}
                          <td style={{ textAlign: 'right' }}>{fmt(data.mainGate)}</td>
                          <td style={{ textAlign: 'right', color: data.chauhan > 0 ? '#0B2B26' : 'inherit' }}>{fmt(data.chauhan)}</td>
                          <td style={{ textAlign: 'right', color: data.vendor > 0 ? '#C49B4F' : 'inherit' }}>{fmt(data.vendor)}</td>
                          <td style={{ textAlign: 'right', fontWeight: 800, color: '#0F3D35', fontSize: '1.1rem' }}>{fmt(data.total)}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
                <tfoot>
                  <tr>
                    <th>Grand Total</th>
                    <th style={{ textAlign: 'right' }}>{bill.totalFlats} flats</th>
                    {bill.usedAttendance && <th style={{ textAlign: 'right' }}>-</th>}
                    <th style={{ textAlign: 'right' }}>{fmt(bill.mainGateTotal)}</th>
                    <th style={{ textAlign: 'right' }}>{fmt(n(form.chauhanSalary))}</th>
                    <th style={{ textAlign: 'right' }}>{fmt(2 * n(form.vendorGuardSalary))}</th>
                    <th style={{ textAlign: 'right', fontSize: '1.1rem' }}>{fmt(bill.grandTotal)}</th>
                  </tr>
                </tfoot>
              </table>
            </div>
          </>
        ) : (
          <div style={{ padding: '60px 20px', textAlign: 'center', color: '#6b7280' }}>
            <div style={{ fontSize: '3rem', marginBottom: '16px' }}>📋</div>
            <h4 style={{ marginBottom: '8px', color: '#374151' }}>Bill not generated yet</h4>
            <p style={{ maxWidth: '400px', margin: '0 auto' }}>
              The final security bill will appear here once you save the attendance records for <strong>{formatLongMonth(selectedMonth)}</strong> in the Tracking tab.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
