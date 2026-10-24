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
import './WaterTankLevelMonitor.css';


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
    <div className="water-tank-level-monitor-s1">
      
      {/* Overall Society Water Autonomy Banner */}
      <div className="water-tank-level-monitor-s2">
        <div>
          <div className="water-tank-level-monitor-s3">
            <span className="water-tank-level-monitor-s4">
              Live Telemetry & Simulation
            </span>
            <span className="water-tank-level-monitor-s5">
              Real-time Float Switches & Ultrasonic Sensors
            </span>
          </div>
          <h2 className="water-tank-level-monitor-s6">
            {totalSocietyLitres.toLocaleString('en-IN')} Litres Available
          </h2>
          <p className="water-tank-level-monitor-s7">
            {totalSocietyPct}% of 5,39,400 Litres total society storage capacity • <strong>{daysAutonomy} Days</strong> estimated reserve autonomy (~{Math.round(totalSocietyLitres / 231)} L / flat across 231 flats)
          </p>
        </div>

        <div className="water-tank-level-monitor-s8">
          <button
            onClick={resetLevels}
            className="water-tank-level-monitor-s9"
          >
            <RotateCcw size={14} /> Reset Levels
          </button>
        </div>
      </div>

      {/* 4 Storage Cylinders Grid */}
      <div className="water-tank-level-monitor-s10">
        {Object.entries(WATER_TANKS_DATA).map(([key, tank]) => {
          const currentPct = levels[key];
          const currentVol = Math.round((currentPct / 100) * tank.capacity);
          const st = getStatus(currentPct);

          return (
            <div
              key={key}
              className="water-tank-level-monitor-s11"
            >
              {/* Header */}
              <div className="water-tank-level-monitor-s12">
                <div>
                  <h3 className="water-tank-level-monitor-s13">
                    {tank.shortName}
                  </h3>
                  <span className="water-tank-level-monitor-s14">{tank.building}</span>
                </div>
                <div className="water-tank-level-monitor-s15" style={{ background: st.bg, color: st.color }}>
                  {st.icon} {st.text}
                </div>
              </div>

              {/* Cylindrical Liquid Tank Gauge */}
              <div className="water-tank-level-monitor-s16">
                {/* 3D Glass Cylinder */}
                <div className="water-tank-level-monitor-s17">
                  {/* Liquid Fill */}
                  <div className="water-tank-level-monitor-s18" style={{ height: `${currentPct}%`, background: tank.gradient || tank.color, boxShadow: `0 0 16px ${tank.color}66` }}>
                    {/* Surface meniscus line */}
                    <div className="water-tank-level-monitor-s19" />
                  </div>

                  {/* Glass Reflection Highlight */}
                  <div className="water-tank-level-monitor-s20" />

                  {/* Level tick marks */}
                  <div className="water-tank-level-monitor-s21" />
                  <div className="water-tank-level-monitor-s22" />
                  <div className="water-tank-level-monitor-s23" />
                </div>

                {/* Volume Numbers & Percentage */}
                <div className="water-tank-level-monitor-s24">
                  <div className="water-tank-level-monitor-s25" style={{ color: tank.color }}>
                    {currentPct}%
                  </div>
                  <div className="water-tank-level-monitor-s26">
                    {currentVol.toLocaleString('en-IN')} L
                  </div>
                  <div className="water-tank-level-monitor-s14">
                    of {tank.capacity.toLocaleString('en-IN')} L Capacity
                  </div>

                  <div className="water-tank-level-monitor-s27">
                    <span>{tank.tanksCount} Storage Compartments</span>
                    {tank.flatsCount && (
                      <span className="water-tank-level-monitor-s28">
                        {tank.flatsCount} Flats • ~{Math.round(currentVol / tank.flatsCount)} L / flat
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Interactive Level Slider */}
              <div className="water-tank-level-monitor-s29">
                <div className="water-tank-level-monitor-s30">
                  <span>Simulate Level:</span>
                  <strong>{currentPct}%</strong>
                </div>
                <input
                  type="range"
                  min="5"
                  max="100"
                  value={currentPct}
                  onChange={(e) => updateLevel(key, e.target.value)}
                  className="water-tank-level-monitor-s31" style={{ accentColor: tank.color }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* TANKER REPLENISHMENT & DEFICIT CALCULATOR                     */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="water-tank-level-monitor-s32">
        <div className="water-tank-level-monitor-s33">
          <div className="water-tank-level-monitor-s34">
            <Calculator size={18} />
          </div>
          <div>
            <h3 className="water-tank-level-monitor-s35">
              Water Tanker Order & Replenishment Estimator
            </h3>
            <span className="water-tank-level-monitor-s36">
              Calculate tanker deliveries required to fill Common Underground Sump (325,000 L)
            </span>
          </div>
        </div>

        <div className="water-tank-level-monitor-s37">
          {/* Inputs */}
          <div className="water-tank-level-monitor-s38">
            <div>
              <label className="water-tank-level-monitor-s39">
                Target Underground Sump Fill Level:
              </label>
              <div className="water-tank-level-monitor-s40">
                {[80, 90, 95, 100].map(pct => (
                  <button
                    key={pct}
                    onClick={() => setTargetSumpPct(pct)}
                    className="water-tank-level-monitor-s41" style={{ border: targetSumpPct === pct ? '2px solid #0284c7' : '1px solid #cbd5e1', background: targetSumpPct === pct ? '#f0f9ff' : '#fff', color: targetSumpPct === pct ? '#0284c7' : '#475569' }}
                  >
                    {pct}% Fill
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="water-tank-level-monitor-s39">
                Water Tanker Capacity Size:
              </label>
              <div className="water-tank-level-monitor-s40">
                {[
                  { size: 10000, label: '10,000 L Standard' },
                  { size: 12000, label: '12,000 L Multi-axle' },
                  { size: 15000, label: '15,000 L Heavy' }
                ].map(opt => (
                  <button
                    key={opt.size}
                    onClick={() => setTankerCapacityOption(opt.size)}
                    className="water-tank-level-monitor-s42" style={{ border: tankerCapacityOption === opt.size ? '2px solid #2563eb' : '1px solid #cbd5e1', background: tankerCapacityOption === opt.size ? '#eff6ff' : '#fff', color: tankerCapacityOption === opt.size ? '#1d4ed8' : '#475569' }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="water-tank-level-monitor-s39">
                Estimated Cost per Tanker (₹):
              </label>
              <input
                type="number"
                value={tankerRateEstimate}
                onChange={(e) => setTankerRateEstimate(Number(e.target.value))}
                className="water-tank-level-monitor-s43"
              />
            </div>
          </div>

          {/* Result Output Card */}
          <div className="water-tank-level-monitor-s44">
            <div className="water-tank-level-monitor-s45">
              <Truck size={18} /> Recommended Tanker Order
            </div>

            <div className="water-tank-level-monitor-s46">
              <span className="water-tank-level-monitor-s47">
                {tankersRequired}
              </span>
              <span className="water-tank-level-monitor-s48">
                Tankers ({tankerCapacityOption.toLocaleString('en-IN')} L each)
              </span>
            </div>

            <div className="water-tank-level-monitor-s49">
              • Sump Deficit to {targetSumpPct}%: <strong>{ugDeficitLitres.toLocaleString('en-IN')} Litres</strong><br />
              • Current Sump Level: <strong>{levels.common_underground}% ({ugCurrentLitres.toLocaleString('en-IN')} L)</strong><br />
              • Estimated Order Cost: <strong className="water-tank-level-monitor-s50">₹{estimatedCost.toLocaleString('en-IN')}</strong> (@ ₹{tankerRateEstimate}/tanker)
            </div>

            {ugDeficitLitres === 0 && (
              <div className="water-tank-level-monitor-s51">
                ✓ Underground Sump is already at or above target capacity!
              </div>
            )}
          </div>
        </div>
      </div>

    </div>
  );
}
