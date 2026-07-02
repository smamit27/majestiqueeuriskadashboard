import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import fs from 'fs';

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
    console.log("Data exists! Entries:", snap.data().entries.length);
  } else {
    console.log("Document does not exist!");
  }
}
check().then(() => process.exit(0));
