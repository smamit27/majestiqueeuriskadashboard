import React, { useState } from 'react';
import HousekeepingAttendanceManager from './HousekeepingAttendanceManager.jsx';
import HousekeepingBillCalculator from './HousekeepingBillCalculator.jsx';
import SectionCard from './SectionCard.jsx';

export default function HousekeepingModule({ isAdmin = false, staffMembers, staffPresentCount, totalStaffCount }) {
  const [subTab, setSubTab] = useState('tracking');

  return (
    <div className="housekeeping-module">
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
          📋 Attendance Tracking ({staffPresentCount}/{totalStaffCount})
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
            id="hk_tracking"
            badge="Housekeeping Staff Tracker"
            title="Daily manpower attendance register"
            subtitle="Track daily attendance for all housekeeping staff across the full month. Save to Firebase when done."
          >
            <HousekeepingAttendanceManager isAdmin={isAdmin} staffMembers={staffMembers} />
          </SectionCard>
        )}
        {subTab === 'billing' && (
          <SectionCard
            id="hk_billing"
            badge="Housekeeping Bill Calculation"
            title="Monthly bill breakdown per building"
            subtitle="Enter salary, absences, garbage, tractor, and STP — auto-calculates A, B, C building share and saves to Firebase."
          >
            <HousekeepingBillCalculator />
          </SectionCard>
        )}
      </div>
    </div>
  );
}
