import aprilData from './aprilStatementData.json';
import augustData from './augustStatementData.json';
import fy22_23Data from './fy22_23Data.json';
import fy23_24Data from './fy23_24Data.json';
import fy24_25Data from './fy24_25Data.json';
import fy25_26Data from './fy25_26Data.json';
import juneData from './juneStatementData.json';
import julyData from './julyStatementData.json';
import mayData from './mayStatementData.json';

export const FY2022_23_DATA = fy22_23Data;
export const FY2023_24_DATA = fy23_24Data;
export const FY2024_25_DATA = fy24_25Data;
export const FY2025_26_DATA = fy25_26Data;
export const APRIL_2026_DATA = aprilData;
export const MAY_2026_DATA = mayData;
export const JUNE_2026_DATA = juneData;
export const JULY_2026_DATA = julyData;
export const AUGUST_2026_DATA = augustData;

// All-Time Combined Dataset (01 April 2026 - 29 August 2026)
const allTxs = [
  ...aprilData.transactionsList,
  ...mayData.transactionsList,
  ...juneData.transactionsList,
  ...JULY_2026_DATA.transactionsList,
  ...augustData.transactionsList
];

// Aggregate Vendors across all 5 months
const vendorAgg = {};
allTxs.filter(t => t.type === 'DR').forEach(t => {
  let name = t.desc;
  if (name.includes('SELF')) {
    name = "Self Withdrawal (Mohammedwadi)";
  } else if (name.includes('CHQ PAID')) {
    const p = name.split('-');
    name = p[p.length - 1].trim();
  } else if (name.includes('FT - DR')) {
    const p = name.split('-');
    name = p[p.length - 1].trim();
  }

  if (name.toUpperCase().includes('SANDIP RAJU')) name = "Sandip Raju Wavare";
  else if (name.toUpperCase().includes('SHUBHUM') || name.toUpperCase().includes('SHUBHAM')) name = "Shubham Enterprises";
  else if (name.toUpperCase().includes('MSEDCL')) name = "MSEDCL";
  else if (name.toUpperCase().includes('MAJESTIQUE EURISKA C')) name = "Majestique Euriska C Bldg";
  else if (name.toUpperCase().includes('MAJESTIQUE EURISKA B')) name = "Majestique Euriska B Bldg";
  else if (name.toUpperCase().includes('SIDHARAM')) name = "Sidharam Parmeshwar";
  else if (name.toUpperCase().includes('SHREE SWAMI')) name = "Shree Swami Samarth";
  else if (name.toUpperCase().includes('NAUSHAD') || name.toUpperCase().includes('NOUSHAD')) name = "Noushad Ali";
  else if (name.toUpperCase().includes('SAI SWIMMING')) name = "Sai Swimming Pool M";
  else if (name.toUpperCase().includes('SCHINDLER')) name = "Schindler India Pri";
  else if (name.toUpperCase().includes('PARVIOM')) name = "Parviom Technologie";
  else if (name.toUpperCase().includes('SHIVSHANKAR')) name = "Shivshankar Singh";
  else if (name.toUpperCase().includes('TANAJI') || name.toUpperCase().includes('TANGJI')) name = "Tanaji Hande";
  else if (name.toUpperCase().includes('NRG SECURITY')) name = "NRG Security Services";
  else if (name.toUpperCase().includes('SAFETY SOLUTIONS')) name = "Safety Solutions";
  else if (name.toUpperCase().includes('MAJESTIQUE EURISKA (ADMIN)') || name.toUpperCase().includes('MAJESTIQUE EURISKA')) {
    if (!name.includes('Bldg') && !name.includes('BLDG')) name = "Majestique Euriska (Admin)";
  }

  if (!vendorAgg[name]) vendorAgg[name] = { count: 0, total: 0, cheque: t.ref };
  vendorAgg[name].count += 1;
  vendorAgg[name].total += t.amount;
});

const allVendorsData = Object.keys(vendorAgg).map((name, idx) => ({
  rank: idx + 1,
  name,
  count: vendorAgg[name].count,
  total: vendorAgg[name].total,
  type: "Cumulative Payee",
  cheque: vendorAgg[name].cheque
})).sort((a, b) => b.total - a.total).map((v, i) => ({ ...v, rank: i + 1 }));

export const ALL_TIME_DATA = {
  period: "April 1, 2026 – August 29, 2026 (5-Month Cumulative)",
  openingBalance: 149088.73,
  closingBalance: 462925.87,
  totalCredits: 1584876.14,
  totalDebits: 1271039.00,
  netCashFlow: 313837.14,
  vendorsData: allVendorsData,
  incomeCategories: [
    { name: "Vivish PG Maintenance NEFT", value: 1140771.45, count: 356, color: "#196c6c" },
    { name: "Tata Play Broadband Refunds", value: 134258.00, count: 6, color: "#5f665f" },
    { name: "Cheque Deposits (CTS Clearing)", value: 86970.00, count: 11, color: "#31553e" },
    { name: "Direct Member UPI / IMPS", value: 51116.00, count: 12, color: "#a855f7" },
    { name: "Inter-Building Transfers (C/B)", value: 32603.00, count: 8, color: "#c2644a" },
    { name: "Other Direct Collections", value: 139157.69, count: 28, color: "#b98216" }
  ],
  expenseCategories: [
    { name: "Security, Housekeeping & Staff", value: 358803, color: "#196c6c" },
    { name: "Repairs & Operations (Shubham/Rai)", value: 262765, color: "#5f665f" },
    { name: "Electricity Utility (MSEDCL)", value: 263130, color: "#b98216" },
    { name: "Capital & AMCs (Schindler/CCTV/Pool)", value: 177399, color: "#c2644a" },
    { name: "Society Admin & Cash Withdrawals", value: 108720, color: "#ef4444" },
    { name: "Inter-Building Outflows", value: 100222, color: "#3b82f6" }
  ],
  timelineData: [
    { date: "April", balance: 164786.23, credit: 278884.50, debit: 263187.00 },
    { date: "May", balance: 333303.54, credit: 392044.31, debit: 223527.00 },
    { date: "June", balance: 465193.55, credit: 369080.01, debit: 237190.00 },
    { date: "July", balance: 424339.27, credit: 296237.72, debit: 337092.00 },
    { date: "August", balance: 462925.87, credit: 248629.60, debit: 210043.00 }
  ],
  transactionsList: allTxs
};

export function parseRawBankStatement(rawText) {
  if (!rawText || typeof rawText !== 'string' || !rawText.trim()) return null;

  let period = "Custom Statement";
  const periodMatch = rawText.match(/Statement From\s*:\s*(\d{2}\/\d{2}\/\d{4})\s*To\s*:\s*(\d{2}\/\d{2}\/\d{4})/i);
  if (periodMatch) {
    period = `${periodMatch[1]} – ${periodMatch[2]}`;
  }

  const blocks = rawText.split(/\n(?=\d{2}\/\d{2}\/\d{2})/);
  const txList = [];

  for (const block of blocks) {
    const lines = block.trim().split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length === 0) continue;

    const dateMatch = lines[0].match(/(\d{2}\/\d{2}\/\d{2})/);
    if (!dateMatch) continue;
    const date = dateMatch[1];

    const numMatches = block.match(/\b\d+(?:\.\d+)?\b/g);
    if (!numMatches || numMatches.length < 2) continue;

    const bal = parseFloat(numMatches[numMatches.length - 1]);
    const amount = parseFloat(numMatches[numMatches.length - 2]);

    const descUpper = block.toUpperCase();
    const isDr = descUpper.includes('CHQ PAID') || descUpper.includes('FT - DR') || descUpper.includes('WITHDRAWAL') || descUpper.startsWith('SELF') || descUpper.includes('SAFETY SOLUTIONS');
    const type = isDr ? 'DR' : 'CR';

    const refMatch = block.match(/\b(IN\d{12,16}|00000\d{8,12}|YESF\d{12}|AXISCN\d{10}|\d{12,16})\b/);
    const ref = refMatch ? refMatch[1] : 'REF-AUTO';

    let desc = lines.join(' ').replace(/\s+/g, ' ').trim();

    txList.push({
      date,
      type,
      desc,
      ref,
      amount: isNaN(amount) ? 0 : amount,
      bal: isNaN(bal) ? 0 : bal
    });
  }

  if (txList.length === 0) return null;

  const drs = txList.filter(t => t.type === 'DR');
  const crs = txList.filter(t => t.type === 'CR');
  const totalDebits = drs.reduce((s, t) => s + t.amount, 0);
  const totalCredits = crs.reduce((s, t) => s + t.amount, 0);
  const closingBalance = txList[txList.length - 1].bal;
  const openingBalance = txList[0].type === 'DR' ? txList[0].bal + txList[0].amount : txList[0].bal - txList[0].amount;

  const vendorMap = {};
  drs.forEach(t => {
    let name = t.desc;
    if (name.includes('CHQ PAID')) {
      const p = name.split('-');
      name = p[p.length - 1].trim();
    } else if (name.includes('FT - DR')) {
      const p = name.split('-');
      name = p[p.length - 1].trim();
    }
    if (!vendorMap[name]) vendorMap[name] = { count: 0, total: 0, cheque: t.ref };
    vendorMap[name].count += 1;
    vendorMap[name].total += t.amount;
  });

  const vendorsData = Object.keys(vendorMap)
    .map((name, idx) => ({
      rank: idx + 1,
      name,
      count: vendorMap[name].count,
      total: vendorMap[name].total,
      type: "Parsed Outflow",
      cheque: vendorMap[name].cheque
    }))
    .sort((a, b) => b.total - a.total);

  const dateMap = {};
  txList.forEach(t => {
    const key = t.date.substring(0, 5);
    if (!dateMap[key]) dateMap[key] = { date: key, balance: t.bal, credit: 0, debit: 0 };
    if (t.type === 'CR') dateMap[key].credit += t.amount;
    if (t.type === 'DR') dateMap[key].debit += t.amount;
    dateMap[key].balance = t.bal;
  });

  return {
    period,
    openingBalance,
    closingBalance,
    totalCredits,
    totalDebits,
    netCashFlow: totalCredits - totalDebits,
    vendorsData,
    incomeCategories: [
      { name: "Parsed Collections (CR)", value: totalCredits, count: crs.length, color: "#196c6c" }
    ],
    expenseCategories: [
      { name: "Parsed Outflows (DR)", value: totalDebits, color: "#c2644a" }
    ],
    timelineData: Object.values(dateMap),
    transactionsList: txList
  };
}
