import React, { useState } from 'react';
import TankerTracker from './TankerTracker.jsx';
import TankerBillCalculator from './TankerBillCalculator.jsx';
import SectionCard from '../molecules/SectionCard.jsx';

export default function TankerModule({ isAdmin = false }) {
  const [subTab, setSubTab] = useState('entry');

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
          onClick={() => setSubTab('entry')}
          className={`sub-tab-button ${subTab === 'entry' ? 'active' : ''}`}
          style={{
            padding: '10px 20px',
            borderRadius: '8px',
            border: 'none',
            background: subTab === 'entry' ? '#1e3a8a' : 'transparent',
            color: subTab === 'entry' ? 'white' : '#64748b',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.2s',
            fontSize: '0.9rem'
          }}
        >
          💧 Water Tanker Entry
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
