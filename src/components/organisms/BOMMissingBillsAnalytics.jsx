import { useState, useMemo } from 'react';
import {
  BOM_FORENSIC_SUMMARY,
  VENDOR_FORENSIC_MATRIX,
  MISSING_BILLS_RECONCILIATION_LIST,
  ENRICHED_BOM_TRANSACTIONS,
  BOM_MONTHLY_DRAIN_TIMELINE
} from '../../data/bomMissingBillsAnalyticsData.js';
import { fmtINR } from '../../data/builderRecoData.js';

export default function BOMMissingBillsAnalytics({ _isAdmin = false, onNavigateTab }) {
  const [activeFilter, setActiveFilter] = useState('all'); // 'all' | 'missing' | 'wingB' | 'unvouched' | 'society'
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [activeViewMode, setActiveViewMode] = useState('recovery'); // 'recovery' | 'summary' | 'vendors' | 'annexure4' | 'register'

  // Interactive Recovery Calculator State
  const [calcItems, setCalcItems] = useState({
    baseCertified: true, // ₹9,00,790 (locked)
    schindlerLift: true, // +₹1,23,736
    otherMissingBills: true, // +₹2,85,475
    itcRefund: true, // +₹1,39,070
    bankShortfall: false, // +₹5,09,271.17
    supervisionDebit: false, // +₹2,70,000
    wingBSubsidy: false, // +₹7,27,249
    cashWithdrawals: false // +₹47,145
  });
  const [interestMode, setInterestMode] = useState('ca8'); // 'none' | 'ca8' | 'rera'

  // Dynamic Expected Recovery Calculation
  const dynamicRecovery = useMemo(() => {
    let principal = 900790; // Base Certified Principal
    if (calcItems.schindlerLift) principal += 123736;
    if (calcItems.otherMissingBills) principal += 285475;
    if (calcItems.itcRefund) principal += 139070;
    if (calcItems.bankShortfall) principal += 509271.17;
    if (calcItems.supervisionDebit) principal += 270000;
    if (calcItems.wingBSubsidy) principal += 727249;
    if (calcItems.cashWithdrawals) principal += 47145;

    let intRate = 0;
    let intLabel = '0% (Principal Only)';
    if (interestMode === 'ca8') {
      intRate = 0.08 * (51 / 12); // 34%
      intLabel = '8.0% p.a. CA Recommended (51 Months = 34%)';
    } else if (interestMode === 'rera') {
      intRate = 0.1075 * (51 / 12); // 45.69%
      intLabel = '10.75% p.a. MahaRERA Statutory Rate (51 Months = 45.7%)';
    }

    const interest = principal * intRate;
    const total = principal + interest;

    return {
      principal,
      intRate,
      intLabel,
      interest,
      total,
      gainOverBase: total - 1207058
    };
  }, [calcItems, interestMode]);

  // Summary figures
  const s = BOM_FORENSIC_SUMMARY;

  // Filtered Enriched Transactions
  const filteredTransactions = useMemo(() => {
    return ENRICHED_BOM_TRANSACTIONS.filter(t => {
      // Status filter
      if (activeFilter === 'missing') {
        if (!t.forensicCat.includes('missing') && !t.forensicCat.includes('recurring')) return false;
      } else if (activeFilter === 'wingB') {
        if (t.forensicCat !== 'wing_b_drain' && t.wing !== 'B') return false;
      } else if (activeFilter === 'unvouched') {
        if (t.forensicCat !== 'supervision_unvouched' && t.forensicCat !== 'cash_withdrawal' && t.forensicCat !== 'developer_tax_transfer') return false;
      } else if (activeFilter === 'society') {
        if (t.forensicCat !== 'society_transfer') return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const text = [
          t.particulars,
          t.remark,
          t.vchNo,
          t.date,
          t.wing,
          t.forensicTag,
          t.forensicNote
        ].join(' ').toLowerCase();
        if (!text.includes(q)) return false;
      }

      return true;
    });
  }, [activeFilter, searchQuery]);

  // Export filtered data as CSV
  const handleExportCSV = () => {
    const headers = ['ID', 'Date', 'Voucher No', 'Voucher Type', 'Particulars / Payee', 'Wing', 'Debit (Inflow)', 'Credit (Payment)', 'Forensic Category', 'Forensic Audit Finding'];
    const rows = filteredTransactions.map(t => [
      t.id,
      t.date,
      t.vchNo || '—',
      t.vchType || '—',
      `"${(t.particulars || '').replace(/"/g, '""')}"`,
      t.wing,
      t.debit || 0,
      t.credit || 0,
      `"${t.forensicTag}"`,
      `"${(t.forensicNote || '').replace(/"/g, '""')}"`
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `BOM_Passbook_Forensic_Cross_Audit_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, color: '#1f2937' }}>

      {/* ── 1. LUXURY EXECUTIVE HEADER ─────────────────────────────────────── */}
      <div style={{
        background: 'linear-gradient(135deg, #062b24 0%, #0e3d34 50%, #175447 100%)',
        borderRadius: 18,
        padding: '24px 28px',
        color: '#ffffff',
        border: '1px solid rgba(196, 155, 79, 0.35)',
        boxShadow: '0 10px 30px rgba(6, 43, 36, 0.22)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{
          position: 'absolute',
          top: -40,
          right: -40,
          width: 220,
          height: 220,
          background: 'radial-gradient(circle, rgba(196, 155, 79, 0.2) 0%, transparent 70%)',
          borderRadius: '50%',
          pointerEvents: 'none'
        }} />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16, position: 'relative', zIndex: 1 }}>
          <div style={{ maxWidth: 760 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
              <span style={{
                background: 'rgba(196, 155, 79, 0.25)',
                color: '#fef3c7',
                border: '1px solid rgba(196, 155, 79, 0.5)',
                fontSize: '0.68rem',
                fontWeight: 800,
                padding: '3px 9px',
                borderRadius: 20,
                letterSpacing: '0.06em',
                textTransform: 'uppercase'
              }}>
                FORENSIC CROSS-AUDIT & RECONCILIATION
              </span>
              <span style={{
                background: 'rgba(239, 68, 68, 0.2)',
                color: '#fca5a5',
                border: '1px solid rgba(239, 68, 68, 0.4)',
                fontSize: '0.68rem',
                fontWeight: 700,
                padding: '3px 9px',
                borderRadius: 20
              }}>
                BOM A/c 60305942224 vs CA Hardik Mehta Annexure 4
              </span>
              <span style={{
                background: 'rgba(16, 185, 129, 0.2)',
                color: '#a7f3d0',
                border: '1px solid rgba(16, 185, 129, 0.4)',
                fontSize: '0.68rem',
                fontWeight: 700,
                padding: '3px 9px',
                borderRadius: 20
              }}>
                135 Bank Records Verified
              </span>
            </div>

            <h1 style={{
              margin: '0 0 8px 0',
              fontFamily: "'Fraunces', Georgia, serif",
              fontSize: '1.65rem',
              fontWeight: 700,
              lineHeight: 1.25,
              letterSpacing: '-0.02em',
              color: '#ffffff'
            }}>
              BOM Passbook Ledger vs CA Missing Invoices Analytics
            </h1>

            <p style={{
              margin: 0,
              fontSize: '0.86rem',
              color: 'rgba(255, 255, 255, 0.82)',
              lineHeight: 1.55,
              maxWidth: 720
            }}>
              Deep cross-reconciliation of all <strong>135 Bank of Maharashtra Passbook transactions (₹50.05L outflows)</strong> against 
              CA Hardik Mehta&apos;s 14-page audit report. Identifies <strong>₹4.09L in missing/unvouched invoices</strong>, 
              <strong> ₹15.31L in Wing B cross-subsidies</strong> drained from the common Phase II account, and 
              <strong> ₹9.32L in unvouched builder self-debits</strong>.
            </p>
          </div>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button
              onClick={() => setActiveViewMode('recovery')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 7,
                background: activeViewMode === 'recovery' ? '#ffffff' : '#c49b4f',
                color: '#062b24',
                border: 'none',
                padding: '9px 15px',
                borderRadius: 10,
                fontSize: '0.8rem',
                fontWeight: 800,
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(196, 155, 79, 0.35)'
              }}
            >
              🎯 Expected Recovery Calculator
            </button>
            <button
              onClick={handleExportCSV}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 7,
                background: 'rgba(255, 255, 255, 0.12)',
                color: '#ffffff',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                padding: '9px 15px',
                borderRadius: 10,
                fontSize: '0.8rem',
                fontWeight: 700,
                cursor: 'pointer',
                backdropFilter: 'blur(8px)',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.22)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.12)'; }}
            >
              📥 Export Forensic CSV
            </button>
            {onNavigateTab && (
              <button
                onClick={() => onNavigateTab('caReport')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 7,
                  background: 'rgba(255, 255, 255, 0.18)',
                  color: '#ffffff',
                  border: '1px solid rgba(255, 255, 255, 0.35)',
                  padding: '9px 15px',
                  borderRadius: 10,
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                📄 View CA Report
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── 2. EXECUTIVE FORENSIC KPI METRIC CARDS ──────────────────────────── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: 16
      }}>
        {/* KPI 1: CA Missing Invoices */}
        <div style={{
          background: '#ffffff',
          borderRadius: 14,
          padding: '16px 18px',
          border: '1px solid rgba(239, 68, 68, 0.25)',
          boxShadow: '0 3px 12px rgba(239, 68, 68, 0.06)',
          display: 'flex',
          flexDirection: 'column',
          gap: 6
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#dc2626', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              CA MISSING INVOICES
            </span>
            <span style={{ fontSize: '0.7rem', background: '#fee2e2', color: '#991b1b', padding: '2px 6px', borderRadius: 6, fontWeight: 700 }}>
              23 Items
            </span>
          </div>
          <div style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: '1.45rem', fontWeight: 700, color: '#991b1b' }}>
            {fmtINR(s.caTotalMissingBills)}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#6b7280', lineHeight: 1.4 }}>
            <strong>₹1.73L</strong> found only in Wing B + <strong>₹2.36L</strong> recurring estimates without bills (Annexure 4).
          </div>
        </div>

        {/* KPI 2: Wing B Passbook Leakage */}
        <div style={{
          background: '#ffffff',
          borderRadius: 14,
          padding: '16px 18px',
          border: '1px solid rgba(234, 88, 12, 0.25)',
          boxShadow: '0 3px 12px rgba(234, 88, 12, 0.06)',
          display: 'flex',
          flexDirection: 'column',
          gap: 6
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#ea580c', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              WING B OUTFLOW LEAKAGE
            </span>
            <span style={{ fontSize: '0.7rem', background: '#ffedd5', color: '#9a3412', padding: '2px 6px', borderRadius: 6, fontWeight: 700 }}>
              30.59% Share
            </span>
          </div>
          <div style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: '1.45rem', fontWeight: 700, color: '#c2410c' }}>
            {fmtINR(s.wingBOutflows)}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#6b7280', lineHeight: 1.4 }}>
            Paid out of common Phase II BOM account for Wing B electricity, security, pools, and gardening!
          </div>
        </div>

        {/* KPI 3: Unvouched Builder Self-Debits */}
        <div style={{
          background: '#ffffff',
          borderRadius: 14,
          padding: '16px 18px',
          border: '1px solid rgba(185, 28, 28, 0.25)',
          boxShadow: '0 3px 12px rgba(185, 28, 28, 0.06)',
          display: 'flex',
          flexDirection: 'column',
          gap: 6
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#b91c1c', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              UNVOUCHED SELF-DEBITS
            </span>
            <span style={{ fontSize: '0.7rem', background: '#fee2e2', color: '#7f1d1d', padding: '2px 6px', borderRadius: 6, fontWeight: 700 }}>
              No Approval
            </span>
          </div>
          <div style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: '1.45rem', fontWeight: 700, color: '#7f1d1d' }}>
            {fmtINR(s.totalQuestionableBuilderDebits)}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#6b7280', lineHeight: 1.4 }}>
            <strong>₹6.20L</strong> Supervision (23-11-21) + <strong>₹1.24L</strong> Cash + <strong>₹1.86L</strong> GST/TDS transfers.
          </div>
        </div>

        {/* KPI 4: BOM Unaccounted Bank Shortfall */}
        <div style={{
          background: '#ffffff',
          borderRadius: 14,
          padding: '16px 18px',
          border: '1px solid rgba(217, 119, 6, 0.25)',
          boxShadow: '0 3px 12px rgba(217, 119, 6, 0.06)',
          display: 'flex',
          flexDirection: 'column',
          gap: 6
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#d97706', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              UNACCOUNTED BANK SHORTFALL
            </span>
            <span style={{ fontSize: '0.7rem', background: '#fef3c7', color: '#92400e', padding: '2px 6px', borderRadius: 6, fontWeight: 700 }}>
              Bank Discrepancy
            </span>
          </div>
          <div style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: '1.45rem', fontWeight: 700, color: '#b45309' }}>
            {fmtINR(s.unaccountedBankShortfall)}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#6b7280', lineHeight: 1.4 }}>
            Passbook balance was <strong>₹6.19L</strong>; Developer only admitted <strong>₹1.10L</strong> unspent in final settlement!
          </div>
        </div>

        {/* KPI 5: Total Challengeable Exposure */}
        <div style={{
          background: 'linear-gradient(135deg, #fef2f2 0%, #fff1f2 100%)',
          borderRadius: 14,
          padding: '16px 18px',
          border: '1.5px solid rgba(220, 38, 38, 0.35)',
          boxShadow: '0 4px 14px rgba(220, 38, 38, 0.1)',
          display: 'flex',
          flexDirection: 'column',
          gap: 6
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#991b1b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              TOTAL FORENSIC EXPOSURE
            </span>
            <span style={{ fontSize: '0.7rem', background: '#991b1b', color: '#ffffff', padding: '2px 6px', borderRadius: 6, fontWeight: 800 }}>
              Recovery Scope
            </span>
          </div>
          <div style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: '1.55rem', fontWeight: 800, color: '#991b1b' }}>
            {fmtINR(s.totalChallengeableAmount)}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#7f1d1d', lineHeight: 1.4, fontWeight: 500 }}>
            Includes CA Claim (<strong>₹12.07L</strong>) + BOM Wing B leakage (<strong>₹15.31L</strong>) + shortfall (<strong>₹1.13L</strong>).
          </div>
        </div>
      </div>

      {/* ── 3. VIEW MODE SEGMENTED CONTROL ─────────────────────────────────── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 12,
        background: '#f8fafc',
        borderRadius: 14,
        padding: '6px 8px',
        border: '1px solid #e2e8f0'
      }}>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {[
            { id: 'recovery', label: '🎯 Expected Recovery & Negotiation Calculator', badge: '₹12L – ₹30L' },
            { id: 'summary', label: '📊 Forensic Breakdown & Charts', badge: 'High-Level' },
            { id: 'vendors', label: '🏢 Vendor-by-Vendor Cross-Match', badge: '12 Payees' },
            { id: 'annexure4', label: '📑 CA Annexure 4 Missing Bills', badge: '23 Items' },
            { id: 'register', label: '🔍 135 BOM Transactions Audit', badge: 'Full Ledger' }
          ].map(tab => {
            const active = activeViewMode === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveViewMode(tab.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '8px 14px',
                  borderRadius: 10,
                  border: active ? '1.5px solid #0e3d34' : '1.5px solid transparent',
                  background: active ? '#ffffff' : 'transparent',
                  color: active ? '#062b24' : '#64748b',
                  fontSize: '0.82rem',
                  fontWeight: active ? 700 : 500,
                  cursor: 'pointer',
                  boxShadow: active ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
                  transition: 'all 0.15s ease'
                }}
              >
                <span>{tab.label}</span>
                <span style={{
                  fontSize: '0.68rem',
                  padding: '2px 6px',
                  borderRadius: 6,
                  background: active ? '#ecfdf5' : '#f1f5f9',
                  color: active ? '#065f46' : '#64748b',
                  fontWeight: 700
                }}>
                  {tab.badge}
                </span>
              </button>
            );
          })}
        </div>

        {/* Live Search if in register mode */}
        {(activeViewMode === 'register' || activeViewMode === 'annexure4') && (
          <div style={{ position: 'relative', minWidth: 260 }}>
            <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: '0.85rem' }}>
              🔍
            </span>
            <input
              type="text"
              placeholder="Search vendor, voucher, remark..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '7px 12px 7px 32px',
                borderRadius: 8,
                border: '1px solid #cbd5e1',
                fontSize: '0.8rem',
                outline: 'none',
                background: '#ffffff',
                boxSizing: 'border-box'
              }}
            />
          </div>
        )}
      </div>

      {/* ── 4. VIEW MODE 0: EXPECTED RECOVERY & NEGOTIATION CALCULATOR ────── */}
      {activeViewMode === 'recovery' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

          {/* Intro Strategy Banner */}
          <div style={{
            background: 'linear-gradient(135deg, #0b2b26 0%, #163e36 100%)',
            borderRadius: 16,
            padding: '22px 26px',
            color: '#ffffff',
            border: '1.5px solid rgba(196, 155, 79, 0.4)',
            boxShadow: '0 8px 24px rgba(11, 43, 38, 0.15)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 16
          }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <span style={{ fontSize: '1.25rem' }}>🎯</span>
                <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#c49b4f', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  EXECUTIVE NEGOTIATION DOSSIER
                </span>
              </div>
              <h2 style={{ margin: '0 0 6px 0', fontFamily: "'Fraunces', Georgia, serif", fontSize: '1.45rem', fontWeight: 700, color: '#ffffff' }}>
                How Much Can We Expect to Recover from the Builder?
              </h2>
              <p style={{ margin: 0, fontSize: '0.84rem', color: 'rgba(255,255,255,0.85)', maxWidth: 760, lineHeight: 1.5 }}>
                Based on CA Hardik Mehta&apos;s certified audit report (UDIN: 26162502TFCJWK8860) and the Bank of Maharashtra Passbook forensic audit, 
                the society has <strong>4 strategically calculated recovery tiers</strong> ranging from 
                <strong> ₹12.07 Lakhs (Hard Minimum)</strong> to <strong>₹19.42 Lakhs (Realistic Target)</strong>, 
                <strong> ₹30.49 Lakhs (Opening Anchor)</strong>, and <strong>₹45.76 Lakhs (MahaRERA Scope)</strong>.
              </p>
            </div>

            <div style={{
              background: 'rgba(255,255,255,0.1)',
              padding: '12px 18px',
              borderRadius: 12,
              border: '1px solid rgba(196,155,79,0.3)',
              textAlign: 'right'
            }}>
              <div style={{ fontSize: '0.72rem', color: '#c49b4f', fontWeight: 800, textTransform: 'uppercase' }}>
                TARGET SETTLEMENT WINDOW
              </div>
              <div style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: '1.5rem', fontWeight: 800, color: '#ffffff', marginTop: 2 }}>
                ₹18.0L – ₹20.0L
              </div>
              <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.7)', marginTop: 2 }}>
                High probability outcome
              </div>
            </div>
          </div>

          {/* ── 4 RECOVERY TIERS GRID ── */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(270px, 1fr))',
            gap: 16
          }}>
            {/* TIER 1 */}
            <div style={{
              background: '#ffffff',
              borderRadius: 14,
              padding: '20px',
              border: '1.5px solid #cbd5e1',
              boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: 14
            }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    TIER 1 • CERTIFIED MINIMUM
                  </span>
                  <span style={{ fontSize: '0.68rem', background: '#ecfdf5', color: '#065f46', padding: '2px 7px', borderRadius: 6, fontWeight: 800 }}>
                    100% Guaranteed
                  </span>
                </div>
                <div style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: '1.6rem', fontWeight: 800, color: '#0f172a' }}>
                  ₹12,07,058
                </div>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#059669', marginTop: 2 }}>
                  Hard Floor / Walk-Away Red Line
                </div>
                <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: 8, lineHeight: 1.45 }}>
                  Includes <strong>₹9,00,790</strong> net principal surplus + <strong>₹3,06,268</strong> statutory interest @ 8% p.a. for 51 months. 
                  Formally signed and certified with CA UDIN. Under NO circumstances settle below this amount!
                </div>
              </div>

              <button
                onClick={() => {
                  setCalcItems({
                    baseCertified: true,
                    schindlerLift: false,
                    otherMissingBills: false,
                    itcRefund: false,
                    bankShortfall: false,
                    supervisionDebit: false,
                    wingBSubsidy: false,
                    cashWithdrawals: false
                  });
                  setInterestMode('ca8');
                }}
                style={{
                  background: '#f1f5f9',
                  color: '#334155',
                  border: '1px solid #cbd5e1',
                  padding: '7px 12px',
                  borderRadius: 8,
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Load in Calculator
              </button>
            </div>

            {/* TIER 2 - RECOMMENDED */}
            <div style={{
              background: '#ffffff',
              borderRadius: 14,
              padding: '20px',
              border: '2px solid #059669',
              boxShadow: '0 6px 18px rgba(5, 150, 105, 0.12)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: 14,
              position: 'relative'
            }}>
              <span style={{
                position: 'absolute',
                top: -10,
                right: 14,
                background: '#059669',
                color: '#ffffff',
                fontSize: '0.65rem',
                fontWeight: 800,
                padding: '2px 8px',
                borderRadius: 10,
                letterSpacing: '0.04em'
              }}>
                RECOMMENDED TARGET
              </span>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#059669', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    TIER 2 • REALISTIC SETTLEMENT
                  </span>
                  <span style={{ fontSize: '0.68rem', background: '#ecfdf5', color: '#065f46', padding: '2px 7px', borderRadius: 6, fontWeight: 800 }}>
                    85% High Probability
                  </span>
                </div>
                <div style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: '1.6rem', fontWeight: 800, color: '#065f46' }}>
                  ₹19,41,755
                </div>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#047857', marginTop: 2 }}>
                  Realistic Settlement Range: ₹18L – ₹20L
                </div>
                <div style={{ fontSize: '0.78rem', color: '#475569', marginTop: 8, lineHeight: 1.45 }}>
                  Base ₹12.07L + <strong>₹4,09,211 Missing Invoices disallowed</strong> (Schindler lift, unvouched estimates) + 
                  <strong> ₹1,39,070 GST ITC availed by builder</strong> + 8% interest (₹4,92,684).
                </div>
              </div>

              <button
                onClick={() => {
                  setCalcItems({
                    baseCertified: true,
                    schindlerLift: true,
                    otherMissingBills: true,
                    itcRefund: true,
                    bankShortfall: false,
                    supervisionDebit: false,
                    wingBSubsidy: false,
                    cashWithdrawals: false
                  });
                  setInterestMode('ca8');
                }}
                style={{
                  background: '#059669',
                  color: '#ffffff',
                  border: 'none',
                  padding: '7px 12px',
                  borderRadius: 8,
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Load Target in Calculator
              </button>
            </div>

            {/* TIER 3 - OPENING ANCHOR */}
            <div style={{
              background: '#ffffff',
              borderRadius: 14,
              padding: '20px',
              border: '1.5px solid #ea580c',
              boxShadow: '0 4px 12px rgba(234, 88, 12, 0.08)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: 14
            }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#ea580c', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    TIER 3 • FORENSIC PASSBOOK CLAIM
                  </span>
                  <span style={{ fontSize: '0.68rem', background: '#ffedd5', color: '#9a3412', padding: '2px 7px', borderRadius: 6, fontWeight: 800 }}>
                    Opening Anchor
                  </span>
                </div>
                <div style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: '1.6rem', fontWeight: 800, color: '#c2410c' }}>
                  ₹30,49,153
                </div>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#ea580c', marginTop: 2 }}>
                  Opening Demand Range: ₹28L – ₹31L
                </div>
                <div style={{ fontSize: '0.78rem', color: '#475569', marginTop: 8, lineHeight: 1.45 }}>
                  Tier 2 + <strong>₹5,09,271 BOM Passbook cash shortfall</strong> + <strong>₹2,70,000 unapproved supervision debit</strong> + 
                  ₹47,145 cash withdrawals + 8% interest (₹7,73,666). Gives maximum psychological negotiation leverage!
                </div>
              </div>

              <button
                onClick={() => {
                  setCalcItems({
                    baseCertified: true,
                    schindlerLift: true,
                    otherMissingBills: true,
                    itcRefund: true,
                    bankShortfall: true,
                    supervisionDebit: true,
                    wingBSubsidy: false,
                    cashWithdrawals: true
                  });
                  setInterestMode('ca8');
                }}
                style={{
                  background: '#ffedd5',
                  color: '#9a3412',
                  border: '1px solid #fed7aa',
                  padding: '7px 12px',
                  borderRadius: 8,
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Load Anchor in Calculator
              </button>
            </div>

            {/* TIER 4 - LEGAL ESCALATION */}
            <div style={{
              background: '#ffffff',
              borderRadius: 14,
              padding: '20px',
              border: '1.5px solid #dc2626',
              boxShadow: '0 4px 12px rgba(220, 38, 38, 0.08)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: 14
            }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#dc2626', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    TIER 4 • MAHARERA LITIGATION
                  </span>
                  <span style={{ fontSize: '0.68rem', background: '#fee2e2', color: '#991b1b', padding: '2px 7px', borderRadius: 6, fontWeight: 800 }}>
                    Legal Filing
                  </span>
                </div>
                <div style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: '1.6rem', fontWeight: 800, color: '#991b1b' }}>
                  ₹45,75,525
                </div>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#b91c1c', marginTop: 2 }}>
                  MahaRERA Maximum Scope: ₹42L – ₹46L
                </div>
                <div style={{ fontSize: '0.78rem', color: '#475569', marginTop: 8, lineHeight: 1.45 }}>
                  Tier 3 + <strong>₹7,27,249 Wing B cross-subsidy recovery</strong> (47.5% share) + 
                  <strong> MahaRERA statutory interest @ 10.75% p.a. (₹13,72,162)</strong> + ₹2,00,000 legal compensation.
                </div>
              </div>

              <button
                onClick={() => {
                  setCalcItems({
                    baseCertified: true,
                    schindlerLift: true,
                    otherMissingBills: true,
                    itcRefund: true,
                    bankShortfall: true,
                    supervisionDebit: true,
                    wingBSubsidy: true,
                    cashWithdrawals: true
                  });
                  setInterestMode('rera');
                }}
                style={{
                  background: '#fee2e2',
                  color: '#991b1b',
                  border: '1px solid #fecaca',
                  padding: '7px 12px',
                  borderRadius: 8,
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Load Legal Scope
              </button>
            </div>
          </div>

          {/* ── INTERACTIVE SETTLEMENT SIMULATOR ── */}
          <div style={{
            background: '#ffffff',
            borderRadius: 16,
            padding: '24px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 4px 16px rgba(0,0,0,0.04)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18, flexWrap: 'wrap', gap: 10 }}>
              <div>
                <h3 style={{ margin: '0 0 4px 0', fontSize: '1.15rem', fontWeight: 700, color: '#0f172a' }}>
                  Interactive Custom Settlement Simulator
                </h3>
                <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b' }}>
                  Toggle specific claims on/off to see the exact expected recovery in real-time. Use this to simulate meeting scenarios.
                </p>
              </div>

              {/* Interest Mode Selector */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#f8fafc', padding: '4px', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', padding: '0 6px' }}>Interest Rate:</span>
                {[
                  { id: 'none', label: '0% (Principal Only)' },
                  { id: 'ca8', label: '8% p.a. (CA Hardik)' },
                  { id: 'rera', label: '10.75% (MahaRERA)' }
                ].map(im => (
                  <button
                    key={im.id}
                    onClick={() => setInterestMode(im.id)}
                    style={{
                      background: interestMode === im.id ? '#0e3d34' : 'transparent',
                      color: interestMode === im.id ? '#ffffff' : '#475569',
                      border: 'none',
                      padding: '4px 10px',
                      borderRadius: 6,
                      fontSize: '0.74rem',
                      fontWeight: interestMode === im.id ? 700 : 500,
                      cursor: 'pointer'
                    }}
                  >
                    {im.label}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>
              {/* Claims Checklist */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {/* 1. Base */}
                <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px 14px', borderRadius: 10, background: '#f8fafc', border: '1px solid #e2e8f0', cursor: 'default' }}>
                  <input type="checkbox" checked={true} disabled={true} style={{ marginTop: 3, accentColor: '#059669' }} />
                  <div>
                    <div style={{ fontSize: '0.84rem', fontWeight: 700, color: '#0f172a' }}>
                      Certified Net Principal Surplus: ₹9,00,790
                    </div>
                    <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: 1 }}>
                      Hard minimum already signed by CA Hardik Mehta (UDIN: 26162502TFCJWK8860).
                    </div>
                  </div>
                </label>

                {/* 2. Schindler */}
                <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px 14px', borderRadius: 10, background: calcItems.schindlerLift ? '#f0fdf4' : '#ffffff', border: calcItems.schindlerLift ? '1px solid #bbf7d0' : '1px solid #e2e8f0', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={calcItems.schindlerLift}
                    onChange={e => setCalcItems(p => ({ ...p, schindlerLift: e.target.checked }))}
                    style={{ marginTop: 3, accentColor: '#059669' }}
                  />
                  <div>
                    <div style={{ fontSize: '0.84rem', fontWeight: 700, color: '#0f172a' }}>
                      Disallow Schindler Lift AMC: +₹1,23,736
                    </div>
                    <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: 1 }}>
                      Invoice made out solely to Building B; ZERO debit in BOM passbook!
                    </div>
                  </div>
                </label>

                {/* 3. Other Missing Bills */}
                <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px 14px', borderRadius: 10, background: calcItems.otherMissingBills ? '#f0fdf4' : '#ffffff', border: calcItems.otherMissingBills ? '1px solid #bbf7d0' : '1px solid #e2e8f0', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={calcItems.otherMissingBills}
                    onChange={e => setCalcItems(p => ({ ...p, otherMissingBills: e.target.checked }))}
                    style={{ marginTop: 3, accentColor: '#059669' }}
                  />
                  <div>
                    <div style={{ fontSize: '0.84rem', fontWeight: 700, color: '#0f172a' }}>
                      Disallow Other Annexure 4 Missing Bills: +₹2,85,475
                    </div>
                    <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: 1 }}>
                      MSEDCL estimates (₹1.05L), Gurukrupa pools (₹44.8k), Naushad Ali gardening (₹19.6k), water (₹32.5k).
                    </div>
                  </div>
                </label>

                {/* 4. GST ITC */}
                <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px 14px', borderRadius: 10, background: calcItems.itcRefund ? '#f0fdf4' : '#ffffff', border: calcItems.itcRefund ? '1px solid #bbf7d0' : '1px solid #e2e8f0', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={calcItems.itcRefund}
                    onChange={e => setCalcItems(p => ({ ...p, itcRefund: e.target.checked }))}
                    style={{ marginTop: 3, accentColor: '#059669' }}
                  />
                  <div>
                    <div style={{ fontSize: '0.84rem', fontWeight: 700, color: '#0f172a' }}>
                      Refund GST Input Tax Credit (ITC) Availed: +₹1,39,070
                    </div>
                    <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: 1 }}>
                      Developer availed ITC credit against maintenance GST on their government tax returns.
                    </div>
                  </div>
                </label>

                {/* 5. BOM Cash Shortfall */}
                <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px 14px', borderRadius: 10, background: calcItems.bankShortfall ? '#f0fdf4' : '#ffffff', border: calcItems.bankShortfall ? '1px solid #bbf7d0' : '1px solid #e2e8f0', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={calcItems.bankShortfall}
                    onChange={e => setCalcItems(p => ({ ...p, bankShortfall: e.target.checked }))}
                    style={{ marginTop: 3, accentColor: '#059669' }}
                  />
                  <div>
                    <div style={{ fontSize: '0.84rem', fontWeight: 700, color: '#0f172a' }}>
                      Reclaim BOM Passbook Cash Shortfall: +₹5,09,271
                    </div>
                    <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: 1 }}>
                      Actual BOM bank balance was ₹6.19L; developer only admitted ₹1.10L in final handover sheet!
                    </div>
                  </div>
                </label>

                {/* 6. Supervision Debit */}
                <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px 14px', borderRadius: 10, background: calcItems.supervisionDebit ? '#f0fdf4' : '#ffffff', border: calcItems.supervisionDebit ? '1px solid #bbf7d0' : '1px solid #e2e8f0', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={calcItems.supervisionDebit}
                    onChange={e => setCalcItems(p => ({ ...p, supervisionDebit: e.target.checked }))}
                    style={{ marginTop: 3, accentColor: '#059669' }}
                  />
                  <div>
                    <div style={{ fontSize: '0.84rem', fontWeight: 700, color: '#0f172a' }}>
                      Recover 23-11-2021 Supervision Debit: +₹2,70,000
                    </div>
                    <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: 1 }}>
                      Vch 498 debited from BOM without agreement or member consent. CA explicitly ordered recovery.
                    </div>
                  </div>
                </label>

                {/* 7. Wing B Cross-Subsidy */}
                <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px 14px', borderRadius: 10, background: calcItems.wingBSubsidy ? '#f0fdf4' : '#ffffff', border: calcItems.wingBSubsidy ? '1px solid #bbf7d0' : '1px solid #e2e8f0', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={calcItems.wingBSubsidy}
                    onChange={e => setCalcItems(p => ({ ...p, wingBSubsidy: e.target.checked }))}
                    style={{ marginTop: 3, accentColor: '#059669' }}
                  />
                  <div>
                    <div style={{ fontSize: '0.84rem', fontWeight: 700, color: '#0f172a' }}>
                      Reclaim Wing B Common Fund Drain Share (47.5%): +₹7,27,249
                    </div>
                    <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: 1 }}>
                      Wing A pro-rata share of ₹15,31,050.50 debited for Wing B expenses out of common BOM account.
                    </div>
                  </div>
                </label>
              </div>

              {/* Dynamic Live Calculated Result Card */}
              <div style={{
                background: 'linear-gradient(135deg, #062b24 0%, #0e3d34 100%)',
                borderRadius: 16,
                padding: '26px',
                color: '#ffffff',
                border: '1.5px solid rgba(196, 155, 79, 0.45)',
                boxShadow: '0 10px 28px rgba(6, 43, 36, 0.2)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: 20
              }}>
                <div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#c49b4f', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    DYNAMIC EXPECTED RECOVERY
                  </div>
                  <div style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: '2.5rem', fontWeight: 800, color: '#ffffff', margin: '8px 0 4px 0' }}>
                    {fmtINR(dynamicRecovery.total)}
                  </div>
                  <div style={{ fontSize: '0.82rem', color: '#6ee7b7', fontWeight: 700 }}>
                    ▲ +{fmtINR(dynamicRecovery.gainOverBase)} above statutory baseline
                  </div>

                  <div style={{
                    marginTop: 18,
                    paddingTop: 16,
                    borderTop: '1px solid rgba(255,255,255,0.15)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8,
                    fontSize: '0.82rem'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: 'rgba(255,255,255,0.8)' }}>
                      <span>Adjusted Net Principal:</span>
                      <strong style={{ color: '#ffffff' }}>{fmtINR(dynamicRecovery.principal)}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: 'rgba(255,255,255,0.8)' }}>
                      <span>Accrued Interest:</span>
                      <strong style={{ color: '#c49b4f' }}>+{fmtINR(dynamicRecovery.interest)}</strong>
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.6)', marginTop: 2 }}>
                      Interest Basis: {dynamicRecovery.intLabel}
                    </div>
                  </div>
                </div>

                <div style={{
                  background: 'rgba(255,255,255,0.08)',
                  padding: '14px',
                  borderRadius: 12,
                  border: '1px solid rgba(255,255,255,0.15)'
                }}>
                  <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#c49b4f', textTransform: 'uppercase', marginBottom: 4 }}>
                    Negotiation Tip for Committee:
                  </div>
                  <div style={{ fontSize: '0.76rem', color: 'rgba(255,255,255,0.85)', lineHeight: 1.45 }}>
                    Open the discussion presenting the <strong>₹30.49L claim</strong>. As the meeting progresses, 
                    concede doubtful estimates or interest, but <strong>hold firm at ₹18L – ₹20L</strong>. 
                    Never accept anything below <strong>₹12.07L</strong>.
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── THE NEGOTIATION FUNNEL & MEETING PLAYBOOK ── */}
          <div style={{
            background: '#ffffff',
            borderRadius: 16,
            padding: '24px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 4px 14px rgba(0,0,0,0.04)'
          }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '1.05rem', fontWeight: 700, color: '#0f172a' }}>
              The 3-Phase Meeting Playbook (&quot;The Recovery Funnel&quot;)
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 }}>
              <div style={{ background: '#fff7ed', borderRadius: 12, padding: '16px', border: '1.5px solid #fed7aa' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <span style={{ fontSize: '1.2rem' }}>1️⃣</span>
                  <div style={{ fontWeight: 800, color: '#c2410c', fontSize: '0.86rem' }}>
                    PHASE 1: OPENING ANCHOR (₹30.49L)
                  </div>
                </div>
                <div style={{ fontSize: '0.78rem', color: '#475569', lineHeight: 1.45 }}>
                  Tabling the full forensic audit showing the ₹5.09L BOM cash shortfall and ₹2.70L unapproved supervision debit. 
                  Forces developer to defend their numbers instead of challenging the society.
                </div>
              </div>

              <div style={{ background: '#ecfdf5', borderRadius: 12, padding: '16px', border: '1.5px solid #a7f3d0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <span style={{ fontSize: '1.2rem' }}>2️⃣</span>
                  <div style={{ fontWeight: 800, color: '#065f46', fontSize: '0.86rem' }}>
                    PHASE 2: SETTLEMENT WINDOW (₹18L – ₹20L)
                  </div>
                </div>
                <div style={{ fontSize: '0.78rem', color: '#475569', lineHeight: 1.45 }}>
                  Concede minor interest or disputed utility estimates in exchange for immediate settlement cheque. 
                  Insist on 100% refund of Missing Invoices (Schindler ₹1.24L, pools, gardening) and ITC credits.
                </div>
              </div>

              <div style={{ background: '#fef2f2', borderRadius: 12, padding: '16px', border: '1.5px solid #fecaca' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <span style={{ fontSize: '1.2rem' }}>3️⃣</span>
                  <div style={{ fontWeight: 800, color: '#991b1b', fontSize: '0.86rem' }}>
                    PHASE 3: RED LINE (₹12.07L)
                  </div>
                </div>
                <div style={{ fontSize: '0.78rem', color: '#475569', lineHeight: 1.45 }}>
                  The non-negotiable floor certified by CA Hardik Mehta. If developer refuses to meet at least ₹12.07L, 
                  terminate discussion and file formal complaint in MahaRERA seeking ₹45.76 Lakhs.
                </div>
              </div>
            </div>
          </div>

        </div>
      )}

      {/* ── 5. VIEW MODE 1: SUMMARY & VISUAL ANALYTICS ─────────────────────── */}
      {activeViewMode === 'summary' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

          {/* Forensic Narrative Cards */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: 16
          }}>
            {/* Finding A */}
            <div style={{
              background: '#ffffff',
              borderRadius: 14,
              padding: '20px',
              border: '1px solid #fecaca',
              borderLeft: '5px solid #dc2626',
              boxShadow: '0 4px 12px rgba(220, 38, 38, 0.05)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <span style={{ fontSize: '1.2rem' }}>🚨</span>
                <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: '#991b1b' }}>
                  Finding 1: Cross-Subsidizing Wing B from BOM Common Funds (₹15.31 Lakhs)
                </h3>
              </div>
              <p style={{ margin: 0, fontSize: '0.82rem', color: '#475569', lineHeight: 1.55 }}>
                The Bank of Maharashtra account was opened on 01-Jul-2021 with ₹56,22,572.90 collected from flat owners. 
                Out of ₹50.05 Lakhs disbursed, <strong>₹15,31,050.50 (30.59%)</strong> was directly debited for 
                <strong> Wing B expenses</strong> (Supervision ₹3.50L, Security ₹2.58L, Electricity ₹1.57L, Housekeeping ₹1.45L, Pools ₹50.7k, Gardening ₹35.9k). 
                Yet Wing B maintenance was supposed to be self-sustaining!
              </p>
            </div>

            {/* Finding B */}
            <div style={{
              background: '#ffffff',
              borderRadius: 14,
              padding: '20px',
              border: '1px solid #fed7aa',
              borderLeft: '5px solid #ea580c',
              boxShadow: '0 4px 12px rgba(234, 88, 12, 0.05)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <span style={{ fontSize: '1.2rem' }}>⚠️</span>
                <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: '#9a3412' }}>
                  Finding 2: Invoices Claimed for Wing A But Found Only in Wing B (₹1.73 Lakhs)
                </h3>
              </div>
              <p style={{ margin: 0, fontSize: '0.82rem', color: '#475569', lineHeight: 1.55 }}>
                In CA Hardik Mehta&apos;s Annexure 4 (Part A), the builder claimed ₹1,73,458 of expenses from Wing A 
                using invoices made out <strong>EXCLUSIVELY to Building B</strong>. For example, Schindler Lift AMC (₹1,23,736) was addressed 
                solely to Building B and has <strong>ZERO debit in the BOM passbook</strong>! Gurukrupa Pools (₹14,049) and Naushad Ali (₹16,709) were debited 
                100% under Wing B in the BOM ledger, yet charged to Wing A!
              </p>
            </div>

            {/* Finding C */}
            <div style={{
              background: '#ffffff',
              borderRadius: 14,
              padding: '20px',
              border: '1px solid #e2e8f0',
              borderLeft: '5px solid #0e3d34',
              boxShadow: '0 4px 12px rgba(14, 61, 52, 0.05)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <span style={{ fontSize: '1.2rem' }}>💰</span>
                <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: '#062b24' }}>
                  Finding 3: Arbitrary Builder Self-Debits on 23-Nov-2021 (₹6.20 Lakhs)
                </h3>
              </div>
              <p style={{ margin: 0, fontSize: '0.82rem', color: '#475569', lineHeight: 1.55 }}>
                On 23-11-2021, the builder debited <strong>₹2,70,000 (Vch 498, Wing A)</strong> and <strong>₹3,50,000 (Vch 499, Wing B)</strong> 
                as &quot;Supervision Charges&quot; directly to their internal entity without any contract, approval, or vendor invoices. 
                CA Hardik explicitly ordered full recovery of ₹2,70,000 for Wing A. Furthermore, ₹1.24 Lakhs was withdrawn in cash via bearer cheques.
              </p>
            </div>
          </div>

          {/* Visual Breakdown of BOM Outflows */}
          <div style={{
            background: '#ffffff',
            borderRadius: 16,
            padding: '24px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 4px 14px rgba(0,0,0,0.04)'
          }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '1.05rem', fontWeight: 700, color: '#0f172a' }}>
              Where Did the ₹50.05 Lakhs in BOM Passbook Go?
            </h3>

            {/* Stacked Progress Bar */}
            <div style={{
              display: 'flex',
              height: 28,
              borderRadius: 8,
              overflow: 'hidden',
              marginBottom: 16,
              boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.06)'
            }}>
              <div style={{ width: '47.96%', background: '#10b981', title: 'Society Handover: 47.96%' }} />
              <div style={{ width: '30.59%', background: '#f97316', title: 'Wing B Drain: 30.59%' }} />
              <div style={{ width: '12.39%', background: '#ef4444', title: 'Supervision Debits: 12.39%' }} />
              <div style={{ width: '3.72%', background: '#eab308', title: 'Tax Transfers: 3.72%' }} />
              <div style={{ width: '2.47%', background: '#b91c1c', title: 'Cash Withdrawals: 2.47%' }} />
              <div style={{ width: '2.87%', background: '#0284c7', title: 'Direct Wing A Ops: 2.87%' }} />
            </div>

            {/* Legend items */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: 12
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.8rem' }}>
                <span style={{ width: 12, height: 12, borderRadius: 3, background: '#10b981' }} />
                <span><strong>Society Transfer:</strong> {fmtINR(s.societyHandoverTransfer)} (47.96%)</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.8rem' }}>
                <span style={{ width: 12, height: 12, borderRadius: 3, background: '#f97316' }} />
                <span><strong>Wing B Operations:</strong> {fmtINR(s.wingBOutflows)} (30.59%)</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.8rem' }}>
                <span style={{ width: 12, height: 12, borderRadius: 3, background: '#ef4444' }} />
                <span><strong>Supervision Charges:</strong> {fmtINR(s.totalSupervisionDebited)} (12.39%)</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.8rem' }}>
                <span style={{ width: 12, height: 12, borderRadius: 3, background: '#eab308' }} />
                <span><strong>Developer GST/TDS:</strong> {fmtINR(s.developerTaxAccountDebits)} (3.72%)</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.8rem' }}>
                <span style={{ width: 12, height: 12, borderRadius: 3, background: '#b91c1c' }} />
                <span><strong>Cash Withdrawals:</strong> {fmtINR(s.unvouchedCashWithdrawals)} (2.47%)</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.8rem' }}>
                <span style={{ width: 12, height: 12, borderRadius: 3, background: '#0284c7' }} />
                <span><strong>Wing A Operations:</strong> {fmtINR(s.wingAOutflows - s.societyHandoverTransfer - s.unvouchedSupervisionWingA)} (2.87%)</span>
              </div>
            </div>
          </div>

          {/* Monthly Drain Timeline */}
          <div style={{
            background: '#ffffff',
            borderRadius: 16,
            padding: '24px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 4px 14px rgba(0,0,0,0.04)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#0f172a' }}>
                  Monthly BOM Outflow Timeline (July 2021 to March 2023)
                </h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.78rem', color: '#64748b' }}>
                  Shows monthly disbursements from the bank account. Notice the massive spike in November 2021 (₹36.95L) when builder transferred ₹24L to society and debited ₹6.20L in supervision!
                </p>
              </div>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#475569' }}>
                    <th style={{ padding: '10px 12px' }}>Month</th>
                    <th style={{ padding: '10px 12px', textAlign: 'right' }}>Wing A (Ops)</th>
                    <th style={{ padding: '10px 12px', textAlign: 'right' }}>Wing B (Drain)</th>
                    <th style={{ padding: '10px 12px', textAlign: 'right' }}>Supervision</th>
                    <th style={{ padding: '10px 12px', textAlign: 'right' }}>Cash</th>
                    <th style={{ padding: '10px 12px', textAlign: 'right' }}>Society A/c</th>
                    <th style={{ padding: '10px 12px', textAlign: 'right' }}>Monthly Total</th>
                    <th style={{ padding: '10px 12px', textAlign: 'center' }}>Txs</th>
                  </tr>
                </thead>
                <tbody>
                  {BOM_MONTHLY_DRAIN_TIMELINE.map(m => (
                    <tr key={m.monthKey} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '9px 12px', fontWeight: 600, color: '#0f172a' }}>{m.monthName}</td>
                      <td style={{ padding: '9px 12px', textAlign: 'right', color: '#0369a1' }}>{m.wingA > 0 ? fmtINR(m.wingA) : '—'}</td>
                      <td style={{ padding: '9px 12px', textAlign: 'right', color: '#c2410c', fontWeight: m.wingB > 50000 ? 700 : 500 }}>
                        {m.wingB > 0 ? fmtINR(m.wingB) : '—'}
                      </td>
                      <td style={{ padding: '9px 12px', textAlign: 'right', color: '#dc2626', fontWeight: m.supervision > 0 ? 800 : 500 }}>
                        {m.supervision > 0 ? fmtINR(m.supervision) : '—'}
                      </td>
                      <td style={{ padding: '9px 12px', textAlign: 'right', color: '#b91c1c' }}>
                        {m.cash > 0 ? fmtINR(m.cash) : '—'}
                      </td>
                      <td style={{ padding: '9px 12px', textAlign: 'right', color: '#16a34a', fontWeight: m.societyTransfer > 0 ? 800 : 500 }}>
                        {m.societyTransfer > 0 ? fmtINR(m.societyTransfer) : '—'}
                      </td>
                      <td style={{ padding: '9px 12px', textAlign: 'right', fontWeight: 700, color: '#0f172a' }}>
                        {fmtINR(m.total)}
                      </td>
                      <td style={{ padding: '9px 12px', textAlign: 'center', color: '#64748b' }}>
                        {m.txCount}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── 5. VIEW MODE 2: VENDOR-BY-VENDOR CROSS-CHECK MATRIX ────────────── */}
      {activeViewMode === 'vendors' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{
            background: '#ffffff',
            borderRadius: 16,
            padding: '20px 24px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 4px 14px rgba(0,0,0,0.04)'
          }}>
            <div style={{ marginBottom: 16 }}>
              <h3 style={{ margin: '0 0 6px 0', fontSize: '1.1rem', fontWeight: 700, color: '#0f172a' }}>
                Forensic Cross-Check Matrix (12 Key Payees)
              </h3>
              <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b' }}>
                Direct comparison between amounts paid in the BOM Passbook Ledger vs amounts challenged in CA Hardik Mehta&apos;s Annexure 4 Missing Invoices register.
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {VENDOR_FORENSIC_MATRIX.map((vm, idx) => {
                const isSelected = selectedVendor === vm.vendor;
                return (
                  <div
                    key={idx}
                    onClick={() => setSelectedVendor(isSelected ? null : vm.vendor)}
                    style={{
                      borderRadius: 12,
                      border: isSelected ? '1.5px solid #0e3d34' : '1px solid #e2e8f0',
                      background: isSelected ? '#f8fafc' : '#ffffff',
                      padding: '16px 20px',
                      cursor: 'pointer',
                      transition: 'all 0.18s ease',
                      boxShadow: isSelected ? '0 4px 12px rgba(14, 61, 52, 0.08)' : '0 2px 4px rgba(0,0,0,0.02)'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '0.96rem', fontWeight: 800, color: '#0f172a' }}>
                            {vm.vendor}
                          </span>
                          <span style={{ fontSize: '0.7rem', background: '#f1f5f9', color: '#475569', padding: '2px 8px', borderRadius: 6, fontWeight: 600 }}>
                            {vm.category}
                          </span>
                          <span style={{
                            fontSize: '0.7rem',
                            padding: '2px 8px',
                            borderRadius: 6,
                            fontWeight: 700,
                            background: vm.caMissingCategory.includes('Part A') ? '#fee2e2' : '#fef3c7',
                            color: vm.caMissingCategory.includes('Part A') ? '#991b1b' : '#92400e'
                          }}>
                            {vm.caMissingCategory}
                          </span>
                        </div>

                        <div style={{ fontSize: '0.8rem', color: '#64748b', display: 'flex', gap: 14, flexWrap: 'wrap', marginTop: 4 }}>
                          <span>BOM Ledger Paid: <strong style={{ color: '#0f172a' }}>{fmtINR(vm.bomTotalPaid)}</strong> ({vm.bomVoucherCount} vouchers)</span>
                          <span>Wing A: <strong style={{ color: '#0369a1' }}>{fmtINR(vm.bomWingAPaid)}</strong></span>
                          <span>Wing B: <strong style={{ color: '#c2410c' }}>{fmtINR(vm.bomWingBPaid)}</strong></span>
                          <span>CA Missing Claim: <strong style={{ color: '#dc2626' }}>{fmtINR(vm.caMissingAmt)}</strong></span>
                        </div>
                      </div>

                      <div style={{ textAlign: 'right' }}>
                        <span style={{
                          fontSize: '0.78rem',
                          color: '#0e3d34',
                          fontWeight: 700,
                          textDecoration: 'underline'
                        }}>
                          {isSelected ? '▲ Hide Analysis' : '▼ Read Audit Finding'}
                        </span>
                      </div>
                    </div>

                    {isSelected && (
                      <div style={{
                        marginTop: 14,
                        paddingTop: 14,
                        borderTop: '1px dashed #cbd5e1',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 10
                      }}>
                        <div style={{
                          background: '#fff1f2',
                          borderRadius: 8,
                          padding: '10px 14px',
                          border: '1px solid #fecdd3'
                        }}>
                          <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#9f1239', textTransform: 'uppercase', marginBottom: 2 }}>
                            🔍 Forensic Audit Finding:
                          </div>
                          <div style={{ fontSize: '0.82rem', color: '#881337', lineHeight: 1.5 }}>
                            {vm.auditFinding}
                          </div>
                        </div>

                        <div style={{
                          background: '#ecfdf5',
                          borderRadius: 8,
                          padding: '10px 14px',
                          border: '1px solid #a7f3d0',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10
                        }}>
                          <span style={{ fontSize: '1.1rem' }}>⚖️</span>
                          <div style={{ fontSize: '0.82rem', color: '#065f46', lineHeight: 1.4 }}>
                            <strong>Society Action / Recommendation:</strong> {vm.recommendation}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── 6. VIEW MODE 3: CA ANNEXURE 4 MISSING BILLS (23 ITEMS) ─────────── */}
      {activeViewMode === 'annexure4' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{
            background: '#ffffff',
            borderRadius: 16,
            padding: '20px 24px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 4px 14px rgba(0,0,0,0.04)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
              <div>
                <h3 style={{ margin: '0 0 4px 0', fontSize: '1.1rem', fontWeight: 700, color: '#0f172a' }}>
                  Annexure 4: 23 Challenged Missing Invoices (₹4,09,211)
                </h3>
                <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b' }}>
                  Cross-matched directly against Bank of Maharashtra Passbook disbursements.
                </p>
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                <span style={{ background: '#fee2e2', color: '#991b1b', padding: '4px 10px', borderRadius: 8, fontSize: '0.74rem', fontWeight: 700 }}>
                  Part A (Wing B Only): ₹1,73,458 (6 items)
                </span>
                <span style={{ background: '#fef3c7', color: '#92400e', padding: '4px 10px', borderRadius: 8, fontSize: '0.74rem', fontWeight: 700 }}>
                  Part B (Recurring Estimated): ₹2,35,753 (17 items)
                </span>
              </div>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#475569' }}>
                    <th style={{ padding: '10px 12px' }}>ID & Type</th>
                    <th style={{ padding: '10px 12px' }}>Vendor & Nature</th>
                    <th style={{ padding: '10px 12px', textAlign: 'right' }}>Doc Amount</th>
                    <th style={{ padding: '10px 12px', textAlign: 'right' }}>Claimed from Wing A</th>
                    <th style={{ padding: '10px 12px' }}>BOM Passbook Match Status</th>
                    <th style={{ padding: '10px 12px' }}>Audit Cross-Match Finding</th>
                  </tr>
                </thead>
                <tbody>
                  {MISSING_BILLS_RECONCILIATION_LIST.filter(item => {
                    if (!searchQuery.trim()) return true;
                    const q = searchQuery.toLowerCase();
                    return [item.vendor, item.nature, item.type, item.bomMatchStatus, item.forensicNote].join(' ').toLowerCase().includes(q);
                  }).map(item => (
                    <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9', background: item.type.includes('Part A') ? '#fffafa' : '#ffffff' }}>
                      <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>
                        <div style={{ fontWeight: 700, color: '#0f172a' }}>{item.id}</div>
                        <span style={{
                          fontSize: '0.67rem',
                          fontWeight: 700,
                          padding: '1.5px 6px',
                          borderRadius: 4,
                          background: item.type.includes('Part A') ? '#fee2e2' : '#fef3c7',
                          color: item.type.includes('Part A') ? '#991b1b' : '#92400e'
                        }}>
                          {item.type.includes('Part A') ? 'Part A: Wing B Only' : 'Part B: Estimate'}
                        </span>
                      </td>

                      <td style={{ padding: '10px 12px' }}>
                        <div style={{ fontWeight: 700, color: '#0f172a' }}>{item.vendor}</div>
                        <div style={{ fontSize: '0.72rem', color: '#64748b' }}>{item.nature}</div>
                      </td>

                      <td style={{ padding: '10px 12px', textAlign: 'right', color: '#64748b' }}>
                        {item.docAmt > 0 ? fmtINR(item.docAmt) : '—'}
                      </td>

                      <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 800, color: '#dc2626' }}>
                        {fmtINR(item.allocatedAmt)}
                      </td>

                      <td style={{ padding: '10px 12px' }}>
                        <span style={{
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          padding: '3px 8px',
                          borderRadius: 6,
                          background: item.bomMatchStatus.includes('MATCHED') ? '#ecfdf5' : '#f1f5f9',
                          color: item.bomMatchStatus.includes('MATCHED') ? '#065f46' : '#64748b',
                          display: 'inline-block',
                          marginBottom: 4
                        }}>
                          {item.bomMatchStatus}
                        </span>
                        <div style={{ fontSize: '0.7rem', color: '#64748b', maxWidth: 220, lineHeight: 1.3 }}>
                          {item.bomDetails}
                        </div>
                      </td>

                      <td style={{ padding: '10px 12px', color: '#334155', maxWidth: 300, lineHeight: 1.4 }}>
                        {item.forensicNote}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── 7. VIEW MODE 4: FULL 135 BOM TRANSACTIONS AUDIT REGISTER ────────── */}
      {activeViewMode === 'register' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Filter Pills */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#475569' }}>Filter Category:</span>
            {[
              { id: 'all', label: 'All 135 Txs' },
              { id: 'missing', label: '🔴 Missing Invoices Matches' },
              { id: 'wingB', label: '🟠 Wing B Common Fund Drain' },
              { id: 'unvouched', label: '🟣 Builder Unvouched Debits' },
              { id: 'society', label: '🟢 Society Transfer (₹24L)' }
            ].map(f => {
              const active = activeFilter === f.id;
              return (
                <button
                  key={f.id}
                  onClick={() => setActiveFilter(f.id)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 8,
                    fontSize: '0.75rem',
                    fontWeight: active ? 700 : 500,
                    cursor: 'pointer',
                    border: active ? '1.5px solid #0e3d34' : '1px solid #cbd5e1',
                    background: active ? '#0e3d34' : '#ffffff',
                    color: active ? '#ffffff' : '#334155',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {f.label}
                </button>
              );
            })}
          </div>

          <div style={{
            background: '#ffffff',
            borderRadius: 16,
            padding: '20px 24px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 4px 14px rgba(0,0,0,0.04)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#64748b' }}>
                Showing <strong>{filteredTransactions.length}</strong> of 135 BOM Transactions
              </span>
              <button
                onClick={handleExportCSV}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#0e3d34',
                  fontWeight: 700,
                  fontSize: '0.78rem',
                  cursor: 'pointer',
                  textDecoration: 'underline'
                }}
              >
                Export Current View to CSV
              </button>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#475569' }}>
                    <th style={{ padding: '10px 12px' }}>Date</th>
                    <th style={{ padding: '10px 12px' }}>Vch No</th>
                    <th style={{ padding: '10px 12px' }}>Payee / Particulars</th>
                    <th style={{ padding: '10px 12px' }}>Wing</th>
                    <th style={{ padding: '10px 12px', textAlign: 'right' }}>Debit (Inflow)</th>
                    <th style={{ padding: '10px 12px', textAlign: 'right' }}>Credit (Outflow)</th>
                    <th style={{ padding: '10px 12px' }}>Forensic Status Tag</th>
                    <th style={{ padding: '10px 12px' }}>Audit Finding / Note</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTransactions.map(tx => (
                    <tr key={tx.id} style={{ borderBottom: '1px solid #f1f5f9', background: tx.forensicCat.includes('missing') || tx.forensicCat === 'supervision_unvouched' ? '#fffbfc' : '#ffffff' }}>
                      <td style={{ padding: '10px 12px', whiteSpace: 'nowrap', fontWeight: 600, color: '#334155' }}>
                        {tx.date}
                      </td>

                      <td style={{ padding: '10px 12px', color: '#64748b' }}>
                        {tx.vchNo || '—'}
                      </td>

                      <td style={{ padding: '10px 12px' }}>
                        <div style={{ fontWeight: 700, color: '#0f172a' }}>{tx.particulars}</div>
                        {tx.remark && (
                          <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Rem: {tx.remark}</div>
                        )}
                      </td>

                      <td style={{ padding: '10px 12px' }}>
                        <span style={{
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          padding: '2px 6px',
                          borderRadius: 4,
                          background: tx.wing === 'A' ? '#e0f2fe' : tx.wing === 'B' ? '#ffedd5' : '#f1f5f9',
                          color: tx.wing === 'A' ? '#0369a1' : tx.wing === 'B' ? '#9a3412' : '#475569'
                        }}>
                          Wing {tx.wing}
                        </span>
                      </td>

                      <td style={{ padding: '10px 12px', textAlign: 'right', color: '#059669', fontWeight: tx.debit > 0 ? 700 : 400 }}>
                        {tx.debit > 0 ? fmtINR(tx.debit) : '—'}
                      </td>

                      <td style={{ padding: '10px 12px', textAlign: 'right', color: tx.credit >= 100000 ? '#b91c1c' : '#0f172a', fontWeight: tx.credit >= 100000 ? 800 : 600 }}>
                        {tx.credit > 0 ? fmtINR(tx.credit) : '—'}
                      </td>

                      <td style={{ padding: '10px 12px' }}>
                        <span style={{
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          padding: '3px 8px',
                          borderRadius: 6,
                          background: tx.forensicBg,
                          color: tx.forensicColor,
                          display: 'inline-block'
                        }}>
                          {tx.forensicTag}
                        </span>
                      </td>

                      <td style={{ padding: '10px 12px', color: '#475569', maxWidth: 280, lineHeight: 1.35, fontSize: '0.76rem' }}>
                        {tx.forensicNote}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── 8. SOCIETY ACTION CHECKLIST FOR BUILDER NEGOTIATIONS ──────────── */}
      <div style={{
        background: '#ffffff',
        borderRadius: 16,
        padding: '24px',
        border: '1.5px solid rgba(196, 155, 79, 0.4)',
        boxShadow: '0 4px 16px rgba(196, 155, 79, 0.08)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <span style={{ fontSize: '1.4rem' }}>📋</span>
          <div>
            <h3 style={{ margin: 0, fontFamily: "'Fraunces', Georgia, serif", fontSize: '1.15rem', color: '#062b24', fontWeight: 700 }}>
              Forensic Audit Strategy: 5 Specific Demands for Builder Discussion
            </h3>
            <p style={{ margin: 0, fontSize: '0.78rem', color: '#64748b' }}>
              Actionable checklist for the Majestique Euriska Managing Committee based on this cross-audit.
            </p>
          </div>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: 14
        }}>
          <div style={{ background: '#f8fafc', padding: '14px', borderRadius: 10, border: '1px solid #e2e8f0' }}>
            <div style={{ fontWeight: 700, color: '#dc2626', fontSize: '0.85rem', marginBottom: 4 }}>
              1. Disallow Schindler Lift Claim (₹1,23,736)
            </div>
            <div style={{ fontSize: '0.78rem', color: '#475569', lineHeight: 1.45 }}>
              The lift AMC invoice was issued solely in Building B name and has zero payment in the common BOM passbook. Wing A cannot be burdened with Wing B lift contracts.
            </div>
          </div>

          <div style={{ background: '#f8fafc', padding: '14px', borderRadius: 10, border: '1px solid #e2e8f0' }}>
            <div style={{ fontWeight: 700, color: '#dc2626', fontSize: '0.85rem', marginBottom: 4 }}>
              2. Recover Supervision Self-Debits (₹2,70,000)
            </div>
            <div style={{ fontSize: '0.78rem', color: '#475569', lineHeight: 1.45 }}>
              Builder debited ₹2,70,000 on 23-11-2021 (Vch 498) without agreement or AGM approval. Demand immediate refund into society bank account as ordered by CA Hardik Mehta.
            </div>
          </div>

          <div style={{ background: '#f8fafc', padding: '14px', borderRadius: 10, border: '1px solid #e2e8f0' }}>
            <div style={{ fontWeight: 700, color: '#dc2626', fontSize: '0.85rem', marginBottom: 4 }}>
              3. Challenge Pool & Garden Allocations (₹64,413)
            </div>
            <div style={{ fontSize: '0.78rem', color: '#475569', lineHeight: 1.45 }}>
              Gurukrupa Pools (₹50.7k) and Naushad Ali (₹35.9k) were debited 100% under Wing B in the BOM ledger, yet builder claimed ₹44.8k and ₹19.6k from Wing A without Wing A bills!
            </div>
          </div>

          <div style={{ background: '#f8fafc', padding: '14px', borderRadius: 10, border: '1px solid #e2e8f0' }}>
            <div style={{ fontWeight: 700, color: '#dc2626', fontSize: '0.85rem', marginBottom: 4 }}>
              4. Reconcile Wing B Outflow Leakage (₹15,31,050.50)
            </div>
            <div style={{ fontSize: '0.78rem', color: '#475569', lineHeight: 1.45 }}>
              Out of ₹50.05 Lakhs in the Phase II bank account, 30.59% was used for Wing B expenses. Require developer to demonstrate Wing B member collections deposited into this account.
            </div>
          </div>

          <div style={{ background: '#f8fafc', padding: '14px', borderRadius: 10, border: '1px solid #e2e8f0' }}>
            <div style={{ fontWeight: 700, color: '#dc2626', fontSize: '0.85rem', marginBottom: 4 }}>
              5. Settle True Bank Shortfall (₹5,09,271.17)
            </div>
            <div style={{ fontSize: '0.78rem', color: '#475569', lineHeight: 1.45 }}>
              The actual unspent cash balance remaining in BOM A/c 60305942224 was ₹6,19,470.40, whereas the builder claimed only ₹1,10,199.23 was left. Settle the ₹5.09L discrepancy.
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
