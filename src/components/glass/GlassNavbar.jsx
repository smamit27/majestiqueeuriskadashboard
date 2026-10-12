import React from 'react';
import NotificationCenter from '../organisms/NotificationCenter.jsx';
import { ROLE_LABELS, ROLES } from '../../services/rbacService.js';

/**
 * Premium GlassNavbar Component
 * Floating / sticky glass header with breadcrumbs, title, search trigger, notifications & profile
 */
export default function GlassNavbar({
  activeTabLabel = 'Society Overview',
  activeGroupName = 'DASHBOARD',
  user,
  userRole,
  isAdmin,
  onOpenSidebar,
  onOpenSearch,
  onOpenAuth,
  onRoleChange,
  isSidebarCollapsed,
  onToggleSidebarCollapse
}) {
  const groupLabel = activeGroupName.replace(/[^a-zA-Z0-9 &]/g, '').trim();

  return (
    <header className="glass-navbar">
      <div className="glass-navbar__left">
        {/* Mobile menu trigger */}
        <button
          type="button"
          className="glass-navbar__menu-btn"
          onClick={onOpenSidebar}
          aria-label="Open navigation menu"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>

        {/* Desktop collapse toggle */}
        {onToggleSidebarCollapse && (
          <button
            type="button"
            className="glass-navbar__collapse-btn"
            onClick={onToggleSidebarCollapse}
            aria-label={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
              <line x1="9" y1="3" x2="9" y2="21"/>
              {isSidebarCollapsed ? (
                <polyline points="13 10 15 12 13 14" />
              ) : (
                <polyline points="15 10 13 12 15 14" />
              )}
            </svg>
          </button>
        )}

        {/* Breadcrumbs & Title */}
        <div className="glass-navbar__headings">
          <nav aria-label="Breadcrumb" className="glass-navbar__breadcrumbs">
            <span className="glass-breadcrumb-item">Majestique Euriska</span>
            <span className="glass-breadcrumb-sep">/</span>
            <span className="glass-breadcrumb-item glass-breadcrumb-item--muted">{groupLabel || 'Dashboard'}</span>
            <span className="glass-breadcrumb-sep">/</span>
            <span className="glass-breadcrumb-item glass-breadcrumb-item--active">{activeTabLabel}</span>
          </nav>
          <h2 className="glass-navbar__page-title">{activeTabLabel}</h2>
        </div>
      </div>

      <div className="glass-navbar__right">
        {/* Quick Search Trigger */}
        <button
          type="button"
          className="glass-navbar__search-trigger"
          onClick={onOpenSearch}
          title="Search dashboard (⌘K)"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <span className="glass-navbar__search-text">Quick Search</span>
          <kbd className="glass-navbar__kbd">⌘K</kbd>
        </button>

        {/* Notification Center */}
        <div className="glass-navbar__item">
          <NotificationCenter isSidebarCollapsed={false} />
        </div>

        {/* Role Selector / Indicator */}
        {(user || isAdmin) && onRoleChange && (
          <div className="glass-navbar__role-pill">
            <span className="glass-navbar__role-dot" />
            <select
              aria-label="Switch active role"
              value={userRole}
              onChange={(e) => onRoleChange(e.target.value)}
              title="Switch role"
              className="glass-navbar__role-select"
            >
              {Object.keys(ROLES).map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABELS[r]}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Auth / Sign In Button */}
        <button
          type="button"
          className={`glass-navbar__auth-btn ${user ? 'glass-navbar__auth-btn--user' : ''}`}
          onClick={onOpenAuth}
          title={user ? `Signed in as ${user.email}` : 'Sign in to access live Firestore data'}
        >
          <span className="glass-navbar__auth-icon">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
          <span className="glass-navbar__auth-text">
            {user ? (isAdmin ? 'Admin' : 'Resident') : 'Sign In'}
          </span>
        </button>
      </div>
    </header>
  );
}
