import React, { useState, useMemo } from 'react';
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

  const [activeSubTab, setActiveSubTab] = useState('summary'); // 'summary' | 'active' | 'history' | 'create' | 'calculator'
  
  // Form states for creating FD
  const [bankName, setBankName] = useState('HDFC Bank');
  const [customBankName, setCustomBankName] = useState('');
  const [fdNumber, setFdNumber] = useState('');
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

  // Fetch FD records using our custom hook
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

  // Helper to format dates
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

  // Calculate quarterly compound maturity value
  const calculateMaturity = (p, r, m) => {
    const principalNum = parseFloat(p) || 0;
    const rateNum = parseFloat(r) || 0;
    const monthsNum = parseFloat(m) || 0;
    if (principalNum <= 0 || rateNum <= 0 || monthsNum <= 0) return 0;
    
    // Quarterly compounding formula: A = P * (1 + r/400) ^ (4 * t)
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
    let totalRealizedInterest = 0; // Broken or Matured realized interest
    
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
        // Mock fallback
        mockFixedDeposits.unshift({
          id: 'FD-' + Date.now(),
          ...newFd
        });
      }

      setFormSuccess(`Fixed Deposit for ${fmtAmt(principal)} has been successfully created!`);
      // Reset form
      setFdNumber('');
      setPrincipal('');
      setInterestRate('');
      setTenureMonths('');
      setNotes('');
      // Delay switch back to list
      setTimeout(() => {
        setActiveSubTab('active');
        setFormSuccess('');
      }, 1500);
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
        // Mock fallback update
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Module Title */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.75rem', fontWeight: '900', color: 'var(--text-strong)', letterSpacing: '-0.02em' }}>
            💼 Fixed Deposits (FD) Tracker
          </h2>
          <p style={{ margin: '6px 0 0', fontSize: '0.9rem', color: 'var(--muted)' }}>
            Monitor and manage residential society reserves, sinking funds, and long-term interest-bearing accounts.
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{
            fontSize: '0.75rem',
            padding: '6px 12px',
            borderRadius: '20px',
            fontWeight: '700',
            background: source === 'firebase' ? 'rgba(16, 185, 129, 0.08)' : 'rgba(245, 158, 11, 0.08)',
            color: source === 'firebase' ? '#10b981' : '#f59e0b',
            border: `1px solid ${source === 'firebase' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)'}`,
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.02)'
          }}>
            {source === 'firebase' ? '⚡ Live Sync Active' : '📋 Demo Mode'}
          </span>
        </div>
      </div>

      {/* Sync warnings */}
      {syncError && (
        <div className="notice-banner" style={{ background: 'rgba(239, 68, 68, 0.08)', color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.15)', borderRadius: '12px' }}>
          ⚠️ {syncError}
        </div>
      )}

      {/* Primary KPI Metrics */}
      <div className="metrics-grid">
        <div className="metric-card metric-card--teal">
          <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--muted)' }}>Total Active Principal</p>
          <h3 style={{ color: 'var(--teal)' }}>{fmtAmt(stats.activePrincipal)}</h3>
          <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--muted)' }}>
            Locked across <strong>{stats.activeCount}</strong> active deposits
          </p>
        </div>
        <div className="metric-card metric-card--sand">
          <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--muted)' }}>Active Maturity Value</p>
          <h3 style={{ color: 'var(--amber)' }}>{fmtAmt(stats.activeMaturityValue)}</h3>
          <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--muted)' }}>
            Receivable at future maturity dates
          </p>
        </div>
        <div className="metric-card metric-card--pine">
          <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--muted)' }}>Realized Net Interest</p>
          <h3 style={{ color: 'var(--pine)' }}>{fmtAmt(stats.realizedInterest)}</h3>
          <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--muted)' }}>
            Credited from <strong>{stats.historyCount}</strong> closed deposits
          </p>
        </div>
      </div>

      {/* Selector and Actions Bar using global tab layout */}
      <div className="attendance-month-tabs" role="tablist" style={{ padding: '0 0 12px 0', borderBottom: '1px solid var(--line)' }}>
        <button
          className={`attendance-month-tab ${activeSubTab === 'summary' ? 'attendance-month-tab--active' : ''}`}
          onClick={() => setActiveSubTab('summary')}
        >
          📊 FD Summary Poster
        </button>
        <button
          className={`attendance-month-tab ${activeSubTab === 'active' ? 'attendance-month-tab--active' : ''}`}
          onClick={() => setActiveSubTab('active')}
        >
          📈 Active FDs ({stats.activeCount})
        </button>
        <button
          className={`attendance-month-tab ${activeSubTab === 'history' ? 'attendance-month-tab--active' : ''}`}
          onClick={() => setActiveSubTab('history')}
        >
          📋 Closed &amp; Audit ({stats.historyCount})
        </button>
        {isAdmin && (
          <button
            className={`attendance-month-tab ${activeSubTab === 'create' ? 'attendance-month-tab--active' : ''}`}
            onClick={() => setActiveSubTab('create')}
          >
            ➕ Make New FD
          </button>
        )}
        <button
          className={`attendance-month-tab ${activeSubTab === 'calculator' ? 'attendance-month-tab--active' : ''}`}
          onClick={() => setActiveSubTab('calculator')}
          style={{ marginLeft: 'auto' }}
        >
          🧮 Returns Simulator
        </button>
      </div>


      {/* SUBTAB Content Switch */}


      {/* 0. SUMMARY POSTER BOARD */}
      {activeSubTab === 'summary' && (() => {
        fdSummarySerial = 0;
        return (
          <div className="fd-summary-board">
            <div className="fd-summary-board__header">
              <h2 className="fd-summary-board__title">{summaryData.title}</h2>
            </div>

            {summaryData.banks.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--muted)' }}>
                No active Fixed Deposits available for summary statement.
              </div>
            ) : (
              <div className="fd-summary-bank-list">
                {summaryData.banks.map((bank) => (
                  <div
                    key={bank.bankName}
                    className="fd-summary-bank"
                    style={{
                      '--fd-border': bank.theme.border,
                      '--fd-head': bank.theme.head,
                      '--fd-soft': bank.theme.soft,
                      '--fd-soft-alt': bank.theme.softAlt,
                      '--fd-total-bg': bank.theme.totalBg,
                      '--fd-total-color': bank.theme.totalColor
                    }}
                  >
                    <div className="fd-summary-bank__brand-wrap">
                      {renderSummaryBrand(bank.bankName, bank.theme.variant)}
                    </div>

                    <div className="fd-summary-table-wrap">
                      <table className="fd-summary-table">
                        <thead>
                          <tr>
                            <th style={{ width: '60px' }}>Sr No.</th>
                            <th>{bank.theme.accountLabel}</th>
                            <th>Name of Deposit</th>
                            <th>Principal Amount (₹)</th>
                            <th>Rate (% p.a.)</th>
                            <th>Tenure</th>
                            <th>Maturity Date</th>
                            <th>Maturity Amount (₹)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {bank.deposits.map((deposit, idx) => {
                            const serial = ++fdSummarySerial;
                            return (
                              <tr
                                key={deposit.id || deposit.fdNumber}
                                className={idx % 2 === 1 ? 'fd-summary-table__row--alt' : ''}
                              >
                                <td className="fd-summary-table__cell fd-summary-table__cell--serial">{serial}</td>
                                <td
                                  className="fd-summary-table__cell fd-summary-table__cell--number"
                                  style={{
                                    color: deposit.fdNumberColor || undefined,
                                    textDecoration: deposit.fdNumberUnderline ? 'underline' : undefined
                                  }}
                                >
                                  {deposit.fdNumber}
                                </td>
                                <td className="fd-summary-table__cell fd-summary-table__cell--purpose">
                                  <div className="fd-summary-table__deposit-line1">
                                    {deposit.depositLine1 || deposit.depositName || deposit.bankName}
                                  </div>
                                  {deposit.depositLine2 && (
                                    <div
                                      className="fd-summary-table__deposit-line2"
                                      style={{ color: deposit.depositLine2Color || undefined }}
                                    >
                                      {deposit.depositLine2}
                                    </div>
                                  )}
                                </td>
                                <td className="fd-summary-table__cell fd-summary-table__cell--money">
                                  {formatSummaryAmount(deposit.principal)}
                                </td>
                                <td className="fd-summary-table__cell fd-summary-table__cell--center">
                                  {deposit.interestRate}%
                                </td>
                                <td className="fd-summary-table__cell fd-summary-table__cell--center">
                                  {deposit.tenureMonths ? `${deposit.tenureMonths} M` : '-'}
                                </td>
                                <td className="fd-summary-table__cell fd-summary-table__cell--center">
                                  {fmtDate(deposit.maturityDate)}
                                </td>
                                <td className="fd-summary-table__cell fd-summary-table__cell--money">
                                  {formatSummaryAmount(deposit.maturityValue)}
                                </td>
                              </tr>
                            );
                          })}
                          <tr className="fd-summary-table__subtotal">
                            <td colSpan={3} className="fd-summary-table__subtotal-label">
                              {bank.totalLabel}
                            </td>
                            <td className="fd-summary-table__subtotal-value">
                              {formatSummaryAmount(bank.principalTotal)}
                            </td>
                            <td colSpan={3} className="fd-summary-table__subtotal-gap"></td>
                            <td className="fd-summary-table__subtotal-value">
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

            {summaryData.banks.length > 0 && (
              <>
                <div className="fd-summary-grand-wrap">
                  <table className="fd-summary-grand">
                    <tbody>
                      <tr>
                        <td colSpan={3} className="fd-summary-grand__label">
                          GRAND TOTAL ({summaryData.grandLabel})
                        </td>
                        <td className="fd-summary-grand__value">
                          {formatSummaryAmount(summaryData.grandPrincipal)}
                        </td>
                        <td colSpan={3} className="fd-summary-grand__dash">-</td>
                        <td className="fd-summary-grand__value">
                          {formatSummaryAmount(summaryData.grandMaturity)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="fd-summary-interest">
                  <div className="fd-summary-interest__label-wrap">
                    <div className="fd-summary-interest__icon">₹</div>
                    <div className="fd-summary-interest__label">TOTAL EXPECTED INTEREST EARNINGS</div>
                  </div>
                  <div className="fd-summary-interest__value">
                    ₹{formatSummaryAmount(summaryData.grandInterest)}
                  </div>
                </div>

                <p className="fd-summary-note">
                  * Society Fixed Deposits are maintained with Scheduled Commercial Banks under approved society statutory reserves and sinking fund resolutions.
                </p>
              </>
            )}
          </div>
        );
      })()}


      {/* 1. ACTIVE FIXED DEPOSITS */}
      {activeSubTab === 'active' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {activeFds.length === 0 ? (
            <div className="section-card" style={{ textAlign: 'center', padding: '48px 24px', borderRadius: '16px', color: 'var(--muted)' }}>
              <span style={{ fontSize: '2.5rem', display: 'block', marginBottom: '12px' }}>📭</span>
              <h3 style={{ margin: '0 0 6px', fontWeight: '800' }}>No Active Fixed Deposits</h3>
              <p style={{ maxWidth: '420px', margin: '0 auto', fontSize: '0.9rem', lineHeight: '1.4' }}>There are currently no active Fixed Deposits registered for the society. Go to the "Make New FD" tab to record one.</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '20px' }}>
              {activeFds.map(fd => {
                const elapsed = getElapsedProgress(fd.startDate, fd.maturityDate);
                const isMature = elapsed >= 100;
                return (
                  <div 
                    key={fd.id} 
                    className="section-card" 
                    style={{
                      padding: '24px',
                      borderRadius: '20px',
                      position: 'relative',
                      border: `1.5px solid ${isMature ? 'var(--gold)' : 'var(--line)'}`,
                      background: isMature ? 'linear-gradient(180deg, var(--bg-card) 0%, rgba(245,158,11,0.02) 100%)' : 'var(--bg-card)',
                      boxShadow: isMature ? '0 10px 24px rgba(245,158,11,0.06)' : '0 8px 16px rgba(0,0,0,0.02)',
                      transition: 'transform 0.2s ease, box-shadow 0.2s ease'
                    }}
                  >
                    {isMature && (
                      <span style={{
                        position: 'absolute',
                        top: '16px',
                        right: '16px',
                        fontSize: '0.7rem',
                        background: '#b98216',
                        color: 'white',
                        padding: '4px 10px',
                        borderRadius: '12px',
                        fontWeight: '800',
                        letterSpacing: '0.04em',
                        boxShadow: '0 4px 8px rgba(185,130,22,0.2)'
                      }}>
                        🔔 MATURED
                      </span>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                          {fd.bankName}
                        </span>
                        <strong style={{ fontSize: '1.15rem', fontFamily: 'monospace', color: 'var(--text-strong)', letterSpacing: '-0.5px' }}>
                          {fd.fdNumber}
                        </strong>
                      </div>
                      <span style={{
                        fontSize: '0.72rem',
                        fontWeight: '700',
                        padding: '4px 10px',
                        borderRadius: '6px',
                        background: fd.fundType === 'Sinking Fund' ? 'rgba(25, 108, 108, 0.08)' : 'rgba(185, 130, 22, 0.08)',
                        color: fd.fundType === 'Sinking Fund' ? 'var(--teal)' : 'var(--gold)',
                        border: `1px solid ${fd.fundType === 'Sinking Fund' ? 'rgba(25, 108, 108, 0.15)' : 'rgba(185, 130, 22, 0.15)'}`
                      }}>
                        {fd.fundType}
                      </span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px 12px', margin: '20px 0', borderBottom: '1px solid var(--line)', paddingBottom: '16px' }}>
                      <div>
                        <span style={{ fontSize: '0.75rem', color: 'var(--muted)', display: 'block', marginBottom: '2px' }}>Principal Invested</span>
                        <strong style={{ fontSize: '1.25rem', color: 'var(--teal)', fontWeight: '800' }}>{fmtAmt(fd.principal)}</strong>
                      </div>
                      <div>
                        <span style={{ fontSize: '0.75rem', color: 'var(--muted)', display: 'block', marginBottom: '2px' }}>Interest Rate</span>
                        <strong style={{ fontSize: '1.25rem', color: 'var(--text-strong)', fontWeight: '800' }}>{fd.interestRate}% <span style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--muted)' }}>p.a.</span></strong>
                      </div>
                      <div>
                        <span style={{ fontSize: '0.75rem', color: 'var(--muted)', display: 'block', marginBottom: '2px' }}>Tenure</span>
                        <span style={{ fontSize: '0.95rem', fontWeight: '700', color: 'var(--text)' }}>{fd.tenureMonths} Months</span>
                      </div>
                      <div>
                        <span style={{ fontSize: '0.75rem', color: 'var(--muted)', display: 'block', marginBottom: '2px' }}>Expected Yield</span>
                        <strong style={{ fontSize: '1.15rem', color: 'var(--pine)', fontWeight: '800' }}>
                          +{fmtAmt((fd.maturityValue || 0) - fd.principal)}
                        </strong>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div style={{ margin: '16px 0 16px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--muted)', marginBottom: '6px' }}>
                        <span>Start: {fmtDate(fd.startDate)}</span>
                        <span>Matures: {fmtDate(fd.maturityDate)}</span>
                      </div>
                      <div style={{ height: '8px', background: 'var(--bg-strong)', borderRadius: '4px', overflow: 'hidden', border: '1px solid var(--line)' }}>
                        <div style={{
                          height: '100%',
                          width: `${elapsed}%`,
                          background: isMature ? 'linear-gradient(90deg, var(--gold) 0%, #d97706 100%)' : 'linear-gradient(90deg, var(--teal) 0%, #0d9488 100%)',
                          transition: 'width 0.4s ease'
                        }} />
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--muted)', marginTop: '4px' }}>
                        <span>Progress</span>
                        <span style={{ fontWeight: '700', color: isMature ? 'var(--gold)' : 'var(--teal)' }}>{elapsed}% Completed</span>
                      </div>
                    </div>

                    {/* Notes */}
                    {fd.notes && (
                      <div style={{
                        margin: '12px 0 18px',
                        padding: '10px 12px',
                        borderRadius: '8px',
                        background: 'var(--bg-strong)',
                        borderLeft: '3px solid var(--line)',
                        fontSize: '0.78rem',
                        color: 'var(--muted)',
                        lineHeight: '1.4'
                      }}>
                        "{fd.notes}"
                      </div>
                    )}

                    {/* Actions */}
                    {isAdmin && (
                      <div style={{ display: 'flex', gap: '8px', borderTop: '1px solid var(--line)', paddingTop: '14px' }}>
                        {isMature ? (
                          <button
                            className="action-btn"
                            style={{ 
                              flex: 1, 
                              background: 'var(--pine)', 
                              color: 'white', 
                              border: 'none',
                              padding: '10px',
                              borderRadius: '8px',
                              fontWeight: '700',
                              cursor: 'pointer'
                            }}
                            onClick={() => handleMarkMatured(fd)}
                          >
                            ✔️ Log Maturity payout
                          </button>
                        ) : (
                          <>
                            <button
                              className="action-btn"
                              style={{ 
                                flex: 1, 
                                borderColor: 'var(--coral)', 
                                color: 'var(--coral)',
                                background: 'transparent',
                                borderRadius: '8px',
                                fontWeight: '700',
                                cursor: 'pointer'
                              }}
                              onClick={() => setBreakingFd(fd)}
                            >
                              💔 Break FD Prematurely
                            </button>
                            <button
                              className="action-btn"
                              style={{ 
                                padding: '8px 16px', 
                                borderColor: 'var(--gold)', 
                                color: 'var(--gold)',
                                background: 'transparent',
                                borderRadius: '8px',
                                fontWeight: '700',
                                cursor: 'pointer'
                              }}
                              onClick={() => handleMarkMatured(fd)}
                              title="Mark Matured"
                            >
                              ✔️ Mature
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 2. HISTORY OF MATURED/BROKEN FDS */}
      {activeSubTab === 'history' && (
        <div className="section-card" style={{ padding: '24px', borderRadius: '20px' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: '1.15rem', fontWeight: '800', color: 'var(--text-strong)' }}>Closed Investments Audit Log</h3>
          {historyFds.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--muted)' }}>
              No closed or broken Fixed Deposits found in history.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--line)', textAlign: 'left', color: 'var(--muted)', fontWeight: '700' }}>
                    <th style={{ padding: '12px 10px' }}>FD Number</th>
                    <th style={{ padding: '12px 10px' }}>Bank</th>
                    <th style={{ padding: '12px 10px' }}>Principal</th>
                    <th style={{ padding: '12px 10px' }}>Rate</th>
                    <th style={{ padding: '12px 10px' }}>Fund Category</th>
                    <th style={{ padding: '12px 10px' }}>Maturity Date</th>
                    <th style={{ padding: '12px 10px' }}>Proceeds Received</th>
                    <th style={{ padding: '12px 10px' }}>Net Yield</th>
                    <th style={{ padding: '12px 10px' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {historyFds.map(fd => {
                    const isBroken = fd.status === 'Broken';
                    const finalReceived = isBroken ? (fd.brokenAmount || 0) : (fd.maturityValue || 0);
                    const netYield = finalReceived - fd.principal;
                    const yieldPercent = ((netYield / fd.principal) * 100).toFixed(2);
                    
                    return (
                      <tr key={fd.id} style={{ borderBottom: '1px solid var(--line)', verticalAlign: 'middle' }}>
                        <td style={{ padding: '14px 10px', fontFamily: 'monospace', fontWeight: '700', fontSize: '0.82rem' }}>{fd.fdNumber}</td>
                        <td style={{ padding: '14px 10px' }}>{fd.bankName}</td>
                        <td style={{ padding: '14px 10px', fontWeight: '600' }}>{fmtAmt(fd.principal)}</td>
                        <td style={{ padding: '14px 10px' }}>{fd.interestRate}%</td>
                        <td style={{ padding: '14px 10px' }}>
                          <span style={{
                            fontSize: '0.7rem',
                            padding: '3px 8px',
                            borderRadius: '4px',
                            background: fd.fundType === 'Sinking Fund' ? 'rgba(25,108,108,0.06)' : 'rgba(185,130,22,0.06)',
                            color: fd.fundType === 'Sinking Fund' ? 'var(--teal)' : 'var(--gold)',
                            border: `1px solid ${fd.fundType === 'Sinking Fund' ? 'rgba(25,108,108,0.1)' : 'rgba(185,130,22,0.1)'}`
                          }}>
                            {fd.fundType}
                          </span>
                        </td>
                        <td style={{ padding: '14px 10px', color: 'var(--muted)' }}>
                          {isBroken ? `Broken on ${fmtDate(fd.brokenDate)}` : fmtDate(fd.maturityDate)}
                        </td>
                        <td style={{ padding: '14px 10px', fontWeight: '700', color: isBroken ? 'var(--coral)' : 'var(--pine)' }}>
                          {fmtAmt(finalReceived)}
                        </td>
                        <td style={{ padding: '14px 10px' }}>
                          <strong style={{ color: netYield >= 0 ? 'var(--pine)' : 'var(--coral)' }}>
                            {netYield >= 0 ? '+' : ''}{fmtAmt(netYield)}
                          </strong>
                          <span style={{ fontSize: '0.7rem', color: 'var(--muted)', display: 'block', marginTop: '2px' }}>
                            ({yieldPercent}%)
                          </span>
                        </td>
                        <td style={{ padding: '14px 10px' }}>
                          <span style={{
                            fontSize: '0.72rem',
                            fontWeight: '700',
                            padding: '4px 10px',
                            borderRadius: '20px',
                            background: isBroken ? 'rgba(239, 68, 68, 0.08)' : 'rgba(16, 185, 129, 0.08)',
                            color: isBroken ? 'var(--coral)' : 'var(--pine)',
                            border: `1px solid ${isBroken ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)'}`
                          }}>
                            {fd.status.toUpperCase()}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* 3. CREATE FD FORM */}
      {activeSubTab === 'create' && isAdmin && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
          {/* Form Card */}
          <div className="section-card" style={{ padding: '24px', borderRadius: '20px' }}>
            <h3 style={{ margin: '0 0 20px', fontSize: '1.15rem', fontWeight: '800', color: 'var(--text-strong)' }}>Initiate New Fixed Deposit Record</h3>
            
            {formError && (
              <div style={{ padding: '12px', background: 'rgba(239, 68, 68, 0.06)', border: '1px solid rgba(239, 68, 68, 0.15)', color: '#ef4444', borderRadius: '8px', fontSize: '0.85rem', marginBottom: '18px' }}>
                ⚠️ {formError}
              </div>
            )}
            {formSuccess && (
              <div style={{ padding: '12px', background: 'rgba(16, 185, 129, 0.06)', border: '1px solid rgba(16, 185, 129, 0.15)', color: '#10b981', borderRadius: '8px', fontSize: '0.85rem', marginBottom: '18px' }}>
                🎉 {formSuccess}
              </div>
            )}

            <form onSubmit={handleMakeFdSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label style={{ fontSize: '0.78rem', fontWeight: '700', display: 'block', marginBottom: '6px', color: 'var(--muted)' }}>Bank Name *</label>
                  <select
                    className="form-control"
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', background: 'var(--bg-strong)', border: '1px solid var(--line)', color: 'var(--text)', outline: 'none' }}
                  >
                    <option value="HDFC Bank">HDFC Bank</option>
                    <option value="ICICI Bank">ICICI Bank</option>
                    <option value="SBI Bank">State Bank of India</option>
                    <option value="Axis Bank">Axis Bank</option>
                    <option value="IDBI Bank">IDBI Bank</option>
                    <option value="Other">Other (Write-in)</option>
                  </select>
                </div>
                
                {bankName === 'Other' && (
                  <div className="form-group">
                    <label style={{ fontSize: '0.78rem', fontWeight: '700', display: 'block', marginBottom: '6px', color: 'var(--muted)' }}>Specify Bank *</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Bank Name"
                      value={customBankName}
                      onChange={(e) => setCustomBankName(e.target.value)}
                      required
                      style={{ width: '100%', padding: '10px', borderRadius: '8px', background: 'var(--bg-strong)', border: '1px solid var(--line)', color: 'var(--text)', outline: 'none' }}
                    />
                  </div>
                )}

                <div className="form-group">
                  <label style={{ fontSize: '0.78rem', fontWeight: '700', display: 'block', marginBottom: '6px', color: 'var(--muted)' }}>FD Account/Cert Number *</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. 502000..."
                    value={fdNumber}
                    onChange={(e) => setFdNumber(e.target.value)}
                    required
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', background: 'var(--bg-strong)', border: '1px solid var(--line)', color: 'var(--text)', outline: 'none' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label style={{ fontSize: '0.78rem', fontWeight: '700', display: 'block', marginBottom: '6px', color: 'var(--muted)' }}>Principal Amount (₹) *</label>
                  <input
                    type="number"
                    className="form-control"
                    placeholder="e.g. 500000"
                    value={principal}
                    onChange={(e) => setPrincipal(e.target.value)}
                    required
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', background: 'var(--bg-strong)', border: '1px solid var(--line)', color: 'var(--text)', outline: 'none' }}
                  />
                </div>

                <div className="form-group">
                  <label style={{ fontSize: '0.78rem', fontWeight: '700', display: 'block', marginBottom: '6px', color: 'var(--muted)' }}>Interest Rate (% p.a.) *</label>
                  <input
                    type="number"
                    step="0.01"
                    className="form-control"
                    placeholder="e.g. 7.15"
                    value={interestRate}
                    onChange={(e) => setInterestRate(e.target.value)}
                    required
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', background: 'var(--bg-strong)', border: '1px solid var(--line)', color: 'var(--text)', outline: 'none' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label style={{ fontSize: '0.78rem', fontWeight: '700', display: 'block', marginBottom: '6px', color: 'var(--muted)' }}>Tenure (Months) *</label>
                  <input
                    type="number"
                    className="form-control"
                    placeholder="e.g. 12"
                    value={tenureMonths}
                    onChange={(e) => setTenureMonths(e.target.value)}
                    required
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', background: 'var(--bg-strong)', border: '1px solid var(--line)', color: 'var(--text)', outline: 'none' }}
                  />
                </div>

                <div className="form-group">
                  <label style={{ fontSize: '0.78rem', fontWeight: '700', display: 'block', marginBottom: '6px', color: 'var(--muted)' }}>Start Date *</label>
                  <input
                    type="date"
                    className="form-control"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    required
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', background: 'var(--bg-strong)', border: '1px solid var(--line)', color: 'var(--text)', outline: 'none' }}
                  />
                </div>
              </div>

              <div className="form-group">
                <label style={{ fontSize: '0.78rem', fontWeight: '700', display: 'block', marginBottom: '6px', color: 'var(--muted)' }}>Fund Category *</label>
                <select
                  className="form-control"
                  value={fundType}
                  onChange={(e) => setFundType(e.target.value)}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', background: 'var(--bg-strong)', border: '1px solid var(--line)', color: 'var(--text)', outline: 'none' }}
                >
                  <option value="Sinking Fund">Sinking Fund (Wing A/Common)</option>
                  <option value="Reserve Fund">Reserve Fund (General Surplus)</option>
                  <option value="General Fund">General Society Operations Fund</option>
                  <option value="Infrastructure Fund">Infrastructure & Redevelopment Fund</option>
                </select>
              </div>

              <div className="form-group">
                <label style={{ fontSize: '0.78rem', fontWeight: '700', display: 'block', marginBottom: '6px', color: 'var(--muted)' }}>Notes / Resolution Details</label>
                <textarea
                  className="form-control"
                  placeholder="e.g. Approved in AGM Min 14. Used for Lift AMC safety reserve."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows="3"
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', background: 'var(--bg-strong)', border: '1px solid var(--line)', color: 'var(--text)', fontFamily: 'inherit', outline: 'none' }}
                />
              </div>

              <button
                type="submit"
                className="action-btn action-btn--primary"
                disabled={isSubmitting}
                style={{ 
                  width: '100%', 
                  padding: '12px', 
                  marginTop: '10px', 
                  display: 'flex', 
                  justifyContent: 'center',
                  background: 'var(--teal)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '10px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(25, 108, 108, 0.15)'
                }}
              >
                {isSubmitting ? 'Creating Deposit...' : '💾 Save Fixed Deposit'}
              </button>
            </form>
          </div>

          {/* Real-time Calculation Panel */}
          <div className="section-card" style={{ padding: '20px', background: 'var(--bg-strong)' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: '1.05rem', color: 'var(--text-strong)' }}>Maturity Forecast</h3>
            
            {principal && interestRate && tenureMonths ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ background: 'var(--bg-card)', padding: '16px', borderRadius: '8px', border: '1px solid var(--line)' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--muted)', display: 'block' }}>Initial Investment (P)</span>
                  <strong style={{ fontSize: '1.4rem', color: 'var(--text-strong)' }}>{fmtAmt(principal)}</strong>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <div style={{ background: 'var(--bg-card)', padding: '12px', borderRadius: '8px', border: '1px solid var(--line)' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--muted)', display: 'block' }}>Est. Yield (I)</span>
                    <strong style={{ fontSize: '1.2rem', color: 'var(--pine)' }}>
                      +{fmtAmt(computedMaturityValue - principal)}
                    </strong>
                  </div>
                  <div style={{ background: 'var(--bg-card)', padding: '12px', borderRadius: '8px', border: '1px solid var(--line)' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--muted)', display: 'block' }}>Maturity Date</span>
                    <strong style={{ fontSize: '1.0', color: 'var(--text)' }}>
                      {fmtDate(computedMaturityDate)}
                    </strong>
                  </div>
                </div>

                <div style={{ background: 'linear-gradient(135deg, rgba(25,108,108,0.1), rgba(185,130,22,0.1))', padding: '20px', borderRadius: '10px', border: '1px solid var(--gold)', textAlign: 'center' }}>
                  <span style={{ fontSize: '0.78rem', color: 'var(--muted)', display: 'block', fontWeight: '700' }}>TOTAL RECEIVABLE VALUE</span>
                  <strong style={{ fontSize: '1.8rem', color: 'var(--teal)', display: 'block', marginTop: '4px' }}>
                    {fmtAmt(computedMaturityValue)}
                  </strong>
                  <span style={{ fontSize: '0.68rem', color: 'var(--muted)', marginTop: '6px', display: 'block' }}>
                    *Calculated assuming standard Indian quarterly compound interest payout structure.
                  </span>
                </div>

                <div style={{ padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: '6px', fontSize: '0.78rem', color: 'var(--muted)' }}>
                  <strong>💡 Sinking Fund Guideline:</strong> According to housing society bylaws, sinking fund deposits should remain locked in government or approved scheduled commercial banks (such as HDFC, ICICI, SBI) to ensure capital safety.
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center', color: 'var(--muted)', padding: '50px 0' }}>
                Fill out the investment amount, interest rate, and tenure on the form to view real-time maturity projections.
              </div>
            )}
          </div>
        </div>
      )}

      {/* 4. STANDALONE INTEREST SIMULATOR */}
      {activeSubTab === 'calculator' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
          {/* Inputs */}
          <div className="section-card" style={{ padding: '20px' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: '1.05rem', color: 'var(--text-strong)' }}>Simulator Parameters</h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div className="form-group">
                <label style={{ fontSize: '0.75rem', fontWeight: '700', display: 'block', marginBottom: '4px', color: 'var(--muted)' }}>Investment Principal (₹)</label>
                <input
                  type="range"
                  min="50000"
                  max="5000000"
                  step="50000"
                  value={calcPrincipal}
                  onChange={(e) => setCalcPrincipal(e.target.value)}
                  style={{ width: '100%', accentColor: 'var(--teal)' }}
                />
                <input
                  type="number"
                  className="form-control"
                  value={calcPrincipal}
                  onChange={(e) => setCalcPrincipal(e.target.value)}
                  style={{ width: '100%', padding: '8px', marginTop: '6px', borderRadius: '6px', background: 'var(--bg-strong)', border: '1px solid var(--line)', color: 'var(--text)' }}
                />
              </div>

              <div className="form-group">
                <label style={{ fontSize: '0.75rem', fontWeight: '700', display: 'block', marginBottom: '4px', color: 'var(--muted)' }}>Interest Rate (% p.a.)</label>
                <input
                  type="range"
                  min="3.0"
                  max="12.0"
                  step="0.05"
                  value={calcRate}
                  onChange={(e) => setCalcRate(e.target.value)}
                  style={{ width: '100%', accentColor: 'var(--teal)' }}
                />
                <input
                  type="number"
                  step="0.05"
                  className="form-control"
                  value={calcRate}
                  onChange={(e) => setCalcRate(e.target.value)}
                  style={{ width: '100%', padding: '8px', marginTop: '6px', borderRadius: '6px', background: 'var(--bg-strong)', border: '1px solid var(--line)', color: 'var(--text)' }}
                />
              </div>

              <div className="form-group">
                <label style={{ fontSize: '0.75rem', fontWeight: '700', display: 'block', marginBottom: '4px', color: 'var(--muted)' }}>Tenure (Months)</label>
                <input
                  type="range"
                  min="3"
                  max="120"
                  step="3"
                  value={calcTenure}
                  onChange={(e) => setCalcTenure(e.target.value)}
                  style={{ width: '100%', accentColor: 'var(--teal)' }}
                />
                <input
                  type="number"
                  className="form-control"
                  value={calcTenure}
                  onChange={(e) => setCalcTenure(e.target.value)}
                  style={{ width: '100%', padding: '8px', marginTop: '6px', borderRadius: '6px', background: 'var(--bg-strong)', border: '1px solid var(--line)', color: 'var(--text)' }}
                />
              </div>

              <div className="form-group">
                <label style={{ fontSize: '0.75rem', fontWeight: '700', display: 'block', marginBottom: '4px', color: 'var(--muted)' }}>Compounding Frequency</label>
                <select
                  className="form-control"
                  value={calcCompounding}
                  onChange={(e) => setCalcCompounding(e.target.value)}
                  style={{ width: '100%', padding: '8px', borderRadius: '6px', background: 'var(--bg-strong)', border: '1px solid var(--line)', color: 'var(--text)' }}
                >
                  <option value="12">Monthly Compounding</option>
                  <option value="4">Quarterly Compounding (Standard Bank FD)</option>
                  <option value="2">Half-yearly Compounding</option>
                  <option value="1">Yearly Compounding (Simple compounding)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Results Output */}
          <div className="section-card" style={{ padding: '20px', background: 'var(--bg-strong)', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: '1.05rem', color: 'var(--text-strong)', textAlign: 'center' }}>Simulated Growth Curve</h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'stretch' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div style={{ background: 'var(--bg-card)', padding: '14px', borderRadius: '8px', border: '1px solid var(--line)', textAlign: 'center' }}>
                  <span style={{ fontSize: '0.72rem', color: 'var(--muted)', display: 'block' }}>Principal Invested</span>
                  <strong style={{ fontSize: '1.25rem', color: 'var(--text-strong)' }}>{fmtAmt(calcPrincipal)}</strong>
                </div>
                <div style={{ background: 'var(--bg-card)', padding: '14px', borderRadius: '8px', border: '1px solid var(--line)', textAlign: 'center' }}>
                  <span style={{ fontSize: '0.72rem', color: 'var(--muted)', display: 'block' }}>Yield Interest (Est)</span>
                  <strong style={{ fontSize: '1.25rem', color: 'var(--pine)' }}>+{fmtAmt(calculatedSimValue.interest)}</strong>
                </div>
              </div>

              <div style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.1), rgba(25,108,108,0.1))', padding: '24px 16px', borderRadius: '10px', border: '2px solid var(--teal)', textAlign: 'center' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--muted)', display: 'block', fontWeight: '700' }}>TOTAL ACCRUED VALUE</span>
                <strong style={{ fontSize: '2.1rem', color: 'var(--teal)', display: 'block', marginTop: '4px' }}>
                  {fmtAmt(calculatedSimValue.maturity)}
                </strong>
                <span style={{ fontSize: '0.7rem', color: 'var(--muted)', marginTop: '8px', display: 'block' }}>
                  Total yield represents a <strong>{((calculatedSimValue.interest / (parseFloat(calcPrincipal) || 1)) * 100).toFixed(2)}%</strong> gross return.
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PREMATURE BREAK FD MODAL */}
      {breakingFd && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000,
          padding: '16px'
        }}>
          <div className="section-card" style={{ maxWidth: '500px', width: '100%', padding: '24px', background: 'var(--bg-card)' }}>
            <h3 style={{ margin: '0 0 10px', fontSize: '1.18rem', color: 'var(--text-strong)' }}>Premature Liquidation (Break FD)</h3>
            <p style={{ margin: '0 0 16px', fontSize: '0.8rem', color: 'var(--muted)' }}>
              Enter details of the premature closure for FD certificate <strong>{breakingFd.fdNumber}</strong> ({breakingFd.bankName}).
            </p>

            <form onSubmit={handleBreakSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div style={{ background: 'var(--bg-strong)', padding: '10px', borderRadius: '6px' }}>
                  <span style={{ fontSize: '0.7rem', color: 'var(--muted)', display: 'block' }}>Principal Invested</span>
                  <strong style={{ fontSize: '1.1rem', color: 'var(--text-strong)' }}>{fmtAmt(breakingFd.principal)}</strong>
                </div>
                <div style={{ background: 'var(--bg-strong)', padding: '10px', borderRadius: '6px' }}>
                  <span style={{ fontSize: '0.7rem', color: 'var(--muted)', display: 'block' }}>Expected Maturity</span>
                  <strong style={{ fontSize: '1.1rem', color: 'var(--text)' }}>{fmtAmt(breakingFd.maturityValue)}</strong>
                </div>
              </div>

              <div className="form-group">
                <label style={{ fontSize: '0.75rem', display: 'block', fontWeight: '700', marginBottom: '4px', color: 'var(--muted)' }}>Liquidation/Breaking Date *</label>
                <input
                  type="date"
                  className="form-control"
                  value={brokenDate}
                  onChange={(e) => setBrokenDate(e.target.value)}
                  required
                  style={{ width: '100%', padding: '8px', borderRadius: '6px', background: 'var(--bg-strong)', border: '1px solid var(--line)', color: 'var(--text)' }}
                />
              </div>

              <div className="form-group">
                <label style={{ fontSize: '0.75rem', display: 'block', fontWeight: '700', marginBottom: '4px', color: 'var(--muted)' }}>Actual Proceeds/Cash Credited (₹) *</label>
                <input
                  type="number"
                  className="form-control"
                  placeholder="Enter total amount returned by bank"
                  value={brokenAmount}
                  onChange={(e) => setBrokenAmount(e.target.value)}
                  required
                  style={{ width: '100%', padding: '8px', borderRadius: '6px', background: 'var(--bg-strong)', border: '1px solid var(--line)', color: 'var(--text)' }}
                />
              </div>

              <div className="form-group">
                <label style={{ fontSize: '0.75rem', display: 'block', fontWeight: '700', marginBottom: '4px', color: 'var(--muted)' }}>Reason / Fund Utilization Details</label>
                <textarea
                  className="form-control"
                  placeholder="Provide details on why this FD was liquidated prematurely..."
                  value={breakNotes}
                  onChange={(e) => setBreakNotes(e.target.value)}
                  rows="2"
                  style={{ width: '100%', padding: '8px', borderRadius: '6px', background: 'var(--bg-strong)', border: '1px solid var(--line)', color: 'var(--text)', fontFamily: 'inherit' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  className="action-btn"
                  style={{ flex: 1, borderColor: 'var(--line)', color: 'var(--text)' }}
                  onClick={() => setBreakingFd(null)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="action-btn"
                  style={{ flex: 1, background: 'var(--coral)', color: 'white', border: 'none' }}
                >
                  💔 Confirm Liquidation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
