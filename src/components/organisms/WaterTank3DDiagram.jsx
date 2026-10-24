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
import './WaterTank3DDiagram.css';


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
    <div className="water-tank3-d-diagram-s1">
      {/* View Switcher and Controls */}
      <div className="water-tank3-d-diagram-s2">
        {/* Sub-mode tabs */}
        <div className="water-tank3-d-diagram-s3">
          <button
            onClick={() => setViewSubMode('3d_interactive')}
            className="water-tank3-d-diagram-s4" style={{ background: viewSubMode === '3d_interactive' ? '#0284c7' : 'transparent', color: viewSubMode === '3d_interactive' ? '#ffffff' : '#64748b' }}
          >
            <Box size={16} /> 3D Spatial Interactive Model
          </button>
          <button
            onClick={() => setViewSubMode('master_render')}
            className="water-tank3-d-diagram-s4" style={{ background: viewSubMode === 'master_render' ? '#0284c7' : 'transparent', color: viewSubMode === 'master_render' ? '#ffffff' : '#64748b' }}
          >
            <Eye size={16} /> Master Architectural 3D Plan (High-Res)
          </button>
        </div>

        {/* Action / Lighting Bar */}
        <div className="water-tank3-d-diagram-s5">
          {viewSubMode === '3d_interactive' && (
            <>
              {/* Camera Presets */}
              <span className="water-tank3-d-diagram-s6">Camera:</span>
              <button
                onClick={() => applyPreset('iso')}
                className="water-tank3-d-diagram-s7"
              >
                Isometric
              </button>
              <button
                onClick={() => applyPreset('underground')}
                className="water-tank3-d-diagram-s7"
              >
                Sump Focus
              </button>
              <button
                onClick={() => applyPreset('terrace')}
                className="water-tank3-d-diagram-s7"
              >
                Rooftop Tanks
              </button>
              <button
                onClick={() => applyPreset('topdown')}
                className="water-tank3-d-diagram-s7"
              >
                Site Plan
              </button>

              {/* Lighting toggles */}
              <div className="water-tank3-d-diagram-s8">
                <button
                  onClick={() => setLightingMode('daylight')}
                  title="Daylight Mode"
                  className="water-tank3-d-diagram-s9" style={{ background: lightingMode === 'daylight' ? '#ffffff' : 'transparent' }}
                >
                  <Sun size={15} color={lightingMode === 'daylight' ? '#f59e0b' : '#64748b'} />
                </button>
                <button
                  onClick={() => setLightingMode('dusk')}
                  title="Dusk / Twilight Mode"
                  className="water-tank3-d-diagram-s9" style={{ background: lightingMode === 'dusk' ? '#ffffff' : 'transparent' }}
                >
                  <Sunset size={15} color={lightingMode === 'dusk' ? '#8b5cf6' : '#64748b'} />
                </button>
                <button
                  onClick={() => setLightingMode('cyberpunk')}
                  title="Night Luminescent Mode"
                  className="water-tank3-d-diagram-s9" style={{ background: lightingMode === 'cyberpunk' ? '#ffffff' : 'transparent' }}
                >
                  <Moon size={15} color={lightingMode === 'cyberpunk' ? '#0ea5e9' : '#64748b'} />
                </button>
              </div>
            </>
          )}

          {/* Download Original Layout Image */}
          <button
            onClick={handleDownloadImage}
            className="water-tank3-d-diagram-s10"
          >
            <Download size={14} /> Download 3D Plan JPG
          </button>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* MODE 1: 3D SPATIAL INTERACTIVE PERSPECTIVE VIEW              */}
      {/* ───────────────────────────────────────────────────────────── */}
      {viewSubMode === '3d_interactive' ? (
        <div className="water-tank3-d-diagram-s11">
          
          {/* Instructions and Telemetry HUD */}
          <div className="water-tank3-d-diagram-s12">
            <div className="water-tank3-d-diagram-s13">
              <Compass size={14} /> 3D Spatial Controls Active
            </div>
            <div>Drag to Orbit • Shift+Drag to Pan • Wheel to Zoom</div>
            <div className="water-tank3-d-diagram-s14">
              Pitch: {Math.round(cameraPitch)}° • Yaw: {Math.round(cameraYaw)}° • Zoom: {(zoomLevel).toFixed(2)}x
            </div>
          </div>

          {/* Quick Tank Selection Hotbar */}
          <div className="water-tank3-d-diagram-s15">
            <button
              onClick={() => { setActiveHighlight('a_building'); if (onSelectTank) onSelectTank('a_building'); }}
              className="water-tank3-d-diagram-s16" style={{ background: activeHighlight === 'a_building' ? '#2563eb' : 'transparent' }}
            >
              Wing A: 75,800 L
            </button>
            <button
              onClick={() => { setActiveHighlight('common_underground'); if (onSelectTank) onSelectTank('common_underground'); }}
              className="water-tank3-d-diagram-s16" style={{ background: activeHighlight === 'common_underground' ? '#0284c7' : 'transparent' }}
            >
              💧 Common Sump: 325,000 L
            </button>
            <button
              onClick={() => { setActiveHighlight('b_building'); if (onSelectTank) onSelectTank('b_building'); }}
              className="water-tank3-d-diagram-s16" style={{ background: activeHighlight === 'b_building' ? '#0ea5e9' : 'transparent' }}
            >
              Wing B: 88,600 L
            </button>
            <button
              onClick={() => { setActiveHighlight('c_building'); if (onSelectTank) onSelectTank('c_building'); }}
              className="water-tank3-d-diagram-s16" style={{ background: activeHighlight === 'c_building' ? '#059669' : 'transparent' }}
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
            className="water-tank3-d-diagram-s17" style={{ background: theme.bg, cursor: isDragging ? 'grabbing' : 'grab' }}
          >
            {/* 3D World Stage */}
            <div className="water-tank3-d-diagram-s18" style={{ transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoomLevel}) rotateX(${cameraPitch}deg) rotateZ(${cameraYaw}deg)`, transition: isDragging ? 'none' : 'transform 0.15s ease-out' }}>
              
              {/* Society Base Ground Slab */}
              <div className="water-tank3-d-diagram-s19" style={{ background: theme.groundColor, boxShadow: `0 30px 80px ${theme.shadow}` }}>
                
                {/* Main Driveway (Left asphalt road) */}
                <div className="water-tank3-d-diagram-s20" style={{ background: theme.roadColor }}>
                  {/* Road centerline dashes */}
                  <div className="water-tank3-d-diagram-s21" />

                  {/* Main Gate Inlet Marker */}
                  <div className="water-tank3-d-diagram-s22">
                    MAIN GATE
                    <div className="water-tank3-d-diagram-s23">Tanker Bay</div>
                  </div>

                  {/* OWC Block */}
                  <div className="water-tank3-d-diagram-s24">
                    🌱 OWC
                  </div>

                  {/* STP Block */}
                  <div className="water-tank3-d-diagram-s25">
                    ♻️ STP (75 KLD)
                  </div>
                </div>

                {/* ─────────────────────────────────────────────────────────── */}
                {/* 1. A BUILDING (Top) - 3D Extrusion                          */}
                {/* ─────────────────────────────────────────────────────────── */}
                <div 
                  onClick={() => { setActiveHighlight('a_building'); if (onSelectTank) onSelectTank('a_building'); }}
                  className="water-tank3-d-diagram-s26" style={{ background: theme.buildingColor, boxShadow: activeHighlight === 'a_building' ? '0 0 25px #2563eb' : `0 15px 35px ${theme.shadow}`, border: activeHighlight === 'a_building' ? '2px solid #2563eb' : '1px solid rgba(255,255,255,0.2)' }}
                >
                  <div className="water-tank3-d-diagram-s27">
                    A BUILDING • 75,800 LITRES
                  </div>

                  {/* 5 Rooftop Overhead Tanks on Terrace */}
                  <div className="water-tank3-d-diagram-s28">
                    {[1, 2, 3, 4, 5].map((tankIdx) => (
                      <div
                        key={tankIdx}
                        className="water-tank3-d-diagram-s29" style={{ boxShadow: theme.waterGlow }}
                      >
                        💧
                      </div>
                    ))}
                  </div>
                  <span className="water-tank3-d-diagram-s30">
                    5x Overhead Tanks (Roof Terrace)
                  </span>
                </div>

                {/* ─────────────────────────────────────────────────────────── */}
                {/* 2. COMMON UNDERGROUND WATER TANK (Central Pit Cutaway)      */}
                {/* ─────────────────────────────────────────────────────────── */}
                <div
                  onClick={() => { setActiveHighlight('common_underground'); if (onSelectTank) onSelectTank('common_underground'); }}
                  className="water-tank3-d-diagram-s31" style={{ border: activeHighlight === 'common_underground' ? '3px solid #38bdf8' : '2px dashed #0284c7', boxShadow: activeHighlight === 'common_underground' ? '0 0 35px #0284c7, inset 0 0 20px #0284c7' : 'inset 0 0 15px rgba(2,132,199,0.3)' }}
                >
                  <div className="water-tank3-d-diagram-s32">
                    COMMON UNDERGROUND TANK • 325,000 L
                  </div>

                  {/* 4 Underground Storage Chambers */}
                  <div className="water-tank3-d-diagram-s33">
                    <div className="water-tank3-d-diagram-s34" style={{ boxShadow: theme.waterGlow }}>
                      <span className="water-tank3-d-diagram-s35">CHAMBER 1</span>
                      <span className="water-tank3-d-diagram-s36">1,12,500 L</span>
                    </div>

                    <div className="water-tank3-d-diagram-s34" style={{ boxShadow: theme.waterGlow }}>
                      <span className="water-tank3-d-diagram-s35">CHAMBER 2</span>
                      <span className="water-tank3-d-diagram-s36">1,12,500 L</span>
                    </div>

                    <div className="water-tank3-d-diagram-s34" style={{ boxShadow: theme.waterGlow }}>
                      <span className="water-tank3-d-diagram-s35">PUMP ROOM</span>
                      <span className="water-tank3-d-diagram-s37">2x 10HP Boosters</span>
                    </div>

                    <div className="water-tank3-d-diagram-s38">
                      <span className="water-tank3-d-diagram-s35">🔥 FIRE RESERVE</span>
                      <span className="water-tank3-d-diagram-s39">100,000 L Locked</span>
                    </div>
                  </div>
                </div>

                {/* Flanking Amenities: Kids Play Area (Left) & MP Theater (Right) */}
                <div className="water-tank3-d-diagram-s40">
                  Kids Play<br />Area
                </div>

                <div className="water-tank3-d-diagram-s41">
                  MP<br />Theater
                </div>

                {/* ─────────────────────────────────────────────────────────── */}
                {/* 3. B BUILDING (Middle) - 3D Extrusion                       */}
                {/* ─────────────────────────────────────────────────────────── */}
                <div 
                  onClick={() => { setActiveHighlight('b_building'); if (onSelectTank) onSelectTank('b_building'); }}
                  className="water-tank3-d-diagram-s42" style={{ background: theme.buildingColor, boxShadow: activeHighlight === 'b_building' ? '0 0 25px #0284c7' : `0 15px 35px ${theme.shadow}`, border: activeHighlight === 'b_building' ? '2px solid #0284c7' : '1px solid rgba(255,255,255,0.2)' }}
                >
                  <div className="water-tank3-d-diagram-s43">
                    B BUILDING • 88,600 LITRES
                  </div>

                  {/* 6 Rooftop Overhead Tanks */}
                  <div className="water-tank3-d-diagram-s44">
                    {[1, 2, 3, 4, 5, 6].map((tankIdx) => (
                      <div
                        key={tankIdx}
                        className="water-tank3-d-diagram-s45" style={{ boxShadow: theme.waterGlow }}
                      >
                        💧
                      </div>
                    ))}
                  </div>
                  <span className="water-tank3-d-diagram-s30">
                    6x Overhead Tanks (Roof Terrace)
                  </span>
                </div>

                {/* 4. CLUB HOUSE & SWIMMING POOL */}
                <div className="water-tank3-d-diagram-s46">
                  <div className="water-tank3-d-diagram-s47">
                    🏊 Pool (85,000 L)
                  </div>
                  <div className="water-tank3-d-diagram-s48" style={{ color: theme.textColor }}>
                    CLUB HOUSE & COMMUNITY HALL
                  </div>
                </div>

                {/* ─────────────────────────────────────────────────────────── */}
                {/* 5. C BUILDING (South) - 3D Extrusion                        */}
                {/* ─────────────────────────────────────────────────────────── */}
                <div 
                  onClick={() => { setActiveHighlight('c_building'); if (onSelectTank) onSelectTank('c_building'); }}
                  className="water-tank3-d-diagram-s49" style={{ background: theme.buildingColor, boxShadow: activeHighlight === 'c_building' ? '0 0 25px #059669' : `0 15px 35px ${theme.shadow}`, border: activeHighlight === 'c_building' ? '2px solid #059669' : '1px solid rgba(255,255,255,0.2)' }}
                >
                  <div className="water-tank3-d-diagram-s50">
                    C BUILDING • 50,000 LITRES
                  </div>

                  {/* 5 Rooftop Overhead Tanks */}
                  <div className="water-tank3-d-diagram-s28">
                    {[1, 2, 3, 4, 5].map((tankIdx) => (
                      <div
                        key={tankIdx}
                        className="water-tank3-d-diagram-s51"
                      >
                        💧
                      </div>
                    ))}
                  </div>
                  <span className="water-tank3-d-diagram-s30">
                    5x Overhead Tanks (Roof Terrace)
                  </span>
                </div>

                {/* DG Generator at bottom right */}
                <div className="water-tank3-d-diagram-s52">
                  ⚡ DG GENERATOR
                  <span className="water-tank3-d-diagram-s53">125 KVA Pump Backup</span>
                </div>

              </div>
            </div>
          </div>
        </div>
      ) : (
        /* ───────────────────────────────────────────────────────────── */
        /* MODE 2: MASTER ARCHITECTURAL 3D PLAN (HIGH-RES INSPECTOR)     */
        /* ───────────────────────────────────────────────────────────── */
        <div className="water-tank3-d-diagram-s54">
          {/* Top Bar for Master Render */}
          <div className="water-tank3-d-diagram-s55">
            <div className="water-tank3-d-diagram-s56">
              <Sparkles size={16} color="#38bdf8" /> Official Architectural 3D Isometric Masterplan
            </div>
            
            <div className="water-tank3-d-diagram-s57">
              <button
                onClick={() => setRenderZoom(z => Math.min(z + 0.2, 2.5))}
                aria-label="Zoom in architectural plan"
                className="water-tank3-d-diagram-s58"
              >
                <ZoomIn size={14} />
              </button>
              <button
                onClick={() => setRenderZoom(z => Math.max(z - 0.2, 0.8))}
                aria-label="Zoom out architectural plan"
                className="water-tank3-d-diagram-s58"
              >
                <ZoomOut size={14} />
              </button>
              <button
                onClick={() => setRenderZoom(1)}
                aria-label="Reset architectural plan zoom"
                className="water-tank3-d-diagram-s58"
              >
                <RotateCcw size={14} />
              </button>
              <button
                onClick={handleDownloadImage}
                className="water-tank3-d-diagram-s59"
              >
                <Download size={14} /> Download Original
              </button>
            </div>
          </div>

          {/* Interactive Image Container with Hotspot Pins */}
          <div className="water-tank3-d-diagram-s60">
            <div className="water-tank3-d-diagram-s61" style={{ transform: `scale(${renderZoom})` }}>
              <img
                src="/visuals/water_tank_3d_layout.jpg"
                alt="Majestique Euriska 3D Water Tank Layout Masterplan"
                className="water-tank3-d-diagram-s62"
              />

              {/* Hotspot 1: A Building */}
              <div 
                onClick={() => { if (onSelectTank) onSelectTank('a_building'); }}
                title="Click to view A Building Tank Details"
                className="water-tank3-d-diagram-s63"
              >
                🏢 A Building: 75,800 L
              </div>

              {/* Hotspot 2: Common Underground Water Tank */}
              <div 
                onClick={() => { if (onSelectTank) onSelectTank('common_underground'); }}
                title="Click to view Common Underground Tank Details"
                className="water-tank3-d-diagram-s64"
              >
                💧 Common Underground Tank: 325,000 L
              </div>

              {/* Hotspot 3: B Building */}
              <div 
                onClick={() => { if (onSelectTank) onSelectTank('b_building'); }}
                title="Click to view B Building Tank Details"
                className="water-tank3-d-diagram-s65"
              >
                🏢 B Building: 88,600 L
              </div>

              {/* Hotspot 4: C Building */}
              <div 
                onClick={() => { if (onSelectTank) onSelectTank('c_building'); }}
                title="Click to view C Building Tank Details"
                className="water-tank3-d-diagram-s66"
              >
                🏢 C Building: 50,000 L (50,600 L)
              </div>

              {/* Hotspot 5: STP & OWC */}
              <div 
                className="water-tank3-d-diagram-s67"
              >
                ♻️ STP & OWC
              </div>

              {/* Hotspot 6: DG Generator */}
              <div 
                className="water-tank3-d-diagram-s68"
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
