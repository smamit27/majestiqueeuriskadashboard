import React, { useState } from 'react';
import SolarVendorTracker from './SolarVendorTracker.jsx';
import SolarVendorCompare from './SolarVendorCompare.jsx';
import SolarOverview from './SolarOverview.jsx';
import './SolarModule.css';


export default function SolarModule({ isAdmin = false }) {
  const [subTab, setSubTab] = useState('overview');

  return (
    <div className="solar-module">
      <div className="tab-navigation solar-module-s1">
        <button 
          onClick={() => setSubTab('overview')}
          className={`sub-tab-button ${subTab === 'overview' ? 'active' : ''} solar-module-s2`}
          style={{ background: subTab === 'overview' ? '#1e3a8a' : 'transparent', color: subTab === 'overview' ? 'white' : '#64748b' }}
        >
          📊 Overview
        </button>
        <button 
          onClick={() => setSubTab('tracker')}
          className={`sub-tab-button ${subTab === 'tracker' ? 'active' : ''} solar-module-s2`}
          style={{ background: subTab === 'tracker' ? '#1e3a8a' : 'transparent', color: subTab === 'tracker' ? 'white' : '#64748b' }}
        >
          📝 Evaluation Checklist
        </button>
        <button 
          onClick={() => setSubTab('compare')}
          className={`sub-tab-button ${subTab === 'compare' ? 'active' : ''} solar-module-s2`}
          style={{ background: subTab === 'compare' ? '#1e3a8a' : 'transparent', color: subTab === 'compare' ? 'white' : '#64748b' }}
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
