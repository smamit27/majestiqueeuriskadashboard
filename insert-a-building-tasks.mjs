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
// New A Building Manager Tasks (Oct 2026)
// ─────────────────────────────────────────────────────────────────────────────
const NEW_TASKS = [
  { id:'AB-002', taskCategory:'Tenant Rent Agreement: 506 & 1008', area:'A Building', taskDescription:'Tenant Rent agreement for Flat 506 and Flat 1008', vendorName:'', assignedTo:'Siddu', startDate:'2026-10-01', deadline:'', priority:'High', status:'Pending', remarks:'' },
  { id:'AB-003', taskCategory:'Flat No 403 Owner Talk', area:'A Building', taskDescription:'Discussion with Flat 403 owner regarding pending matters', vendorName:'', assignedTo:'Siddu', startDate:'2026-10-01', deadline:'', priority:'Medium', status:'Pending', remarks:'' },
  { id:'AB-004', taskCategory:'Pending Painting Work: 1004', area:'A Building', taskDescription:'Pending painting work of Flat 1004', vendorName:'', assignedTo:'Siddu', startDate:'2026-10-01', deadline:'', priority:'Medium', status:'Pending', remarks:'' },
  { id:'AB-005', taskCategory:'Send Notice to Shop Owners', area:'A Building', taskDescription:'Send official notice to all shop owners', vendorName:'', assignedTo:'Siddu', startDate:'2026-10-01', deadline:'', priority:'High', status:'Pending', remarks:'' },
  { id:'AB-006', taskCategory:'Parking Allotment Letter', area:'A Building', taskDescription:'Issue parking allotment letters to residents', vendorName:'', assignedTo:'Siddu', startDate:'2026-10-01', deadline:'2026-10-10', priority:'High', status:'Pending', remarks:'Deadline: 10th October 2026' },
  { id:'AB-007', taskCategory:'Cockroach/Rat Pest Control', area:'A Building', taskDescription:'Arrange cockroach and rat pest control treatment for the building', vendorName:'', assignedTo:'Siddu', startDate:'2026-10-01', deadline:'', priority:'Medium', status:'Pending', remarks:'' },
  { id:'AB-008', taskCategory:'Solar Discussion', area:'A Building', taskDescription:'Solar panel installation discussion and planning', vendorName:'', assignedTo:'Siddu', startDate:'2026-10-01', deadline:'2026-12-01', priority:'Medium', status:'Pending', remarks:'Max deadline: next 2 months' },
  { id:'AB-009', taskCategory:'Builder Discussion', area:'A Building', taskDescription:'Discussion with builder regarding pending issues', vendorName:'', assignedTo:'Siddu', startDate:'2026-10-01', deadline:'2026-12-01', priority:'Medium', status:'Pending', remarks:'Max deadline: next 2 months' },
];

const COLLECTION = 'managerTasks_a_building';

async function insertTasks() {
  let inserted = 0;
  let skipped = 0;

  for (const task of NEW_TASKS) {
    const ref = doc(db, COLLECTION, task.id);
    const existing = await getDoc(ref);

    if (existing.exists()) {
      console.log(`⏭️  SKIP  ${task.id} — "${task.taskCategory}" already exists`);
      skipped++;
      continue;
    }

    const { id, ...data } = task;
    await setDoc(ref, { ...data, updatedAt: serverTimestamp() });
    console.log(`✅ INSERT ${task.id} — "${task.taskCategory}"`);
    inserted++;
  }

  console.log(`\n──────────────────────────────────────`);
  console.log(`Done! Inserted: ${inserted}, Skipped: ${skipped}`);
  process.exit(0);
}

insertTasks().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
