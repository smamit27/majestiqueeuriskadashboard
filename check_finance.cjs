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
  console.log("Documents in financeMonthly:");
  snapshot.docs.forEach(doc => {
    console.log(`- ${doc.id}`);
  });
}

check().catch(console.error).finally(() => process.exit(0));
