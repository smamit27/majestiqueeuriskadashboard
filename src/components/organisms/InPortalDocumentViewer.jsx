import React, { useState } from 'react';
import {
  FileText, Presentation, Maximize2, Minimize2, Download,
  Printer, ArrowLeft, ArrowRight, RefreshCw, ZoomIn, ZoomOut,
  ExternalLink, Eye, CheckCircle2, Shield
} from 'lucide-react';

export const IN_PORTAL_PRESETS = [
  {
    id: 'workflow_ppt',
    title: 'Enterprise Workflow & Project Lifecycle Presentation',
    type: 'PPT',
    category: 'Governance & Architecture',
    url: '/workflow_presentation.html',
    downloadUrl: '/Majestique_Euriska_Workflow_Engine_Presentation.pptx',
    downloadLabel: 'Download .pptx',
    description: '10-State transition model, Committee approval gates, milestones & operational architecture.'
  },
  {
    id: 'forensic_audit_pdf',
    title: 'Builder Accounts Forensic Audit Full Dossier',
    type: 'PDF',
    category: 'Audit & Legal',
    url: '/Majestique_Euriska_Builder_Forensic_Audit_Full_Dossier.pdf',
    downloadUrl: '/Majestique_Euriska_Builder_Forensic_Audit_Full_Dossier.pdf',
    downloadLabel: 'Download .pdf',
    description: 'Comprehensive financial reconciliation by CA Hardik Mehta: corpus fund, common dues, and 47 defects.'
  }
];

export default function InPortalDocumentViewer({ initialDocId = 'workflow_ppt' }) {
  const [selectedDocId, setSelectedDocId] = useState(initialDocId);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(100);
  const [customDoc, setCustomDoc] = useState(null);
  const [urlModalOpen, setUrlModalOpen] = useState(false);
  const [customUrlInput, setCustomUrlInput] = useState('');

  const activeDoc = customDoc && selectedDocId === 'custom'
    ? customDoc
    : (IN_PORTAL_PRESETS.find(d => d.id === selectedDocId) || IN_PORTAL_PRESETS[0]);

  const handleZoomIn = () => setZoomLevel(prev => Math.min(160, prev + 15));
  const handleZoomOut = () => setZoomLevel(prev => Math.max(70, prev - 15));
  const handleResetZoom = () => setZoomLevel(100);

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    const isPpt = file.name.toLowerCase().endsWith('.ppt') || file.name.toLowerCase().endsWith('.pptx');
    const isHtml = file.name.toLowerCase().endsWith('.html') || file.name.toLowerCase().endsWith('.htm');
    const objectUrl = URL.createObjectURL(file);
    
    setCustomDoc({
      id: 'custom',
      title: file.name,
      type: isPdf ? 'PDF' : isPpt ? 'PPT' : isHtml ? 'SLIDES' : 'DOC',
      category: 'Uploaded File',
      url: objectUrl,
      downloadUrl: objectUrl,
      downloadLabel: `Download (${file.name})`,
      isCustom: true,
      isPptxBinary: isPpt
    });
    setSelectedDocId('custom');
    setZoomLevel(100);
  };

  const handleOpenUrl = (e) => {
    e.preventDefault();
    if (!customUrlInput.trim()) return;
    const url = customUrlInput.trim();
    const isPdf = url.toLowerCase().includes('.pdf');
    setCustomDoc({
      id: 'custom',
      title: url.split('/').pop()?.split('?')[0] || 'Web Document',
      type: isPdf ? 'PDF' : 'WEB',
      category: 'External Resource',
      url: url,
      downloadUrl: url,
      downloadLabel: 'Open Link',
      isCustom: true
    });
    setSelectedDocId('custom');
    setUrlModalOpen(false);
    setCustomUrlInput('');
  };

  const toggleFullscreen = () => {
    const elem = document.getElementById('in-portal-viewer-frame');
    if (!elem) return;
    if (!document.fullscreenElement) {
      elem.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', width: '100%' }}>
      {/* ── Header Banner ── */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(248,250,252,0.9) 100%)',
        backdropFilter: 'blur(16px)',
        border: '1px solid rgba(226,232,240,0.8)',
        borderRadius: '16px',
        padding: '20px 24px',
        boxShadow: '0 8px 30px rgba(0,0,0,0.03)',
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '16px'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
            <div style={{
              background: 'linear-gradient(135deg, #0d9488, #059669)',
              color: '#ffffff',
              padding: '8px',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(13,148,136,0.25)'
            }}>
              <Eye size={22} />
            </div>
            <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800, color: '#0f172a' }}>
              In-Portal Document &amp; Presentation Viewer
            </h2>
          </div>
          <p style={{ margin: 0, fontSize: '0.86rem', color: '#64748b' }}>
            Open PowerPoint slides, audit reports, and society PDFs directly inside this portal without leaving the browser.
          </p>
        </div>

        {/* Action Controls & Document Selector Pills */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
          {IN_PORTAL_PRESETS.map(docItem => (
            <button
              key={docItem.id}
              onClick={() => { setSelectedDocId(docItem.id); setZoomLevel(100); }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 14px',
                borderRadius: '10px',
                fontSize: '0.82rem',
                fontWeight: selectedDocId === docItem.id ? 700 : 500,
                border: selectedDocId === docItem.id ? '1.5px solid #0d9488' : '1px solid #cbd5e1',
                background: selectedDocId === docItem.id ? '#f0fdfa' : '#ffffff',
                color: selectedDocId === docItem.id ? '#0d9488' : '#475569',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              {docItem.type === 'PPT' ? <Presentation size={15} color={selectedDocId === docItem.id ? '#0d9488' : '#64748b'} /> : <FileText size={15} color={selectedDocId === docItem.id ? '#0d9488' : '#64748b'} />}
              <span>{docItem.type}: {docItem.title.split(' ')[0]} {docItem.title.split(' ')[1]}…</span>
            </button>
          ))}

          {customDoc && (
            <button
              onClick={() => setSelectedDocId('custom')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 14px',
                borderRadius: '10px',
                fontSize: '0.82rem',
                fontWeight: selectedDocId === 'custom' ? 700 : 500,
                border: selectedDocId === 'custom' ? '1.5px solid #0d9488' : '1px solid #cbd5e1',
                background: selectedDocId === 'custom' ? '#f0fdfa' : '#ffffff',
                color: selectedDocId === 'custom' ? '#0d9488' : '#475569',
                cursor: 'pointer'
              }}
            >
              <FileText size={15} color="#0d9488" />
              <span>{customDoc.type}: {customDoc.title.slice(0, 16)}…</span>
            </button>
          )}

          {/* Upload Local File Button */}
          <label
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              borderRadius: '10px',
              fontSize: '0.82rem',
              fontWeight: 600,
              border: '1px dashed #0d9488',
              background: '#f0fdfa',
              color: '#0d9488',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
            title="Upload any PDF or Presentation from your computer to view in-portal"
          >
            <Download size={14} style={{ transform: 'rotate(180deg)' }} />
            <span>Open Local File</span>
            <input
              type="file"
              accept=".pdf,.html,.htm,.txt,.png,.jpg,.jpeg,.webp,.pptx,.ppt"
              onChange={handleFileUpload}
              style={{ display: 'none' }}
            />
          </label>

          {/* Open Web URL Button */}
          <button
            onClick={() => setUrlModalOpen(true)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 12px',
              borderRadius: '10px',
              fontSize: '0.82rem',
              fontWeight: 600,
              border: '1px solid #cbd5e1',
              background: '#ffffff',
              color: '#475569',
              cursor: 'pointer'
            }}
            title="Open document via web URL"
          >
            <ExternalLink size={14} />
            <span>Open URL</span>
          </button>
        </div>
      </div>

      {/* ── Viewer Frame Container ── */}
      <div
        id="in-portal-viewer-frame"
        style={{
          background: '#1e293b',
          borderRadius: '16px',
          border: '1px solid #334155',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 12px 40px rgba(0,0,0,0.18)'
        }}
      >
        {/* Viewer Toolbar */}
        <div style={{
          background: '#0f172a',
          padding: '10px 16px',
          borderBottom: '1px solid #334155',
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '12px',
          color: '#ffffff'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{
              background: activeDoc.type === 'PPT' ? '#C49B4F' : '#0d9488',
              color: '#ffffff',
              padding: '2px 8px',
              borderRadius: '6px',
              fontSize: '0.72rem',
              fontWeight: 800
            }}>
              {activeDoc.type}
            </span>
            <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#f8fafc' }}>
              {activeDoc.title}
            </span>
          </div>

          {/* Controls: Zoom, Print, Download, Fullscreen */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', background: '#1e293b', borderRadius: '8px', padding: '2px 6px' }}>
              <button
                onClick={handleZoomOut}
                title="Zoom Out"
                style={{ background: 'none', border: 'none', color: '#94a3b8', padding: '4px', cursor: 'pointer' }}
              >
                <ZoomOut size={15} />
              </button>
              <span style={{ fontSize: '0.76rem', color: '#e2e8f0', minWidth: '42px', textAlign: 'center' }}>
                {zoomLevel}%
              </span>
              <button
                onClick={handleZoomIn}
                title="Zoom In"
                style={{ background: 'none', border: 'none', color: '#94a3b8', padding: '4px', cursor: 'pointer' }}
              >
                <ZoomIn size={15} />
              </button>
              <button
                onClick={handleResetZoom}
                title="Reset Zoom"
                style={{ background: 'none', border: 'none', color: '#94a3b8', padding: '4px', cursor: 'pointer' }}
              >
                <RefreshCw size={12} />
              </button>
            </div>

            <button
              onClick={() => {
                const iframe = document.getElementById('viewer-iframe');
                if (iframe?.contentWindow) {
                  iframe.contentWindow.print();
                } else {
                  window.print();
                }
              }}
              title="Print Document"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                background: '#1e293b',
                border: '1px solid #334155',
                color: '#e2e8f0',
                padding: '6px 12px',
                borderRadius: '8px',
                fontSize: '0.78rem',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              <Printer size={14} /> Print
            </button>

            <a
              href={activeDoc.downloadUrl}
              download
              title="Download Original"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                background: '#0d9488',
                border: 'none',
                color: '#ffffff',
                padding: '6px 14px',
                borderRadius: '8px',
                fontSize: '0.78rem',
                fontWeight: 700,
                textDecoration: 'none',
                cursor: 'pointer'
              }}
            >
              <Download size={14} /> {activeDoc.downloadLabel}
            </a>

            <button
              onClick={toggleFullscreen}
              title="Toggle Fullscreen"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                background: '#1e293b',
                border: '1px solid #334155',
                color: '#e2e8f0',
                padding: '6px 10px',
                borderRadius: '8px',
                cursor: 'pointer'
              }}
            >
              {isFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
            </button>
          </div>
        </div>

        {/* Embedded Document Viewport */}
        <div style={{
          width: '100%',
          height: isFullscreen ? 'calc(100vh - 56px)' : '78vh',
          minHeight: '600px',
          background: '#0b1329',
          overflow: 'auto',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          position: 'relative'
        }}>
          {activeDoc.isPptxBinary ? (
            <div style={{
              background: '#0f172a',
              border: '1px solid #334155',
              borderRadius: '16px',
              padding: '36px',
              maxWidth: '640px',
              textAlign: 'center',
              color: '#ffffff',
              boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
              margin: '20px'
            }}>
              <div style={{
                width: '64px',
                height: '64px',
                borderRadius: '16px',
                background: 'rgba(196,155,79,0.15)',
                color: '#C49B4F',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px auto'
              }}>
                <Presentation size={36} />
              </div>
              <h3 style={{ margin: '0 0 10px 0', fontSize: '1.25rem', fontWeight: 800 }}>
                {activeDoc.title}
              </h3>
              <p style={{ fontSize: '0.88rem', color: '#94a3b8', lineHeight: 1.6, marginBottom: '20px' }}>
                You have loaded a raw PowerPoint presentation file. To view presentations directly inside the portal without external software:
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', textAlign: 'left', background: '#1e293b', padding: '16px', borderRadius: '12px', marginBottom: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.84rem', color: '#e2e8f0' }}>
                  <CheckCircle2 size={16} color="#0d9488" />
                  <span><strong>Native Web Presentation:</strong> Check the pre-bundled <em>Enterprise Workflow Presentation</em> above.</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.84rem', color: '#e2e8f0' }}>
                  <CheckCircle2 size={16} color="#0d9488" />
                  <span><strong>Export as PDF:</strong> Save any slide deck as PDF to enable live zoom, instant scrolling, and in-portal printing.</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.84rem', color: '#e2e8f0' }}>
                  <CheckCircle2 size={16} color="#0d9488" />
                  <span><strong>Download &amp; Edit:</strong> Download the .pptx file anytime for Microsoft PowerPoint or Keynote.</span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                <button
                  onClick={() => setSelectedDocId('workflow_ppt')}
                  style={{
                    padding: '10px 18px',
                    borderRadius: '10px',
                    background: '#0d9488',
                    border: 'none',
                    color: '#ffffff',
                    fontWeight: 700,
                    fontSize: '0.84rem',
                    cursor: 'pointer'
                  }}
                >
                  View Workflow HTML Slides
                </button>
                <a
                  href={activeDoc.downloadUrl}
                  download
                  style={{
                    padding: '10px 18px',
                    borderRadius: '10px',
                    background: '#334155',
                    color: '#ffffff',
                    textDecoration: 'none',
                    fontWeight: 600,
                    fontSize: '0.84rem',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <Download size={14} /> Download File
                </a>
              </div>
            </div>
          ) : (
            <iframe
              id="viewer-iframe"
              src={activeDoc.url}
              title={activeDoc.title}
              style={{
                width: `${zoomLevel}%`,
                height: `${zoomLevel}%`,
                minHeight: '100%',
                minWidth: '100%',
                border: 'none',
                borderRadius: '0',
                background: '#ffffff'
              }}
            />
          )}
        </div>
      </div>

      {/* ── Open Web URL Modal ── */}
      {urlModalOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15,23,42,0.7)',
          backdropFilter: 'blur(6px)',
          zIndex: 10000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}
        onClick={() => setUrlModalOpen(false)}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '16px',
              maxWidth: '520px',
              width: '100%',
              padding: '24px',
              boxShadow: '0 25px 60px rgba(0,0,0,0.25)'
            }}
            onClick={e => e.stopPropagation()}
          >
            <h3 style={{ margin: '0 0 8px 0', fontSize: '1.2rem', fontWeight: 800, color: '#0f172a' }}>
              Open Document from Web URL
            </h3>
            <p style={{ margin: '0 0 16px 0', fontSize: '0.84rem', color: '#64748b' }}>
              Enter any accessible URL to a PDF, web document, or presentation to display it seamlessly inside this portal.
            </p>
            <form onSubmit={handleOpenUrl}>
              <input
                type="url"
                value={customUrlInput}
                onChange={e => setCustomUrlInput(e.target.value)}
                placeholder="https://example.com/document.pdf"
                required
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  borderRadius: '10px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.9rem',
                  outline: 'none',
                  boxSizing: 'border-box',
                  marginBottom: '16px'
                }}
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setUrlModalOpen(false)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    background: '#f1f5f9',
                    border: 'none',
                    color: '#475569',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '8px 18px',
                    borderRadius: '8px',
                    background: '#0d9488',
                    border: 'none',
                    color: '#ffffff',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  Open in Viewer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ── In-Portal Document Modal (Helper for Document Vault and Workflow Manager) ─
export function DocumentViewerModal({ documentUrl, documentTitle, documentType = 'PDF', onClose }) {
  if (!documentUrl) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10000,
        background: 'rgba(15,23,42,0.75)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '1100px',
          height: '90vh',
          background: '#ffffff',
          borderRadius: '18px',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 25px 80px rgba(0,0,0,0.3)'
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{
          padding: '14px 20px',
          background: '#0f172a',
          color: '#ffffff',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ background: '#0d9488', padding: '2px 8px', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 800 }}>
              {documentType}
            </span>
            <span style={{ fontSize: '0.95rem', fontWeight: 700 }}>
              {documentTitle}
            </span>
          </div>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <a
              href={documentUrl}
              download
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                background: '#0d9488',
                color: '#fff',
                padding: '6px 12px',
                borderRadius: '8px',
                fontSize: '0.76rem',
                fontWeight: 700,
                textDecoration: 'none'
              }}
            >
              <Download size={13} /> Download
            </a>
            <button
              onClick={onClose}
              style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '1.2rem' }}
            >
              ✕
            </button>
          </div>
        </div>

        <iframe
          src={documentUrl}
          title={documentTitle}
          style={{ width: '100%', height: '100%', border: 'none' }}
        />
      </div>
    </div>
  );
}
