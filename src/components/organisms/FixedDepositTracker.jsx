import React, { useState, useMemo, useCallback } from 'react';
import { collection, addDoc, updateDoc, doc } from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../../firebase.js';
import { useCollection } from '../../hooks/useCollection.js';
import { fixedDeposits as mockFixedDeposits } from '../../data/mockData.js';
import './FixedDepositTracker.css';


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
            <h1 class="title">🏦 MAJESTIQUE EURISKA 'A' BUILDING CO-OP HOUSING SOCIETY LTD.</h1>
            <div class="subtitle">Reg. No: PNA/PNA (4)/HSG/(TC)/21207/2019-20 • S. No. 2, Plot No C-1, Village Mohammed Wadi, Taluka Haveli, Pune - 411060</div>
            <div style="font-size: 11px; color: #64748b; margin-top: 2px;">Fixed Deposit Treasury Valuation &amp; Sinking Fund Portfolio Statement</div>
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
      <div className="section-card fixed-deposit-tracker-s1">
        <h3 className="section-card__title fixed-deposit-tracker-s2">
          <span>🔒</span> Confidential Fixed Deposits
        </h3>
        <p className="fixed-deposit-tracker-s3">
          This section contains confidential Fixed Deposit records and FD management tools. Please enter the authorization password to proceed.
        </p>
        <form onSubmit={handleFdUnlock}>
          <div className="fixed-deposit-tracker-s4">
            <label htmlFor="fd-password-input" className="fixed-deposit-tracker-s5">
              Authorization Password
            </label>
            <input
              id="fd-password-input"
              type="password"
              placeholder="Enter password..."
              value={fdPassword}
              onChange={(e) => setFdPassword(e.target.value)}
              className="fixed-deposit-tracker-s6"
            />
          </div>
          {fdErrorMsg && (
            <p className="fixed-deposit-tracker-s7">
              ⚠️ {fdErrorMsg}
            </p>
          )}
          <button
            type="submit"
            className="action-btn fixed-deposit-tracker-s8"
          >
            Unlock FD Workspace
          </button>
        </form>
      </div>
    );
  }

  let fdSummarySerial = 0;

  return (
    <div className="fixed-deposit-tracker-s9">
      
      {/* HERO BANNER (matching ManagerTaskTracker) */}
      <div className="fixed-deposit-tracker-s10">
        <div>
          <p className="fixed-deposit-tracker-s11">
            🏦 Society Assets & Treasury
          </p>
          <h2 className="fixed-deposit-tracker-s12">
            Fixed Deposit Portfolio & Sinking Funds
          </h2>
          <p className="fixed-deposit-tracker-s13">
            Monitor and manage residential society reserves, statutory sinking funds, and long-term interest-bearing accounts across Scheduled Commercial Banks.
          </p>
        </div>

        <div className="fixed-deposit-tracker-s14">
          <div className={`fixed-deposit-tracker-s15 ${(source === 'firebase' ? 'fixed-deposit-tracker-cond-1-true' : 'fixed-deposit-tracker-cond-2-false')}`}>
            {source === 'firebase' ? '⚡ Live Sync Active' : '📋 Demo Mode'}
          </div>

          <div className="fixed-deposit-tracker-s16">
            <button
              onClick={handlePrintPDF}
              className="fixed-deposit-tracker-s17"
            >
              🖨️ Print Portfolio (PDF)
            </button>
            <button
              onClick={handleExportCSV}
              className="fixed-deposit-tracker-s18"
            >
              ⬇ Export CSV
            </button>
            {isAdmin && (
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="fixed-deposit-tracker-s19"
              >
                + Open New FD
              </button>
            )}
            <button
              onClick={() => setIsUnlocked(false)}
              className="fixed-deposit-tracker-s20"
              title="Lock Workspace"
            >
              🔒 Lock
            </button>
          </div>
        </div>
      </div>

      {/* Sync warnings */}
      {syncError && (
        <div className="fixed-deposit-tracker-s21">
          ⚠️ {syncError}
        </div>
      )}

      {/* Primary KPI Metrics Ribbon */}
      <div className="fixed-deposit-tracker-s22">
        <div className="fixed-deposit-tracker-s23">
          <div className="fixed-deposit-tracker-s24">Total Active Principal</div>
          <div className="fixed-deposit-tracker-s25">{fmtAmt(stats.activePrincipal)}</div>
          <div className="fixed-deposit-tracker-s26">Across <strong>{stats.activeCount}</strong> active deposits</div>
        </div>
        <div className="fixed-deposit-tracker-s23">
          <div className="fixed-deposit-tracker-s24">Expected Maturity Value</div>
          <div className="fixed-deposit-tracker-s27">{fmtAmt(stats.activeMaturityValue)}</div>
          <div className="fixed-deposit-tracker-s26">Projected future value</div>
        </div>
        <div className="fixed-deposit-tracker-s28">
          <div className="fixed-deposit-tracker-s29">Projected Interest Gain</div>
          <div className="fixed-deposit-tracker-s30">{fmtAmt(stats.activeMaturityValue - stats.activePrincipal)}</div>
          <div className="fixed-deposit-tracker-s31">Estimated net yield</div>
        </div>
        <div className="fixed-deposit-tracker-s23">
          <div className="fixed-deposit-tracker-s24">Realized Interest (Past)</div>
          <div className="fixed-deposit-tracker-s32">{fmtAmt(stats.realizedInterest)}</div>
          <div className="fixed-deposit-tracker-s26">From <strong>{stats.historyCount}</strong> closed accounts</div>
        </div>
      </div>

      {/* SUB-TAB BAR */}
      <div className="attendance-month-tabs fixed-deposit-tracker-s33" role="tablist">
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
          className={`attendance-month-tab ${activeSubTab === 'calculator' ? 'attendance-month-tab--active' : ''} fixed-deposit-tracker-s34`}
          onClick={() => setActiveSubTab('calculator')}
        >
          🧮 Returns Simulator
        </button>
      </div>

      {/* SUB-TAB 1: CLEAN & PLAIN SUMMARY STATEMENT */}
      {activeSubTab === 'summary' && (() => {
        fdSummarySerial = 0;
        return (
          <div className="fixed-deposit-tracker-s35">
            {/* Clean Section Header */}
            <div className="fixed-deposit-tracker-s36">
              <div>
                <p className="fixed-deposit-tracker-s37">
                  Treasury Balance Sheet
                </p>
                <h2 className="fixed-deposit-tracker-s38">
                  {summaryData.title}
                </h2>
                <p className="fixed-deposit-tracker-s39">
                  Consolidated statutory reserve &amp; sinking fund portfolio across Scheduled Commercial Banks.
                </p>
              </div>
              <button
                onClick={handlePrintPDF}
                className="fixed-deposit-tracker-s40"
              >
                🖨️ Print Statement (PDF)
              </button>
            </div>

            {summaryData.banks.length === 0 ? (
              <div className="fixed-deposit-tracker-s41">
                <span className="fixed-deposit-tracker-s42">📭</span>
                <strong>No active Fixed Deposits found for summary statement.</strong>
              </div>
            ) : (
              <div className="fixed-deposit-tracker-s35">
                {summaryData.banks.map((bank) => (
                  <div
                    key={bank.bankName}
                    className="fixed-deposit-tracker-s43"
                  >
                    {/* Plain, clean bank bar */}
                    <div className="fixed-deposit-tracker-s44">
                      <div className="fixed-deposit-tracker-s2">
                        <span className="fixed-deposit-tracker-s45" style={{ background: bank.bankName.includes('HDFC') ? '#eff6ff' : bank.bankName.includes('ICICI') ? '#fff7ed' : '#f1f5f9', color: bank.bankName.includes('HDFC') ? '#1e40af' : bank.bankName.includes('ICICI') ? '#c2410c' : '#334155', border: `1px solid ${bank.bankName.includes('HDFC') ? '#bfdbfe' : bank.bankName.includes('ICICI') ? '#fed7aa' : '#cbd5e1'}` }}>
                          🏛️ {bank.bankName}
                        </span>
                        <span className="fixed-deposit-tracker-s46">
                          {bank.deposits.length} Active {bank.deposits.length === 1 ? 'Deposit' : 'Deposits'}
                        </span>
                      </div>

                      <div className="fixed-deposit-tracker-s47">
                        Total Principal: <strong className="fixed-deposit-tracker-s48">₹{formatSummaryAmount(bank.principalTotal)}</strong>
                      </div>
                    </div>

                    {/* Clean Table */}
                    <div className="attendance-table-scroll">
                      <table className="attendance-table fixed-deposit-tracker-s49">
                        <thead>
                          <tr className="fixed-deposit-tracker-s50">
                            <th className="fixed-deposit-tracker-s51">Sr No.</th>
                            <th className="fixed-deposit-tracker-s52">{bank.theme.accountLabel || 'FD No.'}</th>
                            <th>Name of Deposit</th>
                            <th className="fixed-deposit-tracker-s53">Principal Amount (₹)</th>
                            <th className="fixed-deposit-tracker-s54">Rate (% p.a.)</th>
                            <th className="fixed-deposit-tracker-s55">Tenure</th>
                            <th className="fixed-deposit-tracker-s56">Maturity Date</th>
                            <th className="fixed-deposit-tracker-s53">Maturity Amount (₹)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {bank.deposits.map((deposit, idx) => {
                            const serial = ++fdSummarySerial;
                            return (
                              <tr key={deposit.id || deposit.fdNumber}>
                                <td className="fixed-deposit-tracker-s57">{serial}</td>
                                <td className="fixed-deposit-tracker-s58">
                                  {deposit.fdNumber}
                                </td>
                                <td>
                                  <strong className="fixed-deposit-tracker-s48">
                                    {deposit.depositLine1 || deposit.depositName || deposit.bankName}
                                  </strong>
                                  {deposit.depositLine2 && (
                                    <div className="fixed-deposit-tracker-s59">
                                      {deposit.depositLine2}
                                    </div>
                                  )}
                                </td>
                                <td className="fixed-deposit-tracker-s60">
                                  {formatSummaryAmount(deposit.principal)}
                                </td>
                                <td className="fixed-deposit-tracker-s61">
                                  {deposit.interestRate}%
                                </td>
                                <td className="fixed-deposit-tracker-s57">
                                  {deposit.tenureMonths ? `${deposit.tenureMonths} M` : '-'}
                                </td>
                                <td className="fixed-deposit-tracker-s62">
                                  {fmtDate(deposit.maturityDate)}
                                </td>
                                <td className="fixed-deposit-tracker-s63">
                                  {formatSummaryAmount(deposit.maturityValue)}
                                </td>
                              </tr>
                            );
                          })}
                          <tr className="fixed-deposit-tracker-s64">
                            <td colSpan={3} className="fixed-deposit-tracker-s65">
                              {bank.totalLabel}
                            </td>
                            <td className="fixed-deposit-tracker-s66">
                              {formatSummaryAmount(bank.principalTotal)}
                            </td>
                            <td colSpan={3} className="fixed-deposit-tracker-s67">—</td>
                            <td className="fixed-deposit-tracker-s68">
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
              <div className="fixed-deposit-tracker-s69">
                <div className="fixed-deposit-tracker-s70">
                  <div>
                    <div className="fixed-deposit-tracker-s71">
                      Consolidated Portfolio
                    </div>
                    <div className="fixed-deposit-tracker-s72">
                      GRAND TOTAL ({summaryData.grandLabel})
                    </div>
                  </div>

                  <div className="fixed-deposit-tracker-s73">
                    <div>
                      <div className="fixed-deposit-tracker-s74">Total Principal Invested</div>
                      <div className="fixed-deposit-tracker-s75">
                        <span>₹</span><span>{formatSummaryAmount(summaryData.grandPrincipal)}</span>
                      </div>
                    </div>
                    <div>
                      <div className="fixed-deposit-tracker-s74">Total Expected Maturity</div>
                      <div className="fixed-deposit-tracker-s76">
                        <span>₹</span><span>{formatSummaryAmount(summaryData.grandMaturity)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Total Expected Interest Highlight Banner */}
                <div className="fixed-deposit-tracker-s77">
                  <div className="fixed-deposit-tracker-s2">
                    <span className="fixed-deposit-tracker-s78">💰</span>
                    <div>
                      <div className="fixed-deposit-tracker-s79">
                        TOTAL EXPECTED INTEREST EARNINGS
                      </div>
                      <div className="fixed-deposit-tracker-s80">
                        Net accumulated interest proceeds upon maturity of active deposits
                      </div>
                    </div>
                  </div>

                  <div className="fixed-deposit-tracker-s81">
                    ₹{formatSummaryAmount(summaryData.grandInterest)}
                  </div>
                </div>

                <p className="fixed-deposit-tracker-s82">
                  * Society Fixed Deposits are maintained with Scheduled Commercial Banks under approved society statutory reserves and sinking fund resolutions.
                </p>
              </div>
            )}
          </div>
        );
      })()}

      {/* SUB-TAB 2: ACTIVE FIXED DEPOSITS TABLE */}
      {activeSubTab === 'active' && (
        <div className="fixed-deposit-tracker-s83">
          
          {/* Filter Bar */}
          <div className="fixed-deposit-tracker-s84">
            <div className="fixed-deposit-tracker-s85">
              <input
                type="search"
                placeholder="🔍 Search FD number, bank, deposit purpose..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="attendance-register-input fixed-deposit-tracker-s86"
              />
            </div>

            <div className="fixed-deposit-tracker-s87">
              <select
                value={bankFilter}
                onChange={e => setBankFilter(e.target.value)}
                className="attendance-register-input fixed-deposit-tracker-s88"
              >
                <option value="All">All Banks</option>
                <option value="HDFC Bank">HDFC Bank</option>
                <option value="ICICI Bank">ICICI Bank</option>
              </select>

              <select
                value={fundFilter}
                onChange={e => setFundFilter(e.target.value)}
                className="attendance-register-input fixed-deposit-tracker-s89"
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
                  <tr className="fixed-deposit-tracker-s50">
                    <th className="fixed-deposit-tracker-s90">#</th>
                    <th className="fixed-deposit-tracker-s91">FD / Account #</th>
                    <th className="fixed-deposit-tracker-s92">Bank</th>
                    <th>Deposit Name / Purpose</th>
                    <th className="fixed-deposit-tracker-s93">Principal (₹)</th>
                    <th className="fixed-deposit-tracker-s94">ROI</th>
                    <th className="fixed-deposit-tracker-s56">Maturity Date</th>
                    <th className="fixed-deposit-tracker-s95">Maturity Value (₹)</th>
                    <th className="fixed-deposit-tracker-s56">Progress</th>
                    {isAdmin && <th className="fixed-deposit-tracker-s96">Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {filteredActiveFds.length === 0 ? (
                    <tr>
                      <td colSpan={isAdmin ? 10 : 9} className="fixed-deposit-tracker-s97">
                        {searchQuery ? `No deposits matching "${searchQuery}"` : 'No active deposits found.'}
                      </td>
                    </tr>
                  ) : (
                    filteredActiveFds.map((fd, i) => {
                      const elapsed = getElapsedProgress(fd.startDate, fd.maturityDate);
                      const isMature = elapsed >= 100;

                      return (
                        <tr key={fd.id || fd.fdNumber}>
                          <td className="fixed-deposit-tracker-s57">{i + 1}</td>
                          <td className="fixed-deposit-tracker-s58">{fd.fdNumber}</td>
                          <td>
                            <span className="fixed-deposit-tracker-s98" style={{ background: fd.bankName?.includes('HDFC') ? '#eff6ff' : fd.bankName?.includes('ICICI') ? '#fff7ed' : '#f1f5f9', color: fd.bankName?.includes('HDFC') ? '#1e40af' : fd.bankName?.includes('ICICI') ? '#c2410c' : '#334155' }}>
                              {fd.bankName}
                            </span>
                          </td>
                          <td>
                            <strong>{fd.depositName || fd.depositLine1 || 'Fixed Deposit'}</strong>
                            <div className="fixed-deposit-tracker-s99">{fd.fundType || 'Sinking Fund'}</div>
                          </td>
                          <td className="fixed-deposit-tracker-s100">{formatSummaryAmount(fd.principal)}</td>
                          <td className="fixed-deposit-tracker-s101">{fd.interestRate}%</td>
                          <td className={`fixed-deposit-tracker-s102 ${(isMature ? 'fixed-deposit-tracker-cond-3-true' : 'fixed-deposit-tracker-cond-4-false')}`}>
                            {fmtDate(fd.maturityDate)}
                            {isMature && <span className="fixed-deposit-tracker-s103">Matured!</span>}
                          </td>
                          <td className="fixed-deposit-tracker-s63">{formatSummaryAmount(fd.maturityValue)}</td>
                          <td className="fixed-deposit-tracker-s102">
                            <div className="fixed-deposit-tracker-s104">
                              <div className={`fixed-deposit-tracker-s105 ${(isMature ? 'fixed-deposit-tracker-cond-5-true' : 'fixed-deposit-tracker-cond-6-false')}`} style={{ width: `${elapsed}%` }}></div>
                            </div>
                            <span className="fixed-deposit-tracker-s106">{elapsed}%</span>
                          </td>
                          {isAdmin && (
                            <td className="fixed-deposit-tracker-s102">
                              <div className="fixed-deposit-tracker-s107">
                                <button
                                  onClick={() => handleMarkMatured(fd)}
                                  className="button-secondary fixed-deposit-tracker-s108"
                                  title="Mark Matured"
                                >
                                  ✓ Matured
                                </button>
                                <button
                                  onClick={() => setBreakingFd(fd)}
                                  className="button-secondary fixed-deposit-tracker-s109"
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
        <div className="fixed-deposit-tracker-s83">
          <div className="table-card">
            <div className="attendance-table-scroll">
              <table className="attendance-table">
                <thead>
                  <tr className="fixed-deposit-tracker-s50">
                    <th className="fixed-deposit-tracker-s90">#</th>
                    <th className="fixed-deposit-tracker-s91">FD #</th>
                    <th className="fixed-deposit-tracker-s92">Bank</th>
                    <th>Deposit Name</th>
                    <th className="fixed-deposit-tracker-s93">Principal (₹)</th>
                    <th className="fixed-deposit-tracker-s93">Proceeds Realized (₹)</th>
                    <th className="fixed-deposit-tracker-s93">Net Gain (₹)</th>
                    <th className="fixed-deposit-tracker-s110">Status</th>
                    <th>Notes &amp; Audit Trail</th>
                  </tr>
                </thead>
                <tbody>
                  {historyFds.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="fixed-deposit-tracker-s97">
                        No closed, broken, or matured Fixed Deposits on record.
                      </td>
                    </tr>
                  ) : (
                    historyFds.map((fd, i) => {
                      const proceeds = fd.status === 'Broken' ? (fd.brokenAmount || 0) : (fd.maturityValue || 0);
                      const gain = Math.max(0, proceeds - (fd.principal || 0));

                      return (
                        <tr key={fd.id || i}>
                          <td className="fixed-deposit-tracker-s57">{i + 1}</td>
                          <td className="fixed-deposit-tracker-s111">{fd.fdNumber}</td>
                          <td>{fd.bankName}</td>
                          <td>{fd.depositName || fd.depositLine1 || 'Fixed Deposit'}</td>
                          <td className="fixed-deposit-tracker-s112">{formatSummaryAmount(fd.principal)}</td>
                          <td className="fixed-deposit-tracker-s100">{formatSummaryAmount(proceeds)}</td>
                          <td className="fixed-deposit-tracker-s63">+₹{formatSummaryAmount(gain)}</td>
                          <td className="fixed-deposit-tracker-s102">
                            <span className={`fixed-deposit-tracker-s113 ${(fd.status === 'Broken' ? 'fixed-deposit-tracker-cond-7-true' : 'fixed-deposit-tracker-cond-8-false')}`}>
                              {fd.status}
                            </span>
                          </td>
                          <td className="fixed-deposit-tracker-s114">{fd.notes || '—'}</td>
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
        <div className="fixed-deposit-tracker-s115">
          <div className="section-card fixed-deposit-tracker-s116">
            <h4 className="fixed-deposit-tracker-s117">🧮 Fixed Deposit Yield Simulator</h4>
            <div className="fixed-deposit-tracker-s118">
              <div>
                <label className="eyebrow fixed-deposit-tracker-s119">Principal Amount (₹)</label>
                <input
                  type="number"
                  className="attendance-register-input fixed-deposit-tracker-s120"
                  value={calcPrincipal}
                  onChange={e => setCalcPrincipal(e.target.value)}
                />
              </div>
              <div>
                <label className="eyebrow fixed-deposit-tracker-s119">Annual Interest Rate (% p.a.)</label>
                <input
                  type="number"
                  step="0.05"
                  className="attendance-register-input fixed-deposit-tracker-s120"
                  value={calcRate}
                  onChange={e => setCalcRate(e.target.value)}
                />
              </div>
              <div>
                <label className="eyebrow fixed-deposit-tracker-s119">Tenure (Months)</label>
                <input
                  type="number"
                  className="attendance-register-input fixed-deposit-tracker-s120"
                  value={calcTenure}
                  onChange={e => setCalcTenure(e.target.value)}
                />
              </div>
              <div>
                <label className="eyebrow fixed-deposit-tracker-s119">Compounding Frequency</label>
                <select
                  className="attendance-register-input fixed-deposit-tracker-s120"
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

          <div className="section-card fixed-deposit-tracker-s121">
            <div className="fixed-deposit-tracker-s122">Simulation Summary</div>
            <div className="fixed-deposit-tracker-s123">
              <div className="fixed-deposit-tracker-s124">
                <div className="fixed-deposit-tracker-s99">Estimated Maturity Value</div>
                <div className="fixed-deposit-tracker-s125">₹{formatSummaryAmount(calculatedSimValue.maturity)}</div>
              </div>
              <div className="fixed-deposit-tracker-s126">
                <div className="fixed-deposit-tracker-s127">Total Projected Interest Gain</div>
                <div className="fixed-deposit-tracker-s128">+₹{formatSummaryAmount(calculatedSimValue.interest)}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CREATE FD MODAL (matching TaskModal) */}
      {isCreateModalOpen && (
        <div className="fixed-deposit-tracker-s129"
          onClick={() => setIsCreateModalOpen(false)}>
          <div className="fixed-deposit-tracker-s130"
            onClick={e => e.stopPropagation()}>
            <div className="fixed-deposit-tracker-s131">
              <div>
                <p className="fixed-deposit-tracker-s132">
                  Treasury Investment
                </p>
                <h3 className="fixed-deposit-tracker-s133">
                  ➕ Open New Fixed Deposit
                </h3>
              </div>
              <button onClick={() => setIsCreateModalOpen(false)} className="fixed-deposit-tracker-s134">✕</button>
            </div>

            {formError && <div className="fixed-deposit-tracker-s135">⚠️ {formError}</div>}
            {formSuccess && <div className="fixed-deposit-tracker-s136">✓ {formSuccess}</div>}

            <form onSubmit={handleMakeFdSubmit} className="fixed-deposit-tracker-s137">
              <div>
                <label className="eyebrow fixed-deposit-tracker-s119">Bank Name *</label>
                <select
                  value={bankName}
                  onChange={e => setBankName(e.target.value)}
                  className="attendance-register-input fixed-deposit-tracker-s120"
                  required
                >
                  <option value="HDFC Bank">HDFC Bank</option>
                  <option value="ICICI Bank">ICICI Bank</option>
                  <option value="Other">Other Bank</option>
                </select>
              </div>

              {bankName === 'Other' && (
                <div>
                  <label className="eyebrow fixed-deposit-tracker-s119">Custom Bank Name *</label>
                  <input
                    value={customBankName}
                    onChange={e => setCustomBankName(e.target.value)}
                    className="attendance-register-input fixed-deposit-tracker-s120"
                    placeholder="e.g. State Bank of India"
                    required
                  />
                </div>
              )}

              <div>
                <label className="eyebrow fixed-deposit-tracker-s119">FD / Account Number *</label>
                <input
                  value={fdNumber}
                  onChange={e => setFdNumber(e.target.value)}
                  className="attendance-register-input fixed-deposit-tracker-s120"
                  placeholder="e.g. 50300123456789"
                  required
                />
              </div>

              <div>
                <label className="eyebrow fixed-deposit-tracker-s119">Principal Amount (₹) *</label>
                <input
                  type="number"
                  value={principal}
                  onChange={e => setPrincipal(e.target.value)}
                  className="attendance-register-input fixed-deposit-tracker-s120"
                  placeholder="0.00"
                  required
                />
              </div>

              <div>
                <label className="eyebrow fixed-deposit-tracker-s119">Interest Rate (% p.a.) *</label>
                <input
                  type="number"
                  step="0.01"
                  value={interestRate}
                  onChange={e => setInterestRate(e.target.value)}
                  className="attendance-register-input fixed-deposit-tracker-s120"
                  placeholder="e.g. 7.25"
                  required
                />
              </div>

              <div>
                <label className="eyebrow fixed-deposit-tracker-s119">Tenure (Months) *</label>
                <input
                  type="number"
                  value={tenureMonths}
                  onChange={e => setTenureMonths(e.target.value)}
                  className="attendance-register-input fixed-deposit-tracker-s120"
                  placeholder="e.g. 12"
                  required
                />
              </div>

              <div>
                <label className="eyebrow fixed-deposit-tracker-s119">Start Date *</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  className="attendance-register-input fixed-deposit-tracker-s120"
                  required
                />
              </div>

              <div>
                <label className="eyebrow fixed-deposit-tracker-s119">Fund Classification</label>
                <select
                  value={fundType}
                  onChange={e => setFundType(e.target.value)}
                  className="attendance-register-input fixed-deposit-tracker-s120"
                >
                  <option value="Sinking Fund">Sinking Fund</option>
                  <option value="General Fund">General Fund</option>
                  <option value="Repair Fund">Repair Fund</option>
                  <option value="Reserve Fund">Reserve Fund</option>
                </select>
              </div>

              <div className="fixed-deposit-tracker-s138">
                <label className="eyebrow fixed-deposit-tracker-s119">Deposit Name / Purpose</label>
                <input
                  value={depositName}
                  onChange={e => setDepositName(e.target.value)}
                  className="attendance-register-input fixed-deposit-tracker-s120"
                  placeholder="e.g. MAJESTIQUE EURISKA A BLDG SINKING FUND"
                />
              </div>

              {computedMaturityValue > 0 && (
                <div className="fixed-deposit-tracker-s139">
                  <div>
                    <span className="fixed-deposit-tracker-s127">Estimated Maturity:</span>{' '}
                    <strong>{fmtDate(computedMaturityDate)}</strong>
                  </div>
                  <div>
                    <span className="fixed-deposit-tracker-s127">Projected Amount:</span>{' '}
                    <strong className="fixed-deposit-tracker-s140">₹{formatSummaryAmount(computedMaturityValue)}</strong>
                  </div>
                </div>
              )}

              <div className="fixed-deposit-tracker-s141">
                <button type="button" onClick={() => setIsCreateModalOpen(false)} className="button-secondary fixed-deposit-tracker-s142">
                  Cancel
                </button>
                <button type="submit" className="button-primary fixed-deposit-tracker-s143" disabled={isSubmitting}>
                  {isSubmitting ? 'Creating...' : 'Confirm & Save FD'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PREMATURE BREAK MODAL */}
      {breakingFd && (
        <div className="fixed-deposit-tracker-s129"
          onClick={() => setBreakingFd(null)}>
          <div className="fixed-deposit-tracker-s144"
            onClick={e => e.stopPropagation()}>
            <h3 className="fixed-deposit-tracker-s145">Premature Deposit Liquidation</h3>
            <p className="fixed-deposit-tracker-s146">
              Break FD <strong>{breakingFd.fdNumber}</strong> ({fmtAmt(breakingFd.principal)}) before maturity.
            </p>

            <form onSubmit={handleBreakSubmit} className="fixed-deposit-tracker-s147">
              <div>
                <label className="eyebrow fixed-deposit-tracker-s148">Liquidation Date</label>
                <input
                  type="date"
                  value={brokenDate}
                  onChange={e => setBrokenDate(e.target.value)}
                  className="attendance-register-input fixed-deposit-tracker-s120"
                  required
                />
              </div>

              <div>
                <label className="eyebrow fixed-deposit-tracker-s148">Total Proceeds Received (₹)</label>
                <input
                  type="number"
                  value={brokenAmount}
                  onChange={e => setBrokenAmount(e.target.value)}
                  className="attendance-register-input fixed-deposit-tracker-s120"
                  placeholder="Principal + penalty-adjusted interest"
                  required
                />
              </div>

              <div>
                <label className="eyebrow fixed-deposit-tracker-s148">Reason / Cancellation Notes</label>
                <textarea
                  value={breakNotes}
                  onChange={e => setBreakNotes(e.target.value)}
                  className="attendance-register-input fixed-deposit-tracker-s149"
                  placeholder="Reason for premature liquidation..."
                />
              </div>

              <div className="fixed-deposit-tracker-s150">
                <button type="button" onClick={() => setBreakingFd(null)} className="button-secondary">
                  Cancel
                </button>
                <button type="submit" className="button-primary fixed-deposit-tracker-s151">
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
