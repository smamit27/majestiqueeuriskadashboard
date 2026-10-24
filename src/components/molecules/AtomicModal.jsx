import React from 'react';

/**
 * AtomicModal Molecule
 * Generic accessible modal popup with blurred backdrop, header, body, and footer.
 */
export default function AtomicModal({
  isOpen,
  title,
  onClose,
  children,
  footer,
  maxWidth = '580px',
  className = ''
}) {
  if (!isOpen) return null;

  return (
    <div className="atomic-modal-backdrop" onClick={onClose}>
      <div
        className={`atomic-modal-container ${className}`.trim()}
        style={{ maxWidth }}
        onClick={e => e.stopPropagation()}
      >
        <div className="atomic-modal-header">
          <h3 className="atomic-modal-title">
            {title}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="atomic-modal-close"
            aria-label="Close dialog"
          >
            ✕
          </button>
        </div>

        <div className="atomic-modal-body">
          {children}
        </div>

        {footer && (
          <div className="atomic-modal-footer">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
