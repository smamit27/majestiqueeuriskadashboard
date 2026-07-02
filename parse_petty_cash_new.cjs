const fs = require('fs');

const rawData = `10000	02.04.2026	 	 	 	9027			
 	04.04.26	Uttareswar	Waterman salary	5650	3377			
 	05.04.26	Siddu lende	Common Expenses month of Mar 26	2131	1246			
 	29.04.26	Rana Biswas	Bathroom out side Plumbing Work	430	816			
 	29.04.26	Shree krushna H/W	10w LED purchase	1200	-384			
10000	02.05.2026	 	 	 	9616			
 	05.05.2026	Uttareswar	Waterman salary	5650	3966			
 	05.05.26	IGS Enterprises	Solar Pipe Insstalation	800	3166			
 	30.05.26	Siddu lende	Common Expenses	4370	-1204			
10000	02.06.2026	 	 	 	8796			
 	03.06.2026	Uttareswar	Waterman salary	5650	3146			
 	03.06.2026	IGS Enterprises	Solar Lekage work	600	2546`;

const lines = rawData.trim().split('\n');

const entries = [];
let idCounter = Date.now();

// Insert the opening balance for FY 26-27 so that the math works out
entries.push({
  id: idCounter++,
  date: '2026-04-01',
  vendor: 'System',
  purpose: 'Opening Balance Adjustment for FY 26-27',
  receipt: '0',
  payment: '973', // -973 balance
  remarks: 'Auto-adjusted to match ledger balances'
});

lines.forEach(line => {
  const parts = line.split('\t');
  if (parts.length < 5) return;
  
  const receipt = parts[0].trim();
  const rawDate = parts[1].trim();
  const vendor = parts[2].trim();
  const purpose = parts[3].trim();
  const payment = parts[4].trim();

  // Parse DD.MM.YYYY or DD.MM.YY
  let dateParts = rawDate.split('.');
  if (dateParts.length !== 3) return;
  
  let d = dateParts[0].padStart(2, '0');
  let m = dateParts[1].padStart(2, '0');
  let y = dateParts[2];
  if (y.length === 2) {
    y = '20' + y;
  }
  
  const isoDate = `${y}-${m}-${d}`;

  entries.push({
    id: idCounter++,
    date: isoDate,
    vendor: vendor || (receipt ? 'Fund Received' : ''),
    purpose: purpose,
    receipt: receipt,
    payment: payment,
    remarks: ''
  });
});

fs.writeFileSync('/Users/sweta/Amit_Development/Majestique_Euriska_Dashboard/petty_cash_fy2627.json', JSON.stringify(entries, null, 2));
console.log("Parsed " + entries.length + " entries!");
