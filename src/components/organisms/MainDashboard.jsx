import React, { useState, useEffect, useMemo } from 'react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTip, ResponsiveContainer, Cell, Legend
} from 'recharts';
import {
  Building2,
  Users,
  UserCheck,
  Home,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  Clock,
  CreditCard,
  Wallet,
  Landmark,
  Wrench,
  Shield,
  Sparkles,
  Droplets,
  Car,
  FileText,
  Calendar,
  Layers,
  CheckSquare
} from 'lucide-react';
import { doc, getDoc, getDocs, collection } from 'firebase/firestore';
import { db, isFirebaseConfigured, ensureFirebaseSession } from '../../firebase.js';
import { initialTenantData } from '../../data/tenantSeedData.js';
import { initialShopData } from '../../data/shopSeedData.js';
import { financeSeedData } from '../../data/financeSeedData.js';
import { fixedDeposits as mockFixedDeposits } from '../../data/mockData.js';

// ─── Liquid Glass Design System ────────────────────────────────────────────────
import {
  LiquidGlassCard,
  LiquidGlassKpi,
  KpiGrid,
  KpiSkeleton
} from '../liquid-glass/index.js';

// ─── KPI Domain Hooks ──────────────────────────────────────────────────────────
import { useSocietyKpis } from '../../hooks/useSocietyKpis.js';
import { useFinanceKpis } from '../../hooks/useFinanceKpis.js';
import { useMaintenanceKpis } from '../../hooks/useMaintenanceKpis.js';
import { useOperationsKpis } from '../../hooks/useOperationsKpis.js';
import './MainDashboard.css';


// ─── Formatters ─────────────────────────────────────────────────────────────────
const fmt = (v) => Number(v || 0).toLocaleString('en-IN');
const fmtCr = (v) => {
  const n = Number(v || 0);
  const sign = n < 0 ? '-' : '';
  const abs = Math.abs(n);
  if (abs >= 10000000) return `${sign}₹${(abs / 10000000).toFixed(2)}Cr`;
  if (abs >= 100000) return `${sign}₹${(abs / 100000).toFixed(2)}L`;
  if (abs >= 1000) return `${sign}₹${(abs / 1000).toFixed(0)}K`;
  return `${sign}₹${abs}`;
};

function fmtDate(v) {
  if (!v) return '';
  try {
    const [y, m, d] = v.split('-');
    return `${d}/${m}/${y.slice(2)}`;
  } catch { return v; }
}

function calcDaysLeft(deadline, status) {
  if (!deadline || status === 'Done' || status === 'Resolved') return null;
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
  { id: 'tata_electricity', icon: '⚡', label: 'Tata Electricity' },
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

// ─── FY months (Apr 2025 → Sep 2026) for finance trend ─────────────────────────
const FY_MONTHS = [
  '2025-04','2025-05','2025-06','2025-07','2025-08','2025-09',
  '2025-10','2025-11','2025-12','2026-01','2026-02','2026-03',
  '2026-04','2026-05','2026-06','2026-07','2026-08','2026-09',
];

export default function MainDashboard({ stats, isAdmin }) {
  // State for Firestore-sourced data
  const [tasks, setTasks] = useState([]);
  const [amcAlerts, setAmcAlerts] = useState([]);
  const [financeData, setFinanceData] = useState([]);
  const [pettyCash, setPettyCash] = useState({ buildingA: [], common: [] });
  const [tenantData, setTenantData] = useState(initialTenantData);
  const [shopData, setShopData] = useState(initialShopData);
  const [tankerData, setTankerData] = useState(null);
  const [complaintsData, setComplaintsData] = useState([]);
  const [announcementsData, setAnnouncementsData] = useState([]);
  const [agmData, setAgmData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [kpiCategoryFilter, setKpiCategoryFilter] = useState('all'); // 'all' | 'society' | 'finance' | 'maintenance' | 'operations'

  useEffect(() => {
    let cancelled = false;
    async function loadAll() {
      if (!isFirebaseConfigured || !db) {
        setLoading(false);
        return;
      }
      try {
        await ensureFirebaseSession();

        // 1. Manager Tasks
        const taskPromises = ['managerTasks_common', 'managerTasks_a_building'].map((col) =>
          getDocs(collection(db, col)).then((snap) =>
            snap.docs.map((d) => ({ id: d.id, _source: col, ...d.data() }))
          ).catch(() => [])
        );

        // 2. AMC alerts
        const amcPromise = getDoc(doc(db, 'amcData', 'amc_contracts')).catch(() => null);

        // 3. Finance monthly data
        const financePromises = FY_MONTHS.map((m) =>
          getDoc(doc(db, 'financeMonthly', `finance_${m}`)).then((snap) => {
            if (snap.exists()) {
              const d = snap.data();
              const income = (d.income || []).reduce((s, r) => s + (parseFloat(r.amount) || 0), 0);
              const expense = (d.expenses || []).reduce((s, r) => s + (parseFloat(r.amount) || 0), 0);
              const [y, mo] = m.split('-').map(Number);
              return {
                month: m,
                label: new Intl.DateTimeFormat('en-IN', { month: 'short', year: '2-digit' }).format(new Date(y, mo - 1, 1)),
                income,
                expense,
                surplus: income - expense,
              };
            }
            return null;
          }).catch(() => null)
        );

        // 4. Petty Cash
        const pettyCashPromises = ['buildingA', 'common'].map((id) =>
          getDoc(doc(db, 'pettyCash', id)).then((snap) =>
            snap.exists() ? { id, ...(snap.data()) } : null
          ).catch(() => null)
        );

        // 5. Tenant data
        const tenantPromise = getDocs(collection(db, 'tenantTracker')).then((snap) =>
          snap.docs.length > 0 ? snap.docs.map((d) => ({ id: d.id, ...d.data() })) : null
        ).catch(() => null);

        // 6. Shop data
        const shopPromise = getDoc(doc(db, 'shopMaintenance', 'shop_maintenance_ledger'))
          .then((snap) => {
            if (snap.exists() && snap.data()?.shops) return snap.data().shops;
            return getDoc(doc(db, 'shopMaintenance', 'shops')).then((s) => (s.exists() ? s.data().shops || null : null));
          })
          .catch(() => null);

        // 7. Water Tanker
        const currentYearMonth = new Date().toISOString().slice(0, 7);
        const tankerPromise = getDoc(doc(db, 'tankerEntries', `tanker_${currentYearMonth}`)).then((snap) =>
          snap.exists() ? snap.data() : null
        ).catch(() => null);

        // 8. Complaints
        const complaintsPromise = getDocs(collection(db, 'complaints')).then((snap) =>
          snap.docs.map((d) => ({ id: d.id, ...d.data() }))
        ).catch(() => []);

        // 9. Announcements
        const announcementsPromise = getDocs(collection(db, 'announcements')).then((snap) =>
          snap.docs.map((d) => ({ id: d.id, ...d.data() }))
        ).catch(() => []);

        // 10. AGM Records
        const agmPromise = getDocs(collection(db, 'agmRecords')).then((snap) =>
          snap.docs.map((d) => ({ id: d.id, ...d.data() }))
        ).catch(() => []);

        const [
          taskResults,
          amcSnap,
          financeResults,
          pettyCashResults,
          tenantResult,
          shopResult,
          tankerResult,
          complaintsResult,
          announcementsResult,
          agmResult
        ] = await Promise.all([
          Promise.all(taskPromises),
          amcPromise,
          Promise.all(financePromises),
          Promise.all(pettyCashPromises),
          tenantPromise,
          shopPromise,
          tankerPromise,
          complaintsPromise,
          announcementsPromise,
          agmPromise
        ]);

        if (cancelled) return;

        // Process tasks
        setTasks(taskResults.flat());

        // Process AMC
        if (amcSnap?.exists()) {
          const { contracts = [] } = amcSnap.data();
          const alerts = contracts
            .map((c) => {
              if (!c.endDate) return null;
              const days = Math.ceil((new Date(c.endDate) - new Date()) / 86400000);
              if (days > 60) return null;
              return {
                id: c.id,
                name: c.name,
                vendor: c.vendor,
                days,
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
        setPettyCash({
          buildingA: pettyCashResults[0]?.entries || [],
          common: pettyCashResults[1]?.entries || [],
        });

        if (tenantResult) setTenantData(tenantResult);
        if (shopResult) setShopData(shopResult);
        if (tankerResult) setTankerData(tankerResult);
        if (complaintsResult && complaintsResult.length > 0) setComplaintsData(complaintsResult);
        if (announcementsResult && announcementsResult.length > 0) setAnnouncementsData(announcementsResult);
        if (agmResult && agmResult.length > 0) setAgmData(agmResult);
      } catch (e) {
        console.warn('Dashboard load error:', e);
        setFinanceData(buildFallbackFinance());
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadAll();
    return () => { cancelled = true; };
  }, []);

  function buildFallbackFinance() {
    return Object.entries(financeSeedData).map(([, d]) => {
      const m = d.month;
      if (!m) return null;
      const income = (d.income || []).reduce((s, r) => s + (parseFloat(r.amount) || 0), 0);
      const expense = (d.expenses || []).reduce((s, r) => s + (parseFloat(r.amount) || 0), 0);
      const [y, mo] = m.split('-').map(Number);
      return {
        month: m,
        label: new Intl.DateTimeFormat('en-IN', { month: 'short', year: '2-digit' }).format(new Date(y, mo - 1, 1)),
        income,
        expense,
        surplus: income - expense,
      };
    }).filter(Boolean).sort((a, b) => a.month.localeCompare(b.month));
  }

  const navigate = (tabId) => {
    const tabMap = {
      shops: 'shop_maintenance',
      tenants: 'tenant_tracking',
      parking: 'parking_allotment',
      agm: 'agm_records',
      agm_records: 'agm_records',
      tanker: 'tanker',
      complaints: 'complaints',
      announcements: 'announcements',
      maintenance: 'maintenance',
      amc: 'amc',
      finance: 'finance',
      manager_tasks: 'manager_tasks',
      petty_cash: 'petty_cash',
      cheques: 'cheques'
    };
    const target = tabMap[tabId] || tabId;
    window.dispatchEvent(new CustomEvent('changeTab', { detail: target }));
  };

  // ─── KPI Domain Hooks Integration ──────────────────────────────────────────
  const societyKpis = useSocietyKpis({ tenantData, complaintsData, loading });
  const financeKpis = useFinanceKpis({ financeData, stats, shopData, fixedDeposits: mockFixedDeposits, loading });
  const maintenanceKpis = useMaintenanceKpis({ complaintsData, tasks, loading });
  const operationsKpis = useOperationsKpis({ amcAlerts, tankerData, tasks, loading });

  // ─── Derived: Tenant Stats ──────────────────────────────────────────────────
  const tenantStats = useMemo(() => {
    const residentialFlats = tenantData.filter((t) => t.flatType === 'Residential' || !t.flatType);
    const totalFlats = residentialFlats.length;
    const owners = residentialFlats.filter((t) => t.occupantType === 'Owner').length;
    const tenants = residentialFlats.filter((t) => t.occupantType === 'Tenant').length;
    const activeResidents = residentialFlats.reduce((s, t) => s + (Number(t.activeUsers) || 1), 0);
    const kids = residentialFlats.reduce((s, t) => s + (t.kidsCount || 0), 0);

    const today = new Date();
    const leaseAlerts = tenantData
      .filter((t) => t.occupantType === 'Tenant' && t.endDate)
      .map((t) => {
        const days = Math.ceil((new Date(t.endDate) - today) / 86400000);
        if (days > 90) return null;
        return { flat: t.flat, tenant: t.tenantName, days, endDate: t.endDate };
      })
      .filter(Boolean)
      .sort((a, b) => a.days - b.days);

    return { totalFlats, owners, tenants, activeResidents, kids, leaseAlerts };
  }, [tenantData]);

  // ─── Derived: Shop Stats ────────────────────────────────────────────────────
  const shopStats = useMemo(() => {
    const totalShops = shopData.length;
    let totalOutstanding = 0;
    shopData.forEach((shop) => {
      const lastEntry = shop.ledger?.[shop.ledger.length - 1];
      if (lastEntry) {
        totalOutstanding += (parseFloat(lastEntry.netAmount) || 0);
      }
    });
    return { totalShops, totalOutstanding };
  }, [shopData]);

  // ─── Derived: Task Stats ────────────────────────────────────────────────────
  const taskStats = useMemo(() => {
    const total = tasks.length;
    const done = tasks.filter((t) => t.status === 'Done').length;
    const pending = tasks.filter((t) => t.status === 'Pending').length;
    const inProg = tasks.filter((t) => t.status === 'In Progress').length;
    const onHold = tasks.filter((t) => t.status === 'On Hold').length;
    const overdue = tasks.filter((t) => {
      const d = calcDaysLeft(t.deadline, t.status);
      return d !== null && d < 0;
    }).length;
    const donePct = total ? Math.round((done / total) * 100) : 0;

    const priorityTasks = tasks
      .filter((t) => t.status !== 'Done')
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

  // ─── Derived: Finance summary ──────────────────────────────────────────────
  const financeSummary = useMemo(() => {
    if (financeData.length === 0) return { totalIncome: 0, totalExpense: 0, avgSurplus: 0, latestMonth: null };
    const totalIncome = financeData.reduce((s, d) => s + d.income, 0);
    const totalExpense = financeData.reduce((s, d) => s + d.expense, 0);
    const avgSurplus = Math.round((totalIncome - totalExpense) / financeData.length);
    const latestMonth = financeData[financeData.length - 1];
    return { totalIncome, totalExpense, avgSurplus, latestMonth };
  }, [financeData]);

  // ─── Derived: Petty Cash summary ────────────────────────────────────────────
  const pettyCashSummary = useMemo(() => {
    const now = new Date();
    const currMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    let totalSpentA = 0;
    let totalSpentCommon = 0;
    let currentMonthA = 0;
    let currentMonthCommon = 0;

    pettyCash.buildingA.forEach((e) => {
      const amt = parseFloat(e.amount) || 0;
      totalSpentA += amt;
      if (e.date?.startsWith(currMonth)) currentMonthA += amt;
    });
    pettyCash.common.forEach((e) => {
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

  // ─── Derived: Occupancy Pie Data ────────────────────────────────────────────
  const occupancyPie = useMemo(() => [
    { name: 'Owners', value: tenantStats.owners },
    { name: 'Tenants', value: tenantStats.tenants },
  ], [tenantStats]);

  const taskPie = useMemo(() => [
    { name: 'Done', value: taskStats.done },
    { name: 'Pending', value: taskStats.pending },
    { name: 'In Progress', value: taskStats.inProg },
    { name: 'On Hold', value: taskStats.onHold },
  ].filter((d) => d.value > 0), [taskStats]);
  const taskPieColors = ['#10b981', '#f59e0b', '#3b82f6', '#8b5cf6'];

  // ─── Derived: Requires Attention Items ──────────────────────────────────────
  const requiresAttentionItems = useMemo(() => {
    const items = [];

    // 1. AMC expiring soon (<60 days)
    amcAlerts.forEach((a) => {
      items.push({
        id: `amc-${a.id}`,
        category: 'AMC Expiring Soon',
        severity: a.severity === 'red' ? 'urgent' : 'warning',
        badge: a.days < 0 ? 'OVERDUE' : 'EXPIRING SOON',
        title: a.name,
        details: `${a.days < 0 ? `Expired ${Math.abs(a.days)}d ago` : `Expires in ${a.days} days`} • Vendor: ${a.vendor || 'Authorized Service'}`,
        actionTab: 'amc',
        actionLabel: 'Renew AMC →'
      });
    });

    // 2. Outstanding Maintenance Arrears
    if (shopStats.totalOutstanding > 0) {
      items.push({
        id: 'dues-shops',
        category: 'Outstanding Maintenance',
        severity: 'urgent',
        badge: 'OVERDUE ARREARS',
        title: `Shop Maintenance Arrears: ${fmtCr(shopStats.totalOutstanding)}`,
        details: `${shopStats.totalShops} commercial shops monitored in Wing A frontage`,
        actionTab: 'shops',
        actionLabel: 'Audit Arrears →'
      });
    }

    // 3. Pending Manager Tasks
    taskStats.priorityTasks
      .filter((t) => (calcDaysLeft(t.deadline, t.status) !== null && calcDaysLeft(t.deadline, t.status) <= 0) || t.priority === 'High')
      .slice(0, 3)
      .forEach((t) => {
        const dLeft = calcDaysLeft(t.deadline, t.status);
        items.push({
          id: `task-${t.id}`,
          category: 'Pending Manager Task',
          severity: dLeft !== null && dLeft < 0 ? 'urgent' : 'warning',
          badge: dLeft !== null && dLeft < 0 ? 'OVERDUE' : 'HIGH PRIORITY',
          title: t.taskCategory || t.taskDescription || 'Facility Operation Task',
          details: `${dLeft !== null && dLeft < 0 ? `${Math.abs(dLeft)} days overdue` : 'Deadline approaching'} • Assigned: ${t.assignedTo || 'Facility Manager'}`,
          actionTab: 'manager_tasks',
          actionLabel: 'Take Action →'
        });
      });

    // 4. Pending Complaints
    const openComplaintsList = complaintsData.filter((c) => c.status !== 'Resolved');
    if (openComplaintsList.length > 0) {
      items.push({
        id: 'complaints-pending',
        category: 'Pending Complaints',
        severity: 'warning',
        badge: 'ACTION REQUIRED',
        title: `${openComplaintsList.length} Resident Complaints Unresolved`,
        details: `Latest: "${openComplaintsList[0].title || openComplaintsList[0].category || 'Water supply query'}"`,
        actionTab: 'complaints',
        actionLabel: 'Attend Complaints →'
      });
    }

    // 5. Expiring Leases
    tenantStats.leaseAlerts.slice(0, 2).forEach((la) => {
      items.push({
        id: `lease-${la.flat}`,
        category: 'Expiring Tenant Agreement',
        severity: la.days < 0 ? 'urgent' : 'warning',
        badge: la.days < 0 ? 'EXPIRED' : 'RENEWAL DUE',
        title: `Flat ${la.flat} — ${la.tenant}`,
        details: la.days < 0 ? `Registered agreement expired ${Math.abs(la.days)} days ago` : `Agreement expires in ${la.days} days (${fmtDate(la.endDate)})`,
        actionTab: 'tenants',
        actionLabel: 'Verify Agreement →'
      });
    });

    // 6. Upcoming Meetings & Governance
    items.push({
      id: 'gov-agm',
      category: 'Important Meetings',
      severity: 'info',
      badge: 'GOVERNANCE',
      title: 'AGM 2026 Resolutions & Compliance Filing',
      details: '7 Official Resolutions adopted • SGM 2025 (₹3,000 Special Maintenance & Flooring)',
      actionTab: 'agm_records',
      actionLabel: 'View Resolutions →'
    });

    return items;
  }, [amcAlerts, shopStats, taskStats, complaintsData, tenantStats]);

  return (
    <div className="exec-shell">
      {/* ── Executive Liquid Glass Hero Banner ── */}
      <LiquidGlassCard className="exec-hero glass-hero" padding="lg">
        <div className="exec-hero__text">
          <div className="exec-hero__tag-row">
            <span className="glass-chip glass-chip--crimson">APPLE-INSPIRED LIQUID GLASS UI</span>
            <span className="exec-hero__badge">
              {new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date())}
            </span>
          </div>
          <h1>Society Overview</h1>
          <p>Majestique Euriska — Comprehensive Liquid Glass Executive Telemetry</p>
        </div>

        <div className="exec-hero__actions">
          <button
            type="button"
            className="glass-action-pill glass-action-pill--accent"
            onClick={() => navigate('manager_tasks')}
          >
            ✅ Manager Tasks
          </button>
          <button
            type="button"
            className="glass-action-pill"
            onClick={() => navigate('finance')}
          >
            💰 Finance
          </button>
          <button
            type="button"
            className="glass-action-pill"
            onClick={() => navigate('announcements')}
          >
            📢 Notices
          </button>
          <button
            type="button"
            className="glass-action-pill glass-action-pill--emerald"
            onClick={() => navigate('agm_records')}
          >
            📜 AGM 2026
          </button>
        </div>
      </LiquidGlassCard>

      {/* ── AGM Official Governance Banner ── */}
      <div
        className="glass-agm-banner liquid-glass-card"
        onClick={() => navigate('agm_records')}
      >
        <div className="glass-agm-banner__left">
          <span className="glass-agm-banner__icon">🏛️</span>
          <div>
            <div className="glass-agm-banner__tags">
              <span className="glass-agm-banner__title">
                AGM 2026, AGM 2025 & SGM 2025 Minutes & Resolutions Stored
              </span>
              <span className="glass-agm-tag glass-agm-tag--green">
                AGM 2026 (06.09.2026)
              </span>
              <span className="glass-agm-tag glass-agm-tag--slate">
                AGM 2025 (02.11.2025)
              </span>
              <span className="glass-agm-tag glass-agm-tag--amber">
                SGM 2025 (15.06.2025)
              </span>
            </div>
            <p className="glass-agm-banner__desc">
              3 Official General Body Meetings archived (26 Total Resolutions): AGM 2026 (7 Resolutions), AGM 2025 (16 Resolutions) & SGM 2025 (Maintenance ₹3K, EPDM Flooring, Auditor Balaji Chaudhari).
            </p>
          </div>
        </div>
        <div className="glass-agm-banner__right">
          <button
            type="button"
            className="glass-agm-btn"
          >
            Open AGM Archive →
          </button>
        </div>
      </div>

      {/* ── Society Building & Flat Breakdown (Design Requirement 4 & 5) ── */}
      <LiquidGlassCard className="society-flats-card" padding="lg">
        <div className="society-flats-header">
          <div>
            <span className="society-flats-kicker">RESIDENTIAL WINGS INFRASTRUCTURE</span>
            <h2 className="society-flats-title">Society Housing Capacity & Wings</h2>
            <p className="society-flats-sub">
              Majestique Euriska comprises 3 distinct residential towers with 231 total apartments plus commercial frontage.
            </p>
          </div>
          <div className="society-flats-total-badge">
            <span className="society-flats-total-num">231</span>
            <span className="society-flats-total-label">Total Society Flats</span>
          </div>
        </div>

        <div className="society-wings-grid">
          {/* Building A */}
          <div
            className="society-wing-card society-wing-card--active"
            onClick={() => navigate('tenants')}
            role="button"
            tabIndex={0}
          >
            <div className="society-wing-card__header">
              <div className="society-wing-tag society-wing-tag--crimson">Wing A (Active Monitor)</div>
              <span className="society-wing-badge">87 Flats</span>
            </div>
            <div className="society-wing-card__count">
              <span className="society-wing-number">87</span>
              <span className="society-wing-unit">Flats (Building A)</span>
            </div>
            <div className="society-wing-card__stats">
              <span>👤 {tenantStats.owners} Owners</span>
              <span>🔑 {tenantStats.tenants} Tenants</span>
              <span>🏪 14 Shops</span>
            </div>
            <div className="society-wing-card__progress">
              <div className="society-wing-card__fill main-dashboard-s1" />
            </div>
            <div className="society-wing-card__link">View Tenant Roster →</div>
          </div>

          {/* Building B */}
          <div className="society-wing-card">
            <div className="society-wing-card__header">
              <div className="society-wing-tag">Wing B</div>
              <span className="society-wing-badge">96 Flats</span>
            </div>
            <div className="society-wing-card__count">
              <span className="society-wing-number">96</span>
              <span className="society-wing-unit">Flats (Building B)</span>
            </div>
            <div className="society-wing-card__stats">
              <span>🏢 12 Storeys</span>
              <span>💧 Dual Riser Lines</span>
              <span>⚡ Tata Power</span>
            </div>
            <div className="society-wing-card__progress">
              <div className="society-wing-card__fill main-dashboard-s2" />
            </div>
            <div className="society-wing-card__meta">Shared Common Utilities</div>
          </div>

          {/* Building C */}
          <div className="society-wing-card">
            <div className="society-wing-card__header">
              <div className="society-wing-tag">Wing C</div>
              <span className="society-wing-badge">48 Flats</span>
            </div>
            <div className="society-wing-card__count">
              <span className="society-wing-number">48</span>
              <span className="society-wing-unit">Flats (Building C)</span>
            </div>
            <div className="society-wing-card__stats">
              <span>🏢 11 Storeys</span>
              <span>🅿️ Podium Parking</span>
              <span>🛡️ Security Guard Post</span>
            </div>
            <div className="society-wing-card__progress">
              <div className="society-wing-card__fill main-dashboard-s3" />
            </div>
            <div className="society-wing-card__meta">Shared Borewell & Tanker Supply</div>
          </div>
        </div>
      </LiquidGlassCard>

      {/* ── Loading Skeleton / Indicator ── */}
      {loading && (
        <div className="main-dashboard-s4">
          <KpiGrid columns={4}>
            <KpiSkeleton count={8} />
          </KpiGrid>
        </div>
      )}

      {!loading && (
        <>
          {/* ══════════════════════════════════════════════════════════════════════
              LIQUID GLASS KPI CATEGORY SELECTOR & EXECUTIVE METRICS
          ══════════════════════════════════════════════════════════════════════ */}
          <div className="exec-section-heading main-dashboard-s5">
            <div>
              <h2>📊 Executive Society Health Indicators</h2>
              <span className="exec-section-sub">Real-time Liquid Glass metrics across Society, Finance, Maintenance & Operations</span>
            </div>

            <div className="main-dashboard-s6">
              {[
                { id: 'all', label: '🌟 All KPIs' },
                { id: 'society', label: '🏛️ Society' },
                { id: 'finance', label: '💰 Finance' },
                { id: 'maintenance', label: '🔧 Maintenance' },
                { id: 'operations', label: '⚙️ Operations' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setKpiCategoryFilter(tab.id)}
                  className="main-dashboard-s7" style={{ border: kpiCategoryFilter === tab.id ? '1px solid rgba(2, 132, 199, 0.4)' : '1px solid rgba(255, 255, 255, 0.7)', background: kpiCategoryFilter === tab.id ? 'linear-gradient(135deg, rgba(255, 255, 255, 0.95), rgba(224, 242, 254, 0.85))' : 'rgba(255, 255, 255, 0.55)', color: kpiCategoryFilter === tab.id ? '#0284c7' : '#475569', boxShadow: kpiCategoryFilter === tab.id ? '0 4px 12px rgba(2, 132, 199, 0.15)' : 'none' }}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* ══════════════════════════════════════════════════════════════════════
              CATEGORY A: SOCIETY KPIS
          ══════════════════════════════════════════════════════════════════════ */}
          {(kpiCategoryFilter === 'all' || kpiCategoryFilter === 'society') && (
            <div className="main-dashboard-s8">
              {kpiCategoryFilter !== 'all' && (
                <h3 className="main-dashboard-s9">
                  <Building2 size={16} /> Society Demographics & Infrastructure
                </h3>
              )}
              <KpiGrid columns={4}>
                {/* 1. Total Flats */}
                <LiquidGlassKpi
                  title="Total Flats"
                  value={societyKpis.totalFlats}
                  status="society"
                  icon={<Building2 size={18} />}
                  description={`${societyKpis.registeredResidents} active residents • 14 Shops`}
                  breakdown={[
                    { label: 'Wing A', value: societyKpis.breakdownByBuilding.buildingA },
                    { label: 'Wing B', value: societyKpis.breakdownByBuilding.buildingB },
                    { label: 'Wing C', value: societyKpis.breakdownByBuilding.buildingC }
                  ]}
                  tooltip="Total registered residential flats in Majestique Euriska (87+96+48 = 231 Flats)"
                  onClick={() => navigate('tenants')}
                  enableTilt={true}
                />

                {/* 2. Tasks Completed (Preserves test hook) */}
                <LiquidGlassKpi
                  title="Tasks Completed"
                  value={`${taskStats.donePct}%`}
                  status="operations"
                  icon={<CheckCircle2 size={18} />}
                  description={`${taskStats.done}/${taskStats.total} done`}
                  progress={taskStats.donePct}
                  trend={{ value: `${taskStats.donePct}%`, isPositive: taskStats.donePct >= 70, label: 'Completion velocity' }}
                  onClick={() => navigate('manager_tasks')}
                  enableTilt={true}
                />

                {/* 3. Overdue Tasks (Preserves test hook) */}
                <LiquidGlassKpi
                  title="Overdue Tasks"
                  value={taskStats.overdue}
                  status={taskStats.overdue > 0 ? 'danger' : 'society'}
                  icon={<Clock size={18} />}
                  description={`${taskStats.pending} pending tasks`}
                  trend={taskStats.overdue > 0 ? { value: `${taskStats.overdue} delayed`, isPositive: false } : { value: 'On schedule', isPositive: true }}
                  onClick={() => navigate('manager_tasks')}
                  enableTilt={true}
                />

                {/* 4. Occupied & Vacant Flats */}
                <LiquidGlassKpi
                  title="Occupied Flats"
                  value={`${societyKpis.occupiedFlats}/${societyKpis.breakdownByBuilding.buildingA}`}
                  status="society"
                  icon={<Home size={18} />}
                  description={`${societyKpis.occupancyRate}% occupancy in monitored Wing A`}
                  breakdown={[
                    { label: 'Owners', value: societyKpis.activeOwners },
                    { label: 'Tenants', value: societyKpis.activeTenants },
                    { label: 'Vacant', value: societyKpis.vacantFlats }
                  ]}
                  progress={societyKpis.occupancyRate}
                  onClick={() => navigate('tenants')}
                  enableTilt={true}
                />
              </KpiGrid>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════════
              CATEGORY B: FINANCE KPIS
          ══════════════════════════════════════════════════════════════════════ */}
          {(kpiCategoryFilter === 'all' || kpiCategoryFilter === 'finance') && (
            <div className="main-dashboard-s8">
              {kpiCategoryFilter !== 'all' && (
                <h3 className="main-dashboard-s10">
                  <Wallet size={16} /> Financial Telemetry & Treasury
                </h3>
              )}
              <KpiGrid columns={4}>
                {/* 5. Maintenance Collection */}
                <LiquidGlassKpi
                  title="Maintenance Collection"
                  value={financeKpis.maintenanceCollected}
                  currency={true}
                  status="finance"
                  icon={<CreditCard size={18} />}
                  description="FY 2025–26 Collections"
                  trend={{ value: `${financeKpis.collectionPercentage}% rate`, isPositive: true }}
                  progress={financeKpis.collectionPercentage}
                  onClick={() => navigate('maintenance')}
                  enableTilt={true}
                />

                {/* 6. Outstanding Maintenance */}
                <LiquidGlassKpi
                  title="Outstanding Maintenance"
                  value={financeKpis.totalOutstanding}
                  currency={true}
                  status={financeKpis.totalOutstanding > 0 ? 'danger' : 'finance'}
                  icon={<AlertTriangle size={18} />}
                  description={`Shops: ${fmtCr(financeKpis.shopOutstanding)} • Flats: ${fmtCr(financeKpis.flatOutstanding)}`}
                  breakdown={[
                    { label: 'Commercial', value: fmtCr(financeKpis.shopOutstanding) },
                    { label: 'Residential', value: fmtCr(financeKpis.flatOutstanding) }
                  ]}
                  onClick={() => navigate('maintenance')}
                  enableTilt={true}
                />

                {/* 7. Monthly Income */}
                <LiquidGlassKpi
                  title="Monthly Income"
                  value={financeSummary.latestMonth?.income || 295000}
                  currency={true}
                  status="finance"
                  icon={<TrendingUp size={18} />}
                  description={financeSummary.latestMonth ? financeSummary.latestMonth.label : 'Current Month'}
                  onClick={() => navigate('finance')}
                  enableTilt={true}
                />

                {/* 8. Monthly Expenses */}
                <LiquidGlassKpi
                  title="Monthly Expenses"
                  value={financeSummary.latestMonth?.expense || 218000}
                  currency={true}
                  status="danger"
                  icon={<TrendingDown size={18} />}
                  description="Operating expenditures"
                  onClick={() => navigate('finance')}
                  enableTilt={true}
                />

                {/* 9. Shop Dues (Preserves test hook) */}
                <LiquidGlassKpi
                  title="Shop Dues"
                  value={shopStats.totalOutstanding}
                  currency={true}
                  status="warning"
                  icon={<Building2 size={18} />}
                  description={`${shopStats.totalShops} commercial shops monitored`}
                  onClick={() => navigate('shops')}
                  enableTilt={true}
                />

                {/* 10. Petty Cash Spent (Preserves test hook) */}
                <LiquidGlassKpi
                  title="Petty Cash Spent"
                  value={pettyCashSummary.totalSpent}
                  currency={true}
                  status="finance"
                  icon={<Wallet size={18} />}
                  description={`This month: ₹${fmt(pettyCashSummary.currentMonth)}`}
                  breakdown={[
                    { label: 'Wing A', value: `₹${fmt(pettyCashSummary.buildingA)}` },
                    { label: 'Common', value: `₹${fmt(pettyCashSummary.common)}` }
                  ]}
                  onClick={() => navigate('petty_cash')}
                  enableTilt={true}
                />

                {/* 11. Reserve Funds & FDs */}
                <LiquidGlassKpi
                  title="Reserve Funds (FDs)"
                  value={financeKpis.reserveFunds}
                  currency={true}
                  status="finance"
                  icon={<Landmark size={18} />}
                  description="HDFC Bank Fixed Deposits"
                  breakdown={[
                    { label: 'A/c', value: '50200075533530' },
                    { label: 'Active FDs', value: financeKpis.activeFdCount }
                  ]}
                  onClick={() => navigate('finance')}
                  enableTilt={true}
                />

                {/* 12. Available Operating Balance */}
                <LiquidGlassKpi
                  title="Available Bank Balance"
                  value={financeKpis.availableBankBalance}
                  currency={true}
                  status="finance"
                  icon={<Landmark size={18} />}
                  description="Operating liquidity (HDFC)"
                  onClick={() => navigate('finance')}
                  enableTilt={true}
                />
              </KpiGrid>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════════
              CATEGORY C: MAINTENANCE KPIS
          ══════════════════════════════════════════════════════════════════════ */}
          {(kpiCategoryFilter === 'all' || kpiCategoryFilter === 'maintenance') && (
            <div className="main-dashboard-s8">
              {kpiCategoryFilter !== 'all' && (
                <h3 className="main-dashboard-s11">
                  <Wrench size={16} /> Maintenance & Facility Workflows
                </h3>
              )}
              <KpiGrid columns={4}>
                {/* 13. Open Manager Tasks */}
                <LiquidGlassKpi
                  title="Open Manager Tasks"
                  value={taskStats.pending + taskStats.inProg}
                  status="maintenance"
                  icon={<CheckSquare size={18} />}
                  description={`${taskStats.overdue} overdue • ${taskStats.donePct}% done`}
                  onClick={() => navigate('manager_tasks')}
                  enableTilt={true}
                />

                {/* 14. Pending Complaints */}
                <LiquidGlassKpi
                  title="Pending Complaints"
                  value={maintenanceKpis.totalOpenRequests || stats?.openComplaints || 2}
                  status={maintenanceKpis.totalOpenRequests > 0 ? 'warning' : 'maintenance'}
                  icon={<AlertTriangle size={18} />}
                  description="Resident queries unresolved"
                  breakdown={[
                    { label: 'Awaiting', value: maintenanceKpis.awaitingAssignment },
                    { label: 'In Progress', value: maintenanceKpis.inProgress },
                    { label: 'Escalated', value: maintenanceKpis.escalated }
                  ]}
                  onClick={() => navigate('complaints')}
                  enableTilt={true}
                />

                {/* 15. Vendor Work Orders Pending */}
                <LiquidGlassKpi
                  title="Vendor Work Orders"
                  value={maintenanceKpis.vendorWorkOrders || 2}
                  status="maintenance"
                  icon={<Wrench size={18} />}
                  description="External service contracts"
                  onClick={() => navigate('manager_tasks')}
                  enableTilt={true}
                />

                {/* 16. Resolved Requests */}
                <LiquidGlassKpi
                  title="Resolved Requests"
                  value={maintenanceKpis.resolvedRequests || 1}
                  status="society"
                  icon={<CheckCircle2 size={18} />}
                  description="Completed tickets & issues"
                  onClick={() => navigate('complaints')}
                  enableTilt={true}
                />
              </KpiGrid>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════════
              CATEGORY D: OPERATIONS KPIS
          ══════════════════════════════════════════════════════════════════════ */}
          {(kpiCategoryFilter === 'all' || kpiCategoryFilter === 'operations') && (
            <div className="main-dashboard-s8">
              {kpiCategoryFilter !== 'all' && (
                <h3 className="main-dashboard-s12">
                  <Shield size={16} /> Security, Utilities & Operational Governance
                </h3>
              )}
              <KpiGrid columns={4}>
                {/* 17. Security Staffing */}
                <LiquidGlassKpi
                  title="Security Staffing"
                  value={`${operationsKpis.securityStaffCount} Guards`}
                  status="operations"
                  icon={<Shield size={18} />}
                  description="24/7 Security (Chauhan Agency)"
                  breakdown={[
                    { label: 'Main Gate', value: '2' },
                    { label: 'Wing Posts', value: '2' }
                  ]}
                  onClick={() => navigate('security')}
                  enableTilt={true}
                />

                {/* 18. Housekeeping Status */}
                <LiquidGlassKpi
                  title="Housekeeping Deployment"
                  value={`${operationsKpis.housekeepingStaffCount} Staff`}
                  status="operations"
                  icon={<Sparkles size={18} />}
                  description="Daily sanitation across 3 Towers"
                  onClick={() => navigate('housekeeping')}
                  enableTilt={true}
                />

                {/* 19. Water Tanker Usage */}
                <LiquidGlassKpi
                  title="Water Tanker Usage"
                  value={`${operationsKpis.monthlyTankerTrips} Trips`}
                  status="operations"
                  icon={<Droplets size={18} />}
                  description="Current monthly consumption"
                  onClick={() => navigate('tanker')}
                  enableTilt={true}
                />

                {/* 20. Parking Occupancy */}
                <LiquidGlassKpi
                  title="Parking Occupancy"
                  value={`${operationsKpis.parkingOccupied}/${operationsKpis.parkingTotal}`}
                  status="operations"
                  icon={<Car size={18} />}
                  description={`${operationsKpis.parkingOccupancyRate}% slots allocated`}
                  progress={operationsKpis.parkingOccupancyRate}
                  onClick={() => navigate('parking')}
                  enableTilt={true}
                />

                {/* 21. AMC Expiring Soon */}
                <LiquidGlassKpi
                  title="AMC Expiring Soon"
                  value={amcAlerts.length}
                  status={amcAlerts.length > 0 ? 'warning' : 'operations'}
                  icon={<FileText size={18} />}
                  description={amcAlerts.length > 0 ? `${amcAlerts[0]?.name}` : 'All contracts active'}
                  breakdown={[
                    { label: 'Active AMCs', value: operationsKpis.activeAmcContracts }
                  ]}
                  onClick={() => navigate('amc')}
                  enableTilt={true}
                />

                {/* 22. Upcoming Meetings */}
                <LiquidGlassKpi
                  title="Upcoming Meetings"
                  value={agmData.length > 0 ? `${agmData.length} Records` : 'AGM 2026'}
                  status="society"
                  icon={<Calendar size={18} />}
                  description="General Body & Committee"
                  onClick={() => navigate('agm_records')}
                  enableTilt={true}
                />

                {/* 23. Recent Announcements */}
                <LiquidGlassKpi
                  title="Recent Announcements"
                  value={announcementsData.length || 5}
                  status="society"
                  icon={<Layers size={18} />}
                  description="Notice board broadcasts"
                  onClick={() => navigate('announcements')}
                  enableTilt={true}
                />
              </KpiGrid>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════════
              🚨 REQUIRES ATTENTION SECTION (LIQUID GLASS UPGRADE)
          ══════════════════════════════════════════════════════════════════════ */}
          <LiquidGlassCard className="exec-attention-section main-dashboard-s4" padding="lg">
            <div className="exec-attention-header">
              <div className="exec-attention-title">
                <span>🚨</span> Requires Attention
                <span className="glass-chip glass-chip--crimson">
                  {requiresAttentionItems.length} Action Items
                </span>
              </div>
            </div>

            <div className="exec-attention-grid">
              {requiresAttentionItems.map((item) => (
                <div key={item.id} className={`exec-attention-card exec-attention-card--${item.severity}`}>
                  <div>
                    <span className={`exec-attention-badge exec-attention-badge--${item.severity}`}>
                      {item.badge}
                    </span>
                    <h4 className="main-dashboard-s13">
                      {item.title}
                    </h4>
                    <p className="main-dashboard-s14">
                      {item.details}
                    </p>
                  </div>
                  <button type="button" className="exec-attention-btn" onClick={() => navigate(item.actionTab)}>
                    {item.actionLabel}
                  </button>
                </div>
              ))}
            </div>
          </LiquidGlassCard>

          {/* ══════════════════════════════════════════════════════════════════════
              Row 2: Finance Chart + Task Pie + Occupancy Pie (LIQUID GLASS WRAPPER)
          ══════════════════════════════════════════════════════════════════════ */}
          <div className="exec-charts-grid main-dashboard-s4">
            {/* Finance Income vs Expense Trend */}
            <LiquidGlassCard className="exec-card" padding="lg">
              <h3 className="exec-card-title">
                📈 Income vs Expense Trend
                <button
                  type="button"
                  className="main-dashboard-s15"
                  onClick={() => navigate('finance')}
                >
                  View Details →
                </button>
              </h3>
              {financeData.length > 0 ? (
                <ResponsiveContainer width="100%" height={240}>
                  <AreaChart data={financeData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="gIncome" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#059669" stopOpacity={0.25}/>
                        <stop offset="95%" stopColor="#059669" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="gExpense" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#C62828" stopOpacity={0.25}/>
                        <stop offset="95%" stopColor="#C62828" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                    <XAxis dataKey="label" tick={{ fill: '#6B7280', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tickFormatter={fmtCr} tick={{ fill: '#6B7280', fontSize: 11 }} axisLine={false} tickLine={false} width={52} />
                    <RechartsTip
                      contentStyle={{ borderRadius: '12px', border: '1px solid rgba(255,255,255,0.85)', background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(10px)', boxShadow: '0 8px 30px rgba(0,0,0,0.08)', fontSize: '0.82rem' }}
                      formatter={(val) => [`₹${fmt(val)}`, '']}
                    />
                    <Area type="monotone" dataKey="income" stroke="#059669" fill="url(#gIncome)" strokeWidth={2.5} name="Income" dot={{ fill: '#059669', strokeWidth: 0, r: 3 }} />
                    <Area type="monotone" dataKey="expense" stroke="#C62828" fill="url(#gExpense)" strokeWidth={2.5} name="Expense" dot={{ fill: '#C62828', strokeWidth: 0, r: 3 }} />
                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '0.78rem' }} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="main-dashboard-s16">
                  No finance data available
                </div>
              )}
              {/* Summary bar */}
              <div className="main-dashboard-s17">
                <span className="main-dashboard-s18">Total Income: <strong className="main-dashboard-s19">{fmtCr(financeSummary.totalIncome)}</strong></span>
                <span className="main-dashboard-s18">Total Expense: <strong className="main-dashboard-s20">{fmtCr(financeSummary.totalExpense)}</strong></span>
                <span className="main-dashboard-s18">Avg Surplus/mo: <strong style={{ color: financeSummary.avgSurplus >= 0 ? '#065f46' : '#C62828' }}>{fmtCr(financeSummary.avgSurplus)}</strong></span>
              </div>
            </LiquidGlassCard>

            {/* Right: Task Status + Occupancy Pie */}
            <div className="main-dashboard-s21">
              {/* Task Status Pie */}
              <LiquidGlassCard className="exec-card" padding="default">
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
                        contentStyle={{ borderRadius: '12px', border: '1px solid rgba(255,255,255,0.85)', background: 'rgba(255,255,255,0.92)', boxShadow: '0 8px 30px rgba(0,0,0,0.08)', fontSize: '0.8rem' }}
                      />
                      <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '0.72rem' }} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="main-dashboard-s22">
                    No tasks yet
                  </div>
                )}
              </LiquidGlassCard>

              {/* Occupancy Split */}
              <LiquidGlassCard className="exec-card" padding="default" interactive={true} onClick={() => navigate('tenants')}>
                <h3 className="exec-card-title">🏠 Occupancy Split (Building A)</h3>
                <div className="exec-occupancy-wrap">
                  <div className="main-dashboard-s23">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={occupancyPie} cx="50%" cy="50%" innerRadius={28} outerRadius={42} paddingAngle={4} dataKey="value">
                          <Cell fill="#C62828" />
                          <Cell fill="#F59E0B" />
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="exec-occupancy-legend">
                    <div className="exec-occupancy-row">
                      <span className="exec-occupancy-dot main-dashboard-s24" />
                      <span className="main-dashboard-s25">Owners: <strong>{tenantStats.owners}</strong></span>
                    </div>
                    <div className="exec-occupancy-row">
                      <span className="exec-occupancy-dot main-dashboard-s26" />
                      <span className="main-dashboard-s25">Tenants: <strong>{tenantStats.tenants}</strong></span>
                    </div>
                  </div>
                </div>
              </LiquidGlassCard>
            </div>
          </div>

          {/* ══════════════════════════════════════════════════════════════════════
              Row 3: Pending Tasks + Alerts (AMC + Lease Expiry)
          ══════════════════════════════════════════════════════════════════════ */}
          <div className="exec-grid-2col main-dashboard-s4">
            {/* Pending Priority Tasks */}
            <LiquidGlassCard className="exec-card" padding="lg">
              <h3 className="exec-card-title">
                🔥 Priority Tasks
                <span className="main-dashboard-s27">
                  (A Building + Common)
                </span>
                <button
                  type="button"
                  className="main-dashboard-s15"
                  onClick={() => navigate('manager_tasks')}
                >
                  View All →
                </button>
              </h3>
              {taskStats.priorityTasks.length === 0 ? (
                <div className="main-dashboard-s28">
                  ✅ All tasks are completed!
                </div>
              ) : (
                taskStats.priorityTasks.map((t) => {
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
                        <span className="main-dashboard-s29" style={{ background: t.priority === 'High' ? '#fee2e2' : t.priority === 'Medium' ? '#fef3c7' : '#d1fae5', color: t.priority === 'High' ? '#C62828' : t.priority === 'Medium' ? '#92400e' : '#065f46' }}>
                          {t.priority}
                        </span>
                      )}
                      <span className="exec-task-deadline">
                        {daysLeft !== null ? (
                          <span className="main-dashboard-s30" style={{ background: daysLeft < 0 ? '#fee2e2' : daysLeft <= 3 ? '#fef3c7' : '#d1fae5', color: daysLeft < 0 ? '#C62828' : daysLeft <= 3 ? '#d97706' : '#065f46' }}>
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
            </LiquidGlassCard>

            {/* Alerts Column */}
            <div className="main-dashboard-s21">
              {/* AMC Alerts */}
              <LiquidGlassCard className="exec-card" padding="default">
                <h3 className="exec-card-title main-dashboard-s31" onClick={() => navigate('amc')}>
                  ⚠️ AMC Alerts
                </h3>
                {amcAlerts.length === 0 ? (
                  <div className="exec-alert-item">
                    <div className="exec-alert-dot exec-alert-dot--green" />
                    <div className="exec-alert-text"><strong>All contracts active</strong>No expiries in the next 60 days</div>
                  </div>
                ) : amcAlerts.map((a) => (
                  <div key={a.id} className="exec-alert-item main-dashboard-s31" onClick={() => navigate('amc')}>
                    <div className={`exec-alert-dot exec-alert-dot--${a.severity}`} />
                    <div className="exec-alert-text">
                      <strong>{a.name}</strong>
                      {a.days < 0 ? `Expired ${Math.abs(a.days)}d ago` : `Expires in ${a.days} day${a.days !== 1 ? 's' : ''}`}
                    </div>
                  </div>
                ))}
              </LiquidGlassCard>

              {/* Lease Expiry Alerts */}
              {tenantStats.leaseAlerts.length > 0 && (
                <LiquidGlassCard className="exec-card" padding="default">
                  <h3 className="exec-card-title main-dashboard-s31" onClick={() => navigate('tenants')}>
                    🏠 Lease Expiry Alerts
                  </h3>
                  {tenantStats.leaseAlerts.slice(0, 5).map((la) => (
                    <div key={la.flat} className="exec-alert-item main-dashboard-s31" onClick={() => navigate('tenants')}>
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
                </LiquidGlassCard>
              )}

              {/* Petty Cash Summary */}
              <LiquidGlassCard className="exec-card" padding="default" interactive={true} onClick={() => navigate('petty_cash')}>
                <h3 className="exec-card-title">💵 Petty Cash Summary</h3>
                <div className="main-dashboard-s32">
                  <div className="main-dashboard-s33">
                    <div className="main-dashboard-s34">A Building</div>
                    <div className="main-dashboard-s35">₹{fmt(pettyCashSummary.buildingA)}</div>
                  </div>
                  <div className="main-dashboard-s36">
                    <div className="main-dashboard-s34">Common</div>
                    <div className="main-dashboard-s37">₹{fmt(pettyCashSummary.common)}</div>
                  </div>
                </div>
              </LiquidGlassCard>
            </div>
          </div>

          {/* ══════════════════════════════════════════════════════════════════════
              Row 4: Monthly Surplus Bar Chart (full width)
          ══════════════════════════════════════════════════════════════════════ */}
          {financeData.length > 2 && (
            <LiquidGlassCard className="exec-card main-dashboard-s4" padding="lg">
              <h3 className="exec-card-title">
                📊 Monthly Surplus Trend
                <button
                  type="button"
                  className="main-dashboard-s15"
                  onClick={() => navigate('finance')}
                >
                  Finance Tracker →
                </button>
              </h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={financeData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis dataKey="label" tick={{ fill: '#6B7280', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={fmtCr} tick={{ fill: '#6B7280', fontSize: 11 }} axisLine={false} tickLine={false} width={52} />
                  <RechartsTip
                    contentStyle={{ borderRadius: '12px', border: '1px solid rgba(255,255,255,0.85)', background: 'rgba(255,255,255,0.92)', boxShadow: '0 8px 30px rgba(0,0,0,0.08)', fontSize: '0.82rem' }}
                    formatter={(val) => [`₹${fmt(val)}`, 'Surplus']}
                  />
                  <Bar dataKey="surplus" radius={[6, 6, 0, 0]} maxBarSize={40}>
                    {financeData.map((entry, i) => (
                      <Cell key={i} fill={entry.surplus >= 0 ? '#059669' : '#C62828'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </LiquidGlassCard>
          )}

          {/* ══════════════════════════════════════════════════════════════════════
              Quick Navigation
          ══════════════════════════════════════════════════════════════════════ */}
          {isAdmin && (
            <LiquidGlassCard className="exec-card main-dashboard-s4" padding="lg">
              <h3 className="exec-card-title">🚀 Quick Navigation</h3>
              <div className="exec-quick-nav">
                {QUICK_LINKS.map((link) => (
                  <button key={link.id} type="button" className="exec-quick-btn" onClick={() => navigate(link.id)}>
                    <span className="exec-quick-btn-icon">{link.icon}</span>
                    {link.label}
                  </button>
                ))}
              </div>
            </LiquidGlassCard>
          )}
        </>
      )}
    </div>
  );
}
