import React from 'react';

const COMPARISON_DATA = [
  { icon: '🖥️', criteria: 'System Size', v1: '20 kW', v2: '20 kW', v3: '20 kW' },
  { icon: '₹', criteria: 'Estimated Cost', v1: '₹11-12L', v2: '₹9-10.5L', v3: '₹10-11L' },
  { icon: '☀️', criteria: 'Panels (Brand/Type)', v1: 'Waaree/Vikram TOPCon', v2: 'Waaree/Vikram', v3: 'Mixed Tier-1' },
  { icon: '⚡', criteria: 'Panel Efficiency', v1: '>21-22%', v2: '>21%', v3: '>21%' },
  { icon: '🛡️', criteria: 'Panel Warranty', v1: '25-30 yrs', v2: '25 yrs', v3: '25 yrs' },
  { icon: '📉', criteria: 'Panel Degradation', v1: '~1.5% (Yr1), then ~0.5%/yr', v2: 'Similar', v3: 'Slightly higher' },
  { icon: '📜', criteria: 'Panel Certifications', v1: 'IEC 61215, 61730', v2: 'Same', v3: 'Same' },
  { icon: '🔌', criteria: 'Inverter', v1: 'Sungrow (20kW)', v2: 'Growatt/Sungrow', v3: 'Mixed' },
  { icon: '🛡️', criteria: 'Inverter Warranty', v1: '8-10 yrs', v2: '8 yrs', v3: '5-8 yrs' },
  { icon: '⚙️', criteria: 'DC/AC Ratio', v1: 'Optimized (~1.1-1.2)', v2: 'Optimized', v3: 'Medium' },
  { icon: '📊', criteria: 'Annual Generation', v1: '30,000-32,000 units', v2: '28,000-31,000', v3: '27,000-30,000' },
  { icon: '✅', criteria: 'Generation Guarantee', v1: 'Yes', v2: 'Partial', v3: 'Limited' },
  { icon: '📈', criteria: 'Performance Ratio (PR)', v1: '≥75%', v2: '~72-75%', v3: '~70-73%' },
  { icon: '🏗️', criteria: 'Structure Type', v1: 'HDGI Elevated', v2: 'GI Elevated', v3: 'GI Elevated' },
  { icon: '📏', criteria: 'GI Coating Thickness', v1: '≥80 micron', v2: '70-80 micron', v3: '~70 micron' },
  { icon: '🌬️', criteria: 'Wind Load Capacity', v1: '≥150 km/h', v2: '~140 km/h', v3: '~130 km/h' },
  { icon: '💧', criteria: 'Waterproofing Responsibility', v1: 'Included', v2: 'Case-based', v3: 'Case-based' },
  { icon: '🎛️', criteria: 'DCDB/ACDB Quality', v1: 'Schneider/L&T', v2: 'Good brands', v3: 'Good' },
  { icon: '🔌', criteria: 'Cabling', v1: 'Polycab/Finolex', v2: 'Polycab', v3: 'Standard' },
  { icon: '⏚', criteria: 'Earthing & LA', v1: 'Certified', v2: 'Included', v3: 'Included' },
  { icon: '🏥', criteria: 'Safety Compliance', v1: 'Excellent', v2: 'Good', v3: 'Good' },
  { icon: '📱', criteria: 'Monitoring System', v1: 'Advanced App', v2: 'Standard App', v3: 'Basic' },
  { icon: '🔁', criteria: 'Net Metering Handling', v1: 'Full handling', v2: 'Full handling', v3: 'Full handling' },
  { icon: '📝', criteria: 'Approvals (MSEDCL)', v1: 'Fully handled', v2: 'Handled', v3: 'Handled' },
  { icon: '🔧', criteria: 'AMC (Maintenance)', v1: 'Included + Paid plan', v2: 'Optional', v3: 'Optional' },
  { icon: '⭐', criteria: 'After Sales Service', v1: '★★★★★ Excellent', v2: '★★★★ Good', v3: '★★★★ Good' },
  { icon: '🏢', criteria: 'Experience (Society Projects)', v1: '★★★★★ Very High', v2: '★★★★ High', v3: '★★★ Medium' },
  { icon: '⚠️', criteria: 'Execution Risk', v1: 'Low', v2: 'Low-Medium', v3: 'Medium' },
  { icon: '🌍', criteria: 'Earthquake / Disaster Protection', v1: 'Standard compliant structure', v2: 'Basic compliance', v3: 'Basic compliance' },
  { icon: '🌪️', criteria: 'Wind / Storm Safety', v1: 'High', v2: 'Medium-High', v3: 'Medium' },
  { icon: '🛡️', criteria: 'Insurance Coverage', v1: 'Optional guidance', v2: 'Not included', v3: 'Not included' },
  { icon: '💥', criteria: 'Damage Responsibility (Disaster)', v1: 'Not covered (Force Majeure)', v2: 'Not covered', v3: 'Not covered' },
  { icon: '☂️', criteria: 'Recommended Insurance', v1: 'Required', v2: 'Required', v3: 'Required' },
];

export default function SolarVendorCompare() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, minWidth: 0 }}>
      <div className="table-card attendance-table-card" style={{ padding: 0 }}>
        <div className="attendance-table-card__header">
          <div>
            <p className="eyebrow">Project Final Evaluation</p>
            <h3>Final Solar Vendor Comparison (20 kW)</h3>
          </div>
          <div className="attendance-table-card__actions">
            <span style={{ fontSize: '0.85rem', color: '#6b7280', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ color: '#f59e0b' }}>☀️</span> Evaluate • Compare • Choose
            </span>
          </div>
        </div>
      </div>

      <div className="table-card" style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', padding: 0 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
          <thead>
            <tr>
              <th style={{ background: '#1e3a8a', color: 'white', padding: '16px', textAlign: 'left', fontWeight: 700, width: '250px', letterSpacing: '0.05em' }}>
                CRITERIA
              </th>
              <th style={{ background: '#1d4ed8', color: 'white', padding: '16px', textAlign: 'center', minWidth: '200px' }}>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '4px' }}>SOLARSQUARE</div>
                <div style={{ fontSize: '0.75rem', color: '#fbbf24', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                  ★★★★★ <span style={{ color: 'white', fontWeight: 600 }}>EXCELLENT</span>
                </div>
              </th>
              <th style={{ background: '#15803d', color: 'white', padding: '16px', textAlign: 'center', minWidth: '200px' }}>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '4px' }}>AFM SOLAR</div>
                <div style={{ fontSize: '0.75rem', color: '#fbbf24', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                  ★★★★☆ <span style={{ color: 'white', fontWeight: 600 }}>GOOD</span>
                </div>
              </th>
              <th style={{ background: '#ea580c', color: 'white', padding: '16px', textAlign: 'center', minWidth: '200px' }}>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '4px' }}>SURYATECH</div>
                <div style={{ fontSize: '0.75rem', color: '#fbbf24', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                  ★★★☆☆ <span style={{ color: 'white', fontWeight: 600 }}>GOOD</span>
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            {COMPARISON_DATA.map((row, idx) => (
              <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0', background: idx % 2 === 0 ? '#ffffff' : '#f8fafc' }}>
                <td style={{ padding: '10px 16px', fontWeight: 600, color: '#334155', borderRight: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ width: '20px', textAlign: 'center', filter: 'grayscale(0.2)' }}>{row.icon}</span>
                  {row.criteria}
                </td>
                <td style={{ padding: '10px 16px', textAlign: 'center', color: '#1e293b', fontWeight: row.v1.includes('Excellent') || row.v1.includes('Optimized') || row.v1.includes('Very High') ? 700 : 500 }}>
                  {row.v1}
                </td>
                <td style={{ padding: '10px 16px', textAlign: 'center', color: '#475569' }}>
                  {row.v2}
                </td>
                <td style={{ padding: '10px 16px', textAlign: 'center', color: '#475569' }}>
                  {row.v3}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 20px', background: '#eff6ff', borderRadius: '8px', border: '1px solid #bfdbfe', color: '#1e40af', fontSize: '0.9rem', fontWeight: 500 }}>
        <div style={{ background: '#1e3a8a', color: 'white', width: '28px', height: '28px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>₹</div>
        Note: Solar plant insurance will be taken separately by society to cover natural risks.
      </div>
    </div>
  );
}
