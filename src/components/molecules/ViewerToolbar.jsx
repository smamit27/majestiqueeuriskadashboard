import React from 'react';
import { Printer, Download, Maximize2, Minimize2 } from 'lucide-react';
import ViewerBadge from '../atoms/ViewerBadge.jsx';
import ViewerZoomControls from '../atoms/ViewerZoomControls.jsx';

/**
 * ViewerToolbar Molecule
 * Renders top toolbar inside dark viewer frame: title, doc type, zoom controls, print, download & fullscreen.
 */
export default function ViewerToolbar({
  activeDoc,
  zoomLevel,
  isFullscreen,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  onPrint,
  onDownload,
  onToggleFullscreen
}) {
  return (
    <div className="ip-toolbar">
      <div className="ip-toolbar-left">
        <ViewerBadge type={activeDoc.type} />
        <span className="ip-doc-title">
          {activeDoc.title}
        </span>
      </div>

      <div className="ip-toolbar-right">
        {/* Zoom Controls */}
        <ViewerZoomControls
          zoomLevel={zoomLevel}
          onZoomIn={onZoomIn}
          onZoomOut={onZoomOut}
          onResetZoom={onResetZoom}
        />

        {/* Print Button */}
        <button
          type="button"
          onClick={onPrint}
          title="Print Document"
          className="ip-action-btn"
        >
          <Printer size={14} /> Print
        </button>

        {/* Download Button */}
        {activeDoc.isSpreadsheet ? (
          <button
            type="button"
            onClick={onDownload}
            title="Download Original"
            className="ip-download-btn ip-download-btn--xlsx"
          >
            <Download size={14} /> {activeDoc.downloadLabel || 'Download .xlsx'}
          </button>
        ) : (
          <a
            href={activeDoc.downloadUrl}
            download
            title="Download Original"
            className="ip-download-btn ip-download-btn--default"
          >
            <Download size={14} /> {activeDoc.downloadLabel}
          </a>
        )}

        {/* Fullscreen Button */}
        <button
          type="button"
          onClick={onToggleFullscreen}
          title="Toggle Fullscreen"
          className="ip-icon-btn"
        >
          {isFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
        </button>
      </div>
    </div>
  );
}
