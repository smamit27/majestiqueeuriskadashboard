import { useMemo, useState } from 'react';
import { BUILDER_RECO_DATA, WING_A_AUDITED_STATEMENT, BOM_PASSBOOK_LEDGER, fmtINR, CA_HARDIK_MEHTA_REPORT } from '../../data/builderRecoData.js';
import CAHardikMehtaReportView from './CAHardikMehtaReportView.jsx';
import BOMMissingBillsAnalytics from './BOMMissingBillsAnalytics.jsx';


function todayISO() {
  return new Date().toISOString().split('T')[0];
}

function highlight(text, query) {
  if (!query || !text) return text || '—';
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark style={{ background: '#fff0cc', color: '#b98216', borderRadius: 3, padding: '0 3px', fontWeight: 600 }}>
        {text.slice(idx, idx + query.length)}
      </mark>
      {text.slice(idx + query.length)}
    </>
  );
}




// ─── Scanned Document Preview Modal (Supports Phase II Reco & Wing A Audit Statement) ──
function ScannedDocModal({ onClose, defaultDoc = 'phase2' }) {
  const [activeDoc, setActiveDoc] = useState(defaultDoc); // 'phase2' | 'wingA'
  const [zoom, setZoom] = useState(1);

  const docConfig = {
    phase2: {
      title: 'Eisha Asset Developers Phase II Maintenance Reco Sheet',
      sub: 'Audited Statement: 01.07.2021 till 31.03.2023 & Ledger till 31.03.2026',
      src: '/visuals/builder_reco_doc.jpeg',
      downloadName: 'Eisha_Asset_Developers_Phase_II_Reco.jpeg',
      sourceNote: 'Auditor signed verification sheet covering 01.07.2021 to 31.03.2023 & movements till 31.03.2026',
      badge: 'Closing Balance: ₹1,10,199.23'
    },
    wingA: {
      title: 'Wing A Audited Income & Expenditure Statement',
      sub: 'Certified by Rohit Dhage & Associates, Chartered Accountants (09/08/2019 to 30/06/2021)',
      src: '/visuals/wing_a_audit_statement.jpg',
      downloadName: 'Wing_A_Audited_Statement_Rohit_Dhage_CA.jpg',
      sourceNote: 'Extracted from books of account • FRN: 144303W • CA Rohit Dhage (M. No. 176512)',
      badge: 'Certified Surplus: ₹39,56,635.00'
    },
    ledger1: {
      title: 'BOM Maintenance A/c No. 60305942224 Ledger — Page 1',
      sub: '01-Jul-2021 to 20-Oct-2021 (Opening Balance ₹56.23L, BPCL Fuel, Waterman, Pool)',
      src: '/visuals/ledger_page_1.jpg',
      downloadName: 'BOM_Ledger_60305942224_Page_1.jpg',
      sourceNote: 'Original Tally Ledger Book scan • Eisha Asset Developers Phase-II',
      badge: 'Page 1 • Opening: ₹56,22,572.90'
    },
    ledger2: {
      title: 'BOM Maintenance A/c No. 60305942224 Ledger — Page 2',
      sub: '06-Jul-2021 to 16-Sep-2021 (Marshal Force Security, TDS, Water Tankers, Audit Fees)',
      src: '/visuals/ledger_page_2.jpg',
      downloadName: 'BOM_Ledger_60305942224_Page_2.jpg',
      sourceNote: 'Original Tally Ledger Book scan • Eisha Asset Developers Phase-II',
      badge: 'Page 2 • Security & Utilities'
    },
    ledger3: {
      title: 'BOM Maintenance A/c No. 60305942224 Ledger — Page 3',
      sub: '14-Oct-2021 to 03-Dec-2021 (Supervision Charges ₹6.2L, ₹24 Lakhs Transfer to Wing A Society)',
      src: '/visuals/ledger_page_3.jpg',
      downloadName: 'BOM_Ledger_60305942224_Page_3.jpg',
      sourceNote: 'Original Tally Ledger Book scan • Critical Transfer: ₹24,00,000 on 26-11-2021',
      badge: 'Page 3 • ₹24L Transfer & Supervision'
    },
    ledger4: {
      title: 'BOM Maintenance A/c No. 60305942224 Ledger — Page 4',
      sub: '06-Dec-2021 to 07-Jan-2023 (Repairs, Tankers, TDS & Closing Difference ₹6,19,470.40)',
      src: '/visuals/ledger_page_4.jpg',
      downloadName: 'BOM_Ledger_60305942224_Page_4.jpg',
      sourceNote: 'Original Tally Ledger Book scan • Closing Balance: ₹6,19,470.40 (Exp Till - 31/03/2023)',
      badge: 'Page 4 • Closing Difference: ₹6,19,470.40'
    }
  };

  const curr = docConfig[activeDoc];

  return (
    <div
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(11, 43, 38, 0.78)',
        backdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1050, padding: 16
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#fffaf2',
          borderRadius: 20,
          width: '100%',
          maxWidth: 960,
          maxHeight: '94vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 60px rgba(0,0,0,0.4)',
          border: '1.5px solid rgba(61, 63, 52, 0.2)',
          overflow: 'hidden'
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          padding: '14px 22px',
          borderBottom: '1px solid rgba(61, 63, 52, 0.12)',
          background: 'linear-gradient(135deg, #0b2b26 0%, #196c6c 100%)',
          color: '#ffffff'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <div>
              <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#C49B4F', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                OFFICIAL AUDIT DOCUMENTATION
              </span>
              <h3 style={{ margin: '2px 0 0', fontSize: '1.15rem', fontWeight: 800, fontFamily: 'Fraunces, serif' }}>
                {curr.title}
              </h3>
              <p style={{ margin: 0, fontSize: '0.78rem', color: 'rgba(255,255,255,0.7)' }}>{curr.sub}</p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ display: 'flex', gap: 4, background: 'rgba(255,255,255,0.15)', borderRadius: 8, padding: 2 }}>
                <button
                  onClick={() => setZoom(z => Math.max(0.6, z - 0.2))}
                  style={{ background: 'none', border: 'none', color: '#fff', padding: '4px 8px', cursor: 'pointer', fontWeight: 700 }}
                  title="Zoom Out"
                >
                  −
                </button>
                <button
                  onClick={() => setZoom(1)}
                  style={{ background: 'none', border: 'none', color: '#fff', padding: '4px 8px', cursor: 'pointer', fontSize: '0.75rem' }}
                  title="Reset Zoom"
                >
                  {Math.round(zoom * 100)}%
                </button>
                <button
                  onClick={() => setZoom(z => Math.min(2.2, z + 0.2))}
                  style={{ background: 'none', border: 'none', color: '#fff', padding: '4px 8px', cursor: 'pointer', fontWeight: 700 }}
                  title="Zoom In"
                >
                  +
                </button>
              </div>

              <a
                href={curr.src}
                download={curr.downloadName}
                style={{
                  padding: '6px 12px',
                  borderRadius: 8,
                  background: '#C49B4F',
                  color: '#0b2b26',
                  fontWeight: 700,
                  fontSize: '0.8rem',
                  textDecoration: 'none'
                }}
              >
                ⬇ Download Scan
              </a>

              <button
                onClick={onClose}
                style={{
                  background: 'rgba(255,255,255,0.2)',
                  border: 'none', borderRadius: '50%',
                  width: 32, height: 32, color: '#fff',
                  cursor: 'pointer', fontSize: 16
                }}
              >
                ✕
              </button>
            </div>
          </div>

          {/* Doc Switcher Buttons inside modal */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <button
              onClick={() => { setActiveDoc('phase2'); setZoom(1); }}
              style={{
                padding: '5px 10px', borderRadius: 8, border: 'none', cursor: 'pointer',
                background: activeDoc === 'phase2' ? '#ffffff' : 'rgba(255,255,255,0.12)',
                color: activeDoc === 'phase2' ? '#0b2b26' : '#ffffff',
                fontWeight: 700, fontSize: '0.74rem'
              }}
            >
              📑 Master Reco
            </button>
            <button
              onClick={() => { setActiveDoc('wingA'); setZoom(1); }}
              style={{
                padding: '5px 10px', borderRadius: 8, border: 'none', cursor: 'pointer',
                background: activeDoc === 'wingA' ? '#ffffff' : 'rgba(255,255,255,0.12)',
                color: activeDoc === 'wingA' ? '#0b2b26' : '#ffffff',
                fontWeight: 700, fontSize: '0.74rem'
              }}
            >
              📜 Wing A Audit
            </button>
            <button
              onClick={() => { setActiveDoc('ledger1'); setZoom(1); }}
              style={{
                padding: '5px 10px', borderRadius: 8, border: 'none', cursor: 'pointer',
                background: activeDoc === 'ledger1' ? '#ffffff' : 'rgba(255,255,255,0.12)',
                color: activeDoc === 'ledger1' ? '#0b2b26' : '#ffffff',
                fontWeight: 700, fontSize: '0.74rem'
              }}
            >
              📒 BOM Page 1
            </button>
            <button
              onClick={() => { setActiveDoc('ledger2'); setZoom(1); }}
              style={{
                padding: '5px 10px', borderRadius: 8, border: 'none', cursor: 'pointer',
                background: activeDoc === 'ledger2' ? '#ffffff' : 'rgba(255,255,255,0.12)',
                color: activeDoc === 'ledger2' ? '#0b2b26' : '#ffffff',
                fontWeight: 700, fontSize: '0.74rem'
              }}
            >
              📒 BOM Page 2
            </button>
            <button
              onClick={() => { setActiveDoc('ledger3'); setZoom(1); }}
              style={{
                padding: '5px 10px', borderRadius: 8, border: 'none', cursor: 'pointer',
                background: activeDoc === 'ledger3' ? '#ffffff' : 'rgba(255,255,255,0.12)',
                color: activeDoc === 'ledger3' ? '#0b2b26' : '#ffffff',
                fontWeight: 700, fontSize: '0.74rem'
              }}
            >
              📒 BOM Page 3 (₹24L Trf)
            </button>
            <button
              onClick={() => { setActiveDoc('ledger4'); setZoom(1); }}
              style={{
                padding: '5px 10px', borderRadius: 8, border: 'none', cursor: 'pointer',
                background: activeDoc === 'ledger4' ? '#ffffff' : 'rgba(255,255,255,0.12)',
                color: activeDoc === 'ledger4' ? '#0b2b26' : '#ffffff',
                fontWeight: 700, fontSize: '0.74rem'
              }}
            >
              📒 BOM Page 4 (Closing)
            </button>
          </div>
        </div>

        {/* Image Display */}
        <div style={{
          flex: 1,
          overflow: 'auto',
          padding: 20,
          background: '#1d2a24',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'flex-start'
        }}>
          <img
            src={curr.src}
            alt={curr.title}
            style={{
              width: `${zoom * 100}%`,
              maxWidth: zoom <= 1 ? '760px' : 'none',
              borderRadius: 8,
              boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
              transition: 'width 0.15s ease'
            }}
          />
        </div>

        {/* Footer info */}
        <div style={{
          padding: '10px 20px',
          background: '#fffaf2',
          borderTop: '1px solid rgba(61, 63, 52, 0.1)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '0.82rem',
          color: '#5f665f',
          flexWrap: 'wrap',
          gap: 8
        }}>
          <span>{curr.sourceNote}</span>
          <span style={{ fontWeight: 700, color: '#196c6c' }}>{curr.badge}</span>
        </div>
      </div>
    </div>
  );
}

// ─── Main BuilderDiscuss Component ────────────────────────────────────────────
export default function BuilderDiscuss({ isAdmin = false, defaultTab = 'reco' }) {
  const [subTab, setSubTab] = useState(defaultTab); // 'reco' | 'caReport' | 'wingA' | 'ledger' | 'bomAnalytics'
  const [wingFilter, setWingFilter] = useState('all'); // 'all' | 'A' | 'B'
  const [showDocModal, setShowDocModal] = useState(false);
  const [modalDefaultDoc, setModalDefaultDoc] = useState('phase2');

  // Wing A View Category & Search filters
  const [wingACategory, setWingACategory] = useState('All');
  const [wingASearch, setWingASearch] = useState('');

  // BOM Ledger Passbook Filters & Search
  const [ledgerSearch, setLedgerSearch] = useState('');
  const [ledgerWing, setLedgerWing] = useState('All'); // 'All' | 'A' | 'B' | 'C' | 'Refund' | 'Opening'
  const [ledgerVchType, setLedgerVchType] = useState('All'); // 'All' | 'Payment' | 'Receipt' | 'Contra'
  const [ledgerPage, setLedgerPage] = useState('All'); // 'All' | '1' | '2' | '3' | '4'
  const [ledgerRemark, setLedgerRemark] = useState('All');

  // ── Filtered BOM Ledger Transactions ─────────────────────────────────────────
  const filteredLedger = useMemo(() => {
    return BOM_PASSBOOK_LEDGER.transactions.filter(t => {
      if (ledgerWing !== 'All' && t.wing !== ledgerWing) return false;
      if (ledgerVchType !== 'All' && t.vchType !== ledgerVchType) return false;
      if (ledgerPage !== 'All' && t.page !== Number(ledgerPage)) return false;
      if (ledgerRemark !== 'All' && t.remark !== ledgerRemark) return false;
      if (ledgerSearch.trim()) {
        const q = ledgerSearch.toLowerCase();
        const match =
          t.particulars.toLowerCase().includes(q) ||
          t.remark.toLowerCase().includes(q) ||
          (t.vchNo && t.vchNo.toString().includes(q)) ||
          t.date.includes(q) ||
          t.wing.toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [ledgerWing, ledgerVchType, ledgerPage, ledgerRemark, ledgerSearch]);

  const ledgerTotals = useMemo(() => {
    return filteredLedger.reduce(
      (acc, t) => {
        acc.debit += t.debit || 0;
        acc.credit += t.credit || 0;
        return acc;
      },
      { debit: 0, credit: 0 }
    );
  }, [filteredLedger]);


  // ── Filtered Expenditure for Wing A Audited Statement ──────────────────────
  const filteredWingAExpenses = useMemo(() => {
    let list = [...WING_A_AUDITED_STATEMENT.expenditure.items];
    if (wingACategory !== 'All') {
      list = list.filter(i => i.category === wingACategory);
    }
    if (wingASearch.trim()) {
      const q = wingASearch.toLowerCase();
      list = list.filter(i =>
        [i.particular, i.category, i.notes].join(' ').toLowerCase().includes(q)
      );
    }
    return list;
  }, [wingACategory, wingASearch]);

  const wingACategoriesList = useMemo(() => {
    const set = new Set(WING_A_AUDITED_STATEMENT.expenditure.items.map(i => i.category));
    return ['All', ...Array.from(set)];
  }, []);
const handleExportRecoCSV = () => {
    const lines = [];
    lines.push(`"${BUILDER_RECO_DATA.meta.title}"`);
    lines.push(`"Period: ${BUILDER_RECO_DATA.meta.period}"`);
    lines.push('');
    lines.push('"SECTION 1: EXPENSES BREAKDOWN"');
    lines.push('"Description","Wing A (Sep 2019)","Wing B (Jan 2019)","Total Expenses"');
    BUILDER_RECO_DATA.expenses.forEach(e => {
      lines.push(`"${e.label}",${e.wingA},${e.wingB},${e.total}`);
    });
    lines.push(`"${BUILDER_RECO_DATA.totalExpensesI.label}",${BUILDER_RECO_DATA.totalExpensesI.wingA},${BUILDER_RECO_DATA.totalExpensesI.wingB},${BUILDER_RECO_DATA.totalExpensesI.total}`);
    lines.push('');
    lines.push('"SECTION 2: COST SHIFTS (FROM WING B TO WING A)"');
    lines.push('"Cost Shift Item","Wing A Reallocation","Wing B Deduction","Net Shift"');
    BUILDER_RECO_DATA.costShifts.forEach(c => {
      lines.push(`"${c.label}",${c.wingA},${c.wingB},${c.net}`);
    });
    lines.push(`"${BUILDER_RECO_DATA.totalCostShiftII.label}",${BUILDER_RECO_DATA.totalCostShiftII.wingA},${BUILDER_RECO_DATA.totalCostShiftII.wingB},0`);
    lines.push('');
    lines.push('"SECTION 3: NET EXPENSES (I + II)"');
    lines.push(`"${BUILDER_RECO_DATA.totalExpensesNet.label}",${BUILDER_RECO_DATA.totalExpensesNet.wingA},${BUILDER_RECO_DATA.totalExpensesNet.wingB},${BUILDER_RECO_DATA.totalExpensesNet.total}`);
    lines.push('');
    lines.push('"SECTION 4: RECEIPTS"');
    lines.push('"Receipt Source","Wing A","Wing B","Total Receipts"');
    BUILDER_RECO_DATA.receipts.forEach(r => {
      lines.push(`"${r.label}",${r.wingA},${r.wingB},${r.total}`);
    });
    lines.push(`"${BUILDER_RECO_DATA.totalReceipts.label}",${BUILDER_RECO_DATA.totalReceipts.wingA},${BUILDER_RECO_DATA.totalReceipts.wingB},${BUILDER_RECO_DATA.totalReceipts.total}`);
    lines.push('');
    lines.push('"SECTION 5: NET BALANCE AS PER WORKING"');
    lines.push(`"${BUILDER_RECO_DATA.netBalanceWorking.label}",${BUILDER_RECO_DATA.netBalanceWorking.wingA},${BUILDER_RECO_DATA.netBalanceWorking.wingB},${BUILDER_RECO_DATA.netBalanceWorking.total}`);
    lines.push('');
    lines.push('"SECTION 6: AUDIT RECONCILIATION AS OF 31-03-2023"');
    lines.push(`"Book Balance (31-03-2023)",${BUILDER_RECO_DATA.auditReconciliation.bookBalance}`);
    lines.push(`"Tally Books (31-03-2023)",${BUILDER_RECO_DATA.auditReconciliation.tallyBooks}`);
    lines.push(`"Audit Difference (Diffn)",${BUILDER_RECO_DATA.auditReconciliation.difference}`);
    lines.push('');
    lines.push('"SECTION 7: POST 31.03.2023 TRANSACTIONS TILL 31.03.2026"');
    lines.push('"Date","Particulars","Amount","Remarks"');
    lines.push(`"31.03.2023","Opening Tally Book Balance",${BUILDER_RECO_DATA.postPeriodLedger.openingBalance},"Tally closing as on 31.03.2023"`);
    BUILDER_RECO_DATA.postPeriodLedger.transactions.forEach(t => {
      lines.push(`"${t.date}","${t.particulars}",${t.amount},"${t.remarks}"`);
    });
    lines.push(`"${BUILDER_RECO_DATA.postPeriodLedger.closingDate}","Final Tally Book Balance",${BUILDER_RECO_DATA.postPeriodLedger.closingBalance},"Net closing balance due from developer"`);

    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `Eisha_Asset_Developers_Phase_II_Reco_${todayISO()}.csv`;
    a.click();
  };

  // ── Print Audit Statement ───────────────────────────────────────────────────
  const handlePrintReco = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Eisha Asset Developers Phase II Maintenance Reco</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; margin: 30px; color: #1d2a24; }
          h1 { color: #0b2b26; font-size: 20px; margin-bottom: 4px; }
          .sub { color: #5f665f; font-size: 13px; margin-bottom: 20px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
          th, td { border: 1px solid #d1d5db; padding: 8px 12px; font-size: 13px; }
          th { background: #f3f4f6; text-align: left; }
          .num { text-align: right; }
          .total { font-weight: bold; background: #f9fafb; }
          .badge { background: #e0f2fe; color: #0369a1; padding: 2px 6px; border-radius: 4px; font-size: 11px; }
        </style>
      </head>
      <body>
        <h1>${BUILDER_RECO_DATA.meta.title}</h1>
        <div class="sub">Period: ${BUILDER_RECO_DATA.meta.period} | Handover: Wing A (Sep 2019) & Wing B (Jan 2019) | Printed: ${new Date().toLocaleDateString('en-IN')}</div>
        
        <h3>1. Expenses Breakdown & Cost Shifts</h3>
        <table>
          <thead>
            <tr><th>Description</th><th class="num">Wing A (₹)</th><th class="num">Wing B (₹)</th><th class="num">Total (₹)</th></tr>
          </thead>
          <tbody>
            ${BUILDER_RECO_DATA.expenses.map(e => `<tr><td>${e.label}</td><td class="num">${fmtINR(e.wingA)}</td><td class="num">${fmtINR(e.wingB)}</td><td class="num">${fmtINR(e.total)}</td></tr>`).join('')}
            <tr class="total"><td>${BUILDER_RECO_DATA.totalExpensesI.label}</td><td class="num">${fmtINR(BUILDER_RECO_DATA.totalExpensesI.wingA)}</td><td class="num">${fmtINR(BUILDER_RECO_DATA.totalExpensesI.wingB)}</td><td class="num">${fmtINR(BUILDER_RECO_DATA.totalExpensesI.total)}</td></tr>
            ${BUILDER_RECO_DATA.costShifts.map(c => `<tr><td>${c.label}</td><td class="num">+${fmtINR(c.wingA)}</td><td class="num">${fmtINR(c.wingB)}</td><td class="num">₹0.00</td></tr>`).join('')}
            <tr class="total"><td>${BUILDER_RECO_DATA.totalCostShiftII.label}</td><td class="num">+${fmtINR(BUILDER_RECO_DATA.totalCostShiftII.wingA)}</td><td class="num">${fmtINR(BUILDER_RECO_DATA.totalCostShiftII.wingB)}</td><td class="num">₹0.00</td></tr>
            <tr class="total" style="background:#fef3c7;"><td><strong>Total Expenses (I + II)</strong></td><td class="num"><strong>${fmtINR(BUILDER_RECO_DATA.totalExpensesNet.wingA)}</strong></td><td class="num"><strong>${fmtINR(BUILDER_RECO_DATA.totalExpensesNet.wingB)}</strong></td><td class="num"><strong>${fmtINR(BUILDER_RECO_DATA.totalExpensesNet.total)}</strong></td></tr>
          </tbody>
        </table>

        <h3>2. Receipts & Working Net Balance</h3>
        <table>
          <thead>
            <tr><th>Receipt Category</th><th class="num">Wing A (₹)</th><th class="num">Wing B (₹)</th><th class="num">Total (₹)</th></tr>
          </thead>
          <tbody>
            ${BUILDER_RECO_DATA.receipts.map(r => `<tr><td>${r.label}</td><td class="num">${fmtINR(r.wingA)}</td><td class="num">${fmtINR(r.wingB)}</td><td class="num">${fmtINR(r.total)}</td></tr>`).join('')}
            <tr class="total"><td><strong>Total Receipt</strong></td><td class="num"><strong>${fmtINR(BUILDER_RECO_DATA.totalReceipts.wingA)}</strong></td><td class="num"><strong>${fmtINR(BUILDER_RECO_DATA.totalReceipts.wingB)}</strong></td><td class="num"><strong>${fmtINR(BUILDER_RECO_DATA.totalReceipts.total)}</strong></td></tr>
            <tr class="total" style="background:#ecfdf5;"><td><strong>Net Balance as per Working</strong></td><td class="num"><strong>${fmtINR(BUILDER_RECO_DATA.netBalanceWorking.wingA)}</strong></td><td class="num"><strong>${fmtINR(BUILDER_RECO_DATA.netBalanceWorking.wingB)}</strong></td><td class="num"><strong>${fmtINR(BUILDER_RECO_DATA.netBalanceWorking.total)}</strong></td></tr>
          </tbody>
        </table>

        <h3>3. Audit Reconciliation & Subsequent Movements</h3>
        <table>
          <tbody>
            <tr><td><strong>Working Book Balance (31-03-2023)</strong></td><td class="num">${fmtINR(BUILDER_RECO_DATA.auditReconciliation.bookBalance)}</td></tr>
            <tr><td><strong>Tally Books Balance (31.03.2023)</strong></td><td class="num">${fmtINR(BUILDER_RECO_DATA.auditReconciliation.tallyBooks)}</td></tr>
            <tr style="color:#b91c1c;"><td><strong>Audit Discrepancy (Diffn)</strong></td><td class="num">${fmtINR(BUILDER_RECO_DATA.auditReconciliation.difference)}</td></tr>
            <tr><td>22.07.2023: STVAT-A-805-Prasad Yadavilli (3-mo maintenance refund)</td><td class="num">-₹9,270.00</td></tr>
            <tr><td>15.12.2023: B Bldg F & F Maintenance Trf</td><td class="num">-₹5,00,000.00</td></tr>
            <tr><td>Bank Charges</td><td class="num">-₹1.17</td></tr>
            <tr class="total" style="background:#dcfce7; font-size:15px;"><td><strong>Final Tally Book Balance (31.03.2026)</strong></td><td class="num"><strong>${fmtINR(BUILDER_RECO_DATA.postPeriodLedger.closingBalance)}</strong></td></tr>
          </tbody>
        </table>
      </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  const handleExportWingACSV = () => {
    const lines = [];
    lines.push(`"${WING_A_AUDITED_STATEMENT.meta.societyName}"`);
    lines.push(`"${WING_A_AUDITED_STATEMENT.meta.title} (${WING_A_AUDITED_STATEMENT.meta.period})"`);
    lines.push(`"Auditor: ${WING_A_AUDITED_STATEMENT.meta.auditor.firm} (FRN: ${WING_A_AUDITED_STATEMENT.meta.auditor.frn})"`);
    lines.push('');
    lines.push('"INCOME"');
    lines.push('"Particulars","Amount (Rs.)"');
    WING_A_AUDITED_STATEMENT.income.items.forEach(i => {
      lines.push(`"${i.particular}",${i.amount}`);
    });
    lines.push(`"Total Income",${WING_A_AUDITED_STATEMENT.income.totalIncome}`);
    lines.push('');
    lines.push('"EXPENDITURE"');
    lines.push('"Particulars","Category","Amount (Rs.)"');
    WING_A_AUDITED_STATEMENT.expenditure.items.forEach(e => {
      lines.push(`"${e.particular}","${e.category}",${e.amount}`);
    });
    lines.push(`"Total Expenditure",,${WING_A_AUDITED_STATEMENT.expenditure.totalExpenditure}`);
    lines.push('');
    lines.push(`"Surplus / Deficit",,${WING_A_AUDITED_STATEMENT.surplus}`);

    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `Wing_A_Audited_Statement_2019_2021_${todayISO()}.csv`;
    a.click();
  };

  // ── Print Audit Statement ───────────────────────────────────────────────────

  const handlePrintWingA = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>${WING_A_AUDITED_STATEMENT.meta.societyName} - Income & Expenditure</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; margin: 30px; color: #1d2a24; }
          h1 { color: #0b2b26; font-size: 18px; margin-bottom: 2px; }
          .sub { color: #5f665f; font-size: 13px; margin-bottom: 18px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
          th, td { border: 1px solid #d1d5db; padding: 7px 12px; font-size: 13px; }
          th { background: #f3f4f6; text-align: left; }
          .num { text-align: right; }
          .total { font-weight: bold; background: #f9fafb; }
          .surplus { background: #ecfdf5; font-weight: bold; font-size: 14px; }
        </style>
      </head>
      <body>
        <h1>${WING_A_AUDITED_STATEMENT.meta.societyName}</h1>
        <div class="sub">${WING_A_AUDITED_STATEMENT.meta.title} for the period from ${WING_A_AUDITED_STATEMENT.meta.period}</div>
        
        <h3>Income</h3>
        <table>
          <thead><tr><th>Particulars</th><th class="num">Amount (Rs.)</th></tr></thead>
          <tbody>
            ${WING_A_AUDITED_STATEMENT.income.items.map(i => `<tr><td>${i.particular}</td><td class="num">${fmtINR(i.amount)}</td></tr>`).join('')}
            <tr class="total"><td>Total Income</td><td class="num">${fmtINR(WING_A_AUDITED_STATEMENT.income.totalIncome)}</td></tr>
          </tbody>
        </table>

        <h3>Expenditure</h3>
        <table>
          <thead><tr><th>Particulars</th><th>Category</th><th class="num">Amount (Rs.)</th></tr></thead>
          <tbody>
            ${WING_A_AUDITED_STATEMENT.expenditure.items.map(e => `<tr><td>${e.particular}</td><td>${e.category}</td><td class="num">${fmtINR(e.amount)}</td></tr>`).join('')}
            <tr class="total"><td>Total Expenditure</td><td></td><td class="num">${fmtINR(WING_A_AUDITED_STATEMENT.expenditure.totalExpenditure)}</td></tr>
            <tr class="surplus"><td>Surplus / Deficit</td><td></td><td class="num">${fmtINR(WING_A_AUDITED_STATEMENT.surplus)}</td></tr>
          </tbody>
        </table>

        <div style="margin-top: 30px; font-size: 12px; color: #5f665f;">
          <div><strong>Audited by:</strong> ${WING_A_AUDITED_STATEMENT.meta.auditor.firm} (${WING_A_AUDITED_STATEMENT.meta.auditor.designation})</div>
          <div>FRN: ${WING_A_AUDITED_STATEMENT.meta.auditor.frn} | ${WING_A_AUDITED_STATEMENT.meta.auditor.proprietor} (M. No. ${WING_A_AUDITED_STATEMENT.meta.auditor.membershipNo})</div>
          <div>Co-Op. Dept. Empanelment No: ${WING_A_AUDITED_STATEMENT.meta.auditor.coopDeptEmpanelmentNo}</div>
        </div>
      </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  const handleExportBOMCSV = () => {
    const lines = [
      '#,"Date","Cr/Dr","Particulars","Voucher Type","Voucher No.","Remark / Category","Wing","Debit (Inflow Rs.)","Credit (Outflow Rs.)","Passbook Page"'
    ];
    filteredLedger.forEach(t => {
      lines.push(`${t.id},"${t.date}","${t.crdr}","${t.particulars.replace(/"/g, '""')}","${t.vchType}","${t.vchNo}","${t.remark}","${t.wing}",${t.debit},${t.credit},"Page ${t.page}"`);
    });
    lines.push('');
    lines.push(`,"TOTALS",,,,,,,${ledgerTotals.debit},${ledgerTotals.credit},`);
    lines.push(`,"NET DIFFERENCE (Debit - Credit)",,,,,,,${ledgerTotals.debit - ledgerTotals.credit},,`);

    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `BOM_Passbook_A_c_60305942224_Ledger_${todayISO()}.csv`;
    a.click();
  };

  const handlePrintBOM = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>BOM Maintenance A/c 60305942224 Passbook Ledger</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; margin: 24px; color: #1d2a24; }
          h1 { color: #0b2b26; font-size: 18px; margin-bottom: 2px; }
          .sub { color: #5f665f; font-size: 12px; margin-bottom: 16px; }
          .metrics { display: flex; gap: 12px; margin-bottom: 16px; flex-wrap: wrap; }
          .card { border: 1px solid #d1d5db; border-radius: 8px; padding: 10px 14px; flex: 1; min-width: 140px; }
          .card-title { font-size: 11px; text-transform: uppercase; color: #6b7280; font-weight: 700; }
          .card-val { font-size: 16px; font-weight: bold; margin-top: 3px; color: #0b2b26; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
          th, td { border: 1px solid #d1d5db; padding: 6px 8px; font-size: 11px; }
          th { background: #f3f4f6; text-align: left; }
          .num { text-align: right; }
          .total { font-weight: bold; background: #f9fafb; }
        </style>
      </head>
      <body>
        <h1>${BOM_PASSBOOK_LEDGER.meta.title}</h1>
        <div class="sub">Period: ${BOM_PASSBOOK_LEDGER.meta.period} | Hand Note: ${BOM_PASSBOOK_LEDGER.meta.handwrittenSummary} | Printed: ${new Date().toLocaleDateString('en-IN')}</div>
        
        <div class="metrics">
          <div class="card"><div class="card-title">Total Inflows (Debits)</div><div class="card-val">${fmtINR(BOM_PASSBOOK_LEDGER.meta.totals.totalDebit)}</div></div>
          <div class="card"><div class="card-title">Total Outflows (Credits)</div><div class="card-val" style="color:#b91c1c;">${fmtINR(BOM_PASSBOOK_LEDGER.meta.totals.totalCredit)}</div></div>
          <div class="card"><div class="card-title">Closing Passbook Difference</div><div class="card-val" style="color:#047857;">${fmtINR(BOM_PASSBOOK_LEDGER.meta.totals.closingBalance)}</div></div>
          <div class="card"><div class="card-title">Wing A Outflows</div><div class="card-val">${fmtINR(BOM_PASSBOOK_LEDGER.meta.wingBreakdown.A.credits)}</div></div>
          <div class="card"><div class="card-title">Wing B Outflows</div><div class="card-val">${fmtINR(BOM_PASSBOOK_LEDGER.meta.wingBreakdown.B.credits)}</div></div>
        </div>

        <table>
          <thead>
            <tr>
              <th>#</th><th>Date</th><th>Cr/Dr</th><th>Particulars</th><th>Vch Type</th><th>Vch No</th><th>Remark</th><th>Wing</th><th class="num">Debit (₹)</th><th class="num">Credit (₹)</th><th>Pg</th>
            </tr>
          </thead>
          <tbody>
            ${filteredLedger.map(t => `
              <tr>
                <td>${t.id}</td>
                <td>${t.date}</td>
                <td>${t.crdr}</td>
                <td>${t.particulars}</td>
                <td>${t.vchType}</td>
                <td>${t.vchNo}</td>
                <td>${t.remark}</td>
                <td><strong>${t.wing}</strong></td>
                <td class="num">${t.debit ? fmtINR(t.debit) : '—'}</td>
                <td class="num">${t.credit ? fmtINR(t.credit) : '—'}</td>
                <td>P${t.page}</td>
              </tr>
            `).join('')}
            <tr class="total">
              <td colspan="8">TOTALS (${filteredLedger.length} items)</td>
              <td class="num">${fmtINR(ledgerTotals.debit)}</td>
              <td class="num">${fmtINR(ledgerTotals.credit)}</td>
              <td></td>
            </tr>
            <tr class="total" style="background:#ecfdf5;">
              <td colspan="8">NET DIFFERENCE (Debit - Credit)</td>
              <td colspan="2" class="num" style="color:#065f46; font-size:13px;">${fmtINR(ledgerTotals.debit - ledgerTotals.credit)}</td>
              <td></td>
            </tr>
          </tbody>
        </table>
      </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* ── Executive Header Banner ── */}
      <div style={{
        background: 'linear-gradient(135deg, #0b2b26 0%, #133e36 50%, #1b4d42 100%)',
        borderRadius: 18,
        padding: '20px 24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 16,
        boxShadow: '0 8px 24px rgba(11, 43, 38, 0.12)',
        border: '1px solid rgba(196, 155, 79, 0.28)',
        color: '#ffffff'
      }}>
        <div style={{ flex: '1 1 340px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6, flexWrap: 'wrap' }}>
            <span style={{
              background: 'rgba(196, 155, 79, 0.25)',
              color: '#fef3c7',
              border: '1px solid rgba(196, 155, 79, 0.45)',
              fontSize: '0.64rem',
              fontWeight: 800,
              padding: '2.5px 8px',
              borderRadius: 6,
              letterSpacing: '0.08em',
              textTransform: 'uppercase'
            }}>
              BUILDER ENGAGEMENT &amp; WORKS
            </span>
            <span style={{
              background: 'rgba(255, 255, 255, 0.1)',
              color: 'rgba(255, 255, 255, 0.9)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              fontSize: '0.64rem',
              fontWeight: 700,
              padding: '2.5px 8px',
              borderRadius: 6
            }}>
              Eisha Asset Developers
            </span>
            <span style={{
              background: 'rgba(110, 231, 183, 0.15)',
              color: '#6ee7b7',
              border: '1px solid rgba(110, 231, 183, 0.3)',
              fontSize: '0.64rem',
              fontWeight: 700,
              padding: '2.5px 8px',
              borderRadius: 6
            }}>
              Certified Audit Statements
            </span>
          </div>

          <h2 style={{
            margin: '0 0 4px',
            fontSize: '1.35rem',
            fontWeight: 800,
            color: '#ffffff',
            fontFamily: 'Fraunces, serif',
            letterSpacing: '-0.01em'
          }}>
            Builder Discuss Ledger
          </h2>
          <p style={{
            margin: 0,
            color: 'rgba(255, 255, 255, 0.76)',
            fontSize: '0.82rem',
            lineHeight: 1.45
          }}>
            Independent developer reconciliations, CA Hardik Mehta recoverable report, Wing A certified audit &amp; verified BOM passbook
          </p>
        </div>

        {/* Executive High-Impact Stat Badges */}
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          {/* CA Recoverable Claim */}
          <div style={{
            background: 'rgba(239, 68, 68, 0.18)',
            border: '1.5px solid rgba(248, 113, 113, 0.45)',
            borderRadius: 12,
            padding: '10px 16px',
            minWidth: 140,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center'
          }}>
            <div style={{
              fontSize: '0.64rem',
              color: '#fed7aa',
              fontWeight: 800,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              display: 'flex',
              alignItems: 'center',
              gap: 4
            }}>
              <span>⚖️</span> CA Claim Dues
            </div>
            <div style={{
              fontSize: '1.25rem',
              fontWeight: 800,
              color: '#fca5a5',
              lineHeight: 1.15,
              marginTop: 3,
              fontFamily: 'system-ui, -apple-system, sans-serif'
            }}>
              {fmtINR(CA_HARDIK_MEHTA_REPORT?.meta?.keyFigures?.amountReceivable || 1207058)}
            </div>
            <div style={{ fontSize: '0.62rem', color: 'rgba(255, 255, 255, 0.65)', marginTop: 2 }}>
              Net Receivable (Oct 21–Dec 25)
            </div>
          </div>

          {/* Unspent Tally Closing Balance */}
          <div style={{
            background: 'rgba(196, 155, 79, 0.18)',
            border: '1.5px solid rgba(196, 155, 79, 0.45)',
            borderRadius: 12,
            padding: '10px 16px',
            minWidth: 140,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center'
          }}>
            <div style={{
              fontSize: '0.64rem',
              color: '#fde68a',
              fontWeight: 800,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              display: 'flex',
              alignItems: 'center',
              gap: 4
            }}>
              <span>🏦</span> Unspent Tally
            </div>
            <div style={{
              fontSize: '1.25rem',
              fontWeight: 800,
              color: '#fef3c7',
              lineHeight: 1.15,
              marginTop: 3,
              fontFamily: 'system-ui, -apple-system, sans-serif'
            }}>
              {fmtINR(BUILDER_RECO_DATA.postPeriodLedger.closingBalance)}
            </div>
            <div style={{ fontSize: '0.62rem', color: 'rgba(255, 255, 255, 0.65)', marginTop: 2 }}>
              As on 31.03.2026 (Phase II)
            </div>
          </div>
        </div>
      </div>

      {/* ── Modern Segmented Sub-Tabs Bar ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: 6,
        background: 'rgba(61, 63, 52, 0.06)',
        padding: '5px',
        borderRadius: 14,
        border: '1px solid rgba(61, 63, 52, 0.1)'
      }}>
        {[
          {
            id: 'reco',
            icon: '📑',
            title: 'Phase II Maintenance Reco',
            sub: 'Wings A & B Reco Sheet',
            badge: 'Tally Reco',
            badgeActiveBg: '#ecfdf5',
            badgeActiveColor: '#065f46',
            badgeInactiveBg: 'rgba(61, 63, 52, 0.08)',
            badgeInactiveColor: '#5f665f'
          },
          {
            id: 'caReport',
            icon: '⚖️',
            title: 'CA Hardik Mehta Report',
            sub: 'UDIN 26162502TFCJWK8860',
            badge: '₹12.07L Dues',
            badgeActiveBg: '#fee2e2',
            badgeActiveColor: '#991b1b',
            badgeInactiveBg: 'rgba(239, 68, 68, 0.12)',
            badgeInactiveColor: '#b91c1c'
          },
          {
            id: 'wingA',
            icon: '📜',
            title: 'Wing A Certified Audit',
            sub: 'Rohit Dhage CA • 2019–2021',
            badge: 'CA Certified',
            badgeActiveBg: '#e0f2fe',
            badgeActiveColor: '#0369a1',
            badgeInactiveBg: 'rgba(3, 105, 161, 0.1)',
            badgeInactiveColor: '#0284c7'
          },
          {
            id: 'ledger',
            icon: '📒',
            title: 'BOM Passbook Ledger',
            sub: 'A/c 60305942224 (2021–2023)',
            badge: '135 Txs • ₹50.05L',
            badgeActiveBg: '#fef3c7',
            badgeActiveColor: '#92400e',
            badgeInactiveBg: 'rgba(146, 64, 14, 0.1)',
            badgeInactiveColor: '#b45309'
          },
          {
            id: 'bomAnalytics',
            icon: '🔬',
            title: 'BOM vs CA Missing Bills',
            sub: 'Forensic Cross-Audit Analytics',
            badge: '₹4.09L Missing',
            badgeActiveBg: '#fee2e2',
            badgeActiveColor: '#991b1b',
            badgeInactiveBg: 'rgba(239, 68, 68, 0.12)',
            badgeInactiveColor: '#b91c1c'
          }
        ].map(tab => {
          const active = subTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setSubTab(tab.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '9px 12px',
                borderRadius: 10,
                border: active ? '1.5px solid rgba(196, 155, 79, 0.4)' : '1.5px solid transparent',
                background: active ? '#ffffff' : 'transparent',
                color: active ? '#1d2a24' : '#5f665f',
                cursor: 'pointer',
                transition: 'all 0.18s ease',
                boxShadow: active ? '0 3px 10px rgba(11, 43, 38, 0.08)' : 'none',
                textAlign: 'left'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                <span style={{ fontSize: '1.15rem', flexShrink: 0 }}>{tab.icon}</span>
                <div style={{ minWidth: 0 }}>
                  <div style={{
                    fontSize: '0.82rem',
                    fontWeight: active ? 800 : 600,
                    color: active ? '#0b2b26' : '#374151',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}>
                    {tab.title}
                  </div>
                  <div style={{
                    fontSize: '0.67rem',
                    color: active ? '#196c6c' : '#9ca3af',
                    fontWeight: 500,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}>
                    {tab.sub}
                  </div>
                </div>
              </div>
              <span style={{
                background: active ? tab.badgeActiveBg : tab.badgeInactiveBg,
                color: active ? tab.badgeActiveColor : tab.badgeInactiveColor,
                padding: '2.5px 7px',
                borderRadius: 6,
                fontSize: '0.66rem',
                fontWeight: 700,
                flexShrink: 0,
                marginLeft: 6
              }}>
                {tab.badge}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── TAB: CA HARDIK MEHTA RECOVERABLE REPORT (22 FEB 2026) ───────────── */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {subTab === 'caReport' && (
        <CAHardikMehtaReportView
          isAdmin={isAdmin}
          onOpenBOMAnalytics={() => setSubTab('bomAnalytics')}
        />
      )}

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* ── TAB 1: DEVELOPER MAINTENANCE RECONCILIATION ────────────────────── */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {subTab === 'reco' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Action Toolbar & Document Inspection */}
          <div style={{
            background: '#ffffff',
            borderRadius: 14,
            padding: '10px 16px',
            border: '1px solid rgba(61, 63, 52, 0.12)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 10,
            boxShadow: '0 2px 8px rgba(11, 43, 38, 0.04)'
          }}>
            {/* Wing Scope Segmented Selector */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#196c6c', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Scope:
              </span>
              <div style={{
                display: 'inline-flex',
                background: '#f4efe7',
                padding: '3px',
                borderRadius: 9,
                gap: 2,
                border: '1px solid rgba(61, 63, 52, 0.08)'
              }}>
                {[
                  { id: 'all', label: 'All Wings (Consolidated A & B)' },
                  { id: 'A', label: 'Wing A (Sep 2019)' },
                  { id: 'B', label: 'Wing B (Jan 2019)' }
                ].map(w => {
                  const active = wingFilter === w.id;
                  return (
                    <button
                      key={w.id}
                      onClick={() => setWingFilter(w.id)}
                      style={{
                        padding: '5px 12px',
                        borderRadius: 7,
                        border: 'none',
                        fontSize: '0.76rem',
                        fontWeight: active ? 700 : 500,
                        cursor: 'pointer',
                        background: active ? '#ffffff' : 'transparent',
                        color: active ? '#0b2b26' : '#5f665f',
                        boxShadow: active ? '0 1px 4px rgba(0, 0, 0, 0.08)' : 'none',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      {w.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <button
                onClick={() => { setModalDefaultDoc('phase2'); setShowDocModal(true); }}
                style={{
                  padding: '7px 14px',
                  borderRadius: 8,
                  border: '1.5px solid rgba(196, 155, 79, 0.5)',
                  background: 'rgba(196, 155, 79, 0.1)',
                  color: '#92400e',
                  fontWeight: 700,
                  fontSize: '0.78rem',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  transition: 'all 0.15s ease'
                }}
                title="View high-resolution scan of developer audit sheet"
              >
                <span>🔍</span>
                <span>Inspect Scanned Audit Sheet</span>
              </button>

              <button
                onClick={handleExportRecoCSV}
                style={{
                  padding: '7px 12px',
                  borderRadius: 8,
                  border: '1px solid rgba(61, 63, 52, 0.18)',
                  background: '#ffffff',
                  color: '#1d2a24',
                  fontWeight: 600,
                  fontSize: '0.78rem',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5
                }}
              >
                <span>📥</span>
                <span>Export CSV</span>
              </button>

              <button
                onClick={handlePrintReco}
                style={{
                  padding: '7px 12px',
                  borderRadius: 8,
                  border: 'none',
                  background: '#0b2b26',
                  color: '#ffffff',
                  fontWeight: 600,
                  fontSize: '0.78rem',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5
                }}
              >
                <span>🖨️</span>
                <span>Print Statement</span>
              </button>
            </div>
          </div>

          {/* Key Summary Cards Row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
            <div style={{
              background: '#ffffff', borderRadius: 16, padding: '18px 20px',
              border: '1.5px solid rgba(61, 63, 52, 0.1)', boxShadow: '0 2px 10px rgba(11, 43, 38, 0.04)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#16a34a', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Total Receipts Collected
                </span>
                <span style={{ background: '#dcfce7', color: '#166534', padding: '2px 6px', borderRadius: 6, fontSize: '0.68rem', fontWeight: 700 }}>
                  Inflow
                </span>
              </div>
              <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#1d2a24' }}>
                {wingFilter === 'A' ? fmtINR(BUILDER_RECO_DATA.totalReceipts.wingA) : wingFilter === 'B' ? fmtINR(BUILDER_RECO_DATA.totalReceipts.wingB) : fmtINR(BUILDER_RECO_DATA.totalReceipts.total)}
              </div>
              <div style={{ fontSize: '0.76rem', color: '#5f665f', marginTop: 6 }}>
                Wing A: <strong>{fmtINR(BUILDER_RECO_DATA.totalReceipts.wingA)}</strong> • Wing B: <strong>{fmtINR(BUILDER_RECO_DATA.totalReceipts.wingB)}</strong>
              </div>
            </div>

            <div style={{
              background: '#ffffff', borderRadius: 16, padding: '18px 20px',
              border: '1.5px solid rgba(61, 63, 52, 0.1)', boxShadow: '0 2px 10px rgba(11, 43, 38, 0.04)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#c2410c', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Net Total Expenses (I + II)
                </span>
                <span style={{ background: '#ffedd5', color: '#9a3412', padding: '2px 6px', borderRadius: 6, fontSize: '0.68rem', fontWeight: 700 }}>
                  After Cost Shift
                </span>
              </div>
              <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#1d2a24' }}>
                {wingFilter === 'A' ? fmtINR(BUILDER_RECO_DATA.totalExpensesNet.wingA) : wingFilter === 'B' ? fmtINR(BUILDER_RECO_DATA.totalExpensesNet.wingB) : fmtINR(BUILDER_RECO_DATA.totalExpensesNet.total)}
              </div>
              <div style={{ fontSize: '0.76rem', color: '#5f665f', marginTop: 6 }}>
                Wing A: <strong>{fmtINR(BUILDER_RECO_DATA.totalExpensesNet.wingA)}</strong> • Wing B: <strong>{fmtINR(BUILDER_RECO_DATA.totalExpensesNet.wingB)}</strong>
              </div>
            </div>

            <div style={{
              background: '#ffffff', borderRadius: 16, padding: '18px 20px',
              border: '1.5px solid rgba(61, 63, 52, 0.1)', boxShadow: '0 2px 10px rgba(11, 43, 38, 0.04)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#196c6c', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Working Net Balance (31.03.2023)
                </span>
                <span style={{ background: '#dff5f1', color: '#196c6c', padding: '2px 6px', borderRadius: 6, fontSize: '0.68rem', fontWeight: 700 }}>
                  Surplus
                </span>
              </div>
              <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#1d2a24' }}>
                {wingFilter === 'A' ? fmtINR(BUILDER_RECO_DATA.netBalanceWorking.wingA) : wingFilter === 'B' ? fmtINR(BUILDER_RECO_DATA.netBalanceWorking.wingB) : fmtINR(BUILDER_RECO_DATA.netBalanceWorking.total)}
              </div>
              <div style={{ fontSize: '0.76rem', color: '#5f665f', marginTop: 6 }}>
                Receipts − Net Expenses (Wing A: ₹1.15L | Wing B: ₹4.98L)
              </div>
            </div>

            <div style={{
              background: '#ffffff', borderRadius: 16, padding: '18px 20px',
              border: '1.5px solid rgba(196, 155, 79, 0.3)', boxShadow: '0 2px 10px rgba(196, 155, 79, 0.08)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#92400e', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Current Tally Balance (31.03.2026)
                </span>
                <span style={{ background: '#fef3c7', color: '#92400e', padding: '2px 6px', borderRadius: 6, fontSize: '0.68rem', fontWeight: 700 }}>
                  Available
                </span>
              </div>
              <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#0b2b26' }}>
                {fmtINR(BUILDER_RECO_DATA.postPeriodLedger.closingBalance)}
              </div>
              <div style={{ fontSize: '0.76rem', color: '#92400e', marginTop: 6 }}>
                After ₹5,00,000 F&amp;F Transfer &amp; ₹9,270 Refund
              </div>
            </div>
          </div>

          {/* ── Table 1: Expenses Breakdown till 26.11.2021 ── */}
          <div style={{
            background: 'rgba(255, 250, 242, 0.95)',
            border: '1px solid rgba(61, 63, 52, 0.1)',
            borderRadius: 20,
            overflow: 'hidden',
            boxShadow: '0 2px 12px rgba(11, 43, 38, 0.05)'
          }}>
            <div style={{
              padding: '14px 20px',
              borderBottom: '1px solid rgba(61, 63, 52, 0.1)',
              background: '#fffaf2',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 8
            }}>
              <div>
                <h3 style={{ margin: '0 0 2px', fontSize: '1.05rem', fontWeight: 800, color: '#1d2a24', fontFamily: 'Fraunces, serif' }}>
                  I. Phase II Maintenance Expenses (Up to 26.11.2021)
                </h3>
                <p style={{ margin: 0, fontSize: '0.78rem', color: '#5f665f' }}>
                  Audited base expenses prior to common cost shift reallocations
                </p>
              </div>
              <button
                onClick={() => setSubTab('wingA')}
                style={{
                  background: 'rgba(25, 108, 108, 0.1)', color: '#196c6c',
                  border: '1px solid rgba(25, 108, 108, 0.25)',
                  padding: '5px 12px', borderRadius: 12, fontSize: '0.75rem',
                  fontWeight: 700, cursor: 'pointer'
                }}
              >
                📜 View Wing A Itemized CA Audit (₹22,19,896) →
              </button>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 650 }}>
                <thead>
                  <tr style={{ background: 'rgba(244, 239, 231, 0.95)', borderBottom: '2px solid rgba(61, 63, 52, 0.1)' }}>
                    <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: '#5f665f' }}>
                      Expenditure Head
                    </th>
                    {(wingFilter === 'all' || wingFilter === 'A') && (
                      <th style={{ padding: '10px 16px', textAlign: 'right', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: '#196c6c', width: 160 }}>
                        Wing A (Sep 2019)
                      </th>
                    )}
                    {(wingFilter === 'all' || wingFilter === 'B') && (
                      <th style={{ padding: '10px 16px', textAlign: 'right', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: '#196c6c', width: 160 }}>
                        Wing B (Jan 2019)
                      </th>
                    )}
                    {wingFilter === 'all' && (
                      <th style={{ padding: '10px 16px', textAlign: 'right', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: '#1d2a24', width: 180 }}>
                        Consolidated (A + B)
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {BUILDER_RECO_DATA.expenses.map((e, idx) => (
                    <tr key={e.id} style={{ background: idx % 2 === 0 ? '#ffffff' : 'rgba(255, 252, 247, 0.7)', borderBottom: '1px solid rgba(61, 63, 52, 0.08)' }}>
                      <td style={{ padding: '11px 16px', fontSize: '0.85rem', color: '#1d2a24' }}>
                        <div style={{ fontWeight: 600 }}>{e.label}</div>
                        <div style={{ fontSize: '0.74rem', color: '#5f665f', marginTop: 2 }}>{e.notes}</div>
                      </td>
                      {(wingFilter === 'all' || wingFilter === 'A') && (
                        <td style={{ padding: '11px 16px', textAlign: 'right', fontSize: '0.88rem', fontWeight: 600, color: '#1d2a24' }}>
                          {fmtINR(e.wingA)}
                        </td>
                      )}
                      {(wingFilter === 'all' || wingFilter === 'B') && (
                        <td style={{ padding: '11px 16px', textAlign: 'right', fontSize: '0.88rem', fontWeight: 600, color: '#1d2a24' }}>
                          {fmtINR(e.wingB)}
                        </td>
                      )}
                      {wingFilter === 'all' && (
                        <td style={{ padding: '11px 16px', textAlign: 'right', fontSize: '0.88rem', fontWeight: 700, color: '#1d2a24' }}>
                          {fmtINR(e.total)}
                        </td>
                      )}
                    </tr>
                  ))}
                  {/* Subtotal I Row */}
                  <tr style={{ background: 'rgba(25, 108, 108, 0.08)', borderTop: '2px solid rgba(25, 108, 108, 0.2)', fontWeight: 800 }}>
                    <td style={{ padding: '12px 16px', fontSize: '0.88rem', color: '#0b2b26' }}>
                      {BUILDER_RECO_DATA.totalExpensesI.label}
                    </td>
                    {(wingFilter === 'all' || wingFilter === 'A') && (
                      <td style={{ padding: '12px 16px', textAlign: 'right', fontSize: '0.95rem', color: '#0b2b26' }}>
                        {fmtINR(BUILDER_RECO_DATA.totalExpensesI.wingA)}
                      </td>
                    )}
                    {(wingFilter === 'all' || wingFilter === 'B') && (
                      <td style={{ padding: '12px 16px', textAlign: 'right', fontSize: '0.95rem', color: '#0b2b26' }}>
                        {fmtINR(BUILDER_RECO_DATA.totalExpensesI.wingB)}
                      </td>
                    )}
                    {wingFilter === 'all' && (
                      <td style={{ padding: '12px 16px', textAlign: 'right', fontSize: '1rem', color: '#0b2b26' }}>
                        {fmtINR(BUILDER_RECO_DATA.totalExpensesI.total)}
                      </td>
                    )}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* ── Table 2: Cost Shift (From Wing B to Wing A) ── */}
          <div style={{
            background: 'rgba(255, 250, 242, 0.95)',
            border: '1px solid rgba(61, 63, 52, 0.1)',
            borderRadius: 20,
            overflow: 'hidden',
            boxShadow: '0 2px 12px rgba(11, 43, 38, 0.05)'
          }}>
            <div style={{
              padding: '14px 20px',
              borderBottom: '1px solid rgba(61, 63, 52, 0.1)',
              background: '#fffaf2',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 8
            }}>
              <div>
                <h3 style={{ margin: '0 0 2px', fontSize: '1.05rem', fontWeight: 800, color: '#1d2a24', fontFamily: 'Fraunces, serif' }}>
                  II. Common Facility Cost Shifts (Shifted from Wing B to Wing A)
                </h3>
                <p style={{ margin: 0, fontSize: '0.78rem', color: '#5f665f' }}>
                  Reallocation of common amenities and utility bills originally charged to Wing B
                </p>
              </div>
              <span style={{ background: '#fef3c7', color: '#92400e', padding: '4px 10px', borderRadius: 12, fontSize: '0.72rem', fontWeight: 700 }}>
                Total Reallocated: ₹4,68,645.00
              </span>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 650 }}>
                <thead>
                  <tr style={{ background: 'rgba(244, 239, 231, 0.95)', borderBottom: '2px solid rgba(61, 63, 52, 0.1)' }}>
                    <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: '#5f665f' }}>
                      Reallocated Item &amp; Details
                    </th>
                    {(wingFilter === 'all' || wingFilter === 'A') && (
                      <th style={{ padding: '10px 16px', textAlign: 'right', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: '#c2410c', width: 160 }}>
                        Wing A (+ Charge)
                      </th>
                    )}
                    {(wingFilter === 'all' || wingFilter === 'B') && (
                      <th style={{ padding: '10px 16px', textAlign: 'right', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: '#16a34a', width: 160 }}>
                        Wing B (− Relief)
                      </th>
                    )}
                    {wingFilter === 'all' && (
                      <th style={{ padding: '10px 16px', textAlign: 'right', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: '#1d2a24', width: 180 }}>
                        Net Society Shift
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {BUILDER_RECO_DATA.costShifts.map((c, idx) => (
                    <tr key={c.id} style={{ background: idx % 2 === 0 ? '#ffffff' : 'rgba(255, 252, 247, 0.7)', borderBottom: '1px solid rgba(61, 63, 52, 0.08)' }}>
                      <td style={{ padding: '11px 16px', fontSize: '0.85rem', color: '#1d2a24' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontWeight: 700 }}>{c.label}</span>
                          <span style={{ background: 'rgba(196, 155, 79, 0.15)', color: '#92400e', fontSize: '0.7rem', padding: '1px 6px', borderRadius: 4, fontWeight: 700 }}>
                            {c.category}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.74rem', color: '#5f665f', marginTop: 2 }}>{c.notes}</div>
                      </td>
                      {(wingFilter === 'all' || wingFilter === 'A') && (
                        <td style={{ padding: '11px 16px', textAlign: 'right', fontSize: '0.88rem', fontWeight: 600, color: '#c2410c' }}>
                          +{fmtINR(c.wingA)}
                        </td>
                      )}
                      {(wingFilter === 'all' || wingFilter === 'B') && (
                        <td style={{ padding: '11px 16px', textAlign: 'right', fontSize: '0.88rem', fontWeight: 600, color: '#16a34a' }}>
                          {fmtINR(c.wingB)}
                        </td>
                      )}
                      {wingFilter === 'all' && (
                        <td style={{ padding: '11px 16px', textAlign: 'right', fontSize: '0.88rem', color: '#5f665f' }}>
                          ₹0.00
                        </td>
                      )}
                    </tr>
                  ))}
                  <tr style={{ background: 'rgba(196, 155, 79, 0.12)', borderTop: '2px solid rgba(196, 155, 79, 0.3)', fontWeight: 800 }}>
                    <td style={{ padding: '12px 16px', fontSize: '0.88rem', color: '#92400e' }}>
                      {BUILDER_RECO_DATA.totalCostShiftII.label}
                    </td>
                    {(wingFilter === 'all' || wingFilter === 'A') && (
                      <td style={{ padding: '12px 16px', textAlign: 'right', fontSize: '0.95rem', color: '#c2410c' }}>
                        +{fmtINR(BUILDER_RECO_DATA.totalCostShiftII.wingA)}
                      </td>
                    )}
                    {(wingFilter === 'all' || wingFilter === 'B') && (
                      <td style={{ padding: '12px 16px', textAlign: 'right', fontSize: '0.95rem', color: '#16a34a' }}>
                        {fmtINR(BUILDER_RECO_DATA.totalCostShiftII.wingB)}
                      </td>
                    )}
                    {wingFilter === 'all' && (
                      <td style={{ padding: '12px 16px', textAlign: 'right', fontSize: '0.95rem', color: '#5f665f' }}>
                        ₹0.00 (Neutral)
                      </td>
                    )}
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Total Expenses (I + II) Callout */}
            <div style={{
              background: 'linear-gradient(135deg, #0b2b26 0%, #196c6c 100%)',
              padding: '16px 20px',
              color: '#ffffff',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 12
            }}>
              <div>
                <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#C49B4F', fontWeight: 800 }}>
                  FINAL NET OPERATING EXPENDITURE
                </div>
                <div style={{ fontSize: '1.15rem', fontWeight: 800, fontFamily: 'Fraunces, serif' }}>
                  Total Expenses (I + II)
                </div>
              </div>
              <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
                {(wingFilter === 'all' || wingFilter === 'A') && (
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase' }}>Wing A Net</div>
                    <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#fef3c7' }}>{fmtINR(BUILDER_RECO_DATA.totalExpensesNet.wingA)}</div>
                  </div>
                )}
                {(wingFilter === 'all' || wingFilter === 'B') && (
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase' }}>Wing B Net</div>
                    <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#fef3c7' }}>{fmtINR(BUILDER_RECO_DATA.totalExpensesNet.wingB)}</div>
                  </div>
                )}
                {wingFilter === 'all' && (
                  <div style={{ textAlign: 'right', borderLeft: '1px solid rgba(255,255,255,0.2)', paddingLeft: 20 }}>
                    <div style={{ fontSize: '0.68rem', color: '#6ee7b7', textTransform: 'uppercase', fontWeight: 800 }}>Grand Total</div>
                    <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#6ee7b7' }}>{fmtINR(BUILDER_RECO_DATA.totalExpensesNet.total)}</div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── Table 3 & 4: Receipts & Net Working Balance ── */}
          <div style={{
            background: 'rgba(255, 250, 242, 0.95)',
            border: '1px solid rgba(61, 63, 52, 0.1)',
            borderRadius: 20,
            overflow: 'hidden',
            boxShadow: '0 2px 12px rgba(11, 43, 38, 0.05)'
          }}>
            <div style={{
              padding: '14px 20px',
              borderBottom: '1px solid rgba(61, 63, 52, 0.1)',
              background: '#fffaf2',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 8
            }}>
              <div>
                <h3 style={{ margin: '0 0 2px', fontSize: '1.05rem', fontWeight: 800, color: '#1d2a24', fontFamily: 'Fraunces, serif' }}>
                  III. Maintenance Receipts &amp; Net Working Balance
                </h3>
                <p style={{ margin: 0, fontSize: '0.78rem', color: '#5f665f' }}>
                  Total inflows from account opening, resident collections and vendor rentals
                </p>
              </div>
              <span style={{ background: '#dcfce7', color: '#166534', padding: '4px 10px', borderRadius: 12, fontSize: '0.72rem', fontWeight: 700 }}>
                Total Inflows: ₹1,25,89,569.00
              </span>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 650 }}>
                <thead>
                  <tr style={{ background: 'rgba(244, 239, 231, 0.95)', borderBottom: '2px solid rgba(61, 63, 52, 0.1)' }}>
                    <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: '#5f665f' }}>
                      Receipt Category
                    </th>
                    {(wingFilter === 'all' || wingFilter === 'A') && (
                      <th style={{ padding: '10px 16px', textAlign: 'right', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: '#16a34a', width: 160 }}>
                        Wing A
                      </th>
                    )}
                    {(wingFilter === 'all' || wingFilter === 'B') && (
                      <th style={{ padding: '10px 16px', textAlign: 'right', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: '#16a34a', width: 160 }}>
                        Wing B
                      </th>
                    )}
                    {wingFilter === 'all' && (
                      <th style={{ padding: '10px 16px', textAlign: 'right', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: '#1d2a24', width: 180 }}>
                        Total Receipts
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {BUILDER_RECO_DATA.receipts.map((r, idx) => (
                    <tr key={r.id} style={{ background: idx % 2 === 0 ? '#ffffff' : 'rgba(255, 252, 247, 0.7)', borderBottom: '1px solid rgba(61, 63, 52, 0.08)' }}>
                      <td style={{ padding: '11px 16px', fontSize: '0.85rem', color: '#1d2a24' }}>
                        <div style={{ fontWeight: 600 }}>{r.label}</div>
                        <div style={{ fontSize: '0.74rem', color: '#5f665f', marginTop: 2 }}>{r.notes}</div>
                      </td>
                      {(wingFilter === 'all' || wingFilter === 'A') && (
                        <td style={{ padding: '11px 16px', textAlign: 'right', fontSize: '0.88rem', fontWeight: 600, color: '#1d2a24' }}>
                          {fmtINR(r.wingA)}
                        </td>
                      )}
                      {(wingFilter === 'all' || wingFilter === 'B') && (
                        <td style={{ padding: '11px 16px', textAlign: 'right', fontSize: '0.88rem', fontWeight: 600, color: '#1d2a24' }}>
                          {fmtINR(r.wingB)}
                        </td>
                      )}
                      {wingFilter === 'all' && (
                        <td style={{ padding: '11px 16px', textAlign: 'right', fontSize: '0.88rem', fontWeight: 700, color: '#1d2a24' }}>
                          {fmtINR(r.total)}
                        </td>
                      )}
                    </tr>
                  ))}
                  {/* Total Receipts */}
                  <tr style={{ background: 'rgba(22, 163, 74, 0.08)', borderTop: '2px solid rgba(22, 163, 74, 0.25)', fontWeight: 800 }}>
                    <td style={{ padding: '12px 16px', fontSize: '0.88rem', color: '#166534' }}>
                      {BUILDER_RECO_DATA.totalReceipts.label}
                    </td>
                    {(wingFilter === 'all' || wingFilter === 'A') && (
                      <td style={{ padding: '12px 16px', textAlign: 'right', fontSize: '0.95rem', color: '#166534' }}>
                        {fmtINR(BUILDER_RECO_DATA.totalReceipts.wingA)}
                      </td>
                    )}
                    {(wingFilter === 'all' || wingFilter === 'B') && (
                      <td style={{ padding: '12px 16px', textAlign: 'right', fontSize: '0.95rem', color: '#166534' }}>
                        {fmtINR(BUILDER_RECO_DATA.totalReceipts.wingB)}
                      </td>
                    )}
                    {wingFilter === 'all' && (
                      <td style={{ padding: '12px 16px', textAlign: 'right', fontSize: '1rem', color: '#166534' }}>
                        {fmtINR(BUILDER_RECO_DATA.totalReceipts.total)}
                      </td>
                    )}
                  </tr>

                  {/* Net Balance as per Working */}
                  <tr style={{ background: '#ecfdf5', borderTop: '2px solid #10b981', fontWeight: 800 }}>
                    <td style={{ padding: '14px 16px', fontSize: '0.92rem', color: '#065f46' }}>
                      <div>{BUILDER_RECO_DATA.netBalanceWorking.label}</div>
                      <div style={{ fontSize: '0.72rem', color: '#047857', fontWeight: 500, marginTop: 2 }}>
                        Formula: {BUILDER_RECO_DATA.netBalanceWorking.formula}
                      </div>
                    </td>
                    {(wingFilter === 'all' || wingFilter === 'A') && (
                      <td style={{ padding: '14px 16px', textAlign: 'right', fontSize: '1.05rem', color: '#065f46' }}>
                        {fmtINR(BUILDER_RECO_DATA.netBalanceWorking.wingA)}
                      </td>
                    )}
                    {(wingFilter === 'all' || wingFilter === 'B') && (
                      <td style={{ padding: '14px 16px', textAlign: 'right', fontSize: '1.05rem', color: '#065f46' }}>
                        {fmtINR(BUILDER_RECO_DATA.netBalanceWorking.wingB)}
                      </td>
                    )}
                    {wingFilter === 'all' && (
                      <td style={{ padding: '14px 16px', textAlign: 'right', fontSize: '1.15rem', color: '#065f46' }}>
                        {fmtINR(BUILDER_RECO_DATA.netBalanceWorking.total)}
                      </td>
                    )}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* ── Table 5 & 6: Audit Reconciliation & Subsequent Movements (2023-2026) ── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 20 }}>
            {/* Box A: 31-03-2023 Audit Difference */}
            <div style={{
              background: '#ffffff', borderRadius: 20, padding: '20px 24px',
              border: '1.5px solid rgba(61, 63, 52, 0.12)', boxShadow: '0 2px 12px rgba(11, 43, 38, 0.05)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <span style={{ fontSize: '1.2rem' }}>⚖️</span>
                <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#1d2a24', fontFamily: 'Fraunces, serif' }}>
                  Audit Reconciliation (as of 31-03-2023)
                </h4>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', background: '#f8fafc', borderRadius: 10 }}>
                  <span style={{ fontSize: '0.85rem', color: '#5f665f' }}>Working Book Balance (31-03-2023):</span>
                  <span style={{ fontSize: '0.92rem', fontWeight: 700, color: '#1d2a24' }}>{fmtINR(BUILDER_RECO_DATA.auditReconciliation.bookBalance)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', background: '#f8fafc', borderRadius: 10 }}>
                  <span style={{ fontSize: '0.85rem', color: '#5f665f' }}>Tally Books Balance (31.03.2023):</span>
                  <span style={{ fontSize: '0.92rem', fontWeight: 700, color: '#0b2b26' }}>{fmtINR(BUILDER_RECO_DATA.auditReconciliation.tallyBooks)}</span>
                </div>
                <div style={{
                  display: 'flex', justifyContent: 'space-between', padding: '12px 14px',
                  background: '#fef2f2', border: '1.5px solid #fecaca', borderRadius: 10
                }}>
                  <div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#991b1b' }}>Audit Discrepancy (Diffn):</div>
                    <div style={{ fontSize: '0.72rem', color: '#b91c1c' }}>Tally books exceed working balance</div>
                  </div>
                  <span style={{ fontSize: '1.1rem', fontWeight: 800, color: '#991b1b' }}>
                    +{fmtINR(BUILDER_RECO_DATA.auditReconciliation.difference)}
                  </span>
                </div>
              </div>

              <div style={{
                marginTop: 16, padding: '10px 14px', borderRadius: 10,
                background: 'rgba(196, 155, 79, 0.1)', border: '1px solid rgba(196, 155, 79, 0.25)',
                fontSize: '0.8rem', color: '#78350f', lineHeight: 1.45
              }}>
                📌 <strong>Action Point:</strong> Request signed auditor voucher breakdown for the ₹6,954.90 difference before final developer discharge.
              </div>
            </div>

            {/* Box B: Post-31.03.2023 Movements till 31.03.2026 */}
            <div style={{
              background: '#ffffff', borderRadius: 20, padding: '20px 24px',
              border: '1.5px solid rgba(61, 63, 52, 0.12)', boxShadow: '0 2px 12px rgba(11, 43, 38, 0.05)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: '1.2rem' }}>🏦</span>
                  <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#1d2a24', fontFamily: 'Fraunces, serif' }}>
                    Subsequent Movements (2023 – 2026)
                  </h4>
                </div>
                <span style={{ background: '#dcfce7', color: '#166534', padding: '2px 8px', borderRadius: 10, fontSize: '0.7rem', fontWeight: 700 }}>
                  Active Ledger
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: '#f8fafc', borderRadius: 8, fontSize: '0.82rem' }}>
                  <span style={{ color: '#5f665f' }}>Opening (Tally Books - 31.03.2023):</span>
                  <span style={{ fontWeight: 700, color: '#1d2a24' }}>{fmtINR(BUILDER_RECO_DATA.postPeriodLedger.openingBalance)}</span>
                </div>

                {BUILDER_RECO_DATA.postPeriodLedger.transactions.map(t => (
                  <div key={t.id} style={{
                    padding: '8px 12px', background: '#fff5f5', border: '1px solid #fed7d7',
                    borderRadius: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                  }}>
                    <div>
                      <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#991b1b' }}>
                        {t.date} — {t.particulars}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#7f1d1d' }}>{t.remarks}</div>
                    </div>
                    <span style={{ fontSize: '0.88rem', fontWeight: 800, color: '#991b1b' }}>
                      {fmtINR(t.amount)}
                    </span>
                  </div>
                ))}

                {/* Final Closing Tally Balance */}
                <div style={{
                  padding: '12px 14px', background: '#ecfdf5', border: '2px solid #10b981',
                  borderRadius: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4
                }}>
                  <div>
                    <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#065f46' }}>
                      Tally Book Balance (31.03.2026)
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#047857' }}>Net unspent developer Phase II surplus</div>
                  </div>
                  <span style={{ fontSize: '1.25rem', fontWeight: 900, color: '#065f46' }}>
                    {fmtINR(BUILDER_RECO_DATA.postPeriodLedger.closingBalance)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* ── TAB 2: WING A CERTIFIED AUDIT STATEMENT (09/08/2019 to 30/06/2021) ─ */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {subTab === 'wingA' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* CA Certification Header Card */}
          <div style={{
            background: 'linear-gradient(135deg, #fffaf2 0%, #fef3c7 100%)',
            borderRadius: 20,
            padding: '20px 24px',
            border: '1.5px solid rgba(196, 155, 79, 0.4)',
            boxShadow: '0 4px 16px rgba(196, 155, 79, 0.08)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 16
          }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <span style={{ fontSize: '1.2rem' }}>📜</span>
                <span style={{ fontSize: '0.74rem', fontWeight: 800, color: '#92400e', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  CHARTERED ACCOUNTANTS CERTIFIED STATEMENT
                </span>
                <span style={{ background: '#0b2b26', color: '#C49B4F', padding: '2px 8px', borderRadius: 8, fontSize: '0.68rem', fontWeight: 700 }}>
                  FRN: {WING_A_AUDITED_STATEMENT.meta.auditor.frn}
                </span>
              </div>
              <h3 style={{ margin: '0 0 4px', fontSize: '1.25rem', fontWeight: 800, color: '#1d2a24', fontFamily: 'Fraunces, serif' }}>
                {WING_A_AUDITED_STATEMENT.meta.societyName}
              </h3>
              <p style={{ margin: 0, fontSize: '0.85rem', color: '#78350f' }}>
                {WING_A_AUDITED_STATEMENT.meta.title} for the period from <strong>{WING_A_AUDITED_STATEMENT.meta.period}</strong>
              </p>
              <div style={{ fontSize: '0.78rem', color: '#5f665f', marginTop: 4 }}>
                Auditor: <strong>{WING_A_AUDITED_STATEMENT.meta.auditor.firm}</strong> • {WING_A_AUDITED_STATEMENT.meta.auditor.proprietor} (M. No. {WING_A_AUDITED_STATEMENT.meta.auditor.membershipNo}, Empanelment No. {WING_A_AUDITED_STATEMENT.meta.auditor.coopDeptEmpanelmentNo})
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button
                onClick={() => { setModalDefaultDoc('wingA'); setShowDocModal(true); }}
                style={{
                  padding: '8px 16px', borderRadius: 10,
                  border: '1.5px solid #C49B4F', background: '#0b2b26', color: '#C49B4F',
                  fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer',
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  boxShadow: '0 2px 8px rgba(11, 43, 38, 0.15)'
                }}
              >
                <span>🔍</span>
                <span>Inspect Scanned CA Certificate</span>
              </button>

              <button
                onClick={handleExportWingACSV}
                style={{
                  padding: '8px 14px', borderRadius: 10,
                  border: '1.5px solid rgba(61, 63, 52, 0.18)',
                  background: '#ffffff', color: '#1d2a24',
                  fontWeight: 600, fontSize: '0.82rem', cursor: 'pointer',
                  display: 'inline-flex', alignItems: 'center', gap: 6
                }}
              >
                <span>📥</span>
                <span>Export CSV</span>
              </button>

              <button
                onClick={handlePrintWingA}
                style={{
                  padding: '8px 14px', borderRadius: 10,
                  border: '1.5px solid rgba(61, 63, 52, 0.18)',
                  background: '#ffffff', color: '#1d2a24',
                  fontWeight: 600, fontSize: '0.82rem', cursor: 'pointer',
                  display: 'inline-flex', alignItems: 'center', gap: 6
                }}
              >
                <span>🖨️</span>
                <span>Print Statement</span>
              </button>
            </div>
          </div>

          {/* Top 4 KPI Metrics */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
            <div style={{ background: '#ffffff', borderRadius: 16, padding: '18px 20px', border: '1.5px solid rgba(61, 63, 52, 0.1)' }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#16a34a', textTransform: 'uppercase', marginBottom: 6 }}>
                Total Audited Income
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#1d2a24' }}>
                {fmtINR(WING_A_AUDITED_STATEMENT.income.totalIncome)}
              </div>
              <div style={{ fontSize: '0.76rem', color: '#5f665f', marginTop: 4 }}>
                Maintenance: ₹61.73L • Savings Int: ₹3,516
              </div>
            </div>

            <div style={{ background: '#ffffff', borderRadius: 16, padding: '18px 20px', border: '1.5px solid rgba(61, 63, 52, 0.1)' }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#c2410c', textTransform: 'uppercase', marginBottom: 6 }}>
                Total Audited Expenditure
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#1d2a24' }}>
                {fmtINR(WING_A_AUDITED_STATEMENT.expenditure.totalExpenditure)}
              </div>
              <div style={{ fontSize: '0.76rem', color: '#5f665f', marginTop: 4 }}>
                15 itemized line heads audited
              </div>
            </div>

            <div style={{ background: '#ecfdf5', borderRadius: 16, padding: '18px 20px', border: '1.5px solid #10b981' }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#065f46', textTransform: 'uppercase', marginBottom: 6 }}>
                Surplus Transferred to Society
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#065f46' }}>
                {fmtINR(WING_A_AUDITED_STATEMENT.surplus)}
              </div>
              <div style={{ fontSize: '0.76rem', color: '#047857', marginTop: 4 }}>
                64.06% surplus ratio retained
              </div>
            </div>

            <div style={{ background: '#ffffff', borderRadius: 16, padding: '18px 20px', border: '1.5px solid rgba(61, 63, 52, 0.1)' }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#196c6c', textTransform: 'uppercase', marginBottom: 6 }}>
                Highest Expense Head
              </div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0b2b26' }}>
                Security Charges (₹7.54L)
              </div>
              <div style={{ fontSize: '0.76rem', color: '#5f665f', marginTop: 4 }}>
                33.95% of total Wing A expenses
              </div>
            </div>
          </div>

          {/* Income Table Card */}
          <div style={{
            background: 'rgba(255, 250, 242, 0.95)',
            border: '1px solid rgba(61, 63, 52, 0.1)',
            borderRadius: 20,
            overflow: 'hidden'
          }}>
            <div style={{ padding: '14px 20px', background: '#fffaf2', borderBottom: '1px solid rgba(61, 63, 52, 0.1)' }}>
              <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#166534', fontFamily: 'Fraunces, serif' }}>
                Income Particulars
              </h4>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'rgba(244, 239, 231, 0.95)', borderBottom: '2px solid rgba(61, 63, 52, 0.1)' }}>
                  <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: '#5f665f' }}>
                    Particulars
                  </th>
                  <th style={{ padding: '10px 16px', textAlign: 'right', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: '#16a34a', width: 220 }}>
                    Amount (Rs.)
                  </th>
                </tr>
              </thead>
              <tbody>
                {WING_A_AUDITED_STATEMENT.income.items.map((item, idx) => (
                  <tr key={item.id} style={{ background: idx % 2 === 0 ? '#ffffff' : 'rgba(255, 252, 247, 0.7)', borderBottom: '1px solid rgba(61, 63, 52, 0.08)' }}>
                    <td style={{ padding: '11px 16px', fontSize: '0.86rem', color: '#1d2a24', fontWeight: 600 }}>
                      {item.particular}
                      <span style={{ fontSize: '0.74rem', color: '#5f665f', marginLeft: 8, fontWeight: 400 }}>({item.notes})</span>
                    </td>
                    <td style={{ padding: '11px 16px', textAlign: 'right', fontSize: '0.92rem', fontWeight: 700, color: '#16a34a' }}>
                      {fmtINR(item.amount)}
                    </td>
                  </tr>
                ))}
                <tr style={{ background: 'rgba(22, 163, 74, 0.08)', borderTop: '2px solid rgba(22, 163, 74, 0.25)', fontWeight: 800 }}>
                  <td style={{ padding: '12px 16px', fontSize: '0.92rem', color: '#166534' }}>Total Income</td>
                  <td style={{ padding: '12px 16px', textAlign: 'right', fontSize: '1.05rem', color: '#166534' }}>
                    {fmtINR(WING_A_AUDITED_STATEMENT.income.totalIncome)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Expenditure Table Card */}
          <div style={{
            background: 'rgba(255, 250, 242, 0.95)',
            border: '1px solid rgba(61, 63, 52, 0.1)',
            borderRadius: 20,
            overflow: 'hidden'
          }}>
            <div style={{
              padding: '14px 20px',
              background: '#fffaf2',
              borderBottom: '1px solid rgba(61, 63, 52, 0.1)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 10
            }}>
              <div>
                <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#1d2a24', fontFamily: 'Fraunces, serif' }}>
                  Audited Expenditure Schedule (15 Line Items)
                </h4>
                <p style={{ margin: 0, fontSize: '0.78rem', color: '#5f665f' }}>
                  Exact items extracted from audited books of account
                </p>
              </div>

              {/* Category & Search Filter */}
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                <input
                  type="search"
                  placeholder="Filter expenses…"
                  value={wingASearch}
                  onChange={e => setWingASearch(e.target.value)}
                  style={{
                    padding: '6px 12px', borderRadius: 8,
                    border: '1.5px solid rgba(61, 63, 52, 0.15)',
                    fontSize: '0.8rem', outline: 'none', background: '#fff'
                  }}
                />
                <select
                  value={wingACategory}
                  onChange={e => setWingACategory(e.target.value)}
                  style={{
                    padding: '6px 10px', borderRadius: 8,
                    border: '1.5px solid rgba(61, 63, 52, 0.15)',
                    fontSize: '0.8rem', outline: 'none', background: '#fff', cursor: 'pointer'
                  }}
                >
                  {wingACategoriesList.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 700 }}>
                <thead>
                  <tr style={{ background: 'rgba(244, 239, 231, 0.95)', borderBottom: '2px solid rgba(61, 63, 52, 0.1)' }}>
                    <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: '#5f665f', width: 50 }}>
                      SR
                    </th>
                    <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: '#5f665f' }}>
                      Expenditure Particulars
                    </th>
                    <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: '#5f665f', width: 170 }}>
                      Category Head
                    </th>
                    <th style={{ padding: '10px 16px', textAlign: 'right', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: '#5f665f', width: 140 }}>
                      % Share
                    </th>
                    <th style={{ padding: '10px 16px', textAlign: 'right', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: '#196c6c', width: 180 }}>
                      Amount (Rs.)
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredWingAExpenses.map((e, idx) => {
                    const pct = ((e.amount / WING_A_AUDITED_STATEMENT.expenditure.totalExpenditure) * 100).toFixed(2);
                    return (
                      <tr key={e.id} style={{ background: idx % 2 === 0 ? '#ffffff' : 'rgba(255, 252, 247, 0.7)', borderBottom: '1px solid rgba(61, 63, 52, 0.08)' }}>
                        <td style={{ padding: '10px 16px', fontSize: '0.8rem', color: '#5f665f' }}>{idx + 1}</td>
                        <td style={{ padding: '10px 16px', fontSize: '0.86rem', color: '#1d2a24' }}>
                          <div style={{ fontWeight: 700 }}>{highlight(e.particular, wingASearch)}</div>
                          <div style={{ fontSize: '0.74rem', color: '#5f665f', marginTop: 1 }}>{e.notes}</div>
                        </td>
                        <td style={{ padding: '10px 16px' }}>
                          <span style={{
                            background: 'rgba(25, 108, 108, 0.08)', color: '#196c6c',
                            padding: '2px 8px', borderRadius: 6, fontSize: '0.74rem', fontWeight: 600
                          }}>
                            {e.category}
                          </span>
                        </td>
                        <td style={{ padding: '10px 16px', textAlign: 'right', fontSize: '0.82rem', color: '#5f665f' }}>
                          {pct}%
                        </td>
                        <td style={{ padding: '10px 16px', textAlign: 'right', fontSize: '0.9rem', fontWeight: 700, color: '#1d2a24' }}>
                          {fmtINR(e.amount)}
                        </td>
                      </tr>
                    );
                  })}

                  {/* Total Expenditure Row */}
                  <tr style={{ background: 'rgba(194, 100, 74, 0.08)', borderTop: '2px solid rgba(194, 100, 74, 0.25)', fontWeight: 800 }}>
                    <td colSpan={4} style={{ padding: '12px 16px', fontSize: '0.92rem', color: '#991b1b' }}>
                      Total Expenditure
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right', fontSize: '1.05rem', color: '#991b1b' }}>
                      {fmtINR(WING_A_AUDITED_STATEMENT.expenditure.totalExpenditure)}
                    </td>
                  </tr>

                  {/* Surplus Row */}
                  <tr style={{ background: '#ecfdf5', borderTop: '2px solid #10b981', fontWeight: 900 }}>
                    <td colSpan={4} style={{ padding: '14px 16px', fontSize: '1rem', color: '#065f46' }}>
                      Surplus / Deficit (Net Transferred)
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'right', fontSize: '1.25rem', color: '#065f46' }}>
                      {fmtINR(WING_A_AUDITED_STATEMENT.surplus)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}


      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* ── TAB 3: BOM MAINTENANCE PASSBOOK LEDGER (A/c 60305942224) ──────── */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {subTab === 'ledger' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Quick-Access Forensic Cross-Audit Banner */}
          <div style={{
            background: 'linear-gradient(135deg, #fef2f2 0%, #fff1f2 100%)',
            border: '1.5px solid rgba(220, 38, 38, 0.25)',
            borderRadius: 14,
            padding: '14px 18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 12,
            boxShadow: '0 3px 10px rgba(220, 38, 38, 0.05)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: '1.4rem' }}>🔬</span>
              <div>
                <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#991b1b' }}>
                  Forensic Cross-Audit Alert: 23 Missing Invoices & ₹15.31L Wing B Leakage Identified
                </div>
                <div style={{ fontSize: '0.78rem', color: '#7f1d1d', marginTop: 2 }}>
                  We cross-referenced these 135 BOM passbook transactions against CA Hardik Mehta&apos;s Annexure 4 audit exception list.
                </div>
              </div>
            </div>
            <button
              onClick={() => setSubTab('bomAnalytics')}
              style={{
                background: '#991b1b',
                color: '#ffffff',
                border: 'none',
                padding: '7px 14px',
                borderRadius: 8,
                fontSize: '0.78rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                boxShadow: '0 2px 8px rgba(153, 27, 27, 0.25)'
              }}
            >
              <span>📊</span>
              <span>Open Missing Bills Analytics</span>
            </button>
          </div>

          {/* ── Header Card ── */}
          <div style={{
            background: '#ffffff',
            borderRadius: 20,
            padding: '22px 24px',
            border: '1.5px solid rgba(61, 63, 52, 0.1)',
            boxShadow: '0 4px 20px rgba(11, 43, 38, 0.05)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 16
          }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                <span style={{
                  background: 'rgba(11, 43, 38, 0.08)', color: '#0b2b26',
                  fontSize: '0.72rem', fontWeight: 800, padding: '3px 10px',
                  borderRadius: 12, letterSpacing: '0.06em'
                }}>
                  BANK OF MAHARASHTRA • A/C 60305942224
                </span>
                <span style={{
                  background: '#fef3c7', color: '#92400e',
                  fontSize: '0.72rem', fontWeight: 700, padding: '3px 10px',
                  borderRadius: 12
                }}>
                  1-Jul-2021 to 23-Nov-2021 (Settlements till Jan 2023)
                </span>
                <span style={{
                  background: '#ecfdf5', color: '#065f46',
                  fontSize: '0.72rem', fontWeight: 700, padding: '3px 10px',
                  borderRadius: 12
                }}>
                  Handwritten Note: Exp Till - 31/03/2023
                </span>
              </div>
              <h3 style={{ margin: '4px 0', fontSize: '1.35rem', fontWeight: 800, color: '#0b2b26', fontFamily: 'Fraunces, serif' }}>
                Eisha Asset Developers Phase-II — Passbook & Tally Ledger Book
              </h3>
              <p style={{ margin: 0, fontSize: '0.86rem', color: '#5f665f' }}>
                Full 4-page verified audit trail accounting for ₹50,04,602.50 in disbursements, seed refunds, supervision fees, and ₹24L transfer to Wing A Society.
              </p>
            </div>

            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button
                onClick={() => { setModalDefaultDoc('ledger1'); setShowDocModal(true); }}
                style={{
                  padding: '9px 15px', borderRadius: 10,
                  border: '1.5px solid #0b2b26',
                  background: '#ffffff', color: '#0b2b26',
                  fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 6,
                  transition: 'all 0.15s ease'
                }}
              >
                <span>🔍</span>
                <span>Inspect Passbook Scans (4 Pgs)</span>
              </button>

              <button
                onClick={handleExportBOMCSV}
                style={{
                  padding: '9px 15px', borderRadius: 10,
                  border: '1.5px solid rgba(61, 63, 52, 0.15)',
                  background: '#ffffff', color: '#1d2a24',
                  fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 6
                }}
              >
                <span>📥</span>
                <span>Export CSV ({filteredLedger.length})</span>
              </button>

              <button
                onClick={handlePrintBOM}
                style={{
                  padding: '9px 15px', borderRadius: 10,
                  border: 'none',
                  background: '#0b2b26', color: '#ffffff',
                  fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 6
                }}
              >
                <span>🖨️</span>
                <span>Print / PDF Ledger</span>
              </button>
            </div>
          </div>

          {/* ── Reconciliation Link Box ── */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(11, 43, 38, 0.04) 0%, rgba(25, 108, 108, 0.08) 100%)',
            border: '1.5px solid rgba(11, 43, 38, 0.15)',
            borderRadius: 18,
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: 14
          }}>
            <div style={{ fontSize: '1.5rem', lineHeight: 1 }}>🔗</div>
            <div>
              <div style={{ fontWeight: 800, fontSize: '0.92rem', color: '#0b2b26', marginBottom: 3 }}>
                Evidentiary Backbone for Developer Maintenance Reco Sheet
              </div>
              <div style={{ fontSize: '0.84rem', color: '#3d3f34', lineHeight: 1.5 }}>
                This 4-page Bank of Maharashtra passbook ledger directly backs up <strong>Row 2: "From 01.07.21 to 26.11.2021 (as working)" (₹49,01,564.50)</strong> and <strong>Row 3: "Refund to EADP II Account opening Amount" (₹1,00,000.00)</strong> in the master Developer Reco Sheet. Total payments match ₹50,04,602.50 against ₹56,24,072.90 in receipts, leaving a certified difference of <strong>₹6,19,470.40</strong>.
              </div>
            </div>
          </div>

          {/* ── Key Highlight Cards ── */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: 14
          }}>
            <div style={{
              background: '#ffffff', borderRadius: 16, padding: '16px 18px',
              border: '1.5px solid #a7f3d0', boxShadow: '0 2px 10px rgba(11, 43, 38, 0.03)'
            }}>
              <div style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', color: '#059669', letterSpacing: '0.08em' }}>
                Major Handover Transfer
              </div>
              <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#065f46', margin: '4px 0' }}>
                ₹24,00,000.00
              </div>
              <div style={{ fontSize: '0.8rem', color: '#5f665f' }}>
                Transferred to <strong>Majestique Euriska A Building Sahakari Gruhrachna Sanstha</strong> on <strong>26-11-2021</strong> (Vch #512).
              </div>
            </div>

            <div style={{
              background: '#ffffff', borderRadius: 16, padding: '16px 18px',
              border: '1.5px solid #fde68a', boxShadow: '0 2px 10px rgba(11, 43, 38, 0.03)'
            }}>
              <div style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', color: '#d97706', letterSpacing: '0.08em' }}>
                Developer Supervision Charges
              </div>
              <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#92400e', margin: '4px 0' }}>
                ₹6,20,000.00
              </div>
              <div style={{ fontSize: '0.8rem', color: '#5f665f' }}>
                Charged on <strong>23-11-2021</strong>: Wing A debited <strong>₹2,70,000</strong> (Vch #498) &amp; Wing B debited <strong>₹3,50,000</strong> (Vch #499).
              </div>
            </div>

            <div style={{
              background: '#ffffff', borderRadius: 16, padding: '16px 18px',
              border: '1.5px solid #fecaca', boxShadow: '0 2px 10px rgba(11, 43, 38, 0.03)'
            }}>
              <div style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', color: '#dc2626', letterSpacing: '0.08em' }}>
                Account Opening Refund
              </div>
              <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#991b1b', margin: '4px 0' }}>
                ₹1,00,000.00
              </div>
              <div style={{ fontSize: '0.8rem', color: '#5f665f' }}>
                Refunded to <strong>BOM C/A No. 60186732081</strong> on <strong>23-11-2021</strong> (Contra Vch #43).
              </div>
            </div>

            <div style={{
              background: '#ffffff', borderRadius: 16, padding: '16px 18px',
              border: '1.5px solid #bae6fd', boxShadow: '0 2px 10px rgba(11, 43, 38, 0.03)'
            }}>
              <div style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', color: '#0284c7', letterSpacing: '0.08em' }}>
                Closing Book Difference
              </div>
              <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0369a1', margin: '4px 0' }}>
                ₹6,19,470.40
              </div>
              <div style={{ fontSize: '0.8rem', color: '#5f665f' }}>
                Total Inflow ₹56.24L less Total Outflow ₹50.05L (Handwritten notation: <em>Exp Till - 31/03/2023</em>).
              </div>
            </div>
          </div>

          {/* ── KPI Metric Summaries ── */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: 12
          }}>
            <div style={{ background: 'rgba(255, 250, 242, 0.8)', padding: '12px 16px', borderRadius: 14, border: '1px solid rgba(61, 63, 52, 0.1)' }}>
              <div style={{ fontSize: '0.7rem', color: '#5f665f', fontWeight: 700, textTransform: 'uppercase' }}>Total Inflows (Debits)</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#1d2a24', marginTop: 2 }}>{fmtINR(BOM_PASSBOOK_LEDGER.meta.totals.totalDebit)}</div>
              <div style={{ fontSize: '0.72rem', color: '#059669', marginTop: 2 }}>Opening: ₹56.23L + BigBasket: ₹1.5K</div>
            </div>

            <div style={{ background: 'rgba(255, 250, 242, 0.8)', padding: '12px 16px', borderRadius: 14, border: '1px solid rgba(61, 63, 52, 0.1)' }}>
              <div style={{ fontSize: '0.7rem', color: '#5f665f', fontWeight: 700, textTransform: 'uppercase' }}>Total Outflows (Credits)</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#b91c1c', marginTop: 2 }}>{fmtINR(BOM_PASSBOOK_LEDGER.meta.totals.totalCredit)}</div>
              <div style={{ fontSize: '0.72rem', color: '#5f665f', marginTop: 2 }}>135 Total Ledger Rows</div>
            </div>

            <div style={{ background: '#ecfdf5', padding: '12px 16px', borderRadius: 14, border: '1px solid #a7f3d0' }}>
              <div style={{ fontSize: '0.7rem', color: '#065f46', fontWeight: 700, textTransform: 'uppercase' }}>Wing A Outflow Share</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#065f46', marginTop: 2 }}>{fmtINR(BOM_PASSBOOK_LEDGER.meta.wingBreakdown.A.credits)}</div>
              <div style={{ fontSize: '0.72rem', color: '#047857', marginTop: 2 }}>48 items (incl ₹24L trf & ₹2.7L sup)</div>
            </div>

            <div style={{ background: '#fffbeb', padding: '12px 16px', borderRadius: 14, border: '1px solid #fde68a' }}>
              <div style={{ fontSize: '0.7rem', color: '#92400e', fontWeight: 700, textTransform: 'uppercase' }}>Wing B Outflow Share</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#92400e', marginTop: 2 }}>{fmtINR(BOM_PASSBOOK_LEDGER.meta.wingBreakdown.B.credits)}</div>
              <div style={{ fontSize: '0.72rem', color: '#b45309', marginTop: 2 }}>77 items (incl ₹3.5L supervision)</div>
            </div>

            <div style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: 14, border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '0.7rem', color: '#475569', fontWeight: 700, textTransform: 'uppercase' }}>Common (C) &amp; Refund</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#1e293b', marginTop: 2 }}>₹1,03,038.00</div>
              <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: 2 }}>DG repair (₹3,038) + EADP (₹1L)</div>
            </div>
          </div>

          {/* ── Interactive Filter & Search Bar ── */}
          <div style={{
            background: '#ffffff',
            borderRadius: 16,
            padding: '16px 20px',
            border: '1px solid rgba(61, 63, 52, 0.1)',
            boxShadow: '0 2px 10px rgba(11, 43, 38, 0.03)',
            display: 'flex',
            flexDirection: 'column',
            gap: 12
          }}>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
              {/* Search Box */}
              <div style={{ position: 'relative', flex: '1 1 240px', minWidth: 200 }}>
                <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', opacity: 0.45 }}>🔍</span>
                <input
                  type="search"
                  placeholder="Search particulars, voucher #, remark, or date…"
                  value={ledgerSearch}
                  onChange={e => setLedgerSearch(e.target.value)}
                  style={{
                    width: '100%',
                    paddingLeft: 34, paddingRight: 12, paddingTop: 8, paddingBottom: 8,
                    borderRadius: 10,
                    border: '1.5px solid rgba(61, 63, 52, 0.15)',
                    fontSize: '0.85rem', color: '#1d2a24', outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              {/* Wing Filter */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.76rem', fontWeight: 700, color: '#5f665f' }}>Wing:</span>
                {['All', 'A', 'B', 'C', 'Refund', 'Opening'].map(w => {
                  const active = ledgerWing === w;
                  return (
                    <button
                      key={w}
                      onClick={() => setLedgerWing(w)}
                      style={{
                        padding: '5px 11px', borderRadius: 8,
                        border: active ? '1.5px solid #0b2b26' : '1px solid rgba(61, 63, 52, 0.15)',
                        background: active ? '#0b2b26' : '#ffffff',
                        color: active ? '#ffffff' : '#1d2a24',
                        fontSize: '0.76rem', fontWeight: active ? 700 : 500,
                        cursor: 'pointer'
                      }}
                    >
                      {w === 'All' ? 'All Wings' : `Wing ${w}`}
                    </button>
                  );
                })}
              </div>

              {/* Page Filter */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.76rem', fontWeight: 700, color: '#5f665f' }}>Page:</span>
                {['All', '1', '2', '3', '4'].map(p => {
                  const active = ledgerPage === p;
                  return (
                    <button
                      key={p}
                      onClick={() => setLedgerPage(p)}
                      style={{
                        padding: '5px 10px', borderRadius: 8,
                        border: active ? '1.5px solid #0b2b26' : '1px solid rgba(61, 63, 52, 0.15)',
                        background: active ? '#0b2b26' : '#ffffff',
                        color: active ? '#ffffff' : '#1d2a24',
                        fontSize: '0.76rem', fontWeight: active ? 700 : 500,
                        cursor: 'pointer'
                      }}
                    >
                      {p === 'All' ? 'All Pgs' : `Pg ${p}`}
                    </button>
                  );
                })}
              </div>

              {/* Reset Filter Button */}
              {(ledgerSearch || ledgerWing !== 'All' || ledgerPage !== 'All' || ledgerRemark !== 'All' || ledgerVchType !== 'All') && (
                <button
                  onClick={() => {
                    setLedgerSearch('');
                    setLedgerWing('All');
                    setLedgerPage('All');
                    setLedgerRemark('All');
                    setLedgerVchType('All');
                  }}
                  style={{
                    padding: '5px 10px', borderRadius: 8,
                    border: '1px dashed #b91c1c', background: '#fef2f2',
                    color: '#991b1b', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer'
                  }}
                >
                  Clear Filters
                </button>
              )}
            </div>

            {/* Category / Remark Pills */}
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#5f665f' }}>Head:</span>
              {['All', 'Security', 'Houskeeping', 'ELECTRICITY', 'WATERMAN', 'Swimming pool', 'Supervision Charges', 'A Bldg Society', 'TDS', 'BPCL', 'DG repairing', 'Audit Fees'].map(r => {
                const active = ledgerRemark === r;
                return (
                  <button
                    key={r}
                    onClick={() => setLedgerRemark(r)}
                    style={{
                      padding: '3px 8px', borderRadius: 6,
                      border: active ? '1px solid #0b2b26' : '1px solid rgba(61, 63, 52, 0.12)',
                      background: active ? '#0b2b26' : 'rgba(255, 250, 242, 0.7)',
                      color: active ? '#C49B4F' : '#3d3f34',
                      fontSize: '0.72rem', fontWeight: active ? 700 : 500,
                      cursor: 'pointer'
                    }}
                  >
                    {r}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Transactions Table ── */}
          <div style={{
            background: '#ffffff',
            borderRadius: 18,
            overflow: 'hidden',
            border: '1px solid rgba(61, 63, 52, 0.1)',
            boxShadow: '0 4px 20px rgba(11, 43, 38, 0.04)'
          }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 900 }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '2px solid rgba(61, 63, 52, 0.1)' }}>
                    <th style={{ padding: '12px 14px', textAlign: 'left', fontSize: '0.74rem', fontWeight: 800, color: '#5f665f', textTransform: 'uppercase', width: 45 }}>#</th>
                    <th style={{ padding: '12px 14px', textAlign: 'left', fontSize: '0.74rem', fontWeight: 800, color: '#5f665f', textTransform: 'uppercase', width: 100 }}>Date</th>
                    <th style={{ padding: '12px 14px', textAlign: 'left', fontSize: '0.74rem', fontWeight: 800, color: '#5f665f', textTransform: 'uppercase', width: 60 }}>Cr/Dr</th>
                    <th style={{ padding: '12px 14px', textAlign: 'left', fontSize: '0.74rem', fontWeight: 800, color: '#5f665f', textTransform: 'uppercase' }}>Particulars</th>
                    <th style={{ padding: '12px 14px', textAlign: 'left', fontSize: '0.74rem', fontWeight: 800, color: '#5f665f', textTransform: 'uppercase', width: 85 }}>Vch Type</th>
                    <th style={{ padding: '12px 14px', textAlign: 'left', fontSize: '0.74rem', fontWeight: 800, color: '#5f665f', textTransform: 'uppercase', width: 75 }}>Vch No</th>
                    <th style={{ padding: '12px 14px', textAlign: 'left', fontSize: '0.74rem', fontWeight: 800, color: '#5f665f', textTransform: 'uppercase' }}>Remark / Head</th>
                    <th style={{ padding: '12px 14px', textAlign: 'center', fontSize: '0.74rem', fontWeight: 800, color: '#5f665f', textTransform: 'uppercase', width: 80 }}>Wing</th>
                    <th style={{ padding: '12px 14px', textAlign: 'right', fontSize: '0.74rem', fontWeight: 800, color: '#065f46', textTransform: 'uppercase', width: 110 }}>Debit (₹)</th>
                    <th style={{ padding: '12px 14px', textAlign: 'right', fontSize: '0.74rem', fontWeight: 800, color: '#991b1b', textTransform: 'uppercase', width: 110 }}>Credit (₹)</th>
                    <th style={{ padding: '12px 14px', textAlign: 'center', fontSize: '0.74rem', fontWeight: 800, color: '#5f665f', textTransform: 'uppercase', width: 55 }}>Scan</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLedger.length === 0 ? (
                    <tr>
                      <td colSpan="11" style={{ padding: '36px', textAlign: 'center', color: '#888' }}>
                        No transactions match your search / filter criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredLedger.map((t, idx) => {
                      const isEven = idx % 2 === 0;
                      const isSpecialTransfer = t.credit >= 100000;
                      
                      let wingBg = '#f1f5f9';
                      let wingColor = '#334155';
                      let wingBorder = '#cbd5e1';
                      if (t.wing === 'A') {
                        wingBg = '#ecfdf5'; wingColor = '#065f46'; wingBorder = '#a7f3d0';
                      } else if (t.wing === 'B') {
                        wingBg = '#fef3c7'; wingColor = '#92400e'; wingBorder = '#fde68a';
                      } else if (t.wing === 'Refund') {
                        wingBg = '#fef2f2'; wingColor = '#991b1b'; wingBorder = '#fecaca';
                      } else if (t.wing === 'Opening') {
                        wingBg = '#e0f2fe'; wingColor = '#0369a1'; wingBorder = '#bae6fd';
                      }

                      return (
                        <tr
                          key={t.id}
                          style={{
                            background: isSpecialTransfer ? 'rgba(254, 243, 199, 0.4)' : isEven ? '#ffffff' : '#fafafa',
                            borderBottom: '1px solid rgba(61, 63, 52, 0.06)',
                            transition: 'background 0.15s ease'
                          }}
                        >
                          <td style={{ padding: '10px 14px', fontSize: '0.78rem', color: '#888' }}>{t.id}</td>
                          <td style={{ padding: '10px 14px', fontSize: '0.82rem', fontWeight: 600, color: '#1d2a24', whiteSpace: 'nowrap' }}>{t.date}</td>
                          <td style={{ padding: '10px 14px', fontSize: '0.78rem', fontWeight: 700, color: t.crdr === 'Cr' || t.crdr === 'CR' ? '#065f46' : '#991b1b' }}>{t.crdr}</td>
                          <td style={{ padding: '10px 14px', fontSize: '0.84rem', fontWeight: isSpecialTransfer ? 800 : 600, color: isSpecialTransfer ? '#0b2b26' : '#1d2a24' }}>
                            {t.particulars}
                          </td>
                          <td style={{ padding: '10px 14px', fontSize: '0.78rem', color: '#5f665f' }}>
                            <span style={{
                              background: t.vchType === 'Payment' ? '#fef2f2' : t.vchType === 'Receipt' ? '#ecfdf5' : '#f5f3ff',
                              color: t.vchType === 'Payment' ? '#991b1b' : t.vchType === 'Receipt' ? '#065f46' : '#5b21b6',
                              padding: '2px 6px', borderRadius: 6, fontSize: '0.72rem', fontWeight: 700
                            }}>
                              {t.vchType || '—'}
                            </span>
                          </td>
                          <td style={{ padding: '10px 14px', fontSize: '0.8rem', color: '#5f665f', fontFamily: 'monospace' }}>{t.vchNo || '—'}</td>
                          <td style={{ padding: '10px 14px', fontSize: '0.82rem', color: '#3d3f34' }}>
                            <span style={{
                              background: 'rgba(61, 63, 52, 0.06)',
                              padding: '2px 8px', borderRadius: 8, fontSize: '0.75rem', fontWeight: 600
                            }}>
                              {t.remark || '—'}
                            </span>
                          </td>
                          <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                            <span style={{
                              background: wingBg, color: wingColor, border: `1px solid ${wingBorder}`,
                              padding: '2px 8px', borderRadius: 10, fontSize: '0.72rem', fontWeight: 800
                            }}>
                              {t.wing}
                            </span>
                          </td>
                          <td style={{ padding: '10px 14px', textAlign: 'right', fontSize: '0.84rem', fontWeight: 700, color: t.debit ? '#065f46' : '#cbd5e1' }}>
                            {t.debit ? fmtINR(t.debit) : '—'}
                          </td>
                          <td style={{ padding: '10px 14px', textAlign: 'right', fontSize: '0.84rem', fontWeight: 700, color: t.credit ? (isSpecialTransfer ? '#b91c1c' : '#1d2a24') : '#cbd5e1' }}>
                            {t.credit ? fmtINR(t.credit) : '—'}
                          </td>
                          <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                            <button
                              onClick={() => {
                                setModalDefaultDoc(`ledger${t.page}`);
                                setShowDocModal(true);
                              }}
                              style={{
                                background: 'none', border: '1px solid rgba(61, 63, 52, 0.2)',
                                borderRadius: 6, padding: '2px 6px', fontSize: '0.7rem',
                                color: '#0b2b26', cursor: 'pointer', fontWeight: 700
                              }}
                              title={`Inspect original scan of Page ${t.page}`}
                            >
                              P{t.page}
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
                <tfoot>
                  <tr style={{ background: '#f8fafc', borderTop: '2px solid rgba(61, 63, 52, 0.15)', fontWeight: 800 }}>
                    <td colSpan="8" style={{ padding: '12px 14px', fontSize: '0.86rem', color: '#1d2a24' }}>
                      TOTALS ({filteredLedger.length} filtered entries)
                    </td>
                    <td style={{ padding: '12px 14px', textAlign: 'right', fontSize: '0.92rem', color: '#065f46' }}>
                      {fmtINR(ledgerTotals.debit)}
                    </td>
                    <td style={{ padding: '12px 14px', textAlign: 'right', fontSize: '0.92rem', color: '#b91c1c' }}>
                      {fmtINR(ledgerTotals.credit)}
                    </td>
                    <td></td>
                  </tr>
                  <tr style={{ background: '#ecfdf5', borderTop: '1px solid #a7f3d0', fontWeight: 800 }}>
                    <td colSpan="8" style={{ padding: '14px 14px', fontSize: '0.92rem', color: '#065f46' }}>
                      Net Passbook Difference (Total Debits − Total Credits)
                    </td>
                    <td colSpan="2" style={{ padding: '14px 14px', textAlign: 'right', fontSize: '1.15rem', color: '#065f46' }}>
                      {fmtINR(ledgerTotals.debit - ledgerTotals.credit)}
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* ── TAB 5: BOM vs CA MISSING BILLS DATA ANALYTICS ───────────────────── */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {subTab === 'bomAnalytics' && (
        <BOMMissingBillsAnalytics
          isAdmin={isAdmin}
          onNavigateTab={(tab) => setSubTab(tab)}
        />
      )}

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* ── Scanned Document Lightbox Modal ── */}
      {showDocModal && <ScannedDocModal defaultDoc={modalDefaultDoc} onClose={() => setShowDocModal(false)} />}

    </div>
  );
}
