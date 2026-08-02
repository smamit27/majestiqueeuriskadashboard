import aprilData from './aprilStatementData.json';
import fy25_26Data from './fy25_26Data.json';
import juneData from './juneStatementData.json';
import mayData from './mayStatementData.json';

export const FY2025_26_DATA = fy25_26Data;
export const APRIL_2026_DATA = aprilData;
export const MAY_2026_DATA = mayData;
export const JUNE_2026_DATA = juneData;

export const JULY_2026_DATA = {
  period: "July 1, 2026 - July 29, 2026",
  openingBalance: 465193.55,
  closingBalance: 424339.27,
  totalCredits: 296237.72,
  totalDebits: 337092.00,
  netCashFlow: 296237.72 - 337092.00,
  vendorsData: [
    { rank: 1,  name: "Schindler India Pri",            count: 1, total: 89019, type: "Lift Maintenance",        cheque: "CHQ 420" },
    { rank: 2,  name: "MSEDCL",                          count: 1, total: 39530, type: "Electricity Utility",     cheque: "CHQ 517" },
    { rank: 3,  name: "Shubham Enterprises",             count: 1, total: 38119, type: "Repairs & Operations",    cheque: "CHQ 510" },
    { rank: 4,  name: "Sandip Raju Wavare",              count: 1, total: 28410, type: "Security Guard",          cheque: "FT 509" },
    { rank: 5,  name: "Shree Swami Samarth",             count: 1, total: 25045, type: "Housekeeping & Cleaning", cheque: "CHQ 513" },
    { rank: 6,  name: "Majestique Euriska (Admin)",      count: 1, total: 23373, type: "Society Operations",      cheque: "CHQ 515" },
    { rank: 7,  name: "Parviom Technologie",             count: 1, total: 23231, type: "CCTV & Security AMC",     cheque: "CHQ 516" },
    { rank: 8,  name: "Shivshankar Singh",               count: 1, total: 20000, type: "Staff Wages",             cheque: "CHQ 508" },
    { rank: 9,  name: "Self Withdrawal (Mohammedwadi)", count: 1, total: 15000, type: "Cash Handling",           cheque: "CHQ 506" },
    { rank: 10, name: "Sidharam Parmeshwar",             count: 1, total: 11700, type: "Staff Wages",             cheque: "CHQ 507" },
    { rank: 11, name: "Majestique Euriska C Bldg",       count: 1, total: 8263,  type: "Inter-Building Transfer", cheque: "FT 514" },
    { rank: 12, name: "Tanaji Hande",                   count: 1, total: 7000,  type: "Staff Wages",             cheque: "CHQ 502" },
    { rank: 13, name: "Sai Swimming Pool M",             count: 1, total: 4519,  type: "Pool Upkeep",             cheque: "CHQ 512" },
    { rank: 14, name: "Noushad Ali",                    count: 1, total: 2697,  type: "Staff Wages",             cheque: "CHQ 511" },
    { rank: 15, name: "Majestique Euriska B Bldg",       count: 1, total: 1186,  type: "Inter-Building Transfer", cheque: "CHQ 505" }
  ],
  incomeCategories: [
    { name: "Maintenance (Vivish PG)", value: 224361.72, count: 74, color: "#196c6c" },
    { name: "Maintenance (Cheques)", value: 36913.00, count: 4, color: "#31553e" },
    { name: "Direct UPI (Arpit Humane)", value: 12428.00, count: 1, color: "#b98216" },
    { name: "Inter-Building (C)", value: 7957.00, count: 3, color: "#c2644a" },
    { name: "Refund (Tata Play)", value: 3993.00, count: 1, color: "#5f665f" },
    { name: "Other Direct/Settlement", value: 14578.00, count: 4, color: "#a855f7" }
  ],
  expenseCategories: [
    { name: "Lift Maintenance (Schindler)", value: 89019, color: "#c2644a" },
    { name: "Electricity Utility (MSEDCL)", value: 39530, color: "#b98216" },
    { name: "Repairs & Operations", value: 38119, color: "#5f665f" },
    { name: "Security & Housekeeping Staff", value: 94862, color: "#196c6c" },
    { name: "Society Admin / Cash", value: 39559, color: "#ef4444" },
    { name: "Pool & Inter-building", value: 12783, color: "#3b82f6" }
  ],
  timelineData: [
    { date: "01/07", balance: 464007.55, credit: 0, debit: 1186 },
    { date: "02/07", balance: 534110.55, credit: 85103, debit: 15000 },
    { date: "03/07", balance: 528060.55, credit: 25650, debit: 31700 },
    { date: "04/07", balance: 542310.55, credit: 14250, debit: 0 },
    { date: "06/07", balance: 570365.55, credit: 35055, debit: 7000 },
    { date: "07/07", balance: 576515.55, credit: 6150, debit: 0 },
    { date: "08/07", balance: 528086.55, credit: 18100, debit: 66529 },
    { date: "09/07", balance: 554819.55, credit: 31252, debit: 4519 },
    { date: "10/07", balance: 566789.55, credit: 11970, debit: 0 },
    { date: "13/07", balance: 553340.30, credit: 14292.75, debit: 27742 },
    { date: "14/07", balance: 524089.55, credit: 2385.25, debit: 31636 },
    { date: "16/07", balance: 530164.32, credit: 6074.77, debit: 0 },
    { date: "20/07", balance: 446930.82, credit: 5785.50, debit: 89019 },
    { date: "21/07", balance: 423699.82, credit: 0, debit: 23231 },
    { date: "22/07", balance: 426592.57, credit: 2892.75, debit: 0 },
    { date: "26/07", balance: 430592.57, credit: 4000, debit: 0 },
    { date: "27/07", balance: 449388.27, credit: 18795.70, debit: 0 },
    { date: "28/07", balance: 454215.27, credit: 4827, debit: 0 },
    { date: "29/07", balance: 424339.27, credit: 9654, debit: 39530 }
  ],
  transactionsList: [
    { date: "01/07/26", type: "DR", desc: "CHQ PAID-CTS S1-MUMB-MAJESTIQUE EURISKA B BLDG", ref: "0000000000000505", amount: 1186, bal: 464007.55 },
    { date: "02/07/26", type: "CR", desc: "UPI-ARPIT ATMARAM HUMANE-ARPIT.HUMANE@OKHDFCBANK-HDFC0001578-125616059677-MAR APR MAY JUN", ref: "0000125616059677", amount: 12428, bal: 476435.55 },
    { date: "02/07/26", type: "DR", desc: "SELF - CHQ PAID - MOHAMMEDWADI", ref: "0000000000000506", amount: 15000, bal: 461435.55 },
    { date: "02/07/26", type: "CR", desc: "NEFT CR-ICIC0SF0002-VIVISH TECHNOLOGIES PRIVATE LIMITED-MAJESTIQUEEURISKAABLDGSAGRUSANMAR-IN42618352498399", ref: "IN42618352498399", amount: 2850, bal: 464285.55 },
    { date: "02/07/26", type: "CR", desc: "NEFT CR-ICIC0SF0002-VIVISH TECHNOLOGIES PRIVATE LIMITED-MAJESTIQUEEURISKAABLDGSAGRUSANMAR-IN42618352532130", ref: "IN42618352532130", amount: 2850, bal: 467135.55 },
    { date: "02/07/26", type: "CR", desc: "NEFT CR-ICIC0SF0002-VIVISH TECHNOLOGIES PRIVATE LIMITED-MAJESTIQUEEURISKAABLDGSAGRUSANMAR-IN42618352536350", ref: "IN42618352536350", amount: 2850, bal: 469985.55 },
    { date: "02/07/26", type: "CR", desc: "NEFT CR-ICIC0SF0002-VIVISH TECHNOLOGIES PRIVATE LIMITED-MAJESTIQUEEURISKAABLDGSAGRUSANMAR-IN42618352600901", ref: "IN42618352600901", amount: 2850, bal: 472835.55 },
    { date: "02/07/26", type: "CR", desc: "NEFT CR-ICIC0SF0002-VIVISH TECHNOLOGIES PRIVATE LIMITED-MAJESTIQUEEURISKAABLDGSAGRUSANMAR-IN42618352688995", ref: "IN42618352688995", amount: 2850, bal: 475685.55 },
    { date: "02/07/26", type: "CR", desc: "NEFT CR-YESB0000001-VIVISH TECHNOLOGIES PVT LTD-MAJESTIQUE EURISKA A BLDG SA GRU SA-YESF261833206171", ref: "YESF261833206171", amount: 3135, bal: 478820.55 },
    { date: "02/07/26", type: "CR", desc: "NEFT CR-ICIC0SF0002-VIVISH TECHNOLOGIES PRIVATE LIMITED-MAJESTIQUEEURISKAABLDGSAGRUSANMAR-IN42618352759846", ref: "IN42618352759846", amount: 3135, bal: 481955.55 },
    { date: "02/07/26", type: "CR", desc: "NEFT CR-ICIC0SF0002-VIVISH TECHNOLOGIES PRIVATE LIMITED-MAJESTIQUEEURISKAABLDGSAGRUSANMAR-IN42618352783505", ref: "IN42618352783505", amount: 2850, bal: 484805.55 },
    { date: "02/07/26", type: "CR", desc: "NEFT CR-ICIC0SF0002-VIVISH TECHNOLOGIES PRIVATE LIMITED-MAJESTIQUEEURISKAABLDGSAGRUSANMAR-IN42618352823847", ref: "IN42618352823847", amount: 2850, bal: 487655.55 },
    { date: "02/07/26", type: "CR", desc: "NEFT CR-ICIC0SF0002-VIVISH TECHNOLOGIES PRIVATE LIMITED-MAJESTIQUEEURISKAABLDGSAGRUSANMAR-IN42618352809498", ref: "IN42618352809498", amount: 2850, bal: 490505.55 },
    { date: "02/07/26", type: "CR", desc: "NEFT CR-ICIC0SF0002-VIVISH TECHNOLOGIES PRIVATE LIMITED-MAJESTIQUEEURISKAABLDGSAGRUSANMAR-IN42618352832002", ref: "IN42618352832002", amount: 2850, bal: 493355.55 },
    { date: "02/07/26", type: "CR", desc: "NEFT CR-ICIC0SF0002-VIVISH TECHNOLOGIES PRIVATE LIMITED-MAJESTIQUEEURISKAABLDGSAGRUSANMAR-IN42618352859124", ref: "IN42618352859124", amount: 2850, bal: 496205.55 },
    { date: "02/07/26", type: "CR", desc: "NEFT CR-ICIC0SF0002-VIVISH TECHNOLOGIES PRIVATE LIMITED-MAJESTIQUEEURISKAABLDGSAGRUSANMAR-IN42618352878873", ref: "IN42618352878873", amount: 2850, bal: 499055.55 },
    { date: "02/07/26", type: "CR", desc: "NEFT CR-ICIC0SF0002-VIVISH TECHNOLOGIES PRIVATE LIMITED-MAJESTIQUEEURISKAABLDGSAGRUSANMAR-IN42618352941533", ref: "IN42618352941533", amount: 2850, bal: 501905.55 },
    { date: "02/07/26", type: "CR", desc: "NEFT CR-ICIC0SF0002-VIVISH TECHNOLOGIES PRIVATE LIMITED-MAJESTIQUEEURISKAABLDGSAGRUSANMAR-IN42618352951768", ref: "IN42618352951768", amount: 2850, bal: 504755.55 },
    { date: "02/07/26", type: "CR", desc: "NEFT CR-ICIC0SF0002-VIVISH TECHNOLOGIES PRIVATE LIMITED-MAJESTIQUEEURISKAABLDGSAGRUSANMAR-IN42618352983702", ref: "IN42618352983702", amount: 2850, bal: 507605.55 },
    { date: "02/07/26", type: "CR", desc: "NEFT CR-ICIC0SF0002-VIVISH TECHNOLOGIES PRIVATE LIMITED-MAJESTIQUEEURISKAABLDGSAGRUSANMAR-IN42618353006062", ref: "IN42618353006062", amount: 2850, bal: 510455.55 },
    { date: "02/07/26", type: "CR", desc: "NEFT CR-ICIC0SF0002-VIVISH TECHNOLOGIES PRIVATE LIMITED-MAJESTIQUEEURISKAABLDGSAGRUSANMAR-IN42618352993919", ref: "IN42618352993919", amount: 2850, bal: 513305.55 },
    { date: "02/07/26", type: "CR", desc: "NEFT CR-ICIC0SF0002-VIVISH TECHNOLOGIES PRIVATE LIMITED-MAJESTIQUEEURISKAABLDGSAGRUSANMAR-IN42618353004619", ref: "IN42618353004619", amount: 3135, bal: 516440.55 },
    { date: "02/07/26", type: "CR", desc: "NEFT CR-ICIC0SF0002-VIVISH TECHNOLOGIES PRIVATE LIMITED-MAJESTIQUEEURISKAABLDGSAGRUSANMAR-IN42618352995529", ref: "IN42618352995529", amount: 2850, bal: 519290.55 },
    { date: "02/07/26", type: "CR", desc: "NEFT CR-ICIC0SF0002-VIVISH TECHNOLOGIES PRIVATE LIMITED-MAJESTIQUEEURISKAABLDGSAGRUSANMAR-IN42618353013680", ref: "IN42618353013680", amount: 3135, bal: 522425.55 },
    { date: "02/07/26", type: "CR", desc: "NEFT CR-ICIC0SF0002-VIVISH TECHNOLOGIES PRIVATE LIMITED-MAJESTIQUEEURISKAABLDGSAGRUSANMAR-IN42618353019528", ref: "IN42618353019528", amount: 2850, bal: 525275.55 },
    { date: "02/07/26", type: "CR", desc: "NEFT CR-ICIC0SF0002-VIVISH TECHNOLOGIES PRIVATE LIMITED-MAJESTIQUEEURISKAABLDGSAGRUSANMAR-IN42618353020677", ref: "IN42618353020677", amount: 2850, bal: 528125.55 },
    { date: "03/07/26", type: "DR", desc: "CHQ PAID-CTS S1-MUMB-SIDHARAM PARMESHWAR", ref: "0000000000000507", amount: 11700, bal: 516425.55 },
    { date: "03/07/26", type: "DR", desc: "CHQ PAID-CTS S5-MUMB-SHIVSHANKAR SINGH", ref: "0000000000000508", amount: 20000, bal: 496425.55 },
    { date: "08/07/26", type: "DR", desc: "FT - DR - 50100537218706 - SANDIP RAJU WAVARE", ref: "0000000000000509", amount: 28410, bal: 528086.55 },
    { date: "08/07/26", type: "DR", desc: "CHQ PAID-CTS S5-MUMB-SHUBHAM ENTERPRISES", ref: "0000000000000510", amount: 38119, bal: 489967.55 },
    { date: "09/07/26", type: "DR", desc: "CHQ PAID-CTS S4-MUMB-SAI SWIMMING POOL M", ref: "0000000000000512", amount: 4519, bal: 554819.55 },
    { date: "13/07/26", type: "DR", desc: "CHQ PAID-CTS S6-MUMB-NOUSHAD ALI", ref: "0000000000000511", amount: 2697, bal: 564092.55 },
    { date: "13/07/26", type: "DR", desc: "CHQ PAID-CTS S6-MUMB-SHREE SWAMI SAMARTH", ref: "0000000000000513", amount: 25045, bal: 539047.55 },
    { date: "14/07/26", type: "DR", desc: "FT - DR - 50200065450992 - MAJESTIQUE EURISKA C BLDG SA GRU SAN MAR", ref: "0000000000000514", amount: 8263, bal: 545077.30 },
    { date: "14/07/26", type: "DR", desc: "CHQ PAID-CTS S6-MUMB-MAJESTIQUE EURISKA", ref: "0000000000000515", amount: 23373, bal: 524089.55 },
    { date: "20/07/26", type: "DR", desc: "CHQ PAID-CTS S1-MUMB-SCHINDLER INDIA PRI", ref: "0000000000000420", amount: 89019, bal: 441145.32 },
    { date: "21/07/26", type: "DR", desc: "CHQ PAID-CTS S5-MUMB-PARVIOM TECHNOLOGIE", ref: "0000000000000516", amount: 23231, bal: 423699.82 },
    { date: "29/07/26", type: "DR", desc: "CHQ PAID-CTS S5-MUMB-MSEDCL", ref: "0000000000000517", amount: 39530, bal: 424339.27 }
  ]
};

// All-Time Combined Dataset (01 April 2026 - 29 July 2026)
const allTxs = [
  ...aprilData.transactionsList,
  ...mayData.transactionsList,
  ...juneData.transactionsList,
  ...JULY_2026_DATA.transactionsList
];

// Aggregate Vendors across all 4 months
const vendorAgg = {};
allTxs.filter(t => t.type === 'DR').forEach(t => {
  let name = t.desc;
  if (name.includes('CHQ PAID')) {
    const p = name.split('-');
    name = p[p.length - 1].trim();
  } else if (name.includes('FT - DR')) {
    const p = name.split('-');
    name = p[p.length - 1].trim();
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
  period: "April 1, 2026 – July 29, 2026 (4-Month Cumulative)",
  openingBalance: 149088.73,
  closingBalance: 424339.27,
  totalCredits: 1336246.54,
  totalDebits: 1060996.00,
  netCashFlow: 275250.54,
  vendorsData: allVendorsData,
  incomeCategories: [
    { name: "Vivish PG Maintenance NEFT", value: 907719.85, count: 281, color: "#196c6c" },
    { name: "Tata Play Broadband Refunds", value: 130265.00, count: 5, color: "#5f665f" },
    { name: "Cheque Deposits (CTS Clearing)", value: 86970.00, count: 11, color: "#31553e" },
    { name: "Direct Member UPI / IMPS", value: 47816.00, count: 11, color: "#a855f7" },
    { name: "Inter-Building Transfers (C/B)", value: 32603.00, count: 8, color: "#c2644a" },
    { name: "Other Direct Collections", value: 130872.69, count: 26, color: "#b98216" }
  ],
  expenseCategories: [
    { name: "Security, Housekeeping & Staff", value: 287422, color: "#196c6c" },
    { name: "Repairs & Operations (Shubham/Rai)", value: 223178, color: "#5f665f" },
    { name: "Electricity Utility (MSEDCL)", value: 221270, color: "#b98216" },
    { name: "Capital & AMCs (Schindler/CCTV/Pool)", value: 172880, color: "#c2644a" },
    { name: "Society Admin & Cash Withdrawals", value: 98720, color: "#ef4444" },
    { name: "Inter-Building Outflows", value: 57526, color: "#3b82f6" }
  ],
  timelineData: [
    { date: "April", balance: 164786.23, credit: 278884.50, debit: 263187.00 },
    { date: "May", balance: 333303.54, credit: 392044.31, debit: 223527.00 },
    { date: "June", balance: 465193.55, credit: 369080.01, debit: 237190.00 },
    { date: "July", balance: 424339.27, credit: 296237.72, debit: 337092.00 }
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
