import React, { useState } from 'react';
import SecurityAttendanceManager from './SecurityAttendanceManager.jsx';
import SecurityBillCalculator from './SecurityBillCalculator.jsx';
import SectionCard from './SectionCard.jsx';

export default function SecurityModule() {
  const [subTab, setSubTab] = useState('tracking');

  return (
    <div className="security-module">
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
          onClick={() => setSubTab('tracking')}
          className={`sub-tab-button ${subTab === 'tracking' ? 'active' : ''}`}
          style={{
            padding: '10px 20px',
            borderRadius: '8px',
            border: 'none',
            background: subTab === 'tracking' ? '#1e3a8a' : 'transparent',
            color: subTab === 'tracking' ? 'white' : '#64748b',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.2s',
            fontSize: '0.9rem'
          }}
        >
          🛡️ Guard Deployment
        </button>
        <button 
          onClick={() => setSubTab('billing')}
          className={`sub-tab-button ${subTab === 'billing' ? 'active' : ''}`}
          style={{
            padding: '10px 20px',
            borderRadius: '8px',
            border: 'none',
            background: subTab === 'billing' ? '#1e3a8a' : 'transparent',
            color: subTab === 'billing' ? 'white' : '#64748b',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.2s',
            fontSize: '0.9rem'
          }}
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
            <SecurityAttendanceManager />
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
