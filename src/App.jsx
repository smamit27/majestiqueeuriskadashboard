import { useCallback, useEffect, useMemo, useState } from 'react';
import MetricCard from './components/MetricCard.jsx';
import HousekeepingModule from './components/HousekeepingModule.jsx';
import SecurityModule from './components/SecurityModule.jsx';
import SolarModule from './components/SolarModule.jsx';
import ChequeManagement from './components/ChequeManagement.jsx';
import FinanceTracker from './components/FinanceTracker.jsx';
import MainDashboard from './components/MainDashboard.jsx';
import ProgressBar from './components/ProgressBar.jsx';
import SectionCard from './components/SectionCard.jsx';
import StatusPill from './components/StatusPill.jsx';
import AuthModal from './components/AuthModal.jsx';
import IntroAnimation from './components/IntroAnimation.jsx';
import { onAuthStateChanged } from 'firebase/auth';
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
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
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
};

export default function App() {
  const [activeTab, setActiveTab] = useState('society_overview');
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
    });
    return () => unsub();
  }, []);

  const isAdmin = useMemo(() => {
    return user && user.email && user.email.toLowerCase() === 'majestiqueeuriska.a@gmail.com';
  }, [user]);

  const memberData = useCollection('members', members);
  const duesData = useCollection('dues', dues);
  const announcementData = useCollection('announcements', announcements);
  const eventData = useCollection('events', events);
  const complaintData = useCollection('complaints', complaints);
  const financeData = useCollection('finance', finance);
  const visitorData = useCollection('visitors', visitors);
  const staffData = useCollection('staff', staff);

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
    {
      id: 'society_overview',
      label: 'Overview',
      metric: 'Society Dashboard',
      render: () => <MainDashboard stats={dashboardStats} />
    },
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
      id: 'solar',
      label: 'Solar Management',
      metric: 'Evaluation & ROI',
      render: () => <SolarModule isAdmin={isAdmin} />
    },
    {
      id: 'finance',
      label: 'Income & Expenses',
      metric: 'Income & Expenses',
      render: () => <FinanceTracker isAdmin={isAdmin} />
    },
    {
      id: 'cheques',
      label: 'Cheque Tracker',
      metric: 'Shared Expenses',
      render: () => <ChequeManagement isAdmin={isAdmin} />
    },
    {
      id: 'members',
      label: 'Members',
      metric: `${memberData.items.length} households`,
      render: () => (
        <SectionCard
          id="members"
          badge="Member Management"
          title="Residents, flats, and occupancy"
          subtitle="Track owners, tenants, household size, and dues status."
        >
          <div className="section-toolbar">
            <label className="filter-field">
              <span>Search households</span>
              <input
                type="search"
                value={memberSearchText}
                onChange={(event) => setMemberSearchText(event.target.value)}
                placeholder="Search by resident, flat, phone, or ownership type"
              />
            </label>
          </div>

          <div className="table-card">
            <table>
              <thead>
                <tr>
                  <th>Resident</th>
                  <th>Flat</th>
                  <th>Type</th>
                  <th>Contact</th>
                  <th>Status</th>
                  <th>Dues</th>
                </tr>
              </thead>
              <tbody>
                {filteredMembers.length > 0 ? (
                  filteredMembers.map((member) => (
                    <tr key={member.id}>
                      <td>
                        <strong>{member.name}</strong>
                        <span>{member.householdSize} residents</span>
                      </td>
                      <td>{member.flat}</td>
                      <td>{member.ownership}</td>
                      <td>{member.phone}</td>
                      <td>
                        <StatusPill value={member.status} />
                      </td>
                      <td>
                        <StatusPill value={member.duesStatus} />
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr className="empty-row">
                    <td colSpan="6">No matching households were found for this search.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </SectionCard>
      )
    },
    {
      id: 'dues',
      label: 'Dues',
      metric: `${Math.round(collectionRate)}% collected`,
      render: () => (
        <SectionCard
          id="dues"
          badge="Maintenance / Dues Tracking"
          title="Monthly collections and follow-ups"
          subtitle="Highlight pending balances before they become aging receivables."
        >
          <div className="section-grid section-grid--dual">
            <div className="table-card">
              <table>
                <thead>
                  <tr>
                    <th>Resident</th>
                    <th>Flat</th>
                    <th>Amount</th>
                    <th>Outstanding</th>
                    <th>Due date</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {duesData.items.map((item) => (
                    <tr key={item.id}>
                      <td>{item.resident}</td>
                      <td>{item.flat}</td>
                      <td>{formatCurrency(item.amount)}</td>
                      <td>{formatCurrency(item.outstanding)}</td>
                      <td>{formatDate(item.dueDate)}</td>
                      <td>
                        <StatusPill value={item.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="stack-card">
              <div>
                <p className="eyebrow">Cycle overview</p>
                <h3>{formatCurrency(duesCollected)} collected</h3>
                <p>{formatCurrency(totalOutstanding)} still outstanding across current dues.</p>
              </div>
              <ProgressBar label="Paid units" value={paidDuesCount} total={duesData.items.length} tone="teal" />
              <ProgressBar
                label="Pending or overdue amount"
                value={totalOutstanding}
                total={collectionTarget}
                tone="coral"
              />
            </div>
          </div>
        </SectionCard>
      )
    },
    {
      id: 'events',
      label: 'Events',
      metric: `${eventData.items.length} scheduled`,
      render: () => (
        <SectionCard
          id="events"
          badge="Events & Announcements"
          title="Community communication and upcoming activities"
          subtitle="Keep residents informed about maintenance, safety, and shared events."
        >
          <div className="section-grid section-grid--dual">
            <div className="list-card">
              <div className="list-card__header">
                <h3>Announcements</h3>
                <span>{announcementData.items.length} posts</span>
              </div>
              {sortByDateDescending(announcementData.items, 'postedOn').map((announcement) => (
                <article key={announcement.id} className="list-item">
                  <div className="list-item__title">
                    <h4>{announcement.title}</h4>
                    <StatusPill value={announcement.priority} />
                  </div>
                  <p>{announcement.summary}</p>
                  <small>
                    {announcement.audience} · {formatDate(announcement.postedOn)}
                  </small>
                </article>
              ))}
            </div>

            <div className="list-card">
              <div className="list-card__header">
                <h3>Upcoming events</h3>
                <span>{eventData.items.length} scheduled</span>
              </div>
              {upcomingEvents.map((event) => (
                <article key={event.id} className="timeline-item">
                  <div>
                    <p className="eyebrow">{event.category}</p>
                    <h4>{event.title}</h4>
                  </div>
                  <div className="timeline-item__meta">
                    <strong>{formatDate(event.date)}</strong>
                    <span>{event.venue}</span>
                    <span>{event.attendees} attendees expected</span>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </SectionCard>
      )
    },
    {
      id: 'complaints',
      label: 'Complaints',
      metric: `${openComplaints} open`,
      render: () => (
        <SectionCard
          id="complaints"
          badge="Complaints & Requests"
          title="Issue logging and escalation monitoring"
          subtitle="Prioritize service requests and keep residents updated on resolution progress."
        >
          <div className="section-toolbar">
            <label className="filter-field">
              <span>Search complaints</span>
              <input
                type="search"
                value={complaintSearchText}
                onChange={(event) => setComplaintSearchText(event.target.value)}
                placeholder="Search by resident, flat, category, or ticket status"
              />
            </label>
          </div>

          <div className="table-card">
            <table>
              <thead>
                <tr>
                  <th>Ticket</th>
                  <th>Resident</th>
                  <th>Category</th>
                  <th>Raised</th>
                  <th>Priority</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredComplaints.length > 0 ? (
                  filteredComplaints.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <strong>{item.id}</strong>
                        <span>{item.note}</span>
                      </td>
                      <td>
                        {item.resident}
                        <span>{item.flat}</span>
                      </td>
                      <td>{item.category}</td>
                      <td>{formatDate(item.raisedOn)}</td>
                      <td>
                        <StatusPill value={item.priority} />
                      </td>
                      <td>
                        <StatusPill value={item.status} />
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr className="empty-row">
                    <td colSpan="6">No complaint records matched the current search.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </SectionCard>
      )
    },

    {
      id: 'visitors',
      label: 'Visitors',
      metric: `${activeVisitors} live`,
      render: () => (
        <SectionCard
          id="visitors"
          badge="Visitor / Gate Log"
          title="Visitor movement and gate updates"
          subtitle="Log courier, guest, and service partner entry status for faster front-gate handling."
        >
          <div className="table-card">
            <table>
              <thead>
                <tr>
                  <th>Visitor</th>
                  <th>Purpose</th>
                  <th>Host Flat</th>
                  <th>Time In</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {visitorData.items.map((visitor) => (
                  <tr key={visitor.id}>
                    <td>{visitor.visitorName}</td>
                    <td>{visitor.purpose}</td>
                    <td>{visitor.hostFlat}</td>
                    <td>{visitor.timeIn}</td>
                    <td>
                      <StatusPill value={visitor.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>
      )
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
    switch (tabId) {
      case 'complaints': return openComplaints > 0 ? openComplaints : 0;
      case 'visitors': return activeVisitors > 0 ? activeVisitors : 0;
      case 'dues': return duesData.items.filter(i => i.status !== 'Paid').length;
      default: return 0;
    }
  };

  useEffect(() => {
    const handleGlobalTabChange = (e) => {
      if (e.detail) handleTabChange(e.detail);
    };
    window.addEventListener('changeTab', handleGlobalTabChange);
    return () => window.removeEventListener('changeTab', handleGlobalTabChange);
  }, [handleTabChange]);

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

        {!['housekeeping', 'security', 'solar', 'finance', 'cheques'].includes(activeTab) && (
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

        {!['housekeeping', 'security', 'solar', 'finance', 'cheques'].includes(activeTab) && (
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

        {!['housekeeping', 'security', 'solar', 'finance', 'cheques'].includes(activeTab) && (
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
