import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import * as XLSX from 'xlsx';
import { db, ensureFirebaseSession, isFirebaseConfigured } from '../firebase.js';

// ─── Constants ──────────────────────────────────────────────────────────────

const LOCAL_STORAGE_KEY = 'majestique-housekeeping-register';
const AUTO_SAVE_DELAY_MS = 1500; // debounce: wait 1.5 s after last keystroke

const FINANCIAL_YEAR_MONTHS = Array.from({ length: 12 }, (_, index) => {
  const date = new Date(2026, 3 + index, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
});

// Columns that count towards the daily manpower total (excludes tractorTrip)
const MANPOWER_COLUMNS = [
  { key: 'a',          label: 'A' },
  { key: 'b',          label: 'B' },
  { key: 'c',          label: 'C' },
  { key: 'supervisor', label: 'Supervisor' },
  { key: 'common',     label: 'Common' },
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
      a:          normalizeValue(s.a),
      b:          normalizeValue(s.b),
      c:          normalizeValue(s.c),
      supervisor: normalizeValue(s.supervisor),
      common:     normalizeValue(s.common),
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
  try { window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data)); } catch {}
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function HousekeepingAttendanceManager({ staffMembers = [] }) {
  const [selectedMonth, setSelectedMonth]       = useState(getCurrentMonthValue);
  const [entries, setEntries]                   = useState({});
  const [localRecords, setLocalRecords]         = useState(readLocal);
  const [isLoading, setIsLoading]               = useState(false);
  // saveStatus: 'idle' | 'pending' | 'saving' | 'saved' | 'error'
  const [saveStatus, setSaveStatus]             = useState('idle');
  const [saveMsg, setSaveMsg]                   = useState('');

  const monthDays  = useMemo(() => buildMonthDays(selectedMonth), [selectedMonth]);
  const recordId   = `register_${selectedMonth}`;

  // Track whether current entries came from a load (skip auto-save on initial load)
  const isLoadedRef    = useRef(false);
  const autoSaveTimer  = useRef(null);

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
              ? `Loaded from Firebase — ${formatLongMonthLabel(selectedMonth)}`
              : `New register — ${formatLongMonthLabel(selectedMonth)}`
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
          isLoadedRef.current = true;
        }
      }
    }

    load();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recordId]);

  // ── Auto-save: fires 1.5 s after last cell change ─────────────────────────
  const saveToFirebase = useCallback(async (currentEntries, currentRecordId, month) => {
    setSaveStatus('saving');
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
        setSaveStatus('saved');
        setSaveMsg('All changes saved to Firebase ✓');
      } catch (err) {
        console.error('Auto-save error:', err);
        // Fallback to local
        const next = { ...readLocal(), [currentRecordId]: { ...payload, savedAt: new Date().toISOString() } };
        writeLocal(next);
        setLocalRecords(next);
        setSaveStatus('error');
        setSaveMsg('Firebase save failed — saved locally instead.');
      }
    } else {
      const next = { ...readLocal(), [currentRecordId]: { ...payload, savedAt: new Date().toISOString() } };
      writeLocal(next);
      setLocalRecords(next);
      setSaveStatus('saved');
      setSaveMsg('Saved locally (Firebase not connected).');
    }
  }, [staffMembers.length]);

  // ── Cell change handler ───────────────────────────────────────────────────
  function handleCellChange(dateKey, field, value) {
    if (!isLoadedRef.current) return; // skip during initial hydration

    const next = (prev) => ({
      ...prev,
      [dateKey]: { ...(prev[dateKey] || emptyRow()), [field]: normalizeValue(value) },
    });

    setEntries((prev) => {
      const updated = next(prev);
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

  // Cleanup timer on unmount
  useEffect(() => () => clearTimeout(autoSaveTimer.current), []);

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
      { wch: 6  }, // Day
      { wch: 7  }, // A
      { wch: 7  }, // B
      { wch: 7  }, // C
      { wch: 12 }, // Supervisor
      { wch: 10 }, // Common
      { wch: 9  }, // Total
      { wch: 13 }, // Tractor Trip
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `HK ${formatMonthLabel(selectedMonth)}`);
    wb.Props = {
      Title:  `Housekeeping Attendance – ${formatLongMonthLabel(selectedMonth)}`,
      Author: 'Majestique Euriska Dashboard',
    };

    XLSX.writeFile(wb, `housekeeping-attendance-${buildFileSafeLabel(selectedMonth)}.xlsx`);
    setSaveMsg(`Excel downloaded for ${formatLongMonthLabel(selectedMonth)}.`);
  }

  // ── Save-status badge ─────────────────────────────────────────────────────
  const statusBadge = {
    idle:    { color: '#6b7280', icon: '●', text: 'Ready' },
    pending: { color: '#f59e0b', icon: '⏳', text: 'Saving…' },
    saving:  { color: '#3b82f6', icon: '↑', text: 'Saving to Firebase…' },
    saved:   { color: '#10b981', icon: '✓', text: 'Saved' },
    error:   { color: '#ef4444', icon: '✗', text: 'Save failed' },
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
            Enter daily deployment values — changes are saved to Firebase automatically.
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
            <h3>Housekeeping Attendance — {formatLongMonthLabel(selectedMonth)}</h3>
          </div>
          <div className="attendance-table-card__actions">
            <p>Type values directly — auto-saves to Firebase after every change.</p>
            <button className="button-secondary" type="button" onClick={handleDownloadExcel}>
              ⬇ Download Excel
            </button>
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
                            type="number"
                            min="0"
                            step="1"
                            inputMode="numeric"
                            placeholder="0"
                            value={row[col.key]}
                            onChange={(e) => handleCellChange(d.dateKey, col.key, e.target.value)}
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
                          placeholder="0"
                          value={row.tractorTrip}
                          onChange={(e) => handleCellChange(d.dateKey, 'tractorTrip', e.target.value)}
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
