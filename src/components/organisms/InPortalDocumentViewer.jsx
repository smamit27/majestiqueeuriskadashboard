import React, { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import {
  FileText, Presentation, Maximize2, Minimize2, Download,
  Printer, RefreshCw, ZoomIn, ZoomOut, ExternalLink, Eye,
  CheckCircle2, Table, FileSpreadsheet, Search, Filter,
  Layers, Check, X, FileUp
} from 'lucide-react';
import LiquidGlassCard from '../liquid-glass/LiquidGlassCard.jsx';

export function getColumnLetter(colIndex) {
  let temp = colIndex;
  let letter = '';
  while (temp >= 0) {
    letter = String.fromCharCode((temp % 26) + 65) + letter;
    temp = Math.floor(temp / 26) - 1;
  }
  return letter;
}

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
  React.useEffect(() => {
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

  // Download handler for XLSX spreadsheets or standard documents
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
    } else {
      const iframe = document.getElementById('viewer-iframe');
      if (iframe?.contentWindow) {
        iframe.contentWindow.print();
      } else {
        window.print();
      }
    }
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

  const zoomScale = zoomLevel / 100;
  const cellFontSize = `${Math.max(0.72, 0.82 * zoomScale)}rem`;
  const cellPadding = `${Math.max(6, Math.round(8 * zoomScale))}px ${Math.max(8, Math.round(12 * zoomScale))}px`;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%' }}>
      {/* ── Liquid Glass Header Banner ── */}
      <LiquidGlassCard
        variant="society"
        style={{
          padding: '22px 26px',
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '18px'
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '6px' }}>
            <div style={{
              background: 'linear-gradient(135deg, #0d9488 0%, #059669 100%)',
              color: '#ffffff',
              padding: '9px',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 14px rgba(13,148,136,0.35)'
            }}>
              <Eye size={22} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.42rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em' }}>
                In-Portal Document &amp; Presentation Viewer
              </h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '3px' }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 800, padding: '2px 8px', borderRadius: '12px', background: 'rgba(13,148,136,0.12)', color: '#0f766e' }}>
                  PPT • PDF • XLSX • XLS • CSV
                </span>
                <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                  Interactive presentation slides, audit reports, and multi-sheet spreadsheets
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Action Controls & Document Selector Pills */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
          {IN_PORTAL_PRESETS.map(docItem => {
            const isSelected = selectedDocId === docItem.id;
            let icon = <FileText size={15} color={isSelected ? '#0d9488' : '#64748b'} />;
            if (docItem.type === 'PPT') {
              icon = <Presentation size={15} color={isSelected ? '#d97706' : '#64748b'} />;
            } else if (docItem.type === 'XLSX') {
              icon = <Table size={15} color={isSelected ? '#059669' : '#64748b'} />;
            }

            return (
              <button
                key={docItem.id}
                onClick={() => { setSelectedDocId(docItem.id); setZoomLevel(100); }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '9px 15px',
                  borderRadius: '12px',
                  fontSize: '0.83rem',
                  fontWeight: isSelected ? 700 : 500,
                  border: isSelected
                    ? docItem.type === 'XLSX' ? '1.5px solid #059669' : docItem.type === 'PPT' ? '1.5px solid #d97706' : '1.5px solid #0d9488'
                    : '1px solid rgba(203,213,225,0.7)',
                  background: isSelected
                    ? docItem.type === 'XLSX' ? '#f0fdf4' : docItem.type === 'PPT' ? '#fffbeb' : '#f0fdfa'
                    : '#ffffff',
                  color: isSelected
                    ? docItem.type === 'XLSX' ? '#047857' : docItem.type === 'PPT' ? '#b45309' : '#0d9488'
                    : '#475569',
                  cursor: 'pointer',
                  transition: 'all 0.18s ease',
                  boxShadow: isSelected ? '0 4px 12px rgba(0,0,0,0.06)' : 'none'
                }}
              >
                {icon}
                <span>{docItem.type}: {docItem.title.split(' ')[0]} {docItem.title.split(' ')[1]}…</span>
              </button>
            );
          })}

          {customDoc && (
            <button
              onClick={() => setSelectedDocId('custom')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '9px 15px',
                borderRadius: '12px',
                fontSize: '0.83rem',
                fontWeight: selectedDocId === 'custom' ? 700 : 500,
                border: selectedDocId === 'custom' ? '1.5px solid #0d9488' : '1px solid #cbd5e1',
                background: selectedDocId === 'custom' ? '#f0fdfa' : '#ffffff',
                color: selectedDocId === 'custom' ? '#0d9488' : '#475569',
                cursor: 'pointer'
              }}
            >
              {customDoc.type === 'XLSX' ? <FileSpreadsheet size={15} color="#059669" /> : <FileText size={15} color="#0d9488" />}
              <span>{customDoc.type}: {customDoc.title.slice(0, 16)}…</span>
            </button>
          )}

          {/* Upload Local File Button */}
          <label
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '7px',
              padding: '9px 15px',
              borderRadius: '12px',
              fontSize: '0.83rem',
              fontWeight: 600,
              border: '1.5px dashed #0d9488',
              background: 'rgba(240,253,250,0.85)',
              color: '#0d9488',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
            title="Upload any PDF, XLSX, XLS, CSV or Presentation to view in-portal"
          >
            <FileUp size={15} />
            <span>Open File (PPT/PDF/XLSX)</span>
            <input
              type="file"
              accept=".pdf,.html,.htm,.txt,.png,.jpg,.jpeg,.webp,.pptx,.ppt,.xlsx,.xls,.csv"
              onChange={handleFileUpload}
              style={{ display: 'none' }}
            />
          </label>

          {/* Open Web URL Button */}
          <button
            onClick={() => setUrlModalOpen(true)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '9px 14px',
              borderRadius: '12px',
              fontSize: '0.83rem',
              fontWeight: 600,
              border: '1px solid #cbd5e1',
              background: '#ffffff',
              color: '#475569',
              cursor: 'pointer'
            }}
            title="Open document via web URL"
          >
            <ExternalLink size={14} />
            <span>Open URL</span>
          </button>
        </div>
      </LiquidGlassCard>

      {/* ── Viewer Frame Container ── */}
      <div
        id="in-portal-viewer-frame"
        style={{
          background: '#0f172a',
          borderRadius: '18px',
          border: '1px solid #334155',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 50px rgba(0,0,0,0.22)'
        }}
      >
        {/* Top Viewer Toolbar */}
        <div style={{
          background: '#090e1a',
          padding: '12px 18px',
          borderBottom: '1px solid #1e293b',
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '12px',
          color: '#ffffff'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{
              background: activeDoc.type === 'XLSX' ? '#059669' : activeDoc.type === 'PPT' ? '#d97706' : '#0d9488',
              color: '#ffffff',
              padding: '3px 10px',
              borderRadius: '8px',
              fontSize: '0.74rem',
              fontWeight: 800,
              letterSpacing: '0.04em'
            }}>
              {activeDoc.type}
            </span>
            <span style={{ fontSize: '0.92rem', fontWeight: 700, color: '#f8fafc' }}>
              {activeDoc.title}
            </span>
          </div>

          {/* Controls: Zoom, Print, Download, Fullscreen */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', background: '#1e293b', borderRadius: '10px', padding: '3px 8px', border: '1px solid #334155' }}>
              <button
                onClick={handleZoomOut}
                title="Zoom Out"
                style={{ background: 'none', border: 'none', color: '#94a3b8', padding: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
              >
                <ZoomOut size={15} />
              </button>
              <span style={{ fontSize: '0.78rem', color: '#e2e8f0', minWidth: '44px', textAlign: 'center', fontWeight: 600 }}>
                {zoomLevel}%
              </span>
              <button
                onClick={handleZoomIn}
                title="Zoom In"
                style={{ background: 'none', border: 'none', color: '#94a3b8', padding: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
              >
                <ZoomIn size={15} />
              </button>
              <button
                onClick={handleResetZoom}
                title="Reset Zoom"
                style={{ background: 'none', border: 'none', color: '#94a3b8', padding: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
              >
                <RefreshCw size={12} />
              </button>
            </div>

            <button
              onClick={handlePrint}
              title="Print Document"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                background: '#1e293b',
                border: '1px solid #334155',
                color: '#e2e8f0',
                padding: '7px 12px',
                borderRadius: '10px',
                fontSize: '0.78rem',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              <Printer size={14} /> Print
            </button>

            {activeDoc.isSpreadsheet ? (
              <button
                onClick={handleDownload}
                title="Download Original"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                  border: 'none',
                  color: '#ffffff',
                  padding: '7px 14px',
                  borderRadius: '10px',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(5,150,105,0.3)'
                }}
              >
                <Download size={14} /> {activeDoc.downloadLabel || 'Download .xlsx'}
              </button>
            ) : (
              <a
                href={activeDoc.downloadUrl}
                download
                title="Download Original"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: 'linear-gradient(135deg, #0d9488 0%, #0f766e 100%)',
                  border: 'none',
                  color: '#ffffff',
                  padding: '7px 14px',
                  borderRadius: '10px',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  textDecoration: 'none',
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(13,148,136,0.3)'
                }}
              >
                <Download size={14} /> {activeDoc.downloadLabel}
              </a>
            )}

            <button
              onClick={toggleFullscreen}
              title="Toggle Fullscreen"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                background: '#1e293b',
                border: '1px solid #334155',
                color: '#e2e8f0',
                padding: '7px 10px',
                borderRadius: '10px',
                cursor: 'pointer'
              }}
            >
              {isFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
            </button>
          </div>
        </div>

        {/* ── Viewport Area ── */}
        <div style={{
          width: '100%',
          height: isFullscreen ? 'calc(100vh - 60px)' : '78vh',
          minHeight: '620px',
          background: '#0b1329',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative'
        }}>
          {activeDoc.isSpreadsheet ? (
            /* ═════════════════════════════════════════════════════════════════
               SPREADSHEET VIEWER (XLSX, XLS, CSV)
               ═════════════════════════════════════════════════════════════════ */
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%', background: '#ffffff' }}>
              {/* Spreadsheet Formula & Search Bar */}
              <div style={{
                background: '#f8fafc',
                borderBottom: '1px solid #e2e8f0',
                padding: '8px 16px',
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: '280px' }}>
                  {/* Active Cell Address */}
                  <div style={{
                    background: '#059669',
                    color: '#ffffff',
                    padding: '4px 10px',
                    borderRadius: '6px',
                    fontSize: '0.78rem',
                    fontWeight: 800,
                    fontFamily: 'monospace',
                    minWidth: '42px',
                    textAlign: 'center',
                    boxShadow: '0 2px 6px rgba(5,150,105,0.2)'
                  }}>
                    {selectedCell.address}
                  </div>

                  {/* Formula Bar Display */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    background: '#ffffff',
                    border: '1px solid #cbd5e1',
                    borderRadius: '8px',
                    padding: '4px 10px',
                    flex: 1,
                    gap: '6px'
                  }}>
                    <span style={{ fontSize: '0.76rem', fontWeight: 800, color: '#94a3b8', fontStyle: 'italic' }}>fx</span>
                    <input
                      type="text"
                      readOnly
                      value={String(selectedCell.val ?? '')}
                      placeholder="Select any cell to inspect value or formula"
                      style={{
                        border: 'none',
                        outline: 'none',
                        width: '100%',
                        fontSize: '0.82rem',
                        color: '#1e293b',
                        background: 'transparent'
                      }}
                    />
                  </div>
                </div>

                {/* Search & Filter within current sheet */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{
                    position: 'relative',
                    display: 'flex',
                    alignItems: 'center'
                  }}>
                    <Search size={14} style={{ position: 'absolute', left: '10px', color: '#94a3b8' }} />
                    <input
                      type="text"
                      value={spreadsheetSearch}
                      onChange={e => setSpreadsheetSearch(e.target.value)}
                      placeholder="Filter sheet rows…"
                      style={{
                        padding: '5px 28px 5px 30px',
                        fontSize: '0.8rem',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        outline: 'none',
                        background: '#ffffff',
                        color: '#0f172a',
                        width: '180px'
                      }}
                    />
                    {spreadsheetSearch && (
                      <button
                        onClick={() => setSpreadsheetSearch('')}
                        style={{ position: 'absolute', right: '6px', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '2px' }}
                      >
                        <X size={13} />
                      </button>
                    )}
                  </div>

                  <span style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 600 }}>
                    {filteredDataRows.length} of {dataRows.length} rows • {headers.length} cols
                  </span>
                </div>
              </div>

              {/* Sheet Navigation Tabs Bar (Excel-Style) */}
              <div style={{
                background: '#f1f5f9',
                borderBottom: '1px solid #cbd5e1',
                padding: '4px 12px 0 12px',
                display: 'flex',
                alignItems: 'flex-end',
                gap: '4px',
                overflowX: 'auto'
              }}>
                {(activeDoc.sheetNames || Object.keys(activeDoc.sheetsData || {})).map(sName => {
                  const isActive = activeSheetName === sName;
                  const rowCount = (activeDoc.sheetsData?.[sName]?.length || 1) - 1;
                  return (
                    <button
                      key={sName}
                      onClick={() => {
                        setActiveSheetName(sName);
                        setSpreadsheetSearch('');
                        setSelectedCell({ row: 0, col: 0, address: 'A1', val: activeDoc.sheetsData?.[sName]?.[1]?.[0] || '' });
                      }}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '7px 14px',
                        fontSize: '0.8rem',
                        fontWeight: isActive ? 700 : 500,
                        color: isActive ? '#065f46' : '#475569',
                        background: isActive ? '#ffffff' : 'transparent',
                        borderTop: isActive ? '2px solid #059669' : '2px solid transparent',
                        borderLeft: isActive ? '1px solid #cbd5e1' : 'none',
                        borderRight: isActive ? '1px solid #cbd5e1' : 'none',
                        borderBottom: isActive ? '1px solid #ffffff' : 'none',
                        borderTopLeftRadius: '6px',
                        borderTopRightRadius: '6px',
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                        marginBottom: isActive ? '-1px' : '0',
                        transition: 'all 0.12s ease'
                      }}
                    >
                      <Table size={13} color={isActive ? '#059669' : '#94a3b8'} />
                      <span>{sName}</span>
                      <span style={{
                        fontSize: '0.68rem',
                        padding: '1px 5px',
                        borderRadius: '10px',
                        background: isActive ? '#dcfce7' : '#e2e8f0',
                        color: isActive ? '#166534' : '#64748b'
                      }}>
                        {rowCount}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Scrollable Spreadsheet Grid */}
              <div style={{
                flex: 1,
                overflow: 'auto',
                position: 'relative',
                background: '#ffffff'
              }}>
                <table style={{
                  borderCollapse: 'collapse',
                  width: 'max-content',
                  minWidth: '100%',
                  fontSize: cellFontSize,
                  fontFamily: 'Inter, system-ui, -apple-system, sans-serif'
                }}>
                  <thead>
                    {/* Column Letters Row (A, B, C...) */}
                    <tr style={{ background: '#f8fafc', position: 'sticky', top: 0, zIndex: 10 }}>
                      <th style={{
                        width: '44px',
                        minWidth: '44px',
                        padding: '5px',
                        background: '#e2e8f0',
                        borderBottom: '1px solid #cbd5e1',
                        borderRight: '1px solid #cbd5e1',
                        color: '#64748b',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        textAlign: 'center',
                        position: 'sticky',
                        left: 0,
                        zIndex: 20
                      }}>
                        #
                      </th>
                      {headers.map((_, colIdx) => (
                        <th
                          key={colIdx}
                          style={{
                            padding: '4px 10px',
                            background: '#f1f5f9',
                            borderBottom: '1px solid #cbd5e1',
                            borderRight: '1px solid #e2e8f0',
                            color: '#64748b',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            textAlign: 'center',
                            letterSpacing: '0.04em'
                          }}
                        >
                          {getColumnLetter(colIdx)}
                        </th>
                      ))}
                    </tr>

                    {/* Column Headers Row (Header Names) */}
                    <tr style={{ background: '#f1f5f9', position: 'sticky', top: '24px', zIndex: 9 }}>
                      <th style={{
                        padding: '8px',
                        background: '#e2e8f0',
                        borderBottom: '2px solid #cbd5e1',
                        borderRight: '1px solid #cbd5e1',
                        position: 'sticky',
                        left: 0,
                        zIndex: 20
                      }} />
                      {headers.map((colName, colIdx) => (
                        <th
                          key={colIdx}
                          style={{
                            padding: cellPadding,
                            background: '#f8fafc',
                            borderBottom: '2px solid #cbd5e1',
                            borderRight: '1px solid #e2e8f0',
                            color: '#0f172a',
                            fontWeight: 700,
                            textAlign: 'left',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          {String(colName ?? '')}
                        </th>
                      ))}
                    </tr>
                  </thead>

                  <tbody>
                    {filteredDataRows.length === 0 ? (
                      <tr>
                        <td
                          colSpan={headers.length + 1}
                          style={{
                            textAlign: 'center',
                            padding: '40px',
                            color: '#94a3b8',
                            fontSize: '0.9rem'
                          }}
                        >
                          No matching records found for "{spreadsheetSearch}"
                        </td>
                      </tr>
                    ) : (
                      filteredDataRows.map((row, rowIdx) => {
                        const originalRowIndex = rowIdx + 2; // Row 1 was headers
                        return (
                          <tr
                            key={rowIdx}
                            style={{
                              background: rowIdx % 2 === 0 ? '#ffffff' : '#fafafa',
                              transition: 'background 0.1s ease'
                            }}
                          >
                            {/* Row Number Indicator (Sticky Left) */}
                            <td style={{
                              padding: '6px 8px',
                              background: '#f1f5f9',
                              borderBottom: '1px solid #e2e8f0',
                              borderRight: '1px solid #cbd5e1',
                              color: '#64748b',
                              fontSize: '0.72rem',
                              fontWeight: 600,
                              textAlign: 'center',
                              position: 'sticky',
                              left: 0,
                              zIndex: 5
                            }}>
                              {rowIdx + 1}
                            </td>

                            {/* Data Cells */}
                            {headers.map((_, colIdx) => {
                              const cellVal = row[colIdx];
                              const isSelected = selectedCell.row === rowIdx && selectedCell.col === colIdx;
                              const cellAddr = `${getColumnLetter(colIdx)}${rowIdx + 1}`;
                              const valStr = String(cellVal ?? '');

                              // Special styling for status badges
                              let badgeStyle = null;
                              if (valStr === 'Cleared') {
                                badgeStyle = { background: '#dcfce7', color: '#15803d' };
                              } else if (valStr === 'Pending' || valStr === 'Cheque Pending') {
                                badgeStyle = { background: '#fef3c7', color: '#b45309' };
                              } else if (valStr === 'Overdue') {
                                badgeStyle = { background: '#fee2e2', color: '#b91c1c' };
                              } else if (valStr.includes('Advance')) {
                                badgeStyle = { background: '#e0f2fe', color: '#0369a1' };
                              } else if (valStr.includes('Active')) {
                                badgeStyle = { background: '#ecfdf5', color: '#047857' };
                              }

                              return (
                                <td
                                  key={colIdx}
                                  onClick={() => setSelectedCell({
                                    row: rowIdx,
                                    col: colIdx,
                                    address: cellAddr,
                                    val: cellVal
                                  })}
                                  style={{
                                    padding: cellPadding,
                                    borderBottom: '1px solid #e2e8f0',
                                    borderRight: '1px solid #f1f5f9',
                                    outline: isSelected ? '2px solid #059669' : 'none',
                                    outlineOffset: '-2px',
                                    background: isSelected ? '#ecfdf5' : 'inherit',
                                    color: '#1e293b',
                                    whiteSpace: 'nowrap',
                                    cursor: 'cell',
                                    fontFamily: typeof cellVal === 'number' ? 'monospace' : 'inherit'
                                  }}
                                >
                                  {badgeStyle ? (
                                    <span style={{
                                      padding: '2px 8px',
                                      borderRadius: '12px',
                                      fontSize: '0.74rem',
                                      fontWeight: 700,
                                      ...badgeStyle
                                    }}>
                                      {valStr}
                                    </span>
                                  ) : typeof cellVal === 'number' ? (
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
              </div>

              {/* Status footer for spreadsheet */}
              <div style={{
                background: '#f8fafc',
                borderTop: '1px solid #e2e8f0',
                padding: '6px 16px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: '0.74rem',
                color: '#64748b'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: '#059669' }} />
                  <span>Ready • In-Portal Multi-Sheet Spreadsheet Engine</span>
                </div>
                <div>
                  Active Sheet: <strong>{activeSheetName}</strong>
                </div>
              </div>
            </div>
          ) : activeDoc.isPptxBinary ? (
            /* ═════════════════════════════════════════════════════════════════
               RAW PPTX FALLBACK MODAL
               ═════════════════════════════════════════════════════════════════ */
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              width: '100%',
              padding: '20px'
            }}>
              <div style={{
                background: '#0f172a',
                border: '1px solid #334155',
                borderRadius: '18px',
                padding: '36px',
                maxWidth: '640px',
                textAlign: 'center',
                color: '#ffffff',
                boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
                margin: '20px'
              }}>
                <div style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '16px',
                  background: 'rgba(217,119,6,0.15)',
                  color: '#d97706',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px auto'
                }}>
                  <Presentation size={36} />
                </div>
                <h3 style={{ margin: '0 0 10px 0', fontSize: '1.25rem', fontWeight: 800 }}>
                  {activeDoc.title}
                </h3>
                <p style={{ fontSize: '0.88rem', color: '#94a3b8', lineHeight: 1.6, marginBottom: '20px' }}>
                  You have loaded a PowerPoint presentation file. To view presentations directly inside the portal without external software:
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', textAlign: 'left', background: '#1e293b', padding: '16px', borderRadius: '12px', marginBottom: '24px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.84rem', color: '#e2e8f0' }}>
                    <CheckCircle2 size={16} color="#0d9488" />
                    <span><strong>Native Web Presentation:</strong> Check the pre-bundled <em>Enterprise Workflow Presentation</em> above.</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.84rem', color: '#e2e8f0' }}>
                    <CheckCircle2 size={16} color="#0d9488" />
                    <span><strong>Spreadsheets (XLSX/CSV):</strong> Check the live <em>Society Master Financial &amp; Maintenance Ledger</em>.</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.84rem', color: '#e2e8f0' }}>
                    <CheckCircle2 size={16} color="#0d9488" />
                    <span><strong>Download &amp; Edit:</strong> Download the file anytime for Microsoft PowerPoint or Keynote.</span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                  <button
                    onClick={() => setSelectedDocId('workflow_ppt')}
                    style={{
                      padding: '10px 18px',
                      borderRadius: '10px',
                      background: '#0d9488',
                      border: 'none',
                      color: '#ffffff',
                      fontWeight: 700,
                      fontSize: '0.84rem',
                      cursor: 'pointer'
                    }}
                  >
                    View Workflow HTML Slides
                  </button>
                  <a
                    href={activeDoc.downloadUrl}
                    download
                    style={{
                      padding: '10px 18px',
                      borderRadius: '10px',
                      background: '#334155',
                      color: '#ffffff',
                      textDecoration: 'none',
                      fontWeight: 600,
                      fontSize: '0.84rem',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <Download size={14} /> Download File
                  </a>
                </div>
              </div>
            </div>
          ) : (
            /* ═════════════════════════════════════════════════════════════════
               STANDARD EMBEDDED IFRAME (HTML SLIDES / PDF)
               ═════════════════════════════════════════════════════════════════ */
            <div style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              overflow: 'auto',
              background: '#0b1329'
            }}>
              <iframe
                id="viewer-iframe"
                src={activeDoc.url}
                title={activeDoc.title}
                style={{
                  width: `${zoomLevel}%`,
                  height: `${zoomLevel}%`,
                  minHeight: '100%',
                  minWidth: '100%',
                  border: 'none',
                  borderRadius: '0',
                  background: '#ffffff'
                }}
              />
            </div>
          )}
        </div>
      </div>

      {/* ── Open Web URL Modal ── */}
      {urlModalOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15,23,42,0.7)',
          backdropFilter: 'blur(6px)',
          zIndex: 10000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}
        onClick={() => setUrlModalOpen(false)}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '18px',
              maxWidth: '520px',
              width: '100%',
              padding: '26px',
              boxShadow: '0 25px 60px rgba(0,0,0,0.25)'
            }}
            onClick={e => e.stopPropagation()}
          >
            <h3 style={{ margin: '0 0 8px 0', fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>
              Open Document from Web URL
            </h3>
            <p style={{ margin: '0 0 18px 0', fontSize: '0.85rem', color: '#64748b', lineHeight: 1.5 }}>
              Enter any accessible URL to a PDF, web document, or presentation to display it seamlessly inside this portal.
            </p>
            <form onSubmit={handleOpenUrl}>
              <input
                type="url"
                value={customUrlInput}
                onChange={e => setCustomUrlInput(e.target.value)}
                placeholder="https://example.com/document.pdf"
                required
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  borderRadius: '10px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.9rem',
                  outline: 'none',
                  boxSizing: 'border-box',
                  marginBottom: '18px'
                }}
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setUrlModalOpen(false)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '10px',
                    background: '#f1f5f9',
                    border: 'none',
                    color: '#475569',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '8px 18px',
                    borderRadius: '10px',
                    background: '#0d9488',
                    border: 'none',
                    color: '#ffffff',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  Open in Viewer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ── In-Portal Document Modal (Helper for Document Vault and Workflow Manager) ─
export function DocumentViewerModal({ documentUrl, documentTitle, documentType = 'PDF', onClose }) {
  if (!documentUrl) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10000,
        background: 'rgba(15,23,42,0.75)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '1100px',
          height: '90vh',
          background: '#ffffff',
          borderRadius: '18px',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 25px 80px rgba(0,0,0,0.3)'
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{
          padding: '14px 20px',
          background: '#0f172a',
          color: '#ffffff',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{
              background: documentType === 'XLSX' ? '#059669' : documentType === 'PPT' ? '#d97706' : '#0d9488',
              padding: '3px 8px',
              borderRadius: '6px',
              fontSize: '0.72rem',
              fontWeight: 800
            }}>
              {documentType}
            </span>
            <span style={{ fontSize: '0.95rem', fontWeight: 700 }}>
              {documentTitle}
            </span>
          </div>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <a
              href={documentUrl}
              download
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                background: '#0d9488',
                color: '#fff',
                padding: '6px 12px',
                borderRadius: '8px',
                fontSize: '0.76rem',
                fontWeight: 700,
                textDecoration: 'none'
              }}
            >
              <Download size={13} /> Download
            </a>
            <button
              onClick={onClose}
              style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '1.2rem' }}
            >
              ✕
            </button>
          </div>
        </div>

        <iframe
          src={documentUrl}
          title={documentTitle}
          style={{ width: '100%', height: '100%', border: 'none' }}
        />
      </div>
    </div>
  );
}
