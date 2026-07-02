const admin = require('firebase-admin');
const fs = require('fs');

if (!admin.apps.length) {
  const serviceAccount = JSON.parse(fs.readFileSync('./serviceAccountKey.json', 'utf8'));
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function removeShopMaintenance() {
  console.log("Fetching all financeMonthly documents...");
  const snapshot = await db.collection('financeMonthly').get();
  
  if (snapshot.empty) {
    console.log("No finance documents found.");
    return;
  }
  
  let totalUpdated = 0;
  
  for (const doc of snapshot.docs) {
    const data = doc.data();
    if (data.income && Array.isArray(data.income)) {
      const originalLength = data.income.length;
      const filteredIncome = data.income.filter(item => item.source !== 'Shop Maintenance');
      
      if (filteredIncome.length !== originalLength) {
        await db.collection('financeMonthly').doc(doc.id).update({
          income: filteredIncome
        });
        console.log(`Removed Shop Maintenance from ${doc.id}`);
        totalUpdated++;
      }
    }
  }
  
  console.log(`Done! Updated ${totalUpdated} documents.`);
}

removeShopMaintenance().catch(console.error).finally(() => process.exit(0));
