import React from 'react';
import { Search, X } from 'lucide-react';

/**
 * AtomicSearchBar Molecule
 * Standard search bar with search icon, clear button, and result summary.
 */
export default function AtomicSearchBar({
  value,
  onChange,
  onClear,
  placeholder = 'Search records…',
  countText,
  className = ''
}) {
  return (
    <div className={`atomic-search-wrap ${className}`.trim()}>
      <Search size={15} className="atomic-search-icon" />
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="atomic-search-input"
      />
      {value && (
        <button
          type="button"
          onClick={onClear || (() => onChange(''))}
          className="atomic-search-clear"
          aria-label="Clear search"
        >
          <X size={14} />
        </button>
      )}
      {countText && (
        <span style={{ marginLeft: '12px', fontSize: '0.78rem', color: '#64748b', whiteSpace: 'nowrap' }}>
          {countText}
        </span>
      )}
    </div>
  );
}
