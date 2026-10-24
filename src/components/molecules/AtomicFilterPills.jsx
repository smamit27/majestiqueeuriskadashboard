import React from 'react';

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
              <span style={{
                fontSize: '0.7rem',
                padding: '1px 6px',
                borderRadius: '10px',
                background: isSelected ? 'rgba(13,148,136,0.18)' : '#e2e8f0',
                color: isSelected ? '#0f766e' : '#64748b',
                fontWeight: 700
              }}>
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
