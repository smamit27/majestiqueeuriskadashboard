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
import CommonInvoiceHub from './components/organisms/CommonInvoiceHub.jsx';
import WaterManagement from './components/organisms/WaterManagement.jsx';
import WaterTankManagement from './components/organisms/WaterTankManagement.jsx';
import PettyCashTracker from './components/organisms/PettyCashTracker.jsx';
import ShopMaintenanceTracker from './components/organisms/ShopMaintenanceTracker.jsx';
import AIChatButton from './components/AIChat/AIChatButton.jsx';
import AIChatWindow from './components/AIChat/AIChatWindow.jsx';
// ── New Features ───────────────────────────────────────────────────
import AnnouncementsModule from './components/organisms/AnnouncementsModule.jsx';
import NotificationCenter from './components/organisms/NotificationCenter.jsx';
import GlobalSearch from './components/organisms/GlobalSearch.jsx';
import ParkPlusTracker from './components/organisms/ParkPlusTracker.jsx';
import BankStatementTracker from './components/organisms/BankStatementTracker.jsx';
import FixedDepositTracker from './components/organisms/FixedDepositTracker.jsx';
import TenantTracker from './components/organisms/TenantTracker.jsx';
import ParkingAllotmentTracker from './components/organisms/ParkingAllotmentTracker.jsx';
import EmergencyNumbers from './components/organisms/EmergencyNumbers.jsx';
import BuilderDiscuss from './components/organisms/BuilderDiscuss.jsx';
import AgmMeetingTracker from './components/organisms/AgmMeetingTracker.jsx';
import DocumentManager from './components/organisms/DocumentManager.jsx';
import AuditTrailViewer from './components/organisms/AuditTrailViewer.jsx';
import MonthlySocietyReport from './components/organisms/MonthlySocietyReport.jsx';
import ResidentPortal from './components/organisms/ResidentPortal.jsx';
import SocietyRulesModule from './components/organisms/SocietyRulesModule.jsx';
import TimesOfIndiaTracker from './components/organisms/TimesOfIndiaTracker.jsx';
import { ROLES, ROLE_LABELS, MODULES, hasModuleAccess, resolveUserRole } from './services/rbacService.js';
import { logAuditEvent, AUDIT_ACTIONS } from './services/auditService.js';

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
  announcements: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
  ),
  society_rules: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/><line x1="9" y1="7" x2="15" y2="7"/><line x1="9" y1="11" x2="15" y2="11"/></svg>
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
  tata_electricity: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
  ),
  times_of_india: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2"/><path d="M18 14h-8"/><path d="M15 18h-5"/><path d="M10 6h8v4h-8V6Z"/></svg>
  ),
  common_invoices: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
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
  maintenance: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 3v18h18"/>
      <path d="M18.7 8l-5.1 5.2-2.8-2.7L7 14.3"/>
    </svg>
  ),
  water_management: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z"/></svg>
  ),
  water_tanks: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z"/>
      <path d="M12 18v-4"/>
      <path d="M9 15h6"/>
    </svg>
  ),
  petty_cash: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M12 12h.01"/><path d="M16 12h.01"/><path d="M8 12h.01"/></svg>
  ),
  shop_maintenance: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 10h16l-1.2-5.2A2.3 2.3 0 0 0 16.6 3H7.4a2.3 2.3 0 0 0-2.2 1.8L4 10Z"/>
      <path d="M4 10v1a3 3 0 0 0 6 0v-1"/>
      <path d="M10 10v1a3 3 0 0 0 6 0v-1"/>
      <path d="M16 10v1a3 3 0 0 0 4 2.8"/>
      <path d="M5 14v7h14v-7"/>
      <path d="M9 21v-4h6v4"/>
    </svg>
  ),
  park_plus: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 17V8h4a3 3 0 0 1 0 6H9"/></svg>
  ),
  statement_auditor: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="17" x2="15" y2="17"/><line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="9" x2="13" y2="9"/><path d="M3 3h18v18H3z"/></svg>
  ),
  fixed_deposits: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/><line x1="12" y1="12" x2="12" y2="16"/><line x1="10" y1="14" x2="14" y2="14"/></svg>
  ),
  tenant_tracking: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
  ),
  parking_allotment: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9 17V7h4a3 3 0 0 1 0 6H9"/><path d="M14 17l2-4"/></svg>
  ),
  emergency: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
  ),
  builder_discuss: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8"/><path d="M12 17v4"/><path d="M7 8h.01"/><path d="M11 8h6"/><path d="M7 12h.01"/><path d="M11 12h6"/></svg>
  ),
  agm_records: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
  ),
  documents: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
  ),
  audit_logs: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
  ),
  monthly_report: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="8" y1="16" x2="16" y2="16"/><line x1="8" y1="8" x2="12" y2="8"/></svg>
  ),
  resident_portal: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
  )
};

export default function App() {
  const [activeTab, setActiveTab] = useState(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const requestedTab = params.get('tab');
      if (requestedTab) return requestedTab;
      if (params.get('admin') === 'true') {
        return 'society_overview';
      }
    }
    return 'society_rules';
  });
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [prevTab, setPrevTab] = useState(null);
  const [memberSearchText, setMemberSearchText] = useState('');
  const [complaintSearchText, setComplaintSearchText] = useState('');
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [pwaPrompt, setPwaPrompt] = useState(null);
  const [showPwaBanner, setShowPwaBanner] = useState(false);
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

  const [selectedRoleOverride, setSelectedRoleOverride] = useState(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const urlRole = urlParams.get('role');
      if (urlRole && Object.values(ROLES).includes(urlRole.toUpperCase())) {
        return urlRole.toUpperCase();
      }
      return localStorage.getItem('euriska_active_role') || null;
    }
    return null;
  });

  const [expandedGroups, setExpandedGroups] = useState({
    DASHBOARD: true,
    SOCIETY: true,
    FINANCE: true,
    OPERATIONS: true,
    RESIDENTS: true,
    PROJECTS: true,
    GOVERNANCE: true,
  });

  const toggleGroup = (groupId) => {
    setExpandedGroups(prev => ({ ...prev, [groupId]: !prev[groupId] }));
  };

  const handleRoleChange = (newRole) => {
    setSelectedRoleOverride(newRole);
    if (typeof window !== 'undefined') {
      localStorage.setItem('euriska_active_role', newRole);
    }
    logAuditEvent({
      action: AUDIT_ACTIONS.ROLE_CHANGE,
      module: 'RBAC',
      recordId: newRole,
      notes: `Role switched to ${newRole}`,
      user,
      role: newRole
    });
  };

  const urlRole = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('role') : null;
  const isDevAdminOverride = Boolean(
    urlRole ||
    (typeof window !== 'undefined' && (
      window.location.search.includes('admin=true') ||
      window.location.search.includes('dev=admin')
    ))
  );

  const userRole = isDevAdminOverride
    ? (urlRole?.toUpperCase() || ROLES.ADMIN)
    : (user ? (selectedRoleOverride || resolveUserRole(user, selectedRoleOverride)) : ROLES.RESIDENT);

  const isAdmin = (user || isDevAdminOverride)
    ? [ROLES.ADMIN, ROLES.CHAIRMAN, ROLES.SECRETARY, ROLES.TREASURER, ROLES.MANAGER].includes(userRole)
    : false;

  const isAuthOrDevBypass = Boolean(user || isDevAdminOverride);
  const PUBLIC_TABS = ['water_management', 'society_rules'];


  // ── Cmd/Ctrl + K → open global search ──────────────────────────
  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen(s => !s);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // ── PWA install prompt capture ──────────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setPwaPrompt(e);
      setShowPwaBanner(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handlePwaInstall = async () => {
    if (!pwaPrompt) return;
    pwaPrompt.prompt();
    const { outcome } = await pwaPrompt.userChoice;
    if (outcome === 'accepted') { setPwaPrompt(null); setShowPwaBanner(false); }
  };

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

  const navigationGroups = useMemo(() => {
    return [
      {
        id: 'DASHBOARD',
        title: '🏠 DASHBOARD',
        items: [
          {
            id: 'society_overview',
            label: 'Society Overview',
            metric: 'Executive Health & Real-time KPIs',
            render: () => <MainDashboard stats={dashboardStats} isAdmin={isAdmin} userRole={userRole} />
          }
        ]
      },
      {
        id: 'SOCIETY',
        title: '📊 SOCIETY',
        items: [
          {
            id: 'announcements',
            label: 'Announcements',
            metric: 'Notice Board',
            render: () => <AnnouncementsModule isAdmin={isAdmin} />
          },
          {
            id: 'society_rules',
            label: 'Society Rules',
            metric: 'Bylaws & Guidelines',
            render: () => <SocietyRulesModule isAdmin={isAdmin} userRole={userRole} />
          },
          {
            id: 'agm_records',
            label: 'AGM & Meetings',
            metric: 'AGM 2026 Minutes & Resolutions',
            render: () => <AgmMeetingTracker isAdmin={isAdmin} />
          },
          {
            id: 'emergency',
            label: 'Emergency',
            metric: 'Quick Help & 112',
            render: () => <EmergencyNumbers isAdmin={isAdmin} />
          }
        ]
      },
      {
        id: 'FINANCE',
        title: '💰 FINANCE',
        items: [
          {
            id: 'finance',
            label: 'Income & Expenses',
            metric: 'Income & Expenses',
            render: () => <FinanceTracker isAdmin={isAdmin} />
          },
          {
            id: 'common_invoices',
            label: 'Common Invoices',
            metric: 'Invoice & Notice Hub',
            render: () => <CommonInvoiceHub isAdmin={isAdmin} />
          },
          {
            id: 'times_of_india',
            label: 'Times of India (TOI)',
            metric: 'Flats 302, 904, 1002 Invoices',
            render: () => <TimesOfIndiaTracker isAdmin={isAdmin} />
          },
          {
            id: 'shop_maintenance',
            label: 'Shop Maintenance',
            metric: 'Shop-wise Tracker',
            render: () => <ShopMaintenanceTracker isAdmin={isAdmin} />
          },
          {
            id: 'cheques',
            label: 'Cheque Tracker',
            metric: 'Shared Expenses',
            render: () => <ChequeManagement isAdmin={isAdmin} />
          },
          {
            id: 'fixed_deposits',
            label: 'Fixed Deposits',
            metric: 'FD Portfolio Manager',
            render: () => <FixedDepositTracker isAdmin={isAdmin} />
          },
          {
            id: 'petty_cash',
            label: 'Petty Cash',
            metric: 'Ledger & Expenses',
            render: () => <PettyCashTracker isAdmin={isAdmin} />
          },
          {
            id: 'statement_auditor',
            label: 'Statement Auditor',
            metric: 'Forensic Payment Tracker',
            render: () => <BankStatementTracker isAdmin={isAdmin} />
          },
          {
            id: 'tata_electricity',
            label: 'Tata Electricity Bill',
            metric: 'Sub-meter Billing & Invoicing',
            render: () => <ElectricityTracker isAdmin={isAdmin} />
          },
          {
            id: 'solar',
            label: 'Solar Management',
            metric: 'Evaluation & ROI',
            render: () => <SolarModule isAdmin={isAdmin} />
          }
        ]
      },
      {
        id: 'OPERATIONS',
        title: '🏢 OPERATIONS',
        items: [
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
            id: 'water_tanks',
            label: 'Water Tank Management',
            metric: '5,39,400 L Capacity & 3D Plan',
            render: () => <WaterTankManagement isAdmin={isAdmin} />
          },
          {
            id: 'tanker',
            label: 'Water Tanker',
            metric: 'Water Tanker Billing',
            render: () => <TankerModule isAdmin={isAdmin} />
          }
        ]
      },
      {
        id: 'RESIDENTS',
        title: '🏠 RESIDENTS',
        items: [
          {
            id: 'resident_portal',
            label: 'Resident Portal',
            metric: 'Resident Self-Service Dashboard',
            render: () => <ResidentPortal onNavigate={handleTabChange} />
          },
          {
            id: 'tenant_tracking',
            label: 'Tenant Tracker',
            metric: 'Wing A Occupants',
            render: () => <TenantTracker isAdmin={isAdmin} />
          },
          {
            id: 'parking_allotment',
            label: 'Parking Allotment',
            metric: 'A-101 to A-1108 Roster',
            render: () => <ParkingAllotmentTracker isAdmin={isAdmin} />
          },
          {
            id: 'park_plus',
            label: 'Park+ Payments',
            metric: 'RFID & Gate Solution Invoices',
            render: () => <ParkPlusTracker isAdmin={isAdmin} />
          }
        ]
      },
      {
        id: 'PROJECTS',
        title: '🔧 PROJECTS',
        items: [
          {
            id: 'water_management',
            label: 'Visualization Work',
            metric: 'Society Visual Plans & Designs',
            render: () => <WaterManagement />
          },
          {
            id: 'builder_discuss',
            label: 'Builder Discuss',
            metric: 'Eisha Pending Works & Escalations',
            render: () => <BuilderDiscuss isAdmin={isAdmin} />
          }
        ]
      },
      {
        id: 'GOVERNANCE',
        title: '📁 GOVERNANCE & AUDIT',
        items: [
          {
            id: 'documents',
            label: 'Document Vault',
            metric: 'Legal, AGM & Compliance Archive',
            render: () => <DocumentManager user={user} userRole={userRole} />
          },
          {
            id: 'monthly_report',
            label: 'Monthly Society Report',
            metric: 'Executive Society Report & Export',
            render: () => <MonthlySocietyReport />
          },
          {
            id: 'audit_logs',
            label: 'Audit Trail',
            metric: 'Central Security & Change Ledger',
            render: () => <AuditTrailViewer user={user} userRole={userRole} />
          }
        ]
      }
    ];
  }, [isAdmin, userRole, dashboardStats, staffData.items, staffPresent]);

  const allKnownTabItems = useMemo(() => {
    const list = [];
    const seen = new Set();
    navigationGroups.forEach(group => {
      group.items.forEach(item => {
        if (!seen.has(item.id)) {
          seen.add(item.id);
          list.push(item);
        }
      });
    });
    return list;
  }, [navigationGroups]);

  const tabItems = useMemo(() => {
    const list = [];
    const seen = new Set();
    navigationGroups.forEach(group => {
      group.items.forEach(item => {
        const isAccessible = !isAuthOrDevBypass
          ? PUBLIC_TABS.includes(item.id)
          : hasModuleAccess(userRole, item.id);
        if (isAccessible && !seen.has(item.id)) {
          seen.add(item.id);
          list.push(item);
        }
      });
    });
    return list.length > 0 ? list : [
      {
        id: 'society_rules',
        label: 'Society Rules',
        metric: 'Bylaws, Guidelines & Penalty Schedule',
        render: () => <SocietyRulesModule isAdmin={false} />
      },
      {
        id: 'water_management',
        label: 'Visualization Work',
        metric: 'Society Visual Plans & Designs',
        render: () => <WaterManagement isAdmin={false} />
      }
    ];
  }, [navigationGroups, userRole, isAuthOrDevBypass]);

  const normalizedActiveTab = activeTab === 'electricity' ? 'tata_electricity' : activeTab;
  const activeTabPanel = allKnownTabItems.find((item) => item.id === normalizedActiveTab) || tabItems[0] || { id: normalizedActiveTab, label: 'Society Portal', render: () => null };

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
    const validTabIds = allKnownTabItems.map((item) => item.id);
    if (!validTabIds.includes(activeTab)) {
      setActiveTab('society_rules');
    }
  }, [allKnownTabItems, activeTab]);

  useEffect(() => {
    if (isAdmin && (activeTab === 'water_tanks' || activeTab === 'society_rules' || activeTab === 'water_management') && prevTab === null) {
      const params = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
      if (!params?.get('tab')) {
        setActiveTab('society_overview');
      }
    }
  }, [isAdmin]);

  const handleIntroFinish = () => {
    localStorage.setItem('majestique_intro_seen_v30', 'true');
    setShowIntro(false);
  };

  return (
    <>
      {showIntro && <IntroAnimation onFinish={handleIntroFinish} />}

      {/* ── PWA Install Banner ── */}
      {showPwaBanner && (
        <div className="pwa-install-banner">
          <span style={{ fontSize: '1.6rem' }}>📲</span>
          <div>
            <strong>Install ME Dashboard</strong>
            <p>Add to home screen for quick access</p>
          </div>
          <button className="pwa-install-btn" onClick={handlePwaInstall}>Install</button>
          <button className="pwa-dismiss-btn" onClick={() => setShowPwaBanner(false)}>✕</button>
        </div>
      )}

      {/* ── Global Search ── */}
      <GlobalSearch
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onNavigate={handleTabChange}
        isAdmin={isAdmin}
      />

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

        <div className="sidebar__admin-zone" style={{ padding: '0 0 8px' }}>
          {/* Search trigger */}
          {!isSidebarCollapsed ? (
            <button className="gsearch-trigger-btn" onClick={() => setIsSearchOpen(true)}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              Search...
              <span className="gsearch-trigger-kbd">⌘K</span>
            </button>
          ) : (
            <button
              style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.6)', cursor: 'pointer', padding: '10px', display: 'flex', justifyContent: 'center', width: '100%' }}
              onClick={() => setIsSearchOpen(true)}
              title="Search (⌘K)"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
            </button>
          )}

          {/* Notifications */}
          <NotificationCenter isSidebarCollapsed={isSidebarCollapsed} />

          {/* Sign In / User Session */}
          <div style={{ padding: '0 16px 8px' }}>
            <button 
              className={`sidebar-item ${user ? 'sidebar-item--active' : ''}`}
              onClick={() => setIsAuthModalOpen(true)}
              style={user ? { background: '#10b981', color: 'white' } : { border: '1px solid rgba(255,255,255,0.2)' }}
              title={user ? `Signed in as ${user.email}` : 'Sign in to access live Firestore data'}
            >
              <span className="sidebar-item__icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  {user ? (
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                  ) : (
                    <>
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                      <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                    </>
                  )}
                </svg>
              </span>
              {!isSidebarCollapsed && (
                <span className="sidebar-item__label">
                  {user ? (isAdmin ? 'Admin (Live)' : 'Signed In') : 'Admin Login / Sign In'}
                </span>
              )}
            </button>
          </div>

          {/* Role Indicator & Testing Switcher */}
          {!isSidebarCollapsed && (
            (user || isDevAdminOverride) ? (
              <div className="sidebar-role-selector">
                <label>Active Role: {ROLE_LABELS[userRole] || userRole}</label>
                <select
                  aria-label="Switch active role"
                  value={userRole}
                  onChange={(e) => handleRoleChange(e.target.value)}
                  title="Switch active role to test RBAC capabilities"
                >
                  {Object.keys(ROLES).map((r) => (
                    <option key={r} value={r}>
                      {ROLE_LABELS[r]}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="sidebar-role-selector" style={{ padding: '8px 12px', background: 'rgba(255,255,255,0.04)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)' }}>
                <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'rgba(255,255,255,0.9)' }}>
                  🔒 Public Guest View
                </div>
                <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.5)', marginTop: '2px' }}>
                  Sign in to unlock all society tabs
                </div>
              </div>
            )
          )}
        </div>

        <nav className="sidebar__nav" role="tablist" aria-orientation="vertical">
          {navigationGroups.map((group) => {
            const accessibleItems = group.items.filter((item) => {
              if (!isAuthOrDevBypass) {
                return PUBLIC_TABS.includes(item.id);
              }
              return hasModuleAccess(userRole, item.id);
            });
            if (accessibleItems.length === 0) return null;

            const isGroupExpanded = expandedGroups[group.id] !== false;
            const hasActiveItem = accessibleItems.some(i => i.id === normalizedActiveTab);

            return (
              <div key={group.id} className="sidebar-group">
                {!isSidebarCollapsed ? (
                  <button
                    type="button"
                    className={`sidebar-group__trigger ${hasActiveItem ? 'sidebar-group__trigger--active' : ''}`}
                    onClick={() => toggleGroup(group.id)}
                    aria-expanded={isGroupExpanded}
                  >
                    <span>{group.title}</span>
                    <span className="sidebar-group__chevron" style={{ transform: isGroupExpanded ? 'rotate(0deg)' : 'rotate(-90deg)' }}>
                      ▼
                    </span>
                  </button>
                ) : (
                  <div className="sidebar-group-header" title={group.title}>
                    {group.title.split(' ')[0]}
                  </div>
                )}

                {isGroupExpanded && (
                  <div className="sidebar-group__items">
                    {accessibleItems.map((tab) => {
                      const isSelected = normalizedActiveTab === tab.id;
                      const badgeCount = getBadgeCount(tab.id);
                      return (
                        <button
                          key={tab.id}
                          id={`tab-${tab.id}`}
                          type="button"
                          role="tab"
                          aria-selected={isSelected}
                          aria-controls={`panel-${tab.id}`}
                          className={`sidebar-item ${isSelected ? 'sidebar-item--active' : ''} sidebar-item--sub`}
                          onClick={() => handleTabChange(tab.id)}
                          title={isSidebarCollapsed ? tab.label : ''}
                        >
                          <span className="sidebar-item__icon">{TAB_ICONS[tab.id] || TAB_ICONS.emergency}</span>
                          {!isSidebarCollapsed && <span className="sidebar-item__label">{tab.label}</span>}
                          {badgeCount > 0 && (
                            <span className={`sidebar-item__badge ${isSidebarCollapsed ? 'sidebar-item__badge--dot' : ''}`}>
                              {isSidebarCollapsed ? '' : badgeCount}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
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

        <div
          id={`panel-${activeTabPanel.id}`}
          className={`tab-content-panel ${isTransitioning ? 'tab-content-panel--exit' : 'tab-content-panel--enter'}`}
          role="tabpanel"
          aria-labelledby={`tab-${activeTabPanel.id}`}
          style={{}}
        >
          {!isAuthOrDevBypass && !PUBLIC_TABS.includes(normalizedActiveTab) ? (
            <div className="section-card" style={{ padding: '48px 32px', textAlign: 'center', background: 'white', borderRadius: '16px', maxWidth: '580px', margin: '40px auto', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.06)' }}>
              <span style={{ fontSize: '3rem', display: 'block', marginBottom: '16px' }}>🔐</span>
              <h2 style={{ margin: '0 0 10px', color: '#0f172a' }}>Admin Login / Sign In Required</h2>
              <p style={{ color: '#64748b', margin: '0 auto 24px', fontSize: '0.95rem', lineHeight: '1.6' }}>
                Majestique Euriska is a private society portal. Only <b>Visualization Work</b> and <b>Society Rules</b> are accessible without signing in. To view or manage this module, please sign in with your authorized admin account.
              </p>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
                <button 
                  className="button-primary" 
                  onClick={() => setIsAuthModalOpen(true)}
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 24px', fontSize: '0.95rem' }}
                >
                  <span>Admin Login / Sign In</span>
                </button>
                <button 
                  className="button-secondary" 
                  onClick={() => handleTabChange('society_rules')}
                  style={{ padding: '12px 20px', fontSize: '0.95rem' }}
                >
                  Go to Society Rules
                </button>
                <button 
                  className="button-secondary" 
                  onClick={() => handleTabChange('water_management')}
                  style={{ padding: '12px 20px', fontSize: '0.95rem' }}
                >
                  Go to Visualization Work
                </button>
              </div>
              <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '24px' }}>
                Authorized Administrators: <code>majestiqueeuriska.a@gmail.com</code> | <code>smamit27@gmail.com</code>
              </p>
            </div>
          ) : !hasModuleAccess(userRole, normalizedActiveTab) ? (
            <div className="section-card" style={{ padding: '48px', textAlign: 'center', background: 'white', borderRadius: '16px' }}>
              <span style={{ fontSize: '3rem', display: 'block', marginBottom: '12px' }}>🔒</span>
              <h2 style={{ margin: '0 0 8px', color: '#991b1b' }}>Access Denied (RBAC Protected)</h2>
              <p style={{ color: '#64748b', maxWidth: '440px', margin: '0 auto 20px', fontSize: '0.9rem' }}>
                Your current role (<b>{ROLE_LABELS[userRole] || userRole}</b>) is not authorized to access this module. Society data is protected behind strict role policies.
              </p>
              <button className="button-primary" onClick={() => handleTabChange('society_rules')}>
                Return to Authorized View
              </button>
            </div>
          ) : (
            activeTabPanel.render()
          )}
        </div>
      </main>
    </div>
    
    <AIChatButton isOpen={isChatOpen} onClick={() => setIsChatOpen(!isChatOpen)} />
    <AIChatWindow isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} userRole={userRole} />
    </>
  );
}
