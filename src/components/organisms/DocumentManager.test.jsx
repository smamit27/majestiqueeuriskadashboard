import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import DocumentManager from './DocumentManager.jsx';
import { ROLES } from '../../services/rbacService.js';

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
  getDownloadURL: vi.fn().mockResolvedValue('https://example.com/mock.pdf')
}));

vi.mock('../../utils/documentStorageDb.js', () => ({
  saveDocumentFile: vi.fn().mockResolvedValue(true),
  getDocumentFile: vi.fn().mockResolvedValue({
    blob: new Blob(['dummy content'], { type: 'application/pdf' }),
    fileName: 'mock.pdf'
  }),
  deleteDocumentFile: vi.fn().mockResolvedValue(true),
  createSafeBlobUrl: vi.fn().mockReturnValue('blob:mock-url')
}));

describe('DocumentManager Component', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('renders society document vault with default documents', async () => {
    render(<DocumentManager userRole={ROLES.CHAIRMAN} />);

    expect(screen.getByText(/Society Document Vault/i)).toBeInTheDocument();
    expect(await screen.findByText(/AGM 2026 Minutes & Legal Resolutions/i)).toBeInTheDocument();
  });

  it('shows delete buttons for admin/committee members and opens delete confirmation modal', async () => {
    render(<DocumentManager userRole={ROLES.CHAIRMAN} />);

    const deleteBtn = await screen.findByTestId('delete-doc-btn-doc-001');
    expect(deleteBtn).toBeInTheDocument();
    fireEvent.click(deleteBtn);

    expect(screen.getByTestId('delete-doc-modal')).toBeInTheDocument();
    expect(screen.getByText(/Delete Document Record\?/i)).toBeInTheDocument();
    expect(screen.getAllByText(/AGM 2026 Minutes & Legal Resolutions/i).length).toBeGreaterThanOrEqual(2);

    // Cancel closes modal
    const cancelBtn = screen.getByTestId('cancel-delete-doc-btn');
    fireEvent.click(cancelBtn);

    expect(screen.queryByTestId('delete-doc-modal')).not.toBeInTheDocument();
    expect(screen.getByText(/AGM 2026 Minutes & Legal Resolutions/i)).toBeInTheDocument();
  });

  it('permanently deletes document on confirm', async () => {
    render(<DocumentManager userRole={ROLES.CHAIRMAN} />);

    const deleteBtn = await screen.findByTestId('delete-doc-btn-doc-001');
    fireEvent.click(deleteBtn);

    const confirmBtn = screen.getByTestId('confirm-delete-doc-btn');
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(screen.queryByText(/AGM 2026 Minutes & Legal Resolutions/i)).not.toBeInTheDocument();
    });

    const deleted = JSON.parse(localStorage.getItem('euriska_deleted_doc_ids') || '[]');
    expect(deleted).toContain('doc-001');
  });

  it('does not display delete buttons for regular residents without document edit permission', async () => {
    render(<DocumentManager userRole={ROLES.RESIDENT} />);

    await waitFor(() => {
      expect(screen.queryByText(/Loading document records/i)).not.toBeInTheDocument();
    });
    expect(screen.queryByTestId('delete-doc-btn-doc-001')).not.toBeInTheDocument();
  });
});
