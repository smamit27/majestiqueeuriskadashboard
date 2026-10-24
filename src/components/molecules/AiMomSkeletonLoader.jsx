import React, { useState, useEffect } from 'react';
import { Bot, Sparkles, Clock, CheckCircle2, FileText, Users, ShieldCheck } from 'lucide-react';
import './AiMomSkeletonLoader.css';


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
      className="ai-mom-skeleton-loader-s1"
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
        className="ai-mom-skeleton-loader-s2" style={{ border: `1.5px solid ${themeColor}`, boxShadow: `0 6px 20px ${isWingA ? 'rgba(5, 150, 105, 0.12)' : 'rgba(37, 99, 235, 0.12)'}` }}
      >
        <div className="ai-mom-skeleton-loader-s3">
          <div className="ai-mom-skeleton-loader-s4">
            <div
              className="ai-mom-skeleton-loader-s5" style={{ background: themeBg, color: themeColor }}
            >
              <Bot size={20} />
            </div>
            <div>
              <div className="ai-mom-skeleton-loader-s6">
                <span className="ai-mom-skeleton-loader-s7">
                  AI Secretary Agent Active
                </span>
                <span
                  className="ai-mom-skeleton-loader-s8" style={{ background: themeColor }}
                >
                  {isWingA ? "WING 'A' SCOPE" : "COMMON CAMPUS SCOPE"}
                </span>
              </div>
              <div className="ai-mom-skeleton-loader-s9" style={{ color: themeColor }}>
                <Sparkles size={13} />
                <span>{stages[currentStageIdx]}</span>
              </div>
            </div>
          </div>

          <div className="ai-mom-skeleton-loader-s10">
            <Clock size={14} />
            <span>Drafting legal document...</span>
          </div>
        </div>

        {/* Shimmer progress line */}
        <div className="ai-mom-skeleton-loader-s11">
          <div
            className="ai-mom-skeleton-loader-s12" style={{ background: `linear-gradient(90deg, ${themeColor} 0%, #38bdf8 50%, ${themeColor} 100%)` }}
          />
        </div>
      </div>

      {/* ── Skeleton Letterhead Paper Document ── */}
      <div
        className="ai-mom-skeleton-loader-s13"
      >
        {/* Scope Watermark Accent */}
        <div
          className="ai-mom-skeleton-loader-s14" style={{ background: themeBg, color: themeColor }}
        >
          <ShieldCheck size={14} />
          {isWingA ? "MAJESTIQUE EURISKA — WING 'A'" : 'MAJESTIQUE EURISKA — COMMON'}
        </div>

        {/* 1. Header Letterhead Shimmer */}
        <div className="ai-mom-skeleton-loader-s15">
          <div className="mom-shimmer-bar ai-mom-skeleton-loader-s16" />
          <div className="mom-shimmer-bar ai-mom-skeleton-loader-s17" />
          <div className="mom-shimmer-bar ai-mom-skeleton-loader-s18" />
          <div className="mom-shimmer-bar ai-mom-skeleton-loader-s19" />
        </div>

        {/* 2. Meeting Metadata Grid Skeleton */}
        <div className="ai-mom-skeleton-loader-s20">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="ai-mom-skeleton-loader-s21">
              <div className="mom-shimmer-bar ai-mom-skeleton-loader-s22" />
              <div className="mom-shimmer-bar ai-mom-skeleton-loader-s23" />
            </div>
          ))}
        </div>

        {/* 3. Attendees & Quorum Chips Skeleton */}
        <div className="ai-mom-skeleton-loader-s24">
          <div className="ai-mom-skeleton-loader-s25">
            <div className="mom-shimmer-bar ai-mom-skeleton-loader-s26" />
            <div className="mom-shimmer-chip ai-mom-skeleton-loader-s27" />
          </div>
          <div className="ai-mom-skeleton-loader-s28">
            {[140, 160, 120, 150, 130, 170, 110].map((w, idx) => (
              <div key={idx} className="mom-shimmer-chip ai-mom-skeleton-loader-s29" style={{ width: `${w}px` }} />
            ))}
          </div>
        </div>

        {/* 4. Executive Summary Skeleton */}
        <div className="ai-mom-skeleton-loader-s30">
          <div className="ai-mom-skeleton-loader-s31">
            <div className="mom-shimmer-bar ai-mom-skeleton-loader-s32" />
          </div>
          <div className="ai-mom-skeleton-loader-s33">
            <div className="mom-shimmer-bar ai-mom-skeleton-loader-s34" />
            <div className="mom-shimmer-bar ai-mom-skeleton-loader-s35" />
            <div className="mom-shimmer-bar ai-mom-skeleton-loader-s36" />
            <div className="mom-shimmer-bar ai-mom-skeleton-loader-s37" />
          </div>
        </div>

        {/* 5. Agenda & Discussions Skeleton Cards */}
        <div className="ai-mom-skeleton-loader-s30">
          <div className="mom-shimmer-bar ai-mom-skeleton-loader-s38" />
          <div className="ai-mom-skeleton-loader-s39">
            {[1, 2].map((card) => (
              <div key={card} className="ai-mom-skeleton-loader-s40">
                <div className="ai-mom-skeleton-loader-s41">
                  <div className="mom-shimmer-chip ai-mom-skeleton-loader-s42" />
                  <div className="mom-shimmer-bar ai-mom-skeleton-loader-s43" />
                </div>
                <div className="ai-mom-skeleton-loader-s44">
                  <div className="mom-shimmer-bar ai-mom-skeleton-loader-s45" />
                  <div className="mom-shimmer-bar ai-mom-skeleton-loader-s46" />
                </div>
                <div className="ai-mom-skeleton-loader-s47" style={{ borderLeft: `3px solid ${themeColor}` }}>
                  <div className="mom-shimmer-bar ai-mom-skeleton-loader-s48" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 6. Statutory Resolutions Skeleton */}
        <div className="ai-mom-skeleton-loader-s30">
          <div className="mom-shimmer-bar ai-mom-skeleton-loader-s49" />
          <div className="ai-mom-skeleton-loader-s39">
            {[1, 2].map((res) => (
              <div
                key={res}
                className={`ai-mom-skeleton-loader-s50 ${(isWingA ? 'ai-mom-skeleton-loader-cond-1-true' : 'ai-mom-skeleton-loader-cond-2-false')}`} style={{ border: `1.5px solid ${themeColor}` }}
              >
                <div className="ai-mom-skeleton-loader-s51">
                  <div className="mom-shimmer-chip ai-mom-skeleton-loader-s52" />
                  <div className="mom-shimmer-chip ai-mom-skeleton-loader-s53" />
                </div>
                <div className="mom-shimmer-bar ai-mom-skeleton-loader-s54" />
                <div className="ai-mom-skeleton-loader-s55">
                  <div className="mom-shimmer-bar ai-mom-skeleton-loader-s56" />
                  <div className="mom-shimmer-bar ai-mom-skeleton-loader-s57" />
                </div>
                <div className="ai-mom-skeleton-loader-s58">
                  <div className="mom-shimmer-bar ai-mom-skeleton-loader-s59" />
                  <div className="mom-shimmer-bar ai-mom-skeleton-loader-s59" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 7. Action Accountability Register Skeleton */}
        <div className="ai-mom-skeleton-loader-s60">
          <div className="mom-shimmer-bar ai-mom-skeleton-loader-s61" />
          <div className="ai-mom-skeleton-loader-s62">
            <div className="ai-mom-skeleton-loader-s63">
              {[1, 2, 3, 4, 5].map((h) => (
                <div key={h} className="mom-shimmer-bar ai-mom-skeleton-loader-s64" />
              ))}
            </div>
            {[1, 2, 3].map((row) => (
              <div key={row} className="ai-mom-skeleton-loader-s65">
                <div className="mom-shimmer-chip ai-mom-skeleton-loader-s66" />
                <div className="mom-shimmer-bar ai-mom-skeleton-loader-s36" />
                <div className="mom-shimmer-bar ai-mom-skeleton-loader-s67" />
                <div className="mom-shimmer-bar ai-mom-skeleton-loader-s68" />
                <div className="mom-shimmer-chip ai-mom-skeleton-loader-s69" />
              </div>
            ))}
          </div>
        </div>

        {/* 8. Signatures Block Skeleton */}
        <div className="ai-mom-skeleton-loader-s70">
          {[1, 2, 3].map((s) => (
            <div key={s} className="ai-mom-skeleton-loader-s71">
              <div className="mom-shimmer-bar ai-mom-skeleton-loader-s72" />
              <div className="mom-shimmer-bar ai-mom-skeleton-loader-s73" />
              <div className="mom-shimmer-bar ai-mom-skeleton-loader-s74" />
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}
