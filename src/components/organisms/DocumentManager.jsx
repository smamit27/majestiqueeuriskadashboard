import React, { useState, useEffect, useMemo } from 'react';
import { collection, getDocs, addDoc, setDoc, deleteDoc, doc, serverTimestamp, query, orderBy, where } from 'firebase/firestore';
import { db, storage, isFirebaseConfigured, ensureFirebaseSession } from '../../firebase.js';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { saveDocumentFile, getDocumentFile, deleteDocumentFile, createSafeBlobUrl } from '../../utils/documentStorageDb.js';
import { logAuditEvent, AUDIT_ACTIONS } from '../../services/auditService.js';
import { ROLES, canEditModule, MODULES } from '../../services/rbacService.js';
import {
  AtomicButton,
  AtomicBadge,
  AtomicEmptyState
} from '../atoms/index.js';
import {
  AtomicSearchBar,
  AtomicModal,
  AtomicFilterPills,
  DocumentViewerModal
} from '../molecules/index.js';
import './DocumentManager.css';


export const DOCUMENT_CATEGORIES = [
  'All Categories',
  'Monthly MOM',
  'AGM',
  'SGM',
  'Audit',
  'AMC',
  'Vendor Agreements',
  'Society Rules',
  'Parking',
  'Fire Safety',
  'Builder',
  'Government/PMC',
  'Financial Documents'
];

export const ACCESS_LEVELS = {
  PUBLIC_RESIDENTS: 'Public (Residents & Committee)',
  COMMITTEE_ONLY: 'Committee Members Only',
  ADMIN_ONLY: 'Admins Only'
};

const SEED_DOCUMENTS = [
  {
    id: 'doc-mom-001',
    name: "Wing 'A' Managing Committee Minutes — October 2026",
    category: 'Monthly MOM',
    uploadDate: '2026-10-19',
    uploadedBy: 'Society Secretary',
    version: '1.0',
    expiryDate: '',
    accessLevel: 'PUBLIC_RESIDENTS',
    fileSize: '1.8 MB',
    fileType: 'PDF',
    downloadUrl: '#',
    notes: 'Signed and approved October 2026 Wing A MOM: Otis Lift 2 door sensor replacement sanction, pre-monsoon terrace joint sealing, and WhatsApp reminders to 6 overdue flats.'
  },
  {
    id: 'doc-mom-002',
    name: "Joint Common Infrastructure & Apex Committee Minutes — September 2026",
    category: 'Monthly MOM',
    uploadDate: '2026-09-21',
    uploadedBy: 'Apex Infrastructure Committee',
    version: '1.0',
    expiryDate: '',
    accessLevel: 'PUBLIC_RESIDENTS',
    fileSize: '2.4 MB',
    fileType: 'JPG',
    downloadUrl: '#',
    notes: 'September 2026 common campus decisions: STP suction tanker clearance (₹8,500), Park+ RFID boom barrier sensor realignment at Gate 2, and Form-B fire certification.'
  },
  {
    id: 'doc-000',
    name: 'Executive Workflow & Project Lifecycle Presentation',
    category: 'Society Rules',
    uploadDate: '2026-10-20',
    uploadedBy: 'Architecture Team',
    version: '3.0',
    expiryDate: '',
    accessLevel: 'PUBLIC_RESIDENTS',
    fileSize: '1.2 MB',
    fileType: 'PPT',
    downloadUrl: '/workflow_presentation.html',
    notes: 'Interactive 16:9 Presentation Deck covering the 10-state workflow transition engine, committee approval gates & case studies.'
  },
  {
    id: 'doc-001',
    name: 'AGM 2026 Minutes & Legal Resolutions',
    category: 'AGM',
    uploadDate: '2026-09-08',
    uploadedBy: 'Secretary (Majestique Euriska)',
    version: '1.0',
    expiryDate: '2027-09-01',
    accessLevel: 'PUBLIC_RESIDENTS',
    fileSize: '2.4 MB',
    fileType: 'PDF',
    downloadUrl: '#',
    notes: 'Official AGM held on 06.09.2026 with 68 attendees and passed budget resolutions.'
  },
  {
    id: 'doc-002',
    name: 'Forensic Audit Full Dossier - Builder Accounts',
    category: 'Audit',
    uploadDate: '2026-08-15',
    uploadedBy: 'Treasurer / Auditor CA Hardik Mehta',
    version: '2.1',
    expiryDate: '',
    accessLevel: 'COMMITTEE_ONLY',
    fileSize: '5.1 MB',
    fileType: 'PDF',
    downloadUrl: '/Majestique_Euriska_Builder_Forensic_Audit_Full_Dossier.pdf',
    notes: 'Comprehensive reconciliation of corpus fund, common dues, and pending builder works.'
  },
  {
    id: 'doc-003',
    name: 'Fire Safety NOC & Inspection Certificate 2026-27',
    category: 'Fire Safety',
    uploadDate: '2026-04-10',
    uploadedBy: 'Estate Manager',
    version: '1.0',
    expiryDate: '2027-04-09',
    accessLevel: 'PUBLIC_RESIDENTS',
    fileSize: '1.2 MB',
    fileType: 'PDF',
    downloadUrl: '#',
    notes: 'Pune Municipal Corporation Fire Dept annual compliance clearance certificate.'
  },
  {
    id: 'doc-004',
    name: 'Schindler Lift AMC Contract & SLA (2026-2027)',
    category: 'AMC',
    uploadDate: '2026-05-01',
    uploadedBy: 'Estate Manager',
    version: '1.1',
    expiryDate: '2027-04-30',
    accessLevel: 'COMMITTEE_ONLY',
    fileSize: '840 KB',
    fileType: 'PDF',
    downloadUrl: '#',
    notes: 'Comprehensive annual maintenance covering 6 passenger elevators across Wings.'
  },
  {
    id: 'doc-005',
    name: 'Resident Handbook & Society By-laws (Drilling & Renovation Rules)',
    category: 'Society Rules',
    uploadDate: '2026-01-10',
    uploadedBy: 'Management Committee',
    version: '3.0',
    expiryDate: '',
    accessLevel: 'PUBLIC_RESIDENTS',
    fileSize: '950 KB',
    fileType: 'PDF',
    downloadUrl: '#',
    notes: 'Permitted drilling hours: 10:00 AM - 1:00 PM, 3:00 PM - 6:00 PM (Mon-Sat only).'
  },
  {
    id: 'doc-006',
    name: 'PMC Water Connection Sanction & Tax Receipts',
    category: 'Government/PMC',
    uploadDate: '2025-11-20',
    uploadedBy: 'Secretary',
    version: '1.0',
    expiryDate: '',
    accessLevel: 'COMMITTEE_ONLY',
    fileSize: '1.8 MB',
    fileType: 'PDF',
    downloadUrl: '#',
    notes: 'Town planning sanction and official water supply sanction documents.'
  }
];

export default function DocumentManager({ user, userRole = ROLES.RESIDENT }) {
  const [documents, setDocuments] = useState(() => {
    try {
      const deletedIds = new Set(JSON.parse(localStorage.getItem('euriska_deleted_doc_ids') || '[]'));
      return SEED_DOCUMENTS.filter(s => !deletedIds.has(s.id) && !deletedIds.has(s.name));
    } catch {
      return SEED_DOCUMENTS;
    }
  });
  const [selectedCategory, setSelectedCategory] = useState('All Categories');
  const [searchQuery, setSearchQuery] = useState('');
  const [accessFilter, setAccessFilter] = useState('ALL');
  const [isLoading, setIsLoading] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [uploadSuccess, setUploadSuccess] = useState('');
  const [inPortalViewDoc, setInPortalViewDoc] = useState(null);
  const [deletingDoc, setDeletingDoc] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Upload Form state
  const [docName, setDocName] = useState('');
  const [docCategory, setDocCategory] = useState('Society Rules');
  const [docAccess, setDocAccess] = useState('PUBLIC_RESIDENTS');
  const [docVersion, setDocVersion] = useState('1.0');
  const [docExpiry, setDocExpiry] = useState('');
  const [docNotes, setDocNotes] = useState('');
  const [selectedFileName, setSelectedFileName] = useState('');
  const [selectedFileObj, setSelectedFileObj] = useState(null);

  const canUpload = canEditModule(userRole, MODULES.DOCUMENTS);

  useEffect(() => {
    let cancelled = false;
    async function fetchDocs() {
      const deletedIds = new Set(JSON.parse(localStorage.getItem('euriska_deleted_doc_ids') || '[]'));
      if (!isFirebaseConfigured || !db) {
        setDocuments(SEED_DOCUMENTS.filter(s => !deletedIds.has(s.id) && !deletedIds.has(s.name)));
        return;
      }
      setIsLoading(true);
      try {
        await ensureFirebaseSession();
        const q = query(collection(db, 'societyDocuments'), orderBy('uploadDate', 'desc'));
        const snap = await getDocs(q);
        if (!cancelled && !snap.empty) {
          const list = snap.docs
            .map(d => ({ id: d.id, firestoreDocId: d.id, ...d.data() }))
            .filter(d => !deletedIds.has(d.id) && !deletedIds.has(d.name));
          // Merge with seeds if distinct
          setDocuments(prev => {
            const ids = new Set(list.map(x => x.name));
            const uniqueSeeds = SEED_DOCUMENTS.filter(s => !ids.has(s.name) && !deletedIds.has(s.id) && !deletedIds.has(s.name));
            return [...list, ...uniqueSeeds];
          });
        }
      } catch (err) {
        console.warn('Documents fetch error (using local seed repository):', err);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    fetchDocs();
    return () => { cancelled = true; };
  }, []);

  // Filtered documents according to search, category, and RBAC visibility
  const visibleDocuments = useMemo(() => {
    return documents.filter(doc => {
      // RBAC check: Residents can only see PUBLIC_RESIDENTS
      if (userRole === ROLES.RESIDENT && doc.accessLevel !== 'PUBLIC_RESIDENTS') {
        return false;
      }
      // Security users can only see PUBLIC_RESIDENTS
      if (userRole === ROLES.SECURITY && doc.accessLevel !== 'PUBLIC_RESIDENTS') {
        return false;
      }
      // Access Level filter in UI
      if (accessFilter !== 'ALL' && doc.accessLevel !== accessFilter) {
        return false;
      }
      // Category filter
      if (selectedCategory !== 'All Categories' && doc.category !== selectedCategory) {
        return false;
      }
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matches = (
          (doc.name || '').toLowerCase().includes(q) ||
          (doc.category || '').toLowerCase().includes(q) ||
          (doc.uploadedBy || '').toLowerCase().includes(q) ||
          (doc.notes || '').toLowerCase().includes(q)
        );
        if (!matches) return false;
      }
      return true;
    });
  }, [documents, selectedCategory, searchQuery, accessFilter, userRole]);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 25 * 1024 * 1024) {
        setUploadError('File size exceeds the 25 MB safety limit.');
        setSelectedFileName('');
        setSelectedFileObj(null);
        return;
      }
      setSelectedFileName(file.name);
      setSelectedFileObj(file);
      setUploadError('');
    }
  };

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    setUploadError('');
    setUploadSuccess('');

    if (!docName.trim()) {
      setUploadError('Please provide a document name.');
      return;
    }

    const docId = `doc-${Date.now()}`;

    // 1. Save binary file to IndexedDB for unlimited local persistence
    if (selectedFileObj) {
      try {
        await saveDocumentFile(docId, selectedFileObj, {
          fileName: selectedFileObj.name,
          mimeType: selectedFileObj.type
        });
      } catch (e) {
        console.warn('IndexedDB save notice:', e);
      }
    }

    // 2. Upload to Firebase Storage if available
    let cloudDownloadUrl = '#';
    if (isFirebaseConfigured && storage && selectedFileObj) {
      try {
        const storageRef = ref(storage, `society_documents/${docId}_${selectedFileObj.name}`);
        await uploadBytes(storageRef, selectedFileObj);
        cloudDownloadUrl = await getDownloadURL(storageRef);
      } catch (e) {
        console.warn('Firebase storage notice:', e);
      }
    }

    const newDoc = {
      id: docId,
      name: docName.trim(),
      category: docCategory,
      uploadDate: new Date().toISOString().split('T')[0],
      uploadedBy: user?.email || userRole,
      version: docVersion.trim() || '1.0',
      expiryDate: docExpiry || '',
      accessLevel: docAccess,
      fileSize: selectedFileObj ? `${(selectedFileObj.size / (1024 * 1024)).toFixed(2)} MB` : 'Digital Record',
      fileType: selectedFileObj ? selectedFileObj.name.split('.').pop().toUpperCase() : 'PDF',
      downloadUrl: cloudDownloadUrl,
      notes: docNotes.trim(),
    };

    try {
      if (isFirebaseConfigured && db) {
        await ensureFirebaseSession();
        await setDoc(doc(db, 'societyDocuments', docId), {
          ...newDoc,
          firestoreDocId: docId,
          timestamp: serverTimestamp(),
        });
      }

      setDocuments(prev => [newDoc, ...prev]);

      // Audit Trail Logging
      await logAuditEvent({
        action: AUDIT_ACTIONS.CREATE,
        module: 'Document Management',
        recordId: newDoc.name,
        newValue: newDoc,
        user,
        role: userRole,
        notes: `Uploaded document: ${newDoc.name} (${newDoc.category})`,
      });

      setUploadSuccess('Document successfully archived.');
      setTimeout(() => {
        setIsUploadModalOpen(false);
        setUploadSuccess('');
        setDocName('');
        setDocNotes('');
        setSelectedFileName('');
        setSelectedFileObj(null);
      }, 1200);
    } catch (err) {
      console.error('Document upload error:', err);
      setUploadError('Failed to archive document. Saved locally in current session.');
      setDocuments(prev => [newDoc, ...prev]);
    }
  };

  const handleViewInPortal = async (doc) => {
    // 1. Check IndexedDB
    try {
      const stored = await getDocumentFile(doc.id || doc.name);
      if (stored && stored.blob) {
        const blobUrl = createSafeBlobUrl(stored.blob);
        setInPortalViewDoc({
          url: blobUrl,
          title: doc.name,
          type: doc.fileType || 'PDF'
        });
        return;
      }
    } catch {}

    // 2. Check cloud downloadUrl
    if (doc.downloadUrl && doc.downloadUrl !== '#') {
      setInPortalViewDoc({
        url: doc.downloadUrl,
        title: doc.name,
        type: doc.fileType || 'PDF'
      });
      return;
    }

    // 3. Fallback to standard dossier PDF
    setInPortalViewDoc({
      url: '/Majestique_Euriska_Builder_Forensic_Audit_Full_Dossier.pdf',
      title: doc.name,
      type: doc.fileType || 'PDF'
    });
  };

  const handleDownloadDoc = async (doc, e) => {
    // 1. Check IndexedDB
    try {
      const stored = await getDocumentFile(doc.id || doc.name);
      if (stored && stored.blob) {
        e.preventDefault();
        const url = URL.createObjectURL(stored.blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = stored.fileName || `${doc.name}.${(doc.fileType || 'PDF').toLowerCase()}`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 2000);
        return;
      }
    } catch {}

    if (doc.downloadUrl && doc.downloadUrl !== '#') {
      return; // standard link download
    }

    e.preventDefault();
    alert(`Downloading official archived document record: ${doc.name}`);
  };

  const handleRequestDelete = (docItem, e) => {
    e?.stopPropagation();
    setDeletingDoc(docItem);
  };

  const handleConfirmDelete = async () => {
    if (!deletingDoc) return;
    setIsDeleting(true);
    const targetDoc = deletingDoc;
    const docId = targetDoc.id;

    // 1. Remove from documents state immediately
    setDocuments(prev => prev.filter(d => (d.id !== docId && d.name !== targetDoc.name)));

    // 2. Track deleted ID in localStorage to prevent resurrection
    try {
      const deletedIds = JSON.parse(localStorage.getItem('euriska_deleted_doc_ids') || '[]');
      if (docId && !deletedIds.includes(docId)) deletedIds.push(docId);
      if (targetDoc.name && !deletedIds.includes(targetDoc.name)) deletedIds.push(targetDoc.name);
      if (targetDoc.firestoreDocId && !deletedIds.includes(targetDoc.firestoreDocId)) {
        deletedIds.push(targetDoc.firestoreDocId);
      }
      localStorage.setItem('euriska_deleted_doc_ids', JSON.stringify(deletedIds));

      // If it's a Monthly MOM, also add to euriska_deleted_mom_ids
      if (targetDoc.category === 'Monthly MOM') {
        const deletedMomIds = JSON.parse(localStorage.getItem('euriska_deleted_mom_ids') || '[]');
        if (docId && !deletedMomIds.includes(docId)) deletedMomIds.push(docId);
        if (targetDoc.firestoreDocId && !deletedMomIds.includes(targetDoc.firestoreDocId)) {
          deletedMomIds.push(targetDoc.firestoreDocId);
        }
        localStorage.setItem('euriska_deleted_mom_ids', JSON.stringify(deletedMomIds));
      }
    } catch {}

    // 3. Delete binary from IndexedDB
    try {
      if (docId) {
        await deleteDocumentFile(docId);
      }
      if (targetDoc.name) {
        await deleteDocumentFile(targetDoc.name);
      }
    } catch {}

    // 4. Delete from Firestore if configured
    try {
      if (isFirebaseConfigured && db) {
        await ensureFirebaseSession();
        if (docId) {
          await deleteDoc(doc(db, 'societyDocuments', docId));
        }
        if (targetDoc.firestoreDocId && targetDoc.firestoreDocId !== docId) {
          await deleteDoc(doc(db, 'societyDocuments', targetDoc.firestoreDocId));
        }
        try {
          const qDocs = query(collection(db, 'societyDocuments'), where('name', '==', targetDoc.name));
          const snapDocs = await getDocs(qDocs);
          snapDocs.forEach(d => {
            deleteDoc(d.ref).catch(() => {});
          });
        } catch {}

        if (targetDoc.category === 'Monthly MOM') {
          try {
            if (docId) {
              await deleteDoc(doc(db, 'monthlyMeetingMomUploads', docId));
            }
            const qMoms = query(collection(db, 'monthlyMeetingMomUploads'), where('title', '==', targetDoc.name));
            const snapMoms = await getDocs(qMoms);
            snapMoms.forEach(d => {
              deleteDoc(d.ref).catch(() => {});
            });
          } catch {}
        }
      }
    } catch (err) {
      console.warn('Firestore deletion notice in DocumentManager:', err);
    }

    // 5. Audit Trail Logging
    try {
      await logAuditEvent({
        action: AUDIT_ACTIONS.DELETE || 'DELETE',
        module: 'Document Management',
        recordId: targetDoc.name,
        user,
        role: userRole,
        notes: `Deleted document: ${targetDoc.name} (${targetDoc.category})`
      });
    } catch {}

    setIsDeleting(false);
    setDeletingDoc(null);
  };

  return (
    <div className="atomic-card document-manager-s1">
      {/* Header Banner */}
      <div className="document-manager-s2">
        <div className="document-manager-s3">
          <span className="document-manager-s4">📁</span>
          <div>
            <h2 className="document-manager-s5">Society Document Vault</h2>
            <p className="document-manager-s6">
              Secure legal, AGM, compliance, and vendor agreements repository for Majestique Euriska
            </p>
          </div>
        </div>

        {canUpload && (
          <AtomicButton
            variant="primary"
            onClick={() => setIsUploadModalOpen(true)}
          >
            <span>+</span> Upload Document
          </AtomicButton>
        )}
      </div>

      {/* Filter Toolbar */}
      <div className="document-manager-s7">
        {/* Search */}
        <div className="document-manager-s8">
          <AtomicSearchBar
            value={searchQuery}
            onChange={setSearchQuery}
            onClear={() => setSearchQuery('')}
            placeholder="Search documents by title, keyword, or uploader..."
          />
        </div>

        {/* Category Dropdown */}
        <div className="document-manager-s9">
          <select
            className="atomic-select"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
          >
            {DOCUMENT_CATEGORIES.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

        {/* Access Level Filter (Visible to committee and admin) */}
        {userRole !== ROLES.RESIDENT && userRole !== ROLES.SECURITY && (
          <div className="document-manager-s9">
            <select
              className="atomic-select"
              value={accessFilter}
              onChange={(e) => setAccessFilter(e.target.value)}
            >
              <option value="ALL">All Access Levels</option>
              <option value="PUBLIC_RESIDENTS">Public / Residents</option>
              <option value="COMMITTEE_ONLY">Committee Only</option>
              <option value="ADMIN_ONLY">Admin Only</option>
            </select>
          </div>
        )}
      </div>

      {/* Documents Grid / Table */}
      {isLoading ? (
        <div className="document-manager-s10">Loading document records...</div>
      ) : visibleDocuments.length === 0 ? (
        <AtomicEmptyState
          title="No matching documents found."
          description="Try adjusting your search filters or upload a new record."
        />
      ) : (
        <div className="atomic-table-wrap">
          <table className="atomic-table">
            <thead>
              <tr>
                <th className="atomic-th">Document Name</th>
                <th className="atomic-th">Category</th>
                <th className="atomic-th">Version</th>
                <th className="atomic-th">Uploaded On</th>
                <th className="atomic-th">Access Level</th>
                <th className="atomic-th">Expiry</th>
                <th className="atomic-th document-manager-s11">Action</th>
              </tr>
            </thead>
            <tbody>
              {visibleDocuments.map((doc, idx) => {
                const isExpiring = doc.expiryDate && (new Date(doc.expiryDate) - new Date()) / 86400000 < 60;
                return (
                  <tr key={doc.id || idx} className="atomic-tr">
                    <td className="atomic-td document-manager-s12">
                      <div className="document-manager-s13">
                        <span className="document-manager-s14">📄</span>
                        <div>
                          <div className="document-manager-s15">{doc.name}</div>
                          {doc.notes && <div className="document-manager-s16">{doc.notes}</div>}
                        </div>
                      </div>
                    </td>
                    <td className="atomic-td">
                      <AtomicBadge variant="info">
                        {doc.category}
                      </AtomicBadge>
                    </td>
                    <td className="atomic-td document-manager-s17">v{doc.version || '1.0'}</td>
                    <td className="atomic-td document-manager-s17">{doc.uploadDate}</td>
                    <td className="atomic-td">
                      <AtomicBadge variant={doc.accessLevel === 'PUBLIC_RESIDENTS' ? 'success' : 'warning'}>
                        {doc.accessLevel === 'PUBLIC_RESIDENTS' ? 'Public' : 'Committee Only'}
                      </AtomicBadge>
                    </td>
                    <td className="atomic-td">
                      {doc.expiryDate ? (
                        <span className={`${(isExpiring ? 'document-manager-cond-1-true' : 'document-manager-cond-2-false')}`}>
                          {doc.expiryDate} {isExpiring && '⚠️'}
                        </span>
                      ) : (
                        <span className="document-manager-s18">Perpetual</span>
                      )}
                    </td>
                    <td className="atomic-td document-manager-s19">
                      <div className="document-manager-s20">
                        <button
                          type="button"
                          onClick={() => {
                            const targetUrl = (doc.downloadUrl && doc.downloadUrl !== '#')
                              ? doc.downloadUrl
                              : '/Majestique_Euriska_Builder_Forensic_Audit_Full_Dossier.pdf';
                            const printWin = window.open(targetUrl, '_blank');
                            if (printWin) {
                              printWin.focus();
                              try {
                                printWin.onload = () => {
                                  try { printWin.print(); } catch {}
                                };
                              } catch {}
                            }
                          }}
                          title="Print Document (Native Clean Print)"
                          className="atomic-btn atomic-btn--secondary atomic-btn--sm"
                        >
                          🖨️ Print
                        </button>
                        <button
                          type="button"
                          onClick={() => handleViewInPortal(doc)}
                          className="atomic-btn atomic-btn--primary atomic-btn--sm"
                        >
                          👁️ View
                        </button>
                        <a
                          href={doc.downloadUrl || '#'}
                          download={doc.name}
                          onClick={(e) => handleDownloadDoc(doc, e)}
                          className="atomic-btn atomic-btn--secondary atomic-btn--sm document-manager-s21"
                        >
                          ⬇ Download
                        </a>
                        {canUpload && (
                          <button
                            type="button"
                            data-testid={`delete-doc-btn-${doc.id || doc.name}`}
                            onClick={(e) => handleRequestDelete(doc, e)}
                            title="Delete Document"
                            className="atomic-btn atomic-btn--danger atomic-btn--sm"
                          >
                            🗑️ Delete
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Upload Modal */}
      <AtomicModal
        isOpen={isUploadModalOpen}
        title="Upload Society Document"
        onClose={() => setIsUploadModalOpen(false)}
        maxWidth="550px"
      >
        <form onSubmit={handleUploadSubmit} className="document-manager-s22">
          <div>
            <label className="eyebrow document-manager-s23">Document Title *</label>
            <input
              type="text"
              required
              className="atomic-input"
              placeholder="e.g. AGM 2026 Minutes & Accounts"
              value={docName}
              onChange={(e) => setDocName(e.target.value)}
            />
          </div>

          <div className="document-manager-s24">
            <div>
              <label className="eyebrow document-manager-s23">Category *</label>
              <select
                className="atomic-select"
                value={docCategory}
                onChange={(e) => setDocCategory(e.target.value)}
              >
                {DOCUMENT_CATEGORIES.filter(c => c !== 'All Categories').map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="eyebrow document-manager-s23">Access Level *</label>
              <select
                className="atomic-select"
                value={docAccess}
                onChange={(e) => setDocAccess(e.target.value)}
              >
                <option value="PUBLIC_RESIDENTS">Public (Residents & Committee)</option>
                <option value="COMMITTEE_ONLY">Committee Only</option>
                <option value="ADMIN_ONLY">Admin Only</option>
              </select>
            </div>
          </div>

          <div className="document-manager-s24">
            <div>
              <label className="eyebrow document-manager-s23">Version</label>
              <input
                type="text"
                className="atomic-input"
                placeholder="1.0"
                value={docVersion}
                onChange={(e) => setDocVersion(e.target.value)}
              />
            </div>

            <div>
              <label className="eyebrow document-manager-s23">Expiry Date (Optional)</label>
              <input
                type="date"
                className="atomic-input"
                value={docExpiry}
                onChange={(e) => setDocExpiry(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="eyebrow document-manager-s23">Attach File (PDF, DOCX, XLSX)</label>
            <input
              type="file"
              accept=".pdf,.docx,.xlsx,.jpg,.png"
              onChange={handleFileChange}
              className="atomic-input document-manager-s25"
            />
          </div>

          <div>
            <label className="eyebrow document-manager-s23">Description / Notes</label>
            <textarea
              className="atomic-textarea"
              rows={2}
              placeholder="Key resolution points, approval notes, or vendor details..."
              value={docNotes}
              onChange={(e) => setDocNotes(e.target.value)}
            />
          </div>

          {uploadError && <p className="document-manager-s26">{uploadError}</p>}
          {uploadSuccess && <p className="document-manager-s27">{uploadSuccess}</p>}

          <div className="document-manager-s28">
            <AtomicButton variant="secondary" onClick={() => setIsUploadModalOpen(false)}>
              Cancel
            </AtomicButton>
            <AtomicButton variant="primary" type="submit">
              Upload & Archive
            </AtomicButton>
          </div>
        </form>
      </AtomicModal>

      {/* ── In-Portal Document & Presentation Viewer Modal ── */}
      {inPortalViewDoc && (
        <DocumentViewerModal
          documentUrl={inPortalViewDoc.url}
          documentTitle={inPortalViewDoc.title}
          documentType={inPortalViewDoc.type}
          onClose={() => setInPortalViewDoc(null)}
        />
      )}

      {/* ── Document Deletion Confirmation Modal ── */}
      {deletingDoc && (
        <div
          data-testid="delete-doc-modal"
          className="atomic-modal-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget && !isDeleting) setDeletingDoc(null);
          }}
        >
          <div className="atomic-modal-container document-manager-s29">
            <div className="atomic-modal-header document-manager-s30">
              <div className="document-manager-s3">
                <div className="document-manager-s31">
                  🗑️
                </div>
                <div>
                  <h4 className="document-manager-s32">
                    Delete Document Record?
                  </h4>
                  <p className="document-manager-s33">
                    This action permanently removes this document
                  </p>
                </div>
              </div>
            </div>

            <div className="atomic-modal-body">
              <div className="document-manager-s34">
                <div className="document-manager-s35">
                  {deletingDoc.name}
                </div>
                <div className="document-manager-s36">
                  <span>📂 {deletingDoc.category}</span>
                  <span>•</span>
                  <span>📅 {deletingDoc.uploadDate}</span>
                  <span>•</span>
                  <span>📄 {deletingDoc.fileSize}</span>
                </div>
              </div>

              <div className="document-manager-s37">
                ⚠️ This file and its metadata will be permanently deleted from local cache, IndexedDB, and remote society records.
              </div>
            </div>

            <div className="atomic-modal-footer">
              <button
                type="button"
                data-testid="cancel-delete-doc-btn"
                onClick={() => setDeletingDoc(null)}
                disabled={isDeleting}
                className="atomic-btn atomic-btn--secondary"
              >
                Cancel
              </button>

              <button
                type="button"
                data-testid="confirm-delete-doc-btn"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="atomic-btn atomic-btn--danger"
              >
                {isDeleting ? 'Deleting...' : '🗑️ Delete Document'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
