import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import fs from 'fs';

const envContent = fs.readFileSync('./.env', 'utf-8');
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

async function run() {
  console.log("--- Checking 'chequesMonthly' collection ---");
  const chequesSnap = await getDocs(collection(db, 'chequesMonthly'));
  console.log(`Found ${chequesSnap.size} cheque documents.`);
  chequesSnap.forEach(doc => {
    console.log(doc.id, JSON.stringify(doc.data()));
  });
}

run().then(() => process.exit(0)).catch(console.error);
