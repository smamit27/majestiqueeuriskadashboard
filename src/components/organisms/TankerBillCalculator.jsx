import { useEffect, useMemo, useState } from 'react';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import * as XLSX from 'xlsx';
import { db, ensureFirebaseSession, isFirebaseConfigured } from '../../firebase.js';

// ─── Constants ────────────────────────────────────────────────────────────────

const FINANCIAL_YEAR_MONTHS = Array.from({ length: 12 }, (_, i) => {
  const d = new Date(2026, 3 + i, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
});

function getCurrentMonth() {
  const d = new Date();
  const v = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  return FINANCIAL_YEAR_MONTHS.includes(v) ? v : FINANCIAL_YEAR_MONTHS[0];
}

function formatMonthLabel(mv) {
  const [y, m] = mv.split('-').map(Number);
  return new Intl.DateTimeFormat('en-IN', { month: 'short', year: '2-digit' }).format(new Date(y, m - 1, 1));
}

function formatLongMonth(mv) {
  const [y, m] = mv.split('-').map(Number);
  return new Intl.DateTimeFormat('en-IN', { month: 'long', year: 'numeric' }).format(new Date(y, m - 1, 1));
}

function n(v) { return parseFloat(v) || 0; }
function fmt(v) {
  return Number(v).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const sectionStyle = {
  background: 'rgba(255,255,255,0.6)',
  borderRadius: 14,
  padding: '20px 24px',
  border: '1px solid rgba(0,0,0,0.08)',
  display: 'flex',
  flexDirection: 'column',
  gap: 14,
};

const headingStyle = {
  margin: 0,
  fontSize: '0.85rem',
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  opacity: 0.6,
};

// ─── Bill Calculator ──────────────────────────────────────────────────────────

export default function TankerBillCalculator() {
  const [month, setMonth] = useState(getCurrentMonth);
  const [entries, setEntries] = useState([]);
  const [overrideRate, setOverrideRate] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState('idle');
  const [saveMsg, setSaveMsg] = useState('');

  const docId = `tanker_${month}`;

  // Load tanker entries for selected month
  useEffect(() => {
    let cancelled = false;
    setSaveStatus('idle');
    setSaveMsg('');

    async function load() {
      setIsLoading(true);
      setEntries([]);
      setOverrideRate('');

      if (!isFirebaseConfigured || !db) {
        // Try local storage fallback
        try {
          const raw = window.localStorage.getItem('majestique-tanker-register');
          const local = raw ? JSON.parse(raw) : {};
          const record = local[docId];
          if (!cancelled && record?.entries) setEntries(record.entries);
        } catch { }
        if (!cancelled) { setIsLoading(false); }
        return;
      }

      try {
        await ensureFirebaseSession();
        const snap = await getDoc(doc(db, 'tankerEntries', docId));
        if (!cancelled) {
          if (snap.exists()) {
            const data = snap.data();
            setEntries(data.entries || []);
            setSaveMsg(`Loaded — ${formatLongMonth(month)}`);
          } else {
            setSaveMsg(`No data yet for ${formatLongMonth(month)}`);
          }
        }
      } catch (err) {
        console.error('TankerBillCalculator load error:', err);
        // fallback to local storage
        try {
          const raw = window.localStorage.getItem('majestique-tanker-register');
          const local = raw ? JSON.parse(raw) : {};
          const record = local[docId];
          if (!cancelled && record?.entries) setEntries(record.entries);
        } catch { }
        if (!cancelled) setSaveMsg('Firebase unavailable — showing local data.');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };

    // Listen for real-time updates from TankerTracker on same page
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [docId]);

  // ── Computed bill ─────────────────────────────────────────────────────────
  const bill = useMemo(() => {
    if (entries.length === 0) return null;

    const rows = entries.map(e => ({
      date: e.date,
      rate: n(e.rate),
      quantity: n(e.quantity),
      total: n(e.rate) * n(e.quantity),
      remark: e.remark || '',
    }));

    const totalTrips = rows.reduce((s, r) => s + r.quantity, 0);
    const grandTotal = rows.reduce((s, r) => s + r.total, 0);
    const avgRate = totalTrips > 0 ? grandTotal / totalTrips : 0;

    // Override rate scenario
    const overridedTotal = overrideRate
      ? totalTrips * n(overrideRate)
      : grandTotal;

    return { rows, totalTrips, grandTotal, avgRate, overridedTotal };
  }, [entries, overrideRate]);

  // ── Save override rate ─────────────────────────────────────────────────────
  async function handleSaveOverride() {
    if (!isFirebaseConfigured || !db) {
      setSaveMsg('Firebase not connected — cannot save override.');
      return;
    }
    setSaveStatus('saving');
    try {
      await ensureFirebaseSession();
      await setDoc(
        doc(db, 'tankerEntries', docId),
        { overrideRate: n(overrideRate), updatedAt: serverTimestamp() },
        { merge: true }
      );
      setSaveStatus('saved');
      setSaveMsg('Override rate saved ✓');
    } catch (err) {
      console.error('Save override error:', err);
      setSaveStatus('error');
      setSaveMsg('Save failed.');
    }
  }

  // ── Excel export ─────────────────────────────────────────────────────────
  function handleDownloadExcel() {
    if (!bill) return;
    const rows = [
      [`Tanker Bill Summary — ${formatLongMonth(month)}`],
      [],
      ['Date', 'Rate (₹)', 'Qty / Trips', 'Total (₹)', 'Remark'],
      ...bill.rows.map(r => [r.date, r.rate, r.quantity, r.total, r.remark]),
      [],
      ['Summary', '', '', '', ''],
      ['Total Trips', bill.totalTrips],
      ['Grand Total (₹)', bill.grandTotal],
      ['Avg Rate per Trip (₹)', bill.avgRate.toFixed(2)],
      ...(overrideRate
        ? [['Override Rate (₹)', n(overrideRate)], ['Recalculated Total (₹)', bill.overridedTotal]]
        : []),
    ];

    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!cols'] = [{ wch: 16 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 26 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `Tanker Bill ${formatMonthLabel(month)}`);
    XLSX.writeFile(wb, `tanker-bill-${month}.xlsx`);
    setSaveMsg('Excel downloaded.');
  }

  const badge = {
    idle: { c: '#6b7280', i: '●' },
    saving: { c: '#3b82f6', i: '↑' },
    saved: { c: '#10b981', i: '✓' },
    error: { c: '#ef4444', i: '✗' },
  }[saveStatus] || { c: '#6b7280', i: '●' };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* ── Month tabs + header ── */}
      <div className="table-card attendance-table-card attendance-table-card--register" style={{ padding: 0 }}>
        <div className="attendance-month-tabs" role="tablist">
          {FINANCIAL_YEAR_MONTHS.map(mv => (
            <button
              key={mv}
              type="button"
              role="tab"
              aria-selected={month === mv}
              className={`attendance-month-tab ${month === mv ? 'attendance-month-tab--active' : ''}`}
              onClick={() => setMonth(mv)}
            >
              {formatMonthLabel(mv)}
            </button>
          ))}
        </div>

        <div className="attendance-table-card__header">
          <div>
            <p className="eyebrow">Monthly Bill Calculation</p>
            <h3>🚛 Tanker Bill — {formatLongMonth(month)}</h3>
          </div>
          <div className="attendance-table-card__actions">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: badge.c, fontWeight: 500, fontSize: '0.9rem' }}>
              <span>{badge.i}</span>
              <span>{isLoading ? 'Loading…' : saveMsg || 'Ready'}</span>
            </div>
            <button
              className="button-secondary"
              type="button"
              onClick={handleDownloadExcel}
              disabled={!bill}
            >
              ⬇ Download
            </button>
          </div>
        </div>
      </div>

      {/* ── Summary Cards ── */}
      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '40px', opacity: 0.6 }}>Loading {formatLongMonth(month)}…</div>
      ) : !bill ? (
        <div style={{
          textAlign: 'center',
          padding: '48px 24px',
          background: 'rgba(255,255,255,0.5)',
          borderRadius: 16,
          border: '1px dashed rgba(0,0,0,0.12)',
          color: '#6b7280',
        }}>
          <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>🚛</div>
          <p style={{ fontWeight: 600, fontSize: '1rem' }}>No tanker entries yet for {formatLongMonth(month)}</p>
          <p style={{ fontSize: '0.85rem', marginTop: 4 }}>Add entries in the Tanker Entry tab to see the bill here.</p>
        </div>
      ) : (
        <>
          {/* Key metrics */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 180px), 1fr))', gap: 16 }}>
            {[
              { label: 'Total Trips', value: bill.totalTrips, icon: '🔢', color: '#1e3a8a' },
              { label: 'Avg Rate / Trip', value: `₹${fmt(bill.avgRate)}`, icon: '📊', color: '#6d28d9' },
              { label: 'Grand Total', value: `₹${fmt(bill.grandTotal)}`, icon: '💰', color: '#0f3d35', large: true },
            ].map(card => (
              <div key={card.label} style={{
                background: 'rgba(255,255,255,0.7)',
                borderRadius: 14,
                padding: '20px 24px',
                border: '1px solid rgba(0,0,0,0.07)',
                display: 'flex',
                flexDirection: 'column',
                gap: 6,
                backdropFilter: 'blur(10px)',
              }}>
                <span style={{ fontSize: '1.5rem' }}>{card.icon}</span>
                <span style={{ fontSize: '0.8rem', fontWeight: 600, opacity: 0.6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{card.label}</span>
                <strong style={{ fontSize: card.large ? '1.6rem' : '1.3rem', color: card.color, fontWeight: 800 }}>{card.value}</strong>
              </div>
            ))}
          </div>

          {/* Override Rate Tool */}
          <div style={sectionStyle}>
            <p style={headingStyle}>🔧 Rate Override Tool</p>
            <p style={{ margin: 0, fontSize: '0.82rem', opacity: 0.6 }}>
              Use this to recalculate the grand total with a different per-trip rate (e.g. if the vendor rate changes mid-month).
            </p>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, flexWrap: 'wrap' }}>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, opacity: 0.7 }}>Override Rate (₹ per trip)</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ opacity: 0.5, fontSize: '0.9rem' }}>₹</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={overrideRate}
                    onChange={e => setOverrideRate(e.target.value.replace(/[^0-9.]/g, ''))}
                    placeholder={`Current avg: ${fmt(bill.avgRate)}`}
                    style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid rgba(0,0,0,0.15)', fontSize: '0.95rem', background: 'rgba(255,255,255,0.8)', width: 180 }}
                  />
                </div>
              </label>
              {overrideRate && (
                <>
                  <button className="button-secondary" type="button" onClick={handleSaveOverride}>
                    💾 Save Override
                  </button>
                  <button
                    className="button-secondary"
                    type="button"
                    onClick={() => setOverrideRate('')}
                    style={{ color: '#6b7280' }}
                  >
                    ✕ Clear
                  </button>
                </>
              )}
            </div>
            {overrideRate && bill && (
              <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', padding: '12px 16px', background: 'rgba(30,58,138,0.06)', borderRadius: 10, fontSize: '0.9rem' }}>
                <div>Trips: <strong>{bill.totalTrips}</strong></div>
                <div>Override Rate: <strong>₹{n(overrideRate).toLocaleString('en-IN')}</strong></div>
                <div>Recalculated Total: <strong style={{ color: '#0f3d35', fontSize: '1rem' }}>₹{fmt(bill.overridedTotal)}</strong></div>
                <div style={{ opacity: 0.6 }}>Difference vs actual: ₹{fmt(bill.overridedTotal - bill.grandTotal)}</div>
              </div>
            )}
          </div>

          {/* Detailed entry table */}
          <div className="table-card">
            <div style={{ padding: '16px 20px 0' }}>
              <h3 style={{ margin: '4px 0 16px' }}>Entry Breakdown — {formatLongMonth(month)}</h3>
            </div>
            <div className="attendance-table-scroll">
              <table className="attendance-table">
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left' }}>Date</th>
                    <th style={{ textAlign: 'right' }}>Rate (₹)</th>
                    <th style={{ textAlign: 'right' }}>Trips</th>
                    <th style={{ textAlign: 'right' }}>Total (₹)</th>
                    <th style={{ textAlign: 'left' }}>Remark</th>
                  </tr>
                </thead>
                <tbody>
                  {bill.rows.map((row, idx) => (
                    <tr key={idx}>
                      <td style={{ fontWeight: 600 }}>{row.date}</td>
                      <td style={{ textAlign: 'right' }}>₹{fmt(row.rate)}</td>
                      <td style={{ textAlign: 'right', fontWeight: 600 }}>{row.quantity}</td>
                      <td style={{ textAlign: 'right', color: '#0f3d35', fontWeight: 700 }}>₹{fmt(row.total)}</td>
                      <td style={{ opacity: 0.7, fontSize: '0.88rem' }}>{row.remark || '—'}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <th style={{ textAlign: 'left' }}>Grand Total</th>
                    <th />
                    <th style={{ textAlign: 'right' }}>{bill.totalTrips}</th>
                    <th style={{ textAlign: 'right', color: '#0f3d35', fontSize: '1.05rem', fontWeight: 800, borderTop: '2px solid #0f3d35' }}>
                      ₹{fmt(bill.grandTotal)}
                    </th>
                    <th />
                  </tr>
                  {overrideRate && (
                    <tr style={{ background: 'rgba(30,58,138,0.05)' }}>
                      <th style={{ textAlign: 'left', color: '#1e3a8a' }}>Recalculated Total (Override ₹{n(overrideRate)})</th>
                      <th />
                      <th style={{ textAlign: 'right' }}>{bill.totalTrips}</th>
                      <th style={{ textAlign: 'right', color: '#1e3a8a', fontSize: '1.05rem', fontWeight: 800 }}>
                        ₹{fmt(bill.overridedTotal)}
                      </th>
                      <th />
                    </tr>
                  )}
                </tfoot>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
