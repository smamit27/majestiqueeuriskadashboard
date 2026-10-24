import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import './WaterManagement.css';


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

  const handlePrintVisual = (v) => {
    if (!v) return;
    const printDoc = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>${v.title} - Majestique Euriska</title>
          <meta charset="utf-8" />
          <style>
            @page { size: auto; margin: 10mm; }
            body { font-family: 'Inter', system-ui, -apple-system, sans-serif; margin: 0; padding: 12px; color: #0f172a; text-align: center; background: #ffffff; }
            .header { margin-bottom: 12px; border-bottom: 2px solid #0f172a; padding-bottom: 8px; text-align: left; }
            .header h2 { margin: 0; font-size: 1.3rem; color: #0f172a; }
            .header p { margin: 4px 0 0; font-size: 0.85rem; color: #475569; }
            .img-box { margin-top: 10px; max-width: 100%; display: flex; justify-content: center; }
            img { max-width: 100%; max-height: 84vh; object-fit: contain; border-radius: 6px; box-shadow: 0 4px 12px rgba(0,0,0,0.08); }
            .footer { margin-top: 14px; font-size: 0.75rem; color: #64748b; border-top: 1px solid #e2e8f0; padding-top: 6px; display: flex; justify-content: space-between; }
          </style>
        </head>
        <body>
          <div class="header">
            <h2>🏢 Majestique Euriska — ${v.title}</h2>
            <p>${v.subtitle || ''} • Category: ${v.category}</p>
          </div>
          <div class="img-box">
            <img src="${v.image}" alt="${v.title}" onload="window.print();" />
          </div>
          <div class="footer">
            <span>Official Society Record • Reg. No. PNA/PNA (4)/HSG/(TC)/21207/2019-20</span>
            <span>Date: ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
          </div>
          <script>
            window.addEventListener('load', () => { setTimeout(() => window.print(), 350); });
          </script>
        </body>
      </html>
    `;
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.open();
      printWindow.document.write(printDoc);
      printWindow.document.close();
    } else {
      window.print();
    }
  };

  const handleDownloadVisual = (v) => {
    if (!v) return;
    const link = document.createElement('a');
    link.href = v.image;
    link.download = `${v.id || 'visual'}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrintCatalog = () => {
    window.print();
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
    <div id="visuals-management-container" className="water-management-s1">

      {/* Lightbox Modal */}
      {selectedVisual && createPortal(
        <div
          onClick={() => setSelectedVisual(null)}
          className="water-management-s2"
        >
          {/* Close button at top-right of screen */}
          <button
            onClick={(e) => { e.stopPropagation(); setSelectedVisual(null); }}
            className="water-management-s3"
          >
            ✕
          </button>

          {/* Image Container */}
          <div 
            onClick={(e) => e.stopPropagation()}
            className="water-management-s4"
          >
            <img
              src={selectedVisual.image}
              alt={selectedVisual.title}
              className="water-management-s5"
            />

            {/* Caption & Actions */}
            <div className="water-management-s6">
              <h3 className="water-management-s7">
                {selectedVisual.title}
              </h3>
              <p className="water-management-s8">
                {selectedVisual.subtitle}
              </p>

              <div className="water-management-s9">
                <button
                  type="button"
                  id="print-visual-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePrintVisual(selectedVisual);
                  }}
                  className="water-management-s10"
                >
                  <span>🖨️ Print / Save PDF</span>
                </button>

                <button
                  type="button"
                  id="download-visual-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDownloadVisual(selectedVisual);
                  }}
                  className="water-management-s11"
                >
                  <span>⬇️ Download Image</span>
                </button>

                {selectedVisual.isRule && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedVisual(null);
                      handleNavigateToRules();
                    }}
                    className="water-management-s12"
                  >
                    <span>📜 View in Society Rules</span>
                    <span>→</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Society Rules Quick Cross-link Banner */}
      <div
        className="water-management-s13"
      >
        <div className="water-management-s14">
          <span className="water-management-s15">📜</span>
          <div>
            <h4 className="water-management-s16">
              Society Rules, Bylaws & Penalty Schedule
            </h4>
            <p className="water-management-s17">
              Looking for full parking rules (₹500/day fine), clubhouse booking fees (₹1,000/₹2,000), or complaint logging?
            </p>
          </div>
        </div>
        <button
          onClick={handleNavigateToRules}
          className="water-management-s18"
        >
          <span>Open Society Rules Tab</span>
          <span>→</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div
        className="water-management-s19"
      >
        {/* Category Pills */}
        <div className="water-management-s20">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`water-management-s21 ${(activeCategory === cat.id ? 'water-management-cond-1-true' : 'water-management-cond-2-false')}`}
            >
              {cat.label} ({cat.count})
            </button>
          ))}
        </div>

        {/* Search Input & Print Catalog */}
        <div className="water-management-s22">
          <input
            type="text"
            placeholder="Search plans, rules & visuals..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="water-management-s23"
          />
          <button
            type="button"
            id="print-visuals-catalog-btn"
            onClick={handlePrintCatalog}
            className="water-management-s24"
            title="Print or export current gallery as PDF"
          >
            <span>🖨️ Print</span>
          </button>
        </div>
      </div>

      {/* Gallery Grid */}
      <div
        className="water-management-s25"
      >
        {filteredVisuals.map((v) => (
          <div
            key={v.id}
            onClick={() => setSelectedVisual(v)}
            className="water-management-s26"
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
              className="water-management-s27"
            >
              <img
                src={v.image}
                alt={v.title}
                className="water-management-s28"
                onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.05)')}
                onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
              />
              {/* Category Badge */}
              <div
                className="water-management-s29" style={{ background: v.color }}
              >
                {v.category}
              </div>
              {/* Zoom icon */}
              <div
                className="water-management-s30"
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
            <div className="water-management-s31">
              <h3 className="water-management-s32">
                {v.title}
              </h3>
              <p className="water-management-s33">
                {v.subtitle}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
