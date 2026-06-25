import fs from 'fs';

const text = fs.readFileSync('seed-finance.mjs', 'utf8');
const lines = text.split('\n');
let dataLines = [];
let capture = false;
for (let line of lines) {
  if (line.startsWith('const financeData = {')) { capture = true; }
  if (capture) {
    dataLines.push(line);
    if (line === '};') break;
  }
}

const dataObjectString = dataLines.join('\n').replace('const financeData = ', '').trim().replace(/;$/, '');
const data = eval(`(${dataObjectString})`);

const months = [
  'finance_2025-04', 'finance_2025-05', 'finance_2025-06', 'finance_2025-07',
  'finance_2025-08', 'finance_2025-09', 'finance_2025-10', 'finance_2025-11',
  'finance_2025-12', 'finance_2026-01', 'finance_2026-02', 'finance_2026-03'
];

let totalMsedcl = 0;
const results = [];

months.forEach(month => {
  if (data[month] && data[month].expenses) {
    data[month].expenses.forEach(item => {
      const vendor = (item.vendor || '').toLowerCase();
      const purpose = (item.purpose || '').toLowerCase();
      // Let's be lenient to find all MSEDCL and A Building combinations
      if ((vendor.includes('msedcl') || purpose.includes('msedcl') || vendor.includes('electricity') || purpose.includes('electricity') || vendor.includes('mahavitaran') || purpose.includes('mahavitaran')) && 
          (purpose.includes('a building') || vendor.includes('a building') || purpose.includes('building a') || vendor.includes('building a') || purpose.includes('a bldg') || vendor.includes('a bldg'))) {
        results.push({
           month: data[month].month,
           vendor: item.vendor,
           purpose: item.purpose,
           amount: item.amount
        });
        totalMsedcl += parseFloat(item.amount) || 0;
      }
    });
  }
});

console.log('All expenses for 2026-03:');
if (data['finance_2026-03']) {
  data['finance_2026-03'].expenses.forEach(item => {
    console.log(`${item.amount} - ${item.vendor} (${item.purpose})`);
  });
}
