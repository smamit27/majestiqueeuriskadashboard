import React, { useState, useMemo, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { Eye } from 'lucide-react';
import './InPortalDocumentViewer.css';

// ── Atoms & Molecules ──
import DocumentPresetSelector from '../molecules/DocumentPresetSelector.jsx';
import ViewerToolbar from '../molecules/ViewerToolbar.jsx';
import SpreadsheetFormulaBar from '../molecules/SpreadsheetFormulaBar.jsx';
import SpreadsheetSheetTabs from '../molecules/SpreadsheetSheetTabs.jsx';
import SpreadsheetGrid, { getColumnLetter } from './SpreadsheetGrid.jsx';
import PptxFallbackCard from '../molecules/PptxFallbackCard.jsx';
import OpenUrlModal from '../molecules/OpenUrlModal.jsx';
import DocumentViewerModal from '../molecules/DocumentViewerModal.jsx';

export { getColumnLetter, DocumentViewerModal };

export const SOCIETY_LEDGER_SHEETS = {
  'Maintenance & Dues Ledger': [
    ['Flat', 'Wing', 'Owner Name', 'Carpet Area (sqft)', 'Quarterly Dues (₹)', 'Outstanding (₹)', 'Status', 'Last Paid Date', 'Payment Mode', 'Bank Ref'],
    ['A-101', 'Wing A', 'Sweta Sharma', 1180, 18500, 0, 'Cleared', '2026-04-05', 'UPI - HDFC', 'UPI/61029381'],
    ['A-102', 'Wing A', 'Amit Kumar', 1180, 18500, 0, 'Cleared', '2026-04-04', 'NEFT - ICICI', 'NEFT/ICIC49281'],
    ['A-201', 'Wing A', 'Vikram Malhotra', 1420, 22250, 22250, 'Pending', '2026-01-10', 'Cheque', 'CHQ-882910'],
    ['A-202', 'Wing A', 'Sneha Kulkarni', 1180, 18500, 0, 'Advance Paid', '2026-04-02', 'Net Banking', 'IMPS/992014'],
    ['A-301', 'Wing A', 'Manoj Deshpande', 1180, 18500, 0, 'Cleared', '2026-04-03', 'UPI - GPay', 'UPI/77192031'],
    ['A-302', 'Wing A', 'Pooja Iyer', 1420, 22250, 0, 'Cleared', '2026-04-06', 'NEFT', 'NEFT/HDFC22190'],
    ['B-101', 'Wing B', 'Rajesh Singhania', 1420, 22250, 44500, 'Overdue', '2025-10-14', 'Unpaid', 'NOTICE-SEND-12'],
    ['B-102', 'Wing B', 'Deepak Joshi', 1180, 18500, 0, 'Cleared', '2026-04-08', 'UPI - GPay', 'UPI/88271920'],
    ['B-201', 'Wing B', 'Kavita Rao', 1180, 18500, 0, 'Cleared', '2026-04-01', 'UPI - PhonePe', 'UPI/44910283'],
    ['B-202', 'Wing B', 'Rohan Mehta', 1420, 22250, 0, 'Advance Paid', '2026-04-03', 'RTGS', 'RTGS/SBIN00291'],
    ['B-301', 'Wing B', 'Suresh Gokhale', 1180, 18500, 0, 'Cleared', '2026-04-05', 'UPI - Paytm', 'UPI/33819204'],
    ['B-302', 'Wing B', 'Alok Srivastava', 1420, 22250, 22250, 'Pending', '2026-01-14', 'Cheque Pending', 'CHQ-552910'],
    ['C-101', 'Wing C', 'Ananya Deshmukh', 1180, 18500, 0, 'Cleared', '2026-04-06', 'NEFT', 'NEFT/AXIS88271'],
    ['C-102', 'Wing C', 'Manish Agarwal', 1420, 22250, 22250, 'Pending', '2026-01-15', 'Cheque Pending', 'CHQ-110293'],
    ['C-201', 'Wing C', 'Pooja Patil', 1180, 18500, 0, 'Cleared', '2026-04-07', 'UPI - Paytm', 'UPI/77281902'],
    ['C-202', 'Wing C', 'Dr. Subhash Sen', 1420, 22250, 0, 'Cleared', '2026-04-02', 'Net Banking', 'IMPS/882719'],
    ['C-301', 'Wing C', 'Gaurav Bansal', 1180, 18500, 0, 'Cleared', '2026-04-04', 'UPI - BHIM', 'UPI/11293845'],
    ['C-302', 'Wing C', 'Divya Nair', 1420, 22250, 0, 'Advance Paid', '2026-03-30', 'RTGS', 'RTGS/KKBK11928'],
    ['D-101', 'Wing D', 'Karan Chawla', 1180, 18500, 0, 'Cleared', '2026-04-05', 'UPI - BHIM', 'UPI/99182374'],
    ['D-102', 'Wing D', 'Sunita Nair', 1420, 22250, 0, 'Cleared', '2026-04-09', 'NEFT', 'NEFT/KKBK99281'],
    ['D-201', 'Wing D', 'Harish Patel', 1180, 18500, 18500, 'Pending', '2026-01-12', 'Unpaid', 'REMINDER-01'],
    ['D-202', 'Wing D', 'Prakash Jain', 1420, 22250, 0, 'Advance Paid', '2026-03-28', 'RTGS', 'RTGS/HDFC99182'],
    ['D-301', 'Wing D', 'Nitin Kulkarni', 1180, 18500, 0, 'Cleared', '2026-04-07', 'UPI - GPay', 'UPI/99201834'],
    ['D-302', 'Wing D', 'Archana Varma', 1420, 22250, 44500, 'Overdue', '2025-10-18', 'Unpaid', 'NOTICE-SEND-14']
  ],
  'Vendor AMC & Contracts': [
    ['Service Domain', 'Vendor / Agency', 'Contract Ref', 'Monthly Retainer (₹)', 'Annual Value (₹)', 'Billing Cycle', 'GSTIN', 'SLA Status', 'Valid Till'],
    ['Boom Barriers & FastTag', 'Park+ Technologies Pvt Ltd', 'AMC-2025-PKP', 6250, 75000, 'Quarterly', '07AAECP1234F1Z5', 'Active SLA 99.4%', '2027-03-31'],
    ['Elevator Maintenance (8 Lifts)', 'Schindler India Pvt Ltd', 'AMC-2025-SCH', 38500, 462000, 'Monthly', '27AAACS1829B1Z2', 'Active (Comprehensive)', '2026-12-31'],
    ['Security Services (12 Guards)', 'Apex Shield Facilities', 'SEC-2025-APX', 185000, 2220000, 'Monthly', '27AAHFA8829C1Z4', 'Active (24x7 Coverage)', '2027-03-31'],
    ['Housekeeping & Cleaning', 'CleanPro Environmental', 'HK-2025-CLN', 125000, 1500000, 'Monthly', '27AAZFC4491D1Z8', 'Active (Materials Incl)', '2027-03-31'],
    ['Solar Rooftop O&M (100 kWp)', 'Urja Solar Solutions LLP', 'SLR-2025-URJ', 14500, 174000, 'Quarterly', '27AAEFU7718E1Z1', 'Active (Yield Monitored)', '2026-09-30'],
    ['Diesel Generator (380 kVA)', 'Sterling Generators Ltd', 'DG-2025-STR', 9500, 114000, 'Bimonthly', '27AAACS9920F1Z3', 'Active (Semi-Comprehensive)', '2026-11-30'],
    ['Fire Safety & Hydrant System', 'Safeguard Fire Tech', 'FIR-2025-SFG', 11000, 132000, 'Quarterly', '27AAGCS5519G1Z7', 'Active (NOC Valid)', '2027-01-31'],
    ['STP / WTP Plant Operations', 'EnviroClean Water Labs', 'WTR-2025-ENV', 28000, 336000, 'Monthly', '27AABCE3321H1Z9', 'Active (Bi-Weekly Tests)', '2027-02-28'],
    ['Pest Control & Fogging', 'PestStop Solutions', 'PST-2025-PSS', 7200, 86400, 'Monthly', '27AALCP1092J1Z6', 'Active (Bi-Monthly Spray)', '2026-10-31'],
    ['Swimming Pool Maintenance', 'AquaPure Systems', 'POL-2025-AQS', 12000, 144000, 'Monthly', '27AAKFA4910K1Z2', 'Active (Daily Chlorination)', '2027-03-31']
  ],
  'Bank Reconciliation & Reserves': [
    ['Account Head', 'Bank Name', 'Account Number', 'Type', 'Book Balance (₹)', 'Bank Statement Balance (₹)', 'Variance (₹)', 'Yield / Rate %', 'Audit Status'],
    ['Operating Maintenance A/c', 'HDFC Bank Ltd', '50200049182710', 'Current A/c', 4285190, 4285190, 0, '0.00%', 'Reconciled Daily'],
    ['Sinking Fund FD #1', 'State Bank of India', '39281729011', 'Term Deposit', 8500000, 8500000, 0, '7.25%', 'Auto-Rollover Active'],
    ['Sinking Fund FD #2', 'State Bank of India', '39281729022', 'Term Deposit', 6500000, 6500000, 0, '7.25%', 'Maturity 15-Jan-2027'],
    ['Major Repairs & Painting Reserve', 'ICICI Bank Ltd', '102901582910', 'Term Deposit', 4800000, 4800000, 0, '7.10%', 'Restricted Reserve'],
    ['Solar Rooftop Generation Escrow', 'Axis Bank Ltd', '92002004819201', 'Escrow A/c', 384500, 384500, 0, '3.50%', 'MSEDCL Credit Linked'],
    ['Water Tanker Advance Wallet', 'HDFC Bank Ltd', '50200088192014', 'Sub-Ledger', 195000, 195000, 0, '0.00%', 'Prepaid Supplier Pool']
  ],
  'CapEx & Sinking Fund 2026': [
    ['Project / Capital Asset', 'Lead In-Charge', 'Approved Budget (₹)', 'Disbursed to Date (₹)', 'Remaining Balance (₹)', 'Execution Stage', 'Target Completion'],
    ['EV Charging Infrastructure Phase 1', 'Amit Kumar (Tech Lead)', 450000, 320000, 130000, '75% Installed', '30-Apr-2026'],
    ['Clubhouse Waterproofing & Coating', 'Rajesh Singhania', 680000, 680000, 0, '100% Completed', '15-Mar-2026'],
    ['CCTV AI Surveillance Enhancement', 'Deepak Joshi', 320000, 140000, 180000, '45% In Progress', '15-May-2026'],
    ['STP High-Pressure Pump Overhaul', 'Sunita Nair', 240000, 240000, 0, '100% Certified', '28-Feb-2026'],
    ['External Facade Safety Netting', 'Vikram Malhotra', 550000, 150000, 400000, '30% Work in Progress', '30-Jun-2026'],
    ['Gym & Fitness Center Refurbishment', 'Kavita Rao', 180000, 95000, 85000, '50% In Progress', '10-May-2026']
  ]
};

export const IN_PORTAL_PRESETS = [
  {
    id: 'workflow_ppt',
    title: 'Enterprise Workflow & Project Lifecycle Presentation',
    type: 'PPT',
    category: 'Governance & Architecture',
    url: '/workflow_presentation.html',
    downloadUrl: '/Majestique_Euriska_Workflow_Engine_Presentation.pptx',
    downloadLabel: 'Download .pptx',
    description: '10-State transition model, Committee approval gates, milestones & operational architecture.'
  },
  {
    id: 'forensic_audit_pdf',
    title: 'Builder Accounts Forensic Audit Full Dossier',
    type: 'PDF',
    category: 'Audit & Legal',
    url: '/Majestique_Euriska_Builder_Forensic_Audit_Full_Dossier.pdf',
    downloadUrl: '/Majestique_Euriska_Builder_Forensic_Audit_Full_Dossier.pdf',
    downloadLabel: 'Download .pdf',
    description: 'Comprehensive financial reconciliation by CA Hardik Mehta: corpus fund, common dues, and 47 defects.'
  },
  {
    id: 'society_accounts_xlsx',
    title: 'Society Master Financial & Maintenance Ledger (FY 2026-27)',
    type: 'XLSX',
    category: 'Finance & Accounts',
    downloadUrl: '#download-xlsx',
    downloadLabel: 'Download .xlsx',
    description: 'Verified multi-sheet spreadsheet: Flat maintenance dues, Vendor AMCs, Bank reconciliation, and Reserve funds.',
    isSpreadsheet: true,
    sheetNames: Object.keys(SOCIETY_LEDGER_SHEETS),
    sheetsData: SOCIETY_LEDGER_SHEETS,
    activeSheet: 'Maintenance & Dues Ledger'
  }
];

/**
 * InPortalDocumentViewer Master Organism
 * Composes atomic components to provide unified in-portal document viewing.
 */
export default function InPortalDocumentViewer({ initialDocId = 'workflow_ppt' }) {
  const [selectedDocId, setSelectedDocId] = useState(initialDocId);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(100);
  const [customDoc, setCustomDoc] = useState(null);
  const [urlModalOpen, setUrlModalOpen] = useState(false);
  const [customUrlInput, setCustomUrlInput] = useState('');

  // Spreadsheet specific state
  const [activeSheetName, setActiveSheetName] = useState('Maintenance & Dues Ledger');
  const [spreadsheetSearch, setSpreadsheetSearch] = useState('');
  const [selectedCell, setSelectedCell] = useState({ row: 0, col: 0, address: 'A1', val: '' });

  const activeDoc = useMemo(() => {
    if (customDoc && selectedDocId === 'custom') {
      return customDoc;
    }
    return IN_PORTAL_PRESETS.find(d => d.id === selectedDocId) || IN_PORTAL_PRESETS[0];
  }, [customDoc, selectedDocId]);

  // Sync active sheet name when activeDoc changes
  useEffect(() => {
    if (activeDoc.isSpreadsheet) {
      const defaultSheet = activeDoc.activeSheet || activeDoc.sheetNames?.[0] || Object.keys(activeDoc.sheetsData || {})[0];
      if (defaultSheet) {
        setActiveSheetName(defaultSheet);
      }
      setSpreadsheetSearch('');
      setSelectedCell({ row: 0, col: 0, address: 'A1', val: '' });
    }
  }, [activeDoc]);

  const handleZoomIn = () => setZoomLevel(prev => Math.min(160, prev + 15));
  const handleZoomOut = () => setZoomLevel(prev => Math.max(70, prev - 15));
  const handleResetZoom = () => setZoomLevel(100);

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const nameLower = file.name.toLowerCase();
    const isPdf = file.type === 'application/pdf' || nameLower.endsWith('.pdf');
    const isPpt = nameLower.endsWith('.ppt') || nameLower.endsWith('.pptx');
    const isHtml = nameLower.endsWith('.html') || nameLower.endsWith('.htm');
    const isXlsx = nameLower.endsWith('.xlsx') || nameLower.endsWith('.xls') || nameLower.endsWith('.csv');

    if (isXlsx) {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const data = new Uint8Array(event.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          const sheetNames = workbook.SheetNames || [];
          const sheetsData = {};
          sheetNames.forEach(sheetName => {
            const worksheet = workbook.Sheets[sheetName];
            sheetsData[sheetName] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
          });
          const initialSheet = sheetNames[0] || 'Sheet1';
          setCustomDoc({
            id: 'custom',
            title: file.name,
            type: 'XLSX',
            category: 'Uploaded Spreadsheet',
            downloadUrl: URL.createObjectURL(file),
            downloadLabel: `Download (${file.name})`,
            isCustom: true,
            isSpreadsheet: true,
            sheetNames,
            sheetsData,
            activeSheet: initialSheet
          });
          setActiveSheetName(initialSheet);
          setSelectedDocId('custom');
          setZoomLevel(100);
        } catch (err) {
          console.error("Failed to parse spreadsheet file:", err);
          alert("Could not parse spreadsheet file: " + err.message);
        }
      };
      reader.readAsArrayBuffer(file);
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setCustomDoc({
      id: 'custom',
      title: file.name,
      type: isPdf ? 'PDF' : isPpt ? 'PPT' : isHtml ? 'SLIDES' : 'DOC',
      category: 'Uploaded File',
      url: objectUrl,
      downloadUrl: objectUrl,
      downloadLabel: `Download (${file.name})`,
      isCustom: true,
      isPptxBinary: isPpt
    });
    setSelectedDocId('custom');
    setZoomLevel(100);
  };

  const handleOpenUrl = (e) => {
    e.preventDefault();
    if (!customUrlInput.trim()) return;
    const url = customUrlInput.trim();
    const isPdf = url.toLowerCase().includes('.pdf');
    setCustomDoc({
      id: 'custom',
      title: url.split('/').pop()?.split('?')[0] || 'Web Document',
      type: isPdf ? 'PDF' : 'WEB',
      category: 'External Resource',
      url: url,
      downloadUrl: url,
      downloadLabel: 'Open Link',
      isCustom: true
    });
    setSelectedDocId('custom');
    setUrlModalOpen(false);
    setCustomUrlInput('');
  };

  const toggleFullscreen = () => {
    const elem = document.getElementById('in-portal-viewer-frame');
    if (!elem) return;
    if (!document.fullscreenElement) {
      elem.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  const handleDownload = (e) => {
    if (activeDoc.isSpreadsheet && activeDoc.sheetsData) {
      e?.preventDefault();
      try {
        const wb = XLSX.utils.book_new();
        const sheetNames = activeDoc.sheetNames || Object.keys(activeDoc.sheetsData);
        sheetNames.forEach(sName => {
          const data = activeDoc.sheetsData[sName] || [];
          const ws = XLSX.utils.aoa_to_sheet(data);
          XLSX.utils.book_append_sheet(wb, ws, sName.slice(0, 31));
        });
        const cleanName = (activeDoc.title || 'Spreadsheet').replace(/[^a-zA-Z0-9_-]/g, '_');
        XLSX.writeFile(wb, `${cleanName}.xlsx`);
      } catch (err) {
        console.error("Error generating XLSX download:", err);
      }
    }
  };

  const handlePrint = () => {
    if (activeDoc.isSpreadsheet) {
      window.print();
      return;
    }

    const isPdf = activeDoc.type === 'PDF' || activeDoc.url?.toLowerCase().includes('.pdf');
    if (isPdf && activeDoc.url) {
      const printWin = window.open(activeDoc.url, '_blank');
      if (printWin) {
        printWin.focus();
        try {
          printWin.onload = () => {
            try { printWin.print(); } catch {}
          };
        } catch {}
      }
      return;
    }

    const iframe = document.getElementById('viewer-iframe');
    if (iframe?.contentWindow) {
      try {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
        return;
      } catch (err) {
        console.warn('Iframe print error, falling back:', err);
      }
    }
    window.print();
  };

  // Compute current sheet data and filtered rows
  const currentSheetRows = useMemo(() => {
    if (!activeDoc.isSpreadsheet || !activeDoc.sheetsData) return [];
    return activeDoc.sheetsData[activeSheetName] || [];
  }, [activeDoc, activeSheetName]);

  const headers = useMemo(() => {
    return currentSheetRows.length > 0 ? currentSheetRows[0] : [];
  }, [currentSheetRows]);

  const dataRows = useMemo(() => {
    return currentSheetRows.slice(1);
  }, [currentSheetRows]);

  const filteredDataRows = useMemo(() => {
    if (!spreadsheetSearch.trim()) return dataRows;
    const q = spreadsheetSearch.toLowerCase().trim();
    return dataRows.filter(row =>
      row.some(cell => String(cell || '').toLowerCase().includes(q))
    );
  }, [dataRows, spreadsheetSearch]);

  const handleCellClick = (rowIdx, colIdx, cellVal) => {
    setSelectedCell({
      row: rowIdx,
      col: colIdx,
      address: `${getColumnLetter(colIdx)}${rowIdx + 2}`,
      val: cellVal
    });
  };

  return (
    <div className="ip-viewer-root">
      {/* ── Top Header Banner (Liquid Glass) ── */}
      <div className="ip-header-banner">
        <div className="ip-header-info">
          <div className="ip-header-icon-box">
            <Eye size={22} />
          </div>
          <div>
            <h2 className="ip-header-title">
              In-Portal Document &amp; Presentation Viewer
            </h2>
            <div className="ip-header-tags">
              <span className="ip-tag-pill">
                PPT • PDF • XLSX • XLS • CSV
              </span>
              <span className="ip-header-subtitle">
                Interactive presentation slides, audit reports, and multi-sheet spreadsheets
              </span>
            </div>
          </div>
        </div>

        {/* Action Controls & Document Selector Pills */}
        <DocumentPresetSelector
          presets={IN_PORTAL_PRESETS}
          selectedDocId={selectedDocId}
          customDoc={customDoc}
          onSelectPreset={(id) => { setSelectedDocId(id); setZoomLevel(100); }}
          onSelectCustom={() => setSelectedDocId('custom')}
          onFileUpload={handleFileUpload}
          onOpenUrlModal={() => setUrlModalOpen(true)}
        />
      </div>

      {/* ── Viewer Frame Container ── */}
      <div id="in-portal-viewer-frame" className="ip-frame-container">
        {/* Top Viewer Toolbar Molecule */}
        <ViewerToolbar
          activeDoc={activeDoc}
          zoomLevel={zoomLevel}
          isFullscreen={isFullscreen}
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
          onResetZoom={handleResetZoom}
          onPrint={handlePrint}
          onDownload={handleDownload}
          onToggleFullscreen={toggleFullscreen}
        />

        {/* ── Viewport Area ── */}
        <div className={`ip-viewport ${isFullscreen ? 'ip-viewport--fullscreen' : ''}`}>
          {activeDoc.isSpreadsheet ? (
            /* ═════════════════════════════════════════════════════════════════
               SPREADSHEET VIEWER (XLSX, XLS, CSV)
               ═════════════════════════════════════════════════════════════════ */
            <div className="ip-spreadsheet-container">
              {/* Formula & Search Bar Molecule */}
              <SpreadsheetFormulaBar
                selectedCell={selectedCell}
                searchValue={spreadsheetSearch}
                onSearchChange={setSpreadsheetSearch}
                onSearchClear={() => setSpreadsheetSearch('')}
                filteredRowCount={filteredDataRows.length}
                totalRowCount={dataRows.length}
                colCount={headers.length}
              />

              {/* Sheet Navigation Tabs Molecule */}
              <SpreadsheetSheetTabs
                sheetNames={activeDoc.sheetNames || Object.keys(activeDoc.sheetsData || {})}
                sheetsData={activeDoc.sheetsData}
                activeSheetName={activeSheetName}
                onSelectSheet={(sName) => {
                  setActiveSheetName(sName);
                  setSpreadsheetSearch('');
                  setSelectedCell({ row: 0, col: 0, address: 'A1', val: activeDoc.sheetsData?.[sName]?.[1]?.[0] || '' });
                }}
              />

              {/* Spreadsheet Table Grid Organism */}
              <SpreadsheetGrid
                headers={headers}
                rows={filteredDataRows}
                selectedCell={selectedCell}
                onCellClick={handleCellClick}
                activeSheetName={activeSheetName}
              />
            </div>
          ) : activeDoc.isPptxBinary ? (
            /* ═════════════════════════════════════════════════════════════════
               RAW PPTX FALLBACK CARD MOLECULE
               ═════════════════════════════════════════════════════════════════ */
            <PptxFallbackCard
              activeDoc={activeDoc}
              onSwitchToPresentation={() => setSelectedDocId('workflow_ppt')}
            />
          ) : (
            /* ═════════════════════════════════════════════════════════════════
               STANDARD EMBEDDED IFRAME (HTML SLIDES / PDF)
               ═════════════════════════════════════════════════════════════════ */
            <div className="ip-iframe-wrap">
              <iframe
                id="viewer-iframe"
                src={activeDoc.url}
                title={activeDoc.title}
                className="ip-iframe"
                style={{ width: `${zoomLevel}%`, height: `${zoomLevel}%` }}
              />
            </div>
          )}
        </div>
      </div>

      {/* ── Open Web URL Modal Molecule ── */}
      <OpenUrlModal
        isOpen={urlModalOpen}
        urlInput={customUrlInput}
        onUrlInputChange={setCustomUrlInput}
        onSubmit={handleOpenUrl}
        onClose={() => setUrlModalOpen(false)}
      />
    </div>
  );
}
