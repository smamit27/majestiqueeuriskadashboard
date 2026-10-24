import { useCallback, useEffect, useRef, useState } from 'react';
import { doc, getDoc, serverTimestamp, setDoc, deleteDoc, onSnapshot } from 'firebase/firestore';
import * as XLSX from 'xlsx';
import { db, ensureFirebaseSession, isFirebaseConfigured } from '../../firebase.js';
import { calcBill, daysInMonth } from '../../utils/housekeepingUtils.js';
import './HousekeepingBillCalculator.css';


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

// ─── Field component (defined OUTSIDE main component so it never remounts) ────
function Field({ label, value, onChange, prefix }) {
  return (
    <label className="housekeeping-bill-calculator-s1">
      <span className="housekeeping-bill-calculator-s2">{label}</span>
      <div className="housekeeping-bill-calculator-s3">
        {prefix && <span className="housekeeping-bill-calculator-s4">{prefix}</span>}
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
          className="housekeeping-bill-calculator-s5"
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

  function handlePrintPDF() {
    if (!bill) return;
    const days = daysInMonth(month);
    const generatedDate = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    const tractorTripsCount = attendance && !form.overrideTractorTrips ? attendance.tractorTrip : (form.tractorTrips !== '' ? n(form.tractorTrips) : 0);
    const commonDaysCount = attendance ? attendance.common : (form.commonCount !== '' ? (n(form.commonCount) * days - n(form.commonAbsent)) : days);

    const printDoc = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="utf-8">
        <title>Housekeeping Bill - ${formatLongMonth(month)} - Majestique Euriska</title>
        <style>
          * { box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
          body { margin: 0; padding: 24px; color: #0f172a; background: #ffffff; }
          .header { border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: flex-end; }
          .title { font-size: 19px; font-weight: 800; color: #0f172a; margin: 0; }
          .subtitle { font-size: 13px; color: #475569; margin-top: 4px; }
          .meta { font-size: 11px; color: #475569; text-align: right; }
          
          .kpi-row {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 10px;
            margin-bottom: 16px;
          }
          .kpi-card {
            background: #f8fafc;
            border: 1px solid #cbd5e1;
            border-radius: 8px;
            padding: 8px 12px;
            text-align: center;
          }
          .kpi-label { font-size: 10px; text-transform: uppercase; color: #64748b; font-weight: 700; }
          .kpi-value { font-size: 15px; font-weight: 800; color: #0f172a; margin-top: 2px; }

          .section-title { font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #1e293b; margin: 14px 0 6px 0; }
          
          table { width: 100%; border-collapse: collapse; font-size: 11px; margin-bottom: 14px; }
          th { background: #f1f5f9; color: #1e293b; font-weight: 700; text-align: right; padding: 6px 8px; border: 1px solid #94a3b8; font-size: 10px; }
          th:first-child { text-align: left; }
          td { padding: 6px 8px; border: 1px solid #cbd5e1; color: #0f172a; text-align: right; }
          td:first-child { text-align: left; }
          tr:nth-child(even) { background: #f8fafc; }
          .total-row { background: #e2e8f0 !important; font-weight: 800; color: #0f172a; }
          .grand-cell { font-size: 13px; color: #15803d; font-weight: 800; }

          .signatures { margin-top: 30px; display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; padding-top: 14px; border-top: 1px dashed #cbd5e1; }
          .sig-box { text-align: center; font-size: 11px; color: #475569; }
          .sig-line { margin-top: 36px; border-top: 1px solid #94a3b8; padding-top: 4px; font-weight: 600; }

          .footer {
            margin-top: 20px;
            border-top: 1px solid #cbd5e1;
            padding-top: 8px;
            font-size: 10px;
            color: #64748b;
            display: flex;
            justify-content: space-between;
          }
          
          @media print {
            body { padding: 0; }
            @page { margin: 1cm; size: A4 portrait; }
            thead { display: table-header-group; }
            tr { page-break-inside: avoid; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <h1 class="title">🧹 MAJESTIQUE EURISKA 'A' BUILDING CO-OP HOUSING SOCIETY LTD.</h1>
            <div class="subtitle">Reg. No: PNA/PNA (4)/HSG/(TC)/21207/2019-20 • S. No. 2, Plot No C-1, Village Mohammed Wadi, Taluka Haveli, Pune - 411060</div>
            <div style="font-size: 11px; color: #64748b; margin-top: 2px;">Housekeeping &amp; Facility Management Monthly Bill Breakdown</div>
          </div>
          <div class="meta">
            <div><strong>Billing Month:</strong> ${formatLongMonth(month)}</div>
            <div><strong>Generated On:</strong> ${generatedDate}</div>
            <div><strong>Ratio:</strong> A (${form.unitsA}) · B (${form.unitsB}) · C (${form.unitsC}) = ${n(form.unitsA) + n(form.unitsB) + n(form.unitsC)} Flats</div>
          </div>
        </div>

        <div class="kpi-row">
          <div class="kpi-card">
            <div class="kpi-label">A Building Share</div>
            <div class="kpi-value" style="color: #0369a1;">₹${fmt(bill.rows[0].total)}</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">B Building Share</div>
            <div class="kpi-value" style="color: #0369a1;">₹${fmt(bill.rows[1].total)}</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">C Building Share</div>
            <div class="kpi-value" style="color: #0369a1;">₹${fmt(bill.rows[2].total)}</div>
          </div>
          <div class="kpi-card" style="background: #f0fdf4; border-color: #86efac;">
            <div class="kpi-label" style="color: #15803d;">Grand Total Bill</div>
            <div class="kpi-value" style="color: #15803d;">₹${fmt(bill.grandTotal)}</div>
          </div>
        </div>

        <div class="section-title">1. Summary Breakdown per Building</div>
        <table>
          <thead>
            <tr>
              <th>Building</th>
              <th>Days Present</th>
              <th>Wage (₹)</th>
              <th>Supervisor (₹)</th>
              <th>Common (₹)</th>
              <th>Garbage (₹)</th>
              <th>Tractor (₹)</th>
              <th>STP (₹)</th>
              <th>Total Share (₹)</th>
            </tr>
          </thead>
          <tbody>
            ${bill.rows.map(r => `
              <tr>
                <td style="font-weight: 700;">${r.label}</td>
                <td>${r.days.toFixed(1)} days</td>
                <td>₹${fmt(r.wage)}</td>
                <td>₹${fmt(r.sup)}</td>
                <td>₹${fmt(r.com)}</td>
                <td>₹${fmt(r.garb)}</td>
                <td>₹${fmt(r.tract)}</td>
                <td>₹${fmt(r.stp)}</td>
                <td style="font-weight: 700; color: #15803d;">₹${fmt(r.total)}</td>
              </tr>
            `).join('')}
            <tr class="total-row">
              <td>Grand Total</td>
              <td>—</td>
              <td>₹${fmt(bill.rows.reduce((s, r) => s + r.wage, 0))}</td>
              <td>₹${fmt(bill.rows.reduce((s, r) => s + r.sup, 0))}</td>
              <td>₹${fmt(bill.rows.reduce((s, r) => s + r.com, 0))}</td>
              <td>₹${fmt(bill.rows.reduce((s, r) => s + r.garb, 0))}</td>
              <td>₹${fmt(bill.rows.reduce((s, r) => s + r.tract, 0))}</td>
              <td>₹${fmt(bill.rows.reduce((s, r) => s + r.stp, 0))}</td>
              <td class="grand-cell">₹${fmt(bill.grandTotal)}</td>
            </tr>
          </tbody>
        </table>

        <div class="section-title">2. Cost Parameters & Basis of Computation</div>
        <table>
          <thead>
            <tr>
              <th>Cost Head</th>
              <th>Base Rate / Monthly Wage</th>
              <th>Attendance / Utilization</th>
              <th>Net Total</th>
              <th>Cost Splitting Rule</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>A Building Manpower</td>
              <td>₹${fmt(form.aWage)} / mo</td>
              <td>${bill.rows[0].days.toFixed(1)} days</td>
              <td>₹${fmt(bill.rows[0].wage)}</td>
              <td>100% charged to A Building</td>
            </tr>
            <tr>
              <td>B Building Manpower</td>
              <td>₹${fmt(form.bWage)} / mo</td>
              <td>${bill.rows[1].days.toFixed(1)} days</td>
              <td>₹${fmt(bill.rows[1].wage)}</td>
              <td>100% charged to B Building</td>
            </tr>
            <tr>
              <td>C Building Manpower</td>
              <td>₹${fmt(form.cWage)} / mo</td>
              <td>${bill.rows[2].days.toFixed(1)} days</td>
              <td>₹${fmt(bill.rows[2].wage)}</td>
              <td>100% charged to C Building</td>
            </tr>
            <tr>
              <td>Supervisor</td>
              <td>₹${fmt(form.supervisorSalary)} / mo</td>
              <td>${attendance ? attendance.supervisor : (form.supervisorDays || days)} days</td>
              <td>₹${fmt(bill.rows.reduce((s, r) => s + r.sup, 0))}</td>
              <td>Prorated by flat ratio (A: 87, B: 96, C: 48)</td>
            </tr>
            <tr>
              <td>Common Staff</td>
              <td>₹${fmt(form.commonSalary)} / mo</td>
              <td>${commonDaysCount} total person-days</td>
              <td>₹${fmt(bill.comNet)}</td>
              <td>Prorated by flat ratio</td>
            </tr>
            <tr>
              <td>Garbage Collection</td>
              <td>₹${fmt(form.garbageTotal)} / mo</td>
              <td>Monthly Fixed</td>
              <td>₹${fmt(form.garbageTotal)}</td>
              <td>Prorated by flat ratio</td>
            </tr>
            <tr>
              <td>Tractor Garbage Trips</td>
              <td>₹${fmt(form.tractorRate)} / trip</td>
              <td>${tractorTripsCount} Trips</td>
              <td>₹${fmt(n(form.tractorRate) * tractorTripsCount)}</td>
              <td>Prorated by flat ratio</td>
            </tr>
            <tr>
              <td>STP Operator</td>
              <td>₹${fmt(form.stpSalary)} / mo</td>
              <td>Monthly Fixed</td>
              <td>₹${fmt(form.stpSalary)}</td>
              <td>Prorated by flat ratio</td>
            </tr>
          </tbody>
        </table>

        <div class="signatures">
          <div class="sig-box">
            <div class="sig-line">Housekeeping Supervisor / Vendor</div>
          </div>
          <div class="sig-box">
            <div class="sig-line">Housekeeping Committee Lead</div>
          </div>
          <div class="sig-box">
            <div class="sig-line">Society Treasurer / Chairman</div>
          </div>
        </div>

        <div class="footer">
          <div>Majestique Euriska Co-Op Housing Society Ltd. • Official Housekeeping Billing Record</div>
          <div>Page 1 of 1</div>
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
      printWindow.document.write(printDoc);
      printWindow.document.close();
    }
  }

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
    <div className="housekeeping-bill-calculator-s6">

      {/* Month tabs + header */}
      <div className="table-card attendance-table-card attendance-table-card--register housekeeping-bill-calculator-s7">
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
            <h3>Bill — {formatLongMonth(month)}</h3>
          </div>
          <div className="attendance-table-card__actions">
            <div className="housekeeping-bill-calculator-s8" style={{ color: badge.c }}>
              <span>{badge.i}</span>
              <span>{isLoading ? 'Loading…' : saveMsg || 'Ready'}</span>
            </div>
            <div className="housekeeping-bill-calculator-s9">
              <button
                className="button-secondary"
                type="button"
                onClick={handleManualSave}
                disabled={isSaving || isLoading}
              >
                {isSaving ? 'Saving…' : '💾 Save'}
              </button>
              <button
                className="button-secondary housekeeping-bill-calculator-s10"
                type="button"
                onClick={handlePrintPDF}
                disabled={!bill}
              >
                🖨️ Print Bill (PDF)
              </button>
              <button className="button-secondary" type="button" onClick={handleDownloadExcel} disabled={!bill}>
                ⬇ Excel
              </button>
              <button
                className="button-secondary housekeeping-bill-calculator-s11"
                type="button"
                onClick={handleDeleteBill}
              >
                🗑️ Clear
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Input sections */}
      <div className="housekeeping-bill-calculator-s12">

        {/* Distribution */}
        <div style={sectionStyle}>
          <p style={headingStyle}>🏢 Building Distribution Units</p>
          <p className="housekeeping-bill-calculator-s13">Number of flats per building — determines cost split ratio</p>
          <div style={gridStyle}>
            <Field label="A Building Units" value={form.unitsA} onChange={v => handleChange('unitsA', v)} />
            <Field label="B Building Units" value={form.unitsB} onChange={v => handleChange('unitsB', v)} />
            <Field label="C Building Units" value={form.unitsC} onChange={v => handleChange('unitsC', v)} />
          </div>
          {bill && (
            <div className="housekeeping-bill-calculator-s14">
              Ratio — A: {(bill.ratioA * 100).toFixed(1)}% · B: {(bill.ratioB * 100).toFixed(1)}% · C: {(bill.ratioC * 100).toFixed(1)}%
            </div>
          )}
        </div>

        {/* Building Manpower */}
        <div style={sectionStyle}>
          <p style={headingStyle}>👷 Building Manpower Wages</p>
          <div className="housekeeping-bill-calculator-s15">
            <Field label="A Building Wage (₹)" value={form.aWage} onChange={v => handleChange('aWage', v)} prefix="₹" />
            {!attendance && <Field label="A Building Days" value={form.aDays} onChange={v => handleChange('aDays', v)} />}

            <Field label="B Building Wage (₹)" value={form.bWage} onChange={v => handleChange('bWage', v)} prefix="₹" />
            {!attendance && <Field label="B Building Days" value={form.bDays} onChange={v => handleChange('bDays', v)} />}

            <Field label="C Building Wage (₹)" value={form.cWage} onChange={v => handleChange('cWage', v)} prefix="₹" />
            {!attendance && <Field label="C Building Days" value={form.cDays} onChange={v => handleChange('cDays', v)} />}
          </div>
          {attendance ? (
            <div className="housekeeping-bill-calculator-s16">
              <div className="housekeeping-bill-calculator-s17">Days present from attendance:</div>
              <div>A: <strong>{attendance.a.toFixed(1)} days</strong> (₹{fmt(bill ? bill.rows[0].wage : 0)})</div>
              <div>B: <strong>{attendance.b.toFixed(1)} days</strong> (₹{fmt(bill ? bill.rows[1].wage : 0)})</div>
              <div>C: <strong>{attendance.c.toFixed(1)} days</strong> (₹{fmt(bill ? bill.rows[2].wage : 0)})</div>
            </div>
          ) : (
            <div className="housekeeping-bill-calculator-s18">
              ⚠️ Attendance register missing. Using manual days entry.
            </div>
          )}
        </div>

        {/* Supervisor */}
        <div style={sectionStyle}>
          <p style={headingStyle}>🧑‍💼 Supervisor</p>
          <div className="housekeeping-bill-calculator-s15">
            <Field label="Monthly Wage (₹)" value={form.supervisorSalary} onChange={v => handleChange('supervisorSalary', v)} prefix="₹" />
            {!attendance && <Field label="Supervisor Days Present" value={form.supervisorDays} onChange={v => handleChange('supervisorDays', v)} />}
          </div>
          {bill && n(form.supervisorSalary) > 0 && (
            <div className="housekeeping-bill-calculator-s19">
              Actual Cost: (₹{form.supervisorSalary} / {daysInMonth(month)}) × {attendance ? attendance.supervisor : (form.supervisorDays !== '' ? n(form.supervisorDays) : daysInMonth(month))} days = <strong>₹{fmt((n(form.supervisorSalary) / daysInMonth(month)) * (attendance ? attendance.supervisor : (form.supervisorDays !== '' ? n(form.supervisorDays) : daysInMonth(month))))}</strong>
            </div>
          )}
          {bill && n(form.supervisorSalary) > 0 && (
            <div className="housekeeping-bill-calculator-s20">
              {bill.rows.map(r => <div key={r.label} className="housekeeping-bill-calculator-s21"><div className="housekeeping-bill-calculator-s22">{r.label}</div><strong>₹{fmt(r.sup)}</strong></div>)}
            </div>
          )}
        </div>

        {/* Common Staff */}
        <div style={sectionStyle}>
          <p style={headingStyle}>👥 Common Staff</p>
          <div className="housekeeping-bill-calculator-s15">
            <Field label="Total Salary (₹)" value={form.commonSalary} onChange={v => handleChange('commonSalary', v)} prefix="₹" />
            {!attendance && (
              <>
                <Field label="No. of Staff" value={form.commonCount} onChange={v => handleChange('commonCount', v)} />
                <Field label="Days Absent" value={form.commonAbsent} onChange={v => handleChange('commonAbsent', v)} />
              </>
            )}
          </div>
          {bill && n(form.commonSalary) > 0 && (
            <div className="housekeeping-bill-calculator-s23">
              {attendance ? (
                <>
                  <div>Days present from attendance: <strong>{attendance.common.toFixed(1)} days</strong></div>
                  <div>Net Payable: <strong className="housekeeping-bill-calculator-s24">₹{fmt(bill.comNet)}</strong></div>
                </>
              ) : (
                <>
                  <div>Net Payable (manual): <strong className="housekeeping-bill-calculator-s24">₹{fmt(bill.comNet)}</strong></div>
                </>
              )}
            </div>
          )}
          {bill && n(form.commonSalary) > 0 && (
            <div className="housekeeping-bill-calculator-s20">
              {bill.rows.map(r => <div key={r.label} className="housekeeping-bill-calculator-s21"><div className="housekeeping-bill-calculator-s22">{r.label}</div><strong>₹{fmt(r.com)}</strong></div>)}
            </div>
          )}
        </div>

        {/* Garbage */}
        <div style={sectionStyle}>
          <p style={headingStyle}>🗑️ Garbage</p>
          <Field label="Monthly Garbage Amount (₹)" value={form.garbageTotal} onChange={v => handleChange('garbageTotal', v)} prefix="₹" />
          {bill && n(form.garbageTotal) > 0 && (
            <div className="housekeeping-bill-calculator-s20">
              {bill.rows.map(r => <div key={r.label} className="housekeeping-bill-calculator-s21"><div className="housekeeping-bill-calculator-s22">{r.label}</div><strong>₹{fmt(r.garb)}</strong></div>)}
            </div>
          )}
        </div>

        {/* Tractor */}
        <div style={sectionStyle}>
          <p style={headingStyle}>🚜 Tractor</p>
          <div className="housekeeping-bill-calculator-s15">
            <Field label="Rate per Trip (₹)" value={form.tractorRate} onChange={v => handleChange('tractorRate', v)} prefix="₹" />
            {(form.overrideTractorTrips || !attendance) ? (
              <Field label="No. of Trips" value={form.tractorTrips} onChange={v => handleChange('tractorTrips', v)} />
            ) : (
              <div className="housekeeping-bill-calculator-s1">
                <span className="housekeeping-bill-calculator-s2">No. of Trips (Auto)</span>
                <div className="housekeeping-bill-calculator-s25">
                  {attendance.tractorTrip} trips (from Attendance)
                </div>
              </div>
            )}
          </div>
          {attendance && (
            <label className="housekeeping-bill-calculator-s26">
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
              <div className="housekeeping-bill-calculator-s27">
                Total: ₹{form.tractorRate} × {attendance && !form.overrideTractorTrips ? attendance.tractorTrip : (form.tractorTrips !== '' ? n(form.tractorTrips) : 0)} trips = <strong>₹{fmt(bill.tractTotal)}</strong>
              </div>
              {bill.tractTotal > 0 && (
                <div className="housekeeping-bill-calculator-s20">
                  {bill.rows.map(r => <div key={r.label} className="housekeeping-bill-calculator-s21"><div className="housekeeping-bill-calculator-s22">{r.label}</div><strong>₹{fmt(r.tract)}</strong></div>)}
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
            <div className="housekeeping-bill-calculator-s20">
              {bill.rows.map(r => <div key={r.label} className="housekeeping-bill-calculator-s21"><div className="housekeeping-bill-calculator-s22">{r.label}</div><strong>₹{fmt(r.stp)}</strong></div>)}
            </div>
          )}
        </div>
      </div>

      {/* Summary table */}
      {bill && (
        <div className="table-card">
          <div className="housekeeping-bill-calculator-s28">
            <h3 className="housekeeping-bill-calculator-s29">Total per Building — {formatLongMonth(month)}</h3>
            {!attendance && (
              <div className="housekeeping-bill-calculator-s30">
                ⚠️ <strong>Attendance Data Missing:</strong> Please save the Attendance Register for {formatLongMonth(month)} first to get accurate pro-rated wages.
              </div>
            )}
          </div>

          {/* Desktop: scrollable table */}
          <div className="hk-bill-table-desktop attendance-table-scroll">
            <table className="attendance-table attendance-table--bill">
              <thead>
                <tr>
                  <th className="housekeeping-bill-calculator-s31">Building</th>
                  <th className="housekeeping-bill-calculator-s32">Days Present</th>
                  {['Wage', 'Supervisor', 'Common', 'Garbage', 'Tractor', 'STP'].map(h => (
                    <th key={h} className="housekeeping-bill-calculator-s32">{h}</th>
                  ))}
                  <th className="housekeeping-bill-calculator-s33">Total (₹)</th>
                </tr>
              </thead>
              <tbody>
                {bill.rows.map((r, i) => (
                  <tr key={r.label}>
                    <td className="housekeeping-bill-calculator-s34">{r.label}</td>
                    <td className="housekeeping-bill-calculator-s35">{r.days.toFixed(1)} days</td>
                    {[r.wage, r.sup, r.com, r.garb, r.tract, r.stp].map((v, j) => (
                      <td key={j} className="housekeeping-bill-calculator-s32">
                        ₹{fmt(v)}
                      </td>
                    ))}
                    <td className="housekeeping-bill-calculator-s36">
                      ₹{fmt(r.total)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <th className="housekeeping-bill-calculator-s31">Grand Total</th>
                  <th colSpan={7} />
                  <th className="housekeeping-bill-calculator-s37">₹{fmt(bill.grandTotal)}</th>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Mobile: stacked card view */}
          <div className="hk-bill-cards-mobile housekeeping-bill-calculator-s38">
            {bill.rows.map(r => (
              <div key={r.label} className="housekeeping-bill-calculator-s39">
                <div className="housekeeping-bill-calculator-s40">{r.label}</div>
                <div className="housekeeping-bill-calculator-s41">
                  <div className="housekeeping-bill-calculator-s42"><span className="housekeeping-bill-calculator-s43">Wage</span><strong>₹{fmt(r.wage)}</strong></div>
                  <div className="housekeeping-bill-calculator-s42"><span className="housekeeping-bill-calculator-s43">Supervisor</span><strong>₹{fmt(r.sup)}</strong></div>
                  <div className="housekeeping-bill-calculator-s42"><span className="housekeeping-bill-calculator-s43">Common</span><strong>₹{fmt(r.com)}</strong></div>
                  <div className="housekeeping-bill-calculator-s42"><span className="housekeeping-bill-calculator-s43">Garbage</span><strong>₹{fmt(r.garb)}</strong></div>
                  <div className="housekeeping-bill-calculator-s42"><span className="housekeeping-bill-calculator-s43">Tractor</span><strong>₹{fmt(r.tract)}</strong></div>
                  <div className="housekeeping-bill-calculator-s42"><span className="housekeeping-bill-calculator-s43">STP</span><strong>₹{fmt(r.stp)}</strong></div>
                </div>
                <div className="housekeeping-bill-calculator-s44">
                  <span className="housekeeping-bill-calculator-s45">Total</span>
                  <strong className="housekeeping-bill-calculator-s46">₹{fmt(r.total)}</strong>
                </div>
              </div>
            ))}
            <div className="housekeeping-bill-calculator-s47">
              <span className="housekeeping-bill-calculator-s48">Grand Total</span>
              <strong className="housekeeping-bill-calculator-s49">₹{fmt(bill.grandTotal)}</strong>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
