import React, { useState, useMemo, useCallback } from 'react';
import ShopMaintenanceTracker from './ShopMaintenanceTracker.jsx';
import ElectricityTracker from './ElectricityTracker.jsx';
import TimesOfIndiaTracker from './TimesOfIndiaTracker.jsx';

const fmt = (v) => Number(v || 0).toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });
const formatValue = (v) => Number(v || 0).toLocaleString('en-IN');

function formatDisplayDate(isoDate) {
  if (!isoDate) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) {
    const [y, m, d] = isoDate.split('-').map(Number);
    return new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(y, m - 1, d));
  }
  return isoDate;
}

function calculateMonthsBetween(startMonthStr, endMonthStr) {
  if (!startMonthStr || !endMonthStr) return 0;
  const [y1, m1] = startMonthStr.split('-').map(Number);
  const [y2, m2] = endMonthStr.split('-').map(Number);
  if (isNaN(y1) || isNaN(m1) || isNaN(y2) || isNaN(m2)) return 0;
  const count = (y2 - y1) * 12 + (m2 - m1) + 1;
  return count > 0 ? count : 0;
}

function formatMonthYearLabel(monthStr) {
  if (!monthStr) return '';
  const [y, m] = monthStr.split('-').map(Number);
  if (isNaN(y) || isNaN(m)) return monthStr;
  const date = new Date(y, m - 1, 1);
  return date.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
}

function calculateToiForRange(startMonthStr, endMonthStr) {
  if (!startMonthStr || !endMonthStr) return { total: 0, phase1Months: 0, phase2Months: 0, totalMonths: 0 };
  const [y1, m1] = startMonthStr.split('-').map(Number);
  const [y2, m2] = endMonthStr.split('-').map(Number);
  if (isNaN(y1) || isNaN(m1) || isNaN(y2) || isNaN(m2)) return { total: 0, phase1Months: 0, phase2Months: 0, totalMonths: 0 };
  
  let phase1Months = 0; // Oct 2021 to Jun 2025 @ 2,200/yr = 183.33/mo
  let phase2Months = 0; // Jul 2025 to Sept 2026 @ 3,000/yr = 250.00/mo
  
  let curY = y1, curM = m1;
  while (curY < y2 || (curY === y2 && curM <= m2)) {
    if (curY > 2025 || (curY === 2025 && curM >= 7)) {
      phase2Months++;
    } else {
      phase1Months++;
    }
    curM++;
    if (curM > 12) {
      curM = 1;
      curY++;
    }
  }
  
  const phase1Amt = Math.round(phase1Months * (2200 / 12));
  const phase2Amt = Math.round(phase2Months * (3000 / 12));
  return {
    total: phase1Amt + phase2Amt,
    phase1Months,
    phase2Months,
    phase1Amt,
    phase2Amt,
    totalMonths: phase1Months + phase2Months
  };
}

export default function CommonInvoiceHub({ isAdmin = false }) {
  const [activeCategory, setActiveCategory] = useState('month_range'); // 'month_range' | 'all_hub' | 'shops' | 'tata' | 'toi' | 'custom'

  // ─── 1. Month-Range Maintenance & TOI State ───
  const [calcFlat, setCalcFlat] = useState('A-302');
  const [calcFlatSubtext, setCalcFlatSubtext] = useState("Majestique Euriska 'A' Building, Mohammed Wadi, Pune - 411060");
  const [calcStartMonth, setCalcStartMonth] = useState('2024-04');
  const [calcEndMonth, setCalcEndMonth] = useState('2025-03');
  const [calcMaintenanceRate, setCalcMaintenanceRate] = useState(2850);
  const [calcSinkingFundRate, setCalcSinkingFundRate] = useState(150);
  const [calcIncludeToi, setCalcIncludeToi] = useState(true);
  const [calcIncludeEarlierPending, setCalcIncludeEarlierPending] = useState(false);
  const [calcCustomToiRate, setCalcCustomToiRate] = useState('');
  const [calcDocType, setCalcDocType] = useState('invoice'); // 'invoice' | 'notice'
  const [calcInvoiceNo, setCalcInvoiceNo] = useState(() => `INV-ME/FLAT/2026-27/${Math.floor(1000 + Math.random() * 9000)}`);
  const [calcInvoiceDate, setCalcInvoiceDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });
  const [calcDueDate, setCalcDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });
  const [calcNotes, setCalcNotes] = useState('Payment requested via NEFT / RTGS to HDFC Bank A/C: 50200075533530. Kindly mention Flat No in narration and share screenshot.');
  const [calcToast, setCalcToast] = useState('');

  // Computations for Month Range
  const calcMonthsCount = useMemo(() => calculateMonthsBetween(calcStartMonth, calcEndMonth), [calcStartMonth, calcEndMonth]);
  const calcMaintenanceTotal = useMemo(() => calcMonthsCount * Number(calcMaintenanceRate || 0), [calcMonthsCount, calcMaintenanceRate]);
  const calcSinkingFundTotal = useMemo(() => calcMonthsCount * Number(calcSinkingFundRate || 0), [calcMonthsCount, calcSinkingFundRate]);
  const calcBaseTotal = useMemo(() => calcMaintenanceTotal + calcSinkingFundTotal, [calcMaintenanceTotal, calcSinkingFundTotal]);
  
  const calcToiDetails = useMemo(() => calculateToiForRange(calcStartMonth, calcEndMonth), [calcStartMonth, calcEndMonth]);
  const calcToiTotal = useMemo(() => {
    if (!calcIncludeToi) return 0;
    if (calcCustomToiRate !== '') return calcMonthsCount * Number(calcCustomToiRate || 0);
    return calcToiDetails.total;
  }, [calcIncludeToi, calcCustomToiRate, calcMonthsCount, calcToiDetails]);

  const calcEarlierPendingAmount = useMemo(() => {
    return calcIncludeEarlierPending ? 13200 : 0;
  }, [calcIncludeEarlierPending]);

  const calcGrandTotal = useMemo(() => calcBaseTotal + calcToiTotal + calcEarlierPendingAmount, [calcBaseTotal, calcToiTotal, calcEarlierPendingAmount]);

  // Quick Presets Handler
  const applyMonthPreset = (startM, endM) => {
    setCalcStartMonth(startM);
    setCalcEndMonth(endM);
  };

  // WhatsApp generator for Month-Range
  const generateCalcWhatsAppMessage = useCallback(() => {
    const isInv = calcDocType === 'invoice';
    const startLbl = formatMonthYearLabel(calcStartMonth);
    const endLbl = formatMonthYearLabel(calcEndMonth);
    const lines = [
      `🏛️ *MAJESTIQUE EURISKA 'A' CO-OP HOUSING SOCIETY LTD.*`,
      `📄 *${isInv ? 'TAX INVOICE / BILL' : 'DEMAND NOTICE & DUES INTIMATION'}*`,
      `───────────────────────────`,
      `📌 *Ref No:* ${calcInvoiceNo}`,
      `📅 *Date:* ${formatDisplayDate(calcInvoiceDate)}`,
      `⏰ *Due Date:* ${formatDisplayDate(calcDueDate)}`,
      `👤 *Billed To:* Flat ${calcFlat}`,
      `📋 *Billing Period:* ${startLbl} to ${endLbl} (*${calcMonthsCount} Months*)`,
      ``,
      `*BILL PARTICULARS:*`,
      `1. Flat Maintenance (${calcMonthsCount} mos @ ₹${formatValue(calcMaintenanceRate)}/mo): *₹${formatValue(calcMaintenanceTotal)}*`,
      `2. Sinking Fund (${calcMonthsCount} mos @ ₹${formatValue(calcSinkingFundRate)}/mo): *₹${formatValue(calcSinkingFundTotal)}*`,
      `   ↳ *Society Base Total:* *₹${formatValue(calcBaseTotal)}* (₹${formatValue(Number(calcMaintenanceRate) + Number(calcSinkingFundRate))}/mo)`,
    ];

    if (calcIncludeEarlierPending) {
      lines.push(
        `3. *Earlier Pending Amount (Oct 2024 – Mar 2025):* *₹13,200*`,
        `   • Maintenance: ₹2,100 × 6 = ₹12,600`,
        `   • Sinking Fund: ₹100 × 6 = ₹600`
      );
    }

    if (calcIncludeToi) {
      lines.push(`${calcIncludeEarlierPending ? '4' : '3'}. Times of India (TOI) Subscription (${calcMonthsCount} mos): *₹${formatValue(calcToiTotal)}*`);
    }

    lines.push(
      ``,
      `💰 *GRAND TOTAL PAYABLE:* *₹${formatValue(calcGrandTotal)}*`,
      `───────────────────────────`,
      `🏦 *SOCIETY BANK REMITTANCE INFO:*`,
      `• *Bank:* HDFC Bank`,
      `• *Account Name:* MAJESTIQUE EURISKA A BLDG SA GRU SAN MAR`,
      `• *A/C No:* 50200075533530`,
      `• *IFSC Code:* HDFC0002454`,
      `• *Account Type:* CA-INSTITUTION (Current Account)`,
      `• *Branch:* Undri / NIBM Road, Mohammedwadi, Pune - 411060`,
      ``,
      `💬 *Note:* ${calcNotes}`,
      `_Kindly share payment screenshot / UTR after remittance._`
    );
    return lines.join('\n');
  }, [calcDocType, calcInvoiceNo, calcInvoiceDate, calcDueDate, calcFlat, calcStartMonth, calcEndMonth, calcMonthsCount, calcMaintenanceRate, calcMaintenanceTotal, calcSinkingFundRate, calcSinkingFundTotal, calcBaseTotal, calcIncludeEarlierPending, calcIncludeToi, calcToiTotal, calcGrandTotal, calcNotes]);

  const handleShareCalcWhatsApp = () => {
    const text = encodeURIComponent(generateCalcWhatsAppMessage());
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  const handleCopyCalcText = () => {
    navigator.clipboard.writeText(generateCalcWhatsAppMessage()).then(() => {
      setCalcToast('✓ Invoice text copied to clipboard!');
      setTimeout(() => setCalcToast(''), 3000);
    });
  };

  const handlePrintCalcInvoice = () => {
    const isInv = calcDocType === 'invoice';
    const startLbl = formatMonthYearLabel(calcStartMonth);
    const endLbl = formatMonthYearLabel(calcEndMonth);

    const printDoc = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${calcInvoiceNo} — Flat ${calcFlat} Maintenance & TOI</title>
        <meta charset="utf-8" />
        <style>
          @page {
            size: A4 portrait;
            margin: 12mm;
          }
          * { box-sizing: border-box; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
            color: #0f172a;
            margin: 0;
            padding: 0;
            background: #ffffff;
            font-size: 11px;
            line-height: 1.45;
          }
          .invoice-page {
            padding: 24px 28px;
            max-width: 820px;
            margin: 0 auto;
            background: #fff;
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
          }
          .header {
            text-align: center;
            border-bottom: 2px solid #0b2b26;
            padding-bottom: 12px;
            margin-bottom: 14px;
          }
          .society-title {
            font-size: 16px;
            font-weight: 900;
            color: #0b2b26;
            letter-spacing: 0.5px;
          }
          .society-reg {
            font-size: 9.5px;
            color: #475569;
            margin-top: 3px;
          }
          .doc-badge {
            display: inline-block;
            margin-top: 8px;
            padding: 3px 14px;
            border-radius: 999px;
            background: #0b2b26;
            color: #ffffff;
            font-weight: 800;
            font-size: 10px;
            letter-spacing: 1px;
          }
          .ref-row {
            display: flex;
            justify-content: space-between;
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 6px;
            padding: 8px 12px;
            margin-bottom: 12px;
            font-size: 11px;
          }
          .recipient-box {
            border: 1px solid #cbd5e1;
            border-radius: 6px;
            padding: 10px 14px;
            margin-bottom: 12px;
            background: #ffffff;
          }
          .subject-line {
            font-size: 11px;
            font-weight: 700;
            color: #0b2b26;
            margin-bottom: 10px;
            padding: 4px 8px;
            background: #f1f5f9;
            border-left: 3px solid #0b2b26;
          }
          .dues-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 14px;
          }
          .dues-table th {
            background: #0b2b26;
            color: #ffffff;
            padding: 7px 10px;
            font-size: 10px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            border: 1px solid #0b2b26;
          }
          .dues-table td {
            padding: 7px 10px;
            border: 1px solid #e2e8f0;
            font-size: 11px;
          }
          .dues-table tr:nth-child(even) {
            background: #f8fafc;
          }
          .grand-total-row td {
            background: #0b2b26 !important;
            color: #ffffff !important;
            font-weight: 800;
            font-size: 12px;
            border-color: #0b2b26;
          }
          .bank-box {
            background: #f0fdf4;
            border: 1px solid #bbf7d0;
            border-radius: 6px;
            padding: 10px 14px;
            margin-bottom: 14px;
            font-size: 10.5px;
            color: #166534;
          }
          .signatures {
            display: flex;
            justify-content: space-between;
            margin-top: 32px;
            padding-top: 10px;
          }
          .sig-box {
            text-align: center;
            width: 28%;
          }
          .sig-line {
            border-top: 1px solid #0f172a;
            padding-top: 6px;
            font-size: 10px;
            font-weight: 700;
            color: #0f172a;
          }
          .stamp-box {
            border: 1px dashed #cbd5e1;
            height: 48px;
            border-radius: 4px;
            margin-bottom: 6px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #94a3b8;
            font-size: 9px;
          }
          .footer {
            margin-top: 16px;
            padding-top: 8px;
            border-top: 1px dashed #cbd5e1;
            font-size: 9px;
            color: #94a3b8;
            display: flex;
            justify-content: space-between;
          }
        </style>
      </head>
      <body>
        <div class="invoice-page">
          <div>
            <div class="header">
              <div class="society-title">MAJESTIQUE EURISKA 'A' BUILDING CO-OP HOUSING SOCIETY LTD.</div>
              <div class="society-reg">Reg. No: PNA/PNA (4)/HSG/(TC)/21207/2019-20 • S. No. 2, Plot No C-1, Village Mohammed Wadi, Taluka Haveli, Pune - 411060</div>
              <div class="doc-badge">${isInv ? 'MAINTENANCE & SUBSCRIPTION TAX INVOICE' : 'FORMAL DEMAND NOTICE'}</div>
            </div>

            <div class="ref-row">
              <div><strong>Invoice No:</strong> ${calcInvoiceNo}</div>
              <div><strong>Date:</strong> ${formatDisplayDate(calcInvoiceDate)}</div>
              <div><strong>Due Date:</strong> <span style="color: #b91c1c; font-weight: 700;">${formatDisplayDate(calcDueDate)}</span></div>
            </div>

            <div class="recipient-box">
              <div style="font-size: 10px; text-transform: uppercase; color: #64748b; font-weight: 700;">Billed To / Flat Member:</div>
              <div style="font-size: 14px; font-weight: 800; color: #0b2b26; margin: 2px 0;">Flat ${calcFlat}</div>
              <div style="font-size: 11px; color: #475569;">${calcFlatSubtext}</div>
            </div>

            <div class="subject-line">
              <strong>SUBJECT:</strong> DEMAND &amp; BILLING FOR MAINTENANCE, SINKING FUND &amp; TIMES OF INDIA SUBSCRIPTION (${startLbl} – ${endLbl}, ${calcMonthsCount} MONTHS)
            </div>

            <table class="dues-table">
              <thead>
                <tr>
                  <th style="width: 40px; text-align: center;">#</th>
                  <th>Particulars / Dues Head</th>
                  <th style="width: 130px; text-align: center;">Billing Period</th>
                  <th style="width: 70px; text-align: center;">Months</th>
                  <th style="width: 90px; text-align: center;">Rate / Mo</th>
                  <th style="width: 120px; text-align: right;">Amount (₹)</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style="text-align: center; color: #64748b;">1</td>
                  <td style="font-weight: 600; color: #0f172a;">Flat Maintenance Charges</td>
                  <td style="text-align: center; color: #475569;">${startLbl} – ${endLbl}</td>
                  <td style="text-align: center; font-weight: 700;">${calcMonthsCount} mos</td>
                  <td style="text-align: center; font-weight: 600;">₹${formatValue(calcMaintenanceRate)}</td>
                  <td style="text-align: right; font-weight: 700; font-family: monospace;">₹${formatValue(calcMaintenanceTotal)}</td>
                </tr>
                <tr>
                  <td style="text-align: center; color: #64748b;">2</td>
                  <td style="font-weight: 600; color: #0f172a;">Sinking Fund Contribution</td>
                  <td style="text-align: center; color: #475569;">${startLbl} – ${endLbl}</td>
                  <td style="text-align: center; font-weight: 700;">${calcMonthsCount} mos</td>
                  <td style="text-align: center; font-weight: 600;">₹${formatValue(calcSinkingFundRate)}</td>
                  <td style="text-align: right; font-weight: 700; font-family: monospace;">₹${formatValue(calcSinkingFundTotal)}</td>
                </tr>
                <tr style="background: #f8fafc; font-weight: 700;">
                  <td colspan="3" style="text-align: right; color: #196c6c;">Base Society Maintenance Subtotal:</td>
                  <td style="text-align: center; color: #196c6c;">${calcMonthsCount} mos</td>
                  <td style="text-align: center; color: #196c6c;">₹${formatValue(Number(calcMaintenanceRate) + Number(calcSinkingFundRate))}</td>
                  <td style="text-align: right; font-family: monospace; color: #196c6c;">₹${formatValue(calcBaseTotal)}</td>
                </tr>
                ${calcIncludeEarlierPending ? `
                  <tr style="background: #fff7ed;">
                    <td style="text-align: center; color: #c2410c; font-weight: 700;">3</td>
                    <td style="font-weight: 600; color: #c2410c;">Earlier Pending Maintenance Arrears (Oct 2024 – Mar 2025)</td>
                    <td style="text-align: center; color: #c2410c;">Oct 2024 – Mar 2025</td>
                    <td style="text-align: center; font-weight: 700; color: #c2410c;">6 mos</td>
                    <td style="text-align: center; font-weight: 600; color: #c2410c;">₹2,100</td>
                    <td style="text-align: right; font-weight: 700; font-family: monospace; color: #c2410c;">₹12,600</td>
                  </tr>
                  <tr style="background: #fff7ed;">
                    <td style="text-align: center; color: #c2410c; font-weight: 700;">4</td>
                    <td style="font-weight: 600; color: #c2410c;">Earlier Pending Sinking Fund Arrears (Oct 2024 – Mar 2025)</td>
                    <td style="text-align: center; color: #c2410c;">Oct 2024 – Mar 2025</td>
                    <td style="text-align: center; font-weight: 700; color: #c2410c;">6 mos</td>
                    <td style="text-align: center; font-weight: 600; color: #c2410c;">₹100</td>
                    <td style="text-align: right; font-weight: 700; font-family: monospace; color: #c2410c;">₹600</td>
                  </tr>
                ` : ''}
                ${calcIncludeToi ? `
                  <tr>
                    <td style="text-align: center; color: #64748b;">${calcIncludeEarlierPending ? '5' : '3'}</td>
                    <td style="font-weight: 600; color: #0f172a;">Times of India (TOI) Newspaper Subscription</td>
                    <td style="text-align: center; color: #475569;">${startLbl} – ${endLbl}</td>
                    <td style="text-align: center; font-weight: 700;">${calcMonthsCount} mos</td>
                    <td style="text-align: center; font-weight: 600;">${calcCustomToiRate ? `₹${formatValue(calcCustomToiRate)}` : 'As per Slabs'}</td>
                    <td style="text-align: right; font-weight: 700; font-family: monospace;">₹${formatValue(calcToiTotal)}</td>
                  </tr>
                ` : ''}
                <tr class="grand-total-row">
                  <td colspan="5" style="text-align: right; letter-spacing: 0.5px;">TOTAL NET PAYABLE (${calcMonthsCount} MONTHS):</td>
                  <td style="text-align: right; font-family: monospace; font-size: 13px;">₹${formatValue(calcGrandTotal)}</td>
                </tr>
              </tbody>
            </table>

            <div class="bank-box">
              <div style="font-weight: 800; margin-bottom: 4px; font-size: 11px;">🏦 SOCIETY REMITTANCE BANK ACCOUNT (NEFT / RTGS / IMPS):</div>
              <div>• <strong>Account Name:</strong> MAJESTIQUE EURISKA A BLDG SA GRU SAN MAR</div>
              <div>• <strong>Bank Name:</strong> HDFC Bank • <strong>Account Number:</strong> 50200075533530 • <strong>IFSC:</strong> HDFC0002454</div>
              <div>• <strong>Branch:</strong> Budhrani Boulevard, Undri NIBM Rd, Mohammedwadi, Pune - 411060</div>
            </div>

            <div style="font-size: 10px; color: #475569; background: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 6px; padding: 8px 12px; margin-bottom: 12px;">
              <strong>Terms &amp; Instructions:</strong> ${calcNotes}
            </div>
          </div>

          <div>
            <div class="signatures">
              <div class="sig-box">
                <div class="stamp-box">Official Society Seal</div>
                <div class="sig-line">Prepared By (Estate Office)</div>
              </div>
              <div class="sig-box">
                <div class="stamp-box">Verified</div>
                <div class="sig-line">Hon. Secretary</div>
              </div>
              <div class="sig-box">
                <div class="stamp-box">Approved</div>
                <div class="sig-line">Hon. Treasurer / Chairman</div>
              </div>
            </div>

            <div class="footer">
              <div>Majestique Euriska 'A' Building Co-Op Housing Society Ltd. • System Generated Invoice</div>
              <div>Generated: ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
            </div>
          </div>
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
  };

  // ─── 1B. Combined 3-Flats Maintenance Bill State (A-302, A-904, A-1002 — ₹67,200) ───
  const [combInvoiceNo, setCombInvoiceNo] = useState(() => `INV-ME/COMB-3FLATS/2026-27/${Math.floor(1000 + Math.random() * 9000)}`);
  const [combInvoiceDate, setCombInvoiceDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });
  const [combDueDate, setCombDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });
  const [combFlats, setCombFlats] = useState([
    {
      id: 'A-302',
      flatNo: 'A-302',
      period: 'Oct 2026 – Mar 2027 (6 Mos)',
      months: 6,
      maintenanceRate: 2850,
      maintenance: 17100,
      sinkingFundRate: 150,
      sinkingFund: 900,
      hasEarlierPending: false,
      earlierPending: 0,
      total: 18000
    },
    {
      id: 'A-904',
      flatNo: 'A-904',
      period: 'Oct 2026 – Mar 2027 (6 Mos)',
      months: 6,
      maintenanceRate: 2850,
      maintenance: 17100,
      sinkingFundRate: 150,
      sinkingFund: 900,
      hasEarlierPending: false,
      earlierPending: 0,
      total: 18000
    },
    {
      id: 'A-1002',
      flatNo: 'A-1002',
      period: 'Oct 2026 – Mar 2027 (6 Mos)',
      months: 6,
      maintenanceRate: 2850,
      maintenance: 17100,
      sinkingFundRate: 150,
      sinkingFund: 900,
      hasEarlierPending: true,
      earlierPeriod: 'Oct 2024 – Mar 2025 (6 Mos)',
      earlierMonths: 6,
      earlierMaintenanceRate: 2100,
      earlierMaintenance: 12600,
      earlierSinkingFundRate: 100,
      earlierSinkingFund: 600,
      earlierPending: 13200,
      total: 31200
    }
  ]);
  const [combNotes, setCombNotes] = useState('I have attached the combined maintenance bill PDF along with the cancelled cheque for your reference and payment processing. Kindly verify the details and arrange the payment of ₹67,200. Please share the payment confirmation/UTR once completed.');
  const [combToast, setCombToast] = useState('');

  const combGrandTotal = useMemo(() => {
    return combFlats.reduce((sum, f) => sum + (Number(f.total) || 0), 0);
  }, [combFlats]);

  const generateCombWhatsAppMessage = useCallback(() => {
    return `🏛️ *MAJESTIQUE EURISKA 'A' CO-OP HOUSING SOCIETY LTD.*
📄 *COMBINED MAINTENANCE & DUES BILL (FLATS A-302, A-904, A-1002)*
───────────────────────────
📌 *Ref No:* ${combInvoiceNo}
📅 *Date:* ${formatDisplayDate(combInvoiceDate)}
⏰ *Payment Due Date:* ${formatDisplayDate(combDueDate)}

*FLAT DUES SUMMARY:*
• *A-302:* ₹18,000 – Maintenance ₹17,100 + Sinking Fund ₹900
• *A-904:* ₹18,000 – Maintenance ₹17,100 + Sinking Fund ₹900
• *A-1002:* ₹31,200 – Earlier pending amount ₹13,200 + Current maintenance ₹18,000

*A-1002 Earlier Pending Amount (Oct 2024 – Mar 2025):*
• Maintenance: ₹2,100 × 6 = ₹12,600
• Sinking Fund: ₹100 × 6 = ₹600
• Total Arrears: *₹13,200*

*Current Maintenance (Oct 2026 – Mar 2027):*
• Maintenance: ₹2,850 × 6 = ₹17,100
• Sinking Fund: ₹150 × 6 = ₹900
• Total Current: *₹18,000*

💰 *Total payable for all three flats: ₹${formatValue(combGrandTotal)}*
───────────────────────────
🏦 *Bank Account Details for Payment:*
• *Account Name:* Majestique Euriska 'A' Building CO OP Society LTD
• *Bank:* HDFC Bank
• *Branch:* Undri Branch
• *Account Type:* Current Account
• *Account No.:* 50200075533530
• *IFSC Code:* HDFC0002454

${combNotes}

Thanks & Regards,
*A Building Committee*`;
  }, [combInvoiceNo, combInvoiceDate, combDueDate, combGrandTotal, combNotes]);

  const handleShareCombWhatsApp = () => {
    const text = encodeURIComponent(generateCombWhatsAppMessage());
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  const handleCopyCombText = () => {
    navigator.clipboard.writeText(generateCombWhatsAppMessage()).then(() => {
      setCombToast('✓ Combined 3-Flats notice copied to clipboard!');
      setTimeout(() => setCombToast(''), 3000);
    });
  };

  const handleCopyBankDetails = () => {
    const text = `Bank Account Details for Payment
Account Name: Majestique Euriska 'A' Building CO OP Society LTD
Bank: HDFC Bank
Branch: Undri Branch
Account Type: Current Account
Account No.: 50200075533530
IFSC Code: HDFC0002454`;
    navigator.clipboard.writeText(text).then(() => {
      setCombToast('✓ Bank account details copied to clipboard!');
      setTimeout(() => setCombToast(''), 3000);
    });
  };

  const handlePrintCombInvoice = () => {
    const printDoc = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${combInvoiceNo} — Combined Maintenance Bill (A-302, A-904, A-1002)</title>
        <meta charset="utf-8" />
        <style>
          @page { size: A4 portrait; margin: 12mm; }
          * { box-sizing: border-box; }
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; color: #0f172a; margin: 0; padding: 0; background: #fff; font-size: 11px; line-height: 1.45; }
          .invoice-page { padding: 24px 28px; max-width: 820px; margin: 0 auto; background: #fff; min-height: 100vh; display: flex; flex-direction: column; justify-content: space-between; }
          .header { text-align: center; border-bottom: 2px solid #0b2b26; padding-bottom: 12px; margin-bottom: 14px; }
          .society-title { font-size: 16px; font-weight: 900; color: #0b2b26; letter-spacing: 0.5px; }
          .society-reg { font-size: 9.5px; color: #475569; margin-top: 3px; }
          .doc-badge { display: inline-block; margin-top: 8px; padding: 3px 14px; border-radius: 999px; background: #0b2b26; color: #C49B4F; font-weight: 800; font-size: 10px; letter-spacing: 1px; }
          .ref-row { display: flex; justify-content: space-between; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 8px 12px; margin-bottom: 12px; font-size: 11px; }
          .recipient-box { border: 1px solid #cbd5e1; border-radius: 6px; padding: 10px 14px; margin-bottom: 12px; background: #ffffff; }
          .subject-line { font-size: 11px; font-weight: 700; color: #0b2b26; margin-bottom: 10px; padding: 4px 8px; background: #f1f5f9; border-left: 3px solid #0b2b26; }
          .dues-table { width: 100%; border-collapse: collapse; margin-bottom: 14px; }
          .dues-table th { background: #0b2b26; color: #ffffff; padding: 7px 10px; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; border: 1px solid #0b2b26; }
          .dues-table td { padding: 7px 10px; border: 1px solid #e2e8f0; font-size: 11px; }
          .dues-table tr:nth-child(even) { background: #f8fafc; }
          .subtotal-row td { background: #f1f5f9 !important; font-weight: 700; color: #0b2b26; }
          .grand-total-row td { background: #0b2b26 !important; color: #ffffff !important; font-weight: 900; font-size: 13px; border-color: #0b2b26; }
          .bank-box { background: #f0fdf4; border: 1.5px solid #86efac; border-radius: 6px; padding: 10px 14px; margin-bottom: 12px; font-size: 11px; color: #166534; }
          .signatures { display: flex; justify-content: space-between; margin-top: 28px; padding-top: 10px; }
          .sig-box { text-align: center; width: 28%; }
          .sig-line { border-top: 1px solid #0f172a; padding-top: 6px; font-size: 10px; font-weight: 700; color: #0f172a; }
          .stamp-box { border: 1px dashed #cbd5e1; height: 44px; display: flex; align-items: center; justify-content: center; font-size: 9px; color: #94a3b8; text-transform: uppercase; margin-bottom: 6px; }
          .footer { border-top: 1px solid #e2e8f0; padding-top: 8px; font-size: 9.5px; color: #64748b; display: flex; justify-content: space-between; }
        </style>
      </head>
      <body>
        <div class="invoice-page">
          <div>
            <div class="header">
              <div class="society-title">MAJESTIQUE EURISKA 'A' BUILDING CO-OP HOUSING SOCIETY LTD.</div>
              <div class="society-reg">Reg. No: PNA/PNA (4)/HSG/(TC)/21207/2019-20 • Mohammed Wadi, Pune - 411060</div>
              <div class="doc-badge">COMBINED SOCIETY MAINTENANCE &amp; ARREARS DEMAND BILL</div>
            </div>

            <div class="ref-row">
              <div><strong>Bill Reference:</strong> ${combInvoiceNo}</div>
              <div><strong>Bill Date:</strong> ${formatDisplayDate(combInvoiceDate)}</div>
              <div><strong>Payment Due Date:</strong> <span style="color: #b91c1c; font-weight: 800;">${formatDisplayDate(combDueDate)}</span></div>
            </div>

            <div class="recipient-box">
              <div style="font-size: 10px; text-transform: uppercase; color: #64748b; font-weight: 700; margin-bottom: 2px;">BILLED TO / OCCUPANTS:</div>
              <div style="font-size: 14px; font-weight: 800; color: #0b2b26;">Flats A-302, A-904 &amp; A-1002 Members</div>
              <div style="font-size: 11px; color: #475569;">Majestique Euriska 'A' Building, S. No. 2, Plot C-1, Mohammed Wadi, Pune - 411060</div>
            </div>

            <div class="subject-line">
              SUBJECT: COMBINED DEMAND NOTICE FOR CURRENT SOCIETY MAINTENANCE (OCT 2026 – MAR 2027) &amp; ARREARS DUES
            </div>

            <table class="dues-table">
              <thead>
                <tr>
                  <th style="width: 75px; text-align: center;">Flat No</th>
                  <th>Dues Description &amp; Particulars</th>
                  <th style="text-align: center; width: 140px;">Billing Period</th>
                  <th style="text-align: center; width: 75px;">Months</th>
                  <th style="text-align: center; width: 95px;">Rate / Mo</th>
                  <th style="text-align: right; width: 105px;">Amount (₹)</th>
                </tr>
              </thead>
              <tbody>
                <!-- Flat A-302 -->
                <tr>
                  <td rowspan="2" style="text-align: center; font-weight: 800; background: #fff; vertical-align: middle; border-bottom: 2px solid #cbd5e1;">A-302</td>
                  <td>Flat Maintenance Charges</td>
                  <td style="text-align: center; color: #475569;">Oct 2026 – Mar 2027</td>
                  <td style="text-align: center; font-weight: 700;">6 mos</td>
                  <td style="text-align: center;">₹2,850</td>
                  <td style="text-align: right; font-weight: 700; font-family: monospace;">₹17,100</td>
                </tr>
                <tr>
                  <td>Sinking Fund Contribution</td>
                  <td style="text-align: center; color: #475569;">Oct 2026 – Mar 2027</td>
                  <td style="text-align: center; font-weight: 700;">6 mos</td>
                  <td style="text-align: center;">₹150</td>
                  <td style="text-align: right; font-weight: 700; font-family: monospace;">₹900</td>
                </tr>
                <tr class="subtotal-row" style="border-bottom: 2px solid #94a3b8;">
                  <td colspan="5" style="text-align: right;">↳ Flat A-302 Subtotal Payable:</td>
                  <td style="text-align: right; font-family: monospace; font-size: 11.5px;">₹18,000</td>
                </tr>

                <!-- Flat A-904 -->
                <tr>
                  <td rowspan="2" style="text-align: center; font-weight: 800; background: #fff; vertical-align: middle; border-bottom: 2px solid #cbd5e1;">A-904</td>
                  <td>Flat Maintenance Charges</td>
                  <td style="text-align: center; color: #475569;">Oct 2026 – Mar 2027</td>
                  <td style="text-align: center; font-weight: 700;">6 mos</td>
                  <td style="text-align: center;">₹2,850</td>
                  <td style="text-align: right; font-weight: 700; font-family: monospace;">₹17,100</td>
                </tr>
                <tr>
                  <td>Sinking Fund Contribution</td>
                  <td style="text-align: center; color: #475569;">Oct 2026 – Mar 2027</td>
                  <td style="text-align: center; font-weight: 700;">6 mos</td>
                  <td style="text-align: center;">₹150</td>
                  <td style="text-align: right; font-weight: 700; font-family: monospace;">₹900</td>
                </tr>
                <tr class="subtotal-row" style="border-bottom: 2px solid #94a3b8;">
                  <td colspan="5" style="text-align: right;">↳ Flat A-904 Subtotal Payable:</td>
                  <td style="text-align: right; font-family: monospace; font-size: 11.5px;">₹18,000</td>
                </tr>

                <!-- Flat A-1002 -->
                <tr>
                  <td rowspan="4" style="text-align: center; font-weight: 800; background: #fff; vertical-align: middle; border-bottom: 2px solid #cbd5e1;">A-1002</td>
                  <td><strong>Earlier Pending:</strong> Maintenance Arrears</td>
                  <td style="text-align: center; color: #b45309; font-weight: 600;">Oct 2024 – Mar 2025</td>
                  <td style="text-align: center; font-weight: 700;">6 mos</td>
                  <td style="text-align: center;">₹2,100</td>
                  <td style="text-align: right; font-weight: 700; font-family: monospace; color: #b45309;">₹12,600</td>
                </tr>
                <tr>
                  <td><strong>Earlier Pending:</strong> Sinking Fund Arrears</td>
                  <td style="text-align: center; color: #b45309; font-weight: 600;">Oct 2024 – Mar 2025</td>
                  <td style="text-align: center; font-weight: 700;">6 mos</td>
                  <td style="text-align: center;">₹100</td>
                  <td style="text-align: right; font-weight: 700; font-family: monospace; color: #b45309;">₹600</td>
                </tr>
                <tr>
                  <td>Current Flat Maintenance Charges</td>
                  <td style="text-align: center; color: #475569;">Oct 2026 – Mar 2027</td>
                  <td style="text-align: center; font-weight: 700;">6 mos</td>
                  <td style="text-align: center;">₹2,850</td>
                  <td style="text-align: right; font-weight: 700; font-family: monospace;">₹17,100</td>
                </tr>
                <tr>
                  <td>Current Sinking Fund Contribution</td>
                  <td style="text-align: center; color: #475569;">Oct 2026 – Mar 2027</td>
                  <td style="text-align: center; font-weight: 700;">6 mos</td>
                  <td style="text-align: center;">₹150</td>
                  <td style="text-align: right; font-weight: 700; font-family: monospace;">₹900</td>
                </tr>
                <tr class="subtotal-row" style="border-bottom: 2px solid #94a3b8;">
                  <td colspan="5" style="text-align: right;">↳ Flat A-1002 Subtotal Payable (Arrears ₹13,200 + Current ₹18,000):</td>
                  <td style="text-align: right; font-family: monospace; font-size: 11.5px;">₹31,200</td>
                </tr>

                <!-- Grand Total -->
                <tr class="grand-total-row">
                  <td colspan="5" style="text-align: right; letter-spacing: 0.5px;">TOTAL COMBINED PAYABLE (ALL THREE FLATS):</td>
                  <td style="text-align: right; font-family: monospace; font-size: 14px; color: #4ade80;">₹${formatValue(combGrandTotal)}</td>
                </tr>
              </tbody>
            </table>

            <div class="bank-box">
              <div style="font-weight: 800; margin-bottom: 4px; font-size: 11.5px;">🏦 SOCIETY BANK ACCOUNT DETAILS FOR PAYMENT REMITTANCE:</div>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px;">
                <div>• <strong>Account Name:</strong> Majestique Euriska 'A' Building CO OP Society LTD</div>
                <div>• <strong>Bank Name:</strong> HDFC Bank</div>
                <div>• <strong>Account Number:</strong> 50200075533530</div>
                <div>• <strong>Account Type:</strong> Current Account</div>
                <div>• <strong>IFSC Code:</strong> HDFC0002454</div>
                <div>• <strong>Branch:</strong> Undri Branch, Pune</div>
              </div>
            </div>

            <div style="font-size: 10.5px; color: #475569; background: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 6px; padding: 10px 14px; margin-bottom: 12px; line-height: 1.5;">
              <strong>Committee Instructions &amp; Attachments:</strong><br/>
              ${combNotes}
            </div>
          </div>

          <div>
            <div class="signatures">
              <div class="sig-box">
                <div class="stamp-box">Official Society Seal</div>
                <div class="sig-line">Prepared By (Estate Office)</div>
              </div>
              <div class="sig-box">
                <div class="stamp-box">Verified</div>
                <div class="sig-line">Hon. Secretary</div>
              </div>
              <div class="sig-box">
                <div class="stamp-box">Approved</div>
                <div class="sig-line">Hon. Treasurer / Chairman</div>
              </div>
            </div>

            <div class="footer">
              <div>Majestique Euriska 'A' Building Co-Op Housing Society Ltd. • Official Document</div>
              <div>Generated: ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
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

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printDoc);
      printWindow.document.close();
    }
  };

  // ─── 2. Custom Invoice Generator State ───
  const [customDocType, setCustomDocType] = useState('invoice'); // 'invoice' | 'notice'
  const [customRecipientName, setCustomRecipientName] = useState('Flat A-302');
  const [customRecipientSubtext, setCustomRecipientSubtext] = useState('Majestique Euriska A Building, Mohammed Wadi, Pune - 411060');
  const [customSubject, setCustomSubject] = useState('Society Dues / Service Charges Settlement');
  const [customInvoiceNo, setCustomInvoiceNo] = useState(() => `INV-ME/${new Date().getFullYear()}/${Math.floor(1000 + Math.random() * 9000)}`);
  const [customDate, setCustomDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });
  const [customDueDate, setCustomDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });
  const [customItems, setCustomItems] = useState([
    { id: 1, description: 'Maintenance Charges', period: 'Current Period', amount: 2850 },
    { id: 2, description: 'Sinking Fund', period: 'Current Period', amount: 150 },
  ]);
  const [customNotes, setCustomNotes] = useState('Payment is requested within 7 days of invoice issuance. Cheques payable to "MAJESTIQUE EURISKA A BLDG SA GRU SAN MAR".');
  const [customToast, setCustomToast] = useState('');

  const customTotalAmount = useMemo(() => {
    return customItems.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  }, [customItems]);

  const handleAddCustomItem = () => {
    setCustomItems(prev => [
      ...prev,
      { id: Date.now(), description: 'New Line Item', period: 'Current', amount: 1000 }
    ]);
  };

  const handleRemoveCustomItem = (id) => {
    if (customItems.length <= 1) return;
    setCustomItems(prev => prev.filter(item => item.id !== id));
  };

  const handleUpdateCustomItem = (id, field, value) => {
    setCustomItems(prev => prev.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  // Generate WhatsApp Message for Custom Invoice
  const generateCustomWhatsAppMessage = useCallback(() => {
    const isInv = customDocType === 'invoice';
    const lines = [
      `🏛️ *MAJESTIQUE EURISKA 'A' CO-OP HOUSING SOCIETY LTD.*`,
      `📄 *${isInv ? 'TAX INVOICE / BILL' : 'DEMAND NOTICE & DUES INTIMATION'}*`,
      `───────────────────────────`,
      `📌 *Ref No:* ${customInvoiceNo}`,
      `📅 *Date:* ${formatDisplayDate(customDate)}`,
      `⏰ *Due Date:* ${formatDisplayDate(customDueDate)}`,
      `👤 *Billed To:* ${customRecipientName}`,
      `📋 *Subject:* ${customSubject}`,
      ``,
      `*BILL PARTICULARS:*`,
      ...customItems.map((item, idx) => `${idx + 1}. ${item.description} (${item.period}): *₹${formatValue(item.amount)}*`),
      ``,
      `💰 *TOTAL AMOUNT PAYABLE:* *₹${formatValue(customTotalAmount)}*`,
      `───────────────────────────`,
      `🏦 *SOCIETY BANK REMITTANCE INFO:*`,
      `• *Bank:* HDFC Bank`,
      `• *Account Name:* MAJESTIQUE EURISKA A BLDG SA GRU SAN MAR`,
      `• *A/C No:* 50200075533530`,
      `• *IFSC Code:* HDFC0002454`,
      `• *Account Type:* CA-INSTITUTION (Current Account)`,
      `• *Branch:* Undri / NIBM Road, Mohammedwadi, Pune - 411060`,
      ``,
      `💬 *Note:* ${customNotes}`,
      `_Please share UTR / payment confirmation screenshot after remittance._`
    ];
    return lines.join('\n');
  }, [customDocType, customInvoiceNo, customDate, customDueDate, customRecipientName, customSubject, customItems, customTotalAmount, customNotes]);

  const handleShareCustomWhatsApp = () => {
    const text = encodeURIComponent(generateCustomWhatsAppMessage());
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  const handleCopyCustomText = () => {
    navigator.clipboard.writeText(generateCustomWhatsAppMessage()).then(() => {
      setCustomToast('✓ Invoice text copied to clipboard!');
      setTimeout(() => setCustomToast(''), 3000);
    });
  };

  const handlePrintCustomInvoice = () => {
    const isInv = customDocType === 'invoice';
    const printDoc = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${customInvoiceNo} — ${customRecipientName}</title>
        <meta charset="utf-8" />
        <style>
          @page {
            size: A4 portrait;
            margin: 12mm;
          }
          * { box-sizing: border-box; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
            color: #0f172a;
            margin: 0;
            padding: 0;
            background: #ffffff;
            font-size: 11px;
            line-height: 1.45;
          }
          .invoice-page {
            padding: 24px 28px;
            max-width: 820px;
            margin: 0 auto;
            background: #fff;
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
          }
          .header {
            text-align: center;
            border-bottom: 2px solid #0b2b26;
            padding-bottom: 12px;
            margin-bottom: 14px;
          }
          .society-title {
            font-size: 16px;
            font-weight: 900;
            color: #0b2b26;
            letter-spacing: 0.5px;
          }
          .society-reg {
            font-size: 9.5px;
            color: #475569;
            margin-top: 3px;
          }
          .doc-badge {
            display: inline-block;
            margin-top: 8px;
            padding: 3px 14px;
            border-radius: 999px;
            background: #0b2b26;
            color: #ffffff;
            font-weight: 800;
            font-size: 10px;
            letter-spacing: 1px;
          }
          .ref-row {
            display: flex;
            justify-content: space-between;
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 6px;
            padding: 8px 12px;
            margin-bottom: 12px;
            font-size: 11px;
          }
          .recipient-box {
            border: 1px solid #cbd5e1;
            border-radius: 6px;
            padding: 10px 14px;
            margin-bottom: 12px;
            background: #ffffff;
          }
          .subject-line {
            font-size: 11px;
            font-weight: 700;
            color: #0b2b26;
            margin-bottom: 10px;
            padding: 4px 8px;
            background: #f1f5f9;
            border-left: 3px solid #0b2b26;
          }
          .dues-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 14px;
          }
          .dues-table th {
            background: #0b2b26;
            color: #ffffff;
            padding: 7px 10px;
            font-size: 10px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            border: 1px solid #0b2b26;
          }
          .dues-table td {
            padding: 7px 10px;
            border: 1px solid #e2e8f0;
            font-size: 11px;
          }
          .dues-table tr:nth-child(even) {
            background: #f8fafc;
          }
          .grand-total-row td {
            background: #0b2b26 !important;
            color: #ffffff !important;
            font-weight: 800;
            font-size: 12px;
            border-color: #0b2b26;
          }
          .bank-box {
            background: #f0fdf4;
            border: 1px solid #bbf7d0;
            border-radius: 6px;
            padding: 10px 14px;
            margin-bottom: 14px;
            font-size: 10.5px;
            color: #166534;
          }
          .signatures {
            display: flex;
            justify-content: space-between;
            margin-top: 32px;
            padding-top: 10px;
          }
          .sig-box {
            text-align: center;
            width: 28%;
          }
          .sig-line {
            border-top: 1px solid #0f172a;
            padding-top: 6px;
            font-size: 10px;
            font-weight: 700;
            color: #0f172a;
          }
          .stamp-box {
            border: 1px dashed #cbd5e1;
            height: 48px;
            border-radius: 4px;
            margin-bottom: 6px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #94a3b8;
            font-size: 9px;
          }
          .footer {
            margin-top: 16px;
            padding-top: 8px;
            border-top: 1px dashed #cbd5e1;
            font-size: 9px;
            color: #94a3b8;
            display: flex;
            justify-content: space-between;
          }
        </style>
      </head>
      <body>
        <div class="invoice-page">
          <div>
            <div class="header">
              <div class="society-title">MAJESTIQUE EURISKA 'A' BUILDING CO-OP HOUSING SOCIETY LTD.</div>
              <div class="society-reg">Reg. No: PNA/PNA (4)/HSG/(TC)/21207/2019-20 • S. No. 2, Plot No C-1, Village Mohammed Wadi, Taluka Haveli, Pune - 411060</div>
              <div class="doc-badge">${isInv ? 'OFFICIAL TAX INVOICE' : 'FORMAL DEMAND NOTICE'}</div>
            </div>

            <div class="ref-row">
              <div><strong>Invoice / Notice No:</strong> ${customInvoiceNo}</div>
              <div><strong>Date of Issue:</strong> ${formatDisplayDate(customDate)}</div>
              <div><strong>Due Date:</strong> <span style="color: #b91c1c; font-weight: 700;">${formatDisplayDate(customDueDate)}</span></div>
            </div>

            <div class="recipient-box">
              <div style="font-size: 10px; text-transform: uppercase; color: #64748b; font-weight: 700;">Billed To / Addressee:</div>
              <div style="font-size: 14px; font-weight: 800; color: #0b2b26; margin: 2px 0;">${customRecipientName}</div>
              <div style="font-size: 11px; color: #475569;">${customRecipientSubtext}</div>
            </div>

            <div class="subject-line">
              <strong>SUBJECT:</strong> ${customSubject.toUpperCase()}
            </div>

            <table class="dues-table">
              <thead>
                <tr>
                  <th style="width: 40px; text-align: center;">#</th>
                  <th>Description / Particulars</th>
                  <th style="width: 140px; text-align: center;">Period / Reference</th>
                  <th style="width: 130px; text-align: right;">Amount (₹)</th>
                </tr>
              </thead>
              <tbody>
                ${customItems.map((item, idx) => `
                  <tr>
                    <td style="text-align: center; color: #64748b;">${idx + 1}</td>
                    <td style="font-weight: 600; color: #0f172a;">${item.description}</td>
                    <td style="text-align: center; color: #475569;">${item.period}</td>
                    <td style="text-align: right; font-weight: 700; font-family: monospace;">₹${formatValue(item.amount)}</td>
                  </tr>
                `).join('')}
                <tr class="grand-total-row">
                  <td colspan="3" style="text-align: right; letter-spacing: 0.5px;">TOTAL NET PAYABLE:</td>
                  <td style="text-align: right; font-family: monospace; font-size: 13px;">₹${formatValue(customTotalAmount)}</td>
                </tr>
              </tbody>
            </table>

            <div class="bank-box">
              <div style="font-weight: 800; margin-bottom: 4px; font-size: 11px;">🏦 SOCIETY REMITTANCE BANK ACCOUNT (NEFT / RTGS / IMPS):</div>
              <div>• <strong>Account Name:</strong> MAJESTIQUE EURISKA A BLDG SA GRU SAN MAR</div>
              <div>• <strong>Bank Name:</strong> HDFC Bank • <strong>Account Number:</strong> 50200075533530 • <strong>IFSC:</strong> HDFC0002454</div>
              <div>• <strong>Branch:</strong> Budhrani Boulevard, Undri NIBM Rd, Mohammedwadi, Pune - 411060</div>
            </div>

            <div style="font-size: 10px; color: #475569; background: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 6px; padding: 8px 12px; margin-bottom: 12px;">
              <strong>Terms &amp; Instructions:</strong> ${customNotes}
            </div>
          </div>

          <div>
            <div class="signatures">
              <div class="sig-box">
                <div class="stamp-box">Official Society Seal</div>
                <div class="sig-line">Prepared By (Estate Office)</div>
              </div>
              <div class="sig-box">
                <div class="stamp-box">Verified</div>
                <div class="sig-line">Hon. Secretary</div>
              </div>
              <div class="sig-box">
                <div class="stamp-box">Approved</div>
                <div class="sig-line">Hon. Treasurer / Chairman</div>
              </div>
            </div>

            <div class="footer">
              <div>Majestique Euriska 'A' Building Co-Op Housing Society Ltd. • System Generated Invoice</div>
              <div>Generated: ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
            </div>
          </div>
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
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, fontFamily: 'Inter, system-ui, sans-serif' }}>
      
      {/* ── Executive Hero Banner ── */}
      <div style={{
        background: 'linear-gradient(135deg, #0b2b26 0%, #134e44 60%, #196c6c 100%)',
        borderRadius: 20,
        padding: '24px 28px',
        color: '#fff',
        boxShadow: '0 8px 32px rgba(11,43,38,0.25)',
        display: 'flex',
        flexDirection: 'column',
        gap: 18,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 999, background: 'rgba(196, 155, 79, 0.2)', border: '1px solid rgba(196, 155, 79, 0.4)', marginBottom: 8 }}>
              <span style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#fef08a' }}>
                🏛️ Society Billing &amp; Invoicing Center
              </span>
            </div>
            <h2 style={{ margin: '2px 0 6px', fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.01em' }}>
              🧾 Common Invoice &amp; Demand Notice Hub
            </h2>
            <p style={{ margin: 0, color: 'rgba(255, 255, 255, 0.8)', fontSize: '0.88rem', lineHeight: 1.4 }}>
              Select month range (Start Month &amp; End Month) to auto-calculate <strong>Maintenance (₹2,850/mo)</strong> + <strong>Sinking Fund (₹150/mo)</strong> and <strong>Times of India (TOI)</strong> subscriptions.
            </p>
          </div>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ background: 'rgba(255, 255, 255, 0.08)', border: '1px solid rgba(255, 255, 255, 0.18)', borderRadius: 12, padding: '10px 16px', minWidth: 160, textAlign: 'center' }}>
              <div style={{ fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'rgba(255, 255, 255, 0.7)', fontWeight: 700 }}>Base Tariff</div>
              <div style={{ fontSize: '1.05rem', fontWeight: 900, color: '#fde047', marginTop: 2 }}>₹3,000 / mo</div>
              <div style={{ fontSize: '0.68rem', color: 'rgba(255, 255, 255, 0.75)' }}>Maint ₹2,850 + Sinking ₹150</div>
            </div>
            <div style={{ background: 'rgba(255, 255, 255, 0.08)', border: '1px solid rgba(255, 255, 255, 0.18)', borderRadius: 12, padding: '10px 16px', minWidth: 140, textAlign: 'center' }}>
              <div style={{ fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'rgba(255, 255, 255, 0.7)', fontWeight: 700 }}>Remittance Bank</div>
              <div style={{ fontSize: '0.95rem', fontWeight: 900, color: '#6ee7b7', marginTop: 2 }}>HDFC Bank</div>
              <div style={{ fontSize: '0.66rem', color: 'rgba(255, 255, 255, 0.65)' }}>A/C 50200075533530</div>
            </div>
          </div>
        </div>

        {/* Category Switcher Tabs */}
        <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.14)', paddingTop: 14, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {[
            { id: 'combined_3flats', label: '🏢 Combined 3-Flats Bill (₹67,200)', emoji: '🏛️' },
            { id: 'month_range', label: '📅 Month-Range (Maintenance + Sinking + TOI)', emoji: '🧮' },
            { id: 'all_hub', label: '🌟 All Invoice Systems', emoji: '📑' },
            { id: 'shops', label: '🏬 Commercial Shops (1-8)', emoji: '🏪' },
            { id: 'tata', label: '⚡ Tata Electricity Bill', emoji: '🔌' },
            { id: 'toi', label: '📰 Times of India (302, 904, 1002)', emoji: '🗞️' },
            { id: 'custom', label: '✨ Custom Invoice Builder', emoji: '✍️' },
          ].map(tab => {
            const isSel = activeCategory === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveCategory(tab.id)}
                style={{
                  padding: '9px 16px',
                  borderRadius: 999,
                  border: isSel ? '2px solid #C49B4F' : '1px solid rgba(255, 255, 255, 0.22)',
                  background: isSel ? 'linear-gradient(135deg, #C49B4F 0%, #b38634 100%)' : 'rgba(255, 255, 255, 0.1)',
                  color: isSel ? '#0b2b26' : '#ffffff',
                  fontWeight: 800,
                  cursor: 'pointer',
                  fontSize: '0.84rem',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 7,
                  boxShadow: isSel ? '0 4px 14px rgba(196,155,79,0.35)' : 'none',
                  transition: 'all 0.18s ease'
                }}
              >
                <span>{tab.emoji}</span>
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── View 1: MONTH-RANGE MAINTENANCE & TOI CALCULATOR (USER PRIMARY FOCUS) ── */}
      {activeCategory === 'month_range' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#0b2b26', background: '#ecfdf5', padding: '4px 12px', borderRadius: 999, border: '1px solid #a7f3d0' }}>
                ⚡ Auto-Calculated for {calcMonthsCount} Month{calcMonthsCount !== 1 ? 's' : ''} ({formatMonthYearLabel(calcStartMonth)} to {formatMonthYearLabel(calcEndMonth)})
              </span>
            </div>
            {calcToast && (
              <span style={{ padding: '4px 12px', borderRadius: 999, background: '#d1fae5', color: '#065f46', fontSize: '0.8rem', fontWeight: 700, border: '1px solid #a7f3d0' }}>
                {calcToast}
              </span>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(340px, 460px) 1fr', gap: 20, alignItems: 'start' }}>
            
            {/* Left Column: Month Selector & Tariff Controls */}
            <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0', padding: '20px', display: 'flex', flexDirection: 'column', gap: 16, boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: 10 }}>
                <div>
                  <span style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#C49B4F' }}>
                    Flat Billing Parameters
                  </span>
                  <h3 style={{ margin: '2px 0 0', fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>
                    🧮 Select Months &amp; Dues
                  </h3>
                </div>
                <div style={{ display: 'flex', gap: 4 }}>
                  <button
                    type="button"
                    onClick={() => setCalcDocType('invoice')}
                    style={{
                      padding: '5px 10px', borderRadius: 6, fontSize: '0.75rem', fontWeight: 700,
                      background: calcDocType === 'invoice' ? '#0b2b26' : '#f1f5f9',
                      color: calcDocType === 'invoice' ? '#C49B4F' : '#64748b',
                      border: 'none', cursor: 'pointer'
                    }}
                  >
                    Invoice
                  </button>
                  <button
                    type="button"
                    onClick={() => setCalcDocType('notice')}
                    style={{
                      padding: '5px 10px', borderRadius: 6, fontSize: '0.75rem', fontWeight: 700,
                      background: calcDocType === 'notice' ? '#92400e' : '#f1f5f9',
                      color: calcDocType === 'notice' ? '#fff' : '#64748b',
                      border: 'none', cursor: 'pointer'
                    }}
                  >
                    Notice
                  </button>
                </div>
              </div>

              {/* Flat Picker */}
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                  1. Select Target Flat (Times of India Subscribers &amp; Residents)
                </label>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
                  {['A-302', 'A-904', 'A-1002'].map(fId => (
                    <button
                      key={fId}
                      type="button"
                      onClick={() => {
                        setCalcFlat(fId);
                        if (fId === 'A-1002') {
                          setCalcIncludeEarlierPending(true);
                          setCalcIncludeToi(false);
                        } else {
                          setCalcIncludeEarlierPending(false);
                          setCalcIncludeToi(false);
                        }
                      }}
                      style={{
                        flex: 1, minWidth: 80, padding: '7px 10px', borderRadius: 8, fontSize: '0.8rem', fontWeight: 700,
                        border: calcFlat === fId ? '2px solid #0b2b26' : '1px solid #cbd5e1',
                        background: calcFlat === fId ? '#0b2b26' : '#fff',
                        color: calcFlat === fId ? '#C49B4F' : '#334155',
                        cursor: 'pointer'
                      }}
                    >
                      Flat {fId}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  value={calcFlat}
                  onChange={(e) => setCalcFlat(e.target.value)}
                  placeholder="Or enter any flat: e.g. A-504"
                  style={{ width: '100%', padding: '7px 10px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: '0.82rem', fontWeight: 700 }}
                />
              </div>

              {/* Start Month and End Month Picker */}
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12, padding: '14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#0b2b26' }}>
                    2. Select Billing Month Range
                  </span>
                  <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#16a34a', background: '#dcfce7', padding: '2px 8px', borderRadius: 999 }}>
                    {calcMonthsCount} Months Counted
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: '#475569', marginBottom: 4 }}>
                      Start Month
                    </label>
                    <input
                      type="month"
                      value={calcStartMonth}
                      onChange={(e) => setCalcStartMonth(e.target.value)}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: '0.85rem', fontWeight: 700, background: '#fff' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: '#475569', marginBottom: 4 }}>
                      End Month
                    </label>
                    <input
                      type="month"
                      value={calcEndMonth}
                      onChange={(e) => setCalcEndMonth(e.target.value)}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: '0.85rem', fontWeight: 700, background: '#fff' }}
                    />
                  </div>
                </div>

                {/* Quick Presets */}
                <div>
                  <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: 4 }}>Quick Range Presets:</div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <button type="button" onClick={() => applyMonthPreset('2026-10', '2027-03')} style={{ padding: '4px 8px', borderRadius: 6, fontSize: '0.72rem', fontWeight: 700, background: '#0b2b26', color: '#C49B4F', border: '1px solid #0b2b26', cursor: 'pointer' }}>
                      Oct 26 – Mar 27 (Current 6m)
                    </button>
                    <button type="button" onClick={() => applyMonthPreset('2024-04', '2025-03')} style={{ padding: '4px 8px', borderRadius: 6, fontSize: '0.72rem', fontWeight: 600, background: '#fff', border: '1px solid #cbd5e1', cursor: 'pointer' }}>
                      FY 24-25 (12m)
                    </button>
                    <button type="button" onClick={() => applyMonthPreset('2025-04', '2026-03')} style={{ padding: '4px 8px', borderRadius: 6, fontSize: '0.72rem', fontWeight: 600, background: '#fff', border: '1px solid #cbd5e1', cursor: 'pointer' }}>
                      FY 25-26 (12m)
                    </button>
                    <button type="button" onClick={() => applyMonthPreset('2026-04', '2026-09')} style={{ padding: '4px 8px', borderRadius: 6, fontSize: '0.72rem', fontWeight: 600, background: '#fff', border: '1px solid #cbd5e1', cursor: 'pointer' }}>
                      Last 6 Mos
                    </button>
                    <button type="button" onClick={() => applyMonthPreset('2021-10', '2026-06')} style={{ padding: '4px 8px', borderRadius: 6, fontSize: '0.72rem', fontWeight: 700, background: '#ecfdf5', color: '#065f46', border: '1px solid #a7f3d0', cursor: 'pointer' }}>
                      Full 57 Mos (TOI Period)
                    </button>
                  </div>
                </div>
              </div>

              {/* Tariff Rates & Automatic Calculations */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#0b2b26' }}>
                  3. Tariff Rates &amp; Dynamic Calculation
                </span>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div style={{ background: '#fff', border: '1px solid #cbd5e1', borderRadius: 8, padding: '8px 10px' }}>
                    <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: '#475569', marginBottom: 2 }}>
                      Maintenance Rate (₹/mo)
                    </label>
                    <input
                      type="number"
                      value={calcMaintenanceRate}
                      onChange={(e) => setCalcMaintenanceRate(Number(e.target.value) || 0)}
                      style={{ width: '100%', padding: '4px 6px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: '0.9rem', fontWeight: 800, color: '#0b2b26' }}
                    />
                    <div style={{ fontSize: '0.68rem', color: '#64748b', marginTop: 4 }}>
                      {calcMonthsCount} mos × ₹{formatValue(calcMaintenanceRate)} = <strong>₹{formatValue(calcMaintenanceTotal)}</strong>
                    </div>
                  </div>

                  <div style={{ background: '#fff', border: '1px solid #cbd5e1', borderRadius: 8, padding: '8px 10px' }}>
                    <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: '#475569', marginBottom: 2 }}>
                      Sinking Fund Rate (₹/mo)
                    </label>
                    <input
                      type="number"
                      value={calcSinkingFundRate}
                      onChange={(e) => setCalcSinkingFundRate(Number(e.target.value) || 0)}
                      style={{ width: '100%', padding: '4px 6px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: '0.9rem', fontWeight: 800, color: '#0b2b26' }}
                    />
                    <div style={{ fontSize: '0.68rem', color: '#64748b', marginTop: 4 }}>
                      {calcMonthsCount} mos × ₹{formatValue(calcSinkingFundRate)} = <strong>₹{formatValue(calcSinkingFundTotal)}</strong>
                    </div>
                  </div>
                </div>

                {/* Earlier Pending Arrears Toggle (Specifically for A-1002 or Arrears Recovery) */}
                <div style={{ background: calcIncludeEarlierPending ? '#fff7ed' : '#f8fafc', border: `1px solid ${calcIncludeEarlierPending ? '#fdba74' : '#e2e8f0'}`, borderRadius: 10, padding: '10px 12px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontWeight: 700, fontSize: '0.82rem', color: '#c2410c' }}>
                    <input
                      type="checkbox"
                      checked={calcIncludeEarlierPending}
                      onChange={(e) => setCalcIncludeEarlierPending(e.target.checked)}
                      style={{ width: 16, height: 16, accentColor: '#c2410c' }}
                    />
                    <span>Include Earlier Pending Arrears (Oct 2024 – Mar 2025): ₹13,200</span>
                  </label>
                  {calcIncludeEarlierPending && (
                    <div style={{ marginTop: 6, fontSize: '0.74rem', color: '#9a3412', paddingLeft: 24 }}>
                      <div>• Maintenance: ₹2,100 × 6 mos = <strong>₹12,600</strong></div>
                      <div>• Sinking Fund: ₹100 × 6 mos = <strong>₹600</strong></div>
                      <div>• Total Arrears: <strong>₹13,200</strong></div>
                    </div>
                  )}
                </div>

                {/* Times of India Inclusion Toggle */}
                <div style={{ background: calcIncludeToi ? '#fffbeb' : '#f8fafc', border: `1px solid ${calcIncludeToi ? '#fde68a' : '#e2e8f0'}`, borderRadius: 10, padding: '10px 12px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontWeight: 700, fontSize: '0.82rem', color: '#92400e' }}>
                    <input
                      type="checkbox"
                      checked={calcIncludeToi}
                      onChange={(e) => setCalcIncludeToi(e.target.checked)}
                      style={{ width: 16, height: 16, accentColor: '#0b2b26' }}
                    />
                    <span>Include Times of India (TOI) Newspaper Subscription</span>
                  </label>
                  {calcIncludeToi && (
                    <div style={{ marginTop: 6, fontSize: '0.74rem', color: '#78350f', paddingLeft: 24 }}>
                      <div>
                        Calculated Dues for {calcMonthsCount} Months: <strong>₹{formatValue(calcToiTotal)}</strong>
                      </div>
                      <div style={{ fontSize: '0.68rem', opacity: 0.85, marginTop: 2 }}>
                        (Based on TOI approved rate: ₹2,200/yr up to Jun 25 &amp; ₹3,000/yr from Jul 25)
                      </div>
                    </div>
                  )}
                </div>

                {/* Grand Total Summary Box */}
                <div style={{ background: 'linear-gradient(135deg, #0b2b26 0%, #196c6c 100%)', borderRadius: 10, padding: '12px 14px', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#C49B4F', fontWeight: 700 }}>
                      Grand Total Payable ({calcMonthsCount} Mos)
                    </div>
                    <div style={{ fontSize: '0.74rem', color: 'rgba(255,255,255,0.7)' }}>
                      Maint (₹{formatValue(calcMaintenanceTotal)}) + Sinking (₹{formatValue(calcSinkingFundTotal)}) {calcIncludeEarlierPending ? `+ Arrears (₹13,200)` : ''} {calcIncludeToi ? `+ TOI (₹${formatValue(calcToiTotal)})` : ''}
                    </div>
                  </div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#4ade80', fontFamily: 'monospace' }}>
                    ₹{formatValue(calcGrandTotal)}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', paddingTop: 6, borderTop: '1px solid #f1f5f9' }}>
                <button
                  type="button"
                  onClick={handlePrintCalcInvoice}
                  style={{
                    flex: 1, padding: '10px 14px', borderRadius: 8, background: '#0b2b26', color: '#C49B4F',
                    border: '1px solid #C49B4F', fontWeight: 800, fontSize: '0.84rem', cursor: 'pointer',
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, boxShadow: '0 4px 14px rgba(11,43,38,0.25)'
                  }}
                >
                  <span>🖨️</span> Print / Save PDF
                </button>
                <button
                  type="button"
                  onClick={handleShareCalcWhatsApp}
                  style={{
                    padding: '10px 14px', borderRadius: 8, background: '#25D366', color: '#ffffff',
                    border: 'none', fontWeight: 700, fontSize: '0.84rem', cursor: 'pointer',
                    display: 'inline-flex', alignItems: 'center', gap: 6
                  }}
                >
                  <span>📱</span> WhatsApp
                </button>
                <button
                  type="button"
                  onClick={handleCopyCalcText}
                  style={{
                    padding: '10px 12px', borderRadius: 8, background: '#f1f5f9', color: '#334155',
                    border: '1px solid #cbd5e1', fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer'
                  }}
                >
                  📋 Copy
                </button>
              </div>

            </div>

            {/* Right Column: Live Letterhead Preview */}
            <div style={{ background: '#eaedf0', borderRadius: 16, padding: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center', overflowY: 'auto' }}>
              <div style={{
                background: '#ffffff', width: '100%', maxWidth: 540, borderRadius: 4, padding: '24px 28px',
                boxShadow: '0 10px 30px rgba(0,0,0,0.1)', border: '1px solid #cbd5e1', color: '#0f172a', fontSize: '0.82rem', lineHeight: 1.45, display: 'flex', flexDirection: 'column', gap: 10
              }}>
                {/* Letterhead */}
                <div style={{ textAlign: 'center', borderBottom: '2px solid #0b2b26', paddingBottom: 10 }}>
                  <div style={{ fontSize: '0.92rem', fontWeight: 900, color: '#0b2b26' }}>
                    MAJESTIQUE EURISKA 'A' BUILDING CO-OP HOUSING SOCIETY LTD.
                  </div>
                  <div style={{ fontSize: '0.66rem', color: '#475569', marginTop: 2 }}>
                    Reg. No: PNA/PNA (4)/HSG/(TC)/21207/2019-20 • Mohammed Wadi, Pune - 411060
                  </div>
                  <span style={{ display: 'inline-block', marginTop: 6, padding: '2px 8px', borderRadius: 999, background: '#0b2b26', color: '#fff', fontSize: '0.64rem', fontWeight: 800 }}>
                    {calcDocType === 'invoice' ? 'MAINTENANCE & SUBSCRIPTION TAX INVOICE' : 'FORMAL DEMAND NOTICE'}
                  </span>
                </div>

                {/* Ref & Date */}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.74rem', color: '#334155', borderBottom: '1px dashed #e2e8f0', paddingBottom: 6 }}>
                  <div><strong>No:</strong> {calcInvoiceNo}</div>
                  <div><strong>Date:</strong> {formatDisplayDate(calcInvoiceDate)}</div>
                  <div><strong>Due:</strong> <span style={{ color: '#b91c1c', fontWeight: 700 }}>{formatDisplayDate(calcDueDate)}</span></div>
                </div>

                {/* Recipient */}
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 6, padding: '8px 12px', fontSize: '0.78rem' }}>
                  <div style={{ fontSize: '0.66rem', color: '#64748b', fontWeight: 700 }}>BILLED TO:</div>
                  <div style={{ fontWeight: 800, fontSize: '0.88rem' }}>Flat {calcFlat}</div>
                  <div style={{ color: '#475569', fontSize: '0.72rem' }}>{calcFlatSubtext}</div>
                </div>

                {/* Subject */}
                <div style={{ fontSize: '0.74rem', fontWeight: 700, color: '#0b2b26', background: '#f1f5f9', padding: '4px 8px', borderLeft: '3px solid #0b2b26' }}>
                  <strong>SUBJECT:</strong> MAINTENANCE &amp; DUES BILLING ({formatMonthYearLabel(calcStartMonth)} to {formatMonthYearLabel(calcEndMonth)} • {calcMonthsCount} MONTHS)
                </div>

                {/* Table */}
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.74rem', margin: '4px 0' }}>
                  <thead>
                    <tr style={{ background: '#0b2b26', color: '#fff' }}>
                      <th style={{ padding: '4px 6px', textAlign: 'left' }}>Particulars</th>
                      <th style={{ padding: '4px 6px', textAlign: 'center' }}>Months</th>
                      <th style={{ padding: '4px 6px', textAlign: 'center' }}>Rate / Mo</th>
                      <th style={{ padding: '4px 6px', textAlign: 'right' }}>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '4px 6px', fontWeight: 600 }}>Flat Maintenance Charges</td>
                      <td style={{ padding: '4px 6px', textAlign: 'center' }}>{calcMonthsCount} mos</td>
                      <td style={{ padding: '4px 6px', textAlign: 'center' }}>₹{formatValue(calcMaintenanceRate)}</td>
                      <td style={{ padding: '4px 6px', textAlign: 'right', fontWeight: 700, fontFamily: 'monospace' }}>₹{formatValue(calcMaintenanceTotal)}</td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '4px 6px', fontWeight: 600 }}>Sinking Fund Contribution</td>
                      <td style={{ padding: '4px 6px', textAlign: 'center' }}>{calcMonthsCount} mos</td>
                      <td style={{ padding: '4px 6px', textAlign: 'center' }}>₹{formatValue(calcSinkingFundRate)}</td>
                      <td style={{ padding: '4px 6px', textAlign: 'right', fontWeight: 700, fontFamily: 'monospace' }}>₹{formatValue(calcSinkingFundTotal)}</td>
                    </tr>
                    {calcIncludeEarlierPending && (
                      <>
                        <tr style={{ borderBottom: '1px solid #fed7aa', background: '#fff7ed' }}>
                          <td style={{ padding: '4px 6px', fontWeight: 600, color: '#c2410c' }}>Earlier Pending Maint (Oct 24 – Mar 25)</td>
                          <td style={{ padding: '4px 6px', textAlign: 'center', color: '#c2410c' }}>6 mos</td>
                          <td style={{ padding: '4px 6px', textAlign: 'center', color: '#c2410c' }}>₹2,100</td>
                          <td style={{ padding: '4px 6px', textAlign: 'right', fontWeight: 700, fontFamily: 'monospace', color: '#c2410c' }}>₹12,600</td>
                        </tr>
                        <tr style={{ borderBottom: '1px solid #fed7aa', background: '#fff7ed' }}>
                          <td style={{ padding: '4px 6px', fontWeight: 600, color: '#c2410c' }}>Earlier Pending Sinking Fund (Oct 24 – Mar 25)</td>
                          <td style={{ padding: '4px 6px', textAlign: 'center', color: '#c2410c' }}>6 mos</td>
                          <td style={{ padding: '4px 6px', textAlign: 'center', color: '#c2410c' }}>₹100</td>
                          <td style={{ padding: '4px 6px', textAlign: 'right', fontWeight: 700, fontFamily: 'monospace', color: '#c2410c' }}>₹600</td>
                        </tr>
                      </>
                    )}
                    {calcIncludeToi && (
                      <tr style={{ borderBottom: '1px solid #e2e8f0', background: '#fffbeb' }}>
                        <td style={{ padding: '4px 6px', fontWeight: 600, color: '#92400e' }}>Times of India (TOI) Newspaper</td>
                        <td style={{ padding: '4px 6px', textAlign: 'center', color: '#92400e' }}>{calcMonthsCount} mos</td>
                        <td style={{ padding: '4px 6px', textAlign: 'center', color: '#92400e' }}>{calcCustomToiRate ? `₹${formatValue(calcCustomToiRate)}` : 'As per Slabs'}</td>
                        <td style={{ padding: '4px 6px', textAlign: 'right', fontWeight: 700, fontFamily: 'monospace', color: '#92400e' }}>₹{formatValue(calcToiTotal)}</td>
                      </tr>
                    )}
                    <tr style={{ background: '#0b2b26', color: '#fff', fontWeight: 800 }}>
                      <td colSpan={3} style={{ padding: '6px 8px', textAlign: 'right', color: '#fff' }}>TOTAL NET PAYABLE:</td>
                      <td style={{ padding: '6px 8px', textAlign: 'right', color: '#4ade80', fontSize: '0.88rem', fontFamily: 'monospace' }}>₹{formatValue(calcGrandTotal)}</td>
                    </tr>
                  </tbody>
                </table>

                {/* Remittance Box */}
                <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 6, padding: '8px 10px', fontSize: '0.72rem', color: '#166534' }}>
                  <div style={{ fontWeight: 800, marginBottom: 2 }}>🏦 HDFC Bank Remittance Info:</div>
                  <div>• A/C: <strong>50200075533530</strong> • IFSC: <strong>HDFC0002454</strong></div>
                  <div>• Name: MAJESTIQUE EURISKA A BLDG SA GRU SAN MAR</div>
                </div>

                {/* Notes */}
                <div style={{ fontSize: '0.68rem', color: '#475569', background: '#f8fafc', padding: '6px 8px', borderRadius: 4, border: '1px dashed #cbd5e1' }}>
                  <strong>Notes:</strong> {calcNotes}
                </div>

                {/* Signatures */}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 16, paddingTop: 6 }}>
                  <div style={{ textAlign: 'center', width: '30%' }}>
                    <div style={{ border: '1px dashed #cbd5e1', height: 32, borderRadius: 3, marginBottom: 3, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '0.6rem' }}>Seal</div>
                    <div style={{ borderTop: '1px solid #0f172a', paddingTop: 2, fontSize: '0.68rem', fontWeight: 700 }}>Estate Manager</div>
                  </div>
                  <div style={{ textAlign: 'center', width: '30%' }}>
                    <div style={{ border: '1px dashed #cbd5e1', height: 32, borderRadius: 3, marginBottom: 3, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '0.6rem' }}>Verified</div>
                    <div style={{ borderTop: '1px solid #0f172a', paddingTop: 2, fontSize: '0.68rem', fontWeight: 700 }}>Hon. Secretary</div>
                  </div>
                  <div style={{ textAlign: 'center', width: '30%' }}>
                    <div style={{ border: '1px dashed #cbd5e1', height: 32, borderRadius: 3, marginBottom: 3, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '0.6rem' }}>Approved</div>
                    <div style={{ borderTop: '1px solid #0f172a', paddingTop: 2, fontSize: '0.68rem', fontWeight: 700 }}>Hon. Treasurer</div>
                  </div>
                </div>

              </div>
            </div>

          </div>
        </div>
      )}

      {/* ── View 2: ALL HUB OVERVIEW ── */}
      {activeCategory === 'all_hub' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
            
            {/* Card: Combined 3-Flats Bill (A-302, A-904, A-1002 — ₹67,200) */}
            <div style={{
              background: 'linear-gradient(135deg, #0b2b26 0%, #164e43 100%)', borderRadius: 16, border: '2px solid #C49B4F', padding: '20px',
              color: '#fff', boxShadow: '0 4px 20px rgba(11,43,38,0.25)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 14
            }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#fef08a', background: 'rgba(255,255,255,0.15)', padding: '3px 8px', borderRadius: 6 }}>
                    3-Flats Combined
                  </span>
                  <span style={{ fontSize: '1.2rem' }}>🏛️</span>
                </div>
                <h3 style={{ margin: '0 0 6px', fontSize: '1.2rem', fontWeight: 800, color: '#fff' }}>
                  Combined 3-Flats Bill (₹67,200)
                </h3>
                <p style={{ margin: 0, fontSize: '0.82rem', color: 'rgba(255,255,255,0.85)', lineHeight: 1.45 }}>
                  Flats A-302 (₹18,000), A-904 (₹18,000), and A-1002 (₹31,200 with arrears). Complete combined bill with HDFC bank details, WhatsApp notice, and printable letterhead PDF.
                </p>
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                <button
                  type="button"
                  onClick={() => setActiveCategory('combined_3flats')}
                  style={{
                    flex: 1, padding: '9px 14px', borderRadius: 8, background: '#C49B4F', color: '#0b2b26',
                    border: 'none', fontWeight: 800, fontSize: '0.82rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6
                  }}
                >
                  <span>🏛️</span> Open Combined 3-Flats Bill
                </button>
              </div>
            </div>

            {/* Card 0: Month-Range Calculator */}
            <div style={{
              background: 'linear-gradient(135deg, #0b2b26 0%, #196c6c 100%)', borderRadius: 16, border: '1px solid #C49B4F', padding: '20px',
              color: '#fff', boxShadow: '0 4px 20px rgba(11,43,38,0.25)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 14
            }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#fef08a', background: 'rgba(255,255,255,0.15)', padding: '3px 8px', borderRadius: 6 }}>
                    Primary Calculator
                  </span>
                  <span style={{ fontSize: '1.2rem' }}>🧮</span>
                </div>
                <h3 style={{ margin: '0 0 6px', fontSize: '1.2rem', fontWeight: 800, color: '#fff' }}>
                  Month-Range (Maintenance + Sinking + TOI)
                </h3>
                <p style={{ margin: 0, fontSize: '0.82rem', color: 'rgba(255,255,255,0.85)', lineHeight: 1.45 }}>
                  Select Start &amp; End Month: auto-calculates <strong>Maintenance (₹2,850/mo)</strong> + <strong>Sinking Fund (₹150/mo)</strong> and <strong>Times of India</strong> for any number of selected months.
                </p>
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                <button
                  type="button"
                  onClick={() => setActiveCategory('month_range')}
                  style={{
                    flex: 1, padding: '9px 14px', borderRadius: 8, background: '#C49B4F', color: '#0b2b26',
                    border: 'none', fontWeight: 800, fontSize: '0.82rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6
                  }}
                >
                  <span>🧮</span> Open Month Calculator
                </button>
              </div>
            </div>

            {/* Card 1: Commercial Shops */}
            <div style={{
              background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0', padding: '20px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 14
            }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#0b2b26', background: '#ecfdf5', padding: '3px 8px', borderRadius: 6, border: '1px solid #a7f3d0' }}>
                    Commercial Wing
                  </span>
                  <span style={{ fontSize: '1.2rem' }}>🏬</span>
                </div>
                <h3 style={{ margin: '0 0 6px', fontSize: '1.2rem', fontWeight: 800, color: '#0f172a' }}>
                  Commercial Shops (Shop 1 – 8)
                </h3>
                <p style={{ margin: 0, fontSize: '0.82rem', color: '#64748b', lineHeight: 1.45 }}>
                  Monthly maintenance dues (₹1,500/mo), statements, demand notices, and individual/batch invoice generation with letterhead.
                </p>
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                <button
                  type="button"
                  onClick={() => setActiveCategory('shops')}
                  style={{
                    flex: 1, padding: '9px 14px', borderRadius: 8, background: '#0b2b26', color: '#C49B4F',
                    border: '1px solid #C49B4F', fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6
                  }}
                >
                  <span>🧾</span> Open Shop Invoices
                </button>
              </div>
            </div>

            {/* Card 2: Tata Electricity */}
            <div style={{
              background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0', padding: '20px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 14
            }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#1e40af', background: '#eff6ff', padding: '3px 8px', borderRadius: 6, border: '1px solid #bfdbfe' }}>
                    Sub-Meter Billing
                  </span>
                  <span style={{ fontSize: '1.2rem' }}>⚡</span>
                </div>
                <h3 style={{ margin: '0 0 6px', fontSize: '1.2rem', fontWeight: 800, color: '#0f172a' }}>
                  Tata Electricity Sub-Meter
                </h3>
                <p style={{ margin: 0, fontSize: '0.82rem', color: '#64748b', lineHeight: 1.45 }}>
                  Tata Play Hub sub-meter with 10,000 unit reset rollover principle: <code style={{ fontSize: '0.75rem', background: '#f1f5f9', padding: '1px 4px', borderRadius: 4 }}>(10k - A) + B</code> @ ₹13.00/unit.
                </p>
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                <button
                  type="button"
                  onClick={() => setActiveCategory('tata')}
                  style={{
                    flex: 1, padding: '9px 14px', borderRadius: 8, background: '#1e3a8a', color: '#ffffff',
                    border: 'none', fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6
                  }}
                >
                  <span>⚡</span> Open Tata Electricity
                </button>
              </div>
            </div>

            {/* Card 3: Times of India */}
            <div style={{
              background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0', padding: '20px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 14
            }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#92400e', background: '#fef3c7', padding: '3px 8px', borderRadius: 6, border: '1px solid #fde68a' }}>
                    Subscription Billing
                  </span>
                  <span style={{ fontSize: '1.2rem' }}>📰</span>
                </div>
                <h3 style={{ margin: '0 0 6px', fontSize: '1.2rem', fontWeight: 800, color: '#0f172a' }}>
                  Times of India (Flats 302, 904, 1002)
                </h3>
                <p style={{ margin: 0, fontSize: '0.82rem', color: '#64748b', lineHeight: 1.45 }}>
                  60-Month subscription dues (₹1,44,000 per flat across 7 FY periods), WhatsApp dispatch, and batch PDF generation.
                </p>
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                <button
                  type="button"
                  onClick={() => setActiveCategory('toi')}
                  style={{
                    flex: 1, padding: '9px 14px', borderRadius: 8, background: '#0b2b26', color: '#C49B4F',
                    border: '1px solid #C49B4F', fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6
                  }}
                >
                  <span>🗞️</span> Open TOI Subscriptions
                </button>
              </div>
            </div>

            {/* Card 4: Custom Invoice Builder */}
            <div style={{
              background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0', padding: '20px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 14
            }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#7c3aed', background: '#f5f3ff', padding: '3px 8px', borderRadius: 6, border: '1px solid #ddd6fe' }}>
                    On-Demand Creator
                  </span>
                  <span style={{ fontSize: '1.2rem' }}>✍️</span>
                </div>
                <h3 style={{ margin: '0 0 6px', fontSize: '1.2rem', fontWeight: 800, color: '#0f172a' }}>
                  Custom Society Invoice Builder
                </h3>
                <p style={{ margin: 0, fontSize: '0.82rem', color: '#64748b', lineHeight: 1.45 }}>
                  Generate custom society bills, penalty notices, vendor demand notes, or resident invoices with dynamic line items.
                </p>
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                <button
                  type="button"
                  onClick={() => setActiveCategory('custom')}
                  style={{
                    flex: 1, padding: '9px 14px', borderRadius: 8, background: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)', color: '#ffffff',
                    border: 'none', fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6
                  }}
                >
                  <span>✍️</span> Build Custom Invoice
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ── View 3: SHOPS INVOICE MODULE ── */}
      {activeCategory === 'shops' && (
        <div>
          <div style={{ marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <button
              type="button"
              onClick={() => setActiveCategory('month_range')}
              style={{ padding: '6px 12px', borderRadius: 8, background: '#f1f5f9', border: '1px solid #cbd5e1', fontSize: '0.8rem', fontWeight: 700, color: '#334155', cursor: 'pointer' }}
            >
              ← Back to Month-Range Calculator
            </button>
            <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>Commercial Wing (Shop 1 – 8)</span>
          </div>
          <ShopMaintenanceTracker isAdmin={isAdmin} />
        </div>
      )}

      {/* ── View 4: TATA ELECTRICITY MODULE ── */}
      {activeCategory === 'tata' && (
        <div>
          <div style={{ marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <button
              type="button"
              onClick={() => setActiveCategory('month_range')}
              style={{ padding: '6px 12px', borderRadius: 8, background: '#f1f5f9', border: '1px solid #cbd5e1', fontSize: '0.8rem', fontWeight: 700, color: '#334155', cursor: 'pointer' }}
            >
              ← Back to Month-Range Calculator
            </button>
            <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>Tata Play Sub-Meter Billing &amp; Invoices</span>
          </div>
          <ElectricityTracker isAdmin={isAdmin} />
        </div>
      )}

      {/* ── View 5: TIMES OF INDIA MODULE ── */}
      {activeCategory === 'toi' && (
        <div>
          <div style={{ marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <button
              type="button"
              onClick={() => setActiveCategory('month_range')}
              style={{ padding: '6px 12px', borderRadius: 8, background: '#f1f5f9', border: '1px solid #cbd5e1', fontSize: '0.8rem', fontWeight: 700, color: '#334155', cursor: 'pointer' }}
            >
              ← Back to Month-Range Calculator
            </button>
            <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>Flats A-302, A-904, A-1002 TOI Subscriptions</span>
          </div>
          <TimesOfIndiaTracker isAdmin={isAdmin} />
        </div>
      )}

      {/* ── View 6: CUSTOM INVOICE BUILDER ── */}
      {activeCategory === 'custom' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <button
              type="button"
              onClick={() => setActiveCategory('month_range')}
              style={{ padding: '6px 12px', borderRadius: 8, background: '#f1f5f9', border: '1px solid #cbd5e1', fontSize: '0.8rem', fontWeight: 700, color: '#334155', cursor: 'pointer' }}
            >
              ← Back to Month-Range Calculator
            </button>
            {customToast && (
              <span style={{ padding: '4px 12px', borderRadius: 999, background: '#d1fae5', color: '#065f46', fontSize: '0.8rem', fontWeight: 700, border: '1px solid #a7f3d0' }}>
                {customToast}
              </span>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(340px, 460px) 1fr', gap: 20, alignItems: 'start' }}>
            
            {/* Left Column: Form Controls */}
            <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0', padding: '20px', display: 'flex', flexDirection: 'column', gap: 16, boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: 10 }}>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>
                  ✍️ Custom Invoice Configuration
                </h3>
                <div style={{ display: 'flex', gap: 4 }}>
                  <button
                    type="button"
                    onClick={() => setCustomDocType('invoice')}
                    style={{
                      padding: '4px 8px', borderRadius: 6, fontSize: '0.75rem', fontWeight: 700,
                      background: customDocType === 'invoice' ? '#0b2b26' : '#f1f5f9',
                      color: customDocType === 'invoice' ? '#C49B4F' : '#64748b',
                      border: 'none', cursor: 'pointer'
                    }}
                  >
                    Invoice
                  </button>
                  <button
                    type="button"
                    onClick={() => setCustomDocType('notice')}
                    style={{
                      padding: '4px 8px', borderRadius: 6, fontSize: '0.75rem', fontWeight: 700,
                      background: customDocType === 'notice' ? '#92400e' : '#f1f5f9',
                      color: customDocType === 'notice' ? '#fff' : '#64748b',
                      border: 'none', cursor: 'pointer'
                    }}
                  >
                    Notice
                  </button>
                </div>
              </div>

              {/* Recipient & Reference */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                    Invoice / Notice Number
                  </label>
                  <input
                    type="text"
                    value={customInvoiceNo}
                    onChange={(e) => setCustomInvoiceNo(e.target.value)}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: '0.82rem', fontWeight: 600 }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                      Issue Date
                    </label>
                    <input
                      type="date"
                      value={customDate}
                      onChange={(e) => setCustomDate(e.target.value)}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: '0.82rem' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#b45309', marginBottom: 4 }}>
                      Payment Due Date
                    </label>
                    <input
                      type="date"
                      value={customDueDate}
                      onChange={(e) => setCustomDueDate(e.target.value)}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid #fde68a', background: '#fffbeb', fontSize: '0.82rem', fontWeight: 700, color: '#92400e' }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                    Billed To (Name / Flat / Shop)
                  </label>
                  <input
                    type="text"
                    value={customRecipientName}
                    onChange={(e) => setCustomRecipientName(e.target.value)}
                    placeholder="e.g. Flat A-302, Shop 5, or Vendor Name"
                    style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: '0.82rem', fontWeight: 700 }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                    Address / Subtext
                  </label>
                  <input
                    type="text"
                    value={customRecipientSubtext}
                    onChange={(e) => setCustomRecipientSubtext(e.target.value)}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: '0.82rem' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                    Subject Line
                  </label>
                  <input
                    type="text"
                    value={customSubject}
                    onChange={(e) => setCustomSubject(e.target.value)}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: '0.82rem', fontWeight: 600 }}
                  />
                </div>
              </div>

              {/* Line Items */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <label style={{ fontSize: '0.78rem', fontWeight: 800, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Line Items ({customItems.length})
                  </label>
                  <button
                    type="button"
                    onClick={handleAddCustomItem}
                    style={{ padding: '4px 8px', borderRadius: 6, background: '#ecfdf5', color: '#065f46', border: '1px solid #a7f3d0', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}
                  >
                    + Add Item
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {customItems.map((item, idx) => (
                    <div key={item.id} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '10px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b' }}>Item #{idx + 1}</span>
                        {customItems.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveCustomItem(item.id)}
                            style={{ background: 'transparent', border: 'none', color: '#ef4444', fontSize: '0.8rem', cursor: 'pointer', fontWeight: 700 }}
                          >
                            ✕ Remove
                          </button>
                        )}
                      </div>
                      <input
                        type="text"
                        value={item.description}
                        placeholder="Description"
                        onChange={(e) => handleUpdateCustomItem(item.id, 'description', e.target.value)}
                        style={{ width: '100%', padding: '6px 8px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: '0.78rem' }}
                      />
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                        <input
                          type="text"
                          value={item.period}
                          placeholder="Period"
                          onChange={(e) => handleUpdateCustomItem(item.id, 'period', e.target.value)}
                          style={{ width: '100%', padding: '6px 8px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: '0.78rem' }}
                        />
                        <input
                          type="number"
                          value={item.amount}
                          placeholder="Amount (₹)"
                          onChange={(e) => handleUpdateCustomItem(item.id, 'amount', Number(e.target.value) || 0)}
                          style={{ width: '100%', padding: '6px 8px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: '0.78rem', fontWeight: 700, textAlign: 'right' }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Notes */}
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                  Instructions &amp; Payment Notes
                </label>
                <textarea
                  rows={2}
                  value={customNotes}
                  onChange={(e) => setCustomNotes(e.target.value)}
                  style={{ width: '100%', padding: '6px 8px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: '0.76rem', lineHeight: 1.4 }}
                />
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', paddingTop: 6, borderTop: '1px solid #f1f5f9' }}>
                <button
                  type="button"
                  onClick={handlePrintCustomInvoice}
                  style={{
                    flex: 1, padding: '10px 14px', borderRadius: 8, background: '#0b2b26', color: '#C49B4F',
                    border: '1px solid #C49B4F', fontWeight: 800, fontSize: '0.84rem', cursor: 'pointer',
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, boxShadow: '0 4px 14px rgba(11,43,38,0.25)'
                  }}
                >
                  <span>🖨️</span> Print / Save PDF
                </button>
                <button
                  type="button"
                  onClick={handleShareCustomWhatsApp}
                  style={{
                    padding: '10px 14px', borderRadius: 8, background: '#25D366', color: '#ffffff',
                    border: 'none', fontWeight: 700, fontSize: '0.84rem', cursor: 'pointer',
                    display: 'inline-flex', alignItems: 'center', gap: 6
                  }}
                >
                  <span>📱</span> WhatsApp
                </button>
                <button
                  type="button"
                  onClick={handleCopyCustomText}
                  style={{
                    padding: '10px 12px', borderRadius: 8, background: '#f1f5f9', color: '#334155',
                    border: '1px solid #cbd5e1', fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer'
                  }}
                >
                  📋 Copy
                </button>
              </div>

            </div>

            {/* Right Column: Live A4 Letterhead Preview */}
            <div style={{ background: '#eaedf0', borderRadius: 16, padding: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center', overflowY: 'auto' }}>
              <div style={{
                background: '#ffffff', width: '100%', maxWidth: 540, borderRadius: 4, padding: '24px 28px',
                boxShadow: '0 10px 30px rgba(0,0,0,0.1)', border: '1px solid #cbd5e1', color: '#0f172a', fontSize: '0.82rem', lineHeight: 1.45, display: 'flex', flexDirection: 'column', gap: 10
              }}>
                {/* Letterhead */}
                <div style={{ textAlign: 'center', borderBottom: '2px solid #0b2b26', paddingBottom: 10 }}>
                  <div style={{ fontSize: '0.92rem', fontWeight: 900, color: '#0b2b26' }}>
                    MAJESTIQUE EURISKA 'A' BUILDING CO-OP HOUSING SOCIETY LTD.
                  </div>
                  <div style={{ fontSize: '0.66rem', color: '#475569', marginTop: 2 }}>
                    Reg. No: PNA/PNA (4)/HSG/(TC)/21207/2019-20 • Mohammed Wadi, Pune - 411060
                  </div>
                  <span style={{ display: 'inline-block', marginTop: 6, padding: '2px 8px', borderRadius: 999, background: '#0b2b26', color: '#fff', fontSize: '0.64rem', fontWeight: 800 }}>
                    {customDocType === 'invoice' ? 'TAX INVOICE / BILL' : 'DEMAND NOTICE'}
                  </span>
                </div>

                {/* Ref & Date */}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.74rem', color: '#334155', borderBottom: '1px dashed #e2e8f0', paddingBottom: 6 }}>
                  <div><strong>No:</strong> {customInvoiceNo}</div>
                  <div><strong>Date:</strong> {formatDisplayDate(customDate)}</div>
                  <div><strong>Due:</strong> <span style={{ color: '#b91c1c', fontWeight: 700 }}>{formatDisplayDate(customDueDate)}</span></div>
                </div>

                {/* Recipient */}
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 6, padding: '8px 12px', fontSize: '0.78rem' }}>
                  <div style={{ fontSize: '0.66rem', color: '#64748b', fontWeight: 700 }}>BILLED TO:</div>
                  <div style={{ fontWeight: 800, fontSize: '0.88rem' }}>{customRecipientName}</div>
                  <div style={{ color: '#475569', fontSize: '0.72rem' }}>{customRecipientSubtext}</div>
                </div>

                {/* Subject */}
                <div style={{ fontSize: '0.74rem', fontWeight: 700, color: '#0b2b26', background: '#f1f5f9', padding: '4px 8px', borderLeft: '3px solid #0b2b26' }}>
                  <strong>SUBJECT:</strong> {customSubject.toUpperCase()}
                </div>

                {/* Table */}
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.74rem', margin: '4px 0' }}>
                  <thead>
                    <tr style={{ background: '#0b2b26', color: '#fff' }}>
                      <th style={{ padding: '4px 6px', textAlign: 'left' }}>Particulars</th>
                      <th style={{ padding: '4px 6px', textAlign: 'center' }}>Period</th>
                      <th style={{ padding: '4px 6px', textAlign: 'right' }}>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {customItems.map((item) => (
                      <tr key={item.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                        <td style={{ padding: '4px 6px', fontWeight: 600 }}>{item.description}</td>
                        <td style={{ padding: '4px 6px', textAlign: 'center', color: '#475569' }}>{item.period}</td>
                        <td style={{ padding: '4px 6px', textAlign: 'right', fontWeight: 700, fontFamily: 'monospace' }}>₹{formatValue(item.amount)}</td>
                      </tr>
                    ))}
                    <tr style={{ background: '#0b2b26', color: '#fff', fontWeight: 800 }}>
                      <td colSpan={2} style={{ padding: '6px 8px', textAlign: 'right', color: '#fff' }}>TOTAL PAYABLE:</td>
                      <td style={{ padding: '6px 8px', textAlign: 'right', color: '#4ade80', fontSize: '0.88rem', fontFamily: 'monospace' }}>₹{formatValue(customTotalAmount)}</td>
                    </tr>
                  </tbody>
                </table>

                {/* Remittance Box */}
                <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 6, padding: '8px 10px', fontSize: '0.72rem', color: '#166534' }}>
                  <div style={{ fontWeight: 800, marginBottom: 2 }}>🏦 HDFC Bank Remittance:</div>
                  <div>• A/C: <strong>50200075533530</strong> • IFSC: <strong>HDFC0002454</strong></div>
                  <div>• Name: MAJESTIQUE EURISKA A BLDG SA GRU SAN MAR</div>
                </div>

                {/* Notes */}
                <div style={{ fontSize: '0.68rem', color: '#475569', background: '#f8fafc', padding: '6px 8px', borderRadius: 4, border: '1px dashed #cbd5e1' }}>
                  <strong>Notes:</strong> {customNotes}
                </div>

                {/* Signatures */}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 16, paddingTop: 6 }}>
                  <div style={{ textAlign: 'center', width: '30%' }}>
                    <div style={{ border: '1px dashed #cbd5e1', height: 32, borderRadius: 3, marginBottom: 3, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '0.6rem' }}>Seal</div>
                    <div style={{ borderTop: '1px solid #0f172a', paddingTop: 2, fontSize: '0.68rem', fontWeight: 700 }}>Estate Manager</div>
                  </div>
                  <div style={{ textAlign: 'center', width: '30%' }}>
                    <div style={{ border: '1px dashed #cbd5e1', height: 32, borderRadius: 3, marginBottom: 3, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '0.6rem' }}>Verified</div>
                    <div style={{ borderTop: '1px solid #0f172a', paddingTop: 2, fontSize: '0.68rem', fontWeight: 700 }}>Hon. Secretary</div>
                  </div>
                  <div style={{ textAlign: 'center', width: '30%' }}>
                    <div style={{ border: '1px dashed #cbd5e1', height: 32, borderRadius: 3, marginBottom: 3, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '0.6rem' }}>Approved</div>
                    <div style={{ borderTop: '1px solid #0f172a', paddingTop: 2, fontSize: '0.68rem', fontWeight: 700 }}>Hon. Treasurer</div>
                  </div>
                </div>

              </div>
            </div>

          </div>
        </div>
      )}

      {/* ── View: COMBINED 3-FLATS BILL (FLATS A-302, A-904, A-1002 — ₹67,200) ── */}
      {activeCategory === 'combined_3flats' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {/* Top Bar with Status and Actions */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0b2b26', background: '#ecfdf5', padding: '6px 14px', borderRadius: 999, border: '1px solid #a7f3d0' }}>
                🏛️ Combined 3-Flats Demand Notice (A-302, A-904, A-1002)
              </span>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#92400e', background: '#fef3c7', padding: '4px 10px', borderRadius: 999, border: '1px solid #fde68a' }}>
                Current Maintenance + Oct 2024 Arrears
              </span>
            </div>

            {combToast && (
              <span style={{ padding: '6px 14px', borderRadius: 999, background: '#d1fae5', color: '#065f46', fontSize: '0.82rem', fontWeight: 700, border: '1px solid #a7f3d0' }}>
                {combToast}
              </span>
            )}

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={handlePrintCombInvoice}
                style={{
                  padding: '9px 16px', borderRadius: 8, background: '#0b2b26', color: '#C49B4F',
                  border: '1px solid #C49B4F', fontWeight: 800, fontSize: '0.84rem', cursor: 'pointer',
                  display: 'inline-flex', alignItems: 'center', gap: 6, boxShadow: '0 4px 12px rgba(11,43,38,0.2)'
                }}
              >
                <span>🖨️</span> Print / Download Combined PDF
              </button>
              <button
                type="button"
                onClick={handleShareCombWhatsApp}
                style={{
                  padding: '9px 16px', borderRadius: 8, background: '#25D366', color: '#ffffff',
                  border: 'none', fontWeight: 700, fontSize: '0.84rem', cursor: 'pointer',
                  display: 'inline-flex', alignItems: 'center', gap: 6
                }}
              >
                <span>📱</span> Send WhatsApp
              </button>
              <button
                type="button"
                onClick={handleCopyCombText}
                style={{
                  padding: '9px 16px', borderRadius: 8, background: '#fff', color: '#334155',
                  border: '1px solid #cbd5e1', fontWeight: 700, fontSize: '0.84rem', cursor: 'pointer',
                  display: 'inline-flex', alignItems: 'center', gap: 6
                }}
              >
                <span>📋</span> Copy Full Notice
              </button>
            </div>
          </div>

          {/* 3-Flats Dues Breakdown Cards Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))', gap: 16 }}>
            {/* Flat A-302 */}
            <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0', padding: '18px', boxShadow: '0 4px 16px rgba(0,0,0,0.04)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#0b2b26', background: '#ecfdf5', padding: '3px 10px', borderRadius: 6, border: '1px solid #a7f3d0' }}>
                    FLAT A-302
                  </span>
                  <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700 }}>6 Months (Oct 26 – Mar 27)</span>
                </div>
                <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#0b2b26', fontFamily: 'monospace', marginBottom: 8 }}>
                  ₹18,000
                </div>
                <div style={{ fontSize: '0.8rem', color: '#475569', display: 'flex', flexDirection: 'column', gap: 4, background: '#f8fafc', padding: '10px 12px', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>• Maintenance (₹2,850 × 6):</span>
                    <strong style={{ color: '#0f172a' }}>₹17,100</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>• Sinking Fund (₹150 × 6):</span>
                    <strong style={{ color: '#0f172a' }}>₹900</strong>
                  </div>
                </div>
              </div>
              <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px dashed #e2e8f0', fontSize: '0.75rem', color: '#16a34a', fontWeight: 700 }}>
                ✓ Current Maintenance Active
              </div>
            </div>

            {/* Flat A-904 */}
            <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0', padding: '18px', boxShadow: '0 4px 16px rgba(0,0,0,0.04)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#0b2b26', background: '#ecfdf5', padding: '3px 10px', borderRadius: 6, border: '1px solid #a7f3d0' }}>
                    FLAT A-904
                  </span>
                  <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700 }}>6 Months (Oct 26 – Mar 27)</span>
                </div>
                <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#0b2b26', fontFamily: 'monospace', marginBottom: 8 }}>
                  ₹18,000
                </div>
                <div style={{ fontSize: '0.8rem', color: '#475569', display: 'flex', flexDirection: 'column', gap: 4, background: '#f8fafc', padding: '10px 12px', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>• Maintenance (₹2,850 × 6):</span>
                    <strong style={{ color: '#0f172a' }}>₹17,100</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>• Sinking Fund (₹150 × 6):</span>
                    <strong style={{ color: '#0f172a' }}>₹900</strong>
                  </div>
                </div>
              </div>
              <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px dashed #e2e8f0', fontSize: '0.75rem', color: '#16a34a', fontWeight: 700 }}>
                ✓ Current Maintenance Active
              </div>
            </div>

            {/* Flat A-1002 */}
            <div style={{ background: '#fff', borderRadius: 14, border: '2px solid #C49B4F', padding: '18px', boxShadow: '0 4px 16px rgba(196,155,79,0.15)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#0b2b26', background: '#fef3c7', padding: '3px 10px', borderRadius: 6, border: '1px solid #fde68a' }}>
                    FLAT A-1002 (ARREARS + CURRENT)
                  </span>
                  <span style={{ fontSize: '0.7rem', color: '#b45309', fontWeight: 800 }}>Includes Oct 24 Arrears</span>
                </div>
                <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#b45309', fontFamily: 'monospace', marginBottom: 8 }}>
                  ₹31,200
                </div>
                <div style={{ fontSize: '0.76rem', color: '#475569', display: 'flex', flexDirection: 'column', gap: 6, background: '#fffbeb', padding: '10px 12px', borderRadius: 8, border: '1px solid #fde68a' }}>
                  <div>
                    <div style={{ fontWeight: 800, color: '#92400e', marginBottom: 2 }}>Earlier Pending (Oct 2024 – Mar 2025): ₹13,200</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: '#78350f' }}>
                      <span>Maint: ₹2,100 × 6 = ₹12,600</span>
                      <span>Sinking: ₹100 × 6 = ₹600</span>
                    </div>
                  </div>
                  <div style={{ borderTop: '1px dashed #fde68a', paddingTop: 4 }}>
                    <div style={{ fontWeight: 800, color: '#065f46', marginBottom: 2 }}>Current Maintenance (Oct 2026 – Mar 2027): ₹18,000</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: '#047857' }}>
                      <span>Maint: ₹2,850 × 6 = ₹17,100</span>
                      <span>Sinking: ₹150 × 6 = ₹900</span>
                    </div>
                  </div>
                </div>
              </div>
              <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px dashed #e2e8f0', fontSize: '0.75rem', color: '#b45309', fontWeight: 800 }}>
                ↳ ₹13,200 Pending + ₹18,000 Current = ₹31,200
              </div>
            </div>
          </div>

          {/* Grand Total Summary Banner */}
          <div style={{
            background: 'linear-gradient(135deg, #0b2b26 0%, #164e43 100%)',
            borderRadius: 14,
            padding: '16px 22px',
            color: '#fff',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 14,
            boxShadow: '0 8px 24px rgba(11,43,38,0.25)'
          }}>
            <div>
              <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#C49B4F', fontWeight: 800 }}>
                Total Payable For All Three Flats
              </div>
              <div style={{ fontSize: '1.35rem', fontWeight: 900, color: '#fff', marginTop: 2 }}>
                Flat A-302 (₹18,000) + Flat A-904 (₹18,000) + Flat A-1002 (₹31,200)
              </div>
              <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.75)', marginTop: 2 }}>
                Rupees Sixty-Seven Thousand Two Hundred Only
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '2.1rem', fontWeight: 900, color: '#4ade80', fontFamily: 'monospace', textShadow: '0 2px 8px rgba(0,0,0,0.3)' }}>
                ₹67,200
              </div>
              <div style={{ fontSize: '0.72rem', color: '#fde047', fontWeight: 700 }}>
                Combined 3-Flats Settlement Due
              </div>
            </div>
          </div>

          {/* Two-Column Layout: Controls & Bank Details on Left, Live A4 Preview on Right */}
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(340px, 460px) 1fr', gap: 20, alignItems: 'start' }}>
            
            {/* Left Column */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              
              {/* Remittance Bank Account Box */}
              <div style={{ background: '#f0fdf4', border: '1.5px solid #86efac', borderRadius: 14, padding: '18px', boxShadow: '0 4px 14px rgba(22,101,52,0.08)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: '1.2rem' }}>🏦</span>
                    <span style={{ fontWeight: 800, fontSize: '0.9rem', color: '#166534' }}>Bank Account Details for Payment</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyBankDetails}
                    style={{
                      padding: '4px 10px', borderRadius: 6, background: '#166534', color: '#fff',
                      border: 'none', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer',
                      display: 'inline-flex', alignItems: 'center', gap: 4
                    }}
                  >
                    <span>📋</span> Copy Bank
                  </button>
                </div>

                <div style={{ fontSize: '0.82rem', color: '#14532d', display: 'flex', flexDirection: 'column', gap: 6, background: '#fff', padding: '12px 14px', borderRadius: 8, border: '1px solid #bbf7d0' }}>
                  <div><strong>Account Name:</strong> Majestique Euriska 'A' Building CO OP Society LTD</div>
                  <div><strong>Bank:</strong> HDFC Bank</div>
                  <div><strong>Branch:</strong> Undri Branch (Budhrani Boulevard, Pune - 411060)</div>
                  <div><strong>Account Type:</strong> Current Account (CA-INSTITUTION)</div>
                  <div><strong>Account No.:</strong> <span style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: '0.95rem', color: '#0b2b26' }}>50200075533530</span></div>
                  <div><strong>IFSC Code:</strong> <span style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: '0.95rem', color: '#0b2b26' }}>HDFC0002454</span></div>
                </div>

                <div style={{ marginTop: 10, fontSize: '0.74rem', color: '#166534', fontStyle: 'italic' }}>
                  Please share the payment confirmation / UTR screenshot once completed.
                </div>
              </div>

              {/* Accompanying Cover Note & Cancelled Cheque Intimation */}
              <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: '18px', boxShadow: '0 4px 16px rgba(0,0,0,0.04)' }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#C49B4F' }}>
                  Accompanying Note
                </span>
                <h4 style={{ margin: '2px 0 10px', fontSize: '0.95rem', fontWeight: 800, color: '#0f172a' }}>
                  📝 Payment Notice Note &amp; Cheque Intimation
                </h4>
                <textarea
                  value={combNotes}
                  onChange={(e) => setCombNotes(e.target.value)}
                  rows={4}
                  style={{ width: '100%', padding: '10px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: '0.82rem', lineHeight: 1.45, color: '#334155' }}
                />
                <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: 6 }}>
                  This text will be included in the WhatsApp notification and official bill printout notes section.
                </div>
              </div>

              {/* Invoice Reference & Date Meta */}
              <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: '18px', boxShadow: '0 4px 16px rgba(0,0,0,0.04)', display: 'flex', flexDirection: 'column', gap: 12 }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#0b2b26' }}>
                  Bill Metadata &amp; Due Date
                </span>
                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: '#475569', marginBottom: 4 }}>Bill Reference No.</label>
                  <input
                    type="text"
                    value={combInvoiceNo}
                    onChange={(e) => setCombInvoiceNo(e.target.value)}
                    style={{ width: '100%', padding: '7px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: '0.82rem', fontWeight: 700 }}
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: '#475569', marginBottom: 4 }}>Bill Date</label>
                    <input
                      type="date"
                      value={combInvoiceDate}
                      onChange={(e) => setCombInvoiceDate(e.target.value)}
                      style={{ width: '100%', padding: '7px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: '0.82rem' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: '#475569', marginBottom: 4 }}>Due Date</label>
                    <input
                      type="date"
                      value={combDueDate}
                      onChange={(e) => setCombDueDate(e.target.value)}
                      style={{ width: '100%', padding: '7px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: '0.82rem', fontWeight: 700, color: '#b91c1c' }}
                    />
                  </div>
                </div>
              </div>

            </div>

            {/* Right Column: Live Printable A4 Preview */}
            <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0', padding: '24px', boxShadow: '0 8px 30px rgba(0,0,0,0.06)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, borderBottom: '1px solid #f1f5f9', paddingBottom: 10 }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#0b2b26' }}>
                  Live Official Letterhead Preview (A4)
                </span>
                <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>
                  Exact Print Layout
                </span>
              </div>

              {/* Letterhead Mockup Paper */}
              <div style={{ background: '#fff', border: '1px solid #cbd5e1', borderRadius: 8, padding: '24px', fontSize: '0.8rem', color: '#0f172a', display: 'flex', flexDirection: 'column', gap: 14, boxShadow: 'inset 0 0 10px rgba(0,0,0,0.02)' }}>
                
                {/* Header */}
                <div style={{ textAlign: 'center', borderBottom: '2px solid #0b2b26', paddingBottom: 12 }}>
                  <div style={{ fontSize: '1.05rem', fontWeight: 900, color: '#0b2b26', letterSpacing: '0.5px' }}>
                    MAJESTIQUE EURISKA 'A' BUILDING CO-OP HOUSING SOCIETY LTD.
                  </div>
                  <div style={{ fontSize: '0.68rem', color: '#475569', marginTop: 2 }}>
                    Reg. No: PNA/PNA (4)/HSG/(TC)/21207/2019-20 • Mohammed Wadi, Pune - 411060
                  </div>
                  <div style={{ display: 'inline-block', marginTop: 6, padding: '2px 12px', borderRadius: 999, background: '#0b2b26', color: '#C49B4F', fontWeight: 800, fontSize: '0.7rem', letterSpacing: '0.5px' }}>
                    COMBINED SOCIETY MAINTENANCE &amp; ARREARS DEMAND BILL
                  </div>
                </div>

                {/* Ref & Dates */}
                <div style={{ display: 'flex', justifyContent: 'space-between', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 6, padding: '6px 10px', fontSize: '0.72rem' }}>
                  <div><strong>Ref No:</strong> {combInvoiceNo}</div>
                  <div><strong>Date:</strong> {formatDisplayDate(combInvoiceDate)}</div>
                  <div><strong>Due Date:</strong> <span style={{ color: '#b91c1c', fontWeight: 800 }}>{formatDisplayDate(combDueDate)}</span></div>
                </div>

                {/* Recipient */}
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 6, padding: '8px 12px', fontSize: '0.76rem' }}>
                  <div style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: 700 }}>BILLED TO:</div>
                  <div style={{ fontWeight: 800, fontSize: '0.86rem', color: '#0b2b26' }}>Flats A-302, A-904 &amp; A-1002 Members</div>
                  <div style={{ color: '#475569', fontSize: '0.7rem' }}>Majestique Euriska 'A' Building, Mohammed Wadi, Pune - 411060</div>
                </div>

                {/* Subject */}
                <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#0b2b26', background: '#f1f5f9', padding: '4px 8px', borderLeft: '3px solid #0b2b26' }}>
                  <strong>SUBJECT:</strong> COMBINED DEMAND NOTICE FOR CURRENT SOCIETY MAINTENANCE (OCT 2026 – MAR 2027) &amp; ARREARS DUES
                </div>

                {/* Itemized Table */}
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.72rem' }}>
                  <thead>
                    <tr style={{ background: '#0b2b26', color: '#fff' }}>
                      <th style={{ padding: '6px 8px', textAlign: 'center', width: '60px' }}>Flat</th>
                      <th style={{ padding: '6px 8px', textAlign: 'left' }}>Particulars</th>
                      <th style={{ padding: '6px 8px', textAlign: 'center' }}>Billing Period</th>
                      <th style={{ padding: '6px 8px', textAlign: 'center' }}>Months</th>
                      <th style={{ padding: '6px 8px', textAlign: 'center' }}>Rate</th>
                      <th style={{ padding: '6px 8px', textAlign: 'right' }}>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* Flat A-302 */}
                    <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td rowSpan={2} style={{ textAlign: 'center', fontWeight: 800, verticalAlign: 'middle', borderRight: '1px solid #e2e8f0', background: '#f8fafc' }}>A-302</td>
                      <td style={{ padding: '4px 8px', fontWeight: 600 }}>Flat Maintenance Charges</td>
                      <td style={{ padding: '4px 8px', textAlign: 'center', color: '#475569' }}>Oct 2026 – Mar 2027</td>
                      <td style={{ padding: '4px 8px', textAlign: 'center', fontWeight: 700 }}>6 mos</td>
                      <td style={{ padding: '4px 8px', textAlign: 'center' }}>₹2,850</td>
                      <td style={{ padding: '4px 8px', textAlign: 'right', fontWeight: 700, fontFamily: 'monospace' }}>₹17,100</td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '4px 8px', fontWeight: 600 }}>Sinking Fund Contribution</td>
                      <td style={{ padding: '4px 8px', textAlign: 'center', color: '#475569' }}>Oct 2026 – Mar 2027</td>
                      <td style={{ padding: '4px 8px', textAlign: 'center', fontWeight: 700 }}>6 mos</td>
                      <td style={{ padding: '4px 8px', textAlign: 'center' }}>₹150</td>
                      <td style={{ padding: '4px 8px', textAlign: 'right', fontWeight: 700, fontFamily: 'monospace' }}>₹900</td>
                    </tr>
                    <tr style={{ background: '#f1f5f9', fontWeight: 700, borderBottom: '2px solid #cbd5e1' }}>
                      <td colSpan={5} style={{ padding: '4px 8px', textAlign: 'right', color: '#0b2b26' }}>↳ Flat A-302 Subtotal Payable:</td>
                      <td style={{ padding: '4px 8px', textAlign: 'right', fontFamily: 'monospace' }}>₹18,000</td>
                    </tr>

                    {/* Flat A-904 */}
                    <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td rowSpan={2} style={{ textAlign: 'center', fontWeight: 800, verticalAlign: 'middle', borderRight: '1px solid #e2e8f0', background: '#f8fafc' }}>A-904</td>
                      <td style={{ padding: '4px 8px', fontWeight: 600 }}>Flat Maintenance Charges</td>
                      <td style={{ padding: '4px 8px', textAlign: 'center', color: '#475569' }}>Oct 2026 – Mar 2027</td>
                      <td style={{ padding: '4px 8px', textAlign: 'center', fontWeight: 700 }}>6 mos</td>
                      <td style={{ padding: '4px 8px', textAlign: 'center' }}>₹2,850</td>
                      <td style={{ padding: '4px 8px', textAlign: 'right', fontWeight: 700, fontFamily: 'monospace' }}>₹17,100</td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '4px 8px', fontWeight: 600 }}>Sinking Fund Contribution</td>
                      <td style={{ padding: '4px 8px', textAlign: 'center', color: '#475569' }}>Oct 2026 – Mar 2027</td>
                      <td style={{ padding: '4px 8px', textAlign: 'center', fontWeight: 700 }}>6 mos</td>
                      <td style={{ padding: '4px 8px', textAlign: 'center' }}>₹150</td>
                      <td style={{ padding: '4px 8px', textAlign: 'right', fontWeight: 700, fontFamily: 'monospace' }}>₹900</td>
                    </tr>
                    <tr style={{ background: '#f1f5f9', fontWeight: 700, borderBottom: '2px solid #cbd5e1' }}>
                      <td colSpan={5} style={{ padding: '4px 8px', textAlign: 'right', color: '#0b2b26' }}>↳ Flat A-904 Subtotal Payable:</td>
                      <td style={{ padding: '4px 8px', textAlign: 'right', fontFamily: 'monospace' }}>₹18,000</td>
                    </tr>

                    {/* Flat A-1002 */}
                    <tr style={{ borderBottom: '1px solid #fed7aa', background: '#fffbeb' }}>
                      <td rowSpan={4} style={{ textAlign: 'center', fontWeight: 800, verticalAlign: 'middle', borderRight: '1px solid #fed7aa', color: '#9a3412', background: '#fef3c7' }}>A-1002</td>
                      <td style={{ padding: '4px 8px', fontWeight: 600, color: '#9a3412' }}>Earlier Pending Maint Arrears</td>
                      <td style={{ padding: '4px 8px', textAlign: 'center', color: '#9a3412' }}>Oct 2024 – Mar 2025</td>
                      <td style={{ padding: '4px 8px', textAlign: 'center', fontWeight: 700, color: '#9a3412' }}>6 mos</td>
                      <td style={{ padding: '4px 8px', textAlign: 'center', color: '#9a3412' }}>₹2,100</td>
                      <td style={{ padding: '4px 8px', textAlign: 'right', fontWeight: 700, fontFamily: 'monospace', color: '#9a3412' }}>₹12,600</td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid #fed7aa', background: '#fffbeb' }}>
                      <td style={{ padding: '4px 8px', fontWeight: 600, color: '#9a3412' }}>Earlier Pending Sinking Fund Arrears</td>
                      <td style={{ padding: '4px 8px', textAlign: 'center', color: '#9a3412' }}>Oct 2024 – Mar 2025</td>
                      <td style={{ padding: '4px 8px', textAlign: 'center', fontWeight: 700, color: '#9a3412' }}>6 mos</td>
                      <td style={{ padding: '4px 8px', textAlign: 'center', color: '#9a3412' }}>₹100</td>
                      <td style={{ padding: '4px 8px', textAlign: 'right', fontWeight: 700, fontFamily: 'monospace', color: '#9a3412' }}>₹600</td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid #fed7aa' }}>
                      <td style={{ padding: '4px 8px', fontWeight: 600 }}>Current Flat Maintenance Charges</td>
                      <td style={{ padding: '4px 8px', textAlign: 'center', color: '#475569' }}>Oct 2026 – Mar 2027</td>
                      <td style={{ padding: '4px 8px', textAlign: 'center', fontWeight: 700 }}>6 mos</td>
                      <td style={{ padding: '4px 8px', textAlign: 'center' }}>₹2,850</td>
                      <td style={{ padding: '4px 8px', textAlign: 'right', fontWeight: 700, fontFamily: 'monospace' }}>₹17,100</td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid #fed7aa' }}>
                      <td style={{ padding: '4px 8px', fontWeight: 600 }}>Current Sinking Fund Contribution</td>
                      <td style={{ padding: '4px 8px', textAlign: 'center', color: '#475569' }}>Oct 2026 – Mar 2027</td>
                      <td style={{ padding: '4px 8px', textAlign: 'center', fontWeight: 700 }}>6 mos</td>
                      <td style={{ padding: '4px 8px', textAlign: 'center' }}>₹150</td>
                      <td style={{ padding: '4px 8px', textAlign: 'right', fontWeight: 700, fontFamily: 'monospace' }}>₹900</td>
                    </tr>
                    <tr style={{ background: '#fef3c7', fontWeight: 700, borderBottom: '2px solid #cbd5e1' }}>
                      <td colSpan={5} style={{ padding: '4px 8px', textAlign: 'right', color: '#92400e' }}>↳ Flat A-1002 Subtotal (Pending ₹13,200 + Current ₹18,000):</td>
                      <td style={{ padding: '4px 8px', textAlign: 'right', fontFamily: 'monospace', color: '#92400e', fontWeight: 800 }}>₹31,200</td>
                    </tr>

                    {/* Grand Total */}
                    <tr style={{ background: '#0b2b26', color: '#fff', fontWeight: 900 }}>
                      <td colSpan={5} style={{ padding: '8px 10px', textAlign: 'right', color: '#fff', fontSize: '0.8rem', letterSpacing: '0.5px' }}>
                        TOTAL PAYABLE FOR ALL THREE FLATS:
                      </td>
                      <td style={{ padding: '8px 10px', textAlign: 'right', color: '#4ade80', fontSize: '1rem', fontFamily: 'monospace' }}>
                        ₹67,200
                      </td>
                    </tr>
                  </tbody>
                </table>

                {/* Remittance Box */}
                <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 6, padding: '8px 10px', fontSize: '0.72rem', color: '#166534' }}>
                  <div style={{ fontWeight: 800, marginBottom: 2 }}>🏦 HDFC Bank Remittance Details:</div>
                  <div>• Account Name: <strong>Majestique Euriska 'A' Building CO OP Society LTD</strong></div>
                  <div>• A/C: <strong>50200075533530</strong> • IFSC: <strong>HDFC0002454</strong> • Type: <strong>Current Account</strong> • Branch: <strong>Undri Branch</strong></div>
                </div>

                {/* Notes */}
                <div style={{ fontSize: '0.68rem', color: '#475569', background: '#f8fafc', padding: '6px 8px', borderRadius: 4, border: '1px dashed #cbd5e1' }}>
                  <strong>Notes:</strong> {combNotes}
                </div>

                {/* Signatures */}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12, paddingTop: 6 }}>
                  <div style={{ textAlign: 'center', width: '30%' }}>
                    <div style={{ border: '1px dashed #cbd5e1', height: 32, borderRadius: 3, marginBottom: 3, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '0.6rem' }}>Society Seal</div>
                    <div style={{ borderTop: '1px solid #0f172a', paddingTop: 2, fontSize: '0.68rem', fontWeight: 700 }}>Estate Manager</div>
                  </div>
                  <div style={{ textAlign: 'center', width: '30%' }}>
                    <div style={{ border: '1px dashed #cbd5e1', height: 32, borderRadius: 3, marginBottom: 3, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '0.6rem' }}>Verified</div>
                    <div style={{ borderTop: '1px solid #0f172a', paddingTop: 2, fontSize: '0.68rem', fontWeight: 700 }}>Hon. Secretary</div>
                  </div>
                  <div style={{ textAlign: 'center', width: '30%' }}>
                    <div style={{ border: '1px dashed #cbd5e1', height: 32, borderRadius: 3, marginBottom: 3, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '0.6rem' }}>Approved</div>
                    <div style={{ borderTop: '1px solid #0f172a', paddingTop: 2, fontSize: '0.68rem', fontWeight: 700 }}>Hon. Treasurer / Chairman</div>
                  </div>
                </div>

              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
