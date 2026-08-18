import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell
} from 'recharts';

import { APRIL_2026_DATA, MAY_2026_DATA, JUNE_2026_DATA, JULY_2026_DATA, ALL_TIME_DATA, FY2025_26_DATA, FY2024_25_DATA, FY2023_24_DATA, FY2022_23_DATA, parseRawBankStatement } from './bankStatementData';
import FixedDepositTracker from './FixedDepositTracker';

export default function BankStatementTracker({ isAdmin }) {
  const [password, setPassword] = useState('');
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [activeSubTab, setActiveSubTab] = useState('dashboard');

  // Month / Period selector state: 'ALL_TIME' | 'FY2025_26' | 'FY2024_25' | 'FY2023_24' | 'FY2022_23' | 'APRIL_2026' | 'MAY_2026' | 'JUNE_2026' | 'JULY_2026' | 'CUSTOM'
  const [selectedPeriod, setSelectedPeriod] = useState('ALL_TIME');
  const [customParsedData, setCustomParsedData] = useState(null);

  // Live Statement Parser input state
  const [rawTextInput, setRawTextInput] = useState('');
  const [parseError, setParseError] = useState('');
  const [parseSuccessMsg, setParseSuccessMsg] = useState('');

  // Search & Filter state for Transactions tabs
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOrder, setSortOrder] = useState('DATE_DESC');
  const [sourceFilter, setSourceFilter] = useState('ALL');

  // Active Dataset Resolution
  const activeData = useMemo(() => {
    if (selectedPeriod === 'ALL_TIME') return ALL_TIME_DATA;
    if (selectedPeriod === 'FY2025_26') return FY2025_26_DATA;
    if (selectedPeriod === 'FY2024_25') return FY2024_25_DATA;
    if (selectedPeriod === 'FY2023_24') return FY2023_24_DATA;
    if (selectedPeriod === 'FY2022_23') return FY2022_23_DATA;
    if (selectedPeriod === 'APRIL_2026') return APRIL_2026_DATA;
    if (selectedPeriod === 'MAY_2026') return MAY_2026_DATA;
    if (selectedPeriod === 'JUNE_2026') return JUNE_2026_DATA;
    if (selectedPeriod === 'CUSTOM' && customParsedData) return customParsedData;
    return JULY_2026_DATA;
  }, [selectedPeriod, customParsedData]);

  const STATEMENT_PERIOD = activeData.period;
  const OPENING_BALANCE  = activeData.openingBalance;
  const CLOSING_BALANCE  = activeData.closingBalance;
  const TOTAL_CREDITS    = activeData.totalCredits;
  const TOTAL_DEBITS     = activeData.totalDebits;
  const NET_CASH_FLOW    = activeData.netCashFlow;
  const VENDORS_DATA     = activeData.vendorsData;
  const INCOME_CATEGORIES  = activeData.incomeCategories;
  const EXPENSE_CATEGORIES = activeData.expenseCategories;
  const TIMELINE_DATA    = activeData.timelineData;
  const TRANSACTIONS_LIST= activeData.transactionsList;

  const fdPrincipalFlow = useMemo(() => {
    if (!TRANSACTIONS_LIST) return 0;
    const fdCrs = TRANSACTIONS_LIST.filter(t => t.type === 'CR' && (t.desc.toUpperCase().includes('REDEEM PRINCIPAL') || t.desc.toUpperCase().includes('FD REDEEM PRINCIPAL')));
    const fdDrs = TRANSACTIONS_LIST.filter(t => t.type === 'DR' && (t.desc.toUpperCase().includes('FD BOOKING') || t.desc.toUpperCase().includes('FIXED DEPOSIT') || t.desc.toUpperCase().includes('SWEEP OUT') || t.desc.toUpperCase().includes('SWEEP-OUT')));
    const totalRedeemPrincipal = fdCrs.reduce((sum, t) => sum + t.amount, 0);
    const totalBookedPrincipal = fdDrs.reduce((sum, t) => sum + t.amount, 0);
    return totalRedeemPrincipal - totalBookedPrincipal;
  }, [TRANSACTIONS_LIST]);

  const handleUnlock = (e) => {
    e.preventDefault();
    if (password === '$05CeLRO') {
      setIsUnlocked(true);
      setErrorMsg('');
    } else {
      setErrorMsg('Incorrect Password. Access Denied.');
    }
  };

  const fmtAmt = (val) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2
    }).format(val || 0);
  };

  const handleParseSubmit = (e) => {
    if (e) e.preventDefault();
    setParseError('');
    setParseSuccessMsg('');

    if (!rawTextInput || !rawTextInput.trim()) {
      setParseError('Please paste raw bank statement text first.');
      return;
    }

    const parsed = parseRawBankStatement(rawTextInput);
    if (!parsed || parsed.transactionsList.length === 0) {
      setParseError('Failed to parse statement. Please ensure the text is a valid HDFC bank statement copy.');
      return;
    }

    setCustomParsedData(parsed);
    setSelectedPeriod('CUSTOM');
    setParseSuccessMsg(`Successfully parsed ${parsed.transactionsList.length} transactions (${parsed.period})! Switched to Custom Statement view.`);
  };

  // Classify a transaction into a source key
  const getSourceKey = (tx) => {
    const d = tx.desc.toUpperCase();
    if (d.includes('VIVISH TECHNOLOGIES'))                                          return 'VIVISH';
    if (d.includes('FD BOOKING') || d.includes('SWEEP IN') || d.includes('SWEEP-IN') || d.includes('FIXED DEPOSIT') || d.includes('FD CRED') || d.includes('FD REDEEM') || d.includes('REDEEM PRINCIPAL') || d.includes('REDEEM INTEREST')) return 'FD';
    if (d.includes('TATA PLAY'))                                                    return 'TATA_PLAY';
    if (d.startsWith('UPI') || d.includes('UPI SETTLEMENT') || d.includes('UPI-') || d.includes('IMPS-')) return 'UPI_IMPS';
    if (d.includes('CHQ DEP') || d.includes('CHEQUE DEP'))                          return 'CHQ_DEP';
    if (d.includes('MAJESTIQUE EURISKA C') || d.includes('MAJESTIQUE EURISKA B')) return 'INTER_FT';
    if (tx.type === 'DR' && (d.includes('CHQ PAID') || d.includes('SELF - CHQ') || d.includes('SAFETY SOLUTIONS') || d.includes('DR -'))) return 'CHQ_PAID';
    return 'OTHER';
  };

  const parseDateStr = (dateStr) => {
    if (!dateStr || typeof dateStr !== 'string') return 0;
    const parts = dateStr.split('/');
    if (parts.length < 3) return 0;
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    let year = parseInt(parts[2], 10);
    if (year < 100) year += 2000;
    return new Date(year, month, day).getTime();
  };

  // Helper filter function
  const getFilteredTx = (typeFilter) => {
    let result = TRANSACTIONS_LIST.map((t, idx) => ({ ...t, originalIndex: idx }));
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      result = result.filter(t =>
        t.desc.toLowerCase().includes(q) ||
        t.ref.toLowerCase().includes(q) ||
        t.date.includes(q)
      );
    }
    if (typeFilter !== 'ALL') {
      result = result.filter(t => t.type === typeFilter);
    }
    if (sourceFilter !== 'ALL') {
      result = result.filter(t => getSourceKey(t) === sourceFilter);
    }
    result.sort((a, b) => {
      if (sortOrder === 'DATE_DESC') {
        const dateDiff = parseDateStr(b.date) - parseDateStr(a.date);
        if (dateDiff !== 0) return dateDiff;
        return b.originalIndex - a.originalIndex;
      }
      if (sortOrder === 'DATE_ASC') {
        const dateDiff = parseDateStr(a.date) - parseDateStr(b.date);
        if (dateDiff !== 0) return dateDiff;
        return a.originalIndex - b.originalIndex;
      }
      return sortOrder === 'DESC' ? b.amount - a.amount : a.amount - b.amount;
    });
    return result;
  };

  const filteredAllTx = useMemo(() => getFilteredTx('ALL'), [searchTerm, sortOrder, sourceFilter, activeData]);
  const filteredCrTx  = useMemo(() => getFilteredTx('CR'),  [searchTerm, sortOrder, sourceFilter, activeData]);
  const filteredDrTx  = useMemo(() => getFilteredTx('DR'),  [searchTerm, sortOrder, sourceFilter, activeData]);

  if (!isUnlocked) {
    return (
      <div className="section-card" style={{ maxWidth: '480px', margin: '40px auto', padding: '32px' }}>
        <h3 className="section-card__title" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span>🔒</span> Confidential Statement Auditor
        </h3>
        <p style={{ color: 'var(--muted)', fontSize: '0.95rem', marginBottom: '24px' }}>
          This area contains highly confidential forensic audit insights. Please enter the treasurer authorization password to proceed.
        </p>
        <form onSubmit={handleUnlock}>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', fontSize: '0.9rem' }}>
              Authorization Password
            </label>
            <input
              type="password"
              placeholder="Enter password..."
              value={password}
              onChange={(e) => setPassword(e.target.value)}
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
          {errorMsg && (
            <p style={{ color: 'var(--coral)', fontSize: '0.85rem', marginBottom: '16px', fontWeight: '500' }}>
              ⚠️ {errorMsg}
            </p>
          )}
          <button
            type="submit"
            className="action-btn"
            style={{ width: '100%', display: 'flex', justifyContent: 'center', background: 'var(--teal)', color: 'white' }}
          >
            Unlock Auditor Workspace
          </button>
        </form>
      </div>
    );
  }

  const getTxStyle = (tx) => {
    const d = tx.desc.toUpperCase();
    if (d.includes('VIVISH TECHNOLOGIES'))
      return { border: '#31553e', label: 'Vivish PG (NEFT)', dot: '#31553e' };
    if (d.includes('FD BOOKING') || d.includes('SWEEP IN') || d.includes('SWEEP-IN') || d.includes('FIXED DEPOSIT') || d.includes('FD CRED') || d.includes('FD REDEEM') || d.includes('REDEEM PRINCIPAL') || d.includes('REDEEM INTEREST'))
      return { border: '#10b981', label: 'Fixed Deposit (FD)', dot: '#10b981' };
    if (d.includes('TATA PLAY'))
      return { border: '#3b82f6', label: 'Tata Play Refund', dot: '#3b82f6' };
    if (d.startsWith('UPI') || d.includes('UPI SETTLEMENT') || d.includes('UPI-') || d.includes('IMPS-'))
      return { border: '#8b5cf6', label: 'UPI / IMPS', dot: '#8b5cf6' };
    if (d.includes('CHQ DEP') || d.includes('CHEQUE DEP'))
      return { border: '#b98216', label: 'Cheque Deposit', dot: '#b98216' };
    if (d.includes('MAJESTIQUE EURISKA C') || d.includes('MAJESTIQUE EURISKA B'))
      return { border: '#196c6c', label: 'Inter-Building Transfer', dot: '#196c6c' };
    if (tx.type === 'DR' && (d.includes('CHQ PAID') || d.includes('SELF - CHQ') || d.includes('SAFETY SOLUTIONS') || d.includes('DR -')))
      return { border: '#c2644a', label: 'Cheque Payment (DR)', dot: '#c2644a' };
    return { border: 'transparent', label: 'Other', dot: '#9ca3af' };
  };

  const COLOR_LEGEND = [
    { dot: '#31553e', label: 'Vivish PG (NEFT)',        desc: 'Maintenance collections via Vivish Technologies NEFT' },
    { dot: '#10b981', label: 'Fixed Deposit (FD)',      desc: 'FD booking debit transactions and Sweep-In credits' },
    { dot: '#b98216', label: 'Cheque Deposit (CR)',      desc: 'Physical cheques deposited (CHQ DEP / CTS clearing)' },
    { dot: '#8b5cf6', label: 'UPI / IMPS',              desc: 'UPI settlements, IMPS member transfers' },
    { dot: '#3b82f6', label: 'Tata Play Refund',        desc: 'Broadband / OTT vendor credit/refund' },
    { dot: '#196c6c', label: 'Inter-Building Transfer', desc: 'Fund transfers between A ↔ B ↔ C buildings' },
    { dot: '#c2644a', label: 'Cheque Payment (DR)',      desc: 'Outgoing vendor / staff cheques (CHQ PAID)' },
  ];

  const SOURCE_FILTERS = [
    { key: 'ALL',      label: '✦ All',              dot: '#9ca3af' },
    { key: 'VIVISH',   label: 'Vivish NEFT',        dot: '#31553e' },
    { key: 'FD',       label: 'Fixed Deposit',      dot: '#10b981' },
    { key: 'CHQ_DEP',  label: 'Cheque Deposit',     dot: '#b98216' },
    { key: 'UPI_IMPS', label: 'UPI / IMPS',         dot: '#8b5cf6' },
    { key: 'TATA_PLAY',label: 'Tata Play',           dot: '#3b82f6' },
    { key: 'INTER_FT', label: 'Inter-Building FT',  dot: '#196c6c' },
    { key: 'CHQ_PAID', label: 'Cheque Payment (DR)', dot: '#c2644a' },
    { key: 'OTHER',    label: 'Other',               dot: '#6b7280' },
  ];

  const renderTable = (transactions) => {
    const totalCR = transactions.filter(t => t.type === 'CR').reduce((s, t) => s + t.amount, 0);
    const totalDR = transactions.filter(t => t.type === 'DR').reduce((s, t) => s + t.amount, 0);
    const txCount = transactions.length;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{
          display: 'flex', flexDirection: 'column', gap: '10px',
          padding: '12px 16px',
          background: 'var(--bg-strong)',
          borderRadius: '10px',
          border: '1px solid var(--line)'
        }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: '700', color: 'var(--muted)', letterSpacing: '0.05em', marginRight: '2px' }}>FILTER:</span>
            {SOURCE_FILTERS.map(f => {
              const active = sourceFilter === f.key;
              return (
                <button
                  key={f.key}
                  onClick={() => setSourceFilter(f.key)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '5px',
                    padding: '4px 10px',
                    borderRadius: '20px',
                    border: `1px solid ${active ? f.dot : f.dot + '55'}`,
                    background: active ? `${f.dot}22` : 'transparent',
                    cursor: 'pointer',
                    fontSize: '0.75rem',
                    fontWeight: active ? '700' : '500',
                    color: active ? f.dot : 'var(--muted)',
                    transition: 'all 0.15s ease',
                    outline: 'none',
                  }}
                >
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: f.dot, display: 'inline-block', flexShrink: 0 }} />
                  {f.label}
                </button>
              );
            })}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center', borderTop: '1px solid var(--line)', paddingTop: '10px' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: '700', color: 'var(--muted)', letterSpacing: '0.05em', marginRight: '2px' }}>COLOUR KEY:</span>
            {COLOR_LEGEND.map((item, i) => (
              <div key={i} title={item.desc} style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'default' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: item.dot, display: 'inline-block', flexShrink: 0 }} />
                <span style={{ fontSize: '0.72rem', color: item.dot, fontWeight: '600' }}>{item.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="task-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--bg-strong)', textAlign: 'left' }}>
                <th style={{ padding: '12px' }}>Date</th>
                <th style={{ padding: '12px' }}>Narration</th>
                <th style={{ padding: '12px' }}>Chq / Ref No.</th>
                <th style={{ padding: '12px', textAlign: 'right' }}>Outflow (DR)</th>
                <th style={{ padding: '12px', textAlign: 'right' }}>Inflow (CR)</th>
                <th style={{ padding: '12px', textAlign: 'right' }}>Running Balance</th>
              </tr>
            </thead>
            <tbody>
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: '32px', textAlign: 'center', color: 'var(--muted)', fontSize: '0.9rem' }}>
                    No transactions match the selected filter.
                  </td>
                </tr>
              ) : transactions.map((tx, idx) => {
                const txStyle = getTxStyle(tx);
                return (
                  <tr key={idx} style={{
                    borderBottom: '1px solid var(--line)',
                    fontSize: '0.85rem',
                    borderLeft: `3px solid ${txStyle.border}`,
                  }}>
                    <td style={{ padding: '12px', whiteSpace: 'nowrap', color: 'var(--muted)', fontSize: '0.8rem' }}>{tx.date}</td>
                    <td style={{ padding: '12px' }}>
                      <span className={`badge ${tx.type === 'CR' ? 'badge--green' : 'badge--coral'}`} style={{ marginRight: '8px', padding: '2px 6px', fontSize: '0.7rem' }}>
                        {tx.type}
                      </span>
                      <span style={{ fontWeight: '500', color: txStyle.border !== 'transparent' ? txStyle.border : 'inherit' }}>
                        {tx.desc}
                      </span>
                    </td>
                    <td style={{ padding: '12px', color: 'var(--muted)', fontFamily: 'monospace', fontSize: '0.78rem' }}>{tx.ref}</td>
                    <td style={{ padding: '12px', textAlign: 'right', color: 'var(--coral)', fontWeight: '600' }}>
                      {tx.type === 'DR' ? fmtAmt(tx.amount) : ''}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'right', color: 'var(--pine)', fontWeight: '600' }}>
                      {tx.type === 'CR' ? fmtAmt(tx.amount) : ''}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'right', fontWeight: '500' }}>{fmtAmt(tx.bal)}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr style={{
                background: 'var(--bg-strong)',
                borderTop: '2px solid var(--line)',
                fontWeight: '700',
                fontSize: '0.9rem'
              }}>
                <td style={{ padding: '14px 12px' }} colSpan={3}>
                  <span style={{ color: 'var(--muted)', fontSize: '0.8rem', fontWeight: '500' }}>
                    TOTAL — {txCount} transaction{txCount !== 1 ? 's' : ''}
                  </span>
                </td>
                <td style={{ padding: '14px 12px', textAlign: 'right', color: totalDR > 0 ? 'var(--coral)' : 'var(--muted)' }}>
                  {totalDR > 0 ? fmtAmt(totalDR) : '—'}
                </td>
                <td style={{ padding: '14px 12px', textAlign: 'right', color: totalCR > 0 ? 'var(--pine)' : 'var(--muted)' }}>
                  {totalCR > 0 ? fmtAmt(totalCR) : '—'}
                </td>
                <td style={{ padding: '14px 12px', textAlign: 'right', color: 'var(--muted)', fontSize: '0.8rem' }}>
                  Net: <span style={{ color: (totalCR - totalDR) >= 0 ? 'var(--pine)' : 'var(--coral)', fontWeight: '700' }}>
                    {fmtAmt(totalCR - totalDR)}
                  </span>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Statement Period Switcher & Header Bar */}
      <div className="section-card" style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '16px', padding: '20px 24px', borderLeft: '4px solid var(--teal)' }}>
        <div>
          <span className="badge badge--teal" style={{ marginBottom: '6px' }}>HDFC BANK ACCOUNT #50200075533530</span>
          <h2 style={{ margin: '4px 0', fontSize: '1.4rem', color: 'var(--text-strong)' }}>
            Statement Auditor & Forensic Explorer
          </h2>
          <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--muted)' }}>
            Active Period: <strong>{STATEMENT_PERIOD}</strong> ({TRANSACTIONS_LIST.length} Total Transactions)
          </p>
        </div>

        {/* Period Selector Pills */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--muted)', marginRight: '4px' }}>PERIOD:</span>
          
          <button
            className={`action-btn ${selectedPeriod === 'ALL_TIME' ? 'action-btn--primary' : ''}`}
            onClick={() => setSelectedPeriod('ALL_TIME')}
            style={selectedPeriod === 'ALL_TIME' ? { background: '#31553e', color: 'white', fontWeight: '700' } : { borderColor: '#31553e', color: '#31553e' }}
          >
            🌟 FY 26 (Apr – Jul 26)
          </button>

          <button
            className={`action-btn ${selectedPeriod === 'FY2025_26' ? 'action-btn--primary' : ''}`}
            onClick={() => setSelectedPeriod('FY2025_26')}
            style={selectedPeriod === 'FY2025_26' ? { background: '#b98216', color: 'white', fontWeight: '700' } : { borderColor: '#b98216', color: '#b98216' }}
          >
            📜 FY 2025-26 Full Year
          </button>

          <button
            className={`action-btn ${selectedPeriod === 'FY2024_25' ? 'action-btn--primary' : ''}`}
            onClick={() => setSelectedPeriod('FY2024_25')}
            style={selectedPeriod === 'FY2024_25' ? { background: '#0284c7', color: 'white', fontWeight: '700' } : { borderColor: '#0284c7', color: '#0284c7' }}
          >
            📜 FY 2024-25 Full Year
          </button>

          <button
            className={`action-btn ${selectedPeriod === 'FY2023_24' ? 'action-btn--primary' : ''}`}
            onClick={() => setSelectedPeriod('FY2023_24')}
            style={selectedPeriod === 'FY2023_24' ? { background: '#8b5cf6', color: 'white', fontWeight: '700' } : { borderColor: '#8b5cf6', color: '#8b5cf6' }}
          >
            📜 FY 2023-24 Full Year
          </button>

          <button
            className={`action-btn ${selectedPeriod === 'FY2022_23' ? 'action-btn--primary' : ''}`}
            onClick={() => setSelectedPeriod('FY2022_23')}
            style={selectedPeriod === 'FY2022_23' ? { background: '#c2644a', color: 'white', fontWeight: '700' } : { borderColor: '#c2644a', color: '#c2644a' }}
          >
            📜 FY 2022-23 (Inception)
          </button>

          <button
            className={`action-btn ${selectedPeriod === 'APRIL_2026' ? 'action-btn--primary' : ''}`}
            onClick={() => setSelectedPeriod('APRIL_2026')}
            style={selectedPeriod === 'APRIL_2026' ? { background: '#196c6c', color: 'white' } : {}}
          >
            📅 April 2026
          </button>

          <button
            className={`action-btn ${selectedPeriod === 'MAY_2026' ? 'action-btn--primary' : ''}`}
            onClick={() => setSelectedPeriod('MAY_2026')}
            style={selectedPeriod === 'MAY_2026' ? { background: '#196c6c', color: 'white' } : {}}
          >
            📅 May 2026
          </button>

          <button
            className={`action-btn ${selectedPeriod === 'JUNE_2026' ? 'action-btn--primary' : ''}`}
            onClick={() => setSelectedPeriod('JUNE_2026')}
            style={selectedPeriod === 'JUNE_2026' ? { background: '#196c6c', color: 'white' } : {}}
          >
            📅 June 2026
          </button>

          <button
            className={`action-btn ${selectedPeriod === 'JULY_2026' ? 'action-btn--primary' : ''}`}
            onClick={() => setSelectedPeriod('JULY_2026')}
            style={selectedPeriod === 'JULY_2026' ? { background: '#196c6c', color: 'white' } : {}}
          >
            📅 July 2026
          </button>

          {customParsedData && (
            <button
              className={`action-btn ${selectedPeriod === 'CUSTOM' ? 'action-btn--primary' : ''}`}
              onClick={() => setSelectedPeriod('CUSTOM')}
              style={selectedPeriod === 'CUSTOM' ? { background: '#8b5cf6', color: 'white' } : {}}
            >
              ✨ Custom Parsed
            </button>
          )}

          <button
            className="action-btn"
            onClick={() => setActiveSubTab('live_auditor')}
            style={{ borderColor: '#8b5cf6', color: '#8b5cf6', fontWeight: '600' }}
          >
            ⚡ Live Text Auditor Tool
          </button>
        </div>
      </div>

      {/* Trend Comparison Bar — dynamic per selected period */}
      <div className="section-card" style={{ background: 'var(--bg-strong)', padding: '16px 20px', borderRadius: '12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '10px' }}>
          <h4 style={{ margin: 0, fontSize: '0.92rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>📈</span>
            {selectedPeriod === 'FY2025_26'
              ? 'FY 2025-26 Monthly Financial Breakdown (Apr 2025 – Mar 2026)'
              : selectedPeriod === 'FY2024_25'
              ? 'FY 2024-25 Monthly Financial Breakdown (Apr 2024 – Mar 2025)'
              : selectedPeriod === 'FY2023_24'
              ? 'FY 2023-24 Monthly Financial Breakdown (Apr 2023 – Mar 2024)'
              : selectedPeriod === 'FY2022_23'
              ? 'FY 2022-23 Monthly Financial Breakdown (Dec 2022 – Mar 2023)'
              : '4-Month Financial Trend Comparison: April, May, June & July 2026'}
          </h4>
          <span style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>
            Calculated from HDFC Bank Verified Statements
          </span>
        </div>

        {selectedPeriod === 'FY2025_26' || selectedPeriod === 'FY2024_25' || selectedPeriod === 'FY2023_24' || selectedPeriod === 'FY2022_23' ? (
          /* monthly grid from timelineData */
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '10px' }}>
            {TIMELINE_DATA.map((m, idx) => {
              const net = m.credit - m.debit;
              const isPos = net >= 0;
              return (
                <div key={idx} style={{ padding: '11px 12px', background: 'var(--bg-card)', borderRadius: '8px', border: `1px solid ${isPos ? 'var(--line)' : '#c2644a44'}` }}>
                  <span style={{ fontSize: '0.73rem', color: 'var(--muted)', display: 'block', fontWeight: '600' }}>{m.date}</span>
                  <strong style={{ fontSize: '0.98rem', color: isPos ? 'var(--pine)' : 'var(--coral)' }}>
                    {isPos ? '+ ' : '- '}₹ {Math.abs(net).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                  </strong>
                  <span style={{ fontSize: '0.68rem', display: 'block', color: 'var(--muted)', marginTop: '2px' }}>
                    CR: ₹{(m.credit/100000).toFixed(1)}L | DR: ₹{(m.debit/100000).toFixed(1)}L
                  </span>
                  <span style={{ fontSize: '0.65rem', display: 'block', color: 'var(--muted)' }}>
                    Bal: ₹{(m.balance/100000).toFixed(2)}L
                  </span>
                </div>
              );
            })}
            <div style={{ padding: '11px 12px', background: 'var(--bg-card)', borderRadius: '8px', border: `2px solid ${NET_CASH_FLOW >= 0 ? 'var(--pine)' : 'var(--coral)'}` }}>
              <span style={{ fontSize: '0.73rem', color: NET_CASH_FLOW >= 0 ? 'var(--pine)' : 'var(--coral)', fontWeight: '700', display: 'block' }}>
                {NET_CASH_FLOW >= 0 ? '🌟 Overall Profit' : '⚠️ Overall Deficit'}
              </span>
              <strong style={{ fontSize: '0.98rem', color: NET_CASH_FLOW >= 0 ? 'var(--pine)' : 'var(--coral)' }}>
                {NET_CASH_FLOW >= 0 ? '+ ' : '- '}₹ {Math.abs(NET_CASH_FLOW).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </strong>
              <span style={{ fontSize: '0.68rem', display: 'block', color: 'var(--muted)', marginTop: '2px' }}>
                CR: ₹{(TOTAL_CREDITS/100000).toFixed(1)}L | DR: ₹{(TOTAL_DEBITS/100000).toFixed(1)}L
              </span>
              <span style={{ fontSize: '0.65rem', display: 'block', color: 'var(--muted)' }}>
                Bal: ₹{OPENING_BALANCE.toLocaleString('en-IN', { maximumFractionDigits: 0 })} → ₹{CLOSING_BALANCE.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </span>
              {fdPrincipalFlow !== 0 && (
                <span style={{ fontSize: '0.63rem', display: 'block', color: 'var(--muted)', marginTop: '4px', borderTop: '1px dashed var(--line)', paddingTop: '4px' }}>
                  Ops Net: <strong style={{ color: (NET_CASH_FLOW - fdPrincipalFlow) >= 0 ? 'var(--pine)' : 'var(--coral)' }}>
                    {fmtAmt(NET_CASH_FLOW - fdPrincipalFlow)}
                  </strong> (Excl. FD)
                </span>
              )}
            </div>
          </div>
        ) : (
          /* Standard 4-month 2026 view */
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
            <div style={{ padding: '12px', background: 'var(--bg-card)', borderRadius: '8px', border: '1px solid var(--line)' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--muted)', display: 'block' }}>April 2026 Net Flow</span>
              <strong style={{ fontSize: '1.02rem', color: 'var(--pine)' }}>+ ₹ 15,697.50</strong>
              <span style={{ fontSize: '0.7rem', display: 'block', color: 'var(--muted)', marginTop: '2px' }}>Inflow: ₹2.79L | Outflow: ₹2.63L</span>
            </div>
            <div style={{ padding: '12px', background: 'var(--bg-card)', borderRadius: '8px', border: '1px solid var(--line)' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--muted)', display: 'block' }}>May 2026 Net Flow</span>
              <strong style={{ fontSize: '1.02rem', color: 'var(--pine)' }}>+ ₹ 1,68,517.31</strong>
              <span style={{ fontSize: '0.7rem', display: 'block', color: 'var(--muted)', marginTop: '2px' }}>Inflow: ₹3.92L | Outflow: ₹2.24L</span>
            </div>
            <div style={{ padding: '12px', background: 'var(--bg-card)', borderRadius: '8px', border: '1px solid var(--line)' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--muted)', display: 'block' }}>June 2026 Net Flow</span>
              <strong style={{ fontSize: '1.02rem', color: 'var(--pine)' }}>+ ₹ 1,31,890.01</strong>
              <span style={{ fontSize: '0.7rem', display: 'block', color: 'var(--muted)', marginTop: '2px' }}>Inflow: ₹3.69L | Outflow: ₹2.37L</span>
            </div>
            <div style={{ padding: '12px', background: 'var(--bg-card)', borderRadius: '8px', border: '1px solid var(--line)' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--muted)', display: 'block' }}>July 2026 Net Flow</span>
              <strong style={{ fontSize: '1.02rem', color: 'var(--coral)' }}>- ₹ 40,854.28</strong>
              <span style={{ fontSize: '0.7rem', display: 'block', color: 'var(--muted)', marginTop: '2px' }}>Inflow: ₹2.96L | Outflow: ₹3.37L</span>
            </div>
            <div style={{ padding: '12px', background: 'var(--bg-card)', borderRadius: '8px', border: '2px solid var(--pine)' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--pine)', fontWeight: '700', display: 'block' }}>🌟 Overall Profit (4 Months)</span>
              <strong style={{ fontSize: '1.05rem', color: 'var(--pine)' }}>+ ₹ 2,75,250.54</strong>
              <span style={{ fontSize: '0.7rem', display: 'block', color: 'var(--muted)', marginTop: '2px' }}>Bal: ₹1.49L → ₹4.24L (+184.6%)</span>
            </div>
          </div>
        )}
      </div>

      {/* Sub-Tab Navigation Bar */}
      <div className="section-card" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '14px' }}>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center' }}>
          <button 
            className={`action-btn ${activeSubTab === 'dashboard' ? 'action-btn--primary' : ''}`}
            onClick={() => setActiveSubTab('dashboard')}
          >
            📊 Dashboard
          </button>
          <button 
            className={`action-btn ${activeSubTab === 'ledger' ? 'action-btn--primary' : ''}`}
            onClick={() => setActiveSubTab('ledger')}
          >
            🧾 Transactions Log
          </button>
          <button 
            className={`action-btn ${activeSubTab === 'inflow' ? 'action-btn--primary' : ''}`}
            onClick={() => setActiveSubTab('inflow')}
          >
            📥 Inflow (CR) Log
          </button>
          <button 
            className={`action-btn ${activeSubTab === 'fixed_deposits' ? 'action-btn--primary' : ''}`}
            onClick={() => setActiveSubTab('fixed_deposits')}
            style={activeSubTab === 'fixed_deposits' ? { background: '#196c6c', borderColor: '#196c6c', color: 'white' } : { borderColor: '#196c6c', color: '#196c6c' }}
          >
            💼 Fixed Deposits (FD)
          </button>
          <button 
            className={`action-btn ${activeSubTab === 'outflow' ? 'action-btn--primary' : ''}`}
            onClick={() => setActiveSubTab('outflow')}
          >
            📤 Outflow (DR) Log
          </button>
          <button 
            className={`action-btn ${activeSubTab === 'vendors' ? 'action-btn--primary' : ''}`}
            onClick={() => setActiveSubTab('vendors')}
          >
            🤝 Vendor Analysis
          </button>
          <button 
            className={`action-btn ${activeSubTab === 'audit' ? 'action-btn--primary' : ''}`}
            onClick={() => setActiveSubTab('audit')}
          >
            🔍 Forensic Audit
          </button>
          <button 
            className={`action-btn ${activeSubTab === 'live_auditor' ? 'action-btn--primary' : ''}`}
            onClick={() => setActiveSubTab('live_auditor')}
            style={activeSubTab === 'live_auditor' ? { background: '#8b5cf6', borderColor: '#8b5cf6', color: 'white' } : { borderColor: '#8b5cf6', color: '#8b5cf6' }}
          >
            ⚡ Live Statement Auditor
          </button>
          <button 
            className={`action-btn ${activeSubTab === 'reports' ? 'action-btn--primary' : ''}`}
            onClick={() => setActiveSubTab('reports')}
            style={activeSubTab === 'reports' ? {} : { borderColor: '#196c6c', color: '#196c6c' }}
          >
            📋 Reports & Print
          </button>
        </div>
      </div>

      {/* Primary KPI Metrics */}
      <div className="metrics-grid">
        <div className="metric-card metric-card--teal">
          <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--muted)' }}>Starting / Opening Balance</p>
          <h3 style={{ color: 'var(--teal)' }}>{fmtAmt(OPENING_BALANCE)}</h3>
          <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--muted)' }}>
            {selectedPeriod === 'ALL_TIME' ? 'As on 01 April 2026' : selectedPeriod === 'FY2025_26' ? 'As on 02 April 2025' : selectedPeriod === 'FY2024_25' ? 'As on 02 April 2024' : selectedPeriod === 'FY2023_24' ? 'As on 01 April 2023' : selectedPeriod === 'FY2022_23' ? 'As on 01 December 2022' : 'Verified starting limit'}
          </p>
        </div>
        <div className="metric-card metric-card--pine">
          <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--muted)' }}>Total Collections (CR)</p>
          <h3 style={{ color: 'var(--pine)' }}>{fmtAmt(TOTAL_CREDITS)}</h3>
          <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--muted)' }}>
            {TRANSACTIONS_LIST.filter(t => t.type === 'CR').length} Cleared Credits
          </p>
        </div>
        <div className="metric-card metric-card--coral">
          <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--muted)' }}>Total Expenses (DR)</p>
          <h3 style={{ color: 'var(--coral)' }}>{fmtAmt(TOTAL_DEBITS)}</h3>
          <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--muted)' }}>
            {TRANSACTIONS_LIST.filter(t => t.type === 'DR').length} Approved Debits
          </p>
        </div>
        <div className="metric-card metric-card--sand">
          <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--muted)' }}>Overall Profit / Net Flow</p>
          <h3 style={{ color: NET_CASH_FLOW >= 0 ? 'var(--pine)' : 'var(--coral)' }}>
            {fmtAmt(NET_CASH_FLOW)}
          </h3>
          <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--muted)' }}>
            Closing Reserve: <strong>{fmtAmt(CLOSING_BALANCE)}</strong>
          </p>
          {fdPrincipalFlow !== 0 && (
            <p style={{ margin: '4px 0 0', fontSize: '0.68rem', color: 'var(--muted)', borderTop: '1px solid var(--line)', paddingTop: '4px' }}>
              Operational Net: <strong style={{ color: (NET_CASH_FLOW - fdPrincipalFlow) >= 0 ? 'var(--pine)' : 'var(--coral)' }}>
                {fmtAmt(NET_CASH_FLOW - fdPrincipalFlow)}
              </strong>
              <span style={{ display: 'block', fontSize: '0.62rem', opacity: 0.8 }}>(Excl. FD Principal movements)</span>
            </p>
          )}
        </div>
      </div>

      {/* Content Render based on Sub-Tab */}
      {activeSubTab === 'dashboard' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Main Trend Chart */}
          <div className="section-card">
            <h3 className="section-card__title">
              Account Balance & Monthly Cash Flow ({STATEMENT_PERIOD})
            </h3>
            <div style={{ height: '350px', width: '100%' }}>
              <ResponsiveContainer width="100%" height="100%">
                {selectedPeriod === 'ALL_TIME' || selectedPeriod === 'FY2025_26' || selectedPeriod === 'FY2024_25' || selectedPeriod === 'FY2023_24' || selectedPeriod === 'FY2022_23' ? (
                  <BarChart data={TIMELINE_DATA}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis dataKey="date" />
                    <YAxis tickFormatter={(v) => `₹${v/1000}k`} />
                    <Tooltip formatter={(value) => fmtAmt(value)} />
                    <Legend />
                    <Bar name="Monthly Collections (CR)" dataKey="credit" fill="var(--pine)" radius={[4, 4, 0, 0]} />
                    <Bar name="Monthly Expenses (DR)" dataKey="debit" fill="var(--coral)" radius={[4, 4, 0, 0]} />
                    <Bar name="Closing Reserve Balance" dataKey="balance" fill="var(--teal)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                ) : (
                  <AreaChart data={TIMELINE_DATA}>
                    <defs>
                      <linearGradient id="colorBal" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--teal)" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="var(--teal)" stopOpacity={0.01}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis dataKey="date" />
                    <YAxis tickFormatter={(v) => `₹${v/1000}k`} />
                    <Tooltip formatter={(value) => fmtAmt(value)} />
                    <Legend />
                    <Area type="monotone" name="Running Balance" dataKey="balance" stroke="var(--teal)" fillOpacity={1} fill="url(#colorBal)" strokeWidth={2.5} />
                    <Area type="monotone" name="Daily Collections" dataKey="credit" stroke="var(--pine)" fill="none" strokeWidth={1.5} />
                    <Area type="monotone" name="Daily Expenses" dataKey="debit" stroke="var(--coral)" fill="none" strokeWidth={1.5} />
                  </AreaChart>
                )}
              </ResponsiveContainer>
            </div>
          </div>

          {/* Breakdown Pie Charts */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: '20px' }}>
            <div className="section-card">
              <h3 className="section-card__title">Income Categories Breakdown</h3>
              <div style={{ height: '240px', display: 'flex', alignItems: 'center' }}>
                <div style={{ width: '50%', height: '100%' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={INCOME_CATEGORIES}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {INCOME_CATEGORIES.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => fmtAmt(value)} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div style={{ width: '50%', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.8rem' }}>
                  {INCOME_CATEGORIES.map((cat, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: cat.color }} />
                      <span style={{ color: 'var(--muted)', flex: 1 }}>{cat.name}</span>
                      <strong style={{ color: 'var(--text-strong)' }}>{fmtAmt(cat.value)}</strong>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="section-card">
              <h3 className="section-card__title">Expense Outflow Categories</h3>
              <div style={{ height: '240px', display: 'flex', alignItems: 'center' }}>
                <div style={{ width: '50%', height: '100%' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={EXPENSE_CATEGORIES}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {EXPENSE_CATEGORIES.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => fmtAmt(value)} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div style={{ width: '50%', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.8rem' }}>
                  {EXPENSE_CATEGORIES.map((cat, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: cat.color }} />
                      <span style={{ color: 'var(--muted)', flex: 1 }}>{cat.name}</span>
                      <strong style={{ color: 'var(--text-strong)' }}>{fmtAmt(cat.value)}</strong>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {(activeSubTab === 'ledger' || activeSubTab === 'inflow' || activeSubTab === 'outflow') && (
        <div className="section-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
            <h3 className="section-card__title" style={{ margin: 0 }}>
              {activeSubTab === 'ledger' && "🧾 Full Ledger Entries"}
              {activeSubTab === 'inflow' && "📥 Inflow (CR) Logs"}
              {activeSubTab === 'outflow' && "📤 Outflow (DR) Logs"}
            </h3>

            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
              <input
                type="text"
                placeholder="Search narration, ref #, date..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  padding: '8px 14px',
                  borderRadius: '6px',
                  border: '1px solid var(--line)',
                  background: 'var(--bg-card)',
                  fontSize: '0.85rem',
                  width: '240px'
                }}
              />
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                style={{
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid var(--line)',
                  background: 'var(--bg-card)',
                  fontSize: '0.85rem'
                }}
              >
                <option value="DATE_DESC">Sort: Newest First</option>
                <option value="DATE_ASC">Sort: Oldest First</option>
                <option value="DESC">Sort: High Amount → Low</option>
                <option value="ASC">Sort: Low Amount → High</option>
              </select>
            </div>
          </div>

          {activeSubTab === 'ledger' && renderTable(filteredAllTx)}
          {activeSubTab === 'inflow' && renderTable(filteredCrTx)}
          {activeSubTab === 'outflow' && renderTable(filteredDrTx)}
        </div>
      )}

      {activeSubTab === 'fixed_deposits' && (
        <FixedDepositTracker isAdmin={isAdmin} />
      )}

      {activeSubTab === 'vendors' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div className="section-card">
            <h3 className="section-card__title">Vendor Payment Rankings ({STATEMENT_PERIOD})</h3>
            <div style={{ overflowX: 'auto' }}>
              <table className="task-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-strong)', textAlign: 'left' }}>
                    <th style={{ padding: '12px', width: '60px' }}>Rank</th>
                    <th style={{ padding: '12px' }}>Vendor / Contractor Name</th>
                    <th style={{ padding: '12px' }}>Category</th>
                    <th style={{ padding: '12px' }}>Cheque / Ref No.</th>
                    <th style={{ padding: '12px', textAlign: 'center' }}>Payments</th>
                    <th style={{ padding: '12px', textAlign: 'right' }}>Total Paid</th>
                    <th style={{ padding: '12px', textAlign: 'right' }}>% of Expenses</th>
                  </tr>
                </thead>
                <tbody>
                  {VENDORS_DATA.map((vendor, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid var(--line)', fontSize: '0.85rem' }}>
                      <td style={{ padding: '12px', fontWeight: '700', color: 'var(--teal)' }}>#{vendor.rank}</td>
                      <td style={{ padding: '12px', fontWeight: '600' }}>{vendor.name}</td>
                      <td style={{ padding: '12px', color: 'var(--muted)' }}>{vendor.type}</td>
                      <td style={{ padding: '12px' }}>
                        <span style={{
                          fontFamily: 'monospace',
                          fontSize: '0.8rem',
                          background: 'var(--bg-strong)',
                          border: '1px solid var(--line)',
                          borderRadius: '5px',
                          padding: '2px 8px',
                          color: 'var(--muted)',
                          whiteSpace: 'nowrap'
                        }}>{vendor.cheque}</span>
                      </td>
                      <td style={{ padding: '12px', textAlign: 'center' }}>{vendor.count}</td>
                      <td style={{ padding: '12px', textAlign: 'right', fontWeight: '600', color: 'var(--coral)' }}>{fmtAmt(vendor.total)}</td>
                      <td style={{ padding: '12px', textAlign: 'right', fontWeight: '500' }}>
                        {TOTAL_DEBITS > 0 ? ((vendor.total / TOTAL_DEBITS) * 100).toFixed(2) : 0}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeSubTab === 'audit' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div className="section-card">
            <h3 className="section-card__title">Forensic Audit & Internal Control Risks ({STATEMENT_PERIOD})</h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '16px' }}>
              <div style={{ borderLeft: '4px solid #ef4444', padding: '12px 16px', background: 'rgba(239, 68, 68, 0.05)', borderRadius: '0 8px 8px 0' }}>
                <span className="badge badge--coral" style={{ marginBottom: '6px', display: 'inline-block' }}>🔴 HIGH RISK</span>
                <strong style={{ display: 'block', margin: '4px 0' }}>Self Cheque Cash Withdrawals</strong>
                <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--muted)' }}>
                  Self cheque paid in cash at Mohammedwadi branch. Co-operative housing societies must enforce digital payouts or direct bank transfers. Cash withdrawals have zero traceability and represent high operational fraud risks.
                </p>
              </div>

              <div style={{ borderLeft: '4px solid #ef4444', padding: '12px 16px', background: 'rgba(239, 68, 68, 0.05)', borderRadius: '0 8px 8px 0' }}>
                <span className="badge badge--coral" style={{ marginBottom: '6px', display: 'inline-block' }}>🔴 HIGH RISK</span>
                <strong style={{ display: 'block', margin: '4px 0' }}>Electricity Utility Bills (MSEDCL) Analysis</strong>
                <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--muted)' }}>
                  MSEDCL payments represent one of the largest single operational outflows. Verify common meter billing & explore solar offset ROI.
                </p>
              </div>

              <div style={{ borderLeft: '4px solid var(--amber)', padding: '12px 16px', background: 'rgba(185, 130, 22, 0.05)', borderRadius: '0 8px 8px 0' }}>
                <span className="badge badge--amber" style={{ marginBottom: '6px', display: 'inline-block' }}>🟠 MEDIUM RISK</span>
                <strong style={{ display: 'block', margin: '4px 0' }}>Personal Contractor Payments</strong>
                <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--muted)' }}>
                  Direct cheques issued to individual names instead of verified firm/agency accounts. Requires validation of vendor registration and verification of TDS deduction compliances.
                </p>
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: '20px' }}>
            <div className="section-card">
              <h3 className="section-card__title">Top Management Action Items</h3>
              <ul style={{ paddingLeft: '20px', fontSize: '0.85rem', lineHeight: '1.6', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <li><strong>Enforce Cashless Petty Cash:</strong> Transition immediately from cash self-withdrawals to corporate prepaid debit cards with receipt tracking.</li>
                <li><strong>Reconcile MSEDCL Bills:</strong> Verify all electricity vouchers against physical bill copies for Mohammedwadi meters.</li>
                <li><strong>Common Area Solar Audit:</strong> With electricity bills at high totals, explore Solar panel ROI to reduce common load utility costs.</li>
                <li><strong>Inter-Building Accounts:</strong> Audit transfers with B & C Buildings to establish formal formula-based shared facility billing.</li>
              </ul>
            </div>

            <div className="section-card">
              <h3 className="section-card__title">Treasurer's MIS Report Summarized</h3>
              <div style={{ fontSize: '0.85rem', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', justify: 'space-between', borderBottom: '1px solid var(--line)', paddingBottom: '6px' }}>
                  <span>Period Collections:</span>
                  <strong style={{ color: 'var(--pine)' }}>{fmtAmt(TOTAL_CREDITS)}</strong>
                </div>
                <div style={{ display: 'flex', justify: 'space-between', borderBottom: '1px solid var(--line)', paddingBottom: '6px' }}>
                  <span>Period Expenses:</span>
                  <strong style={{ color: 'var(--coral)' }}>{fmtAmt(TOTAL_DEBITS)}</strong>
                </div>
                <div style={{ display: 'flex', justify: 'space-between', borderBottom: '1px solid var(--line)', paddingBottom: '6px' }}>
                  <span>Period Cash Flow:</span>
                  <strong style={{ color: NET_CASH_FLOW >= 0 ? 'var(--pine)' : 'var(--coral)' }}>{fmtAmt(NET_CASH_FLOW)}</strong>
                </div>
                <div style={{ display: 'flex', justify: 'space-between', borderBottom: '1px solid var(--line)', paddingBottom: '6px' }}>
                  <span>Closing Reserve Balance:</span>
                  <strong>{fmtAmt(CLOSING_BALANCE)}</strong>
                </div>
                <div style={{ display: 'flex', justify: 'space-between', paddingBottom: '6px' }}>
                  <span>Financial Health Score:</span>
                  <span style={{ fontWeight: '700', color: NET_CASH_FLOW >= 0 ? 'var(--pine)' : 'var(--amber)' }}>
                    {NET_CASH_FLOW >= 0 ? '92 / 100 (Exceptional)' : '76 / 100 (Average)'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Live Text Auditor Subtab */}
      {activeSubTab === 'live_auditor' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div className="section-card" style={{ border: '2px solid #8b5cf6', background: 'rgba(139, 92, 246, 0.03)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <span className="badge" style={{ background: '#8b5cf6', color: 'white', marginBottom: '6px' }}>⚡ LIVE PARSER & AUDIT ENGINE</span>
                <h3 className="section-card__title" style={{ margin: '4px 0', color: '#8b5cf6' }}>
                  Paste & Parse Bank Statement Text
                </h3>
                <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--muted)' }}>
                  Paste raw text copied from HDFC/ICICI/SBI bank statement PDFs or NetBanking tables to parse, audit, and analyze instantly.
                </p>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  className="action-btn"
                  style={{ fontSize: '0.8rem', padding: '6px 12px' }}
                  onClick={() => {
                    const txt = `Statement From : 01/04/2025 To : 31/03/2026
02/04/25 MAJESTIQUE EURISKA C BLDG SA GRU SAN MAR DR - 50200065450992 - MAJESTIQUE EURISKA C BLDG SA GRU SAN MAR 0000000000000254 02/04/25 2504 203660.9
03/04/25 SELF - CHQ PAID - NIBM KONDHWA 0000000000000255 03/04/25 10000 227692.4
05/04/25 CHQ PAID-MICR CTS-MU-SIDHARAM PARMESHWA 0000000000000256 05/04/25 10000 251821.4
10/04/25 CHQ PAID-MICR CTS-MU-SHUBHAM ENTERPRISES 0000000000000257 10/04/25 30983 276581.4
14/04/25 CHQ PAID-MICR CTS-MU-MARSHAL FORCE SECUR 0000000000000267 14/04/25 42970 184553.4
08/05/25 CHQ PAID-MICR CTS-RK-SCHINDLER INDIA P L 0000000000000272 08/05/25 89680 210493.9
23/05/25 CHQ PAID-MICR CTS-MU-MSEDCL 0000000000000293 23/05/25 56110 89281.9`;
                    setRawTextInput(txt);
                  }}
                >
                  📋 Load FY 25-26 Sample
                </button>

                <button
                  type="button"
                  className="action-btn"
                  style={{ fontSize: '0.8rem', padding: '6px 12px' }}
                  onClick={() => setRawTextInput('')}
                >
                  🗑️ Clear
                </button>
              </div>
            </div>

            <form onSubmit={handleParseSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <textarea
                rows={8}
                placeholder="Paste raw bank statement text here (e.g. copied from HDFC PDF/netbanking)..."
                value={rawTextInput}
                onChange={(e) => setRawTextInput(e.target.value)}
                style={{
                  width: '100%',
                  padding: '14px',
                  borderRadius: '8px',
                  border: '1px solid var(--line)',
                  background: 'var(--bg-card)',
                  fontFamily: 'monospace',
                  fontSize: '0.85rem',
                  lineHeight: '1.5',
                  outline: 'none'
                }}
              />

              {parseError && (
                <div style={{ color: 'var(--coral)', fontSize: '0.88rem', fontWeight: '500' }}>
                  ⚠️ {parseError}
                </div>
              )}

              {parseSuccessMsg && (
                <div style={{ color: 'var(--pine)', fontSize: '0.88rem', fontWeight: '600' }}>
                  ✅ {parseSuccessMsg}
                </div>
              )}

              <button
                type="submit"
                className="action-btn"
                style={{ background: '#8b5cf6', color: 'white', fontWeight: '600', padding: '12px 24px', fontSize: '0.95rem', alignSelf: 'flex-start' }}
              >
                ⚡ Parse & Audit Statement Now
              </button>
            </form>
          </div>

          {customParsedData && (
            <div className="section-card" style={{ borderLeft: '4px solid #8b5cf6' }}>
              <h3 className="section-card__title" style={{ color: '#8b5cf6' }}>
                Parsed Statement Summary ({customParsedData.period})
              </h3>

              <div className="metrics-grid" style={{ marginTop: '16px' }}>
                <div className="metric-card metric-card--teal">
                  <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--muted)' }}>Stated Opening Bal</p>
                  <h3 style={{ color: 'var(--teal)' }}>{fmtAmt(customParsedData.openingBalance)}</h3>
                </div>
                <div className="metric-card metric-card--pine">
                  <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--muted)' }}>Total Credits (Inflow)</p>
                  <h3 style={{ color: 'var(--pine)' }}>{fmtAmt(customParsedData.totalCredits)}</h3>
                </div>
                <div className="metric-card metric-card--coral">
                  <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--muted)' }}>Total Debits (Outflow)</p>
                  <h3 style={{ color: 'var(--coral)' }}>{fmtAmt(customParsedData.totalDebits)}</h3>
                </div>
                <div className="metric-card metric-card--sand">
                  <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--muted)' }}>Closing Balance</p>
                  <h3 style={{ color: 'var(--teal)' }}>{fmtAmt(customParsedData.closingBalance)}</h3>
                </div>
              </div>

              <div style={{ marginTop: '20px', display: 'flex', gap: '12px' }}>
                <button
                  className="action-btn action-btn--primary"
                  style={{ background: '#8b5cf6', borderColor: '#8b5cf6' }}
                  onClick={() => {
                    setSelectedPeriod('CUSTOM');
                    setActiveSubTab('dashboard');
                  }}
                >
                  📊 Load parsed statement into Dashboard & Full Explorer
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {activeSubTab === 'reports' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

          <div className="section-card" style={{ border: '2px solid var(--pine)', background: 'rgba(49,85,62,0.04)' }}>
            <h3 className="section-card__title" style={{ color: 'var(--pine)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>⚖️</span> Income & Expense Financial Statements (PDF / Print)
            </h3>
            <p style={{ color: 'var(--muted)', fontSize: '0.88rem', marginBottom: '20px' }}>
              Generate formal audit statements for <strong>{STATEMENT_PERIOD}</strong> with itemized collections and expenses breakdown.
            </p>
            
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
              <button
                className="action-btn action-btn--primary"
                style={{ background: 'var(--pine)', borderColor: 'var(--pine)', fontWeight: '600', padding: '10px 18px', fontSize: '0.92rem' }}
                onClick={() => {
                  const fmt = (v) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(v);
                  
                  const crTx = TRANSACTIONS_LIST.filter(t => t.type === 'CR');
                  const drTx = TRANSACTIONS_LIST.filter(t => t.type === 'DR');
                  const totalCR = crTx.reduce((s, t) => s + t.amount, 0);
                  const totalDR = drTx.reduce((s, t) => s + t.amount, 0);
                  const netFlow = totalCR - totalDR;

                  const vivishTx = crTx.filter(t => t.desc.toUpperCase().includes('VIVISH'));
                  const upiTx    = crTx.filter(t => {
                    const d = t.desc.toUpperCase();
                    return !d.includes('VIVISH') && (d.startsWith('UPI') || d.includes('UPI-') || d.includes('IMPS-') || d.includes('UPI SETTLEMENT'));
                  });
                  const tataTx   = crTx.filter(t => t.desc.toUpperCase().includes('TATA PLAY'));
                  const chqDepTx = crTx.filter(t => t.desc.toUpperCase().includes('CHQ DEP') || t.desc.toUpperCase().includes('CHEQUE DEP'));
                  const interTx  = crTx.filter(t => t.desc.toUpperCase().includes('MAJESTIQUE EURISKA C') || t.desc.toUpperCase().includes('MAJESTIQUE EURISKA B'));
                  const otherCr  = crTx.filter(t =>
                    !t.desc.toUpperCase().includes('VIVISH') &&
                    !t.desc.toUpperCase().includes('TATA PLAY') &&
                    !t.desc.toUpperCase().includes('CHQ DEP') &&
                    !t.desc.toUpperCase().includes('CHEQUE DEP') &&
                    !t.desc.toUpperCase().includes('MAJESTIQUE EURISKA C') &&
                    !t.desc.toUpperCase().includes('MAJESTIQUE EURISKA B') &&
                    !t.desc.toUpperCase().startsWith('UPI') &&
                    !t.desc.toUpperCase().includes('UPI SETTLEMENT')
                  );

                  const sumV  = vivishTx.reduce((s, t) => s + t.amount, 0);
                  const sumU  = upiTx.reduce((s, t) => s + t.amount, 0);
                  const sumT  = tataTx.reduce((s, t) => s + t.amount, 0);
                  const sumC  = chqDepTx.reduce((s, t) => s + t.amount, 0);
                  const sumI  = interTx.reduce((s, t) => s + t.amount, 0);
                  const sumO  = otherCr.reduce((s, t) => s + t.amount, 0);

                  const incomeGroupRows = [
                    { category: 'Maintenance Collections via Vivish PG (NEFT)', count: vivishTx.length, total: sumV, pct: (sumV/totalCR)*100 },
                    { category: 'Direct Cheque Deposits (CHQ DEP / CTS)', count: chqDepTx.length, total: sumC, pct: (sumC/totalCR)*100 },
                    { category: 'UPI / IMPS Direct Member Payments', count: upiTx.length, total: sumU, pct: (sumU/totalCR)*100 },
                    { category: 'Inter-Building Transfer Received', count: interTx.length, total: sumI, pct: (sumI/totalCR)*100 },
                    { category: 'Tata Play Vendor Refund / Reversal', count: tataTx.length, total: sumT, pct: (sumT/totalCR)*100 },
                    { category: 'Other Direct Deposits & Transfers', count: otherCr.length, total: sumO, pct: (sumO/totalCR)*100 },
                  ].filter(r => r.count > 0);

                  const incomeTableRows = incomeGroupRows.map(r => `
                    <tr>
                      <td style="padding:7px 10px">${r.category}</td>
                      <td style="padding:7px 10px;text-align:center">${r.count}</td>
                      <td style="padding:7px 10px;text-align:right;color:#31553e;font-weight:700">${fmt(r.total)}</td>
                      <td style="padding:7px 10px;text-align:right;color:#6b7280">${r.pct.toFixed(2)}%</td>
                    </tr>`).join('');

                  const expenseTableRows = VENDORS_DATA.map(v => `
                    <tr>
                      <td style="padding:7px 10px;font-weight:600">${v.name}</td>
                      <td style="padding:7px 10px;color:#6b7280">${v.type}</td>
                      <td style="padding:7px 10px;font-family:monospace;font-size:11px">${v.cheque}</td>
                      <td style="padding:7px 10px;text-align:right;color:#c2644a;font-weight:700">${fmt(v.total)}</td>
                      <td style="padding:7px 10px;text-align:right;color:#6b7280">${totalDR > 0 ? ((v.total/totalDR)*100).toFixed(2) : 0}%</td>
                    </tr>`).join('');

                  const html = `<!DOCTYPE html><html><head><title>Income & Expense Statement — ${STATEMENT_PERIOD}</title>
                    <style>
                      body { font-family: Arial, sans-serif; margin: 32px; color: #111; font-size: 13px; line-height: 1.5; }
                      h1 { color: #196c6c; font-size: 20px; margin: 0 0 2px; }
                      .sub-header { color: #6b7280; font-size: 12px; margin-bottom: 20px; }
                      .grid-2 { display: flex; gap: 24px; margin-top: 16px; }
                      .col { flex: 1; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; background: #fff; }
                      .col-title { font-size: 14px; font-weight: 700; border-bottom: 2px solid #196c6c; padding-bottom: 6px; margin: 0 0 12px; }
                      .col-title.exp { border-bottom-color: #c2644a; color: #c2644a; }
                      .col-title.inc { border-bottom-color: #31553e; color: #31553e; }
                      table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 12px; }
                      th { background: #f8fafc; padding: 8px 10px; text-align: left; border-bottom: 1px solid #e2e8f0; font-weight: 700; color: #475569; }
                      td { border-bottom: 1px solid #f1f5f9; }
                      tfoot tr td { background: #f8fafc; font-weight: 700; border-top: 2px solid #cbd5e1; padding: 10px; }
                      .kpi-row { display: flex; gap: 16px; margin-bottom: 20px; }
                      .kpi-box { flex: 1; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px; text-align: center; }
                      .kpi-box p { margin: 0; font-size: 11px; color: #64748b; }
                      .kpi-box h3 { margin: 4px 0 0; font-size: 18px; }
                      .sig-grid { display: flex; gap: 20px; margin-top: 40px; }
                      .sig-box { flex: 1; text-align: center; }
                      .sig-line { border-top: 1px solid #94a3b8; margin-top: 40px; paddingTop: 6px; font-size: 11px; font-weight: 700; color: #475569; }
                      @media print { button { display: none; } body { margin: 16px; } }
                    </style>
                  </head><body>
                    <div style="display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #196c6c;padding-bottom:12px;margin-bottom:16px">
                      <div>
                        <h1>🏢 MAJESTIQUE EURISKA A BUILDING CO-OP HOUSING SOCIETY LTD.</h1>
                        <div style="font-size:12px;color:#475569">Registration No: PNA/PNA(S)/HSG/(TC)/18320/2022-23 | Account #50200075533530</div>
                      </div>
                      <div style="text-align:right">
                        <div style="font-weight:700;color:#196c6c">INCOME & EXPENSE STATEMENT</div>
                        <div style="font-size:11px;color:#64748b">Period: ${STATEMENT_PERIOD}</div>
                      </div>
                    </div>

                    <div class="kpi-row">
                      <div class="kpi-box"><p>Opening Balance</p><h3 style="color:#196c6c">${fmt(OPENING_BALANCE)}</h3></div>
                      <div class="kpi-box"><p>Total Income (CR)</p><h3 style="color:#31553e">${fmt(totalCR)}</h3></div>
                      <div class="kpi-box"><p>Total Expenses (DR)</p><h3 style="color:#c2644a">${fmt(totalDR)}</h3></div>
                      <div class="kpi-box"><p>Net Cash Flow</p><h3 style="color:${netFlow>=0?'#31553e':'#c2644a'}">${fmt(netFlow)}</h3></div>
                      <div class="kpi-box"><p>Closing Balance</p><h3 style="color:#196c6c">${fmt(CLOSING_BALANCE)}</h3></div>
                    </div>

                    <div class="grid-2">
                      <div class="col">
                        <h3 class="col-title inc">📥 INCOME & RECEIPTS BREAKDOWN</h3>
                        <table>
                          <thead>
                            <tr><th>Income Category</th><th style="text-align:center">Tx</th><th style="text-align:right">Amount</th><th style="text-align:right">Share</th></tr>
                          </thead>
                          <tbody>${incomeTableRows}</tbody>
                          <tfoot>
                            <tr>
                              <td colSpan="2">TOTAL RECEIPTS (CR)</td>
                              <td style="text-align:right;color:#31553e">${fmt(totalCR)}</td>
                              <td style="text-align:right">100.00%</td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>

                      <div class="col">
                        <h3 class="col-title exp">📤 EXPENDITURE & PAYMENTS REGISTER</h3>
                        <table>
                          <thead>
                            <tr><th>Payee / Vendor</th><th>Category</th><th>Ref / Chq</th><th style="text-align:right">Amount</th><th style="text-align:right">Share</th></tr>
                          </thead>
                          <tbody>${expenseTableRows}</tbody>
                          <tfoot>
                            <tr>
                              <td colSpan="3">TOTAL OUTFLOW (EXPENSES)</td>
                              <td style="text-align:right;color:#c2644a">${fmt(totalDR)}</td>
                              <td style="text-align:right">100.00%</td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </div>

                    <div class="sig-grid">
                      <div class="sig-box"><div class="sig-line">Treasurer</div></div>
                      <div class="sig-box"><div class="sig-line">Secretary</div></div>
                      <div class="sig-box"><div class="sig-line">Chairman / President</div></div>
                      <div class="sig-box"><div class="sig-line">Internal Auditor</div></div>
                    </div>

                    <div style="margin-top:24px;text-align:center;font-size:11px;color:#9ca3af">
                      Statement Auditor System — Majestique Euriska A Building Society Portal | Report Generated: ${new Date().toLocaleDateString('en-IN', {day:'2-digit',month:'long',year:'numeric'})}
                    </div>
                  </body></html>`;

                  const w = window.open('', '_blank');
                  w.document.write(html);
                  w.document.close();
                  setTimeout(() => w.print(), 600);
                }}
              >
                📜 Print Side-by-Side Statement
              </button>
            </div>
          </div>

          <div className="section-card">
            <h3 className="section-card__title">📥 Download Transaction Data (CSV)</h3>
            <p style={{ color: 'var(--muted)', fontSize: '0.88rem', marginBottom: '20px' }}>
              Export <strong>{STATEMENT_PERIOD}</strong> transactions data as a CSV file for Excel / Google Sheets.
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
              {[
                { label: '📋 All Transactions', type: 'ALL', color: 'var(--teal)' },
                { label: '📥 Inflow (CR) Only', type: 'CR',  color: 'var(--pine)' },
                { label: '📤 Outflow (DR) Only', type: 'DR', color: 'var(--coral)' },
              ].map(({ label, type, color }) => (
                <button
                  key={type}
                  className="action-btn"
                  style={{ borderColor: color, color: color, fontWeight: '600' }}
                  onClick={() => {
                    const rows = TRANSACTIONS_LIST.filter(t => type === 'ALL' || t.type === type);
                    const header = ['Date', 'Type', 'Narration', 'Ref / Chq No', 'Withdrawal (DR)', 'Deposit (CR)', 'Closing Balance'];
                    const csvRows = rows.map(t => [
                      t.date, t.type,
                      `"${t.desc.replace(/"/g, '""')}"`,
                      t.ref,
                      t.type === 'DR' ? t.amount : '',
                      t.type === 'CR' ? t.amount : '',
                      t.bal
                    ]);
                    const csv = [header, ...csvRows].map(r => r.join(',')).join('\n');
                    const blob = new Blob([csv], { type: 'text/csv' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `MajestiqueEuriska_${selectedPeriod}_${type}.csv`;
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                >
                  ⬇ {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
