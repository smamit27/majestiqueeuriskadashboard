import React, { useState, useEffect, useMemo, useRef } from 'react';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { db, ensureFirebaseSession, isFirebaseConfigured } from '../../firebase.js';
import LiquidGlassCard from '../liquid-glass/LiquidGlassCard.jsx';
import * as XLSX from 'xlsx';
import {
  Wrench, ShieldCheck, Flame, Zap, Droplets, Dumbbell,
  FileCheck, AlertTriangle, Search, Plus, Download, Printer,
  Filter, Edit2, Trash2, CheckCircle2, Clock, Calendar, Check, X,
  Building, ShieldAlert, Cpu
} from 'lucide-react';

const n = (v) => parseFloat(v) || 0;
const fmt = (v) => Number(v).toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });

function getDaysRemaining(endDateStr) {
  if (!endDateStr) return null;
  const diffTime = new Date(endDateStr) - new Date();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

function getContractStatus(endDateStr) {
  const days = getDaysRemaining(endDateStr);
  if (days === null) return 'Active';
  if (days < 0) return 'Expired';
  if (days <= 30) return 'Expiring Soon';
  return 'Active';
}

function getStatusColor(status) {
  switch (status) {
    case 'Active': return '#10b981';
    case 'Expiring Soon': return '#f59e0b';
    case 'Expired': return '#ef4444';
    default: return '#6b7280';
  }
}

// ── Official Society Equipment & Services Register ─────────────────────────
export const DEFAULT_EQUIPMENT_RECORDS = [
  {
    id: 'eq_1',
    srNo: 1,
    equipment: 'AC – Clubhouse & Gym',
    detailsRequired: 'Last service date; AMC details/copy; vendor; next service due date; service report/invoice',
    lastServiceDate: '2024-05-21',
    amcWarranty: 'No',
    vendor: 'Apex Enterprises',
    nextDueDate: '2026-05-21',
    invoiceAvailable: 'Yes',
    remarks: 'Routine chemical wash & gas top-up done on 21.05.2024; AMC copy pending',
    category: 'Clubhouse & HVAC',
    estimatedCost: 18000
  },
  {
    id: 'eq_2',
    srNo: 2,
    equipment: 'DG Battery',
    detailsRequired: 'Warranty details; purchase/replacement date; last service/check-up; AMC details, if any',
    lastServiceDate: '2026-01-29',
    amcWarranty: 'Warranty',
    vendor: 'Kirloskar Care',
    nextDueDate: '2026-07-29',
    invoiceAvailable: 'Yes',
    remarks: 'Check With rohan Sir',
    category: 'DG & Power',
    estimatedCost: 28000
  },
  {
    id: 'eq_3',
    srNo: 3,
    equipment: 'DG Machine',
    detailsRequired: 'Last servicing date; AMC details/copy; vendor; next service due date; service report/invoice',
    lastServiceDate: '2026-01-29',
    amcWarranty: 'AMC Routine',
    vendor: 'Kirloskar Care',
    nextDueDate: '2026-04-29',
    invoiceAvailable: 'In Progress',
    remarks: '380 kVA generator B-Check, lube oil and filter replacement',
    category: 'DG & Power',
    estimatedCost: 114000
  },
  {
    id: 'eq_4',
    srNo: 4,
    equipment: 'DG Diesel',
    detailsRequired: 'Last diesel filling date; quantity filled; amount paid; last 2–3 filling records; current stock',
    lastServiceDate: '2026-07-05',
    amcWarranty: 'Fuel Supply',
    vendor: 'Ghule Petrolium',
    nextDueDate: '2026-08-05',
    invoiceAvailable: 'Challan Available',
    remarks: 'Tank dip stick reading logged; last 2-3 filling records on file',
    category: 'DG & Power',
    estimatedCost: 85000
  },
  {
    id: 'eq_5',
    srNo: 5,
    equipment: 'Gym Equipment',
    detailsRequired: 'AMC details/copy; last service date; vendor; next service due date; service report/invoice; equipment covered',
    lastServiceDate: '2026-09-30',
    amcWarranty: 'AMC Active',
    vendor: 'Pralhad Ambekar',
    nextDueDate: '2026-12-30',
    invoiceAvailable: 'Yes',
    remarks: 'Treadmills, elliptical cross trainers & multi-gym calibration',
    category: 'Clubhouse & Fitness',
    estimatedCost: 48000
  },
  {
    id: 'eq_6',
    srNo: 6,
    equipment: 'Fire Motor / Fire Pump',
    detailsRequired: 'Last service date; vendor; next service due date; service report/invoice',
    lastServiceDate: '2026-03-15',
    amcWarranty: 'AMC Covered',
    vendor: 'Safeguard Fire Tech',
    nextDueDate: '2026-06-15',
    invoiceAvailable: 'Pending',
    remarks: 'Main jockey pump & diesel booster pump mock drill verification',
    category: 'Fire & Safety',
    estimatedCost: 44000
  },
  {
    id: 'eq_7',
    srNo: 7,
    equipment: 'Fire AMC',
    detailsRequired: 'AMC copy; AMC start & expiry date; vendor; services covered',
    lastServiceDate: '2026-04-01',
    amcWarranty: 'AMC Active',
    vendor: 'Shahabaz Fire Systems',
    nextDueDate: '2027-03-31',
    invoiceAvailable: 'Yes',
    remarks: 'Central fire alarm panel, smoke detectors, sprinklers & hydrant network',
    category: 'Fire & Safety',
    estimatedCost: 40024
  },
  {
    id: 'eq_8',
    srNo: 8,
    equipment: 'Fire Extinguishers',
    detailsRequired: 'Last inspection/service/refilling date; quantity; vendor; next due date; certificates/invoices',
    lastServiceDate: '2026-04-09',
    amcWarranty: 'Refilling Warranty',
    vendor: 'Ankush Fire Extingusher Enterprises',
    nextDueDate: '2027-04-08',
    invoiceAvailable: 'Yes',
    remarks: '48 ABC Dry Powder & CO2 cylinders refilled & pressure tested',
    category: 'Fire & Safety',
    estimatedCost: 32000
  },
  {
    id: 'eq_9',
    srNo: 9,
    equipment: 'Water Service / Water System',
    detailsRequired: 'Last service date; AMC details/copy; vendor; next service due date; service report/invoice; major maintenance/repair records',
    lastServiceDate: '2025-12-15',
    amcWarranty: 'AMC Active',
    vendor: 'Real Aqua Services',
    nextDueDate: '2026-06-15',
    invoiceAvailable: 'Yes',
    remarks: 'WTP/STP filter media backwash, raw water pumps & chemical dosing system',
    category: 'Water & Plumbing',
    estimatedCost: 336000
  },
  {
    id: 'eq_10',
    srNo: 10,
    equipment: 'Park Plus (Automated Gate & Security)',
    detailsRequired: 'Boom barrier sensor calibration, RFID FASTag reader SLA, gate software subscription, monthly invoices',
    lastServiceDate: '2026-04-01',
    amcWarranty: 'Quarterly Retainer',
    vendor: 'Park+ Technologies Pvt Ltd',
    nextDueDate: '2026-07-01',
    invoiceAvailable: 'Yes',
    remarks: 'Automated boom barriers, RFID reader sensors, and cloud software SLA (₹6,250/mo)',
    category: 'Gate & Security',
    estimatedCost: 75000
  }
];

export const DEFAULT_CONTRACTS = [
  {
    id: 'amc_parkplus',
    name: 'Park+ Automated Gate & FastTag',
    vendor: 'Park+ Technologies Pvt Ltd',
    contact: '+91 80 4718 1900',
    startDate: '2026-04-01',
    endDate: '2027-03-31',
    cost: 75000,
    paymentFrequency: 'Quarterly',
    notes: 'RFID FastTag Boom Barrier retainer ₹6,250/mo. SLA 99.4% uptime.',
    payments: [
      { id: 1, dueDate: '2026-04-10', amount: 18750, status: 'Paid', chequeOrTxn: 'NEFT-PKP88291' },
      { id: 2, dueDate: '2026-07-10', amount: 18750, status: 'Pending', chequeOrTxn: '' },
      { id: 3, dueDate: '2026-10-10', amount: 18750, status: 'Pending', chequeOrTxn: '' },
      { id: 4, dueDate: '2027-01-10', amount: 18750, status: 'Pending', chequeOrTxn: '' }
    ]
  },
  {
    id: 'gym_amc_101',
    name: 'Gym AMC & Fitness Equipment',
    vendor: 'Pralhad Ambekar',
    contact: '+91 98223 34455',
    startDate: '2026-01-01',
    endDate: '2026-12-31',
    cost: 48000,
    paymentFrequency: 'Quarterly',
    notes: 'Bi-monthly inspection, treadmill motor belt lubrication & calibration.',
    payments: [
      { id: 1, dueDate: '2026-01-05', amount: 12000, status: 'Paid', chequeOrTxn: 'CHQ-778102' },
      { id: 2, dueDate: '2026-04-05', amount: 12000, status: 'Paid', chequeOrTxn: 'CHQ-778219' },
      { id: 3, dueDate: '2026-07-05', amount: 12000, status: 'Pending', chequeOrTxn: '' },
      { id: 4, dueDate: '2026-10-05', amount: 12000, status: 'Pending', chequeOrTxn: '' }
    ]
  },
  {
    id: 'fire_amc_101',
    name: 'Fire Protection & Hydrant AMC',
    vendor: 'Shahabaz Fire Systems',
    contact: '+91 91580 99882',
    startDate: '2026-04-01',
    endDate: '2027-03-31',
    cost: 40024,
    paymentFrequency: 'Quarterly',
    notes: 'Hydrant system, wet risers, alarms, smoke sensors, and hose reel testing.',
    payments: [
      { id: 1, dueDate: '2026-04-10', amount: 10006, status: 'Paid', chequeOrTxn: 'CHQ-889104' },
      { id: 2, dueDate: '2026-07-10', amount: 10006, status: 'Pending', chequeOrTxn: '' },
      { id: 3, dueDate: '2026-10-10', amount: 10006, status: 'Pending', chequeOrTxn: '' },
      { id: 4, dueDate: '2027-01-10', amount: 10006, status: 'Pending', chequeOrTxn: '' }
    ]
  },
  {
    id: 'amc_dg_machine',
    name: 'DG Machine Comprehensive Maintenance',
    vendor: 'Kirloskar Care',
    contact: '+91 20 2721 2000',
    startDate: '2026-01-01',
    endDate: '2026-12-31',
    cost: 114000,
    paymentFrequency: 'Quarterly',
    notes: '380 kVA Sterling-Kirloskar generator routine B-check, lube & air filters.',
    payments: [
      { id: 1, dueDate: '2026-01-15', amount: 28500, status: 'Paid', chequeOrTxn: 'RTGS-KIR0029' },
      { id: 2, dueDate: '2026-04-15', amount: 28500, status: 'Paid', chequeOrTxn: 'RTGS-KIR0081' },
      { id: 3, dueDate: '2026-07-15', amount: 28500, status: 'Pending', chequeOrTxn: '' },
      { id: 4, dueDate: '2026-10-15', amount: 28500, status: 'Pending', chequeOrTxn: '' }
    ]
  },
  {
    id: 'amc_water_system',
    name: 'WTP / STP Plant & Pumps O&M',
    vendor: 'Real Aqua Services',
    contact: '+91 98220 11928',
    startDate: '2026-01-01',
    endDate: '2026-12-31',
    cost: 336000,
    paymentFrequency: 'Monthly',
    notes: 'Bi-weekly water lab test, sand/carbon filter media regeneration, chemical dosing.',
    payments: [
      { id: 1, dueDate: '2026-01-10', amount: 28000, status: 'Paid', chequeOrTxn: 'NEFT-AQU01' },
      { id: 2, dueDate: '2026-02-10', amount: 28000, status: 'Paid', chequeOrTxn: 'NEFT-AQU02' },
      { id: 3, dueDate: '2026-03-10', amount: 28000, status: 'Paid', chequeOrTxn: 'NEFT-AQU03' },
      { id: 4, dueDate: '2026-04-10', amount: 28000, status: 'Paid', chequeOrTxn: 'NEFT-AQU04' },
      { id: 5, dueDate: '2026-05-10', amount: 28000, status: 'Pending', chequeOrTxn: '' },
      { id: 6, dueDate: '2026-06-10', amount: 28000, status: 'Pending', chequeOrTxn: '' }
    ]
  }
];

export default function AmcTracker({ isAdmin = false }) {
  const [activeTab, setActiveTab] = useState('equipment'); // 'equipment' | 'contracts'
  const [equipmentList, setEquipmentList] = useState(DEFAULT_EQUIPMENT_RECORDS);
  const [contracts, setContracts] = useState(DEFAULT_CONTRACTS);
  
  const [isLoading, setIsLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState('idle');
  const [saveMsg, setSaveMsg] = useState('');
  
  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');

  // Equipment Modal Form State
  const [showEqModal, setShowEqModal] = useState(false);
  const [editingEq, setEditingEq] = useState(null);
  const [eqForm, setEqForm] = useState({
    srNo: '',
    equipment: '',
    detailsRequired: '',
    lastServiceDate: '',
    amcWarranty: 'AMC Active',
    vendor: '',
    nextDueDate: '',
    invoiceAvailable: 'Yes',
    remarks: '',
    category: 'General Maintenance'
  });

  // Contract Form states
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingContract, setEditingContract] = useState(null);
  const [formName, setFormName] = useState('');
  const [formVendor, setFormVendor] = useState('');
  const [formContact, setFormContact] = useState('');
  const [formCost, setFormCost] = useState('');
  const [formStartDate, setFormStartDate] = useState('');
  const [formEndDate, setFormEndDate] = useState('');
  const [formFrequency, setFormFrequency] = useState('Quarterly');
  const [formNotes, setFormNotes] = useState('');

  // Selected contract to view payment details
  const [activeContractId, setActiveContractId] = useState(null);
  const [editingPaymentId, setEditingPaymentId] = useState(null);
  const [paymentCheque, setPaymentCheque] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('Pending');

  const recordId = 'amc_contracts';

  // Load from Firestore
  useEffect(() => {
    let cancelled = false;
    setSaveStatus('idle');

    async function load() {
      setIsLoading(true);
      if (!isFirebaseConfigured || !db) {
        setEquipmentList(DEFAULT_EQUIPMENT_RECORDS);
        setContracts(DEFAULT_CONTRACTS);
        setIsLoading(false);
        return;
      }

      try {
        await ensureFirebaseSession();
        const snap = await getDoc(doc(db, 'amcTracking', recordId));
        if (!cancelled) {
          if (snap.exists()) {
            const data = snap.data();
            if (data.equipmentRecords && Array.isArray(data.equipmentRecords) && data.equipmentRecords.length > 0) {
              setEquipmentList(data.equipmentRecords);
            } else {
              setEquipmentList(DEFAULT_EQUIPMENT_RECORDS);
            }

            if (data.contracts && Array.isArray(data.contracts) && data.contracts.length > 0) {
              setContracts(data.contracts);
            } else {
              setContracts(DEFAULT_CONTRACTS);
            }
          } else {
            setEquipmentList(DEFAULT_EQUIPMENT_RECORDS);
            setContracts(DEFAULT_CONTRACTS);
          }
          setSaveMsg('Synced');
        }
      } catch (err) {
        console.error('AMC load error:', err);
        setEquipmentList(DEFAULT_EQUIPMENT_RECORDS);
        setContracts(DEFAULT_CONTRACTS);
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  // Save to Firestore
  const saveToFirebase = async (newEqList, newContractList) => {
    setSaveStatus('saving');
    const eqToSave = newEqList || equipmentList;
    const contractsToSave = newContractList || contracts;

    if (!isFirebaseConfigured || !db) {
      setSaveStatus('saved');
      setSaveMsg('Local Mode');
      return;
    }
    try {
      await ensureFirebaseSession();
      await setDoc(doc(db, 'amcTracking', recordId), {
        equipmentRecords: eqToSave,
        contracts: contractsToSave,
        updatedAt: serverTimestamp()
      }, { merge: true });
      setSaveStatus('saved');
      setSaveMsg('Saved ✓');
    } catch (err) {
      console.error('AMC save error:', err);
      setSaveStatus('error');
      setSaveMsg('Save Error');
    }
  };

  // ── Equipment Handlers ──────────────────────────────────────────────────
  const handleOpenAddEq = () => {
    setEditingEq(null);
    setEqForm({
      srNo: equipmentList.length + 1,
      equipment: '',
      detailsRequired: 'Last service date; AMC details/copy; vendor; next service due date; service report/invoice',
      lastServiceDate: '',
      amcWarranty: 'AMC Active',
      vendor: '',
      nextDueDate: '',
      invoiceAvailable: 'Yes',
      remarks: '',
      category: 'General Maintenance'
    });
    setShowEqModal(true);
  };

  const handleOpenEditEq = (item) => {
    setEditingEq(item);
    setEqForm({
      srNo: item.srNo,
      equipment: item.equipment,
      detailsRequired: item.detailsRequired || '',
      lastServiceDate: item.lastServiceDate || '',
      amcWarranty: item.amcWarranty || 'AMC Active',
      vendor: item.vendor || '',
      nextDueDate: item.nextDueDate || '',
      invoiceAvailable: item.invoiceAvailable || 'Yes',
      remarks: item.remarks || '',
      category: item.category || 'General Maintenance'
    });
    setShowEqModal(true);
  };

  const handleSaveEq = (e) => {
    e.preventDefault();
    if (!eqForm.equipment.trim() || !eqForm.vendor.trim()) {
      alert('Please provide Equipment name and Vendor name.');
      return;
    }

    let updated = [];
    if (editingEq) {
      updated = equipmentList.map(eq => eq.id === editingEq.id ? { ...eq, ...eqForm } : eq);
    } else {
      const newEntry = {
        id: `eq_${Date.now()}`,
        ...eqForm,
        srNo: Number(eqForm.srNo) || equipmentList.length + 1
      };
      updated = [...equipmentList, newEntry];
    }

    setEquipmentList(updated);
    saveToFirebase(updated, contracts);
    setShowEqModal(false);
  };

  const handleDeleteEq = (id) => {
    if (!window.confirm('Are you sure you want to delete this equipment service record?')) return;
    const updated = equipmentList.filter(eq => eq.id !== id);
    setEquipmentList(updated);
    saveToFirebase(updated, contracts);
  };

  // Export Equipment Table to Excel
  const handleExportXlsx = () => {
    try {
      const headers = [
        ['Sr. No.', 'Equipment / Service', 'Category', 'Records / Details Required', 'Last Service Date', 'AMC / Warranty', 'Vendor / Service Provider', 'Next Due Date', 'Invoice / Report Available', 'Remarks']
      ];
      const rows = equipmentList.map(item => [
        item.srNo,
        item.equipment,
        item.category,
        item.detailsRequired,
        item.lastServiceDate,
        item.amcWarranty,
        item.vendor,
        item.nextDueDate,
        item.invoiceAvailable,
        item.remarks
      ]);

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet([...headers, ...rows]);
      XLSX.utils.book_append_sheet(wb, ws, 'AMC & Equipment Register');
      XLSX.writeFile(wb, 'Majestique_Euriska_AMC_Equipment_Register.xlsx');
    } catch (err) {
      console.error('Export error:', err);
    }
  };

  // Helper for Installments
  const generateInstallments = (startDateStr, endDateStr, totalCost, frequency) => {
    const costVal = n(totalCost);
    const start = new Date(startDateStr);
    const end = new Date(endDateStr);
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || costVal <= 0) return [];

    let count = 1;
    let monthsStep = 12;
    if (frequency === 'Quarterly') { count = 4; monthsStep = 3; }
    else if (frequency === 'Half-Yearly') { count = 2; monthsStep = 6; }
    else if (frequency === 'Monthly') { count = 12; monthsStep = 1; }
    else if (frequency === 'Annually') { count = 1; monthsStep = 12; }

    const installmentAmt = Math.round(costVal / count);
    const installments = [];

    for (let i = 0; i < count; i++) {
      const dueDate = new Date(start);
      dueDate.setMonth(start.getMonth() + (i * monthsStep));
      const finalDate = dueDate > end ? end : dueDate;

      installments.push({
        id: i + 1,
        dueDate: finalDate.toISOString().split('T')[0],
        amount: installmentAmt,
        status: 'Pending',
        chequeOrTxn: ''
      });
    }
    return installments;
  };

  // Contract Handlers
  const handleSaveContract = (e) => {
    e.preventDefault();
    if (!formName || !formVendor || !formStartDate || !formEndDate || !formCost) {
      alert('Please fill out all required fields.');
      return;
    }

    let updatedList = [];
    if (editingContract) {
      updatedList = contracts.map(c => {
        if (c.id === editingContract.id) {
          const isStructureChanged =
            c.cost !== n(formCost) ||
            c.startDate !== formStartDate ||
            c.endDate !== formEndDate ||
            c.paymentFrequency !== formFrequency;

          const updatedPayments = isStructureChanged
            ? generateInstallments(formStartDate, formEndDate, formCost, formFrequency)
            : c.payments;

          return {
            ...c,
            name: formName,
            vendor: formVendor,
            contact: formContact,
            startDate: formStartDate,
            endDate: formEndDate,
            cost: n(formCost),
            paymentFrequency: formFrequency,
            notes: formNotes,
            payments: updatedPayments
          };
        }
        return c;
      });
    } else {
      const newId = `amc_${Date.now()}`;
      const initialPayments = generateInstallments(formStartDate, formEndDate, formCost, formFrequency);
      const newContract = {
        id: newId,
        name: formName,
        vendor: formVendor,
        contact: formContact,
        startDate: formStartDate,
        endDate: formEndDate,
        cost: n(formCost),
        paymentFrequency: formFrequency,
        notes: formNotes,
        payments: initialPayments
      };
      updatedList = [...contracts, newContract];
    }

    setContracts(updatedList);
    saveToFirebase(equipmentList, updatedList);
    resetForm();
  };

  const handleEditContractClick = (contract) => {
    setEditingContract(contract);
    setFormName(contract.name);
    setFormVendor(contract.vendor);
    setFormContact(contract.contact || '');
    setFormCost(contract.cost);
    setFormStartDate(contract.startDate);
    setFormEndDate(contract.endDate);
    setFormFrequency(contract.paymentFrequency);
    setFormNotes(contract.notes || '');
    setShowAddForm(true);
  };

  const handleDeleteContract = (contractId) => {
    if (!window.confirm('Are you sure you want to delete this AMC contract?')) return;
    const updated = contracts.filter(c => c.id !== contractId);
    setContracts(updated);
    saveToFirebase(equipmentList, updated);
    if (activeContractId === contractId) {
      setActiveContractId(null);
    }
  };

  const resetForm = () => {
    setEditingContract(null);
    setFormName('');
    setFormVendor('');
    setFormContact('');
    setFormCost('');
    setFormStartDate('');
    setFormEndDate('');
    setFormFrequency('Quarterly');
    setFormNotes('');
    setShowAddForm(false);
  };

  const handleEditPaymentClick = (payment) => {
    setEditingPaymentId(payment.id);
    setPaymentCheque(payment.chequeOrTxn || '');
    setPaymentStatus(payment.status);
  };

  const handleSavePayment = (contractId, paymentId) => {
    const updated = contracts.map(c => {
      if (c.id === contractId) {
        const updatedPayments = c.payments.map(p => {
          if (p.id === paymentId) {
            return {
              ...p,
              status: paymentStatus,
              chequeOrTxn: paymentCheque
            };
          }
          return p;
        });
        return {
          ...c,
          payments: updatedPayments
        };
      }
      return c;
    });

    setContracts(updated);
    saveToFirebase(equipmentList, updated);
    setEditingPaymentId(null);
  };

  // Filtered Equipment Records
  const filteredEquipment = useMemo(() => {
    let list = equipmentList;
    if (categoryFilter !== 'All') {
      list = list.filter(item => item.category === categoryFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(item =>
        item.equipment.toLowerCase().includes(q) ||
        item.vendor.toLowerCase().includes(q) ||
        (item.remarks && item.remarks.toLowerCase().includes(q)) ||
        (item.amcWarranty && item.amcWarranty.toLowerCase().includes(q))
      );
    }
    return list;
  }, [equipmentList, categoryFilter, searchQuery]);

  // Statistics
  const totalEquipmentCount = equipmentList.length;
  const verifiedInvoicesCount = equipmentList.filter(eq => eq.invoiceAvailable === 'Yes').length;
  const activeAmcCount = equipmentList.filter(eq => eq.amcWarranty !== 'No').length;
  const totalCommitment = contracts.reduce((sum, c) => sum + n(c.cost), 0);

  const categories = useMemo(() => {
    const set = new Set(equipmentList.map(e => e.category).filter(Boolean));
    return ['All', ...Array.from(set)];
  }, [equipmentList]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%' }}>
      {/* ── Top Header Banner with Glass Aesthetics ── */}
      <LiquidGlassCard
        variant="operations"
        style={{
          padding: '22px 26px',
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '16px'
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '6px' }}>
            <div style={{
              background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
              color: '#ffffff',
              padding: '9px',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 14px rgba(2,132,199,0.35)'
            }}>
              <Wrench size={22} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.45rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em' }}>
                AMC &amp; Equipment Maintenance Tracker
              </h2>
              <p style={{ margin: 0, fontSize: '0.84rem', color: '#64748b' }}>
                Service history, vendor warranties, invoice audit records, and quarterly payment retainers
              </p>
            </div>
          </div>
        </div>

        {/* View Switcher Pills & Sync Status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <div style={{
            display: 'flex',
            background: 'rgba(241,245,249,0.85)',
            borderRadius: '12px',
            padding: '4px',
            border: '1px solid #cbd5e1'
          }}>
            <button
              onClick={() => setActiveTab('equipment')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '7px 14px',
                borderRadius: '8px',
                fontSize: '0.82rem',
                fontWeight: activeTab === 'equipment' ? 700 : 500,
                border: 'none',
                background: activeTab === 'equipment' ? '#ffffff' : 'transparent',
                color: activeTab === 'equipment' ? '#0369a1' : '#64748b',
                cursor: 'pointer',
                boxShadow: activeTab === 'equipment' ? '0 2px 6px rgba(0,0,0,0.08)' : 'none',
                transition: 'all 0.15s ease'
              }}
            >
              <Wrench size={14} /> Equipment &amp; Service Register ({totalEquipmentCount})
            </button>
            <button
              onClick={() => setActiveTab('contracts')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '7px 14px',
                borderRadius: '8px',
                fontSize: '0.82rem',
                fontWeight: activeTab === 'contracts' ? 700 : 500,
                border: 'none',
                background: activeTab === 'contracts' ? '#ffffff' : 'transparent',
                color: activeTab === 'contracts' ? '#0369a1' : '#64748b',
                cursor: 'pointer',
                boxShadow: activeTab === 'contracts' ? '0 2px 6px rgba(0,0,0,0.08)' : 'none',
                transition: 'all 0.15s ease'
              }}
            >
              <Calendar size={14} /> Financial Contracts &amp; Schedules ({contracts.length})
            </button>
          </div>

          <span style={{
            fontSize: '0.8rem',
            color: saveStatus === 'error' ? '#ef4444' : '#0369a1',
            background: '#f0f9ff',
            padding: '6px 12px',
            borderRadius: '10px',
            fontWeight: 600,
            border: '1px solid #bae6fd'
          }}>
            {isLoading ? 'Syncing...' : saveMsg || 'Live Synced'}
          </span>
        </div>
      </LiquidGlassCard>

      {/* ── KPI Cards Grid ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
        <LiquidGlassCard variant="operations" style={{ padding: '18px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', color: '#64748b', letterSpacing: '0.04em' }}>
              Tracked Equipments
            </span>
            <div style={{ background: 'rgba(2,132,199,0.1)', color: '#0284c7', padding: '6px', borderRadius: '8px' }}>
              <Cpu size={16} />
            </div>
          </div>
          <h3 style={{ margin: '0 0 4px 0', fontSize: '1.9rem', fontWeight: 800, color: '#0f172a' }}>
            {totalEquipmentCount}
          </h3>
          <p style={{ margin: 0, fontSize: '0.8rem', color: '#0284c7', fontWeight: 600 }}>
            DG, Fire, Water, AC, Gym, Park+
          </p>
        </LiquidGlassCard>

        <LiquidGlassCard variant="society" style={{ padding: '18px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', color: '#64748b', letterSpacing: '0.04em' }}>
              Invoices Available
            </span>
            <div style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981', padding: '6px', borderRadius: '8px' }}>
              <FileCheck size={16} />
            </div>
          </div>
          <h3 style={{ margin: '0 0 4px 0', fontSize: '1.9rem', fontWeight: 800, color: '#0f172a' }}>
            {verifiedInvoicesCount} / {totalEquipmentCount}
          </h3>
          <p style={{ margin: 0, fontSize: '0.8rem', color: '#10b981', fontWeight: 600 }}>
            Verified Service Records &amp; Bills
          </p>
        </LiquidGlassCard>

        <LiquidGlassCard variant="finance" style={{ padding: '18px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', color: '#64748b', letterSpacing: '0.04em' }}>
              Annual Outlay
            </span>
            <div style={{ background: 'rgba(13,148,136,0.1)', color: '#0d9488', padding: '6px', borderRadius: '8px' }}>
              <ShieldCheck size={16} />
            </div>
          </div>
          <h3 style={{ margin: '0 0 4px 0', fontSize: '1.9rem', fontWeight: 800, color: '#0f172a' }}>
            {fmt(totalCommitment)}
          </h3>
          <p style={{ margin: 0, fontSize: '0.8rem', color: '#0d9488', fontWeight: 600 }}>
            Contracted Retainers &amp; AMCs
          </p>
        </LiquidGlassCard>

        <LiquidGlassCard variant="warning" style={{ padding: '18px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', color: '#64748b', letterSpacing: '0.04em' }}>
              Active AMCs / Warranties
            </span>
            <div style={{ background: 'rgba(245,158,11,0.1)', color: '#f59e0b', padding: '6px', borderRadius: '8px' }}>
              <Clock size={16} />
            </div>
          </div>
          <h3 style={{ margin: '0 0 4px 0', fontSize: '1.9rem', fontWeight: 800, color: '#0f172a' }}>
            {activeAmcCount} Services
          </h3>
          <p style={{ margin: 0, fontSize: '0.8rem', color: '#d97706', fontWeight: 600 }}>
            Active Vendor Coverage
          </p>
        </LiquidGlassCard>
      </div>

      {/* ── TAB 1: EQUIPMENT & SERVICE REGISTER ── */}
      {activeTab === 'equipment' && (
        <div style={{
          background: '#ffffff',
          borderRadius: '16px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column'
        }}>
          {/* Action Toolbar */}
          <div style={{
            padding: '16px 20px',
            borderBottom: '1px solid #f1f5f9',
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '12px',
            background: '#fafbfc'
          }}>
            {/* Search Input */}
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', minWidth: '280px', flex: 1 }}>
              <Search size={15} style={{ position: 'absolute', left: '12px', color: '#94a3b8' }} />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search equipment, vendor, or remarks…"
                style={{
                  width: '100%',
                  padding: '9px 12px 9px 36px',
                  borderRadius: '10px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.86rem',
                  outline: 'none',
                  background: '#ffffff',
                  color: '#0f172a'
                }}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  style={{ position: 'absolute', right: '10px', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Actions: Export Excel, Print, Add Record */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                onClick={handleExportXlsx}
                title="Download this table as Excel Spreadsheet"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '9px 14px',
                  borderRadius: '10px',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  border: '1px solid #cbd5e1',
                  background: '#ffffff',
                  color: '#1e293b',
                  cursor: 'pointer'
                }}
              >
                <Download size={14} color="#059669" /> Export Excel
              </button>

              <button
                onClick={() => window.print()}
                title="Print Service Register"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '9px 14px',
                  borderRadius: '10px',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  border: '1px solid #cbd5e1',
                  background: '#ffffff',
                  color: '#1e293b',
                  cursor: 'pointer'
                }}
              >
                <Printer size={14} /> Print
              </button>

              {isAdmin && (
                <button
                  onClick={handleOpenAddEq}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '9px 16px',
                    borderRadius: '10px',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    border: 'none',
                    background: '#0284c7',
                    color: '#ffffff',
                    cursor: 'pointer',
                    boxShadow: '0 2px 8px rgba(2,132,199,0.3)'
                  }}
                >
                  <Plus size={15} /> Add Equipment
                </button>
              )}
            </div>
          </div>

          {/* Category Filter Pills */}
          <div style={{
            padding: '10px 20px',
            borderBottom: '1px solid #f1f5f9',
            display: 'flex',
            gap: '8px',
            overflowX: 'auto',
            background: '#ffffff'
          }}>
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                style={{
                  padding: '5px 12px',
                  borderRadius: '20px',
                  fontSize: '0.76rem',
                  fontWeight: categoryFilter === cat ? 700 : 500,
                  border: categoryFilter === cat ? '1px solid #0284c7' : '1px solid #e2e8f0',
                  background: categoryFilter === cat ? '#f0f9ff' : '#ffffff',
                  color: categoryFilter === cat ? '#0369a1' : '#64748b',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.12s ease'
                }}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Equipment Table */}
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #cbd5e1' }}>
                  <th style={{ padding: '12px 14px', width: '50px', fontWeight: 700, color: '#475569', textAlign: 'center' }}>Sr.</th>
                  <th style={{ padding: '12px 14px', fontWeight: 700, color: '#475569', minWidth: '170px' }}>Equipment / Service</th>
                  <th style={{ padding: '12px 14px', fontWeight: 700, color: '#475569', minWidth: '160px' }}>Vendor / Provider</th>
                  <th style={{ padding: '12px 14px', fontWeight: 700, color: '#475569', minWidth: '120px' }}>Last Service</th>
                  <th style={{ padding: '12px 14px', fontWeight: 700, color: '#475569', minWidth: '130px' }}>AMC / Warranty</th>
                  <th style={{ padding: '12px 14px', fontWeight: 700, color: '#475569', minWidth: '120px' }}>Next Due</th>
                  <th style={{ padding: '12px 14px', fontWeight: 700, color: '#475569', minWidth: '120px' }}>Invoice / Report</th>
                  <th style={{ padding: '12px 14px', fontWeight: 700, color: '#475569', minWidth: '220px' }}>Remarks &amp; Audit Notes</th>
                  {isAdmin && <th style={{ padding: '12px 14px', fontWeight: 700, color: '#475569', textAlign: 'right', width: '90px' }}>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {filteredEquipment.length === 0 ? (
                  <tr>
                    <td colSpan={isAdmin ? 9 : 8} style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                      No matching equipment or service records found.
                    </td>
                  </tr>
                ) : (
                  filteredEquipment.map((item, idx) => {
                    const isWarranty = item.amcWarranty?.toLowerCase().includes('warranty');
                    const isNoAmc = item.amcWarranty?.toLowerCase() === 'no';
                    const hasRohanNote = item.remarks?.toLowerCase().includes('rohan');

                    return (
                      <tr
                        key={item.id}
                        style={{
                          borderBottom: '1px solid #f1f5f9',
                          background: idx % 2 === 0 ? '#ffffff' : '#fafafa',
                          transition: 'background 0.12s ease'
                        }}
                      >
                        <td style={{ padding: '14px', textAlign: 'center', fontWeight: 700, color: '#64748b' }}>
                          {item.srNo}
                        </td>
                        <td style={{ padding: '14px' }}>
                          <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.88rem' }}>
                            {item.equipment}
                          </div>
                          <span style={{ fontSize: '0.72rem', color: '#64748b', background: '#f1f5f9', padding: '2px 8px', borderRadius: '10px', marginTop: '3px', display: 'inline-block' }}>
                            {item.category}
                          </span>
                        </td>
                        <td style={{ padding: '14px' }}>
                          <span style={{ fontWeight: 600, color: '#1e293b' }}>
                            {item.vendor}
                          </span>
                        </td>
                        <td style={{ padding: '14px', fontFamily: 'monospace', fontSize: '0.82rem', color: '#334155' }}>
                          {item.lastServiceDate ? (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                              <Calendar size={13} color="#64748b" /> {item.lastServiceDate}
                            </span>
                          ) : (
                            <span style={{ color: '#94a3b8' }}>—</span>
                          )}
                        </td>
                        <td style={{ padding: '14px' }}>
                          <span style={{
                            padding: '3px 10px',
                            borderRadius: '12px',
                            fontSize: '0.76rem',
                            fontWeight: 700,
                            background: isNoAmc ? '#fee2e2' : isWarranty ? '#dbeafe' : '#dcfce7',
                            color: isNoAmc ? '#b91c1c' : isWarranty ? '#1d4ed8' : '#15803d'
                          }}>
                            {item.amcWarranty}
                          </span>
                        </td>
                        <td style={{ padding: '14px', fontFamily: 'monospace', fontSize: '0.82rem' }}>
                          {item.nextDueDate ? (
                            <span style={{ color: '#0369a1', fontWeight: 600 }}>
                              {item.nextDueDate}
                            </span>
                          ) : (
                            <span style={{ color: '#94a3b8' }}>—</span>
                          )}
                        </td>
                        <td style={{ padding: '14px' }}>
                          <span style={{
                            padding: '3px 9px',
                            borderRadius: '8px',
                            fontSize: '0.76rem',
                            fontWeight: 600,
                            background: item.invoiceAvailable === 'Yes' ? '#f0fdf4' : item.invoiceAvailable === 'In Progress' ? '#fef3c7' : '#f8fafc',
                            color: item.invoiceAvailable === 'Yes' ? '#166534' : item.invoiceAvailable === 'In Progress' ? '#b45309' : '#475569',
                            border: item.invoiceAvailable === 'Yes' ? '1px solid #bbf7d0' : '1px solid #e2e8f0'
                          }}>
                            {item.invoiceAvailable === 'Yes' ? '✓ Available' : item.invoiceAvailable}
                          </span>
                        </td>
                        <td style={{ padding: '14px' }}>
                          {item.remarks ? (
                            <div style={{
                              fontSize: '0.82rem',
                              color: hasRohanNote ? '#92400e' : '#475569',
                              background: hasRohanNote ? '#fef3c7' : 'transparent',
                              padding: hasRohanNote ? '4px 8px' : '0',
                              borderRadius: hasRohanNote ? '6px' : '0',
                              fontWeight: hasRohanNote ? 700 : 400,
                              lineHeight: 1.4
                            }}>
                              {hasRohanNote && '⚠️ '}
                              {item.remarks}
                            </div>
                          ) : (
                            <span style={{ color: '#94a3b8', fontSize: '0.78rem' }}>No specific remarks</span>
                          )}
                          {item.detailsRequired && (
                            <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '4px', fontStyle: 'italic' }}>
                              Req: {item.detailsRequired.slice(0, 50)}…
                            </div>
                          )}
                        </td>
                        {isAdmin && (
                          <td style={{ padding: '14px', textAlign: 'right' }}>
                            <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                              <button
                                onClick={() => handleOpenEditEq(item)}
                                title="Edit Record"
                                style={{
                                  background: '#f1f5f9',
                                  border: '1px solid #cbd5e1',
                                  borderRadius: '6px',
                                  padding: '5px 8px',
                                  cursor: 'pointer',
                                  color: '#334155'
                                }}
                              >
                                <Edit2 size={13} />
                              </button>
                              <button
                                onClick={() => handleDeleteEq(item.id)}
                                title="Delete Record"
                                style={{
                                  background: '#fee2e2',
                                  border: '1px solid #fca5a5',
                                  borderRadius: '6px',
                                  padding: '5px 8px',
                                  cursor: 'pointer',
                                  color: '#b91c1c'
                                }}
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Footer note */}
          <div style={{
            padding: '12px 20px',
            background: '#f8fafc',
            borderTop: '1px solid #e2e8f0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '0.76rem',
            color: '#64748b'
          }}>
            <span>Showing {filteredEquipment.length} of {totalEquipmentCount} service records</span>
            <span>Majestique Euriska Society Master AMC &amp; Equipment Register</span>
          </div>
        </div>
      )}

      {/* ── TAB 2: FINANCIAL AMC CONTRACTS & PAYMENT SCHEDULES ── */}
      {activeTab === 'contracts' && (
        <div style={{ display: 'grid', gridTemplateColumns: activeContractId ? '1.2fr 1fr' : '1fr', gap: '20px', transition: 'all 0.3s' }}>
          {/* Contracts Table */}
          <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fafbfc' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#0f172a' }}>Active AMC Contracts</h3>
                <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Select any contract to view or update installment payments</span>
              </div>
              {isAdmin && (
                <button
                  onClick={() => { setShowAddForm(!showAddForm); setEditingContract(null); }}
                  style={{
                    background: '#0284c7',
                    color: '#ffffff',
                    border: 'none',
                    padding: '8px 14px',
                    borderRadius: '8px',
                    fontWeight: 600,
                    fontSize: '0.82rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  {showAddForm ? '✕ Close' : '＋ Add Contract'}
                </button>
              )}
            </div>

            {/* Add/Edit Contract Panel */}
            {showAddForm && (
              <div style={{ background: '#f8fafc', padding: '20px', borderBottom: '1px solid #cbd5e1' }}>
                <form onSubmit={handleSaveContract} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569' }}>Contract Name *</label>
                    <input type="text" value={formName} onChange={e => setFormName(e.target.value)} required style={{ padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569' }}>Vendor Name *</label>
                    <input type="text" value={formVendor} onChange={e => setFormVendor(e.target.value)} required style={{ padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569' }}>Annual Value (₹) *</label>
                    <input type="number" value={formCost} onChange={e => setFormCost(e.target.value)} required style={{ padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569' }}>Billing Frequency</label>
                    <select value={formFrequency} onChange={e => setFormFrequency(e.target.value)} style={{ padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                      <option value="Quarterly">Quarterly</option>
                      <option value="Monthly">Monthly</option>
                      <option value="Half-Yearly">Half-Yearly</option>
                      <option value="Annually">Annually</option>
                    </select>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569' }}>Start Date *</label>
                    <input type="date" value={formStartDate} onChange={e => setFormStartDate(e.target.value)} required style={{ padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569' }}>End Date *</label>
                    <input type="date" value={formEndDate} onChange={e => setFormEndDate(e.target.value)} required style={{ padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
                  </div>
                  <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '6px' }}>
                    <button type="button" onClick={resetForm} style={{ padding: '7px 14px', borderRadius: '6px', border: '1px solid #cbd5e1', background: 'transparent' }}>Cancel</button>
                    <button type="submit" style={{ padding: '7px 18px', borderRadius: '6px', border: 'none', background: '#0284c7', color: '#ffffff', fontWeight: 600 }}>Save Contract</button>
                  </div>
                </form>
              </div>
            )}

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 700, color: '#64748b' }}>Contract &amp; Vendor</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 700, color: '#64748b' }}>Duration</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 700, color: '#64748b' }}>Annual Cost</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 700, color: '#64748b' }}>Cycle</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 700, color: '#64748b' }}>Status</th>
                    {isAdmin && <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 700, color: '#64748b' }}>Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {contracts.map(contract => {
                    const status = getContractStatus(contract.endDate);
                    const isSelected = activeContractId === contract.id;

                    return (
                      <tr
                        key={contract.id}
                        onClick={() => setActiveContractId(isSelected ? null : contract.id)}
                        style={{
                          borderBottom: '1px solid #f1f5f9',
                          cursor: 'pointer',
                          background: isSelected ? '#f0f9ff' : 'transparent',
                          transition: 'background 0.12s'
                        }}
                      >
                        <td style={{ padding: '14px 16px' }}>
                          <span style={{ fontWeight: 700, color: '#0f172a', display: 'block' }}>{contract.name}</span>
                          <span style={{ fontSize: '0.8rem', color: '#64748b' }}>{contract.vendor}</span>
                        </td>
                        <td style={{ padding: '14px 16px', fontSize: '0.82rem', color: '#334155' }}>
                          {contract.startDate} to {contract.endDate}
                        </td>
                        <td style={{ padding: '14px 16px', fontWeight: 700, color: '#0f172a' }}>
                          {fmt(contract.cost)}
                        </td>
                        <td style={{ padding: '14px 16px', fontSize: '0.8rem', color: '#475569' }}>
                          <span style={{ background: '#f1f5f9', padding: '3px 8px', borderRadius: '6px' }}>
                            {contract.paymentFrequency}
                          </span>
                        </td>
                        <td style={{ padding: '14px 16px' }}>
                          <span style={{
                            background: getStatusColor(status) + '15',
                            color: getStatusColor(status),
                            padding: '3px 10px',
                            borderRadius: '12px',
                            fontSize: '0.76rem',
                            fontWeight: 700
                          }}>
                            {status}
                          </span>
                        </td>
                        {isAdmin && (
                          <td style={{ padding: '14px 16px', textAlign: 'right' }} onClick={e => e.stopPropagation()}>
                            <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                              <button onClick={() => handleEditContractClick(contract)} style={{ padding: '4px 8px', background: 'transparent', border: '1px solid #cbd5e1', borderRadius: '4px', cursor: 'pointer' }}>
                                ✏️
                              </button>
                              <button onClick={() => handleDeleteContract(contract.id)} style={{ padding: '4px 8px', background: 'transparent', border: '1px solid #fee2e2', borderRadius: '4px', cursor: 'pointer' }}>
                                🗑️
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Payment Schedule Panel */}
          {activeContractId && (() => {
            const selected = contracts.find(c => c.id === activeContractId);
            if (!selected) return null;

            return (
              <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '20px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', alignSelf: 'start' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                  <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: '#0f172a' }}>
                    💳 Payments: {selected.name}
                  </h3>
                  <button onClick={() => setActiveContractId(null)} style={{ background: 'none', border: 'none', fontSize: '1.1rem', cursor: 'pointer', color: '#94a3b8' }}>
                    ✕
                  </button>
                </div>

                <p style={{ margin: '0 0 16px 0', fontSize: '0.85rem', color: '#64748b' }}>
                  Cycle: <strong>{selected.paymentFrequency}</strong> &bull; Total Value: <strong>{fmt(selected.cost)}</strong>
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {selected.payments?.map(p => {
                    const isEditing = editingPaymentId === p.id;

                    return (
                      <div
                        key={p.id}
                        style={{
                          border: '1px solid #e2e8f0',
                          borderRadius: '10px',
                          padding: '12px 14px',
                          background: p.status === 'Paid' ? '#f0fdf4' : '#ffffff'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: isEditing ? '10px' : '0' }}>
                          <div>
                            <span style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 700 }}>INSTALLMENT #{p.id}</span>
                            <div style={{ fontWeight: 700, fontSize: '1.05rem', color: '#0f172a' }}>{fmt(p.amount)}</div>
                            <span style={{ fontSize: '0.8rem', color: '#475569' }}>Due on {p.dueDate}</span>
                            {p.chequeOrTxn && (
                              <div style={{ fontSize: '0.76rem', color: '#059669', fontWeight: 600, marginTop: '2px' }}>
                                Ref: {p.chequeOrTxn}
                              </div>
                            )}
                          </div>

                          <div style={{ textAlign: 'right' }}>
                            <span style={{
                              background: p.status === 'Paid' ? '#dcfce7' : '#fef3c7',
                              color: p.status === 'Paid' ? '#15803d' : '#b45309',
                              padding: '3px 8px',
                              borderRadius: '6px',
                              fontSize: '0.76rem',
                              fontWeight: 700,
                              marginRight: '6px'
                            }}>
                              {p.status}
                            </span>
                            {isAdmin && !isEditing && (
                              <button
                                onClick={() => handleEditPaymentClick(p)}
                                style={{ background: '#f1f5f9', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.76rem' }}
                              >
                                Edit
                              </button>
                            )}
                          </div>
                        </div>

                        {isEditing && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderTop: '1px solid #e2e8f0', paddingTop: '10px' }}>
                            <div style={{ display: 'flex', gap: '8px' }}>
                              <select value={paymentStatus} onChange={e => setPaymentStatus(e.target.value)} style={{ padding: '6px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                                <option value="Pending">Pending</option>
                                <option value="Paid">Paid</option>
                                <option value="Overdue">Overdue</option>
                              </select>
                              <input
                                type="text"
                                value={paymentCheque}
                                onChange={e => setPaymentCheque(e.target.value)}
                                placeholder="Cheque / Txn Ref"
                                style={{ flex: 1, padding: '6px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                              />
                            </div>
                            <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                              <button onClick={() => setEditingPaymentId(null)} style={{ padding: '4px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', background: 'transparent' }}>Cancel</button>
                              <button onClick={() => handleSavePayment(selected.id, p.id)} style={{ padding: '4px 12px', borderRadius: '6px', border: 'none', background: '#0284c7', color: '#ffffff', fontWeight: 600 }}>Save</button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* ── MODAL: ADD / EDIT EQUIPMENT RECORD ── */}
      {showEqModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15,23,42,0.7)',
          backdropFilter: 'blur(6px)',
          zIndex: 10000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}
        onClick={() => setShowEqModal(false)}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '18px',
              maxWidth: '600px',
              width: '100%',
              padding: '26px',
              boxShadow: '0 25px 60px rgba(0,0,0,0.25)',
              maxHeight: '90vh',
              overflowY: 'auto'
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>
                {editingEq ? '📝 Edit Equipment Record' : '＋ Add Equipment & Service'}
              </h3>
              <button onClick={() => setShowEqModal(false)} style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: '#94a3b8' }}>
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEq} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#475569' }}>Sr. No.</label>
                  <input
                    type="number"
                    value={eqForm.srNo}
                    onChange={e => setEqForm({ ...eqForm, srNo: e.target.value })}
                    style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#475569' }}>Equipment / Service *</label>
                  <input
                    type="text"
                    value={eqForm.equipment}
                    onChange={e => setEqForm({ ...eqForm, equipment: e.target.value })}
                    placeholder="e.g. DG Battery, Fire Extinguishers"
                    required
                    style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#475569' }}>Vendor / Provider *</label>
                  <input
                    type="text"
                    value={eqForm.vendor}
                    onChange={e => setEqForm({ ...eqForm, vendor: e.target.value })}
                    placeholder="e.g. Kirloskar Care, Ghule Petrolium"
                    required
                    style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#475569' }}>Category</label>
                  <select
                    value={eqForm.category}
                    onChange={e => setEqForm({ ...eqForm, category: e.target.value })}
                    style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                  >
                    <option value="DG & Power">DG &amp; Power</option>
                    <option value="Fire & Safety">Fire &amp; Safety</option>
                    <option value="Clubhouse & HVAC">Clubhouse &amp; HVAC</option>
                    <option value="Clubhouse & Fitness">Clubhouse &amp; Fitness</option>
                    <option value="Water & Plumbing">Water &amp; Plumbing</option>
                    <option value="Gate & Security">Gate &amp; Security</option>
                    <option value="General Maintenance">General Maintenance</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#475569' }}>Last Service Date</label>
                  <input
                    type="date"
                    value={eqForm.lastServiceDate}
                    onChange={e => setEqForm({ ...eqForm, lastServiceDate: e.target.value })}
                    style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#475569' }}>Next Due Date</label>
                  <input
                    type="date"
                    value={eqForm.nextDueDate}
                    onChange={e => setEqForm({ ...eqForm, nextDueDate: e.target.value })}
                    style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#475569' }}>AMC / Warranty</label>
                  <input
                    type="text"
                    value={eqForm.amcWarranty}
                    onChange={e => setEqForm({ ...eqForm, amcWarranty: e.target.value })}
                    placeholder="e.g. AMC Active, Warranty, No"
                    style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#475569' }}>Invoice / Report Available</label>
                <select
                  value={eqForm.invoiceAvailable}
                  onChange={e => setEqForm({ ...eqForm, invoiceAvailable: e.target.value })}
                  style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                >
                  <option value="Yes">Yes (Available)</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Challan Available">Challan Available</option>
                  <option value="Pending">Pending</option>
                  <option value="No">No</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#475569' }}>Remarks</label>
                <textarea
                  rows={2}
                  value={eqForm.remarks}
                  onChange={e => setEqForm({ ...eqForm, remarks: e.target.value })}
                  placeholder="Notes, instructions or specific audit check remarks"
                  style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#475569' }}>Records / Details Required</label>
                <textarea
                  rows={2}
                  value={eqForm.detailsRequired}
                  onChange={e => setEqForm({ ...eqForm, detailsRequired: e.target.value })}
                  placeholder="Details to collect from vendor or site manager"
                  style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowEqModal(false)}
                  style={{ padding: '9px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#f1f5f9', fontWeight: 600, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ padding: '9px 20px', borderRadius: '8px', border: 'none', background: '#0284c7', color: '#ffffff', fontWeight: 700, cursor: 'pointer' }}
                >
                  Save Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
