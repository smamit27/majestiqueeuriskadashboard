import React from 'react';
import LiquidGlassCard from './LiquidGlassCard.jsx';
import KpiSkeleton from './KpiSkeleton.jsx';
import KpiErrorState from './KpiErrorState.jsx';

/**
 * Format currency in Indian standard notation (e.g. ₹1,25,000 or ₹2.84L)
 */
function formatIndianCurrency(val) {
  if (typeof val !== 'number') return val;
  const abs = Math.abs(val);
  const sign = val < 0 ? '-' : '';

  if (abs >= 10000000) {
    return `${sign}₹${(abs / 10000000).toFixed(2)}Cr`;
  }
  if (abs >= 100000) {
    return `${sign}₹${(abs / 100000).toFixed(2)}L`;
  }
  return `${sign}₹${abs.toLocaleString('en-IN')}`;
}

/**
 * LiquidGlassKpi
 * Core reusable Apple-inspired Liquid Glass metric component.
 */
export default function LiquidGlassKpi({
  title,
  value,
  icon,
  description,
  trend, // { value: '+5.2%', isPositive: true, label?: 'vs last month' }
  status = 'society', // 'society' | 'finance' | 'maintenance' | 'operations' | 'warning' | 'danger'
  loading = false,
  error = null,
  onClick,
  currency = false,
  progress = null, // number 0-100
  breakdown = null, // Array<{ label: string, value: string | number }>
  tooltip = null,
  className = '',
  style = {},
  enableTilt = false,
  ariaLabel
}) {
  if (loading) {
    return <KpiSkeleton className={className} />;
  }

  if (error) {
    return <KpiErrorState title={title} error={error} className={className} />;
  }

  const isClickable = Boolean(onClick);
  const formattedValue = currency && typeof value === 'number'
    ? formatIndianCurrency(value)
    : value;

  const accessibleLabel = ariaLabel || `${title}: ${formattedValue}${description ? `, ${description}` : ''}`;

  return (
    <LiquidGlassCard
      variant={status}
      className={`liquid-glass-kpi ${className}`}
      onClick={onClick}
      enableTilt={enableTilt}
      ariaLabel={accessibleLabel}
      style={style}
    >
      {/* Top Header: Title & Icon */}
      <div className="liquid-glass-kpi__header">
        <div className="liquid-glass-kpi__title-wrap">
          <h3 className="liquid-glass-kpi__title">{title}</h3>
          {tooltip && (
            <span
              className="liquid-glass-kpi__tooltip-trigger"
              title={tooltip}
              aria-label={tooltip}
              tabIndex={0}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 16v-4" />
                <path d="M12 8h.01" />
              </svg>
            </span>
          )}
        </div>

        {icon && (
          <div className="liquid-glass-kpi__icon" aria-hidden="true">
            {icon}
          </div>
        )}
      </div>

      {/* Main Body: Value & Trend */}
      <div className="liquid-glass-kpi__body">
        <div className="liquid-glass-kpi__value">
          {formattedValue}
        </div>

        {trend && (
          <span
            className={`liquid-glass-kpi__trend ${
              trend.isPositive ? 'liquid-glass-kpi__trend--up' : 'liquid-glass-kpi__trend--down'
            }`}
            title={trend.label || 'Trend comparison'}
          >
            {trend.isPositive ? '↗' : '↘'} {trend.value}
          </span>
        )}
      </div>

      {/* Footer: Progress, Description & Breakdown Tags */}
      <div className="liquid-glass-kpi__footer">
        {typeof progress === 'number' && (
          <div className="liquid-glass-kpi__progress" role="progressbar" aria-valuenow={progress} aria-valuemin="0" aria-valuemax="100">
            <div
              className="liquid-glass-kpi__progress-fill"
              style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
            />
          </div>
        )}

        {description && (
          <p className="liquid-glass-kpi__desc">{description}</p>
        )}

        {Array.isArray(breakdown) && breakdown.length > 0 && (
          <div className="liquid-glass-kpi__breakdown">
            {breakdown.map((item, idx) => (
              <span key={idx} className="liquid-glass-kpi__tag">
                <strong>{item.label}:</strong> {item.value}
              </span>
            ))}
          </div>
        )}
      </div>
    </LiquidGlassCard>
  );
}
