import React from 'react';
import { ROLE_LABELS, ROLES } from '../../services/rbacService.js';

/**
 * Premium GlassSidebar Component
 * Replaces old dark green sidebar with a light, ultra-luxurious Apple glassmorphism interface
 */
export default function GlassSidebar({
  isOpen,
  isCollapsed,
  onClose,
  onToggleCollapse,
  navigationGroups = [],
  activeTab,
  onTabChange,
  tabIcons = {},
  user,
  userRole,
  isAdmin,
  isAuthOrDevBypass,
  PUBLIC_TABS = [],
  hasModuleAccess,
  expandedGroups = {},
  onToggleGroup,
  onOpenSearch,
  onOpenAuth,
  onRoleChange,
}) {
  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isOpen && (
        <div
          className="glass-sidebar-overlay"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={`glass-sidebar sidebar ${isOpen ? 'glass-sidebar--open sidebar--open' : ''} ${isCollapsed ? 'glass-sidebar--collapsed sidebar--collapsed' : ''}`}
        aria-label="Sidebar Navigation"
      >
        {/* Brand Header */}
        <div className="glass-sidebar__brand">
          <div className="glass-sidebar__brand-identity">
            <div className="glass-sidebar__logo-wrap">
              <img
                src="/logo.png"
                alt="Majestique Euriska Logo"
                className="glass-sidebar__logo"
              />
            </div>
            {!isCollapsed && (
              <div className="glass-sidebar__brand-text">
                <span className="glass-sidebar__kicker">Residential Society</span>
                <h2 className="glass-sidebar__title">Majestique Euriska</h2>
              </div>
            )}
          </div>

          <button
            type="button"
            className="glass-sidebar__collapse-btn sidebar-collapse-toggle"
            onClick={onToggleCollapse}
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              {isCollapsed ? (
                <>
                  <polyline points="13 17 18 12 13 7" />
                  <polyline points="6 17 11 12 6 7" />
                </>
              ) : (
                <>
                  <polyline points="11 17 6 12 11 7" />
                  <polyline points="18 17 13 12 18 7" />
                </>
              )}
            </svg>
          </button>
        </div>

        {/* Quick Search & Auth Zone in Sidebar */}
        <div className="glass-sidebar__actions-zone">
          {!isCollapsed ? (
            <button
              type="button"
              className="glass-sidebar__search-btn"
              onClick={onOpenSearch}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <span>Quick Search...</span>
              <kbd className="glass-sidebar__kbd">⌘K</kbd>
            </button>
          ) : (
            <button
              type="button"
              className="glass-sidebar__search-icon-btn"
              onClick={onOpenSearch}
              title="Search (⌘K)"
              aria-label="Search"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
            </button>
          )}

          {/* User Sign In Status */}
          <button
            type="button"
            className={`glass-sidebar__auth-item ${user ? 'glass-sidebar__auth-item--active' : ''}`}
            onClick={onOpenAuth}
            title={user ? `Signed in as ${user.email}` : 'Sign in to access live Firestore data'}
          >
            <span className="glass-sidebar__auth-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
            {!isCollapsed && (
              <span className="glass-sidebar__auth-label">
                {user ? (isAdmin ? 'Admin (Live Sync)' : 'Resident Member') : 'Admin Login / Sign In'}
              </span>
            )}
          </button>

          {/* Role Indicator & Testing Switcher */}
          {!isCollapsed && (
            (user || isAuthOrDevBypass) ? (
              <div className="glass-sidebar__role-box">
                <label className="glass-sidebar__role-label">
                  Role: <b>{ROLE_LABELS[userRole] || userRole}</b>
                </label>
                {onRoleChange && (
                  <select
                    aria-label="Switch active role"
                    value={userRole}
                    onChange={(e) => onRoleChange(e.target.value)}
                    title="Switch active role to test RBAC capabilities"
                    className="glass-sidebar__role-select"
                  >
                    {Object.keys(ROLES).map((r) => (
                      <option key={r} value={r}>
                        {ROLE_LABELS[r]}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            ) : (
              <div className="glass-sidebar__guest-notice">
                <div className="glass-sidebar__guest-title">🔒 Guest View</div>
                <div className="glass-sidebar__guest-sub">Sign in to unlock all society modules</div>
              </div>
            )
          )}
        </div>

        {/* Navigation List */}
        <nav className="glass-sidebar__nav" role="tablist" aria-orientation="vertical">
          {navigationGroups.map((group) => {
            const accessibleItems = group.items.filter((item) => {
              if (!isAuthOrDevBypass) {
                return PUBLIC_TABS.includes(item.id);
              }
              return hasModuleAccess(userRole, item.id);
            });
            if (accessibleItems.length === 0) return null;

            const isGroupExpanded = expandedGroups[group.id] !== false;
            const hasActiveItem = accessibleItems.some((i) => i.id === activeTab);

            return (
              <div key={group.id} className="glass-sidebar__group">
                {!isCollapsed ? (
                  <button
                    type="button"
                    className={`glass-sidebar__group-header ${hasActiveItem ? 'glass-sidebar__group-header--active' : ''}`}
                    onClick={() => onToggleGroup(group.id)}
                    aria-expanded={isGroupExpanded}
                  >
                    <span className="glass-sidebar__group-title">{group.title}</span>
                    <span
                      className="glass-sidebar__group-chevron"
                      style={{ transform: isGroupExpanded ? 'rotate(0deg)' : 'rotate(-90deg)' }}
                    >
                      ▾
                    </span>
                  </button>
                ) : (
                  <div className="glass-sidebar__group-mini-label" title={group.title}>
                    {group.title.split(' ')[0]}
                  </div>
                )}

                {isGroupExpanded && (
                  <div className="glass-sidebar__group-items">
                    {accessibleItems.map((tab) => {
                      const isSelected = activeTab === tab.id;
                      return (
                        <button
                          key={tab.id}
                          id={`tab-${tab.id}`}
                          type="button"
                          role="tab"
                          aria-selected={isSelected}
                          aria-controls={`panel-${tab.id}`}
                          className={`glass-sidebar__tab-btn ${isSelected ? 'glass-sidebar__tab-btn--active' : ''}`}
                          onClick={() => onTabChange(tab.id)}
                          title={isCollapsed ? tab.label : ''}
                        >
                          <span className="glass-sidebar__tab-icon">
                            {tabIcons[tab.id] || tabIcons.emergency}
                          </span>
                          {!isCollapsed && (
                            <span className="glass-sidebar__tab-text">
                              {tab.label}
                            </span>
                          )}
                          {isSelected && !isCollapsed && (
                            <span className="glass-sidebar__active-indicator" />
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

        {/* Floating Sidebar Footer */}
        {!isCollapsed && (
          <div className="glass-sidebar__footer">
            <div className="glass-sidebar__footer-badge">
              <span className="glass-sidebar__status-dot" aria-hidden="true" />
              <span>Portal Online • Live Sync</span>
            </div>
            <div className="glass-sidebar__footer-reg">
              PNA/PNA (4)/HSG/(TC)/2019-20
            </div>
          </div>
        )}
      </aside>
    </>
  );
}
