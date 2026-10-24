import { useMemo, useState } from 'react';
import { BUILDER_RECO_DATA, WING_A_AUDITED_STATEMENT, BOM_PASSBOOK_LEDGER, fmtINR, CA_HARDIK_MEHTA_REPORT } from '../../data/builderRecoData.js';
import CAHardikMehtaReportView from './CAHardikMehtaReportView.jsx';
import BOMMissingBillsAnalytics from './BOMMissingBillsAnalytics.jsx';
import './BuilderDiscuss.css';



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
      <mark className="builder-discuss-s1">
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
      className="builder-discuss-s2"
      onClick={onClose}
    >
      <div
        className="builder-discuss-s3"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="builder-discuss-s4">
          <div className="builder-discuss-s5">
            <div>
              <span className="builder-discuss-s6">
                OFFICIAL AUDIT DOCUMENTATION
              </span>
              <h3 className="builder-discuss-s7">
                {curr.title}
              </h3>
              <p className="builder-discuss-s8">{curr.sub}</p>
            </div>

            <div className="builder-discuss-s9">
              <div className="builder-discuss-s10">
                <button
                  onClick={() => setZoom(z => Math.max(0.6, z - 0.2))}
                  className="builder-discuss-s11"
                  title="Zoom Out"
                >
                  −
                </button>
                <button
                  onClick={() => setZoom(1)}
                  className="builder-discuss-s12"
                  title="Reset Zoom"
                >
                  {Math.round(zoom * 100)}%
                </button>
                <button
                  onClick={() => setZoom(z => Math.min(2.2, z + 0.2))}
                  className="builder-discuss-s11"
                  title="Zoom In"
                >
                  +
                </button>
              </div>

              <a
                href={curr.src}
                download={curr.downloadName}
                className="builder-discuss-s13"
              >
                ⬇ Download Scan
              </a>

              <button
                onClick={onClose}
                className="builder-discuss-s14"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Doc Switcher Buttons inside modal */}
          <div className="builder-discuss-s15">
            <button
              onClick={() => { setActiveDoc('phase2'); setZoom(1); }}
              className="builder-discuss-s16" style={{ background: activeDoc === 'phase2' ? '#ffffff' : 'rgba(255,255,255,0.12)', color: activeDoc === 'phase2' ? '#0b2b26' : '#ffffff' }}
            >
              📑 Master Reco
            </button>
            <button
              onClick={() => { setActiveDoc('wingA'); setZoom(1); }}
              className="builder-discuss-s16" style={{ background: activeDoc === 'wingA' ? '#ffffff' : 'rgba(255,255,255,0.12)', color: activeDoc === 'wingA' ? '#0b2b26' : '#ffffff' }}
            >
              📜 Wing A Audit
            </button>
            <button
              onClick={() => { setActiveDoc('ledger1'); setZoom(1); }}
              className="builder-discuss-s16" style={{ background: activeDoc === 'ledger1' ? '#ffffff' : 'rgba(255,255,255,0.12)', color: activeDoc === 'ledger1' ? '#0b2b26' : '#ffffff' }}
            >
              📒 BOM Page 1
            </button>
            <button
              onClick={() => { setActiveDoc('ledger2'); setZoom(1); }}
              className="builder-discuss-s16" style={{ background: activeDoc === 'ledger2' ? '#ffffff' : 'rgba(255,255,255,0.12)', color: activeDoc === 'ledger2' ? '#0b2b26' : '#ffffff' }}
            >
              📒 BOM Page 2
            </button>
            <button
              onClick={() => { setActiveDoc('ledger3'); setZoom(1); }}
              className="builder-discuss-s16" style={{ background: activeDoc === 'ledger3' ? '#ffffff' : 'rgba(255,255,255,0.12)', color: activeDoc === 'ledger3' ? '#0b2b26' : '#ffffff' }}
            >
              📒 BOM Page 3 (₹24L Trf)
            </button>
            <button
              onClick={() => { setActiveDoc('ledger4'); setZoom(1); }}
              className="builder-discuss-s16" style={{ background: activeDoc === 'ledger4' ? '#ffffff' : 'rgba(255,255,255,0.12)', color: activeDoc === 'ledger4' ? '#0b2b26' : '#ffffff' }}
            >
              📒 BOM Page 4 (Closing)
            </button>
          </div>
        </div>

        {/* Image Display */}
        <div className="builder-discuss-s17">
          <img
            src={curr.src}
            alt={curr.title}
            className="builder-discuss-s18" style={{ width: `${zoom * 100}%`, maxWidth: zoom <= 1 ? '760px' : 'none' }}
          />
        </div>

        {/* Footer info */}
        <div className="builder-discuss-s19">
          <span>{curr.sourceNote}</span>
          <span className="builder-discuss-s20">{curr.badge}</span>
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
    <div className="builder-discuss-s21">

      {/* ── Executive Header Banner ── */}
      <div className="builder-discuss-s22">
        <div className="builder-discuss-s23">
          <div className="builder-discuss-s24">
            <span className="builder-discuss-s25">
              BUILDER ENGAGEMENT &amp; WORKS
            </span>
            <span className="builder-discuss-s26">
              Eisha Asset Developers
            </span>
            <span className="builder-discuss-s27">
              Certified Audit Statements
            </span>
          </div>

          <h2 className="builder-discuss-s28">
            Builder Discuss Ledger
          </h2>
          <p className="builder-discuss-s29">
            Independent developer reconciliations, CA Hardik Mehta recoverable report, Wing A certified audit &amp; verified BOM passbook
          </p>
        </div>

        {/* Executive High-Impact Stat Badges */}
        <div className="builder-discuss-s30">
          {/* CA Recoverable Claim */}
          <div className="builder-discuss-s31">
            <div className="builder-discuss-s32">
              <span>⚖️</span> CA Claim Dues
            </div>
            <div className="builder-discuss-s33">
              {fmtINR(CA_HARDIK_MEHTA_REPORT?.meta?.keyFigures?.amountReceivable || 1207058)}
            </div>
            <div className="builder-discuss-s34">
              Net Receivable (Oct 21–Dec 25)
            </div>
          </div>

          {/* Unspent Tally Closing Balance */}
          <div className="builder-discuss-s35">
            <div className="builder-discuss-s36">
              <span>🏦</span> Unspent Tally
            </div>
            <div className="builder-discuss-s37">
              {fmtINR(BUILDER_RECO_DATA.postPeriodLedger.closingBalance)}
            </div>
            <div className="builder-discuss-s34">
              As on 31.03.2026 (Phase II)
            </div>
          </div>
        </div>
      </div>

      {/* ── Modern Segmented Sub-Tabs Bar ── */}
      <div className="builder-discuss-s38">
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
              className="builder-discuss-s39" style={{ border: active ? '1.5px solid rgba(196, 155, 79, 0.4)' : '1.5px solid transparent', background: active ? '#ffffff' : 'transparent', color: active ? '#1d2a24' : '#5f665f', boxShadow: active ? '0 3px 10px rgba(11, 43, 38, 0.08)' : 'none' }}
            >
              <div className="builder-discuss-s40">
                <span className="builder-discuss-s41">{tab.icon}</span>
                <div className="builder-discuss-s42">
                  <div className="builder-discuss-s43" style={{ fontWeight: active ? 800 : 600, color: active ? '#0b2b26' : '#374151' }}>
                    {tab.title}
                  </div>
                  <div className="builder-discuss-s44" style={{ color: active ? '#196c6c' : '#9ca3af' }}>
                    {tab.sub}
                  </div>
                </div>
              </div>
              <span className="builder-discuss-s45" style={{ background: active ? tab.badgeActiveBg : tab.badgeInactiveBg, color: active ? tab.badgeActiveColor : tab.badgeInactiveColor }}>
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
        <div className="builder-discuss-s46">

          {/* Action Toolbar & Document Inspection */}
          <div className="builder-discuss-s47">
            {/* Wing Scope Segmented Selector */}
            <div className="builder-discuss-s48">
              <span className="builder-discuss-s49">
                Scope:
              </span>
              <div className="builder-discuss-s50">
                {[
                  { id: 'all', label: 'All Wings (A, B & C • 231 Flats)' },
                  { id: 'A', label: 'Wing A (87 Flats • Sep 2019)' },
                  { id: 'B', label: 'Wing B (96 Flats • Jan 2019)' },
                  { id: 'C', label: 'Wing C (48 Flats • Mar 2020)' }
                ].map(w => {
                  const active = wingFilter === w.id;
                  return (
                    <button
                      key={w.id}
                      onClick={() => setWingFilter(w.id)}
                      className="builder-discuss-s51" style={{ fontWeight: active ? 700 : 500, background: active ? '#ffffff' : 'transparent', color: active ? '#0b2b26' : '#5f665f', boxShadow: active ? '0 1px 4px rgba(0, 0, 0, 0.08)' : 'none' }}
                    >
                      {w.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="builder-discuss-s48">
              <button
                onClick={() => { setModalDefaultDoc('phase2'); setShowDocModal(true); }}
                className="builder-discuss-s52"
                title="View high-resolution scan of developer audit sheet"
              >
                <span>🔍</span>
                <span>Inspect Scanned Audit Sheet</span>
              </button>

              <button
                onClick={handleExportRecoCSV}
                className="builder-discuss-s53"
              >
                <span>📥</span>
                <span>Export CSV</span>
              </button>

              <button
                onClick={handlePrintReco}
                className="builder-discuss-s54"
              >
                <span>🖨️</span>
                <span>Print Statement</span>
              </button>
            </div>
          </div>

          {/* Key Summary Cards Row */}
          <div className="builder-discuss-s55">
            <div className="builder-discuss-s56">
              <div className="builder-discuss-s57">
                <span className="builder-discuss-s58">
                  Total Receipts Collected
                </span>
                <span className="builder-discuss-s59">
                  Inflow
                </span>
              </div>
              <div className="builder-discuss-s60">
                {wingFilter === 'A' ? fmtINR(BUILDER_RECO_DATA.totalReceipts.wingA) : wingFilter === 'B' ? fmtINR(BUILDER_RECO_DATA.totalReceipts.wingB) : fmtINR(BUILDER_RECO_DATA.totalReceipts.total)}
              </div>
              <div className="builder-discuss-s61">
                Wing A: <strong>{fmtINR(BUILDER_RECO_DATA.totalReceipts.wingA)}</strong> • Wing B: <strong>{fmtINR(BUILDER_RECO_DATA.totalReceipts.wingB)}</strong>
              </div>
            </div>

            <div className="builder-discuss-s56">
              <div className="builder-discuss-s57">
                <span className="builder-discuss-s62">
                  Net Total Expenses (I + II)
                </span>
                <span className="builder-discuss-s63">
                  After Cost Shift
                </span>
              </div>
              <div className="builder-discuss-s60">
                {wingFilter === 'A' ? fmtINR(BUILDER_RECO_DATA.totalExpensesNet.wingA) : wingFilter === 'B' ? fmtINR(BUILDER_RECO_DATA.totalExpensesNet.wingB) : fmtINR(BUILDER_RECO_DATA.totalExpensesNet.total)}
              </div>
              <div className="builder-discuss-s61">
                Wing A: <strong>{fmtINR(BUILDER_RECO_DATA.totalExpensesNet.wingA)}</strong> • Wing B: <strong>{fmtINR(BUILDER_RECO_DATA.totalExpensesNet.wingB)}</strong>
              </div>
            </div>

            <div className="builder-discuss-s56">
              <div className="builder-discuss-s57">
                <span className="builder-discuss-s64">
                  Working Net Balance (31.03.2023)
                </span>
                <span className="builder-discuss-s65">
                  Surplus
                </span>
              </div>
              <div className="builder-discuss-s60">
                {wingFilter === 'A' ? fmtINR(BUILDER_RECO_DATA.netBalanceWorking.wingA) : wingFilter === 'B' ? fmtINR(BUILDER_RECO_DATA.netBalanceWorking.wingB) : fmtINR(BUILDER_RECO_DATA.netBalanceWorking.total)}
              </div>
              <div className="builder-discuss-s61">
                Receipts − Net Expenses (Wing A: ₹1.15L | Wing B: ₹4.98L)
              </div>
            </div>

            <div className="builder-discuss-s66">
              <div className="builder-discuss-s57">
                <span className="builder-discuss-s67">
                  Current Tally Balance (31.03.2026)
                </span>
                <span className="builder-discuss-s68">
                  Available
                </span>
              </div>
              <div className="builder-discuss-s69">
                {fmtINR(BUILDER_RECO_DATA.postPeriodLedger.closingBalance)}
              </div>
              <div className="builder-discuss-s70">
                After ₹5,00,000 F&amp;F Transfer &amp; ₹9,270 Refund
              </div>
            </div>
          </div>

          {/* ── Table 1: Expenses Breakdown till 26.11.2021 ── */}
          <div className="builder-discuss-s71">
            <div className="builder-discuss-s72">
              <div>
                <h3 className="builder-discuss-s73">
                  I. Phase II Maintenance Expenses (Up to 26.11.2021)
                </h3>
                <p className="builder-discuss-s74">
                  Audited base expenses prior to common cost shift reallocations
                </p>
              </div>
              <button
                onClick={() => setSubTab('wingA')}
                className="builder-discuss-s75"
              >
                📜 View Wing A Itemized CA Audit (₹22,19,896) →
              </button>
            </div>

            <div className="builder-discuss-s76">
              <table className="builder-discuss-s77">
                <thead>
                  <tr className="builder-discuss-s78">
                    <th className="builder-discuss-s79">
                      Expenditure Head
                    </th>
                    {(wingFilter === 'all' || wingFilter === 'A') && (
                      <th className="builder-discuss-s80">
                        Wing A (Sep 2019)
                      </th>
                    )}
                    {(wingFilter === 'all' || wingFilter === 'B') && (
                      <th className="builder-discuss-s80">
                        Wing B (Jan 2019)
                      </th>
                    )}
                    {wingFilter === 'all' && (
                      <th className="builder-discuss-s81">
                        Consolidated (A + B)
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {BUILDER_RECO_DATA.expenses.map((e, idx) => (
                    <tr key={e.id} className="builder-discuss-s82" style={{ background: idx % 2 === 0 ? '#ffffff' : 'rgba(255, 252, 247, 0.7)' }}>
                      <td className="builder-discuss-s83">
                        <div className="builder-discuss-s84">{e.label}</div>
                        <div className="builder-discuss-s85">{e.notes}</div>
                      </td>
                      {(wingFilter === 'all' || wingFilter === 'A') && (
                        <td className="builder-discuss-s86">
                          {fmtINR(e.wingA)}
                        </td>
                      )}
                      {(wingFilter === 'all' || wingFilter === 'B') && (
                        <td className="builder-discuss-s86">
                          {fmtINR(e.wingB)}
                        </td>
                      )}
                      {wingFilter === 'all' && (
                        <td className="builder-discuss-s87">
                          {fmtINR(e.total)}
                        </td>
                      )}
                    </tr>
                  ))}
                  {/* Subtotal I Row */}
                  <tr className="builder-discuss-s88">
                    <td className="builder-discuss-s89">
                      {BUILDER_RECO_DATA.totalExpensesI.label}
                    </td>
                    {(wingFilter === 'all' || wingFilter === 'A') && (
                      <td className="builder-discuss-s90">
                        {fmtINR(BUILDER_RECO_DATA.totalExpensesI.wingA)}
                      </td>
                    )}
                    {(wingFilter === 'all' || wingFilter === 'B') && (
                      <td className="builder-discuss-s90">
                        {fmtINR(BUILDER_RECO_DATA.totalExpensesI.wingB)}
                      </td>
                    )}
                    {wingFilter === 'all' && (
                      <td className="builder-discuss-s91">
                        {fmtINR(BUILDER_RECO_DATA.totalExpensesI.total)}
                      </td>
                    )}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* ── Table 2: Cost Shift (From Wing B to Wing A) ── */}
          <div className="builder-discuss-s71">
            <div className="builder-discuss-s72">
              <div>
                <h3 className="builder-discuss-s73">
                  II. Common Facility Cost Shifts (Shifted from Wing B to Wing A)
                </h3>
                <p className="builder-discuss-s74">
                  Reallocation of common amenities and utility bills originally charged to Wing B
                </p>
              </div>
              <span className="builder-discuss-s92">
                Total Reallocated: ₹4,68,645.00
              </span>
            </div>

            <div className="builder-discuss-s76">
              <table className="builder-discuss-s77">
                <thead>
                  <tr className="builder-discuss-s78">
                    <th className="builder-discuss-s79">
                      Reallocated Item &amp; Details
                    </th>
                    {(wingFilter === 'all' || wingFilter === 'A') && (
                      <th className="builder-discuss-s93">
                        Wing A (+ Charge)
                      </th>
                    )}
                    {(wingFilter === 'all' || wingFilter === 'B') && (
                      <th className="builder-discuss-s94">
                        Wing B (− Relief)
                      </th>
                    )}
                    {wingFilter === 'all' && (
                      <th className="builder-discuss-s81">
                        Net Society Shift
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {BUILDER_RECO_DATA.costShifts.map((c, idx) => (
                    <tr key={c.id} className="builder-discuss-s82" style={{ background: idx % 2 === 0 ? '#ffffff' : 'rgba(255, 252, 247, 0.7)' }}>
                      <td className="builder-discuss-s83">
                        <div className="builder-discuss-s95">
                          <span className="builder-discuss-s96">{c.label}</span>
                          <span className="builder-discuss-s97">
                            {c.category}
                          </span>
                        </div>
                        <div className="builder-discuss-s85">{c.notes}</div>
                      </td>
                      {(wingFilter === 'all' || wingFilter === 'A') && (
                        <td className="builder-discuss-s98">
                          +{fmtINR(c.wingA)}
                        </td>
                      )}
                      {(wingFilter === 'all' || wingFilter === 'B') && (
                        <td className="builder-discuss-s99">
                          {fmtINR(c.wingB)}
                        </td>
                      )}
                      {wingFilter === 'all' && (
                        <td className="builder-discuss-s100">
                          ₹0.00
                        </td>
                      )}
                    </tr>
                  ))}
                  <tr className="builder-discuss-s101">
                    <td className="builder-discuss-s102">
                      {BUILDER_RECO_DATA.totalCostShiftII.label}
                    </td>
                    {(wingFilter === 'all' || wingFilter === 'A') && (
                      <td className="builder-discuss-s103">
                        +{fmtINR(BUILDER_RECO_DATA.totalCostShiftII.wingA)}
                      </td>
                    )}
                    {(wingFilter === 'all' || wingFilter === 'B') && (
                      <td className="builder-discuss-s104">
                        {fmtINR(BUILDER_RECO_DATA.totalCostShiftII.wingB)}
                      </td>
                    )}
                    {wingFilter === 'all' && (
                      <td className="builder-discuss-s105">
                        ₹0.00 (Neutral)
                      </td>
                    )}
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Total Expenses (I + II) Callout */}
            <div className="builder-discuss-s106">
              <div>
                <div className="builder-discuss-s107">
                  FINAL NET OPERATING EXPENDITURE
                </div>
                <div className="builder-discuss-s108">
                  Total Expenses (I + II)
                </div>
              </div>
              <div className="builder-discuss-s109">
                {(wingFilter === 'all' || wingFilter === 'A') && (
                  <div className="builder-discuss-s110">
                    <div className="builder-discuss-s111">Wing A Net</div>
                    <div className="builder-discuss-s112">{fmtINR(BUILDER_RECO_DATA.totalExpensesNet.wingA)}</div>
                  </div>
                )}
                {(wingFilter === 'all' || wingFilter === 'B') && (
                  <div className="builder-discuss-s110">
                    <div className="builder-discuss-s111">Wing B Net</div>
                    <div className="builder-discuss-s112">{fmtINR(BUILDER_RECO_DATA.totalExpensesNet.wingB)}</div>
                  </div>
                )}
                {wingFilter === 'all' && (
                  <div className="builder-discuss-s113">
                    <div className="builder-discuss-s114">Grand Total</div>
                    <div className="builder-discuss-s115">{fmtINR(BUILDER_RECO_DATA.totalExpensesNet.total)}</div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── Table 3 & 4: Receipts & Net Working Balance ── */}
          <div className="builder-discuss-s71">
            <div className="builder-discuss-s72">
              <div>
                <h3 className="builder-discuss-s73">
                  III. Maintenance Receipts &amp; Net Working Balance
                </h3>
                <p className="builder-discuss-s74">
                  Total inflows from account opening, resident collections and vendor rentals
                </p>
              </div>
              <span className="builder-discuss-s116">
                Total Inflows: ₹1,25,89,569.00
              </span>
            </div>

            <div className="builder-discuss-s76">
              <table className="builder-discuss-s77">
                <thead>
                  <tr className="builder-discuss-s78">
                    <th className="builder-discuss-s79">
                      Receipt Category
                    </th>
                    {(wingFilter === 'all' || wingFilter === 'A') && (
                      <th className="builder-discuss-s94">
                        Wing A
                      </th>
                    )}
                    {(wingFilter === 'all' || wingFilter === 'B') && (
                      <th className="builder-discuss-s94">
                        Wing B
                      </th>
                    )}
                    {wingFilter === 'all' && (
                      <th className="builder-discuss-s81">
                        Total Receipts
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {BUILDER_RECO_DATA.receipts.map((r, idx) => (
                    <tr key={r.id} className="builder-discuss-s82" style={{ background: idx % 2 === 0 ? '#ffffff' : 'rgba(255, 252, 247, 0.7)' }}>
                      <td className="builder-discuss-s83">
                        <div className="builder-discuss-s84">{r.label}</div>
                        <div className="builder-discuss-s85">{r.notes}</div>
                      </td>
                      {(wingFilter === 'all' || wingFilter === 'A') && (
                        <td className="builder-discuss-s86">
                          {fmtINR(r.wingA)}
                        </td>
                      )}
                      {(wingFilter === 'all' || wingFilter === 'B') && (
                        <td className="builder-discuss-s86">
                          {fmtINR(r.wingB)}
                        </td>
                      )}
                      {wingFilter === 'all' && (
                        <td className="builder-discuss-s87">
                          {fmtINR(r.total)}
                        </td>
                      )}
                    </tr>
                  ))}
                  {/* Total Receipts */}
                  <tr className="builder-discuss-s117">
                    <td className="builder-discuss-s118">
                      {BUILDER_RECO_DATA.totalReceipts.label}
                    </td>
                    {(wingFilter === 'all' || wingFilter === 'A') && (
                      <td className="builder-discuss-s119">
                        {fmtINR(BUILDER_RECO_DATA.totalReceipts.wingA)}
                      </td>
                    )}
                    {(wingFilter === 'all' || wingFilter === 'B') && (
                      <td className="builder-discuss-s119">
                        {fmtINR(BUILDER_RECO_DATA.totalReceipts.wingB)}
                      </td>
                    )}
                    {wingFilter === 'all' && (
                      <td className="builder-discuss-s120">
                        {fmtINR(BUILDER_RECO_DATA.totalReceipts.total)}
                      </td>
                    )}
                  </tr>

                  {/* Net Balance as per Working */}
                  <tr className="builder-discuss-s121">
                    <td className="builder-discuss-s122">
                      <div>{BUILDER_RECO_DATA.netBalanceWorking.label}</div>
                      <div className="builder-discuss-s123">
                        Formula: {BUILDER_RECO_DATA.netBalanceWorking.formula}
                      </div>
                    </td>
                    {(wingFilter === 'all' || wingFilter === 'A') && (
                      <td className="builder-discuss-s124">
                        {fmtINR(BUILDER_RECO_DATA.netBalanceWorking.wingA)}
                      </td>
                    )}
                    {(wingFilter === 'all' || wingFilter === 'B') && (
                      <td className="builder-discuss-s124">
                        {fmtINR(BUILDER_RECO_DATA.netBalanceWorking.wingB)}
                      </td>
                    )}
                    {wingFilter === 'all' && (
                      <td className="builder-discuss-s125">
                        {fmtINR(BUILDER_RECO_DATA.netBalanceWorking.total)}
                      </td>
                    )}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* ── Table 5 & 6: Audit Reconciliation & Subsequent Movements (2023-2026) ── */}
          <div className="builder-discuss-s126">
            {/* Box A: 31-03-2023 Audit Difference */}
            <div className="builder-discuss-s127">
              <div className="builder-discuss-s128">
                <span className="builder-discuss-s129">⚖️</span>
                <h4 className="builder-discuss-s130">
                  Audit Reconciliation (as of 31-03-2023)
                </h4>
              </div>

              <div className="builder-discuss-s131">
                <div className="builder-discuss-s132">
                  <span className="builder-discuss-s133">Working Book Balance (31-03-2023):</span>
                  <span className="builder-discuss-s134">{fmtINR(BUILDER_RECO_DATA.auditReconciliation.bookBalance)}</span>
                </div>
                <div className="builder-discuss-s132">
                  <span className="builder-discuss-s133">Tally Books Balance (31.03.2023):</span>
                  <span className="builder-discuss-s135">{fmtINR(BUILDER_RECO_DATA.auditReconciliation.tallyBooks)}</span>
                </div>
                <div className="builder-discuss-s136">
                  <div>
                    <div className="builder-discuss-s137">Audit Discrepancy (Diffn):</div>
                    <div className="builder-discuss-s138">Tally books exceed working balance</div>
                  </div>
                  <span className="builder-discuss-s139">
                    +{fmtINR(BUILDER_RECO_DATA.auditReconciliation.difference)}
                  </span>
                </div>
              </div>

              <div className="builder-discuss-s140">
                📌 <strong>Action Point:</strong> Request signed auditor voucher breakdown for the ₹6,954.90 difference before final developer discharge.
              </div>
            </div>

            {/* Box B: Post-31.03.2023 Movements till 31.03.2026 */}
            <div className="builder-discuss-s127">
              <div className="builder-discuss-s141">
                <div className="builder-discuss-s95">
                  <span className="builder-discuss-s129">🏦</span>
                  <h4 className="builder-discuss-s130">
                    Subsequent Movements (2023 – 2026)
                  </h4>
                </div>
                <span className="builder-discuss-s142">
                  Active Ledger
                </span>
              </div>

              <div className="builder-discuss-s143">
                <div className="builder-discuss-s144">
                  <span className="builder-discuss-s145">Opening (Tally Books - 31.03.2023):</span>
                  <span className="builder-discuss-s146">{fmtINR(BUILDER_RECO_DATA.postPeriodLedger.openingBalance)}</span>
                </div>

                {BUILDER_RECO_DATA.postPeriodLedger.transactions.map(t => (
                  <div key={t.id} className="builder-discuss-s147">
                    <div>
                      <div className="builder-discuss-s148">
                        {t.date} — {t.particulars}
                      </div>
                      <div className="builder-discuss-s149">{t.remarks}</div>
                    </div>
                    <span className="builder-discuss-s150">
                      {fmtINR(t.amount)}
                    </span>
                  </div>
                ))}

                {/* Final Closing Tally Balance */}
                <div className="builder-discuss-s151">
                  <div>
                    <div className="builder-discuss-s152">
                      Tally Book Balance (31.03.2026)
                    </div>
                    <div className="builder-discuss-s153">Net unspent developer Phase II surplus</div>
                  </div>
                  <span className="builder-discuss-s154">
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
        <div className="builder-discuss-s46">

          {/* CA Certification Header Card */}
          <div className="builder-discuss-s155">
            <div>
              <div className="builder-discuss-s156">
                <span className="builder-discuss-s129">📜</span>
                <span className="builder-discuss-s157">
                  CHARTERED ACCOUNTANTS CERTIFIED STATEMENT
                </span>
                <span className="builder-discuss-s158">
                  FRN: {WING_A_AUDITED_STATEMENT.meta.auditor.frn}
                </span>
              </div>
              <h3 className="builder-discuss-s159">
                {WING_A_AUDITED_STATEMENT.meta.societyName}
              </h3>
              <p className="builder-discuss-s160">
                {WING_A_AUDITED_STATEMENT.meta.title} for the period from <strong>{WING_A_AUDITED_STATEMENT.meta.period}</strong>
              </p>
              <div className="builder-discuss-s161">
                Auditor: <strong>{WING_A_AUDITED_STATEMENT.meta.auditor.firm}</strong> • {WING_A_AUDITED_STATEMENT.meta.auditor.proprietor} (M. No. {WING_A_AUDITED_STATEMENT.meta.auditor.membershipNo}, Empanelment No. {WING_A_AUDITED_STATEMENT.meta.auditor.coopDeptEmpanelmentNo})
              </div>
            </div>

            <div className="builder-discuss-s162">
              <button
                onClick={() => { setModalDefaultDoc('wingA'); setShowDocModal(true); }}
                className="builder-discuss-s163"
              >
                <span>🔍</span>
                <span>Inspect Scanned CA Certificate</span>
              </button>

              <button
                onClick={handleExportWingACSV}
                className="builder-discuss-s164"
              >
                <span>📥</span>
                <span>Export CSV</span>
              </button>

              <button
                onClick={handlePrintWingA}
                className="builder-discuss-s164"
              >
                <span>🖨️</span>
                <span>Print Statement</span>
              </button>
            </div>
          </div>

          {/* Top 4 KPI Metrics */}
          <div className="builder-discuss-s55">
            <div className="builder-discuss-s165">
              <div className="builder-discuss-s166">
                Total Audited Income
              </div>
              <div className="builder-discuss-s167">
                {fmtINR(WING_A_AUDITED_STATEMENT.income.totalIncome)}
              </div>
              <div className="builder-discuss-s168">
                Maintenance: ₹61.73L • Savings Int: ₹3,516
              </div>
            </div>

            <div className="builder-discuss-s165">
              <div className="builder-discuss-s169">
                Total Audited Expenditure
              </div>
              <div className="builder-discuss-s167">
                {fmtINR(WING_A_AUDITED_STATEMENT.expenditure.totalExpenditure)}
              </div>
              <div className="builder-discuss-s168">
                15 itemized line heads audited
              </div>
            </div>

            <div className="builder-discuss-s170">
              <div className="builder-discuss-s171">
                Surplus Transferred to Society
              </div>
              <div className="builder-discuss-s172">
                {fmtINR(WING_A_AUDITED_STATEMENT.surplus)}
              </div>
              <div className="builder-discuss-s173">
                64.06% surplus ratio retained
              </div>
            </div>

            <div className="builder-discuss-s165">
              <div className="builder-discuss-s174">
                Highest Expense Head
              </div>
              <div className="builder-discuss-s175">
                Security Charges (₹7.54L)
              </div>
              <div className="builder-discuss-s168">
                33.95% of total Wing A expenses
              </div>
            </div>
          </div>

          {/* Income Table Card */}
          <div className="builder-discuss-s176">
            <div className="builder-discuss-s177">
              <h4 className="builder-discuss-s178">
                Income Particulars
              </h4>
            </div>
            <table className="builder-discuss-s179">
              <thead>
                <tr className="builder-discuss-s78">
                  <th className="builder-discuss-s79">
                    Particulars
                  </th>
                  <th className="builder-discuss-s180">
                    Amount (Rs.)
                  </th>
                </tr>
              </thead>
              <tbody>
                {WING_A_AUDITED_STATEMENT.income.items.map((item, idx) => (
                  <tr key={item.id} className="builder-discuss-s82" style={{ background: idx % 2 === 0 ? '#ffffff' : 'rgba(255, 252, 247, 0.7)' }}>
                    <td className="builder-discuss-s181">
                      {item.particular}
                      <span className="builder-discuss-s182">({item.notes})</span>
                    </td>
                    <td className="builder-discuss-s183">
                      {fmtINR(item.amount)}
                    </td>
                  </tr>
                ))}
                <tr className="builder-discuss-s117">
                  <td className="builder-discuss-s184">Total Income</td>
                  <td className="builder-discuss-s185">
                    {fmtINR(WING_A_AUDITED_STATEMENT.income.totalIncome)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Expenditure Table Card */}
          <div className="builder-discuss-s176">
            <div className="builder-discuss-s186">
              <div>
                <h4 className="builder-discuss-s130">
                  Audited Expenditure Schedule (15 Line Items)
                </h4>
                <p className="builder-discuss-s74">
                  Exact items extracted from audited books of account
                </p>
              </div>

              {/* Category & Search Filter */}
              <div className="builder-discuss-s187">
                <input
                  type="search"
                  placeholder="Filter expenses…"
                  value={wingASearch}
                  onChange={e => setWingASearch(e.target.value)}
                  className="builder-discuss-s188"
                />
                <select
                  value={wingACategory}
                  onChange={e => setWingACategory(e.target.value)}
                  className="builder-discuss-s189"
                >
                  {wingACategoriesList.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>

            <div className="builder-discuss-s76">
              <table className="builder-discuss-s190">
                <thead>
                  <tr className="builder-discuss-s78">
                    <th className="builder-discuss-s191">
                      SR
                    </th>
                    <th className="builder-discuss-s79">
                      Expenditure Particulars
                    </th>
                    <th className="builder-discuss-s192">
                      Category Head
                    </th>
                    <th className="builder-discuss-s193">
                      % Share
                    </th>
                    <th className="builder-discuss-s194">
                      Amount (Rs.)
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredWingAExpenses.map((e, idx) => {
                    const pct = ((e.amount / WING_A_AUDITED_STATEMENT.expenditure.totalExpenditure) * 100).toFixed(2);
                    return (
                      <tr key={e.id} className="builder-discuss-s82" style={{ background: idx % 2 === 0 ? '#ffffff' : 'rgba(255, 252, 247, 0.7)' }}>
                        <td className="builder-discuss-s195">{idx + 1}</td>
                        <td className="builder-discuss-s196">
                          <div className="builder-discuss-s96">{highlight(e.particular, wingASearch)}</div>
                          <div className="builder-discuss-s197">{e.notes}</div>
                        </td>
                        <td className="builder-discuss-s198">
                          <span className="builder-discuss-s199">
                            {e.category}
                          </span>
                        </td>
                        <td className="builder-discuss-s200">
                          {pct}%
                        </td>
                        <td className="builder-discuss-s201">
                          {fmtINR(e.amount)}
                        </td>
                      </tr>
                    );
                  })}

                  {/* Total Expenditure Row */}
                  <tr className="builder-discuss-s202">
                    <td colSpan={4} className="builder-discuss-s203">
                      Total Expenditure
                    </td>
                    <td className="builder-discuss-s204">
                      {fmtINR(WING_A_AUDITED_STATEMENT.expenditure.totalExpenditure)}
                    </td>
                  </tr>

                  {/* Surplus Row */}
                  <tr className="builder-discuss-s205">
                    <td colSpan={4} className="builder-discuss-s206">
                      Surplus / Deficit (Net Transferred)
                    </td>
                    <td className="builder-discuss-s207">
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
        <div className="builder-discuss-s46">

          {/* Quick-Access Forensic Cross-Audit Banner */}
          <div className="builder-discuss-s208">
            <div className="builder-discuss-s9">
              <span className="builder-discuss-s209">🔬</span>
              <div>
                <div className="builder-discuss-s137">
                  Forensic Cross-Audit Alert: 23 Missing Invoices & ₹15.31L Wing B Leakage Identified
                </div>
                <div className="builder-discuss-s210">
                  We cross-referenced these 135 BOM passbook transactions against CA Hardik Mehta&apos;s Annexure 4 audit exception list.
                </div>
              </div>
            </div>
            <button
              onClick={() => setSubTab('bomAnalytics')}
              className="builder-discuss-s211"
            >
              <span>📊</span>
              <span>Open Missing Bills Analytics</span>
            </button>
          </div>

          {/* ── Header Card ── */}
          <div className="builder-discuss-s212">
            <div>
              <div className="builder-discuss-s213">
                <span className="builder-discuss-s214">
                  BANK OF MAHARASHTRA • A/C 60305942224
                </span>
                <span className="builder-discuss-s215">
                  1-Jul-2021 to 23-Nov-2021 (Settlements till Jan 2023)
                </span>
                <span className="builder-discuss-s216">
                  Handwritten Note: Exp Till - 31/03/2023
                </span>
              </div>
              <h3 className="builder-discuss-s217">
                Eisha Asset Developers Phase-II — Passbook & Tally Ledger Book
              </h3>
              <p className="builder-discuss-s218">
                Full 4-page verified audit trail accounting for ₹50,04,602.50 in disbursements, seed refunds, supervision fees, and ₹24L transfer to Wing A Society.
              </p>
            </div>

            <div className="builder-discuss-s162">
              <button
                onClick={() => { setModalDefaultDoc('ledger1'); setShowDocModal(true); }}
                className="builder-discuss-s219"
              >
                <span>🔍</span>
                <span>Inspect Passbook Scans (4 Pgs)</span>
              </button>

              <button
                onClick={handleExportBOMCSV}
                className="builder-discuss-s220"
              >
                <span>📥</span>
                <span>Export CSV ({filteredLedger.length})</span>
              </button>

              <button
                onClick={handlePrintBOM}
                className="builder-discuss-s221"
              >
                <span>🖨️</span>
                <span>Print / PDF Ledger</span>
              </button>
            </div>
          </div>

          {/* ── Reconciliation Link Box ── */}
          <div className="builder-discuss-s222">
            <div className="builder-discuss-s223">🔗</div>
            <div>
              <div className="builder-discuss-s224">
                Evidentiary Backbone for Developer Maintenance Reco Sheet
              </div>
              <div className="builder-discuss-s225">
                This 4-page Bank of Maharashtra passbook ledger directly backs up <strong>Row 2: "From 01.07.21 to 26.11.2021 (as working)" (₹49,01,564.50)</strong> and <strong>Row 3: "Refund to EADP II Account opening Amount" (₹1,00,000.00)</strong> in the master Developer Reco Sheet. Total payments match ₹50,04,602.50 against ₹56,24,072.90 in receipts, leaving a certified difference of <strong>₹6,19,470.40</strong>.
              </div>
            </div>
          </div>

          {/* ── Key Highlight Cards ── */}
          <div className="builder-discuss-s226">
            <div className="builder-discuss-s227">
              <div className="builder-discuss-s228">
                Major Handover Transfer
              </div>
              <div className="builder-discuss-s229">
                ₹24,00,000.00
              </div>
              <div className="builder-discuss-s230">
                Transferred to <strong>Majestique Euriska A Building Sahakari Gruhrachna Sanstha</strong> on <strong>26-11-2021</strong> (Vch #512).
              </div>
            </div>

            <div className="builder-discuss-s231">
              <div className="builder-discuss-s232">
                Developer Supervision Charges
              </div>
              <div className="builder-discuss-s233">
                ₹6,20,000.00
              </div>
              <div className="builder-discuss-s230">
                Charged on <strong>23-11-2021</strong>: Wing A debited <strong>₹2,70,000</strong> (Vch #498) &amp; Wing B debited <strong>₹3,50,000</strong> (Vch #499).
              </div>
            </div>

            <div className="builder-discuss-s234">
              <div className="builder-discuss-s235">
                Account Opening Refund
              </div>
              <div className="builder-discuss-s236">
                ₹1,00,000.00
              </div>
              <div className="builder-discuss-s230">
                Refunded to <strong>BOM C/A No. 60186732081</strong> on <strong>23-11-2021</strong> (Contra Vch #43).
              </div>
            </div>

            <div className="builder-discuss-s237">
              <div className="builder-discuss-s238">
                Closing Book Difference
              </div>
              <div className="builder-discuss-s239">
                ₹6,19,470.40
              </div>
              <div className="builder-discuss-s230">
                Total Inflow ₹56.24L less Total Outflow ₹50.05L (Handwritten notation: <em>Exp Till - 31/03/2023</em>).
              </div>
            </div>
          </div>

          {/* ── KPI Metric Summaries ── */}
          <div className="builder-discuss-s240">
            <div className="builder-discuss-s241">
              <div className="builder-discuss-s242">Total Inflows (Debits)</div>
              <div className="builder-discuss-s243">{fmtINR(BOM_PASSBOOK_LEDGER.meta.totals.totalDebit)}</div>
              <div className="builder-discuss-s244">Opening: ₹56.23L + BigBasket: ₹1.5K</div>
            </div>

            <div className="builder-discuss-s241">
              <div className="builder-discuss-s242">Total Outflows (Credits)</div>
              <div className="builder-discuss-s245">{fmtINR(BOM_PASSBOOK_LEDGER.meta.totals.totalCredit)}</div>
              <div className="builder-discuss-s246">135 Total Ledger Rows</div>
            </div>

            <div className="builder-discuss-s247">
              <div className="builder-discuss-s248">Wing A Outflow Share</div>
              <div className="builder-discuss-s249">{fmtINR(BOM_PASSBOOK_LEDGER.meta.wingBreakdown.A.credits)}</div>
              <div className="builder-discuss-s250">48 items (incl ₹24L trf & ₹2.7L sup)</div>
            </div>

            <div className="builder-discuss-s251">
              <div className="builder-discuss-s252">Wing B Outflow Share</div>
              <div className="builder-discuss-s253">{fmtINR(BOM_PASSBOOK_LEDGER.meta.wingBreakdown.B.credits)}</div>
              <div className="builder-discuss-s254">77 items (incl ₹3.5L supervision)</div>
            </div>

            <div className="builder-discuss-s255">
              <div className="builder-discuss-s256">Common (C) &amp; Refund</div>
              <div className="builder-discuss-s257">₹1,03,038.00</div>
              <div className="builder-discuss-s258">DG repair (₹3,038) + EADP (₹1L)</div>
            </div>
          </div>

          {/* ── Interactive Filter & Search Bar ── */}
          <div className="builder-discuss-s259">
            <div className="builder-discuss-s260">
              {/* Search Box */}
              <div className="builder-discuss-s261">
                <span className="builder-discuss-s262">🔍</span>
                <input
                  type="search"
                  placeholder="Search particulars, voucher #, remark, or date…"
                  value={ledgerSearch}
                  onChange={e => setLedgerSearch(e.target.value)}
                  className="builder-discuss-s263"
                />
              </div>

              {/* Wing Filter */}
              <div className="builder-discuss-s264">
                <span className="builder-discuss-s265">Wing:</span>
                {['All', 'A', 'B', 'C', 'Refund', 'Opening'].map(w => {
                  const active = ledgerWing === w;
                  return (
                    <button
                      key={w}
                      onClick={() => setLedgerWing(w)}
                      className="builder-discuss-s266" style={{ border: active ? '1.5px solid #0b2b26' : '1px solid rgba(61, 63, 52, 0.15)', background: active ? '#0b2b26' : '#ffffff', color: active ? '#ffffff' : '#1d2a24', fontWeight: active ? 700 : 500 }}
                    >
                      {w === 'All' ? 'All Wings' : `Wing ${w}`}
                    </button>
                  );
                })}
              </div>

              {/* Page Filter */}
              <div className="builder-discuss-s264">
                <span className="builder-discuss-s265">Page:</span>
                {['All', '1', '2', '3', '4'].map(p => {
                  const active = ledgerPage === p;
                  return (
                    <button
                      key={p}
                      onClick={() => setLedgerPage(p)}
                      className="builder-discuss-s267" style={{ border: active ? '1.5px solid #0b2b26' : '1px solid rgba(61, 63, 52, 0.15)', background: active ? '#0b2b26' : '#ffffff', color: active ? '#ffffff' : '#1d2a24', fontWeight: active ? 700 : 500 }}
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
                  className="builder-discuss-s268"
                >
                  Clear Filters
                </button>
              )}
            </div>

            {/* Category / Remark Pills */}
            <div className="builder-discuss-s269">
              <span className="builder-discuss-s270">Head:</span>
              {['All', 'Security', 'Houskeeping', 'ELECTRICITY', 'WATERMAN', 'Swimming pool', 'Supervision Charges', 'A Bldg Society', 'TDS', 'BPCL', 'DG repairing', 'Audit Fees'].map(r => {
                const active = ledgerRemark === r;
                return (
                  <button
                    key={r}
                    onClick={() => setLedgerRemark(r)}
                    className="builder-discuss-s271" style={{ border: active ? '1px solid #0b2b26' : '1px solid rgba(61, 63, 52, 0.12)', background: active ? '#0b2b26' : 'rgba(255, 250, 242, 0.7)', color: active ? '#C49B4F' : '#3d3f34', fontWeight: active ? 700 : 500 }}
                  >
                    {r}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Transactions Table ── */}
          <div className="builder-discuss-s272">
            <div className="builder-discuss-s76">
              <table className="builder-discuss-s273">
                <thead>
                  <tr className="builder-discuss-s274">
                    <th className="builder-discuss-s275">#</th>
                    <th className="builder-discuss-s276">Date</th>
                    <th className="builder-discuss-s277">Cr/Dr</th>
                    <th className="builder-discuss-s278">Particulars</th>
                    <th className="builder-discuss-s279">Vch Type</th>
                    <th className="builder-discuss-s280">Vch No</th>
                    <th className="builder-discuss-s278">Remark / Head</th>
                    <th className="builder-discuss-s281">Wing</th>
                    <th className="builder-discuss-s282">Debit (₹)</th>
                    <th className="builder-discuss-s283">Credit (₹)</th>
                    <th className="builder-discuss-s284">Scan</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLedger.length === 0 ? (
                    <tr>
                      <td colSpan="11" className="builder-discuss-s285">
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
                          className="builder-discuss-s286" style={{ background: isSpecialTransfer ? 'rgba(254, 243, 199, 0.4)' : isEven ? '#ffffff' : '#fafafa' }}
                        >
                          <td className="builder-discuss-s287">{t.id}</td>
                          <td className="builder-discuss-s288">{t.date}</td>
                          <td className="builder-discuss-s289" style={{ color: t.crdr === 'Cr' || t.crdr === 'CR' ? '#065f46' : '#991b1b' }}>{t.crdr}</td>
                          <td className="builder-discuss-s290" style={{ fontWeight: isSpecialTransfer ? 800 : 600, color: isSpecialTransfer ? '#0b2b26' : '#1d2a24' }}>
                            {t.particulars}
                          </td>
                          <td className="builder-discuss-s291">
                            <span className="builder-discuss-s292" style={{ background: t.vchType === 'Payment' ? '#fef2f2' : t.vchType === 'Receipt' ? '#ecfdf5' : '#f5f3ff', color: t.vchType === 'Payment' ? '#991b1b' : t.vchType === 'Receipt' ? '#065f46' : '#5b21b6' }}>
                              {t.vchType || '—'}
                            </span>
                          </td>
                          <td className="builder-discuss-s293">{t.vchNo || '—'}</td>
                          <td className="builder-discuss-s294">
                            <span className="builder-discuss-s295">
                              {t.remark || '—'}
                            </span>
                          </td>
                          <td className="builder-discuss-s296">
                            <span className="builder-discuss-s297" style={{ background: wingBg, color: wingColor, border: `1px solid ${wingBorder}` }}>
                              {t.wing}
                            </span>
                          </td>
                          <td className="builder-discuss-s298" style={{ color: t.debit ? '#065f46' : '#cbd5e1' }}>
                            {t.debit ? fmtINR(t.debit) : '—'}
                          </td>
                          <td className="builder-discuss-s298" style={{ color: t.credit ? (isSpecialTransfer ? '#b91c1c' : '#1d2a24') : '#cbd5e1' }}>
                            {t.credit ? fmtINR(t.credit) : '—'}
                          </td>
                          <td className="builder-discuss-s296">
                            <button
                              onClick={() => {
                                setModalDefaultDoc(`ledger${t.page}`);
                                setShowDocModal(true);
                              }}
                              className="builder-discuss-s299"
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
                  <tr className="builder-discuss-s300">
                    <td colSpan="8" className="builder-discuss-s301">
                      TOTALS ({filteredLedger.length} filtered entries)
                    </td>
                    <td className="builder-discuss-s302">
                      {fmtINR(ledgerTotals.debit)}
                    </td>
                    <td className="builder-discuss-s303">
                      {fmtINR(ledgerTotals.credit)}
                    </td>
                    <td></td>
                  </tr>
                  <tr className="builder-discuss-s304">
                    <td colSpan="8" className="builder-discuss-s305">
                      Net Passbook Difference (Total Debits − Total Credits)
                    </td>
                    <td colSpan="2" className="builder-discuss-s306">
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
