import React, { useState } from 'react';
import HousekeepingAttendanceManager from './HousekeepingAttendanceManager.jsx';
import HousekeepingBillCalculator from './HousekeepingBillCalculator.jsx';
import SectionCard from '../molecules/SectionCard.jsx';
import './HousekeepingModule.css';


export default function HousekeepingModule({ isAdmin = false, staffMembers, staffPresentCount, totalStaffCount }) {
  const [subTab, setSubTab] = useState('tracking');

  return (
    <div className="housekeeping-module">
      <div className="tab-navigation housekeeping-module-s1">
        <button
          onClick={() => setSubTab('tracking')}
          className={`sub-tab-button ${subTab === 'tracking' ? 'active' : ''} housekeeping-module-s2`}
          style={{ background: subTab === 'tracking' ? '#1e3a8a' : 'transparent', color: subTab === 'tracking' ? 'white' : '#64748b' }}
        >
          📋 Housekeeping Deployment
        </button>
        <button
          onClick={() => setSubTab('billing')}
          className={`sub-tab-button ${subTab === 'billing' ? 'active' : ''} housekeeping-module-s2`}
          style={{ background: subTab === 'billing' ? '#1e3a8a' : 'transparent', color: subTab === 'billing' ? 'white' : '#64748b' }}
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
