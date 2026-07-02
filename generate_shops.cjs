const fs = require('fs');

const shops = [
  { id: 1, shopNo: 'Shop 1', name: 'Mr. Gulshan Vasnani', contactNo: '9822620468' },
  { id: 2, shopNo: 'Shop 2', name: 'Mr. Aslamkhan Risaldar', contactNo: '9860148160' },
  { id: 3, shopNo: 'Shop 3', name: 'Mr. Rajabhau Shinde', contactNo: '9561001815' },
  { id: 4, shopNo: 'Shop 4', name: 'Mr. S.P Mane', contactNo: '8308821998' },
  { id: 5, shopNo: 'Shop 5', name: 'Mr. Yogesh Sitaram Saste', contactNo: '9850117094' },
  { id: 6, shopNo: 'Shop 6', name: 'Mr. Abaji L. Dabhade', contactNo: '9657065660' },
  { id: 7, shopNo: 'Shop 7', name: 'Mr. Sandeep Gaikwad', contactNo: '9767200778' },
  { id: 8, shopNo: 'Shop 8', name: 'Mr. S.P Mane', contactNo: '8308821998' }
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
    
    let regularMain = 1500;
    if (y < 25 || (y === 25 && monthIdx <= 5)) {
      regularMain = 1100;
    }
    
    netAmount += regularMain;
    
    return `      { month: '${m}', regularMain: ${regularMain}, receipts: '', netAmount: ${netAmount} }`;
  });
  
  result += shop.ledger.join(',\n') + '\n    ]\n  }' + (i < shops.length - 1 ? ',' : '') + '\n';
});
result += '];\n';

fs.writeFileSync('new_shop_data.js', result);
console.log('done');
