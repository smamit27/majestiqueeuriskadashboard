import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import './SolarOverview.css';


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
    <div className="solar-overview-s1">
      {/* Header */}
      <div className="table-card solar-overview-s2">
        <div>
          <h2 className="solar-overview-s3">SOLAR VENDOR COMPARISON DASHBOARD</h2>
        </div>
        <div>
          <img src="/favicon.png" alt="Majestique Euriska" className="solar-overview-s4" />
        </div>
      </div>

      {/* Top 4 Metrics */}
      <div className="solar-overview-s5">
        <div className="table-card solar-overview-s6">
          <p className="solar-overview-s7">System Size</p>
          <p className="solar-overview-s8">20 kW</p>
        </div>
        <div className="table-card solar-overview-s6">
          <p className="solar-overview-s7">Est. Annual Generation</p>
          <p className="solar-overview-s8">30,000+</p>
          <p className="solar-overview-s9">UNITS</p>
        </div>
        <div className="table-card solar-overview-s6">
          <p className="solar-overview-s7">Est. Savings / Year</p>
          <p className="solar-overview-s8">₹2.5 - 3.0</p>
          <p className="solar-overview-s9">LAKHS</p>
        </div>
        <div className="table-card solar-overview-s6">
          <p className="solar-overview-s7">Payback Period</p>
          <p className="solar-overview-s8">3.5 - 4.5</p>
          <p className="solar-overview-s9">YEARS</p>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="solar-overview-s10">
        {/* Cost Chart */}
        <div className="table-card solar-overview-s11">
          <h3 className="solar-overview-s12">Cost Comparison (₹ Lakhs)</h3>
          <div className="solar-overview-s13">
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
        <div className="table-card solar-overview-s11">
          <h3 className="solar-overview-s12">Annual Generation (Units)</h3>
          <div className="solar-overview-s13">
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
      <div className="solar-overview-s14">
        <div className="table-card solar-overview-s15">
          <div className="solar-overview-s16"></div>
          <div>
            <p className="solar-overview-s17">Performance Ratio (PR)</p>
            <p className="solar-overview-s18">75%+ <span className="solar-overview-s19">Target</span></p>
          </div>
        </div>
        <div className="table-card solar-overview-s15">
          <div className="solar-overview-s20">🛡️</div>
          <div>
            <p className="solar-overview-s17">Warranty Coverage</p>
            <p className="solar-overview-s18">25 <span className="solar-overview-s19">YEARS (Panels)</span></p>
          </div>
        </div>
        <div className="table-card solar-overview-s15">
          <div className="solar-overview-s20">💰</div>
          <div>
            <p className="solar-overview-s17">ROI Over 25 Years</p>
            <p className="solar-overview-s18">2.5x - 3x <span className="solar-overview-s21">Return on Investment</span></p>
          </div>
        </div>
      </div>
    </div>
  );
}
