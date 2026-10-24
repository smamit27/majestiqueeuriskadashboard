import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import InPortalDocumentViewer, { DocumentViewerModal, IN_PORTAL_PRESETS, getColumnLetter } from './InPortalDocumentViewer.jsx';

describe('InPortalDocumentViewer Component', () => {
  it('renders heading and document selector buttons including PPT, PDF, and XLSX', () => {
    render(<InPortalDocumentViewer />);

    expect(screen.getByText(/In-Portal Document & Presentation Viewer/i)).toBeInTheDocument();
    expect(screen.getByText(/PPT: Enterprise Workflow/i)).toBeInTheDocument();
    expect(screen.getByText(/PDF: Builder Accounts/i)).toBeInTheDocument();
    expect(screen.getByText(/XLSX: Society Master/i)).toBeInTheDocument();
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

  it('switches to XLSX spreadsheet viewer and displays interactive sheets and grid', () => {
    render(<InPortalDocumentViewer />);

    const xlsxBtn = screen.getByText(/XLSX: Society Master/i);
    fireEvent.click(xlsxBtn);

    // Displays spreadsheet formula bar and headers
    expect(screen.getByText(/Multi-Sheet Spreadsheet Engine/i)).toBeInTheDocument();
    expect(screen.getAllByText('Maintenance & Dues Ledger').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Vendor AMC & Contracts')).toBeInTheDocument();
    expect(screen.getByText('Bank Reconciliation & Reserves')).toBeInTheDocument();

    // Data in first sheet
    expect(screen.getByText('Sweta Sharma')).toBeInTheDocument();
    expect(screen.getByText('Amit Kumar')).toBeInTheDocument();

    // Switch to Vendor AMC sheet
    const vendorSheetBtn = screen.getByRole('button', { name: /Vendor AMC & Contracts/i });
    fireEvent.click(vendorSheetBtn);
    expect(screen.getByText('Schindler India Pvt Ltd')).toBeInTheDocument();
    expect(screen.getByText('Park+ Technologies Pvt Ltd')).toBeInTheDocument();
  });

  it('filters rows dynamically using the in-sheet search bar', () => {
    render(<InPortalDocumentViewer initialDocId="society_accounts_xlsx" />);

    expect(screen.getByText('Sweta Sharma')).toBeInTheDocument();
    expect(screen.getByText('Vikram Malhotra')).toBeInTheDocument();

    const searchInput = screen.getByPlaceholderText(/Filter sheet rows…/i);
    fireEvent.change(searchInput, { target: { value: 'Sweta' } });

    expect(screen.getByText('Sweta Sharma')).toBeInTheDocument();
    expect(screen.queryByText('Vikram Malhotra')).not.toBeInTheDocument();
  });

  it('correctly maps column numbers to Excel letters', () => {
    expect(getColumnLetter(0)).toBe('A');
    expect(getColumnLetter(1)).toBe('B');
    expect(getColumnLetter(25)).toBe('Z');
    expect(getColumnLetter(26)).toBe('AA');
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
