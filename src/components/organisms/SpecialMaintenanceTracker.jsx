import React, { useState, useEffect, useRef } from 'react';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { db, ensureFirebaseSession, isFirebaseConfigured } from '../../firebase.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (v) =>
  Number(v).toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });

// ─── Rate Slabs & Bill Template ──────────────────────────────────────────────
// Oct 2021 – Jun 2025 : ₹2,200 / month  (45 months)
// Jul 2025 – Jun 2026 : ₹3,000 / month  (12 months)
const BILLS_TEMPLATE = [
  { id: 1, year: 'FY 2021-22', period: 'Oct 2021 – Mar 2022', months: 6, rate: 2200, amount: 13200 },
  { id: 2, year: 'FY 2022-23', period: 'Apr 2022 – Mar 2023', months: 12, rate: 2200, amount: 26400 },
  { id: 3, year: 'FY 2023-24', period: 'Apr 2023 – Mar 2024', months: 12, rate: 2200, amount: 26400 },
  { id: 4, year: 'FY 2024-25', period: 'Apr 2024 – Mar 2025', months: 12, rate: 2200, amount: 26400 },
  { id: 5, year: 'FY 2025-26 (I)', period: 'Apr 2025 – Jun 2025', months: 3, rate: 2200, amount: 6600 },
  { id: 6, year: 'FY 2025-26 (II)', period: 'Jul 2025 – Jun 2026', months: 12, rate: 3000, amount: 36000 },
];

const TOTAL_PER_FLAT = BILLS_TEMPLATE.reduce((s, b) => s + b.amount, 0); // ₹1,35,000
const TOTAL_MONTHS = BILLS_TEMPLATE.reduce((s, b) => s + b.months, 0); // 57 months
const FLAT_IDS = ['A-302', 'A-904', 'A-1002'];

const TOI_TRANSACTIONS = [
  { transactionNo: '-', invoiceNo: '-', invoiceDate: '-', amount: 9000, createdOn: '-', utrNo: '-', period: 'April to June 2026', unit: 'A-302' },
  { transactionNo: '-', invoiceNo: '-', invoiceDate: '-', amount: 9000, createdOn: '-', utrNo: '-', period: 'April to June 2026', unit: 'A-904' },
  { transactionNo: '-', invoiceNo: '-', invoiceDate: '-', amount: 9000, createdOn: '-', utrNo: '-', period: 'April to June 2026', unit: 'A-1002' },
  { transactionNo: '4060073532', invoiceNo: 'ME/A/15/OCT-25', invoiceDate: '18-10-2025', amount: 18000, createdOn: '21-11-2025', utrNo: 'HDFCN52025112110540834', period: 'Oct 25 to Mar 26', unit: 'A-302' },
  { transactionNo: '4060073966', invoiceNo: 'ME/A/16/OCT-25', invoiceDate: '18-10-2025', amount: 18000, createdOn: '25-11-2025', utrNo: 'HDFCH00631917461', period: 'Oct 25 to Mar 26', unit: 'A-904' },
  { transactionNo: '4060073966', invoiceNo: 'ME/A/17/OCT-25', invoiceDate: '18-10-2025', amount: 18000, createdOn: '25-11-2025', utrNo: 'HDFCH00631917461', period: 'Oct 25 to Mar 26', unit: 'A-1002' },
  { transactionNo: '4060039399', invoiceNo: 'ME/A/14/JUN-25', invoiceDate: '01-06-2025', amount: 15900, createdOn: '08-08-2025', utrNo: 'HDFCN52025080805655292', period: 'Apr 25 to Sep 25', unit: 'A-302' },
  { transactionNo: '4060039399', invoiceNo: 'ME/A/15/JUN-25', invoiceDate: '01-06-2025', amount: 15900, createdOn: '08-08-2025', utrNo: 'HDFCN52025080805655292', period: 'Apr 25 to Sep 25', unit: 'A-904' },
  { transactionNo: '4060039399', invoiceNo: 'ME/A/16/JUN-25', invoiceDate: '01-06-2025', amount: 15900, createdOn: '08-08-2025', utrNo: 'HDFCN52025080805655292', period: 'Apr 25 to Sep 25', unit: 'A-1002' },
  { transactionNo: '1000050569', invoiceNo: 'ME/A/14/OCT-24B', invoiceDate: '10-10-2024', amount: 13200, createdOn: '19-03-2025', utrNo: '503257788563', period: 'OCT24 TO MAR25', unit: 'A-904' },
  { transactionNo: '1000050567', invoiceNo: 'ME/A/14/OCT-24', invoiceDate: '10-10-2024', amount: 13200, createdOn: '19-03-2025', utrNo: '503257788563', period: 'OCT24 TO MAR25', unit: 'A-302' },
  { transactionNo: '1000034521', invoiceNo: 'ME/A/13/JUN-24-3', invoiceDate: '17-06-2024', amount: 13200, createdOn: '03-07-2024', utrNo: 'N243243234910184', period: 'April 24 to Sept 24', unit: 'A-1002' },
  { transactionNo: '1000034519', invoiceNo: 'ME/A/13/JUN-24-2', invoiceDate: '17-06-2024', amount: 13200, createdOn: '03-07-2024', utrNo: 'N243243234910184', period: 'April 24 to Sept 24', unit: 'A-904' },
  { transactionNo: '1000034517', invoiceNo: 'ME/A/13/JUN-24-1', invoiceDate: '17-06-2024', amount: 13200, createdOn: '03-07-2024', utrNo: 'N243243234910184', period: 'April 24 to Sept 24', unit: 'A-302' },
  { transactionNo: '1000026932', invoiceNo: 'ME/A/13/DEC-23', invoiceDate: '10-12-2023', amount: 11000, createdOn: '26-02-2024', utrNo: '-', period: 'Nov23 to Jan24', unit: 'A-1002' },
  { transactionNo: '1000026931', invoiceNo: 'ME/A/12/DEC-23', invoiceDate: '10-12-2023', amount: 11000, createdOn: '26-02-2024', utrNo: '-', period: 'Nov23 to Jan24', unit: 'A-904' },
  { transactionNo: '1000026930', invoiceNo: 'ME/A/11/DEC-23', invoiceDate: '10-12-2023', amount: 11000, createdOn: '26-02-2024', utrNo: '-', period: 'Nov23 to Jan24', unit: 'A-302' },
  { transactionNo: '1000017540', invoiceNo: 'ME/A/17/JULY-23', invoiceDate: '20-07-2023', amount: 13200, createdOn: '08-09-2023', utrNo: 'N291232695112959', period: 'May23 to Oct23', unit: 'A-1002' },
  { transactionNo: '1000017539', invoiceNo: 'ME/A/16/JULY-23', invoiceDate: '20-07-2023', amount: 13200, createdOn: '08-09-2023', utrNo: 'N291232695112959', period: 'May23 to Oct23', unit: 'A-904' },
  { transactionNo: '1000017538', invoiceNo: 'ME/A/15/JULY-23', invoiceDate: '20-07-2023', amount: 13200, createdOn: '08-09-2023', utrNo: 'N291232695112959', period: 'May23 to Oct23', unit: 'A-302' },
  { transactionNo: '1000010335', invoiceNo: 'SF/74/APRIL-2023', invoiceDate: '01-04-2023', amount: 100, createdOn: '06-04-2023', utrNo: 'N102232415860682', period: "Apr'23 to Jun'23", unit: 'A-1002' },
  { transactionNo: '1000010334', invoiceNo: 'M/73/APRIL-2023', invoiceDate: '01-04-2023', amount: 3100, createdOn: '06-04-2023', utrNo: 'N102232415860682', period: "Apr'23 to Jun'23", unit: 'A-1002' },
  { transactionNo: '1000010332', invoiceNo: 'SF/68/APRIL-2023', invoiceDate: '01-04-2023', amount: 100, createdOn: '06-04-2023', utrNo: 'N102232415860682', period: "Apr'23 to Jun'23", unit: 'A-904' },
  { transactionNo: '1000010331', invoiceNo: 'M/68/APRIL-2023', invoiceDate: '01-04-2023', amount: 3100, createdOn: '06-04-2023', utrNo: 'N102232415860682', period: "Apr'23 to Jun'23", unit: 'A-904' },
  { transactionNo: '1000010330', invoiceNo: 'SF/13/APRIL-2023', invoiceDate: '01-04-2023', amount: 100, createdOn: '06-04-2023', utrNo: 'N102232415860682', period: "Apr'23 to Jun'23", unit: 'A-302' },
  { transactionNo: '1000010329', invoiceNo: 'M/17/APRIL-2023', invoiceDate: '01-04-2023', amount: 3100, createdOn: '06-04-2023', utrNo: 'N102232415860682', period: "Apr'23 to Jun'23", unit: 'A-302' },
  { transactionNo: '1000009809', invoiceNo: '14', invoiceDate: '01-01-2023', amount: 6600, createdOn: '28-03-2023', utrNo: 'N090232395743913', period: "Oct'22 to Mar'23", unit: 'A-1002' },
  { transactionNo: '1000009807', invoiceNo: '9', invoiceDate: '01-12-2022', amount: 6600, createdOn: '28-03-2023', utrNo: 'N090232395743913', period: "Oct'22 to Mar'23", unit: 'A-1002' },
  { transactionNo: '1000009804', invoiceNo: '12', invoiceDate: '01-01-2023', amount: 6600, createdOn: '28-03-2023', utrNo: 'N090232395743913', period: "Oct'22 to Mar'23", unit: 'A-904' },
  { transactionNo: '1000009802', invoiceNo: '6', invoiceDate: '01-12-2022', amount: 6600, createdOn: '28-03-2023', utrNo: 'N090232395743913', period: "Oct'22 to Mar'23", unit: 'A-904' },
  { transactionNo: '1000009801', invoiceNo: '13', invoiceDate: '01-01-2023', amount: 6600, createdOn: '28-03-2023', utrNo: 'N090232395743913', period: "Oct'22 to Mar'23", unit: 'A-302' },
  { transactionNo: '1000009800', invoiceNo: '3', invoiceDate: '01-12-2022', amount: 6600, createdOn: '28-03-2023', utrNo: 'N090232395743913', period: "Oct'22 to Mar'23", unit: 'A-302' },
  { transactionNo: 'Red Motive', invoiceNo: '-', invoiceDate: '15-07-2022', amount: 13200, createdOn: '15-07-2022', utrNo: '-', period: "Apr'22 to Sept'22", unit: 'A-1002' },
  { transactionNo: 'Red Motive', invoiceNo: '-', invoiceDate: '15-07-2022', amount: 13200, createdOn: '15-07-2022', utrNo: '-', period: "Apr'22 to Sept'22", unit: 'A-904' },
  { transactionNo: 'Red Motive', invoiceNo: '-', invoiceDate: '15-07-2022', amount: 13200, createdOn: '15-07-2022', utrNo: '-', period: "Apr'22 to Sept'22", unit: 'A-302' },
  { transactionNo: 'Red Motive', invoiceNo: '-', invoiceDate: '18-02-2022', amount: 14000, createdOn: '18-02-2022', utrNo: '-', period: "Oct'21 to Mar'22", unit: 'A-1002' },
  { transactionNo: 'Red Motive', invoiceNo: '-', invoiceDate: '18-02-2022', amount: 14000, createdOn: '18-02-2022', utrNo: '-', period: "Oct'21 to Mar'22", unit: 'A-904' },
  { transactionNo: 'Red Motive', invoiceNo: '-', invoiceDate: '18-02-2022', amount: 14000, createdOn: '18-02-2022', utrNo: '-', period: "Oct'21 to Mar'22", unit: 'A-302' },
];

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
export default function MaintenanceTracker({ isAdmin = false }) {
  const [flats, setFlats] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState('idle');
  const [saveMsg, setSaveMsg] = useState('');
  const [activeFlat, setActiveFlat] = useState(null);
  const [activeToiFlat, setActiveToiFlat] = useState(null);
  const [viewSection, setViewSection] = useState('maintenance'); // 'maintenance' | 'toi_transactions' | 'overall_toi'
  const isLoadedRef = useRef(false);
  const recordId = 'maintenance_bills_v3';

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
        const snap = await getDoc(doc(db, 'maintenanceTracking', recordId));
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
      await setDoc(doc(db, 'maintenanceTracking', recordId), { flats: data, updatedAt: serverTimestamp() }, { merge: true });
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

  const totalBills = flats.reduce((s, f) => s + f.bills.length, 0);
  const totalPaid = flats.reduce((s, f) => s + f.bills.filter(b => b.status === 'Paid').length, 0);
  const totalPending = flats.reduce((s, f) => s + f.bills.filter(b => b.status === 'Pending').length, 0);
  const amtPaid = flats.reduce((s, f) => s + f.bills.filter(b => b.status === 'Paid').reduce((a, b) => a + b.amount, 0), 0);
  const amtPending = flats.reduce((s, f) => s + f.bills.filter(b => b.status === 'Pending').reduce((a, b) => a + b.amount, 0), 0);
  const grandTotal = TOTAL_PER_FLAT * 3;
  const donePercent = totalBills > 0 ? Math.round((totalPaid / totalBills) * 100) : 0;
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
            {viewSection === 'maintenance' ? 'Flat Maintenance' : 'Newspaper Transactions'}
          </p>
          <h2 style={{ margin: '0 0 2px', fontSize: '1.35rem', fontWeight: 800, color: '#fff' }}>
            {viewSection === 'maintenance' ? '🏠 Maintenance Amount Tracker' : '📰 TOI Amount Tracker'}
          </h2>
          <p style={{ margin: 0, color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem' }}>
            Flats A-302 · A-904 · A-1002 &nbsp;|&nbsp; Majestique Euriska
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <StatChip label="Total" value={totalBills} bg="rgba(255,255,255,0.1)" color="#fff" />
          <StatChip label="Paid" value={totalPaid} bg="rgba(110,231,183,0.2)" color="#6ee7b7" />
          <StatChip label="Pending" value={totalPending} bg="rgba(253,224,71,0.18)" color="#fde047" />

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
          {saveStatus === 'saved' && <span style={{ fontSize: '0.75rem', color: '#6ee7b7', fontWeight: 700 }}>{saveMsg}</span>}
          {saveStatus === 'error' && <span style={{ fontSize: '0.75rem', color: '#fca5a5', fontWeight: 700 }}>{saveMsg}</span>}
          {isLoading && <span style={{ fontSize: '0.75rem', color: '#93c5fd', fontWeight: 700 }}>Loading…</span>}
        </div>
      </div>

      {/* ── Summary Cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
        {[
          { label: 'Grand Total (3 Flats)', value: fmt(grandTotal), sub: `${fmt(TOTAL_PER_FLAT)} per flat`, accent: '#0b2b26' },
          { label: 'Amount Pending', value: fmt(amtPending), sub: 'Across all 3 flats', accent: '#991b1b' },
          { label: 'Amount Paid', value: fmt(amtPaid), sub: 'Across all 3 flats', accent: '#065f46' },
          { label: 'Per Flat Total', value: fmt(TOTAL_PER_FLAT), sub: '45 mos × ₹2,200 + 12 mos × ₹3,000', accent: '#196c6c' },
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
          <b>Oct 2021 – Jun 2025</b>: ₹2,200 / month (45 months)
        </span>
        <span style={{ color: 'rgba(61,63,52,0.25)' }}>|</span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.76rem', color: '#5f665f' }}>
          <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 3, background: '#93c5fd' }} />
          <b>Jul 2025 – Jun 2026</b>: ₹3,000 / month (12 months)
        </span>
      </div>

      {/* ── Section Switcher ── */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 4 }}>
        {[
          { id: 'maintenance', label: '🏠 Maintenance Tracker' },
          { id: 'toi_transactions', label: '📰 TOI Transactions' },
          { id: 'overall_toi', label: '📊 Overall TOI' },
        ].map(s => (
          <button key={s.id} onClick={() => setViewSection(s.id)} style={{
            padding: '10px 22px', borderRadius: 12, border: '2px solid',
            borderColor: viewSection === s.id ? '#0b2b26' : 'rgba(61,63,52,0.15)',
            cursor: 'pointer', fontWeight: 700, fontSize: '0.9rem', fontFamily: 'inherit',
            background: viewSection === s.id ? '#0b2b26' : 'rgba(255,250,242,0.85)',
            color: viewSection === s.id ? '#C49B4F' : '#1d2a24',
            boxShadow: viewSection === s.id ? '0 4px 14px rgba(11,43,38,0.2)' : 'none',
            transition: 'all 0.18s',
          }}>
            {s.label}
          </button>
        ))}
      </div>

      {viewSection === 'maintenance' && (
        <>
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
        const paidAmt = flat.bills.filter(b => b.status === 'Paid').reduce((s, b) => s + b.amount, 0);
        const pendAmt = flat.bills.filter(b => b.status === 'Pending').reduce((s, b) => s + b.amount, 0);
        const paidCount = flat.bills.filter(b => b.status === 'Paid').length;
        const pct = Math.round((paidAmt / TOTAL_PER_FLAT) * 100);

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
                    <span>{paidCount}/{flat.bills.length} instalments paid</span>
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
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 600 }}>
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
                    const isPaid = bill.status === 'Paid';
                    const isNewRate = bill.rate === 3000;
                    const rowBg = isPaid ? 'rgba(209,250,229,0.1)' : 'transparent';
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
        </>
      )}

      {/* ── TOI Transactions View ── */}
      {viewSection === 'toi_transactions' && (() => {
        const filteredToi = activeToiFlat ? TOI_TRANSACTIONS.filter(t => t.unit === activeToiFlat) : TOI_TRANSACTIONS;
        const toiTotalAmount = filteredToi.reduce((a, b) => a + b.amount, 0);

        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            {/* ── Flat Tab Switcher ── */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {[{ id: null, label: 'All Flats', emoji: '🏢' }, ...FLAT_IDS.map(id => ({ id, label: id, emoji: '🏠' }))].map(tab => (
                <button key={String(tab.id)} onClick={() => setActiveToiFlat(tab.id)} style={{
                  padding: '9px 18px', borderRadius: 12, border: '2px solid',
                  borderColor: activeToiFlat === tab.id ? '#0b2b26' : 'rgba(61,63,52,0.15)',
                  cursor: 'pointer', fontWeight: 700, fontSize: '0.88rem', fontFamily: 'inherit',
                  background: activeToiFlat === tab.id ? '#0b2b26' : 'rgba(255,250,242,0.85)',
                  color: activeToiFlat === tab.id ? '#C49B4F' : '#1d2a24',
                  boxShadow: activeToiFlat === tab.id ? '0 4px 14px rgba(11,43,38,0.2)' : 'none',
                  transition: 'all 0.18s', display: 'flex', alignItems: 'center', gap: 7,
                }}>
                  <span>{tab.emoji}</span> <span>{tab.label}</span>
                </button>
              ))}
            </div>

            <div style={{
              background: 'rgba(255,250,242,0.97)', borderRadius: 20,
              border: '1px solid rgba(61,63,52,0.1)',
              boxShadow: '0 4px 24px rgba(11,43,38,0.07)', overflow: 'hidden',
            }}>
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
                    fontWeight: 800, fontSize: '1.5rem',
                    boxShadow: '0 4px 14px rgba(11,43,38,0.25)',
                  }}>
                    📰
                  </div>
                  <div>
                    <div style={{ fontSize: '0.63rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.09em', color: '#196c6c', marginBottom: 2 }}>Records</div>
                    <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0b2b26' }}>Times of India Paid Transactions</div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.63rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#5f665f', marginBottom: 2 }}>Maintenance Expected</div>
                    <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#1d2a24' }}>{fmt(activeToiFlat ? TOTAL_PER_FLAT : grandTotal)}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.63rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#991b1b', marginBottom: 2 }}>TOI Paid</div>
                    <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#991b1b' }}>{fmt(toiTotalAmount)}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.63rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#065f46', marginBottom: 2 }}>Balance Available</div>
                    <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#065f46' }}>{fmt((activeToiFlat ? TOTAL_PER_FLAT : grandTotal) - toiTotalAmount)}</div>
                  </div>
                </div>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 900 }}>
                  <thead>
                    <tr>
                      <th style={{ ...TH_BASE, textAlign: 'center', width: 40 }}>#</th>
                      <th style={{ ...TH_BASE, textAlign: 'center' }}>Flat</th>
                      <th style={{ ...TH_BASE, textAlign: 'left' }}>Transaction No</th>
                      <th style={{ ...TH_BASE, textAlign: 'left' }}>Invoice No</th>
                      <th style={{ ...TH_BASE, textAlign: 'center' }}>Invoice Date</th>
                      <th style={{ ...TH_BASE, textAlign: 'left' }}>Period</th>
                      <th style={{ ...TH_BASE, textAlign: 'center' }}>UTR / Reference</th>
                      <th style={{ ...TH_BASE, textAlign: 'center' }}>Created On</th>
                      <th style={{ ...TH_BASE, textAlign: 'right' }}>Amount</th>
                      <th style={{ ...TH_BASE, textAlign: 'center' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredToi.map((txn, idx) => (
                      <tr
                        key={idx}
                        style={{
                          borderBottom: idx < filteredToi.length - 1 ? '1px solid rgba(61,63,52,0.055)' : 'none',
                          background: 'rgba(209,250,229,0.1)', transition: 'background 0.13s',
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(209,250,229,0.3)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'rgba(209,250,229,0.1)'}
                      >
                        <td style={{ ...TD_BASE, textAlign: 'center', color: '#c4b99a', fontSize: '0.72rem', fontWeight: 700 }}>{idx + 1}</td>
                        <td style={{ ...TD_BASE, textAlign: 'center' }}>
                          <span style={{
                            display: 'inline-block', padding: '3px 10px', borderRadius: 8,
                            fontSize: '0.71rem', fontWeight: 700,
                            background: 'rgba(11,43,38,0.1)', color: '#0b2b26',
                          }}>
                            {txn.unit}
                          </span>
                        </td>
                        <td style={{ ...TD_BASE, fontWeight: 600, fontSize: '0.85rem', color: '#196c6c' }}>{txn.transactionNo}</td>
                        <td style={{ ...TD_BASE, fontWeight: 600, fontSize: '0.8rem', color: '#5f665f' }}>{txn.invoiceNo}</td>
                        <td style={{ ...TD_BASE, textAlign: 'center', fontWeight: 600, fontSize: '0.8rem', color: '#5f665f' }}>{txn.invoiceDate}</td>
                        <td style={{ ...TD_BASE, fontWeight: 600, fontSize: '0.8rem', color: '#1d2a24' }}>{txn.period}</td>
                        <td style={{ ...TD_BASE, textAlign: 'center', fontWeight: 600, fontSize: '0.75rem', color: '#8a9080' }}>{txn.utrNo || '-'}</td>
                        <td style={{ ...TD_BASE, textAlign: 'center', fontWeight: 600, fontSize: '0.8rem', color: '#5f665f' }}>{txn.createdOn}</td>
                        <td style={{ ...TD_BASE, textAlign: 'right', fontWeight: 800, fontSize: '0.92rem', color: '#065f46', fontVariantNumeric: 'tabular-nums' }}>
                          {fmt(txn.amount)}
                        </td>
                        <td style={{ ...TD_BASE, textAlign: 'center' }}>
                          <StatusBadge status="Paid" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── Overall TOI Reconciliation ── */}
      {viewSection === 'overall_toi' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, fontFamily: 'Arial, sans-serif' }}>
          
          <div style={{
            background: '#fff', borderRadius: 8,
            border: '1px solid #c9c9c9', overflow: 'hidden'
          }}>
            
            {/* Header Titles */}
            <div style={{ background: '#0b2447', color: '#fff', textAlign: 'center', padding: '16px' }}>
              <h2 style={{ margin: '0 0 6px', fontSize: '1.4rem', fontWeight: 800, textTransform: 'uppercase' }}>SOCIETY MAINTENANCE PAYMENT RECONCILIATION – TIME OF INDIA</h2>
              <div style={{ color: '#e5e7eb', fontSize: '0.9rem', fontWeight: 600 }}>
                <span style={{ color: '#fbbf24' }}>Flats: 302, 904, 1002 (3 Flats)</span> &nbsp;|&nbsp; Maintenance Start Date: October 2021
              </div>
            </div>

            {/* Header KPI Cards */}
            <div style={{ display: 'flex', flexWrap: 'wrap', padding: '12px', gap: 12, background: '#f8fafc', borderBottom: '1px solid #c9c9c9' }}>
              <div style={{ flex: 1, minWidth: 200, padding: '10px 14px', background: '#fff', border: '1px solid #cbd5e1', borderRadius: 6, display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ fontSize: '2rem', color: '#1e3a8a' }}>📅</div>
                <div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569' }}>Rate till June 2025</div>
                  <div style={{ fontSize: '1rem', fontWeight: 800 }}>₹2,200 per Month per Flat</div>
                </div>
              </div>
              <div style={{ flex: 1, minWidth: 200, padding: '10px 14px', background: '#fff', border: '1px solid #cbd5e1', borderRadius: 6, display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ fontSize: '2rem', color: '#16a34a' }}>📈</div>
                <div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569' }}>Rate from July 2025</div>
                  <div style={{ fontSize: '1rem', fontWeight: 800 }}>₹3,000 per Month per Flat</div>
                </div>
              </div>
              <div style={{ flex: 1, minWidth: 200, padding: '10px 14px', background: '#fff', border: '1px solid #cbd5e1', borderRadius: 6, display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ fontSize: '2rem', color: '#3b82f6' }}>🧾</div>
                <div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', textAlign: 'center' }}>Total Amount Due<br/>(Oct 2021 to Jun 2026)</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#1e3a8a', textAlign: 'center' }}>₹4,05,000</div>
                </div>
              </div>
              <div style={{ flex: 1, minWidth: 200, padding: '10px 14px', background: '#fff', border: '1px solid #cbd5e1', borderRadius: 6, display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ fontSize: '2rem', color: '#16a34a' }}>💲</div>
                <div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', textAlign: 'center' }}>Total Amount Paid (Till Date)</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#16a34a', textAlign: 'center' }}>₹3,98,100<br/><span style={{ fontSize: '0.8rem', color: '#15803d' }}>(₹3,16,500 + 81,600)</span></div>
                </div>
              </div>
              <div style={{ flex: '0 0 auto', padding: '10px 20px', background: '#fff7ed', border: '2px solid #fed7aa', borderRadius: 6, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#ea580c' }}>NET OUTSTANDING BALANCE</div>
                <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#dc2626' }}>₹6,900</div>
              </div>
            </div>

            {/* Section A */}
            <div style={{ padding: '0' }}>
              <div style={{ background: '#eef2ff', color: '#1e3a8a', padding: '6px', textAlign: 'center', fontWeight: 800, fontSize: '0.85rem', borderBottom: '1px solid #c9c9c9' }}>
                A. CHRONOLOGICAL PAYMENT TIMELINE (All Payments Received)
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'center', fontSize: '0.8rem' }}>
                  <thead>
                    <tr style={{ background: '#0b2447', color: '#fff' }}>
                      <th style={{ padding: '8px 6px', borderRight: '1px solid rgba(255,255,255,0.2)' }}>Sr.<br/>No.</th>
                      <th style={{ padding: '8px 6px', borderRight: '1px solid rgba(255,255,255,0.2)' }}>Payment Date</th>
                      <th style={{ padding: '8px 6px', borderRight: '1px solid rgba(255,255,255,0.2)' }}>Payment Mode /<br/>Bank</th>
                      <th style={{ padding: '8px 6px', borderRight: '1px solid rgba(255,255,255,0.2)' }}>Amount<br/>Paid (₹)</th>
                      <th style={{ padding: '8px 6px', borderRight: '1px solid rgba(255,255,255,0.2)' }}>For Which Flats</th>
                      <th style={{ padding: '8px 6px', borderRight: '1px solid rgba(255,255,255,0.2)' }}>Maintenance Period<br/>Covered</th>
                      <th style={{ padding: '8px 6px', borderRight: '1px solid rgba(255,255,255,0.2)' }}>No. of<br/>Months</th>
                      <th style={{ padding: '8px 6px', borderRight: '1px solid rgba(255,255,255,0.2)' }}>Rate Per<br/>Flat (₹)</th>
                      <th style={{ padding: '8px 6px', borderRight: '1px solid rgba(255,255,255,0.2)' }}>Amount Applicable<br/>for 3 Flats (₹)</th>
                      <th style={{ padding: '8px 6px', borderRight: '1px solid rgba(255,255,255,0.2)' }}>Difference<br/>(Paid - Expected)</th>
                      <th style={{ padding: '8px 6px' }}>Remarks</th>
                    </tr>
                  </thead>
                  <tbody style={{ fontWeight: 600 }}>
                    <tr style={{ borderBottom: '1px solid #ddd' }}>
                      <td style={{ padding: '12px 6px' }}>1</td>
                      <td style={{ padding: '12px 6px', color: '#b91c1c', fontWeight: 800 }}>18-02-2022</td>
                      <td style={{ padding: '12px 6px', color: '#b91c1c', fontWeight: 800 }}>Red Motive</td>
                      <td style={{ padding: '12px 6px', color: '#b91c1c', fontWeight: 800 }}>55,200</td>
                      <td style={{ padding: '12px 6px', color: '#b91c1c', fontWeight: 800 }}>302, 904, 1002, 902<br/>(4 Flats)</td>
                      <td style={{ padding: '12px 6px', color: '#b91c1c', fontWeight: 800 }}>Oct 2021 – Mar 2022<br/>(6 Months)</td>
                      <td style={{ padding: '12px 6px' }}>6</td>
                      <td style={{ padding: '12px 6px' }}>2,200</td>
                      <td style={{ padding: '12px 6px', fontWeight: 800 }}>39,600</td>
                      <td style={{ padding: '12px 6px', color: '#15803d', fontWeight: 800 }}>+2,400</td>
                      <td style={{ padding: '6px', textAlign: 'left', fontSize: '0.75rem', lineHeight: 1.3 }}>
                        Paid for 4 Flats (₹55,200)<br/>
                        Less: Flat 902 share (2,200 × 6)<br/>
                        = ₹13,200<br/>
                        <b>Applicable for 3 Flats = ₹42,000</b><br/>
                        <b>Expected for 3 Flats = ₹39,600</b><br/>
                        <b>Extra Paid = ₹2,400</b>
                      </td>
                    </tr>
                    <tr style={{ background: '#fdf6e3', borderBottom: '1px solid #ddd', fontSize: '0.75rem' }}>
                      <td colSpan={11} style={{ padding: '6px 12px', textAlign: 'left' }}>
                        Break-up: 2,200 × 4 Flats × 6 Months = ₹55,200 &nbsp;|&nbsp; Less: Flat 902 (2,200 × 6) = ₹13,200 &nbsp;|&nbsp; Applicable for 3 Flats = ₹42,000<br/>
                        Expected for 3 Flats: 2,200 × 3 × 6 = ₹39,600 &nbsp;|&nbsp; Extra Paid = ₹2,400
                      </td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid #ddd' }}>
                      <td style={{ padding: '12px 6px' }}>2</td>
                      <td style={{ padding: '12px 6px', color: '#b91c1c', fontWeight: 800 }}>15-07-2022</td>
                      <td style={{ padding: '12px 6px', color: '#b91c1c', fontWeight: 800 }}>Red Motive</td>
                      <td style={{ padding: '12px 6px', color: '#b91c1c', fontWeight: 800 }}>39,600</td>
                      <td style={{ padding: '12px 6px', color: '#b91c1c', fontWeight: 800 }}>302, 904, 1002<br/>(3 Flats)</td>
                      <td style={{ padding: '12px 6px', color: '#b91c1c', fontWeight: 800 }}>Apr 2022 – Sept 2022<br/>(6 Months)</td>
                      <td style={{ padding: '12px 6px' }}>6</td>
                      <td style={{ padding: '12px 6px' }}>2,200</td>
                      <td style={{ padding: '12px 6px', fontWeight: 800 }}>39,600</td>
                      <td style={{ padding: '12px 6px', color: '#15803d', fontWeight: 800 }}>0</td>
                      <td style={{ padding: '12px 6px', color: '#15803d', fontWeight: 800 }}>Fully Paid</td>
                    </tr>
                    {/* Summary row for Section A */}
                    <tr style={{ background: '#f0fdf4', borderTop: '2px solid #bbf7d0', borderBottom: '1px solid #bbf7d0' }}>
                      <td colSpan={3} style={{ padding: '8px', color: '#166534', fontWeight: 800 }}>SUMMARY FOR<br/>OCT 2021 – SEPT 2022<br/>(12 MONTHS)</td>
                      <td colSpan={3} style={{ padding: '8px' }}>
                        <div style={{ fontSize: '0.75rem', color: '#475569' }}>Total Expected for 3 Flats</div>
                        <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#166534' }}>₹79,200</div>
                      </td>
                      <td colSpan={3} style={{ padding: '8px' }}>
                        <div style={{ fontSize: '0.75rem', color: '#475569' }}>Total Paid</div>
                        <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#166534' }}>₹81,600</div>
                      </td>
                      <td style={{ padding: '8px' }}>
                        <div style={{ fontSize: '0.75rem', color: '#475569' }}>Difference (Paid - Expected)</div>
                        <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#15803d' }}>+ ₹2,400</div>
                      </td>
                      <td style={{ padding: '8px' }}>
                        <div style={{ fontSize: '0.75rem', color: '#475569' }}>Status</div>
                        <div style={{ fontSize: '1rem', fontWeight: 800, color: '#15803d' }}>EXTRA PAID</div>
                      </td>
                    </tr>
                    <tr style={{ background: '#f0fdf4', borderBottom: '2px solid #c9c9c9' }}>
                      <td colSpan={11} style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 800, color: '#166534', fontSize: '0.85rem' }}>
                        <span style={{ fontSize: '1.1rem', verticalAlign: 'middle' }}>✅</span> Conclusion: No missing bill for Oct 2021 – Sept 2022. Total Extra Paid: ₹2,400
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Section B & Details Panel */}
            <div style={{ background: '#eef2ff', color: '#1e3a8a', padding: '6px', textAlign: 'center', fontWeight: 800, fontSize: '0.85rem', borderBottom: '1px solid #c9c9c9' }}>
              B. PERIOD-WISE RECONCILIATION STATEMENT
            </div>
            
            <div style={{ display: 'flex', flexWrap: 'wrap' }}>
              
              {/* Table B */}
              <div style={{ flex: '2 1 600px', overflowX: 'auto', borderRight: '1px solid #c9c9c9' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'center', fontSize: '0.75rem' }}>
                  <thead>
                    <tr style={{ background: '#0b2447', color: '#fff' }}>
                      <th style={{ padding: '8px 4px', borderRight: '1px solid rgba(255,255,255,0.2)' }}>Sr.<br/>No.</th>
                      <th style={{ padding: '8px 4px', borderRight: '1px solid rgba(255,255,255,0.2)' }}>Period</th>
                      <th style={{ padding: '8px 4px', borderRight: '1px solid rgba(255,255,255,0.2)' }}>Months</th>
                      <th style={{ padding: '8px 4px', borderRight: '1px solid rgba(255,255,255,0.2)' }}>Rate Per<br/>Flat per Month (₹)</th>
                      <th style={{ padding: '8px 4px', borderRight: '1px solid rgba(255,255,255,0.2)' }}>Expected Amount<br/>for 3 Flats (₹)</th>
                      <th style={{ padding: '8px 4px', borderRight: '1px solid rgba(255,255,255,0.2)' }}>Amount Paid (₹)</th>
                      <th style={{ padding: '8px 4px', borderRight: '1px solid rgba(255,255,255,0.2)' }}>Payment Date / Bank</th>
                      <th style={{ padding: '8px 4px', borderRight: '1px solid rgba(255,255,255,0.2)' }}>Difference<br/>(Paid - Expected) (₹)</th>
                      <th style={{ padding: '8px 4px' }}>Status / Remarks</th>
                    </tr>
                  </thead>
                  <tbody style={{ fontWeight: 600 }}>
                    <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                      <td style={{ padding: '8px' }}>1</td>
                      <td style={{ padding: '8px' }}>Oct 2021 – Sept 2022 (12 Months)</td>
                      <td style={{ padding: '8px' }}>12</td>
                      <td style={{ padding: '8px' }}>2,200</td>
                      <td style={{ padding: '8px' }}>79,200</td>
                      <td style={{ padding: '8px', color: '#15803d', fontWeight: 800 }}>81,600</td>
                      <td style={{ padding: '8px', fontSize: '0.7rem' }}>18-02-2022 (RM) - 42,000<br/>15-07-2022 (RM) - 39,600</td>
                      <td style={{ padding: '8px', color: '#15803d', fontWeight: 800 }}>+2,400</td>
                      <td style={{ padding: '8px', color: '#15803d', fontWeight: 800 }}>EXTRA PAID</td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid #e5e7eb', background: '#f8fafc' }}>
                      <td style={{ padding: '8px' }}>2</td>
                      <td style={{ padding: '8px' }}>Oct 2022 – Mar 2023 (6 Months)</td>
                      <td style={{ padding: '8px' }}>6</td>
                      <td style={{ padding: '8px' }}>2,200</td>
                      <td style={{ padding: '8px' }}>39,600</td>
                      <td style={{ padding: '8px', color: '#dc2626', fontWeight: 800 }}>39,600</td>
                      <td style={{ padding: '8px' }}>31-03-2023 (ICICI)</td>
                      <td style={{ padding: '8px', color: '#15803d', fontWeight: 800 }}>0</td>
                      <td style={{ padding: '8px', color: '#15803d', fontWeight: 800 }}>PAID</td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                      <td style={{ padding: '8px' }}>3</td>
                      <td style={{ padding: '8px' }}>Apr 2023 – Mar 2024 (12 Months)</td>
                      <td style={{ padding: '8px' }}>12</td>
                      <td style={{ padding: '8px' }}>2,200</td>
                      <td style={{ padding: '8px' }}>79,200</td>
                      <td style={{ padding: '8px', color: '#15803d', fontWeight: 800 }}>82,200</td>
                      <td style={{ padding: '8px', fontSize: '0.7rem' }}>12-04-2023, 18-10-2023,<br/>16-05-2024 (ICICI)</td>
                      <td style={{ padding: '8px', color: '#15803d', fontWeight: 800 }}>+3,000</td>
                      <td style={{ padding: '8px', color: '#15803d', fontWeight: 800 }}>EXTRA PAID</td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid #e5e7eb', background: '#f8fafc' }}>
                      <td style={{ padding: '8px' }}>4</td>
                      <td style={{ padding: '8px' }}>Apr 2024 – Sept 2024 (6 Months)</td>
                      <td style={{ padding: '8px' }}>6</td>
                      <td style={{ padding: '8px' }}>2,200</td>
                      <td style={{ padding: '8px' }}>39,600</td>
                      <td style={{ padding: '8px', color: '#dc2626', fontWeight: 800 }}>39,600</td>
                      <td style={{ padding: '8px' }}>30-08-2024 (ICICI)</td>
                      <td style={{ padding: '8px', color: '#15803d', fontWeight: 800 }}>0</td>
                      <td style={{ padding: '8px', color: '#15803d', fontWeight: 800 }}>PAID</td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                      <td style={{ padding: '8px' }}>5</td>
                      <td style={{ padding: '8px' }}>Oct 2024 – Mar 2025 (6 Months)</td>
                      <td style={{ padding: '8px' }}>6</td>
                      <td style={{ padding: '8px' }}>2,200</td>
                      <td style={{ padding: '8px' }}>39,600</td>
                      <td style={{ padding: '8px', color: '#dc2626', fontWeight: 800 }}>26,400</td>
                      <td style={{ padding: '8px' }}>28-03-2025 (ICICI)</td>
                      <td style={{ padding: '8px', color: '#dc2626', fontWeight: 800 }}>-13,200</td>
                      <td style={{ padding: '8px', color: '#dc2626', fontWeight: 800 }}>SHORT PAID</td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid #e5e7eb', background: '#f8fafc' }}>
                      <td style={{ padding: '8px' }}>6</td>
                      <td style={{ padding: '8px' }}>Apr 2025 – Sept 2025 (6 Months)</td>
                      <td style={{ padding: '8px' }}>6</td>
                      <td style={{ padding: '8px', fontSize: '0.7rem' }}>Apr–Jun: 2,200<br/>Jul–Sept: 3,000</td>
                      <td style={{ padding: '8px' }}>46,800</td>
                      <td style={{ padding: '8px', color: '#dc2626', fontWeight: 800 }}>47,700</td>
                      <td style={{ padding: '8px' }}>08-08-2025 (ICICI)</td>
                      <td style={{ padding: '8px', color: '#15803d', fontWeight: 800 }}>+900</td>
                      <td style={{ padding: '8px', color: '#15803d', fontWeight: 800 }}>EXTRA PAID<br/><span style={{ fontSize: '0.6rem', color: '#475569', fontWeight: 500 }}>(Details below)</span></td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                      <td style={{ padding: '8px' }}>7</td>
                      <td style={{ padding: '8px' }}>Oct 2025 – Mar 2026 (6 Months)</td>
                      <td style={{ padding: '8px' }}>6</td>
                      <td style={{ padding: '8px' }}>3,000</td>
                      <td style={{ padding: '8px' }}>54,000</td>
                      <td style={{ padding: '8px', color: '#15803d', fontWeight: 800 }}>54,000</td>
                      <td style={{ padding: '8px' }}>21-11-2025 & 25-11-2025 (ICICI)</td>
                      <td style={{ padding: '8px', color: '#15803d', fontWeight: 800 }}>0</td>
                      <td style={{ padding: '8px', color: '#15803d', fontWeight: 800 }}>PAID</td>
                    </tr>
                    <tr style={{ borderBottom: '2px solid #0b2447', background: '#f8fafc' }}>
                      <td style={{ padding: '8px' }}>8</td>
                      <td style={{ padding: '8px' }}>Apr 2026 – Jun 2026 (3 Months)</td>
                      <td style={{ padding: '8px' }}>3</td>
                      <td style={{ padding: '8px' }}>3,000</td>
                      <td style={{ padding: '8px' }}>27,000</td>
                      <td style={{ padding: '8px', color: '#15803d', fontWeight: 800 }}>27,000</td>
                      <td style={{ padding: '8px' }}>–</td>
                      <td style={{ padding: '8px', color: '#15803d', fontWeight: 800 }}>0</td>
                      <td style={{ padding: '8px', color: '#15803d', fontWeight: 800 }}>PAID</td>
                    </tr>
                    <tr style={{ background: '#eef2ff', color: '#1e3a8a', fontSize: '0.85rem' }}>
                      <td colSpan="2" style={{ padding: '10px', textAlign: 'center', fontWeight: 800 }}>TOTAL</td>
                      <td style={{ padding: '10px', fontWeight: 800, color: '#1d4ed8' }}>57</td>
                      <td></td>
                      <td style={{ padding: '10px', fontWeight: 800, color: '#dc2626' }}>4,05,000</td>
                      <td style={{ padding: '10px', fontWeight: 800, color: '#15803d' }}>3,98,100<br/><span style={{ fontSize: '0.65rem' }}>(3,16,500 + 81,600)</span></td>
                      <td></td>
                      <td style={{ padding: '10px', fontWeight: 800, color: '#dc2626' }}>-6,900</td>
                      <td></td>
                    </tr>
                  </tbody>
                </table>
              </div>
              
              {/* Details Side Panel */}
              <div style={{ flex: '1 1 250px', background: '#fff', borderLeft: '1px solid #c9c9c9', padding: '12px' }}>
                <div style={{ background: '#f0fdf4', color: '#166534', fontWeight: 800, padding: '8px', fontSize: '0.75rem', border: '1px solid #bbf7d0', borderRadius: 4, textAlign: 'center', marginBottom: 12 }}>
                  DETAILS: APR 2025 – SEPT 2025 PAYMENT
                </div>
                <div style={{ fontSize: '0.75rem', fontWeight: 600 }}>
                  <div style={{ fontWeight: 800, marginBottom: 4, color: '#1e293b' }}>Expected Break-up for 3 Flats</div>
                  <ul style={{ margin: '0 0 12px', paddingLeft: 16, lineHeight: 1.5, color: '#334155' }}>
                    <li>Apr – Jun 2025 (3m): 2,200 × 3 × 3 = ₹19,800</li>
                    <li>Jul – Sept 2025 (3m): 3,000 × 3 × 3 = ₹27,000</li>
                  </ul>
                  <div style={{ fontWeight: 800, marginBottom: 12, color: '#1e293b' }}>Total Expected = ₹46,800</div>
                  <hr style={{ border: 'none', borderTop: '1px dashed #cbd5e1', margin: '12px 0' }} />
                  <div style={{ fontWeight: 800, marginBottom: 4, color: '#166534' }}>Amount Paid</div>
                  <div style={{ color: '#334155', marginBottom: 12 }}>Paid on 08-08-2025 (ICICI) = ₹47,700</div>
                  <hr style={{ border: 'none', borderTop: '1px dashed #cbd5e1', margin: '12px 0' }} />
                  <div style={{ fontWeight: 800, marginBottom: 4, color: '#1e293b' }}>Difference</div>
                  <div style={{ color: '#334155' }}>₹47,700 - ₹46,800 = ₹900 (Extra Paid)</div>
                </div>
              </div>

            </div>

            {/* Bottom Grid Panels */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', padding: '16px', background: '#f8fafc', borderTop: '1px solid #c9c9c9' }}>
              
              {/* C. WHERE THEY PAY SHORT */}
              <div style={{ background: '#fff', border: '1px solid #fecaca', borderRadius: 6, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                <div style={{ color: '#b91c1c', textAlign: 'center', padding: '8px', fontWeight: 800, fontSize: '0.8rem', borderBottom: '1px solid #fecaca' }}>C. WHERE THEY PAY SHORT</div>
                <div style={{ padding: '0', fontSize: '0.75rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <div style={{ display: 'flex', background: '#fef2f2', padding: '6px 10px', borderBottom: '1px solid #fee2e2', fontWeight: 800, color: '#1e293b' }}>
                    <div style={{ flex: 1, textAlign: 'center' }}>Particulars</div>
                    <div style={{ width: '70px', textAlign: 'right' }}>Amount (₹)</div>
                  </div>
                  <div style={{ display: 'flex', padding: '8px 10px', borderBottom: '1px solid #f87171', flex: 1, color: '#334155', fontWeight: 600 }}>
                    <div style={{ flex: 1 }}>Oct 2024 – Mar 2025 (Short Paid)</div>
                    <div style={{ width: '70px', textAlign: 'right' }}>13,200</div>
                  </div>
                  <div style={{ display: 'flex', padding: '10px', color: '#b91c1c', fontWeight: 800 }}>
                    <div style={{ flex: 1, textAlign: 'center' }}>TOTAL SHORTFALL</div>
                    <div style={{ width: '70px', textAlign: 'right' }}>₹13,200</div>
                  </div>
                </div>
              </div>

              {/* D. WHERE THEY PAY EXTRA */}
              <div style={{ background: '#fff', border: '1px solid #bbf7d0', borderRadius: 6, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                <div style={{ color: '#15803d', textAlign: 'center', padding: '8px', fontWeight: 800, fontSize: '0.8rem', borderBottom: '1px solid #bbf7d0' }}>D. WHERE THEY PAY EXTRA</div>
                <div style={{ padding: '0', fontSize: '0.75rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <div style={{ display: 'flex', background: '#f0fdf4', padding: '6px 10px', borderBottom: '1px solid #dcfce7', fontWeight: 800, color: '#1e293b' }}>
                    <div style={{ flex: 1, textAlign: 'center' }}>Particulars</div>
                    <div style={{ width: '70px', textAlign: 'right' }}>Amount (₹)</div>
                  </div>
                  <div style={{ display: 'flex', padding: '8px 10px', borderBottom: '1px solid #e2e8f0', color: '#334155', fontWeight: 600 }}>
                    <div style={{ flex: 1 }}>Oct 2021 – Sept 2022 (Extra Paid)</div>
                    <div style={{ width: '70px', textAlign: 'right' }}>2,400</div>
                  </div>
                  <div style={{ display: 'flex', padding: '8px 10px', borderBottom: '1px solid #e2e8f0', color: '#334155', fontWeight: 600 }}>
                    <div style={{ flex: 1 }}>Apr 2023 – Mar 2024 (Extra Paid)</div>
                    <div style={{ width: '70px', textAlign: 'right' }}>3,000</div>
                  </div>
                  <div style={{ display: 'flex', padding: '8px 10px', borderBottom: '1px solid #4ade80', flex: 1, color: '#334155', fontWeight: 600 }}>
                    <div style={{ flex: 1 }}>Apr 2025 – Sept 2025 (Extra Paid)</div>
                    <div style={{ width: '70px', textAlign: 'right' }}>900</div>
                  </div>
                  <div style={{ display: 'flex', padding: '10px', color: '#15803d', fontWeight: 800 }}>
                    <div style={{ flex: 1, textAlign: 'center' }}>TOTAL EXTRA PAID</div>
                    <div style={{ width: '70px', textAlign: 'right' }}>₹6,300</div>
                  </div>
                </div>
              </div>

              {/* E. NET OUTSTANDING CALCULATION */}
              <div style={{ background: '#fff', border: '1px solid #c7d2fe', borderRadius: 6, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                <div style={{ color: '#4338ca', textAlign: 'center', padding: '8px', fontWeight: 800, fontSize: '0.8rem', borderBottom: '1px solid #c7d2fe' }}>E. NET OUTSTANDING CALCULATION</div>
                <div style={{ padding: '12px', fontSize: '0.75rem', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', fontWeight: 600, color: '#334155' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                    <span>Total Shortfall (C)</span>
                    <strong style={{ fontSize: '0.85rem' }}>₹13,200</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', borderBottom: '1px solid #818cf8', paddingBottom: '10px' }}>
                    <span>Less: Total Extra Paid (D)</span>
                    <strong style={{ fontSize: '0.85rem' }}>- ₹6,300</strong>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ color: '#4338ca', fontWeight: 800, fontSize: '0.75rem', marginBottom: 4 }}>NET OUTSTANDING BALANCE</div>
                    <div style={{ color: '#3730a3', fontWeight: 800, fontSize: '1.4rem' }}>₹6,900</div>
                  </div>
                </div>
              </div>

              {/* F. OVERALL SUMMARY */}
              <div style={{ background: '#fff', border: '1px solid #cbd5e1', borderRadius: 6, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                <div style={{ color: '#1e293b', textAlign: 'center', padding: '8px', fontWeight: 800, fontSize: '0.8rem', borderBottom: '1px solid #cbd5e1' }}>F. OVERALL SUMMARY</div>
                <div style={{ padding: '12px 12px 0 12px', fontSize: '0.75rem', display: 'flex', flexDirection: 'column', fontWeight: 600, color: '#334155' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                    <span>Total Amount Due (Oct 2021 to Jun 2026)</span>
                    <strong style={{ fontSize: '0.85rem' }}>₹4,05,000</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <span>Total Amount Paid (Till Date)</span>
                    <strong style={{ fontSize: '0.85rem' }}>₹3,98,100</strong>
                  </div>
                </div>
                <div style={{ background: '#0b2447', color: '#fff', padding: '12px', textAlign: 'center', marginTop: 'auto' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.75rem', marginBottom: 2 }}>NET OUTSTANDING TO BE RECEIVED</div>
                  <div style={{ fontWeight: 800, fontSize: '1.4rem' }}>₹6,900</div>
                </div>
              </div>
              
              {/* KEY TAKEAWAYS */}
              <div style={{ background: '#fffcf2', border: '1px solid #fde047', borderRadius: 6, overflow: 'hidden', display: 'flex', flexDirection: 'column', gridColumn: 'span 2' }}>
                <div style={{ color: '#854d0e', textAlign: 'center', padding: '8px', fontWeight: 800, fontSize: '0.8rem', borderBottom: '1px solid #fef08a' }}>KEY TAKEAWAYS</div>
                <div style={{ padding: '12px', fontSize: '0.8rem', color: '#3f6212', fontWeight: 600, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <span>✓</span>
                    <span>No missing bill for Oct 2021 – Sept 2022. Extra paid by ₹2,400.</span>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <span>✓</span>
                    <span>All payments are mapped against corresponding periods.</span>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <span>✓</span>
                    <span>Only shortfall is for Oct 2024 – Mar 2025.</span>
                  </div>
                </div>
              </div>

            </div>
            
            {/* Notes Footer */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 20px', background: '#fff', borderTop: '1px solid #cbd5e1', fontSize: '0.75rem', color: '#64748b', fontWeight: 600, flexWrap: 'wrap', gap: '12px' }}>
              <div style={{ display: 'flex', gap: '8px' }}>
                <span style={{ color: '#f59e0b', fontSize: '1.1rem' }}>💡</span>
                <div>
                  <div><strong>NOTES:</strong> 1. Maintenance includes 3 Flats: 302, 904, 1002</div>
                  <div style={{ paddingLeft: '48px' }}>2. All amounts are in Indian Rupees (₹)</div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#f8fafc', padding: '6px 12px', borderRadius: '20px', border: '1px solid #e2e8f0' }}>
                <span style={{ color: '#f59e0b', fontSize: '1rem' }}>⭐</span>
                Extra payments of ₹6,300 have been adjusted against the shortfall to arrive at the Net Outstanding Balance.
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
