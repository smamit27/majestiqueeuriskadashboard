import React from 'react';

/**
 * ViewerCellPill Atom
 * Displays active spreadsheet cell coordinate (e.g., A1, C12).
 */
export default function ViewerCellPill({ address = 'A1' }) {
  return (
    <div className="ip-cell-pill">
      {address}
    </div>
  );
}
