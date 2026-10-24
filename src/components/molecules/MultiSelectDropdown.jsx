import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Check, ChevronDown, X, Search, Plus, Users, UserCheck } from 'lucide-react';

/**
 * Reusable Multi-Select Dropdown with Checkboxes, Wing/Category Filter, Search & Custom Tagging
 * 
 * @param {Array} options - List of objects: { id, label, flatNo, name, wing } or strings
 * @param {Array} selectedValues - Array of selected IDs or label strings
 * @param {Function} onChange - Callback (updatedArray) => void
 * @param {string} placeholder - Default trigger text
 * @param {string} label - Optional title label
 * @param {string} activeScope - 'A_BUILDING' | 'COMMON' (defaults filter tab)
 * @param {boolean} allowCustom - Allow adding custom attendees
 */
export default function MultiSelectDropdown({
  options = [],
  selectedValues = [],
  onChange,
  placeholder = 'Select Committee Members Present...',
  label = 'Key Attendees & Committee Members Present',
  activeScope = 'COMMON',
  allowCustom = true,
  className = ''
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeWingTab, setActiveWingTab] = useState('ALL'); // 'ALL' | 'Wing A' | 'Wing B' | 'Wing C'
  const [customInput, setCustomInput] = useState('');
  const dropdownRef = useRef(null);
  const searchInputRef = useRef(null);

  // Sync activeWingTab if activeScope changes
  useEffect(() => {
    if (activeScope === 'A_BUILDING') {
      setActiveWingTab('Wing A');
    } else {
      setActiveWingTab('ALL');
    }
  }, [activeScope]);

  // Close on outside click
  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
      if (searchInputRef.current) {
        searchInputRef.current.focus();
      }
    }
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [isOpen]);

  // Normalize options into consistent object structure
  const normalizedOptions = useMemo(() => {
    return options.map(opt => {
      if (typeof opt === 'string') {
        const parts = opt.split(/[-–:]/).map(p => p.trim());
        const flatNo = parts[0] || '';
        const name = parts[1] || parts[0];
        const wing = flatNo.startsWith('A') ? 'Wing A' : flatNo.startsWith('B') ? 'Wing B' : flatNo.startsWith('C') ? 'Wing C' : 'Other';
        return {
          id: opt,
          label: opt,
          flatNo,
          name,
          wing
        };
      }
      return {
        id: opt.id || `${opt.flatNo} - ${opt.name}`,
        label: opt.label || `${opt.flatNo} - ${opt.name}`,
        flatNo: opt.flatNo || '',
        name: opt.name || opt.label,
        wing: opt.wing || (opt.flatNo?.startsWith('A') ? 'Wing A' : opt.flatNo?.startsWith('B') ? 'Wing B' : opt.flatNo?.startsWith('C') ? 'Wing C' : 'Other')
      };
    });
  }, [options]);

  // Filter options based on Wing Tab & Search Query
  const filteredOptions = useMemo(() => {
    return normalizedOptions.filter(opt => {
      // Wing filter
      if (activeWingTab !== 'ALL' && opt.wing !== activeWingTab) {
        return false;
      }
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const haystack = `${opt.flatNo} ${opt.name} ${opt.wing} ${opt.label}`.toLowerCase();
        return haystack.includes(q);
      }
      return true;
    });
  }, [normalizedOptions, activeWingTab, searchQuery]);

  // Selected values set for O(1) checks
  const selectedSet = useMemo(() => new Set(selectedValues), [selectedValues]);

  // Toggle single item
  const handleToggle = (id) => {
    const next = new Set(selectedValues);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    onChange?.(Array.from(next));
  };

  // Select all filtered items
  const handleSelectAllFiltered = () => {
    const next = new Set(selectedValues);
    filteredOptions.forEach(opt => next.add(opt.id));
    onChange?.(Array.from(next));
  };

  // Clear all in current filter
  const handleDeselectFiltered = () => {
    const filterIds = new Set(filteredOptions.map(o => o.id));
    const next = selectedValues.filter(val => !filterIds.has(val));
    onChange?.(next);
  };

  // Clear entire selection
  const handleClearAll = (e) => {
    e?.stopPropagation();
    onChange?.([]);
  };

  // Add custom attendee (e.g. Estate Manager, Auditor, Vendor)
  const handleAddCustom = (e) => {
    e?.preventDefault();
    const clean = customInput.trim();
    if (!clean) return;
    if (!selectedSet.has(clean)) {
      onChange?.([...selectedValues, clean]);
    }
    setCustomInput('');
  };

  // Remove single chip
  const handleRemoveChip = (val, e) => {
    e?.stopPropagation();
    onChange?.(selectedValues.filter(v => v !== val));
  };

  // Helper color for wing badges
  const getWingBadgeStyle = (wing) => {
    if (wing === 'Wing A') return { bg: '#ecfdf5', text: '#065f46', border: '#a7f3d0' };
    if (wing === 'Wing B') return { bg: '#eff6ff', text: '#1e40af', border: '#bfdbfe' };
    if (wing === 'Wing C') return { bg: '#f5f3ff', text: '#5b21b6', border: '#ddd6fe' };
    return { bg: '#f3f4f6', text: '#374151', border: '#e5e7eb' };
  };

  return (
    <div className={`reusable-multiselect ${className}`} ref={dropdownRef} style={{ position: 'relative', width: '100%' }}>
      {/* Label */}
      {label && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
          <label style={{ fontSize: '0.76rem', fontWeight: 800, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            {label}
          </label>
          {selectedValues.length > 0 && (
            <span style={{ fontSize: '0.74rem', color: '#059669', fontWeight: 700 }}>
              {selectedValues.length} member{selectedValues.length !== 1 ? 's' : ''} selected
            </span>
          )}
        </div>
      )}

      {/* Main Trigger Box */}
      <div
        data-testid="multiselect-trigger"
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: '100%',
          minHeight: '44px',
          padding: '6px 12px',
          borderRadius: '10px',
          border: isOpen ? '1.5px solid #059669' : '1px solid #cbd5e1',
          background: '#ffffff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer',
          boxSizing: 'border-box',
          boxShadow: isOpen ? '0 0 0 3px rgba(5, 150, 105, 0.12)' : 'none',
          transition: 'all 0.15s ease'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '6px', flex: 1, paddingRight: '8px' }}>
          {selectedValues.length === 0 ? (
            <span style={{ color: '#94a3b8', fontSize: '0.86rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Users size={15} color="#94a3b8" />
              {placeholder}
            </span>
          ) : (
            selectedValues.map(val => {
              const matchedOpt = normalizedOptions.find(o => o.id === val);
              const wingStyle = matchedOpt ? getWingBadgeStyle(matchedOpt.wing) : { bg: '#f1f5f9', text: '#334155', border: '#cbd5e1' };
              return (
                <span
                  key={val}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '3px 8px',
                    borderRadius: '6px',
                    fontSize: '0.76rem',
                    fontWeight: 700,
                    background: wingStyle.bg,
                    color: wingStyle.text,
                    border: `1px solid ${wingStyle.border}`
                  }}
                  onClick={e => e.stopPropagation()}
                >
                  {matchedOpt ? `${matchedOpt.flatNo} (${matchedOpt.name})` : val}
                  <button
                    type="button"
                    onClick={(e) => handleRemoveChip(val, e)}
                    style={{
                      border: 'none',
                      background: 'transparent',
                      color: wingStyle.text,
                      cursor: 'pointer',
                      padding: 0,
                      display: 'flex',
                      alignItems: 'center'
                    }}
                  >
                    <X size={12} />
                  </button>
                </span>
              );
            })
          )}
        </div>

        {/* Right Actions: Clear button & Chevron */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
          {selectedValues.length > 0 && (
            <button
              type="button"
              onClick={handleClearAll}
              title="Clear all selected"
              style={{
                background: '#f1f5f9',
                border: 'none',
                borderRadius: '50%',
                width: '20px',
                height: '20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#64748b',
                cursor: 'pointer'
              }}
            >
              <X size={12} />
            </button>
          )}
          <ChevronDown
            size={16}
            style={{
              color: '#64748b',
              transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.2s ease'
            }}
          />
        </div>
      </div>

      {/* Flyout Dropdown Menu */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: 0,
            right: 0,
            background: '#ffffff',
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 12px 28px rgba(0, 0, 0, 0.12), 0 4px 10px rgba(0, 0, 0, 0.06)',
            zIndex: 1000,
            overflow: 'hidden',
            animation: 'fadeIn 0.15s ease-out'
          }}
        >
          {/* Search Box Header */}
          <div style={{ padding: '10px 12px', borderBottom: '1px solid #f1f5f9', background: '#f8fafc' }}>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Search size={14} style={{ position: 'absolute', left: '10px', color: '#94a3b8' }} />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search flat no (e.g. 204, 306) or member name..."
                style={{
                  width: '100%',
                  padding: '7px 28px 7px 32px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.82rem',
                  outline: 'none',
                  background: '#ffffff'
                }}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  style={{ position: 'absolute', right: '8px', border: 'none', background: 'transparent', cursor: 'pointer', color: '#94a3b8' }}
                >
                  <X size={13} />
                </button>
              )}
            </div>

            {/* Wing / Category Filter Tabs */}
            <div style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
              {[
                { id: 'ALL', label: `All (${normalizedOptions.length})` },
                { id: 'Wing A', label: `Wing A (${normalizedOptions.filter(o => o.wing === 'Wing A').length})` },
                { id: 'Wing B', label: `Wing B (${normalizedOptions.filter(o => o.wing === 'Wing B').length})` },
                { id: 'Wing C', label: `Wing C (${normalizedOptions.filter(o => o.wing === 'Wing C').length})` }
              ].map(tab => {
                const isActive = activeWingTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveWingTab(tab.id)}
                    style={{
                      flex: 1,
                      padding: '4px 6px',
                      borderRadius: '6px',
                      border: isActive ? '1px solid #059669' : '1px solid #e2e8f0',
                      background: isActive ? '#059669' : '#ffffff',
                      color: isActive ? '#ffffff' : '#475569',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quick Batch Actions Row */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 12px', background: '#f1f5f9', borderBottom: '1px solid #e2e8f0', fontSize: '0.72rem' }}>
            <span style={{ color: '#64748b', fontWeight: 600 }}>
              Showing {filteredOptions.length} of {normalizedOptions.length}
            </span>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                onClick={handleSelectAllFiltered}
                style={{ border: 'none', background: 'transparent', color: '#059669', fontWeight: 700, cursor: 'pointer', padding: 0 }}
              >
                + Select Visible
              </button>
              <button
                type="button"
                onClick={handleDeselectFiltered}
                style={{ border: 'none', background: 'transparent', color: '#dc2626', fontWeight: 700, cursor: 'pointer', padding: 0 }}
              >
                Deselect Visible
              </button>
            </div>
          </div>

          {/* Options List with Checkboxes */}
          <div style={{ maxHeight: '250px', overflowY: 'auto', padding: '4px 0' }}>
            {filteredOptions.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '18px', color: '#94a3b8', fontSize: '0.8rem' }}>
                No committee members match "{searchQuery}" in {activeWingTab}.
              </div>
            ) : (
              filteredOptions.map(opt => {
                const isChecked = selectedSet.has(opt.id);
                const wingBadge = getWingBadgeStyle(opt.wing);
                return (
                  <div
                    key={opt.id}
                    onClick={() => handleToggle(opt.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 12px',
                      cursor: 'pointer',
                      background: isChecked ? 'rgba(5, 150, 105, 0.05)' : 'transparent',
                      borderBottom: '1px solid #f8fafc',
                      transition: 'background 0.15s ease'
                    }}
                    onMouseEnter={e => {
                      if (!isChecked) e.currentTarget.style.background = '#f8fafc';
                    }}
                    onMouseLeave={e => {
                      if (!isChecked) e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      {/* Checkbox Box */}
                      <div
                        style={{
                          width: '18px',
                          height: '18px',
                          borderRadius: '4px',
                          border: isChecked ? '2px solid #059669' : '1.5px solid #cbd5e1',
                          background: isChecked ? '#059669' : '#ffffff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          transition: 'all 0.15s ease'
                        }}
                      >
                        {isChecked && <Check size={12} color="#ffffff" strokeWidth={3} />}
                      </div>

                      {/* Flat No Pill */}
                      <span
                        style={{
                          fontSize: '0.74rem',
                          fontWeight: 800,
                          padding: '2px 7px',
                          borderRadius: '5px',
                          background: wingBadge.bg,
                          color: wingBadge.text,
                          border: `1px solid ${wingBadge.border}`,
                          fontFamily: 'monospace'
                        }}
                      >
                        {opt.flatNo}
                      </span>

                      {/* Member Name */}
                      <span style={{ fontSize: '0.84rem', fontWeight: 700, color: '#0f172a' }}>
                        {opt.name}
                      </span>
                    </div>

                    {/* Wing Name Badge */}
                    <span style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 600 }}>
                      {opt.wing}
                    </span>
                  </div>
                );
              })
            )}
          </div>

          {/* Add Custom Attendee Footer */}
          {allowCustom && (
            <form
              onSubmit={handleAddCustom}
              style={{
                display: 'flex',
                gap: '8px',
                padding: '8px 12px',
                background: '#f8fafc',
                borderTop: '1px solid #e2e8f0'
              }}
            >
              <input
                type="text"
                value={customInput}
                onChange={e => setCustomInput(e.target.value)}
                placeholder="Add other attendee (e.g. Estate Manager, Auditor)..."
                style={{
                  flex: 1,
                  padding: '6px 10px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.78rem',
                  outline: 'none',
                  background: '#ffffff'
                }}
              />
              <button
                type="submit"
                disabled={!customInput.trim()}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '6px 10px',
                  borderRadius: '6px',
                  border: 'none',
                  background: '#0b2b26',
                  color: '#ffffff',
                  fontSize: '0.76rem',
                  fontWeight: 700,
                  cursor: customInput.trim() ? 'pointer' : 'not-allowed',
                  opacity: customInput.trim() ? 1 : 0.6
                }}
              >
                <Plus size={13} />
                Add
              </button>
            </form>
          )}

          {/* Done Button Bar */}
          <div style={{ padding: '8px 12px', background: '#ffffff', borderTop: '1px solid #f1f5f9', textAlign: 'right' }}>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="button-primary"
              style={{ padding: '6px 16px', fontSize: '0.78rem' }}
            >
              Done ({selectedValues.length} Selected)
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
