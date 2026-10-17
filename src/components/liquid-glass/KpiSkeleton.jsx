import React from 'react';
import LiquidGlassCard from './LiquidGlassCard.jsx';

/**
 * KpiSkeleton
 * Shimmering Liquid Glass placeholder to prevent cumulative layout shifts (CLS)
 */
export default function KpiSkeleton({ count = 1, className = '' }) {
  const items = Array.from({ length: count });

  if (count === 1) {
    return (
      <LiquidGlassCard className={`kpi-skeleton ${className}`} aria-busy="true" aria-label="Loading metric">
        <div className="liquid-glass-kpi__header">
          <div className="kpi-skeleton__line kpi-skeleton__title" />
          <div className="kpi-skeleton__line" style={{ width: 36, height: 36, borderRadius: 10 }} />
        </div>
        <div className="kpi-skeleton__line kpi-skeleton__value" />
        <div className="kpi-skeleton__line kpi-skeleton__sub" />
      </LiquidGlassCard>
    );
  }

  return (
    <>
      {items.map((_, i) => (
        <LiquidGlassCard key={i} className={`kpi-skeleton ${className}`} aria-busy="true" aria-label="Loading metric">
          <div className="liquid-glass-kpi__header">
            <div className="kpi-skeleton__line kpi-skeleton__title" />
            <div className="kpi-skeleton__line" style={{ width: 36, height: 36, borderRadius: 10 }} />
          </div>
          <div className="kpi-skeleton__line kpi-skeleton__value" />
          <div className="kpi-skeleton__line kpi-skeleton__sub" />
        </LiquidGlassCard>
      ))}
    </>
  );
}
