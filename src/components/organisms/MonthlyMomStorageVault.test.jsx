import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import MonthlyMomStorageVault, { INITIAL_MONTHLY_MOM_ARCHIVE } from './MonthlyMomStorageVault.jsx';

vi.mock('../../firebase.js', () => ({
  db: {},
  storage: {},
  ensureFirebaseSession: vi.fn().mockResolvedValue(),
  isFirebaseConfigured: true
}));

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  doc: vi.fn((_db, _coll, id) => ({ id })),
  getDocs: vi.fn().mockResolvedValue({
    empty: true,
    docs: [],
    forEach: vi.fn()
  }),
  setDoc: vi.fn().mockResolvedValue(),
  addDoc: vi.fn().mockResolvedValue({ id: 'mock-doc-id' }),
  deleteDoc: vi.fn().mockResolvedValue(),
  serverTimestamp: vi.fn(),
  query: vi.fn(),
  orderBy: vi.fn(),
  where: vi.fn()
}));

vi.mock('firebase/storage', () => ({
  getStorage: vi.fn(),
  ref: vi.fn(),
  uploadBytes: vi.fn().mockResolvedValue({}),
  getDownloadURL: vi.fn().mockResolvedValue('https://example.com/mock-mom.pdf')
}));

vi.mock('../../utils/documentStorageDb.js', () => ({
  saveDocumentFile: vi.fn().mockResolvedValue(true),
  getDocumentFile: vi.fn().mockResolvedValue({
    blob: new Blob(['pdf-bytes'], { type: 'application/pdf' }),
    fileName: 'mock.pdf'
  }),
  deleteDocumentFile: vi.fn().mockResolvedValue(true),
  dataUrlToBlob: vi.fn().mockReturnValue(new Blob(['mock'])),
  createSafeBlobUrl: vi.fn().mockReturnValue('blob:mock-url')
}));

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

  it('opens delete confirmation modal when clicking Delete button on a card and allows canceling', () => {
    render(<MonthlyMomStorageVault />);

    const deleteBtn = screen.getByTestId('delete-mom-btn-mom-oct-2026-wing-a');
    fireEvent.click(deleteBtn);

    expect(screen.getByTestId('delete-mom-modal')).toBeInTheDocument();
    expect(screen.getByText(/Delete Monthly MOM Record\?/i)).toBeInTheDocument();

    // Cancel closes the modal and keeps the document
    const cancelBtn = screen.getByTestId('cancel-delete-mom-btn');
    fireEvent.click(cancelBtn);

    expect(screen.queryByTestId('delete-mom-modal')).not.toBeInTheDocument();
    expect(screen.getByText(/Wing 'A' Managing Committee Monthly Minutes — October 2026/i)).toBeInTheDocument();
  });

  it('permanently deletes a document when confirming deletion in the modal', async () => {
    render(<MonthlyMomStorageVault />);

    const deleteBtn = screen.getByTestId('delete-mom-btn-mom-oct-2026-wing-a');
    fireEvent.click(deleteBtn);

    expect(screen.getByTestId('delete-mom-modal')).toBeInTheDocument();

    const confirmBtn = screen.getByTestId('confirm-delete-mom-btn');
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(screen.queryByText(/Wing 'A' Managing Committee Monthly Minutes — October 2026/i)).not.toBeInTheDocument();
    });

    // Check localStorage deleted tracking
    const deleted = JSON.parse(localStorage.getItem('euriska_deleted_mom_ids') || '[]');
    expect(deleted).toContain('mom-oct-2026-wing-a');
  });

  it('allows deleting a document directly from inside the lightbox viewer', async () => {
    render(<MonthlyMomStorageVault />);

    // Open lightbox
    const viewBtn = screen.getByTestId('view-mom-btn-mom-sep-2026-common');
    fireEvent.click(viewBtn);
    expect(screen.getByTestId('view-mom-lightbox')).toBeInTheDocument();

    // Click delete inside lightbox
    const lightboxDeleteBtn = screen.getByTestId('lightbox-delete-mom-btn');
    fireEvent.click(lightboxDeleteBtn);

    expect(screen.getByTestId('delete-mom-modal')).toBeInTheDocument();

    const confirmBtn = screen.getByTestId('confirm-delete-mom-btn');
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(screen.queryByText(/Joint Common Infrastructure & Apex Committee Minutes — September 2026/i)).not.toBeInTheDocument();
    });
  });
});
