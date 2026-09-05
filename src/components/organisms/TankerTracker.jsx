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

  // ── PDF export ───────────────────────────────────────────────────────────
  function handleExportPDF() {
    const generatedDate = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    const longMonth = formatLongMonthLabel(selectedMonth);

    const printDoc = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="utf-8">
        <title>Majestique Euriska - Water Tanker Log (${longMonth})</title>
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
          th { background: #f1f5f9; color: #1e293b; font-weight: 700; text-align: center; padding: 8px 10px; border: 1px solid #94a3b8; font-size: 10px; letter-spacing: 0.03em; }
          th.th-date { text-align: left; }
          td { padding: 6px 10px; border: 1px solid #cbd5e1; color: #0f172a; text-align: center; }
          td.td-date { text-align: left; font-weight: 600; }
          td.td-rate { text-align: right; }
          td.td-total { text-align: right; }
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
            @page { margin: 1.2cm; size: A4 portrait; }
            thead { display: table-header-group; }
            tr { page-break-inside: avoid; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <h1 class="title">🚛 Majestique Euriska - Water Tanker Supply Register</h1>
            <div class="subtitle">Daily Water Tanker Deliveries & Expenditure Log • FY April 2026 – March 2027</div>
          </div>
          <div class="meta">
            <div><strong>Month:</strong> ${longMonth}</div>
            <div><strong>Generated:</strong> ${generatedDate}</div>
          </div>
        </div>

        <div class="summary-bar">
          <div class="summary-item">Month: <strong>${longMonth}</strong></div>
          <div>•</div>
          <div class="summary-item">Days in Month: <strong>${monthDays.length}</strong></div>
          <div>•</div>
          <div class="summary-item">Days with Delivery: <strong>${summary.activeDays}</strong></div>
          <div>•</div>
          <div class="summary-item">Total Tankers: <strong>${summary.totalTankers}</strong></div>
          <div>•</div>
          <div class="summary-item" style="color: #0f3d35;">Grand Total: <strong>₹${fmt(summary.grandTotal)}</strong></div>
        </div>

        <table>
          <thead>
            <tr>
              <th class="th-date" style="width: 120px;">Date</th>
              <th style="width: 60px;">Day</th>
              <th style="width: 100px; text-align: right;">Rate (₹)</th>
              <th style="width: 120px;">Water Tanker Count</th>
              <th style="width: 140px; text-align: right;">Total Amount (₹)</th>
            </tr>
          </thead>
          <tbody>
            ${monthDays.map(d => {
              const row = entries[d.dateKey] || { count: '', rate: String(DEFAULT_RATE) };
              const count = n(row.count);
              const rate = n(row.rate);
              const rowTotal = count * rate;
              const isSunday = d.date.getDay() === 0;
              return `
                <tr class="${isSunday ? 'sunday-row' : ''}">
                  <td class="td-date">${d.formattedDate}</td>
                  <td class="${isSunday ? 'sunday-label' : ''}">${d.weekday}</td>
                  <td class="td-rate">₹${fmt(rate)}</td>
                  <td style="font-weight: ${count > 0 ? '700' : 'normal'};">${count > 0 ? count : '—'}</td>
                  <td class="td-total" style="font-weight: 700; color: ${count > 0 ? '#0f3d35' : '#94a3b8'};">
                    ${count > 0 ? `₹${fmt(rowTotal)}` : '—'}
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
          <tfoot>
            <tr>
              <th colspan="2" style="text-align: right; text-transform: uppercase; letter-spacing: 0.05em;">Total:</th>
              <th></th>
              <th style="font-weight: 800; font-size: 12px;">${summary.totalTankers}</th>
              <th style="text-align: right; font-weight: 800; font-size: 12px; color: #0f3d35;">₹${fmt(summary.grandTotal)}</th>
            </tr>
          </tfoot>
        </table>

        <div class="sig-section">
          <div class="sig-box">Water Supplier / Agency</div>
          <div class="sig-box">Estate Manager / Water Supervisor</div>
          <div class="sig-box">Authorised Signatory / Committee</div>
        </div>

        <div class="footer">
          <div>Majestique Euriska Co-Op Housing Society • Water Tanker Log</div>
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
            <button className="button-secondary" type="button" onClick={handleExportPDF} title="Print or export as PDF">
              📄 Print PDF
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
