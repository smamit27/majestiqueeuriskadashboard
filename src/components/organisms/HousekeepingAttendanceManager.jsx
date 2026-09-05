import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { doc, getDoc, serverTimestamp, setDoc, deleteDoc } from 'firebase/firestore';
import * as XLSX from 'xlsx';
import { db, ensureFirebaseSession, isFirebaseConfigured } from '../../firebase.js';

// ─── Constants ──────────────────────────────────────────────────────────────

const LOCAL_STORAGE_KEY = 'majestique-housekeeping-register';
const AUTO_SAVE_DELAY_MS = 1500; // debounce: wait 1.5 s after last keystroke

const FINANCIAL_YEAR_MONTHS = Array.from({ length: 12 }, (_, index) => {
  const date = new Date(2026, 3 + index, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
});

// Columns that count towards the daily manpower total (excludes tractorTrip)
const MANPOWER_COLUMNS = [
  { key: 'a', label: 'A' },
  { key: 'b', label: 'B' },
  { key: 'c', label: 'C' },
  { key: 'supervisor', label: 'Supervisor' },
  { key: 'common', label: 'Common' },
];

// ─── Pure helpers ────────────────────────────────────────────────────────────

function getCurrentMonthValue() {
  const d = new Date();
  const v = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  return FINANCIAL_YEAR_MONTHS.includes(v) ? v : FINANCIAL_YEAR_MONTHS[0];
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
  const month = new Intl.DateTimeFormat('en-IN', { month: 'short' })
    .format(new Date(year, monthIndex, 1));
  return `${month}-${year}`;
}

function normalizeValue(v) {
  if (v === '' || v === null || v === undefined) return '';
  const n = Number(v);
  return Number.isFinite(n) ? Math.max(0, n) : '';
}

function getNum(v) { return v === '' ? 0 : Number(v) || 0; }

function rowTotal(row) {
  return MANPOWER_COLUMNS.reduce((s, col) => s + getNum(row[col.key]), 0);
}

function emptyRow() {
  return { a: '', b: '', c: '', supervisor: '', common: '', tractorTrip: '' };
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
      a: normalizeValue(s.a),
      b: normalizeValue(s.b),
      c: normalizeValue(s.c),
      supervisor: normalizeValue(s.supervisor),
      common: normalizeValue(s.common),
      tractorTrip: normalizeValue(s.tractorTrip),
    };
    return acc;
  }, {});
}

// ─── Local-storage helpers ───────────────────────────────────────────────────

function readLocal() {
  try {
    const raw = window.localStorage.getItem(LOCAL_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

function writeLocal(data) {
  try { window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data)); } catch { }
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function HousekeepingAttendanceManager({ isAdmin = false, staffMembers = [] }) {
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonthValue);
  const [entries, setEntries] = useState({});
  const [localRecords, setLocalRecords] = useState(readLocal);
  const [isLoading, setIsLoading] = useState(false);
  // saveStatus: 'idle' | 'pending' | 'saving' | 'saved' | 'error'
  const [saveStatus, setSaveStatus] = useState('idle');
  const [saveMsg, setSaveMsg] = useState('');

  const monthDays = useMemo(() => buildMonthDays(selectedMonth), [selectedMonth]);
  const recordId = `register_${selectedMonth}`;

  // Track whether current entries came from a load (skip auto-save on initial load)
  const isLoadedRef = useRef(false);
  const autoSaveTimer = useRef(null);
  const isMountedRef = useRef(true);
  const pendingSaveRef = useRef(null);

  // Track mounting state
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // ── Load from Firebase when month changes ─────────────────────────────────
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
        const snap = await getDoc(doc(db, 'housekeepingAttendanceRegisters', recordId));
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
        console.error('Load error:', err);
        if (!cancelled) {
          setEntries(normalizeEntries(monthDays, localEntry));
          setSaveMsg('Firebase unavailable — showing local data.');
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
          if (isMountedRef.current) isLoadedRef.current = true;
        }
      }
    }

    load();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recordId]);

  // ── Auto-save: fires 1.5 s after last cell change ─────────────────────────
  const saveToFirebase = useCallback(async (currentEntries, currentRecordId, month) => {
    if (isMountedRef.current) setSaveStatus('saving');

    // Clear pending save ref if it matches the current save
    if (pendingSaveRef.current && pendingSaveRef.current.recordId === currentRecordId) {
      pendingSaveRef.current = null;
    }

    const payload = {
      month,
      registerType: 'daily-manpower',
      rosterCount: staffMembers.length,
      entries: currentEntries,
    };

    if (isFirebaseConfigured && db) {
      try {
        await ensureFirebaseSession();
        await setDoc(
          doc(db, 'housekeepingAttendanceRegisters', currentRecordId),
          { ...payload, updatedAt: serverTimestamp() },
          { merge: true }
        );
        if (isMountedRef.current) {
          setSaveStatus('saved');
          setSaveMsg('Saved ✓');
        }
      } catch (err) {
        console.error('Auto-save error:', err);
        // Fallback to local
        const next = { ...readLocal(), [currentRecordId]: { ...payload, savedAt: new Date().toISOString() } };
        writeLocal(next);
        if (isMountedRef.current) {
          setLocalRecords(next);
          setSaveStatus('error');
          setSaveMsg('Firebase save failed — saved locally instead.');
        }
      }
    } else {
      const next = { ...readLocal(), [currentRecordId]: { ...payload, savedAt: new Date().toISOString() } };
      writeLocal(next);
      if (isMountedRef.current) {
        setLocalRecords(next);
        setSaveStatus('saved');
        setSaveMsg('Saved locally (Firebase not connected).');
      }
    }
  }, [staffMembers.length]);

  // Flush save on unmount if there is a pending save
  useEffect(() => {
    return () => {
      if (pendingSaveRef.current) {
        const { entries, recordId, month } = pendingSaveRef.current;
        saveToFirebase(entries, recordId, month);
      }
      clearTimeout(autoSaveTimer.current);
    };
  }, [saveToFirebase]);

  const handleDeleteMonthData = async (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    // Clear any pending auto-saves
    clearTimeout(autoSaveTimer.current);

    if (!window.confirm(`Are you sure you want to PERMANENTLY delete all housekeeping data (attendance and billing) for ${formatLongMonthLabel(selectedMonth)}?`)) return;

    setSaveStatus('saving');
    setSaveMsg('Deleting data...');

    try {
      await ensureFirebaseSession();
      // Delete attendance register
      await deleteDoc(doc(db, 'housekeepingAttendanceRegisters', recordId));
      // Delete bill record
      await deleteDoc(doc(db, 'housekeepingBillCalculations', `hk_bill_${selectedMonth}`));

      setSaveStatus('saved');
      setSaveMsg(`Deleted data for ${formatLongMonthLabel(selectedMonth)}.`);
      window.location.reload(); // Refresh to clear state
    } catch (err) {
      console.error('Delete error:', err);
      setSaveStatus('error');
      setSaveMsg('Failed to delete data.');
    }
  };

  // ── Cell change handler ───────────────────────────────────────────────────
  function handleCellChange(dateKey, field, value) {
    if (!isLoadedRef.current) return; // skip during initial hydration

    const nextEntries = (prev) => {
      const updated = {
        ...prev,
        [dateKey]: { ...(prev[dateKey] || emptyRow()), [field]: normalizeValue(value) },
      };

      // Save to local storage synchronously so it is never lost on tab switch/unmount!
      const payload = {
        month: selectedMonth,
        registerType: 'daily-manpower',
        rosterCount: staffMembers.length,
        entries: updated,
      };
      const nextLocal = { ...readLocal(), [recordId]: { ...payload, savedAt: new Date().toISOString() } };
      writeLocal(nextLocal);
      setLocalRecords(nextLocal);

      // Trigger a custom event to notify other components (like Bill Calculator)
      window.dispatchEvent(new CustomEvent('attendanceUpdated', { detail: { month: selectedMonth, entries: updated } }));

      return updated;
    };

    setEntries((prev) => {
      const updated = nextEntries(prev);
      pendingSaveRef.current = { entries: updated, recordId, month: selectedMonth };
      // Debounce auto-save
      clearTimeout(autoSaveTimer.current);
      setSaveStatus('pending');
      setSaveMsg('Unsaved changes…');
      autoSaveTimer.current = setTimeout(
        () => saveToFirebase(updated, recordId, selectedMonth),
        AUTO_SAVE_DELAY_MS
      );
      return updated;
    });
  }

  // ── Summary totals ────────────────────────────────────────────────────────
  const summary = useMemo(() => {
    const colTotals = [...MANPOWER_COLUMNS, { key: 'tractorTrip' }].reduce((acc, col) => {
      acc[col.key] = monthDays.reduce((s, d) => {
        const row = entries[d.dateKey] || emptyRow();
        return s + getNum(row[col.key]);
      }, 0);
      return acc;
    }, {});

    const manpowerTotal = monthDays.reduce((s, d) => s + rowTotal(entries[d.dateKey] || emptyRow()), 0);

    return {
      daysInMonth: monthDays.length,
      manpowerTotal,
      tractorTripTotal: colTotals.tractorTrip || 0,
      avgDaily: monthDays.length ? (manpowerTotal / monthDays.length).toFixed(1) : '0.0',
      colTotals,
    };
  }, [entries, monthDays]);

  // ── Excel download ────────────────────────────────────────────────────────
  function handleDownloadExcel() {
    const headers = ['Date', 'Day', 'A', 'B', 'C', 'Supervisor', 'Common', 'Total', 'Tractor Trip'];

    const dataRows = monthDays.map((d) => {
      const row = entries[d.dateKey] || emptyRow();
      return [
        d.formattedDate,
        d.weekday,
        getNum(row.a),
        getNum(row.b),
        getNum(row.c),
        getNum(row.supervisor),
        getNum(row.common),
        rowTotal(row),
        getNum(row.tractorTrip),
      ];
    });

    const totalsRow = [
      'Total', '',
      summary.colTotals.a,
      summary.colTotals.b,
      summary.colTotals.c,
      summary.colTotals.supervisor,
      summary.colTotals.common,
      summary.manpowerTotal,
      summary.tractorTripTotal,
    ];

    const ws = XLSX.utils.aoa_to_sheet([headers, ...dataRows, totalsRow]);
    ws['!cols'] = [
      { wch: 14 }, // Date
      { wch: 6 }, // Day
      { wch: 7 }, // A
      { wch: 7 }, // B
      { wch: 7 }, // C
      { wch: 12 }, // Supervisor
      { wch: 10 }, // Common
      { wch: 9 }, // Total
      { wch: 13 }, // Tractor Trip
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `HK ${formatMonthLabel(selectedMonth)}`);
    wb.Props = {
      Title: `Housekeeping Attendance – ${formatLongMonthLabel(selectedMonth)}`,
      Author: 'Majestique Euriska Dashboard',
    };

    XLSX.writeFile(wb, `housekeeping-attendance-${buildFileSafeLabel(selectedMonth)}.xlsx`);
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
        <title>Majestique Euriska - Housekeeping Staff Attendance (${longMonth})</title>
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
            @page { margin: 1cm; size: A4 portrait; }
            thead { display: table-header-group; }
            tr { page-break-inside: avoid; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <h1 class="title">🧹 Majestique Euriska - Housekeeping Attendance Register</h1>
            <div class="subtitle">Monthly Housekeeping & Cleaning Manpower Deployment • FY April 2026 – March 2027</div>
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
          <div class="summary-item">Staff in Roster: <strong>${staffMembers.length}</strong></div>
          <div>•</div>
          <div class="summary-item">Monthly Manpower: <strong>${summary.manpowerTotal}</strong></div>
          <div>•</div>
          <div class="summary-item">Tractor Trips: <strong>${summary.tractorTripTotal}</strong></div>
          <div>•</div>
          <div class="summary-item">Avg / Day: <strong>${summary.avgDaily}</strong></div>
        </div>

        <table>
          <thead>
            <tr>
              <th class="th-date" style="width: 105px;">Date</th>
              <th style="width: 50px;">Day</th>
              ${MANPOWER_COLUMNS.map(col => `
                <th>${col.label}</th>
              `).join('')}
              <th style="width: 60px; font-weight: 800;">Total</th>
              <th style="width: 80px;">Tractor Trip</th>
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
                  ${MANPOWER_COLUMNS.map(col => `
                    <td>${getNum(row[col.key]) || '0'}</td>
                  `).join('')}
                  <td style="font-weight: 700;">${total}</td>
                  <td>${getNum(row.tractorTrip) || '0'}</td>
                </tr>
              `;
            }).join('')}
          </tbody>
          <tfoot>
            <tr>
              <th colspan="2" style="text-align: right; text-transform: uppercase; letter-spacing: 0.05em;">Total:</th>
              ${MANPOWER_COLUMNS.map(col => `
                <th>${summary.colTotals[col.key]}</th>
              `).join('')}
              <th style="font-weight: 800; font-size: 11px;">${summary.manpowerTotal}</th>
              <th>${summary.tractorTripTotal}</th>
            </tr>
          </tfoot>
        </table>

        <div class="sig-section">
          <div class="sig-box">Housekeeping Agency Supervisor</div>
          <div class="sig-box">Estate Manager / Society Office</div>
          <div class="sig-box">Authorised Signatory / Committee</div>
        </div>

        <div class="footer">
          <div>Majestique Euriska Co-Op Housing Society • Housekeeping Staff Deployment Register</div>
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

  // ── Save-status badge ─────────────────────────────────────────────────────
  const statusBadge = {
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
          <p className="eyebrow">Monthly housekeeping register</p>
          <h3>Manager entry table</h3>
          <p>
            Auto-saves to cloud.
          </p>
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
            <span>Staff in roster</span>
            <strong>{staffMembers.length}</strong>
          </div>
        </div>

        {/* Totals grid */}
        <div className="attendance-summary-grid">
          <div className="summary-card">
            <span>Days in month</span>
            <strong>{summary.daysInMonth}</strong>
          </div>
          <div className="summary-card">
            <span>Monthly manpower</span>
            <strong>{summary.manpowerTotal}</strong>
          </div>
          <div className="summary-card">
            <span>Tractor trips</span>
            <strong>{summary.tractorTripTotal}</strong>
          </div>
          <div className="summary-card">
            <span>Avg daily total</span>
            <strong>{summary.avgDaily}</strong>
          </div>
        </div>

        {/* Column totals */}
        <div className="attendance-status-list">
          {MANPOWER_COLUMNS.map((col) => (
            <div key={col.key} className="attendance-status-item">
              <span>{col.label} total</span>
              <strong>{summary.colTotals[col.key]}</strong>
            </div>
          ))}
          <div className="attendance-status-item">
            <span>Tractor Trip total</span>
            <strong>{summary.tractorTripTotal}</strong>
          </div>
        </div>

        {/* Auto-save status */}
        <div
          className="attendance-note"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontWeight: 500,
            color: statusBadge.color,
            transition: 'color 0.3s',
          }}
        >
          <span style={{ fontSize: '1rem' }}>{statusBadge.icon}</span>
          <span>
            {isLoading
              ? `Loading ${formatLongMonthLabel(selectedMonth)}…`
              : saveMsg || statusBadge.text}
          </span>
        </div>
      </div>

      {/* ── Table panel ── */}
      <div className="table-card attendance-table-card attendance-table-card--register">

        {/* Month tabs */}
        <div className="attendance-month-tabs" role="tablist" aria-label="Monthly register tabs">
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
            <p className="eyebrow">Daily entry sheet</p>
            <h3>HK Attendance — {formatMonthLabel(selectedMonth)}</h3>
          </div>
          <div className="attendance-table-card__actions">
            <p>Auto-saves to cloud.</p>
            <button className="button-secondary" type="button" onClick={handleDownloadExcel}>
              ⬇ Download
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

        {/* Table */}
        <div className="attendance-table-scroll">
          <table className="attendance-table attendance-table--register">
            <thead>
              <tr>
                <th style={{ minWidth: 110 }}>Date</th>
                {MANPOWER_COLUMNS.map((col) => (
                  <th key={col.key}>{col.label}</th>
                ))}
                <th>Total</th>
                <th>Tractor Trip</th>
              </tr>
            </thead>

            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '24px', opacity: 0.6 }}>
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

                      {/* A, B, C, Supervisor, Common */}
                      {MANPOWER_COLUMNS.map((col) => (
                        <td key={`${d.dateKey}-${col.key}`}>
                          <input
                            className="attendance-register-input"
                            type="text"
                            inputMode="numeric"

                            value={row[col.key]}
                            onChange={(e) => handleCellChange(d.dateKey, col.key, e.target.value)}
                            readOnly={!isAdmin}
                          />
                        </td>
                      ))}

                      {/* Auto-calculated total */}
                      <td className="attendance-register-total">
                        <strong>{total}</strong>
                      </td>

                      {/* Tractor Trip */}
                      <td>
                        <input
                          className="attendance-register-input"
                          type="number"
                          min="0"
                          step="1"
                          inputMode="numeric"

                          value={row.tractorTrip}
                          onChange={(e) => handleCellChange(d.dateKey, 'tractorTrip', e.target.value)}
                          readOnly={!isAdmin}
                        />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>

            {/* Column totals footer */}
            <tfoot>
              <tr>
                <th>Total</th>
                {MANPOWER_COLUMNS.map((col) => (
                  <th key={`ft-${col.key}`}>{summary.colTotals[col.key]}</th>
                ))}
                <th>{summary.manpowerTotal}</th>
                <th>{summary.tractorTripTotal}</th>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
