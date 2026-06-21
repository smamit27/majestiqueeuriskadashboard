import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { doc, getDoc, serverTimestamp, setDoc, deleteDoc } from 'firebase/firestore';
import * as XLSX from 'xlsx';
import { db, ensureFirebaseSession, isFirebaseConfigured } from '../../firebase.js';

// ─── Constants ───────────────────────────────────────────────────────────────

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

function n(v) { return parseFloat(v) || 0; }
function fmt(v) {
  return Number(v).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function genId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function emptyEntry() {
  return { id: genId(), date: todayStr(), rate: String(DEFAULT_RATE), quantity: '1', remark: '' };
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
  const [entries, setEntries] = useState([]);
  const [localRecords, setLocalRecords] = useState(readLocal);
  const [isLoading, setIsLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState('idle');
  const [saveMsg, setSaveMsg] = useState('');

  const docId = `tanker_${selectedMonth}`;
  const isMountedRef = useRef(true);
  const autoSaveTimer = useRef(null);
  const pendingSaveRef = useRef(null);
  const isLoadedRef = useRef(false);

  useEffect(() => {
    isMountedRef.current = true;
    return () => { isMountedRef.current = false; };
  }, []);

  // ── Load from Firebase on month change ───────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    isLoadedRef.current = false;
    setSaveStatus('idle');
    setSaveMsg('');

    async function load() {
      setIsLoading(true);
      const localData = localRecords[docId]?.entries || [];

      if (!isFirebaseConfigured || !db) {
        if (!cancelled) {
          setEntries(localData);
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
          const src = snap.exists() ? (snap.data().entries || []) : localData;
          setEntries(src);
          setSaveMsg(snap.exists()
            ? `Synced — ${formatMonthLabel(selectedMonth)}`
            : `New — ${formatMonthLabel(selectedMonth)}`
          );
        }
      } catch (err) {
        console.error('Tanker load error:', err);
        if (!cancelled) {
          setEntries(localData);
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

  // ── Mutation helpers ─────────────────────────────────────────────────────
  function scheduleAutoSave(nextEntries) {
    if (!isLoadedRef.current) return;
    pendingSaveRef.current = { entries: nextEntries, docId, month: selectedMonth };
    clearTimeout(autoSaveTimer.current);
    setSaveStatus('pending');
    setSaveMsg('Unsaved changes…');
    autoSaveTimer.current = setTimeout(
      () => saveToFirebase(nextEntries, docId, selectedMonth),
      AUTO_SAVE_DELAY_MS
    );
  }

  function persistAndUpdate(nextEntries) {
    // Local-storage sync
    const payload = { month: selectedMonth, entries: nextEntries };
    const next = { ...readLocal(), [docId]: { ...payload, savedAt: new Date().toISOString() } };
    writeLocal(next);
    setLocalRecords(next);
    setEntries(nextEntries);
    scheduleAutoSave(nextEntries);
  }

  function handleAddRow() {
    persistAndUpdate([...entries, emptyEntry()]);
  }

  function handleCellChange(id, field, value) {
    if (!isLoadedRef.current) return;
    const nextEntries = entries.map(e =>
      e.id === id ? { ...e, [field]: value } : e
    );
    persistAndUpdate(nextEntries);
  }

  function handleDeleteRow(id) {
    if (!window.confirm('Delete this tanker entry?')) return;
    persistAndUpdate(entries.filter(e => e.id !== id));
  }

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
      setEntries([]);
    } catch (err) {
      console.error('Delete error:', err);
      setSaveStatus('error');
      setSaveMsg('Delete failed.');
    }
  }

  // ── Summary ──────────────────────────────────────────────────────────────
  const summary = useMemo(() => {
    const totalTrips = entries.reduce((s, e) => s + n(e.quantity), 0);
    const grandTotal = entries.reduce((s, e) => s + n(e.rate) * n(e.quantity), 0);
    return { totalTrips, grandTotal, count: entries.length };
  }, [entries]);

  // ── Excel export ─────────────────────────────────────────────────────────
  function handleDownloadExcel() {
    const headers = ['Date', 'Common Rate (₹)', 'Quantity / Trips', 'Total (₹)', 'Remark'];
    const dataRows = entries.map(e => [
      e.date,
      n(e.rate),
      n(e.quantity),
      n(e.rate) * n(e.quantity),
      e.remark || '',
    ]);
    const totalsRow = ['Total', '', summary.totalTrips, summary.grandTotal, ''];

    const ws = XLSX.utils.aoa_to_sheet([headers, ...dataRows, totalsRow]);
    ws['!cols'] = [{ wch: 14 }, { wch: 18 }, { wch: 18 }, { wch: 14 }, { wch: 24 }];

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
          <h3>Daily entry log</h3>
          <p>Record each tanker delivery — auto-saves to cloud.</p>
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
            <span>Entries this month</span>
            <strong>{summary.count}</strong>
          </div>
        </div>

        {/* Totals */}
        <div className="attendance-summary-grid">
          <div className="summary-card">
            <span>Total Trips</span>
            <strong>{summary.totalTrips}</strong>
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
            {isAdmin && (
              <button className="button-primary" type="button" onClick={handleAddRow}>
                + Add Entry
              </button>
            )}
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
                <th style={{ minWidth: 150 }}>Common Rate (₹)</th>
                <th style={{ minWidth: 130 }}>Qty / Trips</th>
                <th style={{ minWidth: 130 }}>Total (₹)</th>
                <th style={{ minWidth: 200 }}>Remark</th>
                {isAdmin && <th style={{ minWidth: 70 }}>Action</th>}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={isAdmin ? 6 : 5} style={{ textAlign: 'center', padding: '32px', opacity: 0.6 }}>
                    Loading {formatLongMonthLabel(selectedMonth)}…
                  </td>
                </tr>
              ) : entries.length === 0 ? (
                <tr className="empty-row">
                  <td colSpan={isAdmin ? 6 : 5}>
                    No entries for {formatLongMonthLabel(selectedMonth)}.
                    {isAdmin && ' Click "+ Add Entry" to get started.'}
                  </td>
                </tr>
              ) : (
                entries.map((entry) => {
                  const rowTotal = n(entry.rate) * n(entry.quantity);
                  return (
                    <tr key={entry.id}>
                      <td>
                        <input
                          className="attendance-register-input"
                          type="date"
                          value={entry.date}
                          onChange={e => handleCellChange(entry.id, 'date', e.target.value)}
                          readOnly={!isAdmin}
                          style={{ minWidth: 120, padding: '6px 8px' }}
                        />
                      </td>
                      <td>
                        <input
                          className="attendance-register-input"
                          type="text"
                          inputMode="numeric"
                          value={entry.rate}
                          onChange={e => handleCellChange(entry.id, 'rate', e.target.value.replace(/[^0-9.]/g, ''))}
                          readOnly={!isAdmin}
                          style={{ minWidth: 100 }}
                        />
                      </td>
                      <td>
                        <input
                          className="attendance-register-input"
                          type="text"
                          inputMode="numeric"
                          value={entry.quantity}
                          onChange={e => handleCellChange(entry.id, 'quantity', e.target.value.replace(/[^0-9.]/g, ''))}
                          readOnly={!isAdmin}
                          style={{ minWidth: 80 }}
                        />
                      </td>
                      <td className="attendance-register-total">
                        <strong style={{ color: '#0f3d35' }}>₹{fmt(rowTotal)}</strong>
                      </td>
                      <td>
                        <input
                          className="attendance-register-input"
                          type="text"
                          value={entry.remark}
                          onChange={e => handleCellChange(entry.id, 'remark', e.target.value)}
                          readOnly={!isAdmin}
                          placeholder="Optional note…"
                          style={{ minWidth: 160 }}
                        />
                      </td>
                      {isAdmin && (
                        <td>
                          <button
                            type="button"
                            onClick={() => handleDeleteRow(entry.id)}
                            style={{
                              background: 'none',
                              border: '1px solid rgba(220,38,38,0.25)',
                              borderRadius: 8,
                              color: '#dc2626',
                              cursor: 'pointer',
                              padding: '4px 10px',
                              fontSize: '0.85rem',
                              fontWeight: 600,
                              transition: 'background 0.15s',
                            }}
                            title="Delete this row"
                          >
                            🗑
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>

            {/* Footer totals */}
            {entries.length > 0 && !isLoading && (
              <tfoot>
                <tr>
                  <th colSpan={2} style={{ textAlign: 'right', paddingRight: 12 }}>Total</th>
                  <th>{summary.totalTrips}</th>
                  <th style={{ color: '#0f3d35' }}>₹{fmt(summary.grandTotal)}</th>
                  <th colSpan={isAdmin ? 2 : 1} />
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        {/* Add entry button at bottom (convenience) */}
        {isAdmin && entries.length > 0 && !isLoading && (
          <div style={{ padding: '16px 20px', borderTop: '1px solid rgba(0,0,0,0.06)' }}>
            <button className="button-primary" type="button" onClick={handleAddRow}>
              + Add Another Entry
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
