import { useCallback, useEffect, useMemo, useState } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db, ensureFirebaseSession, isFirebaseConfigured } from '../../firebase.js';
import { initialParkingData, OPEN_PARKING_SLOTS, isParkingSlotPending } from '../../data/parkingAllotmentData.js';
import LiquidGlassCard from '../liquid-glass/LiquidGlassCard.jsx';
import ParkingBlueprintMap from './ParkingBlueprintMap.jsx';
import Parking3DView from './Parking3DView.jsx';
import PendingParkingSlotsCard from './PendingParkingSlotsCard.jsx';
import './ParkingAllotmentTracker.css';


const PARKING_DOC_ID = 'a_wing_parking_v3';
const PARKING_COLLECTION = 'parkingAllotments';

const STATUS_CONFIG = {
  Allotted: {
    bg: '#d1fae5',
    color: '#065f46',
    border: '#6ee7b7',
    label: 'Open Parking'
  },
  Covered: {
    bg: '#dbeafe',
    color: '#1e40af',
    border: '#93c5fd',
    label: 'Covered Parking'
  },
  Refuge: {
    bg: '#f3f4f6',
    color: '#4b5563',
    border: '#d1d5db',
    label: 'Refuge Area'
  }
};

export default function ParkingAllotmentTracker({ isAdmin = false }) {
  const [parkingRecords, setParkingRecords] = useState(initialParkingData);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [floorFilter, setFloorFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [viewMode, setViewMode] = useState('table'); // 'table' | '2d' | '3d' | 'grid' | 'floors'
  const [selectedSlotForDetail, setSelectedSlotForDetail] = useState(null);
  const [editingFlat, setEditingFlat] = useState(null);
  const [saveStatus, setSaveStatus] = useState('');
  const [isGlobalDownloadOpen, setIsGlobalDownloadOpen] = useState(false);

  // ── Load from Firebase or Seed Data ──────────────────────────────────────
  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      try {
        if (isFirebaseConfigured && db) {
          await ensureFirebaseSession();
          const docRef = doc(db, PARKING_COLLECTION, PARKING_DOC_ID);
          const snap = await getDoc(docRef);
          if (snap.exists() && snap.data()?.items && isMounted) {
            setParkingRecords(snap.data().items);
            setIsLoading(false);
            return;
          }
        }
      } catch (err) {
        console.warn('Could not load parking data from Firestore, using initial seed data:', err);
      }
      if (isMounted) {
        setParkingRecords(initialParkingData);
        setIsLoading(false);
      }
    }
    loadData();
    return () => { isMounted = false; };
  }, []);

  // ── Save update to Firebase ──────────────────────────────────────────────
  const handleSaveFlat = useCallback(async (updatedRecord) => {
    const updatedList = parkingRecords.map(item =>
      item.flat === updatedRecord.flat ? { ...item, ...updatedRecord } : item
    );
    setParkingRecords(updatedList);
    setEditingFlat(null);
    setSaveStatus('Saving...');

    if (isFirebaseConfigured && db) {
      try {
        await ensureFirebaseSession();
        const docRef = doc(db, PARKING_COLLECTION, PARKING_DOC_ID);
        await setDoc(docRef, {
          items: updatedList,
          updatedAt: new Date().toISOString()
        }, { merge: true });
        setSaveStatus('✓ Saved to Cloud');
        setTimeout(() => setSaveStatus(''), 3000);
      } catch (err) {
        console.error('Failed to sync parking data with Firestore:', err);
        setSaveStatus('⚠️ Saved locally (offline)');
        setTimeout(() => setSaveStatus(''), 3000);
      }
    } else {
      setSaveStatus('✓ Saved locally');
      setTimeout(() => setSaveStatus(''), 3000);
    }
  }, [parkingRecords]);

  // ── Stats Calculations ───────────────────────────────────────────────────
  const stats = useMemo(() => {
    const totalFlats = parkingRecords.length;
    const allottedFlats = parkingRecords.filter(p => p.status === 'Allotted' && p.parkingNo);
    const allottedCount = allottedFlats.length;
    const coveredCount = parkingRecords.filter(p => p.status === 'Covered').length;
    const refugeCount = parkingRecords.filter(p => p.status === 'Refuge').length;

    // Open parking slots (OP-01 to OP-60)
    const occupiedSlotMap = {};
    allottedFlats.forEach(f => {
      if (f.parkingNo) {
        occupiedSlotMap[f.parkingNo.trim().toUpperCase()] = f;
      }
    });

    const totalOpSlots = OPEN_PARKING_SLOTS.length;
    const occupiedOpSlots = Object.keys(occupiedSlotMap).length;
    const vacantOpSlots = Math.max(0, totalOpSlots - occupiedOpSlots);

    const pendingCount = parkingRecords.filter(isParkingSlotPending).length;

    return {
      totalFlats,
      allottedCount,
      coveredCount,
      refugeCount,
      pendingCount,
      totalOpSlots,
      occupiedOpSlots,
      vacantOpSlots,
      occupiedSlotMap
    };
  }, [parkingRecords]);

  // ── Dynamic Pending Flats for Card View (Derived from Covered Parking Data) ──
  const pendingFlatsForCard = useMemo(() => {
    return parkingRecords
      .filter(item => {
        if (floorFilter !== 'All' && String(item.floor) !== String(floorFilter)) {
          return false;
        }
        if (searchQuery.trim()) {
          const q = searchQuery.trim().toLowerCase();
          const match = (item.flat && item.flat.toLowerCase().includes(q)) ||
                        (item.residentName && item.residentName.toLowerCase().includes(q));
          if (!match) return false;
        }
        return isParkingSlotPending(item);
      })
      .map(item => item.flat);
  }, [floorFilter, searchQuery, parkingRecords]);

  // ── Filtered Records ─────────────────────────────────────────────────────
  const filteredRecords = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return parkingRecords.filter(item => {
      if (floorFilter !== 'All' && String(item.floor) !== String(floorFilter)) {
        return false;
      }
      if (statusFilter !== 'All') {
        if (statusFilter === 'Pending') {
          if (!isParkingSlotPending(item)) return false;
        } else if (statusFilter === 'Allotted' && item.status !== 'Allotted') {
          return false;
        } else if (statusFilter === 'Covered' && item.status !== 'Covered') {
          return false;
        } else if (statusFilter === 'Refuge' && item.status !== 'Refuge') {
          return false;
        }
      }
      if (!q) return true;

      const searchableText = [
        item.flat,
        item.parkingNo,
        item.parkingType,
        item.status,
        item.remarks
      ].filter(Boolean).join(' ').toLowerCase();

      return searchableText.includes(q);
    });
  }, [parkingRecords, searchQuery, floorFilter, statusFilter]);

  // ── CSV Export ───────────────────────────────────────────────────────────
  const handleExportCSV = useCallback(() => {
    const listToExport = filteredRecords.length > 0 ? filteredRecords : parkingRecords;
    const headers = 'Flat No,Floor,Parking Slot,Parking Type,Status,Remarks\n';
    const rows = listToExport.map(p => {
      const flat = (p.flat || '').replace(/"/g, '""');
      const slot = (p.parkingNo || '').replace(/"/g, '""');
      const type = (p.parkingType || '').replace(/"/g, '""');
      const status = (p.status || '').replace(/"/g, '""');
      const rem = (p.remarks || '').replace(/"/g, '""');
      return `"${flat}",${p.floor},"${slot}","${type}","${status}","${rem}"`;
    }).join('\n');

    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', 'Majestique_Euriska_A_Wing_Parking_Allotment.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [filteredRecords, parkingRecords]);

  // ── Dedicated Print / PDF Export ─────────────────────────────────────────
  const handleExportPDF = useCallback(() => {
    const listToPrint = filteredRecords.length > 0 ? filteredRecords : parkingRecords;
    const generatedDate = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    const allottedCount = listToPrint.filter(p => p.status === 'Allotted').length;
    const coveredCount = listToPrint.filter(p => p.status === 'Covered').length;

    const printDoc = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="utf-8">
        <title>Majestique Euriska - Building "A" Parking Allotment Ledger</title>
        <style>
          * { box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
          body { margin: 0; padding: 24px; color: #0f172a; background: #ffffff; }
          .header { border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: flex-end; }
          .title { font-size: 20px; font-weight: 800; color: #0f172a; margin: 0; }
          .subtitle { font-size: 13px; color: #475569; margin-top: 4px; }
          .meta { font-size: 11px; color: #475569; text-align: right; }
          
          .summary-bar {
            display: flex;
            gap: 16px;
            margin-bottom: 16px;
            padding: 10px 14px;
            background: #f8fafc;
            border: 1px solid #cbd5e1;
            border-radius: 8px;
            font-size: 12px;
            flex-wrap: wrap;
          }
          .summary-item { font-weight: 600; color: #334155; }
          .summary-item strong { color: #0f172a; }
          
          table { width: 100%; border-collapse: collapse; font-size: 11px; }
          th { background: #f1f5f9; color: #1e293b; font-weight: 700; text-align: left; padding: 8px 10px; border: 1px solid #94a3b8; text-transform: uppercase; font-size: 10px; letter-spacing: 0.05em; }
          td { padding: 7px 10px; border: 1px solid #cbd5e1; color: #0f172a; }
          tr:nth-child(even) { background: #f8fafc; }
          
          .slot-badge {
            display: inline-block;
            padding: 3px 8px;
            border-radius: 6px;
            font-size: 11px;
            font-weight: 800;
            background: #ecfdf5;
            color: #065f46;
            border: 1px solid #a7f3d0;
            font-family: monospace;
          }
          .slot-none {
            color: #94a3b8;
            font-style: italic;
          }
          
          .footer {
            margin-top: 24px;
            border-top: 1px solid #cbd5e1;
            padding-top: 10px;
            font-size: 10px;
            color: #64748b;
            display: flex;
            justify-content: space-between;
          }
          
          @media print {
            body { padding: 0; }
            @page { margin: 1cm; size: A4 portrait; }
            thead { display: table-header-group; }
            tr { page-break-inside: avoid; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <h1 class="title">🚗 MAJESTIQUE EURISKA 'A' BUILDING CO-OP HOUSING SOCIETY LTD.</h1>
            <div class="subtitle">Reg. No: PNA/PNA (4)/HSG/(TC)/21207/2019-20 • S. No. 2, Plot No C-1, Village Mohammed Wadi, Taluka Haveli, Pune - 411060</div>
            <div style="font-size: 11px; color: #64748b; margin-top: 2px;">Official Wing A Parking Register (Flats A-101 to A-1108)</div>
          </div>
          <div class="meta">
            <div><strong>Report Date:</strong> ${generatedDate}</div>
            <div><strong>Scope:</strong> Floor: ${floorFilter} • Status: ${statusFilter} (${listToPrint.length} Flats)</div>
          </div>
        </div>

        <div class="summary-bar">
          <div class="summary-item">Total Flats: <strong>${listToPrint.length}</strong></div>
          <div>•</div>
          <div class="summary-item" style="color: #065f46;">Open Parking: <strong>${allottedCount}</strong></div>
          <div>•</div>
          <div class="summary-item" style="color: #1e40af;">Covered Parking: <strong>${coveredCount}</strong></div>
          <div>•</div>
          <div class="summary-item">Open Slots Tracked: <strong>60 (OP-01 to OP-60)</strong></div>
        </div>

        <table>
          <thead>
            <tr>
              <th style="width: 40px; text-align: center;">#</th>
              <th style="width: 100px;">Flat No</th>
              <th style="width: 80px; text-align: center;">Floor</th>
              <th style="width: 130px; text-align: center;">Parking Slot</th>
              <th style="width: 160px;">Parking Type</th>
              <th>Remarks / Record Reference</th>
            </tr>
          </thead>
          <tbody>
            ${listToPrint.map((p, index) => {
              return `
                <tr>
                  <td style="text-align: center; color: #64748b; font-weight: 600;">${index + 1}</td>
                  <td style="font-weight: 700; color: #0f172a; font-family: monospace;">${p.flat}</td>
                  <td style="text-align: center; color: #475569;">${p.floor}</td>
                  <td style="text-align: center;">
                    ${p.parkingNo ? `<span class="slot-badge">${p.parkingNo}</span>` : `<span class="slot-none">—</span>`}
                  </td>
                  <td>${p.parkingType || 'Covered Parking'}</td>
                  <td style="font-size: 10px; color: #475569;">${p.remarks || '—'}</td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>

        <div class="footer">
          <div>Majestique Euriska Co-Op Housing Society • Wing A Parking Management Register</div>
          <div>Society Authorized Copy</div>
        </div>

        <script>
          window.onload = function() {
            setTimeout(function() { window.print(); }, 250);
          };
        </script>
      </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.open();
      printWindow.document.write(printDoc);
      printWindow.document.close();
    } else {
      window.print();
    }
  }, [filteredRecords, parkingRecords, floorFilter, statusFilter]);

  // ── Floor Groups for Matrix View ─────────────────────────────────────────
  const floorGroups = useMemo(() => {
    const groups = {};
    for (let f = 1; f <= 11; f++) {
      groups[f] = parkingRecords.filter(item => item.floor === f);
    }
    return groups;
  }, [parkingRecords]);

  return (
    <div className="parking-allotment-tracker-s1">
      {/* ── Top Liquid Glass Hero Banner ── */}
      <LiquidGlassCard
        variant="operations"
        className="parking-allotment-tracker-s2"
      >
        <div className="parking-allotment-tracker-s3">
          <div className="parking-allotment-tracker-s4">
            🏢 Building "A" • Parking Allotment
          </div>
          <h2 className="parking-allotment-tracker-s5">
            Parking Allotment Roster
          </h2>
          <p className="parking-allotment-tracker-s6">
            Official records for flats <strong>A-101 to A-1108</strong> (88 units), with Open Parking allocations (OP-01 to OP-60) and Covered Parking.
          </p>
        </div>

        {/* ── KPI Metric Cards in Banner ── */}
        <div className="parking-allotment-tracker-s7">
          {[
            { label: 'Total Flats', value: stats.totalFlats, sub: 'Flats A-101 to A-1108', bg: 'rgba(255, 255, 255, 0.10)', color: '#ffffff' },
            { label: 'Pending Details', value: stats.pendingCount, sub: `${stats.pendingCount} Covered Flats Pending`, bg: 'rgba(244, 63, 94, 0.22)', color: '#fda4af', action: () => { setStatusFilter('Pending'); setViewMode('pending-card'); } },
            { label: 'Open Parking', value: stats.allottedCount, sub: '37 Official Bays', bg: 'rgba(52, 211, 153, 0.20)', color: '#6ee7b7' },
            { label: 'Covered Parking', value: stats.coveredCount, sub: '50 Flats', bg: 'rgba(96, 165, 250, 0.20)', color: '#93c5fd' },
            { label: 'Open Bays (OP)', value: `${stats.occupiedOpSlots} / ${stats.totalOpSlots}`, sub: `${stats.vacantOpSlots} Available`, bg: 'rgba(56, 189, 248, 0.20)', color: '#7dd3fc' },
          ].map(stat => (
            <div
              key={stat.label}
              onClick={stat.action || undefined}
              className="parking-allotment-tracker-s8" style={{ background: stat.bg, cursor: stat.action ? 'pointer' : 'default' }}
              onMouseEnter={e => {
                if (stat.action) {
                  e.currentTarget.style.transform = 'translateY(-3px)';
                  e.currentTarget.style.boxShadow = '0 8px 24px rgba(244, 63, 94, 0.35)';
                }
              }}
              onMouseLeave={e => {
                if (stat.action) {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 16px rgba(0, 0, 0, 0.12)';
                }
              }}
            >
              <div className="parking-allotment-tracker-s9" style={{ color: stat.color }}>
                {stat.value}
              </div>
              <div className="parking-allotment-tracker-s10">
                {stat.label}
              </div>
              <div className="parking-allotment-tracker-s11">
                {stat.sub}
              </div>
            </div>
          ))}
        </div>
      </LiquidGlassCard>

      {/* ── Frosted Controls & Filter Toolbar ── */}
      <LiquidGlassCard
        variant="default"
        className="parking-allotment-tracker-s12"
      >
        {/* Search */}
        <div className="parking-allotment-tracker-s13">
          <span className="parking-allotment-tracker-s14">🔍</span>
          <input
            type="search"
            placeholder="Search flat (e.g. A-102, 501), slot (OP-39)..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="parking-allotment-tracker-s15"
          />
        </div>

        {/* Floor selector */}
        <div className="parking-allotment-tracker-s16">
          <span className="parking-allotment-tracker-s17">
            Floor:
          </span>
          <select
            value={floorFilter}
            onChange={e => setFloorFilter(e.target.value)}
            className="parking-allotment-tracker-s18"
          >
            <option value="All">All Floors (1 to 11)</option>
            {Array.from({ length: 11 }, (_, i) => i + 1).map(f => (
              <option key={f} value={f}>Floor {f} (A-{f}01 to A-{f}08)</option>
            ))}
          </select>
        </div>

        {/* Status / Slot filter chips */}
        <div className="parking-allotment-tracker-s19">
          {[
            { id: 'All', label: 'All Flats' },
            { id: 'Pending', label: `🚗 Pending Slot Details (${stats.pendingCount})`, isSpecial: true },
            { id: 'Allotted', label: '🅿️ Open Parking (37)' },
            { id: 'Covered', label: '🏠 Covered Parking (50)' },
            { id: 'Refuge', label: '🛡️ Refuge' },
          ].map(s => {
            const active = statusFilter === s.id;
            return (
              <button
                key={s.id}
                onClick={() => setStatusFilter(s.id)}
                className="parking-allotment-tracker-s20" style={{ border: s.isSpecial ? '2px solid' : '1.5px solid', background: active 
                    ? (s.isSpecial ? 'linear-gradient(135deg, #e11d48 0%, #be123c 100%)' : 'linear-gradient(135deg, #0b2b26 0%, #164e63 100%)') 
                    : (s.isSpecial ? 'rgba(225, 29, 72, 0.08)' : 'rgba(255, 255, 255, 0.6)'), color: active 
                    ? '#ffffff' 
                    : (s.isSpecial ? '#be123c' : '#475569'), borderColor: active 
                    ? 'transparent' 
                    : (s.isSpecial ? 'rgba(225, 29, 72, 0.4)' : 'rgba(203, 213, 225, 0.9)'), boxShadow: active 
                    ? (s.isSpecial ? '0 4px 12px rgba(225, 29, 72, 0.35)' : '0 4px 12px rgba(11, 43, 38, 0.25)') 
                    : 'none' }}
              >
                {s.label}
              </button>
            );
          })}
        </div>

        {/* View mode switcher */}
        <div className="parking-allotment-tracker-s21">
          {[
            { mode: 'table', icon: '📋', label: 'Table' },
            { mode: 'pending-card', icon: '📜', label: 'Pending Slots Card & Notice' },
            { mode: '2d', icon: '🗺️', label: '2D Layout' },
            { mode: '3d', icon: '🏙️', label: '3D Model' },
            { mode: 'grid', icon: '🅿️', label: 'OP Grid' },
            { mode: 'floors', icon: '🏢', label: 'Floors' },
          ].map(v => (
            <button
              key={v.mode}
              onClick={() => setViewMode(v.mode)}
              className="parking-allotment-tracker-s22" style={{ background: viewMode === v.mode ? '#ffffff' : 'transparent', color: viewMode === v.mode ? '#0b2b26' : '#64748b', boxShadow: viewMode === v.mode ? '0 2px 8px rgba(0, 0, 0, 0.1)' : 'none' }}
            >
              {v.icon} {v.label}
            </button>
          ))}
        </div>

        {/* Action Buttons: Export CSV & Print PDF & Download Layouts */}
        <div className="parking-allotment-tracker-s23">
          {/* Download Layouts Dropdown */}
          <div className="parking-allotment-tracker-s24">
            <button
              onClick={() => setIsGlobalDownloadOpen(!isGlobalDownloadOpen)}
              className="parking-allotment-tracker-s25"
              title="Download 2D and 3D Parking Layouts"
            >
              📥 Download Layouts ▾
            </button>

            {isGlobalDownloadOpen && (
              <div className="parking-allotment-tracker-s26">
                <button
                  type="button"
                  onClick={() => {
                    setViewMode('pending-card');
                    setIsGlobalDownloadOpen(false);
                  }}
                  className="parking-allotment-tracker-s27"
                  onMouseEnter={e => { e.currentTarget.style.background = '#1e293b'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                >
                  <span className="parking-allotment-tracker-s28">🚗</span>
                  <div>
                    <div>Pending Slots Card (PNG Image)</div>
                    <div className="parking-allotment-tracker-s29">3-Column High-Res Graphic</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setViewMode('2d');
                    setIsGlobalDownloadOpen(false);
                  }}
                  className="parking-allotment-tracker-s27"
                  onMouseEnter={e => { e.currentTarget.style.background = '#1e293b'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                >
                  <span className="parking-allotment-tracker-s28">🗺️</span>
                  <div>
                    <div>2D Layout (PNG / SVG)</div>
                    <div className="parking-allotment-tracker-s29">Vector CAD & High-Res Image</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setViewMode('3d');
                    setIsGlobalDownloadOpen(false);
                  }}
                  className="parking-allotment-tracker-s27"
                  onMouseEnter={e => { e.currentTarget.style.background = '#1e293b'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                >
                  <span className="parking-allotment-tracker-s28">🏙️</span>
                  <div>
                    <div>3D Layout Poster & JSON</div>
                    <div className="parking-allotment-tracker-s29">Architectural 3D Presentation</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const link = document.createElement('a');
                    link.href = '/open_parking_layout.jpg';
                    link.download = 'Majestique_Euriska_Master_Architectural_Layout_61_Spaces.jpg';
                    link.click();
                    setIsGlobalDownloadOpen(false);
                  }}
                  className="parking-allotment-tracker-s30"
                  onMouseEnter={e => { e.currentTarget.style.background = '#1e293b'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                >
                  <span className="parking-allotment-tracker-s28">📄</span>
                  <div>
                    <div>Master Builder Blueprint (JPG)</div>
                    <div className="parking-allotment-tracker-s29">Official Reference Image</div>
                  </div>
                </button>
              </div>
            )}
          </div>

          <button
            onClick={handleExportCSV}
            className="parking-allotment-tracker-s31"
            title="Export full roster to CSV"
          >
            📥 Export CSV
          </button>
          <button
            onClick={handleExportPDF}
            className="parking-allotment-tracker-s31"
            title="Print or export formatted PDF"
          >
            📄 Print PDF
          </button>
          {saveStatus && (
            <span className="parking-allotment-tracker-s32" style={{ color: saveStatus.includes('✓') ? '#065f46' : '#991b1b' }}>
              {saveStatus}
            </span>
          )}
        </div>
      </LiquidGlassCard>

      {/* ── Content View ── */}
      {viewMode === 'table' && (
        <LiquidGlassCard
          variant="default"
          className="parking-allotment-tracker-s33"
        >
          {statusFilter === 'Pending' && (
            <div className="parking-allotment-tracker-s34">
              <div className="parking-allotment-tracker-s35">
                <span className="parking-allotment-tracker-s36">🚗</span>
                <div>
                  <div className="parking-allotment-tracker-s37">
                    Flats with Pending Parking Slot Details ({filteredRecords.length} Flats)
                  </div>
                  <div className="parking-allotment-tracker-s38">
                    Flats awaiting covered/open parking allocation records
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewMode('pending-card')}
                className="parking-allotment-tracker-s39"
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; }}
              >
                <span>📜 View Official Parking Notice & Roster Card</span>
              </button>
            </div>
          )}

          <div className="parking-allotment-tracker-s40">
            <table className="parking-allotment-tracker-s41">
              <thead>
                <tr className="parking-allotment-tracker-s42">
                  {[
                    { label: '#', w: 40 },
                    { label: 'Flat No', w: 110 },
                    { label: 'Floor', w: 80 },
                    { label: 'Parking Slot', w: 140 },
                    { label: 'Parking Type', w: 160 },
                    { label: 'Remarks / Record Reference', w: 280 },
                    ...(isAdmin ? [{ label: 'Actions', w: 80 }] : []),
                  ].map(col => (
                    <th key={col.label} className="parking-allotment-tracker-s43" style={{ textAlign: col.label === '#' || col.label === 'Floor' || col.label === 'Parking Slot' ? 'center' : 'left', minWidth: col.w }}>
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={isAdmin ? 7 : 6} className="parking-allotment-tracker-s44">
                      <div className="parking-allotment-tracker-s45">
                        ⏳ Loading parking allotments...
                      </div>
                    </td>
                  </tr>
                ) : filteredRecords.length === 0 ? (
                  <tr>
                    <td colSpan={isAdmin ? 7 : 6} className="parking-allotment-tracker-s44">
                      <div className="parking-allotment-tracker-s46">
                        🔍 No matching flats or parking records found.
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredRecords.map((item, idx) => {
                    const isAllotted = item.status === 'Allotted';
                    const isRefuge = item.status === 'Refuge';
                    const rowBg = isAllotted
                      ? 'rgba(16, 185, 129, 0.05)'
                      : isRefuge
                      ? 'rgba(241, 245, 249, 0.5)'
                      : 'transparent';

                    return (
                      <tr
                        key={item.flat}
                        className="parking-allotment-tracker-s47" style={{ background: rowBg }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(241, 245, 249, 0.85)'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = rowBg; }}
                      >
                        <td className="parking-allotment-tracker-s48">
                          {idx + 1}
                        </td>

                        <td className="parking-allotment-tracker-s49">
                          <span className="parking-allotment-tracker-s50">
                            {item.flat}
                          </span>
                        </td>

                        <td className="parking-allotment-tracker-s51">
                          {item.floor}
                        </td>

                        <td className="parking-allotment-tracker-s52">
                          {item.parkingNo ? (
                            <span className="parking-allotment-tracker-s53">
                              {item.parkingNo}
                            </span>
                          ) : (
                            <span className="parking-allotment-tracker-s54">
                              —
                            </span>
                          )}
                        </td>

                        <td className="parking-allotment-tracker-s49">
                          <span className="parking-allotment-tracker-s55" style={{ background: STATUS_CONFIG[item.status]?.bg || '#f1f5f9', color: STATUS_CONFIG[item.status]?.color || '#475569', border: `1px solid ${STATUS_CONFIG[item.status]?.border || '#cbd5e1'}` }}>
                            {item.parkingType || (item.status === 'Covered' ? 'Covered Parking' : item.status)}
                          </span>
                        </td>

                        <td className="parking-allotment-tracker-s56">
                          {item.remarks || '—'}
                        </td>

                        {isAdmin && (
                          <td className="parking-allotment-tracker-s57">
                            <button
                              onClick={() => setEditingFlat(item)}
                              title="Edit Allotment"
                              className="parking-allotment-tracker-s58"
                            >
                              ✏️ Edit
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Table summary footer */}
          <div className="parking-allotment-tracker-s59">
            <div>
              Showing <strong>{filteredRecords.length}</strong> of <strong>{parkingRecords.length}</strong> flats in Wing A (A-101 to A-1108)
            </div>
            <div className="parking-allotment-tracker-s60">
              <span>Open Parking: <strong className="parking-allotment-tracker-s61">{filteredRecords.filter(p => p.status === 'Allotted').length}</strong></span>
              <span>Covered Parking: <strong className="parking-allotment-tracker-s62">{filteredRecords.filter(p => p.status === 'Covered').length}</strong></span>
            </div>
          </div>
        </LiquidGlassCard>
      )}

      {/* ── Pending Slots 3-Column Card View (Matching Mockup) ── */}
      {viewMode === 'pending-card' && (
        <PendingParkingSlotsCard
          flatsList={pendingFlatsForCard}
          parkingRecords={parkingRecords}
          onSelectFlat={flat => {
            const found = parkingRecords.find(p => p.flat === flat);
            if (found) {
              setEditingFlat(found);
            }
          }}
          showControls={true}
        />
      )}

      {/* ── 2D Architectural Site Layout (OPEN PARKING LAYOUT — 61 SPACES) ── */}
      {viewMode === '2d' && (
        <ParkingBlueprintMap
          parkingRecords={parkingRecords}
          occupiedSlotMap={stats.occupiedSlotMap}
          searchQuery={searchQuery}
          floorFilter={floorFilter}
          statusFilter={statusFilter}
          onSelectSlot={(record) => {
            if (record?.flat) {
              setEditingFlat(record);
            } else if (record?.parkingNo) {
              setSelectedSlotForDetail({ slotId: record.parkingNo, flatItem: null });
            }
          }}
          onEditFlat={(flatItem) => {
            setEditingFlat(flatItem);
          }}
          isAdmin={isAdmin}
        />
      )}

      {/* ── 3D Isometric Site Model ── */}
      {viewMode === '3d' && (
        <Parking3DView
          parkingRecords={parkingRecords}
          occupiedSlotMap={stats.occupiedSlotMap}
          searchQuery={searchQuery}
          floorFilter={floorFilter}
          statusFilter={statusFilter}
          onSelectSlot={(record) => {
            if (record?.flat) {
              setEditingFlat(record);
            } else if (record?.parkingNo) {
              setSelectedSlotForDetail({ slotId: record.parkingNo, flatItem: null });
            }
          }}
          onEditFlat={(flatItem) => {
            setEditingFlat(flatItem);
          }}
          isAdmin={isAdmin}
        />
      )}

      {/* ── Grid Map View (OP-01 to OP-60) ── */}
      {viewMode === 'grid' && (
        <LiquidGlassCard
          variant="default"
          className="parking-allotment-tracker-s63"
        >
          <div className="parking-allotment-tracker-s64">
            <div>
              <h3 className="parking-allotment-tracker-s65">
                🚗 Open Parking Layout Matrix (OP-01 to OP-60)
              </h3>
              <p className="parking-allotment-tracker-s66">
                Interactive visual bays. Green bays are officially allotted to A-Wing flats; grey bays are available/unallocated.
              </p>
            </div>
            <div className="parking-allotment-tracker-s67">
              <span className="parking-allotment-tracker-s68">
                <span className="parking-allotment-tracker-s69" />
                Occupied ({stats.occupiedOpSlots})
              </span>
              <span className="parking-allotment-tracker-s68">
                <span className="parking-allotment-tracker-s70" />
                Available ({stats.vacantOpSlots})
              </span>
            </div>
          </div>

          <div className="parking-allotment-tracker-s71">
            {OPEN_PARKING_SLOTS.map(slotId => {
              const flatItem = stats.occupiedSlotMap[slotId];
              const isOccupied = Boolean(flatItem);

              return (
                <div
                  key={slotId}
                  onClick={() => setSelectedSlotForDetail({ slotId, flatItem })}
                  className="parking-allotment-tracker-s72" style={{ border: isOccupied ? '1.5px solid rgba(16, 185, 129, 0.4)' : '1.5px dashed rgba(203, 213, 225, 0.9)', background: isOccupied
                      ? 'linear-gradient(135deg, rgba(11, 43, 38, 0.95) 0%, rgba(22, 78, 99, 0.95) 100%)'
                      : 'rgba(255, 255, 255, 0.65)', color: isOccupied ? '#ffffff' : '#64748b', boxShadow: isOccupied ? '0 6px 18px rgba(11, 43, 38, 0.22)' : 'none' }}
                  onMouseEnter={e => {
                    e.currentTarget.style.transform = 'translateY(-3px)';
                    if (isOccupied) e.currentTarget.style.boxShadow = '0 10px 24px rgba(11, 43, 38, 0.35)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    if (isOccupied) e.currentTarget.style.boxShadow = '0 6px 18px rgba(11, 43, 38, 0.22)';
                  }}
                >
                  <div className="parking-allotment-tracker-s73">
                    <span className="parking-allotment-tracker-s74" style={{ color: isOccupied ? '#fef08a' : '#475569' }}>
                      {slotId}
                    </span>
                    <span className="parking-allotment-tracker-s75">
                      {isOccupied ? '🚘' : '🅿️'}
                    </span>
                  </div>

                  {isOccupied ? (
                    <div>
                      <div className="parking-allotment-tracker-s76">
                        {flatItem.flat}
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="parking-allotment-tracker-s77">
                        Available
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </LiquidGlassCard>
      )}

      {/* ── Floor-by-Floor Matrix View ── */}
      {viewMode === 'floors' && (
        <div className="parking-allotment-tracker-s78">
          {Array.from({ length: 11 }, (_, i) => 11 - i).map(floorNum => {
            const flatsOnFloor = floorGroups[floorNum] || [];
            const floorAllotted = flatsOnFloor.filter(p => p.status === 'Allotted').length;
            const floorCovered = flatsOnFloor.filter(p => p.status === 'Covered').length;

            return (
              <div
                key={floorNum}
                className="parking-allotment-tracker-s79"
              >
                <div className="parking-allotment-tracker-s80">
                  <div className="parking-allotment-tracker-s81">
                    <span className="parking-allotment-tracker-s82">
                      Floor {floorNum}
                    </span>
                    <span className="parking-allotment-tracker-s83">
                      Flats A-{floorNum}01 to A-{floorNum}08
                    </span>
                  </div>
                  <div className="parking-allotment-tracker-s84">
                    <span>Open: <strong className="parking-allotment-tracker-s85">{floorAllotted}</strong></span>
                    <span>Covered: <strong className="parking-allotment-tracker-s86">{floorCovered}</strong></span>
                  </div>
                </div>

                <div className="parking-allotment-tracker-s87">
                  {flatsOnFloor.map(item => {
                    const isAllotted = item.status === 'Allotted';
                    const isRefuge = item.status === 'Refuge';

                    return (
                      <div
                        key={item.flat}
                        className="parking-allotment-tracker-s88" style={{ background: isAllotted ? 'rgba(209,250,229,0.3)' : isRefuge ? '#f3f4f6' : 'rgba(219,234,254,0.3)', border: isAllotted ? '1px solid #a7f3d0' : isRefuge ? '1px solid #d1d5db' : '1px solid #bfdbfe' }}
                      >
                        <div className="parking-allotment-tracker-s89">
                          <span className="parking-allotment-tracker-s90">
                            {item.flat}
                          </span>
                          {item.parkingNo ? (
                            <span className="parking-allotment-tracker-s91">
                              {item.parkingNo}
                            </span>
                          ) : (
                            <span className="parking-allotment-tracker-s92" style={{ color: isRefuge ? '#9ca3af' : '#1e40af' }}>
                              {isRefuge ? 'Refuge' : 'Covered'}
                            </span>
                          )}
                        </div>

                        {isAdmin && (
                          <div className="parking-allotment-tracker-s93">
                            <button
                              onClick={() => setEditingFlat(item)}
                              className="parking-allotment-tracker-s94"
                            >
                              ✏️ Edit
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Slot Detail Popover Modal ── */}
      {selectedSlotForDetail && (
        <div className="parking-allotment-tracker-s95" onClick={() => setSelectedSlotForDetail(null)}>
          <div className="parking-allotment-tracker-s96" onClick={e => e.stopPropagation()}>
            <div className="parking-allotment-tracker-s97">
              <div className="parking-allotment-tracker-s98">
                {selectedSlotForDetail.slotId}
              </div>
              <button
                onClick={() => setSelectedSlotForDetail(null)}
                className="parking-allotment-tracker-s99"
              >
                ✕
              </button>
            </div>

            {selectedSlotForDetail.flatItem ? (
              <div>
                <h4 className="parking-allotment-tracker-s100">
                  Flat {selectedSlotForDetail.flatItem.flat}
                </h4>
                <div className="parking-allotment-tracker-s101">
                  <strong>Parking Type:</strong> {selectedSlotForDetail.flatItem.parkingType || 'Open Parking'}
                </div>
                {selectedSlotForDetail.flatItem.remarks && (
                  <div className="parking-allotment-tracker-s102">
                    <strong>Note:</strong> {selectedSlotForDetail.flatItem.remarks}
                  </div>
                )}
                {isAdmin && (
                  <button
                    onClick={() => {
                      const f = selectedSlotForDetail.flatItem;
                      setSelectedSlotForDetail(null);
                      setEditingFlat(f);
                    }}
                    className="parking-allotment-tracker-s103"
                  >
                    ✏️ Edit Allocation
                  </button>
                )}
              </div>
            ) : (
              <div>
                <h4 className="parking-allotment-tracker-s104">
                  Slot Available ({selectedSlotForDetail.slotId})
                </h4>
                <p className="parking-allotment-tracker-s105">
                  This open parking bay is currently unallocated in the registered records.
                </p>
                {isAdmin && (
                  <button
                    onClick={() => {
                      const slotId = selectedSlotForDetail.slotId;
                      setSelectedSlotForDetail(null);
                      // Open edit with new allocation for first available covered flat or empty
                      const defaultFlat = parkingRecords.find(p => p.status === 'Covered') || parkingRecords[0];
                      setEditingFlat({
                        ...defaultFlat,
                        parkingNo: slotId,
                        parkingType: 'Open Parking',
                        status: 'Allotted'
                      });
                    }}
                    className="parking-allotment-tracker-s106"
                  >
                    ➕ Assign this Bay ({selectedSlotForDetail.slotId}) to a Flat
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Admin Edit Flat Modal ── */}
      {editingFlat && (
        <EditFlatModal
          flatItem={editingFlat}
          allFlats={parkingRecords.map(p => p.flat)}
          onSave={handleSaveFlat}
          onClose={() => setEditingFlat(null)}
        />
      )}
    </div>
  );
}

// ── Admin Edit Modal Component ───────────────────────────────────────────────
function EditFlatModal({ flatItem, allFlats = [], onSave, onClose }) {
  const [form, setForm] = useState({
    flat: flatItem.flat,
    floor: flatItem.floor,
    parkingNo: flatItem.parkingNo || '',
    parkingType: flatItem.parkingType || (flatItem.parkingNo ? 'Open Parking' : 'Covered Parking'),
    status: flatItem.status || (flatItem.parkingNo ? 'Allotted' : 'Covered'),
    remarks: flatItem.remarks || ''
  });

  const handleChange = (k, v) => {
    setForm(prev => {
      const next = { ...prev, [k]: v };
      if (k === 'flat') {
        const floorMatch = v.match(/A-(\d+)\d{2}/);
        if (floorMatch) {
          next.floor = parseInt(floorMatch[1], 10);
        }
      }
      if (k === 'parkingNo') {
        const hasSlot = Boolean(v.trim());
        if (hasSlot && next.status === 'Covered') {
          next.status = 'Allotted';
          next.parkingType = 'Open Parking';
        } else if (!hasSlot && next.status === 'Allotted') {
          next.status = 'Covered';
          next.parkingType = 'Covered Parking';
        }
      }
      return next;
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(form);
  };

  const fieldStyle = {
    width: '100%',
    padding: '8px 12px',
    borderRadius: 8,
    border: '1px solid rgba(61,63,52,0.2)',
    fontSize: '0.88rem',
    boxSizing: 'border-box',
    fontFamily: 'inherit',
    marginTop: 4
  };

  const labelStyle = {
    fontSize: '0.74rem',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    color: '#475569',
    display: 'block',
    marginTop: 12
  };

  return (
    <div className="parking-allotment-tracker-s107" onClick={onClose}>
      <div className="parking-allotment-tracker-s108" onClick={e => e.stopPropagation()}>
        <div className="parking-allotment-tracker-s109">
          <div>
            <span className="parking-allotment-tracker-s110">
              Building "A" Allocation
            </span>
            <h3 className="parking-allotment-tracker-s111">
              Assign / Edit Flat {form.flat}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="parking-allotment-tracker-s112"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <label style={labelStyle}>Target Flat No</label>
          <select
            style={fieldStyle}
            value={form.flat}
            onChange={e => handleChange('flat', e.target.value)}
          >
            {allFlats.map(f => (
              <option key={f} value={f}>Flat {f}</option>
            ))}
          </select>

          <label style={labelStyle}>Parking Slot No (Assign OP / CP Code)</label>
          <input
            type="text"
            style={fieldStyle}
            value={form.parkingNo}
            onChange={e => handleChange('parkingNo', e.target.value.toUpperCase())}
            placeholder="e.g. OP-39, OP-01, CP-15"
          />

          <div className="parking-allotment-tracker-s113">
            <div>
              <label style={labelStyle}>Parking Type</label>
              <select
                style={fieldStyle}
                value={form.parkingType}
                onChange={e => handleChange('parkingType', e.target.value)}
              >
                <option value="Open Parking">Open Parking</option>
                <option value="Covered Parking">Covered Parking</option>
                <option value="Not Applicable">Not Applicable</option>
              </select>
            </div>

            <div>
              <label style={labelStyle}>Status</label>
              <select
                style={fieldStyle}
                value={form.status}
                onChange={e => handleChange('status', e.target.value)}
              >
                <option value="Allotted">Allotted (Open)</option>
                <option value="Covered">Covered Parking</option>
                <option value="Refuge">Refuge</option>
              </select>
            </div>
          </div>

          <label style={labelStyle}>Remarks / Notes</label>
          <textarea
            className="parking-allotment-tracker-s114" style={{ ...fieldStyle }}
            value={form.remarks}
            onChange={e => handleChange('remarks', e.target.value)}
            placeholder="Additional notes / record reference..."
          />

          <div className="parking-allotment-tracker-s115">
            <button
              type="button"
              onClick={onClose}
              className="parking-allotment-tracker-s116"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="parking-allotment-tracker-s117"
            >
              Save Allotment
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
