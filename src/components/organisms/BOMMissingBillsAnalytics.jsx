import { useState, useMemo } from 'react';
import {
  BOM_FORENSIC_SUMMARY,
  VENDOR_FORENSIC_MATRIX,
  MISSING_BILLS_RECONCILIATION_LIST,
  ENRICHED_BOM_TRANSACTIONS,
  BOM_MONTHLY_DRAIN_TIMELINE
} from '../../data/bomMissingBillsAnalyticsData.js';
import { fmtINR } from '../../data/builderRecoData.js';
import './BOMMissingBillsAnalytics.css';


export default function BOMMissingBillsAnalytics({ _isAdmin = false, onNavigateTab }) {
  const [activeFilter, setActiveFilter] = useState('all'); // 'all' | 'missing' | 'wingB' | 'unvouched' | 'society'
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [activeViewMode, setActiveViewMode] = useState('recovery'); // 'recovery' | 'summary' | 'vendors' | 'annexure4' | 'register'

  // Interactive Recovery Calculator State
  const [calcItems, setCalcItems] = useState({
    baseCertified: true, // ₹9,00,790 (locked)
    schindlerLift: true, // +₹1,23,736
    otherMissingBills: true, // +₹2,85,475
    itcRefund: true, // +₹1,39,070
    bankShortfall: false, // +₹5,09,271.17
    supervisionDebit: false, // +₹2,70,000
    wingBSubsidy: false, // +₹7,27,249
    cashWithdrawals: false // +₹47,145
  });
  const [interestMode, setInterestMode] = useState('ca8'); // 'none' | 'ca8' | 'rera'

  // Dynamic Expected Recovery Calculation
  const dynamicRecovery = useMemo(() => {
    let principal = 900790; // Base Certified Principal
    if (calcItems.schindlerLift) principal += 123736;
    if (calcItems.otherMissingBills) principal += 285475;
    if (calcItems.itcRefund) principal += 139070;
    if (calcItems.bankShortfall) principal += 509271.17;
    if (calcItems.supervisionDebit) principal += 270000;
    if (calcItems.wingBSubsidy) principal += 727249;
    if (calcItems.cashWithdrawals) principal += 47145;

    let intRate = 0;
    let intLabel = '0% (Principal Only)';
    if (interestMode === 'ca8') {
      intRate = 0.08 * (51 / 12); // 34%
      intLabel = '8.0% p.a. CA Recommended (51 Months = 34%)';
    } else if (interestMode === 'rera') {
      intRate = 0.1075 * (51 / 12); // 45.69%
      intLabel = '10.75% p.a. MahaRERA Statutory Rate (51 Months = 45.7%)';
    }

    const interest = principal * intRate;
    const total = principal + interest;

    return {
      principal,
      intRate,
      intLabel,
      interest,
      total,
      gainOverBase: total - 1207058
    };
  }, [calcItems, interestMode]);

  // Summary figures
  const s = BOM_FORENSIC_SUMMARY;

  // Filtered Enriched Transactions
  const filteredTransactions = useMemo(() => {
    return ENRICHED_BOM_TRANSACTIONS.filter(t => {
      // Status filter
      if (activeFilter === 'missing') {
        if (!t.forensicCat.includes('missing') && !t.forensicCat.includes('recurring')) return false;
      } else if (activeFilter === 'wingB') {
        if (t.forensicCat !== 'wing_b_drain' && t.wing !== 'B') return false;
      } else if (activeFilter === 'unvouched') {
        if (t.forensicCat !== 'supervision_unvouched' && t.forensicCat !== 'cash_withdrawal' && t.forensicCat !== 'developer_tax_transfer') return false;
      } else if (activeFilter === 'society') {
        if (t.forensicCat !== 'society_transfer') return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const text = [
          t.particulars,
          t.remark,
          t.vchNo,
          t.date,
          t.wing,
          t.forensicTag,
          t.forensicNote
        ].join(' ').toLowerCase();
        if (!text.includes(q)) return false;
      }

      return true;
    });
  }, [activeFilter, searchQuery]);

  // Export filtered data as CSV
  const handleExportCSV = () => {
    const headers = ['ID', 'Date', 'Voucher No', 'Voucher Type', 'Particulars / Payee', 'Wing', 'Debit (Inflow)', 'Credit (Payment)', 'Forensic Category', 'Forensic Audit Finding'];
    const rows = filteredTransactions.map(t => [
      t.id,
      t.date,
      t.vchNo || '—',
      t.vchType || '—',
      `"${(t.particulars || '').replace(/"/g, '""')}"`,
      t.wing,
      t.debit || 0,
      t.credit || 0,
      `"${t.forensicTag}"`,
      `"${(t.forensicNote || '').replace(/"/g, '""')}"`
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `BOM_Passbook_Forensic_Cross_Audit_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrintDossier = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Majestique Euriska - Complete Forensic Audit Dossier</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; margin: 24px; color: #1e293b; font-size: 11px; }
          h1 { color: #0b2b26; font-size: 18px; margin: 0 0 3px 0; text-transform: uppercase; }
          h2 { color: #b45309; font-size: 12px; margin: 0 0 12px 0; text-transform: uppercase; }
          h3 { color: #0b2b26; font-size: 12px; margin: 18px 0 6px 0; border-bottom: 2px solid #0b2b26; padding-bottom: 4px; text-transform: uppercase; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 16px; font-size: 10px; }
          th, td { border: 1px solid #cbd5e1; padding: 4px 6px; text-align: left; }
          th { background: #0b2b26; color: #ffffff; font-weight: bold; }
          .num { text-align: right; }
          .center { text-align: center; }
          .total { font-weight: bold; background: #f1f5f9; }
          .success { font-weight: bold; background: #ecfdf5; }
          .highlight { background: #fef2f2; }
        </style>
      </head>
      <body>
        <h1>Majestique Euriska 'A' Building Co-Op Hsg Society Ltd.</h1>
        <div style="font-size: 11px; color: #475569; margin-bottom: 2px;">Reg. No: PNA/PNA (4)/HSG/(TC)/21207/2019-20 • S. No. 2, Plot No C-1, Village Mohammed Wadi, Taluka Haveli, Pune - 411060</div>
        <h2 style="margin-top: 4px;">Forensic Audit Dossier &amp; Builder Recovery Negotiation Report</h2>
        <div style="font-size: 10px; color: #64748b; margin-bottom: 14px;">
          UDIN: 26162502TFCJWK8860 | Bank A/c: BOM 60305942224 | Date: ${new Date().toLocaleDateString('en-IN')}
        </div>

        <h3>1. Executive Summary & Key Metrics</h3>
        <table>
          <tr>
            <td><strong>BOM Total Inflows:</strong> ${fmtINR(s.totalInflows)}</td>
            <td><strong>BOM Total Outflows:</strong> ${fmtINR(s.totalOutflows)}</td>
          </tr>
          <tr>
            <td><strong>Society Handover Transfer:</strong> ${fmtINR(s.societyHandoverTransfer)}</td>
            <td><strong>Unaccounted Bank Shortfall:</strong> ${fmtINR(s.unaccountedBankShortfall)}</td>
          </tr>
          <tr>
            <td><strong>Wing B Outflow Drain:</strong> ${fmtINR(s.wingBOutflows)} (30.59%)</td>
            <td><strong>CA Certified Dues (Floor):</strong> ${fmtINR(s.caNetAuditedDues)}</td>
          </tr>
        </table>

        <h3>2. Full & Final (F&F) Settlement Tiers</h3>
        <table>
          <thead>
            <tr><th>Tier</th><th>Amount (₹)</th><th>Status</th><th>Audit Justification</th></tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>Tier 1: Certified Floor</strong></td>
              <td class="num"><strong>₹12,07,058</strong></td>
              <td>100% Certified Minimum</td>
              <td>₹9,00,790 Principal Surplus + ₹3,06,268 statutory interest @ 8% p.a. (51 months) under CA UDIN.</td>
            </tr>
            <tr class="success">
              <td><strong>Tier 2: Realistic Target (F&F)</strong></td>
              <td class="num"><strong>₹19,41,755</strong></td>
              <td><strong>Recommended F&F (Target: ₹18L–₹20L)</strong></td>
              <td>Base ₹12.07L + ₹4,09,211 Missing Invoices (Schindler lift ₹1.24L, pools, gardens) + ₹1,39,070 GST ITC + 8% interest.</td>
            </tr>
            <tr>
              <td><strong>Tier 3: Opening Demand Anchor</strong></td>
              <td class="num"><strong>₹30,49,153</strong></td>
              <td>Opening Anchor (₹28L–₹31L)</td>
              <td>Tier 2 + ₹5,09,271 BOM passbook shortfall + ₹2,70,000 builder supervision self-debit + cash withdrawals + interest.</td>
            </tr>
            <tr>
              <td><strong>Tier 4: MahaRERA Scope</strong></td>
              <td class="num"><strong>₹45,75,525</strong></td>
              <td>Litigation Filing Scope</td>
              <td>Tier 3 + ₹7,27,249 Wing B cross-subsidy recovery (47.5%) + MahaRERA statutory interest @ 10.75% p.a. (₹13.72L) + compensation.</td>
            </tr>
          </tbody>
        </table>

        <h3>3. Key Payee Forensic Cross-Match (12 Major Vendors)</h3>
        <table>
          <thead>
            <tr><th>Vendor</th><th>Category</th><th class="num">BOM Paid (₹)</th><th class="num">Wing A (₹)</th><th class="num">Wing B (₹)</th><th>Audit Status</th><th>Finding</th></tr>
          </thead>
          <tbody>
            ${VENDOR_FORENSIC_MATRIX.map(v => `
              <tr class="${v.bomTotalPaid === 0 || v.bomWingBPaid > v.bomWingAPaid ? 'highlight' : ''}">
                <td><strong>${v.vendor}</strong></td>
                <td>${v.category}</td>
                <td class="num">${fmtINR(v.bomTotalPaid)}</td>
                <td class="num">${fmtINR(v.bomWingAPaid)}</td>
                <td class="num">${fmtINR(v.bomWingBPaid)}</td>
                <td>${v.caMissingCategory}</td>
                <td style="font-size: 9px;">${v.auditFinding}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <h3>4. CA Annexure 4: Complete 23 Missing Invoices List (Total ₹4,09,211)</h3>
        <table>
          <thead>
            <tr><th>#</th><th>Date</th><th>Vendor / Payee</th><th>Nature</th><th class="num">Doc (₹)</th><th class="num">Wing A (₹)</th><th>Classification</th><th>Verification Finding</th></tr>
          </thead>
          <tbody>
            ${MISSING_BILLS_RECONCILIATION_LIST.map((m, idx) => `
              <tr class="${m.type.includes('Part A') ? 'highlight' : ''}">
                <td class="center">${idx + 1}</td>
                <td>${m.pmtVoucherDate}</td>
                <td><strong>${m.vendor}</strong></td>
                <td>${m.nature}</td>
                <td class="num">${fmtINR(m.docAmt)}</td>
                <td class="num"><strong>${fmtINR(m.allocatedAmt)}</strong></td>
                <td>${m.type}</td>
                <td style="font-size: 9px;">${m.forensicNote}</td>
              </tr>
            `).join('')}
            <tr class="total">
              <td colspan="5">TOTAL 23 MISSING INVOICES CLAIMED WITHOUT BILLS</td>
              <td class="num"><strong>${fmtINR(s.caTotalMissingBills)}</strong></td>
              <td colspan="2">Disallowed in CA Forensic Audit</td>
            </tr>
          </tbody>
        </table>

        <h3>5. Bank of Maharashtra A/c 60305942224 Passbook Ledger (135 Transactions)</h3>
        <table>
          <thead>
            <tr><th>#</th><th>Date</th><th>Vch No</th><th>Type</th><th>Particulars</th><th class="center">Wing</th><th class="num">Debit (₹)</th><th class="num">Credit (₹)</th><th>Audit Tag</th></tr>
          </thead>
          <tbody>
            ${ENRICHED_BOM_TRANSACTIONS.map(t => `
              <tr class="${t.wing === 'B' || t.forensicCat === 'supervision_unvouched' || t.forensicCat === 'cash_withdrawal' ? 'highlight' : ''}">
                <td class="center">${t.id}</td>
                <td>${t.date}</td>
                <td>${t.vchNo || '—'}</td>
                <td>${t.vchType || '—'}</td>
                <td><strong>${t.particulars}</strong></td>
                <td class="center"><strong>${t.wing}</strong></td>
                <td class="num">${t.debit ? fmtINR(t.debit) : '—'}</td>
                <td class="num">${t.credit ? fmtINR(t.credit) : '—'}</td>
                <td style="font-size: 9px;">${t.forensicTag}</td>
              </tr>
            `).join('')}
            <tr class="total">
              <td colspan="6">GRAND TOTAL (135 TRANSACTIONS)</td>
              <td class="num">${fmtINR(s.totalInflows)}</td>
              <td class="num">${fmtINR(s.totalOutflows)}</td>
              <td>Net: ${fmtINR(s.calculatedBankBalance)}</td>
            </tr>
          </tbody>
        </table>

        <div style="margin-top: 30px; padding-top: 15px; border-top: 1px solid #cbd5e1; font-size: 10px; color: #64748b;">
          Certified based on Bank of Maharashtra Passbook & CA Hardik Mehta Independent Forensic Audit (UDIN: 26162502TFCJWK8860).
        </div>
      </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  return (
    <div className="b-o-m-missing-bills-analytics-s1">

      {/* ── 1. LUXURY EXECUTIVE HEADER ─────────────────────────────────────── */}
      <div className="b-o-m-missing-bills-analytics-s2">
        <div className="b-o-m-missing-bills-analytics-s3" />

        <div className="b-o-m-missing-bills-analytics-s4">
          <div className="b-o-m-missing-bills-analytics-s5">
            <div className="b-o-m-missing-bills-analytics-s6">
              <span className="b-o-m-missing-bills-analytics-s7">
                FORENSIC CROSS-AUDIT & RECONCILIATION
              </span>
              <span className="b-o-m-missing-bills-analytics-s8">
                BOM A/c 60305942224 vs CA Hardik Mehta Annexure 4
              </span>
              <span className="b-o-m-missing-bills-analytics-s9">
                135 Bank Records Verified
              </span>
            </div>

            <h1 className="b-o-m-missing-bills-analytics-s10">
              BOM Passbook Ledger vs CA Missing Invoices Analytics
            </h1>

            <p className="b-o-m-missing-bills-analytics-s11">
              Deep cross-reconciliation of all <strong>135 Bank of Maharashtra Passbook transactions (₹50.05L outflows)</strong> against 
              CA Hardik Mehta&apos;s 14-page audit report. Identifies <strong>₹4.09L in missing/unvouched invoices</strong>, 
              <strong> ₹15.31L in Wing B cross-subsidies</strong> drained from the common Phase II account, and 
              <strong> ₹9.32L in unvouched builder self-debits</strong>.
            </p>
          </div>

          <div className="b-o-m-missing-bills-analytics-s12">
            <button
              onClick={() => setActiveViewMode('recovery')}
              className={`b-o-m-missing-bills-analytics-s13 ${(activeViewMode === 'recovery' ? 'b-o-m-missing-bills-analytics-cond-1-true' : 'b-o-m-missing-bills-analytics-cond-2-false')}`}
            >
              🎯 Expected Recovery Calculator
            </button>
            <a
              href="/downloads/Majestique_Euriska_Builder_Forensic_Audit_Full_Dossier.pdf"
              download="Majestique_Euriska_Builder_Forensic_Audit_Full_Dossier.pdf"
              className="b-o-m-missing-bills-analytics-s14"
            >
              📥 Download Complete PDF Dossier
            </a>
            <button
              onClick={handlePrintDossier}
              className="b-o-m-missing-bills-analytics-s15"
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.26)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.16)'; }}
            >
              🖨️ Print / Save PDF
            </button>
            <button
              onClick={handleExportCSV}
              className="b-o-m-missing-bills-analytics-s16"
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.22)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.12)'; }}
            >
              📊 Export CSV
            </button>
            {onNavigateTab && (
              <button
                onClick={() => onNavigateTab('caReport')}
                className="b-o-m-missing-bills-analytics-s17"
              >
                📄 View CA Report
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── 2. EXECUTIVE FORENSIC KPI METRIC CARDS ──────────────────────────── */}
      <div className="b-o-m-missing-bills-analytics-s18">
        {/* KPI 1: CA Missing Invoices */}
        <div className="b-o-m-missing-bills-analytics-s19">
          <div className="b-o-m-missing-bills-analytics-s20">
            <span className="b-o-m-missing-bills-analytics-s21">
              CA MISSING INVOICES
            </span>
            <span className="b-o-m-missing-bills-analytics-s22">
              23 Items
            </span>
          </div>
          <div className="b-o-m-missing-bills-analytics-s23">
            {fmtINR(s.caTotalMissingBills)}
          </div>
          <div className="b-o-m-missing-bills-analytics-s24">
            <strong>₹1.73L</strong> found only in Wing B + <strong>₹2.36L</strong> recurring estimates without bills (Annexure 4).
          </div>
        </div>

        {/* KPI 2: Wing B Passbook Leakage */}
        <div className="b-o-m-missing-bills-analytics-s25">
          <div className="b-o-m-missing-bills-analytics-s20">
            <span className="b-o-m-missing-bills-analytics-s26">
              WING B OUTFLOW LEAKAGE
            </span>
            <span className="b-o-m-missing-bills-analytics-s27">
              30.59% Share
            </span>
          </div>
          <div className="b-o-m-missing-bills-analytics-s28">
            {fmtINR(s.wingBOutflows)}
          </div>
          <div className="b-o-m-missing-bills-analytics-s24">
            Paid out of common Phase II BOM account for Wing B electricity, security, pools, and gardening!
          </div>
        </div>

        {/* KPI 3: Unvouched Builder Self-Debits */}
        <div className="b-o-m-missing-bills-analytics-s29">
          <div className="b-o-m-missing-bills-analytics-s20">
            <span className="b-o-m-missing-bills-analytics-s30">
              UNVOUCHED SELF-DEBITS
            </span>
            <span className="b-o-m-missing-bills-analytics-s31">
              No Approval
            </span>
          </div>
          <div className="b-o-m-missing-bills-analytics-s32">
            {fmtINR(s.totalQuestionableBuilderDebits)}
          </div>
          <div className="b-o-m-missing-bills-analytics-s24">
            <strong>₹6.20L</strong> Supervision (23-11-21) + <strong>₹1.24L</strong> Cash + <strong>₹1.86L</strong> GST/TDS transfers.
          </div>
        </div>

        {/* KPI 4: BOM Unaccounted Bank Shortfall */}
        <div className="b-o-m-missing-bills-analytics-s33">
          <div className="b-o-m-missing-bills-analytics-s20">
            <span className="b-o-m-missing-bills-analytics-s34">
              UNACCOUNTED BANK SHORTFALL
            </span>
            <span className="b-o-m-missing-bills-analytics-s35">
              Bank Discrepancy
            </span>
          </div>
          <div className="b-o-m-missing-bills-analytics-s36">
            {fmtINR(s.unaccountedBankShortfall)}
          </div>
          <div className="b-o-m-missing-bills-analytics-s24">
            Passbook balance was <strong>₹6.19L</strong>; Developer only admitted <strong>₹1.10L</strong> unspent in final settlement!
          </div>
        </div>

        {/* KPI 5: Total Challengeable Exposure */}
        <div className="b-o-m-missing-bills-analytics-s37">
          <div className="b-o-m-missing-bills-analytics-s20">
            <span className="b-o-m-missing-bills-analytics-s38">
              TOTAL FORENSIC EXPOSURE
            </span>
            <span className="b-o-m-missing-bills-analytics-s39">
              Recovery Scope
            </span>
          </div>
          <div className="b-o-m-missing-bills-analytics-s40">
            {fmtINR(s.totalChallengeableAmount)}
          </div>
          <div className="b-o-m-missing-bills-analytics-s41">
            Includes CA Claim (<strong>₹12.07L</strong>) + BOM Wing B leakage (<strong>₹15.31L</strong>) + shortfall (<strong>₹1.13L</strong>).
          </div>
        </div>
      </div>

      {/* ── 3. VIEW MODE SEGMENTED CONTROL ─────────────────────────────────── */}
      <div className="b-o-m-missing-bills-analytics-s42">
        <div className="b-o-m-missing-bills-analytics-s43">
          {[
            { id: 'recovery', label: '🎯 Expected Recovery & Negotiation Calculator', badge: '₹12L – ₹30L' },
            { id: 'summary', label: '📊 Forensic Breakdown & Charts', badge: 'High-Level' },
            { id: 'vendors', label: '🏢 Vendor-by-Vendor Cross-Match', badge: '12 Payees' },
            { id: 'annexure4', label: '📑 CA Annexure 4 Missing Bills', badge: '23 Items' },
            { id: 'register', label: '🔍 135 BOM Transactions Audit', badge: 'Full Ledger' }
          ].map(tab => {
            const active = activeViewMode === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveViewMode(tab.id)}
                className={`b-o-m-missing-bills-analytics-s44 ${(active ? 'b-o-m-missing-bills-analytics-cond-3-true' : 'b-o-m-missing-bills-analytics-cond-4-false')}`}
              >
                <span>{tab.label}</span>
                <span className={`b-o-m-missing-bills-analytics-s45 ${(active ? 'b-o-m-missing-bills-analytics-cond-5-true' : 'b-o-m-missing-bills-analytics-cond-6-false')}`}>
                  {tab.badge}
                </span>
              </button>
            );
          })}
        </div>

        {/* Live Search if in register mode */}
        {(activeViewMode === 'register' || activeViewMode === 'annexure4') && (
          <div className="b-o-m-missing-bills-analytics-s46">
            <span className="b-o-m-missing-bills-analytics-s47">
              🔍
            </span>
            <input
              type="text"
              placeholder="Search vendor, voucher, remark..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="b-o-m-missing-bills-analytics-s48"
            />
          </div>
        )}
      </div>

      {/* ── 4. VIEW MODE 0: EXPECTED RECOVERY & NEGOTIATION CALCULATOR ────── */}
      {activeViewMode === 'recovery' && (
        <div className="b-o-m-missing-bills-analytics-s49">

          {/* Intro Strategy Banner */}
          <div className="b-o-m-missing-bills-analytics-s50">
            <div>
              <div className="b-o-m-missing-bills-analytics-s51">
                <span className="b-o-m-missing-bills-analytics-s52">🎯</span>
                <span className="b-o-m-missing-bills-analytics-s53">
                  EXECUTIVE NEGOTIATION DOSSIER
                </span>
              </div>
              <h2 className="b-o-m-missing-bills-analytics-s54">
                How Much Can We Expect to Recover from the Builder?
              </h2>
              <p className="b-o-m-missing-bills-analytics-s55">
                Based on CA Hardik Mehta&apos;s certified audit report (UDIN: 26162502TFCJWK8860) and the Bank of Maharashtra Passbook forensic audit, 
                the society has <strong>4 strategically calculated recovery tiers</strong> ranging from 
                <strong> ₹12.07 Lakhs (Hard Minimum)</strong> to <strong>₹19.42 Lakhs (Realistic Target)</strong>, 
                <strong> ₹30.49 Lakhs (Opening Anchor)</strong>, and <strong>₹45.76 Lakhs (MahaRERA Scope)</strong>.
              </p>
            </div>

            <div className="b-o-m-missing-bills-analytics-s56">
              <div className="b-o-m-missing-bills-analytics-s57">
                TARGET SETTLEMENT WINDOW
              </div>
              <div className="b-o-m-missing-bills-analytics-s58">
                ₹18.0L – ₹20.0L
              </div>
              <div className="b-o-m-missing-bills-analytics-s59">
                High probability outcome
              </div>
            </div>
          </div>

          {/* ── 4 RECOVERY TIERS GRID ── */}
          <div className="b-o-m-missing-bills-analytics-s60">
            {/* TIER 1 */}
            <div className="b-o-m-missing-bills-analytics-s61">
              <div>
                <div className="b-o-m-missing-bills-analytics-s62">
                  <span className="b-o-m-missing-bills-analytics-s63">
                    TIER 1 • CERTIFIED MINIMUM
                  </span>
                  <span className="b-o-m-missing-bills-analytics-s64">
                    100% Guaranteed
                  </span>
                </div>
                <div className="b-o-m-missing-bills-analytics-s65">
                  ₹12,07,058
                </div>
                <div className="b-o-m-missing-bills-analytics-s66">
                  Hard Floor / Walk-Away Red Line
                </div>
                <div className="b-o-m-missing-bills-analytics-s67">
                  Includes <strong>₹9,00,790</strong> net principal surplus + <strong>₹3,06,268</strong> statutory interest @ 8% p.a. for 51 months. 
                  Formally signed and certified with CA UDIN. Under NO circumstances settle below this amount!
                </div>
              </div>

              <button
                onClick={() => {
                  setCalcItems({
                    baseCertified: true,
                    schindlerLift: false,
                    otherMissingBills: false,
                    itcRefund: false,
                    bankShortfall: false,
                    supervisionDebit: false,
                    wingBSubsidy: false,
                    cashWithdrawals: false
                  });
                  setInterestMode('ca8');
                }}
                className="b-o-m-missing-bills-analytics-s68"
              >
                Load in Calculator
              </button>
            </div>

            {/* TIER 2 - RECOMMENDED */}
            <div className="b-o-m-missing-bills-analytics-s69">
              <span className="b-o-m-missing-bills-analytics-s70">
                RECOMMENDED TARGET
              </span>

              <div>
                <div className="b-o-m-missing-bills-analytics-s62">
                  <span className="b-o-m-missing-bills-analytics-s71">
                    TIER 2 • REALISTIC SETTLEMENT
                  </span>
                  <span className="b-o-m-missing-bills-analytics-s64">
                    85% High Probability
                  </span>
                </div>
                <div className="b-o-m-missing-bills-analytics-s72">
                  ₹19,41,755
                </div>
                <div className="b-o-m-missing-bills-analytics-s73">
                  Realistic Settlement Range: ₹18L – ₹20L
                </div>
                <div className="b-o-m-missing-bills-analytics-s74">
                  Base ₹12.07L + <strong>₹4,09,211 Missing Invoices disallowed</strong> (Schindler lift, unvouched estimates) + 
                  <strong> ₹1,39,070 GST ITC availed by builder</strong> + 8% interest (₹4,92,684).
                </div>
              </div>

              <button
                onClick={() => {
                  setCalcItems({
                    baseCertified: true,
                    schindlerLift: true,
                    otherMissingBills: true,
                    itcRefund: true,
                    bankShortfall: false,
                    supervisionDebit: false,
                    wingBSubsidy: false,
                    cashWithdrawals: false
                  });
                  setInterestMode('ca8');
                }}
                className="b-o-m-missing-bills-analytics-s75"
              >
                Load Target in Calculator
              </button>
            </div>

            {/* TIER 3 - OPENING ANCHOR */}
            <div className="b-o-m-missing-bills-analytics-s76">
              <div>
                <div className="b-o-m-missing-bills-analytics-s62">
                  <span className="b-o-m-missing-bills-analytics-s77">
                    TIER 3 • FORENSIC PASSBOOK CLAIM
                  </span>
                  <span className="b-o-m-missing-bills-analytics-s78">
                    Opening Anchor
                  </span>
                </div>
                <div className="b-o-m-missing-bills-analytics-s79">
                  ₹30,49,153
                </div>
                <div className="b-o-m-missing-bills-analytics-s80">
                  Opening Demand Range: ₹28L – ₹31L
                </div>
                <div className="b-o-m-missing-bills-analytics-s74">
                  Tier 2 + <strong>₹5,09,271 BOM Passbook cash shortfall</strong> + <strong>₹2,70,000 unapproved supervision debit</strong> + 
                  ₹47,145 cash withdrawals + 8% interest (₹7,73,666). Gives maximum psychological negotiation leverage!
                </div>
              </div>

              <button
                onClick={() => {
                  setCalcItems({
                    baseCertified: true,
                    schindlerLift: true,
                    otherMissingBills: true,
                    itcRefund: true,
                    bankShortfall: true,
                    supervisionDebit: true,
                    wingBSubsidy: false,
                    cashWithdrawals: true
                  });
                  setInterestMode('ca8');
                }}
                className="b-o-m-missing-bills-analytics-s81"
              >
                Load Anchor in Calculator
              </button>
            </div>

            {/* TIER 4 - LEGAL ESCALATION */}
            <div className="b-o-m-missing-bills-analytics-s82">
              <div>
                <div className="b-o-m-missing-bills-analytics-s62">
                  <span className="b-o-m-missing-bills-analytics-s83">
                    TIER 4 • MAHARERA LITIGATION
                  </span>
                  <span className="b-o-m-missing-bills-analytics-s84">
                    Legal Filing
                  </span>
                </div>
                <div className="b-o-m-missing-bills-analytics-s85">
                  ₹45,75,525
                </div>
                <div className="b-o-m-missing-bills-analytics-s86">
                  MahaRERA Maximum Scope: ₹42L – ₹46L
                </div>
                <div className="b-o-m-missing-bills-analytics-s74">
                  Tier 3 + <strong>₹7,27,249 Wing B cross-subsidy recovery</strong> (47.5% share) + 
                  <strong> MahaRERA statutory interest @ 10.75% p.a. (₹13,72,162)</strong> + ₹2,00,000 legal compensation.
                </div>
              </div>

              <button
                onClick={() => {
                  setCalcItems({
                    baseCertified: true,
                    schindlerLift: true,
                    otherMissingBills: true,
                    itcRefund: true,
                    bankShortfall: true,
                    supervisionDebit: true,
                    wingBSubsidy: true,
                    cashWithdrawals: true
                  });
                  setInterestMode('rera');
                }}
                className="b-o-m-missing-bills-analytics-s87"
              >
                Load Legal Scope
              </button>
            </div>
          </div>

          {/* ── INTERACTIVE SETTLEMENT SIMULATOR ── */}
          <div className="b-o-m-missing-bills-analytics-s88">
            <div className="b-o-m-missing-bills-analytics-s89">
              <div>
                <h3 className="b-o-m-missing-bills-analytics-s90">
                  Interactive Custom Settlement Simulator
                </h3>
                <p className="b-o-m-missing-bills-analytics-s91">
                  Toggle specific claims on/off to see the exact expected recovery in real-time. Use this to simulate meeting scenarios.
                </p>
              </div>

              {/* Interest Mode Selector */}
              <div className="b-o-m-missing-bills-analytics-s92">
                <span className="b-o-m-missing-bills-analytics-s93">Interest Rate:</span>
                {[
                  { id: 'none', label: '0% (Principal Only)' },
                  { id: 'ca8', label: '8% p.a. (CA Hardik)' },
                  { id: 'rera', label: '10.75% (MahaRERA)' }
                ].map(im => (
                  <button
                    key={im.id}
                    onClick={() => setInterestMode(im.id)}
                    className={`b-o-m-missing-bills-analytics-s94 ${(interestMode === im.id ? 'b-o-m-missing-bills-analytics-cond-7-true' : 'b-o-m-missing-bills-analytics-cond-8-false')}`}
                  >
                    {im.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="b-o-m-missing-bills-analytics-s95">
              {/* Claims Checklist */}
              <div className="b-o-m-missing-bills-analytics-s96">
                {/* 1. Base */}
                <label className="b-o-m-missing-bills-analytics-s97">
                  <input type="checkbox" checked={true} disabled={true} className="b-o-m-missing-bills-analytics-s98" />
                  <div>
                    <div className="b-o-m-missing-bills-analytics-s99">
                      Certified Net Principal Surplus: ₹9,00,790
                    </div>
                    <div className="b-o-m-missing-bills-analytics-s100">
                      Hard minimum already signed by CA Hardik Mehta (UDIN: 26162502TFCJWK8860).
                    </div>
                  </div>
                </label>

                {/* 2. Schindler */}
                <label className={`b-o-m-missing-bills-analytics-s101 ${(calcItems.schindlerLift ? 'b-o-m-missing-bills-analytics-cond-9-true' : 'b-o-m-missing-bills-analytics-cond-10-false')}`}>
                  <input
                    type="checkbox"
                    checked={calcItems.schindlerLift}
                    onChange={e => setCalcItems(p => ({ ...p, schindlerLift: e.target.checked }))}
                    className="b-o-m-missing-bills-analytics-s98"
                  />
                  <div>
                    <div className="b-o-m-missing-bills-analytics-s99">
                      Disallow Schindler Lift AMC: +₹1,23,736
                    </div>
                    <div className="b-o-m-missing-bills-analytics-s100">
                      Invoice made out solely to Building B; ZERO debit in BOM passbook!
                    </div>
                  </div>
                </label>

                {/* 3. Other Missing Bills */}
                <label className={`b-o-m-missing-bills-analytics-s101 ${(calcItems.otherMissingBills ? 'b-o-m-missing-bills-analytics-cond-11-true' : 'b-o-m-missing-bills-analytics-cond-12-false')}`}>
                  <input
                    type="checkbox"
                    checked={calcItems.otherMissingBills}
                    onChange={e => setCalcItems(p => ({ ...p, otherMissingBills: e.target.checked }))}
                    className="b-o-m-missing-bills-analytics-s98"
                  />
                  <div>
                    <div className="b-o-m-missing-bills-analytics-s99">
                      Disallow Other Annexure 4 Missing Bills: +₹2,85,475
                    </div>
                    <div className="b-o-m-missing-bills-analytics-s100">
                      MSEDCL estimates (₹1.05L), Gurukrupa pools (₹44.8k), Naushad Ali gardening (₹19.6k), water (₹32.5k).
                    </div>
                  </div>
                </label>

                {/* 4. GST ITC */}
                <label className={`b-o-m-missing-bills-analytics-s101 ${(calcItems.itcRefund ? 'b-o-m-missing-bills-analytics-cond-13-true' : 'b-o-m-missing-bills-analytics-cond-14-false')}`}>
                  <input
                    type="checkbox"
                    checked={calcItems.itcRefund}
                    onChange={e => setCalcItems(p => ({ ...p, itcRefund: e.target.checked }))}
                    className="b-o-m-missing-bills-analytics-s98"
                  />
                  <div>
                    <div className="b-o-m-missing-bills-analytics-s99">
                      Refund GST Input Tax Credit (ITC) Availed: +₹1,39,070
                    </div>
                    <div className="b-o-m-missing-bills-analytics-s100">
                      Developer availed ITC credit against maintenance GST on their government tax returns.
                    </div>
                  </div>
                </label>

                {/* 5. BOM Cash Shortfall */}
                <label className={`b-o-m-missing-bills-analytics-s101 ${(calcItems.bankShortfall ? 'b-o-m-missing-bills-analytics-cond-15-true' : 'b-o-m-missing-bills-analytics-cond-16-false')}`}>
                  <input
                    type="checkbox"
                    checked={calcItems.bankShortfall}
                    onChange={e => setCalcItems(p => ({ ...p, bankShortfall: e.target.checked }))}
                    className="b-o-m-missing-bills-analytics-s98"
                  />
                  <div>
                    <div className="b-o-m-missing-bills-analytics-s99">
                      Reclaim BOM Passbook Cash Shortfall: +₹5,09,271
                    </div>
                    <div className="b-o-m-missing-bills-analytics-s100">
                      Actual BOM bank balance was ₹6.19L; developer only admitted ₹1.10L in final handover sheet!
                    </div>
                  </div>
                </label>

                {/* 6. Supervision Debit */}
                <label className={`b-o-m-missing-bills-analytics-s101 ${(calcItems.supervisionDebit ? 'b-o-m-missing-bills-analytics-cond-17-true' : 'b-o-m-missing-bills-analytics-cond-18-false')}`}>
                  <input
                    type="checkbox"
                    checked={calcItems.supervisionDebit}
                    onChange={e => setCalcItems(p => ({ ...p, supervisionDebit: e.target.checked }))}
                    className="b-o-m-missing-bills-analytics-s98"
                  />
                  <div>
                    <div className="b-o-m-missing-bills-analytics-s99">
                      Recover 23-11-2021 Supervision Debit: +₹2,70,000
                    </div>
                    <div className="b-o-m-missing-bills-analytics-s100">
                      Vch 498 debited from BOM without agreement or member consent. CA explicitly ordered recovery.
                    </div>
                  </div>
                </label>

                {/* 7. Wing B Cross-Subsidy */}
                <label className={`b-o-m-missing-bills-analytics-s101 ${(calcItems.wingBSubsidy ? 'b-o-m-missing-bills-analytics-cond-19-true' : 'b-o-m-missing-bills-analytics-cond-20-false')}`}>
                  <input
                    type="checkbox"
                    checked={calcItems.wingBSubsidy}
                    onChange={e => setCalcItems(p => ({ ...p, wingBSubsidy: e.target.checked }))}
                    className="b-o-m-missing-bills-analytics-s98"
                  />
                  <div>
                    <div className="b-o-m-missing-bills-analytics-s99">
                      Reclaim Wing B Common Fund Drain Share (47.5%): +₹7,27,249
                    </div>
                    <div className="b-o-m-missing-bills-analytics-s100">
                      Wing A pro-rata share of ₹15,31,050.50 debited for Wing B expenses out of common BOM account.
                    </div>
                  </div>
                </label>
              </div>

              {/* Dynamic Live Calculated Result Card */}
              <div className="b-o-m-missing-bills-analytics-s102">
                <div>
                  <div className="b-o-m-missing-bills-analytics-s103">
                    DYNAMIC EXPECTED RECOVERY
                  </div>
                  <div className="b-o-m-missing-bills-analytics-s104">
                    {fmtINR(dynamicRecovery.total)}
                  </div>
                  <div className="b-o-m-missing-bills-analytics-s105">
                    ▲ +{fmtINR(dynamicRecovery.gainOverBase)} above statutory baseline
                  </div>

                  <div className="b-o-m-missing-bills-analytics-s106">
                    <div className="b-o-m-missing-bills-analytics-s107">
                      <span>Adjusted Net Principal:</span>
                      <strong className="b-o-m-missing-bills-analytics-s108">{fmtINR(dynamicRecovery.principal)}</strong>
                    </div>
                    <div className="b-o-m-missing-bills-analytics-s107">
                      <span>Accrued Interest:</span>
                      <strong className="b-o-m-missing-bills-analytics-s109">+{fmtINR(dynamicRecovery.interest)}</strong>
                    </div>
                    <div className="b-o-m-missing-bills-analytics-s110">
                      Interest Basis: {dynamicRecovery.intLabel}
                    </div>
                  </div>
                </div>

                <div className="b-o-m-missing-bills-analytics-s111">
                  <div className="b-o-m-missing-bills-analytics-s112">
                    Negotiation Tip for Committee:
                  </div>
                  <div className="b-o-m-missing-bills-analytics-s113">
                    Open the discussion presenting the <strong>₹30.49L claim</strong>. As the meeting progresses, 
                    concede doubtful estimates or interest, but <strong>hold firm at ₹18L – ₹20L</strong>. 
                    Never accept anything below <strong>₹12.07L</strong>.
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── THE NEGOTIATION FUNNEL & MEETING PLAYBOOK ── */}
          <div className="b-o-m-missing-bills-analytics-s114">
            <h3 className="b-o-m-missing-bills-analytics-s115">
              The 3-Phase Meeting Playbook (&quot;The Recovery Funnel&quot;)
            </h3>

            <div className="b-o-m-missing-bills-analytics-s116">
              <div className="b-o-m-missing-bills-analytics-s117">
                <div className="b-o-m-missing-bills-analytics-s51">
                  <span className="b-o-m-missing-bills-analytics-s118">1️⃣</span>
                  <div className="b-o-m-missing-bills-analytics-s119">
                    PHASE 1: OPENING ANCHOR (₹30.49L)
                  </div>
                </div>
                <div className="b-o-m-missing-bills-analytics-s120">
                  Tabling the full forensic audit showing the ₹5.09L BOM cash shortfall and ₹2.70L unapproved supervision debit. 
                  Forces developer to defend their numbers instead of challenging the society.
                </div>
              </div>

              <div className="b-o-m-missing-bills-analytics-s121">
                <div className="b-o-m-missing-bills-analytics-s51">
                  <span className="b-o-m-missing-bills-analytics-s118">2️⃣</span>
                  <div className="b-o-m-missing-bills-analytics-s122">
                    PHASE 2: SETTLEMENT WINDOW (₹18L – ₹20L)
                  </div>
                </div>
                <div className="b-o-m-missing-bills-analytics-s120">
                  Concede minor interest or disputed utility estimates in exchange for immediate settlement cheque. 
                  Insist on 100% refund of Missing Invoices (Schindler ₹1.24L, pools, gardening) and ITC credits.
                </div>
              </div>

              <div className="b-o-m-missing-bills-analytics-s123">
                <div className="b-o-m-missing-bills-analytics-s51">
                  <span className="b-o-m-missing-bills-analytics-s118">3️⃣</span>
                  <div className="b-o-m-missing-bills-analytics-s124">
                    PHASE 3: RED LINE (₹12.07L)
                  </div>
                </div>
                <div className="b-o-m-missing-bills-analytics-s120">
                  The non-negotiable floor certified by CA Hardik Mehta. If developer refuses to meet at least ₹12.07L, 
                  terminate discussion and file formal complaint in MahaRERA seeking ₹45.76 Lakhs.
                </div>
              </div>
            </div>
          </div>

        </div>
      )}

      {/* ── 5. VIEW MODE 1: SUMMARY & VISUAL ANALYTICS ─────────────────────── */}
      {activeViewMode === 'summary' && (
        <div className="b-o-m-missing-bills-analytics-s49">

          {/* Forensic Narrative Cards */}
          <div className="b-o-m-missing-bills-analytics-s125">
            {/* Finding A */}
            <div className="b-o-m-missing-bills-analytics-s126">
              <div className="b-o-m-missing-bills-analytics-s127">
                <span className="b-o-m-missing-bills-analytics-s118">🚨</span>
                <h3 className="b-o-m-missing-bills-analytics-s128">
                  Finding 1: Cross-Subsidizing Wing B from BOM Common Funds (₹15.31 Lakhs)
                </h3>
              </div>
              <p className="b-o-m-missing-bills-analytics-s129">
                The Bank of Maharashtra account was opened on 01-Jul-2021 with ₹56,22,572.90 collected from flat owners. 
                Out of ₹50.05 Lakhs disbursed, <strong>₹15,31,050.50 (30.59%)</strong> was directly debited for 
                <strong> Wing B expenses</strong> (Supervision ₹3.50L, Security ₹2.58L, Electricity ₹1.57L, Housekeeping ₹1.45L, Pools ₹50.7k, Gardening ₹35.9k). 
                Yet Wing B maintenance was supposed to be self-sustaining!
              </p>
            </div>

            {/* Finding B */}
            <div className="b-o-m-missing-bills-analytics-s130">
              <div className="b-o-m-missing-bills-analytics-s127">
                <span className="b-o-m-missing-bills-analytics-s118">⚠️</span>
                <h3 className="b-o-m-missing-bills-analytics-s131">
                  Finding 2: Invoices Claimed for Wing A But Found Only in Wing B (₹1.73 Lakhs)
                </h3>
              </div>
              <p className="b-o-m-missing-bills-analytics-s129">
                In CA Hardik Mehta&apos;s Annexure 4 (Part A), the builder claimed ₹1,73,458 of expenses from Wing A 
                using invoices made out <strong>EXCLUSIVELY to Building B</strong>. For example, Schindler Lift AMC (₹1,23,736) was addressed 
                solely to Building B and has <strong>ZERO debit in the BOM passbook</strong>! Gurukrupa Pools (₹14,049) and Naushad Ali (₹16,709) were debited 
                100% under Wing B in the BOM ledger, yet charged to Wing A!
              </p>
            </div>

            {/* Finding C */}
            <div className="b-o-m-missing-bills-analytics-s132">
              <div className="b-o-m-missing-bills-analytics-s127">
                <span className="b-o-m-missing-bills-analytics-s118">💰</span>
                <h3 className="b-o-m-missing-bills-analytics-s133">
                  Finding 3: Arbitrary Builder Self-Debits on 23-Nov-2021 (₹6.20 Lakhs)
                </h3>
              </div>
              <p className="b-o-m-missing-bills-analytics-s129">
                On 23-11-2021, the builder debited <strong>₹2,70,000 (Vch 498, Wing A)</strong> and <strong>₹3,50,000 (Vch 499, Wing B)</strong> 
                as &quot;Supervision Charges&quot; directly to their internal entity without any contract, approval, or vendor invoices. 
                CA Hardik explicitly ordered full recovery of ₹2,70,000 for Wing A. Furthermore, ₹1.24 Lakhs was withdrawn in cash via bearer cheques.
              </p>
            </div>
          </div>

          {/* Visual Breakdown of BOM Outflows */}
          <div className="b-o-m-missing-bills-analytics-s114">
            <h3 className="b-o-m-missing-bills-analytics-s115">
              Where Did the ₹50.05 Lakhs in BOM Passbook Go?
            </h3>

            {/* Stacked Progress Bar */}
            <div className="b-o-m-missing-bills-analytics-s134">
              <div className="b-o-m-missing-bills-analytics-s135" />
              <div className="b-o-m-missing-bills-analytics-s136" />
              <div className="b-o-m-missing-bills-analytics-s137" />
              <div className="b-o-m-missing-bills-analytics-s138" />
              <div className="b-o-m-missing-bills-analytics-s139" />
              <div className="b-o-m-missing-bills-analytics-s140" />
            </div>

            {/* Legend items */}
            <div className="b-o-m-missing-bills-analytics-s141">
              <div className="b-o-m-missing-bills-analytics-s142">
                <span className="b-o-m-missing-bills-analytics-s143" />
                <span><strong>Society Transfer:</strong> {fmtINR(s.societyHandoverTransfer)} (47.96%)</span>
              </div>
              <div className="b-o-m-missing-bills-analytics-s142">
                <span className="b-o-m-missing-bills-analytics-s144" />
                <span><strong>Wing B Operations:</strong> {fmtINR(s.wingBOutflows)} (30.59%)</span>
              </div>
              <div className="b-o-m-missing-bills-analytics-s142">
                <span className="b-o-m-missing-bills-analytics-s145" />
                <span><strong>Supervision Charges:</strong> {fmtINR(s.totalSupervisionDebited)} (12.39%)</span>
              </div>
              <div className="b-o-m-missing-bills-analytics-s142">
                <span className="b-o-m-missing-bills-analytics-s146" />
                <span><strong>Developer GST/TDS:</strong> {fmtINR(s.developerTaxAccountDebits)} (3.72%)</span>
              </div>
              <div className="b-o-m-missing-bills-analytics-s142">
                <span className="b-o-m-missing-bills-analytics-s147" />
                <span><strong>Cash Withdrawals:</strong> {fmtINR(s.unvouchedCashWithdrawals)} (2.47%)</span>
              </div>
              <div className="b-o-m-missing-bills-analytics-s142">
                <span className="b-o-m-missing-bills-analytics-s148" />
                <span><strong>Wing A Operations:</strong> {fmtINR(s.wingAOutflows - s.societyHandoverTransfer - s.unvouchedSupervisionWingA)} (2.87%)</span>
              </div>
            </div>
          </div>

          {/* Monthly Drain Timeline */}
          <div className="b-o-m-missing-bills-analytics-s114">
            <div className="b-o-m-missing-bills-analytics-s149">
              <div>
                <h3 className="b-o-m-missing-bills-analytics-s150">
                  Monthly BOM Outflow Timeline (July 2021 to March 2023)
                </h3>
                <p className="b-o-m-missing-bills-analytics-s151">
                  Shows monthly disbursements from the bank account. Notice the massive spike in November 2021 (₹36.95L) when builder transferred ₹24L to society and debited ₹6.20L in supervision!
                </p>
              </div>
            </div>

            <div className="b-o-m-missing-bills-analytics-s152">
              <table className="b-o-m-missing-bills-analytics-s153">
                <thead>
                  <tr className="b-o-m-missing-bills-analytics-s154">
                    <th className="b-o-m-missing-bills-analytics-s155">Month</th>
                    <th className="b-o-m-missing-bills-analytics-s156">Wing A (Ops)</th>
                    <th className="b-o-m-missing-bills-analytics-s156">Wing B (Drain)</th>
                    <th className="b-o-m-missing-bills-analytics-s156">Supervision</th>
                    <th className="b-o-m-missing-bills-analytics-s156">Cash</th>
                    <th className="b-o-m-missing-bills-analytics-s156">Society A/c</th>
                    <th className="b-o-m-missing-bills-analytics-s156">Monthly Total</th>
                    <th className="b-o-m-missing-bills-analytics-s157">Txs</th>
                  </tr>
                </thead>
                <tbody>
                  {BOM_MONTHLY_DRAIN_TIMELINE.map(m => (
                    <tr key={m.monthKey} className="b-o-m-missing-bills-analytics-s158">
                      <td className="b-o-m-missing-bills-analytics-s159">{m.monthName}</td>
                      <td className="b-o-m-missing-bills-analytics-s160">{m.wingA > 0 ? fmtINR(m.wingA) : '—'}</td>
                      <td className={`b-o-m-missing-bills-analytics-s161 ${(m.wingB > 50000 ? 'b-o-m-missing-bills-analytics-cond-21-true' : 'b-o-m-missing-bills-analytics-cond-22-false')}`}>
                        {m.wingB > 0 ? fmtINR(m.wingB) : '—'}
                      </td>
                      <td className={`b-o-m-missing-bills-analytics-s162 ${(m.supervision > 0 ? 'b-o-m-missing-bills-analytics-cond-23-true' : 'b-o-m-missing-bills-analytics-cond-24-false')}`}>
                        {m.supervision > 0 ? fmtINR(m.supervision) : '—'}
                      </td>
                      <td className="b-o-m-missing-bills-analytics-s163">
                        {m.cash > 0 ? fmtINR(m.cash) : '—'}
                      </td>
                      <td className={`b-o-m-missing-bills-analytics-s164 ${(m.societyTransfer > 0 ? 'b-o-m-missing-bills-analytics-cond-25-true' : 'b-o-m-missing-bills-analytics-cond-26-false')}`}>
                        {m.societyTransfer > 0 ? fmtINR(m.societyTransfer) : '—'}
                      </td>
                      <td className="b-o-m-missing-bills-analytics-s165">
                        {fmtINR(m.total)}
                      </td>
                      <td className="b-o-m-missing-bills-analytics-s166">
                        {m.txCount}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── 5. VIEW MODE 2: VENDOR-BY-VENDOR CROSS-CHECK MATRIX ────────────── */}
      {activeViewMode === 'vendors' && (
        <div className="b-o-m-missing-bills-analytics-s167">
          <div className="b-o-m-missing-bills-analytics-s168">
            <div className="b-o-m-missing-bills-analytics-s169">
              <h3 className="b-o-m-missing-bills-analytics-s170">
                Forensic Cross-Check Matrix (12 Key Payees)
              </h3>
              <p className="b-o-m-missing-bills-analytics-s91">
                Direct comparison between amounts paid in the BOM Passbook Ledger vs amounts challenged in CA Hardik Mehta&apos;s Annexure 4 Missing Invoices register.
              </p>
            </div>

            <div className="b-o-m-missing-bills-analytics-s171">
              {VENDOR_FORENSIC_MATRIX.map((vm, idx) => {
                const isSelected = selectedVendor === vm.vendor;
                return (
                  <div
                    key={idx}
                    onClick={() => setSelectedVendor(isSelected ? null : vm.vendor)}
                    className={`b-o-m-missing-bills-analytics-s172 ${(isSelected ? 'b-o-m-missing-bills-analytics-cond-27-true' : 'b-o-m-missing-bills-analytics-cond-28-false')}`}
                  >
                    <div className="b-o-m-missing-bills-analytics-s173">
                      <div>
                        <div className="b-o-m-missing-bills-analytics-s174">
                          <span className="b-o-m-missing-bills-analytics-s175">
                            {vm.vendor}
                          </span>
                          <span className="b-o-m-missing-bills-analytics-s176">
                            {vm.category}
                          </span>
                          <span className={`b-o-m-missing-bills-analytics-s177 ${(vm.caMissingCategory.includes('Part A') ? 'b-o-m-missing-bills-analytics-cond-29-true' : 'b-o-m-missing-bills-analytics-cond-30-false')}`}>
                            {vm.caMissingCategory}
                          </span>
                        </div>

                        <div className="b-o-m-missing-bills-analytics-s178">
                          <span>BOM Ledger Paid: <strong className="b-o-m-missing-bills-analytics-s179">{fmtINR(vm.bomTotalPaid)}</strong> ({vm.bomVoucherCount} vouchers)</span>
                          <span>Wing A: <strong className="b-o-m-missing-bills-analytics-s180">{fmtINR(vm.bomWingAPaid)}</strong></span>
                          <span>Wing B: <strong className="b-o-m-missing-bills-analytics-s181">{fmtINR(vm.bomWingBPaid)}</strong></span>
                          <span>CA Missing Claim: <strong className="b-o-m-missing-bills-analytics-s182">{fmtINR(vm.caMissingAmt)}</strong></span>
                        </div>
                      </div>

                      <div className="b-o-m-missing-bills-analytics-s183">
                        <span className="b-o-m-missing-bills-analytics-s184">
                          {isSelected ? '▲ Hide Analysis' : '▼ Read Audit Finding'}
                        </span>
                      </div>
                    </div>

                    {isSelected && (
                      <div className="b-o-m-missing-bills-analytics-s185">
                        <div className="b-o-m-missing-bills-analytics-s186">
                          <div className="b-o-m-missing-bills-analytics-s187">
                            🔍 Forensic Audit Finding:
                          </div>
                          <div className="b-o-m-missing-bills-analytics-s188">
                            {vm.auditFinding}
                          </div>
                        </div>

                        <div className="b-o-m-missing-bills-analytics-s189">
                          <span className="b-o-m-missing-bills-analytics-s190">⚖️</span>
                          <div className="b-o-m-missing-bills-analytics-s191">
                            <strong>Society Action / Recommendation:</strong> {vm.recommendation}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── 6. VIEW MODE 3: CA ANNEXURE 4 MISSING BILLS (23 ITEMS) ─────────── */}
      {activeViewMode === 'annexure4' && (
        <div className="b-o-m-missing-bills-analytics-s167">
          <div className="b-o-m-missing-bills-analytics-s168">
            <div className="b-o-m-missing-bills-analytics-s192">
              <div>
                <h3 className="b-o-m-missing-bills-analytics-s193">
                  Annexure 4: 23 Challenged Missing Invoices (₹4,09,211)
                </h3>
                <p className="b-o-m-missing-bills-analytics-s91">
                  Cross-matched directly against Bank of Maharashtra Passbook disbursements.
                </p>
              </div>

              <div className="b-o-m-missing-bills-analytics-s194">
                <span className="b-o-m-missing-bills-analytics-s195">
                  Part A (Wing B Only): ₹1,73,458 (6 items)
                </span>
                <span className="b-o-m-missing-bills-analytics-s196">
                  Part B (Recurring Estimated): ₹2,35,753 (17 items)
                </span>
              </div>
            </div>

            <div className="b-o-m-missing-bills-analytics-s152">
              <table className="b-o-m-missing-bills-analytics-s153">
                <thead>
                  <tr className="b-o-m-missing-bills-analytics-s154">
                    <th className="b-o-m-missing-bills-analytics-s155">ID & Type</th>
                    <th className="b-o-m-missing-bills-analytics-s155">Vendor & Nature</th>
                    <th className="b-o-m-missing-bills-analytics-s156">Doc Amount</th>
                    <th className="b-o-m-missing-bills-analytics-s156">Claimed from Wing A</th>
                    <th className="b-o-m-missing-bills-analytics-s155">BOM Passbook Match Status</th>
                    <th className="b-o-m-missing-bills-analytics-s155">Audit Cross-Match Finding</th>
                  </tr>
                </thead>
                <tbody>
                  {MISSING_BILLS_RECONCILIATION_LIST.filter(item => {
                    if (!searchQuery.trim()) return true;
                    const q = searchQuery.toLowerCase();
                    return [item.vendor, item.nature, item.type, item.bomMatchStatus, item.forensicNote].join(' ').toLowerCase().includes(q);
                  }).map(item => (
                    <tr key={item.id} className={`b-o-m-missing-bills-analytics-s158 ${(item.type.includes('Part A') ? 'b-o-m-missing-bills-analytics-cond-31-true' : 'b-o-m-missing-bills-analytics-cond-32-false')}`}>
                      <td className="b-o-m-missing-bills-analytics-s197">
                        <div className="b-o-m-missing-bills-analytics-s198">{item.id}</div>
                        <span className={`b-o-m-missing-bills-analytics-s199 ${(item.type.includes('Part A') ? 'b-o-m-missing-bills-analytics-cond-33-true' : 'b-o-m-missing-bills-analytics-cond-34-false')}`}>
                          {item.type.includes('Part A') ? 'Part A: Wing B Only' : 'Part B: Estimate'}
                        </span>
                      </td>

                      <td className="b-o-m-missing-bills-analytics-s155">
                        <div className="b-o-m-missing-bills-analytics-s198">{item.vendor}</div>
                        <div className="b-o-m-missing-bills-analytics-s200">{item.nature}</div>
                      </td>

                      <td className="b-o-m-missing-bills-analytics-s201">
                        {item.docAmt > 0 ? fmtINR(item.docAmt) : '—'}
                      </td>

                      <td className="b-o-m-missing-bills-analytics-s202">
                        {fmtINR(item.allocatedAmt)}
                      </td>

                      <td className="b-o-m-missing-bills-analytics-s155">
                        <span className={`b-o-m-missing-bills-analytics-s203 ${(item.bomMatchStatus.includes('MATCHED') ? 'b-o-m-missing-bills-analytics-cond-35-true' : 'b-o-m-missing-bills-analytics-cond-36-false')}`}>
                          {item.bomMatchStatus}
                        </span>
                        <div className="b-o-m-missing-bills-analytics-s204">
                          {item.bomDetails}
                        </div>
                      </td>

                      <td className="b-o-m-missing-bills-analytics-s205">
                        {item.forensicNote}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── 7. VIEW MODE 4: FULL 135 BOM TRANSACTIONS AUDIT REGISTER ────────── */}
      {activeViewMode === 'register' && (
        <div className="b-o-m-missing-bills-analytics-s167">
          {/* Filter Pills */}
          <div className="b-o-m-missing-bills-analytics-s206">
            <span className="b-o-m-missing-bills-analytics-s207">Filter Category:</span>
            {[
              { id: 'all', label: 'All 135 Txs' },
              { id: 'missing', label: '🔴 Missing Invoices Matches' },
              { id: 'wingB', label: '🟠 Wing B Common Fund Drain' },
              { id: 'unvouched', label: '🟣 Builder Unvouched Debits' },
              { id: 'society', label: '🟢 Society Transfer (₹24L)' }
            ].map(f => {
              const active = activeFilter === f.id;
              return (
                <button
                  key={f.id}
                  onClick={() => setActiveFilter(f.id)}
                  className={`b-o-m-missing-bills-analytics-s208 ${(active ? 'b-o-m-missing-bills-analytics-cond-37-true' : 'b-o-m-missing-bills-analytics-cond-38-false')}`}
                >
                  {f.label}
                </button>
              );
            })}
          </div>

          <div className="b-o-m-missing-bills-analytics-s168">
            <div className="b-o-m-missing-bills-analytics-s209">
              <span className="b-o-m-missing-bills-analytics-s210">
                Showing <strong>{filteredTransactions.length}</strong> of 135 BOM Transactions
              </span>
              <button
                onClick={handleExportCSV}
                className="b-o-m-missing-bills-analytics-s211"
              >
                Export Current View to CSV
              </button>
            </div>

            <div className="b-o-m-missing-bills-analytics-s152">
              <table className="b-o-m-missing-bills-analytics-s153">
                <thead>
                  <tr className="b-o-m-missing-bills-analytics-s154">
                    <th className="b-o-m-missing-bills-analytics-s155">Date</th>
                    <th className="b-o-m-missing-bills-analytics-s155">Vch No</th>
                    <th className="b-o-m-missing-bills-analytics-s155">Payee / Particulars</th>
                    <th className="b-o-m-missing-bills-analytics-s155">Wing</th>
                    <th className="b-o-m-missing-bills-analytics-s156">Debit (Inflow)</th>
                    <th className="b-o-m-missing-bills-analytics-s156">Credit (Outflow)</th>
                    <th className="b-o-m-missing-bills-analytics-s155">Forensic Status Tag</th>
                    <th className="b-o-m-missing-bills-analytics-s155">Audit Finding / Note</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTransactions.map(tx => (
                    <tr key={tx.id} className={`b-o-m-missing-bills-analytics-s158 ${(tx.forensicCat.includes('missing') || tx.forensicCat === 'supervision_unvouched' ? 'b-o-m-missing-bills-analytics-cond-39-true' : 'b-o-m-missing-bills-analytics-cond-40-false')}`}>
                      <td className="b-o-m-missing-bills-analytics-s212">
                        {tx.date}
                      </td>

                      <td className="b-o-m-missing-bills-analytics-s213">
                        {tx.vchNo || '—'}
                      </td>

                      <td className="b-o-m-missing-bills-analytics-s155">
                        <div className="b-o-m-missing-bills-analytics-s198">{tx.particulars}</div>
                        {tx.remark && (
                          <div className="b-o-m-missing-bills-analytics-s214">Rem: {tx.remark}</div>
                        )}
                      </td>

                      <td className="b-o-m-missing-bills-analytics-s155">
                        <span className="b-o-m-missing-bills-analytics-s215" style={{ background: tx.wing === 'A' ? '#e0f2fe' : tx.wing === 'B' ? '#ffedd5' : '#f1f5f9', color: tx.wing === 'A' ? '#0369a1' : tx.wing === 'B' ? '#9a3412' : '#475569' }}>
                          Wing {tx.wing}
                        </span>
                      </td>

                      <td className={`b-o-m-missing-bills-analytics-s216 ${(tx.debit > 0 ? 'b-o-m-missing-bills-analytics-cond-41-true' : 'b-o-m-missing-bills-analytics-cond-42-false')}`}>
                        {tx.debit > 0 ? fmtINR(tx.debit) : '—'}
                      </td>

                      <td className={`b-o-m-missing-bills-analytics-s156 ${(tx.credit >= 100000 ? 'b-o-m-missing-bills-analytics-cond-43-true' : 'b-o-m-missing-bills-analytics-cond-44-false')}`}>
                        {tx.credit > 0 ? fmtINR(tx.credit) : '—'}
                      </td>

                      <td className="b-o-m-missing-bills-analytics-s155">
                        <span className="b-o-m-missing-bills-analytics-s217" style={{ background: tx.forensicBg, color: tx.forensicColor }}>
                          {tx.forensicTag}
                        </span>
                      </td>

                      <td className="b-o-m-missing-bills-analytics-s218">
                        {tx.forensicNote}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── 8. SOCIETY ACTION CHECKLIST FOR BUILDER NEGOTIATIONS ──────────── */}
      <div className="b-o-m-missing-bills-analytics-s219">
        <div className="b-o-m-missing-bills-analytics-s220">
          <span className="b-o-m-missing-bills-analytics-s221">📋</span>
          <div>
            <h3 className="b-o-m-missing-bills-analytics-s222">
              Forensic Audit Strategy: 5 Specific Demands for Builder Discussion
            </h3>
            <p className="b-o-m-missing-bills-analytics-s223">
              Actionable checklist for the Majestique Euriska Managing Committee based on this cross-audit.
            </p>
          </div>
        </div>

        <div className="b-o-m-missing-bills-analytics-s116">
          <div className="b-o-m-missing-bills-analytics-s224">
            <div className="b-o-m-missing-bills-analytics-s225">
              1. Disallow Schindler Lift Claim (₹1,23,736)
            </div>
            <div className="b-o-m-missing-bills-analytics-s120">
              The lift AMC invoice was issued solely in Building B name and has zero payment in the common BOM passbook. Wing A cannot be burdened with Wing B lift contracts.
            </div>
          </div>

          <div className="b-o-m-missing-bills-analytics-s224">
            <div className="b-o-m-missing-bills-analytics-s225">
              2. Recover Supervision Self-Debits (₹2,70,000)
            </div>
            <div className="b-o-m-missing-bills-analytics-s120">
              Builder debited ₹2,70,000 on 23-11-2021 (Vch 498) without agreement or AGM approval. Demand immediate refund into society bank account as ordered by CA Hardik Mehta.
            </div>
          </div>

          <div className="b-o-m-missing-bills-analytics-s224">
            <div className="b-o-m-missing-bills-analytics-s225">
              3. Challenge Pool & Garden Allocations (₹64,413)
            </div>
            <div className="b-o-m-missing-bills-analytics-s120">
              Gurukrupa Pools (₹50.7k) and Naushad Ali (₹35.9k) were debited 100% under Wing B in the BOM ledger, yet builder claimed ₹44.8k and ₹19.6k from Wing A without Wing A bills!
            </div>
          </div>

          <div className="b-o-m-missing-bills-analytics-s224">
            <div className="b-o-m-missing-bills-analytics-s225">
              4. Reconcile Wing B Outflow Leakage (₹15,31,050.50)
            </div>
            <div className="b-o-m-missing-bills-analytics-s120">
              Out of ₹50.05 Lakhs in the Phase II bank account, 30.59% was used for Wing B expenses. Require developer to demonstrate Wing B member collections deposited into this account.
            </div>
          </div>

          <div className="b-o-m-missing-bills-analytics-s224">
            <div className="b-o-m-missing-bills-analytics-s225">
              5. Settle True Bank Shortfall (₹5,09,271.17)
            </div>
            <div className="b-o-m-missing-bills-analytics-s120">
              The actual unspent cash balance remaining in BOM A/c 60305942224 was ₹6,19,470.40, whereas the builder claimed only ₹1,10,199.23 was left. Settle the ₹5.09L discrepancy.
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
