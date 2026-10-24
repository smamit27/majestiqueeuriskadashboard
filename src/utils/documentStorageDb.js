/**
 * IndexedDB storage helper for large documents, PDFs, and high-resolution images.
 * Bypasses localStorage 5MB quota and Firestore 1MB document limit.
 */

const DB_NAME = 'euriska_document_storage_db';
const DB_VERSION = 1;
const STORE_NAME = 'document_files';

/**
 * Opens or initializes the IndexedDB database.
 * @returns {Promise<IDBDatabase>}
 */
export function openDocumentDb() {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return reject(new Error('IndexedDB is not supported in this environment.'));
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Stores a File or Blob in IndexedDB by ID.
 * @param {string} id - Unique document identifier
 * @param {Blob|File} file - The file/blob to persist
 * @param {object} metadata - Extra details like fileName, mimeType
 * @returns {Promise<boolean>}
 */
export async function saveDocumentFile(id, file, metadata = {}) {
  try {
    const db = await openDocumentDb();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);

      const record = {
        id,
        blob: file,
        fileName: file.name || metadata.fileName || 'document.pdf',
        fileType: file.type || metadata.mimeType || 'application/pdf',
        size: file.size,
        updatedAt: new Date().toISOString()
      };

      const request = store.put(record);
      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.warn('saveDocumentFile error:', err);
    return false;
  }
}

/**
 * Retrieves a File/Blob record from IndexedDB by ID.
 * @param {string} id - Document ID
 * @returns {Promise<{ blob: Blob, fileName: string, fileType: string } | null>}
 */
export async function getDocumentFile(id) {
  try {
    const db = await openDocumentDb();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(id);

      request.onsuccess = () => {
        resolve(request.result || null);
      };
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.warn('getDocumentFile error:', err);
    return null;
  }
}

/**
 * Deletes a stored file from IndexedDB by ID.
 * @param {string} id
 * @returns {Promise<boolean>}
 */
export async function deleteDocumentFile(id) {
  try {
    const db = await openDocumentDb();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(id);
      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.warn('deleteDocumentFile error:', err);
    return false;
  }
}

/**
 * Converts a base64 DataURL to a Blob.
 * @param {string} dataUrl
 * @returns {Blob}
 */
export function dataUrlToBlob(dataUrl) {
  const parts = dataUrl.split(';base64,');
  const contentType = parts[0].split(':')[1];
  const raw = window.atob(parts[1]);
  const rawLength = raw.length;
  const uInt8Array = new Uint8Array(rawLength);

  for (let i = 0; i < rawLength; ++i) {
    uInt8Array[i] = raw.charCodeAt(i);
  }

  return new Blob([uInt8Array], { type: contentType });
}

/**
 * Creates an object URL for a given Blob or File.
 * @param {Blob|File} blob
 * @returns {string}
 */
export function createSafeBlobUrl(blob) {
  if (!blob) return null;
  return URL.createObjectURL(blob);
}
