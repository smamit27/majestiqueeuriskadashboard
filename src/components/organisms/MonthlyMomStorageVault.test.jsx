import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import MonthlyMomStorageVault, { INITIAL_MONTHLY_MOM_ARCHIVE } from './MonthlyMomStorageVault.jsx';

describe('MonthlyMomStorageVault Component', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('renders heading, upload action button, and archived monthly MOM cards', () => {
    render(<MonthlyMomStorageVault />);

    expect(screen.getByText(/Monthly MOM Storage & Upload Vault/i)).toBeInTheDocument();
    expect(screen.getByTestId('open-upload-modal-btn')).toBeInTheDocument();
    expect(screen.getByText(/Wing 'A' Managing Committee Monthly Minutes — October 2026/i)).toBeInTheDocument();
    expect(screen.getByText(/Joint Common Infrastructure & Apex Committee Minutes — September 2026/i)).toBeInTheDocument();
  });

  it('filters archives by scope (Wing A vs Common)', () => {
    render(<MonthlyMomStorageVault />);

    // Click Wing A scope filter
    const wingAFilterBtn = screen.getByTestId('filter-scope-wing-a-btn');
    fireEvent.click(wingAFilterBtn);

    expect(screen.getByText(/Wing 'A' Managing Committee Monthly Minutes — October 2026/i)).toBeInTheDocument();
    expect(screen.queryByText(/Joint Common Infrastructure & Apex Committee Minutes — September 2026/i)).not.toBeInTheDocument();

    // Click Common scope filter
    const commonFilterBtn = screen.getByTestId('filter-scope-common-btn');
    fireEvent.click(commonFilterBtn);

    expect(screen.getByText(/Joint Common Infrastructure & Apex Committee Minutes — September 2026/i)).toBeInTheDocument();
    expect(screen.queryByText(/Wing 'A' Managing Committee Monthly Minutes — October 2026/i)).not.toBeInTheDocument();
  });

  it('opens and closes the upload modal for image or PDF', () => {
    render(<MonthlyMomStorageVault />);

    const openBtn = screen.getByTestId('open-upload-modal-btn');
    fireEvent.click(openBtn);

    expect(screen.getByTestId('upload-mom-modal')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Upload Monthly MOM/i })).toBeInTheDocument();

    // Cancel closes modal
    const cancelBtn = screen.getByText('Cancel');
    fireEvent.click(cancelBtn);
    expect(screen.queryByTestId('upload-mom-modal')).not.toBeInTheDocument();
  });

  it('allows uploading and storing a new monthly MOM document', async () => {
    render(<MonthlyMomStorageVault />);

    fireEvent.click(screen.getByTestId('open-upload-modal-btn'));

    // Fill Title
    const titleInput = screen.getByPlaceholderText(/Wing 'A' Managing Committee Minutes/i);
    fireEvent.change(titleInput, { target: { value: "Wing 'A' Special Monsoon MOM - November 2026" } });

    // Attach File
    const file = new File(['dummy pdf content'], 'monsoon_mom_nov_2026.pdf', { type: 'application/pdf' });
    const fileInput = screen.getByTestId('mom-file-upload-input');
    fireEvent.change(fileInput, { target: { files: [file] } });

    // Submit
    const submitBtn = screen.getByTestId('submit-monthly-mom-btn');
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(/Wing 'A' Special Monsoon MOM - November 2026/i)).toBeInTheDocument();
    });
  });

  it('opens and closes document lightbox when clicking View button', () => {
    render(<MonthlyMomStorageVault />);

    const viewBtn = screen.getByTestId('view-mom-btn-mom-oct-2026-wing-a');
    fireEvent.click(viewBtn);

    expect(screen.getByTestId('view-mom-lightbox')).toBeInTheDocument();
    expect(screen.getAllByText(/Wing 'A' Managing Committee Monthly Minutes — October 2026/i).length).toBeGreaterThanOrEqual(1);

    // Close button
    const closeBtn = screen.getByText('✕');
    fireEvent.click(closeBtn);
    expect(screen.queryByTestId('view-mom-lightbox')).not.toBeInTheDocument();
  });

  it('triggers onLoadIntoGenerator callback when clicking AI Edit', () => {
    const handleLoadMock = vi.fn();
    render(<MonthlyMomStorageVault onLoadIntoGenerator={handleLoadMock} />);

    const aiEditBtns = screen.getAllByText(/AI Edit/i);
    fireEvent.click(aiEditBtns[0]);

    expect(handleLoadMock).toHaveBeenCalledWith(expect.objectContaining({
      id: 'mom-oct-2026-wing-a'
    }));
  });
});
