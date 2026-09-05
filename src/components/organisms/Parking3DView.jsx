import React, { useState, useMemo, useRef } from 'react';
import { 
  Camera, 
  Sun, 
  Moon, 
  RotateCcw, 
  ZoomIn, 
  ZoomOut, 
  Layers, 
  Compass, 
  Car, 
  Building, 
  Sparkles,
  Info,
  Edit3,
  Download,
  FileImage,
  FileText,
  FileCode,
  Printer
} from 'lucide-react';
import { LAYOUT_61_SLOTS, normalizeOpKey } from './ParkingBlueprintMap.jsx';

export default function Parking3DView({
  parkingRecords = [],
  occupiedSlotMap = {},
  searchQuery = '',
  floorFilter = 'All',
  statusFilter = 'All',
  onSelectSlot,
  onEditFlat,
  isAdmin = false
}) {
  const [cameraPitch, setCameraPitch] = useState(50);
  const [cameraYaw, setCameraYaw] = useState(-18);
  const [zoomLevel, setZoomLevel] = useState(0.92);
  const [panOffset, setPanOffset] = useState({ x: 0, y: -20 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [lightingMode, setLightingMode] = useState('dusk'); // 'dusk' | 'daylight' | 'cyberpunk'
  const [selectedSlotKey, setSelectedSlotKey] = useState(null);
  const [isDownloadOpen, setIsDownloadOpen] = useState(false);

  // ── Download Handlers for 3D View ──────────────────────────────────────────
  const handleDownloadOriginalLayout = () => {
    const link = document.createElement('a');
    link.href = '/open_parking_layout.jpg';
    link.download = 'Majestique_Euriska_Master_Architectural_Layout_61_Spaces.jpg';
    link.click();
    setIsDownloadOpen(false);
  };

  const handleDownloadJSON = () => {
    const exportData = {
      project: 'Majestique Euriska - Wing A Parking Allotment (3D Model Spec)',
      totalSlots: 61,
      cameraSettings: { pitch: cameraPitch, yaw: cameraYaw, zoom: zoomLevel },
      lightingMode,
      generatedAt: new Date().toISOString(),
      slots: Object.entries(LAYOUT_61_SLOTS).map(([key, slot]) => {
        const flatItem = parkingRecords.find(p => p.parkingNo && normalizeOpKey(p.parkingNo) === key);
        return {
          slotId: key,
          slotNumber: slot.num,
          label: slot.label,
          zone: slot.zone,
          coordinates: { x: slot.x, y: slot.y, w: slot.w, h: slot.h, orient: slot.orient },
          allocatedFlat: flatItem ? flatItem.flat : null,
          status: flatItem ? 'Allotted' : 'Available',
          floor: flatItem ? flatItem.floor : null
        };
      })
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'Majestique_Euriska_3D_Parking_Model_Data.json';
    link.click();
    URL.revokeObjectURL(url);
    setIsDownloadOpen(false);
  };

  const handleDownloadPoster = () => {
    const generatedDate = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    const slotList = Object.entries(LAYOUT_61_SLOTS).map(([key, slot]) => {
      const flatItem = parkingRecords.find(p => p.parkingNo && normalizeOpKey(p.parkingNo) === key);
      return {
        key,
        num: slot.num,
        label: slot.label,
        zone: slot.zone,
        flat: flatItem ? flatItem.flat : null,
        status: flatItem ? 'Allotted' : 'Vacant'
      };
    });

    const allottedCount = slotList.filter(s => s.status === 'Allotted').length;
    const vacantCount = slotList.filter(s => s.status === 'Vacant').length;

    const posterDoc = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="utf-8">
        <title>Majestique Euriska - 3D Architectural Site & Parking Poster</title>
        <style>
          * { box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
          body { margin: 0; padding: 24px; color: #0f172a; background: #ffffff; }
          .header { border-bottom: 2px solid #0284c7; padding-bottom: 12px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: flex-end; }
          .title { font-size: 20px; font-weight: 800; color: #0f172a; margin: 0; }
          .subtitle { font-size: 13px; color: #475569; margin-top: 4px; }
          .badge { display: inline-block; background: #0284c7; color: #fff; padding: 3px 8px; border-radius: 6px; font-size: 11px; font-weight: 800; }
          
          .kpi-row {
            display: flex;
            gap: 12px;
            margin-bottom: 16px;
          }
          .kpi-card {
            flex: 1;
            padding: 10px 14px;
            background: #f8fafc;
            border: 1px solid #cbd5e1;
            border-radius: 8px;
            text-align: center;
          }
          .kpi-val { font-size: 18px; font-weight: 800; color: #0284c7; }
          .kpi-label { font-size: 11px; font-weight: 700; text-transform: uppercase; color: #64748b; margin-top: 2px; }

          .grid-container {
            display: grid;
            grid-template-columns: repeat(6, 1fr);
            gap: 8px;
            margin-bottom: 20px;
          }
          .slot-card {
            border: 1px solid #cbd5e1;
            border-radius: 6px;
            padding: 6px 8px;
            background: #ffffff;
            font-size: 11px;
          }
          .slot-card.occupied {
            background: #ecfdf5;
            border-color: #10b981;
          }
          .slot-id { font-weight: 800; font-family: monospace; color: #0f172a; }
          .flat-tag { font-weight: 800; color: #047857; margin-top: 2px; font-size: 11px; }
          .vacant-tag { color: #94a3b8; font-style: italic; margin-top: 2px; }
          .zone-tag { font-size: 9px; color: #64748b; margin-top: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

          .legend-box {
            display: flex;
            gap: 16px;
            padding: 10px 14px;
            background: #f1f5f9;
            border-radius: 8px;
            font-size: 11px;
            margin-bottom: 16px;
          }

          .footer {
            margin-top: 20px;
            border-top: 1px solid #cbd5e1;
            padding-top: 10px;
            font-size: 10px;
            color: #64748b;
            display: flex;
            justify-content: space-between;
          }

          @media print {
            body { padding: 0; }
            @page { margin: 1cm; size: A4 landscape; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="badge">ARCHITECTURAL 3D SITE SPECIFICATION</div>
            <h1 class="title" style="margin-top: 6px;">MAJESTIQUE EURISKA — 3D SITE & OPEN PARKING MODEL</h1>
            <div class="subtitle">Master Isometric Tower Layout • 61 Open Parking Spaces • Building "A" Allocation Reference</div>
          </div>
          <div style="text-align: right; font-size: 11px; color: #64748b;">
            <div><strong>Date:</strong> ${generatedDate}</div>
            <div><strong>Lighting Profile:</strong> ${lightingMode.toUpperCase()}</div>
          </div>
        </div>

        <div class="kpi-row">
          <div class="kpi-card">
            <div class="kpi-val">61</div>
            <div class="kpi-label">Total Open Bays (OP 1–61)</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-val" style="color: #059669;">${allottedCount}</div>
            <div class="kpi-label">Allotted Open Bays</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-val" style="color: #64748b;">${vacantCount}</div>
            <div class="kpi-label">Vacant Open Bays</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-val">5</div>
            <div class="kpi-label">Main Landmark Zones</div>
          </div>
        </div>

        <div class="legend-box">
          <div><strong>Building A:</strong> Flats A-101 to A-1108 (Ground to 11th Floor)</div>
          <div>•</div>
          <div><strong>Amenities:</strong> Kids Play Area, Gajibo, MP Theater, Club House & Pool</div>
          <div>•</div>
          <div><strong>Utilities:</strong> STP & OWC (West), DG Room (East)</div>
        </div>

        <h3 style="font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em; color: #334155; margin: 0 0 10px;">
          All 61 Open Parking Bays Schedule
        </h3>

        <div class="grid-container">
          ${slotList.map(s => `
            <div class="slot-card ${s.status === 'Allotted' ? 'occupied' : ''}">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <span class="slot-id">${s.key}</span>
                <span style="font-size: 9px; font-weight: 700; color: ${s.status === 'Allotted' ? '#059669' : '#64748b'}">
                  ${s.status === 'Allotted' ? '● ALLOTTED' : '○ VACANT'}
                </span>
              </div>
              ${s.flat ? `<div class="flat-tag">FLAT: ${s.flat}</div>` : `<div class="vacant-tag">Available</div>`}
              <div class="zone-tag" title="${s.zone}">${s.zone}</div>
            </div>
          `).join('')}
        </div>

        <div class="footer">
          <div>Majestique Euriska Co-Operative Housing Society • Wing A Parking Administration</div>
          <div>Confidential Society Record • Official 3D Master Layout</div>
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
      printWindow.document.write(posterDoc);
      printWindow.document.close();
    } else {
      window.print();
    }
    setIsDownloadOpen(false);
  };

  // Map slot number to flat allotment record
  const slotToFlatMap = useMemo(() => {
    const map = {};
    parkingRecords.forEach(item => {
      if (!item.parkingNo) return;
      const key = normalizeOpKey(item.parkingNo);
      if (key) map[key] = item;
    });
    return map;
  }, [parkingRecords]);

  // Search & Filter reactivity
  const highlightedSlots = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const set = new Set();
    parkingRecords.forEach(item => {
      if (!item.parkingNo) return;
      const key = normalizeOpKey(item.parkingNo);
      if (!key) return;

      if (floorFilter !== 'All' && String(item.floor) !== String(floorFilter)) return;
      if (statusFilter !== 'All' && item.status !== statusFilter) return;

      if (q) {
        const text = [item.flat, item.parkingNo, item.status, item.remarks].filter(Boolean).join(' ').toLowerCase();
        if (text.includes(q)) set.add(key);
      } else {
        set.add(key);
      }
    });
    return set;
  }, [parkingRecords, searchQuery, floorFilter, statusFilter]);

  // Theme palettes
  const themes = useMemo(() => {
    if (lightingMode === 'dusk') {
      return {
        sceneBg: 'radial-gradient(ellipse at 50% 30%, #0d2331 0%, #061118 70%, #02070a 100%)',
        groundPlate: '#0b1d28',
        groundBorder: '#1e4e63',
        roadColor: '#122533',
        roadLine: '#38bdf8',
        bldgA: 'linear-gradient(180deg, #b45309 0%, #78350f 100%)',
        bldgABorder: '#f59e0b',
        bldgB: 'linear-gradient(180deg, #1e3a8a 0%, #0f172a 100%)',
        bldgBBorder: '#3b82f6',
        bldgC: 'linear-gradient(180deg, #991b1b 0%, #450a0a 100%)',
        bldgCBorder: '#ef4444',
        clubhouse: 'linear-gradient(180deg, #ea580c 0%, #9a3412 100%)',
        clubhouseBorder: '#fb923c',
        poolWater: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
        playArea: 'linear-gradient(135deg, #166534 0%, #14532d 100%)',
        slotOccupied: '#059669',
        slotVacant: '#0f172a',
        carBody: '#10b981',
        carRoof: '#059669',
        hudColor: '#f1f5f9'
      };
    } else if (lightingMode === 'daylight') {
      return {
        sceneBg: 'radial-gradient(ellipse at 50% 20%, #e2e8f0 0%, #cbd5e1 100%)',
        groundPlate: '#f8fafc',
        groundBorder: '#94a3b8',
        roadColor: '#334155',
        roadLine: '#ffffff',
        bldgA: 'linear-gradient(180deg, #fef3c7 0%, #fde68a 100%)',
        bldgABorder: '#d97706',
        bldgB: 'linear-gradient(180deg, #dbeafe 0%, #bfdbfe 100%)',
        bldgBBorder: '#2563eb',
        bldgC: 'linear-gradient(180deg, #fee2e2 0%, #fecaca 100%)',
        bldgCBorder: '#dc2626',
        clubhouse: 'linear-gradient(180deg, #ffedd5 0%, #fed7aa 100%)',
        clubhouseBorder: '#ea580c',
        poolWater: 'linear-gradient(135deg, #38bdf8 0%, #0284c7 100%)',
        playArea: 'linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)',
        slotOccupied: '#10b981',
        slotVacant: '#ffffff',
        carBody: '#059669',
        carRoof: '#047857',
        hudColor: '#0f172a'
      };
    } else {
      // Cyberpunk Neon
      return {
        sceneBg: 'radial-gradient(ellipse at 50% 20%, #090014 0%, #000000 100%)',
        groundPlate: '#080812',
        groundBorder: '#ec4899',
        roadColor: '#0f0f23',
        roadLine: '#06b6d4',
        bldgA: 'linear-gradient(180deg, #f59e0b 0%, #b45309 100%)',
        bldgABorder: '#fbbf24',
        bldgB: 'linear-gradient(180deg, #1e1b4b 0%, #0f172a 100%)',
        bldgBBorder: '#818cf8',
        bldgC: 'linear-gradient(180deg, #831843 0%, #500724 100%)',
        bldgCBorder: '#f43f5e',
        clubhouse: 'linear-gradient(180deg, #581c87 0%, #2e1065 100%)',
        clubhouseBorder: '#c084fc',
        poolWater: 'linear-gradient(135deg, #06b6d4 0%, #0284c7 100%)',
        playArea: 'linear-gradient(135deg, #052e16 0%, #022c22 100%)',
        slotOccupied: '#10b981',
        slotVacant: '#18181b',
        carBody: '#ec4899',
        carRoof: '#db2777',
        hudColor: '#fdf2f8'
      };
    }
  }, [lightingMode]);

  // Camera presets
  const setPreset = (preset) => {
    if (preset === 'iso') {
      setCameraPitch(50);
      setCameraYaw(-18);
      setZoomLevel(0.92);
      setPanOffset({ x: 0, y: -20 });
    } else if (preset === 'top') {
      setCameraPitch(0);
      setCameraYaw(0);
      setZoomLevel(0.98);
      setPanOffset({ x: 0, y: 0 });
    } else if (preset === 'bldgA') {
      setCameraPitch(55);
      setCameraYaw(-12);
      setZoomLevel(1.4);
      setPanOffset({ x: 0, y: 280 });
    } else if (preset === 'bldgB') {
      setCameraPitch(55);
      setCameraYaw(-15);
      setZoomLevel(1.45);
      setPanOffset({ x: 0, y: 0 });
    } else if (preset === 'clubhouse') {
      setCameraPitch(55);
      setCameraYaw(-15);
      setZoomLevel(1.45);
      setPanOffset({ x: 0, y: -200 });
    } else if (preset === 'bldgC') {
      setCameraPitch(55);
      setCameraYaw(-12);
      setZoomLevel(1.4);
      setPanOffset({ x: 0, y: -380 });
    }
  };

  // Drag pan
  const handleMouseDown = (e) => {
    if (e.target.closest('button') || e.target.closest('.slot-3d-card')) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
  };
  const handleMouseMove = (e) => {
    if (!isDragging) return;
    setPanOffset({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
  };
  const handleMouseUp = () => setIsDragging(false);

  // Selected slot details
  const selectedSlotData = selectedSlotKey ? LAYOUT_61_SLOTS[selectedSlotKey] : null;
  const selectedFlatRecord = selectedSlotKey ? slotToFlatMap[selectedSlotKey] : null;

  return (
    <div style={{
      background: '#030a0f',
      borderRadius: 16,
      border: '1px solid #1e3a4d',
      overflow: 'hidden',
      color: '#f8fafc',
      boxShadow: '0 20px 50px rgba(0,0,0,0.6)'
    }}>
      {/* ── Top Header Toolbar ── */}
      <div style={{
        padding: '14px 20px',
        background: 'linear-gradient(180deg, #0d2331 0%, #081722 100%)',
        borderBottom: '1px solid #1e455d',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
            padding: 8,
            borderRadius: 10,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(2,132,199,0.35)'
          }}>
            <Camera size={20} color="#ffffff" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <h3 style={{ margin: 0, fontSize: '1.08rem', fontWeight: 800, color: '#f0f9ff' }}>
                3D ISOMETRIC SITE MODEL — 61 OPEN SPACES
              </h3>
              <span style={{
                background: '#0284c7',
                color: '#ffffff',
                padding: '2px 8px',
                borderRadius: 12,
                fontSize: '0.68rem',
                fontWeight: 700
              }}>
                Architectural 3D Camera
              </span>
            </div>
            <p style={{ margin: '2px 0 0', fontSize: '0.74rem', color: '#94a3b8' }}>
              Extruded 3D towers, 3D vehicles with flat numbers, pitch/yaw camera controls & lighting modes
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {/* Lighting Mode Selector */}
          <div style={{
            display: 'flex',
            background: '#081722',
            padding: 3,
            borderRadius: 8,
            border: '1px solid #1e3a4d'
          }}>
            <button
              type="button"
              onClick={() => setLightingMode('dusk')}
              style={{
                padding: '4px 8px',
                borderRadius: 6,
                border: 'none',
                background: lightingMode === 'dusk' ? '#0284c7' : 'transparent',
                color: lightingMode === 'dusk' ? '#ffffff' : '#94a3b8',
                fontSize: '0.7rem',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              🌙 Dusk
            </button>
            <button
              type="button"
              onClick={() => setLightingMode('daylight')}
              style={{
                padding: '4px 8px',
                borderRadius: 6,
                border: 'none',
                background: lightingMode === 'daylight' ? '#0284c7' : 'transparent',
                color: lightingMode === 'daylight' ? '#ffffff' : '#94a3b8',
                fontSize: '0.7rem',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              ☀️ Daylight
            </button>
            <button
              type="button"
              onClick={() => setLightingMode('cyberpunk')}
              style={{
                padding: '4px 8px',
                borderRadius: 6,
                border: 'none',
                background: lightingMode === 'cyberpunk' ? '#ec4899' : 'transparent',
                color: lightingMode === 'cyberpunk' ? '#ffffff' : '#94a3b8',
                fontSize: '0.7rem',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              ⚡ Cyber
            </button>
          </div>

          {/* Camera Angles */}
          <div style={{
            display: 'flex',
            background: '#081722',
            padding: 3,
            borderRadius: 8,
            border: '1px solid #1e3a4d'
          }}>
            {[
              { id: 'iso', label: '📐 Isometric' },
              { id: 'top', label: '🗺️ Top Down' },
              { id: 'bldgA', label: '🏢 A Bldg' },
              { id: 'bldgB', label: '🏢 B Bldg' },
              { id: 'clubhouse', label: '🏊 Club House' },
              { id: 'bldgC', label: '🏢 C Bldg' }
            ].map(p => (
              <button
                key={p.id}
                type="button"
                onClick={() => setPreset(p.id)}
                style={{
                  padding: '4px 8px',
                  borderRadius: 6,
                  border: 'none',
                  background: 'transparent',
                  color: '#94a3b8',
                  fontSize: '0.68rem',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
                onMouseEnter={e => { e.currentTarget.style.color = '#38bdf8'; }}
                onMouseLeave={e => { e.currentTarget.style.color = '#94a3b8'; }}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Download 3D Dropdown */}
          <div style={{ position: 'relative' }}>
            <button
              type="button"
              onClick={() => setIsDownloadOpen(!isDownloadOpen)}
              style={{
                padding: '6px 12px',
                borderRadius: 8,
                border: '1px solid #0284c7',
                background: '#0284c7',
                color: '#ffffff',
                fontSize: '0.74rem',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                boxShadow: '0 2px 6px rgba(2,132,199,0.3)'
              }}
            >
              <Download size={14} />
              <span>Download 3D</span>
            </button>

            {isDownloadOpen && (
              <div style={{
                position: 'absolute',
                top: '110%',
                right: 0,
                background: '#0f172a',
                border: '1px solid #334155',
                borderRadius: 10,
                padding: 6,
                boxShadow: '0 10px 25px rgba(0,0,0,0.7)',
                zIndex: 60,
                minWidth: '220px',
                display: 'flex',
                flexDirection: 'column',
                gap: 4
              }}>
                <button
                  type="button"
                  onClick={handleDownloadPoster}
                  style={{
                    padding: '8px 10px',
                    borderRadius: 6,
                    border: 'none',
                    background: 'transparent',
                    color: '#f8fafc',
                    fontSize: '0.74rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    textAlign: 'left'
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#1e293b'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                >
                  <Printer size={15} color="#38bdf8" />
                  <div>
                    <div>3D Architectural Poster / Sheet</div>
                    <div style={{ fontSize: '0.62rem', color: '#94a3b8' }}>High-Res Printable Presentation</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={handleDownloadOriginalLayout}
                  style={{
                    padding: '8px 10px',
                    borderRadius: 6,
                    border: 'none',
                    background: 'transparent',
                    color: '#f8fafc',
                    fontSize: '0.74rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    textAlign: 'left',
                    borderTop: '1px solid #1e293b'
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#1e293b'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                >
                  <FileImage size={15} color="#fbbf24" />
                  <div>
                    <div>Original Layout (JPG)</div>
                    <div style={{ fontSize: '0.62rem', color: '#94a3b8' }}>Builder Master Reference</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={handleDownloadJSON}
                  style={{
                    padding: '8px 10px',
                    borderRadius: 6,
                    border: 'none',
                    background: 'transparent',
                    color: '#f8fafc',
                    fontSize: '0.74rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    textAlign: 'left',
                    borderTop: '1px solid #1e293b'
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#1e293b'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                >
                  <FileCode size={15} color="#4ade80" />
                  <div>
                    <div>3D Model JSON Spec</div>
                    <div style={{ fontSize: '0.62rem', color: '#94a3b8' }}>Slot Coordinates & Metadata</div>
                  </div>
                </button>
              </div>
            )}
          </div>

          {/* Zoom Buttons */}
          <div style={{ display: 'flex', background: '#081722', borderRadius: 8, border: '1px solid #1e3a4d', overflow: 'hidden' }}>
            <button
              type="button"
              onClick={() => setZoomLevel(prev => Math.min(2.5, Number((prev + 0.2).toFixed(2))))}
              style={{ padding: '6px 10px', border: 'none', background: 'transparent', color: '#f8fafc', cursor: 'pointer' }}
              title="Zoom In"
            >
              <ZoomIn size={15} />
            </button>
            <button
              type="button"
              onClick={() => setZoomLevel(prev => Math.max(0.6, Number((prev - 0.2).toFixed(2))))}
              style={{ padding: '6px 10px', border: 'none', background: 'transparent', color: '#f8fafc', cursor: 'pointer' }}
              title="Zoom Out"
            >
              <ZoomOut size={15} />
            </button>
            <button
              type="button"
              onClick={() => setPreset('iso')}
              style={{ padding: '6px 10px', border: 'none', background: 'transparent', color: '#f8fafc', cursor: 'pointer' }}
              title="Reset View"
            >
              <RotateCcw size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* ── 3D Viewport Area with Perspective ── */}
      <div
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{
          width: '100%',
          height: '720px',
          overflow: 'hidden',
          position: 'relative',
          background: themes.sceneBg,
          cursor: isDragging ? 'grabbing' : 'grab',
          perspective: 1200,
          perspectiveOrigin: '50% 50%',
          userSelect: 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        {/* 3D World Transform Wrapper */}
        <div
          style={{
            position: 'relative',
            width: '750px',
            height: '1050px',
            transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoomLevel}) rotateX(${cameraPitch}deg) rotateZ(${cameraYaw}deg)`,
            transformStyle: 'preserve-3d',
            transition: isDragging ? 'none' : 'transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
          }}
        >
          {/* Ground Base Plate */}
          <div style={{
            position: 'absolute',
            inset: 0,
            background: themes.groundPlate,
            border: `2.5px solid ${themes.groundBorder}`,
            borderRadius: 12,
            boxShadow: '0 40px 80px rgba(0,0,0,0.8), inset 0 0 40px rgba(0,0,0,0.5)',
            transformStyle: 'preserve-3d'
          }}>
            {/* Main Driveway Road Strip */}
            <div style={{
              position: 'absolute',
              left: 45,
              top: 25,
              width: 140,
              height: 1000,
              background: themes.roadColor,
              borderRadius: 6,
              border: `1px solid ${themes.groundBorder}`,
              opacity: 0.85
            }}>
              {/* Center Line Dashes */}
              <div style={{
                position: 'absolute',
                left: '50%',
                top: 50,
                bottom: 50,
                width: 2,
                borderLeft: `2px dashed ${themes.roadLine}`,
                opacity: 0.5
              }} />
            </div>

            {/* ══════════════════════════════════════════════════════════════════
                1. 3D "A" BUILDING (TOP TOWER) & SHOPS
               ══════════════════════════════════════════════════════════════════ */}
            {/* Outside Shops */}
            <div style={{
              position: 'absolute',
              left: 195,
              top: 35,
              width: 350,
              height: 52,
              background: 'rgba(99, 102, 241, 0.25)',
              border: '1.5px solid #818cf8',
              borderRadius: 6,
              transform: 'translateZ(15px)',
              boxShadow: '0 10px 20px rgba(0,0,0,0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#c7d2fe',
              fontWeight: 800,
              fontSize: '0.72rem'
            }}>
              🏪 OUTSIDE SHOPS (SH-1 TO SH-8)
            </div>

            {/* A Building Extruded 3D Tower */}
            <div style={{
              position: 'absolute',
              left: 305,
              top: 110,
              width: 235,
              height: 175,
              transformStyle: 'preserve-3d',
              transform: 'translateZ(2px)'
            }}>
              {/* Podium Stilt Base */}
              <div style={{
                position: 'absolute',
                inset: 0,
                background: 'rgba(217, 119, 6, 0.2)',
                border: `2px solid ${themes.bldgABorder}`,
                borderRadius: 8,
                transform: 'translateZ(2px)'
              }}>
                <div style={{ padding: 6, fontSize: '0.65rem', fontWeight: 800, color: '#f59e0b' }}>
                  🏢 A-BUILDING (A-101 TO A-1108)
                </div>
              </div>

              {/* Extruded Tower Roof Block */}
              <div style={{
                position: 'absolute',
                inset: '12px 18px',
                background: themes.bldgA,
                borderRadius: 6,
                border: `1.5px solid ${themes.bldgABorder}`,
                boxShadow: '0 25px 45px rgba(0,0,0,0.65)',
                transform: 'translateZ(55px)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                color: '#fef3c7',
                fontWeight: 900,
                fontSize: '1rem'
              }}>
                <div>A BUILDING</div>
                <div style={{ fontSize: '0.65rem', color: '#fde68a', marginTop: 2 }}>88 Residential Flats</div>
              </div>
            </div>

            {/* ══════════════════════════════════════════════════════════════════
                2. 3D KIDS PLAY AREA, GAJIBO & MP THEATER
               ══════════════════════════════════════════════════════════════════ */}
            <div style={{
              position: 'absolute',
              left: 260,
              top: 365,
              width: 440,
              height: 70,
              transformStyle: 'preserve-3d',
              transform: 'translateZ(3px)'
            }}>
              {/* Gajibo 3D Pavilion */}
              <div style={{
                position: 'absolute',
                left: 10,
                top: 5,
                width: 50,
                height: 50,
                background: 'linear-gradient(180deg, #d97706 0%, #b45309 100%)',
                borderRadius: '50%',
                border: '1.5px solid #fde68a',
                transform: 'translateZ(20px)',
                boxShadow: '0 8px 15px rgba(0,0,0,0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontSize: '0.58rem',
                fontWeight: 800
              }}>
                GAJIBO
              </div>

              {/* Lawn Area */}
              <div style={{
                position: 'absolute',
                left: 75,
                top: 5,
                width: 220,
                height: 60,
                background: themes.playArea,
                borderRadius: 8,
                border: '1.5px solid #22c55e',
                transform: 'translateZ(6px)',
                boxShadow: '0 6px 16px rgba(0,0,0,0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#dcfce7',
                fontWeight: 800,
                fontSize: '0.72rem',
                gap: 8
              }}>
                <span>🌳 KIDS PLAY AREA</span>
                <span>🎪 SWINGS</span>
              </div>

              {/* MP Theater */}
              <div style={{
                position: 'absolute',
                left: 310,
                top: 0,
                width: 80,
                height: 70,
                background: 'linear-gradient(180deg, #f59e0b 0%, #d97706 100%)',
                borderRadius: 6,
                border: '1.5px solid #fef3c7',
                transform: 'translateZ(25px)',
                boxShadow: '0 10px 20px rgba(0,0,0,0.5)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                fontSize: '0.62rem',
                fontWeight: 800
              }}>
                <div style={{ fontSize: '1rem' }}>🎭</div>
                <div>MP THEATER</div>
              </div>
            </div>

            {/* ══════════════════════════════════════════════════════════════════
                3. 3D "B" BUILDING (MIDDLE TOWER)
               ══════════════════════════════════════════════════════════════════ */}
            <div style={{
              position: 'absolute',
              left: 280,
              top: 500,
              width: 330,
              height: 125,
              transformStyle: 'preserve-3d',
              transform: 'translateZ(2px)'
            }}>
              <div style={{
                position: 'absolute',
                inset: 0,
                background: 'rgba(30, 58, 138, 0.25)',
                border: `2px solid ${themes.bldgBBorder}`,
                borderRadius: 8,
                transform: 'translateZ(2px)'
              }}>
                <div style={{ padding: 6, fontSize: '0.65rem', fontWeight: 800, color: '#93c5fd' }}>
                  🏢 B-BUILDING
                </div>
              </div>
              <div style={{
                position: 'absolute',
                inset: '10px 18px',
                background: themes.bldgB,
                borderRadius: 6,
                border: `1.5px solid ${themes.bldgBBorder}`,
                boxShadow: '0 25px 45px rgba(0,0,0,0.65)',
                transform: 'translateZ(50px)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                color: '#dbeafe',
                fontWeight: 900,
                fontSize: '1rem'
              }}>
                <div>B BUILDING</div>
                <div style={{ fontSize: '0.65rem', color: '#93c5fd', marginTop: 2 }}>Residential Tower</div>
              </div>
            </div>

            {/* ══════════════════════════════════════════════════════════════════
                4. 3D CLUB HOUSE
               ══════════════════════════════════════════════════════════════════ */}
            <div style={{
              position: 'absolute',
              left: 325,
              top: 705,
              width: 265,
              height: 90,
              transformStyle: 'preserve-3d',
              transform: 'translateZ(2px)'
            }}>
              <div style={{
                position: 'absolute',
                inset: 0,
                background: themes.clubhouse,
                borderRadius: 8,
                border: `2px solid ${themes.clubhouseBorder}`,
                boxShadow: '0 20px 35px rgba(0,0,0,0.6)',
                transform: 'translateZ(30px)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffedd5',
                fontWeight: 900,
                fontSize: '0.88rem'
              }}>
                <div>🏊 CLUB HOUSE</div>
                <div style={{ fontSize: '0.6rem', color: '#fed7aa', marginTop: 2 }}>Pool & Community Hall</div>
              </div>
            </div>

            {/* ══════════════════════════════════════════════════════════════════
                5. 3D "C" BUILDING & DG ROOM (BOTTOM)
               ══════════════════════════════════════════════════════════════════ */}
            <div style={{
              position: 'absolute',
              left: 330,
              top: 850,
              width: 260,
              height: 120,
              transformStyle: 'preserve-3d',
              transform: 'translateZ(2px)'
            }}>
              <div style={{
                position: 'absolute',
                inset: 0,
                background: 'rgba(153, 27, 27, 0.25)',
                border: `2px solid ${themes.bldgCBorder}`,
                borderRadius: 8,
                transform: 'translateZ(2px)'
              }}>
                <div style={{ padding: 6, fontSize: '0.65rem', fontWeight: 800, color: '#fca5a5' }}>
                  🏢 C-BUILDING
                </div>
              </div>
              <div style={{
                position: 'absolute',
                inset: '10px 18px',
                background: themes.bldgC,
                borderRadius: 6,
                border: `1.5px solid ${themes.bldgCBorder}`,
                boxShadow: '0 25px 45px rgba(0,0,0,0.65)',
                transform: 'translateZ(45px)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                color: '#fee2e2',
                fontWeight: 900,
                fontSize: '1rem'
              }}>
                <div>C BUILDING</div>
                <div style={{ fontSize: '0.65rem', color: '#fca5a5', marginTop: 2 }}>Near DG Room</div>
              </div>
            </div>

            {/* DG Room (Bottom Right 3D Block) */}
            <div style={{
              position: 'absolute',
              left: 640,
              top: 990,
              width: 58,
              height: 34,
              background: 'linear-gradient(180deg, #334155 0%, #1e293b 100%)',
              border: '1.5px solid #eab308',
              borderRadius: 4,
              transform: 'translateZ(22px)',
              boxShadow: '0 10px 20px rgba(0,0,0,0.6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fef08a',
              fontSize: '0.68rem',
              fontWeight: 800
            }}>
              ⚡ DG
            </div>

            {/* STP / OWC Blocks */}
            <div style={{
              position: 'absolute',
              left: 210,
              top: 745,
              width: 65,
              height: 22,
              background: '#1e293b',
              border: '1px solid #10b981',
              borderRadius: 3,
              transform: 'translateZ(12px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#6ee7b7',
              fontSize: '0.58rem',
              fontWeight: 800
            }}>
              🌱 OWC
            </div>
            <div style={{
              position: 'absolute',
              left: 278,
              top: 965,
              width: 40,
              height: 26,
              background: '#1e293b',
              border: '1px solid #0284c7',
              borderRadius: 3,
              transform: 'translateZ(12px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#38bdf8',
              fontSize: '0.58rem',
              fontWeight: 800
            }}>
              ♻️ STP
            </div>

            {/* ══════════════════════════════════════════════════════════════════
                6. 3D PARKING SPACES & 3D VEHICLE CAR MODELS (OP 1 TO OP 61)
               ══════════════════════════════════════════════════════════════════ */}
            {Object.entries(LAYOUT_61_SLOTS).map(([slotKey, slot]) => {
              const flatItem = slotToFlatMap[slotKey];
              const isAllotted = Boolean(flatItem);
              const isHighlighted = highlightedSlots.has(slotKey) || (flatItem && highlightedSlots.has(flatItem.flat?.toUpperCase()));
              const isSelected = selectedSlotKey === slotKey;

              return (
                <div
                  key={slotKey}
                  className="slot-3d-card"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedSlotKey(slotKey);
                    if (onSelectSlot) {
                      onSelectSlot(flatItem || { parkingNo: slotKey, parkingType: 'Open Parking' });
                    }
                  }}
                  style={{
                    position: 'absolute',
                    left: slot.x,
                    top: slot.y,
                    width: slot.w,
                    height: slot.h,
                    background: isAllotted ? 'rgba(5, 150, 105, 0.4)' : themes.slotVacant,
                    border: `1.5px solid ${isSelected ? '#38bdf8' : isHighlighted ? '#fbbf24' : isAllotted ? '#10b981' : '#334155'}`,
                    borderRadius: 4,
                    transform: 'translateZ(4px)',
                    transformStyle: 'preserve-3d',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: isHighlighted ? '0 0 16px #fbbf24' : '0 4px 8px rgba(0,0,0,0.4)',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {/* Slot Number Label */}
                  <span style={{
                    fontSize: '0.55rem',
                    fontWeight: 800,
                    color: isAllotted ? '#a7f3d0' : '#94a3b8',
                    zIndex: 2
                  }}>
                    {slot.label}
                  </span>

                  {/* 3D Extruded Car Model if Allotted */}
                  {isAllotted ? (
                    <div style={{
                      position: 'absolute',
                      inset: '2px 3px',
                      background: themes.carBody,
                      borderRadius: 3,
                      transform: 'translateZ(12px)',
                      boxShadow: '0 6px 12px rgba(0,0,0,0.6)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#ffffff',
                      fontWeight: 900,
                      fontSize: '0.58rem',
                      border: '1px solid #34d399'
                    }}>
                      <span>{flatItem.flat}</span>
                    </div>
                  ) : (
                    <span style={{ fontSize: '0.48rem', color: '#64748b' }}>FREE</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Selected Slot Detail Card Popup ── */}
        {selectedSlotKey && selectedSlotData && (
          <div style={{
            position: 'absolute',
            bottom: 20,
            left: 20,
            right: 20,
            maxWidth: '420px',
            background: 'rgba(15, 23, 42, 0.95)',
            backdropFilter: 'blur(14px)',
            border: '1.5px solid #0284c7',
            borderRadius: 14,
            padding: '16px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.8)',
            zIndex: 50,
            animation: 'fadeIn 0.2s ease-out'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{
                    background: '#0284c7',
                    color: '#ffffff',
                    padding: '3px 8px',
                    borderRadius: 6,
                    fontSize: '0.75rem',
                    fontWeight: 800
                  }}>
                    {selectedSlotData.label} ({selectedSlotData.id})
                  </span>
                  <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#94a3b8' }}>
                    {selectedSlotData.zone}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedSlotKey(null)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#94a3b8',
                  fontSize: '1.2rem',
                  cursor: 'pointer',
                  padding: 2
                }}
              >
                ✕
              </button>
            </div>

            {selectedFlatRecord ? (
              <div style={{
                background: 'rgba(6, 78, 59, 0.4)',
                border: '1px solid #10b981',
                borderRadius: 10,
                padding: '10px 12px',
                marginBottom: 12
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: '0.68rem', color: '#a7f3d0', fontWeight: 800, textTransform: 'uppercase' }}>
                      Allotted Flat
                    </div>
                    <div style={{ fontSize: '1.2rem', fontWeight: 900, color: '#34d399' }}>
                      Flat {selectedFlatRecord.flat}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.68rem', color: '#a7f3d0', fontWeight: 800, textTransform: 'uppercase' }}>
                      Floor
                    </div>
                    <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#f8fafc' }}>
                      {selectedFlatRecord.floor}th Floor
                    </div>
                  </div>
                </div>

                {selectedFlatRecord.remarks && (
                  <div style={{ marginTop: 8, fontSize: '0.72rem', color: '#cbd5e1', borderTop: '1px dashed rgba(52,211,153,0.3)', paddingTop: 6 }}>
                    <strong>Reference:</strong> {selectedFlatRecord.remarks}
                  </div>
                )}
              </div>
            ) : (
              <div style={{
                background: 'rgba(30, 41, 59, 0.6)',
                border: '1px dashed #475569',
                borderRadius: 10,
                padding: '12px',
                marginBottom: 12,
                color: '#94a3b8',
                fontSize: '0.8rem'
              }}>
                🅿️ This open parking space is currently unallocated.
              </div>
            )}

            {/* Action Buttons */}
            {isAdmin && (
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  type="button"
                  onClick={() => {
                    if (onEditFlat && selectedFlatRecord) {
                      onEditFlat(selectedFlatRecord);
                    } else if (onSelectSlot) {
                      onSelectSlot(selectedFlatRecord || { parkingNo: selectedSlotKey, parkingType: 'Open Parking' });
                    }
                  }}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    borderRadius: 8,
                    border: 'none',
                    background: '#0284c7',
                    color: '#ffffff',
                    fontSize: '0.78rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6
                  }}
                >
                  <Edit3 size={14} />
                  {selectedFlatRecord ? 'Edit Slot / Flat Assignment' : 'Assign this Bay to Flat'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Footer Info ── */}
      <div style={{
        padding: '12px 20px',
        background: '#071620',
        borderTop: '1px solid #1e3a4d',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        fontSize: '0.72rem',
        color: '#94a3b8'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span>🎮 Camera: Drag to Pan • Pitch & Yaw Presets above</span>
        </div>
        <div>
          Click any 3D Vehicle / Bay to view or edit flat assignment
        </div>
      </div>
    </div>
  );
}
