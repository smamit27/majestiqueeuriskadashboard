import { describe, it, expect, beforeEach } from 'vitest';
import {
  openDocumentDb,
  saveDocumentFile,
  getDocumentFile,
  deleteDocumentFile,
  dataUrlToBlob,
  createSafeBlobUrl
} from './documentStorageDb.js';

describe('documentStorageDb utility', () => {
  it('converts dataUrl to Blob correctly', () => {
    const sampleDataUrl = 'data:text/plain;base64,SGVsbG8gV29ybGQ=';
    const blob = dataUrlToBlob(sampleDataUrl);
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe('text/plain');
  });

  it('creates safe blob URL when given a Blob', () => {
    const blob = new Blob(['sample content'], { type: 'application/pdf' });
    const url = createSafeBlobUrl(blob);
    expect(url).toBeDefined();
    expect(typeof url).toBe('string');
  });

  it('handles null gracefully in createSafeBlobUrl', () => {
    expect(createSafeBlobUrl(null)).toBeNull();
  });
});
