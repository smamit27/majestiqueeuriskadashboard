import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { doc, getDoc, serverTimestamp, setDoc, deleteDoc } from 'firebase/firestore';
import * as XLSX from 'xlsx';
import { db, ensureFirebaseSession, isFirebaseConfigured } from '../../firebase.js';

// ─── Constants ────────────────────────────────────────────────────────────────

const LOCAL_STORAGE_KEY = 'majestique-security-register';
// No auto-save — user must explicitly click Save

const FINANCIAL_YEAR_MONTHS = Array.from({ length: 12 }, (_, i) => {
  const d = new Date(2026, 3 + i, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
});

/** All guard-post columns that contribute to daily total (Base reference) */
const ALL_COLUMNS = [
  { key: 'aMorn', label: 'A Bldg (Morn)' },
  { key: 'aEve', label: 'A Bldg (Eve)' },
  { key: 'bMorn', label: 'B Bldg (Morn)' },
  { key: 'bEve', label: 'B Bldg (Eve)' },
  { key: 'cMorn', label: 'C Bldg (Morn)' },
  { key: 'cEve', label: 'C Bldg (Eve)' },
  { key: 'mainGateMorn', label: 'Main Gate (Morn)' },
  { key: 'mainGateEve', label: 'Main Gate (Eve)' },
];

// ─── Pure helpers ─────────────────────────────────────────────────────────────

function getCurrentMonthValue() {
  const d = new Date();
  const v = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  return FINANCIAL_YEAR_MONTHS.includes(v) ? v : FINANCIAL_YEAR_MONTHS[0];
}

/** Returns which building column key Chauhan occupies for a given month */
const CHAUHAN_ROTATION = ['b', 'c', 'a']; // rotation base keys
const CHAUHAN_LABELS = { a: 'A Building', b: 'B Building', c: 'C Building' };
function getChauhanBaseKey(mv) {
  const [y, m] = mv.split('-').map(Number);
  const offset = (y - 2026) * 12 + (m - 4);
  return CHAUHAN_ROTATION[((offset % 3) + 3) % 3];
}

function parseMonthValue(mv) {
  const [year, month] = mv.split('-').map(Number);
  return { year, monthIndex: month - 1 };
}

function formatMonthLabel(mv) {
  const { year, monthIndex } = parseMonthValue(mv);
  return new Intl.DateTimeFormat('en-IN', { month: 'short', year: '2-digit' })
    .format(new Date(year, monthIndex, 1));
}

function formatLongMonthLabel(mv) {
  const { year, monthIndex } = parseMonthValue(mv);
  return new Intl.DateTimeFormat('en-IN', { month: 'long', year: 'numeric' })
    .format(new Date(year, monthIndex, 1));
}

function formatDateLabel(date) {
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  }).format(date).replaceAll('/', '-');
}

function buildFileSafeLabel(mv) {
  const { year, monthIndex } = parseMonthValue(mv);
  const m = new Intl.DateTimeFormat('en-IN', { month: 'short' })
    .format(new Date(year, monthIndex, 1));
  return `${m}-${year}`;
}

function normalizeValue(v) {
  if (v === '' || v == null) return '';
  const n = Number(v);
  return Number.isFinite(n) ? Math.max(0, n) : '';
}

function getNum(v) { return v === '' ? 0 : Number(v) || 0; }

function rowTotal(row) {
  return ALL_COLUMNS.reduce((s, col) => s + getNum(row[col.key]), 0);
}

function emptyRow() {
  return { aMorn: '', aEve: '', bMorn: '', bEve: '', cMorn: '', cEve: '', mainGateMorn: '', mainGateEve: '' };
}

function buildMonthDays(mv) {
  const { year, monthIndex } = parseMonthValue(mv);
  const total = new Date(year, monthIndex + 1, 0).getDate();
  return Array.from({ length: total }, (_, i) => {
    const day = i + 1;
    const date = new Date(year, monthIndex, day);
    const dateKey = `${mv}-${String(day).padStart(2, '0')}`;
    return {
      date,
      dateKey,
      formattedDate: formatDateLabel(date),
      weekday: new Intl.DateTimeFormat('en-IN', { weekday: 'short' }).format(date),
    };
  });
}

function normalizeEntries(days, src = {}) {
  return days.reduce((acc, d) => {
    const s = src[d.dateKey] || {};
    acc[d.dateKey] = {
      aMorn: normalizeValue(s.aMorn || s.aBuilding), // migration support
      aEve: normalizeValue(s.aEve || s.aBuilding),
      bMorn: normalizeValue(s.bMorn || s.bBuilding),
      bEve: normalizeValue(s.bEve || s.bBuilding),
      cMorn: normalizeValue(s.cMorn || s.cBuilding),
      cEve: normalizeValue(s.cEve || s.cBuilding),
      mainGateMorn: normalizeValue(s.mainGateMorn || s.commonArea),
      mainGateEve: normalizeValue(s.mainGateEve || s.commonArea),
    };
    return acc;
  }, {});
}

// ─── LocalStorage helpers ─────────────────────────────────────────────────────

function readLocal() {
  try {
    const raw = window.localStorage.getItem(LOCAL_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

function writeLocal(data) {
  try { window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data)); } catch { }
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function SecurityAttendanceManager({ isAdmin = false }) {
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonthValue);
  const [entries, setEntries] = useState({});
  const [localRecords, setLocalRecords] = useState(readLocal);
  const [isLoading, setIsLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState('idle');
  const [saveMsg, setSaveMsg] = useState('');
  const [isDirty, setIsDirty] = useState(false);

  const monthDays = useMemo(() => buildMonthDays(selectedMonth), [selectedMonth]);
  const recordId = `security_register_${selectedMonth}`;

  const isLoadedRef = useRef(false);
  const autoSaveTimer = useRef(null);

  // ── Load from Firebase on month change ───────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    isLoadedRef.current = false;
    setSaveStatus('idle');
    setSaveMsg('');

    async function load() {
      setIsLoading(true);
      const localEntry = localRecords[recordId]?.entries || {};

      if (!isFirebaseConfigured || !db) {
        if (!cancelled) {
          setEntries(normalizeEntries(monthDays, localEntry));
          setSaveMsg('Local mode — Firebase not connected.');
          setIsLoading(false);
          isLoadedRef.current = true;
        }
        return;
      }

      try {
        await ensureFirebaseSession();
        const snap = await getDoc(doc(db, 'securityAttendanceRegisters', recordId));
        if (!cancelled) {
          const src = snap.exists() ? snap.data().entries || {} : localEntry;
          setEntries(normalizeEntries(monthDays, src));
          setSaveMsg(
            snap.exists()
              ? `Synced — ${formatMonthLabel(selectedMonth)}`
              : `New — ${formatMonthLabel(selectedMonth)}`
          );
        }
      } catch (err) {
        console.error('Security register load error:', err);
        if (!cancelled) {
          setEntries(normalizeEntries(monthDays, localEntry));
          setSaveMsg('Firebase unavailable — showing local data.');
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recordId]);

  // ── Manual save to Firebase ───────────────────────────────────────────────
  const saveToFirebase = useCallback(async (currentEntries, currentRecordId, month) => {
    setSaveStatus('saving');
    setSaveMsg('Saving to Firebase…');
    const payload = { month, registerType: 'security-daily', entries: currentEntries };

    if (isFirebaseConfigured && db) {
      try {
        await ensureFirebaseSession();
        await setDoc(
          doc(db, 'securityAttendanceRegisters', currentRecordId),
          { ...payload, updatedAt: serverTimestamp() },
          { merge: true }
        );
        setSaveStatus('saved');
        setSaveMsg('Saved ✓');
        setIsDirty(false);
      } catch (err) {
        console.error('Security save error:', err);
        const next = { ...readLocal(), [currentRecordId]: { ...payload, savedAt: new Date().toISOString() } };
        writeLocal(next);
        setLocalRecords(next);
        setSaveStatus('error');
        setSaveMsg('Firebase save failed — saved locally instead.');
        setIsDirty(false);
      }
    } else {
      const next = { ...readLocal(), [currentRecordId]: { ...payload, savedAt: new Date().toISOString() } };
      writeLocal(next);
      setLocalRecords(next);
      setSaveStatus('saved');
      setSaveMsg('Saved locally (Firebase not connected).');
      setIsDirty(false);
    }
  }, []);

  const handleSave = () => saveToFirebase(entries, recordId, selectedMonth);

  const handleDeleteMonthData = async (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    // Clear any pending auto-saves
    clearTimeout(autoSaveTimer.current);

    if (!window.confirm(`Are you sure you want to PERMANENTLY delete all security data (attendance and billing) for ${formatLongMonthLabel(selectedMonth)}?`)) return;

    setSaveStatus('saving');
    setSaveMsg('Deleting data...');

    try {
      await ensureFirebaseSession();
      // Delete attendance register
      await deleteDoc(doc(db, 'securityAttendanceRegisters', recordId));
      // Delete bill record
      await deleteDoc(doc(db, 'securityBills', `security_bill_${selectedMonth}`));

      setSaveStatus('saved');
      setSaveMsg(`Deleted data for ${formatLongMonthLabel(selectedMonth)}.`);
      window.location.reload(); // Refresh to clear state
    } catch (err) {
      console.error('Delete error:', err);
      setSaveStatus('error');
      setSaveMsg('Failed to delete data.');
    }
  };

  // ── Cell change — marks dirty, no auto-save ────────────────────────────
  function handleCellChange(dateKey, field, value) {
    if (!isLoadedRef.current) return;

    setEntries(prev => {
      const row = prev[dateKey] || emptyRow();
      let nextRow;

      if (field.endsWith('Chauhan')) {
        const base = field.replace('Chauhan', '');
        nextRow = {
          ...row,
          [base + 'Morn']: normalizeValue(value),
          [base + 'Eve']: normalizeValue(value)
        };
      } else {
        nextRow = { ...row, [field]: normalizeValue(value) };
      }

      return { ...prev, [dateKey]: nextRow };
    });

    setSaveStatus('pending');
    setSaveMsg('Unsaved changes — click Save to persist.');
    setIsDirty(true);
  }

  useEffect(() => () => clearTimeout(autoSaveTimer.current), []);

  const chauhanBaseKey = getChauhanBaseKey(selectedMonth);

  const displayColumns = useMemo(() => {
    const cols = [];
    ['a', 'b', 'c'].forEach(bKey => {
      if (bKey === chauhanBaseKey) {
        cols.push({ key: bKey + 'Chauhan', label: `Chauhan (${CHAUHAN_LABELS[bKey]})`, isChauhan: true });
      } else {
        cols.push({ key: bKey + 'Morn', label: `${bKey.toUpperCase()} (Morn)` });
        cols.push({ key: bKey + 'Eve', label: `${bKey.toUpperCase()} (Eve)` });
      }
    });
    cols.push({ key: 'mainGateMorn', label: 'Main Gate (Morn)' });
    cols.push({ key: 'mainGateEve', label: 'Main Gate (Eve)' });
    return cols;
  }, [chauhanBaseKey]);

  // ── Summary totals ────────────────────────────────────────────────────────
  const summary = useMemo(() => {
    const colTotals = displayColumns.reduce((acc, col) => {
      acc[col.key] = monthDays.reduce((s, d) => {
        const row = entries[d.dateKey] || emptyRow();
        if (col.isChauhan) {
          return s + getNum(row[chauhanBaseKey + 'Morn']); // Use Morn as proxy for Chauhan
        }
        return s + getNum(row[col.key]);
      }, 0);
      return acc;
    }, {});

    const grandTotal = monthDays.reduce(
      (s, d) => s + rowTotal(entries[d.dateKey] || emptyRow()), 0
    );

    return {
      daysInMonth: monthDays.length,
      grandTotal,
      avgDaily: monthDays.length ? (grandTotal / monthDays.length).toFixed(1) : '0.0',
      colTotals,
    };
  }, [entries, monthDays, displayColumns, chauhanBaseKey]);

  // ── Excel download ────────────────────────────────────────────────────────
  function handleDownloadExcel() {
    const headers = [
      'Date', 'Day',
      ...displayColumns.map(c => c.label),
      'Total'
    ];

    const dataRows = monthDays.map((d) => {
      const row = entries[d.dateKey] || emptyRow();
      return [
        d.formattedDate,
        d.weekday,
        ...displayColumns.map(c => {
          if (c.isChauhan) return getNum(row[chauhanBaseKey + 'Morn']);
          return getNum(row[c.key]);
        }),
        rowTotal(row),
      ];
    });

    const totalsRow = [
      'Total', '',
      ...displayColumns.map(c => summary.colTotals[c.key]),
      summary.grandTotal,
    ];

    const ws = XLSX.utils.aoa_to_sheet([headers, ...dataRows, totalsRow]);
    ws['!cols'] = [
      { wch: 14 }, // Date
      { wch: 6 }, // Day
      ...displayColumns.map(() => ({ wch: 12 })),
      { wch: 9 }, // Total
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `Sec ${formatMonthLabel(selectedMonth)}`);
    wb.Props = {
      Title: `Security Attendance — ${formatLongMonthLabel(selectedMonth)}`,
      Author: 'Majestique Euriska Dashboard',
    };

    XLSX.writeFile(wb, `security-attendance-${buildFileSafeLabel(selectedMonth)}.xlsx`);
    setSaveMsg(`Excel downloaded for ${formatLongMonthLabel(selectedMonth)}.`);
  }

  // ── PDF export ───────────────────────────────────────────────────────────
  function handleExportPDF() {
    const generatedDate = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    const longMonth = formatLongMonthLabel(selectedMonth);

    const printDoc = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="utf-8">
        <title>Majestique Euriska - Security Attendance & Guard Deployment (${longMonth})</title>
        <style>
          * { box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
          body { margin: 0; padding: 24px; color: #0f172a; background: #ffffff; }
          .header { border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: flex-end; }
          .title { font-size: 20px; font-weight: 800; color: #0f172a; margin: 0; }
          .subtitle { font-size: 13px; color: #475569; margin-top: 4px; }
          .meta { font-size: 11px; color: #475569; text-align: right; }
          
          .summary-bar {
            display: flex;
            gap: 16px;
            margin-bottom: 16px;
            padding: 10px 14px;
            background: #f8fafc;
            border: 1px solid #cbd5e1;
            border-radius: 8px;
            font-size: 12px;
            flex-wrap: wrap;
          }
          .summary-item { font-weight: 600; color: #334155; }
          .summary-item strong { color: #0f172a; }
          
          table { width: 100%; border-collapse: collapse; font-size: 11px; }
          th { background: #f1f5f9; color: #1e293b; font-weight: 700; text-align: center; padding: 7px 8px; border: 1px solid #94a3b8; font-size: 10px; letter-spacing: 0.03em; }
          th.th-date { text-align: left; }
          td { padding: 6px 8px; border: 1px solid #cbd5e1; color: #0f172a; text-align: center; }
          td.td-date { text-align: left; font-weight: 600; }
          tr:nth-child(even) { background: #f8fafc; }
          tr.sunday-row { background: #fff5f5; }
          .sunday-label { color: #dc2626; font-weight: 700; }
          .chauhan-col { background: #fef9ee; }
          th.chauhan-th { background: #fef3c7; color: #92400e; }
          td.chauhan-td { background: #fef9ee; font-weight: 600; }
          tfoot tr { background: #f1f5f9; font-weight: 700; }
          tfoot th { border-top: 2px solid #0f172a; color: #0f172a; background: #e2e8f0; }
          
          .sig-section {
            margin-top: 28px;
            display: flex;
            justify-content: space-between;
            padding: 0 20px;
          }
          .sig-box {
            width: 200px;
            border-top: 1px solid #64748b;
            text-align: center;
            font-size: 11px;
            color: #475569;
            padding-top: 6px;
          }
          
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
            @page { margin: 1cm; size: A4 landscape; }
            thead { display: table-header-group; }
            tr { page-break-inside: avoid; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <h1 class="title">🛡️ Majestique Euriska - Security Attendance Register</h1>
            <div class="subtitle">Guard Deployment Entry Table & Daily Post Coverage • FY April 2026 – March 2027</div>
          </div>
          <div class="meta">
            <div><strong>Month:</strong> ${longMonth}</div>
            <div><strong>Generated:</strong> ${generatedDate}</div>
          </div>
        </div>

        <div class="summary-bar">
          <div class="summary-item">Month: <strong>${longMonth}</strong></div>
          <div>•</div>
          <div class="summary-item">Days in Month: <strong>${summary.daysInMonth}</strong></div>
          <div>•</div>
          <div class="summary-item">Monthly Total Shifts: <strong>${summary.grandTotal}</strong></div>
          <div>•</div>
          <div class="summary-item">Avg / Day: <strong>${summary.avgDaily}</strong></div>
          ${displayColumns.map(col => `
            <div>•</div>
            <div class="summary-item">${col.label}: <strong>${summary.colTotals[col.key]}</strong></div>
          `).join('')}
        </div>

        <table>
          <thead>
            <tr>
              <th class="th-date" style="width: 110px;">Date</th>
              <th style="width: 50px;">Day</th>
              ${displayColumns.map(col => `
                <th class="${col.isChauhan ? 'chauhan-th' : ''}">${col.label}</th>
              `).join('')}
              <th style="width: 60px; font-weight: 800;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${monthDays.map(d => {
              const row = entries[d.dateKey] || emptyRow();
              const total = rowTotal(row);
              const isSunday = d.date.getDay() === 0;
              return `
                <tr class="${isSunday ? 'sunday-row' : ''}">
                  <td class="td-date">${d.formattedDate}</td>
                  <td class="${isSunday ? 'sunday-label' : ''}">${d.weekday}</td>
                  ${displayColumns.map(col => {
                    const val = col.isChauhan ? row[chauhanBaseKey + 'Morn'] : row[col.key];
                    return `<td class="${col.isChauhan ? 'chauhan-td' : ''}">${val !== '' ? val : '0'}</td>`;
                  }).join('')}
                  <td style="font-weight: 700;">${total}</td>
                </tr>
              `;
            }).join('')}
          </tbody>
          <tfoot>
            <tr>
              <th colspan="2" style="text-align: right; text-transform: uppercase; letter-spacing: 0.05em;">Total Shifts:</th>
              ${displayColumns.map(col => `
                <th class="${col.isChauhan ? 'chauhan-th' : ''}">${summary.colTotals[col.key]}</th>
              `).join('')}
              <th style="font-weight: 800; font-size: 11px;">${summary.grandTotal}</th>
            </tr>
          </tfoot>
        </table>

        <div class="sig-section">
          <div class="sig-box">Security Agency Supervisor</div>
          <div class="sig-box">Estate Manager / Society Office</div>
          <div class="sig-box">Authorised Signatory / Committee</div>
        </div>

        <div class="footer">
          <div>Majestique Euriska Co-Op Housing Society • Security Guard Deployment Register</div>
          <div>Confidential • Official Society Records</div>
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
      printWindow.document.open();
      printWindow.document.write(printDoc);
      printWindow.document.close();
    }
  }

  // ── Status badge ──────────────────────────────────────────────────────────
  const badge = {
    idle: { color: '#6b7280', icon: '●', text: 'Ready' },
    pending: { color: '#f59e0b', icon: '⏳', text: 'Saving…' },
    saving: { color: '#3b82f6', icon: '↑', text: 'Saving to Firebase…' },
    saved: { color: '#10b981', icon: '✓', text: 'Saved' },
    error: { color: '#ef4444', icon: '✗', text: 'Save failed' },
  }[saveStatus];

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="attendance-manager attendance-manager--register">

      {/* ── Controls panel ── */}
      <div className="attendance-manager__controls stack-card">
        <div>
          <p className="eyebrow">Monthly security register</p>
          <h3>Guard deployment entry table</h3>
          <p>Auto-saves to cloud.</p>
        </div>

        {/* Summary chips */}
        <div className="attendance-control-grid">
          <div className="summary-card summary-card--inline">
            <span>Financial year</span>
            <strong>April 2026 – March 2027</strong>
          </div>
          <div className="summary-card summary-card--inline">
            <span>Active month</span>
            <strong>{formatLongMonthLabel(selectedMonth)}</strong>
          </div>
          <div className="summary-card summary-card--inline">
            <span>Days in month</span>
            <strong>{summary.daysInMonth}</strong>
          </div>
        </div>

        {/* Totals grid */}
        <div className="attendance-summary-grid">
          <div className="summary-card">
            <span>Monthly total shifts</span>
            <strong>{summary.grandTotal}</strong>
          </div>
          <div className="summary-card">
            <span>Avg / day</span>
            <strong>{summary.avgDaily}</strong>
          </div>
          {displayColumns.map(col => (
            <div key={col.key} className="summary-card" style={col.isChauhan ? { borderColor: '#C49B4F', background: '#fffcf5' } : {}}>
              <span>{col.label}</span>
              <strong>{summary.colTotals[col.key]}</strong>
            </div>
          ))}
        </div>

        {/* Auto-save status */}
        <div
          className="attendance-note"
          style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            fontWeight: 500, color: badge.color, transition: 'color 0.3s',
          }}
        >
          <span style={{ fontSize: '1rem' }}>{badge.icon}</span>
          <span>
            {isLoading
              ? `Loading ${formatLongMonthLabel(selectedMonth)}…`
              : saveMsg || badge.text}
          </span>
        </div>
      </div>

      {/* ── Table panel ── */}
      <div className="table-card attendance-table-card attendance-table-card--register">

        {/* Month tabs */}
        <div className="attendance-month-tabs" role="tablist" aria-label="Security register months">
          {FINANCIAL_YEAR_MONTHS.map((mv) => (
            <button
              key={mv}
              type="button"
              role="tab"
              aria-selected={selectedMonth === mv}
              className={`attendance-month-tab ${selectedMonth === mv ? 'attendance-month-tab--active' : ''}`}
              onClick={() => setSelectedMonth(mv)}
            >
              {formatMonthLabel(mv)}
            </button>
          ))}
        </div>

        {/* Table header */}
        <div className="attendance-table-card__header">
          <div>
            <p className="eyebrow">Daily deployment sheet</p>
            <h3>Sec. Attendance — {formatMonthLabel(selectedMonth)}</h3>
          </div>
          <div className="attendance-table-card__actions">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: badge.color, fontWeight: 500, fontSize: '0.9rem' }}>
              <span>{badge.icon}</span>
              <span>{isLoading ? `Loading ${formatLongMonthLabel(selectedMonth)}…` : saveMsg || badge.text}</span>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              {isAdmin && (
                <button className="button-secondary" type="button" onClick={handleSave}
                  disabled={!isDirty || saveStatus === 'saving'}
                  style={{ opacity: (!isDirty || saveStatus === 'saving') ? 0.5 : 1 }}>
                  💾 Save
                </button>
              )}
              <button className="button-secondary" type="button" onClick={handleDownloadExcel}>
                ⬇ Excel
              </button>
              <button className="button-secondary" type="button" onClick={handleExportPDF} title="Print or export as PDF">
                📄 Print PDF
              </button>
              {isAdmin && (
                <button
                  className="button-secondary"
                  type="button"
                  onClick={(e) => handleDeleteMonthData(e)}
                  style={{ color: '#dc2626', borderColor: 'rgba(220, 38, 38, 0.2)' }}
                >
                  🗑️ Delete
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="attendance-table-scroll">
          <table className="attendance-table attendance-table--register">
            <thead>
              <tr>
                <th style={{ minWidth: 110 }}>Date</th>
                {displayColumns.map(col => (
                  <th key={col.key} style={col.isChauhan ? { background: '#fef3c7', color: '#92400e', minWidth: 120 } : { minWidth: 90 }}>
                    {col.label}
                  </th>
                ))}
                <th>Total</th>
              </tr>
            </thead>

            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={ALL_COLUMNS.length + 2}
                    style={{ textAlign: 'center', padding: '24px', opacity: 0.6 }}>
                    Loading {formatLongMonthLabel(selectedMonth)}…
                  </td>
                </tr>
              ) : (
                monthDays.map((d) => {
                  const row = entries[d.dateKey] || emptyRow();
                  const total = rowTotal(row);

                  return (
                    <tr key={d.dateKey}>
                      {/* Date + weekday */}
                      <th className="attendance-register-date">
                        <strong>{d.formattedDate}</strong>
                        <span>{d.weekday}</span>
                      </th>

                      {/* Post inputs */}
                      {displayColumns.map(col => {
                        const val = col.isChauhan ? row[chauhanBaseKey + 'Morn'] : row[col.key];
                        return (
                          <td key={`${d.dateKey}-${col.key}`}
                            style={col.isChauhan ? { background: '#fef9ee' } : {}}>
                            <input
                              className="attendance-register-input"
                              type="text"
                              inputMode="numeric"
                              placeholder="0"
                              value={val}
                              style={col.isChauhan ? { background: '#fef3c7', color: '#92400e', fontWeight: 700 } : {}}
                              onChange={(e) => handleCellChange(d.dateKey, col.key, e.target.value)}
                              readOnly={!isAdmin}
                            />
                          </td>
                        );
                      })}

                      {/* Auto-calculated total */}
                      <td className="attendance-register-total">
                        <strong>{total}</strong>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>

            {/* Footer totals */}
            <tfoot>
              <tr>
                <th>Total</th>
                {displayColumns.map(col => (
                  <th key={`ft-${col.key}`}>{summary.colTotals[col.key]}</th>
                ))}
                <th>{summary.grandTotal}</th>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
