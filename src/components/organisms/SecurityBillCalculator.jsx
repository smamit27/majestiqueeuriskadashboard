import { useCallback, useEffect, useRef, useState } from 'react';
import { doc, getDoc, serverTimestamp, setDoc, deleteDoc } from 'firebase/firestore';
import * as XLSX from 'xlsx';
import { db, ensureFirebaseSession, isFirebaseConfigured } from '../../firebase.js';
import './SecurityBillCalculator.css';


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

const ATT_KEYS = {
  'A Building': 'a',
  'B Building': 'b',
  'C Building': 'c',
};

const DEFAULT_FORM = {
  chauhanSalary: '20000',
  vendorMornSalary: '12000',
  vendorEveSalary: '12000',
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

  // Main gate — split by flat ratio. Prorated by main gate shifts if available.
  const mainGateMonthlyPerGuard = n(form.mainGateGuardSalary);
  const mainGateTotal = attData
    ? (mainGateMonthlyPerGuard / daysInMonth) * (attData.mainMorn + attData.mainEve)
    : (n(form.mainGateMorning) + n(form.mainGateEvening)) * mainGateMonthlyPerGuard;

  // Vendor rates for proration
  const vendorMornRate = n(form.vendorMornSalary) / daysInMonth;
  const vendorEveRate = n(form.vendorEveSalary) / daysInMonth;

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
      // Prorate by Morning and Evening shifts
      const k = ATT_KEYS[b];
      const mornPresent = attData ? attData[`${k}Morn`] : daysInMonth;
      const evePresent = attData ? attData[`${k}Eve`] : daysInMonth;

      vendorCost = (mornPresent * vendorMornRate) + (evePresent * vendorEveRate);
    }

    const total = mainGateShare + chauhanCost + vendorCost;
    grandTotal += total;

    res[b] = {
      flats: flats[b],
      flatRatioPct: (ratio * 100).toFixed(1),
      mainGate: mainGateShare,
      chauhan: chauhanCost,
      vendor: vendorCost,
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
            setSaveMsg(`${formatLongMonth(selectedMonth)}`);
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

  function handlePrintPDF() {
    const currentBill = calcBill(form, selectedMonth, attSummary);
    const generatedDate = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    const vendorMornTotal = n(form.vendorMornSalary) * 2;
    const vendorEveTotal = n(form.vendorEveSalary) * 2;

    const printDoc = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="utf-8">
        <title>Security Bill - ${formatLongMonth(selectedMonth)} - Majestique Euriska</title>
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

          .tag {
            display: inline-block;
            font-size: 9px;
            font-weight: 700;
            padding: 1px 5px;
            border-radius: 4px;
            background: #dcfce7;
            color: #166534;
            margin-left: 4px;
          }

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
            <h1 class="title">🛡️ MAJESTIQUE EURISKA 'A' BUILDING CO-OP HOUSING SOCIETY LTD.</h1>
            <div class="subtitle">Reg. No: PNA/PNA (4)/HSG/(TC)/21207/2019-20 • S. No. 2, Plot No C-1, Village Mohammed Wadi, Taluka Haveli, Pune - 411060</div>
            <div style="font-size: 11px; color: #64748b; margin-top: 2px;">Security &amp; Guard Deployment Monthly Bill Breakdown</div>
          </div>
          <div class="meta">
            <div><strong>Billing Month:</strong> ${formatLongMonth(selectedMonth)}</div>
            <div><strong>Generated On:</strong> ${generatedDate}</div>
            <div><strong>Flats Ratio:</strong> A (${form.flatsA}) · B (${form.flatsB}) · C (${form.flatsC}) = ${currentBill.totalFlats} Flats</div>
          </div>
        </div>

        <div class="kpi-row">
          <div class="kpi-card">
            <div class="kpi-label">A Building Share</div>
            <div class="kpi-value" style="color: #0369a1;">₹${fmt(currentBill.details['A Building']?.total || 0)}</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">B Building Share</div>
            <div class="kpi-value" style="color: #0369a1;">₹${fmt(currentBill.details['B Building']?.total || 0)}</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">C Building Share</div>
            <div class="kpi-value" style="color: #0369a1;">₹${fmt(currentBill.details['C Building']?.total || 0)}</div>
          </div>
          <div class="kpi-card" style="background: #f0fdf4; border-color: #86efac;">
            <div class="kpi-label" style="color: #15803d;">Grand Total Bill</div>
            <div class="kpi-value" style="color: #15803d;">₹${fmt(currentBill.grandTotal)}</div>
          </div>
        </div>

        <div class="section-title">1. Building-Wise Cost Breakdown</div>
        <table>
          <thead>
            <tr>
              <th>Building</th>
              <th>Flats (Share %)</th>
              ${currentBill.usedAttendance ? '<th>Shifts (M / E)</th>' : ''}
              <th>Main Gate Share (₹)</th>
              <th>Chauhan Cost (₹)</th>
              <th>Vendor Guard (₹)</th>
              <th>Total Due (₹)</th>
            </tr>
          </thead>
          <tbody>
            ${currentBill.buildings.map(b => {
              const data = currentBill.details[b];
              const k = ATT_KEYS[b];
              const isChauhanPost = b === currentBill.actualChauhanLoc;
              return `
                <tr>
                  <td style="font-weight: 700;">
                    ${b}
                    ${isChauhanPost ? '<span class="tag">Chauhan Shift</span>' : ''}
                  </td>
                  <td>${data.flats} flats (${data.flatRatioPct}%)</td>
                  ${currentBill.usedAttendance ? `<td>${isChauhanPost ? '<em>Chauhan</em>' : `${attSummary?.[`${k}Morn`] || 0}M / ${attSummary?.[`${k}Eve`] || 0}E`}</td>` : ''}
                  <td>₹${fmt(data.mainGate)}</td>
                  <td style="${data.chauhan > 0 ? 'font-weight: 600; color: #0B2B26;' : ''}">₹${fmt(data.chauhan)}</td>
                  <td style="${data.vendor > 0 ? 'font-weight: 600; color: #C49B4F;' : ''}">₹${fmt(data.vendor)}</td>
                  <td style="font-weight: 700; color: #15803d;">₹${fmt(data.total)}</td>
                </tr>
              `;
            }).join('')}
            <tr class="total-row">
              <td>Grand Total</td>
              <td>${currentBill.totalFlats} flats</td>
              ${currentBill.usedAttendance ? '<td>—</td>' : ''}
              <td>₹${fmt(currentBill.mainGateTotal)}</td>
              <td>₹${fmt(n(form.chauhanSalary))}</td>
              <td>₹${fmt(vendorMornTotal + vendorEveTotal)}</td>
              <td class="grand-cell">₹${fmt(currentBill.grandTotal)}</td>
            </tr>
          </tbody>
        </table>

        <div class="section-title">2. Deployment & Rate Parameters</div>
        <table>
          <thead>
            <tr>
              <th>Parameter</th>
              <th>Rate / Salary (₹)</th>
              <th>Deployment / Shift Details</th>
              <th>Monthly Total (₹)</th>
              <th>Apportionment Rule</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Main Gate Guards</td>
              <td>₹${fmt(form.mainGateGuardSalary)} / guard</td>
              <td>${form.mainGateMorning} Morning + ${form.mainGateEvening} Evening guards</td>
              <td>₹${fmt(currentBill.mainGateTotal)}</td>
              <td>Shared across all flats by unit ratio</td>
            </tr>
            <tr>
              <td>Internal Supervisor / Guard (Chauhan)</td>
              <td>₹${fmt(form.chauhanSalary)} / mo</td>
              <td>Rotated to <strong>${currentBill.actualChauhanLoc}</strong> (${currentBill.chauhanDaysWorked} days)</td>
              <td>₹${fmt(n(form.chauhanSalary))}</td>
              <td>100% assigned to ${currentBill.actualChauhanLoc}</td>
            </tr>
            <tr>
              <td>Vendor Guards (Morning Shift)</td>
              <td>₹${fmt(form.vendorMornSalary)} / guard</td>
              <td>12-Hour Morning shift</td>
              <td>₹${fmt(vendorMornTotal)}</td>
              <td>Directly charged to vendor-deployed buildings</td>
            </tr>
            <tr>
              <td>Vendor Guards (Evening Shift)</td>
              <td>₹${fmt(form.vendorEveSalary)} / guard</td>
              <td>12-Hour Evening shift</td>
              <td>₹${fmt(vendorEveTotal)}</td>
              <td>Directly charged to vendor-deployed buildings</td>
            </tr>
          </tbody>
        </table>

        <div class="signatures">
          <div class="sig-box">
            <div class="sig-line">Security Agency Supervisor</div>
          </div>
          <div class="sig-box">
            <div class="sig-line">Security Committee Lead</div>
          </div>
          <div class="sig-box">
            <div class="sig-line">Society Treasurer / Chairman</div>
          </div>
        </div>

        <div class="footer">
          <div>Majestique Euriska Co-Op Housing Society Ltd. • Official Security Billing Record</div>
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
    const bill = calcBill(form, selectedMonth, attSummary);
    const vendorMornTotal = n(form.vendorMornSalary) * 2; // Assuming 2 buildings have vendors
    const vendorEveTotal = n(form.vendorEveSalary) * 2;

    const rows = [
      ['Majestique Euriska - Security Bill'],
      ['Month', formatLongMonth(selectedMonth)],
      [],
      ['Cost Parameters'],
      ['Main Gate Guards (Morning)', form.mainGateMorning],
      ['Main Gate Guards (Evening)', form.mainGateEvening],
      ['Main Gate Guard Salary', form.mainGateGuardSalary],
      ['Chauhan Salary (Internal)', form.chauhanSalary],
      ['Vendor Morn Salary (12h)', form.vendorMornSalary],
      ['Vendor Eve Salary (12h)', form.vendorEveSalary],
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
      ['Grand Total', bill.mainGateTotal, n(form.chauhanSalary), vendorMornTotal + vendorEveTotal, bill.grandTotal]
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
    aMorn: sumAttendanceCol(attendance, 'aMorn'),
    aEve: sumAttendanceCol(attendance, 'aEve'),
    bMorn: sumAttendanceCol(attendance, 'bMorn'),
    bEve: sumAttendanceCol(attendance, 'bEve'),
    cMorn: sumAttendanceCol(attendance, 'cMorn'),
    cEve: sumAttendanceCol(attendance, 'cEve'),
    mainMorn: sumAttendanceCol(attendance, 'mainGateMorn'),
    mainEve: sumAttendanceCol(attendance, 'mainGateEve'),
  } : null;

  // Only consider it "linked" if there is at least some data entered
  const isLinked = rawSummary && (
    rawSummary.aMorn > 0 || rawSummary.aEve > 0 ||
    rawSummary.bMorn > 0 || rawSummary.bEve > 0 ||
    rawSummary.cMorn > 0 || rawSummary.cEve > 0 ||
    rawSummary.mainMorn > 0 || rawSummary.mainEve > 0
  );

  const attSummary = isLinked ? rawSummary : null;

  // Bill uses actual attendance guard-days when available
  const bill = calcBill(form, selectedMonth, attSummary);

  return (
    <div className="attendance-manager attendance-manager--register">
      {/* Settings & Summary Panel */}
      <div className="attendance-manager__controls stack-card">
        <div className="security-bill-calculator-s1">
          <div>
            <p className="eyebrow">Monthly Security Billing</p>
            <h3>Security Cost Distribution</h3>
            <p className="security-bill-calculator-s2">Configure guard counts and salaries. Chauhan shifts building each month.</p>
          </div>
          <button
            className="button-secondary security-bill-calculator-s3"
            type="button"
            onClick={(e) => handleDeleteBill(e)}
          >
            🗑️ Delete Month Data
          </button>
        </div>

        <div className="attendance-control-grid security-bill-calculator-s4">
          <div className="summary-card summary-card--inline">
            <span>Main Gate Salary</span>
            <input
              type="text" inputMode="numeric" className="attendance-register-input security-bill-calculator-s5"
              value={form.mainGateGuardSalary} onChange={e => handleFieldChange('mainGateGuardSalary', e.target.value)}
            />
          </div>
          <div className="summary-card summary-card--inline">
            <span>Morning Guards</span>
            <input
              type="text" inputMode="numeric" className="attendance-register-input security-bill-calculator-s6"
              value={form.mainGateMorning} onChange={e => handleFieldChange('mainGateMorning', e.target.value)}
            />
          </div>
          <div className="summary-card summary-card--inline">
            <span>Evening Guards</span>
            <input
              type="text" inputMode="numeric" className="attendance-register-input security-bill-calculator-s6"
              value={form.mainGateEvening} onChange={e => handleFieldChange('mainGateEvening', e.target.value)}
            />
          </div>
        </div>
        {/* Row 2: Flat counts */}
        <div className="attendance-control-grid security-bill-calculator-s7">
          <div className="summary-card summary-card--inline">
            <span>A Building Flats</span>
            <input
              type="text" inputMode="numeric" className="attendance-register-input security-bill-calculator-s6"
              value={form.flatsA} onChange={e => handleFieldChange('flatsA', e.target.value)}
            />
          </div>
          <div className="summary-card summary-card--inline">
            <span>B Building Flats</span>
            <input
              type="text" inputMode="numeric" className="attendance-register-input security-bill-calculator-s6"
              value={form.flatsB} onChange={e => handleFieldChange('flatsB', e.target.value)}
            />
          </div>
          <div className="summary-card summary-card--inline">
            <span>C Building Flats</span>
            <input
              type="text" inputMode="numeric" className="attendance-register-input security-bill-calculator-s6"
              value={form.flatsC} onChange={e => handleFieldChange('flatsC', e.target.value)}
            />
          </div>
          <div className="summary-card summary-card--inline security-bill-calculator-s8">
            <span>Total Flats</span>
            <strong>{n(form.flatsA) + n(form.flatsB) + n(form.flatsC)}</strong>
          </div>
        </div>

        <div className="attendance-control-grid security-bill-calculator-s4">
          <div className="summary-card summary-card--inline security-bill-calculator-s9">
            <span>Chauhan (Internal) Salary</span>
            <input
              type="text" inputMode="numeric" className="attendance-register-input security-bill-calculator-s5"
              value={form.chauhanSalary} onChange={e => handleFieldChange('chauhanSalary', e.target.value)}
            />
          </div>
          <div className="summary-card summary-card--inline security-bill-calculator-s9">
            <span>Chauhanji Days Worked</span>
            <input
              type="text" inputMode="numeric" className="attendance-register-input security-bill-calculator-s6"
              placeholder={`/${bill.daysInMonth}`}
              value={form.chauhanDays} onChange={e => handleFieldChange('chauhanDays', e.target.value)}
            />
          </div>
          <div className="summary-card summary-card--inline security-bill-calculator-s9">
            <span>Vendor Morn Salary (12h)</span>
            <input
              type="text" inputMode="numeric" className="attendance-register-input security-bill-calculator-s5"
              value={form.vendorMornSalary} onChange={e => handleFieldChange('vendorMornSalary', e.target.value)}
            />
          </div>
          <div className="summary-card summary-card--inline security-bill-calculator-s9">
            <span>Vendor Eve Salary (12h)</span>
            <input
              type="text" inputMode="numeric" className="attendance-register-input security-bill-calculator-s5"
              value={form.vendorEveSalary} onChange={e => handleFieldChange('vendorEveSalary', e.target.value)}
            />
          </div>
          <div className="summary-card summary-card--inline security-bill-calculator-s9">
            <span>Chauhan Placement</span>
            <select
              className="attendance-register-input security-bill-calculator-s10"
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
          <div className="summary-card security-bill-calculator-s11">
            <span className="security-bill-calculator-s12">Grand Total Bill</span>
            <strong>₹{fmt(bill.grandTotal)}</strong>
          </div>
        </div>

        <div className="attendance-note security-bill-calculator-s13" style={{ color: badge.color }}>
          <span>{badge.icon}</span>
          <span>{isLoading ? 'Loading…' : saveMsg || 'Ready'}</span>
        </div>
      </div>

      {/* Attendance Link Summary */}
      {attSummary ? (
        <div className="security-bill-calculator-s14">
          <p className="eyebrow security-bill-calculator-s15">Linked from Attendance Register ✓</p>
          <div className="security-bill-calculator-s16">
            {[
              { label: 'A Bldg Shifts', val: `${attSummary.aMorn}M / ${attSummary.aEve}E` },
              { label: 'B Bldg Shifts', val: `${attSummary.bMorn}M / ${attSummary.bEve}E` },
              { label: 'C Bldg Shifts', val: `${attSummary.cMorn}M / ${attSummary.cEve}E` },
              { label: 'Main Gate Shifts', val: `${attSummary.mainMorn}M / ${attSummary.mainEve}E` },
            ].map(({ label, val }) => (
              <div key={label} className="summary-card summary-card--inline security-bill-calculator-s17">
                <span className="security-bill-calculator-s18">{label}</span>
                <strong className="security-bill-calculator-s19">{val}</strong>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="security-bill-calculator-s20">
          ⚠️ No saved attendance data for {formatLongMonth(selectedMonth)}. Go to <strong>Security Tracking</strong>, fill in the register and save it first.
        </div>
      )}
      <div className="table-card attendance-table-card attendance-table-card--register security-bill-calculator-s21">
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
              <div className="attendance-table-card__actions security-bill-calculator-s22">
                <button
                  className="button-secondary security-bill-calculator-s23"
                  type="button"
                  onClick={handlePrintPDF}
                >
                  🖨️ Print Bill (PDF)
                </button>
                <button className="button-secondary" type="button" onClick={handleDownloadExcel}>
                  ⬇ Excel
                </button>
              </div>
            </div>

            <div className="attendance-table-scroll">
              <table className="attendance-table attendance-table--register attendance-table--bill">
                <thead>
                  <tr className="security-bill-calculator-s24">
                    <th className="security-bill-calculator-s25">Building</th>
                    <th className="security-bill-calculator-s26">Flats (Share %)</th>
                    {bill.usedAttendance && <th className="security-bill-calculator-s27">Shifts (M/E)</th>}
                    <th className="security-bill-calculator-s26">Main Gate Share (₹)</th>
                    <th className="security-bill-calculator-s26">Chauhan Cost (₹)</th>
                    <th className="security-bill-calculator-s26">Vendor Guard Cost (₹)</th>
                    <th className="security-bill-calculator-s28">Total Due (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr>
                      <td colSpan={bill.usedAttendance ? 7 : 6} className="security-bill-calculator-s29">Loading billing data...</td>
                    </tr>
                  ) : (
                    bill.buildings.map((b) => {
                      const data = bill.details[b];
                      const k = ATT_KEYS[b];
                      return (
                        <tr key={b}>
                          <td><strong>{b}</strong> {b === bill.actualChauhanLoc && <span className="security-bill-calculator-s30">Chauhan Shift</span>}</td>
                          <td className="security-bill-calculator-s31">{data.flats} flats <span className="security-bill-calculator-s32">({data.flatRatioPct}%)</span></td>
                          {bill.usedAttendance && (
                            <td className="security-bill-calculator-s33">
                              {b === bill.actualChauhanLoc ? <em className="security-bill-calculator-s34">Chauhan</em> : `${attSummary[`${k}Morn`]}M / ${attSummary[`${k}Eve`]}E`}
                            </td>
                          )}
                          <td className="security-bill-calculator-s26">{fmt(data.mainGate)}</td>
                          <td className="security-bill-calculator-s26" style={{ color: data.chauhan > 0 ? '#0B2B26' : 'inherit' }}>{fmt(data.chauhan)}</td>
                          <td className="security-bill-calculator-s26" style={{ color: data.vendor > 0 ? '#C49B4F' : 'inherit' }}>{fmt(data.vendor)}</td>
                          <td className="security-bill-calculator-s35">{fmt(data.total)}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
                <tfoot>
                  <tr>
                    <th>Grand Total</th>
                    <th className="security-bill-calculator-s26">{bill.totalFlats} flats</th>
                    {bill.usedAttendance && <th className="security-bill-calculator-s26">-</th>}
                    <th className="security-bill-calculator-s26">{fmt(bill.mainGateTotal)}</th>
                    <th className="security-bill-calculator-s26">{fmt(n(form.chauhanSalary))}</th>
                    <th className="security-bill-calculator-s26">{fmt((n(form.vendorMornSalary) + n(form.vendorEveSalary)) * 2)}</th>
                    <th className="security-bill-calculator-s36">{fmt(bill.grandTotal)}</th>
                  </tr>
                </tfoot>
              </table>
            </div>
          </>
        ) : (
          <div className="security-bill-calculator-s37">
            <div className="security-bill-calculator-s38">📋</div>
            <h4 className="security-bill-calculator-s39">Bill not generated yet</h4>
            <p className="security-bill-calculator-s40">
              The final security bill will appear here once you save the attendance records for <strong>{formatLongMonth(selectedMonth)}</strong> in the Tracking tab.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
