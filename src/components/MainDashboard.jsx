import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Cell } from 'recharts';

export default function MainDashboard({ stats }) {
  const {
    duesCollected,
    totalOutstanding,
    collectionRate,
    openComplaints,
    activeVisitors,
    staffPresent,
    financeSnapshot,
    nextEvent
  } = stats;

  const fmt = (v) => Number(v).toLocaleString('en-IN');

  const chartData = [
    { name: 'Collected', value: duesCollected, fill: '#0B2B26' },
    { name: 'Outstanding', value: totalOutstanding, fill: '#C49B4F' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', minWidth: 0 }}>
      {/* Header */}
      <div className="table-card" style={{ padding: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'linear-gradient(135deg, #0B2B26 0%, #1E3A8A 100%)', color: 'white' }}>
        <div>
          <p className="eyebrow" style={{ color: 'rgba(255,255,255,0.7)', marginBottom: '4px' }}>Welcome back, Admin</p>
          <h2 style={{ margin: 0, color: 'white', fontSize: '1.75rem', letterSpacing: '0.02em' }}>SOCIETY MANAGEMENT DASHBOARD</h2>
        </div>
        <div>
          <img src="/favicon.png" alt="Majestique Euriska" style={{ height: '56px', filter: 'brightness(0) invert(1)' }} />
        </div>
      </div>

      {/* Top 4 Metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px' }}>
        <div className="table-card" style={{ padding: '24px' }}>
          <p style={{ margin: '0 0 8px 0', fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Collection Rate</p>
          <p style={{ margin: 0, fontSize: '2.25rem', fontWeight: 800, color: '#0B2B26' }}>{collectionRate.toFixed(1)}%</p>
          <div style={{ width: '100%', height: '4px', background: '#e2e8f0', borderRadius: '2px', marginTop: '12px' }}>
            <div style={{ width: `${collectionRate}%`, height: '100%', background: '#0B2B26', borderRadius: '2px' }}></div>
          </div>
        </div>
        <div className="table-card" style={{ padding: '24px' }}>
          <p style={{ margin: '0 0 8px 0', fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Outstanding Dues</p>
          <p style={{ margin: 0, fontSize: '2.25rem', fontWeight: 800, color: '#C49B4F' }}>₹{fmt(totalOutstanding)}</p>
          <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#64748b' }}>Pending from households</p>
        </div>
        <div className="table-card" style={{ padding: '24px' }}>
          <p style={{ margin: '0 0 8px 0', fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Staff on Duty</p>
          <p style={{ margin: 0, fontSize: '2.25rem', fontWeight: 800, color: '#0B2B26' }}>{staffPresent}</p>
          <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#64748b' }}>Security & Housekeeping</p>
        </div>
        <div className="table-card" style={{ padding: '24px' }}>
          <p style={{ margin: '0 0 8px 0', fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Open Complaints</p>
          <p style={{ margin: 0, fontSize: '2.25rem', fontWeight: 800, color: openComplaints > 5 ? '#dc2626' : '#0B2B26' }}>{openComplaints}</p>
          <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#64748b' }}>Requires attention</p>
        </div>
      </div>

      {/* Main Content Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '20px' }}>
        {/* Financial Overview */}
        <div className="table-card" style={{ padding: '24px' }}>
          <h3 style={{ margin: '0 0 24px 0', fontSize: '1rem', color: '#334155', fontWeight: 700 }}>Financial Snapshot (May 2026)</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
            <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px' }}>
              <p style={{ margin: '0 0 4px 0', fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase' }}>Monthly Collections</p>
              <p style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: '#0F3D35' }}>₹{fmt(financeSnapshot.collections)}</p>
            </div>
            <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px' }}>
              <p style={{ margin: '0 0 4px 0', fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase' }}>Monthly Expenses</p>
              <p style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: '#991b1b' }}>₹{fmt(financeSnapshot.expenses)}</p>
            </div>
          </div>
          <div style={{ height: '240px', width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} layout="vertical" margin={{ left: 40, right: 40 }}>
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                <RechartsTooltip cursor={{ fill: 'transparent' }} />
                <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={40}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Operational Overview */}
        <div className="table-card" style={{ padding: '24px' }}>
          <h3 style={{ margin: '0 0 24px 0', fontSize: '1rem', color: '#334155', fontWeight: 700 }}>Operations & Community</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '16px', background: '#f8fafc', borderRadius: '12px' }}>
              <div style={{ fontSize: '24px' }}>👥</div>
              <div style={{ flex: 1 }}>
                <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 600 }}>Active Visitors</p>
                <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b' }}>Currently inside society</p>
              </div>
              <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>{activeVisitors}</div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '16px', background: '#f8fafc', borderRadius: '12px' }}>
              <div style={{ fontSize: '24px' }}>📅</div>
              <div style={{ flex: 1 }}>
                <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 600 }}>Next Event</p>
                <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b' }}>{nextEvent ? nextEvent.title : 'No upcoming events'}</p>
              </div>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#C49B4F' }}>
                {nextEvent ? nextEvent.date : '--'}
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '16px', background: '#f8fafc', borderRadius: '12px' }}>
              <div style={{ fontSize: '24px' }}>⚡</div>
              <div style={{ flex: 1 }}>
                <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 600 }}>Utility Status</p>
                <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b' }}>Solar & Power backup</p>
              </div>
              <div style={{ color: '#16a34a', fontSize: '0.75rem', fontWeight: 700 }}>HEALTHY</div>
            </div>
          </div>

          <div style={{ marginTop: '24px', padding: '16px', border: '1px dashed #e2e8f0', borderRadius: '12px', textAlign: 'center' }}>
            <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b' }}>Quick Action: <span style={{ color: '#0B2B26', fontWeight: 600, textDecoration: 'underline', cursor: 'pointer' }}>Broadcast Announcement</span></p>
          </div>
        </div>
      </div>
    </div>
  );
}
