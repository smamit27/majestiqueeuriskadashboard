import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import fs from 'fs';

// Load .env file manually
const envContent = fs.readFileSync('./.env', 'utf-8');
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    const key = match[1].trim();
    let val = match[2].trim();
    if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
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
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// ─────────────────────────────────────────────────────────────────────────────
// Cheques from the physical cheque book (Aug 2026 — Common Work)
// Cheque 524 is PHYSICALLY MISSING from the book → stored as CANCELLED
// ─────────────────────────────────────────────────────────────────────────────
const AUG_CHEQUES = [
  {
    chequeNo: '520',
    date: '2026-08-03',
    vendor: 'Shubham Enterprises',
    purpose: 'Common Work',
    amount: '39587',
    whoPaid: 'A Building',
    isPaid: false,
  },
  {
    chequeNo: '521',
    date: '2026-08-03',
    vendor: '',
    purpose: '',
    amount: '10000',
    whoPaid: 'A Building',
    isPaid: false,
  },
  {
    chequeNo: '522',
    date: '2026-08-03',
    vendor: 'Danshel Ali',
    purpose: 'Common Work',
    amount: '2772',
    whoPaid: 'A Building',
    isPaid: false,
  },
  {
    chequeNo: '523',
    date: '2026-08-03',
    vendor: 'Sai Swimming Pool Maintenance Services',
    purpose: 'Swimming Pool Maintenance',
    amount: '4519',
    whoPaid: 'A Building',
    isPaid: false,
  },
  {
    // CHEQUE 524 IS PHYSICALLY MISSING FROM BOOK — stored as CANCELLED
    chequeNo: '524',
    date: '2026-08-03',
    vendor: 'CANCELLED',
    purpose: 'Cheque missing from book — not issued',
    amount: '0',
    whoPaid: 'A Building',
    isPaid: false,
  },
  {
    chequeNo: '525',
    date: '2026-08-03',
    vendor: 'Sandip Raju Wavare',
    purpose: 'Common Work',
    amount: '49000',
    whoPaid: 'A Building',
    isPaid: false,
  },
  {
    chequeNo: '526',
    date: '2026-08-03',
    vendor: 'Sidharam Parmeshwar Lende',
    purpose: 'Common Work',
    amount: '11700',
    whoPaid: 'A Building',
    isPaid: false,
  },
];

async function insertAugCheques() {
  const DOC_ID = 'cheques_2026-08';      // ← A Building (NOT common)
  const MONTH  = '2026-08';

  const ref  = doc(db, 'chequesMonthly', DOC_ID);
  const snap = await getDoc(ref);

  let existing = [];
  if (snap.exists()) {
    existing = snap.data().cheques || [];
    console.log(`Document "${DOC_ID}" already exists with ${existing.length} cheque(s).`);
  } else {
    console.log(`Document "${DOC_ID}" does not exist yet — will create fresh.`);
  }

  let updated = [...existing];
  let added = 0, skipped = 0;

  for (const cheque of AUG_CHEQUES) {
    const alreadyExists = updated.some(c => String(c.chequeNo) === String(cheque.chequeNo));
    if (alreadyExists) {
      console.log(`  SKIP Cheque #${cheque.chequeNo} already in DB.`);
      skipped++;
      continue;
    }

    updated.push({
      ...cheque,
      id:    Date.now() + Math.floor(Math.random() * 9999),
      srNo:  updated.length + 1,
    });
    console.log(`  ADD  Cheque #${cheque.chequeNo} (${cheque.vendor || 'Unknown'} — Rs.${cheque.amount})`);
    added++;
  }

  // Re-sort by cheque number ascending, then re-index srNo
  updated.sort((a, b) => {
    const na = Number(String(a.chequeNo).replace(/\D/g, '')) || Infinity;
    const nb = Number(String(b.chequeNo).replace(/\D/g, '')) || Infinity;
    return na - nb;
  });
  updated = updated.map((c, i) => ({ ...c, srNo: i + 1 }));

  await setDoc(ref, {
    month:     MONTH,
    cheques:   updated,
    updatedAt: serverTimestamp(),
  }, { merge: true });

  console.log(`\nDone! Added: ${added}, Skipped (already exist): ${skipped}`);
  console.log(`Total cheques in "${DOC_ID}": ${updated.length}`);
  console.log(`NOTE: Cheque #524 stored as CANCELLED (physically missing from book)`);
}

insertAugCheques()
  .then(() => process.exit(0))
  .catch(err => { console.error('Error:', err); process.exit(1); });
