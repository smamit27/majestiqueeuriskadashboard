import React, { useState, useMemo, useCallback } from 'react';
import { collection, addDoc, updateDoc, doc } from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../../firebase.js';
import { useCollection } from '../../hooks/useCollection.js';
import { fixedDeposits as mockFixedDeposits } from '../../data/mockData.js';

const SUMMARY_BANK_ORDER = ['HDFC Bank', 'ICICI Bank'];

const DEFAULT_SUMMARY_THEME = {
  variant: 'generic',
  border: '#274978',
  head: '#173a6d',
  soft: '#edf4fc',
  softAlt: '#f8fbff',
  totalBg: '#d8e5f6',
  totalColor: '#173a6d',
  accountLabel: 'FD No.'
};

const SUMMARY_BANK_THEMES = {
  'HDFC Bank': {
    variant: 'hdfc',
    border: '#1b3f8b',
    head: '#0f357a',
    soft: '#e9f1fb',
    softAlt: '#f6faff',
    totalBg: '#d9e6f7',
    totalColor: '#0d2b71',
    accountLabel: 'Account No. / FD No.'
  },
  'ICICI Bank': {
    variant: 'icici',
    border: '#cd5a1e',
    head: '#d85d05',
    soft: '#fff1e8',
    softAlt: '#fff8f2',
    totalBg: '#ffe0cb',
    totalColor: '#c54c0c',
    accountLabel: 'FD No.'
  }
};

const summaryNumberFormatter = new Intl.NumberFormat('en-IN', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});

function formatSummaryAmount(value) {
  return summaryNumberFormatter.format(value || 0);
}

function buildSummaryTitle(bankNames) {
  if (!bankNames.length) {
    return 'Fixed Deposit Summary';
  }

  const shortNames = bankNames.map((bankName) => bankName.replace(/\s+Bank$/i, ''));

  if (shortNames.length === 2 && shortNames.includes('HDFC') && shortNames.includes('ICICI')) {
    return 'Fixed Deposit Summary - HDFC & ICICI Bank';
  }

  if (shortNames.length === 1) {
    return `Fixed Deposit Summary - ${bankNames[0]}`;
  }

  return `Fixed Deposit Summary - ${shortNames.join(' & ')}`;
}

function renderSummaryBrand(bankName, variant) {
  if (variant === 'hdfc') {
    return (
      <div className="fd-summary-brand fd-summary-brand--hdfc">
        <span className="fd-summary-brand__hdfc-mark" aria-hidden="true" />
        <span className="fd-summary-brand__hdfc-wordmark">HDFC BANK</span>
      </div>
    );
  }

  if (variant === 'icici') {
    return (
      <div className="fd-summary-brand fd-summary-brand--icici">
        <span className="fd-summary-brand__icici-mark" aria-hidden="true">i</span>
        <span className="fd-summary-brand__icici-wordmark">ICICI Bank</span>
      </div>
    );
  }

  return (
    <div className="fd-summary-brand fd-summary-brand--generic">
      <span className="fd-summary-brand__generic-wordmark">{bankName}</span>
    </div>
  );
}

export default function FixedDepositTracker({ isAdmin }) {
  // ── Password Gate ──────────────────────────────────────────────────
  const [fdPassword, setFdPassword] = useState('');
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [fdErrorMsg, setFdErrorMsg] = useState('');

  const handleFdUnlock = (e) => {
    e.preventDefault();
    if (fdPassword === '$05CeLRO') {
      setIsUnlocked(true);
      setFdErrorMsg('');
    } else {
      setFdErrorMsg('Incorrect Password. Access Denied.');
    }
  };

  const [activeSubTab, setActiveSubTab] = useState('summary'); // 'summary' | 'active' | 'history' | 'calculator'
  const [searchQuery, setSearchQuery] = useState('');
  const [bankFilter, setBankFilter] = useState('All');
  const [fundFilter, setFundFilter] = useState('All');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Form states for creating FD
  const [bankName, setBankName] = useState('HDFC Bank');
  const [customBankName, setCustomBankName] = useState('');
  const [fdNumber, setFdNumber] = useState('');
  const [depositName, setDepositName] = useState('');
  const [principal, setPrincipal] = useState('');
  const [interestRate, setInterestRate] = useState('');
  const [tenureMonths, setTenureMonths] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [fundType, setFundType] = useState('Sinking Fund');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  // States for breaking FD
  const [breakingFd, setBreakingFd] = useState(null); // FD object
  const [brokenDate, setBrokenDate] = useState(new Date().toISOString().split('T')[0]);
  const [brokenAmount, setBrokenAmount] = useState('');
  const [breakNotes, setBreakNotes] = useState('');

  // Accrued Interest Simulator states
  const [calcPrincipal, setCalcPrincipal] = useState('500000');
  const [calcRate, setCalcRate] = useState('7.25');
  const [calcTenure, setCalcTenure] = useState('12');
  const [calcCompounding, setCalcCompounding] = useState('4'); // 4 = Quarterly, 12 = Monthly, 1 = Yearly

  // Fetch FD records using custom hook
  const { items: rawFds, source, error: syncError } = useCollection('fixedDeposits', mockFixedDeposits);

  const fdsList = useMemo(() => {
    return Array.isArray(rawFds) ? rawFds : [];
  }, [rawFds]);

  // Format currencies in Indian Rupees
  const fmtAmt = (val) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(val || 0);
  };

  const fmtDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    try {
      return new Intl.DateTimeFormat('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      }).format(new Date(dateStr));
    } catch {
      return dateStr;
    }
  };

  // Quarterly compound maturity formula: A = P * (1 + r/400) ^ (4 * t)
  const calculateMaturity = (p, r, m) => {
    const principalNum = parseFloat(p) || 0;
    const rateNum = parseFloat(r) || 0;
    const monthsNum = parseFloat(m) || 0;
    if (principalNum <= 0 || rateNum <= 0 || monthsNum <= 0) return 0;
    
    const years = monthsNum / 12;
    const value = principalNum * Math.pow(1 + (rateNum / 400), 4 * years);
    return Math.round(value);
  };

  // Accrued interest on active FDs based on elapsed time vs maturity value
  const getElapsedProgress = (start, end) => {
    const sDate = new Date(start);
    const eDate = new Date(end);
    const tDate = new Date();
    
    if (tDate <= sDate) return 0;
    if (tDate >= eDate) return 100;
    
    const totalTime = eDate.getTime() - sDate.getTime();
    const elapsed = tDate.getTime() - sDate.getTime();
    return Math.min(100, Math.max(0, Math.round((elapsed / totalTime) * 100)));
  };

  // Split into active and history
  const activeFds = useMemo(() => fdsList.filter(f => f.status === 'Active'), [fdsList]);
  const historyFds = useMemo(() => fdsList.filter(f => f.status === 'Matured' || f.status === 'Broken'), [fdsList]);

  // Aggregates
  const stats = useMemo(() => {
    let totalActivePrincipal = 0;
    let totalActiveMaturity = 0;
    let totalRealizedInterest = 0;
    
    activeFds.forEach(f => {
      totalActivePrincipal += (f.principal || 0);
      totalActiveMaturity += (f.maturityValue || 0);
    });

    historyFds.forEach(f => {
      if (f.status === 'Broken') {
        totalRealizedInterest += Math.max(0, (f.brokenAmount || 0) - (f.principal || 0));
      } else if (f.status === 'Matured') {
        totalRealizedInterest += Math.max(0, (f.maturityValue || 0) - (f.principal || 0));
      }
    });

    return {
      activePrincipal: totalActivePrincipal,
      activeMaturityValue: totalActiveMaturity,
      realizedInterest: totalRealizedInterest,
      activeCount: activeFds.length,
      historyCount: historyFds.length
    };
  }, [activeFds, historyFds]);

  const summaryData = useMemo(() => {
    const summaryFds = activeFds.filter((fd) => fd?.bankName);
    const allBanks = [...new Set(summaryFds.map((fd) => fd.bankName))];
    const orderedBanks = [
      ...SUMMARY_BANK_ORDER.filter((bankName) => allBanks.includes(bankName)),
      ...allBanks.filter((bankName) => !SUMMARY_BANK_ORDER.includes(bankName))
    ];

    const banks = orderedBanks.map((bankName) => {
      const deposits = summaryFds.filter((fd) => fd.bankName === bankName);
      const principalTotal = deposits.reduce((sum, fd) => sum + (fd.principal || 0), 0);
      const maturityTotal = deposits.reduce((sum, fd) => sum + (fd.maturityValue || 0), 0);
      const theme = SUMMARY_BANK_THEMES[bankName] || DEFAULT_SUMMARY_THEME;
      const totalLabel = `${bankName.replace(/\s+Bank$/i, '').toUpperCase()} TOTAL`;

      return {
        bankName,
        deposits,
        principalTotal,
        maturityTotal,
        totalLabel,
        theme
      };
    });

    const grandPrincipal = summaryFds.reduce((sum, fd) => sum + (fd.principal || 0), 0);
    const grandMaturity = summaryFds.reduce((sum, fd) => sum + (fd.maturityValue || 0), 0);

    return {
      title: buildSummaryTitle(orderedBanks),
      banks,
      grandLabel: orderedBanks.map((bankName) => bankName.replace(/\s+Bank$/i, '').toUpperCase()).join(' + '),
      grandPrincipal,
      grandMaturity,
      grandInterest: grandMaturity - grandPrincipal
    };
  }, [activeFds]);

  // Filtered active FDs for ledger view
  const filteredActiveFds = useMemo(() => {
    return activeFds.filter(fd => {
      const matchQuery = !searchQuery || 
        (fd.fdNumber || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (fd.bankName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (fd.depositName || fd.depositLine1 || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (fd.fundType || '').toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchBank = bankFilter === 'All' || fd.bankName === bankFilter;
      const matchFund = fundFilter === 'All' || fd.fundType === fundFilter;

      return matchQuery && matchBank && matchFund;
    });
  }, [activeFds, searchQuery, bankFilter, fundFilter]);

  // Compute Maturity Date dynamically for the form
  const computedMaturityDate = useMemo(() => {
    if (!startDate || !tenureMonths) return '';
    try {
      const start = new Date(startDate);
      start.setMonth(start.getMonth() + parseInt(tenureMonths));
      return start.toISOString().split('T')[0];
    } catch {
      return '';
    }
  }, [startDate, tenureMonths]);

  // Compute Maturity Value dynamically for the form
  const computedMaturityValue = useMemo(() => {
    return calculateMaturity(principal, interestRate, tenureMonths);
  }, [principal, interestRate, tenureMonths]);

  // Handle Make FD submit
  const handleMakeFdSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');

    const finalBank = bankName === 'Other' ? customBankName : bankName;
    if (!finalBank) {
      setFormError('Please enter a bank name.');
      return;
    }
    if (!fdNumber || !principal || !interestRate || !tenureMonths || !startDate) {
      setFormError('Please fill out all required fields.');
      return;
    }

    setIsSubmitting(true);
    const newFd = {
      fdNumber,
      bankName: finalBank,
      depositName: depositName || `MAJESTIQUE EURISKA - ${fundType.toUpperCase()}`,
      depositLine1: depositName || `MAJESTIQUE EURISKA A BLDG`,
      depositLine2: fundType.toUpperCase(),
      principal: parseFloat(principal),
      interestRate: parseFloat(interestRate),
      tenureMonths: parseInt(tenureMonths),
      startDate,
      maturityDate: computedMaturityDate,
      maturityValue: computedMaturityValue,
      fundType,
      status: 'Active',
      notes: notes || 'FD created',
      createdAt: new Date().toISOString()
    };

    try {
      if (isFirebaseConfigured && db) {
        await addDoc(collection(db, 'fixedDeposits'), newFd);
      } else {
        mockFixedDeposits.unshift({
          id: 'FD-' + Date.now(),
          ...newFd
        });
      }

      setFormSuccess(`Fixed Deposit for ${fmtAmt(principal)} has been successfully created!`);
      setFdNumber('');
      setDepositName('');
      setPrincipal('');
      setInterestRate('');
      setTenureMonths('');
      setNotes('');
      setTimeout(() => {
        setIsCreateModalOpen(false);
        setActiveSubTab('active');
        setFormSuccess('');
      }, 1200);
    } catch (err) {
      console.error(err);
      setFormError('Failed to save Fixed Deposit record.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Premature Break Submit
  const handleBreakSubmit = async (e) => {
    e.preventDefault();
    if (!breakingFd || !brokenDate || !brokenAmount) return;

    try {
      const updatePayload = {
        status: 'Broken',
        brokenDate,
        brokenAmount: parseFloat(brokenAmount),
        notes: (breakingFd.notes || '') + ` | Broken prematurely on ${brokenDate} for proceeds of ${fmtAmt(brokenAmount)}.`
      };

      if (isFirebaseConfigured && db) {
        await updateDoc(doc(db, 'fixedDeposits', breakingFd.id), updatePayload);
      } else {
        const index = mockFixedDeposits.findIndex(x => x.id === breakingFd.id);
        if (index !== -1) {
          mockFixedDeposits[index] = { ...mockFixedDeposits[index], ...updatePayload };
        }
      }

      setBreakingFd(null);
      setBrokenAmount('');
      setBreakNotes('');
    } catch (err) {
      alert('Error updating Fixed Deposit: ' + err.message);
    }
  };

  // Handle Mark Matured
  const handleMarkMatured = async (fd) => {
    if (!window.confirm(`Are you sure you want to mark FD ${fd.fdNumber} as matured? This will reflect interest proceeds in society's account.`)) return;

    try {
      const updatePayload = {
        status: 'Matured'
      };

      if (isFirebaseConfigured && db) {
        await updateDoc(doc(db, 'fixedDeposits', fd.id), updatePayload);
      } else {
        const index = mockFixedDeposits.findIndex(x => x.id === fd.id);
        if (index !== -1) {
          mockFixedDeposits[index] = { ...mockFixedDeposits[index], ...updatePayload };
        }
      }
    } catch (err) {
      alert('Error marking FD matured: ' + err.message);
    }
  };

  // Standalone Simulator calculation
  const calculatedSimValue = useMemo(() => {
    const p = parseFloat(calcPrincipal) || 0;
    const r = parseFloat(calcRate) || 0;
    const m = parseFloat(calcTenure) || 0;
    const compFreq = parseInt(calcCompounding) || 4;

    if (p <= 0 || r <= 0 || m <= 0) return { maturity: 0, interest: 0 };

    const years = m / 12;
    const value = p * Math.pow(1 + (r / (compFreq * 100)), compFreq * years);
    const maturity = Math.round(value);
    const interest = maturity - p;
    return { maturity, interest };
  }, [calcPrincipal, calcRate, calcTenure, calcCompounding]);

  // ── Export CSV ─────────────────────────────────────────────────────────────
  const handleExportCSV = useCallback(() => {
    const listToExport = activeSubTab === 'history' ? historyFds : activeFds;
    const headers = 'FD Number,Bank Name,Deposit Name,Fund Type,Principal Amount,Interest Rate %,Tenure Months,Start Date,Maturity Date,Maturity Value,Status,Notes\n';
    const rows = listToExport.map(f => {
      const num = (f.fdNumber || '').replace(/"/g, '""');
      const bank = (f.bankName || '').replace(/"/g, '""');
      const name = (f.depositName || f.depositLine1 || '').replace(/"/g, '""');
      const fund = (f.fundType || '').replace(/"/g, '""');
      const notesStr = (f.notes || '').replace(/"/g, '""');
      return `"${num}","${bank}","${name}","${fund}","${f.principal || 0}","${f.interestRate || 0}","${f.tenureMonths || ''}","${f.startDate || ''}","${f.maturityDate || ''}","${f.maturityValue || ''}","${f.status}","${notesStr}"`;
    }).join('\n');

    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', `Majestique_Euriska_Fixed_Deposits_${activeSubTab}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [activeFds, historyFds, activeSubTab]);

  // ── Print PDF Report ───────────────────────────────────────────────────────
  const handlePrintPDF = useCallback(() => {
    const generatedDate = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    const totalExpectedGain = summaryData.grandInterest;

    const printDoc = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="utf-8">
        <title>Fixed Deposit Treasury Statement - Majestique Euriska</title>
        <style>
          * { box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
          body { margin: 0; padding: 24px; color: #0f172a; background: #ffffff; }
          .header { border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: flex-end; }
          .title { font-size: 19px; font-weight: 800; color: #0f172a; margin: 0; }
          .subtitle { font-size: 13px; color: #475569; margin-top: 4px; }
          .meta { font-size: 11px; color: #475569; text-align: right; }
          
          .kpi-row {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 12px;
            margin-bottom: 16px;
          }
          .kpi-card {
            background: #f8fafc;
            border: 1px solid #cbd5e1;
            border-radius: 8px;
            padding: 10px 14px;
            text-align: center;
          }
          .kpi-label { font-size: 10px; text-transform: uppercase; color: #64748b; font-weight: 700; }
          .kpi-value { font-size: 16px; font-weight: 800; color: #0f172a; margin-top: 2px; }

          .bank-heading {
            font-size: 13px;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            color: #1e3a8a;
            margin: 18px 0 8px 0;
            display: flex;
            justify-content: space-between;
            border-bottom: 1.5px solid #cbd5e1;
            padding-bottom: 4px;
          }
          
          table { width: 100%; border-collapse: collapse; font-size: 11px; margin-bottom: 14px; }
          th { background: #f1f5f9; color: #1e293b; font-weight: 700; text-align: right; padding: 7px 8px; border: 1px solid #94a3b8; font-size: 10px; }
          th:first-child, th:nth-child(2), th:nth-child(3) { text-align: left; }
          td { padding: 6px 8px; border: 1px solid #cbd5e1; color: #0f172a; text-align: right; }
          td:first-child, td:nth-child(2), td:nth-child(3) { text-align: left; }
          tr:nth-child(even) { background: #f8fafc; }
          .subtotal-row { background: #e2e8f0 !important; font-weight: 700; color: #0f172a; }
          .grand-table { margin-top: 10px; border: 2px solid #0f172a; }

          .signatures { margin-top: 36px; display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; padding-top: 14px; border-top: 1px dashed #cbd5e1; }
          .sig-box { text-align: center; font-size: 11px; color: #475569; }
          .sig-line { margin-top: 36px; border-top: 1px solid #94a3b8; padding-top: 4px; font-weight: 600; }

          .footer {
            margin-top: 20px;
            border-top: 1px solid #cbd5e1;
            padding-top: 8px;
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
            <h1 class="title">🏦 MAJESTIQUE EURISKA CO-OP HOUSING SOCIETY</h1>
            <div class="subtitle">Fixed Deposit Treasury Valuation &amp; Sinking Fund Portfolio Statement</div>
          </div>
          <div class="meta">
            <div><strong>Statement Date:</strong> ${generatedDate}</div>
            <div><strong>Active Deposits:</strong> ${activeFds.length} Accounts</div>
          </div>
        </div>

        <div class="kpi-row">
          <div class="kpi-card">
            <div class="kpi-label">Total Active Principal</div>
            <div class="kpi-value" style="color: #0369a1;">₹${formatSummaryAmount(summaryData.grandPrincipal)}</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">Expected Maturity Value</div>
            <div class="kpi-value" style="color: #d97706;">₹${formatSummaryAmount(summaryData.grandMaturity)}</div>
          </div>
          <div class="kpi-card" style="background: #f0fdf4; border-color: #86efac;">
            <div class="kpi-label" style="color: #15803d;">Total Expected Interest Gains</div>
            <div class="kpi-value" style="color: #15803d;">₹${formatSummaryAmount(totalExpectedGain)}</div>
          </div>
        </div>

        ${summaryData.banks.map((bank) => `
          <div class="bank-heading">
            <span>${bank.bankName} Fixed Deposits</span>
            <span style="font-size: 11px; font-weight: normal; color: #475569;">Total Principal: ₹${formatSummaryAmount(bank.principalTotal)}</span>
          </div>
          <table>
            <thead>
              <tr>
                <th style="width: 35px; text-align: center;">#</th>
                <th style="width: 140px;">FD / Account No.</th>
                <th>Deposit Purpose / Account Title</th>
                <th style="width: 130px;">Principal (₹)</th>
                <th style="width: 75px; text-align: center;">ROI (% p.a.)</th>
                <th style="width: 70px; text-align: center;">Tenure</th>
                <th style="width: 90px; text-align: center;">Maturity Date</th>
                <th style="width: 140px;">Maturity Value (₹)</th>
              </tr>
            </thead>
            <tbody>
              ${bank.deposits.map((fd, i) => `
                <tr>
                  <td style="text-align: center; color: #64748b;">${i + 1}</td>
                  <td style="font-weight: 700; font-family: monospace;">${fd.fdNumber}</td>
                  <td>
                    <strong>${fd.depositLine1 || fd.depositName || fd.bankName}</strong>
                    ${fd.depositLine2 ? `<div style="font-size: 9px; color: #64748b;">${fd.depositLine2}</div>` : ''}
                  </td>
                  <td style="font-weight: 600;">₹${formatSummaryAmount(fd.principal)}</td>
                  <td style="text-align: center;">${fd.interestRate}%</td>
                  <td style="text-align: center;">${fd.tenureMonths ? `${fd.tenureMonths} M` : '—'}</td>
                  <td style="text-align: center;">${fmtDate(fd.maturityDate)}</td>
                  <td style="font-weight: 700; color: #15803d;">₹${formatSummaryAmount(fd.maturityValue)}</td>
                </tr>
              `).join('')}
              <tr class="subtotal-row">
                <td colspan="3" style="text-align: left;">${bank.totalLabel}</td>
                <td>₹${formatSummaryAmount(bank.principalTotal)}</td>
                <td colspan="3" style="text-align: center;">—</td>
                <td style="color: #15803d;">₹${formatSummaryAmount(bank.maturityTotal)}</td>
              </tr>
            </tbody>
          </table>
        `).join('')}

        <table class="grand-table">
          <tbody>
            <tr style="background: #0f172a; color: #ffffff; font-weight: 800; font-size: 12px;">
              <td colspan="3" style="text-align: left; padding: 10px; color: #ffffff;">GRAND TOTAL PORTFOLIO (${summaryData.grandLabel})</td>
              <td style="padding: 10px; color: #ffffff;">₹${formatSummaryAmount(summaryData.grandPrincipal)}</td>
              <td colspan="3" style="text-align: center; color: #94a3b8;">—</td>
              <td style="padding: 10px; color: #4ade80; font-size: 13px;">₹${formatSummaryAmount(summaryData.grandMaturity)}</td>
            </tr>
          </tbody>
        </table>

        <div class="signatures">
          <div class="sig-box">
            <div class="sig-line">Society Secretary</div>
          </div>
          <div class="sig-box">
            <div class="sig-line">Society Treasurer</div>
          </div>
          <div class="sig-box">
            <div class="sig-line">Society Chairman</div>
          </div>
        </div>

        <div class="footer">
          <div>Majestique Euriska Co-Op Housing Society Ltd. • Treasury & Reserve Fund Management</div>
          <div>Confidential Document • Page 1 of 1</div>
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
      printWindow.document.write(printDoc);
      printWindow.document.close();
    }
  }, [summaryData, activeFds]);

  // ── Lock Screen Guard ───────────────────────────────────────────────
  if (!isUnlocked) {
    return (
      <div className="section-card" style={{ maxWidth: '480px', margin: '40px auto', padding: '32px' }}>
        <h3 className="section-card__title" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span>🔒</span> Confidential Fixed Deposits
        </h3>
        <p style={{ color: 'var(--muted)', fontSize: '0.95rem', marginBottom: '24px' }}>
          This section contains confidential Fixed Deposit records and FD management tools. Please enter the authorization password to proceed.
        </p>
        <form onSubmit={handleFdUnlock}>
          <div style={{ marginBottom: '20px' }}>
            <label htmlFor="fd-password-input" style={{ display: 'block', marginBottom: '8px', fontWeight: '500', fontSize: '0.9rem' }}>
              Authorization Password
            </label>
            <input
              id="fd-password-input"
              type="password"
              placeholder="Enter password..."
              value={fdPassword}
              onChange={(e) => setFdPassword(e.target.value)}
              style={{
                width: '100%',
                padding: '12px 16px',
                borderRadius: '8px',
                border: '1px solid var(--line)',
                background: 'rgba(255,255,255,0.5)',
                outline: 'none'
              }}
            />
          </div>
          {fdErrorMsg && (
            <p style={{ color: 'var(--coral)', fontSize: '0.85rem', marginBottom: '16px', fontWeight: '500' }}>
              ⚠️ {fdErrorMsg}
            </p>
          )}
          <button
            type="submit"
            className="action-btn"
            style={{ width: '100%', display: 'flex', justifyContent: 'center', background: 'var(--teal)', color: 'white' }}
          >
            Unlock FD Workspace
          </button>
        </form>
      </div>
    );
  }

  let fdSummarySerial = 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, fontFamily: 'Inter, system-ui, sans-serif' }}>
      
      {/* HERO BANNER (matching ManagerTaskTracker) */}
      <div style={{
        background: 'linear-gradient(135deg, #0b2b26 0%, #196c6c 100%)',
        borderRadius: 20,
        padding: '22px 26px',
        color: '#fff',
        boxShadow: '0 8px 32px rgba(11,43,38,0.24)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16
      }}>
        <div>
          <p style={{ margin: 0, fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#c49b4f' }}>
            🏦 Society Assets & Treasury
          </p>
          <h2 style={{ margin: '6px 0 8px', fontSize: '1.45rem', fontWeight: 800 }}>
            Fixed Deposit Portfolio & Sinking Funds
          </h2>
          <p style={{ margin: 0, color: 'rgba(255,255,255,0.78)', fontSize: '0.9rem', maxWidth: 640 }}>
            Monitor and manage residential society reserves, statutory sinking funds, and long-term interest-bearing accounts across Scheduled Commercial Banks.
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 10 }}>
          <div style={{
            fontSize: '0.74rem',
            padding: '4px 10px',
            borderRadius: 999,
            fontWeight: 800,
            background: source === 'firebase' ? 'rgba(52, 211, 153, 0.18)' : 'rgba(251, 191, 36, 0.18)',
            color: source === 'firebase' ? '#34d399' : '#fde047',
            border: '1px solid rgba(255,255,255,0.2)'
          }}>
            {source === 'firebase' ? '⚡ Live Sync Active' : '📋 Demo Mode'}
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button
              onClick={handlePrintPDF}
              style={{
                padding: '8px 14px',
                borderRadius: 8,
                background: 'rgba(255,255,255,0.14)',
                color: '#fff',
                border: '1px solid rgba(255,255,255,0.28)',
                fontWeight: 700,
                cursor: 'pointer',
                fontSize: '0.84rem',
                backdropFilter: 'blur(6px)'
              }}
            >
              🖨️ Print Portfolio (PDF)
            </button>
            <button
              onClick={handleExportCSV}
              style={{
                padding: '8px 14px',
                borderRadius: 8,
                background: 'rgba(255,255,255,0.14)',
                color: '#fff',
                border: '1px solid rgba(255,255,255,0.28)',
                fontWeight: 700,
                cursor: 'pointer',
                fontSize: '0.84rem'
              }}
            >
              ⬇ Export CSV
            </button>
            {isAdmin && (
              <button
                onClick={() => setIsCreateModalOpen(true)}
                style={{
                  padding: '8px 16px',
                  borderRadius: 8,
                  background: '#c49b4f',
                  color: '#fff',
                  border: 'none',
                  fontWeight: 700,
                  cursor: 'pointer',
                  fontSize: '0.84rem',
                  boxShadow: '0 4px 12px rgba(196,155,79,0.35)'
                }}
              >
                + Open New FD
              </button>
            )}
            <button
              onClick={() => setIsUnlocked(false)}
              style={{
                padding: '8px 12px',
                borderRadius: 8,
                background: 'transparent',
                color: 'rgba(255,255,255,0.6)',
                border: '1px solid rgba(255,255,255,0.15)',
                cursor: 'pointer',
                fontSize: '0.8rem'
              }}
              title="Lock Workspace"
            >
              🔒 Lock
            </button>
          </div>
        </div>
      </div>

      {/* Sync warnings */}
      {syncError && (
        <div style={{ background: '#fee2e2', color: '#991b1b', border: '1px solid #fca5a5', borderRadius: 12, padding: '10px 16px', fontSize: '0.88rem' }}>
          ⚠️ {syncError}
        </div>
      )}

      {/* Primary KPI Metrics Ribbon */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
        <div style={{ background: '#fff', padding: '16px 18px', borderRadius: 14, border: '1px solid rgba(61,63,52,0.08)', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
          <div style={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#64748b' }}>Total Active Principal</div>
          <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0b2b26', marginTop: 4 }}>{fmtAmt(stats.activePrincipal)}</div>
          <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: 4 }}>Across <strong>{stats.activeCount}</strong> active deposits</div>
        </div>
        <div style={{ background: '#fff', padding: '16px 18px', borderRadius: 14, border: '1px solid rgba(61,63,52,0.08)', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
          <div style={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#64748b' }}>Expected Maturity Value</div>
          <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#b45309', marginTop: 4 }}>{fmtAmt(stats.activeMaturityValue)}</div>
          <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: 4 }}>Projected future value</div>
        </div>
        <div style={{ background: '#f0fdf4', padding: '16px 18px', borderRadius: 14, border: '1px solid #bbf7d0', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
          <div style={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#166534' }}>Projected Interest Gain</div>
          <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#15803d', marginTop: 4 }}>{fmtAmt(stats.activeMaturityValue - stats.activePrincipal)}</div>
          <div style={{ fontSize: '0.72rem', color: '#166534', marginTop: 4 }}>Estimated net yield</div>
        </div>
        <div style={{ background: '#fff', padding: '16px 18px', borderRadius: 14, border: '1px solid rgba(61,63,52,0.08)', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
          <div style={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#64748b' }}>Realized Interest (Past)</div>
          <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#1e3a8a', marginTop: 4 }}>{fmtAmt(stats.realizedInterest)}</div>
          <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: 4 }}>From <strong>{stats.historyCount}</strong> closed accounts</div>
        </div>
      </div>

      {/* SUB-TAB BAR */}
      <div className="attendance-month-tabs" role="tablist" style={{ padding: '0 0 10px 0', borderBottom: '1px solid var(--line)' }}>
        <button
          className={`attendance-month-tab ${activeSubTab === 'summary' ? 'attendance-month-tab--active' : ''}`}
          onClick={() => setActiveSubTab('summary')}
        >
          📊 Bank Breakdown &amp; Posters
        </button>
        <button
          className={`attendance-month-tab ${activeSubTab === 'active' ? 'attendance-month-tab--active' : ''}`}
          onClick={() => setActiveSubTab('active')}
        >
          📈 Active Deposits ({stats.activeCount})
        </button>
        <button
          className={`attendance-month-tab ${activeSubTab === 'history' ? 'attendance-month-tab--active' : ''}`}
          onClick={() => setActiveSubTab('history')}
        >
          📋 Deposit History ({stats.historyCount})
        </button>
        <button
          className={`attendance-month-tab ${activeSubTab === 'calculator' ? 'attendance-month-tab--active' : ''}`}
          onClick={() => setActiveSubTab('calculator')}
          style={{ marginLeft: 'auto' }}
        >
          🧮 Returns Simulator
        </button>
      </div>

      {/* SUB-TAB 1: CLEAN & PLAIN SUMMARY STATEMENT */}
      {activeSubTab === 'summary' && (() => {
        fdSummarySerial = 0;
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Clean Section Header */}
            <div style={{ background: '#ffffff', borderRadius: 16, padding: '20px 24px', border: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
              <div>
                <p style={{ margin: 0, fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#196c6c' }}>
                  Treasury Balance Sheet
                </p>
                <h2 style={{ margin: '4px 0 0', fontSize: '1.3rem', fontWeight: 800, color: '#0f172a' }}>
                  {summaryData.title}
                </h2>
                <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '0.88rem' }}>
                  Consolidated statutory reserve &amp; sinking fund portfolio across Scheduled Commercial Banks.
                </p>
              </div>
              <button
                onClick={handlePrintPDF}
                style={{
                  padding: '9px 16px',
                  borderRadius: 8,
                  background: '#0b2b26',
                  color: '#fff',
                  border: 'none',
                  fontWeight: 700,
                  cursor: 'pointer',
                  fontSize: '0.84rem',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  boxShadow: '0 4px 12px rgba(11,43,38,0.18)'
                }}
              >
                🖨️ Print Statement (PDF)
              </button>
            </div>

            {summaryData.banks.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '48px 20px', background: '#fff', borderRadius: 16, border: '1px solid var(--line)', color: '#64748b' }}>
                <span style={{ fontSize: '2rem', display: 'block', marginBottom: 8 }}>📭</span>
                <strong>No active Fixed Deposits found for summary statement.</strong>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                {summaryData.banks.map((bank) => (
                  <div
                    key={bank.bankName}
                    style={{
                      background: '#ffffff',
                      borderRadius: 16,
                      border: '1px solid #e2e8f0',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                      overflow: 'hidden'
                    }}
                  >
                    {/* Plain, clean bank bar */}
                    <div style={{
                      padding: '16px 20px',
                      background: '#f8fafc',
                      borderBottom: '1px solid #e2e8f0',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: 12
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{
                          padding: '6px 12px',
                          borderRadius: 8,
                          fontSize: '0.85rem',
                          fontWeight: 800,
                          background: bank.bankName.includes('HDFC') ? '#eff6ff' : bank.bankName.includes('ICICI') ? '#fff7ed' : '#f1f5f9',
                          color: bank.bankName.includes('HDFC') ? '#1e40af' : bank.bankName.includes('ICICI') ? '#c2410c' : '#334155',
                          border: `1px solid ${bank.bankName.includes('HDFC') ? '#bfdbfe' : bank.bankName.includes('ICICI') ? '#fed7aa' : '#cbd5e1'}`
                        }}>
                          🏛️ {bank.bankName}
                        </span>
                        <span style={{ fontSize: '0.82rem', color: '#64748b', fontWeight: 600 }}>
                          {bank.deposits.length} Active {bank.deposits.length === 1 ? 'Deposit' : 'Deposits'}
                        </span>
                      </div>

                      <div style={{ fontSize: '0.88rem', color: '#334155' }}>
                        Total Principal: <strong style={{ color: '#0f172a' }}>₹{formatSummaryAmount(bank.principalTotal)}</strong>
                      </div>
                    </div>

                    {/* Clean Table */}
                    <div className="attendance-table-scroll">
                      <table className="attendance-table" style={{ margin: 0 }}>
                        <thead>
                          <tr style={{ background: '#f8fafc' }}>
                            <th style={{ width: 50, textAlign: 'center' }}>Sr No.</th>
                            <th style={{ width: 150 }}>{bank.theme.accountLabel || 'FD No.'}</th>
                            <th>Name of Deposit</th>
                            <th style={{ width: 140, textAlign: 'right' }}>Principal Amount (₹)</th>
                            <th style={{ width: 90, textAlign: 'center' }}>Rate (% p.a.)</th>
                            <th style={{ width: 80, textAlign: 'center' }}>Tenure</th>
                            <th style={{ width: 110, textAlign: 'center' }}>Maturity Date</th>
                            <th style={{ width: 140, textAlign: 'right' }}>Maturity Amount (₹)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {bank.deposits.map((deposit, idx) => {
                            const serial = ++fdSummarySerial;
                            return (
                              <tr key={deposit.id || deposit.fdNumber}>
                                <td style={{ textAlign: 'center', color: '#64748b' }}>{serial}</td>
                                <td style={{ fontWeight: 700, fontFamily: 'monospace', color: '#0f172a' }}>
                                  {deposit.fdNumber}
                                </td>
                                <td>
                                  <strong style={{ color: '#0f172a' }}>
                                    {deposit.depositLine1 || deposit.depositName || deposit.bankName}
                                  </strong>
                                  {deposit.depositLine2 && (
                                    <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: 2 }}>
                                      {deposit.depositLine2}
                                    </div>
                                  )}
                                </td>
                                <td style={{ textAlign: 'right', fontWeight: 600, color: '#0f172a' }}>
                                  {formatSummaryAmount(deposit.principal)}
                                </td>
                                <td style={{ textAlign: 'center', fontWeight: 600, color: '#065f46' }}>
                                  {deposit.interestRate}%
                                </td>
                                <td style={{ textAlign: 'center', color: '#64748b' }}>
                                  {deposit.tenureMonths ? `${deposit.tenureMonths} M` : '-'}
                                </td>
                                <td style={{ textAlign: 'center', color: '#334155' }}>
                                  {fmtDate(deposit.maturityDate)}
                                </td>
                                <td style={{ textAlign: 'right', fontWeight: 700, color: '#15803d' }}>
                                  {formatSummaryAmount(deposit.maturityValue)}
                                </td>
                              </tr>
                            );
                          })}
                          <tr style={{ background: '#f8fafc', fontWeight: 700 }}>
                            <td colSpan={3} style={{ textAlign: 'left', padding: '12px 16px', color: '#334155' }}>
                              {bank.totalLabel}
                            </td>
                            <td style={{ textAlign: 'right', padding: '12px 16px', color: '#0f172a' }}>
                              {formatSummaryAmount(bank.principalTotal)}
                            </td>
                            <td colSpan={3} style={{ textAlign: 'center', color: '#94a3b8' }}>—</td>
                            <td style={{ textAlign: 'right', padding: '12px 16px', color: '#15803d' }}>
                              {formatSummaryAmount(bank.maturityTotal)}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Clean Consolidated Grand Total & Expected Interest Card */}
            {summaryData.banks.length > 0 && (
              <div style={{ background: '#ffffff', borderRadius: 16, border: '1px solid #cbd5e1', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14, paddingBottom: 16, borderBottom: '1px solid #e2e8f0' }}>
                  <div>
                    <div style={{ fontSize: '0.74rem', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 800, color: '#64748b' }}>
                      Consolidated Portfolio
                    </div>
                    <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', marginTop: 2 }}>
                      GRAND TOTAL ({summaryData.grandLabel})
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 24, alignItems: 'center', flexWrap: 'wrap' }}>
                    <div>
                      <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: '#64748b', fontWeight: 700 }}>Total Principal Invested</div>
                      <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', marginTop: 2 }}>
                        <span>₹</span><span>{formatSummaryAmount(summaryData.grandPrincipal)}</span>
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: '#64748b', fontWeight: 700 }}>Total Expected Maturity</div>
                      <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#d97706', marginTop: 2 }}>
                        <span>₹</span><span>{formatSummaryAmount(summaryData.grandMaturity)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Total Expected Interest Highlight Banner */}
                <div style={{
                  background: '#f0fdf4',
                  border: '1px solid #86efac',
                  borderRadius: 12,
                  padding: '16px 20px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: 12
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: '1.4rem' }}>💰</span>
                    <div>
                      <div style={{ fontSize: '0.74rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#166534' }}>
                        TOTAL EXPECTED INTEREST EARNINGS
                      </div>
                      <div style={{ fontSize: '0.82rem', color: '#15803d' }}>
                        Net accumulated interest proceeds upon maturity of active deposits
                      </div>
                    </div>
                  </div>

                  <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#15803d' }}>
                    ₹{formatSummaryAmount(summaryData.grandInterest)}
                  </div>
                </div>

                <p style={{ margin: 0, fontSize: '0.78rem', color: '#94a3b8', fontStyle: 'italic' }}>
                  * Society Fixed Deposits are maintained with Scheduled Commercial Banks under approved society statutory reserves and sinking fund resolutions.
                </p>
              </div>
            )}
          </div>
        );
      })()}

      {/* SUB-TAB 2: ACTIVE FIXED DEPOSITS TABLE */}
      {activeSubTab === 'active' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          
          {/* Filter Bar */}
          <div style={{ background: '#f8fafc', border: '1px solid var(--line)', borderRadius: 14, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 220 }}>
              <input
                type="search"
                placeholder="🔍 Search FD number, bank, deposit purpose..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="attendance-register-input"
                style={{ textAlign: 'left', height: 40, fontSize: '0.9rem', background: '#fff' }}
              />
            </div>

            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <select
                value={bankFilter}
                onChange={e => setBankFilter(e.target.value)}
                className="attendance-register-input"
                style={{ height: 40, fontSize: '0.85rem', width: 140, background: '#fff' }}
              >
                <option value="All">All Banks</option>
                <option value="HDFC Bank">HDFC Bank</option>
                <option value="ICICI Bank">ICICI Bank</option>
              </select>

              <select
                value={fundFilter}
                onChange={e => setFundFilter(e.target.value)}
                className="attendance-register-input"
                style={{ height: 40, fontSize: '0.85rem', width: 150, background: '#fff' }}
              >
                <option value="All">All Fund Types</option>
                <option value="Sinking Fund">Sinking Fund</option>
                <option value="General Fund">General Fund</option>
                <option value="Repair Fund">Repair Fund</option>
              </select>
            </div>
          </div>

          {/* Active Ledger Table */}
          <div className="table-card">
            <div className="attendance-table-scroll">
              <table className="attendance-table">
                <thead>
                  <tr style={{ background: '#f8fafc' }}>
                    <th style={{ width: 40, textAlign: 'center' }}>#</th>
                    <th style={{ width: 130 }}>FD / Account #</th>
                    <th style={{ width: 120 }}>Bank</th>
                    <th>Deposit Name / Purpose</th>
                    <th style={{ width: 120, textAlign: 'right' }}>Principal (₹)</th>
                    <th style={{ width: 85, textAlign: 'center' }}>ROI</th>
                    <th style={{ width: 110, textAlign: 'center' }}>Maturity Date</th>
                    <th style={{ width: 130, textAlign: 'right' }}>Maturity Value (₹)</th>
                    <th style={{ width: 110, textAlign: 'center' }}>Progress</th>
                    {isAdmin && <th style={{ width: 120, textAlign: 'center' }}>Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {filteredActiveFds.length === 0 ? (
                    <tr>
                      <td colSpan={isAdmin ? 10 : 9} style={{ textAlign: 'center', padding: '40px', color: 'var(--muted)' }}>
                        {searchQuery ? `No deposits matching "${searchQuery}"` : 'No active deposits found.'}
                      </td>
                    </tr>
                  ) : (
                    filteredActiveFds.map((fd, i) => {
                      const elapsed = getElapsedProgress(fd.startDate, fd.maturityDate);
                      const isMature = elapsed >= 100;

                      return (
                        <tr key={fd.id || fd.fdNumber}>
                          <td style={{ textAlign: 'center', color: '#64748b' }}>{i + 1}</td>
                          <td style={{ fontWeight: 700, fontFamily: 'monospace', color: '#0f172a' }}>{fd.fdNumber}</td>
                          <td>
                            <span style={{
                              display: 'inline-block', padding: '2px 8px', borderRadius: 6, fontSize: '0.75rem', fontWeight: 700,
                              background: fd.bankName?.includes('HDFC') ? '#eff6ff' : fd.bankName?.includes('ICICI') ? '#fff7ed' : '#f1f5f9',
                              color: fd.bankName?.includes('HDFC') ? '#1e40af' : fd.bankName?.includes('ICICI') ? '#c2410c' : '#334155'
                            }}>
                              {fd.bankName}
                            </span>
                          </td>
                          <td>
                            <strong>{fd.depositName || fd.depositLine1 || 'Fixed Deposit'}</strong>
                            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{fd.fundType || 'Sinking Fund'}</div>
                          </td>
                          <td style={{ textAlign: 'right', fontWeight: 600 }}>{formatSummaryAmount(fd.principal)}</td>
                          <td style={{ textAlign: 'center', fontWeight: 700, color: '#065f46' }}>{fd.interestRate}%</td>
                          <td style={{ textAlign: 'center', color: isMature ? '#dc2626' : 'inherit', fontWeight: isMature ? 700 : 'normal' }}>
                            {fmtDate(fd.maturityDate)}
                            {isMature && <span style={{ display: 'block', fontSize: '0.65rem', color: '#dc2626' }}>Matured!</span>}
                          </td>
                          <td style={{ textAlign: 'right', fontWeight: 700, color: '#15803d' }}>{formatSummaryAmount(fd.maturityValue)}</td>
                          <td style={{ textAlign: 'center' }}>
                            <div style={{ width: '100%', background: '#e2e8f0', height: 6, borderRadius: 3, overflow: 'hidden' }}>
                              <div style={{ width: `${elapsed}%`, background: isMature ? '#16a34a' : '#3b82f6', height: '100%' }}></div>
                            </div>
                            <span style={{ fontSize: '0.7rem', color: '#64748b' }}>{elapsed}%</span>
                          </td>
                          {isAdmin && (
                            <td style={{ textAlign: 'center' }}>
                              <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
                                <button
                                  onClick={() => handleMarkMatured(fd)}
                                  className="button-secondary"
                                  style={{ padding: '3px 8px', fontSize: '0.72rem', color: '#16a34a' }}
                                  title="Mark Matured"
                                >
                                  ✓ Matured
                                </button>
                                <button
                                  onClick={() => setBreakingFd(fd)}
                                  className="button-secondary"
                                  style={{ padding: '3px 8px', fontSize: '0.72rem', color: '#dc2626' }}
                                  title="Break FD Prematurely"
                                >
                                  ✕ Break
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
          </div>
        </div>
      )}

      {/* SUB-TAB 3: DEPOSIT HISTORY & CLOSED AUDIT */}
      {activeSubTab === 'history' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="table-card">
            <div className="attendance-table-scroll">
              <table className="attendance-table">
                <thead>
                  <tr style={{ background: '#f8fafc' }}>
                    <th style={{ width: 40, textAlign: 'center' }}>#</th>
                    <th style={{ width: 130 }}>FD #</th>
                    <th style={{ width: 120 }}>Bank</th>
                    <th>Deposit Name</th>
                    <th style={{ width: 120, textAlign: 'right' }}>Principal (₹)</th>
                    <th style={{ width: 120, textAlign: 'right' }}>Proceeds Realized (₹)</th>
                    <th style={{ width: 120, textAlign: 'right' }}>Net Gain (₹)</th>
                    <th style={{ width: 100, textAlign: 'center' }}>Status</th>
                    <th>Notes &amp; Audit Trail</th>
                  </tr>
                </thead>
                <tbody>
                  {historyFds.length === 0 ? (
                    <tr>
                      <td colSpan={9} style={{ textAlign: 'center', padding: 40, color: 'var(--muted)' }}>
                        No closed, broken, or matured Fixed Deposits on record.
                      </td>
                    </tr>
                  ) : (
                    historyFds.map((fd, i) => {
                      const proceeds = fd.status === 'Broken' ? (fd.brokenAmount || 0) : (fd.maturityValue || 0);
                      const gain = Math.max(0, proceeds - (fd.principal || 0));

                      return (
                        <tr key={fd.id || i}>
                          <td style={{ textAlign: 'center', color: '#64748b' }}>{i + 1}</td>
                          <td style={{ fontWeight: 700, fontFamily: 'monospace' }}>{fd.fdNumber}</td>
                          <td>{fd.bankName}</td>
                          <td>{fd.depositName || fd.depositLine1 || 'Fixed Deposit'}</td>
                          <td style={{ textAlign: 'right' }}>{formatSummaryAmount(fd.principal)}</td>
                          <td style={{ textAlign: 'right', fontWeight: 600 }}>{formatSummaryAmount(proceeds)}</td>
                          <td style={{ textAlign: 'right', fontWeight: 700, color: '#15803d' }}>+₹{formatSummaryAmount(gain)}</td>
                          <td style={{ textAlign: 'center' }}>
                            <span style={{
                              display: 'inline-block', padding: '2px 8px', borderRadius: 999, fontSize: '0.72rem', fontWeight: 700,
                              background: fd.status === 'Broken' ? '#fee2e2' : '#d1fae5',
                              color: fd.status === 'Broken' ? '#991b1b' : '#065f46'
                            }}>
                              {fd.status}
                            </span>
                          </td>
                          <td style={{ fontSize: '0.78rem', color: '#64748b' }}>{fd.notes || '—'}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 4: ACCRUED INTEREST RETURNS SIMULATOR */}
      {activeSubTab === 'calculator' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20 }}>
          <div className="section-card" style={{ padding: 24, borderRadius: 18 }}>
            <h4 style={{ margin: '0 0 16px 0', color: '#0b2b26' }}>🧮 Fixed Deposit Yield Simulator</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label className="eyebrow" style={{ display: 'block', marginBottom: 6 }}>Principal Amount (₹)</label>
                <input
                  type="number"
                  className="attendance-register-input"
                  style={{ textAlign: 'left' }}
                  value={calcPrincipal}
                  onChange={e => setCalcPrincipal(e.target.value)}
                />
              </div>
              <div>
                <label className="eyebrow" style={{ display: 'block', marginBottom: 6 }}>Annual Interest Rate (% p.a.)</label>
                <input
                  type="number"
                  step="0.05"
                  className="attendance-register-input"
                  style={{ textAlign: 'left' }}
                  value={calcRate}
                  onChange={e => setCalcRate(e.target.value)}
                />
              </div>
              <div>
                <label className="eyebrow" style={{ display: 'block', marginBottom: 6 }}>Tenure (Months)</label>
                <input
                  type="number"
                  className="attendance-register-input"
                  style={{ textAlign: 'left' }}
                  value={calcTenure}
                  onChange={e => setCalcTenure(e.target.value)}
                />
              </div>
              <div>
                <label className="eyebrow" style={{ display: 'block', marginBottom: 6 }}>Compounding Frequency</label>
                <select
                  className="attendance-register-input"
                  style={{ textAlign: 'left' }}
                  value={calcCompounding}
                  onChange={e => setCalcCompounding(e.target.value)}
                >
                  <option value="4">Quarterly (Bank Standard)</option>
                  <option value="12">Monthly</option>
                  <option value="1">Yearly / Simple</option>
                </select>
              </div>
            </div>
          </div>

          <div className="section-card" style={{ padding: 24, borderRadius: 18, background: '#f8fafc', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <div style={{ fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#64748b', fontWeight: 700 }}>Simulation Summary</div>
            <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ background: '#fff', padding: '14px 16px', borderRadius: 12, border: '1px solid var(--line)' }}>
                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Estimated Maturity Value</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0b2b26', marginTop: 2 }}>₹{formatSummaryAmount(calculatedSimValue.maturity)}</div>
              </div>
              <div style={{ background: '#f0fdf4', padding: '14px 16px', borderRadius: 12, border: '1px solid #86efac' }}>
                <div style={{ fontSize: '0.75rem', color: '#166534' }}>Total Projected Interest Gain</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#15803d', marginTop: 2 }}>+₹{formatSummaryAmount(calculatedSimValue.interest)}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CREATE FD MODAL (matching TaskModal) */}
      {isCreateModalOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
          onClick={() => setIsCreateModalOpen(false)}>
          <div style={{ background: '#fffaf2', borderRadius: 22, padding: '28px', width: '100%', maxWidth: 650, maxHeight: '92vh', overflowY: 'auto', boxShadow: '0 40px 100px rgba(0,0,0,0.28)' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div>
                <p style={{ margin: 0, fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#196c6c' }}>
                  Treasury Investment
                </p>
                <h3 style={{ margin: '2px 0 0', fontSize: '1.25rem', fontWeight: 800, color: '#0b2b26' }}>
                  ➕ Open New Fixed Deposit
                </h3>
              </div>
              <button onClick={() => setIsCreateModalOpen(false)} style={{ background: 'rgba(61,63,52,0.08)', border: 'none', borderRadius: 10, width: 36, height: 36, cursor: 'pointer', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
            </div>

            {formError && <div style={{ color: '#dc2626', background: '#fee2e2', padding: '8px 12px', borderRadius: 8, fontSize: '0.85rem', marginBottom: 12 }}>⚠️ {formError}</div>}
            {formSuccess && <div style={{ color: '#16a34a', background: '#dcfce7', padding: '8px 12px', borderRadius: 8, fontSize: '0.85rem', marginBottom: 12 }}>✓ {formSuccess}</div>}

            <form onSubmit={handleMakeFdSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div>
                <label className="eyebrow" style={{ display: 'block', marginBottom: 6 }}>Bank Name *</label>
                <select
                  value={bankName}
                  onChange={e => setBankName(e.target.value)}
                  className="attendance-register-input"
                  style={{ textAlign: 'left' }}
                  required
                >
                  <option value="HDFC Bank">HDFC Bank</option>
                  <option value="ICICI Bank">ICICI Bank</option>
                  <option value="Other">Other Bank</option>
                </select>
              </div>

              {bankName === 'Other' && (
                <div>
                  <label className="eyebrow" style={{ display: 'block', marginBottom: 6 }}>Custom Bank Name *</label>
                  <input
                    value={customBankName}
                    onChange={e => setCustomBankName(e.target.value)}
                    className="attendance-register-input"
                    style={{ textAlign: 'left' }}
                    placeholder="e.g. State Bank of India"
                    required
                  />
                </div>
              )}

              <div>
                <label className="eyebrow" style={{ display: 'block', marginBottom: 6 }}>FD / Account Number *</label>
                <input
                  value={fdNumber}
                  onChange={e => setFdNumber(e.target.value)}
                  className="attendance-register-input"
                  style={{ textAlign: 'left' }}
                  placeholder="e.g. 50300123456789"
                  required
                />
              </div>

              <div>
                <label className="eyebrow" style={{ display: 'block', marginBottom: 6 }}>Principal Amount (₹) *</label>
                <input
                  type="number"
                  value={principal}
                  onChange={e => setPrincipal(e.target.value)}
                  className="attendance-register-input"
                  style={{ textAlign: 'left' }}
                  placeholder="0.00"
                  required
                />
              </div>

              <div>
                <label className="eyebrow" style={{ display: 'block', marginBottom: 6 }}>Interest Rate (% p.a.) *</label>
                <input
                  type="number"
                  step="0.01"
                  value={interestRate}
                  onChange={e => setInterestRate(e.target.value)}
                  className="attendance-register-input"
                  style={{ textAlign: 'left' }}
                  placeholder="e.g. 7.25"
                  required
                />
              </div>

              <div>
                <label className="eyebrow" style={{ display: 'block', marginBottom: 6 }}>Tenure (Months) *</label>
                <input
                  type="number"
                  value={tenureMonths}
                  onChange={e => setTenureMonths(e.target.value)}
                  className="attendance-register-input"
                  style={{ textAlign: 'left' }}
                  placeholder="e.g. 12"
                  required
                />
              </div>

              <div>
                <label className="eyebrow" style={{ display: 'block', marginBottom: 6 }}>Start Date *</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  className="attendance-register-input"
                  style={{ textAlign: 'left' }}
                  required
                />
              </div>

              <div>
                <label className="eyebrow" style={{ display: 'block', marginBottom: 6 }}>Fund Classification</label>
                <select
                  value={fundType}
                  onChange={e => setFundType(e.target.value)}
                  className="attendance-register-input"
                  style={{ textAlign: 'left' }}
                >
                  <option value="Sinking Fund">Sinking Fund</option>
                  <option value="General Fund">General Fund</option>
                  <option value="Repair Fund">Repair Fund</option>
                  <option value="Reserve Fund">Reserve Fund</option>
                </select>
              </div>

              <div style={{ gridColumn: '1 / -1' }}>
                <label className="eyebrow" style={{ display: 'block', marginBottom: 6 }}>Deposit Name / Purpose</label>
                <input
                  value={depositName}
                  onChange={e => setDepositName(e.target.value)}
                  className="attendance-register-input"
                  style={{ textAlign: 'left' }}
                  placeholder="e.g. MAJESTIQUE EURISKA A BLDG SINKING FUND"
                />
              </div>

              {computedMaturityValue > 0 && (
                <div style={{ gridColumn: '1 / -1', background: '#f0fdf4', padding: '12px 16px', borderRadius: 10, border: '1px solid #86efac', display: 'flex', justifyContent: 'space-between' }}>
                  <div>
                    <span style={{ fontSize: '0.75rem', color: '#166534' }}>Estimated Maturity:</span>{' '}
                    <strong>{fmtDate(computedMaturityDate)}</strong>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.75rem', color: '#166534' }}>Projected Amount:</span>{' '}
                    <strong style={{ color: '#15803d', fontSize: '1rem' }}>₹{formatSummaryAmount(computedMaturityValue)}</strong>
                  </div>
                </div>
              )}

              <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
                <button type="button" onClick={() => setIsCreateModalOpen(false)} className="button-secondary" style={{ padding: '8px 18px' }}>
                  Cancel
                </button>
                <button type="submit" className="button-primary" style={{ padding: '8px 22px' }} disabled={isSubmitting}>
                  {isSubmitting ? 'Creating...' : 'Confirm & Save FD'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PREMATURE BREAK MODAL */}
      {breakingFd && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
          onClick={() => setBreakingFd(null)}>
          <div style={{ background: '#fff', borderRadius: 20, padding: 24, width: '100%', maxWidth: 480, boxShadow: '0 30px 80px rgba(0,0,0,0.3)' }}
            onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 8px 0', color: '#dc2626' }}>Premature Deposit Liquidation</h3>
            <p style={{ fontSize: '0.88rem', color: '#64748b', margin: '0 0 16px 0' }}>
              Break FD <strong>{breakingFd.fdNumber}</strong> ({fmtAmt(breakingFd.principal)}) before maturity.
            </p>

            <form onSubmit={handleBreakSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label className="eyebrow" style={{ display: 'block', marginBottom: 4 }}>Liquidation Date</label>
                <input
                  type="date"
                  value={brokenDate}
                  onChange={e => setBrokenDate(e.target.value)}
                  className="attendance-register-input"
                  style={{ textAlign: 'left' }}
                  required
                />
              </div>

              <div>
                <label className="eyebrow" style={{ display: 'block', marginBottom: 4 }}>Total Proceeds Received (₹)</label>
                <input
                  type="number"
                  value={brokenAmount}
                  onChange={e => setBrokenAmount(e.target.value)}
                  className="attendance-register-input"
                  style={{ textAlign: 'left' }}
                  placeholder="Principal + penalty-adjusted interest"
                  required
                />
              </div>

              <div>
                <label className="eyebrow" style={{ display: 'block', marginBottom: 4 }}>Reason / Cancellation Notes</label>
                <textarea
                  value={breakNotes}
                  onChange={e => setBreakNotes(e.target.value)}
                  className="attendance-register-input"
                  style={{ textAlign: 'left', minHeight: 60 }}
                  placeholder="Reason for premature liquidation..."
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
                <button type="button" onClick={() => setBreakingFd(null)} className="button-secondary">
                  Cancel
                </button>
                <button type="submit" className="button-primary" style={{ background: '#dc2626', borderColor: '#dc2626' }}>
                  Confirm Liquidation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
