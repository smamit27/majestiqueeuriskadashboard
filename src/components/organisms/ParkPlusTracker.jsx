import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  collection, doc, onSnapshot, setDoc, deleteDoc, serverTimestamp
} from 'firebase/firestore';
import { db, ensureFirebaseSession, isFirebaseConfigured } from '../../firebase.js';
import LiquidGlassCard from '../liquid-glass/LiquidGlassCard.jsx';
import './ParkPlusTracker.css';


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
  if (!s) return <span className="park-plus-tracker-s1">—</span>;
  return (
    <span className="park-plus-tracker-s2" style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}`, boxShadow: `0 2px 8px ${s.glow}` }}>
      <span>{s.icon}</span>
      <span>{status}</span>
    </span>
  );
}

function DaysChip({ days }) {
  if (days === null) return <span className="park-plus-tracker-s1">—</span>;
  const isOverdue = days < 0;
  const isWarning = days >= 0 && days <= 5;
  const color = isOverdue ? '#991b1b' : isWarning ? '#92400e' : '#065f46';
  const bg    = isOverdue ? 'rgba(254, 226, 226, 0.75)' : isWarning ? 'rgba(254, 243, 199, 0.75)' : 'rgba(209, 250, 229, 0.75)';
  const border = isOverdue ? 'rgba(239, 68, 68, 0.35)' : isWarning ? 'rgba(245, 158, 11, 0.35)' : 'rgba(16, 185, 129, 0.35)';
  const label = isOverdue ? `${Math.abs(days)}d overdue` : days === 0 ? 'Due today!' : `${days}d left`;
  return (
    <span className="park-plus-tracker-s3" style={{ background: bg, color, border: `1px solid ${border}` }}>
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
    <div className="park-plus-tracker-s4" onClick={onClose}>
      <div className="park-plus-tracker-s5" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="park-plus-tracker-s6">
          <div>
            <div className="park-plus-tracker-s7">
              <span>🅿️</span>
              <span>Park+ Vendor Management</span>
            </div>
            <h3 className="park-plus-tracker-s8">
              {invoice && invoice.id ? '✏️ Edit Invoice Entry' : '➕ Add New Park+ Invoice'}
            </h3>
          </div>
          <button onClick={onClose} className="park-plus-tracker-s9">✕</button>
        </div>

        <div className="park-plus-tracker-s10">

          {/* Full-width: Description */}
          <label className="park-plus-tracker-s11">
            <span style={labelStyle}>Description *</span>
            <input style={inputStyle} value={form.description} onChange={e => set('description', e.target.value)}
              placeholder="e.g. Automated Gate and Security Solution" />
          </label>

          {/* Period */}
          <label className="park-plus-tracker-s11">
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
          <div className="park-plus-tracker-s12">
            {[
              { label: 'Subtotal', val: `₹${formatINR(form.unitPrice || 0)}` },
              { label: `IGST (${form.igstRate}%)`, val: `₹${formatINR(igstAmt)}` },
              { label: 'Grand Total', val: `₹${formatINR(grandTotal)}`, bold: true },
            ].map(({ label, val, bold }) => (
              <div key={label} className="park-plus-tracker-s13">
                <div className="park-plus-tracker-s14">{label}</div>
                <div style={{ fontSize: bold ? '1.12rem' : '0.96rem', fontWeight: bold ? 900 : 700, color: bold ? '#0f2952' : '#0284c7' }}>{val}</div>
              </div>
            ))}
          </div>

          {/* Payment Status */}
          <label className="park-plus-tracker-s11">
            <span style={labelStyle}>Payment Status</span>
            <div className="park-plus-tracker-s15">
              {PAYMENT_STATUS.map(s => {
                const st = STATUS_STYLE[s];
                const active = form.paymentStatus === s;
                return (
                  <button key={s} type="button" onClick={() => set('paymentStatus', s)} className="park-plus-tracker-s16" style={{ border: `1.5px solid ${active ? st.border : 'rgba(203, 213, 225, 0.8)'}`, background: active ? st.bg : '#ffffff', color: active ? st.color : '#64748b', boxShadow: active ? `0 2px 8px ${st.glow}` : 'none' }}>{s}</button>
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
          <label className="park-plus-tracker-s11">
            <span style={labelStyle}>Remarks</span>
            <textarea rows={2} className="park-plus-tracker-s17" style={{ ...inputStyle }}
              value={form.remarks} onChange={e => set('remarks', e.target.value)}
              placeholder="Any payment reference, cheque number, or transaction notes..." />
          </label>

        </div>

        {/* Footer */}
        <div className="park-plus-tracker-s18">
          <button onClick={onClose} className="park-plus-tracker-s19">Cancel</button>
          <button onClick={handleSave} className="park-plus-tracker-s20">
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
    <div className="park-plus-tracker-s21">

      {/* ── Liquid Glass Hero Banner ── */}
      <LiquidGlassCard
        variant="operations"
        className="park-plus-tracker-s22"
      >
        <div className="park-plus-tracker-s23">
          <div>
            <div className="park-plus-tracker-s24">
              <span className="park-plus-tracker-s25">
                Vendor · Park+ (Park Mate)
              </span>
              <span className="park-plus-tracker-s26">
                Active Contract
              </span>
            </div>

            <h2 className="park-plus-tracker-s27">
              <span>🅿️</span>
              <span>Park+ Payment Tracker</span>
            </h2>

            <p className="park-plus-tracker-s28">
              RFID & Automated Gate Solution — Majestique Euriska 'A' Building CHS Ltd.
            </p>
          </div>

          {/* Quick Glass Stat Badges inside Hero */}
          <div className="park-plus-tracker-s29">
            {[
              { label: 'Invoices', value: stats.count, bg: 'rgba(255, 255, 255, 0.12)', color: '#ffffff' },
              { label: 'Total Billed', value: `₹${formatINR(stats.totalGrand)}`, bg: 'rgba(56, 189, 248, 0.16)', color: '#bae6fd' },
              { label: 'Paid', value: `₹${formatINR(stats.totalPaid)}`, bg: 'rgba(16, 185, 129, 0.22)', color: '#6ee7b7' },
              { label: 'Pending', value: `₹${formatINR(stats.totalUnpaid)}`, bg: 'rgba(245, 158, 11, 0.22)', color: '#fde047' },
              { label: 'Overdue', value: stats.overdueCount, bg: stats.overdueCount > 0 ? 'rgba(239, 68, 68, 0.35)' : 'rgba(255, 255, 255, 0.08)', color: stats.overdueCount > 0 ? '#fca5a5' : 'rgba(255, 255, 255, 0.7)' },
            ].map(s => (
              <div key={s.label} className="park-plus-tracker-s30" style={{ background: s.bg }}>
                <div className="park-plus-tracker-s31" style={{ color: s.color }}>{s.value}</div>
                <div className="park-plus-tracker-s32">{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Contract & Retainer Timeline Glass Strip */}
        <div className="park-plus-tracker-s33">
          <div className="park-plus-tracker-s34">
            <span><strong>Contract Scope:</strong> Boom Barrier RFID Hardware + Quarterly Gate Software Support</span>
            <span>•</span>
            <span><strong>Retainer Rate:</strong> ₹18,750 / Quarter (+ 18% IGST)</span>
          </div>

          <div className="park-plus-tracker-s35">
            <span className="park-plus-tracker-s36">Settlement Progress:</span>
            <div className="park-plus-tracker-s37">
              <div className="park-plus-tracker-s38" style={{ width: `${stats.paidPct}%` }} />
            </div>
            <span className="park-plus-tracker-s39">{stats.paidPct}%</span>
          </div>
        </div>
      </LiquidGlassCard>

      {/* ── Main Liquid Glass Table Card ── */}
      <LiquidGlassCard
        className="park-plus-tracker-s40"
      >
        {/* ── Glass Toolbar ── */}
        <div className="park-plus-tracker-s41">
          {/* Search Bar & Status Chips */}
          <div className="park-plus-tracker-s42">
            <div className="park-plus-tracker-s43">
              <span className="park-plus-tracker-s44">🔍</span>
              <input
                type="search"
                placeholder="Search invoices..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="park-plus-tracker-s45"
              />
            </div>

            {/* Status filter chips */}
            <div className="park-plus-tracker-s46">
              {['All', ...PAYMENT_STATUS].map(s => {
                const st = STATUS_STYLE[s];
                const active = filterStatus === s;
                return (
                  <button
                    key={s}
                    onClick={() => setFilterStatus(s)}
                    className="park-plus-tracker-s47" style={{ background: active ? (st ? st.bg : '#0f2952') : 'transparent', color: active ? (st ? st.color : '#ffffff') : '#64748b', boxShadow: active ? '0 1px 4px rgba(0, 0, 0, 0.1)' : 'none' }}
                  >
                    {s}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Action buttons */}
          <div className="park-plus-tracker-s48">
            <button
              onClick={handleExportCSV}
              className="park-plus-tracker-s49"
              title="Export invoices to CSV"
            >
              <span>📥</span>
              <span>Export CSV</span>
            </button>

            <button
              onClick={handleExportPDF}
              className="park-plus-tracker-s49"
              title="Print or export as PDF"
            >
              <span>📄</span>
              <span>Print PDF</span>
            </button>

            {saveStatus && (
              <span className="park-plus-tracker-s50" style={{ color: saveStatus.includes('✓') ? '#065f46' : '#991b1b' }}>
                {saveStatus}
              </span>
            )}

            {isAdmin && (
              <button
                onClick={() => setModalInv({})}
                className="park-plus-tracker-s51"
              >
                <span>➕</span>
                <span>Add Invoice</span>
              </button>
            )}
          </div>
        </div>

        {/* ── Liquid Glass Table ── */}
        <div className="park-plus-tracker-s52">
          <table className="park-plus-tracker-s53">
            <thead>
              <tr className="park-plus-tracker-s54">
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
                  <th key={col.label} className="park-plus-tracker-s55" style={{ textAlign: col.align || 'left', minWidth: col.w }}>{col.label}</th>
                ))}
              </tr>
            </thead>

            <tbody>
              {isLoading ? (
                <tr><td colSpan={12} className="park-plus-tracker-s56">
                  <div className="park-plus-tracker-s57">
                    <div className="park-plus-tracker-s58">⏳</div>
                    <span className="park-plus-tracker-s59">Loading Park+ Invoices...</span>
                  </div>
                </td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={12} className="park-plus-tracker-s56">
                  <div className="park-plus-tracker-s57">
                    <div className="park-plus-tracker-s60">📭</div>
                    <span className="park-plus-tracker-s59">No invoices match your filters</span>
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
                      className="park-plus-tracker-s61" style={{ background: rowBg }}
                      onMouseEnter={e => {
                        e.currentTarget.style.background = isPaid ? 'rgba(220, 252, 231, 0.65)' : 'rgba(241, 245, 249, 0.75)';
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.background = rowBg;
                      }}
                    >
                      {/* Sr. No */}
                      <td className="park-plus-tracker-s62">
                        {idx + 1}
                      </td>

                      {/* Invoice ID & HSN */}
                      <td className="park-plus-tracker-s63">
                        <div className="park-plus-tracker-s64">
                          {inv.id}
                        </div>
                        {inv.hsn && (
                          <span className="park-plus-tracker-s65">
                            HSN: {inv.hsn}
                          </span>
                        )}
                      </td>

                      {/* Invoice Date */}
                      <td className="park-plus-tracker-s66">
                        {fmtDate(inv.invoiceDate)}
                      </td>

                      {/* Due Date */}
                      <td className="park-plus-tracker-s67" style={{ fontWeight: isOverdue ? 800 : 500, color: isOverdue ? '#b91c1c' : '#475569' }}>
                        {fmtDate(inv.dueDate)}
                      </td>

                      {/* Description & Period */}
                      <td className="park-plus-tracker-s68">
                        <div className="park-plus-tracker-s69">
                          {inv.description || '—'}
                        </div>
                        {inv.period && (
                          <div className="park-plus-tracker-s70">
                            Period: {inv.period}
                          </div>
                        )}
                      </td>

                      {/* Subtotal */}
                      <td className="park-plus-tracker-s71">
                        ₹{formatINR(inv.unitPrice)}
                      </td>

                      {/* IGST */}
                      <td className="park-plus-tracker-s72">
                        ₹{formatINR(inv.igstAmt)}
                      </td>

                      {/* Grand Total */}
                      <td className="park-plus-tracker-s73">
                        <span className="park-plus-tracker-s74">
                          ₹{formatINR(inv.grandTotal)}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="park-plus-tracker-s75">
                        {isAdmin ? (
                          <select
                            value={inv.paymentStatus || ''}
                            onChange={e => quickStatus(inv.id, e.target.value)}
                            className="park-plus-tracker-s76" style={{ border: `1.5px solid ${STATUS_STYLE[inv.paymentStatus]?.border || '#cbd5e1'}`, background: STATUS_STYLE[inv.paymentStatus]?.bg || '#ffffff', color: STATUS_STYLE[inv.paymentStatus]?.color || '#0f172a' }}
                          >
                            {PAYMENT_STATUS.map(o => <option key={o} value={o}>{o}</option>)}
                          </select>
                        ) : (
                          <StatusPill status={inv.paymentStatus} />
                        )}
                      </td>

                      {/* Due In */}
                      <td className="park-plus-tracker-s75">
                        <DaysChip days={daysLeft} />
                      </td>

                      {/* Remarks */}
                      <td className="park-plus-tracker-s68">
                        {inv.remarks ? (
                          <span className="park-plus-tracker-s77" style={{ color: inv.remarks.startsWith('⚠') ? '#92400e' : '#475569' }}>
                            {inv.remarks}
                          </span>
                        ) : (
                          <span className="park-plus-tracker-s78">—</span>
                        )}
                      </td>

                      {/* Actions (Admin) */}
                      {isAdmin && (
                        <td className="park-plus-tracker-s79">
                          <div className="park-plus-tracker-s80">
                            <button
                              onClick={() => setModalInv(inv)}
                              title="Edit invoice"
                              className="park-plus-tracker-s81"
                            >
                              ✏️
                            </button>
                            <button
                              onClick={() => deleteInvoice(inv.id)}
                              title="Delete invoice"
                              className="park-plus-tracker-s82"
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
        <div className="park-plus-tracker-s83">
          <div className="park-plus-tracker-s84">
            Showing <strong>{filtered.length}</strong> of <strong>{invoices.length}</strong> Park+ invoices
            {filterStatus !== 'All' ? ` (Filtered by: ${filterStatus})` : ''}
          </div>

          <div className="park-plus-tracker-s85">
            {[
              { label: 'Subtotal', value: `₹${formatINR(filtered.reduce((s, i) => s + (i.unitPrice || 0), 0))}` },
              { label: 'Total IGST (18%)', value: `₹${formatINR(filtered.reduce((s, i) => s + (i.igstAmt || 0), 0))}` },
              { label: 'Grand Total', value: `₹${formatINR(filtered.reduce((s, i) => s + (i.grandTotal || 0), 0))}`, bold: true },
            ].map(({ label, value, bold }) => (
              <div key={label} className="park-plus-tracker-s86">
                <span className="park-plus-tracker-s87">{label}</span>
                <span className="park-plus-tracker-s88" style={{ fontSize: bold ? '1.05rem' : '0.88rem', fontWeight: bold ? 900 : 700, color: bold ? '#0f2952' : '#0284c7' }}>
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
