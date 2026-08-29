import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc } from 'firebase/firestore';
import fs from 'fs';

const rawData = `Amount	Date	To Whome Paid	On What Account	Amount	Balance	Remark		
 	 	 	 	 	10000	 		
10000	03.05.2023	Uttareshwar	Waterman Salary	5650	4350	 		
 	03.05.2023	Mamata Stationery	Stationery	837	3513	 		
 	 	Prime Enterprises	xerox	45	3468	 		
 	02.06.2023	MMR Technologes	Ofice Expenses	500	2968	PC Password Reset		
 	03.06.2023	Varad Electronics	Data Cable	300	2668	Lan cable 		
 	03.06.2023	Bhagyashree Shope	Ofice Expenses	324	2344	LAL Heat		
 	 	 	 	 	17344	 		
15000	04.06.2023	Rshikesh Dhide	Chember Cleaning	4000	13344	 		
 	04.06.2023	Utareshwar	waterman Salary	5650	7694	 		
 	14.06.2023	Mamata Stationery	Stationery	300	7394	Paper Rim		
 	16.06.2023	Swapnil Chopkar	solar Repairing	1000	6394	Solar Tube Replacement		
 	18.06.2023	Rajan	Electrical Repaiing	200	6194	Tube Light itting 02 nos		
 	 	 	 	 	 	 		
10000	06.07.2023	 	 	 	16194	 		
 	07.07.2023	Uttareswar	Waerman Salary	5650	10544	 		
 	09.07.2023	C builing	Common Expenses Share	2889	7655	Electria Material Purchace		
 	15.07.2023	Swapnil Suryavanshi	Plumbing Charge	300	7355	407 lekage work		
 	15.07.2023	B Building	Common Expenses Share	893	6462	Swimming pool Ladder reparing 		
 	19.07.2023	Swapnil Suryavanshi	Plumbing Charge	865	5597	Garden area Nosal fitting		
 	20.07.2023	Sanjeev Yadav	Transportation charges	1200	4397	Ladder transportation 		
 	21.07.2023	Rushikesh Dhide	chember claning	4000	397	all cheber clening		
2218	21.07.2023	
A and C Building share
Amount Receive 	 	2615	 		
 	21.07.2023	Salim Key Maker	Clubhouse Door Key making	1200	1415	 		
 	21.07.2023	Naik Krushi Udyog	Pestiside purchase	295	1120	 		
 	03.08.2023	Balasaheb kanal	Electrical repairng charges	350	770	 		
10000	03.08.2023	 	 	 	10770	 		
 	03.08.2023	C builing	Common Expenses Share	1574	9196	Pump And garden tools 		
 	03.08.2023	Uttareswar	Waterman Salary	5650	3546	 		
 	03.08.2023	B Building	Common Expenses Share	1958	1588	Street Light Purchase		
 	05.08.2023	Swapnil Suryavanshi	Plumbing Charges	500	1088	302 parkingand 202 parking lekage work		
 	05.08.2023	JC Collection	xerox	105	983	Bylow bokXerox		
 	15.08.2023	Sham Power Tools	Plumbing Material	788	195	 		
 	23.08.2023	Sham Power Tools	Plumbing Material	156	39	 		
 	31.03.2024	Mamata Stationery	Battery Seal	40	-1	 		
 	 	 	 	 	 	 		
10000	25/9/24	 	 	 	10000	 		
 	5/10/24	Uttareswar	Waterman salary	5650	4350	 		
 	 	Siddu lende	Reumbursment common Expenses	3286	1064	Comon Exp  2546		
10000	14/10/24	 	 	 	11064	 		
 	14/10/24	Uttareswar	Waterman salary	5650	5414	 		
 	14/10/24	Shree krushna H/W	Drinking Water line Plumbing materiakl	810	4604	 		
 	14/10/24	Swapnil Suryavanshi	Drinking Water line Plumbing Charges	500	4104	 		
 	14/10/24	Sidduu Lende	Common Expenses 	2246	1858	 		
10000	28/10/24	 	 	 	11858	 		
 	1/11/24	Uttareswar	Waterman salary	5650	6208	 		
 	14/11/24	Swapnil Suryavanshi	Common A 1003 parking Work	1000	5208	 		
 	16/11/24	Swapnil Suryavanshi	Common Area Plumbing Work	1050	4158	 		
 	16/11/24	Shree krushna H/W	Plumbing Material	120	4038	 		
 	29/11/24	IGS Enterprises	Solar Pipe Insstalation	800	3238	 		
 	30/11/24	Swapnil Suryavanshi	A1004 parking Plumbing work	1000	2238	 		
10000	01.12.2024	 	 	 	12238	 		
 	02.12.2024	Meera H/W	Tube light purchase	840	11398	 		1581.8182
 	3/12/24	Uttareswar	Waterman salary	5650	5748	 		
 	27/12/24	Siddu lende	Common Expense	6529	-781	 		
10000	1/1/25	 	 	 	9219	 		
 	5/1/25	Uttareswar	Waterman salary	5650	3569	 		
 	7/1/25	Pawan Lights	Tube light purchase	1000	2569	 		
 	24.01.2025	Rana Biswas	Plumbing work	2700	-131	 		
 	27.01.2025	Siddu lende	Republic day share	3107	-3238	 		
10000	02.02.2025	 	 	 	6762	 		
 	04.02.2025	Uttareswar	Waterman salary	5650	1112	 		
 	13.02.2025	Rajan 	Tube light fitting charges	300	812	 		
 	15.02.2025	Rushi Dhide	Pipe line cleaning charges	1000	-188	 		
10000	05.03.2025	 	 	 	9812	 		
 	05.03.2025	Uttareswar	Waterman salary	5650	4162	 		
 	05.03.2025	Nelson pope	Sneak cath in lift basement	300	3862	 		
 	28.03.2025	Rana Biswas	Main Lobby lekage work	1200	2662	 		
 	30.03.2025	Rushi Dhide	Drainage Cleaning	2800	-138	 		
10000	05.04.2025	 	 	 	9862	 		
 	05.04.2025	Uttareswar	Waterman salary	5650	4212	 		
 	12.04.2025	Nobel Inphotech	Printer Repairing	550	3662	 		
 	12.04.2025	Shree krushna H/W	Lift Tube light purchase	160	3502	 		
 	30.04.2025	Shree krushna H/W	Utility water line Plumbing Material	265	3237	 		
 	30.04.2025	Rana Biswas	Utility water line Plumbing work	600	2637	 		
10000	03.05.2025	 	 	 	12637	 		
 	05.05.2025	Uttareswar	Waterman salary	5650	6987	 		
 	30.05.2025	Mamata Stationery	Paper Rim Purchase	300	6687	 		
10000	03.06.2025	 	 	 	16687	 		
 	05.06.2025	Uttareswar	Waterman salary	5650	11037	 		
 	03.06.2025	Rana Biswas	Drainage Cleaning	800	10237	 		
 	04.06.2025	Siddu lende	common expenses	3975	6262	 		
 	15.06.2025	Jaslok Sweets	SGM Snakes purchase	1040	5222	 		
 	18.06.2025	Shree krushna H/W	Plumbing Material purchase Drinking Line	640	4582	 		
 	18.06.2025	Rana Biswas	Plumbing Charges	800	3782	 		
 	24.06.2025	Rushi Dhide	drainage Cleaning near 1004 Parking	500	3282	 		
10000	03.07.2025	 	 	 	13282	 		
 	03.07.2025	Uttareswar	Waterman salary	5650	7632	 		
 	03.07.2025	Ramdev Hardware	Lock  	80	7552	 		
 	03.05.2025	Shyam Power tools	lock set for lunch room	230	7322	 		
 	05.07.2025	Siddu lende	Common Expense	3555	3767	 		
 	16.07.2025	Shree krushna H/W	Tube Lights Purchase	840	2927	 		
 	23.07.2025	Shree krushna H/W	Lock Purchase	260	2667	 		
10000	01.08.2025	 	 	 	12667	 		
 	03.08.2025	Uttareswar	Waterman salary	5650	7017	 		
 	15.08.25	Siddu lende	15 Aug Expenses	3605	3412	 		
 	 	 	 	 	3412	 		
10000	01.08.2025	 	 	 	13412	 		
 	01.09.2025	Uttareswar	Waterman salary	5650	7762	 		
 	03.09.2025	Rishi Dhide	Drainage Cleaning	1700	6062	 		
 	06.09.2025	Rana Biswas	Flat No. 207 and 607 Plumbing work	400	5662	 		
 	08.09.2025	Krushna H/W	Tube light purchase	810	4852	 		
7000	 	 	 	 	11852	 		
 	04.10.25	Uttareswar	Waterman salary	5650	6202	 		
18250	 	 	 	 	24452	 		
 	17.10.25	siddu Lende	Diwali Bonus	4250	20202	 		
 	20.10.25	Shivshankr Singh	Diwali Bonus	2500	17702			
 	20.10.25	Bikas Nath	Diwali Bonus	250	17452			
 	20.10.25	Mintu Nath	Diwali Bonus	250	17202			
 	20.10.25	Nikas	Diwali Bonus	250	16952			
 	20.10.25	Rajib	Diwali Bonus	250	16702			
 	20.10.25	Ramesh	Diwali Bonus	250	16452			
 	20.10.25	Buddhdev	Diwali Bonus	250	16202			
 	20.10.25	Upendra	Diwali Bonus	250	15952			
 	20.10.25	Ratnu	Diwali Bonus	250	15702			
 	20.10.25	Rani Varde	Diwali Bonus	750	14952			
 	20.10.25	Khandu Mama	Diwali Bonus	750	14202			
 	20.10.25	Khade Mama	Diwali Bonus	750	13452			
 	20.10.25	Noorjaha	Diwali Bonus	750	12702			
 	20.10.25	Parvin	Diwali Bonus	750	11952			
 	20.10.25	Rukmini	Diwali Bonus	750	11202			
 	20.10.25	Nasrin	Diwali Bonus	750	10452			
 	20.10.25	Rupali	Diwali Bonus	750	9702			
 	20.10.25	Naushad	Diwali Bonus	1500	8202			
 	31.10.25	Parmar H/W	Drinking Water Line Plumbing Material	1898	6304			
 	31.10.25	Rana Biswas	Drinking Water line Plumbing Charges	500	5804			
 	02.11.25	Jaslok Sweets	AGM Expnens	920	4884			
8000	03.11.25	 	 	 	12884			
 	04.11.25	Uttareswar	Waterman salary	5650	7234			
 	08.11.25	Shree Graphics	10 nos Voucher Book Purchase 	800	6434			
 	14.11.25	Siddu lende	Common Expenses Sep 25 to 14 Nov 25	4350	2084			
10000	1/12/25	 	 		12084			
 	05.12.25	Rushi Dhide	Drainage Cleaning Near 407 Parking	1500	10584			
 	05.12.25	Uttareswar	Waterman salary	5650	4934			
 	08.12.25	Siddu lende	Coomon Expenses 14 Nov to 10 Dec 25	1318	3616			
 	26.12.25	Rushi Dhide	Drainage Cleaning Near Bathroom	1500	2116			
10000	02.01.26	 	 	 	12116			
 	03.01.26	Uttareswar	Waterman salary	5650	6466			
 	08.01.26	Rushi Dhide	Drainage Cleaning basement Chembers 05 Nos	2200	4266			
 	04.01.26	Mamata Stationery	Paper Rim Purchase	330	3936			
 	22.01.26	Ramdev Hardware	Plumbing Material Purchase  	952	2984			
 	26.01.26	Siddu lende	Repubic day Expenses	2870	114			
10000	02.02.2026	 	 	 	10114			
 	 	Malhar Computers	Printer Repairing	850	9264			
 	02.02.26	Uttareswar	Waterman salary	5650	3614			
 	02.02.26	Siddu lende	Common Expenses month of Jan 26	798	2816			
 	02.02.26	Rana Biswas	Lekage and Plumbing Work near 1004 Parking	500	2316			
 	19.02.2026	Rohan Kotkar	Convex Mirror Purchase Share	2712	-396			
10000	04.03.26	 	 	 	9604			
 	04.03.26	Uttareswar	Waterman salary	5650	3954			
 	04.03.26	Parmeshwar Pitale	A building Bathroom Plumbing work	1220	2734			
 	08.03.26	Siddu lende	Common Expenses Share	2207	527			
 	09.03.26	Ayan Shaikh	Snake Catcher A building 	500	27			
 	14.03.26	Rushi Dhide	Drainage Cleaning basement Chembers 	1000	-973			
10000	02.04.2026	 	 	 	9027			
 	04.04.26	Uttareswar	Waterman salary	5650	3377			
 	05.04.26	Siddu lende	Common Expenses month of Mar 26	2131	1246			
 	29.04.26	Parmeshwar Pitale	Bathroom out side Plumbing Work	430	816			
 	29.04.26	Shree krushna H/W	10w LED purchase	1200	-384			
10000	02.05.2026	 	 	 	9616			
 	05.05.2026	Uttareswar	Waterman salary	5650	3966			
 	05.05.26	IGS Enterprises	Solar Pipe Insstalation	800	3166			
 	30.05.26	Siddu lende	Common Expenses	4370	-1204			
10000	02.06.2026	 	 	 	8796			
 	03.06.2026	Uttareswar	Waterman salary	5650	3146			
 	03.06.2026	IGS Enterprises	Solar Lekage work	600	2546			
15000	02.07.2026	 	 	 	17546			
 	02.07.2026	Uttareswar	Waterman salary	5650	11896			
 	02.07.2026	Siddu lende	Common Expenses 	4963	6933			
 	05.07.2026	Goving Bansode	Printer Repairing	700	6233			
10000	02.08.2026	 	 	 	16233			
 	03.08.2026	Uttareswar	Waterman salary	5650	10583			
 	03.08.2026	Siddu lende	Coomon Expenses Jul 26	2825	7758			
 	08.08.2026	H M Carpet	Carpet	2800	4958			
 	12.08.2026	Parmeshwar Pitale	Flat No. 408 Outside Lekage work	3000	1958			
 	16.08.2026	Siddu lende	Common Expenses Independence Day 15 Aug	4696	-2738			
 	18.08.2026	Sukanya Electricals	Street Light Purchase 01 Nos	550	-3288			
 	24.08.2026	Rushi Dhide	Drainage Cleaning 	1000	-4288	A Wing	B Wing	
 	30.08.2026	Siddu lende	Common Expenses Month of Aug 26	2246	-6534	12184	13162`;

function parseDate(rawDate, prevDate) {
  if (!rawDate || !rawDate.trim()) return prevDate || '2023-05-01';
  const clean = rawDate.trim().replace(/\//g, '.');
  const parts = clean.split('.');
  if (parts.length === 3) {
    let d = parts[0].padStart(2, '0');
    let m = parts[1].padStart(2, '0');
    let y = parts[2];
    if (y.length === 2) y = '20' + y;
    return `${y}-${m}-${d}`;
  }
  return prevDate || '2023-05-01';
}

const lines = rawData.split('\n');
const allEntries = [];
let prevDate = '2023-05-01';
let idCounter = 1782921800000;

for (let i = 1; i < lines.length; i++) {
  const line = lines[i];
  if (!line.trim()) continue;
  const parts = line.split('\t');
  
  const colAmount = parts[0] ? parts[0].trim() : '';
  const colDate = parts[1] ? parts[1].trim() : '';
  const colVendor = parts[2] ? parts[2].trim() : '';
  const colAccount = parts[3] ? parts[3].trim() : '';
  const colPayment = parts[4] ? parts[4].trim() : '';
  const colBalance = parts[5] ? parts[5].trim() : '';
  const colRemark = parts[6] ? parts[6].trim() : '';
  
  if (!colAmount && !colDate && !colVendor && !colAccount && !colPayment && !colBalance) continue;
  
  const d = parseDate(colDate, prevDate);
  if (colDate) prevDate = d;

  // Cleanup vendor name if it was a fund addition
  let vendorName = colVendor;
  if (!vendorName && colAmount && !colPayment) {
    vendorName = 'Fund Received';
  }

  allEntries.push({
    id: idCounter++,
    date: d,
    vendor: vendorName,
    purpose: colAccount,
    receipt: colAmount,
    payment: colPayment,
    remarks: colRemark
  });
}

// FY 26-27 Building A entries specifically (April 2026 to August 2026)
// Ensure Opening Balance Adjustment for FY 26-27 exists so running balance matches -973 at start
const fy2627Entries = [
  {
    id: 1782921846533,
    date: '2026-04-01',
    vendor: 'System',
    purpose: 'Opening Balance Adjustment for FY 26-27',
    receipt: '0',
    payment: '973',
    remarks: 'Auto-adjusted to match ledger balances'
  }
];

allEntries.filter(e => e.date >= '2026-04-01' && e.date <= '2026-08-31').forEach(e => {
  fy2627Entries.push({
    id: e.id,
    date: e.date,
    vendor: e.vendor || (e.receipt ? 'Fund Received' : ''),
    purpose: e.purpose,
    receipt: e.receipt,
    payment: e.payment,
    remarks: e.remarks
  });
});

// Save to disk
fs.writeFileSync('/Users/sweta/Amit_Development/Majestique_Euriska_Dashboard/petty_cash_fy2627.json', JSON.stringify(fy2627Entries, null, 2));
fs.writeFileSync('/Users/sweta/Amit_Development/Majestique_Euriska_Dashboard/petty_cash_all_history.json', JSON.stringify(allEntries, null, 2));

console.log(`Generated petty_cash_fy2627.json (${fy2627Entries.length} entries)`);
console.log(`Generated petty_cash_all_history.json (${allEntries.length} total entries)`);

// Load environment variables for Firebase
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

async function uploadToFirestore() {
  console.log('Syncing to Firestore collection pettyCash...');

  // Upload Building A FY2627 ledger
  await setDoc(doc(db, 'pettyCash', 'buildingA'), {
    entries: fy2627Entries,
    updatedAt: new Date().toISOString()
  });

  // Upload all historical entries for complete archive
  await setDoc(doc(db, 'pettyCash', 'history'), {
    entries: allEntries,
    updatedAt: new Date().toISOString()
  });

  console.log('✅ Successfully synced buildingA and history documents in Firestore!');
  process.exit(0);
}

uploadToFirestore().catch((err) => {
  console.error('Firestore sync error:', err);
  process.exit(1);
});
