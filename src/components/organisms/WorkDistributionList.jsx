import React, { useState, useMemo } from 'react';
import {
  WORK_DISTRIBUTION_PORTFOLIOS,
  COMMITTEE_MEMBERS,
  REQUESTED_FLATS_OWNERS,
  MEMBER_FLAT_MAP,
  OFFICIAL_WORK_DISTRIBUTION_IMAGE
} from '../../data/workDistributionData';
import { SOCIETY_INFO } from '../../data/societyConfig';
import './WorkDistributionList.css';

// SVG Icon renderer matching the icons from the image
function PortfolioIcon({ type }) {
  switch (type) {
    case 'shield': // Security & Fire Safety
      return (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
          <path d="M12 8v4"/>
          <path d="M12 16h.01"/>
        </svg>
      );
    case 'leaf': // Housekeeping, Garden & Play Area
      return (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"/>
          <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/>
        </svg>
      );
    case 'parking': // Park+ / MyGate
      return (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="2" y="3" width="11" height="18" rx="2"/>
          <path d="M6 7h3a2 2 0 0 1 0 4H6V7z"/>
          <path d="M15 15h4l2 3v2h-8v-2l2-3z"/>
          <circle cx="16" cy="19" r="1"/>
          <circle cx="20" cy="19" r="1"/>
        </svg>
      );
    case 'swimming': // Swimming Pool
      return (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M2 6c.6.5 1.2 1 2.5 1C7 7 7 5 9.5 5c2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/>
          <path d="M2 12c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/>
          <path d="M2 18c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/>
          <circle cx="16" cy="3" r="1.5"/>
        </svg>
      );
    case 'finance': // Accounts & Finance
      return (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <ellipse cx="12" cy="6" rx="8" ry="3"/>
          <path d="M4 6v6c0 1.66 3.58 3 8 3s8-1.34 8-3V6"/>
          <path d="M4 12v6c0 1.66 3.58 3 8 3s8-1.34 8-3v-6"/>
        </svg>
      );
    case 'electricity': // Electricity, Lifts & Water
      return (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="3"/>
          <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
        </svg>
      );
    case 'cctv': // Solar / Network / CCTV
      return (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M16 16l4 3V5l-4 3v8z"/>
          <rect x="2" y="6" width="14" height="12" rx="2"/>
          <circle cx="8" cy="12" r="2"/>
        </svg>
      );
    case 'vendor': // Vendor Coordination
      return (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
          <circle cx="9" cy="7" r="4"/>
          <path d="M22 21v-2a4 4 0 0 0-3-3.87"/>
          <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
        </svg>
      );
    case 'tenant': // Tenant Management
      return (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
          <circle cx="12" cy="13" r="2.5"/>
          <path d="M9 18c0-1.66 1.34-3 3-3s3 1.34 3 3"/>
        </svg>
      );
    default:
      return (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="10"/>
        </svg>
      );
  }
}

export default function WorkDistributionList() {
  const [activeTab, setActiveTab] = useState('table'); // 'table' | 'image' | 'owners' | 'members'
  const [displayLayout, setDisplayLayout] = useState('poster'); // 'poster' | 'table' | 'both'
  const [selectedMember, setSelectedMember] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [showFlatNumbers, setShowFlatNumbers] = useState(true);
  const [zoomLevel, setZoomLevel] = useState(1);

  // Unique list of all members for filter buttons
  const memberFilterList = useMemo(() => {
    return ['ALL', 'Prakash', 'Sachin', 'Amit', 'Prashant', 'Neha', 'Afroza', 'Ashu', 'Himansu', 'Ahmed', 'Sandeep'];
  }, []);

  // Helper to format member label with alternate name and flat number
  const formatMemberLabel = (member, withFlat) => {
    let label = (member === 'Himanshu' || member === 'Himansu') ? 'Himansu' : member;
    if (withFlat) {
      const flat = MEMBER_FLAT_MAP[member] || MEMBER_FLAT_MAP[label] || '';
      return flat ? `${label} (${flat})` : label;
    }
    return label;
  };

  // Filtered portfolios based on active member filter and search text
  const filteredPortfolios = useMemo(() => {
    return WORK_DISTRIBUTION_PORTFOLIOS.filter((item) => {
      // Member filter
      let matchesMember = true;
      if (selectedMember !== 'ALL') {
        matchesMember =
          item.assignedMembers.includes(selectedMember) ||
          ((selectedMember === 'Himansu' || selectedMember === 'Himanshu') && (item.assignedMembers.includes('Himanshu') || item.assignedMembers.includes('Himansu'))) ||
          (item.allMembersInvolved && (selectedMember === 'ALL' || item.assignedMembers.includes(selectedMember)));
      }

      // Search filter
      let matchesSearch = true;
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const text = [
          item.no,
          item.responsibilityArea,
          item.keyResponsibilities,
          item.displayedAssigned || item.assignedMembers.join(' '),
          item.category,
          // include flat numbers in search
          item.assignedMembers.map(m => MEMBER_FLAT_MAP[m] || '').join(' ')
        ].join(' ').toLowerCase();
        matchesSearch = text.includes(q);
      }

      return matchesMember && matchesSearch;
    });
  }, [selectedMember, searchTerm]);

  // Handle print
  const handlePrint = () => {
    window.print();
  };

  // Handle export to CSV
  const handleExportCsv = () => {
    const headers = ['No.', 'Responsibility Area', 'Assigned Committee Members', 'Key Responsibilities'];
    const rows = WORK_DISTRIBUTION_PORTFOLIOS.map((item) => [
      item.no,
      `"${item.responsibilityArea}"`,
      `"${item.displayedAssigned || item.assignedMembers.map(m => formatMemberLabel(m, showFlatNumbers)).join(' / ')}"`,
      `"${item.keyResponsibilities}"`
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'Majestique_Euriska_Work_Distribution_List.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="work-distribution-container" id="work-distribution-module">
      {/* ── Official Document Header ────────────────────────────────────── */}
      <header className="work-dist-header">
        <div className="work-dist-badge-row">
          <span className="official-stamp-badge">
            <span className="stamp-dot" /> Official Society Resolution
          </span>
          <span className="reg-number-pill">
            {SOCIETY_INFO.regNoShort || 'PNA/PNA (4)/HSG/(TC)/21207/2019-20'}
          </span>
          <span className="wing-tag">Wing A Managing Committee</span>
        </div>

        <div className="work-dist-title-section">
          <h1 className="work-dist-title">Managing Committee — Work Distribution List</h1>
          <p className="work-dist-subtitle">
            Majestique Euriska 'A' Building Co-operative Housing Society Ltd. • Portfolio Allocation & Escalation Roster
          </p>
        </div>

        {/* ── KPI Summary Chips ────────────────────────────────────────── */}
        <div className="work-dist-kpi-grid">
          <div className="kpi-chip">
            <span className="kpi-label">Responsibility Areas</span>
            <span className="kpi-val highlight-blue">9 Portfolios</span>
          </div>
          <div className="kpi-chip">
            <span className="kpi-label">Committee Members</span>
            <span className="kpi-val highlight-emerald">10 Members</span>
          </div>
          <div className="kpi-chip">
            <span className="kpi-label">Target Flat Owners</span>
            <span className="kpi-val highlight-purple">10 Flats Mapped</span>
          </div>
          <div className="kpi-chip">
            <span className="kpi-label">Himansu (Committee)</span>
            <span className="kpi-val highlight-amber">Flat A-602</span>
          </div>
        </div>
      </header>

      {/* ── Action Toolbar & View Tabs ──────────────────────────────────── */}
      <div className="work-dist-toolbar no-print">
        <div className="view-switch-pills" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'table'}
            className={`pill-btn ${activeTab === 'table' ? 'active' : ''}`}
            onClick={() => setActiveTab('table')}
            id="tab-official-table"
          >
            📋 Official Portfolio Table
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'image'}
            className={`pill-btn ${activeTab === 'image' ? 'active' : ''}`}
            onClick={() => setActiveTab('image')}
            id="tab-document-image"
          >
            🖼️ Official Notice Scan (Image)
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'owners'}
            className={`pill-btn ${activeTab === 'owners' ? 'active' : ''}`}
            onClick={() => setActiveTab('owners')}
            id="tab-owners-list"
          >
            🏢 Requested 10 Flats Owners List
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'members'}
            className={`pill-btn ${activeTab === 'members' ? 'active' : ''}`}
            onClick={() => setActiveTab('members')}
            id="tab-committee-members"
          >
            👥 Committee Members Roster
          </button>
        </div>

        <div className="export-action-btns">
          <button
            type="button"
            onClick={() => setActiveTab('image')}
            className="btn-glass-secondary"
            title="View Original Image"
            id="btn-view-scan"
          >
            🖼️ View Scan
          </button>
          <button
            type="button"
            onClick={handleExportCsv}
            className="btn-glass-secondary"
            title="Download Work Distribution CSV"
            id="btn-export-csv"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Export CSV
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="btn-glass-primary"
            title="Print Official Document"
            id="btn-print-doc"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
            Print / Save PDF
          </button>
        </div>
      </div>

      {/* ── TAB 1: OFFICIAL WORK DISTRIBUTION (POSTER & TABLE) ───────────── */}
      {activeTab === 'table' && (
        <section className="work-dist-table-section">
          {/* Official Flyer Announcement Banner */}
          <div className="poster-announcement-card">
            <div className="announcement-header-banner">
              <div className="announcement-icon-bubble">📢</div>
              <div className="announcement-headings">
                <h2 className="announcement-main-title">WORK DISTRIBUTION & PORTFOLIO ALLOCATION</h2>
                <div className="announcement-society-sub">Official Managing Committee Resolution • Wing 'A' CHS Ltd.</div>
              </div>
            </div>

            <p className="announcement-letter-body">
              <strong>Dear Residents,</strong><br />
              To ensure smooth society operations, faster complaint resolution, and dedicated maintenance tracking, the Managing Committee has finalized the official <strong>Work Distribution & Portfolio Allocation</strong>. For any queries, routine maintenance, or urgent issues, please reach out to the designated committee members as per the portfolios below.
            </p>

            <div className="poster-first-contact-pill">
              <div className="first-contact-tag">
                <span className="contact-badge-icon">👮‍♂️</span>
                <span className="contact-badge-label">FIRST CONTACT</span>
                <span className="contact-arrow">➔</span>
              </div>
              <div className="first-contact-text">
                For all society-related queries, issues or complaints, please contact <strong>Siddu (Society Manager)</strong> first.
              </div>
            </div>
          </div>

          {/* Filter, Search & Layout Controls Bar */}
          <div className="filter-controls no-print">
            <div className="search-box">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <input
                type="text"
                placeholder="Search portfolios, members, flat numbers (e.g. A-602, A-204), or tasks..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                aria-label="Search work distribution list"
                id="input-search-work-dist"
              />
              {searchTerm && (
                <button type="button" className="clear-search-btn" onClick={() => setSearchTerm('')}>×</button>
              )}
            </div>

            <div className="layout-mode-selector">
              <button
                type="button"
                className={`layout-btn ${displayLayout === 'both' ? 'active' : ''}`}
                onClick={() => setDisplayLayout('both')}
                id="btn-layout-both"
              >
                📑 Poster & Table
              </button>
              <button
                type="button"
                className={`layout-btn ${displayLayout === 'poster' ? 'active' : ''}`}
                onClick={() => setDisplayLayout('poster')}
                id="btn-layout-poster"
              >
                🎴 Poster Grid (3×3)
              </button>
              <button
                type="button"
                className={`layout-btn ${displayLayout === 'table' ? 'active' : ''}`}
                onClick={() => setDisplayLayout('table')}
                id="btn-layout-table"
              >
                📋 Document Table
              </button>
            </div>

            <div className="flat-toggle-box">
              <label className="flat-toggle-label">
                <input
                  type="checkbox"
                  checked={showFlatNumbers}
                  onChange={(e) => setShowFlatNumbers(e.target.checked)}
                  id="toggle-show-flats"
                />
                <span>Show Flat Numbers in Table</span>
              </label>
            </div>

            <div className="member-quick-filters">
              <span className="filter-label">Filter Member:</span>
              <div className="member-filter-chips">
                {memberFilterList.map((m) => (
                  <button
                    key={m}
                    type="button"
                    className={`member-chip-btn ${selectedMember === m ? 'active' : ''}`}
                    onClick={() => setSelectedMember(m)}
                  >
                    {m === 'Himansu' && showFlatNumbers ? 'Himansu (A-602)' : m}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* ── SUB-VIEW A: 3x3 POSTER GRID (Exact Visual Replica) ────────── */}
          {(displayLayout === 'poster' || displayLayout === 'both') && (
            <div className="poster-grid-container" id="poster-cards-view">
              <div className="poster-grid-3x3">
                {filteredPortfolios.length === 0 ? (
                  <div className="empty-poster-msg">
                    No responsibility area matches "{searchTerm || selectedMember}".
                  </div>
                ) : (
                  filteredPortfolios.map((item) => (
                    <div
                      key={item.no}
                      className="poster-card-item"
                      style={{ '--card-theme': item.badgeColor }}
                    >
                      {/* Card Header Band */}
                      <div className="poster-card-header" style={{ backgroundColor: item.badgeColor }}>
                        <span className="poster-card-num">{item.no}</span>
                        <h3 className="poster-card-title">{item.responsibilityArea}</h3>
                      </div>

                      {/* Card Body with Icon & Member Pills */}
                      <div className="poster-card-body">
                        <div className="poster-card-top-content">
                          <div className="poster-card-icon-wrap" style={{ color: item.badgeColor }}>
                            <PortfolioIcon type={item.iconType} />
                          </div>

                          <div className="poster-card-members-wrap">
                            {item.displayedAssigned ? (
                              <div className="members-pill-cluster">
                                {item.assignedMembers.map((m) => (
                                  <button
                                    key={m}
                                    type="button"
                                    className={`member-pill-btn ${selectedMember === m ? 'selected' : ''}`}
                                    onClick={() => setSelectedMember(m)}
                                    title={`Filter by ${m}`}
                                  >
                                    {formatMemberLabel(m, showFlatNumbers)}
                                  </button>
                                ))}
                                {item.allMembersInvolved && (
                                  <span className="member-pill-btn all-members">
                                    All Committee Members
                                  </span>
                                )}
                              </div>
                            ) : (
                              <div className="members-pill-cluster">
                                {item.assignedMembers.map((m) => (
                                  <button
                                    key={m}
                                    type="button"
                                    className={`member-pill-btn ${selectedMember === m ? 'selected' : ''}`}
                                    onClick={() => setSelectedMember(m)}
                                    title={`Filter by ${m}`}
                                  >
                                    {formatMemberLabel(m, showFlatNumbers)}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Card Subtext / Responsibilities */}
                        <div className="poster-card-desc-box">
                          <p>{item.keyResponsibilities}</p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* ── SUB-VIEW B: OFFICIAL DOCUMENT TABLE ───────────────────────── */}
          {(displayLayout === 'table' || displayLayout === 'both') && (
            <div className="official-table-wrapper">
              <table className="work-distribution-table" id="table-work-distribution">
                <thead>
                  <tr>
                    <th className="col-no" scope="col">No.</th>
                    <th className="col-area" scope="col">Responsibility Area</th>
                    <th className="col-assigned" scope="col">Assigned Committee Members</th>
                    <th className="col-desc" scope="col">Key Responsibilities</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPortfolios.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="empty-row">
                        No responsibility area matches "{searchTerm || selectedMember}".
                      </td>
                    </tr>
                  ) : (
                    filteredPortfolios.map((item) => (
                      <tr key={item.no} className="portfolio-row">
                        {/* No. */}
                        <td className="cell-no">
                          <span className="row-number">{item.no}</span>
                        </td>

                        {/* Responsibility Area with Icon */}
                        <td className="cell-area">
                          <div className="area-content">
                            <div className="area-icon-container" aria-hidden="true">
                              <PortfolioIcon type={item.iconType} />
                            </div>
                            <div className="area-text">
                              <span className="area-title">{item.responsibilityArea}</span>
                              <span className="area-category-tag">{item.category}</span>
                            </div>
                          </div>
                        </td>

                        {/* Assigned Committee Members */}
                        <td className="cell-assigned">
                          <div className="assigned-members-wrap">
                            {item.displayedAssigned ? (
                              <span className="all-members-text">
                                {showFlatNumbers
                                  ? item.displayedAssigned
                                      .replace(/Himanshu|Himansu/g, 'Himansu (A-602)')
                                      .replace('Amit', 'Amit (A-1007)')
                                      .replace('Prashant', 'Prashant (A-505)')
                                      .replace('Sandeep', 'Sandeep (A-301)')
                                      .replace('Neha', 'Neha (A-204)')
                                  : item.displayedAssigned.replace(/Himanshu/g, 'Himansu')}
                              </span>
                            ) : (
                              item.assignedMembers.map((member, i) => (
                                <React.Fragment key={member}>
                                  <button
                                    type="button"
                                    className={`member-badge-btn ${selectedMember === member ? 'highlighted' : ''}`}
                                    onClick={() => setSelectedMember(member)}
                                    title={`Filter by ${member}`}
                                  >
                                    {formatMemberLabel(member, showFlatNumbers)}
                                  </button>
                                  {i < item.assignedMembers.length - 1 && <span className="slash-sep">/</span>}
                                </React.Fragment>
                              ))
                            )}
                          </div>
                        </td>

                        {/* Key Responsibilities */}
                        <td className="cell-desc">
                          <p className="responsibilities-text">{item.keyResponsibilities}</p>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Official Poster Signoff & Footer */}
          <div className="official-poster-footer-card">
            <div className="poster-footer-support-banner">
              <span className="support-banner-icon">👥</span>
              <span className="support-banner-text">
                Our collective support and cooperation will help us maintain a clean, secure, and well-managed society.
              </span>
            </div>

            <div className="poster-footer-signoff-row">
              <div className="signoff-left">
                <div className="signoff-salutation">Warm Regards,</div>
                <div className="signoff-authority">A Building Committee</div>
                <div className="signoff-society-name">Majestique Euriska 'A' Building CHS Ltd.</div>
              </div>
              <div className="signoff-right-slogan">
                <div className="slogan-badge">
                  <span>CLEAN</span>
                  <span className="slogan-dot">•</span>
                  <span>SAFE</span>
                  <span className="slogan-dot">•</span>
                  <span>HAPPY</span>
                  <span className="slogan-dot">•</span>
                  <span>TOGETHER</span>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── TAB 2: OFFICIAL NOTICE SCAN IMAGE ────────────────────────────── */}
      {activeTab === 'image' && (
        <section className="official-scan-section">
          <div className="section-intro-banner">
            <div className="banner-icon">🖼️</div>
            <div>
              <h3>Official Work Distribution Circular Scan</h3>
              <p>
                Original verified notice document of Majestique Euriska 'A' Building Managing Committee work distribution.
              </p>
            </div>
            <div className="scan-controls-bar">
              <button
                type="button"
                className="scan-zoom-btn"
                onClick={() => setZoomLevel(prev => Math.max(0.6, prev - 0.15))}
                title="Zoom Out"
              >
                − Zoom Out
              </button>
              <button
                type="button"
                className="scan-zoom-btn"
                onClick={() => setZoomLevel(1)}
                title="Reset Zoom"
              >
                100% Reset
              </button>
              <button
                type="button"
                className="scan-zoom-btn"
                onClick={() => setZoomLevel(prev => Math.min(2.0, prev + 0.15))}
                title="Zoom In"
              >
                + Zoom In
              </button>
              <a
                href={OFFICIAL_WORK_DISTRIBUTION_IMAGE.src}
                target="_blank"
                rel="noreferrer"
                className="scan-download-btn"
              >
                Open Full Screen ↗
              </a>
              <a
                href={OFFICIAL_WORK_DISTRIBUTION_IMAGE.src}
                download={OFFICIAL_WORK_DISTRIBUTION_IMAGE.fileName}
                className="scan-download-btn primary"
              >
                📥 Download Original
              </a>
            </div>
          </div>

          <div className="image-scan-viewer-box">
            <div
              className="image-scan-inner"
              style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'top center', transition: 'transform 0.2s ease-out' }}
            >
              <img
                src={OFFICIAL_WORK_DISTRIBUTION_IMAGE.src}
                alt="Official Majestique Euriska Work Distribution Notice"
                className="official-scanned-img"
                id="img-work-distribution-scan"
              />
            </div>
          </div>
        </section>
      )}

      {/* ── TAB 3: REQUESTED 10 FLATS OWNERS DIRECTORY ───────────────────── */}
      {activeTab === 'owners' && (
        <section className="requested-owners-section">
          <div className="section-intro-banner">
            <div className="banner-icon">🏢</div>
            <div>
              <h3>Wing A — 10 Target Flats Owner & Member Registry</h3>
              <p>
                Verified owner list for <strong>A-204, A-301, A-403, A-501, A-505, A-602, A-603, A-607, A-704, and A-1007</strong> cross-referenced against Society Allotment & Committee records.
              </p>
            </div>
          </div>

          <div className="owners-grid">
            {REQUESTED_FLATS_OWNERS.map((record) => (
              <div key={record.flat} className="owner-card">
                <div className="card-top-row">
                  <div className="flat-badge-pill">{record.flat}</div>
                  <span className={`occupancy-tag ${record.occupantType.includes('Owner') ? 'owner' : 'tenant'}`}>
                    {record.occupantType}
                  </span>
                </div>

                <h4 className="owner-full-name">{record.ownerName}</h4>

                <div className="owner-meta-items">
                  <div className="meta-line">
                    <span className="meta-lbl">Floor:</span>
                    <span className="meta-val">{record.floor}th Floor</span>
                  </div>
                  <div className="meta-line">
                    <span className="meta-lbl">Parking:</span>
                    <span className="meta-val font-mono">{record.parkingSlot} ({record.parkingType})</span>
                  </div>
                  {record.committeeMember && (
                    <div className="meta-line highlight-committee">
                      <span className="meta-lbl">Committee:</span>
                      <span className="meta-val member-name-badge">
                        {record.committeeMember} — {record.role}
                      </span>
                    </div>
                  )}
                </div>

                <div className="card-notes-box">
                  <span className="notes-icon">📌</span>
                  <span className="notes-text">{record.notes}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Quick Summary Table for Copying */}
          <div className="quick-summary-table-box">
            <h4>Quick Reference Summary (10 Flats)</h4>
            <div className="table-responsive">
              <table className="mini-owners-table">
                <thead>
                  <tr>
                    <th>Flat No.</th>
                    <th>Registered Owner / Resident</th>
                    <th>Status</th>
                    <th>Parking</th>
                    <th>Committee Representation</th>
                  </tr>
                </thead>
                <tbody>
                  {REQUESTED_FLATS_OWNERS.map((r) => (
                    <tr key={r.flat}>
                      <td className="font-bold text-blue">{r.flat}</td>
                      <td>{r.ownerName}</td>
                      <td><span className="tag-status-active">Owner</span></td>
                      <td className="font-mono">{r.parkingSlot}</td>
                      <td>{r.committeeMember ? <strong>{r.committeeMember} ({r.role})</strong> : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {/* ── TAB 4: COMMITTEE MEMBERS MATRIX ──────────────────────────────── */}
      {activeTab === 'members' && (
        <section className="committee-matrix-section">
          <div className="section-intro-banner">
            <div className="banner-icon">👥</div>
            <div>
              <h3>Managing Committee Members — 10 Member Roster</h3>
              <p>
                Portfolio allocation matrix mapped to individual committee members of Majestique Euriska 'A' Building CHS.
              </p>
            </div>
          </div>

          <div className="members-card-grid">
            {COMMITTEE_MEMBERS.map((member) => (
              <div key={member.name} className="member-portfolio-card">
                <div className="member-card-header">
                  <div
                    className="member-avatar"
                    style={{ backgroundColor: member.avatarColor }}
                  >
                    {member.name.charAt(0)}
                  </div>
                  <div className="member-headline">
                    <h4 className="member-card-name">
                      {member.displayName || member.name}
                    </h4>
                    <span className="member-card-role">{member.role}</span>
                  </div>
                  <div className="member-flat-tag">Flat {member.flat}</div>
                </div>

                <p className="member-full-legal-name">{member.fullName}</p>

                <div className="member-portfolios-list">
                  <span className="portfolios-heading">Assigned Portfolios ({member.portfolios.length}):</span>
                  <ul>
                    {member.portfolios.map((p) => (
                      <li key={p}>
                        <span className="check-bullet">✓</span> {p}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
