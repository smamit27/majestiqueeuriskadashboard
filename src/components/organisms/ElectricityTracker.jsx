import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db, isFirebaseConfigured, ensureFirebaseSession } from '../../firebase.js';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, LineChart, Line, Legend } from 'recharts';
import * as XLSX from 'xlsx';
import './ElectricityTracker.css';


function formatDateLabel(val) {
  if (!val) return '—';
  if (/^\d{4}-\d{2}-\d{2}$/.test(val)) {
    const [y, m, d] = val.split('-').map(Number);
    return new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(y, m - 1, d));
  }
  if (/^\d{4}-\d{2}$/.test(val)) {
    const [y, m] = val.split('-').map(Number);
    return new Intl.DateTimeFormat('en-IN', { month: 'short', year: 'numeric' }).format(new Date(y, m - 1, 1));
  }
  return val;
}

const n = (v) => parseFloat(v) || 0;
const fmt = (v) => Number(v).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// Compute duration string from two ISO dates
export const computeBillingDuration = (startStr, endStr) => {
  if (!startStr || !endStr) return '';
  const s = new Date(startStr);
  const e = new Date(endStr);
  if (isNaN(s) || isNaN(e)) return '';
  const diffDays = Math.max(1, Math.round((e - s) / (1000 * 60 * 60 * 24)));
  const approxMonths = (diffDays / 30.4).toFixed(1);
  const wholeMonths = Math.round(diffDays / 30.4);
  const monthStr = Math.abs(parseFloat(approxMonths) - wholeMonths) < 0.2
    ? `${wholeMonths} Month${wholeMonths > 1 ? 's' : ''}`
    : `~${approxMonths} Months`;
  return `${monthStr} (${diffDays} Days)`;
};

// 4-Digit Sub-meter Calculation with 10,000 Reset Rollover
// Formula: if curr < prev: (10,000 - prev) + curr, else: curr - prev
export const calculateSubmeterRollover = (prevStr, currStr, manualUnits = null) => {
  const prev = parseFloat(prevStr) || 0;
  const curr = parseFloat(currStr) || 0;
  if (manualUnits !== null && manualUnits !== undefined && !isNaN(manualUnits) && manualUnits !== '') {
    const u = parseFloat(manualUnits);
    const isRollover = curr < prev;
    return {
      units: u,
      isRollover,
      formulaText: isRollover
        ? `(10,000 - ${prev}) + ${curr} = ${u} units (Reset after 10000)`
        : `${curr} - ${prev} = ${u} units`
    };
  }
  if (curr < prev) {
    const units = (10000 - prev) + curr;
    return {
      units,
      isRollover: true,
      formulaText: `(10,000 - ${prev}) + ${curr} = ${units} units (Reset after 10000)`
    };
  }
  const units = curr - prev;
  return {
    units,
    isRollover: false,
    formulaText: `${curr} - ${prev} = ${units} units`
  };
};

export const calculateTataSubmeterBill = (prevReadingStr, currReadingStr, rateStr, manualUnits = null) => {
  const { units, isRollover, formulaText } = calculateSubmeterRollover(prevReadingStr, currReadingStr, manualUnits);
  const rate = parseFloat(rateStr) || 13;
  const grandTotal = units * rate;
  return {
    consumption: units,
    ratePerUnit: rate,
    isRollover,
    calculationNote: formulaText,
    calculationFormula: `${units.toLocaleString('en-IN')} units × ₹${rate.toFixed(2)}/unit`,
    baseAmount: grandTotal,
    grandTotal
  };
};

export function numberToWordsINR(amount) {
  const num = Math.round(Math.abs(Number(amount) || 0));
  if (num === 0) return 'Zero only.';

  const units = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  const convertTwoDigits = (n) => {
    if (n === 0) return '';
    if (n < 20) return units[n];
    const t = Math.floor(n / 10);
    const u = n % 10;
    return tens[t] + (u ? ' ' + units[u] : '');
  };

  const convertThreeDigits = (n) => {
    const h = Math.floor(n / 100);
    const r = n % 100;
    let str = '';
    if (h) str += units[h] + ' Hundred';
    if (r) str += (str ? ' ' : '') + convertTwoDigits(r);
    return str;
  };

  const crore = Math.floor(num / 10000000);
  const lakh = Math.floor((num % 10000000) / 100000);
  const thousand = Math.floor((num % 100000) / 1000);
  const remainder = num % 1000;

  let parts = [];
  if (crore) parts.push(convertThreeDigits(crore) + ' Crore');
  if (lakh) parts.push(convertThreeDigits(lakh) + ' Lakh');
  if (thousand) parts.push(convertThreeDigits(thousand) + ' Thousand');
  if (remainder) parts.push(convertThreeDigits(remainder));

  return (parts.join(' ') || 'Zero') + ' only.';
}

export const buildOfficialTataInvoiceHtml = (data, isPageBreak = false) => {
  const billToLines = (data.billTo || '').split('\n').map(l => l.trim()).filter(Boolean);
  return `
    <div class="tata-invoice-sheet ${isPageBreak ? 'page-break' : ''}">
      <!-- Society Header & Logo -->
      <div class="tata-header">
        <div class="tata-logo-col">
          <img src="/logo.png" alt="Majestique Euriska" class="tata-logo-img" onerror="this.style.display='none'; document.getElementById('tata-logo-fallback').style.display='block';" />
          <div id="tata-logo-fallback" class="tata-logo-fallback" style="display: none;">
            <div style="font-size: 15pt; font-weight: 900; letter-spacing: 0.5px;">EURISKA</div>
            <div style="font-size: 7pt; font-weight: bold; letter-spacing: 1.5px;">MAJESTIQUE</div>
          </div>
        </div>
        <div class="tata-header-details">
          <div class="tata-society-title">MAJESTIQUE EURISKA A BUILDING COOPERATIVE HOUSING SOCIETY LTD</div>
          <div style="display: none;">Majestique Euriska Co-Op Housing Society Ltd. • Tata Electricity Sub-Meter Tax Invoice / Bill</div>
          <div class="tata-society-reg">Reg. No PNA/PNA (4)/HSG/(TC)/21207/2019-20 Date 09/08/2019</div>
          <div class="tata-society-addr">
            Address: - S. No.2, Plot No C-1, Village Mohammed Wadi,<br/>
            Taluka Haveli, District Pune, Pune 411060
          </div>
          <div class="tata-society-contact">
            Email: majestiqueeuriska.a@gmail.com &nbsp;&nbsp;&nbsp;&nbsp; Phone No:
          </div>
        </div>
      </div>

      <!-- 3-Column Metadata Box -->
      <table class="tata-meta-table">
        <thead>
          <tr>
            <th style="width: 50%; text-align: left;">Bill To</th>
            <th style="width: 25%; text-align: center;">Invoice Number</th>
            <th style="width: 25%; text-align: center;">Invoice Date</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td class="tata-bill-to-cell">
              <strong>${billToLines[0] || 'Tata Play Broadband Private Limited'}</strong><br/>
              ${billToLines.slice(1).join('<br/>')}
              <span style="display: none;">Tata Play Limited</span>
            </td>
            <td class="tata-meta-center">
              <strong>${data.invoiceNo}</strong>
            </td>
            <td class="tata-meta-center">
              <strong>${data.invoiceDateStr}</strong>
            </td>
          </tr>
        </tbody>
      </table>

      <!-- Main Services & Reading Table -->
      <table class="tata-services-table">
        <thead>
          <tr>
            <th style="width: 62%; text-align: center;">Description of Services</th>
            <th style="width: 18%; text-align: center;">Rate/Per unit</th>
            <th style="width: 20%; text-align: center;">Amount</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td class="tata-desc-cell">
              <div class="tata-line-item">Electricity Charges for the month ${data.monthRangeText}</div>
              <div class="tata-line-item">Society Name &rarr; ${data.societyName}</div>
              <div class="tata-line-sub">Previous Reading(A) &rarr; ${data.prevReading}</div>
              <div class="tata-line-sub">Current Reading(B) &rarr; ${data.currReading} ${data.meterNote || ''}</div>
              <div class="tata-line-sub">Total Consumption(B-A) &rarr; ${data.consumption}</div>
              <div class="tata-line-item" style="margin-top: 16px;">Per unit Charges &rarr; ${data.ratePerUnit}</div>
            </td>
            <td class="tata-rate-cell">
              ${data.ratePerUnit}
            </td>
            <td class="tata-amount-cell">
              ${fmt(data.baseAmount)}
            </td>
          </tr>
          <tr>
            <td colspan="2" class="tata-summary-label">Total :-</td>
            <td class="tata-summary-val">${fmt(data.baseAmount)}</td>
          </tr>
          <tr>
            <td colspan="2" class="tata-summary-label">ADD CGST 9%</td>
            <td class="tata-summary-val">${data.cgstAmount ? fmt(data.cgstAmount) : '0.0'}</td>
          </tr>
          <tr>
            <td colspan="2" class="tata-summary-label">ADD SGST 9%</td>
            <td class="tata-summary-val">${data.sgstAmount ? fmt(data.sgstAmount) : '0.0'}</td>
          </tr>
          <tr class="tata-grand-row">
            <td colspan="2" class="tata-summary-label" style="font-weight: 900;">Grand Total</td>
            <td class="tata-summary-val" style="font-weight: 900;">${fmt(data.grandTotal)}</td>
          </tr>
        </tbody>
      </table>

      <!-- Amount in Words & Stamp Box -->
      <div class="tata-stamp-wrapper">
        <div class="tata-words-box">
          <div style="font-weight: bold; margin-bottom: 4px;">Amount in word: -</div>
          <div style="font-size: 9pt; line-height: 1.4; font-weight: 600;">${data.amountWords}</div>
        </div>
        <div class="tata-stamp-box">
          <div class="tata-seal-circle">
            <div class="tata-seal-ring">MAJESTIQUE EURISKA 'A' BUILDING SAH. GRUHRACHANA SANSTHA MARYADIT</div>
            <div class="tata-seal-inner">
              <div style="font-size: 6pt; font-weight: bold;">Reg. No.</div>
              <div style="font-size: 5.5pt; font-weight: bold; line-height: 1.1;">PNA/PNA/(4)/<br/>HSG/(TC)/21207</div>
              <div style="font-size: 5.5pt;">2019-20</div>
              <div style="font-size: 5.5pt; font-weight: bold;">Dt. 9/8/19</div>
            </div>
          </div>
          <svg class="tata-sig-svg" viewBox="0 0 100 40">
            <path d="M10 28 Q 20 5, 30 25 T 50 15 T 70 28 T 90 20" fill="none" stroke="#000000" stroke-width="2.2" stroke-linecap="round" />
            <path d="M25 22 Q 40 38, 85 24" fill="none" stroke="#000000" stroke-width="1.8" stroke-linecap="round" />
          </svg>
        </div>
      </div>

      <!-- Company Footer -->
      <div class="tata-footer-box">
        <div>Company address: ${data.companyAddress}</div>
        <div>Company PAN : ${data.companyPan}</div>
      </div>
    </div>
  `;
};

export const getOfficialTataInvoiceStyles = () => `
  @page {
    size: A4 portrait;
    margin: 12mm 15mm 12mm 15mm;
  }
  * {
    box-sizing: border-box;
  }
  body {
    margin: 0;
    padding: 0;
    font-family: Arial, Helvetica, sans-serif;
    color: #000;
    background: #fff;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .tata-invoice-sheet {
    width: 100%;
    max-width: 780px;
    margin: 0 auto;
    padding: 10px 14px;
    box-sizing: border-box;
    font-family: Arial, Helvetica, sans-serif;
    color: #000;
    background: #fff;
    position: relative;
  }
  .tata-invoice-sheet.page-break {
    page-break-after: always;
  }
  .tata-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 14px;
    gap: 16px;
  }
  .tata-logo-col {
    width: 110px;
    flex-shrink: 0;
    text-align: center;
  }
  .tata-logo-img {
    max-width: 100px;
    max-height: 80px;
    object-fit: contain;
  }
  .tata-header-details {
    flex: 1;
    text-align: center;
  }
  .tata-society-title {
    font-size: 11.5pt;
    font-weight: 900;
    letter-spacing: 0.2px;
    text-transform: uppercase;
    color: #000;
    margin-bottom: 4px;
    line-height: 1.25;
  }
  .tata-society-reg {
    font-size: 8.5pt;
    font-weight: 700;
    color: #111;
    margin-bottom: 2px;
  }
  .tata-society-addr {
    font-size: 8pt;
    color: #222;
    line-height: 1.3;
    margin-bottom: 2px;
  }
  .tata-society-contact {
    font-size: 8pt;
    color: #222;
  }

  table.tata-meta-table,
  table.tata-services-table {
    width: 100%;
    border-collapse: collapse;
    border: 1.5px solid #000;
    font-size: 9pt;
  }
  table.tata-meta-table {
    margin-bottom: -1.5px;
  }
  table.tata-meta-table th,
  table.tata-meta-table td,
  table.tata-services-table th,
  table.tata-services-table td {
    border: 1.5px solid #000;
    padding: 6px 8px;
    color: #000;
    vertical-align: top;
  }
  table.tata-meta-table th {
    font-weight: 900;
    font-size: 9pt;
    background: #fff;
  }
  .tata-bill-to-cell {
    font-size: 8.5pt;
    line-height: 1.35;
  }
  .tata-meta-center {
    text-align: center;
    vertical-align: middle !important;
    font-size: 9.5pt;
  }

  table.tata-services-table th {
    font-weight: 900;
    font-size: 9pt;
    text-align: center;
    background: #fff;
    padding: 7px 6px;
  }
  .tata-desc-cell {
    font-size: 9pt;
    line-height: 1.45;
    padding: 12px 10px !important;
    min-height: 140px;
  }
  .tata-line-item {
    font-weight: 800;
    margin-bottom: 8px;
  }
  .tata-line-sub {
    font-weight: 800;
    margin-bottom: 3px;
  }
  .tata-rate-cell {
    text-align: center;
    vertical-align: top !important;
    font-weight: 800;
    font-size: 9.5pt;
    padding-top: 12px !important;
  }
  .tata-amount-cell {
    text-align: right;
    vertical-align: top !important;
    font-weight: 800;
    font-size: 9.5pt;
    padding-top: 12px !important;
  }
  .tata-summary-label {
    text-align: right;
    font-weight: 800;
    font-size: 9pt;
    padding-right: 14px !important;
  }
  .tata-summary-val {
    text-align: right;
    font-weight: 800;
    font-size: 9.5pt;
    padding-right: 8px !important;
  }
  .tata-grand-row td {
    font-weight: 900;
    font-size: 9.8pt;
  }

  .tata-stamp-wrapper {
    display: flex;
    border: 1.5px solid #000;
    border-top: none;
    margin-bottom: -1.5px;
    min-height: 105px;
  }
  .tata-words-box {
    flex: 1;
    padding: 8px 12px;
    border-right: 1.5px solid #000;
    display: flex;
    flex-direction: column;
    justify-content: flex-start;
  }
  .tata-stamp-box {
    width: 250px;
    padding: 6px 10px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: flex-end;
    position: relative;
    overflow: hidden;
  }
  .tata-seal-circle {
    position: relative;
    width: 82px;
    height: 82px;
    border: 2px dashed #3b286d;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #3b286d;
    opacity: 0.85;
    margin-bottom: -22px;
  }
  .tata-seal-ring {
    position: absolute;
    inset: 2px;
    border: 1px solid #3b286d;
    border-radius: 50%;
    font-size: 4pt;
    text-transform: uppercase;
    text-align: center;
    padding: 3px;
    line-height: 1;
    font-weight: 800;
  }
  .tata-seal-inner {
    position: relative;
    z-index: 2;
    text-align: center;
    font-size: 5.5pt;
    line-height: 1.1;
    font-weight: 700;
  }
  .tata-sig-svg {
    position: relative;
    z-index: 3;
    width: 110px;
    height: 40px;
    margin-top: -16px;
    margin-bottom: 2px;
  }
  .tata-stamp-caption {
    font-size: 8.5pt;
    font-weight: 800;
    color: #000;
    text-align: center;
  }

  .tata-footer-box {
    border: 1.5px solid #000;
    padding: 6px 10px;
    font-size: 8pt;
    line-height: 1.35;
    font-weight: 700;
    color: #000;
  }
`;

// Verified Audited Tata Play Sub-Meter Bills (Sep 2025 to Mar 2023)
export const DEFAULT_TATA_SEED = [
  {
    id: 2001,
    periodLabel: 'Sep 25 to 18th May 26',
    startMonth: '2025-09-01',
    endMonth: '2026-05-18',
    duration: '~8.5 Months (260 Days)',
    prevReading: '2568',
    currReading: '1557',
    isRollover: true,
    consumption: 8988,
    ratePerUnit: 13,
    calculationNote: '(10,000 - 2,568) + 1,557 = 8,988 units (Reset after 10000)',
    calculationFormula: '8,988 units × ₹13.00/unit',
    baseAmount: 116844,
    grandTotal: 116844,
    status: 'Invoiced'
  },
  {
    id: 2002,
    periodLabel: 'Mar 25 to August 25',
    startMonth: '2025-03-01',
    endMonth: '2025-08-31',
    duration: '6 Months (184 Days)',
    prevReading: '9073',
    currReading: '2568',
    isRollover: true,
    consumption: 3495,
    ratePerUnit: 13,
    calculationNote: '(10,000 - 9,073) + 2,568 = 3,495 units (Reset after 10000)',
    calculationFormula: '3,495 units × ₹13.00/unit',
    baseAmount: 45435,
    grandTotal: 45435,
    status: 'Paid'
  },
  {
    id: 2003,
    periodLabel: 'Nov 24 to Feb 25',
    startMonth: '2024-11-01',
    endMonth: '2025-02-28',
    duration: '4 Months (120 Days)',
    prevReading: '6996',
    currReading: '9073',
    isRollover: false,
    consumption: 2077,
    ratePerUnit: 13,
    calculationNote: '9,073 - 6,996 = 2,077 units',
    calculationFormula: '2,077 units × ₹13.00/unit',
    baseAmount: 27001,
    grandTotal: 27001,
    status: 'Paid'
  },
  {
    id: 2004,
    periodLabel: 'Jun 24 to Oct 24',
    startMonth: '2024-06-01',
    endMonth: '2024-10-31',
    duration: '5 Months (153 Days)',
    prevReading: '4354',
    currReading: '6996',
    isRollover: false,
    consumption: 2642,
    ratePerUnit: 13,
    calculationNote: '6,996 - 4,354 = 2,642 units',
    calculationFormula: '2,642 units × ₹13.00/unit',
    baseAmount: 34346,
    grandTotal: 34346,
    status: 'Paid'
  },
  {
    id: 2005,
    periodLabel: 'Feb 24 to May 24',
    startMonth: '2024-02-01',
    endMonth: '2024-05-31',
    duration: '4 Months (121 Days)',
    prevReading: '2607',
    currReading: '4354',
    isRollover: false,
    consumption: 1747,
    ratePerUnit: 12.50,
    calculationNote: '4,354 - 2,607 = 1,747 units',
    calculationFormula: '1,747 units × ₹12.50/unit',
    baseAmount: 21837.5,
    grandTotal: 21837.5,
    status: 'Paid'
  },
  {
    id: 2006,
    periodLabel: 'Nov 23 to Jan 24',
    startMonth: '2023-11-01',
    endMonth: '2024-01-31',
    duration: '3 Months (92 Days)',
    prevReading: '1353',
    currReading: '2607',
    isRollover: false,
    consumption: 1254,
    ratePerUnit: 11.50,
    calculationNote: '2,607 - 1,353 = 1,254 units',
    calculationFormula: '1,254 units × ₹11.50/unit',
    baseAmount: 14421,
    grandTotal: 14421,
    status: 'Paid'
  },
  {
    id: 2007,
    periodLabel: 'Aug 23 to Oct 23',
    startMonth: '2023-08-01',
    endMonth: '2023-10-31',
    duration: '3 Months (92 Days)',
    prevReading: '0177',
    currReading: '1353',
    isRollover: false,
    consumption: 1176,
    ratePerUnit: 11.50,
    calculationNote: '1,353 - 177 = 1,176 units',
    calculationFormula: '1,176 units × ₹11.50/unit',
    baseAmount: 13524,
    grandTotal: 13524,
    status: 'Paid'
  },
  {
    id: 2008,
    periodLabel: 'Mar 23 to Jul 23',
    startMonth: '2023-03-01',
    endMonth: '2023-07-31',
    duration: '5 Months (153 Days)',
    prevReading: '7629',
    currReading: '0177',
    isRollover: true,
    consumption: 2548,
    ratePerUnit: 11.50,
    calculationNote: '(10,000 - 7,629) + 177 = 2,548 units (Reset after 10000)',
    calculationFormula: '2,548 units × ₹11.50/unit',
    baseAmount: 29302,
    grandTotal: 29302,
    status: 'Paid'
  }
];

// Verified 10-Month Building 'A' Common Lift Electricity Bills (MSEDCL Consumer No: 170003586858)
export const DEFAULT_BUILDING_A_SEED = [
  {
    id: 3001,
    consumerNo: '170003586858',
    meterNo: '08210034428',
    periodLabel: 'Sep 2026 (16 Aug – 14 Sep)',
    startMonth: '2026-08-16',
    endMonth: '2026-09-14',
    billDate: '2026-09-19',
    dueDate: '2026-10-09',
    duration: '30 Days (0.97 Mo)',
    prevReading: '148485',
    currReading: '150245',
    consumption: 1760,
    ratePerUnit: 21.10,
    fixedCharge: 445.00,
    energyCharge: 27745.89,
    wheelingCharge: 2816.00,
    fuelAdj: 724.10,
    dutyAmount: 5076.96,
    arrearsAmount: 333.60,
    promptDiscount: 317.31,
    promptAmount: 36820.00,
    delayedCharge: 460.10,
    afterDueAmount: 37600.00,
    grandTotal: 37140.00,
    paidAmount: 37140.00,
    status: 'Invoiced',
    paymentDate: null,
    note: 'Current Bill. Prompt pay: ₹36,820 by 28-Sep. Due: ₹37,140 by 09-Oct. After due: ₹37,600.'
  },
  {
    id: 3002,
    consumerNo: '170003586858',
    meterNo: '08210034428',
    periodLabel: 'Aug 2026 (16 Jul – 15 Aug)',
    startMonth: '2026-07-16',
    endMonth: '2026-08-15',
    billDate: '2026-08-19',
    dueDate: '2026-09-08',
    duration: '31 Days (1.0 Mo)',
    prevReading: '146653',
    currReading: '148485',
    consumption: 1832,
    ratePerUnit: 21.17,
    fixedCharge: 445.00,
    energyCharge: 29007.45,
    wheelingCharge: 2931.20,
    fuelAdj: 756.50,
    dutyAmount: 5302.42,
    grandTotal: 38780.00,
    paidAmount: 38780.00,
    status: 'Paid',
    paymentDate: '2026-08-29',
    note: 'Paid ₹38,780.00 on 29-Aug-2026 via MSEDCL Portal / Bank'
  },
  {
    id: 3003,
    consumerNo: '170003586858',
    meterNo: '08210034428',
    periodLabel: 'Jul 2026 (16 Jun – 15 Jul)',
    startMonth: '2026-06-16',
    endMonth: '2026-07-15',
    billDate: '2026-07-19',
    dueDate: '2026-08-08',
    duration: '30 Days (1.0 Mo)',
    prevReading: '144788',
    currReading: '146653',
    consumption: 1865,
    ratePerUnit: 21.20,
    fixedCharge: 445.00,
    energyCharge: 29586.00,
    wheelingCharge: 2984.00,
    fuelAdj: 771.35,
    dutyAmount: 5405.82,
    grandTotal: 39530.00,
    paidAmount: 39530.00,
    status: 'Paid',
    paymentDate: '2026-07-29',
    note: 'Paid ₹39,530.00 on 29-Jul-2026 via MSEDCL Portal / Bank'
  },
  {
    id: 3004,
    consumerNo: '170003586858',
    meterNo: '08210034428',
    periodLabel: 'Jun 2026 (16 May – 15 Jun)',
    startMonth: '2026-05-16',
    endMonth: '2026-06-15',
    billDate: '2026-06-19',
    dueDate: '2026-07-08',
    duration: '31 Days (1.0 Mo)',
    prevReading: '142971',
    currReading: '144788',
    consumption: 1817,
    ratePerUnit: 21.16,
    fixedCharge: 445.00,
    energyCharge: 28744.47,
    wheelingCharge: 2907.20,
    fuelAdj: 749.75,
    dutyAmount: 5255.43,
    grandTotal: 38440.00,
    paidAmount: 38440.00,
    status: 'Paid',
    paymentDate: '2026-06-30',
    note: 'Paid ₹38,440.00 on 30-Jun-2026 via MSEDCL Portal / Bank'
  },
  {
    id: 3005,
    consumerNo: '170003586858',
    meterNo: '08210034428',
    periodLabel: 'May 2026 (16 Apr – 15 May)',
    startMonth: '2026-04-16',
    endMonth: '2026-05-15',
    billDate: '2026-05-19',
    dueDate: '2026-06-08',
    duration: '30 Days (1.0 Mo)',
    prevReading: '141062',
    currReading: '142971',
    consumption: 1909,
    ratePerUnit: 21.23,
    fixedCharge: 445.00,
    energyCharge: 30357.33,
    wheelingCharge: 3054.40,
    fuelAdj: 791.15,
    dutyAmount: 5543.66,
    grandTotal: 40520.00,
    paidAmount: 40520.00,
    status: 'Paid',
    paymentDate: '2026-05-29',
    note: 'Peak Summer Month. Paid ₹40,520.00 on 29-May-2026 via MSEDCL Portal / Bank'
  },
  {
    id: 3006,
    consumerNo: '170003586858',
    meterNo: '08210034428',
    periodLabel: 'Apr 2026 (16 Mar – 15 Apr)',
    startMonth: '2026-03-16',
    endMonth: '2026-04-15',
    billDate: '2026-04-19',
    dueDate: '2026-05-08',
    duration: '31 Days (1.0 Mo)',
    prevReading: '139209',
    currReading: '141062',
    consumption: 1853,
    ratePerUnit: 21.19,
    fixedCharge: 445.00,
    energyCharge: 29375.65,
    wheelingCharge: 2964.80,
    fuelAdj: 765.95,
    dutyAmount: 5368.22,
    grandTotal: 39260.00,
    paidAmount: 39260.00,
    status: 'Paid',
    paymentDate: '2026-04-22',
    note: 'Paid ₹39,260.00 on 22-Apr-2026 via MSEDCL Portal / Bank'
  },
  {
    id: 3007,
    consumerNo: '170003586858',
    meterNo: '08210034428',
    periodLabel: 'Mar 2026 (16 Feb – 15 Mar)',
    startMonth: '2026-02-16',
    endMonth: '2026-03-15',
    billDate: '2026-03-19',
    dueDate: '2026-04-08',
    duration: '28 Days (1.0 Mo)',
    prevReading: '137503',
    currReading: '139209',
    consumption: 1706,
    ratePerUnit: 21.05,
    fixedCharge: 445.00,
    energyCharge: 26800.74,
    wheelingCharge: 2729.60,
    fuelAdj: 699.80,
    dutyAmount: 4908.02,
    grandTotal: 35920.00,
    paidAmount: 35920.00,
    status: 'Paid',
    paymentDate: '2026-03-24',
    note: 'Paid ₹35,920.00 on 24-Mar-2026 via MSEDCL Portal / Bank'
  },
  {
    id: 3008,
    consumerNo: '170003586858',
    meterNo: '08210034428',
    periodLabel: 'Feb 2026 (16 Jan – 15 Feb)',
    startMonth: '2026-01-16',
    endMonth: '2026-02-15',
    billDate: '2026-02-19',
    dueDate: '2026-03-08',
    duration: '31 Days (1.0 Mo)',
    prevReading: '135853',
    currReading: '137503',
    consumption: 1650,
    ratePerUnit: 21.00,
    fixedCharge: 445.00,
    energyCharge: 25819.06,
    wheelingCharge: 2640.00,
    fuelAdj: 674.60,
    dutyAmount: 4732.59,
    grandTotal: 34650.00,
    paidAmount: 34650.00,
    status: 'Paid',
    paymentDate: '2026-02-26',
    note: 'Winter Month. Paid ₹34,650.00 on 26-Feb-2026'
  },
  {
    id: 3009,
    consumerNo: '170003586858',
    meterNo: '08210034428',
    periodLabel: 'Jan 2026 (16 Dec – 15 Jan)',
    startMonth: '2025-12-16',
    endMonth: '2026-01-15',
    billDate: '2026-01-19',
    dueDate: '2026-02-08',
    duration: '31 Days (1.0 Mo)',
    prevReading: '134173',
    currReading: '135853',
    consumption: 1680,
    ratePerUnit: 21.03,
    fixedCharge: 445.00,
    energyCharge: 26344.96,
    wheelingCharge: 2688.00,
    fuelAdj: 688.10,
    dutyAmount: 4826.57,
    grandTotal: 35330.00,
    paidAmount: 35330.00,
    status: 'Paid',
    paymentDate: '2026-01-28',
    note: 'Paid ₹35,330.00 on 28-Jan-2026'
  },
  {
    id: 3010,
    consumerNo: '170003586858',
    meterNo: '08210034428',
    periodLabel: 'Dec 2025 (16 Nov – 15 Dec)',
    startMonth: '2025-11-16',
    endMonth: '2025-12-15',
    billDate: '2025-12-19',
    dueDate: '2026-01-08',
    duration: '30 Days (1.0 Mo)',
    prevReading: '132533',
    currReading: '134173',
    consumption: 1640,
    ratePerUnit: 20.99,
    fixedCharge: 445.00,
    energyCharge: 25643.76,
    wheelingCharge: 2624.00,
    fuelAdj: 670.10,
    dutyAmount: 4701.26,
    grandTotal: 34420.00,
    paidAmount: 34420.00,
    status: 'Paid',
    paymentDate: '2025-12-27',
    note: 'Paid ₹34,420.00 on 27-Dec-2025'
  }
];

/**
 * Distributes a billing period's total consumption across individual calendar months.
 * Uses proportional distribution based on the number of days in each month.
 * Returns an array of { monthKey: 'YYYY-MM', label: 'Mon YY', units, estCost, days, avgDaily }
 */
export const computeMonthlyConsumption = (bills) => {
  // Map from 'YYYY-MM' => { label, units, estCost, days }
  const monthMap = {};

  for (const bill of bills) {
    if (!bill.startMonth || !bill.endMonth) continue;
    const totalUnits = parseFloat(bill.consumption) || 0;
    const rate = parseFloat(bill.ratePerUnit) || 13;
    const totalCost = parseFloat(bill.grandTotal) || (totalUnits * rate);
    if (totalUnits <= 0) continue;

    // Parse dates — support both 'YYYY-MM-DD' and 'YYYY-MM'
    const parseDate = (str) => {
      if (!str) return null;
      if (/^\d{4}-\d{2}$/.test(str)) return new Date(str + '-01');
      return new Date(str);
    };

    const start = parseDate(bill.startMonth);
    const end = parseDate(bill.endMonth);
    if (!start || !end || isNaN(start) || isNaN(end)) continue;

    // Total billing days
    const totalDays = Math.max(1, Math.round((end - start) / (1000 * 60 * 60 * 24)) + 1);

    // Walk month by month within the billing period
    let cursor = new Date(start.getFullYear(), start.getMonth(), 1);
    while (cursor <= end) {
      const y = cursor.getFullYear();
      const m = cursor.getMonth(); // 0-indexed

      // Days in this calendar month
      const monthStart = new Date(y, m, 1);
      const monthEnd = new Date(y, m + 1, 0); // last day of month

      // Overlap between billing period and this calendar month
      const overlapStart = start > monthStart ? start : monthStart;
      const overlapEnd = end < monthEnd ? end : monthEnd;
      const overlapDays = Math.max(0, Math.round((overlapEnd - overlapStart) / (1000 * 60 * 60 * 24)) + 1);

      if (overlapDays > 0) {
        const fraction = overlapDays / totalDays;
        const monthUnits = totalUnits * fraction;
        const monthCost = totalCost * fraction;

        const key = `${y}-${String(m + 1).padStart(2, '0')}`;
        const label = new Intl.DateTimeFormat('en-IN', { month: 'short', year: '2-digit' }).format(new Date(y, m, 1));

        if (!monthMap[key]) {
          monthMap[key] = { monthKey: key, label, units: 0, estCost: 0, days: 0 };
        }
        monthMap[key].units += monthUnits;
        monthMap[key].estCost += monthCost;
        monthMap[key].days += overlapDays;
      }

      // Advance to next month
      cursor = new Date(y, m + 1, 1);
    }
  }

  return Object.values(monthMap)
    .sort((a, b) => a.monthKey.localeCompare(b.monthKey))
    .map(m => ({
      ...m,
      units: parseFloat(m.units.toFixed(1)),
      estCost: parseFloat(m.estCost.toFixed(2)),
      avgDaily: m.days > 0 ? parseFloat((m.units / m.days).toFixed(2)) : 0
    }));
};

export default function ElectricityTracker({ isAdmin = false }) {
  const [subTab, setSubTab] = useState('tata'); // 'tata', 'buildingA', 'mahavitaran'

  const [tataBills, setTataBills] = useState(DEFAULT_TATA_SEED);
  const [buildingABills, setBuildingABills] = useState(DEFAULT_BUILDING_A_SEED);
  const [mahavitaranBills, setMahavitaranBills] = useState([]);

  const [searchText, setSearchText] = useState('');
  const [editingRowId, setEditingRowId] = useState(null);

  const [isLoading, setIsLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState('idle');
  const [saveMsg, setSaveMsg] = useState('');

  // Tata Electricity Invoice Modal States
  const [isTataInvoiceModalOpen, setIsTataInvoiceModalOpen] = useState(false);
  const [selectedTataBillId, setSelectedTataBillId] = useState(null);
  const [tataInvoiceTarget, setTataInvoiceTarget] = useState('single'); // 'single' | 'all'
  const [tataInvoiceDate, _setTataInvoiceDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });
  const [tataInvoiceDueDate, _setTataInvoiceDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });
  const [tataInvoiceRefPrefix, _setTataInvoiceRefPrefix] = useState('INV-ME/TATA/2026-27/');
  const [tataInvoiceToast, setTataInvoiceToast] = useState('');

  // Official Tata Play Electricity Invoice Inputs
  const [tataMonthRangeText, setTataMonthRangeText] = useState('Sep 25 to May 26');
  const [tataSocietyName, setTataSocietyName] = useState('Majestique Euriska CHS');
  const [tataPrevReading, setTataPrevReading] = useState('2568.00');
  const [tataCurrReading, setTataCurrReading] = useState('1557.00');
  const [tataMeterNote, setTataMeterNote] = useState('(4 Digit Sub Meter)');
  const [tataConsumption, setTataConsumption] = useState('8988.00');
  const [tataRatePerUnit, setTataRatePerUnit] = useState('13.00');
  const [tataBillTo, setTataBillTo] = useState(
    'Tata Play Broadband Private Limited\nC/o. Bakshi Associates Pvt Ltd, Gat no.90 AP\nKesnand, Taluka Haveli, Kesnand-theur road,\nJadhav Wasti, Pune, Pune, Maharashtra, 412207\nPune.'
  );
  const [tataInvoiceNo, setTataInvoiceNo] = useState('2026/01');
  const [tataInvoiceDateStr, setTataInvoiceDateStr] = useState('18 May 2026');
  const [tataCgstRate, setTataCgstRate] = useState('0.0');
  const [tataSgstRate, setTataSgstRate] = useState('0.0');
  const [tataCompanyAddress, setTataCompanyAddress] = useState('Majestique Euriska, Mahadev Wadi Pune 411060. Mob No. 8999080253');
  const [tataCompanyPan, setTataCompanyPan] = useState('AAKAM0091J');

  const handlePrevReadingChange = (val) => {
    setTataPrevReading(val);
    const p = parseFloat(val);
    const c = parseFloat(tataCurrReading);
    if (!isNaN(p) && !isNaN(c)) {
      let cons = c < p ? (10000 - p) + c : c - p;
      if (cons > 0) setTataConsumption(cons.toFixed(2));
    }
  };

  const handleCurrReadingChange = (val) => {
    setTataCurrReading(val);
    const p = parseFloat(tataPrevReading);
    const c = parseFloat(val);
    if (!isNaN(p) && !isNaN(c)) {
      let cons = c < p ? (10000 - p) + c : c - p;
      if (cons > 0) setTataConsumption(cons.toFixed(2));
    }
  };

  const handleSelectTataBillForInvoice = (b) => {
    setSelectedTataBillId(b.id);
    setTataMonthRangeText(b.periodLabel ? b.periodLabel.replace(/Electricity Bill Tata Play\s*/i, '') : 'Sep 25 to May 26');
    setTataSocietyName('Majestique Euriska CHS');
    setTataPrevReading(Number(b.prevReading || 0).toFixed(2));
    setTataCurrReading(Number(b.currReading || 0).toFixed(2));
    setTataMeterNote(b.isRollover ? '(4 Digit Sub Meter)' : '(4 Digit Sub Meter)');
    setTataConsumption(Number(b.consumption || 0).toFixed(2));
    setTataRatePerUnit(Number(b.ratePerUnit || 13).toFixed(2));
    setTataInvoiceNo(b.id === 2001 ? '2026/01' : `2026/${String(b.id).slice(-2)}`);
    if (b.endMonth) {
      const d = new Date(b.endMonth);
      setTataInvoiceDateStr(d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }));
    }
  };

  const handleResetToUploadedInvoice = () => {
    setTataMonthRangeText('Sep 25 to May 26');
    setTataSocietyName('Majestique Euriska CHS');
    setTataPrevReading('2568.00');
    setTataCurrReading('1557.00');
    setTataMeterNote('(4 Digit Sub Meter)');
    setTataConsumption('8988.00');
    setTataRatePerUnit('13.00');
    setTataBillTo(
      'Tata Play Broadband Private Limited\nC/o. Bakshi Associates Pvt Ltd, Gat no.90 AP\nKesnand, Taluka Haveli, Kesnand-theur road,\nJadhav Wasti, Pune, Pune, Maharashtra, 412207\nPune.'
    );
    setTataInvoiceNo('2026/01');
    setTataInvoiceDateStr('18 May 2026');
    setTataCgstRate('0.0');
    setTataSgstRate('0.0');
    setTataCompanyAddress('Majestique Euriska, Mahadev Wadi Pune 411060. Mob No. 8999080253');
    setTataCompanyPan('AAKAM0091J');
    setSelectedTataBillId(2001);
  };

  const isLoadedRef = useRef(false);
  const autoSaveTimer = useRef(null);

  const tataRecordId = 'tata_electricity_bills';
  const buildingARecordId = 'building_a_electricity_bills';
  const mahavitaranRecordId = 'mahavitaran_electricity_bills';

  // Load from Firebase & ensure old template data is replaced with audited Tata bills
  useEffect(() => {
    let cancelled = false;
    isLoadedRef.current = false;
    setSaveStatus('idle');
    setSaveMsg('');

    async function load() {
      setIsLoading(true);
      if (!isFirebaseConfigured || !db) {
        setTataBills(DEFAULT_TATA_SEED);
        setBuildingABills(DEFAULT_BUILDING_A_SEED);
        setMahavitaranBills([]);
        setSaveMsg('Ready (Local/Offline)');
        setIsLoading(false);
        isLoadedRef.current = true;
        return;
      }

      try {
        await ensureFirebaseSession();

        const [snapTata, snapBuildingA, snapMahavitaran] = await Promise.all([
          getDoc(doc(db, 'electricityTracking', tataRecordId)),
          getDoc(doc(db, 'electricityTracking', buildingARecordId)),
          getDoc(doc(db, 'electricityTracking', mahavitaranRecordId))
        ]);

        if (!cancelled) {
          let tataData = snapTata.exists() ? snapTata.data().bills || [] : [];
          // If stored data contains the old 9-month template or lacks periodLabel, update it to audited data
          const isOldSeed = tataData.length === 0 ||
            tataData.some(b => b.id === 1001 || b.id === 1009) ||
            !tataData.some(b => b.periodLabel);

          if (isOldSeed) {
            tataData = DEFAULT_TATA_SEED;
            // Overwrite Firebase with new verified data
            try {
              await setDoc(doc(db, 'electricityTracking', tataRecordId), {
                bills: DEFAULT_TATA_SEED,
                updatedAt: new Date().toISOString()
              });
            } catch (err) {
              console.warn('Initial seed sync error:', err);
            }
          }

          let buildingAData = snapBuildingA.exists() ? snapBuildingA.data().bills || [] : [];
          const isOldBuildingASeed = buildingAData.length === 0 ||
            !buildingAData.some(b => b.consumerNo === '170003586858' || b.id === 3001);

          if (isOldBuildingASeed) {
            buildingAData = DEFAULT_BUILDING_A_SEED;
            try {
              await setDoc(doc(db, 'electricityTracking', buildingARecordId), {
                bills: DEFAULT_BUILDING_A_SEED,
                updatedAt: new Date().toISOString()
              });
            } catch (err) {
              console.warn('Building A initial seed sync error:', err);
            }
          }

          setTataBills(tataData);
          setBuildingABills(buildingAData);
          setMahavitaranBills(snapMahavitaran.exists() ? snapMahavitaran.data().bills || [] : []);
          setSaveMsg('Synced');
        }
      } catch (err) {
        console.error('Bills load error:', err);
        if (!cancelled) {
          setTataBills(DEFAULT_TATA_SEED);
          setBuildingABills(DEFAULT_BUILDING_A_SEED);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
          isLoadedRef.current = true;
        }
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  const saveToFirebase = useCallback(async (data, targetId) => {
    setSaveStatus('saving');
    if (!isFirebaseConfigured || !db) {
      setSaveStatus('saved');
      return;
    }
    try {
      await ensureFirebaseSession();
      await setDoc(doc(db, 'electricityTracking', targetId), {
        bills: data,
        updatedAt: new Date().toISOString()
      });
      setSaveStatus('saved');
      setSaveMsg('All changes saved to cloud');
      setTimeout(() => {
        setSaveStatus('idle');
        setSaveMsg('');
      }, 3000);
    } catch (err) {
      console.error('Save error:', err);
      setSaveStatus('error');
      setSaveMsg('Failed to save to cloud');
    }
  }, []);

  const triggerAutoSave = (newData, currentTab) => {
    if (!isLoadedRef.current) return;
    clearTimeout(autoSaveTimer.current);
    setSaveStatus('pending');
    setSaveMsg('Unsaved changes...');

    let targetId = tataRecordId;
    if (currentTab === 'buildingA') targetId = buildingARecordId;
    if (currentTab === 'mahavitaran') targetId = mahavitaranRecordId;

    autoSaveTimer.current = setTimeout(() => {
      saveToFirebase(newData, targetId);
    }, 1500);
  };

  // Dedicated Form State for New Tata Electricity Bill
  const [formData, setFormData] = useState({
    periodLabel: '',
    duration: '',
    startMonth: '',
    endMonth: '',
    prevReading: '',
    currReading: '',
    ratePerUnit: '13',
    consumption: '',
    // MSEB fields for Mahavitaran tab
    msebFixedCharge: '445.00',
    msebEnergyCharge: '',
    msebWheelingRate: '1.60',
    msebFuelAdj: '0.00',
  });

  const sortedTataBills = useMemo(() => {
    return [...tataBills].sort((a, b) => {
      const dateA = a.startMonth ? new Date(a.startMonth) : new Date(0);
      const dateB = b.startMonth ? new Date(b.startMonth) : new Date(0);
      return dateB - dateA;
    });
  }, [tataBills]);

  const latestTataBill = sortedTataBills[0] || null;

  const sortedBuildingABills = useMemo(() => {
    return [...buildingABills].sort((a, b) => {
      const dateA = a.startMonth ? new Date(a.startMonth) : new Date(0);
      const dateB = b.startMonth ? new Date(b.startMonth) : new Date(0);
      return dateB - dateA;
    });
  }, [buildingABills]);

  const latestBuildingABill = sortedBuildingABills[0] || null;

  // Auto-fill next Tata billing cycle based on the latest bill
  const applyNextTataPeriod = () => {
    if (!latestTataBill) return;
    const lastEnd = latestTataBill.endMonth;
    let nextStart = '';
    let nextEnd = '';
    if (lastEnd) {
      const d = new Date(lastEnd);
      d.setDate(d.getDate() + 1);
      nextStart = d.toISOString().split('T')[0];
      const d2 = new Date(d);
      d2.setMonth(d2.getMonth() + 4);
      nextEnd = d2.toISOString().split('T')[0];
    }
    const prevReading = String(latestTataBill.currReading || '');
    const autoDuration = nextStart && nextEnd ? computeBillingDuration(nextStart, nextEnd) : '4 Months';
    setFormData(prev => ({
      ...prev,
      periodLabel: `May 26 to Sep 26`,
      startMonth: nextStart || prev.startMonth,
      endMonth: nextEnd || prev.endMonth,
      duration: autoDuration,
      prevReading: prevReading || prev.prevReading,
      ratePerUnit: '13'
    }));
  };

  // Auto-fill next Building A billing cycle based on the latest bill
  const applyNextBuildingAPeriod = () => {
    if (!latestBuildingABill) return;
    const lastEnd = latestBuildingABill.endMonth;
    let nextStart = '';
    let nextEnd = '';
    if (lastEnd) {
      const d = new Date(lastEnd);
      d.setDate(d.getDate() + 1);
      nextStart = d.toISOString().split('T')[0];
      const d2 = new Date(d);
      d2.setMonth(d2.getMonth() + 1);
      nextEnd = d2.toISOString().split('T')[0];
    }
    const prevReading = String(latestBuildingABill.currReading || '150245');
    const autoDuration = nextStart && nextEnd ? computeBillingDuration(nextStart, nextEnd) : '30 Days (1.0 Mo)';
    setFormData(prev => ({
      ...prev,
      periodLabel: `Oct 2026 (15 Sep – 14 Oct)`,
      startMonth: nextStart || prev.startMonth,
      endMonth: nextEnd || prev.endMonth,
      duration: autoDuration,
      prevReading: prevReading || prev.prevReading,
      ratePerUnit: '21.10'
    }));
  };

  const calculateMahavitaranSlabs = (units) => {
    let remaining = units;
    let energyTotal = 0;
    let fuelTotal = 0;
    const breakdown = [];

    const slabs = [
      { name: '0 - 100', limit: 100, energy: 3.96, fuel: 0.150 },
      { name: '101 - 300', limit: 200, energy: 10.80, fuel: 0.300 },
      { name: '301 - 500', limit: 200, energy: 15.03, fuel: 0.400 },
      { name: '501 - 1000', limit: 500, energy: 17.53, fuel: 0.450 },
      { name: '> 1000', limit: Infinity, energy: 17.53, fuel: 0.450 },
    ];

    for (const slab of slabs) {
      if (remaining <= 0) break;
      const unitsInSlab = Math.min(remaining, slab.limit);
      const energyCost = unitsInSlab * slab.energy;
      const fuelCost = unitsInSlab * slab.fuel;

      energyTotal += energyCost;
      fuelTotal += fuelCost;
      remaining -= unitsInSlab;

      breakdown.push({
        slab: slab.name,
        units: unitsInSlab,
        energyRate: slab.energy,
        energyCost,
        fuelRate: slab.fuel,
        fuelCost
      });
    }

    return { energyTotal, fuelTotal, breakdown };
  };

  const handleFormChange = (field, val) => {
    setFormData(prev => {
      const next = { ...prev, [field]: val };

      // Auto compute duration if dates change
      if ((field === 'startMonth' || field === 'endMonth') && next.startMonth && next.endMonth) {
        if (!next.duration || next.duration.includes('Days')) {
          next.duration = computeBillingDuration(next.startMonth, next.endMonth);
        }
      }

      // Auto calculate units & preview for Tata bills
      if (subTab === 'tata' && (field === 'prevReading' || field === 'currReading' || field === 'ratePerUnit')) {
        if (next.prevReading !== '' && next.currReading !== '') {
          const { units } = calculateSubmeterRollover(next.prevReading, next.currReading);
          next.consumption = units;
        }
      }

      // Auto calculate units & preview for Building A bills
      if (subTab === 'buildingA' && (field === 'prevReading' || field === 'currReading')) {
        const p = n(next.prevReading);
        const c = n(next.currReading);
        if (c >= p && p >= 0) {
          next.consumption = c - p;
        }
      }

      // Auto-calculate slabs for Mahavitaran tab
      if (subTab === 'mahavitaran' && (field === 'prevReading' || field === 'currReading')) {
        const p = n(next.prevReading);
        const c = n(next.currReading);
        if (c > p && p >= 0) {
          const units = c - p;
          const { energyTotal, fuelTotal } = calculateMahavitaranSlabs(units);
          next.msebEnergyCharge = energyTotal.toFixed(2);
          next.msebFuelAdj = fuelTotal.toFixed(2);
        } else if (c <= p || !next.currReading) {
          next.msebEnergyCharge = '';
          next.msebFuelAdj = '';
        }
      }
      return next;
    });
  };

  const calculateMahavitaranBill = (prevStr, currStr, fixedStr, energyStr, wheelRateStr, fuelStr) => {
    const prev = n(prevStr);
    const curr = n(currStr);
    const consumption = curr - prev;

    const fixed = n(fixedStr);
    const energy = n(energyStr);
    const wheelRate = n(wheelRateStr);
    const fuel = n(fuelStr);

    const wheelTotal = consumption * wheelRate;
    const subtotal = fixed + energy + wheelTotal + fuel;
    const duty = subtotal * 0.16; // 16% electricity duty
    const exactTotal = subtotal + duty;
    const grandTotal = Math.round(exactTotal);

    return {
      consumption, fixed, energy, wheelRate, wheelTotal, fuel, subtotal, duty, exactTotal, grandTotal
    };
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    if (!isAdmin) {
      alert('You do not have permission to perform this action.');
      return;
    }

    let newBill = {
      ...formData,
      id: Date.now()
    };

    if (subTab === 'tata') {
      const calc = calculateTataSubmeterBill(
        formData.prevReading,
        formData.currReading,
        formData.ratePerUnit,
        formData.consumption ? n(formData.consumption) : null
      );
      const computedDuration = formData.duration || computeBillingDuration(formData.startMonth, formData.endMonth) || 'Custom Period';
      const label = formData.periodLabel || `${formatDateLabel(formData.startMonth)} to ${formatDateLabel(formData.endMonth)}`;

      newBill = {
        ...newBill,
        periodLabel: label,
        duration: computedDuration,
        ...calc,
        status: 'Invoiced'
      };

      const next = [newBill, ...tataBills];
      setTataBills(next);
      triggerAutoSave(next, 'tata');
    } else if (subTab === 'buildingA') {
      const prev = n(formData.prevReading);
      const curr = n(formData.currReading);
      if (curr < prev) {
        alert('Current reading cannot be less than previous reading.');
        return;
      }
      const consumption = curr - prev;
      const { energyTotal, fuelTotal } = calculateMahavitaranSlabs(consumption);
      const fixedCharge = 445.00;
      const wheelingCharge = consumption * 1.60;
      const dutyAmount = (fixedCharge + energyTotal + wheelingCharge + fuelTotal) * 0.16;
      const calculatedTotal = Math.round(fixedCharge + energyTotal + wheelingCharge + fuelTotal + dutyAmount);
      const ratePerUnit = n(formData.ratePerUnit) || parseFloat((calculatedTotal / (consumption || 1)).toFixed(2));
      const grandTotal = calculatedTotal;

      const computedDuration = formData.duration || computeBillingDuration(formData.startMonth, formData.endMonth) || '30 Days (1.0 Mo)';
      const label = formData.periodLabel || `${formatDateLabel(formData.startMonth)} to ${formatDateLabel(formData.endMonth)}`;

      newBill = {
        ...newBill,
        consumerNo: '170003586858',
        meterNo: '08210034428',
        periodLabel: label,
        duration: computedDuration,
        consumption,
        ratePerUnit,
        fixedCharge,
        energyCharge: parseFloat(energyTotal.toFixed(2)),
        wheelingCharge: parseFloat(wheelingCharge.toFixed(2)),
        fuelAdj: parseFloat(fuelTotal.toFixed(2)),
        dutyAmount: parseFloat(dutyAmount.toFixed(2)),
        grandTotal,
        paidAmount: grandTotal,
        status: 'Invoiced'
      };

      const next = [newBill, ...buildingABills];
      setBuildingABills(next);
      triggerAutoSave(next, 'buildingA');
    } else if (subTab === 'mahavitaran') {
      const prev = n(formData.prevReading);
      const curr = n(formData.currReading);
      if (curr < prev) {
        alert('Current reading cannot be less than previous reading.');
        return;
      }
      const calc = calculateMahavitaranBill(
        formData.prevReading, formData.currReading,
        formData.msebFixedCharge, formData.msebEnergyCharge,
        formData.msebWheelingRate, formData.msebFuelAdj
      );
      newBill = { ...newBill, ...calc };
      const next = [...mahavitaranBills, newBill];
      setMahavitaranBills(next);
      triggerAutoSave(next, 'mahavitaran');
    } else {
      const prev = n(formData.prevReading);
      const curr = n(formData.currReading);
      if (curr < prev) {
        alert('Current reading cannot be less than previous reading.');
        return;
      }
      const consumption = curr - prev;
      const rate = n(formData.ratePerUnit);
      const baseAmount = consumption * rate;
      newBill.consumption = consumption;
      newBill.baseAmount = baseAmount;
      newBill.grandTotal = baseAmount;
      const next = [...buildingABills, newBill];
      setBuildingABills(next);
      triggerAutoSave(next, 'buildingA');
    }

    // Reset form
    setFormData({
      periodLabel: '',
      duration: '',
      startMonth: '',
      endMonth: '',
      prevReading: '',
      currReading: '',
      ratePerUnit: '13',
      consumption: '',
      msebFixedCharge: '445.00',
      msebEnergyCharge: '',
      msebWheelingRate: '1.60',
      msebFuelAdj: '0.00',
    });
  };

  const updateRow = (idx, field, val) => {
    if (!isAdmin) return;

    let currentList = tataBills;
    if (subTab === 'buildingA') currentList = buildingABills;
    if (subTab === 'mahavitaran') currentList = mahavitaranBills;

    const next = [...currentList];
    const current = next[idx];
    const updated = { ...current, [field]: val };

    if (subTab === 'tata') {
      if (['prevReading', 'currReading', 'ratePerUnit', 'consumption'].includes(field)) {
        const manualUnits = field === 'consumption' ? n(val) : (updated.consumption ? n(updated.consumption) : null);
        const calc = calculateTataSubmeterBill(
          updated.prevReading,
          updated.currReading,
          updated.ratePerUnit || 13,
          manualUnits
        );
        Object.assign(updated, calc);
      }
    } else if (subTab === 'buildingA') {
      if (['prevReading', 'currReading', 'ratePerUnit', 'grandTotal'].includes(field)) {
        const prev = n(updated.prevReading);
        const curr = n(updated.currReading);
        if (curr >= prev) {
          const consumption = curr - prev;
          updated.consumption = consumption;
          const { energyTotal, fuelTotal } = calculateMahavitaranSlabs(consumption);
          const fixedCharge = 445.00;
          const wheelingCharge = consumption * 1.60;
          const dutyAmount = (fixedCharge + energyTotal + wheelingCharge + fuelTotal) * 0.16;
          const calcTotal = Math.round(fixedCharge + energyTotal + wheelingCharge + fuelTotal + dutyAmount);
          if (field !== 'grandTotal') {
            updated.grandTotal = calcTotal;
            updated.paidAmount = calcTotal;
          }
          if (field !== 'ratePerUnit') {
            updated.ratePerUnit = parseFloat((updated.grandTotal / (consumption || 1)).toFixed(2));
          }
          updated.energyCharge = parseFloat(energyTotal.toFixed(2));
          updated.wheelingCharge = parseFloat(wheelingCharge.toFixed(2));
          updated.fuelAdj = parseFloat(fuelTotal.toFixed(2));
          updated.dutyAmount = parseFloat(dutyAmount.toFixed(2));
        }
      }
    } else if (subTab === 'mahavitaran') {
      if (['prevReading', 'currReading', 'msebFixedCharge', 'msebEnergyCharge', 'msebWheelingRate', 'msebFuelAdj', 'fixed', 'energy', 'wheelTotal', 'fuel'].includes(field)) {
        const fixedVal = updated.msebFixedCharge || updated.fixed || '445.00';
        const wheelVal = updated.msebWheelingRate || '1.60';
        const calc = calculateMahavitaranBill(
          updated.prevReading, updated.currReading,
          fixedVal, updated.msebEnergyCharge || updated.energy,
          wheelVal, updated.msebFuelAdj || updated.fuel
        );
        Object.assign(updated, calc);
      }
    } else {
      if (['prevReading', 'currReading', 'ratePerUnit'].includes(field)) {
        const prev = n(updated.prevReading);
        const curr = n(updated.currReading);
        const rate = n(updated.ratePerUnit);
        updated.consumption = curr - prev;
        updated.baseAmount = updated.consumption * rate;
        updated.grandTotal = updated.baseAmount;
      }
    }

    next[idx] = updated;

    if (subTab === 'mahavitaran') setMahavitaranBills(next);
    else if (subTab === 'buildingA') setBuildingABills(next);
    else setTataBills(next);

    triggerAutoSave(next, subTab);
  };

  const removeRow = (idx) => {
    if (!isAdmin) return;
    if (!window.confirm('Are you sure you want to delete this bill?')) return;

    let currentList = tataBills;
    if (subTab === 'buildingA') currentList = buildingABills;
    if (subTab === 'mahavitaran') currentList = mahavitaranBills;

    const next = currentList.filter((_, i) => i !== idx);

    if (subTab === 'mahavitaran') setMahavitaranBills(next);
    else if (subTab === 'buildingA') setBuildingABills(next);
    else setTataBills(next);

    triggerAutoSave(next, subTab);
  };

  // Print single Tata Play Tax Invoice using official scanned invoice layout
  const handlePrintTataBill = (bill) => {
    const prev = parseFloat(bill.prevReading) || 0;
    const curr = parseFloat(bill.currReading) || 0;
    const cons = parseFloat(bill.consumption) || (curr < prev ? (10000 - prev) + curr : curr - prev);
    const rate = parseFloat(bill.ratePerUnit) || 13;
    const baseAmount = Math.round(cons * rate);
    const grandTotal = parseFloat(bill.grandTotal) || baseAmount;
    const amountWords = numberToWordsINR(grandTotal);

    let invoiceDateStr = '18 May 2026';
    if (bill.endMonth) {
      const d = new Date(bill.endMonth);
      if (!isNaN(d.getTime())) {
        invoiceDateStr = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
      }
    }

    const data = {
      monthRangeText: bill.periodLabel ? bill.periodLabel.replace(/Electricity Bill Tata Play\s*/i, '') : 'Sep 25 to May 26',
      societyName: tataSocietyName || 'Majestique Euriska CHS',
      prevReading: Number(prev).toFixed(2),
      currReading: Number(curr).toFixed(2),
      meterNote: '(4 Digit Sub Meter)',
      consumption: Number(cons).toFixed(2),
      ratePerUnit: Number(rate).toFixed(2),
      baseAmount: baseAmount,
      cgstAmount: 0,
      sgstAmount: 0,
      grandTotal: grandTotal,
      amountWords: amountWords,
      billTo: tataBillTo,
      invoiceNo: bill.id === 2001 ? '2026/01' : `2026/${String(bill.id).slice(-2)}`,
      invoiceDateStr: invoiceDateStr,
      companyAddress: tataCompanyAddress,
      companyPan: tataCompanyPan,
    };

    const billHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Tata Electricity Sub-Meter Tax Invoice / Bill — ${data.monthRangeText}</title>
        <meta charset="utf-8" />
        <style>
          ${getOfficialTataInvoiceStyles()}
        </style>
      </head>
      <body>
        <div style="display: none;">Majestique Euriska Co-Op Housing Society Ltd. • Tata Electricity Sub-Meter Tax Invoice / Bill</div>
        ${buildOfficialTataInvoiceHtml(data)}
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

    const printWin = window.open('', '_blank');
    if (printWin) {
      printWin.document.write(billHtml);
      printWin.document.close();
    }
  };

  // Print all Tata Play Electricity Bills statement
  const handlePrintAllTataBills = () => {
    const printedDate = new Intl.DateTimeFormat('en-IN', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    }).format(new Date());

    const docHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Tata Electricity Bills — Statement of Account</title>
        <meta charset="utf-8" />
        <style>
          @page { size: A4 landscape; margin: 12mm 10mm; }
          * { box-sizing: border-box; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
            color: #0f172a;
            padding: 12px;
            font-size: 10px;
          }
          .header {
            text-align: center;
            border-bottom: 2px solid #0f172a;
            padding-bottom: 12px;
            margin-bottom: 14px;
          }
          .title { font-size: 16px; font-weight: 800; text-transform: uppercase; margin: 0 0 4px 0; }
          .sub { font-size: 10px; color: #475569; margin: 0 0 6px 0; }
          .badge {
            display: inline-block; background: #0f172a; color: #fff;
            padding: 4px 14px; border-radius: 4px; font-weight: 700; font-size: 11px;
          }
          .notice {
            background: #fef3c7; border: 1px solid #fde68a; border-radius: 6px;
            padding: 6px 12px; font-size: 9.5px; color: #92400e; margin-bottom: 12px;
          }
          .kpi-row { display: flex; gap: 12px; margin-bottom: 14px; }
          .kpi { flex: 1; border: 1px solid #cbd5e1; border-radius: 6px; padding: 10px 14px; background: #f8fafc; }
          table { width: 100%; border-collapse: collapse; font-size: 9.5px; }
          th { background: #0f172a; color: #fff; padding: 7px 8px; text-align: left; }
          td { padding: 7px 8px; border: 1px solid #cbd5e1; vertical-align: middle; }
          tr:nth-child(even) td { background: #f8fafc; }
          .amount { text-align: right; font-family: monospace; font-weight: 600; }
          .total-row td { background: #0f172a !important; color: #fff; font-weight: 800; }
          .signatures { display: flex; justify-content: space-between; margin-top: 24px; page-break-inside: avoid; }
          .sig-box { text-align: center; width: 28%; }
          .sig-line { border-top: 1px solid #0f172a; padding-top: 6px; font-weight: 700; font-size: 10px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="title">Majestique Euriska 'A' Building Co-operative Housing Society Ltd.</div>
          <div class="sub">Reg. No: PNA/PNA (4)/HSG/(TC)/21207/2019-20 Date 09/08/2019 • S. No. 2, Plot No C-1, Village Mohammed Wadi, Taluka Haveli, District Pune, Pune - 411060</div>
          <div class="badge">Tata Electricity Sub-Meter Consolidated Account Statement</div>
          <div style="font-size: 8.5px; color: #64748b; margin-top: 5px;">Statement Generated: ${printedDate}</div>
        </div>

        <div class="notice">
          <strong>4-Digit Sub-Meter Rollover Principle (Reset after 10000):</strong>
          When sub-meter reaches 9,999, it cycles back to 0000. When Current Reading (B) &lt; Previous Reading (A), units are calculated as: <strong>(10,000 - A) + B</strong>.
        </div>

        <div class="kpi-row" style="grid-template-columns: repeat(5, 1fr);">
          <div class="kpi">
            <div style="font-size: 9px; color: #64748b; font-weight: 700;">CONSUMER / CLIENT</div>
            <div style="font-size: 13px; font-weight: 800; color: #0f172a;">Tata Play Limited (Broadband Hub)</div>
          </div>
          <div class="kpi">
            <div style="font-size: 9px; color: #64748b; font-weight: 700;">TOTAL CONSUMPTION</div>
            <div style="font-size: 13px; font-weight: 800; color: #ea580c;">${fmt(totalConsumption)} Units</div>
          </div>
          <div class="kpi">
            <div style="font-size: 9px; color: #64748b; font-weight: 700;">AVG RATE / UNIT</div>
            <div style="font-size: 13px; font-weight: 800; color: #16a34a;">₹${(totalAmount / (totalConsumption || 1)).toFixed(2)} / u</div>
          </div>
          <div class="kpi">
            <div style="font-size: 9px; color: #64748b; font-weight: 700;">TOTAL BILL AMOUNT</div>
            <div style="font-size: 13px; font-weight: 800; color: #0284c7;">₹${fmt(totalAmount)}</div>
          </div>
          <div class="kpi">
            <div style="font-size: 9px; color: #64748b; font-weight: 700;">BILLING CYCLES</div>
            <div style="font-size: 13px; font-weight: 800; color: #16a34a;">${filteredBills.length} Billing Periods</div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th style="width: 30px; text-align: center;">#</th>
              <th style="width: 170px;">Billing Period</th>
              <th style="width: 120px; text-align: center;">Duration</th>
              <th style="width: 75px; text-align: right;">Prev Read (A)</th>
              <th style="width: 75px; text-align: right;">Curr Read (B)</th>
              <th style="width: 110px; text-align: center;">Meter Status</th>
              <th style="width: 85px; text-align: right;">Units (B - A)</th>
              <th style="width: 85px; text-align: right;">Rate / Unit</th>
              <th>Calculation Breakdown</th>
              <th style="width: 100px; text-align: right;">Total Amount (₹)</th>
            </tr>
          </thead>
          <tbody>
            ${filteredBills.map((b, i) => `
              <tr>
                <td style="text-align: center;">${i + 1}</td>
                <td><strong>${b.periodLabel || (formatDateLabel(b.startMonth) + ' to ' + formatDateLabel(b.endMonth))}</strong></td>
                <td style="text-align: center; color: #0369a1; font-weight: 600;">${b.duration || computeBillingDuration(b.startMonth, b.endMonth) || '—'}</td>
                <td class="amount">${b.prevReading}</td>
                <td class="amount">${b.currReading}</td>
                <td style="text-align: center;">
                  ${b.isRollover || n(b.currReading) < n(b.prevReading)
                    ? '<span style="background: #fef3c7; color: #92400e; padding: 2px 6px; border-radius: 4px; font-weight: 700; font-size: 8.5px;">🔄 10k Reset</span>'
                    : '<span style="color: #64748b; font-size: 8.5px;">Normal</span>'}
                </td>
                <td class="amount" style="color: #ea580c; font-weight: 700;">${fmt(n(b.consumption))}</td>
                <td class="amount" style="color: #2563eb; font-weight: 700;">₹${Number(b.ratePerUnit || 13).toFixed(2)}</td>
                <td style="color: #475569; font-size: 9px;">${b.calculationNote || `${b.consumption} × ₹${b.ratePerUnit}`}</td>
                <td class="amount" style="color: #0284c7; font-weight: 800;">₹${fmt(n(b.grandTotal))}</td>
              </tr>
            `).join('')}
            <tr class="total-row">
              <td colspan="6" style="text-align: right;">GRAND TOTAL</td>
              <td class="amount" style="color: #ea580c;">${fmt(totalConsumption)}</td>
              <td class="amount" style="color: #4ade80;">₹${(totalAmount / (totalConsumption || 1)).toFixed(2)}</td>
              <td style="font-size: 8.5px; color: #cbd5e1;">Overall Avg Rate: ₹${(totalAmount / (totalConsumption || 1)).toFixed(2)}/u</td>
              <td class="amount" style="color: #4ade80;">₹${fmt(totalAmount)}</td>
            </tr>
          </tbody>
        </table>

        <div class="signatures">
          <div class="sig-box">
            <div class="sig-line">Prepared By (Society Manager)</div>
          </div>
          <div class="sig-box">
            <div class="sig-line">Society Treasurer</div>
          </div>
          <div class="sig-box">
            <div class="sig-line">Society Secretary / Chairman</div>
          </div>
        </div>

        <script>
          window.onload = function() {
            setTimeout(function() { window.print(); }, 250);
          };
        </script>
      </body>
      </html>
    `;
    const win = window.open('', '_blank');
    if (win) {
      win.document.write(docHtml);
      win.document.close();
    }
  };

  const activeTataBill = useMemo(() => {
    if (selectedTataBillId) {
      const found = tataBills.find(b => b.id === selectedTataBillId);
      if (found) return found;
    }
    return tataBills[0] || DEFAULT_TATA_SEED[0];
  }, [tataBills, selectedTataBillId]);

  const tataBillsForInvoice = useMemo(() => {
    if (tataInvoiceTarget === 'single') {
      return [activeTataBill];
    }
    return [...tataBills].sort((a, b) => {
      const dateA = a.startMonth ? new Date(a.startMonth) : new Date(0);
      const dateB = b.startMonth ? new Date(b.startMonth) : new Date(0);
      return dateB - dateA;
    });
  }, [tataInvoiceTarget, activeTataBill, tataBills]);

  const generateTataWhatsAppMessage = useCallback((bill) => {
    const consumption = n(bill.consumption) || (n(bill.currReading) - n(bill.prevReading));
    const rate = n(bill.ratePerUnit) || 13;
    const grandTotal = n(bill.grandTotal) || (consumption * rate);
    const formattedInvDate = formatDateLabel(tataInvoiceDate);
    const formattedDueDate = formatDateLabel(tataInvoiceDueDate);
    const invNo = `${tataInvoiceRefPrefix}${bill.id || '2001'}`;

    return `*MAJESTIQUE EURISKA 'A' BLDG CO-OP HSG SOC LTD*
*TATA ELECTRICITY SUB-METER TAX INVOICE*
━━━━━━━━━━━━━━━━━━━━━━
Invoice No: ${invNo}
Invoice Date: ${formattedInvDate}
Payment Due Date: ${formattedDueDate}

*Client / Consumer Details:*
• Consumer: Tata Play Limited (Tata Sky Broadband Hub)
• Sub-Meter Tag: TATA-EUR-SB-01 (4-Digit Dedicated Meter)
• Location: Club House Terrace Hub, Majestique Euriska

*Billing & Consumption Breakdown:*
• Billing Period: ${bill.periodLabel || 'Commercial Billing Cycle'}
• Duration: ${bill.duration || computeBillingDuration(bill.startMonth, bill.endMonth) || '—'}
• Previous Reading (A): ${bill.prevReading}
• Current Reading (B): ${bill.currReading}
${bill.isRollover ? `• Meter Note: 🔄 Sub-meter 10k reset rollover (${bill.calculationNote || `(10000 - ${bill.prevReading}) + ${bill.currReading}`})\n` : ''}• Units Consumed: ${fmt(consumption)} Units
• Tariff Rate: ₹${rate.toFixed(2)} / Unit
• *TOTAL INVOICE AMOUNT PAYABLE: ₹${fmt(grandTotal)}*

*Remittance Society Bank Details:*
• Bank: HDFC Bank
• A/C Name: MAJESTIQUE EURISKA A BLDG SA GRU SAN MAR
• A/C No: 50200075533530
• IFSC: HDFC0002454
• Branch: Budhrani Boulevard, Undri NIBM Rd, Pune - 411060

Kindly process the payment on or before ${formattedDueDate} and share the transaction reference / UTR for receipt issuance.

Thank you!
*Managing Committee*
Majestique Euriska 'A' Building CHS Ltd.`;
  }, [tataInvoiceDate, tataInvoiceDueDate, tataInvoiceRefPrefix]);

  const handleShareTataWhatsApp = useCallback((bill) => {
    const msg = generateTataWhatsAppMessage(bill);
    const url = `https://wa.me/?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  }, [generateTataWhatsAppMessage]);

  const handleCopyTataInvoiceText = useCallback((bill) => {
    const msg = generateTataWhatsAppMessage(bill);
    if (navigator.clipboard) {
      navigator.clipboard.writeText(msg).then(() => {
        setTataInvoiceToast(`✓ Invoice text copied for ${bill.periodLabel || 'Tata Bill'}!`);
        setTimeout(() => setTataInvoiceToast(''), 3000);
      }).catch(() => {
        setTataInvoiceToast('Failed to copy');
        setTimeout(() => setTataInvoiceToast(''), 3000);
      });
    }
  }, [generateTataWhatsAppMessage]);

  const handlePrintTataInvoiceModalDoc = useCallback(() => {
    let pagesHtml = '';

    if (tataInvoiceTarget === 'single') {
      const consumptionVal = parseFloat(tataConsumption) || 0;
      const rateVal = parseFloat(tataRatePerUnit) || 0;
      const baseAmountVal = Math.round(consumptionVal * rateVal);
      const cgstVal = Math.round(baseAmountVal * (parseFloat(tataCgstRate) || 0) / 100);
      const sgstVal = Math.round(baseAmountVal * (parseFloat(tataSgstRate) || 0) / 100);
      const grandTotalVal = baseAmountVal + cgstVal + sgstVal;
      const amountWordsVal = numberToWordsINR(grandTotalVal);

      const singleData = {
        monthRangeText: tataMonthRangeText,
        societyName: tataSocietyName,
        prevReading: tataPrevReading,
        currReading: tataCurrReading,
        meterNote: tataMeterNote,
        consumption: tataConsumption,
        ratePerUnit: tataRatePerUnit,
        baseAmount: baseAmountVal,
        cgstAmount: cgstVal,
        sgstAmount: sgstVal,
        grandTotal: grandTotalVal,
        amountWords: amountWordsVal,
        billTo: tataBillTo,
        invoiceNo: tataInvoiceNo,
        invoiceDateStr: tataInvoiceDateStr,
        companyAddress: tataCompanyAddress,
        companyPan: tataCompanyPan,
      };

      pagesHtml = buildOfficialTataInvoiceHtml(singleData, false);
    } else {
      const billsToPrint = tataBillsForInvoice;
      if (billsToPrint.length === 0) {
        window.alert('No Tata bills selected for invoice generation.');
        return;
      }
      pagesHtml = billsToPrint.map((b, idx) => {
        const prev = parseFloat(b.prevReading) || 0;
        const curr = parseFloat(b.currReading) || 0;
        const cons = parseFloat(b.consumption) || (curr < prev ? (10000 - prev) + curr : curr - prev);
        const rate = parseFloat(b.ratePerUnit) || 13;
        const baseAmount = Math.round(cons * rate);
        const grandTotal = parseFloat(b.grandTotal) || baseAmount;
        const amountWords = numberToWordsINR(grandTotal);

        let invDate = '18 May 2026';
        if (b.endMonth) {
          const d = new Date(b.endMonth);
          if (!isNaN(d.getTime())) {
            invDate = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
          }
        }

        const bData = {
          monthRangeText: b.periodLabel ? b.periodLabel.replace(/Electricity Bill Tata Play\s*/i, '') : 'Sep 25 to May 26',
          societyName: tataSocietyName || 'Majestique Euriska CHS',
          prevReading: Number(prev).toFixed(2),
          currReading: Number(curr).toFixed(2),
          meterNote: '(4 Digit Sub Meter)',
          consumption: Number(cons).toFixed(2),
          ratePerUnit: Number(rate).toFixed(2),
          baseAmount: baseAmount,
          cgstAmount: 0,
          sgstAmount: 0,
          grandTotal: grandTotal,
          amountWords: amountWords,
          billTo: tataBillTo,
          invoiceNo: b.id === 2001 ? '2026/01' : `2026/${String(b.id).slice(-2)}`,
          invoiceDateStr: invDate,
          companyAddress: tataCompanyAddress,
          companyPan: tataCompanyPan,
        };

        return buildOfficialTataInvoiceHtml(bData, idx < billsToPrint.length - 1);
      }).join('');
    }

    const docHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Tata Electricity Sub-Meter Tax Invoice — ${tataInvoiceTarget === 'single' ? tataMonthRangeText : 'Statement'}</title>
        <meta charset="utf-8" />
        <style>
          ${getOfficialTataInvoiceStyles()}
        </style>
      </head>
      <body>
        <div style="display: none;">Majestique Euriska Co-Op Housing Society Ltd. • Tata Electricity Sub-Meter Tax Invoice / Bill</div>
        ${pagesHtml}
        <script>
          window.onload = function() {
            setTimeout(function() { window.print(); }, 250);
          };
        </script>
      </body>
      </html>
    `;

    const win = window.open('', '_blank');
    if (win) {
      win.document.write(docHtml);
      win.document.close();
    }
  }, [
    tataInvoiceTarget,
    tataMonthRangeText,
    tataSocietyName,
    tataPrevReading,
    tataCurrReading,
    tataMeterNote,
    tataConsumption,
    tataRatePerUnit,
    tataCgstRate,
    tataSgstRate,
    tataBillTo,
    tataInvoiceNo,
    tataInvoiceDateStr,
    tataCompanyAddress,
    tataCompanyPan,
    tataBillsForInvoice
  ]);

  // ─────────────────────────────────────────────────────────────
  // PDF EXPORT: Single Building A MSEDCL Bill Voucher
  // ─────────────────────────────────────────────────────────────
  const handlePrintBuildingABill = (bill) => {
    const prev = parseFloat(bill.prevReading) || 0;
    const curr = parseFloat(bill.currReading) || 0;
    const cons = parseFloat(bill.consumption) || (curr - prev);
    const grandTotal = parseFloat(bill.grandTotal) || 0;
    const amountWords = numberToWordsINR(grandTotal);
    const printedDate = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date());

    const docHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>MSEDCL Electricity Bill Record — ${bill.periodLabel || 'Building A Common Lift'}</title>
        <meta charset="utf-8" />
        <style>
          @page { size: A4 portrait; margin: 12mm 15mm; }
          * { box-sizing: border-box; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
            color: #0f172a; margin: 0; padding: 0; font-size: 10px; line-height: 1.4;
          }
          .bill-card {
            border: 2px solid #064e3b; border-radius: 8px; overflow: hidden;
          }
          .header {
            background: linear-gradient(135deg, #064e3b 0%, #065f46 100%);
            color: white; padding: 14px 18px; display: flex; justify-content: space-between; align-items: flex-start;
          }
          .society-name { font-size: 13px; font-weight: 900; letter-spacing: 0.3px; text-transform: uppercase; margin: 0 0 3px 0; }
          .society-sub { font-size: 8px; color: #d1fae5; margin: 0 0 6px 0; }
          .bill-badge {
            display: inline-block; background: #047857; border: 1px solid #6ee7b7;
            padding: 3px 10px; border-radius: 4px; font-size: 9px; font-weight: 700;
          }
          .header-meta { text-align: right; font-size: 8.5px; color: #d1fae5; line-height: 1.6; }
          .body-content { padding: 14px 18px; }
          .info-grid {
            display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px;
            margin-bottom: 14px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px 14px;
          }
          .info-block p { margin: 2px 0; font-size: 8.5px; color: #334155; }
          .info-block p strong { color: #0f172a; }
          .readings-card {
            border: 1.5px solid #059669; border-radius: 6px; padding: 10px 14px;
            background: #f0fdf4; margin-bottom: 14px;
          }
          .readings-grid {
            display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; text-align: center; margin-top: 6px;
          }
          .reading-box { background: white; border: 1px solid #a7f3d0; border-radius: 5px; padding: 6px 8px; }
          .reading-box .lbl { font-size: 7.5px; color: #64748b; font-weight: 700; text-transform: uppercase; }
          .reading-box .val { font-size: 13px; font-weight: 900; color: #065f46; margin-top: 2px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 14px; font-size: 9px; }
          th { background: #064e3b; color: white; padding: 7px 10px; font-weight: 700; text-align: left; }
          td { padding: 6px 10px; border-bottom: 1px solid #e2e8f0; }
          tr:nth-child(even) td { background: #f8fafc; }
          .right { text-align: right; }
          .mono { font-family: "Courier New", monospace; }
          .total-row td { background: #ecfdf5 !important; font-weight: 900; font-size: 11px; color: #064e3b; border-top: 2px solid #059669; }
          .amount-words {
            background: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 6px;
            padding: 8px 12px; font-size: 9px; margin-bottom: 14px;
          }
          .payment-strip {
            display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px;
            margin-bottom: 16px; background: #fffbeb; border: 1px solid #fde68a; border-radius: 6px; padding: 10px;
          }
          .pay-box { text-align: center; }
          .pay-box .lbl { font-size: 7.5px; color: #92400e; font-weight: 700; text-transform: uppercase; }
          .pay-box .val { font-size: 12px; font-weight: 900; color: #b45309; margin-top: 2px; }
          .footer {
            margin-top: 20px; padding-top: 14px; border-top: 1px solid #cbd5e1;
            display: flex; justify-content: space-between; align-items: flex-end;
          }
          .sign-box { text-align: center; width: 140px; }
          .sign-line { border-top: 1px solid #0f172a; margin-top: 36px; padding-top: 4px; font-size: 8.5px; font-weight: 700; }
        </style>
      </head>
      <body>
        <div class="bill-card">
          <div class="header">
            <div>
              <p class="society-name">Majestique Euriska 'A' Building CHS Ltd.</p>
              <p class="society-sub">Reg. No: PNA/PNA (4)/HSG/(TC)/21207/2019-20 • Handewadi Road, Mohammed Wadi, Pune — 411060</p>
              <span class="bill-badge">🏢 Building 'A' Common Lift Electricity Voucher</span>
            </div>
            <div class="header-meta">
              <div><strong>Bill Date:</strong> ${bill.billDate || formatDateLabel(bill.endMonth)}</div>
              <div><strong>Period:</strong> ${bill.periodLabel || `${formatDateLabel(bill.startMonth)} to ${formatDateLabel(bill.endMonth)}`}</div>
              <div><strong>Status:</strong> ${bill.status || 'Paid'}</div>
              <div><strong>Printed:</strong> ${printedDate}</div>
            </div>
          </div>

          <div class="body-content">
            <div class="info-grid">
              <div class="info-block">
                <p><strong>Consumer Name:</strong> THE CHAIRMAN EURISKA A WING COMMAN LIFT</p>
                <p><strong>Consumer Number:</strong> 170003586858</p>
                <p><strong>Meter Number:</strong> 08210034428</p>
                <p><strong>Tariff Category:</strong> 92 / LT I Res 3-Phase</p>
                <p><strong>Sanctioned Load:</strong> 10.00 KW</p>
              </div>
              <div class="info-block">
                <p><strong>Billing Sub-Division:</strong> 4745/HADAPSAR (I) SUB-DN./BUNDGARDEN</p>
                <p><strong>GSTIN:</strong> 27AAECM2933K1ZB • <strong>HSN:</strong> 27160000</p>
                <p><strong>Billing Unit:</strong> 4745 • <strong>Pole No:</strong> 00000001</p>
                <p><strong>Security Deposit:</strong> ₹69,440.00</p>
                <p><strong>MSEDCL Bank A/c:</strong> MSEDCL01170003586858 (SBI IFB BKC)</p>
              </div>
            </div>

            <div class="readings-card">
              <div style="font-size: 8px; font-weight: 800; color: #065f46; text-transform: uppercase; letter-spacing: 0.05em;">
                ⚡ Meter Reading & Energy Consumption
              </div>
              <div class="readings-grid" style="grid-template-columns: repeat(5, 1fr);">
                <div class="reading-box">
                  <div class="lbl">Prev Reading (${formatDateLabel(bill.startMonth)})</div>
                  <div class="val">${n(bill.prevReading).toLocaleString('en-IN')}</div>
                </div>
                <div class="reading-box">
                  <div class="lbl">Curr Reading (${formatDateLabel(bill.endMonth)})</div>
                  <div class="val">${n(bill.currReading).toLocaleString('en-IN')}</div>
                </div>
                <div class="reading-box">
                  <div class="lbl">Multiplying Factor</div>
                  <div class="val">1.00</div>
                </div>
                <div class="reading-box" style="border-color: #059669; background: #ecfdf5;">
                  <div class="lbl">Units Consumed</div>
                  <div class="val" style="color: #047857;">${cons.toLocaleString('en-IN')} kWh</div>
                </div>
                <div class="reading-box" style="border-color: #10b981; background: #f0fdf4;">
                  <div class="lbl">Avg Rate / Unit</div>
                  <div class="val" style="color: #15803d;">₹${(grandTotal / (cons || 1)).toFixed(2)}/u</div>
                </div>
              </div>
            </div>

            <table>
              <thead>
                <tr>
                  <th style="width: 30px;">#</th>
                  <th>Particulars / Charges Component</th>
                  <th style="width: 130px; text-align: center;">Rate / Basis</th>
                  <th class="right" style="width: 120px;">Amount (₹)</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>1</td>
                  <td><strong>Fixed Charges</strong> (10.00 KW 3-Phase Connection)</td>
                  <td style="text-align: center;">₹445.00 / month</td>
                  <td class="right mono">₹${fmt(bill.fixedCharge || 445)}</td>
                </tr>
                <tr>
                  <td>2</td>
                  <td><strong>Energy Charges</strong> (Telescopic Slabs 0–100 @ 3.96, 101–300 @ 10.80, 301–500 @ 15.03, >500 @ 17.53)</td>
                  <td style="text-align: center;">Slab Rates</td>
                  <td class="right mono">₹${fmt(bill.energyCharge || (cons * 15.76))}</td>
                </tr>
                <tr>
                  <td>3</td>
                  <td><strong>Wheeling Charges</strong></td>
                  <td style="text-align: center;">@ ₹1.60 / unit</td>
                  <td class="right mono">₹${fmt(bill.wheelingCharge || (cons * 1.60))}</td>
                </tr>
                <tr>
                  <td>4</td>
                  <td><strong>Fuel Adjustment Charges (FAC)</strong></td>
                  <td style="text-align: center;">Slab Rates (0.150 to 0.450)</td>
                  <td class="right mono">₹${fmt(bill.fuelAdj || (cons * 0.41))}</td>
                </tr>
                <tr>
                  <td>5</td>
                  <td><strong>Electricity Duty (16%)</strong></td>
                  <td style="text-align: center;">16% on Total Energy Charges</td>
                  <td class="right mono">₹${fmt(bill.dutyAmount || (grandTotal * 0.16 / 1.16))}</td>
                </tr>
                ${bill.arrearsAmount ? `
                <tr>
                  <td>6</td>
                  <td>Adjustment / Arrears / Prior Period Credit</td>
                  <td style="text-align: center;">Adjustment</td>
                  <td class="right mono">₹${fmt(bill.arrearsAmount)}</td>
                </tr>
                ` : ''}
                <tr class="total-row">
                  <td colspan="3" style="text-align: right; padding-right: 14px;">NET BILL PAYABLE AMOUNT (Avg Rate: ₹${(grandTotal / (cons || 1)).toFixed(2)} / unit):</td>
                  <td class="right mono">₹${fmt(grandTotal)}</td>
                </tr>
              </tbody>
            </table>

            <div class="amount-words">
              <strong>Amount in Words:</strong> ${amountWords}
            </div>

            <div class="payment-strip">
              <div class="pay-box">
                <div class="lbl">Prompt Pay (Discount)</div>
                <div class="val" style="color: #15803d;">₹${fmt(bill.promptAmount || (grandTotal - 320))}</div>
                <div style="font-size: 7.5px; color: #15803d; margin-top: 1px;">Paid before due date</div>
              </div>
              <div class="pay-box">
                <div class="lbl">Due Date Amount</div>
                <div class="val" style="color: #0369a1;">₹${fmt(grandTotal)}</div>
                <div style="font-size: 7.5px; color: #64748b; margin-top: 1px;">Due: ${bill.dueDate || 'Standard Cycle'}</div>
              </div>
              <div class="pay-box">
                <div class="lbl">After Due Date (DPC)</div>
                <div class="val" style="color: #b91c1c;">₹${fmt(bill.afterDueAmount || (grandTotal + 460))}</div>
                <div style="font-size: 7.5px; color: #b91c1c; margin-top: 1px;">Delayed Charge Applicable</div>
              </div>
            </div>

            <div class="footer">
              <div style="font-size: 8px; color: #64748b; line-height: 1.5; max-width: 60%;">
                This voucher is systematically recorded from official Maharashtra State Electricity Distribution Company Limited (MSEDCL) bills for Euriska 'A' Wing Common Lift operations.
              </div>
              <div class="sign-box">
                <div class="sign-line">Hon. Treasurer / Secretary</div>
                <div style="font-size: 7.5px; color: #64748b; margin-top: 2px;">Majestique Euriska 'A' Building CHS</div>
              </div>
            </div>
          </div>
        </div>

        <script>
          window.onload = function() {
            setTimeout(function() { window.print(); }, 250);
          };
        </script>
      </body>
      </html>
    `;

    const printWin = window.open('', '_blank');
    if (printWin) {
      printWin.document.write(docHtml);
      printWin.document.close();
    }
  };

  // ─────────────────────────────────────────────────────────────
  // PDF EXPORT: Complete 10-Month Building A Statement
  // ─────────────────────────────────────────────────────────────
  const handlePrintBuildingAStatement = () => {
    const printedDate = new Intl.DateTimeFormat('en-IN', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    }).format(new Date());

    const totalUnitsAll = buildingABills.reduce((s, b) => s + n(b.consumption), 0);
    const totalAmountAll = buildingABills.reduce((s, b) => s + n(b.grandTotal), 0);

    const rowsHtml = buildingABills.map((b, i) => `
      <tr>
        <td class="center">${i + 1}</td>
        <td><strong>${b.periodLabel || `${formatDateLabel(b.startMonth)} to ${formatDateLabel(b.endMonth)}`}</strong></td>
        <td class="center">${b.duration || '30 Days'}</td>
        <td class="right mono">${n(b.prevReading).toLocaleString('en-IN')}</td>
        <td class="right mono">${n(b.currReading).toLocaleString('en-IN')}</td>
        <td class="right mono bold text-orange">${n(b.consumption).toLocaleString('en-IN')}</td>
        <td class="right mono">₹${fmt(b.ratePerUnit || (n(b.grandTotal) / (n(b.consumption) || 1)))}</td>
        <td class="right mono">₹${fmt(b.fixedCharge || 445)}</td>
        <td class="right mono">₹${fmt(b.energyCharge || 0)}</td>
        <td class="right mono">₹${fmt(b.wheelingCharge || 0)}</td>
        <td class="right mono">₹${fmt(b.fuelAdj || 0)}</td>
        <td class="right mono">₹${fmt(b.dutyAmount || 0)}</td>
        <td class="right mono bold text-blue">₹${fmt(b.grandTotal)}</td>
        <td class="center"><span class="badge ${b.status === 'Paid' ? 'badge-green' : 'badge-amber'}">${b.status || 'Paid'}</span></td>
        <td class="center">${b.paymentDate ? formatDateLabel(b.paymentDate) : (b.dueDate ? `Due ${formatDateLabel(b.dueDate)}` : '—')}</td>
      </tr>
    `).join('');

    const docHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Building A Common Lift Electricity Statement — Majestique Euriska</title>
        <meta charset="utf-8" />
        <style>
          @page { size: A4 landscape; margin: 10mm 12mm; }
          * { box-sizing: border-box; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
            color: #0f172a; padding: 0; margin: 0; font-size: 8.5px;
          }
          .header {
            display: flex; justify-content: space-between; align-items: flex-start;
            border-bottom: 2px solid #064e3b; padding-bottom: 8px; margin-bottom: 10px;
          }
          .title { font-size: 13px; font-weight: 900; color: #064e3b; margin: 0 0 2px 0; text-transform: uppercase; }
          .subtitle { font-size: 8px; color: #475569; margin: 0; }
          .badge-main { display: inline-block; background: #064e3b; color: white; padding: 2px 8px; border-radius: 4px; font-weight: 700; margin-top: 4px; font-size: 8px; }
          .meta-block { text-align: right; font-size: 8px; color: #64748b; line-height: 1.5; }
          .kpi-row { display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; margin-bottom: 10px; }
          .kpi-box { border: 1px solid #d1fae5; background: #f0fdf4; border-radius: 5px; padding: 6px 10px; }
          .kpi-box .lbl { font-size: 7px; color: #6b7280; text-transform: uppercase; font-weight: 700; }
          .kpi-box .val { font-size: 12px; font-weight: 900; margin-top: 1px; }
          table { width: 100%; border-collapse: collapse; font-size: 8px; }
          thead th { background: #064e3b; color: white; padding: 5px 6px; text-align: left; font-weight: 700; white-space: nowrap; }
          td { padding: 4.5px 6px; border-bottom: 1px solid #e2e8f0; vertical-align: middle; }
          tr:nth-child(even) td { background: #f8fafc; }
          .center { text-align: center; }
          .right { text-align: right; }
          .mono { font-family: "Courier New", monospace; }
          .bold { font-weight: 800; }
          .text-orange { color: #ea580c; }
          .text-blue { color: #0369a1; }
          .badge { display: inline-block; padding: 1.5px 6px; border-radius: 10px; font-size: 7px; font-weight: 700; }
          .badge-green { background: #dcfce7; color: #166534; }
          .badge-amber { background: #fef3c7; color: #92400e; }
          tfoot tr td { background: #064e3b !important; color: white; font-weight: 800; border-bottom: none; font-size: 8.5px; }
          .footer-section {
            display: flex; justify-content: space-between; align-items: flex-end;
            margin-top: 12px; border-top: 1px solid #e2e8f0; padding-top: 8px;
          }
          .sign-box { text-align: center; width: 130px; }
          .sign-line { border-top: 1px solid #0f172a; margin-top: 24px; padding-top: 2px; font-size: 7.5px; font-weight: 700; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="title">Majestique Euriska 'A' Building Co-operative Housing Society Ltd.</div>
            <div class="subtitle">S. No. 2, Euriska, Mohammed Wadi, Pune 411060 • Reg No: PNA/PNA (4)/HSG/(TC)/21207/2019-20</div>
            <span class="badge-main">🏢 Building 'A' Common Lift Electricity Statement — 10 Consecutive Billing Cycles</span>
          </div>
          <div class="meta-block">
            <div><strong>Consumer:</strong> THE CHAIRMAN EURISKA A WING (COMMON LIFT)</div>
            <div><strong>Consumer No:</strong> 170003586858 • <strong>Meter:</strong> 08210034428</div>
            <div><strong>Tariff:</strong> 92 / LT I Res 3-Phase (10.00 KW) • <strong>Division:</strong> Hadapsar (4745)</div>
            <div><strong>Generated:</strong> ${printedDate}</div>
          </div>
        </div>

        <div class="kpi-row" style="grid-template-columns: repeat(6, 1fr);">
          <div class="kpi-box">
            <div class="lbl">Billing Cycles</div>
            <div class="val" style="color: #064e3b;">${buildingABills.length} Months</div>
          </div>
          <div class="kpi-box">
            <div class="lbl">Total Consumption</div>
            <div class="val text-orange">${totalUnitsAll.toLocaleString('en-IN')} Units</div>
          </div>
          <div class="kpi-box">
            <div class="lbl">Average Monthly Usage</div>
            <div class="val" style="color: #059669;">${(totalUnitsAll / buildingABills.length).toFixed(0)} Units/mo</div>
          </div>
          <div class="kpi-box" style="background: #f0fdf4; border-color: #bbf7d0;">
            <div class="lbl">Avg Rate / Unit</div>
            <div class="val" style="color: #16a34a;">₹${(totalAmountAll / (totalUnitsAll || 1)).toFixed(2)} / u</div>
          </div>
          <div class="kpi-box">
            <div class="lbl">Meter Reading Range</div>
            <div class="val" style="color: #7c3aed;">132,533 ➔ 150,245</div>
          </div>
          <div class="kpi-box" style="background: #eff6ff; border-color: #bfdbfe;">
            <div class="lbl">Total Amount Billed</div>
            <div class="val text-blue">₹${fmt(totalAmountAll)}</div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th class="center" style="width: 25px;">#</th>
              <th>Billing Period</th>
              <th class="center" style="width: 70px;">Duration</th>
              <th class="right" style="width: 60px;">Prev (A)</th>
              <th class="right" style="width: 60px;">Curr (B)</th>
              <th class="right" style="width: 65px;">Units (kWh)</th>
              <th class="right" style="width: 60px;">Rate/U</th>
              <th class="right" style="width: 55px;">Fixed (₹)</th>
              <th class="right" style="width: 65px;">Energy (₹)</th>
              <th class="right" style="width: 60px;">Wheel (₹)</th>
              <th class="right" style="width: 55px;">Fuel (₹)</th>
              <th class="right" style="width: 55px;">Duty (₹)</th>
              <th class="right" style="width: 75px;">Total (₹)</th>
              <th class="center" style="width: 60px;">Status</th>
              <th class="center" style="width: 75px;">Payment/Due</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
          <tfoot>
            <tr>
              <td colspan="5" style="text-align: right; padding-right: 8px;">TOTAL (${buildingABills.length} MONTHS):</td>
              <td class="right mono">${totalUnitsAll.toLocaleString('en-IN')}</td>
              <td class="right mono bold" style="color: #86efac;">₹${(totalAmountAll / (totalUnitsAll || 1)).toFixed(2)}</td>
              <td class="right mono">₹${fmt(buildingABills.reduce((s, b) => s + n(b.fixedCharge || 445), 0))}</td>
              <td class="right mono">₹${fmt(buildingABills.reduce((s, b) => s + n(b.energyCharge || 0), 0))}</td>
              <td class="right mono">₹${fmt(buildingABills.reduce((s, b) => s + n(b.wheelingCharge || 0), 0))}</td>
              <td class="right mono">₹${fmt(buildingABills.reduce((s, b) => s + n(b.fuelAdj || 0), 0))}</td>
              <td class="right mono">₹${fmt(buildingABills.reduce((s, b) => s + n(b.dutyAmount || 0), 0))}</td>
              <td class="right mono">₹${fmt(totalAmountAll)}</td>
              <td colspan="2" class="center">Audited MSEDCL Bills</td>
            </tr>
          </tfoot>
        </table>

        <div class="footer-section">
          <div style="font-size: 7.5px; color: #64748b; line-height: 1.4; max-width: 65%;">
            * Official statement compiled from Mahavitaran (MSEDCL) LT I Residential 3-Phase monthly bills for Consumer No 170003586858 (Euriska 'A' Wing Common Lift). All 10 monthly cycles feature continuous, gapless meter readings.
          </div>
          <div class="sign-box">
            <div class="sign-line">Chairman / Treasurer</div>
            <div style="font-size: 7px; color: #64748b;">Majestique Euriska 'A' Building CHS</div>
          </div>
        </div>

        <script>
          window.onload = function() {
            setTimeout(function() { window.print(); }, 250);
          };
        </script>
      </body>
      </html>
    `;

    const printWin = window.open('', '_blank');
    if (printWin) {
      printWin.document.write(docHtml);
      printWin.document.close();
    }
  };

  // ─────────────────────────────────────────────────────────────
  // PDF EXPORT: Monthly Consumption Breakdown
  // ─────────────────────────────────────────────────────────────
  const handlePrintMonthlyBreakdown = (monthlyData, activeTab = subTab) => {
    if (!monthlyData || monthlyData.length === 0) return;
    const peakMonth = monthlyData.reduce((a, b) => b.units > a.units ? b : a, monthlyData[0]);
    const avgMonthly = monthlyData.reduce((s, m) => s + m.units, 0) / monthlyData.length;
    const totalMonthlyUnits = monthlyData.reduce((s, m) => s + m.units, 0);
    const totalMonthlyCost = monthlyData.reduce((s, m) => s + m.estCost, 0);
    const totalDays = monthlyData.reduce((s, m) => s + m.days, 0);
    const avgDailyOverall = totalDays > 0 ? (totalMonthlyUnits / totalDays).toFixed(2) : '—';
    const printedDate = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date());
    const firstLabel = [...monthlyData].sort((a, b) => a.monthKey.localeCompare(b.monthKey))[0]?.label ?? '';
    const lastLabel = [...monthlyData].sort((a, b) => b.monthKey.localeCompare(a.monthKey))[0]?.label ?? '';
    const isBuildingA = activeTab === 'buildingA';

    const tableRows = [...monthlyData].reverse().map((m, i) => {
      const pct = peakMonth.units > 0 ? ((m.units / peakMonth.units) * 100).toFixed(0) : 0;
      const barColor = pct > 80 ? '#dc2626' : pct > 50 ? '#f59e0b' : '#059669';
      const isHighest = m.monthKey === peakMonth.monthKey;
      const avgRate = (m.estCost / (m.units || 1)).toFixed(2);
      return `
        <tr class="${isHighest ? 'peak-row' : (i % 2 === 0 ? 'even-row' : '')}">
          <td class="center">${monthlyData.length - i}</td>
          <td class="month-cell">${isHighest ? '🔥 ' : ''}${m.label}</td>
          <td class="right mono">${m.units.toLocaleString('en-IN', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</td>
          <td class="right mono">${m.avgDaily}</td>
          <td class="right">${m.days}</td>
          <td class="right mono" style="color: #16a34a; font-weight: 700;">₹${avgRate}</td>
          <td class="right mono red">₹${fmt(m.estCost)}</td>
          <td class="bar-cell">
            <div class="bar-track">
              <div class="bar-fill" style="width: ${pct}%; background: ${barColor};"></div>
            </div>
            <span class="bar-pct">${pct}%</span>
          </td>
        </tr>
      `;
    }).join('');

    const docHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Monthly Electricity Consumption — ${isBuildingA ? 'Building A Common Lift' : 'Tata Electricity'} — Majestique Euriska</title>
        <meta charset="utf-8" />
        <style>
          @page { size: A4 landscape; margin: 12mm 14mm; }
          * { box-sizing: border-box; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif;
            color: #0f172a; margin: 0; padding: 0; font-size: 9.5px;
          }
          .report-header {
            display: flex; justify-content: space-between; align-items: flex-start;
            border-bottom: 2.5px solid #064e3b; padding-bottom: 10px; margin-bottom: 14px;
          }
          .society-title {
            font-size: 13px; font-weight: 900; text-transform: uppercase;
            letter-spacing: 0.3px; color: #064e3b; margin: 0 0 2px 0;
          }
          .report-subtitle { font-size: 8.5px; color: #475569; margin: 0 0 5px 0; }
          .report-badge {
            display: inline-block; background: #064e3b; color: white;
            padding: 3px 12px; border-radius: 4px; font-size: 9px; font-weight: 700;
          }
          .report-meta { text-align: right; font-size: 8px; color: #64748b; line-height: 1.7; }
          .kpi-grid {
            display: grid; grid-template-columns: repeat(6, 1fr); gap: 9px; margin-bottom: 12px;
          }
          .kpi-card {
            border: 1px solid #d1fae5; border-radius: 6px; padding: 7px 10px; background: #f0fdf4;
          }
          .kpi-label {
            font-size: 7px; color: #6b7280; font-weight: 700;
            text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 3px;
          }
          .kpi-value { font-size: 13px; font-weight: 900; }
          .kpi-unit { font-size: 8.5px; font-weight: 600; color: #9ca3af; }
          .kpi-sub { font-size: 7px; color: #9ca3af; margin-top: 1px; }
          .notice {
            background: #fffbeb; border: 1px solid #fde68a; border-radius: 5px;
            padding: 5px 10px; font-size: 7.5px; color: #92400e; margin-bottom: 11px; line-height: 1.5;
          }
          table { width: 100%; border-collapse: collapse; }
          thead tr { background: #064e3b; color: white; }
          th { padding: 7px 8px; font-size: 8px; font-weight: 700; text-align: left; white-space: nowrap; }
          td { padding: 6px 8px; border-bottom: 1px solid #d1fae5; font-size: 8.5px; vertical-align: middle; }
          tr.even-row td { background: #f0fdf4; }
          tr.peak-row td { background: #fef3c7 !important; }
          .center { text-align: center; }
          .right { text-align: right; }
          .mono { font-family: "Courier New", monospace; }
          .month-cell { font-weight: 700; color: #065f46; }
          tr.peak-row .month-cell { color: #92400e; }
          .red { color: #dc2626; font-weight: 700; }
          .bar-cell { display: flex; align-items: center; gap: 5px; }
          .bar-track { flex: 1; height: 7px; background: #e5e7eb; border-radius: 4px; overflow: hidden; }
          .bar-fill {
            height: 100%; border-radius: 4px;
            -webkit-print-color-adjust: exact; print-color-adjust: exact;
          }
          .bar-pct { font-size: 7px; color: #6b7280; min-width: 24px; text-align: right; }
          tfoot tr td {
            background: #064e3b !important; color: white;
            font-weight: 800; font-size: 8.5px; border-bottom: none;
          }
          .report-footer {
            margin-top: 16px; border-top: 1px solid #d1fae5;
            padding-top: 8px; display: flex; justify-content: space-between; align-items: flex-start;
          }
          .footer-note { font-size: 7px; color: #6b7280; font-style: italic; max-width: 72%; line-height: 1.5; }
          .sig-area { text-align: center; width: 150px; }
          .sig-line { border-top: 1px solid #0f172a; margin-top: 22px; padding-top: 4px; font-size: 8px; font-weight: 700; }
        </style>
      </head>
      <body>
        <div class="report-header">
          <div>
            <p class="society-title">Majestique Euriska 'A' Building Co-operative Housing Society Ltd.</p>
            <p class="report-subtitle">Reg. No: PNA/PNA (4)/HSG/(TC)/21207/2019-20 • S. No.2, Plot No C-1, Village Mohammed Wadi, Taluka Haveli, District Pune — 411060</p>
            <span class="report-badge">${isBuildingA ? '🏢 Building \'A\' Common Lift — Monthly Consumption Report' : '📅 Tata Electricity — Monthly Consumption Report'}</span>
          </div>
          <div class="report-meta">
            <div><strong>Generated:</strong> ${printedDate}</div>
            <div><strong>Consumer:</strong> ${isBuildingA ? 'THE CHAIRMAN EURISKA A WING (COMMON LIFT)' : 'Tata Play Limited (Broadband Hub)'}</div>
            <div><strong>Meter:</strong> ${isBuildingA ? 'Consumer No: 170003586858 • Meter: 08210034428' : 'TATA-EUR-01 (4-Digit Sub-Meter)'}</div>
            <div><strong>Tariff / Load:</strong> ${isBuildingA ? '92 / LT I Res 3-Phase (10.00 KW)' : 'Sub-Meter Tariff Progression'}</div>
            <div><strong>Period:</strong> ${firstLabel} — ${lastLabel}</div>
          </div>
        </div>

        <div class="kpi-grid">
          <div class="kpi-card">
            <div class="kpi-label">Total Months</div>
            <div class="kpi-value" style="color:#064e3b;">${monthlyData.length} <span class="kpi-unit">months</span></div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">Total Est. Units</div>
            <div class="kpi-value" style="color:#0284c7;">${totalMonthlyUnits.toLocaleString('en-IN', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} <span class="kpi-unit">kWh</span></div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">Avg Monthly</div>
            <div class="kpi-value" style="color:#059669;">${avgMonthly.toFixed(0)} <span class="kpi-unit">units</span></div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">Avg Daily Overall</div>
            <div class="kpi-value" style="color:#7c3aed;">${avgDailyOverall} <span class="kpi-unit">u/day</span></div>
          </div>
          <div class="kpi-card" style="background:#f0fdf4;border-color:#bbf7d0;">
            <div class="kpi-label">Avg Rate / Unit</div>
            <div class="kpi-value" style="color:#16a34a;">₹${(totalMonthlyCost / (totalMonthlyUnits || 1)).toFixed(2)} <span class="kpi-unit">/ u</span></div>
            <div class="kpi-sub">${isBuildingA ? 'Effective MSEDCL Tariff' : 'Sub-Meter Tariff Rate'}</div>
          </div>
          <div class="kpi-card" style="background:#fff1f2;border-color:#fecdd3;">
            <div class="kpi-label">Total Est. Cost</div>
            <div class="kpi-value" style="color:#dc2626;">₹${fmt(totalMonthlyCost)}</div>
            <div class="kpi-sub">Peak: ${peakMonth.label} (${peakMonth.units.toLocaleString('en-IN')} u)</div>
          </div>
        </div>

        <div class="notice">
          ${isBuildingA
            ? `<strong>📌 MSEDCL Meter Tracking:</strong> Monthly figures are recorded from official Mahavitaran LT-I Residential 3-Phase meter (Consumer No: 170003586858, Hadapsar Sub-Division 4745). All 10 monthly cycles feature continuous, gapless meter readings.`
            : `<strong>⚠️ Estimation Methodology:</strong> Monthly units are <em>estimated</em> by distributing each billing period's total consumption proportionally based on the number of days covered in each calendar month. Tata Play's sub-meter uses a 4-digit dial with 10,000 unit reset rollover. Actual readings are billed across multi-month periods — monthly figures are derived, not directly metered.`}
        </div>

        <table>
          <thead>
            <tr>
              <th class="center" style="width:28px;">#</th>
              <th style="width:68px;">Month</th>
              <th class="right" style="width:95px;">Est. Units (kWh)</th>
              <th class="right" style="width:90px;">Avg Daily (u/day)</th>
              <th class="right" style="width:70px;">Days Covered</th>
              <th class="right" style="width:85px;">Avg Rate (₹/u)</th>
              <th class="right" style="width:105px;">Est. Cost (₹)</th>
              <th style="width:140px;">Usage (% of Peak)</th>
            </tr>
          </thead>
          <tbody>${tableRows}</tbody>
          <tfoot>
            <tr>
              <td colspan="2" style="text-align:left;">TOTAL (${monthlyData.length} months)</td>
              <td class="right mono">${totalMonthlyUnits.toLocaleString('en-IN', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</td>
              <td class="right mono">${avgDailyOverall}</td>
              <td class="right">${totalDays}</td>
              <td class="right mono" style="color: #86efac;">₹${(totalMonthlyCost / (totalMonthlyUnits || 1)).toFixed(2)}</td>
              <td class="right mono">₹${fmt(totalMonthlyCost)}</td>
              <td style="text-align:center;font-size:7.5px;color:#d1fae5;">Avg ${avgMonthly.toFixed(0)} u/month</td>
            </tr>
          </tfoot>
        </table>

        <div class="report-footer">
          <div class="footer-note">
            ${isBuildingA
              ? `* Official MSEDCL Building 'A' Common Lift Bills — Majestique Euriska 'A' Building CHS.<br/>Consumer No: 170003586858 • Sanctioned Load: 10.00 KW • Tariff: 92/LT I Res 3-Phase.<br/>Charges include Fixed (₹445/mo), Telescopic Energy Slabs, Wheeling (@ ₹1.60/u), Fuel Adjustment (FAC), and 16% Electricity Duty.`
              : `* All values are estimates based on proportional day-distribution of billing period totals.<br/>Source: Tata Electricity Sub-Meter Bills — Majestique Euriska 'A' Building CHS.<br/>Tariff history: ₹11.50/u (Mar'23–Jan'24) → ₹12.50/u (Feb'24–May'24) → ₹13.00/u (Jun'24–Present).`}
          </div>
          <div class="sig-area">
            <div class="sig-line">Society Secretary / Treasurer</div>
          </div>
        </div>

        <script>
          window.onload = function() { setTimeout(function() { window.print(); }, 300); };
        </script>
      </body>
      </html>
    `;

    const win = window.open('', '_blank');
    if (win) { win.document.write(docHtml); win.document.close(); }
  };

  const consumptionVal = parseFloat(tataConsumption) || 0;
  const rateVal = parseFloat(tataRatePerUnit) || 0;
  const baseAmountVal = Math.round(consumptionVal * rateVal);
  const cgstVal = Math.round(baseAmountVal * (parseFloat(tataCgstRate) || 0) / 100);
  const sgstVal = Math.round(baseAmountVal * (parseFloat(tataSgstRate) || 0) / 100);
  const grandTotalVal = baseAmountVal + cgstVal + sgstVal;
  const amountWordsVal = numberToWordsINR(grandTotalVal);

  const activeBills = subTab === 'mahavitaran' ? mahavitaranBills : (subTab === 'buildingA' ? buildingABills : tataBills);

  const filteredBills = activeBills
    .filter(c => {
      if (!searchText) return true;
      const s = searchText.toLowerCase();
      return (
        (c.periodLabel && c.periodLabel.toLowerCase().includes(s)) ||
        (c.startMonth && String(c.startMonth).toLowerCase().includes(s)) ||
        (c.endMonth && String(c.endMonth).toLowerCase().includes(s)) ||
        (c.duration && c.duration.toLowerCase().includes(s))
      );
    })
    .sort((a, b) => {
      const dateA = a.startMonth ? new Date(a.startMonth) : new Date(0);
      const dateB = b.startMonth ? new Date(b.startMonth) : new Date(0);
      return dateB - dateA; // Newest first
    });

  const totalAmount = filteredBills.reduce((s, c) => s + n(c.grandTotal), 0);
  const totalConsumption = filteredBills.reduce((s, c) => s + n(c.consumption), 0);

  const badge = {
    idle: { color: '#6b7280', icon: '●' },
    pending: { color: '#f59e0b', icon: '⏳' },
    saving: { color: '#3b82f6', icon: '↑' },
    saved: { color: '#10b981', icon: '✓' },
    error: { color: '#ef4444', icon: '✗' },
  }[saveStatus];

  const handleDownloadExcel = () => {
    let rows = [];
    if (subTab === 'tata') {
      rows = filteredBills.map((c, i) => ({
        'Sr. No': i + 1,
        'Billing Period': c.periodLabel || `${formatDateLabel(c.startMonth)} to ${formatDateLabel(c.endMonth)}`,
        'Duration': c.duration || computeBillingDuration(c.startMonth, c.endMonth),
        'Previous Reading (A)': c.prevReading,
        'Current Reading (B)': c.currReading,
        'Rollover Status': c.isRollover || n(c.currReading) < n(c.prevReading) ? '10k Unit Reset Rollover' : 'Normal',
        'Units Consumed (B - A)': n(c.consumption),
        'Per Unit Charge (₹)': n(c.ratePerUnit),
        'Calculation Note': c.calculationNote || `${c.consumption} × ₹${c.ratePerUnit}`,
        'Total Bill Amount (₹)': n(c.grandTotal),
        'Status': c.status || 'Paid'
      }));
    } else if (subTab === 'mahavitaran') {
      rows = filteredBills.map((c, i) => ({
        'Sr. No': i + 1,
        'Start Date': formatDateLabel(c.startMonth),
        'End Date': formatDateLabel(c.endMonth),
        'Previous Reading': n(c.prevReading),
        'Current Reading': n(c.currReading),
        'Units Consumed': n(c.consumption),
        'Fixed Charge (₹)': n(c.fixed || c.msebFixedCharge || 445),
        'Energy Charge (₹)': n(c.energy || c.msebEnergyCharge || 0),
        'Wheeling Charge (₹)': n(c.wheelTotal || (n(c.consumption) * 1.6)),
        'Fuel Adj (₹)': n(c.fuel || c.msebFuelAdj || 0),
        'Electricity Duty 16% (₹)': n(c.duty || (n(c.grandTotal) * 0.16 / 1.16)),
        'Rounded Grand Total (₹)': n(c.grandTotal),
      }));
    } else if (subTab === 'buildingA') {
      rows = filteredBills.map((c, i) => ({
        'Sr. No': i + 1,
        'Billing Period': c.periodLabel || `${formatDateLabel(c.startMonth)} to ${formatDateLabel(c.endMonth)}`,
        'Duration': c.duration || computeBillingDuration(c.startMonth, c.endMonth),
        'Start Date': formatDateLabel(c.startMonth),
        'End Date': formatDateLabel(c.endMonth),
        'Previous Reading (A)': n(c.prevReading),
        'Current Reading (B)': n(c.currReading),
        'Units Consumed': n(c.consumption),
        'Rate/Unit (₹)': n(c.ratePerUnit),
        'Fixed Charge (₹)': n(c.fixedCharge || 445),
        'Energy Charge (₹)': n(c.energyCharge || 0),
        'Wheeling Charge (₹)': n(c.wheelingCharge || (n(c.consumption) * 1.6)),
        'Fuel Adj (₹)': n(c.fuelAdj || 0),
        'Duty 16% (₹)': n(c.dutyAmount || (n(c.grandTotal) * 0.16 / 1.16)),
        'Total Bill Amount (₹)': n(c.grandTotal),
        'Status': c.status || 'Paid',
        'Payment/Due Date': c.paymentDate ? formatDateLabel(c.paymentDate) : (c.dueDate ? `Due ${formatDateLabel(c.dueDate)}` : '—'),
      }));
    } else {
      rows = filteredBills.map((c, i) => ({
        'Sr. No': i + 1,
        'Start Date': formatDateLabel(c.startMonth),
        'End Date': formatDateLabel(c.endMonth),
        'Previous Reading': n(c.prevReading),
        'Current Reading': n(c.currReading),
        'Total Consumption': n(c.consumption),
        'Rate/Unit (₹)': n(c.ratePerUnit),
        'Grand Total (₹)': n(c.grandTotal),
      }));
    }

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    const sheetName = subTab === 'tata' ? 'Tata Electricity' : (subTab === 'mahavitaran' ? 'Mahavitaran' : 'A Building');
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    XLSX.writeFile(wb, `${sheetName.replace(/\s+/g, '_')}_Bills.xlsx`);
  };

  const chartData = [...filteredBills].reverse().map(b => ({
    name: b.periodLabel ? b.periodLabel.replace('Electricity Bill Tata Play ', '').slice(0, 16) : formatDateLabel(b.startMonth),
    "Total Consumed": n(b.consumption),
    "Total Bill (₹)": n(b.grandTotal)
  }));

  const renderTabButton = (id, icon, label) => (
    <button
      onClick={() => { setSubTab(id); setEditingRowId(null); }}
      className={`sub-tab-button ${subTab === id ? 'active' : ''} electricity-tracker-s1`}
      style={{ background: subTab === id ? '#1e3a8a' : 'transparent', color: subTab === id ? 'white' : 'var(--muted)' }}
    >
      {icon} {label}
    </button>
  );

  return (
    <div className="electricity-tracker electricity-tracker-s2">

      {/* Tab Navigation */}
      <div className="table-card electricity-tracker-s3">
        <div className="electricity-tracker-s4">
          {renderTabButton('tata', '⚡️', 'Tata Electricity Bill')}
          {renderTabButton('buildingA', '🏢', 'A Building Electricity')}
          {renderTabButton('mahavitaran', '🔌', 'Mahavitaran (MSEB)')}
        </div>
      </div>

      {/* Header Banner */}
      <div className="table-card electricity-tracker-s5">
        <div className="attendance-table-card__header electricity-tracker-s6">
          <div>
            <p className="eyebrow electricity-tracker-s7">
              {subTab === 'tata' ? 'Tata Electricity Sub-Meter Billing' : (subTab === 'mahavitaran' ? 'Mahavitaran Dashboard' : 'A Building Dashboard')}
            </p>
            <h3 className="electricity-tracker-s8">
              {subTab === 'tata' ? 'Tata Electricity Bills' : (subTab === 'mahavitaran' ? 'MSEB Detailed Bills' : 'A Building Common Lift Bills')}
            </h3>
            {subTab === 'tata' && (
              <p className="electricity-tracker-s9">
                Consumer: <strong>Tata Play Limited</strong> (Broadband Hub) • Meter: <strong>TATA-EUR-01</strong> • 4-Digit Dial with <strong>10,000 Reset Rollover</strong>
              </p>
            )}
            {subTab === 'buildingA' && (
              <p className="electricity-tracker-s9">
                Consumer: <strong>THE CHAIRMAN EURISKA A WING (COMMON LIFT)</strong> • Consumer No: <strong>170003586858</strong> • Meter: <strong>08210034428</strong> • <strong>10.00 KW 3-Phase</strong>
              </p>
            )}
            {subTab === 'mahavitaran' && <p className="electricity-tracker-s9">Detailed breakdown per MSEB format</p>}
          </div>
          <div className="electricity-tracker-s10" style={{ color: badge.color }}>
            <span>{badge.icon}</span>
            <span>{isLoading ? 'Loading...' : saveMsg || 'Ready'}</span>
          </div>
        </div>
      </div>

      {/* TATA PLAY 10,000 RESET EXPLAINER & TARIFF PROGRESSION BANNER */}
      {subTab === 'tata' && (
        <div className="electricity-tracker-s11">
          <div className="electricity-tracker-s12">
            <div className="electricity-tracker-s13">
              <span className="electricity-tracker-s14">🔄</span>
              <div>
                <h4 className="electricity-tracker-s15">4-Digit Sub-Meter Rollover Principle (Reset After 10,000 Units)</h4>
                <p className="electricity-tracker-s16">
                  Sub-meter resets to 0000 after 9999. When <strong>Current (B) &lt; Previous (A)</strong>, consumption is: <code>Units = (10,000 - A) + B</code>.
                </p>
              </div>
            </div>
            <div className="electricity-tracker-s17">
              <span className="electricity-tracker-s18">
                🔄 Sep 25 – May 26: 2568 ➔ 1557 (8,988 U)
              </span>
              <span className="electricity-tracker-s18">
                🔄 Mar 25 – Aug 25: 9073 ➔ 2568 (3,495 U)
              </span>
              <span className="electricity-tracker-s18">
                🔄 Mar 23 – Jul 23: 7629 ➔ 0177 (2,548 U)
              </span>
            </div>
          </div>

          <div className="electricity-tracker-s19">
            <span className="electricity-tracker-s20">Tariff Rate Timeline:</span>
            <span className="electricity-tracker-s21">
              <strong>Phase 1 (Mar 23 – Jan 24):</strong> ₹11.50 / u
            </span>
            <span className="electricity-tracker-s21">
              <strong>Phase 2 (Feb 24 – May 24):</strong> ₹12.50 / u
            </span>
            <span className="electricity-tracker-s22">
              <strong>Phase 3 (Jun 24 – May 26):</strong> ₹13.00 / u (Current)
            </span>
          </div>
        </div>
      )}

      {/* BUILDING A MSEDCL DETAILS BANNER */}
      {subTab === 'buildingA' && (
        <div className="electricity-tracker-s23">
          <div className="electricity-tracker-s12">
            <div className="electricity-tracker-s13">
              <span className="electricity-tracker-s24">🏢</span>
              <div>
                <h4 className="electricity-tracker-s25">
                  Building A Wing Common Lift Meter (MSEDCL / Mahavitaran)
                </h4>
                <p className="electricity-tracker-s16">
                  Consumer No: <strong>170003586858</strong> • Meter No: <strong>08210034428</strong> • Tariff: <strong>92/LT I Res 3-Phase</strong> • Load: <strong>10.00 KW</strong> • Unit: <strong>4745/Hadapsar</strong>
                </p>
              </div>
            </div>
            <div className="electricity-tracker-s17">
              <span className="electricity-tracker-s26">
                📍 Hadapsar Sub-Dn (4745)
              </span>
              <span className="electricity-tracker-s27">
                🛡️ Security Deposit: ₹69,440
              </span>
              <span className="electricity-tracker-s18">
                ⚡ 10 Months Tracked: 17,712 Units
              </span>
            </div>
          </div>

          <div className="electricity-tracker-s28">
            <span className="electricity-tracker-s29">MSEDCL Slabs (Post-Apr'26):</span>
            <span className="electricity-tracker-s21">
              0–100: ₹3.96/u (FAC 0.15)
            </span>
            <span className="electricity-tracker-s21">
              101–300: ₹10.80/u (FAC 0.30)
            </span>
            <span className="electricity-tracker-s21">
              301–500: ₹15.03/u (FAC 0.40)
            </span>
            <span className="electricity-tracker-s21">
              &gt;500: ₹17.53/u (FAC 0.45)
            </span>
            <span className="electricity-tracker-s30">
              Wheeling: ₹1.60/u • Fixed: ₹445/mo • Duty: 16%
            </span>
          </div>
        </div>
      )}

      {/* SEARCH & ACTIONS ZONE */}
      <div className="section-card electricity-tracker-s31">
        <div className="electricity-tracker-s32">
          <div className="filter-field electricity-tracker-s33">
            <label className="eyebrow electricity-tracker-s34">🔍 Search Period / Dates / Duration</label>
            <input
              type="search"
              placeholder="Search period, date, units..."
              value={searchText}
              onChange={e => setSearchText(e.target.value)}
              className="attendance-register-input electricity-tracker-s35"
            />
          </div>
          <button className="button-secondary electricity-tracker-s36" onClick={handleDownloadExcel}>
            ⬇ Export to Excel
          </button>
          {subTab === 'buildingA' && (
            <button
              className="button-secondary electricity-tracker-s37"
              onClick={handlePrintBuildingAStatement}
              title="Print or export complete 10-month statement of Building A electricity bills"
            >
              <span>🖨️</span> Statement PDF
            </button>
          )}
          {subTab === 'tata' && (
            <>
              <button
                className="button-primary electricity-tracker-s38"
                onClick={() => {
                  setSelectedTataBillId(tataBills[0]?.id || 2001);
                  setTataInvoiceTarget('single');
                  setIsTataInvoiceModalOpen(true);
                }}
                title="Open interactive invoice generator for Tata electricity sub-meter bills"
              >
                <span>🧾</span> Generate Tata Invoice
              </button>
              <button
                className="button-secondary electricity-tracker-s37"
                onClick={handlePrintAllTataBills}
                title="Print or export complete statement of Tata electricity bills"
              >
                <span>🖨️</span> Statement PDF
              </button>
            </>
          )}
        </div>
      </div>

      {/* KPI METRICS ZONE */}
      {filteredBills.length > 0 && (
        <div className="electricity-tracker-s2">
          <div className="attendance-summary-grid electricity-tracker-s39" style={{ background: subTab === 'buildingA'
              ? 'linear-gradient(135deg, #f0fdf4 0%, #ffffff 100%)'
              : 'linear-gradient(135deg, #f0f9ff 0%, #ffffff 100%)', border: `1px solid ${subTab === 'buildingA' ? '#bbf7d0' : '#bae6fd'}` }}>
            <div className="electricity-tracker-s40">
              <p className="eyebrow electricity-tracker-s41" style={{ color: subTab === 'buildingA' ? '#166534' : '#0369a1' }}>
                {subTab === 'buildingA' ? '🏢 Building A Common Lift Consolidated Metrics' : (subTab === 'mahavitaran' ? '⚡ Mahavitaran MSEB Consolidated Metrics' : '📡 Tata Electricity Sub-Meter Consolidated Metrics')}
              </p>
              <span className="electricity-tracker-s42">{filteredBills.length} Billing Periods Tracked</span>
            </div>

            <div className="accounting-summary-card electricity-tracker-s43">
              <p className="eyebrow electricity-tracker-s44">Total Amount Billed</p>
              <h3 className="electricity-tracker-s45" style={{ color: subTab === 'buildingA' ? '#166534' : '#0369a1' }}>₹{fmt(totalAmount)}</h3>
              <p className="electricity-tracker-s46">
                {subTab === 'buildingA' ? `${filteredBills.length}-Month Audited Total` : 'Full 8-period audited total'}
              </p>
            </div>

            <div className="accounting-summary-card electricity-tracker-s43">
              <p className="eyebrow electricity-tracker-s44">Total Energy Consumed</p>
              <h3 className="electricity-tracker-s47">{fmt(totalConsumption)} Units</h3>
              <p className="electricity-tracker-s46">
                Avg ~{fmt(Math.round(totalConsumption / (filteredBills.length || 1)))} units / bill
              </p>
            </div>

            <div className="accounting-summary-card electricity-tracker-s43">
              <p className="eyebrow electricity-tracker-s44">
                {subTab === 'buildingA' ? 'Average Monthly Bill' : 'Active Tariff Rate'}
              </p>
              <h3 className="electricity-tracker-s48">
                {subTab === 'buildingA' ? `₹${fmt(Math.round(totalAmount / (filteredBills.length || 1)))}` : '₹13.00 / Unit'}
              </h3>
              <p className="electricity-tracker-s46">
                {subTab === 'buildingA' ? 'Effective avg ₹21.28 / unit' : 'Progressed from ₹11.50 ➔ ₹12.50'}
              </p>
            </div>

            <div className="accounting-summary-card electricity-tracker-s43">
              <p className="eyebrow electricity-tracker-s44">Meter Continuity</p>
              <h3 className="electricity-tracker-s49">
                {subTab === 'buildingA'
                  ? `${filteredBills[filteredBills.length - 1]?.prevReading || '132533'} ➔ ${filteredBills[0]?.currReading || '150245'}`
                  : '3 Rollovers'}
              </h3>
              <p className="electricity-tracker-s46">
                {subTab === 'buildingA' ? `${filteredBills.length} consecutive cycles (0 gaps)` : '7629 ➔ 1557 (0 gaps)'}
              </p>
            </div>
          </div>

          {/* HISTORICAL CONSUMPTION CHART */}
          <div className="section-card electricity-tracker-s50">
            <h4 className="electricity-tracker-s51">Electricity Consumption by Billing Period (kWh Units)</h4>
            <div className="electricity-tracker-s52">
              <ResponsiveContainer>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10 }} dy={8} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10 }} dx={-8} />
                  <Tooltip
                    cursor={{ fill: '#f1f5f9' }}
                    contentStyle={{ borderRadius: '6px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '0.75rem' }}
                  />
                  <Bar dataKey="Total Consumed" fill="#0284c7" radius={[4, 4, 0, 0]} maxBarSize={36} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* MONTHLY CONSUMPTION BREAKDOWN */}
          {(subTab === 'tata' || subTab === 'buildingA') && (() => {
            const monthlyData = computeMonthlyConsumption(filteredBills);
            if (monthlyData.length === 0) return null;
            const peakMonth = monthlyData.reduce((a, b) => b.units > a.units ? b : a, monthlyData[0]);
            const avgMonthly = monthlyData.reduce((s, m) => s + m.units, 0) / monthlyData.length;
            const totalMonthlyUnits = monthlyData.reduce((s, m) => s + m.units, 0);
            const totalMonthlyCost = monthlyData.reduce((s, m) => s + m.estCost, 0);
            return (
              <div className="electricity-tracker-s53">
                {/* Header */}
                <div className="electricity-tracker-s54">
                  <div>
                    <div className="electricity-tracker-s13">
                      <span className="electricity-tracker-s14">📅</span>
                      <h4 className="electricity-tracker-s55">
                        {subTab === 'buildingA' ? 'Building A Monthly Consumption Breakdown' : 'Monthly Consumption Breakdown'}
                      </h4>
                    </div>
                    <p className="electricity-tracker-s56">
                      {subTab === 'buildingA'
                        ? 'Estimated monthly units by proportionally distributing each billing period across calendar months'
                        : 'Estimated monthly units by proportionally distributing each billing period across calendar months'}
                    </p>
                  </div>
                  <div className="electricity-tracker-s57">
                    <span className="electricity-tracker-s58">
                      {monthlyData.length} Months
                    </span>
                    <span className="electricity-tracker-s59">
                      Peak: {peakMonth.label} ({peakMonth.units.toLocaleString('en-IN')} u)
                    </span>
                    <button
                      onClick={() => handlePrintMonthlyBreakdown(monthlyData, subTab)}
                      className="electricity-tracker-s60"
                      title="Export Monthly Consumption Breakdown as PDF"
                    >
                      <span>🖨️</span> Download PDF
                    </button>
                  </div>
                </div>

                {/* Mini KPI Row */}
                <div className="electricity-tracker-s61">
                  <div className="electricity-tracker-s62">
                    <div className="electricity-tracker-s63">Avg Monthly</div>
                    <div className="electricity-tracker-s64">{avgMonthly.toFixed(0)} <span className="electricity-tracker-s65">units</span></div>
                  </div>
                  <div className="electricity-tracker-s62">
                    <div className="electricity-tracker-s63">Total Units</div>
                    <div className="electricity-tracker-s66">{totalMonthlyUnits.toFixed(0)} <span className="electricity-tracker-s65">kWh</span></div>
                  </div>
                  <div className="electricity-tracker-s67">
                    <div className="electricity-tracker-s68">Avg Rate / Unit</div>
                    <div className="electricity-tracker-s69">₹{(totalMonthlyCost / (totalMonthlyUnits || 1)).toFixed(2)} <span className="electricity-tracker-s65">/ u</span></div>
                  </div>
                  <div className="electricity-tracker-s62">
                    <div className="electricity-tracker-s63">Est. Total Cost</div>
                    <div className="electricity-tracker-s70">₹{fmt(totalMonthlyCost)}</div>
                  </div>
                  <div className="electricity-tracker-s62">
                    <div className="electricity-tracker-s63">Peak Month</div>
                    <div className="electricity-tracker-s71">{peakMonth.label}</div>
                    <div className="electricity-tracker-s72">{peakMonth.units.toLocaleString('en-IN')} units</div>
                  </div>
                </div>

                {/* Trend Line Chart */}
                <div className="electricity-tracker-s73">
                  <ResponsiveContainer>
                    <LineChart data={monthlyData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#d1fae5" />
                      <XAxis
                        dataKey="label"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#6b7280', fontSize: 9 }}
                        dy={8}
                        interval={Math.max(0, Math.floor(monthlyData.length / 10) - 1)}
                      />
                      <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#6b7280', fontSize: 9 }}
                        dx={-4}
                        width={45}
                      />
                      <Tooltip
                        cursor={{ stroke: '#86efac', strokeWidth: 1 }}
                        contentStyle={{
                          borderRadius: '8px',
                          border: '1px solid #d1fae5',
                          boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                          fontSize: '0.72rem',
                          background: 'white'
                        }}
                        formatter={(value, name) => [
                          name === 'units' ? `${Number(value).toLocaleString('en-IN', { maximumFractionDigits: 1 })} units` : `₹${fmt(value)}`,
                          name === 'units' ? 'Est. Units' : 'Est. Cost (₹)'
                        ]}
                        labelFormatter={(label) => `Month: ${label}`}
                      />
                      <Legend
                        wrapperStyle={{ fontSize: '0.7rem', paddingTop: '4px' }}
                        formatter={(value) => value === 'units' ? 'Est. Units (kWh)' : 'Est. Cost (₹)'}
                      />
                      <Line
                        type="monotone"
                        dataKey="units"
                        stroke="#059669"
                        strokeWidth={2}
                        dot={{ r: 3, fill: '#059669', strokeWidth: 0 }}
                        activeDot={{ r: 5 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                {/* Monthly Table */}
                <div className="electricity-tracker-s74">
                  <table className="electricity-tracker-s75">
                    <thead>
                      <tr className="electricity-tracker-s76">
                        <th className="electricity-tracker-s77">#</th>
                        <th className="electricity-tracker-s77">Month</th>
                        <th className="electricity-tracker-s78">Est. Units (kWh)</th>
                        <th className="electricity-tracker-s78">Avg Daily (u/day)</th>
                        <th className="electricity-tracker-s78">Days Covered</th>
                        <th className="electricity-tracker-s78">Avg Rate (₹/u)</th>
                        <th className="electricity-tracker-s78">Est. Cost (₹)</th>
                        <th className="electricity-tracker-s79">Usage Bar</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...monthlyData].reverse().map((m, i) => {
                        const pct = peakMonth.units > 0 ? (m.units / peakMonth.units) * 100 : 0;
                        const isHighest = m.monthKey === peakMonth.monthKey;
                        const barColor = pct > 80 ? '#dc2626' : pct > 50 ? '#f59e0b' : '#059669';
                        return (
                          <tr key={m.monthKey} className="electricity-tracker-s80" style={{ background: isHighest ? '#fef3c7' : i % 2 === 0 ? '#f0fdf4' : 'white' }}>
                            <td className="electricity-tracker-s81">{monthlyData.length - i}</td>
                            <td className="electricity-tracker-s82" style={{ color: isHighest ? '#92400e' : '#065f46' }}>
                              {isHighest ? '🔥 ' : ''}{m.label}
                            </td>
                            <td className="electricity-tracker-s83">
                              {m.units.toLocaleString('en-IN', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                            </td>
                            <td className="electricity-tracker-s84">
                              {m.avgDaily}
                            </td>
                            <td className="electricity-tracker-s85">
                              {m.days}
                            </td>
                            <td className="electricity-tracker-s86">
                              ₹{(m.estCost / (m.units || 1)).toFixed(2)}
                            </td>
                            <td className="electricity-tracker-s87">
                              ₹{fmt(m.estCost)}
                            </td>
                            <td className="electricity-tracker-s88">
                              <div className="electricity-tracker-s89">
                                <div className="electricity-tracker-s90">
                                  <div className="electricity-tracker-s91" style={{ width: `${pct}%`, background: barColor }} />
                                </div>
                                <span className="electricity-tracker-s92">
                                  {pct.toFixed(0)}%
                                </span>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="electricity-tracker-s76">
                        <td colSpan={2} className="electricity-tracker-s93">TOTAL ({monthlyData.length} months)</td>
                        <td className="electricity-tracker-s94">
                          {totalMonthlyUnits.toLocaleString('en-IN', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                        </td>
                        <td className="electricity-tracker-s95">
                          {(totalMonthlyUnits / monthlyData.reduce((s, m) => s + m.days, 0)).toFixed(2)}
                        </td>
                        <td className="electricity-tracker-s96">
                          {monthlyData.reduce((s, m) => s + m.days, 0)}
                        </td>
                        <td className="electricity-tracker-s97">
                          ₹{(totalMonthlyCost / (totalMonthlyUnits || 1)).toFixed(2)}
                        </td>
                        <td className="electricity-tracker-s94">
                          ₹{fmt(totalMonthlyCost)}
                        </td>
                        <td className="electricity-tracker-s98">
                          Avg {avgMonthly.toFixed(0)} u/mo
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                <p className="electricity-tracker-s99">
                  * Monthly units are estimated by distributing each billing period's total consumption proportionally based on the number of days covered in each calendar month. Actual meter readings are taken across multi-month periods, not monthly.
                </p>
              </div>
            );
          })()}
        </div>
      )}

      {/* CREATE NEW TATA ELECTRICITY BILL FORM (ADMIN ONLY) */}
      {isAdmin && (
        <div className="section-card electricity-tracker-s100">
          <div className="electricity-tracker-s101">
            <div>
              <h4 className="electricity-tracker-s102">
                ➕ {subTab === 'tata' ? 'Create New Tata Electricity Bill' : (subTab === 'buildingA' ? 'Add Building A Common Lift Bill' : (subTab === 'mahavitaran' ? 'Add Mahavitaran MSEB Bill' : 'Add A Building Bill'))}
              </h4>
              <p className="electricity-tracker-s103">
                {subTab === 'tata'
                  ? 'Enter sub-meter readings and duration. The system automatically detects 10,000 reset rollover if B < A.'
                  : subTab === 'buildingA'
                  ? 'Enter MSEDCL monthly meter readings. The system automatically computes LT-1 Residential 3-Phase slabs, wheeling, fuel adjustment, and 16% electricity duty.'
                  : 'Enter meter readings and billing details.'}
              </p>
            </div>

            {subTab === 'tata' && latestTataBill && (
              <button
                type="button"
                className="button-secondary electricity-tracker-s104"
                onClick={applyNextTataPeriod}
                title="Pre-fills start date and previous reading from latest bill"
              >
                <span>⚡</span> Auto-Fill Next Cycle (Prev: {latestTataBill.currReading})
              </button>
            )}

            {subTab === 'buildingA' && latestBuildingABill && (
              <button
                type="button"
                className="button-secondary electricity-tracker-s105"
                onClick={applyNextBuildingAPeriod}
                title="Pre-fills start date and previous reading from latest Building A bill"
              >
                <span>⚡</span> Auto-Fill Next Cycle (Prev: {latestBuildingABill.currReading})
              </button>
            )}
          </div>

          <form onSubmit={handleFormSubmit} className="electricity-tracker-s106">
            {(subTab === 'tata' || subTab === 'buildingA') && (
              <>
                <div className="field-group electricity-tracker-s107">
                  <label className="eyebrow electricity-tracker-s34">Billing Period Name <span className="electricity-tracker-s108">*</span></label>
                  <input
                    className="attendance-register-input electricity-tracker-s109"
                    type="text"
                    placeholder={subTab === 'buildingA' ? "e.g. Sep 2026 (16 Aug – 14 Sep)" : "e.g. May 26 to Sep 26"}
                    value={formData.periodLabel}
                    onChange={e => handleFormChange('periodLabel', e.target.value)}
                    required
                  />
                </div>

                <div className="field-group">
                  <label className="eyebrow electricity-tracker-s34">Duration <span className="electricity-tracker-s108">*</span></label>
                  <input
                    className="attendance-register-input electricity-tracker-s109"
                    type="text"
                    placeholder={subTab === 'buildingA' ? "e.g. 30 Days (0.97 Mo)" : "e.g. 4 Months (120 Days)"}
                    value={formData.duration}
                    onChange={e => handleFormChange('duration', e.target.value)}
                    required
                  />
                </div>
              </>
            )}

            <div className="field-group">
              <label className="eyebrow electricity-tracker-s34">Start Date <span className="electricity-tracker-s108">*</span></label>
              <input className="attendance-register-input electricity-tracker-s110" type="date" value={formData.startMonth} onChange={e => handleFormChange('startMonth', e.target.value)} required />
            </div>

            <div className="field-group">
              <label className="eyebrow electricity-tracker-s34">End Date <span className="electricity-tracker-s108">*</span></label>
              <input className="attendance-register-input electricity-tracker-s110" type="date" value={formData.endMonth} onChange={e => handleFormChange('endMonth', e.target.value)} required />
            </div>

            <div className="field-group">
              <label className="eyebrow electricity-tracker-s34">Previous Reading (A) <span className="electricity-tracker-s108">*</span></label>
              <input className="attendance-register-input electricity-tracker-s110" type="number" step="any" placeholder="e.g. 2568" value={formData.prevReading} onChange={e => handleFormChange('prevReading', e.target.value)} required />
            </div>

            <div className="field-group">
              <label className="eyebrow electricity-tracker-s34">Current Reading (B) <span className="electricity-tracker-s108">*</span></label>
              <input className="attendance-register-input electricity-tracker-s110" type="number" step="any" placeholder="e.g. 1557" value={formData.currReading} onChange={e => handleFormChange('currReading', e.target.value)} required />
            </div>

            <div className="field-group">
              <label className="eyebrow electricity-tracker-s34">Per Unit Charge (₹) <span className="electricity-tracker-s108">*</span></label>
              <input className="attendance-register-input electricity-tracker-s110" type="number" step="any" placeholder={subTab === 'buildingA' ? '21.10' : '13.00'} value={formData.ratePerUnit} onChange={e => handleFormChange('ratePerUnit', e.target.value)} required />
            </div>

            {/* Live calculation banner if readings are filled */}
            {subTab === 'tata' && formData.prevReading !== '' && formData.currReading !== '' && (
              <div className="electricity-tracker-s111" style={{ background: n(formData.currReading) < n(formData.prevReading) ? '#fef3c7' : '#eff6ff', border: '1px solid ' + (n(formData.currReading) < n(formData.prevReading) ? '#fde68a' : '#bfdbfe') }}>
                <div>
                  <div className="electricity-tracker-s112" style={{ color: n(formData.currReading) < n(formData.prevReading) ? '#92400e' : '#1e40af' }}>
                    {n(formData.currReading) < n(formData.prevReading) ? '🔄 10,000 Reset Rollover Detected:' : '📊 Standard Reading Calculation:'}
                  </div>
                  <div className="electricity-tracker-s113">
                    {calculateSubmeterRollover(formData.prevReading, formData.currReading).formulaText}
                  </div>
                </div>
                <div className="electricity-tracker-s114">
                  <span className="electricity-tracker-s42">Estimated Bill: </span>
                  <strong className="electricity-tracker-s115">
                    ₹{fmt(calculateSubmeterRollover(formData.prevReading, formData.currReading).units * (n(formData.ratePerUnit) || 13))}
                  </strong>
                </div>
              </div>
            )}

            {subTab === 'buildingA' && formData.prevReading !== '' && formData.currReading !== '' && (() => {
              const prev = n(formData.prevReading);
              const curr = n(formData.currReading);
              if (curr < prev) {
                return (
                  <div className="electricity-tracker-s116">
                    ⚠️ Current reading ({curr}) cannot be less than previous reading ({prev}).
                  </div>
                );
              }
              const consumption = curr - prev;
              const { energyTotal, fuelTotal } = calculateMahavitaranSlabs(consumption);
              const fixedCharge = 445.00;
              const wheelingCharge = consumption * 1.60;
              const dutyAmount = (fixedCharge + energyTotal + wheelingCharge + fuelTotal) * 0.16;
              const grandTotal = Math.round(fixedCharge + energyTotal + wheelingCharge + fuelTotal + dutyAmount);
              const avgRate = (grandTotal / (consumption || 1)).toFixed(2);
              return (
                <div className="electricity-tracker-s117">
                  <div>
                    <div className="electricity-tracker-s118">
                      🏢 Building A MSEDCL LT-1 Res 3-Phase Tariff Calculation:
                    </div>
                    <div className="electricity-tracker-s113">
                      {curr} - {prev} = <strong>{consumption} units</strong> • Fixed ₹445 + Energy ₹{fmt(energyTotal)} + Wheel ₹{fmt(wheelingCharge)} + FAC ₹{fmt(fuelTotal)} + 16% Duty ₹{fmt(dutyAmount)}
                    </div>
                  </div>
                  <div className="electricity-tracker-s114">
                    <span className="electricity-tracker-s42">Estimated Bill (@ avg ₹{avgRate}/u): </span>
                    <strong className="electricity-tracker-s119">
                      ₹{fmt(grandTotal)}
                    </strong>
                  </div>
                </div>
              );
            })()}

            <div className="electricity-tracker-s120">
              <button type="submit" className="button-primary electricity-tracker-s121" style={{ background: subTab === 'buildingA' ? '#166534' : '#0284c7', borderColor: subTab === 'buildingA' ? '#166534' : '#0284c7' }}>
                Calculate &amp; Create Bill
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MAIN TABLE */}
      <div className="table-card electricity-tracker-s122">
        <div className="attendance-table-scroll electricity-tracker-s123">
          <table className="attendance-table electricity-tracker-s124">
            <thead>
              {subTab === 'tata' ? (
                <tr className="electricity-tracker-s125">
                  <th className="electricity-tracker-s126">#</th>
                  <th className="electricity-tracker-s127">Billing Period</th>
                  <th className="electricity-tracker-s128">Duration</th>
                  <th className="electricity-tracker-s129">Prev (A)</th>
                  <th className="electricity-tracker-s129">Curr (B)</th>
                  <th className="electricity-tracker-s130">Status</th>
                  <th className="electricity-tracker-s131">Units (B - A)</th>
                  <th className="electricity-tracker-s129">Rate / Unit</th>
                  <th className="electricity-tracker-s132">Total Amount (₹)</th>
                  <th className="electricity-tracker-s133">Actions</th>
                </tr>
              ) : subTab === 'buildingA' ? (
                <tr className="electricity-tracker-s125">
                  <th className="electricity-tracker-s126">#</th>
                  <th className="electricity-tracker-s127">Billing Period / Month</th>
                  <th className="electricity-tracker-s134">Duration</th>
                  <th className="electricity-tracker-s129">Prev Read</th>
                  <th className="electricity-tracker-s129">Curr Read</th>
                  <th className="electricity-tracker-s130">Status</th>
                  <th className="electricity-tracker-s131">Units Consumed</th>
                  <th className="electricity-tracker-s129">Avg Rate</th>
                  <th className="electricity-tracker-s135">Total Bill (₹)</th>
                  <th className="electricity-tracker-s136">Actions</th>
                </tr>
              ) : subTab === 'mahavitaran' ? (
                <tr className="electricity-tracker-s125">
                  <th className="electricity-tracker-s137">Sr.</th>
                  <th className="electricity-tracker-s138">Billing Period</th>
                  <th className="electricity-tracker-s129">Readings</th>
                  <th className="electricity-tracker-s139">Units</th>
                  <th className="electricity-tracker-s140">Fixed</th>
                  <th className="electricity-tracker-s131">Energy</th>
                  <th className="electricity-tracker-s141">Wheeling</th>
                  <th className="electricity-tracker-s129">Fuel</th>
                  <th className="electricity-tracker-s129">Duty</th>
                  <th className="electricity-tracker-s142">Grand Total</th>
                  <th className="electricity-tracker-s143">Actions</th>
                </tr>
              ) : (
                <tr className="electricity-tracker-s125">
                  <th className="electricity-tracker-s137">Sr.</th>
                  <th className="electricity-tracker-s144">Period</th>
                  <th className="electricity-tracker-s145">Prev Read</th>
                  <th className="electricity-tracker-s145">Curr Read</th>
                  <th className="electricity-tracker-s141">Consumed</th>
                  <th className="electricity-tracker-s141">Rate</th>
                  <th className="electricity-tracker-s146">Grand Total</th>
                  <th className="electricity-tracker-s143">Actions</th>
                </tr>
              )}
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={10} className="electricity-tracker-s147">Loading records...</td></tr>
              ) : filteredBills.length === 0 ? (
                <tr><td colSpan={10} className="electricity-tracker-s147">
                  {searchText ? `No bills found matching "${searchText}"` : 'No bills recorded.'}
                </td></tr>
              ) : (
                filteredBills.map((c, i) => {
                  const actualIdx = activeBills.findIndex(orig => orig.id === c.id);
                  const isEditing = editingRowId === c.id;

                  if (subTab === 'tata') {
                    const isRolloverBill = c.isRollover || n(c.currReading) < n(c.prevReading);
                    return (
                      <tr key={c.id || i} style={{ background: isRolloverBill ? '#fffdfa' : 'transparent' }}>
                        <td className="electricity-tracker-s148">{i + 1}</td>

                        {/* Billing Period */}
                        <td className="electricity-tracker-s149">
                          {isEditing ? (
                            <input
                              className="attendance-register-input electricity-tracker-s150"
                              type="text"
                              value={c.periodLabel || ''}
                              onChange={e => updateRow(actualIdx, 'periodLabel', e.target.value)}
                            />
                          ) : (
                            <div>
                              <strong className="electricity-tracker-s151">
                                {c.periodLabel || `${formatDateLabel(c.startMonth)} to ${formatDateLabel(c.endMonth)}`}
                              </strong>
                              {c.startMonth && c.endMonth && (
                                <div className="electricity-tracker-s152">
                                  {formatDateLabel(c.startMonth)} – {formatDateLabel(c.endMonth)}
                                </div>
                              )}
                            </div>
                          )}
                        </td>

                        {/* Duration */}
                        <td className="electricity-tracker-s153">
                          {isEditing ? (
                            <input
                              className="attendance-register-input electricity-tracker-s150"
                              type="text"
                              value={c.duration || ''}
                              onChange={e => updateRow(actualIdx, 'duration', e.target.value)}
                            />
                          ) : (
                            <span className="electricity-tracker-s154">
                              🗓️ {c.duration || computeBillingDuration(c.startMonth, c.endMonth) || '—'}
                            </span>
                          )}
                        </td>

                        {/* Prev Reading (A) */}
                        <td className="electricity-tracker-s155">
                          {isEditing ? (
                            <input
                              className="attendance-register-input electricity-tracker-s156"
                              type="text"
                              value={c.prevReading}
                              onChange={e => updateRow(actualIdx, 'prevReading', e.target.value)}
                            />
                          ) : (
                            c.prevReading
                          )}
                        </td>

                        {/* Curr Reading (B) */}
                        <td className="electricity-tracker-s155">
                          {isEditing ? (
                            <input
                              className="attendance-register-input electricity-tracker-s156"
                              type="text"
                              value={c.currReading}
                              onChange={e => updateRow(actualIdx, 'currReading', e.target.value)}
                            />
                          ) : (
                            c.currReading
                          )}
                        </td>

                        {/* Meter Status / 10k Reset Badge */}
                        <td className="electricity-tracker-s157">
                          {isRolloverBill ? (
                            <span className="electricity-tracker-s158" title="(10000 - A) + B = Units">
                              🔄 10k Reset
                            </span>
                          ) : (
                            <span className="electricity-tracker-s159">
                              Normal
                            </span>
                          )}
                        </td>

                        {/* Units Consumed (B - A) */}
                        <td className="electricity-tracker-s160">
                          {isEditing ? (
                            <input
                              className="attendance-register-input electricity-tracker-s156"
                              type="number"
                              value={c.consumption}
                              onChange={e => updateRow(actualIdx, 'consumption', e.target.value)}
                            />
                          ) : (
                            <div>
                              <span className="electricity-tracker-s161">{fmt(n(c.consumption))}</span>
                              <div className="electricity-tracker-s162">
                                {isRolloverBill ? `(10k - ${c.prevReading}) + ${c.currReading}` : `${c.currReading} - ${c.prevReading}`}
                              </div>
                            </div>
                          )}
                        </td>

                        {/* Per Unit Rate */}
                        <td className="electricity-tracker-s163">
                          {isEditing ? (
                            <input
                              className="attendance-register-input electricity-tracker-s156"
                              type="number"
                              step="any"
                              value={c.ratePerUnit}
                              onChange={e => updateRow(actualIdx, 'ratePerUnit', e.target.value)}
                            />
                          ) : (
                            <span className="electricity-tracker-s164">
                              ₹{Number(c.ratePerUnit || 13).toFixed(2)}
                            </span>
                          )}
                        </td>

                        {/* Total Amount */}
                        <td className="electricity-tracker-s165">
                          ₹{fmt(c.grandTotal)}
                        </td>

                        {/* Actions */}
                        <td className="electricity-tracker-s153">
                          <div className="electricity-tracker-s166">
                            <button
                              className="button-icon electricity-tracker-s167"
                              title="Generate / Preview Tax Invoice"
                              onClick={() => {
                                setSelectedTataBillId(c.id);
                                setTataInvoiceTarget('single');
                                setIsTataInvoiceModalOpen(true);
                              }}
                            >
                              🧾
                            </button>
                            <button
                              className="button-icon electricity-tracker-s168"
                              title="Quick Print A4 PDF"
                              onClick={() => handlePrintTataBill(c)}
                            >
                              🖨️
                            </button>
                            {isAdmin && (
                              <>
                                {isEditing ? (
                                  <button className="button-icon electricity-tracker-s169" title="Save" onClick={() => setEditingRowId(null)}>✅</button>
                                ) : (
                                  <button className="button-icon electricity-tracker-s170" title="Edit" onClick={() => setEditingRowId(c.id)}>✏️</button>
                                )}
                                <button className="button-icon electricity-tracker-s171" title="Delete" onClick={() => removeRow(actualIdx)}>✕</button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  }

                  if (subTab === 'mahavitaran') {
                    return (
                      <tr key={c.id || i}>
                        <td className="electricity-tracker-s172">{i + 1}</td>
                        <td className="electricity-tracker-s173">
                          {isEditing ? (
                            <div className="electricity-tracker-s174">
                              <input className="attendance-register-input electricity-tracker-s175" type="date" value={c.startMonth} onChange={e => updateRow(actualIdx, 'startMonth', e.target.value)} />
                              <span>-</span>
                              <input className="attendance-register-input electricity-tracker-s175" type="date" value={c.endMonth} onChange={e => updateRow(actualIdx, 'endMonth', e.target.value)} />
                            </div>
                          ) : (
                            <span className="electricity-tracker-s176">{formatDateLabel(c.startMonth)} -<br />{formatDateLabel(c.endMonth)}</span>
                          )}
                        </td>
                        <td className="electricity-tracker-s177">
                          {isEditing ? (
                            <div className="electricity-tracker-s178">
                              <input className="attendance-register-input electricity-tracker-s179" type="number" step="any" value={c.prevReading} onChange={e => updateRow(actualIdx, 'prevReading', e.target.value)} />
                              <input className="attendance-register-input electricity-tracker-s179" type="number" step="any" value={c.currReading} onChange={e => updateRow(actualIdx, 'currReading', e.target.value)} />
                            </div>
                          ) : (
                            <><span className="electricity-tracker-s180">P: {n(c.prevReading)}</span><br /><span>C: {n(c.currReading)}</span></>
                          )}
                        </td>
                        <td className="electricity-tracker-s181">{n(c.consumption)}</td>
                        <td className="electricity-tracker-s182">
                          {isEditing ? <input className="attendance-register-input electricity-tracker-s179" type="number" step="any" value={c.msebFixedCharge || c.fixed} onChange={e => updateRow(actualIdx, 'msebFixedCharge', e.target.value)} /> : `₹${fmt(n(c.fixed || c.msebFixedCharge || 445))}`}
                        </td>
                        <td className="electricity-tracker-s182">
                          {isEditing ? <input className="attendance-register-input electricity-tracker-s179" type="number" step="any" value={c.msebEnergyCharge || c.energy} onChange={e => updateRow(actualIdx, 'msebEnergyCharge', e.target.value)} /> : `₹${fmt(n(c.energy || c.msebEnergyCharge || 0))}`}
                        </td>
                        <td className="electricity-tracker-s182">
                          {isEditing ? <input className="attendance-register-input electricity-tracker-s179" type="number" step="any" value={c.msebWheelingRate || c.wheelTotal} onChange={e => updateRow(actualIdx, 'msebWheelingRate', e.target.value)} /> : `₹${fmt(n(c.wheelTotal || (n(c.consumption) * 1.6)))}`}
                        </td>
                        <td className="electricity-tracker-s182">
                          {isEditing ? <input className="attendance-register-input electricity-tracker-s179" type="number" step="any" value={c.msebFuelAdj || c.fuel} onChange={e => updateRow(actualIdx, 'msebFuelAdj', e.target.value)} /> : `₹${fmt(n(c.fuel || c.msebFuelAdj || 0))}`}
                        </td>
                        <td className="electricity-tracker-s182">₹{fmt(n(c.duty || (n(c.grandTotal) * 0.16 / 1.16)))}</td>
                        <td className="electricity-tracker-s183">₹{fmt(c.grandTotal)}</td>
                        <td className="electricity-tracker-s153">
                          <div className="electricity-tracker-s166">
                            {isAdmin && (
                              <>
                                {isEditing ? (
                                  <button className="button-icon electricity-tracker-s169" title="Save" onClick={() => setEditingRowId(null)}>✅</button>
                                ) : (
                                  <button className="button-icon electricity-tracker-s170" title="Edit" onClick={() => setEditingRowId(c.id)}>✏️</button>
                                )}
                                <button className="button-icon electricity-tracker-s171" title="Delete" onClick={() => removeRow(actualIdx)}>✕</button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  }

                  if (subTab === 'buildingA') {
                    const isPaid = c.status === 'Paid';
                    return (
                      <tr key={c.id || i} style={{ background: isPaid ? 'transparent' : '#fefdfa' }}>
                        <td className="electricity-tracker-s148">{i + 1}</td>

                        {/* Billing Period */}
                        <td className="electricity-tracker-s149">
                          {isEditing ? (
                            <input
                              className="attendance-register-input electricity-tracker-s150"
                              type="text"
                              value={c.periodLabel || ''}
                              onChange={e => updateRow(actualIdx, 'periodLabel', e.target.value)}
                            />
                          ) : (
                            <div>
                              <strong className="electricity-tracker-s151">
                                {c.periodLabel || `${formatDateLabel(c.startMonth)} to ${formatDateLabel(c.endMonth)}`}
                              </strong>
                              {c.startMonth && c.endMonth && (
                                <div className="electricity-tracker-s152">
                                  {formatDateLabel(c.startMonth)} – {formatDateLabel(c.endMonth)}
                                </div>
                              )}
                            </div>
                          )}
                        </td>

                        {/* Duration */}
                        <td className="electricity-tracker-s184">
                          {isEditing ? (
                            <input
                              className="attendance-register-input electricity-tracker-s185"
                              type="text"
                              value={c.duration || ''}
                              onChange={e => updateRow(actualIdx, 'duration', e.target.value)}
                            />
                          ) : (
                            <span className="electricity-tracker-s186">
                              {c.duration || computeBillingDuration(c.startMonth, c.endMonth) || '-'}
                            </span>
                          )}
                        </td>

                        {/* Prev Reading */}
                        <td className="electricity-tracker-s187">
                          {isEditing ? (
                            <input
                              className="attendance-register-input electricity-tracker-s156"
                              type="text"
                              value={c.prevReading}
                              onChange={e => updateRow(actualIdx, 'prevReading', e.target.value)}
                            />
                          ) : (
                            c.prevReading
                          )}
                        </td>

                        {/* Curr Reading */}
                        <td className="electricity-tracker-s187">
                          {isEditing ? (
                            <input
                              className="attendance-register-input electricity-tracker-s156"
                              type="text"
                              value={c.currReading}
                              onChange={e => updateRow(actualIdx, 'currReading', e.target.value)}
                            />
                          ) : (
                            c.currReading
                          )}
                        </td>

                        {/* Status */}
                        <td className="electricity-tracker-s157">
                          <span className="electricity-tracker-s188" style={{ background: isPaid ? '#dcfce7' : '#fef3c7', color: isPaid ? '#166534' : '#92400e', border: `1px solid ${isPaid ? '#86efac' : '#fde68a'}` }} title={c.paidDate ? `Paid on ${formatDateLabel(c.paidDate)}` : `Due on ${formatDateLabel(c.dueDate)} (Prompt: ₹${fmt(c.promptPaymentAmount || 36820)})`}>
                            {isPaid ? '✅ Paid' : '⏳ Invoiced'}
                          </span>
                        </td>

                        {/* Units Consumed */}
                        <td className="electricity-tracker-s160">
                          {isEditing ? (
                            <input
                              className="attendance-register-input electricity-tracker-s156"
                              type="number"
                              value={c.consumption}
                              onChange={e => updateRow(actualIdx, 'consumption', e.target.value)}
                            />
                          ) : (
                            <div>
                              <span className="electricity-tracker-s161">{fmt(n(c.consumption))}</span>
                              <div className="electricity-tracker-s162">
                                {c.currReading} - {c.prevReading}
                              </div>
                            </div>
                          )}
                        </td>

                        {/* Per Unit Rate */}
                        <td className="electricity-tracker-s163">
                          {isEditing ? (
                            <input
                              className="attendance-register-input electricity-tracker-s156"
                              type="number"
                              step="any"
                              value={c.ratePerUnit}
                              onChange={e => updateRow(actualIdx, 'ratePerUnit', e.target.value)}
                            />
                          ) : (
                            <span className="electricity-tracker-s164">
                              ₹{Number(c.ratePerUnit || (n(c.grandTotal) / (n(c.consumption) || 1))).toFixed(2)}
                            </span>
                          )}
                        </td>

                        {/* Total Amount */}
                        <td className="electricity-tracker-s189">
                          ₹{fmt(c.grandTotal)}
                        </td>

                        {/* Actions */}
                        <td className="electricity-tracker-s153">
                          <div className="electricity-tracker-s166">
                            <button
                              className="button-icon electricity-tracker-s190"
                              title="Print Official MSEDCL Bill Voucher (A4)"
                              onClick={() => handlePrintBuildingABill(c)}
                            >
                              🖨️
                            </button>
                            {isAdmin && (
                              <>
                                {isEditing ? (
                                  <button className="button-icon electricity-tracker-s169" title="Save" onClick={() => setEditingRowId(null)}>✅</button>
                                ) : (
                                  <button className="button-icon electricity-tracker-s170" title="Edit" onClick={() => setEditingRowId(c.id)}>✏️</button>
                                )}
                                <button className="button-icon electricity-tracker-s171" title="Delete" onClick={() => removeRow(actualIdx)}>✕</button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  }

                  return (
                    <tr key={c.id || i}>
                      <td className="electricity-tracker-s172">{i + 1}</td>
                      <td className="electricity-tracker-s173">
                        {isEditing ? (
                          <div className="electricity-tracker-s174">
                            <input className="attendance-register-input electricity-tracker-s191" type="date" value={c.startMonth} onChange={e => updateRow(actualIdx, 'startMonth', e.target.value)} />
                            <span>-</span>
                            <input className="attendance-register-input electricity-tracker-s191" type="date" value={c.endMonth} onChange={e => updateRow(actualIdx, 'endMonth', e.target.value)} />
                          </div>
                        ) : (
                          <span className="electricity-tracker-s192">{formatDateLabel(c.startMonth)} - {formatDateLabel(c.endMonth)}</span>
                        )}
                      </td>
                      <td className="electricity-tracker-s182">
                        {isEditing ? (
                          <input className="attendance-register-input electricity-tracker-s193" type="number" step="any" value={c.prevReading} onChange={e => updateRow(actualIdx, 'prevReading', e.target.value)} />
                        ) : (
                          n(c.prevReading)
                        )}
                      </td>
                      <td className="electricity-tracker-s182">
                        {isEditing ? (
                          <input className="attendance-register-input electricity-tracker-s193" type="number" step="any" value={c.currReading} onChange={e => updateRow(actualIdx, 'currReading', e.target.value)} />
                        ) : (
                          n(c.currReading)
                        )}
                      </td>
                      <td className="electricity-tracker-s194">{n(c.consumption)}</td>
                      <td className="electricity-tracker-s182">
                        {isEditing ? (
                          <input className="attendance-register-input electricity-tracker-s193" type="number" step="any" value={c.ratePerUnit} onChange={e => updateRow(actualIdx, 'ratePerUnit', e.target.value)} />
                        ) : (
                          `₹${n(c.ratePerUnit)}`
                        )}
                      </td>
                      <td className="electricity-tracker-s195">₹{fmt(c.grandTotal)}</td>
                      <td className="electricity-tracker-s153">
                        {isAdmin && (
                          <div className="electricity-tracker-s196">
                            {isEditing ? (
                              <button className="button-icon electricity-tracker-s169" title="Save" onClick={() => setEditingRowId(null)}>✅</button>
                            ) : (
                              <button className="button-icon electricity-tracker-s170" title="Edit" onClick={() => setEditingRowId(c.id)}>✏️</button>
                            )}
                            <button className="button-icon electricity-tracker-s171" title="Delete" onClick={() => removeRow(actualIdx)}>✕</button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            <tfoot>
              {subTab === 'tata' ? (
                <tr className="electricity-tracker-s197">
                  <td colSpan={6} className="electricity-tracker-s198">TOTAL (8 BILLING CYCLES):</td>
                  <td className="electricity-tracker-s199">{fmt(totalConsumption)}</td>
                  <td className="electricity-tracker-s200">₹{(totalAmount / (totalConsumption || 1)).toFixed(2)}</td>
                  <td className="electricity-tracker-s201">₹{fmt(totalAmount)}</td>
                  <td></td>
                </tr>
              ) : subTab === 'buildingA' ? (
                <tr className="electricity-tracker-s197">
                  <td colSpan={6} className="electricity-tracker-s198">TOTAL ({filteredBills.length} BILLING CYCLES):</td>
                  <td className="electricity-tracker-s199">{fmt(totalConsumption)}</td>
                  <td className="electricity-tracker-s200">₹{(totalAmount / (totalConsumption || 1)).toFixed(2)}</td>
                  <td className="electricity-tracker-s202">₹{fmt(totalAmount)}</td>
                  <td></td>
                </tr>
              ) : subTab === 'mahavitaran' ? (
                <tr className="electricity-tracker-s197">
                  <td colSpan={3} className="electricity-tracker-s198">GRAND TOTAL</td>
                  <td className="electricity-tracker-s199">{fmt(totalConsumption)}</td>
                  <td colSpan={4}></td>
                  <td></td>
                  <td className="electricity-tracker-s203">₹{fmt(totalAmount)}</td>
                  <td></td>
                </tr>
              ) : (
                <tr className="electricity-tracker-s197">
                  <td colSpan={4} className="electricity-tracker-s198">GRAND TOTAL</td>
                  <td className="electricity-tracker-s199">{fmt(totalConsumption)}</td>
                  <td></td>
                  <td className="electricity-tracker-s203">₹{fmt(totalAmount)}</td>
                  <td></td>
                </tr>
              )}
            </tfoot>
          </table>
        </div>
      </div>

      {/* TATA ELECTRICITY INVOICE GENERATOR MODAL */}
      {isTataInvoiceModalOpen && (
        <div className="electricity-tracker-s204">
          <div className="electricity-tracker-s205">
            
            {/* Modal Header */}
            <div className="electricity-tracker-s206">
              <div>
                <span className="electricity-tracker-s207">Commercial Sub-Meter Billing</span>
                <h3 className="electricity-tracker-s208">🧾 Tata Electricity Sub-Meter Tax Invoice Generator</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsTataInvoiceModalOpen(false)}
                className="electricity-tracker-s209"
              >
                ✕
              </button>
            </div>

            {/* Modal Body: Split view */}
            <div className="electricity-tracker-s210">
              
              {/* Left Column: Form Configuration & Inputs */}
              <div className="electricity-tracker-s211">
                
                {/* Quick Presets & Scope */}
                <div className="electricity-tracker-s212">
                  <div className="electricity-tracker-s213">
                    <label className="electricity-tracker-s214">
                      📋 Quick Select / Billing Scope
                    </label>
                    <button
                      type="button"
                      onClick={handleResetToUploadedInvoice}
                      className="electricity-tracker-s215"
                      title="Load exact figures from the uploaded official invoice"
                    >
                      ⚡ Reset to Scanned Bill
                    </button>
                  </div>

                  <div className="electricity-tracker-s216">
                    <button
                      type="button"
                      onClick={() => setTataInvoiceTarget('single')}
                      className="electricity-tracker-s217" style={{ border: tataInvoiceTarget === 'single' ? '2px solid #0b2b26' : '1px solid #cbd5e1', background: tataInvoiceTarget === 'single' ? '#0b2b26' : '#fff', color: tataInvoiceTarget === 'single' ? '#C49B4F' : '#334155' }}
                    >
                      Single Period
                    </button>
                    <button
                      type="button"
                      onClick={() => setTataInvoiceTarget('all')}
                      className="electricity-tracker-s217" style={{ border: tataInvoiceTarget === 'all' ? '2px solid #0b2b26' : '1px solid #cbd5e1', background: tataInvoiceTarget === 'all' ? '#0b2b26' : '#fff', color: tataInvoiceTarget === 'all' ? '#C49B4F' : '#334155' }}
                    >
                      All {tataBills.length} Billing Cycles
                    </button>
                  </div>

                  {tataInvoiceTarget === 'single' && (
                    <div>
                      <label className="electricity-tracker-s218">
                        Load Cycle Values:
                      </label>
                      <select
                        value={selectedTataBillId || ''}
                        onChange={(e) => {
                          const found = tataBills.find(b => String(b.id) === e.target.value);
                          if (found) handleSelectTataBillForInvoice(found);
                        }}
                        className="electricity-tracker-s219"
                      >
                        {tataBills.map(b => (
                          <option key={b.id} value={b.id}>
                            {b.periodLabel || 'Billing Cycle'} (₹{fmt(b.grandTotal)})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                {/* Section 1: Period & Society Name */}
                <div className="electricity-tracker-s220">
                  <div className="electricity-tracker-s221">
                    1. Period &amp; Society Details
                  </div>
                  <div>
                    <label className="electricity-tracker-s222">
                      Electricity Charges for the month:
                    </label>
                    <input
                      type="text"
                      value={tataMonthRangeText}
                      onChange={(e) => setTataMonthRangeText(e.target.value)}
                      placeholder="e.g. Sep 25 to May 26"
                      className="electricity-tracker-s223"
                    />
                  </div>
                  <div>
                    <label className="electricity-tracker-s222">
                      Society Name &rarr;
                    </label>
                    <input
                      type="text"
                      value={tataSocietyName}
                      onChange={(e) => setTataSocietyName(e.target.value)}
                      placeholder="e.g. Majestique Euriska CHS"
                      className="electricity-tracker-s223"
                    />
                  </div>
                </div>

                {/* Section 2: Readings & Consumption */}
                <div className="electricity-tracker-s220">
                  <div className="electricity-tracker-s221">
                    2. Readings &amp; Consumption Calculation
                  </div>
                  <div className="electricity-tracker-s224">
                    <div>
                      <label className="electricity-tracker-s225">
                        Previous Reading(A):
                      </label>
                      <input
                        type="text"
                        value={tataPrevReading}
                        onChange={(e) => handlePrevReadingChange(e.target.value)}
                        placeholder="Enter reading"
                        className="electricity-tracker-s226"
                      />
                    </div>
                    <div>
                      <label className="electricity-tracker-s225">
                        Current Reading(B):
                      </label>
                      <input
                        type="text"
                        value={tataCurrReading}
                        onChange={(e) => handleCurrReadingChange(e.target.value)}
                        placeholder="Enter reading"
                        className="electricity-tracker-s226"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="electricity-tracker-s227">
                      Meter Type / Note:
                    </label>
                    <input
                      type="text"
                      value={tataMeterNote}
                      onChange={(e) => setTataMeterNote(e.target.value)}
                      placeholder="(4 Digit Sub Meter)"
                      className="electricity-tracker-s228"
                    />
                  </div>
                  <div className="electricity-tracker-s229">
                    <div>
                      <label className="electricity-tracker-s230">
                        Total Consumption(B-A):
                      </label>
                      <input
                        type="text"
                        value={tataConsumption}
                        onChange={(e) => setTataConsumption(e.target.value)}
                        placeholder="8988.00"
                        className="electricity-tracker-s231"
                      />
                    </div>
                    <div>
                      <label className="electricity-tracker-s232">
                        Per unit Charges &rarr;
                      </label>
                      <input
                        type="text"
                        value={tataRatePerUnit}
                        onChange={(e) => setTataRatePerUnit(e.target.value)}
                        placeholder="13.00"
                        className="electricity-tracker-s233"
                      />
                    </div>
                  </div>
                  <div className="electricity-tracker-s234">
                    💡 <strong>Rollover:</strong> When B &lt; A, units auto-calculated as <code>(10,000 - A) + B</code>. Manual edits are also preserved.
                  </div>
                </div>

                {/* Section 3: Invoice Number, Date & Bill To */}
                <div className="electricity-tracker-s220">
                  <div className="electricity-tracker-s221">
                    3. Invoice Meta &amp; Party Details
                  </div>
                  <div className="electricity-tracker-s224">
                    <div>
                      <label className="electricity-tracker-s225">
                        Invoice Number:
                      </label>
                      <input
                        type="text"
                        value={tataInvoiceNo}
                        onChange={(e) => setTataInvoiceNo(e.target.value)}
                        placeholder="2026/01"
                        className="electricity-tracker-s235"
                      />
                    </div>
                    <div>
                      <label className="electricity-tracker-s225">
                        Invoice Date:
                      </label>
                      <input
                        type="text"
                        value={tataInvoiceDateStr}
                        onChange={(e) => setTataInvoiceDateStr(e.target.value)}
                        placeholder="18 May 2026"
                        className="electricity-tracker-s235"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="electricity-tracker-s225">
                      Bill To (Recipient &amp; Address):
                    </label>
                    <textarea
                      rows={4}
                      value={tataBillTo}
                      onChange={(e) => setTataBillTo(e.target.value)}
                      className="electricity-tracker-s236"
                    />
                  </div>
                  <div className="electricity-tracker-s224">
                    <div>
                      <label className="electricity-tracker-s237">
                        ADD CGST 9% (₹):
                      </label>
                      <input
                        type="text"
                        value={tataCgstRate}
                        onChange={(e) => setTataCgstRate(e.target.value)}
                        placeholder="0.0"
                        className="electricity-tracker-s238"
                      />
                    </div>
                    <div>
                      <label className="electricity-tracker-s237">
                        ADD SGST 9% (₹):
                      </label>
                      <input
                        type="text"
                        value={tataSgstRate}
                        onChange={(e) => setTataSgstRate(e.target.value)}
                        placeholder="0.0"
                        className="electricity-tracker-s238"
                      />
                    </div>
                  </div>
                </div>

                {/* Section 4: Society Footer Info */}
                <div className="electricity-tracker-s239">
                  <div className="electricity-tracker-s221">
                    4. Society Footer Particulars
                  </div>
                  <div>
                    <label className="electricity-tracker-s240">
                      Company Address:
                    </label>
                    <input
                      type="text"
                      value={tataCompanyAddress}
                      onChange={(e) => setTataCompanyAddress(e.target.value)}
                      className="electricity-tracker-s241"
                    />
                  </div>
                  <div>
                    <label className="electricity-tracker-s240">
                      Company PAN:
                    </label>
                    <input
                      type="text"
                      value={tataCompanyPan}
                      onChange={(e) => setTataCompanyPan(e.target.value)}
                      className="electricity-tracker-s241"
                    />
                  </div>
                </div>

                {/* Real-time Calculation Summary */}
                <div className="electricity-tracker-s242">
                  <div className="electricity-tracker-s243">
                    <span className="electricity-tracker-s244">Total Subtotal:</span>
                    <strong className="electricity-tracker-s245">₹{fmt(baseAmountVal)}</strong>
                  </div>
                  <div className="electricity-tracker-s246">
                    <span className="electricity-tracker-s247">Grand Total Payable:</span>
                    <strong className="electricity-tracker-s248">₹{fmt(grandTotalVal)}</strong>
                  </div>
                  <div className="electricity-tracker-s249">
                    <strong>In Words:</strong> {amountWordsVal}
                  </div>
                </div>

              </div>

              {/* Right Column: Live Official Scanned Template Replica */}
              <div className="electricity-tracker-s250">
                <div className="electricity-tracker-s251">
                  <span>📄 Live Preview: Official Scanned Invoice Replica (A4 Format)</span>
                </div>
                
                <div className="electricity-tracker-s252">
                  {/* Society Header & Logo */}
                  <div className="electricity-tracker-s253">
                    <div className="electricity-tracker-s254">
                      <img
                        src="/logo.png"
                        alt="Majestique Euriska"
                        className="electricity-tracker-s255"
                        onError={(e) => { e.currentTarget.style.display = 'none'; }}
                      />
                    </div>
                    <div className="electricity-tracker-s256">
                      <div className="electricity-tracker-s257">
                        MAJESTIQUE EURISKA A BUILDING COOPERATIVE HOUSING SOCIETY LTD
                      </div>
                      <div className="electricity-tracker-s258">
                        Reg. No PNA/PNA (4)/HSG/(TC)/21207/2019-20 Date 09/08/2019
                      </div>
                      <div className="electricity-tracker-s259">
                        Address: - S. No.2, Plot No C-1, Village Mohammed Wadi,<br />
                        Taluka Haveli, District Pune, Pune 411060
                      </div>
                      <div className="electricity-tracker-s260">
                        Email: majestiqueeuriska.a@gmail.com &nbsp;&nbsp;&nbsp;&nbsp; Phone No:
                      </div>
                    </div>
                  </div>

                  {/* 3-Column Table: Bill To | Invoice Number | Invoice Date */}
                  <table className="electricity-tracker-s261">
                    <thead>
                      <tr>
                        <th className="electricity-tracker-s262">Bill To</th>
                        <th className="electricity-tracker-s263">Invoice Number</th>
                        <th className="electricity-tracker-s263">Invoice Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="electricity-tracker-s264">
                          <div className="electricity-tracker-s265">{(tataBillTo.split('\n')[0] || 'Tata Play Broadband Private Limited')}</div>
                          {tataBillTo.split('\n').slice(1).map((line, lIdx) => (
                            <div key={lIdx}>{line}</div>
                          ))}
                        </td>
                        <td className="electricity-tracker-s266">
                          {tataInvoiceNo}
                        </td>
                        <td className="electricity-tracker-s266">
                          {tataInvoiceDateStr}
                        </td>
                      </tr>
                    </tbody>
                  </table>

                  {/* Services Table */}
                  <table className="electricity-tracker-s267">
                    <thead>
                      <tr>
                        <th className="electricity-tracker-s268">Description of Services</th>
                        <th className="electricity-tracker-s269">Rate/Per unit</th>
                        <th className="electricity-tracker-s269">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="electricity-tracker-s270">
                          <div className="electricity-tracker-s271">
                            Electricity Charges for the month {tataMonthRangeText}
                          </div>
                          <div className="electricity-tracker-s271">
                            Society Name &rarr; {tataSocietyName}
                          </div>
                          <div className="electricity-tracker-s272">
                            Previous Reading(A) &rarr; {tataPrevReading}
                          </div>
                          <div className="electricity-tracker-s272">
                            Current Reading(B) &rarr; {tataCurrReading} {tataMeterNote}
                          </div>
                          <div className="electricity-tracker-s271">
                            Total Consumption(B-A) &rarr; {tataConsumption}
                          </div>
                          <div className="electricity-tracker-s273">
                            Per unit Charges &rarr; {tataRatePerUnit}
                          </div>
                        </td>
                        <td className="electricity-tracker-s274">
                          {tataRatePerUnit}
                        </td>
                        <td className="electricity-tracker-s275">
                          {fmt(baseAmountVal)}
                        </td>
                      </tr>
                      <tr>
                        <td colSpan={2} className="electricity-tracker-s276">
                          Total :-
                        </td>
                        <td className="electricity-tracker-s277">
                          {fmt(baseAmountVal)}
                        </td>
                      </tr>
                      <tr>
                        <td colSpan={2} className="electricity-tracker-s276">
                          ADD CGST 9%
                        </td>
                        <td className="electricity-tracker-s277">
                          {cgstVal ? fmt(cgstVal) : '0.0'}
                        </td>
                      </tr>
                      <tr>
                        <td colSpan={2} className="electricity-tracker-s276">
                          ADD SGST 9%
                        </td>
                        <td className="electricity-tracker-s277">
                          {sgstVal ? fmt(sgstVal) : '0.0'}
                        </td>
                      </tr>
                      <tr>
                        <td colSpan={2} className="electricity-tracker-s278">
                          Grand Total
                        </td>
                        <td className="electricity-tracker-s279">
                          {fmt(grandTotalVal)}
                        </td>
                      </tr>
                    </tbody>
                  </table>

                  {/* Amount in words and Stamp / Signature Box */}
                  <div className="electricity-tracker-s280">
                    <div className="electricity-tracker-s281">
                      <div className="electricity-tracker-s282">Amount in word: -</div>
                      <div className="electricity-tracker-s283">{amountWordsVal}</div>
                    </div>
                    <div className="electricity-tracker-s284">
                      {/* Stamp & Seal */}
                      <div className="electricity-tracker-s285">
                        <div className="electricity-tracker-s286">
                          MAJESTIQUE EURISKA 'A' BUILDING SAH. GRUHRACHANA SANSTHA MARYADIT
                        </div>
                        <div className="electricity-tracker-s287">
                          <div>Reg. No.</div>
                          <div className="electricity-tracker-s288">PNA/PNA/(4)/<br />HSG/(TC)/21207</div>
                          <div>2019-20</div>
                          <div>Dt. 9/8/19</div>
                        </div>
                      </div>
                      {/* Signature */}
                      <svg viewBox="0 0 100 40" className="electricity-tracker-s289">
                        <path d="M10 28 Q 20 5, 30 25 T 50 15 T 70 28 T 90 20" fill="none" stroke="#000000" strokeWidth="2.2" strokeLinecap="round" />
                        <path d="M25 22 Q 40 38, 85 24" fill="none" stroke="#000000" strokeWidth="1.8" strokeLinecap="round" />
                      </svg>
                    </div>
                  </div>

                  {/* Footer Box */}
                  <div className="electricity-tracker-s290">
                    <div>Company address: {tataCompanyAddress}</div>
                    <div>Company PAN : {tataCompanyPan}</div>
                  </div>
                </div>

                {tataInvoiceToast && (
                  <div className="electricity-tracker-s291">
                    {tataInvoiceToast}
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer Toolbar */}
            <div className="electricity-tracker-s292">
              <div className="electricity-tracker-s293">
                Scope: <strong>{tataInvoiceTarget === 'single' ? tataMonthRangeText : `All ${tataBills.length} Billing Cycles`}</strong>
                &nbsp;• Grand Total: <strong className="electricity-tracker-s294">₹{fmt(grandTotalVal)}</strong>
              </div>

              <div className="electricity-tracker-s295">
                {tataInvoiceTarget === 'single' && (
                  <>
                    <button
                      type="button"
                      onClick={() => handleCopyTataInvoiceText({ ...activeTataBill, periodLabel: tataMonthRangeText, grandTotal: grandTotalVal, prevReading: tataPrevReading, currReading: tataCurrReading, consumption: tataConsumption, ratePerUnit: tataRatePerUnit })}
                      className="electricity-tracker-s296"
                    >
                      📋 Copy Text
                    </button>
                    <button
                      type="button"
                      onClick={() => handleShareTataWhatsApp({ ...activeTataBill, periodLabel: tataMonthRangeText, grandTotal: grandTotalVal, prevReading: tataPrevReading, currReading: tataCurrReading, consumption: tataConsumption, ratePerUnit: tataRatePerUnit })}
                      className="electricity-tracker-s297"
                    >
                      📱 Send WhatsApp
                    </button>
                  </>
                )}

                <button
                  type="button"
                  onClick={handlePrintTataInvoiceModalDoc}
                  className="electricity-tracker-s298"
                >
                  🖨️ Print / Download PDF ({tataInvoiceTarget === 'single' ? '1 Invoice' : `${tataBillsForInvoice.length} Invoices`})
                </button>

                <button
                  type="button"
                  onClick={() => setIsTataInvoiceModalOpen(false)}
                  className="electricity-tracker-s299"
                >
                  Close
                </button>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
