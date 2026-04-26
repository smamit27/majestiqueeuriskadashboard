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

export default function HousekeepingBillCalculator() {
  const [month, setMonth]       = useState(getCurrentMonth);
  const [form, setForm]         = useState(DEFAULT_FORM);
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
          setForm({ ...DEFAULT_FORM, ...snap.data().form });
          setSaveMsg(`Loaded from Firebase — ${formatLongMonth(month)}`);
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
    setIsSaving(false);
  }

  function handleChange(field, value) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  const bill = calcBill(form, month);

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

  function Field({ label, field, prefix }) {
    return (
      <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <span style={{ fontSize: '0.75rem', fontWeight: 600, opacity: 0.7 }}>{label}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          {prefix && <span style={{ opacity: 0.5, fontSize: '0.9rem' }}>{prefix}</span>}
          <input
            type="text"
            inputMode="decimal"
            value={form[field]}
            onChange={e => handleChange(field, e.target.value)}
            placeholder="0"
            style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid rgba(0,0,0,0.15)', fontSize: '0.95rem', background: 'rgba(255,255,255,0.8)' }}
          />
        </div>
      </label>
    );
  }

  const sectionStyle = { background: 'rgba(255,255,255,0.6)', borderRadius: 14, padding: '20px 24px', border: '1px solid rgba(0,0,0,0.08)', display: 'flex', flexDirection: 'column', gap: 14 };
  const gridStyle    = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 12 };
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
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>

        {/* Distribution */}
        <div style={sectionStyle}>
          <p style={headingStyle}>🏢 Building Distribution Units</p>
          <p style={{ margin: 0, fontSize: '0.82rem', opacity: 0.6 }}>Number of flats per building — determines cost split ratio</p>
          <div style={gridStyle}>
            <Field label="A Building Units" field="unitsA" />
            <Field label="B Building Units" field="unitsB" />
            <Field label="C Building Units" field="unitsC" />
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
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <Field label="A Building Days" field="aDays" />
            <Field label="A Building Wage (₹)" field="aWage" prefix="₹" />
            <Field label="B Building Days" field="bDays" />
            <Field label="B Building Wage (₹)" field="bWage" prefix="₹" />
            <Field label="C Building Days" field="cDays" />
            <Field label="C Building Wage (₹)" field="cWage" prefix="₹" />
          </div>
        </div>

        {/* Supervisor */}
        <div style={sectionStyle}>
          <p style={headingStyle}>🧑‍💼 Supervisor</p>
          <Field label="Supervisor Monthly Salary (₹)" field="supervisorSalary" prefix="₹" />
          {bill && n(form.supervisorSalary) > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, fontSize: '0.85rem' }}>
              {bill.rows.map(r => <div key={r.label} style={{ textAlign: 'center', padding: '8px', background: 'rgba(0,0,0,0.04)', borderRadius: 8 }}><div style={{ opacity: 0.6, fontSize: '0.75rem' }}>{r.label}</div><strong>₹{fmt(r.sup)}</strong></div>)}
            </div>
          )}
        </div>

        {/* Common Staff */}
        <div style={sectionStyle}>
          <p style={headingStyle}>👥 Common Staff</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <Field label="No. of Staff" field="commonCount" />
            <Field label="Total Salary (₹)" field="commonSalary" prefix="₹" />
            <Field label="Days Absent" field="commonAbsent" />
          </div>
          {bill && n(form.commonSalary) > 0 && (
            <div style={{ fontSize: '0.83rem', display: 'flex', flexDirection: 'column', gap: 4, padding: '10px', background: 'rgba(0,0,0,0.04)', borderRadius: 8 }}>
              <div>Per Day Rate: <strong>₹{fmt(bill.perDay)}</strong></div>
              <div>Deduction ({form.commonAbsent} days): <strong style={{ color: '#e53e3e' }}>- ₹{fmt(bill.deduction)}</strong></div>
              <div>Net Payable: <strong style={{ color: '#276749' }}>₹{fmt(bill.comNet)}</strong></div>
            </div>
          )}
          {bill && n(form.commonSalary) > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, fontSize: '0.85rem' }}>
              {bill.rows.map(r => <div key={r.label} style={{ textAlign: 'center', padding: '8px', background: 'rgba(0,0,0,0.04)', borderRadius: 8 }}><div style={{ opacity: 0.6, fontSize: '0.75rem' }}>{r.label}</div><strong>₹{fmt(r.com)}</strong></div>)}
            </div>
          )}
        </div>

        {/* Garbage */}
        <div style={sectionStyle}>
          <p style={headingStyle}>🗑️ Garbage</p>
          <Field label="Monthly Garbage Amount (₹)" field="garbageTotal" prefix="₹" />
          {bill && n(form.garbageTotal) > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, fontSize: '0.85rem' }}>
              {bill.rows.map(r => <div key={r.label} style={{ textAlign: 'center', padding: '8px', background: 'rgba(0,0,0,0.04)', borderRadius: 8 }}><div style={{ opacity: 0.6, fontSize: '0.75rem' }}>{r.label}</div><strong>₹{fmt(r.garb)}</strong></div>)}
            </div>
          )}
        </div>

        {/* Tractor */}
        <div style={sectionStyle}>
          <p style={headingStyle}>🚜 Tractor</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <Field label="Rate per Trip (₹)" field="tractorRate" prefix="₹" />
            <Field label="No. of Trips" field="tractorTrips" />
          </div>
          {bill && bill.tractTotal > 0 && (
            <>
              <div style={{ fontSize: '0.83rem', padding: '8px 10px', background: 'rgba(0,0,0,0.04)', borderRadius: 8 }}>
                Total: ₹{form.tractorRate} × {form.tractorTrips} trips = <strong>₹{fmt(bill.tractTotal)}</strong>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, fontSize: '0.85rem' }}>
                {bill.rows.map(r => <div key={r.label} style={{ textAlign: 'center', padding: '8px', background: 'rgba(0,0,0,0.04)', borderRadius: 8 }}><div style={{ opacity: 0.6, fontSize: '0.75rem' }}>{r.label}</div><strong>₹{fmt(r.tract)}</strong></div>)}
              </div>
            </>
          )}
        </div>

        {/* STP */}
        <div style={sectionStyle}>
          <p style={headingStyle}>💧 STP Operator</p>
          <Field label="STP Operator Monthly Salary (₹)" field="stpSalary" prefix="₹" />
          {bill && n(form.stpSalary) > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, fontSize: '0.85rem' }}>
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
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ background: 'rgba(0,0,0,0.06)' }}>
                  {['Building', 'Wage', 'Supervisor', 'Common', 'Garbage', 'Tractor', 'STP', 'Total'].map(h => (
                    <th key={h} style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 700, whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {bill.rows.map((r, i) => (
                  <tr key={r.label} style={{ background: i % 2 === 0 ? 'transparent' : 'rgba(0,0,0,0.02)' }}>
                    <td style={{ padding: '10px 14px', fontWeight: 700 }}>{r.label}</td>
                    {[r.wage, r.sup, r.com, r.garb, r.tract, r.stp, r.total].map((v, j) => (
                      <td key={j} style={{ padding: '10px 14px', textAlign: 'right', color: j === 6 ? '#1a6b3c' : 'inherit', fontWeight: j === 6 ? 700 : 400 }}>
                        ₹{fmt(v)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ background: 'rgba(0,0,0,0.08)', fontWeight: 700 }}>
                  <td style={{ padding: '10px 14px' }}>Grand Total</td>
                  <td colSpan={6} />
                  <td style={{ padding: '10px 14px', textAlign: 'right', color: '#1a6b3c', fontSize: '1.05rem' }}>₹{fmt(bill.grandTotal)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
