import React, { useState, useMemo, useCallback } from 'react';
import { SOCIETY_INFO } from '../../data/societyConfig.js';
import {
  RULE_CATEGORIES,
  RULE_SEVERITIES,
  INITIAL_SOCIETY_RULES,
  OFFICIAL_POSTERS,
  QUICK_CONTACTS
} from '../../data/societyRulesData.js';

export default function SocietyRulesModule({ isAdmin = false, userRole = 'RESIDENT' }) {
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [severityFilter, setSeverityFilter] = useState('ALL'); // 'ALL' | 'STRICT' | 'FINES'
  const [copiedRuleId, setCopiedRuleId] = useState(null);
  const [copiedSummary, setCopiedSummary] = useState(false);
  const [isViolationModalOpen, setIsViolationModalOpen] = useState(false);
  const [selectedPoster, setSelectedPoster] = useState(null); // Lightbox modal for posters

  // Clubhouse Booking Calculator State
  const [bookingHours, setBookingHours] = useState('5'); // '5' | 'full'
  const [bookingFunctionType, setBookingFunctionType] = useState('Birthday Party');
  const [calculatorFlat, setCalculatorFlat] = useState('');

  // Violation form state
  const [violationForm, setViolationForm] = useState({
    flatNumber: '',
    ruleType: 'Unauthorized / Wrong Parking (Fine ₹500/day)',
    details: '',
    submitted: false
  });

  // Filtered Rules
  const filteredRules = useMemo(() => {
    return INITIAL_SOCIETY_RULES.filter((rule) => {
      // Category filter
      if (selectedCategory !== 'ALL' && selectedCategory !== 'notices') {
        if (rule.category !== selectedCategory) return false;
      }

      // Severity filter
      if (severityFilter === 'STRICT' && rule.severity !== 'STRICT') {
        return false;
      }
      if (severityFilter === 'FINES' && !rule.penalty) {
        return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const haystack = [
          rule.article,
          rule.title,
          rule.categoryLabel,
          rule.summary,
          rule.timings,
          rule.penalty,
          rule.authority,
          ...(rule.guidelines || [])
        ].join(' ').toLowerCase();

        if (!haystack.includes(q)) {
          return false;
        }
      }

      return true;
    });
  }, [selectedCategory, severityFilter, searchQuery]);

  // Statistics
  const stats = useMemo(() => {
    const total = INITIAL_SOCIETY_RULES.length;
    const strictCount = INITIAL_SOCIETY_RULES.filter(r => r.severity === 'STRICT').length;
    const withFinesCount = INITIAL_SOCIETY_RULES.filter(r => r.penalty).length;
    return {
      total,
      strictCount,
      withFinesCount,
      postersCount: OFFICIAL_POSTERS.length
    };
  }, []);

  // Copy single rule to clipboard
  const handleCopyRule = useCallback((rule) => {
    const text = `📜 *${SOCIETY_INFO.shortName} — Official Bylaw Notice*\n\n` +
      `*${rule.article}: ${rule.title}*\n` +
      `⏱️ *Timings:* ${rule.timings}\n` +
      `📅 *Days:* ${rule.daysApplicable}\n\n` +
      `*Summary:* ${rule.summary}\n\n` +
      `*Guidelines:*\n${rule.guidelines.map(g => `• ${g}`).join('\n')}\n\n` +
      `⚠️ *Penalty for Violation:* ${rule.penalty}\n` +
      `🛡️ *Enforcement:* ${rule.authority}\n\n` +
      `_Official Society Portal: ${SOCIETY_INFO.email}_`;

    navigator.clipboard.writeText(text).then(() => {
      setCopiedRuleId(rule.id);
      setTimeout(() => setCopiedRuleId(null), 2200);
    }).catch(() => {
      // fallback
    });
  }, []);

  // Copy all active filtered rules summary
  const handleCopyAllSummary = useCallback(() => {
    const header = `📜 *${SOCIETY_INFO.name}*\n` +
      `*Official Bylaws & Rules Summary (Buildings A, B & C)*\n` +
      `Reg. No.: ${SOCIETY_INFO.regNoShort}\n\n` +
      `──────────────────────────────\n`;

    const body = filteredRules.map((r, i) => (
      `${i + 1}. *${r.article}: ${r.title}*\n` +
      `⏱️ ${r.timings}\n` +
      `⚠️ Penalty: ${r.penalty}\n`
    )).join('\n');

    const footer = `\n──────────────────────────────\n` +
      `🚨 Parking / Gate Fine: ₹500/day added directly to maintenance\n` +
      `📞 Gate Intercom: 100 | Estate Office: 020-2680-1100\n` +
      `📧 Inquiries: ${SOCIETY_INFO.email}`;

    navigator.clipboard.writeText(header + body + footer).then(() => {
      setCopiedSummary(true);
      setTimeout(() => setCopiedSummary(false), 2400);
    });
  }, [filteredRules]);

  // Handle violation submission
  const handleSubmitViolation = (e) => {
    e.preventDefault();
    setViolationForm(prev => ({ ...prev, submitted: true }));
    setTimeout(() => {
      setIsViolationModalOpen(false);
      setViolationForm({
        flatNumber: '',
        ruleType: 'Unauthorized / Wrong Parking (Fine ₹500/day)',
        details: '',
        submitted: false
      });
    }, 2000);
  };

  return (
    <div className="society-rules-container" style={{ padding: '24px 20px', maxWidth: '1440px', margin: '0 auto', color: '#0f172a' }}>
      {/* ──────────────────────────────────────────────────────────────────────
          1. Legal Header Banner
      ────────────────────────────────────────────────────────────────────── */}
      <div style={{
        background: 'linear-gradient(135deg, #991b1b 0%, #b91c1c 40%, #064e3b 100%)',
        borderRadius: '20px',
        padding: '30px 32px',
        color: '#ffffff',
        boxShadow: '0 14px 40px -10px rgba(153, 27, 27, 0.4)',
        marginBottom: '26px',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Decorative background watermark */}
        <div style={{
          position: 'absolute',
          right: '-10px',
          bottom: '-30px',
          fontSize: '11rem',
          opacity: 0.08,
          userSelect: 'none',
          pointerEvents: 'none'
        }}>
          ⚖️
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '20px', position: 'relative', zIndex: 1 }}>
          <div style={{ maxWidth: '840px' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.18)', padding: '5px 14px', borderRadius: '30px', fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '12px' }}>
              <span>📢 Official Society Circulars</span>
              <span>•</span>
              <span style={{ color: '#fef08a' }}>Applicable to A, B & C Buildings</span>
              <span>•</span>
              <span style={{ color: '#a7f3d0' }}>{SOCIETY_INFO.regNoShort}</span>
            </div>

            <h1 style={{ margin: '0 0 8px 0', fontSize: '1.95rem', fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.25 }}>
              Society Rules, Bylaws & Community Guidelines
            </h1>

            <p style={{ margin: '0 0 14px 0', fontSize: '0.94rem', color: '#fef2f2', lineHeight: 1.5, maxWidth: '740px' }}>
              Official regulations enforced for all residents, tenants, guests, visitors, and staff. Strictly ratified by the Majestique Euriska Society Management Committee.
            </p>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '14px', fontSize: '0.78rem', color: '#fecaca' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                📍 {SOCIETY_INFO.addressShort}
              </span>
              <span>•</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                ✉️ {SOCIETY_INFO.email}
              </span>
              <span>•</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                🛡️ Enforced by Managing Committee & Security Control
              </span>
            </div>
          </div>

          {/* Quick Actions */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', minWidth: '220px' }}>
            <button
              type="button"
              id="report-violation-btn"
              onClick={() => setIsViolationModalOpen(true)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                background: '#ffffff',
                color: '#991b1b',
                border: 'none',
                padding: '11px 18px',
                borderRadius: '12px',
                fontSize: '0.85rem',
                fontWeight: 800,
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(0,0,0,0.25)',
                transition: 'all 0.15s ease'
              }}
            >
              <span>🚨</span>
              <span>Report Rule Violation</span>
            </button>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                id="copy-rules-summary-btn"
                onClick={handleCopyAllSummary}
                style={{
                  flex: 1,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  background: 'rgba(255,255,255,0.18)',
                  color: '#ffffff',
                  border: '1px solid rgba(255,255,255,0.28)',
                  padding: '9px 12px',
                  borderRadius: '10px',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'background 0.15s'
                }}
              >
                <span>{copiedSummary ? '✓ Copied' : '📋 Copy Summary'}</span>
              </button>

              <button
                type="button"
                id="print-rules-btn"
                onClick={() => window.print()}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  background: 'rgba(255,255,255,0.18)',
                  color: '#ffffff',
                  border: '1px solid rgba(255,255,255,0.28)',
                  padding: '9px 14px',
                  borderRadius: '10px',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'background 0.15s'
                }}
                title="Print or Save as PDF"
              >
                <span>🖨️ Print</span>
              </button>

              <button
                type="button"
                id="view-visuals-btn"
                onClick={() => window.dispatchEvent(new CustomEvent('changeTab', { detail: 'water_management' }))}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  background: 'rgba(255,255,255,0.25)',
                  color: '#ffffff',
                  border: '1px solid rgba(255,255,255,0.4)',
                  padding: '9px 14px',
                  borderRadius: '10px',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'background 0.15s'
                }}
                title="View Society CAD Plans, Infrastructure & Visuals"
              >
                <span>📐 Visualization Work →</span>
              </button>
            </div>
          </div>
        </div>

        {/* Highlight Banner Strips (Real Data from Uploaded Posters) */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
          gap: '12px',
          marginTop: '22px',
          paddingTop: '18px',
          borderTop: '1px solid rgba(255,255,255,0.2)'
        }}>
          <div style={{ background: 'rgba(0,0,0,0.2)', padding: '10px 14px', borderRadius: '10px' }}>
            <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: '#fed7aa', fontWeight: 800, letterSpacing: '0.04em' }}>🚗 Parking Violation Fine</div>
            <div style={{ fontSize: '1.15rem', fontWeight: 900, marginTop: '2px', color: '#ffffff' }}>₹500 PER DAY</div>
            <div style={{ fontSize: '0.72rem', color: '#fecaca' }}>Debited directly without warning</div>
          </div>

          <div style={{ background: 'rgba(0,0,0,0.2)', padding: '10px 14px', borderRadius: '10px' }}>
            <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: '#fed7aa', fontWeight: 800, letterSpacing: '0.04em' }}>🚰 Water Wastage & Overflow</div>
            <div style={{ fontSize: '1.15rem', fontWeight: 900, marginTop: '2px', color: '#ffffff' }}>TANKER COST</div>
            <div style={{ fontSize: '0.72rem', color: '#fecaca' }}>100% added to flat maintenance</div>
          </div>

          <div style={{ background: 'rgba(0,0,0,0.2)', padding: '10px 14px', borderRadius: '10px' }}>
            <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: '#fed7aa', fontWeight: 800, letterSpacing: '0.04em' }}>⚽ Corridor / Lobby Activity</div>
            <div style={{ fontSize: '1.15rem', fontWeight: 900, marginTop: '2px', color: '#ffffff' }}>FINE + REPAIR COST</div>
            <div style={{ fontSize: '0.72rem', color: '#fecaca' }}>CCTV monitored / 1st warning active</div>
          </div>

          <div style={{ background: 'rgba(0,0,0,0.2)', padding: '10px 14px', borderRadius: '10px' }}>
            <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: '#fed7aa', fontWeight: 800, letterSpacing: '0.04em' }}>🏛️ Clubhouse Charges</div>
            <div style={{ fontSize: '1.15rem', fontWeight: 900, marginTop: '2px', color: '#ffffff' }}>₹1,000 + ₹2,000 Dep.</div>
            <div style={{ fontSize: '0.72rem', color: '#fecaca' }}>Up to 5 hrs | Double for full day</div>
          </div>

          <div style={{ background: 'rgba(0,0,0,0.2)', padding: '10px 14px', borderRadius: '10px' }}>
            <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: '#fed7aa', fontWeight: 800, letterSpacing: '0.04em' }}>🎵 Music Cut-off Time</div>
            <div style={{ fontSize: '1.15rem', fontWeight: 900, marginTop: '2px', color: '#ffffff' }}>10:00 PM Sharp</div>
            <div style={{ fontSize: '0.72rem', color: '#fecaca' }}>Premises allowed till 11:30 PM</div>
          </div>

          <div style={{ background: 'rgba(0,0,0,0.2)', padding: '10px 14px', borderRadius: '10px' }}>
            <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: '#fed7aa', fontWeight: 800, letterSpacing: '0.04em' }}>🚭 Strict No-Smoking</div>
            <div style={{ fontSize: '1.15rem', fontWeight: 900, marginTop: '2px', color: '#ffffff' }}>All Common Areas</div>
            <div style={{ fontSize: '0.72rem', color: '#fecaca' }}>Lifts, corridors, gardens, parking</div>
          </div>

          <div style={{ background: 'rgba(0,0,0,0.2)', padding: '10px 14px', borderRadius: '10px' }}>
            <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: '#fed7aa', fontWeight: 800, letterSpacing: '0.04em' }}>🏊‍♂️ Swimming Pool</div>
            <div style={{ fontSize: '1.15rem', fontWeight: 900, marginTop: '2px', color: '#ffffff' }}>CLOSED THURSDAY</div>
            <div style={{ fontSize: '0.72rem', color: '#fecaca' }}>Compulsory cap & costume | No bachelors/friends</div>
          </div>

          <div style={{ background: 'rgba(0,0,0,0.2)', padding: '10px 14px', borderRadius: '10px' }}>
            <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: '#fed7aa', fontWeight: 800, letterSpacing: '0.04em' }}>🏓 Table Tennis</div>
            <div style={{ fontSize: '1.15rem', fontWeight: 900, marginTop: '2px', color: '#ffffff' }}>30 MIN LIMIT</div>
            <div style={{ fontSize: '0.72rem', color: '#fecaca' }}>Order 1/0049 | Register mandatory | No AC</div>
          </div>
        </div>
      </div>

      {/* ──────────────────────────────────────────────────────────────────────
          2. Official Circular Posters Gallery (From Uploaded Photos)
      ────────────────────────────────────────────────────────────────────── */}
      <div style={{
        background: '#ffffff',
        borderRadius: '18px',
        padding: '24px 26px',
        border: '1px solid #e2e8f0',
        boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
        marginBottom: '26px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '18px' }}>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', fontWeight: 700, color: '#dc2626', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              <span>📷 Active Physical Notices</span>
            </div>
            <h2 style={{ margin: '2px 0 4px 0', fontSize: '1.3rem', fontWeight: 800, color: '#0f172a' }}>
              Official Society Circulars & Notice Posters
            </h2>
            <p style={{ margin: 0, fontSize: '0.84rem', color: '#64748b' }}>
              High-resolution digital archive of notices currently posted on society noticeboards, gates, and clubhouse entrance. Click any poster to view full-size.
            </p>
          </div>

          <div style={{ fontSize: '0.8rem', color: '#047857', fontWeight: 700, background: '#ecfdf5', padding: '6px 14px', borderRadius: '20px', border: '1px solid #a7f3d0' }}>
            ✓ {OFFICIAL_POSTERS.length} Official Posters Archived
          </div>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '16px'
        }}>
          {OFFICIAL_POSTERS.map((poster) => (
            <div
              key={poster.id}
              onClick={() => setSelectedPoster(poster)}
              style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '14px',
                overflow: 'hidden',
                cursor: 'pointer',
                transition: 'transform 0.18s ease, box-shadow 0.18s ease',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.boxShadow = '0 10px 24px rgba(0,0,0,0.08)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <div style={{ position: 'relative', height: '170px', overflow: 'hidden', background: '#0f172a' }}>
                <img
                  src={poster.image}
                  alt={poster.title}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    objectPosition: 'top center',
                    transition: 'transform 0.3s'
                  }}
                />
                <span style={{
                  position: 'absolute',
                  top: '10px',
                  right: '10px',
                  background: 'rgba(15, 23, 42, 0.85)',
                  backdropFilter: 'blur(4px)',
                  color: '#ffffff',
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  padding: '3px 8px',
                  borderRadius: '6px'
                }}>
                  🔍 Tap to Zoom
                </span>
                <span style={{
                  position: 'absolute',
                  bottom: '10px',
                  left: '10px',
                  background: '#dc2626',
                  color: '#ffffff',
                  fontSize: '0.68rem',
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: '6px'
                }}>
                  {poster.badge}
                </span>
              </div>

              <div style={{ padding: '14px 16px' }}>
                <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#0f172a', marginBottom: '4px', lineHeight: 1.3 }}>
                  {poster.title}
                </div>
                {poster.marathiTitle && (
                  <div style={{ fontSize: '0.78rem', color: '#047857', fontWeight: 600, marginBottom: '6px' }}>
                    {poster.marathiTitle}
                  </div>
                )}
                <p style={{ margin: 0, fontSize: '0.76rem', color: '#64748b', lineHeight: 1.4 }}>
                  {poster.summary}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ──────────────────────────────────────────────────────────────────────
          3. Interactive Clubhouse & Lawn Booking Rules Calculator
      ────────────────────────────────────────────────────────────────────── */}
      <div style={{
        background: 'linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%)',
        borderRadius: '18px',
        padding: '24px 26px',
        border: '1px solid #a7f3d0',
        marginBottom: '26px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '18px' }}>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', fontWeight: 700, color: '#047857', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              <span>🏛️ Official Circular (Dated 10-08-2026)</span>
            </div>
            <h2 style={{ margin: '2px 0 4px 0', fontSize: '1.25rem', fontWeight: 800, color: '#064e3b' }}>
              Clubhouse & Lawn Booking Calculator & Guidelines
            </h2>
            <p style={{ margin: 0, fontSize: '0.84rem', color: '#047857' }}>
              First-come-first-serve basis with 100% advance payment to the respective Building Committee Member.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#064e3b' }}>Select Duration:</span>
            <button
              type="button"
              onClick={() => setBookingHours('5')}
              style={{
                background: bookingHours === '5' ? '#047857' : '#ffffff',
                color: bookingHours === '5' ? '#ffffff' : '#047857',
                border: '1px solid #047857',
                padding: '6px 14px',
                borderRadius: '8px',
                fontSize: '0.8rem',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              Up to 5 Hours
            </button>
            <button
              type="button"
              onClick={() => setBookingHours('full')}
              style={{
                background: bookingHours === 'full' ? '#047857' : '#ffffff',
                color: bookingHours === 'full' ? '#ffffff' : '#047857',
                border: '1px solid #047857',
                padding: '6px 14px',
                borderRadius: '8px',
                fontSize: '0.8rem',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              Full Day (5+ Hours)
            </button>
          </div>
        </div>

        {/* Pricing Cards Strip */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '14px',
          marginBottom: '18px'
        }}>
          <div style={{ background: '#ffffff', padding: '16px 18px', borderRadius: '12px', border: '1px solid #cbd5e1' }}>
            <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: '#64748b', fontWeight: 700 }}>Non-Refundable Utilization Fee</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#065f46', marginTop: '4px' }}>
              ₹{bookingHours === '5' ? '1,000' : '2,000'}
            </div>
            <div style={{ fontSize: '0.74rem', color: '#64748b' }}>
              {bookingHours === '5' ? 'Standard 5-hr charge' : 'Full 1-day utilization rate'}
            </div>
          </div>

          <div style={{ background: '#ffffff', padding: '16px 18px', borderRadius: '12px', border: '1px solid #cbd5e1' }}>
            <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: '#64748b', fontWeight: 700 }}>Refundable Security Deposit</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#0284c7', marginTop: '4px' }}>
              ₹{bookingHours === '5' ? '2,000' : '4,000'}
            </div>
            <div style={{ fontSize: '0.74rem', color: '#64748b' }}>
              Refunded after AS-IS clean inspection
            </div>
          </div>

          <div style={{ background: '#ffffff', padding: '16px 18px', borderRadius: '12px', border: '1px solid #cbd5e1' }}>
            <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: '#64748b', fontWeight: 700 }}>Total Advance Payable</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#b91c1c', marginTop: '4px' }}>
              ₹{bookingHours === '5' ? '3,000' : '6,000'}
            </div>
            <div style={{ fontSize: '0.74rem', color: '#64748b' }}>
              100% advance to Building Committee Member
            </div>
          </div>
        </div>

        {/* Key Restrictions Grid directly from Circular */}
        <div style={{
          background: 'rgba(255,255,255,0.7)',
          padding: '16px 18px',
          borderRadius: '12px',
          border: '1px solid #cbd5e1',
          fontSize: '0.8rem',
          color: '#1e293b'
        }}>
          <div style={{ fontWeight: 800, color: '#064e3b', marginBottom: '8px' }}>
            📋 Mandatory Conditions from Guidelines Dt. 10-08-2026:
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '8px 16px' }}>
            <div>❌ <b>No Cooking:</b> Only normal heating / microwave allowed.</div>
            <div>❌ <b>Lawn Area:</b> Cannot be used for eating during functions.</div>
            <div>❌ <b>No Society Chairs:</b> Will not be given for personal home use.</div>
            <div>❌ <b>No DJ / Stage / Lights:</b> No extra lights, DJ or stage setup allowed.</div>
            <div>❌ <b>No Generators:</b> External generators strictly barred.</div>
            <div>❌ <b>No Alcohol / Smoking:</b> Strictly prohibited anytime.</div>
            <div>⏰ <b>Premises Timings:</b> Allowed till <b>11:30 PM</b>.</div>
            <div>🔇 <b>Music Cutoff:</b> Strictly stopped at <b>10:00 PM</b> per Govt law.</div>
            <div>🇮🇳 <b>National Holidays:</b> Aug 15 & Jan 26 lawn rules decided by Common Committee.</div>
            <div>🤝 <b>First Come First Serve:</b> Building committee informs Common Committee.</div>
          </div>
        </div>
      </div>

      {/* ──────────────────────────────────────────────────────────────────────
          4. Filter Controls & Search
      ────────────────────────────────────────────────────────────────────── */}
      <div style={{
        background: '#ffffff',
        borderRadius: '16px',
        padding: '18px 20px',
        border: '1px solid #e2e8f0',
        boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
        marginBottom: '22px',
        display: 'flex',
        flexDirection: 'column',
        gap: '14px'
      }}>
        {/* Search Row */}
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ flex: '1 1 300px', position: 'relative' }}>
            <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: '1rem' }}>
              🔍
            </span>
            <input
              type="text"
              id="rules-search-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search rules (e.g. parking 500, smoking, clubhouse charges, footwear, drilling)..."
              style={{
                width: '100%',
                boxSizing: 'border-box',
                padding: '11px 40px 11px 42px',
                border: '1px solid #cbd5e1',
                borderRadius: '10px',
                fontSize: '0.88rem',
                outline: 'none',
                background: '#f8fafc',
                transition: 'border-color 0.15s, background-color 0.15s'
              }}
              onFocus={(e) => { e.target.style.borderColor = '#059669'; e.target.style.background = '#ffffff'; }}
              onBlur={(e) => { e.target.style.borderColor = '#cbd5e1'; e.target.style.background = '#f8fafc'; }}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                  padding: '4px'
                }}
                title="Clear search"
              >
                ✕
              </button>
            )}
          </div>

          {/* Severity Quick Chips */}
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>Filter:</span>
            {[
              { id: 'ALL', label: 'All Clauses' },
              { id: 'STRICT', label: '🚨 Strict Only' },
              { id: 'FINES', label: '⚠️ Fines Applicable' }
            ].map(chip => (
              <button
                key={chip.id}
                type="button"
                onClick={() => setSeverityFilter(chip.id)}
                style={{
                  background: severityFilter === chip.id ? '#991b1b' : '#f1f5f9',
                  color: severityFilter === chip.id ? '#ffffff' : '#475569',
                  border: 'none',
                  padding: '6px 12px',
                  borderRadius: '20px',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.15s'
                }}
              >
                {chip.label}
              </button>
            ))}
          </div>
        </div>

        {/* Category Filter Pills */}
        <div style={{
          display: 'flex',
          gap: '8px',
          overflowX: 'auto',
          paddingBottom: '4px',
          scrollbarWidth: 'thin'
        }}>
          {RULE_CATEGORIES.map((cat) => {
            const count = cat.id === 'ALL'
              ? INITIAL_SOCIETY_RULES.length
              : cat.id === 'notices'
                ? OFFICIAL_POSTERS.length
                : INITIAL_SOCIETY_RULES.filter(r => r.category === cat.id).length;
            const isSelected = selectedCategory === cat.id;

            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: isSelected ? '#0f172a' : '#f8fafc',
                  color: isSelected ? '#ffffff' : '#334155',
                  border: isSelected ? '1px solid #0f172a' : '1px solid #e2e8f0',
                  padding: '8px 14px',
                  borderRadius: '10px',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.15s ease'
                }}
              >
                <span>{cat.icon}</span>
                <span>{cat.label}</span>
                <span style={{
                  background: isSelected ? 'rgba(255,255,255,0.25)' : '#e2e8f0',
                  color: isSelected ? '#ffffff' : '#475569',
                  padding: '2px 7px',
                  borderRadius: '10px',
                  fontSize: '0.72rem',
                  fontWeight: 700
                }}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ──────────────────────────────────────────────────────────────────────
          5. Rule Cards Grid
      ────────────────────────────────────────────────────────────────────── */}
      <div style={{ marginBottom: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: '0.85rem', color: '#475569', fontWeight: 600 }}>
          Showing <span style={{ color: '#0f172a', fontWeight: 800 }}>{filteredRules.length}</span> official bylaws
          {selectedCategory !== 'ALL' && ` in ${RULE_CATEGORIES.find(c => c.id === selectedCategory)?.label}`}
          {searchQuery && ` matching "${searchQuery}"`}
        </div>

        {filteredRules.length > 0 && (
          <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
            Click <b>📋 Copy</b> on any card to share in WhatsApp resident groups
          </div>
        )}
      </div>

      {filteredRules.length === 0 ? (
        <div style={{
          background: '#ffffff',
          borderRadius: '16px',
          padding: '60px 20px',
          textAlign: 'center',
          border: '1px dashed #cbd5e1',
          color: '#64748b'
        }}>
          <div style={{ fontSize: '3rem', marginBottom: '12px' }}>🔍</div>
          <h3 style={{ margin: '0 0 6px 0', color: '#1e293b', fontSize: '1.2rem' }}>No matching rules found</h3>
          <p style={{ margin: '0 0 16px 0', fontSize: '0.88rem' }}>
            Try searching for terms like "parking", "smoking", "clubhouse", "footwear", or clear filters.
          </p>
          <button
            type="button"
            onClick={() => { setSelectedCategory('ALL'); setSearchQuery(''); setSeverityFilter('ALL'); }}
            style={{
              background: '#047857',
              color: '#ffffff',
              border: 'none',
              padding: '9px 18px',
              borderRadius: '8px',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))',
          gap: '18px',
          marginBottom: '36px'
        }}>
          {filteredRules.map((rule) => {
            const severityMeta = RULE_SEVERITIES[rule.severity] || RULE_SEVERITIES.STANDARD;
            const isCopied = copiedRuleId === rule.id;

            return (
              <div
                key={rule.id}
                className="rule-card"
                style={{
                  background: '#ffffff',
                  borderRadius: '16px',
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 3px 12px rgba(0,0,0,0.04)',
                  padding: '22px 22px 18px 22px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  transition: 'transform 0.15s ease, box-shadow 0.15s ease'
                }}
              >
                <div>
                  {/* Card Header Pills */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                      <span style={{
                        background: '#f1f5f9',
                        color: '#334155',
                        fontWeight: 700,
                        fontSize: '0.72rem',
                        padding: '4px 8px',
                        borderRadius: '6px',
                        letterSpacing: '0.04em'
                      }}>
                        {rule.article}
                      </span>
                      <span style={{
                        background: '#f8fafc',
                        color: '#64748b',
                        fontSize: '0.72rem',
                        fontWeight: 600,
                        padding: '4px 8px',
                        borderRadius: '6px'
                      }}>
                        {rule.categoryIcon} {rule.categoryLabel}
                      </span>
                    </div>

                    <span style={{
                      background: severityMeta.bg,
                      color: severityMeta.color,
                      border: `1px solid ${severityMeta.border}`,
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      padding: '3px 9px',
                      borderRadius: '14px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}>
                      <span>●</span>
                      <span>{severityMeta.label}</span>
                    </span>
                  </div>

                  {/* Title */}
                  <h3 style={{
                    margin: '0 0 10px 0',
                    fontSize: '1.08rem',
                    fontWeight: 700,
                    color: '#0f172a',
                    lineHeight: 1.35
                  }}>
                    {rule.title}
                  </h3>

                  {/* Timings Strip */}
                  {rule.timings && (
                    <div style={{
                      background: '#ecfdf5',
                      border: '1px solid #a7f3d0',
                      borderRadius: '8px',
                      padding: '8px 12px',
                      marginBottom: '12px',
                      fontSize: '0.78rem',
                      color: '#065f46',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '3px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700 }}>
                        <span>⏱️ Timings / Conditions:</span>
                        <span>{rule.timings}</span>
                      </div>
                      {rule.daysApplicable && (
                        <div style={{ color: '#047857', fontSize: '0.74rem' }}>
                          📅 {rule.daysApplicable}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Summary */}
                  <p style={{
                    margin: '0 0 14px 0',
                    fontSize: '0.85rem',
                    color: '#475569',
                    lineHeight: 1.5
                  }}>
                    {rule.summary}
                  </p>

                  {/* Bulleted Guidelines */}
                  <div style={{ marginBottom: '14px' }}>
                    <div style={{ fontSize: '0.76rem', fontWeight: 700, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '6px' }}>
                      Key Guidelines & Protocols:
                    </div>
                    <ul style={{
                      margin: 0,
                      paddingLeft: '18px',
                      fontSize: '0.82rem',
                      color: '#334155',
                      lineHeight: 1.5
                    }}>
                      {rule.guidelines.map((item, idx) => (
                        <li key={idx} style={{ marginBottom: '4px' }}>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Penalty Box */}
                  {rule.penalty && (
                    <div style={{
                      background: '#fff1f2',
                      border: '1px solid #fecdd3',
                      borderRadius: '8px',
                      padding: '9px 12px',
                      marginBottom: '14px',
                      fontSize: '0.78rem',
                      color: '#9f1239'
                    }}>
                      <strong style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '2px' }}>
                        <span>⚠️ Non-Compliance Penalty:</span>
                      </strong>
                      <span>{rule.penalty}</span>
                    </div>
                  )}
                </div>

                {/* Card Footer */}
                <div style={{
                  paddingTop: '12px',
                  borderTop: '1px solid #f1f5f9',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: '0.74rem',
                  color: '#64748b'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span>🛡️</span>
                    <span title="Enforcing Authority">Authority: <b>{rule.authority}</b></span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleCopyRule(rule)}
                    style={{
                      background: isCopied ? '#059669' : '#f1f5f9',
                      color: isCopied ? '#ffffff' : '#334155',
                      border: 'none',
                      padding: '5px 10px',
                      borderRadius: '6px',
                      fontSize: '0.74rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                    title="Copy rule to clipboard"
                  >
                    {isCopied ? '✓ Copied' : '📋 Copy'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────────────────
          6. Quick Contacts & Enforcement Desk
      ────────────────────────────────────────────────────────────────────── */}
      <div style={{
        background: '#ffffff',
        borderRadius: '18px',
        padding: '24px 26px',
        border: '1px solid #e2e8f0',
        boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
        marginBottom: '26px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '18px' }}>
          <div>
            <h2 style={{ margin: '0 0 4px 0', fontSize: '1.2rem', fontWeight: 800, color: '#0f172a' }}>
              Enforcement Desk & Society Contacts
            </h2>
            <p style={{ margin: 0, fontSize: '0.84rem', color: '#64748b' }}>
              For immediate rule clarifications, gate passes, or reporting ongoing violations.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsViolationModalOpen(true)}
            style={{
              background: '#dc2626',
              color: '#ffffff',
              border: 'none',
              padding: '9px 16px',
              borderRadius: '10px',
              fontSize: '0.82rem',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            Report an Incident
          </button>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
          gap: '14px'
        }}>
          {QUICK_CONTACTS.map((contact, idx) => (
            <div
              key={idx}
              style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                padding: '14px 16px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <span style={{ fontSize: '1.2rem' }}>{contact.icon}</span>
                <span style={{ fontSize: '0.74rem', textTransform: 'uppercase', fontWeight: 700, color: '#64748b', letterSpacing: '0.04em' }}>
                  {contact.role}
                </span>
              </div>
              <div style={{ fontWeight: 700, fontSize: '0.92rem', color: '#0f172a', marginBottom: '2px' }}>
                {contact.name}
              </div>
              <div style={{ fontSize: '0.82rem', color: '#047857', fontWeight: 700, marginBottom: '4px' }}>
                <a href={contact.action} style={{ color: '#047857', textDecoration: 'none' }}>
                  {contact.contact}
                </a>
              </div>
              <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                🕒 {contact.available}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ──────────────────────────────────────────────────────────────────────
          7. Poster Lightbox Modal
      ────────────────────────────────────────────────────────────────────── */}
      {selectedPoster && (
        <div
          onClick={() => setSelectedPoster(null)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(15, 23, 42, 0.85)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
            padding: '20px'
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#ffffff',
              borderRadius: '20px',
              maxWidth: '860px',
              width: '100%',
              maxHeight: '92vh',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.4)',
              position: 'relative'
            }}
          >
            <div style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
              <div>
                <span style={{ fontSize: '0.7rem', fontWeight: 700, background: '#dc2626', color: '#ffffff', padding: '2px 8px', borderRadius: '4px', textTransform: 'uppercase' }}>
                  {selectedPoster.badge}
                </span>
                <h3 style={{ margin: '4px 0 0 0', fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>
                  {selectedPoster.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedPoster(null)}
                style={{
                  background: '#e2e8f0',
                  border: 'none',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  fontSize: '1rem',
                  color: '#475569',
                  cursor: 'pointer'
                }}
              >
                ✕
              </button>
            </div>

            <div style={{ overflowY: 'auto', padding: '16px', textAlign: 'center', background: '#0b1329' }}>
              <img
                src={selectedPoster.image}
                alt={selectedPoster.title}
                style={{ maxWidth: '100%', maxHeight: '72vh', objectFit: 'contain', borderRadius: '8px' }}
              />
            </div>

            <div style={{ padding: '12px 20px', background: '#f8fafc', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                {selectedPoster.summary}
              </div>
              <a
                href={selectedPoster.image}
                target="_blank"
                rel="noreferrer"
                style={{
                  background: '#047857',
                  color: '#ffffff',
                  textDecoration: 'none',
                  padding: '6px 14px',
                  borderRadius: '6px',
                  fontSize: '0.78rem',
                  fontWeight: 700
                }}
              >
                Open Original Image ↗
              </a>
            </div>
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────────────────
          8. Report Violation Modal
      ────────────────────────────────────────────────────────────────────── */}
      {isViolationModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '16px'
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '20px',
            maxWidth: '520px',
            width: '100%',
            padding: '26px 28px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
            position: 'relative'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
              <div>
                <h3 style={{ margin: '0 0 4px 0', fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>
                  🚨 Report Society Rule Violation
                </h3>
                <p style={{ margin: 0, fontSize: '0.82rem', color: '#64748b' }}>
                  Reports are dispatched immediately to the Estate Manager & Security Gate.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsViolationModalOpen(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '1.2rem',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  padding: '4px'
                }}
              >
                ✕
              </button>
            </div>

            {violationForm.submitted ? (
              <div style={{ textAlign: 'center', padding: '30px 10px' }}>
                <div style={{ fontSize: '3rem', marginBottom: '10px' }}>✅</div>
                <h4 style={{ margin: '0 0 6px 0', color: '#065f46', fontSize: '1.1rem' }}>Report Logged Successfully</h4>
                <p style={{ margin: 0, fontSize: '0.85rem', color: '#475569' }}>
                  Security staff and Estate Manager have been alerted to verify flat {violationForm.flatNumber}.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmitViolation} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                    Violating Flat Number *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. A-402, B-107, C-801"
                    value={violationForm.flatNumber}
                    onChange={(e) => setViolationForm({ ...violationForm, flatNumber: e.target.value })}
                    style={{
                      width: '100%',
                      boxSizing: 'border-box',
                      padding: '10px 12px',
                      border: '1px solid #cbd5e1',
                      borderRadius: '8px',
                      fontSize: '0.88rem'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                    Type of Violation *
                  </label>
                  <select
                    value={violationForm.ruleType}
                    onChange={(e) => setViolationForm({ ...violationForm, ruleType: e.target.value })}
                    style={{
                      width: '100%',
                      boxSizing: 'border-box',
                      padding: '10px 12px',
                      border: '1px solid #cbd5e1',
                      borderRadius: '8px',
                      fontSize: '0.88rem',
                      background: '#ffffff'
                    }}
                  >
                    <option value="Unauthorized / Wrong Parking (Fine ₹500/day)">Unauthorized / Wrong Parking (Fine ₹500/day)</option>
                    <option value="Parking in Another Resident Slot Without Prior Permission">Parking in Another Resident Slot Without Prior Permission</option>
                    <option value="Lift Area or A-Building Entrance Parking Obstruction">Lift Area or A-Building Entrance Parking Obstruction</option>
                    <option value="Main Gate Parking Obstruction">Main Gate Parking Obstruction</option>
                    <option value="Tap Water / Flush Water Wastage (Tanker Cost Penalty)">Tap Water / Flush Water Wastage (Tanker Cost Penalty)</option>
                    <option value="Playing Football / Running Activities in Corridor or Lobby (CCTV Logged)">Playing Football / Running Activities in Corridor or Lobby (CCTV Logged)</option>
                    <option value="Swimming Pool Rule Violation (No Cap/Costume, Outside Slot, Friends/Bachelors)">Swimming Pool Rule Violation (No Cap/Costume, Outside Slot, Friends/Bachelors)</option>
                    <option value="Table Tennis Infraction (AC Turn-on, Queue Overstay &gt; 30 mins, Sitting on Table)">Table Tennis Infraction (AC Turn-on, Queue Overstay &gt; 30 mins, Sitting on Table)</option>
                    <option value="Smoking in Common Area / Lift / Corridor">Smoking in Common Area / Lift / Corridor</option>
                    <option value="Clubhouse Cooking / Alcohol / Post-10 PM Loud Music">Clubhouse Cooking / Alcohol / Post-10 PM Loud Music</option>
                    <option value="Footwear Not Removed / Cluttered at Entrance">Footwear Not Removed / Cluttered at Entrance</option>
                    <option value="Drilling / Renovation Outside Permitted Timings">Drilling / Renovation Outside Permitted Timings</option>
                    <option value="Off-Leash Pet / Pet Waste Not Cleaned">Off-Leash Pet / Pet Waste Not Cleaned</option>
                    <option value="Other Bylaw Infraction">Other Bylaw Infraction</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                    Details & Location *
                  </label>
                  <textarea
                    rows={3}
                    required
                    placeholder="Provide brief details (e.g. Car parked in A-304 slot without permission, or smoking in Wing A 4th floor lobby)..."
                    value={violationForm.details}
                    onChange={(e) => setViolationForm({ ...violationForm, details: e.target.value })}
                    style={{
                      width: '100%',
                      boxSizing: 'border-box',
                      padding: '10px 12px',
                      border: '1px solid #cbd5e1',
                      borderRadius: '8px',
                      fontSize: '0.88rem',
                      resize: 'vertical'
                    }}
                  />
                </div>

                <div style={{
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  borderRadius: '8px',
                  padding: '10px 12px',
                  fontSize: '0.76rem',
                  color: '#991b1b'
                }}>
                  🚨 <b>Reminder:</b> Per official society notice, parking violations attract a <b>₹500 per day fine</b> added directly to maintenance. Photo/video evidence shared in society group is accepted.
                </div>

                <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
                  <button
                    type="button"
                    onClick={() => setIsViolationModalOpen(false)}
                    style={{
                      flex: 1,
                      padding: '10px',
                      border: '1px solid #cbd5e1',
                      background: '#ffffff',
                      color: '#475569',
                      borderRadius: '8px',
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    style={{
                      flex: 1,
                      padding: '10px',
                      border: 'none',
                      background: '#dc2626',
                      color: '#ffffff',
                      borderRadius: '8px',
                      fontSize: '0.85rem',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    Submit Report
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
