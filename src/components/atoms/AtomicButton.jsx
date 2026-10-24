import React from 'react';

/**
 * AtomicButton Atom
 * Reusable project-wide button supporting variants: primary, secondary, danger, success, warning, ghost.
 */
export default function AtomicButton({
  children,
  variant = 'primary',
  size = 'md',
  icon: Icon,
  disabled = false,
  onClick,
  type = 'button',
  className = '',
  title,
  as: Component = 'button',
  ...rest
}) {
  const variantClass = `atomic-btn--${variant}`;
  const sizeClass = size === 'sm' ? 'atomic-btn--sm' : size === 'lg' ? 'atomic-btn--lg' : '';

  return (
    <Component
      type={Component === 'button' ? type : undefined}
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`atomic-btn ${variantClass} ${sizeClass} ${className}`.trim()}
      {...rest}
    >
      {Icon && <Icon size={size === 'sm' ? 14 : size === 'lg' ? 18 : 16} />}
      {children}
    </Component>
  );
}
