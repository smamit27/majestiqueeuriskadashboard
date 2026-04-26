import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import * as XLSX from 'xlsx';
import { db, ensureFirebaseSession, isFirebaseConfigured } from '../firebase.js';

// ─── Constants ────────────────────────────────────────────────────────────────

const LOCAL_STORAGE_KEY  = 'majestique-security-register';
const AUTO_SAVE_DELAY_MS = 1500;

const FINANCIAL_YEAR_MONTHS = Array.from({ length: 12 }, (_, i) => {
  const d = new Date(2026, 3 + i, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
});

/** All guard-post columns that contribute to daily total */
const SECURITY_COLUMNS = [
  { key: 'aBuilding',   label: 'A Building'   },
  { key: 'bBuilding',   label: 'B Building'   },
  { key: 'cBuilding',   label: 'C Building'   },
  { key: 'commonArea',  label: 'Common Area'  },
  { key: 'chauhanji',   label: 'Chauhanji'    },
];

// ─── Pure helpers ─────────────────────────────────────────────────────────────

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
  return SECURITY_COLUMNS.reduce((s, col) => s + getNum(row[col.key]), 0);
}

function emptyRow() {
  return { aBuilding: '', bBuilding: '', cBuilding: '', commonArea: '', chauhanji: '' };
}

function buildMonthDays(mv) {
  const { year, monthIndex } = parseMonthValue(mv);
  const total = new Date(year, monthIndex + 1, 0).getDate();
  return Array.from({ length: total }, (_, i) => {
    const day  = i + 1;
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
      aBuilding:  normalizeValue(s.aBuilding),
      bBuilding:  normalizeValue(s.bBuilding),
      cBuilding:  normalizeValue(s.cBuilding),
      commonArea: normalizeValue(s.commonArea),
      chauhanji:  normalizeValue(s.chauhanji),
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
  try { window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data)); } catch {}
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function SecurityAttendanceManager() {
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonthValue);
  const [entries,       setEntries]       = useState({});
  const [localRecords,  setLocalRecords]  = useState(readLocal);
  const [isLoading,     setIsLoading]     = useState(false);
  const [saveStatus,    setSaveStatus]    = useState('idle');
  const [saveMsg,       setSaveMsg]       = useState('');

  const monthDays  = useMemo(() => buildMonthDays(selectedMonth), [selectedMonth]);
  const recordId   = `security_register_${selectedMonth}`;

  const isLoadedRef   = useRef(false);
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
              ? `Loaded from Firebase — ${formatLongMonthLabel(selectedMonth)}`
              : `New register — ${formatLongMonthLabel(selectedMonth)}`
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

  // ── Auto-save to Firebase ─────────────────────────────────────────────────
  const saveToFirebase = useCallback(async (currentEntries, currentRecordId, month) => {
    setSaveStatus('saving');
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
        setSaveMsg('All changes saved to Firebase ✓');
      } catch (err) {
        console.error('Security auto-save error:', err);
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
  }, []);

  // ── Cell change → debounced auto-save ────────────────────────────────────
  function handleCellChange(dateKey, field, value) {
    if (!isLoadedRef.current) return;

    setEntries((prev) => {
      const updated = {
        ...prev,
        [dateKey]: { ...(prev[dateKey] || emptyRow()), [field]: normalizeValue(value) },
      };
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

  useEffect(() => () => clearTimeout(autoSaveTimer.current), []);

  // ── Summary totals ────────────────────────────────────────────────────────
  const summary = useMemo(() => {
    const colTotals = SECURITY_COLUMNS.reduce((acc, col) => {
      acc[col.key] = monthDays.reduce((s, d) => {
        const row = entries[d.dateKey] || emptyRow();
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
  }, [entries, monthDays]);

  // ── Excel download ────────────────────────────────────────────────────────
  function handleDownloadExcel() {
    const headers = [
      'Date', 'Day',
      ...SECURITY_COLUMNS.map(c => c.label),
      'Total'
    ];

    const dataRows = monthDays.map((d) => {
      const row = entries[d.dateKey] || emptyRow();
      return [
        d.formattedDate,
        d.weekday,
        ...SECURITY_COLUMNS.map(c => getNum(row[c.key])),
        rowTotal(row),
      ];
    });

    const totalsRow = [
      'Total', '',
      ...SECURITY_COLUMNS.map(c => summary.colTotals[c.key]),
      summary.grandTotal,
    ];

    const ws = XLSX.utils.aoa_to_sheet([headers, ...dataRows, totalsRow]);
    ws['!cols'] = [
      { wch: 14 }, // Date
      { wch: 6  }, // Day
      { wch: 12 }, // A Building
      { wch: 12 }, // B Building
      { wch: 12 }, // C Building
      { wch: 13 }, // Common Area
      { wch: 12 }, // Chauhanji
      { wch: 9  }, // Total
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `Sec ${formatMonthLabel(selectedMonth)}`);
    wb.Props = {
      Title:  `Security Attendance — ${formatLongMonthLabel(selectedMonth)}`,
      Author: 'Majestique Euriska Dashboard',
    };

    XLSX.writeFile(wb, `security-attendance-${buildFileSafeLabel(selectedMonth)}.xlsx`);
    setSaveMsg(`Excel downloaded for ${formatLongMonthLabel(selectedMonth)}.`);
  }

  // ── Status badge ──────────────────────────────────────────────────────────
  const badge = {
    idle:    { color: '#6b7280', icon: '●', text: 'Ready'                    },
    pending: { color: '#f59e0b', icon: '⏳', text: 'Saving…'                 },
    saving:  { color: '#3b82f6', icon: '↑', text: 'Saving to Firebase…'      },
    saved:   { color: '#10b981', icon: '✓', text: 'Saved'                    },
    error:   { color: '#ef4444', icon: '✗', text: 'Save failed'              },
  }[saveStatus];

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="attendance-manager attendance-manager--register">

      {/* ── Controls panel ── */}
      <div className="attendance-manager__controls stack-card">
        <div>
          <p className="eyebrow">Monthly security register</p>
          <h3>Guard deployment entry table</h3>
          <p>Enter daily guard counts per post — changes auto-save to Firebase.</p>
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
            <span>Monthly guard total</span>
            <strong>{summary.grandTotal}</strong>
          </div>
          <div className="summary-card">
            <span>Avg guards / day</span>
            <strong>{summary.avgDaily}</strong>
          </div>
          {SECURITY_COLUMNS.map(col => (
            <div key={col.key} className="summary-card">
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
            <p className="eyebrow">Daily guard deployment sheet</p>
            <h3>Security Attendance — {formatLongMonthLabel(selectedMonth)}</h3>
          </div>
          <div className="attendance-table-card__actions">
            <p>Enter guard counts per building/post — auto-saves to Firebase after every change.</p>
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
                {SECURITY_COLUMNS.map(col => (
                  <th key={col.key}>{col.label}</th>
                ))}
                <th>Total</th>
              </tr>
            </thead>

            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={SECURITY_COLUMNS.length + 2}
                    style={{ textAlign: 'center', padding: '24px', opacity: 0.6 }}>
                    Loading {formatLongMonthLabel(selectedMonth)}…
                  </td>
                </tr>
              ) : (
                monthDays.map((d) => {
                  const row   = entries[d.dateKey] || emptyRow();
                  const total = rowTotal(row);

                  return (
                    <tr key={d.dateKey}>
                      {/* Date + weekday */}
                      <th className="attendance-register-date">
                        <strong>{d.formattedDate}</strong>
                        <span>{d.weekday}</span>
                      </th>

                      {/* Guard-post inputs */}
                      {SECURITY_COLUMNS.map(col => (
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
                    </tr>
                  );
                })
              )}
            </tbody>

            {/* Footer totals */}
            <tfoot>
              <tr>
                <th>Total</th>
                {SECURITY_COLUMNS.map(col => (
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
