import { useEffect, useMemo, useState } from 'react';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { db, ensureFirebaseSession, isFirebaseConfigured } from '../firebase.js';

const LOCAL_STORAGE_KEY = 'majestique-housekeeping-register';
const FINANCIAL_YEAR_MONTHS = Array.from({ length: 12 }, (_, index) => {
  const date = new Date(2026, 3 + index, 1);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');

  return `${year}-${month}`;
});

const registerColumns = [
  { key: 'a', label: 'A', placeholder: "" },
  { key: 'b', label: 'B', placeholder: "" },
  { key: 'c', label: 'C', placeholder: "" },
  { key: 'supervisor', label: 'Supervisor', placeholder: "" },
  { key: 'common', label: 'Common', placeholder: "" },
  { key: 'tractorTrip', label: 'Tractor Trip', placeholder: "" }
];

const manpowerColumns = registerColumns.filter((column) => column.key !== 'tractorTrip');

function getCurrentMonthValue() {
  const date = new Date();
  const monthValue = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

  return FINANCIAL_YEAR_MONTHS.includes(monthValue) ? monthValue : FINANCIAL_YEAR_MONTHS[0];
}

function parseMonthValue(monthValue) {
  const [year, month] = monthValue.split('-').map(Number);

  return {
    year,
    monthIndex: month - 1
  };
}

function formatMonthLabel(monthValue) {
  const { year, monthIndex } = parseMonthValue(monthValue);

  return new Intl.DateTimeFormat('en-IN', {
    month: 'short',
    year: '2-digit'
  }).format(new Date(year, monthIndex, 1));
}

function formatLongMonthLabel(monthValue) {
  const { year, monthIndex } = parseMonthValue(monthValue);

  return new Intl.DateTimeFormat('en-IN', {
    month: 'long',
    year: 'numeric'
  }).format(new Date(year, monthIndex, 1));
}

function formatDateLabel(date) {
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })
    .format(date)
    .replaceAll('/', '-');
}

function normalizeValue(value) {
  if (value === '' || value === null || value === undefined) {
    return '';
  }

  const parsedValue = Number(value);

  return Number.isFinite(parsedValue) ? Math.max(0, parsedValue) : '';
}

function buildMonthDays(monthValue) {
  const { year, monthIndex } = parseMonthValue(monthValue);
  const totalDays = new Date(year, monthIndex + 1, 0).getDate();

  return Array.from({ length: totalDays }, (_, index) => {
    const dayNumber = index + 1;
    const date = new Date(year, monthIndex, dayNumber);
    const dateKey = `${monthValue}-${String(dayNumber).padStart(2, '0')}`;

    return {
      date,
      dateKey,
      formattedDate: formatDateLabel(date),
      weekdayLabel: new Intl.DateTimeFormat('en-IN', { weekday: 'short' }).format(date)
    };
  });
}

function createEmptyRow() {
  return {
    a: '',
    b: '',
    c: '',
    supervisor: '',
    common: '',
    tractorTrip: ''
  };
}

function normalizeEntries(monthDays, sourceEntries = {}) {
  return monthDays.reduce((entries, day) => {
    const sourceRow = sourceEntries[day.dateKey] || {};

    entries[day.dateKey] = {
      a: normalizeValue(sourceRow.a),
      b: normalizeValue(sourceRow.b),
      c: normalizeValue(sourceRow.c),
      supervisor: normalizeValue(sourceRow.supervisor),
      common: normalizeValue(sourceRow.common),
      tractorTrip: normalizeValue(sourceRow.tractorTrip)
    };

    return entries;
  }, {});
}

function readLocalEntries() {
  if (typeof window === 'undefined') {
    return {};
  }

  try {
    const storedValue = window.localStorage.getItem(LOCAL_STORAGE_KEY);
    return storedValue ? JSON.parse(storedValue) : {};
  } catch (error) {
    console.error('Unable to read local housekeeping register entries.', error);
    return {};
  }
}

function writeLocalEntries(entries) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(entries));
}

function getNumericValue(value) {
  return value === '' ? 0 : Number(value) || 0;
}

function getRowTotal(row) {
  return manpowerColumns.reduce((sum, column) => sum + getNumericValue(row[column.key]), 0);
}

function buildFileSafeMonthLabel(monthValue) {
  const { year, monthIndex } = parseMonthValue(monthValue);
  const month = new Intl.DateTimeFormat('en-IN', { month: 'short' }).format(
    new Date(year, monthIndex, 1)
  );

  return `${month}-${year}`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export default function HousekeepingAttendanceManager({ staffMembers = [] }) {
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonthValue);
  const [attendanceEntries, setAttendanceEntries] = useState({});
  const [localRecords, setLocalRecords] = useState(readLocalEntries);
  const [isLoadingRecord, setIsLoadingRecord] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  const monthDays = useMemo(() => buildMonthDays(selectedMonth), [selectedMonth]);
  const recordId = `register_${selectedMonth}`;

  useEffect(() => {
    let isCancelled = false;

    async function loadMonthlyRegister() {
      const localEntry = localRecords[recordId]?.entries || {};

      setIsLoadingRecord(true);
      setStatusMessage('');

      if (!isFirebaseConfigured || !db) {
        if (!isCancelled) {
          setAttendanceEntries(normalizeEntries(monthDays, localEntry));
          setStatusMessage('Preview mode: the monthly register is stored in this browser until Firebase is connected.');
          setIsLoadingRecord(false);
        }

        return;
      }

      try {
        await ensureFirebaseSession();
        const snapshot = await getDoc(doc(db, 'housekeepingAttendanceRegisters', recordId));
        const firestoreEntries = snapshot.exists() ? snapshot.data().entries || {} : {};

        if (!isCancelled) {
          setAttendanceEntries(normalizeEntries(monthDays, snapshot.exists() ? firestoreEntries : localEntry));
          setStatusMessage(
            snapshot.exists()
              ? 'Monthly housekeeping register loaded from Firebase.'
              : 'New monthly register ready. Manager can enter values and save.'
          );
        }
      } catch (error) {
        console.error(`Unable to load housekeeping register for "${recordId}".`, error);

        if (!isCancelled) {
          setAttendanceEntries(normalizeEntries(monthDays, localEntry));
          setStatusMessage('Firebase was unavailable, so the local monthly register was loaded instead.');
        }
      } finally {
        if (!isCancelled) {
          setIsLoadingRecord(false);
        }
      }
    }

    loadMonthlyRegister();

    return () => {
      isCancelled = true;
    };
  }, [monthDays, recordId]);

  const registerSummary = useMemo(() => {
    const columnTotals = registerColumns.reduce((totals, column) => {
      totals[column.key] = monthDays.reduce((sum, day) => {
        const row = attendanceEntries[day.dateKey] || createEmptyRow();
        return sum + getNumericValue(row[column.key]);
      }, 0);
      return totals;
    }, {});

    const manpowerTotal = monthDays.reduce((sum, day) => {
      const row = attendanceEntries[day.dateKey] || createEmptyRow();
      return sum + getRowTotal(row);
    }, 0);

    return {
      daysInMonth: monthDays.length,
      manpowerTotal,
      tractorTripTotal: columnTotals.tractorTrip || 0,
      averageDailyTotal: monthDays.length ? (manpowerTotal / monthDays.length).toFixed(1) : '0.0',
      columnTotals
    };
  }, [attendanceEntries, monthDays]);

  function handleEntryChange(dateKey, field, value) {
    const normalizedNextValue = normalizeValue(value);

    setAttendanceEntries((currentEntries) => ({
      ...currentEntries,
      [dateKey]: {
        ...(currentEntries[dateKey] || createEmptyRow()),
        [field]: normalizedNextValue
      }
    }));
  }

  function handleDownloadExcel() {
    const headerCells = manpowerColumns
      .map((column) => `<th>${escapeHtml(column.label)}</th>`)
      .join('');

    const bodyRows = monthDays
      .map((day) => {
        const row = attendanceEntries[day.dateKey] || createEmptyRow();
        const manpowerCells = manpowerColumns
          .map((column) => `<td>${getNumericValue(row[column.key])}</td>`)
          .join('');

        return `
          <tr>
            <td>${escapeHtml(day.formattedDate)}</td>
            ${manpowerCells}
            <td>${getRowTotal(row)}</td>
            <td>${getNumericValue(row.tractorTrip)}</td>
          </tr>
        `;
      })
      .join('');

    const totalCells = manpowerColumns
      .map((column) => `<th>${registerSummary.columnTotals[column.key]}</th>`)
      .join('');

    const workbookHtml = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office"
            xmlns:x="urn:schemas-microsoft-com:office:excel"
            xmlns="http://www.w3.org/TR/REC-html40">
        <head>
          <meta charset="UTF-8" />
          <meta name="ProgId" content="Excel.Sheet" />
          <meta name="Generator" content="Majestique Euriska Dashboard" />
          <style>
            table { border-collapse: collapse; width: 100%; font-family: Arial, sans-serif; }
            th, td { border: 1px solid #666; padding: 8px; text-align: center; }
            thead th, tfoot th { background: #f0e8dc; font-weight: 700; }
            h2 { margin-bottom: 12px; font-family: Arial, sans-serif; }
          </style>
        </head>
        <body>
          <h2>Housekeeping Attendance Month of ${escapeHtml(formatMonthLabel(selectedMonth))}</h2>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                ${headerCells}
                <th>Total</th>
                <th>Tractor Trip</th>
              </tr>
            </thead>
            <tbody>
              ${bodyRows}
            </tbody>
            <tfoot>
              <tr>
                <th>Total</th>
                ${totalCells}
                <th>${registerSummary.manpowerTotal}</th>
                <th>${registerSummary.tractorTripTotal}</th>
              </tr>
            </tfoot>
          </table>
        </body>
      </html>
    `;

    const blob = new Blob([workbookHtml], {
      type: 'application/vnd.ms-excel;charset=utf-8'
    });
    const downloadUrl = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');

    anchor.href = downloadUrl;
    anchor.download = `housekeeping-register-${buildFileSafeMonthLabel(selectedMonth)}.xls`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    window.URL.revokeObjectURL(downloadUrl);
    setStatusMessage(`Excel file downloaded for ${formatLongMonthLabel(selectedMonth)}.`);
  }

  async function handleSave() {
    setIsSaving(true);

    const payload = {
      month: selectedMonth,
      registerType: 'daily-manpower',
      rosterCount: staffMembers.length,
      entries: attendanceEntries
    };

    try {
      if (isFirebaseConfigured && db) {
        await ensureFirebaseSession();
        await setDoc(
          doc(db, 'housekeepingAttendanceRegisters', recordId),
          {
            ...payload,
            updatedAt: serverTimestamp()
          },
          { merge: true }
        );

        setStatusMessage('Monthly housekeeping register saved to Firebase.');
      } else {
        const nextLocalRecords = {
          ...localRecords,
          [recordId]: {
            ...payload,
            savedAt: new Date().toISOString()
          }
        };

        setLocalRecords(nextLocalRecords);
        writeLocalEntries(nextLocalRecords);
        setStatusMessage('Monthly housekeeping register saved locally in this browser.');
      }
    } catch (error) {
      console.error(`Unable to save housekeeping register for "${recordId}".`, error);

      const nextLocalRecords = {
        ...localRecords,
        [recordId]: {
          ...payload,
          savedAt: new Date().toISOString()
        }
      };

      setLocalRecords(nextLocalRecords);
      writeLocalEntries(nextLocalRecords);
      setStatusMessage('Firebase save failed, so the monthly register was stored locally instead.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="attendance-manager attendance-manager--register">
      <div className="attendance-manager__controls stack-card">
        <div>
          <p className="eyebrow">Monthly housekeeping register</p>
          <h3>Manager entry table</h3>
          <p>Enter daily deployment values the same way as the register sheet, and the totals will calculate automatically.</p>
        </div>

        <div className="attendance-control-grid">
          <div className="summary-card summary-card--inline">
            <span>Financial year</span>
            <strong>April 2026 to March 2027</strong>
          </div>

          <div className="summary-card summary-card--inline">
            <span>Active register month</span>
            <strong>{formatLongMonthLabel(selectedMonth)}</strong>
          </div>

          <div className="summary-card summary-card--inline">
            <span>Roster reference</span>
            <strong>{staffMembers.length} staff in tracker</strong>
          </div>
        </div>

        <div className="attendance-summary-grid">
          <div className="summary-card">
            <span>Days in month</span>
            <strong>{registerSummary.daysInMonth}</strong>
          </div>
          <div className="summary-card">
            <span>Monthly manpower</span>
            <strong>{registerSummary.manpowerTotal}</strong>
          </div>
          <div className="summary-card">
            <span>Tractor trips</span>
            <strong>{registerSummary.tractorTripTotal}</strong>
          </div>
          <div className="summary-card">
            <span>Average daily total</span>
            <strong>{registerSummary.averageDailyTotal}</strong>
          </div>
        </div>

        <div className="attendance-status-list">
          {manpowerColumns.map((column) => (
            <div key={column.key} className="attendance-status-item">
              <span>{column.label} total</span>
              <strong>{registerSummary.columnTotals[column.key]}</strong>
            </div>
          ))}
          <div className="attendance-status-item">
            <span>Tractor Trip total</span>
            <strong>{registerSummary.tractorTripTotal}</strong>
          </div>
        </div>

        <button className="button-primary" type="button" onClick={handleSave} disabled={isSaving}>
          {isSaving ? 'Saving...' : 'Save Monthly Register'}
        </button>

        <p className="attendance-note">
          {isLoadingRecord
            ? `Loading ${formatLongMonthLabel(selectedMonth)} register...`
            : statusMessage}
        </p>
      </div>

      <div className="table-card attendance-table-card attendance-table-card--register">
        <div className="attendance-month-tabs" role="tablist" aria-label="Manager daily entry months">
          {FINANCIAL_YEAR_MONTHS.map((monthValue) => (
            <button
              key={monthValue}
              type="button"
              role="tab"
              aria-selected={selectedMonth === monthValue}
              className={`attendance-month-tab ${selectedMonth === monthValue ? 'attendance-month-tab--active' : ''}`}
              onClick={() => setSelectedMonth(monthValue)}
            >
              {formatMonthLabel(monthValue)}
            </button>
          ))}
        </div>

        <div className="attendance-table-card__header">
          <div>
            <p className="eyebrow">Manager daily entry sheet</p>
            <h3>Housekeeping Attendance Month of {formatMonthLabel(selectedMonth)}</h3>
          </div>
          <div className="attendance-table-card__actions">
            <p>Manager can enter day-wise values for A, B, C, Supervisor, Common, and Tractor Trip directly in this table.</p>
            <button className="button-secondary" type="button" onClick={handleDownloadExcel}>
              Download Excel
            </button>
          </div>
        </div>

        <div className="attendance-table-scroll">
          <table className="attendance-table attendance-table--register">
            <thead>
              <tr>
                <th>Date</th>
                {manpowerColumns.map((column) => (
                  <th key={column.key}>{column.label}</th>
                ))}
                <th>Total</th>
                <th>Tractor Trip</th>
              </tr>
            </thead>
            <tbody>
              {monthDays.map((day) => {
                const row = attendanceEntries[day.dateKey] || createEmptyRow();
                const rowTotal = getRowTotal(row);

                return (
                  <tr key={day.dateKey}>
                    <th className="attendance-register-date">
                      <strong>{day.formattedDate}</strong>
                      <span>{day.weekdayLabel}</span>
                    </th>

                    {manpowerColumns.map((column) => (
                      <td key={`${day.dateKey}-${column.key}`}>
                        <input
                          className="attendance-register-input"
                          type="number"
                          min="0"
                          step="1"
                          inputMode="numeric"
                          placeholder={String(column.placeholder)}
                          value={row[column.key]}
                          onChange={(event) => handleEntryChange(day.dateKey, column.key, event.target.value)}
                        />
                      </td>
                    ))}

                    <td className="attendance-register-total">
                      <strong>{rowTotal}</strong>
                    </td>

                    <td>
                      <input
                        className="attendance-register-input"
                        type="number"
                        min="0"
                        step="1"
                        inputMode="numeric"
                        placeholder="0"
                        value={row.tractorTrip}
                        onChange={(event) => handleEntryChange(day.dateKey, 'tractorTrip', event.target.value)}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr>
                <th>Total</th>
                {manpowerColumns.map((column) => (
                  <th key={`total-${column.key}`}>{registerSummary.columnTotals[column.key]}</th>
                ))}
                <th>{registerSummary.manpowerTotal}</th>
                <th>{registerSummary.tractorTripTotal}</th>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
