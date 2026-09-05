import { useCallback, useEffect, useMemo, useState } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db, ensureFirebaseSession, isFirebaseConfigured } from '../../firebase.js';
import { initialParkingData, OPEN_PARKING_SLOTS } from '../../data/parkingAllotmentData.js';

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
  const [viewMode, setViewMode] = useState('table'); // 'table' | 'grid' | 'floors'
  const [selectedSlotForDetail, setSelectedSlotForDetail] = useState(null);
  const [editingFlat, setEditingFlat] = useState(null);
  const [saveStatus, setSaveStatus] = useState('');

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

    return {
      totalFlats,
      allottedCount,
      coveredCount,
      refugeCount,
      totalOpSlots,
      occupiedOpSlots,
      vacantOpSlots,
      occupiedSlotMap
    };
  }, [parkingRecords]);

  // ── Filtered Records ─────────────────────────────────────────────────────
  const filteredRecords = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return parkingRecords.filter(item => {
      if (floorFilter !== 'All' && String(item.floor) !== String(floorFilter)) {
        return false;
      }
      if (statusFilter !== 'All') {
        if (statusFilter === 'Allotted' && item.status !== 'Allotted') return false;
        if (statusFilter === 'Covered' && item.status !== 'Covered') return false;
        if (statusFilter === 'Refuge' && item.status !== 'Refuge') return false;
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
            <h1 class="title">🚗 Majestique Euriska - Building "A" Parking Allotment</h1>
            <div class="subtitle">Official Wing A Parking Register (Flats A-101 to A-1108)</div>
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* ── Top Hero Banner ── */}
      <div style={{
        background: 'linear-gradient(135deg, #0b2b26 0%, #164e63 50%, #065f46 100%)',
        borderRadius: 22,
        padding: '24px 28px',
        color: '#fff',
        boxShadow: '0 10px 30px rgba(11,43,38,0.22)',
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 18,
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{ position: 'relative', zIndex: 1, maxWidth: 480 }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            background: 'rgba(196,155,79,0.25)',
            border: '1px solid rgba(196,155,79,0.5)',
            color: '#fef08a',
            padding: '4px 10px',
            borderRadius: 20,
            fontSize: '0.72rem',
            fontWeight: 800,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            marginBottom: 8
          }}>
            🏢 Building "A" • Parking Allotment
          </div>
          <h2 style={{ margin: '0 0 6px', fontSize: '1.55rem', fontWeight: 800, letterSpacing: '-0.02em' }}>
            Parking Allotment Roster
          </h2>
          <p style={{ margin: 0, color: 'rgba(255,255,255,0.78)', fontSize: '0.86rem', lineHeight: 1.45 }}>
            Official records for flats <strong>A-101 to A-1108</strong> (88 units), with Open Parking allocations (OP-01 to OP-60) and Covered Parking.
          </p>
        </div>

        {/* ── KPI Metric Cards in Banner ── */}
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', zIndex: 1 }}>
          {[
            { label: 'Total Flats', value: stats.totalFlats, sub: 'Flats A-101 to A-1108', bg: 'rgba(255,255,255,0.12)', color: '#fff' },
            { label: 'Open Parking', value: stats.allottedCount, sub: '37 Official Bays', bg: 'rgba(110,231,183,0.22)', color: '#6ee7b7' },
            { label: 'Covered Parking', value: stats.coveredCount, sub: '50 Flats', bg: 'rgba(147,197,253,0.22)', color: '#93c5fd' },
            { label: 'Open Bays (OP)', value: `${stats.occupiedOpSlots} / ${stats.totalOpSlots}`, sub: `${stats.vacantOpSlots} Available`, bg: 'rgba(56,189,248,0.2)', color: '#7dd3fc' },
          ].map(stat => (
            <div key={stat.label} style={{
              background: stat.bg,
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255,255,255,0.18)',
              borderRadius: 14,
              padding: '12px 18px',
              minWidth: 105,
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '1.35rem', fontWeight: 800, color: stat.color, lineHeight: 1 }}>
                {stat.value}
              </div>
              <div style={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#fff', marginTop: 4 }}>
                {stat.label}
              </div>
              <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.65)', marginTop: 2 }}>
                {stat.sub}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Controls & Filter Toolbar ── */}
      <div style={{
        background: '#fffefb',
        border: '1px solid rgba(61,63,52,0.12)',
        borderRadius: 18,
        padding: '16px 20px',
        display: 'flex',
        flexWrap: 'wrap',
        gap: 12,
        alignItems: 'center',
        justifyContent: 'space-between',
        boxShadow: '0 4px 16px rgba(0,0,0,0.03)'
      }}>
        {/* Search */}
        <div style={{ position: 'relative', flex: '1 1 240px', minWidth: 200 }}>
          <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', opacity: 0.45, fontSize: '0.95rem', pointerEvents: 'none' }}>🔍</span>
          <input
            type="search"
            placeholder="Search flat (e.g. A-102, 501), slot (OP-39)..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              paddingLeft: 36,
              paddingRight: 12,
              paddingTop: 8,
              paddingBottom: 8,
              borderRadius: 10,
              border: '1.5px solid rgba(61,63,52,0.16)',
              background: '#ffffff',
              fontSize: '0.85rem',
              color: '#1d2a24',
              outline: 'none',
              boxSizing: 'border-box',
              fontFamily: 'inherit'
            }}
          />
        </div>

        {/* Floor selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#5f665f', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Floor:
          </span>
          <select
            value={floorFilter}
            onChange={e => setFloorFilter(e.target.value)}
            style={{
              padding: '7px 10px',
              borderRadius: 10,
              border: '1.5px solid rgba(61,63,52,0.16)',
              background: '#fff',
              fontSize: '0.82rem',
              fontWeight: 600,
              color: '#1d2a24',
              cursor: 'pointer',
              fontFamily: 'inherit'
            }}
          >
            <option value="All">All Floors (1 to 11)</option>
            {Array.from({ length: 11 }, (_, i) => i + 1).map(f => (
              <option key={f} value={f}>Floor {f} (A-{f}01 to A-{f}08)</option>
            ))}
          </select>
        </div>

        {/* Status filter chips */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {[
            { id: 'All', label: 'All Flats' },
            { id: 'Allotted', label: '🚗 Open Parking (37)' },
            { id: 'Covered', label: '🏠 Covered Parking (50)' },
            { id: 'Refuge', label: '🛡️ Refuge' },
          ].map(s => {
            const active = statusFilter === s.id;
            return (
              <button
                key={s.id}
                onClick={() => setStatusFilter(s.id)}
                style={{
                  padding: '6px 12px',
                  borderRadius: 20,
                  border: '1.5px solid',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  background: active ? '#0b2b26' : 'transparent',
                  color: active ? '#C49B4F' : '#5f665f',
                  borderColor: active ? '#0b2b26' : 'rgba(61,63,52,0.16)',
                  transition: 'all 0.15s ease'
                }}
              >
                {s.label}
              </button>
            );
          })}
        </div>

        {/* View mode switcher */}
        <div style={{
          display: 'flex',
          background: 'rgba(61,63,52,0.08)',
          padding: 3,
          borderRadius: 12,
          gap: 2,
          flexWrap: 'wrap'
        }}>
          {[
            { mode: 'table', icon: '📋', label: 'Table' },
            { mode: 'grid', icon: '🅿️', label: 'OP Grid' },
            { mode: 'floors', icon: '🏢', label: 'Floors' },
          ].map(v => (
            <button
              key={v.mode}
              onClick={() => setViewMode(v.mode)}
              style={{
                padding: '6px 12px',
                borderRadius: 9,
                border: 'none',
                fontSize: '0.76rem',
                fontWeight: 700,
                cursor: 'pointer',
                fontFamily: 'inherit',
                background: viewMode === v.mode ? '#ffffff' : 'transparent',
                color: viewMode === v.mode ? '#0b2b26' : '#5f665f',
                boxShadow: viewMode === v.mode ? '0 2px 6px rgba(0,0,0,0.08)' : 'none',
                transition: 'all 0.15s ease'
              }}
            >
              {v.icon} {v.label}
            </button>
          ))}
        </div>

        {/* Action Buttons: Export CSV & Print PDF */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button
            onClick={handleExportCSV}
            style={{
              padding: '7px 14px',
              borderRadius: 10,
              border: '1.5px solid rgba(61,63,52,0.2)',
              background: '#fff',
              color: '#1d2a24',
              fontWeight: 700,
              fontSize: '0.8rem',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              fontFamily: 'inherit',
              transition: 'all 0.15s ease'
            }}
            title="Export full roster to CSV"
          >
            📥 Export CSV
          </button>
          <button
            onClick={handleExportPDF}
            style={{
              padding: '7px 14px',
              borderRadius: 10,
              border: '1.5px solid rgba(61,63,52,0.2)',
              background: '#fff',
              color: '#1d2a24',
              fontWeight: 700,
              fontSize: '0.8rem',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              fontFamily: 'inherit',
              transition: 'all 0.15s ease'
            }}
            title="Print or export formatted PDF"
          >
            📄 Print PDF
          </button>
          {saveStatus && (
            <span style={{ fontSize: '0.78rem', color: saveStatus.includes('✓') ? '#065f46' : '#991b1b', fontWeight: 700 }}>
              {saveStatus}
            </span>
          )}
        </div>
      </div>

      {/* ── Content View ── */}
      {viewMode === 'table' && (
        <div style={{
          background: 'rgba(255,250,242,0.95)',
          border: '1px solid rgba(61,63,52,0.12)',
          borderRadius: 20,
          boxShadow: '0 4px 24px rgba(11,43,38,0.06)',
          overflow: 'hidden'
        }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 650 }}>
              <thead>
                <tr style={{ background: 'rgba(244,239,231,0.95)' }}>
                  {[
                    { label: '#', w: 40 },
                    { label: 'Flat No', w: 110 },
                    { label: 'Floor', w: 80 },
                    { label: 'Parking Slot', w: 140 },
                    { label: 'Parking Type', w: 160 },
                    { label: 'Remarks / Record Reference', w: 280 },
                    ...(isAdmin ? [{ label: 'Actions', w: 80 }] : []),
                  ].map(col => (
                    <th key={col.label} style={{
                      padding: '11px 14px',
                      textAlign: col.label === '#' || col.label === 'Floor' || col.label === 'Parking Slot' ? 'center' : 'left',
                      fontSize: '0.7rem',
                      fontWeight: 800,
                      textTransform: 'uppercase',
                      letterSpacing: '0.07em',
                      color: '#5f665f',
                      borderBottom: '2px solid rgba(61,63,52,0.1)',
                      minWidth: col.w
                    }}>
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={isAdmin ? 7 : 6} style={{ textAlign: 'center', padding: '60px 20px' }}>
                      <div style={{ color: '#5f665f', fontSize: '0.9rem', fontWeight: 600 }}>
                        ⏳ Loading parking allotments...
                      </div>
                    </td>
                  </tr>
                ) : filteredRecords.length === 0 ? (
                  <tr>
                    <td colSpan={isAdmin ? 7 : 6} style={{ textAlign: 'center', padding: '60px 20px' }}>
                      <div style={{ color: '#5f665f', fontSize: '0.92rem', fontWeight: 600 }}>
                        🔍 No matching flats or parking records found.
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredRecords.map((item, idx) => {
                    const isAllotted = item.status === 'Allotted';
                    const isRefuge = item.status === 'Refuge';
                    const rowBg = isAllotted
                      ? 'rgba(209,250,229,0.15)'
                      : isRefuge
                      ? 'rgba(243,244,246,0.5)'
                      : 'transparent';

                    return (
                      <tr
                        key={item.flat}
                        style={{
                          borderBottom: '1px solid rgba(61,63,52,0.06)',
                          background: rowBg,
                          transition: 'background 0.12s'
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(244,239,231,0.6)'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = rowBg; }}
                      >
                        <td style={{ padding: '10px 14px', textAlign: 'center', fontSize: '0.75rem', color: '#9ca3af', fontWeight: 700 }}>
                          {idx + 1}
                        </td>

                        <td style={{ padding: '10px 14px' }}>
                          <span style={{
                            display: 'inline-block',
                            fontSize: '0.86rem',
                            fontWeight: 800,
                            color: '#0b2b26',
                            fontFamily: 'monospace',
                            letterSpacing: '0.04em'
                          }}>
                            {item.flat}
                          </span>
                        </td>

                        <td style={{ padding: '10px 14px', textAlign: 'center', fontSize: '0.8rem', color: '#5f665f', fontWeight: 600 }}>
                          {item.floor}
                        </td>

                        <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                          {item.parkingNo ? (
                            <span style={{
                              display: 'inline-block',
                              background: '#0b2b26',
                              color: '#C49B4F',
                              fontWeight: 800,
                              fontSize: '0.82rem',
                              padding: '3px 10px',
                              borderRadius: 8,
                              fontFamily: 'monospace',
                              letterSpacing: '0.05em',
                              boxShadow: '0 2px 6px rgba(11,43,38,0.18)'
                            }}>
                              {item.parkingNo}
                            </span>
                          ) : (
                            <span style={{ color: '#9ca3af', fontSize: '0.78rem', fontStyle: 'italic' }}>
                              —
                            </span>
                          )}
                        </td>

                        <td style={{ padding: '10px 14px' }}>
                          <span style={{
                            display: 'inline-block',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: 14,
                            background: STATUS_CONFIG[item.status]?.bg || '#f3f4f6',
                            color: STATUS_CONFIG[item.status]?.color || '#4b5563',
                            border: `1px solid ${STATUS_CONFIG[item.status]?.border || '#d1d5db'}`
                          }}>
                            {item.parkingType || (item.status === 'Covered' ? 'Covered Parking' : item.status)}
                          </span>
                        </td>

                        <td style={{ padding: '10px 14px', fontSize: '0.76rem', color: '#475569', maxWidth: 280 }}>
                          {item.remarks || '—'}
                        </td>

                        {isAdmin && (
                          <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>
                            <button
                              onClick={() => setEditingFlat(item)}
                              title="Edit Allotment"
                              style={{
                                padding: '4px 10px',
                                borderRadius: 8,
                                border: '1px solid rgba(61,63,52,0.18)',
                                background: '#fff',
                                cursor: 'pointer',
                                fontSize: '0.76rem',
                                fontWeight: 600,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4
                              }}
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
          <div style={{
            padding: '12px 20px',
            borderTop: '1px solid rgba(61,63,52,0.1)',
            background: 'rgba(244,239,231,0.6)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '0.78rem',
            color: '#5f665f',
            flexWrap: 'wrap',
            gap: 10
          }}>
            <div>
              Showing <strong>{filteredRecords.length}</strong> of <strong>{parkingRecords.length}</strong> flats in Wing A (A-101 to A-1108)
            </div>
            <div style={{ display: 'flex', gap: 16 }}>
              <span>Open Parking: <strong style={{ color: '#065f46' }}>{filteredRecords.filter(p => p.status === 'Allotted').length}</strong></span>
              <span>Covered Parking: <strong style={{ color: '#1e40af' }}>{filteredRecords.filter(p => p.status === 'Covered').length}</strong></span>
            </div>
          </div>
        </div>
      )}

      {/* ── Grid Map View (OP-01 to OP-60) ── */}
      {viewMode === 'grid' && (
        <div style={{
          background: '#fffefb',
          border: '1px solid rgba(61,63,52,0.12)',
          borderRadius: 20,
          padding: '24px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.04)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18, flexWrap: 'wrap', gap: 12 }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#0b2b26' }}>
                🚗 Open Parking Layout Matrix (OP-01 to OP-60)
              </h3>
              <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: '#5f665f' }}>
                Interactive visual bays. Green bays are officially allotted to A-Wing flats; grey bays are available/unallocated.
              </p>
            </div>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', fontSize: '0.76rem', fontWeight: 700 }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 14, height: 14, borderRadius: 4, background: '#0b2b26', border: '1px solid #C49B4F' }} />
                Occupied ({stats.occupiedOpSlots})
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 14, height: 14, borderRadius: 4, background: '#f8fafc', border: '1.5px dashed #94a3b8' }} />
                Available ({stats.vacantOpSlots})
              </span>
            </div>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))',
            gap: 12
          }}>
            {OPEN_PARKING_SLOTS.map(slotId => {
              const flatItem = stats.occupiedSlotMap[slotId];
              const isOccupied = Boolean(flatItem);

              return (
                <div
                  key={slotId}
                  onClick={() => setSelectedSlotForDetail({ slotId, flatItem })}
                  style={{
                    borderRadius: 12,
                    padding: '12px 10px',
                    border: isOccupied ? '1.5px solid #0b2b26' : '1.5px dashed #cbd5e1',
                    background: isOccupied ? 'linear-gradient(180deg, #0b2b26 0%, #164e63 100%)' : '#f8fafc',
                    color: isOccupied ? '#fff' : '#64748b',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    boxShadow: isOccupied ? '0 4px 12px rgba(11,43,38,0.14)' : 'none',
                    position: 'relative',
                    textAlign: 'center'
                  }}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; }}
                >
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 6
                  }}>
                    <span style={{
                      fontFamily: 'monospace',
                      fontWeight: 800,
                      fontSize: '0.88rem',
                      color: isOccupied ? '#C49B4F' : '#475569'
                    }}>
                      {slotId}
                    </span>
                    <span style={{ fontSize: '0.8rem' }}>
                      {isOccupied ? '🚘' : '🅿️'}
                    </span>
                  </div>

                  {isOccupied ? (
                    <div>
                      <div style={{
                        fontSize: '0.92rem',
                        fontWeight: 800,
                        color: '#6ee7b7',
                        letterSpacing: '0.02em',
                        marginTop: 4
                      }}>
                        {flatItem.flat}
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div style={{ fontSize: '0.72rem', fontWeight: 600, color: '#94a3b8' }}>
                        Available
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Floor-by-Floor Matrix View ── */}
      {viewMode === 'floors' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {Array.from({ length: 11 }, (_, i) => 11 - i).map(floorNum => {
            const flatsOnFloor = floorGroups[floorNum] || [];
            const floorAllotted = flatsOnFloor.filter(p => p.status === 'Allotted').length;
            const floorCovered = flatsOnFloor.filter(p => p.status === 'Covered').length;

            return (
              <div
                key={floorNum}
                style={{
                  background: '#fffefb',
                  border: '1px solid rgba(61,63,52,0.12)',
                  borderRadius: 16,
                  padding: '16px 20px',
                  boxShadow: '0 2px 10px rgba(0,0,0,0.02)'
                }}
              >
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 12,
                  borderBottom: '1px solid rgba(61,63,52,0.08)',
                  paddingBottom: 8
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{
                      background: '#0b2b26',
                      color: '#C49B4F',
                      fontWeight: 800,
                      fontSize: '0.8rem',
                      padding: '3px 10px',
                      borderRadius: 8
                    }}>
                      Floor {floorNum}
                    </span>
                    <span style={{ fontWeight: 700, fontSize: '0.92rem', color: '#1d2a24' }}>
                      Flats A-{floorNum}01 to A-{floorNum}08
                    </span>
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#5f665f', display: 'flex', gap: 12 }}>
                    <span>Open: <strong style={{ color: '#065f46' }}>{floorAllotted}</strong></span>
                    <span>Covered: <strong style={{ color: '#1e40af' }}>{floorCovered}</strong></span>
                  </div>
                </div>

                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
                  gap: 10
                }}>
                  {flatsOnFloor.map(item => {
                    const isAllotted = item.status === 'Allotted';
                    const isRefuge = item.status === 'Refuge';

                    return (
                      <div
                        key={item.flat}
                        style={{
                          background: isAllotted ? 'rgba(209,250,229,0.3)' : isRefuge ? '#f3f4f6' : 'rgba(219,234,254,0.3)',
                          border: isAllotted ? '1px solid #a7f3d0' : isRefuge ? '1px solid #d1d5db' : '1px solid #bfdbfe',
                          borderRadius: 12,
                          padding: '10px 12px'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontWeight: 800, fontSize: '0.9rem', color: '#0b2b26', fontFamily: 'monospace' }}>
                            {item.flat}
                          </span>
                          {item.parkingNo ? (
                            <span style={{
                              background: '#0b2b26',
                              color: '#C49B4F',
                              fontWeight: 800,
                              fontSize: '0.74rem',
                              padding: '2px 8px',
                              borderRadius: 6,
                              fontFamily: 'monospace'
                            }}>
                              {item.parkingNo}
                            </span>
                          ) : (
                            <span style={{ fontSize: '0.7rem', color: isRefuge ? '#9ca3af' : '#1e40af', fontWeight: 600 }}>
                              {isRefuge ? 'Refuge' : 'Covered'}
                            </span>
                          )}
                        </div>

                        {isAdmin && (
                          <div style={{ marginTop: 8, textAlign: 'right' }}>
                            <button
                              onClick={() => setEditingFlat(item)}
                              style={{
                                background: 'transparent',
                                border: 'none',
                                color: '#164e63',
                                fontSize: '0.72rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                                padding: 0
                              }}
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
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.5)',
          backdropFilter: 'blur(6px)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 16
        }} onClick={() => setSelectedSlotForDetail(null)}>
          <div style={{
            background: '#fff',
            borderRadius: 20,
            padding: '24px',
            maxWidth: 380,
            width: '100%',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
          }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div style={{
                background: '#0b2b26',
                color: '#C49B4F',
                padding: '4px 12px',
                borderRadius: 8,
                fontWeight: 800,
                fontSize: '1rem',
                fontFamily: 'monospace'
              }}>
                {selectedSlotForDetail.slotId}
              </div>
              <button
                onClick={() => setSelectedSlotForDetail(null)}
                style={{ background: 'none', border: 'none', fontSize: '1.1rem', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            {selectedSlotForDetail.flatItem ? (
              <div>
                <h4 style={{ margin: '0 0 10px', fontSize: '1.25rem', color: '#0b2b26' }}>
                  Flat {selectedSlotForDetail.flatItem.flat}
                </h4>
                <div style={{ fontSize: '0.85rem', color: '#475569', marginBottom: 6 }}>
                  <strong>Parking Type:</strong> {selectedSlotForDetail.flatItem.parkingType || 'Open Parking'}
                </div>
                {selectedSlotForDetail.flatItem.remarks && (
                  <div style={{ fontSize: '0.82rem', color: '#64748b', background: '#f8fafc', padding: 8, borderRadius: 8, marginTop: 8 }}>
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
                    style={{
                      width: '100%',
                      marginTop: 16,
                      padding: '8px',
                      background: '#0b2b26',
                      color: '#fff',
                      border: 'none',
                      borderRadius: 10,
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    ✏️ Edit Allocation
                  </button>
                )}
              </div>
            ) : (
              <div>
                <h4 style={{ margin: '0 0 6px', fontSize: '1.1rem', color: '#10b981' }}>
                  Slot Available ({selectedSlotForDetail.slotId})
                </h4>
                <p style={{ margin: '0 0 14px', fontSize: '0.85rem', color: '#64748b' }}>
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
                    style={{
                      width: '100%',
                      padding: '9px',
                      background: '#065f46',
                      color: '#fff',
                      border: 'none',
                      borderRadius: 10,
                      fontWeight: 800,
                      cursor: 'pointer',
                      fontSize: '0.84rem'
                    }}
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
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0,0,0,0.55)',
      backdropFilter: 'blur(8px)',
      zIndex: 9999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 16
    }} onClick={onClose}>
      <div style={{
        background: '#fffefb',
        borderRadius: 22,
        padding: '24px 28px',
        maxWidth: 460,
        width: '100%',
        maxHeight: '90vh',
        overflowY: 'auto',
        boxShadow: '0 30px 80px rgba(0,0,0,0.3)'
      }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div>
            <span style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#164e63' }}>
              Building "A" Allocation
            </span>
            <h3 style={{ margin: '2px 0 0', fontSize: '1.25rem', fontWeight: 800, color: '#0b2b26' }}>
              Assign / Edit Flat {form.flat}
            </h3>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'rgba(0,0,0,0.06)', border: 'none', borderRadius: 8, width: 32, height: 32, cursor: 'pointer' }}
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

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
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
            style={{ ...fieldStyle, minHeight: 70, resize: 'vertical' }}
            value={form.remarks}
            onChange={e => handleChange('remarks', e.target.value)}
            placeholder="Additional notes / record reference..."
          />

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '8px 16px',
                borderRadius: 10,
                border: '1px solid rgba(0,0,0,0.15)',
                background: '#fff',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              style={{
                padding: '8px 20px',
                borderRadius: 10,
                border: 'none',
                background: '#0b2b26',
                color: '#C49B4F',
                fontWeight: 800,
                cursor: 'pointer'
              }}
            >
              Save Allotment
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
