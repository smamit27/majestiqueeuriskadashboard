import React, { useState, useEffect, useRef } from 'react';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { db, ensureFirebaseSession, isFirebaseConfigured } from '../../firebase.js';

const fmt = (v) => Number(v).toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });

export default function MaintenanceTracker({ isAdmin = false }) {
  const [flats, setFlats] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState('idle');
  const [saveMsg, setSaveMsg] = useState('');

  const isLoadedRef = useRef(false);
  const recordId = 'maintenance_bills_v2';

  const defaultFlats = [
    {
      id: 'A-302',
      flatNo: 'A-302',
      bills: [
        { id: 1, period: 'Oct 2021 - Mar 2022 (6 mos @ ₹2,200)', amount: 13200, status: 'Pending' },
        { id: 2, period: 'Apr 2022 - Mar 2023 (12 mos @ ₹2,200)', amount: 26400, status: 'Pending' },
        { id: 3, period: 'Apr 2023 - Mar 2024 (12 mos @ ₹2,200)', amount: 26400, status: 'Pending' },
        { id: 4, period: 'Apr 2024 - Mar 2025 (12 mos @ ₹2,200)', amount: 26400, status: 'Pending' },
        { id: 5, period: 'Apr 2025 - Jun 2025 (3 mos @ ₹2,200)', amount: 6600, status: 'Pending' },
        { id: 6, period: 'Jul 2025 - Mar 2026 (9 mos @ ₹3,000)', amount: 27000, status: 'Pending' },
        { id: 7, period: 'Apr 2026 - Jun 2026 (3 mos @ ₹3,000)', amount: 9000, status: 'Pending' }
      ]
    },
    {
      id: 'A-904',
      flatNo: 'A-904',
      bills: [
        { id: 1, period: 'Oct 2021 - Mar 2022 (6 mos @ ₹2,200)', amount: 13200, status: 'Pending' },
        { id: 2, period: 'Apr 2022 - Mar 2023 (12 mos @ ₹2,200)', amount: 26400, status: 'Pending' },
        { id: 3, period: 'Apr 2023 - Mar 2024 (12 mos @ ₹2,200)', amount: 26400, status: 'Pending' },
        { id: 4, period: 'Apr 2024 - Mar 2025 (12 mos @ ₹2,200)', amount: 26400, status: 'Pending' },
        { id: 5, period: 'Apr 2025 - Jun 2025 (3 mos @ ₹2,200)', amount: 6600, status: 'Pending' },
        { id: 6, period: 'Jul 2025 - Mar 2026 (9 mos @ ₹3,000)', amount: 27000, status: 'Pending' },
        { id: 7, period: 'Apr 2026 - Jun 2026 (3 mos @ ₹3,000)', amount: 9000, status: 'Pending' }
      ]
    },
    {
      id: 'A-1002',
      flatNo: 'A-1002',
      bills: [
        { id: 1, period: 'Oct 2021 - Mar 2022 (6 mos @ ₹2,200)', amount: 13200, status: 'Pending' },
        { id: 2, period: 'Apr 2022 - Mar 2023 (12 mos @ ₹2,200)', amount: 26400, status: 'Pending' },
        { id: 3, period: 'Apr 2023 - Mar 2024 (12 mos @ ₹2,200)', amount: 26400, status: 'Pending' },
        { id: 4, period: 'Apr 2024 - Mar 2025 (12 mos @ ₹2,200)', amount: 26400, status: 'Pending' },
        { id: 5, period: 'Apr 2025 - Jun 2025 (3 mos @ ₹2,200)', amount: 6600, status: 'Pending' },
        { id: 6, period: 'Jul 2025 - Mar 2026 (9 mos @ ₹3,000)', amount: 27000, status: 'Pending' },
        { id: 7, period: 'Apr 2026 - Jun 2026 (3 mos @ ₹3,000)', amount: 9000, status: 'Pending' }
      ]
    }
  ];

  useEffect(() => {
    let cancelled = false;
    isLoadedRef.current = false;
    setSaveStatus('idle');
    setSaveMsg('');

    async function load() {
      setIsLoading(true);
      if (!isFirebaseConfigured || !db) {
        setFlats(defaultFlats);
        setIsLoading(false);
        isLoadedRef.current = true;
        return;
      }

      try {
        await ensureFirebaseSession();
        const snap = await getDoc(doc(db, 'maintenanceTracking', recordId));
        if (!cancelled) {
          if (snap.exists() && snap.data().flats) {
            setFlats(snap.data().flats);
          } else {
            setFlats(defaultFlats);
          }
          setSaveMsg('Synced');
        }
      } catch (err) {
        console.error('Maintenance load error:', err);
        setFlats(defaultFlats);
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

  const saveToFirebase = async (data) => {
    setSaveStatus('saving');
    if (!isFirebaseConfigured || !db) {
      setSaveStatus('saved');
      setSaveMsg('Local Mode');
      return;
    }
    try {
      await ensureFirebaseSession();
      await setDoc(doc(db, 'maintenanceTracking', recordId), {
        flats: data,
        updatedAt: serverTimestamp()
      }, { merge: true });
      setSaveStatus('saved');
      setSaveMsg('Saved');
    } catch (err) {
      console.error('Save error:', err);
      setSaveStatus('error');
      setSaveMsg('Error saving');
    }
  };

  const toggleBillStatus = (flatId, billId) => {
    if (!isAdmin) return;
    const updated = flats.map(f => {
      if (f.id === flatId) {
        const newBills = f.bills.map(b => {
          if (b.id === billId) {
            return { ...b, status: b.status === 'Pending' ? 'Paid' : 'Pending' };
          }
          return b;
        });
        return { ...f, bills: newBills };
      }
      return f;
    });
    setFlats(updated);
    if (isLoadedRef.current) {
      saveToFirebase(updated);
    }
  };

  return (
    <div className="tab-pane active" style={{ maxWidth: '900px', margin: '0 auto', padding: '20px' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2 style={{ margin: '0 0 8px 0', fontSize: '1.5rem', fontWeight: '600' }}>Maintenance Tracker</h2>
          <p style={{ margin: 0, color: '#6b7280' }}>Track all maintenance amounts till now for specific flats</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {saveStatus === 'saving' && <span style={{ color: '#f59e0b', fontSize: '0.875rem' }}>Saving...</span>}
          {saveStatus === 'saved' && <span style={{ color: '#10b981', fontSize: '0.875rem' }}>{saveMsg}</span>}
          {saveStatus === 'error' && <span style={{ color: '#ef4444', fontSize: '0.875rem' }}>{saveMsg}</span>}
          {isLoading && <span style={{ color: '#3b82f6', fontSize: '0.875rem' }}>Loading...</span>}
        </div>
      </header>

      <div style={{ display: 'grid', gap: '20px' }}>
        {flats.map(flat => {
          const totalPending = flat.bills.filter(b => b.status === 'Pending').reduce((sum, b) => sum + b.amount, 0);
          
          return (
            <div key={flat.id} style={{ 
              background: '#fff', 
              borderRadius: '12px', 
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              overflow: 'hidden',
              border: '1px solid #e5e7eb'
            }}>
              <div style={{ 
                padding: '16px 20px', 
                background: '#f9fafb', 
                borderBottom: '1px solid #e5e7eb',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ 
                    width: '40px', height: '40px', 
                    background: '#fce7f3', color: '#be185d',
                    borderRadius: '8px', display: 'flex', 
                    alignItems: 'center', justifyContent: 'center',
                    fontWeight: 'bold', fontSize: '1.1rem'
                  }}>
                    {flat.flatNo.split('-')[1]}
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#111827' }}>Flat {flat.flatNo}</h3>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ 
                    display: 'inline-block',
                    padding: '4px 12px', 
                    background: totalPending > 0 ? '#fee2e2' : '#d1fae5',
                    color: totalPending > 0 ? '#991b1b' : '#065f46',
                    borderRadius: '999px',
                    fontSize: '0.875rem',
                    fontWeight: '500'
                  }}>
                    {totalPending > 0 ? `Total Pending: ${fmt(totalPending)}` : 'All Paid'}
                  </span>
                </div>
              </div>

              <div style={{ padding: '0 20px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: 'left', padding: '12px 0', borderBottom: '1px solid #e5e7eb', color: '#6b7280', fontWeight: '500', fontSize: '0.875rem' }}>Period</th>
                      <th style={{ textAlign: 'right', padding: '12px 0', borderBottom: '1px solid #e5e7eb', color: '#6b7280', fontWeight: '500', fontSize: '0.875rem' }}>Amount</th>
                      <th style={{ textAlign: 'center', padding: '12px 0', borderBottom: '1px solid #e5e7eb', color: '#6b7280', fontWeight: '500', fontSize: '0.875rem' }}>Status</th>
                      {isAdmin && <th style={{ textAlign: 'right', padding: '12px 0', borderBottom: '1px solid #e5e7eb', color: '#6b7280', fontWeight: '500', fontSize: '0.875rem' }}>Action</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {flat.bills.map((bill, idx) => (
                      <tr key={bill.id} style={{ borderBottom: idx < flat.bills.length - 1 ? '1px solid #f3f4f6' : 'none' }}>
                        <td style={{ padding: '16px 0', color: '#374151', fontWeight: '500' }}>{bill.period}</td>
                        <td style={{ padding: '16px 0', textAlign: 'right', color: '#111827', fontWeight: '600' }}>{fmt(bill.amount)}</td>
                        <td style={{ padding: '16px 0', textAlign: 'center' }}>
                          <span style={{
                            display: 'inline-block',
                            padding: '2px 8px',
                            borderRadius: '4px',
                            fontSize: '0.75rem',
                            fontWeight: '600',
                            backgroundColor: bill.status === 'Paid' ? '#d1fae5' : '#fef3c7',
                            color: bill.status === 'Paid' ? '#065f46' : '#92400e'
                          }}>
                            {bill.status}
                          </span>
                        </td>
                        {isAdmin && (
                          <td style={{ padding: '16px 0', textAlign: 'right' }}>
                            <button
                              onClick={() => toggleBillStatus(flat.id, bill.id)}
                              style={{
                                padding: '6px 12px',
                                background: bill.status === 'Pending' ? '#10b981' : '#f3f4f6',
                                color: bill.status === 'Pending' ? 'white' : '#4b5563',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontSize: '0.875rem',
                                fontWeight: '500'
                              }}
                            >
                              {bill.status === 'Pending' ? 'Mark Paid' : 'Unmark'}
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
