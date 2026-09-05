import React, { useState, useMemo, useRef } from 'react';
import { 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  Layers, 
  Car, 
  Search, 
  CheckCircle2, 
  Info, 
  Edit3, 
  Compass, 
  Maximize2,
  TreePine,
  ShieldCheck,
  Building,
  Sparkles
} from 'lucide-react';

// Helper to normalize OP slot keys (e.g. 'OP-01', 'OP-1', 'OP 1', '1' -> 'OP-01')
export function normalizeOpKey(slot) {
  if (!slot) return '';
  const clean = String(slot).trim().toUpperCase().replace(/\s+/g, '-');
  const match = clean.match(/OP-?(\d+)/i) || clean.match(/^(\d+)$/);
  if (match) {
    const num = parseInt(match[1], 10);
    return `OP-${String(num).padStart(2, '0')}`;
  }
  return clean;
}

// Full 61 Open Parking Coordinates based on official "OPEN PARKING LAYOUT — 61 SPACES"
export const LAYOUT_61_SLOTS = {
  // Top-Right Corner (North of Basement)
  'OP-01': { id: 'OP-01', num: 1, x: 670, y: 65, w: 46, h: 48, orient: 'V', label: 'OP 1', zone: 'North-East Corner' },
  'OP-02': { id: 'OP-02', num: 2, x: 618, y: 65, w: 46, h: 48, orient: 'V', label: 'OP 2', zone: 'North-East Corner' },
  'OP-03': { id: 'OP-03', num: 3, x: 566, y: 65, w: 46, h: 48, orient: 'V', label: 'OP 3', zone: 'North-East Corner' },

  // Right of A Building (East Boundary)
  'OP-04': { id: 'OP-04', num: 4, x: 650, y: 135, w: 58, h: 32, orient: 'H', label: 'OP 4', zone: 'East Boundary (Right of A Building)' },
  'OP-05': { id: 'OP-05', num: 5, x: 650, y: 172, w: 58, h: 32, orient: 'H', label: 'OP 5', zone: 'East Boundary (Right of A Building)' },
  'OP-06': { id: 'OP-06', num: 6, x: 650, y: 209, w: 58, h: 32, orient: 'H', label: 'OP 6', zone: 'East Boundary (Right of A Building)' },
  'OP-07': { id: 'OP-07', num: 7, x: 650, y: 246, w: 58, h: 32, orient: 'H', label: 'OP 7', zone: 'East Boundary (Right of A Building)' },
  'OP-08': { id: 'OP-08', num: 8, x: 650, y: 283, w: 58, h: 32, orient: 'H', label: 'OP 8', zone: 'East Boundary (Right of A Building)' },

  // North of Kids Play Area
  'OP-09': { id: 'OP-09', num: 9,  x: 580, y: 320, w: 44, h: 40, orient: 'V', label: '9',  zone: 'North of Kids Play Area' },
  'OP-10': { id: 'OP-10', num: 10, x: 530, y: 320, w: 44, h: 40, orient: 'V', label: '10', zone: 'North of Kids Play Area' },
  'OP-11': { id: 'OP-11', num: 11, x: 480, y: 320, w: 44, h: 40, orient: 'V', label: '11', zone: 'North of Kids Play Area' },
  'OP-12': { id: 'OP-12', num: 12, x: 430, y: 320, w: 44, h: 40, orient: 'V', label: '12', zone: 'North of Kids Play Area' },
  'OP-13': { id: 'OP-13', num: 13, x: 380, y: 320, w: 44, h: 40, orient: 'V', label: '13', zone: 'North of Kids Play Area' },
  'OP-14': { id: 'OP-14', num: 14, x: 330, y: 320, w: 44, h: 40, orient: 'V', label: '14', zone: 'North of Kids Play Area' },

  // South of Kids Play Area
  'OP-15': { id: 'OP-15', num: 15, x: 330, y: 440, w: 44, h: 40, orient: 'V', label: '15', zone: 'South of Kids Play Area' },
  'OP-16': { id: 'OP-16', num: 16, x: 380, y: 440, w: 44, h: 40, orient: 'V', label: '16', zone: 'South of Kids Play Area' },
  'OP-17': { id: 'OP-17', num: 17, x: 430, y: 440, w: 44, h: 40, orient: 'V', label: '17', zone: 'South of Kids Play Area' },
  'OP-18': { id: 'OP-18', num: 18, x: 480, y: 440, w: 44, h: 40, orient: 'V', label: '18', zone: 'South of Kids Play Area' },
  'OP-19': { id: 'OP-19', num: 19, x: 530, y: 440, w: 44, h: 40, orient: 'V', label: '19', zone: 'South of Kids Play Area' },
  'OP-20': { id: 'OP-20', num: 20, x: 580, y: 440, w: 44, h: 40, orient: 'V', label: '20', zone: 'South of Kids Play Area' },

  // Right of B Building (East Boundary)
  'OP-21': { id: 'OP-21', num: 21, x: 640, y: 490, w: 58, h: 30, orient: 'H', label: '21', zone: 'East Boundary (Right of B Building)' },
  'OP-22': { id: 'OP-22', num: 22, x: 640, y: 524, w: 58, h: 30, orient: 'H', label: '22', zone: 'East Boundary (Right of B Building)' },
  'OP-23': { id: 'OP-23', num: 23, x: 640, y: 558, w: 58, h: 30, orient: 'H', label: '23', zone: 'East Boundary (Right of B Building)' },
  'OP-24': { id: 'OP-24', num: 24, x: 640, y: 592, w: 58, h: 30, orient: 'H', label: '24', zone: 'East Boundary (Right of B Building)' },
  'OP-25': { id: 'OP-25', num: 25, x: 640, y: 626, w: 58, h: 30, orient: 'H', label: '25', zone: 'East Boundary (Right of B Building)' },
  'OP-26': { id: 'OP-26', num: 26, x: 640, y: 660, w: 58, h: 30, orient: 'H', label: '26', zone: 'East Boundary (Right of B Building)' },

  // Right of Club House & C Building (Down to DG Room)
  'OP-27': { id: 'OP-27', num: 27, x: 640, y: 705, w: 58, h: 28, orient: 'H', label: '27', zone: 'East Boundary (Opp. Club House)' },
  'OP-28': { id: 'OP-28', num: 28, x: 640, y: 736, w: 58, h: 28, orient: 'H', label: '28', zone: 'East Boundary (Opp. Club House)' },
  'OP-29': { id: 'OP-29', num: 29, x: 640, y: 767, w: 58, h: 28, orient: 'H', label: '29', zone: 'East Boundary (Opp. Club House)' },
  'OP-30': { id: 'OP-30', num: 30, x: 640, y: 798, w: 58, h: 28, orient: 'H', label: '30', zone: 'East Boundary (Opp. Club House)' },
  'OP-31': { id: 'OP-31', num: 31, x: 640, y: 829, w: 58, h: 28, orient: 'H', label: '31', zone: 'East Boundary (Right of C Building)' },
  'OP-32': { id: 'OP-32', num: 32, x: 640, y: 860, w: 58, h: 28, orient: 'H', label: '32', zone: 'East Boundary (Right of C Building)' },
  'OP-33': { id: 'OP-33', num: 33, x: 640, y: 891, w: 58, h: 28, orient: 'H', label: '33', zone: 'East Boundary (Right of C Building)' },
  'OP-34': { id: 'OP-34', num: 34, x: 640, y: 922, w: 58, h: 28, orient: 'H', label: '34', zone: 'East Boundary (Near DG Room)' },
  'OP-35': { id: 'OP-35', num: 35, x: 640, y: 953, w: 58, h: 28, orient: 'H', label: '35', zone: 'East Boundary (Near DG Room)' },

  // Left of C Building (Between OWC & STP)
  'OP-36': { id: 'OP-36', num: 36, x: 215, y: 968, w: 58, h: 26, orient: 'H', label: '36', zone: 'West Boundary (Next to STP & C Bldg)' },
  'OP-37': { id: 'OP-37', num: 37, x: 215, y: 940, w: 58, h: 26, orient: 'H', label: '37', zone: 'West Boundary (Left of C Building)' },
  'OP-38': { id: 'OP-38', num: 38, x: 215, y: 912, w: 58, h: 26, orient: 'H', label: '38', zone: 'West Boundary (Left of C Building)' },
  'OP-39': { id: 'OP-39', num: 39, x: 215, y: 884, w: 58, h: 26, orient: 'H', label: '39', zone: 'West Boundary (Left of C Building)' },
  'OP-40': { id: 'OP-40', num: 40, x: 215, y: 856, w: 58, h: 26, orient: 'H', label: '40', zone: 'West Boundary (Left of C Building)' },
  'OP-41': { id: 'OP-41', num: 41, x: 215, y: 828, w: 58, h: 26, orient: 'H', label: '41', zone: 'West Boundary (Left of C Building)' },
  'OP-42': { id: 'OP-42', num: 42, x: 215, y: 800, w: 58, h: 26, orient: 'H', label: '42', zone: 'West Boundary (Left of C Building)' },
  'OP-43': { id: 'OP-43', num: 43, x: 215, y: 772, w: 58, h: 26, orient: 'H', label: '43', zone: 'West Boundary (Next to OWC & C Bldg)' },

  // South of Club House (Between Club House & C Building)
  'OP-44': { id: 'OP-44', num: 44, x: 535, y: 808, w: 46, h: 36, orient: 'V', label: '44', zone: 'South of Club House' },
  'OP-45': { id: 'OP-45', num: 45, x: 475, y: 808, w: 46, h: 36, orient: 'V', label: '45', zone: 'South of Club House' },
  'OP-46': { id: 'OP-46', num: 46, x: 415, y: 808, w: 46, h: 36, orient: 'V', label: '46', zone: 'South of Club House' },
  'OP-47': { id: 'OP-47', num: 47, x: 355, y: 808, w: 46, h: 36, orient: 'V', label: '47', zone: 'South of Club House' },

  // Driveway Island (Opposite Club House)
  'OP-48': { id: 'OP-48', num: 48, x: 80, y: 815, w: 58, h: 32, orient: 'H', label: '48', zone: 'Main Driveway Island (Opp. Club House)' },
  'OP-49': { id: 'OP-49', num: 49, x: 80, y: 775, w: 58, h: 32, orient: 'H', label: '49', zone: 'Main Driveway Island (Opp. Club House)' },
  'OP-50': { id: 'OP-50', num: 50, x: 80, y: 735, w: 58, h: 32, orient: 'H', label: '50', zone: 'Main Driveway Island (Opp. Club House)' },
  'OP-51': { id: 'OP-51', num: 51, x: 80, y: 695, w: 58, h: 32, orient: 'H', label: '51', zone: 'Main Driveway Island (Opp. Club House)' },

  // North of Club House (Between B Building & Club House)
  'OP-52': { id: 'OP-52', num: 52, x: 510, y: 668, w: 50, h: 34, orient: 'V', label: '52', zone: 'North of Club House' },
  'OP-53': { id: 'OP-53', num: 53, x: 440, y: 668, w: 50, h: 34, orient: 'V', label: '53', zone: 'North of Club House' },
  'OP-54': { id: 'OP-54', num: 54, x: 370, y: 668, w: 50, h: 34, orient: 'V', label: '54', zone: 'North of Club House' },

  // Driveway Island (Opposite Kids Play Area)
  'OP-55': { id: 'OP-55', num: 55, x: 80, y: 445, w: 58, h: 34, orient: 'H', label: '55', zone: 'Main Driveway Island (Opp. Play Area)' },
  'OP-56': { id: 'OP-56', num: 56, x: 80, y: 405, w: 58, h: 34, orient: 'H', label: '56', zone: 'Main Driveway Island (Opp. Play Area)' },
  'OP-57': { id: 'OP-57', num: 57, x: 80, y: 365, w: 58, h: 34, orient: 'H', label: '57', zone: 'Main Driveway Island (Opp. Play Area)' },

  // Left of A Building
  'OP-58': { id: 'OP-58', num: 58, x: 235, y: 155, w: 58, h: 32, orient: 'H', label: '58', zone: 'West of A Building (Driveway Frontage)' },
  'OP-59': { id: 'OP-59', num: 59, x: 235, y: 195, w: 58, h: 32, orient: 'H', label: '59', zone: 'West of A Building (Driveway Frontage)' },
  'OP-60': { id: 'OP-60', num: 60, x: 235, y: 235, w: 58, h: 32, orient: 'H', label: '60', zone: 'West of A Building (Driveway Frontage)' },
  'OP-61': { id: 'OP-61', num: 61, x: 235, y: 275, w: 58, h: 32, orient: 'H', label: '61', zone: 'West of A Building (Driveway Frontage)' }
};

export default function ParkingBlueprintMap({
  parkingRecords = [],
  occupiedSlotMap = {},
  searchQuery = '',
  floorFilter = 'All',
  statusFilter = 'All',
  onSelectSlot,
  onEditFlat,
  isAdmin = false
}) {
  const [zoomLevel, setZoomLevel] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [activeZone, setActiveZone] = useState('ALL');
  const [themeMode, setThemeMode] = useState('architectural'); // 'architectural' | 'cad' | 'light'
  const [selectedSlotKey, setSelectedSlotKey] = useState(null);

  const containerRef = useRef(null);

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

  // Drag & Pan handlers
  const handleMouseDown = (e) => {
    if (e.target.closest('button') || e.target.closest('.interactive-slot-bay')) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    setPanOffset({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => setIsDragging(false);

  const handleZoom = (delta) => {
    setZoomLevel(prev => Math.min(2.8, Math.max(0.65, Number((prev + delta).toFixed(2)))));
  };

  const resetView = () => {
    setZoomLevel(1);
    setPanOffset({ x: 0, y: 0 });
    setActiveZone('ALL');
    setSelectedSlotKey(null);
  };

  const focusZone = (zoneKey) => {
    setActiveZone(zoneKey);
    if (zoneKey === 'A_BUILDING') {
      setZoomLevel(1.65);
      setPanOffset({ x: 0, y: 380 });
    } else if (zoneKey === 'PLAYGROUND') {
      setZoomLevel(1.75);
      setPanOffset({ x: 0, y: 180 });
    } else if (zoneKey === 'B_BUILDING') {
      setZoomLevel(1.7);
      setPanOffset({ x: 0, y: -40 });
    } else if (zoneKey === 'CLUBHOUSE') {
      setZoomLevel(1.75);
      setPanOffset({ x: 0, y: -260 });
    } else if (zoneKey === 'C_BUILDING') {
      setZoomLevel(1.7);
      setPanOffset({ x: 0, y: -460 });
    } else {
      resetView();
    }
  };

  // Color schemes
  const colors = useMemo(() => {
    if (themeMode === 'architectural') {
      return {
        bg: '#f8fafc',
        paperBg: '#f1f5f9',
        roadBg: '#cbd5e1',
        roadBorder: '#94a3b8',
        buildingA: '#fef3c7',
        buildingABorder: '#d97706',
        buildingB: '#fef3c7',
        buildingBBorder: '#d97706',
        buildingC: '#fef3c7',
        buildingCBorder: '#d97706',
        clubhouse: '#ffedd5',
        clubhouseBorder: '#ea580c',
        playArea: '#dcfce7',
        playAreaBorder: '#16a34a',
        shops: '#e0e7ff',
        shopsBorder: '#6366f1',
        utility: '#e2e8f0',
        utilityBorder: '#64748b',
        slotOccupied: '#059669',
        slotOccupiedText: '#ffffff',
        slotVacant: '#ffffff',
        slotVacantText: '#1e293b',
        carFill: '#0284c7',
        textPrimary: '#0f172a',
        textSecondary: '#475569'
      };
    } else if (themeMode === 'cad') {
      return {
        bg: '#08141e',
        paperBg: '#0b1d28',
        roadBg: '#122533',
        roadBorder: '#1e4e63',
        buildingA: '#1e293b',
        buildingABorder: '#38bdf8',
        buildingB: '#1e293b',
        buildingBBorder: '#38bdf8',
        buildingC: '#1e293b',
        buildingCBorder: '#38bdf8',
        clubhouse: '#2e1065',
        clubhouseBorder: '#a855f7',
        playArea: '#064e3b',
        playAreaBorder: '#22c55e',
        shops: '#312e81',
        shopsBorder: '#818cf8',
        utility: '#1e293b',
        utilityBorder: '#94a3b8',
        slotOccupied: '#047857',
        slotOccupiedText: '#ecfdf5',
        slotVacant: '#0f172a',
        slotVacantText: '#94a3b8',
        carFill: '#38bdf8',
        textPrimary: '#f8fafc',
        textSecondary: '#94a3b8'
      };
    } else {
      // Clean Blueprint Dark
      return {
        bg: '#040d14',
        paperBg: '#071822',
        roadBg: '#0f2735',
        roadBorder: '#1c4960',
        buildingA: '#0d3240',
        buildingABorder: '#10b981',
        buildingB: '#0d3240',
        buildingBBorder: '#3b82f6',
        buildingC: '#0d3240',
        buildingCBorder: '#ef4444',
        clubhouse: '#261738',
        clubhouseBorder: '#c084fc',
        playArea: '#0c3823',
        playAreaBorder: '#4ade80',
        shops: '#1e2544',
        shopsBorder: '#818cf8',
        utility: '#17242e',
        utilityBorder: '#64748b',
        slotOccupied: '#059669',
        slotOccupiedText: '#ffffff',
        slotVacant: '#0a1a24',
        slotVacantText: '#64748b',
        carFill: '#34d399',
        textPrimary: '#f8fafc',
        textSecondary: '#94a3b8'
      };
    }
  }, [themeMode]);

  // Selected slot item
  const selectedSlotData = selectedSlotKey ? LAYOUT_61_SLOTS[selectedSlotKey] : null;
  const selectedFlatRecord = selectedSlotKey ? slotToFlatMap[selectedSlotKey] : null;

  return (
    <div style={{
      background: colors.bg,
      borderRadius: 16,
      border: `1px solid ${colors.roadBorder}`,
      overflow: 'hidden',
      color: colors.textPrimary,
      boxShadow: '0 20px 45px rgba(0,0,0,0.3)',
      transition: 'background 0.25s ease'
    }}>
      {/* ── Top Header Toolbar ── */}
      <div style={{
        padding: '14px 20px',
        background: themeMode === 'architectural' 
          ? 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)' 
          : 'linear-gradient(180deg, #0d2636 0%, #081a24 100%)',
        borderBottom: `1px solid ${colors.roadBorder}`,
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
            <Building size={20} color="#ffffff" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <h3 style={{ margin: 0, fontSize: '1.08rem', fontWeight: 800, letterSpacing: '-0.01em' }}>
                OPEN PARKING LAYOUT — 61 SPACES
              </h3>
              <span style={{
                background: '#0284c7',
                color: '#ffffff',
                padding: '2px 8px',
                borderRadius: 12,
                fontSize: '0.68rem',
                fontWeight: 700
              }}>
                Master 2D Blueprint Plan
              </span>
            </div>
            <p style={{ margin: '2px 0 0', fontSize: '0.74rem', color: colors.textSecondary }}>
              Interactive site blueprint with live flat allocation numbers (OP 1 to OP 61) & landmark zoning
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {/* Theme Switcher */}
          <div style={{
            display: 'flex',
            background: 'rgba(0,0,0,0.08)',
            padding: 3,
            borderRadius: 8,
            border: `1px solid ${colors.roadBorder}`
          }}>
            {[
              { id: 'architectural', label: '📐 Color Master' },
              { id: 'cad', label: '⚡ CAD Dark' },
              { id: 'light', label: '🌌 Blueprint Dark' }
            ].map(t => (
              <button
                key={t.id}
                type="button"
                onClick={() => setThemeMode(t.id)}
                style={{
                  padding: '4px 9px',
                  borderRadius: 6,
                  border: 'none',
                  background: themeMode === t.id ? '#0284c7' : 'transparent',
                  color: themeMode === t.id ? '#ffffff' : colors.textSecondary,
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.15s'
                }}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Zoom Controls */}
          <div style={{ display: 'flex', background: 'rgba(0,0,0,0.08)', borderRadius: 8, border: `1px solid ${colors.roadBorder}`, overflow: 'hidden' }}>
            <button
              type="button"
              onClick={() => handleZoom(0.25)}
              style={{ padding: '6px 10px', border: 'none', background: 'transparent', color: colors.textPrimary, cursor: 'pointer' }}
              title="Zoom In"
            >
              <ZoomIn size={15} />
            </button>
            <button
              type="button"
              onClick={() => handleZoom(-0.25)}
              style={{ padding: '6px 10px', border: 'none', background: 'transparent', color: colors.textPrimary, cursor: 'pointer' }}
              title="Zoom Out"
            >
              <ZoomOut size={15} />
            </button>
            <button
              type="button"
              onClick={resetView}
              style={{ padding: '6px 10px', border: 'none', background: 'transparent', color: colors.textPrimary, cursor: 'pointer' }}
              title="Reset View"
            >
              <RotateCcw size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* ── Quick Zone Focus Bar ── */}
      <div style={{
        padding: '8px 16px',
        background: themeMode === 'architectural' ? '#e2e8f0' : '#06131c',
        borderBottom: `1px solid ${colors.roadBorder}`,
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        overflowX: 'auto'
      }}>
        <span style={{ fontSize: '0.7rem', fontWeight: 800, color: colors.textSecondary, marginRight: 4, textTransform: 'uppercase' }}>
          Navigate Zone:
        </span>
        {[
          { key: 'ALL', label: '🌐 Full Site' },
          { key: 'A_BUILDING', label: '🏢 A Building & Shops (Top)', color: '#d97706' },
          { key: 'PLAYGROUND', label: '🌳 Play Area & Temple', color: '#16a34a' },
          { key: 'B_BUILDING', label: '🏢 B Building (Middle)', color: '#2563eb' },
          { key: 'CLUBHOUSE', label: '🏊 Club House', color: '#9333ea' },
          { key: 'C_BUILDING', label: '🏢 C Building & DG (Bottom)', color: '#dc2626' }
        ].map(z => {
          const isActive = activeZone === z.key;
          return (
            <button
              key={z.key}
              type="button"
              onClick={() => focusZone(z.key)}
              style={{
                padding: '4px 10px',
                borderRadius: 20,
                border: isActive ? `1.5px solid ${z.color || '#0284c7'}` : `1px solid ${colors.roadBorder}`,
                background: isActive ? '#0284c7' : 'transparent',
                color: isActive ? '#ffffff' : colors.textSecondary,
                fontSize: '0.72rem',
                fontWeight: 700,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s'
              }}
            >
              {z.label}
            </button>
          );
        })}
      </div>

      {/* ── Interactive SVG Blueprint Canvas ── */}
      <div
        ref={containerRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{
          width: '100%',
          height: '700px',
          overflow: 'hidden',
          position: 'relative',
          background: colors.paperBg,
          cursor: isDragging ? 'grabbing' : 'grab',
          userSelect: 'none'
        }}
      >
        <svg
          viewBox="0 0 750 1100"
          style={{
            width: '100%',
            height: '100%',
            transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoomLevel})`,
            transformOrigin: 'center center',
            transition: isDragging ? 'none' : 'transform 0.22s cubic-bezier(0.16, 1, 0.3, 1)'
          }}
        >
          <defs>
            {/* Fine CAD Grid */}
            <pattern id="cadGrid" width="25" height="25" patternUnits="userSpaceOnUse">
              <path d="M 25 0 L 0 0 0 25" fill="none" stroke={colors.roadBorder} strokeWidth="0.4" opacity="0.35" />
            </pattern>

            {/* Tree Leaf Pattern for Peripheral Boundaries */}
            <pattern id="treePattern" width="16" height="16" patternUnits="userSpaceOnUse">
              <circle cx="8" cy="8" r="6" fill="#16a34a" opacity="0.35" />
            </pattern>

            {/* Pulsing Glow Filter for Matching Search */}
            <filter id="slotGlow" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="3.5" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Background Paper Plate */}
          <rect width="750" height="1100" fill={colors.paperBg} />
          <rect width="750" height="1100" fill="url(#cadGrid)" />

          {/* Outer Boundary Wall */}
          <rect x="25" y="20" width="700" height="1040" rx="10" fill="none" stroke={colors.roadBorder} strokeWidth="2.5" />

          {/* Peripheral Tree Columns (Left & Right Boundaries) */}
          {Array.from({ length: 24 }, (_, i) => (
            <g key={`tree-left-${i}`}>
              <circle cx="15" cy={50 + i * 42} r="9" fill="#22c55e" stroke="#15803d" strokeWidth="1" opacity="0.85" />
              <circle cx="735" cy={50 + i * 42} r="9" fill="#22c55e" stroke="#15803d" strokeWidth="1" opacity="0.85" />
            </g>
          ))}

          {/* ══════════════════════════════════════════════════════════════════════
              1. MAIN DRIVEWAY (LEFT CORRIDOR FROM MAIN GATE TO BOTTOM)
             ══════════════════════════════════════════════════════════════════════ */}
          {/* Main Gate (Top-Left) */}
          <g transform="translate(45, 25)">
            <rect x="0" y="0" width="130" height="50" rx="4" fill="#334155" stroke="#1e293b" strokeWidth="1.5" />
            <text x="65" y="28" fill="#f8fafc" fontSize="10" fontWeight="900" textAnchor="middle" letterSpacing="0.05em">
              🚪 MAIN GATE
            </text>
            <path d="M 10 40 L 120 40" stroke="#94a3b8" strokeWidth="2" strokeDasharray="4 3" />
          </g>

          {/* Main Driveway Asphalt Road */}
          <path d="M 50 80 L 175 80 L 175 300 L 210 330 L 210 1020 L 50 1020 Z" fill={colors.roadBg} opacity="0.6" />
          
          {/* Driveway Directional Arrow (Downwards from Gate) */}
          <g transform="translate(112, 160)">
            <line x1="0" y1="0" x2="0" y2="80" stroke="#64748b" strokeWidth="3" strokeDasharray="6 6" />
            <polygon points="-6,70 6,70 0,85" fill="#475569" />
          </g>

          {/* Driveway Text */}
          <text x="112" y="520" fill={colors.textSecondary} fontSize="11" fontWeight="800" textAnchor="middle" letterSpacing="0.08em">
            MAIN DRIVEWAY
          </text>

          {/* Driveway Directional Arrow (Upwards from Bottom) */}
          <g transform="translate(112, 600)">
            <line x1="0" y1="0" x2="0" y2="80" stroke="#64748b" strokeWidth="3" strokeDasharray="6 6" />
            <polygon points="-6,15 6,15 0,0" fill="#475569" />
          </g>

          {/* ══════════════════════════════════════════════════════════════════════
              2. OUTSIDE SHOPS (TOP CENTER: SH-1 TO SH-8)
             ══════════════════════════════════════════════════════════════════════ */}
          <g transform="translate(195, 35)">
            <rect x="0" y="0" width="350" height="52" rx="6" fill={colors.shops} stroke={colors.shopsBorder} strokeWidth="1.5" />
            <text x="175" y="16" fill={colors.textPrimary} fontSize="8.5" fontWeight="800" textAnchor="middle">
              OUTSIDE SHOP (Not part of parking)
            </text>
            {/* 8 Shops */}
            {Array.from({ length: 8 }, (_, i) => (
              <g key={`sh-${i}`} transform={`translate(${8 + i * 42}, 22)`}>
                <rect x="0" y="0" width="38" height="24" rx="3" fill="#ffffff" stroke={colors.shopsBorder} strokeWidth="1" />
                <text x="19" y="15" fill="#4338ca" fontSize="8" fontWeight="800" textAnchor="middle">
                  SH-{i + 1}
                </text>
              </g>
            ))}
          </g>

          {/* ══════════════════════════════════════════════════════════════════════
              3. "A" BUILDING (TOP TOWER) & BASEMENT FLOOR
             ══════════════════════════════════════════════════════════════════════ */}
          {/* Way to A Arrow */}
          <text x="210" y="115" fill={colors.textSecondary} fontSize="9" fontWeight="800">
            WAY TO A →
          </text>

          {/* A Building Footprint */}
          <g transform="translate(305, 110)" style={{ cursor: 'pointer' }} onClick={() => focusZone('A_BUILDING')}>
            <rect x="0" y="0" width="235" height="175" rx="8" fill={colors.buildingA} stroke={colors.buildingABorder} strokeWidth="2" />
            <rect x="15" y="15" width="205" height="145" rx="6" fill="rgba(0,0,0,0.03)" />
            <text x="117" y="85" fill="#92400e" fontSize="18" fontWeight="900" textAnchor="middle">
              A
            </text>
            <text x="117" y="105" fill="#92400e" fontSize="13" fontWeight="800" textAnchor="middle">
              Building
            </text>
            <text x="117" y="125" fill="#b45309" fontSize="8" fontWeight="700" textAnchor="middle">
              (Flats A-101 to A-1108)
            </text>
          </g>

          {/* Basement Floor Annotation (Right of A Building) */}
          <g transform="translate(565, 130)">
            <text x="35" y="30" fill={colors.textSecondary} fontSize="9.5" fontWeight="800" textAnchor="middle">
              Basement
            </text>
            <text x="35" y="44" fill={colors.textSecondary} fontSize="9.5" fontWeight="800" textAnchor="middle">
              Floor
            </text>
          </g>

          {/* ══════════════════════════════════════════════════════════════════════
              4. KIDS PLAY AREA, GAJIBO & AMBOLI / TEMPLE PLACE
             ══════════════════════════════════════════════════════════════════════ */}
          <g transform="translate(260, 365)" style={{ cursor: 'pointer' }} onClick={() => focusZone('PLAYGROUND')}>
            {/* Gajibo */}
            <g transform="translate(10, 5)">
              <polygon points="25,0 45,15 45,45 25,60 5,45 5,15" fill="#b45309" stroke="#78350f" strokeWidth="1.5" />
              <circle cx="25" cy="30" r="14" fill="#d97706" opacity="0.6" />
              <text x="25" y="70" fill={colors.textPrimary} fontSize="8" fontWeight="800" textAnchor="middle">
                Gajibo
              </text>
            </g>

            {/* Kids Play Area Lawn */}
            <rect x="75" y="5" width="220" height="60" rx="8" fill={colors.playArea} stroke={colors.playAreaBorder} strokeWidth="1.5" />
            <text x="185" y="24" fill="#15803d" fontSize="9.5" fontWeight="800" textAnchor="middle">
              🌳 Kids Play Area
            </text>
            {/* Play Equipment Icons */}
            <g transform="translate(130, 30)">
              {/* Sandpit */}
              <rect x="0" y="0" width="30" height="20" rx="3" fill="#fde68a" stroke="#d97706" strokeWidth="1" />
              <text x="15" y="13" fill="#92400e" fontSize="6.5" fontWeight="700" textAnchor="middle">SAND</text>
              {/* Slide */}
              <path d="M 45 18 L 60 5 L 65 18" fill="none" stroke="#dc2626" strokeWidth="2" />
              {/* Seesaw */}
              <line x1="78" y1="14" x2="105" y2="8" stroke="#2563eb" strokeWidth="2.5" />
              <polygon points="91,18 87,12 95,12" fill="#475569" />
            </g>

            {/* Amboli / Temple Place */}
            <g transform="translate(310, 0)">
              <rect x="0" y="0" width="80" height="70" rx="6" fill="#fef3c7" stroke="#d97706" strokeWidth="1.2" />
              <text x="40" y="32" fill="#d97706" fontSize="18" textAnchor="middle">🛕</text>
              <text x="40" y="48" fill="#92400e" fontSize="7.5" fontWeight="800" textAnchor="middle">
                Amboli /
              </text>
              <text x="40" y="58" fill="#92400e" fontSize="7.5" fontWeight="800" textAnchor="middle">
                Temple Place
              </text>
            </g>
          </g>

          {/* ══════════════════════════════════════════════════════════════════════
              5. "B" BUILDING (MIDDLE TOWER)
             ══════════════════════════════════════════════════════════════════════ */}
          {/* Way to B Arrow */}
          <text x="210" y="490" fill={colors.textSecondary} fontSize="9" fontWeight="800">
            WAY TO B →
          </text>

          {/* B Building Footprint */}
          <g transform="translate(280, 500)" style={{ cursor: 'pointer' }} onClick={() => focusZone('B_BUILDING')}>
            <rect x="0" y="0" width="330" height="125" rx="8" fill={colors.buildingB} stroke={colors.buildingBBorder} strokeWidth="2" />
            <text x="165" y="65" fill="#92400e" fontSize="18" fontWeight="900" textAnchor="middle">
              B Building
            </text>
            <text x="165" y="85" fill="#b45309" fontSize="8.5" fontWeight="700" textAnchor="middle">
              Residential Tower
            </text>
            {/* Entrance Canopy */}
            <polygon points="140,125 190,125 180,135 150,135" fill="#f59e0b" />
          </g>

          {/* ══════════════════════════════════════════════════════════════════════
              6. CLUB HOUSE
             ══════════════════════════════════════════════════════════════════════ */}
          {/* Way to Club House Arrow */}
          <text x="280" y="652" fill={colors.textSecondary} fontSize="9" fontWeight="800">
            WAY TO CLUBHOUSE →
          </text>

          {/* Club House Footprint */}
          <g transform="translate(325, 705)" style={{ cursor: 'pointer' }} onClick={() => focusZone('CLUBHOUSE')}>
            <rect x="0" y="0" width="265" height="90" rx="8" fill={colors.clubhouse} stroke={colors.clubhouseBorder} strokeWidth="2" />
            <text x="132" y="45" fill="#c2410c" fontSize="14" fontWeight="900" textAnchor="middle" letterSpacing="0.06em">
              🏊 CLUB HOUSE
            </text>
            <text x="132" y="62" fill="#ea580c" fontSize="8" fontWeight="700" textAnchor="middle">
              Swimming Pool & Community Hall
            </text>
          </g>

          {/* ══════════════════════════════════════════════════════════════════════
              7. "C" BUILDING (BOTTOM TOWER), DG ROOM, STP, OWC
             ══════════════════════════════════════════════════════════════════════ */}
          {/* OWC (Organic Waste Converter) */}
          <g transform="translate(210, 745)">
            <rect x="0" y="0" width="65" height="22" rx="3" fill={colors.utility} stroke={colors.utilityBorder} strokeWidth="1" />
            <text x="32" y="15" fill="#15803d" fontSize="8" fontWeight="800" textAnchor="middle">🌱 OWC</text>
          </g>

          {/* STP (Sewage Treatment Plant) */}
          <g transform="translate(278, 965)">
            <rect x="0" y="0" width="40" height="26" rx="3" fill={colors.utility} stroke={colors.utilityBorder} strokeWidth="1" />
            <text x="20" y="17" fill="#0284c7" fontSize="7.5" fontWeight="800" textAnchor="middle">♻️ STP</text>
          </g>

          {/* C Building Footprint */}
          <g transform="translate(330, 850)" style={{ cursor: 'pointer' }} onClick={() => focusZone('C_BUILDING')}>
            <rect x="0" y="0" width="260" height="120" rx="8" fill={colors.buildingC} stroke={colors.buildingCBorder} strokeWidth="2" />
            <text x="130" y="60" fill="#92400e" fontSize="18" fontWeight="900" textAnchor="middle">
              C
            </text>
            <text x="130" y="80" fill="#92400e" fontSize="13" fontWeight="800" textAnchor="middle">
              Building
            </text>
          </g>

          {/* DG Room (Bottom Right Corner) */}
          <g transform="translate(640, 990)">
            <rect x="0" y="0" width="58" height="34" rx="4" fill="#334155" stroke="#eab308" strokeWidth="1.5" />
            <text x="29" y="16" fill="#fef08a" fontSize="8.5" fontWeight="800" textAnchor="middle">⚡ DG</text>
            <text x="29" y="27" fill="#cbd5e1" fontSize="6" fontWeight="700" textAnchor="middle">Generator</text>
          </g>

          {/* Compass North Arrow (Bottom-Right) */}
          <g transform="translate(680, 1050)">
            <circle cx="0" cy="0" r="16" fill="none" stroke={colors.roadBorder} strokeWidth="1" />
            <polygon points="0,-14 4,0 0,-3 -4,0" fill="#dc2626" />
            <polygon points="0,14 4,0 0,3 -4,0" fill="#64748b" />
            <text x="0" y="24" fill={colors.textPrimary} fontSize="9" fontWeight="900" textAnchor="middle">N</text>
          </g>

          {/* ══════════════════════════════════════════════════════════════════════
              8. ALL 61 INTERACTIVE OPEN PARKING BAYS (OP 1 TO OP 61)
             ══════════════════════════════════════════════════════════════════════ */}
          {Object.entries(LAYOUT_61_SLOTS).map(([slotKey, slot]) => {
            const flatItem = slotToFlatMap[slotKey];
            const isAllotted = Boolean(flatItem);
            const isHighlighted = highlightedSlots.has(slotKey) || (flatItem && highlightedSlots.has(flatItem.flat?.toUpperCase()));
            const isSelected = selectedSlotKey === slotKey;

            return (
              <g
                key={slotKey}
                className="interactive-slot-bay"
                transform={`translate(${slot.x}, ${slot.y})`}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedSlotKey(slotKey);
                  if (onSelectSlot) {
                    onSelectSlot(flatItem || { parkingNo: slotKey, parkingType: 'Open Parking (OP)' });
                  }
                }}
                style={{ cursor: 'pointer' }}
                filter={isHighlighted && searchQuery ? 'url(#slotGlow)' : undefined}
              >
                {/* Bay Floor Plate */}
                <rect
                  x="0"
                  y="0"
                  width={slot.w}
                  height={slot.h}
                  rx="4"
                  fill={isAllotted 
                    ? (isHighlighted ? '#059669' : '#065f46') 
                    : (isSelected ? '#0284c7' : colors.slotVacant)}
                  stroke={isSelected 
                    ? '#38bdf8' 
                    : isHighlighted 
                      ? '#fbbf24' 
                      : isAllotted 
                        ? '#34d399' 
                        : colors.roadBorder}
                  strokeWidth={isSelected || isHighlighted ? 2 : 1}
                  strokeDasharray={isAllotted ? 'none' : '3 2'}
                />

                {/* Car Silhouette Icon inside Bay */}
                {isAllotted ? (
                  <g transform={slot.orient === 'V' 
                    ? `translate(${slot.w / 2 - 8}, ${slot.h / 2 - 12})` 
                    : `translate(${slot.w / 2 - 12}, ${slot.h / 2 - 8})`
                  }>
                    {/* Small Car representation */}
                    <rect
                      x="0"
                      y="0"
                      width={slot.orient === 'V' ? 16 : 24}
                      height={slot.orient === 'V' ? 24 : 16}
                      rx="3"
                      fill="#10b981"
                      opacity="0.9"
                    />
                    <rect
                      x={slot.orient === 'V' ? 2 : 4}
                      y={slot.orient === 'V' ? 4 : 2}
                      width={slot.orient === 'V' ? 12 : 16}
                      height={slot.orient === 'V' ? 16 : 12}
                      rx="2"
                      fill="#064e3b"
                    />
                  </g>
                ) : null}

                {/* Slot Label (e.g. OP 1, 9, 21, etc.) */}
                <text
                  x={slot.w / 2}
                  y={isAllotted ? (slot.orient === 'V' ? 9 : 9) : (slot.orient === 'V' ? slot.h / 2 - 3 : slot.h / 2 - 3)}
                  fill={isAllotted ? '#a7f3d0' : colors.textSecondary}
                  fontSize={slot.label.length > 3 ? "6.5" : "7.5"}
                  fontWeight="800"
                  textAnchor="middle"
                >
                  {slot.label}
                </text>

                {/* Allotted Flat Number (e.g. A-102, A-506, etc.) */}
                <text
                  x={slot.w / 2}
                  y={isAllotted ? (slot.orient === 'V' ? slot.h - 3 : slot.h - 3) : (slot.orient === 'V' ? slot.h / 2 + 7 : slot.h / 2 + 7)}
                  fill={isAllotted ? '#ffffff' : '#94a3b8'}
                  fontSize={isAllotted ? "7.5" : "6"}
                  fontWeight={isAllotted ? "900" : "600"}
                  textAnchor="middle"
                >
                  {isAllotted ? flatItem.flat : 'FREE'}
                </text>
              </g>
            );
          })}
        </svg>

        {/* ── Selected Slot Detail Card Popup ── */}
        {selectedSlotKey && selectedSlotData && (
          <div style={{
            position: 'absolute',
            bottom: 20,
            left: 20,
            right: 20,
            maxWidth: '430px',
            background: 'rgba(15, 23, 42, 0.96)',
            backdropFilter: 'blur(14px)',
            border: '1.5px solid #0284c7',
            borderRadius: 14,
            padding: '16px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.8)',
            zIndex: 50,
            animation: 'fadeIn 0.2s ease-out',
            color: '#f8fafc'
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
                🅿️ This open parking space is currently unallocated in society records.
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

      {/* ── Footer Legend Bar ── */}
      <div style={{
        padding: '12px 20px',
        background: themeMode === 'architectural' ? '#ffffff' : '#071620',
        borderTop: `1px solid ${colors.roadBorder}`,
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        fontSize: '0.72rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <span style={{ fontWeight: 800, color: colors.textSecondary }}>LEGEND:</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 12, height: 12, borderRadius: 3, background: '#059669', border: '1px solid #34d399' }} />
            <span>Allotted Space (Flat Assigned)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 12, height: 12, borderRadius: 3, background: colors.slotVacant, border: `1px dashed ${colors.roadBorder}` }} />
            <span>Available Open Bay</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ color: '#d97706', fontWeight: 800 }}>SH-1 to SH-8:</span>
            <span style={{ color: colors.textSecondary }}>Outside Shops</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ color: '#dc2626', fontWeight: 800 }}>⚡ DG:</span>
            <span style={{ color: colors.textSecondary }}>Bottom-Right Corner</span>
          </div>
        </div>
        <div style={{ color: colors.textSecondary, fontStyle: 'italic' }}>
          Drag to Pan • Click any Bay (OP 1–61) to View Flat
        </div>
      </div>
    </div>
  );
}
