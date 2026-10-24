import React from 'react';

/**
 * AtomicIconButton Atom
 * Compact icon action button with hover transitions and accessibility labels.
 */
export default function AtomicIconButton({
  icon: Icon,
  onClick,
  title,
  ariaLabel,
  variant = 'secondary',
  size = 15,
  className = '',
  disabled = false
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={ariaLabel || title}
      disabled={disabled}
      className={`atomic-btn atomic-btn--${variant} atomic-btn--icon-only ${className}`.trim()}
    >
      {Icon && <Icon size={size} />}
    </button>
  );
}
