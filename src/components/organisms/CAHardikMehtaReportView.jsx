import { useState, useMemo } from 'react';
import { CA_HARDIK_MEHTA_REPORT } from '../../data/caHardikMehtaReport.js';
import { fmtINR } from '../../data/builderRecoData.js';

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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* ── 1. Master CA Certification Hero Banner ─────────────────────────── */}
      <div style={{
        background: 'linear-gradient(135deg, #0b2b26 0%, #164e43 60%, #1e3a34 100%)',
        borderRadius: 18,
        padding: '16px 22px',
        color: '#ffffff',
        border: '1.5px solid rgba(196, 155, 79, 0.35)',
        boxShadow: '0 6px 24px rgba(11, 43, 38, 0.2)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Subtle decorative watermark */}
        <div style={{
          position: 'absolute', right: -20, bottom: -20,
          fontSize: '7rem', opacity: 0.05, userSelect: 'none', pointerEvents: 'none'
        }}>
          ⚖️
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 14, position: 'relative', zIndex: 1 }}>
          <div style={{ flex: '1 1 480px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
              <span style={{
                background: 'rgba(196, 155, 79, 0.25)',
                color: '#fef3c7',
                padding: '3px 8px',
                borderRadius: 6,
                fontSize: '0.68rem',
                fontWeight: 800,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                border: '1px solid rgba(196, 155, 79, 0.4)'
              }}>
                {meta.status} • DATED {meta.reportDate.toUpperCase()}
              </span>
              <span style={{
                background: '#fee2e2',
                color: '#991b1b',
                padding: '3px 8px',
                borderRadius: 6,
                fontSize: '0.68rem',
                fontWeight: 800,
                letterSpacing: '0.04em'
              }}>
                AUDIT CLAIM: ₹12,07,058
              </span>
              <span style={{
                background: 'rgba(255, 255, 255, 0.1)',
                color: '#e2e8f0',
                padding: '3px 8px',
                borderRadius: 6,
                fontSize: '0.68rem',
                fontWeight: 600
              }}>
                UDIN: {meta.auditor.udin}
              </span>
            </div>

            <h2 style={{
              margin: '0 0 4px',
              fontSize: '1.25rem',
              fontWeight: 800,
              fontFamily: 'Fraunces, serif',
              color: '#fffaf2',
              lineHeight: 1.3
            }}>
              {meta.reportTitle}
            </h2>

            <p style={{ margin: '0 0 8px', fontSize: '0.80rem', color: '#cbd5e1', lineHeight: 1.45, maxWidth: 820 }}>
              Independent Chartered Accountant examination of maintenance fund utilization and expenditure incurred by developer for Majestique Euriska Building A for period <strong>{meta.period}</strong>.
            </p>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              fontSize: '0.74rem',
              color: '#f1f5f9',
              background: 'rgba(0, 0, 0, 0.25)',
              padding: '6px 12px',
              borderRadius: 10,
              width: 'fit-content',
              flexWrap: 'wrap'
            }}>
              <span>👨‍💼 <strong>{meta.auditor.name}</strong> ({meta.auditor.designation}, M.No: {meta.auditor.membershipNo})</span>
              <span>📍 {meta.auditor.officeAddress}</span>
              <span>📞 {meta.auditor.mobile}</span>
              <span>✉️ {meta.auditor.email}</span>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignSelf: 'center' }}>
            <button
              onClick={handleExportSummaryCSV}
              style={{
                background: '#C49B4F',
                color: '#0b2b26',
                border: 'none',
                padding: '8px 14px',
                borderRadius: 10,
                fontWeight: 800,
                fontSize: '0.78rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                boxShadow: '0 2px 10px rgba(196, 155, 79, 0.25)'
              }}
            >
              <span>📥</span>
              <span>Export Summary (CSV)</span>
            </button>

            <button
              onClick={handleExportInvoicesCSV}
              style={{
                background: 'rgba(255, 255, 255, 0.12)',
                color: '#ffffff',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                padding: '7px 14px',
                borderRadius: 10,
                fontWeight: 600,
                fontSize: '0.76rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6
              }}
            >
              <span>📑</span>
              <span>Export 176 Invoices (CSV)</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── 2. Four Master Financial Metric Cards ───────────────────────────── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
        gap: 12
      }}>
        {/* Card 1: Total Recoverable Claim */}
        <div style={{
          background: 'linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%)',
          borderRadius: 14,
          padding: '14px 16px',
          border: '1.5px solid #fed7aa',
          boxShadow: '0 2px 10px rgba(194, 65, 12, 0.06)'
        }}>
          <div style={{ fontSize: '0.66rem', fontWeight: 800, color: '#9a3412', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>
            FINAL AMOUNT RECEIVABLE FROM BUILDER
          </div>
          <div style={{ fontSize: '1.45rem', fontWeight: 900, color: '#c2410c', fontFamily: 'Fraunces, serif', marginBottom: 4 }}>
            {fmtINR(meta.keyFigures.amountReceivable)}
          </div>
          <div style={{ fontSize: '0.74rem', color: '#7c2d12', lineHeight: 1.35 }}>
            Includes <strong>₹9,00,790</strong> principal + <strong>₹3,06,268</strong> interest (8% p.a.).
          </div>
          <div style={{ marginTop: 6, display: 'inline-block', background: '#ea580c', color: '#ffffff', padding: '1px 6px', borderRadius: 6, fontSize: '0.64rem', fontWeight: 700 }}>
            Subject to Annexure II points
          </div>
        </div>

        {/* Card 2: Total Maintenance Billed */}
        <div style={{
          background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
          borderRadius: 14,
          padding: '14px 16px',
          border: '1.5px solid #bfdbfe',
          boxShadow: '0 2px 10px rgba(30, 64, 175, 0.06)'
        }}>
          <div style={{ fontSize: '0.66rem', fontWeight: 800, color: '#1e40af', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>
            I) TOTAL MAINTENANCE AMOUNT
          </div>
          <div style={{ fontSize: '1.45rem', fontWeight: 900, color: '#1d4ed8', fontFamily: 'Fraunces, serif', marginBottom: 4 }}>
            {fmtINR(meta.keyFigures.totalMaintenance)}
          </div>
          <div style={{ fontSize: '0.74rem', color: '#1e3a8a', lineHeight: 1.35 }}>
            Residential: <strong>{fmtINR(meta.keyFigures.residentialMaintenance)}</strong><br />
            Commercial: <strong>{fmtINR(meta.keyFigures.commercialMaintenance)}</strong>
          </div>
        </div>

        {/* Card 3: Total Expenses Incurred by Builder */}
        <div style={{
          background: 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)',
          borderRadius: 14,
          padding: '14px 16px',
          border: '1.5px solid #fecaca',
          boxShadow: '0 2px 10px rgba(153, 27, 27, 0.06)'
        }}>
          <div style={{ fontSize: '0.66rem', fontWeight: 800, color: '#991b1b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>
            II) TOTAL BUILDER EXPENDITURE
          </div>
          <div style={{ fontSize: '1.45rem', fontWeight: 900, color: '#b91c1c', fontFamily: 'Fraunces, serif', marginBottom: 4 }}>
            {fmtINR(meta.keyFigures.totalExpensesByBuilder)}
          </div>
          <div style={{ fontSize: '0.74rem', color: '#7f1d1d', lineHeight: 1.35 }}>
            Invoiced (176 items): <strong>{fmtINR(meta.keyFigures.invoicedExpenses)}</strong><br />
            Missing/Estimated: <strong>{fmtINR(meta.keyFigures.estimatedMissingExpenses)}</strong>
          </div>
        </div>

        {/* Card 4: Already Received & Net Principal */}
        <div style={{
          background: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)',
          borderRadius: 14,
          padding: '14px 16px',
          border: '1.5px solid #a7f3d0',
          boxShadow: '0 2px 10px rgba(6, 95, 70, 0.06)'
        }}>
          <div style={{ fontSize: '0.66rem', fontWeight: 800, color: '#065f46', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>
            III) RECEIVED &amp; NET PRINCIPAL
          </div>
          <div style={{ fontSize: '1.45rem', fontWeight: 900, color: '#047857', fontFamily: 'Fraunces, serif', marginBottom: 4 }}>
            {fmtINR(meta.keyFigures.netPrincipal)}
          </div>
          <div style={{ fontSize: '0.74rem', color: '#064e3b', lineHeight: 1.35 }}>
            Received: <strong>{fmtINR(meta.keyFigures.amountAlreadyReceived)}</strong><br />
            Net Principal Dues (I − II − III)
          </div>
        </div>
      </div>

      {/* ── 3. Sub-Navigation Bar ───────────────────────────────────────────── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
        gap: 4,
        background: '#ffffff',
        padding: 4,
        borderRadius: 12,
        border: '1px solid rgba(61, 63, 52, 0.1)',
        boxShadow: '0 1px 6px rgba(11, 43, 38, 0.03)'
      }}>
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
            style={{
              padding: '7px 8px',
              borderRadius: 8,
              border: 'none',
              cursor: 'pointer',
              background: activeSection === tab.id ? '#0b2b26' : 'transparent',
              color: activeSection === tab.id ? '#C49B4F' : '#5f665f',
              fontWeight: 800,
              fontSize: '0.76rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 5,
              transition: 'all 0.15s ease',
              boxShadow: activeSection === tab.id ? '0 2px 6px rgba(11, 43, 38, 0.15)' : 'none'
            }}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
            <span style={{
              background: activeSection === tab.id ? 'rgba(196, 155, 79, 0.25)' : 'rgba(61, 63, 52, 0.06)',
              color: activeSection === tab.id ? '#fef3c7' : '#5f665f',
              padding: '1px 5px',
              borderRadius: 6,
              fontSize: '0.62rem',
              fontWeight: 700
            }}>
              {tab.badge}
            </span>
          </button>
        ))}
      </div>

      {/* ── SECTION 1: SUMMARY OF DUES & KEY DATES (ANNEXURE 1) ───────────────── */}
      {activeSection === 'summary' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          
          {/* Annexure 1 - Section 3 Table of Dues */}
          <div style={{
            background: '#ffffff',
            borderRadius: 18,
            padding: 24,
            border: '1.5px solid rgba(61, 63, 52, 0.12)',
            boxShadow: '0 4px 20px rgba(11, 43, 38, 0.04)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
              <div>
                <h3 style={{ margin: '0 0 4px', fontSize: '1.15rem', fontWeight: 800, color: '#1d2a24', fontFamily: 'Fraunces, serif' }}>
                  Annexure 1 (Section 3) — Statement of Maintenance Receivable from Builder
                </h3>
                <p style={{ margin: 0, fontSize: '0.82rem', color: '#5f665f' }}>
                  Tentative amount worked out for Building A as certified by CA Hardik Mehta (Final Report Dtd. 22 Feb 2026)
                </p>
              </div>
              <span style={{
                background: '#fef3c7', color: '#92400e', padding: '6px 12px',
                borderRadius: 10, fontSize: '0.78rem', fontWeight: 700, border: '1px solid #fde68a'
              }}>
                Net Receivable: {fmtINR(meta.keyFigures.amountReceivable)}
              </span>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '2px solid rgba(61, 63, 52, 0.15)' }}>
                    <th style={{ textAlign: 'left', padding: '12px 14px', color: '#475569', fontWeight: 800 }}>Particulars</th>
                    <th style={{ textAlign: 'left', padding: '12px 14px', color: '#475569', fontWeight: 800 }}>Audit Notes &amp; Basis</th>
                    <th style={{ textAlign: 'right', padding: '12px 14px', color: '#475569', fontWeight: 800 }}>Amount (₹)</th>
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
                        <td style={{
                          padding: '12px 14px',
                          color: isTotal ? '#9a3412' : isSubtotal ? '#0f172a' : '#334155',
                          fontSize: isTotal ? '1rem' : isSubtotal ? '0.92rem' : '0.86rem'
                        }}>
                          {row.particulars}
                        </td>
                        <td style={{ padding: '12px 14px', color: '#64748b', fontSize: '0.8rem' }}>
                          {row.notes}
                        </td>
                        <td style={{
                          padding: '12px 14px',
                          textAlign: 'right',
                          fontVariantNumeric: 'tabular-nums',
                          fontFamily: 'monospace',
                          fontSize: isTotal ? '1.15rem' : isSubtotal ? '0.95rem' : '0.88rem',
                          color: isTotal ? '#c2410c' : isCredit ? '#15803d' : isDebit ? '#b91c1c' : isInterest ? '#b45309' : '#0f172a'
                        }}>
                          {fmtINR(Math.abs(row.amount))}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div style={{
              marginTop: 16,
              padding: '12px 16px',
              borderRadius: 12,
              background: '#fffbeb',
              border: '1px solid #fef08a',
              fontSize: '0.82rem',
              color: '#854d0e',
              lineHeight: 1.5
            }}>
              <strong>📌 Important Auditor Remark:</strong> Page 4 mentions <em>"The tentative amount of maintenance receivable from Builder comes to Rs. 11,99,518 /- which is worked out as under"</em>, while the table arrives at <strong>Rs. 12,07,058</strong> (Net Principal ₹9,00,790 + Interest ₹3,06,268). The certified conclusion on Page 3 formally states: <strong>Rs. 12,07,058</strong>.
            </div>
          </div>

          {/* Key Dates & Allocation Ratios (Annexure 1 - Sections 1 & 2) */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
            {/* Key Dates */}
            <div style={{
              background: '#ffffff',
              borderRadius: 18,
              padding: 22,
              border: '1.5px solid rgba(61, 63, 52, 0.12)',
              boxShadow: '0 4px 16px rgba(11, 43, 38, 0.03)'
            }}>
              <h4 style={{ margin: '0 0 12px', fontSize: '1rem', fontWeight: 800, color: '#1d2a24', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span>📅</span>
                <span>Annexure 1 (Section 1) — Key Milestones</span>
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {keyDates.map(kd => (
                  <div key={kd.id} style={{
                    padding: '12px 14px', borderRadius: 12, background: '#f8fafc',
                    border: '1px solid rgba(61, 63, 52, 0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                  }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.86rem', color: '#1e293b' }}>{kd.event}</div>
                      <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: 2 }}>{kd.description}</div>
                    </div>
                    <span style={{
                      background: '#0b2b26', color: '#C49B4F', padding: '4px 10px',
                      borderRadius: 8, fontSize: '0.78rem', fontWeight: 800, whiteSpace: 'nowrap'
                    }}>
                      {kd.fromDate}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Allocation Ratios */}
            <div style={{
              background: '#ffffff',
              borderRadius: 18,
              padding: 22,
              border: '1.5px solid rgba(61, 63, 52, 0.12)',
              boxShadow: '0 4px 16px rgba(11, 43, 38, 0.03)'
            }}>
              <h4 style={{ margin: '0 0 12px', fontSize: '1rem', fontWeight: 800, color: '#1d2a24', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span>📐</span>
                <span>Annexure 1 (Section 2) — Allocation Ratios</span>
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {allocationRatios.map(ar => (
                  <div key={ar.id} style={{
                    padding: '12px 14px', borderRadius: 12, background: '#f8fafc',
                    border: '1px solid rgba(61, 63, 52, 0.08)'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                      <span style={{ fontWeight: 700, fontSize: '0.86rem', color: '#1e293b' }}>{ar.name}</span>
                      <span style={{
                        background: '#e0e7ff', color: '#3730a3', padding: '2px 8px',
                        borderRadius: 6, fontSize: '0.76rem', fontWeight: 800
                      }}>
                        {ar.ratio}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#64748b' }}>{ar.description}</div>
                    <div style={{ marginTop: 6, fontSize: '0.74rem', color: '#475569', fontWeight: 600 }}>
                      Share: Bldg A {ar.shareA} • Bldg B {ar.shareB} {ar.shareC ? `• Bldg C ${ar.shareC}` : ''}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Annexure 1 - Section 4: Summary of Year-Wise Expenses */}
          <div style={{
            background: '#ffffff',
            borderRadius: 18,
            padding: 24,
            border: '1.5px solid rgba(61, 63, 52, 0.12)',
            boxShadow: '0 4px 20px rgba(11, 43, 38, 0.04)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
              <div>
                <h3 style={{ margin: '0 0 4px', fontSize: '1.15rem', fontWeight: 800, color: '#1d2a24', fontFamily: 'Fraunces, serif' }}>
                  Annexure 1 (Section 4) — Summary of Year-Wise Expenses (Building A)
                </h3>
                <p style={{ margin: 0, fontSize: '0.82rem', color: '#5f665f' }}>
                  21 expenditure categories across Oct'19 to Jun'22 totaling ₹26,40,866 (Top 6 categories constitute &gt;85% of total expenses)
                </p>
              </div>
              <span style={{
                background: '#f1f5f9', color: '#334155', padding: '4px 10px',
                borderRadius: 8, fontSize: '0.74rem', fontWeight: 700
              }}>
                ⭐ Major 85%+ Expenses Highlighted
              </span>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem' }}>
                <thead>
                  <tr style={{ background: '#0b2b26', color: '#C49B4F' }}>
                    <th style={{ textAlign: 'left', padding: '10px 12px' }}>Nature of Expenses</th>
                    <th style={{ textAlign: 'right', padding: '10px 12px' }}>Oct'19–Dec'19</th>
                    <th style={{ textAlign: 'right', padding: '10px 12px' }}>Jan'20–Dec'20</th>
                    <th style={{ textAlign: 'right', padding: '10px 12px' }}>Jan'21–Sep'21</th>
                    <th style={{ textAlign: 'right', padding: '10px 12px' }}>Jan'22–Jun'22</th>
                    <th style={{ textAlign: 'right', padding: '10px 12px' }}>Total (₹)</th>
                    <th style={{ textAlign: 'right', padding: '10px 12px' }}>Share %</th>
                  </tr>
                </thead>
                <tbody>
                  {yearWiseExpenses.map((exp, idx) => (
                    <tr
                      key={exp.id}
                      style={{
                        background: exp.isMajor ? '#fefce8' : idx % 2 === 0 ? '#ffffff' : '#f8fafc',
                        borderBottom: '1px solid rgba(61, 63, 52, 0.08)',
                        fontWeight: exp.isMajor ? 700 : 500
                      }}
                    >
                      <td style={{ padding: '10px 12px', color: exp.isMajor ? '#854d0e' : '#1e293b' }}>
                        {exp.isMajor && <span style={{ marginRight: 6 }}>⭐</span>}
                        {exp.category}
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', fontFamily: 'monospace' }}>
                        {exp.oct19Dec19 ? fmtINR(exp.oct19Dec19) : '—'}
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', fontFamily: 'monospace' }}>
                        {exp.jan20Dec20 ? fmtINR(exp.jan20Dec20) : '—'}
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', fontFamily: 'monospace' }}>
                        {exp.jan21Sep21 ? fmtINR(exp.jan21Sep21) : '—'}
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', fontFamily: 'monospace' }}>
                        {exp.jan22Jun22 ? fmtINR(exp.jan22Jun22) : '—'}
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 800, color: '#0f172a' }}>
                        {fmtINR(exp.total)}
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', color: '#64748b', fontSize: '0.78rem' }}>
                        {exp.percentage}
                      </td>
                    </tr>
                  ))}
                  {/* Grand Total Row */}
                  <tr style={{
                    background: '#0b2b26', color: '#ffffff', fontWeight: 900,
                    borderTop: '2px solid #C49B4F'
                  }}>
                    <td style={{ padding: '12px', color: '#C49B4F' }}>Grand Total</td>
                    <td style={{ padding: '12px', textAlign: 'right', fontFamily: 'monospace' }}>{fmtINR(yearWiseGrandTotal.oct19Dec19)}</td>
                    <td style={{ padding: '12px', textAlign: 'right', fontFamily: 'monospace' }}>{fmtINR(yearWiseGrandTotal.jan20Dec20)}</td>
                    <td style={{ padding: '12px', textAlign: 'right', fontFamily: 'monospace' }}>{fmtINR(yearWiseGrandTotal.jan21Sep21)}</td>
                    <td style={{ padding: '12px', textAlign: 'right', fontFamily: 'monospace' }}>{fmtINR(yearWiseGrandTotal.jan22Jun22)}</td>
                    <td style={{ padding: '12px', textAlign: 'right', fontFamily: 'monospace', color: '#C49B4F', fontSize: '0.95rem' }}>{fmtINR(yearWiseGrandTotal.total)}</td>
                    <td style={{ padding: '12px', textAlign: 'right', color: '#C49B4F' }}>100.0%</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── SECTION 2: COMMON EXPENSES (ANNEXURE 1 - SECTION 6) ──────────────── */}
      {activeSection === 'commonExp' && (
        <div style={{
          background: '#ffffff',
          borderRadius: 18,
          padding: 24,
          border: '1.5px solid rgba(61, 63, 52, 0.12)',
          boxShadow: '0 4px 20px rgba(11, 43, 38, 0.04)'
        }}>
          <div style={{ marginBottom: 18 }}>
            <h3 style={{ margin: '0 0 4px', fontSize: '1.2rem', fontWeight: 800, color: '#1d2a24', fontFamily: 'Fraunces, serif' }}>
              Annexure 1 (Section 6) — Common Expenses Allocation to Building A
            </h3>
            <p style={{ margin: 0, fontSize: '0.84rem', color: '#5f665f' }}>
              {commonExpenses.description} Total common expenses attributable: <strong>{fmtINR(commonExpenses.total)}</strong>
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {commonExpenses.allocations.map((group, gIdx) => (
              <div key={gIdx} style={{
                borderRadius: 14, overflow: 'hidden', border: '1px solid rgba(61, 63, 52, 0.12)'
              }}>
                <div style={{
                  background: 'linear-gradient(90deg, #0b2b26 0%, #164e43 100%)',
                  color: '#ffffff', padding: '10px 16px', display: 'flex',
                  justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8
                }}>
                  <span style={{ fontWeight: 800, fontSize: '0.88rem', color: '#fef3c7' }}>
                    {group.pool}
                  </span>
                  <span style={{ background: 'rgba(196, 155, 79, 0.3)', color: '#fffaf2', padding: '2px 10px', borderRadius: 8, fontSize: '0.8rem', fontWeight: 700 }}>
                    Group Total: {fmtINR(group.total)}
                  </span>
                </div>

                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem' }}>
                    <thead>
                      <tr style={{ background: '#f8fafc', borderBottom: '1px solid rgba(61, 63, 52, 0.1)' }}>
                        <th style={{ textAlign: 'left', padding: '9px 14px', color: '#475569' }}>Expense Item</th>
                        <th style={{ textAlign: 'right', padding: '9px 14px', color: '#475569' }}>Oct'19–Dec'19</th>
                        <th style={{ textAlign: 'right', padding: '9px 14px', color: '#475569' }}>Jan'20–Dec'20</th>
                        <th style={{ textAlign: 'right', padding: '9px 14px', color: '#475569' }}>Jan'21–Sep'21</th>
                        <th style={{ textAlign: 'right', padding: '9px 14px', color: '#475569' }}>Jan'22–Jun'22</th>
                        <th style={{ textAlign: 'right', padding: '9px 14px', color: '#475569' }}>Total (₹)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {group.items.map((item, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid rgba(61, 63, 52, 0.06)', background: idx % 2 === 0 ? '#ffffff' : '#fcfcfc' }}>
                          <td style={{ padding: '9px 14px', fontWeight: 600, color: '#1e293b' }}>{item.name}</td>
                          <td style={{ padding: '9px 14px', textAlign: 'right', fontFamily: 'monospace' }}>{item.oct19Dec19 ? fmtINR(item.oct19Dec19) : '—'}</td>
                          <td style={{ padding: '9px 14px', textAlign: 'right', fontFamily: 'monospace' }}>{item.jan20Dec20 ? fmtINR(item.jan20Dec20) : '—'}</td>
                          <td style={{ padding: '9px 14px', textAlign: 'right', fontFamily: 'monospace' }}>{item.jan21Sep21 ? fmtINR(item.jan21Sep21) : '—'}</td>
                          <td style={{ padding: '9px 14px', textAlign: 'right', fontFamily: 'monospace' }}>{item.jan22Jun22 ? fmtINR(item.jan22Jun22) : '—'}</td>
                          <td style={{ padding: '9px 14px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 700, color: '#0f172a' }}>{fmtINR(item.total)}</td>
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
        <div style={{
          background: '#ffffff',
          borderRadius: 18,
          padding: 24,
          border: '1.5px solid rgba(61, 63, 52, 0.12)',
          boxShadow: '0 4px 20px rgba(11, 43, 38, 0.04)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
            <div>
              <h3 style={{ margin: '0 0 4px', fontSize: '1.2rem', fontWeight: 800, color: '#1d2a24', fontFamily: 'Fraunces, serif' }}>
                Annexure 1 (Section 7) — Year-Wise List of Vendors Providing Services
              </h3>
              <p style={{ margin: 0, fontSize: '0.84rem', color: '#5f665f' }}>
                Complete breakdown of all 20 vendors engaged by builder for Building A services totaling <strong>{fmtINR(meta.keyFigures.invoicedExpenses)}</strong>
              </p>
            </div>
            <span style={{ background: '#0b2b26', color: '#C49B4F', padding: '4px 10px', borderRadius: 8, fontSize: '0.76rem', fontWeight: 700 }}>
              20 Service Providers
            </span>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid rgba(61, 63, 52, 0.15)' }}>
                  <th style={{ textAlign: 'left', padding: '11px 14px', color: '#475569' }}>Vendor Name</th>
                  <th style={{ textAlign: 'left', padding: '11px 14px', color: '#475569' }}>Nature of Services</th>
                  <th style={{ textAlign: 'right', padding: '11px 14px', color: '#475569' }}>Oct'19–Dec'19</th>
                  <th style={{ textAlign: 'right', padding: '11px 14px', color: '#475569' }}>Jan'20–Dec'20</th>
                  <th style={{ textAlign: 'right', padding: '11px 14px', color: '#475569' }}>Jan'21–Sep'21</th>
                  <th style={{ textAlign: 'right', padding: '11px 14px', color: '#475569' }}>Jan'22–Jun'22</th>
                  <th style={{ textAlign: 'right', padding: '11px 14px', color: '#475569' }}>Total (₹)</th>
                </tr>
              </thead>
              <tbody>
                {vendors.map((v, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid rgba(61, 63, 52, 0.06)', background: idx % 2 === 0 ? '#ffffff' : '#fcfcfc' }}>
                    <td style={{ padding: '10px 14px', fontWeight: 700, color: '#1e293b' }}>{v.name}</td>
                    <td style={{ padding: '10px 14px', color: '#64748b' }}>{v.nature}</td>
                    <td style={{ padding: '10px 14px', textAlign: 'right', fontFamily: 'monospace' }}>{v.oct19Dec19 ? fmtINR(v.oct19Dec19) : '—'}</td>
                    <td style={{ padding: '10px 14px', textAlign: 'right', fontFamily: 'monospace' }}>{v.jan20Dec20 ? fmtINR(v.jan20Dec20) : '—'}</td>
                    <td style={{ padding: '10px 14px', textAlign: 'right', fontFamily: 'monospace' }}>{v.jan21Sep21 ? fmtINR(v.jan21Sep21) : '—'}</td>
                    <td style={{ padding: '10px 14px', textAlign: 'right', fontFamily: 'monospace' }}>{v.jan22Jun22 ? fmtINR(v.jan22Jun22) : '—'}</td>
                    <td style={{ padding: '10px 14px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 800, color: '#0f172a' }}>{fmtINR(v.total)}</td>
                  </tr>
                ))}
                {/* Total */}
                <tr style={{ background: '#0b2b26', color: '#ffffff', fontWeight: 900, borderTop: '2px solid #C49B4F' }}>
                  <td colSpan={2} style={{ padding: '12px 14px', color: '#C49B4F' }}>TOTAL VENDOR EXPENDITURE</td>
                  <td style={{ padding: '12px 14px', textAlign: 'right', fontFamily: 'monospace' }}>{fmtINR(yearWiseGrandTotal.oct19Dec19)}</td>
                  <td style={{ padding: '12px 14px', textAlign: 'right', fontFamily: 'monospace' }}>{fmtINR(yearWiseGrandTotal.jan20Dec20)}</td>
                  <td style={{ padding: '12px 14px', textAlign: 'right', fontFamily: 'monospace' }}>{fmtINR(yearWiseGrandTotal.jan21Sep21)}</td>
                  <td style={{ padding: '12px 14px', textAlign: 'right', fontFamily: 'monospace' }}>{fmtINR(yearWiseGrandTotal.jan22Jun22)}</td>
                  <td style={{ padding: '12px 14px', textAlign: 'right', fontFamily: 'monospace', color: '#C49B4F', fontSize: '0.95rem' }}>{fmtINR(yearWiseGrandTotal.total)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── SECTION 4: ANNEXURE 2 & NEGOTIATION SCENARIOS ─────────────────────── */}
      {activeSection === 'clarifications' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Interactive Negotiating Leverage Simulator */}
          <div style={{
            background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
            borderRadius: 20,
            padding: 24,
            color: '#ffffff',
            border: '1.5px solid rgba(196, 155, 79, 0.35)',
            boxShadow: '0 8px 30px rgba(0, 0, 0, 0.2)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16, marginBottom: 18 }}>
              <div>
                <span style={{ background: 'rgba(196, 155, 79, 0.25)', color: '#fef3c7', padding: '3px 9px', borderRadius: 6, fontSize: '0.72rem', fontWeight: 800 }}>
                  COMMITTEE STRATEGY SIMULATOR
                </span>
                <h3 style={{ margin: '6px 0 4px', fontSize: '1.3rem', fontWeight: 800, color: '#fffaf2', fontFamily: 'Fraunces, serif' }}>
                  Annexure 2 Negotiation Leverage Calculator
                </h3>
                <p style={{ margin: 0, fontSize: '0.84rem', color: '#94a3b8', maxWidth: 700 }}>
                  Test how different audit dispute outcomes affect the net recoverable amount from the builder.
                </p>
              </div>

              <div style={{
                background: 'rgba(255, 255, 255, 0.08)',
                padding: '12px 18px',
                borderRadius: 14,
                border: '1px solid rgba(196, 155, 79, 0.3)',
                textAlign: 'right'
              }}>
                <div style={{ fontSize: '0.72rem', color: '#cbd5e1', fontWeight: 600 }}>SIMULATED RECOVERABLE CLAIM</div>
                <div style={{ fontSize: '1.9rem', fontWeight: 900, color: '#fef08a', fontFamily: 'Fraunces, serif' }}>
                  {fmtINR(scenarioCalculatedTotal)}
                </div>
                <div style={{ fontSize: '0.74rem', color: scenarioCalculatedTotal >= meta.keyFigures.amountReceivable ? '#86efac' : '#fca5a5' }}>
                  {scenarioCalculatedTotal >= meta.keyFigures.amountReceivable ? `+${fmtINR(scenarioCalculatedTotal - meta.keyFigures.amountReceivable)} vs Baseline` : `${fmtINR(scenarioCalculatedTotal - meta.keyFigures.amountReceivable)} vs Baseline`}
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>
              {/* Toggle 1: Disallow Missing Invoices */}
              <label style={{
                display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(255, 255, 255, 0.05)',
                padding: '12px 14px', borderRadius: 12, cursor: 'pointer', border: scenarioDisallowMissing ? '1px solid #4ade80' : '1px solid rgba(255, 255, 255, 0.1)'
              }}>
                <input
                  type="checkbox"
                  checked={scenarioDisallowMissing}
                  onChange={e => setScenarioDisallowMissing(e.target.checked)}
                  style={{ width: 18, height: 18, accentColor: '#22c55e' }}
                />
                <div>
                  <div style={{ fontSize: '0.84rem', fontWeight: 700, color: '#f8fafc' }}>Disallow Missing Invoices (+₹4,09,211)</div>
                  <div style={{ fontSize: '0.74rem', color: '#94a3b8' }}>Reject builder expense claims without authentic vouchers</div>
                </div>
              </label>

              {/* Toggle 2: Claim GST ITC */}
              <label style={{
                display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(255, 255, 255, 0.05)',
                padding: '12px 14px', borderRadius: 12, cursor: 'pointer', border: scenarioClaimGST ? '1px solid #4ade80' : '1px solid rgba(255, 255, 255, 0.1)'
              }}>
                <input
                  type="checkbox"
                  checked={scenarioClaimGST}
                  onChange={e => setScenarioClaimGST(e.target.checked)}
                  style={{ width: 18, height: 18, accentColor: '#22c55e' }}
                />
                <div>
                  <div style={{ fontSize: '0.84rem', fontWeight: 700, color: '#f8fafc' }}>Claim GST Input Tax Credit (+₹1,39,070)</div>
                  <div style={{ fontSize: '0.74rem', color: '#94a3b8' }}>Refund ITC availed by builder on society expenditures</div>
                </div>
              </label>

              {/* Toggle 3: Supervision Charges Contest */}
              <label style={{
                display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(255, 255, 255, 0.05)',
                padding: '12px 14px', borderRadius: 12, cursor: 'pointer', border: scenarioConcedeSupervision ? '1px solid #f87171' : '1px solid rgba(255, 255, 255, 0.1)'
              }}>
                <input
                  type="checkbox"
                  checked={scenarioConcedeSupervision}
                  onChange={e => setScenarioConcedeSupervision(e.target.checked)}
                  style={{ width: 18, height: 18, accentColor: '#ef4444' }}
                />
                <div>
                  <div style={{ fontSize: '0.84rem', fontWeight: 700, color: '#f8fafc' }}>Builder Enforces Supervision (-₹2,70,000)</div>
                  <div style={{ fontSize: '0.74rem', color: '#94a3b8' }}>If developer insists on charging supervisory fees</div>
                </div>
              </label>

              {/* Toggle 4: Interest Dispute */}
              <label style={{
                display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(255, 255, 255, 0.05)',
                padding: '12px 14px', borderRadius: 12, cursor: 'pointer', border: scenarioConcedeInterest ? '1px solid #f87171' : '1px solid rgba(255, 255, 255, 0.1)'
              }}>
                <input
                  type="checkbox"
                  checked={scenarioConcedeInterest}
                  onChange={e => setScenarioConcedeInterest(e.target.checked)}
                  style={{ width: 18, height: 18, accentColor: '#ef4444' }}
                />
                <div>
                  <div style={{ fontSize: '0.84rem', fontWeight: 700, color: '#f8fafc' }}>Builder Refuses 8% Interest (-₹3,06,268)</div>
                  <div style={{ fontSize: '0.74rem', color: '#94a3b8' }}>If builder disputes delay penalty interest liability</div>
                </div>
              </label>

              {/* Toggle 5: Uncollected Maintenance Dispute */}
              <label style={{
                display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(255, 255, 255, 0.05)',
                padding: '12px 14px', borderRadius: 12, cursor: 'pointer', border: scenarioConcedeUncollectedMaint ? '1px solid #f87171' : '1px solid rgba(255, 255, 255, 0.1)'
              }}>
                <input
                  type="checkbox"
                  checked={scenarioConcedeUncollectedMaint}
                  onChange={e => setScenarioConcedeUncollectedMaint(e.target.checked)}
                  style={{ width: 18, height: 18, accentColor: '#ef4444' }}
                />
                <div>
                  <div style={{ fontSize: '0.84rem', fontWeight: 700, color: '#f8fafc' }}>Builder Deducts Uncollected Maint (-₹2,19,628)</div>
                  <div style={{ fontSize: '0.74rem', color: '#94a3b8' }}>If builder disclaims responsibility for defaulters</div>
                </div>
              </label>

              {/* Toggle 6: Commercial Shop GST */}
              <label style={{
                display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(255, 255, 255, 0.05)',
                padding: '12px 14px', borderRadius: 12, cursor: 'pointer', border: scenarioConcedeShopGST ? '1px solid #f87171' : '1px solid rgba(255, 255, 255, 0.1)'
              }}>
                <input
                  type="checkbox"
                  checked={scenarioConcedeShopGST}
                  onChange={e => setScenarioConcedeShopGST(e.target.checked)}
                  style={{ width: 18, height: 18, accentColor: '#ef4444' }}
                />
                <div>
                  <div style={{ fontSize: '0.84rem', fontWeight: 700, color: '#f8fafc' }}>Commercial Shop GST Offset (-₹43,106)</div>
                  <div style={{ fontSize: '0.74rem', color: '#94a3b8' }}>If builder proves 18% GST was paid to Government</div>
                </div>
              </label>
            </div>
          </div>

          {/* Full Detailed List of 9 Annexure 2 Items */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <h3 style={{ margin: '4px 0 0', fontSize: '1.15rem', fontWeight: 800, color: '#1d2a24', fontFamily: 'Fraunces, serif' }}>
              Annexure 2 — Detailed Examination of 9 Negotiation &amp; Clarity Points
            </h3>

            {discussionsAndClarity.map((item) => {
              const isPositive = item.impactType === 'positive';
              const isNegative = item.impactType === 'negative';

              return (
                <div key={item.itemNo} style={{
                  background: '#ffffff',
                  borderRadius: 16,
                  padding: '20px 22px',
                  border: '1.5px solid rgba(61, 63, 52, 0.12)',
                  boxShadow: '0 4px 14px rgba(11, 43, 38, 0.03)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10, marginBottom: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{
                        background: '#0b2b26', color: '#C49B4F', width: 28, height: 28,
                        borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '0.8rem', fontWeight: 800
                      }}>
                        {item.itemNo}
                      </span>
                      <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#1e293b' }}>
                        {item.topic}
                      </h4>
                    </div>

                    <span style={{
                      background: isPositive ? '#ecfdf5' : isNegative ? '#fef2f2' : '#f1f5f9',
                      color: isPositive ? '#065f46' : isNegative ? '#991b1b' : '#334155',
                      border: isPositive ? '1px solid #a7f3d0' : isNegative ? '1px solid #fecaca' : '1px solid #cbd5e1',
                      padding: '4px 12px',
                      borderRadius: 10,
                      fontWeight: 800,
                      fontSize: '0.86rem',
                      fontFamily: 'monospace'
                    }}>
                      {item.impactFormatted}
                    </span>
                  </div>

                  <p style={{ margin: '0 0 10px', fontSize: '0.85rem', color: '#475569', lineHeight: 1.55 }}>
                    {item.description}
                  </p>

                  <div style={{
                    background: '#f8fafc',
                    padding: '10px 14px',
                    borderRadius: 10,
                    borderLeft: '4px solid #C49B4F',
                    fontSize: '0.8rem',
                    color: '#1e293b',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8
                  }}>
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
        <div style={{
          background: '#ffffff',
          borderRadius: 18,
          padding: 24,
          border: '1.5px solid rgba(61, 63, 52, 0.12)',
          boxShadow: '0 4px 20px rgba(11, 43, 38, 0.04)'
        }}>
          {/* Header & Controls */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14, marginBottom: 18 }}>
            <div>
              <h3 style={{ margin: '0 0 4px', fontSize: '1.2rem', fontWeight: 800, color: '#1d2a24', fontFamily: 'Fraunces, serif' }}>
                Annexure 3 — Line by Line Items of All Expenses Spent for Building A
              </h3>
              <p style={{ margin: 0, fontSize: '0.84rem', color: '#5f665f' }}>
                Complete register of 176 vouched transactions verified by CA Hardik Mehta totaling <strong>{fmtINR(meta.keyFigures.invoicedExpenses)}</strong>
              </p>
            </div>

            <button
              onClick={handleExportInvoicesCSV}
              style={{
                background: '#0b2b26', color: '#C49B4F', border: 'none',
                padding: '8px 16px', borderRadius: 10, fontWeight: 700, fontSize: '0.82rem',
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6
              }}
            >
              <span>📥</span>
              <span>Export {filteredLineItems.length} Records</span>
            </button>
          </div>

          {/* Filters Bar */}
          <div style={{
            background: '#f8fafc', padding: 14, borderRadius: 14,
            border: '1px solid rgba(61, 63, 52, 0.1)', display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', marginBottom: 16
          }}>
            <div style={{ flex: '1 1 200px' }}>
              <input
                type="text"
                placeholder="Search vendor, nature, invoice no, month..."
                value={lineSearch}
                onChange={e => setLineSearch(e.target.value)}
                style={{
                  width: '100%', padding: '8px 12px', borderRadius: 10,
                  border: '1.5px solid rgba(61, 63, 52, 0.15)', fontSize: '0.84rem', outline: 'none'
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <select
                value={lineBasis}
                onChange={e => setLineBasis(e.target.value)}
                style={{ padding: '8px 12px', borderRadius: 10, border: '1.5px solid rgba(61, 63, 52, 0.15)', fontSize: '0.82rem', background: '#ffffff' }}
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
                style={{ padding: '8px 12px', borderRadius: 10, border: '1.5px solid rgba(61, 63, 52, 0.15)', fontSize: '0.82rem', background: '#ffffff' }}
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
                style={{ padding: '8px 12px', borderRadius: 10, border: '1.5px solid rgba(61, 63, 52, 0.15)', fontSize: '0.82rem', background: '#ffffff', maxWidth: 200 }}
              >
                {uniqueVendors.map(v => (
                  <option key={v} value={v}>{v === 'All' ? 'All Vendors (20)' : v}</option>
                ))}
              </select>
            </div>

            <div style={{ marginLeft: 'auto', fontSize: '0.8rem', color: '#475569', fontWeight: 700 }}>
              Showing {filteredLineItems.length} of 176 items • Sum: <span style={{ color: '#0b2b26', fontSize: '0.92rem' }}>{fmtINR(filteredLineItemsTotal)}</span>
            </div>
          </div>

          {/* Table */}
          <div style={{ overflowX: 'auto', maxHeight: 600 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
              <thead style={{ position: 'sticky', top: 0, zIndex: 2, background: '#0b2b26', color: '#ffffff' }}>
                <tr>
                  <th style={{ textAlign: 'center', padding: '10px 8px', width: 45 }}>#</th>
                  <th style={{ textAlign: 'left', padding: '10px 10px' }}>Basis</th>
                  <th style={{ textAlign: 'left', padding: '10px 12px' }}>Vendor Name</th>
                  <th style={{ textAlign: 'left', padding: '10px 12px' }}>Nature of Transaction</th>
                  <th style={{ textAlign: 'center', padding: '10px 10px' }}>Inv No</th>
                  <th style={{ textAlign: 'center', padding: '10px 10px' }}>Inv Date</th>
                  <th style={{ textAlign: 'center', padding: '10px 10px' }}>Voucher Date</th>
                  <th style={{ textAlign: 'right', padding: '10px 10px' }}>Doc Amt</th>
                  <th style={{ textAlign: 'right', padding: '10px 12px', color: '#C49B4F' }}>Relevant Amt</th>
                  <th style={{ textAlign: 'center', padding: '10px 8px' }}>Year</th>
                  <th style={{ textAlign: 'left', padding: '10px 10px' }}>Month</th>
                </tr>
              </thead>
              <tbody>
                {filteredLineItems.map((item, idx) => (
                  <tr
                    key={item.id}
                    style={{
                      background: idx % 2 === 0 ? '#ffffff' : '#f8fafc',
                      borderBottom: '1px solid rgba(61, 63, 52, 0.06)'
                    }}
                  >
                    <td style={{ textAlign: 'center', padding: '8px', color: '#64748b', fontSize: '0.75rem' }}>{item.id}</td>
                    <td style={{ padding: '8px 10px' }}>
                      <span style={{
                        padding: '2px 7px', borderRadius: 6, fontSize: '0.7rem', fontWeight: 700,
                        background: item.basis === 'Self' ? '#e0f2fe' : item.basis === 'Allocation AB' ? '#fef3c7' : item.basis.includes('Builder') ? '#fce7f3' : '#f3e8ff',
                        color: item.basis === 'Self' ? '#0369a1' : item.basis === 'Allocation AB' ? '#92400e' : item.basis.includes('Builder') ? '#9d174d' : '#6b21a8'
                      }}>
                        {item.basis}
                      </span>
                    </td>
                    <td style={{ padding: '8px 12px', fontWeight: 600, color: '#1e293b' }}>{item.vendor}</td>
                    <td style={{ padding: '8px 12px', color: '#475569' }}>{item.nature}</td>
                    <td style={{ textAlign: 'center', padding: '8px 10px', color: '#64748b', fontFamily: 'monospace' }}>{item.invoiceNo || '—'}</td>
                    <td style={{ textAlign: 'center', padding: '8px 10px', color: '#64748b', fontSize: '0.76rem' }}>{item.invoiceDate || '—'}</td>
                    <td style={{ textAlign: 'center', padding: '8px 10px', color: '#475569', fontSize: '0.76rem' }}>{item.pmtVoucherDate || '—'}</td>
                    <td style={{ textAlign: 'right', padding: '8px 10px', color: '#64748b', fontFamily: 'monospace' }}>
                      {item.docAmt !== null ? fmtINR(item.docAmt) : '—'}
                    </td>
                    <td style={{ textAlign: 'right', padding: '8px 12px', fontWeight: 800, color: item.relevantAmt > 0 ? '#0f172a' : '#94a3b8', fontFamily: 'monospace' }}>
                      {fmtINR(item.relevantAmt)}
                    </td>
                    <td style={{ textAlign: 'center', padding: '8px', color: '#475569', fontWeight: 600 }}>{item.year}</td>
                    <td style={{ padding: '8px 10px', color: '#64748b', fontSize: '0.75rem' }}>{item.month || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── SECTION 6: ANNEXURE 4 MISSING INVOICES AUDIT (₹4,09,211) ─────────── */}
      {activeSection === 'missingInvoices' && (
        <div style={{
          background: '#ffffff',
          borderRadius: 18,
          padding: 24,
          border: '1.5px solid rgba(61, 63, 52, 0.12)',
          boxShadow: '0 4px 20px rgba(11, 43, 38, 0.04)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14, marginBottom: 18 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <span style={{ fontSize: '1.1rem' }}>⚠️</span>
                <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#b91c1c', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  AUDIT EXCEPTION LIST
                </span>
              </div>
              <h3 style={{ margin: '0 0 4px', fontSize: '1.2rem', fontWeight: 800, color: '#1d2a24', fontFamily: 'Fraunces, serif' }}>
                Annexure 4 — List of Missing Invoices Considered on Estimated Basis
              </h3>
              <p style={{ margin: 0, fontSize: '0.84rem', color: '#5f665f' }}>
                Total 23 items amounting to <strong>{fmtINR(missingInvoices.total)}</strong> factored into builder expenditure. If excluded, society recovery increases by ₹4,09,211!
              </p>
            </div>

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {onOpenBOMAnalytics && (
                <button
                  onClick={onOpenBOMAnalytics}
                  style={{
                    background: '#062b24', color: '#ffffff', border: '1px solid rgba(196, 155, 79, 0.4)',
                    padding: '9px 16px', borderRadius: 10, fontWeight: 700, fontSize: '0.82rem',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
                    boxShadow: '0 4px 12px rgba(6, 43, 36, 0.2)'
                  }}
                >
                  <span>🔬</span>
                  <span>Cross-Analyze with BOM Passbook (135 Txs)</span>
                </button>
              )}
              <button
                onClick={handleExportMissingCSV}
                style={{
                  background: '#b91c1c', color: '#ffffff', border: 'none',
                  padding: '9px 18px', borderRadius: 10, fontWeight: 700, fontSize: '0.82rem',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
                  boxShadow: '0 4px 12px rgba(185, 28, 28, 0.2)'
                }}
              >
                <span>📥</span>
                <span>Export Missing Invoices (CSV)</span>
              </button>
            </div>
          </div>

          {/* Filters */}
          <div style={{
            background: '#fef2f2', padding: 14, borderRadius: 14, border: '1px solid #fecaca',
            display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', marginBottom: 18
          }}>
            <div style={{ flex: '1 1 200px' }}>
              <input
                type="text"
                placeholder="Search vendor, nature, year..."
                value={missingSearch}
                onChange={e => setMissingSearch(e.target.value)}
                style={{
                  width: '100%', padding: '8px 12px', borderRadius: 10,
                  border: '1.5px solid rgba(185, 28, 28, 0.2)', fontSize: '0.84rem', outline: 'none'
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => setMissingCategory('All')}
                style={{
                  padding: '6px 14px', borderRadius: 8, border: 'none', cursor: 'pointer',
                  background: missingCategory === 'All' ? '#991b1b' : '#ffffff',
                  color: missingCategory === 'All' ? '#ffffff' : '#475569',
                  fontWeight: 700, fontSize: '0.78rem'
                }}
              >
                All (₹4.09L)
              </button>
              <button
                onClick={() => setMissingCategory('bldgB')}
                style={{
                  padding: '6px 14px', borderRadius: 8, border: 'none', cursor: 'pointer',
                  background: missingCategory === 'bldgB' ? '#991b1b' : '#ffffff',
                  color: missingCategory === 'bldgB' ? '#ffffff' : '#475569',
                  fontWeight: 700, fontSize: '0.78rem'
                }}
              >
                Bldg B Records Only (₹1.73L)
              </button>
              <button
                onClick={() => setMissingCategory('recurring')}
                style={{
                  padding: '6px 14px', borderRadius: 8, border: 'none', cursor: 'pointer',
                  background: missingCategory === 'recurring' ? '#991b1b' : '#ffffff',
                  color: missingCategory === 'recurring' ? '#ffffff' : '#475569',
                  fontWeight: 700, fontSize: '0.78rem'
                }}
              >
                Recurring Estimates (₹2.36L)
              </button>
            </div>

            <div style={{ marginLeft: 'auto', fontWeight: 800, fontSize: '0.85rem', color: '#991b1b' }}>
              Subtotal: {fmtINR(filteredMissingTotal)}
            </div>
          </div>

          {/* Category I Table: Invoices found in Bldg B assignment */}
          {(missingCategory === 'All' || missingCategory === 'bldgB') && (
            <div style={{ marginBottom: 24 }}>
              <div style={{
                background: '#fff1f2', padding: '10px 16px', borderRadius: '10px 10px 0 0',
                border: '1px solid #fecdd3', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
              }}>
                <span style={{ fontWeight: 800, fontSize: '0.86rem', color: '#9f1239' }}>
                  I) Invoices found during Building B assignment but missing in Building A records
                </span>
                <span style={{ background: '#be123c', color: '#ffffff', padding: '2px 8px', borderRadius: 6, fontSize: '0.76rem', fontWeight: 700 }}>
                  Subtotal: {fmtINR(missingInvoices.subtotalBldgBFound)}
                </span>
              </div>

              <div style={{ overflowX: 'auto', border: '1px solid #fecdd3', borderTop: 'none', borderRadius: '0 0 10px 10px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                  <thead>
                    <tr style={{ background: '#fdf2f8', borderBottom: '1px solid #fecdd3' }}>
                      <th style={{ textAlign: 'left', padding: '8px 12px' }}>Vendor</th>
                      <th style={{ textAlign: 'left', padding: '8px 12px' }}>Nature of Transaction</th>
                      <th style={{ textAlign: 'center', padding: '8px 10px' }}>Inv Date</th>
                      <th style={{ textAlign: 'center', padding: '8px 10px' }}>Voucher Date</th>
                      <th style={{ textAlign: 'right', padding: '8px 12px' }}>Doc Exp</th>
                      <th style={{ textAlign: 'right', padding: '8px 12px', color: '#9f1239' }}>Allocated Amount</th>
                      <th style={{ textAlign: 'center', padding: '8px' }}>Year</th>
                      <th style={{ textAlign: 'left', padding: '8px 12px' }}>Month</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredMissingBldgB.map(i => (
                      <tr key={i.id} style={{ borderBottom: '1px solid rgba(61, 63, 52, 0.06)' }}>
                        <td style={{ padding: '8px 12px', fontWeight: 700, color: '#1e293b' }}>{i.vendor}</td>
                        <td style={{ padding: '8px 12px', color: '#475569' }}>{i.nature}</td>
                        <td style={{ textAlign: 'center', padding: '8px 10px', color: '#64748b' }}>{i.invoiceDate || '—'}</td>
                        <td style={{ textAlign: 'center', padding: '8px 10px', color: '#64748b' }}>{i.pmtVoucherDate || '—'}</td>
                        <td style={{ textAlign: 'right', padding: '8px 12px', fontFamily: 'monospace' }}>{fmtINR(i.docAmt)}</td>
                        <td style={{ textAlign: 'right', padding: '8px 12px', fontFamily: 'monospace', fontWeight: 800, color: '#9f1239' }}>{fmtINR(i.allocatedAmt)}</td>
                        <td style={{ textAlign: 'center', padding: '8px', fontWeight: 600 }}>{i.year}</td>
                        <td style={{ padding: '8px 12px', color: '#64748b' }}>{i.month || '—'}</td>
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
              <div style={{
                background: '#fffbeb', padding: '10px 16px', borderRadius: '10px 10px 0 0',
                border: '1px solid #fde68a', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
              }}>
                <span style={{ fontWeight: 800, fontSize: '0.86rem', color: '#92400e' }}>
                  II) Recurring periodic services assumed missing without invoices (Electricity, Lift, Water, Cleaning)
                </span>
                <span style={{ background: '#b45309', color: '#ffffff', padding: '2px 8px', borderRadius: 6, fontSize: '0.76rem', fontWeight: 700 }}>
                  Subtotal: {fmtINR(missingInvoices.subtotalRecurringEstimated)}
                </span>
              </div>

              <div style={{ overflowX: 'auto', border: '1px solid #fde68a', borderTop: 'none', borderRadius: '0 0 10px 10px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                  <thead>
                    <tr style={{ background: '#fefce8', borderBottom: '1px solid #fde68a' }}>
                      <th style={{ textAlign: 'left', padding: '8px 12px' }}>Vendor</th>
                      <th style={{ textAlign: 'left', padding: '8px 12px' }}>Nature of Transaction</th>
                      <th style={{ textAlign: 'right', padding: '8px 14px', color: '#92400e' }}>Estimated Amount</th>
                      <th style={{ textAlign: 'center', padding: '8px 10px' }}>Year</th>
                      <th style={{ textAlign: 'left', padding: '8px 14px' }}>Applicable Month(s)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredMissingRecurring.map(i => (
                      <tr key={i.id} style={{ borderBottom: '1px solid rgba(61, 63, 52, 0.06)' }}>
                        <td style={{ padding: '8px 12px', fontWeight: 700, color: '#1e293b' }}>{i.vendor}</td>
                        <td style={{ padding: '8px 12px', color: '#475569' }}>{i.nature}</td>
                        <td style={{ textAlign: 'right', padding: '8px 14px', fontFamily: 'monospace', fontWeight: 800, color: '#b45309' }}>{fmtINR(i.estimatedAmt)}</td>
                        <td style={{ textAlign: 'center', padding: '8px 10px', fontWeight: 600 }}>{i.year}</td>
                        <td style={{ padding: '8px 14px', color: '#64748b' }}>{i.month}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div style={{
            marginTop: 20, padding: 14, borderRadius: 12, background: '#f8fafc',
            border: '1px solid rgba(61, 63, 52, 0.1)', fontSize: '0.82rem', color: '#475569', lineHeight: 1.5
          }}>
            <strong>⚖️ Negotiation Guidance:</strong> As stated in CA Hardik Mehta's report, this entire amount of <strong>₹4,09,211</strong> was factored in the working as builder expenditure on the assumption that services were recurring. The society is entitled to require the builder to provide authentic bank debit vouchers or vendor receipts. Any failure by the builder to prove these debits increases the society's recoverable claim from <strong>₹12,07,058</strong> up to <strong>₹16,16,269</strong>!
          </div>
        </div>
      )}

    </div>
  );
}
