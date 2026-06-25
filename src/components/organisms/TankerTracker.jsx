import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { doc, getDoc, serverTimestamp, setDoc, deleteDoc } from 'firebase/firestore';
import * as XLSX from 'xlsx';
import { db, ensureFirebaseSession, isFirebaseConfigured } from '../../firebase.js';

// ─── Constants ────────────────────────────────────────────────────────────────

const LOCAL_STORAGE_KEY = 'majestique-tanker-register';
const AUTO_SAVE_DELAY_MS = 1500;
const DEFAULT_RATE = 700;

const FINANCIAL_YEAR_MONTHS = Array.from({ length: 12 }, (_, i) => {
  const d = new Date(2026, 3 + i, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
});

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

function buildFileSafeLabel(mv) {
  const { year, monthIndex } = parseMonthValue(mv);
  const month = new Intl.DateTimeFormat('en-IN', { month: 'short' })
    .format(new Date(year, monthIndex, 1));
  return `${month}-${year}`;
}

function formatDateLabel(date) {
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  }).format(date).replaceAll('/', '-');
}

function n(v) { return parseFloat(v) || 0; }
function fmt(v) {
  return Number(v).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** Build array of all day-entries for a given month-value */
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

/** Normalise entries from storage so every day has a record */
function normalizeEntries(days, src = {}) {
  return days.reduce((acc, d) => {
    const s = src[d.dateKey] || {};
    acc[d.dateKey] = {
      count: s.count !== undefined ? String(s.count) : '',
      rate: s.rate !== undefined ? String(s.rate) : String(DEFAULT_RATE),
    };
    return acc;
  }, {});
}

// ─── Local-storage helpers ────────────────────────────────────────────────────

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

export default function TankerTracker({ isAdmin = false }) {
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonthValue);
  const [entries, setEntries] = useState({});
  const [localRecords, setLocalRecords] = useState(readLocal);
  const [isLoading, setIsLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState('idle');
  const [saveMsg, setSaveMsg] = useState('');

  const monthDays = useMemo(() => buildMonthDays(selectedMonth), [selectedMonth]);
  const docId = `tanker_${selectedMonth}`;

  const isMountedRef = useRef(true);
  const autoSaveTimer = useRef(null);
  const pendingSaveRef = useRef(null);
  const isLoadedRef = useRef(false);

  useEffect(() => {
    isMountedRef.current = true;
    return () => { isMountedRef.current = false; };
  }, []);

  // ── Load from Firebase on month change ──────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    isLoadedRef.current = false;
    setSaveStatus('idle');
    setSaveMsg('');

    async function load() {
      setIsLoading(true);
      const localEntry = localRecords[docId] || {};
      const localEntries = localEntry.entries || {};

      if (!isFirebaseConfigured || !db) {
        if (!cancelled) {
          setEntries(normalizeEntries(monthDays, localEntries));
          setSaveMsg('Local mode — Firebase not connected.');
          setIsLoading(false);
          isLoadedRef.current = true;
        }
        return;
      }

      try {
        await ensureFirebaseSession();
        const snap = await getDoc(doc(db, 'tankerEntries', docId));
        if (!cancelled) {
          const data = snap.exists() ? snap.data() : null;
          const src = data?.entries || localEntries;
          setEntries(normalizeEntries(monthDays, src));
          setSaveMsg(snap.exists()
            ? `Synced — ${formatMonthLabel(selectedMonth)}`
            : `New — ${formatMonthLabel(selectedMonth)}`
          );
        }
      } catch (err) {
        console.error('Tanker load error:', err);
        if (!cancelled) {
          setEntries(normalizeEntries(monthDays, localEntries));
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
  }, [docId]);

  // ── Auto-save ────────────────────────────────────────────────────────────
  const saveToFirebase = useCallback(async (currentEntries, currentDocId, month) => {
    if (isMountedRef.current) setSaveStatus('saving');
    if (pendingSaveRef.current?.docId === currentDocId) pendingSaveRef.current = null;

    const payload = { month, entries: currentEntries };

    if (isFirebaseConfigured && db) {
      try {
        await ensureFirebaseSession();
        await setDoc(
          doc(db, 'tankerEntries', currentDocId),
          { ...payload, updatedAt: serverTimestamp() },
          { merge: true }
        );
        if (isMountedRef.current) {
          setSaveStatus('saved');
          setSaveMsg('Saved ✓');
        }
      } catch (err) {
        console.error('Tanker auto-save error:', err);
        const next = { ...readLocal(), [currentDocId]: { ...payload, savedAt: new Date().toISOString() } };
        writeLocal(next);
        if (isMountedRef.current) {
          setLocalRecords(next);
          setSaveStatus('error');
          setSaveMsg('Firebase save failed — saved locally instead.');
        }
      }
    } else {
      const next = { ...readLocal(), [currentDocId]: { ...payload, savedAt: new Date().toISOString() } };
      writeLocal(next);
      if (isMountedRef.current) {
        setLocalRecords(next);
        setSaveStatus('saved');
        setSaveMsg('Saved locally (Firebase not connected).');
      }
    }
  }, []);

  // Flush pending save on unmount
  useEffect(() => {
    return () => {
      if (pendingSaveRef.current) {
        const { entries, docId, month } = pendingSaveRef.current;
        saveToFirebase(entries, docId, month);
      }
      clearTimeout(autoSaveTimer.current);
    };
  }, [saveToFirebase]);

  // ── Cell change handler ──────────────────────────────────────────────────
  function handleCellChange(dateKey, field, value) {
    if (!isLoadedRef.current) return;

    setEntries(prev => {
      const updated = {
        ...prev,
        [dateKey]: { ...(prev[dateKey] || { count: '', rate: String(DEFAULT_RATE) }), [field]: value },
      };

      // Sync to local storage immediately
      const payload = { month: selectedMonth, entries: updated };
      const nextLocal = { ...readLocal(), [docId]: { ...payload, savedAt: new Date().toISOString() } };
      writeLocal(nextLocal);
      setLocalRecords(nextLocal);

      // Schedule auto-save
      pendingSaveRef.current = { entries: updated, docId, month: selectedMonth };
      clearTimeout(autoSaveTimer.current);
      setSaveStatus('pending');
      setSaveMsg('Unsaved changes…');
      autoSaveTimer.current = setTimeout(
        () => saveToFirebase(updated, docId, selectedMonth),
        AUTO_SAVE_DELAY_MS
      );
      return updated;
    });
  }

  // ── Delete month ────────────────────────────────────────────────────────
  async function handleDeleteMonth() {
    if (!window.confirm(`Permanently delete ALL tanker data for ${formatLongMonthLabel(selectedMonth)}?`)) return;
    clearTimeout(autoSaveTimer.current);
    setSaveStatus('saving');
    setSaveMsg('Deleting…');
    try {
      await ensureFirebaseSession();
      await deleteDoc(doc(db, 'tankerEntries', docId));
      setSaveStatus('saved');
      setSaveMsg(`Deleted data for ${formatLongMonthLabel(selectedMonth)}.`);
      setEntries(normalizeEntries(monthDays, {}));
    } catch (err) {
      console.error('Delete error:', err);
      setSaveStatus('error');
      setSaveMsg('Delete failed.');
    }
  }

  // ── Summary ──────────────────────────────────────────────────────────────
  const summary = useMemo(() => {
    const totalTankers = monthDays.reduce((s, d) => s + n(entries[d.dateKey]?.count), 0);
    const grandTotal = monthDays.reduce((s, d) => {
      const row = entries[d.dateKey] || {};
      return s + n(row.count) * n(row.rate);
    }, 0);
    const activeDays = monthDays.filter(d => n(entries[d.dateKey]?.count) > 0).length;
    return { totalTankers, grandTotal, activeDays };
  }, [entries, monthDays]);

  // ── Excel export ─────────────────────────────────────────────────────────
  function handleDownloadExcel() {
    const headers = ['Date', 'Day', 'Rate (₹)', 'Tanker Count', 'Total (₹)'];
    const dataRows = monthDays.map(d => {
      const row = entries[d.dateKey] || { count: '', rate: String(DEFAULT_RATE) };
      const count = n(row.count);
      const rate = n(row.rate);
      return [
        d.formattedDate,
        d.weekday,
        rate,
        count || '',
        count > 0 ? count * rate : '',
      ];
    });
    const totalsRow = ['Total', '', '', summary.totalTankers, summary.grandTotal];

    const ws = XLSX.utils.aoa_to_sheet([headers, ...dataRows, totalsRow]);
    ws['!cols'] = [{ wch: 14 }, { wch: 7 }, { wch: 12 }, { wch: 14 }, { wch: 14 }];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `Water Tanker ${formatMonthLabel(selectedMonth)}`);
    wb.Props = {
      Title: `Water Tanker Entries – ${formatLongMonthLabel(selectedMonth)}`,
      Author: 'Majestique Euriska Dashboard',
    };
    XLSX.writeFile(wb, `tanker-entries-${buildFileSafeLabel(selectedMonth)}.xlsx`);
    setSaveMsg(`Excel downloaded for ${formatLongMonthLabel(selectedMonth)}.`);
  }

  // ── Save-status badge ────────────────────────────────────────────────────
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
          <p className="eyebrow">Monthly tanker register</p>
          <h3>Daily entry table</h3>
          <p>Enter rate and water tanker count for each day — auto-saves to cloud.</p>
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
            <span>Days with delivery</span>
            <strong>{summary.activeDays}</strong>
          </div>
        </div>

        {/* Totals */}
        <div className="attendance-summary-grid">
          <div className="summary-card">
            <span>Days in Month</span>
            <strong>{monthDays.length}</strong>
          </div>
          <div className="summary-card">
            <span>Total Water Tankers</span>
            <strong>{summary.totalTankers}</strong>
          </div>
          <div className="summary-card">
            <span>Grand Total</span>
            <strong style={{ color: '#0f3d35' }}>₹{fmt(summary.grandTotal)}</strong>
          </div>
        </div>

        {/* Auto-save status */}
        <div
          className="attendance-note"
          style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 500, color: statusBadge.color, transition: 'color 0.3s' }}
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
        <div className="attendance-month-tabs" role="tablist" aria-label="Monthly tanker tabs">
          {FINANCIAL_YEAR_MONTHS.map(mv => (
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

        {/* Table header + actions */}
        <div className="attendance-table-card__header">
          <div>
            <p className="eyebrow">Daily entry sheet</p>
            <h3>Water Tanker Log — {formatMonthLabel(selectedMonth)}</h3>
          </div>
          <div className="attendance-table-card__actions">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: statusBadge.color, fontWeight: 500, fontSize: '0.85rem' }}>
              <span>{statusBadge.icon}</span>
              <span>{isLoading ? 'Loading…' : saveMsg || statusBadge.text}</span>
            </div>
            <button className="button-secondary" type="button" onClick={handleDownloadExcel}>
              ⬇ Download
            </button>
            {isAdmin && (
              <button
                className="button-secondary"
                type="button"
                onClick={handleDeleteMonth}
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
                <th style={{ minWidth: 130 }}>Date</th>
                <th style={{ minWidth: 120, textAlign: 'center' }}>Rate (₹)</th>
                <th style={{ minWidth: 120, textAlign: 'center' }}>Water Tanker Count</th>
                <th style={{ minWidth: 130, textAlign: 'right' }}>Total (₹)</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={4} style={{ textAlign: 'center', padding: '32px', opacity: 0.6 }}>
                    Loading {formatLongMonthLabel(selectedMonth)}…
                  </td>
                </tr>
              ) : (
                monthDays.map(d => {
                  const row = entries[d.dateKey] || { count: '', rate: String(DEFAULT_RATE) };
                  const count = n(row.count);
                  const rate = n(row.rate);
                  const rowTotal = count * rate;
                  const isSunday = d.date.getDay() === 0;

                  return (
                    <tr
                      key={d.dateKey}
                      style={{ background: isSunday ? 'rgba(239,68,68,0.04)' : undefined }}
                    >
                      {/* Date + weekday */}
                      <th className="attendance-register-date">
                        <strong>{d.formattedDate}</strong>
                        <span style={{ color: isSunday ? '#dc2626' : undefined }}>{d.weekday}</span>
                      </th>

                      {/* Rate input — editable per row */}
                      <td style={{ textAlign: 'center' }}>
                        <input
                          className="attendance-register-input"
                          type="text"
                          inputMode="numeric"
                          value={row.rate}
                          onChange={e => handleCellChange(d.dateKey, 'rate', e.target.value.replace(/[^0-9.]/g, ''))}
                          readOnly={!isAdmin}
                          style={{ width: 80, textAlign: 'right' }}
                        />
                      </td>

                      {/* Tanker count input */}
                      <td style={{ textAlign: 'center' }}>
                        <input
                          className="attendance-register-input"
                          type="text"
                          inputMode="numeric"
                          value={row.count}
                          onChange={e => handleCellChange(d.dateKey, 'count', e.target.value.replace(/[^0-9]/g, ''))}
                          readOnly={!isAdmin}
                          placeholder="0"
                          style={{ width: 64, textAlign: 'center' }}
                        />
                      </td>

                      {/* Auto-calculated total */}
                      <td className="attendance-register-total" style={{ textAlign: 'right' }}>
                        {count > 0 ? (
                          <strong style={{ color: '#0f3d35' }}>₹{fmt(rowTotal)}</strong>
                        ) : (
                          <span style={{ opacity: 0.3 }}>—</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>

            {/* Footer totals */}
            {!isLoading && (
              <tfoot>
                <tr>
                  <th>Total</th>
                  <th />
                  <th style={{ textAlign: 'center' }}>{summary.totalTankers}</th>
                  <th style={{ textAlign: 'right', color: '#0f3d35' }}>₹{fmt(summary.grandTotal)}</th>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}
