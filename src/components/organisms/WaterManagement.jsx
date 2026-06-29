import React, { useState } from 'react';

export default function WaterManagement() {
  const [subTab, setSubTab] = useState('water_supply');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', fontFamily: 'Inter, system-ui, sans-serif' }}>
      
      {/* Tab Navigation */}
      <div style={{ display: 'flex', gap: '12px', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
        <button 
          onClick={() => setSubTab('water_supply')}
          style={{
            padding: '8px 16px',
            borderRadius: '6px',
            border: 'none',
            background: subTab === 'water_supply' ? '#0a1d47' : '#f8fafc',
            color: subTab === 'water_supply' ? 'white' : '#475569',
            fontWeight: 600,
            cursor: 'pointer',
            fontSize: '0.9rem',
            transition: 'all 0.2s'
          }}
        >
          Water Supply Schedule
        </button>
        <button 
          onClick={() => setSubTab('water_flow')}
          style={{
            padding: '8px 16px',
            borderRadius: '6px',
            border: 'none',
            background: subTab === 'water_flow' ? '#0a1d47' : '#f8fafc',
            color: subTab === 'water_flow' ? 'white' : '#475569',
            fontWeight: 600,
            cursor: 'pointer',
            fontSize: '0.9rem',
            transition: 'all 0.2s'
          }}
        >
          Water Flow Diagram
        </button>
      </div>

      {subTab === 'water_flow' && (
      <div style={{
        background: '#ffffff',
        borderRadius: '12px',
        border: '1px solid #e2e8f0',
        padding: '24px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.02)'
      }}>
        <h2 style={{ margin: '0 0 24px 0', fontSize: '1.2rem', fontWeight: 700, color: '#0f172a' }}>Water Flow Architecture</h2>
        
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '24px' }}>
          
          {/* Main Diagram Area */}
          <div style={{ flex: '1 1 500px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', position: 'relative', marginTop: '12px' }}>
              
              {/* Horizontal Pipe spanning across tanks */}
              <div style={{ position: 'absolute', top: '105px', left: '16.66%', right: '16.66%', height: '3px', background: '#3b82f6', zIndex: 1 }}></div>

              {/* SOURCES ROW */}
              <div style={{ gridColumn: '1 / 2', position: 'relative' }}>
                <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px', padding: '12px', textAlign: 'center' }}>
                  <div style={{ fontSize: '1.5rem', marginBottom: '4px' }}>🚰</div>
                  <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#1e3a8a' }}>PMC WATER</div>
                  <div style={{ fontSize: '0.65rem', color: '#3b82f6' }}>Main line supply</div>
                </div>
                {/* Vertical Pipe from PMC to horizontal branch */}
                <div style={{ position: 'absolute', bottom: '-24px', left: '50%', transform: 'translateX(-50%)', width: '3px', height: '24px', background: '#3b82f6', zIndex: 1 }}></div>
              </div>
              
              <div></div> {/* Empty middle col */}

              <div style={{ gridColumn: '3 / 4', position: 'relative' }}>
                <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '12px', textAlign: 'center' }}>
                  <div style={{ fontSize: '1.5rem', marginBottom: '4px' }}>🚚</div>
                  <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#14532d' }}>WATER TANKER</div>
                  <div style={{ fontSize: '0.65rem', color: '#16a34a' }}>Common tank only</div>
                </div>
                {/* Vertical Pipe from Tanker bypassing horizontal branch to Common Tank */}
                <div style={{ position: 'absolute', bottom: '-46px', left: '50%', transform: 'translateX(-50%)', width: '3px', height: '46px', background: '#22c55e', zIndex: 2 }}></div>
              </div>

              {/* Spacer */}
              <div style={{ gridColumn: '1 / 4', height: '24px' }}></div>

              {/* TANKS ROW */}
              {/* Tank 1 */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
                <div style={{ width: '3px', height: '22px', background: '#3b82f6', position: 'absolute', top: '-22px', left: '50%', transform: 'translateX(-50%)', zIndex: 1 }}></div>
                <div style={{ width: 0, height: 0, borderLeft: '5px solid transparent', borderRight: '5px solid transparent', borderTop: '6px solid #3b82f6', position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', zIndex: 2 }}></div>
                
                <div style={{ background: 'linear-gradient(to bottom, #eff6ff, #bfdbfe)', width: '100%', height: '80px', borderRadius: '12px 12px 4px 4px', border: '2px solid #60a5fa', borderBottom: '8px solid #94a3b8', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', marginTop: '6px' }}>
                   <div style={{ fontSize: '1.2rem' }}>💧</div>
                   <div style={{ color: '#1e3a8a', fontSize: '0.7rem', fontWeight: 800 }}>DRINKING</div>
                </div>
                <div style={{ fontSize: '0.65rem', color: '#475569', textAlign: 'center', marginTop: '8px' }}>Drinking, Cooking</div>
              </div>

              {/* Tank 2 */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
                <div style={{ width: '3px', height: '22px', background: '#3b82f6', position: 'absolute', top: '-22px', left: '50%', transform: 'translateX(-50%)', zIndex: 1 }}></div>
                <div style={{ width: 0, height: 0, borderLeft: '5px solid transparent', borderRight: '5px solid transparent', borderTop: '6px solid #3b82f6', position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', zIndex: 2 }}></div>
                
                <div style={{ background: 'linear-gradient(to bottom, #f0fdf4, #bbf7d0)', width: '100%', height: '80px', borderRadius: '12px 12px 4px 4px', border: '2px solid #4ade80', borderBottom: '8px solid #94a3b8', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', marginTop: '6px' }}>
                   <div style={{ fontSize: '1.2rem' }}>🚰</div>
                   <div style={{ color: '#14532d', fontSize: '0.7rem', fontWeight: 800 }}>UTILITY</div>
                </div>
                <div style={{ fontSize: '0.65rem', color: '#475569', textAlign: 'center', marginTop: '8px' }}>Cleaning, Flushing</div>
              </div>

              {/* Tank 3 */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
                {/* PMC Pipe Left */}
                <div style={{ width: '3px', height: '22px', background: '#3b82f6', position: 'absolute', top: '-22px', left: 'calc(50% - 12px)', transform: 'translateX(-50%)', zIndex: 1 }}></div>
                <div style={{ width: 0, height: 0, borderLeft: '5px solid transparent', borderRight: '5px solid transparent', borderTop: '6px solid #3b82f6', position: 'absolute', top: 0, left: 'calc(50% - 12px)', transform: 'translateX(-50%)', zIndex: 2 }}></div>
                
                {/* Tanker Pipe Right */}
                <div style={{ width: '3px', height: '22px', background: '#22c55e', position: 'absolute', top: '-22px', left: 'calc(50% + 12px)', transform: 'translateX(-50%)', zIndex: 1 }}></div>
                <div style={{ width: 0, height: 0, borderLeft: '5px solid transparent', borderRight: '5px solid transparent', borderTop: '6px solid #22c55e', position: 'absolute', top: 0, left: 'calc(50% + 12px)', transform: 'translateX(-50%)', zIndex: 2 }}></div>
                
                <div style={{ background: 'linear-gradient(to bottom, #fff7ed, #fed7aa)', width: '100%', height: '80px', borderRadius: '12px 12px 4px 4px', border: '2px solid #fb923c', borderBottom: '8px solid #94a3b8', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', marginTop: '6px' }}>
                   <div style={{ fontSize: '1.2rem' }}>🪣</div>
                   <div style={{ color: '#9a3412', fontSize: '0.7rem', fontWeight: 800 }}>COMMON</div>
                </div>
                <div style={{ fontSize: '0.65rem', color: '#475569', textAlign: 'center', marginTop: '8px' }}>Utility Overflow</div>
              </div>
            </div>
          </div>

          {/* Right Sidebar: Rules */}
          <div style={{ flex: '1 1 250px' }}>
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px', height: '100%' }}>
              <h3 style={{ fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginTop: 0, marginBottom: '16px', textTransform: 'uppercase' }}>Rules</h3>
              
              <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', alignItems: 'flex-start' }}>
                <div style={{ background: '#3b82f6', color: 'white', width: '20px', height: '20px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '0.6rem' }}>✓</div>
                <div style={{ color: '#475569', fontSize: '0.8rem', lineHeight: '1.4' }}>PMC water feeds all three tanks.</div>
              </div>

              <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', alignItems: 'flex-start' }}>
                <div style={{ background: '#22c55e', color: 'white', width: '20px', height: '20px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '0.6rem' }}>✓</div>
                <div style={{ color: '#475569', fontSize: '0.8rem', lineHeight: '1.4' }}>Water tanker <strong style={{ color: '#16a34a' }}>ONLY</strong> feeds the Common Tank.</div>
              </div>

              <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                <div style={{ background: '#ef4444', color: 'white', width: '20px', height: '20px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '0.7rem', fontWeight: 800 }}>×</div>
                <div style={{ color: '#475569', fontSize: '0.8rem', lineHeight: '1.4' }}>Tankers <strong style={{ color: '#ef4444' }}>NEVER</strong> feed Drinking or Utility directly.</div>
              </div>
            </div>
          </div>
        </div>

        <div style={{ marginTop: '24px', background: '#eff6ff', borderRadius: '8px', padding: '12px', textAlign: 'center', color: '#1e3a8a', fontSize: '0.85rem', fontWeight: 600 }}>
          Priority: Safe drinking water for every resident.
        </div>
      </div>
      )}

      {subTab === 'water_supply' && (
      <div style={{
        background: '#ffffff',
        borderRadius: '12px',
        border: '1px solid #e2e8f0',
        padding: '24px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.02)'
      }}>
        <h2 style={{ margin: '0 0 24px 0', fontSize: '1.2rem', fontWeight: 700, color: '#0f172a' }}>Daily Supply Schedule</h2>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
          
          {/* Morning */}
          <div style={{ border: '1px solid #bfdbfe', borderRadius: '12px', overflow: 'hidden' }}>
            <div style={{ background: '#eff6ff', padding: '12px 16px', borderBottom: '1px solid #bfdbfe', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, color: '#1e3a8a', fontSize: '0.9rem' }}>
              <span>☀️</span> Morning
            </div>
            <div style={{ padding: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '12px', borderBottom: '1px solid #f1f5f9', marginBottom: '12px' }}>
                <div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#334155' }}>C Building</div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Approx. 1-1.5 hrs</div>
                </div>
                <div style={{ background: '#f1f5f9', padding: '6px 12px', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 600, color: '#0f172a' }}>
                  7:00 AM
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#334155' }}>A & B Buildings</div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Approx. 2 hrs</div>
                </div>
                <div style={{ background: '#f1f5f9', padding: '6px 12px', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 600, color: '#0f172a' }}>
                  8:00 AM
                </div>
              </div>
            </div>
          </div>

          {/* Afternoon */}
          <div style={{ border: '1px solid #fed7aa', borderRadius: '12px', overflow: 'hidden' }}>
            <div style={{ background: '#fff7ed', padding: '12px 16px', borderBottom: '1px solid #fed7aa', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, color: '#9a3412', fontSize: '0.9rem' }}>
              <span>🌤️</span> Afternoon
            </div>
            <div style={{ padding: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#334155' }}>A & B Buildings</div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Approx. 1 hr</div>
                </div>
                <div style={{ background: '#f1f5f9', padding: '6px 12px', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 600, color: '#0f172a' }}>
                  1:00 PM
                </div>
              </div>
            </div>
          </div>

          {/* Evening */}
          <div style={{ border: '1px solid #e9d5ff', borderRadius: '12px', overflow: 'hidden' }}>
            <div style={{ background: '#faf5ff', padding: '12px 16px', borderBottom: '1px solid #e9d5ff', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, color: '#6b21a8', fontSize: '0.9rem' }}>
              <span>🌙</span> Evening
            </div>
            <div style={{ padding: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '12px', borderBottom: '1px solid #f1f5f9', marginBottom: '12px' }}>
                <div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#334155' }}>C Building</div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Approx. 1.5 hrs</div>
                </div>
                <div style={{ background: '#f1f5f9', padding: '6px 12px', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 600, color: '#0f172a' }}>
                  4:00 PM
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#334155' }}>A & B Buildings</div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Approx. 1.5 - 2 hrs</div>
                </div>
                <div style={{ background: '#f1f5f9', padding: '6px 12px', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 600, color: '#0f172a' }}>
                  5:00 PM
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
      )}
      
    </div>
  );
}
