import React from 'react';
import { Table } from 'lucide-react';

/**
 * SpreadsheetSheetTabs Molecule
 * Excel-style bottom/top tab switcher for navigating multiple sheets in a workbook.
 */
export default function SpreadsheetSheetTabs({
  sheetNames = [],
  sheetsData = {},
  activeSheetName,
  onSelectSheet
}) {
  return (
    <div className="ip-sheet-tabs-bar">
      {sheetNames.map(sName => {
        const isActive = activeSheetName === sName;
        const rowCount = Math.max(0, (sheetsData?.[sName]?.length || 1) - 1);

        return (
          <button
            key={sName}
            type="button"
            onClick={() => onSelectSheet(sName)}
            className={`ip-sheet-tab-btn ${isActive ? 'ip-sheet-tab-btn--active' : ''}`}
          >
            <Table size={13} color={isActive ? '#059669' : '#94a3b8'} />
            <span>{sName}</span>
            <span className="ip-sheet-tab-count">
              {rowCount}
            </span>
          </button>
        );
      })}
    </div>
  );
}
