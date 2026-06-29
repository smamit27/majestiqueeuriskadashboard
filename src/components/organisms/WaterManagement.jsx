import React, { useState } from 'react';

const visuals = [
  {
    id: 'water_flow',
    title: 'Water Flow Diagram',
    subtitle: 'Complete water distribution architecture of our society',
    image: '/visuals/water_flow_diagram.jpg',
    category: 'Water Management',
    color: '#2563eb',
  },
  {
    id: 'water_supply',
    title: 'Water Supply Schedule',
    subtitle: 'Daily water supply timings for all buildings',
    image: '/visuals/water_supply_schedule.jpg',
    category: 'Water Management',
    color: '#16a34a',
  },
  {
    id: 'rcc_drains',
    title: 'RCC Drain Covers – Child Safety',
    subtitle: 'Replacement of iron drain grills with RCC covers for child safety',
    image: '/visuals/rcc_drain_covers.jpg',
    category: 'Safety Improvement',
    color: '#ea580c',
  },
  {
    id: 'gazebo',
    title: 'Gazebo & Garden Area',
    subtitle: 'Society gazebo with landscaping and green spaces',
    image: '/visuals/gazebo.jpg',
    category: 'Society Amenity',
    color: '#6d28d9',
  },
  {
    id: 'playground',
    title: 'Children\'s Playground',
    subtitle: 'Colorful play area with swings, slides, and dolphin-themed rubber flooring',
    image: '/visuals/playground.png',
    category: 'Society Amenity',
    color: '#dc2626',
  },
  {
    id: 'security_guidelines',
    title: 'Security & Water Management Guidelines',
    subtitle: 'Complete 15-point security, MyGate, water management, and emergency guidelines',
    image: '/visuals/security_guidelines.jpg',
    category: 'Security & Safety',
    color: '#0a1d47',
  },
];

export default function WaterManagement() {
  const [selectedVisual, setSelectedVisual] = useState(null);

  return (
    <div style={{ fontFamily: 'Inter, system-ui, sans-serif', maxWidth: '100%', overflow: 'hidden' }}>

      {/* Lightbox Modal */}
      {selectedVisual && (
        <div
          onClick={() => setSelectedVisual(null)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            background: 'rgba(0,0,0,0.88)',
            zIndex: 99999,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
            cursor: 'pointer',
          }}
        >
          {/* Close bar at top */}
          <div
            style={{
              width: '100%',
              maxWidth: '900px',
              display: 'flex',
              justifyContent: 'flex-end',
              marginBottom: '8px',
            }}
          >
            <button
              onClick={(e) => { e.stopPropagation(); setSelectedVisual(null); }}
              style={{
                background: '#ef4444',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                padding: '8px 20px',
                fontSize: '0.9rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
              }}
            >
              ✕ Close
            </button>
          </div>

          {/* Image */}
          <img
            onClick={(e) => e.stopPropagation()}
            src={selectedVisual.image}
            alt={selectedVisual.title}
            style={{
              maxWidth: '900px',
              width: '100%',
              maxHeight: '75vh',
              borderRadius: '12px',
              objectFit: 'contain',
              boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
              cursor: 'default',
            }}
          />

          {/* Caption */}
          <div style={{ color: '#fff', textAlign: 'center', marginTop: '12px' }}>
            <h3 style={{ margin: '0 0 4px', fontSize: '1rem', fontWeight: 700 }}>
              {selectedVisual.title}
            </h3>
            <p style={{ margin: 0, fontSize: '0.8rem', opacity: 0.7 }}>
              {selectedVisual.subtitle}
            </p>
          </div>
        </div>
      )}

      {/* Gallery Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '16px',
          maxWidth: '100%',
        }}
      >
        {visuals.map((v) => (
          <div
            key={v.id}
            onClick={() => setSelectedVisual(v)}
            style={{
              background: '#fff',
              borderRadius: '12px',
              border: '1px solid #e2e8f0',
              overflow: 'hidden',
              cursor: 'pointer',
              transition: 'transform 0.2s, box-shadow 0.2s',
              boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-4px)';
              e.currentTarget.style.boxShadow = '0 12px 32px rgba(0,0,0,0.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.04)';
            }}
          >
            {/* Image */}
            <div
              style={{
                width: '100%',
                height: '220px',
                overflow: 'hidden',
                position: 'relative',
                background: '#f1f5f9',
              }}
            >
              <img
                src={v.image}
                alt={v.title}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain',
                  display: 'block',
                  transition: 'transform 0.3s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.05)')}
                onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
              />
              {/* Category Badge */}
              <div
                style={{
                  position: 'absolute',
                  top: '12px',
                  left: '12px',
                  background: v.color,
                  color: '#fff',
                  fontSize: '0.65rem',
                  fontWeight: 700,
                  padding: '4px 10px',
                  borderRadius: '20px',
                  letterSpacing: '0.5px',
                  textTransform: 'uppercase',
                }}
              >
                {v.category}
              </div>
              {/* Zoom icon */}
              <div
                style={{
                  position: 'absolute',
                  bottom: '12px',
                  right: '12px',
                  background: 'rgba(255,255,255,0.9)',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#334155" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  <line x1="11" y1="8" x2="11" y2="14" />
                  <line x1="8" y1="11" x2="14" y2="11" />
                </svg>
              </div>
            </div>

            {/* Text */}
            <div style={{ padding: '16px' }}>
              <h3 style={{ margin: '0 0 4px', fontSize: '0.95rem', fontWeight: 700, color: '#0f172a' }}>
                {v.title}
              </h3>
              <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b', lineHeight: 1.4 }}>
                {v.subtitle}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
