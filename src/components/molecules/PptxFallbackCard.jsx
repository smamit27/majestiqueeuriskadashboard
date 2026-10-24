import React from 'react';
import { Presentation, CheckCircle2, Download } from 'lucide-react';

/**
 * PptxFallbackCard Molecule
 * Informative card shown when a raw binary PowerPoint file (.pptx) is loaded.
 */
export default function PptxFallbackCard({
  activeDoc,
  onSwitchToPresentation
}) {
  return (
    <div className="ip-pptx-fallback-wrap">
      <div className="ip-pptx-fallback-card">
        <div className="ip-pptx-icon-box">
          <Presentation size={36} />
        </div>
        <h3 className="ip-pptx-card-title">
          {activeDoc.title}
        </h3>
        <p className="ip-pptx-card-text">
          You have loaded a PowerPoint presentation file. To view presentations directly inside the portal without external software:
        </p>
        <div className="ip-pptx-features-list">
          <div className="ip-pptx-feature-item">
            <CheckCircle2 size={16} color="#0d9488" />
            <span><strong>Native Web Presentation:</strong> Check the pre-bundled <em>Enterprise Workflow Presentation</em> above.</span>
          </div>
          <div className="ip-pptx-feature-item">
            <CheckCircle2 size={16} color="#0d9488" />
            <span><strong>Spreadsheets (XLSX/CSV):</strong> Check the live <em>Society Master Financial &amp; Maintenance Ledger</em>.</span>
          </div>
          <div className="ip-pptx-feature-item">
            <CheckCircle2 size={16} color="#0d9488" />
            <span><strong>Download &amp; Edit:</strong> Download the file anytime for Microsoft PowerPoint or Keynote.</span>
          </div>
        </div>
        <div className="ip-pptx-card-actions">
          <button
            type="button"
            onClick={onSwitchToPresentation}
            className="ip-btn-teal"
          >
            View Workflow HTML Slides
          </button>
          <a
            href={activeDoc.downloadUrl}
            download
            className="ip-btn-slate"
          >
            <Download size={14} /> Download File
          </a>
        </div>
      </div>
    </div>
  );
}
