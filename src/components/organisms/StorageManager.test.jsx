import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import StorageManager, { extractGoogleDriveFileId, transformGoogleDriveUrl } from './StorageManager.jsx';

// Mock Firebase dependencies
vi.mock('../../firebase.js', () => ({
  db: {},
  isFirebaseConfigured: false,
  ensureFirebaseSession: vi.fn().mockResolvedValue(null),
}));

vi.mock('../../services/auditService.js', () => ({
  logAuditEvent: vi.fn().mockResolvedValue(true),
  AUDIT_ACTIONS: { CREATE: 'CREATE' },
}));

describe('StorageManager - URL Transformation Helpers', () => {
  it('correctly extracts file ID from standard share link', () => {
    const url = 'https://drive.google.com/file/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs/view?usp=sharing';
    expect(extractGoogleDriveFileId(url)).toBe('1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs');
  });

  it('correctly extracts file ID from open?id= format', () => {
    const url = 'https://drive.google.com/open?id=1V5P9mQz7sK8T2wX0uJ1bY4vE6oN9iR8a';
    expect(extractGoogleDriveFileId(url)).toBe('1V5P9mQz7sK8T2wX0uJ1bY4vE6oN9iR8a');
  });

  it('correctly extracts folder ID from folders/ format', () => {
    const url = 'https://drive.google.com/drive/folders/17a8B9cDEfGH1234567890abcdefghijk';
    expect(extractGoogleDriveFileId(url)).toBe('17a8B9cDEfGH1234567890abcdefghijk');
  });

  it('correctly handles raw file ID string', () => {
    const rawId = '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs';
    expect(extractGoogleDriveFileId(rawId)).toBe('1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs');
  });

  it('returns empty string for invalid URLs', () => {
    expect(extractGoogleDriveFileId('https://example.com/not-drive')).toBe('');
    expect(extractGoogleDriveFileId('')).toBe('');
  });

  it('transforms Google Drive URL into direct embed, thumbnail and download URLs', () => {
    const url = 'https://drive.google.com/file/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs/view?usp=sharing';
    const result = transformGoogleDriveUrl(url);

    expect(result.isValid).toBe(true);
    expect(result.fileId).toBe('1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs');
    expect(result.directEmbedUrl).toBe('https://lh3.googleusercontent.com/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs');
    expect(result.thumbnailUrl).toBe('https://drive.google.com/thumbnail?id=1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs&sz=w1200');
    expect(result.directDownloadUrl).toBe('https://drive.google.com/uc?export=download&id=1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs');
    expect(result.standardViewUrl).toBe('https://drive.google.com/file/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs/view');
  });
});

describe('StorageManager Component', () => {
  const defaultProps = {
    user: { email: 'admin@majestique.com' },
    userRole: 'ADMIN',
    isAdmin: true,
  };

  it('renders hero title and key quota metrics', () => {
    render(<StorageManager {...defaultProps} />);

    expect(screen.getByText(/Cloud Storage & Quota Vault/i)).toBeInTheDocument();
    expect(screen.getByText(/Firestore Database Space/i)).toBeInTheDocument();
    expect(screen.getByText(/Firebase Cloud Storage/i)).toBeInTheDocument();
    expect(screen.getByText(/More Data You Can Store/i)).toBeInTheDocument();
    expect(screen.getByText(/Google Drive Free Quota/i)).toBeInTheDocument();
  });

  it('renders collection breakdown table on storage overview tab', () => {
    render(<StorageManager {...defaultProps} />);

    expect(screen.getByText(/Live Database Collections & Quota Breakdown/i)).toBeInTheDocument();
    expect(screen.getByText(/Society Document Vault/i)).toBeInTheDocument();
    expect(screen.getByText(/Resident Announcements/i)).toBeInTheDocument();
  });

  it('switches to Google Drive Image Archiver tab and displays link converter', () => {
    render(<StorageManager {...defaultProps} />);

    const archiverTabBtn = screen.getByRole('button', { name: /Google Drive Image Archiver & Bridge/i });
    fireEvent.click(archiverTabBtn);

    expect(screen.getByText(/Instant Link Converter & Validator/i)).toBeInTheDocument();
    expect(screen.getByText(/Why not upload full images to Firebase\?/i)).toBeInTheDocument();
    expect(screen.getByText(/Why Google Drive is Perfect for Images/i)).toBeInTheDocument();
  });

  it('switches to What-If Simulator tab and calculates resource impact', () => {
    render(<StorageManager {...defaultProps} />);

    const simTabBtn = screen.getByRole('button', { name: /What-If Storage Simulator/i });
    fireEvent.click(simTabBtn);

    expect(screen.getByText(/Interactive Storage Capacity & Growth Forecaster/i)).toBeInTheDocument();
    expect(screen.getByText(/Projected Resource Impact/i)).toBeInTheDocument();
    expect(screen.getByText(/Architecture Recommendation/i)).toBeInTheDocument();
  });

  it('switches to Drive Link Guide & Apps Script tab', () => {
    render(<StorageManager {...defaultProps} />);

    const guideTabBtn = screen.getByRole('button', { name: /Drive Link Guide & Apps Script/i });
    fireEvent.click(guideTabBtn);

    expect(screen.getByText(/Why does Google Drive give a different link\?/i)).toBeInTheDocument();
    expect(screen.getByText(/Google Apps Script: Free Direct Drag-and-Drop Image Uploader Webhook/i)).toBeInTheDocument();
  });
});
