import React from 'react';
import './AtomicFilterPills.css';


/**
 * AtomicFilterPills Molecule
 * Horizontal scrollable category / filter pill group with active highlight.
 */
export default function AtomicFilterPills({
  options = [],
  selected,
  onSelect,
  getLabel = opt => opt,
  getValue = opt => opt,
  getCount,
  className = ''
}) {
  return (
    <div className={`atomic-pills-row ${className}`.trim()}>
      {options.map(option => {
        const val = getValue(option);
        const label = getLabel(option);
        const isSelected = selected === val;
        const count = getCount ? getCount(option) : undefined;

        return (
          <button
            key={String(val)}
            type="button"
            onClick={() => onSelect(val)}
            className={`atomic-filter-pill ${isSelected ? 'atomic-filter-pill--active' : ''}`}
          >
            <span>{label}</span>
            {count !== undefined && (
              <span className={`atomic-filter-pills-s1 ${(isSelected ? 'atomic-filter-pills-cond-1-true' : 'atomic-filter-pills-cond-2-false')}`}>
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
