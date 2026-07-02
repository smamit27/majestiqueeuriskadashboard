import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore';
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

async function splitRows() {
  const docRef = doc(db, 'pettyCash', 'buildingA');
  const snap = await getDoc(docRef);
  
  if (snap.exists()) {
    const data = snap.data();
    let oldEntries = data.entries || [];
    let newEntries = [];
    
    // Sort just in case
    oldEntries.sort((a, b) => new Date(a.date) - new Date(b.date));
    
    let idCounter = Date.now();
    
    for (const item of oldEntries) {
      if (item.receipt && item.payment) {
        // Create Receipt Row
        newEntries.push({
          id: idCounter++,
          date: item.date,
          vendor: '',
          purpose: 'Fund Received',
          receipt: item.receipt,
          payment: '',
          remarks: ''
        });
        
        // Create Payment Row
        newEntries.push({
          id: idCounter++,
          date: item.date,
          vendor: item.vendor,
          purpose: item.purpose,
          receipt: '',
          payment: item.payment,
          remarks: item.remarks
        });
      } else {
        newEntries.push(item);
      }
    }
    
    await setDoc(docRef, { entries: newEntries }, { merge: true });
    console.log(`Successfully split entries. New count: ${newEntries.length}`);
  }
}

splitRows().then(() => process.exit(0)).catch(console.error);
