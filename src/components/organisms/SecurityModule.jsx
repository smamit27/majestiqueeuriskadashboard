import React, { useState } from 'react';
import SecurityAttendanceManager from './SecurityAttendanceManager.jsx';
import SecurityBillCalculator from './SecurityBillCalculator.jsx';
import SectionCard from '../molecules/SectionCard.jsx';
import './SecurityModule.css';


export default function SecurityModule({ isAdmin = false }) {
  const [subTab, setSubTab] = useState('tracking');

  return (
    <div className="security-module">
      <div className="tab-navigation security-module-s1">
        <button 
          onClick={() => setSubTab('tracking')}
          className={`sub-tab-button ${subTab === 'tracking' ? 'active' : ''} security-module-s2`}
          style={{ background: subTab === 'tracking' ? '#1e3a8a' : 'transparent', color: subTab === 'tracking' ? 'white' : '#64748b' }}
        >
          🛡️ Guard Deployment
        </button>
        <button 
          onClick={() => setSubTab('billing')}
          className={`sub-tab-button ${subTab === 'billing' ? 'active' : ''} security-module-s2`}
          style={{ background: subTab === 'billing' ? '#1e3a8a' : 'transparent', color: subTab === 'billing' ? 'white' : '#64748b' }}
        >
          💰 Bill Calculator
        </button>
      </div>

      <div className="module-content">
        {subTab === 'tracking' && (
          <SectionCard
            id="security-attendance"
            badge="Security Staff Tracker"
            title="Guard deployment and post coverage"
            subtitle="Track daily guard counts across A Building, B Building, C Building, Common Area, and Chauhanji."
          >
            <SecurityAttendanceManager isAdmin={isAdmin} />
          </SectionCard>
        )}
        {subTab === 'billing' && (
          <SectionCard
            id="security-billing"
            badge="Security Billing Calculator"
            title="Monthly bill breakdown per building"
            subtitle="Auto-calculates Chauhan's rotation and splits vendor guard and main gate costs."
          >
            <SecurityBillCalculator />
          </SectionCard>
        )}
      </div>
    </div>
  );
}
