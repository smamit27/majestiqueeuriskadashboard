import React from 'react';

/**
 * Premium GlassCard component
 * Implements Apple-inspired glassmorphism with subtle highlights and fallback
 */
export default function GlassCard({
  children,
  className = '',
  variant = 'default', // 'default' | 'solid' | 'accent' | 'interactive' | 'flat'
  padding = 'default', // 'none' | 'sm' | 'default' | 'lg'
  style = {},
  onClick,
  ...props
}) {
  const paddingMap = {
    none: '0',
    sm: '14px 16px',
    default: '20px 24px',
    lg: '28px 32px'
  };

  const isInteractive = Boolean(onClick) || variant === 'interactive';

  const cardStyle = {
    padding: paddingMap[padding] || paddingMap.default,
    cursor: isInteractive ? 'pointer' : undefined,
    ...style
  };

  return (
    <div
      className={`glass-card glass-card--${variant} ${isInteractive ? 'glass-card--interactive' : ''} ${className}`}
      style={cardStyle}
      onClick={onClick}
      {...props}
    >
      {children}
    </div>
  );
}
