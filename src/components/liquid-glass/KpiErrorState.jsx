import React from 'react';
import LiquidGlassCard from './LiquidGlassCard.jsx';
import './KpiErrorState.css';


/**
 * KpiErrorState
 * Translucent state card when metric synchronization fails
 */
export default function KpiErrorState({
  title = 'Telemetry Sync Error',
  error = 'Unable to synchronize telemetry with Firestore.',
  onRetry,
  className = ''
}) {
  return (
    <LiquidGlassCard variant="danger" className={`kpi-state-card ${className}`}>
      <span className="kpi-state-card__icon" role="img" aria-hidden="true">⚠️</span>
      <h4 className="kpi-state-card__title">{title}</h4>
      <p className="kpi-state-card__desc">{typeof error === 'string' ? error : error?.message || 'Error loading data'}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="kpi-error-state-s1"
        >
          Retry Sync
        </button>
      )}
    </LiquidGlassCard>
  );
}
