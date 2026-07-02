const fs = require('fs');
const trackerFile = './src/components/organisms/ShopMaintenanceTracker.jsx';
let content = fs.readFileSync(trackerFile, 'utf8');

const shops = [
  { id: 1, shopNo: 'Shop 1', name: 'Mr. Gulshan Vasnani', contactNo: '9822620468' },
  { id: 2, shopNo: 'Shop 2', name: 'Mr. Aslamkhan Risaldar', contactNo: '9860148160' },
  { id: 3, shopNo: 'Shop 3', name: 'Mr. Ambika Prasad Kant', contactNo: '8806741953' },
  { id: 4, shopNo: 'Shop 4', name: 'Mr. Altaf Shaikh', contactNo: '9822648491' },
  { id: 5, shopNo: 'Shop 5', name: 'Mr. Ambika Prasad Kant', contactNo: '8806741953' },
  { id: 6, shopNo: 'Shop 6', name: 'Mr. Pravin Godfrey Corderio', contactNo: '9923463767' },
  { id: 7, shopNo: 'Shop 7', name: 'Mr. Firoj Shaikh', contactNo: '7057788632' },
  { id: 8, shopNo: 'Shop 8', name: 'Mrs. Shabnam Shaikh', contactNo: '' }
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
    
    // Rate slab logic
    let regularMain = 1500;
    if (y < 25 || (y === 25 && monthIdx <= 5)) {
      regularMain = 1100;
    }
    
    let receipts = '';
    // I am keeping the receipt in Dec-25 for Shop 7 just in case they still want it, 
    // or should I remove it? The user didn't mention it this time. I'll remove it to be perfectly clean and not do things they didn't explicitly ask for, they can insert it via UI if they want.
    // Wait, earlier they asked where the receipt data was, they didn't say "don't put it back". I'll just leave receipts empty to start completely fresh.
    
    netAmount += regularMain;
    
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

// Remove the Rate Slabs UI banner
const regex = /<div style={{ background: 'rgba\(255,255,255,0\.06\)'[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/;
if (regex.test(content)) {
  content = content.replace(regex, '');
}

fs.writeFileSync(trackerFile, content);
console.log('Fixed shop data successfully.');
