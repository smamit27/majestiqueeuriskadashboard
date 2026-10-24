import React from 'react';

/**
 * ViewerBadge Atom
 * Renders document type badges (PPT, PDF, XLSX) and spreadsheet cell status pills
 * without any inline CSS.
 */
export default function ViewerBadge({ type, status, children, className = '' }) {
  if (type) {
    const typeClass = type === 'XLSX'
      ? 'ip-type-badge--xlsx'
      : type === 'PPT'
      ? 'ip-type-badge--ppt'
      : 'ip-type-badge--pdf';
    return <span className={`ip-type-badge ${typeClass} ${className}`}>{children || type}</span>;
  }

  if (status) {
    let statusClass = '';
    const s = String(status).trim();
    if (s === 'Cleared') statusClass = 'ip-status-badge--cleared';
    else if (s === 'Pending' || s === 'Cheque Pending') statusClass = 'ip-status-badge--pending';
    else if (s === 'Overdue') statusClass = 'ip-status-badge--overdue';
    else if (s.includes('Advance')) statusClass = 'ip-status-badge--advance';
    else if (s.includes('Active')) statusClass = 'ip-status-badge--active';

    if (statusClass) {
      return <span className={`ip-status-badge ${statusClass} ${className}`}>{children || status}</span>;
    }
    return <span>{children || status}</span>;
  }

  return <span className={`ip-type-badge ${className}`}>{children}</span>;
}
