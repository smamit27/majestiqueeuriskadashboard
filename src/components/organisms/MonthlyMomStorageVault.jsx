import React, { useState, useEffect, useMemo } from 'react';
import { 
  Upload, 
  FileText, 
  Image as ImageIcon, 
  Calendar, 
  Download, 
  Eye, 
  Trash2, 
  Sparkles, 
  Plus, 
  Search, 
  Filter, 
  CheckCircle2, 
  Clock, 
  Building2, 
  Globe2, 
  X, 
  ZoomIn, 
  ZoomOut, 
  Printer, 
  ExternalLink,
  Bot,
  FileCheck,
  ShieldCheck,
  Maximize2,
  AlertTriangle
} from 'lucide-react';
import { db, storage, isFirebaseConfigured, ensureFirebaseSession } from '../../firebase.js';
import { collection, addDoc, setDoc, getDocs, deleteDoc, doc, serverTimestamp, query, orderBy, where } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { 
  saveDocumentFile, 
  getDocumentFile, 
  deleteDocumentFile, 
  dataUrlToBlob, 
  createSafeBlobUrl 
} from '../../utils/documentStorageDb.js';

export const INITIAL_MONTHLY_MOM_ARCHIVE = [
  {
    id: 'mom-oct-2026-wing-a',
    title: "Wing 'A' Managing Committee Monthly Minutes — October 2026",
    month: '2026-10',
    monthLabel: 'October 2026',
    scope: 'A_BUILDING',
    meetingDate: '2026-10-18',
    meetingTime: '10:30 AM',
    venue: "Society Office / Wing 'A' Lobby",
    chairperson: '',
    uploadedBy: 'Society Secretary',
    uploadDate: '2026-10-19',
    fileType: 'PDF',
    fileName: 'Euriska_WingA_MOM_October_2026_Signed.pdf',
    fileSize: '1.8 MB',
    fileDataUrl: null, // will use fallback demo preview
    notes: 'Approved October 2026 minutes: Otis Lift 2 door sensor replacement sanction, pre-monsoon terrace joint sealing, and WhatsApp reminders to 6 overdue flats.',
    resolutionsCount: 2,
    actionItemsCount: 3
  },
  {
    id: 'mom-sep-2026-common',
    title: 'Joint Common Infrastructure & Apex Committee Minutes — September 2026',
    month: '2026-09',
    monthLabel: 'September 2026',
    scope: 'COMMON',
    meetingDate: '2026-09-20',
    meetingTime: '11:30 AM',
    venue: 'Clubhouse Conference Hall',
    chairperson: '',
    uploadedBy: 'Apex Committee',
    uploadDate: '2026-09-21',
    fileType: 'IMAGE',
    fileName: 'Common_Infra_MOM_Sep_2026_Scanned_Page1.jpg',
    fileSize: '2.4 MB',
    fileDataUrl: null,
    notes: 'September common campus decisions: STP suction tanker clearance (₹8,500), Park+ RFID boom barrier sensor realignment at Gate 2, and Form-B fire certification.',
    resolutionsCount: 2,
    actionItemsCount: 3
  },
  {
    id: 'mom-aug-2026-wing-a',
    title: "Wing 'A' Committee Operational Review — August 2026",
    month: '2026-08',
    monthLabel: 'August 2026',
    scope: 'A_BUILDING',
    meetingDate: '2026-08-16',
    meetingTime: '10:00 AM',
    venue: "Wing 'A' Lobby",
    chairperson: '',
    uploadedBy: 'Estate Manager',
    uploadDate: '2026-08-17',
    fileType: 'PDF',
    fileName: 'Euriska_WingA_MOM_August_2026.pdf',
    fileSize: '1.4 MB',
    fileDataUrl: null,
    notes: 'August wing review: Deep scrubbing of 8th floor corridor cement dust, Kirloskar DG battery routine servicing, and float valve replacement in terrace tank.',
    resolutionsCount: 1,
    actionItemsCount: 2
  }
];

export default function MonthlyMomStorageVault({ 
  onLoadIntoGenerator = null,
  currentScope = 'A_BUILDING',
  onClose = null 
}) {
  // Archives state with local persistence and deleted IDs filtering
  const [momArchives, setMomArchives] = useState(() => {
    try {
      const deletedIds = new Set(JSON.parse(localStorage.getItem('euriska_deleted_mom_ids') || '[]'));
      const stored = localStorage.getItem('euriska_monthly_moms_vault');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          return parsed.filter(m => !deletedIds.has(m.id));
        }
      }
      return INITIAL_MONTHLY_MOM_ARCHIVE.filter(m => !deletedIds.has(m.id));
    } catch {}
    return INITIAL_MONTHLY_MOM_ARCHIVE;
  });

  // UI & Filter states
  const [scopeFilter, setScopeFilter] = useState('ALL'); // 'ALL' | 'A_BUILDING' | 'COMMON'
  const [selectedMonth, setSelectedMonth] = useState('ALL'); // 'ALL' or 'YYYY-MM'
  const [searchQuery, setSearchQuery] = useState('');
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [viewingDoc, setViewingDoc] = useState(null);
  const [deletingMomDoc, setDeletingMomDoc] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [activeFileBlobUrl, setActiveFileBlobUrl] = useState(null);
  const [isLoadingFile, setIsLoadingFile] = useState(false);
  const [fileLoadError, setFileLoadError] = useState(null);
  const [activeDocViewTab, setActiveDocViewTab] = useState('DOCUMENT'); // 'DOCUMENT' | 'SUMMARY'
  const [zoomLevel, setZoomLevel] = useState(1);
  const [toastMessage, setToastMessage] = useState(null);

  // New Upload Form state
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadMonth, setUploadMonth] = useState(() => new Date().toISOString().slice(0, 7)); // 'YYYY-MM'
  const [uploadScope, setUploadScope] = useState(currentScope || 'A_BUILDING');
  const [uploadDate, setUploadDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [uploadChairperson, setUploadChairperson] = useState(''); // starts empty
  const [uploadNotes, setUploadNotes] = useState('');
  const [uploadedFile, setUploadedFile] = useState(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState(null);
  const [fileType, setFileType] = useState('PDF');
  const [fileSizeText, setFileSizeText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Resolve binary Blob URL whenever viewingDoc changes
  useEffect(() => {
    let isCancelled = false;
    let createdUrl = null;

    if (!viewingDoc) {
      if (activeFileBlobUrl) {
        URL.revokeObjectURL(activeFileBlobUrl);
        setActiveFileBlobUrl(null);
      }
      setFileLoadError(null);
      return;
    }

    async function loadFileContent() {
      setIsLoadingFile(true);
      setFileLoadError(null);
      try {
        // 1. Look up binary from IndexedDB (stores unlimited MBs locally in browser)
        const stored = await getDocumentFile(viewingDoc.id);
        if (!isCancelled && stored && stored.blob) {
          createdUrl = URL.createObjectURL(stored.blob);
          setActiveFileBlobUrl(createdUrl);
          setIsLoadingFile(false);
          return;
        }

        // 2. Look up cloud downloadUrl
        if (!isCancelled && viewingDoc.downloadUrl && viewingDoc.downloadUrl !== '#') {
          setActiveFileBlobUrl(viewingDoc.downloadUrl);
          setIsLoadingFile(false);
          return;
        }

        // 3. Fallback to fileDataUrl
        if (!isCancelled && viewingDoc.fileDataUrl) {
          try {
            const blob = dataUrlToBlob(viewingDoc.fileDataUrl);
            createdUrl = URL.createObjectURL(blob);
            setActiveFileBlobUrl(createdUrl);
            setIsLoadingFile(false);
            return;
          } catch {
            setActiveFileBlobUrl(viewingDoc.fileDataUrl);
            setIsLoadingFile(false);
            return;
          }
        }

        if (!isCancelled) {
          setActiveFileBlobUrl(null);
          setIsLoadingFile(false);
        }
      } catch (err) {
        console.warn('File retrieval error from IndexedDB:', err);
        if (!isCancelled) {
          setFileLoadError('Could not load binary file.');
          setIsLoadingFile(false);
        }
      }
    }

    loadFileContent();

    return () => {
      isCancelled = true;
      if (createdUrl) {
        URL.revokeObjectURL(createdUrl);
      }
    };
  }, [viewingDoc]);

  // Firestore sync
  useEffect(() => {
    if (!isFirebaseConfigured || !db) return;
    const fetchRemoteArchives = async () => {
      try {
        const deletedIds = new Set(JSON.parse(localStorage.getItem('euriska_deleted_mom_ids') || '[]'));
        const q = query(collection(db, 'monthlyMeetingMomUploads'), orderBy('uploadDate', 'desc'));
        const snap = await getDocs(q);
        if (!snap.empty) {
          const remoteList = snap.docs.map(d => ({
            firestoreDocId: d.id,
            ...d.data(),
            id: d.data().id || d.id
          }));
          setMomArchives(prev => {
            const ids = new Set(prev.map(p => p.id));
            const merged = [...prev];
            remoteList.forEach(item => {
              if (!ids.has(item.id) && !deletedIds.has(item.id) && !deletedIds.has(item.firestoreDocId)) {
                merged.push(item);
              }
            });
            return merged.sort((a, b) => (b.month || '').localeCompare(a.month || ''));
          });
        }
      } catch (err) {
        console.warn('Firestore monthly MOM fetch error (offline storage active):', err);
      }
    };
    fetchRemoteArchives();
  }, []);

  // Save clean metadata to localStorage (never store huge base64 strings to prevent QuotaExceededError)
  const saveArchivesLocally = (newList) => {
    setMomArchives(newList);
    try {
      // Strip any huge base64 strings before localStorage save
      const cleanList = newList.map(item => {
        if (item.fileDataUrl && item.fileDataUrl.length > 100000) {
          return { ...item, fileDataUrl: null };
        }
        return item;
      });
      localStorage.setItem('euriska_monthly_moms_vault', JSON.stringify(cleanList));
    } catch (err) {
      console.warn('LocalStorage save error:', err);
    }
  };

  const showToast = (msg, type = 'success') => {
    setToastMessage({ msg, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Unique months available for filtering
  const availableMonths = useMemo(() => {
    const months = Array.from(new Set(momArchives.map(m => m.month).filter(Boolean)));
    return months.sort((a, b) => b.localeCompare(a));
  }, [momArchives]);

  // Filtered MOMs
  const filteredMoms = useMemo(() => {
    return momArchives.filter(m => {
      if (scopeFilter !== 'ALL' && m.scope !== scopeFilter) return false;
      if (selectedMonth !== 'ALL' && m.month !== selectedMonth) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const haystack = `${m.title} ${m.monthLabel} ${m.notes} ${m.fileName} ${m.chairperson}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [momArchives, scopeFilter, selectedMonth, searchQuery]);

  // File picker handler
  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 25 * 1024 * 1024) {
      alert('File size exceeds the 25 MB safety limit.');
      return;
    }

    setUploadedFile(file);
    const sizeKB = (file.size / 1024).toFixed(1);
    const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
    setFileSizeText(file.size > 1024 * 1024 ? `${sizeMB} MB` : `${sizeKB} KB`);

    const isImage = file.type.startsWith('image/') || /\.(jpg|jpeg|png|webp)$/i.test(file.name);
    const isPdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name);
    setFileType(isImage ? 'IMAGE' : isPdf ? 'PDF' : 'DOC');

    // Auto-generate title if empty
    if (!uploadTitle.trim()) {
      const monthName = new Date(uploadMonth + '-01').toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
      setUploadTitle(`${uploadScope === 'A_BUILDING' ? "Wing 'A'" : 'Common Infrastructure'} Monthly MOM — ${monthName}`);
    }

    // Convert to DataURL for immediate image preview if small
    if (isImage) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setFilePreviewUrl(event.target.result);
      };
      reader.readAsDataURL(file);
    } else {
      setFilePreviewUrl(null);
    }
  };

  // Submit new monthly MOM
  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!uploadTitle.trim()) {
      alert('Please enter a title for the Monthly MOM.');
      return;
    }

    setIsSubmitting(true);
    const monthObj = new Date(uploadMonth + '-01');
    const monthLabel = monthObj.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
    const recordId = `mom-upload-${Date.now()}`;

    // 1. Save binary file to IndexedDB (stores unlimited MBs locally in browser)
    if (uploadedFile) {
      try {
        await saveDocumentFile(recordId, uploadedFile, {
          fileName: uploadedFile.name,
          mimeType: uploadedFile.type
        });
      } catch (idbErr) {
        console.warn('IndexedDB save notice:', idbErr);
      }
    }

    // 2. Upload to Firebase Storage if available
    let cloudDownloadUrl = '#';
    if (isFirebaseConfigured && storage && uploadedFile) {
      try {
        const storageRef = ref(storage, `monthly_moms/${recordId}_${uploadedFile.name}`);
        await uploadBytes(storageRef, uploadedFile);
        cloudDownloadUrl = await getDownloadURL(storageRef);
      } catch (storageErr) {
        console.warn('Firebase storage notice (IndexedDB local store active):', storageErr);
      }
    }

    // 3. Prepare clean record (never embed multi-megabyte base64 strings in Firestore or localStorage)
    const newRecord = {
      id: recordId,
      title: uploadTitle.trim(),
      month: uploadMonth,
      monthLabel: monthLabel,
      scope: uploadScope,
      meetingDate: uploadDate,
      chairperson: uploadChairperson.trim(),
      uploadedBy: 'Society Administrator',
      uploadDate: new Date().toISOString().split('T')[0],
      fileType: fileType,
      fileName: uploadedFile ? uploadedFile.name : `MOM_${uploadScope}_${uploadMonth}.${fileType === 'IMAGE' ? 'jpg' : 'pdf'}`,
      fileSize: fileSizeText || '1.5 MB',
      downloadUrl: cloudDownloadUrl,
      // Only keep small image thumbnails in fileDataUrl; never large PDFs
      fileDataUrl: fileType === 'IMAGE' && filePreviewUrl && filePreviewUrl.length < 150000 ? filePreviewUrl : null,
      notes: uploadNotes.trim() || 'Scanned Monthly MOM copy stored in society archives.',
      resolutionsCount: 2,
      actionItemsCount: 3
    };

    // 4. Update local state & localStorage metadata safely
    const updated = [newRecord, ...momArchives];
    saveArchivesLocally(updated);

    // 5. Also save metadata to Firestore (safe from size limit)
    try {
      if (isFirebaseConfigured && db) {
        await ensureFirebaseSession();
        await setDoc(doc(db, 'monthlyMeetingMomUploads', recordId), {
          ...newRecord,
          createdAt: serverTimestamp()
        });

        // Also cross-register into general Society Documents under 'Monthly MOM'
        await addDoc(collection(db, 'societyDocuments'), {
          name: newRecord.title,
          category: 'Monthly MOM',
          uploadDate: newRecord.uploadDate,
          uploadedBy: 'Society Secretary',
          version: '1.0',
          expiryDate: '',
          accessLevel: 'PUBLIC_RESIDENTS',
          fileSize: newRecord.fileSize,
          fileType: newRecord.fileType,
          downloadUrl: cloudDownloadUrl,
          notes: newRecord.notes,
          timestamp: serverTimestamp()
        });
      }
    } catch (err) {
      console.warn('Firestore upload notice (local copy preserved):', err);
    }

    setIsSubmitting(false);
    setIsUploadModalOpen(false);
    setUploadedFile(null);
    setFilePreviewUrl(null);
    setUploadTitle('');
    setUploadNotes('');
    setUploadChairperson('');

    showToast(`Monthly MOM for ${monthLabel} successfully uploaded and archived!`);
  };

  // Request delete (opens in-app confirmation modal)
  const handleRequestDelete = (mom, e) => {
    e?.stopPropagation();
    setDeletingMomDoc(mom);
  };

  // Execute confirmed deletion
  const handleConfirmDelete = async () => {
    if (!deletingMomDoc) return;
    setIsDeleting(true);
    const mom = deletingMomDoc;
    const id = mom.id;

    // 1. Remove from state immediately
    const updated = momArchives.filter(m => m.id !== id);
    saveArchivesLocally(updated);

    // 2. Track deleted ID in localStorage so seeds/remote sync never resurrect it
    try {
      const deletedList = JSON.parse(localStorage.getItem('euriska_deleted_mom_ids') || '[]');
      if (!deletedList.includes(id)) deletedList.push(id);
      if (mom.firestoreDocId && !deletedList.includes(mom.firestoreDocId)) {
        deletedList.push(mom.firestoreDocId);
      }
      localStorage.setItem('euriska_deleted_mom_ids', JSON.stringify(deletedList));
    } catch {}

    // 3. Delete binary from IndexedDB
    try {
      await deleteDocumentFile(id);
    } catch {}

    // 4. Delete from Firestore
    try {
      if (isFirebaseConfigured && db) {
        await deleteDoc(doc(db, 'monthlyMeetingMomUploads', id));
        if (mom.firestoreDocId && mom.firestoreDocId !== id) {
          await deleteDoc(doc(db, 'monthlyMeetingMomUploads', mom.firestoreDocId));
        }

        // Also clean up from general societyDocuments if matching
        try {
          const qDocs = query(collection(db, 'societyDocuments'), where('name', '==', mom.title));
          const snapDocs = await getDocs(qDocs);
          snapDocs.forEach(d => {
            deleteDoc(d.ref).catch(() => {});
          });
        } catch {}
      }
    } catch (err) {
      console.warn('Firestore deletion error:', err);
    }

    // 5. Close lightbox if this document was open
    if (viewingDoc?.id === id) {
      setViewingDoc(null);
    }

    setIsDeleting(false);
    setDeletingMomDoc(null);
    showToast('Document permanently removed from archives.');
  };

  // Download document
  const handleDownloadFile = async (mom, e) => {
    e?.stopPropagation();

    // 1. Check IndexedDB
    try {
      const stored = await getDocumentFile(mom.id);
      if (stored && stored.blob) {
        const url = URL.createObjectURL(stored.blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = mom.fileName || `${mom.title}.${mom.fileType === 'IMAGE' ? 'jpg' : 'pdf'}`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 2000);
        return;
      }
    } catch (err) {
      console.warn('IndexedDB download check warning:', err);
    }

    // 2. Check cloud downloadUrl
    if (mom.downloadUrl && mom.downloadUrl !== '#') {
      const a = document.createElement('a');
      a.href = mom.downloadUrl;
      a.download = mom.fileName || `${mom.title}.pdf`;
      a.target = '_blank';
      a.click();
      return;
    }

    // 3. Check fileDataUrl
    if (mom.fileDataUrl) {
      const a = document.createElement('a');
      a.href = mom.fileDataUrl;
      a.download = mom.fileName || `Monthly_MOM_${mom.month}.${mom.fileType === 'IMAGE' ? 'jpg' : 'pdf'}`;
      a.click();
      return;
    }

    // 4. Clean summary text fallback
    const content = `MAJESTIQUE EURISKA CO-OPERATIVE HOUSING SOCIETY LTD.
MONTHLY MINUTES OF MEETING (MOM) ARCHIVE RECORD
--------------------------------------------------------------------------------
Document Title : ${mom.title}
Meeting Month  : ${mom.monthLabel || mom.month}
Scope          : ${mom.scope === 'A_BUILDING' ? "Wing 'A' Dedicated" : 'Common Infrastructure & Apex'}
Meeting Date   : ${mom.meetingDate}
Uploaded By    : ${mom.uploadedBy} on ${mom.uploadDate}
File Name      : ${mom.fileName} (${mom.fileSize})
--------------------------------------------------------------------------------
Key Discussion Points & Summary Notes:
${mom.notes}
--------------------------------------------------------------------------------
Status: Archived in Permanent Society Records.`;
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${mom.fileName || 'Monthly_MOM_' + mom.month}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div data-testid="monthly-mom-vault-container" style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '24px', boxShadow: '0 4px 20px rgba(0,0,0,0.04)' }}>
      
      {/* Toast Notification */}
      {toastMessage && (
        <div style={{
          marginBottom: '16px',
          padding: '12px 18px',
          borderRadius: '10px',
          background: toastMessage.type === 'success' ? '#ecfdf5' : '#eff6ff',
          color: toastMessage.type === 'success' ? '#065f46' : '#1e40af',
          border: `1px solid ${toastMessage.type === 'success' ? '#a7f3d0' : '#bfdbfe'}`,
          fontSize: '0.86rem',
          fontWeight: 700,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          boxShadow: '0 4px 12px rgba(0,0,0,0.06)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CheckCircle2 size={18} color="#059669" />
            <span>{toastMessage.msg}</span>
          </div>
          <button type="button" onClick={() => setToastMessage(null)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontWeight: 800 }}>✕</button>
        </div>
      )}

      {/* Header & Upload Action */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '22px' }}>
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(37, 99, 235, 0.08)', color: '#2563eb', padding: '4px 12px', borderRadius: '20px', fontSize: '0.74rem', fontWeight: 800, textTransform: 'uppercase', marginBottom: '8px' }}>
            <FileCheck size={14} />
            Statutory Document Repository
          </div>
          <h3 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800, color: '#0f172a' }}>
            📁 Monthly MOM Storage & Upload Vault
          </h3>
          <p style={{ margin: '4px 0 0', fontSize: '0.84rem', color: '#64748b' }}>
            Store signed, scanned physical copies, Images, and PDFs of your monthly committee meetings for Building 'A' and Common Infrastructure.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button
            type="button"
            data-testid="open-upload-modal-btn"
            onClick={() => setIsUploadModalOpen(true)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 18px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
              color: '#ffffff',
              fontSize: '0.86rem',
              fontWeight: 800,
              border: 'none',
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(37, 99, 235, 0.25)',
              transition: 'transform 0.15s ease'
            }}
          >
            <Upload size={16} />
            📤 Upload Monthly MOM (Image / PDF)
          </button>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="button-secondary"
              style={{ padding: '9px 14px', fontSize: '0.84rem' }}
            >
              ← Back
            </button>
          )}
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', padding: '14px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '20px' }}>
        
        {/* Scope Filters */}
        <div style={{ display: 'flex', gap: '6px', background: '#e2e8f0', padding: '3px', borderRadius: '8px' }}>
          <button
            type="button"
            data-testid="filter-scope-all-btn"
            onClick={() => setScopeFilter('ALL')}
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              border: 'none',
              background: scopeFilter === 'ALL' ? '#ffffff' : 'transparent',
              color: scopeFilter === 'ALL' ? '#0f172a' : '#64748b',
              fontWeight: 700,
              fontSize: '0.78rem',
              cursor: 'pointer'
            }}
          >
            All Scopes ({momArchives.length})
          </button>
          <button
            type="button"
            data-testid="filter-scope-wing-a-btn"
            onClick={() => setScopeFilter('A_BUILDING')}
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              border: 'none',
              background: scopeFilter === 'A_BUILDING' ? '#059669' : 'transparent',
              color: scopeFilter === 'A_BUILDING' ? '#ffffff' : '#64748b',
              fontWeight: 700,
              fontSize: '0.78rem',
              cursor: 'pointer'
            }}
          >
            🏢 Wing 'A' ({momArchives.filter(m => m.scope === 'A_BUILDING').length})
          </button>
          <button
            type="button"
            data-testid="filter-scope-common-btn"
            onClick={() => setScopeFilter('COMMON')}
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              border: 'none',
              background: scopeFilter === 'COMMON' ? '#2563eb' : 'transparent',
              color: scopeFilter === 'COMMON' ? '#ffffff' : '#64748b',
              fontWeight: 700,
              fontSize: '0.78rem',
              cursor: 'pointer'
            }}
          >
            🌐 Common ({momArchives.filter(m => m.scope === 'COMMON').length})
          </button>
        </div>

        {/* Month Selector & Search */}
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <select
            value={selectedMonth}
            onChange={e => setSelectedMonth(e.target.value)}
            style={{
              padding: '6px 10px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              background: '#ffffff',
              fontSize: '0.78rem',
              fontWeight: 700,
              color: '#334155'
            }}
          >
            <option value="ALL">🗓️ All Months</option>
            {availableMonths.map(m => (
              <option key={m} value={m}>
                {new Date(m + '-01').toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
              </option>
            ))}
          </select>

          <div style={{ position: 'relative' }}>
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search title, notes, files..."
              style={{
                padding: '6px 12px 6px 30px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '0.8rem',
                width: '180px'
              }}
            />
            <Search size={14} color="#94a3b8" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
          </div>
        </div>

      </div>

      {/* Archives Card Grid */}
      {filteredMoms.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 24px', background: '#f8fafc', borderRadius: '12px', border: '1px dashed #cbd5e1', color: '#64748b' }}>
          <Upload size={36} color="#94a3b8" style={{ marginBottom: '10px' }} />
          <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#334155' }}>No Monthly MOM documents found</h4>
          <p style={{ margin: '6px 0 16px', fontSize: '0.84rem' }}>You can upload and store your first signed monthly MOM (image or PDF) right now.</p>
          <button
            type="button"
            onClick={() => setIsUploadModalOpen(true)}
            className="button-primary"
            style={{ padding: '8px 16px', fontSize: '0.82rem' }}
          >
            + Upload Monthly MOM Now
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
          {filteredMoms.map((mom) => (
            <div
              key={mom.id}
              data-testid={`monthly-mom-card-${mom.id}`}
              style={{
                borderRadius: '12px',
                border: '1px solid #e2e8f0',
                background: '#ffffff',
                padding: '18px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                transition: 'all 0.2s ease',
                position: 'relative'
              }}
            >
              <div>
                {/* Badges Row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                  <span style={{
                    fontSize: '0.7rem',
                    fontWeight: 800,
                    padding: '3px 8px',
                    borderRadius: '8px',
                    background: mom.scope === 'A_BUILDING' ? '#059669' : '#2563eb',
                    color: '#ffffff'
                  }}>
                    {mom.scope === 'A_BUILDING' ? "🏢 WING 'A'" : '🌐 COMMON CAMPUS'}
                  </span>

                  <span style={{
                    fontSize: '0.72rem',
                    fontWeight: 800,
                    padding: '3px 8px',
                    borderRadius: '8px',
                    background: '#f1f5f9',
                    color: '#475569',
                    border: '1px solid #e2e8f0'
                  }}>
                    🗓️ {mom.monthLabel || mom.month}
                  </span>
                </div>

                {/* Title */}
                <h4 style={{ margin: '0 0 8px', fontSize: '1.02rem', fontWeight: 800, color: '#0f172a', lineHeight: '1.35' }}>
                  {mom.title}
                </h4>

                {/* Notes Summary */}
                <p style={{ margin: '0 0 14px', fontSize: '0.82rem', color: '#475569', lineHeight: '1.45', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {mom.notes}
                </p>

                {/* Metadata Pills */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', fontSize: '0.72rem', marginBottom: '16px' }}>
                  <span style={{ background: '#f8fafc', padding: '3px 8px', borderRadius: '6px', border: '1px solid #e2e8f0', color: '#64748b' }}>
                    📅 {mom.meetingDate}
                  </span>
                  <span style={{
                    background: mom.fileType === 'PDF' ? '#fef2f2' : '#f0fdf4',
                    color: mom.fileType === 'PDF' ? '#dc2626' : '#16a34a',
                    border: `1px solid ${mom.fileType === 'PDF' ? '#fecaca' : '#bbf7d0'}`,
                    padding: '3px 8px',
                    borderRadius: '6px',
                    fontWeight: 800
                  }}>
                    {mom.fileType === 'PDF' ? '📄 PDF' : '🖼️ IMAGE'} • {mom.fileSize}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', paddingTop: '12px', borderTop: '1px solid #f1f5f9' }}>
                <button
                  type="button"
                  data-testid={`view-mom-btn-${mom.id}`}
                  onClick={() => setViewingDoc(mom)}
                  style={{
                    flex: 1,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '5px',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    background: '#f8fafc',
                    color: '#1e293b',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    border: '1px solid #cbd5e1',
                    cursor: 'pointer'
                  }}
                >
                  <Eye size={14} />
                  View
                </button>

                <button
                  type="button"
                  onClick={(e) => handleDownloadFile(mom, e)}
                  title="Download copy"
                  style={{
                    padding: '8px 10px',
                    borderRadius: '8px',
                    background: '#f8fafc',
                    color: '#334155',
                    fontSize: '0.78rem',
                    border: '1px solid #cbd5e1',
                    cursor: 'pointer'
                  }}
                >
                  <Download size={14} />
                </button>

                {onLoadIntoGenerator && (
                  <button
                    type="button"
                    onClick={() => onLoadIntoGenerator(mom)}
                    title="Load into AI MOM Generator"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '8px 10px',
                      borderRadius: '8px',
                      background: 'rgba(5, 150, 105, 0.08)',
                      color: '#065f46',
                      fontSize: '0.76rem',
                      fontWeight: 800,
                      border: '1px solid #a7f3d0',
                      cursor: 'pointer'
                    }}
                  >
                    <Sparkles size={13} color="#059669" />
                    AI Edit
                  </button>
                )}

                <button
                  type="button"
                  data-testid={`delete-mom-btn-${mom.id}`}
                  onClick={(e) => handleRequestDelete(mom, e)}
                  title="Delete from archive"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '8px 10px',
                    borderRadius: '8px',
                    background: '#fef2f2',
                    color: '#dc2626',
                    border: '1px solid #fecaca',
                    fontSize: '0.76rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <Trash2 size={13} />
                  <span>Delete</span>
                </button>
              </div>

            </div>
          ))}
        </div>
      )}

      {/* ── UPLOAD MODAL (IMAGE / PDF) ── */}
      {isUploadModalOpen && (
        <div
          data-testid="upload-mom-modal"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '16px'
          }}
          onClick={() => setIsUploadModalOpen(false)}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '16px',
              maxWidth: '560px',
              width: '100%',
              padding: '24px',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 20px 40px rgba(0,0,0,0.2)'
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', paddingBottom: '12px', borderBottom: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ padding: '8px', borderRadius: '10px', background: '#eff6ff', color: '#2563eb' }}>
                  <Upload size={20} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#0f172a' }}>
                    Upload Monthly MOM (Image / PDF)
                  </h3>
                  <span style={{ fontSize: '0.78rem', color: '#64748b' }}>Store physical minutes or scanned documents</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsUploadModalOpen(false)}
                style={{ border: 'none', background: 'transparent', fontSize: '1.2rem', cursor: 'pointer', color: '#94a3b8' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUploadSubmit}>
              {/* Scope Selection */}
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', marginBottom: '6px' }}>
                  Meeting Target Scope
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setUploadScope('A_BUILDING');
                      const monthName = new Date(uploadMonth + '-01').toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
                      setUploadTitle(`Wing 'A' Monthly MOM — ${monthName}`);
                    }}
                    style={{
                      padding: '10px',
                      borderRadius: '8px',
                      border: uploadScope === 'A_BUILDING' ? '2px solid #059669' : '1px solid #cbd5e1',
                      background: uploadScope === 'A_BUILDING' ? '#ecfdf5' : '#ffffff',
                      color: uploadScope === 'A_BUILDING' ? '#047857' : '#475569',
                      fontWeight: 700,
                      fontSize: '0.82rem',
                      cursor: 'pointer'
                    }}
                  >
                    🏢 Building 'A'
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setUploadScope('COMMON');
                      const monthName = new Date(uploadMonth + '-01').toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
                      setUploadTitle(`Common Infrastructure Monthly MOM — ${monthName}`);
                    }}
                    style={{
                      padding: '10px',
                      borderRadius: '8px',
                      border: uploadScope === 'COMMON' ? '2px solid #2563eb' : '1px solid #cbd5e1',
                      background: uploadScope === 'COMMON' ? '#eff6ff' : '#ffffff',
                      color: uploadScope === 'COMMON' ? '#1d4ed8' : '#475569',
                      fontWeight: 700,
                      fontSize: '0.82rem',
                      cursor: 'pointer'
                    }}
                  >
                    🌐 Common Society
                  </button>
                </div>
              </div>

              {/* Month & Date Row */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', marginBottom: '6px' }}>
                    Meeting Month
                  </label>
                  <input
                    type="month"
                    required
                    value={uploadMonth}
                    onChange={e => {
                      setUploadMonth(e.target.value);
                      const monthName = new Date(e.target.value + '-01').toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
                      setUploadTitle(`${uploadScope === 'A_BUILDING' ? "Wing 'A'" : 'Common Infrastructure'} Monthly MOM — ${monthName}`);
                    }}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', marginBottom: '6px' }}>
                    Meeting Date
                  </label>
                  <input
                    type="date"
                    required
                    value={uploadDate}
                    onChange={e => setUploadDate(e.target.value)}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                  />
                </div>
              </div>

              {/* Title Input */}
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', marginBottom: '6px' }}>
                  Document Title / Heading
                </label>
                <input
                  type="text"
                  required
                  value={uploadTitle}
                  onChange={e => setUploadTitle(e.target.value)}
                  placeholder="e.g. Wing 'A' Managing Committee Minutes — October 2026"
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.88rem' }}
                />
              </div>

              {/* Presided By / Chairperson (clean empty field as requested) */}
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', marginBottom: '6px' }}>
                  Presided By / Chairperson (Optional)
                </label>
                <input
                  type="text"
                  value={uploadChairperson}
                  onChange={e => setUploadChairperson(e.target.value)}
                  placeholder="Leave empty or enter name if applicable"
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.88rem' }}
                />
              </div>

              {/* File Attachment Dropzone */}
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', marginBottom: '6px' }}>
                  Attach Document (PDF or Image)
                </label>
                <div
                  style={{
                    border: '2px dashed #93c5fd',
                    background: '#f8fafc',
                    borderRadius: '12px',
                    padding: '20px',
                    textAlign: 'center',
                    cursor: 'pointer',
                    position: 'relative'
                  }}
                  onClick={() => document.getElementById('mom-file-input').click()}
                >
                  <input
                    id="mom-file-input"
                    data-testid="mom-file-upload-input"
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg,.webp"
                    onChange={handleFileSelect}
                    style={{ display: 'none' }}
                  />

                  {uploadedFile ? (
                    <div>
                      {fileType === 'IMAGE' && filePreviewUrl && (
                        <img
                          src={filePreviewUrl}
                          alt="Preview"
                          style={{ maxHeight: '110px', borderRadius: '8px', marginBottom: '8px', objectFit: 'contain' }}
                        />
                      )}
                      <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#0f172a' }}>
                        {uploadedFile.name}
                      </div>
                      <span style={{ fontSize: '0.76rem', color: '#64748b' }}>
                        {fileSizeText} • {fileType}
                      </span>
                    </div>
                  ) : (
                    <div>
                      <Upload size={28} color="#2563eb" style={{ marginBottom: '6px' }} />
                      <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#1e293b' }}>
                        Click to select PDF or Image
                      </div>
                      <span style={{ fontSize: '0.74rem', color: '#64748b' }}>
                        Supports PDF, PNG, JPG, JPEG, WEBP (up to 25 MB)
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Notes / Summary */}
              <div style={{ marginBottom: '18px' }}>
                <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', marginBottom: '6px' }}>
                  Summary Notes / Key Decisions
                </label>
                <textarea
                  rows={3}
                  value={uploadNotes}
                  onChange={e => setUploadNotes(e.target.value)}
                  placeholder="Key decisions taken, approvals, vendors mentioned, or lift/STP status..."
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                />
              </div>

              {/* Submit Buttons */}
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setIsUploadModalOpen(false)}
                  className="button-secondary"
                  style={{ padding: '9px 16px', fontSize: '0.84rem' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  data-testid="submit-monthly-mom-btn"
                  disabled={isSubmitting}
                  className="button-primary"
                  style={{ padding: '9px 20px', fontSize: '0.84rem' }}
                >
                  {isSubmitting ? 'Uploading...' : '💾 Store in Archives'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* ── DOCUMENT LIGHTBOX / PREVIEW MODAL ── */}
      {viewingDoc && (
        <div
          data-testid="view-mom-lightbox"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(15, 23, 42, 0.85)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 99999,
            padding: '20px'
          }}
          onClick={() => setViewingDoc(null)}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '16px',
              maxWidth: '820px',
              width: '100%',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.4)',
              overflow: 'hidden'
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Lightbox Toolbar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px', background: '#0f172a', color: '#ffffff', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 800 }}>{viewingDoc.title}</h4>
                <span style={{ fontSize: '0.76rem', color: '#94a3b8' }}>
                  {viewingDoc.monthLabel || viewingDoc.month} • {viewingDoc.fileName} • {viewingDoc.fileSize}
                </span>
              </div>

              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                {viewingDoc.fileType === 'IMAGE' && (
                  <>
                    <button
                      type="button"
                      onClick={() => setZoomLevel(prev => Math.min(prev + 0.2, 2.5))}
                      title="Zoom In"
                      style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', padding: '6px 10px', borderRadius: '6px', cursor: 'pointer' }}
                    >
                      <ZoomIn size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setZoomLevel(prev => Math.max(prev - 0.2, 0.5))}
                      title="Zoom Out"
                      style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', padding: '6px 10px', borderRadius: '6px', cursor: 'pointer' }}
                    >
                      <ZoomOut size={16} />
                    </button>
                  </>
                )}

                {viewingDoc.fileType === 'PDF' && (
                  <button
                    type="button"
                    onClick={() => {
                      if (activeFileBlobUrl || viewingDoc.downloadUrl) {
                        window.open(activeFileBlobUrl || viewingDoc.downloadUrl, '_blank');
                      } else {
                        handleDownloadFile(viewingDoc);
                      }
                    }}
                    title="Open Full PDF in New Tab"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      background: 'rgba(255,255,255,0.15)',
                      border: '1px solid rgba(255,255,255,0.25)',
                      color: '#ffffff',
                      padding: '6px 12px',
                      borderRadius: '6px',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    <ExternalLink size={14} />
                    Open in New Tab
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => handleDownloadFile(viewingDoc)}
                  title="Download File"
                  style={{ background: '#2563eb', border: 'none', color: '#fff', padding: '6px 14px', borderRadius: '6px', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                >
                  <Download size={14} />
                  Download
                </button>

                <button
                  type="button"
                  data-testid="lightbox-delete-mom-btn"
                  onClick={(e) => handleRequestDelete(viewingDoc, e)}
                  title="Delete Document"
                  style={{
                    background: 'rgba(239, 68, 68, 0.2)',
                    border: '1px solid rgba(239, 68, 68, 0.4)',
                    color: '#fca5a5',
                    padding: '6px 12px',
                    borderRadius: '6px',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px'
                  }}
                >
                  <Trash2 size={14} />
                  Delete
                </button>

                <button
                  type="button"
                  onClick={() => setViewingDoc(null)}
                  style={{ background: 'transparent', border: 'none', color: '#94a3b8', fontSize: '1.3rem', cursor: 'pointer', padding: '0 6px', lineHeight: 1 }}
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Document Content View */}
            <div style={{ padding: '0', overflowY: 'auto', flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', background: '#f8fafc', position: 'relative', minHeight: '500px' }}>
              {isLoadingFile ? (
                <div style={{ textAlign: 'center', padding: '48px', color: '#64748b' }}>
                  <FileText size={40} color="#2563eb" style={{ marginBottom: '12px' }} />
                  <p style={{ margin: 0, fontWeight: 700, fontSize: '0.92rem' }}>Loading document from storage...</p>
                </div>
              ) : activeFileBlobUrl && viewingDoc.fileType === 'IMAGE' ? (
                <div style={{ padding: '24px', textAlign: 'center', width: '100%', overflow: 'auto' }}>
                  <img
                    src={activeFileBlobUrl}
                    alt={viewingDoc.title}
                    style={{ transform: `scale(${zoomLevel})`, transition: 'transform 0.15s ease', maxWidth: '100%', maxHeight: '68vh', borderRadius: '8px', boxShadow: '0 4px 16px rgba(0,0,0,0.1)' }}
                  />
                </div>
              ) : activeFileBlobUrl && viewingDoc.fileType === 'PDF' ? (
                <div style={{ width: '100%', height: '70vh', minHeight: '520px', display: 'flex', flexDirection: 'column' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 16px', background: '#e2e8f0', fontSize: '0.78rem', color: '#334155' }}>
                    <span>📄 <strong>{viewingDoc.fileName}</strong> ({viewingDoc.fileSize})</span>
                    <button
                      type="button"
                      onClick={() => window.open(activeFileBlobUrl, '_blank')}
                      style={{ border: 'none', background: '#2563eb', color: '#ffffff', padding: '3px 8px', borderRadius: '4px', fontSize: '0.74rem', fontWeight: 700, cursor: 'pointer' }}
                    >
                      ↗️ Full Screen Native Viewer
                    </button>
                  </div>
                  <object
                    data={activeFileBlobUrl}
                    type="application/pdf"
                    style={{ width: '100%', height: '100%', border: 'none' }}
                  >
                    <iframe
                      src={activeFileBlobUrl}
                      title={viewingDoc.title}
                      style={{ width: '100%', height: '100%', border: 'none' }}
                    >
                      <div style={{ textAlign: 'center', padding: '40px', color: '#475569' }}>
                        <p style={{ fontWeight: 700 }}>PDF Document Loaded</p>
                        <button
                          type="button"
                          onClick={() => window.open(activeFileBlobUrl, '_blank')}
                          className="button-primary"
                        >
                          Click to open in new tab
                        </button>
                      </div>
                    </iframe>
                  </object>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '36px', maxWidth: '580px', width: '100%' }}>
                  <FileText size={48} color="#2563eb" style={{ marginBottom: '12px' }} />
                  <h4 style={{ margin: '0 0 8px', fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>
                    {viewingDoc.title}
                  </h4>
                  <div style={{ background: '#ffffff', padding: '18px', borderRadius: '12px', border: '1px solid #e2e8f0', textAlign: 'left', marginBottom: '18px', fontSize: '0.86rem', lineHeight: '1.6', color: '#334155' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '10px' }}>
                      <div><strong>Meeting Date:</strong> {viewingDoc.meetingDate}</div>
                      <div><strong>Meeting Time:</strong> {viewingDoc.meetingTime || '10:30 AM'}</div>
                      <div><strong>Scope:</strong> {viewingDoc.scope === 'A_BUILDING' ? "Wing 'A'" : 'Common Infrastructure'}</div>
                      <div><strong>Presided By:</strong> {viewingDoc.chairperson || '(General Body)'}</div>
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#64748b', marginBottom: '10px' }}>
                      <strong>File:</strong> {viewingDoc.fileName} ({viewingDoc.fileSize})
                    </div>
                    <hr style={{ border: 'none', borderTop: '1px solid #f1f5f9', margin: '8px 0' }} />
                    <strong>Summary & Resolutions:</strong>
                    <p style={{ margin: '6px 0 0', color: '#475569', fontSize: '0.84rem' }}>{viewingDoc.notes}</p>
                  </div>
                  <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                    <button
                      type="button"
                      onClick={() => handleDownloadFile(viewingDoc)}
                      className="button-primary"
                      style={{ padding: '8px 16px', fontSize: '0.84rem' }}
                    >
                      <Download size={14} style={{ marginRight: '6px' }} />
                      Download Record
                    </button>
                    {onLoadIntoGenerator && (
                      <button
                        type="button"
                        onClick={() => {
                          const doc = viewingDoc;
                          setViewingDoc(null);
                          onLoadIntoGenerator(doc);
                        }}
                        className="button-secondary"
                        style={{ padding: '8px 16px', fontSize: '0.84rem' }}
                      >
                        <Sparkles size={14} style={{ marginRight: '6px', color: '#059669' }} />
                        Open in AI Generator
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Bar */}
            <div style={{ padding: '12px 20px', background: '#ffffff', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                Archived in Permanent Society Records • {viewingDoc.uploadDate}
              </span>
              {onLoadIntoGenerator && (
                <button
                  type="button"
                  onClick={() => {
                    const doc = viewingDoc;
                    setViewingDoc(null);
                    onLoadIntoGenerator(doc);
                  }}
                  className="button-primary"
                  style={{ padding: '6px 14px', fontSize: '0.78rem' }}
                >
                  <Sparkles size={13} style={{ marginRight: '5px' }} />
                  Open in AI MOM Generator
                </button>
              )}
            </div>

          </div>
        </div>
      )}

      {/* ── DELETE CONFIRMATION MODAL ── */}
      {deletingMomDoc && (
        <div
          data-testid="delete-mom-modal"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(15, 23, 42, 0.7)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
            padding: '16px'
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget && !isDeleting) setDeletingMomDoc(null);
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
            {/* Header */}
            <div style={{ background: '#fef2f2', padding: '18px 22px', borderBottom: '1px solid #fecaca', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ background: '#fee2e2', color: '#dc2626', width: '40px', height: '40px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Trash2 size={20} />
              </div>
              <div>
                <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#991b1b' }}>
                  Delete Monthly MOM Record?
                </h4>
                <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: '#b91c1c' }}>
                  This action permanently deletes the document
                </p>
              </div>
            </div>

            {/* Content */}
            <div style={{ padding: '20px 22px' }}>
              <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '10px', border: '1px solid #e2e8f0', marginBottom: '16px', fontSize: '0.84rem' }}>
                <div style={{ fontWeight: 800, color: '#0f172a', marginBottom: '4px' }}>
                  {deletingMomDoc.title}
                </div>
                <div style={{ fontSize: '0.76rem', color: '#64748b', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  <span>📅 {deletingMomDoc.month || deletingMomDoc.meetingDate}</span>
                  <span>•</span>
                  <span>📄 {deletingMomDoc.fileName || 'Archive Record'} ({deletingMomDoc.fileSize})</span>
                  <span>•</span>
                  <span>🏢 {deletingMomDoc.scope === 'A_BUILDING' ? "Wing 'A'" : 'Common Infra'}</span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', background: '#fffbeb', border: '1px solid #fef3c7', padding: '12px', borderRadius: '8px', color: '#92400e', fontSize: '0.8rem', lineHeight: '1.45' }}>
                <AlertTriangle size={18} style={{ flexShrink: 0, marginTop: '2px', color: '#d97706' }} />
                <div>
                  This file and its summary will be permanently erased from your browser cache, offline IndexedDB, and society Firestore records. This cannot be recovered.
                </div>
              </div>
            </div>

            {/* Footer Buttons */}
            <div style={{ padding: '14px 22px', background: '#f8fafc', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                data-testid="cancel-delete-mom-btn"
                onClick={() => setDeletingMomDoc(null)}
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
                data-testid="confirm-delete-mom-btn"
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
                  gap: '6px',
                  boxShadow: '0 2px 6px rgba(220, 38, 38, 0.3)'
                }}
              >
                <Trash2 size={15} />
                <span>{isDeleting ? 'Deleting...' : 'Yes, Delete Document'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
