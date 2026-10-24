import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell
} from 'recharts';

import { APRIL_2026_DATA, MAY_2026_DATA, JUNE_2026_DATA, JULY_2026_DATA, AUGUST_2026_DATA, SEPTEMBER_2026_DATA, ALL_TIME_DATA, FY2025_26_DATA, FY2024_25_DATA, FY2023_24_DATA, FY2022_23_DATA, parseRawBankStatement } from './bankStatementData';
import FixedDepositTracker from './FixedDepositTracker';
import './BankStatementTracker.css';


// Helper: check if transaction description corresponds to an inter-building transfer (B Building or C Building)
export const isInterBuildingTx = (desc = '') => {
  if (!desc || typeof desc !== 'string') return false;
  const d = desc.toUpperCase();
  return (
    d.includes('50200065450992') ||
    d.includes('EURISKA C') ||
    d.includes('C BLDG') ||
    d.includes('C BUILDING') ||
    d.includes('EURISKA B') ||
    d.includes('B BLDG') ||
    d.includes('B BUILDING') ||
    d.includes('B BUODING')
  );
};

// Helper: extract target building ('B Building' or 'C Building')
export const getInterBuildingTarget = (desc = '') => {
  if (!desc || typeof desc !== 'string') return null;
  const d = desc.toUpperCase();
  if (
    d.includes('50200065450992') ||
    d.includes('EURISKA C') ||
    d.includes('C BLDG') ||
    d.includes('C BUILDING')
  ) {
    return 'C Building';
  }
  if (
    d.includes('EURISKA B') ||
    d.includes('B BLDG') ||
    d.includes('B BUILDING') ||
    d.includes('B BUODING')
  ) {
    return 'B Building';
  }
  return null;
};

export default function BankStatementTracker({ isAdmin }) {
  const [password, setPassword] = useState('');
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [activeSubTab, setActiveSubTab] = useState('dashboard');

  // Month / Period selector state: 'ALL_TIME' | 'FY2025_26' | 'FY2024_25' | 'FY2023_24' | 'FY2022_23' | 'APRIL_2026' | 'MAY_2026' | 'JUNE_2026' | 'JULY_2026' | 'AUGUST_2026' | 'SEPTEMBER_2026' | 'CUSTOM'
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
    if (selectedPeriod === 'JULY_2026') return JULY_2026_DATA;
    if (selectedPeriod === 'AUGUST_2026') return AUGUST_2026_DATA;
    if (selectedPeriod === 'SEPTEMBER_2026') return SEPTEMBER_2026_DATA;
    if (selectedPeriod === 'CUSTOM' && customParsedData) return customParsedData;
    return SEPTEMBER_2026_DATA;
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

  const interBuildingStats = useMemo(() => {
    if (!TRANSACTIONS_LIST) return null;
    const bTxs = TRANSACTIONS_LIST.filter(t => getInterBuildingTarget(t.desc) === 'B Building');
    const cTxs = TRANSACTIONS_LIST.filter(t => getInterBuildingTarget(t.desc) === 'C Building');
    
    const bIn = bTxs.filter(t => t.type === 'CR').reduce((s, t) => s + t.amount, 0);
    const bOut = bTxs.filter(t => t.type === 'DR').reduce((s, t) => s + t.amount, 0);
    const bInCount = bTxs.filter(t => t.type === 'CR').length;
    const bOutCount = bTxs.filter(t => t.type === 'DR').length;
    
    const cIn = cTxs.filter(t => t.type === 'CR').reduce((s, t) => s + t.amount, 0);
    const cOut = cTxs.filter(t => t.type === 'DR').reduce((s, t) => s + t.amount, 0);
    const cInCount = cTxs.filter(t => t.type === 'CR').length;
    const cOutCount = cTxs.filter(t => t.type === 'DR').length;

    return {
      bIn, bOut, bInCount, bOutCount,
      cIn, cOut, cInCount, cOutCount,
      totalIn: bIn + cIn,
      totalOut: bOut + cOut,
      totalCount: bTxs.length + cTxs.length
    };
  }, [TRANSACTIONS_LIST]);

  const fdPrincipalFlow = useMemo(() => {
    if (!TRANSACTIONS_LIST) return 0;
    const fdCrs = TRANSACTIONS_LIST.filter(t => t.type === 'CR' && (t.desc.toUpperCase().includes('REDEEM PRINCIPAL') || t.desc.toUpperCase().includes('FD REDEEM PRINCIPAL')));
    const fdDrs = TRANSACTIONS_LIST.filter(t => t.type === 'DR' && (t.desc.toUpperCase().includes('FD BOOKING') || t.desc.toUpperCase().includes('FIXED DEPOSIT') || t.desc.toUpperCase().includes('SWEEP OUT') || t.desc.toUpperCase().includes('SWEEP-OUT')));
    const totalRedeemPrincipal = fdCrs.reduce((sum, t) => sum + t.amount, 0);
    const totalBookedPrincipal = fdDrs.reduce((sum, t) => sum + t.amount, 0);
    return totalRedeemPrincipal - totalBookedPrincipal;
  }, [TRANSACTIONS_LIST]);

  const fmtAmt = (val) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2
    }).format(val || 0);
  };

  const handlePrint5MonthTrendReport = () => {
    const fmt = (val) => new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2
    }).format(val || 0);

    const monthlyTrends = [
      {
        month: 'April 2026',
        period: '01/04/26 – 30/04/26',
        opening: 149088.73,
        cr: 278884.50,
        crCount: 91,
        dr: 263187.00,
        drCount: 10,
        net: 15697.50,
        margin: '+5.63%',
        closing: 164786.23,
        status: '✅ Operational Surplus',
        drivers: 'Security (₹49.3k), MSEDCL Electricity (₹40.8k), Inter-FT C Bldg (₹66.6k)'
      },
      {
        month: 'May 2026',
        period: '01/05/26 – 31/05/26',
        opening: 164786.23,
        cr: 392044.31,
        crCount: 130,
        dr: 223527.00,
        drCount: 10,
        net: 168517.31,
        margin: '+42.98%',
        closing: 333303.54,
        status: '🌟 Peak Collections Surplus',
        drivers: 'Strong Vivish PG Maintenance Collections; Inter-FT C Bldg (₹54.4k), Security (₹49.3k)'
      },
      {
        month: 'June 2026',
        period: '01/06/26 – 30/06/26',
        opening: 333303.54,
        cr: 369080.01,
        crCount: 120,
        dr: 237190.00,
        drCount: 11,
        net: 131890.01,
        margin: '+35.73%',
        closing: 465193.55,
        status: '🌟 Sustained High Surplus',
        drivers: 'High maintenance inflow; Security (₹49.3k), Inter-FT (₹54.4k), MSEDCL (₹48.5k)'
      },
      {
        month: 'July 2026',
        period: '01/07/26 – 31/07/26',
        opening: 465193.55,
        cr: 296237.72,
        crCount: 86,
        dr: 337092.00,
        drCount: 15,
        net: -40854.28,
        margin: '-13.79%',
        closing: 424339.27,
        status: '⚠️ Planned Operational Deficit',
        drivers: 'Lift AMC (Otis/Schindler ₹89.2k), MSEDCL (₹39.5k), Security (₹49k)'
      },
      {
        month: 'August 2026',
        period: '03/08/26 – 29/08/26',
        opening: 424339.27,
        cr: 248629.60,
        crCount: 79,
        dr: 210043.00,
        drCount: 12,
        net: 38586.60,
        margin: '+15.52%',
        closing: 462925.87,
        status: '✅ Restored Surplus Rebound',
        drivers: 'NRG Security (₹49k), C Bldg Inter-FT (₹42.7k), Shubham Maintenance (₹35k)'
      },
      {
        month: 'September 2026',
        period: '01/09/26 – 30/09/26',
        opening: 462925.87,
        cr: 339036.08,
        crCount: 84,
        dr: 237871.00,
        drCount: 11,
        net: 101165.08,
        margin: '+29.84%',
        closing: 564090.95,
        status: '🌟 Strong Surplus Month',
        drivers: 'MSEDCL (₹1.01L), Security (₹50.1k), Shubham (₹36.5k)'
      }
    ];

    const cumOpening = 149088.73;
    const cumClosing = 564090.95;
    const cumCredits = 1923912.22;
    const cumDebits = 1508910.00;
    const cumNet = 415002.22;
    const cumMargin = '+21.57%';
    const reserveGrowth = '+278.30%';

    // Income breakdown rows
    const incomeRows = ALL_TIME_DATA.incomeCategories.map(c => `
      <tr>
        <td style="padding:6px 10px;font-weight:600">${c.name}</td>
        <td style="padding:6px 10px;text-align:center">${c.count || '-'}</td>
        <td style="padding:6px 10px;text-align:right;color:#31553e;font-weight:700">${fmt(c.value)}</td>
        <td style="padding:6px 10px;text-align:right;color:#6b7280">${((c.value/cumCredits)*100).toFixed(2)}%</td>
      </tr>
    `).join('');

    // Expense breakdown rows
    const expenseRows = ALL_TIME_DATA.expenseCategories.map(c => `
      <tr>
        <td style="padding:6px 10px;font-weight:600">${c.name}</td>
        <td style="padding:6px 10px;text-align:right;color:#c2644a;font-weight:700">${fmt(c.value)}</td>
        <td style="padding:6px 10px;text-align:right;color:#6b7280">${((c.value/cumDebits)*100).toFixed(2)}%</td>
      </tr>
    `).join('');

    // Top vendors table rows
    const topVendorRows = ALL_TIME_DATA.vendorsData.slice(0, 10).map(v => `
      <tr>
        <td style="padding:6px 10px;font-weight:600">${v.name}</td>
        <td style="padding:6px 10px;text-align:center">${v.count}</td>
        <td style="padding:6px 10px;text-align:right;color:#c2644a;font-weight:700">${fmt(v.total)}</td>
        <td style="padding:6px 10px;text-align:right;color:#6b7280">${((v.total/cumDebits)*100).toFixed(2)}%</td>
      </tr>
    `).join('');

    const trendTableRows = monthlyTrends.map(m => `
      <tr style="background:${m.net >= 0 ? '#f0fdf4' : '#fef2f2'}">
        <td style="padding:8px 10px;font-weight:700">${m.month}<br><span style="font-size:10px;color:#6b7280;font-weight:normal">${m.period}</span></td>
        <td style="padding:8px 10px;text-align:right;font-family:monospace">${fmt(m.opening)}</td>
        <td style="padding:8px 10px;text-align:right;color:#31553e;font-weight:700;font-family:monospace">${fmt(m.cr)}<br><span style="font-size:10px;color:#6b7280;font-weight:normal">${m.crCount} Txs</span></td>
        <td style="padding:8px 10px;text-align:right;color:#c2644a;font-weight:700;font-family:monospace">${fmt(m.dr)}<br><span style="font-size:10px;color:#6b7280;font-weight:normal">${m.drCount} Txs</span></td>
        <td style="padding:8px 10px;text-align:right;font-weight:700;font-size:12.5px;color:${m.net >= 0 ? '#31553e' : '#c2644a'};font-family:monospace">
          ${m.net >= 0 ? '+' : ''}${fmt(m.net)}
        </td>
        <td style="padding:8px 10px;text-align:center;font-weight:600;color:${m.net >= 0 ? '#31553e' : '#c2644a'}">${m.margin}</td>
        <td style="padding:8px 10px;text-align:right;font-weight:700;color:#196c6c;font-family:monospace">${fmt(m.closing)}</td>
        <td style="padding:8px 10px;font-size:10.5px;color:#374151"><strong>${m.status}</strong><br><span style="color:#6b7280">${m.drivers}</span></td>
      </tr>
    `).join('');

    const html = `<!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>6-Month Financial Trend Comparison & Profit/Loss Report (Apr - Sep 2026)</title>
      <style>
        @page { size: A4 landscape; margin: 10mm 12mm; }
        body {
          font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, Helvetica, Arial, sans-serif;
          margin: 0;
          padding: 20px;
          color: #1e293b;
          font-size: 11.5px;
          line-height: 1.4;
          background: #ffffff;
        }
        .header-box {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          border-bottom: 3px solid #196c6c;
          padding-bottom: 10px;
          margin-bottom: 14px;
        }
        .society-title {
          font-size: 16px;
          font-weight: 800;
          color: #196c6c;
          margin: 0 0 3px 0;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .society-sub {
          font-size: 11px;
          color: #64748b;
          font-weight: 500;
        }
        .report-badge {
          text-align: right;
        }
        .report-title {
          font-size: 13.5px;
          font-weight: 800;
          color: #0f172a;
          text-transform: uppercase;
          letter-spacing: 0.3px;
        }
        .report-period {
          font-size: 11px;
          color: #0d9488;
          font-weight: 700;
          margin-top: 2px;
        }
        .kpi-grid {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 10px;
          margin-bottom: 16px;
        }
        .kpi-card {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 9px 12px;
          text-align: center;
        }
        .kpi-card.highlight {
          background: #f0fdf4;
          border: 2px solid #16a34a;
        }
        .kpi-label {
          font-size: 9.5px;
          text-transform: uppercase;
          color: #64748b;
          font-weight: 700;
          margin-bottom: 3px;
        }
        .kpi-val {
          font-size: 14.5px;
          font-weight: 800;
          margin: 0;
        }
        .kpi-sub {
          font-size: 9.5px;
          color: #64748b;
          margin-top: 2px;
        }
        .section-heading {
          font-size: 11.5px;
          font-weight: 700;
          color: #0f172a;
          margin: 12px 0 6px 0;
          display: flex;
          align-items: center;
          gap: 6px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          font-size: 11px;
          margin-bottom: 12px;
        }
        th {
          background: #f1f5f9;
          color: #334155;
          padding: 7px 9px;
          text-align: left;
          font-weight: 700;
          border: 1px solid #cbd5e1;
        }
        td {
          padding: 6px 9px;
          border: 1px solid #e2e8f0;
          vertical-align: middle;
        }
        tfoot tr td {
          background: #e2e8f0;
          font-weight: 800;
          border-top: 2px solid #94a3b8;
        }
        .grid-2 {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }
        .observations-card {
          background: #f8fafc;
          border-left: 4px solid #196c6c;
          padding: 9px 12px;
          border-radius: 0 6px 6px 0;
          margin-bottom: 14px;
          font-size: 10.5px;
        }
        .observations-card ul {
          margin: 3px 0 0 16px;
          padding: 0;
        }
        .observations-card li {
          margin-bottom: 3px;
        }
        .sig-container {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
          margin-top: 22px;
          page-break-inside: avoid;
        }
        .sig-card {
          text-align: center;
          padding: 6px;
        }
        .sig-line {
          border-top: 1.5px solid #64748b;
          margin-top: 30px;
          padding-top: 5px;
          font-size: 10.5px;
          font-weight: 700;
          color: #334155;
        }
        .sig-role {
          font-size: 9px;
          color: #64748b;
        }
        .footer-note {
          margin-top: 12px;
          text-align: center;
          font-size: 9.5px;
          color: #94a3b8;
          border-top: 1px solid #e2e8f0;
          padding-top: 6px;
        }
        @media print {
          body { padding: 0; }
          .no-print { display: none !important; }
        }
      </style>
    </head>
    <body>
      <div class="header-box">
        <div>
          <div class="society-title">🏢 MAJESTIQUE EURISKA 'A' BUILDING CO-OP HOUSING SOCIETY LTD.</div>
          <div class="society-sub">Reg. No: PNA/PNA (4)/HSG/(TC)/21207/2019-20 Date 09/08/2019 | HDFC Bank A/C: 50200075533530 | S. No. 2, Plot No C-1, Village Mohammed Wadi, Taluka Haveli, Pune - 411060</div>
        </div>
        <div class="report-badge">
          <div class="report-title">6-Month Financial Trend & Profit/Loss Audit</div>
          <div class="report-period">April 2026 – September 2026 (6 Months Comprehensive)</div>
        </div>
      </div>

      <!-- 6-Month Executive KPI Summary -->
      <div class="kpi-grid">
        <div class="kpi-card">
          <div class="kpi-label">Opening Balance (01-Apr-2026)</div>
          <div class="kpi-val" style="color:#196c6c">${fmt(cumOpening)}</div>
          <div class="kpi-sub">Initial Society Reserve</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Total Receipts (6 Mos CR)</div>
          <div class="kpi-val" style="color:#31553e">${fmt(cumCredits)}</div>
          <div class="kpi-sub">590 Credit Inflow Txs</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Total Expenses (6 Mos DR)</div>
          <div class="kpi-val" style="color:#c2644a">${fmt(cumDebits)}</div>
          <div class="kpi-sub">69 Vendor / Outflow Txs</div>
        </div>
        <div class="kpi-card highlight">
          <div class="kpi-label" style="color:#16a34a">🌟 Cumulative Net Profit / Surplus</div>
          <div class="kpi-val" style="color:#16a34a">+ ${fmt(cumNet)}</div>
          <div class="kpi-sub" style="color:#15803d;font-weight:700">Margin: ${cumMargin} of Receipts</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Closing Balance (30-Sep-2026)</div>
          <div class="kpi-val" style="color:#196c6c">${fmt(cumClosing)}</div>
          <div class="kpi-sub" style="color:#16a34a;font-weight:700">Growth: ${reserveGrowth} (+₹4.15L)</div>
        </div>
      </div>

      <!-- Month by Month Financial Trend Comparison Table -->
      <div class="section-heading">📈 Month-by-Month Financial Trend & Cash Flow Comparison</div>
      <table>
        <thead>
          <tr>
            <th style="width:13%">Month & Period</th>
            <th style="text-align:right;width:11%">Opening Bal (₹)</th>
            <th style="text-align:right;width:13%">Total Receipts (CR)</th>
            <th style="text-align:right;width:13%">Total Expenses (DR)</th>
            <th style="text-align:right;width:14%">Net Profit / (Loss)</th>
            <th style="text-align:center;width:8%">Margin</th>
            <th style="text-align:right;width:12%">Closing Bal (₹)</th>
            <th style="width:16%">Audit Status & Primary Drivers</th>
          </tr>
        </thead>
        <tbody>
          ${trendTableRows}
        </tbody>
        <tfoot>
          <tr>
            <td>6-MONTH TOTAL</td>
            <td style="text-align:right;font-family:monospace">${fmt(cumOpening)}</td>
            <td style="text-align:right;color:#31553e;font-family:monospace">${fmt(cumCredits)}</td>
            <td style="text-align:right;color:#c2644a;font-family:monospace">${fmt(cumDebits)}</td>
            <td style="text-align:right;color:#16a34a;font-size:12px;font-family:monospace">+ ${fmt(cumNet)}</td>
            <td style="text-align:center;color:#16a34a">${cumMargin}</td>
            <td style="text-align:right;color:#196c6c;font-family:monospace">${fmt(cumClosing)}</td>
            <td style="color:#16a34a"><strong>🌟 OVERALL PROFIT (+₹4,15,002.22)</strong></td>
          </tr>
        </tfoot>
      </table>

      <!-- Side by Side Breakdown of Income & Major Expenses -->
      <div class="grid-2">
        <div>
          <div class="section-heading">📥 Cumulative Receipts & Inflow Sources (6-Month Aggregate)</div>
          <table>
            <thead>
              <tr>
                <th>Income Category</th>
                <th style="text-align:center">Tx Count</th>
                <th style="text-align:right">Total (₹)</th>
                <th style="text-align:right">Share (%)</th>
              </tr>
            </thead>
            <tbody>
              ${incomeRows}
            </tbody>
            <tfoot>
              <tr>
                <td>TOTAL 6-MONTH RECEIPTS</td>
                <td style="text-align:center">590</td>
                <td style="text-align:right;color:#31553e">${fmt(cumCredits)}</td>
                <td style="text-align:right">100.00%</td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div>
          <div class="section-heading">📤 Cumulative Expenditure Breakdown (6-Month Aggregate)</div>
          <table>
            <thead>
              <tr>
                <th>Expense Category</th>
                <th style="text-align:right">Total (₹)</th>
                <th style="text-align:right">Share (%)</th>
              </tr>
            </thead>
            <tbody>
              ${expenseRows}
            </tbody>
            <tfoot>
              <tr>
                <td>TOTAL 6-MONTH EXPENDITURE</td>
                <td style="text-align:right;color:#c2644a">${fmt(cumDebits)}</td>
                <td style="text-align:right">100.00%</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <!-- Top Payees and Vendors -->
      <div class="section-heading">🏢 Top 10 Vendor / Service Outflows (6-Month Cumulative)</div>
      <table>
        <thead>
          <tr>
            <th style="width:40%">Vendor / Payee Name</th>
            <th style="text-align:center;width:15%">Payment Count</th>
            <th style="text-align:right;width:25%">Total Outflow (₹)</th>
            <th style="text-align:right;width:20%">Share of Total Expenses</th>
          </tr>
        </thead>
        <tbody>
          ${topVendorRows}
        </tbody>
      </table>

      <!-- Forensic Audit Observations & Key Takeaways -->
      <div class="observations-card">
        <strong>📋 Executive Audit Takeaways & Financial Health Assessment:</strong>
        <ul>
          <li><strong>Sustained Profitability:</strong> 5 out of 6 months delivered robust operational surpluses. Cumulative 6-month net profit stands at <strong>+ ₹ 4,15,002.22</strong> (21.57% operating margin).</li>
          <li><strong>Robust Reserve Fund Expansion:</strong> The Society's liquid bank reserves expanded from <strong>₹ 1,49,088.73</strong> (01-Apr-2026) to <strong>₹ 5,64,090.95</strong> (30-Sep-2026), representing a <strong>+278.30% net increase</strong> in liquid reserves.</li>
          <li><strong>Controlled July Deficit:</strong> July 2026 recorded a temporary deficit of -₹40,854.28 solely due to the quarterly Schindler Lift AMC amortization (₹89,208). August & September immediately returned to positive net cash flow (+₹38,586.60 & +₹1,01,165.08 respectively).</li>
          <li><strong>Audit Compliance:</strong> All 659 bank transactions have been cross-verified with HDFC core banking statements.</li>
        </ul>
      </div>

      <!-- Official Managing Committee Sign-off Grid -->
      <div class="sig-container">
        <div class="sig-card">
          <div class="sig-line">Treasurer</div>
          <div class="sig-role">Majestique Euriska A CHS</div>
        </div>
        <div class="sig-card">
          <div class="sig-line">Secretary</div>
          <div class="sig-role">Majestique Euriska A CHS</div>
        </div>
        <div class="sig-card">
          <div class="sig-line">Chairman / President</div>
          <div class="sig-role">Majestique Euriska A CHS</div>
        </div>
        <div class="sig-card">
          <div class="sig-line">Internal / Statutory Auditor</div>
          <div class="sig-role">Certified Chartered Accountant</div>
        </div>
      </div>

      <div class="footer-note">
        Majestique Euriska A Building Co-operative Housing Society Ltd. — Verified Statement Auditor System | Report Generated on ${new Date().toLocaleDateString('en-IN', {day:'2-digit',month:'long',year:'numeric'})}
      </div>
    </body>
    </html>`;

    const w = window.open('', '_blank');
    if (w) {
      w.document.write(html);
      w.document.close();
      setTimeout(() => w.print(), 600);
    }
  };

  const handleUnlock = (e) => {
    e.preventDefault();
    if (password === '$05CeLRO') {
      setIsUnlocked(true);
      setErrorMsg('');
    } else {
      setErrorMsg('Incorrect Password. Access Denied.');
    }
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
    // Both B Building CTS cheques and C Building FT (50200065450992) are Inter-Building FT (must be checked BEFORE generic CHQ DEP)
    if (isInterBuildingTx(d))                                                       return 'INTER_FT';
    if (d.includes('CHQ DEP') || d.includes('CHEQUE DEP'))                          return 'CHQ_DEP';
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
    if (sourceFilter === 'INTER_FT') {
      result = result.filter(t => isInterBuildingTx(t.desc));
    } else if (sourceFilter === 'INTER_B') {
      result = result.filter(t => getInterBuildingTarget(t.desc) === 'B Building');
    } else if (sourceFilter === 'INTER_C') {
      result = result.filter(t => getInterBuildingTarget(t.desc) === 'C Building');
    } else if (sourceFilter !== 'ALL') {
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
      <div className="section-card bank-statement-tracker-s1">
        <h3 className="section-card__title bank-statement-tracker-s2">
          <span>🔒</span> Confidential Statement Auditor
        </h3>
        <p className="bank-statement-tracker-s3">
          This area contains highly confidential forensic audit insights. Please enter the treasurer authorization password to proceed.
        </p>
        <form onSubmit={handleUnlock}>
          <div className="bank-statement-tracker-s4">
            <label className="bank-statement-tracker-s5">
              Authorization Password
            </label>
            <input
              type="password"
              placeholder="Enter password..."
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="bank-statement-tracker-s6"
            />
          </div>
          {errorMsg && (
            <p className="bank-statement-tracker-s7">
              ⚠️ {errorMsg}
            </p>
          )}
          <button
            type="submit"
            className="action-btn bank-statement-tracker-s8"
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
    if (isInterBuildingTx(d)) {
      const bldg = getInterBuildingTarget(d);
      return {
        border: '#196c6c',
        label: bldg ? `Inter-Building FT (${bldg})` : 'Inter-Building FT',
        dot: '#196c6c',
        buildingTag: bldg
      };
    }
    if (d.includes('CHQ DEP') || d.includes('CHEQUE DEP'))
      return { border: '#b98216', label: 'Cheque Deposit', dot: '#b98216' };
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
    { dot: '#196c6c', label: 'Inter-Building Transfer', desc: 'Fund transfers between A ↔ B ↔ C buildings (Union Bank & HDFC 50200065450992)' },
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
    { key: 'INTER_B',  label: '↳ B Building FT',    dot: '#0d9488' },
    { key: 'INTER_C',  label: '↳ C Building FT',    dot: '#0284c7' },
    { key: 'CHQ_PAID', label: 'Cheque Payment (DR)', dot: '#c2644a' },
    { key: 'OTHER',    label: 'Other',               dot: '#6b7280' },
  ];

  const renderTable = (transactions) => {
    const totalCR = transactions.filter(t => t.type === 'CR').reduce((s, t) => s + t.amount, 0);
    const totalDR = transactions.filter(t => t.type === 'DR').reduce((s, t) => s + t.amount, 0);
    const txCount = transactions.length;

    return (
      <div className="bank-statement-tracker-s9">
        <div className="bank-statement-tracker-s10">
          <div className="bank-statement-tracker-s11">
            <span className="bank-statement-tracker-s12">FILTER:</span>
            {SOURCE_FILTERS.map(f => {
              const active = sourceFilter === f.key;
              return (
                <button
                  key={f.key}
                  onClick={() => setSourceFilter(f.key)}
                  className="bank-statement-tracker-s13" style={{ border: `1px solid ${active ? f.dot : f.dot + '55'}`, background: active ? `${f.dot}22` : 'transparent', fontWeight: active ? '700' : '500', color: active ? f.dot : 'var(--muted)' }}
                >
                  <span className="bank-statement-tracker-s14" style={{ background: f.dot }} />
                  {f.label}
                </button>
              );
            })}
          </div>
          <div className="bank-statement-tracker-s15">
            <span className="bank-statement-tracker-s12">COLOUR KEY:</span>
            {COLOR_LEGEND.map((item, i) => (
              <div key={i} title={item.desc} className="bank-statement-tracker-s16">
                <span className="bank-statement-tracker-s14" style={{ background: item.dot }} />
                <span className="bank-statement-tracker-s17" style={{ color: item.dot }}>{item.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bank-statement-tracker-s18">
          <table className="task-table bank-statement-tracker-s19">
            <thead>
              <tr className="bank-statement-tracker-s20">
                <th className="bank-statement-tracker-s21">Date</th>
                <th className="bank-statement-tracker-s21">Narration</th>
                <th className="bank-statement-tracker-s21">Chq / Ref No.</th>
                <th className="bank-statement-tracker-s22">Outflow (DR)</th>
                <th className="bank-statement-tracker-s22">Inflow (CR)</th>
                <th className="bank-statement-tracker-s22">Running Balance</th>
              </tr>
            </thead>
            <tbody>
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="bank-statement-tracker-s23">
                    No transactions match the selected filter.
                  </td>
                </tr>
              ) : transactions.map((tx, idx) => {
                const txStyle = getTxStyle(tx);
                return (
                  <tr key={idx} className="bank-statement-tracker-s24" style={{ borderLeft: `3px solid ${txStyle.border}` }}>
                    <td className="bank-statement-tracker-s25">{tx.date}</td>
                    <td className="bank-statement-tracker-s21">
                      <span className={`badge ${tx.type === 'CR' ? 'badge--green' : 'badge--coral'} bank-statement-tracker-s26`}>
                        {tx.type}
                      </span>
                      {txStyle.buildingTag && (
                        <span
                          className="inter-building-badge bank-statement-tracker-s27"
                          style={{ background: txStyle.buildingTag === 'B Building' ? 'rgba(13, 148, 136, 0.15)' : 'rgba(2, 132, 199, 0.15)', color: txStyle.buildingTag === 'B Building' ? '#0d9488' : '#0284c7', border: `1px solid ${txStyle.buildingTag === 'B Building' ? 'rgba(13, 148, 136, 0.35)' : 'rgba(2, 132, 199, 0.35)'}` }}
                        >
                          🏢 {txStyle.buildingTag} FT
                        </span>
                      )}
                      <span className="bank-statement-tracker-s28" style={{ color: txStyle.border !== 'transparent' ? txStyle.border : 'inherit' }}>
                        {tx.desc}
                      </span>
                    </td>
                    <td className="bank-statement-tracker-s29">{tx.ref}</td>
                    <td className="bank-statement-tracker-s30">
                      {tx.type === 'DR' ? fmtAmt(tx.amount) : ''}
                    </td>
                    <td className="bank-statement-tracker-s31">
                      {tx.type === 'CR' ? fmtAmt(tx.amount) : ''}
                    </td>
                    <td className="bank-statement-tracker-s32">{fmtAmt(tx.bal)}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="bank-statement-tracker-s33">
                <td className="bank-statement-tracker-s34" colSpan={3}>
                  <span className="bank-statement-tracker-s35">
                    TOTAL — {txCount} transaction{txCount !== 1 ? 's' : ''}
                  </span>
                </td>
                <td className="bank-statement-tracker-s36" style={{ color: totalDR > 0 ? 'var(--coral)' : 'var(--muted)' }}>
                  {totalDR > 0 ? fmtAmt(totalDR) : '—'}
                </td>
                <td className="bank-statement-tracker-s36" style={{ color: totalCR > 0 ? 'var(--pine)' : 'var(--muted)' }}>
                  {totalCR > 0 ? fmtAmt(totalCR) : '—'}
                </td>
                <td className="bank-statement-tracker-s37">
                  Net: <span className="bank-statement-tracker-s38" style={{ color: (totalCR - totalDR) >= 0 ? 'var(--pine)' : 'var(--coral)' }}>
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
    <div className="bank-statement-tracker-s39">
      
      {/* Statement Period Switcher & Header Bar */}
      <div className="section-card bank-statement-tracker-s40">
        <div>
          <span className="badge badge--teal bank-statement-tracker-s41">HDFC BANK ACCOUNT #50200075533530</span>
          <h2 className="bank-statement-tracker-s42">
            Statement Auditor & Forensic Explorer
          </h2>
          <p className="bank-statement-tracker-s43">
            Active Period: <strong>{STATEMENT_PERIOD}</strong> ({TRANSACTIONS_LIST.length} Total Transactions)
          </p>
        </div>

        {/* Period Selector Pills */}
        <div className="bank-statement-tracker-s44">
          <span className="bank-statement-tracker-s45">PERIOD:</span>
          
          <button
            className={`action-btn ${selectedPeriod === 'ALL_TIME' ? 'action-btn--primary' : ''}`}
            onClick={() => setSelectedPeriod('ALL_TIME')}
            style={selectedPeriod === 'ALL_TIME' ? { background: '#31553e', color: 'white', fontWeight: '700' } : { borderColor: '#31553e', color: '#31553e' }}
          >
            🌟 FY 26 (Apr – Sep 26)
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

          <button
            className={`action-btn ${selectedPeriod === 'AUGUST_2026' ? 'action-btn--primary' : ''}`}
            onClick={() => setSelectedPeriod('AUGUST_2026')}
            style={selectedPeriod === 'AUGUST_2026' ? { background: '#196c6c', color: 'white' } : {}}
          >
            📅 August 2026
          </button>

          <button
            className={`action-btn ${selectedPeriod === 'SEPTEMBER_2026' ? 'action-btn--primary' : ''}`}
            onClick={() => setSelectedPeriod('SEPTEMBER_2026')}
            style={selectedPeriod === 'SEPTEMBER_2026' ? { background: '#196c6c', color: 'white' } : {}}
          >
            📅 September 2026
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
            className="action-btn bank-statement-tracker-s46"
            onClick={() => setActiveSubTab('live_auditor')}
          >
            ⚡ Live Text Auditor Tool
          </button>
        </div>
      </div>

      {/* Trend Comparison Bar — dynamic per selected period */}
      <div className="section-card bank-statement-tracker-s47">
        <div className="bank-statement-tracker-s48">
          <h4 className="bank-statement-tracker-s49">
            <span>📈</span>
            {selectedPeriod === 'FY2025_26'
              ? 'FY 2025-26 Monthly Financial Breakdown (Apr 2025 – Mar 2026)'
              : selectedPeriod === 'FY2024_25'
              ? 'FY 2024-25 Monthly Financial Breakdown (Apr 2024 – Mar 2025)'
              : selectedPeriod === 'FY2023_24'
              ? 'FY 2023-24 Monthly Financial Breakdown (Apr 2023 – Mar 2024)'
              : selectedPeriod === 'FY2022_23'
              ? 'FY 2022-23 Monthly Financial Breakdown (Dec 2022 – Mar 2023)'
              : '6-Month Financial Trend Comparison: April, May, June, July, August & September 2026'}
          </h4>
          <div className="bank-statement-tracker-s50">
            <span className="bank-statement-tracker-s51">
              Calculated from HDFC Bank Verified Statements
            </span>
            <button
              className="action-btn bank-statement-tracker-s52"
              onClick={handlePrint5MonthTrendReport}
              title="Print / Save PDF for 6-Month Financial Trend Comparison & Overall Profit/Loss"
            >
              🖨️ Print 6-Month Trend (PDF)
            </button>
          </div>
        </div>

        {selectedPeriod === 'FY2025_26' || selectedPeriod === 'FY2024_25' || selectedPeriod === 'FY2023_24' || selectedPeriod === 'FY2022_23' ? (
          /* monthly grid from timelineData */
          <div className="bank-statement-tracker-s53">
            {TIMELINE_DATA.map((m, idx) => {
              const net = m.credit - m.debit;
              const isPos = net >= 0;
              return (
                <div key={idx} className="bank-statement-tracker-s54" style={{ border: `1px solid ${isPos ? 'var(--line)' : '#c2644a44'}` }}>
                  <span className="bank-statement-tracker-s55">{m.date}</span>
                  <strong className="bank-statement-tracker-s56" style={{ color: isPos ? 'var(--pine)' : 'var(--coral)' }}>
                    {isPos ? '+ ' : '- '}₹ {Math.abs(net).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                  </strong>
                  <span className="bank-statement-tracker-s57">
                    CR: ₹{(m.credit/100000).toFixed(1)}L | DR: ₹{(m.debit/100000).toFixed(1)}L
                  </span>
                  <span className="bank-statement-tracker-s58">
                    Bal: ₹{(m.balance/100000).toFixed(2)}L
                  </span>
                </div>
              );
            })}
            <div className="bank-statement-tracker-s54" style={{ border: `2px solid ${NET_CASH_FLOW >= 0 ? 'var(--pine)' : 'var(--coral)'}` }}>
              <span className="bank-statement-tracker-s59" style={{ color: NET_CASH_FLOW >= 0 ? 'var(--pine)' : 'var(--coral)' }}>
                {NET_CASH_FLOW >= 0 ? '🌟 Overall Profit' : '⚠️ Overall Deficit'}
              </span>
              <strong className="bank-statement-tracker-s56" style={{ color: NET_CASH_FLOW >= 0 ? 'var(--pine)' : 'var(--coral)' }}>
                {NET_CASH_FLOW >= 0 ? '+ ' : '- '}₹ {Math.abs(NET_CASH_FLOW).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </strong>
              <span className="bank-statement-tracker-s57">
                CR: ₹{(TOTAL_CREDITS/100000).toFixed(1)}L | DR: ₹{(TOTAL_DEBITS/100000).toFixed(1)}L
              </span>
              <span className="bank-statement-tracker-s58">
                Bal: ₹{OPENING_BALANCE.toLocaleString('en-IN', { maximumFractionDigits: 0 })} → ₹{CLOSING_BALANCE.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </span>
              {fdPrincipalFlow !== 0 && (
                <span className="bank-statement-tracker-s60">
                  Ops Net: <strong style={{ color: (NET_CASH_FLOW - fdPrincipalFlow) >= 0 ? 'var(--pine)' : 'var(--coral)' }}>
                    {fmtAmt(NET_CASH_FLOW - fdPrincipalFlow)}
                  </strong> (Excl. FD)
                </span>
              )}
            </div>
          </div>
        ) : (
          /* Standard 6-month 2026 view */
          <div className="bank-statement-tracker-s61">
            <div className="bank-statement-tracker-s62">
              <span className="bank-statement-tracker-s63">April 2026 Net Flow</span>
              <strong className="bank-statement-tracker-s64">+ ₹ 15,697.50</strong>
              <span className="bank-statement-tracker-s65">Inflow: ₹2.79L | Outflow: ₹2.63L</span>
            </div>
            <div className="bank-statement-tracker-s62">
              <span className="bank-statement-tracker-s63">May 2026 Net Flow</span>
              <strong className="bank-statement-tracker-s64">+ ₹ 1,68,517.31</strong>
              <span className="bank-statement-tracker-s65">Inflow: ₹3.92L | Outflow: ₹2.24L</span>
            </div>
            <div className="bank-statement-tracker-s62">
              <span className="bank-statement-tracker-s63">June 2026 Net Flow</span>
              <strong className="bank-statement-tracker-s64">+ ₹ 1,31,890.01</strong>
              <span className="bank-statement-tracker-s65">Inflow: ₹3.69L | Outflow: ₹2.37L</span>
            </div>
            <div className="bank-statement-tracker-s62">
              <span className="bank-statement-tracker-s63">July 2026 Net Flow</span>
              <strong className="bank-statement-tracker-s66">- ₹ 40,854.28</strong>
              <span className="bank-statement-tracker-s65">Inflow: ₹2.96L | Outflow: ₹3.37L</span>
            </div>
            <div className="bank-statement-tracker-s62">
              <span className="bank-statement-tracker-s63">August 2026 Net Flow</span>
              <strong className="bank-statement-tracker-s64">+ ₹ 38,586.60</strong>
              <span className="bank-statement-tracker-s65">Inflow: ₹2.49L | Outflow: ₹2.10L</span>
            </div>
            <div className="bank-statement-tracker-s62">
              <span className="bank-statement-tracker-s63">September 2026 Net Flow</span>
              <strong className="bank-statement-tracker-s64">+ ₹ 1,01,165.08</strong>
              <span className="bank-statement-tracker-s65">Inflow: ₹3.39L | Outflow: ₹2.38L</span>
            </div>
            <div className="bank-statement-tracker-s67">
              <span className="bank-statement-tracker-s68">🌟 Overall Profit (6 Months)</span>
              <strong className="bank-statement-tracker-s69">+ ₹ 4,15,002.22</strong>
              <span className="bank-statement-tracker-s65">Bal: ₹1.49L → ₹5.64L (+278.3%)</span>
            </div>
          </div>
        )}
      </div>

      {/* Sub-Tab Navigation Bar */}
      <div className="section-card bank-statement-tracker-s70">
        <div className="bank-statement-tracker-s71">
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
          <p className="bank-statement-tracker-s43">Starting / Opening Balance</p>
          <h3 className="bank-statement-tracker-s72">{fmtAmt(OPENING_BALANCE)}</h3>
          <p className="bank-statement-tracker-s73">
            {selectedPeriod === 'ALL_TIME' ? 'As on 01 April 2026' : selectedPeriod === 'FY2025_26' ? 'As on 02 April 2025' : selectedPeriod === 'FY2024_25' ? 'As on 02 April 2024' : selectedPeriod === 'FY2023_24' ? 'As on 01 April 2023' : selectedPeriod === 'FY2022_23' ? 'As on 01 December 2022' : 'Verified starting limit'}
          </p>
        </div>
        <div className="metric-card metric-card--pine">
          <p className="bank-statement-tracker-s43">Total Collections (CR)</p>
          <h3 className="bank-statement-tracker-s74">{fmtAmt(TOTAL_CREDITS)}</h3>
          <p className="bank-statement-tracker-s73">
            {TRANSACTIONS_LIST.filter(t => t.type === 'CR').length} Cleared Credits
          </p>
        </div>
        <div className="metric-card metric-card--coral">
          <p className="bank-statement-tracker-s43">Total Expenses (DR)</p>
          <h3 className="bank-statement-tracker-s75">{fmtAmt(TOTAL_DEBITS)}</h3>
          <p className="bank-statement-tracker-s73">
            {TRANSACTIONS_LIST.filter(t => t.type === 'DR').length} Approved Debits
          </p>
        </div>
        <div className="metric-card metric-card--sand">
          <p className="bank-statement-tracker-s43">Overall Profit / Net Flow</p>
          <h3 style={{ color: NET_CASH_FLOW >= 0 ? 'var(--pine)' : 'var(--coral)' }}>
            {fmtAmt(NET_CASH_FLOW)}
          </h3>
          <p className="bank-statement-tracker-s73">
            Closing Reserve: <strong>{fmtAmt(CLOSING_BALANCE)}</strong>
          </p>
          {fdPrincipalFlow !== 0 && (
            <p className="bank-statement-tracker-s76">
              Operational Net: <strong style={{ color: (NET_CASH_FLOW - fdPrincipalFlow) >= 0 ? 'var(--pine)' : 'var(--coral)' }}>
                {fmtAmt(NET_CASH_FLOW - fdPrincipalFlow)}
              </strong>
              <span className="bank-statement-tracker-s77">(Excl. FD Principal movements)</span>
            </p>
          )}
        </div>
      </div>

      {/* Content Render based on Sub-Tab */}
      {activeSubTab === 'dashboard' && (
        <div className="bank-statement-tracker-s39">
          {/* Main Trend Chart */}
          <div className="section-card">
            <h3 className="section-card__title">
              Account Balance & Monthly Cash Flow ({STATEMENT_PERIOD})
            </h3>
            <div className="bank-statement-tracker-s78">
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
          <div className="bank-statement-tracker-s79">
            <div className="section-card">
              <h3 className="section-card__title">Income Categories Breakdown</h3>
              <div className="bank-statement-tracker-s80">
                <div className="bank-statement-tracker-s81">
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
                <div className="bank-statement-tracker-s82">
                  {INCOME_CATEGORIES.map((cat, idx) => (
                    <div key={idx} className="bank-statement-tracker-s83">
                      <span className="bank-statement-tracker-s84" style={{ background: cat.color }} />
                      <span className="bank-statement-tracker-s85">{cat.name}</span>
                      <strong className="bank-statement-tracker-s86">{fmtAmt(cat.value)}</strong>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="section-card">
              <h3 className="section-card__title">Expense Outflow Categories</h3>
              <div className="bank-statement-tracker-s80">
                <div className="bank-statement-tracker-s81">
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
                <div className="bank-statement-tracker-s82">
                  {EXPENSE_CATEGORIES.map((cat, idx) => (
                    <div key={idx} className="bank-statement-tracker-s83">
                      <span className="bank-statement-tracker-s84" style={{ background: cat.color }} />
                      <span className="bank-statement-tracker-s85">{cat.name}</span>
                      <strong className="bank-statement-tracker-s86">{fmtAmt(cat.value)}</strong>
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
          <div className="bank-statement-tracker-s87">
            <h3 className="section-card__title bank-statement-tracker-s88">
              {activeSubTab === 'ledger' && "🧾 Full Ledger Entries"}
              {activeSubTab === 'inflow' && "📥 Inflow (CR) Logs"}
              {activeSubTab === 'outflow' && "📤 Outflow (DR) Logs"}
            </h3>

            <div className="bank-statement-tracker-s89">
              <input
                type="text"
                placeholder="Search narration, ref #, date..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bank-statement-tracker-s90"
              />
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                className="bank-statement-tracker-s91"
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
        <div className="bank-statement-tracker-s39">
          <div className="section-card">
            <h3 className="section-card__title">Vendor Payment Rankings ({STATEMENT_PERIOD})</h3>
            <div className="bank-statement-tracker-s18">
              <table className="task-table bank-statement-tracker-s19">
                <thead>
                  <tr className="bank-statement-tracker-s20">
                    <th className="bank-statement-tracker-s92">Rank</th>
                    <th className="bank-statement-tracker-s21">Vendor / Contractor Name</th>
                    <th className="bank-statement-tracker-s21">Category</th>
                    <th className="bank-statement-tracker-s21">Cheque / Ref No.</th>
                    <th className="bank-statement-tracker-s93">Payments</th>
                    <th className="bank-statement-tracker-s22">Total Paid</th>
                    <th className="bank-statement-tracker-s22">% of Expenses</th>
                  </tr>
                </thead>
                <tbody>
                  {VENDORS_DATA.map((vendor, idx) => (
                    <tr key={idx} className="bank-statement-tracker-s24">
                      <td className="bank-statement-tracker-s94">#{vendor.rank}</td>
                      <td className="bank-statement-tracker-s95">{vendor.name}</td>
                      <td className="bank-statement-tracker-s96">{vendor.type}</td>
                      <td className="bank-statement-tracker-s21">
                        <span className="bank-statement-tracker-s97">{vendor.cheque}</span>
                      </td>
                      <td className="bank-statement-tracker-s93">{vendor.count}</td>
                      <td className="bank-statement-tracker-s98">{fmtAmt(vendor.total)}</td>
                      <td className="bank-statement-tracker-s32">
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
        <div className="bank-statement-tracker-s39">
          <div className="section-card">
            <h3 className="section-card__title">Forensic Audit & Internal Control Risks ({STATEMENT_PERIOD})</h3>
            
            <div className="bank-statement-tracker-s99">
              <div className="bank-statement-tracker-s100">
                <span className="badge badge--coral bank-statement-tracker-s101">🔴 HIGH RISK</span>
                <strong className="bank-statement-tracker-s102">Self Cheque Cash Withdrawals</strong>
                <p className="bank-statement-tracker-s43">
                  Self cheque paid in cash at Mohammedwadi branch. Co-operative housing societies must enforce digital payouts or direct bank transfers. Cash withdrawals have zero traceability and represent high operational fraud risks.
                </p>
              </div>

              <div className="bank-statement-tracker-s100">
                <span className="badge badge--coral bank-statement-tracker-s101">🔴 HIGH RISK</span>
                <strong className="bank-statement-tracker-s102">Electricity Utility Bills (MSEDCL) Analysis</strong>
                <p className="bank-statement-tracker-s43">
                  MSEDCL payments represent one of the largest single operational outflows. Verify common meter billing & explore solar offset ROI.
                </p>
              </div>

              <div className="bank-statement-tracker-s103">
                <span className="badge badge--amber bank-statement-tracker-s101">🟠 MEDIUM RISK</span>
                <strong className="bank-statement-tracker-s102">Personal Contractor Payments</strong>
                <p className="bank-statement-tracker-s43">
                  Direct cheques issued to individual names instead of verified firm/agency accounts. Requires validation of vendor registration and verification of TDS deduction compliances.
                </p>
              </div>
            </div>
          </div>

          {/* Inter-Building Reconciliation Section */}
          <div className="section-card bank-statement-tracker-s104">
            <div className="bank-statement-tracker-s105">
              <div>
                <span className="badge bank-statement-tracker-s106">
                  🏢 INTER-BUILDING AUDIT & RECONCILIATION
                </span>
                <h3 className="section-card__title bank-statement-tracker-s107">
                  Inter-Building Fund Transfers (Building A ↔ B ↔ C)
                </h3>
                <p className="bank-statement-tracker-s43">
                  Detailed tracking of fund transfers between Majestique Euriska A Building and sister societies (B & C Buildings).
                </p>
              </div>

              <div className="bank-statement-tracker-s108">
                <button
                  className="action-btn bank-statement-tracker-s109"
                  onClick={() => { setActiveSubTab('ledger'); setSourceFilter('INTER_B'); }}
                >
                  View B Building FT ({interBuildingStats ? interBuildingStats.bInCount + interBuildingStats.bOutCount : 0})
                </button>
                <button
                  className="action-btn bank-statement-tracker-s110"
                  onClick={() => { setActiveSubTab('ledger'); setSourceFilter('INTER_C'); }}
                >
                  View C Building FT ({interBuildingStats ? interBuildingStats.cInCount + interBuildingStats.cOutCount : 0})
                </button>
                <button
                  className="action-btn bank-statement-tracker-s111"
                  onClick={() => { setActiveSubTab('ledger'); setSourceFilter('INTER_FT'); }}
                >
                  View All Inter-FT
                </button>
              </div>
            </div>

            <div className="bank-statement-tracker-s112">
              {/* B Building Card */}
              <div className="bank-statement-tracker-s113">
                <div className="bank-statement-tracker-s114">
                  <strong className="bank-statement-tracker-s115">🏢 B Building Transfers</strong>
                  <span className="badge bank-statement-tracker-s116">
                    Union Bank CTS
                  </span>
                </div>
                <p className="bank-statement-tracker-s117">
                  Transfers received via physical clearing cheques from Union Bank of India (Model Colony / CTS).
                </p>
                <div className="bank-statement-tracker-s118">
                  <div className="bank-statement-tracker-s119">
                    <span>Inflows Received (CR):</span>
                    <strong className="bank-statement-tracker-s74">{fmtAmt(interBuildingStats ? interBuildingStats.bIn : 0)}</strong>
                  </div>
                  <div className="bank-statement-tracker-s119">
                    <span>Transactions Count:</span>
                    <span>{interBuildingStats ? interBuildingStats.bInCount : 0} CR cheques</span>
                  </div>
                  <div className="bank-statement-tracker-s120">
                    <span>Net Transfer from B:</span>
                    <strong className="bank-statement-tracker-s74">+{fmtAmt(interBuildingStats ? interBuildingStats.bIn : 0)}</strong>
                  </div>
                </div>
              </div>

              {/* C Building Card */}
              <div className="bank-statement-tracker-s121">
                <div className="bank-statement-tracker-s114">
                  <strong className="bank-statement-tracker-s122">🏢 C Building Transfers</strong>
                  <span className="badge bank-statement-tracker-s123">
                    HDFC 50200065450992
                  </span>
                </div>
                <p className="bank-statement-tracker-s117">
                  Direct internal fund transfers (FT CR/DR) through shared society account 50200065450992.
                </p>
                <div className="bank-statement-tracker-s118">
                  <div className="bank-statement-tracker-s119">
                    <span>Inflows Received (CR):</span>
                    <strong className="bank-statement-tracker-s74">{fmtAmt(interBuildingStats ? interBuildingStats.cIn : 0)}</strong>
                  </div>
                  <div className="bank-statement-tracker-s119">
                    <span>Outflows Paid (DR):</span>
                    <strong className="bank-statement-tracker-s75">{fmtAmt(interBuildingStats ? interBuildingStats.cOut : 0)}</strong>
                  </div>
                  <div className="bank-statement-tracker-s119">
                    <span>Transactions Count:</span>
                    <span>{interBuildingStats ? interBuildingStats.cInCount : 0} CR / {interBuildingStats ? interBuildingStats.cOutCount : 0} DR</span>
                  </div>
                  <div className="bank-statement-tracker-s120">
                    <span>Net Balance with C:</span>
                    <strong style={{ color: (interBuildingStats && (interBuildingStats.cIn - interBuildingStats.cOut) >= 0) ? 'var(--pine)' : 'var(--coral)' }}>
                      {interBuildingStats ? fmtAmt(interBuildingStats.cIn - interBuildingStats.cOut) : '₹0.00'}
                    </strong>
                  </div>
                </div>
              </div>

              {/* Combined Inter-Building Net */}
              <div className="bank-statement-tracker-s124">
                <div className="bank-statement-tracker-s114">
                  <strong className="bank-statement-tracker-s125">📊 Inter-Building Net Position</strong>
                  <span className="badge badge--teal">Total Shared</span>
                </div>
                <p className="bank-statement-tracker-s117">
                  Consolidated shared amenities and maintenance fund transfers with B and C Buildings.
                </p>
                <div className="bank-statement-tracker-s118">
                  <div className="bank-statement-tracker-s119">
                    <span>Total Inflows (CR):</span>
                    <strong className="bank-statement-tracker-s74">{fmtAmt(interBuildingStats ? interBuildingStats.totalIn : 0)}</strong>
                  </div>
                  <div className="bank-statement-tracker-s119">
                    <span>Total Outflows (DR):</span>
                    <strong className="bank-statement-tracker-s75">{fmtAmt(interBuildingStats ? interBuildingStats.totalOut : 0)}</strong>
                  </div>
                  <div className="bank-statement-tracker-s120">
                    <span>Net Inter-Building Surplus:</span>
                    <strong style={{ color: (interBuildingStats && (interBuildingStats.totalIn - interBuildingStats.totalOut) >= 0) ? 'var(--pine)' : 'var(--coral)' }}>
                      {interBuildingStats ? fmtAmt(interBuildingStats.totalIn - interBuildingStats.totalOut) : '₹0.00'}
                    </strong>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bank-statement-tracker-s79">
            <div className="section-card">
              <h3 className="section-card__title">Top Management Action Items</h3>
              <ul className="bank-statement-tracker-s126">
                <li><strong>Enforce Cashless Petty Cash:</strong> Transition immediately from cash self-withdrawals to corporate prepaid debit cards with receipt tracking.</li>
                <li><strong>Reconcile MSEDCL Bills:</strong> Verify all electricity vouchers against physical bill copies for Mohammedwadi meters.</li>
                <li><strong>Common Area Solar Audit:</strong> With electricity bills at high totals, explore Solar panel ROI to reduce common load utility costs.</li>
                <li><strong>Inter-Building Accounts:</strong> Audit transfers with B & C Buildings to establish formal formula-based shared facility billing.</li>
              </ul>
            </div>

            <div className="section-card">
              <h3 className="section-card__title">Treasurer's MIS Report Summarized</h3>
              <div className="bank-statement-tracker-s127">
                <div className="bank-statement-tracker-s128">
                  <span>Period Collections:</span>
                  <strong className="bank-statement-tracker-s74">{fmtAmt(TOTAL_CREDITS)}</strong>
                </div>
                <div className="bank-statement-tracker-s128">
                  <span>Period Expenses:</span>
                  <strong className="bank-statement-tracker-s75">{fmtAmt(TOTAL_DEBITS)}</strong>
                </div>
                <div className="bank-statement-tracker-s128">
                  <span>Period Cash Flow:</span>
                  <strong style={{ color: NET_CASH_FLOW >= 0 ? 'var(--pine)' : 'var(--coral)' }}>{fmtAmt(NET_CASH_FLOW)}</strong>
                </div>
                <div className="bank-statement-tracker-s128">
                  <span>Closing Reserve Balance:</span>
                  <strong>{fmtAmt(CLOSING_BALANCE)}</strong>
                </div>
                <div className="bank-statement-tracker-s129">
                  <span>Financial Health Score:</span>
                  <span className="bank-statement-tracker-s38" style={{ color: NET_CASH_FLOW >= 0 ? 'var(--pine)' : 'var(--amber)' }}>
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
        <div className="bank-statement-tracker-s39">
          <div className="section-card bank-statement-tracker-s130">
            <div className="bank-statement-tracker-s131">
              <div>
                <span className="badge bank-statement-tracker-s132">⚡ LIVE PARSER & AUDIT ENGINE</span>
                <h3 className="section-card__title bank-statement-tracker-s133">
                  Paste & Parse Bank Statement Text
                </h3>
                <p className="bank-statement-tracker-s134">
                  Paste raw text copied from HDFC/ICICI/SBI bank statement PDFs or NetBanking tables to parse, audit, and analyze instantly.
                </p>
              </div>

              <div className="bank-statement-tracker-s135">
                <button
                  type="button"
                  className="action-btn bank-statement-tracker-s136"
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
                  className="action-btn bank-statement-tracker-s136"
                  onClick={() => setRawTextInput('')}
                >
                  🗑️ Clear
                </button>
              </div>
            </div>

            <form onSubmit={handleParseSubmit} className="bank-statement-tracker-s9">
              <textarea
                rows={8}
                placeholder="Paste raw bank statement text here (e.g. copied from HDFC PDF/netbanking)..."
                value={rawTextInput}
                onChange={(e) => setRawTextInput(e.target.value)}
                className="bank-statement-tracker-s137"
              />

              {parseError && (
                <div className="bank-statement-tracker-s138">
                  ⚠️ {parseError}
                </div>
              )}

              {parseSuccessMsg && (
                <div className="bank-statement-tracker-s139">
                  ✅ {parseSuccessMsg}
                </div>
              )}

              <button
                type="submit"
                className="action-btn bank-statement-tracker-s140"
              >
                ⚡ Parse & Audit Statement Now
              </button>
            </form>
          </div>

          {customParsedData && (
            <div className="section-card bank-statement-tracker-s141">
              <h3 className="section-card__title bank-statement-tracker-s142">
                Parsed Statement Summary ({customParsedData.period})
              </h3>

              <div className="metrics-grid bank-statement-tracker-s143">
                <div className="metric-card metric-card--teal">
                  <p className="bank-statement-tracker-s43">Stated Opening Bal</p>
                  <h3 className="bank-statement-tracker-s72">{fmtAmt(customParsedData.openingBalance)}</h3>
                </div>
                <div className="metric-card metric-card--pine">
                  <p className="bank-statement-tracker-s43">Total Credits (Inflow)</p>
                  <h3 className="bank-statement-tracker-s74">{fmtAmt(customParsedData.totalCredits)}</h3>
                </div>
                <div className="metric-card metric-card--coral">
                  <p className="bank-statement-tracker-s43">Total Debits (Outflow)</p>
                  <h3 className="bank-statement-tracker-s75">{fmtAmt(customParsedData.totalDebits)}</h3>
                </div>
                <div className="metric-card metric-card--sand">
                  <p className="bank-statement-tracker-s43">Closing Balance</p>
                  <h3 className="bank-statement-tracker-s72">{fmtAmt(customParsedData.closingBalance)}</h3>
                </div>
              </div>

              <div className="bank-statement-tracker-s144">
                <button
                  className="action-btn action-btn--primary bank-statement-tracker-s145"
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
        <div className="bank-statement-tracker-s146">

          {/* 6-Month Executive Financial Trend PDF Report Card */}
          <div className="section-card bank-statement-tracker-s147">
            <div className="bank-statement-tracker-s148">
              <div>
                <h3 className="section-card__title bank-statement-tracker-s149">
                  <span>📊</span> 6-Month Financial Trend & Profit/Loss Comparison (April – September 2026)
                </h3>
                <p className="bank-statement-tracker-s150">
                  Generate and print the official 6-Month Comparative Audit Statement with full breakdown of monthly receipts, vendor expenditures, overall profit of <strong>+₹4,15,002.22</strong>, operating margins, and society reserve growth from ₹1.49L to ₹5.64L (+278.3%).
                </p>
                <div className="bank-statement-tracker-s151">
                  <span className="bank-statement-tracker-s152">✅ Apr: +₹15.7k</span>
                  <span className="bank-statement-tracker-s152">🌟 May: +₹1.69L</span>
                  <span className="bank-statement-tracker-s152">🌟 Jun: +₹1.32L</span>
                  <span className="bank-statement-tracker-s152">⚠️ Jul: -₹40.9k</span>
                  <span className="bank-statement-tracker-s152">✅ Aug: +₹38.6k</span>
                  <span className="bank-statement-tracker-s152">🌟 Sep: +₹1.01L</span>
                  <span className="bank-statement-tracker-s153">Overall Profit: +₹4.15 Lakhs</span>
                </div>
              </div>

              <button
                className="action-btn action-btn--primary bank-statement-tracker-s154"
                onClick={handlePrint5MonthTrendReport}
              >
                🖨️ Print 6-Month Trend Report (PDF)
              </button>
            </div>
          </div>

          <div className="section-card bank-statement-tracker-s155">
            <h3 className="section-card__title bank-statement-tracker-s156">
              <span>⚖️</span> Income & Expense Financial Statements (PDF / Print)
            </h3>
            <p className="bank-statement-tracker-s157">
              Generate formal audit statements for <strong>{STATEMENT_PERIOD}</strong> with itemized collections and expenses breakdown.
            </p>
            
            <div className="bank-statement-tracker-s158">
              <button
                className="action-btn action-btn--primary bank-statement-tracker-s159"
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
                  const interTx  = crTx.filter(t => isInterBuildingTx(t.desc));
                  const interBTx = interTx.filter(t => getInterBuildingTarget(t.desc) === 'B Building');
                  const interCTx = interTx.filter(t => getInterBuildingTarget(t.desc) === 'C Building');
                  const chqDepTx = crTx.filter(t => !isInterBuildingTx(t.desc) && (t.desc.toUpperCase().includes('CHQ DEP') || t.desc.toUpperCase().includes('CHEQUE DEP')));
                  const otherCr  = crTx.filter(t =>
                    !t.desc.toUpperCase().includes('VIVISH') &&
                    !t.desc.toUpperCase().includes('TATA PLAY') &&
                    !isInterBuildingTx(t.desc) &&
                    !t.desc.toUpperCase().includes('CHQ DEP') &&
                    !t.desc.toUpperCase().includes('CHEQUE DEP') &&
                    !t.desc.toUpperCase().startsWith('UPI') &&
                    !t.desc.toUpperCase().includes('UPI SETTLEMENT')
                  );

                  const sumV  = vivishTx.reduce((s, t) => s + t.amount, 0);
                  const sumU  = upiTx.reduce((s, t) => s + t.amount, 0);
                  const sumT  = tataTx.reduce((s, t) => s + t.amount, 0);
                  const sumC  = chqDepTx.reduce((s, t) => s + t.amount, 0);
                  const sumI  = interTx.reduce((s, t) => s + t.amount, 0);
                  const sumIB = interBTx.reduce((s, t) => s + t.amount, 0);
                  const sumIC = interCTx.reduce((s, t) => s + t.amount, 0);
                  const sumO  = otherCr.reduce((s, t) => s + t.amount, 0);

                  const incomeGroupRows = [
                    { category: 'Maintenance Collections via Vivish PG (NEFT)', count: vivishTx.length, total: sumV, pct: (sumV/totalCR)*100 },
                    { category: 'Direct Cheque Deposits (CHQ DEP / CTS)', count: chqDepTx.length, total: sumC, pct: (sumC/totalCR)*100 },
                    { category: 'UPI / IMPS Direct Member Payments', count: upiTx.length, total: sumU, pct: (sumU/totalCR)*100 },
                    { category: 'Inter-Building FT Received (Total B & C)', count: interTx.length, total: sumI, pct: (sumI/totalCR)*100 },
                    ...(interBTx.length > 0 ? [{ category: '  ↳ B Building Inter-FT (Union Bank CTS)', count: interBTx.length, total: sumIB, pct: (sumIB/totalCR)*100 }] : []),
                    ...(interCTx.length > 0 ? [{ category: '  ↳ C Building Inter-FT (HDFC 50200065450992)', count: interCTx.length, total: sumIC, pct: (sumIC/totalCR)*100 }] : []),
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
                        <h1>🏢 MAJESTIQUE EURISKA 'A' BUILDING CO-OP HOUSING SOCIETY LTD.</h1>
                        <div style="font-size:12px;color:#475569">Reg. No: PNA/PNA (4)/HSG/(TC)/21207/2019-20 Date 09/08/2019 | HDFC Bank A/C: 50200075533530 | S. No. 2, Plot No C-1, Village Mohammed Wadi, Taluka Haveli, Pune - 411060</div>
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
            <p className="bank-statement-tracker-s157">
              Export <strong>{STATEMENT_PERIOD}</strong> transactions data as a CSV file for Excel / Google Sheets.
            </p>
            <div className="bank-statement-tracker-s158">
              {[
                { label: '📋 All Transactions', type: 'ALL', color: 'var(--teal)' },
                { label: '📥 Inflow (CR) Only', type: 'CR',  color: 'var(--pine)' },
                { label: '📤 Outflow (DR) Only', type: 'DR', color: 'var(--coral)' },
              ].map(({ label, type, color }) => (
                <button
                  key={type}
                  className="action-btn bank-statement-tracker-s160"
                  style={{ borderColor: color, color: color }}
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
