import React, { useState, useEffect } from 'react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTip, ResponsiveContainer, Cell, Legend
} from 'recharts';
import { doc, getDoc } from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../../firebase.js';

const fmt  = (v) => Number(v || 0).toLocaleString('en-IN');
const fmtCr = (v) => {
  const n = Number(v || 0);
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  if (n >= 1000)   return `₹${(n / 1000).toFixed(0)}K`;
  return `₹${n}`;
};

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
];

const STATUS_STYLE_CLASS = {
  'Done':        'exec-task-status--done',
  'In Progress': 'exec-task-status--progress',
  'Pending':     'exec-task-status--pending',
  'On Hold':     'exec-task-status--hold',
};

function fmtDate(v) {
  if (!v) return '';
  try {
    const [y, m, d] = v.split('-');
    return `${d}/${m}/${y.slice(2)}`;
  } catch { return v; }
}

export default function MainDashboard({ stats, isAdmin }) {
  const {
    duesCollected = 0,
    totalOutstanding = 0,
    collectionRate = 0,
    openComplaints = 0,
    activeVisitors = 0,
    staffPresent = 0,
    financeSnapshot = {},
    nextEvent = null,
  } = stats || {};

  const [amcAlerts, setAmcAlerts]   = useState([]);
  const [recentTasks, setRecentTasks] = useState([]);
  const [yearlyData, setYearlyData] = useState([]);
  const [loadingExtra, setLoadingExtra] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!isFirebaseConfigured || !db) {
        setLoadingExtra(false);
        return;
      }
      try {
        // AMC alerts
        const amcSnap = await getDoc(doc(db, 'amcData', 'amc_contracts'));
        if (!cancelled && amcSnap.exists()) {
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
            .slice(0, 5);
          setAmcAlerts(alerts);
        }

        // Tasks
        const tasks = [];
        for (const colId of ['manager_tasks_a_building', 'manager_tasks_common']) {
          const snap = await getDoc(doc(db, 'managerTasks', colId));
          if (snap.exists()) {
            const { tasks: t = [] } = snap.data();
            tasks.push(...t);
          }
        }
        if (!cancelled) {
          setRecentTasks(
            tasks
              .filter(t => t.status !== 'Done')
              .sort((a, b) => {
                if (a.priority === 'High' && b.priority !== 'High') return -1;
                if (b.priority === 'High' && a.priority !== 'High') return 1;
                return 0;
              })
              .slice(0, 6)
          );
        }

        // Finance yearly trend
        const months = ['2026-04','2026-05','2026-06','2026-07'];
        const chartPts = [];
        for (const m of months) {
          const snap = await getDoc(doc(db, 'financeData', `finance_${m}`));
          if (snap.exists()) {
            const d = snap.data();
            const income  = (d.income  || []).reduce((s, r) => s + (parseFloat(r.amount) || 0), 0);
            const expense = (d.expenses || []).reduce((s, r) => s + (parseFloat(r.amount) || 0), 0);
            const [y, mo] = m.split('-').map(Number);
            chartPts.push({
              label: new Intl.DateTimeFormat('en-IN', { month: 'short' }).format(new Date(y, mo - 1, 1)),
              income, expense, surplus: income - expense,
            });
          }
        }
        if (!cancelled && chartPts.length > 0) setYearlyData(chartPts);
      } catch (e) {
        console.warn('Dashboard extra load error:', e);
      } finally {
        if (!cancelled) setLoadingExtra(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  const navigate = (tabId) => {
    window.dispatchEvent(new CustomEvent('changeTab', { detail: tabId }));
  };

  const collectionPct = Math.min(100, Math.max(0, collectionRate));

  // Fallback chart data from mock financeSnapshot
  const chartData = yearlyData.length > 0 ? yearlyData : [
    { label: 'Apr', income: financeSnapshot.collections || 286000, expense: financeSnapshot.expenses || 198500, surplus: (financeSnapshot.collections || 286000) - (financeSnapshot.expenses || 198500) },
  ];

  return (
    <div className="exec-shell">
      {/* ── Hero ── */}
      <div className="exec-hero">
        <div className="exec-hero__text">
          <h1>Society Overview</h1>
          <p>Majestique Euriska — Residential Management Dashboard</p>
          <span className="exec-hero__badge">
            {new Intl.DateTimeFormat('en-IN', { month: 'long', year: 'numeric' }).format(new Date())}
          </span>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            style={{ background: 'rgba(196,155,79,0.2)', border: '1px solid rgba(196,155,79,0.4)', color: '#C49B4F', borderRadius: '12px', padding: '10px 18px', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 700 }}
            onClick={() => navigate('amc')}
          >
            📋 AMC Tracker
          </button>
          <button
            style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', borderRadius: '12px', padding: '10px 18px', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 700 }}
            onClick={() => navigate('announcements')}
          >
            📢 Notices
          </button>
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <div className="exec-kpi-grid">
        <div className="exec-kpi-card exec-kpi-card--teal">
          <p className="exec-kpi-label">Collection Rate</p>
          <p className="exec-kpi-value">{collectionPct.toFixed(1)}%</p>
          <p className="exec-kpi-sub">₹{fmt(duesCollected)} collected</p>
          <div className="exec-kpi-progress">
            <div className="exec-kpi-progress-fill" style={{ width: `${collectionPct}%`, background: '#196c6c' }} />
          </div>
        </div>

        <div className="exec-kpi-card exec-kpi-card--gold">
          <p className="exec-kpi-label">Outstanding Dues</p>
          <p className="exec-kpi-value" style={{ color: '#b98216' }}>{fmtCr(totalOutstanding)}</p>
          <p className="exec-kpi-sub">Pending from households</p>
        </div>

        <div className="exec-kpi-card exec-kpi-card--red">
          <p className="exec-kpi-label">Open Complaints</p>
          <p className="exec-kpi-value" style={{ color: openComplaints > 5 ? '#dc2626' : '#0f172a' }}>
            {openComplaints}
          </p>
          <p className="exec-kpi-sub">Requires attention</p>
        </div>

        <div className="exec-kpi-card exec-kpi-card--green">
          <p className="exec-kpi-label">Staff on Duty</p>
          <p className="exec-kpi-value" style={{ color: '#065f46' }}>{staffPresent}</p>
          <p className="exec-kpi-sub">Security &amp; Housekeeping</p>
        </div>

        <div className="exec-kpi-card exec-kpi-card--blue">
          <p className="exec-kpi-label">Active Visitors</p>
          <p className="exec-kpi-value" style={{ color: '#1e40af' }}>{activeVisitors}</p>
          <p className="exec-kpi-sub">Currently inside society</p>
        </div>

        <div className="exec-kpi-card exec-kpi-card--purple">
          <p className="exec-kpi-label">Monthly Surplus</p>
          <p className="exec-kpi-value" style={{ color: '#5b21b6', fontSize: '1.4rem' }}>
            {fmtCr((financeSnapshot.collections || 0) - (financeSnapshot.expenses || 0))}
          </p>
          <p className="exec-kpi-sub">Income minus expenses</p>
        </div>
      </div>

      {/* ── Charts + Tasks ── */}
      <div className="exec-grid-2col">
        {/* Finance Chart */}
        <div className="exec-card">
          <h3 className="exec-card-title">📈 Income vs Expense Trend</h3>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#196c6c" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#196c6c" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="label" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={fmtCr} tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} width={60} />
                <RechartsTip
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 8px 30px rgba(0,0,0,0.12)' }}
                  formatter={(val) => [`₹${fmt(val)}`, '']}
                />
                <Area type="monotone" dataKey="income"  stroke="#196c6c" fill="url(#colorIncome)"  strokeWidth={2.5} name="Income"  dot={{ fill: '#196c6c', strokeWidth: 0, r: 4 }} />
                <Area type="monotone" dataKey="expense" stroke="#ef4444" fill="url(#colorExpense)" strokeWidth={2.5} name="Expense" dot={{ fill: '#ef4444', strokeWidth: 0, r: 4 }} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '0.78rem' }} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '0.85rem' }}>
              Finance data will appear after saving monthly records
            </div>
          )}
        </div>

        {/* Alerts + Tasks */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* AMC Alerts */}
          <div className="exec-card">
            <h3 className="exec-card-title">⚠️ AMC Alerts</h3>
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

          {/* Next Event */}
          {nextEvent && (
            <div className="exec-card" style={{ background: 'linear-gradient(135deg, #fffbf0, #fff8e8)', borderColor: '#C49B4F' }}>
              <h3 className="exec-card-title">📅 Next Event</h3>
              <p style={{ margin: '0 0 4px', fontWeight: 700, color: '#0f172a' }}>{nextEvent.title}</p>
              <p style={{ margin: 0, fontSize: '0.82rem', color: '#64748b' }}>
                {nextEvent.date && new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'long' }).format(new Date(nextEvent.date))}
                {nextEvent.venue && ` · ${nextEvent.venue}`}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ── Pending Tasks ── */}
      {recentTasks.length > 0 && (
        <div className="exec-card">
          <h3 className="exec-card-title">
            🔥 Pending High-Priority Tasks
            <button
              style={{ marginLeft: 'auto', background: 'none', border: 'none', fontSize: '0.78rem', color: '#196c6c', fontWeight: 700, cursor: 'pointer' }}
              onClick={() => navigate('manager_tasks')}
            >
              View All →
            </button>
          </h3>
          {recentTasks.map(t => (
            <div key={t.id} className="exec-task-row">
              <span className={`exec-task-status ${STATUS_STYLE_CLASS[t.status] || 'exec-task-status--pending'}`}>
                {t.status || 'Pending'}
              </span>
              <span className="exec-task-name">{t.taskCategory || '—'}</span>
              <span className="exec-task-deadline">{t.deadline ? fmtDate(t.deadline) : '—'}</span>
            </div>
          ))}
        </div>
      )}

      {/* ── Quick Navigation ── */}
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
    </div>
  );
}
