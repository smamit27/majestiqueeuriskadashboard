import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Sparkles, 
  Printer, 
  Copy, 
  Download, 
  Save, 
  Trash2, 
  RotateCcw, 
  Building2, 
  Globe2, 
  Calendar, 
  Clock, 
  MapPin, 
  UserCheck, 
  CheckCircle2, 
  FileText, 
  Edit3, 
  ListOrdered, 
  History,
  Check,
  AlertCircle,
  Bot,
  Mic,
  MicOff,
  Share2,
  Zap,
  FolderOpen,
  ArrowLeft,
  ExternalLink,
  BookmarkPlus,
  FolderArchive,
  UploadCloud
} from 'lucide-react';
import { generateMeetingMOM } from '../../services/aiMomService.js';
import { 
  scanNotesForAttendees, 
  calculateQuorum, 
  autoAssignActionItems, 
  generateWhatsAppNotice 
} from '../../services/aiSecretaryAgentService.js';
import { SOCIETY_INFO } from '../../data/societyConfig.js';
import { db, isFirebaseConfigured } from '../../firebase.js';
import { collection, addDoc, getDocs, query, orderBy, limit } from 'firebase/firestore';
import MultiSelectDropdown from '../molecules/MultiSelectDropdown.jsx';
import { COMMITTEE_MEMBERS } from '../../data/committeeMembersData.js';
import VisualAgendaPoster from './VisualAgendaPoster.jsx';
import { OFFICIAL_MOM_TEMPLATES } from '../../data/momTemplatesData.js';
import AiMomSkeletonLoader from '../molecules/AiMomSkeletonLoader.jsx';
import MonthlyMomStorageVault from './MonthlyMomStorageVault.jsx';

const SAMPLE_A_BUILDING_NOTES = `Wing A Managing Committee Monthly Review:
1. Lift 1 between 4th and 5th floor had reported jerky movement. Otis technician visited on Tuesday, diagnosed sensor calibration issue. Sensor replaced under AMC; lift running smoothly now.
2. DG Machine & Battery for Wing A: Kirloskar Care routine servicing completed on 29th. Battery water topped up, load test passed at 100% capacity. Next check-up in 3 months.
3. Wing A Terrace Water Tank: Float valve was slightly loose, causing water overflow on Wednesday morning. Society plumber replaced the brass ball valve. Water supply restored normally.
4. Housekeeping & Floor Cleaning: 6 out of 7 cleaners on duty. 8th floor lobby needs deep scrubbing due to renovation cement dust from flat A-802. Flat owner notified to clean debris.
5. Wing A Dedicated Parking Roster: Flat A-404 resident complained about guest two-wheeler parked in their allotted slot. Manager instructed to issue a parking sticker notice.
6. Maintenance Collection: 81 out of 87 flats have cleared current quarterly dues. 6 flats have outstanding balances. Resolved that Treasurer will send formal WhatsApp reminders by 5th.`;

const SAMPLE_COMMON_NOTES = `Joint Common Infrastructure & Apex Society Coordination Meeting:
1. Main Entrance Gate & Security: Park+ boom barrier was lagging during peak hours. Park+ technician called to recalibrate RFID antenna and optical sensors. Security agency (Rakshak) deployed 1 extra guard at Gate 2.
2. Sewage Treatment Plant (STP): Daily biological testing satisfactory. Recycled water pumped to garden sprinklers and tree belt. Sludge removal tanker scheduled for Saturday. Cost ₹6,500 split per wing ratios.
3. Common Water Supply & Tanker Management: 5,39,400 Liter underground storage tanks inspected. 5 fresh tankers received this week at ₹1,100 per tanker (₹5,500 total). Water meter reading logged.
4. Eisha Builder Handover & Pending Works: Committee reviewed pending handover checklist. Clubhouse gym mirrors, boundary wall light fixtures, and Fire Pump room safety certification are pending from developer. Resolved to send formal escalation notice to Eisha project director by Friday.
5. Fire Safety System: Annual fire drill and hydrant nozzle pressure test confirmed for 15th with Apex Fire Services. Notice to be displayed across all wings (A, B, C) and commercial shops.
6. Common TOI Electricity Bill: Campus lighting and central pump electricity bill of ₹48,200 approved for payment. To be apportioned: Wing A (37.66%), Wing B (41.56%), Wing C (20.78%).`;

export default function AiMomGenerator({ isAdmin = false }) {
  // Metadata & Input States
  const [scope, setScope] = useState('A_BUILDING'); // 'A_BUILDING' | 'COMMON'
  const [meetingType, setMeetingType] = useState('Managing Committee Meeting');
  const [meetingDate, setMeetingDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [meetingTime, setMeetingTime] = useState('11:00 AM');
  const [venue, setVenue] = useState("Society Office / Wing 'A' Lobby");
  const [chairperson, setChairperson] = useState('');
  const [selectedAttendees, setSelectedAttendees] = useState([]);
  const [rawNotes, setRawNotes] = useState(SAMPLE_A_BUILDING_NOTES);

  // Output & UI States
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedMom, setGeneratedMom] = useState(null);
  const [activeView, setActiveView] = useState('preview'); // 'preview' | 'edit' | 'actions' | 'history'
  const [copyFeedback, setCopyFeedback] = useState(false);
  const [saveFeedback, setSaveFeedback] = useState(false);
  const [savedMoms, setSavedMoms] = useState([]);
  const [editableMom, setEditableMom] = useState(null);
  const [historyFilter, setHistoryFilter] = useState('all'); // 'all' | 'official' | 'wingA' | 'common' | 'saved'

  // Filtered Templates & Drafts
  const filteredOfficialTemplates = useMemo(() => {
    if (historyFilter === 'wingA') return OFFICIAL_MOM_TEMPLATES.filter(t => t.scope === 'A_BUILDING');
    if (historyFilter === 'common') return OFFICIAL_MOM_TEMPLATES.filter(t => t.scope === 'COMMON');
    return OFFICIAL_MOM_TEMPLATES;
  }, [historyFilter]);

  const filteredSavedMoms = useMemo(() => {
    if (historyFilter === 'wingA') return savedMoms.filter(m => m.scope === 'A_BUILDING');
    if (historyFilter === 'common') return savedMoms.filter(m => m.scope === 'COMMON');
    return savedMoms;
  }, [savedMoms, historyFilter]);

  // ── AI Secretary Agent States & Autonomous Handlers ──
  const [agentFeedback, setAgentFeedback] = useState(null);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef(null);

  // Real-time Statutory Quorum Calculation
  const quorumInfo = useMemo(() => {
    return calculateQuorum(selectedAttendees, scope, COMMITTEE_MEMBERS);
  }, [selectedAttendees, scope]);

  // Autonomous Attendee Scanner: scans notes and matches against roster
  const handleAgentScanAttendees = () => {
    const result = scanNotesForAttendees(rawNotes, COMMITTEE_MEMBERS);
    if (result.totalDetected === 0) {
      setAgentFeedback({
        type: 'warning',
        message: 'No committee members or flat numbers detected in the current notes. Mention e.g. "A-204 Neha" or "A-301 Sandeep".'
      });
      setTimeout(() => setAgentFeedback(null), 4000);
      return;
    }

    const nextSelected = Array.from(new Set([...selectedAttendees, ...result.detectedMemberIds, ...result.detectedRoles]));
    setSelectedAttendees(nextSelected);
    setAgentFeedback({
      type: 'success',
      message: `🤖 AI Secretary detected ${result.totalDetected} attendee(s): ${result.allMatchedLabels.join(', ')}`
    });
    setTimeout(() => setAgentFeedback(null), 5000);
  };

  // Autonomous Action Item Assignment
  const handleSmartAutoAssign = () => {
    if (!generatedMom) return;
    const targetDoc = activeView === 'edit' && editableMom ? editableMom : generatedMom;
    if (!targetDoc.actionItems) return;
    const updatedActions = autoAssignActionItems(targetDoc.actionItems, selectedAttendees);
    setGeneratedMom(prev => ({ ...prev, actionItems: updatedActions }));
    if (editableMom) {
      setEditableMom(prev => ({ ...prev, actionItems: updatedActions }));
    }
    setAgentFeedback({
      type: 'success',
      message: '🎯 AI Secretary auto-assigned all action items based on task domain!'
    });
    setTimeout(() => setAgentFeedback(null), 4000);
  };

  // WhatsApp Broadcast Copier
  const handleCopyWhatsAppNotice = () => {
    const targetDoc = activeView === 'edit' && editableMom ? editableMom : generatedMom;
    if (!targetDoc) return;
    const notice = generateWhatsAppNotice(targetDoc);
    navigator.clipboard.writeText(notice);
    setAgentFeedback({
      type: 'success',
      message: '📱 Official WhatsApp Meeting Summary copied to clipboard!'
    });
    setTimeout(() => setAgentFeedback(null), 3500);
  };

  // Speech-to-Text Voice Dictation using Web Speech API
  const toggleVoiceDictation = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Voice dictation is supported in modern browsers like Google Chrome, Microsoft Edge, and Safari.');
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-IN';

      recognition.onresult = (event) => {
        let textToAdd = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            textToAdd += event.results[i][0].transcript + ' ';
          }
        }
        if (textToAdd) {
          setRawNotes(prev => (prev ? prev.trim() + '\n' + textToAdd.trim() : textToAdd.trim()));
        }
      };

      recognition.onerror = (e) => {
        console.warn('Speech recognition error:', e);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
      recognitionRef.current = recognition;
      setIsListening(true);
      setAgentFeedback({
        type: 'info',
        message: '🎙️ AI Secretary listening... Speak your meeting points clearly.'
      });
      setTimeout(() => setAgentFeedback(null), 3500);
    } catch (err) {
      console.error('Speech recognition start failed:', err);
      setIsListening(false);
    }
  };

  // Sync venue default when scope changes if user hasn't heavily customized it
  const handleScopeChange = (newScope) => {
    setScope(newScope);
    if (newScope === 'A_BUILDING') {
      if (!venue || venue.includes('Clubhouse') || venue.includes('Common')) {
        setVenue("Society Office / Wing 'A' Lobby");
      }
      if (rawNotes === SAMPLE_COMMON_NOTES || !rawNotes.trim()) {
        setRawNotes(SAMPLE_A_BUILDING_NOTES);
      }
    } else {
      if (!venue || venue.includes("Wing 'A'")) {
        setVenue("Society Clubhouse / Common Premises");
      }
      if (rawNotes === SAMPLE_A_BUILDING_NOTES || !rawNotes.trim()) {
        setRawNotes(SAMPLE_COMMON_NOTES);
      }
    }
  };

  // Load saved MOMs from localStorage & Firestore
  useEffect(() => {
    try {
      const local = localStorage.getItem('euriska_ai_moms');
      if (local) {
        const parsed = JSON.parse(local);
        const cleaned = Array.isArray(parsed) ? parsed.map(m => {
          if (m?.headerInfo?.chairperson && /rohan/i.test(m.headerInfo.chairperson)) {
            return { ...m, headerInfo: { ...m.headerInfo, chairperson: '' } };
          }
          return m;
        }) : [];
        setSavedMoms(cleaned);
      }
    } catch (e) {
      console.warn('Failed to load local MOM history:', e);
    }

    if (isFirebaseConfigured && db) {
      const fetchRemote = async () => {
        try {
          const q = query(collection(db, 'aiMeetingMinutes'), orderBy('generatedAt', 'desc'), limit(15));
          const snapshot = await getDocs(q);
          if (!snapshot.empty) {
            const list = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
            setSavedMoms(prev => {
              const ids = new Set(prev.map(p => p.id));
              const merged = [...prev];
              list.forEach(item => {
                if (!ids.has(item.id)) merged.push(item);
              });
              return merged.sort((a, b) => new Date(b.generatedAt) - new Date(a.generatedAt));
            });
          }
        } catch (err) {
          console.warn('Firestore MOM history fetch error:', err);
        }
      };
      fetchRemote();
    }
  }, []);

  // Sync editable copy when new MOM is generated
  useEffect(() => {
    if (generatedMom) {
      setEditableMom(JSON.parse(JSON.stringify(generatedMom)));
    }
  }, [generatedMom]);

  // Main AI Generation Handler
  const handleGenerate = async () => {
    if (!rawNotes.trim()) {
      alert('Please enter or paste your meeting notes in the text area.');
      return;
    }

    setIsGenerating(true);
    const startTime = Date.now();

    // Scroll into view of the skeleton loader
    setTimeout(() => {
      const skeletonEl = document.getElementById('ai-mom-generation-skeleton');
      if (skeletonEl && typeof skeletonEl.scrollIntoView === 'function') {
        skeletonEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }, 60);

    try {
      // Format selected committee members into official flat (name) labels
      const formattedAttendees = selectedAttendees.map(val => {
        const match = COMMITTEE_MEMBERS.find(m => m.id === val || m.label === val);
        return match ? match.formatted : val;
      });

      const result = await generateMeetingMOM({
        rawNotes,
        scope,
        meetingDate,
        meetingTime,
        meetingType,
        venue,
        chairperson,
        attendees: formattedAttendees
      });

      // Ensure skeleton is visible for at least 1200ms so user can view the AI drafting skeleton
      const elapsed = Date.now() - startTime;
      const isTestEnv = typeof import.meta !== 'undefined' && import.meta.env?.MODE === 'test';
      if (elapsed < 1200 && !isTestEnv) {
        await new Promise(res => setTimeout(res, 1200 - elapsed));
      }

      setGeneratedMom(result);
      setActiveView('preview');

      // Auto-save to local history
      setSavedMoms(prev => {
        const updated = [result, ...prev.filter(m => m.id !== result.id)].slice(0, 30);
        try {
          localStorage.setItem('euriska_ai_moms', JSON.stringify(updated));
        } catch {}
        return updated;
      });
    } catch (error) {
      console.error('MOM Generation Error:', error);
      alert('An error occurred during generation. The built-in parser was triggered.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Direct High-Quality Print
  const handlePrint = () => {
    window.print();
  };

  // Copy Markdown format to clipboard
  const handleCopy = () => {
    const docToExport = editableMom || generatedMom;
    if (!docToExport) return;

    const md = `
# ${docToExport.headerInfo.societyName}
${docToExport.headerInfo.fullLegalHeader}
**${docToExport.headerInfo.scopeBadge}**

## MINUTES OF MEETING (MOM): ${docToExport.headerInfo.meetingTitle}
- **Date & Time:** ${docToExport.headerInfo.meetingDate} at ${docToExport.headerInfo.meetingTime}
- **Venue:** ${docToExport.headerInfo.venue}
- **Presided By:** ${docToExport.headerInfo.chairperson}
- **Attendees:** ${docToExport.headerInfo.attendees.join(', ')}

---

### Executive Summary
${docToExport.executiveSummary}

### Agenda Discussions & Deliberations
${docToExport.agendaItems.map(item => `
#### ${item.itemNo}. ${item.title} (${item.category})
- **Discussion:** ${item.discussion}
- **Decision Taken:** ${item.decision}
`).join('\n')}

### Formal Resolutions Passed
${docToExport.resolutions.map(r => `
- **${r.resNo} - ${r.subject}** (${r.verdict})
  *Proposed by:* ${r.proposer} | *Seconded by:* ${r.seconder}
  > ${r.text}
`).join('\n')}

### Action Items & Responsible Owners
| Task | Assigned To | Due Date | Priority | Status |
| :--- | :--- | :--- | :--- | :--- |
${docToExport.actionItems.map(a => `| ${a.task} | ${a.assignedTo} | ${a.dueDate} | ${a.priority} | ${a.status} |`).join('\n')}

### Financial Notes
${docToExport.financialNotes}

### Next Scheduled Meeting
${docToExport.nextMeeting}

---
*Signed by:*
- Chairman: ${docToExport.headerInfo.chairperson}
- Secretary
- Treasurer
`;

    navigator.clipboard.writeText(md.trim()).then(() => {
      setCopyFeedback(true);
      setTimeout(() => setCopyFeedback(false), 2500);
    }).catch(err => {
      console.error('Copy failed:', err);
    });
  };

  // Download formatted text document
  const handleDownload = () => {
    const docToExport = editableMom || generatedMom;
    if (!docToExport) return;

    const content = `================================================================================
${docToExport.headerInfo.societyName.toUpperCase()}
${docToExport.headerInfo.fullLegalHeader}
${docToExport.headerInfo.scopeBadge}
================================================================================

MINUTES OF MEETING (MOM): ${docToExport.headerInfo.meetingTitle}
Date & Time : ${docToExport.headerInfo.meetingDate} at ${docToExport.headerInfo.meetingTime}
Venue       : ${docToExport.headerInfo.venue}
Chairperson : ${docToExport.headerInfo.chairperson}
Attendees   : ${docToExport.headerInfo.attendees.join(', ')}

--------------------------------------------------------------------------------
1. EXECUTIVE SUMMARY
--------------------------------------------------------------------------------
${docToExport.executiveSummary}

--------------------------------------------------------------------------------
2. AGENDA DISCUSSIONS & DECISIONS
--------------------------------------------------------------------------------
${docToExport.agendaItems.map(item => `
[Item ${item.itemNo}] ${item.title} (${item.category})
Discussion : ${item.discussion}
Decision   : ${item.decision}
`).join('\n')}

--------------------------------------------------------------------------------
3. FORMAL RESOLUTIONS PASSED
--------------------------------------------------------------------------------
${docToExport.resolutions.map(r => `
Resolution No : ${r.resNo}
Subject       : ${r.subject}
Proposer      : ${r.proposer}
Seconder      : ${r.seconder}
Verdict       : ${r.verdict}
Text          : ${r.text}
`).join('\n')}

--------------------------------------------------------------------------------
4. ACTION ITEMS & WORK REGISTER
--------------------------------------------------------------------------------
${docToExport.actionItems.map(a => `
- [${a.priority}] ${a.task}
  Owner    : ${a.assignedTo}
  Due Date : ${a.dueDate}
  Category : ${a.category}
  Status   : ${a.status}
`).join('\n')}

--------------------------------------------------------------------------------
5. FINANCIAL ALLOCATIONS & BUDGET NOTES
--------------------------------------------------------------------------------
${docToExport.financialNotes}

--------------------------------------------------------------------------------
6. NEXT MEETING SCHEDULE
--------------------------------------------------------------------------------
${docToExport.nextMeeting}

================================================================================
SIGNATURES & VERIFICATION:
Chairman: ___________________   Secretary: ___________________   Treasurer: ___________________
`;

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `MOM_${docToExport.scope}_${docToExport.headerInfo.meetingDate}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Save to persistent records & local history
  const handleSaveToRecords = async () => {
    const docToSave = editableMom || generatedMom;
    if (!docToSave) return;

    const recordToSave = {
      ...docToSave,
      id: docToSave.id || `mom-rec-${Date.now()}`,
      savedAt: new Date().toISOString(),
      rawNotes
    };

    // 1. Immediately update state and localStorage
    setSavedMoms(prev => {
      const updated = [recordToSave, ...prev.filter(m => m.id !== recordToSave.id)];
      try {
        localStorage.setItem('euriska_ai_moms', JSON.stringify(updated));
      } catch {}
      return updated;
    });

    setSaveFeedback(true);
    setTimeout(() => setSaveFeedback(false), 2500);

    setAgentFeedback({
      type: 'success',
      message: `Minutes of Meeting saved successfully to society history records!`
    });
    setTimeout(() => setAgentFeedback(null), 3500);

    try {
      if (isFirebaseConfigured && db) {
        await addDoc(collection(db, 'aiMeetingMinutes'), recordToSave);
      }
    } catch (err) {
      console.warn('Error saving to Firestore (local copy preserved):', err);
    }
  };

  // Save current MOM as a reusable template in History
  const handleSaveAsTemplate = () => {
    const docToSave = editableMom || generatedMom;
    if (!docToSave) return;

    const defaultTitle = docToSave.title ? `${docToSave.title} (Template)` : `Custom Wing '${scope === 'A_BUILDING' ? 'A' : 'Common'}' Template`;
    const templateTitle = window.prompt('Enter a name for this custom template:', defaultTitle);

    if (templateTitle === null) return; // user cancelled

    const newTemplate = {
      ...docToSave,
      id: `custom-tmpl-${Date.now()}`,
      isCustomTemplate: true,
      title: templateTitle.trim() || defaultTitle,
      savedAt: new Date().toISOString(),
      headerInfo: {
        ...docToSave.headerInfo,
        meetingType: meetingType,
        meetingDate: meetingDate,
        meetingTime: meetingTime,
        venue: venue,
        chairperson: chairperson
      },
      rawNotes
    };

    setSavedMoms(prev => {
      const updated = [newTemplate, ...prev.filter(m => m.id !== newTemplate.id)];
      try {
        localStorage.setItem('euriska_ai_moms', JSON.stringify(updated));
      } catch {}
      return updated;
    });

    setAgentFeedback({
      type: 'success',
      message: `Template "${newTemplate.title}" saved successfully into Meeting History & Templates!`
    });
    setTimeout(() => setAgentFeedback(null), 4000);
  };

  // Restore past MOM or Official Template
  const handleRestoreFromHistory = (item) => {
    const docToRestore = item.sampleMOM ? {
      ...item.sampleMOM,
      headerInfo: item.headerInfo,
      rawNotes: item.rawNotes,
      scope: item.scope
    } : item;

    setGeneratedMom(docToRestore);
    setEditableMom(JSON.parse(JSON.stringify(docToRestore)));
    setScope(item.scope);
    setMeetingType(item.headerInfo?.meetingType || 'Managing Committee Meeting');
    setMeetingDate(item.headerInfo?.meetingDate || new Date().toISOString().split('T')[0]);
    setMeetingTime(item.headerInfo?.meetingTime || '11:00 AM');
    setVenue(item.headerInfo?.venue || '');
    setChairperson(item.headerInfo?.chairperson && !/rohan/i.test(item.headerInfo.chairperson) ? item.headerInfo.chairperson : '');
    if (item.headerInfo?.attendees && Array.isArray(item.headerInfo.attendees)) {
      const restored = item.headerInfo.attendees
        .filter(att => !/rohan/i.test(att))
        .map(att => {
          const found = COMMITTEE_MEMBERS.find(m => m.id === att || m.formatted === att || m.label === att);
          return found ? found.id : att;
        });
      setSelectedAttendees(restored);
    }
    if (item.rawNotes) setRawNotes(item.rawNotes);
    setActiveView('preview');
  };

  // Load an official template into the generator form
  const handleLoadTemplateIntoForm = (template) => {
    setScope(template.scope);
    setMeetingType(template.headerInfo?.meetingType || 'Managing Committee Meeting');
    setMeetingDate(template.headerInfo?.meetingDate || new Date().toISOString().split('T')[0]);
    setMeetingTime(template.headerInfo?.meetingTime || '11:00 AM');
    setVenue(template.headerInfo?.venue || '');
    setChairperson(template.headerInfo?.chairperson && !/rohan/i.test(template.headerInfo.chairperson) ? template.headerInfo.chairperson : '');
    if (template.headerInfo?.attendees && Array.isArray(template.headerInfo.attendees)) {
      const restored = template.headerInfo.attendees
        .filter(att => !/rohan/i.test(att))
        .map(att => {
          const found = COMMITTEE_MEMBERS.find(m => m.id === att || m.formatted === att || m.label === att);
          return found ? found.id : att;
        });
      setSelectedAttendees(restored);
    }
    if (template.rawNotes) setRawNotes(template.rawNotes);
    setAgentFeedback({
      type: 'success',
      message: `Template "${template.title}" loaded into form. Ready to customize or generate!`
    });
    setTimeout(() => setAgentFeedback(null), 4000);
    const el = document.getElementById('mom-notes-textarea');
    if (el && typeof el.scrollIntoView === 'function') {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  // Delete an item from history
  const handleDeleteHistory = (id, e) => {
    e.stopPropagation();
    setSavedMoms(prev => {
      const updated = prev.filter(m => m.id !== id);
      try {
        localStorage.setItem('euriska_ai_moms', JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  // Load notes & metadata from an archived Monthly MOM upload into the generator
  const handleLoadVaultMomIntoGenerator = (vaultMom) => {
    setScope(vaultMom.scope || 'A_BUILDING');
    setMeetingDate(vaultMom.meetingDate || new Date().toISOString().split('T')[0]);
    if (vaultMom.meetingTime) setMeetingTime(vaultMom.meetingTime);
    if (vaultMom.venue) setVenue(vaultMom.venue);
    setChairperson(''); // clean empty field
    if (vaultMom.notes) setRawNotes(vaultMom.notes);
    setActiveView('preview');
    setAgentFeedback({
      type: 'success',
      message: `📁 Loaded notes from "${vaultMom.title}" into the AI MOM Generator!`
    });
    setTimeout(() => setAgentFeedback(null), 4000);
    const el = document.getElementById('mom-notes-textarea');
    if (el && typeof el.scrollIntoView === 'function') {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  // Word & character stats
  const stats = useMemo(() => {
    const text = rawNotes.trim();
    return {
      words: text ? text.split(/\s+/).length : 0,
      chars: text.length,
      lines: text ? text.split(/\r?\n/).length : 0
    };
  }, [rawNotes]);

  const activeDoc = editableMom || generatedMom;

  return (
    <div className="section-card ai-mom-container" style={{ padding: '24px', borderRadius: '18px', background: '#ffffff', minHeight: '85vh' }}>
      
      {/* ── AI Secretary Agent Feedback Banner ── */}
      {agentFeedback && (
        <div
          data-testid="agent-feedback-toast"
          style={{
            marginBottom: '16px',
            padding: '10px 16px',
            borderRadius: '10px',
            fontSize: '0.84rem',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: agentFeedback.type === 'success' ? '#ecfdf5' : agentFeedback.type === 'warning' ? '#fffbeb' : '#eff6ff',
            color: agentFeedback.type === 'success' ? '#065f46' : agentFeedback.type === 'warning' ? '#92400e' : '#1e40af',
            border: `1px solid ${agentFeedback.type === 'success' ? '#a7f3d0' : agentFeedback.type === 'warning' ? '#fde68a' : '#bfdbfe'}`,
            boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Bot size={18} />
            <span>{agentFeedback.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setAgentFeedback(null)}
            style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'inherit', padding: 0, fontWeight: 800 }}
          >
            ✕
          </button>
        </div>
      )}

      {/* ── Top Header & Context ── */}
      <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '20px' }}>
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(16, 185, 129, 0.1)', color: '#047857', padding: '4px 12px', borderRadius: '20px', fontSize: '0.78rem', fontWeight: 800, textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.5px' }}>
            <Sparkles size={14} color="#10b981" />
            AI Governance Suite
          </div>
          <h2 style={{ margin: 0, fontSize: '1.6rem', fontWeight: 800, color: '#0b2b26', letterSpacing: '-0.02em' }}>
            AI Minutes of Meeting (MOM) Generator
          </h2>
          <p style={{ margin: '4px 0 0', fontSize: '0.88rem', color: '#4b5563' }}>
            Transform raw meeting discussions, voice notes, or bullet points into formal society minutes tailored for <strong>Building 'A'</strong> or <strong>Common Society Infrastructure</strong>.
          </p>
        </div>

        {/* Action Buttons: Monthly MOM Vault & Meeting History */}
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            type="button"
            data-testid="header-monthly-mom-vault-btn"
            onClick={() => {
              setActiveView('vault');
              setTimeout(() => {
                const el = document.getElementById('monthly-mom-vault-section');
                if (el && typeof el.scrollIntoView === 'function') {
                  el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
              }, 60);
            }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '0.84rem',
              fontWeight: 800,
              padding: '8px 16px',
              borderRadius: '10px',
              background: activeView === 'vault' ? '#1d4ed8' : '#eff6ff',
              color: activeView === 'vault' ? '#ffffff' : '#1d4ed8',
              border: activeView === 'vault' ? '1.5px solid #1d4ed8' : '1.5px solid #bfdbfe',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: '0 2px 4px rgba(37, 99, 235, 0.08)'
            }}
          >
            <FolderArchive size={16} />
            📁 Monthly MOM Vault & Upload (PDF / Image)
          </button>

          <button
            type="button"
            data-testid="header-meeting-history-btn"
            onClick={() => {
              setActiveView('history');
              setTimeout(() => {
                const el = document.getElementById('meeting-history-templates-view');
                if (el && typeof el.scrollIntoView === 'function') {
                  el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
              }, 60);
            }}
            className="button-secondary"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '0.84rem',
              fontWeight: 700,
              padding: '8px 16px',
              borderRadius: '10px',
              background: activeView === 'history' ? '#0f172a' : '#f8fafc',
              color: activeView === 'history' ? '#ffffff' : '#1e293b',
              border: activeView === 'history' ? '1.5px solid #0f172a' : '1.5px solid #cbd5e1',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: '0 2px 4px rgba(0,0,0,0.04)'
            }}
          >
            <History size={15} />
            Meeting History & Templates ({savedMoms.length + OFFICIAL_MOM_TEMPLATES.length})
          </button>
        </div>
      </div>

      {/* ── Big Scope Switcher: Building 'A' vs Common ── */}
      <div className="no-print" style={{ marginBottom: '24px' }}>
        <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 800, color: '#1f2937', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          Select Target Meeting Scope:
        </label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
          
          {/* Wing A Option */}
          <div
            onClick={() => handleScopeChange('A_BUILDING')}
            style={{
              padding: '16px 20px',
              borderRadius: '14px',
              border: scope === 'A_BUILDING' ? '2px solid #059669' : '1.5px solid #e5e7eb',
              background: scope === 'A_BUILDING' ? 'rgba(5, 150, 105, 0.05)' : '#ffffff',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: scope === 'A_BUILDING' ? '0 4px 14px rgba(5, 150, 105, 0.12)' : 'none',
              display: 'flex',
              gap: '14px',
              alignItems: 'flex-start'
            }}
          >
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '10px',
              background: scope === 'A_BUILDING' ? '#059669' : '#f3f4f6',
              color: scope === 'A_BUILDING' ? '#ffffff' : '#6b7280',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              <Building2 size={22} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '1.02rem', fontWeight: 800, color: '#0b2b26' }}>🏢 Building 'A' (Wing A)</span>
                {scope === 'A_BUILDING' && (
                  <span style={{ background: '#059669', color: 'white', fontSize: '0.68rem', fontWeight: 800, padding: '2px 8px', borderRadius: '10px' }}>ACTIVE</span>
                )}
              </div>
              <p style={{ margin: '4px 0 0', fontSize: '0.78rem', color: '#4b5563', lineHeight: '1.4' }}>
                Majestique Euriska 'A' Building CHS Ltd. (87 flats, 11 floors). Lifts, Wing A parking allotment, DG battery, terrace, and internal housekeeping.
              </p>
            </div>
          </div>

          {/* Common Infrastructure Option */}
          <div
            onClick={() => handleScopeChange('COMMON')}
            style={{
              padding: '16px 20px',
              borderRadius: '14px',
              border: scope === 'COMMON' ? '2px solid #2563eb' : '1.5px solid #e5e7eb',
              background: scope === 'COMMON' ? 'rgba(37, 99, 235, 0.05)' : '#ffffff',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: scope === 'COMMON' ? '0 4px 14px rgba(37, 99, 235, 0.12)' : 'none',
              display: 'flex',
              gap: '14px',
              alignItems: 'flex-start'
            }}
          >
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '10px',
              background: scope === 'COMMON' ? '#2563eb' : '#f3f4f6',
              color: scope === 'COMMON' ? '#ffffff' : '#6b7280',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              <Globe2 size={22} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '1.02rem', fontWeight: 800, color: '#1e3a8a' }}>🌐 Common Society / All Wings</span>
                {scope === 'COMMON' && (
                  <span style={{ background: '#2563eb', color: 'white', fontSize: '0.68rem', fontWeight: 800, padding: '2px 8px', borderRadius: '10px' }}>ACTIVE</span>
                )}
              </div>
              <p style={{ margin: '4px 0 0', fontSize: '0.78rem', color: '#4b5563', lineHeight: '1.4' }}>
                Shared Apex Infrastructure across Wings A, B, C & 14 Commercial Shops (231 units). Main Security Gate, STP, 5.39L Water Reservoir, and Eisha Builder handover.
              </p>
            </div>
          </div>

        </div>
      </div>

      {/* ── Main Input Card: Metadata & Raw Textarea ── */}
      <div className="no-print" style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '20px', marginBottom: '24px' }}>
        
        {/* Metadata Controls Row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', marginBottom: '18px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>
              Meeting Type
            </label>
            <select
              value={meetingType}
              onChange={e => setMeetingType(e.target.value)}
              className="attendance-register-input"
              style={{ width: '100%', padding: '8px 10px', fontWeight: 700 }}
            >
              <option value="Managing Committee Meeting">Managing Committee Meeting</option>
              <option value="Annual General Body Meeting (AGM)">Annual General Body Meeting (AGM)</option>
              <option value="Special General Body Meeting (SGM)">Special General Body Meeting (SGM)</option>
              <option value="Joint Cross-Wing Apex Committee">Joint Cross-Wing Apex Committee</option>
              <option value="Eisha Builder Handover & Follow-up">Eisha Builder Handover & Follow-up</option>
              <option value="Emergency Operational Meeting">Emergency Operational Meeting</option>
              <option value="Vendor Performance Review">Vendor Performance Review</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>
              Meeting Date
            </label>
            <input
              type="date"
              value={meetingDate}
              onChange={e => setMeetingDate(e.target.value)}
              className="attendance-register-input"
              style={{ width: '100%', padding: '8px 10px' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>
              Meeting Time
            </label>
            <input
              type="text"
              value={meetingTime}
              onChange={e => setMeetingTime(e.target.value)}
              placeholder="e.g. 11:00 AM"
              className="attendance-register-input"
              style={{ width: '100%', padding: '8px 10px' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>
              Venue / Location
            </label>
            <input
              type="text"
              value={venue}
              onChange={e => setVenue(e.target.value)}
              placeholder="e.g. Society Office / Wing A"
              className="attendance-register-input"
              style={{ width: '100%', padding: '8px 10px' }}
            />
          </div>
        </div>

        {/* AI Secretary Autonomous Quorum & Scanner Bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
          <div
            data-testid="quorum-status-pill"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 12px',
              borderRadius: '20px',
              background: quorumInfo.isQuorumMet ? 'rgba(5, 150, 105, 0.1)' : 'rgba(217, 119, 6, 0.1)',
              color: quorumInfo.badgeColor,
              fontSize: '0.74rem',
              fontWeight: 800,
              border: `1px solid ${quorumInfo.isQuorumMet ? '#a7f3d0' : '#fde68a'}`
            }}
          >
            <Bot size={13} />
            {quorumInfo.statusText}
          </div>

          <button
            type="button"
            data-testid="agent-autodetect-attendees-btn"
            onClick={handleAgentScanAttendees}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 12px',
              borderRadius: '8px',
              border: '1px solid #059669',
              background: 'linear-gradient(135deg, rgba(5, 150, 105, 0.08) 0%, rgba(16, 185, 129, 0.15) 100%)',
              color: '#065f46',
              fontSize: '0.75rem',
              fontWeight: 800,
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
            title="Auto-scan raw notes and select present committee members"
          >
            <Zap size={13} color="#059669" />
            Auto-Detect Attendees from Notes
          </button>
        </div>

        {/* Attendees Row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '14px', marginBottom: '18px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>
              Presided By / Chairperson
            </label>
            <input
              type="text"
              data-testid="mom-chairperson-input"
              value={chairperson}
              onChange={e => setChairperson(e.target.value)}
              placeholder="e.g. Society Chairman (optional)"
              className="attendance-register-input"
              style={{ width: '100%', padding: '8px 10px' }}
            />
          </div>

          <div>
            <MultiSelectDropdown
              options={COMMITTEE_MEMBERS}
              selectedValues={selectedAttendees}
              onChange={setSelectedAttendees}
              activeScope={scope}
              label="Key Attendees & Committee Members Present"
              placeholder="Select Committee Members (Flat No - Name)..."
            />
          </div>
        </div>

        {/* Text Area Header & Action Buttons */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
          <label style={{ fontSize: '0.82rem', fontWeight: 800, color: '#1e293b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Enter Raw Notes / Discussions / Bullet Points:
          </label>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button
              type="button"
              data-testid="quick-wing-a-template-btn"
              onClick={() => {
                const tmpl = OFFICIAL_MOM_TEMPLATES.find(t => t.id === 'tmpl-wing-a-monthly');
                if (tmpl) handleLoadTemplateIntoForm(tmpl);
              }}
              style={{
                fontSize: '0.75rem',
                fontWeight: 700,
                padding: '4px 10px',
                borderRadius: '6px',
                border: '1px solid #a7f3d0',
                background: '#ecfdf5',
                color: '#047857',
                cursor: 'pointer'
              }}
              title="Load official pre-configured Wing 'A' template into form"
            >
              🏢 Wing 'A' Template
            </button>
            <button
              type="button"
              data-testid="quick-common-template-btn"
              onClick={() => {
                const tmpl = OFFICIAL_MOM_TEMPLATES.find(t => t.id === 'tmpl-common-infra-monthly');
                if (tmpl) handleLoadTemplateIntoForm(tmpl);
              }}
              style={{
                fontSize: '0.75rem',
                fontWeight: 700,
                padding: '4px 10px',
                borderRadius: '6px',
                border: '1px solid #bfdbfe',
                background: '#eff6ff',
                color: '#1d4ed8',
                cursor: 'pointer'
              }}
              title="Load official common campus template into form"
            >
              🌐 Common Template
            </button>
            <button
              type="button"
              onClick={() => {
                setScope('A_BUILDING');
                setRawNotes(SAMPLE_A_BUILDING_NOTES);
              }}
              style={{
                fontSize: '0.75rem',
                fontWeight: 700,
                padding: '4px 10px',
                borderRadius: '6px',
                border: '1px solid #d1d5db',
                background: '#ffffff',
                color: '#059669',
                cursor: 'pointer'
              }}
            >
              📝 Load Building 'A' Notes
            </button>
            <button
              type="button"
              onClick={() => {
                setScope('COMMON');
                setRawNotes(SAMPLE_COMMON_NOTES);
              }}
              style={{
                fontSize: '0.75rem',
                fontWeight: 700,
                padding: '4px 10px',
                borderRadius: '6px',
                border: '1px solid #d1d5db',
                background: '#ffffff',
                color: '#2563eb',
                cursor: 'pointer'
              }}
            >
              🌐 Load Common Notes
            </button>
            <button
              type="button"
              onClick={() => setRawNotes('')}
              style={{
                fontSize: '0.75rem',
                fontWeight: 700,
                padding: '4px 10px',
                borderRadius: '6px',
                border: '1px solid #fee2e2',
                background: '#fef2f2',
                color: '#dc2626',
                cursor: 'pointer'
              }}
            >
              🧹 Clear
            </button>
            <button
              type="button"
              data-testid="agent-voice-dictate-btn"
              onClick={toggleVoiceDictation}
              style={{
                fontSize: '0.75rem',
                fontWeight: 800,
                padding: '4px 10px',
                borderRadius: '6px',
                border: isListening ? '1.5px solid #ef4444' : '1px solid #cbd5e1',
                background: isListening ? '#fef2f2' : '#ffffff',
                color: isListening ? '#dc2626' : '#334155',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px'
              }}
              title="Dictate meeting points with speech-to-text"
            >
              {isListening ? <MicOff size={13} color="#dc2626" /> : <Mic size={13} color="#059669" />}
              {isListening ? '🔴 Recording...' : '🎙️ Voice Dictation'}
            </button>
            <button
              type="button"
              data-testid="quick-upload-monthly-mom-btn"
              onClick={() => {
                setActiveView('vault');
                setTimeout(() => {
                  const el = document.getElementById('monthly-mom-vault-section');
                  if (el && typeof el.scrollIntoView === 'function') {
                    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }
                }, 60);
              }}
              style={{
                fontSize: '0.75rem',
                fontWeight: 800,
                padding: '4px 10px',
                borderRadius: '6px',
                border: '1px solid #3b82f6',
                background: '#eff6ff',
                color: '#1d4ed8',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px'
              }}
              title="Upload and store scanned monthly MOM (PDF or Image)"
            >
              <UploadCloud size={13} color="#2563eb" />
              📤 Upload Monthly MOM (Image / PDF)
            </button>
          </div>
        </div>

        {/* Big Textarea */}
        <textarea
          id="mom-notes-textarea"
          value={rawNotes}
          onChange={e => setRawNotes(e.target.value)}
          placeholder="Paste or type meeting discussion points, lift complaints, vendor updates, dues status, decisions taken, or spoken transcript..."
          rows={7}
          style={{
            width: '100%',
            padding: '14px',
            borderRadius: '10px',
            border: '1px solid #cbd5e1',
            fontSize: '0.92rem',
            lineHeight: '1.5',
            fontFamily: 'inherit',
            background: '#ffffff',
            color: '#0f172a',
            resize: 'vertical',
            outline: 'none',
            boxSizing: 'border-box'
          }}
        />

        {/* Textarea Footer: Stats & Generate Button */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ fontSize: '0.76rem', color: '#64748b' }}>
            <span>{stats.words} words</span> • <span>{stats.chars} characters</span> • <span>{stats.lines} lines</span>
          </div>

          <button
            type="button"
            data-testid="generate-mom-btn"
            onClick={handleGenerate}
            disabled={isGenerating || !rawNotes.trim()}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '12px 24px',
              borderRadius: '10px',
              background: scope === 'A_BUILDING' ? 'linear-gradient(135deg, #059669 0%, #047857 100%)' : 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
              color: '#ffffff',
              fontSize: '0.95rem',
              fontWeight: 800,
              border: 'none',
              cursor: isGenerating || !rawNotes.trim() ? 'not-allowed' : 'pointer',
              opacity: isGenerating || !rawNotes.trim() ? 0.6 : 1,
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.12)',
              transition: 'transform 0.15s ease'
            }}
          >
            <Sparkles size={18} />
            {isGenerating ? 'AI Analyzing & Drafting MOM...' : `Generate AI MOM for ${scope === 'A_BUILDING' ? "Building 'A'" : 'Common Infrastructure'}`}
          </button>
        </div>
      </div>

      {/* ── SKELETON LOADER STATE (Animated skeleton letterhead while generating) ── */}
      {isGenerating && (
        <AiMomSkeletonLoader scope={scope} />
      )}

      {/* ── Generated MOM Workspace or History / Vault View ── */}
      {!isGenerating && (generatedMom || activeView === 'history' || activeView === 'vault') && (
        <div className="mom-output-workspace" style={{ marginTop: '30px' }}>
          
          {/* Navigation & Action Toolbar */}
          <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '18px', paddingBottom: '14px', borderBottom: '1px solid #e2e8f0' }}>
            
            {/* View Mode Tabs */}
            <div style={{ display: 'flex', gap: '6px', background: '#f1f5f9', padding: '4px', borderRadius: '10px', flexWrap: 'wrap' }}>
              {generatedMom && (
                <>
                  <button
                    type="button"
                    onClick={() => setActiveView('preview')}
                    style={{
                      padding: '7px 14px',
                      borderRadius: '8px',
                      border: 'none',
                      background: activeView === 'preview' ? '#ffffff' : 'transparent',
                      color: activeView === 'preview' ? '#0f172a' : '#64748b',
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      boxShadow: activeView === 'preview' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none'
                    }}
                  >
                    📄 Official Letterhead
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveView('edit')}
                    style={{
                      padding: '7px 14px',
                      borderRadius: '8px',
                      border: 'none',
                      background: activeView === 'edit' ? '#ffffff' : 'transparent',
                      color: activeView === 'edit' ? '#0f172a' : '#64748b',
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      boxShadow: activeView === 'edit' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none'
                    }}
                  >
                    ✏️ Edit & Customize
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveView('actions')}
                    style={{
                      padding: '7px 14px',
                      borderRadius: '8px',
                      border: 'none',
                      background: activeView === 'actions' ? '#ffffff' : 'transparent',
                      color: activeView === 'actions' ? '#0f172a' : '#64748b',
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      boxShadow: activeView === 'actions' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none'
                    }}
                  >
                    📋 Action Register ({activeDoc.actionItems?.length || 0})
                  </button>
                  <button
                    type="button"
                    data-testid="view-poster-tab-btn"
                    onClick={() => setActiveView('poster')}
                    style={{
                      padding: '7px 14px',
                      borderRadius: '8px',
                      border: 'none',
                      background: activeView === 'poster' ? '#ffffff' : 'transparent',
                      color: activeView === 'poster' ? '#d90429' : '#64748b',
                      fontSize: '0.82rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      boxShadow: activeView === 'poster' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <Sparkles size={14} color="#d90429" />
                    🎨 Graphic Flyer
                  </button>
                </>
              )}
              <button
                type="button"
                data-testid="tab-monthly-mom-vault-btn"
                onClick={() => setActiveView('vault')}
                style={{
                  padding: '7px 14px',
                  borderRadius: '8px',
                  border: 'none',
                  background: activeView === 'vault' ? '#ffffff' : 'transparent',
                  color: activeView === 'vault' ? '#1d4ed8' : '#64748b',
                  fontSize: '0.82rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  boxShadow: activeView === 'vault' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <FolderArchive size={14} color="#2563eb" />
                📁 Monthly MOM Vault
              </button>
              <button
                type="button"
                data-testid="tab-history-templates-btn"
                onClick={() => setActiveView('history')}
                style={{
                  padding: '7px 14px',
                  borderRadius: '8px',
                  border: 'none',
                  background: activeView === 'history' ? '#ffffff' : 'transparent',
                  color: activeView === 'history' ? '#0f172a' : '#64748b',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: activeView === 'history' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none'
                }}
              >
                🕒 History & Templates ({savedMoms.length + OFFICIAL_MOM_TEMPLATES.length})
              </button>
            </div>

            {/* Export & Action Buttons */}
            {generatedMom ? (
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={handlePrint}
                  className="button-primary"
                  title="Print clean multi-page document"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 14px', fontSize: '0.82rem' }}
                >
                  <Printer size={15} />
                  🖨️ Print / PDF
                </button>

                <button
                  type="button"
                  onClick={handleCopy}
                  className="button-secondary"
                  title="Copy markdown formatted MOM to clipboard"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 14px', fontSize: '0.82rem' }}
                >
                  {copyFeedback ? <Check size={15} color="#10b981" /> : <Copy size={15} />}
                  {copyFeedback ? 'Copied!' : 'Copy'}
                </button>

                <button
                  type="button"
                  onClick={handleDownload}
                  className="button-secondary"
                  title="Download formatted text file"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 14px', fontSize: '0.82rem' }}
                >
                  <Download size={15} />
                  Export Text
                </button>

                <button
                  type="button"
                  onClick={handleSaveToRecords}
                  className="button-secondary"
                  title="Save into persistent society records"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 14px', fontSize: '0.82rem' }}
                >
                  {saveFeedback ? <Check size={15} color="#10b981" /> : <Save size={15} />}
                  {saveFeedback ? 'Saved!' : 'Save'}
                </button>

                <button
                  type="button"
                  data-testid="save-as-template-btn"
                  onClick={handleSaveAsTemplate}
                  className="button-secondary"
                  title="Save this MOM structure as a reusable template in Meeting History"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 14px', fontSize: '0.82rem' }}
                >
                  <BookmarkPlus size={15} color="#2563eb" />
                  Save as Template
                </button>

                <button
                  type="button"
                  data-testid="agent-whatsapp-broadcast-btn"
                  onClick={handleCopyWhatsAppNotice}
                  className="button-secondary"
                  title="Copy ready-to-share WhatsApp circular with resolutions"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 14px',
                    fontSize: '0.82rem',
                    background: '#ecfdf5',
                    color: '#047857',
                    border: '1px solid #a7f3d0'
                  }}
                >
                  <Share2 size={15} />
                  WhatsApp Broadcast
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <button
                  type="button"
                  onClick={() => {
                    const el = document.getElementById('mom-notes-textarea');
                    if (el && typeof el.scrollIntoView === 'function') {
                      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
                  }}
                  className="button-secondary"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 14px', fontSize: '0.82rem' }}
                >
                  <ArrowLeft size={14} />
                  Back to Notes & Generator
                </button>
              </div>
            )}
          </div>

          {/* AI Model Badge (Only when MOM generated) */}
          {generatedMom && activeDoc.aiModelUsed && (
            <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', background: '#f8fafc', padding: '8px 14px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.78rem', color: '#64748b' }}>
              <div>
                Generated with: <strong style={{ color: '#0f172a' }}>{activeDoc.aiModelUsed}</strong>
              </div>
              <div>
                Timestamp: {new Date(activeDoc.generatedAt).toLocaleString('en-IN')}
              </div>
            </div>
          )}

          {/* ── VIEW 1: OFFICIAL LETTERHEAD PREVIEW (PRINTABLE AREA) ── */}
          {activeView === 'preview' && (
            <div
              id="ai-mom-printable-area"
              className="report-printable-area"
              style={{
                background: '#ffffff',
                border: '1px solid rgba(0,0,0,0.12)',
                borderRadius: '12px',
                padding: '40px',
                boxShadow: '0 8px 30px rgba(0,0,0,0.04)',
                color: '#1e293b',
                fontFamily: 'serif'
              }}
            >
              {/* Official Society Letterhead */}
              <div style={{ textAlign: 'center', borderBottom: '2.5px solid #0b2b26', paddingBottom: '20px', marginBottom: '24px' }}>
                <h1 style={{ margin: '0 0 4px', fontSize: '1.5rem', fontWeight: 900, color: '#0b2b26', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  {activeDoc.headerInfo.societyName}
                </h1>
                <p style={{ margin: '3px 0', fontSize: '0.84rem', color: '#334155', fontFamily: 'sans-serif' }}>
                  {activeDoc.headerInfo.fullLegalHeader}
                </p>
                <div style={{ marginTop: '12px', display: 'inline-block' }}>
                  <span style={{
                    display: 'inline-block',
                    background: activeDoc.scope === 'A_BUILDING' ? '#0b2b26' : '#1e3a8a',
                    color: '#C49B4F',
                    padding: '6px 20px',
                    borderRadius: '24px',
                    fontSize: '0.86rem',
                    fontWeight: 800,
                    letterSpacing: '0.5px',
                    fontFamily: 'sans-serif'
                  }}>
                    {activeDoc.headerInfo.scopeBadge}
                  </span>
                </div>
              </div>

              {/* Title & Metadata Strip */}
              <div style={{ background: '#f8fafc', padding: '16px 20px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '24px', fontFamily: 'sans-serif' }}>
                <div style={{ textAlign: 'center', marginBottom: '12px' }}>
                  <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#0b2b26', textTransform: 'uppercase' }}>
                    MINUTES OF MEETING ({activeDoc.headerInfo.meetingType.toUpperCase()})
                  </h2>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px', fontSize: '0.84rem' }}>
                  <div><strong>Date:</strong> {activeDoc.headerInfo.meetingDate}</div>
                  <div><strong>Time:</strong> {activeDoc.headerInfo.meetingTime}</div>
                  <div><strong>Venue:</strong> {activeDoc.headerInfo.venue}</div>
                  <div><strong>Presided By:</strong> {activeDoc.headerInfo.chairperson}</div>
                </div>
                <div style={{ marginTop: '10px', fontSize: '0.82rem', borderTop: '1px solid #e2e8f0', paddingTop: '8px' }}>
                  <strong>Attendees:</strong> {activeDoc.headerInfo.attendees.join(', ')}
                </div>
              </div>

              {/* Section 1: Executive Summary */}
              <div style={{ marginBottom: '28px' }}>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0b2b26', borderBottom: '1px solid #cbd5e1', paddingBottom: '6px', marginBottom: '10px', textTransform: 'uppercase', fontFamily: 'sans-serif' }}>
                  1. Executive Summary & Purpose
                </h3>
                <p style={{ margin: 0, fontSize: '0.94rem', lineHeight: '1.7', textAlign: 'justify', color: '#1e293b' }}>
                  {activeDoc.executiveSummary}
                </p>
              </div>

              {/* Section 2: Agenda Items & Decisions */}
              <div style={{ marginBottom: '28px' }}>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0b2b26', borderBottom: '1px solid #cbd5e1', paddingBottom: '6px', marginBottom: '14px', textTransform: 'uppercase', fontFamily: 'sans-serif' }}>
                  2. Agenda Deliberations & Key Decisions
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {activeDoc.agendaItems.map((item, idx) => (
                    <div key={idx} style={{ padding: '12px 16px', background: '#fafaf9', borderLeft: '4px solid #0b2b26', borderRadius: '4px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                        <span style={{ fontSize: '0.98rem', fontWeight: 800, color: '#0b2b26', fontFamily: 'sans-serif' }}>
                          Item {item.itemNo}: {item.title}
                        </span>
                        <span style={{ fontSize: '0.72rem', background: '#e2e8f0', color: '#475569', padding: '2px 8px', borderRadius: '10px', fontWeight: 700, fontFamily: 'sans-serif' }}>
                          {item.category}
                        </span>
                      </div>
                      <p style={{ margin: '0 0 6px', fontSize: '0.9rem', lineHeight: '1.6', textAlign: 'justify' }}>
                        <strong>Discussion:</strong> {item.discussion}
                      </p>
                      <p style={{ margin: 0, fontSize: '0.9rem', lineHeight: '1.6', color: '#047857' }}>
                        <strong>Decision Taken:</strong> {item.decision}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Section 3: Formal Resolutions Passed */}
              <div style={{ marginBottom: '28px' }}>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0b2b26', borderBottom: '1px solid #cbd5e1', paddingBottom: '6px', marginBottom: '14px', textTransform: 'uppercase', fontFamily: 'sans-serif' }}>
                  3. Formal Resolutions Passed
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {activeDoc.resolutions.map((res, idx) => (
                    <div key={idx} style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '14px 18px', background: '#ffffff' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '6px' }}>
                        <span style={{ fontSize: '0.88rem', fontWeight: 800, color: '#0b2b26', fontFamily: 'sans-serif' }}>
                          {res.resNo} : {res.subject}
                        </span>
                        <span style={{ background: '#dcfce7', color: '#15803d', fontSize: '0.72rem', fontWeight: 800, padding: '3px 10px', borderRadius: '12px', fontFamily: 'sans-serif' }}>
                          {res.verdict}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.78rem', color: '#64748b', marginBottom: '8px', fontFamily: 'sans-serif' }}>
                        Proposed by: <strong>{res.proposer}</strong> | Seconded by: <strong>{res.seconder}</strong>
                      </div>
                      <blockquote style={{ margin: 0, paddingLeft: '14px', borderLeft: '3px solid #10b981', fontStyle: 'italic', fontSize: '0.9rem', lineHeight: '1.6', color: '#1e293b' }}>
                        {res.text}
                      </blockquote>
                    </div>
                  ))}
                </div>
              </div>

              {/* Section 4: Action Items Table */}
              <div style={{ marginBottom: '28px' }}>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0b2b26', borderBottom: '1px solid #cbd5e1', paddingBottom: '6px', marginBottom: '14px', textTransform: 'uppercase', fontFamily: 'sans-serif' }}>
                  4. Action Item Accountability Register
                </h3>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.86rem', fontFamily: 'sans-serif' }}>
                    <thead>
                      <tr style={{ background: '#0b2b26', color: '#ffffff', textAlign: 'left' }}>
                        <th style={{ padding: '8px 12px' }}>#</th>
                        <th style={{ padding: '8px 12px' }}>Action Item / Task</th>
                        <th style={{ padding: '8px 12px' }}>Assigned Owner</th>
                        <th style={{ padding: '8px 12px' }}>Target Due Date</th>
                        <th style={{ padding: '8px 12px' }}>Priority</th>
                        <th style={{ padding: '8px 12px' }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activeDoc.actionItems.map((act, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0', background: idx % 2 === 0 ? '#ffffff' : '#f9fafb' }}>
                          <td style={{ padding: '8px 12px', fontWeight: 700 }}>{act.id || idx + 1}</td>
                          <td style={{ padding: '8px 12px' }}>{act.task}</td>
                          <td style={{ padding: '8px 12px', fontWeight: 700, color: '#0b2b26' }}>{act.assignedTo}</td>
                          <td style={{ padding: '8px 12px', whiteSpace: 'nowrap' }}>{act.dueDate}</td>
                          <td style={{ padding: '8px 12px' }}>
                            <span style={{
                              padding: '2px 8px',
                              borderRadius: '10px',
                              fontSize: '0.7rem',
                              fontWeight: 800,
                              background: act.priority === 'HIGH' ? '#fee2e2' : act.priority === 'MEDIUM' ? '#fef3c7' : '#e0f2fe',
                              color: act.priority === 'HIGH' ? '#dc2626' : act.priority === 'MEDIUM' ? '#d97706' : '#0369a1'
                            }}>
                              {act.priority}
                            </span>
                          </td>
                          <td style={{ padding: '8px 12px', fontWeight: 700, color: '#16a34a' }}>{act.status}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Section 5: Financial Notes & Next Meeting */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginBottom: '40px', fontFamily: 'sans-serif' }}>
                <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <h4 style={{ margin: '0 0 6px', fontSize: '0.86rem', color: '#0b2b26', textTransform: 'uppercase', fontWeight: 800 }}>
                    💰 Financial Allocations & Ratios
                  </h4>
                  <p style={{ margin: 0, fontSize: '0.84rem', lineHeight: '1.6', color: '#334155' }}>
                    {activeDoc.financialNotes}
                  </p>
                </div>
                <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <h4 style={{ margin: '0 0 6px', fontSize: '0.86rem', color: '#0b2b26', textTransform: 'uppercase', fontWeight: 800 }}>
                    📅 Next Scheduled Session
                  </h4>
                  <p style={{ margin: 0, fontSize: '0.84rem', lineHeight: '1.6', color: '#334155' }}>
                    {activeDoc.nextMeeting}
                  </p>
                </div>
              </div>

              {/* Sign-off & Legal Signatures Block */}
              <div style={{ marginTop: '50px', paddingTop: '20px', borderTop: '2px solid #0b2b26', fontFamily: 'sans-serif' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '24px', textAlign: 'center' }}>
                  <div>
                    <div style={{ width: '180px', borderBottom: '1px solid #000000', marginBottom: '8px' }}></div>
                    <div style={{ fontSize: '0.86rem', fontWeight: 800, color: '#0b2b26' }}>{activeDoc.headerInfo.chairperson || 'Society Chairman'}</div>
                    <div style={{ fontSize: '0.74rem', color: '#64748b' }}>Chairman, Majestique Euriska</div>
                  </div>

                  <div>
                    <div style={{ width: '180px', borderBottom: '1px solid #000000', marginBottom: '8px' }}></div>
                    <div style={{ fontSize: '0.86rem', fontWeight: 800, color: '#0b2b26' }}>Society Secretary</div>
                    <div style={{ fontSize: '0.74rem', color: '#64748b' }}>Hon. Secretary, Managing Committee</div>
                  </div>

                  <div>
                    <div style={{ width: '180px', borderBottom: '1px solid #000000', marginBottom: '8px' }}></div>
                    <div style={{ fontSize: '0.86rem', fontWeight: 800, color: '#0b2b26' }}>Society Treasurer</div>
                    <div style={{ fontSize: '0.74rem', color: '#64748b' }}>Hon. Treasurer / Finance In-Charge</div>
                  </div>
                </div>

                <div style={{ textAlign: 'center', marginTop: '30px', fontSize: '0.72rem', color: '#94a3b8' }}>
                  Document officially generated on {new Date().toLocaleDateString('en-IN')} • Majestique Euriska Governance Portal
                </div>
              </div>

            </div>
          )}

          {/* ── VIEW 2: EDIT & CUSTOMIZE ── */}
          {activeView === 'edit' && (
            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#0b2b26' }}>
                  ✏️ Customize & Fine-tune Generated Minutes
                </h3>
                <span style={{ fontSize: '0.78rem', color: '#64748b' }}>Changes reflect immediately in Letterhead & Exports</span>
              </div>

              {/* Editable Executive Summary */}
              <div style={{ marginBottom: '18px' }}>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', marginBottom: '6px' }}>
                  Executive Summary
                </label>
                <textarea
                  rows={4}
                  value={editableMom?.executiveSummary || ''}
                  onChange={e => setEditableMom(prev => ({ ...prev, executiveSummary: e.target.value }))}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem', lineHeight: '1.5', boxSizing: 'border-box' }}
                />
              </div>

              {/* Editable Financial Notes */}
              <div style={{ marginBottom: '18px' }}>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', marginBottom: '6px' }}>
                  Financial Allocations / Cost Sharing Notes
                </label>
                <textarea
                  rows={2}
                  value={editableMom?.financialNotes || ''}
                  onChange={e => setEditableMom(prev => ({ ...prev, financialNotes: e.target.value }))}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem', lineHeight: '1.5', boxSizing: 'border-box' }}
                />
              </div>

              {/* Editable Next Meeting */}
              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', marginBottom: '6px' }}>
                  Next Meeting Schedule
                </label>
                <input
                  type="text"
                  value={editableMom?.nextMeeting || ''}
                  onChange={e => setEditableMom(prev => ({ ...prev, nextMeeting: e.target.value }))}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setActiveView('preview')}
                  className="button-primary"
                  style={{ padding: '8px 16px' }}
                >
                  Apply & Return to Letterhead
                </button>
                <button
                  type="button"
                  onClick={() => setEditableMom(JSON.parse(JSON.stringify(generatedMom)))}
                  className="button-secondary"
                  style={{ padding: '8px 16px' }}
                >
                  Reset Edits to Original AI
                </button>
              </div>
            </div>
          )}

          {/* ── VIEW 3: ACTION REGISTER ── */}
          {activeView === 'actions' && (
            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#0b2b26' }}>
                  📋 Action Item Accountability & Follow-up
                </h3>
                <button
                  type="button"
                  data-testid="agent-autoassign-actions-btn"
                  onClick={handleSmartAutoAssign}
                  className="button-secondary"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '0.8rem',
                    padding: '6px 14px',
                    background: '#eff6ff',
                    color: '#1e40af',
                    border: '1px solid #bfdbfe',
                    borderRadius: '8px'
                  }}
                  title="Intelligently assign committee members and technicians based on task keywords"
                >
                  <Zap size={14} color="#2563eb" />
                  🎯 Auto-Assign Owners via AI
                </button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
                {activeDoc.actionItems?.map((act, idx) => (
                  <div key={idx} style={{ background: '#f8fafc', padding: '16px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span style={{ fontSize: '0.74rem', background: '#0b2b26', color: '#ffffff', padding: '2px 8px', borderRadius: '10px', fontWeight: 700 }}>
                        {act.id || `ACT-${idx + 1}`}
                      </span>
                      <span style={{
                        fontSize: '0.72rem',
                        fontWeight: 800,
                        padding: '2px 8px',
                        borderRadius: '10px',
                        background: act.priority === 'HIGH' ? '#fee2e2' : '#fef3c7',
                        color: act.priority === 'HIGH' ? '#dc2626' : '#d97706'
                      }}>
                        {act.priority} PRIORITY
                      </span>
                    </div>
                    <h4 style={{ margin: '0 0 8px', fontSize: '0.94rem', fontWeight: 700, color: '#0f172a' }}>
                      {act.task}
                    </h4>
                    <div style={{ fontSize: '0.8rem', color: '#475569', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <div>👤 <strong>Assigned:</strong> {act.assignedTo}</div>
                      <div>📅 <strong>Target Date:</strong> {act.dueDate}</div>
                      <div>🏷️ <strong>Category:</strong> {act.category}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── VIEW 4: PAST HISTORY & OFFICIAL SOCIETY TEMPLATES ── */}
          {activeView === 'history' && (
            <div data-testid="meeting-history-templates-view" style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '26px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px', marginBottom: '22px', borderBottom: '1px solid #f1f5f9', paddingBottom: '16px' }}>
                <div>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#eff6ff', color: '#1d4ed8', padding: '3px 10px', borderRadius: '12px', fontSize: '0.74rem', fontWeight: 800, marginBottom: '6px', textTransform: 'uppercase' }}>
                    <FolderOpen size={12} />
                    Society Repository & Templates
                  </div>
                  <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#0b2b26' }}>
                    🕒 Meeting History & Standard Society Templates
                  </h3>
                  <p style={{ margin: '4px 0 0', fontSize: '0.84rem', color: '#64748b' }}>
                    Load standardized society templates or restore previous meeting minutes and drafts.
                  </p>
                </div>

                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                  {generatedMom && (
                    <button
                      type="button"
                      onClick={() => setActiveView('preview')}
                      className="button-secondary"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', padding: '8px 14px' }}
                    >
                      <ArrowLeft size={14} />
                      Back to Generated Letterhead
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      const el = document.getElementById('mom-notes-textarea');
                      if (el && typeof el.scrollIntoView === 'function') {
                        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                      }
                    }}
                    className="button-primary"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', padding: '8px 14px' }}
                  >
                    ✍️ Draft New Minutes
                  </button>
                </div>
              </div>

              {/* Filter Tabs */}
              <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => setHistoryFilter('all')}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '20px',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    border: '1px solid',
                    borderColor: historyFilter === 'all' ? '#0f172a' : '#cbd5e1',
                    background: historyFilter === 'all' ? '#0f172a' : '#ffffff',
                    color: historyFilter === 'all' ? '#ffffff' : '#475569',
                    cursor: 'pointer'
                  }}
                >
                  All ({OFFICIAL_MOM_TEMPLATES.length + savedMoms.length})
                </button>
                <button
                  type="button"
                  onClick={() => setHistoryFilter('official')}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '20px',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    border: '1px solid',
                    borderColor: historyFilter === 'official' ? '#2563eb' : '#cbd5e1',
                    background: historyFilter === 'official' ? '#eff6ff' : '#ffffff',
                    color: historyFilter === 'official' ? '#1d4ed8' : '#475569',
                    cursor: 'pointer'
                  }}
                >
                  🏛️ Standard Society Templates ({OFFICIAL_MOM_TEMPLATES.length})
                </button>
                <button
                  type="button"
                  onClick={() => setHistoryFilter('wingA')}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '20px',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    border: '1px solid',
                    borderColor: historyFilter === 'wingA' ? '#059669' : '#cbd5e1',
                    background: historyFilter === 'wingA' ? '#ecfdf5' : '#ffffff',
                    color: historyFilter === 'wingA' ? '#047857' : '#475569',
                    cursor: 'pointer'
                  }}
                >
                  🏢 Wing 'A' Templates
                </button>
                <button
                  type="button"
                  onClick={() => setHistoryFilter('common')}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '20px',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    border: '1px solid',
                    borderColor: historyFilter === 'common' ? '#2563eb' : '#cbd5e1',
                    background: historyFilter === 'common' ? '#eff6ff' : '#ffffff',
                    color: historyFilter === 'common' ? '#1d4ed8' : '#475569',
                    cursor: 'pointer'
                  }}
                >
                  🌐 Common Infrastructure
                </button>
                <button
                  type="button"
                  onClick={() => setHistoryFilter('saved')}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '20px',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    border: '1px solid',
                    borderColor: historyFilter === 'saved' ? '#d97706' : '#cbd5e1',
                    background: historyFilter === 'saved' ? '#fffbeb' : '#ffffff',
                    color: historyFilter === 'saved' ? '#b45309' : '#475569',
                    cursor: 'pointer'
                  }}
                >
                  💾 Saved History ({savedMoms.length})
                </button>
              </div>

              {/* 1. Official Society Templates Grid */}
              {(historyFilter === 'all' || historyFilter === 'official' || historyFilter === 'wingA' || historyFilter === 'common') && (
                <div style={{ marginBottom: '32px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                    <h4 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 800, color: '#1e293b' }}>
                      🏛️ Official Standard Society Templates
                    </h4>
                    <span style={{ fontSize: '0.72rem', background: '#f1f5f9', color: '#475569', padding: '2px 8px', borderRadius: '10px', fontWeight: 700 }}>
                      Pre-verified Byelaw Formats
                    </span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
                    {filteredOfficialTemplates.map(tmpl => (
                      <div
                        key={tmpl.id}
                        data-testid={`template-card-${tmpl.id}`}
                        style={{
                          borderRadius: '12px',
                          border: tmpl.scope === 'A_BUILDING' ? '1.5px solid #a7f3d0' : '1.5px solid #bfdbfe',
                          background: tmpl.scope === 'A_BUILDING' ? '#f0fdf4' : '#eff6ff',
                          padding: '18px',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                          gap: '14px',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                          transition: 'transform 0.15s ease, box-shadow 0.15s ease'
                        }}
                      >
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', marginBottom: '8px' }}>
                            <span style={{
                              fontSize: '0.68rem',
                              fontWeight: 800,
                              padding: '3px 8px',
                              borderRadius: '10px',
                              background: tmpl.scope === 'A_BUILDING' ? '#059669' : '#2563eb',
                              color: '#ffffff',
                              letterSpacing: '0.4px'
                            }}>
                              {tmpl.badgeText}
                            </span>
                            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b' }}>
                              {tmpl.category}
                            </span>
                          </div>

                          <h5 style={{ margin: '0 0 6px', fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>
                            {tmpl.title}
                          </h5>
                          <p style={{ margin: '0 0 12px', fontSize: '0.82rem', color: '#475569', lineHeight: '1.4' }}>
                            {tmpl.description}
                          </p>

                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', fontSize: '0.72rem' }}>
                            <span style={{ background: '#ffffff', padding: '3px 8px', borderRadius: '6px', border: '1px solid #e2e8f0', color: '#334155', fontWeight: 600 }}>
                              👥 {tmpl.headerInfo.attendees.length} Attendees
                            </span>
                            <span style={{ background: '#ffffff', padding: '3px 8px', borderRadius: '6px', border: '1px solid #e2e8f0', color: '#334155', fontWeight: 600 }}>
                              📋 {tmpl.sampleMOM.agendaItems.length} Agenda Items
                            </span>
                            <span style={{ background: '#ffffff', padding: '3px 8px', borderRadius: '6px', border: '1px solid #e2e8f0', color: '#334155', fontWeight: 600 }}>
                              ⚖️ {tmpl.sampleMOM.resolutions.length} Resolutions
                            </span>
                          </div>
                        </div>

                        <div style={{ display: 'flex', gap: '8px', paddingTop: '10px', borderTop: '1px solid rgba(0,0,0,0.06)' }}>
                          <button
                            type="button"
                            onClick={() => handleRestoreFromHistory(tmpl)}
                            style={{
                              flex: 1,
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '6px',
                              padding: '8px 12px',
                              borderRadius: '8px',
                              background: tmpl.scope === 'A_BUILDING' ? '#059669' : '#2563eb',
                              color: '#ffffff',
                              fontWeight: 700,
                              fontSize: '0.78rem',
                              border: 'none',
                              cursor: 'pointer'
                            }}
                          >
                            <ExternalLink size={13} />
                            Load Template ↗
                          </button>
                          <button
                            type="button"
                            onClick={() => handleLoadTemplateIntoForm(tmpl)}
                            title="Load notes & attendees into the editor form"
                            style={{
                              padding: '8px 12px',
                              borderRadius: '8px',
                              background: '#ffffff',
                              color: '#334155',
                              fontWeight: 700,
                              fontSize: '0.78rem',
                              border: '1px solid #cbd5e1',
                              cursor: 'pointer'
                            }}
                          >
                            Edit in Form
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 2. Saved Meeting Minutes & Custom Drafts */}
              {(historyFilter === 'all' || historyFilter === 'saved' || historyFilter === 'wingA' || historyFilter === 'common') && (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                    <h4 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 800, color: '#1e293b' }}>
                      💾 Previously Saved Meeting Minutes & Records ({filteredSavedMoms.length})
                    </h4>
                  </div>

                  {filteredSavedMoms.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '36px', background: '#f8fafc', borderRadius: '12px', border: '1px dashed #cbd5e1', color: '#64748b' }}>
                      <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: 600 }}>No saved custom meeting drafts match your selection.</p>
                      <p style={{ margin: '6px 0 0', fontSize: '0.8rem', color: '#94a3b8' }}>Whenever you generate or click "Save into Society Records", your drafts appear here for instant retrieval.</p>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {filteredSavedMoms.map((m, idx) => (
                        <div
                          key={m.id || idx}
                          onClick={() => handleRestoreFromHistory(m)}
                          style={{
                            padding: '16px',
                            borderRadius: '10px',
                            border: '1px solid #e2e8f0',
                            background: '#f8fafc',
                            cursor: 'pointer',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            transition: 'all 0.2s ease',
                            flexWrap: 'wrap',
                            gap: '12px'
                          }}
                        >
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                              <span style={{
                                fontSize: '0.68rem',
                                fontWeight: 800,
                                padding: '2px 8px',
                                borderRadius: '10px',
                                background: m.scope === 'A_BUILDING' ? '#059669' : '#2563eb',
                                color: '#ffffff'
                              }}>
                                {m.scope === 'A_BUILDING' ? "BUILDING 'A'" : 'COMMON INFRA'}
                              </span>
                              <strong style={{ fontSize: '0.94rem', color: '#0f172a' }}>{m.title}</strong>
                            </div>
                            <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
                              Date: {m.headerInfo?.meetingDate || 'N/A'} • {m.actionItems?.length || 0} Action Items • {m.resolutions?.length || 0} Resolutions
                            </div>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span style={{ fontSize: '0.8rem', color: '#059669', fontWeight: 700 }}>Restore & View ↗</span>
                            <button
                              type="button"
                              onClick={(e) => handleDeleteHistory(m.id, e)}
                              title="Delete from history"
                              style={{
                                background: 'transparent',
                                border: 'none',
                                color: '#94a3b8',
                                cursor: 'pointer',
                                padding: '4px'
                              }}
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

            </div>
          )}

          {/* ── VIEW 5: GRAPHIC AGENDA FLYER (IMAGE & PDF POSTER) ── */}
          {activeView === 'poster' && (
            <VisualAgendaPoster
              agendaData={activeDoc.agendaItems}
              meetingDate={activeDoc.headerInfo?.meetingDate ? new Date(activeDoc.headerInfo.meetingDate).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : 'Sunday, 25 October 2026'}
              meetingTime={activeDoc.headerInfo?.meetingTime || '11:00 AM'}
              meetingType={activeDoc.headerInfo?.meetingType || 'Management Committee Meeting'}
              scope={activeDoc.scope || scope}
              onBack={() => setActiveView('preview')}
            />
          )}

          {/* ── VIEW 6: MONTHLY MOM STORAGE VAULT & UPLOADS ── */}
          {activeView === 'vault' && (
            <div id="monthly-mom-vault-section">
              <MonthlyMomStorageVault
                onLoadIntoGenerator={handleLoadVaultMomIntoGenerator}
                currentScope={scope}
                onClose={() => setActiveView(generatedMom ? 'preview' : 'history')}
              />
            </div>
          )}

        </div>
      )}

    </div>
  );
}
