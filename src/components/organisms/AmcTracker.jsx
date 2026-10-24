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
import './AmcTracker.css';


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
    <div className="amc-tracker-s1">
      {/* ── Top Header Banner with Glass Aesthetics ── */}
      <LiquidGlassCard
        variant="operations"
        className="amc-tracker-s2"
      >
        <div>
          <div className="amc-tracker-s3">
            <div className="amc-tracker-s4">
              <Wrench size={22} />
            </div>
            <div>
              <h2 className="amc-tracker-s5">
                AMC &amp; Equipment Maintenance Tracker
              </h2>
              <p className="amc-tracker-s6">
                Service history, vendor warranties, invoice audit records, and quarterly payment retainers
              </p>
            </div>
          </div>
        </div>

        {/* View Switcher Pills & Sync Status */}
        <div className="amc-tracker-s7">
          <div className="amc-tracker-s8">
            <button
              onClick={() => setActiveTab('equipment')}
              className="amc-tracker-s9" style={{ fontWeight: activeTab === 'equipment' ? 700 : 500, background: activeTab === 'equipment' ? '#ffffff' : 'transparent', color: activeTab === 'equipment' ? '#0369a1' : '#64748b', boxShadow: activeTab === 'equipment' ? '0 2px 6px rgba(0,0,0,0.08)' : 'none' }}
            >
              <Wrench size={14} /> Equipment &amp; Service Register ({totalEquipmentCount})
            </button>
            <button
              onClick={() => setActiveTab('contracts')}
              className="amc-tracker-s9" style={{ fontWeight: activeTab === 'contracts' ? 700 : 500, background: activeTab === 'contracts' ? '#ffffff' : 'transparent', color: activeTab === 'contracts' ? '#0369a1' : '#64748b', boxShadow: activeTab === 'contracts' ? '0 2px 6px rgba(0,0,0,0.08)' : 'none' }}
            >
              <Calendar size={14} /> Financial Contracts &amp; Schedules ({contracts.length})
            </button>
          </div>

          <span className="amc-tracker-s10" style={{ color: saveStatus === 'error' ? '#ef4444' : '#0369a1' }}>
            {isLoading ? 'Syncing...' : saveMsg || 'Live Synced'}
          </span>
        </div>
      </LiquidGlassCard>

      {/* ── KPI Cards Grid ── */}
      <div className="amc-tracker-s11">
        <LiquidGlassCard variant="operations" className="amc-tracker-s12">
          <div className="amc-tracker-s13">
            <span className="amc-tracker-s14">
              Tracked Equipments
            </span>
            <div className="amc-tracker-s15">
              <Cpu size={16} />
            </div>
          </div>
          <h3 className="amc-tracker-s16">
            {totalEquipmentCount}
          </h3>
          <p className="amc-tracker-s17">
            DG, Fire, Water, AC, Gym, Park+
          </p>
        </LiquidGlassCard>

        <LiquidGlassCard variant="society" className="amc-tracker-s12">
          <div className="amc-tracker-s13">
            <span className="amc-tracker-s14">
              Invoices Available
            </span>
            <div className="amc-tracker-s18">
              <FileCheck size={16} />
            </div>
          </div>
          <h3 className="amc-tracker-s16">
            {verifiedInvoicesCount} / {totalEquipmentCount}
          </h3>
          <p className="amc-tracker-s19">
            Verified Service Records &amp; Bills
          </p>
        </LiquidGlassCard>

        <LiquidGlassCard variant="finance" className="amc-tracker-s12">
          <div className="amc-tracker-s13">
            <span className="amc-tracker-s14">
              Annual Outlay
            </span>
            <div className="amc-tracker-s20">
              <ShieldCheck size={16} />
            </div>
          </div>
          <h3 className="amc-tracker-s16">
            {fmt(totalCommitment)}
          </h3>
          <p className="amc-tracker-s21">
            Contracted Retainers &amp; AMCs
          </p>
        </LiquidGlassCard>

        <LiquidGlassCard variant="warning" className="amc-tracker-s12">
          <div className="amc-tracker-s13">
            <span className="amc-tracker-s14">
              Active AMCs / Warranties
            </span>
            <div className="amc-tracker-s22">
              <Clock size={16} />
            </div>
          </div>
          <h3 className="amc-tracker-s16">
            {activeAmcCount} Services
          </h3>
          <p className="amc-tracker-s23">
            Active Vendor Coverage
          </p>
        </LiquidGlassCard>
      </div>

      {/* ── TAB 1: EQUIPMENT & SERVICE REGISTER ── */}
      {activeTab === 'equipment' && (
        <div className="amc-tracker-s24">
          {/* Action Toolbar */}
          <div className="amc-tracker-s25">
            {/* Search Input */}
            <div className="amc-tracker-s26">
              <Search size={15} className="amc-tracker-s27" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search equipment, vendor, or remarks…"
                className="amc-tracker-s28"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="amc-tracker-s29"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Actions: Export Excel, Print, Add Record */}
            <div className="amc-tracker-s30">
              <button
                onClick={handleExportXlsx}
                title="Download this table as Excel Spreadsheet"
                className="amc-tracker-s31"
              >
                <Download size={14} color="#059669" /> Export Excel
              </button>

              <button
                onClick={() => window.print()}
                title="Print Service Register"
                className="amc-tracker-s31"
              >
                <Printer size={14} /> Print
              </button>

              {isAdmin && (
                <button
                  onClick={handleOpenAddEq}
                  className="amc-tracker-s32"
                >
                  <Plus size={15} /> Add Equipment
                </button>
              )}
            </div>
          </div>

          {/* Category Filter Pills */}
          <div className="amc-tracker-s33">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className="amc-tracker-s34" style={{ fontWeight: categoryFilter === cat ? 700 : 500, border: categoryFilter === cat ? '1px solid #0284c7' : '1px solid #e2e8f0', background: categoryFilter === cat ? '#f0f9ff' : '#ffffff', color: categoryFilter === cat ? '#0369a1' : '#64748b' }}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Equipment Table */}
          <div className="amc-tracker-s35">
            <table className="amc-tracker-s36">
              <thead>
                <tr className="amc-tracker-s37">
                  <th className="amc-tracker-s38">Sr.</th>
                  <th className="amc-tracker-s39">Equipment / Service</th>
                  <th className="amc-tracker-s40">Vendor / Provider</th>
                  <th className="amc-tracker-s41">Last Service</th>
                  <th className="amc-tracker-s42">AMC / Warranty</th>
                  <th className="amc-tracker-s41">Next Due</th>
                  <th className="amc-tracker-s41">Invoice / Report</th>
                  <th className="amc-tracker-s43">Remarks &amp; Audit Notes</th>
                  {isAdmin && <th className="amc-tracker-s44">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {filteredEquipment.length === 0 ? (
                  <tr>
                    <td colSpan={isAdmin ? 9 : 8} className="amc-tracker-s45">
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
                        className="amc-tracker-s46" style={{ background: idx % 2 === 0 ? '#ffffff' : '#fafafa' }}
                      >
                        <td className="amc-tracker-s47">
                          {item.srNo}
                        </td>
                        <td className="amc-tracker-s48">
                          <div className="amc-tracker-s49">
                            {item.equipment}
                          </div>
                          <span className="amc-tracker-s50">
                            {item.category}
                          </span>
                        </td>
                        <td className="amc-tracker-s48">
                          <span className="amc-tracker-s51">
                            {item.vendor}
                          </span>
                        </td>
                        <td className="amc-tracker-s52">
                          {item.lastServiceDate ? (
                            <span className="amc-tracker-s53">
                              <Calendar size={13} color="#64748b" /> {item.lastServiceDate}
                            </span>
                          ) : (
                            <span className="amc-tracker-s54">—</span>
                          )}
                        </td>
                        <td className="amc-tracker-s48">
                          <span className="amc-tracker-s55" style={{ background: isNoAmc ? '#fee2e2' : isWarranty ? '#dbeafe' : '#dcfce7', color: isNoAmc ? '#b91c1c' : isWarranty ? '#1d4ed8' : '#15803d' }}>
                            {item.amcWarranty}
                          </span>
                        </td>
                        <td className="amc-tracker-s56">
                          {item.nextDueDate ? (
                            <span className="amc-tracker-s57">
                              {item.nextDueDate}
                            </span>
                          ) : (
                            <span className="amc-tracker-s54">—</span>
                          )}
                        </td>
                        <td className="amc-tracker-s48">
                          <span className="amc-tracker-s58" style={{ background: item.invoiceAvailable === 'Yes' ? '#f0fdf4' : item.invoiceAvailable === 'In Progress' ? '#fef3c7' : '#f8fafc', color: item.invoiceAvailable === 'Yes' ? '#166534' : item.invoiceAvailable === 'In Progress' ? '#b45309' : '#475569', border: item.invoiceAvailable === 'Yes' ? '1px solid #bbf7d0' : '1px solid #e2e8f0' }}>
                            {item.invoiceAvailable === 'Yes' ? '✓ Available' : item.invoiceAvailable}
                          </span>
                        </td>
                        <td className="amc-tracker-s48">
                          {item.remarks ? (
                            <div className="amc-tracker-s59" style={{ color: hasRohanNote ? '#92400e' : '#475569', background: hasRohanNote ? '#fef3c7' : 'transparent', padding: hasRohanNote ? '4px 8px' : '0', borderRadius: hasRohanNote ? '6px' : '0', fontWeight: hasRohanNote ? 700 : 400 }}>
                              {hasRohanNote && '⚠️ '}
                              {item.remarks}
                            </div>
                          ) : (
                            <span className="amc-tracker-s60">No specific remarks</span>
                          )}
                          {item.detailsRequired && (
                            <div className="amc-tracker-s61">
                              Req: {item.detailsRequired.slice(0, 50)}…
                            </div>
                          )}
                        </td>
                        {isAdmin && (
                          <td className="amc-tracker-s62">
                            <div className="amc-tracker-s63">
                              <button
                                onClick={() => handleOpenEditEq(item)}
                                title="Edit Record"
                                className="amc-tracker-s64"
                              >
                                <Edit2 size={13} />
                              </button>
                              <button
                                onClick={() => handleDeleteEq(item.id)}
                                title="Delete Record"
                                className="amc-tracker-s65"
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
          <div className="amc-tracker-s66">
            <span>Showing {filteredEquipment.length} of {totalEquipmentCount} service records</span>
            <span>Majestique Euriska Society Master AMC &amp; Equipment Register</span>
          </div>
        </div>
      )}

      {/* ── TAB 2: FINANCIAL AMC CONTRACTS & PAYMENT SCHEDULES ── */}
      {activeTab === 'contracts' && (
        <div className="amc-tracker-s67" style={{ gridTemplateColumns: activeContractId ? '1.2fr 1fr' : '1fr' }}>
          {/* Contracts Table */}
          <div className="amc-tracker-s68">
            <div className="amc-tracker-s69">
              <div>
                <h3 className="amc-tracker-s70">Active AMC Contracts</h3>
                <span className="amc-tracker-s71">Select any contract to view or update installment payments</span>
              </div>
              {isAdmin && (
                <button
                  onClick={() => { setShowAddForm(!showAddForm); setEditingContract(null); }}
                  className="amc-tracker-s72"
                >
                  {showAddForm ? '✕ Close' : '＋ Add Contract'}
                </button>
              )}
            </div>

            {/* Add/Edit Contract Panel */}
            {showAddForm && (
              <div className="amc-tracker-s73">
                <form onSubmit={handleSaveContract} className="amc-tracker-s74">
                  <div className="amc-tracker-s75">
                    <label className="amc-tracker-s76">Contract Name *</label>
                    <input type="text" value={formName} onChange={e => setFormName(e.target.value)} required className="amc-tracker-s77" />
                  </div>
                  <div className="amc-tracker-s75">
                    <label className="amc-tracker-s76">Vendor Name *</label>
                    <input type="text" value={formVendor} onChange={e => setFormVendor(e.target.value)} required className="amc-tracker-s77" />
                  </div>
                  <div className="amc-tracker-s75">
                    <label className="amc-tracker-s76">Annual Value (₹) *</label>
                    <input type="number" value={formCost} onChange={e => setFormCost(e.target.value)} required className="amc-tracker-s77" />
                  </div>
                  <div className="amc-tracker-s75">
                    <label className="amc-tracker-s76">Billing Frequency</label>
                    <select value={formFrequency} onChange={e => setFormFrequency(e.target.value)} className="amc-tracker-s77">
                      <option value="Quarterly">Quarterly</option>
                      <option value="Monthly">Monthly</option>
                      <option value="Half-Yearly">Half-Yearly</option>
                      <option value="Annually">Annually</option>
                    </select>
                  </div>
                  <div className="amc-tracker-s75">
                    <label className="amc-tracker-s76">Start Date *</label>
                    <input type="date" value={formStartDate} onChange={e => setFormStartDate(e.target.value)} required className="amc-tracker-s77" />
                  </div>
                  <div className="amc-tracker-s75">
                    <label className="amc-tracker-s76">End Date *</label>
                    <input type="date" value={formEndDate} onChange={e => setFormEndDate(e.target.value)} required className="amc-tracker-s77" />
                  </div>
                  <div className="amc-tracker-s78">
                    <button type="button" onClick={resetForm} className="amc-tracker-s79">Cancel</button>
                    <button type="submit" className="amc-tracker-s80">Save Contract</button>
                  </div>
                </form>
              </div>
            )}

            <div className="amc-tracker-s35">
              <table className="amc-tracker-s81">
                <thead>
                  <tr className="amc-tracker-s82">
                    <th className="amc-tracker-s83">Contract &amp; Vendor</th>
                    <th className="amc-tracker-s83">Duration</th>
                    <th className="amc-tracker-s83">Annual Cost</th>
                    <th className="amc-tracker-s83">Cycle</th>
                    <th className="amc-tracker-s83">Status</th>
                    {isAdmin && <th className="amc-tracker-s84">Actions</th>}
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
                        className="amc-tracker-s85" style={{ background: isSelected ? '#f0f9ff' : 'transparent' }}
                      >
                        <td className="amc-tracker-s86">
                          <span className="amc-tracker-s87">{contract.name}</span>
                          <span className="amc-tracker-s71">{contract.vendor}</span>
                        </td>
                        <td className="amc-tracker-s88">
                          {contract.startDate} to {contract.endDate}
                        </td>
                        <td className="amc-tracker-s89">
                          {fmt(contract.cost)}
                        </td>
                        <td className="amc-tracker-s90">
                          <span className="amc-tracker-s91">
                            {contract.paymentFrequency}
                          </span>
                        </td>
                        <td className="amc-tracker-s86">
                          <span className="amc-tracker-s55" style={{ background: getStatusColor(status) + '15', color: getStatusColor(status) }}>
                            {status}
                          </span>
                        </td>
                        {isAdmin && (
                          <td className="amc-tracker-s92" onClick={e => e.stopPropagation()}>
                            <div className="amc-tracker-s63">
                              <button onClick={() => handleEditContractClick(contract)} className="amc-tracker-s93">
                                ✏️
                              </button>
                              <button onClick={() => handleDeleteContract(contract.id)} className="amc-tracker-s94">
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
              <div className="amc-tracker-s95">
                <div className="amc-tracker-s96">
                  <h3 className="amc-tracker-s97">
                    💳 Payments: {selected.name}
                  </h3>
                  <button onClick={() => setActiveContractId(null)} className="amc-tracker-s98">
                    ✕
                  </button>
                </div>

                <p className="amc-tracker-s99">
                  Cycle: <strong>{selected.paymentFrequency}</strong> &bull; Total Value: <strong>{fmt(selected.cost)}</strong>
                </p>

                <div className="amc-tracker-s100">
                  {selected.payments?.map(p => {
                    const isEditing = editingPaymentId === p.id;

                    return (
                      <div
                        key={p.id}
                        className="amc-tracker-s101" style={{ background: p.status === 'Paid' ? '#f0fdf4' : '#ffffff' }}
                      >
                        <div className="amc-tracker-s102" style={{ marginBottom: isEditing ? '10px' : '0' }}>
                          <div>
                            <span className="amc-tracker-s103">INSTALLMENT #{p.id}</span>
                            <div className="amc-tracker-s104">{fmt(p.amount)}</div>
                            <span className="amc-tracker-s105">Due on {p.dueDate}</span>
                            {p.chequeOrTxn && (
                              <div className="amc-tracker-s106">
                                Ref: {p.chequeOrTxn}
                              </div>
                            )}
                          </div>

                          <div className="amc-tracker-s107">
                            <span className="amc-tracker-s108" style={{ background: p.status === 'Paid' ? '#dcfce7' : '#fef3c7', color: p.status === 'Paid' ? '#15803d' : '#b45309' }}>
                              {p.status}
                            </span>
                            {isAdmin && !isEditing && (
                              <button
                                onClick={() => handleEditPaymentClick(p)}
                                className="amc-tracker-s109"
                              >
                                Edit
                              </button>
                            )}
                          </div>
                        </div>

                        {isEditing && (
                          <div className="amc-tracker-s110">
                            <div className="amc-tracker-s111">
                              <select value={paymentStatus} onChange={e => setPaymentStatus(e.target.value)} className="amc-tracker-s112">
                                <option value="Pending">Pending</option>
                                <option value="Paid">Paid</option>
                                <option value="Overdue">Overdue</option>
                              </select>
                              <input
                                type="text"
                                value={paymentCheque}
                                onChange={e => setPaymentCheque(e.target.value)}
                                placeholder="Cheque / Txn Ref"
                                className="amc-tracker-s113"
                              />
                            </div>
                            <div className="amc-tracker-s63">
                              <button onClick={() => setEditingPaymentId(null)} className="amc-tracker-s114">Cancel</button>
                              <button onClick={() => handleSavePayment(selected.id, p.id)} className="amc-tracker-s115">Save</button>
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
        <div className="amc-tracker-s116"
        onClick={() => setShowEqModal(false)}
        >
          <div
            className="amc-tracker-s117"
            onClick={e => e.stopPropagation()}
          >
            <div className="amc-tracker-s118">
              <h3 className="amc-tracker-s119">
                {editingEq ? '📝 Edit Equipment Record' : '＋ Add Equipment & Service'}
              </h3>
              <button onClick={() => setShowEqModal(false)} className="amc-tracker-s120">
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEq} className="amc-tracker-s121">
              <div className="amc-tracker-s122">
                <div>
                  <label className="amc-tracker-s123">Sr. No.</label>
                  <input
                    type="number"
                    value={eqForm.srNo}
                    onChange={e => setEqForm({ ...eqForm, srNo: e.target.value })}
                    className="amc-tracker-s124"
                  />
                </div>
                <div>
                  <label className="amc-tracker-s123">Equipment / Service *</label>
                  <input
                    type="text"
                    value={eqForm.equipment}
                    onChange={e => setEqForm({ ...eqForm, equipment: e.target.value })}
                    placeholder="e.g. DG Battery, Fire Extinguishers"
                    required
                    className="amc-tracker-s124"
                  />
                </div>
              </div>

              <div className="amc-tracker-s125">
                <div>
                  <label className="amc-tracker-s123">Vendor / Provider *</label>
                  <input
                    type="text"
                    value={eqForm.vendor}
                    onChange={e => setEqForm({ ...eqForm, vendor: e.target.value })}
                    placeholder="e.g. Kirloskar Care, Ghule Petrolium"
                    required
                    className="amc-tracker-s124"
                  />
                </div>
                <div>
                  <label className="amc-tracker-s123">Category</label>
                  <select
                    value={eqForm.category}
                    onChange={e => setEqForm({ ...eqForm, category: e.target.value })}
                    className="amc-tracker-s124"
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

              <div className="amc-tracker-s126">
                <div>
                  <label className="amc-tracker-s123">Last Service Date</label>
                  <input
                    type="date"
                    value={eqForm.lastServiceDate}
                    onChange={e => setEqForm({ ...eqForm, lastServiceDate: e.target.value })}
                    className="amc-tracker-s124"
                  />
                </div>
                <div>
                  <label className="amc-tracker-s123">Next Due Date</label>
                  <input
                    type="date"
                    value={eqForm.nextDueDate}
                    onChange={e => setEqForm({ ...eqForm, nextDueDate: e.target.value })}
                    className="amc-tracker-s124"
                  />
                </div>
                <div>
                  <label className="amc-tracker-s123">AMC / Warranty</label>
                  <input
                    type="text"
                    value={eqForm.amcWarranty}
                    onChange={e => setEqForm({ ...eqForm, amcWarranty: e.target.value })}
                    placeholder="e.g. AMC Active, Warranty, No"
                    className="amc-tracker-s124"
                  />
                </div>
              </div>

              <div>
                <label className="amc-tracker-s123">Invoice / Report Available</label>
                <select
                  value={eqForm.invoiceAvailable}
                  onChange={e => setEqForm({ ...eqForm, invoiceAvailable: e.target.value })}
                  className="amc-tracker-s124"
                >
                  <option value="Yes">Yes (Available)</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Challan Available">Challan Available</option>
                  <option value="Pending">Pending</option>
                  <option value="No">No</option>
                </select>
              </div>

              <div>
                <label className="amc-tracker-s123">Remarks</label>
                <textarea
                  rows={2}
                  value={eqForm.remarks}
                  onChange={e => setEqForm({ ...eqForm, remarks: e.target.value })}
                  placeholder="Notes, instructions or specific audit check remarks"
                  className="amc-tracker-s124"
                />
              </div>

              <div>
                <label className="amc-tracker-s123">Records / Details Required</label>
                <textarea
                  rows={2}
                  value={eqForm.detailsRequired}
                  onChange={e => setEqForm({ ...eqForm, detailsRequired: e.target.value })}
                  placeholder="Details to collect from vendor or site manager"
                  className="amc-tracker-s124"
                />
              </div>

              <div className="amc-tracker-s127">
                <button
                  type="button"
                  onClick={() => setShowEqModal(false)}
                  className="amc-tracker-s128"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="amc-tracker-s129"
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
