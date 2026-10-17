import React from 'react';
import LiquidGlassCard from './LiquidGlassCard.jsx';

/**
 * KpiEmptyState
 * Translucent state card when metrics or telemetry are unconfigured or unavailable
 */
export default function KpiEmptyState({
  title = 'Metric Unavailable',
  description = 'Live telemetry for this metric is not configured or currently empty.',
  icon = '📊',
  className = ''
}) {
  return (
    <LiquidGlassCard className={`kpi-state-card ${className}`}>
      <span className="kpi-state-card__icon" role="img" aria-hidden="true">{icon}</span>
      <h4 className="kpi-state-card__title">{title}</h4>
      <p className="kpi-state-card__desc">{description}</p>
    </LiquidGlassCard>
  );
}
