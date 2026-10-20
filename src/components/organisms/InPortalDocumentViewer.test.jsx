import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import InPortalDocumentViewer, { DocumentViewerModal, IN_PORTAL_PRESETS } from './InPortalDocumentViewer.jsx';

describe('InPortalDocumentViewer Component', () => {
  it('renders heading and document selector buttons', () => {
    render(<InPortalDocumentViewer />);

    expect(screen.getByText(/In-Portal Document & Presentation Viewer/i)).toBeInTheDocument();
    expect(screen.getByText(/PPT: Enterprise Workflow/i)).toBeInTheDocument();
    expect(screen.getByText(/PDF: Builder Accounts/i)).toBeInTheDocument();
  });

  it('renders viewer toolbar with zoom controls and print button', () => {
    render(<InPortalDocumentViewer />);

    expect(screen.getByText('100%')).toBeInTheDocument();
    expect(screen.getByTitle('Zoom In')).toBeInTheDocument();
    expect(screen.getByTitle('Zoom Out')).toBeInTheDocument();
    expect(screen.getByTitle('Print Document')).toBeInTheDocument();
    expect(screen.getByTitle('Download Original')).toBeInTheDocument();
  });

  it('updates zoom level when clicking zoom buttons', () => {
    render(<InPortalDocumentViewer />);

    const zoomInBtn = screen.getByTitle('Zoom In');
    fireEvent.click(zoomInBtn);
    expect(screen.getByText('115%')).toBeInTheDocument();

    const zoomOutBtn = screen.getByTitle('Zoom Out');
    fireEvent.click(zoomOutBtn);
    expect(screen.getByText('100%')).toBeInTheDocument();
  });

  it('switches active document to PDF when clicking PDF button', () => {
    render(<InPortalDocumentViewer />);

    const pdfBtn = screen.getByText(/PDF: Builder Accounts/i);
    fireEvent.click(pdfBtn);

    const iframe = screen.getByTitle(/Builder Accounts Forensic Audit Full Dossier/i);
    expect(iframe).toBeInTheDocument();
    expect(iframe).toHaveAttribute('src', '/Majestique_Euriska_Builder_Forensic_Audit_Full_Dossier.pdf');
  });

  it('renders DocumentViewerModal and calls onClose when clicking close button', () => {
    const handleClose = vi.fn();
    render(
      <DocumentViewerModal
        documentUrl="/workflow_presentation.html"
        documentTitle="Test Presentation"
        documentType="PPT"
        onClose={handleClose}
      />
    );

    expect(screen.getByText('Test Presentation')).toBeInTheDocument();
    expect(screen.getByText('PPT')).toBeInTheDocument();

    const closeBtn = screen.getByText('✕');
    fireEvent.click(closeBtn);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });
});
