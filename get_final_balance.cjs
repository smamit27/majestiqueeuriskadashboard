const { initializeApp } = require('firebase/app');
const { getFirestore, doc, getDoc } = require('firebase/firestore');
const fs = require('fs');

const envPath = './.env';
const envContent = fs.readFileSync(envPath, 'utf-8');
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    const key = match[1].trim();
    let val = match[2].trim();
    if (val.startsWith('"')) val = val.slice(1, -1);
    process.env[key] = val;
  }
});

const app = initializeApp({
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID
});
const db = getFirestore(app);

async function check() {
  const snap = await getDoc(doc(db, 'pettyCash', 'buildingA'));
  if (snap.exists()) {
    let runningBalance = 0;
    const entries = snap.data().entries;
    for (const item of entries) {
      const rec = parseFloat(item.receipt) || 0;
      const pay = parseFloat(item.payment) || 0;
      runningBalance += (rec - pay);
    }
    console.log("Total entries:", entries.length);
    console.log("Final balance:", runningBalance);
  }
}
check().then(() => process.exit(0));
