const admin = require('firebase-admin');
const fs = require('fs');

if (!admin.apps.length) {
  const serviceAccount = JSON.parse(fs.readFileSync('./serviceAccountKey.json', 'utf8'));
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function check() {
  const snapshot = await db.collection('financeMonthly').get();
  snapshot.docs.forEach(doc => {
    const data = doc.data();
    if (data.income) {
      data.income.forEach(i => {
        if (i.source && i.source.toLowerCase().includes('shop')) {
          console.log(`Found in income [${doc.id}]:`, i);
        }
      });
    }
    if (data.expenses) {
      data.expenses.forEach(e => {
        if (e.purpose && e.purpose.toLowerCase().includes('shop')) {
          console.log(`Found in expenses purpose [${doc.id}]:`, e);
        }
        if (e.vendor && e.vendor.toLowerCase().includes('shop')) {
          console.log(`Found in expenses vendor [${doc.id}]:`, e);
        }
      });
    }
  });
}

check().catch(console.error).finally(() => process.exit(0));
