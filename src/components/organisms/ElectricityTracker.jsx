import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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

export const DEFAULT_TATA_SEED = [
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

export default function ElectricityTracker({ isAdmin = false }) {
  const [subTab, setSubTab] = useState('tata'); // 'tata', 'buildingA', 'mahavitaran'

  const [tataBills, setTataBills] = useState(DEFAULT_TATA_SEED);
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
        setTataBills(DEFAULT_TATA_SEED);
        setBuildingABills([]);
        setMahavitaranBills([]);
        setSaveMsg('Ready (Local/Offline)');
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
          const tataData = snapTata.exists() ? snapTata.data().bills || [] : [];
          setTataBills(tataData.length > 0 ? tataData : DEFAULT_TATA_SEED);
          setBuildingABills(snapBuildingA.exists() ? snapBuildingA.data().bills || [] : []);
          setMahavitaranBills(snapMahavitaran.exists() ? snapMahavitaran.data().bills || [] : []);
          setSaveMsg(`Synced`);
        }
      } catch (err) {
        console.error('Bills load error:', err);
        if (!cancelled) {
          setTataBills(DEFAULT_TATA_SEED);
        }
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

  const [tataTariffMode, setTataTariffMode] = useState('mseb'); // 'mseb' or 'flat'

  const [formData, setFormData] = useState({
    startMonth: '',
    endMonth: '',
    prevReading: '',
    currReading: '',
    ratePerUnit: '13',
    // Mahavitaran / Tata MSEB fields
    msebFixedCharge: '445.00',
    msebEnergyCharge: '',
    msebWheelingRate: '1.60',
    msebFuelAdj: '0.00',
  });

  const sortedTataBills = useMemo(() => {
    return [...tataBills].sort((a, b) => {
      const dateA = a.startMonth ? new Date(a.startMonth) : new Date(0);
      const dateB = b.startMonth ? new Date(b.startMonth) : new Date(0);
      return dateB - dateA;
    });
  }, [tataBills]);

  const latestTataBill = sortedTataBills[0] || null;

  const applyNextTataPeriod = () => {
    if (!latestTataBill) return;
    const lastEnd = latestTataBill.endMonth;
    let nextStart = '';
    let nextEnd = '';
    if (lastEnd) {
      const d = new Date(lastEnd);
      d.setDate(d.getDate() + 1);
      nextStart = d.toISOString().split('T')[0];
      const d2 = new Date(d);
      d2.setMonth(d2.getMonth() + 1);
      d2.setDate(d2.getDate() - 1);
      nextEnd = d2.toISOString().split('T')[0];
    }
    const prevReading = String(latestTataBill.currReading || '');
    setFormData(prev => {
      const next = {
        ...prev,
        startMonth: nextStart || prev.startMonth,
        endMonth: nextEnd || prev.endMonth,
        prevReading: prevReading || prev.prevReading
      };
      if (next.currReading && n(next.currReading) > n(next.prevReading)) {
        const units = n(next.currReading) - n(next.prevReading);
        const { energyTotal, fuelTotal } = calculateMahavitaranSlabs(units);
        next.msebEnergyCharge = energyTotal.toFixed(2);
        next.msebFuelAdj = fuelTotal.toFixed(2);
      }
      return next;
    });
  };

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

      // Auto-calculate slabs for Mahavitaran tab OR Tata tab with MSEB method
      if ((subTab === 'mahavitaran' || (subTab === 'tata' && tataTariffMode === 'mseb')) && (field === 'prevReading' || field === 'currReading')) {
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

    if (subTab === 'mahavitaran' || (subTab === 'tata' && tataTariffMode === 'mseb')) {
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

    if (subTab === 'mahavitaran' || subTab === 'tata') {
      if (['prevReading', 'currReading', 'msebFixedCharge', 'msebEnergyCharge', 'msebWheelingRate', 'msebFuelAdj', 'fixed', 'energy', 'wheelTotal', 'fuel', 'ratePerUnit'].includes(field)) {
        if (updated.msebEnergyCharge || updated.energy || updated.fixed) {
          const fixedVal = updated.msebFixedCharge || updated.fixed || '445.00';
          const wheelVal = updated.msebWheelingRate || '1.60';
          const calc = calculateMahavitaranBill(
            updated.prevReading, updated.currReading,
            fixedVal, updated.msebEnergyCharge || updated.energy,
            wheelVal, updated.msebFuelAdj || updated.fuel
          );
          Object.assign(updated, calc);
        } else {
          const prev = n(updated.prevReading);
          const curr = n(updated.currReading);
          const rate = n(updated.ratePerUnit || 13);
          updated.consumption = curr - prev;
          updated.baseAmount = updated.consumption * rate;
          updated.grandTotal = updated.baseAmount;
        }
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

  const handlePrintTataBill = (bill) => {
    const consumption = n(bill.consumption) || (n(bill.currReading) - n(bill.prevReading));
    const fixed = n(bill.fixed || bill.msebFixedCharge || 445);
    const energy = n(bill.energy || bill.msebEnergyCharge || 0);
    const wheelTotal = n(bill.wheelTotal || (consumption * n(bill.msebWheelingRate || 1.6)));
    const fuel = n(bill.fuel || bill.msebFuelAdj || 0);
    const subtotal = n(bill.subtotal) || (fixed + energy + wheelTotal + fuel);
    const duty = n(bill.duty) || (subtotal * 0.16);
    const grandTotal = n(bill.grandTotal) || Math.round(subtotal + duty);
    const generatedDate = new Intl.DateTimeFormat('en-IN', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    }).format(new Date());

    const billHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Tata Electricity Sub-meter Bill — ${formatDateLabel(bill.startMonth)} to ${formatDateLabel(bill.endMonth)}</title>
        <meta charset="utf-8" />
        <style>
          @page {
            size: A4 portrait;
            margin: 14mm 12mm 14mm 12mm;
          }
          * { box-sizing: border-box; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            color: #0f172a;
            margin: 0;
            padding: 16px;
            background: #ffffff;
            font-size: 11px;
            line-height: 1.5;
          }
          .bill-card {
            border: 2px solid #0f172a;
            border-radius: 8px;
            padding: 24px;
            position: relative;
          }
          .header {
            text-align: center;
            border-bottom: 2px solid #0f172a;
            padding-bottom: 16px;
            margin-bottom: 20px;
          }
          .title {
            font-size: 19px;
            font-weight: 800;
            color: #0f172a;
            margin: 0 0 4px 0;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .subtitle {
            font-size: 10px;
            color: #475569;
            margin-bottom: 8px;
          }
          .invoice-tag {
            display: inline-block;
            background: #0f172a;
            color: #ffffff;
            font-size: 11px;
            font-weight: 700;
            padding: 4px 16px;
            border-radius: 4px;
            text-transform: uppercase;
            letter-spacing: 0.8px;
          }
          .meta-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 16px;
            margin-bottom: 18px;
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 6px;
            padding: 12px 16px;
          }
          .meta-box h4 {
            margin: 0 0 6px 0;
            font-size: 11px;
            text-transform: uppercase;
            color: #64748b;
            letter-spacing: 0.5px;
          }
          .meta-item {
            margin-bottom: 4px;
            font-size: 10.5px;
          }
          .meta-item strong {
            display: inline-block;
            width: 130px;
            color: #334155;
          }
          .reading-card {
            display: flex;
            justify-content: space-around;
            background: #f0f9ff;
            border: 1px solid #bae6fd;
            border-radius: 6px;
            padding: 12px;
            margin-bottom: 18px;
            text-align: center;
          }
          .reading-col .val {
            font-size: 17px;
            font-weight: 800;
            color: #0369a1;
          }
          .reading-col .lbl {
            font-size: 9px;
            text-transform: uppercase;
            font-weight: 700;
            color: #64748b;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 18px;
            font-size: 10.5px;
          }
          th {
            background: #0f172a;
            color: #ffffff;
            font-weight: 700;
            padding: 7px 10px;
            text-align: left;
            border: 1px solid #0f172a;
          }
          td {
            padding: 7px 10px;
            border: 1px solid #cbd5e1;
            vertical-align: middle;
          }
          tr:nth-child(even) td {
            background: #f8fafc;
          }
          .amount-col {
            text-align: right;
            font-family: monospace;
            font-weight: 600;
            font-size: 11px;
          }
          .subtotal-row td {
            background: #f1f5f9;
            font-weight: 700;
          }
          .grand-total-row td {
            background: #0f172a !important;
            color: #ffffff;
            font-weight: 800;
            font-size: 13px;
          }
          .grand-total-row .amount-col {
            color: #4ade80;
            font-size: 14px;
          }
          .bank-details {
            background: #fefce8;
            border: 1px solid #fef08a;
            border-radius: 6px;
            padding: 10px 14px;
            margin-bottom: 20px;
            font-size: 10px;
          }
          .bank-details h4 {
            margin: 0 0 4px 0;
            font-size: 10.5px;
            color: #854d0e;
            text-transform: uppercase;
          }
          .signatures {
            display: flex;
            justify-content: space-between;
            margin-top: 30px;
            page-break-inside: avoid;
          }
          .sig-box {
            text-align: center;
            width: 28%;
          }
          .sig-line {
            border-top: 1px solid #0f172a;
            padding-top: 6px;
            font-size: 10px;
            font-weight: 700;
            color: #0f172a;
          }
          .stamp-box {
            border: 1px dashed #94a3b8;
            border-radius: 4px;
            height: 50px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #94a3b8;
            font-size: 8.5px;
            margin-bottom: 6px;
          }
          .footer {
            margin-top: 16px;
            padding-top: 8px;
            border-top: 1px dashed #cbd5e1;
            font-size: 8.5px;
            color: #94a3b8;
            display: flex;
            justify-content: space-between;
          }
        </style>
      </head>
      <body>
        <div class="bill-card">
          <div class="header">
            <div class="title">Majestique Euriska Co-Op Housing Society Ltd.</div>
            <div class="subtitle">
              Registration No: PNA/PNA(2)/HSG/(TC)/17066/2021-2022 • Survey No. 43/1 &amp; 43/2, Near EON IT Park, Kharadi, Pune - 411014
            </div>
            <div class="invoice-tag">Tata Electricity Sub-Meter Tax Invoice / Bill</div>
          </div>

          <div class="meta-grid">
            <div class="meta-box">
              <h4>Consumer &amp; Location Details</h4>
              <div class="meta-item"><strong>Consumer / Tenant:</strong> Tata Play Limited (Tata Sky Broadband)</div>
              <div class="meta-item"><strong>Connection Type:</strong> Sub-Meter Commercial Infrastructure</div>
              <div class="meta-item"><strong>Meter No / Tag:</strong> TATA-EUR-SB-01</div>
              <div class="meta-item"><strong>Location:</strong> Club House Terrace Hub, Majestique Euriska</div>
            </div>
            <div class="meta-box">
              <h4>Billing &amp; Invoice Reference</h4>
              <div class="meta-item"><strong>Invoice No:</strong> TEB-${bill.id || Date.now()}</div>
              <div class="meta-item"><strong>Bill Date:</strong> ${generatedDate}</div>
              <div class="meta-item"><strong>Billing Period:</strong> ${formatDateLabel(bill.startMonth)} to ${formatDateLabel(bill.endMonth)}</div>
              <div class="meta-item"><strong>Tariff Structure:</strong> Maharashtra Commercial Sub-Meter</div>
            </div>
          </div>

          <div class="reading-card">
            <div class="reading-col">
              <div class="val">${fmt(n(bill.prevReading))}</div>
              <div class="lbl">Previous Reading</div>
            </div>
            <div class="reading-col">
              <div class="val">${fmt(n(bill.currReading))}</div>
              <div class="lbl">Current Reading</div>
            </div>
            <div class="reading-col">
              <div class="val" style="color: #ea580c;">${fmt(consumption)}</div>
              <div class="lbl">Units Consumed</div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th style="width: 35px; text-align: center;">#</th>
                <th>Itemized Tariff Description</th>
                <th style="width: 140px; text-align: center;">Rate / Basis</th>
                <th style="width: 140px; text-align: right;">Amount (₹)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style="text-align: center; color: #64748b;">1</td>
                <td><strong>Fixed / Demand Charges</strong> (स्थिर आकार)</td>
                <td style="text-align: center; color: #64748b;">Monthly Fixed</td>
                <td class="amount-col">₹${fmt(fixed)}</td>
              </tr>
              <tr>
                <td style="text-align: center; color: #64748b;">2</td>
                <td><strong>Energy Charges</strong> (वीज आकार - MSEB Commercial Slabs)</td>
                <td style="text-align: center; color: #64748b;">${fmt(consumption)} Units</td>
                <td class="amount-col">₹${fmt(energy)}</td>
              </tr>
              <tr>
                <td style="text-align: center; color: #64748b;">3</td>
                <td><strong>Wheeling Charges</strong> (वहन आकार)</td>
                <td style="text-align: center; color: #64748b;">@ ₹1.60 / Unit</td>
                <td class="amount-col">₹${fmt(wheelTotal)}</td>
              </tr>
              <tr>
                <td style="text-align: center; color: #64748b;">4</td>
                <td><strong>Fuel Adjustment Charges</strong> (FAC - इंधन अधिभार)</td>
                <td style="text-align: center; color: #64748b;">Per Unit Slabs</td>
                <td class="amount-col">₹${fmt(fuel)}</td>
              </tr>
              <tr class="subtotal-row">
                <td colspan="3" style="text-align: right;">SUBTOTAL (Base Bill Amount)</td>
                <td class="amount-col" style="color: #0f172a;">₹${fmt(subtotal)}</td>
              </tr>
              <tr>
                <td style="text-align: center; color: #64748b;">5</td>
                <td><strong>Maharashtra Electricity Duty</strong> (शासकीय वीज शुल्क @ 16%)</td>
                <td style="text-align: center; color: #64748b;">16.00% of Subtotal</td>
                <td class="amount-col">₹${fmt(duty)}</td>
              </tr>
              <tr class="grand-total-row">
                <td colspan="3" style="text-align: right; text-transform: uppercase;">NET TOTAL PAYABLE (ROUNDED)</td>
                <td class="amount-col">₹${fmt(grandTotal)}</td>
              </tr>
            </tbody>
          </table>

          <div class="bank-details">
            <h4>Society Bank Account for Payment (NEFT / RTGS / IMPS)</h4>
            <div><strong>Account Name:</strong> MAJESTIQUE EURISKA CO-OPERATIVE HOUSING SOCIETY LTD.</div>
            <div><strong>Bank:</strong> Union Bank of India / HDFC Bank • <strong>Branch:</strong> Kharadi Pune</div>
            <div><strong>A/C No:</strong> 50200065450992 • <strong>Payment Due:</strong> Within 10 Days of Bill Issuance</div>
          </div>

          <div class="signatures">
            <div class="sig-box">
              <div class="stamp-box">Society Manager Seal</div>
              <div class="sig-line">Prepared By (Society Office)</div>
            </div>
            <div class="sig-box">
              <div class="stamp-box">Official Treasurer Seal</div>
              <div class="sig-line">Society Treasurer</div>
            </div>
            <div class="sig-box">
              <div class="stamp-box">Official Secretary Seal</div>
              <div class="sig-line">Society Secretary / Chairman</div>
            </div>
          </div>

          <div class="footer">
            <div>Majestique Euriska CHS Ltd. • Tata Sub-Meter Electricity Accounting</div>
            <div>Generated on: ${generatedDate} • Valid Computer Generated Document</div>
          </div>
        </div>

        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 250);
          };
        </script>
      </body>
      </html>
    `;

    const printWin = window.open('', '_blank');
    if (printWin) {
      printWin.document.write(billHtml);
      printWin.document.close();
    }
  };

  const handlePrintAllTataBills = () => {
    const printedDate = new Intl.DateTimeFormat('en-IN', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    }).format(new Date());

    const docHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Tata Electricity Bills — Statement of Account</title>
        <meta charset="utf-8" />
        <style>
          @page { size: A4 landscape; margin: 12mm 10mm; }
          * { box-sizing: border-box; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
            color: #0f172a;
            padding: 12px;
            font-size: 10px;
          }
          .header {
            text-align: center;
            border-bottom: 2px solid #0f172a;
            padding-bottom: 12px;
            margin-bottom: 14px;
          }
          .title { font-size: 16px; font-weight: 800; text-transform: uppercase; margin: 0 0 4px 0; }
          .sub { font-size: 10px; color: #475569; margin: 0 0 6px 0; }
          .badge {
            display: inline-block; background: #0f172a; color: #fff;
            padding: 3px 12px; border-radius: 4px; font-weight: 700; font-size: 11px;
          }
          .kpi-row { display: flex; gap: 12px; margin-bottom: 12px; }
          .kpi { flex: 1; border: 1px solid #cbd5e1; border-radius: 6px; padding: 8px 12px; background: #f8fafc; }
          table { width: 100%; border-collapse: collapse; font-size: 9.5px; }
          th { background: #0f172a; color: #fff; padding: 6px 8px; text-align: left; }
          td { padding: 6px 8px; border: 1px solid #cbd5e1; }
          tr:nth-child(even) td { background: #f8fafc; }
          .amount { text-align: right; font-family: monospace; font-weight: 600; }
          .total-row td { background: #0f172a !important; color: #fff; font-weight: 800; }
          .signatures { display: flex; justify-content: space-between; margin-top: 24px; page-break-inside: avoid; }
          .sig-box { text-align: center; width: 28%; }
          .sig-line { border-top: 1px solid #0f172a; padding-top: 6px; font-weight: 700; font-size: 10px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="title">Majestique Euriska Co-operative Housing Society Ltd.</div>
          <div class="sub">Survey No. 43/1 &amp; 43/2, Near EON IT Park, Kharadi, Pune - 411014</div>
          <div class="badge">Tata Electricity Sub-Meter Consolidated Account Statement</div>
        </div>
        <div class="kpi-row">
          <div class="kpi">
            <div style="font-size: 9px; color: #64748b; font-weight: 700;">CONSUMER / CLIENT</div>
            <div style="font-size: 13px; font-weight: 800; color: #0f172a;">Tata Play Limited (Broadband Hub)</div>
          </div>
          <div class="kpi">
            <div style="font-size: 9px; color: #64748b; font-weight: 700;">TOTAL CONSUMPTION</div>
            <div style="font-size: 13px; font-weight: 800; color: #ea580c;">${fmt(totalConsumption)} Units</div>
          </div>
          <div class="kpi">
            <div style="font-size: 9px; color: #64748b; font-weight: 700;">TOTAL BILL PAID / BILLED</div>
            <div style="font-size: 13px; font-weight: 800; color: #0284c7;">₹${fmt(totalAmount)}</div>
          </div>
        </div>
        <table>
          <thead>
            <tr>
              <th style="width: 30px; text-align: center;">#</th>
              <th>Billing Period</th>
              <th style="width: 75px; text-align: right;">Prev Read</th>
              <th style="width: 75px; text-align: right;">Curr Read</th>
              <th style="width: 70px; text-align: right;">Units</th>
              <th style="width: 75px; text-align: right;">Fixed (₹)</th>
              <th style="width: 90px; text-align: right;">Energy (₹)</th>
              <th style="width: 85px; text-align: right;">Wheeling (₹)</th>
              <th style="width: 75px; text-align: right;">FAC Fuel (₹)</th>
              <th style="width: 80px; text-align: right;">Duty 16% (₹)</th>
              <th style="width: 100px; text-align: right;">Grand Total (₹)</th>
            </tr>
          </thead>
          <tbody>
            ${filteredBills.map((b, i) => `
              <tr>
                <td style="text-align: center;">${i + 1}</td>
                <td><strong>${formatDateLabel(b.startMonth)}</strong> to <strong>${formatDateLabel(b.endMonth)}</strong></td>
                <td class="amount">${n(b.prevReading)}</td>
                <td class="amount">${n(b.currReading)}</td>
                <td class="amount" style="color: #ea580c; font-weight: 700;">${n(b.consumption)}</td>
                <td class="amount">₹${fmt(n(b.fixed || b.msebFixedCharge || 445))}</td>
                <td class="amount">₹${fmt(n(b.energy || b.msebEnergyCharge || 0))}</td>
                <td class="amount">₹${fmt(n(b.wheelTotal || (n(b.consumption) * 1.6)))}</td>
                <td class="amount">₹${fmt(n(b.fuel || b.msebFuelAdj || 0))}</td>
                <td class="amount">₹${fmt(n(b.duty || (n(b.grandTotal) * 0.16 / 1.16)))}</td>
                <td class="amount" style="color: #0284c7; font-weight: 700;">₹${fmt(n(b.grandTotal))}</td>
              </tr>
            `).join('')}
            <tr class="total-row">
              <td colspan="4" style="text-align: right;">GRAND TOTAL</td>
              <td class="amount" style="color: #ea580c;">${fmt(totalConsumption)}</td>
              <td colspan="5"></td>
              <td class="amount" style="color: #4ade80;">₹${fmt(totalAmount)}</td>
            </tr>
          </tbody>
        </table>
        <div class="signatures">
          <div class="sig-box">
            <div class="sig-line">Prepared By (Society Manager)</div>
          </div>
          <div class="sig-box">
            <div class="sig-line">Society Treasurer</div>
          </div>
          <div class="sig-box">
            <div class="sig-line">Society Secretary / Chairman</div>
          </div>
        </div>
        <script>
          window.onload = function() {
            setTimeout(function() { window.print(); }, 250);
          };
        </script>
      </body>
      </html>
    `;
    const win = window.open('', '_blank');
    if (win) {
      win.document.write(docHtml);
      win.document.close();
    }
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
    if (subTab === 'mahavitaran' || subTab === 'tata') {
      rows = filteredBills.map((c, i) => ({
        'Sr. No': i + 1,
        'Start Date': formatDateLabel(c.startMonth),
        'End Date': formatDateLabel(c.endMonth),
        'Previous Reading': n(c.prevReading),
        'Current Reading': n(c.currReading),
        'Units Consumed': n(c.consumption),
        'Fixed Charge (₹)': n(c.fixed || c.msebFixedCharge || 445),
        'Energy Charge (₹)': n(c.energy || c.msebEnergyCharge || 0),
        'Wheeling Charge (₹)': n(c.wheelTotal || (n(c.consumption) * 1.6)),
        'Fuel Adj (₹)': n(c.fuel || c.msebFuelAdj || 0),
        'Electricity Duty 16% (₹)': n(c.duty || (n(c.grandTotal) * 0.16 / 1.16)),
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
          {renderTabButton('tata', '⚡️', 'Tata Electricity Bill')}
          {renderTabButton('buildingA', '🏢', 'A Building Electricity')}
          {renderTabButton('mahavitaran', '🔌', 'Mahavitaran (MSEB)')}
        </div>
      </div>

      <div className="table-card" style={{ padding: 0 }}>
        <div className="attendance-table-card__header">
          <div>
            <p className="eyebrow">
              {subTab === 'tata' ? 'Tata Electricity Sub-Meter Billing' : (subTab === 'mahavitaran' ? 'Mahavitaran Dashboard' : 'A Building Dashboard')}
            </p>
            <h3 style={{ marginBottom: '4px' }}>
              {subTab === 'tata' ? 'Tata Electricity Bills' : (subTab === 'mahavitaran' ? 'MSEB Detailed Bills' : 'A Building Bills')}
            </h3>
            {subTab === 'tata' && <p style={{ color: 'var(--muted)', fontSize: '0.9rem', margin: 0 }}>Consumer: Tata Play Limited (Tata Sky Broadband Hub) • Sub-Meter No: TATA-EUR-01 • Billing Cycle: 15th to 14th Monthly</p>}
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
          {subTab === 'tata' && (
            <button
              className="button-primary"
              onClick={handlePrintAllTataBills}
              style={{ padding: '10px 20px', height: '44px', marginTop: 'auto', background: '#0284c7', borderColor: '#0284c7', display: 'flex', alignItems: 'center', gap: '6px' }}
              title="Print or export complete statement of Tata electricity bills"
            >
              <span>🖨️</span> Export PDF Summary
            </button>
          )}
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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', flexWrap: 'wrap', gap: '12px' }}>
            <h4 style={{ margin: 0, color: 'var(--ink)' }}>
              ➕ {subTab === 'tata' ? 'Create New Tata Electricity Bill' : (subTab === 'mahavitaran' ? 'Add Mahavitaran MSEB Bill' : 'Add A Building Bill')}
            </h4>
            {subTab === 'tata' && (
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--muted)', fontWeight: 600 }}>Billing Tariff:</span>
                <select
                  value={tataTariffMode}
                  onChange={e => setTataTariffMode(e.target.value)}
                  className="attendance-register-input"
                  style={{ width: 'auto', padding: '6px 12px', background: 'white', fontSize: '0.85rem', fontWeight: 600 }}
                >
                  <option value="mseb">MSEB Commercial Slabs (Standard Tata Tower)</option>
                  <option value="flat">Commercial Flat Rate (₹/unit)</option>
                </select>
                {latestTataBill && (
                  <button
                    type="button"
                    className="button-secondary"
                    onClick={applyNextTataPeriod}
                    style={{ padding: '6px 14px', fontSize: '0.85rem', background: '#eff6ff', color: '#1d4ed8', borderColor: '#bfdbfe', fontWeight: 600 }}
                    title="Pre-fills start date from last cycle and previous reading"
                  >
                    ⚡ Auto-Fill Next Cycle ({latestTataBill.currReading} U)
                  </button>
                )}
              </div>
            )}
          </div>

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

            {subTab === 'mahavitaran' || (subTab === 'tata' && tataTariffMode === 'mseb') ? (
              <>
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
              <button type="submit" className="button-primary" style={{ padding: '10px 24px', width: 'auto', background: '#0284c7', borderColor: '#0284c7' }}>
                ⚡ Calculate &amp; Create Bill
              </button>
            </div>
          </form>

          {(subTab === 'mahavitaran' || (subTab === 'tata' && tataTariffMode === 'mseb')) && n(formData.currReading) > n(formData.prevReading) && (
            <div style={{ marginTop: '24px', padding: '16px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h5 style={{ margin: 0, color: '#334155' }}>
                  {subTab === 'tata' ? 'Tata Commercial Slab Breakdown' : 'MSEB Slab Breakdown'} for {n(formData.currReading) - n(formData.prevReading)} Units
                </h5>
                <span style={{ fontSize: '0.85rem', color: '#0369a1', fontWeight: 700 }}>
                  Estimated Duty (16%): ₹{((n(formData.msebFixedCharge) + n(formData.msebEnergyCharge) + ((n(formData.currReading) - n(formData.prevReading)) * n(formData.msebWheelingRate)) + n(formData.msebFuelAdj)) * 0.16).toFixed(2)}
                </span>
              </div>
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
          <table className="attendance-table" style={{ minWidth: (subTab === 'mahavitaran' || subTab === 'tata') ? 1200 : 1000 }}>
            <thead>
              {subTab === 'mahavitaran' || subTab === 'tata' ? (
                <tr style={{ background: '#f8fafc' }}>
                  <th style={{ width: 50 }}>Sr.</th>
                  <th style={{ width: 200 }}>Billing Period</th>
                  <th style={{ width: 95, textAlign: 'right' }}>Readings</th>
                  <th style={{ width: 85, textAlign: 'right' }}>Units</th>
                  <th style={{ width: 90, textAlign: 'right' }}>Fixed (स्थिर)</th>
                  <th style={{ width: 110, textAlign: 'right' }}>Energy (वीज)</th>
                  <th style={{ width: 105, textAlign: 'right' }}>Wheeling (वहन)</th>
                  <th style={{ width: 95, textAlign: 'right' }}>Fuel (इंधन)</th>
                  <th style={{ width: 95, textAlign: 'right' }}>Duty (16%)</th>
                  <th style={{ width: 115, textAlign: 'right', background: '#f0f9ff' }}>Grand Total</th>
                  <th style={{ width: subTab === 'tata' ? 110 : 80, textAlign: 'center' }}>Actions</th>
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

                  if (subTab === 'mahavitaran' || subTab === 'tata') {
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
                            <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>{formatDateLabel(c.startMonth)} -<br />{formatDateLabel(c.endMonth)}</span>
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
                        <td style={{ textAlign: 'right', color: '#ea580c', fontWeight: 700, verticalAlign: 'middle' }}>{n(c.consumption)}</td>
                        <td style={{ textAlign: 'right' }}>
                          {isEditing ? <input className="attendance-register-input" style={{ padding: '4px' }} type="number" step="any" value={c.msebFixedCharge || c.fixed} onChange={e => updateRow(actualIdx, 'msebFixedCharge', e.target.value)} /> : `₹${fmt(n(c.fixed || c.msebFixedCharge || 445))}`}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          {isEditing ? <input className="attendance-register-input" style={{ padding: '4px' }} type="number" step="any" value={c.msebEnergyCharge || c.energy} onChange={e => updateRow(actualIdx, 'msebEnergyCharge', e.target.value)} /> : `₹${fmt(n(c.energy || c.msebEnergyCharge || 0))}`}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          {isEditing ? <input className="attendance-register-input" style={{ padding: '4px' }} type="number" step="any" value={c.msebWheelingRate || c.wheelTotal} onChange={e => updateRow(actualIdx, 'msebWheelingRate', e.target.value)} /> : `₹${fmt(n(c.wheelTotal || (n(c.consumption) * 1.6)))}`}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          {isEditing ? <input className="attendance-register-input" style={{ padding: '4px' }} type="number" step="any" value={c.msebFuelAdj || c.fuel} onChange={e => updateRow(actualIdx, 'msebFuelAdj', e.target.value)} /> : `₹${fmt(n(c.fuel || c.msebFuelAdj || 0))}`}
                        </td>
                        <td style={{ textAlign: 'right' }}>₹{fmt(n(c.duty || (n(c.grandTotal) * 0.16 / 1.16)))}</td>
                        <td style={{ textAlign: 'right', color: '#2563eb', fontWeight: 800, verticalAlign: 'middle', fontSize: '0.95rem' }}>₹{fmt(c.grandTotal)}</td>
                        <td style={{ verticalAlign: 'middle', textAlign: 'center' }}>
                          <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', alignItems: 'center' }}>
                            {subTab === 'tata' && (
                              <button
                                className="button-icon"
                                title="Print / Export Bill Invoice"
                                onClick={() => handlePrintTataBill(c)}
                                style={{ color: '#0284c7', fontSize: '1.1rem', cursor: 'pointer', padding: '4px' }}
                              >
                                🖨️
                              </button>
                            )}
                            {isAdmin && (
                              <>
                                {isEditing ? (
                                  <button className="button-icon" title="Save" onClick={() => setEditingRowId(null)} style={{ color: '#16a34a' }}>✅</button>
                                ) : (
                                  <button className="button-icon" title="Edit" onClick={() => setEditingRowId(c.id)} style={{ color: '#3b82f6' }}>✏️</button>
                                )}
                                <button className="button-icon" title="Delete" onClick={() => removeRow(actualIdx)} style={{ color: '#ef4444' }}>✕</button>
                              </>
                            )}
                          </div>
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
              {subTab === 'mahavitaran' || subTab === 'tata' ? (
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
