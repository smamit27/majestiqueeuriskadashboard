import { useCallback, useEffect, useRef, useState } from 'react';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import * as XLSX from 'xlsx';
import { db, ensureFirebaseSession, isFirebaseConfigured } from '../../firebase.js';
import './ChequeManagement.css';


const FINANCIAL_YEAR_MONTHS = Array.from({ length: 12 }, (_, i) => {
  const d = new Date(2026, 3 + i, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
});

const FLATS = {
  A: 87,
  B: 96,
  C: 48,
  Total: 231
};

function getCurrentMonth() {
  const d = new Date();
  const v = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  return FINANCIAL_YEAR_MONTHS.includes(v) ? v : FINANCIAL_YEAR_MONTHS[0];
}

function formatMonthLabel(mv) {
  const [y, m] = mv.split('-').map(Number);
  return new Intl.DateTimeFormat('en-IN', { month: 'short', year: '2-digit' }).format(new Date(y, m - 1, 1));
}

function formatLongMonth(mv) {
  const [y, m] = mv.split('-').map(Number);
  return new Intl.DateTimeFormat('en-IN', { month: 'long', year: 'numeric' }).format(new Date(y, m - 1, 1));
}

const n = (v) => parseFloat(v) || 0;
const fmt = (v) => Number(v).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;'
}[char]));

const DEFAULT_SEPTEMBER_2026_CHEQUES = [
  { id: 1725451400001, srNo: 1, date: '2026-09-04', deductedDate: '2026-09-08', chequeNo: '534', vendor: 'Sidharam Parmeshwar Lende', purpose: 'Housekeeping / Waterman Salary', amount: '12900', whoPaid: 'A Building', isPaid: true },
  { id: 1725451400002, srNo: 2, date: '2026-09-04', deductedDate: '2026-09-10', chequeNo: '535', vendor: 'Shubham Enterprises', purpose: 'Maintenance & Repairs / Operations', amount: '36536', whoPaid: 'A Building', isPaid: true },
  { id: 1725451400003, srNo: 3, date: '2026-09-04', deductedDate: '2026-09-09', chequeNo: '536', vendor: "Majestique Euriska 'B' Building Co-op Hsg Soc Ltd", purpose: 'Inter-Building Common Share Settlement / Transfer', amount: '8662', whoPaid: 'A Building', isPaid: true },
  { id: 1725451400004, srNo: 4, date: '2026-09-04', deductedDate: '2026-09-08', chequeNo: '537', vendor: 'Sai Swimming Pool Maintenance Services', purpose: 'Swimming Pool Monthly AMC / Maintenance', amount: '4519', whoPaid: 'A Building', isPaid: true },
  { id: 1725451400005, srNo: 5, date: '2026-09-04', deductedDate: '2026-09-08', chequeNo: '538', vendor: 'Sandip Raju Wavare', purpose: 'Housekeeping / Staff Deep Cleaning Services', amount: '50103', whoPaid: 'A Building', isPaid: true },
  { id: 1725451400006, srNo: 6, date: '2026-09-04', deductedDate: '2026-09-11', chequeNo: '539', vendor: 'Rajib Madan Patra', purpose: 'Plumbing & Electrical Maintenance Repairs', amount: '2636', whoPaid: 'A Building', isPaid: true },
  { id: 1725451400007, srNo: 7, date: '2026-09-04', deductedDate: '2026-09-18', chequeNo: '540', vendor: 'Shree Swami Samarth water suppliers', purpose: 'Water Tanker Supply Charges', amount: '3955', whoPaid: 'A Building', isPaid: true },
  { id: 1725451400008, srNo: 8, date: '2026-09-17', deductedDate: '2026-09-30', chequeNo: '542', vendor: 'MSEDCL', purpose: 'Common Area Electricity Bill', amount: '44420', whoPaid: 'A Building', isPaid: true }
];

const DEFAULT_SEPTEMBER_2026_COMMON_CHEQUES = [];

function getRealCurrentMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

const isMonthLockedByDefault = (month) => {
  const current = getRealCurrentMonth();
  return month < current;
};
const MASTER_UNLOCK_PASSWORD = '$05CeLRO';

export default function ChequeManagement({ isAdmin = false }) {
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth);
  const [searchText, setSearchText] = useState('');
  
  // Lock & Password state: automatically locks any month prior to current month
  const [unlockedMonths, setUnlockedMonths] = useState({});
  const [showUnlockModal, setShowUnlockModal] = useState(false);
  const [unlockPassword, setUnlockPassword] = useState('');
  const [unlockError, setUnlockError] = useState('');

  const isCurrentMonthLocked = isMonthLockedByDefault(selectedMonth) && !unlockedMonths[selectedMonth];
  const canEdit = isAdmin && !isCurrentMonthLocked;

  const [chequesA, setChequesA] = useState([{ id: 1, srNo: 1, date: '', deductedDate: '', chequeNo: '', vendor: '', purpose: '', amount: '', whoPaid: 'A Building' }]);
  const [chequesCommon, setChequesCommon] = useState([{ id: 1, srNo: 1, date: '', deductedDate: '', chequeNo: '', vendor: '', purpose: '', amount: '', whoPaid: 'A Building' }]);
  
  const [isLoading, setIsLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState('idle');
  const [saveMsg, setSaveMsg] = useState('');

  const isLoadedRef = useRef(false);
  const autoSaveTimer = useRef(null);
  
  const recordId = `cheques_${selectedMonth}`;
  const commonRecordId = `cheques_common_${selectedMonth}`;

  // Load from Firebase
  useEffect(() => {
    let cancelled = false;
    isLoadedRef.current = false;
    setSaveStatus('idle');
    setSaveMsg('');

    async function load() {
      setIsLoading(true);
      if (!isFirebaseConfigured || !db) {
        setIsLoading(false);
        isLoadedRef.current = true;
        return;
      }

      try {
        await ensureFirebaseSession();
        
        // Load Building A Cheques
        const snapA = await getDoc(doc(db, 'chequesMonthly', recordId));
        // Load Common Cheques
        const snapCommon = await getDoc(doc(db, 'chequesMonthly', commonRecordId));

        if (!cancelled) {
          if (snapA.exists()) {
            let aData = snapA.data().cheques || [];
            if (selectedMonth === '2026-06') {
              if (!aData.some(c => c.chequeNo === '493')) {
                aData.push({ id: Date.now() + 103, srNo: aData.length + 1, date: '2026-06-01', deductedDate: '', chequeNo: '493', vendor: 'CANCELLED', purpose: 'Cancel By Amit as month over', amount: '0', whoPaid: 'A Building', isPaid: false });
              }
            } else if (selectedMonth === '2026-09') {
              DEFAULT_SEPTEMBER_2026_CHEQUES.forEach((defChq) => {
                const existing = aData.find(c => String(c.chequeNo) === String(defChq.chequeNo));
                if (!existing) {
                  aData.push({ ...defChq, srNo: aData.length + 1 });
                } else {
                  if (!existing.date && defChq.date) existing.date = defChq.date;
                  if (!existing.deductedDate && defChq.deductedDate) existing.deductedDate = defChq.deductedDate;
                }
              });
              aData = aData.map((c, idx) => ({ ...c, srNo: idx + 1 }));
            }
            setChequesA(aData);
          } else {
            let initialA = [];
            if (selectedMonth === '2026-06') {
              initialA = [
                { id: Date.now() + 103, srNo: 1, date: '2026-06-01', deductedDate: '', chequeNo: '493', vendor: 'CANCELLED', purpose: 'Cancel By Amit as month over', amount: '0', whoPaid: 'A Building', isPaid: false }
              ];
            } else if (selectedMonth === '2026-09') {
              initialA = [...DEFAULT_SEPTEMBER_2026_CHEQUES];
            } else {
              initialA = [{ id: Date.now(), srNo: 1, date: '', deductedDate: '', chequeNo: '', vendor: '', purpose: '', amount: '', whoPaid: 'A Building', isPaid: false }];
            }
            setChequesA(initialA);
          }

          if (snapCommon.exists()) {
            let commonData = snapCommon.data().cheques || [];
            // Automatically clean up 493 from common if it was accidentally saved there
            commonData = commonData.filter(c => c.chequeNo !== '493');
            
            // Seed requested entries for June 2026 if not already present
            if (selectedMonth === '2026-06') {
              if (!commonData.some(c => c.vendor === 'MESDCL' && String(c.amount) === '57420')) {
                commonData.push({ id: Date.now() + 101, srNo: commonData.length + 1, date: '2026-06-15', chequeNo: '496', vendor: 'MESDCL', purpose: 'Electricity', amount: '57420', whoPaid: 'A Building', isPaid: false });
              }
              if (!commonData.some(c => c.vendor === 'Tanaji Hunde' && String(c.amount) === '11500')) {
                commonData.push({ id: Date.now() + 102, srNo: commonData.length + 1, date: '2026-06-12', chequeNo: '499', vendor: 'Tanaji Hunde', purpose: 'Gazibo - Received from B Building and C as well', amount: '11500', whoPaid: 'A Building', isPaid: false });
              }
            } else if (selectedMonth === '2026-09') {
              // 537, 540, 542 belong to A Building only; remove from Common Work
              commonData = commonData.filter(c => !['537', '540', '542'].includes(String(c.chequeNo || '').trim()));
            }
            setChequesCommon(commonData);
          } else {
            let initialCommon = [];
            if (selectedMonth === '2026-06') {
              initialCommon = [
                { id: Date.now() + 101, srNo: 1, date: '2026-06-15', deductedDate: '', chequeNo: '496', vendor: 'MESDCL', purpose: 'Electricity', amount: '57420', whoPaid: 'A Building', isPaid: false },
                { id: Date.now() + 102, srNo: 2, date: '2026-06-12', deductedDate: '', chequeNo: '499', vendor: 'Tanaji Hunde', purpose: 'Gazibo - Received from B Building and C as well', amount: '11500', whoPaid: 'A Building', isPaid: false }
              ];
            } else if (selectedMonth === '2026-09') {
              initialCommon = [...DEFAULT_SEPTEMBER_2026_COMMON_CHEQUES];
            } else {
              initialCommon = [{ id: Date.now() + 100, srNo: 1, date: '', deductedDate: '', chequeNo: '', vendor: '', purpose: '', amount: '', whoPaid: 'A Building', isPaid: false }];
            }
            setChequesCommon(initialCommon);
          }
          
          setSaveMsg(`Synced — ${formatMonthLabel(selectedMonth)}`);
        }
      } catch (err) {
        console.error('Cheque load error:', err);
      } finally {
        if (!cancelled) {
          setIsLoading(false);
          isLoadedRef.current = true;
        }
      }
    }
    load();
    return () => { cancelled = true; };
  }, [recordId, commonRecordId, selectedMonth]);

  const saveToFirebase = useCallback(async (data, targetId, month) => {
    setSaveStatus('saving');
    if (!isFirebaseConfigured || !db) {
      setSaveStatus('saved');
      return;
    }
    try {
      await ensureFirebaseSession();
      await setDoc(doc(db, 'chequesMonthly', targetId), {
        month,
        cheques: data,
        updatedAt: serverTimestamp()
      }, { merge: true });
      setSaveStatus('saved');
      setSaveMsg('Saved ✓');
    } catch {
      setSaveStatus('error');
      setSaveMsg('Failed');
    }
  }, []);

  const triggerAutoSave = (newData, isCommon = false) => {
    if (!isLoadedRef.current || !canEdit) return;
    clearTimeout(autoSaveTimer.current);
    setSaveStatus('pending');
    setSaveMsg('Unsaved changes...');
    autoSaveTimer.current = setTimeout(() => {
      saveToFirebase(newData, isCommon ? commonRecordId : recordId, selectedMonth);
    }, 1500);
  };

  // formTarget tracks which section the add-form submits to
  const [formTarget, setFormTarget] = useState('buildingA'); // 'buildingA' | 'common'
  const [formData, setFormData] = useState({
    date: '',
    deductedDate: '',
    chequeNo: '',
    vendor: '',
    purpose: '',
    remark: '',
    amount: '',
    whoPaid: 'A Building',
    isPaid: false,
    bPaidDate: '',
    cPaidDate: ''
  });

  const handleFormChange = (field, val) => {
    setFormData(prev => ({ ...prev, [field]: val }));
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    if (!canEdit) {
      alert('This period is locked against modifications. Please unlock with password first.');
      return;
    }
    if (!formData.vendor || !formData.amount || !formData.chequeNo) {
      alert('Please enter Cheque No, Vendor Name and Amount.');
      return;
    }

    const isCommon = formTarget === 'common';
    const currentList = isCommon ? chequesCommon : chequesA;

    // Check uniqueness
    const isDuplicate = currentList.some(c => c.chequeNo === formData.chequeNo.trim());
    if (isDuplicate) {
      alert(`Cheque No "${formData.chequeNo}" already exists in this ledger.`);
      return;
    }

    const newCheque = {
      ...formData,
      isPaid: formData.isPaid || Boolean(formData.deductedDate),
      srNo: currentList.length + 1,
      id: Date.now()
    };

    const next = [...currentList, newCheque];
    const final = next.filter(c => c.vendor || c.amount || c.chequeNo);
    const reindexed = final.map((c, i) => ({ ...c, srNo: i + 1 }));

    if (isCommon) {
      setChequesCommon(reindexed);
      triggerAutoSave(reindexed, true);
    } else {
      setChequesA(reindexed);
      triggerAutoSave(reindexed, false);
    }

    // Reset form
    setFormData({
      date: '',
      deductedDate: '',
      chequeNo: '',
      vendor: '',
      purpose: '',
      remark: '',
      amount: '',
      whoPaid: 'A Building',
      isPaid: false,
      bPaidDate: '',
      cPaidDate: ''
    });
  };

  const updateRow = (idx, field, val, isCommon) => {
    if (!canEdit) return;
    const next = isCommon ? [...chequesCommon] : [...chequesA];
    next[idx] = { ...next[idx], [field]: val };
    if (isCommon) {
      setChequesCommon(next);
      triggerAutoSave(next, true);
    } else {
      setChequesA(next);
      triggerAutoSave(next, false);
    }
  };

  const removeRow = (idx, isCommon) => {
    if (!canEdit) return;
    const currentList = isCommon ? chequesCommon : chequesA;
    const next = currentList.filter((_, i) => i !== idx).map((c, i) => ({ ...c, srNo: i + 1 }));
    if (isCommon) {
      setChequesCommon(next);
      triggerAutoSave(next, true);
    } else {
      setChequesA(next);
      triggerAutoSave(next, false);
    }
  };

  // State for editing existing cheques in modal
  const [editModalData, setEditModalData] = useState(null);

  const handleOpenEditModal = (c, actualIdx, isCommon) => {
    if (!canEdit) {
      if (isCurrentMonthLocked) {
        setShowUnlockModal(true);
        return;
      }
      alert('You need admin privileges to edit cheque details.');
      return;
    }
    setEditModalData({
      index: actualIdx,
      isCommon,
      cheque: {
        date: c.date || '',
        deductedDate: c.deductedDate || '',
        chequeNo: c.chequeNo || '',
        vendor: c.vendor || '',
        purpose: c.purpose || '',
        remark: c.remark || '',
        amount: c.amount || '',
        whoPaid: c.whoPaid || 'A Building',
        isPaid: Boolean(c.isPaid),
        bPaidDate: c.bPaidDate || '',
        cPaidDate: c.cPaidDate || ''
      }
    });
  };

  const handleEditFieldChange = (field, val) => {
    setEditModalData(prev => prev ? ({
      ...prev,
      cheque: { ...prev.cheque, [field]: val }
    }) : null);
  };

  const handleSaveEditModal = (e) => {
    e.preventDefault();
    if (!editModalData) return;
    const { index, isCommon, cheque } = editModalData;
    const next = isCommon ? [...chequesCommon] : [...chequesA];
    next[index] = {
      ...next[index],
      ...cheque,
      isPaid: cheque.isPaid || Boolean(cheque.deductedDate)
    };
    if (isCommon) {
      setChequesCommon(next);
    } else {
      setChequesA(next);
    }
    triggerAutoSave(next, isCommon);
    setEditModalData(null);
  };

  const handleUnlockSubmit = (e) => {
    e.preventDefault();
    if (unlockPassword === MASTER_UNLOCK_PASSWORD) {
      setUnlockedMonths(prev => ({ ...prev, [selectedMonth]: true }));
      setShowUnlockModal(false);
      setUnlockPassword('');
      setUnlockError('');
    } else {
      setUnlockError('Incorrect authorization password. Access denied.');
    }
  };

  const isPaybackTrackingActive = selectedMonth >= '2026-08';

  // Helper: filter + sort a cheque list
  const filterList = (list) => list
    .filter(c => {
      if (!searchText) return true;
      const s = searchText.toLowerCase();
      return (
        (c.chequeNo && String(c.chequeNo).toLowerCase().includes(s)) ||
        (c.date && String(c.date).toLowerCase().includes(s)) ||
        (c.vendor && String(c.vendor).toLowerCase().includes(s)) ||
        (c.purpose && String(c.purpose).toLowerCase().includes(s)) ||
        (c.remark && String(c.remark).toLowerCase().includes(s))
      );
    })
    .sort((a, b) => {
      const numA = Number(String(a.chequeNo || '').replace(/\D/g, '')) || Infinity;
      const numB = Number(String(b.chequeNo || '').replace(/\D/g, '')) || Infinity;
      return numA - numB;
    });

  const filteredA = filterList(chequesA);
  const filteredCommon = filterList(chequesCommon);

  const totalAmountA = filteredA.reduce((s, c) => s + n(c.amount), 0);
  const totalAmountCommon = filteredCommon.reduce((s, c) => s + n(c.amount), 0);
  const totalAmount = totalAmountCommon; // kept for share calc

  // Inter-building payback tracking metrics (B: 96 flats, C: 48 flats)
  const bTotalShare = (totalAmount * FLATS.B) / FLATS.Total;
  const cTotalShare = (totalAmount * FLATS.C) / FLATS.Total;

  let bReceivedAmount = 0;
  let bPendingAmount = 0;
  let cReceivedAmount = 0;
  let cPendingAmount = 0;
  let bPaidCount = 0;
  let cPaidCount = 0;

  filteredCommon.forEach(c => {
    const amt = n(c.amount);
    if (amt === 0) return;
    const bShare = (amt * FLATS.B) / FLATS.Total;
    const cShare = (amt * FLATS.C) / FLATS.Total;
    if (c.bPaidDate || c.bReceiveDate) { bReceivedAmount += bShare; bPaidCount += 1; }
    else { bPendingAmount += bShare; }
    if (c.cPaidDate || c.cReceiveDate) { cReceivedAmount += cShare; cPaidCount += 1; }
    else { cPendingAmount += cShare; }
  });

  const totalRecoveryDue = bTotalShare + cTotalShare;
  const totalRecovered = bReceivedAmount + cReceivedAmount;
  const totalOutstanding = bPendingAmount + cPendingAmount;

  // Missing Cheque Detection — checks BOTH Building A and Common Work, June 2026 onwards
  const getMissingCheques = () => {
    // Only check months from Jun 2026 onwards
    const [selYear, selMonthNum] = selectedMonth.split('-').map(Number);
    const cutoffYear = 2026, cutoffMonth = 6;
    if (selYear < cutoffYear || (selYear === cutoffYear && selMonthNum < cutoffMonth)) return [];

    // Combine all numeric cheque numbers from BOTH Building A and Common Work
    const extractNumbers = (cheques) =>
      cheques
        .filter(c => n(c.amount) !== 0) // Skip cancelled cheques (amount = 0)
        .map(c => {
          const stripped = String(c.chequeNo || '').replace(/\D/g, '');
          return stripped ? Number(stripped) : null;
        })
        .filter(num => num !== null);

    const allNumbers = [...new Set([...extractNumbers(chequesA), ...extractNumbers(chequesCommon)])].sort((a, b) => a - b);

    if (allNumbers.length < 2) return []; // Need at least 2 cheques to detect a gap

    const allNumbersSet = new Set(allNumbers);
    const missing = [];
    for (let i = 0; i < allNumbers.length - 1; i++) {
      const diff = allNumbers[i + 1] - allNumbers[i];
      if (diff > 1 && diff <= 4) {
        for (let j = allNumbers[i] + 1; j < allNumbers[i + 1]; j++) {
          if (!allNumbersSet.has(j)) {
            missing.push(j);
          }
        }
      }
    }
    return missing;
  };

  const missingCheques = getMissingCheques();

  const badge = {
    idle: { color: '#6b7280', icon: '●' },
    pending: { color: '#f59e0b', icon: '⏳' },
    saving: { color: '#3b82f6', icon: '↑' },
    saved: { color: '#10b981', icon: '✓' },
    error: { color: '#ef4444', icon: '✗' },
  }[saveStatus];

  const handleDownloadExcel = () => {
    const makeRows = (list, isCommon) => list.map(c => {
      const base = {
        'Section': isCommon ? 'Common Work' : 'Building A',
        'Sr. No': c.srNo,
        'Month': formatLongMonth(selectedMonth),
        'Cheque Date': c.date,
        'Amount Deducted Date': c.deductedDate || 'Pending',
        'Cheque No': c.chequeNo,
        'Vendor Name': c.vendor,
        'Remarks / Purpose': c.purpose,
        'Total (₹)': n(c.amount),
        'Who Paid': c.whoPaid,
        'Paid?': c.isPaid ? 'Yes' : 'No'
      };
      if (isCommon) {
        base['Remark'] = c.remark || '';
        const amt = n(c.amount);
        base['A Share (₹)'] = (amt * FLATS.A / FLATS.Total).toFixed(2);
        base['B Share (₹)'] = (amt * FLATS.B / FLATS.Total).toFixed(2);
        if (isPaybackTrackingActive) base['B Paid Back Date'] = c.bPaidDate || c.bReceiveDate || 'Pending';
        base['C Share (₹)'] = (amt * FLATS.C / FLATS.Total).toFixed(2);
        if (isPaybackTrackingActive) base['C Paid Back Date'] = c.cPaidDate || c.cReceiveDate || 'Pending';
      }
      return base;
    });
    const rows = [...makeRows(filteredA, false), ...makeRows(filteredCommon, true)];
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'All Cheques');
    XLSX.writeFile(wb, `Cheques_${selectedMonth}.xlsx`);
  };

  const handlePrintPdf = () => {
    const pdfCheques = [
      ...chequesA.map(cheque => ({ ...cheque, category: 'A Building' })),
      ...chequesCommon.map(cheque => ({ ...cheque, category: 'Common Work' })),
    ].filter(c => {
      if (!searchText) return true;
      const search = searchText.toLowerCase();
      return [c.chequeNo, c.date, c.deductedDate, c.vendor, c.purpose, c.remark, c.bPaidDate, c.cPaidDate]
        .some(value => String(value || '').toLowerCase().includes(search));
    }).sort((a, b) => {
      const numberA = Number(String(a.chequeNo || '').replace(/\D/g, '')) || Infinity;
      const numberB = Number(String(b.chequeNo || '').replace(/\D/g, '')) || Infinity;
      return numberA - numberB;
    });
    const includePaybackDates = selectedMonth >= '2026-08';
    const columns = [
      { label: 'Category', value: c => c.category },
      { label: 'Sr.', value: (_c, index) => index + 1 },
      { label: 'Cheque Date', value: c => c.date || '' },
      { label: 'Amount Deducted Date', value: c => c.deductedDate || 'Pending' },
      { label: 'Cheque No', value: c => c.chequeNo || '' },
      { label: 'Vendor Name', value: c => c.vendor || '' },
      { label: 'Remarks / Purpose', value: c => c.purpose || '' },
      { label: 'Remark', value: c => c.category === 'Common Work' ? c.remark || '' : '' },
      { label: 'Total (₹)', value: c => fmt(n(c.amount)), amount: true },
      { label: 'A Share (₹)', value: c => c.category === 'Common Work' ? fmt(n(c.amount) * FLATS.A / FLATS.Total) : '', amount: true },
      { label: 'B Share (₹)', value: c => c.category === 'Common Work' ? fmt(n(c.amount) * FLATS.B / FLATS.Total) : '', amount: true },
    ];

    if (includePaybackDates) {
      columns.push({ label: 'B Paid Back Date', value: c => c.category === 'Common Work' ? c.bPaidDate || c.bReceiveDate || 'Pending' : '' });
    }
    columns.push({ label: 'C Share (₹)', value: c => c.category === 'Common Work' ? fmt(n(c.amount) * FLATS.C / FLATS.Total) : '', amount: true });
    if (includePaybackDates) {
      columns.push({ label: 'C Paid Back Date', value: c => c.category === 'Common Work' ? c.cPaidDate || c.cReceiveDate || 'Pending' : '' });
    }
    columns.push(
      { label: 'Who Paid', value: c => c.whoPaid || '' },
      { label: 'Paid?', value: c => c.isPaid ? 'Yes' : 'No' },
    );

    const headers = columns.map(column => `<th>${column.label}</th>`).join('');
    const rows = pdfCheques.map((c, index) => `
      <tr>${columns.map(column => `<td${column.amount ? ' class="amount"' : ''}>${escapeHtml(column.value(c, index))}</td>`).join('')}</tr>
    `).join('');
    const printedDate = new Intl.DateTimeFormat('en-IN', {
      day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
    }).format(new Date());

    const printDoc = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Cheque Register - ${formatLongMonth(selectedMonth)}</title>
        <meta charset="utf-8" />
        <style>
          @page { size: A4 landscape; margin: 10mm; }
          * { box-sizing: border-box; }
          body { font-family: Arial, sans-serif; color: #0f172a; margin: 0; }
          h1 { color: #1e3a8a; font-size: 18px; margin: 0 0 4px; }
          .subtitle { color: #475569; font-size: 10px; margin-bottom: 12px; }
          table { border-collapse: collapse; width: 100%; font-size: 8px; }
          th, td { border: 1px solid #cbd5e1; padding: 4px 3px; text-align: left; vertical-align: top; }
          th { background: #eff6ff; color: #1e3a8a; font-weight: 700; }
          tbody tr:nth-child(even) { background: #f8fafc; }
          .amount { text-align: right; white-space: nowrap; }
          .footer { color: #64748b; font-size: 8px; margin-top: 8px; text-align: right; }
        </style>
      </head>
      <body>
        <h1>Combined Cheque Register</h1>
        <div class="subtitle">${formatLongMonth(selectedMonth)} · A Building and Common Work · ${pdfCheques.length} records</div>
        <table>
          <thead><tr>${headers}</tr></thead>
          <tbody>${rows}</tbody>
        </table>
        <div class="footer">Majestique Euriska CHS Ltd. · Printed on: ${printedDate}</div>
        <script>window.onload = function() { setTimeout(function() { window.print(); }, 250); };</script>
      </body>
      </html>
    `;

    const printWin = window.open('', '_blank');
    if (printWin) {
      printWin.document.write(printDoc);
      printWin.document.close();
    }
  };

  // Reusable table renderer for either section
  const renderChequeTable = (list, isCommon) => {
    const colSpanBase = isCommon ? (isPaybackTrackingActive ? 16 : 14) : 10;
    return (
      <div className="attendance-table-scroll">
        <table className="attendance-table" style={{ minWidth: isCommon ? (isPaybackTrackingActive ? 1850 : 1600) : 1200 }}>
          <thead>
            <tr style={{ background: isCommon ? '#f0fdf4' : '#eff6ff' }}>
              <th className="cheque-management-s1">Sr.</th>
              <th className="cheque-management-s2">Cheque Date</th>
              <th className="cheque-management-s3">Deducted Date</th>
              <th className="cheque-management-s4">Cheque No</th>
              <th className="cheque-management-s5">Vendor Name</th>
              <th>{isCommon ? 'Purpose' : 'Remarks / Purpose'}</th>
              {isCommon && <th className="cheque-management-s6">Remark</th>}
              <th className="cheque-management-s7">Total (₹)</th>
              {isCommon && (
                <>
                  <th className="cheque-management-s8">A Share (87)</th>
                  <th className="cheque-management-s9" style={{ width: isPaybackTrackingActive ? 110 : 120 }}>B Share (96)</th>
                  {isPaybackTrackingActive && <th className="cheque-management-s10">B Paid Back Date</th>}
                  <th className="cheque-management-s11" style={{ width: isPaybackTrackingActive ? 110 : 120 }}>C Share (48)</th>
                  {isPaybackTrackingActive && <th className="cheque-management-s12">C Paid Back Date</th>}
                </>
              )}
              <th className="cheque-management-s13">Who Paid</th>
              <th className="cheque-management-s14">Paid?</th>
              <th className="cheque-management-s15">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={colSpanBase} className="cheque-management-s16">Loading records...</td></tr>
            ) : list.length === 0 ? (
              <tr><td colSpan={colSpanBase} className="cheque-management-s16">
                {searchText ? `No cheques found matching "${searchText}"` : 'No cheques recorded.'}
              </td></tr>
            ) : (
              list.map((c, i) => {
                const sourceList = isCommon ? chequesCommon : chequesA;
                const actualIdx = sourceList.findIndex(orig => orig.id === c.id);
                const isCancelled = n(c.amount) === 0;
                const isPaid = c.isPaid === true;
                const rowStyle = isCancelled ? { background: '#f5f5f5', opacity: 0.65 } : isPaid ? { background: '#f0fdf4', opacity: 0.85 } : {};
                const strikeStyle = isCancelled || isPaid ? { textDecoration: 'line-through', color: '#9ca3af' } : {};
                return (
                  <tr key={c.id || i} style={rowStyle}>
                    <td style={strikeStyle}>{i + 1}</td>
                    <td><input className="attendance-register-input" type="date" value={c.date} onChange={e => updateRow(actualIdx, 'date', e.target.value, isCommon)} readOnly={!canEdit} style={strikeStyle} /></td>
                    <td>
                      <input className="attendance-register-input" type="date" value={c.deductedDate || ''}
                        onChange={e => {
                          updateRow(actualIdx, 'deductedDate', e.target.value, isCommon);
                          if (e.target.value && !c.isPaid) updateRow(actualIdx, 'isPaid', true, isCommon);
                        }}
                        readOnly={!canEdit} title="Date amount was deducted/debited from bank"
                      />
                    </td>
                    <td>
                      <div className="cheque-management-s17">
                        <input className="attendance-register-input" value={c.chequeNo} onChange={e => updateRow(actualIdx, 'chequeNo', e.target.value, isCommon)} readOnly={!canEdit} style={strikeStyle} />
                        {isCancelled && <span className="cheque-management-s18">CANCELLED</span>}
                      </div>
                    </td>
                    <td><input className="attendance-register-input cheque-management-s19" style={{ ...strikeStyle }} value={c.vendor} onChange={e => updateRow(actualIdx, 'vendor', e.target.value, isCommon)} readOnly={!canEdit} /></td>
                    <td><input className="attendance-register-input" value={c.purpose} onChange={e => updateRow(actualIdx, 'purpose', e.target.value, isCommon)} readOnly={!canEdit} style={isCancelled || isPaid ? { color: '#9ca3af' } : {}} /></td>
                    {isCommon && (
                      <td><input className="attendance-register-input" placeholder="Add remark..." value={c.remark || ''} onChange={e => updateRow(actualIdx, 'remark', e.target.value, isCommon)} readOnly={!canEdit} style={strikeStyle} title="Remark / Note for common work" /></td>
                    )}
                    <td><input className="attendance-register-input cheque-management-s20" style={{ ...(isCancelled ? { textDecoration: 'line-through', color: '#dc2626' } : isPaid ? { textDecoration: 'line-through', color: '#16a34a' } : {}) }} value={c.amount} onChange={e => updateRow(actualIdx, 'amount', e.target.value, isCommon)} readOnly={!canEdit} /></td>
                    {isCommon && (
                      <>
                        <td className="cheque-management-s21" style={{ color: isCancelled ? '#9ca3af' : '#16a34a', ...(isPaid ? { textDecoration: 'line-through' } : {}) }}>{isCancelled ? '—' : `₹${fmt(n(c.amount) * FLATS.A / FLATS.Total)}`}</td>
                        <td className="cheque-management-s21" style={{ color: isCancelled ? '#9ca3af' : '#2563eb', ...(isPaid ? { textDecoration: 'line-through' } : {}) }}>{isCancelled ? '—' : `₹${fmt(n(c.amount) * FLATS.B / FLATS.Total)}`}</td>
                        {isPaybackTrackingActive && (
                          <td className="cheque-management-s22">
                            {isCancelled ? <span className="cheque-management-s23">—</span> : (
                              <div className="cheque-management-s24">
                                <input type="date" className="attendance-register-input cheque-management-s25" value={c.bPaidDate || c.bReceiveDate || ''} onChange={e => updateRow(actualIdx, 'bPaidDate', e.target.value, isCommon)} readOnly={!canEdit} title="B Building paid back date" />
                                {(c.bPaidDate || c.bReceiveDate) ? (
                                  <div className="cheque-management-s26">
                                    <span>✓ Paid Back</span>
                                    {canEdit && <button type="button" onClick={() => updateRow(actualIdx, 'bPaidDate', '', isCommon)} className="cheque-management-s27">✕</button>}
                                  </div>
                                ) : n(c.amount) > 0 && <div className="cheque-management-s28">⏳ Pending</div>}
                              </div>
                            )}
                          </td>
                        )}
                        <td className="cheque-management-s21" style={{ color: isCancelled ? '#9ca3af' : '#ea580c', ...(isPaid ? { textDecoration: 'line-through' } : {}) }}>{isCancelled ? '—' : `₹${fmt(n(c.amount) * FLATS.C / FLATS.Total)}`}</td>
                        {isPaybackTrackingActive && (
                          <td className="cheque-management-s29">
                            {isCancelled ? <span className="cheque-management-s23">—</span> : (
                              <div className="cheque-management-s24">
                                <input type="date" className="attendance-register-input cheque-management-s25" value={c.cPaidDate || c.cReceiveDate || ''} onChange={e => updateRow(actualIdx, 'cPaidDate', e.target.value, isCommon)} readOnly={!canEdit} title="C Building paid back date" />
                                {(c.cPaidDate || c.cReceiveDate) ? (
                                  <div className="cheque-management-s26">
                                    <span>✓ Paid Back</span>
                                    {canEdit && <button type="button" onClick={() => updateRow(actualIdx, 'cPaidDate', '', isCommon)} className="cheque-management-s27">✕</button>}
                                  </div>
                                ) : n(c.amount) > 0 && <div className="cheque-management-s28">⏳ Pending</div>}
                              </div>
                            )}
                          </td>
                        )}
                      </>
                    )}
                    <td>
                      <select className="attendance-register-input" value={c.whoPaid} onChange={e => updateRow(actualIdx, 'whoPaid', e.target.value, isCommon)} disabled={!canEdit} style={strikeStyle}>
                        <option>A Building</option><option>B Building</option><option>C Building</option><option>Petty Cash</option>
                      </select>
                    </td>
                    <td className="cheque-management-s30">
                      <input type="checkbox" checked={c.isPaid || false} onChange={e => updateRow(actualIdx, 'isPaid', e.target.checked, isCommon)} disabled={!canEdit} className="cheque-management-s31" />
                    </td>
                    <td className="cheque-management-s32">
                      <div className="cheque-management-s33">
                        <button type="button" onClick={() => handleOpenEditModal(c, actualIdx, isCommon)} className="button-secondary cheque-management-s34" title="Edit Cheque Details">✏️ Edit</button>
                        {canEdit && <button type="button" className="button-icon cheque-management-s35" onClick={() => removeRow(actualIdx, isCommon)} title="Delete Cheque">✕</button>}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
          <tfoot>
            <tr className="cheque-management-s36">
              <td colSpan={isCommon ? 7 : 6} className="cheque-management-s37">GRAND TOTAL</td>
              <td className="cheque-management-s38">₹{fmt(isCommon ? totalAmountCommon : totalAmountA)}</td>
              {isCommon && (
                <>
                  <td className="cheque-management-s39">₹{fmt(totalAmountCommon * FLATS.A / FLATS.Total)}</td>
                  <td className="cheque-management-s38">₹{fmt(totalAmountCommon * FLATS.B / FLATS.Total)}</td>
                  {isPaybackTrackingActive && <td className="cheque-management-s40">Rec: ₹{fmt(bReceivedAmount)}</td>}
                  <td className="cheque-management-s41">₹{fmt(totalAmountCommon * FLATS.C / FLATS.Total)}</td>
                  {isPaybackTrackingActive && <td className="cheque-management-s42">Rec: ₹{fmt(cReceivedAmount)}</td>}
                </>
              )}
              <td colSpan={3}></td>
            </tr>
          </tfoot>
        </table>
      </div>
    );
  };

  return (
    <div className="cheque-management cheque-management-s43">

      {/* Month Tabs */}
      <div className="table-card cheque-management-s44">
        <div className="attendance-month-tabs" role="tablist">
          {FINANCIAL_YEAR_MONTHS.map(mv => {
            const isLocked = isMonthLockedByDefault(mv);
            const isUnlocked = isLocked && Boolean(unlockedMonths[mv]);
            return (
              <button
                key={mv}
                className={`attendance-month-tab ${selectedMonth === mv ? 'attendance-month-tab--active' : ''} cheque-management-s45`}
                onClick={() => setSelectedMonth(mv)}
                title={isLocked ? (isUnlocked ? `${formatLongMonth(mv)} (Unlocked for Editing)` : `Closed Month (Locked) — ${formatLongMonth(mv)}`) : `${formatLongMonth(mv)} (Active Period)`}
              >
                <span>{formatMonthLabel(mv)}</span>
                {isLocked && (
                  <span 
                    className="cheque-management-s46" style={{ opacity: isUnlocked ? 0.7 : 1 }} 
                    aria-label={isUnlocked ? 'Period Unlocked' : 'Period Locked'}
                  >
                    {isUnlocked ? '🔓' : '🔒'}
                  </span>
                )}
              </button>
            );
          })}
        </div>
        
        <div className="attendance-table-card__header">
          <div>
            <p className="eyebrow">A Building &amp; Common Work — {formatLongMonth(selectedMonth)}</p>
            <div className="cheque-management-s47">
              <h3 className="cheque-management-s48">Cheque Register — {formatMonthLabel(selectedMonth)}</h3>
              {isMonthLockedByDefault(selectedMonth) && (
                <span className="cheque-management-s49" style={{ background: unlockedMonths[selectedMonth] ? '#dcfce7' : '#fef3c7', color: unlockedMonths[selectedMonth] ? '#166534' : '#92400e', border: unlockedMonths[selectedMonth] ? '1px solid #86efac' : '1px solid #fde68a' }}>
                  {unlockedMonths[selectedMonth] ? '🔓 AUDIT UNLOCKED' : '🔒 CLOSED MONTH LOCKED'}
                </span>
              )}
            </div>
          </div>
          <div className="cheque-management-s50" style={{ color: badge.color }}>
             <span>{badge.icon}</span>
             <span>{isLoading ? 'Loading...' : saveMsg || 'Ready'}</span>
          </div>
        </div>
      </div>

      {/* Lock System Notification & Controls */}
      {isMonthLockedByDefault(selectedMonth) && (
        isCurrentMonthLocked ? (
          <div className="cheque-management-s51">
            <div className="cheque-management-s52">
              <span className="cheque-management-s53">🔒</span>
              <div>
                <h4 className="cheque-management-s54">
                  Closed Month Locked: {formatLongMonth(selectedMonth)}
                </h4>
                <p className="cheque-management-s55">
                  Past months are automatically locked when a new month begins. Enter authorization password to make changes.
                </p>
              </div>
            </div>
            {isAdmin && (
              <button
                type="button"
                onClick={() => { setShowUnlockModal(true); setUnlockError(''); setUnlockPassword(''); }}
                className="button-primary cheque-management-s56"
              >
                🔑 Unlock with Password
              </button>
            )}
          </div>
        ) : (
          <div className="cheque-management-s57">
            <div className="cheque-management-s58">
              <span className="cheque-management-s59">🔓</span>
              <div>
                <span className="cheque-management-s60">
                  {formatLongMonth(selectedMonth)} Unlocked (Temporary Edit Access Active)
                </span>
                <p className="cheque-management-s61">
                  You can now add, edit, or remove cheque entries for {formatLongMonth(selectedMonth)}.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setUnlockedMonths(prev => ({ ...prev, [selectedMonth]: false }))}
              className="button-secondary cheque-management-s62"
            >
              🔒 Re-lock Month
            </button>
          </div>
        )
      )}

      {/* Missing Cheque Alert Banner — Both tabs, June 2026+ */}
      {missingCheques.length > 0 && (
        <div className="cheque-management-s63">
          <span className="cheque-management-s64">⚠️</span>
          <div>
            <p className="cheque-management-s65">Missing Cheque Alert</p>
            <p className="cheque-management-s66">
              In <strong>{formatLongMonth(selectedMonth)}</strong>, you missed to add cheque number(s): <strong>{missingCheques.join(', ')}</strong>. Please check.
            </p>
          </div>
        </div>
      )}

      {/* SEARCH ZONE */}
      <div className="section-card cheque-management-s67">
        <div className="cheque-management-s68">
          <div className="filter-field cheque-management-s69">
            <label className="eyebrow cheque-management-s70">🔍 Search by Cheque Number or Date</label>
            <input 
              type="search" 
              placeholder="Search Cheque No, Date (YYYY-MM-DD), or Vendor..." 
              value={searchText} 
              onChange={e => setSearchText(e.target.value)}
              className="attendance-register-input cheque-management-s71"
            />
          </div>
          <button className="button-secondary cheque-management-s72" onClick={handlePrintPdf}>
            ⬇ Export PDF
          </button>
          <button className="button-secondary cheque-management-s72" onClick={handleDownloadExcel}>
            📊 Export Excel
          </button>
        </div>
      </div>

      {/* ADD NEW CHEQUE FORM */}
      {isAdmin && (
        isCurrentMonthLocked ? (
          <div className="section-card cheque-management-s73">
            <div className="cheque-management-s74">
              <span className="cheque-management-s75">🔒</span>
              <h4 className="cheque-management-s76">Adding Cheques Disabled for {formatLongMonth(selectedMonth)}</h4>
              <p className="cheque-management-s77">
                Past closed months are automatically locked against unintended changes. Enter the password to unlock edits for this month.
              </p>
              <button type="button" onClick={() => { setShowUnlockModal(true); setUnlockError(''); setUnlockPassword(''); }} className="button-secondary cheque-management-s78">
                🔑 Enter Password to Enable Adding Cheques
              </button>
            </div>
          </div>
        ) : (
          <div className="section-card cheque-management-s79">
            {/* Section selector toggle */}
            <div className="cheque-management-s80">
              <button type="button"
                onClick={() => setFormTarget('buildingA')}
                className="cheque-management-s81" style={{ background: formTarget === 'buildingA' ? '#1e3a8a' : 'white', color: formTarget === 'buildingA' ? 'white' : '#1e3a8a' }}
              >🏢 Building A</button>
              <button type="button"
                onClick={() => setFormTarget('common')}
                className="cheque-management-s82" style={{ background: formTarget === 'common' ? '#065f46' : 'white', color: formTarget === 'common' ? 'white' : '#065f46' }}
              >🤝 Common Work</button>
              <span className="cheque-management-s83">
                Adding to: <strong>{formTarget === 'common' ? 'Common Work' : 'A Building'}</strong>
              </span>
            </div>
            <form onSubmit={handleFormSubmit} className="cheque-management-s84">
              <div className="field-group">
                <label className="eyebrow cheque-management-s70">Cheque Date <span className="cheque-management-s85">*</span></label>
                <input className="attendance-register-input cheque-management-s86" type="date" value={formData.date} onChange={e => handleFormChange('date', e.target.value)} required />
              </div>
              <div className="field-group">
                <label className="eyebrow cheque-management-s70">Amount Deducted Date</label>
                <input className="attendance-register-input cheque-management-s86" type="date" value={formData.deductedDate || ''} onChange={e => handleFormChange('deductedDate', e.target.value)} />
              </div>
              <div className="field-group">
                <label className="eyebrow cheque-management-s70">Cheque No <span className="cheque-management-s85">*</span></label>
                <input className="attendance-register-input cheque-management-s86" placeholder="Cheque #" value={formData.chequeNo} onChange={e => handleFormChange('chequeNo', e.target.value)} required />
              </div>
              <div className="field-group">
                <label className="eyebrow cheque-management-s70">Vendor Name <span className="cheque-management-s85">*</span></label>
                <input className="attendance-register-input cheque-management-s86" placeholder="Payee Name" value={formData.vendor} onChange={e => handleFormChange('vendor', e.target.value)} required />
              </div>
              <div className="field-group">
                <label className="eyebrow cheque-management-s70">Total Amount (₹) <span className="cheque-management-s85">*</span></label>
                <input className="attendance-register-input cheque-management-s86" placeholder="0.00" value={formData.amount} onChange={e => handleFormChange('amount', e.target.value)} required />
              </div>
              <div className="field-group">
                <label className="eyebrow cheque-management-s70">Who Paid <span className="cheque-management-s85">*</span></label>
                <select className="attendance-register-input cheque-management-s86" value={formData.whoPaid} onChange={e => handleFormChange('whoPaid', e.target.value)} required>
                  <option value="">-- Select Payer --</option>
                  <option>A Building</option><option>B Building</option><option>C Building</option><option>Petty Cash</option>
                </select>
              </div>
              {formTarget === 'common' && isPaybackTrackingActive && (
                <>
                  <div className="field-group">
                    <label className="eyebrow cheque-management-s70">B Paid Back Date</label>
                    <input className="attendance-register-input cheque-management-s86" type="date" value={formData.bPaidDate || ''} onChange={e => handleFormChange('bPaidDate', e.target.value)} />
                  </div>
                  <div className="field-group">
                    <label className="eyebrow cheque-management-s70">C Paid Back Date</label>
                    <input className="attendance-register-input cheque-management-s86" type="date" value={formData.cPaidDate || ''} onChange={e => handleFormChange('cPaidDate', e.target.value)} />
                  </div>
                </>
              )}
              <div className="field-group" style={{ gridColumn: formTarget === 'common' ? 'span 1' : '1 / -1' }}>
                <label className="eyebrow cheque-management-s70">{formTarget === 'common' ? 'Purpose / Head of Expense' : 'Remarks / Purpose'}</label>
                <input className="attendance-register-input cheque-management-s86" placeholder="Describe the payment purpose..." value={formData.purpose} onChange={e => handleFormChange('purpose', e.target.value)} />
              </div>
              {formTarget === 'common' && (
                <div className="field-group">
                  <label className="eyebrow cheque-management-s70">Remark / Notes</label>
                  <input className="attendance-register-input cheque-management-s86" placeholder="Add note / remark..." value={formData.remark || ''} onChange={e => handleFormChange('remark', e.target.value)} />
                </div>
              )}
              <div className="cheque-management-s87">
                <button type="submit" className="button-primary cheque-management-s88"
                  style={{ background: formTarget === 'common' ? '#059669' : '#1e3a8a', borderColor: formTarget === 'common' ? '#047857' : '#1e40af' }}
                >
                  ➕ Add to {formTarget === 'common' ? 'Common Work' : 'Building A'}
                </button>
              </div>
            </form>
          </div>
        )
      )}

      {/* ── SECTION 1: BUILDING A ────────────────────────────────── */}
      <div className="table-card cheque-management-s89">
        <div className="cheque-management-s90">
          <div>
            <p className="eyebrow cheque-management-s91">A Building Ledger</p>
            <h4 className="cheque-management-s92">🏢 Building A Cheques — {chequesA.filter(c => c.chequeNo).length} entries · ₹{fmt(totalAmountA)}</h4>
          </div>
          <span className="cheque-management-s93">
            Scroll →
          </span>
        </div>
        {renderChequeTable(filteredA, false)}
      </div>

      {/* ── SECTION 2: COMMON WORK ───────────────────────────────── */}
      <div className="table-card cheque-management-s94">
        <div className="cheque-management-s95">
          <div>
            <p className="eyebrow cheque-management-s96">Society Shared Expenses</p>
            <h4 className="cheque-management-s97">🤝 Common Work Cheques — {chequesCommon.filter(c => c.chequeNo).length} entries · ₹{fmt(totalAmountCommon)}</h4>
          </div>
          {isPaybackTrackingActive && (
            <span className="cheque-management-s98">
              🤝 B &amp; C Payback Tracking Active
            </span>
          )}
        </div>
        {/* Share Calculator */}
        {(totalAmountCommon > 0 || isPaybackTrackingActive) && (
          <div className="cheque-management-s99" style={{ gridTemplateColumns: isPaybackTrackingActive ? 'repeat(auto-fit, minmax(220px, 1fr))' : 'repeat(auto-fit, minmax(180px, 1fr))' }}>
            <div className="cheque-management-s100">
              <p className="eyebrow cheque-management-s101">A Share ({FLATS.A} flats)</p>
              <h4 className="cheque-management-s102">₹{fmt(totalAmountCommon * FLATS.A / FLATS.Total)}</h4>
            </div>
            <div className="cheque-management-s100">
              <div className="cheque-management-s103">
                <p className="eyebrow cheque-management-s104">B Share ({FLATS.B} flats)</p>
                {isPaybackTrackingActive && <span className="cheque-management-s105" style={{ color: bPendingAmount === 0 ? '#166534' : '#b45309' }}>{bPaidCount}/{filteredCommon.filter(c => n(c.amount) > 0).length} Paid</span>}
              </div>
              <h4 className="cheque-management-s106">₹{fmt(bTotalShare)}</h4>
              {isPaybackTrackingActive && <div className="cheque-management-s107">✓ Recv: ₹{fmt(bReceivedAmount)} · <span className="cheque-management-s108">⏳ ₹{fmt(bPendingAmount)}</span></div>}
            </div>
            <div className="cheque-management-s100">
              <div className="cheque-management-s103">
                <p className="eyebrow cheque-management-s109">C Share ({FLATS.C} flats)</p>
                {isPaybackTrackingActive && <span className="cheque-management-s105" style={{ color: cPendingAmount === 0 ? '#166534' : '#b45309' }}>{cPaidCount}/{filteredCommon.filter(c => n(c.amount) > 0).length} Paid</span>}
              </div>
              <h4 className="cheque-management-s110">₹{fmt(cTotalShare)}</h4>
              {isPaybackTrackingActive && <div className="cheque-management-s107">✓ Recv: ₹{fmt(cReceivedAmount)} · <span className="cheque-management-s108">⏳ ₹{fmt(cPendingAmount)}</span></div>}
            </div>
            {isPaybackTrackingActive && (
              <div className="cheque-management-s111">
                <p className="eyebrow cheque-management-s112">Inter-Building Recovery</p>
                <h4 className="cheque-management-s113" style={{ color: totalOutstanding > 0 ? '#d97706' : '#16a34a' }}>₹{fmt(totalRecovered)} / ₹{fmt(totalRecoveryDue)}</h4>
                <div className="cheque-management-s114" style={{ color: totalOutstanding > 0 ? '#b45309' : '#15803d' }}>
                  {totalOutstanding > 0 ? `⏳ ₹${fmt(totalOutstanding)} outstanding` : '✓ All Settled'}
                </div>
              </div>
            )}
          </div>
        )}
        {renderChequeTable(filteredCommon, true)}
      </div>

      {/* Edit Cheque Modal */}
      {editModalData && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="cheque-edit-dialog-title"
          className="cheque-management-s115"
        >
          <div
            className="table-card cheque-management-s116"
          >
            <div className="cheque-management-s117">
              <div className="cheque-management-s58">
                <div className="cheque-management-s118">
                  ✏️
                </div>
                <div>
                  <h3 id="cheque-edit-dialog-title" className="cheque-management-s119">
                    Edit Cheque {editModalData.cheque.chequeNo ? `#${editModalData.cheque.chequeNo}` : 'Entry'}
                  </h3>
                  <p className="cheque-management-s120">
                    {editModalData.isCommon ? '🤝 Common Work Cheque' : '🏢 Building A Cheque'} • {formatLongMonth(selectedMonth)}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditModalData(null)}
                className="cheque-management-s121"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEditModal} className="cheque-management-s122">
              <div className="field-group">
                <label className="eyebrow cheque-management-s123">Cheque Date <span className="cheque-management-s85">*</span></label>
                <input
                  type="date"
                  className="attendance-register-input cheque-management-s124"
                  value={editModalData.cheque.date}
                  onChange={e => handleEditFieldChange('date', e.target.value)}
                  required
                />
              </div>

              <div className="field-group">
                <label className="eyebrow cheque-management-s123">Amount Deducted Date</label>
                <input
                  type="date"
                  className="attendance-register-input cheque-management-s124"
                  value={editModalData.cheque.deductedDate}
                  onChange={e => handleEditFieldChange('deductedDate', e.target.value)}
                />
              </div>

              <div className="field-group">
                <label className="eyebrow cheque-management-s123">Cheque No <span className="cheque-management-s85">*</span></label>
                <input
                  type="text"
                  className="attendance-register-input cheque-management-s124"
                  value={editModalData.cheque.chequeNo}
                  onChange={e => handleEditFieldChange('chequeNo', e.target.value)}
                  placeholder="Cheque #"
                  required
                />
              </div>

              <div className="field-group">
                <label className="eyebrow cheque-management-s123">Total Amount (₹) <span className="cheque-management-s85">*</span></label>
                <input
                  type="text"
                  className="attendance-register-input cheque-management-s125"
                  value={editModalData.cheque.amount}
                  onChange={e => handleEditFieldChange('amount', e.target.value)}
                  placeholder="0.00"
                  required
                />
              </div>

              <div className="field-group cheque-management-s126">
                <label className="eyebrow cheque-management-s123">Payee / Vendor Name <span className="cheque-management-s85">*</span></label>
                <input
                  type="text"
                  className="attendance-register-input cheque-management-s127"
                  value={editModalData.cheque.vendor}
                  onChange={e => handleEditFieldChange('vendor', e.target.value)}
                  placeholder="Vendor / Payee Name"
                  required
                />
              </div>

              <div className="field-group cheque-management-s126">
                <label className="eyebrow cheque-management-s123">Purpose / Head of Expense</label>
                <input
                  type="text"
                  className="attendance-register-input cheque-management-s124"
                  value={editModalData.cheque.purpose}
                  onChange={e => handleEditFieldChange('purpose', e.target.value)}
                  placeholder="Payment purpose description..."
                />
              </div>

              <div className="field-group cheque-management-s126">
                <label className="eyebrow cheque-management-s123">Remark / Notes</label>
                <input
                  type="text"
                  className="attendance-register-input cheque-management-s124"
                  value={editModalData.cheque.remark}
                  onChange={e => handleEditFieldChange('remark', e.target.value)}
                  placeholder="Additional remark / note for this cheque..."
                />
              </div>

              <div className="field-group">
                <label className="eyebrow cheque-management-s123">Who Paid</label>
                <select
                  className="attendance-register-input cheque-management-s124"
                  value={editModalData.cheque.whoPaid}
                  onChange={e => handleEditFieldChange('whoPaid', e.target.value)}
                >
                  <option>A Building</option>
                  <option>B Building</option>
                  <option>C Building</option>
                  <option>Petty Cash</option>
                </select>
              </div>

              <div className="field-group cheque-management-s128">
                <label className="cheque-management-s129">
                  <input
                    type="checkbox"
                    checked={editModalData.cheque.isPaid}
                    onChange={e => handleEditFieldChange('isPaid', e.target.checked)}
                    className="cheque-management-s31"
                  />
                  <span>Cheque Cleared / Deducted</span>
                </label>
              </div>

              {editModalData.isCommon && isPaybackTrackingActive && (
                <>
                  <div className="field-group">
                    <label className="eyebrow cheque-management-s123">B Paid Back Date</label>
                    <input
                      type="date"
                      className="attendance-register-input cheque-management-s124"
                      value={editModalData.cheque.bPaidDate}
                      onChange={e => handleEditFieldChange('bPaidDate', e.target.value)}
                    />
                  </div>
                  <div className="field-group">
                    <label className="eyebrow cheque-management-s123">C Paid Back Date</label>
                    <input
                      type="date"
                      className="attendance-register-input cheque-management-s124"
                      value={editModalData.cheque.cPaidDate}
                      onChange={e => handleEditFieldChange('cPaidDate', e.target.value)}
                    />
                  </div>
                </>
              )}

              <div className="cheque-management-s130">
                <button
                  type="button"
                  onClick={() => setEditModalData(null)}
                  className="button-secondary cheque-management-s131"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="button-primary cheque-management-s132"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Password Unlock Modal */}
      {showUnlockModal && (
        <div 
          role="dialog" 
          aria-modal="true"
          aria-labelledby="cheque-unlock-dialog-title"
          className="cheque-management-s115"
        >
          <div 
            className="table-card cheque-management-s133"
          >
            <div className="cheque-management-s134">
              <div className="cheque-management-s135">
                🔐
              </div>
              <div>
                <h3 id="cheque-unlock-dialog-title" className="cheque-management-s119">
                  Unlock Cheque Tracker — {formatLongMonth(selectedMonth)}
                </h3>
                <p className="cheque-management-s120">
                  Closed Month Audit Protection
                </p>
              </div>
            </div>

            <p className="cheque-management-s136">
              This past month is locked. Please enter the treasurer or administrator authorization password to unlock editing for {formatLongMonth(selectedMonth)}.
            </p>

            <form onSubmit={handleUnlockSubmit}>
              <div className="field-group cheque-management-s137">
                <label htmlFor="cheque-unlock-password" className="eyebrow cheque-management-s123">
                  Authorization Password
                </label>
                <input
                  id="cheque-unlock-password"
                  type="password"
                  placeholder="Enter authorization password..."
                  value={unlockPassword}
                  onChange={(e) => { setUnlockPassword(e.target.value); setUnlockError(''); }}
                  className="attendance-register-input cheque-management-s138"
                  autoFocus
                  required
                />
                {unlockError && (
                  <p className="cheque-management-s139">
                    ⚠️ {unlockError}
                  </p>
                )}
              </div>

              <div className="cheque-management-s140">
                <button
                  type="button"
                  onClick={() => { setShowUnlockModal(false); setUnlockPassword(''); setUnlockError(''); }}
                  className="button-secondary cheque-management-s131"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="button-primary cheque-management-s141"
                >
                  Unlock Editing
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
