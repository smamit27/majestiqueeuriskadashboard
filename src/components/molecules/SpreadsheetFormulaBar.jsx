import React from 'react';
import { Search, X } from 'lucide-react';
import ViewerCellPill from '../atoms/ViewerCellPill.jsx';

/**
 * SpreadsheetFormulaBar Molecule
 * Contains active cell pill, fx value display, search filter input, and row count.
 */
export default function SpreadsheetFormulaBar({
  selectedCell,
  searchValue,
  onSearchChange,
  onSearchClear,
  filteredRowCount,
  totalRowCount,
  colCount
}) {
  return (
    <div className="ip-formula-bar">
      <div className="ip-formula-left">
        {/* Active Cell Address */}
        <ViewerCellPill address={selectedCell.address} />

        {/* Formula Bar Display */}
        <div className="ip-formula-box">
          <span className="ip-formula-fx">fx</span>
          <input
            type="text"
            readOnly
            value={String(selectedCell.val ?? '')}
            placeholder="Select any cell to inspect value or formula"
            className="ip-formula-input"
          />
        </div>
      </div>

      {/* Search & Filter within current sheet */}
      <div className="ip-search-group">
        <div className="ip-search-input-wrap">
          <Search size={14} className="ip-search-icon" />
          <input
            type="text"
            value={searchValue}
            onChange={e => onSearchChange(e.target.value)}
            placeholder="Filter sheet rows…"
            className="ip-search-input"
          />
          {searchValue && (
            <button
              type="button"
              onClick={onSearchClear}
              className="ip-search-clear"
              aria-label="Clear search"
            >
              <X size={13} />
            </button>
          )}
        </div>

        <span className="ip-search-count">
          {filteredRowCount} of {totalRowCount} rows • {colCount} cols
        </span>
      </div>
    </div>
  );
}
