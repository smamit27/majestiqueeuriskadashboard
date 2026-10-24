import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Check, ChevronDown, X, Search, Plus, Users, UserCheck } from 'lucide-react';
import './MultiSelectDropdown.css';


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
    <div className={`reusable-multiselect ${className} multi-select-dropdown-s1`} ref={dropdownRef}>
      {/* Label */}
      {label && (
        <div className="multi-select-dropdown-s2">
          <label className="multi-select-dropdown-s3">
            {label}
          </label>
          {selectedValues.length > 0 && (
            <span className="multi-select-dropdown-s4">
              {selectedValues.length} member{selectedValues.length !== 1 ? 's' : ''} selected
            </span>
          )}
        </div>
      )}

      {/* Main Trigger Box */}
      <div
        data-testid="multiselect-trigger"
        onClick={() => setIsOpen(!isOpen)}
        className={`multi-select-dropdown-s5 ${(isOpen ? 'multi-select-dropdown-cond-1-true' : 'multi-select-dropdown-cond-2-false')}`}
      >
        <div className="multi-select-dropdown-s6">
          {selectedValues.length === 0 ? (
            <span className="multi-select-dropdown-s7">
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
                  className="multi-select-dropdown-s8" style={{ background: wingStyle.bg, color: wingStyle.text, border: `1px solid ${wingStyle.border}` }}
                  onClick={e => e.stopPropagation()}
                >
                  {matchedOpt ? `${matchedOpt.flatNo} (${matchedOpt.name})` : val}
                  <button
                    type="button"
                    onClick={(e) => handleRemoveChip(val, e)}
                    className="multi-select-dropdown-s9" style={{ color: wingStyle.text }}
                  >
                    <X size={12} />
                  </button>
                </span>
              );
            })
          )}
        </div>

        {/* Right Actions: Clear button & Chevron */}
        <div className="multi-select-dropdown-s10">
          {selectedValues.length > 0 && (
            <button
              type="button"
              onClick={handleClearAll}
              title="Clear all selected"
              className="multi-select-dropdown-s11"
            >
              <X size={12} />
            </button>
          )}
          <ChevronDown
            size={16}
            className={`multi-select-dropdown-s12 ${(isOpen ? 'multi-select-dropdown-cond-3-true' : 'multi-select-dropdown-cond-4-false')}`}
          />
        </div>
      </div>

      {/* Flyout Dropdown Menu */}
      {isOpen && (
        <div
          className="multi-select-dropdown-s13"
        >
          {/* Search Box Header */}
          <div className="multi-select-dropdown-s14">
            <div className="multi-select-dropdown-s15">
              <Search size={14} className="multi-select-dropdown-s16" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search flat no (e.g. 204, 306) or member name..."
                className="multi-select-dropdown-s17"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="multi-select-dropdown-s18"
                >
                  <X size={13} />
                </button>
              )}
            </div>

            {/* Wing / Category Filter Tabs */}
            <div className="multi-select-dropdown-s19">
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
                    className={`multi-select-dropdown-s20 ${(isActive ? 'multi-select-dropdown-cond-5-true' : 'multi-select-dropdown-cond-6-false')}`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quick Batch Actions Row */}
          <div className="multi-select-dropdown-s21">
            <span className="multi-select-dropdown-s22">
              Showing {filteredOptions.length} of {normalizedOptions.length}
            </span>
            <div className="multi-select-dropdown-s23">
              <button
                type="button"
                onClick={handleSelectAllFiltered}
                className="multi-select-dropdown-s24"
              >
                + Select Visible
              </button>
              <button
                type="button"
                onClick={handleDeselectFiltered}
                className="multi-select-dropdown-s25"
              >
                Deselect Visible
              </button>
            </div>
          </div>

          {/* Options List with Checkboxes */}
          <div className="multi-select-dropdown-s26">
            {filteredOptions.length === 0 ? (
              <div className="multi-select-dropdown-s27">
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
                    className={`multi-select-dropdown-s28 ${(isChecked ? 'multi-select-dropdown-cond-7-true' : 'multi-select-dropdown-cond-8-false')}`}
                    onMouseEnter={e => {
                      if (!isChecked) e.currentTarget.style.background = '#f8fafc';
                    }}
                    onMouseLeave={e => {
                      if (!isChecked) e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    <div className="multi-select-dropdown-s29">
                      {/* Checkbox Box */}
                      <div
                        className={`multi-select-dropdown-s30 ${(isChecked ? 'multi-select-dropdown-cond-9-true' : 'multi-select-dropdown-cond-10-false')}`}
                      >
                        {isChecked && <Check size={12} color="#ffffff" strokeWidth={3} />}
                      </div>

                      {/* Flat No Pill */}
                      <span
                        className="multi-select-dropdown-s31" style={{ background: wingBadge.bg, color: wingBadge.text, border: `1px solid ${wingBadge.border}` }}
                      >
                        {opt.flatNo}
                      </span>

                      {/* Member Name */}
                      <span className="multi-select-dropdown-s32">
                        {opt.name}
                      </span>
                    </div>

                    {/* Wing Name Badge */}
                    <span className="multi-select-dropdown-s33">
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
              className="multi-select-dropdown-s34"
            >
              <input
                type="text"
                value={customInput}
                onChange={e => setCustomInput(e.target.value)}
                placeholder="Add other attendee (e.g. Estate Manager, Auditor)..."
                className="multi-select-dropdown-s35"
              />
              <button
                type="submit"
                disabled={!customInput.trim()}
                className={`multi-select-dropdown-s36 ${(customInput.trim() ? 'multi-select-dropdown-cond-11-true' : 'multi-select-dropdown-cond-12-false')}`}
              >
                <Plus size={13} />
                Add
              </button>
            </form>
          )}

          {/* Done Button Bar */}
          <div className="multi-select-dropdown-s37">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="button-primary multi-select-dropdown-s38"
            >
              Done ({selectedValues.length} Selected)
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
