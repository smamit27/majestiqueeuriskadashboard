import React from 'react';

/**
 * KpiGrid
 * Responsive Liquid Glass grid container with support for column layouts
 */
export default function KpiGrid({
  children,
  columns = 4, // 2 | 3 | 4
  className = '',
  style = {}
}) {
  const colClass = columns === 3 ? 'kpi-grid--cols-3' : columns === 4 ? 'kpi-grid--cols-4' : '';

  return (
    <div className={`kpi-grid ${colClass} ${className}`} style={style}>
      {children}
    </div>
  );
}
