import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  collection, doc, onSnapshot, setDoc, deleteDoc, serverTimestamp
} from 'firebase/firestore';
import { db, ensureFirebaseSession, isFirebaseConfigured } from '../../firebase.js';
import LiquidGlassCard from '../liquid-glass/LiquidGlassCard.jsx';

// ─── Constants ──────────────────────────────────────────────────────────────────
const PAYMENT_STATUS = ['Unpaid', 'Paid', 'Partial', 'Overdue'];

const STATUS_STYLE = {
  Paid: {
    bg: 'rgba(16, 185, 129, 0.15)',
    color: '#065f46',
    border: 'rgba(16, 185, 129, 0.4)',
    glow: 'rgba(16, 185, 129, 0.25)',
    icon: '✓'
  },
  Unpaid: {
    bg: 'rgba(245, 158, 11, 0.16)',
    color: '#92400e',
    border: 'rgba(245, 158, 11, 0.45)',
    glow: 'rgba(245, 158, 11, 0.25)',
    icon: '⏳'
  },
  Partial: {
    bg: 'rgba(14, 165, 233, 0.16)',
    color: '#0369a1',
    border: 'rgba(14, 165, 233, 0.4)',
    glow: 'rgba(14, 165, 233, 0.2)',
    icon: '◐'
  },
  Overdue: {
    bg: 'rgba(239, 68, 68, 0.16)',
    color: '#991b1b',
    border: 'rgba(239, 68, 68, 0.45)',
    glow: 'rgba(239, 68, 68, 0.25)',
    icon: '⚠'
  },
};

// ─── Seed data from verified invoices ───────────────────────────────────────────
const INITIAL_INVOICES = [
  {
    id: 'PTI-202526-MAY',
    invoiceDate: '2025-05-01',
    dueDate: '2025-05-16',
    description: 'Automated Gate and Security Solution',
    hsn: '997319',
    qty: 3,
    uom: 'NOS',
    unitPrice: 18750.0,
    igstRate: 18,
    igstAmt: 3375.0,
    grandTotal: 22125.0,
    paymentStatus: 'Paid',
    paidDate: '2025-05-12',
    remarks: '₹6,250 × 3 months quarterly retainer',
    period: '01-05-2025 to 31-07-2025',
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
    paidDate: '2025-06-10',
    remarks: 'Initial RFID sensor & boom barrier hardware setup',
    period: 'Installation & Onboarding',
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
    paidDate: '2025-09-11',
    remarks: 'Adjusted billing cycle for gate automation',
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
    paidDate: '2025-10-14',
    remarks: 'Q2 automated gate and maintenance service',
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
    paidDate: '2026-01-12',
    remarks: 'Q3 automated gate software subscription',
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
    grandTotal: 23231.25,
    paymentStatus: 'Paid',
    paidDate: '2026-04-10',
    remarks: 'Annual renewal rate revision (+5% indexation)',
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
    remarks: 'Current quarter invoice awaiting committee clearance',
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

// ─── Glass Sub-components ────────────────────────────────────────────────────────
function StatusPill({ status }) {
  const s = STATUS_STYLE[status];
  if (!s) return <span style={{ color: '#94a3b8', fontSize: '0.78rem' }}>—</span>;
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 5,
      fontSize: '0.72rem',
      fontWeight: 800,
      letterSpacing: '0.04em',
      padding: '4px 10px',
      borderRadius: 20,
      whiteSpace: 'nowrap',
      background: s.bg,
      color: s.color,
      border: `1px solid ${s.border}`,
      boxShadow: `0 2px 8px ${s.glow}`,
      backdropFilter: 'blur(8px)',
      WebkitBackdropFilter: 'blur(8px)'
    }}>
      <span>{s.icon}</span>
      <span>{status}</span>
    </span>
  );
}

function DaysChip({ days }) {
  if (days === null) return <span style={{ color: '#94a3b8', fontSize: '0.78rem' }}>—</span>;
  const isOverdue = days < 0;
  const isWarning = days >= 0 && days <= 5;
  const color = isOverdue ? '#991b1b' : isWarning ? '#92400e' : '#065f46';
  const bg    = isOverdue ? 'rgba(254, 226, 226, 0.75)' : isWarning ? 'rgba(254, 243, 199, 0.75)' : 'rgba(209, 250, 229, 0.75)';
  const border = isOverdue ? 'rgba(239, 68, 68, 0.35)' : isWarning ? 'rgba(245, 158, 11, 0.35)' : 'rgba(16, 185, 129, 0.35)';
  const label = isOverdue ? `${Math.abs(days)}d overdue` : days === 0 ? 'Due today!' : `${days}d left`;
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 4,
      fontSize: '0.72rem',
      fontWeight: 800,
      padding: '3px 10px',
      borderRadius: 20,
      background: bg,
      color,
      border: `1px solid ${border}`,
      backdropFilter: 'blur(8px)',
      WebkitBackdropFilter: 'blur(8px)',
      whiteSpace: 'nowrap'
    }}>
      {isOverdue && <span>⚠</span>}
      {label}
    </span>
  );
}

// ─── Glass Modal Form ────────────────────────────────────────────────────────────
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

  const inputStyle = {
    width: '100%',
    padding: '9px 13px',
    borderRadius: 12,
    border: '1px solid rgba(255, 255, 255, 0.7)',
    background: 'rgba(255, 255, 255, 0.85)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    color: '#0f172a',
    fontSize: '0.88rem',
    fontFamily: 'inherit',
    outline: 'none',
    boxSizing: 'border-box',
    boxShadow: '0 2px 6px rgba(15, 23, 42, 0.04)',
    transition: 'all 0.15s ease'
  };

  const labelStyle = {
    fontSize: '0.72rem',
    fontWeight: 800,
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    color: '#475569',
    display: 'block',
    marginBottom: 5,
  };

  const handleSave = () => {
    if (!form.invoiceDate || !form.dueDate || !form.description || !form.unitPrice) return;
    onSave({ ...form, igstAmt: +igstAmt.toFixed(2), grandTotal: +Math.round(grandTotal) });
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 9999,
      background: 'rgba(15, 23, 42, 0.55)',
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 16,
    }} onClick={onClose}>
      <div style={{
        background: 'linear-gradient(145deg, rgba(255, 255, 255, 0.96) 0%, rgba(240, 246, 255, 0.94) 100%)',
        backdropFilter: 'blur(25px)',
        WebkitBackdropFilter: 'blur(25px)',
        border: '1px solid rgba(255, 255, 255, 0.85)',
        borderRadius: 24,
        padding: '28px 32px 24px',
        width: '100%',
        maxWidth: 700,
        maxHeight: '92vh',
        overflowY: 'auto',
        boxShadow: '0 30px 80px rgba(15, 23, 42, 0.25), 0 0 0 1px rgba(255, 255, 255, 0.9)',
      }} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
          <div>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              background: 'rgba(2, 132, 199, 0.1)',
              border: '1px solid rgba(2, 132, 199, 0.25)',
              padding: '3px 10px',
              borderRadius: 20,
              fontSize: '0.70rem',
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              color: '#0284c7'
            }}>
              <span>🅿️</span>
              <span>Park+ Vendor Management</span>
            </div>
            <h3 style={{ margin: '6px 0 0', fontSize: '1.28rem', fontWeight: 800, color: '#0f172a' }}>
              {invoice && invoice.id ? '✏️ Edit Invoice Entry' : '➕ Add New Park+ Invoice'}
            </h3>
          </div>
          <button onClick={onClose} style={{
            background: 'rgba(15, 23, 42, 0.06)',
            border: 'none',
            borderRadius: 10,
            width: 36,
            height: 36,
            cursor: 'pointer',
            fontSize: '1rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#64748b'
          }}>✕</button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px 18px' }}>

          {/* Full-width: Description */}
          <label style={{ gridColumn: '1/-1' }}>
            <span style={labelStyle}>Description *</span>
            <input style={inputStyle} value={form.description} onChange={e => set('description', e.target.value)}
              placeholder="e.g. Automated Gate and Security Solution" />
          </label>

          {/* Period */}
          <label style={{ gridColumn: '1/-1' }}>
            <span style={labelStyle}>Service Period</span>
            <input style={inputStyle} value={form.period} onChange={e => set('period', e.target.value)}
              placeholder="e.g. 01-07-2026 to 30-09-2026" />
          </label>

          {/* Invoice Date */}
          <label>
            <span style={labelStyle}>Invoice Date *</span>
            <input type="date" style={inputStyle} value={form.invoiceDate} onChange={e => set('invoiceDate', e.target.value)} />
          </label>

          {/* Due Date */}
          <label>
            <span style={labelStyle}>Due Date *</span>
            <input type="date" style={inputStyle} value={form.dueDate} onChange={e => set('dueDate', e.target.value)} />
          </label>

          {/* HSN/SAC */}
          <label>
            <span style={labelStyle}>HSN/SAC Code</span>
            <input style={inputStyle} value={form.hsn} onChange={e => set('hsn', e.target.value)} placeholder="997319" />
          </label>

          {/* UOM */}
          <label>
            <span style={labelStyle}>UOM</span>
            <input style={inputStyle} value={form.uom} onChange={e => set('uom', e.target.value)} placeholder="NOS" />
          </label>

          {/* Unit Price */}
          <label>
            <span style={labelStyle}>Unit Price (INR) *</span>
            <input type="number" style={inputStyle} value={form.unitPrice} onChange={e => set('unitPrice', e.target.value)}
              placeholder="18750.00" step="0.01" />
          </label>

          {/* IGST Rate */}
          <label>
            <span style={labelStyle}>IGST Rate (%)</span>
            <select style={inputStyle} value={form.igstRate} onChange={e => set('igstRate', Number(e.target.value))}>
              {[5, 12, 18, 28].map(r => <option key={r} value={r}>{r}%</option>)}
            </select>
          </label>

          {/* Glass Calculation Preview */}
          <div style={{
            gridColumn: '1/-1',
            background: 'linear-gradient(135deg, rgba(2, 132, 199, 0.08) 0%, rgba(16, 185, 129, 0.08) 100%)',
            border: '1px solid rgba(2, 132, 199, 0.2)',
            borderRadius: 16,
            padding: '14px 20px',
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 12,
            backdropFilter: 'blur(10px)',
          }}>
            {[
              { label: 'Subtotal', val: `₹${formatINR(form.unitPrice || 0)}` },
              { label: `IGST (${form.igstRate}%)`, val: `₹${formatINR(igstAmt)}` },
              { label: 'Grand Total', val: `₹${formatINR(grandTotal)}`, bold: true },
            ].map(({ label, val, bold }) => (
              <div key={label} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>{label}</div>
                <div style={{ fontSize: bold ? '1.12rem' : '0.96rem', fontWeight: bold ? 900 : 700, color: bold ? '#0f2952' : '#0284c7' }}>{val}</div>
              </div>
            ))}
          </div>

          {/* Payment Status */}
          <label style={{ gridColumn: '1/-1' }}>
            <span style={labelStyle}>Payment Status</span>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {PAYMENT_STATUS.map(s => {
                const st = STATUS_STYLE[s];
                const active = form.paymentStatus === s;
                return (
                  <button key={s} type="button" onClick={() => set('paymentStatus', s)} style={{
                    padding: '6px 16px',
                    borderRadius: 20,
                    cursor: 'pointer',
                    fontSize: '0.82rem',
                    fontWeight: 800,
                    fontFamily: 'inherit',
                    border: `1.5px solid ${active ? st.border : 'rgba(203, 213, 225, 0.8)'}`,
                    background: active ? st.bg : '#ffffff',
                    color: active ? st.color : '#64748b',
                    boxShadow: active ? `0 2px 8px ${st.glow}` : 'none',
                    transition: 'all 0.15s ease',
                  }}>{s}</button>
                );
              })}
            </div>
          </label>

          {/* Paid Date */}
          {form.paymentStatus === 'Paid' && (
            <label>
              <span style={labelStyle}>Paid On</span>
              <input type="date" style={inputStyle} value={form.paidDate} onChange={e => set('paidDate', e.target.value)} />
            </label>
          )}

          {/* Remarks */}
          <label style={{ gridColumn: '1/-1' }}>
            <span style={labelStyle}>Remarks</span>
            <textarea rows={2} style={{ ...inputStyle, resize: 'vertical' }}
              value={form.remarks} onChange={e => set('remarks', e.target.value)}
              placeholder="Any payment reference, cheque number, or transaction notes..." />
          </label>

        </div>

        {/* Footer */}
        <div style={{
          display: 'flex',
          justifyContent: 'flex-end',
          gap: 10,
          marginTop: 24,
          paddingTop: 18,
          borderTop: '1px solid rgba(226, 232, 240, 0.8)',
        }}>
          <button onClick={onClose} style={{
            padding: '9px 20px',
            borderRadius: 12,
            border: '1px solid #cbd5e1',
            background: '#ffffff',
            cursor: 'pointer',
            fontWeight: 700,
            fontSize: '0.86rem',
            fontFamily: 'inherit',
            color: '#475569'
          }}>Cancel</button>
          <button onClick={handleSave} style={{
            padding: '9px 24px',
            borderRadius: 12,
            border: 'none',
            background: 'linear-gradient(135deg, #0f2952 0%, #0284c7 100%)',
            color: '#ffffff',
            cursor: 'pointer',
            fontWeight: 800,
            fontSize: '0.86rem',
            fontFamily: 'inherit',
            boxShadow: '0 4px 14px rgba(2, 132, 199, 0.3)'
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
    const paidPct = totalGrand > 0 ? Math.round((totalPaid / totalGrand) * 100) : 0;
    return { totalGrand, totalPaid, totalUnpaid, overdueCount, count: invoices.length, paidPct };
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

  // ── Export CSV ────────────────────────────────────────────────────────────────
  const handleExportCSV = useCallback(() => {
    const listToExport = filtered.length > 0 ? filtered : invoices;
    const headers = 'Invoice ID,Invoice Date,Due Date,Description,Period,HSN,Qty,UOM,Unit Price,IGST Rate,IGST Amount,Grand Total,Payment Status,Paid Date,Remarks\n';
    const rows = listToExport.map(i => {
      const desc = (i.description || '').replace(/"/g, '""');
      const period = (i.period || '').replace(/"/g, '""');
      const remarks = (i.remarks || '').replace(/"/g, '""');
      return `"${i.id}","${i.invoiceDate}","${i.dueDate}","${desc}","${period}","${i.hsn || ''}",${i.qty || 1},"${i.uom || 'NOS'}",${i.unitPrice || 0},${i.igstRate || 18},${i.igstAmt || 0},${i.grandTotal || 0},"${i.paymentStatus}","${i.paidDate || ''}","${remarks}"`;
    }).join('\n');

    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', 'Majestique_Euriska_ParkPlus_Invoices.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [filtered, invoices]);

  // ── Export Dedicated Print PDF ───────────────────────────────────────────────
  const handleExportPDF = useCallback(() => {
    const listToPrint = filtered.length > 0 ? filtered : invoices;
    const generatedDate = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

    const totalSubtotal = listToPrint.reduce((s, i) => s + (Number(i.unitPrice) || 0), 0);
    const totalIGST = listToPrint.reduce((s, i) => s + (Number(i.igstAmt) || 0), 0);
    const totalGrand = listToPrint.reduce((s, i) => s + (Number(i.grandTotal) || 0), 0);

    const paidList = listToPrint.filter(i => i.paymentStatus === 'Paid');
    const unpaidList = listToPrint.filter(i => i.paymentStatus !== 'Paid');
    const totalPaid = paidList.reduce((s, i) => s + (Number(i.grandTotal) || 0), 0);
    const totalUnpaid = unpaidList.reduce((s, i) => s + (Number(i.grandTotal) || 0), 0);
    const overdueCount = listToPrint.filter(i => {
      const d = calcDaysLeft(i.dueDate, i.paymentStatus);
      return d !== null && d < 0;
    }).length;

    const printDoc = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="utf-8">
        <title>Majestique Euriska - Park+ Payment & Invoice Ledger</title>
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
          th { background: #f1f5f9; color: #1e293b; font-weight: 700; text-align: left; padding: 8px 10px; border: 1px solid #94a3b8; text-transform: uppercase; font-size: 10px; letter-spacing: 0.05em; }
          td { padding: 7px 10px; border: 1px solid #cbd5e1; color: #0f172a; }
          tr:nth-child(even) { background: #f8fafc; }
          tfoot tr { background: #f1f5f9; font-weight: 700; }
          tfoot td { border-top: 2px solid #0f172a; color: #0f172a; }
          
          .pill {
            display: inline-block;
            padding: 2px 8px;
            border-radius: 10px;
            font-size: 10px;
            font-weight: 700;
          }
          .pill-paid { background: #ecfdf5; color: #065f46; border: 1px solid #a7f3d0; }
          .pill-unpaid { background: #fefce8; color: #854d0e; border: 1px solid #fef08a; }
          .pill-partial { background: #eff6ff; color: #1e40af; border: 1px solid #bfdbfe; }
          .pill-overdue { background: #fef2f2; color: #991b1b; border: 1px solid #fecaca; }
          
          .footer {
            margin-top: 24px;
            border-top: 1px solid #cbd5e1;
            padding-top: 10px;
            font-size: 10px;
            color: #64748b;
            display: flex;
            justify-content: space-between;
          }
          
          @media print {
            body { padding: 0; }
            @page { margin: 1cm; size: A4 landscape; }
            thead { display: table-header-group; }
            tr { page-break-inside: avoid; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <h1 class="title">🅿️ MAJESTIQUE EURISKA 'A' BUILDING CO-OP HOUSING SOCIETY LTD.</h1>
            <div class="subtitle">Reg. No: PNA/PNA (4)/HSG/(TC)/21207/2019-20 • S. No. 2, Plot No C-1, Village Mohammed Wadi, Taluka Haveli, Pune - 411060</div>
            <div style="font-size: 11px; color: #64748b; margin-top: 2px;">RFID &amp; Automated Gate Solution — Vendor Invoices &amp; Payment Ledger</div>
          </div>
          <div class="meta">
            <div><strong>Report Date:</strong> ${generatedDate}</div>
            <div><strong>Filter Scope:</strong> ${filterStatus === 'All' ? 'All Statuses' : filterStatus}${search ? ` • Search: "${search}"` : ''} (${listToPrint.length} Invoices)</div>
          </div>
        </div>

        <div class="summary-bar">
          <div class="summary-item">Total Invoices: <strong>${listToPrint.length}</strong></div>
          <div>•</div>
          <div class="summary-item">Total Billed: <strong>₹${formatINR(totalGrand)}</strong></div>
          <div>•</div>
          <div class="summary-item" style="color: #065f46;">Paid: <strong>₹${formatINR(totalPaid)} (${paidList.length})</strong></div>
          <div>•</div>
          <div class="summary-item" style="color: #854d0e;">Pending: <strong>₹${formatINR(totalUnpaid)} (${unpaidList.length})</strong></div>
          ${overdueCount > 0 ? `<div>•</div><div class="summary-item" style="color: #991b1b;">Overdue: <strong>${overdueCount}</strong></div>` : ''}
        </div>

        <table>
          <thead>
            <tr>
              <th style="width: 35px; text-align: center;">#</th>
              <th style="width: 130px;">Invoice ID</th>
              <th style="width: 85px;">Date</th>
              <th style="width: 85px;">Due Date</th>
              <th>Description / Period</th>
              <th style="width: 90px; text-align: right;">Subtotal (₹)</th>
              <th style="width: 80px; text-align: right;">IGST (₹)</th>
              <th style="width: 100px; text-align: right;">Grand Total (₹)</th>
              <th style="width: 85px; text-align: center;">Status</th>
              <th style="width: 140px;">Remarks</th>
            </tr>
          </thead>
          <tbody>
            ${listToPrint.map((inv, index) => {
              const pillClass = inv.paymentStatus === 'Paid'
                ? 'pill-paid'
                : inv.paymentStatus === 'Partial'
                ? 'pill-partial'
                : inv.paymentStatus === 'Overdue'
                ? 'pill-overdue'
                : 'pill-unpaid';
              return `
                <tr>
                  <td style="text-align: center; color: #64748b; font-weight: 600;">${index + 1}</td>
                  <td style="font-weight: 700; font-family: monospace; color: #0f172a;">
                    ${inv.id || ''}
                    ${inv.hsn ? `<div style="font-size: 9px; color: #64748b; font-weight: normal;">HSN: ${inv.hsn}</div>` : ''}
                  </td>
                  <td>${fmtDate(inv.invoiceDate)}</td>
                  <td>${fmtDate(inv.dueDate)}</td>
                  <td>
                    <strong>${inv.description || '—'}</strong>
                    ${inv.period ? `<div style="font-size: 10px; color: #475569;">Period: ${inv.period}</div>` : ''}
                  </td>
                  <td style="text-align: right;">${formatINR(inv.unitPrice)}</td>
                  <td style="text-align: right;">${formatINR(inv.igstAmt)}</td>
                  <td style="text-align: right; font-weight: 700; color: #0b2b26;">${formatINR(inv.grandTotal)}</td>
                  <td style="text-align: center;"><span class="pill ${pillClass}">${inv.paymentStatus || 'Unpaid'}</span></td>
                  <td style="font-size: 10px; color: #475569;">${inv.remarks || (inv.paidDate ? `Paid on ${fmtDate(inv.paidDate)}` : '—')}</td>
                </tr>
              `;
            }).join('')}
          </tbody>
          <tfoot>
            <tr>
              <td colspan="5" style="text-align: right; text-transform: uppercase; font-size: 10px; letter-spacing: 0.05em;">Total (${listToPrint.length} items):</td>
              <td style="text-align: right;">${formatINR(totalSubtotal)}</td>
              <td style="text-align: right;">${formatINR(totalIGST)}</td>
              <td style="text-align: right; font-size: 12px; color: #0b2b26;">₹${formatINR(totalGrand)}</td>
              <td colspan="2"></td>
            </tr>
          </tfoot>
        </table>

        <div class="footer">
          <div>Majestique Euriska Co-Op Housing Society • Park+ Vendor Financial Ledger</div>
          <div>Confidential Document</div>
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
    } else {
      window.print();
    }
  }, [filtered, invoices, filterStatus, search]);

  // ─── Render ──────────────────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* ── Liquid Glass Hero Banner ── */}
      <LiquidGlassCard
        variant="operations"
        style={{
          background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.94) 0%, rgba(14, 43, 60, 0.92) 50%, rgba(3, 105, 161, 0.90) 100%)',
          backdropFilter: 'blur(24px) saturate(180%)',
          WebkitBackdropFilter: 'blur(24px) saturate(180%)',
          border: '1px solid rgba(255, 255, 255, 0.25)',
          borderRadius: 24,
          padding: '24px 28px',
          boxShadow: '0 20px 50px rgba(15, 23, 42, 0.22), inset 0 1px 0 rgba(255, 255, 255, 0.35)',
          color: '#ffffff'
        }}
      >
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 20,
          position: 'relative',
          zIndex: 2
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
              <span style={{
                background: 'rgba(2, 132, 199, 0.35)',
                border: '1px solid rgba(56, 189, 248, 0.5)',
                color: '#7dd3fc',
                fontSize: '0.68rem',
                fontWeight: 800,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                padding: '3px 10px',
                borderRadius: 20,
                backdropFilter: 'blur(8px)'
              }}>
                Vendor · Park+ (Park Mate)
              </span>
              <span style={{
                background: 'rgba(16, 185, 129, 0.25)',
                border: '1px solid rgba(52, 211, 153, 0.4)',
                color: '#a7f3d0',
                fontSize: '0.68rem',
                fontWeight: 800,
                padding: '3px 10px',
                borderRadius: 20
              }}>
                Active Contract
              </span>
            </div>

            <h2 style={{
              margin: '0 0 4px',
              fontSize: 'clamp(1.4rem, 2.5vw, 1.85rem)',
              fontWeight: 800,
              color: '#ffffff',
              letterSpacing: '-0.02em',
              display: 'flex',
              alignItems: 'center',
              gap: 10
            }}>
              <span>🅿️</span>
              <span>Park+ Payment Tracker</span>
            </h2>

            <p style={{
              margin: 0,
              color: 'rgba(255, 255, 255, 0.75)',
              fontSize: '0.86rem',
              lineHeight: 1.45
            }}>
              RFID & Automated Gate Solution — Majestique Euriska 'A' Building CHS Ltd.
            </p>
          </div>

          {/* Quick Glass Stat Badges inside Hero */}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            {[
              { label: 'Invoices', value: stats.count, bg: 'rgba(255, 255, 255, 0.12)', color: '#ffffff' },
              { label: 'Total Billed', value: `₹${formatINR(stats.totalGrand)}`, bg: 'rgba(56, 189, 248, 0.16)', color: '#bae6fd' },
              { label: 'Paid', value: `₹${formatINR(stats.totalPaid)}`, bg: 'rgba(16, 185, 129, 0.22)', color: '#6ee7b7' },
              { label: 'Pending', value: `₹${formatINR(stats.totalUnpaid)}`, bg: 'rgba(245, 158, 11, 0.22)', color: '#fde047' },
              { label: 'Overdue', value: stats.overdueCount, bg: stats.overdueCount > 0 ? 'rgba(239, 68, 68, 0.35)' : 'rgba(255, 255, 255, 0.08)', color: stats.overdueCount > 0 ? '#fca5a5' : 'rgba(255, 255, 255, 0.7)' },
            ].map(s => (
              <div key={s.label} style={{
                textAlign: 'center',
                background: s.bg,
                border: '1px solid rgba(255, 255, 255, 0.18)',
                borderRadius: 14,
                padding: '9px 16px',
                minWidth: 70,
                backdropFilter: 'blur(10px)',
                WebkitBackdropFilter: 'blur(10px)',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.12)'
              }}>
                <div style={{ fontSize: '1.05rem', fontWeight: 900, color: s.color, lineHeight: 1 }}>{s.value}</div>
                <div style={{ fontSize: '0.62rem', color: 'rgba(255, 255, 255, 0.7)', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 3 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Contract & Retainer Timeline Glass Strip */}
        <div style={{
          marginTop: 18,
          paddingTop: 16,
          borderTop: '1px solid rgba(255, 255, 255, 0.14)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12,
          fontSize: '0.78rem',
          color: 'rgba(255, 255, 255, 0.82)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
            <span><strong>Contract Scope:</strong> Boom Barrier RFID Hardware + Quarterly Gate Software Support</span>
            <span>•</span>
            <span><strong>Retainer Rate:</strong> ₹18,750 / Quarter (+ 18% IGST)</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: '0.72rem', color: '#93c5fd', fontWeight: 700 }}>Settlement Progress:</span>
            <div style={{ width: 110, height: 7, background: 'rgba(255, 255, 255, 0.2)', borderRadius: 999, overflow: 'hidden' }}>
              <div style={{ width: `${stats.paidPct}%`, height: '100%', background: '#10b981', borderRadius: 999 }} />
            </div>
            <span style={{ fontWeight: 800, color: '#34d399', fontSize: '0.75rem' }}>{stats.paidPct}%</span>
          </div>
        </div>
      </LiquidGlassCard>

      {/* ── Main Liquid Glass Table Card ── */}
      <LiquidGlassCard
        style={{
          background: 'linear-gradient(145deg, rgba(255, 255, 255, 0.88) 0%, rgba(240, 246, 255, 0.72) 100%)',
          backdropFilter: 'blur(20px) saturate(180%)',
          WebkitBackdropFilter: 'blur(20px) saturate(180%)',
          border: '1px solid rgba(255, 255, 255, 0.85)',
          borderRadius: 24,
          boxShadow: '0 20px 45px rgba(15, 23, 42, 0.06), inset 0 1px 0 rgba(255, 255, 255, 0.9)',
          overflow: 'hidden'
        }}
      >
        {/* ── Glass Toolbar ── */}
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid rgba(226, 232, 240, 0.8)',
          background: 'rgba(255, 255, 255, 0.6)',
          backdropFilter: 'blur(12px)',
          display: 'flex',
          flexWrap: 'wrap',
          gap: 12,
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          {/* Search Bar & Status Chips */}
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', flex: '1 1 320px' }}>
            <div style={{ position: 'relative', minWidth: 220, flex: '1 1 220px' }}>
              <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', opacity: 0.5, fontSize: '0.9rem', pointerEvents: 'none' }}>🔍</span>
              <input
                type="search"
                placeholder="Search invoices..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{
                  width: '100%',
                  paddingLeft: 34,
                  paddingRight: 12,
                  paddingTop: 8,
                  paddingBottom: 8,
                  borderRadius: 12,
                  border: '1.5px solid rgba(203, 213, 225, 0.8)',
                  background: 'rgba(255, 255, 255, 0.9)',
                  fontSize: '0.84rem',
                  fontFamily: 'inherit',
                  color: '#0f172a',
                  outline: 'none',
                  boxSizing: 'border-box',
                  boxShadow: 'inset 0 1px 3px rgba(15, 23, 42, 0.04)'
                }}
              />
            </div>

            {/* Status filter chips */}
            <div style={{
              display: 'inline-flex',
              background: 'rgba(241, 245, 249, 0.85)',
              padding: 3,
              borderRadius: 12,
              border: '1px solid #cbd5e1',
              flexWrap: 'wrap',
              gap: 2
            }}>
              {['All', ...PAYMENT_STATUS].map(s => {
                const st = STATUS_STYLE[s];
                const active = filterStatus === s;
                return (
                  <button
                    key={s}
                    onClick={() => setFilterStatus(s)}
                    style={{
                      padding: '5px 12px',
                      borderRadius: 9,
                      border: 'none',
                      fontSize: '0.74rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                      background: active ? (st ? st.bg : '#0f2952') : 'transparent',
                      color: active ? (st ? st.color : '#ffffff') : '#64748b',
                      boxShadow: active ? '0 1px 4px rgba(0, 0, 0, 0.1)' : 'none',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {s}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <button
              onClick={handleExportCSV}
              style={{
                padding: '7px 14px',
                borderRadius: 10,
                border: '1px solid #cbd5e1',
                background: '#ffffff',
                color: '#0f172a',
                fontWeight: 700,
                fontSize: '0.80rem',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                fontFamily: 'inherit',
                boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)',
                transition: 'all 0.15s ease'
              }}
              title="Export invoices to CSV"
            >
              <span>📥</span>
              <span>Export CSV</span>
            </button>

            <button
              onClick={handleExportPDF}
              style={{
                padding: '7px 14px',
                borderRadius: 10,
                border: '1px solid #cbd5e1',
                background: '#ffffff',
                color: '#0f172a',
                fontWeight: 700,
                fontSize: '0.80rem',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                fontFamily: 'inherit',
                boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)',
                transition: 'all 0.15s ease'
              }}
              title="Print or export as PDF"
            >
              <span>📄</span>
              <span>Print PDF</span>
            </button>

            {saveStatus && (
              <span style={{ fontSize: '0.80rem', color: saveStatus.includes('✓') ? '#065f46' : '#991b1b', fontWeight: 800 }}>
                {saveStatus}
              </span>
            )}

            {isAdmin && (
              <button
                onClick={() => setModalInv({})}
                style={{
                  padding: '7px 16px',
                  borderRadius: 10,
                  border: 'none',
                  background: 'linear-gradient(135deg, #0f2952 0%, #0284c7 100%)',
                  color: '#ffffff',
                  fontWeight: 800,
                  fontSize: '0.80rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  fontFamily: 'inherit',
                  boxShadow: '0 3px 10px rgba(2, 132, 199, 0.3)'
                }}
              >
                <span>➕</span>
                <span>Add Invoice</span>
              </button>
            )}
          </div>
        </div>

        {/* ── Liquid Glass Table ── */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 960 }}>
            <thead>
              <tr style={{
                background: 'linear-gradient(180deg, rgba(241, 245, 249, 0.9) 0%, rgba(226, 232, 240, 0.8) 100%)',
                borderBottom: '1.5px solid rgba(203, 213, 225, 0.9)'
              }}>
                {[
                  { label: '#',            w: 45,  align: 'center' },
                  { label: 'Invoice ID',   w: 160, align: 'left'   },
                  { label: 'Invoice Date', w: 105, align: 'left'   },
                  { label: 'Due Date',     w: 105, align: 'left'   },
                  { label: 'Description & Period', w: 230, align: 'left' },
                  { label: 'Subtotal',     w: 110, align: 'right'  },
                  { label: 'IGST (18%)',   w: 100, align: 'right'  },
                  { label: 'Grand Total',  w: 125, align: 'right'  },
                  { label: 'Payment Status', w: 120, align: 'center' },
                  { label: 'Due In',       w: 110, align: 'center' },
                  { label: 'Remarks',      w: 220, align: 'left'   },
                  ...(isAdmin ? [{ label: 'Actions', w: 90, align: 'center' }] : []),
                ].map(col => (
                  <th key={col.label} style={{
                    padding: '11px 12px',
                    textAlign: col.align || 'left',
                    whiteSpace: 'nowrap',
                    fontSize: '0.70rem',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    color: '#0f2952',
                    minWidth: col.w,
                  }}>{col.label}</th>
                ))}
              </tr>
            </thead>

            <tbody>
              {isLoading ? (
                <tr><td colSpan={12} style={{ textAlign: 'center', padding: '60px 20px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, color: '#64748b' }}>
                    <div style={{ fontSize: '2rem' }}>⏳</div>
                    <span style={{ fontSize: '0.9rem', fontWeight: 700 }}>Loading Park+ Invoices...</span>
                  </div>
                </td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={12} style={{ textAlign: 'center', padding: '60px 20px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, color: '#64748b' }}>
                    <div style={{ fontSize: '2.5rem' }}>📭</div>
                    <span style={{ fontSize: '0.9rem', fontWeight: 700 }}>No invoices match your filters</span>
                  </div>
                </td></tr>
              ) : (
                filtered.map((inv, idx) => {
                  const daysLeft  = calcDaysLeft(inv.dueDate, inv.paymentStatus);
                  const isPaid    = inv.paymentStatus === 'Paid';
                  const isOverdue = daysLeft !== null && daysLeft < 0;
                  const rowBg     = isPaid
                    ? 'rgba(240, 253, 244, 0.45)'
                    : isOverdue
                    ? 'rgba(254, 242, 242, 0.55)'
                    : 'transparent';

                  return (
                    <tr
                      key={inv.id}
                      style={{
                        borderBottom: '1px solid rgba(226, 232, 240, 0.7)',
                        background: rowBg,
                        transition: 'background 0.15s ease'
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.background = isPaid ? 'rgba(220, 252, 231, 0.65)' : 'rgba(241, 245, 249, 0.75)';
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.background = rowBg;
                      }}
                    >
                      {/* Sr. No */}
                      <td style={{ padding: '10px 12px', fontSize: '0.76rem', color: '#64748b', fontWeight: 700, textAlign: 'center' }}>
                        {idx + 1}
                      </td>

                      {/* Invoice ID & HSN */}
                      <td style={{ padding: '10px 12px' }}>
                        <div style={{
                          fontFamily: 'monospace',
                          fontWeight: 800,
                          fontSize: '0.84rem',
                          color: '#0f2952',
                          letterSpacing: '0.02em'
                        }}>
                          {inv.id}
                        </div>
                        {inv.hsn && (
                          <span style={{
                            fontSize: '0.66rem',
                            color: '#0284c7',
                            fontWeight: 600,
                            display: 'inline-block',
                            marginTop: 2
                          }}>
                            HSN: {inv.hsn}
                          </span>
                        )}
                      </td>

                      {/* Invoice Date */}
                      <td style={{ padding: '10px 12px', fontSize: '0.80rem', color: '#475569', whiteSpace: 'nowrap' }}>
                        {fmtDate(inv.invoiceDate)}
                      </td>

                      {/* Due Date */}
                      <td style={{
                        padding: '10px 12px',
                        fontSize: '0.80rem',
                        whiteSpace: 'nowrap',
                        fontWeight: isOverdue ? 800 : 500,
                        color: isOverdue ? '#b91c1c' : '#475569'
                      }}>
                        {fmtDate(inv.dueDate)}
                      </td>

                      {/* Description & Period */}
                      <td style={{ padding: '10px 12px', maxWidth: 240 }}>
                        <div style={{ fontSize: '0.84rem', color: '#0f172a', fontWeight: 700, lineHeight: 1.35 }}>
                          {inv.description || '—'}
                        </div>
                        {inv.period && (
                          <div style={{ fontSize: '0.72rem', color: '#0284c7', fontWeight: 600, marginTop: 2 }}>
                            Period: {inv.period}
                          </div>
                        )}
                      </td>

                      {/* Subtotal */}
                      <td style={{ padding: '10px 12px', fontSize: '0.84rem', color: '#334155', fontWeight: 600, whiteSpace: 'nowrap', textAlign: 'right', fontFamily: 'monospace' }}>
                        ₹{formatINR(inv.unitPrice)}
                      </td>

                      {/* IGST */}
                      <td style={{ padding: '10px 12px', fontSize: '0.80rem', color: '#64748b', whiteSpace: 'nowrap', textAlign: 'right', fontFamily: 'monospace' }}>
                        ₹{formatINR(inv.igstAmt)}
                      </td>

                      {/* Grand Total */}
                      <td style={{ padding: '10px 12px', whiteSpace: 'nowrap', textAlign: 'right' }}>
                        <span style={{ fontSize: '0.94rem', fontWeight: 900, color: '#0f2952', fontFamily: 'monospace' }}>
                          ₹{formatINR(inv.grandTotal)}
                        </span>
                      </td>

                      {/* Status */}
                      <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                        {isAdmin ? (
                          <select
                            value={inv.paymentStatus || ''}
                            onChange={e => quickStatus(inv.id, e.target.value)}
                            style={{
                              padding: '4px 10px',
                              borderRadius: 10,
                              border: `1.5px solid ${STATUS_STYLE[inv.paymentStatus]?.border || '#cbd5e1'}`,
                              background: STATUS_STYLE[inv.paymentStatus]?.bg || '#ffffff',
                              color: STATUS_STYLE[inv.paymentStatus]?.color || '#0f172a',
                              fontWeight: 800,
                              fontSize: '0.74rem',
                              cursor: 'pointer',
                              fontFamily: 'inherit',
                              outline: 'none'
                            }}
                          >
                            {PAYMENT_STATUS.map(o => <option key={o} value={o}>{o}</option>)}
                          </select>
                        ) : (
                          <StatusPill status={inv.paymentStatus} />
                        )}
                      </td>

                      {/* Due In */}
                      <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                        <DaysChip days={daysLeft} />
                      </td>

                      {/* Remarks */}
                      <td style={{ padding: '10px 12px', maxWidth: 240 }}>
                        {inv.remarks ? (
                          <span style={{
                            fontSize: '0.74rem',
                            color: inv.remarks.startsWith('⚠') ? '#92400e' : '#475569',
                            lineHeight: 1.4,
                            display: 'block'
                          }}>
                            {inv.remarks}
                          </span>
                        ) : (
                          <span style={{ color: '#94a3b8', fontSize: '0.75rem' }}>—</span>
                        )}
                      </td>

                      {/* Actions (Admin) */}
                      {isAdmin && (
                        <td style={{ padding: '10px 12px', whiteSpace: 'nowrap', textAlign: 'center' }}>
                          <div style={{ display: 'inline-flex', gap: 6 }}>
                            <button
                              onClick={() => setModalInv(inv)}
                              title="Edit invoice"
                              style={{
                                padding: '4px 9px',
                                borderRadius: 8,
                                border: '1px solid #cbd5e1',
                                background: '#ffffff',
                                cursor: 'pointer',
                                fontSize: '0.76rem'
                              }}
                            >
                              ✏️
                            </button>
                            <button
                              onClick={() => deleteInvoice(inv.id)}
                              title="Delete invoice"
                              style={{
                                padding: '4px 9px',
                                borderRadius: 8,
                                border: '1px solid rgba(239, 68, 68, 0.3)',
                                background: '#fee2e2',
                                color: '#991b1b',
                                cursor: 'pointer',
                                fontSize: '0.76rem'
                              }}
                            >
                              🗑️
                            </button>
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

        {/* ── Glass Footer Summary ── */}
        <div style={{
          padding: '14px 22px',
          borderTop: '1.5px solid rgba(226, 232, 240, 0.9)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 16,
          background: 'linear-gradient(180deg, rgba(248, 250, 252, 0.6) 0%, rgba(241, 245, 249, 0.8) 100%)',
          backdropFilter: 'blur(10px)'
        }}>
          <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>
            Showing <strong>{filtered.length}</strong> of <strong>{invoices.length}</strong> Park+ invoices
            {filterStatus !== 'All' ? ` (Filtered by: ${filterStatus})` : ''}
          </div>

          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'center' }}>
            {[
              { label: 'Subtotal', value: `₹${formatINR(filtered.reduce((s, i) => s + (i.unitPrice || 0), 0))}` },
              { label: 'Total IGST (18%)', value: `₹${formatINR(filtered.reduce((s, i) => s + (i.igstAmt || 0), 0))}` },
              { label: 'Grand Total', value: `₹${formatINR(filtered.reduce((s, i) => s + (i.grandTotal || 0), 0))}`, bold: true },
            ].map(({ label, value, bold }) => (
              <div key={label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                <span style={{ fontSize: '0.66rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700 }}>{label}</span>
                <span style={{ fontSize: bold ? '1.05rem' : '0.88rem', fontWeight: bold ? 900 : 700, color: bold ? '#0f2952' : '#0284c7', fontFamily: 'monospace' }}>
                  {value}
                </span>
              </div>
            ))}
          </div>
        </div>
      </LiquidGlassCard>

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
