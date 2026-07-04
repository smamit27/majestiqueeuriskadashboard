import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { db, ensureFirebaseSession } from '../firebase';
import { initialShopData } from '../data/shopSeedData';
import { complaints as mockComplaints, dues as mockDues, finance as mockFinance, staff as mockStaff, visitors as mockVisitors } from '../data/mockData';
import { financeSeedData } from '../data/financeSeedData';
import { calcBill } from '../utils/housekeepingUtils';

const DEFAULT_HK_FORM = {
  unitsA: '87', unitsB: '96', unitsC: '48',
  aDays: '', aWage: '11000',
  bDays: '', bWage: '11000',
  cDays: '', cWage: '11000',
  supervisorSalary: '11000', supervisorDays: '',
  commonCount: '', commonSalary: '11000', commonAbsent: '',
  garbageTotal: '8000',
  tractorRate: '1400', tractorTrips: '', overrideTractorTrips: false,
  stpSalary: '8000',
};

// Helper to extract YYYY-MM from user queries
function parseMonthYear(query) {
  const monthsMap = {
    jan: '01', january: '01',
    feb: '02', february: '02',
    mar: '03', march: '03',
    apr: '04', april: '04',
    may: '05',
    jun: '06', june: '06',
    jul: '07', july: '07',
    aug: '08', august: '08',
    sep: '09', september: '09',
    oct: '10', october: '10',
    nov: '11', november: '11',
    dec: '12', december: '12'
  };

  const lower = query.toLowerCase();
  
  for (const [name, num] of Object.entries(monthsMap)) {
    if (lower.includes(name)) {
      // Find year: look for numbers like "26", "2026", "25", "2025"
      const yearMatch = lower.match(/\b(20\d{2}|\d{2})\b/);
      if (yearMatch) {
        let year = yearMatch[1];
        if (year.length === 2) {
          year = '20' + year;
        }
        return `${year}-${num}`;
      }
      // If month matches but no year is specified, default to current/active year 2026
      return `2026-${num}`;
    }
  }

  // Direct format check YYYY-MM
  const matchDirect = lower.match(/\b(20\d{2})[-/](0[1-9]|1[0-2])\b/);
  if (matchDirect) {
    return `${matchDirect[1]}-${matchDirect[2]}`;
  }

  return null;
}

// Helper to determine intent and required collection
function analyzeIntent(query) {
  const lowerQuery = query.toLowerCase();
  
  if (lowerQuery.includes('shop') || lowerQuery.includes('maintenance')) {
    return { type: 'shops', query: lowerQuery };
  }
  if (lowerQuery.includes('housekeeping bill') || lowerQuery.includes('cleaning bill') || lowerQuery.includes('housekeeping calculation')) {
    return { type: 'housekeepingBill', query: lowerQuery };
  }
  if (lowerQuery.includes('cheque') || lowerQuery.includes('check') || lowerQuery.includes('cheque tracker') || lowerQuery.includes('check tracker')) {
    return { type: 'chequeTracker', query: lowerQuery };
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
    await ensureFirebaseSession();
    let contextStr = `Data retrieved from ${intent.type}:\n`;

    if (intent.type === 'shops') {
      let shopsData = initialShopData;
      try {
        const snap = await getDoc(doc(db, 'shopMaintenance', 'shop_maintenance_ledger'));
        if (snap.exists() && snap.data().shops) {
          shopsData = snap.data().shops;
        } else {
          contextStr += `(Note: Live Firestore data not found, falling back to local built-in ledger data)\n`;
        }
      } catch (e) {
        contextStr += `(Note: Live Firestore query failed (${e.message}), falling back to local built-in ledger data)\n`;
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
    } else if (intent.type === 'housekeepingBill') {
      const parsedMonth = parseMonthYear(query);
      if (parsedMonth) {
        let form = DEFAULT_HK_FORM;
        let attendance = null;

        try {
          const billDoc = await getDoc(doc(db, 'housekeepingBillCalculations', `hk_bill_${parsedMonth}`));
          if (billDoc.exists()) {
            form = { ...DEFAULT_HK_FORM, ...billDoc.data().form };
          } else {
            contextStr += `(Note: Live Firestore bill data not found, calculating using default base rates)\n`;
          }
        } catch (e) {
          contextStr += `(Note: Live Firestore bill query failed (${e.message}), calculating using default base rates)\n`;
        }

        try {
          const registerDoc = await getDoc(doc(db, 'housekeepingAttendanceRegisters', `register_${parsedMonth}`));
          if (registerDoc.exists() && registerDoc.data().entries) {
            const rawEntries = registerDoc.data().entries;
            const sums = { a: 0, b: 0, c: 0, supervisor: 0, common: 0, tractorTrip: 0 };
            const parseFloatOrZero = v => parseFloat(v) || 0;
            Object.values(rawEntries).forEach(row => {
              sums.a += parseFloatOrZero(row.a);
              sums.b += parseFloatOrZero(row.b);
              sums.c += parseFloatOrZero(row.c);
              sums.supervisor += parseFloatOrZero(row.supervisor);
              sums.common += parseFloatOrZero(row.common);
              sums.tractorTrip += parseFloatOrZero(row.tractorTrip);
            });
            attendance = sums;
          }
        } catch (e) {
          contextStr += `(Note: Live Firestore attendance register query failed (${e.message}))\n`;
        }

        const calculated = calcBill(form, parsedMonth, attendance);
        if (calculated) {
          contextStr += `Calculated Housekeeping Bill Breakdown for ${parsedMonth}:\n`;
          contextStr += `Grand Total: ₹${calculated.grandTotal.toLocaleString('en-IN')}\n`;
          calculated.rows.forEach(r => {
            contextStr += `- ${r.label}:\n`;
            contextStr += `  * Present Days: ${r.days}\n`;
            contextStr += `  * Building Wage Share: ₹${r.wage.toLocaleString('en-IN')}\n`;
            contextStr += `  * Supervisor Share: ₹${r.sup.toLocaleString('en-IN')}\n`;
            contextStr += `  * Common Staff Share: ₹${r.com.toLocaleString('en-IN')}\n`;
            contextStr += `  * Garbage Share: ₹${r.garb.toLocaleString('en-IN')}\n`;
            contextStr += `  * Tractor Share: ₹${r.tract.toLocaleString('en-IN')}\n`;
            contextStr += `  * STP Share: ₹${r.stp.toLocaleString('en-IN')}\n`;
            contextStr += `  * Total Share: ₹${r.total.toLocaleString('en-IN')}\n`;
          });
          contextStr += `Component Base Values:\n`;
          contextStr += `- Supervisor Base Salary: ₹${parseFloat(form.supervisorSalary).toLocaleString('en-IN')}\n`;
          contextStr += `- Common Staff Base Salary: ₹${parseFloat(form.commonSalary).toLocaleString('en-IN')}\n`;
          contextStr += `- Garbage Total: ₹${parseFloat(form.garbageTotal).toLocaleString('en-IN')}\n`;
          contextStr += `- Tractor Rate: ₹${parseFloat(form.tractorRate).toLocaleString('en-IN')}\n`;
          contextStr += `- STP Operator Salary: ₹${parseFloat(form.stpSalary).toLocaleString('en-IN')}\n`;
        } else {
          contextStr += `Unable to compute housekeeping bill breakdown.\n`;
        }
      } else {
        contextStr += `Please specify a month to see the housekeeping bill details (e.g. July-26 housekeeping bill).\n`;
      }
    } else if (intent.type === 'chequeTracker') {
      const parsedMonth = parseMonthYear(query);
      if (parsedMonth) {
        let chequesA = [];
        let chequesCommon = [];

        try {
          const snapA = await getDoc(doc(db, 'chequesMonthly', `cheques_${parsedMonth}`));
          if (snapA.exists()) {
            chequesA = snapA.data().cheques || [];
          } else if (parsedMonth === '2026-06') {
            chequesA = [
              { date: '2026-06-01', chequeNo: '493', vendor: 'CANCELLED', purpose: 'Cancel By Amit as month over', amount: '0', whoPaid: 'A Building', isPaid: false }
            ];
          }
        } catch (e) {
          contextStr += `(Note: Live Building A cheques query failed: ${e.message})\n`;
          if (parsedMonth === '2026-06') {
            chequesA = [
              { date: '2026-06-01', chequeNo: '493', vendor: 'CANCELLED', purpose: 'Cancel By Amit as month over', amount: '0', whoPaid: 'A Building', isPaid: false }
            ];
          }
        }

        try {
          const snapCommon = await getDoc(doc(db, 'chequesMonthly', `cheques_common_${parsedMonth}`));
          if (snapCommon.exists()) {
            chequesCommon = snapCommon.data().cheques || [];
          } else if (parsedMonth === '2026-06') {
            chequesCommon = [
              { date: '2026-06-15', chequeNo: '496', vendor: 'MESDCL', purpose: 'Electricity', amount: '57420', whoPaid: 'A Building', isPaid: false },
              { date: '2026-06-12', chequeNo: '499', vendor: 'Tanaji Hunde', purpose: 'Gazibo - Received from B Building and C as well', amount: '11500', whoPaid: 'A Building', isPaid: false }
            ];
          }
        } catch (e) {
          contextStr += `(Note: Live Common cheques query failed: ${e.message})\n`;
          if (parsedMonth === '2026-06') {
            chequesCommon = [
              { date: '2026-06-15', chequeNo: '496', vendor: 'MESDCL', purpose: 'Electricity', amount: '57420', whoPaid: 'A Building', isPaid: false },
              { date: '2026-06-12', chequeNo: '499', vendor: 'Tanaji Hunde', purpose: 'Gazibo - Received from B Building and C as well', amount: '11500', whoPaid: 'A Building', isPaid: false }
            ];
          }
        }

        contextStr += `Cheque Tracker Records for ${parsedMonth}:\n`;

        contextStr += `Building A Cheques:\n`;
        let totalA = 0;
        if (chequesA.length > 0) {
          chequesA.forEach(c => {
            const amt = parseFloat(c.amount) || 0;
            totalA += amt;
            contextStr += `- Date: ${c.date || 'N/A'}, Cheque No: ${c.chequeNo}, Vendor: ${c.vendor}, Purpose: ${c.purpose}, Amount: ₹${amt.toLocaleString('en-IN')}, Paid: ${c.isPaid ? 'Yes' : 'No'}\n`;
          });
          contextStr += `Total Building A Cheques: ₹${totalA.toLocaleString('en-IN')}\n`;
        } else {
          contextStr += `- No Building A cheques recorded.\n`;
        }

        contextStr += `Common Cheques:\n`;
        let totalCommon = 0;
        if (chequesCommon.length > 0) {
          chequesCommon.forEach(c => {
            const amt = parseFloat(c.amount) || 0;
            totalCommon += amt;
            contextStr += `- Date: ${c.date || 'N/A'}, Cheque No: ${c.chequeNo}, Vendor: ${c.vendor}, Purpose: ${c.purpose}, Amount: ₹${amt.toLocaleString('en-IN')}, Paid: ${c.isPaid ? 'Yes' : 'No'}, Paid By: ${c.whoPaid || 'N/A'}\n`;
          });
          contextStr += `Total Common Cheques: ₹${totalCommon.toLocaleString('en-IN')}\n`;
        } else {
          contextStr += `- No Common cheques recorded.\n`;
        }
      } else {
        contextStr += `Please specify a month to see the cheque details (e.g. July-26 check tracker).\n`;
      }
    } else if (intent.type === 'finance') {
      const parsedMonth = parseMonthYear(query);
      if (parsedMonth) {
        let monthData = null;
        try {
          const docRef = doc(db, 'financeMonthly', `finance_${parsedMonth}`);
          const snap = await getDoc(docRef);
          if (snap.exists()) {
            monthData = snap.data();
          } else if (financeSeedData[`finance_${parsedMonth}`]) {
            contextStr += `(Note: Live Firestore data not found, falling back to local seeded data)\n`;
            monthData = financeSeedData[`finance_${parsedMonth}`];
          }
        } catch (e) {
          contextStr += `(Note: Live Firestore query failed (${e.message}), falling back to local seeded data)\n`;
          if (financeSeedData[`finance_${parsedMonth}`]) {
            monthData = financeSeedData[`finance_${parsedMonth}`];
          }
        }

        if (monthData) {
          contextStr += `Itemized Finance Records for ${parsedMonth}:\n`;
          contextStr += `Income Entries:\n`;
          const income = monthData.income || [];
          if (income.length > 0) {
            income.forEach(inc => {
              contextStr += `- Source: ${inc.source}, Amount: ${inc.amount}, Remark: ${inc.remark || ''}\n`;
            });
          } else {
            contextStr += `- No income entries recorded.\n`;
          }

          contextStr += `Expense Entries:\n`;
          let expenses = monthData.expenses || [];
          
          // Pull cheques if >= June 2026
          if (parsedMonth >= '2026-06') {
            try {
              const chequeSnap = await getDoc(doc(db, 'chequesMonthly', `cheques_${parsedMonth}`));
              if (chequeSnap.exists()) {
                const chequesList = chequeSnap.data().cheques || [];
                chequesList.forEach(c => {
                  if (c.vendor || c.amount || c.chequeNo) {
                    expenses.push({
                      chequeNo: c.chequeNo || '',
                      vendor: c.vendor || '',
                      purpose: c.purpose || 'Cheque Expense (A Building)',
                      amount: c.amount || '0'
                    });
                  }
                });
              }
            } catch (e) {
              console.error("Error fetching cheques context:", e);
            }
          }

          let totalExpense = 0;
          if (expenses.length > 0) {
            expenses.forEach(exp => {
              const amt = parseFloat(exp.amount) || 0;
              totalExpense += amt;
              contextStr += `- Vendor: ${exp.vendor}, Amount: ${exp.amount}, Purpose: ${exp.purpose || ''}, Cheque No: ${exp.chequeNo || 'N/A'}\n`;
            });
            contextStr += `Total Itemized Expenses: ₹${totalExpense.toLocaleString('en-IN')}\n`;
          } else {
            contextStr += `- No expense entries recorded.\n`;
          }
        } else {
          contextStr += `No itemized finance data or expenses found in the records for the month ${parsedMonth}.\n`;
        }
      } else {
        // Fallback: General summary of collections/expenses
        let collectionName = intent.type;
        let data = [];
        try {
          const querySnapshot = await getDocs(collection(db, collectionName));
          if (querySnapshot.empty) {
            contextStr += `(Note: Live Firestore data not found, falling back to local data)\n`;
            data = mockFinance;
          } else {
            querySnapshot.forEach((d) => {
              data.push({ id: d.id, ...d.data() });
            });
          }
        } catch (e) {
          contextStr += `(Note: Live Firestore query failed (${e.message}), falling back to local data)\n`;
          data = mockFinance;
        }

        const latest = data[0] || {};
        contextStr += `General Finance Overview for ${latest.month || 'latest period'}:\n`;
        contextStr += `- Collections: ${latest.collections}\n`;
        contextStr += `- Expenses: ${latest.expenses}\n`;
        contextStr += `- Reserve Contribution: ${latest.reserveContribution}\n`;
        contextStr += `- Outstanding Dues: ${latest.outstanding}\n`;
      }
    } else {
      let collectionName = intent.type;
      let data = [];
      try {
        const querySnapshot = await getDocs(collection(db, collectionName));
        if (querySnapshot.empty) {
          contextStr += `(Note: Live Firestore data not found, falling back to local data)\n`;
          if (intent.type === 'complaints') data = mockComplaints;
          else if (intent.type === 'dues') data = mockDues;
          else if (intent.type === 'staff') data = mockStaff;
          else if (intent.type === 'visitors') data = mockVisitors;
        } else {
          querySnapshot.forEach((d) => {
            data.push({ id: d.id, ...d.data() });
          });
        }
      } catch (e) {
        contextStr += `(Note: Live Firestore query failed (${e.message}), falling back to local data)\n`;
        if (intent.type === 'complaints') data = mockComplaints;
        else if (intent.type === 'dues') data = mockDues;
        else if (intent.type === 'staff') data = mockStaff;
        else if (intent.type === 'visitors') data = mockVisitors;
      }

      if (intent.type === 'complaints') {
        const openComplaints = data.filter(d => d.status !== 'Resolved');
        contextStr += `Total Complaints: ${data.length}\n`;
        contextStr += `Open Complaints: ${openComplaints.length}\n`;
        openComplaints.forEach(c => {
          contextStr += `- ${c.title || c.note || c.category} (Status: ${c.status})\n`;
        });
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
      let duesData = mockDues;
      try {
        let duesSnap = await getDocs(collection(db, 'dues'));
        if (!duesSnap.empty) duesData = duesSnap.docs.map(d => d.data());
      } catch (e) {
        console.warn("getTabMetrics: Dues fetch failed, using mock data", e);
      }
      const totalOutstanding = duesData.reduce((sum, item) => sum + (item.outstanding || 0), 0);

      let complaintsData = mockComplaints;
      try {
        let complaintsSnap = await getDocs(collection(db, 'complaints'));
        if (!complaintsSnap.empty) complaintsData = complaintsSnap.docs.map(d => d.data());
      } catch (e) {
        console.warn("getTabMetrics: Complaints fetch failed, using mock data", e);
      }
      const openComplaints = complaintsData.filter(c => c.status !== 'Resolved').length;

      let visitorsData = mockVisitors;
      try {
        let visitorsSnap = await getDocs(collection(db, 'visitors'));
        if (!visitorsSnap.empty) visitorsData = visitorsSnap.docs.map(d => d.data());
      } catch (e) {
        console.warn("getTabMetrics: Visitors fetch failed, using mock data", e);
      }
      const activeVisitors = visitorsData.filter(v => ['Checked In', 'At Gate'].includes(v.status)).length;

      return [
        { label: 'Outstanding Dues', value: `₹${totalOutstanding.toLocaleString('en-IN')}`, accent: '#ef4444' },
        { label: 'Open Complaints', value: openComplaints, accent: '#f59e0b' },
        { label: 'Active Visitors', value: activeVisitors, accent: '#10b981' }
      ];
    }

    if (tabId === 'maintenance') {
      let shopsData = initialShopData;
      try {
        const snap = await getDoc(doc(db, 'shopMaintenance', 'shop_maintenance_ledger'));
        if (snap.exists() && snap.data().shops) {
          shopsData = snap.data().shops;
        }
      } catch (e) {
        console.warn("getTabMetrics: Shop ledger fetch failed, using mock data", e);
      }

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
      let finData = mockFinance;
      try {
        let finSnap = await getDocs(collection(db, 'finance'));
        if (!finSnap.empty) finData = finSnap.docs.map(d => d.data());
      } catch (e) {
        console.warn("getTabMetrics: Finance fetch failed, using mock data", e);
      }
      const latest = finData[0] || {};

      return [
        { label: 'Collections', value: `₹${(latest.collections || 0).toLocaleString('en-IN')}`, accent: '#10b981' },
        { label: 'Expenses', value: `₹${(latest.expenses || 0).toLocaleString('en-IN')}`, accent: '#ef4444' },
        { label: 'Reserve Fund', value: `₹${(latest.reserveContribution || 0).toLocaleString('en-IN')}`, accent: '#6366f1' }
      ];
    }

    if (tabId === 'operations') {
      let staffData = mockStaff;
      try {
        let staffSnap = await getDocs(collection(db, 'staff'));
        if (!staffSnap.empty) staffData = staffSnap.docs.map(d => d.data());
      } catch (e) {
        console.warn("getTabMetrics: Staff fetch failed, using mock data", e);
      }
      const staffPresent = staffData.filter(s => s.attendance !== 'On Leave').length;

      let tasksCount = 7;
      try {
        let commonSnap = await getDocs(collection(db, 'managerTasks_common'));
        let buildingSnap = await getDocs(collection(db, 'managerTasks_a_building'));
        
        const cTasks = commonSnap.empty ? [] : commonSnap.docs.map(d => d.data());
        const bTasks = buildingSnap.empty ? [] : buildingSnap.docs.map(d => d.data());
        
        const totalPending = [...cTasks, ...bTasks].filter(t => t.status !== 'Done').length;
        if (!commonSnap.empty || !buildingSnap.empty) {
          tasksCount = totalPending;
        }
      } catch (e) {
        console.warn("getTabMetrics: Tasks fetch failed, using default count", e);
      }

      return [
        { label: 'Staff Present', value: `${staffPresent}/${staffData.length}`, accent: '#10b981' },
        { label: 'Pending Tasks', value: tasksCount, accent: '#f59e0b' },
        { label: 'Water Tankers', value: 'Active', accent: '#3b82f6' }
      ];
    }

    if (tabId === 'complaints') {
      let compData = mockComplaints;
      try {
        let compSnap = await getDocs(collection(db, 'complaints'));
        if (!compSnap.empty) compData = compSnap.docs.map(d => d.data());
      } catch (e) {
        console.warn("getTabMetrics: Complaints fetch failed, using mock data", e);
      }

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
