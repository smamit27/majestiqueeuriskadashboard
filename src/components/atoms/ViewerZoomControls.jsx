import React from 'react';
import { ZoomIn, ZoomOut, RefreshCw } from 'lucide-react';

/**
 * ViewerZoomControls Atom
 * Zoom in, zoom out, percentage display, and zoom reset buttons.
 */
export default function ViewerZoomControls({
  zoomLevel = 100,
  onZoomIn,
  onZoomOut,
  onResetZoom
}) {
  return (
    <div className="ip-zoom-group">
      <button
        type="button"
        onClick={onZoomOut}
        title="Zoom Out"
        className="ip-zoom-btn"
        aria-label="Zoom Out"
      >
        <ZoomOut size={15} />
      </button>
      <span className="ip-zoom-label">
        {zoomLevel}%
      </span>
      <button
        type="button"
        onClick={onZoomIn}
        title="Zoom In"
        className="ip-zoom-btn"
        aria-label="Zoom In"
      >
        <ZoomIn size={15} />
      </button>
      <button
        type="button"
        onClick={onResetZoom}
        title="Reset Zoom"
        className="ip-zoom-btn"
        aria-label="Reset Zoom"
      >
        <RefreshCw size={12} />
      </button>
    </div>
  );
}
