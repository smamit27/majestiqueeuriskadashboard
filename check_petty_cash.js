import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import fs from 'fs';

const envPath = './.env';
const envContent = fs.readFileSync(envPath, 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    let val = match[2].trim();
    if (val.startsWith('"')) val = val.slice(1, -1);
    env[match[1].trim()] = val;
  }
});

const app = initializeApp({
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID
});
const db = getFirestore(app);

async function check() {
  const docRef = doc(db, 'pettyCash', 'buildingA');
  const snap = await getDoc(docRef);
  if (snap.exists()) {
    console.log(`Found ${snap.data().entries.length} entries in pettyCash/buildingA`);
    console.log(snap.data().entries.slice(0, 5));
  } else {
    console.log('No data found in pettyCash/buildingA');
  }
  process.exit(0);
}

check().catch(console.error);
