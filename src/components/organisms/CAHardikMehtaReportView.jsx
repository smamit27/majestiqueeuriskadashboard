import { useState, useMemo } from 'react';
import { CA_HARDIK_MEHTA_REPORT } from '../../data/caHardikMehtaReport.js';
import { fmtINR } from '../../data/builderRecoData.js';
import './CAHardikMehtaReportView.css';


export default function CAHardikMehtaReportView({ _isAdmin = false, onOpenBOMAnalytics }) {
  const { meta, keyDates, allocationRatios, statementOfDues, yearWiseExpenses, yearWiseGrandTotal, commonExpenses, vendors, discussionsAndClarity, lineByLineExpenses, missingInvoices } = CA_HARDIK_MEHTA_REPORT;

  const [activeSection, setActiveSection] = useState('summary'); // 'summary' | 'commonExp' | 'vendors' | 'clarifications' | 'lineItems' | 'missingInvoices'

  // Line items (Annexure 3) filters
  const [lineSearch, setLineSearch] = useState('');
  const [lineBasis, setLineBasis] = useState('All');
  const [lineYear, setLineYear] = useState('All');
  const [lineVendor, setLineVendor] = useState('All');

  // Missing invoices (Annexure 4) filters
  const [missingSearch, setMissingSearch] = useState('');
  const [missingCategory, setMissingCategory] = useState('All'); // 'All' | 'bldgB' | 'recurring'

  // Negotiation Scenario Calculator toggles (Annexure 2)
  const [scenarioDisallowMissing, setScenarioDisallowMissing] = useState(false);
  const [scenarioClaimGST, setScenarioClaimGST] = useState(false);
  const [scenarioConcedeSupervision, setScenarioConcedeSupervision] = useState(false);
  const [scenarioConcedeInterest, setScenarioConcedeInterest] = useState(false);
  const [scenarioConcedeUncollectedMaint, setScenarioConcedeUncollectedMaint] = useState(false);
  const [scenarioConcedeShopGST, setScenarioConcedeShopGST] = useState(false);

  // Dynamic calculated recovery based on scenario
  const scenarioCalculatedTotal = useMemo(() => {
    let total = meta.keyFigures.amountReceivable; // 12,07,058
    if (scenarioDisallowMissing) total += 409211;
    if (scenarioClaimGST) total += 139070;
    if (scenarioConcedeSupervision) total -= 270000;
    if (scenarioConcedeInterest) total -= 306268;
    if (scenarioConcedeUncollectedMaint) total -= 219628;
    if (scenarioConcedeShopGST) total -= 43106;
    return total;
  }, [meta.keyFigures.amountReceivable, scenarioDisallowMissing, scenarioClaimGST, scenarioConcedeSupervision, scenarioConcedeInterest, scenarioConcedeUncollectedMaint, scenarioConcedeShopGST]);

  // Unique vendors for line items filter
  const uniqueVendors = useMemo(() => {
    const set = new Set(lineByLineExpenses.map(item => item.vendor));
    return ['All', ...Array.from(set).sort()];
  }, [lineByLineExpenses]);

  // Filtered Line Items (Annexure 3)
  const filteredLineItems = useMemo(() => {
    return lineByLineExpenses.filter(item => {
      if (lineBasis !== 'All' && item.basis !== lineBasis) return false;
      if (lineYear !== 'All' && item.year !== Number(lineYear)) return false;
      if (lineVendor !== 'All' && item.vendor !== lineVendor) return false;
      if (lineSearch.trim()) {
        const q = lineSearch.toLowerCase();
        const str = `${item.id} ${item.vendor} ${item.nature} ${item.invoiceNo} ${item.month} ${item.basis} ${item.pmtVoucherDate}`.toLowerCase();
        if (!str.includes(q)) return false;
      }
      return true;
    });
  }, [lineByLineExpenses, lineBasis, lineYear, lineVendor, lineSearch]);

  const filteredLineItemsTotal = useMemo(() => {
    return filteredLineItems.reduce((acc, item) => acc + (item.relevantAmt || 0), 0);
  }, [filteredLineItems]);

  // Filtered Missing Invoices (Annexure 4)
  const filteredMissingBldgB = useMemo(() => {
    if (missingCategory === 'recurring') return [];
    return missingInvoices.bldgBFound.filter(item => {
      if (!missingSearch.trim()) return true;
      const q = missingSearch.toLowerCase();
      return `${item.vendor} ${item.nature} ${item.year} ${item.month}`.toLowerCase().includes(q);
    });
  }, [missingInvoices.bldgBFound, missingCategory, missingSearch]);

  const filteredMissingRecurring = useMemo(() => {
    if (missingCategory === 'bldgB') return [];
    return missingInvoices.recurringEstimated.filter(item => {
      if (!missingSearch.trim()) return true;
      const q = missingSearch.toLowerCase();
      return `${item.vendor} ${item.nature} ${item.year} ${item.month}`.toLowerCase().includes(q);
    });
  }, [missingInvoices.recurringEstimated, missingCategory, missingSearch]);

  const filteredMissingTotal = useMemo(() => {
    const sumB = filteredMissingBldgB.reduce((acc, i) => acc + (i.allocatedAmt || 0), 0);
    const sumR = filteredMissingRecurring.reduce((acc, i) => acc + (i.estimatedAmt || 0), 0);
    return sumB + sumR;
  }, [filteredMissingBldgB, filteredMissingRecurring]);

  // CSV Export for Full Summary
  const handleExportSummaryCSV = () => {
    const lines = [];
    lines.push(`"${meta.reportTitle}"`);
    lines.push(`"Auditor: ${meta.auditor.name}, ${meta.auditor.designation} (M.No: ${meta.auditor.membershipNo}, UDIN: ${meta.auditor.udin})"`);
    lines.push(`"Report Date: ${meta.reportDate} | Period: ${meta.period}"`);
    lines.push(`"Client: ${meta.addressee}"`);
    lines.push('');
    lines.push('"ANNEXURE 1: STATEMENT OF AMOUNT RECEIVABLE FROM BUILDER"');
    lines.push('"Particulars","Amount (Rs.)","Notes"');
    statementOfDues.forEach(s => {
      lines.push(`"${s.particulars}",${s.amount},"${s.notes}"`);
    });
    lines.push('');
    lines.push('"KEY FIGURES SUMMARY"');
    lines.push(`"Total Maintenance Amount",${meta.keyFigures.totalMaintenance}`);
    lines.push(`"Residential Maintenance",${meta.keyFigures.residentialMaintenance}`);
    lines.push(`"Commercial Maintenance",${meta.keyFigures.commercialMaintenance}`);
    lines.push(`"Invoiced Expenses",${meta.keyFigures.invoicedExpenses}`);
    lines.push(`"Estimated Missing Expenses",${meta.keyFigures.estimatedMissingExpenses}`);
    lines.push(`"Total Builder Expenses",${meta.keyFigures.totalExpensesByBuilder}`);
    lines.push(`"Amount Already Received",${meta.keyFigures.amountAlreadyReceived}`);
    lines.push(`"Net Principal Amount",${meta.keyFigures.netPrincipal}`);
    lines.push(`"Interest @ 8% (Oct 21 - Dec 25)",${meta.keyFigures.interestAmount}`);
    lines.push(`"Final Amount Receivable",${meta.keyFigures.amountReceivable}`);

    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `CA_Hardik_Mehta_Recoverable_Report_Summary_2026.csv`;
    a.click();
  };

  // CSV Export for Annexure 3 (Line items)
  const handleExportInvoicesCSV = () => {
    const headers = ['Sr No', 'Basis', 'Vendor Name', 'Nature of Transaction', 'Invoice No', 'Invoice Date', 'Pmt Voucher Date', 'Document Amount', 'Relevant Amount (Bldg A)', 'Year', 'Month'];
    const rows = filteredLineItems.map(i => [
      i.id,
      i.basis,
      i.vendor,
      i.nature,
      i.invoiceNo || '-',
      i.invoiceDate || '-',
      i.pmtVoucherDate || '-',
      i.docAmt !== null ? i.docAmt : '-',
      i.relevantAmt,
      i.year,
      i.month
    ].map(v => `"${(v + '').replace(/"/g, '""')}"`).join(','));

    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `CA_Hardik_Mehta_Annexure_3_Invoice_Register.csv`;
    a.click();
  };

  // CSV Export for Annexure 4 (Missing items)
  const handleExportMissingCSV = () => {
    const headers = ['Category', 'Vendor Name', 'Nature of Transaction', 'Invoice Date', 'Pmt Voucher Date', 'Doc Amount', 'Allocated Amount', 'Estimated Amount', 'Year', 'Month'];
    const rowsB = missingInvoices.bldgBFound.map(i => [
      'Found in Bldg B records only',
      i.vendor,
      i.nature,
      i.invoiceDate,
      i.pmtVoucherDate,
      i.docAmt || '-',
      i.allocatedAmt,
      '-',
      i.year,
      i.month
    ].map(v => `"${(v + '').replace(/"/g, '""')}"`).join(','));

    const rowsR = missingInvoices.recurringEstimated.map(i => [
      'Assumed recurring without invoice',
      i.vendor,
      i.nature,
      '-',
      '-',
      '-',
      '-',
      i.estimatedAmt,
      i.year,
      i.month
    ].map(v => `"${(v + '').replace(/"/g, '""')}"`).join(','));

    const csv = [headers.join(','), ...rowsB, ...rowsR].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `CA_Hardik_Mehta_Annexure_4_Missing_Invoices.csv`;
    a.click();
  };

  return (
    <div className="c-a-hardik-mehta-report-view-s1">

      {/* ── 1. Master CA Certification Hero Banner ─────────────────────────── */}
      <div className="c-a-hardik-mehta-report-view-s2">
        {/* Subtle decorative watermark */}
        <div className="c-a-hardik-mehta-report-view-s3">
          ⚖️
        </div>

        <div className="c-a-hardik-mehta-report-view-s4">
          <div className="c-a-hardik-mehta-report-view-s5">
            <div className="c-a-hardik-mehta-report-view-s6">
              <span className="c-a-hardik-mehta-report-view-s7">
                {meta.status} • DATED {meta.reportDate.toUpperCase()}
              </span>
              <span className="c-a-hardik-mehta-report-view-s8">
                AUDIT CLAIM: ₹12,07,058
              </span>
              <span className="c-a-hardik-mehta-report-view-s9">
                UDIN: {meta.auditor.udin}
              </span>
            </div>

            <h2 className="c-a-hardik-mehta-report-view-s10">
              {meta.reportTitle}
            </h2>

            <p className="c-a-hardik-mehta-report-view-s11">
              Independent Chartered Accountant examination of maintenance fund utilization and expenditure incurred by developer for Majestique Euriska Building A for period <strong>{meta.period}</strong>.
            </p>

            <div className="c-a-hardik-mehta-report-view-s12">
              <span>👨‍💼 <strong>{meta.auditor.name}</strong> ({meta.auditor.designation}, M.No: {meta.auditor.membershipNo})</span>
              <span>📍 {meta.auditor.officeAddress}</span>
              <span>📞 {meta.auditor.mobile}</span>
              <span>✉️ {meta.auditor.email}</span>
            </div>
          </div>

          <div className="c-a-hardik-mehta-report-view-s13">
            <button
              onClick={handleExportSummaryCSV}
              className="c-a-hardik-mehta-report-view-s14"
            >
              <span>📥</span>
              <span>Export Summary (CSV)</span>
            </button>

            <button
              onClick={handleExportInvoicesCSV}
              className="c-a-hardik-mehta-report-view-s15"
            >
              <span>📑</span>
              <span>Export 176 Invoices (CSV)</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── 2. Four Master Financial Metric Cards ───────────────────────────── */}
      <div className="c-a-hardik-mehta-report-view-s16">
        {/* Card 1: Total Recoverable Claim */}
        <div className="c-a-hardik-mehta-report-view-s17">
          <div className="c-a-hardik-mehta-report-view-s18">
            FINAL AMOUNT RECEIVABLE FROM BUILDER
          </div>
          <div className="c-a-hardik-mehta-report-view-s19">
            {fmtINR(meta.keyFigures.amountReceivable)}
          </div>
          <div className="c-a-hardik-mehta-report-view-s20">
            Includes <strong>₹9,00,790</strong> principal + <strong>₹3,06,268</strong> interest (8% p.a.).
          </div>
          <div className="c-a-hardik-mehta-report-view-s21">
            Subject to Annexure II points
          </div>
        </div>

        {/* Card 2: Total Maintenance Billed */}
        <div className="c-a-hardik-mehta-report-view-s22">
          <div className="c-a-hardik-mehta-report-view-s23">
            I) TOTAL MAINTENANCE AMOUNT
          </div>
          <div className="c-a-hardik-mehta-report-view-s24">
            {fmtINR(meta.keyFigures.totalMaintenance)}
          </div>
          <div className="c-a-hardik-mehta-report-view-s25">
            Residential: <strong>{fmtINR(meta.keyFigures.residentialMaintenance)}</strong><br />
            Commercial: <strong>{fmtINR(meta.keyFigures.commercialMaintenance)}</strong>
          </div>
        </div>

        {/* Card 3: Total Expenses Incurred by Builder */}
        <div className="c-a-hardik-mehta-report-view-s26">
          <div className="c-a-hardik-mehta-report-view-s27">
            II) TOTAL BUILDER EXPENDITURE
          </div>
          <div className="c-a-hardik-mehta-report-view-s28">
            {fmtINR(meta.keyFigures.totalExpensesByBuilder)}
          </div>
          <div className="c-a-hardik-mehta-report-view-s29">
            Invoiced (176 items): <strong>{fmtINR(meta.keyFigures.invoicedExpenses)}</strong><br />
            Missing/Estimated: <strong>{fmtINR(meta.keyFigures.estimatedMissingExpenses)}</strong>
          </div>
        </div>

        {/* Card 4: Already Received & Net Principal */}
        <div className="c-a-hardik-mehta-report-view-s30">
          <div className="c-a-hardik-mehta-report-view-s31">
            III) RECEIVED &amp; NET PRINCIPAL
          </div>
          <div className="c-a-hardik-mehta-report-view-s32">
            {fmtINR(meta.keyFigures.netPrincipal)}
          </div>
          <div className="c-a-hardik-mehta-report-view-s33">
            Received: <strong>{fmtINR(meta.keyFigures.amountAlreadyReceived)}</strong><br />
            Net Principal Dues (I − II − III)
          </div>
        </div>
      </div>

      {/* ── 3. Sub-Navigation Bar ───────────────────────────────────────────── */}
      <div className="c-a-hardik-mehta-report-view-s34">
        {[
          { id: 'summary', icon: '📊', label: 'Dues Summary', badge: 'Annexure 1' },
          { id: 'commonExp', icon: '🤝', label: 'Common Expenses', badge: '₹2.15L Pool' },
          { id: 'vendors', icon: '🏢', label: 'Vendor Summary', badge: '20 Vendors' },
          { id: 'clarifications', icon: '⚖️', label: 'Negotiation Clarity', badge: 'Annexure 2' },
          { id: 'lineItems', icon: '🧾', label: '176 Invoices Register', badge: '₹26.41L' },
          { id: 'missingInvoices', icon: '⚠️', label: 'Missing Invoices', badge: '₹4.09L' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveSection(tab.id)}
            className="c-a-hardik-mehta-report-view-s35" style={{ background: activeSection === tab.id ? '#0b2b26' : 'transparent', color: activeSection === tab.id ? '#C49B4F' : '#5f665f', boxShadow: activeSection === tab.id ? '0 2px 6px rgba(11, 43, 38, 0.15)' : 'none' }}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
            <span className="c-a-hardik-mehta-report-view-s36" style={{ background: activeSection === tab.id ? 'rgba(196, 155, 79, 0.25)' : 'rgba(61, 63, 52, 0.06)', color: activeSection === tab.id ? '#fef3c7' : '#5f665f' }}>
              {tab.badge}
            </span>
          </button>
        ))}
      </div>

      {/* ── SECTION 1: SUMMARY OF DUES & KEY DATES (ANNEXURE 1) ───────────────── */}
      {activeSection === 'summary' && (
        <div className="c-a-hardik-mehta-report-view-s37">
          
          {/* Annexure 1 - Section 3 Table of Dues */}
          <div className="c-a-hardik-mehta-report-view-s38">
            <div className="c-a-hardik-mehta-report-view-s39">
              <div>
                <h3 className="c-a-hardik-mehta-report-view-s40">
                  Annexure 1 (Section 3) — Statement of Maintenance Receivable from Builder
                </h3>
                <p className="c-a-hardik-mehta-report-view-s41">
                  Tentative amount worked out for Building A as certified by CA Hardik Mehta (Final Report Dtd. 22 Feb 2026)
                </p>
              </div>
              <span className="c-a-hardik-mehta-report-view-s42">
                Net Receivable: {fmtINR(meta.keyFigures.amountReceivable)}
              </span>
            </div>

            <div className="c-a-hardik-mehta-report-view-s43">
              <table className="c-a-hardik-mehta-report-view-s44">
                <thead>
                  <tr className="c-a-hardik-mehta-report-view-s45">
                    <th className="c-a-hardik-mehta-report-view-s46">Particulars</th>
                    <th className="c-a-hardik-mehta-report-view-s46">Audit Notes &amp; Basis</th>
                    <th className="c-a-hardik-mehta-report-view-s47">Amount (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  {statementOfDues.map((row) => {
                    const isTotal = row.type === 'final-total';
                    const isSubtotal = row.type.startsWith('subtotal') || row.type === 'net-principal';
                    const isCredit = row.type === 'credit' || row.type === 'subtotal-credit';
                    const isDebit = row.type === 'debit' || row.type === 'subtotal-debit' || row.type === 'deduction';
                    const isInterest = row.type === 'interest';

                    let rowBg = '#ffffff';
                    if (isTotal) rowBg = 'linear-gradient(90deg, #fff7ed 0%, #ffedd5 100%)';
                    else if (row.type === 'net-principal') rowBg = '#f0fdf4';
                    else if (isSubtotal) rowBg = '#f8fafc';

                    return (
                      <tr
                        key={row.id}
                        style={{
                          background: rowBg,
                          borderBottom: isTotal ? '2.5px solid #ea580c' : isSubtotal ? '1.5px solid rgba(61, 63, 52, 0.15)' : '1px solid rgba(61, 63, 52, 0.08)',
                          fontWeight: isTotal ? 900 : isSubtotal ? 800 : 500
                        }}
                      >
                        <td className="c-a-hardik-mehta-report-view-s48" style={{ color: isTotal ? '#9a3412' : isSubtotal ? '#0f172a' : '#334155', fontSize: isTotal ? '1rem' : isSubtotal ? '0.92rem' : '0.86rem' }}>
                          {row.particulars}
                        </td>
                        <td className="c-a-hardik-mehta-report-view-s49">
                          {row.notes}
                        </td>
                        <td className="c-a-hardik-mehta-report-view-s50" style={{ fontSize: isTotal ? '1.15rem' : isSubtotal ? '0.95rem' : '0.88rem', color: isTotal ? '#c2410c' : isCredit ? '#15803d' : isDebit ? '#b91c1c' : isInterest ? '#b45309' : '#0f172a' }}>
                          {fmtINR(Math.abs(row.amount))}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="c-a-hardik-mehta-report-view-s51">
              <strong>📌 Important Auditor Remark:</strong> Page 4 mentions <em>"The tentative amount of maintenance receivable from Builder comes to Rs. 11,99,518 /- which is worked out as under"</em>, while the table arrives at <strong>Rs. 12,07,058</strong> (Net Principal ₹9,00,790 + Interest ₹3,06,268). The certified conclusion on Page 3 formally states: <strong>Rs. 12,07,058</strong>.
            </div>
          </div>

          {/* Key Dates & Allocation Ratios (Annexure 1 - Sections 1 & 2) */}
          <div className="c-a-hardik-mehta-report-view-s52">
            {/* Key Dates */}
            <div className="c-a-hardik-mehta-report-view-s53">
              <h4 className="c-a-hardik-mehta-report-view-s54">
                <span>📅</span>
                <span>Annexure 1 (Section 1) — Key Milestones</span>
              </h4>
              <div className="c-a-hardik-mehta-report-view-s55">
                {keyDates.map(kd => (
                  <div key={kd.id} className="c-a-hardik-mehta-report-view-s56">
                    <div>
                      <div className="c-a-hardik-mehta-report-view-s57">{kd.event}</div>
                      <div className="c-a-hardik-mehta-report-view-s58">{kd.description}</div>
                    </div>
                    <span className="c-a-hardik-mehta-report-view-s59">
                      {kd.fromDate}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Allocation Ratios */}
            <div className="c-a-hardik-mehta-report-view-s53">
              <h4 className="c-a-hardik-mehta-report-view-s54">
                <span>📐</span>
                <span>Annexure 1 (Section 2) — Allocation Ratios</span>
              </h4>
              <div className="c-a-hardik-mehta-report-view-s55">
                {allocationRatios.map(ar => (
                  <div key={ar.id} className="c-a-hardik-mehta-report-view-s60">
                    <div className="c-a-hardik-mehta-report-view-s61">
                      <span className="c-a-hardik-mehta-report-view-s57">{ar.name}</span>
                      <span className="c-a-hardik-mehta-report-view-s62">
                        {ar.ratio}
                      </span>
                    </div>
                    <div className="c-a-hardik-mehta-report-view-s63">{ar.description}</div>
                    <div className="c-a-hardik-mehta-report-view-s64">
                      Share: Bldg A {ar.shareA} • Bldg B {ar.shareB} {ar.shareC ? `• Bldg C ${ar.shareC}` : ''}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Annexure 1 - Section 4: Summary of Year-Wise Expenses */}
          <div className="c-a-hardik-mehta-report-view-s38">
            <div className="c-a-hardik-mehta-report-view-s65">
              <div>
                <h3 className="c-a-hardik-mehta-report-view-s40">
                  Annexure 1 (Section 4) — Summary of Year-Wise Expenses (Building A)
                </h3>
                <p className="c-a-hardik-mehta-report-view-s41">
                  21 expenditure categories across Oct'19 to Jun'22 totaling ₹26,40,866 (Top 6 categories constitute &gt;85% of total expenses)
                </p>
              </div>
              <span className="c-a-hardik-mehta-report-view-s66">
                ⭐ Major 85%+ Expenses Highlighted
              </span>
            </div>

            <div className="c-a-hardik-mehta-report-view-s43">
              <table className="c-a-hardik-mehta-report-view-s67">
                <thead>
                  <tr className="c-a-hardik-mehta-report-view-s68">
                    <th className="c-a-hardik-mehta-report-view-s69">Nature of Expenses</th>
                    <th className="c-a-hardik-mehta-report-view-s70">Oct'19–Dec'19</th>
                    <th className="c-a-hardik-mehta-report-view-s70">Jan'20–Dec'20</th>
                    <th className="c-a-hardik-mehta-report-view-s70">Jan'21–Sep'21</th>
                    <th className="c-a-hardik-mehta-report-view-s70">Jan'22–Jun'22</th>
                    <th className="c-a-hardik-mehta-report-view-s70">Total (₹)</th>
                    <th className="c-a-hardik-mehta-report-view-s70">Share %</th>
                  </tr>
                </thead>
                <tbody>
                  {yearWiseExpenses.map((exp, idx) => (
                    <tr
                      key={exp.id}
                      className="c-a-hardik-mehta-report-view-s71" style={{ background: exp.isMajor ? '#fefce8' : idx % 2 === 0 ? '#ffffff' : '#f8fafc', fontWeight: exp.isMajor ? 700 : 500 }}
                    >
                      <td className="c-a-hardik-mehta-report-view-s72" style={{ color: exp.isMajor ? '#854d0e' : '#1e293b' }}>
                        {exp.isMajor && <span className="c-a-hardik-mehta-report-view-s73">⭐</span>}
                        {exp.category}
                      </td>
                      <td className="c-a-hardik-mehta-report-view-s74">
                        {exp.oct19Dec19 ? fmtINR(exp.oct19Dec19) : '—'}
                      </td>
                      <td className="c-a-hardik-mehta-report-view-s74">
                        {exp.jan20Dec20 ? fmtINR(exp.jan20Dec20) : '—'}
                      </td>
                      <td className="c-a-hardik-mehta-report-view-s74">
                        {exp.jan21Sep21 ? fmtINR(exp.jan21Sep21) : '—'}
                      </td>
                      <td className="c-a-hardik-mehta-report-view-s74">
                        {exp.jan22Jun22 ? fmtINR(exp.jan22Jun22) : '—'}
                      </td>
                      <td className="c-a-hardik-mehta-report-view-s75">
                        {fmtINR(exp.total)}
                      </td>
                      <td className="c-a-hardik-mehta-report-view-s76">
                        {exp.percentage}
                      </td>
                    </tr>
                  ))}
                  {/* Grand Total Row */}
                  <tr className="c-a-hardik-mehta-report-view-s77">
                    <td className="c-a-hardik-mehta-report-view-s78">Grand Total</td>
                    <td className="c-a-hardik-mehta-report-view-s79">{fmtINR(yearWiseGrandTotal.oct19Dec19)}</td>
                    <td className="c-a-hardik-mehta-report-view-s79">{fmtINR(yearWiseGrandTotal.jan20Dec20)}</td>
                    <td className="c-a-hardik-mehta-report-view-s79">{fmtINR(yearWiseGrandTotal.jan21Sep21)}</td>
                    <td className="c-a-hardik-mehta-report-view-s79">{fmtINR(yearWiseGrandTotal.jan22Jun22)}</td>
                    <td className="c-a-hardik-mehta-report-view-s80">{fmtINR(yearWiseGrandTotal.total)}</td>
                    <td className="c-a-hardik-mehta-report-view-s81">100.0%</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── SECTION 2: COMMON EXPENSES (ANNEXURE 1 - SECTION 6) ──────────────── */}
      {activeSection === 'commonExp' && (
        <div className="c-a-hardik-mehta-report-view-s38">
          <div className="c-a-hardik-mehta-report-view-s82">
            <h3 className="c-a-hardik-mehta-report-view-s83">
              Annexure 1 (Section 6) — Common Expenses Allocation to Building A
            </h3>
            <p className="c-a-hardik-mehta-report-view-s84">
              {commonExpenses.description} Total common expenses attributable: <strong>{fmtINR(commonExpenses.total)}</strong>
            </p>
          </div>

          <div className="c-a-hardik-mehta-report-view-s37">
            {commonExpenses.allocations.map((group, gIdx) => (
              <div key={gIdx} className="c-a-hardik-mehta-report-view-s85">
                <div className="c-a-hardik-mehta-report-view-s86">
                  <span className="c-a-hardik-mehta-report-view-s87">
                    {group.pool}
                  </span>
                  <span className="c-a-hardik-mehta-report-view-s88">
                    Group Total: {fmtINR(group.total)}
                  </span>
                </div>

                <div className="c-a-hardik-mehta-report-view-s43">
                  <table className="c-a-hardik-mehta-report-view-s67">
                    <thead>
                      <tr className="c-a-hardik-mehta-report-view-s89">
                        <th className="c-a-hardik-mehta-report-view-s90">Expense Item</th>
                        <th className="c-a-hardik-mehta-report-view-s91">Oct'19–Dec'19</th>
                        <th className="c-a-hardik-mehta-report-view-s91">Jan'20–Dec'20</th>
                        <th className="c-a-hardik-mehta-report-view-s91">Jan'21–Sep'21</th>
                        <th className="c-a-hardik-mehta-report-view-s91">Jan'22–Jun'22</th>
                        <th className="c-a-hardik-mehta-report-view-s91">Total (₹)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {group.items.map((item, idx) => (
                        <tr key={idx} className="c-a-hardik-mehta-report-view-s92" style={{ background: idx % 2 === 0 ? '#ffffff' : '#fcfcfc' }}>
                          <td className="c-a-hardik-mehta-report-view-s93">{item.name}</td>
                          <td className="c-a-hardik-mehta-report-view-s94">{item.oct19Dec19 ? fmtINR(item.oct19Dec19) : '—'}</td>
                          <td className="c-a-hardik-mehta-report-view-s94">{item.jan20Dec20 ? fmtINR(item.jan20Dec20) : '—'}</td>
                          <td className="c-a-hardik-mehta-report-view-s94">{item.jan21Sep21 ? fmtINR(item.jan21Sep21) : '—'}</td>
                          <td className="c-a-hardik-mehta-report-view-s94">{item.jan22Jun22 ? fmtINR(item.jan22Jun22) : '—'}</td>
                          <td className="c-a-hardik-mehta-report-view-s95">{fmtINR(item.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── SECTION 3: VENDORS SUMMARY (ANNEXURE 1 - SECTION 7) ──────────────── */}
      {activeSection === 'vendors' && (
        <div className="c-a-hardik-mehta-report-view-s38">
          <div className="c-a-hardik-mehta-report-view-s39">
            <div>
              <h3 className="c-a-hardik-mehta-report-view-s83">
                Annexure 1 (Section 7) — Year-Wise List of Vendors Providing Services
              </h3>
              <p className="c-a-hardik-mehta-report-view-s84">
                Complete breakdown of all 20 vendors engaged by builder for Building A services totaling <strong>{fmtINR(meta.keyFigures.invoicedExpenses)}</strong>
              </p>
            </div>
            <span className="c-a-hardik-mehta-report-view-s96">
              20 Service Providers
            </span>
          </div>

          <div className="c-a-hardik-mehta-report-view-s43">
            <table className="c-a-hardik-mehta-report-view-s67">
              <thead>
                <tr className="c-a-hardik-mehta-report-view-s45">
                  <th className="c-a-hardik-mehta-report-view-s97">Vendor Name</th>
                  <th className="c-a-hardik-mehta-report-view-s97">Nature of Services</th>
                  <th className="c-a-hardik-mehta-report-view-s98">Oct'19–Dec'19</th>
                  <th className="c-a-hardik-mehta-report-view-s98">Jan'20–Dec'20</th>
                  <th className="c-a-hardik-mehta-report-view-s98">Jan'21–Sep'21</th>
                  <th className="c-a-hardik-mehta-report-view-s98">Jan'22–Jun'22</th>
                  <th className="c-a-hardik-mehta-report-view-s98">Total (₹)</th>
                </tr>
              </thead>
              <tbody>
                {vendors.map((v, idx) => (
                  <tr key={idx} className="c-a-hardik-mehta-report-view-s92" style={{ background: idx % 2 === 0 ? '#ffffff' : '#fcfcfc' }}>
                    <td className="c-a-hardik-mehta-report-view-s99">{v.name}</td>
                    <td className="c-a-hardik-mehta-report-view-s100">{v.nature}</td>
                    <td className="c-a-hardik-mehta-report-view-s101">{v.oct19Dec19 ? fmtINR(v.oct19Dec19) : '—'}</td>
                    <td className="c-a-hardik-mehta-report-view-s101">{v.jan20Dec20 ? fmtINR(v.jan20Dec20) : '—'}</td>
                    <td className="c-a-hardik-mehta-report-view-s101">{v.jan21Sep21 ? fmtINR(v.jan21Sep21) : '—'}</td>
                    <td className="c-a-hardik-mehta-report-view-s101">{v.jan22Jun22 ? fmtINR(v.jan22Jun22) : '—'}</td>
                    <td className="c-a-hardik-mehta-report-view-s102">{fmtINR(v.total)}</td>
                  </tr>
                ))}
                {/* Total */}
                <tr className="c-a-hardik-mehta-report-view-s77">
                  <td colSpan={2} className="c-a-hardik-mehta-report-view-s103">TOTAL VENDOR EXPENDITURE</td>
                  <td className="c-a-hardik-mehta-report-view-s104">{fmtINR(yearWiseGrandTotal.oct19Dec19)}</td>
                  <td className="c-a-hardik-mehta-report-view-s104">{fmtINR(yearWiseGrandTotal.jan20Dec20)}</td>
                  <td className="c-a-hardik-mehta-report-view-s104">{fmtINR(yearWiseGrandTotal.jan21Sep21)}</td>
                  <td className="c-a-hardik-mehta-report-view-s104">{fmtINR(yearWiseGrandTotal.jan22Jun22)}</td>
                  <td className="c-a-hardik-mehta-report-view-s105">{fmtINR(yearWiseGrandTotal.total)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── SECTION 4: ANNEXURE 2 & NEGOTIATION SCENARIOS ─────────────────────── */}
      {activeSection === 'clarifications' && (
        <div className="c-a-hardik-mehta-report-view-s37">

          {/* Interactive Negotiating Leverage Simulator */}
          <div className="c-a-hardik-mehta-report-view-s106">
            <div className="c-a-hardik-mehta-report-view-s107">
              <div>
                <span className="c-a-hardik-mehta-report-view-s108">
                  COMMITTEE STRATEGY SIMULATOR
                </span>
                <h3 className="c-a-hardik-mehta-report-view-s109">
                  Annexure 2 Negotiation Leverage Calculator
                </h3>
                <p className="c-a-hardik-mehta-report-view-s110">
                  Test how different audit dispute outcomes affect the net recoverable amount from the builder.
                </p>
              </div>

              <div className="c-a-hardik-mehta-report-view-s111">
                <div className="c-a-hardik-mehta-report-view-s112">SIMULATED RECOVERABLE CLAIM</div>
                <div className="c-a-hardik-mehta-report-view-s113">
                  {fmtINR(scenarioCalculatedTotal)}
                </div>
                <div className="c-a-hardik-mehta-report-view-s114" style={{ color: scenarioCalculatedTotal >= meta.keyFigures.amountReceivable ? '#86efac' : '#fca5a5' }}>
                  {scenarioCalculatedTotal >= meta.keyFigures.amountReceivable ? `+${fmtINR(scenarioCalculatedTotal - meta.keyFigures.amountReceivable)} vs Baseline` : `${fmtINR(scenarioCalculatedTotal - meta.keyFigures.amountReceivable)} vs Baseline`}
                </div>
              </div>
            </div>

            <div className="c-a-hardik-mehta-report-view-s115">
              {/* Toggle 1: Disallow Missing Invoices */}
              <label className="c-a-hardik-mehta-report-view-s116" style={{ border: scenarioDisallowMissing ? '1px solid #4ade80' : '1px solid rgba(255, 255, 255, 0.1)' }}>
                <input
                  type="checkbox"
                  checked={scenarioDisallowMissing}
                  onChange={e => setScenarioDisallowMissing(e.target.checked)}
                  className="c-a-hardik-mehta-report-view-s117"
                />
                <div>
                  <div className="c-a-hardik-mehta-report-view-s118">Disallow Missing Invoices (+₹4,09,211)</div>
                  <div className="c-a-hardik-mehta-report-view-s119">Reject builder expense claims without authentic vouchers</div>
                </div>
              </label>

              {/* Toggle 2: Claim GST ITC */}
              <label className="c-a-hardik-mehta-report-view-s116" style={{ border: scenarioClaimGST ? '1px solid #4ade80' : '1px solid rgba(255, 255, 255, 0.1)' }}>
                <input
                  type="checkbox"
                  checked={scenarioClaimGST}
                  onChange={e => setScenarioClaimGST(e.target.checked)}
                  className="c-a-hardik-mehta-report-view-s117"
                />
                <div>
                  <div className="c-a-hardik-mehta-report-view-s118">Claim GST Input Tax Credit (+₹1,39,070)</div>
                  <div className="c-a-hardik-mehta-report-view-s119">Refund ITC availed by builder on society expenditures</div>
                </div>
              </label>

              {/* Toggle 3: Supervision Charges Contest */}
              <label className="c-a-hardik-mehta-report-view-s116" style={{ border: scenarioConcedeSupervision ? '1px solid #f87171' : '1px solid rgba(255, 255, 255, 0.1)' }}>
                <input
                  type="checkbox"
                  checked={scenarioConcedeSupervision}
                  onChange={e => setScenarioConcedeSupervision(e.target.checked)}
                  className="c-a-hardik-mehta-report-view-s120"
                />
                <div>
                  <div className="c-a-hardik-mehta-report-view-s118">Builder Enforces Supervision (-₹2,70,000)</div>
                  <div className="c-a-hardik-mehta-report-view-s119">If developer insists on charging supervisory fees</div>
                </div>
              </label>

              {/* Toggle 4: Interest Dispute */}
              <label className="c-a-hardik-mehta-report-view-s116" style={{ border: scenarioConcedeInterest ? '1px solid #f87171' : '1px solid rgba(255, 255, 255, 0.1)' }}>
                <input
                  type="checkbox"
                  checked={scenarioConcedeInterest}
                  onChange={e => setScenarioConcedeInterest(e.target.checked)}
                  className="c-a-hardik-mehta-report-view-s120"
                />
                <div>
                  <div className="c-a-hardik-mehta-report-view-s118">Builder Refuses 8% Interest (-₹3,06,268)</div>
                  <div className="c-a-hardik-mehta-report-view-s119">If builder disputes delay penalty interest liability</div>
                </div>
              </label>

              {/* Toggle 5: Uncollected Maintenance Dispute */}
              <label className="c-a-hardik-mehta-report-view-s116" style={{ border: scenarioConcedeUncollectedMaint ? '1px solid #f87171' : '1px solid rgba(255, 255, 255, 0.1)' }}>
                <input
                  type="checkbox"
                  checked={scenarioConcedeUncollectedMaint}
                  onChange={e => setScenarioConcedeUncollectedMaint(e.target.checked)}
                  className="c-a-hardik-mehta-report-view-s120"
                />
                <div>
                  <div className="c-a-hardik-mehta-report-view-s118">Builder Deducts Uncollected Maint (-₹2,19,628)</div>
                  <div className="c-a-hardik-mehta-report-view-s119">If builder disclaims responsibility for defaulters</div>
                </div>
              </label>

              {/* Toggle 6: Commercial Shop GST */}
              <label className="c-a-hardik-mehta-report-view-s116" style={{ border: scenarioConcedeShopGST ? '1px solid #f87171' : '1px solid rgba(255, 255, 255, 0.1)' }}>
                <input
                  type="checkbox"
                  checked={scenarioConcedeShopGST}
                  onChange={e => setScenarioConcedeShopGST(e.target.checked)}
                  className="c-a-hardik-mehta-report-view-s120"
                />
                <div>
                  <div className="c-a-hardik-mehta-report-view-s118">Commercial Shop GST Offset (-₹43,106)</div>
                  <div className="c-a-hardik-mehta-report-view-s119">If builder proves 18% GST was paid to Government</div>
                </div>
              </label>
            </div>
          </div>

          {/* Full Detailed List of 9 Annexure 2 Items */}
          <div className="c-a-hardik-mehta-report-view-s121">
            <h3 className="c-a-hardik-mehta-report-view-s122">
              Annexure 2 — Detailed Examination of 9 Negotiation &amp; Clarity Points
            </h3>

            {discussionsAndClarity.map((item) => {
              const isPositive = item.impactType === 'positive';
              const isNegative = item.impactType === 'negative';

              return (
                <div key={item.itemNo} className="c-a-hardik-mehta-report-view-s123">
                  <div className="c-a-hardik-mehta-report-view-s124">
                    <div className="c-a-hardik-mehta-report-view-s125">
                      <span className="c-a-hardik-mehta-report-view-s126">
                        {item.itemNo}
                      </span>
                      <h4 className="c-a-hardik-mehta-report-view-s127">
                        {item.topic}
                      </h4>
                    </div>

                    <span className="c-a-hardik-mehta-report-view-s128" style={{ background: isPositive ? '#ecfdf5' : isNegative ? '#fef2f2' : '#f1f5f9', color: isPositive ? '#065f46' : isNegative ? '#991b1b' : '#334155', border: isPositive ? '1px solid #a7f3d0' : isNegative ? '1px solid #fecaca' : '1px solid #cbd5e1' }}>
                      {item.impactFormatted}
                    </span>
                  </div>

                  <p className="c-a-hardik-mehta-report-view-s129">
                    {item.description}
                  </p>

                  <div className="c-a-hardik-mehta-report-view-s130">
                    <span>💡</span>
                    <span><strong>Committee Action Plan:</strong> {item.actionPlan}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── SECTION 5: ANNEXURE 3 FULL LINE ITEMS (176 ITEMS) ────────────────── */}
      {activeSection === 'lineItems' && (
        <div className="c-a-hardik-mehta-report-view-s38">
          {/* Header & Controls */}
          <div className="c-a-hardik-mehta-report-view-s131">
            <div>
              <h3 className="c-a-hardik-mehta-report-view-s83">
                Annexure 3 — Line by Line Items of All Expenses Spent for Building A
              </h3>
              <p className="c-a-hardik-mehta-report-view-s84">
                Complete register of 176 vouched transactions verified by CA Hardik Mehta totaling <strong>{fmtINR(meta.keyFigures.invoicedExpenses)}</strong>
              </p>
            </div>

            <button
              onClick={handleExportInvoicesCSV}
              className="c-a-hardik-mehta-report-view-s132"
            >
              <span>📥</span>
              <span>Export {filteredLineItems.length} Records</span>
            </button>
          </div>

          {/* Filters Bar */}
          <div className="c-a-hardik-mehta-report-view-s133">
            <div className="c-a-hardik-mehta-report-view-s134">
              <input
                type="text"
                placeholder="Search vendor, nature, invoice no, month..."
                value={lineSearch}
                onChange={e => setLineSearch(e.target.value)}
                className="c-a-hardik-mehta-report-view-s135"
              />
            </div>

            <div className="c-a-hardik-mehta-report-view-s136">
              <select
                value={lineBasis}
                onChange={e => setLineBasis(e.target.value)}
                className="c-a-hardik-mehta-report-view-s137"
              >
                <option value="All">All Allocation Types</option>
                <option value="Self">Self (100% Building A)</option>
                <option value="Allocation AB">Allocation AB (87:96)</option>
                <option value="Allocation AB Builder">Allocation AB Builder (70:30)</option>
                <option value="Allocation ABC">Allocation ABC (87:96:43.5)</option>
              </select>

              <select
                value={lineYear}
                onChange={e => setLineYear(e.target.value)}
                className="c-a-hardik-mehta-report-view-s137"
              >
                <option value="All">All Financial Years</option>
                <option value="2019">2019</option>
                <option value="2020">2020</option>
                <option value="2021">2021</option>
                <option value="2022">2022</option>
              </select>

              <select
                value={lineVendor}
                onChange={e => setLineVendor(e.target.value)}
                className="c-a-hardik-mehta-report-view-s138"
              >
                {uniqueVendors.map(v => (
                  <option key={v} value={v}>{v === 'All' ? 'All Vendors (20)' : v}</option>
                ))}
              </select>
            </div>

            <div className="c-a-hardik-mehta-report-view-s139">
              Showing {filteredLineItems.length} of 176 items • Sum: <span className="c-a-hardik-mehta-report-view-s140">{fmtINR(filteredLineItemsTotal)}</span>
            </div>
          </div>

          {/* Table */}
          <div className="c-a-hardik-mehta-report-view-s141">
            <table className="c-a-hardik-mehta-report-view-s142">
              <thead className="c-a-hardik-mehta-report-view-s143">
                <tr>
                  <th className="c-a-hardik-mehta-report-view-s144">#</th>
                  <th className="c-a-hardik-mehta-report-view-s145">Basis</th>
                  <th className="c-a-hardik-mehta-report-view-s69">Vendor Name</th>
                  <th className="c-a-hardik-mehta-report-view-s69">Nature of Transaction</th>
                  <th className="c-a-hardik-mehta-report-view-s146">Inv No</th>
                  <th className="c-a-hardik-mehta-report-view-s146">Inv Date</th>
                  <th className="c-a-hardik-mehta-report-view-s146">Voucher Date</th>
                  <th className="c-a-hardik-mehta-report-view-s147">Doc Amt</th>
                  <th className="c-a-hardik-mehta-report-view-s148">Relevant Amt</th>
                  <th className="c-a-hardik-mehta-report-view-s149">Year</th>
                  <th className="c-a-hardik-mehta-report-view-s145">Month</th>
                </tr>
              </thead>
              <tbody>
                {filteredLineItems.map((item, idx) => (
                  <tr
                    key={item.id}
                    className="c-a-hardik-mehta-report-view-s92" style={{ background: idx % 2 === 0 ? '#ffffff' : '#f8fafc' }}
                  >
                    <td className="c-a-hardik-mehta-report-view-s150">{item.id}</td>
                    <td className="c-a-hardik-mehta-report-view-s151">
                      <span className="c-a-hardik-mehta-report-view-s152" style={{ background: item.basis === 'Self' ? '#e0f2fe' : item.basis === 'Allocation AB' ? '#fef3c7' : item.basis.includes('Builder') ? '#fce7f3' : '#f3e8ff', color: item.basis === 'Self' ? '#0369a1' : item.basis === 'Allocation AB' ? '#92400e' : item.basis.includes('Builder') ? '#9d174d' : '#6b21a8' }}>
                        {item.basis}
                      </span>
                    </td>
                    <td className="c-a-hardik-mehta-report-view-s153">{item.vendor}</td>
                    <td className="c-a-hardik-mehta-report-view-s154">{item.nature}</td>
                    <td className="c-a-hardik-mehta-report-view-s155">{item.invoiceNo || '—'}</td>
                    <td className="c-a-hardik-mehta-report-view-s156">{item.invoiceDate || '—'}</td>
                    <td className="c-a-hardik-mehta-report-view-s157">{item.pmtVoucherDate || '—'}</td>
                    <td className="c-a-hardik-mehta-report-view-s158">
                      {item.docAmt !== null ? fmtINR(item.docAmt) : '—'}
                    </td>
                    <td className="c-a-hardik-mehta-report-view-s159" style={{ color: item.relevantAmt > 0 ? '#0f172a' : '#94a3b8' }}>
                      {fmtINR(item.relevantAmt)}
                    </td>
                    <td className="c-a-hardik-mehta-report-view-s160">{item.year}</td>
                    <td className="c-a-hardik-mehta-report-view-s161">{item.month || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── SECTION 6: ANNEXURE 4 MISSING INVOICES AUDIT (₹4,09,211) ─────────── */}
      {activeSection === 'missingInvoices' && (
        <div className="c-a-hardik-mehta-report-view-s38">
          <div className="c-a-hardik-mehta-report-view-s131">
            <div>
              <div className="c-a-hardik-mehta-report-view-s162">
                <span className="c-a-hardik-mehta-report-view-s163">⚠️</span>
                <span className="c-a-hardik-mehta-report-view-s164">
                  AUDIT EXCEPTION LIST
                </span>
              </div>
              <h3 className="c-a-hardik-mehta-report-view-s83">
                Annexure 4 — List of Missing Invoices Considered on Estimated Basis
              </h3>
              <p className="c-a-hardik-mehta-report-view-s84">
                Total 23 items amounting to <strong>{fmtINR(missingInvoices.total)}</strong> factored into builder expenditure. If excluded, society recovery increases by ₹4,09,211!
              </p>
            </div>

            <div className="c-a-hardik-mehta-report-view-s165">
              {onOpenBOMAnalytics && (
                <button
                  onClick={onOpenBOMAnalytics}
                  className="c-a-hardik-mehta-report-view-s166"
                >
                  <span>🔬</span>
                  <span>Cross-Analyze with BOM Passbook (135 Txs)</span>
                </button>
              )}
              <button
                onClick={handleExportMissingCSV}
                className="c-a-hardik-mehta-report-view-s167"
              >
                <span>📥</span>
                <span>Export Missing Invoices (CSV)</span>
              </button>
            </div>
          </div>

          {/* Filters */}
          <div className="c-a-hardik-mehta-report-view-s168">
            <div className="c-a-hardik-mehta-report-view-s134">
              <input
                type="text"
                placeholder="Search vendor, nature, year..."
                value={missingSearch}
                onChange={e => setMissingSearch(e.target.value)}
                className="c-a-hardik-mehta-report-view-s169"
              />
            </div>

            <div className="c-a-hardik-mehta-report-view-s170">
              <button
                onClick={() => setMissingCategory('All')}
                className="c-a-hardik-mehta-report-view-s171" style={{ background: missingCategory === 'All' ? '#991b1b' : '#ffffff', color: missingCategory === 'All' ? '#ffffff' : '#475569' }}
              >
                All (₹4.09L)
              </button>
              <button
                onClick={() => setMissingCategory('bldgB')}
                className="c-a-hardik-mehta-report-view-s171" style={{ background: missingCategory === 'bldgB' ? '#991b1b' : '#ffffff', color: missingCategory === 'bldgB' ? '#ffffff' : '#475569' }}
              >
                Bldg B Records Only (₹1.73L)
              </button>
              <button
                onClick={() => setMissingCategory('recurring')}
                className="c-a-hardik-mehta-report-view-s171" style={{ background: missingCategory === 'recurring' ? '#991b1b' : '#ffffff', color: missingCategory === 'recurring' ? '#ffffff' : '#475569' }}
              >
                Recurring Estimates (₹2.36L)
              </button>
            </div>

            <div className="c-a-hardik-mehta-report-view-s172">
              Subtotal: {fmtINR(filteredMissingTotal)}
            </div>
          </div>

          {/* Category I Table: Invoices found in Bldg B assignment */}
          {(missingCategory === 'All' || missingCategory === 'bldgB') && (
            <div className="c-a-hardik-mehta-report-view-s173">
              <div className="c-a-hardik-mehta-report-view-s174">
                <span className="c-a-hardik-mehta-report-view-s175">
                  I) Invoices found during Building B assignment but missing in Building A records
                </span>
                <span className="c-a-hardik-mehta-report-view-s176">
                  Subtotal: {fmtINR(missingInvoices.subtotalBldgBFound)}
                </span>
              </div>

              <div className="c-a-hardik-mehta-report-view-s177">
                <table className="c-a-hardik-mehta-report-view-s142">
                  <thead>
                    <tr className="c-a-hardik-mehta-report-view-s178">
                      <th className="c-a-hardik-mehta-report-view-s179">Vendor</th>
                      <th className="c-a-hardik-mehta-report-view-s179">Nature of Transaction</th>
                      <th className="c-a-hardik-mehta-report-view-s180">Inv Date</th>
                      <th className="c-a-hardik-mehta-report-view-s180">Voucher Date</th>
                      <th className="c-a-hardik-mehta-report-view-s181">Doc Exp</th>
                      <th className="c-a-hardik-mehta-report-view-s182">Allocated Amount</th>
                      <th className="c-a-hardik-mehta-report-view-s183">Year</th>
                      <th className="c-a-hardik-mehta-report-view-s179">Month</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredMissingBldgB.map(i => (
                      <tr key={i.id} className="c-a-hardik-mehta-report-view-s92">
                        <td className="c-a-hardik-mehta-report-view-s184">{i.vendor}</td>
                        <td className="c-a-hardik-mehta-report-view-s154">{i.nature}</td>
                        <td className="c-a-hardik-mehta-report-view-s185">{i.invoiceDate || '—'}</td>
                        <td className="c-a-hardik-mehta-report-view-s185">{i.pmtVoucherDate || '—'}</td>
                        <td className="c-a-hardik-mehta-report-view-s186">{fmtINR(i.docAmt)}</td>
                        <td className="c-a-hardik-mehta-report-view-s187">{fmtINR(i.allocatedAmt)}</td>
                        <td className="c-a-hardik-mehta-report-view-s188">{i.year}</td>
                        <td className="c-a-hardik-mehta-report-view-s189">{i.month || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Category II Table: Assumed periodic recurring services */}
          {(missingCategory === 'All' || missingCategory === 'recurring') && (
            <div>
              <div className="c-a-hardik-mehta-report-view-s190">
                <span className="c-a-hardik-mehta-report-view-s191">
                  II) Recurring periodic services assumed missing without invoices (Electricity, Lift, Water, Cleaning)
                </span>
                <span className="c-a-hardik-mehta-report-view-s192">
                  Subtotal: {fmtINR(missingInvoices.subtotalRecurringEstimated)}
                </span>
              </div>

              <div className="c-a-hardik-mehta-report-view-s193">
                <table className="c-a-hardik-mehta-report-view-s142">
                  <thead>
                    <tr className="c-a-hardik-mehta-report-view-s194">
                      <th className="c-a-hardik-mehta-report-view-s179">Vendor</th>
                      <th className="c-a-hardik-mehta-report-view-s179">Nature of Transaction</th>
                      <th className="c-a-hardik-mehta-report-view-s195">Estimated Amount</th>
                      <th className="c-a-hardik-mehta-report-view-s180">Year</th>
                      <th className="c-a-hardik-mehta-report-view-s196">Applicable Month(s)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredMissingRecurring.map(i => (
                      <tr key={i.id} className="c-a-hardik-mehta-report-view-s92">
                        <td className="c-a-hardik-mehta-report-view-s184">{i.vendor}</td>
                        <td className="c-a-hardik-mehta-report-view-s154">{i.nature}</td>
                        <td className="c-a-hardik-mehta-report-view-s197">{fmtINR(i.estimatedAmt)}</td>
                        <td className="c-a-hardik-mehta-report-view-s198">{i.year}</td>
                        <td className="c-a-hardik-mehta-report-view-s199">{i.month}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="c-a-hardik-mehta-report-view-s200">
            <strong>⚖️ Negotiation Guidance:</strong> As stated in CA Hardik Mehta's report, this entire amount of <strong>₹4,09,211</strong> was factored in the working as builder expenditure on the assumption that services were recurring. The society is entitled to require the builder to provide authentic bank debit vouchers or vendor receipts. Any failure by the builder to prove these debits increases the society's recoverable claim from <strong>₹12,07,058</strong> up to <strong>₹16,16,269</strong>!
          </div>
        </div>
      )}

    </div>
  );
}
