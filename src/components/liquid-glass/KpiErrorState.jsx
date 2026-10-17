import React from 'react';
import LiquidGlassCard from './LiquidGlassCard.jsx';

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
          style={{
            marginTop: 8,
            padding: '4px 12px',
            fontSize: '0.74rem',
            fontWeight: 700,
            borderRadius: 8,
            border: '1px solid rgba(220, 38, 38, 0.3)',
            background: 'rgba(255, 255, 255, 0.8)',
            color: '#dc2626',
            cursor: 'pointer'
          }}
        >
          Retry Sync
        </button>
      )}
    </LiquidGlassCard>
  );
}
