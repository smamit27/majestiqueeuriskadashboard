import { useCallback, useEffect, useMemo, useState } from 'react';
// ── Atoms ──────────────────────────────────────────────────────
import MetricCard from './components/molecules/MetricCard.jsx';
import ProgressBar from './components/atoms/ProgressBar.jsx';
import StatusPill from './components/atoms/StatusPill.jsx';
// ── Molecules ──────────────────────────────────────────────────
import SectionCard from './components/molecules/SectionCard.jsx';
// ── Organisms ─────────────────────────────────────────────────
import HousekeepingModule from './components/organisms/HousekeepingModule.jsx';
import SecurityModule from './components/organisms/SecurityModule.jsx';
import SolarModule from './components/organisms/SolarModule.jsx';
import ChequeManagement from './components/organisms/ChequeManagement.jsx';
import ElectricityTracker from './components/organisms/ElectricityTracker.jsx';
import FinanceTracker from './components/organisms/FinanceTracker.jsx';
import TankerModule from './components/organisms/TankerModule.jsx';
import MainDashboard from './components/organisms/MainDashboard.jsx';
import AuthModal from './components/organisms/AuthModal.jsx';
import IntroAnimation from './components/organisms/IntroAnimation.jsx';
import EventsCalendarView from './components/organisms/EventsCalendarView.jsx';
import ManagerTaskTracker from './components/organisms/ManagerTaskTracker.jsx';
import AmcTracker from './components/organisms/AmcTracker.jsx';
import TimesOfIndiaTracker from './components/organisms/TimesOfIndiaTracker.jsx';
import SpecialMaintenanceTracker from './components/organisms/SpecialMaintenanceTracker.jsx';

import { onAuthStateChanged, signInAnonymously } from 'firebase/auth';
import { auth } from './firebase.js';
import { announcements, complaints, dues, events, finance, members, staff, visitors } from './data/mockData.js';
import { useCollection } from './hooks/useCollection.js';

const currencyFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0
});

function formatCurrency(value) {
  return currencyFormatter.format(value || 0);
}

function formatDate(value) {
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  }).format(new Date(value));
}

function sortByDateDescending(items, key) {
  return [...items].sort((left, right) => new Date(right[key]) - new Date(left[key]));
}

function sortByDateAscending(items, key) {
  return [...items].sort((left, right) => new Date(left[key]) - new Date(right[key]));
}

/* ── Tab icon map ─────────────────────────────────────── */
const TAB_ICONS = {
  society_overview: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
  ),
  members: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
  ),
  dues: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
  ),
  events: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
  ),
  complaints: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
  ),
  finance: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
  ),
  visitors: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><polyline points="17 11 19 13 23 9"/></svg>
  ),
  housekeeping: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m11.6 13.5 3.9 3.9"/><path d="m16 8 4 4"/><path d="m15 5 4 4"/><path d="M9 18c-1.2 0-2.4-.5-3.2-1.3l-2-2c-.8-.8-.8-2 0-2.8l7-7c.8-.8 2-.8 2.8 0l2 2c.8.8.8 2 0 2.8L8.7 16.6c-.8.8-2 1.4-3.2 1.4Z"/><path d="M3 21h18"/></svg>
  ),
  security: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
  ),
  solar: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="M5 5l1.5 1.5"/><path d="M17.5 17.5L19 19"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="M5 19l1.5-1.5"/><path d="M17.5 6.5L19 5"/></svg>
  ),
  cheques: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/><line x1="7" y1="15" x2="7.01" y2="15"/><line x1="12" y1="15" x2="12.01" y2="15"/></svg>
  ),
  electricity: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
  ),
  tanker: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="3" width="15" height="13" rx="2"/><path d="M16 8h4l3 3v5h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
  ),
  manager_tasks: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
  ),
  amc: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
  ),
  toi: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/>
      <path d="M8 7h6"/>
      <path d="M8 11h8"/>
    </svg>
  ),
  maintenance: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 3v18h18"/>
      <path d="M18.7 8l-5.1 5.2-2.8-2.7L7 14.3"/>
    </svg>
  ),
};

export default function App() {
  const [activeTab, setActiveTab] = useState('manager_tasks');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [prevTab, setPrevTab] = useState(null);
  const [memberSearchText, setMemberSearchText] = useState('');
  const [complaintSearchText, setComplaintSearchText] = useState('');
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [showIntro, setShowIntro] = useState(() => {
    return !localStorage.getItem('majestique_intro_seen_v30');
  });

  useEffect(() => {
    if (!auth) return;
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (!u) {
        signInAnonymously(auth).catch((err) => {
          console.error("Failed to sign in anonymously:", err);
        });
      }
    });
    return () => unsub();
  }, []);

  const isAdmin = useMemo(() => {
    const allowedAdmins = ['majestiqueeuriska.a@gmail.com', 'smamit27@gmail.com'];
    return user && user.email && allowedAdmins.includes(user.email.toLowerCase());
  }, [user]);

  const memberData = useCollection('members', members, user);
  const duesData = useCollection('dues', dues, user);
  const announcementData = useCollection('announcements', announcements, user);
  const eventData = useCollection('events', events, user);
  const complaintData = useCollection('complaints', complaints, user);
  const financeData = useCollection('finance', finance, user);
  const visitorData = useCollection('visitors', visitors, user);
  const staffData = useCollection('staff', staff, user);

  const sourceSummary = [
    memberData.source,
    duesData.source,
    announcementData.source,
    eventData.source,
    complaintData.source,
    financeData.source,
    visitorData.source,
    staffData.source
  ];

  const hasFirebaseSync = sourceSummary.some((source) => source === 'firebase');
  const loadErrors = [
    memberData.error,
    duesData.error,
    announcementData.error,
    eventData.error,
    complaintData.error,
    financeData.error,
    visitorData.error,
    staffData.error
  ].filter(Boolean);

  const filteredMembers = useMemo(() => {
    const query = memberSearchText.trim().toLowerCase();

    if (!query) {
      return memberData.items;
    }

    return memberData.items.filter((member) =>
      [member.name, member.flat, member.phone, member.ownership]
        .join(' ')
        .toLowerCase()
        .includes(query)
    );
  }, [memberData.items, memberSearchText]);

  const filteredComplaints = useMemo(() => {
    const query = complaintSearchText.trim().toLowerCase();

    if (!query) {
      return sortByDateDescending(complaintData.items, 'raisedOn');
    }

    return sortByDateDescending(complaintData.items, 'raisedOn').filter((item) =>
      [item.resident, item.flat, item.category, item.note, item.status]
        .join(' ')
        .toLowerCase()
        .includes(query)
    );
  }, [complaintData.items, complaintSearchText]);

  const upcomingEvents = useMemo(
    () => sortByDateAscending(eventData.items, 'date'),
    [eventData.items]
  );

  const totalOutstanding = duesData.items.reduce((sum, item) => sum + (item.outstanding || 0), 0);
  const collectionTarget = duesData.items.reduce((sum, item) => sum + (item.amount || 0), 0);
  const duesCollected = collectionTarget - totalOutstanding;
  const paidDuesCount = duesData.items.filter((item) => item.status === 'Paid').length;
  const openComplaints = complaintData.items.filter((item) => item.status !== 'Resolved').length;
  const activeVisitors = visitorData.items.filter((item) =>
    ['Checked In', 'At Gate'].includes(item.status)
  ).length;
  const staffPresent = staffData.items.filter((item) => item.attendance !== 'On Leave').length;
  const financeSnapshot = financeData.items[0] || finance[0];
  const nextEvent = upcomingEvents[0];

  const collectionRate = collectionTarget ? (duesCollected / collectionTarget) * 100 : 0;
  const operatingMargin = financeSnapshot.collections - financeSnapshot.expenses;
  const expenseRatio = financeSnapshot.collections
    ? (financeSnapshot.expenses / financeSnapshot.collections) * 100
    : 0;

  const dashboardStats = {
    duesCollected,
    totalOutstanding,
    collectionRate,
    openComplaints,
    activeVisitors,
    staffPresent,
    financeSnapshot,
    nextEvent
  };

  const tabItems = [

    ...(isAdmin ? [
      {
        id: 'security',
        label: 'Security',
        metric: 'Deployment & Billing',
        render: () => <SecurityModule isAdmin={isAdmin} />
      },
      {
        id: 'housekeeping',
        label: 'Housekeeping',
        metric: 'Attendance & Billing',
        render: () => (
          <HousekeepingModule 
            isAdmin={isAdmin}
            staffMembers={staffData.items} 
            staffPresentCount={staffPresent} 
            totalStaffCount={staffData.items.length} 
          />
        )
      },
      {
        id: 'tanker',
        label: 'Water Tanker',
        metric: 'Water Tanker Billing',
        render: () => <TankerModule isAdmin={isAdmin} />
      }
    ] : []),
    {
      id: 'manager_tasks',
      label: 'Manager Tasks',
      metric: 'Task & Deadline Tracker',
      render: () => <ManagerTaskTracker isAdmin={isAdmin} />
    },
    {
      id: 'amc',
      label: 'AMC Tracker',
      metric: 'Contracts & Payments',
      render: () => <AmcTracker isAdmin={isAdmin} />
    },
    {
      id: 'finance',
      label: 'Income & Expenses',
      metric: 'Income & Expenses',
      render: () => <FinanceTracker isAdmin={isAdmin} />
    },
    {
      id: 'toi',
      label: 'Times of India',
      metric: 'Newspaper Subscriptions',
      render: () => <TimesOfIndiaTracker isAdmin={isAdmin} />
    },
    {
      id: 'maintenance',
      label: 'Maintenance',
      metric: 'Outstanding Maintenance',
      render: () => <SpecialMaintenanceTracker isAdmin={isAdmin} />
    },
    {
      id: 'cheques',
      label: 'Cheque Tracker',
      metric: 'Shared Expenses',
      render: () => <ChequeManagement isAdmin={isAdmin} />
    },
    {
      id: 'electricity',
      label: 'Electricity Bills',
      metric: 'Utility Tracking',
      render: () => <ElectricityTracker isAdmin={isAdmin} />
    },
    {
      id: 'solar',
      label: 'Solar Management',
      metric: 'Evaluation & ROI',
      render: () => <SolarModule isAdmin={isAdmin} />
    },
  ];


  const activeTabPanel = tabItems.find((item) => item.id === activeTab) || tabItems[0];

  const handleTabChange = useCallback((tabId) => {
    if (tabId === activeTab) return;
    setPrevTab(activeTab);
    setIsTransitioning(true);
    setTimeout(() => {
      setActiveTab(tabId);
      setIsSidebarOpen(false); // Auto-close on mobile
      setIsTransitioning(false);
    }, 180);
  }, [activeTab]);

  const getBadgeCount = (tabId) => {
    return 0;
  };

  useEffect(() => {
    const handleGlobalTabChange = (e) => {
      if (e.detail) handleTabChange(e.detail);
    };
    window.addEventListener('changeTab', handleGlobalTabChange);
    return () => window.removeEventListener('changeTab', handleGlobalTabChange);
  }, [handleTabChange]);

  useEffect(() => {
    if (!isAdmin && ['security', 'housekeeping', 'electricity', 'tanker', 'toi', 'maintenance'].includes(activeTab)) {
      setActiveTab('society_overview');
    }
  }, [isAdmin, activeTab]);

  const handleIntroFinish = () => {
    localStorage.setItem('majestique_intro_seen_v30', 'true');
    setShowIntro(false);
  };

  return (
    <>
      {showIntro && <IntroAnimation onFinish={handleIntroFinish} />}
      <div className={`dashboard-shell dashboard-shell--sidebar ${isSidebarCollapsed ? 'dashboard-shell--collapsed' : ''}`}>
      <div className="backdrop backdrop--top" />
      <div className="backdrop backdrop--bottom" />

      {/* Mobile overlay */}
      {isSidebarOpen && (
        <div className="sidebar-overlay" onClick={() => setIsSidebarOpen(false)} />
      )}

      {/* ── Vertical Sidebar ── */}
      <aside className={`sidebar ${isSidebarOpen ? 'sidebar--open' : ''} ${isSidebarCollapsed ? 'sidebar--collapsed' : ''}`}>
        <div className="sidebar__brand">
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: 1, overflow: 'hidden' }}>
            {!isSidebarCollapsed && (
              <img
                src="/logo.png"
                alt="Majestique Euriska Logo"
                className="sidebar__logo"
              />
            )}
            {!isSidebarCollapsed && (
              <div className="sidebar__brand-text">
                <p className="sidebar__kicker">Residential Society</p>
                <h2 className="sidebar__title">Majestique Euriska</h2>
              </div>
            )}
          </div>
          
          <button 
            className="sidebar-collapse-toggle" 
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            title={isSidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
        </div>

        <div className="sidebar__admin-zone" style={{ padding: '0 16px 16px' }}>
          <button 
            className={`sidebar-item ${isAdmin ? 'sidebar-item--active' : ''}`}
            onClick={() => setIsAuthModalOpen(true)}
            style={isAdmin ? { background: '#10b981', color: 'white' } : {}}
          >
            <span className="sidebar-item__icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                {isAdmin ? (
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                ) : (
                  <>
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                  </>
                )}
              </svg>
            </span>
            {!isSidebarCollapsed && <span className="sidebar-item__label">{isAdmin ? 'Admin (Live)' : 'Admin Login'}</span>}
          </button>
        </div>

        <nav className="sidebar__nav" role="tablist" aria-orientation="vertical">
          {tabItems.map((tab) => {
            if (tab.isGroupHeader) {
              return (
                <div key={tab.id} className="sidebar-group-header">
                  {tab.label}
                </div>
              );
            }

            const badgeCount = getBadgeCount(tab.id);
            return (
              <button
                key={tab.id}
                id={`tab-${tab.id}`}
                type="button"
                role="tab"
                aria-selected={activeTab === tab.id}
                aria-controls={`panel-${tab.id}`}
                className={`sidebar-item ${activeTab === tab.id ? 'sidebar-item--active' : ''} ${tab.isSubItem ? 'sidebar-item--sub' : ''}`}
                onClick={() => handleTabChange(tab.id)}
                title={isSidebarCollapsed ? tab.label : ""}
              >
                <span className="sidebar-item__icon">{TAB_ICONS[tab.id]}</span>
                {!isSidebarCollapsed && <span className="sidebar-item__label">{tab.label}</span>}
                {badgeCount > 0 && (
                  <span className={`sidebar-item__badge ${isSidebarCollapsed ? 'sidebar-item__badge--dot' : ''}`}>
                    {isSidebarCollapsed ? "" : badgeCount}
                  </span>
                )}
              </button>
            );
          })}
        </nav>



        <AuthModal 
          isOpen={isAuthModalOpen} 
          onClose={() => setIsAuthModalOpen(false)} 
          user={user}
        />
      </aside>

      <main className="main-panel">
        {/* Mobile Header Toggle */}
        <div className="mobile-header">
          <button className="mobile-menu-toggle" onClick={() => setIsSidebarOpen(true)}>
            <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
          </button>
          <h2>{activeTabPanel.label}</h2>
        </div>

        {!['housekeeping', 'security', 'solar', 'finance', 'cheques', 'electricity', 'tanker', 'manager_tasks', 'amc', 'toi', 'maintenance'].includes(activeTab) && (
        <header className="dashboard-header">
          <div className="dashboard-header__copy">
            <h1 style={{ margin: 0 }}>{activeTabPanel.label} Dashboard</h1>
            <p className="dashboard-header__text">
              A cleaner control center for member operations, dues, community updates,
              complaints, income & expenses, visitor movement, and housekeeping management.
            </p>

            <div className="header-badges">
              <span className="header-badge">Residential / Housing Society</span>
              <span className="header-badge">
                {hasFirebaseSync ? 'Firebase connected' : 'Mock preview mode'}
              </span>
              <span className="header-badge">{activeTabPanel.label} tab active</span>
            </div>
          </div>

            <div className="dashboard-header__aside">
            <article className="summary-panel">
              <p className="eyebrow">Live snapshot</p>
              <div className="summary-panel__grid">
                <div>
                  <span>Open complaints</span>
                  <strong>{openComplaints}</strong>
                </div>
                <div>
                  <span>Visitors at gate</span>
                  <strong>{activeVisitors}</strong>
                </div>
                <div>
                  <span>Dues outstanding</span>
                  <strong>{formatCurrency(totalOutstanding)}</strong>
                </div>
              </div>
            </article>

            <article className="highlight-card">
              <p className="eyebrow">Upcoming priority</p>
              <h3>{nextEvent?.title || 'Committee meeting'}</h3>
              <p>
                {nextEvent
                  ? `${formatDate(nextEvent.date)} at ${nextEvent.venue}`
                  : 'Schedule the next community event.'}
              </p>
            </article>
          </div>
        </header>
        )}

        {loadErrors.length > 0 ? <div className="notice-banner">{loadErrors[0]}</div> : null}

        {!['housekeeping', 'security', 'solar', 'finance', 'cheques', 'electricity', 'tanker', 'manager_tasks', 'amc', 'toi', 'maintenance'].includes(activeTab) && (
          <section className="metrics-grid">
          <MetricCard
            label="Members & Occupancy"
            value={`${memberData.items.length} households`}
            detail={`${memberData.items.filter((item) => item.status === 'Active').length} currently active`}
            tone="sand"
          />
          <MetricCard
            label="Dues Outstanding"
            value={formatCurrency(totalOutstanding)}
            detail={`${Math.round(collectionRate)}% collected this cycle`}
            tone="teal"
          />
          <MetricCard
            label="Open Complaints"
            value={openComplaints}
            detail="Across maintenance, security, and housekeeping"
            tone="coral"
          />
          <MetricCard
            label="Live Gate Activity"
            value={`${activeVisitors} visitors`}
            detail={`${staffPresent}/${staffData.items.length} staff available today`}
            tone="pine"
          />
        </section>
        )}



        <div
          id={`panel-${activeTabPanel.id}`}
          className={`tab-content-panel ${isTransitioning ? 'tab-content-panel--exit' : 'tab-content-panel--enter'}`}
          role="tabpanel"
          aria-labelledby={`tab-${activeTabPanel.id}`}
          style={{}}
        >
          {activeTabPanel.render()}
        </div>

        {!['housekeeping', 'security', 'solar', 'finance', 'cheques', 'electricity', 'tanker', 'manager_tasks', 'amc', 'toi', 'maintenance'].includes(activeTab) && (
          <section className="snapshot-grid">
          <div className="snapshot-panel">
            <p className="eyebrow">Collection health</p>
            <ProgressBar label="Maintenance collected" value={duesCollected} total={collectionTarget} tone="teal" />
            <ProgressBar label="Expense ratio" value={expenseRatio} total={100} tone="amber" />
          </div>

          <div className="snapshot-panel">
            <p className="eyebrow">Financial pulse</p>
            <div className="stat-line">
              <span>Operating margin</span>
              <strong>{formatCurrency(operatingMargin)}</strong>
            </div>
            <div className="stat-line">
              <span>Reserve contribution</span>
              <strong>{formatCurrency(financeSnapshot.reserveContribution)}</strong>
            </div>
            <div className="stat-line">
              <span>Utility spend</span>
              <strong>{formatCurrency(financeSnapshot.utilities)}</strong>
            </div>
          </div>
        </section>
        )}
      </main>
    </div>
    </>
  );
}
