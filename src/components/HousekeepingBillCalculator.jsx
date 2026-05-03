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
  aDays: '', aWage: '',
  bDays: '', bWage: '',
  cDays: '', cWage: '',
  // Supervisor
  supervisorSalary: '',
  // Common Staff
  commonCount: '', commonSalary: '', commonAbsent: '',
  // Garbage
  garbageTotal: '',
  // Tractor
  tractorRate: '', tractorTrips: '',
  // STP
  stpSalary: '',
};

function calcBill(form, mv) {
  const totalUnits = n(form.unitsA) + n(form.unitsB) + n(form.unitsC);
  if (totalUnits === 0) return null;

  const ratioA = n(form.unitsA) / totalUnits;
  const ratioB = n(form.unitsB) / totalUnits;
  const ratioC = n(form.unitsC) / totalUnits;

  // Buildings
  const aWage = n(form.aWage);
  const bWage = n(form.bWage);
  const cWage = n(form.cWage);

  // Supervisor
  const supTotal = n(form.supervisorSalary);
  const supA = supTotal * ratioA;
  const supB = supTotal * ratioB;
  const supC = supTotal * ratioC;

  // Common Staff
  const comSalary = n(form.commonSalary);
  const comCount  = n(form.commonCount) || 1;
  const days      = daysInMonth(mv);
  const perDay    = comSalary / (comCount * days);
  const deduction = n(form.commonAbsent) * perDay;
  const comNet    = comSalary - deduction;
  const comA = comNet * ratioA;
  const comB = comNet * ratioB;
  const comC = comNet * ratioC;

  // Garbage
  const garbTotal = n(form.garbageTotal);
  const garbA = garbTotal * ratioA;
  const garbB = garbTotal * ratioB;
  const garbC = garbTotal * ratioC;

  // Tractor
  const tractTotal = n(form.tractorRate) * n(form.tractorTrips);
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
    perDay, deduction, comNet,
    tractTotal,
    rows: [
      { label: 'A Building', wage: aWage, sup: supA, com: comA, garb: garbA, tract: tractA, stp: stpA, total: totalA },
      { label: 'B Building', wage: bWage, sup: supB, com: comB, garb: garbB, tract: tractB, stp: stpB, total: totalB },
      { label: 'C Building', wage: cWage, sup: supC, com: comC, garb: garbC, tract: tractC, stp: stpC, total: totalC },
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
  const [month, setMonth]       = useState(getCurrentMonth);
  const [form, setForm]         = useState(DEFAULT_FORM);
  const [savedForm, setSavedForm] = useState(null);   // bill only updates on Save
  const [saveStatus, setSave]   = useState('idle');
  const [saveMsg, setSaveMsg]   = useState('');
  const [isLoading, setLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const loadedRef  = useRef(false);
  const timerRef   = useRef(null);
  const recordId   = `hk_bill_${month}`;

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
          setSavedForm(loaded);   // initialise summary from Firebase
          setSaveMsg(`Loaded from Firebase — ${formatLongMonth(month)}`);
        } else if (!cancelled) {
          setForm(DEFAULT_FORM);
          setSavedForm(null);
          setSaveMsg(`New bill — ${formatLongMonth(month)}`);
        }
      } catch (e) { console.error(e); }
      finally { if (!cancelled) { setLoading(false); loadedRef.current = true; } }
    }
    load();
    return () => { cancelled = true; };
  }, [recordId, month]);

  const saveToFirebase = useCallback(async (currentForm, currentId) => {
    setSave('saving');
    try {
      await ensureFirebaseSession();
      await setDoc(doc(db, 'housekeepingBillCalculations', currentId),
        { form: currentForm, updatedAt: serverTimestamp() }, { merge: true });
      setSave('saved'); setSaveMsg('Saved to Firebase ✓');
    } catch (e) { setSave('error'); setSaveMsg('Save failed.'); }
  }, []);

  async function handleManualSave() {
    clearTimeout(timerRef.current);
    setIsSaving(true);
    await saveToFirebase(form, recordId);
    setSavedForm(form);   // freeze the summary table at this snapshot
    setIsSaving(false);
  }

  function handleChange(field, value) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  const bill = savedForm ? calcBill(savedForm, month) : null;  // only updates on Save

  function handleDownloadExcel() {
    if (!bill) return;
    const days = daysInMonth(month);

    const rows = [
      [`Housekeeping Bill Calculation — ${formatLongMonth(month)}`],
      [],
      ['Category', '', 'A Building', 'B Building', 'C Building'],
      ['Building Units (ratio)', '', form.unitsA, form.unitsB, form.unitsC],
      [],
      ['A Building Manpower', 'Days', form.aDays, 'Wage', form.aWage],
      ['B Building Manpower', 'Days', form.bDays, 'Wage', form.bWage],
      ['C Building Manpower', 'Days', form.cDays, 'Wage', form.cWage],
      [],
      ['Supervisor Salary', n(form.supervisorSalary), bill.rows[0].sup, bill.rows[1].sup, bill.rows[2].sup],
      [],
      ['Common Staff', 'Count', form.commonCount, 'Total Salary', form.commonSalary],
      ['', 'Days in Month', days, 'Per Day Rate', bill.perDay.toFixed(2)],
      ['', 'Days Absent', form.commonAbsent, 'Deduction', bill.deduction.toFixed(2)],
      ['', 'Net Amount', bill.comNet.toFixed(2), '', ''],
      ['Common Staff (net)', bill.comNet, bill.rows[0].com, bill.rows[1].com, bill.rows[2].com],
      [],
      ['Garbage', n(form.garbageTotal), bill.rows[0].garb, bill.rows[1].garb, bill.rows[2].garb],
      [],
      ['Tractor', `Rate: ${form.tractorRate} × Trips: ${form.tractorTrips}`, bill.rows[0].tract, bill.rows[1].tract, bill.rows[2].tract],
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

  const badge = { idle: { c: '#6b7280', i: '●' }, pending: { c: '#f59e0b', i: '⏳' }, saving: { c: '#3b82f6', i: '↑' }, saved: { c: '#10b981', i: '✓' }, error: { c: '#ef4444', i: '✗' } }[saveStatus];


  const sectionStyle = { background: 'rgba(255,255,255,0.6)', borderRadius: 14, padding: '20px 24px', border: '1px solid rgba(0,0,0,0.08)', display: 'flex', flexDirection: 'column', gap: 14 };
  const gridStyle    = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 130px), 1fr))', gap: 12 };
  const headingStyle = { margin: 0, fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', opacity: 0.6 };

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
                {isSaving ? 'Saving…' : '💾 Save Bill'}
              </button>
              <button className="button-secondary" type="button" onClick={handleDownloadExcel} disabled={!bill}>
                ⬇ Download Excel
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
            <Field label="A Building Days" value={form.aDays} onChange={v => handleChange('aDays', v)} />
            <Field label="A Building Wage (₹)" value={form.aWage} onChange={v => handleChange('aWage', v)} prefix="₹" />
            <Field label="B Building Days" value={form.bDays} onChange={v => handleChange('bDays', v)} />
            <Field label="B Building Wage (₹)" value={form.bWage} onChange={v => handleChange('bWage', v)} prefix="₹" />
            <Field label="C Building Days" value={form.cDays} onChange={v => handleChange('cDays', v)} />
            <Field label="C Building Wage (₹)" value={form.cWage} onChange={v => handleChange('cWage', v)} prefix="₹" />
          </div>
        </div>

        {/* Supervisor */}
        <div style={sectionStyle}>
          <p style={headingStyle}>🧑‍💼 Supervisor</p>
          <Field label="Supervisor Monthly Salary (₹)" value={form.supervisorSalary} onChange={v => handleChange('supervisorSalary', v)} prefix="₹" />
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
            <Field label="No. of Staff" value={form.commonCount} onChange={v => handleChange('commonCount', v)} />
            <Field label="Total Salary (₹)" value={form.commonSalary} onChange={v => handleChange('commonSalary', v)} prefix="₹" />
            <Field label="Days Absent" value={form.commonAbsent} onChange={v => handleChange('commonAbsent', v)} />
          </div>
          {bill && n(form.commonSalary) > 0 && (
            <div style={{ fontSize: '0.83rem', display: 'flex', flexDirection: 'column', gap: 4, padding: '10px', background: 'rgba(0,0,0,0.04)', borderRadius: 8 }}>
              <div>Per Day Rate: <strong>₹{fmt(bill.perDay)}</strong></div>
              <div>Deduction ({form.commonAbsent} days): <strong style={{ color: '#e53e3e' }}>- ₹{fmt(bill.deduction)}</strong></div>
              <div>Net Payable: <strong style={{ color: '#276749' }}>₹{fmt(bill.comNet)}</strong></div>
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
            <Field label="No. of Trips" value={form.tractorTrips} onChange={v => handleChange('tractorTrips', v)} />
          </div>
          {bill && bill.tractTotal > 0 && (
            <>
              <div style={{ fontSize: '0.83rem', padding: '8px 10px', background: 'rgba(0,0,0,0.04)', borderRadius: 8 }}>
                Total: ₹{form.tractorRate} × {form.tractorTrips} trips = <strong>₹{fmt(bill.tractTotal)}</strong>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 90px), 1fr))', gap: 8, fontSize: '0.85rem' }}>
                {bill.rows.map(r => <div key={r.label} style={{ textAlign: 'center', padding: '8px', background: 'rgba(0,0,0,0.04)', borderRadius: 8 }}><div style={{ opacity: 0.6, fontSize: '0.75rem' }}>{r.label}</div><strong>₹{fmt(r.tract)}</strong></div>)}
              </div>
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
            <p className="eyebrow">Bill Summary</p>
            <h3 style={{ margin: '4px 0 16px' }}>Total per Building — {formatLongMonth(month)}</h3>
          </div>

          {/* Desktop: scrollable table */}
          <div className="hk-bill-table-desktop attendance-table-scroll">
            <table className="attendance-table attendance-table--bill">
              <thead>
                <tr>
                  {['Building', 'Wage', 'Supervisor', 'Common', 'Garbage', 'Tractor', 'STP', 'Total'].map(h => (
                    <th key={h} style={{ textAlign: 'right' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {bill.rows.map((r, i) => (
                  <tr key={r.label}>
                    <td style={{ fontWeight: 700 }}>{r.label}</td>
                    {[r.wage, r.sup, r.com, r.garb, r.tract, r.stp, r.total].map((v, j) => (
                      <td key={j} style={{ textAlign: 'right', color: j === 6 ? '#1a6b3c' : 'inherit', fontWeight: j === 6 ? 700 : 400 }}>
                        ₹{fmt(v)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <th>Grand Total</th>
                  <th colSpan={6} />
                  <th style={{ textAlign: 'right', color: '#1a6b3c', fontSize: '1.05rem' }}>₹{fmt(bill.grandTotal)}</th>
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
