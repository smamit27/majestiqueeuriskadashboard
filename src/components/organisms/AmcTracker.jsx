import React, { useState, useEffect, useCallback, useRef } from 'react';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { db, ensureFirebaseSession, isFirebaseConfigured } from '../../firebase.js';

const n = (v) => parseFloat(v) || 0;
const fmt = (v) => Number(v).toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });

function getDaysRemaining(endDateStr) {
  if (!endDateStr) return 0;
  const diffTime = new Date(endDateStr) - new Date();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

function getContractStatus(endDateStr) {
  const days = getDaysRemaining(endDateStr);
  if (days < 0) return 'Expired';
  if (days <= 30) return 'Expiring Soon';
  return 'Active';
}

function getStatusColor(status) {
  switch (status) {
    case 'Active': return '#10b981'; // Green
    case 'Expiring Soon': return '#f59e0b'; // Amber
    case 'Expired': return '#ef4444'; // Red
    default: return '#6b7280';
  }
}

export default function AmcTracker({ isAdmin = false }) {
  const [contracts, setContracts] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState('idle');
  const [saveMsg, setSaveMsg] = useState('');
  
  // Form states
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

  const isLoadedRef = useRef(false);
  const recordId = 'amc_contracts';

  // Seed data
  const defaultContracts = [
    {
      id: 'gym_amc_101',
      name: 'Gym AMC',
      vendor: 'FitLine Gym Equipments & Services',
      contact: '+91 98223 34455',
      startDate: '2026-01-01',
      endDate: '2026-12-31',
      cost: 48000,
      paymentFrequency: 'Quarterly',
      notes: 'Includes bi-monthly inspection and treadmill calibration.',
      payments: [
        { id: 1, dueDate: '2026-01-05', amount: 12000, status: 'Paid', chequeOrTxn: 'CHQ-778102' },
        { id: 2, dueDate: '2026-04-05', amount: 12000, status: 'Paid', chequeOrTxn: 'CHQ-778219' },
        { id: 3, dueDate: '2026-07-05', amount: 12000, status: 'Pending', chequeOrTxn: '' },
        { id: 4, dueDate: '2026-10-05', amount: 12000, status: 'Pending', chequeOrTxn: '' }
      ]
    },
    {
      id: 'fire_amc_101',
      name: 'Fire AMC',
      vendor: 'Shahabaz Fire Systems',
      contact: '+91 91580 99882',
      startDate: '2026-04-01',
      endDate: '2027-03-31',
      cost: 40024,
      paymentFrequency: 'Quarterly',
      notes: 'Fire hydrant system, alarms, and fire extinguishers maintenance.',
      payments: [
        { id: 1, dueDate: '2026-04-10', amount: 10006, status: 'Paid', chequeOrTxn: 'CHQ-889104' },
        { id: 2, dueDate: '2026-07-10', amount: 10006, status: 'Pending', chequeOrTxn: '' },
        { id: 3, dueDate: '2026-10-10', amount: 10006, status: 'Pending', chequeOrTxn: '' },
        { id: 4, dueDate: '2027-01-10', amount: 10006, status: 'Pending', chequeOrTxn: '' }
      ]
    }
  ];

  // Load from Firestore
  useEffect(() => {
    let cancelled = false;
    isLoadedRef.current = false;
    setSaveStatus('idle');
    setSaveMsg('');

    async function load() {
      setIsLoading(true);
      if (!isFirebaseConfigured || !db) {
        setContracts(defaultContracts);
        setIsLoading(false);
        isLoadedRef.current = true;
        return;
      }

      try {
        await ensureFirebaseSession();
        const snap = await getDoc(doc(db, 'amcTracking', recordId));
        if (!cancelled) {
          if (snap.exists() && snap.data().contracts) {
            setContracts(snap.data().contracts);
          } else {
            setContracts(defaultContracts);
          }
          setSaveMsg('Synced');
        }
      } catch (err) {
        console.error('AMC load error:', err);
        setContracts(defaultContracts);
      } finally {
        if (!cancelled) {
          setIsLoading(false);
          isLoadedRef.current = true;
        }
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  // Save to Firestore
  const saveToFirebase = async (data) => {
    setSaveStatus('saving');
    if (!isFirebaseConfigured || !db) {
      setSaveStatus('saved');
      setSaveMsg('Local Mode');
      return;
    }
    try {
      await ensureFirebaseSession();
      await setDoc(doc(db, 'amcTracking', recordId), {
        contracts: data,
        updatedAt: serverTimestamp()
      }, { merge: true });
      setSaveStatus('saved');
      setSaveMsg('Saved ✓');
    } catch (err) {
      console.error('AMC save error:', err);
      setSaveStatus('error');
      setSaveMsg('Failed to Save');
    }
  };

  // Helper to generate payments automatically based on frequency
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
      // Cap at end date if it spills over
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

  // Create or Update Contract
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
          // If cost or dates or frequency changed, optionally regenerate payments
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
    saveToFirebase(updatedList);
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
    saveToFirebase(updated);
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

  // Payment Tracking updates
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
    saveToFirebase(updated);
    setEditingPaymentId(null);
  };

  // Stats calculation
  const totalCommitment = contracts.reduce((sum, c) => sum + n(c.cost), 0);
  const activeContractsCount = contracts.filter(c => getContractStatus(c.endDate) !== 'Expired').length;
  
  // Calculate upcoming payments in the next 30 days
  const today = new Date();
  const thirtyDaysLater = new Date();
  thirtyDaysLater.setDate(today.getDate() + 30);
  
  let upcomingPaymentsCount = 0;
  contracts.forEach(c => {
    c.payments?.forEach(p => {
      if (p.status !== 'Paid') {
        const d = new Date(p.dueDate);
        if (d >= today && d <= thirtyDaysLater) {
          upcomingPaymentsCount++;
        }
      }
    });
  });

  const expiringSoonCount = contracts.filter(c => {
    const days = getDaysRemaining(c.endDate);
    return days >= 0 && days <= 30;
  }).length;

  return (
    <div className="amc-tracker-container" style={{ padding: '4px' }}>
      {/* Header bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.8rem', fontWeight: 700, color: '#1e293b' }}>AMC Management</h2>
          <p style={{ margin: '4px 0 0 0', color: '#64748b' }}>Track Annual Maintenance Contracts, schedules, and quarterly payments</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '0.85rem', color: saveStatus === 'error' ? '#ef4444' : '#64748b', background: '#f1f5f9', padding: '6px 12px', borderRadius: '20px', fontWeight: 500 }}>
            {isLoading ? 'Syncing...' : saveMsg || 'Synced'}
          </span>
          {isAdmin && (
            <button 
              onClick={() => { setShowAddForm(!showAddForm); setEditingContract(null); }}
              className="button-primary"
              style={{
                background: '#1e3a8a',
                color: 'white',
                border: 'none',
                padding: '10px 20px',
                borderRadius: '8px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                width: 'auto'
              }}
            >
              {showAddForm ? '✕ Close Form' : '＋ Add AMC Contract'}
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div style={{ background: 'white', padding: '20px', borderRadius: '12px', border: '1px solid rgba(0,0,0,0.05)', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <span style={{ color: '#64748b', fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Active AMCs</span>
          <h3 style={{ margin: '8px 0 0 0', fontSize: '2rem', fontWeight: 700, color: '#1e293b' }}>{activeContractsCount}</h3>
          <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#10b981' }}>Currently Operational</p>
        </div>
        <div style={{ background: 'white', padding: '20px', borderRadius: '12px', border: '1px solid rgba(0,0,0,0.05)', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <span style={{ color: '#64748b', fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Commitment</span>
          <h3 style={{ margin: '8px 0 0 0', fontSize: '2rem', fontWeight: 700, color: '#1e293b' }}>{fmt(totalCommitment)}</h3>
          <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#64748b' }}>Annual Budget Outlay</p>
        </div>
        <div style={{ background: 'white', padding: '20px', borderRadius: '12px', border: '1px solid rgba(0,0,0,0.05)', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <span style={{ color: '#64748b', fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Upcoming Payments</span>
          <h3 style={{ margin: '8px 0 0 0', fontSize: '2rem', fontWeight: 700, color: '#1e293b' }}>{upcomingPaymentsCount}</h3>
          <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: upcomingPaymentsCount > 0 ? '#f59e0b' : '#64748b' }}>Due within next 30 days</p>
        </div>
        <div style={{ background: 'white', padding: '20px', borderRadius: '12px', border: '1px solid rgba(0,0,0,0.05)', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <span style={{ color: '#64748b', fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Renewals Pending</span>
          <h3 style={{ margin: '8px 0 0 0', fontSize: '2rem', fontWeight: 700, color: expiringSoonCount > 0 ? '#ef4444' : '#1e293b' }}>{expiringSoonCount}</h3>
          <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: expiringSoonCount > 0 ? '#ef4444' : '#64748b' }}>Expiring within 30 days</p>
        </div>
      </div>

      {/* Add / Edit Form Panel */}
      {showAddForm && (
        <div style={{ background: 'white', padding: '24px', borderRadius: '12px', border: '1px solid rgba(0,0,0,0.05)', marginBottom: '24px', boxShadow: '0 4px 6px rgba(0,0,0,0.02)' }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '1.2rem', fontWeight: 700, color: '#1e293b' }}>
            {editingContract ? '📝 Edit AMC Contract' : '＋ Add New AMC Contract'}
          </h3>
          <form onSubmit={handleSaveContract} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#475569' }}>Contract Name *</label>
              <input 
                type="text" 
                value={formName} 
                onChange={e => setFormName(e.target.value)} 
                placeholder="e.g. Gym AMC, Fire AMC"
                style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                required 
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#475569' }}>Vendor Name *</label>
              <input 
                type="text" 
                value={formVendor} 
                onChange={e => setFormVendor(e.target.value)} 
                placeholder="e.g. Shahabaz Fire Systems"
                style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                required 
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#475569' }}>Vendor Contact Details</label>
              <input 
                type="text" 
                value={formContact} 
                onChange={e => setFormContact(e.target.value)} 
                placeholder="e.g. +91 99999 88888 or email"
                style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#475569' }}>Total Annual/Contract Cost (INR) *</label>
              <input 
                type="number" 
                value={formCost} 
                onChange={e => setFormCost(e.target.value)} 
                placeholder="e.g. 40000"
                style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                required 
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#475569' }}>Start Date *</label>
              <input 
                type="date" 
                value={formStartDate} 
                onChange={e => setFormStartDate(e.target.value)} 
                style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                required 
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#475569' }}>End Date *</label>
              <input 
                type="date" 
                value={formEndDate} 
                onChange={e => setFormEndDate(e.target.value)} 
                style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                required 
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#475569' }}>Payment Frequency *</label>
              <select 
                value={formFrequency} 
                onChange={e => setFormFrequency(e.target.value)}
                style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', background: 'white' }}
              >
                <option value="Quarterly">Quarterly</option>
                <option value="Half-Yearly">Half-Yearly</option>
                <option value="Annually">Annually</option>
                <option value="Monthly">Monthly</option>
              </select>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', gridColumn: 'span 1' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#475569' }}>Description / Notes</label>
              <input 
                type="text" 
                value={formNotes} 
                onChange={e => setFormNotes(e.target.value)} 
                placeholder="Optional notes"
                style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
              />
            </div>
            <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '8px' }}>
              <button 
                type="button" 
                onClick={resetForm}
                style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #cbd5e1', background: 'transparent', cursor: 'pointer', fontWeight: 600 }}
              >
                Cancel
              </button>
              <button 
                type="submit" 
                style={{ padding: '8px 16px', borderRadius: '6px', border: 'none', background: '#1e3a8a', color: 'white', cursor: 'pointer', fontWeight: 600 }}
              >
                {editingContract ? 'Save Changes' : 'Create Contract'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Main List & Details Panel */}
      <div style={{ display: 'grid', gridTemplateColumns: activeContractId ? '1.2fr 1fr' : '1fr', gap: '20px', transition: 'all 0.3s' }}>
        
        {/* AMC Contracts Table */}
        <div style={{ background: 'white', borderRadius: '12px', border: '1px solid rgba(0,0,0,0.05)', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#1e293b' }}>Operational Contracts</h3>
            <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Click on a row to manage payment schedule</span>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                  <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: '#64748b', letterSpacing: '0.05em' }}>Contract & Vendor</th>
                  <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: '#64748b', letterSpacing: '0.05em' }}>Duration</th>
                  <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: '#64748b', letterSpacing: '0.05em' }}>Remaining</th>
                  <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: '#64748b', letterSpacing: '0.05em' }}>Annual Cost</th>
                  <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: '#64748b', letterSpacing: '0.05em' }}>Frequency</th>
                  <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: '#64748b', letterSpacing: '0.05em' }}>Status</th>
                  {isAdmin && <th style={{ padding: '14px 16px', textAlign: 'right', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: '#64748b', letterSpacing: '0.05em' }}>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {contracts.length > 0 ? (
                  contracts.map(contract => {
                    const daysLeft = getDaysRemaining(contract.endDate);
                    const status = getContractStatus(contract.endDate);
                    const isSelected = activeContractId === contract.id;

                    return (
                      <tr 
                        key={contract.id} 
                        onClick={() => setActiveContractId(isSelected ? null : contract.id)}
                        style={{ 
                          borderBottom: '1px solid #e2e8f0', 
                          cursor: 'pointer',
                          background: isSelected ? '#f8fafc' : 'transparent',
                          transition: 'background 0.15s'
                        }}
                        className="hover-row"
                      >
                        <td style={{ padding: '14px 16px' }}>
                          <span style={{ fontWeight: 600, color: '#1e293b', display: 'block' }}>{contract.name}</span>
                          <span style={{ fontSize: '0.85rem', color: '#64748b', display: 'block' }}>{contract.vendor}</span>
                          {contract.contact && <span style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block' }}>📞 {contract.contact}</span>}
                        </td>
                        <td style={{ padding: '14px 16px', fontSize: '0.9rem', color: '#334155' }}>
                          {contract.startDate} to <br /> {contract.endDate}
                        </td>
                        <td style={{ padding: '14px 16px', fontSize: '0.9rem' }}>
                          {daysLeft < 0 ? (
                            <span style={{ color: '#ef4444', fontWeight: 500 }}>Expired</span>
                          ) : (
                            <span style={{ color: daysLeft <= 30 ? '#f59e0b' : '#334155', fontWeight: 500 }}>
                              {daysLeft} days left
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '14px 16px', fontWeight: 600, color: '#1e293b' }}>
                          {fmt(contract.cost)}
                        </td>
                        <td style={{ padding: '14px 16px', fontSize: '0.9rem', color: '#475569' }}>
                          <span style={{ background: '#f1f5f9', padding: '4px 8px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 500 }}>
                            {contract.paymentFrequency}
                          </span>
                        </td>
                        <td style={{ padding: '14px 16px' }}>
                          <span style={{ 
                            background: getStatusColor(status) + '15',
                            color: getStatusColor(status),
                            padding: '4px 10px',
                            borderRadius: '20px',
                            fontSize: '0.8rem',
                            fontWeight: 600
                          }}>
                            {status}
                          </span>
                        </td>
                        {isAdmin && (
                          <td style={{ padding: '14px 16px', textAlign: 'right' }} onClick={e => e.stopPropagation()}>
                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                              <button 
                                onClick={() => handleEditContractClick(contract)}
                                style={{ padding: '4px 8px', background: 'transparent', border: '1px solid #cbd5e1', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' }}
                              >
                                ✏️
                              </button>
                              <button 
                                onClick={() => handleDeleteContract(contract.id)}
                                style={{ padding: '4px 8px', background: 'transparent', border: '1px solid #fee2e2', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' }}
                              >
                                🗑️
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={isAdmin ? 7 : 6} style={{ padding: '30px', textAlign: 'center', color: '#64748b' }}>
                      No AMC contracts added yet. Click "Add AMC Contract" above.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Selected Contract Payment Schedule Panel */}
        {activeContractId && (() => {
          const selected = contracts.find(c => c.id === activeContractId);
          if (!selected) return null;

          return (
            <div style={{ background: 'white', borderRadius: '12px', border: '1px solid rgba(0,0,0,0.05)', padding: '20px', boxShadow: '0 4px 6px rgba(0,0,0,0.02)', alignSelf: 'start' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700, color: '#1e293b' }}>
                  💳 Payments: {selected.name}
                </h3>
                <button 
                  onClick={() => setActiveContractId(null)}
                  style={{ background: 'transparent', border: 'none', fontSize: '1.1rem', cursor: 'pointer', color: '#64748b' }}
                >
                  ✕
                </button>
              </div>

              <p style={{ margin: '0 0 16px 0', fontSize: '0.9rem', color: '#64748b' }}>
                Frequency: <strong>{selected.paymentFrequency}</strong> &bull; Total Value: <strong>{fmt(selected.cost)}</strong>
              </p>

              {selected.notes && (
                <div style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: '6px', fontSize: '0.85rem', color: '#475569', borderLeft: '3px solid #1e3a8a', marginBottom: '20px' }}>
                  {selected.notes}
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {selected.payments?.map(p => {
                  const isEditing = editingPaymentId === p.id;
                  
                  return (
                    <div 
                      key={p.id} 
                      style={{ 
                        border: '1px solid #e2e8f0', 
                        borderRadius: '8px', 
                        padding: '12px 14px',
                        background: p.status === 'Paid' ? '#f0fdf4' : '#fff'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: isEditing ? '12px' : '0' }}>
                        <div>
                          <span style={{ fontSize: '0.8rem', color: '#64748b', display: 'block', textTransform: 'uppercase', fontWeight: 600 }}>
                            Installment #{p.id}
                          </span>
                          <span style={{ fontWeight: 600, fontSize: '1.1rem', color: '#1e293b' }}>
                            {fmt(p.amount)}
                          </span>
                          <span style={{ fontSize: '0.85rem', color: '#475569', display: 'block', marginTop: '2px' }}>
                            Due on {p.dueDate}
                          </span>
                          {p.chequeOrTxn && (
                            <span style={{ fontSize: '0.8rem', color: '#10b981', display: 'block', marginTop: '2px' }}>
                              🏷️ Ref: <strong>{p.chequeOrTxn}</strong>
                            </span>
                          )}
                        </div>

                        <div style={{ textAlign: 'right' }}>
                          <span style={{ 
                            background: p.status === 'Paid' ? '#10b98115' : '#f59e0b15',
                            color: p.status === 'Paid' ? '#10b981' : '#f59e0b',
                            padding: '4px 8px',
                            borderRadius: '6px',
                            fontSize: '0.8rem',
                            fontWeight: 600,
                            marginRight: '8px'
                          }}>
                            {p.status}
                          </span>
                          {isAdmin && !isEditing && (
                            <button 
                              onClick={() => handleEditPaymentClick(p)}
                              style={{ 
                                background: '#f1f5f9', 
                                border: 'none', 
                                padding: '4px 8px', 
                                borderRadius: '4px', 
                                cursor: 'pointer',
                                fontSize: '0.8rem',
                                color: '#1e293b'
                              }}
                            >
                              Update
                            </button>
                          )}
                        </div>
                      </div>

                      {isEditing && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderTop: '1px solid #e2e8f0', paddingTop: '10px' }}>
                          <div style={{ display: 'flex', gap: '10px' }}>
                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569' }}>Status</label>
                              <select 
                                value={paymentStatus}
                                onChange={e => setPaymentStatus(e.target.value)}
                                style={{ padding: '6px 8px', borderRadius: '4px', border: '1px solid #cbd5e1', background: 'white' }}
                              >
                                <option value="Pending">Pending</option>
                                <option value="Paid">Paid</option>
                                <option value="Overdue">Overdue</option>
                              </select>
                            </div>
                            <div style={{ flex: 2, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569' }}>Cheque / Txn No.</label>
                              <input 
                                type="text"
                                value={paymentCheque}
                                onChange={e => setPaymentCheque(e.target.value)}
                                placeholder="e.g. CHQ-990812"
                                style={{ padding: '6px 8px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                              />
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                            <button 
                              onClick={() => setEditingPaymentId(null)}
                              style={{ padding: '4px 8px', borderRadius: '4px', border: '1px solid #cbd5e1', background: 'transparent', cursor: 'pointer', fontSize: '0.8rem' }}
                            >
                              Cancel
                            </button>
                            <button 
                              onClick={() => handleSavePayment(selected.id, p.id)}
                              style={{ padding: '4px 8px', borderRadius: '4px', border: 'none', background: '#1e3a8a', color: 'white', cursor: 'pointer', fontSize: '0.8rem' }}
                            >
                              Save
                            </button>
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
    </div>
  );
}
