import React, { useState, useEffect, useRef } from 'react';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { db, ensureFirebaseSession, isFirebaseConfigured } from '../../firebase.js';

const fmt = (v) => Number(v).toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });

// ─── TOI Bill Template ────────────────────────────────────────────────────────
// Oct 2021 – Jun 2025 : ₹2,200 / month  (45 months)
// Jul 2025 – Jun 2026 : ₹3,000 / month  (12 months)
const BILLS_TEMPLATE = [
  { id: 1, year: 'FY 2021-22',       period: 'Oct 2021 – Mar 2022', months: 6,  rate: 2200, amount: 13200 },
  { id: 2, year: 'FY 2022-23',       period: 'Apr 2022 – Mar 2023', months: 12, rate: 2200, amount: 26400 },
  { id: 3, year: 'FY 2023-24',       period: 'Apr 2023 – Mar 2024', months: 12, rate: 2200, amount: 26400 },
  { id: 4, year: 'FY 2024-25',       period: 'Apr 2024 – Mar 2025', months: 12, rate: 2200, amount: 26400 },
  { id: 5, year: 'FY 2025-26 (I)',   period: 'Apr 2025 – Jun 2025', months: 3,  rate: 2200, amount: 6600  },
  { id: 6, year: 'FY 2025-26 (II)',  period: 'Jul 2025 – Jun 2026', months: 12, rate: 3000, amount: 36000 },
];

const TOTAL_PER_FLAT = BILLS_TEMPLATE.reduce((s, b) => s + b.amount, 0);
const TOTAL_MONTHS   = BILLS_TEMPLATE.reduce((s, b) => s + b.months, 0); // 57 months
const FLAT_IDS = ['A-302', 'A-904', 'A-1002'];

const makeDefaultFlats = () =>
  FLAT_IDS.map(id => ({
    id, flatNo: id,
    bills: BILLS_TEMPLATE.map(b => ({ ...b, status: 'Pending' })),
  }));

// ─── Style tokens ─────────────────────────────────────────────────────────────
const TH_BASE = {
  padding: '11px 16px',
  borderBottom: '2px solid rgba(61,63,52,0.1)',
  color: '#5f665f', fontWeight: 700,
  fontSize: '0.66rem', textTransform: 'uppercase',
  letterSpacing: '0.07em', whiteSpace: 'nowrap',
  background: 'rgba(244,239,231,0.7)',
};
const TD_BASE = { padding: '13px 16px', verticalAlign: 'middle' };

// ─── Sub-components ───────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const ok = status === 'Paid';
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '4px 11px', borderRadius: 20, fontSize: '0.72rem', fontWeight: 700,
      background: ok ? 'rgba(209,250,229,0.7)' : 'rgba(253,224,71,0.28)',
      color: ok ? '#065f46' : '#92400e',
      border: `1px solid ${ok ? '#34d399' : '#fbbf24'}`,
      whiteSpace: 'nowrap',
    }}>
      {ok ? '✓ Paid' : '⏳ Pending'}
    </span>
  );
}

function StatChip({ label, value, bg, color }) {
  return (
    <div style={{ textAlign: 'center', background: bg, borderRadius: 10, padding: '8px 14px', minWidth: 56 }}>
      <div style={{ fontSize: '1.15rem', fontWeight: 800, color, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.55)', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 2 }}>{label}</div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function TimesOfIndiaTracker({ isAdmin = false }) {
  const [flats, setFlats]           = useState([]);
  const [isLoading, setIsLoading]   = useState(false);
  const [saveStatus, setSaveStatus] = useState('idle');
  const [saveMsg, setSaveMsg]       = useState('');
  const [activeFlat, setActiveFlat] = useState(null);
  const isLoadedRef                 = useRef(false);
  const recordId                    = 'toi_bills_v3';

  useEffect(() => {
    let cancelled = false;
    isLoadedRef.current = false;
    setSaveStatus('idle'); setSaveMsg('');
    setIsLoading(true);
    async function load() {
      if (!isFirebaseConfigured || !db) {
        setFlats(makeDefaultFlats()); setIsLoading(false); isLoadedRef.current = true; return;
      }
      try {
        await ensureFirebaseSession();
        const snap = await getDoc(doc(db, 'toiTracking', recordId));
        if (!cancelled)
          setFlats(snap.exists() && snap.data().flats ? snap.data().flats : makeDefaultFlats());
      } catch { setFlats(makeDefaultFlats()); }
      finally { if (!cancelled) { setIsLoading(false); isLoadedRef.current = true; } }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  const save = async (data) => {
    setSaveStatus('saving');
    if (!isFirebaseConfigured || !db) { setSaveStatus('saved'); setSaveMsg('Local'); return; }
    try {
      await ensureFirebaseSession();
      await setDoc(doc(db, 'toiTracking', recordId), { flats: data, updatedAt: serverTimestamp() }, { merge: true });
      setSaveStatus('saved'); setSaveMsg('✓ Saved');
    } catch { setSaveStatus('error'); setSaveMsg('Save failed'); }
  };

  const toggleBill = (flatId, billId) => {
    if (!isAdmin) return;
    const next = flats.map(f =>
      f.id !== flatId ? f : {
        ...f, bills: f.bills.map(b =>
          b.id !== billId ? b : { ...b, status: b.status === 'Pending' ? 'Paid' : 'Pending' }
        ),
      }
    );
    setFlats(next);
    if (isLoadedRef.current) save(next);
  };

  const totalBills   = flats.reduce((s, f) => s + f.bills.length, 0);
  const totalPaid    = flats.reduce((s, f) => s + f.bills.filter(b => b.status === 'Paid').length, 0);
  const totalPending = flats.reduce((s, f) => s + f.bills.filter(b => b.status === 'Pending').length, 0);
  const amtPaid      = flats.reduce((s, f) => s + f.bills.filter(b => b.status === 'Paid').reduce((a, b) => a + b.amount, 0), 0);
  const amtPending   = flats.reduce((s, f) => s + f.bills.filter(b => b.status === 'Pending').reduce((a, b) => a + b.amount, 0), 0);
  const donePercent  = totalBills > 0 ? Math.round((totalPaid / totalBills) * 100) : 0;

  const visibleFlats = activeFlat ? flats.filter(f => f.id === activeFlat) : flats;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18, fontFamily: 'Inter, system-ui, sans-serif' }}>

      {/* ── Dark Banner ── */}
      <div style={{
        background: 'linear-gradient(135deg, #0b2b26 0%, #196c6c 100%)',
        borderRadius: 20, padding: '20px 24px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        flexWrap: 'wrap', gap: 16,
        boxShadow: '0 6px 28px rgba(11,43,38,0.22)',
      }}>
        <div>
          <p style={{ margin: '0 0 2px', fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#C49B4F' }}>
            Newspaper Subscription
          </p>
          <h2 style={{ margin: '0 0 2px', fontSize: '1.35rem', fontWeight: 800, color: '#fff' }}>
            📰 Times of India Tracker
          </h2>
          <p style={{ margin: 0, color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem' }}>
            Flats A-302 · A-904 · A-1002 &nbsp;|&nbsp; Majestique Euriska
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <StatChip label="Total"   value={totalBills}   bg="rgba(255,255,255,0.1)"  color="#fff"    />
          <StatChip label="Paid"    value={totalPaid}    bg="rgba(110,231,183,0.2)"  color="#6ee7b7" />
          <StatChip label="Pending" value={totalPending} bg="rgba(253,224,71,0.18)"  color="#fde047" />

          {/* Progress ring */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(255,255,255,0.08)', borderRadius: 12, padding: '8px 14px' }}>
            <div style={{ position: 'relative', width: 44, height: 44 }}>
              <svg width="44" height="44" viewBox="0 0 44 44">
                <circle cx="22" cy="22" r="18" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="5" />
                <circle cx="22" cy="22" r="18" fill="none" stroke="#6ee7b7" strokeWidth="5"
                  strokeDasharray={`${2 * Math.PI * 18}`}
                  strokeDashoffset={`${2 * Math.PI * 18 * (1 - donePercent / 100)}`}
                  strokeLinecap="round" transform="rotate(-90 22 22)"
                  style={{ transition: 'stroke-dashoffset 0.6s ease' }}
                />
              </svg>
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 800, color: '#6ee7b7' }}>
                {donePercent}%
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.6)', lineHeight: 1.2 }}>Completion</div>
              <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#fff' }}>{totalPaid}/{totalBills}</div>
            </div>
          </div>

          {saveStatus === 'saving' && <span style={{ fontSize: '0.75rem', color: '#fde047', fontWeight: 700 }}>Saving…</span>}
          {saveStatus === 'saved'  && <span style={{ fontSize: '0.75rem', color: '#6ee7b7', fontWeight: 700 }}>{saveMsg}</span>}
          {saveStatus === 'error'  && <span style={{ fontSize: '0.75rem', color: '#fca5a5', fontWeight: 700 }}>{saveMsg}</span>}
          {isLoading               && <span style={{ fontSize: '0.75rem', color: '#93c5fd', fontWeight: 700 }}>Loading…</span>}
        </div>
      </div>

      {/* ── Summary Cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
        {[
          { label: 'Grand Total (3 Flats)', value: fmt(TOTAL_PER_FLAT * 3), sub: `${fmt(TOTAL_PER_FLAT)} per flat`, accent: '#0b2b26' },
          { label: 'Amount Pending',        value: fmt(amtPending),          sub: 'Across all 3 flats',             accent: '#991b1b' },
          { label: 'Amount Paid',           value: fmt(amtPaid),             sub: 'Across all 3 flats',             accent: '#065f46' },
          { label: 'Per Flat Total',        value: fmt(TOTAL_PER_FLAT),      sub: '45 mos + 12 mos',                accent: '#196c6c' },
        ].map(c => (
          <div key={c.label} style={{
            background: 'rgba(255,250,242,0.97)', border: '1px solid rgba(61,63,52,0.1)',
            borderRadius: 14, padding: '16px 18px',
            boxShadow: '0 2px 10px rgba(11,43,38,0.06)',
          }}>
            <div style={{ fontSize: '0.64rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#5f665f', marginBottom: 6 }}>{c.label}</div>
            <div style={{ fontSize: '1.3rem', fontWeight: 800, color: c.accent, lineHeight: 1 }}>{c.value}</div>
            <div style={{ fontSize: '0.7rem', color: '#8a9080', marginTop: 5 }}>{c.sub}</div>
          </div>
        ))}
      </div>

      {/* ── Rate Slab Banner ── */}
      <div style={{
        padding: '12px 18px', borderRadius: 12,
        background: 'rgba(196,155,79,0.07)', border: '1px solid rgba(196,155,79,0.2)',
        display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center',
      }}>
        <span style={{ fontSize: '0.76rem', fontWeight: 800, color: '#78400e' }}>📋 Rate Slabs:</span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.76rem', color: '#5f665f' }}>
          <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 3, background: '#C49B4F' }} />
          <b>Oct 2021 – Jun 2025</b>: ₹2,200 / year
        </span>
        <span style={{ color: 'rgba(61,63,52,0.25)' }}>|</span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.76rem', color: '#5f665f' }}>
          <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 3, background: '#93c5fd' }} />
          <b>Jul 2025 – Jun 2026</b>: ₹3,000 / year
        </span>
      </div>

      {/* ── Flat Tab Switcher ── */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {[{ id: null, label: 'All Flats', emoji: '🏢' }, ...FLAT_IDS.map(id => ({ id, label: id, emoji: '🏠' }))].map(tab => (
          <button key={String(tab.id)} onClick={() => setActiveFlat(tab.id)} style={{
            padding: '9px 18px', borderRadius: 12, border: '2px solid',
            borderColor: activeFlat === tab.id ? '#0b2b26' : 'rgba(61,63,52,0.15)',
            cursor: 'pointer', fontWeight: 700, fontSize: '0.88rem', fontFamily: 'inherit',
            background: activeFlat === tab.id ? '#0b2b26' : 'rgba(255,250,242,0.85)',
            color: activeFlat === tab.id ? '#C49B4F' : '#1d2a24',
            boxShadow: activeFlat === tab.id ? '0 4px 14px rgba(11,43,38,0.2)' : 'none',
            transition: 'all 0.18s', display: 'flex', alignItems: 'center', gap: 7,
          }}>
            <span>{tab.emoji}</span> <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* ── Flat Tables ── */}
      {visibleFlats.map(flat => {
        const paidAmt   = flat.bills.filter(b => b.status === 'Paid').reduce((s, b) => s + b.amount, 0);
        const pendAmt   = flat.bills.filter(b => b.status === 'Pending').reduce((s, b) => s + b.amount, 0);
        const paidCount = flat.bills.filter(b => b.status === 'Paid').length;
        const pct       = Math.round((paidAmt / TOTAL_PER_FLAT) * 100);

        return (
          <div key={flat.id} style={{
            background: 'rgba(255,250,242,0.97)', borderRadius: 20,
            border: '1px solid rgba(61,63,52,0.1)',
            boxShadow: '0 4px 24px rgba(11,43,38,0.07)', overflow: 'hidden',
          }}>

            {/* Card Header */}
            <div style={{
              padding: '16px 22px',
              background: 'linear-gradient(135deg, rgba(244,239,231,0.98), rgba(255,250,242,0.9))',
              borderBottom: '1px solid rgba(61,63,52,0.08)',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{
                  width: 50, height: 50,
                  background: 'linear-gradient(135deg, #0b2b26, #196c6c)',
                  color: '#C49B4F', borderRadius: 13,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 800, fontSize: '1rem',
                  boxShadow: '0 4px 14px rgba(11,43,38,0.25)',
                }}>
                  {flat.flatNo.split('-')[1]}
                </div>
                <div>
                  <div style={{ fontSize: '0.63rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.09em', color: '#196c6c', marginBottom: 2 }}>Flat</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0b2b26' }}>{flat.flatNo}</div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
                <div style={{ minWidth: 140 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.67rem', color: '#5f665f', marginBottom: 5 }}>
                    <span>{paidCount}/{flat.bills.length} paid</span>
                    <b style={{ color: pct > 0 ? '#065f46' : '#5f665f' }}>{pct}%</b>
                  </div>
                  <div style={{ height: 7, background: 'rgba(61,63,52,0.1)', borderRadius: 99 }}>
                    <div style={{
                      height: '100%', borderRadius: 99,
                      width: `${pct}%`, minWidth: pct > 0 ? 4 : 0,
                      background: 'linear-gradient(90deg, #196c6c, #34d399)',
                      transition: 'width 0.5s ease',
                    }} />
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.63rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#991b1b', marginBottom: 2 }}>Pending</div>
                  <div style={{ fontSize: '1.05rem', fontWeight: 800, color: pendAmt > 0 ? '#991b1b' : '#065f46' }}>{fmt(pendAmt)}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.63rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#065f46', marginBottom: 2 }}>Paid</div>
                  <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#065f46' }}>{fmt(paidAmt)}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.63rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#5f665f', marginBottom: 2 }}>Total</div>
                  <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0b2b26' }}>{fmt(TOTAL_PER_FLAT)}</div>
                </div>
              </div>
            </div>

            {/* Table */}
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 560 }}>
                <thead>
                  <tr>
                    <th style={{ ...TH_BASE, textAlign: 'center', width: 40 }}>#</th>
                    <th style={{ ...TH_BASE, textAlign: 'left' }}>Financial Year</th>
                    <th style={{ ...TH_BASE, textAlign: 'left' }}>Period</th>
                    <th style={{ ...TH_BASE, textAlign: 'center' }}>Months</th>
                    <th style={{ ...TH_BASE, textAlign: 'center' }}>Rate / Month</th>
                    <th style={{ ...TH_BASE, textAlign: 'right' }}>Amount</th>
                    <th style={{ ...TH_BASE, textAlign: 'center' }}>Status</th>
                    {isAdmin && <th style={{ ...TH_BASE, textAlign: 'center' }}>Action</th>}
                  </tr>
                </thead>
                <tbody>
                  {flat.bills.map((bill, idx) => {
                    const isPaid    = bill.status === 'Paid';
                    const isNewRate = bill.rate === 3000;
                    const rowBg     = isPaid ? 'rgba(209,250,229,0.1)' : 'transparent';
                    return (
                      <tr
                        key={bill.id}
                        style={{
                          borderBottom: idx < flat.bills.length - 1 ? '1px solid rgba(61,63,52,0.055)' : 'none',
                          background: rowBg, transition: 'background 0.13s',
                        }}
                        onMouseEnter={e => { if (!isPaid) e.currentTarget.style.background = 'rgba(244,239,231,0.5)'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = rowBg; }}
                      >
                        <td style={{ ...TD_BASE, textAlign: 'center', color: '#c4b99a', fontSize: '0.72rem', fontWeight: 700 }}>{idx + 1}</td>
                        <td style={TD_BASE}>
                          <span style={{
                            display: 'inline-block', padding: '3px 10px', borderRadius: 8,
                            fontSize: '0.71rem', fontWeight: 700,
                            background: isNewRate ? 'rgba(147,197,253,0.22)' : 'rgba(196,155,79,0.13)',
                            color: isNewRate ? '#1e40af' : '#78400e',
                          }}>
                            {bill.year}
                          </span>
                        </td>
                        <td style={{ ...TD_BASE, fontWeight: 600, fontSize: '0.85rem', color: '#1d2a24' }}>{bill.period}</td>
                        <td style={{ ...TD_BASE, textAlign: 'center', fontWeight: 600, fontSize: '0.83rem', color: '#5f665f' }}>{bill.months}</td>
                        <td style={{ ...TD_BASE, textAlign: 'center', fontWeight: 700, fontSize: '0.83rem', color: isNewRate ? '#1e40af' : '#78400e' }}>
                          {fmt(bill.rate)}
                        </td>
                        <td style={{ ...TD_BASE, textAlign: 'right', fontWeight: 800, fontSize: '0.92rem', color: '#0b2b26', fontVariantNumeric: 'tabular-nums' }}>
                          {fmt(bill.amount)}
                        </td>
                        <td style={{ ...TD_BASE, textAlign: 'center' }}>
                          <StatusBadge status={bill.status} />
                        </td>
                        {isAdmin && (
                          <td style={{ ...TD_BASE, textAlign: 'center' }}>
                            <button onClick={() => toggleBill(flat.id, bill.id)} style={{
                              padding: '5px 14px',
                              background: isPaid ? 'rgba(61,63,52,0.07)' : '#0b2b26',
                              color: isPaid ? '#5f665f' : '#C49B4F',
                              border: isPaid ? '1px solid rgba(61,63,52,0.15)' : 'none',
                              borderRadius: 10, cursor: 'pointer',
                              fontSize: '0.75rem', fontWeight: 700,
                              fontFamily: 'inherit', transition: 'all 0.15s', whiteSpace: 'nowrap',
                            }}>
                              {isPaid ? 'Unmark' : '✓ Mark Paid'}
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>

                {/* Grand Total Footer */}
                <tfoot>
                  <tr style={{ background: 'rgba(11,43,38,0.04)', borderTop: '2px solid rgba(61,63,52,0.13)' }}>
                    <td colSpan={3} style={{ ...TD_BASE, textAlign: 'right', fontWeight: 800, fontSize: '0.82rem', color: '#0b2b26', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Grand Total
                    </td>
                    <td style={{ ...TD_BASE, textAlign: 'center', fontWeight: 800, fontSize: '0.92rem', color: '#196c6c' }}>
                      <span style={{ display: 'inline-block', padding: '3px 10px', borderRadius: 8, background: 'rgba(25,108,108,0.1)', color: '#196c6c', fontWeight: 800, fontSize: '0.82rem' }}>
                        {TOTAL_MONTHS} mos
                      </span>
                    </td>
                    <td style={{ ...TD_BASE, textAlign: 'center', fontWeight: 700, fontSize: '0.8rem', color: '#5f665f' }}>
                      45 × ₹2,200<br />12 × ₹3,000
                    </td>
                    <td style={{ ...TD_BASE, textAlign: 'right', fontWeight: 800, fontSize: '1rem', color: '#0b2b26', fontVariantNumeric: 'tabular-nums' }}>
                      {fmt(TOTAL_PER_FLAT)}
                    </td>
                    <td style={{ ...TD_BASE, textAlign: 'center' }}>
                      <span style={{
                        display: 'inline-block', padding: '4px 10px', borderRadius: 20,
                        fontSize: '0.72rem', fontWeight: 700,
                        background: pendAmt === 0 ? 'rgba(209,250,229,0.7)' : 'rgba(254,226,226,0.6)',
                        color: pendAmt === 0 ? '#065f46' : '#991b1b',
                        border: `1px solid ${pendAmt === 0 ? '#34d399' : '#fca5a5'}`,
                      }}>
                        {pendAmt === 0 ? '✓ Fully Paid' : `${fmt(pendAmt)} due`}
                      </span>
                    </td>
                    {isAdmin && <td />}
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        );
      })}
    </div>
  );
}
