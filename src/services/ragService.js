import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { initialShopData } from '../components/organisms/ShopMaintenanceTracker';
import { complaints as mockComplaints, dues as mockDues, finance as mockFinance, staff as mockStaff, visitors as mockVisitors } from '../data/mockData';

// Helper to determine intent and required collection
function analyzeIntent(query) {
  const lowerQuery = query.toLowerCase();
  
  if (lowerQuery.includes('shop') || lowerQuery.includes('maintenance')) {
    return { type: 'shops', query: lowerQuery };
  }
  if (lowerQuery.includes('complaint')) {
    return { type: 'complaints', query: lowerQuery };
  }
  if (lowerQuery.includes('expense') || lowerQuery.includes('finance') || lowerQuery.includes('income')) {
    return { type: 'finance', query: lowerQuery };
  }
  if (lowerQuery.includes('staff') || lowerQuery.includes('attendance')) {
    return { type: 'staff', query: lowerQuery };
  }
  if (lowerQuery.includes('electricity') || lowerQuery.includes('water') || lowerQuery.includes('vendor')) {
    return { type: 'commonExpenses', query: lowerQuery };
  }
  if (lowerQuery.includes('dues') || lowerQuery.includes('unpaid')) {
    return { type: 'dues', query: lowerQuery };
  }
  
  return { type: 'unknown', query: lowerQuery };
}

export async function generateContextForQuery(query) {
  const intent = analyzeIntent(query);
  
  if (intent.type === 'unknown') {
    return null; 
  }

  try {
    let contextStr = `Data retrieved from ${intent.type}:\n`;

    if (intent.type === 'shops') {
      const snap = await getDoc(doc(db, 'shopMaintenance', 'shop_maintenance_ledger'));
      let shopsData = initialShopData;

      if (snap.exists() && snap.data().shops) {
        shopsData = snap.data().shops;
      } else {
        contextStr += `(Note: Live Firestore data not found, falling back to local built-in ledger data)\n`;
      }
      
      let totalPending = 0;
      let pendingShops = [];
      
      shopsData.forEach(shop => {
        const lastEntry = shop.ledger?.[shop.ledger.length - 1];
        if (lastEntry && lastEntry.netAmount > 0) {
          totalPending += lastEntry.netAmount;
          pendingShops.push({ id: shop.id, name: shop.name, pending: lastEntry.netAmount });
        }
      });
      
      contextStr += `Total Shops: ${shopsData.length}\n`;
      contextStr += `Overall Pending: ${totalPending}\n`;
      contextStr += `Shops with pending maintenance: ${pendingShops.length}\n`;
      pendingShops.forEach(s => {
        contextStr += `- Shop ${s.id} (${s.name}): Pending amount is ${s.pending}\n`;
      });
    } else {
      let collectionName = intent.type;
      const querySnapshot = await getDocs(collection(db, collectionName));
      
      let data = [];
      if (querySnapshot.empty) {
        contextStr += `(Note: Live Firestore data not found, falling back to local data)\n`;
        // Fallbacks
        if (intent.type === 'complaints') data = mockComplaints;
        else if (intent.type === 'dues') data = mockDues;
        else if (intent.type === 'finance') data = mockFinance;
        else if (intent.type === 'staff') data = mockStaff;
        else if (intent.type === 'visitors') data = mockVisitors;
      } else {
        querySnapshot.forEach((d) => {
          data.push({ id: d.id, ...d.data() });
        });
      }

      if (intent.type === 'complaints') {
        const openComplaints = data.filter(d => d.status !== 'Resolved');
        contextStr += `Total Complaints: ${data.length}\n`;
        contextStr += `Open Complaints: ${openComplaints.length}\n`;
        openComplaints.forEach(c => {
          contextStr += `- ${c.title || c.note || c.category} (Status: ${c.status})\n`;
        });
      } else if (intent.type === 'finance') {
        const latest = data[0] || {};
        contextStr += `Finance Summary for ${latest.month || 'latest period'}:\n`;
        contextStr += `- Collections: ${latest.collections}\n`;
        contextStr += `- Expenses: ${latest.expenses}\n`;
        contextStr += `- Reserve Contribution: ${latest.reserveContribution}\n`;
        contextStr += `- Outstanding Dues: ${latest.outstanding}\n`;
      } else {
        contextStr += JSON.stringify(data.slice(0, 20), null, 2);
      }
    }
    
    return contextStr;
  } catch (error) {
    console.error("Error fetching data for RAG:", error);
    return null;
  }
}

export async function getTabMetrics(tabId) {
  try {
    if (tabId === 'general') {
      // Dues
      let duesSnap = await getDocs(collection(db, 'dues'));
      let duesData = duesSnap.empty ? mockDues : duesSnap.docs.map(d => d.data());
      const totalOutstanding = duesData.reduce((sum, item) => sum + (item.outstanding || 0), 0);

      // Complaints
      let complaintsSnap = await getDocs(collection(db, 'complaints'));
      let complaintsData = complaintsSnap.empty ? mockComplaints : complaintsSnap.docs.map(d => d.data());
      const openComplaints = complaintsData.filter(c => c.status !== 'Resolved').length;

      // Visitors
      let visitorsSnap = await getDocs(collection(db, 'visitors'));
      let visitorsData = visitorsSnap.empty ? mockVisitors : visitorsSnap.docs.map(d => d.data());
      const activeVisitors = visitorsData.filter(v => ['Checked In', 'At Gate'].includes(v.status)).length;

      return [
        { label: 'Outstanding Dues', value: `₹${totalOutstanding.toLocaleString('en-IN')}`, accent: '#ef4444' },
        { label: 'Open Complaints', value: openComplaints, accent: '#f59e0b' },
        { label: 'Active Visitors', value: activeVisitors, accent: '#10b981' }
      ];
    }

    if (tabId === 'maintenance') {
      const snap = await getDoc(doc(db, 'shopMaintenance', 'shop_maintenance_ledger'));
      const shopsData = snap.exists() && snap.data().shops ? snap.data().shops : initialShopData;

      let totalPending = 0;
      let pendingCount = 0;

      shopsData.forEach(shop => {
        const lastEntry = shop.ledger?.[shop.ledger.length - 1];
        if (lastEntry && lastEntry.netAmount > 0) {
          totalPending += lastEntry.netAmount;
          pendingCount++;
        }
      });

      return [
        { label: 'Total Shops', value: shopsData.length, accent: '#6366f1' },
        { label: 'Pending Shops', value: pendingCount, accent: '#ef4444' },
        { label: 'Overall Pending', value: `₹${totalPending.toLocaleString('en-IN')}`, accent: '#10b981' }
      ];
    }

    if (tabId === 'finance') {
      let finSnap = await getDocs(collection(db, 'finance'));
      let finData = finSnap.empty ? mockFinance : finSnap.docs.map(d => d.data());
      const latest = finData[0] || {};

      return [
        { label: 'Collections', value: `₹${(latest.collections || 0).toLocaleString('en-IN')}`, accent: '#10b981' },
        { label: 'Expenses', value: `₹${(latest.expenses || 0).toLocaleString('en-IN')}`, accent: '#ef4444' },
        { label: 'Reserve Fund', value: `₹${(latest.reserveContribution || 0).toLocaleString('en-IN')}`, accent: '#6366f1' }
      ];
    }

    if (tabId === 'operations') {
      // Staff
      let staffSnap = await getDocs(collection(db, 'staff'));
      let staffData = staffSnap.empty ? mockStaff : staffSnap.docs.map(d => d.data());
      const staffPresent = staffData.filter(s => s.attendance !== 'On Leave').length;

      // Pending Tasks
      let tasksCount = 0;
      try {
        let commonSnap = await getDocs(collection(db, 'managerTasks_common'));
        let buildingSnap = await getDocs(collection(db, 'managerTasks_a_building'));
        
        const cTasks = commonSnap.empty ? [] : commonSnap.docs.map(d => d.data());
        const bTasks = buildingSnap.empty ? [] : buildingSnap.docs.map(d => d.data());
        
        tasksCount = [...cTasks, ...bTasks].filter(t => t.status !== 'Done').length;
        if (commonSnap.empty && buildingSnap.empty) {
          // fallback roughly count
          tasksCount = 7;
        }
      } catch (e) {
        tasksCount = 7;
      }

      return [
        { label: 'Staff Present', value: `${staffPresent}/${staffData.length}`, accent: '#10b981' },
        { label: 'Pending Tasks', value: tasksCount, accent: '#f59e0b' },
        { label: 'Water Tankers', value: 'Active', accent: '#3b82f6' }
      ];
    }

    if (tabId === 'complaints') {
      let compSnap = await getDocs(collection(db, 'complaints'));
      let compData = compSnap.empty ? mockComplaints : compSnap.docs.map(d => d.data());

      const open = compData.filter(c => c.status === 'Open').length;
      const inProgress = compData.filter(c => c.status === 'In Progress').length;
      const resolved = compData.filter(c => c.status === 'Resolved').length;

      return [
        { label: 'Open', value: open, accent: '#ef4444' },
        { label: 'In Progress', value: inProgress, accent: '#3b82f6' },
        { label: 'Resolved', value: resolved, accent: '#10b981' }
      ];
    }

    return [];
  } catch (error) {
    console.error("Error generating tab metrics:", error);
    return [];
  }
}
