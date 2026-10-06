import React, { useState } from 'react';
import { createPortal } from 'react-dom';

const visuals = [
  // Official Society Rules Posters
  {
    id: 'parking_penalties_notice',
    title: 'Important Society Rules & Penalties (A, B & C)',
    subtitle: '11-point vehicle parking policy, Main Gate zero-tolerance & campus-wide strict no-smoking rule',
    image: '/rules_notices/important_society_rules_penalties.jpg',
    category: 'Rules & Notices',
    color: '#dc2626',
    isRule: true,
  },
  {
    id: 'no_parking_fine',
    title: 'No Parking Notice – Fine ₹500 Per Day',
    subtitle: 'Unauthorized parking strictly prohibited across all common driveways & entrances',
    image: '/rules_notices/no_parking_fine_500.jpg',
    category: 'Rules & Notices',
    color: '#b91c1c',
    isRule: true,
  },
  {
    id: 'clubhouse_lawn_notice',
    title: 'Club House & Lawn Guidelines (Dt. 10-08-2026)',
    subtitle: 'Official booking tariffs (₹1,000/₹2,000), deposit fees, and 10:00 PM sound curfew',
    image: '/rules_notices/clubhouse_lawn_guidelines_doc.jpg',
    category: 'Rules & Notices',
    color: '#4f46e5',
    isRule: true,
  },
  {
    id: 'food_prasad_notice',
    title: 'Don\'t Waste Food & Prasad (Euriska Cultural)',
    subtitle: 'Bilingual Marathi/English campaign: अन्न व प्रसाद वाया घालवू नका | Take only what you need',
    image: '/rules_notices/dont_waste_food_prasad.jpg',
    category: 'Rules & Notices',
    color: '#059669',
    isRule: true,
  },
  {
    id: 'no_parking_lift_entrance',
    title: 'No Parking Zone: Lift Area & A-Building Entrance',
    subtitle: 'Strict ban on parking near lift lobbies and main entrance. Ensure emergency access. Contact: Siddu (Manager)',
    image: '/rules_notices/no_parking_lift_entrance_notice.jpg',
    category: 'Rules & Notices',
    color: '#b91c1c',
    isRule: true,
  },
  {
    id: 'two_wheeler_common_parking',
    title: 'Common Parking for Two Wheeler',
    subtitle: 'Designated common parking bays allocated for scooters & motorcycles across society campus',
    image: '/rules_notices/two_wheeler_common_parking.jpg',
    category: 'Rules & Notices',
    color: '#1d4ed8',
    isRule: true,
  },
  {
    id: 'tap_flush_water_waste',
    title: 'Notice Regarding Tap Water & Flush Water Wastage',
    subtitle: 'Close taps properly, inspect flush leaks. Water wastage/negligence will result in direct tanker cost debit to flat',
    image: '/rules_notices/tap_flush_water_waste_notice.jpg',
    category: 'Rules & Notices',
    color: '#0284c7',
    isRule: true,
  },
  {
    id: 'severe_water_crisis',
    title: 'Severe Water Crisis & Tanker Territory Notice',
    subtitle: 'City water shortage advisory: Divided vendor territories, monsoon water quality, priority on continuous supply. Contact Siddu (Manager)',
    image: '/rules_notices/severe_water_crisis_tanker_notice.jpg',
    category: 'Rules & Notices',
    color: '#0369a1',
    isRule: true,
  },
  {
    id: 'no_football_playing',
    title: 'Notice: Ban on Football & Activities in Corridors/Lobby',
    subtitle: 'First warning to all residents: 24/7 CCTV active, fine/penalties imposed for damage to glass, tiles, lights, and common property',
    image: '/rules_notices/no_football_playing_fine_notice.jpg',
    category: 'Rules & Notices',
    color: '#991b1b',
    isRule: true,
  },
  {
    id: 'remove_footwear_notice',
    title: 'Footwear Etiquette Notice',
    subtitle: 'Bilingual Marathi/English: कृपया आपले पादत्राणे येथे काढा | Clubhouse, Gym & Temple etiquette',
    image: '/rules_notices/remove_footwear_sign.jpg',
    category: 'Rules & Notices',
    color: '#0284c7',
    isRule: true,
  },
  {
    id: 'swimming_pool_notice',
    title: 'Swimming Pool Rules and Regulations',
    subtitle: 'Official poolside rules: Compulsory costume & pool cap, no cotton/bermudas, shower mandatory, children accompanied, bachelors & friends barred, closed Thursdays',
    image: '/rules_notices/swimming_pool_rules_notice.jpg',
    category: 'Rules & Notices',
    color: '#0284c7',
    isRule: true,
  },
  {
    id: 'table_tennis_notice',
    title: 'Table Tennis Society Rules and Regulations',
    subtitle: 'Managing Committee Order (1)/0049: 24 bylaws, 30-min queue limit, 12+ age, non-spike shoes, no AC during play, pending dues barred',
    image: '/rules_notices/table_tennis_rules_notice.jpg',
    category: 'Rules & Notices',
    color: '#0d9488',
    isRule: true,
  },
  // Society Architecture & Infrastructure Visuals
  {
    id: 'water_flow',
    title: 'Water Flow Diagram',
    subtitle: 'Complete water distribution architecture of our society',
    image: '/visuals/water_flow_diagram.jpg',
    category: 'Water Architecture',
    color: '#2563eb',
  },
  {
    id: 'water_supply',
    title: 'Water Supply Schedule',
    subtitle: 'Daily water supply timings for all buildings',
    image: '/visuals/water_supply_schedule.jpg',
    category: 'Water Architecture',
    color: '#16a34a',
  },
  {
    id: 'rcc_drains',
    title: 'RCC Drain Covers – Child Safety',
    subtitle: 'Replacement of iron drain grills with RCC covers for child safety',
    image: '/visuals/rcc_drain_covers.jpg',
    category: 'Amenities & Safety',
    color: '#ea580c',
  },
  {
    id: 'gazebo',
    title: 'Gazebo & Garden Area',
    subtitle: 'Society gazebo with landscaping and green spaces',
    image: '/visuals/gazebo.jpg',
    category: 'Amenities & Safety',
    color: '#6d28d9',
  },
  {
    id: 'playground',
    title: 'Children\'s Playground',
    subtitle: 'Colorful play area with swings, slides, and dolphin-themed rubber flooring',
    image: '/visuals/playground.png',
    category: 'Amenities & Safety',
    color: '#dc2626',
  },
  {
    id: 'security_guidelines',
    title: 'Security & Water Management Guidelines',
    subtitle: 'Complete 15-point security, MyGate, water management, and emergency guidelines',
    image: '/visuals/security_guidelines.jpg',
    category: 'Amenities & Safety',
    color: '#0a1d47',
  },
];

export default function WaterManagement() {
  const [selectedVisual, setSelectedVisual] = useState(null);
  const [activeCategory, setActiveCategory] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const handleNavigateToRules = () => {
    window.dispatchEvent(new CustomEvent('changeTab', { detail: 'society_rules' }));
  };

  const categories = [
    { id: 'ALL', label: 'All Visuals', count: visuals.length },
    { id: 'Rules & Notices', label: '📜 Rules & Notices', count: visuals.filter(v => v.category === 'Rules & Notices').length },
    { id: 'Water Architecture', label: '💧 Water Architecture', count: visuals.filter(v => v.category === 'Water Architecture').length },
    { id: 'Amenities & Safety', label: '🏡 Amenities & Safety', count: visuals.filter(v => v.category === 'Amenities & Safety').length },
  ];

  const filteredVisuals = visuals.filter(v => {
    const matchesCat = activeCategory === 'ALL' || v.category === activeCategory;
    const matchesSearch = !searchQuery || 
      v.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
      v.subtitle.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  return (
    <div style={{ fontFamily: 'Inter, system-ui, sans-serif', maxWidth: '100%', overflow: 'hidden' }}>

      {/* Lightbox Modal */}
      {selectedVisual && createPortal(
        <div
          onClick={() => setSelectedVisual(null)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            background: 'rgba(0,0,0,0.92)',
            zIndex: 999999,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
            cursor: 'pointer',
          }}
        >
          {/* Close button at top-right of screen */}
          <button
            onClick={(e) => { e.stopPropagation(); setSelectedVisual(null); }}
            style={{
              position: 'fixed',
              top: '24px',
              right: '24px',
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              background: '#ef4444',
              color: '#ffffff',
              border: 'none',
              fontSize: '1.5rem',
              fontWeight: 'bold',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 10px 25px rgba(0, 0, 0, 0.3)',
              zIndex: 1000000,
            }}
          >
            ✕
          </button>

          {/* Image Container */}
          <div 
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: '90%',
              maxHeight: '80vh',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              cursor: 'default',
            }}
          >
            <img
              src={selectedVisual.image}
              alt={selectedVisual.title}
              style={{
                maxWidth: '100%',
                maxHeight: '75vh',
                borderRadius: '12px',
                objectFit: 'contain',
                boxShadow: '0 25px 50px -12px rgba(0,0,0,0.7)',
              }}
            />

            {/* Caption */}
            <div style={{ color: '#fff', textAlign: 'center', marginTop: '16px' }}>
              <h3 style={{ margin: '0 0 4px', fontSize: '1.2rem', fontWeight: 700 }}>
                {selectedVisual.title}
              </h3>
              <p style={{ margin: 0, fontSize: '0.9rem', opacity: 0.8 }}>
                {selectedVisual.subtitle}
              </p>
              {selectedVisual.isRule && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedVisual(null);
                    handleNavigateToRules();
                  }}
                  style={{
                    marginTop: '14px',
                    background: '#dc2626',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '9px 18px',
                    fontSize: '0.88rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(220,38,38,0.4)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <span>📜 Read Full Clause in Society Rules Tab</span>
                  <span>→</span>
                </button>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Society Rules Quick Cross-link Banner */}
      <div
        style={{
          background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
          color: 'white',
          padding: '16px 20px',
          borderRadius: '12px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          boxShadow: '0 4px 15px rgba(0,0,0,0.06)',
          border: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '1.8rem' }}>📜</span>
          <div>
            <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#f8fafc' }}>
              Society Rules, Bylaws & Penalty Schedule
            </h4>
            <p style={{ margin: '2px 0 0', fontSize: '0.85rem', color: '#94a3b8' }}>
              Looking for full parking rules (₹500/day fine), clubhouse booking fees (₹1,000/₹2,000), or complaint logging?
            </p>
          </div>
        </div>
        <button
          onClick={handleNavigateToRules}
          style={{
            background: '#ef4444',
            color: 'white',
            border: 'none',
            padding: '10px 18px',
            borderRadius: '8px',
            fontWeight: 600,
            fontSize: '0.88rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 4px 12px rgba(239,68,68,0.3)',
          }}
        >
          <span>Open Society Rules Tab</span>
          <span>→</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
          marginBottom: '20px',
        }}
      >
        {/* Category Pills */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              style={{
                background: activeCategory === cat.id ? '#0f172a' : '#f1f5f9',
                color: activeCategory === cat.id ? '#ffffff' : '#475569',
                border: activeCategory === cat.id ? '1px solid #0f172a' : '1px solid #e2e8f0',
                padding: '6px 14px',
                borderRadius: '20px',
                fontSize: '0.82rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              {cat.label} ({cat.count})
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div style={{ minWidth: '240px', flex: '1', maxWidth: '340px' }}>
          <input
            type="text"
            placeholder="Search plans, rules & visuals..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 14px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              fontSize: '0.85rem',
              outline: 'none',
              background: '#ffffff',
            }}
          />
        </div>
      </div>

      {/* Gallery Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '16px',
          maxWidth: '100%',
        }}
      >
        {filteredVisuals.map((v) => (
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
