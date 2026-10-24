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
import './MonthlyMomStorageVault.css';


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
    <div data-testid="monthly-mom-vault-container" className="monthly-mom-storage-vault-s1">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="monthly-mom-storage-vault-s2" style={{ background: toastMessage.type === 'success' ? '#ecfdf5' : '#eff6ff', color: toastMessage.type === 'success' ? '#065f46' : '#1e40af', border: `1px solid ${toastMessage.type === 'success' ? '#a7f3d0' : '#bfdbfe'}` }}>
          <div className="monthly-mom-storage-vault-s3">
            <CheckCircle2 size={18} color="#059669" />
            <span>{toastMessage.msg}</span>
          </div>
          <button type="button" onClick={() => setToastMessage(null)} className="monthly-mom-storage-vault-s4">✕</button>
        </div>
      )}

      {/* Header & Upload Action */}
      <div className="monthly-mom-storage-vault-s5">
        <div>
          <div className="monthly-mom-storage-vault-s6">
            <FileCheck size={14} />
            Statutory Document Repository
          </div>
          <h3 className="monthly-mom-storage-vault-s7">
            📁 Monthly MOM Storage & Upload Vault
          </h3>
          <p className="monthly-mom-storage-vault-s8">
            Store signed, scanned physical copies, Images, and PDFs of your monthly committee meetings for Building 'A' and Common Infrastructure.
          </p>
        </div>

        <div className="monthly-mom-storage-vault-s9">
          <button
            type="button"
            data-testid="open-upload-modal-btn"
            onClick={() => setIsUploadModalOpen(true)}
            className="monthly-mom-storage-vault-s10"
          >
            <Upload size={16} />
            📤 Upload Monthly MOM (Image / PDF)
          </button>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="button-secondary monthly-mom-storage-vault-s11"
            >
              ← Back
            </button>
          )}
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="monthly-mom-storage-vault-s12">
        
        {/* Scope Filters */}
        <div className="monthly-mom-storage-vault-s13">
          <button
            type="button"
            data-testid="filter-scope-all-btn"
            onClick={() => setScopeFilter('ALL')}
            className="monthly-mom-storage-vault-s14" style={{ background: scopeFilter === 'ALL' ? '#ffffff' : 'transparent', color: scopeFilter === 'ALL' ? '#0f172a' : '#64748b' }}
          >
            All Scopes ({momArchives.length})
          </button>
          <button
            type="button"
            data-testid="filter-scope-wing-a-btn"
            onClick={() => setScopeFilter('A_BUILDING')}
            className="monthly-mom-storage-vault-s14" style={{ background: scopeFilter === 'A_BUILDING' ? '#059669' : 'transparent', color: scopeFilter === 'A_BUILDING' ? '#ffffff' : '#64748b' }}
          >
            🏢 Wing 'A' ({momArchives.filter(m => m.scope === 'A_BUILDING').length})
          </button>
          <button
            type="button"
            data-testid="filter-scope-common-btn"
            onClick={() => setScopeFilter('COMMON')}
            className="monthly-mom-storage-vault-s14" style={{ background: scopeFilter === 'COMMON' ? '#2563eb' : 'transparent', color: scopeFilter === 'COMMON' ? '#ffffff' : '#64748b' }}
          >
            🌐 Common ({momArchives.filter(m => m.scope === 'COMMON').length})
          </button>
        </div>

        {/* Month Selector & Search */}
        <div className="monthly-mom-storage-vault-s15">
          <select
            value={selectedMonth}
            onChange={e => setSelectedMonth(e.target.value)}
            className="monthly-mom-storage-vault-s16"
          >
            <option value="ALL">🗓️ All Months</option>
            {availableMonths.map(m => (
              <option key={m} value={m}>
                {new Date(m + '-01').toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
              </option>
            ))}
          </select>

          <div className="monthly-mom-storage-vault-s17">
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search title, notes, files..."
              className="monthly-mom-storage-vault-s18"
            />
            <Search size={14} color="#94a3b8" className="monthly-mom-storage-vault-s19" />
          </div>
        </div>

      </div>

      {/* Archives Card Grid */}
      {filteredMoms.length === 0 ? (
        <div className="monthly-mom-storage-vault-s20">
          <Upload size={36} color="#94a3b8" className="monthly-mom-storage-vault-s21" />
          <h4 className="monthly-mom-storage-vault-s22">No Monthly MOM documents found</h4>
          <p className="monthly-mom-storage-vault-s23">You can upload and store your first signed monthly MOM (image or PDF) right now.</p>
          <button
            type="button"
            onClick={() => setIsUploadModalOpen(true)}
            className="button-primary monthly-mom-storage-vault-s24"
          >
            + Upload Monthly MOM Now
          </button>
        </div>
      ) : (
        <div className="monthly-mom-storage-vault-s25">
          {filteredMoms.map((mom) => (
            <div
              key={mom.id}
              data-testid={`monthly-mom-card-${mom.id}`}
              className="monthly-mom-storage-vault-s26"
            >
              <div>
                {/* Badges Row */}
                <div className="monthly-mom-storage-vault-s27">
                  <span className="monthly-mom-storage-vault-s28" style={{ background: mom.scope === 'A_BUILDING' ? '#059669' : '#2563eb' }}>
                    {mom.scope === 'A_BUILDING' ? "🏢 WING 'A'" : '🌐 COMMON CAMPUS'}
                  </span>

                  <span className="monthly-mom-storage-vault-s29">
                    🗓️ {mom.monthLabel || mom.month}
                  </span>
                </div>

                {/* Title */}
                <h4 className="monthly-mom-storage-vault-s30">
                  {mom.title}
                </h4>

                {/* Notes Summary */}
                <p className="monthly-mom-storage-vault-s31">
                  {mom.notes}
                </p>

                {/* Metadata Pills */}
                <div className="monthly-mom-storage-vault-s32">
                  <span className="monthly-mom-storage-vault-s33">
                    📅 {mom.meetingDate}
                  </span>
                  <span className="monthly-mom-storage-vault-s34" style={{ background: mom.fileType === 'PDF' ? '#fef2f2' : '#f0fdf4', color: mom.fileType === 'PDF' ? '#dc2626' : '#16a34a', border: `1px solid ${mom.fileType === 'PDF' ? '#fecaca' : '#bbf7d0'}` }}>
                    {mom.fileType === 'PDF' ? '📄 PDF' : '🖼️ IMAGE'} • {mom.fileSize}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="monthly-mom-storage-vault-s35">
                <button
                  type="button"
                  data-testid={`view-mom-btn-${mom.id}`}
                  onClick={() => setViewingDoc(mom)}
                  className="monthly-mom-storage-vault-s36"
                >
                  <Eye size={14} />
                  View
                </button>

                <button
                  type="button"
                  onClick={(e) => handleDownloadFile(mom, e)}
                  title="Download copy"
                  className="monthly-mom-storage-vault-s37"
                >
                  <Download size={14} />
                </button>

                {onLoadIntoGenerator && (
                  <button
                    type="button"
                    onClick={() => onLoadIntoGenerator(mom)}
                    title="Load into AI MOM Generator"
                    className="monthly-mom-storage-vault-s38"
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
                  className="monthly-mom-storage-vault-s39"
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
          className="monthly-mom-storage-vault-s40"
          onClick={() => setIsUploadModalOpen(false)}
        >
          <div
            className="monthly-mom-storage-vault-s41"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="monthly-mom-storage-vault-s42">
              <div className="monthly-mom-storage-vault-s3">
                <div className="monthly-mom-storage-vault-s43">
                  <Upload size={20} />
                </div>
                <div>
                  <h3 className="monthly-mom-storage-vault-s44">
                    Upload Monthly MOM (Image / PDF)
                  </h3>
                  <span className="monthly-mom-storage-vault-s45">Store physical minutes or scanned documents</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsUploadModalOpen(false)}
                className="monthly-mom-storage-vault-s46"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUploadSubmit}>
              {/* Scope Selection */}
              <div className="monthly-mom-storage-vault-s47">
                <label className="monthly-mom-storage-vault-s48">
                  Meeting Target Scope
                </label>
                <div className="monthly-mom-storage-vault-s49">
                  <button
                    type="button"
                    onClick={() => {
                      setUploadScope('A_BUILDING');
                      const monthName = new Date(uploadMonth + '-01').toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
                      setUploadTitle(`Wing 'A' Monthly MOM — ${monthName}`);
                    }}
                    className="monthly-mom-storage-vault-s50" style={{ border: uploadScope === 'A_BUILDING' ? '2px solid #059669' : '1px solid #cbd5e1', background: uploadScope === 'A_BUILDING' ? '#ecfdf5' : '#ffffff', color: uploadScope === 'A_BUILDING' ? '#047857' : '#475569' }}
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
                    className="monthly-mom-storage-vault-s50" style={{ border: uploadScope === 'COMMON' ? '2px solid #2563eb' : '1px solid #cbd5e1', background: uploadScope === 'COMMON' ? '#eff6ff' : '#ffffff', color: uploadScope === 'COMMON' ? '#1d4ed8' : '#475569' }}
                  >
                    🌐 Common Society
                  </button>
                </div>
              </div>

              {/* Month & Date Row */}
              <div className="monthly-mom-storage-vault-s51">
                <div>
                  <label className="monthly-mom-storage-vault-s48">
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
                    className="monthly-mom-storage-vault-s52"
                  />
                </div>

                <div>
                  <label className="monthly-mom-storage-vault-s48">
                    Meeting Date
                  </label>
                  <input
                    type="date"
                    required
                    value={uploadDate}
                    onChange={e => setUploadDate(e.target.value)}
                    className="monthly-mom-storage-vault-s52"
                  />
                </div>
              </div>

              {/* Title Input */}
              <div className="monthly-mom-storage-vault-s47">
                <label className="monthly-mom-storage-vault-s48">
                  Document Title / Heading
                </label>
                <input
                  type="text"
                  required
                  value={uploadTitle}
                  onChange={e => setUploadTitle(e.target.value)}
                  placeholder="e.g. Wing 'A' Managing Committee Minutes — October 2026"
                  className="monthly-mom-storage-vault-s53"
                />
              </div>

              {/* Presided By / Chairperson (clean empty field as requested) */}
              <div className="monthly-mom-storage-vault-s47">
                <label className="monthly-mom-storage-vault-s48">
                  Presided By / Chairperson (Optional)
                </label>
                <input
                  type="text"
                  value={uploadChairperson}
                  onChange={e => setUploadChairperson(e.target.value)}
                  placeholder="Leave empty or enter name if applicable"
                  className="monthly-mom-storage-vault-s53"
                />
              </div>

              {/* File Attachment Dropzone */}
              <div className="monthly-mom-storage-vault-s47">
                <label className="monthly-mom-storage-vault-s48">
                  Attach Document (PDF or Image)
                </label>
                <div
                  className="monthly-mom-storage-vault-s54"
                  onClick={() => document.getElementById('mom-file-input').click()}
                >
                  <input
                    id="mom-file-input"
                    data-testid="mom-file-upload-input"
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg,.webp"
                    onChange={handleFileSelect}
                    className="monthly-mom-storage-vault-s55"
                  />

                  {uploadedFile ? (
                    <div>
                      {fileType === 'IMAGE' && filePreviewUrl && (
                        <img
                          src={filePreviewUrl}
                          alt="Preview"
                          className="monthly-mom-storage-vault-s56"
                        />
                      )}
                      <div className="monthly-mom-storage-vault-s57">
                        {uploadedFile.name}
                      </div>
                      <span className="monthly-mom-storage-vault-s58">
                        {fileSizeText} • {fileType}
                      </span>
                    </div>
                  ) : (
                    <div>
                      <Upload size={28} color="#2563eb" className="monthly-mom-storage-vault-s59" />
                      <div className="monthly-mom-storage-vault-s60">
                        Click to select PDF or Image
                      </div>
                      <span className="monthly-mom-storage-vault-s61">
                        Supports PDF, PNG, JPG, JPEG, WEBP (up to 25 MB)
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Notes / Summary */}
              <div className="monthly-mom-storage-vault-s62">
                <label className="monthly-mom-storage-vault-s48">
                  Summary Notes / Key Decisions
                </label>
                <textarea
                  rows={3}
                  value={uploadNotes}
                  onChange={e => setUploadNotes(e.target.value)}
                  placeholder="Key decisions taken, approvals, vendors mentioned, or lift/STP status..."
                  className="monthly-mom-storage-vault-s52"
                />
              </div>

              {/* Submit Buttons */}
              <div className="monthly-mom-storage-vault-s63">
                <button
                  type="button"
                  onClick={() => setIsUploadModalOpen(false)}
                  className="button-secondary monthly-mom-storage-vault-s64"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  data-testid="submit-monthly-mom-btn"
                  disabled={isSubmitting}
                  className="button-primary monthly-mom-storage-vault-s65"
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
          className="monthly-mom-storage-vault-s66"
          onClick={() => setViewingDoc(null)}
        >
          <div
            className="monthly-mom-storage-vault-s67"
            onClick={e => e.stopPropagation()}
          >
            {/* Lightbox Toolbar */}
            <div className="monthly-mom-storage-vault-s68">
              <div>
                <h4 className="monthly-mom-storage-vault-s69">{viewingDoc.title}</h4>
                <span className="monthly-mom-storage-vault-s70">
                  {viewingDoc.monthLabel || viewingDoc.month} • {viewingDoc.fileName} • {viewingDoc.fileSize}
                </span>
              </div>

              <div className="monthly-mom-storage-vault-s71">
                {viewingDoc.fileType === 'IMAGE' && (
                  <>
                    <button
                      type="button"
                      onClick={() => setZoomLevel(prev => Math.min(prev + 0.2, 2.5))}
                      title="Zoom In"
                      className="monthly-mom-storage-vault-s72"
                    >
                      <ZoomIn size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setZoomLevel(prev => Math.max(prev - 0.2, 0.5))}
                      title="Zoom Out"
                      className="monthly-mom-storage-vault-s72"
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
                    className="monthly-mom-storage-vault-s73"
                  >
                    <ExternalLink size={14} />
                    Open in New Tab
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => handleDownloadFile(viewingDoc)}
                  title="Download File"
                  className="monthly-mom-storage-vault-s74"
                >
                  <Download size={14} />
                  Download
                </button>

                <button
                  type="button"
                  data-testid="lightbox-delete-mom-btn"
                  onClick={(e) => handleRequestDelete(viewingDoc, e)}
                  title="Delete Document"
                  className="monthly-mom-storage-vault-s75"
                >
                  <Trash2 size={14} />
                  Delete
                </button>

                <button
                  type="button"
                  onClick={() => setViewingDoc(null)}
                  className="monthly-mom-storage-vault-s76"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Document Content View */}
            <div className="monthly-mom-storage-vault-s77">
              {isLoadingFile ? (
                <div className="monthly-mom-storage-vault-s78">
                  <FileText size={40} color="#2563eb" className="monthly-mom-storage-vault-s79" />
                  <p className="monthly-mom-storage-vault-s80">Loading document from storage...</p>
                </div>
              ) : activeFileBlobUrl && viewingDoc.fileType === 'IMAGE' ? (
                <div className="monthly-mom-storage-vault-s81">
                  <img
                    src={activeFileBlobUrl}
                    alt={viewingDoc.title}
                    className="monthly-mom-storage-vault-s82" style={{ transform: `scale(${zoomLevel})` }}
                  />
                </div>
              ) : activeFileBlobUrl && viewingDoc.fileType === 'PDF' ? (
                <div className="monthly-mom-storage-vault-s83">
                  <div className="monthly-mom-storage-vault-s84">
                    <span>📄 <strong>{viewingDoc.fileName}</strong> ({viewingDoc.fileSize})</span>
                    <button
                      type="button"
                      onClick={() => window.open(activeFileBlobUrl, '_blank')}
                      className="monthly-mom-storage-vault-s85"
                    >
                      ↗️ Full Screen Native Viewer
                    </button>
                  </div>
                  <object
                    data={activeFileBlobUrl}
                    type="application/pdf"
                    className="monthly-mom-storage-vault-s86"
                  >
                    <iframe
                      src={activeFileBlobUrl}
                      title={viewingDoc.title}
                      className="monthly-mom-storage-vault-s86"
                    >
                      <div className="monthly-mom-storage-vault-s87">
                        <p className="monthly-mom-storage-vault-s88">PDF Document Loaded</p>
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
                <div className="monthly-mom-storage-vault-s89">
                  <FileText size={48} color="#2563eb" className="monthly-mom-storage-vault-s79" />
                  <h4 className="monthly-mom-storage-vault-s90">
                    {viewingDoc.title}
                  </h4>
                  <div className="monthly-mom-storage-vault-s91">
                    <div className="monthly-mom-storage-vault-s92">
                      <div><strong>Meeting Date:</strong> {viewingDoc.meetingDate}</div>
                      <div><strong>Meeting Time:</strong> {viewingDoc.meetingTime || '10:30 AM'}</div>
                      <div><strong>Scope:</strong> {viewingDoc.scope === 'A_BUILDING' ? "Wing 'A'" : 'Common Infrastructure'}</div>
                      <div><strong>Presided By:</strong> {viewingDoc.chairperson || '(General Body)'}</div>
                    </div>
                    <div className="monthly-mom-storage-vault-s93">
                      <strong>File:</strong> {viewingDoc.fileName} ({viewingDoc.fileSize})
                    </div>
                    <hr className="monthly-mom-storage-vault-s94" />
                    <strong>Summary & Resolutions:</strong>
                    <p className="monthly-mom-storage-vault-s95">{viewingDoc.notes}</p>
                  </div>
                  <div className="monthly-mom-storage-vault-s96">
                    <button
                      type="button"
                      onClick={() => handleDownloadFile(viewingDoc)}
                      className="button-primary monthly-mom-storage-vault-s97"
                    >
                      <Download size={14} className="monthly-mom-storage-vault-s98" />
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
                        className="button-secondary monthly-mom-storage-vault-s97"
                      >
                        <Sparkles size={14} className="monthly-mom-storage-vault-s99" />
                        Open in AI Generator
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Bar */}
            <div className="monthly-mom-storage-vault-s100">
              <span className="monthly-mom-storage-vault-s45">
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
                  className="button-primary monthly-mom-storage-vault-s101"
                >
                  <Sparkles size={13} className="monthly-mom-storage-vault-s102" />
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
          className="monthly-mom-storage-vault-s103"
          onClick={(e) => {
            if (e.target === e.currentTarget && !isDeleting) setDeletingMomDoc(null);
          }}
        >
          <div
            className="monthly-mom-storage-vault-s104"
          >
            {/* Header */}
            <div className="monthly-mom-storage-vault-s105">
              <div className="monthly-mom-storage-vault-s106">
                <Trash2 size={20} />
              </div>
              <div>
                <h4 className="monthly-mom-storage-vault-s107">
                  Delete Monthly MOM Record?
                </h4>
                <p className="monthly-mom-storage-vault-s108">
                  This action permanently deletes the document
                </p>
              </div>
            </div>

            {/* Content */}
            <div className="monthly-mom-storage-vault-s109">
              <div className="monthly-mom-storage-vault-s110">
                <div className="monthly-mom-storage-vault-s111">
                  {deletingMomDoc.title}
                </div>
                <div className="monthly-mom-storage-vault-s112">
                  <span>📅 {deletingMomDoc.month || deletingMomDoc.meetingDate}</span>
                  <span>•</span>
                  <span>📄 {deletingMomDoc.fileName || 'Archive Record'} ({deletingMomDoc.fileSize})</span>
                  <span>•</span>
                  <span>🏢 {deletingMomDoc.scope === 'A_BUILDING' ? "Wing 'A'" : 'Common Infra'}</span>
                </div>
              </div>

              <div className="monthly-mom-storage-vault-s113">
                <AlertTriangle size={18} className="monthly-mom-storage-vault-s114" />
                <div>
                  This file and its summary will be permanently erased from your browser cache, offline IndexedDB, and society Firestore records. This cannot be recovered.
                </div>
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="monthly-mom-storage-vault-s115">
              <button
                type="button"
                data-testid="cancel-delete-mom-btn"
                onClick={() => setDeletingMomDoc(null)}
                disabled={isDeleting}
                className="monthly-mom-storage-vault-s116" style={{ cursor: isDeleting ? 'not-allowed' : 'pointer' }}
              >
                Cancel
              </button>

              <button
                type="button"
                data-testid="confirm-delete-mom-btn"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="monthly-mom-storage-vault-s117" style={{ background: isDeleting ? '#94a3b8' : '#dc2626', cursor: isDeleting ? 'not-allowed' : 'pointer' }}
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
