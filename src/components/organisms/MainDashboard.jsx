import React, { useState, useEffect, useMemo } from 'react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTip, ResponsiveContainer, Cell, Legend
} from 'recharts';
import { doc, getDoc, getDocs, collection, onSnapshot } from 'firebase/firestore';
import { db, isFirebaseConfigured, ensureFirebaseSession } from '../../firebase.js';
import { initialTenantData } from '../../data/tenantSeedData.js';
import { initialShopData } from '../../data/shopSeedData.js';
import { financeSeedData } from '../../data/financeSeedData.js';

// ─── Formatters ─────────────────────────────────────────────────────────────────
const fmt  = (v) => Number(v || 0).toLocaleString('en-IN');
const fmtCr = (v) => {
  const n = Number(v || 0);
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(2)}Cr`;
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  if (n >= 1000)   return `₹${(n / 1000).toFixed(0)}K`;
  return `₹${n}`;
};

function fmtDate(v) {
  if (!v) return '';
  try {
    const [y, m, d] = v.split('-');
    return `${d}/${m}/${y.slice(2)}`;
  } catch { return v; }
}

function calcDaysLeft(deadline, status) {
  if (!deadline || status === 'Done') return null;
  return Math.ceil((new Date(deadline) - new Date()) / 86400000);
}

// ─── Quick Navigation Links ────────────────────────────────────────────────────
const QUICK_LINKS = [
  { id: 'manager_tasks',    icon: '✅', label: 'Tasks' },
  { id: 'amc',              icon: '📋', label: 'AMC' },
  { id: 'petty_cash',       icon: '💵', label: 'Petty Cash' },
  { id: 'finance',          icon: '💰', label: 'Finance' },
  { id: 'maintenance',      icon: '📊', label: 'Maintenance' },
  { id: 'housekeeping',     icon: '🧹', label: 'Housekeeping' },
  { id: 'security',         icon: '🛡️', label: 'Security' },
  { id: 'electricity',      icon: '⚡', label: 'Electricity' },
  { id: 'tanker',           icon: '🚛', label: 'Water Tanker' },
  { id: 'water_tanks',      icon: '💧', label: 'Water Tanks' },
  { id: 'cheques',          icon: '🧾', label: 'Cheques' },
  { id: 'solar',            icon: '☀️', label: 'Solar' },
  { id: 'announcements',    icon: '📢', label: 'Notices' },
  { id: 'shops',            icon: '🏪', label: 'Shops' },
  { id: 'tenants',          icon: '🏠', label: 'Tenants' },
  { id: 'parking',          icon: '🅿️', label: 'Parking' },
  { id: 'agm_records',      icon: '📜', label: 'AGM 2026' },
];

const STATUS_STYLE_CLASS = {
  'Done':        'exec-task-status--done',
  'In Progress': 'exec-task-status--progress',
  'Pending':     'exec-task-status--pending',
  'On Hold':     'exec-task-status--hold',
};

const PIE_COLORS = ['#196c6c', '#C49B4F', '#ef4444', '#8b5cf6', '#3b82f6', '#10b981'];

// ─── FY months (Apr 2025 → Sep 2026) for finance trend ─────────────────────────
const FY_MONTHS = [
  '2025-04','2025-05','2025-06','2025-07','2025-08','2025-09',
  '2025-10','2025-11','2025-12','2026-01','2026-02','2026-03',
  '2026-04','2026-05','2026-06','2026-07','2026-08','2026-09',
];

// ─── Main Component ─────────────────────────────────────────────────────────────
export default function MainDashboard({ stats, isAdmin }) {
  // State for Firestore-sourced data
  const [tasks,       setTasks]       = useState([]);
  const [amcAlerts,   setAmcAlerts]   = useState([]);
  const [financeData, setFinanceData] = useState([]);
  const [pettyCash,   setPettyCash]   = useState({ buildingA: [], common: [] });
  const [tenantData,  setTenantData]  = useState(initialTenantData);
  const [shopData,    setShopData]    = useState(initialShopData);
  const [loading,     setLoading]     = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function loadAll() {
      if (!isFirebaseConfigured || !db) {
        setLoading(false);
        return;
      }
      try {
        await ensureFirebaseSession();

        // 1. Manager Tasks (both tabs) — live from Firestore
        const taskPromises = ['managerTasks_common', 'managerTasks_a_building'].map(col =>
          getDocs(collection(db, col)).then(snap =>
            snap.docs.map(d => ({ id: d.id, _source: col, ...d.data() }))
          ).catch(() => [])
        );

        // 2. AMC alerts
        const amcPromise = getDoc(doc(db, 'amcData', 'amc_contracts')).catch(() => null);

        // 3. Finance monthly data — try all FY months
        const financePromises = FY_MONTHS.map(m =>
          getDoc(doc(db, 'financeMonthly', `finance_${m}`)).then(snap => {
            if (snap.exists()) {
              const d = snap.data();
              const income  = (d.income  || []).reduce((s, r) => s + (parseFloat(r.amount) || 0), 0);
              const expense = (d.expenses || []).reduce((s, r) => s + (parseFloat(r.amount) || 0), 0);
              const [y, mo] = m.split('-').map(Number);
              return {
                month: m,
                label: new Intl.DateTimeFormat('en-IN', { month: 'short', year: '2-digit' }).format(new Date(y, mo - 1, 1)),
                income, expense, surplus: income - expense,
              };
            }
            return null;
          }).catch(() => null)
        );

        // 4. Petty Cash
        const pettyCashPromises = ['buildingA', 'common'].map(id =>
          getDoc(doc(db, 'pettyCash', id)).then(snap =>
            snap.exists() ? { id, ...(snap.data()) } : null
          ).catch(() => null)
        );

        // 5. Tenant data from Firestore (if available)
        const tenantPromise = getDocs(collection(db, 'tenantTracker')).then(snap =>
          snap.docs.length > 0 ? snap.docs.map(d => ({ id: d.id, ...d.data() })) : null
        ).catch(() => null);

        // 6. Shop data from Firestore (if available)
        const shopPromise = getDoc(doc(db, 'shopMaintenance', 'shops')).then(snap =>
          snap.exists() ? snap.data().shops || null : null
        ).catch(() => null);

        // Resolve all
        const [taskResults, amcSnap, financeResults, pettyCashResults, tenantResult, shopResult] = await Promise.all([
          Promise.all(taskPromises),
          amcPromise,
          Promise.all(financePromises),
          Promise.all(pettyCashPromises),
          tenantPromise,
          shopPromise,
        ]);

        if (cancelled) return;

        // Process tasks
        const allTasks = taskResults.flat();
        setTasks(allTasks);

        // Process AMC
        if (amcSnap?.exists()) {
          const { contracts = [] } = amcSnap.data();
          const alerts = contracts
            .map(c => {
              if (!c.endDate) return null;
              const days = Math.ceil((new Date(c.endDate) - new Date()) / 86400000);
              if (days > 60) return null;
              return {
                id: c.id, name: c.name, vendor: c.vendor, days,
                severity: days < 0 ? 'red' : days <= 30 ? 'amber' : 'green',
              };
            })
            .filter(Boolean)
            .sort((a, b) => a.days - b.days)
            .slice(0, 5);
          setAmcAlerts(alerts);
        }

        // Process finance
        const validFinance = financeResults.filter(Boolean);
        setFinanceData(validFinance.length > 0 ? validFinance : buildFallbackFinance());

        // Process petty cash
        const pcA = pettyCashResults[0];
        const pcC = pettyCashResults[1];
        setPettyCash({
          buildingA: pcA?.entries || [],
          common: pcC?.entries || [],
        });

        // Tenant & shop
        if (tenantResult) setTenantData(tenantResult);
        if (shopResult)   setShopData(shopResult);

      } catch (e) {
        console.warn('Dashboard load error:', e);
        // Fallback to seed finance data
        setFinanceData(buildFallbackFinance());
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadAll();
    return () => { cancelled = true; };
  }, []);

  // Build fallback from seed data
  function buildFallbackFinance() {
    return Object.entries(financeSeedData).map(([key, d]) => {
      const m = d.month;
      if (!m) return null;
      const income  = (d.income  || []).reduce((s, r) => s + (parseFloat(r.amount) || 0), 0);
      const expense = (d.expenses || []).reduce((s, r) => s + (parseFloat(r.amount) || 0), 0);
      const [y, mo] = m.split('-').map(Number);
      return {
        month: m,
        label: new Intl.DateTimeFormat('en-IN', { month: 'short', year: '2-digit' }).format(new Date(y, mo - 1, 1)),
        income, expense, surplus: income - expense,
      };
    }).filter(Boolean).sort((a, b) => a.month.localeCompare(b.month));
  }

  const navigate = (tabId) => {
    const tabMap = {
      shops: 'shop_maintenance',
      tenants: 'tenant_tracking',
      parking: 'parking_allotment',
      agm: 'agm_records',
      agm_records: 'agm_records'
    };
    const target = tabMap[tabId] || tabId;
    window.dispatchEvent(new CustomEvent('changeTab', { detail: target }));
  };

  // ─── Derived: Tenant Stats ──────────────────────────────────────────────────
  const tenantStats = useMemo(() => {
    const residentialFlats = tenantData.filter(t => t.flatType === 'Residential');
    const totalFlats = residentialFlats.length;
    const owners  = residentialFlats.filter(t => t.occupantType === 'Owner').length;
    const tenants = residentialFlats.filter(t => t.occupantType === 'Tenant').length;
    const activeResidents = residentialFlats.reduce((s, t) => s + (t.activeUsers || 0), 0);
    const kids = residentialFlats.reduce((s, t) => s + (t.kidsCount || 0), 0);
    
    // Lease expiry alerts (within 90 days)
    const today = new Date();
    const leaseAlerts = tenantData
      .filter(t => t.occupantType === 'Tenant' && t.endDate)
      .map(t => {
        const days = Math.ceil((new Date(t.endDate) - today) / 86400000);
        if (days > 90) return null;
        return { flat: t.flat, tenant: t.tenantName, days, endDate: t.endDate };
      })
      .filter(Boolean)
      .sort((a, b) => a.days - b.days);

    return { totalFlats, owners, tenants, activeResidents, kids, leaseAlerts };
  }, [tenantData]);

  // ─── Derived: Shop Stats ──────────────────────────────────────────────────
  const shopStats = useMemo(() => {
    const totalShops = shopData.length;
    let totalOutstanding = 0;
    shopData.forEach(shop => {
      const lastEntry = shop.ledger?.[shop.ledger.length - 1];
      if (lastEntry) {
        totalOutstanding += (parseFloat(lastEntry.netAmount) || 0);
      }
    });
    return { totalShops, totalOutstanding };
  }, [shopData]);

  // ─── Derived: Task Stats ──────────────────────────────────────────────────
  const taskStats = useMemo(() => {
    const total   = tasks.length;
    const done    = tasks.filter(t => t.status === 'Done').length;
    const pending = tasks.filter(t => t.status === 'Pending').length;
    const inProg  = tasks.filter(t => t.status === 'In Progress').length;
    const onHold  = tasks.filter(t => t.status === 'On Hold').length;
    const overdue = tasks.filter(t => {
      const d = calcDaysLeft(t.deadline, t.status);
      return d !== null && d < 0;
    }).length;
    const donePct = total ? Math.round((done / total) * 100) : 0;

    // Priority tasks — not done, sorted by urgency
    const priorityTasks = tasks
      .filter(t => t.status !== 'Done')
      .sort((a, b) => {
        const priOrder = { High: 0, Medium: 1, Low: 2, '': 3 };
        if (priOrder[a.priority || ''] !== priOrder[b.priority || '']) {
          return priOrder[a.priority || ''] - priOrder[b.priority || ''];
        }
        const dA = calcDaysLeft(a.deadline, a.status);
        const dB = calcDaysLeft(b.deadline, b.status);
        if (dA !== null && dB !== null) return dA - dB;
        if (dA !== null) return -1;
        return 1;
      })
      .slice(0, 8);

    return { total, done, pending, inProg, onHold, overdue, donePct, priorityTasks };
  }, [tasks]);

  // ─── Derived: Finance summary ────────────────────────────────────────────
  const financeSummary = useMemo(() => {
    if (financeData.length === 0) return { totalIncome: 0, totalExpense: 0, avgSurplus: 0, latestMonth: null };
    const totalIncome  = financeData.reduce((s, d) => s + d.income, 0);
    const totalExpense = financeData.reduce((s, d) => s + d.expense, 0);
    const avgSurplus   = Math.round((totalIncome - totalExpense) / financeData.length);
    const latestMonth  = financeData[financeData.length - 1];
    return { totalIncome, totalExpense, avgSurplus, latestMonth };
  }, [financeData]);

  // ─── Derived: Petty Cash summary ──────────────────────────────────────────
  const pettyCashSummary = useMemo(() => {
    const now = new Date();
    const currMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    
    let totalSpentA = 0, totalSpentCommon = 0;
    let currentMonthA = 0, currentMonthCommon = 0;

    pettyCash.buildingA.forEach(e => {
      const amt = parseFloat(e.amount) || 0;
      totalSpentA += amt;
      if (e.date?.startsWith(currMonth)) currentMonthA += amt;
    });
    pettyCash.common.forEach(e => {
      const amt = parseFloat(e.amount) || 0;
      totalSpentCommon += amt;
      if (e.date?.startsWith(currMonth)) currentMonthCommon += amt;
    });

    return {
      totalSpent: totalSpentA + totalSpentCommon,
      currentMonth: currentMonthA + currentMonthCommon,
      buildingA: totalSpentA,
      common: totalSpentCommon,
    };
  }, [pettyCash]);

  // ─── Derived: Occupancy Pie Data ──────────────────────────────────────────
  const occupancyPie = useMemo(() => [
    { name: 'Owners', value: tenantStats.owners },
    { name: 'Tenants', value: tenantStats.tenants },
  ], [tenantStats]);

  const taskPie = useMemo(() => [
    { name: 'Done', value: taskStats.done },
    { name: 'Pending', value: taskStats.pending },
    { name: 'In Progress', value: taskStats.inProg },
    { name: 'On Hold', value: taskStats.onHold },
  ].filter(d => d.value > 0), [taskStats]);
  const taskPieColors = ['#10b981', '#f59e0b', '#3b82f6', '#8b5cf6'];

  // ─── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="exec-shell">

      {/* ── Hero Banner ── */}
      <div className="exec-hero">
        <div className="exec-hero__text">
          <h1>Society Overview</h1>
          <p>Majestique Euriska — A Building Dashboard</p>
          <span className="exec-hero__badge">
            {new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date())}
          </span>
        </div>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <button
            style={{ background: 'rgba(196,155,79,0.2)', border: '1px solid rgba(196,155,79,0.4)', color: '#C49B4F', borderRadius: '12px', padding: '10px 18px', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 700, fontFamily: 'inherit' }}
            onClick={() => navigate('manager_tasks')}
          >
            ✅ Manager Tasks
          </button>
          <button
            style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', borderRadius: '12px', padding: '10px 18px', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 700, fontFamily: 'inherit' }}
            onClick={() => navigate('finance')}
          >
            💰 Finance
          </button>
          <button
            style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', borderRadius: '12px', padding: '10px 18px', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 700, fontFamily: 'inherit' }}
            onClick={() => navigate('announcements')}
          >
            📢 Notices
          </button>
          <button
            style={{ background: 'rgba(16, 185, 129, 0.22)', border: '1px solid rgba(16, 185, 129, 0.45)', color: '#6ee7b7', borderRadius: '12px', padding: '10px 18px', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 700, fontFamily: 'inherit' }}
            onClick={() => navigate('agm_records')}
          >
            📜 AGM 2026
          </button>
        </div>
      </div>

      {/* ── AGM 2026 Official Governance Banner ── */}
      <div
        style={{
          background: 'linear-gradient(135deg, #0e3030 0%, #174e4e 60%, #1f6767 100%)',
          borderRadius: 16,
          padding: '16px 22px',
          color: '#ffffff',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 14,
          boxShadow: '0 4px 14px rgba(14, 48, 48, 0.15)',
          cursor: 'pointer',
          marginBottom: 16
        }}
        onClick={() => navigate('agm_records')}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <span style={{ fontSize: '1.8rem' }}>🏛️</span>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontWeight: 800, fontSize: '0.98rem', color: '#ffffff' }}>
                AGM 2026, AGM 2025 & SGM 2025 Minutes & Resolutions Stored
              </span>
              <span style={{ background: '#10b981', color: '#fff', fontSize: '0.7rem', padding: '2px 8px', borderRadius: 10, fontWeight: 700 }}>
                AGM 2026 (06.09.2026)
              </span>
              <span style={{ background: 'rgba(255,255,255,0.18)', color: '#bbf7d0', fontSize: '0.7rem', padding: '2px 8px', borderRadius: 10, fontWeight: 700 }}>
                AGM 2025 (02.11.2025)
              </span>
              <span style={{ background: 'rgba(255,255,255,0.18)', color: '#fef08a', fontSize: '0.7rem', padding: '2px 8px', borderRadius: 10, fontWeight: 700 }}>
                SGM 2025 (15.06.2025)
              </span>
            </div>
            <p style={{ margin: '3px 0 0 0', fontSize: '0.82rem', color: 'rgba(255,255,255,0.8)' }}>
              3 Official General Body Meetings archived (26 Total Resolutions): AGM 2026 (7 Resolutions), AGM 2025 (16 Resolutions) & SGM 2025 (Maintenance ₹3K, EPDM Flooring, Auditor Balaji Chaudhari).
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            style={{
              background: '#ffffff',
              color: '#0e3030',
              border: 'none',
              padding: '8px 16px',
              borderRadius: 8,
              fontSize: '0.8rem',
              fontWeight: 800,
              cursor: 'pointer'
            }}
          >
            Open AGM Archive →
          </button>
        </div>
      </div>

      {/* ── Loading ── */}
      {loading && (
        <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8', fontSize: '0.9rem' }}>
          <div style={{ fontSize: '1.6rem', marginBottom: 8 }}>⏳</div>
          Loading live data from Firestore…
        </div>
      )}

      {!loading && (
        <>
          {/* ══════════════════════════════════════════════════════════════════════
              KPI Cards Row
          ══════════════════════════════════════════════════════════════════════ */}
          <div className="exec-kpi-grid">
            {/* Total Flats */}
            <div className="exec-kpi-card exec-kpi-card--teal" style={{ cursor: 'pointer' }} onClick={() => navigate('tenants')}>
              <p className="exec-kpi-label">Total Flats</p>
              <p className="exec-kpi-value">{tenantStats.totalFlats}</p>
              <p className="exec-kpi-sub">{tenantStats.activeResidents} active residents</p>
            </div>

            {/* Task Progress */}
            <div className="exec-kpi-card exec-kpi-card--green" style={{ cursor: 'pointer' }} onClick={() => navigate('manager_tasks')}>
              <p className="exec-kpi-label">Tasks Completed</p>
              <p className="exec-kpi-value" style={{ color: '#065f46' }}>{taskStats.donePct}%</p>
              <p className="exec-kpi-sub">{taskStats.done}/{taskStats.total} done</p>
              <div className="exec-kpi-progress">
                <div className="exec-kpi-progress-fill" style={{ width: `${taskStats.donePct}%`, background: '#10b981' }} />
              </div>
            </div>

            {/* Overdue Tasks */}
            <div className="exec-kpi-card exec-kpi-card--red" style={{ cursor: 'pointer' }} onClick={() => navigate('manager_tasks')}>
              <p className="exec-kpi-label">Overdue Tasks</p>
              <p className="exec-kpi-value" style={{ color: taskStats.overdue > 0 ? '#dc2626' : '#065f46' }}>
                {taskStats.overdue}
              </p>
              <p className="exec-kpi-sub">{taskStats.pending} pending</p>
            </div>

            {/* Latest Month Finance */}
            <div className="exec-kpi-card exec-kpi-card--gold" style={{ cursor: 'pointer' }} onClick={() => navigate('finance')}>
              <p className="exec-kpi-label">{financeSummary.latestMonth ? `${financeSummary.latestMonth.label} Surplus` : 'Monthly Surplus'}</p>
              <p className="exec-kpi-value" style={{ color: (financeSummary.latestMonth?.surplus || 0) >= 0 ? '#065f46' : '#dc2626', fontSize: '1.4rem' }}>
                {fmtCr(financeSummary.latestMonth?.surplus || 0)}
              </p>
              <p className="exec-kpi-sub">Income: {fmtCr(financeSummary.latestMonth?.income || 0)}</p>
            </div>

            {/* Shop Outstanding */}
            <div className="exec-kpi-card exec-kpi-card--purple" style={{ cursor: 'pointer' }} onClick={() => navigate('shops')}>
              <p className="exec-kpi-label">Shop Dues</p>
              <p className="exec-kpi-value" style={{ color: '#5b21b6', fontSize: '1.3rem' }}>
                {fmtCr(shopStats.totalOutstanding)}
              </p>
              <p className="exec-kpi-sub">{shopStats.totalShops} shops tracked</p>
            </div>

            {/* Petty Cash */}
            <div className="exec-kpi-card exec-kpi-card--blue" style={{ cursor: 'pointer' }} onClick={() => navigate('petty_cash')}>
              <p className="exec-kpi-label">Petty Cash Spent</p>
              <p className="exec-kpi-value" style={{ color: '#1e40af', fontSize: '1.3rem' }}>
                {fmtCr(pettyCashSummary.totalSpent)}
              </p>
              <p className="exec-kpi-sub">This month: ₹{fmt(pettyCashSummary.currentMonth)}</p>
            </div>
          </div>

          {/* ══════════════════════════════════════════════════════════════════════
              Row 2: Finance Chart + Task Pie + Occupancy Pie
          ══════════════════════════════════════════════════════════════════════ */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20 }}>
            {/* Finance Income vs Expense Trend */}
            <div className="exec-card">
              <h3 className="exec-card-title">
                📈 Income vs Expense Trend
                <button
                  style={{ marginLeft: 'auto', background: 'none', border: 'none', fontSize: '0.78rem', color: '#196c6c', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
                  onClick={() => navigate('finance')}
                >
                  View Details →
                </button>
              </h3>
              {financeData.length > 0 ? (
                <ResponsiveContainer width="100%" height={240}>
                  <AreaChart data={financeData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="gIncome" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#196c6c" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#196c6c" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="gExpense" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="label" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tickFormatter={fmtCr} tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} width={60} />
                    <RechartsTip
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 8px 30px rgba(0,0,0,0.12)', fontSize: '0.82rem' }}
                      formatter={(val) => [`₹${fmt(val)}`, '']}
                    />
                    <Area type="monotone" dataKey="income"  stroke="#196c6c" fill="url(#gIncome)"  strokeWidth={2.5} name="Income"  dot={{ fill: '#196c6c', strokeWidth: 0, r: 3 }} />
                    <Area type="monotone" dataKey="expense" stroke="#ef4444" fill="url(#gExpense)" strokeWidth={2.5} name="Expense" dot={{ fill: '#ef4444', strokeWidth: 0, r: 3 }} />
                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '0.78rem' }} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ height: 240, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
                  No finance data available
                </div>
              )}
              {/* Summary bar */}
              <div style={{ display: 'flex', gap: 20, marginTop: 12, paddingTop: 12, borderTop: '1px solid #f1f5f9', fontSize: '0.78rem', flexWrap: 'wrap' }}>
                <span style={{ color: '#64748b' }}>Total Income: <strong style={{ color: '#196c6c' }}>{fmtCr(financeSummary.totalIncome)}</strong></span>
                <span style={{ color: '#64748b' }}>Total Expense: <strong style={{ color: '#ef4444' }}>{fmtCr(financeSummary.totalExpense)}</strong></span>
                <span style={{ color: '#64748b' }}>Avg Surplus/mo: <strong style={{ color: financeSummary.avgSurplus >= 0 ? '#065f46' : '#dc2626' }}>{fmtCr(financeSummary.avgSurplus)}</strong></span>
              </div>
            </div>

            {/* Right: Task Status + Occupancy Pie */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Task Status Pie */}
              <div className="exec-card">
                <h3 className="exec-card-title">📊 Task Status Breakdown</h3>
                {taskPie.length > 0 ? (
                  <ResponsiveContainer width="100%" height={180}>
                    <PieChart>
                      <Pie
                        data={taskPie}
                        cx="50%" cy="50%"
                        innerRadius={45} outerRadius={70}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {taskPie.map((_, i) => (
                          <Cell key={i} fill={taskPieColors[i % taskPieColors.length]} />
                        ))}
                      </Pie>
                      <RechartsTip
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 8px 30px rgba(0,0,0,0.12)', fontSize: '0.8rem' }}
                      />
                      <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '0.72rem' }} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div style={{ height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '0.85rem' }}>
                    No tasks yet
                  </div>
                )}
              </div>

              {/* Occupancy Split */}
              <div className="exec-card" style={{ cursor: 'pointer' }} onClick={() => navigate('tenants')}>
                <h3 className="exec-card-title">🏠 Occupancy Split</h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <ResponsiveContainer width="50%" height={100}>
                    <PieChart>
                      <Pie data={occupancyPie} cx="50%" cy="50%" innerRadius={28} outerRadius={42} paddingAngle={4} dataKey="value">
                        <Cell fill="#196c6c" />
                        <Cell fill="#C49B4F" />
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div style={{ fontSize: '0.82rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                      <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#196c6c', display: 'inline-block' }} />
                      <span style={{ color: '#334155' }}>Owners: <strong>{tenantStats.owners}</strong></span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#C49B4F', display: 'inline-block' }} />
                      <span style={{ color: '#334155' }}>Tenants: <strong>{tenantStats.tenants}</strong></span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ══════════════════════════════════════════════════════════════════════
              Row 3: Pending Tasks + Alerts (AMC + Lease Expiry)
          ══════════════════════════════════════════════════════════════════════ */}
          <div className="exec-grid-2col">
            {/* Pending Priority Tasks */}
            <div className="exec-card">
              <h3 className="exec-card-title">
                🔥 Priority Tasks
                <span style={{ fontSize: '0.72rem', fontWeight: 600, color: '#94a3b8', marginLeft: 6 }}>
                  (A Building + Common)
                </span>
                <button
                  style={{ marginLeft: 'auto', background: 'none', border: 'none', fontSize: '0.78rem', color: '#196c6c', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
                  onClick={() => navigate('manager_tasks')}
                >
                  View All →
                </button>
              </h3>
              {taskStats.priorityTasks.length === 0 ? (
                <div style={{ padding: 20, textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem' }}>
                  ✅ All tasks are completed!
                </div>
              ) : (
                taskStats.priorityTasks.map(t => {
                  const daysLeft = calcDaysLeft(t.deadline, t.status);
                  return (
                    <div key={t.id} className="exec-task-row">
                      <span className={`exec-task-status ${STATUS_STYLE_CLASS[t.status] || 'exec-task-status--pending'}`}>
                        {t.status || 'Pending'}
                      </span>
                      <span className="exec-task-name" title={t.taskDescription || t.taskCategory}>
                        {t.taskCategory || '—'}
                      </span>
                      {t.priority && (
                        <span style={{
                          fontSize: '0.65rem', fontWeight: 700, padding: '1px 7px', borderRadius: 12,
                          background: t.priority === 'High' ? '#fee2e2' : t.priority === 'Medium' ? '#fef3c7' : '#d1fae5',
                          color: t.priority === 'High' ? '#991b1b' : t.priority === 'Medium' ? '#92400e' : '#065f46',
                          flexShrink: 0,
                        }}>
                          {t.priority}
                        </span>
                      )}
                      <span className="exec-task-deadline">
                        {daysLeft !== null ? (
                          <span style={{
                            fontSize: '0.7rem', fontWeight: 700, padding: '1px 6px', borderRadius: 10,
                            background: daysLeft < 0 ? '#fee2e2' : daysLeft <= 3 ? '#fef3c7' : '#d1fae5',
                            color: daysLeft < 0 ? '#991b1b' : daysLeft <= 3 ? '#d97706' : '#065f46',
                          }}>
                            {daysLeft < 0 ? `${Math.abs(daysLeft)}d overdue` : `${daysLeft}d left`}
                          </span>
                        ) : (
                          t.deadline ? fmtDate(t.deadline) : '—'
                        )}
                      </span>
                    </div>
                  );
                })
              )}
            </div>

            {/* Alerts Column */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* AMC Alerts */}
              <div className="exec-card">
                <h3 className="exec-card-title" style={{ cursor: 'pointer' }} onClick={() => navigate('amc')}>
                  ⚠️ AMC Alerts
                </h3>
                {amcAlerts.length === 0 ? (
                  <div className="exec-alert-item">
                    <div className="exec-alert-dot exec-alert-dot--green" />
                    <div className="exec-alert-text"><strong>All contracts active</strong>No expiries in the next 60 days</div>
                  </div>
                ) : amcAlerts.map(a => (
                  <div key={a.id} className="exec-alert-item" style={{ cursor: 'pointer' }} onClick={() => navigate('amc')}>
                    <div className={`exec-alert-dot exec-alert-dot--${a.severity}`} />
                    <div className="exec-alert-text">
                      <strong>{a.name}</strong>
                      {a.days < 0 ? `Expired ${Math.abs(a.days)}d ago` : `Expires in ${a.days} day${a.days !== 1 ? 's' : ''}`}
                    </div>
                  </div>
                ))}
              </div>

              {/* Lease Expiry Alerts */}
              {tenantStats.leaseAlerts.length > 0 && (
                <div className="exec-card">
                  <h3 className="exec-card-title" style={{ cursor: 'pointer' }} onClick={() => navigate('tenants')}>
                    🏠 Lease Expiry Alerts
                  </h3>
                  {tenantStats.leaseAlerts.slice(0, 5).map(la => (
                    <div key={la.flat} className="exec-alert-item" style={{ cursor: 'pointer' }} onClick={() => navigate('tenants')}>
                      <div className={`exec-alert-dot exec-alert-dot--${la.days < 0 ? 'red' : la.days <= 30 ? 'amber' : 'green'}`} />
                      <div className="exec-alert-text">
                        <strong>{la.flat} — {la.tenant}</strong>
                        {la.days < 0
                          ? `Lease expired ${Math.abs(la.days)} days ago`
                          : `Lease expires in ${la.days} days (${fmtDate(la.endDate)})`
                        }
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Petty Cash Summary */}
              <div className="exec-card" style={{ cursor: 'pointer' }} onClick={() => navigate('petty_cash')}>
                <h3 className="exec-card-title">💵 Petty Cash Summary</h3>
                <div style={{ display: 'flex', gap: 14 }}>
                  <div style={{ flex: 1, background: '#f0fdf4', borderRadius: 12, padding: '12px 14px' }}>
                    <div style={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', color: '#94a3b8', letterSpacing: '0.06em' }}>A Building</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#065f46', marginTop: 4 }}>₹{fmt(pettyCashSummary.buildingA)}</div>
                  </div>
                  <div style={{ flex: 1, background: '#eff6ff', borderRadius: 12, padding: '12px 14px' }}>
                    <div style={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', color: '#94a3b8', letterSpacing: '0.06em' }}>Common</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#1e40af', marginTop: 4 }}>₹{fmt(pettyCashSummary.common)}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ══════════════════════════════════════════════════════════════════════
              Row 4: Monthly Surplus Bar Chart (full width)
          ══════════════════════════════════════════════════════════════════════ */}
          {financeData.length > 2 && (
            <div className="exec-card">
              <h3 className="exec-card-title">
                📊 Monthly Surplus Trend
                <button
                  style={{ marginLeft: 'auto', background: 'none', border: 'none', fontSize: '0.78rem', color: '#196c6c', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
                  onClick={() => navigate('finance')}
                >
                  Finance Tracker →
                </button>
              </h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={financeData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="label" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={fmtCr} tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} width={60} />
                  <RechartsTip
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 8px 30px rgba(0,0,0,0.12)', fontSize: '0.82rem' }}
                    formatter={(val) => [`₹${fmt(val)}`, 'Surplus']}
                  />
                  <Bar dataKey="surplus" radius={[6, 6, 0, 0]} maxBarSize={40}>
                    {financeData.map((entry, i) => (
                      <Cell key={i} fill={entry.surplus >= 0 ? '#196c6c' : '#ef4444'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════════
              Quick Navigation
          ══════════════════════════════════════════════════════════════════════ */}
          {isAdmin && (
            <div className="exec-card">
              <h3 className="exec-card-title">🚀 Quick Navigation</h3>
              <div className="exec-quick-nav">
                {QUICK_LINKS.map(link => (
                  <button key={link.id} className="exec-quick-btn" onClick={() => navigate(link.id)}>
                    <span className="exec-quick-btn-icon">{link.icon}</span>
                    {link.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
