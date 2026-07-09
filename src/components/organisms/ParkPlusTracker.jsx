import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  collection, doc, onSnapshot, setDoc, deleteDoc, serverTimestamp
} from 'firebase/firestore';
import { db, ensureFirebaseSession, isFirebaseConfigured } from '../../firebase.js';

// ─── Constants ──────────────────────────────────────────────────────────────────
const PAYMENT_STATUS = ['Unpaid', 'Paid', 'Partial', 'Overdue'];

const STATUS_STYLE = {
  Paid:    { bg: '#d1fae5', color: '#065f46', border: '#6ee7b7' },
  Unpaid:  { bg: '#fef9c3', color: '#713f12', border: '#fde047' },
  Partial: { bg: '#dbeafe', color: '#1e3a8a', border: '#93c5fd' },
  Overdue: { bg: '#fee2e2', color: '#991b1b', border: '#fca5a5' },
};

// ─── Seed data from invoices ─────────────────────────────────────────────────────
const INITIAL_INVOICES = [
  {
    id: 'PTI-202526-APR',
    invoiceDate: '2025-04-01',
    dueDate: '2025-04-16',
    description: 'Automated Gate and Security Solution',
    hsn: '997319',
    qty: 3,
    uom: 'NOS',
    unitPrice: 18750.0,
    igstRate: 18,
    igstAmt: 3375.0,
    grandTotal: 22125.0,
    paymentStatus: 'Paid',
    paidDate: '',
    remarks: '\u20b96,250 \u00d7 3 months',
    period: '01-04-2025 to 30-06-2025',
  },
  {
    id: 'PTI-202526-001',
    invoiceDate: '2025-05-31',
    dueDate: '2025-06-15',
    description: 'RFID Installation Charges',
    hsn: '995461',
    qty: 1,
    uom: 'NOS',
    unitPrice: 20000.0,
    igstRate: 18,
    igstAmt: 3600.0,
    grandTotal: 23600.0,
    paymentStatus: 'Paid',
    paidDate: '',
    remarks: '',
    period: '',
  },
  {
    id: 'PTI-202526-18817',
    invoiceDate: '2025-08-31',
    dueDate: '2025-09-15',
    description: 'Automated Gate and Security Solution',
    hsn: '997319',
    qty: 1,
    uom: 'NOS',
    unitPrice: 6387.36,
    igstRate: 18,
    igstAmt: 1149.72,
    grandTotal: 7537.0,
    paymentStatus: 'Paid',
    paidDate: '',
    remarks: '',
    period: '31-08-2025 to 30-09-2025',
  },
  {
    id: 'PTI-202526-OCT',
    invoiceDate: '2025-10-01',
    dueDate: '2025-10-16',
    description: 'Automated Gate and Security Solution',
    hsn: '997319',
    qty: 1,
    uom: 'NOS',
    unitPrice: 18750.0,
    igstRate: 18,
    igstAmt: 3392.25,
    grandTotal: 22238.0,
    paymentStatus: 'Paid',
    paidDate: '',
    remarks: '',
    period: '01-10-2025 to 31-12-2025',
  },
  {
    id: 'PTI-202526-JAN',
    invoiceDate: '2026-01-01',
    dueDate: '2026-01-16',
    description: 'Automated Gate and Security Solution',
    hsn: '997319',
    qty: 1,
    uom: 'NOS',
    unitPrice: 18750.0,
    igstRate: 18,
    igstAmt: 3426.74,
    grandTotal: 22464.0,
    paymentStatus: 'Paid',
    paidDate: '',
    remarks: '',
    period: '01-01-2026 to 31-03-2026',
  },
  {
    id: 'PTI202627-01870',
    invoiceDate: '2026-04-01',
    dueDate: '2026-04-16',
    description: 'Automated Gate and Security Solution',
    hsn: '997319',
    qty: 1,
    uom: 'NOS',
    unitPrice: 19687.5,
    igstRate: 18,
    igstAmt: 3543.75,
    grandTotal: 23231.0,
    paymentStatus: 'Paid',
    paidDate: '',
    remarks: '\u26a0\ufe0f 5% hike applied from Apr 1 by Park+. Should apply from May 1 — possible overcharge of \u20b9312.50 (pre-GST).',
    period: '01-04-2026 to 30-06-2026',
  },
  {
    id: 'PTI-202526-JUL',
    invoiceDate: '2026-07-01',
    dueDate: '2026-07-16',
    description: 'Automated Gate and Security Solution',
    hsn: '997319',
    qty: 1,
    uom: 'NOS',
    unitPrice: 19687.5,
    igstRate: 18,
    igstAmt: 3543.75,
    grandTotal: 23231.0,
    paymentStatus: 'Unpaid',
    paidDate: '',
    remarks: '',
    period: '01-07-2026 to 30-09-2026',
  },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────────
function fmtDate(val) {
  if (!val) return '—';
  try {
    const [y, m, d] = val.split('-');
    return `${d}/${m}/${y}`;
  } catch { return val; }
}

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function calcDaysLeft(dueDate, status) {
  if (!dueDate || status === 'Paid') return null;
  return Math.ceil((new Date(dueDate) - new Date()) / 86400000);
}

function formatINR(n) {
  return new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n || 0);
}

// ─── Sub-components ──────────────────────────────────────────────────────────────
function StatusPill({ status }) {
  const s = STATUS_STYLE[status];
  if (!s) return <span style={{ color: '#c4b99a', fontSize: '0.78rem' }}>—</span>;
  return (
    <span style={{
      display: 'inline-block', fontSize: '0.72rem', fontWeight: 700,
      letterSpacing: '0.04em', padding: '3px 10px', borderRadius: 20,
      whiteSpace: 'nowrap', background: s.bg, color: s.color, border: `1px solid ${s.border}`,
    }}>{status}</span>
  );
}

function DaysChip({ days }) {
  if (days === null) return <span style={{ color: '#c4b99a', fontSize: '0.78rem' }}>—</span>;
  const color = days < 0 ? '#991b1b' : days <= 5 ? '#d97706' : '#065f46';
  const bg    = days < 0 ? '#fee2e2' : days <= 5 ? '#fef3c7' : '#d1fae5';
  const label = days < 0 ? `${Math.abs(days)}d overdue` : days === 0 ? 'Due today!' : `${days}d left`;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      fontSize: '0.72rem', fontWeight: 700, padding: '3px 10px',
      borderRadius: 20, background: bg, color,
    }}>
      {days < 0 && <span>⚠</span>}
      {label}
    </span>
  );
}

// ─── Invoice Form Modal ──────────────────────────────────────────────────────────
const EMPTY_FORM = {
  invoiceDate: '', dueDate: '', description: '', hsn: '997319',
  qty: 1, uom: 'NOS', unitPrice: '', igstRate: 18,
  paymentStatus: 'Unpaid', paidDate: '', remarks: '', period: '',
};

function InvoiceModal({ invoice, onSave, onClose }) {
  const [form, setForm] = useState(() => {
    if (invoice && invoice.id) return { ...EMPTY_FORM, ...invoice };
    return { ...EMPTY_FORM };
  });

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const igstAmt    = Number(form.unitPrice || 0) * (Number(form.igstRate) / 100);
  const grandTotal = Number(form.unitPrice || 0) + igstAmt;

  const F = {
    width: '100%', padding: '8px 12px', borderRadius: 10,
    border: '1px solid rgba(61,63,52,0.16)', background: '#fffefb',
    color: '#1d2a24', fontSize: '0.88rem', fontFamily: 'inherit', outline: 'none',
    boxSizing: 'border-box',
  };
  const L = {
    fontSize: '0.73rem', fontWeight: 700, textTransform: 'uppercase',
    letterSpacing: '0.07em', color: '#5f665f', display: 'block', marginBottom: 5,
  };

  const handleSave = () => {
    if (!form.invoiceDate || !form.dueDate || !form.description || !form.unitPrice) return;
    onSave({ ...form, igstAmt: +igstAmt.toFixed(2), grandTotal: +Math.round(grandTotal) });
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(10px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
    }} onClick={onClose}>
      <div style={{
        background: '#fffaf2', borderRadius: 22, padding: '28px 28px 22px',
        width: '100%', maxWidth: 680, maxHeight: '92vh', overflowY: 'auto',
        boxShadow: '0 40px 100px rgba(0,0,0,0.28)',
      }} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
          <div>
            <p style={{ margin: 0, fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#196c6c' }}>
              Park+ Payment
            </p>
            <h3 style={{ margin: '2px 0 0', fontSize: '1.2rem', fontWeight: 800, color: '#0b2b26' }}>
              {invoice && invoice.id ? '✏️ Edit Invoice' : '➕ Add New Invoice'}
            </h3>
          </div>
          <button onClick={onClose} style={{
            background: 'rgba(61,63,52,0.08)', border: 'none', borderRadius: 10,
            width: 36, height: 36, cursor: 'pointer', fontSize: '1rem',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>✕</button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px 18px' }}>

          {/* Full-width: Description */}
          <label style={{ gridColumn: '1/-1' }}>
            <span style={L}>Description *</span>
            <input style={F} value={form.description} onChange={e => set('description', e.target.value)}
              placeholder="e.g. Automated Gate and Security Solution" />
          </label>

          {/* Period */}
          <label style={{ gridColumn: '1/-1' }}>
            <span style={L}>Service Period</span>
            <input style={F} value={form.period} onChange={e => set('period', e.target.value)}
              placeholder="e.g. 01-07-2026 to 30-09-2026" />
          </label>

          {/* Invoice Date */}
          <label>
            <span style={L}>Invoice Date *</span>
            <input type="date" style={F} value={form.invoiceDate} onChange={e => set('invoiceDate', e.target.value)} />
          </label>

          {/* Due Date */}
          <label>
            <span style={L}>Due Date *</span>
            <input type="date" style={F} value={form.dueDate} onChange={e => set('dueDate', e.target.value)} />
          </label>

          {/* HSN/SAC */}
          <label>
            <span style={L}>HSN/SAC Code</span>
            <input style={F} value={form.hsn} onChange={e => set('hsn', e.target.value)} placeholder="997319" />
          </label>

          {/* UOM */}
          <label>
            <span style={L}>UOM</span>
            <input style={F} value={form.uom} onChange={e => set('uom', e.target.value)} placeholder="NOS" />
          </label>

          {/* Unit Price */}
          <label>
            <span style={L}>Unit Price (INR) *</span>
            <input type="number" style={F} value={form.unitPrice} onChange={e => set('unitPrice', e.target.value)}
              placeholder="18750.00" step="0.01" />
          </label>

          {/* IGST Rate */}
          <label>
            <span style={L}>IGST Rate (%)</span>
            <select style={F} value={form.igstRate} onChange={e => set('igstRate', Number(e.target.value))}>
              {[5, 12, 18, 28].map(r => <option key={r} value={r}>{r}%</option>)}
            </select>
          </label>

          {/* Calculated totals */}
          <div style={{
            gridColumn: '1/-1', background: 'rgba(25,108,108,0.06)',
            borderRadius: 12, padding: '14px 18px',
            display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12,
          }}>
            {[
              { label: 'Subtotal', val: `\u20b9${formatINR(form.unitPrice || 0)}` },
              { label: `IGST (${form.igstRate}%)`, val: `\u20b9${formatINR(igstAmt)}` },
              { label: 'Grand Total', val: `\u20b9${formatINR(grandTotal)}`, bold: true },
            ].map(({ label, val, bold }) => (
              <div key={label} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '0.68rem', color: '#5f665f', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>{label}</div>
                <div style={{ fontSize: bold ? '1.05rem' : '0.92rem', fontWeight: bold ? 800 : 700, color: bold ? '#0b2b26' : '#196c6c' }}>{val}</div>
              </div>
            ))}
          </div>

          {/* Payment Status */}
          <label style={{ gridColumn: '1/-1' }}>
            <span style={L}>Payment Status</span>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {PAYMENT_STATUS.map(s => {
                const st = STATUS_STYLE[s];
                const active = form.paymentStatus === s;
                return (
                  <button key={s} type="button" onClick={() => set('paymentStatus', s)} style={{
                    padding: '6px 16px', borderRadius: 20, cursor: 'pointer',
                    fontSize: '0.82rem', fontWeight: 700, fontFamily: 'inherit',
                    border: `2px solid ${active ? st.border : 'rgba(61,63,52,0.12)'}`,
                    background: active ? st.bg : 'transparent',
                    color: active ? st.color : '#5f665f',
                    transition: 'all 0.15s',
                  }}>{s}</button>
                );
              })}
            </div>
          </label>

          {/* Paid Date */}
          {form.paymentStatus === 'Paid' && (
            <label>
              <span style={L}>Paid On</span>
              <input type="date" style={F} value={form.paidDate} onChange={e => set('paidDate', e.target.value)} />
            </label>
          )}

          {/* Remarks */}
          <label style={{ gridColumn: '1/-1' }}>
            <span style={L}>Remarks</span>
            <textarea rows={2} style={{ ...F, resize: 'vertical' }}
              value={form.remarks} onChange={e => set('remarks', e.target.value)}
              placeholder="Any notes or payment reference..." />
          </label>

        </div>

        {/* Footer */}
        <div style={{
          display: 'flex', justifyContent: 'flex-end', gap: 10,
          marginTop: 22, paddingTop: 18, borderTop: '1px solid rgba(61,63,52,0.1)',
        }}>
          <button onClick={onClose} style={{
            padding: '10px 22px', borderRadius: 12, border: '1px solid rgba(61,63,52,0.18)',
            background: '#fff', cursor: 'pointer', fontWeight: 600,
            fontSize: '0.88rem', fontFamily: 'inherit',
          }}>Cancel</button>
          <button onClick={handleSave} style={{
            padding: '10px 24px', borderRadius: 12, border: 'none',
            background: '#0b2b26', color: '#C49B4F', cursor: 'pointer',
            fontWeight: 700, fontSize: '0.88rem', fontFamily: 'inherit',
          }}>
            {invoice && invoice.id ? '💾 Save Changes' : '➕ Add Invoice'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────────
export default function ParkPlusTracker({ isAdmin = false }) {
  const [invoices,     setInvoices]     = useState(INITIAL_INVOICES);
  const [modalInv,     setModalInv]     = useState(null);
  const [isLoading,    setIsLoading]    = useState(false);
  const [saveStatus,   setSaveStatus]   = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [search,       setSearch]       = useState('');

  // ── Firebase sync ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isFirebaseConfigured || !db) return;
    setIsLoading(true);
    ensureFirebaseSession().then(() => {
      const unsub = onSnapshot(collection(db, 'parkPlusInvoices'),
        snap => {
          if (snap.empty) {
            INITIAL_INVOICES.forEach(inv => {
              const { id, ...data } = inv;
              setDoc(doc(db, 'parkPlusInvoices', id), { ...data, updatedAt: serverTimestamp() });
            });
            setInvoices(INITIAL_INVOICES);
          } else {
            const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            items.sort((a, b) => (a.invoiceDate > b.invoiceDate ? 1 : -1));
            setInvoices(items);
          }
          setIsLoading(false);
        },
        err => { console.error(err); setIsLoading(false); }
      );
      return unsub;
    });
  }, []);

  // ── Save / Delete ─────────────────────────────────────────────────────────────
  const saveInvoice = useCallback(async (form) => {
    const id = form.id || `PTI-${uid()}`;
    const { id: _id, ...data } = { ...form, id };
    setInvoices(prev => {
      const list = [...prev];
      const idx  = list.findIndex(i => i.id === id);
      if (idx >= 0) list[idx] = { id, ...data }; else list.push({ id, ...data });
      list.sort((a, b) => (a.invoiceDate > b.invoiceDate ? 1 : -1));
      return list;
    });
    setModalInv(null);
    if (isFirebaseConfigured && db) {
      try {
        await ensureFirebaseSession();
        await setDoc(doc(db, 'parkPlusInvoices', id), { ...data, updatedAt: serverTimestamp() }, { merge: true });
        setSaveStatus('✓ Saved');
      } catch { setSaveStatus('✗ Save failed'); }
    }
    setTimeout(() => setSaveStatus(''), 2500);
  }, []);

  const deleteInvoice = useCallback(async (id) => {
    if (!window.confirm('Delete this invoice permanently?')) return;
    setInvoices(prev => prev.filter(i => i.id !== id));
    if (isFirebaseConfigured && db) {
      await ensureFirebaseSession();
      await deleteDoc(doc(db, 'parkPlusInvoices', id)).catch(console.error);
    }
  }, []);

  const quickStatus = useCallback((id, status) => {
    const inv = invoices.find(i => i.id === id);
    if (inv) saveInvoice({ ...inv, paymentStatus: status });
  }, [invoices, saveInvoice]);

  // ── Stats ─────────────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const totalGrand  = invoices.reduce((s, i) => s + (i.grandTotal || 0), 0);
    const totalPaid   = invoices.filter(i => i.paymentStatus === 'Paid').reduce((s, i) => s + (i.grandTotal || 0), 0);
    const totalUnpaid = invoices.filter(i => i.paymentStatus !== 'Paid').reduce((s, i) => s + (i.grandTotal || 0), 0);
    const overdueCount = invoices.filter(i => {
      const d = calcDaysLeft(i.dueDate, i.paymentStatus);
      return d !== null && d < 0;
    }).length;
    return { totalGrand, totalPaid, totalUnpaid, overdueCount, count: invoices.length };
  }, [invoices]);

  // ── Filter ────────────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return invoices.filter(inv => {
      if (filterStatus !== 'All' && inv.paymentStatus !== filterStatus) return false;
      if (!q) return true;
      return [inv.id, inv.description, inv.period, inv.remarks].join(' ').toLowerCase().includes(q);
    });
  }, [invoices, filterStatus, search]);

  // ─── Render ──────────────────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

      {/* ── Banner ── */}
      <div style={{
        background: 'linear-gradient(135deg, #0b2b26 0%, #196c6c 100%)',
        borderRadius: 20, padding: '20px 24px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        flexWrap: 'wrap', gap: 16, boxShadow: '0 6px 28px rgba(11,43,38,0.18)',
      }}>
        <div>
          <p style={{ margin: '0 0 2px', fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#C49B4F' }}>
            Vendor · Park+
          </p>
          <h2 style={{ margin: '0 0 2px', fontSize: '1.35rem', fontWeight: 800, color: '#fff' }}>
            🅿️ Park+ Payment Tracker
          </h2>
          <p style={{ margin: 0, color: 'rgba(255,255,255,0.55)', fontSize: '0.82rem' }}>
            RFID & Automated Gate Solution — Majestique Euriska
          </p>
        </div>

        {/* Summary tiles */}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          {[
            { label: 'Invoices',  value: stats.count,                         bg: 'rgba(255,255,255,0.1)',  color: '#fff'    },
            { label: 'Total',     value: `\u20b9${formatINR(stats.totalGrand)}`,  bg: 'rgba(255,255,255,0.08)', color: '#e0f2fe' },
            { label: 'Paid',      value: `\u20b9${formatINR(stats.totalPaid)}`,   bg: 'rgba(110,231,183,0.2)',  color: '#6ee7b7' },
            { label: 'Pending',   value: `\u20b9${formatINR(stats.totalUnpaid)}`, bg: 'rgba(253,224,71,0.18)', color: '#fde047' },
            { label: 'Overdue',   value: stats.overdueCount,                   bg: 'rgba(252,165,165,0.2)',  color: '#fca5a5' },
          ].map(s => (
            <div key={s.label} style={{ textAlign: 'center', background: s.bg, borderRadius: 10, padding: '8px 14px', minWidth: 60 }}>
              <div style={{ fontSize: '1rem', fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.value}</div>
              <div style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.55)', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Table Card ── */}
      <div style={{ background: 'rgba(255,250,242,0.95)', border: '1px solid rgba(61,63,52,0.1)', borderRadius: 20, boxShadow: '0 4px 24px rgba(11,43,38,0.06)', overflow: 'hidden' }}>

        {/* ── Toolbar ── */}
        <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(61,63,52,0.08)', display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>

          {/* Search */}
          <div style={{ position: 'relative', flex: '1 1 200px', minWidth: 160 }}>
            <span style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', opacity: 0.4, fontSize: '0.9rem', pointerEvents: 'none' }}>🔍</span>
            <input type="search" placeholder="Search invoices..." value={search}
              onChange={e => setSearch(e.target.value)} style={{
                width: '100%', paddingLeft: 32, paddingRight: 12,
                paddingTop: 7, paddingBottom: 7,
                borderRadius: 10, border: '1.5px solid rgba(61,63,52,0.15)',
                background: '#fffefb', fontSize: '0.85rem',
                fontFamily: 'inherit', color: '#1d2a24', outline: 'none', boxSizing: 'border-box',
              }} />
          </div>

          {/* Status filter chips */}
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
            {['All', ...PAYMENT_STATUS].map(s => {
              const st = STATUS_STYLE[s];
              const active = filterStatus === s;
              return (
                <button key={s} onClick={() => setFilterStatus(s)} style={{
                  padding: '5px 12px', borderRadius: 20, border: '1.5px solid',
                  fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                  background: active ? (st ? st.bg : '#0b2b26') : 'transparent',
                  color:      active ? (st ? st.color : '#fff') : '#5f665f',
                  borderColor:active ? (st ? st.border : '#0b2b26') : 'rgba(61,63,52,0.15)',
                  transition: 'all 0.15s',
                }}>{s}</button>
              );
            })}
          </div>

          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
            {saveStatus && (
              <span style={{ fontSize: '0.8rem', color: saveStatus.includes('✓') ? '#065f46' : '#991b1b', fontWeight: 700 }}>
                {saveStatus}
              </span>
            )}
            {isAdmin && (
              <button onClick={() => setModalInv({})} style={{
                padding: '7px 15px', borderRadius: 10, border: 'none',
                background: '#0b2b26', color: '#C49B4F',
                fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'inherit',
              }}>➕ Add Invoice</button>
            )}
          </div>
        </div>

        {/* ── Table ── */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 900 }}>
            <thead>
              <tr style={{ background: 'rgba(244,239,231,0.95)' }}>
                {[
                  { label: '#',            w: 40  },
                  { label: 'Invoice ID',   w: 170 },
                  { label: 'Invoice Date', w: 110 },
                  { label: 'Due Date',     w: 110 },
                  { label: 'Description',  w: 220 },
                  { label: 'Period',       w: 180 },
                  { label: 'Subtotal',     w: 110 },
                  { label: 'IGST',         w: 90  },
                  { label: 'Grand Total',  w: 120 },
                  { label: 'Status',       w: 120 },
                  { label: 'Due In',       w: 100 },
                  { label: 'Remarks',      w: 240 },
                  ...(isAdmin ? [{ label: 'Actions', w: 90 }] : []),
                ].map(col => (
                  <th key={col.label} style={{
                    padding: '10px 12px', textAlign: 'left', whiteSpace: 'nowrap',
                    fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase',
                    letterSpacing: '0.07em', color: '#5f665f',
                    borderBottom: '2px solid rgba(61,63,52,0.1)', minWidth: col.w,
                  }}>{col.label}</th>
                ))}
              </tr>
            </thead>

            <tbody>
              {isLoading ? (
                <tr><td colSpan={12} style={{ textAlign: 'center', padding: '60px 20px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, color: '#5f665f', opacity: 0.7 }}>
                    <div style={{ fontSize: '2rem' }}>⏳</div>
                    <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>Loading invoices...</span>
                  </div>
                </td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={12} style={{ textAlign: 'center', padding: '60px 20px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, color: '#5f665f', opacity: 0.6 }}>
                    <div style={{ fontSize: '2.5rem' }}>📭</div>
                    <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>No invoices match your filters</span>
                  </div>
                </td></tr>
              ) : (
                filtered.map((inv, idx) => {
                  const daysLeft  = calcDaysLeft(inv.dueDate, inv.paymentStatus);
                  const isPaid    = inv.paymentStatus === 'Paid';
                  const isOverdue = daysLeft !== null && daysLeft < 0;
                  const rowBg     = isPaid ? 'rgba(209,250,229,0.2)' : isOverdue ? 'rgba(254,226,226,0.25)' : 'transparent';

                  return (
                    <tr key={inv.id}
                      style={{ borderBottom: '1px solid rgba(61,63,52,0.06)', background: rowBg, transition: 'background 0.12s' }}
                      onMouseEnter={e => { if (!isPaid && !isOverdue) e.currentTarget.style.background = 'rgba(244,239,231,0.55)'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = rowBg; }}>

                      <td style={{ padding: '10px 12px', fontSize: '0.73rem', color: '#c4b99a', fontWeight: 700 }}>
                        {idx + 1}
                      </td>

                      <td style={{ padding: '10px 12px' }}>
                        <strong style={{ fontSize: '0.78rem', display: 'block', color: '#196c6c', fontFamily: 'monospace', letterSpacing: '0.04em' }}>
                          {inv.id}
                        </strong>
                        {inv.hsn && (
                          <span style={{ fontSize: '0.65rem', color: '#c4b99a', display: 'block', marginTop: 1 }}>HSN: {inv.hsn}</span>
                        )}
                      </td>

                      <td style={{ padding: '10px 12px', fontSize: '0.8rem', color: '#5f665f', whiteSpace: 'nowrap' }}>
                        {fmtDate(inv.invoiceDate)}
                      </td>

                      <td style={{ padding: '10px 12px', fontSize: '0.8rem', whiteSpace: 'nowrap', fontWeight: isOverdue ? 700 : 400, color: isOverdue ? '#991b1b' : '#5f665f' }}>
                        {fmtDate(inv.dueDate)}
                      </td>

                      <td style={{ padding: '10px 12px', maxWidth: 220 }}>
                        <span style={{ fontSize: '0.82rem', color: '#1d2a24', fontWeight: 600, lineHeight: 1.4, display: 'block' }}>
                          {inv.description || '—'}
                        </span>
                      </td>

                      <td style={{ padding: '10px 12px', fontSize: '0.75rem', color: '#5f665f' }}>
                        {inv.period || <span style={{ color: '#c4b99a' }}>—</span>}
                      </td>

                      <td style={{ padding: '10px 12px', fontSize: '0.82rem', color: '#1d2a24', fontWeight: 600, whiteSpace: 'nowrap', textAlign: 'right' }}>
                        {'\u20b9'}{formatINR(inv.unitPrice)}
                      </td>

                      <td style={{ padding: '10px 12px', fontSize: '0.78rem', color: '#5f665f', whiteSpace: 'nowrap', textAlign: 'right' }}>
                        {'\u20b9'}{formatINR(inv.igstAmt)}
                      </td>

                      <td style={{ padding: '10px 12px', whiteSpace: 'nowrap', textAlign: 'right' }}>
                        <span style={{ fontSize: '0.88rem', fontWeight: 800, color: '#0b2b26' }}>
                          {'\u20b9'}{formatINR(inv.grandTotal)}
                        </span>
                      </td>

                      <td style={{ padding: '10px 12px' }}>
                        {isAdmin ? (
                          <select value={inv.paymentStatus || ''} onChange={e => quickStatus(inv.id, e.target.value)} style={{
                            padding: '3px 8px', borderRadius: 8, border: '1.5px solid',
                            borderColor: STATUS_STYLE[inv.paymentStatus] ? STATUS_STYLE[inv.paymentStatus].border : 'rgba(61,63,52,0.15)',
                            background:  STATUS_STYLE[inv.paymentStatus] ? STATUS_STYLE[inv.paymentStatus].bg    : '#fff',
                            color:       STATUS_STYLE[inv.paymentStatus] ? STATUS_STYLE[inv.paymentStatus].color : '#1d2a24',
                            fontWeight: 600, fontSize: '0.73rem', cursor: 'pointer', fontFamily: 'inherit',
                          }}>
                            {PAYMENT_STATUS.map(o => <option key={o} value={o}>{o}</option>)}
                          </select>
                        ) : (
                          <StatusPill status={inv.paymentStatus} />
                        )}
                      </td>

                      <td style={{ padding: '10px 12px' }}>
                        <DaysChip days={daysLeft} />
                      </td>

                      <td style={{ padding: '10px 12px', maxWidth: 260 }}>
                        {inv.remarks
                          ? <span style={{
                              fontSize: '0.75rem', color: inv.remarks.startsWith('⚠') ? '#92400e' : '#5f665f',
                              lineHeight: 1.5, display: 'block',
                              background: inv.remarks.startsWith('⚠') ? 'rgba(253,224,71,0.18)' : 'transparent',
                              borderLeft: inv.remarks.startsWith('⚠') ? '3px solid #fcd34d' : 'none',
                              padding: inv.remarks.startsWith('⚠') ? '4px 8px' : '0',
                              borderRadius: inv.remarks.startsWith('⚠') ? '0 6px 6px 0' : '0',
                            }}>{inv.remarks}</span>
                          : <span style={{ color: '#c4b99a', fontSize: '0.75rem' }}>—</span>
                        }
                      </td>

                      {isAdmin && (
                        <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>
                          <div style={{ display: 'flex', gap: 5 }}>
                            <button onClick={() => setModalInv(inv)} title="Edit" style={{
                              padding: '3px 8px', borderRadius: 7,
                              border: '1px solid rgba(61,63,52,0.15)',
                              background: '#fff', cursor: 'pointer', fontSize: '0.75rem',
                            }}>✏️</button>
                            <button onClick={() => deleteInvoice(inv.id)} title="Delete" style={{
                              padding: '3px 8px', borderRadius: 7,
                              border: '1px solid rgba(220,38,38,0.2)',
                              background: '#fff0f0', color: '#dc2626',
                              cursor: 'pointer', fontSize: '0.75rem',
                            }}>🗑️</button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* ── Footer totals ── */}
        <div style={{
          padding: '14px 16px', borderTop: '2px solid rgba(61,63,52,0.1)',
          display: 'flex', justifyContent: 'flex-end', gap: 24, flexWrap: 'wrap',
          background: 'rgba(244,239,231,0.55)',
        }}>
          {[
            { label: `${filtered.length} invoice${filtered.length !== 1 ? 's' : ''} shown`, value: null },
            { label: 'Subtotal', value: `\u20b9${formatINR(filtered.reduce((s, i) => s + (i.unitPrice || 0), 0))}` },
            { label: 'IGST', value: `\u20b9${formatINR(filtered.reduce((s, i) => s + (i.igstAmt || 0), 0))}` },
            { label: 'Grand Total', value: `\u20b9${formatINR(filtered.reduce((s, i) => s + (i.grandTotal || 0), 0))}`, bold: true },
          ].map(({ label, value, bold }) => (
            <div key={label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
              <span style={{ fontSize: '0.68rem', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>{label}</span>
              {value && <span style={{ fontSize: bold ? '1rem' : '0.88rem', fontWeight: bold ? 800 : 700, color: bold ? '#0b2b26' : '#196c6c', marginTop: 1 }}>{value}</span>}
            </div>
          ))}
        </div>
      </div>

      {/* ── Modal ── */}
      {modalInv !== null && (
        <InvoiceModal
          invoice={modalInv && modalInv.id ? modalInv : null}
          onSave={saveInvoice}
          onClose={() => setModalInv(null)}
        />
      )}
    </div>
  );
}
