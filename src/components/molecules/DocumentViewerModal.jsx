import React from 'react';
import { Printer, Download } from 'lucide-react';
import ViewerBadge from '../atoms/ViewerBadge.jsx';

/**
 * DocumentViewerModal Molecule
 * Standalone reusable modal to preview documents from anywhere in the portal.
 */
export default function DocumentViewerModal({
  documentUrl,
  documentTitle,
  documentType = 'PDF',
  onClose
}) {
  if (!documentUrl) return null;

  const handlePrintModal = () => {
    const isPdf = documentType === 'PDF' || documentUrl?.toLowerCase().includes('.pdf');
    if (isPdf && documentUrl) {
      const printWin = window.open(documentUrl, '_blank');
      if (printWin) {
        printWin.focus();
        try {
          printWin.onload = () => {
            try { printWin.print(); } catch {}
          };
        } catch {}
      }
      return;
    }

    const iframe = document.getElementById('modal-viewer-iframe');
    if (iframe?.contentWindow) {
      try {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
        return;
      } catch (err) {
        console.warn('Modal print fallback:', err);
      }
    }
    window.print();
  };

  return (
    <div
      className="ip-doc-modal-backdrop document-viewer-modal-backdrop"
      onClick={onClose}
    >
      <div
        className="ip-doc-modal-content document-viewer-modal-content"
        onClick={e => e.stopPropagation()}
      >
        <div className="ip-doc-modal-header no-print">
          <div className="ip-doc-modal-title-group">
            <ViewerBadge type={documentType} />
            <span className="ip-doc-modal-title">
              {documentTitle}
            </span>
          </div>

          <div className="ip-doc-modal-actions">
            <button
              type="button"
              onClick={handlePrintModal}
              title="Print Document"
              className="ip-action-btn"
            >
              <Printer size={13} /> Print
            </button>
            <a
              href={documentUrl}
              download
              className="ip-download-btn ip-download-btn--default"
            >
              <Download size={13} /> Download
            </a>
            <button
              type="button"
              onClick={onClose}
              className="ip-doc-modal-close"
              aria-label="Close modal"
            >
              ✕
            </button>
          </div>
        </div>

        <iframe
          id="modal-viewer-iframe"
          src={documentUrl}
          title={documentTitle}
          className="ip-doc-modal-iframe"
        />
      </div>
    </div>
  );
}
