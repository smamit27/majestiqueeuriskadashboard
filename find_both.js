const fs = require('fs');
const data = JSON.parse(fs.readFileSync('scratch/parsed_petty_cash.json'));
const both = data.filter(d => d.receipt && d.payment);
console.log(both);
