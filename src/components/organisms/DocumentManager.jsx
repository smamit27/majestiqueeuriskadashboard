import React, { useState, useEffect, useMemo } from 'react';
import { collection, getDocs, addDoc, serverTimestamp, query, orderBy } from 'firebase/firestore';
import { db, isFirebaseConfigured, ensureFirebaseSession } from '../../firebase.js';
import { logAuditEvent, AUDIT_ACTIONS } from '../../services/auditService.js';
import { ROLES, canEditModule, MODULES } from '../../services/rbacService.js';

export const DOCUMENT_CATEGORIES = [
  'All Categories',
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
  const [documents, setDocuments] = useState(SEED_DOCUMENTS);
  const [selectedCategory, setSelectedCategory] = useState('All Categories');
  const [searchQuery, setSearchQuery] = useState('');
  const [accessFilter, setAccessFilter] = useState('ALL');
  const [isLoading, setIsLoading] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [uploadSuccess, setUploadSuccess] = useState('');

  // Upload Form state
  const [docName, setDocName] = useState('');
  const [docCategory, setDocCategory] = useState('Society Rules');
  const [docAccess, setDocAccess] = useState('PUBLIC_RESIDENTS');
  const [docVersion, setDocVersion] = useState('1.0');
  const [docExpiry, setDocExpiry] = useState('');
  const [docNotes, setDocNotes] = useState('');
  const [selectedFileName, setSelectedFileName] = useState('');

  const canUpload = canEditModule(userRole, MODULES.DOCUMENTS);

  useEffect(() => {
    let cancelled = false;
    async function fetchDocs() {
      if (!isFirebaseConfigured || !db) return;
      setIsLoading(true);
      try {
        await ensureFirebaseSession();
        const q = query(collection(db, 'societyDocuments'), orderBy('uploadDate', 'desc'));
        const snap = await getDocs(q);
        if (!cancelled && !snap.empty) {
          const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
          // Merge with seeds if distinct
          setDocuments(prev => {
            const ids = new Set(list.map(x => x.name));
            const uniqueSeeds = SEED_DOCUMENTS.filter(s => !ids.has(s.name));
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
        return;
      }
      setSelectedFileName(file.name);
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

    const newDoc = {
      name: docName.trim(),
      category: docCategory,
      uploadDate: new Date().toISOString().split('T')[0],
      uploadedBy: user?.email || userRole,
      version: docVersion.trim() || '1.0',
      expiryDate: docExpiry || '',
      accessLevel: docAccess,
      fileSize: selectedFileName ? '1.5 MB' : 'Digital Record',
      fileType: selectedFileName ? selectedFileName.split('.').pop().toUpperCase() : 'PDF',
      downloadUrl: '#',
      notes: docNotes.trim(),
    };

    try {
      if (isFirebaseConfigured && db) {
        await ensureFirebaseSession();
        await addDoc(collection(db, 'societyDocuments'), {
          ...newDoc,
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
      }, 1200);
    } catch (err) {
      console.error('Document upload error:', err);
      setUploadError('Failed to archive document. Saved locally in current session.');
      setDocuments(prev => [newDoc, ...prev]);
    }
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
                    <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                      <a
                        href={doc.downloadUrl || '#'}
                        download={doc.name}
                        onClick={(e) => {
                          if (doc.downloadUrl === '#') {
                            e.preventDefault();
                            alert(`Downloading official archived document: ${doc.name}`);
                          }
                        }}
                        style={{
                          textDecoration: 'none',
                          background: '#0b2b26',
                          color: '#C49B4F',
                          padding: '6px 14px',
                          borderRadius: '8px',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        ⬇ Download
                      </a>
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
    </div>
  );
}
