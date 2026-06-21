import { useEffect, useMemo, useState } from 'react';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import * as XLSX from 'xlsx';
import { db, ensureFirebaseSession, isFirebaseConfigured } from '../../firebase.js';

// ─── Constants ────────────────────────────────────────────────────────────────

const FINANCIAL_YEAR_MONTHS = Array.from({ length: 12 }, (_, i) => {
  const d = new Date(2026, 3 + i, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
});

const DEFAULT_UNITS = { a: '87', b: '96', c: '48' };

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

function Field({ label, value, onChange, prefix }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <span style={{ fontSize: '0.75rem', fontWeight: 600, opacity: 0.7 }}>{label}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        {prefix && <span style={{ opacity: 0.5, fontSize: '0.9rem' }}>{prefix}</span>}
        <input
          type="text"
          inputMode="numeric"
          value={value}
          onChange={e => onChange(e.target.value.replace(/[^0-9.]/g, '').replace(/(\.\.*?)\\.+/g, '$1'))}
          style={{
            width: '100%',
            padding: '8px 10px',
            borderRadius: 8,
            border: '1px solid rgba(0,0,0,0.15)',
            fontSize: '0.95rem',
            background: 'rgba(255,255,255,0.8)',
          }}
        />
      </div>
    </label>
  );
}

// ─── Bill Calculator ──────────────────────────────────────────────────────────

export default function TankerBillCalculator() {
  const [month, setMonth] = useState(getCurrentMonth);
  const [entries, setEntries] = useState({});
  const [units, setUnits] = useState(DEFAULT_UNITS);
  const [isLoading, setIsLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState('idle');
  const [saveMsg, setSaveMsg] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const docId = `tanker_${month}`;

  // Load tanker entries + saved units for selected month
  useEffect(() => {
    let cancelled = false;
    setSaveStatus('idle');
    setSaveMsg('');

    async function load() {
      setIsLoading(true);
      setEntries({});

      if (!isFirebaseConfigured || !db) {
        try {
          const raw = window.localStorage.getItem('majestique-tanker-register');
          const local = raw ? JSON.parse(raw) : {};
          const record = local[docId];
          if (!cancelled && record) {
            setEntries(record.entries || {});
            if (record.units) setUnits({ ...DEFAULT_UNITS, ...record.units });
          }
        } catch { }
        if (!cancelled) setIsLoading(false);
        return;
      }

      try {
        await ensureFirebaseSession();
        const snap = await getDoc(doc(db, 'tankerEntries', docId));
        if (!cancelled) {
          if (snap.exists()) {
            const data = snap.data();
            setEntries(data.entries || {});
            if (data.units) setUnits({ ...DEFAULT_UNITS, ...data.units });
            setSaveMsg(`Loaded — ${formatLongMonth(month)}`);
          } else {
            setEntries({});
            setUnits(DEFAULT_UNITS);
            setSaveMsg(`No data yet for ${formatLongMonth(month)}`);
          }
        }
      } catch (err) {
        console.error('TankerBillCalculator load error:', err);
        try {
          const raw = window.localStorage.getItem('majestique-tanker-register');
          const local = raw ? JSON.parse(raw) : {};
          const record = local[docId];
          if (!cancelled && record) {
            setEntries(record.entries || {});
            if (record.units) setUnits({ ...DEFAULT_UNITS, ...record.units });
          }
        } catch { }
        if (!cancelled) setSaveMsg('Firebase unavailable — showing local data.');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [docId]);

  // ── Computed bill ──────────────────────────────────────────────────────────
  const bill = useMemo(() => {
    if (!entries || typeof entries !== 'object') return null;

    // Build rows only from days that have tanker count > 0
    const rows = Object.entries(entries)
      .filter(([, v]) => n(v.count) > 0)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([dateKey, v]) => ({
        date: dateKey,
        rate: n(v.rate),
        quantity: n(v.count),
        total: n(v.count) * n(v.rate),
      }));

    if (rows.length === 0) return null;

    const totalTankers = rows.reduce((s, r) => s + r.quantity, 0);
    const grandTotal = rows.reduce((s, r) => s + r.total, 0);

    // Building split by unit ratio
    const totalUnits = n(units.a) + n(units.b) + n(units.c);
    let buildingSplit = null;
    if (totalUnits > 0) {
      const ratioA = n(units.a) / totalUnits;
      const ratioB = n(units.b) / totalUnits;
      const ratioC = n(units.c) / totalUnits;
      buildingSplit = {
        ratioA, ratioB, ratioC,
        amountA: grandTotal * ratioA,
        amountB: grandTotal * ratioB,
        amountC: grandTotal * ratioC,
      };
    }

    return { rows, totalTankers, grandTotal, buildingSplit };
  }, [entries, units]);

  // ── Save units to Firebase ─────────────────────────────────────────────────
  async function handleSaveUnits() {
    if (!isFirebaseConfigured || !db) {
      setSaveMsg('Firebase not connected.');
      return;
    }
    setIsSaving(true);
    setSaveStatus('saving');
    try {
      await ensureFirebaseSession();
      await setDoc(
        doc(db, 'tankerEntries', docId),
        { units, updatedAt: serverTimestamp() },
        { merge: true }
      );
      setSaveStatus('saved');
      setSaveMsg('Building units saved ✓');
    } catch (err) {
      console.error('Save units error:', err);
      setSaveStatus('error');
      setSaveMsg('Save failed.');
    } finally {
      setIsSaving(false);
    }
  }

  // ── Excel export ─────────────────────────────────────────────────────────
  function handleDownloadExcel() {
    if (!bill) return;

    const rows = [
      [`Tanker Bill Summary — ${formatLongMonth(month)}`],
      [],
      ['Date', 'Rate (₹)', 'Tanker Count', 'Total (₹)'],
      ...bill.rows.map(r => [r.date, r.rate, r.quantity, r.total]),
      [],
      ['Summary', '', '', ''],
      ['Total Tankers', bill.totalTankers],
      ['Grand Total (₹)', bill.grandTotal],
    ];

    if (bill.buildingSplit) {
      const bs = bill.buildingSplit;
      rows.push(
        [],
        ['Building Split', 'Units', 'Ratio (%)', 'Amount (₹)'],
        ['A Building', units.a, `${(bs.ratioA * 100).toFixed(1)}%`, bs.amountA],
        ['B Building', units.b, `${(bs.ratioB * 100).toFixed(1)}%`, bs.amountB],
        ['C Building', units.c, `${(bs.ratioC * 100).toFixed(1)}%`, bs.amountC],
      );
    }

    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!cols'] = [{ wch: 16 }, { wch: 14 }, { wch: 14 }, { wch: 14 }];
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

  const totalUnits = n(units.a) + n(units.b) + n(units.c);
  const ratioA = totalUnits > 0 ? (n(units.a) / totalUnits * 100).toFixed(1) : 0;
  const ratioB = totalUnits > 0 ? (n(units.b) / totalUnits * 100).toFixed(1) : 0;
  const ratioC = totalUnits > 0 ? (n(units.c) / totalUnits * 100).toFixed(1) : 0;

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

      {/* ── Building Distribution Units ── */}
      <div style={sectionStyle}>
        <p style={headingStyle}>🏢 Building Distribution Units</p>
        <p style={{ margin: 0, fontSize: '0.82rem', opacity: 0.6 }}>
          Number of flats per building — determines cost split ratio
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 130px), 1fr))', gap: 12 }}>
          <Field label="A Building Units" value={units.a} onChange={v => setUnits(u => ({ ...u, a: v }))} />
          <Field label="B Building Units" value={units.b} onChange={v => setUnits(u => ({ ...u, b: v }))} />
          <Field label="C Building Units" value={units.c} onChange={v => setUnits(u => ({ ...u, c: v }))} />
        </div>
        {totalUnits > 0 && (
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: '0.82rem', opacity: 0.65 }}>
              Ratio — A: <strong>{ratioA}%</strong> · B: <strong>{ratioB}%</strong> · C: <strong>{ratioC}%</strong>
            </span>
            <button
              className="button-secondary"
              type="button"
              onClick={handleSaveUnits}
              disabled={isSaving}
              style={{ fontSize: '0.82rem', padding: '6px 14px' }}
            >
              {isSaving ? 'Saving…' : '💾 Save Units'}
            </button>
          </div>
        )}
      </div>

      {/* ── Summary or empty state ── */}
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
          {/* ── Grand Total Metric Cards ── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 180px), 1fr))', gap: 16 }}>
            {[
              { label: 'Total Tankers', value: bill.totalTankers, icon: '🚛', color: '#1e3a8a' },
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

          {/* ── Building Split ── */}
          {bill.buildingSplit && (
            <div style={sectionStyle}>
              <p style={headingStyle}>🏢 Building-wise Cost Split</p>
              <p style={{ margin: 0, fontSize: '0.82rem', opacity: 0.6 }}>
                Grand total of ₹{fmt(bill.grandTotal)} split by flat ratio (A: {ratioA}% · B: {ratioB}% · C: {ratioC}%)
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 160px), 1fr))', gap: 12 }}>
                {[
                  { label: 'A Building', value: bill.buildingSplit.amountA, ratio: ratioA, color: '#1e3a8a', bg: 'rgba(30,58,138,0.07)' },
                  { label: 'B Building', value: bill.buildingSplit.amountB, ratio: ratioB, color: '#6d28d9', bg: 'rgba(109,40,217,0.07)' },
                  { label: 'C Building', value: bill.buildingSplit.amountC, ratio: ratioC, color: '#0f3d35', bg: 'rgba(15,61,53,0.07)' },
                ].map(bld => (
                  <div key={bld.label} style={{
                    background: bld.bg,
                    borderRadius: 12,
                    padding: '16px 20px',
                    border: `1px solid ${bld.bg.replace('0.07', '0.2')}`,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 6,
                    textAlign: 'center',
                  }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, opacity: 0.7, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{bld.label}</span>
                    <span style={{ fontSize: '0.8rem', opacity: 0.6 }}>{bld.ratio}% share</span>
                    <strong style={{ fontSize: '1.25rem', color: bld.color, fontWeight: 800 }}>₹{fmt(bld.value)}</strong>
                  </div>
                ))}
              </div>

              {/* Summary table */}
              <div className="table-card" style={{ marginTop: 4 }}>
                <div className="attendance-table-scroll">
                  <table className="attendance-table">
                    <thead>
                      <tr>
                        <th style={{ textAlign: 'left' }}>Building</th>
                        <th style={{ textAlign: 'right' }}>Units</th>
                        <th style={{ textAlign: 'right' }}>Ratio (%)</th>
                        <th style={{ textAlign: 'right' }}>Amount (₹)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        { label: 'A Building', u: units.a, ratio: ratioA, amt: bill.buildingSplit.amountA },
                        { label: 'B Building', u: units.b, ratio: ratioB, amt: bill.buildingSplit.amountB },
                        { label: 'C Building', u: units.c, ratio: ratioC, amt: bill.buildingSplit.amountC },
                      ].map(r => (
                        <tr key={r.label}>
                          <td style={{ fontWeight: 700 }}>{r.label}</td>
                          <td style={{ textAlign: 'right' }}>{r.u}</td>
                          <td style={{ textAlign: 'right' }}>{r.ratio}%</td>
                          <td style={{ textAlign: 'right', color: '#0f3d35', fontWeight: 700 }}>₹{fmt(r.amt)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr>
                        <th style={{ textAlign: 'left' }}>Grand Total</th>
                        <th style={{ textAlign: 'right' }}>{totalUnits}</th>
                        <th style={{ textAlign: 'right' }}>100%</th>
                        <th style={{ textAlign: 'right', color: '#0f3d35', fontSize: '1.05rem', fontWeight: 800, borderTop: '2px solid #0f3d35' }}>
                          ₹{fmt(bill.grandTotal)}
                        </th>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ── Entry Breakdown Table ── */}
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
                    <th style={{ textAlign: 'right' }}>Tankers</th>
                    <th style={{ textAlign: 'right' }}>Total (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  {bill.rows.map((row, idx) => (
                    <tr key={idx}>
                      <td style={{ fontWeight: 600 }}>{row.date}</td>
                      <td style={{ textAlign: 'right' }}>₹{fmt(row.rate)}</td>
                      <td style={{ textAlign: 'right', fontWeight: 600 }}>{row.quantity}</td>
                      <td style={{ textAlign: 'right', color: '#0f3d35', fontWeight: 700 }}>₹{fmt(row.total)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <th style={{ textAlign: 'left' }}>Grand Total</th>
                    <th />
                    <th style={{ textAlign: 'right' }}>{bill.totalTankers}</th>
                    <th style={{ textAlign: 'right', color: '#0f3d35', fontSize: '1.05rem', fontWeight: 800, borderTop: '2px solid #0f3d35' }}>
                      ₹{fmt(bill.grandTotal)}
                    </th>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
