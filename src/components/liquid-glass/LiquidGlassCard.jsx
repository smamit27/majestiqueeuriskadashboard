import React, { useRef, useCallback } from 'react';

/**
 * LiquidGlassCard
 * Implements Apple-inspired Liquid Glass aesthetic with curved reflective highlights,
 * ambient shadows, and optional pointer-reactive specular highlights.
 */
export default function LiquidGlassCard({
  children,
  className = '',
  variant = 'default', // 'default' | 'society' | 'finance' | 'maintenance' | 'operations' | 'warning' | 'danger'
  interactive = false,
  onClick,
  style = {},
  ariaLabel,
  enableTilt = false,
  ...props
}) {
  const cardRef = useRef(null);
  const isClickable = Boolean(onClick) || interactive;

  const handlePointerMove = useCallback((e) => {
    // Skip on touch or if prefers-reduced-motion
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (e.pointerType === 'touch') return;

    const el = cardRef.current;
    if (!el) return;

    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    el.style.setProperty('--mouse-x', `${x}px`);
    el.style.setProperty('--mouse-y', `${y}px`);

    if (enableTilt) {
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      const rotateX = ((y - centerY) / centerY) * -4; // Subtle max 4deg
      const rotateY = ((x - centerX) / centerX) * 4;
      el.style.transform = `perspective(800px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) translateY(-2px)`;
    }
  }, [enableTilt]);

  const handlePointerLeave = useCallback(() => {
    const el = cardRef.current;
    if (!el) return;
    if (enableTilt) {
      el.style.transform = '';
    }
  }, [enableTilt]);

  const handleKeyDown = useCallback((e) => {
    if (!isClickable || !onClick) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick(e);
    }
  }, [isClickable, onClick]);

  return (
    <div
      ref={cardRef}
      className={`liquid-glass-card ${isClickable ? 'liquid-glass-card--interactive' : ''} liquid-glass-kpi--${variant} ${className}`}
      onClick={isClickable ? onClick : undefined}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      onKeyDown={handleKeyDown}
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      aria-label={ariaLabel}
      style={style}
      {...props}
    >
      <div className="liquid-glass-card__specular" aria-hidden="true" />
      {children}
    </div>
  );
}
