import React, { useState, useMemo, useCallback } from 'react';
import ShopMaintenanceTracker from './ShopMaintenanceTracker.jsx';
import ElectricityTracker from './ElectricityTracker.jsx';
import './CommonInvoiceHub.css';


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

export function numberToWordsINR(amount) {
  const num = Math.round(Math.abs(Number(amount) || 0));
  if (num === 0) return 'Zero Only.';

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
  const hundred = num % 1000;

  const parts = [];
  if (crore) parts.push(convertThreeDigits(crore) + ' Crore');
  if (lakh) parts.push(convertTwoDigits(lakh) + ' Lakh');
  if (thousand) parts.push(convertTwoDigits(thousand) + ' Thousand');
  if (hundred) parts.push(convertThreeDigits(hundred));

  return parts.filter(Boolean).join(' ') + ' Only.';
}

export default function CommonInvoiceHub({ isAdmin = false }) {
  const [activeCategory, setActiveCategory] = useState('month_range'); // 'combined_3flats' | 'month_range' | 'all_hub' | 'shops' | 'tata' | 'custom'

  // ─── 1. Month-Range Maintenance & Sinking Fund State ───
  const [calcFlat, setCalcFlat] = useState('A-302');
  const [calcFlatSubtext, setCalcFlatSubtext] = useState("Majestique Euriska 'A' Building, Mohammed Wadi, Pune - 411060");
  const [calcStartMonth, setCalcStartMonth] = useState('2024-04');
  const [calcEndMonth, setCalcEndMonth] = useState('2025-03');
  const [calcMaintenanceRate, setCalcMaintenanceRate] = useState(2850);
  const [calcSinkingFundRate, setCalcSinkingFundRate] = useState(150);
  const [calcIncludeEarlierPending, setCalcIncludeEarlierPending] = useState(false);
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

  const calcEarlierPendingAmount = useMemo(() => {
    return calcIncludeEarlierPending ? 13200 : 0;
  }, [calcIncludeEarlierPending]);

  const calcGrandTotal = useMemo(() => calcBaseTotal + calcEarlierPendingAmount, [calcBaseTotal, calcEarlierPendingAmount]);

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
  }, [calcDocType, calcInvoiceNo, calcInvoiceDate, calcDueDate, calcFlat, calcStartMonth, calcEndMonth, calcMonthsCount, calcMaintenanceRate, calcMaintenanceTotal, calcSinkingFundRate, calcSinkingFundTotal, calcBaseTotal, calcIncludeEarlierPending, calcGrandTotal, calcNotes]);

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
        <title>${calcInvoiceNo} — Flat ${calcFlat} Maintenance</title>
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
              <strong>SUBJECT:</strong> DEMAND &amp; BILLING FOR MAINTENANCE &amp; SINKING FUND (${startLbl} – ${endLbl}, ${calcMonthsCount} MONTHS)
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

  // ─── 1B. Times Horizon Private Limited (TOI) 3-Flats Invoices & Combined Bill State ───
  const [combActiveTab, setCombActiveTab] = useState('A-302'); // 'A-302' | 'A-904' | 'A-1002' | 'combined'
  const [combInvoiceNo, setCombInvoiceNo] = useState(() => `INV-ME/COMB-3FLATS/2026-27/${Math.floor(1000 + Math.random() * 9000)}`);
  const [combInvoiceDate, setCombInvoiceDate] = useState('2026-09-01');
  const [combDueDate, setCombDueDate] = useState('2027-03-31');
  const [combClientName, setCombClientName] = useState('Times Horizon Private Limited');
  const [combClientAddress, setCombClientAddress] = useState('S. No. 2, Plot No. C-1, Village Mohammadwadi Tal. Haveli, Dist. Pune- 411060');
  const [combClientMobile, setCombClientMobile] = useState('8530248819');
  const [combClientEmail, setCombClientEmail] = useState('ganesh@redmotive.in');
  const [combFlats, setCombFlats] = useState([
    {
      id: 'A-302',
      flatNo: 'A-302',
      flatNumberOnly: '302',
      invoiceNo: 'ME/A/18/Oct26',
      period: 'Oct 2026 – Mar 2027 (6 Mos)',
      billPeriodStr: '01-10-2026 to 31-03-2027',
      months: 6,
      maintenanceRate: 2850,
      maintenance: 17100,
      sinkingFundRate: 150,
      sinkingFund: 900,
      hasEarlierPending: false,
      earlierPending: 0,
      total: 18000,
      words: 'Eighteen Thousand Only.',
      paymentStatus: 'Paid',
      paidDate: '23-10-2026',
      paidAmount: 18000,
      balanceDue: 0,
      periodLines: [
        'Oct 26  -  2850 + 150 = 3000',
        'Nov 26  -  2850 + 150 = 3000',
        'Dec 26  -  2850 + 150 = 3000',
        'Jan 27  -  2850 + 150 = 3000',
        'Feb 27  -  2850 + 150 = 3000',
        'Mar 27  -  2850 + 150 = 3000',
      ]
    },
    {
      id: 'A-904',
      flatNo: 'A-904',
      flatNumberOnly: '904',
      invoiceNo: 'ME/A/16/Oct-26',
      period: 'Oct 2026 – Mar 2027 (6 Mos)',
      billPeriodStr: '01-10-2026 to 31-03-2027',
      months: 6,
      maintenanceRate: 2850,
      maintenance: 17100,
      sinkingFundRate: 150,
      sinkingFund: 900,
      hasEarlierPending: false,
      earlierPending: 0,
      total: 18000,
      words: 'Eighteen Thousand Only.',
      paymentStatus: 'Paid',
      paidDate: '23-10-2026',
      paidAmount: 18000,
      balanceDue: 0,
      periodLines: [
        'Oct 26  -  2850 + 150 = 3000',
        'Nov 26  -  2850 + 150 = 3000',
        'Dec 26  -  2850 + 150 = 3000',
        'Jan 27  -  2850 + 150 = 3000',
        'Feb 27  -  2850 + 150 = 3000',
        'Mar 27  -  2850 + 150 = 3000',
      ]
    },
    {
      id: 'A-1002',
      flatNo: 'A-1002',
      flatNumberOnly: '1002',
      invoiceNo: 'ME/A/17/Oct-26',
      period: 'Oct 2026 – Mar 2027 (6 Mos)',
      billPeriodStr: '01-10-2026 to 30-03-2027',
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
      total: 31200,
      words: 'Thirty One Thousand Two Hundred Only.',
      paymentStatus: 'Pending',
      paidDate: null,
      paidAmount: 0,
      balanceDue: 31200,
      periodLines: [
        'Oct 24  -  2100 + 100 = 2200',
        'Nov 24  -  2100 + 100 = 2200',
        'Dec 24  -  2100 + 100 = 2200',
        'Jan 25  -  2100 + 100 = 2200',
        'Feb 25  -  2100 + 100 = 2200',
        'Mar 25  -  2100 + 100 = 2200',
        '---',
        'Oct 26  -  2850 + 150 = 3000',
        'Nov 26  -  2850 + 150 = 3000',
        'Dec 26  -  2850 + 150 = 3000',
        'Jan 27  -  2850 + 150 = 3000',
        'Feb 27  -  2850 + 150 = 3000',
        'Mar 27  -  2850 + 150 = 3000',
      ]
    }
  ]);
  const [combNotes, setCombNotes] = useState('Payment of ₹18,000 each for Flats A-302 and A-904 received today (23-Oct-2026). Flat A-1002 balance due of ₹31,200 (Arrears ₹13,200 + Current ₹18,000) is pending.');
  const [combToast, setCombToast] = useState('');

  const combGrandTotal = useMemo(() => {
    return combFlats.reduce((sum, f) => sum + (Number(f.total) || 0), 0);
  }, [combFlats]);

  const combTotalPaid = useMemo(() => {
    return combFlats.reduce((sum, f) => sum + (Number(f.paidAmount) || 0), 0);
  }, [combFlats]);

  const combTotalPending = useMemo(() => {
    return combFlats.reduce((sum, f) => sum + (Number(f.balanceDue ?? f.total) || 0), 0);
  }, [combFlats]);

  const formatDmyDate = (isoDate) => {
    if (!isoDate) return '';
    if (/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) {
      const [y, m, d] = isoDate.split('-');
      return `${d}-${m}-${y}`;
    }
    return isoDate;
  };

  const handleUpdateFlatField = (flatId, field, value) => {
    setCombFlats(prev => prev.map(f => {
      if (f.id !== flatId) return f;
      return { ...f, [field]: value };
    }));
  };

  const buildOfficialToiInvoiceHtml = (flat, isPageBreak = false) => {
    const invDateStr = formatDmyDate(combInvoiceDate) || '01-09-2026';
    const dueDateStr = formatDmyDate(combDueDate) || '31-03-2027';
    const is12Mos = flat.hasEarlierPending;
    const maintUnits = '01';
    const maintRate = 2850;
    const maintAmount = is12Mos ? 29700 : 17100;
    const sinkingRate = 150;
    const sinkingAmount = is12Mos ? 1500 : 900;
    const currentTotal = flat.total;
    const amountWords = flat.words;

    return `
      <div class="toi-sheet ${isPageBreak ? 'page-break' : ''}">
        <div class="toi-body-content">
          <div class="toi-header">
            <div class="toi-header-title">Majestique Euriska A Building Sahakari Gruhrachna Sanstha Maryadit</div>
            <div class="toi-header-sub">S. No. 2, Plot No. C-1, Village Mohammadwadi Tal. Haveli, Dist. Pune- 411060 Reg. No.</div>
            <div class="toi-header-reg">PNA/PNA(4)/HSG/(TC)/21207/2021-22 Dt. 09/08/2019</div>
          </div>

          <div class="toi-bill-banner">
            Bill Period : ${flat.billPeriodStr}
          </div>

          <div class="toi-table-box">
          <div class="toi-meta-box">
            <div class="toi-meta-left">
              <div class="toi-row"><span class="toi-lbl">INVOICE DATE</span><span class="toi-colon">:</span><span class="toi-val">${invDateStr}</span></div>
              <div class="toi-row"><span class="toi-lbl">INVOICE NO.</span><span class="toi-colon">:</span><span class="toi-val"><strong>${flat.invoiceNo}</strong></span></div>
              <div class="toi-row"><span class="toi-lbl">DUE DATE</span><span class="toi-colon">:</span><span class="toi-val">${dueDateStr}</span></div>
              <div class="toi-row"><span class="toi-lbl">INVOICE TO</span><span class="toi-colon">:</span><span class="toi-val"><strong>${combClientName}</strong></span></div>
              <div class="toi-row"><span class="toi-lbl">FLAT NO.</span><span class="toi-colon">:</span><span class="toi-val"><strong>A WING- ${flat.flatNumberOnly}</strong></span></div>
              <div class="toi-row" style="align-items: flex-start;">
                <span class="toi-lbl">ADDRESS</span><span class="toi-colon">:</span>
                <span class="toi-val">S. No. 2, Plot No. C-1,<br/>Village Mohammadwadi Tal. Haveli, Dist. Pune-<br/>411060</span>
              </div>
              <div class="toi-row"><span class="toi-lbl">MOBILE NO.</span><span class="toi-colon">:</span><span class="toi-val">${combClientMobile}</span></div>
              <div class="toi-row"><span class="toi-lbl">E-MAIL</span><span class="toi-colon">:</span><span class="toi-val">${combClientEmail}</span></div>
            </div>

            <div class="toi-meta-right">
              <div class="toi-period-title">Period :-</div>
              <div class="toi-period-list">
                ${flat.periodLines.map(line => line === '---' ? '<div style="margin: 6px 0; border-top: 1px dashed #999;"></div>' : `<div style="margin-bottom: 2px;">${line}</div>`).join('')}
              </div>
            </div>
          </div>

          <table class="toi-table">
          <thead>
            <tr>
              <th style="width: 44%; text-align: center;">Description of<br/>Services</th>
              <th style="width: 10%; text-align: center;">Units</th>
              <th style="width: 14%; text-align: center;">SAC<br/>Code</th>
              <th style="width: 14%; text-align: center;">Rate<br/>(INR)</th>
              <th style="width: 18%; text-align: center;">Amount<br/>Payable<br/>(INR)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>${is12Mos ? 'Maintenance Fee Twelve Month' : 'Maintenance Fee Six Month'}</td>
              <td style="text-align: center;">${maintUnits}</td>
              <td style="text-align: center;">-</td>
              <td style="text-align: center;">${maintRate}</td>
              <td style="text-align: right; font-family: monospace;">${maintAmount.toFixed(2)}</td>
            </tr>
            <tr>
              <td>Repairs and Maintenance</td>
              <td style="text-align: center;">-</td>
              <td style="text-align: center;">-</td>
              <td style="text-align: center;">0</td>
              <td style="text-align: right; font-family: monospace;">0.00</td>
            </tr>
            <tr>
              <td>${is12Mos ? 'Sinking Fund Twelve Month' : 'Sinking Fund Six Month'}</td>
              <td style="text-align: center;">-</td>
              <td style="text-align: center;">-</td>
              <td style="text-align: center;">${sinkingRate}</td>
              <td style="text-align: right; font-family: monospace;">${sinkingAmount.toFixed(2)}</td>
            </tr>
            <tr>
              <td style="font-weight: bold;">Current Bill Amount (INR)</td>
              <td></td><td></td><td></td>
              <td style="text-align: right; font-weight: bold; font-family: monospace;">${currentTotal.toFixed(2)}</td>
            </tr>
            <tr>
              <td>Last Outstanding (INR)</td>
              <td></td><td></td><td></td><td></td>
            </tr>
            <tr>
              <td>Pending Amount</td>
              <td></td><td></td><td></td><td></td>
            </tr>
            <tr>
              <td style="font-weight: bold;">Payable Amount (INR)</td>
              <td></td><td></td><td></td>
              <td style="text-align: right; font-weight: bold; font-family: monospace;">${currentTotal.toFixed(2)}</td>
            </tr>
            ${flat.paymentStatus === 'Paid' ? `
            <tr style="background: #f0fdf4;">
              <td style="font-weight: bold; color: #15803d;">Payment Received (${flat.paidDate})</td>
              <td></td><td></td><td></td>
              <td style="text-align: right; font-weight: bold; font-family: monospace; color: #15803d;">(-) ${(Number(flat.paidAmount) || currentTotal).toFixed(2)}</td>
            </tr>
            <tr style="background: #f0fdf4;">
              <td style="font-weight: bold; color: #15803d;">Balance Due (INR)</td>
              <td></td><td></td><td></td>
              <td style="text-align: right; font-weight: bold; font-family: monospace; color: #15803d;">0.00 (PAID IN FULL)</td>
            </tr>
            ` : `
            <tr style="background: #fffbeb;">
              <td style="font-weight: bold; color: #b45309;">Balance Due (INR)</td>
              <td></td><td></td><td></td>
              <td style="text-align: right; font-weight: bold; font-family: monospace; color: #b45309;">${(Number(flat.balanceDue) || currentTotal).toFixed(2)} (PENDING)</td>
            </tr>
            `}
            <tr>
              <td colspan="5" style="font-weight: bold; padding: 6px 8px;">
                Amount in word: ${amountWords}
              </td>
            </tr>
          </tbody>
        </table>
        </div>

        <div class="toi-signatory-section" style="margin-top: 36px; display: flex; justify-content: space-between; align-items: flex-end; padding: 0 16px;">
          <div>
            ${flat.paymentStatus === 'Paid' ? `
              <div style="border: 2px solid #16a34a; background: #f0fdf4; color: #16a34a; font-weight: 800; padding: 5px 12px; border-radius: 6px; display: inline-block; font-size: 10pt; letter-spacing: 0.5px; text-transform: uppercase;">
                ✓ PAID IN FULL • ${flat.paidDate}
              </div>
            ` : `
              <div style="border: 2px solid #d97706; background: #fffbeb; color: #b45309; font-weight: 800; padding: 5px 12px; border-radius: 6px; display: inline-block; font-size: 9.5pt; letter-spacing: 0.5px; text-transform: uppercase;">
                ⏳ PENDING PAYMENT
              </div>
            `}
          </div>
          <div class="toi-signatory-box">
            <div class="toi-signatory-line">
              Authorized Signatory
            </div>
          </div>
        </div>
      </div>
    `;
  };

  const handlePrintSingleFlatInvoice = (flatId) => {
    const flat = combFlats.find(f => f.id === flatId) || combFlats[0];
    const htmlBody = buildOfficialToiInvoiceHtml(flat, false);
    const printDoc = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${flat.invoiceNo} — Flat ${flat.flatNo} (${combClientName})</title>
        <meta charset="utf-8" />
        <style>
          @page { size: A4 portrait; margin: 14mm 16mm 14mm 16mm; }
          * { box-sizing: border-box; }
          body { font-family: Arial, "Helvetica Neue", Helvetica, sans-serif; color: #000; margin: 0; padding: 0; background: #fff; font-size: 10pt; line-height: 1.35; }
          .toi-sheet { max-width: 760px; margin: 0 auto; padding: 6px 0; }
          .toi-body-content { width: 100%; margin: 0; padding: 0; }
          .toi-header { text-align: center; margin-bottom: 3px; }
          .toi-header-title { font-size: 13pt; font-weight: bold; margin-bottom: 2px; }
          .toi-header-sub, .toi-header-reg { font-size: 9pt; line-height: 1.3; }
          .toi-bill-banner { border: none; text-align: center; font-weight: bold; font-size: 10pt; margin: 3px 0 8px 0; padding: 0; }
          .toi-table-box { width: 100%; margin: 0; padding: 0; }
          .toi-meta-box { border: 1.5px solid #000; display: flex; margin: 0; }
          .toi-meta-left { width: 53%; border-right: 1.5px solid #000; padding: 7px 10px; font-size: 9.5pt; }
          .toi-meta-right { width: 47%; padding: 7px 12px; font-size: 9.5pt; }
          .toi-row { display: flex; margin-bottom: 2.5px; line-height: 1.3; }
          .toi-lbl { width: 105px; font-weight: bold; flex-shrink: 0; }
          .toi-colon { width: 12px; font-weight: bold; flex-shrink: 0; }
          .toi-val { flex: 1; }
          .toi-period-title { font-weight: bold; margin-bottom: 6px; }
          .toi-period-list { font-size: 9.5pt; line-height: 1.35; font-family: inherit; }
          .toi-table { width: 100%; border-collapse: collapse; border: 1.5px solid #000; border-top: none; }
          .toi-table th { border: 1.5px solid #000; padding: 4px 6px; font-size: 9pt; font-weight: bold; text-align: center; background: #fff; }
          .toi-table td { border: 1.5px solid #000; padding: 4px 6px; font-size: 9pt; }
          .toi-signatory-section { margin-top: 45px; display: flex; justify-content: flex-end; padding-right: 30px; }
          .toi-signatory-box { text-align: center; width: 200px; }
          .toi-signatory-line { border-top: 1.5px solid #000; padding-top: 5px; font-weight: bold; font-size: 9.5pt; }
        </style>
      </head>
      <body>
        ${htmlBody}
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

  const handlePrintBatchAllFlats = () => {
    const htmlBodies = combFlats.map((f, idx) => buildOfficialToiInvoiceHtml(f, idx < combFlats.length - 1)).join('\n');
    const printDoc = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Batch Times Horizon Private Limited Invoices (A-302, A-904, A-1002)</title>
        <meta charset="utf-8" />
        <style>
          @page { size: A4 portrait; margin: 14mm 16mm 14mm 16mm; }
          * { box-sizing: border-box; }
          body { font-family: Arial, "Helvetica Neue", Helvetica, sans-serif; color: #000; margin: 0; padding: 0; background: #fff; font-size: 10pt; line-height: 1.35; }
          .page-break { page-break-after: always; break-after: page; }
          .toi-sheet { max-width: 760px; margin: 0 auto; padding: 6px 0; }
          .toi-body-content { width: 100%; margin: 0; padding: 0; }
          .toi-header { text-align: center; margin-bottom: 3px; }
          .toi-header-title { font-size: 13pt; font-weight: bold; margin-bottom: 2px; }
          .toi-header-sub, .toi-header-reg { font-size: 9pt; line-height: 1.3; }
          .toi-bill-banner { border: none; text-align: center; font-weight: bold; font-size: 10pt; margin: 3px 0 8px 0; padding: 0; }
          .toi-table-box { width: 100%; margin: 0; padding: 0; }
          .toi-meta-box { border: 1.5px solid #000; display: flex; margin: 0; }
          .toi-meta-left { width: 53%; border-right: 1.5px solid #000; padding: 7px 10px; font-size: 9.5pt; }
          .toi-meta-right { width: 47%; padding: 7px 12px; font-size: 9.5pt; }
          .toi-row { display: flex; margin-bottom: 2.5px; line-height: 1.3; }
          .toi-lbl { width: 105px; font-weight: bold; flex-shrink: 0; }
          .toi-colon { width: 12px; font-weight: bold; flex-shrink: 0; }
          .toi-val { flex: 1; }
          .toi-period-title { font-weight: bold; margin-bottom: 6px; }
          .toi-period-list { font-size: 9.5pt; line-height: 1.35; font-family: inherit; }
          .toi-table { width: 100%; border-collapse: collapse; border: 1.5px solid #000; border-top: none; }
          .toi-table th { border: 1.5px solid #000; padding: 4px 6px; font-size: 9pt; font-weight: bold; text-align: center; background: #fff; }
          .toi-table td { border: 1.5px solid #000; padding: 4px 6px; font-size: 9pt; }
          .toi-signatory-section { margin-top: 45px; display: flex; justify-content: flex-end; padding-right: 30px; }
          .toi-signatory-box { text-align: center; width: 200px; }
          .toi-signatory-line { border-top: 1.5px solid #000; padding-top: 5px; font-weight: bold; font-size: 9.5pt; }
        </style>
      </head>
      <body>
        ${htmlBodies}
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

  const generateCombWhatsAppMessage = useCallback(() => {
    return `🏛️ *MAJESTIQUE EURISKA 'A' CO-OP HOUSING SOCIETY LTD.*
📄 *COMBINED MAINTENANCE & DUES BILL (FLATS A-302, A-904, A-1002)*
───────────────────────────
📌 *Ref No:* ${combInvoiceNo}
📅 *Date:* ${formatDisplayDate(combInvoiceDate)}
⏰ *Payment Due Date:* ${formatDisplayDate(combDueDate)}
🏢 *Billed To:* ${combClientName}

*FLAT DUES & PAYMENT SUMMARY:*
• *A-302 (Inv: ME/A/18/Oct26):* ₹18,000 – Maint ₹17,100 + Sinking ₹900 [✓ PAID IN FULL on 23-10-2026]
• *A-904 (Inv: ME/A/16/Oct-26):* ₹18,000 – Maint ₹17,100 + Sinking ₹900 [✓ PAID IN FULL on 23-10-2026]
• *A-1002 (Inv: ME/A/17/Oct-26):* ₹31,200 – Earlier Arrears ₹13,200 + Current ₹18,000 [⏳ PENDING DUE]

*A-1002 Earlier Pending Amount (Oct 2024 – Mar 2025):*
• Maintenance: ₹2,100 × 6 = ₹12,600
• Sinking Fund: ₹100 × 6 = ₹600
• Total Arrears: *₹13,200*

*Current Maintenance (Oct 2026 – Mar 2027):*
• Maintenance: ₹2,850 × 6 = ₹17,100
• Sinking Fund: ₹150 × 6 = ₹900
• Total Current: *₹18,000*

💰 *Total Invoiced for all 3 flats: ₹${formatValue(combGrandTotal)}*
✅ *Payment Received Today (23-Oct-2026): ₹${formatValue(combTotalPaid)} (Flats A-302 & A-904)*
⏳ *Net Outstanding Balance: ₹${formatValue(combTotalPending)} (Flat A-1002)*
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
  }, [combInvoiceNo, combInvoiceDate, combDueDate, combClientName, combGrandTotal, combTotalPaid, combTotalPending, combNotes]);

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
              <div style="font-size: 14px; font-weight: 800; color: #0b2b26;">${combClientName} (Flats A-302, A-904 &amp; A-1002)</div>
              <div style="font-size: 11px; color: #475569;">${combClientAddress}</div>
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
                <tr class="subtotal-row" style="border-bottom: 2px solid #94a3b8; background: #f0fdf4;">
                  <td colspan="5" style="text-align: right; color: #166534; font-weight: 700;">↳ Flat A-302 Subtotal Payable (Inv: ME/A/18/Oct26): <span style="background: #dcfce7; color: #15803d; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: 800; border: 1px solid #86efac;">✓ PAID (23-10-2026)</span></td>
                  <td style="text-align: right; font-family: monospace; font-size: 11.5px; color: #15803d; font-weight: 700;">₹18,000</td>
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
                <tr class="subtotal-row" style="border-bottom: 2px solid #94a3b8; background: #f0fdf4;">
                  <td colspan="5" style="text-align: right; color: #166534; font-weight: 700;">↳ Flat A-904 Subtotal Payable (Inv: ME/A/16/Oct-26): <span style="background: #dcfce7; color: #15803d; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: 800; border: 1px solid #86efac;">✓ PAID (23-10-2026)</span></td>
                  <td style="text-align: right; font-family: monospace; font-size: 11.5px; color: #15803d; font-weight: 700;">₹18,000</td>
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
                <tr class="subtotal-row" style="border-bottom: 2px solid #94a3b8; background: #fffbeb;">
                  <td colspan="5" style="text-align: right; color: #92400e; font-weight: 700;">↳ Flat A-1002 Subtotal Payable (Inv: ME/A/17/Oct-26, Arrears ₹13,200 + Current ₹18,000): <span style="background: #fef3c7; color: #b45309; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: 800; border: 1px solid #fde68a;">⏳ PENDING</span></td>
                  <td style="text-align: right; font-family: monospace; font-size: 11.5px; color: #b45309; font-weight: 800;">₹31,200</td>
                </tr>

                <!-- Grand Total -->
                <tr class="grand-total-row">
                  <td colspan="5" style="text-align: right; letter-spacing: 0.5px;">TOTAL COMBINED PAYABLE (ALL THREE FLATS):</td>
                  <td style="text-align: right; font-family: monospace; font-size: 14px; color: #4ade80;">₹${formatValue(combGrandTotal)}</td>
                </tr>

                <!-- Payment Received & Net Due -->
                <tr style="background: #f0fdf4; font-weight: 700; border-top: 1px solid #86efac;">
                  <td colspan="5" style="text-align: right; color: #166534; font-size: 11px;">Less: Payment Received Today (23-Oct-2026) for Flats A-302 &amp; A-904:</td>
                  <td style="text-align: right; font-family: monospace; font-size: 12.5px; color: #15803d; font-weight: 800;">(-) ₹36,000</td>
                </tr>
                <tr style="background: #fffbeb; font-weight: 800; border-top: 2px solid #fde68a; border-bottom: 2px solid #f59e0b;">
                  <td colspan="5" style="text-align: right; color: #92400e; font-size: 11.5px; letter-spacing: 0.5px;">NET OUTSTANDING BALANCE DUE (FLAT A-1002 ONLY):</td>
                  <td style="text-align: right; font-family: monospace; font-size: 14px; color: #b45309;">₹31,200</td>
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
    <div className="common-invoice-hub-s1">
      
      {/* ── Executive Hero Banner ── */}
      <div className="common-invoice-hub-s2">
        <div className="common-invoice-hub-s3">
          <div>
            <div className="common-invoice-hub-s4">
              <span className="common-invoice-hub-s5">
                🏛️ Society Billing &amp; Invoicing Center
              </span>
            </div>
            <h2 className="common-invoice-hub-s6">
              🧾 Common Invoice &amp; Demand Notice Hub
            </h2>
            <p className="common-invoice-hub-s7">
              Select month range (Start Month &amp; End Month) to auto-calculate <strong>Maintenance (₹2,850/mo)</strong> + <strong>Sinking Fund (₹150/mo)</strong>.
            </p>
          </div>

          <div className="common-invoice-hub-s8">
            <div className="common-invoice-hub-s9">
              <div className="common-invoice-hub-s10">Base Tariff</div>
              <div className="common-invoice-hub-s11">₹3,000 / mo</div>
              <div className="common-invoice-hub-s12">Maint ₹2,850 + Sinking ₹150</div>
            </div>
            <div className="common-invoice-hub-s13">
              <div className="common-invoice-hub-s10">Remittance Bank</div>
              <div className="common-invoice-hub-s14">HDFC Bank</div>
              <div className="common-invoice-hub-s15">A/C 50200075533530</div>
            </div>
          </div>
        </div>

        {/* Category Switcher Tabs */}
        <div className="common-invoice-hub-s16">
          {[
            { id: 'combined_3flats', label: '🏢 Times Horizon (TOI) Combined 3-Flats Bill (₹67,200)', emoji: '🏛️' },
            { id: 'month_range', label: '📅 Month-Range (Maintenance + Sinking)', emoji: '🧮' },
            { id: 'all_hub', label: '🌟 All Invoice Systems', emoji: '📑' },
            { id: 'shops', label: '🏬 Commercial Shops (1-8)', emoji: '🏪' },
            { id: 'tata', label: '⚡ Tata Electricity Bill', emoji: '🔌' },
            { id: 'custom', label: '✨ Custom Invoice Builder', emoji: '✍️' },
          ].map(tab => {
            const isSel = activeCategory === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveCategory(tab.id)}
                className="common-invoice-hub-s17" style={{ border: isSel ? '2px solid #C49B4F' : '1px solid rgba(255, 255, 255, 0.22)', background: isSel ? 'linear-gradient(135deg, #C49B4F 0%, #b38634 100%)' : 'rgba(255, 255, 255, 0.1)', color: isSel ? '#0b2b26' : '#ffffff', boxShadow: isSel ? '0 4px 14px rgba(196,155,79,0.35)' : 'none' }}
              >
                <span>{tab.emoji}</span>
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── View 1: MONTH-RANGE MAINTENANCE & SINKING CALCULATOR ── */}
      {activeCategory === 'month_range' && (
        <div className="common-invoice-hub-s18">
          
          {/* Quick Settlement Notice Banner */}
          <div className="common-invoice-hub-s19">
            <div className="common-invoice-hub-s20">
              <span className="common-invoice-hub-s21">🏛️</span>
              <div>
                <div className="common-invoice-hub-s22">
                  Times Horizon (TOI) Combined 3-Flats Settlement (Flats A-302, A-904, A-1002)
                </div>
                <div className="common-invoice-hub-s23">
                  ✓ <strong>₹18,000 each</strong> received today (23-Oct-2026) for <strong>Flats A-302 &amp; A-904</strong> (Total ₹36,000). Flat A-1002 balance: <strong>₹31,200 pending</strong>.
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setActiveCategory('combined_3flats')}
              className="common-invoice-hub-s24"
            >
              <span>🏢</span> View 3-Flats Statement &amp; Payments →
            </button>
          </div>

          <div className="common-invoice-hub-s25">
            <div className="common-invoice-hub-s26">
              <span className="common-invoice-hub-s27">
                ⚡ Auto-Calculated for {calcMonthsCount} Month{calcMonthsCount !== 1 ? 's' : ''} ({formatMonthYearLabel(calcStartMonth)} to {formatMonthYearLabel(calcEndMonth)})
              </span>
            </div>
            {calcToast && (
              <span className="common-invoice-hub-s28">
                {calcToast}
              </span>
            )}
          </div>

          <div className="common-invoice-hub-s29">
            
            {/* Left Column: Month Selector & Tariff Controls */}
            <div className="common-invoice-hub-s30">
              
              <div className="common-invoice-hub-s31">
                <div>
                  <span className="common-invoice-hub-s32">
                    Flat Billing Parameters
                  </span>
                  <h3 className="common-invoice-hub-s33">
                    🧮 Select Months &amp; Dues
                  </h3>
                </div>
                <div className="common-invoice-hub-s34">
                  <button
                    type="button"
                    onClick={() => setCalcDocType('invoice')}
                    className="common-invoice-hub-s35" style={{ background: calcDocType === 'invoice' ? '#0b2b26' : '#f1f5f9', color: calcDocType === 'invoice' ? '#C49B4F' : '#64748b' }}
                  >
                    Invoice
                  </button>
                  <button
                    type="button"
                    onClick={() => setCalcDocType('notice')}
                    className="common-invoice-hub-s35" style={{ background: calcDocType === 'notice' ? '#92400e' : '#f1f5f9', color: calcDocType === 'notice' ? '#fff' : '#64748b' }}
                  >
                    Notice
                  </button>
                </div>
              </div>

              {/* Flat Picker */}
              <div>
                <label className="common-invoice-hub-s36">
                  1. Select Target Flat (Resident Flats)
                </label>
                <div className="common-invoice-hub-s37">
                  {['A-302', 'A-904', 'A-1002'].map(fId => (
                    <button
                      key={fId}
                      type="button"
                      onClick={() => {
                        setCalcFlat(fId);
                        if (fId === 'A-1002') {
                          setCalcIncludeEarlierPending(true);
                        } else {
                          setCalcIncludeEarlierPending(false);
                        }
                      }}
                      className="common-invoice-hub-s38" style={{ border: calcFlat === fId ? '2px solid #0b2b26' : '1px solid #cbd5e1', background: calcFlat === fId ? '#0b2b26' : '#fff', color: calcFlat === fId ? '#C49B4F' : '#334155' }}
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
                  className="common-invoice-hub-s39"
                />
              </div>

              {/* Start Month and End Month Picker */}
              <div className="common-invoice-hub-s40">
                <div className="common-invoice-hub-s41">
                  <span className="common-invoice-hub-s42">
                    2. Select Billing Month Range
                  </span>
                  <span className="common-invoice-hub-s43">
                    {calcMonthsCount} Months Counted
                  </span>
                </div>

                <div className="common-invoice-hub-s44">
                  <div>
                    <label className="common-invoice-hub-s45">
                      Start Month
                    </label>
                    <input
                      type="month"
                      value={calcStartMonth}
                      onChange={(e) => setCalcStartMonth(e.target.value)}
                      className="common-invoice-hub-s46"
                    />
                  </div>
                  <div>
                    <label className="common-invoice-hub-s45">
                      End Month
                    </label>
                    <input
                      type="month"
                      value={calcEndMonth}
                      onChange={(e) => setCalcEndMonth(e.target.value)}
                      className="common-invoice-hub-s46"
                    />
                  </div>
                </div>

                {/* Quick Presets */}
                <div>
                  <div className="common-invoice-hub-s47">Quick Range Presets:</div>
                  <div className="common-invoice-hub-s48">
                    <button type="button" onClick={() => applyMonthPreset('2026-10', '2027-03')} className="common-invoice-hub-s49">
                      Oct 26 – Mar 27 (Current 6m)
                    </button>
                    <button type="button" onClick={() => applyMonthPreset('2024-04', '2025-03')} className="common-invoice-hub-s50">
                      FY 24-25 (12m)
                    </button>
                    <button type="button" onClick={() => applyMonthPreset('2025-04', '2026-03')} className="common-invoice-hub-s50">
                      FY 25-26 (12m)
                    </button>
                    <button type="button" onClick={() => applyMonthPreset('2026-04', '2026-09')} className="common-invoice-hub-s50">
                      Last 6 Mos
                    </button>
                    <button type="button" onClick={() => applyMonthPreset('2024-04', '2026-03')} className="common-invoice-hub-s51">
                      2-Year FY 24-26
                    </button>
                  </div>
                </div>
              </div>

              {/* Tariff Rates & Automatic Calculations */}
              <div className="common-invoice-hub-s52">
                <span className="common-invoice-hub-s42">
                  3. Tariff Rates &amp; Dynamic Calculation
                </span>

                <div className="common-invoice-hub-s44">
                  <div className="common-invoice-hub-s53">
                    <label className="common-invoice-hub-s54">
                      Maintenance Rate (₹/mo)
                    </label>
                    <input
                      type="number"
                      value={calcMaintenanceRate}
                      onChange={(e) => setCalcMaintenanceRate(Number(e.target.value) || 0)}
                      className="common-invoice-hub-s55"
                    />
                    <div className="common-invoice-hub-s56">
                      {calcMonthsCount} mos × ₹{formatValue(calcMaintenanceRate)} = <strong>₹{formatValue(calcMaintenanceTotal)}</strong>
                    </div>
                  </div>

                  <div className="common-invoice-hub-s53">
                    <label className="common-invoice-hub-s54">
                      Sinking Fund Rate (₹/mo)
                    </label>
                    <input
                      type="number"
                      value={calcSinkingFundRate}
                      onChange={(e) => setCalcSinkingFundRate(Number(e.target.value) || 0)}
                      className="common-invoice-hub-s55"
                    />
                    <div className="common-invoice-hub-s56">
                      {calcMonthsCount} mos × ₹{formatValue(calcSinkingFundRate)} = <strong>₹{formatValue(calcSinkingFundTotal)}</strong>
                    </div>
                  </div>
                </div>

                {/* Earlier Pending Arrears Toggle (Specifically for A-1002 or Arrears Recovery) */}
                <div className="common-invoice-hub-s57" style={{ background: calcIncludeEarlierPending ? '#fff7ed' : '#f8fafc', border: `1px solid ${calcIncludeEarlierPending ? '#fdba74' : '#e2e8f0'}` }}>
                  <label className="common-invoice-hub-s58">
                    <input
                      type="checkbox"
                      checked={calcIncludeEarlierPending}
                      onChange={(e) => setCalcIncludeEarlierPending(e.target.checked)}
                      className="common-invoice-hub-s59"
                    />
                    <span>Include Earlier Pending Arrears (Oct 2024 – Mar 2025): ₹13,200</span>
                  </label>
                  {calcIncludeEarlierPending && (
                    <div className="common-invoice-hub-s60">
                      <div>• Maintenance: ₹2,100 × 6 mos = <strong>₹12,600</strong></div>
                      <div>• Sinking Fund: ₹100 × 6 mos = <strong>₹600</strong></div>
                      <div>• Total Arrears: <strong>₹13,200</strong></div>
                    </div>
                  )}
                </div>

                {/* Grand Total Summary Box */}
                <div className="common-invoice-hub-s61">
                  <div>
                    <div className="common-invoice-hub-s62">
                      Grand Total Payable ({calcMonthsCount} Mos)
                    </div>
                    <div className="common-invoice-hub-s63">
                      Maint (₹{formatValue(calcMaintenanceTotal)}) + Sinking (₹{formatValue(calcSinkingFundTotal)}) {calcIncludeEarlierPending ? `+ Arrears (₹13,200)` : ''}
                    </div>
                  </div>
                  <div className="common-invoice-hub-s64">
                    ₹{formatValue(calcGrandTotal)}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="common-invoice-hub-s65">
                <button
                  type="button"
                  onClick={handlePrintCalcInvoice}
                  className="common-invoice-hub-s66"
                >
                  <span>🖨️</span> Print / Save PDF
                </button>
                <button
                  type="button"
                  onClick={handleShareCalcWhatsApp}
                  className="common-invoice-hub-s67"
                >
                  <span>📱</span> WhatsApp
                </button>
                <button
                  type="button"
                  onClick={handleCopyCalcText}
                  className="common-invoice-hub-s68"
                >
                  📋 Copy
                </button>
              </div>

            </div>

            {/* Right Column: Live Letterhead Preview */}
            <div className="common-invoice-hub-s69">
              <div className="common-invoice-hub-s70">
                {/* Letterhead */}
                <div className="common-invoice-hub-s71">
                  <div className="common-invoice-hub-s72">
                    MAJESTIQUE EURISKA 'A' BUILDING CO-OP HOUSING SOCIETY LTD.
                  </div>
                  <div className="common-invoice-hub-s73">
                    Reg. No: PNA/PNA (4)/HSG/(TC)/21207/2019-20 • Mohammed Wadi, Pune - 411060
                  </div>
                  <span className="common-invoice-hub-s74">
                    {calcDocType === 'invoice' ? 'MAINTENANCE & SUBSCRIPTION TAX INVOICE' : 'FORMAL DEMAND NOTICE'}
                  </span>
                </div>

                {/* Ref & Date */}
                <div className="common-invoice-hub-s75">
                  <div><strong>No:</strong> {calcInvoiceNo}</div>
                  <div><strong>Date:</strong> {formatDisplayDate(calcInvoiceDate)}</div>
                  <div><strong>Due:</strong> <span className="common-invoice-hub-s76">{formatDisplayDate(calcDueDate)}</span></div>
                </div>

                {/* Recipient */}
                <div className="common-invoice-hub-s77">
                  <div className="common-invoice-hub-s78">BILLED TO:</div>
                  <div className="common-invoice-hub-s79">Flat {calcFlat}</div>
                  <div className="common-invoice-hub-s80">{calcFlatSubtext}</div>
                </div>

                {/* Subject */}
                <div className="common-invoice-hub-s81">
                  <strong>SUBJECT:</strong> MAINTENANCE &amp; DUES BILLING ({formatMonthYearLabel(calcStartMonth)} to {formatMonthYearLabel(calcEndMonth)} • {calcMonthsCount} MONTHS)
                </div>

                {/* Table */}
                <table className="common-invoice-hub-s82">
                  <thead>
                    <tr className="common-invoice-hub-s83">
                      <th className="common-invoice-hub-s84">Particulars</th>
                      <th className="common-invoice-hub-s85">Months</th>
                      <th className="common-invoice-hub-s85">Rate / Mo</th>
                      <th className="common-invoice-hub-s86">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="common-invoice-hub-s87">
                      <td className="common-invoice-hub-s88">Flat Maintenance Charges</td>
                      <td className="common-invoice-hub-s85">{calcMonthsCount} mos</td>
                      <td className="common-invoice-hub-s85">₹{formatValue(calcMaintenanceRate)}</td>
                      <td className="common-invoice-hub-s89">₹{formatValue(calcMaintenanceTotal)}</td>
                    </tr>
                    <tr className="common-invoice-hub-s87">
                      <td className="common-invoice-hub-s88">Sinking Fund Contribution</td>
                      <td className="common-invoice-hub-s85">{calcMonthsCount} mos</td>
                      <td className="common-invoice-hub-s85">₹{formatValue(calcSinkingFundRate)}</td>
                      <td className="common-invoice-hub-s89">₹{formatValue(calcSinkingFundTotal)}</td>
                    </tr>
                    {calcIncludeEarlierPending && (
                      <>
                        <tr className="common-invoice-hub-s90">
                          <td className="common-invoice-hub-s91">Earlier Pending Maint (Oct 24 – Mar 25)</td>
                          <td className="common-invoice-hub-s92">6 mos</td>
                          <td className="common-invoice-hub-s92">₹2,100</td>
                          <td className="common-invoice-hub-s93">₹12,600</td>
                        </tr>
                        <tr className="common-invoice-hub-s90">
                          <td className="common-invoice-hub-s91">Earlier Pending Sinking Fund (Oct 24 – Mar 25)</td>
                          <td className="common-invoice-hub-s92">6 mos</td>
                          <td className="common-invoice-hub-s92">₹100</td>
                          <td className="common-invoice-hub-s93">₹600</td>
                        </tr>
                      </>
                    )}
                    <tr className="common-invoice-hub-s94">
                      <td colSpan={3} className="common-invoice-hub-s95">TOTAL NET PAYABLE:</td>
                      <td className="common-invoice-hub-s96">₹{formatValue(calcGrandTotal)}</td>
                    </tr>
                  </tbody>
                </table>

                {/* Remittance Box */}
                <div className="common-invoice-hub-s97">
                  <div className="common-invoice-hub-s98">🏦 HDFC Bank Remittance Info:</div>
                  <div>• A/C: <strong>50200075533530</strong> • IFSC: <strong>HDFC0002454</strong></div>
                  <div>• Name: MAJESTIQUE EURISKA A BLDG SA GRU SAN MAR</div>
                </div>

                {/* Notes */}
                <div className="common-invoice-hub-s99">
                  <strong>Notes:</strong> {calcNotes}
                </div>

                {/* Signatures */}
                <div className="common-invoice-hub-s100">
                  <div className="common-invoice-hub-s101">
                    <div className="common-invoice-hub-s102">Seal</div>
                    <div className="common-invoice-hub-s103">Estate Manager</div>
                  </div>
                  <div className="common-invoice-hub-s101">
                    <div className="common-invoice-hub-s102">Verified</div>
                    <div className="common-invoice-hub-s103">Hon. Secretary</div>
                  </div>
                  <div className="common-invoice-hub-s101">
                    <div className="common-invoice-hub-s102">Approved</div>
                    <div className="common-invoice-hub-s103">Hon. Treasurer</div>
                  </div>
                </div>

              </div>
            </div>

          </div>
        </div>
      )}

      {/* ── View 2: ALL HUB OVERVIEW ── */}
      {activeCategory === 'all_hub' && (
        <div className="common-invoice-hub-s104">
          <div className="common-invoice-hub-s105">
            
            {/* Card: Combined 3-Flats Bill (A-302, A-904, A-1002 — ₹67,200) */}
            <div className="common-invoice-hub-s106">
              <div>
                <div className="common-invoice-hub-s107">
                  <span className="common-invoice-hub-s108">
                    3-Flats Combined
                  </span>
                  <span className="common-invoice-hub-s109">🏛️</span>
                </div>
                <h3 className="common-invoice-hub-s110">
                  Combined 3-Flats Bill (₹67,200)
                </h3>
                <p className="common-invoice-hub-s111">
                  Flats A-302 (₹18,000), A-904 (₹18,000), and A-1002 (₹31,200 with arrears). Complete combined bill with HDFC bank details, WhatsApp notice, and printable letterhead PDF.
                </p>
              </div>
              <div className="common-invoice-hub-s112">
                <button
                  type="button"
                  onClick={() => setActiveCategory('combined_3flats')}
                  className="common-invoice-hub-s113"
                >
                  <span>🏛️</span> Open Combined 3-Flats Bill
                </button>
              </div>
            </div>

            {/* Card 0: Month-Range Calculator */}
            <div className="common-invoice-hub-s114">
              <div>
                <div className="common-invoice-hub-s107">
                  <span className="common-invoice-hub-s108">
                    Primary Calculator
                  </span>
                  <span className="common-invoice-hub-s109">🧮</span>
                </div>
                <h3 className="common-invoice-hub-s110">
                  Month-Range (Maintenance + Sinking)
                </h3>
                <p className="common-invoice-hub-s111">
                  Select Start &amp; End Month: auto-calculates <strong>Maintenance (₹2,850/mo)</strong> + <strong>Sinking Fund (₹150/mo)</strong> for any number of selected months.
                </p>
              </div>
              <div className="common-invoice-hub-s112">
                <button
                  type="button"
                  onClick={() => setActiveCategory('month_range')}
                  className="common-invoice-hub-s113"
                >
                  <span>🧮</span> Open Month Calculator
                </button>
              </div>
            </div>

            {/* Card 1: Commercial Shops */}
            <div className="common-invoice-hub-s115">
              <div>
                <div className="common-invoice-hub-s107">
                  <span className="common-invoice-hub-s116">
                    Commercial Wing
                  </span>
                  <span className="common-invoice-hub-s109">🏬</span>
                </div>
                <h3 className="common-invoice-hub-s117">
                  Commercial Shops (Shop 1 – 8)
                </h3>
                <p className="common-invoice-hub-s118">
                  Monthly maintenance dues (₹1,500/mo), statements, demand notices, and individual/batch invoice generation with letterhead.
                </p>
              </div>
              <div className="common-invoice-hub-s112">
                <button
                  type="button"
                  onClick={() => setActiveCategory('shops')}
                  className="common-invoice-hub-s119"
                >
                  <span>🧾</span> Open Shop Invoices
                </button>
              </div>
            </div>

            {/* Card 2: Tata Electricity */}
            <div className="common-invoice-hub-s115">
              <div>
                <div className="common-invoice-hub-s107">
                  <span className="common-invoice-hub-s120">
                    Sub-Meter Billing
                  </span>
                  <span className="common-invoice-hub-s109">⚡</span>
                </div>
                <h3 className="common-invoice-hub-s117">
                  Tata Electricity Sub-Meter
                </h3>
                <p className="common-invoice-hub-s118">
                  Tata Play Hub sub-meter with 10,000 unit reset rollover principle: <code className="common-invoice-hub-s121">(10k - A) + B</code> @ ₹13.00/unit.
                </p>
              </div>
              <div className="common-invoice-hub-s112">
                <button
                  type="button"
                  onClick={() => setActiveCategory('tata')}
                  className="common-invoice-hub-s122"
                >
                  <span>⚡</span> Open Tata Electricity
                </button>
              </div>
            </div>

            {/* Card 4: Custom Invoice Builder */}
            <div className="common-invoice-hub-s115">
              <div>
                <div className="common-invoice-hub-s107">
                  <span className="common-invoice-hub-s123">
                    On-Demand Creator
                  </span>
                  <span className="common-invoice-hub-s109">✍️</span>
                </div>
                <h3 className="common-invoice-hub-s117">
                  Custom Society Invoice Builder
                </h3>
                <p className="common-invoice-hub-s118">
                  Generate custom society bills, penalty notices, vendor demand notes, or resident invoices with dynamic line items.
                </p>
              </div>
              <div className="common-invoice-hub-s112">
                <button
                  type="button"
                  onClick={() => setActiveCategory('custom')}
                  className="common-invoice-hub-s124"
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
          <div className="common-invoice-hub-s125">
            <button
              type="button"
              onClick={() => setActiveCategory('month_range')}
              className="common-invoice-hub-s126"
            >
              ← Back to Month-Range Calculator
            </button>
            <span className="common-invoice-hub-s127">Commercial Wing (Shop 1 – 8)</span>
          </div>
          <ShopMaintenanceTracker isAdmin={isAdmin} />
        </div>
      )}

      {/* ── View 4: TATA ELECTRICITY MODULE ── */}
      {activeCategory === 'tata' && (
        <div>
          <div className="common-invoice-hub-s125">
            <button
              type="button"
              onClick={() => setActiveCategory('month_range')}
              className="common-invoice-hub-s126"
            >
              ← Back to Month-Range Calculator
            </button>
            <span className="common-invoice-hub-s127">Tata Play Sub-Meter Billing &amp; Invoices</span>
          </div>
          <ElectricityTracker isAdmin={isAdmin} />
        </div>
      )}


      {/* ── View 6: CUSTOM INVOICE BUILDER ── */}
      {activeCategory === 'custom' && (
        <div className="common-invoice-hub-s18">
          <div className="common-invoice-hub-s128">
            <button
              type="button"
              onClick={() => setActiveCategory('month_range')}
              className="common-invoice-hub-s126"
            >
              ← Back to Month-Range Calculator
            </button>
            {customToast && (
              <span className="common-invoice-hub-s28">
                {customToast}
              </span>
            )}
          </div>

          <div className="common-invoice-hub-s29">
            
            {/* Left Column: Form Controls */}
            <div className="common-invoice-hub-s30">
              
              <div className="common-invoice-hub-s31">
                <h3 className="common-invoice-hub-s129">
                  ✍️ Custom Invoice Configuration
                </h3>
                <div className="common-invoice-hub-s34">
                  <button
                    type="button"
                    onClick={() => setCustomDocType('invoice')}
                    className="common-invoice-hub-s130" style={{ background: customDocType === 'invoice' ? '#0b2b26' : '#f1f5f9', color: customDocType === 'invoice' ? '#C49B4F' : '#64748b' }}
                  >
                    Invoice
                  </button>
                  <button
                    type="button"
                    onClick={() => setCustomDocType('notice')}
                    className="common-invoice-hub-s130" style={{ background: customDocType === 'notice' ? '#92400e' : '#f1f5f9', color: customDocType === 'notice' ? '#fff' : '#64748b' }}
                  >
                    Notice
                  </button>
                </div>
              </div>

              {/* Recipient & Reference */}
              <div className="common-invoice-hub-s52">
                <div>
                  <label className="common-invoice-hub-s131">
                    Invoice / Notice Number
                  </label>
                  <input
                    type="text"
                    value={customInvoiceNo}
                    onChange={(e) => setCustomInvoiceNo(e.target.value)}
                    className="common-invoice-hub-s132"
                  />
                </div>

                <div className="common-invoice-hub-s44">
                  <div>
                    <label className="common-invoice-hub-s131">
                      Issue Date
                    </label>
                    <input
                      type="date"
                      value={customDate}
                      onChange={(e) => setCustomDate(e.target.value)}
                      className="common-invoice-hub-s133"
                    />
                  </div>
                  <div>
                    <label className="common-invoice-hub-s134">
                      Payment Due Date
                    </label>
                    <input
                      type="date"
                      value={customDueDate}
                      onChange={(e) => setCustomDueDate(e.target.value)}
                      className="common-invoice-hub-s135"
                    />
                  </div>
                </div>

                <div>
                  <label className="common-invoice-hub-s131">
                    Billed To (Name / Flat / Shop)
                  </label>
                  <input
                    type="text"
                    value={customRecipientName}
                    onChange={(e) => setCustomRecipientName(e.target.value)}
                    placeholder="e.g. Flat A-302, Shop 5, or Vendor Name"
                    className="common-invoice-hub-s136"
                  />
                </div>

                <div>
                  <label className="common-invoice-hub-s131">
                    Address / Subtext
                  </label>
                  <input
                    type="text"
                    value={customRecipientSubtext}
                    onChange={(e) => setCustomRecipientSubtext(e.target.value)}
                    className="common-invoice-hub-s133"
                  />
                </div>

                <div>
                  <label className="common-invoice-hub-s131">
                    Subject Line
                  </label>
                  <input
                    type="text"
                    value={customSubject}
                    onChange={(e) => setCustomSubject(e.target.value)}
                    className="common-invoice-hub-s132"
                  />
                </div>
              </div>

              {/* Line Items */}
              <div>
                <div className="common-invoice-hub-s107">
                  <label className="common-invoice-hub-s137">
                    Line Items ({customItems.length})
                  </label>
                  <button
                    type="button"
                    onClick={handleAddCustomItem}
                    className="common-invoice-hub-s138"
                  >
                    + Add Item
                  </button>
                </div>

                <div className="common-invoice-hub-s139">
                  {customItems.map((item, idx) => (
                    <div key={item.id} className="common-invoice-hub-s140">
                      <div className="common-invoice-hub-s41">
                        <span className="common-invoice-hub-s141">Item #{idx + 1}</span>
                        {customItems.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveCustomItem(item.id)}
                            className="common-invoice-hub-s142"
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
                        className="common-invoice-hub-s143"
                      />
                      <div className="common-invoice-hub-s144">
                        <input
                          type="text"
                          value={item.period}
                          placeholder="Period"
                          onChange={(e) => handleUpdateCustomItem(item.id, 'period', e.target.value)}
                          className="common-invoice-hub-s143"
                        />
                        <input
                          type="number"
                          value={item.amount}
                          placeholder="Amount (₹)"
                          onChange={(e) => handleUpdateCustomItem(item.id, 'amount', Number(e.target.value) || 0)}
                          className="common-invoice-hub-s145"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="common-invoice-hub-s131">
                  Instructions &amp; Payment Notes
                </label>
                <textarea
                  rows={2}
                  value={customNotes}
                  onChange={(e) => setCustomNotes(e.target.value)}
                  className="common-invoice-hub-s146"
                />
              </div>

              {/* Action Buttons */}
              <div className="common-invoice-hub-s65">
                <button
                  type="button"
                  onClick={handlePrintCustomInvoice}
                  className="common-invoice-hub-s66"
                >
                  <span>🖨️</span> Print / Save PDF
                </button>
                <button
                  type="button"
                  onClick={handleShareCustomWhatsApp}
                  className="common-invoice-hub-s67"
                >
                  <span>📱</span> WhatsApp
                </button>
                <button
                  type="button"
                  onClick={handleCopyCustomText}
                  className="common-invoice-hub-s68"
                >
                  📋 Copy
                </button>
              </div>

            </div>

            {/* Right Column: Live A4 Letterhead Preview */}
            <div className="common-invoice-hub-s69">
              <div className="common-invoice-hub-s70">
                {/* Letterhead */}
                <div className="common-invoice-hub-s71">
                  <div className="common-invoice-hub-s72">
                    MAJESTIQUE EURISKA 'A' BUILDING CO-OP HOUSING SOCIETY LTD.
                  </div>
                  <div className="common-invoice-hub-s73">
                    Reg. No: PNA/PNA (4)/HSG/(TC)/21207/2019-20 • Mohammed Wadi, Pune - 411060
                  </div>
                  <span className="common-invoice-hub-s74">
                    {customDocType === 'invoice' ? 'TAX INVOICE / BILL' : 'DEMAND NOTICE'}
                  </span>
                </div>

                {/* Ref & Date */}
                <div className="common-invoice-hub-s75">
                  <div><strong>No:</strong> {customInvoiceNo}</div>
                  <div><strong>Date:</strong> {formatDisplayDate(customDate)}</div>
                  <div><strong>Due:</strong> <span className="common-invoice-hub-s76">{formatDisplayDate(customDueDate)}</span></div>
                </div>

                {/* Recipient */}
                <div className="common-invoice-hub-s77">
                  <div className="common-invoice-hub-s78">BILLED TO:</div>
                  <div className="common-invoice-hub-s79">{customRecipientName}</div>
                  <div className="common-invoice-hub-s80">{customRecipientSubtext}</div>
                </div>

                {/* Subject */}
                <div className="common-invoice-hub-s81">
                  <strong>SUBJECT:</strong> {customSubject.toUpperCase()}
                </div>

                {/* Table */}
                <table className="common-invoice-hub-s82">
                  <thead>
                    <tr className="common-invoice-hub-s83">
                      <th className="common-invoice-hub-s84">Particulars</th>
                      <th className="common-invoice-hub-s85">Period</th>
                      <th className="common-invoice-hub-s86">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {customItems.map((item) => (
                      <tr key={item.id} className="common-invoice-hub-s87">
                        <td className="common-invoice-hub-s88">{item.description}</td>
                        <td className="common-invoice-hub-s147">{item.period}</td>
                        <td className="common-invoice-hub-s89">₹{formatValue(item.amount)}</td>
                      </tr>
                    ))}
                    <tr className="common-invoice-hub-s94">
                      <td colSpan={2} className="common-invoice-hub-s95">TOTAL PAYABLE:</td>
                      <td className="common-invoice-hub-s96">₹{formatValue(customTotalAmount)}</td>
                    </tr>
                  </tbody>
                </table>

                {/* Remittance Box */}
                <div className="common-invoice-hub-s97">
                  <div className="common-invoice-hub-s98">🏦 HDFC Bank Remittance:</div>
                  <div>• A/C: <strong>50200075533530</strong> • IFSC: <strong>HDFC0002454</strong></div>
                  <div>• Name: MAJESTIQUE EURISKA A BLDG SA GRU SAN MAR</div>
                </div>

                {/* Notes */}
                <div className="common-invoice-hub-s99">
                  <strong>Notes:</strong> {customNotes}
                </div>

                {/* Signatures */}
                <div className="common-invoice-hub-s100">
                  <div className="common-invoice-hub-s101">
                    <div className="common-invoice-hub-s102">Seal</div>
                    <div className="common-invoice-hub-s103">Estate Manager</div>
                  </div>
                  <div className="common-invoice-hub-s101">
                    <div className="common-invoice-hub-s102">Verified</div>
                    <div className="common-invoice-hub-s103">Hon. Secretary</div>
                  </div>
                  <div className="common-invoice-hub-s101">
                    <div className="common-invoice-hub-s102">Approved</div>
                    <div className="common-invoice-hub-s103">Hon. Treasurer</div>
                  </div>
                </div>

              </div>
            </div>

          </div>
        </div>
      )}

      {/* ── View: COMBINED 3-FLATS BILL (FLATS A-302, A-904, A-1002 — ₹67,200) ── */}
      {activeCategory === 'combined_3flats' && (() => {
        const activeFlat = combFlats.find(f => f.id === combActiveTab) || combFlats[0];
        const isCombinedView = combActiveTab === 'combined';

        return (
        <div className="common-invoice-hub-s148">
          {/* Top Bar with Status and Actions */}
          <div className="common-invoice-hub-s149">
            <div className="common-invoice-hub-s150">
              <span className="common-invoice-hub-s151">
                🏛️ Combined 3-Flats Demand Notice (A-302, A-904, A-1002)
              </span>
              <span className="common-invoice-hub-s152">
                📰 Official Times of India (Times Horizon Private Limited) Template
              </span>
              <span className="common-invoice-hub-s153">
                Current Maintenance + Oct 2024 Arrears
              </span>
            </div>

            {combToast && (
              <span className="common-invoice-hub-s154">
                {combToast}
              </span>
            )}

            <div className="common-invoice-hub-s155">
              {!isCombinedView && (
                <button
                  type="button"
                  onClick={() => handlePrintSingleFlatInvoice(activeFlat.id)}
                  className="common-invoice-hub-s156"
                >
                  <span>🖨️</span> Print Official Invoice (Flat {activeFlat.flatNo})
                </button>
              )}
              <button
                type="button"
                onClick={handlePrintBatchAllFlats}
                className="common-invoice-hub-s157"
              >
                <span>📑</span> Batch Print All 3 Invoices (A4)
              </button>
              <button
                type="button"
                onClick={handlePrintCombInvoice}
                className="common-invoice-hub-s158"
              >
                <span>🖨️</span> Print / Download Combined PDF
              </button>
              <button
                type="button"
                onClick={handleShareCombWhatsApp}
                className="common-invoice-hub-s159"
              >
                <span>📱</span> Send WhatsApp
              </button>
              <button
                type="button"
                onClick={handleCopyCombText}
                className="common-invoice-hub-s160"
              >
                <span>📋</span> Copy Full Notice
              </button>
            </div>
          </div>

          {/* Sub-tab Switcher: Flat A-302, Flat A-904, Flat A-1002, Combined Summary */}
          <div className="common-invoice-hub-s161">
            <span className="common-invoice-hub-s162">
              Select Official Invoice View:
            </span>
            {combFlats.map(flat => {
              const isSelected = combActiveTab === flat.id;
              return (
                <button
                  key={flat.id}
                  type="button"
                  onClick={() => setCombActiveTab(flat.id)}
                  className="common-invoice-hub-s163" style={{ border: isSelected ? '2px solid #1e3a8a' : '1px solid #cbd5e1', background: isSelected ? '#1e3a8a' : '#ffffff', color: isSelected ? '#ffffff' : '#0f172a', boxShadow: isSelected ? '0 3px 10px rgba(30,58,138,0.25)' : 'none' }}
                >
                  <span>📄</span>
                  <span>Flat {flat.flatNo} ({flat.invoiceNo})</span>
                  <span className="common-invoice-hub-s164" style={{ background: isSelected ? '#38bdf8' : '#f1f5f9', color: isSelected ? '#0f172a' : '#475569' }}>
                    ₹{flat.total.toLocaleString('en-IN')}
                  </span>
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => setCombActiveTab('combined')}
              className="common-invoice-hub-s163" style={{ border: isCombinedView ? '2px solid #0b2b26' : '1px solid #cbd5e1', background: isCombinedView ? '#0b2b26' : '#ffffff', color: isCombinedView ? '#ffffff' : '#0f172a', boxShadow: isCombinedView ? '0 3px 10px rgba(11,43,38,0.25)' : 'none' }}
            >
              <span>📊</span>
              <span>Combined 3-Flats Summary</span>
              <span className="common-invoice-hub-s164" style={{ background: isCombinedView ? '#4ade80' : '#dcfce7', color: isCombinedView ? '#0b2b26' : '#166534' }}>
                ₹67,200
              </span>
            </button>
          </div>

          {/* 3-Flats Dues Breakdown Cards Grid */}
          <div className="common-invoice-hub-s165">
            {/* Flat A-302 */}
            <div
              onClick={() => setCombActiveTab('A-302')}
              className="common-invoice-hub-s166" style={{ border: combActiveTab === 'A-302' ? '2.5px solid #16a34a' : '1px solid #bbf7d0', boxShadow: combActiveTab === 'A-302' ? '0 6px 20px rgba(22,163,74,0.18)' : '0 4px 16px rgba(0,0,0,0.04)' }}
            >
              <div>
                <div className="common-invoice-hub-s167">
                  <span className="common-invoice-hub-s168">
                    FLAT A-302
                  </span>
                  <span className="common-invoice-hub-s169">
                    ✓ PAID (23-10-2026)
                  </span>
                </div>
                <div className="common-invoice-hub-s170">
                  <div className="common-invoice-hub-s171">
                    ₹18,000
                  </div>
                  <div className="common-invoice-hub-s172">
                    Balance: ₹0 (Paid)
                  </div>
                </div>
                <div className="common-invoice-hub-s173">
                  Inv No: ME/A/18/Oct26
                </div>
                <div className="common-invoice-hub-s174">
                  <div className="common-invoice-hub-s175">
                    <span>• Maintenance (₹2,850 × 6):</span>
                    <strong className="common-invoice-hub-s176">₹17,100</strong>
                  </div>
                  <div className="common-invoice-hub-s175">
                    <span>• Sinking Fund (₹150 × 6):</span>
                    <strong className="common-invoice-hub-s176">₹900</strong>
                  </div>
                  <div className="common-invoice-hub-s177">
                    <span>• Paid on 23-10-2026:</span>
                    <span>₹18,000</span>
                  </div>
                </div>
              </div>
              <div className="common-invoice-hub-s178">
                <span className="common-invoice-hub-s179" style={{ color: combActiveTab === 'A-302' ? '#16a34a' : '#15803d' }}>
                  {combActiveTab === 'A-302' ? '● Currently Selected' : 'Click to View'}
                </span>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); handlePrintSingleFlatInvoice('A-302'); }}
                  className="common-invoice-hub-s180"
                >
                  🖨️ Print
                </button>
              </div>
            </div>

            {/* Flat A-904 */}
            <div
              onClick={() => setCombActiveTab('A-904')}
              className="common-invoice-hub-s166" style={{ border: combActiveTab === 'A-904' ? '2.5px solid #16a34a' : '1px solid #bbf7d0', boxShadow: combActiveTab === 'A-904' ? '0 6px 20px rgba(22,163,74,0.18)' : '0 4px 16px rgba(0,0,0,0.04)' }}
            >
              <div>
                <div className="common-invoice-hub-s167">
                  <span className="common-invoice-hub-s168">
                    FLAT A-904
                  </span>
                  <span className="common-invoice-hub-s169">
                    ✓ PAID (23-10-2026)
                  </span>
                </div>
                <div className="common-invoice-hub-s170">
                  <div className="common-invoice-hub-s171">
                    ₹18,000
                  </div>
                  <div className="common-invoice-hub-s172">
                    Balance: ₹0 (Paid)
                  </div>
                </div>
                <div className="common-invoice-hub-s173">
                  Inv No: ME/A/16/Oct-26
                </div>
                <div className="common-invoice-hub-s174">
                  <div className="common-invoice-hub-s175">
                    <span>• Maintenance (₹2,850 × 6):</span>
                    <strong className="common-invoice-hub-s176">₹17,100</strong>
                  </div>
                  <div className="common-invoice-hub-s175">
                    <span>• Sinking Fund (₹150 × 6):</span>
                    <strong className="common-invoice-hub-s176">₹900</strong>
                  </div>
                  <div className="common-invoice-hub-s177">
                    <span>• Paid on 23-10-2026:</span>
                    <span>₹18,000</span>
                  </div>
                </div>
              </div>
              <div className="common-invoice-hub-s178">
                <span className="common-invoice-hub-s179" style={{ color: combActiveTab === 'A-904' ? '#16a34a' : '#15803d' }}>
                  {combActiveTab === 'A-904' ? '● Currently Selected' : 'Click to View'}
                </span>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); handlePrintSingleFlatInvoice('A-904'); }}
                  className="common-invoice-hub-s180"
                >
                  🖨️ Print
                </button>
              </div>
            </div>

            {/* Flat A-1002 */}
            <div
              onClick={() => setCombActiveTab('A-1002')}
              className="common-invoice-hub-s166" style={{ border: combActiveTab === 'A-1002' ? '2.5px solid #1e3a8a' : '2px solid #C49B4F', boxShadow: combActiveTab === 'A-1002' ? '0 6px 20px rgba(30,58,138,0.15)' : '0 4px 16px rgba(196,155,79,0.15)' }}
            >
              <div>
                <div className="common-invoice-hub-s167">
                  <span className="common-invoice-hub-s181">
                    FLAT A-1002
                  </span>
                  <span className="common-invoice-hub-s182">
                    ⏳ PENDING (₹31,200)
                  </span>
                </div>
                <div className="common-invoice-hub-s170">
                  <div className="common-invoice-hub-s183">
                    ₹31,200
                  </div>
                  <div className="common-invoice-hub-s184">
                    Balance Due: ₹31,200
                  </div>
                </div>
                <div className="common-invoice-hub-s173">
                  Inv No: ME/A/17/Oct-26
                </div>
                <div className="common-invoice-hub-s185">
                  <div>
                    <div className="common-invoice-hub-s186">Earlier Pending (Oct 2024 – Mar 2025): ₹13,200</div>
                    <div className="common-invoice-hub-s187">
                      <span>Maint: ₹2,100 × 6 = ₹12,600</span>
                      <span>Sinking: ₹100 × 6 = ₹600</span>
                    </div>
                  </div>
                  <div className="common-invoice-hub-s188">
                    <div className="common-invoice-hub-s189">Current Maintenance (Oct 2026 – Mar 2027): ₹18,000</div>
                    <div className="common-invoice-hub-s190">
                      <span>Maint: ₹2,850 × 6 = ₹17,100</span>
                      <span>Sinking: ₹150 × 6 = ₹900</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="common-invoice-hub-s178">
                <span className="common-invoice-hub-s179" style={{ color: combActiveTab === 'A-1002' ? '#1e3a8a' : '#b45309' }}>
                  {combActiveTab === 'A-1002' ? '● Currently Selected' : 'Click to View'}
                </span>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); handlePrintSingleFlatInvoice('A-1002'); }}
                  className="common-invoice-hub-s191"
                >
                  🖨️ Print
                </button>
              </div>
            </div>
          </div>

          {/* Grand Total Summary Banner */}
          <div className="common-invoice-hub-s192">
            <div>
              <div className="common-invoice-hub-s193">
                Combined Demand &amp; Payment Status (Times Horizon Private Limited)
              </div>
              <div className="common-invoice-hub-s194">
                Flat A-302 (₹18,000) + Flat A-904 (₹18,000) + Flat A-1002 (₹31,200)
              </div>
              <div className="common-invoice-hub-s195">
                <span className="common-invoice-hub-s196">
                  ✓ Received Today (23-Oct-2026): ₹36,000 (Flats A-302 &amp; A-904 Paid)
                </span>
                <span className="common-invoice-hub-s197">
                  ⏳ Net Balance Due: ₹31,200 (Flat A-1002 Pending)
                </span>
              </div>
            </div>
            <div className="common-invoice-hub-s198">
              <div className="common-invoice-hub-s199">
                <div className="common-invoice-hub-s200">
                  Total Invoiced
                </div>
                <div className="common-invoice-hub-s201">
                  ₹67,200
                </div>
              </div>
              <div className="common-invoice-hub-s202">
                <div className="common-invoice-hub-s203">
                  Net Outstanding
                </div>
                <div className="common-invoice-hub-s204">
                  ₹31,200
                </div>
              </div>
            </div>
          </div>

          {/* Two-Column Layout: Controls & Bank Details on Left, Live A4 Preview on Right */}
          <div className="common-invoice-hub-s29">
            
            {/* Left Column */}
            <div className="common-invoice-hub-s18">
              
              {/* Flat-Specific Invoice Parameters (When single flat is selected) */}
              {!isCombinedView && (
                <div className="common-invoice-hub-s205">
                  <div className="common-invoice-hub-s206">
                    <div className="common-invoice-hub-s207">
                      <span className="common-invoice-hub-s208">📰</span>
                      <span className="common-invoice-hub-s209">
                        Flat {activeFlat.flatNo} Official Invoice Settings
                      </span>
                    </div>
                    <span className="common-invoice-hub-s210">
                      TOI Template
                    </span>
                  </div>

                  <div className="common-invoice-hub-s52">
                    <div>
                      <label className="common-invoice-hub-s45">
                        Invoice No. (Exact Printed Format)
                      </label>
                      <input
                        type="text"
                        value={activeFlat.invoiceNo}
                        onChange={(e) => handleUpdateFlatField(activeFlat.id, 'invoiceNo', e.target.value)}
                        className="common-invoice-hub-s211"
                      />
                    </div>

                    <div>
                      <label className="common-invoice-hub-s45">
                        Bill Period Text (e.g. 01-10-2026 to 31-03-2027)
                      </label>
                      <input
                        type="text"
                        value={activeFlat.billPeriodStr}
                        onChange={(e) => handleUpdateFlatField(activeFlat.id, 'billPeriodStr', e.target.value)}
                        className="common-invoice-hub-s212"
                      />
                    </div>

                    <div className="common-invoice-hub-s44">
                      <div>
                        <label className="common-invoice-hub-s45">Invoice Date</label>
                        <input
                          type="date"
                          value={combInvoiceDate}
                          onChange={(e) => setCombInvoiceDate(e.target.value)}
                          className="common-invoice-hub-s212"
                        />
                      </div>
                      <div>
                        <label className="common-invoice-hub-s45">Due Date</label>
                        <input
                          type="date"
                          value={combDueDate}
                          onChange={(e) => setCombDueDate(e.target.value)}
                          className="common-invoice-hub-s213"
                        />
                      </div>
                    </div>

                    <div className="common-invoice-hub-s44">
                      <div>
                        <label className="common-invoice-hub-s45">Mobile No.</label>
                        <input
                          type="text"
                          value={combClientMobile}
                          onChange={(e) => setCombClientMobile(e.target.value)}
                          className="common-invoice-hub-s212"
                        />
                      </div>
                      <div>
                        <label className="common-invoice-hub-s45">E-Mail</label>
                        <input
                          type="email"
                          value={combClientEmail}
                          onChange={(e) => setCombClientEmail(e.target.value)}
                          className="common-invoice-hub-s212"
                        />
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handlePrintSingleFlatInvoice(activeFlat.id)}
                      className="common-invoice-hub-s214"
                    >
                      <span>🖨️</span> Print Flat {activeFlat.flatNo} A4 Invoice
                    </button>
                  </div>
                </div>
              )}

              {/* Remittance Bank Account Box */}
              <div className="common-invoice-hub-s215">
                <div className="common-invoice-hub-s206">
                  <div className="common-invoice-hub-s26">
                    <span className="common-invoice-hub-s109">🏦</span>
                    <span className="common-invoice-hub-s216">Bank Account Details for Payment</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyBankDetails}
                    className="common-invoice-hub-s217"
                  >
                    <span>📋</span> Copy Bank
                  </button>
                </div>

                <div className="common-invoice-hub-s218">
                  <div><strong>Account Name:</strong> Majestique Euriska 'A' Building CO OP Society LTD</div>
                  <div><strong>Bank:</strong> HDFC Bank</div>
                  <div><strong>Branch:</strong> Undri Branch (Budhrani Boulevard, Pune - 411060)</div>
                  <div><strong>Account Type:</strong> Current Account (CA-INSTITUTION)</div>
                  <div><strong>Account No.:</strong> <span className="common-invoice-hub-s219">50200075533530</span></div>
                  <div><strong>IFSC Code:</strong> <span className="common-invoice-hub-s219">HDFC0002454</span></div>
                </div>

                <div className="common-invoice-hub-s220">
                  Please share the payment confirmation / UTR screenshot once completed.
                </div>
              </div>

              {/* Accompanying Cover Note & Cancelled Cheque Intimation */}
              <div className="common-invoice-hub-s221">
                <span className="common-invoice-hub-s222">
                  Accompanying Note
                </span>
                <h4 className="common-invoice-hub-s223">
                  📝 Payment Notice Note &amp; Cheque Intimation
                </h4>
                <textarea
                  value={combNotes}
                  onChange={(e) => setCombNotes(e.target.value)}
                  rows={4}
                  className="common-invoice-hub-s224"
                />
                <div className="common-invoice-hub-s225">
                  This text will be included in the WhatsApp notification and official bill printout notes section.
                </div>
              </div>

              {/* Combined Bill Metadata & Due Date */}
              {isCombinedView && (
                <div className="common-invoice-hub-s226">
                  <span className="common-invoice-hub-s227">
                    Bill Metadata &amp; Due Date
                  </span>
                  <div>
                    <label className="common-invoice-hub-s45">Bill Reference No.</label>
                    <input
                      type="text"
                      value={combInvoiceNo}
                      onChange={(e) => setCombInvoiceNo(e.target.value)}
                      className="common-invoice-hub-s228"
                    />
                  </div>
                  <div className="common-invoice-hub-s44">
                    <div>
                      <label className="common-invoice-hub-s45">Bill Date</label>
                      <input
                        type="date"
                        value={combInvoiceDate}
                        onChange={(e) => setCombInvoiceDate(e.target.value)}
                        className="common-invoice-hub-s212"
                      />
                    </div>
                    <div>
                      <label className="common-invoice-hub-s45">Due Date</label>
                      <input
                        type="date"
                        value={combDueDate}
                        onChange={(e) => setCombDueDate(e.target.value)}
                        className="common-invoice-hub-s213"
                      />
                    </div>
                  </div>
                </div>
              )}

            </div>

            {/* Right Column: Live Printable A4 Preview */}
            <div className="common-invoice-hub-s229">
              <div className="common-invoice-hub-s230">
                <div>
                  <span className="common-invoice-hub-s231" style={{ color: isCombinedView ? '#0b2b26' : '#1e3a8a' }}>
                    {isCombinedView ? 'Live Combined Statement Preview (A4)' : `Live Official Invoice Preview (Flat ${activeFlat.flatNo})`}
                  </span>
                  <div className="common-invoice-hub-s232">
                    {isCombinedView ? 'Consolidated Settlement Bill' : `Official Template • ${activeFlat.invoiceNo}`}
                  </div>
                </div>
                <div className="common-invoice-hub-s233">
                  {!isCombinedView ? (
                    <button
                      type="button"
                      onClick={() => handlePrintSingleFlatInvoice(activeFlat.id)}
                      className="common-invoice-hub-s234"
                    >
                      <span>🖨️</span> Print Flat {activeFlat.flatNo}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handlePrintCombInvoice}
                      className="common-invoice-hub-s235"
                    >
                      <span>🖨️</span> Print Combined PDF
                    </button>
                  )}
                </div>
              </div>

              {/* Live Preview Paper */}
              {!isCombinedView ? (
                /* ── OFFICIAL TOI PRINTED TEMPLATE REPLICA ── */
                <div className="common-invoice-hub-s236">
                  
                  {/* Society Header & Bill Period Banner */}
                  <div className="common-invoice-hub-s237">
                    <div className="common-invoice-hub-s238">
                      Majestique Euriska A Building Sahakari Gruhrachna Sanstha Maryadit
                    </div>
                    <div className="common-invoice-hub-s239">
                      S. No. 2, Plot No. C-1, Village Mohammadwadi Tal. Haveli, Dist. Pune- 411060 Reg. No.
                    </div>
                    <div className="common-invoice-hub-s240">
                      PNA/PNA(4)/HSG/(TC)/21207/2021-22 Dt. 09/08/2019
                    </div>
                    <div className="common-invoice-hub-s241">
                      Bill Period : {activeFlat.billPeriodStr}
                    </div>
                  </div>

                  {/* Unified Table Box: Meta Box + Services Table directly touching with zero space */}
                  <div className="common-invoice-hub-s242">
                    {/* Meta Box: Left Details + Right Period */}
                    <div className="common-invoice-hub-s243">
                    
                    {/* Left Meta Column */}
                    <div className="common-invoice-hub-s244">
                      <div className="common-invoice-hub-s245">
                        <span className="common-invoice-hub-s246">INVOICE DATE</span>
                        <span className="common-invoice-hub-s247">:</span>
                        <span>{formatDmyDate(combInvoiceDate) || '01-09-2026'}</span>
                      </div>
                      <div className="common-invoice-hub-s245">
                        <span className="common-invoice-hub-s246">INVOICE NO.</span>
                        <span className="common-invoice-hub-s247">:</span>
                        <span className="common-invoice-hub-s248">{activeFlat.invoiceNo}</span>
                      </div>
                      <div className="common-invoice-hub-s245">
                        <span className="common-invoice-hub-s246">DUE DATE</span>
                        <span className="common-invoice-hub-s247">:</span>
                        <span>{formatDmyDate(combDueDate) || '31-03-2027'}</span>
                      </div>
                      <div className="common-invoice-hub-s245">
                        <span className="common-invoice-hub-s246">INVOICE TO:</span>
                        <span className="common-invoice-hub-s247"></span>
                        <span className="common-invoice-hub-s249">{combClientName}</span>
                      </div>
                      <div className="common-invoice-hub-s245">
                        <span className="common-invoice-hub-s246">FLAT NO. :</span>
                        <span className="common-invoice-hub-s247"></span>
                        <span className="common-invoice-hub-s248">A WING- {activeFlat.flatNumberOnly}</span>
                      </div>
                      <div className="common-invoice-hub-s250">
                        <span className="common-invoice-hub-s246">ADDRESS:</span>
                        <span className="common-invoice-hub-s247"></span>
                        <span className="common-invoice-hub-s251">
                          S. No. 2, Plot No. C-1,<br />
                          Village Mohammadwadi Tal. Haveli, Dist. Pune-<br />
                          411060
                        </span>
                      </div>
                      <div className="common-invoice-hub-s245">
                        <span className="common-invoice-hub-s246">MOBILE NO.</span>
                        <span className="common-invoice-hub-s247">:</span>
                        <span>{combClientMobile}</span>
                      </div>
                      <div className="common-invoice-hub-s245">
                        <span className="common-invoice-hub-s246">E-MAIL</span>
                        <span className="common-invoice-hub-s247">:</span>
                        <span>{combClientEmail}</span>
                      </div>
                    </div>

                    {/* Right Period Column */}
                    <div className="common-invoice-hub-s252">
                      <div className="common-invoice-hub-s253">Period :-</div>
                      <div className="common-invoice-hub-s254">
                        {activeFlat.periodLines.map((line, idx) => (
                          line === '---' ? (
                            <div key={idx} className="common-invoice-hub-s255"></div>
                          ) : (
                            <div key={idx} className="common-invoice-hub-s256">{line}</div>
                          )
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Services & Calculations Table */}
                  <table className="common-invoice-hub-s257">
                    <thead>
                      <tr>
                        <th className="common-invoice-hub-s258">
                          Description of<br />Services
                        </th>
                        <th className="common-invoice-hub-s259">Units</th>
                        <th className="common-invoice-hub-s260">SAC<br />Code</th>
                        <th className="common-invoice-hub-s260">Rate<br />(INR)</th>
                        <th className="common-invoice-hub-s261">Amount<br />Payable (INR)</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="common-invoice-hub-s262">
                          {activeFlat.hasEarlierPending ? 'Maintenance Fee Twelve Month' : 'Maintenance Fee Six Month'}
                        </td>
                        <td className="common-invoice-hub-s263">01</td>
                        <td className="common-invoice-hub-s263">-</td>
                        <td className="common-invoice-hub-s263">2850</td>
                        <td className="common-invoice-hub-s264">
                          {(activeFlat.hasEarlierPending ? 29700 : 17100).toFixed(2)}
                        </td>
                      </tr>
                      <tr>
                        <td className="common-invoice-hub-s262">Repairs and Maintenance</td>
                        <td className="common-invoice-hub-s263">-</td>
                        <td className="common-invoice-hub-s263">-</td>
                        <td className="common-invoice-hub-s263">0</td>
                        <td className="common-invoice-hub-s264">0.00</td>
                      </tr>
                      <tr>
                        <td className="common-invoice-hub-s262">
                          {activeFlat.hasEarlierPending ? 'Sinking Fund Twelve Month' : 'Sinking Fund Six Month'}
                        </td>
                        <td className="common-invoice-hub-s263">-</td>
                        <td className="common-invoice-hub-s263">-</td>
                        <td className="common-invoice-hub-s263">150</td>
                        <td className="common-invoice-hub-s264">
                          {(activeFlat.hasEarlierPending ? 1500 : 900).toFixed(2)}
                        </td>
                      </tr>
                      <tr>
                        <td className="common-invoice-hub-s265">Current Bill Amount (INR)</td>
                        <td className="common-invoice-hub-s262"></td>
                        <td className="common-invoice-hub-s262"></td>
                        <td className="common-invoice-hub-s262"></td>
                        <td className="common-invoice-hub-s266">
                          {activeFlat.total.toFixed(2)}
                        </td>
                      </tr>
                      <tr>
                        <td className="common-invoice-hub-s262">Last Outstanding (INR)</td>
                        <td className="common-invoice-hub-s262"></td>
                        <td className="common-invoice-hub-s262"></td>
                        <td className="common-invoice-hub-s262"></td>
                        <td className="common-invoice-hub-s262"></td>
                      </tr>
                      <tr>
                        <td className="common-invoice-hub-s262">Pending Amount</td>
                        <td className="common-invoice-hub-s262"></td>
                        <td className="common-invoice-hub-s262"></td>
                        <td className="common-invoice-hub-s262"></td>
                        <td className="common-invoice-hub-s262"></td>
                      </tr>
                      <tr>
                        <td className="common-invoice-hub-s265">Payable Amount (INR)</td>
                        <td className="common-invoice-hub-s262"></td>
                        <td className="common-invoice-hub-s262"></td>
                        <td className="common-invoice-hub-s262"></td>
                        <td className="common-invoice-hub-s266">
                          {activeFlat.total.toFixed(2)}
                        </td>
                      </tr>
                      <tr>
                        <td colSpan={5} className="common-invoice-hub-s267">
                          Amount in word: {activeFlat.words}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                  </div>

                  {/* Authorized Signatory Space */}
                  <div className="common-invoice-hub-s268">
                    <div className="common-invoice-hub-s269">
                      <div className="common-invoice-hub-s270">
                        Authorized Signatory
                      </div>
                    </div>
                  </div>

                </div>
              ) : (
                /* ── COMBINED 3-FLATS STATEMENT REPLICA ── */
                <div className="common-invoice-hub-s271">
                  
                  {/* Header */}
                  <div className="common-invoice-hub-s272">
                    <div className="common-invoice-hub-s273">
                      MAJESTIQUE EURISKA 'A' BUILDING CO-OP HOUSING SOCIETY LTD.
                    </div>
                    <div className="common-invoice-hub-s274">
                      Reg. No: PNA/PNA (4)/HSG/(TC)/21207/2019-20 • Mohammed Wadi, Pune - 411060
                    </div>
                    <div className="common-invoice-hub-s275">
                      COMBINED SOCIETY MAINTENANCE &amp; ARREARS DEMAND BILL
                    </div>
                  </div>

                  {/* Ref & Dates */}
                  <div className="common-invoice-hub-s276">
                    <div><strong>Ref No:</strong> {combInvoiceNo}</div>
                    <div><strong>Date:</strong> {formatDisplayDate(combInvoiceDate)}</div>
                    <div><strong>Due Date:</strong> <span className="common-invoice-hub-s277">{formatDisplayDate(combDueDate)}</span></div>
                  </div>

                  {/* Recipient */}
                  <div className="common-invoice-hub-s278">
                    <div className="common-invoice-hub-s279">BILLED TO:</div>
                    <div className="common-invoice-hub-s280">Times Horizon Private Limited (Flats A-302, A-904 &amp; A-1002)</div>
                    <div className="common-invoice-hub-s281">Majestique Euriska 'A' Building, Mohammed Wadi, Pune - 411060</div>
                  </div>

                  {/* Subject */}
                  <div className="common-invoice-hub-s282">
                    <strong>SUBJECT:</strong> COMBINED DEMAND NOTICE FOR CURRENT SOCIETY MAINTENANCE (OCT 2026 – MAR 2027) &amp; ARREARS DUES
                  </div>

                  {/* Itemized Table */}
                  <table className="common-invoice-hub-s283">
                    <thead>
                      <tr className="common-invoice-hub-s83">
                        <th className="common-invoice-hub-s284">Flat</th>
                        <th className="common-invoice-hub-s285">Particulars</th>
                        <th className="common-invoice-hub-s286">Billing Period</th>
                        <th className="common-invoice-hub-s286">Months</th>
                        <th className="common-invoice-hub-s286">Rate</th>
                        <th className="common-invoice-hub-s287">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {/* Flat A-302 */}
                      <tr className="common-invoice-hub-s87">
                        <td rowSpan={2} className="common-invoice-hub-s288">A-302</td>
                        <td className="common-invoice-hub-s289">Flat Maintenance Charges</td>
                        <td className="common-invoice-hub-s290">Oct 2026 – Mar 2027</td>
                        <td className="common-invoice-hub-s291">6 mos</td>
                        <td className="common-invoice-hub-s292">₹2,850</td>
                        <td className="common-invoice-hub-s293">₹17,100</td>
                      </tr>
                      <tr className="common-invoice-hub-s87">
                        <td className="common-invoice-hub-s289">Sinking Fund Contribution</td>
                        <td className="common-invoice-hub-s290">Oct 2026 – Mar 2027</td>
                        <td className="common-invoice-hub-s291">6 mos</td>
                        <td className="common-invoice-hub-s292">₹150</td>
                        <td className="common-invoice-hub-s293">₹900</td>
                      </tr>
                      <tr className="common-invoice-hub-s294">
                        <td colSpan={5} className="common-invoice-hub-s295">
                          ↳ Flat A-302 Subtotal Payable: <span className="common-invoice-hub-s296">✓ PAID (23-10-2026)</span>
                        </td>
                        <td className="common-invoice-hub-s297">₹18,000</td>
                      </tr>

                      {/* Flat A-904 */}
                      <tr className="common-invoice-hub-s87">
                        <td rowSpan={2} className="common-invoice-hub-s288">A-904</td>
                        <td className="common-invoice-hub-s289">Flat Maintenance Charges</td>
                        <td className="common-invoice-hub-s290">Oct 2026 – Mar 2027</td>
                        <td className="common-invoice-hub-s291">6 mos</td>
                        <td className="common-invoice-hub-s292">₹2,850</td>
                        <td className="common-invoice-hub-s293">₹17,100</td>
                      </tr>
                      <tr className="common-invoice-hub-s87">
                        <td className="common-invoice-hub-s289">Sinking Fund Contribution</td>
                        <td className="common-invoice-hub-s290">Oct 2026 – Mar 2027</td>
                        <td className="common-invoice-hub-s291">6 mos</td>
                        <td className="common-invoice-hub-s292">₹150</td>
                        <td className="common-invoice-hub-s293">₹900</td>
                      </tr>
                      <tr className="common-invoice-hub-s294">
                        <td colSpan={5} className="common-invoice-hub-s295">
                          ↳ Flat A-904 Subtotal Payable: <span className="common-invoice-hub-s296">✓ PAID (23-10-2026)</span>
                        </td>
                        <td className="common-invoice-hub-s297">₹18,000</td>
                      </tr>

                      {/* Flat A-1002 */}
                      <tr className="common-invoice-hub-s298">
                        <td rowSpan={4} className="common-invoice-hub-s299">A-1002</td>
                        <td className="common-invoice-hub-s300">Earlier Pending Maint Arrears</td>
                        <td className="common-invoice-hub-s301">Oct 2024 – Mar 2025</td>
                        <td className="common-invoice-hub-s302">6 mos</td>
                        <td className="common-invoice-hub-s301">₹2,100</td>
                        <td className="common-invoice-hub-s303">₹12,600</td>
                      </tr>
                      <tr className="common-invoice-hub-s298">
                        <td className="common-invoice-hub-s300">Earlier Pending Sinking Fund Arrears</td>
                        <td className="common-invoice-hub-s301">Oct 2024 – Mar 2025</td>
                        <td className="common-invoice-hub-s302">6 mos</td>
                        <td className="common-invoice-hub-s301">₹100</td>
                        <td className="common-invoice-hub-s303">₹600</td>
                      </tr>
                      <tr className="common-invoice-hub-s304">
                        <td className="common-invoice-hub-s289">Current Flat Maintenance Charges</td>
                        <td className="common-invoice-hub-s290">Oct 2026 – Mar 2027</td>
                        <td className="common-invoice-hub-s291">6 mos</td>
                        <td className="common-invoice-hub-s292">₹2,850</td>
                        <td className="common-invoice-hub-s293">₹17,100</td>
                      </tr>
                      <tr className="common-invoice-hub-s304">
                        <td className="common-invoice-hub-s289">Current Sinking Fund Contribution</td>
                        <td className="common-invoice-hub-s290">Oct 2026 – Mar 2027</td>
                        <td className="common-invoice-hub-s291">6 mos</td>
                        <td className="common-invoice-hub-s292">₹150</td>
                        <td className="common-invoice-hub-s293">₹900</td>
                      </tr>
                      <tr className="common-invoice-hub-s305">
                        <td colSpan={5} className="common-invoice-hub-s306">
                          ↳ Flat A-1002 Subtotal (Pending ₹13,200 + Current ₹18,000): <span className="common-invoice-hub-s307">⏳ PENDING</span>
                        </td>
                        <td className="common-invoice-hub-s308">₹31,200</td>
                      </tr>

                      {/* Grand Total */}
                      <tr className="common-invoice-hub-s309">
                        <td colSpan={5} className="common-invoice-hub-s310">
                          TOTAL COMBINED INVOICED (ALL THREE FLATS):
                        </td>
                        <td className="common-invoice-hub-s311">
                          ₹67,200
                        </td>
                      </tr>

                      {/* Payment Received & Net Balance */}
                      <tr className="common-invoice-hub-s312">
                        <td colSpan={5} className="common-invoice-hub-s313">
                          Less: Payment Received Today (23-Oct-2026) for Flats A-302 &amp; A-904:
                        </td>
                        <td className="common-invoice-hub-s314">
                          (-) ₹36,000
                        </td>
                      </tr>
                      <tr className="common-invoice-hub-s315">
                        <td colSpan={5} className="common-invoice-hub-s316">
                          NET OUTSTANDING BALANCE DUE (FLAT A-1002 ONLY):
                        </td>
                        <td className="common-invoice-hub-s317">
                          ₹31,200
                        </td>
                      </tr>
                    </tbody>
                  </table>

                  {/* Remittance Box */}
                  <div className="common-invoice-hub-s97">
                    <div className="common-invoice-hub-s98">🏦 HDFC Bank Remittance Details:</div>
                    <div>• Account Name: <strong>Majestique Euriska 'A' Building CO OP Society LTD</strong></div>
                    <div>• A/C: <strong>50200075533530</strong> • IFSC: <strong>HDFC0002454</strong> • Type: <strong>Current Account</strong> • Branch: <strong>Undri Branch</strong></div>
                  </div>

                  {/* Notes */}
                  <div className="common-invoice-hub-s99">
                    <strong>Notes:</strong> {combNotes}
                  </div>

                  {/* Signatures */}
                  <div className="common-invoice-hub-s318">
                    <div className="common-invoice-hub-s101">
                      <div className="common-invoice-hub-s102">Society Seal</div>
                      <div className="common-invoice-hub-s103">Estate Manager</div>
                    </div>
                    <div className="common-invoice-hub-s101">
                      <div className="common-invoice-hub-s102">Verified</div>
                      <div className="common-invoice-hub-s103">Hon. Secretary</div>
                    </div>
                    <div className="common-invoice-hub-s101">
                      <div className="common-invoice-hub-s102">Approved</div>
                      <div className="common-invoice-hub-s103">Hon. Treasurer / Chairman</div>
                    </div>
                  </div>

                </div>
              )}
            </div>

          </div>
        </div>
        );
      })()}

    </div>
  );
}
