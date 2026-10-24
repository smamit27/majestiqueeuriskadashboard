import React from 'react';

/**
 * OpenUrlModal Molecule
 * Modal dialog for opening a document from an external web URL.
 */
export default function OpenUrlModal({
  isOpen,
  urlInput,
  onUrlInputChange,
  onSubmit,
  onClose
}) {
  if (!isOpen) return null;

  return (
    <div className="ip-modal-backdrop" onClick={onClose}>
      <div className="ip-modal-content" onClick={e => e.stopPropagation()}>
        <h3 className="ip-modal-title">
          Open Document from Web URL
        </h3>
        <p className="ip-modal-desc">
          Enter any accessible URL to a PDF, web document, or presentation to display it seamlessly inside this portal.
        </p>
        <form onSubmit={onSubmit}>
          <input
            type="url"
            value={urlInput}
            onChange={e => onUrlInputChange(e.target.value)}
            placeholder="https://example.com/document.pdf"
            required
            className="ip-modal-input"
          />
          <div className="ip-modal-actions">
            <button
              type="button"
              onClick={onClose}
              className="ip-btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="ip-btn-primary"
            >
              Open in Viewer
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
