import React, { useState, useEffect, useCallback } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../../firebase.js';
import { createPortal } from 'react-dom';

const STORAGE_KEY = 'majestique_notif_read_ids';

function getReadIds() {
  try { return new Set(JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')); }
  catch { return new Set(); }
}
function saveReadIds(ids) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids]));
}

async function fetchAlerts() {
  const alerts = [];

  if (!isFirebaseConfigured || !db) return alerts;

  try {
    // ── AMC contracts expiring ──────────────────────────────────────
    const amcSnap = await getDoc(doc(db, 'amcData', 'amc_contracts'));
    if (amcSnap.exists()) {
      const { contracts = [] } = amcSnap.data();
      contracts.forEach(c => {
        if (!c.endDate) return;
        const days = Math.ceil((new Date(c.endDate) - new Date()) / 86400000);
        if (days < 0) {
          alerts.push({
            id: `amc-expired-${c.id}`,
            type: 'amc', severity: 'red',
            title: 'AMC Expired',
            message: `${c.name} (${c.vendor}) expired ${Math.abs(days)} day${Math.abs(days) !== 1 ? 's' : ''} ago`,
            tabTarget: 'amc',
          });
        } else if (days <= 30) {
          alerts.push({
            id: `amc-expiring-${c.id}`,
            type: 'amc', severity: 'amber',
            title: 'AMC Expiring Soon',
            message: `${c.name} expires in ${days} day${days !== 1 ? 's' : ''}`,
            tabTarget: 'amc',
          });
        }
      });
    }
  } catch { /* ignore */ }

  try {
    // ── Overdue tasks ───────────────────────────────────────────────
    for (const colId of ['manager_tasks_a_building', 'manager_tasks_common']) {
      const snap = await getDoc(doc(db, 'managerTasks', colId));
      if (!snap.exists()) continue;
      const { tasks = [] } = snap.data();
      tasks.forEach(t => {
        if (!t.deadline || t.status === 'Done') return;
        const days = Math.ceil((new Date(t.deadline) - new Date()) / 86400000);
        if (days < 0) {
          alerts.push({
            id: `task-overdue-${t.id}`,
            type: 'task', severity: days < -7 ? 'red' : 'amber',
            title: 'Task Overdue',
            message: `"${t.taskCategory}" overdue by ${Math.abs(days)} day${Math.abs(days) !== 1 ? 's' : ''}`,
            tabTarget: 'manager_tasks',
          });
        }
      });
    }
  } catch { /* ignore */ }

  try {
    // ── Petty cash low balance ─────────────────────────────────────
    for (const acct of ['buildingA', 'common']) {
      const snap = await getDoc(doc(db, 'pettyCash', acct));
      if (!snap.exists()) continue;
      const { months = [] } = snap.data();
      if (!months.length) continue;
      const latest = months[months.length - 1];
      const entries = latest.entries || [];
      const balance = entries.reduce((sum, e) => {
        return sum + (parseFloat(e.receipt) || 0) - (parseFloat(e.payment) || 0);
      }, 0);
      if (balance < 5000 && balance >= 0) {
        alerts.push({
          id: `petty-low-${acct}`,
          type: 'petty', severity: 'amber',
          title: 'Petty Cash Low',
          message: `${acct === 'buildingA' ? 'A Building' : 'Common'} balance: ₹${balance.toFixed(0)}`,
          tabTarget: 'petty_cash',
        });
      }
    }
  } catch { /* ignore */ }

  return alerts;
}

export default function NotificationCenter({ isSidebarCollapsed }) {
  const [alerts, setAlerts]     = useState([]);
  const [open, setOpen]         = useState(false);
  const [readIds, setReadIds]   = useState(getReadIds);
  const [loading, setLoading]   = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const a = await fetchAlerts();
    setAlerts(a);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const unreadCount = alerts.filter(a => !readIds.has(a.id)).length;

  const markAllRead = () => {
    const all = new Set(alerts.map(a => a.id));
    setReadIds(all);
    saveReadIds(all);
  };

  const navigate = (tabTarget) => {
    window.dispatchEvent(new CustomEvent('changeTab', { detail: tabTarget }));
    setOpen(false);
  };

  const handleItemClick = (alert) => {
    const next = new Set(readIds);
    next.add(alert.id);
    setReadIds(next);
    saveReadIds(next);
    navigate(alert.tabTarget);
  };

  const toggleOpen = () => setOpen(o => !o);

  const dotColor = (sev) => {
    if (sev === 'red')   return 'notif-item__dot--red';
    if (sev === 'amber') return 'notif-item__dot--amber';
    return 'notif-item__dot--teal';
  };

  return (
    <>
      <div className="notif-sidebar-row">
        <button
          className={`notif-bell-btn ${open ? 'notif-bell-btn--active' : ''}`}
          onClick={toggleOpen}
          title="Notifications"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
          </svg>
          {unreadCount > 0 && (
            <span className="notif-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
          )}
        </button>
        {!isSidebarCollapsed && (
          <span style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.65)', flex: 1 }}>
            {loading ? 'Checking...' : unreadCount > 0 ? `${unreadCount} alert${unreadCount !== 1 ? 's' : ''}` : 'All clear'}
          </span>
        )}
      </div>

      {open && createPortal(
        <>
          <div
            style={{ position: 'fixed', inset: 0, zIndex: 8999 }}
            onClick={() => setOpen(false)}
          />
          <div className="notif-panel">
            <div className="notif-panel__header">
              <h4>🔔 Notifications {unreadCount > 0 && `(${unreadCount})`}</h4>
              {unreadCount > 0 && (
                <button className="notif-mark-read-btn" onClick={markAllRead}>
                  Mark all read
                </button>
              )}
            </div>

            {loading ? (
              <div className="notif-empty">
                <span>⏳</span>Checking alerts…
              </div>
            ) : alerts.length === 0 ? (
              <div className="notif-empty">
                <span>✅</span>No alerts — everything looks good!
              </div>
            ) : (
              <div>
                {alerts.map(alert => {
                  const isUnread = !readIds.has(alert.id);
                  return (
                    <div
                      key={alert.id}
                      className={`notif-item ${isUnread ? 'notif-item--unread' : ''}`}
                      onClick={() => handleItemClick(alert)}
                    >
                      <div className={`notif-item__dot ${dotColor(alert.severity)}`} />
                      <div className="notif-item__body">
                        <p className="notif-item__title">{alert.title}</p>
                        <p className="notif-item__msg">{alert.message}</p>
                      </div>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="9 18 15 12 9 6"/>
                      </svg>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>,
        document.body
      )}
    </>
  );
}
