import { useCallback, useEffect, useRef, useState } from 'react';
import { doc, getDoc, serverTimestamp, setDoc, deleteDoc, onSnapshot } from 'firebase/firestore';
import * as XLSX from 'xlsx';
import { db, ensureFirebaseSession, isFirebaseConfigured } from '../../firebase.js';

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

function daysInMonth(mv) {
  const [y, m] = mv.split('-').map(Number);
  return new Date(y, m, 0).getDate();
}

function n(v) { return parseFloat(v) || 0; }
function fmt(v) { return Number(v).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

const DEFAULT_FORM = {
  // Distribution units
  unitsA: '87', unitsB: '96', unitsC: '48',
  // Building wages
  aDays: '', aWage: '11000',
  bDays: '', bWage: '11000',
  cDays: '', cWage: '11000',
  // Supervisor
  supervisorSalary: '11000', supervisorDays: '',
  // Common Staff
  commonCount: '', commonSalary: '11000', commonAbsent: '',
  // Garbage
  garbageTotal: '8000',
  // Tractor
  tractorRate: '1400', tractorTrips: '', overrideTractorTrips: false,
  // STP
  stpSalary: '8000',
};

function calcBill(form, mv, attData = null) {
  const totalUnits = n(form.unitsA) + n(form.unitsB) + n(form.unitsC);
  if (totalUnits === 0) return null;

  const ratioA = n(form.unitsA) / totalUnits;
  const ratioB = n(form.unitsB) / totalUnits;
  const ratioC = n(form.unitsC) / totalUnits;

  const days = daysInMonth(mv);

  // Pro-rated Wages for Buildings
  // Use attendance if present, otherwise fall back to manual form.aDays, otherwise default to full month (days)
  const aDays = attData ? attData.a : (form.aDays !== '' ? n(form.aDays) : days);
  const bDays = attData ? attData.b : (form.bDays !== '' ? n(form.bDays) : days);
  const cDays = attData ? attData.c : (form.cDays !== '' ? n(form.cDays) : days);

  const aWage = (n(form.aWage) / days) * aDays;
  const bWage = (n(form.bWage) / days) * bDays;
  const cWage = (n(form.cWage) / days) * cDays;

  // Supervisor
  const supWage = n(form.supervisorSalary);
  const supDays = attData ? attData.supervisor : (form.supervisorDays !== '' ? n(form.supervisorDays) : days);
  const supActualTotal = (supWage / days) * supDays;

  const supA = supActualTotal * ratioA;
  const supB = supActualTotal * ratioB;
  const supC = supActualTotal * ratioC;

  // Common Staff
  const comSalary = n(form.commonSalary);
  let comNet = comSalary;
  let comDays = days;
  if (attData) {
    comDays = attData.common;
    comNet = (comSalary / days) * comDays;
  } else if (form.commonAbsent !== '') {
    // Old manual calculation if they entered absences
    const comCount = n(form.commonCount) || 1;
    const perDay = comSalary / (comCount * days);
    const deduction = n(form.commonAbsent) * perDay;
    comNet = comSalary - deduction;
    comDays = comCount * days - n(form.commonAbsent);
  }
  const comA = comNet * ratioA;
  const comB = comNet * ratioB;
  const comC = comNet * ratioC;

  // Garbage
  const garbTotal = n(form.garbageTotal);
  const garbA = garbTotal * ratioA;
  const garbB = garbTotal * ratioB;
  const garbC = garbTotal * ratioC;

  // Tractor
  const useAttendance = attData && !form.overrideTractorTrips;
  const trips = useAttendance ? attData.tractorTrip : (form.tractorTrips !== '' ? n(form.tractorTrips) : 0);
  const tractTotal = n(form.tractorRate) * trips;
  const tractA = tractTotal * ratioA;
  const tractB = tractTotal * ratioB;
  const tractC = tractTotal * ratioC;

  // STP
  const stpTotal = n(form.stpSalary);
  const stpA = stpTotal * ratioA;
  const stpB = stpTotal * ratioB;
  const stpC = stpTotal * ratioC;

  const totalA = aWage + supA + comA + garbA + tractA + stpA;
  const totalB = bWage + supB + comB + garbB + tractB + stpB;
  const totalC = cWage + supC + comC + garbC + tractC + stpC;

  return {
    ratioA, ratioB, ratioC,
    comNet,
    tractTotal,
    usedAttendance: !!attData,
    rows: [
      { label: 'A Building', wage: aWage, sup: supA, com: comA, garb: garbA, tract: tractA, stp: stpA, total: totalA, days: aDays },
      { label: 'B Building', wage: bWage, sup: supB, com: comB, garb: garbB, tract: tractB, stp: stpB, total: totalB, days: bDays },
      { label: 'C Building', wage: cWage, sup: supC, com: comC, garb: garbC, tract: tractC, stp: stpC, total: totalC, days: cDays },
    ],
    grandTotal: totalA + totalB + totalC,
  };
}

// ─── Field component (defined OUTSIDE main component so it never remounts) ────
function Field({ label, value, onChange, prefix }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <span style={{ fontSize: '0.75rem', fontWeight: 600, opacity: 0.7 }}>{label}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        {prefix && <span style={{ opacity: 0.5, fontSize: '0.9rem' }}>{prefix}</span>}
        <input
          type="text"
          inputMode="numeric"
          value={value}
          onChange={e => {
            const cleaned = e.target.value
              .replace(/[^0-9.]/g, '')
              .replace(/(\..*?)\.+/g, '$1');
            onChange(cleaned);
          }}
          style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid rgba(0,0,0,0.15)', fontSize: '0.95rem', background: 'rgba(255,255,255,0.8)' }}
        />
      </div>
    </label>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function HousekeepingBillCalculator() {
  const [month, setMonth] = useState(getCurrentMonth);
  const [form, setForm] = useState(DEFAULT_FORM);
  const [saveStatus, setSave] = useState('idle');
  const [saveMsg, setSaveMsg] = useState('');
  const [isLoading, setLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [attendance, setAttendance] = useState(null);
  const loadedRef = useRef(false);
  const recordId = `hk_bill_${month}`;

  // Load from Firebase
  useEffect(() => {
    let cancelled = false;
    loadedRef.current = false;
    setSave('idle'); setSaveMsg('');

    async function load() {
      setLoading(true);
      if (!isFirebaseConfigured || !db) { setLoading(false); loadedRef.current = true; return; }
      try {
        await ensureFirebaseSession();
        const snap = await getDoc(doc(db, 'housekeepingBillCalculations', recordId));
        if (!cancelled && snap.exists()) {
          const loaded = { ...DEFAULT_FORM, ...snap.data().form };
          setForm(loaded);
          setSaveMsg(`${formatLongMonth(month)}`);
        } else if (!cancelled) {
          setForm(DEFAULT_FORM);
          setSaveMsg(`New bill — ${formatLongMonth(month)}`);
        }
      } catch (e) { console.error(e); }
      finally { if (!cancelled) { setLoading(false); loadedRef.current = true; } }
    }
    load();
    return () => { cancelled = true; };
  }, [recordId, month]);

  // Real-time listener for attendance data of the selected month
  useEffect(() => {
    let unsubscribe = null;
    let cancelled = false;

    function loadLocalAttendance() {
      try {
        const raw = window.localStorage.getItem('majestique-housekeeping-register');
        const localRecords = raw ? JSON.parse(raw) : {};
        const record = localRecords[`register_${month}`];
        if (record && record.entries) {
          const data = record.entries;
          const sums = { a: 0, b: 0, c: 0, supervisor: 0, common: 0, tractorTrip: 0 };
          Object.values(data).forEach(row => {
            sums.a += n(row.a);
            sums.b += n(row.b);
            sums.c += n(row.c);
            sums.supervisor += n(row.supervisor);
            sums.common += n(row.common);
            sums.tractorTrip += n(row.tractorTrip);
          });
          setAttendance(sums);
          return true;
        }
      } catch (err) {
        console.error("Failed to load local attendance:", err);
      }
      return false;
    }

    // Always listen to current tab event updates
    const handleAttendanceUpdate = (e) => {
      if (e.detail && e.detail.month === month) {
        const data = e.detail.entries || {};
        const sums = { a: 0, b: 0, c: 0, supervisor: 0, common: 0, tractorTrip: 0 };
        Object.values(data).forEach(row => {
          sums.a += n(row.a);
          sums.b += n(row.b);
          sums.c += n(row.c);
          sums.supervisor += n(row.supervisor);
          sums.common += n(row.common);
          sums.tractorTrip += n(row.tractorTrip);
        });
        setAttendance(sums);
      }
    };
    window.addEventListener('attendanceUpdated', handleAttendanceUpdate);

    if (!isFirebaseConfigured || !db) {
      loadLocalAttendance();
      return () => {
        window.removeEventListener('attendanceUpdated', handleAttendanceUpdate);
      };
    }

    async function setupListener() {
      try {
        await ensureFirebaseSession();
        if (cancelled) return;

        unsubscribe = onSnapshot(
          doc(db, 'housekeepingAttendanceRegisters', `register_${month}`),
          (snap) => {
            if (snap.exists()) {
              const data = snap.data().entries || {};
              const sums = { a: 0, b: 0, c: 0, supervisor: 0, common: 0, tractorTrip: 0 };
              Object.values(data).forEach(row => {
                sums.a += n(row.a);
                sums.b += n(row.b);
                sums.c += n(row.c);
                sums.supervisor += n(row.supervisor);
                sums.common += n(row.common);
                sums.tractorTrip += n(row.tractorTrip);
              });
              setAttendance(sums);
            } else {
              if (!loadLocalAttendance()) {
                setAttendance(null);
              }
            }
          },
          (err) => {
            console.error("Failed to listen to attendance data:", err);
            if (!loadLocalAttendance()) {
              setAttendance(null);
            }
          }
        );
      } catch (err) {
        console.error("Failed to setup attendance listener:", err);
        loadLocalAttendance();
      }
    }

    setupListener();
    return () => {
      cancelled = true;
      if (unsubscribe) unsubscribe();
      window.removeEventListener('attendanceUpdated', handleAttendanceUpdate);
    };
  }, [month]);

  const saveToFirebase = useCallback(async (currentForm, currentId) => {
    setSave('saving');
    try {
      await ensureFirebaseSession();
      await setDoc(doc(db, 'housekeepingBillCalculations', currentId),
        { form: currentForm, updatedAt: serverTimestamp() }, { merge: true });
      setSave('saved'); setSaveMsg('Saved to Firebase ✓');
    } catch (e) { setSave('error'); setSaveMsg('Save failed.'); }
  }, []);

  async function handleDeleteBill() {
    if (!window.confirm(`Are you sure you want to PERMANENTLY delete ALL housekeeping data (attendance AND billing) for ${formatLongMonth(month)}?`)) return;
    setLoading(true);
    setSaveMsg('Deleting data...');
    try {
      await ensureFirebaseSession();
      await deleteDoc(doc(db, 'housekeepingBillCalculations', recordId));
      await deleteDoc(doc(db, 'housekeepingAttendanceRegisters', `register_${month}`));
      setSaveMsg(`Deleted data for ${formatLongMonth(month)}.`);
      window.location.reload();
    } catch (err) {
      console.error(err);
      setSaveMsg('Delete failed.');
    } finally {
      setLoading(false);
    }
  }

  async function handleManualSave() {
    setIsSaving(true);
    await saveToFirebase(form, recordId);
    setIsSaving(false);
  }

  function handleChange(field, value) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  // Calculate bill live using current form state
  const bill = calcBill(form, month, attendance);

  function handleDownloadExcel() {
    if (!bill) return;
    const days = daysInMonth(month);

    const rows = [
      [`Housekeeping Bill Calculation — ${formatLongMonth(month)}`],
      [],
      ['Category', '', 'A Building', 'B Building', 'C Building'],
      ['Building Units (ratio)', '', form.unitsA, form.unitsB, form.unitsC],
      [],
      ['A Building Manpower', 'Days Present', bill.rows[0].days, 'Monthly Rate', form.aWage],
      ['B Building Manpower', 'Days Present', bill.rows[1].days, 'Monthly Rate', form.bWage],
      ['C Building Manpower', 'Days Present', bill.rows[2].days, 'Monthly Rate', form.cWage],
      [],
      ['Supervisor Salary', n(form.supervisorSalary), bill.rows[0].sup, bill.rows[1].sup, bill.rows[2].sup],
      [],
      ['Common Staff', 'Total Salary', form.commonSalary, 'Days Present', attendance ? attendance.common : (form.commonCount !== '' ? (n(form.commonCount) * days - n(form.commonAbsent)) : days)],
      ['Common Staff (net)', bill.comNet, bill.rows[0].com, bill.rows[1].com, bill.rows[2].com],
      [],
      ['Garbage', n(form.garbageTotal), bill.rows[0].garb, bill.rows[1].garb, bill.rows[2].garb],
      [],
      ['Tractor', `Rate: ${form.tractorRate} × Trips: ${attendance && !form.overrideTractorTrips ? attendance.tractorTrip : (form.tractorTrips !== '' ? n(form.tractorTrips) : 0)}`, bill.rows[0].tract, bill.rows[1].tract, bill.rows[2].tract],
      [],
      ['STP Operator', n(form.stpSalary), bill.rows[0].stp, bill.rows[1].stp, bill.rows[2].stp],
      [],
      ['', 'Building Wage', 'Supervisor', 'Common', 'Garbage', 'Tractor', 'STP', 'Total'],
      ...bill.rows.map(r => [r.label, r.wage, r.sup, r.com, r.garb, r.tract, r.stp, r.total]),
      ['Grand Total', '', '', '', '', '', '', bill.grandTotal],
    ];

    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!cols'] = [{ wch: 22 }, { wch: 16 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 14 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `HK Bill ${formatMonthLabel(month)}`);
    XLSX.writeFile(wb, `hk-bill-${month}.xlsx`);
    setSaveMsg('Excel downloaded.');
  }

  const badge = {
    idle: { c: '#6b7280', i: '●' },
    pending: { c: '#f59e0b', i: '⏳' },
    saving: { c: '#3b82f6', i: '↑' },
    saved: { c: '#10b981', i: '✓' },
    error: { c: '#ef4444', i: '✗' }
  }[saveStatus] || { c: '#6b7280', i: '●' };

  const sectionStyle = {
    background: 'rgba(255,255,255,0.6)',
    borderRadius: 14,
    padding: '20px 24px',
    border: '1px solid rgba(0,0,0,0.08)',
    display: 'flex',
    flexDirection: 'column',
    gap: 14
  };
  const gridStyle = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 130px), 1fr))',
    gap: 12
  };
  const headingStyle = {
    margin: 0,
    fontSize: '0.85rem',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    opacity: 0.6
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* Month tabs + header */}
      <div className="table-card attendance-table-card attendance-table-card--register" style={{ padding: 0 }}>
        <div className="attendance-month-tabs" role="tablist">
          {FINANCIAL_YEAR_MONTHS.map(mv => (
            <button key={mv} type="button" role="tab" aria-selected={month === mv}
              className={`attendance-month-tab ${month === mv ? 'attendance-month-tab--active' : ''}`}
              onClick={() => setMonth(mv)}>{formatMonthLabel(mv)}</button>
          ))}
        </div>
        <div className="attendance-table-card__header">
          <div>
            <p className="eyebrow">Monthly Bill Calculation</p>
            <h3>Housekeeping Bill — {formatLongMonth(month)}</h3>
          </div>
          <div className="attendance-table-card__actions">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: badge.c, fontWeight: 500, fontSize: '0.9rem' }}>
              <span>{badge.i}</span>
              <span>{isLoading ? 'Loading…' : saveMsg || 'Ready'}</span>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                className="button-primary"
                type="button"
                onClick={handleManualSave}
                disabled={isSaving || isLoading}
              >
                {isSaving ? 'Saving…' : '💾 Save'}
              </button>
              <button className="button-secondary" type="button" onClick={handleDownloadExcel} disabled={!bill}>
                ⬇ Download
              </button>
              <button
                className="button-secondary"
                type="button"
                onClick={handleDeleteBill}
                style={{ color: '#dc2626', borderColor: 'rgba(220, 38, 38, 0.2)', fontWeight: 700 }}
              >
                🗑️ Clear
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Input sections */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))', gap: 16 }}>

        {/* Distribution */}
        <div style={sectionStyle}>
          <p style={headingStyle}>🏢 Building Distribution Units</p>
          <p style={{ margin: 0, fontSize: '0.82rem', opacity: 0.6 }}>Number of flats per building — determines cost split ratio</p>
          <div style={gridStyle}>
            <Field label="A Building Units" value={form.unitsA} onChange={v => handleChange('unitsA', v)} />
            <Field label="B Building Units" value={form.unitsB} onChange={v => handleChange('unitsB', v)} />
            <Field label="C Building Units" value={form.unitsC} onChange={v => handleChange('unitsC', v)} />
          </div>
          {bill && (
            <div style={{ fontSize: '0.8rem', opacity: 0.65 }}>
              Ratio — A: {(bill.ratioA * 100).toFixed(1)}% · B: {(bill.ratioB * 100).toFixed(1)}% · C: {(bill.ratioC * 100).toFixed(1)}%
            </div>
          )}
        </div>

        {/* Building Manpower */}
        <div style={sectionStyle}>
          <p style={headingStyle}>👷 Building Manpower Wages</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 140px), 1fr))', gap: 10 }}>
            <Field label="A Building Wage (₹)" value={form.aWage} onChange={v => handleChange('aWage', v)} prefix="₹" />
            {!attendance && <Field label="A Building Days" value={form.aDays} onChange={v => handleChange('aDays', v)} />}

            <Field label="B Building Wage (₹)" value={form.bWage} onChange={v => handleChange('bWage', v)} prefix="₹" />
            {!attendance && <Field label="B Building Days" value={form.bDays} onChange={v => handleChange('bDays', v)} />}

            <Field label="C Building Wage (₹)" value={form.cWage} onChange={v => handleChange('cWage', v)} prefix="₹" />
            {!attendance && <Field label="C Building Days" value={form.cDays} onChange={v => handleChange('cDays', v)} />}
          </div>
          {attendance ? (
            <div style={{ fontSize: '0.83rem', padding: '10px', background: 'rgba(0,0,0,0.04)', borderRadius: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div style={{ fontWeight: 600 }}>Days present from attendance:</div>
              <div>A: <strong>{attendance.a.toFixed(1)} days</strong> (₹{fmt(bill ? bill.rows[0].wage : 0)})</div>
              <div>B: <strong>{attendance.b.toFixed(1)} days</strong> (₹{fmt(bill ? bill.rows[1].wage : 0)})</div>
              <div>C: <strong>{attendance.c.toFixed(1)} days</strong> (₹{fmt(bill ? bill.rows[2].wage : 0)})</div>
            </div>
          ) : (
            <div style={{ fontSize: '0.83rem', padding: '10px', background: 'rgba(255,247,237,0.8)', border: '1px solid rgba(255,237,213,1)', color: '#c2410c', borderRadius: 8 }}>
              ⚠️ Attendance register missing. Using manual days entry.
            </div>
          )}
        </div>

        {/* Supervisor */}
        <div style={sectionStyle}>
          <p style={headingStyle}>🧑‍💼 Supervisor</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 140px), 1fr))', gap: 10 }}>
            <Field label="Monthly Wage (₹)" value={form.supervisorSalary} onChange={v => handleChange('supervisorSalary', v)} prefix="₹" />
            {!attendance && <Field label="Supervisor Days Present" value={form.supervisorDays} onChange={v => handleChange('supervisorDays', v)} />}
          </div>
          {bill && n(form.supervisorSalary) > 0 && (
            <div style={{ fontSize: '0.83rem', padding: '10px', background: 'rgba(0,0,0,0.04)', borderRadius: 8 }}>
              Actual Cost: (₹{form.supervisorSalary} / {daysInMonth(month)}) × {attendance ? attendance.supervisor : (form.supervisorDays !== '' ? n(form.supervisorDays) : daysInMonth(month))} days = <strong>₹{fmt((n(form.supervisorSalary) / daysInMonth(month)) * (attendance ? attendance.supervisor : (form.supervisorDays !== '' ? n(form.supervisorDays) : daysInMonth(month))))}</strong>
            </div>
          )}
          {bill && n(form.supervisorSalary) > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 90px), 1fr))', gap: 8, fontSize: '0.85rem' }}>
              {bill.rows.map(r => <div key={r.label} style={{ textAlign: 'center', padding: '8px', background: 'rgba(0,0,0,0.04)', borderRadius: 8 }}><div style={{ opacity: 0.6, fontSize: '0.75rem' }}>{r.label}</div><strong>₹{fmt(r.sup)}</strong></div>)}
            </div>
          )}
        </div>

        {/* Common Staff */}
        <div style={sectionStyle}>
          <p style={headingStyle}>👥 Common Staff</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 140px), 1fr))', gap: 10 }}>
            <Field label="Total Salary (₹)" value={form.commonSalary} onChange={v => handleChange('commonSalary', v)} prefix="₹" />
            {!attendance && (
              <>
                <Field label="No. of Staff" value={form.commonCount} onChange={v => handleChange('commonCount', v)} />
                <Field label="Days Absent" value={form.commonAbsent} onChange={v => handleChange('commonAbsent', v)} />
              </>
            )}
          </div>
          {bill && n(form.commonSalary) > 0 && (
            <div style={{ fontSize: '0.83rem', display: 'flex', flexDirection: 'column', gap: 4, padding: '10px', background: 'rgba(0,0,0,0.04)', borderRadius: 8 }}>
              {attendance ? (
                <>
                  <div>Days present from attendance: <strong>{attendance.common.toFixed(1)} days</strong></div>
                  <div>Net Payable: <strong style={{ color: '#276749' }}>₹{fmt(bill.comNet)}</strong></div>
                </>
              ) : (
                <>
                  <div>Net Payable (manual): <strong style={{ color: '#276749' }}>₹{fmt(bill.comNet)}</strong></div>
                </>
              )}
            </div>
          )}
          {bill && n(form.commonSalary) > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 90px), 1fr))', gap: 8, fontSize: '0.85rem' }}>
              {bill.rows.map(r => <div key={r.label} style={{ textAlign: 'center', padding: '8px', background: 'rgba(0,0,0,0.04)', borderRadius: 8 }}><div style={{ opacity: 0.6, fontSize: '0.75rem' }}>{r.label}</div><strong>₹{fmt(r.com)}</strong></div>)}
            </div>
          )}
        </div>

        {/* Garbage */}
        <div style={sectionStyle}>
          <p style={headingStyle}>🗑️ Garbage</p>
          <Field label="Monthly Garbage Amount (₹)" value={form.garbageTotal} onChange={v => handleChange('garbageTotal', v)} prefix="₹" />
          {bill && n(form.garbageTotal) > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 90px), 1fr))', gap: 8, fontSize: '0.85rem' }}>
              {bill.rows.map(r => <div key={r.label} style={{ textAlign: 'center', padding: '8px', background: 'rgba(0,0,0,0.04)', borderRadius: 8 }}><div style={{ opacity: 0.6, fontSize: '0.75rem' }}>{r.label}</div><strong>₹{fmt(r.garb)}</strong></div>)}
            </div>
          )}
        </div>

        {/* Tractor */}
        <div style={sectionStyle}>
          <p style={headingStyle}>🚜 Tractor</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 140px), 1fr))', gap: 10 }}>
            <Field label="Rate per Trip (₹)" value={form.tractorRate} onChange={v => handleChange('tractorRate', v)} prefix="₹" />
            {(form.overrideTractorTrips || !attendance) ? (
              <Field label="No. of Trips" value={form.tractorTrips} onChange={v => handleChange('tractorTrips', v)} />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, opacity: 0.7 }}>No. of Trips (Auto)</span>
                <div style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid rgba(0,0,0,0.15)', background: 'rgba(0,0,0,0.05)', fontSize: '0.95rem', fontWeight: 600 }}>
                  {attendance.tractorTrip} trips (from Attendance)
                </div>
              </div>
            )}
          </div>
          {attendance && (
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.85rem', cursor: 'pointer', marginTop: 4 }}>
              <input
                type="checkbox"
                checked={!!form.overrideTractorTrips}
                onChange={e => handleChange('overrideTractorTrips', e.target.checked)}
              />
              <span>Manually override trips count</span>
            </label>
          )}
          {bill && (
            <>
              <div style={{ fontSize: '0.83rem', padding: '8px 10px', background: 'rgba(0,0,0,0.04)', borderRadius: 8 }}>
                Total: ₹{form.tractorRate} × {attendance && !form.overrideTractorTrips ? attendance.tractorTrip : (form.tractorTrips !== '' ? n(form.tractorTrips) : 0)} trips = <strong>₹{fmt(bill.tractTotal)}</strong>
              </div>
              {bill.tractTotal > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 90px), 1fr))', gap: 8, fontSize: '0.85rem' }}>
                  {bill.rows.map(r => <div key={r.label} style={{ textAlign: 'center', padding: '8px', background: 'rgba(0,0,0,0.04)', borderRadius: 8 }}><div style={{ opacity: 0.6, fontSize: '0.75rem' }}>{r.label}</div><strong>₹{fmt(r.tract)}</strong></div>)}
                </div>
              )}
            </>
          )}
        </div>

        {/* STP */}
        <div style={sectionStyle}>
          <p style={headingStyle}>💧 STP Operator</p>
          <Field label="STP Operator Monthly Salary (₹)" value={form.stpSalary} onChange={v => handleChange('stpSalary', v)} prefix="₹" />
          {bill && n(form.stpSalary) > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 90px), 1fr))', gap: 8, fontSize: '0.85rem' }}>
              {bill.rows.map(r => <div key={r.label} style={{ textAlign: 'center', padding: '8px', background: 'rgba(0,0,0,0.04)', borderRadius: 8 }}><div style={{ opacity: 0.6, fontSize: '0.75rem' }}>{r.label}</div><strong>₹{fmt(r.stp)}</strong></div>)}
            </div>
          )}
        </div>
      </div>

      {/* Summary table */}
      {bill && (
        <div className="table-card">
          <div style={{ padding: '16px 20px 0' }}>
            <h3 style={{ margin: '4px 0 16px' }}>Total per Building — {formatLongMonth(month)}</h3>
            {!attendance && (
              <div style={{ background: '#fff7ed', border: '1px solid #ffedd5', color: '#9a3412', padding: '12px 16px', borderRadius: 10, marginBottom: 16, fontSize: '0.9rem' }}>
                ⚠️ <strong>Attendance Data Missing:</strong> Please save the Attendance Register for {formatLongMonth(month)} first to get accurate pro-rated wages.
              </div>
            )}
          </div>

          {/* Desktop: scrollable table */}
          <div className="hk-bill-table-desktop attendance-table-scroll">
            <table className="attendance-table attendance-table--bill">
              <thead>
                <tr>
                  <th style={{ textAlign: 'left' }}>Building</th>
                  <th style={{ textAlign: 'right' }}>Days Present</th>
                  {['Wage', 'Supervisor', 'Common', 'Garbage', 'Tractor', 'STP'].map(h => (
                    <th key={h} style={{ textAlign: 'right' }}>{h}</th>
                  ))}
                  <th style={{ textAlign: 'right', minWidth: '120px' }}>Total (₹)</th>
                </tr>
              </thead>
              <tbody>
                {bill.rows.map((r, i) => (
                  <tr key={r.label}>
                    <td style={{ fontWeight: 700, textAlign: 'left' }}>{r.label}</td>
                    <td style={{ textAlign: 'right', fontWeight: 600, color: '#0F3D35' }}>{r.days.toFixed(1)} days</td>
                    {[r.wage, r.sup, r.com, r.garb, r.tract, r.stp].map((v, j) => (
                      <td key={j} style={{ textAlign: 'right' }}>
                        ₹{fmt(v)}
                      </td>
                    ))}
                    <td style={{ textAlign: 'right', color: '#1a6b3c', fontWeight: 700 }}>
                      ₹{fmt(r.total)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <th style={{ textAlign: 'left' }}>Grand Total</th>
                  <th colSpan={7} />
                  <th style={{ textAlign: 'right', color: '#1a6b3c', fontSize: '1.1rem', fontWeight: 800, borderTop: '2px solid #1a6b3c' }}>₹{fmt(bill.grandTotal)}</th>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Mobile: stacked card view */}
          <div className="hk-bill-cards-mobile" style={{ display: 'none' }}>
            {bill.rows.map(r => (
              <div key={r.label} style={{ padding: '14px 16px', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                <div style={{ fontWeight: 700, fontSize: '1rem', marginBottom: 10, color: '#196c6c' }}>{r.label}</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 16px', fontSize: '0.85rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ opacity: 0.6 }}>Wage</span><strong>₹{fmt(r.wage)}</strong></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ opacity: 0.6 }}>Supervisor</span><strong>₹{fmt(r.sup)}</strong></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ opacity: 0.6 }}>Common</span><strong>₹{fmt(r.com)}</strong></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ opacity: 0.6 }}>Garbage</span><strong>₹{fmt(r.garb)}</strong></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ opacity: 0.6 }}>Tractor</span><strong>₹{fmt(r.tract)}</strong></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ opacity: 0.6 }}>STP</span><strong>₹{fmt(r.stp)}</strong></div>
                </div>
                <div style={{ marginTop: 10, paddingTop: 8, borderTop: '1px dashed rgba(0,0,0,0.1)', display: 'flex', justifyContent: 'space-between', fontSize: '1rem' }}>
                  <span style={{ fontWeight: 700 }}>Total</span>
                  <strong style={{ color: '#1a6b3c' }}>₹{fmt(r.total)}</strong>
                </div>
              </div>
            ))}
            <div style={{ padding: '16px', background: 'rgba(0,0,0,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderRadius: '0 0 14px 14px' }}>
              <span style={{ fontWeight: 700, fontSize: '1.05rem' }}>Grand Total</span>
              <strong style={{ color: '#1a6b3c', fontSize: '1.2rem' }}>₹{fmt(bill.grandTotal)}</strong>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
