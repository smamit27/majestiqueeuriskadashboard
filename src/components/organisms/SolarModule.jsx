import React, { useState } from 'react';
import SolarVendorTracker from './SolarVendorTracker.jsx';
import SolarVendorCompare from './SolarVendorCompare.jsx';
import SolarOverview from './SolarOverview.jsx';

export default function SolarModule({ isAdmin = false }) {
  const [subTab, setSubTab] = useState('overview');

  return (
    <div className="solar-module">
      <div className="tab-navigation" style={{ 
        display: 'flex', 
        gap: '12px', 
        marginBottom: '24px', 
        background: 'rgba(255, 255, 255, 0.5)', 
        padding: '8px', 
        borderRadius: '12px',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(0,0,0,0.05)',
        position: 'sticky',
        top: '0',
        zIndex: 10
      }}>
        <button 
          onClick={() => setSubTab('overview')}
          className={`sub-tab-button ${subTab === 'overview' ? 'active' : ''}`}
          style={{
            padding: '10px 20px',
            borderRadius: '8px',
            border: 'none',
            background: subTab === 'overview' ? '#1e3a8a' : 'transparent',
            color: subTab === 'overview' ? 'white' : '#64748b',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.2s',
            fontSize: '0.9rem'
          }}
        >
          📊 Overview
        </button>
        <button 
          onClick={() => setSubTab('tracker')}
          className={`sub-tab-button ${subTab === 'tracker' ? 'active' : ''}`}
          style={{
            padding: '10px 20px',
            borderRadius: '8px',
            border: 'none',
            background: subTab === 'tracker' ? '#1e3a8a' : 'transparent',
            color: subTab === 'tracker' ? 'white' : '#64748b',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.2s',
            fontSize: '0.9rem'
          }}
        >
          📝 Evaluation Checklist
        </button>
        <button 
          onClick={() => setSubTab('compare')}
          className={`sub-tab-button ${subTab === 'compare' ? 'active' : ''}`}
          style={{
            padding: '10px 20px',
            borderRadius: '8px',
            border: 'none',
            background: subTab === 'compare' ? '#1e3a8a' : 'transparent',
            color: subTab === 'compare' ? 'white' : '#64748b',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.2s',
            fontSize: '0.9rem'
          }}
        >
          ⚖️ Comparison Matrix
        </button>
      </div>

      <div className="solar-content-panel">
        {subTab === 'overview' && <SolarOverview isAdmin={isAdmin} />}
        {subTab === 'tracker' && <SolarVendorTracker isAdmin={isAdmin} />}
        {subTab === 'compare' && <SolarVendorCompare isAdmin={isAdmin} />}
      </div>
    </div>
  );
}
