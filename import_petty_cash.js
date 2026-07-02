import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc } from 'firebase/firestore';
import fs from 'fs';

// Load .env file manually
const envPath = './.env';
const envContent = fs.readFileSync(envPath, 'utf-8');
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    const key = match[1].trim();
    let val = match[2].trim();
    if (val.startsWith('"') && val.endsWith('"')) {
      val = val.slice(1, -1);
    }
    process.env[key] = val;
  }
});

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
  measurementId: process.env.VITE_FIREBASE_MEASUREMENT_ID
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function importPettyCash() {
  const dataPath = '/Users/sweta/.gemini/antigravity-ide/brain/bc875513-e98f-487c-9a49-838bd4089124/scratch/parsed_petty_cash.json';
  const data = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
  
  const docRef = doc(db, 'pettyCash', 'buildingA');
  await setDoc(docRef, { entries: data, updatedAt: new Date().toISOString() }, { merge: true });
  console.log(`Successfully uploaded ${data.length} records to pettyCash/buildingA`);
}

importPettyCash().then(() => process.exit(0)).catch(console.error);
