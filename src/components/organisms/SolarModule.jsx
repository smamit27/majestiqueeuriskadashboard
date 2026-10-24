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
          className={`sub-tab-button ${subTab === 'overview' ? 'active' : ''} solar-module-s2 ${(subTab === 'overview' ? 'solar-module-cond-1-true' : 'solar-module-cond-2-false')}`}
        >
          📊 Overview
        </button>
        <button 
          onClick={() => setSubTab('tracker')}
          className={`sub-tab-button ${subTab === 'tracker' ? 'active' : ''} solar-module-s2 ${(subTab === 'tracker' ? 'solar-module-cond-3-true' : 'solar-module-cond-4-false')}`}
        >
          📝 Evaluation Checklist
        </button>
        <button 
          onClick={() => setSubTab('compare')}
          className={`sub-tab-button ${subTab === 'compare' ? 'active' : ''} solar-module-s2 ${(subTab === 'compare' ? 'solar-module-cond-5-true' : 'solar-module-cond-6-false')}`}
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
