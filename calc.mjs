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

let totalIncome = 0;
let totalExpenses = 0;

const months = [
  'finance_2025-04', 'finance_2025-05', 'finance_2025-06', 'finance_2025-07',
  'finance_2025-08', 'finance_2025-09', 'finance_2025-10', 'finance_2025-11',
  'finance_2025-12', 'finance_2026-01', 'finance_2026-02', 'finance_2026-03'
];

months.forEach(month => {
  if (data[month]) {
    data[month].income.forEach(item => {
      totalIncome += parseFloat(item.amount) || 0;
    });
    data[month].expenses.forEach(item => {
      totalExpenses += parseFloat(item.amount) || 0;
    });
  }
});

console.log('Total Income:', totalIncome);
console.log('Total Expenses:', totalExpenses);
console.log('Balance:', totalIncome - totalExpenses);
