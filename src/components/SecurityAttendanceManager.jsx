import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { doc, getDoc, serverTimestamp, setDoc, deleteDoc } from 'firebase/firestore';
import * as XLSX from 'xlsx';
import { db, ensureFirebaseSession, isFirebaseConfigured } from '../firebase.js';

// ─── Constants ────────────────────────────────────────────────────────────────

const LOCAL_STORAGE_KEY  = 'majestique-security-register';
// No auto-save — user must explicitly click Save

const FINANCIAL_YEAR_MONTHS = Array.from({ length: 12 }, (_, i) => {
  const d = new Date(2026, 3 + i, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
});

/** All guard-post columns that contribute to daily total (Base reference) */
const ALL_COLUMNS = [
  { key: 'aMorn',      label: 'A Bldg (Morn)' },
  { key: 'aEve',       label: 'A Bldg (Eve)'  },
  { key: 'bMorn',      label: 'B Bldg (Morn)' },
  { key: 'bEve',       label: 'B Bldg (Eve)'  },
  { key: 'cMorn',      label: 'C Bldg (Morn)' },
  { key: 'cEve',       label: 'C Bldg (Eve)'  },
  { key: 'mainGateMorn', label: 'Main Gate (Morn)' },
  { key: 'mainGateEve',  label: 'Main Gate (Eve)'  },
];

// ─── Pure helpers ─────────────────────────────────────────────────────────────

function getCurrentMonthValue() {
  const d = new Date();
  const v = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  return FINANCIAL_YEAR_MONTHS.includes(v) ? v : FINANCIAL_YEAR_MONTHS[0];
}

/** Returns which building column key Chauhan occupies for a given month */
const CHAUHAN_ROTATION = ['b', 'c', 'a']; // rotation base keys
const CHAUHAN_LABELS   = { a: 'A Building', b: 'B Building', c: 'C Building' };
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
      aMorn: normalizeValue(s.aMorn || s.aBuilding), // migration support
      aEve:  normalizeValue(s.aEve || s.aBuilding),
      bMorn: normalizeValue(s.bMorn || s.bBuilding),
      bEve:  normalizeValue(s.bEve || s.bBuilding),
      cMorn: normalizeValue(s.cMorn || s.cBuilding),
      cEve:  normalizeValue(s.cEve || s.cBuilding),
      mainGateMorn: normalizeValue(s.mainGateMorn || s.commonArea),
      mainGateEve:  normalizeValue(s.mainGateEve  || s.commonArea),
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
  const [isDirty,       setIsDirty]       = useState(false);

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
        setSaveMsg('All changes saved to Firebase ✓');
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
          [base + 'Eve']:  normalizeValue(value)
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
        cols.push({ key: bKey + 'Eve',  label: `${bKey.toUpperCase()} (Eve)` });
      }
    });
    cols.push({ key: 'mainGateMorn', label: 'Main Gate (Morn)' });
    cols.push({ key: 'mainGateEve',  label: 'Main Gate (Eve)' });
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
      { wch: 6  }, // Day
      ...displayColumns.map(() => ({ wch: 12 })),
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
            <p className="eyebrow">Daily guard deployment sheet</p>
            <h3>Security Attendance — {formatLongMonthLabel(selectedMonth)}</h3>
          </div>
          <div className="attendance-table-card__actions">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: badge.color, fontWeight: 500, fontSize: '0.9rem' }}>
              <span>{badge.icon}</span>
              <span>{isLoading ? `Loading ${formatLongMonthLabel(selectedMonth)}…` : saveMsg || badge.text}</span>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button className="button-primary" type="button" onClick={handleSave}
                disabled={!isDirty || saveStatus === 'saving'}
                style={{ opacity: (!isDirty || saveStatus === 'saving') ? 0.5 : 1 }}>
                💾 Save
              </button>
              <button className="button-secondary" type="button" onClick={handleDownloadExcel}>
                ⬇ Excel
              </button>
              <button 
                className="button-secondary" 
                type="button" 
                onClick={(e) => handleDeleteMonthData(e)}
                style={{ color: '#dc2626', borderColor: 'rgba(220, 38, 38, 0.2)' }}
              >
                🗑️ Delete
              </button>
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
                  const row   = entries[d.dateKey] || emptyRow();
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
