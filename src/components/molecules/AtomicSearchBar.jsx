import React from 'react';
import { Search, X } from 'lucide-react';
import './AtomicSearchBar.css';


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
        <span className="atomic-search-bar-s1">
          {countText}
        </span>
      )}
    </div>
  );
}
