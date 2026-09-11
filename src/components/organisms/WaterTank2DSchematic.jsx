import { useState } from 'react';
import { 
  WATER_TANKS_DATA, 
  ANCILLARY_WATER_INFRASTRUCTURE 
} from '../../data/waterTankData.js';
import { 
  Droplets, 
  Layers, 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  Flame, 
  Leaf, 
  Activity,
  ShieldCheck
} from 'lucide-react';

export default function WaterTank2DSchematic({ onSelectTank }) {
  const [selectedAssetId, setSelectedAssetId] = useState('common_underground');
  const [activeLayer, setActiveLayer] = useState('all'); // 'all' | 'domestic' | 'recycled' | 'fire'
  const [zoomLevel, setZoomLevel] = useState(1);
  const [isSimulatingFlow, setIsSimulatingFlow] = useState(true);

  const selectedTank = WATER_TANKS_DATA[selectedAssetId];
  const selectedAncillary = ANCILLARY_WATER_INFRASTRUCTURE.find(a => a.id === selectedAssetId);

  const handleSelect = (id) => {
    setSelectedAssetId(id);
    if (onSelectTank) onSelectTank(id);
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '20px',
      background: '#ffffff',
      borderRadius: '20px',
      padding: '24px',
      border: '1px solid #e2e8f0',
      boxShadow: '0 4px 24px rgba(0,0,0,0.03)'
    }}>
      {/* Controls Bar */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px',
        paddingBottom: '16px',
        borderBottom: '1px solid #f1f5f9'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            background: '#eff6ff',
            color: '#2563eb',
            padding: '8px 12px',
            borderRadius: '10px',
            fontWeight: 700,
            fontSize: '0.88rem',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            <Layers size={16} /> 2D Master Blueprint & Flow Schematic
          </div>
          <span style={{ fontSize: '0.82rem', color: '#64748b' }}>
            Interactive vector map of Society Water Network • Total 5,39,400 L
          </span>
        </div>

        {/* Pipeline Layer Filters */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
          <button
            onClick={() => setActiveLayer('all')}
            style={{
              padding: '6px 12px',
              borderRadius: '8px',
              border: activeLayer === 'all' ? '1px solid #2563eb' : '1px solid #e2e8f0',
              background: activeLayer === 'all' ? '#eff6ff' : '#ffffff',
              color: activeLayer === 'all' ? '#1d4ed8' : '#64748b',
              fontWeight: 600,
              fontSize: '0.8rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            All Systems
          </button>
          <button
            onClick={() => setActiveLayer('domestic')}
            style={{
              padding: '6px 12px',
              borderRadius: '8px',
              border: activeLayer === 'domestic' ? '1px solid #0284c7' : '1px solid #e2e8f0',
              background: activeLayer === 'domestic' ? '#f0f9ff' : '#ffffff',
              color: activeLayer === 'domestic' ? '#0284c7' : '#64748b',
              fontWeight: 600,
              fontSize: '0.8rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <Droplets size={14} color="#0284c7" /> Domestic Water
          </button>
          <button
            onClick={() => setActiveLayer('recycled')}
            style={{
              padding: '6px 12px',
              borderRadius: '8px',
              border: activeLayer === 'recycled' ? '1px solid #16a34a' : '1px solid #e2e8f0',
              background: activeLayer === 'recycled' ? '#f0fdf4' : '#ffffff',
              color: activeLayer === 'recycled' ? '#16a34a' : '#64748b',
              fontWeight: 600,
              fontSize: '0.8rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <Leaf size={14} color="#16a34a" /> STP Flushing
          </button>
          <button
            onClick={() => setActiveLayer('fire')}
            style={{
              padding: '6px 12px',
              borderRadius: '8px',
              border: activeLayer === 'fire' ? '1px solid #dc2626' : '1px solid #e2e8f0',
              background: activeLayer === 'fire' ? '#fef2f2' : '#ffffff',
              color: activeLayer === 'fire' ? '#dc2626' : '#64748b',
              fontWeight: 600,
              fontSize: '0.8rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <Flame size={14} color="#dc2626" /> Fire Reserve
          </button>

          {/* Flow Simulation Toggle */}
          <button
            onClick={() => setIsSimulatingFlow(!isSimulatingFlow)}
            style={{
              padding: '6px 12px',
              borderRadius: '8px',
              border: isSimulatingFlow ? '1px solid #8b5cf6' : '1px solid #e2e8f0',
              background: isSimulatingFlow ? '#f5f3ff' : '#ffffff',
              color: isSimulatingFlow ? '#7c3aed' : '#64748b',
              fontWeight: 600,
              fontSize: '0.8rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <Activity size={14} /> {isSimulatingFlow ? 'Flow: Active' : 'Flow: Paused'}
          </button>

          {/* Zoom controls */}
          <div style={{ display: 'flex', gap: '4px', marginLeft: '4px' }}>
            <button
              onClick={() => setZoomLevel(z => Math.min(z + 0.15, 1.6))}
              aria-label="Zoom in"
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '6px',
                border: '1px solid #e2e8f0',
                background: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer'
              }}
            >
              <ZoomIn size={15} color="#475569" />
            </button>
            <button
              onClick={() => setZoomLevel(z => Math.max(z - 0.15, 0.7))}
              aria-label="Zoom out"
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '6px',
                border: '1px solid #e2e8f0',
                background: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer'
              }}
            >
              <ZoomOut size={15} color="#475569" />
            </button>
            <button
              onClick={() => setZoomLevel(1)}
              aria-label="Reset zoom"
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '6px',
                border: '1px solid #e2e8f0',
                background: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer'
              }}
            >
              <RotateCcw size={15} color="#475569" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Schematic & Detail Panel Container */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 340px',
        gap: '20px',
        minHeight: '600px'
      }} className="schematic-grid">
        
        {/* SVG Canvas Map */}
        <div style={{
          position: 'relative',
          background: '#f8fafc',
          borderRadius: '16px',
          border: '1px solid #cbd5e1',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px'
        }}>
          
          {/* Animated CSS for Pipeline Water Flow */}
          <style>{`
            @keyframes flowDashDomestic {
              to {
                stroke-dashoffset: -40;
              }
            }
            @keyframes flowDashSTP {
              to {
                stroke-dashoffset: -30;
              }
            }
            @keyframes flowDashFire {
              to {
                stroke-dashoffset: -20;
              }
            }
            @keyframes pulseMarker {
              0% { transform: scale(1); opacity: 0.9; }
              50% { transform: scale(1.18); opacity: 0.4; }
              100% { transform: scale(1); opacity: 0.9; }
            }
            .pipe-domestic-flow {
              stroke-dasharray: 8 6;
              animation: ${isSimulatingFlow ? 'flowDashDomestic 1.2s linear infinite' : 'none'};
            }
            .pipe-stp-flow {
              stroke-dasharray: 6 6;
              animation: ${isSimulatingFlow ? 'flowDashSTP 1.8s linear infinite' : 'none'};
            }
            .pipe-fire-flow {
              stroke-dasharray: 5 5;
              animation: ${isSimulatingFlow ? 'flowDashFire 2.5s linear infinite' : 'none'};
            }
            .hotspot-node {
              cursor: pointer;
              transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
            }
            .hotspot-node:hover {
              transform: scale(1.08);
            }
            @media (max-width: 980px) {
              .schematic-grid {
                grid-template-columns: 1fr !important;
              }
            }
          `}</style>

          {/* North Direction Compass Badge */}
          <div style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            background: 'rgba(255, 255, 255, 0.92)',
            backdropFilter: 'blur(8px)',
            borderRadius: '50%',
            width: '46px',
            height: '46px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
            border: '1px solid #e2e8f0',
            zIndex: 10
          }}>
            <span style={{ fontSize: '0.65rem', fontWeight: 800, color: '#dc2626', lineHeight: 1 }}>▲ N</span>
            <span style={{ fontSize: '0.55rem', fontWeight: 600, color: '#64748b' }}>North</span>
          </div>

          {/* Site Overview Vector Map */}
          <div style={{
            transform: `scale(${zoomLevel})`,
            transformOrigin: 'center center',
            transition: 'transform 0.25s ease-out',
            width: '100%',
            display: 'flex',
            justifyContent: 'center'
          }}>
            <svg
              viewBox="0 0 700 860"
              style={{
                width: '100%',
                maxWidth: '680px',
                height: 'auto',
                filter: 'drop-shadow(0 10px 25px rgba(0,0,0,0.05))'
              }}
            >
              {/* Defs: Gradients and Markers */}
              <defs>
                <linearGradient id="roadGrad" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#cbd5e1" />
                  <stop offset="100%" stopColor="#e2e8f0" />
                </linearGradient>
                <linearGradient id="buildingGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ffffff" />
                  <stop offset="100%" stopColor="#f1f5f9" />
                </linearGradient>
                <linearGradient id="tankBlue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#38bdf8" />
                  <stop offset="100%" stopColor="#0284c7" />
                </linearGradient>
                <linearGradient id="sumpGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#0284c7" />
                  <stop offset="100%" stopColor="#0369a1" />
                </linearGradient>
              </defs>

              {/* Society Boundary Plot */}
              <rect x="20" y="20" width="660" height="820" rx="16" fill="#f8fafc" stroke="#94a3b8" strokeWidth="2.5" />
              
              {/* Outer Landscaping & Trees Perimeter */}
              <rect x="24" y="24" width="652" height="812" rx="14" fill="none" stroke="#86efac" strokeWidth="6" strokeDasharray="16 10" opacity="0.4" />

              {/* Top Row: Outside Shop & Main Gate */}
              {/* Main Gate */}
              <g onClick={() => handleSelect('tanker_inlet')} className="hotspot-node">
                <rect x="40" y="35" width="120" height="50" rx="8" fill="#1e293b" />
                <text x="100" y="58" fill="#ffffff" fontSize="10" fontWeight="700" textAnchor="middle">MAIN GATE</text>
                <text x="100" y="72" fill="#38bdf8" fontSize="8" fontWeight="600" textAnchor="middle">💧 Tanker Decanting</text>
              </g>

              {/* Outside Shops */}
              <rect x="180" y="35" width="340" height="42" rx="6" fill="#f1f5f9" stroke="#cbd5e1" strokeWidth="1.5" />
              <text x="350" y="60" fill="#475569" fontSize="11" fontWeight="700" textAnchor="middle">OUTSIDE SHOPS / COMMERCIAL</text>

              {/* Visitor Parking Bay Top Right */}
              <rect x="540" y="35" width="120" height="70" rx="6" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="1" strokeDasharray="4 4" />
              <text x="600" y="65" fill="#94a3b8" fontSize="9" fontWeight="600" textAnchor="middle">Visitor Parking</text>

              {/* Main Driveway (West Side North-South) */}
              <rect x="40" y="95" width="110" height="725" rx="10" fill="url(#roadGrad)" stroke="#cbd5e1" strokeWidth="1" />
              
              {/* Road markings */}
              <line x1="95" y1="110" x2="95" y2="800" stroke="#ffffff" strokeWidth="2" strokeDasharray="16 14" opacity="0.8" />
              <text x="95" y="440" fill="#64748b" fontSize="11" fontWeight="700" textAnchor="middle" transform="rotate(-90 95 440)">MAIN DRIVEWAY & TANKER ROUTE</text>

              {/* Left Side Utilities on Driveway: OWC & STP */}
              {/* OWC */}
              <g onClick={() => handleSelect('owc')} className="hotspot-node">
                <rect x="165" y="580" width="80" height="45" rx="8" fill="#f7fee7" stroke="#84cc16" strokeWidth="1.5" />
                <text x="205" y="602" fill="#3f6212" fontSize="11" fontWeight="700" textAnchor="middle">🌱 OWC</text>
                <text x="205" y="616" fill="#65a30d" fontSize="8" textAnchor="middle">Organic Waste</text>
              </g>

              {/* STP */}
              <g onClick={() => handleSelect('stp')} className="hotspot-node">
                <rect x="165" y="640" width="80" height="55" rx="8" fill="#f0fdf4" stroke="#16a34a" strokeWidth="2" />
                <text x="205" y="663" fill="#15803d" fontSize="12" fontWeight="700" textAnchor="middle">♻️ STP</text>
                <text x="205" y="677" fill="#16a34a" fontSize="8" fontWeight="600" textAnchor="middle">75 KLD Treated</text>
                <text x="205" y="688" fill="#4ade80" fontSize="7" textAnchor="middle">Flushing Return</text>
              </g>

              {/* DG Generator at South-East Corner */}
              <g onClick={() => handleSelect('dg_backup')} className="hotspot-node">
                <rect x="560" y="740" width="100" height="70" rx="8" fill="#fef3c7" stroke="#f59e0b" strokeWidth="1.5" />
                <text x="610" y="768" fill="#b45309" fontSize="11" fontWeight="700" textAnchor="middle">⚡ DG GENERATOR</text>
                <text x="610" y="784" fill="#92400e" fontSize="9" textAnchor="middle">125 KVA Backup</text>
                <text x="610" y="798" fill="#d97706" fontSize="8" fontWeight="600" textAnchor="middle">Auto-Pump Power</text>
              </g>

              {/* ───────────────────────────────────────────────────────────── */}
              {/* MAIN BUILDINGS & WATER TANKS                                  */}
              {/* ───────────────────────────────────────────────────────────── */}

              {/* 1. A BUILDING (North) */}
              <g onClick={() => handleSelect('a_building')} className="hotspot-node">
                {/* Building Block */}
                <rect 
                  x="240" 
                  y="105" 
                  width="280" 
                  height="125" 
                  rx="10" 
                  fill="url(#buildingGrad)" 
                  stroke={selectedAssetId === 'a_building' ? '#2563eb' : '#94a3b8'} 
                  strokeWidth={selectedAssetId === 'a_building' ? '3' : '1.5'} 
                />
                <rect x="250" y="115" width="260" height="105" rx="6" fill="#f8fafc" stroke="#e2e8f0" strokeWidth="1" />
                
                {/* 5 Rooftop Overhead Tanks */}
                <g>
                  <circle cx="280" cy="138" r="9" fill="url(#tankBlue)" stroke="#0369a1" strokeWidth="1" />
                  <circle cx="315" cy="138" r="9" fill="url(#tankBlue)" stroke="#0369a1" strokeWidth="1" />
                  <circle cx="380" cy="138" r="9" fill="url(#tankBlue)" stroke="#0369a1" strokeWidth="1" />
                  <circle cx="445" cy="138" r="9" fill="url(#tankBlue)" stroke="#0369a1" strokeWidth="1" />
                  <circle cx="480" cy="138" r="9" fill="url(#tankBlue)" stroke="#0369a1" strokeWidth="1" />
                </g>

                <rect x="300" y="165" width="160" height="42" rx="6" fill="#ffffff" stroke="#2563eb" strokeWidth="1" />
                <text x="380" y="182" fill="#1e3a8a" fontSize="13" fontWeight="800" textAnchor="middle">A BUILDING</text>
                <text x="380" y="198" fill="#2563eb" fontSize="11" fontWeight="700" textAnchor="middle">75,800 Litres</text>
                
                {/* Status indicator badge */}
                <circle cx="510" cy="115" r="7" fill="#10b981" stroke="#ffffff" strokeWidth="1.5" />
                <text x="510" y="118" fill="#ffffff" fontSize="8" fontWeight="800" textAnchor="middle">✓</text>
              </g>

              {/* 2. CENTRAL AMENITY ZONE: Kids Play Area, MP Theater & COMMON UNDERGROUND WATER TANK */}
              {/* Kids Play Area (Left) */}
              <rect x="220" y="250" width="95" height="85" rx="8" fill="#fef2f2" stroke="#fca5a5" strokeWidth="1" />
              <text x="267" y="285" fill="#b91c1c" fontSize="10" fontWeight="700" textAnchor="middle">🎡 Play Area</text>
              <text x="267" y="302" fill="#ef4444" fontSize="8" textAnchor="middle">Kids Garden</text>

              {/* MP Theater (Right) */}
              <rect x="475" y="250" width="95" height="85" rx="8" fill="#f5f3ff" stroke="#c4b5fd" strokeWidth="1" />
              <text x="522" y="285" fill="#6d28d9" fontSize="10" fontWeight="700" textAnchor="middle">🎭 MP Theater</text>
              <text x="522" y="302" fill="#7c3aed" fontSize="8" textAnchor="middle">Mini Hall</text>

              {/* COMMON WATER TANK (UNDERGROUND) - Central */}
              <g onClick={() => handleSelect('common_underground')} className="hotspot-node">
                {/* Outer Sump Perimeter */}
                <rect 
                  x="325" 
                  y="245" 
                  width="140" 
                  height="95" 
                  rx="12" 
                  fill="#f0f9ff" 
                  stroke={selectedAssetId === 'common_underground' ? '#0284c7' : '#0369a1'} 
                  strokeWidth={selectedAssetId === 'common_underground' ? '3.5' : '2'} 
                />
                
                {/* 4 Underground Storage Chambers */}
                <rect x="333" y="253" width="58" height="38" rx="4" fill="url(#sumpGrad)" opacity="0.9" />
                <rect x="397" y="253" width="58" height="38" rx="4" fill="url(#sumpGrad)" opacity="0.9" />
                <rect x="333" y="295" width="58" height="38" rx="4" fill="url(#sumpGrad)" opacity="0.9" />
                <rect x="397" y="295" width="58" height="38" rx="4" fill="#dc2626" opacity="0.85" /> {/* Fire reserve */}

                <text x="362" y="276" fill="#ffffff" fontSize="8" fontWeight="700" textAnchor="middle">CH-1</text>
                <text x="426" y="276" fill="#ffffff" fontSize="8" fontWeight="700" textAnchor="middle">CH-2</text>
                <text x="362" y="318" fill="#ffffff" fontSize="8" fontWeight="700" textAnchor="middle">CH-3</text>
                <text x="426" y="318" fill="#ffffff" fontSize="8" fontWeight="700" textAnchor="middle">FIRE 100K</text>

                <rect x="320" y="344" width="150" height="40" rx="6" fill="#ffffff" stroke="#0284c7" strokeWidth="1.5" />
                <text x="395" y="358" fill="#0369a1" fontSize="10" fontWeight="800" textAnchor="middle">COMMON UNDERGROUND</text>
                <text x="395" y="372" fill="#0284c7" fontSize="12" fontWeight="800" textAnchor="middle">325,000 Litres</text>
                <text x="395" y="382" fill="#64748b" fontSize="7" textAnchor="middle">4 Chambers • Booster Pump Room</text>
              </g>

              {/* 3. B BUILDING (Middle) */}
              <g onClick={() => handleSelect('b_building')} className="hotspot-node">
                <rect 
                  x="240" 
                  y="405" 
                  width="280" 
                  height="125" 
                  rx="10" 
                  fill="url(#buildingGrad)" 
                  stroke={selectedAssetId === 'b_building' ? '#0284c7' : '#94a3b8'} 
                  strokeWidth={selectedAssetId === 'b_building' ? '3' : '1.5'} 
                />
                <rect x="250" y="415" width="260" height="105" rx="6" fill="#f8fafc" stroke="#e2e8f0" strokeWidth="1" />
                
                {/* 6 Rooftop Overhead Tanks */}
                <g>
                  <circle cx="270" cy="438" r="9" fill="url(#tankBlue)" stroke="#0369a1" strokeWidth="1" />
                  <circle cx="305" cy="438" r="9" fill="url(#tankBlue)" stroke="#0369a1" strokeWidth="1" />
                  <circle cx="340" cy="438" r="9" fill="url(#tankBlue)" stroke="#0369a1" strokeWidth="1" />
                  <circle cx="420" cy="438" r="9" fill="url(#tankBlue)" stroke="#0369a1" strokeWidth="1" />
                  <circle cx="455" cy="438" r="9" fill="url(#tankBlue)" stroke="#0369a1" strokeWidth="1" />
                  <circle cx="490" cy="438" r="9" fill="url(#tankBlue)" stroke="#0369a1" strokeWidth="1" />
                </g>

                <rect x="300" y="465" width="160" height="42" rx="6" fill="#ffffff" stroke="#0284c7" strokeWidth="1" />
                <text x="380" y="482" fill="#0369a1" fontSize="13" fontWeight="800" textAnchor="middle">B BUILDING</text>
                <text x="380" y="498" fill="#0284c7" fontSize="11" fontWeight="700" textAnchor="middle">88,600 Litres</text>

                <circle cx="510" cy="415" r="7" fill="#10b981" stroke="#ffffff" strokeWidth="1.5" />
                <text x="510" y="418" fill="#ffffff" fontSize="8" fontWeight="800" textAnchor="middle">✓</text>
              </g>

              {/* 4. CLUB HOUSE & SWIMMING POOL */}
              <g onClick={() => handleSelect('clubhouse_pool')} className="hotspot-node">
                <rect x="255" y="555" width="250" height="75" rx="8" fill="#f8fafc" stroke="#38bdf8" strokeWidth="1.5" />
                
                {/* Pool Basin */}
                <rect x="270" y="565" width="80" height="55" rx="6" fill="#06b6d4" stroke="#0891b2" strokeWidth="1.5" />
                <text x="310" y="597" fill="#ffffff" fontSize="10" fontWeight="700" textAnchor="middle">🏊 Pool</text>
                <text x="310" y="609" fill="#cffafe" fontSize="7" textAnchor="middle">85,000 L</text>

                {/* Community Hall */}
                <text x="420" y="588" fill="#0f172a" fontSize="12" fontWeight="800" textAnchor="middle">CLUB HOUSE</text>
                <text x="420" y="604" fill="#64748b" fontSize="9" textAnchor="middle">Community Hall & Gym</text>
              </g>

              {/* 5. C BUILDING (South) */}
              <g onClick={() => handleSelect('c_building')} className="hotspot-node">
                <rect 
                  x="240" 
                  y="655" 
                  width="280" 
                  height="125" 
                  rx="10" 
                  fill="url(#buildingGrad)" 
                  stroke={selectedAssetId === 'c_building' ? '#059669' : '#94a3b8'} 
                  strokeWidth={selectedAssetId === 'c_building' ? '3' : '1.5'} 
                />
                <rect x="250" y="665" width="260" height="105" rx="6" fill="#f8fafc" stroke="#e2e8f0" strokeWidth="1" />
                
                {/* 5 Rooftop Overhead Tanks */}
                <g>
                  <circle cx="280" cy="688" r="9" fill="url(#tankBlue)" stroke="#0369a1" strokeWidth="1" />
                  <circle cx="315" cy="688" r="9" fill="url(#tankBlue)" stroke="#0369a1" strokeWidth="1" />
                  <circle cx="350" cy="688" r="9" fill="url(#tankBlue)" stroke="#0369a1" strokeWidth="1" />
                  <circle cx="430" cy="688" r="9" fill="url(#tankBlue)" stroke="#0369a1" strokeWidth="1" />
                  <circle cx="470" cy="688" r="9" fill="url(#tankBlue)" stroke="#0369a1" strokeWidth="1" />
                </g>

                <rect x="300" y="715" width="160" height="42" rx="6" fill="#ffffff" stroke="#059669" strokeWidth="1" />
                <text x="380" y="732" fill="#065f46" fontSize="13" fontWeight="800" textAnchor="middle">C BUILDING</text>
                <text x="380" y="748" fill="#059669" fontSize="11" fontWeight="700" textAnchor="middle">50,000 Litres</text>

                <circle cx="510" cy="665" r="7" fill="#10b981" stroke="#ffffff" strokeWidth="1.5" />
                <text x="510" y="668" fill="#ffffff" fontSize="8" fontWeight="800" textAnchor="middle">✓</text>
              </g>

              {/* ───────────────────────────────────────────────────────────── */}
              {/* ANIMATED PIPELINE NETWORK                                      */}
              {/* ───────────────────────────────────────────────────────────── */}

              {/* 1. TANKER DECANTING INLET PIPE (Gate -> Underground Sump) */}
              {(activeLayer === 'all' || activeLayer === 'domestic') && (
                <g>
                  <path
                    d="M 160 60 L 210 60 L 210 270 L 325 270"
                    fill="none"
                    stroke="#0284c7"
                    strokeWidth="5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M 160 60 L 210 60 L 210 270 L 325 270"
                    fill="none"
                    stroke="#bae6fd"
                    strokeWidth="2.5"
                    className="pipe-domestic-flow"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <text x="200" y="150" fill="#0284c7" fontSize="8" fontWeight="700" textAnchor="end" transform="rotate(-90 200 150)">
                    Tanker Decanting Line (100mm)
                  </text>
                </g>
              )}

              {/* 2. PUMP TO A BUILDING OVERHEAD TANK (Underground Sump -> A Building) */}
              {(activeLayer === 'all' || activeLayer === 'domestic') && (
                <g>
                  <path
                    d="M 395 245 L 395 220 L 380 220 L 380 230"
                    fill="none"
                    stroke="#2563eb"
                    strokeWidth="5"
                  />
                  <path
                    d="M 395 245 L 395 230"
                    fill="none"
                    stroke="#93c5fd"
                    strokeWidth="2.5"
                    className="pipe-domestic-flow"
                  />
                  <text x="402" y="240" fill="#2563eb" fontSize="8" fontWeight="700">Riser A (75mm)</text>
                </g>
              )}

              {/* 3. PUMP TO B BUILDING OVERHEAD TANK (Underground Sump -> B Building) */}
              {(activeLayer === 'all' || activeLayer === 'domestic') && (
                <g>
                  <path
                    d="M 395 385 L 395 405"
                    fill="none"
                    stroke="#0284c7"
                    strokeWidth="5"
                  />
                  <path
                    d="M 395 385 L 395 405"
                    fill="none"
                    stroke="#7dd3fc"
                    strokeWidth="2.5"
                    className="pipe-domestic-flow"
                  />
                  <text x="402" y="398" fill="#0284c7" fontSize="8" fontWeight="700">Riser B (75mm)</text>
                </g>
              )}

              {/* 4. PUMP TO C BUILDING OVERHEAD TANK (Underground Sump -> C Building) */}
              {(activeLayer === 'all' || activeLayer === 'domestic') && (
                <g>
                  <path
                    d="M 465 295 L 530 295 L 530 680 L 520 680"
                    fill="none"
                    stroke="#059669"
                    strokeWidth="4.5"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M 465 295 L 530 295 L 530 680 L 520 680"
                    fill="none"
                    stroke="#a7f3d0"
                    strokeWidth="2"
                    className="pipe-domestic-flow"
                    strokeLinejoin="round"
                  />
                  <text x="538" y="470" fill="#059669" fontSize="8" fontWeight="700" transform="rotate(90 538 470)">
                    Riser C Main (65mm)
                  </text>
                </g>
              )}

              {/* 5. STP RECYCLED WATER LINE (STP -> Flushing Line & Gardens) */}
              {(activeLayer === 'all' || activeLayer === 'recycled') && (
                <g>
                  <path
                    d="M 245 660 L 280 660 L 280 730 L 300 730"
                    fill="none"
                    stroke="#16a34a"
                    strokeWidth="3.5"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M 245 660 L 280 660 L 280 730 L 300 730"
                    fill="none"
                    stroke="#86efac"
                    strokeWidth="1.8"
                    className="pipe-stp-flow"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M 280 660 L 280 480 L 300 480"
                    fill="none"
                    stroke="#16a34a"
                    strokeWidth="3.5"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M 280 660 L 280 480 L 300 480"
                    fill="none"
                    stroke="#86efac"
                    strokeWidth="1.8"
                    className="pipe-stp-flow"
                    strokeLinejoin="round"
                  />
                  <text x="272" y="550" fill="#15803d" fontSize="7" fontWeight="700" transform="rotate(-90 272 550)">
                    STP Treated Flush Line (50mm)
                  </text>
                </g>
              )}

              {/* 6. FIRE HYDRANT RING MAIN (Dedicated 100,000 L) */}
              {(activeLayer === 'all' || activeLayer === 'fire') && (
                <g>
                  <rect
                    x="215"
                    y="95"
                    width="350"
                    height="700"
                    rx="18"
                    fill="none"
                    stroke="#ef4444"
                    strokeWidth="2"
                    strokeDasharray="8 6"
                    className="pipe-fire-flow"
                  />
                  <circle cx="215" cy="95" r="5" fill="#dc2626" />
                  <circle cx="565" cy="95" r="5" fill="#dc2626" />
                  <circle cx="215" cy="795" r="5" fill="#dc2626" />
                  <circle cx="565" cy="795" r="5" fill="#dc2626" />
                  <text x="390" y="808" fill="#dc2626" fontSize="8" fontWeight="700" textAnchor="middle">
                    🔥 Fire Fighting Ring Main (150mm MS Pipe - 100,000L Dedicated Sump Reserve)
                  </text>
                </g>
              )}

              {/* Water Capacity Invoice Summary Box (Bottom Left matching image) */}
              <g>
                <rect x="35" y="695" width="190" height="125" rx="8" fill="#ffffff" stroke="#cbd5e1" strokeWidth="1.5" />
                <rect x="35" y="695" width="190" height="24" rx="8" fill="#0f172a" />
                <text x="130" y="711" fill="#ffffff" fontSize="8" fontWeight="700" textAnchor="middle">WATER TANK CAPACITY (Invoices)</text>
                
                {/* Table Rows */}
                <rect x="42" y="723" width="70" height="15" rx="3" fill="#2563eb" />
                <text x="77" y="734" fill="#ffffff" fontSize="7" fontWeight="700" textAnchor="middle">A Building</text>
                <text x="215" y="734" fill="#1e293b" fontSize="8" fontWeight="700" textAnchor="end">75,800 Litres</text>

                <rect x="42" y="741" width="70" height="15" rx="3" fill="#b45309" />
                <text x="77" y="752" fill="#ffffff" fontSize="7" fontWeight="700" textAnchor="middle">B Building</text>
                <text x="215" y="752" fill="#1e293b" fontSize="8" fontWeight="700" textAnchor="end">88,600 Litres</text>

                <rect x="42" y="759" width="70" height="15" rx="3" fill="#059669" />
                <text x="77" y="770" fill="#ffffff" fontSize="7" fontWeight="700" textAnchor="middle">C Building</text>
                <text x="215" y="770" fill="#1e293b" fontSize="8" fontWeight="700" textAnchor="end">50,000 Litres</text>

                <rect x="42" y="777" width="70" height="15" rx="3" fill="#6d28d9" />
                <text x="77" y="788" fill="#ffffff" fontSize="6.5" fontWeight="700" textAnchor="middle">Common (UG)</text>
                <text x="215" y="788" fill="#1e293b" fontSize="8" fontWeight="700" textAnchor="end">325,000 Litres</text>

                <line x1="42" y1="797" x2="215" y2="797" stroke="#e2e8f0" strokeWidth="1" />
                <text x="77" y="811" fill="#0f172a" fontSize="8" fontWeight="800" textAnchor="middle">Total</text>
                <text x="215" y="811" fill="#0284c7" fontSize="10" fontWeight="900" textAnchor="end">539,400 Litres</text>
              </g>

            </svg>
          </div>
        </div>

        {/* Selected Asset Inspection Card (Right Sidebar) */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          background: '#f8fafc',
          borderRadius: '16px',
          padding: '20px',
          border: '1px solid #e2e8f0'
        }}>
          {selectedTank ? (
            <>
              {/* Header */}
              <div style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px',
                paddingBottom: '14px',
                borderBottom: '1px solid #e2e8f0'
              }}>
                <div style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '10px',
                  background: selectedTank.color,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.4rem',
                  boxShadow: '0 4px 10px rgba(0,0,0,0.1)'
                }}>
                  {selectedTank.icon}
                </div>
                <div>
                  <h3 style={{ margin: '0 0 4px', fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>
                    {selectedTank.name}
                  </h3>
                  <p style={{ margin: 0, fontSize: '0.78rem', color: '#64748b' }}>
                    {selectedTank.location}
                  </p>
                </div>
              </div>

              {/* Key Metrics */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '10px'
              }}>
                <div style={{
                  background: '#ffffff',
                  padding: '12px',
                  borderRadius: '10px',
                  border: '1px solid #e2e8f0'
                }}>
                  <span style={{ fontSize: '0.72rem', color: '#64748b', display: 'block', marginBottom: '4px' }}>
                    Invoice Capacity
                  </span>
                  <strong style={{ fontSize: '1.1rem', color: '#0f172a', fontWeight: 800 }}>
                    {selectedTank.capacity.toLocaleString('en-IN')} L
                  </strong>
                </div>

                <div style={{
                  background: '#ffffff',
                  padding: '12px',
                  borderRadius: '10px',
                  border: '1px solid #e2e8f0'
                }}>
                  <span style={{ fontSize: '0.72rem', color: '#64748b', display: 'block', marginBottom: '4px' }}>
                    Current Water Level
                  </span>
                  <strong style={{ fontSize: '1.1rem', color: selectedTank.color, fontWeight: 800 }}>
                    {selectedTank.currentLevelPct}% Full
                  </strong>
                </div>
              </div>

              {/* Visual Liquid Level Progress */}
              <div style={{
                background: '#ffffff',
                padding: '14px',
                borderRadius: '12px',
                border: '1px solid #e2e8f0'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '0.8rem' }}>
                  <span style={{ color: '#64748b' }}>Estimated Remaining Volume:</span>
                  <strong style={{ color: '#0f172a' }}>{selectedTank.currentLitres.toLocaleString('en-IN')} L</strong>
                </div>
                <div style={{
                  width: '100%',
                  height: '10px',
                  background: '#e2e8f0',
                  borderRadius: '999px',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    width: `${selectedTank.currentLevelPct}%`,
                    height: '100%',
                    background: selectedTank.gradient,
                    borderRadius: '999px',
                    transition: 'width 0.4s'
                  }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px', fontSize: '0.72rem', color: '#94a3b8' }}>
                  <span>Empty (0 L)</span>
                  <span>Sensor: {selectedTank.sensorTelemetry.currentDepthMeters}m depth</span>
                  <span>Full ({selectedTank.capacity.toLocaleString('en-IN')} L)</span>
                </div>
              </div>

              {/* Chambers Breakdown */}
              <div>
                <h4 style={{ margin: '0 0 8px', fontSize: '0.82rem', fontWeight: 700, color: '#334155' }}>
                  Chambers / Storage Units ({selectedTank.tanksCount} Units)
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {selectedTank.chambers.map((c, i) => (
                    <div key={i} style={{
                      background: '#ffffff',
                      padding: '8px 10px',
                      borderRadius: '8px',
                      border: '1px solid #e2e8f0',
                      fontSize: '0.75rem'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600, color: '#0f172a' }}>
                        <span>{c.name}</span>
                        <span>{c.capacity.toLocaleString('en-IN')} L ({c.currentPct}%)</span>
                      </div>
                      <div style={{ color: '#64748b', fontSize: '0.7rem', marginTop: '2px' }}>
                        {c.purpose}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Pump & Supply Line Details */}
              <div style={{
                background: '#eff6ff',
                padding: '12px',
                borderRadius: '10px',
                border: '1px solid #bfdbfe',
                fontSize: '0.78rem'
              }}>
                <div style={{ fontWeight: 700, color: '#1e40af', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <ShieldCheck size={14} /> Supply & Telemetry
                </div>
                <div style={{ color: '#1e3a8a', lineHeight: 1.4 }}>
                  <strong>Inflow:</strong> {selectedTank.inflowSources.join(', ')}<br />
                  <strong>Outflow:</strong> {selectedTank.outflowTo.join(', ')}<br />
                  <strong>Sensor:</strong> {selectedTank.sensorTelemetry.sensorType}
                </div>
              </div>

              {/* Cleaning & Hygiene Record */}
              <div style={{
                background: '#ffffff',
                padding: '12px',
                borderRadius: '10px',
                border: '1px solid #e2e8f0',
                fontSize: '0.75rem'
              }}>
                <div style={{ fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                  🧼 Hygiene & Compliance Status
                </div>
                <div style={{ color: '#475569', lineHeight: 1.5 }}>
                  Last Cleaned: <strong>{selectedTank.cleaningInfo.lastCleaned}</strong><br />
                  Next Due: <strong style={{ color: '#d97706' }}>{selectedTank.cleaningInfo.nextDue}</strong><br />
                  Water Quality: TDS <strong>{selectedTank.cleaningInfo.tdsPpm} ppm</strong> • pH <strong>{selectedTank.cleaningInfo.phValue}</strong>
                </div>
              </div>
            </>
          ) : selectedAncillary ? (
            <>
              {/* Ancillary detail card */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                paddingBottom: '14px',
                borderBottom: '1px solid #e2e8f0'
              }}>
                <div style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '10px',
                  background: selectedAncillary.color,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  fontWeight: 700
                }}>
                  ⚙️
                </div>
                <div>
                  <h3 style={{ margin: '0 0 2px', fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>
                    {selectedAncillary.name}
                  </h3>
                  <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Code: {selectedAncillary.code}</span>
                </div>
              </div>

              <div style={{ background: '#ffffff', padding: '12px', borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: '0.8rem' }}>
                <span style={{ color: '#64748b', display: 'block' }}>Capacity / Rating:</span>
                <strong style={{ fontSize: '1rem', color: '#0f172a' }}>{selectedAncillary.capacity}</strong>
              </div>

              <div style={{ background: '#ffffff', padding: '12px', borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: '0.8rem' }}>
                <span style={{ color: '#64748b', display: 'block' }}>Operational Status:</span>
                <strong style={{ color: '#16a34a' }}>● {selectedAncillary.status}</strong>
              </div>

              <div style={{ background: '#ffffff', padding: '12px', borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: '0.78rem', color: '#475569', lineHeight: 1.5 }}>
                <strong>Location:</strong> {selectedAncillary.location}
              </div>
            </>
          ) : (
            <div style={{ padding: '30px', textAlign: 'center', color: '#64748b' }}>
              Select a water tank or asset on the map to inspect details.
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
