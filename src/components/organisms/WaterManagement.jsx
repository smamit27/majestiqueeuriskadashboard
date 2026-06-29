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
];

export default function WaterManagement() {
  const [selectedVisual, setSelectedVisual] = useState(null);

  return (
    <div style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>

      {/* Lightbox Modal */}
      {selectedVisual && (
        <div
          onClick={() => setSelectedVisual(null)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.85)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
            cursor: 'zoom-out',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'relative',
              maxWidth: '95vw',
              maxHeight: '92vh',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
            }}
          >
            <button
              onClick={() => setSelectedVisual(null)}
              style={{
                position: 'absolute',
                top: '-12px',
                right: '-12px',
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                background: '#fff',
                border: 'none',
                fontSize: '1.2rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
                zIndex: 10,
              }}
            >
              ✕
            </button>
            <img
              src={selectedVisual.image}
              alt={selectedVisual.title}
              style={{
                maxWidth: '100%',
                maxHeight: '85vh',
                borderRadius: '12px',
                objectFit: 'contain',
                boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
              }}
            />
            <div style={{ color: '#fff', textAlign: 'center', marginTop: '16px' }}>
              <h3 style={{ margin: '0 0 4px', fontSize: '1.1rem', fontWeight: 700 }}>
                {selectedVisual.title}
              </h3>
              <p style={{ margin: 0, fontSize: '0.85rem', opacity: 0.7 }}>
                {selectedVisual.subtitle}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Gallery Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
          gap: '20px',
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
              }}
            >
              <img
                src={v.image}
                alt={v.title}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
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
