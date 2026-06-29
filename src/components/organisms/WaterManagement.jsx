import React from 'react';

export default function WaterManagement() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px', fontFamily: 'Inter, system-ui, sans-serif' }}>
      
      {/* ── PART 1: WATER FLOW DIAGRAM ── */}
      <div style={{
        background: '#ffffff',
        borderRadius: '16px',
        border: '1px solid #e2e8f0',
        padding: '24px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.03)'
      }}>
        
        {/* Title */}
        <div style={{
          background: '#0a1d47',
          color: 'white',
          padding: '16px',
          borderRadius: '12px',
          textAlign: 'center',
          marginBottom: '32px'
        }}>
          <h2 style={{ margin: 0, fontSize: '1.6rem', fontWeight: 800, letterSpacing: '1px' }}>
            WATER FLOW DIAGRAM – OUR SOCIETY
          </h2>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '24px' }}>
          
          {/* Main Diagram Area */}
          <div style={{ flex: '1 1 600px', display: 'flex', flexDirection: 'column', position: 'relative' }}>
            
            {/* Sources Row */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '40px', position: 'relative' }}>
              
              {/* PMC Water Source */}
              <div style={{ width: '280px', position: 'relative', zIndex: 10 }}>
                <div style={{ background: '#3b82f6', color: 'white', fontWeight: 700, padding: '8px 12px', borderRadius: '8px 8px 0 0', textAlign: 'center' }}>
                  1. PMC WATER (Municipal Water)
                </div>
                <div style={{ border: '2px solid #93c5fd', borderRadius: '0 0 8px 8px', padding: '16px', display: 'flex', alignItems: 'center', gap: '16px', background: '#eff6ff' }}>
                  <div style={{ fontSize: '3rem' }}>🚰</div>
                  <div style={{ fontSize: '0.85rem', color: '#1e3a8a', fontWeight: 600 }}>
                    PMC water comes directly into society from the main line.
                  </div>
                </div>
                {/* Flow Line Container (PMC down to main branch) */}
                <div style={{ position: 'absolute', bottom: '-40px', left: '50%', width: '4px', height: '40px', background: '#2563eb', transform: 'translateX(-50%)' }}></div>
              </div>

              {/* Water Tanker Source */}
              <div style={{ width: '280px', position: 'relative', zIndex: 10 }}>
                <div style={{ background: '#166534', color: 'white', fontWeight: 700, padding: '8px 12px', borderRadius: '8px 8px 0 0', textAlign: 'center' }}>
                  2. WATER TANKER
                </div>
                <div style={{ border: '2px solid #86efac', borderRadius: '0 0 8px 8px', padding: '16px', display: 'flex', alignItems: 'center', gap: '16px', background: '#f0fdf4' }}>
                  <div style={{ fontSize: '3rem' }}>🚚</div>
                  <div style={{ fontSize: '0.85rem', color: '#14532d', fontWeight: 600 }}>
                    Water tanker will ONLY go to the COMMON WATER TANK.
                  </div>
                </div>
                {/* Flow Line Container (Tanker down to common) */}
                <div style={{ position: 'absolute', bottom: '-40px', left: '75%', width: '4px', height: '110px', background: '#16a34a' }}></div>
              </div>

            </div>

            {/* Horizontal Branch Line for PMC */}
            <div style={{ position: 'absolute', top: '150px', left: '140px', right: '230px', height: '4px', background: '#2563eb' }}></div>

            {/* Tanks Row */}
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', position: 'relative', marginTop: '20px' }}>
              
              {/* Tank 1 */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
                <div style={{ width: '4px', height: '30px', background: '#2563eb', position: 'absolute', top: '-30px' }}></div>
                {/* SVG Arrow */}
                <div style={{ width: '0', height: '0', borderLeft: '6px solid transparent', borderRight: '6px solid transparent', borderTop: '10px solid #2563eb', position: 'absolute', top: '0' }}></div>
                
                <div style={{ width: '100%', marginTop: '10px', textAlign: 'center' }}>
                   <div style={{ height: '120px', background: 'linear-gradient(to bottom, #dbeafe, #93c5fd)', borderRadius: '20px 20px 4px 4px', border: '3px solid #60a5fa', borderBottom: '12px solid #94a3b8', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                     <div style={{ background: 'white', borderRadius: '50%', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '4px', boxShadow: '0 2px 5px rgba(0,0,0,0.1)' }}>💧</div>
                     <strong style={{ color: '#1e3a8a', fontSize: '0.9rem' }}>1. DRINKING<br/>WATER TANK</strong>
                   </div>
                   <div style={{ background: '#2563eb', color: 'white', fontSize: '0.75rem', fontWeight: 700, padding: '4px', marginTop: '-2px', position: 'relative', zIndex: 5 }}>For Drinking Purpose Only</div>
                </div>

                <div style={{ width: '2px', height: '30px', background: '#2563eb', marginTop: '4px' }}></div>
                <div style={{ width: '0', height: '0', borderLeft: '5px solid transparent', borderRight: '5px solid transparent', borderTop: '8px solid #2563eb' }}></div>

                <div style={{ marginTop: '8px', padding: '12px', border: '1px solid #bfdbfe', borderRadius: '8px', background: '#f8fafc', width: '100%', display: 'flex', alignItems: 'center', gap: '12px' }}>
                   <div style={{ fontSize: '2rem' }}>🚰</div>
                   <div style={{ fontSize: '0.75rem', color: '#334155', fontWeight: 600, textAlign: 'left' }}>
                     Used for<br/>Drinking<br/>Cooking<br/>Other Drinking<br/>Purposes
                   </div>
                </div>
              </div>

              {/* Tank 2 */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
                <div style={{ width: '4px', height: '30px', background: '#2563eb', position: 'absolute', top: '-30px' }}></div>
                <div style={{ width: '0', height: '0', borderLeft: '6px solid transparent', borderRight: '6px solid transparent', borderTop: '10px solid #2563eb', position: 'absolute', top: '0' }}></div>
                
                <div style={{ width: '100%', marginTop: '10px', textAlign: 'center' }}>
                   <div style={{ height: '120px', background: 'linear-gradient(to bottom, #dcfce7, #86efac)', borderRadius: '20px 20px 4px 4px', border: '3px solid #4ade80', borderBottom: '12px solid #94a3b8', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                     <div style={{ background: 'white', borderRadius: '50%', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '4px', boxShadow: '0 2px 5px rgba(0,0,0,0.1)', fontSize: '1.2rem' }}>🚰</div>
                     <strong style={{ color: '#14532d', fontSize: '0.9rem' }}>2. UTILITY<br/>WATER TANK</strong>
                   </div>
                   <div style={{ background: '#16a34a', color: 'white', fontSize: '0.75rem', fontWeight: 700, padding: '4px', marginTop: '-2px', position: 'relative', zIndex: 5 }}>For Utility Purpose Only</div>
                </div>

                <div style={{ width: '2px', height: '30px', background: '#16a34a', marginTop: '4px' }}></div>
                <div style={{ width: '0', height: '0', borderLeft: '5px solid transparent', borderRight: '5px solid transparent', borderTop: '8px solid #16a34a' }}></div>

                <div style={{ marginTop: '8px', padding: '12px', border: '1px solid #bbf7d0', borderRadius: '8px', background: '#f8fafc', width: '100%', display: 'flex', alignItems: 'center', gap: '12px' }}>
                   <div style={{ fontSize: '2rem' }}>🧹</div>
                   <div style={{ fontSize: '0.75rem', color: '#334155', fontWeight: 600, textAlign: 'left' }}>
                     Used for<br/>Cleaning<br/>Flushing<br/>Gardening<br/>Other Utility Uses
                   </div>
                </div>
              </div>

              {/* Tank 3 */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
                <div style={{ width: '4px', height: '30px', background: '#2563eb', position: 'absolute', top: '-30px', right: '50%' }}></div>
                <div style={{ width: '0', height: '0', borderLeft: '6px solid transparent', borderRight: '6px solid transparent', borderTop: '10px solid #2563eb', position: 'absolute', top: '0', right: 'calc(50% - 4px)' }}></div>
                
                {/* Arrow from tanker */}
                <div style={{ width: '0', height: '0', borderLeft: '6px solid transparent', borderRight: '6px solid transparent', borderTop: '10px solid #16a34a', position: 'absolute', top: '0', left: 'calc(50% + 20px)' }}></div>

                <div style={{ width: '100%', marginTop: '10px', textAlign: 'center' }}>
                   <div style={{ height: '120px', background: 'linear-gradient(to bottom, #ffedd5, #fdba74)', borderRadius: '20px 20px 4px 4px', border: '3px solid #fb923c', borderBottom: '12px solid #94a3b8', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                     <div style={{ background: 'white', borderRadius: '50%', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '4px', boxShadow: '0 2px 5px rgba(0,0,0,0.1)', fontSize: '1.2rem' }}>🪣</div>
                     <strong style={{ color: '#9a3412', fontSize: '0.9rem' }}>3. COMMON<br/>WATER TANK</strong>
                   </div>
                   <div style={{ background: '#ea580c', color: 'white', fontSize: '0.75rem', fontWeight: 700, padding: '4px', marginTop: '-2px', position: 'relative', zIndex: 5 }}>Stored water used later for Utility</div>
                </div>

                <div style={{ width: '2px', height: '30px', background: '#ea580c', marginTop: '4px' }}></div>
                <div style={{ width: '0', height: '0', borderLeft: '5px solid transparent', borderRight: '5px solid transparent', borderTop: '8px solid #ea580c' }}></div>

                <div style={{ marginTop: '8px', padding: '12px', border: '1px solid #fed7aa', borderRadius: '8px', background: '#f8fafc', width: '100%', display: 'flex', alignItems: 'center', gap: '8px' }}>
                   <div style={{ fontSize: '1.8rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                      <span>🚿</span><span>🪴</span>
                   </div>
                   <div style={{ fontSize: '0.7rem', color: '#334155', fontWeight: 600, textAlign: 'left', lineHeight: '1.3' }}>
                     Stored water will be used later for Utility Purpose:<br/>
                     • Cleaning<br/>
                     • Flushing<br/>
                     • Gardening<br/>
                     • Other Utility Uses
                   </div>
                </div>
              </div>

            </div>
          </div>

          {/* Right Sidebar: Important Points */}
          <div style={{ flex: '1 1 300px', display: 'flex', flexDirection: 'column' }}>
            <div style={{ border: '2px dashed #94a3b8', borderRadius: '16px', padding: '24px', background: '#f8fafc', height: '100%' }}>
              <div style={{ background: '#0a1d47', color: 'white', fontWeight: 800, padding: '8px 16px', borderRadius: '8px', display: 'inline-block', marginBottom: '24px' }}>
                IMPORTANT POINTS
              </div>
              
              <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', alignItems: 'flex-start' }}>
                <div style={{ background: '#3b82f6', color: 'white', width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>💧</div>
                <div style={{ color: '#1e293b', fontSize: '0.9rem', fontWeight: 600 }}>PMC water will go directly into all three tanks.</div>
              </div>

              <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', alignItems: 'flex-start' }}>
                <div style={{ background: '#16a34a', color: 'white', width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '1.2rem' }}>🚚</div>
                <div style={{ color: '#1e293b', fontSize: '0.9rem', fontWeight: 600 }}>Water tanker will <strong style={{ color: '#16a34a' }}>ONLY</strong> go to the <strong>COMMON WATER TANK.</strong></div>
              </div>

              <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                <div style={{ background: '#ef4444', color: 'white', width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontWeight: 800, fontSize: '1.1rem' }}>⃠</div>
                <div style={{ color: '#1e293b', fontSize: '0.9rem', fontWeight: 600 }}>Water tanker will <strong style={{ color: '#ef4444' }}>NEVER</strong> go to Drinking Water Tank or Utility Water Tank.</div>
              </div>
            </div>
          </div>
          
        </div>

        {/* Bottom Priority Banner */}
        <div style={{
          marginTop: '32px',
          background: '#eff6ff',
          border: '1px solid #bfdbfe',
          borderRadius: '12px',
          padding: '16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '12px'
        }}>
          <div style={{ background: '#0a1d47', color: 'white', borderRadius: '50%', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✓</div>
          <h3 style={{ margin: 0, color: '#0a1d47', fontSize: '1.1rem', fontWeight: 800, letterSpacing: '0.5px' }}>
            OUR PRIORITY: SAFE DRINKING WATER FOR EVERY RESIDENT
          </h3>
        </div>
      </div>

      {/* ── PART 2: WATER SUPPLY SCHEDULE ── */}
      <div style={{
        background: '#ffffff',
        borderRadius: '16px',
        border: '1px solid #e2e8f0',
        padding: '24px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.03)'
      }}>
        
        {/* Title */}
        <div style={{
          background: 'linear-gradient(to right, #eff6ff, #ffffff)',
          borderBottom: '2px solid #bfdbfe',
          padding: '16px 24px',
          borderRadius: '12px 12px 0 0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '16px',
          marginBottom: '32px',
          position: 'relative'
        }}>
          <div style={{ fontSize: '3rem' }}>💧</div>
          <h2 style={{ margin: 0, fontSize: '2rem', fontWeight: 900, color: '#0a1d47', textAlign: 'center', lineHeight: '1.2' }}>
            WATER SUPPLY<br/>SCHEDULE (DAILY)
          </h2>
          <div style={{ fontSize: '3rem' }}>🚰</div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* MORNING */}
          <div style={{ border: '2px solid #bfdbfe', borderRadius: '16px', position: 'relative', padding: '32px 24px 24px' }}>
            <div style={{ position: 'absolute', top: '-18px', left: '50%', transform: 'translateX(-50%)', background: '#1e3a8a', color: 'white', padding: '6px 24px', borderRadius: '20px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.1rem' }}>
              <span style={{ fontSize: '1.3rem' }}>☀️</span> MORNING
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '20px', flexWrap: 'wrap', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1 }}>
                 <div style={{ background: '#1e3a8a', color: 'white', width: '64px', height: '64px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', fontWeight: 800 }}>C</div>
                 <div style={{ background: '#1e3a8a', color: 'white', padding: '10px 24px', borderRadius: '8px', fontWeight: 800, fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                   🕒 7:00 AM
                 </div>
                 <div style={{ color: '#1e3a8a', fontWeight: 800, fontSize: '1.2rem', marginLeft: 'auto' }}>Start with<br/>C Building</div>
              </div>
              <div style={{ borderLeft: '2px solid #bfdbfe', paddingLeft: '20px', display: 'flex', alignItems: 'center', gap: '12px', minWidth: '150px' }}>
                <span style={{ fontSize: '2rem' }}>⏱️</span>
                <div style={{ color: '#1e3a8a', fontWeight: 700, fontSize: '1rem' }}>Approx.<br/>1 to 1.5 hours</div>
              </div>
            </div>

            <div style={{ borderTop: '2px dashed #bfdbfe', margin: '0 -24px 20px' }}></div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '20px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1 }}>
                 <div style={{ background: '#16a34a', color: 'white', width: '64px', height: '64px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', fontWeight: 800, gap: '4px' }}><span>A</span><span>B</span></div>
                 <div style={{ background: '#16a34a', color: 'white', padding: '10px 24px', borderRadius: '8px', fontWeight: 800, fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                   🕒 8:00 – 8:30 AM
                 </div>
                 <div style={{ color: '#16a34a', fontWeight: 800, fontSize: '1.2rem', marginLeft: 'auto' }}>A & B<br/>Buildings</div>
              </div>
              <div style={{ borderLeft: '2px solid #bfdbfe', paddingLeft: '20px', display: 'flex', alignItems: 'center', gap: '12px', minWidth: '150px' }}>
                <span style={{ fontSize: '2rem' }}>⏱️</span>
                <div style={{ color: '#16a34a', fontWeight: 700, fontSize: '1rem' }}>Approx.<br/>2 hours</div>
              </div>
            </div>
          </div>

          {/* AFTERNOON */}
          <div style={{ border: '2px solid #fed7aa', borderRadius: '16px', position: 'relative', padding: '32px 24px 24px' }}>
            <div style={{ position: 'absolute', top: '-18px', left: '50%', transform: 'translateX(-50%)', background: '#ea580c', color: 'white', padding: '6px 24px', borderRadius: '20px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.1rem' }}>
              <span style={{ fontSize: '1.3rem' }}>🌤️</span> AFTERNOON
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '20px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1 }}>
                 <div style={{ background: '#ea580c', color: 'white', width: '64px', height: '64px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', fontWeight: 800, gap: '4px' }}><span>A</span><span>B</span></div>
                 <div style={{ background: '#ea580c', color: 'white', padding: '10px 24px', borderRadius: '8px', fontWeight: 800, fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                   🕒 1:00 – 2:00 PM
                 </div>
                 <div style={{ color: '#ea580c', fontWeight: 800, fontSize: '1.2rem', marginLeft: 'auto' }}>A & B<br/>Buildings</div>
              </div>
              <div style={{ borderLeft: '2px solid #fed7aa', paddingLeft: '20px', display: 'flex', alignItems: 'center', gap: '12px', minWidth: '150px' }}>
                <span style={{ fontSize: '2rem' }}>⏱️</span>
                <div style={{ color: '#ea580c', fontWeight: 700, fontSize: '1rem' }}>Approx.<br/>1 hour</div>
              </div>
            </div>
          </div>

          {/* EVENING */}
          <div style={{ border: '2px solid #e9d5ff', borderRadius: '16px', position: 'relative', padding: '32px 24px 24px' }}>
            <div style={{ position: 'absolute', top: '-18px', left: '50%', transform: 'translateX(-50%)', background: '#4c1d95', color: 'white', padding: '6px 24px', borderRadius: '20px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.1rem' }}>
              <span style={{ fontSize: '1.3rem' }}>🌙</span> EVENING
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '20px', flexWrap: 'wrap', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1 }}>
                 <div style={{ background: '#4c1d95', color: 'white', width: '64px', height: '64px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', fontWeight: 800 }}>C</div>
                 <div style={{ background: '#4c1d95', color: 'white', padding: '10px 24px', borderRadius: '8px', fontWeight: 800, fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                   🕒 4:00 PM
                 </div>
                 <div style={{ color: '#4c1d95', fontWeight: 800, fontSize: '1.2rem', marginLeft: 'auto' }}>Start with<br/>C Building</div>
              </div>
              <div style={{ borderLeft: '2px solid #e9d5ff', paddingLeft: '20px', display: 'flex', alignItems: 'center', gap: '12px', minWidth: '150px' }}>
                <span style={{ fontSize: '2rem' }}>⏱️</span>
                <div style={{ color: '#4c1d95', fontWeight: 700, fontSize: '1rem' }}>Approx.<br/>1.5 hours</div>
              </div>
            </div>

            <div style={{ borderTop: '2px dashed #e9d5ff', margin: '0 -24px 20px' }}></div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '20px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1 }}>
                 <div style={{ background: '#16a34a', color: 'white', width: '64px', height: '64px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', fontWeight: 800, gap: '4px' }}><span>A</span><span>B</span></div>
                 <div style={{ background: '#16a34a', color: 'white', padding: '10px 24px', borderRadius: '8px', fontWeight: 800, fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                   🕒 5:00 – 5:30 PM
                 </div>
                 <div style={{ color: '#16a34a', fontWeight: 800, fontSize: '1.2rem', marginLeft: 'auto' }}>A & B<br/>Buildings</div>
              </div>
              <div style={{ borderLeft: '2px solid #e9d5ff', paddingLeft: '20px', display: 'flex', alignItems: 'center', gap: '12px', minWidth: '150px' }}>
                <span style={{ fontSize: '2rem' }}>⏱️</span>
                <div style={{ color: '#16a34a', fontWeight: 700, fontSize: '1rem' }}>Approx.<br/>1.5 to 2<br/>hours</div>
              </div>
            </div>
          </div>

        </div>
      </div>
      
    </div>
  );
}
