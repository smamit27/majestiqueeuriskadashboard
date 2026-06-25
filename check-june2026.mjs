import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import fs from 'fs';

const firebaseConfigPath = '/Users/sweta/Amit_Development/Majestique_Euriska_Dashboard/src/firebase.js';
const content = fs.readFileSync(firebaseConfigPath, 'utf-8');

const apiKeyMatch = content.match(/apiKey:\s*"([^"]+)"/);
const projectIdMatch = content.match(/projectId:\s*"([^"]+)"/);

const firebaseConfig = {
  apiKey: apiKeyMatch ? apiKeyMatch[1] : '',
  authDomain: projectIdMatch ? `${projectIdMatch[1]}.firebaseapp.com` : '',
  projectId: projectIdMatch ? projectIdMatch[1] : '',
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function checkData() {
  const snap = await getDoc(doc(db, 'financeMonthly', 'finance_2026-06'));
  if (snap.exists()) {
    console.log('finance_2026-06 EXISTS!');
    console.log(JSON.stringify(snap.data(), null, 2));
  } else {
    console.log('finance_2026-06 DOES NOT EXIST!');
  }
  process.exit(0);
}

checkData();
