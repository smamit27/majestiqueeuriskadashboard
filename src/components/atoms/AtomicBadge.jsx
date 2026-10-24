import React from 'react';

/**
 * AtomicBadge Atom
 * Reusable status pill with automatic status-to-color mapping or explicit variants.
 */
export default function AtomicBadge({
  children,
  variant,
  status,
  icon: Icon,
  className = ''
}) {
  let resolvedVariant = variant || 'neutral';

  if (status && !variant) {
    const s = String(status).toLowerCase();
    if (s.includes('overdue') || s.includes('fail') || s.includes('danger') || s.includes('error') || s.includes('critical') || s.includes('reject')) {
      resolvedVariant = 'danger';
    } else if (s.includes('clear') || s.includes('paid') || s.includes('active') || s.includes('resolve') || s.includes('approved') || s.includes('pass')) {
      resolvedVariant = 'success';
    } else if (s.includes('pend') || s.includes('due') || s.includes('warn') || s.includes('progress') || s.includes('review')) {
      resolvedVariant = 'warning';
    } else if (s.includes('advance') || s.includes('info') || s.includes('public')) {
      resolvedVariant = 'info';
    }
  }

  return (
    <span className={`atomic-badge atomic-badge--${resolvedVariant} ${className}`.trim()}>
      {Icon && <Icon size={12} />}
      {children || status}
    </span>
  );
}
