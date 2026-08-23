import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';

// All sidebar tabs
const NAV_ITEMS = [
  { id: 'emergency',        label: 'Emergency Numbers',      icon: '🚨', group: 'Navigation' },
  { id: 'society_overview', label: 'Society Overview',       icon: '🏠', group: 'Navigation (Admin)' },
  { id: 'announcements',    label: 'Announcements',          icon: '📢', group: 'Navigation (Admin)' },
  { id: 'manager_tasks',    label: 'Manager Tasks',          icon: '✅', group: 'Navigation (Admin)' },
  { id: 'amc',              label: 'AMC Tracker',            icon: '📋', group: 'Navigation (Admin)' },
  { id: 'water_management', label: 'Visualization Work',     icon: '🗺️', group: 'Navigation (Admin)' },
  { id: 'petty_cash',       label: 'Petty Cash',             icon: '💵', group: 'Navigation (Admin)' },
  { id: 'park_plus',        label: 'Park+ Payments',         icon: '🅿️', group: 'Navigation (Admin)' },
  { id: 'statement_auditor',label: 'Statement Auditor',      icon: '📑', group: 'Navigation (Admin)' },
  { id: 'fixed_deposits',   label: 'Fixed Deposits',         icon: '🏦', group: 'Navigation (Admin)' },
  { id: 'tenant_tracking',  label: 'Tenant Tracker',         icon: '🏢', group: 'Navigation (Admin)' },
  { id: 'security',         label: 'Security',               icon: '🛡️', group: 'Navigation (Admin)' },
  { id: 'housekeeping',     label: 'Housekeeping',           icon: '🧹', group: 'Navigation (Admin)' },
  { id: 'tanker',           label: 'Water Tanker',           icon: '🚛', group: 'Navigation (Admin)' },
  { id: 'finance',          label: 'Income & Expenses',      icon: '💰', group: 'Navigation (Admin)' },
  { id: 'maintenance',      label: 'Maintenance',            icon: '📊', group: 'Navigation (Admin)' },
  { id: 'shop_maintenance', label: 'Shop Maintenance',       icon: '🏬', group: 'Navigation (Admin)' },
  { id: 'cheques',          label: 'Cheque Tracker',         icon: '🧾', group: 'Navigation (Admin)' },
  { id: 'electricity',      label: 'Electricity Bills',      icon: '⚡', group: 'Navigation (Admin)' },
  { id: 'solar',            label: 'Solar Management',       icon: '☀️', group: 'Navigation (Admin)' },
];

const RECENTLY_KEY = 'majestique_gsearch_recent';
function getRecent() {
  try { return JSON.parse(localStorage.getItem(RECENTLY_KEY) || '[]'); }
  catch { return []; }
}
function addRecent(id) {
  const prev = getRecent().filter(i => i !== id);
  localStorage.setItem(RECENTLY_KEY, JSON.stringify([id, ...prev].slice(0, 5)));
}

function fuzzyMatch(haystack, needle) {
  if (!needle) return true;
  const h = haystack.toLowerCase();
  const n = needle.toLowerCase();
  return h.includes(n);
}

export default function GlobalSearch({ isOpen, onClose, onNavigate, isAdmin }) {
  const [query, setQuery]     = useState('');
  const [selected, setSelected] = useState(0);
  const inputRef = useRef(null);

  // Build results
  const results = React.useMemo(() => {
    if (!query.trim()) {
      // show recently visited
      const recent = getRecent();
      const recentItems = recent
        .map(id => NAV_ITEMS.find(n => n.id === id))
        .filter(Boolean)
        .filter(n => isAdmin || !n.group.includes('Admin'));
      return recentItems.length > 0
        ? [{ group: 'Recently Visited', items: recentItems }]
        : [{ group: 'Quick Navigation', items: NAV_ITEMS.filter(n => isAdmin || !n.group.includes('Admin')).slice(0, 6) }];
    }

    const q = query.trim();
    const navMatches = NAV_ITEMS
      .filter(n => isAdmin || !n.group.includes('Admin'))
      .filter(n => fuzzyMatch(n.label, q));

    const groups = [];
    if (navMatches.length > 0) groups.push({ group: 'Navigation', items: navMatches });
    return groups;
  }, [query, isAdmin]);

  // Flat list for keyboard nav
  const flatItems = results.flatMap(g => g.items);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelected(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const handleSelect = useCallback((item) => {
    addRecent(item.id);
    onNavigate(item.id);
    onClose();
  }, [onNavigate, onClose]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Escape') { onClose(); return; }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelected(s => Math.min(s + 1, flatItems.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelected(s => Math.max(s - 1, 0));
    } else if (e.key === 'Enter' && flatItems[selected]) {
      handleSelect(flatItems[selected]);
    }
  }, [flatItems, selected, onClose, handleSelect]);

  if (!isOpen) return null;

  return createPortal(
    <div className="gsearch-overlay" onClick={onClose}>
      <div className="gsearch-box" onClick={e => e.stopPropagation()}>
        {/* Input row */}
        <div className="gsearch-input-row">
          <svg className="gsearch-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            ref={inputRef}
            className="gsearch-input"
            placeholder="Search tabs, tasks, announcements..."
            value={query}
            onChange={e => { setQuery(e.target.value); setSelected(0); }}
            onKeyDown={handleKeyDown}
          />
          <span className="gsearch-kbd">ESC</span>
        </div>

        {/* Results */}
        <div className="gsearch-results">
          {results.length === 0 ? (
            <div className="gsearch-empty">
              No results for "{query}"
            </div>
          ) : (
            results.map((group) => (
              <div key={group.group}>
                <div className="gsearch-group-label">{group.group}</div>
                {group.items.map((item) => {
                  const flatIdx = flatItems.indexOf(item);
                  return (
                    <button
                      key={item.id}
                      className={`gsearch-result-item ${flatIdx === selected ? 'gsearch-result-item--selected' : ''}`}
                      onClick={() => handleSelect(item)}
                      onMouseEnter={() => setSelected(flatIdx)}
                    >
                      <div className="gsearch-result-icon">{item.icon}</div>
                      <div className="gsearch-result-body">
                        <div className="gsearch-result-title">{item.label}</div>
                        <div className="gsearch-result-sub">{item.group}</div>
                      </div>
                      <span className="gsearch-result-arrow">›</span>
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer hints */}
        <div className="gsearch-footer">
          <span><kbd>↑</kbd><kbd>↓</kbd> Navigate</span>
          <span><kbd>↵</kbd> Open</span>
          <span><kbd>ESC</kbd> Close</span>
        </div>
      </div>
    </div>,
    document.body
  );
}
