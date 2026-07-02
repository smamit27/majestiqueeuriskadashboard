const { initializeApp } = require('firebase/app');
const { getFirestore, doc, setDoc } = require('firebase/firestore');
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

async function upload() {
  const data = JSON.parse(fs.readFileSync('/Users/sweta/.gemini/antigravity-ide/brain/bc875513-e98f-487c-9a49-838bd4089124/scratch/fy2627_petty_cash.json'));
  await setDoc(doc(db, 'pettyCash', 'buildingA'), { entries: data });
  console.log("Successfully uploaded", data.length, "entries for FY 26-27 onwards.");
}

upload().then(() => process.exit(0)).catch(console.error);
