import { useEffect, useMemo, useState } from 'react';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import * as XLSX from 'xlsx';
import { db, ensureFirebaseSession, isFirebaseConfigured } from '../../firebase.js';
import './TankerBillCalculator.css';


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
    <label className="tanker-bill-calculator-s1">
      <span className="tanker-bill-calculator-s2">{label}</span>
      <div className="tanker-bill-calculator-s3">
        {prefix && <span className="tanker-bill-calculator-s4">{prefix}</span>}
        <input
          type="text"
          inputMode="numeric"
          value={value}
          onChange={e => onChange(e.target.value.replace(/[^0-9.]/g, '').replace(/(\.\.*?)\\.+/g, '$1'))}
          className="tanker-bill-calculator-s5"
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
      [`Water Tanker Bill Summary — ${formatLongMonth(month)}`],
      [],
      ['Date', 'Rate (₹)', 'Water Tanker Count', 'Total (₹)'],
      ...bill.rows.map(r => [r.date, r.rate, r.quantity, r.total]),
      [],
      ['Summary', '', '', ''],
      ['Total Water Tankers', bill.totalTankers],
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
    XLSX.utils.book_append_sheet(wb, ws, `Water Tanker Bill ${formatMonthLabel(month)}`);
    XLSX.writeFile(wb, `water-tanker-bill-${month}.xlsx`);
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
    <div className="tanker-bill-calculator-s6">

      {/* ── Month tabs + header ── */}
      <div className="table-card attendance-table-card attendance-table-card--register tanker-bill-calculator-s7">
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
            <h3>💧 Water Tanker Bill — {formatLongMonth(month)}</h3>
          </div>
          <div className="attendance-table-card__actions">
            <div className="tanker-bill-calculator-s8" style={{ color: badge.c }}>
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
        <p className="tanker-bill-calculator-s9">
          Number of flats per building — determines cost split ratio
        </p>
        <div className="tanker-bill-calculator-s10">
          <Field label="A Building Units" value={units.a} onChange={v => setUnits(u => ({ ...u, a: v }))} />
          <Field label="B Building Units" value={units.b} onChange={v => setUnits(u => ({ ...u, b: v }))} />
          <Field label="C Building Units" value={units.c} onChange={v => setUnits(u => ({ ...u, c: v }))} />
        </div>
        {totalUnits > 0 && (
          <div className="tanker-bill-calculator-s11">
            <span className="tanker-bill-calculator-s12">
              Ratio — A: <strong>{ratioA}%</strong> · B: <strong>{ratioB}%</strong> · C: <strong>{ratioC}%</strong>
            </span>
            <button
              className="button-secondary tanker-bill-calculator-s13"
              type="button"
              onClick={handleSaveUnits}
              disabled={isSaving}
            >
              {isSaving ? 'Saving…' : '💾 Save Units'}
            </button>
          </div>
        )}
      </div>

      {/* ── Summary or empty state ── */}
      {isLoading ? (
        <div className="tanker-bill-calculator-s14">Loading {formatLongMonth(month)}…</div>
      ) : !bill ? (
        <div className="tanker-bill-calculator-s15">
          <div className="tanker-bill-calculator-s16">🚛</div>
          <p className="tanker-bill-calculator-s17">No tanker entries yet for {formatLongMonth(month)}</p>
          <p className="tanker-bill-calculator-s18">Add entries in the Water Tanker Entry tab to see the bill here.</p>
        </div>
      ) : (
        <>
          {/* ── Grand Total Metric Cards ── */}
          <div className="tanker-bill-calculator-s19">
            {[
              { label: 'Total Water Tankers', value: bill.totalTankers, icon: '💧', color: '#1e3a8a' },
              { label: 'Grand Total', value: `₹${fmt(bill.grandTotal)}`, icon: '💰', color: '#0f3d35', large: true },
            ].map(card => (
              <div key={card.label} className="tanker-bill-calculator-s20">
                <span className="tanker-bill-calculator-s21">{card.icon}</span>
                <span className="tanker-bill-calculator-s22">{card.label}</span>
                <strong className="tanker-bill-calculator-s23" style={{ fontSize: card.large ? '1.6rem' : '1.3rem', color: card.color }}>{card.value}</strong>
              </div>
            ))}
          </div>

          {/* ── Building Split ── */}
          {bill.buildingSplit && (
            <div style={sectionStyle}>
              <p style={headingStyle}>🏢 Building-wise Cost Split</p>
              <p className="tanker-bill-calculator-s9">
                Grand total of ₹{fmt(bill.grandTotal)} split by flat ratio (A: {ratioA}% · B: {ratioB}% · C: {ratioC}%)
              </p>
              <div className="tanker-bill-calculator-s24">
                {[
                  { label: 'A Building', value: bill.buildingSplit.amountA, ratio: ratioA, color: '#1e3a8a', bg: 'rgba(30,58,138,0.07)' },
                  { label: 'B Building', value: bill.buildingSplit.amountB, ratio: ratioB, color: '#6d28d9', bg: 'rgba(109,40,217,0.07)' },
                  { label: 'C Building', value: bill.buildingSplit.amountC, ratio: ratioC, color: '#0f3d35', bg: 'rgba(15,61,53,0.07)' },
                ].map(bld => (
                  <div key={bld.label} className="tanker-bill-calculator-s25" style={{ background: bld.bg, border: `1px solid ${bld.bg.replace('0.07', '0.2')}` }}>
                    <span className="tanker-bill-calculator-s26">{bld.label}</span>
                    <span className="tanker-bill-calculator-s27">{bld.ratio}% share</span>
                    <strong className="tanker-bill-calculator-s28" style={{ color: bld.color }}>₹{fmt(bld.value)}</strong>
                  </div>
                ))}
              </div>

              {/* Summary table */}
              <div className="table-card tanker-bill-calculator-s29">
                <div className="attendance-table-scroll">
                  <table className="attendance-table">
                    <thead>
                      <tr>
                        <th className="tanker-bill-calculator-s30">Building</th>
                        <th className="tanker-bill-calculator-s31">Units</th>
                        <th className="tanker-bill-calculator-s31">Ratio (%)</th>
                        <th className="tanker-bill-calculator-s31">Amount (₹)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        { label: 'A Building', u: units.a, ratio: ratioA, amt: bill.buildingSplit.amountA },
                        { label: 'B Building', u: units.b, ratio: ratioB, amt: bill.buildingSplit.amountB },
                        { label: 'C Building', u: units.c, ratio: ratioC, amt: bill.buildingSplit.amountC },
                      ].map(r => (
                        <tr key={r.label}>
                          <td className="tanker-bill-calculator-s32">{r.label}</td>
                          <td className="tanker-bill-calculator-s31">{r.u}</td>
                          <td className="tanker-bill-calculator-s31">{r.ratio}%</td>
                          <td className="tanker-bill-calculator-s33">₹{fmt(r.amt)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr>
                        <th className="tanker-bill-calculator-s30">Grand Total</th>
                        <th className="tanker-bill-calculator-s31">{totalUnits}</th>
                        <th className="tanker-bill-calculator-s31">100%</th>
                        <th className="tanker-bill-calculator-s34">
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
            <div className="tanker-bill-calculator-s35">
              <h3 className="tanker-bill-calculator-s36">Entry Breakdown — {formatLongMonth(month)}</h3>
            </div>
            <div className="attendance-table-scroll">
              <table className="attendance-table">
                <thead>
                  <tr>
                    <th className="tanker-bill-calculator-s30">Date</th>
                    <th className="tanker-bill-calculator-s31">Rate (₹)</th>
                    <th className="tanker-bill-calculator-s31">Water Tankers</th>
                    <th className="tanker-bill-calculator-s31">Total (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  {bill.rows.map((row, idx) => (
                    <tr key={idx}>
                      <td className="tanker-bill-calculator-s37">{row.date}</td>
                      <td className="tanker-bill-calculator-s31">₹{fmt(row.rate)}</td>
                      <td className="tanker-bill-calculator-s38">{row.quantity}</td>
                      <td className="tanker-bill-calculator-s33">₹{fmt(row.total)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <th className="tanker-bill-calculator-s30">Grand Total</th>
                    <th />
                    <th className="tanker-bill-calculator-s31">{bill.totalTankers}</th>
                    <th className="tanker-bill-calculator-s34">
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
