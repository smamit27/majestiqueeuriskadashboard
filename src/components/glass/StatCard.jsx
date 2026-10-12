import React from 'react';

/**
 * Premium StatCard component for Executive KPIs
 * Supports icon, badge, trend, progress bar, and clickable drill-down
 */
export default function StatCard({
  label,
  value,
  subtext,
  icon,
  badge,
  trend, // { value: '+5.2%', isPositive: true, label: 'vs last month' }
  color = 'crimson', // 'crimson' | 'emerald' | 'amber' | 'blue' | 'purple' | 'slate'
  progress, // number 0-100
  onClick,
  className = '',
  style = {}
}) {
  const isClickable = Boolean(onClick);

  return (
    <div
      className={`glass-stat-card glass-stat-card--${color} ${isClickable ? 'glass-stat-card--clickable' : ''} ${className}`}
      onClick={onClick}
      style={style}
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onKeyDown={isClickable ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } } : undefined}
    >
      <div className="glass-stat-card__top">
        <span className="glass-stat-card__label">{label}</span>
        {badge && (
          <span className={`glass-stat-card__badge glass-stat-card__badge--${color}`}>
            {badge}
          </span>
        )}
        {icon && !badge && (
          <span className="glass-stat-card__icon">{icon}</span>
        )}
      </div>

      <div className="glass-stat-card__middle">
        <span className="glass-stat-card__value">{value}</span>
        {trend && (
          <span className={`glass-stat-card__trend ${trend.isPositive ? 'glass-stat-card__trend--up' : 'glass-stat-card__trend--down'}`}>
            {trend.isPositive ? '↗' : '↘'} {trend.value}
          </span>
        )}
      </div>

      {subtext && (
        <p className="glass-stat-card__sub">{subtext}</p>
      )}

      {typeof progress === 'number' && (
        <div className="glass-stat-card__progress">
          <div
            className={`glass-stat-card__progress-bar glass-stat-card__progress-bar--${color}`}
            style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
          />
        </div>
      )}
    </div>
  );
}
