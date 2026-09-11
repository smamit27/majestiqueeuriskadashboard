import { useState } from 'react';
import { 
  Sun, 
  Moon, 
  Sunset,
  RotateCcw, 
  ZoomIn, 
  ZoomOut, 
  Download, 
  Eye, 
  Box,
  Compass,
  Sparkles
} from 'lucide-react';

export default function WaterTank3DDiagram({ onSelectTank }) {
  // Mode: '3d_interactive' | 'master_render'
  const [viewSubMode, setViewSubMode] = useState('3d_interactive');
  
  // Camera state for 3D model
  const [cameraPitch, setCameraPitch] = useState(52);
  const [cameraYaw, setCameraYaw] = useState(-20);
  const [zoomLevel, setZoomLevel] = useState(0.95);
  const [panOffset, setPanOffset] = useState({ x: 0, y: -10 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [lightingMode, setLightingMode] = useState('dusk'); // 'daylight' | 'dusk' | 'cyberpunk'
  const [activeHighlight, setActiveHighlight] = useState('common_underground');
  const [renderZoom, setRenderZoom] = useState(1);

  // Drag-to-rotate/pan handlers
  const handleMouseDown = (e) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    const deltaX = e.clientX - dragStart.x;
    const deltaY = e.clientY - dragStart.y;

    if (e.shiftKey) {
      // Pan
      setPanOffset(p => ({ x: p.x + deltaX * 0.8, y: p.y + deltaY * 0.8 }));
    } else {
      // Orbit rotate
      setCameraYaw(y => (y + deltaX * 0.4) % 360);
      setCameraPitch(p => Math.min(Math.max(p - deltaY * 0.3, 15), 85));
    }
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Preset Views
  const applyPreset = (preset) => {
    switch (preset) {
      case 'iso':
        setCameraPitch(52);
        setCameraYaw(-20);
        setZoomLevel(0.95);
        setPanOffset({ x: 0, y: -10 });
        break;
      case 'underground':
        setCameraPitch(35);
        setCameraYaw(-10);
        setZoomLevel(1.35);
        setPanOffset({ x: 0, y: -30 });
        setActiveHighlight('common_underground');
        break;
      case 'terrace':
        setCameraPitch(68);
        setCameraYaw(-35);
        setZoomLevel(1.2);
        setPanOffset({ x: 0, y: 0 });
        setActiveHighlight('a_building');
        break;
      case 'topdown':
        setCameraPitch(85);
        setCameraYaw(0);
        setZoomLevel(0.9);
        setPanOffset({ x: 0, y: 0 });
        break;
      default:
        break;
    }
  };

  const handleDownloadImage = () => {
    const link = document.createElement('a');
    link.href = '/visuals/water_tank_3d_layout.jpg';
    link.download = 'Majestique_Euriska_3D_Water_Tank_Architecture_Layout.jpg';
    link.click();
  };

  // Environment styling based on lighting mode
  const getLightingStyles = () => {
    switch (lightingMode) {
      case 'daylight':
        return {
          bg: 'linear-gradient(135deg, #f0fdf4 0%, #e0f2fe 50%, #f8fafc 100%)',
          cardBg: '#ffffff',
          textColor: '#0f172a',
          groundColor: '#cbd5e1',
          roadColor: '#94a3b8',
          buildingColor: '#f1f5f9',
          waterGlow: '0 0 15px rgba(56, 189, 248, 0.6)',
          shadow: 'rgba(0, 0, 0, 0.15)'
        };
      case 'cyberpunk':
        return {
          bg: 'radial-gradient(circle at center, #0a1329 0%, #030712 100%)',
          cardBg: 'rgba(15, 23, 42, 0.95)',
          textColor: '#f8fafc',
          groundColor: '#1e293b',
          roadColor: '#0f172a',
          buildingColor: '#1e293b',
          waterGlow: '0 0 25px rgba(56, 189, 248, 0.95), 0 0 45px rgba(2, 132, 199, 0.6)',
          shadow: 'rgba(0, 0, 0, 0.6)'
        };
      case 'dusk':
      default:
        return {
          bg: 'linear-gradient(180deg, #0f172a 0%, #1e1b4b 60%, #311042 100%)',
          cardBg: 'rgba(30, 41, 59, 0.95)',
          textColor: '#f8fafc',
          groundColor: '#334155',
          roadColor: '#1e293b',
          buildingColor: '#475569',
          waterGlow: '0 0 20px rgba(56, 189, 248, 0.8)',
          shadow: 'rgba(0, 0, 0, 0.4)'
        };
    }
  };

  const theme = getLightingStyles();

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
      {/* View Switcher and Controls */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px',
        paddingBottom: '16px',
        borderBottom: '1px solid #f1f5f9'
      }}>
        {/* Sub-mode tabs */}
        <div style={{
          display: 'flex',
          background: '#f1f5f9',
          padding: '4px',
          borderRadius: '12px',
          gap: '4px'
        }}>
          <button
            onClick={() => setViewSubMode('3d_interactive')}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: 'none',
              background: viewSubMode === '3d_interactive' ? '#0284c7' : 'transparent',
              color: viewSubMode === '3d_interactive' ? '#ffffff' : '#64748b',
              fontWeight: 700,
              fontSize: '0.85rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.2s'
            }}
          >
            <Box size={16} /> 3D Spatial Interactive Model
          </button>
          <button
            onClick={() => setViewSubMode('master_render')}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: 'none',
              background: viewSubMode === 'master_render' ? '#0284c7' : 'transparent',
              color: viewSubMode === 'master_render' ? '#ffffff' : '#64748b',
              fontWeight: 700,
              fontSize: '0.85rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.2s'
            }}
          >
            <Eye size={16} /> Master Architectural 3D Plan (High-Res)
          </button>
        </div>

        {/* Action / Lighting Bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {viewSubMode === '3d_interactive' && (
            <>
              {/* Camera Presets */}
              <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>Camera:</span>
              <button
                onClick={() => applyPreset('iso')}
                style={{
                  padding: '6px 10px',
                  borderRadius: '6px',
                  border: '1px solid #e2e8f0',
                  background: '#ffffff',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Isometric
              </button>
              <button
                onClick={() => applyPreset('underground')}
                style={{
                  padding: '6px 10px',
                  borderRadius: '6px',
                  border: '1px solid #e2e8f0',
                  background: '#ffffff',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Sump Focus
              </button>
              <button
                onClick={() => applyPreset('terrace')}
                style={{
                  padding: '6px 10px',
                  borderRadius: '6px',
                  border: '1px solid #e2e8f0',
                  background: '#ffffff',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Rooftop Tanks
              </button>
              <button
                onClick={() => applyPreset('topdown')}
                style={{
                  padding: '6px 10px',
                  borderRadius: '6px',
                  border: '1px solid #e2e8f0',
                  background: '#ffffff',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Site Plan
              </button>

              {/* Lighting toggles */}
              <div style={{
                display: 'flex',
                background: '#f1f5f9',
                borderRadius: '8px',
                padding: '2px',
                marginLeft: '6px'
              }}>
                <button
                  onClick={() => setLightingMode('daylight')}
                  title="Daylight Mode"
                  style={{
                    padding: '6px',
                    borderRadius: '6px',
                    border: 'none',
                    background: lightingMode === 'daylight' ? '#ffffff' : 'transparent',
                    cursor: 'pointer'
                  }}
                >
                  <Sun size={15} color={lightingMode === 'daylight' ? '#f59e0b' : '#64748b'} />
                </button>
                <button
                  onClick={() => setLightingMode('dusk')}
                  title="Dusk / Twilight Mode"
                  style={{
                    padding: '6px',
                    borderRadius: '6px',
                    border: 'none',
                    background: lightingMode === 'dusk' ? '#ffffff' : 'transparent',
                    cursor: 'pointer'
                  }}
                >
                  <Sunset size={15} color={lightingMode === 'dusk' ? '#8b5cf6' : '#64748b'} />
                </button>
                <button
                  onClick={() => setLightingMode('cyberpunk')}
                  title="Night Luminescent Mode"
                  style={{
                    padding: '6px',
                    borderRadius: '6px',
                    border: 'none',
                    background: lightingMode === 'cyberpunk' ? '#ffffff' : 'transparent',
                    cursor: 'pointer'
                  }}
                >
                  <Moon size={15} color={lightingMode === 'cyberpunk' ? '#0ea5e9' : '#64748b'} />
                </button>
              </div>
            </>
          )}

          {/* Download Original Layout Image */}
          <button
            onClick={handleDownloadImage}
            style={{
              padding: '6px 14px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              background: '#ffffff',
              color: '#1e293b',
              fontWeight: 600,
              fontSize: '0.8rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Download size={14} /> Download 3D Plan JPG
          </button>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* MODE 1: 3D SPATIAL INTERACTIVE PERSPECTIVE VIEW              */}
      {/* ───────────────────────────────────────────────────────────── */}
      {viewSubMode === '3d_interactive' ? (
        <div style={{ position: 'relative' }}>
          
          {/* Instructions and Telemetry HUD */}
          <div style={{
            position: 'absolute',
            top: '16px',
            left: '16px',
            zIndex: 20,
            background: 'rgba(15, 23, 42, 0.85)',
            backdropFilter: 'blur(8px)',
            color: '#f8fafc',
            padding: '10px 14px',
            borderRadius: '10px',
            fontSize: '0.75rem',
            border: '1px solid rgba(255,255,255,0.1)',
            pointerEvents: 'none'
          }}>
            <div style={{ fontWeight: 700, color: '#38bdf8', marginBottom: '2px', display: 'flex', alignItems: 'center', gap: '5px' }}>
              <Compass size={14} /> 3D Spatial Controls Active
            </div>
            <div>Drag to Orbit • Shift+Drag to Pan • Wheel to Zoom</div>
            <div style={{ opacity: 0.7, marginTop: '3px', fontSize: '0.7rem' }}>
              Pitch: {Math.round(cameraPitch)}° • Yaw: {Math.round(cameraYaw)}° • Zoom: {(zoomLevel).toFixed(2)}x
            </div>
          </div>

          {/* Quick Tank Selection Hotbar */}
          <div style={{
            position: 'absolute',
            bottom: '16px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 20,
            display: 'flex',
            gap: '8px',
            background: 'rgba(15, 23, 42, 0.88)',
            backdropFilter: 'blur(10px)',
            padding: '6px 10px',
            borderRadius: '12px',
            border: '1px solid rgba(255,255,255,0.15)',
            boxShadow: '0 10px 25px rgba(0,0,0,0.3)'
          }}>
            <button
              onClick={() => { setActiveHighlight('a_building'); if (onSelectTank) onSelectTank('a_building'); }}
              style={{
                background: activeHighlight === 'a_building' ? '#2563eb' : 'transparent',
                color: '#fff',
                border: 'none',
                padding: '6px 12px',
                borderRadius: '8px',
                fontSize: '0.75rem',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              Wing A: 75,800 L
            </button>
            <button
              onClick={() => { setActiveHighlight('common_underground'); if (onSelectTank) onSelectTank('common_underground'); }}
              style={{
                background: activeHighlight === 'common_underground' ? '#0284c7' : 'transparent',
                color: '#fff',
                border: 'none',
                padding: '6px 12px',
                borderRadius: '8px',
                fontSize: '0.75rem',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              💧 Common Sump: 325,000 L
            </button>
            <button
              onClick={() => { setActiveHighlight('b_building'); if (onSelectTank) onSelectTank('b_building'); }}
              style={{
                background: activeHighlight === 'b_building' ? '#0ea5e9' : 'transparent',
                color: '#fff',
                border: 'none',
                padding: '6px 12px',
                borderRadius: '8px',
                fontSize: '0.75rem',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              Wing B: 88,600 L
            </button>
            <button
              onClick={() => { setActiveHighlight('c_building'); if (onSelectTank) onSelectTank('c_building'); }}
              style={{
                background: activeHighlight === 'c_building' ? '#059669' : 'transparent',
                color: '#fff',
                border: 'none',
                padding: '6px 12px',
                borderRadius: '8px',
                fontSize: '0.75rem',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              Wing C: 50,000 L
            </button>
          </div>

          {/* Interactive 3D Canvas Stage */}
          <div
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onWheel={(e) => {
              e.preventDefault();
              setZoomLevel(z => Math.min(Math.max(z - e.deltaY * 0.0012, 0.55), 1.85));
            }}
            style={{
              width: '100%',
              height: '660px',
              borderRadius: '16px',
              background: theme.bg,
              overflow: 'hidden',
              position: 'relative',
              cursor: isDragging ? 'grabbing' : 'grab',
              perspective: '1200px',
              userSelect: 'none'
            }}
          >
            {/* 3D World Stage */}
            <div style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transformStyle: 'preserve-3d',
              transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoomLevel}) rotateX(${cameraPitch}deg) rotateZ(${cameraYaw}deg)`,
              transition: isDragging ? 'none' : 'transform 0.15s ease-out'
            }}>
              
              {/* Society Base Ground Slab */}
              <div style={{
                width: '640px',
                height: '820px',
                background: theme.groundColor,
                borderRadius: '24px',
                position: 'relative',
                boxShadow: `0 30px 80px ${theme.shadow}`,
                border: '2px solid rgba(255,255,255,0.1)',
                transformStyle: 'preserve-3d'
              }}>
                
                {/* Main Driveway (Left asphalt road) */}
                <div style={{
                  position: 'absolute',
                  top: '20px',
                  left: '20px',
                  width: '110px',
                  height: '780px',
                  background: theme.roadColor,
                  borderRadius: '12px',
                  border: '1px solid rgba(255,255,255,0.1)'
                }}>
                  {/* Road centerline dashes */}
                  <div style={{
                    position: 'absolute',
                    top: '20px',
                    bottom: '20px',
                    left: '50%',
                    width: '3px',
                    backgroundImage: 'linear-gradient(to bottom, #ffffff 50%, transparent 50%)',
                    backgroundSize: '3px 30px',
                    opacity: 0.6
                  }} />

                  {/* Main Gate Inlet Marker */}
                  <div style={{
                    position: 'absolute',
                    top: '15px',
                    left: '10px',
                    right: '10px',
                    padding: '6px',
                    background: '#0f172a',
                    borderRadius: '6px',
                    color: '#38bdf8',
                    fontSize: '9px',
                    fontWeight: 800,
                    textAlign: 'center'
                  }}>
                    MAIN GATE
                    <div style={{ fontSize: '7px', color: '#94a3b8' }}>Tanker Bay</div>
                  </div>

                  {/* OWC Block */}
                  <div style={{
                    position: 'absolute',
                    bottom: '150px',
                    left: '10px',
                    right: '10px',
                    padding: '8px 4px',
                    background: '#3f6212',
                    borderRadius: '6px',
                    color: '#f7fee7',
                    fontSize: '9px',
                    fontWeight: 700,
                    textAlign: 'center'
                  }}>
                    🌱 OWC
                  </div>

                  {/* STP Block */}
                  <div style={{
                    position: 'absolute',
                    bottom: '70px',
                    left: '10px',
                    right: '10px',
                    padding: '8px 4px',
                    background: '#15803d',
                    borderRadius: '6px',
                    color: '#f0fdf4',
                    fontSize: '9px',
                    fontWeight: 700,
                    textAlign: 'center'
                  }}>
                    ♻️ STP (75 KLD)
                  </div>
                </div>

                {/* ─────────────────────────────────────────────────────────── */}
                {/* 1. A BUILDING (Top) - 3D Extrusion                          */}
                {/* ─────────────────────────────────────────────────────────── */}
                <div 
                  onClick={() => { setActiveHighlight('a_building'); if (onSelectTank) onSelectTank('a_building'); }}
                  style={{
                    position: 'absolute',
                    top: '40px',
                    left: '180px',
                    width: '320px',
                    height: '140px',
                    background: theme.buildingColor,
                    borderRadius: '12px',
                    boxShadow: activeHighlight === 'a_building' ? '0 0 25px #2563eb' : `0 15px 35px ${theme.shadow}`,
                    border: activeHighlight === 'a_building' ? '2px solid #2563eb' : '1px solid rgba(255,255,255,0.2)',
                    transform: 'translateZ(60px)',
                    transformStyle: 'preserve-3d',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer'
                  }}
                >
                  <div style={{
                    position: 'absolute',
                    top: '-15px',
                    background: '#1e3a8a',
                    color: '#ffffff',
                    padding: '4px 10px',
                    borderRadius: '6px',
                    fontSize: '11px',
                    fontWeight: 800,
                    boxShadow: '0 4px 10px rgba(0,0,0,0.3)',
                    transform: 'translateZ(20px)'
                  }}>
                    A BUILDING • 75,800 LITRES
                  </div>

                  {/* 5 Rooftop Overhead Tanks on Terrace */}
                  <div style={{
                    display: 'flex',
                    gap: '12px',
                    marginTop: '15px',
                    transform: 'translateZ(25px)'
                  }}>
                    {[1, 2, 3, 4, 5].map((tankIdx) => (
                      <div
                        key={tankIdx}
                        style={{
                          width: '28px',
                          height: '34px',
                          borderRadius: '14px',
                          background: 'linear-gradient(180deg, #38bdf8 0%, #0284c7 100%)',
                          border: '2px solid #ffffff',
                          boxShadow: theme.waterGlow,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#ffffff',
                          fontSize: '8px',
                          fontWeight: 800
                        }}
                      >
                        💧
                      </div>
                    ))}
                  </div>
                  <span style={{ fontSize: '10px', color: '#64748b', fontWeight: 600, marginTop: '8px' }}>
                    5x Overhead Tanks (Roof Terrace)
                  </span>
                </div>

                {/* ─────────────────────────────────────────────────────────── */}
                {/* 2. COMMON UNDERGROUND WATER TANK (Central Pit Cutaway)      */}
                {/* ─────────────────────────────────────────────────────────── */}
                <div
                  onClick={() => { setActiveHighlight('common_underground'); if (onSelectTank) onSelectTank('common_underground'); }}
                  style={{
                    position: 'absolute',
                    top: '220px',
                    left: '220px',
                    width: '240px',
                    height: '140px',
                    background: 'rgba(2, 132, 199, 0.18)',
                    borderRadius: '16px',
                    border: activeHighlight === 'common_underground' ? '3px solid #38bdf8' : '2px dashed #0284c7',
                    boxShadow: activeHighlight === 'common_underground' ? '0 0 35px #0284c7, inset 0 0 20px #0284c7' : 'inset 0 0 15px rgba(2,132,199,0.3)',
                    transform: 'translateZ(0px)',
                    transformStyle: 'preserve-3d',
                    padding: '10px',
                    cursor: 'pointer'
                  }}
                >
                  <div style={{
                    position: 'absolute',
                    top: '-14px',
                    left: '50%',
                    transform: 'translateX(-50%) translateZ(10px)',
                    background: '#0284c7',
                    color: '#ffffff',
                    padding: '4px 12px',
                    borderRadius: '6px',
                    fontSize: '11px',
                    fontWeight: 900,
                    whiteSpace: 'nowrap',
                    boxShadow: '0 4px 15px rgba(2, 132, 199, 0.5)'
                  }}>
                    COMMON UNDERGROUND TANK • 325,000 L
                  </div>

                  {/* 4 Underground Storage Chambers */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '8px',
                    height: '100%',
                    marginTop: '4px'
                  }}>
                    <div style={{
                      background: 'rgba(56, 189, 248, 0.35)',
                      borderRadius: '8px',
                      border: '1px solid #38bdf8',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: theme.waterGlow
                    }}>
                      <span style={{ fontSize: '9px', fontWeight: 800, color: '#ffffff' }}>CHAMBER 1</span>
                      <span style={{ fontSize: '8px', color: '#cffafe' }}>1,12,500 L</span>
                    </div>

                    <div style={{
                      background: 'rgba(56, 189, 248, 0.35)',
                      borderRadius: '8px',
                      border: '1px solid #38bdf8',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: theme.waterGlow
                    }}>
                      <span style={{ fontSize: '9px', fontWeight: 800, color: '#ffffff' }}>CHAMBER 2</span>
                      <span style={{ fontSize: '8px', color: '#cffafe' }}>1,12,500 L</span>
                    </div>

                    <div style={{
                      background: 'rgba(56, 189, 248, 0.35)',
                      borderRadius: '8px',
                      border: '1px solid #38bdf8',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: theme.waterGlow
                    }}>
                      <span style={{ fontSize: '9px', fontWeight: 800, color: '#ffffff' }}>PUMP ROOM</span>
                      <span style={{ fontSize: '8px', color: '#a7f3d0' }}>2x 10HP Boosters</span>
                    </div>

                    <div style={{
                      background: 'rgba(239, 68, 68, 0.45)',
                      borderRadius: '8px',
                      border: '1px solid #ef4444',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <span style={{ fontSize: '9px', fontWeight: 800, color: '#ffffff' }}>🔥 FIRE RESERVE</span>
                      <span style={{ fontSize: '8px', color: '#fee2e2' }}>100,000 L Locked</span>
                    </div>
                  </div>
                </div>

                {/* Flanking Amenities: Kids Play Area (Left) & MP Theater (Right) */}
                <div style={{
                  position: 'absolute',
                  top: '240px',
                  left: '145px',
                  width: '65px',
                  height: '95px',
                  background: 'rgba(239, 68, 68, 0.15)',
                  border: '1px solid #f87171',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '8px',
                  fontWeight: 700,
                  color: '#ef4444',
                  textAlign: 'center'
                }}>
                  Kids Play<br />Area
                </div>

                <div style={{
                  position: 'absolute',
                  top: '240px',
                  right: '100px',
                  width: '65px',
                  height: '95px',
                  background: 'rgba(168, 85, 247, 0.15)',
                  border: '1px solid #c084fc',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '8px',
                  fontWeight: 700,
                  color: '#a855f7',
                  textAlign: 'center'
                }}>
                  MP<br />Theater
                </div>

                {/* ─────────────────────────────────────────────────────────── */}
                {/* 3. B BUILDING (Middle) - 3D Extrusion                       */}
                {/* ─────────────────────────────────────────────────────────── */}
                <div 
                  onClick={() => { setActiveHighlight('b_building'); if (onSelectTank) onSelectTank('b_building'); }}
                  style={{
                    position: 'absolute',
                    top: '390px',
                    left: '180px',
                    width: '320px',
                    height: '140px',
                    background: theme.buildingColor,
                    borderRadius: '12px',
                    boxShadow: activeHighlight === 'b_building' ? '0 0 25px #0284c7' : `0 15px 35px ${theme.shadow}`,
                    border: activeHighlight === 'b_building' ? '2px solid #0284c7' : '1px solid rgba(255,255,255,0.2)',
                    transform: 'translateZ(60px)',
                    transformStyle: 'preserve-3d',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer'
                  }}
                >
                  <div style={{
                    position: 'absolute',
                    top: '-15px',
                    background: '#0369a1',
                    color: '#ffffff',
                    padding: '4px 10px',
                    borderRadius: '6px',
                    fontSize: '11px',
                    fontWeight: 800,
                    boxShadow: '0 4px 10px rgba(0,0,0,0.3)',
                    transform: 'translateZ(20px)'
                  }}>
                    B BUILDING • 88,600 LITRES
                  </div>

                  {/* 6 Rooftop Overhead Tanks */}
                  <div style={{
                    display: 'flex',
                    gap: '10px',
                    marginTop: '15px',
                    transform: 'translateZ(25px)'
                  }}>
                    {[1, 2, 3, 4, 5, 6].map((tankIdx) => (
                      <div
                        key={tankIdx}
                        style={{
                          width: '26px',
                          height: '32px',
                          borderRadius: '13px',
                          background: 'linear-gradient(180deg, #38bdf8 0%, #0284c7 100%)',
                          border: '2px solid #ffffff',
                          boxShadow: theme.waterGlow,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#ffffff',
                          fontSize: '8px',
                          fontWeight: 800
                        }}
                      >
                        💧
                      </div>
                    ))}
                  </div>
                  <span style={{ fontSize: '10px', color: '#64748b', fontWeight: 600, marginTop: '8px' }}>
                    6x Overhead Tanks (Roof Terrace)
                  </span>
                </div>

                {/* 4. CLUB HOUSE & SWIMMING POOL */}
                <div style={{
                  position: 'absolute',
                  top: '555px',
                  left: '200px',
                  width: '280px',
                  height: '60px',
                  background: 'rgba(6, 182, 212, 0.15)',
                  borderRadius: '10px',
                  border: '1px solid #06b6d4',
                  transform: 'translateZ(15px)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-around',
                  padding: '0 15px'
                }}>
                  <div style={{
                    background: '#06b6d4',
                    color: '#fff',
                    padding: '4px 10px',
                    borderRadius: '6px',
                    fontSize: '9px',
                    fontWeight: 700
                  }}>
                    🏊 Pool (85,000 L)
                  </div>
                  <div style={{ fontSize: '10px', fontWeight: 700, color: theme.textColor }}>
                    CLUB HOUSE & COMMUNITY HALL
                  </div>
                </div>

                {/* ─────────────────────────────────────────────────────────── */}
                {/* 5. C BUILDING (South) - 3D Extrusion                        */}
                {/* ─────────────────────────────────────────────────────────── */}
                <div 
                  onClick={() => { setActiveHighlight('c_building'); if (onSelectTank) onSelectTank('c_building'); }}
                  style={{
                    position: 'absolute',
                    top: '635px',
                    left: '180px',
                    width: '320px',
                    height: '140px',
                    background: theme.buildingColor,
                    borderRadius: '12px',
                    boxShadow: activeHighlight === 'c_building' ? '0 0 25px #059669' : `0 15px 35px ${theme.shadow}`,
                    border: activeHighlight === 'c_building' ? '2px solid #059669' : '1px solid rgba(255,255,255,0.2)',
                    transform: 'translateZ(60px)',
                    transformStyle: 'preserve-3d',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer'
                  }}
                >
                  <div style={{
                    position: 'absolute',
                    top: '-15px',
                    background: '#065f46',
                    color: '#ffffff',
                    padding: '4px 10px',
                    borderRadius: '6px',
                    fontSize: '11px',
                    fontWeight: 800,
                    boxShadow: '0 4px 10px rgba(0,0,0,0.3)',
                    transform: 'translateZ(20px)'
                  }}>
                    C BUILDING • 50,000 LITRES
                  </div>

                  {/* 5 Rooftop Overhead Tanks */}
                  <div style={{
                    display: 'flex',
                    gap: '12px',
                    marginTop: '15px',
                    transform: 'translateZ(25px)'
                  }}>
                    {[1, 2, 3, 4, 5].map((tankIdx) => (
                      <div
                        key={tankIdx}
                        style={{
                          width: '28px',
                          height: '34px',
                          borderRadius: '14px',
                          background: 'linear-gradient(180deg, #34d399 0%, #059669 100%)',
                          border: '2px solid #ffffff',
                          boxShadow: '0 0 15px rgba(16, 185, 129, 0.6)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#ffffff',
                          fontSize: '8px',
                          fontWeight: 800
                        }}
                      >
                        💧
                      </div>
                    ))}
                  </div>
                  <span style={{ fontSize: '10px', color: '#64748b', fontWeight: 600, marginTop: '8px' }}>
                    5x Overhead Tanks (Roof Terrace)
                  </span>
                </div>

                {/* DG Generator at bottom right */}
                <div style={{
                  position: 'absolute',
                  bottom: '30px',
                  right: '25px',
                  width: '90px',
                  height: '60px',
                  background: '#d97706',
                  borderRadius: '8px',
                  color: '#ffffff',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '9px',
                  fontWeight: 700,
                  boxShadow: '0 6px 15px rgba(217, 119, 6, 0.4)'
                }}>
                  ⚡ DG GENERATOR
                  <span style={{ fontSize: '7px', opacity: 0.9 }}>125 KVA Pump Backup</span>
                </div>

              </div>
            </div>
          </div>
        </div>
      ) : (
        /* ───────────────────────────────────────────────────────────── */
        /* MODE 2: MASTER ARCHITECTURAL 3D PLAN (HIGH-RES INSPECTOR)     */
        /* ───────────────────────────────────────────────────────────── */
        <div style={{
          position: 'relative',
          background: '#0f172a',
          borderRadius: '16px',
          overflow: 'hidden',
          minHeight: '700px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center'
        }}>
          {/* Top Bar for Master Render */}
          <div style={{
            width: '100%',
            padding: '12px 20px',
            background: 'rgba(30, 41, 59, 0.95)',
            borderBottom: '1px solid rgba(255,255,255,0.1)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            zIndex: 10
          }}>
            <div style={{ color: '#fff', fontSize: '0.85rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Sparkles size={16} color="#38bdf8" /> Official Architectural 3D Isometric Masterplan
            </div>
            
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <button
                onClick={() => setRenderZoom(z => Math.min(z + 0.2, 2.5))}
                aria-label="Zoom in architectural plan"
                style={{
                  padding: '6px 10px',
                  borderRadius: '6px',
                  background: '#334155',
                  color: '#fff',
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                <ZoomIn size={14} />
              </button>
              <button
                onClick={() => setRenderZoom(z => Math.max(z - 0.2, 0.8))}
                aria-label="Zoom out architectural plan"
                style={{
                  padding: '6px 10px',
                  borderRadius: '6px',
                  background: '#334155',
                  color: '#fff',
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                <ZoomOut size={14} />
              </button>
              <button
                onClick={() => setRenderZoom(1)}
                aria-label="Reset architectural plan zoom"
                style={{
                  padding: '6px 10px',
                  borderRadius: '6px',
                  background: '#334155',
                  color: '#fff',
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                <RotateCcw size={14} />
              </button>
              <button
                onClick={handleDownloadImage}
                style={{
                  padding: '6px 14px',
                  borderRadius: '6px',
                  background: '#0284c7',
                  color: '#fff',
                  border: 'none',
                  fontWeight: 700,
                  fontSize: '0.78rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px'
                }}
              >
                <Download size={14} /> Download Original
              </button>
            </div>
          </div>

          {/* Interactive Image Container with Hotspot Pins */}
          <div style={{
            position: 'relative',
            width: '100%',
            overflow: 'auto',
            display: 'flex',
            justifyContent: 'center',
            padding: '24px'
          }}>
            <div style={{
              position: 'relative',
              maxWidth: '850px',
              transform: `scale(${renderZoom})`,
              transformOrigin: 'top center',
              transition: 'transform 0.2s ease-out'
            }}>
              <img
                src="/visuals/water_tank_3d_layout.jpg"
                alt="Majestique Euriska 3D Water Tank Layout Masterplan"
                style={{
                  width: '100%',
                  height: 'auto',
                  borderRadius: '12px',
                  display: 'block',
                  boxShadow: '0 25px 60px rgba(0,0,0,0.6)',
                  border: '1px solid rgba(255,255,255,0.15)'
                }}
              />

              {/* Hotspot 1: A Building */}
              <div 
                onClick={() => { if (onSelectTank) onSelectTank('a_building'); }}
                title="Click to view A Building Tank Details"
                style={{
                  position: 'absolute',
                  top: '16%',
                  left: '52%',
                  transform: 'translate(-50%, -50%)',
                  background: 'rgba(37, 99, 235, 0.95)',
                  color: '#ffffff',
                  padding: '6px 12px',
                  borderRadius: '20px',
                  fontSize: '11px',
                  fontWeight: 800,
                  boxShadow: '0 4px 15px rgba(0,0,0,0.4)',
                  cursor: 'pointer',
                  border: '2px solid #ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px'
                }}
              >
                🏢 A Building: 75,800 L
              </div>

              {/* Hotspot 2: Common Underground Water Tank */}
              <div 
                onClick={() => { if (onSelectTank) onSelectTank('common_underground'); }}
                title="Click to view Common Underground Tank Details"
                style={{
                  position: 'absolute',
                  top: '36%',
                  left: '53%',
                  transform: 'translate(-50%, -50%)',
                  background: 'rgba(2, 132, 199, 0.95)',
                  color: '#ffffff',
                  padding: '6px 12px',
                  borderRadius: '20px',
                  fontSize: '11px',
                  fontWeight: 800,
                  boxShadow: '0 4px 15px rgba(0,0,0,0.4)',
                  cursor: 'pointer',
                  border: '2px solid #ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px'
                }}
              >
                💧 Common Underground Tank: 325,000 L
              </div>

              {/* Hotspot 3: B Building */}
              <div 
                onClick={() => { if (onSelectTank) onSelectTank('b_building'); }}
                title="Click to view B Building Tank Details"
                style={{
                  position: 'absolute',
                  top: '47%',
                  left: '53%',
                  transform: 'translate(-50%, -50%)',
                  background: 'rgba(14, 165, 233, 0.95)',
                  color: '#ffffff',
                  padding: '6px 12px',
                  borderRadius: '20px',
                  fontSize: '11px',
                  fontWeight: 800,
                  boxShadow: '0 4px 15px rgba(0,0,0,0.4)',
                  cursor: 'pointer',
                  border: '2px solid #ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px'
                }}
              >
                🏢 B Building: 88,600 L
              </div>

              {/* Hotspot 4: C Building */}
              <div 
                onClick={() => { if (onSelectTank) onSelectTank('c_building'); }}
                title="Click to view C Building Tank Details"
                style={{
                  position: 'absolute',
                  top: '79%',
                  left: '54%',
                  transform: 'translate(-50%, -50%)',
                  background: 'rgba(5, 150, 105, 0.95)',
                  color: '#ffffff',
                  padding: '6px 12px',
                  borderRadius: '20px',
                  fontSize: '11px',
                  fontWeight: 800,
                  boxShadow: '0 4px 15px rgba(0,0,0,0.4)',
                  cursor: 'pointer',
                  border: '2px solid #ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px'
                }}
              >
                🏢 C Building: 50,000 L (50,600 L)
              </div>

              {/* Hotspot 5: STP & OWC */}
              <div 
                style={{
                  position: 'absolute',
                  top: '65%',
                  left: '30%',
                  transform: 'translate(-50%, -50%)',
                  background: 'rgba(22, 163, 74, 0.92)',
                  color: '#ffffff',
                  padding: '4px 10px',
                  borderRadius: '16px',
                  fontSize: '10px',
                  fontWeight: 700,
                  boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
                  border: '1px solid #ffffff'
                }}
              >
                ♻️ STP & OWC
              </div>

              {/* Hotspot 6: DG Generator */}
              <div 
                style={{
                  position: 'absolute',
                  top: '88%',
                  right: '5%',
                  background: 'rgba(217, 119, 6, 0.92)',
                  color: '#ffffff',
                  padding: '4px 10px',
                  borderRadius: '16px',
                  fontSize: '10px',
                  fontWeight: 700,
                  boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
                  border: '1px solid #ffffff'
                }}
              >
                ⚡ DG Generator
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
