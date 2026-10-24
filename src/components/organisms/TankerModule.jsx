import React, { useState } from 'react';
import TankerTracker from './TankerTracker.jsx';
import TankerBillCalculator from './TankerBillCalculator.jsx';
import SectionCard from '../molecules/SectionCard.jsx';
import './TankerModule.css';


export default function TankerModule({ isAdmin = false }) {
  const [subTab, setSubTab] = useState('entry');

  return (
    <div className="housekeeping-module">
      <div className="tab-navigation tanker-module-s1">
        <button
          onClick={() => setSubTab('entry')}
          className={`sub-tab-button ${subTab === 'entry' ? 'active' : ''} tanker-module-s2`}
          style={{ background: subTab === 'entry' ? '#1e3a8a' : 'transparent', color: subTab === 'entry' ? 'white' : '#64748b' }}
        >
          💧 Water Tanker Entry
        </button>
        <button
          onClick={() => setSubTab('billing')}
          className={`sub-tab-button ${subTab === 'billing' ? 'active' : ''} tanker-module-s2`}
          style={{ background: subTab === 'billing' ? '#1e3a8a' : 'transparent', color: subTab === 'billing' ? 'white' : '#64748b' }}
        >
          💰 Bill Calculation
        </button>
      </div>

      <div className="module-content">
        {subTab === 'entry' && (
          <SectionCard
            id="tanker_entry"
            badge="Water Tanker Entry Register"
            title="Daily water tanker delivery log"
            subtitle="Record each water tanker delivery with date, rate per trip, and count. Auto-saves to Firebase."
          >
            <TankerTracker isAdmin={isAdmin} />
          </SectionCard>
        )}
        {subTab === 'billing' && (
          <SectionCard
            id="tanker_billing"
            badge="Water Tanker Bill Calculation"
            title="Monthly water tanker bill summary and breakdown"
            subtitle="View the complete bill for the selected month — total trips, grand total, and per-building split."
          >
            <TankerBillCalculator />
          </SectionCard>
        )}
      </div>
    </div>
  );
}
