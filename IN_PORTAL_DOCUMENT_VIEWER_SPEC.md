# 📄 In-Portal Document & Presentation Viewer: Complete Specification & Master AI Prompt (Atomic Design)

> **Purpose:** Use this document as a complete, self-contained specification and prompt to develop an enterprise-grade In-Portal Document, Presentation, and Multi-Sheet Spreadsheet Viewer adhering strictly to **Atomic Design** with dedicated CSS and **zero inline styles**.

---

## 1. Executive Summary & Capabilities

The **In-Portal Document & Presentation Viewer** is a unified in-app viewer designed to render diverse enterprise documents without requiring external desktop software or leaving the application.

### Key Capabilities
| Feature | Details |
| :--- | :--- |
| **Atomic Architecture** | Structured into **Atoms** (badges, zoom controls, cell coordinate pills), **Molecules** (formula bar, sheet tabs, toolbar, fallback cards, modals), and **Organisms** (spreadsheet grid, master viewer). |
| **Zero Inline CSS** | All styling is encapsulated in clean, responsive CSS classes (`InPortalDocumentViewer.css`) using BEM-like conventions. |
| **Multi-Sheet Spreadsheets** | Interactive in-portal engine for `.xlsx`, `.xls`, and `.csv` files using SheetJS (`xlsx`). Features sheet navigation tabs, active cell address & formula bar (`A1`, `fx`), sticky headers (`A, B, C...`), live filtering, and on-the-fly XLSX export. |
| **Interactive Presentations** | Embeds native HTML/web presentation slides in high performance iframes with full presentation zoom and fullscreen modes. |
| **Audit Dossiers & PDFs** | Native high-resolution PDF rendering with multi-mode zoom (70%–160%), fullscreen, direct download, and clean browser print execution. |
| **Client-Side File Upload** | Drag & drop or file picker for local files (`.pdf`, `.xlsx`, `.xls`, `.csv`, `.html`, `.pptx`, `.png`, `.jpg`). Spreadsheets parse immediately into the interactive grid. |
| **Web URL Loader** | Modal to fetch and display any publicly accessible document or PDF via URL. |
| **Dual Architecture** | Provides both a **Full-Page Viewer** (`InPortalDocumentViewer`) and a **Reusable Modal** (`DocumentViewerModal`) for opening attachments from tables and vaults. |

---

## 2. Dependencies & Prerequisites

Install the required npm packages:

```bash
npm install xlsx lucide-react
```

### Peer Requirements
- **React**: 18.x or 19.x
- **Icons**: `lucide-react`
- **File Parsing**: `xlsx` (SheetJS)

---

## 3. Atomic Design File Structure

```
src/
├── components/
│   ├── atoms/
│   │   ├── ViewerBadge.jsx            # Document type & cell status badges
│   │   ├── ViewerZoomControls.jsx     # Zoom In, Zoom Out, %, Reset controls
│   │   └── ViewerCellPill.jsx         # Active cell coordinate badge (e.g. A1)
│   ├── molecules/
│   │   ├── DocumentPresetSelector.jsx # Document switcher pills + file uploader + URL button
│   │   ├── SpreadsheetFormulaBar.jsx  # Cell address, fx formula input, search filter & row count
│   │   ├── SpreadsheetSheetTabs.jsx   # Excel-style sheet tab buttons with row counters
│   │   ├── ViewerToolbar.jsx          # Top dark toolbar with title, zoom, print, download, fullscreen
│   │   ├── PptxFallbackCard.jsx       # Fallback card when raw binary .pptx is loaded
│   │   ├── OpenUrlModal.jsx           # Dialog modal for entering external URLs
│   │   └── DocumentViewerModal.jsx    # Standalone reusable document modal with blurred backdrop
│   └── organisms/
│       ├── InPortalDocumentViewer.css # Dedicated stylesheet with ZERO inline styles
│       ├── SpreadsheetGrid.jsx        # Sticky headers (A, B, C...), row indices, cell selection
│       ├── InPortalDocumentViewer.jsx # Master root organism coordinating state and composition
│       └── InPortalDocumentViewer.test.jsx # Complete Vitest test suite
```

---

## 4. Master Prompt for AI Coding Agents

```markdown
Create a modular, production-ready "In-Portal Document & Presentation Viewer" in React strictly following the **Atomic Design pattern** (Atoms, Molecules, Organisms) with **zero inline styles** and a dedicated CSS stylesheet.

### Requirements:

1. **Atoms (`src/components/atoms/`)**:
   - `ViewerBadge.jsx`: Accepts `type` (PPT, PDF, XLSX) or `status` (Cleared, Pending, Overdue, Advance, Active) and renders styled status pills with CSS classes.
   - `ViewerZoomControls.jsx`: Renders zoom buttons (-15%, +15%, reset, and percentage label).
   - `ViewerCellPill.jsx`: Displays active spreadsheet cell coordinate (e.g. `A1`, `B4`).

2. **Molecules (`src/components/molecules/`)**:
   - `DocumentPresetSelector.jsx`: Renders preset switcher buttons, uploaded doc pill, file input label, and open URL trigger.
   - `SpreadsheetFormulaBar.jsx`: Combines `ViewerCellPill`, `fx` formula box, real-time search input with clear button, and filtered row counter.
   - `SpreadsheetSheetTabs.jsx`: Renders Excel-style sheet tab buttons with sheet names and row count badges.
   - `ViewerToolbar.jsx`: Dark frame toolbar assembling `ViewerBadge`, document title, `ViewerZoomControls`, Print button, Download button (with on-the-fly XLSX generation), and Fullscreen button.
   - `PptxFallbackCard.jsx`: Friendly guidance card when a binary `.pptx` file is loaded.
   - `OpenUrlModal.jsx`: Modal popup to enter external document URL.
   - `DocumentViewerModal.jsx`: Standalone exported modal with blurred backdrop, header toolbar, and iframe viewport.

3. **Organisms (`src/components/organisms/`)**:
   - `SpreadsheetGrid.jsx`: Renders table with sticky Excel column letters (`A, B, C...` via `getColumnLetter`), sticky row indices (`#`), sticky header row, cell click selection, status badge formatting, and ready status footer.
   - `InPortalDocumentViewer.jsx`: Master coordinator managing document selection, zoom state, fullscreen API, search filtering, cell selection, file upload parsing via `XLSX.read`, and composing all molecules and organisms.

4. **Styling (`InPortalDocumentViewer.css`)**:
   - Absolutely NO inline `style={{ ... }}` in JSX (except dynamic runtime zoom percentage for the iframe).
   - BEM-style classes (e.g., `.ip-viewer-root`, `.ip-header-banner`, `.ip-toolbar`, `.ip-spreadsheet-container`, `.ip-table`, `.ip-col-letter-th`, `.ip-data-td--selected`).
   - Liquid-glass banner, dark mode viewer frame (`#0f172a`), Excel-style grid and tabs.
```

---

## 5. Complete Implementation Reference Code

### A. Dedicated Stylesheet: `src/components/organisms/InPortalDocumentViewer.css`

```css
/* ── Root Layout ── */
.ip-viewer-root { display: flex; flex-direction: column; gap: 20px; width: 100%; }

/* ── Header Banner ── */
.ip-header-banner {
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.95), rgba(248, 250, 252, 0.88));
  backdrop-filter: blur(12px);
  border: 1px solid rgba(226, 232, 240, 0.85);
  border-radius: 16px;
  padding: 22px 26px;
  display: flex;
  flex-wrap: wrap;
  justifyContent: space-between;
  align-items: center;
  gap: 18px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.04);
}
.ip-header-info { display: flex; align-items: center; gap: 12px; }
.ip-header-icon-box {
  background: linear-gradient(135deg, #0d9488 0%, #059669 100%);
  color: #fff;
  padding: 10px;
  border-radius: 12px;
  display: flex;
  box-shadow: 0 4px 14px rgba(13, 148, 136, 0.35);
}
.ip-header-title { margin: 0; font-size: 1.38rem; font-weight: 800; color: #0f172a; }
.ip-header-tags { display: flex; align-items: center; gap: 8px; margin-top: 4px; }
.ip-tag-pill { font-size: 0.72rem; font-weight: 800; padding: 2px 8px; border-radius: 12px; background: rgba(13,148,136,0.12); color: #0f766e; }
.ip-header-subtitle { font-size: 0.8rem; color: #64748b; }

/* ── Presets & Action Buttons ── */
.ip-preset-group { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
.ip-preset-btn { display: inline-flex; align-items: center; gap: 8px; padding: 9px 15px; border-radius: 12px; font-size: 0.83rem; font-weight: 500; border: 1px solid rgba(203, 213, 225, 0.7); background: #fff; color: #475569; cursor: pointer; transition: all 0.18s ease; }
.ip-preset-btn--selected { font-weight: 700; border: 1.5px solid #0d9488; background: #f0fdfa; color: #0d9488; }
.ip-preset-btn--selected.ip-preset-btn--xlsx { border-color: #059669; background: #f0fdf4; color: #047857; }
.ip-preset-btn--selected.ip-preset-btn--ppt { border-color: #d97706; background: #fffbeb; color: #b45309; }
.ip-upload-btn { display: inline-flex; align-items: center; gap: 7px; padding: 9px 15px; border-radius: 12px; font-size: 0.83rem; font-weight: 600; border: 1.5px dashed #0d9488; background: rgba(240, 253, 250, 0.85); color: #0d9488; cursor: pointer; }
.ip-upload-input { display: none; }
.ip-url-btn { display: inline-flex; align-items: center; gap: 6px; padding: 9px 14px; border-radius: 12px; font-size: 0.83rem; font-weight: 600; border: 1px solid #cbd5e1; background: #fff; color: #475569; cursor: pointer; }

/* ── Viewer Frame & Toolbar ── */
.ip-frame-container { background: #0f172a; border-radius: 18px; border: 1px solid #334155; overflow: hidden; display: flex; flex-direction: column; box-shadow: 0 20px 50px rgba(0,0,0,0.22); }
.ip-toolbar { background: #090e1a; padding: 12px 18px; border-bottom: 1px solid #1e293b; display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 12px; color: #fff; }
.ip-toolbar-left { display: flex; align-items: center; gap: 10px; }
.ip-type-badge { color: #fff; padding: 3px 10px; border-radius: 8px; font-size: 0.74rem; font-weight: 800; background: #0d9488; }
.ip-type-badge--xlsx { background: #059669; }
.ip-type-badge--ppt { background: #d97706; }
.ip-type-badge--pdf { background: #0d9488; }
.ip-doc-title { font-size: 0.92rem; font-weight: 700; color: #f8fafc; }
.ip-toolbar-right { display: flex; align-items: center; gap: 8px; }

/* ── Zoom Controls ── */
.ip-zoom-group { display: flex; align-items: center; background: #1e293b; border-radius: 10px; padding: 3px 8px; border: 1px solid #334155; }
.ip-zoom-btn { background: none; border: none; color: #94a3b8; padding: 4px; cursor: pointer; display: flex; align-items: center; }
.ip-zoom-btn:hover { color: #fff; }
.ip-zoom-label { font-size: 0.78rem; color: #e2e8f0; min-width: 44px; text-align: center; font-weight: 600; }
.ip-icon-btn, .ip-action-btn { display: inline-flex; align-items: center; gap: 5px; background: #1e293b; border: 1px solid #334155; color: #e2e8f0; padding: 7px 12px; border-radius: 10px; font-size: 0.78rem; font-weight: 600; cursor: pointer; }
.ip-download-btn { display: inline-flex; align-items: center; gap: 6px; border: none; color: #fff; padding: 7px 14px; border-radius: 10px; font-size: 0.78rem; font-weight: 700; text-decoration: none; cursor: pointer; }
.ip-download-btn--xlsx { background: linear-gradient(135deg, #059669 0%, #047857 100%); }
.ip-download-btn--default { background: linear-gradient(135deg, #0d9488 0%, #0f766e 100%); }

/* ── Viewport Canvas ── */
.ip-viewport { width: 100%; height: 78vh; min-height: 620px; background: #0b1329; overflow: hidden; display: flex; flex-direction: column; position: relative; }
.ip-viewport--fullscreen { height: calc(100vh - 60px); }
.ip-iframe-wrap { width: 100%; height: 100%; display: flex; justify-content: center; align-items: center; overflow: auto; background: #0b1329; }
.ip-iframe { min-height: 100%; min-width: 100%; border: none; background: #fff; }

/* ── Spreadsheet Layout ── */
.ip-spreadsheet-container { display: flex; flex-direction: column; height: 100%; width: 100%; background: #fff; }
.ip-formula-bar { background: #f8fafc; border-bottom: 1px solid #e2e8f0; padding: 8px 16px; display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 12px; }
.ip-formula-left { display: flex; align-items: center; gap: 8px; flex: 1; min-width: 280px; }
.ip-cell-pill { background: #059669; color: #fff; padding: 4px 10px; border-radius: 6px; font-size: 0.78rem; font-weight: 800; font-family: monospace; min-width: 42px; text-align: center; }
.ip-formula-box { display: flex; align-items: center; background: #fff; border: 1px solid #cbd5e1; border-radius: 8px; padding: 4px 10px; flex: 1; gap: 6px; }
.ip-formula-fx { font-size: 0.76rem; font-weight: 800; color: #94a3b8; font-style: italic; }
.ip-formula-input { border: none; outline: none; width: 100%; font-size: 0.82rem; color: #1e293b; background: transparent; }
.ip-search-group { display: flex; align-items: center; gap: 10px; }
.ip-search-input-wrap { position: relative; display: flex; align-items: center; }
.ip-search-icon { position: absolute; left: 10px; color: #94a3b8; pointer-events: none; }
.ip-search-input { padding: 5px 28px 5px 30px; font-size: 0.8rem; border-radius: 8px; border: 1px solid #cbd5e1; outline: none; background: #fff; color: #0f172a; width: 180px; }
.ip-search-clear { position: absolute; right: 6px; background: none; border: none; color: #94a3b8; cursor: pointer; padding: 2px; }
.ip-search-count { font-size: 0.74rem; color: #64748b; font-weight: 600; }

/* ── Sheet Tabs ── */
.ip-sheet-tabs-bar { background: #f1f5f9; border-bottom: 1px solid #cbd5e1; padding: 4px 12px 0 12px; display: flex; align-items: flex-end; gap: 4px; overflow-x: auto; }
.ip-sheet-tab-btn { display: inline-flex; align-items: center; gap: 6px; padding: 7px 14px; font-size: 0.8rem; font-weight: 500; color: #475569; background: transparent; border: none; border-top-left-radius: 6px; border-top-right-radius: 6px; cursor: pointer; white-space: nowrap; }
.ip-sheet-tab-btn--active { font-weight: 700; color: #065f46; background: #fff; border-top: 2px solid #059669; border-left: 1px solid #cbd5e1; border-right: 1px solid #cbd5e1; border-bottom: 1px solid #fff; margin-bottom: -1px; }
.ip-sheet-tab-count { font-size: 0.68rem; padding: 1px 5px; border-radius: 10px; background: #e2e8f0; color: #64748b; }
.ip-sheet-tab-btn--active .ip-sheet-tab-count { background: #dcfce7; color: #166534; }

/* ── Table Grid ── */
.ip-table-scroll { flex: 1; overflow: auto; position: relative; background: #fff; }
.ip-table { border-collapse: collapse; width: max-content; min-width: 100%; font-family: Inter, system-ui, -apple-system, sans-serif; }
.ip-col-letter-row { background: #f8fafc; position: sticky; top: 0; z-index: 10; }
.ip-corner-cell { width: 44px; min-width: 44px; padding: 5px; background: #e2e8f0; border-bottom: 1px solid #cbd5e1; border-right: 1px solid #cbd5e1; color: #64748b; font-size: 0.72rem; font-weight: 700; text-align: center; position: sticky; left: 0; z-index: 20; }
.ip-col-letter-th { padding: 6px 12px; background: #f1f5f9; border-bottom: 1px solid #cbd5e1; border-right: 1px solid #e2e8f0; color: #475569; font-size: 0.74rem; font-weight: 700; text-align: center; }
.ip-header-row { background: #f8fafc; position: sticky; top: 29px; z-index: 9; }
.ip-header-corner-th { padding: 6px; background: #e2e8f0; border-bottom: 2px solid #cbd5e1; border-right: 1px solid #cbd5e1; position: sticky; left: 0; z-index: 19; }
.ip-header-th { padding: 8px 12px; background: #f8fafc; border-bottom: 2px solid #cbd5e1; border-right: 1px solid #e2e8f0; color: #0f172a; font-weight: 700; text-align: left; white-space: nowrap; font-size: 0.82rem; }
.ip-data-row { background: #fff; }
.ip-data-row--alt { background: #fcfcfd; }
.ip-row-num-td { padding: 4px; background: #f1f5f9; border-bottom: 1px solid #e2e8f0; border-right: 1px solid #cbd5e1; color: #64748b; font-size: 0.72rem; text-align: center; font-weight: 600; position: sticky; left: 0; z-index: 5; }
.ip-data-td { padding: 8px 12px; border-bottom: 1px solid #e2e8f0; border-right: 1px solid #f1f5f9; color: #1e293b; white-space: nowrap; cursor: cell; font-size: 0.82rem; }
.ip-data-td--selected { outline: 2px solid #059669; outline-offset: -2px; background: #ecfdf5 !important; }
.ip-data-td--mono { font-family: monospace; }
.ip-empty-row-td { text-align: center; padding: 30px; color: #64748b; }

/* ── Status Badges ── */
.ip-status-badge { padding: 2px 8px; border-radius: 12px; font-size: 0.74rem; font-weight: 700; display: inline-block; }
.ip-status-badge--cleared { background: #dcfce7; color: #15803d; }
.ip-status-badge--pending { background: #fef3c7; color: #b45309; }
.ip-status-badge--overdue { background: #fee2e2; color: #b91c1c; }
.ip-status-badge--advance { background: #e0f2fe; color: #0369a1; }
.ip-status-badge--active { background: #ecfdf5; color: #047857; }

/* ── Footer ── */
.ip-spreadsheet-footer { background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 6px 16px; display: flex; justify-content: space-between; align-items: center; font-size: 0.74rem; color: #64748b; }
.ip-footer-indicator { display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: #059669; margin-right: 8px; }

/* ── Modals & Popups ── */
.ip-modal-backdrop { position: fixed; inset: 0; background: rgba(15, 23, 42, 0.7); backdrop-filter: blur(6px); z-index: 10000; display: flex; align-items: center; justify-content: center; padding: 20px; }
.ip-modal-content { background: #fff; border-radius: 18px; max-width: 520px; width: 100%; padding: 26px; box-shadow: 0 25px 60px rgba(0,0,0,0.25); }
.ip-modal-title { margin: 0 0 8px 0; font-size: 1.25rem; font-weight: 800; color: #0f172a; }
.ip-modal-desc { margin: 0 0 18px 0; font-size: 0.85rem; color: #64748b; }
.ip-modal-input { width: 100%; padding: 12px 14px; border-radius: 10px; border: 1px solid #cbd5e1; font-size: 0.9rem; outline: none; box-sizing: border-box; margin-bottom: 18px; }
.ip-modal-actions { display: flex; justify-content: flex-end; gap: 10px; }
.ip-btn-secondary { padding: 8px 16px; border-radius: 10px; background: #f1f5f9; border: none; color: #475569; font-weight: 600; cursor: pointer; }
.ip-btn-primary { padding: 8px 18px; border-radius: 10px; background: #0d9488; border: none; color: #fff; font-weight: 700; cursor: pointer; }

/* DocumentViewerModal Reusable */
.ip-doc-modal-backdrop { position: fixed; inset: 0; z-index: 10000; background: rgba(15, 23, 42, 0.75); backdrop-filter: blur(8px); display: flex; align-items: center; justify-content: center; padding: 20px; }
.ip-doc-modal-content { width: 100%; max-width: 1100px; height: 90vh; background: #fff; border-radius: 18px; display: flex; flex-direction: column; overflow: hidden; box-shadow: 0 25px 80px rgba(0,0,0,0.3); }
.ip-doc-modal-header { padding: 14px 20px; background: #0f172a; color: #fff; display: flex; justify-content: space-between; align-items: center; }
.ip-doc-modal-title-group { display: flex; align-items: center; gap: 10px; }
.ip-doc-modal-title { font-size: 0.95rem; font-weight: 700; }
.ip-doc-modal-actions { display: flex; gap: 10px; align-items: center; }
.ip-doc-modal-close { background: none; border: none; color: #94a3b8; cursor: pointer; font-size: 1.2rem; }
.ip-doc-modal-iframe { width: 100%; height: 100%; border: none; }
```

---

## 6. How to Use in Your Other Project

### Step 1: Install Dependencies
```bash
npm install xlsx lucide-react
```

### Step 2: Import & Use Full-Page Viewer
```jsx
import InPortalDocumentViewer from './components/organisms/InPortalDocumentViewer.jsx';

export default function App() {
  return <InPortalDocumentViewer initialDocId="workflow_ppt" />;
}
```

### Step 3: Use Standalone Modal Anywhere in App
```jsx
import React, { useState } from 'react';
import { DocumentViewerModal } from './components/organisms/InPortalDocumentViewer.jsx';

export function AttachmentViewer({ url, title }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button onClick={() => setOpen(true)}>Preview Document</button>
      {open && (
        <DocumentViewerModal
          documentUrl={url}
          documentTitle={title}
          documentType="PDF"
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
```
