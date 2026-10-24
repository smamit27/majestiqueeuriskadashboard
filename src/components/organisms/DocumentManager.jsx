import React, { useState, useEffect, useMemo } from 'react';
import { collection, getDocs, addDoc, setDoc, deleteDoc, doc, serverTimestamp, query, orderBy, where } from 'firebase/firestore';
import { db, storage, isFirebaseConfigured, ensureFirebaseSession } from '../../firebase.js';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { saveDocumentFile, getDocumentFile, deleteDocumentFile, createSafeBlobUrl } from '../../utils/documentStorageDb.js';
import { logAuditEvent, AUDIT_ACTIONS } from '../../services/auditService.js';
import { ROLES, canEditModule, MODULES } from '../../services/rbacService.js';
import { DocumentViewerModal } from './InPortalDocumentViewer.jsx';

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
    <div className="section-card" style={{ padding: '24px', borderRadius: '16px', background: 'white' }}>
      {/* Header Banner */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '1.8rem' }}>📁</span>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800, color: '#0b2b26' }}>Society Document Vault</h2>
              <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: '#5f665f' }}>
                Secure legal, AGM, compliance, and vendor agreements repository for Majestique Euriska
              </p>
            </div>
          </div>
        </div>

        {canUpload && (
          <button
            onClick={() => setIsUploadModalOpen(true)}
            className="button-primary"
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 18px', borderRadius: '10px' }}
          >
            <span>+</span> Upload Document
          </button>
        )}
      </div>

      {/* Filter Toolbar */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center', marginBottom: '20px', background: '#f8fafc', padding: '16px', borderRadius: '12px' }}>
        {/* Search */}
        <div style={{ flex: '1 1 240px', minWidth: '200px' }}>
          <input
            type="text"
            className="attendance-register-input"
            style={{ width: '100%', textAlign: 'left', padding: '9px 14px', borderRadius: '8px' }}
            placeholder="Search documents by title, keyword, or uploader..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Category Dropdown */}
        <div style={{ flex: '0 1 200px' }}>
          <select
            className="attendance-register-input"
            style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', cursor: 'pointer' }}
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
          <div style={{ flex: '0 1 200px' }}>
            <select
              className="attendance-register-input"
              style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', cursor: 'pointer' }}
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
        <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>Loading document records...</div>
      ) : visibleDocuments.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', background: '#f1f5f9', borderRadius: '12px', color: '#64748b' }}>
          <span style={{ fontSize: '2rem', display: 'block', marginBottom: '8px' }}>📂</span>
          <strong>No matching documents found.</strong>
          <p style={{ fontSize: '0.85rem', margin: '6px 0 0' }}>Try adjusting your search filters or upload a new record.</p>
        </div>
      ) : (
        <div style={{ overflowX: 'auto', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '12px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
            <thead>
              <tr style={{ background: '#f1f5f9', borderBottom: '2px solid rgba(0,0,0,0.06)' }}>
                <th style={{ padding: '12px 16px' }}>Document Name</th>
                <th style={{ padding: '12px 16px' }}>Category</th>
                <th style={{ padding: '12px 16px' }}>Version</th>
                <th style={{ padding: '12px 16px' }}>Uploaded On</th>
                <th style={{ padding: '12px 16px' }}>Access Level</th>
                <th style={{ padding: '12px 16px' }}>Expiry</th>
                <th style={{ padding: '12px 16px', textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {visibleDocuments.map((doc, idx) => {
                const isExpiring = doc.expiryDate && (new Date(doc.expiryDate) - new Date()) / 86400000 < 60;
                return (
                  <tr key={doc.id || idx} style={{ borderBottom: '1px solid rgba(0,0,0,0.05)', transition: 'background 0.15s' }}>
                    <td style={{ padding: '14px 16px', fontWeight: 600 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ color: '#ef4444', fontWeight: 800 }}>📄</span>
                        <div>
                          <div style={{ color: '#0f172a' }}>{doc.name}</div>
                          {doc.notes && <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>{doc.notes}</div>}
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{ background: '#e0f2fe', color: '#0369a1', padding: '3px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700 }}>
                        {doc.category}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px', color: '#475569' }}>v{doc.version || '1.0'}</td>
                    <td style={{ padding: '14px 16px', color: '#475569' }}>{doc.uploadDate}</td>
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{
                        padding: '3px 8px',
                        borderRadius: '6px',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        background: doc.accessLevel === 'PUBLIC_RESIDENTS' ? '#dcfce7' : '#fef3c7',
                        color: doc.accessLevel === 'PUBLIC_RESIDENTS' ? '#15803d' : '#b45309'
                      }}>
                        {doc.accessLevel === 'PUBLIC_RESIDENTS' ? 'Public' : 'Committee Only'}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      {doc.expiryDate ? (
                        <span style={{ color: isExpiring ? '#dc2626' : '#475569', fontWeight: isExpiring ? 700 : 500 }}>
                          {doc.expiryDate} {isExpiring && '⚠️'}
                        </span>
                      ) : (
                        <span style={{ color: '#94a3b8' }}>Perpetual</span>
                      )}
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'inline-flex', gap: '6px', alignItems: 'center', justifyContent: 'flex-end' }}>
                        <button
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
                          style={{
                            background: '#1e293b',
                            color: '#e2e8f0',
                            border: '1px solid #334155',
                            padding: '6px 10px',
                            borderRadius: '6px',
                            fontSize: '0.76rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          🖨️ Print
                        </button>
                        <button
                          onClick={() => handleViewInPortal(doc)}
                          style={{
                            background: '#0d9488',
                            color: '#ffffff',
                            border: 'none',
                            padding: '6px 10px',
                            borderRadius: '6px',
                            fontSize: '0.76rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          👁️ View
                        </button>
                        <a
                          href={doc.downloadUrl || '#'}
                          download={doc.name}
                          onClick={(e) => handleDownloadDoc(doc, e)}
                          style={{
                            textDecoration: 'none',
                            background: '#0b2b26',
                            color: '#C49B4F',
                            padding: '6px 10px',
                            borderRadius: '6px',
                            fontSize: '0.76rem',
                            fontWeight: 700,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          ⬇ Download
                        </a>
                        {canUpload && (
                          <button
                            type="button"
                            data-testid={`delete-doc-btn-${doc.id || doc.name}`}
                            onClick={(e) => handleRequestDelete(doc, e)}
                            title="Delete Document"
                            style={{
                              background: '#fef2f2',
                              color: '#dc2626',
                              border: '1px solid #fecaca',
                              padding: '6px 10px',
                              borderRadius: '6px',
                              fontSize: '0.76rem',
                              fontWeight: 700,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
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
      {isUploadModalOpen && (
        <div className="modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100 }}>
          <div className="section-card" style={{ width: 'min(92vw, 550px)', background: 'white', padding: '28px', borderRadius: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, fontSize: '1.25rem' }}>Upload Society Document</h3>
              <button onClick={() => setIsUploadModalOpen(false)} style={{ border: 'none', background: 'none', fontSize: '1.4rem', cursor: 'pointer' }}>×</button>
            </div>

            <form onSubmit={handleUploadSubmit} style={{ display: 'grid', gap: '14px' }}>
              <div>
                <label className="eyebrow" style={{ display: 'block', marginBottom: '6px' }}>Document Title *</label>
                <input
                  type="text"
                  required
                  className="attendance-register-input"
                  style={{ width: '100%', textAlign: 'left' }}
                  placeholder="e.g. AGM 2026 Minutes & Accounts"
                  value={docName}
                  onChange={(e) => setDocName(e.target.value)}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label className="eyebrow" style={{ display: 'block', marginBottom: '6px' }}>Category *</label>
                  <select
                    className="attendance-register-input"
                    style={{ width: '100%' }}
                    value={docCategory}
                    onChange={(e) => setDocCategory(e.target.value)}
                  >
                    {DOCUMENT_CATEGORIES.filter(c => c !== 'All Categories').map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="eyebrow" style={{ display: 'block', marginBottom: '6px' }}>Access Level *</label>
                  <select
                    className="attendance-register-input"
                    style={{ width: '100%' }}
                    value={docAccess}
                    onChange={(e) => setDocAccess(e.target.value)}
                  >
                    <option value="PUBLIC_RESIDENTS">Public (Residents & Committee)</option>
                    <option value="COMMITTEE_ONLY">Committee Only</option>
                    <option value="ADMIN_ONLY">Admin Only</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label className="eyebrow" style={{ display: 'block', marginBottom: '6px' }}>Version</label>
                  <input
                    type="text"
                    className="attendance-register-input"
                    style={{ width: '100%', textAlign: 'left' }}
                    placeholder="1.0"
                    value={docVersion}
                    onChange={(e) => setDocVersion(e.target.value)}
                  >
                  </input>
                </div>

                <div>
                  <label className="eyebrow" style={{ display: 'block', marginBottom: '6px' }}>Expiry Date (Optional)</label>
                  <input
                    type="date"
                    className="attendance-register-input"
                    style={{ width: '100%' }}
                    value={docExpiry}
                    onChange={(e) => setDocExpiry(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="eyebrow" style={{ display: 'block', marginBottom: '6px' }}>Attach File (PDF, DOCX, XLSX)</label>
                <input
                  type="file"
                  accept=".pdf,.docx,.xlsx,.jpg,.png"
                  onChange={handleFileChange}
                  style={{ width: '100%', fontSize: '0.85rem' }}
                />
              </div>

              <div>
                <label className="eyebrow" style={{ display: 'block', marginBottom: '6px' }}>Description / Notes</label>
                <textarea
                  className="attendance-register-input"
                  rows={2}
                  style={{ width: '100%', textAlign: 'left', resize: 'vertical' }}
                  placeholder="Key resolution points, approval notes, or vendor details..."
                  value={docNotes}
                  onChange={(e) => setDocNotes(e.target.value)}
                />
              </div>

              {uploadError && <p style={{ color: '#ef4444', fontSize: '0.85rem', margin: 0 }}>{uploadError}</p>}
              {uploadSuccess && <p style={{ color: '#10b981', fontSize: '0.85rem', margin: 0 }}>{uploadSuccess}</p>}

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '10px' }}>
                <button type="button" className="button-secondary" onClick={() => setIsUploadModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="button-primary">
                  Upload & Archive
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.7)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1150,
            padding: '16px'
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget && !isDeleting) setDeletingDoc(null);
          }}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '16px',
              maxWidth: '460px',
              width: '100%',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              overflow: 'hidden',
              border: '1px solid #fee2e2'
            }}
          >
            <div style={{ background: '#fef2f2', padding: '18px 22px', borderBottom: '1px solid #fecaca', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ background: '#fee2e2', color: '#dc2626', width: '40px', height: '40px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '1.2rem' }}>
                🗑️
              </div>
              <div>
                <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#991b1b' }}>
                  Delete Document Record?
                </h4>
                <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: '#b91c1c' }}>
                  This action permanently removes this document
                </p>
              </div>
            </div>

            <div style={{ padding: '20px 22px' }}>
              <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '10px', border: '1px solid #e2e8f0', marginBottom: '16px', fontSize: '0.84rem' }}>
                <div style={{ fontWeight: 800, color: '#0f172a', marginBottom: '4px' }}>
                  {deletingDoc.name}
                </div>
                <div style={{ fontSize: '0.76rem', color: '#64748b', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  <span>📂 {deletingDoc.category}</span>
                  <span>•</span>
                  <span>📅 {deletingDoc.uploadDate}</span>
                  <span>•</span>
                  <span>📄 {deletingDoc.fileSize}</span>
                </div>
              </div>

              <div style={{ background: '#fffbeb', border: '1px solid #fef3c7', padding: '12px', borderRadius: '8px', color: '#92400e', fontSize: '0.8rem', lineHeight: '1.45' }}>
                ⚠️ This file and its metadata will be permanently deleted from local cache, IndexedDB, and remote society records.
              </div>
            </div>

            <div style={{ padding: '14px 22px', background: '#f8fafc', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                data-testid="cancel-delete-doc-btn"
                onClick={() => setDeletingDoc(null)}
                disabled={isDeleting}
                style={{
                  padding: '9px 16px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  background: '#ffffff',
                  color: '#475569',
                  fontSize: '0.84rem',
                  fontWeight: 700,
                  cursor: isDeleting ? 'not-allowed' : 'pointer'
                }}
              >
                Cancel
              </button>

              <button
                type="button"
                data-testid="confirm-delete-doc-btn"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                style={{
                  padding: '9px 18px',
                  borderRadius: '8px',
                  border: 'none',
                  background: isDeleting ? '#94a3b8' : '#dc2626',
                  color: '#ffffff',
                  fontSize: '0.84rem',
                  fontWeight: 800,
                  cursor: isDeleting ? 'not-allowed' : 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
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
