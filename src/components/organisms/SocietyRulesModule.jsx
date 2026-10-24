import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { SOCIETY_INFO } from '../../data/societyConfig.js';
import {
  RULE_CATEGORIES,
  RULE_SEVERITIES,
  INITIAL_SOCIETY_RULES,
  OFFICIAL_POSTERS,
  QUICK_CONTACTS
} from '../../data/societyRulesData.js';
import './SocietyRulesModule.css';


export default function SocietyRulesModule({ isAdmin = false, userRole = 'RESIDENT' }) {
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [severityFilter, setSeverityFilter] = useState('ALL'); // 'ALL' | 'STRICT' | 'FINES'
  const [copiedRuleId, setCopiedRuleId] = useState(null);
  const [copiedSummary, setCopiedSummary] = useState(false);
  const [isViolationModalOpen, setIsViolationModalOpen] = useState(false);
  const [selectedPoster, setSelectedPoster] = useState(null); // Lightbox modal for posters

  // Lock body scroll when any modal is open
  useEffect(() => {
    if (selectedPoster || isViolationModalOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [selectedPoster, isViolationModalOpen]);

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

  // Helper to print a specific poster
  const handlePrintPoster = useCallback((poster) => {
    if (!poster) return;
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>${poster.title} - Majestique Euriska</title>
            <style>
              @page { size: auto; margin: 15mm; }
              body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; text-align: center; background: #fff; }
              .header { margin-bottom: 16px; }
              .badge { display: inline-block; background: #991b1b; color: white; padding: 4px 10px; border-radius: 4px; font-weight: bold; font-size: 12px; margin-bottom: 6px; }
              h1 { font-size: 18px; margin: 0 0 6px 0; color: #0f172a; }
              p { font-size: 13px; color: #475569; margin: 0; }
              img { max-width: 100%; max-height: 82vh; object-fit: contain; margin-top: 12px; border-radius: 6px; }
            </style>
          </head>
          <body>
            <div class="header">
              <span class="badge">${poster.badge || 'OFFICIAL CIRCULAR'}</span>
              <h1>${poster.title}</h1>
              <p>${poster.summary || ''}</p>
            </div>
            <img src="${poster.image}" alt="${poster.title}" onload="window.print();" />
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  }, []);

  // Helper to download poster image
  const handleDownloadPoster = useCallback((poster) => {
    if (!poster) return;
    const link = document.createElement('a');
    link.href = poster.image;
    link.download = `${poster.id || 'society_poster'}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, []);

  return (
    <div className="society-rules-container society-rules-module-s1">
      {/* ──────────────────────────────────────────────────────────────────────
          1. Legal Header Banner
      ────────────────────────────────────────────────────────────────────── */}
      <div className="society-rules-module-s2">
        {/* Decorative background watermark */}
        <div className="society-rules-module-s3">
          ⚖️
        </div>

        <div className="society-rules-module-s4">
          <div className="society-rules-module-s5">
            <div className="society-rules-module-s6">
              <span>📢 Official Society Circulars</span>
              <span>•</span>
              <span className="society-rules-module-s7">Applicable to A, B & C Buildings</span>
              <span>•</span>
              <span className="society-rules-module-s8">{SOCIETY_INFO.regNoShort}</span>
            </div>

            <h1 className="society-rules-module-s9">
              Society Rules, Bylaws & Community Guidelines
            </h1>

            <p className="society-rules-module-s10">
              Official regulations enforced for all residents, tenants, guests, visitors, and staff. Strictly ratified by the Majestique Euriska Society Management Committee.
            </p>

            <div className="society-rules-module-s11">
              <span className="society-rules-module-s12">
                📍 {SOCIETY_INFO.addressShort}
              </span>
              <span>•</span>
              <span className="society-rules-module-s12">
                ✉️ {SOCIETY_INFO.email}
              </span>
              <span>•</span>
              <span className="society-rules-module-s12">
                🛡️ Enforced by Managing Committee & Security Control
              </span>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="society-rules-module-s13">
            <button
              type="button"
              id="report-violation-btn"
              onClick={() => setIsViolationModalOpen(true)}
              className="society-rules-module-s14"
            >
              <span>🚨</span>
              <span>Report Rule Violation</span>
            </button>

            <div className="society-rules-module-s15">
              <button
                type="button"
                id="copy-rules-summary-btn"
                onClick={handleCopyAllSummary}
                className="society-rules-module-s16"
              >
                <span>{copiedSummary ? '✓ Copied' : '📋 Copy Summary'}</span>
              </button>

              <button
                type="button"
                id="print-rules-btn"
                onClick={() => window.print()}
                className="society-rules-module-s17"
                title="Print or Save as PDF"
              >
                <span>🖨️ Print</span>
              </button>

              <button
                type="button"
                id="view-visuals-btn"
                onClick={() => window.dispatchEvent(new CustomEvent('changeTab', { detail: 'water_management' }))}
                className="society-rules-module-s18"
                title="View Society CAD Plans, Infrastructure & Visuals"
              >
                <span>📐 Visualization Work →</span>
              </button>

              <button
                type="button"
                id="view-work-distribution-btn"
                onClick={() => window.dispatchEvent(new CustomEvent('changeTab', { detail: 'work_distribution' }))}
                className="society-rules-module-s18"
                title="View Managing Committee Work Distribution & Portfolios"
              >
                <span>👥 Work Distribution →</span>
              </button>
            </div>
          </div>
        </div>

        {/* Highlight Banner Strips (Real Data from Uploaded Posters) */}
        <div className="society-rules-module-s19">
          <div className="society-rules-module-s20">
            <div className="society-rules-module-s21">🚗 Parking Violation Fine</div>
            <div className="society-rules-module-s22">₹500 PER DAY</div>
            <div className="society-rules-module-s23">Debited directly without warning</div>
          </div>

          <div className="society-rules-module-s20">
            <div className="society-rules-module-s21">🚰 Water Wastage & Overflow</div>
            <div className="society-rules-module-s22">TANKER COST</div>
            <div className="society-rules-module-s23">100% added to flat maintenance</div>
          </div>

          <div className="society-rules-module-s20">
            <div className="society-rules-module-s21">⚽ Corridor / Lobby Activity</div>
            <div className="society-rules-module-s22">FINE + REPAIR COST</div>
            <div className="society-rules-module-s23">CCTV monitored / 1st warning active</div>
          </div>

          <div className="society-rules-module-s20">
            <div className="society-rules-module-s21">🏛️ Clubhouse Charges</div>
            <div className="society-rules-module-s22">₹1,000 + ₹2,000 Dep.</div>
            <div className="society-rules-module-s23">Up to 5 hrs | Double for full day</div>
          </div>

          <div className="society-rules-module-s20">
            <div className="society-rules-module-s21">🎵 Music Cut-off Time</div>
            <div className="society-rules-module-s22">10:00 PM Sharp</div>
            <div className="society-rules-module-s23">Premises allowed till 11:30 PM</div>
          </div>

          <div className="society-rules-module-s20">
            <div className="society-rules-module-s21">🚭 Strict No-Smoking</div>
            <div className="society-rules-module-s22">All Common Areas</div>
            <div className="society-rules-module-s23">Lifts, corridors, gardens, parking</div>
          </div>

          <div className="society-rules-module-s20">
            <div className="society-rules-module-s21">🏊‍♂️ Swimming Pool</div>
            <div className="society-rules-module-s22">CLOSED THURSDAY</div>
            <div className="society-rules-module-s23">Compulsory cap & costume | No bachelors/friends</div>
          </div>

          <div className="society-rules-module-s20">
            <div className="society-rules-module-s21">🏓 Table Tennis</div>
            <div className="society-rules-module-s22">30 MIN LIMIT</div>
            <div className="society-rules-module-s23">Order 1/0049 | Register mandatory | No AC</div>
          </div>
        </div>
      </div>

      {/* ──────────────────────────────────────────────────────────────────────
          2. Official Circular Posters Gallery (From Uploaded Photos)
      ────────────────────────────────────────────────────────────────────── */}
      <div className="society-rules-module-s24">
        <div className="society-rules-module-s25">
          <div>
            <div className="society-rules-module-s26">
              <span>📷 Active Physical Notices</span>
            </div>
            <h2 className="society-rules-module-s27">
              Official Society Circulars & Notice Posters
            </h2>
            <p className="society-rules-module-s28">
              High-resolution digital archive of notices currently posted on society noticeboards, gates, and clubhouse entrance. Click any poster to view full-size.
            </p>
          </div>

          <div className="society-rules-module-s29">
            ✓ {OFFICIAL_POSTERS.length} Official Posters Archived
          </div>
        </div>

        <div className="society-rules-module-s30">
          {OFFICIAL_POSTERS.map((poster) => (
            <div
              key={poster.id}
              onClick={() => setSelectedPoster(poster)}
              className="society-rules-module-s31"
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.boxShadow = '0 10px 24px rgba(0,0,0,0.08)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <div className="society-rules-module-s32">
                <img
                  src={poster.image}
                  alt={poster.title}
                  className="society-rules-module-s33"
                />
                <span className="society-rules-module-s34">
                  🔍 Tap to Zoom
                </span>
                <span className="society-rules-module-s35">
                  {poster.badge}
                </span>
              </div>

              <div className="society-rules-module-s36">
                <div className="society-rules-module-s37">
                  {poster.title}
                </div>
                {poster.marathiTitle && (
                  <div className="society-rules-module-s38">
                    {poster.marathiTitle}
                  </div>
                )}
                <p className="society-rules-module-s39">
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
      <div className="society-rules-module-s40">
        <div className="society-rules-module-s41">
          <div>
            <div className="society-rules-module-s42">
              <span>🏛️ Official Circular (Dated 10-08-2026)</span>
            </div>
            <h2 className="society-rules-module-s43">
              Clubhouse & Lawn Booking Calculator & Guidelines
            </h2>
            <p className="society-rules-module-s44">
              First-come-first-serve basis with 100% advance payment to the respective Building Committee Member.
            </p>
          </div>

          <div className="society-rules-module-s45">
            <span className="society-rules-module-s46">Select Duration:</span>
            <button
              type="button"
              onClick={() => setBookingHours('5')}
              className={`society-rules-module-s47 ${(bookingHours === '5' ? 'society-rules-module-cond-1-true' : 'society-rules-module-cond-2-false')}`}
            >
              Up to 5 Hours
            </button>
            <button
              type="button"
              onClick={() => setBookingHours('full')}
              className={`society-rules-module-s47 ${(bookingHours === 'full' ? 'society-rules-module-cond-3-true' : 'society-rules-module-cond-4-false')}`}
            >
              Full Day (5+ Hours)
            </button>
          </div>
        </div>

        {/* Pricing Cards Strip */}
        <div className="society-rules-module-s48">
          <div className="society-rules-module-s49">
            <div className="society-rules-module-s50">Non-Refundable Utilization Fee</div>
            <div className="society-rules-module-s51">
              ₹{bookingHours === '5' ? '1,000' : '2,000'}
            </div>
            <div className="society-rules-module-s52">
              {bookingHours === '5' ? 'Standard 5-hr charge' : 'Full 1-day utilization rate'}
            </div>
          </div>

          <div className="society-rules-module-s49">
            <div className="society-rules-module-s50">Refundable Security Deposit</div>
            <div className="society-rules-module-s53">
              ₹{bookingHours === '5' ? '2,000' : '4,000'}
            </div>
            <div className="society-rules-module-s52">
              Refunded after AS-IS clean inspection
            </div>
          </div>

          <div className="society-rules-module-s49">
            <div className="society-rules-module-s50">Total Advance Payable</div>
            <div className="society-rules-module-s54">
              ₹{bookingHours === '5' ? '3,000' : '6,000'}
            </div>
            <div className="society-rules-module-s52">
              100% advance to Building Committee Member
            </div>
          </div>
        </div>

        {/* Key Restrictions Grid directly from Circular Dt. 10-08-2026 (All 14 Clauses a to n) */}
        <div className="society-rules-module-s55">
          <div className="society-rules-module-s56">
            <div>
              <span className="society-rules-module-s57">
                📋 Mandatory Conditions from Guidelines Dt. 10-08-2026 (All Clauses a to n):
              </span>
              <div className="society-rules-module-s58">
                Official Guidelines ratified for Buildings A, B &amp; C • All 14 clauses must be adhered to strictly by residents, owners &amp; tenants
              </div>
            </div>
            <button
              type="button"
              id="view-circular-poster-btn"
              onClick={() => setSelectedPoster(OFFICIAL_POSTERS.find(p => p.id === 'poster-clubhouse-guidelines'))}
              className="society-rules-module-s59"
            >
              📄 View Signed Circular Poster 🔍
            </button>
          </div>

          <div className="society-rules-module-s60">
            {/* Clause a */}
            <div className="society-rules-module-s61">
              <span className="society-rules-module-s62">a</span>
              <div><b>Utilization Fee (≤ 5 hrs):</b> ₹1,000/- (non-refundable) + ₹2,000/- (refundable deposit) for celebrations/functions up to 5 hours.</div>
            </div>
            {/* Clause b */}
            <div className="society-rules-module-s61">
              <span className="society-rules-module-s62">b</span>
              <div><b>Charges for &gt; 5 hrs / Full Day:</b> Double charges apply: ₹2,000/- (non-refundable) + ₹4,000/- (refundable deposit) up to full 1-day use.</div>
            </div>
            {/* Clause c */}
            <div className="society-rules-module-s61">
              <span className="society-rules-module-s62">c</span>
              <div><b>First-Come, First-Served:</b> 100% of above amount must be paid in advance to respective Building Committee member(s).</div>
            </div>
            {/* Clause d */}
            <div className="society-rules-module-s61">
              <span className="society-rules-module-s62">d</span>
              <div><b>Committee Coordination:</b> Building committee must inform Common Committee to avoid any booking clashes.</div>
            </div>
            {/* Clause e */}
            <div className="society-rules-module-s61">
              <span className="society-rules-module-s63">e</span>
              <div><b>AS-IS Clean Handover &amp; Damages:</b> Premises must be cleaned and given back in AS-IS condition. Damages or unclean area charged extra from deposit or paid by resident.</div>
            </div>
            {/* Clause f */}
            <div className="society-rules-module-s61">
              <span className="society-rules-module-s63">f</span>
              <div><b>No Society Chairs for Personal Use:</b> Society chairs will NOT be given for personal home/flat use; must remain available for clubhouse events.</div>
            </div>
            {/* Clause g */}
            <div className="society-rules-module-s61">
              <span className="society-rules-module-s63">g</span>
              <div><b>No Eating on Lawn:</b> Lawn area CANNOT be used for eating during any functions or events to preserve turf.</div>
            </div>
            {/* Clause h */}
            <div className="society-rules-module-s61">
              <span className="society-rules-module-s63">h</span>
              <div><b>Strict Cooking Prohibition:</b> Cooking is NOT allowed in any portion of clubhouse/lawn. Only normal heating/microwave permitted.</div>
            </div>
            {/* Clause i */}
            <div className="society-rules-module-s61">
              <span className="society-rules-module-s64">i</span>
              <div><b>Premises Timings:</b> Clubhouse and lawn area allowed to be used till <b>11:30 PM</b> maximum.</div>
            </div>
            {/* Clause j */}
            <div className="society-rules-module-s61">
              <span className="society-rules-module-s63">j</span>
              <div><b>Music Cut-Off at 10:00 PM:</b> Music MUST be stopped strictly by <b>10:00 PM sharp</b> as per Government noise pollution guidelines.</div>
            </div>
            {/* Clause k */}
            <div className="society-rules-module-s61">
              <span className="society-rules-module-s63">k</span>
              <div><b>No Alcohol &amp; Smoking:</b> Consumption of alcoholic beverages and smoking is <b>strictly prohibited</b> during any functions or anytime.</div>
            </div>
            {/* Clause l */}
            <div className="society-rules-module-s61">
              <span className="society-rules-module-s65">l</span>
              <div><b>No Festival Clashes:</b> Clubhouse/lawn area will NOT be available for private booking during common society festivals/celebrations.</div>
            </div>
            {/* Clause m */}
            <div className="society-rules-module-s61">
              <span className="society-rules-module-s63">m</span>
              <div><b>No Stage, DJ, Extra Lights or Generators:</b> No stage setup, DJ, or extra lights. External private generators are strictly prohibited.</div>
            </div>
            {/* Clause n */}
            <div className="society-rules-module-s61">
              <span className="society-rules-module-s62">n</span>
              <div><b>National Holidays (Aug 15 &amp; Jan 26):</b> No private booking rules in lawn area on Independence &amp; Republic Day; celebrations decided by Common Committee for all residents.</div>
            </div>
          </div>
        </div>
      </div>

      {/* ──────────────────────────────────────────────────────────────────────
          4. Filter Controls & Search
      ────────────────────────────────────────────────────────────────────── */}
      <div className="society-rules-module-s66">
        {/* Search Row */}
        <div className="society-rules-module-s67">
          <div className="society-rules-module-s68">
            <span className="society-rules-module-s69">
              🔍
            </span>
            <input
              type="text"
              id="rules-search-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search rules (e.g. parking 500, smoking, clubhouse charges, footwear, drilling)..."
              className="society-rules-module-s70"
              onFocus={(e) => { e.target.style.borderColor = '#059669'; e.target.style.background = '#ffffff'; }}
              onBlur={(e) => { e.target.style.borderColor = '#cbd5e1'; e.target.style.background = '#f8fafc'; }}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="society-rules-module-s71"
                title="Clear search"
              >
                ✕
              </button>
            )}
          </div>

          {/* Severity Quick Chips */}
          <div className="society-rules-module-s72">
            <span className="society-rules-module-s73">Filter:</span>
            {[
              { id: 'ALL', label: 'All Clauses' },
              { id: 'STRICT', label: '🚨 Strict Only' },
              { id: 'FINES', label: '⚠️ Fines Applicable' }
            ].map(chip => (
              <button
                key={chip.id}
                type="button"
                onClick={() => setSeverityFilter(chip.id)}
                className={`society-rules-module-s74 ${(severityFilter === chip.id ? 'society-rules-module-cond-5-true' : 'society-rules-module-cond-6-false')}`}
              >
                {chip.label}
              </button>
            ))}
          </div>
        </div>

        {/* Category Filter Pills */}
        <div className="society-rules-module-s75">
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
                className={`society-rules-module-s76 ${(isSelected ? 'society-rules-module-cond-7-true' : 'society-rules-module-cond-8-false')}`}
              >
                <span>{cat.icon}</span>
                <span>{cat.label}</span>
                <span className={`society-rules-module-s77 ${(isSelected ? 'society-rules-module-cond-9-true' : 'society-rules-module-cond-10-false')}`}>
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
      <div className="society-rules-module-s78">
        <div className="society-rules-module-s79">
          Showing <span className="society-rules-module-s80">{filteredRules.length}</span> official bylaws
          {selectedCategory !== 'ALL' && ` in ${RULE_CATEGORIES.find(c => c.id === selectedCategory)?.label}`}
          {searchQuery && ` matching "${searchQuery}"`}
        </div>

        {filteredRules.length > 0 && (
          <div className="society-rules-module-s81">
            Click <b>📋 Copy</b> on any card to share in WhatsApp resident groups
          </div>
        )}
      </div>

      {filteredRules.length === 0 ? (
        <div className="society-rules-module-s82">
          <div className="society-rules-module-s83">🔍</div>
          <h3 className="society-rules-module-s84">No matching rules found</h3>
          <p className="society-rules-module-s85">
            Try searching for terms like "parking", "smoking", "clubhouse", "footwear", or clear filters.
          </p>
          <button
            type="button"
            onClick={() => { setSelectedCategory('ALL'); setSearchQuery(''); setSeverityFilter('ALL'); }}
            className="society-rules-module-s86"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="society-rules-module-s87">
          {filteredRules.map((rule) => {
            const severityMeta = RULE_SEVERITIES[rule.severity] || RULE_SEVERITIES.STANDARD;
            const isCopied = copiedRuleId === rule.id;

            return (
              <div
                key={rule.id}
                className="rule-card society-rules-module-s88"
              >
                <div>
                  {/* Card Header Pills */}
                  <div className="society-rules-module-s89">
                    <div className="society-rules-module-s72">
                      <span className="society-rules-module-s90">
                        {rule.article}
                      </span>
                      <span className="society-rules-module-s91">
                        {rule.categoryIcon} {rule.categoryLabel}
                      </span>
                    </div>

                    <span className="society-rules-module-s92" style={{ background: severityMeta.bg, color: severityMeta.color, border: `1px solid ${severityMeta.border}` }}>
                      <span>●</span>
                      <span>{severityMeta.label}</span>
                    </span>
                  </div>

                  {/* Title */}
                  <h3 className="society-rules-module-s93">
                    {rule.title}
                  </h3>

                  {/* Timings Strip */}
                  {rule.timings && (
                    <div className="society-rules-module-s94">
                      <div className="society-rules-module-s95">
                        <span>⏱️ Timings / Conditions:</span>
                        <span>{rule.timings}</span>
                      </div>
                      {rule.daysApplicable && (
                        <div className="society-rules-module-s96">
                          📅 {rule.daysApplicable}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Summary */}
                  <p className="society-rules-module-s97">
                    {rule.summary}
                  </p>

                  {/* Bulleted Guidelines */}
                  <div className="society-rules-module-s98">
                    <div className="society-rules-module-s99">
                      Key Guidelines & Protocols:
                    </div>
                    <ul className="society-rules-module-s100">
                      {rule.guidelines.map((item, idx) => (
                        <li key={idx} className="society-rules-module-s101">
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Penalty Box */}
                  {rule.penalty && (
                    <div className="society-rules-module-s102">
                      <strong className="society-rules-module-s103">
                        <span>⚠️ Non-Compliance Penalty:</span>
                      </strong>
                      <span>{rule.penalty}</span>
                    </div>
                  )}
                </div>

                {/* Card Footer */}
                <div className="society-rules-module-s104">
                  <div className="society-rules-module-s105">
                    <span>🛡️</span>
                    <span title="Enforcing Authority">Authority: <b>{rule.authority}</b></span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleCopyRule(rule)}
                    className={`society-rules-module-s106 ${(isCopied ? 'society-rules-module-cond-11-true' : 'society-rules-module-cond-12-false')}`}
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
      <div className="society-rules-module-s24">
        <div className="society-rules-module-s25">
          <div>
            <h2 className="society-rules-module-s107">
              Enforcement Desk & Society Contacts
            </h2>
            <p className="society-rules-module-s28">
              For immediate rule clarifications, gate passes, or reporting ongoing violations.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsViolationModalOpen(true)}
            className="society-rules-module-s108"
          >
            Report an Incident
          </button>
        </div>

        <div className="society-rules-module-s109">
          {QUICK_CONTACTS.map((contact, idx) => (
            <div
              key={idx}
              className="society-rules-module-s110"
            >
              <div className="society-rules-module-s111">
                <span className="society-rules-module-s112">{contact.icon}</span>
                <span className="society-rules-module-s113">
                  {contact.role}
                </span>
              </div>
              <div className="society-rules-module-s114">
                {contact.name}
              </div>
              <div className="society-rules-module-s115">
                <a href={contact.action} className="society-rules-module-s116">
                  {contact.contact}
                </a>
              </div>
              <div className="society-rules-module-s117">
                🕒 {contact.available}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ──────────────────────────────────────────────────────────────────────
          7. Poster Lightbox Modal (Portaled to document.body for instant centering)
      ────────────────────────────────────────────────────────────────────── */}
      {selectedPoster && typeof document !== 'undefined' && createPortal(
        <div
          onClick={() => setSelectedPoster(null)}
          className="society-rules-module-s118"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="society-rules-module-s119"
          >
            <div className="society-rules-module-s120">
              <div>
                <span className="society-rules-module-s121">
                  {selectedPoster.badge}
                </span>
                <h3 className="society-rules-module-s122">
                  {selectedPoster.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedPoster(null)}
                aria-label="Close"
                className="society-rules-module-s123"
              >
                ✕
              </button>
            </div>

            <div className="society-rules-module-s124">
              <img
                src={selectedPoster.image}
                alt={selectedPoster.title}
                className="society-rules-module-s125"
              />
            </div>

            <div className="society-rules-module-s126">
              <div className="society-rules-module-s127">
                {selectedPoster.summary}
              </div>
              <div className="society-rules-module-s128">
                <button
                  type="button"
                  onClick={() => handlePrintPoster(selectedPoster)}
                  className="society-rules-module-s129"
                >
                  <span>🖨️</span>
                  <span>Print Poster</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleDownloadPoster(selectedPoster)}
                  className="society-rules-module-s129"
                >
                  <span>⬇️</span>
                  <span>Download</span>
                </button>
                <a
                  href={selectedPoster.image}
                  target="_blank"
                  rel="noreferrer"
                  className="society-rules-module-s130"
                >
                  <span>Open Full Size</span>
                  <span>↗</span>
                </a>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ──────────────────────────────────────────────────────────────────────
          8. Report Violation Modal (Portaled to document.body for instant centering)
      ────────────────────────────────────────────────────────────────────── */}
      {isViolationModalOpen && typeof document !== 'undefined' && createPortal(
        <div className="society-rules-module-s131">
          <div className="society-rules-module-s132">
            <div className="society-rules-module-s133">
              <div>
                <h3 className="society-rules-module-s134">
                  🚨 Report Society Rule Violation
                </h3>
                <p className="society-rules-module-s135">
                  Reports are dispatched immediately to the Estate Manager & Security Gate.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsViolationModalOpen(false)}
                aria-label="Close"
                className="society-rules-module-s136"
              >
                ✕
              </button>
            </div>

            {violationForm.submitted ? (
              <div className="society-rules-module-s137">
                <div className="society-rules-module-s138">✅</div>
                <h4 className="society-rules-module-s139">Report Logged Successfully</h4>
                <p className="society-rules-module-s140">
                  Security staff and Estate Manager have been alerted to verify flat {violationForm.flatNumber}.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmitViolation} className="society-rules-module-s141">
                <div>
                  <label className="society-rules-module-s142">
                    Violating Flat Number *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. A-402, B-107, C-801"
                    value={violationForm.flatNumber}
                    onChange={(e) => setViolationForm({ ...violationForm, flatNumber: e.target.value })}
                    className="society-rules-module-s143"
                  />
                </div>

                <div>
                  <label className="society-rules-module-s142">
                    Type of Violation *
                  </label>
                  <select
                    value={violationForm.ruleType}
                    onChange={(e) => setViolationForm({ ...violationForm, ruleType: e.target.value })}
                    className="society-rules-module-s144"
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
                  <label className="society-rules-module-s142">
                    Details & Location *
                  </label>
                  <textarea
                    rows={3}
                    required
                    placeholder="Provide brief details (e.g. Car parked in A-304 slot without permission, or smoking in Wing A 4th floor lobby)..."
                    value={violationForm.details}
                    onChange={(e) => setViolationForm({ ...violationForm, details: e.target.value })}
                    className="society-rules-module-s145"
                  />
                </div>

                <div className="society-rules-module-s146">
                  🚨 <b>Reminder:</b> Per official society notice, parking violations attract a <b>₹500 per day fine</b> added directly to maintenance. Photo/video evidence shared in society group is accepted.
                </div>

                <div className="society-rules-module-s147">
                  <button
                    type="button"
                    onClick={() => setIsViolationModalOpen(false)}
                    className="society-rules-module-s148"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="society-rules-module-s149"
                  >
                    Submit Report
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
