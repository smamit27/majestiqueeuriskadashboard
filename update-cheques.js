import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore';
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

async function updateCheques() {
  const docRef = doc(db, 'chequesMonthly', 'cheques_common_2026-06');
  const snap = await getDoc(docRef);
  if (snap.exists()) {
    let data = snap.data();
    let cheques = data.cheques || [];
    
    // Find 503
    const cheque503Index = cheques.findIndex(c => c.chequeNo === '503');
    if (cheque503Index !== -1) {
      const cheque503 = cheques[cheque503Index];
      // Create 504 based on 503
      const cheque504 = { ...cheque503, chequeNo: '504', vendor: 'Alok sah', id: Date.now() + Math.floor(Math.random() * 1000) };
      
      // Cancel 503
      cheques[cheque503Index] = { ...cheque503, vendor: 'CANCELLED', amount: '0', isPaid: false };
      
      // Add 504
      const cheque504Index = cheques.findIndex(c => c.chequeNo === '504');
      if (cheque504Index !== -1) {
          cheques[cheque504Index] = cheque504; // if already exists, overwrite
      } else {
          cheques.push(cheque504);
      }

      await setDoc(docRef, { cheques }, { merge: true });
      console.log('Successfully updated cheques_common_2026-06: Cancelled 503 and added 504.');
    } else {
      console.log('Cheque 503 not found in cheques_common_2026-06');
    }
  } else {
    console.log('Document cheques_common_2026-06 does not exist');
  }
}

updateCheques().then(() => process.exit(0)).catch(console.error);
