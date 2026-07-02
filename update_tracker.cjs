const fs = require('fs');

const trackerFile = './src/components/organisms/ShopMaintenanceTracker.jsx';
let content = fs.readFileSync(trackerFile, 'utf8');

const newData = fs.readFileSync('./new_shop_data.js', 'utf8');

const startIndex = content.indexOf('const initialShopData = [');
const endMatch = content.match(/];\s*\n\s*function formatValue/);

if (startIndex !== -1 && endMatch) {
  const endIndex = endMatch.index + 2; // end of "];"
  content = content.substring(0, startIndex) + newData.trim() + content.substring(endIndex);
  
  // Now add the UI banner for Rate Slabs. We will insert it just above the Overall Pending card in the header.
  const headerTarget = `<div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 12 }}>`;
  const rateSlabs = `
          <div style={{ background: 'rgba(255,255,255,0.06)', padding: '10px 16px', borderRadius: 12, border: '1px dashed rgba(255,255,255,0.25)', textAlign: 'left', minWidth: 280 }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#fcd34d', marginBottom: 4, letterSpacing: '0.04em' }}>📋 Rate Slabs</div>
            <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.9)' }}>
              <div>Oct 2021 – Jun 2025 : ₹1,100 / month (45 months)</div>
              <div style={{ margin: '3px 0', height: 1, background: 'rgba(255,255,255,0.1)' }}></div>
              <div>Jul 2025 – Till Now : ₹1,500 / month (13 months)</div>
            </div>
          </div>
  `;
  
  if (content.includes(headerTarget) && !content.includes('📋 Rate Slabs')) {
    content = content.replace(headerTarget, headerTarget + rateSlabs);
  }
  
  fs.writeFileSync(trackerFile, content);
  console.log('Updated ShopMaintenanceTracker.jsx successfully.');
} else {
  console.log('Could not find the target blocks.');
}
