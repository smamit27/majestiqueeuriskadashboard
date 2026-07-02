const fs = require('fs');
const trackerFile = './src/components/organisms/ShopMaintenanceTracker.jsx';
let content = fs.readFileSync(trackerFile, 'utf8');

const shops = [
  { id: 1, shopNo: 'Shop 1', name: 'Mr. Gulshan Vasnani', contactNo: '9822620468' },
  { id: 2, shopNo: 'Shop 2', name: 'Mr. Aslamkhan Risaldar', contactNo: '9860148160' },
  { id: 3, shopNo: 'Shop 3', name: 'Mr. Rajabhau Shinde', contactNo: '9561001815' },
  { id: 4, shopNo: 'Shop 4', name: 'Mr. S.P Mane', contactNo: '8308821998' },
  { id: 5, shopNo: 'Shop 5', name: 'Mr. Yogesh Sitaram Saste', contactNo: '9850117094' },
  { id: 6, shopNo: 'Shop 6', name: 'Mr. Abaji L. Dabhade', contactNo: '9657065660' },
  { id: 7, shopNo: 'Shop 7', name: 'Mr. Sandeep Gaikwad', contactNo: '9767200778' },
  { id: 8, shopNo: 'Shop 8', name: 'Mrs. Shabnam Shaikh', contactNo: '9270367750' }
];

const months = [];
const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
let started = false;
for (let y = 21; y <= 26; y++) {
  for (let m = 0; m < 12; m++) {
    if (y === 21 && m === 9) started = true; // Oct 21
    if (y === 26 && m > 6) break; // End at Jul 26
    if (started) {
      months.push(`${monthNames[m]}-${y}`);
    }
  }
}

let result = 'const initialShopData = [\n';
shops.forEach((shop, i) => {
  result += `  {\n    id: ${shop.id},\n    shopNo: '${shop.shopNo}',\n    name: '${shop.name}',\n    contactNo: '${shop.contactNo}',\n    maintenance: '',\n    ledger: [\n`;
  let netAmount = 0;
  shop.ledger = months.map(m => {
    const [monthStr, yearStr] = m.split('-');
    const y = parseInt(yearStr);
    const monthIdx = monthNames.indexOf(monthStr);
    
    // NEW CORRECT SLABS: Oct 21 - Jun 25 = 1100, Jul 25 - Till Now = 1500
    let regularMain = 1500;
    if (y < 25 || (y === 25 && monthIdx <= 5)) {
      regularMain = 1100;
    }
    
    let receipts = '';
    // Restore the Shop 7 receipt of 25700 to Dec-25
    if (shop.id === 7 && m === 'Dec-25') {
      receipts = 25700;
    }
    
    netAmount += regularMain;
    if (receipts !== '') {
      netAmount -= receipts;
    }
    
    return `      { month: '${m}', regularMain: ${regularMain}, receipts: '${receipts}', netAmount: ${netAmount} }`;
  });
  result += shop.ledger.join(',\n') + '\n    ]\n  }' + (i < shops.length - 1 ? ',' : '') + '\n';
});
result += '];\n';

const startIndex = content.indexOf('const initialShopData = [');
const endMatch = content.match(/];\s*\n\s*function formatValue/);

if (startIndex !== -1 && endMatch) {
  const endIndex = endMatch.index + 2; 
  content = content.substring(0, startIndex) + result + content.substring(endIndex);
}

// Add Rate Slabs UI banner back, making sure the text matches EXACTLY what they want
const headerTarget = `<div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 12 }}>`;
const rateSlabs = `
          <div style={{ background: 'rgba(255,255,255,0.06)', padding: '10px 16px', borderRadius: 12, border: '1px dashed rgba(255,255,255,0.25)', textAlign: 'left', minWidth: 280 }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#fcd34d', marginBottom: 4, letterSpacing: '0.04em' }}>📋 Rate Slabs</div>
            <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.9)' }}>
              <div style={{ marginBottom: 3 }}>Oct 2021 – Jun 2025 : ₹1,100 / month (45 months)</div>
              <div style={{ height: 1, background: 'rgba(255,255,255,0.1)' }}></div>
              <div style={{ marginTop: 3 }}>Jul 2025 – Till Now : ₹1,500 / month (13 months)</div>
            </div>
          </div>
  `;

if (content.includes(headerTarget) && !content.includes('📋 Rate Slabs')) {
  content = content.replace(headerTarget, headerTarget + rateSlabs);
}

fs.writeFileSync(trackerFile, content);
console.log('Final Update completed successfully.');
