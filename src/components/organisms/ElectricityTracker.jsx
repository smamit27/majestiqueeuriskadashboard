import { useCallback, useEffect, useRef, useState } from 'react';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import * as XLSX from 'xlsx';
import { db, ensureFirebaseSession, isFirebaseConfigured } from '../../firebase.js';

function formatDateLabel(val) {
  if (!val) return '';
  const parts = val.split('-');
  if (parts.length === 3) {
    const [y, m, d] = parts.map(Number);
    return new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(y, m - 1, d));
  } else if (parts.length === 2) {
    const [y, m] = parts.map(Number);
    return new Intl.DateTimeFormat('en-IN', { month: 'short', year: 'numeric' }).format(new Date(y, m - 1, 1));
  }
  return val;
}

const n = (v) => parseFloat(v) || 0;
const fmt = (v) => Number(v).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function ElectricityTracker({ isAdmin = false }) {
  const [subTab, setSubTab] = useState('tata'); // 'tata', 'buildingA', 'mahavitaran'

  const [tataBills, setTataBills] = useState([]);
  const [buildingABills, setBuildingABills] = useState([]);
  const [mahavitaranBills, setMahavitaranBills] = useState([]);

  const [searchText, setSearchText] = useState('');
  const [editingRowId, setEditingRowId] = useState(null);

  const [isLoading, setIsLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState('idle');
  const [saveMsg, setSaveMsg] = useState('');

  const isLoadedRef = useRef(false);
  const autoSaveTimer = useRef(null);

  const tataRecordId = 'tata_electricity_bills';
  const buildingARecordId = 'building_a_electricity_bills';
  const mahavitaranRecordId = 'mahavitaran_electricity_bills';

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

        const [snapTata, snapBuildingA, snapMahavitaran] = await Promise.all([
          getDoc(doc(db, 'electricityTracking', tataRecordId)),
          getDoc(doc(db, 'electricityTracking', buildingARecordId)),
          getDoc(doc(db, 'electricityTracking', mahavitaranRecordId))
        ]);

        if (!cancelled) {
          // Historical Tata template bills — Sep 2025 to May 2026 (15th–14th billing cycle)
          // 8988 total units ÷ 9 months = 999 units/month (rounded)
          // Pre-calculated: Energy=14309.47, Fuel=334.60, Fixed=445, Wheeling=1598.40
          // Subtotal=16687.47, Duty=2669.99, Grand Total=₹19,357
          const makeTataBill = (id, start, end, prevR, currR) => ({
            id, startMonth: start, endMonth: end,
            prevReading: String(prevR), currReading: String(currR),
            msebFixedCharge: '445.00', msebEnergyCharge: '14309.47',
            msebWheelingRate: '1.60', msebFuelAdj: '334.60',
            consumption: 999, fixed: 445, energy: 14309.47,
            wheelTotal: 1598.40, fuel: 334.60,
            subtotal: 16687.47, duty: 2669.995, exactTotal: 19357.465, grandTotal: 19357
          });
          const tataSeed = [
            makeTataBill(1001, '2025-08-15', '2025-09-14',    0,   999),
            makeTataBill(1002, '2025-09-15', '2025-10-14',  999,  1998),
            makeTataBill(1003, '2025-10-15', '2025-11-14', 1998,  2997),
            makeTataBill(1004, '2025-11-15', '2025-12-14', 2997,  3996),
            makeTataBill(1005, '2025-12-15', '2026-01-14', 3996,  4995),
            makeTataBill(1006, '2026-01-15', '2026-02-14', 4995,  5994),
            makeTataBill(1007, '2026-02-15', '2026-03-14', 5994,  6993),
            makeTataBill(1008, '2026-03-15', '2026-04-14', 6993,  7992),
            // Last month: 996 units so total across all 9 months = 8×999 + 996 = 8988
            { id: 1009, startMonth: '2026-04-15', endMonth: '2026-05-14',
              prevReading: '7992', currReading: '8988',
              msebFixedCharge: '445.00', msebEnergyCharge: '14256.88',
              msebWheelingRate: '1.60', msebFuelAdj: '333.40',
              consumption: 996, fixed: 445, energy: 14256.88,
              wheelTotal: 1593.60, fuel: 333.40,
              subtotal: 16628.88, duty: 2660.62, exactTotal: 19289.50, grandTotal: 19290 },
          ];
          const tataData = snapTata.exists() ? snapTata.data().bills || [] : [];
          setTataBills(tataData.length > 0 ? tataData : tataSeed);
          setBuildingABills(snapBuildingA.exists() ? snapBuildingA.data().bills || [] : []);
          setMahavitaranBills(snapMahavitaran.exists() ? snapMahavitaran.data().bills || [] : []);
          setSaveMsg(`Synced`);
        }
      } catch (err) {
        console.error('Bills load error:', err);
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

  const saveToFirebase = useCallback(async (data, targetId) => {
    setSaveStatus('saving');
    if (!isFirebaseConfigured || !db) {
      setSaveStatus('saved');
      return;
    }
    try {
      await ensureFirebaseSession();
      await setDoc(doc(db, 'electricityTracking', targetId), {
        bills: data,
        updatedAt: serverTimestamp()
      }, { merge: true });
      setSaveStatus('saved');
      setSaveMsg('Saved ✓');
    } catch (err) {
      setSaveStatus('error');
      setSaveMsg('Failed');
    }
  }, []);

  const triggerAutoSave = (newData, currentTab) => {
    if (!isLoadedRef.current) return;
    clearTimeout(autoSaveTimer.current);
    setSaveStatus('pending');
    setSaveMsg('Unsaved changes...');

    let targetId = tataRecordId;
    if (currentTab === 'buildingA') targetId = buildingARecordId;
    if (currentTab === 'mahavitaran') targetId = mahavitaranRecordId;

    autoSaveTimer.current = setTimeout(() => {
      saveToFirebase(newData, targetId);
    }, 1500);
  };

  const [formData, setFormData] = useState({
    startMonth: '',
    endMonth: '',
    prevReading: '',
    currReading: '',
    ratePerUnit: '13',
    // Mahavitaran fields
    msebFixedCharge: '445.00',
    msebEnergyCharge: '',
    msebWheelingRate: '1.60',
    msebFuelAdj: '0.00',
  });

  const calculateMahavitaranSlabs = (units) => {
    let remaining = units;
    let energyTotal = 0;
    let fuelTotal = 0;
    const breakdown = [];

    const slabs = [
      { name: '0 - 100', limit: 100, energy: 3.96, fuel: 0.150 },
      { name: '101 - 300', limit: 200, energy: 10.80, fuel: 0.250 },
      { name: '301 - 500', limit: 200, energy: 15.03, fuel: 0.350 },
      { name: '501 - 1000', limit: 500, energy: 17.53, fuel: 0.400 },
      { name: '> 1000', limit: Infinity, energy: 17.53, fuel: 0.400 },
    ];

    for (const slab of slabs) {
      if (remaining <= 0) break;
      const unitsInSlab = Math.min(remaining, slab.limit);
      const energyCost = unitsInSlab * slab.energy;
      const fuelCost = unitsInSlab * slab.fuel;

      energyTotal += energyCost;
      fuelTotal += fuelCost;
      remaining -= unitsInSlab;

      breakdown.push({
        slab: slab.name,
        units: unitsInSlab,
        energyRate: slab.energy,
        energyCost,
        fuelRate: slab.fuel,
        fuelCost
      });
    }

    return { energyTotal, fuelTotal, breakdown };
  };

  const handleFormChange = (field, val) => {
    setFormData(prev => {
      const next = { ...prev, [field]: val };

      // Auto-calculate slabs for Mahavitaran tab
      if (subTab === 'mahavitaran' && (field === 'prevReading' || field === 'currReading')) {
        const p = n(next.prevReading);
        const c = n(next.currReading);
        if (c > p && p >= 0) {
          const units = c - p;
          const { energyTotal, fuelTotal } = calculateMahavitaranSlabs(units);
          next.msebEnergyCharge = energyTotal.toFixed(2);
          next.msebFuelAdj = fuelTotal.toFixed(2);
        } else if (c <= p || !next.currReading) {
          next.msebEnergyCharge = '';
          next.msebFuelAdj = '';
        }
      }
      return next;
    });
  };

  const calculateMahavitaranBill = (prevStr, currStr, fixedStr, energyStr, wheelRateStr, fuelStr) => {
    const prev = n(prevStr);
    const curr = n(currStr);
    const consumption = curr - prev;

    const fixed = n(fixedStr);
    const energy = n(energyStr);
    const wheelRate = n(wheelRateStr);
    const fuel = n(fuelStr);

    const wheelTotal = consumption * wheelRate;
    const subtotal = fixed + energy + wheelTotal + fuel;
    const duty = subtotal * 0.16; // 16% electricity duty
    const exactTotal = subtotal + duty;
    const grandTotal = Math.round(exactTotal);

    return {
      consumption, fixed, energy, wheelRate, wheelTotal, fuel, subtotal, duty, exactTotal, grandTotal
    };
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    if (!isAdmin) {
      alert('You do not have permission to perform this action.');
      return;
    }

    const prev = n(formData.prevReading);
    const curr = n(formData.currReading);

    if (curr < prev) {
      alert('Current reading cannot be less than previous reading.');
      return;
    }

    let newBill = {
      ...formData,
      id: Date.now()
    };

    if (subTab === 'mahavitaran') {
      const calc = calculateMahavitaranBill(
        formData.prevReading, formData.currReading,
        formData.msebFixedCharge, formData.msebEnergyCharge,
        formData.msebWheelingRate, formData.msebFuelAdj
      );
      newBill = { ...newBill, ...calc };
    } else {
      const consumption = curr - prev;
      const rate = n(formData.ratePerUnit);
      const baseAmount = consumption * rate;
      newBill.consumption = consumption;
      newBill.baseAmount = baseAmount;
      newBill.grandTotal = baseAmount;
    }

    let next;
    if (subTab === 'mahavitaran') {
      next = [...mahavitaranBills, newBill];
      setMahavitaranBills(next);
    } else if (subTab === 'buildingA') {
      next = [...buildingABills, newBill];
      setBuildingABills(next);
    } else {
      next = [...tataBills, newBill];
      setTataBills(next);
    }
    triggerAutoSave(next, subTab);

    // Reset form
    setFormData({
      startMonth: '',
      endMonth: '',
      prevReading: '',
      currReading: '',
      ratePerUnit: '13',
      msebFixedCharge: '445.00',
      msebEnergyCharge: '',
      msebWheelingRate: '1.60',
      msebFuelAdj: '0.00',
    });
  };

  const updateRow = (idx, field, val) => {
    if (!isAdmin) return;

    let currentList = tataBills;
    if (subTab === 'buildingA') currentList = buildingABills;
    if (subTab === 'mahavitaran') currentList = mahavitaranBills;

    const next = [...currentList];
    const current = next[idx];
    const updated = { ...current, [field]: val };

    if (subTab === 'mahavitaran') {
      if (['prevReading', 'currReading', 'msebFixedCharge', 'msebEnergyCharge', 'msebWheelingRate', 'msebFuelAdj'].includes(field)) {
        const calc = calculateMahavitaranBill(
          updated.prevReading, updated.currReading,
          updated.msebFixedCharge, updated.msebEnergyCharge,
          updated.msebWheelingRate, updated.msebFuelAdj
        );
        Object.assign(updated, calc);
      }
    } else {
      if (['prevReading', 'currReading', 'ratePerUnit'].includes(field)) {
        const prev = n(updated.prevReading);
        const curr = n(updated.currReading);
        const rate = n(updated.ratePerUnit);
        updated.consumption = curr - prev;
        updated.baseAmount = updated.consumption * rate;
        updated.grandTotal = updated.baseAmount;
      }
    }

    next[idx] = updated;

    if (subTab === 'mahavitaran') setMahavitaranBills(next);
    else if (subTab === 'buildingA') setBuildingABills(next);
    else setTataBills(next);

    triggerAutoSave(next, subTab);
  };

  const removeRow = (idx) => {
    if (!isAdmin) return;
    if (!window.confirm('Are you sure you want to delete this bill?')) return;

    let currentList = tataBills;
    if (subTab === 'buildingA') currentList = buildingABills;
    if (subTab === 'mahavitaran') currentList = mahavitaranBills;

    const next = currentList.filter((_, i) => i !== idx);

    if (subTab === 'mahavitaran') setMahavitaranBills(next);
    else if (subTab === 'buildingA') setBuildingABills(next);
    else setTataBills(next);

    triggerAutoSave(next, subTab);
  };

  const activeBills = subTab === 'mahavitaran' ? mahavitaranBills : (subTab === 'buildingA' ? buildingABills : tataBills);

  const filteredBills = activeBills
    .filter(c => {
      if (!searchText) return true;
      const s = searchText.toLowerCase();
      return (
        (c.startMonth && String(c.startMonth).toLowerCase().includes(s)) ||
        (c.endMonth && String(c.endMonth).toLowerCase().includes(s))
      );
    })
    .sort((a, b) => {
      const dateA = a.startMonth ? new Date(a.startMonth) : new Date(0);
      const dateB = b.startMonth ? new Date(b.startMonth) : new Date(0);
      return dateB - dateA; // Newest first
    });

  const totalAmount = filteredBills.reduce((s, c) => s + n(c.grandTotal), 0);
  const totalConsumption = filteredBills.reduce((s, c) => s + n(c.consumption), 0);

  const badge = {
    idle: { color: '#6b7280', icon: '●' },
    pending: { color: '#f59e0b', icon: '⏳' },
    saving: { color: '#3b82f6', icon: '↑' },
    saved: { color: '#10b981', icon: '✓' },
    error: { color: '#ef4444', icon: '✗' },
  }[saveStatus];

  const handleDownloadExcel = () => {
    let rows = [];
    if (subTab === 'mahavitaran') {
      rows = filteredBills.map((c, i) => ({
        'Sr. No': i + 1,
        'Start Date': formatDateLabel(c.startMonth),
        'End Date': formatDateLabel(c.endMonth),
        'Previous Reading': n(c.prevReading),
        'Current Reading': n(c.currReading),
        'Units Consumed': n(c.consumption),
        'Fixed Charge (₹)': n(c.fixed),
        'Energy Charge (₹)': n(c.energy),
        'Wheeling Charge (₹)': n(c.wheelTotal),
        'Fuel Adj (₹)': n(c.fuel),
        'Electricity Duty 16% (₹)': n(c.duty),
        'Rounded Grand Total (₹)': n(c.grandTotal),
      }));
    } else {
      rows = filteredBills.map((c, i) => ({
        'Sr. No': i + 1,
        'Start Date': formatDateLabel(c.startMonth),
        'End Date': formatDateLabel(c.endMonth),
        'Previous Reading': n(c.prevReading),
        'Current Reading': n(c.currReading),
        'Total Consumption': n(c.consumption),
        'Rate/Unit (₹)': n(c.ratePerUnit),
        'Grand Total (₹)': n(c.grandTotal),
      }));
    }

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    const sheetName = subTab === 'tata' ? 'Tata' : (subTab === 'mahavitaran' ? 'Mahavitaran' : 'A Building');
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    XLSX.writeFile(wb, `${sheetName.replace(/\s+/g, '_')}_Bills.xlsx`);
  };

  const now = new Date();
  const fifteenMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 15, 1);

  const monthBuckets = {};

  filteredBills.forEach(b => {
    if (!b.startMonth || !b.endMonth) return;
    const start = new Date(b.startMonth);
    const end = new Date(b.endMonth);
    if (isNaN(start) || isNaN(end)) return;

    let totalDays = Math.round((end - start) / 86400000);
    if (totalDays <= 0) {
      const parts = b.startMonth.split('-');
      if (parts.length >= 2) totalDays = new Date(parts[0], parts[1], 0).getDate();
      else totalDays = 1;
    }

    const dailyAvg = n(b.consumption) / totalDays;

    if (start.getTime() === end.getTime()) {
      end.setDate(end.getDate() + totalDays);
    }

    for (let current = new Date(start); current < end; current.setDate(current.getDate() + 1)) {
      if (current < fifteenMonthsAgo) continue;

      const y = current.getFullYear();
      const m = current.getMonth();
      const key = `${y}-${m}`;

      if (!monthBuckets[key]) {
        monthBuckets[key] = {
          year: y,
          month: m,
          totalConsumption: 0,
          daysInMonth: new Date(y, m + 1, 0).getDate()
        };
      }
      monthBuckets[key].totalConsumption += dailyAvg;
    }
  });

  const chartData = Object.values(monthBuckets)
    .sort((a, b) => {
      if (a.year !== b.year) return a.year - b.year;
      return a.month - b.month;
    })
    .map(bucket => {
      const date = new Date(bucket.year, bucket.month, 1);
      const label = new Intl.DateTimeFormat('en-IN', { month: 'short', year: 'numeric' }).format(date);
      return {
        name: label,
        "Total Consumed": parseFloat(bucket.totalConsumption.toFixed(2)),
        "Daily Avg": parseFloat((bucket.totalConsumption / bucket.daysInMonth).toFixed(2))
      };
    });

  const renderTabButton = (id, icon, label) => (
    <button
      onClick={() => { setSubTab(id); setEditingRowId(null); }}
      className={`sub-tab-button ${subTab === id ? 'active' : ''}`}
      style={{
        flex: 1, padding: '12px', borderRadius: '10px', border: 'none', cursor: 'pointer',
        background: subTab === id ? '#1e3a8a' : 'transparent',
        color: subTab === id ? 'white' : 'var(--muted)',
        fontWeight: 600, transition: '0.2s'
      }}
    >
      {icon} {label}
    </button>
  );

  return (
    <div className="electricity-tracker" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

      {/* Tab Navigation */}
      <div className="table-card" style={{ padding: '8px', background: 'rgba(255,255,255,0.4)', backdropFilter: 'blur(10px)', border: '1px solid var(--line)', borderRadius: '16px' }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          {renderTabButton('tata', '⚡️', 'Tata Electricity')}
          {renderTabButton('buildingA', '🏢', 'A Building Electricity')}
          {renderTabButton('mahavitaran', '🔌', 'Mahavitaran (MSEB)')}
        </div>
      </div>

      <div className="table-card" style={{ padding: 0 }}>
        <div className="attendance-table-card__header">
          <div>
            <p className="eyebrow">
              {subTab === 'tata' ? 'Tata Power Dashboard' : (subTab === 'mahavitaran' ? 'Mahavitaran Dashboard' : 'A Building Dashboard')}
            </p>
            <h3 style={{ marginBottom: '4px' }}>
              {subTab === 'tata' ? 'Tata Bills' : (subTab === 'mahavitaran' ? 'MSEB Detailed Bills' : 'A Building Bills')}
            </h3>
            {subTab === 'buildingA' && <p style={{ color: 'var(--muted)', fontSize: '0.9rem', margin: 0 }}>Customer Number: 17000358685</p>}
            {subTab === 'mahavitaran' && <p style={{ color: 'var(--muted)', fontSize: '0.9rem', margin: 0 }}>Detailed breakdown per MSEB format</p>}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: badge.color, fontWeight: 500, fontSize: '0.9rem' }}>
            <span>{badge.icon}</span>
            <span>{isLoading ? 'Loading...' : saveMsg || 'Ready'}</span>
          </div>
        </div>
      </div>

      {/* SEARCH ZONE */}
      <div className="section-card" style={{ padding: '16px 24px', background: '#f8fafc', border: '1px solid var(--line)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
          <div className="filter-field" style={{ flex: 1, minWidth: '280px', margin: 0 }}>
            <label className="eyebrow" style={{ display: 'block', marginBottom: '8px' }}>🔍 Search Dates</label>
            <input
              type="search"
              placeholder="Search YYYY-MM..."
              value={searchText}
              onChange={e => setSearchText(e.target.value)}
              className="attendance-register-input"
              style={{ textAlign: 'left', height: '44px', fontSize: '1rem', background: 'white' }}
            />
          </div>
          <button className="button-secondary" onClick={handleDownloadExcel} style={{ padding: '10px 20px', height: '44px', marginTop: 'auto' }}>
            ⬇ Export to Excel
          </button>
        </div>
      </div>

      {/* SUMMARY ZONE */}
      {filteredBills.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div className="attendance-summary-grid" style={{ background: '#f0f9ff', padding: '20px', borderRadius: '16px', border: '1px solid #bae6fd' }}>
            <div style={{ gridColumn: '1 / -1', marginBottom: '10px' }}>
              <p className="eyebrow" style={{ color: '#0369a1' }}>Total Statistics</p>
            </div>
            <div className="accounting-summary-card" style={{ background: 'white' }}>
              <p className="eyebrow">Total Consumption</p>
              <h3 style={{ color: '#ea580c' }}>{fmt(totalConsumption)} Units</h3>
            </div>
            <div className="accounting-summary-card" style={{ background: 'white' }}>
              <p className="eyebrow">Total Bill Paid</p>
              <h3 style={{ color: '#0369a1' }}>₹{fmt(totalAmount)}</h3>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
            <div className="section-card" style={{ padding: '24px', border: '1px solid var(--line)' }}>
              <h4 style={{ margin: '0 0 20px 0', color: 'var(--ink)' }}>Total Monthly Consumption (Last 15 Months)</h4>
              <div style={{ width: '100%', height: 280 }}>
                {chartData.length > 0 ? (
                  <ResponsiveContainer>
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dy={10} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dx={-10} />
                      <Tooltip cursor={{ fill: '#f1f5f9' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                      <Bar dataKey="Total Consumed" fill="#0284c7" radius={[4, 4, 0, 0]} maxBarSize={50} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
                    No data in the last 15 months.
                  </div>
                )}
              </div>
            </div>

            <div className="section-card" style={{ padding: '24px', border: '1px solid var(--line)' }}>
              <h4 style={{ margin: '0 0 20px 0', color: 'var(--ink)' }}>Daily Average Consumption (Last 15 Months)</h4>
              <div style={{ width: '100%', height: 280 }}>
                {chartData.length > 0 ? (
                  <ResponsiveContainer>
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dy={10} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dx={-10} />
                      <Tooltip cursor={{ fill: '#f1f5f9' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                      <Bar dataKey="Daily Avg" fill="#ea580c" radius={[4, 4, 0, 0]} maxBarSize={50} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
                    No data in the last 15 months.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ADD NEW BILL FORM */}
      {isAdmin && (
        <div className="section-card" style={{ padding: '24px' }}>
          <h4 style={{ margin: '0 0 20px 0', color: 'var(--ink)' }}>
            ➕ Add {subTab === 'tata' ? 'Tata' : (subTab === 'mahavitaran' ? 'Mahavitaran' : 'A Building')} Bill
          </h4>
          <form onSubmit={handleFormSubmit} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
            <div className="field-group">
              <label className="eyebrow" style={{ display: 'block', marginBottom: '8px' }}>Start Date <span style={{ color: '#ef4444' }}>*</span></label>
              <input className="attendance-register-input" style={{ textAlign: 'left' }} type="date" value={formData.startMonth} onChange={e => handleFormChange('startMonth', e.target.value)} required />
            </div>
            <div className="field-group">
              <label className="eyebrow" style={{ display: 'block', marginBottom: '8px' }}>End Date <span style={{ color: '#ef4444' }}>*</span></label>
              <input className="attendance-register-input" style={{ textAlign: 'left' }} type="date" value={formData.endMonth} onChange={e => handleFormChange('endMonth', e.target.value)} required />
            </div>
            <div className="field-group">
              <label className="eyebrow" style={{ display: 'block', marginBottom: '8px' }}>Previous Reading <span style={{ color: '#ef4444' }}>*</span></label>
              <input className="attendance-register-input" style={{ textAlign: 'left' }} type="number" step="any" placeholder="0" value={formData.prevReading} onChange={e => handleFormChange('prevReading', e.target.value)} required />
            </div>
            <div className="field-group">
              <label className="eyebrow" style={{ display: 'block', marginBottom: '8px' }}>Current Reading <span style={{ color: '#ef4444' }}>*</span></label>
              <input className="attendance-register-input" style={{ textAlign: 'left' }} type="number" step="any" placeholder="0" value={formData.currReading} onChange={e => handleFormChange('currReading', e.target.value)} required />
            </div>

            {subTab === 'mahavitaran' ? (
              <>
                {/* Mahavitaran shows Meter Type dropdown */}
                {subTab === 'mahavitaran' && (
                  <div className="field-group">
                    <label className="eyebrow" style={{ display: 'block', marginBottom: '8px' }}>Meter Type</label>
                    <select
                      className="attendance-register-input"
                      style={{ textAlign: 'left', background: 'white' }}
                      value={formData.msebFixedCharge === '140.00' ? '140.00' : formData.msebFixedCharge === '445.00' ? '445.00' : 'custom'}
                      onChange={e => {
                        if (e.target.value !== 'custom') {
                          handleFormChange('msebFixedCharge', e.target.value);
                        }
                      }}
                    >
                      <option value="140.00">Individual (4 kW)</option>
                      <option value="445.00">Society (10 kW)</option>
                      <option value="custom">Custom...</option>
                    </select>
                  </div>
                )}
                <div className="field-group">
                  <label className="eyebrow" style={{ display: 'block', marginBottom: '8px' }}>Fixed Charge (₹) <span style={{ color: '#ef4444' }}>*</span></label>
                  <input className="attendance-register-input" style={{ textAlign: 'left' }} type="number" step="any" value={formData.msebFixedCharge} onChange={e => handleFormChange('msebFixedCharge', e.target.value)} required />
                </div>
                <div className="field-group">
                  <label className="eyebrow" style={{ display: 'block', marginBottom: '8px' }}>Energy Charge (₹) <span style={{ color: '#ef4444' }}>*</span></label>
                  <input className="attendance-register-input" style={{ textAlign: 'left' }} type="number" step="any" placeholder="Auto-calculated" value={formData.msebEnergyCharge} onChange={e => handleFormChange('msebEnergyCharge', e.target.value)} required />
                </div>
                <div className="field-group">
                  <label className="eyebrow" style={{ display: 'block', marginBottom: '8px' }}>Wheeling Rate (₹/U) <span style={{ color: '#ef4444' }}>*</span></label>
                  <input className="attendance-register-input" style={{ textAlign: 'left' }} type="number" step="any" value={formData.msebWheelingRate} onChange={e => handleFormChange('msebWheelingRate', e.target.value)} required />
                </div>
                <div className="field-group">
                  <label className="eyebrow" style={{ display: 'block', marginBottom: '8px' }}>Fuel Adjustment (₹) <span style={{ color: '#ef4444' }}>*</span></label>
                  <input className="attendance-register-input" style={{ textAlign: 'left' }} type="number" step="any" value={formData.msebFuelAdj} onChange={e => handleFormChange('msebFuelAdj', e.target.value)} required />
                </div>
              </>
            ) : (
              <div className="field-group">
                <label className="eyebrow" style={{ display: 'block', marginBottom: '8px' }}>Rate per Unit (₹) <span style={{ color: '#ef4444' }}>*</span></label>
                <input className="attendance-register-input" style={{ textAlign: 'left' }} type="number" step="any" value={formData.ratePerUnit} onChange={e => handleFormChange('ratePerUnit', e.target.value)} required />
              </div>
            )}

            <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
              <button type="submit" className="button-primary" style={{ padding: '8px 24px', width: 'auto' }}>Calculate & Add Bill</button>
            </div>
          </form>

          {subTab === 'mahavitaran' && n(formData.currReading) > n(formData.prevReading) && (
            <div style={{ marginTop: '24px', padding: '16px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <h5 style={{ margin: '0 0 12px 0', color: '#334155' }}>Slab Breakdown for {n(formData.currReading) - n(formData.prevReading)} units</h5>
              <table style={{ width: '100%', fontSize: '0.85rem', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #cbd5e1', color: '#64748b' }}>
                    <th style={{ textAlign: 'left', paddingBottom: '8px' }}>Slab</th>
                    <th style={{ textAlign: 'right', paddingBottom: '8px' }}>Units</th>
                    <th style={{ textAlign: 'right', paddingBottom: '8px' }}>Energy Rate</th>
                    <th style={{ textAlign: 'right', paddingBottom: '8px' }}>Energy Total</th>
                    <th style={{ textAlign: 'right', paddingBottom: '8px' }}>FAC Rate</th>
                    <th style={{ textAlign: 'right', paddingBottom: '8px' }}>FAC Total</th>
                  </tr>
                </thead>
                <tbody>
                  {calculateMahavitaranSlabs(n(formData.currReading) - n(formData.prevReading)).breakdown.map((b, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '6px 0', fontWeight: 500 }}>{b.slab}</td>
                      <td style={{ textAlign: 'right' }}>{b.units}</td>
                      <td style={{ textAlign: 'right' }}>₹{b.energyRate.toFixed(2)}</td>
                      <td style={{ textAlign: 'right' }}>₹{b.energyCost.toFixed(2)}</td>
                      <td style={{ textAlign: 'right' }}>₹{b.fuelRate.toFixed(3)}</td>
                      <td style={{ textAlign: 'right' }}>₹{b.fuelCost.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Main Table */}
      <div className="table-card">
        <div className="attendance-table-scroll">
          <table className="attendance-table" style={{ minWidth: subTab === 'mahavitaran' ? 1200 : 1000 }}>
            <thead>
              {subTab === 'mahavitaran' ? (
                <tr style={{ background: '#f8fafc' }}>
                  <th style={{ width: 60 }}>Sr.</th>
                  <th style={{ width: 220 }}>Period</th>
                  <th style={{ width: 90, textAlign: 'right' }}>Readings</th>
                  <th style={{ width: 90, textAlign: 'right' }}>Units</th>
                  <th style={{ width: 100, textAlign: 'right' }}>Fixed</th>
                  <th style={{ width: 120, textAlign: 'right' }}>Energy (वीज)</th>
                  <th style={{ width: 120, textAlign: 'right' }}>Wheeling (वहन)</th>
                  <th style={{ width: 100, textAlign: 'right' }}>Fuel (इंधन)</th>
                  <th style={{ width: 100, textAlign: 'right' }}>Duty (16%)</th>
                  <th style={{ width: 120, textAlign: 'right', background: '#f0f9ff' }}>Grand Total</th>
                  <th style={{ width: 80, textAlign: 'center' }}>Actions</th>
                </tr>
              ) : (
                <tr style={{ background: '#f8fafc' }}>
                  <th style={{ width: 60 }}>Sr.</th>
                  <th style={{ width: 300 }}>Period</th>
                  <th style={{ width: 120, textAlign: 'right' }}>Prev Read</th>
                  <th style={{ width: 120, textAlign: 'right' }}>Curr Read</th>
                  <th style={{ width: 100, textAlign: 'right' }}>Consumed</th>
                  <th style={{ width: 100, textAlign: 'right' }}>Rate</th>
                  <th style={{ width: 120, textAlign: 'right', background: '#f0f9ff' }}>Grand Total</th>
                  <th style={{ width: 80, textAlign: 'center' }}>Actions</th>
                </tr>
              )}
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={11} style={{ textAlign: 'center', padding: 40, opacity: 0.5 }}>Loading records...</td></tr>
              ) : filteredBills.length === 0 ? (
                <tr><td colSpan={11} style={{ textAlign: 'center', padding: 40, opacity: 0.5 }}>
                  {searchText ? `No bills found matching "${searchText}"` : 'No bills recorded.'}
                </td></tr>
              ) : (
                filteredBills.map((c, i) => {
                  const actualIdx = activeBills.findIndex(orig => orig.id === c.id);
                  const isEditing = editingRowId === c.id;

                  if (subTab === 'mahavitaran') {
                    return (
                      <tr key={c.id || i}>
                        <td style={{ verticalAlign: 'middle' }}>{i + 1}</td>
                        <td>
                          {isEditing ? (
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                              <input className="attendance-register-input" style={{ width: '130px', padding: '6px' }} type="date" value={c.startMonth} onChange={e => updateRow(actualIdx, 'startMonth', e.target.value)} />
                              <span>-</span>
                              <input className="attendance-register-input" style={{ width: '130px', padding: '6px' }} type="date" value={c.endMonth} onChange={e => updateRow(actualIdx, 'endMonth', e.target.value)} />
                            </div>
                          ) : (
                            <span style={{ fontWeight: 500, fontSize: '0.85rem' }}>{formatDateLabel(c.startMonth)} -<br />{formatDateLabel(c.endMonth)}</span>
                          )}
                        </td>
                        <td style={{ textAlign: 'right', fontSize: '0.85rem' }}>
                          {isEditing ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                              <input className="attendance-register-input" style={{ padding: '4px' }} type="number" step="any" value={c.prevReading} onChange={e => updateRow(actualIdx, 'prevReading', e.target.value)} />
                              <input className="attendance-register-input" style={{ padding: '4px' }} type="number" step="any" value={c.currReading} onChange={e => updateRow(actualIdx, 'currReading', e.target.value)} />
                            </div>
                          ) : (
                            <><span style={{ color: 'var(--muted)' }}>P: {n(c.prevReading)}</span><br /><span>C: {n(c.currReading)}</span></>
                          )}
                        </td>
                        <td style={{ textAlign: 'right', color: '#ea580c', fontWeight: 600, verticalAlign: 'middle' }}>{n(c.consumption)}</td>
                        <td style={{ textAlign: 'right' }}>
                          {isEditing ? <input className="attendance-register-input" style={{ padding: '4px' }} type="number" step="any" value={c.msebFixedCharge} onChange={e => updateRow(actualIdx, 'msebFixedCharge', e.target.value)} /> : n(c.fixed)}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          {isEditing ? <input className="attendance-register-input" style={{ padding: '4px' }} type="number" step="any" value={c.msebEnergyCharge} onChange={e => updateRow(actualIdx, 'msebEnergyCharge', e.target.value)} /> : n(c.energy)}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          {isEditing ? <input className="attendance-register-input" style={{ padding: '4px' }} type="number" step="any" value={c.msebWheelingRate} onChange={e => updateRow(actualIdx, 'msebWheelingRate', e.target.value)} /> : n(c.wheelTotal)}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          {isEditing ? <input className="attendance-register-input" style={{ padding: '4px' }} type="number" step="any" value={c.msebFuelAdj} onChange={e => updateRow(actualIdx, 'msebFuelAdj', e.target.value)} /> : n(c.fuel)}
                        </td>
                        <td style={{ textAlign: 'right' }}>{fmt(c.duty)}</td>
                        <td style={{ textAlign: 'right', color: '#2563eb', fontWeight: 700, verticalAlign: 'middle' }}>₹{fmt(c.grandTotal)}</td>
                        <td style={{ verticalAlign: 'middle', textAlign: 'center' }}>
                          {isAdmin && (
                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                              {isEditing ? (
                                <button className="button-icon" title="Save" onClick={() => setEditingRowId(null)} style={{ color: '#16a34a' }}>✅</button>
                              ) : (
                                <button className="button-icon" title="Edit" onClick={() => setEditingRowId(c.id)} style={{ color: '#3b82f6' }}>✏️</button>
                              )}
                              <button className="button-icon" title="Delete" onClick={() => removeRow(actualIdx)} style={{ color: '#ef4444' }}>✕</button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  }

                  return (
                    <tr key={c.id || i}>
                      <td style={{ verticalAlign: 'middle' }}>{i + 1}</td>
                      <td>
                        {isEditing ? (
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <input className="attendance-register-input" style={{ width: '140px', padding: '6px' }} type="date" value={c.startMonth} onChange={e => updateRow(actualIdx, 'startMonth', e.target.value)} />
                            <span>-</span>
                            <input className="attendance-register-input" style={{ width: '140px', padding: '6px' }} type="date" value={c.endMonth} onChange={e => updateRow(actualIdx, 'endMonth', e.target.value)} />
                          </div>
                        ) : (
                          <span style={{ fontWeight: 500 }}>{formatDateLabel(c.startMonth)} - {formatDateLabel(c.endMonth)}</span>
                        )}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        {isEditing ? (
                          <input className="attendance-register-input" style={{ textAlign: 'right' }} type="number" step="any" value={c.prevReading} onChange={e => updateRow(actualIdx, 'prevReading', e.target.value)} />
                        ) : (
                          n(c.prevReading)
                        )}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        {isEditing ? (
                          <input className="attendance-register-input" style={{ textAlign: 'right' }} type="number" step="any" value={c.currReading} onChange={e => updateRow(actualIdx, 'currReading', e.target.value)} />
                        ) : (
                          n(c.currReading)
                        )}
                      </td>
                      <td style={{ textAlign: 'right', color: '#ea580c', fontWeight: 600, verticalAlign: 'middle' }}>{n(c.consumption)}</td>
                      <td style={{ textAlign: 'right' }}>
                        {isEditing ? (
                          <input className="attendance-register-input" style={{ textAlign: 'right' }} type="number" step="any" value={c.ratePerUnit} onChange={e => updateRow(actualIdx, 'ratePerUnit', e.target.value)} />
                        ) : (
                          `₹${n(c.ratePerUnit)}`
                        )}
                      </td>
                      <td style={{ textAlign: 'right', color: '#2563eb', fontWeight: 700, verticalAlign: 'middle' }}>₹{fmt(c.grandTotal)}</td>
                      <td style={{ verticalAlign: 'middle', textAlign: 'center' }}>
                        {isAdmin && (
                          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                            {isEditing ? (
                              <button className="button-icon" title="Save" onClick={() => setEditingRowId(null)} style={{ color: '#16a34a' }}>✅</button>
                            ) : (
                              <button className="button-icon" title="Edit" onClick={() => setEditingRowId(c.id)} style={{ color: '#3b82f6' }}>✏️</button>
                            )}
                            <button className="button-icon" title="Delete" onClick={() => removeRow(actualIdx)} style={{ color: '#ef4444' }}>✕</button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            <tfoot>
              {subTab === 'mahavitaran' ? (
                <tr style={{ background: '#f8fafc', fontWeight: 700 }}>
                  <td colSpan={3} style={{ textAlign: 'right' }}>GRAND TOTAL</td>
                  <td style={{ textAlign: 'right', color: '#ea580c' }}>{fmt(totalConsumption)}</td>
                  <td colSpan={4}></td>
                  <td></td>
                  <td style={{ textAlign: 'right', color: '#2563eb' }}>₹{fmt(totalAmount)}</td>
                  <td></td>
                </tr>
              ) : (
                <tr style={{ background: '#f8fafc', fontWeight: 700 }}>
                  <td colSpan={4} style={{ textAlign: 'right' }}>GRAND TOTAL</td>
                  <td style={{ textAlign: 'right', color: '#ea580c' }}>{fmt(totalConsumption)}</td>
                  <td></td>
                  <td style={{ textAlign: 'right', color: '#2563eb' }}>₹{fmt(totalAmount)}</td>
                  <td></td>
                </tr>
              )}
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
