import React from 'react';
import ViewerBadge from '../atoms/ViewerBadge.jsx';

/**
 * Helper to compute column letter (0 -> A, 25 -> Z, 26 -> AA)
 */
export function getColumnLetter(colIndex) {
  let temp = colIndex;
  let letter = '';
  while (temp >= 0) {
    letter = String.fromCharCode((temp % 26) + 65) + letter;
    temp = Math.floor(temp / 26) - 1;
  }
  return letter;
}

/**
 * SpreadsheetGrid Organism
 * High-performance spreadsheet table with sticky headers, column letters,
 * sticky row numbers, cell selection, and financial data formatting.
 */
export default function SpreadsheetGrid({
  headers = [],
  rows = [],
  selectedCell,
  onCellClick,
  activeSheetName
}) {
  return (
    <div className="ip-table-scroll">
      <table className="ip-table">
        <thead>
          {/* Column Letters Row (A, B, C...) */}
          <tr className="ip-col-letter-row">
            <th className="ip-corner-cell">#</th>
            {headers.map((_, colIdx) => (
              <th key={colIdx} className="ip-col-letter-th">
                {getColumnLetter(colIdx)}
              </th>
            ))}
          </tr>

          {/* Table Header Names Row */}
          <tr className="ip-header-row">
            <th className="ip-header-corner-th"></th>
            {headers.map((h, colIdx) => (
              <th key={colIdx} className="ip-header-th">
                {h}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td
                colSpan={headers.length + 1}
                className="ip-data-td ip-empty-row-td"
              >
                No rows match your filter.
              </td>
            </tr>
          ) : (
            rows.map((row, rowIdx) => {
              const isEven = rowIdx % 2 === 0;
              return (
                <tr
                  key={rowIdx}
                  className={`ip-data-row ${!isEven ? 'ip-data-row--alt' : ''}`}
                >
                  <td className="ip-row-num-td">
                    {rowIdx + 1}
                  </td>
                  {headers.map((_, colIdx) => {
                    const cellVal = row[colIdx];
                    const isSelected = selectedCell.row === rowIdx && selectedCell.col === colIdx;
                    const valStr = String(cellVal ?? '');
                    const isNumeric = typeof cellVal === 'number';
                    const hasStatus = valStr === 'Cleared' ||
                      valStr === 'Pending' ||
                      valStr === 'Cheque Pending' ||
                      valStr === 'Overdue' ||
                      valStr.includes('Advance') ||
                      valStr.includes('Active');

                    return (
                      <td
                        key={colIdx}
                        onClick={() => onCellClick(rowIdx, colIdx, cellVal)}
                        className={`ip-data-td ${isSelected ? 'ip-data-td--selected' : ''} ${isNumeric ? 'ip-data-td--mono' : ''}`}
                      >
                        {hasStatus ? (
                          <ViewerBadge status={valStr} />
                        ) : isNumeric ? (
                          cellVal.toLocaleString('en-IN')
                        ) : (
                          valStr
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })
          )}
        </tbody>
      </table>

      {/* Status Footer */}
      <div className="ip-spreadsheet-footer">
        <div>
          <span className="ip-footer-indicator" />
          <span>Ready • In-Portal Multi-Sheet Spreadsheet Engine</span>
        </div>
        <div>
          Active Sheet: <strong>{activeSheetName}</strong>
        </div>
      </div>
    </div>
  );
}
