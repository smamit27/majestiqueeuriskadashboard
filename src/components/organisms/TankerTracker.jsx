import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { doc, getDoc, serverTimestamp, setDoc, deleteDoc } from 'firebase/firestore';
import * as XLSX from 'xlsx';
import { db, ensureFirebaseSession, isFirebaseConfigured } from '../../firebase.js';

// ─── Constants ────────────────────────────────────────────────────────────────

const LOCAL_STORAGE_KEY = 'majestique-tanker-register';
const AUTO_SAVE_DELAY_MS = 1500;
const DEFAULT_RATE = 800;

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
      remark: s.remark || '',
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
  const [commonRate, setCommonRate] = useState(String(DEFAULT_RATE));
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
      const localRate = localEntry.commonRate || String(DEFAULT_RATE);

      if (!isFirebaseConfigured || !db) {
        if (!cancelled) {
          setEntries(normalizeEntries(monthDays, localEntries));
          setCommonRate(localRate);
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
          const rate = data?.commonRate || localRate;
          setEntries(normalizeEntries(monthDays, src));
          setCommonRate(String(rate));
          setSaveMsg(snap.exists()
            ? `Synced — ${formatMonthLabel(selectedMonth)}`
            : `New — ${formatMonthLabel(selectedMonth)}`
          );
        }
      } catch (err) {
        console.error('Tanker load error:', err);
        if (!cancelled) {
          setEntries(normalizeEntries(monthDays, localEntries));
          setCommonRate(localRate);
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
  const saveToFirebase = useCallback(async (currentEntries, currentRate, currentDocId, month) => {
    if (isMountedRef.current) setSaveStatus('saving');
    if (pendingSaveRef.current?.docId === currentDocId) pendingSaveRef.current = null;

    const payload = { month, commonRate: currentRate, entries: currentEntries };

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
        const { entries, rate, docId, month } = pendingSaveRef.current;
        saveToFirebase(entries, rate, docId, month);
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
        [dateKey]: { ...(prev[dateKey] || { count: '', remark: '' }), [field]: value },
      };

      // Sync to local storage immediately
      const payload = { month: selectedMonth, commonRate, entries: updated };
      const nextLocal = { ...readLocal(), [docId]: { ...payload, savedAt: new Date().toISOString() } };
      writeLocal(nextLocal);
      setLocalRecords(nextLocal);

      // Schedule auto-save
      pendingSaveRef.current = { entries: updated, rate: commonRate, docId, month: selectedMonth };
      clearTimeout(autoSaveTimer.current);
      setSaveStatus('pending');
      setSaveMsg('Unsaved changes…');
      autoSaveTimer.current = setTimeout(
        () => saveToFirebase(updated, commonRate, docId, selectedMonth),
        AUTO_SAVE_DELAY_MS
      );
      return updated;
    });
  }

  // ── Rate change handler ──────────────────────────────────────────────────
  function handleRateChange(value) {
    const cleaned = value.replace(/[^0-9.]/g, '');
    setCommonRate(cleaned);

    if (!isLoadedRef.current) return;

    // Sync to local storage + schedule save
    const payload = { month: selectedMonth, commonRate: cleaned, entries };
    const nextLocal = { ...readLocal(), [docId]: { ...payload, savedAt: new Date().toISOString() } };
    writeLocal(nextLocal);
    setLocalRecords(nextLocal);

    pendingSaveRef.current = { entries, rate: cleaned, docId, month: selectedMonth };
    clearTimeout(autoSaveTimer.current);
    setSaveStatus('pending');
    setSaveMsg('Unsaved changes…');
    autoSaveTimer.current = setTimeout(
      () => saveToFirebase(entries, cleaned, docId, selectedMonth),
      AUTO_SAVE_DELAY_MS
    );
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
      setCommonRate(String(DEFAULT_RATE));
    } catch (err) {
      console.error('Delete error:', err);
      setSaveStatus('error');
      setSaveMsg('Delete failed.');
    }
  }

  // ── Summary ──────────────────────────────────────────────────────────────
  const summary = useMemo(() => {
    const rate = n(commonRate);
    const totalTankers = monthDays.reduce((s, d) => s + n(entries[d.dateKey]?.count), 0);
    const grandTotal = totalTankers * rate;
    const activeDays = monthDays.filter(d => n(entries[d.dateKey]?.count) > 0).length;
    return { totalTankers, grandTotal, activeDays, rate };
  }, [entries, monthDays, commonRate]);

  // ── Excel export ─────────────────────────────────────────────────────────
  function handleDownloadExcel() {
    const rate = n(commonRate);
    const headers = ['Date', 'Day', 'Common Rate (₹)', 'Tanker Count', 'Total (₹)', 'Remark'];
    const dataRows = monthDays.map(d => {
      const row = entries[d.dateKey] || { count: '', remark: '' };
      const count = n(row.count);
      return [
        d.formattedDate,
        d.weekday,
        rate,
        count || '',
        count > 0 ? count * rate : '',
        row.remark || '',
      ];
    });
    const totalsRow = ['Total', '', '', summary.totalTankers, summary.grandTotal, ''];

    const ws = XLSX.utils.aoa_to_sheet([headers, ...dataRows, totalsRow]);
    ws['!cols'] = [{ wch: 14 }, { wch: 7 }, { wch: 18 }, { wch: 14 }, { wch: 12 }, { wch: 26 }];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `Tanker ${formatMonthLabel(selectedMonth)}`);
    wb.Props = {
      Title: `Tanker Entries – ${formatLongMonthLabel(selectedMonth)}`,
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
          <p>Enter tanker count for each day — auto-saves to cloud.</p>
        </div>

        {/* Common rate input */}
        <div style={{
          background: 'rgba(30,58,138,0.06)',
          borderRadius: 12,
          padding: '14px 18px',
          border: '1px solid rgba(30,58,138,0.12)',
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          flexWrap: 'wrap',
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, opacity: 0.6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Common Rate (₹ per tanker)
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: '1rem', opacity: 0.5 }}>₹</span>
              <input
                type="text"
                inputMode="numeric"
                value={commonRate}
                onChange={e => handleRateChange(e.target.value)}
                readOnly={!isAdmin}
                style={{
                  padding: '8px 12px',
                  borderRadius: 8,
                  border: '1px solid rgba(0,0,0,0.15)',
                  fontSize: '1rem',
                  fontWeight: 700,
                  background: isAdmin ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.05)',
                  width: 120,
                  color: '#0f3d35',
                }}
              />
            </div>
          </div>
          <div style={{ fontSize: '0.85rem', opacity: 0.7 }}>
            Applied to all days in {formatLongMonthLabel(selectedMonth)}.
          </div>
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
            <span>Total Tankers</span>
            <strong>{summary.totalTankers}</strong>
          </div>
          <div className="summary-card">
            <span>Rate per Tanker</span>
            <strong>₹{n(commonRate).toLocaleString('en-IN')}</strong>
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
            <h3>Tanker Log — {formatMonthLabel(selectedMonth)}</h3>
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
                <th style={{ minWidth: 100, textAlign: 'center' }}>Tanker Count</th>
                <th style={{ minWidth: 120, textAlign: 'right' }}>Total (₹)</th>
                <th style={{ minWidth: 200 }}>Remark</th>
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
                  const row = entries[d.dateKey] || { count: '', remark: '' };
                  const count = n(row.count);
                  const rowTotal = count * n(commonRate);
                  const isSunday = d.date.getDay() === 0;

                  return (
                    <tr
                      key={d.dateKey}
                      style={{
                        background: isSunday ? 'rgba(239,68,68,0.04)' : undefined,
                      }}
                    >
                      {/* Date + weekday */}
                      <th className="attendance-register-date">
                        <strong>{d.formattedDate}</strong>
                        <span style={{ color: isSunday ? '#dc2626' : undefined }}>{d.weekday}</span>
                      </th>

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

                      {/* Remark */}
                      <td>
                        <input
                          className="attendance-register-input"
                          type="text"
                          value={row.remark}
                          onChange={e => handleCellChange(d.dateKey, 'remark', e.target.value)}
                          readOnly={!isAdmin}
                          placeholder="Optional note…"
                          style={{ minWidth: 160 }}
                        />
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
                  <th style={{ textAlign: 'center' }}>{summary.totalTankers}</th>
                  <th style={{ textAlign: 'right', color: '#0f3d35' }}>₹{fmt(summary.grandTotal)}</th>
                  <th />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}
