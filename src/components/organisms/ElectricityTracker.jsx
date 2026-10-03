import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db, isFirebaseConfigured, ensureFirebaseSession } from '../../firebase.js';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import * as XLSX from 'xlsx';

function formatDateLabel(val) {
  if (!val) return '—';
  if (/^\d{4}-\d{2}-\d{2}$/.test(val)) {
    const [y, m, d] = val.split('-').map(Number);
    return new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(y, m - 1, d));
  }
  if (/^\d{4}-\d{2}$/.test(val)) {
    const [y, m] = val.split('-').map(Number);
    return new Intl.DateTimeFormat('en-IN', { month: 'short', year: 'numeric' }).format(new Date(y, m - 1, 1));
  }
  return val;
}

const n = (v) => parseFloat(v) || 0;
const fmt = (v) => Number(v).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// Compute duration string from two ISO dates
export const computeBillingDuration = (startStr, endStr) => {
  if (!startStr || !endStr) return '';
  const s = new Date(startStr);
  const e = new Date(endStr);
  if (isNaN(s) || isNaN(e)) return '';
  const diffDays = Math.max(1, Math.round((e - s) / (1000 * 60 * 60 * 24)));
  const approxMonths = (diffDays / 30.4).toFixed(1);
  const wholeMonths = Math.round(diffDays / 30.4);
  const monthStr = Math.abs(parseFloat(approxMonths) - wholeMonths) < 0.2
    ? `${wholeMonths} Month${wholeMonths > 1 ? 's' : ''}`
    : `~${approxMonths} Months`;
  return `${monthStr} (${diffDays} Days)`;
};

// 4-Digit Sub-meter Calculation with 10,000 Reset Rollover
// Formula: if curr < prev: (10,000 - prev) + curr, else: curr - prev
export const calculateSubmeterRollover = (prevStr, currStr, manualUnits = null) => {
  const prev = parseFloat(prevStr) || 0;
  const curr = parseFloat(currStr) || 0;
  if (manualUnits !== null && manualUnits !== undefined && !isNaN(manualUnits) && manualUnits !== '') {
    const u = parseFloat(manualUnits);
    const isRollover = curr < prev;
    return {
      units: u,
      isRollover,
      formulaText: isRollover
        ? `(10,000 - ${prev}) + ${curr} = ${u} units (Reset after 10000)`
        : `${curr} - ${prev} = ${u} units`
    };
  }
  if (curr < prev) {
    const units = (10000 - prev) + curr;
    return {
      units,
      isRollover: true,
      formulaText: `(10,000 - ${prev}) + ${curr} = ${units} units (Reset after 10000)`
    };
  }
  const units = curr - prev;
  return {
    units,
    isRollover: false,
    formulaText: `${curr} - ${prev} = ${units} units`
  };
};

export const calculateTataSubmeterBill = (prevReadingStr, currReadingStr, rateStr, manualUnits = null) => {
  const { units, isRollover, formulaText } = calculateSubmeterRollover(prevReadingStr, currReadingStr, manualUnits);
  const rate = parseFloat(rateStr) || 13;
  const grandTotal = units * rate;
  return {
    consumption: units,
    ratePerUnit: rate,
    isRollover,
    calculationNote: formulaText,
    calculationFormula: `${units.toLocaleString('en-IN')} units × ₹${rate.toFixed(2)}/unit`,
    baseAmount: grandTotal,
    grandTotal
  };
};

// Verified Audited Tata Play Sub-Meter Bills (Sep 2025 to Mar 2023)
export const DEFAULT_TATA_SEED = [
  {
    id: 2001,
    periodLabel: 'Sep 25 to 18th May 26',
    startMonth: '2025-09-01',
    endMonth: '2026-05-18',
    duration: '~8.5 Months (260 Days)',
    prevReading: '2568',
    currReading: '1557',
    isRollover: true,
    consumption: 8988,
    ratePerUnit: 13,
    calculationNote: '(10,000 - 2,568) + 1,557 = 8,988 units (Reset after 10000)',
    calculationFormula: '8,988 units × ₹13.00/unit',
    baseAmount: 116844,
    grandTotal: 116844,
    status: 'Invoiced'
  },
  {
    id: 2002,
    periodLabel: 'Mar 25 to August 25',
    startMonth: '2025-03-01',
    endMonth: '2025-08-31',
    duration: '6 Months (184 Days)',
    prevReading: '9073',
    currReading: '2568',
    isRollover: true,
    consumption: 3495,
    ratePerUnit: 13,
    calculationNote: '(10,000 - 9,073) + 2,568 = 3,495 units (Reset after 10000)',
    calculationFormula: '3,495 units × ₹13.00/unit',
    baseAmount: 45435,
    grandTotal: 45435,
    status: 'Paid'
  },
  {
    id: 2003,
    periodLabel: 'Nov 24 to Feb 25',
    startMonth: '2024-11-01',
    endMonth: '2025-02-28',
    duration: '4 Months (120 Days)',
    prevReading: '6996',
    currReading: '9073',
    isRollover: false,
    consumption: 2077,
    ratePerUnit: 13,
    calculationNote: '9,073 - 6,996 = 2,077 units',
    calculationFormula: '2,077 units × ₹13.00/unit',
    baseAmount: 27001,
    grandTotal: 27001,
    status: 'Paid'
  },
  {
    id: 2004,
    periodLabel: 'Jun 24 to Oct 24',
    startMonth: '2024-06-01',
    endMonth: '2024-10-31',
    duration: '5 Months (153 Days)',
    prevReading: '4354',
    currReading: '6996',
    isRollover: false,
    consumption: 2642,
    ratePerUnit: 13,
    calculationNote: '6,996 - 4,354 = 2,642 units',
    calculationFormula: '2,642 units × ₹13.00/unit',
    baseAmount: 34346,
    grandTotal: 34346,
    status: 'Paid'
  },
  {
    id: 2005,
    periodLabel: 'Feb 24 to May 24',
    startMonth: '2024-02-01',
    endMonth: '2024-05-31',
    duration: '4 Months (121 Days)',
    prevReading: '2607',
    currReading: '4354',
    isRollover: false,
    consumption: 1747,
    ratePerUnit: 12.50,
    calculationNote: '4,354 - 2,607 = 1,747 units',
    calculationFormula: '1,747 units × ₹12.50/unit',
    baseAmount: 21837.5,
    grandTotal: 21837.5,
    status: 'Paid'
  },
  {
    id: 2006,
    periodLabel: 'Nov 23 to Jan 24',
    startMonth: '2023-11-01',
    endMonth: '2024-01-31',
    duration: '3 Months (92 Days)',
    prevReading: '1353',
    currReading: '2607',
    isRollover: false,
    consumption: 1254,
    ratePerUnit: 11.50,
    calculationNote: '2,607 - 1,353 = 1,254 units',
    calculationFormula: '1,254 units × ₹11.50/unit',
    baseAmount: 14421,
    grandTotal: 14421,
    status: 'Paid'
  },
  {
    id: 2007,
    periodLabel: 'Aug 23 to Oct 23',
    startMonth: '2023-08-01',
    endMonth: '2023-10-31',
    duration: '3 Months (92 Days)',
    prevReading: '0177',
    currReading: '1353',
    isRollover: false,
    consumption: 1176,
    ratePerUnit: 11.50,
    calculationNote: '1,353 - 177 = 1,176 units',
    calculationFormula: '1,176 units × ₹11.50/unit',
    baseAmount: 13524,
    grandTotal: 13524,
    status: 'Paid'
  },
  {
    id: 2008,
    periodLabel: 'Mar 23 to Jul 23',
    startMonth: '2023-03-01',
    endMonth: '2023-07-31',
    duration: '5 Months (153 Days)',
    prevReading: '7629',
    currReading: '0177',
    isRollover: true,
    consumption: 2548,
    ratePerUnit: 11.50,
    calculationNote: '(10,000 - 7,629) + 177 = 2,548 units (Reset after 10000)',
    calculationFormula: '2,548 units × ₹11.50/unit',
    baseAmount: 29302,
    grandTotal: 29302,
    status: 'Paid'
  }
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

  // Load from Firebase & ensure old template data is replaced with audited Tata bills
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
          let tataData = snapTata.exists() ? snapTata.data().bills || [] : [];
          // If stored data contains the old 9-month template or lacks periodLabel, update it to audited data
          const isOldSeed = tataData.length === 0 ||
            tataData.some(b => b.id === 1001 || b.id === 1009) ||
            !tataData.some(b => b.periodLabel);

          if (isOldSeed) {
            tataData = DEFAULT_TATA_SEED;
            // Overwrite Firebase with new verified data
            try {
              await setDoc(doc(db, 'electricityTracking', tataRecordId), {
                bills: DEFAULT_TATA_SEED,
                updatedAt: new Date().toISOString()
              });
            } catch (err) {
              console.warn('Initial seed sync error:', err);
            }
          }

          setTataBills(tataData);
          setBuildingABills(snapBuildingA.exists() ? snapBuildingA.data().bills || [] : []);
          setMahavitaranBills(snapMahavitaran.exists() ? snapMahavitaran.data().bills || [] : []);
          setSaveMsg('Synced');
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
        updatedAt: new Date().toISOString()
      });
      setSaveStatus('saved');
      setSaveMsg('All changes saved to cloud');
      setTimeout(() => {
        setSaveStatus('idle');
        setSaveMsg('');
      }, 3000);
    } catch (err) {
      console.error('Save error:', err);
      setSaveStatus('error');
      setSaveMsg('Failed to save to cloud');
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

  // Dedicated Form State for New Tata Electricity Bill
  const [formData, setFormData] = useState({
    periodLabel: '',
    duration: '',
    startMonth: '',
    endMonth: '',
    prevReading: '',
    currReading: '',
    ratePerUnit: '13',
    consumption: '',
    // MSEB fields for Mahavitaran tab
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

  // Auto-fill next Tata billing cycle based on the latest bill
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
      d2.setMonth(d2.getMonth() + 4);
      nextEnd = d2.toISOString().split('T')[0];
    }
    const prevReading = String(latestTataBill.currReading || '');
    const autoDuration = nextStart && nextEnd ? computeBillingDuration(nextStart, nextEnd) : '4 Months';
    setFormData(prev => ({
      ...prev,
      periodLabel: `May 26 to Sep 26`,
      startMonth: nextStart || prev.startMonth,
      endMonth: nextEnd || prev.endMonth,
      duration: autoDuration,
      prevReading: prevReading || prev.prevReading,
      ratePerUnit: '13'
    }));
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

      // Auto compute duration if dates change
      if ((field === 'startMonth' || field === 'endMonth') && next.startMonth && next.endMonth) {
        if (!next.duration || next.duration.includes('Days')) {
          next.duration = computeBillingDuration(next.startMonth, next.endMonth);
        }
      }

      // Auto calculate units & preview for Tata bills
      if (subTab === 'tata' && (field === 'prevReading' || field === 'currReading' || field === 'ratePerUnit')) {
        if (next.prevReading !== '' && next.currReading !== '') {
          const { units } = calculateSubmeterRollover(next.prevReading, next.currReading);
          next.consumption = units;
        }
      }

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

    let newBill = {
      ...formData,
      id: Date.now()
    };

    if (subTab === 'tata') {
      const calc = calculateTataSubmeterBill(
        formData.prevReading,
        formData.currReading,
        formData.ratePerUnit,
        formData.consumption ? n(formData.consumption) : null
      );
      const computedDuration = formData.duration || computeBillingDuration(formData.startMonth, formData.endMonth) || 'Custom Period';
      const label = formData.periodLabel || `${formatDateLabel(formData.startMonth)} to ${formatDateLabel(formData.endMonth)}`;

      newBill = {
        ...newBill,
        periodLabel: label,
        duration: computedDuration,
        ...calc,
        status: 'Invoiced'
      };

      const next = [newBill, ...tataBills];
      setTataBills(next);
      triggerAutoSave(next, 'tata');
    } else if (subTab === 'mahavitaran') {
      const prev = n(formData.prevReading);
      const curr = n(formData.currReading);
      if (curr < prev) {
        alert('Current reading cannot be less than previous reading.');
        return;
      }
      const calc = calculateMahavitaranBill(
        formData.prevReading, formData.currReading,
        formData.msebFixedCharge, formData.msebEnergyCharge,
        formData.msebWheelingRate, formData.msebFuelAdj
      );
      newBill = { ...newBill, ...calc };
      const next = [...mahavitaranBills, newBill];
      setMahavitaranBills(next);
      triggerAutoSave(next, 'mahavitaran');
    } else {
      const prev = n(formData.prevReading);
      const curr = n(formData.currReading);
      if (curr < prev) {
        alert('Current reading cannot be less than previous reading.');
        return;
      }
      const consumption = curr - prev;
      const rate = n(formData.ratePerUnit);
      const baseAmount = consumption * rate;
      newBill.consumption = consumption;
      newBill.baseAmount = baseAmount;
      newBill.grandTotal = baseAmount;
      const next = [...buildingABills, newBill];
      setBuildingABills(next);
      triggerAutoSave(next, 'buildingA');
    }

    // Reset form
    setFormData({
      periodLabel: '',
      duration: '',
      startMonth: '',
      endMonth: '',
      prevReading: '',
      currReading: '',
      ratePerUnit: '13',
      consumption: '',
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

    if (subTab === 'tata') {
      if (['prevReading', 'currReading', 'ratePerUnit', 'consumption'].includes(field)) {
        const manualUnits = field === 'consumption' ? n(val) : (updated.consumption ? n(updated.consumption) : null);
        const calc = calculateTataSubmeterBill(
          updated.prevReading,
          updated.currReading,
          updated.ratePerUnit || 13,
          manualUnits
        );
        Object.assign(updated, calc);
      }
    } else if (subTab === 'mahavitaran') {
      if (['prevReading', 'currReading', 'msebFixedCharge', 'msebEnergyCharge', 'msebWheelingRate', 'msebFuelAdj', 'fixed', 'energy', 'wheelTotal', 'fuel'].includes(field)) {
        const fixedVal = updated.msebFixedCharge || updated.fixed || '445.00';
        const wheelVal = updated.msebWheelingRate || '1.60';
        const calc = calculateMahavitaranBill(
          updated.prevReading, updated.currReading,
          fixedVal, updated.msebEnergyCharge || updated.energy,
          wheelVal, updated.msebFuelAdj || updated.fuel
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

  // Print single Tata Play Tax Invoice
  const handlePrintTataBill = (bill) => {
    const consumption = n(bill.consumption) || (n(bill.currReading) - n(bill.prevReading));
    const rate = n(bill.ratePerUnit) || 13;
    const grandTotal = n(bill.grandTotal) || (consumption * rate);
    const generatedDate = new Intl.DateTimeFormat('en-IN', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    }).format(new Date());

    const billHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Tata Electricity Sub-Meter Tax Invoice / Bill — ${bill.periodLabel || 'Commercial Invoice'}</title>
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
            width: 140px;
            color: #334155;
          }
          .reading-card {
            display: grid;
            grid-template-columns: 1fr 1fr 1.2fr 1fr;
            gap: 12px;
            background: #f0f9ff;
            border: 1px solid #bae6fd;
            border-radius: 6px;
            padding: 12px;
            margin-bottom: 18px;
            text-align: center;
          }
          .reading-col .val {
            font-size: 16px;
            font-weight: 800;
            color: #0369a1;
          }
          .reading-col .lbl {
            font-size: 9px;
            text-transform: uppercase;
            font-weight: 700;
            color: #64748b;
            margin-top: 2px;
          }
          .reset-notice {
            background: #fef3c7;
            border: 1px solid #fde68a;
            border-radius: 6px;
            padding: 8px 12px;
            margin-bottom: 16px;
            font-size: 10.5px;
            color: #92400e;
            display: flex;
            align-items: center;
            gap: 8px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 18px;
            font-size: 11px;
          }
          th {
            background: #0f172a;
            color: #ffffff;
            font-weight: 700;
            padding: 8px 12px;
            text-align: left;
            border: 1px solid #0f172a;
          }
          td {
            padding: 8px 12px;
            border: 1px solid #cbd5e1;
            vertical-align: middle;
          }
          tr:nth-child(even) td {
            background: #f8fafc;
          }
          .amount-col {
            text-align: right;
            font-family: monospace;
            font-weight: 700;
            font-size: 11.5px;
          }
          .subtotal-row td {
            background: #f1f5f9;
            font-weight: 700;
          }
          .grand-total-row td {
            background: #0f172a !important;
            color: #ffffff !important;
            font-weight: 800;
            font-size: 13px;
          }
          .grand-total-row .amount-col {
            color: #4ade80 !important;
          }
          .bank-details {
            background: #fefce8;
            border: 1px solid #fef08a;
            border-radius: 6px;
            padding: 10px 14px;
            margin-bottom: 20px;
            font-size: 10px;
            line-height: 1.5;
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
              Reg. No: PNA/PNA (4)/HSG/(TC)/21207/2019-20 Date 09/08/2019 • S. No. 2, Plot No C-1, Village Mohammed Wadi, Taluka Haveli, District Pune, Pune - 411060
            </div>
            <div class="invoice-tag">Tata Electricity Sub-Meter Tax Invoice / Bill</div>
          </div>

          <div class="meta-grid">
            <div class="meta-box">
              <h4>Consumer &amp; Location Details</h4>
              <div class="meta-item"><strong>Consumer / Client:</strong> Tata Play Limited (Tata Sky Broadband Hub)</div>
              <div class="meta-item"><strong>Connection Type:</strong> Dedicated Commercial Sub-Meter (4-Digit)</div>
              <div class="meta-item"><strong>Meter No / Tag:</strong> TATA-EUR-SB-01</div>
              <div class="meta-item"><strong>Location:</strong> Club House Terrace Hub, Majestique Euriska</div>
            </div>
            <div class="meta-box">
              <h4>Billing &amp; Period Reference</h4>
              <div class="meta-item"><strong>Invoice No:</strong> TEB-${bill.id || Date.now()}</div>
              <div class="meta-item"><strong>Bill Date:</strong> ${generatedDate}</div>
              <div class="meta-item"><strong>Billing Period:</strong> <strong>${bill.periodLabel || (formatDateLabel(bill.startMonth) + ' to ' + formatDateLabel(bill.endMonth))}</strong></div>
              <div class="meta-item"><strong>Duration:</strong> <span style="background: #e0f2fe; color: #0369a1; padding: 2px 8px; border-radius: 4px; font-weight: 700;">${bill.duration || computeBillingDuration(bill.startMonth, bill.endMonth) || '—'}</span></div>
            </div>
          </div>

          ${bill.isRollover ? `
            <div class="reset-notice">
              <span>🔄</span>
              <div>
                <strong>4-Digit Meter Rollover / Reset Notice:</strong> Current reading (${bill.currReading}) is less than previous reading (${bill.prevReading}) due to sub-meter reset after 10,000 units.
                <strong>Units Consumed = (10,000 - ${bill.prevReading}) + ${bill.currReading} = ${fmt(consumption)} Units</strong>.
              </div>
            </div>
          ` : ''}

          <div class="reading-card">
            <div class="reading-col">
              <div class="val">${bill.prevReading}</div>
              <div class="lbl">Previous Reading (A)</div>
            </div>
            <div class="reading-col">
              <div class="val">${bill.currReading}</div>
              <div class="lbl">Current Reading (B)</div>
            </div>
            <div class="reading-col">
              <div class="val" style="color: #ea580c;">${fmt(consumption)} Units</div>
              <div class="lbl">Consumed (B - A) ${bill.isRollover ? '• Rollover' : ''}</div>
            </div>
            <div class="reading-col">
              <div class="val" style="color: #2563eb;">₹${Number(rate).toFixed(2)}</div>
              <div class="lbl">Rate / Unit</div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th style="width: 40px; text-align: center;">#</th>
                <th>Billing &amp; Calculation Description</th>
                <th style="width: 140px; text-align: center;">Duration</th>
                <th style="width: 130px; text-align: center;">Rate / Unit</th>
                <th style="width: 150px; text-align: right;">Total Amount (₹)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style="text-align: center; color: #64748b;">1</td>
                <td>
                  <strong>Electricity Consumption (${bill.periodLabel || 'Commercial Billing'})</strong><br />
                  <span style="color: #64748b; font-size: 10px;">
                    ${bill.calculationNote || `Previous: ${bill.prevReading} ➔ Current: ${bill.currReading} = ${consumption} Units`}
                  </span>
                </td>
                <td style="text-align: center; font-weight: 600;">${bill.duration || '—'}</td>
                <td style="text-align: center; font-weight: 700; color: #2563eb;">₹${Number(rate).toFixed(2)} / unit</td>
                <td class="amount-col">₹${fmt(grandTotal)}</td>
              </tr>
              <tr class="subtotal-row">
                <td colspan="4" style="text-align: right;">Total Sub-Meter Charges (${consumption.toLocaleString('en-IN')} units @ ₹${rate.toFixed(2)})</td>
                <td class="amount-col" style="color: #0f172a;">₹${fmt(grandTotal)}</td>
              </tr>
              <tr class="grand-total-row">
                <td colspan="4" style="text-align: right; text-transform: uppercase;">NET TOTAL PAYABLE (INR)</td>
                <td class="amount-col">₹${fmt(grandTotal)}</td>
              </tr>
            </tbody>
          </table>

          <div class="bank-details">
            <h4>Society Bank Account for Payment (NEFT / RTGS / IMPS)</h4>
            <div><strong>Account Name:</strong> MAJESTIQUE EURISKA 'A' BUILDING CO-OPERATIVE HOUSING SOCIETY LTD.</div>
            <div><strong>Bank:</strong> HDFC Bank / Union Bank of India • <strong>Branch:</strong> Mohammed Wadi, Pune</div>
            <div><strong>Account Number:</strong> 50200075533530 • <strong>Payment Due:</strong> Within 10 Days of Bill Issuance</div>
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
            <div>Majestique Euriska CHS Ltd. • Tata Play Sub-Meter Electricity Accounting</div>
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

  // Print all Tata Play Electricity Bills statement
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
            padding: 4px 14px; border-radius: 4px; font-weight: 700; font-size: 11px;
          }
          .notice {
            background: #fef3c7; border: 1px solid #fde68a; border-radius: 6px;
            padding: 6px 12px; font-size: 9.5px; color: #92400e; margin-bottom: 12px;
          }
          .kpi-row { display: flex; gap: 12px; margin-bottom: 14px; }
          .kpi { flex: 1; border: 1px solid #cbd5e1; border-radius: 6px; padding: 10px 14px; background: #f8fafc; }
          table { width: 100%; border-collapse: collapse; font-size: 9.5px; }
          th { background: #0f172a; color: #fff; padding: 7px 8px; text-align: left; }
          td { padding: 7px 8px; border: 1px solid #cbd5e1; vertical-align: middle; }
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
          <div class="title">Majestique Euriska 'A' Building Co-operative Housing Society Ltd.</div>
          <div class="sub">Reg. No: PNA/PNA (4)/HSG/(TC)/21207/2019-20 Date 09/08/2019 • S. No. 2, Plot No C-1, Village Mohammed Wadi, Taluka Haveli, District Pune, Pune - 411060</div>
          <div class="badge">Tata Electricity Sub-Meter Consolidated Account Statement</div>
        </div>

        <div class="notice">
          <strong>4-Digit Sub-Meter Rollover Principle (Reset after 10000):</strong>
          When sub-meter reaches 9,999, it cycles back to 0000. When Current Reading (B) &lt; Previous Reading (A), units are calculated as: <strong>(10,000 - A) + B</strong>.
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
            <div style="font-size: 9px; color: #64748b; font-weight: 700;">TOTAL BILL AMOUNT</div>
            <div style="font-size: 13px; font-weight: 800; color: #0284c7;">₹${fmt(totalAmount)}</div>
          </div>
          <div class="kpi">
            <div style="font-size: 9px; color: #64748b; font-weight: 700;">BILLING CYCLES</div>
            <div style="font-size: 13px; font-weight: 800; color: #16a34a;">${filteredBills.length} Billing Periods</div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th style="width: 30px; text-align: center;">#</th>
              <th style="width: 170px;">Billing Period</th>
              <th style="width: 120px; text-align: center;">Duration</th>
              <th style="width: 75px; text-align: right;">Prev Read (A)</th>
              <th style="width: 75px; text-align: right;">Curr Read (B)</th>
              <th style="width: 110px; text-align: center;">Meter Status</th>
              <th style="width: 85px; text-align: right;">Units (B - A)</th>
              <th style="width: 85px; text-align: right;">Rate / Unit</th>
              <th>Calculation Breakdown</th>
              <th style="width: 100px; text-align: right;">Total Amount (₹)</th>
            </tr>
          </thead>
          <tbody>
            ${filteredBills.map((b, i) => `
              <tr>
                <td style="text-align: center;">${i + 1}</td>
                <td><strong>${b.periodLabel || (formatDateLabel(b.startMonth) + ' to ' + formatDateLabel(b.endMonth))}</strong></td>
                <td style="text-align: center; color: #0369a1; font-weight: 600;">${b.duration || computeBillingDuration(b.startMonth, b.endMonth) || '—'}</td>
                <td class="amount">${b.prevReading}</td>
                <td class="amount">${b.currReading}</td>
                <td style="text-align: center;">
                  ${b.isRollover || n(b.currReading) < n(b.prevReading)
                    ? '<span style="background: #fef3c7; color: #92400e; padding: 2px 6px; border-radius: 4px; font-weight: 700; font-size: 8.5px;">🔄 10k Reset</span>'
                    : '<span style="color: #64748b; font-size: 8.5px;">Normal</span>'}
                </td>
                <td class="amount" style="color: #ea580c; font-weight: 700;">${fmt(n(b.consumption))}</td>
                <td class="amount" style="color: #2563eb; font-weight: 700;">₹${Number(b.ratePerUnit || 13).toFixed(2)}</td>
                <td style="color: #475569; font-size: 9px;">${b.calculationNote || `${b.consumption} × ₹${b.ratePerUnit}`}</td>
                <td class="amount" style="color: #0284c7; font-weight: 800;">₹${fmt(n(b.grandTotal))}</td>
              </tr>
            `).join('')}
            <tr class="total-row">
              <td colspan="6" style="text-align: right;">GRAND TOTAL</td>
              <td class="amount" style="color: #ea580c;">${fmt(totalConsumption)}</td>
              <td colspan="2"></td>
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
        (c.periodLabel && c.periodLabel.toLowerCase().includes(s)) ||
        (c.startMonth && String(c.startMonth).toLowerCase().includes(s)) ||
        (c.endMonth && String(c.endMonth).toLowerCase().includes(s)) ||
        (c.duration && c.duration.toLowerCase().includes(s))
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
    if (subTab === 'tata') {
      rows = filteredBills.map((c, i) => ({
        'Sr. No': i + 1,
        'Billing Period': c.periodLabel || `${formatDateLabel(c.startMonth)} to ${formatDateLabel(c.endMonth)}`,
        'Duration': c.duration || computeBillingDuration(c.startMonth, c.endMonth),
        'Previous Reading (A)': c.prevReading,
        'Current Reading (B)': c.currReading,
        'Rollover Status': c.isRollover || n(c.currReading) < n(c.prevReading) ? '10k Unit Reset Rollover' : 'Normal',
        'Units Consumed (B - A)': n(c.consumption),
        'Per Unit Charge (₹)': n(c.ratePerUnit),
        'Calculation Note': c.calculationNote || `${c.consumption} × ₹${c.ratePerUnit}`,
        'Total Bill Amount (₹)': n(c.grandTotal),
        'Status': c.status || 'Paid'
      }));
    } else if (subTab === 'mahavitaran') {
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
    const sheetName = subTab === 'tata' ? 'Tata Electricity' : (subTab === 'mahavitaran' ? 'Mahavitaran' : 'A Building');
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    XLSX.writeFile(wb, `${sheetName.replace(/\s+/g, '_')}_Bills.xlsx`);
  };

  const chartData = useMemo(() => {
    return [...filteredBills].reverse().map(b => ({
      name: b.periodLabel ? b.periodLabel.replace('Electricity Bill Tata Play ', '').slice(0, 16) : formatDateLabel(b.startMonth),
      "Total Consumed": n(b.consumption),
      "Total Bill (₹)": n(b.grandTotal)
    }));
  }, [filteredBills]);

  const renderTabButton = (id, icon, label) => (
    <button
      onClick={() => { setSubTab(id); setEditingRowId(null); }}
      className={`sub-tab-button ${subTab === id ? 'active' : ''}`}
      style={{
        flex: 1, padding: '7px 12px', borderRadius: '8px', border: 'none', cursor: 'pointer',
        background: subTab === id ? '#1e3a8a' : 'transparent',
        color: subTab === id ? 'white' : 'var(--muted)',
        fontWeight: 600, fontSize: '0.82rem', transition: '0.2s'
      }}
    >
      {icon} {label}
    </button>
  );

  return (
    <div className="electricity-tracker" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

      {/* Tab Navigation */}
      <div className="table-card" style={{ padding: '6px', background: 'rgba(255,255,255,0.6)', backdropFilter: 'blur(10px)', border: '1px solid var(--line)', borderRadius: '12px' }}>
        <div style={{ display: 'flex', gap: '6px' }}>
          {renderTabButton('tata', '⚡️', 'Tata Electricity Bill')}
          {renderTabButton('buildingA', '🏢', 'A Building Electricity')}
          {renderTabButton('mahavitaran', '🔌', 'Mahavitaran (MSEB)')}
        </div>
      </div>

      {/* Header Banner */}
      <div className="table-card" style={{ padding: 0, borderRadius: '12px', overflow: 'hidden' }}>
        <div className="attendance-table-card__header" style={{ padding: '12px 18px 10px', alignItems: 'center' }}>
          <div>
            <p className="eyebrow" style={{ fontSize: '0.68rem', letterSpacing: '0.06em', marginBottom: '2px' }}>
              {subTab === 'tata' ? 'Tata Electricity Sub-Meter Billing' : (subTab === 'mahavitaran' ? 'Mahavitaran Dashboard' : 'A Building Dashboard')}
            </p>
            <h3 style={{ margin: '0 0 2px 0', fontSize: '1.15rem', fontWeight: 700, fontFamily: 'inherit', letterSpacing: '-0.01em' }}>
              {subTab === 'tata' ? 'Tata Electricity Bills' : (subTab === 'mahavitaran' ? 'MSEB Detailed Bills' : 'A Building Bills')}
            </h3>
            {subTab === 'tata' && (
              <p style={{ color: 'var(--muted)', fontSize: '0.78rem', margin: 0 }}>
                Consumer: <strong>Tata Play Limited</strong> (Broadband Hub) • Meter: <strong>TATA-EUR-01</strong> • 4-Digit Dial with <strong>10,000 Reset Rollover</strong>
              </p>
            )}
            {subTab === 'buildingA' && <p style={{ color: 'var(--muted)', fontSize: '0.78rem', margin: 0 }}>Customer Number: 17000358685</p>}
            {subTab === 'mahavitaran' && <p style={{ color: 'var(--muted)', fontSize: '0.78rem', margin: 0 }}>Detailed breakdown per MSEB format</p>}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: badge.color, fontWeight: 600, fontSize: '0.78rem' }}>
            <span>{badge.icon}</span>
            <span>{isLoading ? 'Loading...' : saveMsg || 'Ready'}</span>
          </div>
        </div>
      </div>

      {/* TATA PLAY 10,000 RESET EXPLAINER & TARIFF PROGRESSION BANNER */}
      {subTab === 'tata' && (
        <div style={{
          background: 'linear-gradient(135deg, #f8fafc 0%, #eff6ff 100%)',
          border: '1px solid #bfdbfe',
          borderRadius: '10px',
          padding: '10px 14px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '1.1rem' }}>🔄</span>
              <div>
                <h4 style={{ margin: 0, color: '#1e3a8a', fontSize: '0.82rem', fontWeight: 700 }}>4-Digit Sub-Meter Rollover Principle (Reset After 10,000 Units)</h4>
                <p style={{ margin: '1px 0 0 0', fontSize: '0.74rem', color: '#475569', lineHeight: 1.4 }}>
                  Sub-meter resets to 0000 after 9999. When <strong>Current (B) &lt; Previous (A)</strong>, consumption is: <code>Units = (10,000 - A) + B</code>.
                </p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              <span style={{ background: '#fef3c7', color: '#92400e', padding: '2px 8px', borderRadius: '12px', fontSize: '0.7rem', fontWeight: 600, border: '1px solid #fde68a' }}>
                🔄 Sep 25 – May 26: 2568 ➔ 1557 (8,988 U)
              </span>
              <span style={{ background: '#fef3c7', color: '#92400e', padding: '2px 8px', borderRadius: '12px', fontSize: '0.7rem', fontWeight: 600, border: '1px solid #fde68a' }}>
                🔄 Mar 25 – Aug 25: 9073 ➔ 2568 (3,495 U)
              </span>
              <span style={{ background: '#fef3c7', color: '#92400e', padding: '2px 8px', borderRadius: '12px', fontSize: '0.7rem', fontWeight: 600, border: '1px solid #fde68a' }}>
                🔄 Mar 23 – Jul 23: 7629 ➔ 0177 (2,548 U)
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', borderTop: '1px solid #dbeafe', paddingTop: '6px', flexWrap: 'wrap', fontSize: '0.72rem' }}>
            <span style={{ fontWeight: 700, color: '#1e40af' }}>Tariff Rate Timeline:</span>
            <span style={{ background: 'white', padding: '2px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', color: '#475569' }}>
              <strong>Phase 1 (Mar 23 – Jan 24):</strong> ₹11.50 / u
            </span>
            <span style={{ background: 'white', padding: '2px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', color: '#475569' }}>
              <strong>Phase 2 (Feb 24 – May 24):</strong> ₹12.50 / u
            </span>
            <span style={{ background: '#dbeafe', padding: '2px 8px', borderRadius: '6px', border: '1px solid #93c5fd', color: '#1e40af', fontWeight: 700 }}>
              <strong>Phase 3 (Jun 24 – May 26):</strong> ₹13.00 / u (Current)
            </span>
          </div>
        </div>
      )}

      {/* SEARCH & ACTIONS ZONE */}
      <div className="section-card" style={{ padding: '10px 16px', background: '#f8fafc', border: '1px solid var(--line)', borderRadius: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <div className="filter-field" style={{ flex: 1, minWidth: '220px', margin: 0 }}>
            <label className="eyebrow" style={{ display: 'block', marginBottom: '4px', fontSize: '0.68rem' }}>🔍 Search Period / Dates / Duration</label>
            <input
              type="search"
              placeholder="Search period, date, units..."
              value={searchText}
              onChange={e => setSearchText(e.target.value)}
              className="attendance-register-input"
              style={{ textAlign: 'left', height: '34px', fontSize: '0.8rem', background: 'white', padding: '4px 10px' }}
            />
          </div>
          <button className="button-secondary" onClick={handleDownloadExcel} style={{ padding: '6px 14px', height: '34px', fontSize: '0.78rem', marginTop: 'auto' }}>
            ⬇ Export to Excel
          </button>
          {subTab === 'tata' && (
            <button
              className="button-primary"
              onClick={handlePrintAllTataBills}
              style={{ padding: '6px 14px', height: '34px', fontSize: '0.78rem', marginTop: 'auto', background: '#0284c7', borderColor: '#0284c7', display: 'flex', alignItems: 'center', gap: '6px' }}
              title="Print or export complete statement of Tata electricity bills"
            >
              <span>🖨️</span> Export PDF Summary
            </button>
          )}
        </div>
      </div>

      {/* KPI METRICS ZONE */}
      {filteredBills.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="attendance-summary-grid" style={{
            background: 'linear-gradient(135deg, #f0f9ff 0%, #ffffff 100%)',
            padding: '12px 16px',
            borderRadius: '12px',
            border: '1px solid #bae6fd'
          }}>
            <div style={{ gridColumn: '1 / -1', marginBottom: '2px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <p className="eyebrow" style={{ color: '#0369a1', margin: 0, fontSize: '0.68rem', letterSpacing: '0.05em' }}>Tata Electricity Sub-Meter Consolidated Metrics</p>
              <span style={{ fontSize: '0.72rem', color: '#64748b' }}>{filteredBills.length} Billing Periods Tracked</span>
            </div>

            <div className="accounting-summary-card" style={{ background: 'white', padding: '10px 14px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <p className="eyebrow" style={{ fontSize: '0.68rem', marginBottom: '4px' }}>Total Amount Billed</p>
              <h3 style={{ color: '#0369a1', fontSize: '1.15rem', fontWeight: 700, margin: 0 }}>₹{fmt(totalAmount)}</h3>
              <p style={{ margin: '2px 0 0 0', fontSize: '0.68rem', color: '#64748b' }}>Full 8-period audited total</p>
            </div>

            <div className="accounting-summary-card" style={{ background: 'white', padding: '10px 14px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <p className="eyebrow" style={{ fontSize: '0.68rem', marginBottom: '4px' }}>Total Energy Consumed</p>
              <h3 style={{ color: '#ea580c', fontSize: '1.15rem', fontWeight: 700, margin: 0 }}>{fmt(totalConsumption)} Units</h3>
              <p style={{ margin: '2px 0 0 0', fontSize: '0.68rem', color: '#64748b' }}>Avg ~{fmt(totalConsumption / filteredBills.length)} units / bill</p>
            </div>

            <div className="accounting-summary-card" style={{ background: 'white', padding: '10px 14px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <p className="eyebrow" style={{ fontSize: '0.68rem', marginBottom: '4px' }}>Active Tariff Rate</p>
              <h3 style={{ color: '#16a34a', fontSize: '1.15rem', fontWeight: 700, margin: 0 }}>₹13.00 / Unit</h3>
              <p style={{ margin: '2px 0 0 0', fontSize: '0.68rem', color: '#64748b' }}>Progressed from ₹11.50 ➔ ₹12.50</p>
            </div>

            <div className="accounting-summary-card" style={{ background: 'white', padding: '10px 14px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <p className="eyebrow" style={{ fontSize: '0.68rem', marginBottom: '4px' }}>Meter Continuity</p>
              <h3 style={{ color: '#8b5cf6', fontSize: '1.15rem', fontWeight: 700, margin: 0 }}>3 Rollovers</h3>
              <p style={{ margin: '2px 0 0 0', fontSize: '0.68rem', color: '#64748b' }}>7629 ➔ 1557 (0 gaps)</p>
            </div>
          </div>

          {/* HISTORICAL CONSUMPTION CHART */}
          <div className="section-card" style={{ padding: '14px 18px', border: '1px solid var(--line)', borderRadius: '10px' }}>
            <h4 style={{ margin: '0 0 12px 0', color: 'var(--ink)', fontSize: '0.82rem', fontWeight: 700 }}>Electricity Consumption by Billing Period (kWh Units)</h4>
            <div style={{ width: '100%', height: 190 }}>
              <ResponsiveContainer>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10 }} dy={8} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10 }} dx={-8} />
                  <Tooltip
                    cursor={{ fill: '#f1f5f9' }}
                    contentStyle={{ borderRadius: '6px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '0.75rem' }}
                  />
                  <Bar dataKey="Total Consumed" fill="#0284c7" radius={[4, 4, 0, 0]} maxBarSize={36} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* CREATE NEW TATA ELECTRICITY BILL FORM (ADMIN ONLY) */}
      {isAdmin && (
        <div className="section-card" style={{ padding: '16px 20px', border: '1px solid var(--line)', background: '#ffffff', borderRadius: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
            <div>
              <h4 style={{ margin: 0, color: 'var(--ink)', fontSize: '0.88rem', fontWeight: 700 }}>
                ➕ {subTab === 'tata' ? 'Create New Tata Electricity Bill' : (subTab === 'mahavitaran' ? 'Add Mahavitaran MSEB Bill' : 'Add A Building Bill')}
              </h4>
              {subTab === 'tata' && (
                <p style={{ margin: '2px 0 0 0', fontSize: '0.74rem', color: 'var(--muted)' }}>
                  Enter sub-meter readings and duration. The system automatically detects 10,000 reset rollover if B &lt; A.
                </p>
              )}
            </div>

            {subTab === 'tata' && latestTataBill && (
              <button
                type="button"
                className="button-secondary"
                onClick={applyNextTataPeriod}
                style={{ padding: '5px 12px', fontSize: '0.76rem', background: '#eff6ff', color: '#1d4ed8', borderColor: '#bfdbfe', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '5px' }}
                title="Pre-fills start date and previous reading from latest bill"
              >
                <span>⚡</span> Auto-Fill Next Cycle (Prev: {latestTataBill.currReading})
              </button>
            )}
          </div>

          <form onSubmit={handleFormSubmit} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '10px' }}>
            {subTab === 'tata' && (
              <>
                <div className="field-group" style={{ gridColumn: 'span 2' }}>
                  <label className="eyebrow" style={{ display: 'block', marginBottom: '4px', fontSize: '0.68rem' }}>Billing Period Name <span style={{ color: '#ef4444' }}>*</span></label>
                  <input
                    className="attendance-register-input"
                    style={{ textAlign: 'left', background: 'white', height: '32px', fontSize: '0.78rem', padding: '4px 8px' }}
                    type="text"
                    placeholder="e.g. May 26 to Sep 26"
                    value={formData.periodLabel}
                    onChange={e => handleFormChange('periodLabel', e.target.value)}
                    required
                  />
                </div>

                <div className="field-group">
                  <label className="eyebrow" style={{ display: 'block', marginBottom: '4px', fontSize: '0.68rem' }}>Duration <span style={{ color: '#ef4444' }}>*</span></label>
                  <input
                    className="attendance-register-input"
                    style={{ textAlign: 'left', background: 'white', height: '32px', fontSize: '0.78rem', padding: '4px 8px' }}
                    type="text"
                    placeholder="e.g. 4 Months (120 Days)"
                    value={formData.duration}
                    onChange={e => handleFormChange('duration', e.target.value)}
                    required
                  />
                </div>
              </>
            )}

            <div className="field-group">
              <label className="eyebrow" style={{ display: 'block', marginBottom: '4px', fontSize: '0.68rem' }}>Start Date <span style={{ color: '#ef4444' }}>*</span></label>
              <input className="attendance-register-input" style={{ textAlign: 'left', height: '32px', fontSize: '0.78rem', padding: '4px 8px' }} type="date" value={formData.startMonth} onChange={e => handleFormChange('startMonth', e.target.value)} required />
            </div>

            <div className="field-group">
              <label className="eyebrow" style={{ display: 'block', marginBottom: '4px', fontSize: '0.68rem' }}>End Date <span style={{ color: '#ef4444' }}>*</span></label>
              <input className="attendance-register-input" style={{ textAlign: 'left', height: '32px', fontSize: '0.78rem', padding: '4px 8px' }} type="date" value={formData.endMonth} onChange={e => handleFormChange('endMonth', e.target.value)} required />
            </div>

            <div className="field-group">
              <label className="eyebrow" style={{ display: 'block', marginBottom: '4px', fontSize: '0.68rem' }}>Previous Reading (A) <span style={{ color: '#ef4444' }}>*</span></label>
              <input className="attendance-register-input" style={{ textAlign: 'left', height: '32px', fontSize: '0.78rem', padding: '4px 8px' }} type="number" step="any" placeholder="e.g. 2568" value={formData.prevReading} onChange={e => handleFormChange('prevReading', e.target.value)} required />
            </div>

            <div className="field-group">
              <label className="eyebrow" style={{ display: 'block', marginBottom: '4px', fontSize: '0.68rem' }}>Current Reading (B) <span style={{ color: '#ef4444' }}>*</span></label>
              <input className="attendance-register-input" style={{ textAlign: 'left', height: '32px', fontSize: '0.78rem', padding: '4px 8px' }} type="number" step="any" placeholder="e.g. 1557" value={formData.currReading} onChange={e => handleFormChange('currReading', e.target.value)} required />
            </div>

            <div className="field-group">
              <label className="eyebrow" style={{ display: 'block', marginBottom: '4px', fontSize: '0.68rem' }}>Per Unit Charge (₹) <span style={{ color: '#ef4444' }}>*</span></label>
              <input className="attendance-register-input" style={{ textAlign: 'left', height: '32px', fontSize: '0.78rem', padding: '4px 8px' }} type="number" step="any" placeholder="13.00" value={formData.ratePerUnit} onChange={e => handleFormChange('ratePerUnit', e.target.value)} required />
            </div>

            {/* Live calculation banner if readings are filled */}
            {subTab === 'tata' && formData.prevReading !== '' && formData.currReading !== '' && (
              <div style={{
                gridColumn: '1 / -1',
                background: n(formData.currReading) < n(formData.prevReading) ? '#fef3c7' : '#eff6ff',
                border: '1px solid ' + (n(formData.currReading) < n(formData.prevReading) ? '#fde68a' : '#bfdbfe'),
                borderRadius: '8px',
                padding: '8px 12px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '6px'
              }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.75rem', color: n(formData.currReading) < n(formData.prevReading) ? '#92400e' : '#1e40af' }}>
                    {n(formData.currReading) < n(formData.prevReading) ? '🔄 10,000 Reset Rollover Detected:' : '📊 Standard Reading Calculation:'}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#475569' }}>
                    {calculateSubmeterRollover(formData.prevReading, formData.currReading).formulaText}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: '0.72rem', color: '#64748b' }}>Estimated Bill: </span>
                  <strong style={{ fontSize: '0.95rem', color: '#0369a1' }}>
                    ₹{fmt(calculateSubmeterRollover(formData.prevReading, formData.currReading).units * (n(formData.ratePerUnit) || 13))}
                  </strong>
                </div>
              </div>
            )}

            <div style={{ gridColumn: '1 / -1', marginTop: '4px' }}>
              <button type="submit" className="button-primary" style={{ padding: '8px 20px', height: '34px', fontSize: '0.8rem', background: '#0284c7', borderColor: '#0284c7' }}>
                Calculate &amp; Create Bill
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MAIN TABLE */}
      <div className="table-card" style={{ borderRadius: '12px', overflow: 'hidden' }}>
        <div className="attendance-table-scroll" style={{ padding: '10px' }}>
          <table className="attendance-table" style={{ minWidth: 980, fontSize: '0.78rem' }}>
            <thead>
              {subTab === 'tata' ? (
                <tr style={{ background: '#f8fafc' }}>
                  <th style={{ width: 35, textAlign: 'center', padding: '7px 8px', fontSize: '0.7rem' }}>#</th>
                  <th style={{ width: 200, padding: '7px 8px', fontSize: '0.7rem' }}>Billing Period</th>
                  <th style={{ width: 140, textAlign: 'center', padding: '7px 8px', fontSize: '0.7rem' }}>Duration</th>
                  <th style={{ width: 85, textAlign: 'right', padding: '7px 8px', fontSize: '0.7rem' }}>Prev (A)</th>
                  <th style={{ width: 85, textAlign: 'right', padding: '7px 8px', fontSize: '0.7rem' }}>Curr (B)</th>
                  <th style={{ width: 95, textAlign: 'center', padding: '7px 8px', fontSize: '0.7rem' }}>Status</th>
                  <th style={{ width: 95, textAlign: 'right', padding: '7px 8px', fontSize: '0.7rem' }}>Units (B - A)</th>
                  <th style={{ width: 85, textAlign: 'right', padding: '7px 8px', fontSize: '0.7rem' }}>Rate / Unit</th>
                  <th style={{ width: 120, textAlign: 'right', padding: '7px 8px', fontSize: '0.7rem', background: '#f0f9ff' }}>Total Amount (₹)</th>
                  <th style={{ width: 80, textAlign: 'center', padding: '7px 8px', fontSize: '0.7rem' }}>Actions</th>
                </tr>
              ) : subTab === 'mahavitaran' ? (
                <tr style={{ background: '#f8fafc' }}>
                  <th style={{ width: 45, padding: '7px 8px', fontSize: '0.7rem' }}>Sr.</th>
                  <th style={{ width: 180, padding: '7px 8px', fontSize: '0.7rem' }}>Billing Period</th>
                  <th style={{ width: 85, textAlign: 'right', padding: '7px 8px', fontSize: '0.7rem' }}>Readings</th>
                  <th style={{ width: 75, textAlign: 'right', padding: '7px 8px', fontSize: '0.7rem' }}>Units</th>
                  <th style={{ width: 80, textAlign: 'right', padding: '7px 8px', fontSize: '0.7rem' }}>Fixed</th>
                  <th style={{ width: 95, textAlign: 'right', padding: '7px 8px', fontSize: '0.7rem' }}>Energy</th>
                  <th style={{ width: 90, textAlign: 'right', padding: '7px 8px', fontSize: '0.7rem' }}>Wheeling</th>
                  <th style={{ width: 85, textAlign: 'right', padding: '7px 8px', fontSize: '0.7rem' }}>Fuel</th>
                  <th style={{ width: 85, textAlign: 'right', padding: '7px 8px', fontSize: '0.7rem' }}>Duty</th>
                  <th style={{ width: 105, textAlign: 'right', padding: '7px 8px', fontSize: '0.7rem', background: '#f0f9ff' }}>Grand Total</th>
                  <th style={{ width: 70, textAlign: 'center', padding: '7px 8px', fontSize: '0.7rem' }}>Actions</th>
                </tr>
              ) : (
                <tr style={{ background: '#f8fafc' }}>
                  <th style={{ width: 45, padding: '7px 8px', fontSize: '0.7rem' }}>Sr.</th>
                  <th style={{ width: 220, padding: '7px 8px', fontSize: '0.7rem' }}>Period</th>
                  <th style={{ width: 100, textAlign: 'right', padding: '7px 8px', fontSize: '0.7rem' }}>Prev Read</th>
                  <th style={{ width: 100, textAlign: 'right', padding: '7px 8px', fontSize: '0.7rem' }}>Curr Read</th>
                  <th style={{ width: 90, textAlign: 'right', padding: '7px 8px', fontSize: '0.7rem' }}>Consumed</th>
                  <th style={{ width: 90, textAlign: 'right', padding: '7px 8px', fontSize: '0.7rem' }}>Rate</th>
                  <th style={{ width: 110, textAlign: 'right', padding: '7px 8px', fontSize: '0.7rem', background: '#f0f9ff' }}>Grand Total</th>
                  <th style={{ width: 70, textAlign: 'center', padding: '7px 8px', fontSize: '0.7rem' }}>Actions</th>
                </tr>
              )}
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={10} style={{ textAlign: 'center', padding: 24, opacity: 0.5, fontSize: '0.78rem' }}>Loading records...</td></tr>
              ) : filteredBills.length === 0 ? (
                <tr><td colSpan={10} style={{ textAlign: 'center', padding: 24, opacity: 0.5, fontSize: '0.78rem' }}>
                  {searchText ? `No bills found matching "${searchText}"` : 'No bills recorded.'}
                </td></tr>
              ) : (
                filteredBills.map((c, i) => {
                  const actualIdx = activeBills.findIndex(orig => orig.id === c.id);
                  const isEditing = editingRowId === c.id;

                  if (subTab === 'tata') {
                    const isRolloverBill = c.isRollover || n(c.currReading) < n(c.prevReading);
                    return (
                      <tr key={c.id || i} style={{ background: isRolloverBill ? '#fffdfa' : 'transparent' }}>
                        <td style={{ verticalAlign: 'middle', textAlign: 'center', fontWeight: 600, padding: '6px 8px', fontSize: '0.75rem' }}>{i + 1}</td>

                        {/* Billing Period */}
                        <td style={{ verticalAlign: 'middle', padding: '6px 8px' }}>
                          {isEditing ? (
                            <input
                              className="attendance-register-input"
                              style={{ width: '100%', padding: '4px', fontSize: '0.78rem' }}
                              type="text"
                              value={c.periodLabel || ''}
                              onChange={e => updateRow(actualIdx, 'periodLabel', e.target.value)}
                            />
                          ) : (
                            <div>
                              <strong style={{ fontSize: '0.8rem', color: '#0f172a' }}>
                                {c.periodLabel || `${formatDateLabel(c.startMonth)} to ${formatDateLabel(c.endMonth)}`}
                              </strong>
                              {c.startMonth && c.endMonth && (
                                <div style={{ fontSize: '0.68rem', color: '#64748b' }}>
                                  {formatDateLabel(c.startMonth)} – {formatDateLabel(c.endMonth)}
                                </div>
                              )}
                            </div>
                          )}
                        </td>

                        {/* Duration */}
                        <td style={{ verticalAlign: 'middle', textAlign: 'center', padding: '6px 8px' }}>
                          {isEditing ? (
                            <input
                              className="attendance-register-input"
                              style={{ width: '100%', padding: '4px', fontSize: '0.78rem' }}
                              type="text"
                              value={c.duration || ''}
                              onChange={e => updateRow(actualIdx, 'duration', e.target.value)}
                            />
                          ) : (
                            <span style={{
                              background: '#eff6ff',
                              color: '#1d4ed8',
                              padding: '2px 7px',
                              borderRadius: '12px',
                              fontSize: '0.7rem',
                              fontWeight: 600,
                              border: '1px solid #bfdbfe',
                              display: 'inline-block'
                            }}>
                              🗓️ {c.duration || computeBillingDuration(c.startMonth, c.endMonth) || '—'}
                            </span>
                          )}
                        </td>

                        {/* Prev Reading (A) */}
                        <td style={{ textAlign: 'right', verticalAlign: 'middle', fontFamily: 'SF Mono, Consolas, Monaco, monospace', fontSize: '0.8rem', padding: '6px 8px' }}>
                          {isEditing ? (
                            <input
                              className="attendance-register-input"
                              style={{ padding: '3px', textAlign: 'right', fontSize: '0.78rem' }}
                              type="text"
                              value={c.prevReading}
                              onChange={e => updateRow(actualIdx, 'prevReading', e.target.value)}
                            />
                          ) : (
                            c.prevReading
                          )}
                        </td>

                        {/* Curr Reading (B) */}
                        <td style={{ textAlign: 'right', verticalAlign: 'middle', fontFamily: 'SF Mono, Consolas, Monaco, monospace', fontSize: '0.8rem', padding: '6px 8px' }}>
                          {isEditing ? (
                            <input
                              className="attendance-register-input"
                              style={{ padding: '3px', textAlign: 'right', fontSize: '0.78rem' }}
                              type="text"
                              value={c.currReading}
                              onChange={e => updateRow(actualIdx, 'currReading', e.target.value)}
                            />
                          ) : (
                            c.currReading
                          )}
                        </td>

                        {/* Meter Status / 10k Reset Badge */}
                        <td style={{ textAlign: 'center', verticalAlign: 'middle', padding: '6px 8px' }}>
                          {isRolloverBill ? (
                            <span style={{
                              background: '#fef3c7',
                              color: '#92400e',
                              padding: '2px 5px',
                              borderRadius: '8px',
                              fontSize: '0.68rem',
                              fontWeight: 700,
                              border: '1px solid #fde68a',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '3px'
                            }} title="(10000 - A) + B = Units">
                              🔄 10k Reset
                            </span>
                          ) : (
                            <span style={{ color: '#64748b', fontSize: '0.68rem', fontWeight: 500 }}>
                              Normal
                            </span>
                          )}
                        </td>

                        {/* Units Consumed (B - A) */}
                        <td style={{ textAlign: 'right', color: '#ea580c', fontWeight: 700, verticalAlign: 'middle', padding: '6px 8px' }}>
                          {isEditing ? (
                            <input
                              className="attendance-register-input"
                              style={{ padding: '3px', textAlign: 'right', fontSize: '0.78rem' }}
                              type="number"
                              value={c.consumption}
                              onChange={e => updateRow(actualIdx, 'consumption', e.target.value)}
                            />
                          ) : (
                            <div>
                              <span style={{ fontSize: '0.84rem' }}>{fmt(n(c.consumption))}</span>
                              <div style={{ fontSize: '0.64rem', color: '#94a3b8', fontWeight: 400 }}>
                                {isRolloverBill ? `(10k - ${c.prevReading}) + ${c.currReading}` : `${c.currReading} - ${c.prevReading}`}
                              </div>
                            </div>
                          )}
                        </td>

                        {/* Per Unit Rate */}
                        <td style={{ textAlign: 'right', verticalAlign: 'middle', padding: '6px 8px' }}>
                          {isEditing ? (
                            <input
                              className="attendance-register-input"
                              style={{ padding: '3px', textAlign: 'right', fontSize: '0.78rem' }}
                              type="number"
                              step="any"
                              value={c.ratePerUnit}
                              onChange={e => updateRow(actualIdx, 'ratePerUnit', e.target.value)}
                            />
                          ) : (
                            <span style={{
                              background: '#f0fdf4',
                              color: '#15803d',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              border: '1px solid #bbf7d0'
                            }}>
                              ₹{Number(c.ratePerUnit || 13).toFixed(2)}
                            </span>
                          )}
                        </td>

                        {/* Total Amount */}
                        <td style={{ textAlign: 'right', color: '#0369a1', fontWeight: 700, verticalAlign: 'middle', fontSize: '0.88rem', background: '#f0f9ff', padding: '6px 8px' }}>
                          ₹{fmt(c.grandTotal)}
                        </td>

                        {/* Actions */}
                        <td style={{ verticalAlign: 'middle', textAlign: 'center', padding: '6px 8px' }}>
                          <div style={{ display: 'flex', gap: '4px', justifyContent: 'center', alignItems: 'center' }}>
                            <button
                              className="button-icon"
                              title="Print / Export Bill Invoice"
                              onClick={() => handlePrintTataBill(c)}
                              style={{ color: '#0284c7', fontSize: '0.95rem', cursor: 'pointer', padding: '2px' }}
                            >
                              🖨️
                            </button>
                            {isAdmin && (
                              <>
                                {isEditing ? (
                                  <button className="button-icon" title="Save" onClick={() => setEditingRowId(null)} style={{ color: '#16a34a', fontSize: '0.85rem' }}>✅</button>
                                ) : (
                                  <button className="button-icon" title="Edit" onClick={() => setEditingRowId(c.id)} style={{ color: '#3b82f6', fontSize: '0.85rem' }}>✏️</button>
                                )}
                                <button className="button-icon" title="Delete" onClick={() => removeRow(actualIdx)} style={{ color: '#ef4444', fontSize: '0.85rem' }}>✕</button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  }

                  if (subTab === 'mahavitaran') {
                    return (
                      <tr key={c.id || i}>
                        <td style={{ verticalAlign: 'middle', padding: '6px 8px', fontSize: '0.75rem' }}>{i + 1}</td>
                        <td style={{ padding: '6px 8px' }}>
                          {isEditing ? (
                            <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                              <input className="attendance-register-input" style={{ width: '110px', padding: '3px', fontSize: '0.75rem' }} type="date" value={c.startMonth} onChange={e => updateRow(actualIdx, 'startMonth', e.target.value)} />
                              <span>-</span>
                              <input className="attendance-register-input" style={{ width: '110px', padding: '3px', fontSize: '0.75rem' }} type="date" value={c.endMonth} onChange={e => updateRow(actualIdx, 'endMonth', e.target.value)} />
                            </div>
                          ) : (
                            <span style={{ fontWeight: 600, fontSize: '0.78rem' }}>{formatDateLabel(c.startMonth)} -<br />{formatDateLabel(c.endMonth)}</span>
                          )}
                        </td>
                        <td style={{ textAlign: 'right', fontSize: '0.75rem', padding: '6px 8px' }}>
                          {isEditing ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                              <input className="attendance-register-input" style={{ padding: '2px', fontSize: '0.75rem' }} type="number" step="any" value={c.prevReading} onChange={e => updateRow(actualIdx, 'prevReading', e.target.value)} />
                              <input className="attendance-register-input" style={{ padding: '2px', fontSize: '0.75rem' }} type="number" step="any" value={c.currReading} onChange={e => updateRow(actualIdx, 'currReading', e.target.value)} />
                            </div>
                          ) : (
                            <><span style={{ color: 'var(--muted)' }}>P: {n(c.prevReading)}</span><br /><span>C: {n(c.currReading)}</span></>
                          )}
                        </td>
                        <td style={{ textAlign: 'right', color: '#ea580c', fontWeight: 700, verticalAlign: 'middle', fontSize: '0.8rem', padding: '6px 8px' }}>{n(c.consumption)}</td>
                        <td style={{ textAlign: 'right', padding: '6px 8px', fontSize: '0.78rem' }}>
                          {isEditing ? <input className="attendance-register-input" style={{ padding: '2px', fontSize: '0.75rem' }} type="number" step="any" value={c.msebFixedCharge || c.fixed} onChange={e => updateRow(actualIdx, 'msebFixedCharge', e.target.value)} /> : `₹${fmt(n(c.fixed || c.msebFixedCharge || 445))}`}
                        </td>
                        <td style={{ textAlign: 'right', padding: '6px 8px', fontSize: '0.78rem' }}>
                          {isEditing ? <input className="attendance-register-input" style={{ padding: '2px', fontSize: '0.75rem' }} type="number" step="any" value={c.msebEnergyCharge || c.energy} onChange={e => updateRow(actualIdx, 'msebEnergyCharge', e.target.value)} /> : `₹${fmt(n(c.energy || c.msebEnergyCharge || 0))}`}
                        </td>
                        <td style={{ textAlign: 'right', padding: '6px 8px', fontSize: '0.78rem' }}>
                          {isEditing ? <input className="attendance-register-input" style={{ padding: '2px', fontSize: '0.75rem' }} type="number" step="any" value={c.msebWheelingRate || c.wheelTotal} onChange={e => updateRow(actualIdx, 'msebWheelingRate', e.target.value)} /> : `₹${fmt(n(c.wheelTotal || (n(c.consumption) * 1.6)))}`}
                        </td>
                        <td style={{ textAlign: 'right', padding: '6px 8px', fontSize: '0.78rem' }}>
                          {isEditing ? <input className="attendance-register-input" style={{ padding: '2px', fontSize: '0.75rem' }} type="number" step="any" value={c.msebFuelAdj || c.fuel} onChange={e => updateRow(actualIdx, 'msebFuelAdj', e.target.value)} /> : `₹${fmt(n(c.fuel || c.msebFuelAdj || 0))}`}
                        </td>
                        <td style={{ textAlign: 'right', padding: '6px 8px', fontSize: '0.78rem' }}>₹{fmt(n(c.duty || (n(c.grandTotal) * 0.16 / 1.16)))}</td>
                        <td style={{ textAlign: 'right', color: '#2563eb', fontWeight: 700, verticalAlign: 'middle', fontSize: '0.85rem', padding: '6px 8px' }}>₹{fmt(c.grandTotal)}</td>
                        <td style={{ verticalAlign: 'middle', textAlign: 'center', padding: '6px 8px' }}>
                          <div style={{ display: 'flex', gap: '4px', justifyContent: 'center', alignItems: 'center' }}>
                            {isAdmin && (
                              <>
                                {isEditing ? (
                                  <button className="button-icon" title="Save" onClick={() => setEditingRowId(null)} style={{ color: '#16a34a', fontSize: '0.85rem' }}>✅</button>
                                ) : (
                                  <button className="button-icon" title="Edit" onClick={() => setEditingRowId(c.id)} style={{ color: '#3b82f6', fontSize: '0.85rem' }}>✏️</button>
                                )}
                                <button className="button-icon" title="Delete" onClick={() => removeRow(actualIdx)} style={{ color: '#ef4444', fontSize: '0.85rem' }}>✕</button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  }

                  return (
                    <tr key={c.id || i}>
                      <td style={{ verticalAlign: 'middle', padding: '6px 8px', fontSize: '0.75rem' }}>{i + 1}</td>
                      <td style={{ padding: '6px 8px' }}>
                        {isEditing ? (
                          <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                            <input className="attendance-register-input" style={{ width: '120px', padding: '3px', fontSize: '0.75rem' }} type="date" value={c.startMonth} onChange={e => updateRow(actualIdx, 'startMonth', e.target.value)} />
                            <span>-</span>
                            <input className="attendance-register-input" style={{ width: '120px', padding: '3px', fontSize: '0.75rem' }} type="date" value={c.endMonth} onChange={e => updateRow(actualIdx, 'endMonth', e.target.value)} />
                          </div>
                        ) : (
                          <span style={{ fontWeight: 500, fontSize: '0.78rem' }}>{formatDateLabel(c.startMonth)} - {formatDateLabel(c.endMonth)}</span>
                        )}
                      </td>
                      <td style={{ textAlign: 'right', padding: '6px 8px', fontSize: '0.78rem' }}>
                        {isEditing ? (
                          <input className="attendance-register-input" style={{ textAlign: 'right', padding: '2px', fontSize: '0.75rem' }} type="number" step="any" value={c.prevReading} onChange={e => updateRow(actualIdx, 'prevReading', e.target.value)} />
                        ) : (
                          n(c.prevReading)
                        )}
                      </td>
                      <td style={{ textAlign: 'right', padding: '6px 8px', fontSize: '0.78rem' }}>
                        {isEditing ? (
                          <input className="attendance-register-input" style={{ textAlign: 'right', padding: '2px', fontSize: '0.75rem' }} type="number" step="any" value={c.currReading} onChange={e => updateRow(actualIdx, 'currReading', e.target.value)} />
                        ) : (
                          n(c.currReading)
                        )}
                      </td>
                      <td style={{ textAlign: 'right', color: '#ea580c', fontWeight: 600, verticalAlign: 'middle', padding: '6px 8px', fontSize: '0.8rem' }}>{n(c.consumption)}</td>
                      <td style={{ textAlign: 'right', padding: '6px 8px', fontSize: '0.78rem' }}>
                        {isEditing ? (
                          <input className="attendance-register-input" style={{ textAlign: 'right', padding: '2px', fontSize: '0.75rem' }} type="number" step="any" value={c.ratePerUnit} onChange={e => updateRow(actualIdx, 'ratePerUnit', e.target.value)} />
                        ) : (
                          `₹${n(c.ratePerUnit)}`
                        )}
                      </td>
                      <td style={{ textAlign: 'right', color: '#2563eb', fontWeight: 700, verticalAlign: 'middle', padding: '6px 8px', fontSize: '0.85rem' }}>₹{fmt(c.grandTotal)}</td>
                      <td style={{ verticalAlign: 'middle', textAlign: 'center', padding: '6px 8px' }}>
                        {isAdmin && (
                          <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                            {isEditing ? (
                              <button className="button-icon" title="Save" onClick={() => setEditingRowId(null)} style={{ color: '#16a34a', fontSize: '0.85rem' }}>✅</button>
                            ) : (
                              <button className="button-icon" title="Edit" onClick={() => setEditingRowId(c.id)} style={{ color: '#3b82f6', fontSize: '0.85rem' }}>✏️</button>
                            )}
                            <button className="button-icon" title="Delete" onClick={() => removeRow(actualIdx)} style={{ color: '#ef4444', fontSize: '0.85rem' }}>✕</button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            <tfoot>
              {subTab === 'tata' ? (
                <tr style={{ background: '#f8fafc', fontWeight: 700, fontSize: '0.82rem' }}>
                  <td colSpan={6} style={{ textAlign: 'right', padding: '8px' }}>TOTAL (8 BILLING CYCLES):</td>
                  <td style={{ textAlign: 'right', color: '#ea580c', padding: '8px', fontSize: '0.88rem' }}>{fmt(totalConsumption)}</td>
                  <td></td>
                  <td style={{ textAlign: 'right', color: '#0369a1', fontSize: '0.92rem', background: '#e0f2fe', padding: '8px' }}>₹{fmt(totalAmount)}</td>
                  <td></td>
                </tr>
              ) : subTab === 'mahavitaran' ? (
                <tr style={{ background: '#f8fafc', fontWeight: 700, fontSize: '0.82rem' }}>
                  <td colSpan={3} style={{ textAlign: 'right', padding: '8px' }}>GRAND TOTAL</td>
                  <td style={{ textAlign: 'right', color: '#ea580c', padding: '8px', fontSize: '0.88rem' }}>{fmt(totalConsumption)}</td>
                  <td colSpan={4}></td>
                  <td></td>
                  <td style={{ textAlign: 'right', color: '#2563eb', padding: '8px', fontSize: '0.92rem' }}>₹{fmt(totalAmount)}</td>
                  <td></td>
                </tr>
              ) : (
                <tr style={{ background: '#f8fafc', fontWeight: 700, fontSize: '0.82rem' }}>
                  <td colSpan={4} style={{ textAlign: 'right', padding: '8px' }}>GRAND TOTAL</td>
                  <td style={{ textAlign: 'right', color: '#ea580c', padding: '8px', fontSize: '0.88rem' }}>{fmt(totalConsumption)}</td>
                  <td></td>
                  <td style={{ textAlign: 'right', color: '#2563eb', padding: '8px', fontSize: '0.92rem' }}>₹{fmt(totalAmount)}</td>
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
