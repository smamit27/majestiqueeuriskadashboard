import { useState } from 'react';
import { 
  WATER_TANKS_DATA, 
  SOCIETY_WATER_SUMMARY 
} from '../../data/waterTankData.js';
import { 
  AlertTriangle, 
  CheckCircle2, 
  Truck, 
  Calculator, 
  RotateCcw
} from 'lucide-react';

export default function WaterTankLevelMonitor() {
  // Live / simulated levels
  const [levels, setLevels] = useState({
    common_underground: 84,
    a_building: 82,
    b_building: 78,
    c_building: 75
  });

  const [tankerCapacityOption, setTankerCapacityOption] = useState(12000); // 10,000 L | 12,000 L | 15,000 L
  const [tankerRateEstimate, setTankerRateEstimate] = useState(1150); // ₹ per tanker
  const [targetSumpPct, setTargetSumpPct] = useState(95);

  const updateLevel = (key, val) => {
    setLevels(prev => ({ ...prev, [key]: Number(val) }));
  };

  const resetLevels = () => {
    setLevels({
      common_underground: 84,
      a_building: 82,
      b_building: 78,
      c_building: 75
    });
  };

  // Calculations for Underground Sump
  const ugCapacity = WATER_TANKS_DATA.common_underground.capacity; // 325,000
  const ugCurrentLitres = Math.round((levels.common_underground / 100) * ugCapacity);
  const ugTargetLitres = Math.round((targetSumpPct / 100) * ugCapacity);
  const ugDeficitLitres = Math.max(0, ugTargetLitres - ugCurrentLitres);
  const tankersRequired = Math.ceil(ugDeficitLitres / tankerCapacityOption);
  const estimatedCost = tankersRequired * tankerRateEstimate;

  // Society Total Current Water
  const totalSocietyLitres = Math.round(
    (levels.common_underground / 100) * WATER_TANKS_DATA.common_underground.capacity +
    (levels.a_building / 100) * WATER_TANKS_DATA.a_building.capacity +
    (levels.b_building / 100) * WATER_TANKS_DATA.b_building.capacity +
    (levels.c_building / 100) * WATER_TANKS_DATA.c_building.capacity
  );
  const totalSocietyPct = Math.round((totalSocietyLitres / SOCIETY_WATER_SUMMARY.totalCapacityLitres) * 100);
  const daysAutonomy = (totalSocietyLitres / SOCIETY_WATER_SUMMARY.averageDailyConsumptionLitres).toFixed(1);

  // Status helper
  const getStatus = (pct) => {
    if (pct < 25) return { text: 'Critical', bg: '#fee2e2', color: '#b91c1c', icon: <AlertTriangle size={14} /> };
    if (pct < 50) return { text: 'Low Reserve', bg: '#fef3c7', color: '#b45309', icon: <AlertTriangle size={14} /> };
    if (pct < 75) return { text: 'Adequate', bg: '#e0f2fe', color: '#0369a1', icon: <CheckCircle2 size={14} /> };
    return { text: 'Optimal', bg: '#dcfce7', color: '#15803d', icon: <CheckCircle2 size={14} /> };
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Overall Society Water Autonomy Banner */}
      <div style={{
        background: 'linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%)',
        borderRadius: '16px',
        padding: '24px',
        color: '#ffffff',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '20px',
        boxShadow: '0 10px 30px rgba(15, 23, 42, 0.15)'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <span style={{
              background: '#38bdf8',
              color: '#0f172a',
              padding: '4px 10px',
              borderRadius: '20px',
              fontWeight: 800,
              fontSize: '0.72rem',
              letterSpacing: '0.5px',
              textTransform: 'uppercase'
            }}>
              Live Telemetry & Simulation
            </span>
            <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>
              Real-time Float Switches & Ultrasonic Sensors
            </span>
          </div>
          <h2 style={{ margin: '0 0 4px', fontSize: '1.6rem', fontWeight: 900 }}>
            {totalSocietyLitres.toLocaleString('en-IN')} Litres Available
          </h2>
          <p style={{ margin: 0, color: '#cbd5e1', fontSize: '0.88rem' }}>
            {totalSocietyPct}% of 5,39,400 Litres total society storage capacity • <strong>{daysAutonomy} Days</strong> estimated reserve autonomy (~{Math.round(totalSocietyLitres / 231)} L / flat across 231 flats)
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <button
            onClick={resetLevels}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: '1px solid rgba(255,255,255,0.2)',
              background: 'rgba(255,255,255,0.1)',
              color: '#fff',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <RotateCcw size={14} /> Reset Levels
          </button>
        </div>
      </div>

      {/* 4 Storage Cylinders Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
        gap: '20px'
      }}>
        {Object.entries(WATER_TANKS_DATA).map(([key, tank]) => {
          const currentPct = levels[key];
          const currentVol = Math.round((currentPct / 100) * tank.capacity);
          const st = getStatus(currentPct);

          return (
            <div
              key={key}
              style={{
                background: '#ffffff',
                borderRadius: '16px',
                border: '1px solid #e2e8f0',
                padding: '20px',
                boxShadow: '0 2px 12px rgba(0,0,0,0.03)',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px'
              }}
            >
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h3 style={{ margin: '0 0 2px', fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>
                    {tank.shortName}
                  </h3>
                  <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{tank.building}</span>
                </div>
                <div style={{
                  background: st.bg,
                  color: st.color,
                  padding: '4px 10px',
                  borderRadius: '20px',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}>
                  {st.icon} {st.text}
                </div>
              </div>

              {/* Cylindrical Liquid Tank Gauge */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '20px',
                padding: '10px 0'
              }}>
                {/* 3D Glass Cylinder */}
                <div style={{
                  width: '64px',
                  height: '140px',
                  borderRadius: '14px',
                  border: '2px solid rgba(15, 23, 42, 0.15)',
                  background: 'linear-gradient(90deg, rgba(255,255,255,0.6) 0%, rgba(241,245,249,0.3) 50%, rgba(255,255,255,0.7) 100%)',
                  position: 'relative',
                  overflow: 'hidden',
                  boxShadow: 'inset 0 2px 6px rgba(0,0,0,0.08), 0 4px 12px rgba(0,0,0,0.05)'
                }}>
                  {/* Liquid Fill */}
                  <div style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    height: `${currentPct}%`,
                    background: tank.gradient || tank.color,
                    transition: 'height 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                    boxShadow: `0 0 16px ${tank.color}66`
                  }}>
                    {/* Surface meniscus line */}
                    <div style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      height: '4px',
                      background: 'rgba(255,255,255,0.6)',
                      borderRadius: '50%'
                    }} />
                  </div>

                  {/* Glass Reflection Highlight */}
                  <div style={{
                    position: 'absolute',
                    top: 0,
                    bottom: 0,
                    left: '8px',
                    width: '6px',
                    background: 'linear-gradient(90deg, rgba(255,255,255,0.5) 0%, rgba(255,255,255,0) 100%)',
                    borderRadius: '4px'
                  }} />

                  {/* Level tick marks */}
                  <div style={{
                    position: 'absolute',
                    top: '25%',
                    left: '6px',
                    width: '10px',
                    height: '1px',
                    background: 'rgba(0,0,0,0.2)'
                  }} />
                  <div style={{
                    position: 'absolute',
                    top: '50%',
                    left: '6px',
                    width: '14px',
                    height: '1.5px',
                    background: 'rgba(0,0,0,0.3)'
                  }} />
                  <div style={{
                    position: 'absolute',
                    top: '75%',
                    left: '6px',
                    width: '10px',
                    height: '1px',
                    background: 'rgba(0,0,0,0.2)'
                  }} />
                </div>

                {/* Volume Numbers & Percentage */}
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '1.7rem', fontWeight: 900, color: tank.color, lineHeight: 1.1 }}>
                    {currentPct}%
                  </div>
                  <div style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a', marginTop: '4px' }}>
                    {currentVol.toLocaleString('en-IN')} L
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                    of {tank.capacity.toLocaleString('en-IN')} L Capacity
                  </div>

                  <div style={{ marginTop: '8px', fontSize: '0.72rem', color: '#64748b', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <span>{tank.tanksCount} Storage Compartments</span>
                    {tank.flatsCount && (
                      <span style={{ color: '#0369a1', fontWeight: 600 }}>
                        {tank.flatsCount} Flats • ~{Math.round(currentVol / tank.flatsCount)} L / flat
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Interactive Level Slider */}
              <div style={{
                background: '#f8fafc',
                padding: '10px 12px',
                borderRadius: '10px',
                border: '1px solid #f1f5f9'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: '#64748b', marginBottom: '4px' }}>
                  <span>Simulate Level:</span>
                  <strong>{currentPct}%</strong>
                </div>
                <input
                  type="range"
                  min="5"
                  max="100"
                  value={currentPct}
                  onChange={(e) => updateLevel(key, e.target.value)}
                  style={{ width: '100%', accentColor: tank.color, cursor: 'pointer' }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* TANKER REPLENISHMENT & DEFICIT CALCULATOR                     */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div style={{
        background: '#ffffff',
        borderRadius: '16px',
        border: '1px solid #e2e8f0',
        padding: '24px',
        boxShadow: '0 2px 12px rgba(0,0,0,0.03)'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          marginBottom: '16px',
          paddingBottom: '12px',
          borderBottom: '1px solid #f1f5f9'
        }}>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '8px',
            background: '#eff6ff',
            color: '#2563eb',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Calculator size={18} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>
              Water Tanker Order & Replenishment Estimator
            </h3>
            <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
              Calculate tanker deliveries required to fill Common Underground Sump (325,000 L)
            </span>
          </div>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '24px',
          alignItems: 'center'
        }}>
          {/* Inputs */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                Target Underground Sump Fill Level:
              </label>
              <div style={{ display: 'flex', gap: '8px' }}>
                {[80, 90, 95, 100].map(pct => (
                  <button
                    key={pct}
                    onClick={() => setTargetSumpPct(pct)}
                    style={{
                      flex: 1,
                      padding: '8px 10px',
                      borderRadius: '8px',
                      border: targetSumpPct === pct ? '2px solid #0284c7' : '1px solid #cbd5e1',
                      background: targetSumpPct === pct ? '#f0f9ff' : '#fff',
                      color: targetSumpPct === pct ? '#0284c7' : '#475569',
                      fontWeight: 700,
                      fontSize: '0.82rem',
                      cursor: 'pointer'
                    }}
                  >
                    {pct}% Fill
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                Water Tanker Capacity Size:
              </label>
              <div style={{ display: 'flex', gap: '8px' }}>
                {[
                  { size: 10000, label: '10,000 L Standard' },
                  { size: 12000, label: '12,000 L Multi-axle' },
                  { size: 15000, label: '15,000 L Heavy' }
                ].map(opt => (
                  <button
                    key={opt.size}
                    onClick={() => setTankerCapacityOption(opt.size)}
                    style={{
                      flex: 1,
                      padding: '8px 10px',
                      borderRadius: '8px',
                      border: tankerCapacityOption === opt.size ? '2px solid #2563eb' : '1px solid #cbd5e1',
                      background: tankerCapacityOption === opt.size ? '#eff6ff' : '#fff',
                      color: tankerCapacityOption === opt.size ? '#1d4ed8' : '#475569',
                      fontWeight: 700,
                      fontSize: '0.78rem',
                      cursor: 'pointer'
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                Estimated Cost per Tanker (₹):
              </label>
              <input
                type="number"
                value={tankerRateEstimate}
                onChange={(e) => setTankerRateEstimate(Number(e.target.value))}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.9rem',
                  fontWeight: 600
                }}
              />
            </div>
          </div>

          {/* Result Output Card */}
          <div style={{
            background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
            borderRadius: '16px',
            padding: '24px',
            border: '1px solid #bae6fd',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#0369a1', fontWeight: 700, fontSize: '0.85rem' }}>
              <Truck size={18} /> Recommended Tanker Order
            </div>

            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
              <span style={{ fontSize: '2.5rem', fontWeight: 900, color: '#0284c7' }}>
                {tankersRequired}
              </span>
              <span style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a' }}>
                Tankers ({tankerCapacityOption.toLocaleString('en-IN')} L each)
              </span>
            </div>

            <div style={{ fontSize: '0.82rem', color: '#475569', lineHeight: 1.6 }}>
              • Sump Deficit to {targetSumpPct}%: <strong>{ugDeficitLitres.toLocaleString('en-IN')} Litres</strong><br />
              • Current Sump Level: <strong>{levels.common_underground}% ({ugCurrentLitres.toLocaleString('en-IN')} L)</strong><br />
              • Estimated Order Cost: <strong style={{ color: '#0f172a', fontSize: '1rem' }}>₹{estimatedCost.toLocaleString('en-IN')}</strong> (@ ₹{tankerRateEstimate}/tanker)
            </div>

            {ugDeficitLitres === 0 && (
              <div style={{
                background: '#dcfce7',
                color: '#15803d',
                padding: '8px 12px',
                borderRadius: '8px',
                fontSize: '0.78rem',
                fontWeight: 700
              }}>
                ✓ Underground Sump is already at or above target capacity!
              </div>
            )}
          </div>
        </div>
      </div>

    </div>
  );
}
