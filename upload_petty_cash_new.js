import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc } from 'firebase/firestore';
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

const commonExpensesData = [
  // April (50%)
  { id: 101, date: '2026-04-30', vendor: 'Rudhi Dede', purpose: 'Chember Cleaning (50%)', receipt: '', payment: '500', remarks: '' },
  { id: 102, date: '2026-04-30', vendor: 'SP Electricals', purpose: 'Clubouse Driling work (50%)', receipt: '', payment: '200', remarks: '' },
  { id: 103, date: '2026-04-30', vendor: 'SP Electricals', purpose: 'Gazibo Wairing Disconect (50%)', receipt: '', payment: '150', remarks: '' },
  { id: 104, date: '2026-04-30', vendor: 'RS Hardware', purpose: 'Clubhouse Bthroom Jet Spary (50%)', receipt: '', payment: '220', remarks: '' },
  { id: 105, date: '2026-04-30', vendor: 'Sukanya Electricals', purpose: 'Street Light Purchase (50%)', receipt: '', payment: '650', remarks: '' },
  { id: 106, date: '2026-04-30', vendor: 'Ramdev Hardware', purpose: 'Clubhouse Wall J-Hock (50%)', receipt: '', payment: '47.5', remarks: '' },
  { id: 107, date: '2026-04-30', vendor: 'Ramdev Hardware', purpose: '6 pin cloth Hoock for Gym (50%)', receipt: '', payment: '35', remarks: '' },
  { id: 108, date: '2026-04-30', vendor: 'Rushi Dede', purpose: 'Drainage Cleanin B Bldg office to C office Bldg (50%)', receipt: '', payment: '3250', remarks: '' },
  { id: 109, date: '2026-04-30', vendor: 'Mayur Kamate', purpose: 'Clubhouse Bathroom Cleaning (50%)', receipt: '', payment: '750', remarks: '' },
  // May (50%)
  { id: 111, date: '2026-05-30', vendor: 'Rudhi Dede', purpose: 'Chember Cleaning (50%)', receipt: '', payment: '500', remarks: '' },
  { id: 112, date: '2026-05-30', vendor: 'SP Electricals', purpose: 'Clubouse Driling work (50%)', receipt: '', payment: '200', remarks: '' },
  { id: 113, date: '2026-05-30', vendor: 'SP Electricals', purpose: 'Gazibo Wairing Disconect (50%)', receipt: '', payment: '150', remarks: '' },
  { id: 114, date: '2026-05-30', vendor: 'RS Hardware', purpose: 'Clubhouse Bthroom Jet Spary (50%)', receipt: '', payment: '220', remarks: '' },
  { id: 115, date: '2026-05-30', vendor: 'Sukanya Electricals', purpose: 'Street Light Purchase (50%)', receipt: '', payment: '650', remarks: '' },
  { id: 116, date: '2026-05-30', vendor: 'Ramdev Hardware', purpose: 'Clubhouse Wall J-Hock (50%)', receipt: '', payment: '47.5', remarks: '' },
  { id: 117, date: '2026-05-30', vendor: 'Ramdev Hardware', purpose: '6 pin cloth Hoock for Gym (50%)', receipt: '', payment: '35', remarks: '' },
  { id: 118, date: '2026-05-30', vendor: 'Rushi Dede', purpose: 'Drainage Cleanin B Bldg office to C office Bldg (50%)', receipt: '', payment: '3250', remarks: '' },
  { id: 119, date: '2026-05-30', vendor: 'Mayur Kamate', purpose: 'Clubhouse Bathroom Cleaning (50%)', receipt: '', payment: '750', remarks: '' },
  // Jun
  { id: 201, date: '2026-06-30', vendor: 'Rudhi Dede', purpose: 'Chember Cheking Gazibo to STP Room', receipt: '', payment: '500', remarks: '' },
  { id: 202, date: '2026-06-30', vendor: 'Akash Shinde', purpose: 'Soil Dumpar and JCB charges', receipt: '', payment: '2500', remarks: '' },
  { id: 203, date: '2026-06-30', vendor: 'Alok Shah', purpose: 'Red Soil 05 nos tempo', receipt: '', payment: '12500', remarks: '' },
  { id: 204, date: '2026-06-30', vendor: 'Ankush Fire', purpose: 'Clubhouse Fire Extingusher Rifiling', receipt: '', payment: '330', remarks: '' },
  { id: 205, date: '2026-06-30', vendor: 'Ghule Enterprises', purpose: 'Cement Purchase', receipt: '', payment: '350', remarks: '' },
  { id: 206, date: '2026-06-30', vendor: 'PMC Person', purpose: 'Mosqueto Spray all society', receipt: '', payment: '1000', remarks: '' },
  { id: 207, date: '2026-06-30', vendor: 'Mastan Shaikh', purpose: 'Clubhouse Lawn Dig a pit', receipt: '', payment: '2000', remarks: '' },
  // Income
  { id: 208, date: '2026-06-30', vendor: 'System', purpose: 'PNG Jwelers and Bedsheet Activity Received amount', receipt: '6000', payment: '', remarks: '' }
];

async function upload() {
  const data = JSON.parse(fs.readFileSync('/Users/sweta/Amit_Development/Majestique_Euriska_Dashboard/petty_cash_fy2627.json', 'utf-8'));
  
  await setDoc(doc(db, 'pettyCash', 'buildingA'), {
    entries: data,
    updatedAt: new Date().toISOString()
  }); // NOT using merge: true, so it replaces the document entirely
  
  await setDoc(doc(db, 'pettyCash', 'common'), {
    entries: commonExpensesData,
    updatedAt: new Date().toISOString()
  });

  console.log(`Successfully uploaded ${data.length} records and removed old data!`);
  console.log(`Successfully uploaded common expenses!`);
  process.exit(0);
}

upload().catch(console.error);
