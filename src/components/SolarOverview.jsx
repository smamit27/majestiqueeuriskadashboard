import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';

const costData = [
  { name: 'SolarSquare', cost: 11.5, fill: '#0B2B26' },
  { name: 'AFM Solar', cost: 9.75, fill: '#C49B4F' },
  { name: 'Suryatech', cost: 10.5, fill: '#1E3A8A' },
];

const generationData = [
  { year: 'Year 1', SolarSquare: 31000, AFMSolar: 29500, Suryatech: 28500 },
  { year: 'Year 5', SolarSquare: 30380, AFMSolar: 28910, Suryatech: 27930 },
  { year: 'Year 10', SolarSquare: 29620, AFMSolar: 28187, Suryatech: 27231 },
  { year: 'Year 15', SolarSquare: 28879, AFMSolar: 27482, Suryatech: 26550 },
  { year: 'Year 20', SolarSquare: 28157, AFMSolar: 26795, Suryatech: 25886 },
];

export default function SolarOverview() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', minWidth: 0 }}>
      {/* Header */}
      <div className="table-card" style={{ padding: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ margin: 0, color: '#0B2B26', fontSize: '1.5rem', letterSpacing: '0.02em' }}>SOLAR VENDOR COMPARISON DASHBOARD</h2>
        </div>
        <div>
          <img src="/favicon.png" alt="Majestique Euriska" style={{ height: '48px' }} />
        </div>
      </div>

      {/* Top 4 Metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
        <div className="table-card" style={{ padding: '24px', textAlign: 'center' }}>
          <p style={{ margin: '0 0 8px 0', fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>System Size</p>
          <p style={{ margin: 0, fontSize: '2rem', fontWeight: 800, color: '#0B2B26' }}>20 kW</p>
        </div>
        <div className="table-card" style={{ padding: '24px', textAlign: 'center' }}>
          <p style={{ margin: '0 0 8px 0', fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Est. Annual Generation</p>
          <p style={{ margin: 0, fontSize: '2rem', fontWeight: 800, color: '#0B2B26' }}>30,000+</p>
          <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: '#64748b', fontWeight: 500 }}>UNITS</p>
        </div>
        <div className="table-card" style={{ padding: '24px', textAlign: 'center' }}>
          <p style={{ margin: '0 0 8px 0', fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Est. Savings / Year</p>
          <p style={{ margin: 0, fontSize: '2rem', fontWeight: 800, color: '#0B2B26' }}>₹2.5 - 3.0</p>
          <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: '#64748b', fontWeight: 500 }}>LAKHS</p>
        </div>
        <div className="table-card" style={{ padding: '24px', textAlign: 'center' }}>
          <p style={{ margin: '0 0 8px 0', fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Payback Period</p>
          <p style={{ margin: 0, fontSize: '2rem', fontWeight: 800, color: '#0B2B26' }}>3.5 - 4.5</p>
          <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: '#64748b', fontWeight: 500 }}>YEARS</p>
        </div>
      </div>

      {/* Charts Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '20px' }}>
        {/* Cost Chart */}
        <div className="table-card" style={{ padding: '24px' }}>
          <h3 style={{ margin: '0 0 20px 0', fontSize: '0.9rem', color: '#334155', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Cost Comparison (₹ Lakhs)</h3>
          <div style={{ height: '300px', width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={costData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dx={-10} domain={[0, 15]} ticks={[0, 5, 10, 15]} tickFormatter={(val) => `${val}L`} />
                <RechartsTooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }} />
                <Bar dataKey="cost" radius={[4, 4, 0, 0]} maxBarSize={60}>
                  {costData.map((entry, index) => (
                    <cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Generation Chart */}
        <div className="table-card" style={{ padding: '24px' }}>
          <h3 style={{ margin: '0 0 20px 0', fontSize: '0.9rem', color: '#334155', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Annual Generation (Units)</h3>
          <div style={{ height: '300px', width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={generationData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="year" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dx={-10} domain={[20000, 35000]} ticks={[20000, 25000, 30000, 35000]} tickFormatter={(val) => `${val/1000}K`} />
                <RechartsTooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }} />
                <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px', fontSize: '12px' }} />
                <Line type="monotone" dataKey="SolarSquare" stroke="#0B2B26" strokeWidth={3} dot={{ r: 4, fill: '#0B2B26' }} activeDot={{ r: 6 }} />
                <Line type="monotone" dataKey="AFMSolar" name="AFM Solar" stroke="#C49B4F" strokeWidth={3} dot={{ r: 4, fill: '#C49B4F' }} activeDot={{ r: 6 }} />
                <Line type="monotone" dataKey="Suryatech" stroke="#1E3A8A" strokeWidth={3} dot={{ r: 4, fill: '#1E3A8A' }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Bottom 3 Metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
        <div className="table-card" style={{ padding: '24px', display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{ width: '60px', height: '60px', borderRadius: '50%', border: '6px solid #0B2B26', borderRightColor: '#C49B4F', transform: 'rotate(-45deg)' }}></div>
          <div>
            <p style={{ margin: '0 0 4px 0', fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Performance Ratio (PR)</p>
            <p style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800, color: '#0B2B26' }}>75%+ <span style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: 500 }}>Target</span></p>
          </div>
        </div>
        <div className="table-card" style={{ padding: '24px', display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>🛡️</div>
          <div>
            <p style={{ margin: '0 0 4px 0', fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Warranty Coverage</p>
            <p style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800, color: '#0B2B26' }}>25 <span style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: 500 }}>YEARS (Panels)</span></p>
          </div>
        </div>
        <div className="table-card" style={{ padding: '24px', display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>💰</div>
          <div>
            <p style={{ margin: '0 0 4px 0', fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>ROI Over 25 Years</p>
            <p style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800, color: '#0B2B26' }}>2.5x - 3x <span style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: 500, display: 'block' }}>Return on Investment</span></p>
          </div>
        </div>
      </div>
    </div>
  );
}
