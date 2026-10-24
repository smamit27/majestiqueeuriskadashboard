import React, { useState, useEffect } from 'react';
import { Bot, Sparkles, Clock, CheckCircle2, FileText, Users, ShieldCheck } from 'lucide-react';

/**
 * AiMomSkeletonLoader
 * High-fidelity, animated legal letterhead skeleton loader displayed while AI is drafting minutes.
 * Tailored dynamically for Building 'A' or Common Society Infrastructure.
 */
export default function AiMomSkeletonLoader({ scope = 'A_BUILDING' }) {
  const isWingA = scope === 'A_BUILDING';
  const themeColor = isWingA ? '#059669' : '#2563eb';
  const themeBg = isWingA ? 'rgba(5, 150, 105, 0.08)' : 'rgba(37, 99, 235, 0.08)';

  // Rotating realistic drafting stages to give dynamic AI feedback
  const stages = [
    `Analyzing raw meeting discussions for ${isWingA ? "Building 'A'" : 'Common Infrastructure'}...`,
    "Validating statutory quorum and key committee attendees...",
    "Extracting formal agenda items and executive summary...",
    "Drafting statutory legal resolutions with proposers & seconders...",
    "Synthesizing action item register with assignees & deadlines..."
  ];

  const [currentStageIdx, setCurrentStageIdx] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentStageIdx((prev) => (prev + 1) % stages.length);
    }, 1400);
    return () => clearInterval(timer);
  }, [stages.length]);

  return (
    <div
      id="ai-mom-generation-skeleton"
      data-testid="ai-mom-skeleton-loader"
      style={{
        marginTop: '32px',
        animation: 'fadeIn 0.3s ease-in-out'
      }}
    >
      <style>{`
        @keyframes momShimmerAnim {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        .mom-shimmer-bar {
          background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%);
          background-size: 200% 100%;
          animation: momShimmerAnim 1.6s infinite ease-in-out;
          border-radius: 6px;
        }
        .mom-shimmer-chip {
          background: linear-gradient(90deg, #f8fafc 25%, #e2e8f0 50%, #f8fafc 75%);
          background-size: 200% 100%;
          animation: momShimmerAnim 1.6s infinite ease-in-out;
          border-radius: 16px;
        }
      `}</style>

      {/* ── Dynamic AI Secretary Progress & Stage Pill ── */}
      <div
        style={{
          background: '#ffffff',
          borderRadius: '16px',
          border: `1.5px solid ${themeColor}`,
          padding: '16px 22px',
          marginBottom: '20px',
          boxShadow: `0 6px 20px ${isWingA ? 'rgba(5, 150, 105, 0.12)' : 'rgba(37, 99, 235, 0.12)'}`,
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: themeBg,
                color: themeColor,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                animation: 'pulse 1.8s infinite'
              }}
            >
              <Bot size={20} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '0.88rem', fontWeight: 800, color: '#0f172a' }}>
                  AI Secretary Agent Active
                </span>
                <span
                  style={{
                    fontSize: '0.72rem',
                    fontWeight: 800,
                    padding: '2px 8px',
                    borderRadius: '10px',
                    background: themeColor,
                    color: '#ffffff'
                  }}
                >
                  {isWingA ? "WING 'A' SCOPE" : "COMMON CAMPUS SCOPE"}
                </span>
              </div>
              <div style={{ fontSize: '0.82rem', color: themeColor, fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Sparkles size={13} />
                <span>{stages[currentStageIdx]}</span>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.78rem', color: '#64748b' }}>
            <Clock size={14} />
            <span>Drafting legal document...</span>
          </div>
        </div>

        {/* Shimmer progress line */}
        <div style={{ width: '100%', height: '4px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
          <div
            style={{
              height: '100%',
              width: '100%',
              background: `linear-gradient(90deg, ${themeColor} 0%, #38bdf8 50%, ${themeColor} 100%)`,
              backgroundSize: '200% 100%',
              animation: 'momShimmerAnim 1.2s infinite linear'
            }}
          />
        </div>
      </div>

      {/* ── Skeleton Letterhead Paper Document ── */}
      <div
        style={{
          background: '#ffffff',
          borderRadius: '16px',
          border: '1.5px solid #e2e8f0',
          padding: '40px 32px',
          boxShadow: '0 8px 30px rgba(0, 0, 0, 0.04)',
          position: 'relative'
        }}
      >
        {/* Scope Watermark Accent */}
        <div
          style={{
            position: 'absolute',
            top: '20px',
            right: '24px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '4px 12px',
            borderRadius: '12px',
            background: themeBg,
            color: themeColor,
            fontSize: '0.75rem',
            fontWeight: 800,
            letterSpacing: '0.5px'
          }}
        >
          <ShieldCheck size={14} />
          {isWingA ? "MAJESTIQUE EURISKA — WING 'A'" : 'MAJESTIQUE EURISKA — COMMON'}
        </div>

        {/* 1. Header Letterhead Shimmer */}
        <div style={{ textAlign: 'center', marginBottom: '28px', borderBottom: '2px dashed #e2e8f0', paddingBottom: '24px' }}>
          <div className="mom-shimmer-bar" style={{ width: '60px', height: '60px', borderRadius: '50%', margin: '0 auto 14px' }} />
          <div className="mom-shimmer-bar" style={{ width: '65%', height: '22px', margin: '0 auto 10px' }} />
          <div className="mom-shimmer-bar" style={{ width: '45%', height: '14px', margin: '0 auto 16px' }} />
          <div className="mom-shimmer-bar" style={{ width: '320px', height: '28px', borderRadius: '20px', margin: '0 auto' }} />
        </div>

        {/* 2. Meeting Metadata Grid Skeleton */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', marginBottom: '26px' }}>
          {[1, 2, 3, 4].map((i) => (
            <div key={i} style={{ padding: '12px 14px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
              <div className="mom-shimmer-bar" style={{ width: '40%', height: '10px', marginBottom: '8px' }} />
              <div className="mom-shimmer-bar" style={{ width: '75%', height: '16px' }} />
            </div>
          ))}
        </div>

        {/* 3. Attendees & Quorum Chips Skeleton */}
        <div style={{ marginBottom: '28px', padding: '18px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <div className="mom-shimmer-bar" style={{ width: '180px', height: '16px' }} />
            <div className="mom-shimmer-chip" style={{ width: '110px', height: '24px' }} />
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {[140, 160, 120, 150, 130, 170, 110].map((w, idx) => (
              <div key={idx} className="mom-shimmer-chip" style={{ width: `${w}px`, height: '32px' }} />
            ))}
          </div>
        </div>

        {/* 4. Executive Summary Skeleton */}
        <div style={{ marginBottom: '28px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <div className="mom-shimmer-bar" style={{ width: '160px', height: '18px' }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div className="mom-shimmer-bar" style={{ width: '98%', height: '14px' }} />
            <div className="mom-shimmer-bar" style={{ width: '92%', height: '14px' }} />
            <div className="mom-shimmer-bar" style={{ width: '85%', height: '14px' }} />
            <div className="mom-shimmer-bar" style={{ width: '60%', height: '14px' }} />
          </div>
        </div>

        {/* 5. Agenda & Discussions Skeleton Cards */}
        <div style={{ marginBottom: '28px' }}>
          <div className="mom-shimmer-bar" style={{ width: '220px', height: '18px', marginBottom: '14px' }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {[1, 2].map((card) => (
              <div key={card} style={{ padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0', background: '#ffffff' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                  <div className="mom-shimmer-chip" style={{ width: '70px', height: '22px' }} />
                  <div className="mom-shimmer-bar" style={{ width: '50%', height: '16px' }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '12px' }}>
                  <div className="mom-shimmer-bar" style={{ width: '95%', height: '12px' }} />
                  <div className="mom-shimmer-bar" style={{ width: '88%', height: '12px' }} />
                </div>
                <div style={{ padding: '10px 14px', background: '#f8fafc', borderRadius: '8px', borderLeft: `3px solid ${themeColor}` }}>
                  <div className="mom-shimmer-bar" style={{ width: '80%', height: '12px' }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 6. Statutory Resolutions Skeleton */}
        <div style={{ marginBottom: '28px' }}>
          <div className="mom-shimmer-bar" style={{ width: '240px', height: '18px', marginBottom: '14px' }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {[1, 2].map((res) => (
              <div
                key={res}
                style={{
                  padding: '16px',
                  borderRadius: '12px',
                  border: `1.5px solid ${themeColor}`,
                  background: isWingA ? 'rgba(5, 150, 105, 0.02)' : 'rgba(37, 99, 235, 0.02)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <div className="mom-shimmer-chip" style={{ width: '130px', height: '22px' }} />
                  <div className="mom-shimmer-chip" style={{ width: '120px', height: '22px' }} />
                </div>
                <div className="mom-shimmer-bar" style={{ width: '65%', height: '16px', marginBottom: '10px' }} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '10px' }}>
                  <div className="mom-shimmer-bar" style={{ width: '96%', height: '12px' }} />
                  <div className="mom-shimmer-bar" style={{ width: '90%', height: '12px' }} />
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <div className="mom-shimmer-bar" style={{ width: '140px', height: '12px' }} />
                  <div className="mom-shimmer-bar" style={{ width: '140px', height: '12px' }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 7. Action Accountability Register Skeleton */}
        <div style={{ marginBottom: '30px' }}>
          <div className="mom-shimmer-bar" style={{ width: '280px', height: '18px', marginBottom: '14px' }} />
          <div style={{ border: '1px solid #e2e8f0', borderRadius: '10px', overflow: 'hidden' }}>
            <div style={{ background: '#f1f5f9', padding: '12px 16px', display: 'grid', gridTemplateColumns: '80px 2fr 1fr 1fr 90px', gap: '12px' }}>
              {[1, 2, 3, 4, 5].map((h) => (
                <div key={h} className="mom-shimmer-bar" style={{ height: '12px' }} />
              ))}
            </div>
            {[1, 2, 3].map((row) => (
              <div key={row} style={{ padding: '12px 16px', borderTop: '1px solid #f1f5f9', display: 'grid', gridTemplateColumns: '80px 2fr 1fr 1fr 90px', gap: '12px', alignItems: 'center' }}>
                <div className="mom-shimmer-chip" style={{ width: '60px', height: '18px' }} />
                <div className="mom-shimmer-bar" style={{ width: '85%', height: '14px' }} />
                <div className="mom-shimmer-bar" style={{ width: '70%', height: '14px' }} />
                <div className="mom-shimmer-bar" style={{ width: '75px', height: '14px' }} />
                <div className="mom-shimmer-chip" style={{ width: '65px', height: '18px' }} />
              </div>
            ))}
          </div>
        </div>

        {/* 8. Signatures Block Skeleton */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px', paddingTop: '20px', borderTop: '1px solid #e2e8f0' }}>
          {[1, 2, 3].map((s) => (
            <div key={s} style={{ textAlign: 'center' }}>
              <div className="mom-shimmer-bar" style={{ width: '120px', height: '1px', margin: '40px auto 8px', background: '#cbd5e1' }} />
              <div className="mom-shimmer-bar" style={{ width: '130px', height: '14px', margin: '0 auto 4px' }} />
              <div className="mom-shimmer-bar" style={{ width: '90px', height: '11px', margin: '0 auto' }} />
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}
