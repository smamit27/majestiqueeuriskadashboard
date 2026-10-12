import React, { useState, useMemo } from 'react';

/**
 * Reusable high-readability DataTable component
 * Keeps financial records, tables and data on crisp solid/semi-opaque backgrounds
 */
export default function DataTable({
  columns = [],
  data = [],
  keyField = 'id',
  searchable = true,
  searchPlaceholder = 'Search records...',
  title,
  subtitle,
  actions,
  pageSize = 10,
  emptyMessage = 'No records found',
  className = '',
  style = {}
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState(null);
  const [sortDirection, setSortDirection] = useState('asc'); // 'asc' | 'desc'
  const [currentPage, setCurrentPage] = useState(1);

  // Filter
  const filteredData = useMemo(() => {
    if (!searchTerm.trim()) return data;
    const term = searchTerm.toLowerCase();
    return data.filter((row) => {
      return Object.values(row).some((val) => {
        if (val === null || val === undefined) return false;
        return String(val).toLowerCase().includes(term);
      });
    });
  }, [data, searchTerm]);

  // Sort
  const sortedData = useMemo(() => {
    if (!sortField) return filteredData;
    return [...filteredData].sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];
      if (aVal === bVal) return 0;
      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
      }
      return sortDirection === 'asc'
        ? String(aVal).localeCompare(String(bVal))
        : String(bVal).localeCompare(String(aVal));
    });
  }, [filteredData, sortField, sortDirection]);

  // Pagination
  const totalPages = Math.ceil(sortedData.length / pageSize) || 1;
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedData.slice(start, start + pageSize);
  }, [sortedData, currentPage, pageSize]);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  return (
    <div className={`glass-data-table-container ${className}`} style={style}>
      {/* Header toolbar */}
      {(title || searchable || actions) && (
        <div className="glass-data-table-toolbar">
          <div className="glass-data-table-title-group">
            {title && <h3 className="glass-data-table-title">{title}</h3>}
            {subtitle && <p className="glass-data-table-subtitle">{subtitle}</p>}
          </div>

          <div className="glass-data-table-controls">
            {searchable && (
              <div className="glass-data-table-search">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
                <input
                  type="text"
                  placeholder={searchPlaceholder}
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                  aria-label={searchPlaceholder}
                />
                {searchTerm && (
                  <button
                    type="button"
                    className="glass-data-table-search-clear"
                    onClick={() => setSearchTerm('')}
                    aria-label="Clear search"
                  >
                    ×
                  </button>
                )}
              </div>
            )}
            {actions}
          </div>
        </div>
      )}

      {/* Table Element */}
      <div className="glass-data-table-wrapper">
        <table className="glass-data-table">
          <thead>
            <tr>
              {columns.map((col) => {
                const isSortable = col.sortable !== false;
                const isCurrentSort = sortField === col.field;
                return (
                  <th
                    key={col.field}
                    style={{
                      textAlign: col.align || 'left',
                      width: col.width || 'auto',
                      cursor: isSortable ? 'pointer' : 'default'
                    }}
                    onClick={isSortable ? () => handleSort(col.field) : undefined}
                  >
                    <div className="glass-th-content" style={{ justifyContent: col.align === 'right' ? 'flex-end' : 'flex-start' }}>
                      <span>{col.header}</span>
                      {isSortable && (
                        <span className={`glass-sort-indicator ${isCurrentSort ? 'glass-sort-indicator--active' : ''}`}>
                          {isCurrentSort ? (sortDirection === 'asc' ? '▲' : '▼') : '↕'}
                        </span>
                      )}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {paginatedData.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="glass-data-table-empty">
                  <span>📂</span>
                  <p>{emptyMessage}</p>
                </td>
              </tr>
            ) : (
              paginatedData.map((row, index) => (
                <tr key={row[keyField] || index} className="glass-tr">
                  {columns.map((col) => (
                    <td
                      key={col.field}
                      style={{ textAlign: col.align || 'left' }}
                    >
                      {col.render ? col.render(row[col.field], row) : (row[col.field] ?? '—')}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {sortedData.length > pageSize && (
        <div className="glass-data-table-pagination">
          <span className="glass-data-table-count">
            Showing <b>{Math.min(sortedData.length, (currentPage - 1) * pageSize + 1)}</b> to{' '}
            <b>{Math.min(sortedData.length, currentPage * pageSize)}</b> of <b>{sortedData.length}</b> records
          </span>
          <div className="glass-data-table-page-nav">
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => p - 1)}
              aria-label="Previous page"
            >
              Previous
            </button>
            <span className="glass-data-table-page-indicator">
              Page {currentPage} of {totalPages}
            </span>
            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => p + 1)}
              aria-label="Next page"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
